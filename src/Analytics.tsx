import { useEffect, useState } from 'react';
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
  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(setRows);
  }, []);
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
