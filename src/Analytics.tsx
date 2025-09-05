import { useEffect, useState, useRef, useCallback } from "react";
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

  const controllerRef = useRef<AbortController | null>(null);

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
    try {
      const response = await authFetch(
        `/api/analytics/export?format=${format}`,
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

  useEffect(() => {
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
      <div style={{ width: 600 }}>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Posted",
                data: posted,
                backgroundColor: "rgba(54,162,235,0.5)",
              },
              {
                label: "Filled",
                data: filled,
                backgroundColor: "rgba(75,192,192,0.5)",
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
                borderColor: "red",
              },
              {
                label: "Overtime Hours",
                data: overtime,
                borderColor: "orange",
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
