import type { Vacancy, VacancyRange } from "../types";
import { getDatesInRange } from "../utils/date";
import { randomId } from "../utils/id";

/**
 * Expand a VacancyRange into individual Vacancy objects that the
 * application already understands.
 */
export function expandRangeToVacancies(
  range: VacancyRange,
  awardAsBlock = true,
): Vacancy[] {
  const nowISO = new Date().toISOString();
  const workingDaysProvided = Array.isArray(range.workingDays);
  const normalizedWorkingDays = workingDaysProvided
    ? Array.from(
        new Set(
          range.workingDays
            .map((day) => (typeof day === "string" ? day.trim() : ""))
            .filter((day): day is string => day.length > 0),
        ),
      ).sort()
    : [];
  const days = workingDaysProvided
    ? normalizedWorkingDays
    : getDatesInRange(range.startDate, range.endDate);
  if (!days.length) {
    return [];
  }
  const coverageDates = range.startDate === range.endDate ? undefined : days;
  const isMulti = days.length >= 2;
  const singleAward = isMulti && awardAsBlock;
  const bundleId = singleAward ? randomId() : undefined;
  if (bundleId) console.debug("[bundle] created", bundleId, { days: days.length });

  return days.map<Vacancy>((d) => ({
    id: randomId(),
    ...(singleAward
      ? { bundleId, bundleMode: "one-person" as const }
      : {}),
    reason: range.reason,
    classification: range.classification,
    wing: range.perDayWings?.[d] ?? range.wing,
    date: d,
    start: range.perDayTimes?.[d]?.start ?? range.shiftStart ?? "06:30",
    end: range.perDayTimes?.[d]?.end ?? range.shiftEnd ?? "14:30",
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

