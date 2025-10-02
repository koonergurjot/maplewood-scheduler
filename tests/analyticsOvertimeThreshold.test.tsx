// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

const mockAuthFetch = vi.fn();

vi.mock("../src/utils/api", () => ({
  authFetch: (...args: any[]) => mockAuthFetch(...args),
  setToken: vi.fn(),
}));

vi.mock("react-chartjs-2", () => ({
  Bar: () => null,
  Line: () => null,
}));

// Import after mocks so they take effect.
import Analytics from "../src/Analytics";
import { ApiAuthProvider } from "../src/state/apiAuth";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
let anchorClickSpy: { mockRestore: () => void } | null = null;

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:url");
  URL.revokeObjectURL = vi.fn();
  anchorClickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
});

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  anchorClickSpy?.mockRestore();
});

beforeEach(() => {
  mockAuthFetch.mockReset();
  mockAuthFetch.mockImplementation((url: unknown) => {
    if (typeof url === "string" && url.startsWith("/api/analytics/export")) {
      return Promise.resolve({
        blob: async () => new Blob([]),
      });
    }
    return Promise.resolve({
      json: async () => [],
    });
  });
  localStorage.setItem("apiToken", "test-token");
});

afterEach(() => {
  localStorage.clear();
});

test("forwards overtimeThreshold to analytics requests", async () => {
  render(
    <ApiAuthProvider>
      <Analytics />
    </ApiAuthProvider>,
  );

  await waitFor(() => expect(mockAuthFetch).toHaveBeenCalledTimes(1));
  expect(mockAuthFetch.mock.calls[0][0]).toContain("overtimeThreshold=8");

  mockAuthFetch.mockClear();

  const input = screen.getByLabelText(/overtime threshold/i);
  fireEvent.change(input, { target: { value: "12" } });

  await waitFor(() => expect(mockAuthFetch).toHaveBeenCalledTimes(1));
  expect(mockAuthFetch.mock.calls[0][0]).toContain("overtimeThreshold=12");

  mockAuthFetch.mockClear();

  fireEvent.click(screen.getByText("Export CSV"));

  await waitFor(() => expect(mockAuthFetch).toHaveBeenCalledTimes(1));
  const exportUrl = mockAuthFetch.mock.calls[0][0];
  expect(exportUrl).toContain("format=csv");
  expect(exportUrl).toContain("overtimeThreshold=12");
});
