import type { Vacancy, VacancyRange } from "../types";
import { expandRangeToVacancies } from "./expandRange";
import { applyAwardBundle } from "./vacancy";

export function ensureBundleId<T extends { bundleId?: string }>(v: T): string {
  if (!v.bundleId) v.bundleId = crypto.randomUUID();
  return v.bundleId;
}

// Group vacancies with the same reference into bundles when they cover
// contiguous dates. Existing bundle information is preserved if any child
// already has a bundleId; otherwise a new one is generated. All bundled
// vacancies are marked with bundleMode "one-person" so awarding one awards
// the entire block.

export function bundleContiguousVacanciesByRef(vacs: Vacancy[]): Vacancy[] {
  const byRef = new Map<string, Vacancy[]>();
  for (const v of vacs) {
    if (!v.vacancyRef) continue;
    const arr = byRef.get(v.vacancyRef) || [];
    arr.push(v);
    byRef.set(v.vacancyRef, arr);
  }

  for (const arr of byRef.values()) {
    arr.sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));

    let group: Vacancy[] = [];
    let prev: string | null = null;
    const flush = () => {
      if (group.length < 2) {
        group = [];
        return;
      }
      let bid = group.find((v) => v.bundleId)?.bundleId;
      if (!bid) bid = crypto.randomUUID();
      for (const v of group) {
        v.bundleId = bid;
        v.bundleMode = "one-person";
      }
      group = [];
    };

    for (const v of arr) {
      if (prev && new Date(v.shiftDate + "T00:00:00").getTime() - new Date(prev + "T00:00:00").getTime() !== 86400000) {
        flush();
      }
      group.push(v);
      prev = v.shiftDate;
    }
    flush();
  }

  return vacs;
}

/** Expand a multi-day range into individual vacancies.
 * Automatically assigns a single bundleId when the range spans two or more days.
 */
export function createVacanciesFromRange(range: VacancyRange): Vacancy[] {
  const shouldBundle = range.awardAsBlock !== false;
  return expandRangeToVacancies(range, shouldBundle);
}

/** Award every vacancy within a bundle to the given employee. */
export function awardBundle(
  vacs: Vacancy[],
  bundleId: string,
  employeeId: string,
): Vacancy[] {
  return applyAwardBundle(vacs, bundleId, { empId: employeeId });
}

/** Remove all vacancies belonging to the given bundle. */
export function deleteBundle(vacs: Vacancy[], bundleId: string): Vacancy[] {
  return vacs.filter((v) => v.bundleId !== bundleId);
}
