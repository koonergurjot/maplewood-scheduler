const ALLOWED_STATUSES = new Set(["awarded", "cancelled", "posted"]);

const DEFAULT_MOVING_AVERAGE_WINDOW = 3;
const DEFAULT_FORECAST_PERIODS = 3;

function finalizeMetrics(acc) {
  const posted = acc.posted ?? 0;
  const cancelled = acc.cancelled ?? 0;
  const totalHours = acc.totalHours ?? 0;
  const averageHours = posted ? totalHours / posted : 0;
  const cancellationRate = posted ? cancelled / posted : 0;

  return {
    posted,
    awarded: acc.awarded ?? 0,
    cancelled,
    overtime: acc.overtime ?? 0,
    totalHours,
    cancellationRate,
    averageHours,
  };
}

function computeMovingAverage(values, window = DEFAULT_MOVING_AVERAGE_WINDOW) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    if (i + 1 < window) {
      result.push(null);
      continue;
    }
    const slice = values.slice(i + 1 - window, i + 1);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    result.push(sum / window);
  }
  return result;
}

function addMonths(period, offset) {
  const [year, month] = period.split("-").map((n) => Number.parseInt(n, 10));
  const base = new Date(year, month - 1 + offset, 1);
  const nextYear = base.getFullYear();
  const nextMonth = String(base.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function holtWintersForecast(
  series,
  {
    alpha = 0.3,
    beta = 0.1,
    periodsAhead = DEFAULT_FORECAST_PERIODS,
    lastPeriod,
  } = {},
) {
  if (!Array.isArray(series) || series.length < 2) {
    return [];
  }

  let level = series[0];
  let trend = series[1] - series[0];
  const fitted = [];

  for (const point of series) {
    const prevLevel = level;
    level = alpha * point + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    fitted.push(level + trend);
  }

  const residuals = series.slice(1).map((value, index) => {
    const prediction = fitted[index];
    return value - prediction;
  });
  const variance =
    residuals.reduce((acc, value) => acc + value * value, 0) /
      Math.max(1, residuals.length) || 0;
  const stdDev = Math.sqrt(variance);
  const basePeriod = lastPeriod ?? addMonths("1970-01", series.length - 1);

  const forecast = [];
  for (let i = 1; i <= periodsAhead; i++) {
    const forecastValue = level + trend * i;
    const period = addMonths(basePeriod, i);
    const margin = 1.96 * stdDev;
    forecast.push({
      period,
      value: forecastValue,
      lower: Math.max(0, forecastValue - margin),
      upper: forecastValue + margin,
    });
  }
  return forecast;
}

function toFlatObject(map) {
  const obj = {};
  for (const [key, value] of map.entries()) {
    obj[key] = finalizeMetrics(value);
  }
  return obj;
}

export function aggregateByMonth(vacancies, options = {}) {
  const {
    overtimeThreshold = 8,
    classifications,
    movingAverageWindow = DEFAULT_MOVING_AVERAGE_WINDOW,
    forecastPeriods = DEFAULT_FORECAST_PERIODS,
  } = options;

  const filtered = Array.isArray(classifications) && classifications.length
    ? vacancies.filter((vacancy) =>
        classifications.includes(vacancy.classification ?? "Unspecified"),
      )
    : vacancies;

  const groups = new Map();
  const availableClassifications = new Set();

  for (const vacancy of filtered) {
    if (!vacancy || typeof vacancy.date !== "string") continue;
    if (!ALLOWED_STATUSES.has(vacancy.status)) {
      console.warn(`Unknown status: ${vacancy.status}`);
      continue;
    }
    const classification = vacancy.classification ?? "Unspecified";
    availableClassifications.add(classification);

    const period = vacancy.date.slice(0, 7);
    if (!groups.has(period)) {
      groups.set(period, {
        totals: {
          posted: 0,
          awarded: 0,
          cancelled: 0,
          overtime: 0,
          totalHours: 0,
        },
        classifications: new Map(),
      });
    }

    const periodEntry = groups.get(period);
    periodEntry.totals.posted += 1;
    periodEntry.totals.totalHours += vacancy.hours ?? 0;

    if (!periodEntry.classifications.has(classification)) {
      periodEntry.classifications.set(classification, {
        posted: 0,
        awarded: 0,
        cancelled: 0,
        overtime: 0,
        totalHours: 0,
      });
    }

    const classificationEntry = periodEntry.classifications.get(classification);
    classificationEntry.posted += 1;
    classificationEntry.totalHours += vacancy.hours ?? 0;

    if (vacancy.status === "awarded") {
      periodEntry.totals.awarded += 1;
      classificationEntry.awarded += 1;
      const overtime = Math.max(0, (vacancy.hours ?? 0) - overtimeThreshold);
      periodEntry.totals.overtime += overtime;
      classificationEntry.overtime += overtime;
    } else if (vacancy.status === "cancelled") {
      periodEntry.totals.cancelled += 1;
      classificationEntry.cancelled += 1;
    }
  }

  const sortedPeriods = Array.from(groups.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const periods = sortedPeriods.map(([period, { totals, classifications: map }]) => ({
    period,
    totals: finalizeMetrics(totals),
    classifications: toFlatObject(map),
    movingAverage: { posted: null, awarded: null, overtime: null },
  }));

  const postedSeries = periods.map((period) => period.totals.posted);
  const awardedSeries = periods.map((period) => period.totals.awarded);
  const overtimeSeries = periods.map((period) => period.totals.overtime);

  const movingPosted = computeMovingAverage(postedSeries, movingAverageWindow);
  const movingAwarded = computeMovingAverage(awardedSeries, movingAverageWindow);
  const movingOvertime = computeMovingAverage(overtimeSeries, movingAverageWindow);

  periods.forEach((period, index) => {
    period.movingAverage = {
      posted: movingPosted[index],
      awarded: movingAwarded[index],
      overtime: movingOvertime[index],
    };
  });

  const forecast = holtWintersForecast(postedSeries, {
    periodsAhead: forecastPeriods,
    lastPeriod: periods.at(-1)?.period,
  });

  return {
    periods,
    forecast,
    availableClassifications: Array.from(availableClassifications).sort(),
    metadata: {
      overtimeThreshold,
      movingAverageWindow,
      forecastPeriods,
    },
  };
}

function scaleMetrics(metrics, factor) {
  const baseTotalHours = metrics.totalHours ?? metrics.posted * metrics.averageHours;
  const posted = Math.round(metrics.posted * factor);
  const awarded = Math.round(metrics.awarded * factor);
  const cancelled = Math.round(metrics.cancelled * factor);
  const overtime = metrics.overtime * factor;
  const totalHours = baseTotalHours * factor;
  const cancellationRate = posted ? cancelled / posted : 0;
  const averageHours = posted ? totalHours / posted : 0;

  return {
    posted,
    awarded,
    cancelled,
    overtime,
    totalHours,
    cancellationRate,
    averageHours,
  };
}

export function projectScenario(vacancies, options = {}) {
  const {
    classifications,
    overtimeThreshold = 8,
    extraShiftPercent = 0,
    forecastPeriods = DEFAULT_FORECAST_PERIODS,
    movingAverageWindow = DEFAULT_MOVING_AVERAGE_WINDOW,
  } = options;

  const base = aggregateByMonth(vacancies, {
    classifications,
    overtimeThreshold,
    forecastPeriods,
    movingAverageWindow,
  });

  const factor = 1 + extraShiftPercent / 100;
  const scenarioPeriods = base.periods.map((period) => {
    const scaledTotals = scaleMetrics(period.totals, factor);
    const scaledClassifications = Object.fromEntries(
      Object.entries(period.classifications).map(([cls, metrics]) => [
        cls,
        scaleMetrics(metrics, factor),
      ]),
    );
    return {
      period: period.period,
      totals: scaledTotals,
      classifications: scaledClassifications,
      movingAverage: { ...period.movingAverage },
    };
  });

  const scenarioPosted = scenarioPeriods.map((period) => period.totals.posted);
  const scenarioAwarded = scenarioPeriods.map((period) => period.totals.awarded);
  const scenarioOvertime = scenarioPeriods.map((period) => period.totals.overtime);

  const movingPosted = computeMovingAverage(
    scenarioPosted,
    movingAverageWindow,
  );
  const movingAwarded = computeMovingAverage(
    scenarioAwarded,
    movingAverageWindow,
  );
  const movingOvertime = computeMovingAverage(
    scenarioOvertime,
    movingAverageWindow,
  );

  scenarioPeriods.forEach((period, index) => {
    period.movingAverage = {
      posted: movingPosted[index],
      awarded: movingAwarded[index],
      overtime: movingOvertime[index],
    };
  });

  const scenarioForecast = holtWintersForecast(scenarioPosted, {
    periodsAhead: forecastPeriods,
    lastPeriod: scenarioPeriods.at(-1)?.period,
  });

  return {
    base,
    scenario: {
      ...base,
      periods: scenarioPeriods,
      forecast: scenarioForecast,
      metadata: {
        ...base.metadata,
        overtimeThreshold,
        extraShiftPercent,
      },
    },
  };
}

export const sampleVacancies = [
  { date: "2024-01-04", status: "awarded", hours: 10, classification: "RN" },
  { date: "2024-01-08", status: "cancelled", hours: 8, classification: "RN" },
  { date: "2024-01-12", status: "posted", hours: 7, classification: "LPN" },
  { date: "2024-02-02", status: "awarded", hours: 9, classification: "RN" },
  { date: "2024-02-11", status: "awarded", hours: 8, classification: "LPN" },
  { date: "2024-02-15", status: "cancelled", hours: 6, classification: "RCA" },
  { date: "2024-03-03", status: "posted", hours: 8, classification: "RN" },
  { date: "2024-03-10", status: "awarded", hours: 11, classification: "RCA" },
  { date: "2024-04-05", status: "awarded", hours: 12, classification: "RN" },
  { date: "2024-04-18", status: "cancelled", hours: 8, classification: "LPN" },
  { date: "2024-05-02", status: "posted", hours: 7, classification: "RCA" },
  { date: "2024-05-07", status: "awarded", hours: 9, classification: "RN" },
  { date: "2024-06-01", status: "awarded", hours: 10, classification: "LPN" },
  { date: "2024-06-09", status: "cancelled", hours: 6, classification: "RCA" },
];
