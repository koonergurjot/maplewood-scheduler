export function createCsv(data) {
  const header =
    'period,posted,awarded,cancelled,cancellationRate,overtime,averageHours\n';
  const rows = data
    .map(
      d =>
        `${d.period},${d.posted},${d.awarded},${d.cancelled},${d.cancellationRate},${d.overtime},${d.averageHours}`,
    )
    .join('\n');
  return header + rows;
}
