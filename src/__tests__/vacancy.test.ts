import { afterEach, describe, expect, it, vi } from "vitest";
import { pickWindowMinutes, deadlineFor } from "../lib/vacancy";
import type { Settings, Vacancy } from "../types";

const settings: Settings = {
  responseWindows: {
    lt2h: 7,
    h2to4: 15,
    h4to24: 30,
    h24to72: 120,
    gt72: 1440,
  },
};

const baseVacancy: Vacancy = {
  id: "vac-1",
  reason: "Test",
  classification: "Care Aide",
  wing: "Shamrock",
  date: "2025-01-01",
  start: "12:00",
  end: "20:00",
  shiftDate: "2025-01-01",
  shiftStart: "12:00",
  shiftEnd: "20:00",
  knownAt: "2025-01-01T08:00:00",
  offeringTier: "CASUALS",
  offeringStep: "Casuals",
  status: "Open",
};

const makeVacancy = (overrides: Partial<Vacancy> = {}): Vacancy => ({
  ...baseVacancy,
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pickWindowMinutes", () => {
  it("falls back to default window when timestamps are invalid", () => {
    const invalidKnown = makeVacancy({ knownAt: "not-a-date" });
    expect(pickWindowMinutes(invalidKnown, settings)).toBe(
      settings.responseWindows.h4to24,
    );

    const invalidShift = makeVacancy({ shiftStart: "invalid", shiftEnd: "invalid" });
    expect(pickWindowMinutes(invalidShift, settings)).toBe(
      settings.responseWindows.h4to24,
    );
  });
});

describe("deadlineFor", () => {
  it("uses the vacancy knownAt timestamp when valid", () => {
    const vacancy = makeVacancy();
    const winMin = pickWindowMinutes(vacancy, settings);
    const deadline = deadlineFor(vacancy, settings);
    const expected = new Date(new Date(vacancy.knownAt).getTime() + winMin * 60_000);
    expect(deadline.toISOString()).toBe(expected.toISOString());
  });

  it("falls back to the current time when knownAt is invalid", () => {
    vi.useFakeTimers();
    const now = new Date("2025-02-01T10:00:00Z");
    vi.setSystemTime(now);

    const vacancy = makeVacancy({ knownAt: "invalid-date" });
    const winMin = pickWindowMinutes(vacancy, settings);
    const deadline = deadlineFor(vacancy, settings);
    const expected = new Date(now.getTime() + winMin * 60_000);
    expect(deadline.toISOString()).toBe(expected.toISOString());
  });
});

