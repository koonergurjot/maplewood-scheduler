import { describe, it, expect } from "vitest";
import { expandRangeToVacancies } from "../lib/expandRange";
import { bundleContiguousVacanciesByRef } from "../lib/bundles";
import { applyAwardBundle } from "../lib/vacancy";
import { getDatesInRange } from "../utils/date";
import type { VacancyRange, Vacancy } from "../types";

const makeRange = (start: string, end: string): VacancyRange => ({
  id: "r1",
  reason: "Test",
  classification: "Care Aide",
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

  it("keeps contiguous vacancy refs bundled across DST transitions", () => {
    const originalTz = process.env.TZ;
    process.env.TZ = "America/New_York";
    const base: Vacancy = {
      id: "",
      vacancyRef: "R-100",
      date: "",
      reason: "Vacation",
      classification: "Registered Nurse",
      shiftDate: "",
      shiftStart: "07:00",
      shiftEnd: "15:00",
      start: "07:00",
      end: "15:00",
      knownAt: "2024-01-01T00:00:00Z",
      offeringTier: "Casuals",
      offeringStep: "Casuals",
      status: "Open",
    };

    const items: Vacancy[] = [
      { ...base, id: "v1", shiftDate: "2024-11-02", date: "2024-11-02" },
      { ...base, id: "v2", shiftDate: "2024-11-03", date: "2024-11-03" },
      { ...base, id: "v3", shiftDate: "2024-11-04", date: "2024-11-04" },
    ];

    try {
      const bundled = bundleContiguousVacanciesByRef(items.map((v) => ({ ...v })));
      const bundleIds = new Set(
        bundled.map((v) => v.bundleId).filter((id): id is string => Boolean(id)),
      );
      expect(bundleIds.size).toBe(1);
      const [bundleId] = Array.from(bundleIds);
      expect(bundleId).toBeTruthy();
      expect(bundled.every((v) => v.bundleId === bundleId)).toBe(true);
      expect(bundled.every((v) => v.bundleMode === "one-person")).toBe(true);
    } finally {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    }
  });
});

