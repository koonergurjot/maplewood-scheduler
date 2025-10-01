import express from "express";
import cors from "cors";
import {
  aggregateByMonth,
  projectScenario,
  sampleVacancies,
} from "./metrics.js";
import { requireAuth } from "./auth.js";
import { createCsv } from "./analyticsFormats/csv.js";
import { createPdf } from "./analyticsFormats/pdf.js";
import { parseNumberParam } from "./parseNumberParam.js";

export const app = express();
app.use(cors());
app.use(express.json());

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

  const classificationsParam = req.query.classifications;
  let classifications;
  if (typeof classificationsParam === "string" && classificationsParam.trim()) {
    classifications = classificationsParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  const data = aggregateByMonth(sampleVacancies, {
    overtimeThreshold,
    classifications,
  });
  res.json(data);
});

function toExportRows(analytics) {
  return analytics.periods.map((period) => ({
    period: period.period,
    posted: period.totals.posted,
    awarded: period.totals.awarded,
    cancelled: period.totals.cancelled,
    cancellationRate: period.totals.cancellationRate,
    overtime: period.totals.overtime,
    averageHours: period.totals.averageHours,
  }));
}

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
  const rows = toExportRows(data);
  switch (format) {
    case "csv": {
      res.setHeader("Content-Type", "text/csv");
      res.send(createCsv(rows));
      break;
    }
    case "pdf": {
      res.setHeader("Content-Type", "application/pdf");
      const doc = createPdf(rows);
      doc.pipe(res);
      doc.end();
      break;
    }
    default:
      res
        .status(400)
        .json({ error: "format query parameter required (csv|pdf)" });
  }
});

app.post("/api/analytics/scenario", requireAuth, (req, res) => {
  const { classifications, overtimeThreshold, extraShiftPercent } = req.body ?? {};

  if (!Array.isArray(classifications) || classifications.length === 0) {
    return res
      .status(400)
      .json({ error: "classifications must be a non-empty array" });
  }
  if (
    classifications.some(
      (value) => typeof value !== "string" || value.trim().length === 0,
    )
  ) {
    return res
      .status(400)
      .json({ error: "classifications must only contain strings" });
  }

  if (overtimeThreshold === undefined) {
    return res
      .status(400)
      .json({ error: "overtimeThreshold is required for scenario" });
  }

  const parsedOvertime = Number(overtimeThreshold);
  if (!Number.isFinite(parsedOvertime) || parsedOvertime <= 0) {
    return res.status(400).json({
      error: "overtimeThreshold must be a positive number",
    });
  }

  const parsedExtra = extraShiftPercent === undefined ? 0 : Number(extraShiftPercent);
  if (!Number.isFinite(parsedExtra)) {
    return res
      .status(400)
      .json({ error: "extraShiftPercent must be a number" });
  }
  if (parsedExtra < -50 || parsedExtra > 200) {
    return res.status(400).json({
      error: "extraShiftPercent must be between -50 and 200",
    });
  }

  const result = projectScenario(sampleVacancies, {
    classifications: classifications.map((value) => value.trim()),
    overtimeThreshold: parsedOvertime,
    extraShiftPercent: parsedExtra,
  });

  res.json(result);
});

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Analytics server running on port ${port}`);
  });
}

export default app;
