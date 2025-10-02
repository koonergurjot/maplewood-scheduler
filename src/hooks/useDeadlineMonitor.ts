import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Settings, Vacancy } from "../App";
import { combineDateTime } from "../lib/dates";
import type {
  NotificationPreferences,
  NotificationChannel,
} from "../state/useNotificationPrefs";
import type {
  DeadlineEvent,
  DeadlineNotification,
} from "../types/notifications";
import { authFetch, getApiBaseUrl } from "../utils/api";
import { useApiAuth } from "../state/apiAuth";

const isBrowser = typeof window !== "undefined";
const isTestEnvironment =
  typeof globalThis !== "undefined" &&
  Boolean((globalThis as { __vitest_worker__?: unknown }).__vitest_worker__);

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `deadline_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) return "unknown";
  const absMinutes = Math.abs(minutes);
  if (absMinutes < 1) return "less than a minute";
  if (absMinutes < 60) {
    const rounded = Math.round(absMinutes);
    return `${rounded} minute${rounded === 1 ? "" : "s"}`;
  }
  const hours = absMinutes / 60;
  if (hours < 24) {
    const rounded = Math.round(hours);
    return `${rounded} hour${rounded === 1 ? "" : "s"}`;
  }
  const days = hours / 24;
  const rounded = Math.round(days);
  return `${rounded} day${rounded === 1 ? "" : "s"}`;
}

function pickWindowMinutes(vacancy: Vacancy, settings: Settings) {
  const known = new Date(vacancy.knownAt);
  const shiftStart = combineDateTime(vacancy.shiftDate, vacancy.shiftStart);
  if (Number.isNaN(known.getTime()) || Number.isNaN(shiftStart.getTime())) {
    return settings.responseWindows.h4to24;
  }
  const hrsUntilShift = (shiftStart.getTime() - known.getTime()) / 3_600_000;
  if (hrsUntilShift < 2) return settings.responseWindows.lt2h;
  if (hrsUntilShift < 4) return settings.responseWindows.h2to4;
  if (hrsUntilShift < 24) return settings.responseWindows.h4to24;
  if (hrsUntilShift < 72) return settings.responseWindows.h24to72;
  return settings.responseWindows.gt72;
}

function deadlineFor(vacancy: Vacancy, settings: Settings) {
  const known = new Date(vacancy.knownAt);
  if (Number.isNaN(known.getTime())) return null;
  const minutes = pickWindowMinutes(vacancy, settings);
  return new Date(known.getTime() + minutes * 60_000);
}

function isWithinQuietHours(now: Date, quiet: NotificationPreferences["quietHours"]) {
  if (!quiet.enabled) return false;
  const parseTime = (value: string) => {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return 0;
    const [, hh, mm] = match;
    return Number(hh) * 60 + Number(mm);
  };
  const start = parseTime(quiet.start);
  const end = parseTime(quiet.end);
  const current = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true; // quiet all day
  if (start < end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

function parseSseChunk(chunk: string) {
  const lines = chunk.split("\n");
  let eventName: string | undefined;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (!dataLines.length) return null;
  return { event: eventName, data: dataLines.join("\n") };
}

type DeadlineMonitorOptions = {
  vacancies: Vacancy[];
  settings: Settings;
  notificationPrefs: NotificationPreferences;
  now: number;
  formatVacancy: (vacancy: Vacancy) => string;
};

export function useDeadlineMonitor({
  vacancies,
  settings,
  notificationPrefs,
  now,
  formatVacancy,
}: DeadlineMonitorOptions) {
  const serverSyncEnabled = isBrowser && !isTestEnvironment;
  const { status: authStatus, token: authToken, reportError: dispatchAuthError, waitForValidToken } =
    useApiAuth();
  const [notifications, setNotifications] = useState<DeadlineNotification[]>([]);
  const notificationsRef = useRef(new Map<string, DeadlineNotification>());
  const triggeredRef = useRef(new Map<string, string>());
  const pendingRef = useRef<DeadlineEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiBase = useMemo(() => {
    const base = getApiBaseUrl();
    if (!base) return "";
    return base.replace(/\/$/, "");
  }, []);

  const resolveApiUrl = useCallback(
    (path: string) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      if (apiBase) {
        return `${apiBase}${normalizedPath}`;
      }
      if (typeof window !== "undefined" && window.location?.origin) {
        return new URL(normalizedPath, window.location.origin).toString();
      }
      return normalizedPath;
    },
    [apiBase],
  );

  const syncNotifications = useCallback(() => {
    setNotifications(
      Array.from(notificationsRef.current.values()).sort((a, b) =>
        a.triggeredAt > b.triggeredAt ? -1 : a.triggeredAt < b.triggeredAt ? 1 : 0,
      ),
    );
  }, []);

  const upsertNotification = useCallback(
    (event: DeadlineEvent, overrides: Partial<DeadlineNotification> = {}) => {
      const existing = notificationsRef.current.get(event.id);
      const base: DeadlineNotification = existing
        ? { ...existing, ...event }
        : { ...event, read: false };
      const next: DeadlineNotification = {
        ...base,
        read:
          typeof overrides.read === "boolean" ? overrides.read : base.read ?? false,
        resolved:
          typeof overrides.resolved === "boolean"
            ? overrides.resolved
            : base.resolved,
        resolvedAt:
          typeof overrides.resolvedAt === "string"
            ? overrides.resolvedAt
            : base.resolvedAt,
      };
      notificationsRef.current.set(event.id, next);
      syncNotifications();
    },
    [syncNotifications],
  );

  const markNotificationResolved = useCallback(
    (id: string) => {
      const existing = notificationsRef.current.get(id);
      if (!existing || existing.resolved) return;
      notificationsRef.current.set(id, {
        ...existing,
        resolved: true,
        resolvedAt: new Date().toISOString(),
      });
      syncNotifications();
    },
    [syncNotifications],
  );

  const flushPending = useCallback(async () => {
    if (!pendingRef.current.length) return;
    if (!serverSyncEnabled) {
      pendingRef.current = [];
      return;
    }
    const events = pendingRef.current.splice(0, pendingRef.current.length);
    if (!events.length) return;
    const endpoint = resolveApiUrl("/api/deadlines");
    try {
      await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
    } catch (error: any) {
      console.warn("Failed to sync deadline events", error);
      pendingRef.current.unshift(...events);
      if (error?.status === 401) {
        dispatchAuthError(error?.message ?? "Unauthorized");
        await waitForValidToken();
        if (!serverSyncEnabled) return;
        return flushPending();
      }
      throw error;
    }
  }, [apiBase, serverSyncEnabled, dispatchAuthError, waitForValidToken]);

  const scheduleFlush = useCallback(
    (delayMs: number) => {
      if (!serverSyncEnabled) return;
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(async () => {
        flushTimerRef.current = null;
        try {
          await flushPending();
        } catch {
          scheduleFlush(5_000);
        }
      }, delayMs);
    },
    [flushPending, serverSyncEnabled],
  );

  const enqueueServerSync = useCallback(
    (event: DeadlineEvent) => {
      if (!serverSyncEnabled) return;
      pendingRef.current.push(event);
      scheduleFlush(500);
    },
    [scheduleFlush, serverSyncEnabled],
  );

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, []);

  const acknowledgeNotification = useCallback(
    (id: string) => {
      const existing = notificationsRef.current.get(id);
      if (!existing) return;
      notificationsRef.current.set(id, { ...existing, read: true });
      syncNotifications();
    },
    [syncNotifications],
  );

  const acknowledgeAll = useCallback(() => {
    if (!notificationsRef.current.size) return;
    let changed = false;
    notificationsRef.current.forEach((value, key) => {
      if (value.read) return;
      changed = true;
      notificationsRef.current.set(key, { ...value, read: true });
    });
    if (changed) syncNotifications();
  }, [syncNotifications]);

  const enabledLeadTimes = useMemo(
    () => notificationPrefs.leadTimes.filter((lt) => lt.enabled).sort((a, b) => a.minutes - b.minutes),
    [notificationPrefs.leadTimes],
  );

  useEffect(() => {
    const nowDate = new Date(now);
    const quietActive = isWithinQuietHours(nowDate, notificationPrefs.quietHours);
    const suppressedChannels = quietActive
      ? notificationPrefs.quietHours.suppress
      : [];
    const enabledChannels = (Object.entries(notificationPrefs.channels) as [
      NotificationChannel,
      { enabled: boolean },
    ][])
      .filter(([, cfg]) => cfg.enabled)
      .map(([key]) => key);

    const vacancyById = new Map(vacancies.map((vacancy) => [vacancy.id, vacancy]));
    const activeKeys = new Set<string>();
    let mutated = false;

    for (const vacancy of vacancies) {
      if (vacancy.status === "Filled" || vacancy.status === "Awarded") {
        continue;
      }
      const deadline = deadlineFor(vacancy, settings);
      if (!deadline) continue;
      const minutesUntil = (deadline.getTime() - nowDate.getTime()) / 60_000;
      for (const leadTime of enabledLeadTimes) {
        const key = `${vacancy.id}:${leadTime.id}`;
        if (minutesUntil > leadTime.minutes) continue;
        activeKeys.add(key);
        if (triggeredRef.current.has(key)) continue;
        const channelsForEvent = enabledChannels.filter(
          (channel) => !suppressedChannels.includes(channel),
        );
        if (!channelsForEvent.length && suppressedChannels.length === 0) continue;
        const eventId = createEventId();
        const severity = minutesUntil <= 0 ? "critical" : leadTime.minutes <= 30 ? "warning" : "info";
        const message =
          minutesUntil <= 0
            ? `${formatVacancy(vacancy)} deadline passed ${formatDuration(minutesUntil)} ago`
            : `${formatVacancy(vacancy)} deadline in ${formatDuration(minutesUntil)}`;
        const event: DeadlineEvent = {
          id: eventId,
          vacancyId: vacancy.id,
          leadTimeId: leadTime.id,
          message,
          deadlineAt: deadline.toISOString(),
          triggeredAt: new Date().toISOString(),
          severity,
          channels: channelsForEvent,
          suppressedChannels,
          origin: "local",
        };
        triggeredRef.current.set(key, eventId);
        upsertNotification(event, {
          read: !channelsForEvent.includes("inApp"),
        });
        enqueueServerSync(event);
        mutated = true;
      }
    }

    // resolve notifications for vacancies that are now closed or keys no longer active
    for (const [key, id] of triggeredRef.current.entries()) {
      if (activeKeys.has(key)) continue;
      const vacancyId = key.split(":", 1)[0];
      const vacancy = vacancyById.get(vacancyId);
      if (vacancy && vacancy.status !== "Filled" && vacancy.status !== "Awarded") {
        continue;
      }
      triggeredRef.current.delete(key);
      markNotificationResolved(id);
      mutated = true;
    }

    if (mutated) syncNotifications();
  }, [
    vacancies,
    settings,
    notificationPrefs,
    enabledLeadTimes,
    now,
    upsertNotification,
    enqueueServerSync,
    markNotificationResolved,
    syncNotifications,
    formatVacancy,
  ]);

  useEffect(() => {
    if (!serverSyncEnabled) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;

    const handleEvent = (event: DeadlineEvent) => {
      const compositeKey = `${event.vacancyId}:${event.leadTimeId}`;
      triggeredRef.current.set(compositeKey, event.id);
      upsertNotification(event);
    };

    function scheduleReconnect(delay = 5_000) {
      if (cancelled || retryTimer) return;
      retryTimer = setTimeout(async () => {
        retryTimer = null;
        if (cancelled) return;
        if (authStatus !== "ready" || !authToken) {
          await waitForValidToken();
          if (cancelled) return;
        }
        connect();
      }, delay);
    }

    const connect = async () => {
      controller = new AbortController();
      try {
        let tokenForRequest = authToken;
        if (!tokenForRequest || authStatus !== "ready") {
          tokenForRequest = await waitForValidToken();
          if (cancelled) return;
        }
        const response = await fetch(resolveApiUrl("/api/deadlines/stream"), {
          headers: tokenForRequest ? { Authorization: `Bearer ${tokenForRequest}` } : undefined,
          signal: controller.signal,
        });
        if (response.status === 401) {
          dispatchAuthError("Unauthorized");
          controller?.abort();
          if (!cancelled) {
            await waitForValidToken();
            if (!cancelled) connect();
          }
          return;
        }
        if (!response.ok) {
          throw new Error(`Stream failed with status ${response.status}`);
        }
        if (!response.body) {
          throw new Error("Stream response missing body");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const parsed = parseSseChunk(chunk);
            if (parsed?.data) {
              try {
                const payload = JSON.parse(parsed.data) as DeadlineEvent;
                handleEvent(payload);
              } catch (err) {
                console.warn("Failed to parse deadline event", err);
              }
            }
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch (err) {
        if (!cancelled && !(controller?.signal.aborted)) {
          console.warn("Deadline stream disconnected", err);
          scheduleReconnect();
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      controller?.abort();
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };
  }, [
    authStatus,
    authToken,
    serverSyncEnabled,
    upsertNotification,
    waitForValidToken,
    dispatchAuthError,
    resolveApiUrl,
  ]);

  const latestNotification = useMemo(() => {
    return notifications.find((n) => !n.read) ?? null;
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return {
    notifications,
    latestNotification,
    unreadCount,
    acknowledgeNotification,
    acknowledgeAll,
  } as const;
}

export default useDeadlineMonitor;
