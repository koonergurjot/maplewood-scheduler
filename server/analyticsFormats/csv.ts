export interface AnalyticsRow {
  period: string;
  posted: number;
  awarded: number;
  cancelled: number;
  cancellationRate: number;
  overtime: number;
}

export function createCsv(data: AnalyticsRow[]): string {
  const header = 'period,posted,awarded,cancelled,cancellationRate,overtime\n';
  const rows = data
    .map(d => `${d.period},${d.posted},${d.awarded},${d.cancelled},${d.cancellationRate},${d.overtime}`)
    .join('\n');
  return header + rows;
}
