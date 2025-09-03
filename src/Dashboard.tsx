import { useMemo, useState } from "react";
import type { Employee } from "./App";
import CalendarView from "./components/CalendarView";
import OpenVacancies from "./components/OpenVacancies";
import useVacancies from "./state/useVacancies";
import "./styles/branding.css";

const LS_KEY = "maplewood-scheduler-v3";
const loadState = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to parse saved state", err);
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert("Stored data was corrupted and has been reset.");
    }
    try {
      localStorage.removeItem(LS_KEY);
    } catch (removeErr) {
      console.error("Failed to reset localStorage", removeErr);
    }
    return null;
  }
};

type State = {
  employees: Employee[];
};

export default function Dashboard() {
  const data: State = loadState() || { employees: [] };
  const { employees } = data;
  const { vacancies, stageDelete, undoDelete, staged } = useVacancies();

  const [view, setView] = useState<"list" | "calendar">("list");

  const filled = useMemo(
    () => vacancies.filter((v) => v.status === "Filled" || v.status === "Awarded"),
    [vacancies],
  );

  const employeeLastAssigned = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of filled) {
      if (v.awardedTo && v.awardedAt) {
        const prev = map[v.awardedTo];
        if (!prev || new Date(v.awardedAt) > new Date(prev)) {
          map[v.awardedTo] = v.awardedAt;
        }
      }
    }
    return map;
  }, [filled]);

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

      <nav className="dashboard-nav">
        <button onClick={() => setView("list")} disabled={view === "list"}>
          List View
        </button>
        <button
          onClick={() => setView("calendar")}
          disabled={view === "calendar"}
        >
          Calendar View
        </button>
      </nav>

      <main className="dashboard-content">
        {view === "calendar" ? (
          <CalendarView vacancies={vacancies} />
        ) : (
          <>
            <section>
              <h2>Filled Shifts</h2>
              <div className="shift-list">
                {filled.map((v) => (
                  <div key={v.id} className="shift-card awarded">
                    {v.shiftDate} {v.shiftStart}–{v.shiftEnd} • {v.wing ?? ""} • {v.classification}
                  </div>
                ))}
                {filled.length === 0 && <p>No filled shifts.</p>}
              </div>
            </section>

            <section>
              <h2>Open Shifts</h2>
              <OpenVacancies
                vacancies={vacancies}
                stageDelete={stageDelete}
                undoDelete={undoDelete}
                staged={staged}
              />
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
                    <tr
                      key={e.id}
                      className={isRecent(e.lastAssigned) ? "recent" : undefined}
                    >
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
          </>
        )}
      </main>
    </div>
  );
}
