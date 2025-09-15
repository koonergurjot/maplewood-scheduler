// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  BidsPage,
  applyAwardVacancy,
  type Vacancy,
  type Bid,
} from "../src/App.tsx";

// test verifying that awarded vacancies are excluded from the dropdown

describe("BidsPage vacancy dropdown", () => {
  it("does not list awarded vacancies", () => {
    const vac: Vacancy = {
      id: "v1",
      reason: "Test",
      classification: "RN",
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
    };

    const beforeHtml = renderToStaticMarkup(
      <BidsPage
        bids={[]}
        setBids={() => {}}
        vacancies={[vac]}
        vacations={[]}
        employees={[]}
        employeesById={{}}
        archivedBids={{}}
      />,
    );
    expect(beforeHtml).toContain("January 01, 2024");

    const awarded = applyAwardVacancy([vac], "v1", { empId: "e1" });
    expect(awarded[0].awardReason).toBeUndefined();
    const afterHtml = renderToStaticMarkup(
      <BidsPage
        bids={[]}
        setBids={() => {}}
        vacancies={awarded}
        vacations={[]}
        employees={[]}
        employeesById={{}}
        archivedBids={{}}
      />,
    );
    expect(afterHtml).toContain("No open vacancies");
  });
});

describe("BidsPage delete button", () => {
  it("shows undo toast and restores bid on undo", () => {
    vi.useFakeTimers();
    const initialBid: Bid = {
      vacancyId: "v1",
      bidderEmployeeId: "e1",
      bidderName: "Alice",
      bidderStatus: "FT",
      bidderClassification: "RN",
      bidTimestamp: "2024-01-01T00:00:00.000Z",
      notes: "",
    };

    function Wrapper() {
      const [bids, setBids] = React.useState<Bid[]>([initialBid]);
      return (
        <BidsPage
          bids={bids}
          setBids={setBids}
          vacancies={[]}
          vacations={[]}
          employees={[]}
          employeesById={{}}
          archivedBids={{}}
        />
      );
    }

    render(<Wrapper />);
    expect(screen.queryByText("Alice")).not.toBeNull();
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByTestId("undo-delete-toast")).toBeTruthy();
    fireEvent.click(screen.getByText("Undo"));
    expect(screen.queryByText("Alice")).not.toBeNull();
    expect(screen.queryByTestId("undo-delete-toast")).toBeNull();
    vi.runAllTimers();
    vi.useRealTimers();
  });
});
