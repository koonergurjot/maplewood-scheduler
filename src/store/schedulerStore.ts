import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { SetStateAction } from "react";

import { bundleContiguousVacanciesByRef } from "../lib/bundles";
import type {
  Bid,
  Employee,
  Settings,
  Vacation,
  Vacancy,
  VacancyRange,
} from "../types";
import { saveState } from "../utils/storage";
import type { SchedulerPersistedState } from "../schemas/schedulerState";

import { createSchedulerPersistenceManager } from "./schedulerPersistence";

const defaultSettings: Settings = {
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
};

type StoredEmployee = Employee & { activeLabel?: string };

export type PersistedState = SchedulerPersistedState;

export type SyncConflict = {
  snapshot: PersistedState;
  serverVersion: number | null;
  updatedAt: string | null;
};

type PersistenceError = { type: "oversize"; bytes: number; timestamp: number };

type SchedulerState = {
  employees: Employee[];
  vacations: Vacation[];
  vacancies: Vacancy[];
  bids: Bid[];
  archivedBids: Record<string, Bid[]>;
  settings: Settings;
  vacancyRanges: VacancyRange[];
  version: number | null;
  updatedAt: string | null;
  isDirty: boolean;
  syncConflict: SyncConflict | null;
};

type StateAction =
  | { type: "setEmployees"; updater: SetStateAction<Employee[]> }
  | { type: "setVacations"; updater: SetStateAction<Vacation[]> }
  | { type: "setVacancies"; updater: SetStateAction<Vacancy[]> }
  | { type: "setBids"; updater: SetStateAction<Bid[]> }
  | {
      type: "setArchivedBids";
      updater: SetStateAction<Record<string, Bid[]>>;
    }
  | { type: "setSettings"; updater: SetStateAction<Settings> }
  | { type: "setVacancyRanges"; updater: SetStateAction<VacancyRange[]> }
  | { type: "setVersion"; value: number | null }
  | { type: "setUpdatedAt"; value: string | null }
  | { type: "updateVacancy"; id: string; patch: Partial<Vacancy> }
  | { type: "serverAck"; persisted: PersistedState }
  | { type: "conflictDetected"; conflict: SyncConflict }
  | { type: "clearConflict" }
  | { type: "setConflictVersion"; value: number | null };

function applySet<T>(current: T, updater: SetStateAction<T>): T {
  return typeof updater === "function"
    ? (updater as (prev: T) => T)(current)
    : updater;
}

function hydrateEmployees(list: StoredEmployee[] | undefined): Employee[] {
  return (list ?? []).map((emp) => ({
    ...emp,
    activeLabel: emp.activeLabel ?? (emp.active ? "Active" : "Inactive"),
  }));
}

function hydrateVacancies(list: Vacancy[] | undefined): Vacancy[] {
  const seeded = (list ?? []).map((vacancy) => ({
    ...vacancy,
    archived: vacancy.archived ?? false,
    archivedAt: vacancy.archivedAt ?? undefined,
  }));
  return bundleContiguousVacanciesByRef(seeded);
}

function coerceSettings(value: Settings | undefined): Settings {
  if (!value) return defaultSettings;
  return {
    ...defaultSettings,
    ...value,
    responseWindows: {
      ...defaultSettings.responseWindows,
      ...(value.responseWindows ?? {}),
    },
  };
}

function toSchedulerState(persisted?: PersistedState | null): SchedulerState {
  const version =
    typeof persisted?.version === "number" ? persisted.version : null;
  const updatedAt =
    typeof persisted?.updatedAt === "string" ? persisted.updatedAt : null;

  return {
    employees: hydrateEmployees(persisted?.employees),
    vacations: persisted?.vacations ?? [],
    vacancies: hydrateVacancies(persisted?.vacancies),
    bids: persisted?.bids ?? [],
    archivedBids: persisted?.archivedBids ?? {},
    settings: coerceSettings(persisted?.settings),
    vacancyRanges: persisted?.vacancyRanges ?? [],
    version,
    updatedAt,
    isDirty: false,
    syncConflict: null,
  };
}

