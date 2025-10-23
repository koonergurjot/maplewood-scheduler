import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useVacancies } from "./useVacancies";
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
  date: "2025-01-01",
  reason: "Coverage",
  classification: "RN",
  shiftDate: "2025-01-01",
  shiftStart: "08:00",
  shiftEnd: "16:00",
  knownAt: "2025-01-01T00:00:00.000Z",
  offeringTier: { tier: 1 },
  offeringStep: "Casuals",
  status: "Open",
  start: "08:00",
  end: "16:00",
};

const makeVacancy = (id: string, overrides: Partial<Vacancy> = {}): Vacancy => ({
  ...baseVacancy,
  id,
  vacancyRef: id,
  ...overrides,
});

describe("useVacancies", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLoadState.mockReset();
    mockSaveState.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("finalizes staged deletions with the latest vacancy state", () => {
    let storedState = {
      vacancies: [makeVacancy("1"), makeVacancy("2")],
      auditLog: [],
    };

    mockLoadState.mockImplementation(() => storedState);
    mockSaveState.mockImplementation((state) => {
      storedState = state;
      return true;
    });

    const { result } = renderHook(() => useVacancies());

    act(() => {
      result.current.stageDelete(["1"]);
    });

    expect(result.current.vacancies.map((v) => v.id)).toEqual(["2"]);
    expect(storedState.vacancies.map((v: Vacancy) => v.id)).toEqual(["2"]);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.vacancies.map((v) => v.id)).toEqual(["2"]);
    expect(storedState.vacancies.map((v: Vacancy) => v.id)).toEqual(["2"]);
    expect(storedState.auditLog).toHaveLength(1);
    expect(storedState.auditLog[0].payload.vacancyIds).toEqual(["1"]);
    expect(storedState.auditLog[0].payload.userAction).toBe("single");
  });

  it("restores staged deletions on undo and cancels finalize timer", () => {
    let storedState = {
      vacancies: [makeVacancy("1"), makeVacancy("2")],
      auditLog: [],
    };

    mockLoadState.mockImplementation(() => storedState);
    mockSaveState.mockImplementation((state) => {
      storedState = state;
      return true;
    });

    const { result } = renderHook(() => useVacancies());

    act(() => {
      result.current.stageDelete(["1"]);
    });

    act(() => {
      result.current.undoDelete();
    });

    expect(result.current.vacancies.map((v) => v.id)).toEqual(["1", "2"]);
    expect(storedState.vacancies.map((v: Vacancy) => v.id)).toEqual(["1", "2"]);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.auditLog).toHaveLength(0);
    expect(storedState.auditLog).toHaveLength(0);
    expect(mockSaveState).toHaveBeenCalledTimes(2);
  });
});
