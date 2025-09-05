import type { Vacancy, VacancyRange } from "../types";

/**
 * Expand a VacancyRange into individual Vacancy objects that the
 * application already understands.
 */
export function expandRangeToVacancies(
  range: VacancyRange,
  awardAsBlock = true,
): Vacancy[] {
  const nowISO = new Date().toISOString();
  const sortedDays = [...range.workingDays].sort();
  const coverageDates =
    range.startDate === range.endDate ? undefined : sortedDays;
  const days = sortedDays.length;
  const bundleId = awardAsBlock && days > 1 ? crypto.randomUUID() : undefined;
  if (bundleId) console.debug("[bundle] created", bundleId, { days });

  return sortedDays.map<Vacancy>((d) => ({
    id: `VAC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    ...(bundleId ? { bundleId, bundleMode: "one-person" } : {}),
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

