import { describe, it, expect } from "vitest";
import {
  validateDateRange,
  validateRequired,
  validateTime,
  validateTimeRange,
  validateClassification,
  validateSelection
} from "./validation";

describe("validateDateRange", () => {
  it("should validate valid date range", () => {
    const result = validateDateRange("2025-01-15", "2025-01-17");
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should validate same date range", () => {
    const result = validateDateRange("2025-01-15", "2025-01-15");
    expect(result.isValid).toBe(true);
  });

  it("should reject invalid date range", () => {
    const result = validateDateRange("2025-01-17", "2025-01-15");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Start date must be before or equal to end date");
  });

  it("should reject missing dates", () => {
    const result = validateDateRange("", "2025-01-15");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Both start and end dates are required");
  });
});

describe("validateRequired", () => {
  it("should validate non-empty string", () => {
    const result = validateRequired("Test", "Field");
    expect(result.isValid).toBe(true);
  });

  it("should reject empty string", () => {
    const result = validateRequired("", "Field");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Field is required");
  });

  it("should reject whitespace-only string", () => {
    const result = validateRequired("   ", "Field");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Field is required");
  });
});

describe("validateTime", () => {
  it("should validate valid time formats", () => {
    expect(validateTime("09:30").isValid).toBe(true);
    expect(validateTime("23:59").isValid).toBe(true);
    expect(validateTime("00:00").isValid).toBe(true);
  });

  it("should reject invalid time formats", () => {
    expect(validateTime("25:00").isValid).toBe(false);
    expect(validateTime("12:60").isValid).toBe(false);
    expect(validateTime("9:30").isValid).toBe(false); // Should be 09:30
    expect(validateTime("").isValid).toBe(false);
  });
});

describe("validateTimeRange", () => {
  it("should validate normal time range", () => {
    const result = validateTimeRange("09:00", "17:00");
    expect(result.isValid).toBe(true);
  });

  it("should validate overnight shift", () => {
    const result = validateTimeRange("22:00", "06:00");
    expect(result.isValid).toBe(true);
  });

  it("should reject invalid time range", () => {
    const result = validateTimeRange("17:00", "09:00");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Start time must be before end time");
  });

  it("should reject invalid time format", () => {
    const result = validateTimeRange("25:00", "17:00");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Time must be in HH:MM format");
  });
});

describe("validateClassification", () => {
  it("should validate valid classifications", () => {
    expect(validateClassification("RCA").isValid).toBe(true);
    expect(validateClassification("LPN").isValid).toBe(true);
    expect(validateClassification("RN").isValid).toBe(true);
  });

  it("should reject invalid classifications", () => {
    const result = validateClassification("INVALID");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Classification must be RCA, LPN, or RN");
  });

  it("should reject empty classification", () => {
    const result = validateClassification("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Classification is required");
  });
});

describe("validateSelection", () => {
  it("should validate non-empty selection", () => {
    const result = validateSelection(["item1", "item2"], "coverage day");
    expect(result.isValid).toBe(true);
  });

  it("should reject empty selection", () => {
    const result = validateSelection([], "coverage day");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("At least one coverage day must be selected");
  });

  it("should reject null/undefined selection", () => {
    const result = validateSelection(undefined as any, "coverage day");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("At least one coverage day must be selected");
  });
});