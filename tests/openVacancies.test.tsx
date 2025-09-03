// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OpenVacancies from "../src/components/OpenVacancies";
import useVacancies from "../src/state/useVacancies";

const LS_KEY = "maplewood-scheduler-v3";

function setupLocalStorage(vacancies: any[] = [], auditLog: any[] = []) {
  localStorage.setItem(LS_KEY, JSON.stringify({ vacancies, auditLog }));
}

describe("OpenVacancies", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders delete buttons with tooltip", () => {
    const vacancies = [
      {
        id: "v1",
        classification: "RN",
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
        classification: "LPN",
        shiftDate: "2024-01-02",
        shiftStart: "08:00",
        shiftEnd: "16:00",
        knownAt: "2024-01-02T00:00:00.000Z",
        offeringTier: "CASUALS",
        offeringStep: "Casuals",
        status: "Open",
      },
    ];
    setupLocalStorage(vacancies);

    let vacState: ReturnType<typeof useVacancies>;
    function Wrapper() {
      vacState = useVacancies();
      return <OpenVacancies {...vacState} />;
    }

    render(<Wrapper />);

    const buttons = screen.getAllByTitle("Delete vacancy");
    expect(buttons).toHaveLength(2);
  });

  it("bulk deletes vacancies and records audit log", async () => {
    vi.useFakeTimers();
    const vacancies = [
      {
        id: "v1",
        classification: "RN",
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
        classification: "LPN",
        shiftDate: "2024-01-02",
        shiftStart: "08:00",
        shiftEnd: "16:00",
        knownAt: "2024-01-02T00:00:00.000Z",
        offeringTier: "CASUALS",
        offeringStep: "Casuals",
        status: "Open",
      },
    ];
    setupLocalStorage(vacancies);

    let vacState: ReturnType<typeof useVacancies>;
    function Wrapper() {
      vacState = useVacancies();
      return <OpenVacancies {...vacState} />;
    }

    render(<Wrapper />);

    fireEvent.click(screen.getAllByLabelText("Select all vacancies")[0]);
    fireEvent.click(screen.getByTestId("vacancy-delete-selected"));

    expect(screen.getByTestId("confirm-delete-modal")).toBeTruthy();
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByTestId("undo-delete-toast")).toBeTruthy();

    vi.runAllTimers();

    const persisted = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    expect(persisted.auditLog).toHaveLength(1);
    expect(persisted.auditLog[0].payload.vacancyIds.sort()).toEqual([
      "v1",
      "v2",
    ]);
    expect(persisted.auditLog[0].payload.userAction).toBe("bulk");

    vi.useRealTimers();
  });
});

