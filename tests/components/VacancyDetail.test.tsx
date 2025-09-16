import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VacancyDetail from "../../src/components/VacancyDetail";
import type { Vacancy } from "../../src/types";

const baseVacancy: Vacancy = {
  id: "vac-1",
  date: "2024-05-01",
  shiftDate: "2024-05-01",
  shiftStart: "07:00",
  shiftEnd: "15:00",
  reason: "Illness",
  classification: "RN",
  wing: "Shamrock",
  status: "Open",
  knownAt: "2024-04-30T12:00:00.000Z",
  offeringTier: "CASUALS",
  offeringRoundStartedAt: "2024-04-30T12:00:00.000Z",
  offeringRoundMinutes: 120,
  offeringAutoProgress: true,
  offeringStep: "Casuals",
};

describe("VacancyDetail", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("calls onUpdate when offering controls change", () => {
    vi.useFakeTimers();
    const handleUpdate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <VacancyDetail
        vacancy={baseVacancy}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        currentUser="tester"
      />,
    );

    const checkbox = screen.getByLabelText(/auto-advance/i);
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    fireEvent.click(checkbox);

    expect(handleUpdate).toHaveBeenCalled();
    expect(handleUpdate).toHaveBeenCalledWith(baseVacancy.id, {
      offeringAutoProgress: false,
    });
  });

  it("calls onDelete when the user confirms deletion", async () => {
    const handleUpdate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <VacancyDetail
        vacancy={baseVacancy}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />,
    );

    const [deleteButton] = screen.getAllByRole("button", {
      name: /delete vacancy/i,
    });
    fireEvent.click(deleteButton);

    const dialog = await screen.findByTestId("confirm-delete-modal");
    const confirmButton = within(dialog).getByRole("button", { name: /^delete$/i });
    fireEvent.click(confirmButton);

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(baseVacancy.id);
  });
});
