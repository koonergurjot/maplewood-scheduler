import { z } from "zod";

import {
  SchedulerPersistedStateSchema,
  SchedulerStatePayloadSchema,
  type SchedulerPersistedState,
} from "../schemas/schedulerState";

import type { PersistedState } from "./schedulerStore";

export function parsePersistedStatePayload(
  payload: any,
): PersistedState | null {
  const payloadSchema = SchedulerStatePayloadSchema
    .extend({
      state: SchedulerPersistedStateSchema.optional(),
      version: z.number().int().nonnegative().optional(),
      updatedAt: z.string().optional(),
    })
    .partial({ state: true, version: true, updatedAt: true });

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  const { state, version, updatedAt } = parsed.data;
  if (!state) return null;

  const normalized: SchedulerPersistedState = {
    ...state,
  };

  if (typeof version === "number") {
    normalized.version = version;
  }
  if (typeof updatedAt === "string") {
    normalized.updatedAt = updatedAt;
  }

  return normalized;
}
