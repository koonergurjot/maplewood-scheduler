import { Buffer } from "buffer";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { mapRowToEmployee, parseFile } from "../App";

const EXCEL_FIXTURE_PATH = "tests/fixtures/employee.xlsx.base64";

const loadExcelFixture = () => {
  const base64 = readFileSync(EXCEL_FIXTURE_PATH, "utf8");
  return Uint8Array.from(Buffer.from(base64, "base64"));
};

describe("parseFile", () => {
  it("converts Excel date cells to ISO strings", async () => {
    const bytes = loadExcelFixture();
    const fileBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const file = new File([fileBuffer], "employees.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const rows = await parseFile(file);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Start Date"]).toBe("2024-01-15");
    expect(typeof rows[0]["Start Date"]).toBe("string");

    const employees = rows
      .map((row, index) => mapRowToEmployee(row, index))
      .filter((employee): employee is NonNullable<ReturnType<typeof mapRowToEmployee>> =>
        Boolean(employee),
      );

    expect(employees).toHaveLength(1);
    expect(employees[0]?.startDate).toBe("2024-01-15");
    expect(typeof employees[0]?.startDate).toBe("string");
    expect(employees[0]?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
