// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import OpenVacancies from "../src/components/OpenVacancies";
import useVacancies from "../src/state/useVacancies";
import type { Vacation, Vacancy } from "../src/types";

const LS_KEY = "maplewood-scheduler-v3";

const BASE_VACANCY: Vacancy = {
  id: "vacancy-1",
  reason: "Shift",
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

const BASE_VACATION: Vacation = {
  id: "vac-1",
  employeeId: "emp-1",
  employeeName: "Employee One",
  classification: "RN",
  wing: "Alpha",
  startDate: "2024-01-01",
  endDate: "2024-01-02",
};

function makeVacancy(overrides: Partial<Vacancy> = {}): Vacancy {
  return { ...BASE_VACANCY, ...overrides };
}

function makeVacation(overrides: Partial<Vacation> = {}): Vacation {
  return { ...BASE_VACATION, ...overrides };
}

function setupLocalStorage(
  vacancies: Vacancy[] = [],
  auditLog: unknown[] = [],
) {
  localStorage.setItem(LS_KEY, JSON.stringify({ vacancies, auditLog }));
}

describe("OpenVacancies", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(cleanup);

  it("renders delete buttons with tooltip", () => {
    const vacancies = [
      makeVacancy({ id: "v1" }),
      makeVacancy({
        id: "v2",
        classification: "LPN",
        date: "2024-01-02",
        shiftDate: "2024-01-02",
        knownAt: "2024-01-02T00:00:00.000Z",
      }),
    ];
    setupLocalStorage(vacancies);

    let vacState: ReturnType<typeof useVacancies>;
    const vacations: Vacation[] = [];
    function Wrapper() {
      vacState = useVacancies();
      return <OpenVacancies {...vacState} vacations={vacations} />;
    }

    render(<Wrapper />);

    const buttons = screen.getAllByTitle("Delete vacancy");
    expect(buttons).toHaveLength(2);
  });

  it("bulk deletes vacancies and records audit log", async () => {
    vi.useFakeTimers();
    const vacancies = [
      makeVacancy({ id: "v1" }),
      makeVacancy({
        id: "v2",
        classification: "LPN",
        date: "2024-01-02",
        shiftDate: "2024-01-02",
        knownAt: "2024-01-02T00:00:00.000Z",
      }),
    ];
    setupLocalStorage(vacancies);

    let vacState: ReturnType<typeof useVacancies>;
    const vacations: Vacation[] = [];
    function Wrapper() {
      vacState = useVacancies();
      return <OpenVacancies {...vacState} vacations={vacations} />;
    }

    render(<Wrapper />);

    fireEvent.click(screen.getAllByLabelText("Select all vacancies")[0]);
    fireEvent.click(screen.getByTestId("vacancy-delete-selected"));

    expect(screen.getByTestId("confirm-delete-modal")).toBeTruthy();
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByTestId("undo-delete-toast")).toBeTruthy();

    vi.runAllTimers();

    const persisted = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    expect(persisted.auditLog).toHaveLength(1);
    expect(persisted.auditLog[0].payload.vacancyIds.sort()).toEqual([
      "v1",
      "v2",
    ]);
    expect(persisted.auditLog[0].payload.userAction).toBe("bulk");

    vi.useRealTimers();
  });

  it("shows covered employee name when linked to a vacation", () => {
    const vacancies = [
      makeVacancy({ id: "v1", vacationId: "vac1" }),
    ];
    const vacations = [
      makeVacation({ id: "vac1", employeeName: "John Doe" }),
    ];
    setupLocalStorage(vacancies);

    let vacState: ReturnType<typeof useVacancies>;
    function Wrapper() {
      vacState = useVacancies();
      return <OpenVacancies {...vacState} vacations={vacations} />;
    }

    render(<Wrapper />);

    expect(screen.getByText("John Doe")).toBeTruthy();
  });

  it("bundles multi-day vacancies into a single row", () => {
    const vacancies = [
      makeVacancy({
        id: "v1",
        bundleId: "b1",
        startDate: "2024-01-01",
        endDate: "2024-01-02",
      }),
      makeVacancy({
        id: "v2",
        bundleId: "b1",
        date: "2024-01-02",
        shiftDate: "2024-01-02",
        startDate: "2024-01-01",
        endDate: "2024-01-02",
      }),
    ];
    setupLocalStorage(vacancies);

    let vacState: ReturnType<typeof useVacancies>;
    const vacations: Vacation[] = [];
    function Wrapper() {
      vacState = useVacancies();
      return <OpenVacancies {...vacState} vacations={vacations} />;
    }

    const { container } = render(<Wrapper />);
    fireEvent.click(screen.getAllByLabelText("Group by bundle")[0]);
    const buttons = container.querySelectorAll('[data-testid^="vacancy-delete-"]');
    expect(buttons.length).toBe(1);
  });
  });

