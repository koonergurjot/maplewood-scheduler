import { appConfig } from "../config";
import migrateCoverageDates from "../../migrations/2025-coverage-dates";
import { CLASSIFICATIONS, type Classification } from "../types";
import {
  SchedulerPersistedStateSchema,
  type SchedulerPersistedState,
} from "../schemas/schedulerState";
import { loadLocalSnapshot, saveLocalSnapshot } from "./persistence";

export const LS_KEY = "maplewood-scheduler-v3";
export const OPEN_VACANCY_FILTERS_KEY = "openVacancyFilters";

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
  const raw = loadLocalSnapshot<unknown>(OPEN_VACANCY_FILTERS_KEY);
  if (raw == null) return null;
  return sanitizeVacancyFilters(raw);
}

export function saveVacancyFilters(snapshot: VacancyFilterSnapshot): boolean {
  return saveLocalSnapshot(OPEN_VACANCY_FILTERS_KEY, snapshot);
}

export function clearVacancyFilters(): void {
  saveLocalSnapshot(OPEN_VACANCY_FILTERS_KEY, null);
}

export function loadState<T = SchedulerPersistedState>(): T | null {
  const snapshot = loadLocalSnapshot<SchedulerPersistedState>(
    LS_KEY,
    SchedulerPersistedStateSchema,
  );
  if (!snapshot) return null;
  migrateCoverageDates(snapshot as any);
  return snapshot as unknown as T;
}

export function saveState(state: any): boolean {
  try {
    const toSave: SchedulerPersistedState = { ...state };
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
    if (toSave.version === null) {
      delete (toSave as Record<string, unknown>).version;
    }
    if (toSave.updatedAt === null) {
      delete (toSave as Record<string, unknown>).updatedAt;
    }
    return saveLocalSnapshot(LS_KEY, toSave, SchedulerPersistedStateSchema);
  } catch (err) {
    console.warn("Unable to access localStorage. State not persisted.", err);
    return false;
  }
}
