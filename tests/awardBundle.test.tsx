// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import App from "../src/App";

const LS_KEY = "maplewood-scheduler-v3";

const baseState = {
  employees: [
    {
      id: "e1",
      firstName: "Alice",
      lastName: "A",
      classification: "RN",
      status: "FT",
      seniorityRank: 1,
      active: true,
    },
  ],
  vacations: [],
  bids: [],
  settings: {},
};

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("bundle award", () => {
  test("awards all days when confirming", async () => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        ...baseState,
        vacancies: [
          {
            id: "v1",
            reason: "Test",
            classification: "RN",
            shiftDate: "2024-01-01",
            shiftStart: "08:00",
            shiftEnd: "16:00",
            knownAt: "2024-01-01T00:00:00.000Z",
            offeringTier: "CASUALS",
            offeringStep: "Casuals",
            status: "Open",
            bundleId: "b1",
            bundleMode: "one-person",
          },
          {
            id: "v2",
            reason: "Test",
            classification: "RN",
            shiftDate: "2024-01-02",
            shiftStart: "08:00",
            shiftEnd: "16:00",
            knownAt: "2024-01-01T00:00:00.000Z",
            offeringTier: "CASUALS",
            offeringStep: "Casuals",
            status: "Open",
            bundleId: "b1",
            bundleMode: "one-person",
          },
        ],
      }),
    );

    const confirmMock = vi
      .spyOn(window, "confirm")
      .mockImplementation(() => true);

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByLabelText("Group by bundle")[0]);

    const row = screen
      .getAllByRole("row")
      .find((r) => within(r).queryByText("Allow class override"))!;
    const input = within(row).getByPlaceholderText(/Type name or ID/);
    fireEvent.change(input, { target: { value: "Alice" } });
    const option = await screen.findByText(/Alice A/);
    fireEvent.click(option);
    fireEvent.click(within(row).getByText("Award"));

    expect(confirmMock).toHaveBeenCalledWith(
      "Award all days in this bundle to Alice A? (2 days)",
    );

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(LS_KEY)!);
      const statuses = stored.vacancies.map((v: any) => v.status);
      if (!statuses.every((s: string) => s === "Awarded")) {
        throw new Error("not yet");
      }
    });

    const stored = JSON.parse(localStorage.getItem(LS_KEY)!);
    const v1 = stored.vacancies.find((v: any) => v.id === "v1");
    const v2 = stored.vacancies.find((v: any) => v.id === "v2");
    expect(v1.status).toBe("Awarded");
    expect(v2.status).toBe("Awarded");
    expect(v1.awardedTo).toBe("e1");
    expect(v2.awardedTo).toBe("e1");
  });
});

