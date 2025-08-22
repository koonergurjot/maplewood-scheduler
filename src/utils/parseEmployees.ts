import type { Employee } from "../App";

const HEADERS = [
  "id",
  "firstName",
  "lastName",
  "classification",
  "status",
  "homeWing",
  "seniorityRank",
  "active",
] as const;

export function parseEmployeesFromText(text: string): Employee[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return [];
  }

  const header = lines[0].split(",").map((h) => h.trim());
  if (
    header.length !== HEADERS.length ||
    !HEADERS.every((h, i) => header[i] === h)
  ) {
    throw new Error(
      `Invalid CSV header. Expected "${HEADERS.join(",")}"`
    );
  }

  const employees: Employee[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const cells = row.split(",");
    if (cells.length !== HEADERS.length) {
      throw new Error(
        `Row ${i + 1} has ${cells.length} cells; expected ${HEADERS.length}.`
      );
    }
    const [
      id,
      firstName,
      lastName,
      classification,
      status,
      homeWing,
      seniorityRankStr,
      activeStr,
    ] = cells.map((c) => c.trim());
    const seniorityRank = Number(seniorityRankStr);
    if (Number.isNaN(seniorityRank)) {
      throw new Error(
        `Row ${i + 1} has invalid seniorityRank "${seniorityRankStr}".`
      );
    }
    const active = activeStr.toLowerCase() === "true";
    employees.push({
      id,
      firstName,
      lastName,
      classification: classification as Employee["classification"],
      status: status as Employee["status"],
      homeWing: homeWing || undefined,
      seniorityRank,
      active,
    });
  }
  return employees;
}

export async function parseEmployees(file: File): Promise<Employee[]> {
  const text = await file.text();
  return parseEmployeesFromText(text);
}
