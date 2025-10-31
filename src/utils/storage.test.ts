import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadVacancyFilters,
  OPEN_VACANCY_FILTERS_KEY,
  type VacancyFilterSnapshot,
} from "./storage";

const ORIGINAL_LOCAL_STORAGE = globalThis.localStorage;

describe("loadVacancyFilters", () => {
  let store: Record<string, string>;
  let mockStorage: Storage;

  beforeEach(() => {
    store = {};
    mockStorage = {
      getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      get length() {
        return Object.keys(store).length;
      },
    } as Storage;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: mockStorage,
    });
  });

  afterEach(() => {
    if (ORIGINAL_LOCAL_STORAGE) {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: ORIGINAL_LOCAL_STORAGE,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as Record<string, unknown>).localStorage;
    }
    vi.restoreAllMocks();
  });

  it("returns sanitized filters for valid snapshots", () => {
    const snapshot: VacancyFilterSnapshot = {
      selectedWings: ["North"],
      selectedPositions: ["Registered Nurse"],
      filterShift: "Day",
      countdown: "amber",
      start: "2024-03-01",
      end: "2024-03-07",
      search: "nurse",
      bundleMode: "bundles",
    };
    store[OPEN_VACANCY_FILTERS_KEY] = JSON.stringify(snapshot);

    expect(loadVacancyFilters()).toEqual(snapshot);
  });

  it("coerces legacy scalar values into arrays and drops invalid entries", () => {
    store[OPEN_VACANCY_FILTERS_KEY] = JSON.stringify({
      selectedWings: "South",
      selectedPositions: "Registered Nurse",
      countdown: " blue ",
      search: "  night shifts  ",
      bundleMode: "bundles",
      start: 123,
      end: null,
    });

    expect(loadVacancyFilters()).toEqual({
      selectedWings: ["South"],
      selectedPositions: ["Registered Nurse"],
      countdown: "blue",
      search: "night shifts",
      bundleMode: "bundles",
    });
  });

  it("omits unknown classifications and bundle modes", () => {
    store[OPEN_VACANCY_FILTERS_KEY] = JSON.stringify({
      selectedPositions: ["Registered Nurse", "Unknown Role"],
      bundleMode: "invalid",
      filterShift: "Evening",
    });

    expect(loadVacancyFilters()).toEqual({
      selectedPositions: ["Registered Nurse"],
      filterShift: "Evening",
    });
  });
});
