import { describe, it, expect } from "vitest";
import { recommend } from "../src/recommend";

const employees = {
  a: { id: "a", active: true, seniorityRank: 2, classification: "RN" },
  b: { id: "b", active: true, seniorityRank: 1, classification: "RN" },
  c: { id: "c", active: true, seniorityRank: 1, classification: "LPN" },
  d: { id: "d", active: false, seniorityRank: 1, classification: "RN" },
};

const bids = [
  { vacancyId: "vac1", bidderEmployeeId: "a" },
  { vacancyId: "vac1", bidderEmployeeId: "b" },
  { vacancyId: "vac1", bidderEmployeeId: "c" },
  { vacancyId: "vac1", bidderEmployeeId: "d" },
];

describe("recommend", () => {
  it("returns highest seniority matching class", () => {
    const vac = { id: "vac1", classification: "RN", offeringTier: "CASUALS" };
    const rec = recommend(vac, bids, employees);
    expect(rec.id).toBe("b");
    expect(rec.why).toContain("Bidder");
    expect(rec.why).toContain("Rank 1");
    expect(rec.why).toContain("Class RN");
  });

  it("reports when there are no eligible bidders", () => {
    const vac = { id: "vac2", classification: "RN", offeringTier: "CASUALS" };
    const rec = recommend(vac, bids, employees);
    expect(rec.id).toBeUndefined();
    expect(rec.why[0]).toBe("No eligible bidders");
  });

  it("uses bid order to break ties in seniority", () => {
    const vac = { id: "vac1", classification: "RN", offeringTier: "CASUALS" };
    const employeesWithTie = {
      ...employees,
      e: { id: "e", active: true, seniorityRank: 1, classification: "RN" },
    };
    const tieBids = [
      { vacancyId: "vac1", bidderEmployeeId: "e" },
      { vacancyId: "vac1", bidderEmployeeId: "b" },
    ];
    const rec = recommend(vac, tieBids, employeesWithTie);
    expect(rec.id).toBe("e");
  });

  it("uses timestamp when available to break bid order ties", () => {
    const vac = { id: "vac1", classification: "RN", offeringTier: "CASUALS" };
    const employeesWithTie = {
      ...employees,
      e: { id: "e", active: true, seniorityRank: 1, classification: "RN" },
    };
    const tieBids = [
      {
        vacancyId: "vac1",
        bidderEmployeeId: "b",
        placedAt: "2024-01-01T11:00:00Z",
      },
      {
        vacancyId: "vac1",
        bidderEmployeeId: "e",
        placedAt: "2024-01-01T10:00:00Z",
      },
    ];
    const rec = recommend(vac, tieBids, employeesWithTie);
    expect(rec.id).toBe("e");
  });

  it("prefers higher seniority hours when present", () => {
    const vac = { id: "vac1", classification: "RN", offeringTier: "CASUALS" };
    const employeesWithHours = {
      x: { id: "x", active: true, seniorityHours: 200, classification: "RN" },
      y: { id: "y", active: true, seniorityHours: 100, classification: "RN" },
    };
    const hourBids = [
      { vacancyId: "vac1", bidderEmployeeId: "y" },
      { vacancyId: "vac1", bidderEmployeeId: "x" },
    ];
    const rec = recommend(vac, hourBids, employeesWithHours);
    expect(rec.id).toBe("x");
    expect(rec.why).toContain("Hours 200");
  });
});
