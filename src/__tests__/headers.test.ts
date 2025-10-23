import { describe, expect, it } from "vitest";
import {
  getFirst,
  normalizeActive,
  normalizeClassification,
  normalizeStatus,
  SENIORITY_HOURS_HEADERS,
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

  it("matches dynamic headers with prefixes", () => {
    const row = {
      "Total Seniority Hours as at Sept 30, 2025": "1,234",
    };

    expect(getFirst(row, SENIORITY_HOURS_HEADERS)).toBe("1,234");
  });

  it("splits combined names", () => {
    expect(splitName("Doe, John")).toEqual({ firstName: "John", lastName: "Doe" });
    expect(splitName("Jane A Smith")).toEqual({ firstName: "Jane", lastName: "A Smith" });
    expect(splitName("Madonna")).toEqual({ firstName: "Madonna", lastName: "" });
  });

  it("normalizes classification synonyms", () => {
    expect(normalizeClassification("psw")).toBe("Care Aide");
    expect(normalizeClassification("Adult Day Program LPN")).toBe("Adult Day Program LPN");
    expect(normalizeClassification("Licensed Practical Nurse")).toBe(
      "Licensed Practical Nurse",
    );
    expect(normalizeClassification("Registered Nurse")).toBe("Registered Nurse");
    expect(normalizeClassification("Essential Services")).toBe(
      "Essential Services",
    );
    expect(normalizeClassification("unknown")).toBeUndefined();
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
    expect(employee?.classification).toBe("Care Aide");
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
    expect(employee?.classification).toBe("Adult Day Program RCA");
    expect(employee?.status).toBe("FT");
    expect(employee?.seniorityRank).toBe(5);
    expect(employee?.active).toBe(true);
    expect(employee?.activeLabel).toBe("Active");
  });

  it("returns null for rows without ids or names", () => {
    expect(mapRowToEmployee({}, 0)).toBeNull();
  });

  it("skips rows when ids and names are only whitespace", () => {
    const row: Record<string, unknown> = {
      EmployeeID: "   ",
      "First Name": "   ",
      "Last Name": " ",
    };

    expect(mapRowToEmployee(row, 2)).toBeNull();
  });

  it("normalizes whitespace, spaced numbers, and metadata", () => {
    const importedAt = "2024-05-28T12:34:56.000Z";
    const row: Record<string, unknown> = {
      EmployeeID: " ",
      Name: "  Doe,   Jane   ",
      Classification: " Registered   Nurse ",
      Status: " Full   Time ",
      Active: " yes  ",
      "Seniority Hours": " 1 234.5 ",
      "Seniority Rank": "  12 ",
    };

    const employee = mapRowToEmployee(row, 3, {
      fileName: "  staff upload.csv  ",
      importedAt,
    });

    expect(employee).not.toBeNull();
    expect(employee?.id).toBe("emp_3");
    expect(employee?.firstName).toBe("Jane");
    expect(employee?.lastName).toBe("Doe");
    expect(employee?.classification).toBe("Registered Nurse");
    expect(employee?.status).toBe("FT");
    expect(employee?.seniorityHours).toBeCloseTo(1234.5);
    expect(employee?.seniorityRank).toBe(12);
    expect(employee?.sourceFileName).toBe("staff upload.csv");
    expect(employee?.importedAt).toBe(importedAt);
  });

  it("handles payroll and FTE status headers", () => {
    const row: Record<string, unknown> = {
      "Payroll ID": "900",
      "Payroll Name": "Johnson, Alex",
      "Job Title Description": "Licensed Practical Nurse",
      "Position Status": "Permanent",
      "Position FTE Status": "Casual/Flex",
      Active: "Yes",
      "Seniority Date": 43845,
      "Total Seniority Hours as at Sept 30, 2025": "1,500",
      Ranking: "3",
    };

    const employee = mapRowToEmployee(row, 2);
    expect(employee).not.toBeNull();
    expect(employee?.id).toBe("900");
    expect(employee?.firstName).toBe("Alex");
    expect(employee?.lastName).toBe("Johnson");
    expect(employee?.classification).toBe("Licensed Practical Nurse");
    expect(employee?.status).toBe("Casual");
    expect(employee?.active).toBe(true);
    expect(employee?.startDate).toBe("2020-01-15");
    expect(employee?.seniorityHours).toBeCloseTo(1500);
    expect(employee?.seniorityRank).toBe(3);
  });
});
