import PDFDocument from "pdfkit";

export function createPdf(data) {
  const doc = new PDFDocument();
  doc.fontSize(16).text("Analytics");
  data.forEach((row) => {
    doc
      .fontSize(12)
      .text(
        `${row.period}: posted ${row.posted}, awarded ${row.awarded}, cancelled ${row.cancelled}, ` +
          `cancellationRate ${(row.cancellationRate * 100).toFixed(2)}%, overtime ${row.overtime}, ` +
          `average hours ${row.averageHours.toFixed(2)}`,
      );
  });
  return doc;
}
