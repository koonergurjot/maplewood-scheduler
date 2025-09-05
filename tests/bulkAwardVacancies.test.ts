import { describe, it, expect } from "vitest";
import { applyAwardVacancies, type Vacancy } from "../src/App";

describe("applyAwardVacancies", () => {
  it("awards multiple vacancies", () => {
    const vac1: Vacancy = {
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
    const vac2: Vacancy = { ...vac1, id: "v2" };
    const updated = applyAwardVacancies([vac1, vac2], ["v1", "v2"], { empId: "e1" });
    expect(updated[0].status).toBe("Awarded");
    expect(updated[1].status).toBe("Awarded");
    expect(updated[0].awardedTo).toBe("e1");
    expect(updated[1].awardedTo).toBe("e1");
    expect(updated[0].awardReason).toBeUndefined();
    expect(updated[1].awardReason).toBeUndefined();
  });
});
