import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSchedulerState } from "./useSchedulerState";
import type { Vacancy } from "../types";

const storageMocks = vi.hoisted(() => ({
  loadState: vi.fn(),
  saveState: vi.fn(),
}));

vi.mock("../utils/storage", () => storageMocks);

const mockLoadState = storageMocks.loadState as ReturnType<typeof vi.fn>;
const mockSaveState = storageMocks.saveState as ReturnType<typeof vi.fn>;

const baseVacancy: Vacancy = {
  id: "base",
  reason: "Coverage",
  classification: "Registered Nurse",
  shiftDate: "2024-01-01",
  shiftStart: "08:00",
  shiftEnd: "16:00",
  knownAt: "2024-01-01T00:00:00.000Z",
  offeringTier: { tier: 1 },
  offeringStep: "Casuals",
  status: "Open",
  date: "2024-01-01",
  start: "08:00",
  end: "16:00",
};

describe("useSchedulerState", () => {
  beforeEach(() => {
    mockLoadState.mockReset();
    mockSaveState.mockReset();
  });

  it("hydrates from storage once per mount", () => {
    mockLoadState.mockReturnValue({
      employees: [],
      vacations: [],
      vacancies: [baseVacancy],
      bids: [],
      archivedBids: {},
      settings: { responseWindows: { lt2h: 1, h2to4: 2, h4to24: 3, h24to72: 4, gt72: 5 } },
      vacancyRanges: [],
    });

    const { result, rerender } = renderHook(() => useSchedulerState());

    act(() => {
      result.current.setVacancies((prev) => prev);
    });

    rerender();

    expect(mockLoadState).toHaveBeenCalledTimes(1);
    expect(mockSaveState).toHaveBeenCalled();
  });

  it("uses provided persisted snapshot without reloading", () => {
    const persisted = {
      employees: [],
      vacations: [],
      vacancies: [baseVacancy],
      bids: [],
      archivedBids: {},
      settings: { responseWindows: { lt2h: 1, h2to4: 2, h4to24: 3, h24to72: 4, gt72: 5 } },
      vacancyRanges: [],
    } as const;

    const { result } = renderHook(() => useSchedulerState(persisted));

    expect(result.current.vacancies).toHaveLength(1);
    expect(mockLoadState).not.toHaveBeenCalled();
  });
});
