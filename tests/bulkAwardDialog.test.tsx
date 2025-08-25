// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import BulkAwardDialog from "../src/components/BulkAwardDialog";
import { OVERRIDE_REASONS, type Employee, type Vacancy } from "../src/App";

const employees: Employee[] = [
  {
    id: "e1",
    firstName: "Ann",
    lastName: "A",
    classification: "RN",
    status: "FT",
    seniorityRank: 1,
    active: true,
  },
  {
    id: "e2",
    firstName: "Bob",
    lastName: "B",
    classification: "LPN",
    status: "FT",
    seniorityRank: 2,
    active: true,
  },
];

const vacancies: Vacancy[] = [
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
  },
];

afterEach(() => cleanup());

describe("BulkAwardDialog", () => {
  it("blocks class mismatch without override", () => {
    const onConfirm = vi.fn();
    render(
      <BulkAwardDialog
        open
        employees={employees}
        vacancies={vacancies}
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Employee/), {
      target: { value: "e2" },
    });
    fireEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alert").textContent,
    ).toContain("Allow class override");
  });

  it("requires reason when override enabled", () => {
    const onConfirm = vi.fn();
    render(
      <BulkAwardDialog
        open
        employees={employees}
        vacancies={vacancies}
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Employee/), {
      target: { value: "e2" },
    });
    fireEvent.click(screen.getByLabelText(/Allow class override/));
    fireEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("override reason");
  });

  it("allows award with override and reason", () => {
    const onConfirm = vi.fn();
    render(
      <BulkAwardDialog
        open
        employees={employees}
        vacancies={vacancies}
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Employee/), {
      target: { value: "e2" },
    });
    fireEvent.click(screen.getByLabelText(/Allow class override/));
    fireEvent.change(screen.getByLabelText(/Override reason/), {
      target: { value: OVERRIDE_REASONS[0] },
    });
    fireEvent.click(screen.getByText("Confirm"));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        empId: "e2",
        reason: OVERRIDE_REASONS[0],
        overrideUsed: true,
      }),
    );
  });
});
