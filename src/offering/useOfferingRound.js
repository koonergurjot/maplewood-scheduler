import { useEffect, useRef, useState } from "react";
import { nextTier } from "./offeringMachine";
import { logOfferingChange } from "../lib/audit";
import storage from "../lib/storage";
/**
 * Internal non-react implementation for easier testing.
 */
export function createOfferingRound(vac, opts) {
    let interval;
    let current = { ...vac };
    const dispose = () => {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    };
    const isRunning = () => interval != null;
    const getRoundMinutes = () => current.offeringRoundMinutes ?? 120;
    const computeMsLeft = () => {
        const started = current.offeringRoundStartedAt
            ? new Date(current.offeringRoundStartedAt).getTime()
            : Date.now();
        return started + getRoundMinutes() * 60000 - Date.now();
    };
    const applyPatch = (patch) => {
        current = { ...current, ...patch };
        opts.updateVacancy(patch);
    };
    const tick = () => {
        const msLeft = Math.max(0, computeMsLeft());
        opts.onTick?.(msLeft);
        if (msLeft <= 0) {
            const next = nextTier(current.offeringTier);
            if (current.offeringAutoProgress !== false && next) {
                const from = current.offeringTier;
                const startedAt = new Date().toISOString();
                applyPatch({
                    offeringTier: next,
                    offeringRoundStartedAt: startedAt,
                });
                logOfferingChange({
                    vacancyId: current.id,
                    from,
                    to: next,
                    actor: "system",
                    reason: "auto-progress",
                }, storage);
                opts.onTick?.(Math.max(0, computeMsLeft()));
            }
            else {
                dispose();
            }
        }
    };
    // tick once per second so consumers get updates at the second level
    interval = setInterval(tick, 1000);
    tick();
    return {
        onResetRound() {
            const startedAt = new Date().toISOString();
            applyPatch({ offeringRoundStartedAt: startedAt });
            opts.onTick?.(computeMsLeft());
            if (!isRunning()) {
                interval = setInterval(tick, 1000);
            }
        },
        onManualChangeTier(next, note) {
            const from = current.offeringTier;
            const startedAt = new Date().toISOString();
            applyPatch({
                offeringTier: next,
                offeringRoundStartedAt: startedAt,
            });
            logOfferingChange({
                vacancyId: current.id,
                from,
                to: next,
                actor: opts.currentUser,
                reason: "manual",
                note,
            }, storage);
            opts.onTick?.(computeMsLeft());
        },
        onToggleAutoProgress(enabled) {
            applyPatch({ offeringAutoProgress: enabled });
        },
        setRoundMinutes(mins) {
            applyPatch({ offeringRoundMinutes: mins });
            opts.onTick?.(computeMsLeft());
        },
        dispose,
        isRunning,
    };
}
export function useOfferingRound(vac, updateVacancy, currentUser) {
    const roundRef = useRef();
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
