import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OfflineBanner from "../OfflineBanner";
import {
  __resetOfflineQueueForTests,
  getOfflineStatus,
  queuedFetch,
  subscribeOfflineStatus,
} from "../../utils/offlineQueue";

describe("OfflineBanner", () => {
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

  it("displays while offline retries are pending and hides after sync", async () => {
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockRejectedValueOnce(new TypeError("Network error"))
      .mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    render(<OfflineBanner />);

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const offlineReached = new Promise<void>((resolve) => {
      const unsubscribe = subscribeOfflineStatus((status) => {
        if (status.isOffline) {
          unsubscribe();
          resolve();
        }
      });
    });

    let requestPromise: Promise<Response> | null = null;
    await act(async () => {
      requestPromise = queuedFetch("/api/test", { method: "POST", body: "{}" });
      await offlineReached;
      await Promise.resolve();
    });

    expect(getOfflineStatus().isOffline).toBe(true);
    expect(screen.queryByTestId("offline-banner")).not.toBeNull();

    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      await Promise.resolve();
    });
    await requestPromise;

    expect(screen.queryByTestId("offline-banner")).toBeNull();
  });
});
