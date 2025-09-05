// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
            shiftDate: "2024-01-01",
            shiftStart: "16:00",
            shiftEnd: "23:00",
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

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    screen
      .getAllByLabelText("Group by bundle")
      .forEach((cb) => fireEvent.click(cb));

    const awardBtn = await screen.findByText("Award Bundle");
    fireEvent.click(awardBtn);

    const pick = await screen.findByRole("button", { name: /Alice A/ });
    fireEvent.click(pick);

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

  test("prompts on conflicts and allows override with reason", async () => {
    const reason = "Manager discretion";
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "prompt").mockReturnValue(reason);

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
            shiftDate: "2024-01-01",
            shiftStart: "16:00",
            shiftEnd: "23:00",
            knownAt: "2024-01-01T00:00:00.000Z",
            offeringTier: "CASUALS",
            offeringStep: "Casuals",
            status: "Open",
            bundleId: "b1",
            bundleMode: "one-person",
          },
          {
            id: "c1",
            reason: "Existing",
            classification: "RN",
            shiftDate: "2024-01-01",
            shiftStart: "08:00",
            shiftEnd: "16:00",
            knownAt: "2024-01-01T00:00:00.000Z",
            offeringTier: "CASUALS",
            offeringStep: "Casuals",
            status: "Awarded",
            awardedTo: "e1",
          },
        ],
      }),
    );

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    screen
      .getAllByLabelText("Group by bundle")
      .forEach((cb) => fireEvent.click(cb));

    const awardBtn = await screen.findByText("Award Bundle");
    fireEvent.click(awardBtn);

    const pick = await screen.findByRole("button", { name: /Alice A/ });
    fireEvent.click(pick);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(LS_KEY)!);
      const statuses = stored.vacancies
        .filter((v: any) => v.bundleId === "b1")
        .map((v: any) => v.status);
      if (!statuses.every((s: string) => s === "Awarded")) {
        throw new Error("not yet");
      }
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(window.prompt).toHaveBeenCalled();

    const stored = JSON.parse(localStorage.getItem(LS_KEY)!);
    const v1 = stored.vacancies.find((v: any) => v.id === "v1");
    const v2 = stored.vacancies.find((v: any) => v.id === "v2");
    expect(v1.awardReason).toBe(reason);
    expect(v2.awardReason).toBe(reason);
  });
});

