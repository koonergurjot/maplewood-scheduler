// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OpenVacanciesRedesign from "../../src/components/OpenVacanciesRedesign";
import type { Settings, Vacancy } from "../../src/types";

vi.mock("../../src/hooks/useVacancyFilters", async () => {
  const actual = await vi.importActual<typeof import("../../src/hooks/useVacancyFilters")>(
    "../../src/hooks/useVacancyFilters",
  );
  return actual;
});

const settings: Settings = {
  responseWindows: {
    lt2h: 0,
    h2to4: 0,
    h4to24: 0,
    h24to72: 0,
    gt72: 0,
  },
};

const dayVacancies: Vacancy[] = [
  {
    id: "vac-1",
    reason: "Day One",
    classification: "RN",
    wing: "North",
    date: "2024-05-01",
    start: "08:00",
    end: "16:00",
    shiftDate: "2024-05-01",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: "2024-04-01T00:00:00.000Z",
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
  },
  {
    id: "vac-2",
    reason: "Day Two",
    classification: "RN",
    wing: "North",
    date: "2024-05-01",
    start: "10:00",
    end: "18:00",
    shiftDate: "2024-05-01",
    shiftStart: "10:00",
    shiftEnd: "18:00",
    knownAt: "2024-04-01T00:00:00.000Z",
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
  },
];

describe("OpenVacanciesRedesign date group selection", () => {
  it("toggles all vacancies for the day", () => {
    const onToggleSelectMany = vi.fn();

    const { rerender } = render(
      <OpenVacanciesRedesign
        vacancies={dayVacancies}
        employees={[]}
        vacations={[]}
        settings={settings}
        selectedIds={[]}
        dueNextId={null}
        onToggleSelect={() => {}}
        onToggleSelectMany={onToggleSelectMany}
        onDelete={() => {}}
        onDeleteMany={() => {}}
        awardVacancy={() => {}}
        resetKnownAt={() => {}}
        recommendations={{}}
      />,
    );

    const selectAllButton = screen.getByRole("button", {
      name: /select all vacancies for/i,
    });
    expect(selectAllButton.textContent).toContain("Select all");

    fireEvent.click(selectAllButton);
    expect(onToggleSelectMany).toHaveBeenCalledWith(["vac-1", "vac-2"]);

    rerender(
      <OpenVacanciesRedesign
        vacancies={dayVacancies}
        employees={[]}
        vacations={[]}
        settings={settings}
        selectedIds={["vac-1", "vac-2"]}
        dueNextId={null}
        onToggleSelect={() => {}}
        onToggleSelectMany={onToggleSelectMany}
        onDelete={() => {}}
        onDeleteMany={() => {}}
        awardVacancy={() => {}}
        resetKnownAt={() => {}}
        recommendations={{}}
      />,
    );

    const clearButton = screen.getByRole("button", {
      name: /clear selections for/i,
    });
    expect(clearButton.textContent).toContain("Clear");

    fireEvent.click(clearButton);
    expect(onToggleSelectMany).toHaveBeenCalledWith(["vac-1", "vac-2"]);
  });
});
