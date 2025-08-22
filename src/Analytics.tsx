import { useEffect, useState, useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

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

  const loadData = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch('/api/analytics', { signal: controller.signal });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        const data = await response.json();
        setRows(data);
        setLoading(false);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setLoading(false);
          controllerRef.current = null;
          return;
        }
        if (attempt < maxRetries - 1) {
          const delay = 500 * 2 ** attempt;
          await new Promise(res => setTimeout(res, delay));
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    loadData();
    return () => controllerRef.current?.abort();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Analytics</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Analytics</h1>
        <p>Error loading analytics: {error}</p>
        <button onClick={loadData} className="btn">Retry</button>
      </div>
    );
  }

  const labels = rows.map(r => r.period);
  const posted = rows.map(r => r.posted);
  const awarded = rows.map(r => r.awarded);
  const cancellationRate = rows.map(r => r.cancellationRate * 100);
  const overtime = rows.map(r => r.overtime);
  return (
    <div style={{ padding: 20 }}>
      <h1>Analytics</h1>
      <div style={{ width: 600 }}>
        <Bar
          data={{
            labels,
            datasets: [
              { label: 'Posted', data: posted, backgroundColor: 'rgba(54,162,235,0.5)' },
              { label: 'Awarded', data: awarded, backgroundColor: 'rgba(75,192,192,0.5)' }
            ]
          }}
        />
      </div>
      <div style={{ width: 600, marginTop: 40 }}>
        <Line
          data={{
            labels,
            datasets: [
              { label: 'Cancellation %', data: cancellationRate, borderColor: 'red' },
              { label: 'Overtime Hours', data: overtime, borderColor: 'orange' }
            ]
          }}
        />
      </div>
      <div style={{ marginTop: 20 }}>
        <a href="/api/analytics/export?format=csv" className="btn">Export CSV</a>
        <a href="/api/analytics/export?format=pdf" className="btn" style={{ marginLeft: 10 }}>Export PDF</a>
      </div>
    </div>
  );
}
