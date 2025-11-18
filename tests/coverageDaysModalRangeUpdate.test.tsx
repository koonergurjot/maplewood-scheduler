// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CoverageDaysModal from "../src/components/CoverageDaysModal";

describe("CoverageDaysModal", () => {
  it("rebuilds selections when the coverage range changes", () => {
    const onSave = vi.fn();

    const { rerender } = render(
      <CoverageDaysModal
        open
        startDate="2024-01-10"
        endDate="2024-01-10"
        defaultStart="08:00"
        defaultEnd="16:00"
        classification="Registered Nurse"
        initial={{
          selectedDates: ["2024-01-10"],
          perDayTimes: {
            "2024-01-10": { start: "09:00", end: "17:00" },
          },
          perDayWings: {
            "2024-01-10": "West",
          },
        }}
        onSave={onSave}
        onClose={() => {}}
      />,
    );

    onSave.mockReset();

    rerender(
      <CoverageDaysModal
        open
        startDate="2024-01-11"
        endDate="2024-01-12"
        defaultStart="08:00"
        defaultEnd="16:00"
        classification="Registered Nurse"
        initial={{
          perDayTimes: {
            "2024-01-11": { start: "09:00", end: "17:00" },
          },
          perDayWings: {
            "2024-01-11": "West",
          },
        }}
        onSave={onSave}
        onClose={() => {}}
      />,
    );

    const modal = screen.getByRole("dialog");
    const wingInputs = within(modal).getAllByPlaceholderText("Wing (optional)");
    expect(wingInputs).toHaveLength(2);

    fireEvent.click(within(modal).getByText("Save"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.selectedDates).toEqual(["2024-01-11", "2024-01-12"]);
    expect(payload.perDayTimes).toEqual({
      "2024-01-11": { start: "09:00", end: "17:00" },
      "2024-01-12": { start: "08:00", end: "16:00" },
    });
    expect(payload.perDayWings).toEqual({
      "2024-01-11": "West",
      "2024-01-12": "",
    });
    expect(payload.perDayTimes).not.toHaveProperty("2024-01-10");
    expect(payload.perDayWings).not.toHaveProperty("2024-01-10");
  });
});

