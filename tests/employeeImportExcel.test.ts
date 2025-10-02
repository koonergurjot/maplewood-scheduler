import { Buffer } from "buffer";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import path from "path";
import { mapRowToEmployee, parseFile } from "../src/App";

const EXCEL_FIXTURE_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "employee.xlsx.base64",
);

const loadExcelFixture = () => {
  const base64 = readFileSync(EXCEL_FIXTURE_PATH, "utf8");
  const bytes = Buffer.from(base64, "base64");
  const array = Uint8Array.from(bytes);
  return array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
};

describe("employee Excel import", () => {
  it("maps Excel date cells to ISO YYYY-MM-DD strings", async () => {
    const fileBuffer = loadExcelFixture();
    const file = new File([fileBuffer], "employees.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const rows = await parseFile(file);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Start Date"]).toBe("2024-01-15");

    const employees = rows
      .map((row, index) => mapRowToEmployee(row, index))
      .filter((employee): employee is NonNullable<ReturnType<typeof mapRowToEmployee>> =>
        Boolean(employee),
      );

    expect(employees).toHaveLength(1);
    expect(employees[0]?.startDate).toBe("2024-01-15");
    expect(employees[0]?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
