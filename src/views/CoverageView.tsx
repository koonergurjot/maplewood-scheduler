import { useEffect, useMemo, useRef, useState } from "react";
import EmployeeCombo from "../components/EmployeeCombo";
import { recommend, Recommendation } from "../recommend";
import type {
  Employee,
  Vacation,
  Vacancy,
  Bid,
  Settings,
  Classification,
} from "../App";
import { dateRangeInclusive, deadlineFor } from "../utils/date";
import {
  fmtCountdown,
  formatDateLong,
  formatDowShort,
  matchText,
} from "../utils/format";

const WINGS = [
  "Shamrock",
  "Bluebell",
  "Rosewood",
  "Front",
  "Receptionist",
] as const;

const SHIFT_PRESETS = [
  { label: "Day", start: "06:30", end: "14:30" },
  { label: "Evening", start: "14:30", end: "22:30" },
  { label: "Night", start: "22:30", end: "06:30" },
] as const;

const OVERRIDE_REASONS = [
  "Earlier bidder within step",
  "Availability mismatch / declined",
  "Single Site Order / conflict",
  "Scope of practice / skill mix",
  "Fatigue risk (back‑to‑back)",
  "Unit familiarity / continuity",
  "Manager discretion",
] as const;

export default function CoverageView({
  employees,
  vacancies,
  bids,
  settings,
  setVacations,
  setVacancies,
}: {
  employees: Employee[];
  vacancies: Vacancy[];
  bids: Bid[];
  settings: Settings;
  setVacations: (u: any) => void;
  setVacancies: (u: any) => void;
}) {
  const [newVacay, setNewVacay] = useState<
    Partial<Vacation & { shiftStart: string; shiftEnd: string; shiftPreset: string }>
  >({
    wing: WINGS[0],
    shiftStart: SHIFT_PRESETS[0].start,
    shiftEnd: SHIFT_PRESETS[0].end,
    shiftPreset: SHIFT_PRESETS[0].label,
  });

  const [filterWing, setFilterWing] = useState<string>("");
  const [filterClass, setFilterClass] = useState<Classification | "">("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const employeesById = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees]
  );

  const recommendations = useMemo<Record<string, Recommendation>>(() => {
    const m: Record<string, Recommendation> = {};
    vacancies.forEach((v) => {
      m[v.id] = recommend(v, bids, employeesById);
    });
    return m;
  }, [vacancies, bids, employeesById]);

  useEffect(() => {
    const byVacation = new Map<string, Vacancy[]>();
    vacancies.forEach((v) => {
      if (v.vacationId) {
        const a = byVacation.get(v.vacationId) || [];
        a.push(v);
        byVacation.set(v.vacationId, a);
      }
    });
    setVacations((prev: Vacation[]) =>
      prev.map((vac) => {
        const list = byVacation.get(vac.id) || [];
        const allAwarded = list.length > 0 && list.every((x) => x.status === "Awarded");
        if (allAwarded && !vac.archived)
          return { ...vac, archived: true, archivedAt: new Date().toISOString() };
        return vac;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancies]);

  const addVacationAndGenerate = (
    v: Partial<Vacation & { shiftStart: string; shiftEnd: string; shiftPreset: string }>
  ) => {
    if (!v.employeeId || !v.employeeName || !v.classification || !v.startDate || !v.endDate || !v.wing) {
      alert("Employee, wing, start & end are required.");
      return;
    }
    const vac: Vacation = {
      id: `vac_${Date.now().toString(36)}`,
      employeeId: v.employeeId!,
      employeeName: v.employeeName!,
      classification: v.classification!,
      wing: v.wing!,
      startDate: v.startDate!,
      endDate: v.endDate!,
      notes: v.notes ?? "",
      archived: false,
    };
    setVacations((prev: Vacation[]) => [vac, ...prev]);

    const days = dateRangeInclusive(v.startDate!, v.endDate!);
    const nowISO = new Date().toISOString();
    const vxs: Vacancy[] = days.map((d) => ({
      id: `VAC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      vacationId: vac.id,
      reason: "Vacation Backfill",
      classification: vac.classification,
      wing: vac.wing,
      shiftDate: d,
      shiftStart: v.shiftStart ?? SHIFT_PRESETS[0].start,
      shiftEnd: v.shiftEnd ?? SHIFT_PRESETS[0].end,
      knownAt: nowISO,
      offeringTier: "CASUALS",
      offeringRoundStartedAt: nowISO,
      offeringRoundMinutes: 120,
      offeringAutoProgress: true,
      offeringStep: "Casuals",
      status: "Open",
    }));
    setVacancies((prev: Vacancy[]) => [...vxs, ...prev]);

    setNewVacay({
      wing: WINGS[0],
      shiftStart: SHIFT_PRESETS[0].start,
      shiftEnd: SHIFT_PRESETS[0].end,
      shiftPreset: SHIFT_PRESETS[0].label,
    });
  };

  const awardVacancy = (
    vacId: string,
    payload: { empId?: string; reason?: string; overrideUsed?: boolean }
  ) => {
    if (!payload.empId) {
      alert("Pick an employee to award.");
      return;
    }
    setVacancies((prev: Vacancy[]) =>
      prev.map((v) =>
        v.id === vacId
          ? {
              ...v,
              status: "Awarded",
              awardedTo: payload.empId,
              awardedAt: new Date().toISOString(),
              awardReason: payload.reason ?? "",
              overrideUsed: !!payload.overrideUsed,
            }
          : v
      )
    );
  };

  const resetKnownAt = (vacId: string) => {
    setVacancies((prev: Vacancy[]) =>
      prev.map((v) =>
        v.id === vacId ? { ...v, knownAt: new Date().toISOString() } : v
      )
    );
  };

  const dueNextId = useMemo(() => {
    let min = Infinity;
    let id: string | null = null;
    for (const v of vacancies) {
      if (v.status === "Awarded") continue;
      const dl = deadlineFor(v, settings).getTime() - now;
      if (dl > 0 && dl < min) {
        min = dl;
        id = v.id;
      }
    }
    return id;
  }, [vacancies, now, settings]);

  const filteredVacancies = useMemo(() => {
    return vacancies.filter((v) => {
      if (v.status === "Awarded") return false;
      if (filterWing && v.wing !== filterWing) return false;
      if (filterClass && v.classification !== filterClass) return false;
      if (filterStart && v.shiftDate < filterStart) return false;
      if (filterEnd && v.shiftDate > filterEnd) return false;
      return true;
    });
  }, [vacancies, filterWing, filterClass, filterStart, filterEnd]);

  return (
    <div className="grid grid2">
      <div className="card">
        <div className="card-h">Add Vacation (auto-creates daily vacancies)</div>
        <div className="card-c">
          <div className="row cols2">
            <div>
              <label>Employee</label>
              <EmployeeCombo
                employees={employees}
                onSelect={(id) => {
                  const e = employees.find((x) => x.id === id);
                  setNewVacay((v) => ({
                    ...v,
                    employeeId: id,
                    employeeName: e ? `${e.firstName} ${e.lastName}` : "",
                    classification: (e?.classification ?? v.classification ?? "RCA") as Classification,
                  }));
                }}
              />
            </div>
            <div>
              <label>Wing / Unit</label>
              <select
                value={newVacay.wing ?? WINGS[0]}
                onChange={(e) => setNewVacay((v) => ({ ...v, wing: e.target.value }))}
              >
                {WINGS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Start Date</label>
              <input
                type="date"
                onChange={(e) => setNewVacay((v) => ({ ...v, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label>End Date</label>
              <input
                type="date"
                onChange={(e) => setNewVacay((v) => ({ ...v, endDate: e.target.value }))}
              />
            </div>
            <div>
              <label>Shift</label>
              <select
                value={newVacay.shiftPreset ?? SHIFT_PRESETS[0].label}
                onChange={(e) => {
                  const preset = SHIFT_PRESETS.find((p) => p.label === e.target.value);
                  if (preset) {
                    setNewVacay((v) => ({
                      ...v,
                      shiftPreset: preset.label,
                      shiftStart: preset.start,
                      shiftEnd: preset.end,
                    }));
                  } else {
                    setNewVacay((v) => ({ ...v, shiftPreset: "Custom" }));
                  }
                }}
              >
                {SHIFT_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label} ({p.start}–{p.end})
                  </option>
                ))}
                <option value="Custom">Custom</option>
              </select>
            </div>
            {newVacay.shiftPreset === "Custom" && (
              <>
                <div>
                  <label>Shift Start</label>
                  <input
                    type="time"
                    value={newVacay.shiftStart ?? ""}
                    onChange={(e) =>
                      setNewVacay((v) => ({ ...v, shiftStart: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label>Shift End</label>
                  <input
                    type="time"
                    value={newVacay.shiftEnd ?? ""}
                    onChange={(e) =>
                      setNewVacay((v) => ({ ...v, shiftEnd: e.target.value }))
                    }
                  />
                </div>
              </>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <textarea
                placeholder="Optional"
                onChange={(e) => setNewVacay((v) => ({ ...v, notes: e.target.value }))}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button
                className="btn"
                onClick={() => addVacationAndGenerate(newVacay)}
              >
                Add & Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Open Vacancies</div>
        <div className="card-c">
          <div className="toolbar" style={{ marginBottom: 8 }}>
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
            <input
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
            />
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
            />
            <button
              className="btn"
              onClick={() => {
                setFilterWing("");
                setFilterClass("");
                setFilterStart("");
                setFilterEnd("");
              }}
            >
              Clear
            </button>
          </div>
          <table className="vac-table responsive-table">
            <thead>
              <tr>
                <th>Shift</th>
                <th>Wing</th>
                <th>Class</th>
                <th>Tier</th>
                <th>Recommendation</th>
                <th>Deadline</th>
                <th>Employee</th>
                <th>Override</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVacancies.map((v) => {
                const rec = recommendations[v.id];
                const recId = rec?.id;
                const recName = recId
                  ? `${employeesById[recId]?.firstName ?? ""} ${employeesById[recId]?.lastName ?? ""}`.trim()
                  : "";
                const recWhy = rec?.why ?? [];
                const dl = deadlineFor(v, settings);
                const msLeft = dl.getTime() - now;
                let countdownClass = "cd-green";
                if (msLeft < 2 * 60 * 1000) countdownClass = "cd-red";
                else if (msLeft < 10 * 60 * 1000) countdownClass = "cd-yellow";
                return (
                  <VacancyRow
                    key={v.id}
                    v={v}
                    recId={recId}
                    recName={recName}
                    recWhy={recWhy}
                    employees={employees}
                    countdownLabel={fmtCountdown(msLeft)}
                    countdownClass={countdownClass}
                    isDueNext={v.id === dueNextId}
                    onAward={(payload) => awardVacancy(v.id, payload)}
                    onResetKnownAt={() => resetKnownAt(v.id)}
                  />
                );
              })}
            </tbody>
          </table>
          {filteredVacancies.length === 0 && (
            <div className="subtitle" style={{ marginTop: 8 }}>
              No open vacancies 🎉
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VacancyRow({
  v,
  recId,
  recName,
  recWhy,
  employees,
  countdownLabel,
  countdownClass,
  isDueNext,
  onAward,
  onResetKnownAt,
}: {
  v: Vacancy;
  recId?: string;
  recName: string;
  recWhy: string[];
  employees: Employee[];
  countdownLabel: string;
  countdownClass: string;
  isDueNext: boolean;
  onAward: (payload: { empId?: string; reason?: string; overrideUsed?: boolean }) => void;
  onResetKnownAt: () => void;
}) {
  const [choice, setChoice] = useState<string>("");
  const [overrideClass, setOverrideClass] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");

  const chosen = employees.find((e) => e.id === choice);
  const classMismatch = chosen && chosen.classification !== v.classification;
  const needReason = (!!recId && choice && choice !== recId) || (classMismatch && overrideClass);

  function handleAward() {
    if (classMismatch && !overrideClass) {
      alert(
        `Selected employee is ${chosen?.classification}; vacancy requires ${v.classification}. Check "Allow class override" to proceed.`
      );
      return;
    }
    if (needReason && !reason) {
      alert("Please select a reason for this override.");
      return;
    }
    onAward({ empId: choice || undefined, reason: reason || undefined, overrideUsed: overrideClass });
    setChoice("");
    setReason("");
    setOverrideClass(false);
  }

  return (
    <tr className={isDueNext ? "due-next" : ""}>
      <td>
        <span className="pill">{formatDowShort(v.shiftDate)}</span> {formatDateLong(v.shiftDate)} • {v.shiftStart}-{v.shiftEnd}
      </td>
      <td>{v.wing ?? ""}</td>
      <td>{v.classification}</td>
      <td>{v.offeringStep}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          <span>{recName}</span>
          {recWhy.map((w, i) => (
            <span key={i} className="pill">
              {w}
            </span>
          ))}
        </div>
      </td>
      <td>
        <span className={`cd-chip ${countdownClass}`}>{countdownLabel}</span>
      </td>
      <td style={{ minWidth: 220 }}>
        <SelectEmployee employees={employees} value={choice} onChange={setChoice} />
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={overrideClass}
            onChange={(e) => setOverrideClass(e.target.checked)}
          />
          <span className="subtitle">Allow class override</span>
        </label>
      </td>
      <td style={{ minWidth: 230 }}>
        {needReason || overrideClass || (recId && choice && choice !== recId) ? (
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select reason…</option>
            {OVERRIDE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span className="subtitle">—</span>
        )}
      </td>
      <td style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={onResetKnownAt}>
          Reset knownAt
        </button>
        <button className="btn" onClick={handleAward} disabled={!choice}>
          Award
        </button>
      </td>
    </tr>
  );
}

function SelectEmployee({
  employees,
  value,
  onChange,
}: {
  employees: Employee[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const list = useMemo(
    () => employees.filter((e) => matchText(q, `${e.firstName} ${e.lastName} ${e.id}`)).slice(0, 50),
    [q, employees]
  );
  const curr = employees.find((e) => e.id === value);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  useEffect(() => {
    if (!value) setQ("");
  }, [value]);
  return (
    <div className="dropdown" ref={ref}>
      <input
        placeholder={
          curr ? `${curr.firstName} ${curr.lastName} (${curr.id})` : "Type name or ID…"
        }
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="menu">
          {list.map((e) => (
            <div
              key={e.id}
              className="item"
              onClick={() => {
                onChange(e.id);
                setQ(`${e.firstName} ${e.lastName} (${e.id})`);
                setOpen(false);
              }}
            >
              {e.firstName} {e.lastName}{" "}
              <span className="pill" style={{ marginLeft: 6 }}>
                {e.classification} {e.status}
              </span>
            </div>
          ))}
          {!list.length && (
            <div className="item" style={{ opacity: 0.7 }}>
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
