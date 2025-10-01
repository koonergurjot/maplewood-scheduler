import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Bar, Line } from "react-chartjs-2";
import { authFetch, setToken } from "./utils/api";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

type ClassificationMetrics = {
  posted: number;
  awarded: number;
  cancelled: number;
  overtime: number;
  totalHours: number;
  cancellationRate: number;
  averageHours: number;
};

type MovingAverageMetrics = {
  posted: number | null;
  awarded: number | null;
  overtime: number | null;
};

type PeriodAnalytics = {
  period: string;
  totals: ClassificationMetrics;
  classifications: Record<string, ClassificationMetrics>;
  movingAverage: MovingAverageMetrics;
};

type ForecastPoint = {
  period: string;
  value: number;
  lower: number;
  upper: number;
};

type AnalyticsPayload = {
  periods: PeriodAnalytics[];
  forecast: ForecastPoint[];
  availableClassifications: string[];
  metadata: {
    overtimeThreshold?: number;
    movingAverageWindow?: number;
    forecastPeriods?: number;
    extraShiftPercent?: number;
  };
};

type ScenarioResponse = {
  base: AnalyticsPayload;
  scenario: AnalyticsPayload;
};

const EXTRA_SHIFT_MIN = -50;
const EXTRA_SHIFT_MAX = 200;

const BASE_COLORS = [
  "rgba(54,162,235,0.6)",
  "rgba(75,192,192,0.6)",
  "rgba(153,102,255,0.6)",
  "rgba(255,159,64,0.6)",
  "rgba(201,203,207,0.6)",
];

const SCENARIO_COLORS = [
  "rgba(255,99,132,0.45)",
  "rgba(255,205,86,0.45)",
  "rgba(255,159,64,0.45)",
  "rgba(201,203,207,0.45)",
  "rgba(153,102,255,0.45)",
];

function padArray<T>(input: T[], targetLength: number, fill: T) {
  if (input.length >= targetLength) return input;
  return [...input, ...Array(targetLength - input.length).fill(fill)];
}

