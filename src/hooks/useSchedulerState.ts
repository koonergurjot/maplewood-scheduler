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

type PersistedState = {
  employees?: Employee[];
  vacations?: Vacation[];
  vacancies?: Vacancy[];
  bids?: Bid[];
  archivedBids?: Record<string, Bid[]>;
  settings?: Settings;
  vacancyRanges?: VacancyRange[];
};

export function useSchedulerState() {
  const persisted: PersistedState | null = loadState();

  const [employees, setEmployees] = useState<Employee[]>(persisted?.employees ?? []);
  const [vacations, setVacations] = useState<Vacation[]>(persisted?.vacations ?? []);
  const seededVacancies = bundleContiguousVacanciesByRef(
    persisted?.vacancies ? [...persisted.vacancies] : [],
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

  const employeesById = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees) m.set(e.id, e);
    return m;
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
