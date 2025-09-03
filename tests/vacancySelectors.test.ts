import { describe, it, expect } from "vitest";
import { coverageDatesForSubmit, hydrateCoverageSelection, groupVacanciesByDate } from "../src/lib/vacancy";
import type { Vacancy } from "../src/types";

describe("coverageDatesForSubmit and hydrateCoverageSelection", () => {
  const base: Vacancy = {
    id: "v1",
    reason: "Test",
    classification: "RN",
    shiftDate: "2025-01-10",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: new Date().toISOString(),
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
    startDate: "2025-01-10",
    endDate: "2025-01-12",
  };

  it("omits coverageDates when selection covers full range", () => {
    const selected = ["2025-01-10", "2025-01-11", "2025-01-12"];
    expect(coverageDatesForSubmit(base, selected)).toBeUndefined();
  });

  it("persists coverageDates when selection is partial", () => {
    const selected = ["2025-01-10", "2025-01-12"];
    expect(coverageDatesForSubmit(base, selected)).toEqual(selected);
  });

  it("hydrates selection from vacancy", () => {
    const v: Vacancy = { ...base, coverageDates: ["2025-01-10"] };
    expect(hydrateCoverageSelection(v)).toEqual(["2025-01-10"]);
  });
});

describe("groupVacanciesByDate", () => {
  const v1: Vacancy = {
    id: "a",
    reason: "Test",
    classification: "RN",
    shiftDate: "2025-01-10",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: new Date().toISOString(),
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
    startDate: "2025-01-10",
    endDate: "2025-01-12",
    coverageDates: ["2025-01-10", "2025-01-12"],
  };
  const v2: Vacancy = {
    id: "b",
    reason: "Test",
    classification: "RN",
    shiftDate: "2025-01-11",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: new Date().toISOString(),
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
  };

  it("groups by active dates", () => {
    const map = groupVacanciesByDate([v1, v2]);
    expect(Array.from(map.keys()).sort()).toEqual([
      "2025-01-10",
      "2025-01-11",
      "2025-01-12",
    ]);
    expect(map.get("2025-01-11")?.map((v) => v.id)).toEqual(["b"]);
  });
});
