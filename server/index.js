import express from "express";
import cors from "cors";
import { aggregateByMonth, sampleVacancies } from "./metrics.js";
import { requireAuth } from "./auth.js";
import { createCsv } from "./analyticsFormats/csv.js";
import { createPdf } from "./analyticsFormats/pdf.js";
import { parseNumberParam } from "./parseNumberParam.js";
import { deadlineHub } from "./deadlineHub.js";

export const app = express();
app.use(cors());
app.use(express.json());

const VALID_CHANNELS = new Set(["inApp", "email", "sms"]);
const VALID_SEVERITIES = new Set(["info", "warning", "critical"]);

const sanitizeChannels = (input) =>
  Array.isArray(input)
    ? input.filter((channel) => VALID_CHANNELS.has(channel))
    : [];

const normalizeEvent = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const vacancyId = typeof raw.vacancyId === "string" ? raw.vacancyId : null;
  if (!vacancyId) return null;
  const message = typeof raw.message === "string" ? raw.message : null;
  if (!message) return null;
  const leadTimeId =
    typeof raw.leadTimeId === "string" && raw.leadTimeId
      ? raw.leadTimeId
      : "custom";
  const deadlineAt = new Date(raw.deadlineAt ?? Date.now());
  const triggeredAt = new Date(raw.triggeredAt ?? Date.now());
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : undefined,
    vacancyId,
    leadTimeId,
    message,
    deadlineAt: deadlineAt.toISOString(),
    triggeredAt: triggeredAt.toISOString(),
    severity: VALID_SEVERITIES.has(raw.severity) ? raw.severity : "info",
    channels: sanitizeChannels(raw.channels),
    suppressedChannels: sanitizeChannels(raw.suppressedChannels),
    origin: typeof raw.origin === "string" ? raw.origin : "remote",
  };
};

app.get("/api/search", (req, res) => {
  const { q, category } = req.query;
  let start, end;
  try {
    start = parseNumberParam("start", req.query.start);
    end = parseNumberParam("end", req.query.end);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (start !== undefined && start < 0) {
    return res
      .status(400)
      .json({ error: "start must be greater than or equal to 0" });
  }
  if (end !== undefined && end < 0) {
    return res
      .status(400)
      .json({ error: "end must be greater than or equal to 0" });
  }
  if (start !== undefined && end !== undefined && start > end) {
    return res
      .status(400)
      .json({ error: "start must be less than or equal to end" });
  }

  let results = sampleVacancies;

  if (q) {
    const qLower = String(q).toLowerCase();
    results = results.filter((v) =>
      Object.values(v).some((val) =>
        String(val).toLowerCase().includes(qLower),
      ),
    );
  }

  if (category) {
    results = results.filter((v) => v.status === category);
  }

  const sliceStart = start ?? 0;
  const sliceEnd = end ?? results.length;

  res.json(results.slice(sliceStart, sliceEnd));
});

app.get("/api/analytics", requireAuth, (req, res) => {
  let overtimeThreshold;
  try {
    overtimeThreshold = parseNumberParam(
      "overtimeThreshold",
      req.query.overtimeThreshold,
    );
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const data = aggregateByMonth(sampleVacancies, { overtimeThreshold });
  res.json(data);
});

app.get("/api/analytics/export", requireAuth, (req, res) => {
  const format = req.query.format;
  let overtimeThreshold;
  try {
    overtimeThreshold = parseNumberParam(
      "overtimeThreshold",
      req.query.overtimeThreshold,
    );
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const data = aggregateByMonth(sampleVacancies, { overtimeThreshold });
  switch (format) {
    case "csv": {
      res.setHeader("Content-Type", "text/csv");
      res.send(createCsv(data));
      break;
    }
    case "pdf": {
      res.setHeader("Content-Type", "application/pdf");
      const doc = createPdf(data);
      doc.pipe(res);
      doc.end();
      break;
    }
    default:
      res.status(400).json({ error: "format query parameter required (csv|pdf)" });
  }
});

app.get("/api/deadlines/stream", requireAuth, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }
  res.write("event: ready\ndata: {}\n\n");
  const clientId = deadlineHub.addClient(res);
  req.on("close", () => {
    deadlineHub.removeClient(clientId);
  });
});

app.post("/api/deadlines", requireAuth, async (req, res) => {
  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  const sanitized = events
    .map((event) => normalizeEvent(event))
    .filter((event) => event !== null);
  if (!sanitized.length) {
    return res.status(400).json({ error: "events array required" });
  }
  try {
    const broadcasts = await Promise.all(
      sanitized.map((event) => deadlineHub.broadcast(event)),
    );
    res.status(202).json({ accepted: broadcasts.length });
  } catch (err) {
    console.error("Failed to broadcast deadline events", err);
    res.status(500).json({ error: "Failed to broadcast events" });
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Analytics server running on port ${port}`);
  });
}

export { deadlineHub };
export default app;
