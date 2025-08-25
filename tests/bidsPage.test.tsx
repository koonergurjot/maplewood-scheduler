// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  BidsPage,
  applyAwardVacancy,
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
