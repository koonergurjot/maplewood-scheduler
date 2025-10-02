import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { ApiAuthProvider, useApiAuth } from "../state/apiAuth";
import { authFetch } from "../utils/api";

describe("ApiAuthProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("attaches the bearer token to authenticated requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useApiAuth(), { wrapper: ApiAuthProvider });

    act(() => {
      result.current.setToken("test-token");
    });

    await authFetch("/api/example");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(fetchInit?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("reports unauthorized responses through context", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("Unauthorized", { status: 401, headers: { "Content-Type": "text/plain" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useApiAuth(), { wrapper: ApiAuthProvider });

    await expect(authFetch("/api/protected")).rejects.toThrowError();

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("waits for credentials before resolving", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useApiAuth(), { wrapper: ApiAuthProvider });

    const waiter = result.current.waitForValidToken();
    let resolvedValue: string | null = null;
    waiter.then((value) => {
      resolvedValue = value;
    });

    await Promise.resolve();
    expect(resolvedValue).toBeNull();

    act(() => {
      result.current.setToken("retry-token");
    });

    await expect(waiter).resolves.toBe("retry-token");
    expect(resolvedValue).toBe("retry-token");
    expect(result.current.status).toBe("ready");
  });
});
