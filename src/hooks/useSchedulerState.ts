import { useEffect, useMemo, useState } from "react";
import type {
  Employee,
  Vacation,
  Vacancy,
  Bid,
  Settings,
  VacancyRange,
} from "../types";
import { loadState, saveState } from "../utils/storage";
import { bundleContiguousVacanciesByRef } from "../lib/bundles";

const defaultSettings: Settings = {
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
};

type StoredEmployee = Employee & { activeLabel?: string };

export type PersistedState = {
  employees?: StoredEmployee[];
  vacations?: Vacation[];
  vacancies?: Vacancy[];
  bids?: Bid[];
  archivedBids?: Record<string, Bid[]>;
  settings?: Settings;
  vacancyRanges?: VacancyRange[];
};

export function useSchedulerState(
  persistedArg?: PersistedState | null,
) {
  const [persisted] = useState<PersistedState | null>(() => {
    if (persistedArg !== undefined) {
      return persistedArg ?? null;
    }
    return loadState<PersistedState>() ?? null;
  });

  const hydrateEmployees = (list: StoredEmployee[] | undefined): Employee[] =>
    (list ?? []).map((emp) => ({
      ...emp,
      activeLabel: emp.activeLabel ?? (emp.active ? "Active" : "Inactive"),
    }));

  const [employees, setEmployees] = useState<Employee[]>(
    hydrateEmployees(persisted?.employees),
  );
  const [vacations, setVacations] = useState<Vacation[]>(persisted?.vacations ?? []);
  const seededVacancies = bundleContiguousVacanciesByRef(
    persisted?.vacancies
      ? persisted.vacancies.map((v) => ({
          ...v,
          archived: v.archived ?? false,
          archivedAt: v.archivedAt ?? undefined,
        }))
      : [],
  );
  const [vacancies, setVacancies] = useState<Vacancy[]>(seededVacancies);
  const [bids, setBids] = useState<Bid[]>(persisted?.bids ?? []);
  const [archivedBids, setArchivedBids] = useState<Record<string, Bid[]>>(
    persisted?.archivedBids ?? {},
  );
  const [settings, setSettings] = useState<Settings>(persisted?.settings ?? defaultSettings);
  const [vacancyRanges, setVacancyRanges] = useState<VacancyRange[]>(
    persisted?.vacancyRanges ?? [],
  );

  const employeesById = useMemo<Record<string, Employee>>(() => {
    const map: Record<string, Employee> = {};
    for (const employee of employees) {
      map[employee.id] = employee;
    }
    return map;
  }, [employees]);

  useEffect(() => {
    saveState({
      employees,
      vacations,
      vacancies,
      bids,
      archivedBids,
      settings,
      vacancyRanges,
    });
  }, [employees, vacations, vacancies, bids, archivedBids, settings, vacancyRanges]);

  const updateVacancy = (id: string, patch: Partial<Vacancy>) => {
    setVacancies((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              ...patch,
              bundleId:
                patch.bundleId === undefined ? v.bundleId : patch.bundleId,
              bundleMode:
                patch.bundleMode === undefined ? v.bundleMode : patch.bundleMode,
            }
          : v,
      ),
    );
  };

  return {
    employees,
    setEmployees,
    vacations,
    setVacations,
    vacancies,
    setVacancies,
    bids,
    setBids,
    archivedBids,
    setArchivedBids,
    settings,
    setSettings,
    employeesById,
    vacancyRanges,
    setVacancyRanges,
    updateVacancy,
  };
}
