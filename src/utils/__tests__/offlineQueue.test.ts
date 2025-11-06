import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetOfflineQueueForTests,
  getOfflineStatus,
  queuedFetch,
  subscribeOfflineStatus,
} from "../offlineQueue";

describe("offline queue", () => {
  const originalFetch = global.fetch;
  const originalOnLine = Object.getOwnPropertyDescriptor(
    window.navigator,
    "onLine",
  );

  beforeEach(() => {
    vi.useFakeTimers();
    __resetOfflineQueueForTests();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    if (originalOnLine) {
      Object.defineProperty(window.navigator, "onLine", originalOnLine);
    } else {
      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        get: () => true,
      });
    }
  });

  const waitForOffline = () =>
    new Promise<void>((resolve) => {
      const unsubscribe = subscribeOfflineStatus((status) => {
        if (status.isOffline) {
          unsubscribe();
          resolve();
        }
      });
    });

  const waitForOnline = () =>
    new Promise<void>((resolve) => {
      const unsubscribe = subscribeOfflineStatus((status) => {
        if (!status.isOffline) {
          unsubscribe();
          resolve();
        }
      });
    });

  it("retries failed requests with exponential backoff and clears after success", async () => {
    const responses: Array<() => Promise<Response>> = [
      () => Promise.reject(new TypeError("Network error")),
      () => Promise.reject(new TypeError("Network error")),
      () => Promise.resolve(new Response(null, { status: 200 })),
    ];
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockImplementation(() => {
        const next = responses.shift();
        return next ? next() : Promise.resolve(new Response(null, { status: 200 }));
      });
    global.fetch = fetchMock as typeof fetch;

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const offlineReached = waitForOffline();
    const requestPromise = queuedFetch("/api/test", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
    });

    await offlineReached;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getOfflineStatus().isOffline).toBe(true);
    expect(getOfflineStatus().nextRetryInMs).toBe(1_000);

    await vi.advanceTimersByTimeAsync(1_000);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getOfflineStatus().nextRetryInMs).toBe(2_000);

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    await vi.advanceTimersByTimeAsync(2_000);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await requestPromise;
    expect(getOfflineStatus().isOffline).toBe(false);
    expect(getOfflineStatus().nextRetryInMs).toBeNull();
  });

  it("flushes queued requests immediately when the browser comes back online", async () => {
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const offlineReached = waitForOffline();
    const requestPromise = queuedFetch("/api/test", { method: "POST", body: "{}" });

    await offlineReached;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getOfflineStatus().isOffline).toBe(true);

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    const onlineResolved = waitForOnline();
    window.dispatchEvent(new Event("online"));

    await onlineResolved;
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await requestPromise;
    expect(getOfflineStatus().isOffline).toBe(false);
  });
});
