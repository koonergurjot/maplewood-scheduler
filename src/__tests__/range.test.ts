import { describe, expect, it } from "vitest";
import { deadlineForRange } from "../lib/range";
import type { Settings, VacancyRange } from "../types";

const settings: Settings = {
  responseWindows: {
    lt2h: 15,
    h2to4: 30,
    h4to24: 60,
    h24to72: 120,
    gt72: 240,
  },
  theme: "light",
};

const baseRange: VacancyRange = {
  id: "range-1",
  reason: "Vacation coverage",
  classification: "Registered Nurse",
  startDate: "2025-05-01",
  endDate: "2025-05-05",
  knownAt: "2025-04-20T12:00:00Z",
  workingDays: ["2025-05-01"],
  shiftStart: "08:00",
  shiftEnd: "16:00",
  offeringStep: "Casuals",
  status: "Open",
};

function createRange(overrides: Partial<VacancyRange> = {}): VacancyRange {
  return {
    ...baseRange,
    ...overrides,
    workingDays: overrides.workingDays
      ? [...overrides.workingDays]
      : [...baseRange.workingDays],
    perDayTimes: overrides.perDayTimes
      ? { ...overrides.perDayTimes }
      : baseRange.perDayTimes
      ? { ...baseRange.perDayTimes }
      : undefined,
  };
}

describe("deadlineForRange", () => {
  it("uses the earliest working day when available", () => {
    const range = createRange({
      workingDays: ["2025-05-03", "2025-05-01"],
      perDayTimes: {
        "2025-05-01": { start: "09:15", end: "17:15" },
        "2025-05-03": { start: "07:30", end: "15:30" },
      },
    });

    const deadline = deadlineForRange(range, settings);

    const expected = new Date("2025-05-01T09:15:00");
    expected.setMinutes(expected.getMinutes() - settings.responseWindows.h4to24);

    expect(deadline.getTime()).toBe(expected.getTime());
  });

  it("falls back to the range start date when no working days are selected", () => {
    const range = createRange({
      workingDays: [],
      shiftStart: "10:00",
    });

    const deadline = deadlineForRange(range, settings);

    const expected = new Date(`${range.startDate}T10:00:00`);
    expected.setMinutes(expected.getMinutes() - settings.responseWindows.h4to24);

    expect(Number.isNaN(deadline.getTime())).toBe(false);
    expect(deadline.getTime()).toBe(expected.getTime());
  });
});
