import type { VacancyRange, Bid, Employee, Vacancy } from "../types";
import { createVacanciesFromRange } from "./bundles";
import { getDatesInRange } from "../utils/date";
import { randomId } from "../utils/id";

export type RangeAwardOutcome = {
  vacancies: Vacancy[];
  archivedBids: Bid[];
};

const MIN_RANK = Number.MAX_SAFE_INTEGER;

type Window = { start: number; end: number };
type Assigned = { start: number; end: number; bid: Bid };

function timeToMinutes(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const [h, m] = value.split(":").map((v) => Number.parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function assignCoverage(
  windows: Window[],
  assignments: Assigned[],
  start: number,
  end: number,
  bid: Bid,
) {
  if (end <= start) return;
  let idx = 0;
  while (idx < windows.length) {
    const window = windows[idx];
    if (end <= window.start || start >= window.end) {
      idx += 1;
      continue;
    }
    const overlapStart = Math.max(window.start, start);
    const overlapEnd = Math.min(window.end, end);
    if (overlapEnd <= overlapStart) {
      idx += 1;
      continue;
    }
    assignments.push({ start: overlapStart, end: overlapEnd, bid });
    const replacements: Window[] = [];
    if (window.start < overlapStart) {
      replacements.push({ start: window.start, end: overlapStart });
    }
    if (overlapEnd < window.end) {
      replacements.push({ start: overlapEnd, end: window.end });
    }
    windows.splice(idx, 1, ...replacements);
    if (replacements.length === 0) {
      // window fully consumed; continue with next window at same index
      continue;
    }
    idx += replacements.length;
  }
}

function getBidDays(
  bid: Bid,
  range: VacancyRange,
  defaultDays: string[],
): string[] {
  if (bid.coverageType === "some-days" || bid.coverageType === "partial-day") {
    return bid.selectedDays && bid.selectedDays.length
      ? bid.selectedDays
      : defaultDays;
  }
  return defaultDays;
}

function getCoverageWindow(
  bid: Bid,
  day: string,
  baseStart: number,
  baseEnd: number,
): Window {
  if (bid.coverageType === "partial-day") {
    const override = bid.timeOverrides?.[day];
    if (override) {
      return {
        start: timeToMinutes(override.start, baseStart),
        end: timeToMinutes(override.end, baseEnd),
      };
    }
  }
  return { start: baseStart, end: baseEnd };
}

function workingDaysForRange(range: VacancyRange): string[] {
  if (range.workingDays?.length) return [...range.workingDays];
  return getDatesInRange(range.startDate, range.endDate);
}

/**
 * Rank full-coverage bids by seniority (ascending rank = more senior).
 * Returns the winning bid or null.
 */
export function pickWinningFullRangeBid(
  range: VacancyRange,
  bids: Bid[],
  employees: Employee[],
): Bid | null {
  if (!bids.length) return null;
  const empById = new Map(employees.map((e) => [e.id, e]));
  const days = workingDaysForRange(range);
  const full = bids.filter((b) => {
    if (b.coverageType && b.coverageType !== "full") return false;
    if (!b.selectedDays || b.selectedDays.length === 0) return true;
    return days.every((d) => b.selectedDays!.includes(d));
  });
  if (!full.length) return null;
  full.sort((a, b) => {
    const ea = empById.get(a.bidderEmployeeId)?.seniorityRank ?? MIN_RANK;
    const eb = empById.get(b.bidderEmployeeId)?.seniorityRank ?? MIN_RANK;
    if (ea !== eb) return ea - eb;
    return a.bidTimestamp.localeCompare(b.bidTimestamp);
  });
  return full[0] ?? null;
}

export function awardVacancyRange(
  range: VacancyRange,
  bids: Bid[],
  employees: Employee[],
): RangeAwardOutcome {
  const relevantBids = bids.filter((b) => b.vacancyId === range.id);
  const baseVacancies = createVacanciesFromRange(range);
  if (!relevantBids.length) {
    return { vacancies: baseVacancies, archivedBids: [] };
  }

  const now = new Date().toISOString();
  const employeesById = new Map(employees.map((e) => [e.id, e]));
  const days = workingDaysForRange(range);
  const fullWinner = pickWinningFullRangeBid(range, relevantBids, employees);
  if (fullWinner) {
    const awarded = baseVacancies.map((vac) => ({
      ...vac,
      status: "Awarded" as const,
      awardedTo: fullWinner.bidderEmployeeId,
      awardedAt: now,
      awardReason: "Range bid award",
    }));
    return { vacancies: awarded, archivedBids: relevantBids };
  }

  const sortedBids = [...relevantBids].sort((a, b) => {
    const ra = employeesById.get(a.bidderEmployeeId)?.seniorityRank ?? MIN_RANK;
    const rb = employeesById.get(b.bidderEmployeeId)?.seniorityRank ?? MIN_RANK;
    if (ra !== rb) return ra - rb;
    return a.bidTimestamp.localeCompare(b.bidTimestamp);
  });

  const byDay = new Map<string, Vacancy>();
  for (const vac of baseVacancies) {
    byDay.set(vac.shiftDate, { ...vac, bundleId: undefined, bundleMode: undefined });
  }

  const finalVacancies: Vacancy[] = [];
  for (const [day, template] of byDay) {
    const baseStart = timeToMinutes(template.shiftStart ?? template.start, 390);
    const baseEnd = timeToMinutes(template.shiftEnd ?? template.end, baseStart + 480);
    const windows: Window[] = [{ start: baseStart, end: baseEnd }];
    const assignments: Assigned[] = [];

    for (const bid of sortedBids) {
      const covers = getBidDays(bid, range, days);
      if (!covers.includes(day)) continue;
      const { start, end } = getCoverageWindow(bid, day, baseStart, baseEnd);
      assignCoverage(windows, assignments, start, end, bid);
    }

    const segments = [
      ...assignments.map((segment) => ({ ...segment })),
      ...windows.map((w) => ({ start: w.start, end: w.end, bid: null as Bid | null })),
    ]
      .filter((segment) => segment.end > segment.start)
      .sort((a, b) => a.start - b.start);

    if (segments.length === 0) continue;

    let first = true;
    for (const segment of segments) {
      const vac: Vacancy = {
        ...template,
        ...(first ? {} : { id: randomId() }),
        start: minutesToTime(segment.start),
        end: minutesToTime(segment.end),
        shiftStart: minutesToTime(segment.start),
        shiftEnd: minutesToTime(segment.end),
        bundleId: undefined,
        bundleMode: undefined,
      };
      if (segment.bid) {
        vac.status = "Awarded";
        vac.awardedTo = segment.bid.bidderEmployeeId;
        vac.awardedAt = now;
        vac.awardReason = "Range bid award";
      } else {
        vac.status = "Open";
        vac.awardedTo = undefined;
        vac.awardedAt = undefined;
        vac.awardReason = undefined;
      }
      finalVacancies.push(vac);
      first = false;
    }
  }

  finalVacancies.sort((a, b) => {
    if (a.shiftDate === b.shiftDate) {
      return a.shiftStart.localeCompare(b.shiftStart);
    }
    return a.shiftDate.localeCompare(b.shiftDate);
  });

  return { vacancies: finalVacancies, archivedBids: relevantBids };
}
