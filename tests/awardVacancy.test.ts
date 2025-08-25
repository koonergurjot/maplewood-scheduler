import { describe, it, expect } from "vitest";
import { applyAwardVacancy, type Vacancy } from "../src/App";

describe("applyAwardVacancy", () => {
  it("stores undefined when empId is EMPTY", () => {
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
    const updated = applyAwardVacancy([vac], "v1", { empId: "EMPTY" });
    expect(updated[0].status).toBe("Awarded");
    expect(updated[0].awardedTo).toBeUndefined();
  });

  it("awards multiple vacancies with identical details and differing overrides", () => {
    const vacs: Vacancy[] = [
      {
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
      },
      {
        id: "v2",
        reason: "Test",
        classification: "RN",
        shiftDate: "2024-01-01",
        shiftStart: "08:00",
        shiftEnd: "16:00",
        knownAt: "2024-01-01T00:00:00.000Z",
        offeringTier: "CASUALS",
        offeringStep: "Casuals",
        status: "Open",
      },
      {
        id: "v3",
        reason: "Unrelated",
        classification: "RN",
        shiftDate: "2024-01-01",
        shiftStart: "08:00",
        shiftEnd: "16:00",
        knownAt: "2024-01-01T00:00:00.000Z",
        offeringTier: "CASUALS",
        offeringStep: "Casuals",
        status: "Open",
      },
    ];
    let updated = applyAwardVacancy(vacs, "v1", {
      empId: "EMPTY",
      reason: "No staff",
      overrideUsed: true,
    });
    updated = applyAwardVacancy(updated, "v2", {
      empId: "EMPTY",
      reason: "No staff",
    });

    const v1 = updated.find((v) => v.id === "v1")!;
    const v2 = updated.find((v) => v.id === "v2")!;
    const v3 = updated.find((v) => v.id === "v3")!;

    expect(v1.status).toBe("Awarded");
    expect(v2.status).toBe("Awarded");
    expect(v1.awardedTo).toBeUndefined();
    expect(v2.awardedTo).toBeUndefined();
    expect(v1.awardedTo).toBe(v2.awardedTo);
    expect(v1.awardReason).toBe("No staff");
    expect(v2.awardReason).toBe("No staff");
    expect(v1.awardReason).toBe(v2.awardReason);
    expect(v1.overrideUsed).toBe(true);
    expect(v2.overrideUsed).toBe(false);
    expect(v3.status).toBe("Open");
    expect(v3.awardedTo).toBeUndefined();
  });
});
