import { CLASSIFICATIONS } from "../types";
import type { Classification, Status } from "../types";

const HEADER_SANITIZE_REGEX = /[^a-z0-9]/gi;

const CLASSIFICATION_SYNONYMS: Record<string, Classification> = {
  rca: "RCA",
  psw: "RCA",
  "personal support worker": "RCA",
  hca: "RCA",
  "health care aide": "RCA",
  "healthcare aide": "RCA",
  "care aide": "RCA",
  lpn: "LPN",
  rpn: "LPN",
  "registered practical nurse": "LPN",
  "licensed practical nurse": "LPN",
  rn: "RN",
  "registered nurse": "RN",
  rec: "Recreation",
  recreation: "Recreation",
  "recreation aide": "Recreation",
  "recreation assistant": "Recreation",
  receptionist: "Receptionist",
  "front desk": "Receptionist",
  "front office": "Receptionist",
  adp: "ADP RCA",
  "adp rca": "ADP RCA",
  "adp psw": "ADP RCA",
  "adp lpn": "ADP LPN",
  "adp nurse": "ADP LPN",
};

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
  candidates: string[],
  fallback?: T,
): unknown | T {
  const normalized = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row ?? {})) {
    normalized.set(sanitizeHeader(key), value);
  }

  for (const candidate of candidates) {
    const value = normalized.get(sanitizeHeader(candidate));
    if (
      value !== undefined &&
      value !== null &&
      (typeof value !== "string" || value.trim() !== "")
    ) {
      return value;
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

export function normalizeClassification(input: unknown): Classification {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return CLASSIFICATIONS[0];

  const exact = CLASSIFICATIONS.find(
    (option) => option.toLowerCase() === raw.toLowerCase(),
  );
  if (exact) return exact;

  const key = raw.toLowerCase();
  if (CLASSIFICATION_SYNONYMS[key]) {
    return CLASSIFICATION_SYNONYMS[key];
  }

  const normalizedKey = key.replace(/[^a-z0-9]/g, "");
  if (CLASSIFICATION_SYNONYMS[normalizedKey]) {
    return CLASSIFICATION_SYNONYMS[normalizedKey];
  }

  return CLASSIFICATIONS[0];
}

export function normalizeStatus(input: unknown): Status {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return "FT";

  const key = raw.toLowerCase();
  if (STATUS_SYNONYMS[key]) return STATUS_SYNONYMS[key];

  const compact = key.replace(/[^a-z0-9]/g, "");
  if (STATUS_SYNONYMS[compact]) return STATUS_SYNONYMS[compact];

  if (key.includes("full")) return "FT";
  if (key.includes("part")) return "PT";
  if (key.includes("casual")) return "Casual";

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
