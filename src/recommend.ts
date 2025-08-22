export type Recommendation = {
  id?: string;
  why: string[];
};

export interface Vacancy {
  id: string;
  classification: string;
}

export interface Bid {
  vacancyId: string;
  bidderEmployeeId: string;
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
  employeesById: Record<string, Employee>
): Recommendation {
  const relevant = bids.filter(b => b.vacancyId === vac.id);
  const candidates = relevant
    .map(b => employeesById[b.bidderEmployeeId])
    .filter(
      (e): e is Employee =>
        !!e && e.active && e.classification === vac.classification
    );
  if (!candidates.length) {
    return { why: ['No eligible bidders'] };
  }
  candidates.sort(
    (a, b) => (a.seniorityRank ?? 99999) - (b.seniorityRank ?? 99999)
  );
  const chosen = candidates[0];
  const why = [
    'Bidder',
    `Rank ${chosen.seniorityRank ?? '?'}`,
    `Class ${chosen.classification}`
  ];
  return { id: chosen.id, why };
}
