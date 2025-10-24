// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OpenVacanciesRedesign from "../../src/components/OpenVacanciesRedesign";
import { deadlineFor } from "../../src/lib/vacancy";
import type { Settings, Vacancy } from "../../src/types";
import * as vacancyFiltersHook from "../../src/hooks/useVacancyFilters";

type VacancyFiltersState = ReturnType<typeof vacancyFiltersHook.useVacancyFilters>;

const baseSettings: Settings = {
  responseWindows: {
    lt2h: 30,
    h2to4: 45,
    h4to24: 120,
    h24to72: 240,
    gt72: 480,
  },
};

const baseVacancy: Vacancy = {
  id: "vac-1",
  reason: "Expiring Shift",
  classification: "Registered Nurse",
  wing: "North",
  date: "2024-01-01",
  start: "06:00",
  end: "14:00",
  shiftDate: "2024-01-01",
  shiftStart: "06:00",
  shiftEnd: "14:00",
  knownAt: "2024-01-01T00:00:00.000Z",
  offeringTier: "CASUALS",
  offeringStep: "Casuals",
  status: "Open",
};

function createMockFilters(
  overrides: Partial<VacancyFiltersState> = {},
): VacancyFiltersState {
  return {
    selectedWings: [],
    setSelectedWings: vi.fn(),
    selectedPositions: [],
    setSelectedPositions: vi.fn(),
    filterShift: "",
    setFilterShift: vi.fn(),
    countdown: "",
    setCountdown: vi.fn(),
    start: "",
    setStart: vi.fn(),
    end: "",
    setEnd: vi.fn(),
    search: "",
    setSearch: vi.fn(),
    bundleMode: "all",
    setBundleMode: vi.fn(),
    filtersOpen: false,
    setFiltersOpen: vi.fn(),
    resetFilters: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("OpenVacanciesRedesign countdown updates", () => {
  it("re-runs countdown filters when the current time advances", () => {
    const filtersSpy = vi
      .spyOn(vacancyFiltersHook, "useVacancyFilters")
      .mockReturnValue(createMockFilters({ countdown: "red" }));

    const deadline = deadlineFor(baseVacancy, baseSettings).getTime();

    const { rerender } = render(
      <OpenVacanciesRedesign
        vacancies={[baseVacancy]}
        employees={[]}
        vacations={[]}
        settings={baseSettings}
        now={deadline - 1000}
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

    expect(screen.queryByLabelText("Select vacancy vac-1")).toBeNull();

    rerender(
      <OpenVacanciesRedesign
        vacancies={[baseVacancy]}
        employees={[]}
        vacations={[]}
        settings={baseSettings}
        now={deadline + 1000}
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

    expect(screen.getByLabelText("Select vacancy vac-1")).toBeTruthy();
    expect(filtersSpy).toHaveBeenCalled();
  });

  it("recomputes countdown buckets when response windows change", () => {
    const baseNow = new Date("2024-01-01T00:30:00.000Z").getTime();
    const filtersSpy = vi
      .spyOn(vacancyFiltersHook, "useVacancyFilters")
      .mockReturnValue(createMockFilters({ countdown: "yellow" }));

    const wideSettings: Settings = {
      responseWindows: {
        lt2h: 30,
        h2to4: 45,
        h4to24: 120,
        h24to72: 240,
        gt72: 480,
      },
    };

    const tightSettings: Settings = {
      responseWindows: {
        lt2h: 30,
        h2to4: 45,
        h4to24: 34,
        h24to72: 240,
        gt72: 480,
      },
    };

    const { rerender } = render(
      <OpenVacanciesRedesign
        vacancies={[baseVacancy]}
        employees={[]}
        vacations={[]}
        settings={wideSettings}
        now={baseNow}
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

    expect(screen.queryByLabelText("Select vacancy vac-1")).toBeNull();

    rerender(
      <OpenVacanciesRedesign
        vacancies={[baseVacancy]}
        employees={[]}
        vacations={[]}
        settings={tightSettings}
        now={baseNow}
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

    expect(screen.getByLabelText("Select vacancy vac-1")).toBeTruthy();
    expect(filtersSpy).toHaveBeenCalled();
  });
});
