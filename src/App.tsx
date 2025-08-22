import { useEffect, useMemo, useState } from "react";
import Analytics from "./Analytics";
import { recommend, Recommendation } from "./recommend";
import type { Classification, Employee, Vacation, Vacancy, Bid, Settings } from "./types";
import { dateRangeInclusive, pickWindowMinutes, deadlineFor, fmtCountdown, applyAwardVacancy, minutesBetween } from "./utils";
import EmployeeCombo from "./components/EmployeeCombo";
import VacancyRow from "./components/VacancyRow";
import BidsPage from "./components/BidsPage";
import SettingsPage from "./components/SettingsPage";
import MonthlySchedule from "./components/MonthlySchedule";
import EmployeesPage from "./components/EmployeesPage";
import ArchivePage from "./components/ArchivePage";

/**
 * Maplewood Scheduler — Coverage-first (v2.3.0)
 *
 * New in v2.3.0 (per your request):
 * ✔ Live countdown timers on each vacancy row (color shifts to yellow/red as deadline nears)
 * ✔ Auto "knownAt" (already existed) + per-row “Reset knownAt” button for re‑announcing
 * ✔ Sticky table header for Open Vacancies + scrollable panel; highlight the row that’s “due next”
 * ✔ Theme toggle (Dark/Light) + text size slider (great for wall displays)
 * ✔ Reason codes required when you override the recommendation (audit‑friendly trail)
 * ✔ Eligibility gate: block awards outside vacancy class (RCA/LPN/RN) unless “Allow class override” is checked
 * ✔ Open Vacancies layout reformatted to take most of the page and avoid cut‑off
 */

// ---------- Constants ----------
const defaultSettings: Settings = {
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
  theme: "dark",
  fontScale: 1,
};

const WINGS = ["Shamrock", "Bluebell", "Rosewood", "Front", "Receptionist"] as const;

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

// ---------- Local Storage ----------
const LS_KEY = "maplewood-scheduler-v3";
const loadState = () => { try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveState = (state: any): boolean => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn("Unable to access localStorage. State not persisted.", err);
    return false;
  }
};

