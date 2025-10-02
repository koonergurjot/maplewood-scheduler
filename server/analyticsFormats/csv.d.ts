import type { AggregatedVacancyMetrics } from "../metrics.js";

export function escapeCsv(value: unknown): string;
export function createCsv(data: AggregatedVacancyMetrics[]): string;
