import express from "express";
import cors from "cors";
import { aggregateByMonth, sampleVacancies } from "./metrics.js";
import { requireAuth } from "./auth.js";
import { createCsv } from "./analyticsFormats/csv.js";
import { createPdf } from "./analyticsFormats/pdf.js";
import { parseNumberParam } from "./parseNumberParam.js";

const app = express();
app.use(cors());

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

const port = process.env.PORT || 3001;
app.listen(port, "localhost", () => {
  console.log(`Analytics server running on port ${port}`);
});
