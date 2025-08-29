import type { VacancyRange, Bid, Employee } from "../types";

/**
 * Rank full-coverage bids by seniority (ascending rank = more senior).
 * Bids that do not cover all working days are ignored here.
 * Returns the winning bid or null.
 */
export function pickWinningFullRangeBid(range: VacancyRange, bids: Bid[], employees: Employee[]): Bid | null {
  const empById = new Map(employees.map(e => [e.id, e]));
  const full = bids.filter(b => b.coverageType === "full");
  if (!full.length) return null;
  full.sort((a, b) => {
    const ea = empById.get(a.bidderEmployeeId)?.seniorityRank ?? 9999;
    const eb = empById.get(b.bidderEmployeeId)?.seniorityRank ?? 9999;
    return ea - eb;
  });
  return full[0] ?? null;
}
