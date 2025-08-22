import { describe, it, expect } from 'vitest';
import { recommend } from '../src/recommend';

const employees = {
  a: { id: 'a', active: true, seniorityRank: 2, classification: 'RN' },
  b: { id: 'b', active: true, seniorityRank: 1, classification: 'RN' },
  c: { id: 'c', active: true, seniorityRank: 1, classification: 'LPN' },
  d: { id: 'd', active: false, seniorityRank: 1, classification: 'RN' },
};

const bids = [
  { vacancyId: 'vac1', bidderEmployeeId: 'a' },
  { vacancyId: 'vac1', bidderEmployeeId: 'b' },
  { vacancyId: 'vac1', bidderEmployeeId: 'c' },
  { vacancyId: 'vac1', bidderEmployeeId: 'd' },
];

describe('recommend', () => {
  it('returns highest seniority matching class', () => {
    const vac = { id: 'vac1', classification: 'RN' };
    const rec = recommend(vac, bids, employees);
    expect(rec.id).toBe('b');
    expect(rec.why).toContain('Bidder');
    expect(rec.why).toContain('Rank 1');
    expect(rec.why).toContain('Class RN');
  });

  it('reports when there are no eligible bidders', () => {
    const vac = { id: 'vac2', classification: 'RN' };
    const rec = recommend(vac, bids, employees);
    expect(rec.id).toBeUndefined();
    expect(rec.why[0]).toBe('No eligible bidders');
  });
});
