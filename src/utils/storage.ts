import { appConfig } from "../config";
import migrateCoverageDates from "../../migrations/2025-coverage-dates";

export const LS_KEY = "maplewood-scheduler-v3";

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
