import { describe, it, expect } from "vitest";
import { getVacancyActiveDates } from "../src/lib/vacancy";
import type { Vacancy } from "../src/types";

const baseVacancy: Vacancy = {
  id: "1",
  reason: "vacation",
  classification: "RCA",
  shiftDate: "2025-01-10",
  shiftStart: "06:30",
  shiftEnd: "14:30",
  knownAt: "2025-01-01T00:00:00Z",
  offeringTier: {},
  offeringStep: "Casuals",
  status: "Open",
};

describe("getVacancyActiveDates", () => {
  it("returns single shift date for single-day vacancy", () => {
    expect(getVacancyActiveDates(baseVacancy)).toEqual(["2025-01-10"]);
  });

  it("returns coverageDates when provided", () => {
    const v: Vacancy = {
      ...baseVacancy,
      startDate: "2025-01-10",
      endDate: "2025-01-12",
      coverageDates: ["2025-01-10", "2025-01-12"],
    };
    expect(getVacancyActiveDates(v)).toEqual(["2025-01-10", "2025-01-12"]);
  });

  it("uses full range when coverageDates undefined", () => {
    const v: Vacancy = {
      ...baseVacancy,
      startDate: "2025-01-10",
      endDate: "2025-01-12",
    };
    expect(getVacancyActiveDates(v)).toEqual([
      "2025-01-10",
      "2025-01-11",
      "2025-01-12",
    ]);
  });

  it("includes weekend dates in range", () => {
    const v: Vacancy = {
      ...baseVacancy,
      startDate: "2025-01-10", // Friday
      endDate: "2025-01-13",   // Monday
    };
    expect(getVacancyActiveDates(v)).toEqual([
      "2025-01-10",
      "2025-01-11",
      "2025-01-12",
      "2025-01-13",
    ]);
  });
});
