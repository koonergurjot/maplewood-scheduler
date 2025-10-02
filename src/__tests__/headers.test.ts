import { describe, expect, it } from "vitest";
import {
  getFirst,
  normalizeActive,
  normalizeClassification,
  normalizeStatus,
  splitName,
} from "../utils/headers";
import { CLASSIFICATIONS } from "../types";
import { mapRowToEmployee } from "../App";

describe("header utilities", () => {
  it("gets values ignoring case, spacing, and punctuation", () => {
    const row = { " Payroll id ": "12345", "First Name": "Anna" };
    expect(getFirst(row, ["payroll id"])).toBe("12345");
    expect(getFirst(row, ["first name"])).toBe("Anna");
    expect(getFirst(row, ["missing"], "fallback")).toBe("fallback");
  });

  it("splits combined names", () => {
    expect(splitName("Doe, John")).toEqual({ firstName: "John", lastName: "Doe" });
    expect(splitName("Jane A Smith")).toEqual({ firstName: "Jane", lastName: "A Smith" });
    expect(splitName("Madonna")).toEqual({ firstName: "Madonna", lastName: "" });
  });

  it("normalizes classification synonyms", () => {
    expect(normalizeClassification("psw")).toBe("RCA");
    expect(normalizeClassification("ADP LPN")).toBe("ADP LPN");
    expect(normalizeClassification("unknown")).toBe(CLASSIFICATIONS[0]);
  });

  it("normalizes employment status labels", () => {
    expect(normalizeStatus("Full Time")).toBe("FT");
    expect(normalizeStatus("part-time")).toBe("PT");
    expect(normalizeStatus("cas")).toBe("Casual");
    expect(normalizeStatus(undefined)).toBe("FT");
  });

  it("normalizes activity including On Leave", () => {
    expect(normalizeActive("Yes")).toBe(true);
    expect(normalizeActive("no")).toBe(false);
    expect(normalizeActive("On Leave")).toBe(false);
    expect(normalizeActive(true)).toBe(true);
  });
});

describe("mapRowToEmployee", () => {
  it("maps typical spreadsheet rows to Employee objects", () => {
    const row: Record<string, unknown> = {
      EmployeeID: "001",
      "Employee Name": "Jane Doe",
      Classification: "psw",
      "Employment Status": "Part-Time",
      "On Leave": "On Leave",
      "Home Wing": "Shamrock",
      "Start Date": "2021-05-01",
      "Seniority Hours": "1,234.5",
      "Seniority Rank": "7",
    };

    const employee = mapRowToEmployee(row, 0);
    expect(employee).not.toBeNull();
    expect(employee?.id).toBe("001");
    expect(employee?.firstName).toBe("Jane");
    expect(employee?.lastName).toBe("Doe");
    expect(employee?.classification).toBe("RCA");
    expect(employee?.status).toBe("PT");
    expect(employee?.active).toBe(false);
    expect(employee?.activeLabel).toBe("On Leave");
    expect(employee?.homeWing).toBe("Shamrock");
    expect(employee?.startDate).toBe("2021-05-01");
    expect(employee?.seniorityRank).toBe(7);
    expect(employee?.seniorityHours).toBeCloseTo(1234.5);
  });

  it("prefers payroll ids, normalizes ADP, and defaults seniority rank", () => {
    const row: Record<string, unknown> = {
      "Payroll ID": "777",
      Name: "John Smith",
      Class: "ADP",
      Status: "Full-time",
      Active: "Yes",
    };

    const employee = mapRowToEmployee(row, 4);
    expect(employee).not.toBeNull();
    expect(employee?.id).toBe("777");
    expect(employee?.firstName).toBe("John");
    expect(employee?.lastName).toBe("Smith");
    expect(employee?.classification).toBe("ADP RCA");
    expect(employee?.status).toBe("FT");
    expect(employee?.seniorityRank).toBe(5);
    expect(employee?.active).toBe(true);
    expect(employee?.activeLabel).toBe("Active");
  });

  it("returns null for rows without ids or names", () => {
    expect(mapRowToEmployee({}, 0)).toBeNull();
  });
});
