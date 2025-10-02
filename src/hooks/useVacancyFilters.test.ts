import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVacancyFilters } from "./useVacancyFilters";
import {
  OPEN_VACANCY_FILTERS_KEY,
  type VacancyFilterSnapshot,
} from "../utils/storage";

describe("useVacancyFilters localStorage integration", () => {
  const originalLocalStorage = window.localStorage;
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

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: mockStorage,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    vi.restoreAllMocks();
  });

  it("hydrates state from storage", () => {
    const snapshot: VacancyFilterSnapshot = {
      selectedWings: ["North"],
      selectedPositions: ["RN"],
      filterShift: "Day",
      start: "2024-01-01",
      end: "2024-01-02",
      search: "nurse",
      bundleMode: "bundles",
    };
    store[OPEN_VACANCY_FILTERS_KEY] = JSON.stringify(snapshot);

    const { result } = renderHook(() => useVacancyFilters());

    expect(result.current.selectedWings).toEqual(snapshot.selectedWings);
    expect(result.current.selectedPositions).toEqual(snapshot.selectedPositions);
    expect(result.current.filterShift).toBe(snapshot.filterShift);
    expect(result.current.start).toBe(snapshot.start);
    expect(result.current.end).toBe(snapshot.end);
    expect(result.current.search).toBe(snapshot.search);
    expect(result.current.bundleMode).toBe(snapshot.bundleMode);
    expect(result.current.countdown).toBe(snapshot.countdown ?? "");
  });

  it("persists changes when filters update", async () => {
    const { result } = renderHook(() => useVacancyFilters());

    act(() => {
      result.current.setSearch("evening");
      result.current.setStart("2024-02-01");
      result.current.setEnd("2024-02-14");
      result.current.setSelectedPositions(["LPN"]);
      result.current.setSelectedWings(["Bluebell"]);
      result.current.setFilterShift("Evening");
      result.current.setBundleMode("singles");
    });

    await waitFor(() => {
      expect(mockStorage.setItem).toHaveBeenLastCalledWith(
        OPEN_VACANCY_FILTERS_KEY,
        JSON.stringify({
          selectedWings: ["Bluebell"],
          selectedPositions: ["LPN"],
          filterShift: "Evening",
          start: "2024-02-01",
          end: "2024-02-14",
          search: "evening",
          bundleMode: "singles",
          countdown: "",
        }),
      );
    });
  });

  it("clears storage and resets when resetFilters is called", async () => {
    const { result } = renderHook(() => useVacancyFilters());

    act(() => {
      result.current.setSearch("night");
      result.current.setSelectedWings(["Rosewood"]);
    });

    await waitFor(() => {
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    const setItemMock = mockStorage.setItem as ReturnType<typeof vi.fn>;
    const callsBeforeReset = setItemMock.mock.calls.length;

    act(() => {
      result.current.resetFilters();
    });

    expect(mockStorage.removeItem).toHaveBeenCalledWith(OPEN_VACANCY_FILTERS_KEY);

    await waitFor(() => {
      expect(result.current.search).toBe("");
      expect(result.current.selectedWings).toEqual([]);
      expect(result.current.bundleMode).toBe("all");
    });

    expect(setItemMock.mock.calls.length).toBe(callsBeforeReset);
  });
});
