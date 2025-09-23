// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from "@testing-library/react";
import VacancyRow from "../../src/components/VacancyRow";
import BundleRow from "../../src/components/BundleRow";
import type { Vacancy, Employee, Settings } from "../../src/types";
import type { Recommendation } from "../../src/recommend";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

describe("Recommendation cycling", () => {
  const employees: Employee[] = [
    {
      id: "emp-1",
      firstName: "Alice",
      lastName: "Alpha",
      classification: "RN",
      status: "FT",
      seniorityRank: 1,
      active: true,
    },
    {
      id: "emp-2",
      firstName: "Bob",
      lastName: "Beta",
      classification: "RN",
      status: "FT",
      seniorityRank: 2,
      active: true,
    },
  ];

  const settings: Settings = {
    responseWindows: {
      lt2h: 30,
      h2to4: 60,
      h4to24: 120,
      h24to72: 240,
      gt72: 480,
    },
  };

  const recommendation: Recommendation = {
    id: "emp-1",
    why: ["Bidder", "Rank 1", "Class RN"],
    candidates: [
      { id: "emp-1", why: ["Bidder", "Rank 1", "Class RN"] },
      { id: "emp-2", why: ["Bidder", "Rank 2", "Class RN"] },
    ],
  };

  const vacancy: Vacancy = {
    id: "vac-1",
    reason: "Backfill",
    classification: "RN",
    wing: "Shamrock",
    date: "2024-01-01",
    start: "08:00",
    end: "16:00",
    shiftDate: "2024-01-01",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    knownAt: "2023-12-31T00:00:00.000Z",
    offeringTier: "CASUALS",
    offeringStep: "Casuals",
    status: "Open",
  };

  it("cycles vacancy recommendations and awards the active candidate", async () => {
    const awardVacancy = vi.fn();

    render(
      <table>
        <tbody>
          <VacancyRow
            v={vacancy}
            recommendation={recommendation}
            employees={employees}
            selected={false}
            onToggleSelect={() => {}}
            isDueNext={false}
            awardVacancy={awardVacancy}
            resetKnownAt={() => {}}
            onDelete={() => {}}
            settings={settings}
          />
        </tbody>
      </table>,
    );

    const row = screen.getAllByRole("row")[0];
    expect(within(row).getByText("Alice Alpha")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next recommendation" }));
    expect(within(row).getByText("Bob Beta")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Award" }));

    const confirm = screen.getByRole("button", { name: "Confirm Award" }) as HTMLButtonElement;
    await waitFor(() => {
      expect(confirm.disabled).toBe(false);
    });

    fireEvent.click(confirm);
    expect(awardVacancy).toHaveBeenCalledWith({
      empId: "emp-2",
      reason: undefined,
      overrideUsed: false,
    });
  });

  it("falls back gracefully when no candidates are available", () => {
    const awardVacancy = vi.fn();
    const emptyRecommendation: Recommendation = {
      id: undefined,
      why: ["No eligible bidders"],
      candidates: [],
    };

    render(
      <table>
        <tbody>
          <VacancyRow
            v={vacancy}
            recommendation={emptyRecommendation}
            employees={employees}
            selected={false}
            onToggleSelect={() => {}}
            isDueNext={false}
            awardVacancy={awardVacancy}
            resetKnownAt={() => {}}
            onDelete={() => {}}
            settings={settings}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("No eligible bidders")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Next recommendation" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Award" }));
    const confirm = screen.getByRole("button", { name: "Confirm Award" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(awardVacancy).not.toHaveBeenCalled();
  });

  it("cycles bundle recommendations and awards the highlighted candidate", () => {
    const onAwardBundle = vi.fn();
    const recommendations: Record<string, Recommendation> = {
      "vac-1": recommendation,
    };

    render(
      <table>
        <tbody>
          <BundleRow
            groupId="bundle-1"
            items={[vacancy]}
            employees={employees}
            settings={settings}
            recommendations={recommendations}
            selectedIds={[]}
            onToggleSelectMany={() => {}}
            onDeleteMany={() => {}}
            onSplitBundle={() => {}}
            onAwardBundle={onAwardBundle}
            dueNextId={null}
          />
        </tbody>
      </table>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Next bundle recommendation" }),
    );

    const row = screen.getAllByRole("row")[0];
    fireEvent.click(within(row).getByTitle("Bob Beta"));
    expect(onAwardBundle).toHaveBeenCalledWith("emp-2");
  });
});
