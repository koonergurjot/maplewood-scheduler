export interface ServerVacancySample {
  date: string;
  status: string;
  hours: number;
}

export interface AggregatedVacancyMetrics {
  period: string;
  posted: number;
  awarded: number;
  cancelled: number;
  cancellationRate: number;
  overtime: number;
  averageHours: number;
}

export function aggregateByMonth(
  vacancies: ServerVacancySample[],
  options?: { overtimeThreshold?: number },
): AggregatedVacancyMetrics[];

export const sampleVacancies: ServerVacancySample[];
