import { useEffect, useMemo, useState } from "react";
import Analytics from "./Analytics";
import type { OfferingTier } from "./offering/offeringMachine";
import CoverageView from "./views/CoverageView";
import BidsView from "./views/BidsView";
import EmployeesView from "./views/EmployeesView";
import SettingsView from "./views/SettingsView";
import {
  isoDate,
  buildCalendar,
  prevMonth,
  nextMonth,
} from "./utils/date";
import { formatDateLong } from "./utils/format";
import { usePersistedState } from "./hooks/usePersistedState";

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

// ---------- Types ----------
export type Classification = "RCA" | "LPN" | "RN";
export type Status = "FT" | "PT" | "Casual";

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  classification: Classification;
  status: Status;
  homeWing?: string; // not used for coverage now
  seniorityRank: number; // 1 = most senior
  active: boolean;
};

export type Vacation = {
  id: string;
  employeeId: string;
  employeeName: string;
  classification: Classification;
  wing: string; // wing where this vacation occurs
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;   // ISO YYYY-MM-DD
  notes?: string;
  archived?: boolean;
  archivedAt?: string; // ISO
};

export type Vacancy = {
  id: string;
  vacationId?: string;
  reason: string; // e.g. Vacation Backfill
  classification: Classification;
  wing?: string;
  shiftDate: string; // ISO date
  shiftStart: string; // HH:mm
  shiftEnd: string;   // HH:mm
  knownAt: string;    // ISO datetime
  offeringTier: OfferingTier;
  offeringRoundStartedAt?: string;
  offeringRoundMinutes?: number;
  offeringAutoProgress?: boolean;
  offeringStep: "Casuals" | "OT-Regular" | "OT-Casuals";
  status: "Open" | "Pending Award" | "Awarded";
  awardedTo?: string;        // employeeId
  awardedAt?: string;        // ISO datetime
  awardReason?: string;      // audit note when overriding recommendation or class
  overrideUsed?: boolean;    // true if class override was toggled
};

export type Bid = {
  vacancyId: string;
  bidderEmployeeId: string;
  bidderName: string;
  bidderStatus: Status;
  bidderClassification: Classification;
  bidTimestamp: string; // ISO
  notes?: string;
};

export type Settings = {
  responseWindows: { lt2h: number; h2to4: number; h4to24: number; h24to72: number; gt72: number };
  theme: "dark" | "light";
  fontScale: number; // 1.0 = 16px base; slider adjusts overall size
};

// ---------- Constants ----------
const defaultSettings: Settings = {
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
  theme: "dark",
  fontScale: 1,
};

// ---------- Local Storage Keys ----------
const LS_EMPLOYEES = "maplewood-employees";
const LS_VACATIONS = "maplewood-vacations";
const LS_VACANCIES = "maplewood-vacancies";
const LS_BIDS = "maplewood-bids";
const LS_SETTINGS = "maplewood-settings";
const PERSIST_KEYS = [LS_EMPLOYEES, LS_VACATIONS, LS_VACANCIES, LS_BIDS, LS_SETTINGS];

