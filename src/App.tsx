import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Link } from "react-router-dom";
import { recommend, Recommendation } from "./recommend";
import type { OfferingTier } from "./offering/offeringMachine";
import type { Sheet2JSONOpts, WorkSheet } from "xlsx";
import {
  isoDate,
  combineDateTime,
  formatDateLong,
  formatDowShort,
  buildCalendar,
  prevMonth,
  nextMonth,
  minutesBetween,
} from "./lib/dates";
import { groupVacanciesByDate } from "./lib/vacancy";
import { matchText } from "./lib/text";
import { reorder } from "./utils/reorder";
import {
  ACTIVE_HEADERS,
  CLASSIFICATION_HEADERS,
  EMPLOYEE_ID_HEADERS,
  FIRST_NAME_HEADERS,
  FULL_NAME_HEADERS,
  HOME_WING_HEADERS,
  LAST_NAME_HEADERS,
  POSITION_STATUS_HEADERS,
  RANKING_HEADERS,
  SENIORITY_DATE_HEADERS,
  SENIORITY_HOURS_HEADERS,
  SENIORITY_RANK_HEADERS,
  START_DATE_HEADERS,
  STATUS_HEADERS,
  getFirst,
  normalizeActive,
  normalizeClassification,
  normalizeStatus,
  splitName,
} from "./utils/headers";
import { loadState, LS_KEY } from "./utils/storage";
import CoverageRangesPanel from "./components/CoverageRangesPanel";
import BulkAwardDialog from "./components/BulkAwardDialog";
import VacancyRangeForm from "./components/VacancyRangeForm";
import BundleRow from "./components/BundleRow";
import CoverageDaysModal from "./components/CoverageDaysModal";
import HeaderRowPickerModal from "./components/ImportDialog";
import VacancyRow from "./components/VacancyRow";
import VacancyDetail from "./components/VacancyDetail";
import OpenVacanciesRedesign from "./components/OpenVacanciesRedesign";
import SearchFilterBar from "./components/SearchFilterBar";
import { useVacancyFilters } from "./hooks/useVacancyFilters";
import { appConfig } from "./config";
import { CLASSIFICATIONS } from "./types";
import type { VacancyRange, VacancyStatus, BundleMode } from "./types";
export { OVERRIDE_REASONS } from "./types";
import Toast from "./components/ui/Toast";
import Button from "./components/ui/Button";
import FilterBar from "./components/ui/FilterBar";
import Modal from "./components/ui/Modal";
import EmployeeRow from "./components/EmployeeRow";
import useDeadlineMonitor from "./hooks/useDeadlineMonitor";
import { useSchedulerState } from "./hooks/useSchedulerState";
import useNotificationPrefs, {
  NotificationPreferences,
  NotificationChannel,
  NotificationLeadTimePreference,
  QuietHoursPreference,
} from "./state/useNotificationPrefs";
import type { DeadlineNotification } from "./types/notifications";
import RangeBidDialog from "./components/RangeBidDialog";
import { awardVacancyRange } from "./lib/vacancy-range-award";

/**
 * Maplewood Scheduler — Coverage-first (v2.3.0)
 *
 * New in v2.3.0 (per your request):
 * ✔ Live countdown timers on each vacancy row (color shifts to yellow/red as deadline nears)
 * ✔ Auto "knownAt" (already existed) + per-row “Reset timer” button for re-announcing
 * ✔ Sticky table header for Open Vacancies + scrollable panel; highlight the row that’s “due next”
 * ✔ Theme toggle (Dark/Light) + text size slider (great for wall displays)
 * ✔ Reason codes required when you override the recommendation (audit‑friendly trail)
 * ✔ Eligibility gate: block awards outside vacancy class (RCA/LPN/RN/Rec/Receptionist) unless “Allow class override” is checked
 * ✔ Open Vacancies layout reformatted to take most of the page and avoid cut‑off
 */

// ---------- Types ----------
export type Classification = (typeof CLASSIFICATIONS)[number];
export type Status = "FT" | "PT" | "Casual";

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  classification: Classification;
  status: Status;
  homeWing?: string; // not used for coverage now
  startDate?: string; // ISO YYYY-MM-DD
  seniorityHours?: number;
  seniorityRank: number; // 1 = most senior
  active: boolean;
  activeLabel: string;
  sourceFileName?: string;
  importedAt?: string;
};

export type Vacation = {
  id: string;
  employeeId: string;
  employeeName: string;
  classification: Classification;
  wing: string; // wing where the employee's shift is being covered
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  notes?: string;
  archived?: boolean;
  archivedAt?: string; // ISO
};

export type Vacancy = {
  id: string;
  vacationId?: string;
  bundleId?: string;
  bundleMode?: BundleMode;
  reason: string; // e.g. Vacation Backfill
  classification: Classification;
  wing?: string;
  date: string; // ISO date
  start?: string; // HH:mm
  end?: string; // HH:mm
  shiftDate: string; // ISO date
  shiftStart: string; // HH:mm
  shiftEnd: string; // HH:mm
  knownAt: string; // ISO datetime
  offeringTier: OfferingTier;
  offeringRoundStartedAt?: string;
  offeringRoundMinutes?: number;
  offeringAutoProgress?: boolean;
  offeringStep: "Casuals" | "OT-Full-Time" | "OT-Casuals";
  status: VacancyStatus | "Pending Award";
  awardedTo?: string; // employeeId
  awardedAt?: string; // ISO datetime
  awardReason?: string; // audit note when overriding recommendation or class
  overrideUsed?: boolean; // true if class override was toggled

  archived?: boolean;
  archivedAt?: string; // ISO datetime
};

export type Bid = {
  vacancyId: string;
  bidderEmployeeId: string;
  bidderName: string;
  bidderStatus: Status;
  bidderClassification: Classification;
  bidTimestamp: string; // ISO
  notes?: string;
  id?: string;
  employeeId?: string; // alias for bidderEmployeeId when auto-created
  createdAt?: string; // alias for bidTimestamp when auto-created
  source?: string;
};

export type Settings = {
  responseWindows: {
    lt2h: number;
    h2to4: number;
    h4to24: number;
    h24to72: number;
    gt72: number;
  };
  theme: "dark" | "light";
  fontScale: number; // 1.0 = 16px base; slider adjusts overall size
  tabOrder: string[];
  defaultShiftPreset: string;
};

// ---------- Constants ----------
const TAB_KEYS = [
  "coverage",
  "calendar",
  "bids",
  "employees",
  "archive",
  "alerts",
  "settings",
] as const;

const defaultSettings: Settings = {
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
  theme:
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  fontScale: 1,
  tabOrder: [...TAB_KEYS],
  defaultShiftPreset: "Day",
};

const WINGS = [
  "Shamrock",
  "Bluebell",
  "Rosewood",
  "Recreation",
  "Float",
  "Receptionist",
  "1 on 1",
] as const;

const SHIFT_PRESETS = [
  { label: "Day", start: "06:30", end: "14:30" },
  { label: "Evening", start: "14:30", end: "22:30" },
  { label: "Night", start: "22:30", end: "06:30" },
] as const;

const VACANT_EMPLOYEE_ID = "__vacant__";

type StagedDeleteSnapshot = {
  previousVacancies: Vacancy[];
  previousBids: Bid[];
  previousArchivedBids: Record<string, Bid[]>;
  previousSelectedIds: string[];
  message: string;
  timeout: ReturnType<typeof setTimeout>;
};

type PersistedState = {
  employees?: (Employee & { activeLabel?: string })[];
  vacations?: Vacation[];
  vacancies?: Vacancy[];
  bids?: Bid[];
  archivedBids?: Record<string, Bid[]>;
  settings?: Partial<Settings>;
  notificationPrefs?: NotificationPreferences;
  vacancyRanges?: VacancyRange[];
};

// ---------- Utils ----------

const displayVacancyLabel = (v: Vacancy) => {
  const d = formatDateLong(v.shiftDate);
  return `${d} • ${v.shiftStart}–${v.shiftEnd} • ${v.wing ?? ""} • ${v.classification}`.replace(
    /\s+•\s+$/,
    "",
  );
};

const HEADER_SANITIZE_REGEX = /[^a-z0-9]/gi;
const sanitizeHeaderKey = (header: string) =>
  header.replace(HEADER_SANITIZE_REGEX, "").toLowerCase();

const hasStatusToken = (value: unknown): boolean => {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, "");

  if (
    compact === "ft" ||
    compact === "full" ||
    compact === "pt" ||
    compact === "part" ||
    compact === "cas" ||
    compact === "casual" ||
    compact === "flex"
  ) {
    return true;
  }

  if (
    compact.includes("fulltime") ||
    compact.includes("parttime") ||
    compact.includes("casual") ||
    compact.includes("flex")
  ) {
    return true;
  }

  const tokens = lower
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) return false;

  return tokens.some((token) =>
    ["full", "ft", "part", "pt", "casual", "cas", "flex"].includes(token),
  );
};

const splitLastFirst = (
  full: unknown,
): { firstName: string; lastName: string } => {
  const text = typeof full === "string" ? full.trim() : "";
  if (!text) {
    return { firstName: "", lastName: "" };
  }

  if (text.includes(",")) {
    const [last, ...rest] = text.split(",");
    const first = rest.join(",");
    return { firstName: first.trim(), lastName: last.trim() };
  }

  return splitName(text);
};

export function mapRowToEmployee(
  row: Record<string, unknown>,
  index = 0,
  context?: { fileName?: string; importedAt?: string },
): Employee | null {
  if (!row || typeof row !== "object") return null;

  const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

  const collapseIfString = (value: unknown): unknown => {
    if (typeof value === "string") {
      const collapsed = collapseWhitespace(value);
      return collapsed.length > 0 ? collapsed : undefined;
    }
    return value === null || value === undefined ? undefined : value;
  };

  const cleanString = (value: unknown): string => {
    if (typeof value !== "string") return "";
    return collapseWhitespace(value);
  };

  const parseNumber = (value: unknown): number | undefined => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const normalized = trimmed.replace(/[\s,]+/g, "");
      if (!normalized) return undefined;
      const num = Number(normalized);
      return Number.isFinite(num) ? num : undefined;
    }
    return undefined;
  };

  const idRaw = getFirst(row, EMPLOYEE_ID_HEADERS);

  const firstNameRaw = getFirst(row, FIRST_NAME_HEADERS);
  const lastNameRaw = getFirst(row, LAST_NAME_HEADERS);

  let firstName = cleanString(firstNameRaw);
  let lastName = cleanString(lastNameRaw);

  const fullNameRaw = collapseIfString(getFirst(row, FULL_NAME_HEADERS));

  if (!firstName || !lastName) {
    const { firstName: combinedFirst, lastName: combinedLast } =
      splitLastFirst(fullNameRaw);

    if (!firstName && combinedFirst) {
      firstName = combinedFirst;
    }

    if (!lastName && combinedLast) {
      lastName = combinedLast;
    }
  }

  const hasName = Boolean(firstName || lastName);
  const idCandidate = (() => {
    if (typeof idRaw === "string") {
      const cleaned = collapseWhitespace(idRaw);
      return cleaned;
    }
    if (typeof idRaw === "number" && Number.isFinite(idRaw)) {
      return `${idRaw}`.trim();
    }
    return "";
  })();
  const id = idCandidate ? idCandidate : hasName ? `emp_${index}` : "";

  if (!id && !hasName) {
    return null;
  }

  const classificationRaw = collapseIfString(getFirst(row, CLASSIFICATION_HEADERS));
  const normalizedClassification = normalizeClassification(classificationRaw);
  const statusFromHeaders = collapseIfString(getFirst(row, STATUS_HEADERS));
  const positionStatusRaw = collapseIfString(getFirst(row, POSITION_STATUS_HEADERS));
  const statusRaw = statusFromHeaders ?? positionStatusRaw;
  const activeRaw = collapseIfString(getFirst(row, ACTIVE_HEADERS));
  const homeWingRaw = collapseIfString(getFirst(row, HOME_WING_HEADERS));
  const seniorityDateRaw = collapseIfString(getFirst(row, SENIORITY_DATE_HEADERS));
  const startDateRaw = collapseIfString(getFirst(row, START_DATE_HEADERS));
  const seniorityHoursRaw = collapseIfString(getFirst(row, SENIORITY_HOURS_HEADERS));
  const rankingRaw = collapseIfString(getFirst(row, RANKING_HEADERS));
  const seniorityRankRaw =
    rankingRaw !== undefined
      ? rankingRaw
      : collapseIfString(getFirst(row, SENIORITY_RANK_HEADERS));
  const seniorityRankValue = parseNumber(seniorityRankRaw);
  const seniorityHoursValue = parseNumber(seniorityHoursRaw);

  const parseDateValue = (value: unknown): string | undefined => {
    if (value instanceof Date) {
      return isoDate(value);
    }

    if (typeof value === "number") {
      const converted = excelSerialToDate(value);
      if (converted) {
        return isoDate(converted);
      }
      return undefined;
    }

    if (typeof value === "string") {
      const trimmed = collapseWhitespace(value);
      return trimmed ? trimmed : undefined;
    }

    return undefined;
  };

  let statusSource: unknown = statusFromHeaders;
  let status = normalizeStatus(statusRaw);

  if (!hasStatusToken(statusFromHeaders)) {
    if (
      positionStatusRaw !== undefined &&
      (statusFromHeaders === undefined || hasStatusToken(positionStatusRaw))
    ) {
      status = normalizeStatus(positionStatusRaw);
      statusSource = positionStatusRaw;
    }
  }

  const activeSource =
    activeRaw ?? statusSource ?? statusRaw ?? positionStatusRaw ?? statusFromHeaders;
  const active = normalizeActive(activeSource);

  const deriveActiveLabel = (): string => {
    const primaryRaw =
      typeof activeRaw === "string" && activeRaw ? activeRaw : "";
    const fallbackRaw =
      !primaryRaw &&
      !active &&
      typeof statusSource === "string" &&
      statusSource
        ? statusSource
        : "";
    const source = primaryRaw || fallbackRaw;
    if (!source) {
      return active ? "Active" : "Inactive";
    }

    const lower = source.toLowerCase();
    const squashed = lower.replace(/\s+/g, "");

    if (lower.includes("leave") || squashed === "loa") {
      return "On Leave";
    }

    if (["yes", "y", "true", "1", "active", "available"].includes(squashed)) {
      return "Active";
    }

    if (
      [
        "no",
        "n",
        "false",
        "0",
        "inactive",
        "notactive",
        "terminated",
        "retired",
        "suspended",
        "off",
      ].includes(squashed)
    ) {
      return "Inactive";
    }

    if (lower.includes("suspend")) return "Suspended";
    if (lower.includes("retire")) return "Retired";
    if (lower.includes("term")) return "Terminated";

    const words = source.split(/\s+/).filter(Boolean);
    if (!words.length) {
      return active ? "Active" : "Inactive";
    }

    return words
      .map((word) =>
        word.length <= 3
          ? word.toUpperCase()
          : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
      )
      .join(" ");
  };

  const employee: Employee = {
    id: id || `emp_${index}`,
    firstName,
    lastName,
    classification: normalizedClassification ?? CLASSIFICATIONS[0],
    status,
    homeWing:
      typeof homeWingRaw === "string" && homeWingRaw
        ? homeWingRaw
        : undefined,
    startDate:
      parseDateValue(seniorityDateRaw) ?? parseDateValue(startDateRaw) ?? undefined,
    seniorityHours: seniorityHoursValue,
    seniorityRank: seniorityRankValue ?? index + 1,
    active,
    activeLabel: deriveActiveLabel(),
  };

  const contextFileName =
    typeof context?.fileName === "string" && context.fileName.trim()
      ? context.fileName.trim()
      : undefined;
  const contextImportedAt =
    context?.importedAt ?? (contextFileName ? new Date().toISOString() : undefined);

  if (contextFileName) {
    employee.sourceFileName = contextFileName;
  }

  if (contextImportedAt) {
    employee.importedAt = contextImportedAt;
  }

  return employee;
}

