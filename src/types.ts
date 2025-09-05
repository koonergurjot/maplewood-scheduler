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
  bundleId?: string; // identifier linking multi-day vacancy children
  bundleMode?: "one-person" | "per-day";
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
  
  // For multi-day vacancies converted from VacancyRange
  startDate?: string;     // YYYY-MM-DD (when this is part of a range)
  endDate?: string;       // YYYY-MM-DD (when this is part of a range)
  coverageDates?: string[]; // ISO YYYY-MM-DD dates that actually require coverage
};

// Extend Bid for range coverage (safe: all optional)
export type Bid = {
  // ...keep existing fields
  vacancyId: string;
  bidderEmployeeId: string;
  bidderName: string;
  bidderStatus: Status;
  bidderClassification: Classification;
  bidTimestamp: string;
  notes?: string;

  coverageType?: "full" | "some-days" | "partial-day";
  selectedDays?: string[]; // ISO dates if not full
  timeOverrides?: Record<string, { start: string; end: string }>;
  id?: string;
  employeeId?: string;
  createdAt?: string;
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
  theme?: "dark" | "light";
  fontScale?: number;
  tabOrder?: string[];
  defaultShiftPreset?: string;
};

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


// --- Multi-day Vacancy Range ---
export type VacancyRange = {
  id: string;
  reason: string;
  classification: Classification;
  wing?: string;

  startDate: string;     // YYYY-MM-DD
  endDate: string;       // YYYY-MM-DD
  knownAt: string;       // ISO timestamp

  // Admin chooses which dates are actually worked
  workingDays: string[]; // ISO dates, e.g., ["2025-09-15", "2025-09-16", "2025-09-20"]

  // Optional per-day time overrides (when some days have different times)
  perDayTimes?: Record<string, { start: string; end: string }>;
  // Optional per-day wing overrides
  perDayWings?: Record<string, string>;
  shiftStart?: string;
  shiftEnd?: string;

  // Optional group tie; only enforced if both employee and range have values
  groupId?: string;

  offeringStep: "Casuals" | "OT-Full-Time" | "OT-Casuals";
  status: "Open" | "Pending Award" | "Awarded" | "Filled";
  awardedTo?: string;
  awardedAt?: string;
};
