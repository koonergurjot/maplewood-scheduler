import PDFDocument from 'pdfkit';

export interface AnalyticsRow {
  period: string;
  posted: number;
  awarded: number;
  cancelled: number;
  cancellationRate: number;
  overtime: number;
}

export function createPdf(data: AnalyticsRow[]) {
  const doc = new PDFDocument();
  doc.fontSize(16).text('Analytics');
  data.forEach(row => {
    doc
      .fontSize(12)
      .text(
        `${row.period}: posted ${row.posted}, awarded ${row.awarded}, cancelled ${row.cancelled}, ` +
          `cancellationRate ${(row.cancellationRate * 100).toFixed(2)}%, overtime ${row.overtime}`
      );
  });
  return doc;
}
