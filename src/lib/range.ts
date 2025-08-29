import type { Settings, Bid } from "../types";

export type VacancyRange = {
  id: string;
  startDate: string;
  endDate: string;
  workingDays: string[];
  perDayTimes?: Record<string, { start: string; end: string }>;
  shiftStart?: string;
  shiftEnd?: string;
};

/** Return sorted list of working days (ISO YYYY-MM-DD) */
export function workingDays(range: VacancyRange): string[] {
  return [...(range.workingDays || [])].sort();
}

/** Simple earliest-deadline calculator (uses earliest working day) */
export function deadlineForRange(range: VacancyRange, settings: Settings): Date {
  const days = workingDays(range);
  const first = days[0];
  // Fallbacks to avoid undefined
  const start = (range.perDayTimes && range.perDayTimes[first]?.start)
    || range.shiftStart
    || "06:30";
  const dt = new Date(`${first}T${start}:00`);
  const minutes = settings.responseWindows?.h4to24 ?? 30;
  const d = new Date(dt);
  d.setMinutes(d.getMinutes() - minutes);
  return d;
}

/** True iff a bid explicitly covers all required working days */
export function bidCoversAllDays(range: VacancyRange, bid: Bid): boolean {
  const days = new Set(workingDays(range));
  const selected = bid.selectedDays ?? [];
  const isFull = bid.coverageType === "full";
  const coversAll = isFull && selected.length === days.size && selected.every((d: string) => days.has(d));
  return Boolean(coversAll);
}

/** Collect non-blocking warnings (placeholder: integrate fatigue/eligibility later) */
export function evaluateBidWarnings(_range: VacancyRange, _bid: Bid): string[] {
  return [];
}
