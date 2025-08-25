// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  BidsPage,
  applyAwardVacancy,
  archiveBidsForVacancy,
  type Vacancy,
  type Bid,
} from "../src/App";

// test verifying that awarded vacancies are excluded from the dropdown

describe("BidsPage vacancy dropdown", () => {
  it("does not list awarded vacancies", () => {
    const vac: Vacancy = {
      id: "v1",
      reason: "Test",
      classification: "RN",
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
        archivedBids={{}}
        vacancies={[vac]}
        vacations={[]}
        employees={[]}
        employeesById={{}}
      />, 
    );
    expect(beforeHtml).toContain('value="v1"');

    const awarded = applyAwardVacancy([vac], "v1", { empId: "e1" });
    const afterHtml = renderToStaticMarkup(
      <BidsPage
        bids={[]}
        setBids={() => {}}
        archivedBids={{}}
        vacancies={awarded}
        vacations={[]}
        employees={[]}
        employeesById={{}}
      />, 
    );
    expect(afterHtml).not.toContain('value="v1"');
    expect(afterHtml).toContain("No open vacancies");
  });
});

describe("BidsPage delete button", () => {
  it("removes bid when Delete clicked", () => {
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
          archivedBids={{}}
          vacancies={[]}
          vacations={[]}
          employees={[]}
          employeesById={{}}
        />
      );
    }

    render(<Wrapper />);
    expect(screen.queryByText("Alice")).not.toBeNull();
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.queryByText("Alice")).toBeNull();
  });
});

describe("archived bids", () => {
  it("moves awarded vacancy bids to archivedBids", () => {
    const bid: Bid = {
      vacancyId: "v1",
      bidderEmployeeId: "e1",
      bidderName: "Alice",
      bidderStatus: "FT",
      bidderClassification: "RN",
      bidTimestamp: "2024-01-01T00:00:00.000Z",
    };
    const { bids, archivedBids } = archiveBidsForVacancy([bid], {}, "v1");
    expect(bids).toHaveLength(0);
    expect(archivedBids["v1"]).toHaveLength(1);
    expect(archivedBids["v1"][0].bidderName).toBe("Alice");
  });

  it("lists vacancy and displays bids when expanded", () => {
    const vac: Vacancy = {
      id: "v1",
      reason: "Test",
      classification: "RN",
      shiftDate: "2024-01-01",
      shiftStart: "08:00",
      shiftEnd: "16:00",
      knownAt: "2024-01-01T00:00:00.000Z",
      offeringTier: "CASUALS",
      offeringStep: "Casuals",
      status: "Awarded",
    };
    const bid: Bid = {
      vacancyId: "v1",
      bidderEmployeeId: "e1",
      bidderName: "Alice",
      bidderStatus: "FT",
      bidderClassification: "RN",
      bidTimestamp: "2024-01-01T00:00:00.000Z",
    };
    const { container } = render(
      <BidsPage
        bids={[]}
        setBids={() => {}}
        archivedBids={{ v1: [bid] }}
        vacancies={[vac]}
        vacations={[]}
        employees={[]}
        employeesById={{}}
      />,
    );
    expect(screen.getAllByText("Archived Bids").length).toBeGreaterThan(0);
    const details = container.querySelector("details")!;
    const summary = details.querySelector("summary")!;
    expect(details.hasAttribute("open")).toBe(false);
    fireEvent.click(summary);
    expect(details.hasAttribute("open")).toBe(true);
    expect(screen.getByText("Alice")).not.toBeNull();
  });
});
