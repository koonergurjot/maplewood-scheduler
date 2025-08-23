import { useMemo } from "react";
import type { Employee, Vacancy } from "./App";
import "./styles/branding.css";

const LS_KEY = "maplewood-scheduler-v3";
const loadState = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

type State = {
  employees: Employee[];
  vacancies: Vacancy[];
};

export default function Dashboard() {
  const data: State = loadState() || { employees: [], vacancies: [] };
  const { employees, vacancies } = data;

  const awarded = useMemo(
    () => vacancies.filter((v) => v.status === "Awarded"),
    [vacancies],
  );
  const open = useMemo(
    () => vacancies.filter((v) => v.status !== "Awarded"),
    [vacancies],
  );

  const employeeLastAssigned = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of awarded) {
      if (v.awardedTo && v.awardedAt) {
        const prev = map[v.awardedTo];
        if (!prev || new Date(v.awardedAt) > new Date(prev)) {
          map[v.awardedTo] = v.awardedAt;
        }
      }
    }
    return map;
  }, [awarded]);

  const employeesWithLast = useMemo(
    () =>
      employees
        .map((e) => ({ ...e, lastAssigned: employeeLastAssigned[e.id] }))
        .sort((a, b) => {
          const ad = a.lastAssigned ? new Date(a.lastAssigned).getTime() : 0;
          const bd = b.lastAssigned ? new Date(b.lastAssigned).getTime() : 0;
          return bd - ad;
        }),
    [employees, employeeLastAssigned],
  );

  const isRecent = (date?: string) => {
    if (!date) return false;
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="dashboard">
      <header className="maplewood-header">
        <img src="/maplewood-logo.svg" alt="Maplewood logo" height={40} />
        <h1>Shift Dashboard</h1>
      </header>

      <main className="dashboard-content">
        <section>
          <h2>Awarded Shifts</h2>
          <div className="shift-list">
            {awarded.map((v) => (
              <div key={v.id} className="shift-card awarded">
                {v.shiftDate} {v.shiftStart}–{v.shiftEnd} • {v.wing ?? ""} • {v.classification}
              </div>
            ))}
            {awarded.length === 0 && <p>No awarded shifts.</p>}
          </div>
        </section>

        <section>
          <h2>Open Shifts</h2>
          <div className="shift-list">
            {open.map((v) => (
              <div key={v.id} className="shift-card open">
                {v.shiftDate} {v.shiftStart}–{v.shiftEnd} • {v.wing ?? ""} • {v.classification}
              </div>
            ))}
            {open.length === 0 && <p>No open shifts.</p>}
          </div>
        </section>

        <section className="employee-list">
          <h2>Recent Assignments</h2>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Last Assigned</th>
              </tr>
            </thead>
            <tbody>
              {employeesWithLast.map((e) => (
                <tr key={e.id} className={isRecent(e.lastAssigned) ? "recent" : undefined}>
                  <td>
                    {e.firstName} {e.lastName}
                  </td>
                  <td>
                    {e.lastAssigned
                      ? new Date(e.lastAssigned).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
