import { useEffect, useMemo, useState } from "react";
import type { Employee, Vacation, Vacancy, Bid, Settings } from "../types";
import { loadState, saveState } from "../utils/storage";

const TAB_KEYS = [
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
  theme:
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  fontScale: 1,
  tabOrder: [...TAB_KEYS],
  defaultShiftPreset: "Day",
};

export function useSchedulerState() {
  const persisted = loadState();

  const [employees, setEmployees] = useState<Employee[]>(persisted?.employees ?? []);
  const [vacations, setVacations] = useState<Vacation[]>(persisted?.vacations ?? []);
  const [vacancies, setVacancies] = useState<Vacancy[]>(
    (persisted?.vacancies ?? []).map((v: any) => ({
      offeringTier: "CASUALS",
      offeringRoundStartedAt: v.offeringRoundStartedAt ?? new Date().toISOString(),
      offeringRoundMinutes: v.offeringRoundMinutes ?? 120,
      offeringAutoProgress: v.offeringAutoProgress ?? true,
      ...v,
    })),
  );
  const [bids, setBids] = useState<Bid[]>(persisted?.bids ?? []);
  const [archivedBids, setArchivedBids] = useState<Record<string, Bid[]>>(
    persisted?.archivedBids ?? {},
  );
  const persistedSettings = persisted?.settings ?? {};
  const storedOrder: string[] = persistedSettings.tabOrder || [];
  const mergedOrder = [...storedOrder, ...TAB_KEYS.filter((k) => !storedOrder.includes(k))];
  const [settings, setSettings] = useState<Settings>({
    ...defaultSettings,
    ...persistedSettings,
    tabOrder: mergedOrder,
  });

  useEffect(() => {
    saveState({ employees, vacations, vacancies, bids, archivedBids, settings, vacancyRanges });
  }, [employees, vacations, vacancies, bids, archivedBids, settings, vacancyRanges]);

  const employeesById = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees],
  );

  
// Persist vacancyRanges as part of app state
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

  if (typeof window !== "undefined") (window as any).schedulerState = {
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
  };
}
