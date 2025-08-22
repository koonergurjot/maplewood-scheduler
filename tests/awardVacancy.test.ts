import { describe, it, expect } from 'vitest';
import { applyAwardVacancy } from '../src/utils';
import type { Vacancy } from '../src/types';

describe('applyAwardVacancy', () => {
  it('stores undefined when empId is EMPTY', () => {
    const vac: Vacancy = {
      id: 'v1',
      reason: 'Test',
      classification: 'RN',
      shiftDate: '2024-01-01',
      shiftStart: '08:00',
      shiftEnd: '16:00',
      knownAt: '2024-01-01T00:00:00.000Z',
      offeringTier: 'CASUALS',
      offeringStep: 'Casuals',
      status: 'Open',
    };
    const updated = applyAwardVacancy([vac], 'v1', { empId: 'EMPTY' });
    expect(updated[0].status).toBe('Awarded');
    expect(updated[0].awardedTo).toBeUndefined();
  });
});