// ---------- Main App ----------
export default function App(){
  if (window.location.pathname === '/analytics') {
    return <Analytics />;
  }
  const [tab, setTab] = useState<"coverage"|"bids"|"employees"|"calendar"|"alerts"|"archive"|"settings">("coverage");

  const [employees, setEmployees] = usePersistedState<Employee[]>(LS_EMPLOYEES, []);
  const [vacations, setVacations] = usePersistedState<Vacation[]>(LS_VACATIONS, []);
  const [vacancies, setVacancies] = usePersistedState<Vacancy[]>(
    LS_VACANCIES,
    [],
    (vxs) =>
      vxs.map((v: any) => ({
        offeringTier: 'CASUALS',
        offeringRoundStartedAt: v.offeringRoundStartedAt ?? new Date().toISOString(),
        offeringRoundMinutes: v.offeringRoundMinutes ?? 120,
        offeringAutoProgress: v.offeringAutoProgress ?? true,
        ...v,
      }))
  );
  const [bids, setBids] = usePersistedState<Bid[]>(LS_BIDS, []);
  const [settings, setSettings] = usePersistedState<Settings>(LS_SETTINGS, defaultSettings, (s) => ({
    ...defaultSettings,
    ...s,
  }));

  const employeesById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

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

  return (
    <div className="app" data-theme={settings.theme} style={{ fontSize: `${(settings.fontScale||1)*16}px` }}>
      <style>{`
        /* Themes */
        :root{ --baseRadius:14px; }
        .app{min-height:100vh; background:linear-gradient(180deg,var(--bg1),var(--bg2)); color:var(--text); font-family:Inter,system-ui,Arial,sans-serif; padding:18px}
        [data-theme="dark"]{ --bg1:#0a0c12; --bg2:#0d1117; --card:#141a25; --cardAlt:#0f1622; --stroke:#263145; --text:#f2f4f8; --muted:#c7cfdd; --brand:#4ea1ff; --accent:#2dd4bf; --ok:#16a34a; --warn:#f59e0b; --bad:#ef4444; --chipBg:#1d2736; --chipText:#e8eef9; }
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
        .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px}
        .tab{padding:8px 12px;border-radius:12px;border:1px solid var(--stroke);cursor:pointer;background:var(--cardAlt);font-weight:600}
        .tab.active{border-color:var(--brand);box-shadow:0 0 0 2px rgba(94,155,255,.24) inset}
        .grid{display:grid;gap:12px}
        .grid2{grid-template-columns:1fr}
        .card{background:var(--card);border:1px solid var(--stroke);border-radius:var(--baseRadius);overflow:hidden}
        .card-h{padding:10px 14px;border-bottom:1px solid var(--stroke);font-weight:800;display:flex;align-items:center;justify-content:space-between}
        .card-c{padding:14px}
        table{width:100%;border-collapse:separate; border-spacing:0}
        th,td{padding:10px;border-bottom:1px solid var(--stroke);text-align:left;vertical-align:middle}
        th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
        input,select,textarea{width:100%;background:var(--cardAlt);border:1px solid var(--stroke);border-radius:10px;padding:10px;color:var(--text)}
        input::placeholder{color:#a9b3c6}
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
            <button className="btn" onClick={()=>{ if(confirm("Reset ALL data?")){ PERSIST_KEYS.forEach(k=>localStorage.removeItem(k)); location.reload(); } }}>Reset</button>
          </div>
        </div>

        <div className="tabs">
          {["coverage","calendar","bids","employees","archive","alerts","settings"].map(k=> (
            <button key={k} className={`tab ${tab===k?"active":""}`} onClick={()=>setTab(k as any)}>{k[0].toUpperCase()+k.slice(1)}</button>
          ))}
        </div>

        {tab==="coverage" && (
          <CoverageView
            employees={employees}
            vacancies={vacancies}
            bids={bids}
            settings={settings}
            setVacations={setVacations}
            setVacancies={setVacancies}
          />
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
          <BidsView
            bids={bids}
            setBids={setBids}
            vacancies={vacancies}
            vacations={vacations}
            employees={employees}
            employeesById={employeesById}
          />
        )}

        {tab==="employees" && (
          <EmployeesView employees={employees} setEmployees={setEmployees} />
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
          <SettingsView settings={settings} setSettings={setSettings} />
        )}
      </div>
    </div>
  );
}

function ArchivePage({vacations}:{vacations:Vacation[]}){
  const archived = vacations.filter(v=>v.archived);
  return (
    <div className="grid">
      <div className="card"><div className="card-h">Archived Vacations (fully covered)</div><div className="card-c">
        <table className="responsive-table"><thead><tr><th>Employee</th><th>Wing</th><th>From</th><th>To</th><th>Archived</th></tr></thead>
          <tbody>
            {archived.map(v=> (
              <tr key={v.id}><td>{v.employeeName}</td><td>{v.wing}</td><td>{formatDateLong(v.startDate)}</td><td>{formatDateLong(v.endDate)}</td><td>{new Date(v.archivedAt||"").toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
        {!archived.length && <div className="subtitle" style={{marginTop:8}}>Nothing here yet.</div>}
      </div></div>
    </div>
  );
}

function CoverageDayList({dateISO, vacancies}:{dateISO:string; vacancies:Vacancy[]}){
  return (
    <div style={{marginTop:12}}>
      <div className="pill">Open on {formatDateLong(dateISO)}: {vacancies.length}</div>
      {vacancies.length>0 && (
        <table className="responsive-table" style={{marginTop:8}}>
          <thead><tr><th>Shift</th><th>Wing</th><th>Class</th><th>Offering</th><th>Status</th></tr></thead>
          <tbody>
            {vacancies.map(v=> (
              <tr key={v.id}><td>{v.shiftStart}-{v.shiftEnd}</td><td>{v.wing ?? ''}</td><td>{v.classification}</td><td>{v.offeringStep}</td><td>{v.status}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MonthlySchedule({ vacancies }:{ vacancies:Vacancy[] }){
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [selectedISO, setSelectedISO] = useState<string>(isoDate(today));

  const calDays = useMemo(()=> buildCalendar(year, month), [year, month]);
  const openByDay = useMemo(()=> {
    const m = new Map<string, Vacancy[]>();
    vacancies.forEach(v=>{ if(v.status!=="Awarded"){ const k=v.shiftDate; const arr=m.get(k)||[]; arr.push(v); m.set(k,arr);} });
    return m;
  },[vacancies]);

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <button className="btn" onClick={()=> prevMonth(setYear,setMonth,year,month)}>&lt;</button>
        <div className="pill">{monthLabel}</div>
        <button className="btn" onClick={()=> nextMonth(setYear,setMonth,year,month)}>&gt;</button>
        <div style={{marginLeft:'auto'}} className="subtitle">Click a day to list open shifts</div>
      </div>
      <div className="cal-grid">
        {dow.map(d=> <div key={d} className="cal-dow">{d}</div>)}
        {calDays.map(({date, inMonth})=>{
          const key = isoDate(date);
          const opens = openByDay.get(key) || [];
          return (
            <div key={key} className={`cal-day ${inMonth?"":"mute"}`} onClick={()=> setSelectedISO(key)}>
              <div className="cal-num">{date.getDate()}</div>
              <div className="cal-open">
                {opens.length? <span className="pill">{opens.length} open</span> : <span className="subtitle">—</span>}
              </div>
            </div>
          );
        })}
      </div>
      <CoverageDayList dateISO={selectedISO} vacancies={openByDay.get(selectedISO)||[]} />
    </div>
  );
}

