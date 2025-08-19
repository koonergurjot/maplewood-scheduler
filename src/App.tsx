import { useEffect, useMemo, useState, useRef } from "react";

/**
 * Maplewood Scheduler – Coverage-first build
 * - Coverage tab: Add Vacation (with wing), automatically generates daily Vacancies to fill.
 * - No tester seed data.
 * - No vacation status (you only add approved vacations).
 * - Archive tab: vacations auto-archive after *all* their days are awarded.
 * - Award flow fixed: pick winner manually and award. Archive updates automatically.
 * - Higher-contrast colors + clearer chips.
 * - Long-date formatting for readability.
 */

// ---------- Types ----------
type Classification = "RCA" | "LPN" | "RN";
type Status = "FT" | "PT" | "Casual";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  classification: Classification;
  status: Status;
  homeWing?: string;     // not relied on for coverage anymore
  seniorityRank: number;
  active: boolean;
};

type Vacation = {
  id: string;
  employeeId: string;
  employeeName: string;
  classification: Classification;
  wing: string;                // NEW: wing lives here (picked when adding a vacation)
  startDate: string;           // ISO date
  endDate: string;             // ISO date
  notes?: string;
  archived?: boolean;          // NEW: archived once all days covered
  archivedAt?: string;
};

type Vacancy = {
  id: string;
  vacationId?: string;
  reason: string;
  classification: Classification;
  wing?: string;
  shiftDate: string;   // ISO date
  shiftStart: string;  // HH:mm
  shiftEnd: string;    // HH:mm
  knownAt: string;     // ISO datetime
  offeringStep: "Casuals" | "OT-Regular" | "OT-Casuals";
  status: "Open" | "Pending Award" | "Awarded";
  awardedTo?: string;        // employeeId
  awardedAt?: string;        // ISO datetime
};

type Bid = {
  vacancyId: string;
  bidderEmployeeId: string;
  bidderName: string;
  bidderStatus: Status;
  bidderClassification: Classification;
  bidTimestamp: string; // ISO datetime
  notes?: string;
};

type Settings = {
  scheduleChangeNoticeDays: number;
  restBetweenShiftsHours: number;
  responseWindows: { lt2h: number; h2to4: number; h4to24: number; h24to72: number; gt72: number }
};

// ---------- Defaults (no tester seeds) ----------
const defaultSettings: Settings = {
  scheduleChangeNoticeDays: 14,
  restBetweenShiftsHours: 12,
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
};

