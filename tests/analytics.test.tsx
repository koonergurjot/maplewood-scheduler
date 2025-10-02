// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { vi, expect, test, afterEach, beforeEach } from "vitest";
import Analytics from "../src/Analytics";
import { ApiAuthProvider } from "../src/state/apiAuth";
import { minutesBetween } from "../src/lib/dates";

// Mock chart components to avoid canvas requirement
vi.mock("react-chartjs-2", () => ({
  Bar: () => null,
  Line: () => null,
}));

const originalFetch = global.fetch;

beforeEach(() => {
  localStorage.setItem("apiToken", "test-token");
});

afterEach(() => {
  global.fetch = originalFetch;
  localStorage.clear();
});

test("loading indicator disappears after fetch abort", async () => {
  global.fetch = vi.fn(() =>
    Promise.reject(Object.assign(new Error("Aborted"), { name: "AbortError" })),
  ) as any;

  render(
    <ApiAuthProvider>
      <Analytics />
    </ApiAuthProvider>,
  );

  await waitFor(() => {
    expect(screen.queryByText("Loading...")).toBeNull();
  });
});

test("minutesBetween returns 60 regardless of argument order", () => {
  const earlier = new Date("2024-01-01T00:00");
  const later = new Date("2024-01-01T01:00");
  expect(minutesBetween(earlier, later)).toBe(60);
  expect(minutesBetween(later, earlier)).toBe(60);
});
