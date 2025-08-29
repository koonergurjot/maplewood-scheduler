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
  /** Range coverage intent */
  coverageType?: "full" | "some-days" | "partial-day";
  /** Selected ISO dates if not full */
  selectedDays?: string[];
  /** Optional per-day time overrides */
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
  workingDays: string[]; // ISO dates
  perDayTimes?: Record<string, { start: string; end: string }>;
  shiftStart?: string;
  shiftEnd?: string;
  offeringStep: "Casuals" | "OT-Full-Time" | "OT-Casuals";
  status: "Open" | "Pending Award" | "Awarded" | "Filled";
  awardedTo?: string;
  awardedAt?: string;
};
