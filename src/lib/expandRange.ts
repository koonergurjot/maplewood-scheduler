import type { Vacancy, VacancyRange } from "../types";

/**
 * Expand a VacancyRange into individual Vacancy objects that the
 * application already understands.
 */
export function expandRangeToVacancies(range: VacancyRange): Vacancy[] {
  const nowISO = new Date().toISOString();
  const sortedDays = [...range.workingDays].sort();
  const coverageDates =
    range.startDate === range.endDate ? undefined : sortedDays;
  const bundleId =
    sortedDays.length > 1
      ? `BND-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
      : undefined;

  return sortedDays.map<Vacancy>((d) => ({
    id: `VAC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    ...(bundleId ? { bundleId } : {}),
    reason: range.reason,
    classification: range.classification,
    wing: range.wing,
    shiftDate: d,
    shiftStart:
      range.perDayTimes?.[d]?.start ?? range.shiftStart ?? "06:30",
    shiftEnd: range.perDayTimes?.[d]?.end ?? range.shiftEnd ?? "14:30",
    knownAt: nowISO,
    offeringTier: "CASUALS",
    offeringRoundStartedAt: nowISO,
    offeringRoundMinutes: 120,
    offeringAutoProgress: true,
    offeringStep: range.offeringStep ?? "Casuals",
    status: "Open",
    startDate: range.startDate,
    endDate: range.endDate,
    ...(coverageDates ? { coverageDates } : {}),
  }));
}

export default expandRangeToVacancies;

