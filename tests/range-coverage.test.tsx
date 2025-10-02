import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createVacanciesFromRange } from "../src/lib/bundles";
import { awardVacancyRange } from "../src/lib/vacancy-range-award";
import RangeBidDialog from "../src/components/RangeBidDialog";
import type { VacancyRange, Employee, Bid } from "../src/types";

const employees: Employee[] = [
  {
    id: "e1",
    firstName: "Ada",
    lastName: "Lovelace",
    classification: "RN",
    status: "FT",
    seniorityRank: 1,
    active: true,
  },
  {
    id: "e2",
    firstName: "Grace",
    lastName: "Hopper",
    classification: "RN",
    status: "FT",
    seniorityRank: 2,
    active: true,
  },
];

describe("range coverage workflow", () => {
  it("respects awardAsBlock when creating vacancies", () => {
    const range: VacancyRange = {
      id: "range-1",
      reason: "Vacation",
      classification: "RN",
      startDate: "2025-05-01",
      endDate: "2025-05-03",
      knownAt: "2025-04-01T00:00:00Z",
      workingDays: ["2025-05-01", "2025-05-02", "2025-05-03"],
      shiftStart: "06:30",
      shiftEnd: "14:30",
      offeringStep: "Casuals",
      status: "Open",
      awardAsBlock: false,
    };
    const created = createVacanciesFromRange(range);
    expect(created).toHaveLength(3);
    expect(created.every((vac) => vac.bundleId === undefined)).toBe(true);
  });

  it("submits a range bid with selected days", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const range: VacancyRange = {
      id: "range-2",
      reason: "Vacation",
      classification: "RN",
      startDate: "2025-06-01",
      endDate: "2025-06-03",
      knownAt: "2025-05-01T00:00:00Z",
      workingDays: ["2025-06-01", "2025-06-02", "2025-06-03"],
      shiftStart: "06:30",
      shiftEnd: "14:30",
      offeringStep: "Casuals",
      status: "Open",
      awardAsBlock: true,
    };

    render(
      <RangeBidDialog
        open
        onClose={onClose}
        range={range}
        employees={employees}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "e2" } });
    fireEvent.click(screen.getByLabelText(/some days only/i));
    fireEvent.click(screen.getByLabelText("2025-06-01"));
    fireEvent.click(screen.getByLabelText("2025-06-03"));
    fireEvent.change(screen.getByPlaceholderText(/add context/i), {
      target: { value: "Can cover mid-week" },
    });
    fireEvent.click(screen.getByText(/submit bid/i));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted: Bid = onSubmit.mock.calls[0][0];
    expect(submitted.bidderEmployeeId).toBe("e2");
    expect(submitted.coverageType).toBe("some-days");
    expect(submitted.selectedDays).toEqual(["2025-06-02"]);
    expect(onClose).toHaveBeenCalled();
  });

  it("awards full range to most senior full bid", () => {
    const range: VacancyRange = {
      id: "range-3",
      reason: "Vacation",
      classification: "RN",
      startDate: "2025-07-01",
      endDate: "2025-07-03",
      knownAt: "2025-06-01T00:00:00Z",
      workingDays: ["2025-07-01", "2025-07-02", "2025-07-03"],
      shiftStart: "06:30",
      shiftEnd: "14:30",
      offeringStep: "Casuals",
      status: "Open",
      awardAsBlock: true,
    };
    const bids: Bid[] = [
      {
        id: "b1",
        vacancyId: "range-3",
        bidderEmployeeId: "e2",
        bidderName: "Grace Hopper",
        bidderStatus: "FT",
        bidderClassification: "RN",
        bidTimestamp: "2025-06-05T12:00:00Z",
        coverageType: "full",
      },
      {
        id: "b2",
        vacancyId: "range-3",
        bidderEmployeeId: "e1",
        bidderName: "Ada Lovelace",
        bidderStatus: "FT",
        bidderClassification: "RN",
        bidTimestamp: "2025-06-05T12:05:00Z",
        coverageType: "full",
      },
    ];

    const outcome = awardVacancyRange(range, bids, employees);
    expect(outcome.vacancies).toHaveLength(3);
    expect(outcome.vacancies.every((vac) => vac.status === "Awarded")).toBe(true);
    expect(outcome.vacancies.every((vac) => vac.awardedTo === "e1")).toBe(true);
    expect(outcome.archivedBids).toHaveLength(2);
  });

  it("splits partial-day coverage and leaves remainder open", () => {
    const range: VacancyRange = {
      id: "range-4",
      reason: "Vacation",
      classification: "RN",
      startDate: "2025-08-10",
      endDate: "2025-08-10",
      knownAt: "2025-08-01T00:00:00Z",
      workingDays: ["2025-08-10"],
      shiftStart: "06:30",
      shiftEnd: "14:30",
      offeringStep: "Casuals",
      status: "Open",
      awardAsBlock: false,
    };
    const bids: Bid[] = [
      {
        id: "b3",
        vacancyId: "range-4",
        bidderEmployeeId: "e1",
        bidderName: "Ada Lovelace",
        bidderStatus: "FT",
        bidderClassification: "RN",
        bidTimestamp: "2025-08-01T09:00:00Z",
        coverageType: "partial-day",
        selectedDays: ["2025-08-10"],
        timeOverrides: {
          "2025-08-10": { start: "06:30", end: "10:30" },
        },
      },
    ];

    const outcome = awardVacancyRange(range, bids, employees);
    expect(outcome.vacancies).toHaveLength(2);
    const awarded = outcome.vacancies.find((vac) => vac.awardedTo === "e1");
    const openVacancy = outcome.vacancies.find((vac) => vac.status === "Open");
    expect(awarded?.shiftStart).toBe("06:30");
    expect(awarded?.shiftEnd).toBe("10:30");
    expect(openVacancy?.shiftStart).toBe("10:30");
    expect(openVacancy?.shiftEnd).toBe("14:30");
  });
});
