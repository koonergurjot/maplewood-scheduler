import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import RangeBidDialog from "../RangeBidDialog";
import type { VacancyRange, Employee } from "../../types";

describe("RangeBidDialog", () => {
  const employees: Employee[] = [
    {
      id: "emp-1",
      firstName: "Ada",
      lastName: "Lovelace",
      classification: "RN",
      status: "FT",
      seniorityRank: 1,
      active: true,
      activeLabel: "Active",
    },
    {
      id: "emp-2",
      firstName: "Grace",
      lastName: "Hopper",
      classification: "RN",
      status: "FT",
      seniorityRank: 2,
      active: true,
      activeLabel: "Active",
    },
  ];

  const baseRange: VacancyRange = {
    id: "range-1",
    reason: "Vacation",
    classification: "RN",
    startDate: "2025-01-01",
    endDate: "2025-01-03",
    knownAt: "2024-12-01T00:00:00Z",
    workingDays: ["2025-01-01", "2025-01-02", "2025-01-03"],
    shiftStart: "06:30",
    shiftEnd: "14:30",
    offeringStep: "Casuals",
    status: "Open",
    awardAsBlock: true,
  };

  it("resets form values when the range id changes while open", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <RangeBidDialog
        open
        onClose={onClose}
        range={baseRange}
        employees={employees}
        onSubmit={onSubmit}
      />,
    );

    let dialogs = screen.getAllByRole("dialog");
    let dialog = dialogs[dialogs.length - 1];
    let withinDialog = within(dialog);

    fireEvent.change(withinDialog.getByRole("combobox"), {
      target: { value: "emp-2" },
    });
    fireEvent.click(withinDialog.getByLabelText(/partial-day/i));
    fireEvent.click(withinDialog.getByLabelText("2025-01-01"));
    fireEvent.change(withinDialog.getByPlaceholderText(/add context/i), {
      target: { value: "Original note" },
    });

    const newRange: VacancyRange = {
      ...baseRange,
      id: "range-2",
      workingDays: ["2025-02-01", "2025-02-02"],
    };

    rerender(
      <RangeBidDialog
        open
        onClose={onClose}
        range={newRange}
        employees={employees}
        onSubmit={onSubmit}
      />,
    );

    dialogs = screen.getAllByRole("dialog");
    dialog = dialogs[dialogs.length - 1];
    withinDialog = within(dialog);

    expect(
      (withinDialog.getByRole("combobox") as HTMLSelectElement).value,
    ).toBe("");
    expect(
      (withinDialog.getByLabelText(/entire vacancy/i) as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (withinDialog.getByLabelText(/some days only/i) as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (withinDialog.getByLabelText(/partial-day/i) as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (
        withinDialog.getByPlaceholderText(
          /add context/i,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe("");

    fireEvent.click(withinDialog.getByLabelText(/some days only/i));
    expect(
      (withinDialog.getByLabelText("2025-02-01") as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (withinDialog.getByLabelText("2025-02-02") as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("shows validation when partial coverage is submitted with no selected days", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <RangeBidDialog
        open
        onClose={onClose}
        range={baseRange}
        employees={employees}
        onSubmit={onSubmit}
      />,
    );

    const dialogs = screen.getAllByRole("dialog");
    const dialog = dialogs[dialogs.length - 1];
    const withinDialog = within(dialog);

    fireEvent.change(withinDialog.getByRole("combobox"), {
      target: { value: "emp-1" },
    });
    fireEvent.click(withinDialog.getByLabelText(/some days only/i));
    fireEvent.click(withinDialog.getByLabelText("2025-01-01"));
    fireEvent.click(withinDialog.getByLabelText("2025-01-02"));
    fireEvent.click(withinDialog.getByLabelText("2025-01-03"));

    expect(
      withinDialog.getByText(/select at least one working day/i),
    ).toBeTruthy();

    fireEvent.click(withinDialog.getByText(/submit bid/i));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(withinDialog.getByLabelText("2025-01-01"));
    expect(
      withinDialog.queryByText(/select at least one working day/i),
    ).toBeNull();
  });
});
