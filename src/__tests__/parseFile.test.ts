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

    const xlsxModule = await import("xlsx");
    const workbook = xlsxModule.read(bytes, { type: "array" });
    expect(workbook.SheetNames).toHaveLength(1);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    expect(sheet).toBeTruthy();
    const rawRows = xlsxModule.utils.sheet_to_json<Record<string, unknown>>(sheet!, {
      defval: "",
      cellDates: true,
    });
    expect(rawRows).toHaveLength(1);
    expect(typeof rawRows[0]["Start Date"]).toBe("number");
    const serial = rawRows[0]["Start Date"] as number;
    const baseDate = new Date(Date.UTC(1899, 11, 30));
    const debugDate = new Date(baseDate.getTime() + Math.round(serial * 86_400_000));
    expect(debugDate.toISOString().slice(0, 10)).toBe("2024-01-15");

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
  });
});
