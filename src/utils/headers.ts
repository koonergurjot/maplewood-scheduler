import { CLASSIFICATIONS } from "../types";
import type { Classification, Status } from "../types";

const HEADER_SANITIZE_REGEX = /[^a-z0-9]/gi;

export const EMPLOYEE_ID_HEADERS = [
  "EmployeeID",
  "Employee ID",
  "Payroll ID",
  "PayrollID",
  "ID",
  "Employee Number",
  "Employee #",
  "EmpID",
  "Emp ID",
  "EmployeeCode",
  "Employee Code",
];

export const FIRST_NAME_HEADERS = [
  "First Name",
  "FirstName",
  "Given Name",
  "Preferred Name",
  "Preferred First Name",
  "Legal First Name",
];

export const LAST_NAME_HEADERS = [
  "Last Name",
  "LastName",
  "Surname",
  "Family Name",
  "Legal Last Name",
];

export const FULL_NAME_HEADERS = [
  "Payroll Name",
  "Name",
  "Employee Name",
  "Full Name",
  "Employee",
  "Employee Full Name",
];

export const CLASSIFICATION_HEADERS = [
  "Job Title Description",
  "Job Title",
  "Classification",
  "Title",
];

export const STATUS_HEADERS = [
  "Position Status",
  "Status",
  "Employment Status",
  "Employee Status",
  "FT/PT",
  "Employment Type",
  "Type",
];

export const POSITION_STATUS_HEADERS = [
  "Position FTE Status",
  "FTE Status",
  "Position FTE",
];

export const ACTIVE_HEADERS = [
  "Active",
  "Is Active",
  "Currently Active",
  "Employment State",
  "On Leave",
];

export const HOME_WING_HEADERS = [
  "Home Wing",
  "Wing",
  "Home Department",
  "Department",
  "Home Unit",
];

export const SENIORITY_DATE_HEADERS = [
  "Seniority Date",
  "Start Date",
];

export const START_DATE_HEADERS = [
  "Start Date",
  "Start",
  "Hire Date",
  "Date Hired",
  "Employment Date",
  "Original Hire Date",
  "Seniority Date",
];

export const SENIORITY_HOURS_HEADERS = [
  "Total Seniority Hours as at",
  "Total Seniority Hours",
  "Seniority Hours",
  "SeniorityHours",
  "Total Hours",
  "Hours Worked",
  "Hours",
];

export const RANKING_HEADERS = ["Ranking", "Rank"];

export const SENIORITY_RANK_HEADERS = [
  "Seniority Rank",
  "Seniority Ranking",
  "Seniority",
  "Seniority Position",
  "Seniority Order",
  "Order",
  ...RANKING_HEADERS,
];

