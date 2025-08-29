import { useEffect, useMemo, useState } from "react";
import type { Employee, Vacation, Vacancy, Bid, Settings, VacancyRange } from "../types";
import { loadState, saveState } from "../utils/storage";

/**
 * Centralized app state for Maplewood Scheduler.
 * This replaces any truncated content and ensures strong typing for new range features.
 */

export const TAB_KEYS = [
  "coverage",
  "calendar",
  "bids",
  "employees",
  "archive",
  "alerts",
  "settings",
] as const;

const defaultSettings: Settings = {
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
  defaultOfferingMinutes: 30,
  autoProgressOffering: true,
  theme: "light",
  fontScale: 1,
  tabOrder: [...TAB_KEYS],
  defaultShiftPreset: "Day",
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

  // Core entities
  const [employees, setEmployees] = useState<Employee[]>(persisted?.employees ?? []);
  const [vacations, setVacations] = useState<Vacation[]>(persisted?.vacations ?? []);
  const [vacancies, setVacancies] = useState<Vacancy[]>(persisted?.vacancies ?? []);
  const [bids, setBids] = useState<Bid[]>(persisted?.bids ?? []);
  const [archivedBids, setArchivedBids] = useState<Record<string, Bid[]>>(persisted?.archivedBids ?? {});
  const [settings, setSettings] = useState<Settings>(persisted?.settings ?? defaultSettings);

  // NEW: Multi-day vacancy ranges
  const [vacancyRanges, setVacancyRanges] = useState<VacancyRange[]>(persisted?.vacancyRanges ?? []);

  const employeesById = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  // Persist everything whenever any slice changes
  useEffect(() => {
    const state: PersistedState = {
      employees,
      vacations,
      vacancies,
      bids,
      archivedBids,
      settings,
      vacancyRanges,
    };
    saveState(state);
  }, [employees, vacations, vacancies, bids, archivedBids, settings, vacancyRanges]);

  // Expose a global pointer used by the CoverageRangesPanel (can be removed if you import the hook directly there)
  if (typeof window !== "undefined") {
    (window as any).schedulerState = {
      employees, setEmployees,
      vacations, setVacations,
      vacancies, setVacancies,
      bids, setBids,
      archivedBids, setArchivedBids,
      settings, setSettings,
      employeesById,
      vacancyRanges, setVacancyRanges,
    };
  }

  return {
    employees, setEmployees,
    vacations, setVacations,
    vacancies, setVacancies,
    bids, setBids,
    archivedBids, setArchivedBids,
    settings, setSettings,
    employeesById,
    vacancyRanges, setVacancyRanges,
  };
}
