import { describe, it, expect } from "vitest";
import { aggregateByMonth, sampleVacancies } from "../server/metrics.js";

describe("aggregateByMonth", () => {
  it("calculates totals, breakdowns, and moving averages", () => {
    const analytics = aggregateByMonth(sampleVacancies);
    expect(analytics.availableClassifications).toEqual(["LPN", "RCA", "RN"]);
    expect(analytics.forecast).toHaveLength(3);

    const jan = analytics.periods.find((period) => period.period === "2024-01");
    const apr = analytics.periods.find((period) => period.period === "2024-04");

    expect(jan?.totals.posted).toBe(3);
    expect(jan?.totals.awarded).toBe(1);
    expect(jan?.totals.cancellationRate).toBeCloseTo(1 / 3);
    expect(jan?.totals.overtime).toBe(2);
    expect(jan?.classifications.RN.awarded).toBe(1);
    expect(jan?.classifications.LPN.posted).toBe(1);
    expect(jan?.movingAverage.posted).toBeNull();

    expect(apr?.movingAverage.posted).toBeCloseTo(7 / 3);
    expect(apr?.movingAverage.overtime).toBeCloseTo(8 / 3);
  });

  it("supports custom overtime threshold", () => {
    const analytics = aggregateByMonth(sampleVacancies, {
      overtimeThreshold: 10,
    });
    const jan = analytics.periods.find((period) => period.period === "2024-01");
    const feb = analytics.periods.find((period) => period.period === "2024-02");
    expect(jan?.totals.overtime).toBe(0);
    expect(feb?.totals.overtime).toBe(0);
  });

  it("ignores vacancies with unknown status", () => {
    const extra = {
      date: "2024-01-10",
      status: "pending",
      hours: 5,
    };
    const analytics = aggregateByMonth([...sampleVacancies, extra]);
    const jan = analytics.periods.find((period) => period.period === "2024-01");
    expect(jan?.totals.posted).toBe(3);
    expect(jan?.totals.awarded).toBe(1);
    expect(jan?.totals.cancelled).toBe(1);
  });
});
