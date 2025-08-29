import express from "express";
import cors from "cors";
import { aggregateByMonth, sampleVacancies } from "./metrics.js";
import { requireAuth } from "./auth.js";
import { createCsv } from "./analyticsFormats/csv.js";
import { createPdf } from "./analyticsFormats/pdf.js";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  initAgreement,
  loadAgreement,
  searchAgreement,
} from "./collectiveAgreement.js";
import { parseNumberParam } from "./parseNumberParam.js";

const app = express();
app.use(cors());
const uploadDir = fileURLToPath(new URL("./uploads", import.meta.url));
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

initAgreement();

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

app.post(
  "/api/collective-agreement/upload",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    try {
      await loadAgreement(req.file.path);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to process agreement" });
    }
  },
);

app.get("/api/collective-agreement/search", requireAuth, (req, res) => {
  const q = req.query.q;
  if (typeof q !== "string" || !q) return res.json({ matches: [] });
  const caseSensitive = req.query.caseSensitive === "true";
  let limit;
  let context;
  try {
    limit = parseNumberParam("limit", req.query.limit);
    context = parseNumberParam("context", req.query.context);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (limit !== undefined) limit = Math.trunc(limit);
  if (context !== undefined) context = Math.trunc(context);

  res.json({
    matches: searchAgreement(q, {
      caseSensitive,
      limit,
      context,
    }),
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Analytics server running on port ${port}`);
});
