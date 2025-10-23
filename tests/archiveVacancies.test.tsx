// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ArchivePage,
  applyAwardVacancy,
  archiveBidsForVacancy,
  type Vacancy,
  type Bid,
} from "../src/App.tsx";
import { formatDateLong } from "../src/lib/dates";

const labelFor = (v: Vacancy) =>
  `${formatDateLong(v.shiftDate)} • ${v.shiftStart}–${v.shiftEnd} • ${v.wing ?? ""} • ${v.classification}`.replace(
    /\s+•\s+$/,
    "",
  );

describe("ArchivePage", () => {
  it("lists archived vacancies with their bids", () => {
    const vacancy: Vacancy = {
      id: "v1",
      reason: "Test",
      classification: "Registered Nurse",
      date: "2024-01-01",
      start: "08:00",
      end: "16:00",
      shiftDate: "2024-01-01",
      shiftStart: "08:00",
      shiftEnd: "16:00",
      knownAt: "2024-01-01T00:00:00Z",
      offeringTier: "CASUALS" as any,
      offeringStep: "Casuals",
      status: "Open",
    };
    const bid: Bid = {
      vacancyId: "v1",
      bidderEmployeeId: "e1",
      bidderName: "Alice",
      bidderStatus: "FT",
      bidderClassification: "Registered Nurse",
      bidTimestamp: "2024-01-01T00:00:00Z",
      notes: "hi",
    };

    const awarded = applyAwardVacancy([vacancy], "v1", { empId: "e1" });
    const { archivedBids } = archiveBidsForVacancy([bid], {}, "v1");
    awarded[0].archived = true;
    awarded[0].archivedAt = "2024-01-02T00:00:00Z";

    render(<ArchivePage vacancies={awarded} archivedBids={archivedBids} />);

    fireEvent.click(screen.getByText(/January 01, 2024/));
    expect(screen.getByText("Alice")).toBeTruthy();
  });
});

