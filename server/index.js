import express from 'express';
import cors from 'cors';
import { aggregateByMonth, sampleVacancies } from './metrics.js';
import { requireAuth } from './auth.js';
import { createCsv } from './analyticsFormats/csv.js';
import { createPdf } from './analyticsFormats/pdf.js';

const app = express();
app.use(cors());

app.get('/api/analytics', requireAuth, (req, res) => {
  const data = aggregateByMonth(sampleVacancies);
  res.json(data);
});

app.get('/api/analytics/export', requireAuth, (req, res) => {
  const format = req.query.format;
  const data = aggregateByMonth(sampleVacancies);
  switch (format) {
    case 'csv': {
      res.setHeader('Content-Type', 'text/csv');
      res.send(createCsv(data));
      break;
    }
    case 'pdf': {
      res.setHeader('Content-Type', 'application/pdf');
      const doc = createPdf(data);
      doc.pipe(res);
      doc.end();
      break;
    }
    default:
      res.status(400).json({ error: 'format query param required (csv|pdf)' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Analytics server running on port ${port}`);
});
