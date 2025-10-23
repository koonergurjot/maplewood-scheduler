import { describe, it, expect } from "vitest";
import { recommend } from "../src/recommend";
import type { Bid, Employee, Vacancy } from "../src/recommend";

const employees: Record<string, Employee> = {
  a: { id: "a", active: true, seniorityRank: 2, classification: "Registered Nurse" },
  b: { id: "b", active: true, seniorityRank: 1, classification: "Registered Nurse" },
  c: { id: "c", active: true, seniorityRank: 1, classification: "Licensed Practical Nurse" },
  d: { id: "d", active: false, seniorityRank: 1, classification: "Registered Nurse" },
};

const bids: Bid[] = [
  { vacancyId: "vac1", bidderEmployeeId: "a" },
  { vacancyId: "vac1", bidderEmployeeId: "b" },
  { vacancyId: "vac1", bidderEmployeeId: "c" },
  { vacancyId: "vac1", bidderEmployeeId: "d" },
];

const BASE_VACANCY: Vacancy = {
  id: "vac1",
  classification: "Registered Nurse",
  offeringTier: "CASUALS",
};

const makeVacancy = (overrides: Partial<Vacancy> = {}): Vacancy => ({
  ...BASE_VACANCY,
  ...overrides,
});

describe("recommend", () => {
  it("returns highest seniority matching class", () => {
    const vac = makeVacancy();
    const rec = recommend(vac, bids, employees);
    expect(rec.id).toBe("b");
    expect(rec.why).toContain("Bidder");
    expect(rec.why).toContain("Rank 1");
    expect(rec.why).toContain("Class Registered Nurse");
    expect(rec.candidates.map((c) => c.id)).toEqual(["b", "a"]);
    expect(rec.candidates[0].why).toEqual(rec.why);
  });

  it("reports when there are no eligible bidders", () => {
    const vac = makeVacancy({ id: "vac2" });
    const rec = recommend(vac, bids, employees);
    expect(rec.id).toBeUndefined();
    expect(rec.why[0]).toBe("No eligible bidders");
    expect(rec.candidates).toEqual([]);
  });

  it("uses bid order to break ties in seniority", () => {
    const vac = makeVacancy();
    const employeesWithTie: Record<string, Employee> = {
      ...employees,
      e: { id: "e", active: true, seniorityRank: 1, classification: "Registered Nurse" },
    };
    const tieBids: Bid[] = [
      { vacancyId: "vac1", bidderEmployeeId: "e" },
      { vacancyId: "vac1", bidderEmployeeId: "b" },
    ];
    const rec = recommend(vac, tieBids, employeesWithTie);
    expect(rec.id).toBe("e");
  });

  it("uses timestamp when available to break bid order ties", () => {
    const vac = makeVacancy();
    const employeesWithTie: Record<string, Employee> = {
      ...employees,
      e: { id: "e", active: true, seniorityRank: 1, classification: "Registered Nurse" },
    };
    const tieBids: Bid[] = [
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

  it("falls back to bid order when timestamp is invalid", () => {
    const vac = makeVacancy();
    const employeesWithTie: Record<string, Employee> = {
      ...employees,
      e: { id: "e", active: true, seniorityRank: 1, classification: "Registered Nurse" },
    };
    const tieBids: Bid[] = [
      {
        vacancyId: "vac1",
        bidderEmployeeId: "e",
        placedAt: "not-a-date",
      },
      {
        vacancyId: "vac1",
        bidderEmployeeId: "b",
        placedAt: "2024-01-01T09:00:00Z",
      },
    ];
    const rec = recommend(vac, tieBids, employeesWithTie);
    expect(rec.id).toBe("e");
  });

  it("prefers higher seniority hours when present", () => {
    const vac = makeVacancy();
    const employeesWithHours: Record<string, Employee> = {
      x: { id: "x", active: true, seniorityHours: 200, classification: "Registered Nurse" },
      y: { id: "y", active: true, seniorityHours: 100, classification: "Registered Nurse" },
    };
    const hourBids: Bid[] = [
      { vacancyId: "vac1", bidderEmployeeId: "y" },
      { vacancyId: "vac1", bidderEmployeeId: "x" },
    ];
    const rec = recommend(vac, hourBids, employeesWithHours);
    expect(rec.id).toBe("x");
    expect(rec.why).toContain("Hours 200");
    expect(rec.candidates.map((c) => c.id)).toEqual(["x", "y"]);
  });

  it("includes every eligible bidder sorted by ranking", () => {
    const vac = makeVacancy();
    const rec = recommend(vac, bids, employees);
    expect(rec.candidates).toHaveLength(2);
    expect(rec.candidates[0].id).toBe("b");
    expect(rec.candidates[1].id).toBe("a");
    expect(rec.candidates[1].why).toContain("Rank 2");
  });
});
