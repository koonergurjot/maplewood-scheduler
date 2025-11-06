import { getToken } from "../utils/api";
import { abortQueuedFetchSignal, queuedFetch } from "../utils/offlineQueue";
import { saveState } from "../utils/storage";

import type { PersistedState } from "./schedulerStore";
import { debounce } from "./utils";

type ConflictDetails = {
  snapshot: PersistedState;
  serverVersion: number | null;
  updatedAt: string | null;
};

type SchedulerPersistenceConfig = {
  onServerAck: (persisted: PersistedState) => void;
  onConflict: (details: ConflictDetails) => void;
  debounceMs?: number;
};

type ServerAckPayload = {
  state?: PersistedState;
  version?: number;
  updatedAt?: string;
  [key: string]: unknown;
};

function normalizeAck(
  snapshot: PersistedState,
  response: ServerAckPayload | null,
): PersistedState {
  if (!response) return snapshot;

  const merged: PersistedState = {
    ...snapshot,
    ...(response.state && typeof response.state === "object"
      ? response.state
      : {}),
  };

  const version =
    typeof response.version === "number"
      ? response.version
      : typeof merged.version === "number"
        ? merged.version
        : undefined;

  const updatedAt =
    typeof response.updatedAt === "string"
      ? response.updatedAt
      : typeof merged.updatedAt === "string"
        ? merged.updatedAt
        : undefined;

  if (version !== undefined) {
    merged.version = version;
  }
  if (updatedAt !== undefined) {
    merged.updatedAt = updatedAt;
  }

  return merged;
}

export function createSchedulerPersistenceManager({
  onServerAck,
  onConflict,
  debounceMs = 600,
}: SchedulerPersistenceConfig) {
  let inFlight: AbortController | null = null;
  let lastAbortController: AbortController | null = null;

  const send = async (snapshot: PersistedState) => {
    const token = getToken();
    if (!token) return;

    if (inFlight) {
      abortQueuedFetchSignal(inFlight.signal);
      inFlight.abort();
    }
    if (lastAbortController) {
      abortQueuedFetchSignal(lastAbortController.signal);
      lastAbortController.abort();
      lastAbortController = null;
    }

    const controller = new AbortController();
    inFlight = controller;
    lastAbortController = controller;

    try {
      const response = await queuedFetch("/api/scheduler-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          state: snapshot,
          version: snapshot.version,
        }),
        signal: controller.signal,
      });

      if (response.status === 409) {
        let payload: any = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        const serverVersion =
          typeof payload?.serverVersion === "number"
            ? payload.serverVersion
            : null;
        const updatedAt =
          typeof payload?.updatedAt === "string" ? payload.updatedAt : null;
        onConflict({ snapshot, serverVersion, updatedAt });
        return;
      }

      if (response.status === 200 || response.status === 201) {
        let payload: any = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        const merged = normalizeAck(snapshot, payload);
        saveState(merged);
        onServerAck(merged);
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        console.error("Failed to persist scheduler state", error);
      }
    } finally {
      if (inFlight === controller) {
        inFlight = null;
      }
    }
  };

  const debouncedSend = debounce(send, debounceMs);

  return {
    queue(snapshot: PersistedState) {
      debouncedSend(snapshot);
    },
    dispose() {
      debouncedSend.cancel();
      if (inFlight) {
        inFlight.abort();
        inFlight = null;
      }
    },
  };
}

export type SchedulerPersistenceManager = ReturnType<
  typeof createSchedulerPersistenceManager
>;
