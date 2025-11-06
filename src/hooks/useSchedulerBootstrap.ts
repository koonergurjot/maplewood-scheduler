import { useEffect, useMemo, useRef, useState } from "react";

import { getToken } from "../utils/api";
import { loadState } from "../utils/storage";
import { parsePersistedStatePayload } from "../store/persistedState";
import type { PersistedState } from "./useSchedulerState";

const LOGIN_REDIRECT_PATH = "/login";

function readLocalSnapshot(): PersistedState | null {
  return loadState<PersistedState>() ?? null;
}

type BootstrapStatus = "loading" | "ready";

export type SchedulerBootstrapResult = {
  status: BootstrapStatus;
  persisted: PersistedState | null;
  error: string | null;
};

const FALLBACK_MESSAGE =
  "Unable to refresh remote data. Showing saved copy.";

export function useSchedulerBootstrap(): SchedulerBootstrapResult {
  const localSnapshot = useRef<PersistedState | null>(readLocalSnapshot());
  const [{ status, persisted, error }, setState] = useState<{
    status: BootstrapStatus;
    persisted: PersistedState | null;
    error: string | null;
  }>(() => ({
    status: "loading",
    persisted: localSnapshot.current,
    error: null,
  }));

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const token = getToken();
      const localState = localSnapshot.current;

      if (!token) {
        setState({ status: "ready", persisted: localState, error: null });
        return;
      }

      try {
        const response = await fetch("/api/scheduler-state", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (cancelled) return;

        if (response.status === 204) {
          setState({ status: "ready", persisted: localState, error: null });
          return;
        }

        if (response.status === 200) {
          const payload = await response.json();
          const remoteState: PersistedState | null =
            parsePersistedStatePayload(payload);
          if (!remoteState) {
            console.error("Scheduler bootstrap returned an empty payload", payload);
          }
          setState({
            status: "ready",
            persisted: remoteState ?? localState,
            error: remoteState ? null : FALLBACK_MESSAGE,
          });
          return;
        }

        if (response.status === 401) {
          console.error("Scheduler bootstrap rejected with 401. Redirecting to login.");
          if (typeof window !== "undefined" && window.location) {
            const assign = window.location.assign?.bind(window.location);
            if (typeof assign === "function") {
              assign(LOGIN_REDIRECT_PATH);
            } else {
              window.location.href = LOGIN_REDIRECT_PATH;
            }
          }
          return;
        }

        let body: string | undefined;
        try {
          body = await response.text();
        } catch {
          body = undefined;
        }
        console.error("Scheduler bootstrap failed", {
          status: response.status,
          body,
        });
        setState({
          status: "ready",
          persisted: localState,
          error: FALLBACK_MESSAGE,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("Scheduler bootstrap encountered an error", err);
        setState({
          status: "ready",
          persisted: localState,
          error: FALLBACK_MESSAGE,
        });
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({ status, persisted, error }),
    [status, persisted, error],
  );
}
