import { describe, it, expect } from 'vitest';
import { aggregateByMonth } from '../server/metrics.js';
import { sampleVacancies } from '../server/sampleData/vacancies.ts';

describe('aggregateByMonth', () => {
  it('calculates metrics correctly', () => {
    const result = aggregateByMonth(sampleVacancies);
    const jan = result.find(r => r.period === '2024-01');
    const feb = result.find(r => r.period === '2024-02');
    expect(jan?.posted).toBe(3);
    expect(jan?.awarded).toBe(1);
    expect(jan?.cancelled).toBe(1);
    expect(jan?.cancellationRate).toBeCloseTo(1 / 3);
    expect(jan?.overtime).toBe(2);
    expect(feb?.posted).toBe(3);
    expect(feb?.awarded).toBe(2);
    expect(feb?.cancelled).toBe(1);
    expect(feb?.cancellationRate).toBeCloseTo(1 / 3);
    expect(feb?.overtime).toBe(1);
  });
});
