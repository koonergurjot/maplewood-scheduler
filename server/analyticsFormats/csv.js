export function createCsv(data) {
  const header = 'period,posted,awarded,cancelled,cancellationRate,overtime\n';
  const rows = data
    .map(d => `${d.period},${d.posted},${d.awarded},${d.cancelled},${d.cancellationRate},${d.overtime}`)
    .join('\n');
  return header + rows;
}
