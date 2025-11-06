import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { useSchedulerBootstrap } from "./useSchedulerBootstrap";
import { TOKEN_KEY } from "../utils/api";
import { LS_KEY } from "../utils/storage";

const server = setupServer();

const baseState = {
  employees: [],
  vacations: [],
  vacancies: [],
  bids: [],
  archivedBids: {},
  settings: {
    responseWindows: {
      lt2h: 1,
      h2to4: 2,
      h4to24: 3,
      h24to72: 4,
      gt72: 5,
    },
  },
  vacancyRanges: [],
  updatedAt: "2024-01-01T00:00:00.000Z",
};

beforeAll(() => server.listen());

afterAll(() => server.close());

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  server.resetHandlers();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useSchedulerBootstrap", () => {
  it("hydrates from remote payload when available", async () => {
    const remoteUpdatedAt = "2024-02-01T10:00:00.000Z";
    window.localStorage.setItem(TOKEN_KEY, "test-token");
    window.localStorage.setItem(LS_KEY, JSON.stringify(baseState));

    server.use(
      http.get("/api/scheduler-state", () =>
        HttpResponse.json({
          version: 7,
          updatedAt: remoteUpdatedAt,
          state: { ...baseState, updatedAt: remoteUpdatedAt },
        }),
      ),
    );

    const { result } = renderHook(() => useSchedulerBootstrap());

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(result.current.persisted?.version).toBe(7);
    expect(result.current.persisted?.updatedAt).toBe(remoteUpdatedAt);
    expect(result.current.error).toBeNull();
  });

  it("falls back to local snapshot on 204", async () => {
    const localState = { ...baseState, version: 3 };
    window.localStorage.setItem(TOKEN_KEY, "test-token");
    window.localStorage.setItem(LS_KEY, JSON.stringify(localState));

    server.use(
      http.get("/api/scheduler-state", () => new HttpResponse(null, { status: 204 })),
    );

    const { result } = renderHook(() => useSchedulerBootstrap());

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(result.current.persisted).toMatchObject(localState);
    expect(result.current.error).toBeNull();
  });

  it("redirects to login on 401", async () => {
    window.localStorage.setItem(TOKEN_KEY, "test-token");
    const assignSpy = vi.fn();
    const originalLocation = window.location;
    const mockLocation = { ...(originalLocation as any) } as Location;
    (mockLocation as any).assign = assignSpy;
    Object.setPrototypeOf(mockLocation, Object.getPrototypeOf(originalLocation));
    Object.defineProperty(window, "location", {
      configurable: true,
      value: mockLocation,
    });

    server.use(
      http.get(
        "/api/scheduler-state",
        () => new HttpResponse(null, { status: 401 }),
      ),
    );

    try {
      renderHook(() => useSchedulerBootstrap());

      await waitFor(() => {
        expect(assignSpy).toHaveBeenCalledWith("/login");
      });
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });
});
