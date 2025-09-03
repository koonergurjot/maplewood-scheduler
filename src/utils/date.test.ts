import { describe, it, expect } from "vitest";
import {
  getDatesInRange,
  isWeekday,
  getWeekdaysInRange,
  applyPreset,
  formatCoverageSummary,
  getDayOfWeekName,
  getDayOfWeekShort
} from "./date";

describe("getDatesInRange", () => {
  it("should generate dates for a single day range", () => {
    const result = getDatesInRange("2025-01-15", "2025-01-15");
    expect(result).toEqual(["2025-01-15"]);
  });

  it("should generate dates for a multi-day range", () => {
    const result = getDatesInRange("2025-01-15", "2025-01-17");
    expect(result).toEqual(["2025-01-15", "2025-01-16", "2025-01-17"]);
  });

  it("should handle month boundaries", () => {
    const result = getDatesInRange("2025-01-30", "2025-02-02");
    expect(result).toEqual(["2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02"]);
  });
});

describe("isWeekday", () => {
  it("should identify weekdays correctly", () => {
    expect(isWeekday("2025-01-13")).toBe(true); // Monday
    expect(isWeekday("2025-01-14")).toBe(true); // Tuesday
    expect(isWeekday("2025-01-15")).toBe(true); // Wednesday
    expect(isWeekday("2025-01-16")).toBe(true); // Thursday
    expect(isWeekday("2025-01-17")).toBe(true); // Friday
  });

  it("should identify weekends correctly", () => {
    expect(isWeekday("2025-01-18")).toBe(false); // Saturday
    expect(isWeekday("2025-01-19")).toBe(false); // Sunday
  });
});

describe("getWeekdaysInRange", () => {
  it("should return only weekdays from a range", () => {
    const result = getWeekdaysInRange("2025-01-13", "2025-01-19");
    expect(result).toEqual([
      "2025-01-13", "2025-01-14", "2025-01-15", "2025-01-16", "2025-01-17"
    ]);
  });

  it("should return empty array for weekend-only range", () => {
    const result = getWeekdaysInRange("2025-01-18", "2025-01-19");
    expect(result).toEqual([]);
  });
});

describe("applyPreset", () => {
  const startDate = "2025-01-13"; // Monday
  const endDate = "2025-01-19";   // Sunday

  it("should apply 'all' preset correctly", () => {
    const result = applyPreset("all", startDate, endDate);
    expect(result).toEqual([
      "2025-01-13", "2025-01-14", "2025-01-15", "2025-01-16", 
      "2025-01-17", "2025-01-18", "2025-01-19"
    ]);
  });

  it("should apply 'weekdays' preset correctly", () => {
    const result = applyPreset("weekdays", startDate, endDate);
    expect(result).toEqual([
      "2025-01-13", "2025-01-14", "2025-01-15", "2025-01-16", "2025-01-17"
    ]);
  });

  it("should apply '4-on-2-off' preset correctly", () => {
    const result = applyPreset("4-on-2-off", startDate, endDate);
    expect(result).toEqual([
      "2025-01-13", "2025-01-14", "2025-01-15", "2025-01-16" // First 4 days
    ]);
  });

  it("should apply '5-on-2-off' preset correctly", () => {
    const result = applyPreset("5-on-2-off", startDate, endDate);
    expect(result).toEqual([
      "2025-01-13", "2025-01-14", "2025-01-15", "2025-01-16", "2025-01-17" // First 5 days
    ]);
  });

  it("should handle longer 4-on-2-off pattern", () => {
    const result = applyPreset("4-on-2-off", "2025-01-13", "2025-01-25");
    expect(result).toHaveLength(8); // 4 + 0 + 4 = 8 working days
    expect(result).toContain("2025-01-13");
    expect(result).toContain("2025-01-19"); // After 2 days off
  });
});

describe("formatCoverageSummary", () => {
  it("should format no selection correctly", () => {
    const result = formatCoverageSummary([], ["2025-01-13", "2025-01-14"]);
    expect(result).toBe("No coverage selected");
  });

  it("should format full selection correctly", () => {
    const dates = ["2025-01-13", "2025-01-14"];
    const result = formatCoverageSummary(dates, dates);
    expect(result).toBe("All 2 days");
  });

  it("should format partial selection correctly", () => {
    const selected = ["2025-01-13"];
    const total = ["2025-01-13", "2025-01-14", "2025-01-15"];
    const result = formatCoverageSummary(selected, total);
    expect(result).toBe("1 of 3 days");
  });
});

describe("getDayOfWeekName", () => {
  it("should return correct day names", () => {
    expect(getDayOfWeekName("2025-01-13")).toBe("Monday");
    expect(getDayOfWeekName("2025-01-19")).toBe("Sunday");
  });
});

describe("getDayOfWeekShort", () => {
  it("should return correct short day names", () => {
    expect(getDayOfWeekShort("2025-01-13")).toBe("Mon");
    expect(getDayOfWeekShort("2025-01-19")).toBe("Sun");
  });
});