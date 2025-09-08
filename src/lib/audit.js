const KEY = "auditLogs";
export const MAX_LOGS = 1000;
function read(storage) {
    try {
        const raw = storage.getItem(KEY);
        return raw ? JSON.parse(raw) : [];
    }
    catch (err) {
        console.error("Failed to parse audit log storage", err);
        if (typeof window !== "undefined" && typeof window.alert === "function") {
            window.alert("Audit log storage was corrupted and has been reset.");
        }
        try {
            storage.setItem(KEY, JSON.stringify([]));
        }
        catch (writeErr) {
            console.error("Failed to reset audit log storage", writeErr);
        }
        return [];
    }
}
function write(logs, storage) {
    const trimmed = logs.slice(-MAX_LOGS);
    storage.setItem(KEY, JSON.stringify(trimmed));
}
export function logOfferingChange({ vacancyId, from, to, actor, reason, note, }, storage) {
    const log = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
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
export function getAuditLogs(storage) {
    return read(storage);
}
export function filterAuditLogs(storage, { date, vacancyId }) {
    let logs = getAuditLogs(storage);
    if (date)
        logs = logs.filter((l) => l.ts.startsWith(date));
    if (vacancyId)
        logs = logs.filter((l) => l.targetId === vacancyId);
    return logs;
}
export function clearAuditLogs(storage) {
    write([], storage);
}