// ---------- Local Storage ----------
const LS_KEY = "maplewood-scheduler-v2";
const loadState = () => { try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveState = (state: any) => localStorage.setItem(LS_KEY, JSON.stringify(state));

// ---------- Utils ----------
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const combineDateTime = (dateISO: string, timeHHmm: string) => new Date(`${dateISO}T${timeHHmm}:00`);
const diffHours = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 36e5;
const formatDateLong = (iso: string) => {
  try {
    const d = new Date(iso+"T00:00:00");
    return d.toLocaleDateString(undefined, { month: "long", day: "2-digit", year: "numeric" });
  } catch { return iso; }
};
const formatDateTime = (iso?: string) => iso ? new Date(iso).toLocaleString() : "—";
const dateRangeInclusive = (startISO: string, endISO: string) => {
  const out: string[] = [];
  const s = new Date(startISO+"T00:00:00");
  const e = new Date(endISO+"T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) out.push(isoDate(d));
  return out;
};
function windowMinutes(hoursBefore: number, s: Settings){
  const w=s.responseWindows;
  if(hoursBefore<2) return w.lt2h;
  if(hoursBefore<4) return w.h2to4;
  if(hoursBefore<24) return w.h4to24;
  if(hoursBefore<72) return w.h24to72;
  return w.gt72;
}
const withinDeadline = (bid: Date, knownAt: Date, start: Date, s: Settings) =>
  bid.getTime() <= new Date(knownAt.getTime()+windowMinutes(diffHours(start,knownAt),s)*60000).getTime();

const eligibleByStep = (step: Vacancy["offeringStep"], status: Status) =>
  step==="Casuals" ? status==="Casual" : step==="OT-Regular" ? (status==="FT"||status==="PT") : status==="Casual";

const sortBySeniority = (bids: Bid[], emps: Employee[]) => {
  const r=(id:string)=> emps.find(e=>e.id===id)?.seniorityRank ?? 1e9;
  return [...bids].sort((a,b)=>r(a.bidderEmployeeId)-r(b.bidderEmployeeId));
};

const matchText = (q: string, label: string) =>
  q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(p => label.toLowerCase().includes(p));

// ---------- Main App ----------
export default function App(){
  const persisted = loadState();
  const [tab, setTab] = useState<"dashboard"|"coverage"|"employees"|"bids"|"alerts"|"settings"|"archive"|"tests">("coverage");

  const [employees, setEmployees] = useState<Employee[]>(persisted?.employees ?? []);
  const [vacations, setVacations] = useState<Vacation[]>(persisted?.vacations ?? []);
  const [vacancies, setVacancies] = useState<Vacancy[]>(persisted?.vacancies ?? []);
  const [bids, setBids] = useState<Bid[]>(persisted?.bids ?? []);
  const [settings, setSettings] = useState<Settings>(persisted?.settings ?? defaultSettings);

  useEffect(()=>{ saveState({ employees, vacations, vacancies, bids, settings }); },[employees,vacations,vacancies,bids,settings]);

  const employeesById = useMemo(()=>Object.fromEntries(employees.map(e=>[e.id,e])),[employees]);

  // --- Recommendation (still available for OT/Casuals logic if you use Bids)
  const computeRecommendation = (vac: Vacancy) => {
    const start = combineDateTime(vac.shiftDate, vac.shiftStart);
    const known = new Date(vac.knownAt);
    const relevant = bids.filter(b=> b.vacancyId===vac.id && b.bidderClassification===vac.classification);
    const filtered = relevant.filter(b=>{
      const emp = employeesById[b.bidderEmployeeId];
      if(!emp) return false;
      return withinDeadline(new Date(b.bidTimestamp), known, start, settings) && eligibleByStep(vac.offeringStep, emp.status);
    });
    return sortBySeniority(filtered, employees)[0]?.bidderEmployeeId;
  };
  const recommendations = useMemo(()=> {
    const m:Record<string,string|undefined>={};
    vacancies.forEach(v=>m[v.id]=computeRecommendation(v));
    return m;
  },[vacancies,bids,employees,settings]);

  // --- Auto-archive hook: if *all* vacancies for a vacation are awarded, archive it
  useEffect(()=>{
    const byVacation = new Map<string, Vacancy[]>();
    vacancies.forEach(v => { if(v.vacationId){ const a=byVacation.get(v.vacationId)||[]; a.push(v); byVacation.set(v.vacationId, a); }});
    setVacations(prev => prev.map(vac => {
      const list = byVacation.get(vac.id) || [];
      const allAwarded = list.length>0 && list.every(x=>x.status==="Awarded");
      if (allAwarded && !vac.archived) return {...vac, archived:true, archivedAt: new Date().toISOString()};
      return vac;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancies]);

  // --- Forms state (Coverage page)
  const [newVacay, setNewVacay] = useState<Partial<Vacation & {shiftStart:string; shiftEnd:string}>>({
    wing:"", shiftStart:"06:30", shiftEnd:"14:30"
  });

  // --- Actions
  const addVacationAndGenerateVacancies = (v: Partial<Vacation & {shiftStart:string; shiftEnd:string}>) => {
    if (!v.employeeId || !v.employeeName || !v.classification || !v.startDate || !v.endDate) {
      alert("Employee, wing, start and end are required.");
      return;
    }
    const vac: Vacation = {
      id: `vac_${Date.now().toString(36)}`,
      employeeId: v.employeeId!,
      employeeName: v.employeeName!,
      classification: v.classification!,
      wing: (v.wing ?? "").trim(),
      startDate: v.startDate!,
      endDate: v.endDate!,
      notes: v.notes ?? "",
      archived: false
    };
    // Add vacation
    setVacations(prev => [vac, ...prev]);

    // Generate daily vacancies for the date range
    const days = dateRangeInclusive(v.startDate!, v.endDate!);
    const nowISO = new Date().toISOString();
    const newVacancies: Vacancy[] = days.map(d => ({
      id: `x${Math.random().toString(36).slice(2,7)}`,
      vacationId: vac.id,
      reason: "Vacation Backfill",
      classification: vac.classification,
      wing: vac.wing,
      shiftDate: d,
      shiftStart: v.shiftStart ?? "06:30",
      shiftEnd: v.shiftEnd ?? "14:30",
      knownAt: nowISO,
      offeringStep: "Casuals",
      status: "Open"
    }));
    setVacancies(prev => [...newVacancies, ...prev]);

    // Reset form
    setNewVacay({ wing:"", shiftStart:"06:30", shiftEnd:"14:30" });
  };

  const awardVacancy = (vacId: string, empId: string | undefined) => {
    if (!empId) { alert("Pick an employee to award."); return; }
    setVacancies(prev =>
      prev.map(v => v.id===vacId ? ({ ...v, status:"Awarded", awardedTo: empId, awardedAt: new Date().toISOString() }) : v)
    );
  };

  const removeTestData = () => {
    if (confirm("Remove all sample/test data? This keeps your employees.")) {
      setVacations([]); setVacancies([]); setBids([]);
    }
  };

  // ---------- UI ----------
  return (
    <div className="app">
      <style>{`
        :root{
          --bg1:#0b1020; --bg2:#0a0e1a;
          --card:#121833; --cardAlt:#0f1530;
          --stroke:rgba(255,255,255,.16);
          --text:#f5f7fb; --muted:#b6bfd6;
          --brand:#6ea8fe; --accent:#20c997;
          --ok:#22c55e; --warn:#f59e0b; --bad:#ef4444;
          --chipBg:#1f2a4d; --chipText:#e6ecff;
        }
        *{box-sizing:border-box} body,html,#root{height:100%}
        .app{min-height:100vh;background:radial-gradient(1000px 600px at 15% -10%,rgba(110,168,254,.18),transparent),radial-gradient(1000px 600px at 85% 5%,rgba(32,201,151,.14),transparent),linear-gradient(180deg,var(--bg1),var(--bg2));color:var(--text);font-family:Inter,system-ui,Arial,sans-serif;padding:20px}
        .container{max-width:1100px;margin:0 auto}
        .nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .title{font-size:22px;font-weight:800;letter-spacing:.2px}
        .subtitle{color:var(--muted);font-size:13px}
        .toolbar{display:flex;gap:8px}
        .btn{background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.06));border:1px solid var(--stroke);padding:9px 12px;border-radius:12px;color:var(--text);cursor:pointer}
        .btn:hover{border-color:#9ebcff}
        .grid{display:grid;gap:12px}
        .grid3{grid-template-columns:1fr} @media(min-width:800px){.grid3{grid-template-columns:repeat(3,1fr)}}
        .card{background:var(--card);border:1px solid var(--stroke);border-radius:14px;overflow:hidden}
        .card-h{padding:10px 14px;border-bottom:1px solid var(--stroke);font-weight:700;display:flex;align-items:center;justify-content:space-between}
        .card-c{padding:14px}
        table{width:100%;border-collapse:collapse} th,td{padding:10px;border-bottom:1px solid var(--stroke);text-align:left} th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
        input,select,textarea{width:100%;background:var(--cardAlt);border:1px solid var(--stroke);border-radius:10px;padding:10px;color:var(--text)} input::placeholder{color:#9aa3b2}
        .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px}
        .tab{padding:8px 12px;border-radius:12px;border:1px solid var(--stroke);cursor:pointer;background:var(--cardAlt)} .tab.active{border-color:#9ebcff;box-shadow:0 0 0 2px rgba(110,168,254,.18) inset}
        .row{display:grid;gap:10px} .cols2{grid-template-columns:1fr} @media(min-width:900px){.cols2{grid-template-columns:1fr 1fr}}
        .pill{background:var(--chipBg); color:var(--chipText); border:1px solid var(--stroke); padding:4px 8px;border-radius:999px;font-size:12px}
        .ok{color:var(--ok)} .warn{color:var(--warn)} .bad{color:var(--bad)}
        .dropdown{position:relative} .menu{position:absolute;z-index:30;top:100%;left:0;right:0;background:var(--cardAlt);border:1px solid var(--stroke);border-radius:10px;max-height:220px;overflow:auto}
        .item{padding:8px 10px;cursor:pointer} .item:hover{background:rgba(110,168,254,.18)}
      `}</style>

      <div className="container">
        <div className="nav">
          <div>
            <div className="title">Maplewood Scheduler</div>
            <div className="subtitle">Coverage requests • call-outs • seniority & response windows</div>
          </div>
          <div className="toolbar">
            <button className="btn" onClick={()=>{ if(confirm("Reset ALL data?")){ localStorage.removeItem(LS_KEY); location.reload(); } }}>Reset</button>
            <button className="btn" onClick={()=>{ const blob=new Blob([JSON.stringify({employees,vacations,vacancies,bids,settings},null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="maplewood-scheduler-backup.json"; a.click(); URL.revokeObjectURL(url); }}>Export</button>
            <button className="btn" onClick={removeTestData}>Clear Sample Data</button>
          </div>
        </div>

        <div className="tabs">
          {(["coverage","employees","bids","alerts","settings","archive","tests","dashboard"] as const).map(k=> (
            <button key={k} className={`tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{k[0].toUpperCase()+k.slice(1)}</button>
          ))}
        </div>

        {tab==="coverage" && (
          <CoveragePage
            employees={employees}
            employeesById={employeesById}
            vacations={vacations}
            vacancies={vacancies}
            recommendations={recommendations}
            addVacationAndGenerateVacancies={addVacationAndGenerateVacancies}
            newVacay={newVacay}
            setNewVacay={setNewVacay}
            awardVacancy={awardVacancy}
          />
        )}

        {tab==="employees" && (
          <EmployeesPage employees={employees} setEmployees={setEmployees}/>
        )}

        {tab==="bids" && (
          <BidsPage bids={bids} setBids={setBids} vacancies={vacancies} employees={employees} employeesById={employeesById} settings={settings}/>
        )}

        {tab==="alerts" && (
          <div className="grid"><div className="card"><div className="card-h">Response Windows (open vacancies)</div><div className="card-c"><DeadlineList vacancies={vacancies} settings={settings}/></div></div></div>
        )}

        {tab==="settings" && (
          <SettingsPage settings={settings} setSettings={setSettings}/>
        )}

        {tab==="archive" && (
          <ArchivePage vacations={vacations}/>
        )}

        {tab==="tests" && (
          <DiagnosticsPage settings={settings} employees={employees} vacancies={vacancies}/>
        )}

        {tab==="dashboard" && (
          <Dashboard vacancies={vacancies} bids={bids} settings={settings}/>
        )}
      </div>
    </div>
  );
}

// ---------- Pages & Components ----------
function CoveragePage({
  employees, employeesById, vacations, vacancies, recommendations,
  addVacationAndGenerateVacancies, newVacay, setNewVacay, awardVacancy
}:{
  employees: Employee[];
  employeesById: Record<string,Employee>;
  vacations: Vacation[];
  vacancies: Vacancy[];
  recommendations: Record<string,string|undefined>;
  addVacationAndGenerateVacancies: (v: Partial<Vacation & {shiftStart:string; shiftEnd:string}>)=>void;
  newVacay: Partial<Vacation & {shiftStart:string; shiftEnd:string}>;
  setNewVacay: (u: any)=>void;
  awardVacancy: (vacId:string, empId: string|undefined)=>void;
}){
  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Add Vacation (auto-creates vacancies)</div>
        <div className="card-c">
          <div className="row cols2">
            <div>
              <label>Employee</label>
              <EmployeeCombo employees={employees} onSelect={(id)=>{
                const e = employees.find(x=>x.id===id);
                setNewVacay((v:any)=>({
                  ...v,
                  employeeId:id,
                  employeeName: e? `${e.firstName} ${e.lastName}` : "",
                  classification: (e?.classification ?? v.classification ?? "RCA") as Classification
                }));
              }}/>
            </div>
            <div>
              <label>Wing / Unit</label>
              <input placeholder="Shamrock / Bluebell / ..." value={newVacay.wing ?? ""} onChange={e=> setNewVacay((v:any)=>({...v, wing:e.target.value}))}/>
            </div>
            <div>
              <label>Start Date</label>
              <input type="date" onChange={e=> setNewVacay((v:any)=>({...v,startDate:e.target.value}))}/>
            </div>
            <div>
              <label>End Date</label>
              <input type="date" onChange={e=> setNewVacay((v:any)=>({...v,endDate:e.target.value}))}/>
            </div>
            <div>
              <label>Shift Start</label>
              <input type="time" value={newVacay.shiftStart ?? "06:30"} onChange={e=> setNewVacay((v:any)=>({...v,shiftStart:e.target.value}))}/>
            </div>
            <div>
              <label>Shift End</label>
              <input type="time" value={newVacay.shiftEnd ?? "14:30"} onChange={e=> setNewVacay((v:any)=>({...v,shiftEnd:e.target.value}))}/>
            </div>
            <div style={{gridColumn:"1 / -1"}}>
              <label>Notes</label>
              <textarea placeholder="Optional" onChange={e=> setNewVacay((v:any)=>({...v,notes:e.target.value}))}/>
            </div>
            <div style={{gridColumn:"1 / -1"}}>
              <button className="btn" onClick={()=> addVacationAndGenerateVacancies(newVacay)}>Add & Generate</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Open Vacancies</div>
        <div className="card-c">
          <table>
            <thead>
              <tr>
                <th>Day</th><th>Wing</th><th>Class</th><th>Time</th><th>Offering</th><th>Recommended</th><th>Assign</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vacancies.filter(v=>v.status!=="Awarded").map(v=>{
                const recId = recommendations[v.id];
                return (
                  <VacancyRow
                    key={v.id}
                    v={v}
                    recName={recId ? `${employeesById[recId]?.firstName ?? ""} ${employeesById[recId]?.lastName ?? ""}`.trim() : "—"}
                    employees={employees}
                    onAward={(empId)=> awardVacancy(v.id, empId)}
                  />
                );
              })}
            </tbody>
          </table>
          {!vacancies.some(v=>v.status!=="Awarded") && <div className="subtitle" style={{marginTop:8}}>No open vacancies 🎉</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-h">Vacations (active)</div>
        <div className="card-c">
          <table>
            <thead><tr><th>Employee</th><th>Wing</th><th>From</th><th>To</th><th>Days</th></tr></thead>
            <tbody>
              {vacations.filter(v=>!v.archived).map(v=>{
                const days = dateRangeInclusive(v.startDate, v.endDate).length;
                return (
                  <tr key={v.id}>
                    <td>{v.employeeName}</td>
                    <td>{v.wing}</td>
                    <td>{formatDateLong(v.startDate)}</td>
                    <td>{formatDateLong(v.endDate)}</td>
                    <td>{days}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!vacations.some(v=>!v.archived) && <div className="subtitle" style={{marginTop:8}}>No active vacations.</div>}
        </div>
      </div>
    </div>
  );
}

function EmployeesPage({employees, setEmployees}:{employees:Employee[]; setEmployees:(u:any)=>void}){
  return (
    <div className="grid">
      <div className="card"><div className="card-h">Import Staff (CSV)</div><div className="card-c">
        <input type="file" accept=".csv" onChange={async e=>{
          const f=e.target.files?.[0]; if(!f) return;
          const text=await f.text();
          const rows=parseCSV(text);
          const out:Employee[]=rows.map((r:any,i:number)=>({
            id:String(r.id??r.EmployeeID??`emp_${i}`),
            firstName:String(r.firstName ?? r.name ?? ""),
            lastName:String(r.lastName ?? ""),
            classification:(["RCA","LPN","RN"].includes(String(r.classification)) ? r.classification : "RCA") as Classification,
            status:(["FT","PT","Casual"].includes(String(r.status)) ? r.status : "FT") as Status,
            homeWing:String(r.homeWing ?? ""),       // still accepted but not used for coverage
            seniorityRank:Number(r.seniorityRank ?? (i+1)),
            active:String(r.active ?? "Yes").toLowerCase().startsWith("y")
          }));
          setEmployees(out.filter(e=>!!e.id));
        }}/>
        <div className="subtitle">Columns: id, firstName, lastName, classification (RCA/LPN/RN), status (FT/PT/Casual), homeWing, seniorityRank, active (Yes/No)</div>
      </div></div>

      <div className="card"><div className="card-h">Employees</div><div className="card-c">
        <table><thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Status</th><th>Rank</th><th>Active</th></tr></thead>
          <tbody>{employees.map(e=>(
            <tr key={e.id}>
              <td>{e.id}</td>
              <td>{e.firstName} {e.lastName}</td>
              <td>{e.classification}</td>
              <td>{e.status}</td>
              <td>{e.seniorityRank}</td>
              <td>{e.active?"Yes":"No"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div></div>
    </div>
  );
}

function BidsPage({bids,setBids,vacancies,employees,employeesById,settings}:{bids:Bid[];setBids:(u:any)=>void;vacancies:Vacancy[];employees:Employee[];employeesById:Record<string,Employee>;settings:Settings}){
  const [newBid, setNewBid] = useState<Partial<Bid>>({});
  return (
    <div className="grid">
      <div className="card"><div className="card-h">Add Bid (manual)</div><div className="card-c">
        <div className="row cols2">
          <div>
            <label>Vacancy</label>
            <select onChange={e=> setNewBid(b=>({...b, vacancyId:e.target.value}))} defaultValue="">
              <option value="" disabled>Pick vacancy</option>
              {vacancies.map(v=> <option key={v.id} value={v.id}>{v.id} • {formatDateLong(v.shiftDate)} {v.shiftStart}</option>)}
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
          <div><label>Timestamp</label><input type="datetime-local" onChange={e=> setNewBid(b=>({...b,bidTimestamp:e.target.value}))}/></div>
          <div><label>Notes</label><input placeholder={'e.g., "available for 06:30-14:30"'} onChange={e=> setNewBid(b=>({...b,notes:e.target.value}))}/></div>
          <div style={{gridColumn:"1 / -1"}}><button className="btn" onClick={()=>{
            if(!newBid.vacancyId||!newBid.bidderEmployeeId) return alert("Vacancy and employee required");
            setBids(prev=>[...prev,{
              vacancyId:newBid.vacancyId!,
              bidderEmployeeId:newBid.bidderEmployeeId!,
              bidderName:newBid.bidderName ?? "",
              bidderStatus:(newBid.bidderStatus ?? "Casual") as Status,
              bidderClassification:(newBid.bidderClassification ?? "RCA") as Classification,
              bidTimestamp:newBid.bidTimestamp ?? new Date().toISOString(),
              notes:newBid.notes ?? ""
            }]);
            setNewBid({});
          }}>Add Bid</button></div>
        </div>
      </div></div>

      <div className="card"><div className="card-h">Bids</div><div className="card-c">
        <table><thead><tr><th>Vacancy</th><th>Employee</th><th>Class</th><th>Status</th><th>Time</th><th>Within Window?</th><th>Eligible?</th></tr></thead>
          <tbody>{bids.map((b,i)=>{
            const vac=vacancies.find(v=>v.id===b.vacancyId);
            const emp=employeesById[b.bidderEmployeeId];
            const start=vac? combineDateTime(vac.shiftDate, vac.shiftStart): new Date();
            const known=vac? new Date(vac.knownAt): new Date();
            const inWin=withinDeadline(new Date(b.bidTimestamp), known, start, settings);
            const stepOK=eligibleByStep(vac?.offeringStep ?? "Casuals", emp?.status ?? "Casual");
            return (
              <tr key={i}><td>{b.vacancyId}</td><td>{b.bidderName}</td><td>{b.bidderClassification}</td><td>{b.bidderStatus}</td><td>{formatDateTime(b.bidTimestamp)}</td><td>{inWin? <span className="ok">Yes</span>: <span className="bad">No</span>}</td><td>{stepOK? <span className="ok">Yes</span>: <span className="bad">No</span>}</td></tr>
            );
          })}</tbody>
        </table>
      </div></div>
    </div>
  );
}

function DeadlineList({vacancies, settings}:{vacancies:Vacancy[]; settings:Settings}){
  const now = new Date();
  const items = vacancies.filter(v=>v.status!=="Awarded").map(v=>{
    const start=combineDateTime(v.shiftDate,v.shiftStart);
    const known=new Date(v.knownAt);
    const mins=windowMinutes(diffHours(start,known),settings);
    const deadline=new Date(known.getTime()+mins*60000);
    const left=Math.max(0,Math.round((deadline.getTime()-now.getTime())/60000));
    return { id:v.id, offering:v.offeringStep, deadline, left };
  }).sort((a,b)=>a.deadline.getTime()-b.deadline.getTime());
  if(!items.length) return <div className="subtitle">No open response windows.</div>;
  return <div className="row">{items.map(it=> (
    <div key={it.id} className="pill" style={{display:"flex",justifyContent:"space-between",gap:8}}>
      <span>Vacancy <b>{it.id}</b> • {it.offering}</span>
      <span className={it.left<=5?"bad":it.left<=30?"warn":"ok"}>{it.left} min left (deadline {it.deadline.toLocaleTimeString()})</span>
    </div>
  ))}</div>;
}

function SettingsPage({settings,setSettings}:{settings:Settings; setSettings:(u:any)=>void}){
  return (
    <div className="grid">
      <div className="card"><div className="card-h">Response Windows (minutes)</div><div className="card-c">
        <div className="row cols2">
          {([ ["<2h","lt2h"],["2–4h","h2to4"],["4–24h","h4to24"],["24–72h","h24to72"],[">72h","gt72"] ] as const).map(([label,key])=> (
            <div key={key}><label>{label}</label><input type="number" value={(settings.responseWindows as any)[key]} onChange={e=> setSettings((s:any)=>({...s, responseWindows:{...s.responseWindows, [key]: Number(e.target.value)}}))}/></div>
          ))}
        </div>
      </div></div>
    </div>
  );
}

function ArchivePage({vacations}:{vacations:Vacation[]}) {
  const archived = vacations.filter(v=>v.archived);
  return (
    <div className="grid">
      <div className="card"><div className="card-h">Archived Vacations (covered)</div><div className="card-c">
        <table><thead><tr><th>Employee</th><th>Wing</th><th>From</th><th>To</th><th>Archived</th></tr></thead>
          <tbody>
            {archived.map(v=>(
              <tr key={v.id}>
                <td>{v.employeeName}</td>
                <td>{v.wing}</td>
                <td>{formatDateLong(v.startDate)}</td>
                <td>{formatDateLong(v.endDate)}</td>
                <td>{formatDateTime(v.archivedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!archived.length && <div className="subtitle" style={{marginTop:8}}>No archived items yet.</div>}
      </div></div>
    </div>
  );
}

function DiagnosticsPage({ settings, employees, vacancies }:{ settings:Settings; employees:Employee[]; vacancies:Vacancy[] }){
  const now = new Date("2025-08-25T15:00:00");
  const shiftSoon = new Date("2025-08-25T16:00:00"); // 1h later => lt2h => 7min
  const shift4h = new Date("2025-08-25T19:00:00");   // 4h => h4to24 => 30min
  const shift30h = new Date("2025-08-26T21:00:00");  // 30h => h24to72 => 120min
  const w1 = windowMinutes(diffHours(shiftSoon, now), settings);
  const w2 = windowMinutes(diffHours(shift4h, now), settings);
  const w3 = windowMinutes(diffHours(shift30h, now), settings);
  const rows = [
    { name:"Bucket <2h => 7min", pass: w1===settings.responseWindows.lt2h, value:w1 },
    { name:"Bucket 4h => 30min", pass: w2===settings.responseWindows.h4to24, value:w2 },
    { name:"Bucket 30h => 120min", pass: w3===settings.responseWindows.h24to72, value:w3 },
  ];
  return (
    <div className="row">
      {rows.map((r,i)=> (
        <div key={i} className="pill" style={{display:"flex",justifyContent:"space-between"}}>
          <span>{r.name}</span>
          <span className={r.pass?"ok":"bad"}>{r.pass?"PASS":"FAIL"} <span className="subtitle">({String(r.value)})</span></span>
        </div>
      ))}
    </div>
  );
}

function Dashboard({vacancies,bids,settings}:{vacancies:Vacancy[]; bids:Bid[]; settings:Settings}){
  return (
    <div className="grid grid3">
      <div className="card"><div className="card-h">Open Vacancies</div><div className="card-c"><div style={{fontSize:30,fontWeight:800}}>{vacancies.filter(v=>v.status!=="Awarded").length}</div><div className="subtitle">Shifts needing action</div></div></div>
      <div className="card"><div className="card-h">Bids Logged</div><div className="card-c"><div style={{fontSize:30,fontWeight:800}}>{bids.length}</div><div className="subtitle">Manual entries from WhatsApp</div></div></div>
      <div className="card"><div className="card-h">Deadlines Today</div><div className="card-c"><DeadlineList vacancies={vacancies} settings={settings}/></div></div>
    </div>
  );
}

// ---------- Small components ----------
function VacancyRow({v, recName, employees, onAward}:{v:Vacancy; recName:string; employees:Employee[]; onAward:(empId:string|undefined)=>void}){
  const [choice, setChoice] = useState<string>("");
  return (
    <tr>
      <td>{formatDateLong(v.shiftDate)}</td>
      <td>{v.wing ?? ""}</td>
      <td>{v.classification}</td>
      <td>{v.shiftStart}-{v.shiftEnd}</td>
      <td>{v.offeringStep}</td>
      <td>{recName}</td>
      <td style={{minWidth:220}}>
        <SelectEmployee employees={employees} value={choice} onChange={setChoice}/>
      </td>
      <td><button className="btn" onClick={()=> onAward(choice || undefined)}>Award</button></td>
    </tr>
  );
}

function SelectEmployee({employees, value, onChange}:{employees:Employee[]; value:string; onChange:(v:string)=>void}){
  const [open,setOpen]=useState(false); const [q,setQ]=useState(""); const ref=useRef<HTMLDivElement>(null);
  const list = useMemo(()=> employees.filter(e=> matchText(q, `${e.firstName} ${e.lastName} ${e.id}`)).slice(0,50), [q,employees]);
  const curr = employees.find(e=>e.id===value);
  useEffect(()=>{ const onDoc=(e:MouseEvent)=>{ if(!ref.current) return; if(!ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", onDoc); return ()=> document.removeEventListener("mousedown", onDoc); },[]);
  return (
    <div className="dropdown" ref={ref}>
      <input placeholder={curr? `${curr.firstName} ${curr.lastName} (${curr.id})`:"Type name or ID…"} value={q} onChange={e=>{ setQ(e.target.value); setOpen(true); }} onFocus={()=> setOpen(true)} />
      {open && (
        <div className="menu">
          {list.map(e=> (
            <div key={e.id} className="item" onClick={()=>{ onChange(e.id); setQ(`${e.firstName} ${e.lastName} (${e.id})`); setOpen(false); }}>
              {e.firstName} {e.lastName} <span className="pill" style={{marginLeft:6}}>{e.classification} {e.status}</span>
            </div>
          ))}
          {!list.length && <div className="item" style={{opacity:.7}}>No matches</div>}
        </div>
      )}
    </div>
  );
}

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

// ---------- Tiny CSV ----------
function parseCSV(text: string){
  const lines = text.split(/\r?\n/).filter(Boolean); if(!lines.length) return [] as any[];
  const header = lines[0].split(",").map(s=>s.trim());
  return lines.slice(1).map(line=>{ const cols=line.split(","); const o:any={}; header.forEach((h,i)=>o[h]=cols[i]?.trim()); return o; });
}
