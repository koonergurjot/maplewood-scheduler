import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  nextTier,
  requiresConfirmation,
} from "../src/offering/offeringMachine";
import { createOfferingRound, Vacancy } from "../src/offering/useOfferingRound";
import {
  getAuditLogs,
  clearAuditLogs,
  logOfferingChange,
  MAX_LOGS,
} from "../src/lib/audit";
import storage from "../src/lib/storage";

describe("offeringMachine", () => {
  it("nextTier returns correct next/null", () => {
    expect(nextTier("CASUALS")).toBe("OT_FULL_TIME");
    expect(nextTier("OT_CASUALS")).toBe("LAST_RESORT_RN");
    expect(nextTier("LAST_RESORT_RN")).toBeNull();
  });

  it("requires confirmation for last resort", () => {
    expect(requiresConfirmation("LAST_RESORT_RN")).toBe(true);
    expect(requiresConfirmation("CASUALS")).toBe(false);
  });
});

describe("useOfferingRound", () => {
  beforeEach(() => {
    clearAuditLogs(storage);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("auto-advance triggers after round length", () => {
    const vac: Vacancy = {
      id: "1",
      offeringTier: "CASUALS",
      offeringRoundStartedAt: new Date().toISOString(),
      offeringRoundMinutes: 1,
      offeringAutoProgress: true,
    };
    const onTick = vi.fn();
    const updateVacancy = vi.fn();
    const round = createOfferingRound(vac, {
      updateVacancy,
      currentUser: "system",
      onTick,
    });
    // 59 seconds pass, round should not yet auto-progress
    vi.advanceTimersByTime(59000);
    expect(vac.offeringTier).toBe("CASUALS");
    expect(updateVacancy).not.toHaveBeenCalled();
    // initial tick + 59 subsequent ticks
    expect(onTick).toHaveBeenCalledTimes(60);

    // Next second reaches the end of the round and triggers auto-progress
    vi.advanceTimersByTime(1000);
    expect(vac.offeringTier).toBe("CASUALS");
    expect(updateVacancy).toHaveBeenCalledWith(
      expect.objectContaining({ offeringTier: "OT_FULL_TIME" }),
    );
    const logs = getAuditLogs(storage);
    expect(logs[0].details.reason).toBe("auto-progress");
    // final tick calls onTick twice: once when expiring and once after advancing
    expect(onTick).toHaveBeenCalledTimes(62);
    round.dispose();
  });

  it("calls onTick every second", () => {
    const vac: Vacancy = {
      id: "1",
      offeringTier: "CASUALS",
      offeringRoundStartedAt: new Date().toISOString(),
      offeringRoundMinutes: 5,
      offeringAutoProgress: true,
    };
    const onTick = vi.fn();
    const round = createOfferingRound(vac, {
      updateVacancy: () => {},
      currentUser: "system",
      onTick,
    });
    // initial tick happens immediately
    expect(onTick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    // three more ticks after 3 seconds
    expect(onTick).toHaveBeenCalledTimes(4);
    round.dispose();
  });

  it("stops ticking after final tier expires", () => {
    const vac: Vacancy = {
      id: "1",
      offeringTier: "LAST_RESORT_RN",
      offeringRoundStartedAt: new Date().toISOString(),
      offeringRoundMinutes: 1,
      offeringAutoProgress: true,
    };
    const onTick = vi.fn();
    const round = createOfferingRound(vac, {
      updateVacancy: () => {},
      currentUser: "system",
      onTick,
    });
    expect(round.isRunning()).toBe(true);
    vi.advanceTimersByTime(60000);
    expect(round.isRunning()).toBe(false);
    const calls = onTick.mock.calls.length;
    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenCalledTimes(calls);
    round.dispose();
  });

  it("manual change writes AuditLog with actor, from, to, reason", () => {
    const vac: Vacancy = {
      id: "1",
      offeringTier: "CASUALS",
      offeringRoundStartedAt: new Date().toISOString(),
      offeringRoundMinutes: 5,
      offeringAutoProgress: true,
    };
    const updateVacancy = vi.fn();
    const round = createOfferingRound(vac, {
      updateVacancy,
      currentUser: "manager",
      onTick: () => {},
    });
    round.onManualChangeTier("OT_FULL_TIME", "need coverage");
    const logs = getAuditLogs(storage);
    expect(logs[0].actor).toBe("manager");
    expect(logs[0].details.from).toBe("CASUALS");
    expect(logs[0].details.to).toBe("OT_FULL_TIME");
    expect(logs[0].details.reason).toBe("manual");
    expect(logs[0].details.note).toBe("need coverage");
    round.dispose();
  });

  it("toggling auto-progress stops/starts auto advance", () => {
    const vac: Vacancy = {
      id: "1",
      offeringTier: "CASUALS",
      offeringRoundStartedAt: new Date().toISOString(),
      offeringRoundMinutes: 1,
      offeringAutoProgress: true,
    };
    const updateVacancy = vi.fn();
    const round = createOfferingRound(vac, {
      updateVacancy,
      currentUser: "manager",
      onTick: () => {},
    });
    round.onToggleAutoProgress(false);
    vi.advanceTimersByTime(60000);
    expect(vac.offeringTier).toBe("CASUALS");
    // no auto-progress occurred while disabled
    expect(updateVacancy).not.toHaveBeenCalledWith(
      expect.objectContaining({ offeringTier: "OT_FULL_TIME" }),
    );
    round.onToggleAutoProgress(true);
    round.onResetRound();
    vi.advanceTimersByTime(60000);
    expect(updateVacancy).toHaveBeenCalledWith(
      expect.objectContaining({ offeringTier: "OT_FULL_TIME" }),
    );
    round.dispose();
  });

  it("trims audit log history to MAX_LOGS entries", () => {
    const overflow = 5;
    for (let i = 0; i < MAX_LOGS + overflow; i++) {
      logOfferingChange(
        {
          vacancyId: String(i),
          from: "CASUALS",
          to: "OT_FULL_TIME",
          actor: "system",
          reason: "manual",
        },
        storage,
      );
    }
    const logs = getAuditLogs(storage);
    expect(logs).toHaveLength(MAX_LOGS);
    expect(logs[0].targetId).toBe(String(overflow));
  });
});
