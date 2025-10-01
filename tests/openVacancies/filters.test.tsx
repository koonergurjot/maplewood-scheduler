// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OpenVacanciesRedesign from "../../src/components/OpenVacanciesRedesign";
import type { Vacancy } from "../../src/types";

vi.mock("../../src/hooks/useVacancyFilters", async () => {
  const actual = await vi.importActual<typeof import("../../src/hooks/useVacancyFilters")>(
    "../../src/hooks/useVacancyFilters",
  );
  return actual;
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

const vacancies: Vacancy[] = [
  {
    id: "bundle-1",
    bundleId: "bundle-a",
    reason: "Bundled Day 1",
    classification: "RN",
    wing: "Bundle Wing",
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
    id: "bundle-2",
    bundleId: "bundle-a",
    reason: "Bundled Day 2",
    classification: "RN",
    wing: "Bundle Wing",
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
  },
  {
    id: "single-1",
    reason: "Single Day",
    classification: "LPN",
    wing: "Single Wing",
    date: "2024-01-03",
    start: "08:00",
    end: "16:00",
    shiftDate: "2024-01-03",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: "2024-01-01T00:00:00.000Z",
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
  },
];

function renderComponent(filters?: { bundlesOnly?: boolean; singlesOnly?: boolean }) {
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
      filters={filters}
    />,
  );
}

afterEach(cleanup);

describe("OpenVacanciesRedesign bundle filters", () => {
  it("filters to bundled vacancies when bundlesOnly is true", () => {
    renderComponent({ bundlesOnly: true });

    expect(screen.getByText("Bundled Vacancies")).toBeTruthy();
    expect(screen.queryByText("Single Wing")).toBeNull();
  });

  it("filters to single vacancies when singlesOnly is true", () => {
    renderComponent({ singlesOnly: true });

    expect(screen.getByText("Single Wing")).toBeTruthy();
    expect(screen.queryByText("Bundled Vacancies")).toBeNull();
    expect(screen.queryByText("2 days")).toBeNull();
  });
});
