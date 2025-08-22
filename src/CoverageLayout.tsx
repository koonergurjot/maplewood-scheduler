import { useEffect, useMemo, useState } from "react";
import type { Vacancy, Employee, Bid, Settings, Classification, Vacation } from "./App";

const WINGS = ["Shamrock", "Bluebell", "Rosewood", "Front", "Receptionist"] as const;

const OVERRIDE_REASONS = [
  "Earlier bidder within step",
  "Availability mismatch / declined",
  "Single Site Order / conflict",
  "Scope of practice / skill mix",
  "Fatigue risk (back‑to‑back)",
  "Unit familiarity / continuity",
  "Manager discretion",
] as const;

function formatDateLong(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function pickWindowMinutes(v: Vacancy, settings: Settings) {
  const known = new Date(v.knownAt);
  const shiftStart = new Date(`${v.shiftDate}T${v.shiftStart}:00`);
  const hrsUntilShift = (shiftStart.getTime() - known.getTime()) / 3_600_000;
  if (hrsUntilShift < 2) return settings.responseWindows.lt2h;
  if (hrsUntilShift < 4) return settings.responseWindows.h2to4;
  if (hrsUntilShift < 24) return settings.responseWindows.h4to24;
  if (hrsUntilShift < 72) return settings.responseWindows.h24to72;
  return settings.responseWindows.gt72;
}

function deadlineFor(v: Vacancy, settings: Settings) {
  const winMin = pickWindowMinutes(v, settings);
  return new Date(new Date(v.knownAt).getTime() + winMin * 60000);
}

function fmtCountdown(msLeft: number) {
  const neg = msLeft < 0;
  const abs = Math.abs(msLeft);
  const totalSec = Math.floor(abs / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const core = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return neg ? `Due ${core} ago` : core;
}

type Props = {
  vacancies: Vacancy[];
  employees: Employee[];
  bids: Bid[];
  settings: Settings;
  employeesById: Record<string, Employee>;
  awardVacancy: (vacId: string, payload: { empId?: string; reason?: string; overrideUsed?: boolean }) => void;
  resetKnownAt: (vacId: string) => void;
  recommendations: Record<string, string | undefined>;
  vacations: Vacation[];
  now: number;
};

export default function CoverageLayout({
  vacancies,
  employees,
  bids,
  settings,
  employeesById,
  awardVacancy,
  resetKnownAt,
  recommendations,
  vacations,
  now,
}: Props) {
  const [filterWing, setFilterWing] = useState<string>("");
  const [filterClass, setFilterClass] = useState<Classification | "">("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"" | "Open" | "Pending Award">("");

  const filteredVacancies = useMemo(() => {
    return vacancies.filter((v) => {
      if (v.status === "Awarded") return false;
      if (filterWing && v.wing !== filterWing) return false;
      if (filterClass && v.classification !== filterClass) return false;
      if (filterStart && v.shiftDate < filterStart) return false;
      if (filterEnd && v.shiftDate > filterEnd) return false;
      if (filterStatus && v.status !== filterStatus) return false;
      return true;
    });
  }, [vacancies, filterWing, filterClass, filterStart, filterEnd, filterStatus]);

  const [selectedId, setSelectedId] = useState<string>("");
  useEffect(() => {
    if (filteredVacancies.length && !filteredVacancies.find((v) => v.id === selectedId)) {
      setSelectedId(filteredVacancies[0].id);
    }
  }, [filteredVacancies, selectedId]);

  const selected = vacancies.find((v) => v.id === selectedId);

  const recId = selected ? recommendations[selected.id] : undefined;
  const recName = recId
    ? `${employeesById[recId]?.firstName ?? ""} ${employeesById[recId]?.lastName ?? ""}`.trim()
    : "—";

  const msLeft = selected ? deadlineFor(selected, settings).getTime() - now : 0;
  const winMin = selected ? pickWindowMinutes(selected, settings) : 0;
  const sinceKnownMin = selected ? (now - new Date(selected.knownAt).getTime()) / 60000 : 0;
  const pct = selected ? Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin)) : 0;
  let cdClass = "cd-green";
  if (msLeft <= 0) cdClass = "cd-red";
  else if (pct < 0.25) cdClass = "cd-yellow";
  const countdownLabel = selected ? fmtCountdown(msLeft) : "";

  const [choice, setChoice] = useState<string>("");
  const [overrideClass, setOverrideClass] = useState(false);
  const [reason, setReason] = useState<string>("");
  useEffect(() => {
    setChoice("");
    setOverrideClass(false);
    setReason("");
  }, [selectedId]);

  const chosen = employees.find((e) => e.id === choice);
  const classMismatch = selected && chosen && chosen.classification !== selected.classification;
  const needReason =
    selected && ((recId && choice && choice !== recId) || (classMismatch && overrideClass));

  const bidsForSelected = selected ? bids.filter((b) => b.vacancyId === selected.id) : [];

  function handleAward() {
    if (!selected) return;
    if (classMismatch && !overrideClass) {
      alert(
        `Selected employee is ${chosen?.classification}; vacancy requires ${selected.classification}. Check "Allow class override" to proceed.`,
      );
      return;
    }
    if (needReason && !reason) {
      alert("Please select a reason for this override.");
      return;
    }
    awardVacancy(selected.id, {
      empId: choice || undefined,
      reason: reason || undefined,
      overrideUsed: overrideClass,
    });
    setChoice("");
    setOverrideClass(false);
    setReason("");
  }

  const archived = vacations.filter((v) => v.archived);

  return (
    <div className="coverage-layout">
      <style>{`
        .coverage-layout{display:flex;flex-direction:column;gap:12px;}
        .coverage-main{display:flex;gap:12px;flex:1;min-height:400px;}
        .vacancy-list{flex:1;overflow-y:auto;}
        .vacancy-item{padding:10px;border-bottom:1px solid var(--stroke);cursor:pointer;}
        .vacancy-item.selected{background:var(--cardAlt);}
        .details-panel{flex:1.5;overflow-y:auto;}
        .archive-drawer{background:var(--card);border:1px solid var(--stroke);border-radius:var(--baseRadius);}
        .archive-drawer summary{padding:10px 14px;font-weight:800;cursor:pointer;list-style:none;}
        .archive-drawer summary::-webkit-details-marker{display:none;}
      `}</style>
      <div className="toolbar">
        <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
        <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
        <select value={filterWing} onChange={(e) => setFilterWing(e.target.value)}>
          <option value="">All Wings</option>
          {WINGS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value as Classification | "")}
        >
          <option value="">All Classes</option>
          {["RCA", "LPN", "RN"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "Open" | "Pending Award" | "")}
        >
          <option value="">All Statuses</option>
          {["Open", "Pending Award"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          className="btn"
          onClick={() => {
            setFilterWing("");
            setFilterClass("");
            setFilterStart("");
            setFilterEnd("");
            setFilterStatus("");
          }}
        >
          Clear
        </button>
      </div>
      <div className="coverage-main">
        <div className="card vacancy-list">
          <div className="card-h">Open Vacancies</div>
          <div className="card-c" style={{ padding: 0 }}>
            {filteredVacancies.map((v) => {
              const ms = deadlineFor(v, settings).getTime() - now;
              return (
                <div
                  key={v.id}
                  className={`vacancy-item ${selectedId === v.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(v.id)}
                >
                  <div style={{ fontWeight: 600 }}>
                    {formatDateLong(v.shiftDate)} {v.shiftStart}-{v.shiftEnd}
                  </div>
                  <div className="subtitle">
                    {v.wing} • {v.classification} • {fmtCountdown(ms)}
                  </div>
                </div>
              );
            })}
            {!filteredVacancies.length && (
              <div className="vacancy-item subtitle">No open vacancies</div>
            )}
          </div>
        </div>
        <div className="card details-panel">
          <div className="card-h">Details</div>
          <div className="card-c">
            {selected ? (
              <>
                <div className="row" style={{ marginBottom: 8 }}>
                  <div>
                    <strong>Shift:</strong> {formatDateLong(selected.shiftDate)} {selected.shiftStart}-
                    {selected.shiftEnd}
                  </div>
                  <div>
                    <strong>Wing:</strong> {selected.wing}
                  </div>
                  <div>
                    <strong>Class:</strong> {selected.classification}
                  </div>
                  <div>
                    <strong>Offering:</strong> {selected.offeringStep}
                  </div>
                  <div>
                    <strong>Recommended:</strong> {recName}
                  </div>
                  <div>
                    <strong>Countdown:</strong>{" "}
                    <span className={`cd-chip ${cdClass}`}>{countdownLabel}</span>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label>Assign to</label>
                  <select
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                    style={{ marginBottom: 8 }}
                  >
                    <option value="">Select employee…</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.classification} {e.status})
                      </option>
                    ))}
                  </select>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={overrideClass}
                        onChange={(e) => setOverrideClass(e.target.checked)}
                      />
                      <span className="subtitle">Allow class override</span>
                    </label>
                  </div>
                  {needReason && (
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ marginBottom: 8 }}
                    >
                      <option value="">Select reason…</option>
                      {OVERRIDE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn" onClick={() => resetKnownAt(selected.id)}>
                      Reset knownAt
                    </button>
                    <button className="btn" onClick={handleAward} disabled={!choice}>
                      Award
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <strong>Bids</strong>
                  <ul>
                    {bidsForSelected.map((b) => (
                      <li key={b.bidderEmployeeId + b.bidTimestamp}>
                        {b.bidderName}{" "}
                        <span className="pill" style={{ marginLeft: 6 }}>
                          {b.bidderClassification} {b.bidderStatus}
                        </span>
                      </li>
                    ))}
                    {!bidsForSelected.length && (
                      <li className="subtitle">No bids yet.</li>
                    )}
                  </ul>
                </div>
              </>
            ) : (
              <div className="subtitle">Select a vacancy from the list.</div>
            )}
          </div>
        </div>
      </div>
      <details className="archive-drawer">
        <summary>Archive</summary>
        <div className="card-c">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Wing</th>
                <th>From</th>
                <th>To</th>
                <th>Archived</th>
              </tr>
            </thead>
            <tbody>
              {archived.map((v) => (
                <tr key={v.id}>
                  <td>{v.employeeName}</td>
                  <td>{v.wing}</td>
                  <td>{formatDateLong(v.startDate)}</td>
                  <td>{formatDateLong(v.endDate)}</td>
                  <td>{new Date(v.archivedAt || "").toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!archived.length && (
            <div className="subtitle" style={{ marginTop: 8 }}>
              Nothing here yet.
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

