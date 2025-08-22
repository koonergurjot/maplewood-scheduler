import { useEffect, useRef, useState } from 'react';
import { OfferingTier, nextTier } from './offeringMachine';
import { logOfferingChange } from '../lib/audit';
import storage from '../lib/storage';

export interface Vacancy {
  id: string;
  offeringTier: OfferingTier;
  offeringRoundStartedAt?: string;
  offeringRoundMinutes?: number;
  offeringAutoProgress?: boolean;
}

export interface UseOfferingRound {
  timeLeftMs: number;
  isExpired: boolean;
  onResetRound: () => void;
  onManualChangeTier: (next: OfferingTier, note?: string) => void;
  onToggleAutoProgress: (enabled: boolean) => void;
  setRoundMinutes: (mins: number) => void;
}

interface RoundOptions {
  updateVacancy: (patch: Partial<Vacancy>) => void;
  currentUser: string;
  onTick?: (msLeft: number) => void;
}

/**
 * Internal non-react implementation for easier testing.
 */
export function createOfferingRound(vac: Vacancy, opts: RoundOptions) {
  let interval: any;
  const getRoundMinutes = () => vac.offeringRoundMinutes ?? 120;

  const computeMsLeft = () => {
    const started = vac.offeringRoundStartedAt
      ? new Date(vac.offeringRoundStartedAt).getTime()
      : Date.now();
    return started + getRoundMinutes() * 60000 - Date.now();
  };

  const tick = () => {
    const msLeft = computeMsLeft();
    opts.onTick?.(msLeft);
    if (msLeft <= 0 && vac.offeringAutoProgress !== false) {
      const next = nextTier(vac.offeringTier);
      if (next) {
        const from = vac.offeringTier;
        vac.offeringTier = next;
        vac.offeringRoundStartedAt = new Date().toISOString();
        opts.updateVacancy({
          offeringTier: next,
          offeringRoundStartedAt: vac.offeringRoundStartedAt,
        });
        logOfferingChange({
          vacancyId: vac.id,
          from,
          to: next,
          actor: 'system',
          reason: 'auto-progress',
        }, storage);
        opts.onTick?.(computeMsLeft());
      }
    }
  };

  interval = setInterval(tick, 60000);
  tick();

  return {
    onResetRound() {
      vac.offeringRoundStartedAt = new Date().toISOString();
      opts.updateVacancy({ offeringRoundStartedAt: vac.offeringRoundStartedAt });
      opts.onTick?.(computeMsLeft());
    },
    onManualChangeTier(next: OfferingTier, note?: string) {
      const from = vac.offeringTier;
      vac.offeringTier = next;
      vac.offeringRoundStartedAt = new Date().toISOString();
      opts.updateVacancy({
        offeringTier: next,
        offeringRoundStartedAt: vac.offeringRoundStartedAt,
      });
      logOfferingChange({
        vacancyId: vac.id,
        from,
        to: next,
        actor: opts.currentUser,
        reason: 'manual',
        note,
      }, storage);
      opts.onTick?.(computeMsLeft());
    },
    onToggleAutoProgress(enabled: boolean) {
      vac.offeringAutoProgress = enabled;
      opts.updateVacancy({ offeringAutoProgress: enabled });
    },
    setRoundMinutes(mins: number) {
      if (!Number.isFinite(mins)) return;
      const clamped = Math.min(1440, Math.max(1, Math.round(mins)));
      vac.offeringRoundMinutes = clamped;
      opts.updateVacancy({ offeringRoundMinutes: clamped });
      opts.onTick?.(computeMsLeft());
    },
    dispose() {
      clearInterval(interval);
    },
  };
}

export function useOfferingRound(
  vac: Vacancy,
  updateVacancy: (patch: Partial<Vacancy>) => void,
  currentUser: string
): UseOfferingRound {
  const roundRef = useRef<ReturnType<typeof createOfferingRound>>();
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  useEffect(() => {
    roundRef.current?.dispose();
    roundRef.current = createOfferingRound(vac, {
      updateVacancy,
      currentUser,
      onTick: setTimeLeftMs,
    });
    return () => roundRef.current?.dispose();
  }, [vac, updateVacancy, currentUser]);

  return {
    timeLeftMs,
    isExpired: timeLeftMs <= 0,
    onResetRound: () => roundRef.current?.onResetRound(),
    onManualChangeTier: (n, note) => roundRef.current?.onManualChangeTier(n, note),
    onToggleAutoProgress: (e) => roundRef.current?.onToggleAutoProgress(e),
    setRoundMinutes: (m) => roundRef.current?.setRoundMinutes(m),
  };
}
