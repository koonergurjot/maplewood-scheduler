import { describe, it, expect } from 'vitest';
import { dateRangeInclusive } from '../App';

describe('dateRangeInclusive', () => {
  it('returns all dates in an inclusive range', () => {
    const range = dateRangeInclusive('2024-06-30', '2024-07-02');
    expect(range).toEqual(['2024-06-30', '2024-07-01', '2024-07-02']);
  });

  it('includes each day once across a daylight-saving transition', () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = 'America/New_York';

    const range = dateRangeInclusive('2024-03-09', '2024-03-12');
    expect(range).toEqual([
      '2024-03-09',
      '2024-03-10',
      '2024-03-11',
      '2024-03-12',
    ]);
    expect(new Set(range).size).toBe(range.length);

    process.env.TZ = originalTZ;
  });
});
