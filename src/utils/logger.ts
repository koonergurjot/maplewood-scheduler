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
  await authFetch("/api/logs/bulk-award", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
