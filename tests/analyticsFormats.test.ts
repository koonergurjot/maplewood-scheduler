import { describe, it, expect } from 'vitest';
import { createCsv } from '../server/analyticsFormats/csv.js';

describe('createCsv', () => {
  it('includes averageHours column', () => {
    const data = [
      {
        period: '2024-01',
        posted: 1,
        awarded: 1,
        cancelled: 0,
        cancellationRate: 0,
        overtime: 2,
        averageHours: 10,
      },
    ];
    const csv = createCsv(data);
    expect(csv).toContain('averageHours');
    expect(csv.trim().split('\n')[1].split(',').pop()).toBe('10');
  });
});
