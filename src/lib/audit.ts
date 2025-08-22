import { OfferingTier } from "../offering/offeringMachine";
import type { Storage } from "./storage";

export interface AuditLog {
  id: string;
  ts: string;
  actor: string; // 'system' or user id
  action: "OFFERING_TIER_CHANGED";
  targetType: "Vacancy";
  targetId: string;
  details: {
    from: OfferingTier;
    to: OfferingTier;
    reason: "auto-progress" | "manual";
    note?: string;
  };
}

const KEY = "auditLogs";
export const MAX_LOGS = 1000;

function read(storage: Storage): AuditLog[] {
  try {
    const raw = storage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuditLog[]) : [];
  } catch {
    return [];
  }
}

function write(logs: AuditLog[], storage: Storage) {
  const trimmed = logs.slice(-MAX_LOGS);
  storage.setItem(KEY, JSON.stringify(trimmed));
}

export function logOfferingChange(
  {
    vacancyId,
    from,
    to,
    actor,
    reason,
    note,
  }: {
    vacancyId: string;
    from: OfferingTier;
    to: OfferingTier;
    actor: string;
    reason: "auto-progress" | "manual";
    note?: string;
  },
  storage: Storage,
): AuditLog {
  const log: AuditLog = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    ts: new Date().toISOString(),
    actor,
    action: "OFFERING_TIER_CHANGED",
    targetType: "Vacancy",
    targetId: vacancyId,
    details: { from, to, reason, note },
  };
  const logs = read(storage);
  logs.push(log);
  write(logs, storage);
  return log;
}

export function getAuditLogs(storage: Storage): AuditLog[] {
  return read(storage);
}

export function clearAuditLogs(storage: Storage) {
  write([], storage);
}