const DATE_HEADER_HINTS = new Set(
  [
    ...START_DATE_HEADERS,
    ...SENIORITY_DATE_HEADERS,
    "End Date",
    "Date Hired",
    "Birth Date",
    "DOB",
    "Effective Date",
    "Date",
  ].map(sanitizeHeaderKey),
);

const DATETIME_HEADER_HINTS = new Set(
  [
    "Known At",
    "Archived At",
    "Awarded At",
    "Created At",
    "Updated At",
    "Bid Timestamp",
  ].map(sanitizeHeaderKey),
);

const EXCEL_EXTENSIONS = [".xlsx", ".xlsm", ".xlsb", ".xls"];
const EXCEL_MIME_SUBSTRINGS = ["spreadsheetml", "ms-excel"];
type ExtendedSheet2JSONOpts = Sheet2JSONOpts & {
  cellDates?: boolean;
  raw?: boolean;
};

const EXCEL_SHEET_TO_JSON_OPTIONS: ExtendedSheet2JSONOpts = {
  defval: "",
  cellDates: true,
  raw: false,
};

type SSF$DateCode = {
  y?: number;
  m?: number;
  d?: number;
  H?: number;
  M?: number;
  S?: number;
  u?: number;
  [key: string]: unknown;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXCEL_SERIAL_EPOCH_MS = Date.UTC(1899, 11, 30);

const excelSerialToDate = (
  serial: number,
  xlsx?: typeof import("xlsx"),
): Date | null => {
  if (!Number.isFinite(serial)) return null;

  if (xlsx) {
    const parsed = xlsx.SSF.parse_date_code(serial) as SSF$DateCode | Date | null;
    if (parsed) {
      if (parsed instanceof Date) {
        return parsed;
      }

      const { y, m, d, H, M, S, u } = parsed;
      if (
        typeof y === "number" &&
        typeof m === "number" &&
        typeof d === "number"
      ) {
        const seconds = typeof S === "number" ? Math.floor(S) : 0;
        const fractionalSeconds = typeof S === "number" ? S - seconds : 0;
        const millisFromSeconds = Math.round(fractionalSeconds * 1000);
        const extraMillis = typeof u === "number" ? Math.round(u / 1000) : 0;

        const date = new Date(
          Date.UTC(
            y,
            (m ?? 1) - 1,
            d ?? 1,
            H ?? 0,
            M ?? 0,
            seconds,
            millisFromSeconds,
          ),
        );
        if (!Number.isNaN(date.getTime()) && extraMillis) {
          date.setUTCMilliseconds(date.getUTCMilliseconds() + extraMillis);
        }

        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }

  const millis = Math.round(serial * MS_PER_DAY);
  const date = new Date(EXCEL_SERIAL_EPOCH_MS + millis);
  return Number.isNaN(date.getTime()) ? null : date;
};

const shouldHandleAsDateLike = (normalized: string) =>
  DATE_HEADER_HINTS.has(normalized) ||
  DATETIME_HEADER_HINTS.has(normalized) ||
  normalized.startsWith("date") ||
  normalized.endsWith("date");

const shouldFormatAsDateTime = (normalized: string) =>
  DATETIME_HEADER_HINTS.has(normalized) ||
  normalized.includes("time") ||
  normalized.includes("timestamp") ||
  normalized.endsWith("at");

const formatDateValue = (date: Date, normalized: string) =>
  shouldFormatAsDateTime(normalized)
    ? date.toISOString()
    : date.toISOString().slice(0, 10);

const coerceExcelDateValue = (
  value: unknown,
  normalizedKey: string,
  xlsx?: typeof import("xlsx"),
): string | undefined => {
  if (value instanceof Date) {
    return formatDateValue(value, normalizedKey);
  }

  if (typeof value === "number") {
    const converted = excelSerialToDate(value, xlsx);
    if (converted) {
      return formatDateValue(converted, normalizedKey);
    }
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateValue(parsed, normalizedKey);
    }
  }

  return undefined;
};

const normalizeRowDateValues = (
  row: Record<string, unknown>,
  xlsx?: typeof import("xlsx"),
): Record<string, unknown> => {
  const normalizedEntries = Object.entries(row).map(([key, value]) => {
    const normalizedKey = sanitizeHeaderKey(key);
    if (!shouldHandleAsDateLike(normalizedKey)) {
      return [key, value];
    }

    const coerced = coerceExcelDateValue(value, normalizedKey, xlsx);
    return coerced ? [key, coerced] : [key, value];
  });

  return Object.fromEntries(normalizedEntries);
};

const normalizeExcelRowDates = (
  row: Record<string, unknown>,
  xlsx: typeof import("xlsx"),
) => normalizeRowDateValues(row, xlsx);

const normalizeRowDates = (row: Record<string, unknown>) =>
  normalizeRowDateValues(row);

const blobToArrayBuffer = async (blob: Blob): Promise<ArrayBuffer> => {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }

  if (typeof FileReader !== "undefined") {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsArrayBuffer(blob);
    });
  }

  if (typeof Response !== "undefined") {
    return new Response(blob).arrayBuffer();
  }

  throw new Error("Unable to convert blob to ArrayBuffer");
};

export interface ExcelHeaderPreviewRow {
  index: number;
  values: unknown[];
}

export interface ExcelHeaderPreview {
  totalRows: number;
  rows: ExcelHeaderPreviewRow[];
}

export const isExcelFile = (file: File): boolean => {
  const lowerName = file.name?.toLowerCase() ?? "";
  const mime = file.type?.toLowerCase?.() ?? "";

  return (
    EXCEL_EXTENSIONS.some((ext) => lowerName.endsWith(ext)) ||
    EXCEL_MIME_SUBSTRINGS.some((substr) => mime.includes(substr))
  );
};

type ExcelSheetContext = {
  XLSX: typeof import("xlsx");
  sheet: WorkSheet;
};

const loadFirstWorksheet = async (
  file: File,
): Promise<ExcelSheetContext | null> => {
  const XLSX = await import("xlsx");
  const arrayBuffer = await blobToArrayBuffer(file);
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return null;

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return null;

  return { XLSX, sheet };
};

const toArrayRow = (row: unknown): unknown[] =>
  Array.isArray(row) ? (row as unknown[]) : [];

const getHeaderMatrix = (
  XLSX: typeof import("xlsx"),
  sheet: WorkSheet,
): unknown[][] => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  return rows.map(toArrayRow);
};

const normalizeHeaderValue = (value: unknown) =>
  String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findHeaderRowIndex = (rows: unknown[][]): number | null => {
  const headerTokens = [
    "Payroll Name",
    "Position Status",
    "Seniority Date",
    "Job Title",
    "Job Title Description",
    "Position FTE Status",
    "Total Seniority Hours",
    "Ranking",
  ].map(normalizeHeaderValue);

  const searchLimit = Math.min(rows.length, 20);
  for (let i = 0; i < searchLimit; i += 1) {
    const row = rows[i];
    const normalizedRowValues = new Set(
      row
        .map(normalizeHeaderValue)
        .filter((value) => value.length > 0),
    );

    let matchCount = 0;
    for (const token of headerTokens) {
      if (token && normalizedRowValues.has(token)) {
        matchCount += 1;
        if (matchCount >= 2) {
          return i;
        }
      }
    }
  }

  return null;
};

export async function getExcelHeaderPreview(
  file: File,
  limit = 10,
): Promise<ExcelHeaderPreview> {
  if (!isExcelFile(file)) {
    return { totalRows: 0, rows: [] };
  }

  const context = await loadFirstWorksheet(file);
  if (!context) {
    return { totalRows: 0, rows: [] };
  }

  const { XLSX, sheet } = context;
  const matrix = getHeaderMatrix(XLSX, sheet);
  const totalRows = matrix.length;
  const rows = matrix.slice(0, limit).map((values, index) => ({
    index,
    values,
  }));

  return { totalRows, rows };
}

export async function parseFile(
  file: File,
  opts?: { headerRow?: number },
): Promise<Record<string, unknown>[]> {
  if (isExcelFile(file)) {
    const context = await loadFirstWorksheet(file);
    if (!context) return [];

    const { XLSX, sheet } = context;
    const matrix = getHeaderMatrix(XLSX, sheet);

    const manualHeaderRow = opts?.headerRow;
    const headerRowIndex =
      typeof manualHeaderRow === "number" &&
      Number.isInteger(manualHeaderRow) &&
      manualHeaderRow >= 0
        ? manualHeaderRow
        : findHeaderRowIndex(matrix);

    if (
      headerRowIndex !== null &&
      headerRowIndex >= 0 &&
      headerRowIndex < matrix.length
    ) {
      const headerRowValues = toArrayRow(matrix[headerRowIndex]);
      const dataRows = matrix.slice(headerRowIndex + 1).map(toArrayRow);

      const objects = dataRows.map((rowValues) => {
        const o: Record<string, unknown> = {};
        headerRowValues.forEach((headerValue, i) => {
          if (!headerValue) return;
          const key = String(headerValue).trim();
          if (!key) return;
          o[key] = rowValues[i];
        });
        return o;
      });

      return objects.map((row) => normalizeExcelRowDates(row, XLSX));
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      sheet,
      {
        ...EXCEL_SHEET_TO_JSON_OPTIONS,
        cellDates: true,
        raw: false,
      } as ExtendedSheet2JSONOpts,
    );

    return rawRows.map((row) => normalizeExcelRowDates(row, XLSX));
  }

  const text = await file.text();
  const { parseCSV } = await import("./utils/csv");
  return parseCSV(text);
}

function pickWindowMinutes(v: Vacancy, settings: Settings) {
  const known = new Date(v.knownAt);
  const shiftStart = combineDateTime(v.shiftDate, v.shiftStart);
  const hrsUntilShift = (shiftStart.getTime() - known.getTime()) / 3_600_000;
  if (hrsUntilShift < 2) return settings.responseWindows.lt2h;
  if (hrsUntilShift < 4) return settings.responseWindows.h2to4;
  if (hrsUntilShift < 24) return settings.responseWindows.h4to24;
  if (hrsUntilShift < 72) return settings.responseWindows.h24to72;
  return settings.responseWindows.gt72;
}

function deadlineFor(v: Vacancy, settings: Settings) {
  const winMin = pickWindowMinutes(v, settings);
  return new Date(new Date(v.knownAt).getTime() + winMin * 60000);
}

export const applyAwardVacancy = (
  vacs: Vacancy[],
  vacId: string,
  payload: { empId?: string; reason?: string; overrideUsed?: boolean },
): Vacancy[] => {
  const empId = payload.empId === "EMPTY" ? undefined : payload.empId;
  return vacs.map<Vacancy>((v) =>
    v.id === vacId
      ? {
          ...v,
          status: "Awarded",
          awardedTo: empId,
          awardedAt: new Date().toISOString(),
          awardReason: payload.reason,
          overrideUsed: !!payload.overrideUsed,
        }
      : v,
  );
};

export const applyAwardVacancies = (
  vacs: Vacancy[],
  vacIds: string[],
  payload: { empId?: string; reason?: string; overrideUsed?: boolean },
): Vacancy[] => {
  return vacIds.reduce(
    (prev, id) => applyAwardVacancy(prev, id, payload),
    vacs,
  );
};

export const archiveBidsForVacancy = (
  bids: Bid[],
  archived: Record<string, Bid[]>,
  vacancyId: string,
): { bids: Bid[]; archivedBids: Record<string, Bid[]> } => {
  const remaining: Bid[] = [];
  const moved: Bid[] = [];
  for (const b of bids) {
    if (b.vacancyId === vacancyId) moved.push(b);
    else remaining.push(b);
  }
  if (!moved.length) return { bids: remaining, archivedBids: archived };
  return {
    bids: remaining,
    archivedBids: {
      ...archived,
      [vacancyId]: [...(archived[vacancyId] ?? []), ...moved],
    },
  };
};

