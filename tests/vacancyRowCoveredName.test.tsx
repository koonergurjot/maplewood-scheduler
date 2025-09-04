// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import VacancyRow from "../src/components/VacancyRow";
import type { Vacancy, Employee } from "../src/types";

describe("VacancyRow", () => {
  it("shows the covered employee name", () => {
    const vacancy: Vacancy = {
      id: "v1",
      reason: "Vacation Backfill",
      classification: "RN",
      wing: "Shamrock",
      shiftDate: "2024-01-01",
      shiftStart: "08:00",
      shiftEnd: "16:00",
      knownAt: "2023-12-31T00:00:00.000Z",
      offeringTier: "CASUALS",
      offeringStep: "Casuals",
      status: "Open",
    };

    render(
      <table>
        <tbody>
          <VacancyRow
            v={vacancy}
            recName="—"
            recWhy={[]}
            employees={[] as Employee[]}
            selected={false}
            onToggleSelect={() => {}}
            countdownLabel="1h"
            countdownClass="cd-green"
            isDueNext={false}
            onAward={() => {}}
            onResetKnownAt={() => {}}
            onDelete={() => {}}
            coveredName="Jane Doe"
          />
        </tbody>
      </table>
    );

    expect(screen.getByText(/Covering Jane Doe/)).toBeTruthy();
  });
});
