import { authFetch } from "./api";

export async function logBulkAward({
  vacancyIds,
  employeeId,
  reason,
  user,
}: {
  vacancyIds: string[];
  employeeId?: string;
  reason?: string;
  user?: string;
}) {
  const payload = {
    vacancyIds,
    employeeId,
    reason,
    user:
      user ??
      (typeof window !== "undefined"
        ? window.localStorage.getItem("currentUser") || undefined
        : undefined),
    timestamp: new Date().toISOString(),
  };
  try {
    const base = (typeof window !== "undefined" && (window as any).__API_BASE__) || "/api";
    await authFetch(base + "/logs/bulk-award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    try {
      const key = "LOGS_LOCAL_FALLBACK";
      const prev = JSON.parse(window.localStorage.getItem(key) || "[]");
      prev.push(payload);
      window.localStorage.setItem(key, JSON.stringify(prev));
    } catch {}
    console.error("Failed to log bulk award", err);
  }
}
