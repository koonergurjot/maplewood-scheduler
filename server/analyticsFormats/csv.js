function escapeCsv(value) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  const escapedValue = stringValue.replace(/"/g, '""');
  return `"${escapedValue}"`;
}

export function createCsv(data) {
  const header =
    "period,posted,awarded,cancelled,cancellationRate,overtime,averageHours\n";
  const rows = data
    .map((d) =>
      [
        d.period,
        d.posted,
        d.awarded,
        d.cancelled,
        d.cancellationRate,
        d.overtime,
        d.averageHours,
      ]
        .map(escapeCsv)
        .join(","),
    )
    .join("\n");
  return header + rows;
}

export { escapeCsv };
