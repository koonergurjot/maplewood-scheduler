// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import VacancyRow from "../src/components/VacancyRow";
import type { Vacancy, Employee, Settings } from "../src/types";
import { OVERRIDE_REASONS } from "../src/types";
import type { RecommendationCandidate } from "../src/recommend";

describe("VacancyRow ranked selection", () => {
  it("allows selecting a ranked candidate and passes payload", () => {
    const vacancy: Vacancy = {
      id: "v1",
      reason: "Test",
      classification: "RN",
      wing: "Shamrock",
      date: "2024-01-01",
      start: "08:00",
      end: "16:00",
      shiftDate: "2024-01-01",
      shiftStart: "08:00",
      shiftEnd: "16:00",
      knownAt: "2023-12-31T00:00:00.000Z",
      offeringTier: "CASUALS" as any,
      offeringStep: "Casuals",
      status: "Open",
    };

    const employees: Employee[] = [
      {
        id: "e1",
        firstName: "Alice",
        lastName: "A",
        classification: "RN",
        status: "FT",
        seniorityRank: 1,
        active: true,
      },
      {
        id: "e2",
        firstName: "Bob",
        lastName: "B",
        classification: "RN",
        status: "FT",
        seniorityRank: 2,
        active: true,
      },
    ];

    const recCandidates: RecommendationCandidate[] = [
      { id: "e1", why: ["Most senior"] },
      { id: "e2", why: ["Next in line"] },
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

    const awardVacancy = vi.fn();

    render(
      <table>
        <tbody>
          <VacancyRow
            v={vacancy}
            recId="e1"
            recName="Alice A"
            recWhy={[]}
            recCandidates={recCandidates}
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

    const row = screen.getByRole("row");
    fireEvent.click(within(row).getByText("Award"));
    fireEvent.click(within(row).getByText("View ranked bidders"));

    const secondCandidate = within(row).getByText("Bob B");
    fireEvent.click(secondCandidate);

    const reasonSelect = within(row).getByRole("combobox");
    const reason = OVERRIDE_REASONS[0];
    fireEvent.change(reasonSelect, { target: { value: reason } });

    fireEvent.click(within(row).getByText("Confirm Award"));

    expect(awardVacancy).toHaveBeenCalledWith({
      empId: "e2",
      reason,
      overrideUsed: false,
    });
  });
});
