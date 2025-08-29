import type { VacancyRange, Bid, Settings } from "../types";
import { combineDateTime } from "./dates";

/** Return sorted list of working days (ISO YYYY-MM-DD) */
export function workingDays(range: VacancyRange): string[] {
  return [...(range.workingDays ?? [])].sort();
}

/** Earliest deadline for the range (based on earliest working day) */
export function deadlineForRange(range: VacancyRange, settings: Settings): Date {
  const days = workingDays(range);
  const first = days[0];
  const t = range.perDayTimes?.[first];
  const start = combineDateTime(first, t?.start ?? range.shiftStart ?? "06:30");
  // Reuse pickWindowMinutes-style logic outside for now: default to 24h window if unknown
  const minutes = settings?.responseWindows?.h4to24 ?? 30;
  const d = new Date(start);
  d.setMinutes(d.getMinutes() - minutes);
  return d;
}

/** Validate that a bid covers all required working days (for coverageType 'full'). */
export function bidCoversAllDays(range: VacancyRange, bid: Bid): boolean {
  const days = new Set(workingDays(range));
  // If partial-day via timeOverrides, we still consider it "covered" for continuity purposes.
  return bid.coverageType === "full" && bid.selectedDays &&
         bid.selectedDays.length === days.size &&
         bid.selectedDays.every(d => days.has(d));
}

/** Flag potential conflicts for a bid (fatigue, eligibility). Stub hooks; implement in future. */
export function evaluateBidFlags(range: VacancyRange, bid: Bid): { warnings: string[] } {
  const warnings: string[] = [];
  // Placeholders – to be integrated with your existing fatigue/eligibility logic:
  // warnings.push("Fatigue risk on 2025-08-21 (back-to-back).");
  // warnings.push("Classification mismatch on 2025-08-22 (RCA shift requires LPN).");
  return { warnings };
}