function toPersistedState(state: SchedulerState): PersistedState {
  return {
    employees: state.employees,
    vacations: state.vacations,
    vacancies: state.vacancies,
    bids: state.bids,
    archivedBids: state.archivedBids,
    settings: state.settings,
    vacancyRanges: state.vacancyRanges,
    version: state.version ?? undefined,
    updatedAt: state.updatedAt ?? undefined,
  };
}

function reducer(state: SchedulerState, action: StateAction): SchedulerState {
  switch (action.type) {
    case "setEmployees": {
      const next = applySet(state.employees, action.updater);
      if (next === state.employees) return state;
      return { ...state, employees: next, isDirty: true };
    }
    case "setVacations": {
      const next = applySet(state.vacations, action.updater);
      if (next === state.vacations) return state;
      return { ...state, vacations: next, isDirty: true };
    }
    case "setVacancies": {
      const updated = applySet(state.vacancies, action.updater);
      if (updated === state.vacancies) return state;
      const next = hydrateVacancies(updated);
      return { ...state, vacancies: next, isDirty: true };
    }
    case "setBids": {
      const next = applySet(state.bids, action.updater);
      if (next === state.bids) return state;
      return { ...state, bids: next, isDirty: true };
    }
    case "setArchivedBids": {
      const next = applySet(state.archivedBids, action.updater);
      if (next === state.archivedBids) return state;
      return { ...state, archivedBids: next, isDirty: true };
    }
    case "setSettings": {
      const next = coerceSettings(applySet(state.settings, action.updater));
      if (next === state.settings) return state;
      return { ...state, settings: next, isDirty: true };
    }
    case "setVacancyRanges": {
      const next = applySet(state.vacancyRanges, action.updater);
      if (next === state.vacancyRanges) return state;
      return { ...state, vacancyRanges: next, isDirty: true };
    }
    case "setVersion": {
      if (state.version === action.value) return state;
      return { ...state, version: action.value, isDirty: false };
    }
    case "setUpdatedAt": {
      if (state.updatedAt === action.value) return state;
      return { ...state, updatedAt: action.value, isDirty: false };
    }
    case "updateVacancy": {
      let changed = false;
      const nextVacancies = state.vacancies.map((vacancy) => {
        if (vacancy.id !== action.id) return vacancy;
        changed = true;
        return {
          ...vacancy,
          ...action.patch,
          bundleId:
            action.patch.bundleId === undefined
              ? vacancy.bundleId
              : action.patch.bundleId,
          bundleMode:
            action.patch.bundleMode === undefined
              ? vacancy.bundleMode
              : action.patch.bundleMode,
        };
      });
      if (!changed) return state;
      return { ...state, vacancies: nextVacancies, isDirty: true };
    }
    case "serverAck": {
      const next = toSchedulerState(action.persisted);
      return { ...next, isDirty: false, syncConflict: null };
    }
    case "conflictDetected": {
      return { ...state, syncConflict: action.conflict };
    }
    case "clearConflict": {
      if (!state.syncConflict) return state;
      return { ...state, syncConflict: null };
    }
    case "setConflictVersion": {
      if (state.version === action.value) {
        if (state.isDirty) {
          return { ...state };
        }
        return { ...state, isDirty: true };
      }
      return { ...state, version: action.value, isDirty: true };
    }
    default:
      return state;
  }
}

