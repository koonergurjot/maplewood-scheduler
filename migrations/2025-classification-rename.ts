import type { Classification } from "../src/types";
import { CLASSIFICATIONS } from "../src/types";

type VacancyFilterSnapshot = {
  selectedWings?: string[];
  selectedPositions?: string[];
  filterShift?: string;
  start?: string;
  end?: string;
  search?: string;
  bundleMode?: "all" | "bundles" | "singles";
};

type StoredVacancyFilters = Partial<VacancyFilterSnapshot> | null;

const classificationLookup = buildClassificationLookup();

function buildClassificationLookup() {
  const canonicalToClassification = new Map<string, Classification>();
  for (const classification of CLASSIFICATIONS) {
    canonicalToClassification.set(canonicalize(classification), classification);
  }

  const legacyAliases: Array<[string, Classification]> = [
    ["Rec", "Recreation"],
  ];

  for (const [alias, target] of legacyAliases) {
    canonicalToClassification.set(canonicalize(alias), target);
  }

  return canonicalToClassification;
}

function canonicalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export function normalizeClassification(value: unknown): Classification | null {
  if (typeof value !== "string") return null;
  const canonical = canonicalize(value);
  if (!canonical) return null;
  return classificationLookup.get(canonical) ?? null;
}

function migrateCollection<T extends Record<string, any>>(
  items: unknown,
  field: keyof T,
) {
  if (!Array.isArray(items)) return items;

  const migrated: T[] = [];

  for (const item of items as T[]) {
    const normalized = normalizeClassification((item as any)[field]);
    if (!normalized) continue;
    migrated.push({
      ...item,
      [field]: normalized,
    });
  }

  return migrated;
}

function migrateBidCollection(bids: unknown) {
  if (!Array.isArray(bids)) return [];
  return (bids as any[])
    .map((bid) => {
      const normalized = normalizeClassification(bid?.bidderClassification);
      if (!normalized) return null;
      return { ...bid, bidderClassification: normalized };
    })
    .filter((bid): bid is Record<string, any> => bid !== null);
}

export function migrateVacancyFilterSelections(
  filters: StoredVacancyFilters,
): StoredVacancyFilters {
  if (!filters) return null;

  const next: StoredVacancyFilters = { ...filters };

  if (Array.isArray(next.selectedPositions)) {
    const seen = new Set<Classification>();
    const selections: Classification[] = [];
    for (const option of next.selectedPositions) {
      const normalized = normalizeClassification(option);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      selections.push(normalized);
    }
    next.selectedPositions = selections;
  }

  return next;
}

export default function migrateClassificationRename(state: any) {
  if (!state || typeof state !== "object") return state;

  state.employees = migrateCollection(state.employees, "classification");
  state.vacations = migrateCollection(state.vacations, "classification");
  state.vacancies = migrateCollection(state.vacancies, "classification");
  state.bids = migrateCollection(state.bids, "bidderClassification");
  state.vacancyRanges = migrateCollection(state.vacancyRanges, "classification");

  if (state.archivedBids && typeof state.archivedBids === "object") {
    const migratedArchived: Record<string, any[]> = {};
    for (const [vacancyId, bids] of Object.entries(state.archivedBids)) {
      const migratedBids = migrateBidCollection(bids);
      if (migratedBids.length > 0) {
        migratedArchived[vacancyId] = migratedBids;
      }
    }
    state.archivedBids = migratedArchived;
  }

  return state;
}
