import { describe, it, expect } from "vitest";
import { createCsv } from "../server/analyticsFormats/csv.js";
import type { AggregatedVacancyMetrics } from "../server/metrics.js";

describe("createCsv", () => {
  it("includes averageHours column", () => {
    const data: AggregatedVacancyMetrics[] = [
      {
        period: "2024-01",
        posted: 1,
        awarded: 1,
        cancelled: 0,
        cancellationRate: 0,
        overtime: 2,
        averageHours: 10,
      },
    ];
    const csv = createCsv(data);
    expect(csv).toContain("averageHours");
    expect(csv.trim().split("\n")[1]).toBe(
      '"2024-01","1","1","0","0","2","10"',
    );
  });

  it("escapes commas, quotes, and newlines", () => {
    const data: AggregatedVacancyMetrics[] = [
      {
        period: "2024-01",
        posted: 1,
        awarded: 1,
        cancelled: 0,
        cancellationRate: 0,
        overtime: 2,
        averageHours: 10,
      },
      {
        period: '2024-02, Q1 "Special"',
        posted: 2,
        awarded: 1,
        cancelled: 1,
        cancellationRate: 0.5,
        overtime: 3,
        averageHours: 7,
      },
      {
        period: "2024-03\nLine",
        posted: 3,
        awarded: 1,
        cancelled: 2,
        cancellationRate: 2 / 3,
        overtime: 1,
        averageHours: 8,
      },
    ];

    const csv = createCsv(data);

    const expected = [
      "period,posted,awarded,cancelled,cancellationRate,overtime,averageHours",
      '"2024-01","1","1","0","0","2","10"',
      '"2024-02, Q1 ""Special""","2","1","1","0.5","3","7"',
      `"2024-03\nLine","3","1","2","0.6666666666666666","1","8"`,
    ].join("\n");

    expect(csv).toBe(expected);
  });
});