// ---------- Main App ----------
export default function App(){
  if (window.location.pathname === '/analytics') {
    return <Analytics />;
  }
  const persisted = loadState();
  const [tab, setTab] = useState<"coverage"|"bids"|"employees"|"calendar"|"alerts"|"archive"|"settings">("coverage");

  const [employees, setEmployees] = useState<Employee[]>(persisted?.employees ?? []);
  const [vacations, setVacations] = useState<Vacation[]>(persisted?.vacations ?? []);
  const [vacancies, setVacancies] = useState<Vacancy[]>(
    (persisted?.vacancies ?? []).map((v: any) => ({
      offeringTier: 'CASUALS',
      offeringRoundStartedAt: v.offeringRoundStartedAt ?? new Date().toISOString(),
      offeringRoundMinutes: v.offeringRoundMinutes ?? 120,
      offeringAutoProgress: v.offeringAutoProgress ?? true,
      ...v,
    }))
  );
  const [bids, setBids] = useState<Bid[]>(persisted?.bids ?? []);
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, ...(persisted?.settings ?? {}) });

  const [filterWing, setFilterWing] = useState<string>("");
  const [filterClass, setFilterClass] = useState<Classification | "">("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Tick for countdowns
  const [now, setNow] = useState<number>(Date.now());
  useEffect(()=>{ const t = setInterval(()=> setNow(Date.now()), 1000); return ()=> clearInterval(t); },[]);

  useEffect(() => {
    if (!saveState({ employees, vacations, vacancies, bids, settings })) {
      // localStorage unavailable; state persistence disabled
    }
  }, [employees, vacations, vacancies, bids, settings]);

  const employeesById = useMemo(()=>Object.fromEntries(employees.map(e=>[e.id,e])),[employees]);

  // Recommendation: choose among eligible bidders with highest seniority (rank 1 best)
  const recommendations = useMemo<Record<string, Recommendation>>(() => {
    const m: Record<string, Recommendation> = {};
    vacancies.forEach(v => {
      m[v.id] = recommend(v, bids, employeesById);
    });
    return m;
  }, [vacancies, bids, employeesById]);

  // Auto-archive vacations when all their vacancies are awarded
  useEffect(()=>{
    const byVacation = new Map<string, Vacancy[]>();
    vacancies.forEach(v => { if(v.vacationId){ const a=byVacation.get(v.vacationId)||[]; a.push(v); byVacation.set(v.vacationId, a);} });
    setVacations(prev => prev.map(vac => {
      const list = byVacation.get(vac.id) || [];
      const allAwarded = list.length>0 && list.every(x=>x.status==="Awarded");
      if (allAwarded && !vac.archived) return {...vac, archived:true, archivedAt: new Date().toISOString()};
      return vac;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancies]);

  // Coverage form state
  const [newVacay, setNewVacay] = useState<
    Partial<Vacation & { shiftStart: string; shiftEnd: string; shiftPreset: string }>
  >({
    wing: WINGS[0],
    shiftStart: SHIFT_PRESETS[0].start,
    shiftEnd: SHIFT_PRESETS[0].end,
    shiftPreset: SHIFT_PRESETS[0].label,
  });

  // Actions
  const addVacationAndGenerate = (
    v: Partial<Vacation & { shiftStart: string; shiftEnd: string; shiftPreset: string }>
  ) => {
    if (!v.employeeId || !v.employeeName || !v.classification || !v.startDate || !v.endDate || !v.wing) {
      alert("Employee, wing, start & end are required."); return;
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
    setVacations(prev => [vac, ...prev]);

    // one vacancy per day in range
    const days = dateRangeInclusive(v.startDate!, v.endDate!);
    const nowISO = new Date().toISOString();
    const vxs: Vacancy[] = days.map(d => ({
      id: `VAC-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
      vacationId: vac.id,
      reason: "Vacation Backfill",
      classification: vac.classification,
      wing: vac.wing,
      shiftDate: d,
      shiftStart: v.shiftStart ?? SHIFT_PRESETS[0].start,
      shiftEnd: v.shiftEnd ?? SHIFT_PRESETS[0].end,
      knownAt: nowISO,
      offeringTier: 'CASUALS',
      offeringRoundStartedAt: nowISO,
      offeringRoundMinutes: 120,
      offeringAutoProgress: true,
      offeringStep: "Casuals",
      status: "Open",
    }));
    setVacancies(prev => [...vxs, ...prev]);

    setNewVacay({
      wing: WINGS[0],
      shiftStart: SHIFT_PRESETS[0].start,
      shiftEnd: SHIFT_PRESETS[0].end,
      shiftPreset: SHIFT_PRESETS[0].label,
    });
  };

  const awardVacancy = (vacId: string, payload: { empId?: string; reason?: string; overrideUsed?: boolean }) => {
    setVacancies(prev => applyAwardVacancy(prev, vacId, payload));
  };

  const resetKnownAt = (vacId: string) => {
    setVacancies(prev => prev.map(v => v.id===vacId ? ({...v, knownAt: new Date().toISOString()}) : v));
  };

  // Figure out which open vacancy is "due next" (soonest positive deadline)
  const dueNextId = useMemo(()=>{
    let min = Infinity; let id: string | null = null;
    for(const v of vacancies){
      if(v.status === "Awarded") continue;
      const dl = deadlineFor(v, settings).getTime() - now;
      if (dl > 0 && dl < min){ min = dl; id = v.id; }
    }
    return id;
  }, [vacancies, now, settings]);

  const filteredVacancies = useMemo(()=>{
    return vacancies.filter(v => {
      if (v.status === "Awarded") return false;
      if (filterWing && v.wing !== filterWing) return false;
      if (filterClass && v.classification !== filterClass) return false;
      if (filterStart && v.shiftDate < filterStart) return false;
      if (filterEnd && v.shiftDate > filterEnd) return false;
      return true;
    });
  }, [vacancies, filterWing, filterClass, filterStart, filterEnd]);

  return (
    <div className="app" data-theme={settings.theme} style={{ fontSize: `${(settings.fontScale||1)*16}px` }}>
      <style>{`
        /* Themes */
        :root{ --baseRadius:14px; }
        .app{min-height:100vh; background:linear-gradient(180deg,var(--bg1),var(--bg2)); color:var(--text); font-family:Inter,system-ui,Arial,sans-serif; padding:18px}
        [data-theme="dark"]{ --bg1:#0a0c12; --bg2:#0d1117; --card:#141a25; --cardAlt:#0f1622; --stroke:#263145; --text:#ffffff; --muted:#d1d5db; --brand:#4ea1ff; --accent:#2dd4bf; --ok:#16a34a; --warn:#f59e0b; --bad:#ef4444; --chipBg:#1d2736; --chipText:#f0f4ff; }
        [data-theme="light"]{ --bg1:#f5f7fb; --bg2:#ffffff; --card:#ffffff; --cardAlt:#f7f9fc; --stroke:#e1e6ef; --text:#0b1320; --muted:#4a5872; --brand:#0b6bcb; --accent:#0d9488; --ok:#15803d; --warn:#b45309; --bad:#b91c1c; --chipBg:#eef2f9; --chipText:#0b1320; }

        *{box-sizing:border-box}
        body,html,#root{height:100%}
        .container{max-width:min(95vw,1600px); margin:0 auto}
        .nav{display:flex;align-items:center;gap:12px;justify-content:space-between;margin-bottom:14px}
        .title{font-size:22px;font-weight:800}
        .subtitle{color:var(--muted);font-size:13px}
        .toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .btn{background:var(--cardAlt);border:1px solid var(--stroke);padding:9px 12px;border-radius:12px;color:var(--text);cursor:pointer;font-weight:600}
        .btn:hover{border-color:var(--brand)}
        .btn-sm{padding:4px 8px;font-size:12px}
        .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px}
        .tab{padding:8px 12px;border-radius:12px;border:1px solid var(--stroke);cursor:pointer;background:var(--cardAlt);font-weight:600}
        .tab.active{border-color:var(--brand);box-shadow:0 0 0 2px rgba(94,155,255,.24) inset}
        .grid{display:grid;gap:12px}
        .grid2{grid-template-columns:1fr}
        .card{background:var(--card);border:1px solid var(--stroke);border-radius:var(--baseRadius);overflow:visible}
        .card-h{padding:10px 14px;border-bottom:1px solid var(--stroke);font-weight:800;display:flex;align-items:center;justify-content:space-between}
        .card-c{padding:14px}
        table{width:100%;border-collapse:separate; border-spacing:0}
        th,td{padding:10px;border-bottom:1px solid var(--stroke);text-align:left;vertical-align:middle}
        th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
        input,select,textarea{width:100%;background:var(--cardAlt);border:1px solid var(--stroke);border-radius:10px;padding:10px;color:var(--text)}
        input::placeholder{color:#cbd5e1}
        .row{display:grid;gap:10px}
        .cols2{grid-template-columns:1fr} @media(min-width:900px){.cols2{grid-template-columns:1fr 1fr}}
        .pill{background:var(--chipBg); color:var(--chipText); border:1px solid var(--stroke); padding:4px 8px;border-radius:999px;font-size:12px; font-weight:600}
        .ok{color:var(--ok)} .warn{color:var(--warn)} .bad{color:var(--bad)}
        .dropdown{position:relative}
        .menu{position:absolute;z-index:30;top:100%;left:0;right:0;background:var(--cardAlt);border:1px solid var(--stroke);border-radius:10px;max-height:240px;overflow:auto}
        .item{padding:8px 10px;cursor:pointer} .item:hover{background:rgba(100,140,220,.12)}

        /* Calendar */
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:8px}
        .cal-dow{opacity:.85;font-size:12px;text-align:center;color:var(--muted);font-weight:700}
        .cal-day{border:1px solid var(--stroke);border-radius:10px;padding:8px;min-height:92px;background:var(--cardAlt);display:flex;flex-direction:column}
        .cal-day.mute{opacity:.45}
        .cal-num{font-weight:800;margin-bottom:6px}
        .cal-open{margin-top:auto;font-size:12px}
        .cal-chip{display:inline-block;border:1px solid var(--stroke);border-radius:999px;padding:2px 6px;margin-right:6px;margin-bottom:6px}

        /* Vacancies table header sticks to viewport while the whole page scrolls */
        .vac-table thead th{position:sticky; top:0; background:var(--card); z-index:2}

        /* Countdown chips */
        .cd-chip{display:inline-block; padding:4px 8px; border-radius:999px; border:1px solid var(--stroke); font-weight:700}
        .cd-green{background:rgba(22,163,74,.12)}
        .cd-yellow{background:rgba(245,158,11,.12)}
        .cd-red{background:rgba(239,68,68,.12)}

        /* Due next highlight */
        .due-next{ box-shadow: 0 0 0 2px var(--brand) inset; }
      `}</style>

      <div className="container">
        <div className="nav">
          <div>
            <div className="title">Maplewood Scheduler</div>
            <div className="subtitle">Vacations → vacancies • bids • seniority</div>
          </div>
          <div className="toolbar">
            <button className="btn" onClick={()=> setSettings(s=> ({...s, theme: s.theme === 'dark' ? 'light' : 'dark'}))}>{settings.theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</button>
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              <span className="subtitle">Text size</span>
              <input type="range" min={0.85} max={1.6} step={0.05} value={settings.fontScale}
                onChange={e=> setSettings(s=> ({...s, fontScale: Number(e.target.value)}))} />
            </div>
            <button className="btn" onClick={()=>{ const blob=new Blob([JSON.stringify({employees,vacations,vacancies,bids,settings},null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="maplewood-scheduler-backup.json"; a.click(); URL.revokeObjectURL(url); }}>Export</button>
            <button className="btn" onClick={()=>{ if(confirm("Reset ALL data?")){ localStorage.removeItem(LS_KEY); location.reload(); } }}>Reset</button>
          </div>
        </div>

        <div className="tabs">
          {["coverage","calendar","bids","employees","archive","alerts","settings"].map(k=> (
            <button key={k} className={`tab ${tab===k?"active":""}`} onClick={()=>setTab(k as any)}>{k[0].toUpperCase()+k.slice(1)}</button>
          ))}
        </div>

        {tab==="coverage" && (
          <div className="grid grid2">
            <div className="card">
              <div className="card-h">Add Vacation (auto-creates daily vacancies)</div>
              <div className="card-c">
                <div className="row cols2">
                  <div>
                    <label>Employee</label>
                    <EmployeeCombo employees={employees} onSelect={(id)=>{
                      const e = employees.find(x=>x.id===id);
                      setNewVacay(v=>({
                        ...v,
                        employeeId:id,
                        employeeName: e? `${e.firstName} ${e.lastName}`: "",
                        classification: (e?.classification ?? v.classification ?? "RCA") as Classification
                      }));
                    }}/>
                  </div>
                  <div>
                    <label>Wing / Unit</label>
                    <select value={newVacay.wing ?? WINGS[0]} onChange={e=> setNewVacay(v=>({...v, wing:e.target.value}))}>
                      {WINGS.map(w=> <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Start Date</label>
                    <input type="date" onChange={e=> setNewVacay(v=>({...v,startDate:e.target.value}))}/>
                  </div>
                  <div>
                    <label>End Date</label>
                    <input type="date" onChange={e=> setNewVacay(v=>({...v,endDate:e.target.value}))}/>
                  </div>
                  <div>
                    <label>Shift</label>
                    <select
                      value={newVacay.shiftPreset ?? SHIFT_PRESETS[0].label}
                      onChange={e => {
                        const preset = SHIFT_PRESETS.find(p => p.label === e.target.value);
                        if (preset) {
                          setNewVacay(v => ({
                            ...v,
                            shiftPreset: preset.label,
                            shiftStart: preset.start,
                            shiftEnd: preset.end,
                          }));
                        } else {
                          setNewVacay(v => ({ ...v, shiftPreset: "Custom" }));
                        }
                      }}
                    >
                      {SHIFT_PRESETS.map(p => (
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
                          onChange={e =>
                            setNewVacay(v => ({ ...v, shiftStart: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label>Shift End</label>
                        <input
                          type="time"
                          value={newVacay.shiftEnd ?? ""}
                          onChange={e =>
                            setNewVacay(v => ({ ...v, shiftEnd: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}
                  <div style={{gridColumn:"1 / -1"}}>
                    <label>Notes</label>
                    <textarea placeholder="Optional" onChange={e=> setNewVacay(v=>({...v,notes:e.target.value}))}/>
                  </div>
                  <div style={{gridColumn:"1 / -1"}}>
                    <button className="btn" onClick={()=> addVacationAndGenerate(newVacay)}>Add & Generate</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-h">Open Vacancies</div>
              <div className="card-c">
                <button className="btn btn-sm" style={{marginBottom:8}} onClick={()=> setFiltersOpen(o=>!o)}>
                  {filtersOpen ? 'Hide Filters ▲' : 'Show Filters ▼'}
                </button>
                {filtersOpen && (
                  <div className="toolbar" style={{marginBottom:8}}>
                    <select value={filterWing} onChange={e=> setFilterWing(e.target.value)}>
                      <option value="">All Wings</option>
                      {WINGS.map(w=> <option key={w} value={w}>{w}</option>)}
                    </select>
                    <select value={filterClass} onChange={e=> setFilterClass(e.target.value as Classification | "")}> 
                      <option value="">All Classes</option>
                      {["RCA","LPN","RN"].map(c=> <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="date" value={filterStart} onChange={e=> setFilterStart(e.target.value)} />
                    <input type="date" value={filterEnd} onChange={e=> setFilterEnd(e.target.value)} />
                    <button className="btn" onClick={()=>{ setFilterWing(""); setFilterClass(""); setFilterStart(""); setFilterEnd(""); }}>Clear</button>
                  </div>
                )}
                <table className="vac-table responsive-table">
                    <thead>
                      <tr>
                        <th>Shift</th>
                        <th>Wing</th>
                        <th>Class</th>
                        <th>Offering</th>
                        <th>Recommended</th>
                        <th>Countdown</th>
                        <th>Assign</th>
                        <th>Override</th>
                        <th>Reason (if overriding)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVacancies.map(v=>{
                        const rec = recommendations[v.id];
                        const recId = rec?.id;
                        const recName = recId ? `${employeesById[recId]?.firstName ?? ""} ${employeesById[recId]?.lastName ?? ""}`.trim() : "—";
                        const recWhy = rec?.why ?? [];
                        const dl = deadlineFor(v, settings);
                        const msLeft = dl.getTime() - now;
                        const winMin = pickWindowMinutes(v, settings);
                        const sinceKnownMin = minutesBetween(new Date(), new Date(v.knownAt));
                        const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin)); // 1→0 over window
                        let cdClass = "cd-green";
                        if (msLeft <= 0) cdClass = "cd-red"; else if (pct < 0.25) cdClass = "cd-yellow";
                        const isDueNext = dueNextId === v.id;
                        return (
                          <VacancyRow
                            key={v.id}
                            v={v}
                            recId={recId}
                            recName={recName}
                            recWhy={recWhy}
                            employees={employees}
                            countdownLabel={fmtCountdown(msLeft)}
                            countdownClass={cdClass}
                            isDueNext={!!isDueNext}
                            onAward={(payload)=> awardVacancy(v.id, payload)}
                            onResetKnownAt={()=> resetKnownAt(v.id)}
                            overrideReasons={OVERRIDE_REASONS}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                {filteredVacancies.length===0 && <div className="subtitle" style={{marginTop:8}}>No open vacancies 🎉</div>}
              </div>
            </div>
          </div>
        )}

        {tab==="calendar" && (
          <div className="grid">
            <div className="card">
              <div className="card-h">Monthly Schedule (open shifts)</div>
              <div className="card-c">
                <MonthlySchedule vacancies={vacancies}/>
              </div>
            </div>
          </div>
        )}

        {tab==="bids" && (
          <BidsPage bids={bids} setBids={setBids} vacancies={vacancies} vacations={vacations} employees={employees} employeesById={employeesById} />
        )}

        {tab==="employees" && (
          <EmployeesPage employees={employees} setEmployees={setEmployees}/>
        )}

        {tab==="archive" && (
          <ArchivePage vacations={vacations}/>
        )}

        {tab==="alerts" && (
          <div className="grid">
            <div className="card"><div className="card-h">Quick Stats</div><div className="card-c">
              <div className="pill">Open: {vacancies.filter(v=>v.status!=="Awarded").length}</div>
              <div className="pill" style={{marginLeft:6}}>Archived vacations: {vacations.filter(v=>v.archived).length}</div>
            </div></div>
          </div>
        )}

        {tab==="settings" && (
          <SettingsPage settings={settings} setSettings={setSettings}/>
        )}
      </div>
    </div>
  );
}

