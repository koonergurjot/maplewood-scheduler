import express from 'express';
import cors from 'cors';
import PDFDocument from 'pdfkit';
import { aggregateByMonth, sampleVacancies } from './metrics.js';

const app = express();
app.use(cors());

app.get('/api/analytics', (req, res) => {
  const data = aggregateByMonth(sampleVacancies);
  res.json(data);
});

app.get('/api/analytics/export', (req, res) => {
  const format = req.query.format;
  const data = aggregateByMonth(sampleVacancies);
  if (format === 'csv') {
    const header = 'period,posted,awarded,cancelled,cancellationRate,overtime\n';
    const rows = data
      .map(d => `${d.period},${d.posted},${d.awarded},${d.cancelled},${d.cancellationRate},${d.overtime}`)
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.send(header + rows);
  } else if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    const doc = new PDFDocument();
    doc.pipe(res);
    doc.fontSize(16).text('Analytics');
    data.forEach(row => {
      doc.fontSize(12).text(`${row.period}: posted ${row.posted}, awarded ${row.awarded}, cancelled ${row.cancelled}, cancellationRate ${(row.cancellationRate * 100).toFixed(2)}%, overtime ${row.overtime}`);
    });
    doc.end();
  } else {
    res.status(400).json({ error: 'format query param required (csv|pdf)' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Analytics server running on port ${port}`);
});
