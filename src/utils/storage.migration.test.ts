import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LS_KEY,
  OPEN_VACANCY_FILTERS_KEY,
  loadState,
  loadVacancyFilters,
} from "./storage";

describe("classification migration", () => {
  const originalWindowStorage = window.localStorage;
  const originalGlobalStorage = globalThis.localStorage;
  let store: Record<string, string>;
  let mockStorage: Storage;

  beforeEach(() => {
    store = {};
    mockStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    } as Storage;

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: mockStorage,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: mockStorage,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalWindowStorage,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalGlobalStorage,
    });
  });

  it("upgrades legacy classifications and prunes invalid entries", () => {
    const legacyState: any = {
      employees: [
        {
          id: "emp1",
          firstName: "Alex",
          lastName: "Anders",
          classification: "Rec",
          status: "FT",
          seniorityRank: 1,
          active: true,
        },
        {
          id: "emp2",
          firstName: "Bailey",
          lastName: "Brooks",
          classification: "adp-rca",
          status: "PT",
          seniorityRank: 2,
          active: true,
        },
        {
          id: "emp3",
          firstName: "Casey",
          lastName: "Cole",
          classification: "Mystery",
          status: "FT",
          seniorityRank: 3,
          active: true,
        },
      ],
      vacations: [
        {
          id: "vac1",
          employeeId: "emp1",
          employeeName: "Alex Anders",
          classification: "rec",
          wing: "Shamrock",
          startDate: "2024-07-01",
          endDate: "2024-07-05",
        },
        {
          id: "vac2",
          employeeId: "emp3",
          employeeName: "Casey Cole",
          classification: "Mystery",
          wing: "Rosewood",
          startDate: "2024-08-01",
          endDate: "2024-08-03",
        },
      ],
      vacancies: [
        {
          id: "vacancy1",
          vacationId: "vac1",
          reason: "Coverage",
          classification: "Rec",
          shiftDate: "2024-07-02",
          shiftStart: "06:30",
          shiftEnd: "14:30",
          knownAt: "2024-06-01T12:00:00Z",
          offeringTier: "test",
          offeringStep: "Casuals",
          status: "Open",
          date: "2024-07-02",
        },
        {
          id: "vacancy2",
          reason: "Shift",
          classification: "rn",
          shiftDate: "2024-07-03",
          shiftStart: "06:30",
          shiftEnd: "14:30",
          knownAt: "2024-06-01T12:00:00Z",
          offeringTier: "test",
          offeringStep: "Casuals",
          status: "Open",
          date: "2024-07-03",
        },
        {
          id: "vacancy3",
          reason: "Shift",
          classification: "Mystery",
          shiftDate: "2024-07-04",
          shiftStart: "06:30",
          shiftEnd: "14:30",
          knownAt: "2024-06-01T12:00:00Z",
          offeringTier: "test",
          offeringStep: "Casuals",
          status: "Open",
          date: "2024-07-04",
        },
      ],
      bids: [
        {
          vacancyId: "vacancy1",
          bidderEmployeeId: "emp1",
          bidderName: "Alex Anders",
          bidderStatus: "FT",
          bidderClassification: "Rec",
          bidTimestamp: "2024-06-10T10:00:00Z",
        },
        {
          vacancyId: "vacancy1",
          bidderEmployeeId: "emp2",
          bidderName: "Bailey Brooks",
          bidderStatus: "PT",
          bidderClassification: "Mystery",
          bidTimestamp: "2024-06-10T10:05:00Z",
        },
        {
          vacancyId: "vacancy1",
          bidderEmployeeId: "emp2",
          bidderName: "Bailey Brooks",
          bidderStatus: "PT",
          bidderClassification: "RN",
          bidTimestamp: "2024-06-10T10:10:00Z",
        },
      ],
      archivedBids: {
        vac1: [
          {
            vacancyId: "vacancy1",
            bidderEmployeeId: "emp1",
            bidderName: "Alex Anders",
            bidderStatus: "FT",
            bidderClassification: "Rec",
            bidTimestamp: "2024-05-10T10:00:00Z",
          },
          {
            vacancyId: "vacancy1",
            bidderEmployeeId: "emp2",
            bidderName: "Bailey Brooks",
            bidderStatus: "PT",
            bidderClassification: "Mystery",
            bidTimestamp: "2024-05-10T10:05:00Z",
          },
        ],
        vac2: [
          {
            vacancyId: "vacancy2",
            bidderEmployeeId: "emp3",
            bidderName: "Casey Cole",
            bidderStatus: "FT",
            bidderClassification: "Mystery",
            bidTimestamp: "2024-05-11T11:00:00Z",
          },
        ],
      },
      vacancyRanges: [
        {
          id: "range1",
          reason: "Vacation",
          classification: "Rec",
          startDate: "2024-07-01",
          endDate: "2024-07-05",
          knownAt: "2024-06-01T12:00:00Z",
          workingDays: ["2024-07-01"],
        },
        {
          id: "range2",
          reason: "Vacation",
          classification: "Mystery",
          startDate: "2024-08-01",
          endDate: "2024-08-02",
          knownAt: "2024-07-01T12:00:00Z",
          workingDays: ["2024-08-01"],
        },
      ],
    };

    store[LS_KEY] = JSON.stringify(legacyState);
    store[OPEN_VACANCY_FILTERS_KEY] = JSON.stringify({
      selectedWings: ["Shamrock"],
      selectedPositions: ["Rec", "Mystery", "rec", "ADP-rca"],
      filterShift: "",
      start: "",
      end: "",
      search: "",
      bundleMode: "all",
    });

    const migratedState = loadState<any>();
    const migratedFilters = loadVacancyFilters();

    expect(migratedState?.employees.map((e: any) => e.classification)).toEqual([
      "Recreation",
      "ADP RCA",
    ]);
    expect(migratedState?.vacations.map((v: any) => v.classification)).toEqual([
      "Recreation",
    ]);
    expect(migratedState?.vacancies.map((v: any) => v.classification)).toEqual([
      "Recreation",
      "RN",
    ]);
    expect(
      migratedState?.bids.map((b: any) => b.bidderClassification),
    ).toEqual(["Recreation", "RN"]);
    expect(
      migratedState?.archivedBids?.vac1.map((b: any) => b.bidderClassification),
    ).toEqual(["Recreation"]);
    expect(migratedState?.archivedBids?.vac2).toBeUndefined();
    expect(
      migratedState?.vacancyRanges.map((r: any) => r.classification),
    ).toEqual(["Recreation"]);

    expect(migratedFilters?.selectedPositions).toEqual([
      "Recreation",
      "ADP RCA",
    ]);
    expect(migratedFilters?.selectedWings).toEqual(["Shamrock"]);
  });
});