function buildSeriesMap(values: ForecastPoint[]) {
  return values.reduce<Record<string, ForecastPoint>>((map, point) => {
    map[point.period] = point;
    return map;
  }, {});
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [scenario, setScenario] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [overtimeThreshold, setOvertimeThreshold] = useState(8);
  const [extraShiftPercent, setExtraShiftPercent] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);
  const thresholdInitialized = useRef(false);
  const classesInitialized = useRef(false);

  const promptForToken = useCallback(() => {
    const token = window.prompt("Enter API token");
    if (token) setToken(token);
    return token;
  }, []);

  const loadData = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await authFetch("/api/analytics", {
          signal: controller.signal,
        });
        const data: AnalyticsPayload = await response.json();
        setAnalytics(data);
        setScenario(null);
        if (
          !thresholdInitialized.current &&
          data.metadata?.overtimeThreshold !== undefined
        ) {
          setOvertimeThreshold(data.metadata.overtimeThreshold);
          thresholdInitialized.current = true;
        }
        if (
          !classesInitialized.current &&
          data.availableClassifications.length > 0
        ) {
          setSelectedClasses(data.availableClassifications);
          classesInitialized.current = true;
        }
        setLoading(false);
        return;
      } catch (err: any) {
        if (err.name === "AbortError") {
          setLoading(false);
          controllerRef.current = null;
          return;
        }
        if (err.status === 401) {
          if (promptForToken()) {
            continue;
          }
          err = new Error("Unauthorized");
        }
        if (attempt < maxRetries - 1) {
          const delay = 500 * 2 ** attempt;
          await new Promise((res) => setTimeout(res, delay));
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    }
  }, [promptForToken]);

  const handleExport = async (format: string) => {
    if (!analytics) return;
    const params = new URLSearchParams({ format });
    const threshold = analytics.metadata?.overtimeThreshold;
    if (threshold !== undefined) {
      params.set("overtimeThreshold", String(threshold));
    }
    try {
      const response = await authFetch(
        `/api/analytics/export?${params.toString()}`,
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err.status === 401) {
        if (promptForToken()) {
          return handleExport(format);
        }
        setError("Unauthorized");
      } else {
        setError(err.message);
      }
    }
  };

  const runScenario = useCallback(async () => {
    if (!analytics) return;
    if (selectedClasses.length === 0) {
      setScenarioError("Select at least one classification to project.");
      return;
    }

    setScenarioLoading(true);
    setScenarioError(null);
    try {
      const response = await authFetch("/api/analytics/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classifications: selectedClasses,
          overtimeThreshold,
          extraShiftPercent,
        }),
      });
      const payload: ScenarioResponse = await response.json();
      setScenario(payload.scenario);
    } catch (err: any) {
      if (err.status === 401) {
        if (promptForToken()) {
          setScenarioLoading(false);
          return runScenario();
        }
        setScenarioError("Unauthorized");
      } else {
        setScenarioError(err.message);
      }
    } finally {
      setScenarioLoading(false);
    }
  }, [
    analytics,
    selectedClasses,
    overtimeThreshold,
    extraShiftPercent,
    promptForToken,
  ]);

  useEffect(() => {
    loadData();
    return () => controllerRef.current?.abort();
  }, [loadData]);

  const toggleClassification = (cls: string) => {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((item) => item !== cls) : [...prev, cls],
    );
  };

  const classificationOptions = analytics?.availableClassifications ?? [];

  const barChartData = useMemo(() => {
    if (!analytics) return null;
    const labels = analytics.periods.map((period) => period.period);
    const classificationSet = new Set<string>(
      analytics.availableClassifications,
    );
    scenario?.availableClassifications.forEach((cls) =>
      classificationSet.add(cls),
    );
    const classificationList = Array.from(classificationSet).sort();

    const baseDatasets = classificationList.map((cls, index) => ({
      label: `Base ${cls}`,
      data: analytics.periods.map(
        (period) => period.classifications[cls]?.posted ?? 0,
      ),
      backgroundColor: BASE_COLORS[index % BASE_COLORS.length],
      stack: "base",
    }));

    const scenarioDatasets = scenario
      ? classificationList.map((cls, index) => ({
          label: `Scenario ${cls}`,
          data: scenario.periods.map(
            (period) => period.classifications[cls]?.posted ?? 0,
          ),
          backgroundColor:
            SCENARIO_COLORS[index % SCENARIO_COLORS.length],
          stack: "scenario",
        }))
      : [];

    return {
      labels,
      datasets: [...baseDatasets, ...scenarioDatasets],
    };
  }, [analytics, scenario]);

  const lineChartData = useMemo(() => {
    if (!analytics) return null;

    const labels = [...analytics.periods.map((period) => period.period)];
    const appendLabel = (value: string) => {
      if (!labels.includes(value)) labels.push(value);
    };
    analytics.forecast.forEach((point) => appendLabel(point.period));
    scenario?.forecast.forEach((point) => appendLabel(point.period));
    const labelCount = labels.length;

    const baseActual = padArray<number | null>(
      analytics.periods.map((period) => period.totals.posted),
      labelCount,
      null,
    );
    const baseMovingAverage = padArray(
      analytics.periods.map((period) => period.movingAverage.posted ?? null),
      labelCount,
      null,
    );

    const forecastMap = buildSeriesMap(analytics.forecast);
    const baseForecastMean = labels.map((period) =>
      forecastMap[period]?.value ?? null,
    );
    const baseForecastUpper = labels.map((period) =>
      forecastMap[period]?.upper ?? null,
    );
    const baseForecastLower = labels.map((period) =>
      forecastMap[period]?.lower ?? null,
    );

    const scenarioActual = scenario
      ? padArray<number | null>(
          scenario.periods.map((period) => period.totals.posted),
          labelCount,
          null,
        )
      : [];

    const scenarioForecastMap = scenario
      ? buildSeriesMap(scenario.forecast)
      : {};
    const scenarioForecastMean = scenario
      ? labels.map((period) => scenarioForecastMap[period]?.value ?? null)
      : [];
    const scenarioForecastUpper = scenario
      ? labels.map((period) => scenarioForecastMap[period]?.upper ?? null)
      : [];
    const scenarioForecastLower = scenario
      ? labels.map((period) => scenarioForecastMap[period]?.lower ?? null)
      : [];

    const datasets: any[] = [
      {
        label: "Base Posted",
        data: baseActual,
        borderColor: "rgba(54,162,235,1)",
        backgroundColor: "rgba(54,162,235,0.1)",
        pointRadius: 3,
        tension: 0.3,
        spanGaps: true,
      },
      {
        label: "Base Moving Average",
        data: baseMovingAverage,
        borderColor: "rgba(255,159,64,1)",
        backgroundColor: "rgba(255,159,64,0.1)",
        pointRadius: 0,
        borderDash: [6, 3],
        tension: 0.3,
        spanGaps: true,
      },
    ];

    if (scenario) {
      datasets.splice(1, 0, {
        label: "Scenario Posted",
        data: scenarioActual,
        borderColor: "rgba(255,99,132,1)",
        backgroundColor: "rgba(255,99,132,0.1)",
        pointRadius: 3,
        tension: 0.3,
        spanGaps: true,
      });
    }

    if (baseForecastMean.some((value) => value !== null)) {
      datasets.push(
        {
          label: "Forecast Lower",
          data: baseForecastLower,
          borderColor: "rgba(99,132,255,0)",
          backgroundColor: "rgba(99,132,255,0)",
          pointRadius: 0,
          spanGaps: true,
          fill: false,
          tension: 0.3,
        },
        {
          label: "Forecast Range",
          data: baseForecastUpper,
          borderColor: "rgba(99,132,255,0)",
          backgroundColor: "rgba(99,132,255,0.2)",
          pointRadius: 0,
          spanGaps: true,
          fill: "-1",
          tension: 0.3,
        },
        {
          label: "Forecast Mean",
          data: baseForecastMean,
          borderColor: "rgba(99,132,255,1)",
          backgroundColor: "rgba(99,132,255,0.1)",
          pointRadius: 3,
          borderDash: [4, 4],
          tension: 0.3,
          spanGaps: true,
        },
      );
    }

    if (scenario && scenarioForecastMean.some((value) => value !== null)) {
      datasets.push(
        {
          label: "Scenario Forecast Lower",
          data: scenarioForecastLower,
          borderColor: "rgba(255,99,132,0)",
          backgroundColor: "rgba(255,99,132,0)",
          pointRadius: 0,
          spanGaps: true,
          fill: false,
          tension: 0.3,
        },
        {
          label: "Scenario Forecast Range",
          data: scenarioForecastUpper,
          borderColor: "rgba(255,99,132,0)",
          backgroundColor: "rgba(255,99,132,0.2)",
          pointRadius: 0,
          spanGaps: true,
          fill: "-1",
          tension: 0.3,
        },
        {
          label: "Scenario Forecast Mean",
          data: scenarioForecastMean,
          borderColor: "rgba(255,99,132,1)",
          backgroundColor: "rgba(255,99,132,0.1)",
          pointRadius: 3,
          borderDash: [4, 4],
          tension: 0.3,
          spanGaps: true,
        },
      );
    }

    return { labels, datasets };
  }, [analytics, scenario]);

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Analytics</h1>
        <button
          onClick={promptForToken}
          className="btn"
          style={{ marginBottom: 10 }}
        >
          Set API Token
        </button>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Analytics</h1>
        <button
          onClick={promptForToken}
          className="btn"
          style={{ marginBottom: 10 }}
        >
          Set API Token
        </button>
        <p>Error loading analytics: {error}</p>
        <button onClick={loadData} className="btn">
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Analytics</h1>
        <p>No analytics data available.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Analytics</h1>
      <button
        onClick={promptForToken}
        className="btn"
        style={{ marginBottom: 10 }}
      >
        Set API Token
      </button>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 10 }}>Scenario Planning</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {classificationOptions.map((cls) => (
            <label key={cls} style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={selectedClasses.includes(cls)}
                onChange={() => toggleClassification(cls)}
                style={{ marginRight: 6 }}
              />
              {cls}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            Overtime threshold: {overtimeThreshold.toFixed(1)} hours
          </label>
          <input
            type="range"
            min={4}
            max={16}
            step={0.5}
            value={overtimeThreshold}
            onChange={(event) =>
              setOvertimeThreshold(Number.parseFloat(event.target.value))
            }
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            Extra shifts: {extraShiftPercent}%
          </label>
          <input
            type="range"
            min={EXTRA_SHIFT_MIN}
            max={EXTRA_SHIFT_MAX}
            step={5}
            value={extraShiftPercent}
            onChange={(event) =>
              setExtraShiftPercent(Number.parseFloat(event.target.value))
            }
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={runScenario}
            className="btn"
            disabled={scenarioLoading}
          >
            {scenarioLoading ? "Running scenario..." : "Run Scenario"}
          </button>
        </div>
        {scenarioError && (
          <p style={{ color: "#d33", marginTop: 8 }}>{scenarioError}</p>
        )}
      </div>
      <div style={{ width: "min(900px, 100%)" }}>
        <h2>Posted Shifts by Classification</h2>
        {barChartData && (
          <Bar
            data={barChartData}
            options={{
              responsive: true,
              interaction: { mode: "index", intersect: false },
              scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true },
              },
            }}
          />
        )}
      </div>
      <div style={{ width: "min(900px, 100%)", marginTop: 40 }}>
        <h2>Volume Trends & Forecast</h2>
        {lineChartData && (
          <Line
            data={lineChartData}
            options={{
              responsive: true,
              interaction: { mode: "index", intersect: false },
              scales: {
                y: { beginAtZero: true },
              },
              plugins: {
                legend: {
                  labels: {
                    filter: (item) =>
                      !(item.text && item.text.toLowerCase().includes("lower")),
                  },
                },
              },
            }}
          />
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        <button onClick={() => handleExport("csv")} className="btn">
          Export CSV
        </button>
        <button
          onClick={() => handleExport("pdf")}
          className="btn"
          style={{ marginLeft: 10 }}
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