export function useSchedulerStore(persisted?: PersistedState) {
  const [state, dispatch] = useReducer(reducer, persisted, toSchedulerState);

  const persistenceManagerRef = useRef<ReturnType<
    typeof createSchedulerPersistenceManager
  > | null>(null);
  const [persistenceError, setPersistenceError] = useState<PersistenceError | null>(
    null,
  );

  if (!persistenceManagerRef.current) {
    persistenceManagerRef.current = createSchedulerPersistenceManager({
      onServerAck(persistedState) {
        dispatch({ type: "serverAck", persisted: persistedState });
      },
      onConflict(conflict) {
        dispatch({ type: "conflictDetected", conflict });
      },
      onOversizedSnapshot(details) {
        setPersistenceError({
          type: "oversize",
          bytes: details.bytes,
          timestamp: Date.now(),
        });
      },
    });
  }

  const persistenceManager = persistenceManagerRef.current;

  useEffect(() => {
    const snapshot = toPersistedState(state);
    saveState(snapshot);
    if (state.isDirty) {
      persistenceManager.queue(snapshot);
    }
  }, [state, persistenceManager]);

  useEffect(() => {
    const manager = persistenceManager;
    return () => {
      manager.dispose();
    };
  }, [persistenceManager]);

  const employeesById = useMemo<Record<string, Employee>>(() => {
    const map: Record<string, Employee> = {};
    for (const employee of state.employees) {
      map[employee.id] = employee;
    }
    return map;
  }, [state.employees]);

  const setEmployees = useCallback(
    (updater: SetStateAction<Employee[]>) =>
      dispatch({ type: "setEmployees", updater }),
    [],
  );

  const setVacations = useCallback(
    (updater: SetStateAction<Vacation[]>) =>
      dispatch({ type: "setVacations", updater }),
    [],
  );

  const setVacancies = useCallback(
    (updater: SetStateAction<Vacancy[]>) =>
      dispatch({ type: "setVacancies", updater }),
    [],
  );

  const setBids = useCallback(
    (updater: SetStateAction<Bid[]>) =>
      dispatch({ type: "setBids", updater }),
    [],
  );

  const setArchivedBids = useCallback(
    (updater: SetStateAction<Record<string, Bid[]>>) =>
      dispatch({ type: "setArchivedBids", updater }),
    [],
  );

  const setSettings = useCallback(
    (updater: SetStateAction<Settings>) =>
      dispatch({ type: "setSettings", updater }),
    [],
  );

  const setVacancyRanges = useCallback(
    (updater: SetStateAction<VacancyRange[]>) =>
      dispatch({ type: "setVacancyRanges", updater }),
    [],
  );

  const setVersion = useCallback(
    (value: number | null) => dispatch({ type: "setVersion", value }),
    [],
  );

  const setUpdatedAt = useCallback(
    (value: string | null) => dispatch({ type: "setUpdatedAt", value }),
    [],
  );

  const updateVacancy = useCallback(
    (id: string, patch: Partial<Vacancy>) =>
      dispatch({ type: "updateVacancy", id, patch }),
    [],
  );

  const clearSyncConflict = useCallback(
    () => dispatch({ type: "clearConflict" }),
    [],
  );

  const setConflictVersion = useCallback(
    (value: number | null) => dispatch({ type: "setConflictVersion", value }),
    [],
  );

  const applyServerSnapshot = useCallback(
    (persistedState: PersistedState) =>
      dispatch({ type: "serverAck", persisted: persistedState }),
    [],
  );

  const acknowledgePersistenceError = useCallback(
    () => setPersistenceError(null),
    [],
  );

  return {
    employees: state.employees,
    setEmployees,
    vacations: state.vacations,
    setVacations,
    vacancies: state.vacancies,
    setVacancies,
    bids: state.bids,
    setBids,
    archivedBids: state.archivedBids,
    setArchivedBids,
    settings: state.settings,
    setSettings,
    employeesById,
    vacancyRanges: state.vacancyRanges,
    setVacancyRanges,
    version: state.version,
    setVersion,
    updatedAt: state.updatedAt,
    setUpdatedAt,
    updateVacancy,
    syncConflict: state.syncConflict,
    clearSyncConflict,
    setConflictVersion,
    applyServerSnapshot,
    persistenceError,
    acknowledgePersistenceError,
  } as const;
}

export default useSchedulerStore;

export type SchedulerStoreApi = ReturnType<typeof useSchedulerStore>;
