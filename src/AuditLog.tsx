import { useState } from "react";
import {
  filterAuditLogs,
  clearAuditLogs,
} from "./lib/audit";
import storage from "./lib/storage";

export default function AuditLog() {
  const [date, setDate] = useState("");
  const [vacancyId, setVacancyId] = useState("");
  const [, setRefresh] = useState(0);

  const logs = filterAuditLogs(storage, {
    date: date || undefined,
    vacancyId: vacancyId || undefined,
  });

  const clear = () => {
    clearAuditLogs(storage);
    setRefresh((r) => r + 1);
  };

  const exportCsv = () => {
    const rows = [
      ["ts", "actor", "vacancyId", "from", "to", "reason", "note"],
      ...logs.map((l) => [
        l.ts,
        l.actor,
        l.targetId,
        l.details.from,
        l.details.to,
        l.details.reason,
        l.details.note ?? "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Audit Log</div>
        <div className="card-c">
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              placeholder="Vacancy ID"
              value={vacancyId}
              onChange={(e) => setVacancyId(e.target.value)}
            />
            <button className="btn" onClick={exportCsv}>
              Export CSV
            </button>
            <button className="btn" onClick={clear}>
              Clear Logs
            </button>
          </div>
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vacancy</th>
                <th>Actor</th>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.ts).toLocaleString()}</td>
                  <td>{l.targetId}</td>
                  <td>{l.actor}</td>
                  <td>{l.details.from}</td>
                  <td>{l.details.to}</td>
                  <td>{l.details.reason}</td>
                  <td>{l.details.note}</td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center" }}>
                    No logs
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
