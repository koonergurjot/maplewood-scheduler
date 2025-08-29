import type { Settings, Bid, VacancyRange } from "../types";

export function workingDays(range: VacancyRange): string[] {
  return [...(range.workingDays || [])].sort();
}

export function deadlineForRange(range: VacancyRange, settings: Settings): Date {
  const days = workingDays(range);
  const first = days[0];
  const start =
    (range.perDayTimes && range.perDayTimes[first]?.start) ||
    range.shiftStart ||
    "06:30";
  const dt = new Date(`${first}T${start}:00`);
  const minutes = settings.responseWindows?.h4to24 ?? 30;
  const d = new Date(dt);
  d.setMinutes(d.getMinutes() - minutes);
  return d;
}

export function bidCoversAllDays(range: VacancyRange, bid: Bid): boolean {
  const days = new Set(workingDays(range));
  const selected: string[] = bid.selectedDays ?? [];
  const isFull = bid.coverageType === "full";
  const coversAll = isFull && selected.length === days.size && selected.every((d: string) => days.has(d));
  return Boolean(coversAll);
}

// Soft warnings:
// - same-day conflict: bidder already bid another thing on any selected day
// - stat/holiday reminder: show label if selected day is in provided set
export function evaluateBidWarnings(opts: {
  range: VacancyRange;
  bid: Bid;
  allBids: Bid[];
  statDays?: Set<string>;
}): string[] {
  const out: string[] = [];
  const sel = new Set<string>(opts.bid.selectedDays ?? []);
  const sameDayOther = (opts.allBids || []).some(
    b =>
      b.bidderEmployeeId === opts.bid.bidderEmployeeId &&
      b.vacancyId !== opts.bid.vacancyId &&
      (b.selectedDays ?? []).some(d => sel.has(d))
  );
  if (sameDayOther) {
    out.push("Bidder has another bid on at least one selected day.");
  }

  if (opts.statDays) {
    const stats = opts.statDays;
    if ([...sel].some(d => stats.has(d))) {
      out.push("Reminder: One or more selected days are stat/holiday.");
    }
  }
  return out;
}
