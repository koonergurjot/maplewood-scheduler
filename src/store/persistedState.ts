import type { PersistedState } from "./schedulerStore";

export function parsePersistedStatePayload(
  payload: any,
): PersistedState | null {
  if (!payload || typeof payload !== "object") return null;
  const rawState = payload.state;
  if (!rawState || typeof rawState !== "object") return null;

  const normalized: PersistedState = {
    ...(rawState as PersistedState),
  };

  const version =
    typeof payload.version === "number"
      ? payload.version
      : typeof (rawState as PersistedState).version === "number"
        ? (rawState as PersistedState).version
        : undefined;

  const updatedAt =
    typeof payload.updatedAt === "string"
      ? payload.updatedAt
      : typeof (rawState as PersistedState).updatedAt === "string"
        ? (rawState as PersistedState).updatedAt
        : undefined;

  if (version !== undefined) {
    normalized.version = version;
  }
  if (updatedAt !== undefined) {
    normalized.updatedAt = updatedAt;
  }

  return normalized;
}
