import { appConfig } from "../config";
import migrateCoverageDates from "../../migrations/2025-coverage-dates";
import { CLASSIFICATIONS, type Classification } from "../types";

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

const CLASSIFICATION_SET = new Set<string>(CLASSIFICATIONS);
const VALID_BUNDLE_MODES = new Set<VacancyFilterSnapshot["bundleMode"]>([
  "all",
  "bundles",
  "singles",
]);

const coerceStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return undefined;
};

function sanitizeVacancyFilters(
  value: unknown,
): Partial<VacancyFilterSnapshot> | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Record<string, unknown>;

  const selectedWings = coerceStringArray(snapshot.selectedWings);
  const selectedPositionsRaw = coerceStringArray(snapshot.selectedPositions);
  const selectedPositions = selectedPositionsRaw?.filter((item) =>
    CLASSIFICATION_SET.has(item),
  ) as Classification[] | undefined;

  const filterShift =
    typeof snapshot.filterShift === "string"
      ? snapshot.filterShift.trim()
      : undefined;
  const countdown =
    typeof snapshot.countdown === "string"
      ? snapshot.countdown.trim()
      : undefined;
  const start =
    typeof snapshot.start === "string" ? snapshot.start.trim() : undefined;
  const end = typeof snapshot.end === "string" ? snapshot.end.trim() : undefined;
  const search =
    typeof snapshot.search === "string" ? snapshot.search.trim() : undefined;

  const bundleMode =
    typeof snapshot.bundleMode === "string" &&
    VALID_BUNDLE_MODES.has(snapshot.bundleMode as VacancyFilterSnapshot["bundleMode"])
      ? (snapshot.bundleMode as VacancyFilterSnapshot["bundleMode"])
      : undefined;

  const sanitized: Partial<VacancyFilterSnapshot> = {};

  if (selectedWings) {
    sanitized.selectedWings = selectedWings;
  }
  if (selectedPositions) {
    sanitized.selectedPositions = selectedPositions;
  }
  if (filterShift !== undefined) {
    sanitized.filterShift = filterShift;
  }
  if (countdown !== undefined) {
    sanitized.countdown = countdown;
  }
  if (start !== undefined) {
    sanitized.start = start;
  }
  if (end !== undefined) {
    sanitized.end = end;
  }
  if (search !== undefined) {
    sanitized.search = search;
  }
  if (bundleMode) {
    sanitized.bundleMode = bundleMode;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : {};
}

export function loadVacancyFilters(): StoredVacancyFilters {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(OPEN_VACANCY_FILTERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeVacancyFilters(parsed);
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
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(LS_KEY);
    const data = (raw ? JSON.parse(raw) : null) as T | null;
    if (data) migrateCoverageDates(data as any);
    return data;
  } catch {
    return null;
  }
}

export function saveState(state: any): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;
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
    storage.setItem(LS_KEY, JSON.stringify(toSave));
    return true;
  } catch (err) {
    console.warn("Unable to access localStorage. State not persisted.", err);
    return false;
  }
}
