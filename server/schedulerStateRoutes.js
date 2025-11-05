import express from "express";
import { requireSchedulerAuth } from "./jwtAuth.js";
import { schedulerRateLimit } from "./schedulerRateLimiter.js";
import {
  SchedulerStatePayloadSchema,
  SchedulerStateSchema,
} from "./schedulerStateSchema.js";
import { findSchedulerState, upsertSchedulerState } from "./schedulerStateRepository.js";

const router = express.Router();

router.use(requireSchedulerAuth);
router.use(schedulerRateLimit);

router.get("/", async (req, res) => {
  try {
    const identity = req.schedulerIdentity;
    const record = await findSchedulerState(identity.userId, identity.facilityId);
    if (!record) {
      return res.status(204).send();
    }
    const parsed = SchedulerStateSchema.safeParse(record.state);
    if (!parsed.success) {
      // Stored state is invalid; treat as server error
      console.error("Stored scheduler state failed validation", parsed.error);
      return res.status(500).json({ error: "Failed to load scheduler state" });
    }
    return res.status(200).json({
      state: parsed.data,
      version: record.version,
      updatedAt: record.updatedAt,
    });
  } catch (error) {
    console.error("Failed to fetch scheduler state", error);
    return res.status(500).json({ error: "Failed to fetch scheduler state" });
  }
});

router.post("/", async (req, res) => {
  if (!req.is("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }
  const parseResult = SchedulerStatePayloadSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(422).json({ error: "Invalid scheduler state payload" });
  }

  const {
    state,
    version: expectedVersion,
  } = parseResult.data;
  const identity = req.schedulerIdentity;

  try {
    const result = await upsertSchedulerState(
      identity.userId,
      identity.facilityId,
      expectedVersion,
      state,
    );

    if (result.status === "conflict") {
      return res
        .status(409)
        .json({ serverVersion: result.version, updatedAt: result.updatedAt });
    }

    if (result.status === "created") {
      return res.status(201).json({ version: result.version });
    }

    return res.status(200).json({ version: result.version });
  } catch (error) {
    console.error("Failed to persist scheduler state", error);
    return res.status(500).json({ error: "Failed to persist scheduler state" });
  }
});

export default router;
