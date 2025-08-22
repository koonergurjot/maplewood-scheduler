import { useEffect, useMemo, useRef, useState } from "react";
import Analytics from "./Analytics";
import CoverageLayout from "./CoverageLayout";

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


// ---------- Local Storage ----------
const LS_KEY = "maplewood-scheduler-v3";
const loadState = () => { try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveState = (state: any) => localStorage.setItem(LS_KEY, JSON.stringify(state));

// ---------- Utils ----------
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const formatDateLong = (iso: string) => new Date(iso+"T00:00:00").toLocaleDateString(undefined, { month: "long", day: "2-digit", year: "numeric" });
const matchText = (q: string, label: string) => q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(p => label.toLowerCase().includes(p));

const buildCalendar = (year:number, month:number) => {
  const first = new Date(year, month, 1);
  const start = new Date(first); start.setDate(first.getDate() - first.getDay());
  const days: {date: Date; inMonth: boolean}[] = [];
  for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); days.push({date:d,inMonth:d.getMonth()===month}); }
  return days;
};
const prevMonth = (setY:Function,setM:Function,y:number,m:number)=>{ if(m===0){setY(y-1); setM(11);} else setM(m-1); };
const nextMonth = (setY:Function,setM:Function,y:number,m:number)=>{ if(m===11){setY(y+1); setM(0);} else setM(m+1); };

