import { describe, expect, it } from 'vitest';
import { dateRangeInclusive } from '../App';

describe('dateRangeInclusive', () => {
  it('returns inclusive date range', () => {
    const result = dateRangeInclusive('2024-01-01', '2024-01-03');
    expect(result).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
    ]);
  });
});
