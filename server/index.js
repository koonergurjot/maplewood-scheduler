import express from "express";
import cors from "cors";
import { aggregateByMonth, sampleVacancies } from "./metrics.js";
import { requireAuth } from "./auth.js";
import { createCsv } from "./analyticsFormats/csv.js";
import { createPdf } from "./analyticsFormats/pdf.js";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";
import { initAgreement, loadAgreement, searchAgreement } from "./collectiveAgreement.js";

const app = express();
app.use(cors());
const uploadDir = fileURLToPath(new URL("./uploads", import.meta.url));
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

initAgreement();

app.get("/api/analytics", requireAuth, (req, res) => {
  const threshold = parseFloat(req.query.overtimeThreshold);
  const data = aggregateByMonth(sampleVacancies, {
    overtimeThreshold: isNaN(threshold) ? undefined : threshold,
  });
  res.json(data);
});

app.get("/api/analytics/export", requireAuth, (req, res) => {
  const format = req.query.format;
  const threshold = parseFloat(req.query.overtimeThreshold);
  const data = aggregateByMonth(sampleVacancies, {
    overtimeThreshold: isNaN(threshold) ? undefined : threshold,
  });
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
  const limit = parseInt(req.query.limit);
  const context = parseInt(req.query.context);
  res.json({
    matches: searchAgreement(q, {
      caseSensitive,
      limit: isNaN(limit) ? undefined : limit,
      context: isNaN(context) ? undefined : context,
    }),
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Analytics server running on port ${port}`);
});