const CLASS_MAP: Array<{ re: RegExp; value: Classification }> = [
  {
    re: /\b(adp|adult\s*day\s*program)\b.*\b(rca|care\s*aide|psw|personal\s*support\s*worker|hca|health\s*care\s*aide|healthcare\s*aide)\b/i,
    value: "ADP RCA",
  },
  {
    re: /\badult\s*day\s*program\s*care\s*aide\b/i,
    value: "ADP RCA",
  },
  {
    re: /\badp\s*care\s*aide\b/i,
    value: "ADP RCA",
  },
  {
    re: /\b(adp|adult\s*day\s*program)\b.*\b(lpn|nurse|practical\s*nurse|rpn|registered\s*practical\s*nurse)\b/i,
    value: "ADP LPN",
  },
  {
    re: /\badult\s*day(time)?\s*(recreation|activity)\s*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\badp\s*recreation\s*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\badult\s*day\s*recreation\s*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\brecreation\s*\/\s*activity\s*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\brecreation[-\s]*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\bactivity[-\s]*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\brec\s*\/\s*activity[-\s]*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\brecreation\s*therap(ist|y)\b/i,
    value: "Recreation",
  },
  {
    re: /\brecreation[-\s]*therapy\b/i,
    value: "Recreation",
  },
  {
    re: /\brec\s*therapist\b/i,
    value: "Recreation",
  },
  {
    re: /\b(rehab|rehabilitation)\s*assistant\b/i,
    value: "Recreation",
  },
  {
    re: /\brehab[-\s]*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\brehabilitation[-\s]*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\bphysio[-\s]*aide\b/i,
    value: "Recreation",
  },
  {
    re: /\bota\s*\/\s*pta\b/i,
    value: "Recreation",
  },
  {
    re: /\blicensed\s*practical\s*nurse\b/i,
    value: "LPN",
  },
  {
    re: /\bL\.?P\.?N\.?\b/i,
    value: "LPN",
  },
  {
    re: /\b(R\.?P\.?N\.?|registered\s*practical\s*nurse)\b/i,
    value: "LPN",
  },
  {
    re: /\bpractical\s*nurse\b/i,
    value: "LPN",
  },
  {
    re: /\blpn\b/i,
    value: "LPN",
  },
  {
    re: /\bpractical\s*nurses?\b/i,
    value: "LPN",
  },
  {
    re: /\blicensed\s*practical\b/i,
    value: "LPN",
  },
  {
    re: /\bregistered\s*nurse\b/i,
    value: "RN",
  },
  {
    re: /\bR\.?N\.?\b/i,
    value: "RN",
  },
  {
    re: /\brn\b/i,
    value: "RN",
  },
  {
    re: /\bregistered\s*nurses?\b/i,
    value: "RN",
  },
  {
    re: /\b(care\s*aide|rca|resident\s*care\s*aide|psw|personal\s*support\s*worker|hca|health\s*care\s*aide|healthcare\s*aide)\b/i,
    value: "RCA",
  },
  {
    re: /\bresident[-\s]*care[-\s]*aide\b/i,
    value: "RCA",
  },
  {
    re: /\bH\.?C\.?A\.?\b/i,
    value: "RCA",
  },
  {
    re: /\bhealth[-\s]*care[-\s]*aide\b/i,
    value: "RCA",
  },
  {
    re: /\b(receptionist|front\s*desk|front\s*office)\b/i,
    value: "Receptionist",
  },
  {
    re: /\bessential\s*services?\b/i,
    value: "Essential Services",
  },
  {
    re: /\bessential\b/i,
    value: "Essential Services",
  },
];

const STATUS_SYNONYMS: Record<string, Status> = {
  ft: "FT",
  "fulltime": "FT",
  "full-time": "FT",
  "full time": "FT",
  pt: "PT",
  "parttime": "PT",
  "part-time": "PT",
  "part time": "PT",
  casual: "Casual",
  "cas": "Casual",
  "flex": "Casual",
  "casualflex": "Casual",
  "temporary": "Casual",
};

const NEGATIVE_ACTIVITY = new Set([
  "no",
  "n",
  "false",
  "0",
  "inactive",
  "terminated",
  "retired",
  "leave",
  "onleave",
  "loa",
  "on-leave",
  "on leave",
  "not active",
]);

const POSITIVE_ACTIVITY = new Set([
  "yes",
  "y",
  "true",
  "1",
  "active",
  "current",
]);

const sanitizeHeader = (header: string): string =>
  header.replace(HEADER_SANITIZE_REGEX, "").toLowerCase();

