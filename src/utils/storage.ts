import { appConfig } from "../config";
import migrateCoverageDates from "../../migrations/2025-coverage-dates";
import type { Classification } from "../types";

export const LS_KEY = "maplewood-scheduler-v3";
export const OPEN_VACANCY_FILTERS_KEY = "openVacancyFilters";

const getLocalStorage = (): Storage | null => {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage;
  } catch {
    return null;
  }
};

export type VacancyFilterSnapshot = {
  selectedWings: string[];
  selectedPositions: Classification[];
  filterShift: string;
  countdown: string;
  start: string;
  end: string;
  search: string;
  bundleMode: "all" | "bundles" | "singles";
};

export type StoredVacancyFilters = Partial<VacancyFilterSnapshot> | null;

export function loadVacancyFilters(): StoredVacancyFilters {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(OPEN_VACANCY_FILTERS_KEY);
    return raw ? (JSON.parse(raw) as Partial<VacancyFilterSnapshot>) : null;
  } catch {
    return null;
  }
}

export function saveVacancyFilters(snapshot: VacancyFilterSnapshot): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    storage.setItem(OPEN_VACANCY_FILTERS_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function clearVacancyFilters(): void {
  const storage = getLocalStorage();
  try {
    storage?.removeItem(OPEN_VACANCY_FILTERS_KEY);
  } catch {
    // noop – storage unavailable
  }
}

export function loadState<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const data = (raw ? JSON.parse(raw) : null) as T | null;
    if (data) migrateCoverageDates(data as any);
    return data;
  } catch {
    return null;
  }
}

export function saveState(state: any): boolean {
  try {
    const toSave = { ...state };
    if (Array.isArray(toSave.vacancies)) {
      toSave.vacancies = toSave.vacancies.map((v: any) => {
        if (
          appConfig.features.coverageDayPicker &&
          Array.isArray(v.coverageDates) &&
          v.coverageDates.length > 0
        ) {
          return v;
        }
        const { coverageDates, ...rest } = v;
        return rest;
      });
    }
    localStorage.setItem(LS_KEY, JSON.stringify(toSave));
    return true;
  } catch (err) {
    console.warn("Unable to access localStorage. State not persisted.", err);
    return false;
  }
}
