export interface AnalyticsExportRow {
  period: string;
  posted: number;
  awarded: number;
  cancelled: number;
  cancellationRate: number;
  overtime: number;
  averageHours: number;
}

export function createCsv(data: AnalyticsExportRow[]): string;
