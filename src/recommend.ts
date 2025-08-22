import type { OfferingTier } from "./offering/offeringMachine";

export type Recommendation = {
  id?: string;
  why: string[];
};

export interface Vacancy {
  id: string;
  classification: string;
  offeringTier: OfferingTier;
  offeringRoundStartedAt?: string;
  offeringRoundMinutes?: number;
  offeringAutoProgress?: boolean;
}

export interface Bid {
  vacancyId: string;
  bidderEmployeeId: string;
  placedAt?: string;
}

export interface Employee {
  id: string;
  active: boolean;
  seniorityRank?: number;
  classification: string;
}

export function recommend(
  vac: Vacancy,
  bids: Bid[],
  employeesById: Record<string, Employee>,
): Recommendation {
  const relevant = bids.filter((b) => b.vacancyId === vac.id);
  const candidates = relevant
    .map((b, idx) => ({
      emp: employeesById[b.bidderEmployeeId],
      order: idx,
      time: b.placedAt ? Date.parse(b.placedAt) : undefined,
    }))
    .filter(
      (c): c is { emp: Employee; order: number; time: number | undefined } =>
        !!c.emp && c.emp.active && c.emp.classification === vac.classification,
    );
  if (!candidates.length) {
    return { why: ["No eligible bidders"] };
  }
  candidates.sort((a, b) => {
    // Primary sort by seniority rank. If ranks tie, prefer the earlier bid
    // determined by timestamp when present, otherwise by bid order.
    const rankDiff =
      (a.emp.seniorityRank ?? 99999) - (b.emp.seniorityRank ?? 99999);
    if (rankDiff !== 0) return rankDiff;
    if (a.time !== undefined && b.time !== undefined && a.time !== b.time) {
      return a.time - b.time;
    }
    return a.order - b.order;
  });
  const chosen = candidates[0].emp;
  const why = [
    "Bidder",
    `Rank ${chosen.seniorityRank ?? "?"}`,
    `Class ${chosen.classification}`,
  ];
  return { id: chosen.id, why };
}
