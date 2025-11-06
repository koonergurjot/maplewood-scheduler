import { z } from "zod";

const classificationSchema = z.string().min(1);
const statusSchema = z.enum(["FT", "PT", "Casual"]).optional();

export const EmployeeSchema = z
  .object({
    id: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    classification: classificationSchema,
    status: statusSchema,
    homeWing: z.string().optional(),
    startDate: z.string().optional(),
    seniorityHours: z.number().optional(),
    seniorityRank: z.number(),
    active: z.boolean(),
    activeLabel: z.string().min(1),
  })
  .passthrough();

export const VacationSchema = z
  .object({
    id: z.string().min(1),
    employeeId: z.string().min(1),
    employeeName: z.string().min(1),
    classification: classificationSchema,
    wing: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    notes: z.string().optional(),
    archived: z.boolean().optional(),
    archivedAt: z.string().optional(),
  })
  .passthrough();

const vacancyStatusSchema = z.enum([
  "Open",
  "Awarded",
  "Filled",
  "Pending Award",
]);

export const VacancySchema = z
  .object({
    id: z.string().min(1),
    vacationId: z.string().optional(),
    vacancyRef: z.string().optional(),
    bundleId: z.string().optional(),
    bundleMode: z.enum(["one-person", "split", "per-day"]).optional(),
    date: z.string().min(1),
    start: z.string().optional(),
    end: z.string().optional(),
    reason: z.string().min(1),
    classification: classificationSchema,
    wing: z.string().optional(),
    shiftDate: z.string().min(1),
    shiftStart: z.string().min(1),
    shiftEnd: z.string().min(1),
    knownAt: z.string().min(1),
    offeringTier: z.any(),
    offeringRoundStartedAt: z.string().optional(),
    offeringRoundMinutes: z.number().optional(),
    offeringAutoProgress: z.boolean().optional(),
    offeringStep: z.enum(["Casuals", "OT-Full-Time", "OT-Casuals"]),
    status: vacancyStatusSchema,
    awardedTo: z.string().optional(),
    awardedAt: z.string().optional(),
    awardReason: z.string().optional(),
    overrideUsed: z.boolean().optional(),
    tags: z.array(z.any()).optional(),
    archived: z.boolean().optional(),
    archivedAt: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    coverageDates: z.array(z.string()).optional(),
  })
  .passthrough();

export const BidSchema = z
  .object({
    vacancyId: z.string().min(1),
    bidderEmployeeId: z.string().min(1),
    bidderName: z.string().min(1),
    bidderStatus: z.enum(["FT", "PT", "Casual"]),
    bidderClassification: classificationSchema,
    bidTimestamp: z.string().min(1),
    notes: z.string().optional(),
    coverageType: z.enum(["full", "some-days", "partial-day"]).optional(),
    selectedDays: z.array(z.string()).optional(),
    timeOverrides: z
      .record(z.object({ start: z.string(), end: z.string() }))
      .optional(),
    id: z.string().optional(),
    employeeId: z.string().optional(),
    createdAt: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough();

export const VacancyRangeSchema = z
  .object({
    id: z.string().min(1),
    reason: z.string().min(1),
    classification: classificationSchema,
    wing: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    knownAt: z.string().min(1),
    workingDays: z.array(z.string()),
    perDayTimes: z
      .record(z.object({ start: z.string().min(1), end: z.string().min(1) }))
      .optional(),
    perDayWings: z.record(z.string()).optional(),
    shiftStart: z.string().optional(),
    shiftEnd: z.string().optional(),
    groupId: z.string().optional(),
    offeringStep: z.enum(["Casuals", "OT-Full-Time", "OT-Casuals"]),
    status: vacancyStatusSchema,
    awardedTo: z.string().optional(),
    awardedAt: z.string().optional(),
    awardAsBlock: z.boolean().optional(),
  })
  .passthrough();

const responseWindowSchema = z.object({
  lt2h: z.number(),
  h2to4: z.number(),
  h4to24: z.number(),
  h24to72: z.number(),
  gt72: z.number(),
});

export const SettingsSchema = z
  .object({
    responseWindows: responseWindowSchema,
    theme: z.enum(["dark", "light"]).optional(),
    fontScale: z.number().optional(),
    tabOrder: z.array(z.string()).optional(),
    defaultShiftPreset: z.string().optional(),
  })
  .passthrough();

const baseSchedulerStateSchema = z
  .object({
    employees: z.array(EmployeeSchema).optional(),
    vacations: z.array(VacationSchema).optional(),
    vacancies: z.array(VacancySchema).optional(),
    bids: z.array(BidSchema).optional(),
    archivedBids: z.record(z.array(BidSchema)).optional(),
    settings: SettingsSchema.optional(),
    vacancyRanges: z.array(VacancyRangeSchema).optional(),
    updatedAt: z.string().min(1),
  })
  .passthrough();

export const SchedulerStateSchema = baseSchedulerStateSchema;

export const SchedulerStatePayloadSchema = z.object({
  state: SchedulerStateSchema,
  version: z.number().int().nonnegative(),
});

const persistedEmployeeSchema = EmployeeSchema.extend({
  activeLabel: EmployeeSchema.shape.activeLabel.optional(),
});
const persistedBidSchema = BidSchema.partial();
const persistedVacancySchema = VacancySchema.partial({
  status: true,
  reason: true,
  classification: true,
  shiftDate: true,
  shiftStart: true,
  shiftEnd: true,
  knownAt: true,
  offeringStep: true,
});

const persistedArchivedBidsSchema = z
  .object({})
  .catchall(
    z.union([
      z.array(persistedBidSchema),
      z.object({}).catchall(z.unknown()).passthrough(),
    ]),
  )
  .passthrough();

export const SchedulerPersistedStateSchema = baseSchedulerStateSchema
  .extend({
    employees: z.array(persistedEmployeeSchema).optional(),
    settings: SettingsSchema.partial().optional(),
    vacancies: z.array(persistedVacancySchema).optional(),
    bids: z.array(persistedBidSchema).optional(),
    archivedBids: persistedArchivedBidsSchema.optional(),
    version: z.number().optional(),
    updatedAt: baseSchedulerStateSchema.shape.updatedAt.optional(),
  })
  .passthrough();

export type SchedulerState = z.infer<typeof SchedulerStateSchema>;
export type SchedulerStatePayload = z.infer<typeof SchedulerStatePayloadSchema>;
export type SchedulerPersistedState = z.infer<
  typeof SchedulerPersistedStateSchema
>;
