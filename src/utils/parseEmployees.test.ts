import { describe, it, expect } from "vitest";
import { parseEmployees } from "./parseEmployees";

function makeFile(content: string) {
  return new File([content], "employees.csv", { type: "text/csv" });
}

describe("parseEmployees", () => {
  const validCsv = `id,firstName,lastName,classification,status,homeWing,seniorityRank,active\n1,John,Doe,RN,FT,Shamrock,1,true\n2,Jane,Smith,LPN,PT,Rosewood,2,false`;

  it("parses valid CSV", async () => {
    const file = makeFile(validCsv);
    const employees = await parseEmployees(file);
    expect(employees).toHaveLength(2);
    expect(employees[0]).toMatchObject({
      id: "1",
      firstName: "John",
      active: true,
    });
  });

  it("throws on invalid header", async () => {
    const file = makeFile("bad,header\n");
    await expect(parseEmployees(file)).rejects.toThrow(/Invalid CSV header/);
  });

  it("throws on malformed row", async () => {
    const file = makeFile(
      `id,firstName,lastName,classification,status,homeWing,seniorityRank,active\n1,John`
    );
    await expect(parseEmployees(file)).rejects.toThrow(/Row 2/);
  });
});
