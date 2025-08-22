import type { OfferingTier } from '../offering/offeringMachine';

export type Classification = 'RCA' | 'LPN' | 'RN';
export type Status = 'FT' | 'PT' | 'Casual';

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  classification: Classification;
  status: Status;
  homeWing?: string; // not used for coverage now
  seniorityRank: number; // 1 = most senior
  active: boolean;
};

export type Vacation = {
  id: string;
  employeeId: string;
  employeeName: string;
  classification: Classification;
  wing: string; // wing where this vacation occurs
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  notes?: string;
  archived?: boolean;
  archivedAt?: string; // ISO
};

export type Vacancy = {
  id: string;
  vacationId?: string;
  reason: string; // e.g. Vacation Backfill
  classification: Classification;
  wing?: string;
  shiftDate: string; // ISO date
  shiftStart: string; // HH:mm
  shiftEnd: string; // HH:mm
  knownAt: string; // ISO datetime
  offeringTier: OfferingTier;
  offeringRoundStartedAt?: string;
  offeringRoundMinutes?: number;
  offeringAutoProgress?: boolean;
  offeringStep: 'Casuals' | 'OT-Regular' | 'OT-Casuals';
  status: 'Open' | 'Pending Award' | 'Awarded';
  awardedTo?: string; // employeeId
  awardedAt?: string; // ISO datetime
  awardReason?: string; // audit note when overriding recommendation or class
  overrideUsed?: boolean; // true if class override was toggled
};

export type Bid = {
  vacancyId: string;
  bidderEmployeeId: string;
  bidderName: string;
  bidderStatus: Status;
  bidderClassification: Classification;
  bidTimestamp: string; // ISO
  notes?: string;
};

export type Settings = {
  responseWindows: { lt2h: number; h2to4: number; h4to24: number; h24to72: number; gt72: number };
  theme: 'dark' | 'light';
  fontScale: number; // 1.0 = 16px base; slider adjusts overall size
};
