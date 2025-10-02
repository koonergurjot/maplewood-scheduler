import { useEffect, useState, useRef, useCallback } from "react";
import { Bar, Line } from "react-chartjs-2";
import { authFetch } from "./utils/api";
import { useApiAuth, useApiTokenPrompt } from "./state/apiAuth";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

export type AnalyticsRow = {
  period: string;
  posted: number;
  awarded: number;
  cancelled: number;
  cancellationRate: number;
  overtime: number;
};

export default function Analytics() {
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overtimeThreshold, setOvertimeThreshold] = useState(8);

  const [palette, setPalette] = useState({
    brand: "#047857",
    accent: "#10b981",
    warn: "#b45309",
    bad: "#b91c1c",
  });

  const controllerRef = useRef<AbortController | null>(null);
  const { waitForValidToken } = useApiAuth();
  const promptForToken = useApiTokenPrompt();

  const clampOvertimeThreshold = useCallback((value: number) => {
    return Math.min(24, Math.max(0, Math.round(value)));
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
        const params = new URLSearchParams({
          overtimeThreshold: String(overtimeThreshold),
        });
        const response = await authFetch(`/api/analytics?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setRows(data);
        setLoading(false);
        return;
      } catch (err: any) {
        if (err.name === "AbortError") {
          setLoading(false);
          controllerRef.current = null;
          return;
        }
        if (err.status === 401) {
          await waitForValidToken();
          if (controller.signal.aborted) {
            setLoading(false);
            controllerRef.current = null;
            return;
          }
          attempt = -1;
          continue;
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
  }, [overtimeThreshold, waitForValidToken]);

  const handleExport = useCallback(
    async (format: string) => {
      try {
        const params = new URLSearchParams({
          format,
          overtimeThreshold: String(overtimeThreshold),
        });
        const response = await authFetch(`/api/analytics/export?${params}`);
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
          await waitForValidToken();
          return handleExport(format);
        }
        setError(err.message);
      }
    },
    [overtimeThreshold, waitForValidToken],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rootStyles = getComputedStyle(document.documentElement);
      setPalette((prev) => {
        const brand = rootStyles.getPropertyValue("--brand").trim();
        const accent = rootStyles.getPropertyValue("--accent").trim();
        const warn = rootStyles.getPropertyValue("--warn").trim();
        const bad = rootStyles.getPropertyValue("--bad").trim();

        return {
          brand: brand || prev.brand,
          accent: accent || prev.accent,
          warn: warn || prev.warn,
          bad: bad || prev.bad,
        };
      });
    }
    loadData();
    return () => controllerRef.current?.abort();
  }, [loadData]);

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

  const labels = rows.map((r) => r.period);
  const posted = rows.map((r) => r.posted);
  const filled = rows.map((r) => r.awarded);
  const cancellationRate = rows.map((r) => r.cancellationRate * 100);
  const overtime = rows.map((r) => r.overtime);
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
        <label
          htmlFor="overtime-threshold"
          style={{ display: "block", marginBottom: 4 }}
        >
          Overtime threshold (hours)
        </label>
        <input
          id="overtime-threshold"
          type="number"
          min={0}
          max={24}
          value={overtimeThreshold}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            setOvertimeThreshold(
              clampOvertimeThreshold(
                Number.isNaN(nextValue) ? overtimeThreshold : nextValue,
              ),
            );
          }}
          onBlur={(event) => {
            const nextValue = Number(event.target.value);
            setOvertimeThreshold((current) =>
              clampOvertimeThreshold(
                Number.isNaN(nextValue) ? current : nextValue,
              ),
            );
          }}
          style={{ padding: "6px 8px", width: 120 }}
        />
      </div>
      <div style={{ width: 600 }}>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Posted",
                data: posted,
                backgroundColor: palette.brand,
              },
              {
                label: "Filled",
                data: filled,
                backgroundColor: palette.accent,
              },
            ],
          }}
        />
      </div>
      <div style={{ width: 600, marginTop: 40 }}>
        <Line
          data={{
            labels,
            datasets: [
              {
                label: "Cancellation %",
                data: cancellationRate,
                borderColor: palette.bad,
              },
              {
                label: "Overtime Hours",
                data: overtime,
                borderColor: palette.warn,
              },
            ],
          }}
        />
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
