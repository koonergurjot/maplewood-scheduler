// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OpenVacanciesRedesign from "../src/components/OpenVacanciesRedesign.tsx";

vi.mock("../src/hooks/useVacancyFilters", async () => {
  return await import("../src/hooks/useVacancyFilters.ts");
});

const settings = {
  responseWindows: {
    lt2h: 0,
    h2to4: 0,
    h4to24: 0,
    h24to72: 0,
    gt72: 0,
  },
};

const vacancies = [
  {
    id: "v1",
    reason: "Shift A",
    classification: "RN",
    wing: "Alpha",
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
  },
  {
    id: "v2",
    reason: "Shift B",
    classification: "LPN",
    wing: "Beta",
    date: "2024-02-01",
    start: "08:00",
    end: "16:00",
    shiftDate: "2024-02-01",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: "2024-01-01T00:00:00.000Z",
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

afterEach(cleanup);

describe("OpenVacanciesRedesign filters", () => {
  it("filters by keyword", () => {
    renderComponent();
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "Alpha" } });
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.queryByText("Beta")).toBeNull();
  });

  it("filters by category", () => {
    renderComponent();
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "RN" } });
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.queryByText("Beta")).toBeNull();
  });

  it("filters by date range", () => {
    const { container } = renderComponent();
    const [start, end] = container.querySelectorAll('input[type="date"]');
    fireEvent.change(start, { target: { value: "2024-01-15" } });
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(screen.getByText("Beta")).toBeTruthy();
    fireEvent.change(end, { target: { value: "2024-01-31" } });
    expect(screen.queryByText("Beta")).toBeNull();
  });
});

