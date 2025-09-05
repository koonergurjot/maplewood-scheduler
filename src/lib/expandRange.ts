import type { Vacancy, VacancyRange } from "../types";
import { getDatesInRange } from "../utils/date";

/**
 * Expand a VacancyRange into individual Vacancy objects that the
 * application already understands.
 */
export function expandRangeToVacancies(
  range: VacancyRange,
  awardAsBlock = true,
): Vacancy[] {
  const nowISO = new Date().toISOString();
  const days =
    range.workingDays?.length
      ? [...range.workingDays].sort()
      : getDatesInRange(range.startDate, range.endDate);
  const coverageDates = range.startDate === range.endDate ? undefined : days;
  const isMulti = days.length >= 2;
  const singleAward = isMulti && awardAsBlock;
  const bundleId = singleAward ? crypto.randomUUID() : undefined;
  if (bundleId) console.debug("[bundle] created", bundleId, { days: days.length });

  return days.map<Vacancy>((d) => ({
    id: crypto.randomUUID(),
    ...(singleAward
      ? { bundleId, bundleMode: "one-person" as const }
      : {}),
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
    status: "Open" as const,
    startDate: range.startDate,
    endDate: range.endDate,
    ...(coverageDates ? { coverageDates } : {}),
  }));
}

export default expandRangeToVacancies;

