import { describe, it, expect } from 'vitest';
import { dateRangeInclusive } from '../App';

describe('dateRangeInclusive', () => {
  it('returns all dates in the range', () => {
    const result = dateRangeInclusive('2024-01-01', '2024-01-03');
    expect(result).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
  });

  it('handles a single-day range', () => {
    const result = dateRangeInclusive('2024-02-10', '2024-02-10');
    expect(result).toEqual(['2024-02-10']);
  });

  it('returns an empty array when start is after end', () => {
    const result = dateRangeInclusive('2024-03-05', '2024-03-01');
    expect(result).toEqual([]);
  });
});
