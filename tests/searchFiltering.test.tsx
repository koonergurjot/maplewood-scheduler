// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenVacanciesRedesign from "../src/components/OpenVacanciesRedesign.tsx";
import type { Vacancy } from "../src/types";

vi.mock("../src/hooks/useVacancyFilters", async () => {
  return await import("../src/hooks/useVacancyFilters.ts");
});

const settings = {
  responseWindows: {
    lt2h: 60,
    h2to4: 120,
    h4to24: 240,
    h24to72: 720,
    gt72: 1440,
  },
};

const vacancies: Vacancy[] = [
  {
    id: "v1",
    reason: "Shift A",
    classification: "RN",
    wing: "Shamrock",
    date: "2024-01-01",
    start: "06:30",
    end: "14:30",
    shiftDate: "2024-01-01",
    shiftStart: "06:30",
    shiftEnd: "14:30",
    knownAt: "2024-01-01T00:00:00.000Z",
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
  },
  {
    id: "v2",
    reason: "Shift B",
    classification: "LPN",
    wing: "Rosewood",
    date: "2024-01-01",
    start: "14:30",
    end: "22:30",
    shiftDate: "2024-01-01",
    shiftStart: "14:30",
    shiftEnd: "22:30",
    knownAt: "2024-01-01T08:30:00.000Z",
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
  },
  {
    id: "v3",
    reason: "Shift C",
    classification: "RN",
    wing: "Bluebell",
    date: "2024-01-02",
    start: "22:30",
    end: "06:30",
    shiftDate: "2024-01-02",
    shiftStart: "22:30",
    shiftEnd: "06:30",
    knownAt: "2024-01-01T10:30:00.000Z",
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
  },
];

function renderComponent() {
  return render(
    <OpenVacanciesRedesign
      vacancies={vacancies}
      employees={[]}
      vacations={[]}
      settings={settings}
      selectedIds={[]}
      dueNextId={null}
      onToggleSelect={() => {}}
      onToggleSelectMany={() => {}}
      onDelete={() => {}}
      onDeleteMany={() => {}}
      awardVacancy={() => {}}
      resetKnownAt={() => {}}
      recommendations={{}}
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("OpenVacanciesRedesign filters", () => {
  it("filters by keyword", () => {
    renderComponent();
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "Shamrock" } });
    const table = screen.getByRole("table");
    expect(within(table).getByText("Shamrock")).toBeTruthy();
    expect(within(table).queryByText("Rosewood")).toBeNull();
  });

  it("filters by category", () => {
    renderComponent();
    const classDetails = screen.getByText("Classifications").closest("details")!;
    classDetails.open = true;
    fireEvent.click(within(classDetails).getByLabelText("RN"));
    const chip = screen.getByRole("button", { name: "Remove Class: RN" });
    expect(chip).toBeDefined();
  });

  it("filters by date range", () => {
    const { container } = renderComponent();
    const [start, end] = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="date"]'),
    ) as [HTMLInputElement, HTMLInputElement];
    fireEvent.change(start, { target: { value: "2024-01-02" } });
    const table = screen.getByRole("table");
    expect(within(table).queryByLabelText("Select vacancy v1")).toBeNull();
    fireEvent.change(end, { target: { value: "2024-01-01" } });
    expect(within(table).queryByLabelText("Select vacancy v3")).toBeNull();
  });

  it("filters by wing", () => {
    renderComponent();
    const wingDetails = screen.getByText("Wings").closest("details")!;
    wingDetails.open = true;
    fireEvent.click(within(wingDetails).getByLabelText("Rosewood"));
    const chip = screen.getByRole("button", { name: "Remove Wing: Rosewood" });
    expect(chip).toBeDefined();
  });

  it("filters by shift preset", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Night" }));
    const chip = screen.getByRole("button", { name: "Remove Shift: Night" });
    expect(chip).toBeDefined();
  });

  it("filters by bundle mode", () => {
    renderComponent();
    const bundlesButton = screen.getByRole("button", { name: "Bundles only" });
    fireEvent.click(bundlesButton);
    const chip = screen.getByRole("button", { name: "Remove Bundles only" });
    expect(chip).toBeDefined();
  });
});
