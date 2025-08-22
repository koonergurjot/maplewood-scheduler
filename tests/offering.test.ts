import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTier, requiresConfirmation } from '../src/offering/offeringMachine';
import { createOfferingRound, Vacancy } from '../src/offering/useOfferingRound';
import { getAuditLogs, clearAuditLogs } from '../src/lib/audit';
import storage from '../src/lib/storage';

describe('offeringMachine', () => {
  it('nextTier returns correct next/null', () => {
    expect(nextTier('CASUALS')).toBe('OT_FULL_TIME');
    expect(nextTier('OT_CASUALS')).toBe('LAST_RESORT_RN');
    expect(nextTier('LAST_RESORT_RN')).toBeNull();
  });

  it('requires confirmation for last resort', () => {
    expect(requiresConfirmation('LAST_RESORT_RN')).toBe(true);
    expect(requiresConfirmation('CASUALS')).toBe(false);
  });
});

describe('useOfferingRound', () => {
  beforeEach(() => {
    clearAuditLogs(storage);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('auto-advance triggers after round length', () => {
    const vac: Vacancy = {
      id: '1',
      offeringTier: 'CASUALS',
      offeringRoundStartedAt: new Date().toISOString(),
      offeringRoundMinutes: 1,
      offeringAutoProgress: true,
    };
    const round = createOfferingRound(vac, {
      updateVacancy: () => {},
      currentUser: 'system',
      onTick: () => {},
    });
    vi.advanceTimersByTime(60000);
    expect(vac.offeringTier).toBe('OT_FULL_TIME');
    const logs = getAuditLogs(storage);
    expect(logs[0].details.reason).toBe('auto-progress');
    round.dispose();
  });

  it('manual change writes AuditLog with actor, from, to, reason', () => {
    const vac: Vacancy = {
      id: '1',
      offeringTier: 'CASUALS',
      offeringRoundStartedAt: new Date().toISOString(),
      offeringRoundMinutes: 5,
      offeringAutoProgress: true,
    };
    const round = createOfferingRound(vac, {
      updateVacancy: () => {},
      currentUser: 'manager',
      onTick: () => {},
    });
    round.onManualChangeTier('OT_FULL_TIME', 'need coverage');
    const logs = getAuditLogs(storage);
    expect(logs[0].actor).toBe('manager');
    expect(logs[0].details.from).toBe('CASUALS');
    expect(logs[0].details.to).toBe('OT_FULL_TIME');
    expect(logs[0].details.reason).toBe('manual');
    expect(logs[0].details.note).toBe('need coverage');
    round.dispose();
  });

  it('toggling auto-progress stops/starts auto advance', () => {
    const vac: Vacancy = {
      id: '1',
      offeringTier: 'CASUALS',
      offeringRoundStartedAt: new Date().toISOString(),
      offeringRoundMinutes: 1,
      offeringAutoProgress: true,
    };
    const round = createOfferingRound(vac, {
      updateVacancy: () => {},
      currentUser: 'manager',
      onTick: () => {},
    });
    round.onToggleAutoProgress(false);
    vi.advanceTimersByTime(60000);
    expect(vac.offeringTier).toBe('CASUALS');
    round.onToggleAutoProgress(true);
    round.onResetRound();
    vi.advanceTimersByTime(60000);
    expect(vac.offeringTier).toBe('OT_FULL_TIME');
    round.dispose();
  });

  it('clamps round minutes to 1-1440 and ignores non-numeric', () => {
    const vac: Vacancy = { id: '1', offeringTier: 'CASUALS', offeringRoundMinutes: 120 };
    const updateVacancy = vi.fn();
    const round = createOfferingRound(vac, {
      updateVacancy,
      currentUser: 'manager',
      onTick: () => {},
    });
    round.setRoundMinutes(-5);
    expect(vac.offeringRoundMinutes).toBe(1);
    expect(updateVacancy).toHaveBeenLastCalledWith({ offeringRoundMinutes: 1 });
    round.setRoundMinutes(2000);
    expect(vac.offeringRoundMinutes).toBe(1440);
    expect(updateVacancy).toHaveBeenLastCalledWith({ offeringRoundMinutes: 1440 });
    round.setRoundMinutes(NaN as any);
    expect(vac.offeringRoundMinutes).toBe(1440);
    expect(updateVacancy).toHaveBeenCalledTimes(2);
    round.dispose();
  });
});
