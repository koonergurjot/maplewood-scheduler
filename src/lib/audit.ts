import { OfferingTier } from '../offering/offeringMachine';

export interface AuditLog {
  id: string;
  ts: string;
  actor: string; // 'system' or user id
  action: 'OFFERING_TIER_CHANGED';
  targetType: 'Vacancy';
  targetId: string;
  details: {
    from: OfferingTier;
    to: OfferingTier;
    reason: 'auto-progress' | 'manual';
    note?: string;
  };
}

const KEY = 'auditLogs';

function read(): AuditLog[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as AuditLog[]) : [];
    } catch {
      return [];
    }
  }
  // Node/test environment fallback
  (globalThis as any).__AUDIT__ = (globalThis as any).__AUDIT__ || [];
  return (globalThis as any).__AUDIT__;
}

function write(logs: AuditLog[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(logs));
  } else {
    (globalThis as any).__AUDIT__ = logs;
  }
}

export function logOfferingChange({
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
  reason: 'auto-progress' | 'manual';
  note?: string;
}): AuditLog {
  const log: AuditLog = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    ts: new Date().toISOString(),
    actor,
    action: 'OFFERING_TIER_CHANGED',
    targetType: 'Vacancy',
    targetId: vacancyId,
    details: { from, to, reason, note },
  };
  const logs = read();
  logs.push(log);
  write(logs);
  return log;
}

export function getAuditLogs(): AuditLog[] {
  return read();
}

export function clearAuditLogs() {
  write([]);
}