export function getFirst<T = unknown>(
  row: Record<string, unknown>,
  candidates: readonly string[],
  fallback?: T,
): unknown | T {
  const normalizedEntries = Object.entries(row ?? {}).map(
    ([key, value]) => [sanitizeHeader(key), value] as const,
  );
  const normalized = new Map<string, unknown>(normalizedEntries);
  const sanitizedCandidates: string[] = [];

  const isMeaningfulValue = (value: unknown): boolean =>
    value !== undefined &&
    value !== null &&
    (typeof value !== "string" || value.trim() !== "");

  for (const candidate of candidates) {
    const normalizedCandidate = sanitizeHeader(candidate);
    sanitizedCandidates.push(normalizedCandidate);

    if (!normalizedCandidate) continue;

    const value = normalized.get(normalizedCandidate);
    if (isMeaningfulValue(value)) {
      return value;
    }
  }

  const MIN_PARTIAL_MATCH_LENGTH = 10;

  for (const normalizedCandidate of sanitizedCandidates) {
    if (
      !normalizedCandidate ||
      normalizedCandidate.length < MIN_PARTIAL_MATCH_LENGTH
    ) {
      continue;
    }

    for (const [normalizedKey, value] of normalizedEntries) {
      if (
        !normalizedKey ||
        normalizedKey.length < MIN_PARTIAL_MATCH_LENGTH
      ) {
        continue;
      }

      if (
        normalizedKey.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedKey)
      ) {
        if (isMeaningfulValue(value)) {
          return value;
        }
      }
    }
  }

  return fallback;
}

export function splitName(name: unknown): { firstName: string; lastName: string } {
  const text = typeof name === "string" ? name.trim() : "";
  if (!text) {
    return { firstName: "", lastName: "" };
  }

  if (text.includes(",")) {
    const [last, first = ""] = text.split(",");
    return { firstName: first.trim(), lastName: last.trim() };
  }

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "", lastName: "" };
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function normalizeClassification(
  input: unknown,
): Classification | undefined {
  const raw = String(input ?? "").trim();
  if (!raw) return undefined;

  const s = raw.replace(/\s+/g, " ");
  for (const { re, value } of CLASS_MAP) {
    if (re.test(s)) {
      return value;
    }
  }

  if (/^\s*ADP\s*LPN\s*$/i.test(s)) return "ADP LPN";
  if (/^\s*ADP\s*(RCA|PSW|Care\s*Aide|HCA)\s*$/i.test(s)) return "ADP RCA";
  if (/^\s*ADP\s*$/i.test(s)) return "ADP RCA";
  if (/^\s*(LPN|RPN)\s*$/i.test(s)) return "LPN";
  if (/^\s*RN\s*$/i.test(s)) return "RN";
  if (/^\s*(RCA|PSW|HCA)\s*$/i.test(s)) return "RCA";
  if (/^\s*(REC|Recreation)\s*$/i.test(s)) return "Recreation";
  if (/^\s*Receptionist\s*$/i.test(s)) return "Receptionist";
  if (/^\s*Essential\s*Services?\s*$/i.test(s)) return "Essential Services";

  return undefined;
}

export function normalizeStatus(input: unknown): Status {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return "FT";

  const key = raw.toLowerCase();
  if (STATUS_SYNONYMS[key]) return STATUS_SYNONYMS[key];

  const compact = key.replace(/[^a-z0-9]/g, "");
  if (STATUS_SYNONYMS[compact]) return STATUS_SYNONYMS[compact];

  if (key.includes("full")) return "FT";
  if (compact.includes("fulltime")) return "FT";
  if (key.includes("part")) return "PT";
  if (compact.includes("parttime")) return "PT";
  if (key.includes("casual")) return "Casual";
  if (key.includes("flex")) return "Casual";
  if (compact.includes("flex")) return "Casual";

  return "FT";
}

export function normalizeActive(input: unknown): boolean {
  if (typeof input === "boolean") return input;
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return true;

  const lower = raw.toLowerCase();
  if (NEGATIVE_ACTIVITY.has(lower)) return false;

  const squashed = lower.replace(/\s+/g, "");
  if (NEGATIVE_ACTIVITY.has(squashed)) return false;

  if (POSITIVE_ACTIVITY.has(lower) || POSITIVE_ACTIVITY.has(squashed)) {
    return true;
  }

  if (lower.includes("leave")) return false;

  return true;
}
