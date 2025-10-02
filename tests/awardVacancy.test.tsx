// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App, { OVERRIDE_REASONS } from "../src/App";
import { ApiAuthProvider } from "../src/state/apiAuth";

const LS_KEY = "maplewood-scheduler-v3";

const baseState = {
  employees: [
    { id: "e1", firstName: "Alice", lastName: "A", classification: "RN", status: "FT", seniorityRank: 1, active: true },
    { id: "e2", firstName: "Bob", lastName: "B", classification: "LPN", status: "PT", seniorityRank: 2, active: true },
  ],
  vacations: [],
  bids: [],
  settings: {},
};

beforeEach(() => {
  localStorage.setItem("apiToken", "test-token");
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("award vacancy UI", () => {
  test("bulk awards selected vacancies with identical details", async () => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        ...baseState,
        vacancies: [
          {
            id: "v1",
            reason: "Test",
            classification: "RN",
            date: "2024-01-01",
            start: "08:00",
            end: "16:00",
            shiftDate: "2024-01-01",
            shiftStart: "08:00",
            shiftEnd: "16:00",
            knownAt: "2024-01-01T00:00:00.000Z",
            offeringTier: "CASUALS",
            offeringStep: "Casuals",
            status: "Open",
          },
          {
            id: "v2",
            reason: "Test",
            classification: "RN",
            date: "2024-01-02",
            start: "08:00",
            end: "16:00",
            shiftDate: "2024-01-02",
            shiftStart: "08:00",
            shiftEnd: "16:00",
            knownAt: "2024-01-01T00:00:00.000Z",
            offeringTier: "CASUALS",
            offeringStep: "Casuals",
            status: "Open",
          },
        ],
      }),
    );

    render(
      <ApiAuthProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </ApiAuthProvider>,
    );

    const rows = screen
      .getAllByRole("row")
      .filter((r) => within(r).queryByRole("checkbox"));
    const cb1 = within(rows[0]).getByRole("checkbox");
    const cb2 = within(rows[1]).getByRole("checkbox");
    fireEvent.click(cb1);
    fireEvent.click(cb2);

    await waitFor(() => screen.getByText("Bulk Award"));
    fireEvent.click(screen.getByText("Bulk Award"));

    fireEvent.change(screen.getByLabelText("Employee"), {
      target: { value: "e1" },
    });
    const reason = OVERRIDE_REASONS[0];
    fireEvent.change(screen.getByLabelText("Override reason"), {
      target: { value: reason },
    });

    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(LS_KEY)!);
      const v1 = stored.vacancies.find((v: any) => v.id === "v1");
      if (v1?.status !== "Awarded") throw new Error("not yet");
    });

    const stored = JSON.parse(localStorage.getItem(LS_KEY)!);
    const v1 = stored.vacancies.find((v: any) => v.id === "v1");
    const v2 = stored.vacancies.find((v: any) => v.id === "v2");
    expect(v1.status).toBe("Awarded");
    expect(v2.status).toBe("Awarded");
    expect(v1.awardedTo).toBe("e1");
    expect(v2.awardedTo).toBe("e1");
    expect(v1.awardReason).toBe(reason);
    expect(v2.awardReason).toBe(reason);
  });

  test("requires reason when overriding", async () => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        ...baseState,
        vacancies: [
          {
            id: "v1",
            reason: "Test",
            classification: "RN",
            date: "2024-01-01",
            start: "08:00",
            end: "16:00",
            shiftDate: "2024-01-01",
            shiftStart: "08:00",
            shiftEnd: "16:00",
            knownAt: "2024-01-01T00:00:00.000Z",
            offeringTier: "CASUALS",
            offeringStep: "Casuals",
            status: "Open",
          },
        ],
      }),
    );

    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <ApiAuthProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </ApiAuthProvider>,
    );

    const row = screen
      .getAllByRole("row")
      .filter((r) => within(r).queryByRole("checkbox"))[0];
    fireEvent.click(within(row).getByText("Award"));
    const input = within(row).getByPlaceholderText(/Type name or ID/);
    fireEvent.change(input, { target: { value: "Bob" } });
    const option = (await screen.findAllByText(/Bob B/))[0];
    fireEvent.click(option);

    fireEvent.click(within(row).getByLabelText("Allow class override"));

    fireEvent.click(within(row).getByText("Confirm Award"));

    expect(alertMock).toHaveBeenCalledWith(
      "Please select a reason for this override.",
    );
  });
});
