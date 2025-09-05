import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { expandRangeToVacancies } from "../src/lib/expandRange";
import type { VacancyRange } from "../src/types";

describe("expandRangeToVacancies", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates vacancies for each working day with overrides", () => {
    const range: VacancyRange = {
      id: "r1",
      reason: "Backfill",
      classification: "RCA",
      wing: "Rosewood",
      startDate: "2025-01-10",
      endDate: "2025-01-12",
      knownAt: "2025-01-01T00:00:00Z",
      workingDays: ["2025-01-12", "2025-01-10"],
      perDayTimes: {
        "2025-01-12": { start: "07:00", end: "15:00" },
      },
      shiftStart: "06:30",
      shiftEnd: "14:30",
      offeringStep: "Casuals",
      status: "Open",
    };

    const vxs = expandRangeToVacancies(range);
    expect(vxs).toHaveLength(2);
    expect(vxs.map((v) => v.shiftDate)).toEqual([
      "2025-01-10",
      "2025-01-12",
    ]);
    expect(vxs[0].shiftStart).toBe("06:30");
    expect(vxs[1].shiftStart).toBe("07:00");
    expect(vxs[1].shiftEnd).toBe("15:00");
    expect(vxs[0].startDate).toBe("2025-01-10");
    expect(vxs[0].endDate).toBe("2025-01-12");
    expect(vxs[0].coverageDates).toEqual([
      "2025-01-10",
      "2025-01-12",
    ]);
    expect(vxs.every((v) => v.status === "Open")).toBe(true);
    expect(vxs.every((v) => v.offeringStep === "Casuals")).toBe(true);
    expect(vxs.every((v) => v.knownAt === "2025-01-01T00:00:00.000Z")).toBe(
      true,
    );
  });

  it("omits coverageDates for single-day ranges", () => {
    const range: VacancyRange = {
      id: "r2",
      reason: "Backfill",
      classification: "RCA",
      wing: "Rosewood",
      startDate: "2025-01-10",
      endDate: "2025-01-10",
      knownAt: "2025-01-01T00:00:00Z",
      workingDays: ["2025-01-10"],
      shiftStart: "06:30",
      shiftEnd: "14:30",
      offeringStep: "Casuals",
      status: "Open",
    };

    const vxs = expandRangeToVacancies(range);
    expect(vxs).toHaveLength(1);
    expect(vxs[0].coverageDates).toBeUndefined();
  });

  it("does not bundle vacancies when awardAsBlock is false", () => {
    const range: VacancyRange = {
      id: "r3",
      reason: "Backfill",
      classification: "RCA",
      startDate: "2025-01-10",
      endDate: "2025-01-11",
      knownAt: "2025-01-01T00:00:00Z",
      workingDays: ["2025-01-10", "2025-01-11"],
      shiftStart: "06:30",
      shiftEnd: "14:30",
      offeringStep: "Casuals",
      status: "Open",
    };

    const vxs = expandRangeToVacancies(range, false);
    expect(vxs).toHaveLength(2);
    expect(vxs.every((v) => v.bundleId === undefined)).toBe(true);
  });
});

