export type Classification = "RCA" | "LPN" | "RN";
export type Status = "FT" | "PT" | "Casual";

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  classification: Classification;
  status: Status;
  homeWing?: string;
  startDate?: string;
  seniorityHours?: number;
  seniorityRank: number;
  active: boolean;
};

export type Vacation = {
  id: string;
  employeeId: string;
  employeeName: string;
  classification: Classification;
  wing: string;
  startDate: string;
  endDate: string;
  notes?: string;
  archived?: boolean;
  archivedAt?: string;
};

export type Vacancy = {
  id: string;
  vacationId?: string;
  reason: string;
  classification: Classification;
  wing?: string;
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  knownAt: string;
  offeringTier: any;
  offeringRoundStartedAt?: string;
  offeringRoundMinutes?: number;
  offeringAutoProgress?: boolean;
  offeringStep: "Casuals" | "OT-Full-Time" | "OT-Casuals";
  status: "Open" | "Pending Award" | "Awarded" | "Filled";
  awardedTo?: string;
  awardedAt?: string;
  awardReason?: string;
  overrideUsed?: boolean;
};

export type Bid = {
  /** Range coverage intent: full = all workingDays, some-days = subset, partial-day = shorter time on specific day(s) */
  coverageType?: BidCoverageType;
  /** If bidding on a range, selected ISO dates inside the range */
  selectedDays?: string[];
  /** Optional per-day time overrides (for partial-day bids) */
  timeOverrides?: Record<string, { start: string; end: string }>;

  vacancyId: string;
  bidderEmployeeId: string;
  bidderName: string;
  bidderStatus: Status;
  bidderClassification: Classification;
  bidTimestamp: string;
  notes?: string;
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
  fontScale: number;
  tabOrder: string[];
  defaultShiftPreset: string;
};

// --- Maplewood: Multi-day Vacancy Range support (added) ---
export type VacancyRange = {
  id: string;
  reason: string;
  classification: Classification;
  wing?: string;
  startDate: string;     // inclusive ISO date (YYYY-MM-DD)
  endDate: string;       // inclusive ISO date
  knownAt: string;       // ISO timestamp the vacancy was announced
  workingDays: string[]; // ISO dates inside [startDate, endDate] that are actual worked days
  /**
   * Times can vary per worked day. Keys are ISO dates.
   * If a date is missing here, use default shift times (shiftStart/shiftEnd below).
   */
  perDayTimes?: Record<string, { start: string; end: string }>;
  /**
   * Optional defaults/presets when first creating the range.
   * These are not authoritative per day; perDayTimes takes precedence.
   */
  shiftStart?: string;
  shiftEnd?: string;
  offeringStep: "Casuals" | "OT-Full-Time" | "OT-Casuals";
  status: "Open" | "Pending Award" | "Awarded" | "Filled";
  /**
   * If awarded, this is the employee id who covers ALL workingDays.
   * Award happens as an atomic action across the group.
   */
  awardedTo?: string;
  awardedAt?: string;
};

// Extend Bid to capture coverage type for range bids
export type BidCoverageType = "full" | "some-days" | "partial-day";

// Note: existing fields remain unchanged; we add a few optional fields for range context.
declare module "./types-augment" {} // placeholder to avoid duplicate exports when tooling bundles

export const WINGS = [
  "Shamrock",
  "Bluebell",
  "Rosewood",
  "Front",
  "Receptionist",
] as const;

export const SHIFT_PRESETS = [
  { label: "Day", start: "06:30", end: "14:30" },
  { label: "Evening", start: "14:30", end: "22:30" },
  { label: "Night", start: "22:30", end: "06:30" },
] as const;

export const OVERRIDE_REASONS = [
  "Earlier bidder within step",
  "Availability mismatch / declined",
  "Single Site Order / conflict",
  "Scope of practice / skill mix",
  "Fatigue risk (back‑to‑back)",
  "Unit familiarity / continuity",
  "Manager discretion",
] as const;
