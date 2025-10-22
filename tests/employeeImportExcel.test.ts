import { Buffer } from "buffer";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import path from "path";
import * as XLSX from "xlsx";
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
    expect(rows[0]["Start Date"]).not.toBeInstanceOf(Date);
    expect(rows[0]["Start Date"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const employees = rows
      .map((row, index) => mapRowToEmployee(row, index))
      .filter((employee): employee is NonNullable<ReturnType<typeof mapRowToEmployee>> =>
        Boolean(employee),
      );

    expect(employees).toHaveLength(1);
    expect(employees[0]?.startDate).toBe("2024-01-15");
    expect(employees[0]?.startDate).not.toBeInstanceOf(Date);
    expect(employees[0]?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("detects the seniority header row layout and maps employees", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["306", "Maplewood", "Seniority ending Sept 30, 2025"],
      [
        "Ranking",
        "Home Department Code",
        "Position ID",
        "Payroll Name",
        "Position Status",
        "Seniority Date",
        "Job Title Code",
        "Job Title Description",
        "Position FTE Status",
        "Total Seniority Hours as at Sept 30, 2025",
      ],
      [
        "1",
        "306",
        "60WU000023486",
        "Bhat, Renuka",
        "Active",
        "2017-06-22",
        "010052",
        "Care Aide",
        "FT",
        "15864.44",
      ],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Seniority");

    const base64 = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
    const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
    const file = new File([bytes], "seniority.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const rows = await parseFile(file);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Ranking"]).toBe("1");
    expect(rows[0]["Payroll Name"]).toBe("Bhat, Renuka");
    expect(rows[0]["Seniority ending Sept 30, 2025"]).toBeUndefined();

    const employees = rows
      .map((row, index) => mapRowToEmployee(row, index))
      .filter((employee): employee is NonNullable<ReturnType<typeof mapRowToEmployee>> =>
        Boolean(employee),
      );

    expect(employees).toHaveLength(1);
    const [employee] = employees;
    expect(employee?.firstName).toBe("Renuka");
    expect(employee?.lastName).toBe("Bhat");
    expect(employee?.status).toBe("FT");
    expect(employee?.classification).toBe("RCA");
    expect(employee?.seniorityHours).toBe(15864.44);
    expect(employee?.startDate).toBe("2017-06-22");
  });
});
