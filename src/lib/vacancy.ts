import { formatDateLong, combineDateTime, minutesBetween } from "./dates";
import { getDatesInRange } from "../utils/date";
import type { Vacancy, Settings, Bid } from "../types";

export const displayVacancyLabel = (v: Vacancy) => {
  const d = formatDateLong(v.shiftDate);
  return `${d} • ${v.shiftStart}–${v.shiftEnd} • ${v.wing ?? ""} • ${v.classification}`.replace(/\s+•\s+$/, "");
};

export function pickWindowMinutes(v: Vacancy, settings: Settings) {
  const known = new Date(v.knownAt);
  const shiftStart = combineDateTime(v.shiftDate, v.shiftStart);
  const hrsUntilShift = (shiftStart.getTime() - known.getTime()) / 3_600_000;
  if (hrsUntilShift < 2) return settings.responseWindows.lt2h;
  if (hrsUntilShift < 4) return settings.responseWindows.h2to4;
  if (hrsUntilShift < 24) return settings.responseWindows.h4to24;
  if (hrsUntilShift < 72) return settings.responseWindows.h24to72;
  return settings.responseWindows.gt72;
}

export function deadlineFor(v: Vacancy, settings: Settings) {
  const winMin = pickWindowMinutes(v, settings);
  return new Date(new Date(v.knownAt).getTime() + winMin * 60000);
}

export function getVacancyActiveDates(v: Vacancy): string[] {
  if (Array.isArray(v.coverageDates) && v.coverageDates.length > 0) {
    return v.coverageDates;
  }
  const start = v.startDate ?? v.shiftDate;
  const end = v.endDate ?? v.shiftDate;
  return getDatesInRange(start, end);
}

/**
 * Given a vacancy and a selected set of coverage days, decide what should be
 * persisted to the vacancy record. If the selection matches the full inclusive
 * range, we omit `coverageDates` to avoid storing redundant data.
 */
export function coverageDatesForSubmit(
  v: Vacancy,
  selectedDates: string[],
): string[] | undefined {
  const full = getVacancyActiveDates({ ...v, coverageDates: undefined });
  const sortedSel = [...selectedDates].sort();
  const sortedFull = [...full].sort();
  if (
    sortedSel.length === sortedFull.length &&
    sortedSel.every((d, i) => d === sortedFull[i])
  ) {
    return undefined;
  }
  return selectedDates;
}

/** Hydrate coverage selection for editing forms. */
export function hydrateCoverageSelection(v: Vacancy): string[] {
  return getVacancyActiveDates(v);
}

/** Group vacancies by the dates they actually require coverage on. */
export function groupVacanciesByDate(
  vacs: Vacancy[],
): Map<string, Vacancy[]> {
  const map = new Map<string, Vacancy[]>();
  for (const v of vacs) {
    for (const d of getVacancyActiveDates(v)) {
      const arr = map.get(d) || [];
      arr.push(v);
      map.set(d, arr);
    }
  }
  return map;
}

export function fmtCountdown(msLeft: number) {
  const neg = msLeft < 0;
  const abs = Math.abs(msLeft);
  const totalSec = Math.floor(abs / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const core = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return neg ? `Due ${core} ago` : core;
}

export const applyAwardVacancy = (
  vacs: Vacancy[],
  vacId: string,
  payload: { empId?: string; reason?: string; overrideUsed?: boolean },
): Vacancy[] => {
  const empId = payload.empId === "EMPTY" ? undefined : payload.empId;
  return vacs.map<Vacancy>((v) =>
    v.id === vacId
      ? {
          ...v,
          status: "Awarded",
          awardedTo: empId,
          awardedAt: new Date().toISOString(),
          awardReason: payload.reason,
          overrideUsed: !!payload.overrideUsed,
        }
      : v,
  );
};

export const applyAwardVacancies = (
  vacs: Vacancy[],
  vacIds: string[],
  payload: { empId?: string; reason?: string; overrideUsed?: boolean },
): Vacancy[] => {
  return vacIds.reduce((prev, id) => applyAwardVacancy(prev, id, payload), vacs);
};

export const applyAwardBundle = (
  vacs: Vacancy[],
  bundleId: string,
  payload: { empId?: string; reason?: string; overrideUsed?: boolean },
): Vacancy[] => {
  const empId = payload.empId === "EMPTY" ? undefined : payload.empId;
  return vacs.map<Vacancy>((v) =>
    v.bundleId === bundleId
      ? {
          ...v,
          status: "Awarded",
          awardedTo: empId,
          awardedAt: new Date().toISOString(),
          awardReason: payload.reason,
          overrideUsed: !!payload.overrideUsed,
        }
      : v,
  );
};

export const archiveBidsForVacancy = (
  bids: Bid[],
  archived: Record<string, Bid[]>,
  vacancyId: string,
): { bids: Bid[]; archivedBids: Record<string, Bid[]> } => {
  const remaining: Bid[] = [];
  const moved: Bid[] = [];
  for (const b of bids) {
    if (b.vacancyId === vacancyId) moved.push(b);
    else remaining.push(b);
  }
  if (!moved.length) return { bids: remaining, archivedBids: archived };
  return {
    bids: remaining,
    archivedBids: {
      ...archived,
      [vacancyId]: [...(archived[vacancyId] ?? []), ...moved],
    },
  };
};
