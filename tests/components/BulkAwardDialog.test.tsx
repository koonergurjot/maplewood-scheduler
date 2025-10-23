// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BulkAwardDialog from "../../src/components/BulkAwardDialog";
import type { Bid, Employee, Vacancy } from "../../src/types";

vi.mock("../../src/utils/logger", () => ({
  logBulkAward: vi.fn().mockResolvedValue(undefined),
}));

const employees: Employee[] = [
  {
    id: "e1",
    firstName: "Alice",
    lastName: "Admin",
    classification: "Registered Nurse",
    status: "FT",
    seniorityRank: 1,
    active: true,
    activeLabel: "Active",
  },
];

const bundleVacancies: Vacancy[] = [
  {
    id: "v1",
    reason: "Test",
    classification: "Registered Nurse",
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
    bundleId: "b1",
    bundleMode: "one-person",
  },
  {
    id: "v2",
    reason: "Test",
    classification: "Registered Nurse",
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
    bundleId: "b1",
    bundleMode: "one-person",
  },
];

const bids: Bid[] = [
  {
    vacancyId: "v1",
    bidderEmployeeId: "e1",
    bidderName: "Alice Admin",
    bidderStatus: "FT",
    bidderClassification: "Registered Nurse",
    bidTimestamp: "2024-01-01T12:00:00.000Z",
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BulkAwardDialog", () => {
  it("displays missing bundle days for the selected employee", () => {
    render(
      <BulkAwardDialog
        open
        employees={employees}
        vacancies={bundleVacancies}
        bids={bids}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const [employeeSelect] = screen.getAllByLabelText("Employee");
    fireEvent.change(employeeSelect, { target: { value: "e1" } });

    expect(screen.getByText("Bundle b1: 2024-01-02")).toBeTruthy();
  });

  it("requires override selection when bundle bids are missing", async () => {
    const onConfirm = vi.fn();

    render(
      <BulkAwardDialog
        open
        employees={employees}
        vacancies={bundleVacancies}
        bids={bids}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    const [employeeSelect] = screen.getAllByLabelText("Employee");
    fireEvent.change(employeeSelect, { target: { value: "e1" } });

    fireEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByText("Override required to award bundled days without matching bids."),
    ).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Override and award without matching bids"));
    fireEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Please select an override reason.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Override reason"), {
      target: { value: "Manager discretion" },
    });
    fireEvent.click(screen.getByText("Confirm"));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith({
      empId: "e1",
      reason: "Manager discretion",
      overrideUsed: true,
      message: undefined,
    });
  });
});
