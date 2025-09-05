import { describe, it, expect } from "vitest";
import { expandRangeToVacancies } from "../lib/expandRange";
import { applyAwardBundle } from "../lib/vacancy";
import { getDatesInRange } from "../utils/date";
import type { VacancyRange } from "../types";

const makeRange = (start: string, end: string): VacancyRange => ({
  id: "r1",
  reason: "Test",
  classification: "RCA",
  startDate: start,
  endDate: end,
  knownAt: "2025-09-01T00:00:00Z",
  workingDays: getDatesInRange(start, end),
  shiftStart: "06:30",
  shiftEnd: "14:30",
  offeringStep: "Casuals",
  status: "Open",
});

describe("bundles", () => {
  it("creates one bundleId for 2+ day ranges when awardAsBlock=true", () => {
    const vs = expandRangeToVacancies(makeRange("2025-09-10", "2025-09-12"), true);
    const ids = new Set(vs.map(v => v.bundleId));
    expect(ids.size).toBe(1);
    expect(vs.every(v => v.bundleMode === "one-person")).toBe(true);
  });

  it("awards all days in bundle with one call", () => {
    let vs = expandRangeToVacancies(makeRange("2025-09-10", "2025-09-12"), true);
    const bid = vs[0].bundleId!;
    vs = applyAwardBundle(vs, bid, { empId: "emp-123" });
    expect(vs.every(v => v.status === "Awarded" && v.awardedTo === "emp-123")).toBe(true);
  });
});