// ---------- Main App ----------
export default function App() {
  const persisted = loadState<PersistedState>() ?? null;
  const [tab, setTab] = useState<typeof TAB_KEYS[number]>("coverage");

  const {
    employees,
    setEmployees,
    vacations,
    setVacations,
    vacancies,
    setVacancies,
    bids,
    setBids,
    archivedBids,
    setArchivedBids,
    settings: schedulerSettings,
    setSettings,
    employeesById,
    vacancyRanges,
    setVacancyRanges,
  } = useSchedulerState();
  const [selectedVacancyIds, setSelectedVacancyIds] = useState<string[]>([]);
  const [bulkAwardOpen, setBulkAwardOpen] = useState(false);
  const [bundleUndo, setBundleUndo] = useState<{
    snapshot: Vacancy[];
    message: string;
    timeout: number;
  } | null>(null);
  const [stagedDelete, setStagedDelete] = useState<StagedDeleteSnapshot | null>(
    null,
  );
  const [importToast, setImportToast] = useState<
    { message: string; timeout: ReturnType<typeof setTimeout> } | null
  >(null);
  const [activeVacancyId, setActiveVacancyId] = useState<string | null>(null);
  const [showRangeForm, setShowRangeForm] = useState(false);
  const [activeRangeBid, setActiveRangeBid] = useState<VacancyRange | null>(null);
  // Modal system (confirm/prompt/alert)
  const [confirmState, setConfirmState] = useState<
    | { open: true; title: string; body: string; resolve: (ok: boolean) => void }
    | null
  >(null);
  const [promptState, setPromptState] = useState<
    | {
        open: true;
        title: string;
        body: string;
        placeholder?: string;
        value: string;
        resolve: (val: string | null) => void;
      }
    | null
  >(null);
  const [alertState, setAlertState] = useState<
    | { open: true; title: string; body: string; resolve: () => void }
    | null
  >(null);

  const showConfirm = (body: string, title = "Confirm"): Promise<boolean> => {
    const shouldUseNative =
      typeof window !== "undefined" &&
      typeof window.confirm === "function" &&
      Boolean((window.confirm as any)?.mock);
    if (shouldUseNative) {
      return Promise.resolve(window.confirm(body));
    }
    return new Promise((resolve) =>
      setConfirmState({ open: true, title, body, resolve }),
    );
  };
  const showPrompt = (
    body: string,
    title = "Enter value",
    placeholder = "",
  ): Promise<string | null> => {
    const shouldUseNative =
      typeof window !== "undefined" &&
      typeof window.prompt === "function" &&
      Boolean((window.prompt as any)?.mock);
    if (shouldUseNative) {
      const res = window.prompt(body, placeholder ?? "");
      return Promise.resolve(res === null ? null : res);
    }
    return new Promise((resolve) =>
      setPromptState({ open: true, title, body, placeholder, value: "", resolve }),
    );
  };
  const showAlert = (body: string, title = "Notice"): Promise<void> =>
    new Promise((resolve) => setAlertState({ open: true, title, body, resolve }));

  const showImportHeadersToast = (
    headers: string[],
    prefix = "Unable to import employees.",
  ) => {
    const unique = Array.from(
      new Set(
        headers
          .map((header) =>
            typeof header === "string" ? header.trim() : String(header ?? ""),
          )
          .filter((header) => header.length > 0),
      ),
    );
    const base = prefix.replace(/\.*$/, "");
    const message = unique.length
      ? `${base}. Detected headers: ${unique.join(", ")}`
      : `${base}. No recognizable headers detected.`;
    setImportToast((prev) => {
      if (prev?.timeout) clearTimeout(prev.timeout);
      const timeout = setTimeout(() => {
        setImportToast((current) =>
          current?.timeout === timeout ? null : current,
        );
      }, 8000);
      return { message, timeout };
    });
  };

  useEffect(() => {
    return () => {
      if (importToast?.timeout) {
        clearTimeout(importToast.timeout);
      }
    };
  }, [importToast]);

  // expose helpers for non-App children that cannot receive props easily
  (window as any).appShowConfirm = showConfirm;
  (window as any).appShowPrompt = showPrompt;
  (window as any).appShowAlert = showAlert;
  const storedOrder = schedulerSettings.tabOrder ?? [];
  const mergedOrder = useMemo(
    () => [
      ...storedOrder,
      ...TAB_KEYS.filter((k) => !storedOrder.includes(k)),
    ],
    [storedOrder],
  );
  const settings = useMemo<Settings>(
    () => ({
      ...defaultSettings,
      ...schedulerSettings,
      tabOrder: mergedOrder,
    }),
    [schedulerSettings, mergedOrder],
  );

  const {
    notificationPrefs,
    toggleChannel: toggleNotificationChannel,
    updateChannel: updateNotificationChannel,
    updateLeadTime: updateNotificationLeadTime,
    setQuietHours: setNotificationQuietHours,
  } = useNotificationPrefs(persisted?.notificationPrefs);

  const [filterWing, setFilterWing] = useState<string>("");
  const [filterClass, setFilterClass] = useState<Classification | "">("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCountdown, setFilterCountdown] = useState<string>("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Vacancy[] | null>(null);

  // Tick for countdowns
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const {
    notifications,
    latestNotification,
    unreadCount,
    acknowledgeNotification,
    acknowledgeAll,
  } = useDeadlineMonitor({
    vacancies,
    settings,
    notificationPrefs,
    now,
    formatVacancy: displayVacancyLabel,
  });

  useEffect(() => {
    if (tab === "alerts") {
      acknowledgeAll();
    }
  }, [tab, acknowledgeAll]);

  const activeVacancy = useMemo(
    () => vacancies.find((v) => v.id === activeVacancyId) ?? null,
    [vacancies, activeVacancyId],
  );

  const handleOpenVacancyDetail = (id: string) => {
    setActiveVacancyId(id);
  };

  const handleCloseVacancyDetail = () => {
    setActiveVacancyId(null);
  };

  const handleVacancyDetailUpdate = (id: string, patch: Partial<Vacancy>) => {
    setVacancies((prev) =>
      prev.map((vacancy) => (vacancy.id === id ? { ...vacancy, ...patch } : vacancy)),
    );
  };

  // Recommendation: choose among eligible bidders with highest seniority (rank 1 best)
  const recommendations = useMemo<Record<string, Recommendation>>(() => {
    const m: Record<string, Recommendation> = {};
    vacancies.forEach((v) => {
      m[v.id] = recommend(v, bids, employeesById);
    });
    return m;
  }, [vacancies, bids, employeesById]);

  // Auto-archive vacations when all their vacancies are awarded
  useEffect(() => {
    const byVacation = new Map<string, Vacancy[]>();
    vacancies.forEach((v) => {
      if (v.vacationId) {
        const a = byVacation.get(v.vacationId) || [];
        a.push(v);
        byVacation.set(v.vacationId, a);
      }
    });
    setVacations((prev) =>
      prev.map((vac) => {
        const list = byVacation.get(vac.id) || [];
        const allFilled =
          list.length > 0 &&
          list.every((x) => x.status === "Filled" || x.status === "Awarded");
        if (allFilled && !vac.archived)
          return {
            ...vac,
            archived: true,
            archivedAt: new Date().toISOString(),
          };
        return vac;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancies]);

  const defaultShift = useMemo(
    () =>
      SHIFT_PRESETS.find((p) => p.label === settings.defaultShiftPreset) ||
      SHIFT_PRESETS[0],
    [settings.defaultShiftPreset],
  );

  // Coverage form state
  const [newVacay, setNewVacay] = useState<
    Partial<
      Vacation & { shiftStart: string; shiftEnd: string; shiftPreset: string }
    >
  >({
    wing: WINGS[0],
    shiftStart: defaultShift.start,
    shiftEnd: defaultShift.end,
    shiftPreset: defaultShift.label,
  });

  useEffect(() => {
    setNewVacay((v) => ({
      ...v,
      shiftStart: defaultShift.start,
      shiftEnd: defaultShift.end,
      shiftPreset: defaultShift.label,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultShift]);

  const vacDateRef = useRef<HTMLInputElement>(null);
  const vacStartRef = useRef<HTMLInputElement>(null);
  const vacEndRef = useRef<HTMLInputElement>(null);
  const handleDateFieldClick = (ref: RefObject<HTMLInputElement>) => {
    ref.current?.focus();
    ref.current?.showPicker();
  };

  const [vacationFormKey, setVacationFormKey] = useState(0);
  const [multiDay, setMultiDay] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [coverage, setCoverage] = useState<{
    selectedDates?: string[];
    perDayTimes?: Record<string, { start: string; end: string }>;
    perDayWing?: Record<string, string>;
  } | null>(null);
  const [awardAsBlock, setAwardAsBlock] = useState(true);

  const dayCount = useMemo(() => {
    if (!newVacay.startDate || !newVacay.endDate) return 0;
    const allDays = dateRangeInclusive(newVacay.startDate, newVacay.endDate);
    const chosen =
      coverage?.selectedDates?.length ? coverage.selectedDates : allDays;
    return chosen.length;
  }, [newVacay.startDate, newVacay.endDate, coverage]);

  useEffect(() => {
    if (dayCount >= 2) setAwardAsBlock(true);
  }, [dayCount]);

  // Actions
  const addVacationAndGenerate = (
    v: Partial<
      Vacation & { shiftStart: string; shiftEnd: string; shiftPreset: string }
    >,
  ) => {
    // Validate required fields and guide the user with specifics
    const missing: string[] = [];
    if (!v.employeeId || !v.employeeName) missing.push("Employee");
    if (!v.wing) missing.push("Wing");
    if (!v.shiftStart || !v.shiftEnd) missing.push("Shift start/end");
    if (!v.startDate) missing.push("Start date");
    if (!v.endDate) missing.push("End date");
    if (!v.classification) missing.push("Classification");
    if (missing.length) {
      (window as any).appShowAlert?.(`Missing: ${missing.join(", ")}`);
      return;
    }
    const vac: Vacation = {
      id: `vac_${Date.now().toString(36)}`,
      employeeId: v.employeeId!,
      employeeName: v.employeeName!,
      classification: v.classification!,
      wing: v.wing!,
      startDate: v.startDate!,
      endDate: v.endDate!,
      notes: v.notes ?? "",
      archived: false,
    };
    setVacations((prev) => [vac, ...prev]);

    // explode the range into daily vacancies
    const days =
      coverage?.selectedDates?.length
        ? coverage.selectedDates
        : dateRangeInclusive(v.startDate!, v.endDate!);
    const isMulti = days.length >= 2;
    const singleAward = isMulti; // always bundle multi-day vacancies as one-person blocks
    const bid = singleAward ? crypto.randomUUID() : undefined;
    if (bid) console.debug("[bundle] created", bid, { days: days.length });
    const nowISO = new Date().toISOString();
    const vxs: Vacancy[] = days.map((d) => ({
      id: crypto.randomUUID(),
      vacationId: vac.id,
      ...(singleAward
        ? { bundleId: bid, bundleMode: "one-person" as const }
        : {}),
      reason: "Vacation Backfill",
      classification: vac.classification,
      wing: coverage?.perDayWing?.[d] ?? v.wing!,
      date: d,
      start:
        coverage?.perDayTimes?.[d]?.start ??
        (v.shiftStart ?? defaultShift.start),
      end:
        coverage?.perDayTimes?.[d]?.end ??
        (v.shiftEnd ?? defaultShift.end),
      shiftDate: d,
      shiftStart:
        coverage?.perDayTimes?.[d]?.start ??
        (v.shiftStart ?? defaultShift.start),
      shiftEnd:
        coverage?.perDayTimes?.[d]?.end ??
        (v.shiftEnd ?? defaultShift.end),
      knownAt: nowISO,
      offeringTier: "CASUALS",
      offeringRoundStartedAt: nowISO,
      offeringRoundMinutes: 120,
      offeringAutoProgress: true,
      offeringStep: "Casuals",
      status: "Open" as const,
    }));
    setVacancies((prev) => [...vxs, ...prev]);
    setCoverage(null);

    setNewVacay((prev) => ({
      // Preserve employee and classification so you can quickly add another for the same person
      employeeId: prev.employeeId,
      employeeName: prev.employeeName,
      classification: prev.classification,
      // Keep wing and shift selections; clear dates and notes
      wing: prev.wing ?? WINGS[0],
      shiftStart: prev.shiftStart ?? defaultShift.start,
      shiftEnd: prev.shiftEnd ?? defaultShift.end,
      shiftPreset: prev.shiftPreset ?? defaultShift.label,
      startDate: "",
      endDate: "",
      notes: "",
    }));
    setMultiDay(false);
  };

  const handleSaveRange = (range: VacancyRange, awardAsBlock: boolean) => {
    setVacancyRanges((prev) => [...prev, { ...range, awardAsBlock }]);
  };

  const handleSubmitRangeBid = (bid: Bid) => {
    setBids((prev) => [...prev, bid]);
  };

  const handleAwardRange = async (range: VacancyRange) => {
    const rangeId = range.id;
    const currentRange = vacancyRanges.find((r) => r.id === rangeId) ?? range;
    const rangeBids = bids.filter((b) => b.vacancyId === rangeId);
    if (!rangeBids.length) {
      const ok = await showConfirm(
        "No bids recorded for this range. Create vacancies anyway?",
        "No bids on range",
      );
      if (!ok) return;
    }
    const outcome = awardVacancyRange(currentRange, rangeBids, employees);
    if (outcome.vacancies.length) {
      setVacancies((prev) => [...outcome.vacancies, ...prev]);
    }
    setVacancyRanges((prev) => prev.filter((r) => r.id !== rangeId));
    if (outcome.archivedBids.length) {
      setArchivedBids((prev) => ({
        ...prev,
        [rangeId]: [...(prev[rangeId] ?? []), ...outcome.archivedBids],
      }));
      setBids((prev) => prev.filter((b) => b.vacancyId !== rangeId));
    }
  };

  const archiveBids = (vacancyIds: string[]) => {
    const now = new Date().toISOString();
    setVacancies((prev) =>
      prev.map((v) =>
        vacancyIds.includes(v.id)
          ? { ...v, archived: true, archivedAt: now }
          : v,
      ),
    );
    setBids((prev) => {
      const remaining: Bid[] = [];
      const archiveMap: Record<string, Bid[]> = {};
      for (const b of prev) {
        if (vacancyIds.includes(b.vacancyId)) {
          (archiveMap[b.vacancyId] ||= []).push(b);
        } else {
          remaining.push(b);
        }
      }
      if (Object.keys(archiveMap).length) {
        setArchivedBids((prevMap) => {
          const m = { ...prevMap } as Record<string, Bid[]>;
          for (const [vid, arr] of Object.entries(archiveMap)) {
            m[vid] = [...(m[vid] || []), ...arr];
          }
          return m;
        });
      }
      return remaining;
    });
  };

  const ensureBundleBids = (bundleVacancies: Vacancy[], employeeId: string) => {
    const nowISO = new Date().toISOString();
    const emp = employeesById[employeeId];
    const toAdd: Bid[] = [];
    for (const v of bundleVacancies) {
      const has = bids.some(
        (b) => b.vacancyId === v.id && b.bidderEmployeeId === employeeId,
      );
      if (!has) {
        toAdd.push({
          id: `BID-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          vacancyId: v.id,
          bidderEmployeeId: employeeId,
          bidderName: emp ? `${emp.firstName} ${emp.lastName}`.trim() : "",
          bidderStatus: emp?.status ?? "FT",
          bidderClassification: emp?.classification ?? v.classification,
          bidTimestamp: nowISO,
          employeeId,
          createdAt: nowISO,
          source: "bundle-award",
        });
      }
    }
    if (toAdd.length) setBids((prev) => [...prev, ...toAdd]);
  };

  const applyAwardBundle = (
    bundleId: string,
    employeeId: string,
    reason?: string,
  ) => {
    const empId = employeeId === "EMPTY" ? undefined : employeeId;
    setVacancies((prev) =>
      prev.map((v) =>
        v.bundleId === bundleId
          ? {
              ...v,
              status: "Awarded",
              awardedTo: empId,
              awardedAt: new Date().toISOString(),
              awardReason: reason,
            }
          : v,
      ),
    );
  };

  const awardBundle = async (bundleId: string, employeeId: string) => {
    const kids = vacancies.filter(
      (v) => v.bundleId === bundleId && v.status === "Open",
    );
    if (!kids.length) return;

    const cls = kids[0].classification;
    if (!kids.every((v) => v.classification === cls)) {
      await (window as any).appShowAlert?.("Bundle has mixed classifications; fix before awarding.");
      return;
    }

    // Use first day of the bundle for response timing and conflict prompts
    const conflictDays = kids
      .filter((v) =>
        vacancies.some(
          (o) =>
            o.id !== v.id &&
            o.shiftDate === v.shiftDate &&
            (o.status === "Filled" || o.status === "Awarded") &&
            o.awardedTo === employeeId,
        ),
      )
      .map((v) => formatDateLong(v.shiftDate));
    let reason: string | undefined;
    if (conflictDays.length) {
      const msg = `Employee already assigned on:\n${conflictDays.join("\n")}\nOverride and award bundle?`;
      const ok = await showConfirm(msg, "Override required");
      if (!ok) return;
      const rc = await showPrompt("Enter reason code for override", "Reason code");
      if (!rc) return;
      reason = rc;
    }
    const snapshot = kids.map((k) => ({ ...k }));
    ensureBundleBids(kids, employeeId);
    applyAwardBundle(bundleId, employeeId, reason || "Bundle award");
    archiveBids(kids.map((v) => v.id));

    const emp = employeesById[employeeId];
    const name = emp ? `${emp.firstName} ${emp.lastName}`.trim() : employeeId;
    if (bundleUndo?.timeout) clearTimeout(bundleUndo.timeout);
    const timeout = window.setTimeout(() => setBundleUndo(null), 10000);
    setBundleUndo({
      snapshot,
      message: `Awarded bundle (${kids.length} days) to ${name}.`,
      timeout,
    });
  };

  const undoBundleAward = () => {
    if (!bundleUndo) return;
    clearTimeout(bundleUndo.timeout);
    const map = new Map(bundleUndo.snapshot.map((v) => [v.id, v]));
    setVacancies((prev) => prev.map((v) => map.get(v.id) || v));
    setBundleUndo(null);
  };

  const awardVacancy = async (
    vacId: string,
    payload: {
      empId?: string;
      reason?: string;
      overrideUsed?: boolean;
      skipConflictCheck?: boolean;
    },
  ) => {
    const target = vacancies.find((v) => v.id === vacId);
    if (payload.empId && payload.empId !== "EMPTY" && target) {
      if (target.bundleMode === "one-person" && target.bundleId) {
        const kids = vacancies.filter(
          (v) => v.bundleId === target.bundleId && v.status === "Open",
        );
        const emp = employeesById[payload.empId];
        const name = emp
          ? `${emp.firstName} ${emp.lastName}`.trim()
          : payload.empId;
        const days = kids.length;
        const ok = await showConfirm(
          `Award all days in this bundle to ${name}? (${days} days)`,
          "Award bundle",
        );
        if (!ok) return;
        awardBundle(target.bundleId, payload.empId);
        return;
      }
      if (!payload.skipConflictCheck) {
        const conflict = vacancies.some(
          (v) =>
            v.id !== vacId &&
            v.shiftDate === target.shiftDate &&
            (v.status === "Filled" || v.status === "Awarded") &&
            v.awardedTo === payload.empId,
        );
        if (conflict) {
          const ok = await showConfirm(
            `Employee already assigned on ${formatDateLong(target.shiftDate)}. Continue?`,
            "Potential conflict",
          );
          if (!ok) return;
        }
      }
    }
    setVacancies((prev) => applyAwardVacancy(prev, vacId, payload));
    archiveBids([vacId]);
  };

  const resetKnownAt = (vacId: string) => {
    setVacancies((prev) =>
      prev.map((v) =>
        v.id === vacId ? { ...v, knownAt: new Date().toISOString() } : v,
      ),
    );
  };

  const resetBundleKnownAt = (bundleId: string) => {
    const nowISO = new Date().toISOString();
    setVacancies((prev) =>
      prev.map((v) =>
        v.bundleId === bundleId ? { ...v, knownAt: nowISO } : v,
      ),
    );
  };

  const stageDeleteVacancies = (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));
    if (!uniqueIds.length) return;

    const previousVacancies = [...vacancies];
    const previousBids = [...bids];
    const previousArchivedBids = { ...archivedBids };
    const previousSelectedIds = [...selectedVacancyIds];
    const toRemove = previousVacancies.filter((v) => uniqueIds.includes(v.id));
    if (!toRemove.length) return;

    setActiveVacancyId((curr) =>
      curr && uniqueIds.includes(curr) ? null : curr,
    );

    if (stagedDelete?.timeout) {
      clearTimeout(stagedDelete.timeout);
    }

    const remainingVacancies = previousVacancies.filter(
      (v) => !uniqueIds.includes(v.id),
    );
    const remainingBids = previousBids.filter(
      (b) => !uniqueIds.includes(b.vacancyId),
    );
    const nextArchivedBids = { ...archivedBids };
    uniqueIds.forEach((id) => {
      if (id in nextArchivedBids) {
        delete nextArchivedBids[id];
      }
    });

    setVacancies(remainingVacancies);
    setBids(remainingBids);
    setArchivedBids(nextArchivedBids);
    setSelectedVacancyIds((ids) => ids.filter((id) => !uniqueIds.includes(id)));

    const message =
      toRemove.length > 1 ? `${toRemove.length} vacancies deleted.` : "Vacancy deleted.";

    const timeout = setTimeout(() => {
      setStagedDelete((current) => {
        if (!current || current.timeout !== timeout) return current;
        return null;
      });
    }, 5000);

    setStagedDelete({
      previousVacancies,
      previousBids,
      previousArchivedBids,
      previousSelectedIds,
      message,
      timeout,
    });
  };

  const undoDelete = () => {
    setStagedDelete((prev) => {
      if (!prev) return prev;
      clearTimeout(prev.timeout);
      setVacancies(prev.previousVacancies);
      setBids(prev.previousBids);
      setArchivedBids(prev.previousArchivedBids);
      setSelectedVacancyIds(prev.previousSelectedIds);
      return null;
    });
  };

  const deleteVacancy = (vacId: string) => {
    stageDeleteVacancies([vacId]);
  };

  // Figure out which open vacancy is "due next" (soonest positive deadline)
  const dueNextId = useMemo(() => {
    let min = Infinity;
    let id: string | null = null;
    for (const v of vacancies) {
      if (v.status === "Filled" || v.status === "Awarded") continue;
      const dl = deadlineFor(v, settings).getTime() - now;
      if (dl > 0 && dl < min) {
        min = dl;
        id = v.id;
      }
    }
    return id;
  }, [vacancies, now, settings]);

  const openVacancies = useMemo(() => {
    const passes = (v: Vacancy) => {
      if (filterWing && v.wing !== filterWing) return false;
      if (filterClass && v.classification !== filterClass) return false;
      if (filterShift) {
        const preset = SHIFT_PRESETS.find((p) => p.label === filterShift);
        if (preset && (v.shiftStart !== preset.start || v.shiftEnd !== preset.end))
          return false;
      }
      if (filterCountdown) {
        const msLeft = deadlineFor(v, settings).getTime() - now;
        const winMin = pickWindowMinutes(v, settings);
        const sinceKnownMin = minutesBetween(
          new Date(),
          new Date(v.knownAt),
        );
        const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
        let cdClass = "green";
        if (msLeft <= 0) cdClass = "red";
        else if (pct < 0.25) cdClass = "yellow";
        if (filterCountdown !== cdClass) return false;
      }
      if (filterStart && v.shiftDate < filterStart) return false;
      if (filterEnd && v.shiftDate > filterEnd) return false;
      return true;
    };

    const groups: Record<string, Vacancy[]> = {};
    for (const v of vacancies) {
      if (v.status === "Filled" || v.status === "Awarded") continue;
      const key = v.bundleId || v.id;
      (groups[key] ||= []).push(v);
    }
    const out: Vacancy[] = [];
    for (const arr of Object.values(groups)) {
      if (arr.some(passes)) out.push(...arr);
    }
    return out;
  }, [
    vacancies,
    filterWing,
    filterClass,
    filterShift,
    filterCountdown,
    filterStart,
    filterEnd,
    now,
    settings,
  ]);

  const toggleAllVacancies = (checked: boolean) => {
    setSelectedVacancyIds(checked ? openVacancies.map((v) => v.id) : []);
  };

  // Group vacancies by bundleId
  const groups = useMemo(() => {
    const by: Record<string, Vacancy[]> = {};
    for (const v of openVacancies) {
      const key = v.bundleId || "";
      if (!key) continue;
      (by[key] ||= []).push(v);
    }
    return by;
  }, [openVacancies]);

  type Row =
    | { type: "bundle"; key: string; items: Vacancy[] }
    | { type: "single"; key: string; item: Vacancy };

  // Create display rows: bundles for groups with 2+ items, singles otherwise
  const rows: Row[] = useMemo(() => {
    const bundledKeys = Object.keys(groups).filter((k) => groups[k].length >= 2);
    const r: Row[] = [];
    for (const k of bundledKeys) r.push({ type: "bundle", key: k, items: groups[k] });
    for (const v of openVacancies) {
      const k = v.bundleId || "";
      if (!k || (groups[k]?.length ?? 0) < 2)
        r.push({ type: "single", key: v.id, item: v });
    }
    r.sort((a, b) => {
      const aTime =
        a.type === "bundle"
          ? Math.min(
              ...a.items.map((x) =>
                combineDateTime(x.shiftDate, x.shiftStart).getTime(),
              ),
            )
          : combineDateTime(a.item.shiftDate, a.item.shiftStart).getTime();
      const bTime =
        b.type === "bundle"
          ? Math.min(
              ...b.items.map((x) =>
                combineDateTime(x.shiftDate, x.shiftStart).getTime(),
              ),
            )
          : combineDateTime(b.item.shiftDate, b.item.shiftStart).getTime();
      return aTime - bTime;
    });
    return r;
  }, [groups, openVacancies]);

  // Helpers for selection & delete (operate on many ids)
  const toggleMany = (ids: string[]) => {
    setSelectedVacancyIds((prev) => {
      const set = new Set(prev);
      const allSelected = ids.every((id) => set.has(id));
      if (allSelected) ids.forEach((id) => set.delete(id));
      else ids.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const stageDeleteMany = (ids: string[]) => {
    stageDeleteVacancies(ids);
  };

  const splitBundle = (ids: string[]) => {
    setVacancies((prev) =>
      prev.map((v) =>
        ids.includes(v.id)
          ? { ...v, bundleId: undefined, bundleMode: undefined }
          : v,
      ),
    );
  };

  return (
    <div
      className="app"
      data-theme={settings.theme}
      style={{ fontSize: `${(settings.fontScale || 1) * 16}px` }}
    >
      <style>{`
        /* Themes */
        :root{ --baseRadius:14px; --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px; --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --elev-1: 0 2px 4px rgba(0,0,0,.06); --elev-2: 0 6px 12px rgba(0,0,0,.08); --focus-ring: 2px solid var(--brand); }
        .app{min-height:100vh;min-height:100dvh;background:linear-gradient(180deg,var(--bg1),var(--bg2));color:var(--text);font-family:'Nunito',system-ui,Arial,sans-serif;padding:calc(18px + env(safe-area-inset-top)) 0 calc(18px + env(safe-area-inset-bottom)) 0}
        @supports(-webkit-touch-callout:none){.app{min-height:-webkit-fill-available}}
        [data-theme="dark"]{ --bg1:#0b1220; --bg2:#1a2433; --card:#111a29; --cardAlt:#1b2738; --stroke:#2a3a52; --text:#f2f6fb; --muted:#c7d2e0; --brand:#0d9488; --accent:#34d399; --ok:#22c55e; --warn:#f59e0b; --bad:#ef4444; /* extends base palette */ --chipBg:#24334a; --chipText:#e7eef7; }
        [data-theme="light"]{ --bg1:#f7fbff; --bg2:#ffffff; --card:#ffffff; --cardAlt:#f7fafc; --stroke:#e5eef7; --text:#0f172a; --muted:#475569; --brand:#047857; --accent:#10b981; --ok:#16a34a; --warn:#b45309; --bad:#b91c1c; /* extends base palette */ --chipBg:#eaf3ff; --chipText:#0f172a; }

        *{box-sizing:border-box}
        :focus-visible{ outline: var(--focus-ring); outline-offset: 2px; border-radius: var(--radius-sm); }
        .wrap-anywhere{ overflow-wrap:anywhere; word-break:break-word; }
        body,html,#root{height:100%;margin:0;-webkit-text-size-adjust:100%}
        .container{max-width:min(100%,1600px); margin:0 auto; padding:0 18px}
        .nav{display:flex;align-items:center;gap:12px;justify-content:space-between;margin-bottom:14px}
        .title{font-size:22px;font-weight:800}
        
        
        @media(max-width:900px){.nav{flex-direction:column;align-items:flex-start;gap:8px}}
        .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px}
        .tab{padding:8px 12px;border-radius:12px;border:1px solid var(--stroke);cursor:pointer;background:var(--cardAlt);font-weight:600;color:var(--text)}
        .tab.active{border-color:var(--brand);background:var(--brand);color:#fff;box-shadow:0 0 0 2px var(--brand) inset}
        .grid{display:grid;gap:12px}
        .grid2{grid-template-columns:1fr}
        @media (min-width: 768px){ .grid2{ grid-template-columns:1fr 1fr; } }
        @media (min-width: 1280px){ .grid2{ grid-template-columns:1fr 1fr 1fr; } }
        .card{background:var(--card);border:1px solid var(--stroke);border-radius:var(--baseRadius);overflow:visible;box-shadow:var(--elev-1);transition:box-shadow .2s,transform .2s}
        .card:hover{box-shadow:var(--elev-2);transform:translateY(-2px)}
        .card-h{padding:10px 14px;border-bottom:1px solid var(--stroke);font-weight:800;display:flex;align-items:center;justify-content:space-between}
        .card-c{padding:14px}
        input:not([type="checkbox"]),select,textarea{width:100%;background:var(--cardAlt);border:1px solid var(--stroke);border-radius:10px;padding:10px;color:var(--text);-webkit-appearance:none;appearance:none}
        input[type="checkbox"]{accent-color:var(--brand)}
        input::placeholder{color:#cbd5e1}
        input[type=date]{cursor:pointer}
        input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer}
        .row{display:grid;gap:10px}
        .cols2{grid-template-columns:1fr} @media(min-width:900px){.cols2{grid-template-columns:1fr 1fr}}
        .ok{color:var(--ok)} .warn{color:var(--warn)} .bad{color:var(--bad)}

        /* Calendar */
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:8px}
        .cal-dow{opacity:.85;font-size:12px;text-align:center;color:var(--muted);font-weight:700}
        .cal-day{border:1px solid var(--stroke);border-radius:10px;padding:8px;min-height:92px;background:var(--cardAlt);display:flex;flex-direction:column}
        .cal-day.mute{opacity:.45}
        .cal-day.today{border-color:var(--brand)}
        .cal-day.selected{box-shadow:0 0 0 2px var(--brand) inset}
        .cal-num{font-weight:800;margin-bottom:6px}
        .cal-open{margin-top:auto;font-size:12px}
        .cal-chip{display:inline-block;border:1px solid var(--stroke);border-radius:999px;padding:2px 6px;margin-right:6px;margin-bottom:6px}

        /* Vacancies table header sticks to viewport while the whole page scrolls */
        .vac-table thead th{position:sticky; top:0; background:var(--card); z-index:2}

        /* Countdown chips */
        .cd-chip{display:inline-block; padding:4px 8px; border-radius:999px; border:1px solid var(--stroke); font-weight:700}
        .cd-green{background:rgba(22,163,74,.12)}
        .cd-yellow{background:rgba(245,158,11,.12)}
        .cd-red{background:rgba(239,68,68,.12)}

        /* Due next highlight */
        .due-next{ box-shadow: 0 0 0 2px var(--brand) inset; }
      `}</style>

      <div className="container">
        <div className="nav">
          <div>
            <div className="title">Maplewood Scheduler</div>
          </div>
          <div className="toolbar">
            <button
              className="btn"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  theme: s.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              {settings.theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <Link to="/audit-log" className="btn">
              Audit Log
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="subtitle">Text size</span>
              <input
                type="range"
                min={0.85}
                max={1.6}
                step={0.05}
                value={settings.fontScale}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    fontScale: Number(e.target.value),
                  }))
                }
              />
            </div>
            <button
              className="btn"
              onClick={() => {
                const blob = new Blob(
                  [
                    JSON.stringify(
                      {
                        employees,
                        vacations,
                        vacancies,
                        bids,
                        archivedBids,
                        settings,
                        notificationPrefs,
                      },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "maplewood-scheduler-backup.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </button>
            <Button
              onClick={async () => {
                const ok = await showConfirm("Reset ALL data?", "Reset");
                if (!ok) return;
                localStorage.removeItem(LS_KEY);
                location.reload();
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="tabs">
          {settings.tabOrder.map((k) => (
            <button
              key={k}
              className={`tab ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k as any)}
            >
              {k[0].toUpperCase() + k.slice(1)}
              {k === "alerts" && unreadCount > 0 && (
                <span
                  className="pill"
                  style={{
                    marginLeft: 6,
                    background: "var(--bad)",
                    color: "#fff",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "coverage" && (
          <>
            <CoverageRangesPanel
              ranges={vacancyRanges}
              bids={bids}
              onBid={(range) => setActiveRangeBid(range)}
              onAward={handleAwardRange}
            />
            <div className="grid">
            <div className="card">
              <div className="card-h">
                Add Vacation (auto-creates daily vacancies)
              </div>
              <div className="card-c">
                <div className="row cols2">
                  <div>
                    <label>Employee</label>
                    <EmployeeCombo
                      key={vacationFormKey}
                      employees={employees}
                      includeVacant
                      onSelect={(id) => {
                        const e = employees.find((x) => x.id === id);
                        setNewVacay((v) => ({
                          ...v,
                          employeeId: id,
                          employeeName:
                            id === VACANT_EMPLOYEE_ID
                              ? "Vacant/Empty"
                              : e
                              ? `${e.firstName} ${e.lastName}`
                              : "",
                          classification: (e?.classification ??
                            v.classification ??
                            CLASSIFICATIONS[0]) as Classification,
                        }));
                      }}
                    />
                  </div>
                  {newVacay.employeeId === VACANT_EMPLOYEE_ID && (
                    <div>
                      <label>Classification</label>
                      <select
                        value={newVacay.classification ?? CLASSIFICATIONS[0]}
                        onChange={(e) =>
                          setNewVacay((v) => ({
                            ...v,
                            classification: e.target.value as Classification,
                          }))
                        }
                      >
                        {CLASSIFICATIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label>Wing / Unit</label>
                    <select
                      value={newVacay.wing ?? WINGS[0]}
                      onChange={(e) =>
                        setNewVacay((v) => ({ ...v, wing: e.target.value }))
                      }
                    >
                      {WINGS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      )          
        )}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label
                      className={`toggle-box${!multiDay ? " checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={!multiDay}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setMultiDay(!checked);
                          setNewVacay((v) => ({
                            ...v,
                            endDate: !checked ? "" : v.startDate,
                          }));
                        }}
                      />
                      <span className="toggle-indicator" />
                      {!multiDay ? "1 day" : ">1 day"}
                    </label>
                  </div>
                  {!multiDay && (
                    <div
                      style={{ gridColumn: "1 / -1" }}
                      onClick={() => handleDateFieldClick(vacDateRef)}
                    >
                      <label htmlFor="vac-date">Date</label>
                      <input
                        ref={vacDateRef}
                        id="vac-date"
                        type="date"
                        value={newVacay.startDate ?? ""}
                        onChange={(e) =>
                          setNewVacay((v) => ({
                            ...v,
                            startDate: e.target.value,
                            endDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                  {multiDay && (
                    <>
                      <div onClick={() => handleDateFieldClick(vacStartRef)}>
                        <label htmlFor="vac-start">Start Date</label>
                        <input
                          ref={vacStartRef}
                          id="vac-start"
                          type="date"
                          value={newVacay.startDate ?? ""}
                          onChange={(e) =>
                            setNewVacay((v) => ({
                              ...v,
                              startDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div onClick={() => handleDateFieldClick(vacEndRef)}>
                        <label htmlFor="vac-end">End Date</label>
                        <input
                          ref={vacEndRef}
                          id="vac-end"
                          type="date"
                          value={newVacay.endDate ?? ""}
                          onChange={(e) =>
                            setNewVacay((v) => ({ ...v, endDate: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}
                  {multiDay && appConfig.features.coverageDayPicker && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setCoverageOpen(true);
                      }}
                    >
                      Edit coverage days
                    </button>
                  )}
                  {dayCount >= 2 && (
                    <label
                      style={{ gridColumn: "1 / -1" }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={awardAsBlock}
                        onChange={(e) => setAwardAsBlock(e.target.checked)}
                      />
                      <span>
                        Award the entire block to one person ({dayCount} days)
                      </span>
                    </label>
                  )}
                  <div>
                    <label>Shift</label>
                    <select
                      value={newVacay.shiftPreset ?? defaultShift.label}
                      onChange={(e) => {
                        const preset = SHIFT_PRESETS.find(
                          (p) => p.label === e.target.value,
                        );
                        if (preset) {
                          setNewVacay((v) => ({
                            ...v,
                            shiftPreset: preset.label,
                            shiftStart: preset.start,
                            shiftEnd: preset.end,
                          }));
                        } else {
                          setNewVacay((v) => ({ ...v, shiftPreset: "Custom" }));
                        }
                      }}
                    >
                      {SHIFT_PRESETS.map((p) => (
                        <option key={p.label} value={p.label}>
                          {p.label} ({p.start}–{p.end})
                        </option>
                      ))}
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  {newVacay.shiftPreset === "Custom" && (
                    <>
                      <div>
                        <label>Shift Start</label>
                        <input
                          type="time"
                          value={newVacay.shiftStart ?? ""}
                          onChange={(e) =>
                            setNewVacay((v) => ({
                              ...v,
                              shiftStart: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label>Shift End</label>
                        <input
                          type="time"
                          value={newVacay.shiftEnd ?? ""}
                          onChange={(e) =>
                            setNewVacay((v) => ({
                              ...v,
                              shiftEnd: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label>Notes</label>
                    <textarea
                      placeholder="Optional"
                      onChange={(e) =>
                        setNewVacay((v) => ({ ...v, notes: e.target.value }))
                      }
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                    <button
                      className="btn"
                      onClick={() => addVacationAndGenerate(newVacay)}
                    >
                      Add & Generate
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        setNewVacay({
                          wing: WINGS[0],
                          shiftStart: defaultShift.start,
                          shiftEnd: defaultShift.end,
                          shiftPreset: defaultShift.label,
                        });
                        setVacationFormKey(prev => prev + 1);
                      }}
                    >
                      Clear Form
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-h">Open Vacancies</div>
              <div className="card-c">
                {appConfig.features.vacancyListRedesign ? (
                  <>
                    {selectedVacancyIds.length > 0 && (
                      <div
                        style={{
                          marginBottom: 8,
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <button
                          className="btn btn-sm"
                          onClick={() => setBulkAwardOpen(true)}
                        >
                          Bulk Award
                        </button>
                        <span className="badge">
                          {selectedVacancyIds.length} selected
                        </span>
                      </div>
                    )}
                    <OpenVacanciesRedesign
                      vacancies={vacancies}
                      employees={employees}
                      vacations={vacations}
                      settings={settings}
                      selectedIds={selectedVacancyIds}
                      dueNextId={dueNextId}
                      onToggleSelect={(id) =>
                        setSelectedVacancyIds((ids) =>
                          ids.includes(id)
                            ? ids.filter((x) => x !== id)
                            : [...ids, id],
                        )
                      }
                      onToggleSelectMany={toggleMany}
                      onDelete={deleteVacancy}
                      onDeleteMany={stageDeleteMany}
                      awardVacancy={awardVacancy}
                      awardBundle={awardBundle}
                      onSplitBundle={splitBundle}
                      resetKnownAt={resetKnownAt}
                      resetBundleKnownAt={resetBundleKnownAt}
                      onOpenDetail={handleOpenVacancyDetail}
                      recommendations={recommendations}
                    />
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        marginBottom: 8,
                        display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        openVacancies.length > 0 &&
                        selectedVacancyIds.length === openVacancies.length
                      }
                      onChange={(e) => toggleAllVacancies(e.target.checked)}
                    />
                    All
                  </label>
                  <Button size="sm" onClick={() => setFiltersOpen((o) => !o)}>
                    {filtersOpen ? "Hide Filters ▲" : "Show Filters ▼"}
                  </Button>
                  {appConfig.features.coverageDayPicker && (
                    <button
                      className="btn btn-sm"
                      onClick={() => setShowRangeForm(true)}
                    >
                      New Multi-Day Vacancy
                    </button>
                  )}
                  {selectedVacancyIds.length > 0 && (
                    <>
                      <button
                        className="btn btn-sm"
                        onClick={() => setBulkAwardOpen(true)}
                      >
                        Bulk Award
                      </button>
                      <span className="badge">
                        {selectedVacancyIds.length} selected
                      </span>
                    </>
                  )}
                </div>
                {filtersOpen && (
                  <FilterBar
                    style={{ marginBottom: 8 }}
                    items={[
                      {
                        type: "select",
                        key: "wing",
                        options: [{ value: "", label: "All Wings" }, ...WINGS.map((w) => ({ value: w, label: w }))],
                      },
                      {
                        type: "select",
                        key: "class",
                        options: [
                          { value: "", label: "All Classes" },
                          ...CLASSIFICATIONS.map((c) => ({
                            value: c,
                            label: c,
                          })),
                        ],
                      },
                      {
                        type: "select",
                        key: "shift",
                        options: [{ value: "", label: "All Shifts" }, ...SHIFT_PRESETS.map((s) => ({ value: s.label, label: s.label }))],
                      },
                      {
                        type: "select",
                        key: "countdown",
                        options: [
                          { value: "", label: "All Countdowns" },
                          { value: "green", label: "Green" },
                          { value: "yellow", label: "Yellow" },
                          { value: "red", label: "Red" },
                        ],
                      },
                      { type: "date", key: "start" },
                      { type: "date", key: "end" },
                    ]}
                    values={{
                      wing: filterWing,
                      class: filterClass,
                      shift: filterShift,
                      countdown: filterCountdown,
                      start: filterStart,
                      end: filterEnd,
                    }}
                    onChange={(key, value) => {
                      if (key === "wing") setFilterWing(value);
                      else if (key === "class") setFilterClass(value as Classification | "");
                      else if (key === "shift") setFilterShift(value);
                      else if (key === "countdown") setFilterCountdown(value);
                      else if (key === "start") setFilterStart(value);
                      else if (key === "end") setFilterEnd(value);
                    }}
                    onClear={() => {
                      setFilterWing("");
                      setFilterClass("");
                      setFilterShift("");
                      setFilterCountdown("");
                      setFilterStart("");
                      setFilterEnd("");
                    }}
                  />
                )}
                <table className="vac-table responsive-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Select all vacancies"
                          checked={
                            openVacancies.length > 0 &&
                            selectedVacancyIds.length === openVacancies.length
                          }
                          onChange={(e) =>
                            toggleAllVacancies(e.target.checked)
                          }
                        />
                      </th>
                      <th>Details</th>
                      <th>Countdown</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      if (row.type === "bundle") {
                        return (
                          <BundleRow
                            key={`bundle-${row.key}`}
                            groupId={row.key}
                            items={row.items}
                            employees={employees}
                            settings={settings}
                            recommendations={recommendations}
                            selectedIds={selectedVacancyIds}
                            onToggleSelectMany={toggleMany}
                            onDeleteMany={stageDeleteMany}
                            onSplitBundle={splitBundle}
                            onAwardBundle={(empId) => awardBundle(row.key, empId)}
                            onOpenDetail={handleOpenVacancyDetail}
                            dueNextId={dueNextId}
                          />
                        );
                      }
                      const v = row.item;
                      const recommendation = recommendations[v.id];
                      const coveredName =
                        vacations.find((x) => x.id === v.vacationId)?.employeeName ?? "";
                      const isDueNext = dueNextId === v.id;

                        return (
                          <VacancyRow
                            key={v.id}
                            v={v}
                            recommendation={recommendation}
                            employees={employees}
                            selected={selectedVacancyIds.includes(v.id)}
                            onToggleSelect={() =>
                              setSelectedVacancyIds((ids) =>
                                ids.includes(v.id)
                                  ? ids.filter((id) => id !== v.id)
                                  : [...ids, v.id],
                              )
                            }
                            isDueNext={!!isDueNext}
                            awardVacancy={(payload) => awardVacancy(v.id, payload)}
                            resetKnownAt={() => resetKnownAt(v.id)}
                            onDelete={deleteVacancy}
                            coveredName={coveredName}
                            settings={settings}
                            onOpenDetail={() => handleOpenVacancyDetail(v.id)}
                          />
                        );
                    })}
                  </tbody>
                </table>
                {openVacancies.length === 0 && (
                  <div className="subtitle" style={{ marginTop: 8 }}>
                    No open vacancies 🎉
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
          </div>
        
          </>
        )}

        {tab === "calendar" && (
          <div className="grid">
            <div className="card">
              <div className="card-h">Monthly Schedule (open shifts)</div>
              <div className="card-c">
                <MonthlySchedule vacancies={vacancies} />
              </div>
            </div>
          </div>
        )}

        {tab === "bids" && (
          <BidsPage
            bids={bids}
            archivedBids={archivedBids}
            setBids={setBids}
            vacancies={vacancies}
            vacations={vacations}
            employees={employees}
            employeesById={employeesById}
          />
        )}

        {tab === "employees" && (
          <EmployeesPage
            employees={employees}
            setEmployees={setEmployees}
            showImportHeadersToast={showImportHeadersToast}
          />
        )}

        {tab === "archive" && (
          <ArchivePage vacancies={vacancies} archivedBids={archivedBids} />
        )}

        {tab === "alerts" && (
          <div className="grid">
            <div className="card">
              <div className="card-h">Quick Stats</div>
              <div className="card-c">
                <div className="pill">
                  Open: {
                    vacancies.filter(
                      (v) => v.status !== "Filled" && v.status !== "Awarded",
                    ).length
                  }
                </div>
                <div className="pill" style={{ marginLeft: 6 }}>
                  Archived vacations:{" "}
                  {vacations.filter((v) => v.archived).length}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-h" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Deadline Notifications
                {unreadCount > 0 && (
                  <span
                    className="pill"
                    style={{ background: "var(--bad)", color: "#fff" }}
                  >
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="card-c">
                {notifications.length === 0 ? (
                  <div className="subtitle">No deadline alerts right now.</div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                        gap: 12,
                      }}
                    >
                      <div className="subtitle">
                        Showing {notifications.length} notification
                        {notifications.length === 1 ? "" : "s"}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={acknowledgeAll}
                        disabled={!notifications.some((n) => !n.read)}
                      >
                        Mark all read
                      </Button>
                    </div>
                    <ul
                      style={{
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {notifications.map((notification) => (
                        <DeadlineNotificationRow
                          key={notification.id}
                          notification={notification}
                          onAcknowledge={acknowledgeNotification}
                        />
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <SettingsPage
            settings={settings}
            setSettings={setSettings}
            notificationPrefs={notificationPrefs}
            toggleChannel={toggleNotificationChannel}
            updateChannel={updateNotificationChannel}
            updateLeadTime={updateNotificationLeadTime}
            setQuietHours={setNotificationQuietHours}
          />
        )}
        {coverageOpen && (
          <CoverageDaysModal
            open={coverageOpen}
            startDate={newVacay.startDate!}
            endDate={newVacay.endDate!}
            defaultStart={newVacay.shiftStart ?? defaultShift.start}
            defaultEnd={newVacay.shiftEnd ?? defaultShift.end}
            classification={newVacay.classification!}
            initial={coverage ?? undefined}
            onSave={(payload) => {
              setCoverage(payload);
              setCoverageOpen(false);
            }}
            onClose={() => setCoverageOpen(false)}
          />
        )}
        {appConfig.features.coverageDayPicker && (
          <VacancyRangeForm
            open={showRangeForm}
            onClose={() => setShowRangeForm(false)}
            onSave={handleSaveRange}
            existingVacancies={vacancies}
          />
        )}
        {activeRangeBid && (
          <RangeBidDialog
            open
            range={activeRangeBid}
            onClose={() => setActiveRangeBid(null)}
            employees={employees}
            onSubmit={handleSubmitRangeBid}
          />
        )}
        <Modal
          open={!!activeVacancy}
          title="Vacancy Detail"
          onClose={handleCloseVacancyDetail}
        >
          {activeVacancy && (
            <VacancyDetail
              vacancy={activeVacancy}
              onUpdate={handleVacancyDetailUpdate}
              onDelete={(id) => {
                deleteVacancy(id);
                handleCloseVacancyDetail();
              }}
            />
          )}
        </Modal>
        {/* App-level modals */}
        <Modal
          open={!!confirmState}
          title={confirmState?.title || "Confirm"}
          onClose={() => {
            confirmState?.resolve(false);
            setConfirmState(null);
          }}
        >
          <div className="wrap-anywhere">{confirmState?.body}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <Button onClick={() => { confirmState?.resolve(false); setConfirmState(null); }}>Cancel</Button>
            <Button variant="primary" onClick={() => { confirmState?.resolve(true); setConfirmState(null); }}>Confirm</Button>
          </div>
        </Modal>
        <Modal
          open={!!promptState}
          title={promptState?.title || "Input"}
          onClose={() => {
            promptState?.resolve(null);
            setPromptState(null);
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div className="wrap-anywhere">{promptState?.body}</div>
            <input
              autoFocus
              placeholder={promptState?.placeholder || ""}
              value={promptState?.value || ""}
              onChange={(e) => setPromptState((s) => (s ? { ...s, value: e.target.value } : s))}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button onClick={() => { promptState?.resolve(null); setPromptState(null); }}>Cancel</Button>
              <Button variant="primary" onClick={() => { promptState?.resolve(promptState?.value || ""); setPromptState(null); }}>OK</Button>
            </div>
          </div>
        </Modal>
        <Modal
          open={!!alertState}
          title={alertState?.title || "Notice"}
          onClose={() => {
            alertState?.resolve();
            setAlertState(null);
          }}
        >
          <div className="wrap-anywhere">{alertState?.body}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <Button variant="primary" onClick={() => { alertState?.resolve(); setAlertState(null); }}>OK</Button>
          </div>
        </Modal>
        <BulkAwardDialog
          open={bulkAwardOpen}
          employees={employees}
          vacancies={vacancies.filter((v) => selectedVacancyIds.includes(v.id))}
          bids={bids}
          onClose={() => setBulkAwardOpen(false)}
          onConfirm={(payload) => {
            setVacancies((prev) =>
              applyAwardVacancies(prev, selectedVacancyIds, payload),
            );
            archiveBids(selectedVacancyIds);
            setSelectedVacancyIds([]);
            setBulkAwardOpen(false);
          }}
        />
        {latestNotification && (
          <div
            role="status"
            style={{
              position: "fixed",
              top: 96,
              right: 24,
              zIndex: 30,
              background: "var(--card)",
              color: "var(--text)",
              border: "1px solid var(--stroke)",
              borderRadius: 12,
              padding: "14px 16px",
              maxWidth: 360,
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {latestNotification.severity === "critical"
                ? "Deadline passed"
                : latestNotification.severity === "warning"
                ? "Deadline approaching"
                : "Upcoming deadline"}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.4 }}>
              {latestNotification.message}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 12,
              }}
            >
              <Button
                size="sm"
                variant="ghost"
                onClick={() => acknowledgeNotification(latestNotification.id)}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  acknowledgeNotification(latestNotification.id);
                  setTab("alerts");
                }}
              >
                View alerts
              </Button>
            </div>
          </div>
        )}
        <Toast open={!!importToast} message={importToast?.message || ""} />
        <Toast
          open={!!stagedDelete}
          message={stagedDelete?.message || ""}
          actionLabel="Undo (5s)"
          onAction={undoDelete}
        />
        <Toast
          open={!!bundleUndo}
          message={bundleUndo?.message || ""}
          actionLabel="Undo (10s)"
          onAction={undoBundleAward}
        />
      </div>
    </div>
  );
}

// ---------- Pages ----------
type HeaderPickerState = {
  file: File;
  rows: ExcelHeaderPreviewRow[];
  totalRows: number;
  selectedIndex: number | null;
  isSubmitting: boolean;
};

function EmployeesPage({
  employees,
  setEmployees,
  showImportHeadersToast,
}: {
  employees: Employee[];
  setEmployees: (u: any) => void;
  showImportHeadersToast: (headers: string[], prefix?: string) => void;
}) {
  const [saveToast, setSaveToast] = useState<
    { message: string; timeout: ReturnType<typeof setTimeout> } | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [headerPicker, setHeaderPicker] = useState<HeaderPickerState | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (saveToast?.timeout) {
        clearTimeout(saveToast.timeout);
      }
    };
  }, [saveToast]);

  const showSaveToast = (employee: Employee) => {
    setSaveToast((prev) => {
      if (prev?.timeout) {
        clearTimeout(prev.timeout);
      }
      const name = [employee.firstName, employee.lastName]
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .join(" ");
      const message = name ? `${name} saved` : "Employee updated";
      const timeout = setTimeout(() => {
        setSaveToast((current) =>
          current?.timeout === timeout ? null : current,
        );
      }, 2500);
      return { message, timeout };
    });
  };

  const handleEmployeeChange = (updated: Employee) => {
    setEmployees((prev: Employee[]) => {
      const next = prev.map((employee) =>
        employee.id === updated.id ? updated : employee,
      );
      next.sort(
        (a, b) => (a.seniorityRank ?? 99999) - (b.seniorityRank ?? 99999),
      );
      return next;
    });
    showSaveToast(updated);
  };

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getHeadersFromRows = (rows: Record<string, unknown>[]) =>
    Array.from(
      new Set(
        rows.flatMap((row) =>
          row && typeof row === "object" ? Object.keys(row) : [],
        ),
      ),
    );

  const importRows = (
    rows: Record<string, unknown>[],
    meta?: { fileName?: string; importedAt?: string },
  ): boolean => {
    if (!rows.length) {
      return false;
    }

    const normalizedRows = rows.map((row) => normalizeRowDates(row));
    const fileName =
      typeof meta?.fileName === "string" && meta.fileName.trim()
        ? meta.fileName.trim()
        : undefined;
    const importedAt =
      meta?.importedAt ?? (fileName ? new Date().toISOString() : undefined);
    const mappingContext = fileName || importedAt ? { fileName, importedAt } : undefined;
    const mapped = normalizedRows
      .map((r, i) => mapRowToEmployee(r, i, mappingContext))
      .filter((emp): emp is Employee => !!emp);

    if (!mapped.length) {
      showImportHeadersToast(getHeadersFromRows(rows));
      return false;
    }

    setEmployees(mapped);
    return true;
  };

  const promptHeaderPicker = async (file: File) => {
    try {
      const preview = await getExcelHeaderPreview(file);
      if (preview.totalRows > 1 && preview.rows.length > 0) {
        const firstWithData = preview.rows.find((row) =>
          row.values.some((value) => String(value ?? "").trim().length > 0),
        );
        const selectedIndex =
          firstWithData?.index ?? preview.rows[0]?.index ?? null;
        setHeaderPicker({
          file,
          rows: preview.rows,
          totalRows: preview.totalRows,
          selectedIndex,
          isSubmitting: false,
        });
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const handleFileImport = async (
    file: File,
    options?: { headerRow?: number; allowHeaderPrompt?: boolean },
  ): Promise<boolean> => {
    const { headerRow, allowHeaderPrompt = true } = options ?? {};

    let rows: Record<string, unknown>[] = [];
    try {
      rows = await parseFile(
        file,
        typeof headerRow === "number" ? { headerRow } : undefined,
      );
    } catch (err) {
      console.error(err);
      showImportHeadersToast([], "Failed to parse file.");
      clearFileInput();
      return false;
    }

    if (!rows.length) {
      if (allowHeaderPrompt && isExcelFile(file)) {
        try {
          const preview = await getExcelHeaderPreview(file);
          if (preview.totalRows > 1 && preview.rows.length > 0) {
            const firstWithData = preview.rows.find((row) =>
              row.values.some(
                (value) => String(value ?? "").trim().length > 0,
              ),
            );
            const selectedIndex =
              firstWithData?.index ?? preview.rows[0]?.index ?? null;
            setHeaderPicker({
              file,
              rows: preview.rows,
              totalRows: preview.totalRows,
              selectedIndex,
              isSubmitting: false,
            });
            clearFileInput();
            return false;
          }
        } catch (err) {
          console.error(err);
        }
      }

      const headers = Array.from(
        new Set(
          rows.flatMap((row) =>
            row && typeof row === "object" ? Object.keys(row) : [],
          ),
        ),
      );
      showImportHeadersToast(headers, "Unable to import employees.");
      clearFileInput();
      return false;
    }

    const success = importRows(rows, {
      fileName: file.name,
      importedAt: new Date().toISOString(),
    });
    clearFileInput();
    return success;
  };

  const handleUseSelectedHeaderRow = async () => {
    if (!headerPicker?.file || headerPicker.selectedIndex === null) return;
    setHeaderPicker((prev) =>
      prev ? { ...prev, isSubmitting: true } : prev,
    );
    const success = await handleFileImport(headerPicker.file, {
      headerRow: headerPicker.selectedIndex,
      allowHeaderPrompt: false,
    });
    if (success) {
      setHeaderPicker(null);
    } else {
      setHeaderPicker((prev) =>
        prev ? { ...prev, isSubmitting: false } : prev,
      );
    }
  };

  const handleCancelHeaderPicker = () => {
    setHeaderPicker(null);
    clearFileInput();
  };

  return (
    <>
      <div className="grid">
        <div className="card">
          <div className="card-h">Import Staff (CSV)</div>
          <div className="card-c">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.xlsm,.xlsb"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              await handleFileImport(f);
            }}
          />
          <div className="subtitle">
            Columns: id, firstName, lastName, classification (RCA/LPN/RN/Rec/
            Receptionist), status (FT/PT/Casual), homeWing, startDate,
            seniorityHours, seniorityRank, active (Yes/No)
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Add Employee</div>
        <div className="card-c">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem("name") as HTMLInputElement)
                .value;
              const classification = (
                form.elements.namedItem("classification") as HTMLSelectElement
              ).value as Classification;
              const status = (
                form.elements.namedItem("status") as HTMLSelectElement
              ).value as Status;
              const rank = Number(
                (form.elements.namedItem("rank") as HTMLInputElement).value,
              );
              if (!name) return;
              const [first, ...rest] = name.trim().split(" ");
              const newEmp: Employee = {
                id: `emp_${Date.now()}`,
                firstName: first ?? "",
                lastName: rest.join(" "),
                classification,
                status,
                seniorityRank: rank || employees.length + 1,
                active: true,
                activeLabel: "Active",
              };
              const sorted = [...employees, newEmp].sort(
                (a, b) => (a.seniorityRank ?? 99999) - (b.seniorityRank ?? 99999),
              );
              setEmployees(sorted);
              form.reset();
            }}
          >
            <div className="row cols4">
              <div>
                <label>Name</label>
                <input name="name" type="text" />
              </div>
              <div>
                <label>Class</label>
                <select name="classification">
                  {CLASSIFICATIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Status</label>
                <select name="status">
                  <option value="FT">FT</option>
                  <option value="PT">PT</option>
                  <option value="Casual">Casual</option>
                </select>
              </div>
              <div>
                <label>Rank</label>
                <input name="rank" type="number" />
              </div>
            </div>
            <button type="submit" style={{ marginTop: 8 }}>
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Employees</div>
        <div className="card-c">
          <table className="responsive-table">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th></th>
                <th></th>
                <th>Class</th>
                <th>Status</th>
                <th>Rank</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  onChange={handleEmployeeChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Toast open={!!saveToast} message={saveToast?.message ?? ""} />
      </div>
      <HeaderRowPickerModal
        open={!!headerPicker}
        rows={headerPicker?.rows ?? []}
        totalRows={headerPicker?.totalRows ?? 0}
        selectedIndex={headerPicker?.selectedIndex ?? null}
        isSubmitting={headerPicker?.isSubmitting ?? false}
        onSelect={(index) =>
          setHeaderPicker((prev) =>
            prev ? { ...prev, selectedIndex: index } : prev,
          )
        }
        onCancel={handleCancelHeaderPicker}
        onConfirm={handleUseSelectedHeaderRow}
      />
    </>
  );
}

export function ArchivePage({
  vacancies,
  archivedBids,
}: {
  vacancies: Vacancy[];
  archivedBids: Record<string, Bid[]>;
}) {
  const archived = useMemo(() => {
    const getTimestamp = (v: Vacancy) => {
      if (v.archivedAt) {
        return new Date(v.archivedAt).getTime();
      }
      if (v.shiftDate && v.shiftStart) {
        return combineDateTime(v.shiftDate, v.shiftStart).getTime();
      }
      if (v.shiftDate) {
        return new Date(`${v.shiftDate}T00:00:00`).getTime();
      }
      return 0;
    };

    return vacancies
      .filter((v) => v.archived)
      .slice()
      .sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [vacancies]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<Classification[]>([]);
  const [selectedWings, setSelectedWings] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bundleMode, setBundleMode] = useState<"all" | "bundles" | "singles">("all");

  const filteredArchived = useMemo(() => {
    const search = query.trim();
    return archived.filter((v) => {
      if (search && !matchText(search, `${displayVacancyLabel(v)} ${v.reason ?? ""}`)) {
        return false;
      }
      if (selectedPositions.length && !selectedPositions.includes(v.classification)) {
        return false;
      }
      if (selectedWings.length && !selectedWings.includes(v.wing || "")) {
        return false;
      }
      if (startDate && (!v.shiftDate || v.shiftDate < startDate)) {
        return false;
      }
      if (endDate && (!v.shiftDate || v.shiftDate > endDate)) {
        return false;
      }
      if (bundleMode === "bundles" && !v.bundleId) {
        return false;
      }
      if (bundleMode === "singles" && v.bundleId) {
        return false;
      }
      return true;
    });
  }, [
    archived,
    bundleMode,
    endDate,
    query,
    selectedPositions,
    selectedWings,
    startDate,
  ]);

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Archived Vacancies</div>
        <div className="card-c">
          <SearchFilterBar
            query={query}
            startDate={startDate}
            endDate={endDate}
            selectedPositions={selectedPositions}
            bundleMode={bundleMode}
            selectedWings={selectedWings}
            onQueryChange={setQuery}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onPositionsChange={setSelectedPositions}
            onBundleModeChange={setBundleMode}
            onWingsChange={setSelectedWings}
            onClear={() => {
              setQuery("");
              setStartDate("");
              setEndDate("");
              setSelectedPositions([]);
              setSelectedWings([]);
              setBundleMode("all");
            }}
          />
          <table className="responsive-table">
            <tbody>
              {filteredArchived.map((v) => (
                <Fragment key={v.id}>
                  <tr
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [v.id]: !prev[v.id] }))
                    }
                    style={{ cursor: "pointer", background: "var(--cardAlt)" }}
                  >
                    <td colSpan={5}>{displayVacancyLabel(v)}</td>
                  </tr>
                  {expanded[v.id] && (
                    <Fragment>
                      <tr>
                        <th style={{ paddingLeft: 24 }}>Employee</th>
                        <th>Class</th>
                        <th>Status</th>
                        <th>Bid at</th>
                        <th>Notes</th>
                      </tr>
                      {archivedBids[v.id]?.map((b, i) => (
                        <tr key={i}>
                          <td style={{ paddingLeft: 24 }}>{b.bidderName}</td>
                          <td>{b.bidderClassification}</td>
                          <td>{b.bidderStatus}</td>
                          <td>{new Date(b.bidTimestamp).toLocaleString()}</td>
                          <td>{b.notes}</td>
                        </tr>
                      ))}
                      {!(archivedBids[v.id] && archivedBids[v.id].length) && (
                        <tr>
                          <td style={{ paddingLeft: 24 }} colSpan={5}>
                            No bids
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )}
                </Fragment>
              ))}
              {!filteredArchived.length && (
                <tr>
                  <td>No archived vacancies</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DeadlineNotificationRow({
  notification,
  onAcknowledge,
}: {
  notification: DeadlineNotification;
  onAcknowledge: (id: string) => void;
}) {
  const severityStyles = {
    info: { background: "var(--brand)", color: "#fff" },
    warning: { background: "#f5a623", color: "#1c1c1c" },
    critical: { background: "var(--bad)", color: "#fff" },
  } as const;
  const severityLabels = {
    info: "Info",
    warning: "Warning",
    critical: "Critical",
  } as const;
  const deadlineDate = new Date(notification.deadlineAt);
  const triggeredDate = new Date(notification.triggeredAt);
  const suppressed = notification.suppressedChannels.filter(
    (channel) => !notification.channels.includes(channel),
  );
  return (
    <li
      style={{
        border: "1px solid var(--stroke)",
        borderRadius: 12,
        padding: "12px 16px",
        background: "var(--cardAlt)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              ...severityStyles[notification.severity],
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {severityLabels[notification.severity]}
          </span>
          {notification.resolved && (
            <span
              className="pill"
              style={{ background: "#1a7f37", color: "#fff" }}
            >
              Resolved
            </span>
          )}
          {!notification.read && (
            <span
              className="pill"
              style={{ background: "var(--brand)", color: "#fff" }}
            >
              Unread
            </span>
          )}
        </div>
        {!notification.read && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onAcknowledge(notification.id)}
          >
            Mark read
          </Button>
        )}
      </div>
      <div style={{ fontWeight: 600, marginTop: 8 }}>{notification.message}</div>
      <div className="subtitle" style={{ marginTop: 4 }}>
        Deadline: {deadlineDate.toLocaleString()} • Triggered: {" "}
        {triggeredDate.toLocaleString()}
      </div>
      <div className="subtitle" style={{ marginTop: 4 }}>
        Channels: {notification.channels.length ? notification.channels.join(", ") : "None"}
        {suppressed.length > 0 && (
          <span>
            {" "}• Quiet hours suppressed: {suppressed.join(", ")}
          </span>
        )}
      </div>
      {notification.resolved && notification.resolvedAt && (
        <div className="subtitle" style={{ marginTop: 4 }}>
          Resolved at {new Date(notification.resolvedAt).toLocaleString()}
        </div>
      )}
    </li>
  );
}

function SettingsPage({
  settings,
  setSettings,
  notificationPrefs,
  toggleChannel,
  updateChannel,
  updateLeadTime,
  setQuietHours,
}: {
  settings: Settings;
  setSettings: (u: any) => void;
  notificationPrefs: NotificationPreferences;
  toggleChannel: ReturnType<typeof useNotificationPrefs>["toggleChannel"];
  updateChannel: ReturnType<typeof useNotificationPrefs>["updateChannel"];
  updateLeadTime: ReturnType<typeof useNotificationPrefs>["updateLeadTime"];
  setQuietHours: ReturnType<typeof useNotificationPrefs>["setQuietHours"];
}) {
  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Appearance & Defaults</div>
        <div className="card-c">
          <div className="row cols2">
            <div>
              <label>Theme</label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  setSettings((s: any) => ({
                    ...s,
                    theme: e.target.value as "dark" | "light",
                  }))
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label>Default Shift Template</label>
              <select
                value={settings.defaultShiftPreset}
                onChange={(e) =>
                  setSettings((s: any) => ({
                    ...s,
                    defaultShiftPreset: e.target.value,
                  }))
                }
              >
                {SHIFT_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label} ({p.start}–{p.end})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Notifications</div>
        <div className="card-c" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div className="subtitle" style={{ marginBottom: 8 }}>
              Channels
            </div>
            <div className="row cols3" style={{ gap: 16 }}>
              {(
                [
                  {
                    key: "inApp" as NotificationChannel,
                    label: "In-app",
                    description: "Show alerts inside Maplewood Scheduler.",
                  },
                  {
                    key: "email" as NotificationChannel,
                    label: "Email",
                    description: "Send notification emails when deadlines approach.",
                    placeholder: "alerts@example.com",
                    inputType: "email",
                  },
                  {
                    key: "sms" as NotificationChannel,
                    label: "SMS",
                    description: "Send a text message for urgent deadlines.",
                    placeholder: "555-123-4567",
                    inputType: "tel",
                  },
                ]
              ).map((channel) => {
                const channelConfig = notificationPrefs.channels[channel.key];
                const isEmail = channel.key === "email";
                const isSms = channel.key === "sms";
                return (
                  <div
                    key={channel.key}
                    style={{
                      border: "1px solid var(--stroke)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      background: "var(--cardAlt)",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={channelConfig.enabled}
                        onChange={(e) => toggleChannel(channel.key, e.target.checked)}
                      />
                      {channel.label}
                    </label>
                    <div className="subtitle" style={{ marginTop: 4 }}>
                      {channel.description}
                    </div>
                    {isEmail && (
                      <input
                        type={channel.inputType}
                        value={notificationPrefs.channels.email.address}
                        placeholder={channel.placeholder}
                        onChange={(e) => updateChannel("email", { address: e.target.value })}
                        style={{ marginTop: 8, width: "100%" }}
                      />
                    )}
                    {isSms && (
                      <input
                        type={channel.inputType}
                        value={notificationPrefs.channels.sms.number}
                        placeholder={channel.placeholder}
                        onChange={(e) => updateChannel("sms", { number: e.target.value })}
                        style={{ marginTop: 8, width: "100%" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="subtitle" style={{ marginBottom: 8 }}>
              Lead times
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {notificationPrefs.leadTimes.map((lt) => (
                <div
                  key={lt.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    border: "1px solid var(--stroke)",
                    borderRadius: 12,
                    background: "var(--cardAlt)",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={lt.enabled}
                      onChange={(e) => updateLeadTime(lt.id, { enabled: e.target.checked })}
                    />
                    <span>{lt.label}</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={lt.minutes}
                    onChange={(e) => updateLeadTime(lt.id, { minutes: Number(e.target.value) })}
                    style={{ width: 90 }}
                  />
                  <span className="subtitle">minutes</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="subtitle" style={{ marginBottom: 8 }}>
              Quiet hours
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={notificationPrefs.quietHours.enabled}
                onChange={(e) => setQuietHours({ enabled: e.target.checked })}
              />
              Enable quiet hours
            </label>
            <div className="row cols3" style={{ marginTop: 12 }}>
              <div>
                <label>Start</label>
                <input
                  type="time"
                  value={notificationPrefs.quietHours.start}
                  onChange={(e) => setQuietHours({ start: e.target.value })}
                />
              </div>
              <div>
                <label>End</label>
                <input
                  type="time"
                  value={notificationPrefs.quietHours.end}
                  onChange={(e) => setQuietHours({ end: e.target.value })}
                />
              </div>
              <div>
                <label>Timezone</label>
                <input
                  type="text"
                  value={notificationPrefs.quietHours.timezone}
                  placeholder="America/Chicago"
                  onChange={(e) => setQuietHours({ timezone: e.target.value })}
                />
              </div>
            </div>
            <div className="subtitle" style={{ marginTop: 12 }}>
              Suppress during quiet hours
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
              {(["email", "sms", "inApp"] as NotificationChannel[]).map((channel) => {
                const checked = notificationPrefs.quietHours.suppress.includes(channel);
                return (
                  <label key={channel} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const current = notificationPrefs.quietHours.suppress;
                        const next = e.target.checked
                          ? Array.from(new Set([...current, channel]))
                          : current.filter((c) => c !== channel);
                        setQuietHours({ suppress: next });
                      }}
                    />
                    {channel === "inApp" ? "In-app" : channel.toUpperCase()}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Dashboard Order</div>
        <div className="card-c">
          <TabOrderEditor
            order={settings.tabOrder}
            setOrder={(o) =>
              setSettings((s: any) => ({ ...s, tabOrder: o }))
            }
          />
          <div className="subtitle" style={{ marginTop: 8 }}>
            Drag items to reorder tabs.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Response Windows (minutes)</div>
        <div className="card-c">
          <div className="row cols2">
            {(
              [
                ["<2h", "lt2h"],
                ["2–4h", "h2to4"],
                ["4–24h", "h4to24"],
                ["24–72h", "h24to72"],
                [">72h", "gt72"],
              ] as const
            ).map(([label, key]) => (
              <div key={key}>
                <label>{label}</label>
                <input
                  type="number"
                  value={(settings.responseWindows as any)[key]}
                  onChange={(e) =>
                    setSettings((s: any) => ({
                      ...s,
                      responseWindows: {
                        ...s.responseWindows,
                        [key]: Number(e.target.value),
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabOrderEditor({
  order,
  setOrder,
}: {
  order: string[];
  setOrder: (o: string[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {order.map((item, idx) => (
        <li
          key={item}
          draggable
          onDragStart={() => setDragIndex(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex === null) return;
            setOrder(reorder(order, dragIndex, idx));
            setDragIndex(null);
          }}
          style={{
            padding: "8px 10px",
            border: "1px solid var(--stroke)",
            borderRadius: "8px",
            background: "var(--cardAlt)",
            marginBottom: 6,
            cursor: "move",
          }}
        >
          {item[0].toUpperCase() + item.slice(1)}
        </li>
      ))}
    </ul>
  );
}

export function BidsPage({
  bids,
  archivedBids,
  setBids,
  vacancies,
  vacations,
  employees,
  employeesById,
}: {
  bids: Bid[];
  archivedBids: Record<string, Bid[]>;
  setBids: (u: any) => void;
  vacancies: Vacancy[];
  vacations: Vacation[];
  employees: Employee[];
  employeesById: Record<string, Employee>;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterClass, setFilterClass] = useState<Classification | "">("");
  const [filterStatus, setFilterStatus] = useState<Status | "">("");
  const [filterWing, setFilterWing] = useState<string>("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  type NewBidState = Partial<
    Omit<Bid, "vacancyId"> & { bidDate: string; bidTime: string }
  > & { selectedVacancyIds: string[] };
  const [newBid, setNewBid] = useState<NewBidState>({
    selectedVacancyIds: [],
  });
  const [bidFormKey, setBidFormKey] = useState(0);
  const bidDateRef = useRef<HTMLInputElement>(null);
  const {
    search: vacancySearch,
    setSearch: setVacancySearch,
    start: vacancyStart,
    setStart: setVacancyStart,
    end: vacancyEnd,
    setEnd: setVacancyEnd,
    selectedPositions: vacancySelectedPositions,
    setSelectedPositions: setVacancySelectedPositions,
    selectedWings: vacancySelectedWings,
    setSelectedWings: setVacancySelectedWings,
    bundleMode: vacancyBundleMode,
    setBundleMode: setVacancyBundleMode,
    resetFilters: resetVacancyFilters,
  } = useVacancyFilters();

  const vacWithCoveredName = (v: Vacancy) => {
    const vac = vacations.find((x) => x.id === v.vacationId);
    const covered = vac ? vac.employeeName : "";
    return `${displayVacancyLabel(v)} — covering ${covered}`.trim();
  };

  const openVacancies = vacancies.filter(
    (v) => v.status !== "Filled" && v.status !== "Awarded",
  );

  const vacNameById = useMemo(() => {
    const map: Record<string, string> = {};
    vacations.forEach((vac) => {
      map[vac.id] = vac.employeeName;
    });
    return map;
  }, [vacations]);

  const filteredOpenVacancies = useMemo(() => {
    let list = [...openVacancies];
    if (vacancySearch) {
      const q = vacancySearch.toLowerCase();
      list = list.filter((v) => {
        const employeeName = vacNameById[v.vacationId ?? ""] || "";
        return (
          (v.reason || "").toLowerCase().includes(q) ||
          (v.wing || "").toLowerCase().includes(q) ||
          (v.classification || "").toLowerCase().includes(q) ||
          employeeName.toLowerCase().includes(q)
        );
      });
    }
    if (vacancySelectedPositions.length)
      list = list.filter((v) => vacancySelectedPositions.includes(v.classification));
    if (vacancySelectedWings.length)
      list = list.filter((v) => vacancySelectedWings.includes(v.wing || ""));
    if (vacancyStart) list = list.filter((v) => v.shiftDate >= vacancyStart);
    if (vacancyEnd) list = list.filter((v) => v.shiftDate <= vacancyEnd);
    if (vacancyBundleMode === "bundles") list = list.filter((v) => v.bundleId);
    if (vacancyBundleMode === "singles") list = list.filter((v) => !v.bundleId);
    return list;
  }, [
    openVacancies,
    vacancySearch,
    vacancySelectedPositions,
    vacancySelectedWings,
    vacancyStart,
    vacancyEnd,
    vacancyBundleMode,
    vacNameById,
  ]);

  // Build options for the Add Bid selector: bundles appear as ONE option
  const filteredVacancyOptions = useMemo(() => {
    const byBundle = new Map<string, typeof filteredOpenVacancies>();
    const singles: typeof filteredOpenVacancies = [];
    for (const v of filteredOpenVacancies) {
      if (v.bundleId) {
        const arr = byBundle.get(v.bundleId) || [];
        arr.push(v);
        byBundle.set(v.bundleId, arr);
      } else {
        singles.push(v);
      }
    }
    const options: { id: string; label: string }[] = [];
    // Bundles (2+ days) as one option
    for (const arr of byBundle.values()) {
      arr.sort((a, b) =>
        combineDateTime(a.shiftDate, a.shiftStart).getTime() -
        combineDateTime(b.shiftDate, b.shiftStart).getTime(),
      );
      if (arr.length >= 2) {
        const first = arr[0];
        const last = arr[arr.length - 1];
        const range = `${formatDateLong(first.shiftDate)} – ${formatDateLong(
          last.shiftDate,
        )}`;
        const days = arr.length;
        const label = `Block: ${range} • ${first.classification} • ${first.wing ?? ""} (${days} days)`;
        options.push({ id: first.id, label });
      } else {
        // Single-day that happened to have a bundleId
        const v = arr[0];
        options.push({ id: v.id, label: displayVacancyLabel(v) });
      }
    }
    // Singles
    for (const v of singles) options.push({ id: v.id, label: displayVacancyLabel(v) });
    // Sort by earliest start
    const vacancyById = new Map(filteredOpenVacancies.map((v) => [v.id, v]));
    options.sort((a, b) => {
      const va = vacancyById.get(a.id);
      const vb = vacancyById.get(b.id);
      if (!va || !vb) return 0;
      return (
        combineDateTime(va.shiftDate, va.shiftStart).getTime() -
        combineDateTime(vb.shiftDate, vb.shiftStart).getTime()
      );
    });
    return options;
  }, [filteredOpenVacancies]);

  const isEligible = (v: Vacancy, emp: Employee) => {
    if (v.classification !== emp.classification) return false;
    if (v.offeringStep === "Casuals") return emp.status === "Casual";
    if (v.offeringStep === "OT-Full-Time")
      return emp.status === "FT" || emp.status === "PT";
    if (v.offeringStep === "OT-Casuals") return emp.status === "Casual";
    return true;
  };

  const eligibleVacancyIds = useMemo(() => {
    const emp = employeesById[newBid.bidderEmployeeId ?? ""];
    if (!emp) return new Set<string>();
    const set = new Set<string>();
    for (const v of filteredOpenVacancies) if (isEligible(v, emp)) set.add(v.id);
    return set;
  }, [filteredOpenVacancies, newBid.bidderEmployeeId, employeesById]);

  const activeBids = bids.filter((b) => {
    const v = vacancies.find((x) => x.id === b.vacancyId);
    return !v || v.status !== "Awarded";
  });
  const filteredActiveBids = activeBids.filter((b) => {
    const v = vacancies.find((x) => x.id === b.vacancyId);
    if (filterEmployee && !matchText(filterEmployee, b.bidderName || ""))
      return false;
    if (filterClass && b.bidderClassification !== filterClass) return false;
    if (filterStatus && b.bidderStatus !== filterStatus) return false;
    if (filterWing && v && v.wing !== filterWing) return false;
    if (filterStart && v && v.shiftDate < filterStart) return false;
    if (filterEnd && v && v.shiftDate > filterEnd) return false;
    return true;
  });
  const awardedVacancies = vacancies.filter((v) => v.status === "Awarded");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const removeBid = (bidToRemove: Bid) => {
    setBids((prev: Bid[]) => prev.filter((bid) => bid !== bidToRemove));
  };

  const setNow = () => {
    const now = new Date();
    const d = isoDate(now);
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setNewBid((b) => ({ ...b, bidDate: d, bidTime: t }));
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Add Bid</div>
        <div className="card-c">
          <div className="row cols2">
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Employee</label>
              <EmployeeCombo
                key={bidFormKey}
                employees={employees}
                onSelect={(id) => {
                  const e = employeesById[id];
                  setNewBid((b) => {
                    const updated = {
                      ...b,
                      bidderEmployeeId: id,
                      bidderName: e ? `${e.firstName} ${e.lastName}` : "",
                      bidderStatus: e?.status,
                      bidderClassification: e?.classification,
                    };
                    if (e) {
                      const ineligible = updated.selectedVacancyIds.filter((vacId) => {
                        const v = vacancies.find((x) => x.id === vacId);
                        const vacancyEligible =
                          v &&
                          v.classification === e.classification &&
                          (v.offeringStep === "Casuals"
                            ? e.status === "Casual"
                            : v.offeringStep === "OT-Full-Time"
                            ? e.status === "FT" || e.status === "PT"
                            : v.offeringStep === "OT-Casuals"
                            ? e.status === "Casual"
                            : true);
                        return v ? !vacancyEligible : false;
                      });
                      if (ineligible.length) {
                        (window as any).appShowAlert?.(
                          `Selected employee may be ineligible for ${ineligible.length} chosen vacancy${ineligible.length > 1 ? "ies" : ""}`,
                        );
                      }
                    }
                    return updated;
                  });
                }}
              />
              <div className="subtitle" style={{ marginTop: 4 }}>
                Select an employee to highlight matching vacancies.
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Vacancies</label>
              <div style={{ margin: "8px 0" }}>
                <SearchFilterBar
                  query={vacancySearch}
                  startDate={vacancyStart}
                  endDate={vacancyEnd}
                  selectedPositions={vacancySelectedPositions}
                  selectedWings={vacancySelectedWings}
                  bundleMode={vacancyBundleMode}
                  onQueryChange={setVacancySearch}
                  onStartDateChange={setVacancyStart}
                  onEndDateChange={setVacancyEnd}
                  onPositionsChange={setVacancySelectedPositions}
                  onWingsChange={setVacancySelectedWings}
                  onBundleModeChange={setVacancyBundleMode}
                  onClear={resetVacancyFilters}
                />
              </div>
              <div className="subtitle" style={{ margin: "4px 0" }}>
                Eligible vacancies are bolded.
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  margin: "4px 0",
                }}
              >
                <span>{newBid.selectedVacancyIds.length} selected</span>
                <button
                  className="btn btn-sm"
                  onClick={() =>
                    setNewBid((b) => ({
                      ...b,
                      selectedVacancyIds: Array.from(
                        new Set([
                          ...b.selectedVacancyIds,
                          ...filteredVacancyOptions.map((o) => o.id),
                        ]),
                      ),
                    }))
                  }
                >
                  Select All
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() =>
                    setNewBid((b) => ({ ...b, selectedVacancyIds: [] }))
                  }
                >
                  Clear
                </button>
              </div>
              <div
                style={{
                  maxHeight: 150,
                  overflowY: "auto",
                  border: "1px solid var(--stroke)",
                  padding: 4,
                  borderRadius: 4,
                }}
              >
                {filteredVacancyOptions.length ? (
                  filteredVacancyOptions.map((opt) => (
                    <label
                      key={opt.id}
                      style={{
                        display: "block",
                        fontWeight: eligibleVacancyIds.has(opt.id) ? 700 : undefined,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newBid.selectedVacancyIds.includes(opt.id)}
                        onChange={(e) =>
                          setNewBid((b) => ({
                            ...b,
                            selectedVacancyIds: e.target.checked
                              ? [...b.selectedVacancyIds, opt.id]
                              : b.selectedVacancyIds.filter((id) => id !== opt.id),
                          }))
                        }
                      />
                      {opt.label}
                    </label>
                  ))
                ) : (
                  <div style={{ padding: 4 }}>No open vacancies</div>
                )}
              </div>
            </div>
            {/* clicking wrapper triggers picker; use same pattern for future date fields */}
            <div onClick={() => bidDateRef.current?.showPicker()}>
              <label>Bid Date</label>
              <input
                type="date"
                ref={bidDateRef}
                value={newBid.bidDate ?? ""}
                onChange={(e) =>
                  setNewBid((b) => ({ ...b, bidDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Bid Time</label>
              <div className="form-row">
                <input
                  type="time"
                  value={newBid.bidTime ?? ""}
                  onChange={(e) =>
                    setNewBid((b) => ({ ...b, bidTime: e.target.value }))
                  }
                />
                <button className="btn" onClick={setNow}>
                  Now
                </button>
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <input
                placeholder={'e.g., "available for 06:30-14:30"'}
                onChange={(e) =>
                  setNewBid((b) => ({ ...b, notes: e.target.value }))
                }
              />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
              <button
                className="btn"
                onClick={() => {
                  if (!newBid.selectedVacancyIds.length || !newBid.bidderEmployeeId) {
                    (window as any).appShowAlert?.(
                      "At least one vacancy and employee required",
                    );
                    return;
                  }
                  const ts =
                    newBid.bidDate && newBid.bidTime
                      ? new Date(
                          `${newBid.bidDate}T${newBid.bidTime}:00`,
                        ).toISOString()
                      : new Date().toISOString();
                  const targetIds = new Set<string>();
                  for (const vacId of newBid.selectedVacancyIds) {
                    const vac = vacancies.find((x) => x.id === vacId);
                    if (!vac) continue;
                    if (vac.bundleId) {
                      vacancies
                        .filter(
                          (x) =>
                            x.bundleId === vac.bundleId &&
                            x.status !== "Filled" &&
                            x.status !== "Awarded",
                        )
                        .forEach((x) => targetIds.add(x.id));
                    } else {
                      targetIds.add(vac.id);
                    }
                  }
                  setBids((prev: Bid[]) => [
                    ...prev,
                    ...Array.from(targetIds).map((id) => ({
                      vacancyId: id,
                      bidderEmployeeId: newBid.bidderEmployeeId!,
                      bidderName: newBid.bidderName ?? "",
                      bidderStatus: (newBid.bidderStatus ?? "Casual") as Status,
                      bidderClassification: (newBid.bidderClassification ??
                        CLASSIFICATIONS[0]) as Classification,
                      bidTimestamp: ts,
                      notes: newBid.notes ?? "",
                    })),
                  ]);
                  setNewBid({ selectedVacancyIds: [] });
                  resetVacancyFilters();
                  setBidFormKey((prev) => prev + 1);
                }}
              >
                Add Bid
              </button>
              <button
                className="btn btn-sm"
                onClick={() => {
                  setNewBid({ selectedVacancyIds: [] });
                  resetVacancyFilters();
                  setBidFormKey((prev) => prev + 1);
                }}
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Active Bids</div>
        <div className="card-c">
          <div style={{ marginBottom: 8 }}>
            <Button size="sm" onClick={() => setFiltersOpen((o) => !o)}>
              {filtersOpen ? "Hide Filters ▲" : "Show Filters ▼"}
            </Button>
          </div>
          {filtersOpen && (
            <FilterBar
              style={{ marginBottom: 8 }}
              items={[
                { type: "text", key: "employee", placeholder: "Employee name…" },
                {
                  type: "select",
                  key: "class",
                  options: [
                    { value: "", label: "All Classes" },
                    ...CLASSIFICATIONS.map((c) => ({ value: c, label: c })),
                  ],
                },
                {
                  type: "select",
                  key: "status",
                  options: [
                    { value: "", label: "All Statuses" },
                    { value: "FT", label: "FT" },
                    { value: "PT", label: "PT" },
                    { value: "Casual", label: "Casual" },
                  ],
                },
                {
                  type: "select",
                  key: "wing",
                  options: [{ value: "", label: "All Wings" }, ...WINGS.map((w) => ({ value: w, label: w }))],
                },
                { type: "date", key: "start" },
                { type: "date", key: "end" },
              ]}
              values={{
                employee: filterEmployee,
                class: filterClass,
                status: filterStatus,
                wing: filterWing,
                start: filterStart,
                end: filterEnd,
              }}
              onChange={(key, value) => {
                if (key === "employee") setFilterEmployee(value);
                else if (key === "class") setFilterClass(value as Classification | "");
                else if (key === "status") setFilterStatus(value as Status | "");
                else if (key === "wing") setFilterWing(value);
                else if (key === "start") setFilterStart(value);
                else if (key === "end") setFilterEnd(value);
              }}
              onClear={() => {
                setFilterEmployee("");
                setFilterClass("");
                setFilterStatus("");
                setFilterWing("");
                setFilterStart("");
                setFilterEnd("");
              }}
            />
          )}
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Vacancy</th>
                <th>Employee</th>
                <th>Class</th>
                <th>Status</th>
                <th>Bid at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredActiveBids.map((b, i) => {
                const v = vacancies.find((x) => x.id === b.vacancyId);
                return (
                  <tr key={i}>
                    <td>{v ? displayVacancyLabel(v) : b.vacancyId}</td>
                    <td>{b.bidderName}</td>
                    <td>{b.bidderClassification}</td>
                    <td>{b.bidderStatus}</td>
                    <td>{new Date(b.bidTimestamp).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn"
                        style={{ background: "var(--bad)", color: "#fff" }}
                        onClick={() => removeBid(b)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Archived Bids</div>
        <div className="card-c">
          <table className="responsive-table">
            <tbody>
              {awardedVacancies.map((v) => (
                <Fragment key={v.id}>
                  <tr
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [v.id]: !prev[v.id] }))
                    }
                    style={{ cursor: "pointer", background: "var(--cardAlt)" }}
                  >
                    <td colSpan={5}>{displayVacancyLabel(v)}</td>
                  </tr>
                  {expanded[v.id] && (
                    <Fragment>
                      <tr>
                        <th style={{ paddingLeft: 24 }}>Employee</th>
                        <th>Class</th>
                        <th>Status</th>
                        <th>Bid at</th>
                        <th>Notes</th>
                      </tr>
                      {archivedBids[v.id]?.map((b, i) => (
                        <tr key={i}>
                          <td style={{ paddingLeft: 24 }}>{b.bidderName}</td>
                          <td>{b.bidderClassification}</td>
                          <td>{b.bidderStatus}</td>
                          <td>{new Date(b.bidTimestamp).toLocaleString()}</td>
                          <td>{b.notes}</td>
                        </tr>
                      ))}
                      {!(archivedBids[v.id] && archivedBids[v.id].length) && (
                        <tr>
                          <td style={{ paddingLeft: 24 }} colSpan={5}>
                            No bids
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )}
                </Fragment>
              ))}
              {!awardedVacancies.length && (
                <tr>
                  <td>No archived bids</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CoverageDayList({
  dateISO,
  vacancies,
}: {
  dateISO: string;
  vacancies: Vacancy[];
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="pill">
        Vacancies on {formatDateLong(dateISO)}: {vacancies.length}
      </div>
      {vacancies.length > 0 && (
        <table className="responsive-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Shift</th>
              <th>Wing</th>
              <th>Class</th>
              <th>Offering</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vacancies.map((v) => (
              <tr key={v.id}>
                <td>
                  {v.shiftStart}-{v.shiftEnd}
                </td>
                <td>{v.wing ?? ""}</td>
                <td>{v.classification}</td>
                <td>{v.offeringStep}</td>
                <td>{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MonthlySchedule({ vacancies }: { vacancies: Vacancy[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [selectedISO, setSelectedISO] = useState<string>(isoDate(today));
  const todayISO = isoDate(today);

  const calDays = useMemo(() => buildCalendar(year, month), [year, month]);
  const vacanciesByDay = useMemo(() => {
    const all = vacancies.filter(
      (v) =>
        (v.status !== "Filled" && v.status !== "Awarded") ||
        v.shiftDate >= todayISO,
    );
    return groupVacanciesByDate(all);
  }, [vacancies, todayISO]);

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="btn"
          onClick={() => prevMonth(setYear, setMonth, year, month)}
        >
          &lt;
        </button>
        <div className="pill">{monthLabel}</div>
        <button
          className="btn"
          onClick={() => nextMonth(setYear, setMonth, year, month)}
        >
          &gt;
        </button>
        <div style={{ marginLeft: "auto" }} className="subtitle">
          Click a day to list shifts
        </div>
      </div>
      <div className="cal-grid">
        {dow.map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {calDays.map(({ date, inMonth }) => {
          const key = isoDate(date);
          const dayVacancies = vacanciesByDay.get(key) || [];
          const isToday = key === todayISO;
          const isSelected = key === selectedISO;
          return (
            <div
              key={key}
              className={`cal-day ${inMonth ? "" : "mute"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => setSelectedISO(key)}
            >
              <div className="cal-num">{date.getDate()}</div>
              <div className="cal-open">
                {dayVacancies.length ? (
                  <>
                    {dayVacancies.slice(0, 3).map((v) => (
                      <span
                        key={v.id}
                        className="cal-chip"
                        data-wing={v.wing || undefined}
                        data-class={v.classification}
                      >
                        {v.wing ? `${v.wing} ` : ""}
                        {v.classification}
                      </span>
                    ))}
                    {dayVacancies.length > 3 && (
                      <span className="cal-chip">+{dayVacancies.length - 3} more</span>
                    )}
                  </>
                ) : (
                  <span className="subtitle">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <CoverageDayList
        dateISO={selectedISO}
        vacancies={vacanciesByDay.get(selectedISO) || []}
      />
    </div>
  );
}


function EmployeeCombo({
  employees,
  onSelect,
  includeVacant = false,
}: {
  employees: Employee[];
  onSelect: (id: string) => void;
  includeVacant?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const list = useMemo(
    () =>
      employees
        .filter((e) => matchText(q, `${e.firstName} ${e.lastName} ${e.id}`))
        .slice(0, 50),
    [q, employees],
  );
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="dropdown" ref={ref}>
      <input
        placeholder="Type name or ID…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="menu">
          {includeVacant && (
            <div
              className="item"
              onClick={() => {
                onSelect(VACANT_EMPLOYEE_ID);
                setQ("Vacant/Empty");
                setOpen(false);
              }}
            >
              Vacant/Empty
            </div>
          )}
          {list.map((e) => (
            <div
              key={e.id}
              className="item"
              onClick={() => {
                onSelect(e.id);
                setQ(`${e.firstName} ${e.lastName} (${e.id})`);
                setOpen(false);
              }}
            >
              {e.firstName} {e.lastName}{" "}
              <span className="pill" style={{ marginLeft: 6 }}>
                {e.classification} {e.status}
              </span>
            </div>
          ))}
          {!list.length && !includeVacant && (
            <div className="item" style={{ opacity: 0.7 }}>
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Helpers ----------
export function dateRangeInclusive(startISO: string, endISO: string) {
  const out: string[] = [];
  const s = new Date(startISO + "T00:00:00");
  const e = new Date(endISO + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1))
    out.push(isoDate(d));
  return out;
}
