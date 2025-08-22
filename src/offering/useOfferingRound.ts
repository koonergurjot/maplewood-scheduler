/// <reference types="node" />
import { useEffect, useReducer, useRef, useState } from 'react';
import { OfferingTier, nextTier } from './offeringMachine';
import { logOfferingChange } from '../lib/audit';

export interface Vacancy {
  id: string;
  offeringTier: OfferingTier;
  offeringRoundStartedAt?: string;
  offeringRoundMinutes?: number;
  offeringAutoProgress?: boolean;
}

export interface UseOfferingRound {
  vacancy: Vacancy;
  timeLeftMs: number;
  isExpired: boolean;
  onResetRound: () => void;
  onManualChangeTier: (next: OfferingTier, note?: string) => void;
  onToggleAutoProgress: (enabled: boolean) => void;
  setRoundMinutes: (mins: number) => void;
}

interface RoundOptions {
  currentUser: string;
  onTick?: (msLeft: number) => void;
  onUpdate?: (patch: Partial<Vacancy>) => void;
}

/**
 * Internal non-react implementation for easier testing.
 */
export function createOfferingRound(vac: Vacancy, opts: RoundOptions) {
  let state: Vacancy = { ...vac };
  let interval: NodeJS.Timeout;

  const getRoundMinutes = () => state.offeringRoundMinutes ?? 120;

  const computeMsLeft = () => {
    const started = state.offeringRoundStartedAt
      ? new Date(state.offeringRoundStartedAt).getTime()
      : Date.now();
    return started + getRoundMinutes() * 60000 - Date.now();
  };

  const applyPatch = (patch: Partial<Vacancy>) => {
    state = { ...state, ...patch };
    opts.onUpdate?.(patch);
  };

  const tick = () => {
    const msLeft = computeMsLeft();
    opts.onTick?.(msLeft);
    if (msLeft <= 0 && state.offeringAutoProgress !== false) {
      const next = nextTier(state.offeringTier);
      if (next) {
        const from = state.offeringTier;
        const patch = {
          offeringTier: next,
          offeringRoundStartedAt: new Date().toISOString(),
        };
        applyPatch(patch);
        logOfferingChange({
          vacancyId: state.id,
          from,
          to: next,
          actor: 'system',
          reason: 'auto-progress',
        });
        opts.onTick?.(computeMsLeft());
      }
    }
  };

  interval = setInterval(tick, 60000);
  tick();

  return {
    onResetRound() {
      const patch = { offeringRoundStartedAt: new Date().toISOString() };
      applyPatch(patch);
      opts.onTick?.(computeMsLeft());
      return patch;
    },
    onManualChangeTier(next: OfferingTier, note?: string) {
      const from = state.offeringTier;
      const patch = {
        offeringTier: next,
        offeringRoundStartedAt: new Date().toISOString(),
      };
      applyPatch(patch);
      logOfferingChange({
        vacancyId: state.id,
        from,
        to: next,
        actor: opts.currentUser,
        reason: 'manual',
        note,
      });
      opts.onTick?.(computeMsLeft());
      return patch;
    },
    onToggleAutoProgress(enabled: boolean) {
      const patch = { offeringAutoProgress: enabled };
      applyPatch(patch);
      return patch;
    },
    setRoundMinutes(mins: number) {
      const patch = { offeringRoundMinutes: mins };
      applyPatch(patch);
      opts.onTick?.(computeMsLeft());
      return patch;
    },
    getVacancy() {
      return state;
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
  const [localVac, dispatch] = useReducer(
    (s: Vacancy, p: Partial<Vacancy>) => ({ ...s, ...p }),
    vac
  );
  const roundRef = useRef<ReturnType<typeof createOfferingRound>>();
  const [timeLeftMs, setTimeLeftMs] = useState(0);

  useEffect(() => {
    dispatch(vac);
    roundRef.current?.dispose();
    roundRef.current = createOfferingRound(vac, {
      currentUser,
      onTick: setTimeLeftMs,
      onUpdate: (patch) => {
        dispatch(patch);
        updateVacancy(patch);
      },
    });
    return () => roundRef.current?.dispose();
  }, [vac, updateVacancy, currentUser]);

  const call = (
    fn: keyof ReturnType<typeof createOfferingRound>,
    ...args: any[]
  ) => {
    const patch = (roundRef.current as any)?.[fn](...args);
    if (patch) {
      dispatch(patch);
      updateVacancy(patch);
    }
  };

  return {
    vacancy: localVac,
    timeLeftMs,
    isExpired: timeLeftMs <= 0,
    onResetRound: () => call('onResetRound'),
    onManualChangeTier: (n, note) => call('onManualChangeTier', n, note),
    onToggleAutoProgress: (e) => call('onToggleAutoProgress', e),
    setRoundMinutes: (m) => call('setRoundMinutes', m),
  };
}
