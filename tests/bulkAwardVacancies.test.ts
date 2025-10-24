import { describe, it, expect, vi } from "vitest";
import { applyAwardVacancies, type Vacancy } from "../src/App";

describe("applyAwardVacancies", () => {
  it("awards multiple vacancies", () => {
    vi.useFakeTimers();
    const now = new Date("2024-02-02T10:00:00.000Z");
    vi.setSystemTime(now);

    const vac1: Vacancy = {
      id: "v1",
      reason: "Test",
      classification: "Registered Nurse",
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
    const vac2: Vacancy = { ...vac1, id: "v2" };
    const original = [vac1, vac2];
    const updated = applyAwardVacancies(original, ["v1", "v2"], {
      empId: "e1",
      reason: "Need coverage",
      overrideUsed: true,
    });

    expect(updated).not.toBe(original);
    expect(updated[0]).not.toBe(vac1);
    expect(updated[1]).not.toBe(vac2);
    expect(vac1.status).toBe("Open");
    expect(vac2.status).toBe("Open");
    expect(updated[0].status).toBe("Awarded");
    expect(updated[1].status).toBe("Awarded");
    expect(updated[0].awardedTo).toBe("e1");
    expect(updated[1].awardedTo).toBe("e1");
    expect(updated[0].awardedAt).toBe(now.toISOString());
    expect(updated[1].awardedAt).toBe(now.toISOString());
    expect(updated[0].awardReason).toBe("Need coverage");
    expect(updated[1].awardReason).toBe("Need coverage");
    expect(updated[0].overrideUsed).toBe(true);
    expect(updated[1].overrideUsed).toBe(true);

    vi.useRealTimers();
  });

  it("defaults optional award payload fields when omitted", () => {
    const vac: Vacancy = {
      id: "v1",
      reason: "Test",
      classification: "Registered Nurse",
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

    const [updated] = applyAwardVacancies([vac], ["v1"], { empId: "e1" });

    expect(updated.awardReason).toBeUndefined();
    expect(updated.overrideUsed).toBe(false);
    expect(updated.awardedTo).toBe("e1");
    expect(typeof updated.awardedAt).toBe("string");
  });
});