const displayVacancyLabel = (v: Vacancy) => {
  const d = formatDateLong(v.shiftDate);
  return `${d} • ${v.shiftStart}–${v.shiftEnd} • ${v.wing ?? ''} • ${v.classification}`.replace(/\s+•\s+$/, "");
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
  const [vacancies, setVacancies] = useState<Vacancy[]>(persisted?.vacancies ?? []);
  const [bids, setBids] = useState<Bid[]>(persisted?.bids ?? []);
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, ...(persisted?.settings ?? {}) });


  // Tick for countdowns
  const [now, setNow] = useState<number>(Date.now());
  useEffect(()=>{ const t = setInterval(()=> setNow(Date.now()), 1000); return ()=> clearInterval(t); },[]);

  useEffect(()=>{ saveState({ employees, vacations, vacancies, bids, settings }); },[employees,vacations,vacancies,bids,settings]);

  const employeesById = useMemo(()=>Object.fromEntries(employees.map(e=>[e.id,e])),[employees]);

  // Recommendation: choose among *bidders* for that vacancy, highest seniority (rank 1 best)
  const computeRecommendation = (vac: Vacancy) => {
    const rel = bids.filter(b=> b.vacancyId===vac.id);
    const enriched = rel.map(b=> ({ bid:b, emp: employeesById[b.bidderEmployeeId] })).filter(x=> !!x.emp && x.emp.active);
    if (!enriched.length) return undefined;
    enriched.sort((a,b)=> (a.emp!.seniorityRank??99999) - (b.emp!.seniorityRank??99999));
    return enriched[0].emp!.id;
  };
  const recommendations = useMemo(()=>{
    const m:Record<string,string|undefined>={};
    vacancies.forEach(v=> m[v.id]=computeRecommendation(v));
    return m;
  },[vacancies,bids,employeesById]);

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

  const awardVacancy = (vacId: string, payload: { empId?: string; reason?: string; overrideUsed?: boolean }) => {
    if (!payload.empId) { alert("Pick an employee to award."); return; }
    setVacancies(prev => prev.map(v => v.id===vacId ? ({
      ...v,
      status:"Awarded",
      awardedTo: payload.empId,
      awardedAt: new Date().toISOString(),
      awardReason: payload.reason ?? "",
      overrideUsed: !!payload.overrideUsed,
    }) : v));
  };

  const resetKnownAt = (vacId: string) => {
    setVacancies(prev => prev.map(v => v.id===vacId ? ({...v, knownAt: new Date().toISOString()}) : v));
  };

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
            <button className="btn" onClick={()=>{ if(confirm("Reset ALL data?")){ localStorage.removeItem(LS_KEY); location.reload(); } }}>Reset</button>
          </div>
        </div>

        <div className="tabs">
          {["coverage","calendar","bids","employees","archive","alerts","settings"].map(k=> (
            <button key={k} className={`tab ${tab===k?"active":""}`} onClick={()=>setTab(k as any)}>{k[0].toUpperCase()+k.slice(1)}</button>
          ))}
        </div>

        {tab==="coverage" && (
          <CoverageLayout
            vacancies={vacancies}
            employees={employees}
            bids={bids}
            settings={settings}
            employeesById={employeesById}
            awardVacancy={awardVacancy}
            resetKnownAt={resetKnownAt}
            recommendations={recommendations}
            vacations={vacations}
            now={now}
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

// ---------- Pages ----------
function EmployeesPage({employees, setEmployees}:{employees:Employee[]; setEmployees:(u:any)=>void}){
  return (
    <div className="grid">
      <div className="card"><div className="card-h">Import Staff (CSV)</div><div className="card-c">
        <input type="file" accept=".csv" onChange={async e=>{
          const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const { parseCSV } = await import("./utils/csv"); const rows=parseCSV(text);
          const out:Employee[]=rows.map((r:any,i:number)=>({
            id:String(r.id??r.EmployeeID??`emp_${i}`),
            firstName:String(r.firstName ?? r.name ?? ""),
            lastName:String(r.lastName ?? ""),
            classification:(["RCA","LPN","RN"].includes(String(r.classification)) ? r.classification : "RCA") as Classification,
            status:(["FT","PT","Casual"].includes(String(r.status)) ? r.status : "FT") as Status,
            homeWing:String(r.homeWing ?? ""),
            seniorityRank:Number(r.seniorityRank ?? (i+1)),
            active:String(r.active ?? "Yes").toLowerCase().startsWith("y")
          }));
          setEmployees(out.filter(e=>!!e.id));
        }}/>
        <div className="subtitle">Columns: id, firstName, lastName, classification (RCA/LPN/RN), status (FT/PT/Casual), homeWing, seniorityRank, active (Yes/No)</div>
      </div></div>

      <div className="card"><div className="card-h">Employees</div><div className="card-c">
        <table className="responsive-table"><thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Status</th><th>Rank</th><th>Active</th></tr></thead>
          <tbody>{employees.map(e=> (
            <tr key={e.id}><td>{e.id}</td><td>{e.firstName} {e.lastName}</td><td>{e.classification}</td><td>{e.status}</td><td>{e.seniorityRank}</td><td>{e.active?"Yes":"No"}</td></tr>
          ))}</tbody>
        </table>
      </div></div>
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

function SettingsPage({settings,setSettings}:{settings:Settings; setSettings:(u:any)=>void}){
  return (
    <div className="grid">
      <div className="card"><div className="card-h">Response Windows (minutes)</div><div className="card-c">
        <div className="row cols2">
          {([ ["<2h","lt2h"], ["2–4h","h2to4"], ["4–24h","h4to24"], ["24–72h","h24to72"], [">72h","gt72"] ] as const).map(([label,key])=> (
            <div key={key}><label>{label}</label><input type="number" value={(settings.responseWindows as any)[key]} onChange={e=> setSettings((s:any)=>({...s, responseWindows:{...s.responseWindows, [key]: Number(e.target.value)}}))}/></div>
          ))}
        </div>
      </div></div>
    </div>
  );
}

function BidsPage({bids,setBids,vacancies,vacations,employees,employeesById}:{bids:Bid[];setBids:(u:any)=>void;vacancies:Vacancy[];vacations:Vacation[];employees:Employee[];employeesById:Record<string,Employee>}){
  const [newBid, setNewBid] = useState<Partial<Bid & {bidDate:string; bidTime:string}>>({});

  const vacWithCoveredName = (v: Vacancy) => {
    const vac = vacations.find(x=>x.id===v.vacationId);
    const covered = vac ? vac.employeeName : "";
    return `${displayVacancyLabel(v)} — covering ${covered}`.trim();
  };

  const setNow = () => {
    const now = new Date();
    const d = isoDate(now);
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setNewBid(b=>({...b, bidDate:d, bidTime:t}));
  };

  return (
    <div className="grid">
      <div className="card"><div className="card-h">Add Bid</div><div className="card-c">
        <div className="row cols2">
          <div>
            <label>Vacancy</label>
            <select onChange={e=> setNewBid(b=>({...b, vacancyId:e.target.value}))} value={newBid.vacancyId ?? ""}>
              <option value="" disabled>Pick vacancy</option>
              {vacancies.map(v=> <option key={v.id} value={v.id}>{vacWithCoveredName(v)}</option>)}
            </select>
          </div>
          <div>
            <label>Employee</label>
            <EmployeeCombo employees={employees} onSelect={(id)=>{
              const e=employeesById[id];
              setNewBid(b=>({...b,
                bidderEmployeeId:id,
                bidderName: e? `${e.firstName} ${e.lastName}`: "",
                bidderStatus: e?.status,
                bidderClassification: e?.classification
              }));
            }}/>
          </div>
          <div>
            <label>Bid Date</label>
            <input type="date" value={newBid.bidDate ?? ""} onChange={e=> setNewBid(b=>({...b, bidDate:e.target.value}))}/>
          </div>
          <div>
            <label>Bid Time</label>
            <div className="form-row">
              <input type="time" value={newBid.bidTime ?? ""} onChange={e=> setNewBid(b=>({...b, bidTime:e.target.value}))}/>
              <button className="btn" onClick={setNow}>Now</button>
            </div>
          </div>
          <div style={{gridColumn:"1 / -1"}}>
            <label>Notes</label>
            <input placeholder={'e.g., "available for 06:30-14:30"'} onChange={e=> setNewBid(b=>({...b,notes:e.target.value}))}/>
          </div>
          <div style={{gridColumn:"1 / -1"}}>
            <button className="btn" onClick={()=>{
              if(!newBid.vacancyId||!newBid.bidderEmployeeId) return alert("Vacancy and employee required");
              const ts = newBid.bidDate && newBid.bidTime ? new Date(`${newBid.bidDate}T${newBid.bidTime}:00`).toISOString() : new Date().toISOString();
              setBids((prev: Bid[])=>[...prev,{
                vacancyId:newBid.vacancyId!,
                bidderEmployeeId:newBid.bidderEmployeeId!,
                bidderName:newBid.bidderName ?? "",
                bidderStatus:(newBid.bidderStatus ?? "Casual") as Status,
                bidderClassification:(newBid.bidderClassification ?? "RCA") as Classification,
                bidTimestamp: ts,
                notes:newBid.notes ?? ""
              }]);
              setNewBid({});
            }}>Add Bid</button>
          </div>
        </div>
      </div></div>

      <div className="card"><div className="card-h">Bids</div><div className="card-c">
        <table className="responsive-table"><thead><tr><th>Vacancy</th><th>Employee</th><th>Class</th><th>Status</th><th>Bid at</th></tr></thead>
          <tbody>{bids.map((b,i)=>{ const v = vacancies.find(x=>x.id===b.vacancyId); return (
            <tr key={i}><td>{v? displayVacancyLabel(v): b.vacancyId}</td><td>{b.bidderName}</td><td>{b.bidderClassification}</td><td>{b.bidderStatus}</td><td>{new Date(b.bidTimestamp).toLocaleString()}</td></tr>
          );})}</tbody>
        </table>
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

// ---------- Small components ----------

function EmployeeCombo({ employees, onSelect }:{ employees:Employee[]; onSelect:(id:string)=>void }){
  const [open,setOpen]=useState(false); const [q,setQ]=useState(""); const ref=useRef<HTMLDivElement>(null);
  const list = useMemo(()=> employees.filter(e=> matchText(q, `${e.firstName} ${e.lastName} ${e.id}`)).slice(0,50), [q,employees]);
  useEffect(()=>{ const onDoc=(e:MouseEvent)=>{ if(!ref.current) return; if(!ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", onDoc); return ()=> document.removeEventListener("mousedown", onDoc); },[]);
  return (
    <div className="dropdown" ref={ref}>
      <input placeholder="Type name or ID…" value={q} onChange={e=>{ setQ(e.target.value); setOpen(true); }} onFocus={()=> setOpen(true)} />
      {open && (
        <div className="menu">
          {list.map(e=> (
            <div key={e.id} className="item" onClick={()=>{ onSelect(e.id); setQ(`${e.firstName} ${e.lastName} (${e.id})`); setOpen(false); }}>
              {e.firstName} {e.lastName} <span className="pill" style={{marginLeft:6}}>{e.classification} {e.status}</span>
            </div>
          ))}
          {!list.length && <div className="item" style={{opacity:.7}}>No matches</div>}
        </div>
      )}
    </div>
  );
}

