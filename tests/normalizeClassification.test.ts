import { describe, expect, it } from "vitest";
import { normalizeClassification } from "../src/utils/headers";

describe("normalizeClassification", () => {
  it("maps Licensed Practical Nurse to LPN", () => {
    expect(normalizeClassification("Licensed Practical Nurse")).toBe(
      "Licensed Practical Nurse",
    );
    expect(normalizeClassification("LPN")).toBe("Licensed Practical Nurse");
    expect(normalizeClassification("Practical Nurse")).toBe(
      "Licensed Practical Nurse",
    );
  });

  it("does not misclassify LPN as RN", () => {
    expect(normalizeClassification("Licensed Practical Nurse – Float")).toBe(
      "Licensed Practical Nurse",
    );
  });

  it("maps Registered Nurse to RN", () => {
    expect(normalizeClassification("Registered Nurse")).toBe("Registered Nurse");
    expect(normalizeClassification("RN")).toBe("Registered Nurse");
  });

  it("maps Care Aide variants", () => {
    expect(normalizeClassification("Resident Care Aide")).toBe("Care Aide");
    expect(normalizeClassification("RCA")).toBe("Care Aide");
  });

  it("maps Rehab Assistant variants", () => {
    expect(normalizeClassification("Rehab Assistant")).toBe("Rehab Assistant");
    expect(normalizeClassification("Rehabilitation Aide")).toBe("Rehab Assistant");
  });

  it("maps Recreation roles", () => {
    expect(normalizeClassification("Recreation Therapist")).toBe(
      "Recreation Therapist",
    );
    expect(normalizeClassification("Recreation/Activity Aide")).toBe(
      "Recreation/Activity Aide",
    );
    expect(normalizeClassification("Activity Aide")).toBe(
      "Recreation/Activity Aide",
    );
  });

  it("maps ADP RCA variants", () => {
    expect(normalizeClassification("Adult Day Program RCA")).toBe(
      "Adult Day Program RCA",
    );
    expect(normalizeClassification("ADP Care Aide")).toBe(
      "Adult Day Program RCA",
    );
  });

  it("maps Adult Daytime Recreation Aide", () => {
    expect(normalizeClassification("Adult Daytime Recreation Aide")).toBe(
      "Adult Daytime Recreation Aide",
    );
  });

  it("maps Essential Services", () => {
    expect(normalizeClassification("Essential Services")).toBe("Essential Services");
  });
});
