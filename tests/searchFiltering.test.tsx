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
  localStorage.removeItem("openVacancyFilters");
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
    const dropdown = screen.getByRole("button", { name: "Classifications" });
    fireEvent.click(dropdown);
    fireEvent.click(screen.getByRole("option", { name: "RN" }));
    const table = screen.getByRole("table");
    expect(within(table).getByText("Shamrock")).toBeTruthy();
    expect(within(table).getByText("Bluebell")).toBeTruthy();
    expect(within(table).queryByText("Rosewood")).toBeNull();
  });

  it("filters by date range", () => {
    const { container } = renderComponent();
    const [start, end] = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="date"]'),
    ) as [HTMLInputElement, HTMLInputElement];
    fireEvent.change(start, { target: { value: "2024-01-02" } });
    const table = screen.getByRole("table");
    expect(within(table).queryByText("Shamrock")).toBeNull();
    expect(within(table).getByText("Bluebell")).toBeTruthy();
    fireEvent.change(end, { target: { value: "2024-01-01" } });
    expect(within(table).queryByText("Bluebell")).toBeNull();
  });

  it("filters by wing", () => {
    renderComponent();
    const dropdown = screen.getByRole("button", { name: "Wings" });
    fireEvent.click(dropdown);
    fireEvent.click(screen.getByRole("option", { name: "Rosewood" }));
    const table = screen.getByRole("table");
    expect(within(table).getByText("Rosewood")).toBeTruthy();
    expect(within(table).queryByText("Shamrock")).toBeNull();
    expect(within(table).queryByText("Bluebell")).toBeNull();
  });

  it("filters by shift preset", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Night" }));
    const table = screen.getByRole("table");
    expect(within(table).getByText("Bluebell")).toBeTruthy();
    expect(within(table).queryByText("Shamrock")).toBeNull();
    expect(within(table).queryByText("Rosewood")).toBeNull();
  });

  it("filters by countdown status", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Red" }));
    let table = screen.getByRole("table");
    expect(within(table).getByText("Shamrock")).toBeTruthy();
    expect(within(table).queryByText("Rosewood")).toBeNull();
    expect(within(table).queryByText("Bluebell")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Yellow" }));
    table = screen.getByRole("table");
    expect(within(table).getByText("Rosewood")).toBeTruthy();
    expect(within(table).queryByText("Shamrock")).toBeNull();
    expect(within(table).queryByText("Bluebell")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Green" }));
    table = screen.getByRole("table");
    expect(within(table).getByText("Bluebell")).toBeTruthy();
    expect(within(table).queryByText("Shamrock")).toBeNull();
    expect(within(table).queryByText("Rosewood")).toBeNull();
  });
});

