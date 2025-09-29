import express from "express";
import cors from "cors";
import { aggregateByMonth, sampleVacancies } from "./metrics.js";
import { requireAuth } from "./auth.js";
import { createCsv } from "./analyticsFormats/csv.js";
import { createPdf } from "./analyticsFormats/pdf.js";
import { parseNumberParam } from "./parseNumberParam.js";

export const app = express();
app.use(cors());

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

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Analytics server running on port ${port}`);
  });
}

export default app;
