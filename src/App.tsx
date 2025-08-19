import React, { useEffect, useMemo, useState, useRef } from "react";

// MAPLEWOOD SCHEDULER — Netlify-friendly single-file React app
// - No external UI libs, no path aliases. Pure React + inline CSS.
// - Monthly Schedule view shows days with open (unfilled) shifts.
// - Searchable employee selector. LocalStorage persistence. Diagnostics.
// - Netlify build-friendly: relies on Vite for TS transpile.
//   Build command: "vite build", publish: "dist".

// ---------- Types ----------
type Classification = "RCA" | "LPN" | "RN";
type Status = "FT" | "PT" | "Casual";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  classification: Classification;
  status: Status;
  homeWing?: string;
  seniorityRank: number; // rank within classification (1 = most senior)
  active: boolean;
};

type Vacation = {
  id: string;
  employeeId: string;
  employeeName: string;
  classification: Classification;
  status: "Pending" | "Approved";
  startDate: string; // ISO date
  endDate: string; // ISO date
  notes?: string;
};

type Vacancy = {
  id: string;
  vacationId?: string; // optional link
  reason: string; // e.g., Vacation Backfill
  classification: Classification;
  wing?: string;
  shiftDate: string; // ISO date
  shiftStart: string; // HH:mm
  shiftEnd: string;   // HH:mm
  knownAt: string;    // ISO datetime
  offeringStep: "Casuals" | "OT-Regular" | "OT-Casuals";
  status: "Open" | "Pending Award" | "Awarded";
  recommendedAward?: string; // employeeId
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
  prime1Start: string; prime1End: string;
  prime2Start: string; prime2End: string;
  scheduleChangeNoticeDays: number;
  restBetweenShiftsHours: number;
  responseWindows: { lt2h: number; h2to4: number; h4to24: number; h24to72: number; gt72: number }
};

// ---------- Defaults ----------
const defaultSettings: Settings = {
  prime1Start: "2025-06-15", prime1End: "2025-09-15",
  prime2Start: "2025-12-15", prime2End: "2026-01-05",
  scheduleChangeNoticeDays: 14,
  restBetweenShiftsHours: 12,
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
};

// ---------- Local Storage ----------
const LS_KEY = "maplewood-scheduler-v1";
const loadState = () => { try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveState = (state: any) => localStorage.setItem(LS_KEY, JSON.stringify(state));

// ---------- Utils ----------
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; // TZ-safe
const combineDateTime = (dateISO: string, timeHHmm: string) => new Date(`${dateISO}T${timeHHmm}:00`);
const diffHours = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 36e5;
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
const human = (dt?: string) => dt? new Date(dt).toLocaleString() : "—";
const matchText = (q: string, label: string) =>
  q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(p => label.toLowerCase().includes(p));

// ---------- Seed Data ----------
const seedEmployees: Employee[] = [
  { id:"1001", firstName:"Priya", lastName:"Kaur", classification:"RCA", status:"FT", homeWing:"Shamrock", seniorityRank:1, active:true },
  { id:"1002", firstName:"Amrit", lastName:"Singh", classification:"RCA", status:"PT", homeWing:"Bluebell", seniorityRank:2, active:true },
  { id:"1005", firstName:"Rani", lastName:"Patel", classification:"RCA", status:"Casual", homeWing:"Shamrock", seniorityRank:5, active:true },
];
const seedVacations: Vacation[] = [
  { id:"v1", employeeId:"1001", employeeName:"Priya Kaur", classification:"RCA", status:"Approved", startDate:"2025-08-25", endDate:"2025-08-29" },
  { id:"v2", employeeId:"1002", employeeName:"Amrit Singh", classification:"RCA", status:"Pending", startDate:"2025-12-18", endDate:"2025-12-24" },
];
const seedVacancies: Vacancy[] = [{
  id:"x101", vacationId:"v1", reason:"Vacation Backfill", classification:"RCA", wing:"Shamrock",
  shiftDate:"2025-08-26", shiftStart:"06:30", shiftEnd:"14:30", knownAt:"2025-08-25T15:00:00",
  offeringStep:"Casuals", status:"Open"
}];
const seedBids: Bid[] = [
  { vacancyId:"x101", bidderEmployeeId:"1005", bidderName:"Rani Patel", bidderStatus:"Casual", bidderClassification:"RCA", bidTimestamp:"2025-08-25T15:06:00" },
  { vacancyId:"x101", bidderEmployeeId:"1002", bidderName:"Amrit Singh", bidderStatus:"PT", bidderClassification:"RCA", bidTimestamp:"2025-08-25T15:10:00" },
];

// ---------- Tiny CSV (simple) ----------
function parseCSV(text: string){
  const lines = text.split(/\r?\n/).filter(Boolean);
  if(!lines.length) return [] as any[];
  const header = lines[0].split(",").map(s=>s.trim());
  return lines.slice(1).map(line=>{
    const cols=line.split(",");
    const o:any={};
    header.forEach((h,i)=>o[h]=cols[i]?.trim());
    return o;
  });
}

// ---------- Main App ----------
export default function App(){
  const persisted = loadState();
  const [tab, setTab] = useState<"dashboard"|"schedule"|"employees"|"vacations"|"vacancies"|"bids"|"awards"|"alerts"|"settings"|"tests">("dashboard");
  const [employees, setEmployees] = useState<Employee[]>(persisted?.employees ?? seedEmployees);
  const [vacations, setVacations] = useState<Vacation[]>(persisted?.vacations ?? seedVacations);
  const [vacancies, setVacancies] = useState<Vacancy[]>(persisted?.vacancies ?? seedVacancies);
  const [bids, setBids] = useState<Bid[]>(persisted?.bids ?? seedBids);
  const [settings, setSettings] = useState<Settings>(persisted?.settings ?? defaultSettings);
  useEffect(()=>{ saveState({ employees, vacations, vacancies, bids, settings }); },[employees,vacations,vacancies,bids,settings]);

  const employeesById = useMemo(()=>Object.fromEntries(employees.map(e=>[e.id,e])),[employees]);

  const computeRecommendation = (vac: Vacancy) => {
    const start = combineDateTime(vac.shiftDate, vac.shiftStart);
    const known = new Date(vac.knownAt || new Date().toISOString());
    const relevant = bids.filter(b=> b.vacancyId===vac.id && b.bidderClassification===vac.classification);
    const filtered = relevant.filter(b=>{
      const emp = employeesById[b.bidderEmployeeId];
      if(!emp) return false;
      return withinDeadline(new Date(b.bidTimestamp), known, start, settings) && eligibleByStep(vac.offeringStep, emp.status);
    });
    return sortBySeniority(filtered, employees)[0]?.bidderEmployeeId;
  };

  const recommendations = useMemo(()=>{
    const m:Record<string,string|undefined>={};
    vacancies.forEach(v=>m[v.id]=computeRecommendation(v));
    return m;
  },[vacancies,bids,employees,settings]);

  // --- Helpers added to satisfy buttons ---
  const addVacation = (v: Partial<Vacation>) => {
    const vac: Vacation = {
      id: v.id ?? `v_${Date.now()}`,
      employeeId: v.employeeId ?? "",
      employeeName: v.employeeName ?? "",
      classification: (v.classification ?? "RCA") as Classification,
      status: (v.status ?? "Pending"),
      startDate: v.startDate ?? isoDate(new Date()),
      endDate: v.endDate ?? isoDate(new Date()),
      notes: v.notes ?? ""
    };
    setVacations(prev => [...prev, vac]);
  };

  const addVacancy = (v: Partial<Vacancy>) => {
    const vac: Vacancy = {
      id: v.id ?? `x${Math.random().toString(36).slice(2,7)}`,
      vacationId: v.vacationId,
      reason: v.reason ?? "Vacancy",
      classification: (v.classification ?? "RCA") as Classification,
      wing: v.wing,
      shiftDate: v.shiftDate ?? isoDate(new Date()),
      shiftStart: v.shiftStart ?? "06:30",
      shiftEnd: v.shiftEnd ?? "14:30",
      knownAt: v.knownAt ?? new Date().toISOString(),
      offeringStep: (v.offeringStep ?? "Casuals"),
      status: (v.status ?? "Open"),
      recommendedAward: v.recommendedAward,
      awardedTo: undefined,
      awardedAt: undefined
    };
    setVacancies(prev => [vac, ...prev]);
  };

  const awardVacancy = (vacId: string) => {
    const empId = recommendations[vacId];
    if(!empId) return;
    setVacancies(prev =>
      prev.map(v => v.id===vacId ? ({ ...v, status:"Awarded", awardedTo: empId, awardedAt: new Date().toISOString() }) : v)
    );
  };

  // forms state
  const [newVac, setNewVac] = useState<Partial<Vacancy>>({
    classification:"RCA", shiftDate: isoDate(new Date()), shiftStart:"06:30", shiftEnd:"14:30", offeringStep:"Casuals"
  });
  const [newBid, setNewBid] = useState<Partial<Bid>>({});
  const [newVacay, setNewVacay] = useState<Partial<Vacation>>({ status:"Pending" });

  return (
    <div className="app">
      <style>{`
        :root{--bg1:#0f172a;--bg2:#0b1220;--card:rgba(255,255,255,.06);--stroke:rgba(255,255,255,.12);--text:#e6e9ef;--muted:#a8b0c0;--brand:#8b5cf6;--ok:#10b981;--warn:#f59e0b;--bad:#ef4444}
        *{box-sizing:border-box} body,html,#root{height:100%}
        .app{min-height:100vh;background:radial-gradient(900px 500px at 15% -10%,rgba(99,102,241,.25),transparent),radial-gradient(900px 500px at 85% 5%,rgba(45,212,191,.18),transparent),linear-gradient(180deg,var(--bg1),var(--bg2));color:var(--text);font-family:Inter,system-ui,Arial,sans-serif;padding:20px}
        .container{max-width:1100px;margin:0 auto}
        .nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .title{font-size:22px;font-weight:700} .subtitle{color:var(--muted);font-size:13px}
        .toolbar{display:flex;gap:8px} .btn{background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.06));border:1px solid var(--stroke);padding:8px 12px;border-radius:12px;color:var(--text);cursor:pointer}
        .btn:hover{border-color:rgba(255,255,255,.25)} .grid{display:grid;gap:12px} .grid3{grid-template-columns:1fr} @media(min-width:800px){.grid3{grid-template-columns:repeat(3,1fr)}}
        .card{background:var(--card);border:1px solid var(--stroke);border-radius:14px;overflow:hidden}
        .card-h{padding:10px 14px;border-bottom:1px solid var(--stroke);font-weight:600;display:flex;align-items:center;justify-content:space-between}
        .card-c{padding:14px}
        table{width:100%;border-collapse:collapse} th,td{padding:9px;border-bottom:1px solid var(--stroke);text-align:left} th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
        input,select,textarea{width:100%;background:rgba(255,255,255,.07);border:1px solid var(--stroke);border-radius:10px;padding:9px;color:var(--text)} input::placeholder{color:#9aa3b2}
        .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px} .tab{padding:8px 12px;border-radius:12px;border:1px solid var(--stroke);cursor:pointer;background:rgba(255,255,255,.06)} .tab.active{border-color:#9aa6ff;background:linear-gradient(180deg,rgba(99,102,241,.35),rgba(99,102,241,.18))}
        .row{display:grid;gap:10px} .cols2{grid-template-columns:1fr} @media(min-width:900px){.cols2{grid-template-columns:1fr 1fr}}
        .pill{border:1px solid var(--stroke);padding:3px 8px;border-radius:999px;font-size:12px}
        .ok{color:var(--ok)} .warn{color:var(--warn)} .bad{color:var(--bad)}
        .dropdown{position:relative} .menu{position:absolute;z-index:30;top:100%;left:0;right:0;background:#0b1020;border:1px solid var(--stroke);border-radius:10px;max-height:220px;overflow:auto}
        .item{padding:8px 10px;cursor:pointer} .item:hover{background:rgba(139,92,246,.18)}
        /* Calendar */
        .cal-head{display:flex;gap:8px;align-items:center}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:8px}
        .cal-dow{opacity:.75;font-size:12px;text-align:center}
        .cal-day{border:1px solid var(--stroke);border-radius:10px;padding:8px;min-height:88px;background:rgba(255,255,255,.04);display:flex;flex-direction:column}
        .cal-day.mute{opacity:.45}
        .cal-num{font-weight:700;margin-bottom:6px}
        .cal-open{margin-top:auto;font-size:12px}
        .cal-chip{display:inline-block;border:1px solid var(--stroke);border-radius:999px;padding:2px 6px;margin-right:6px;margin-bottom:6px}
      `}</style>

      <div className="container">
        <div className="nav">
          <div>
            <div className="title">Maplewood Scheduler</div>
            <div className="subtitle">Vacation coverage • call-outs • seniority & response windows</div>
          </div>
          <div className="toolbar">
            <button className="btn" onClick={()=>{
              if(confirm("Reset all data?")){
                setEmployees(seedEmployees);
                setVacations(seedVacations);
                setVacancies(seedVacancies);
                setBids(seedBids);
                setSettings(defaultSettings);
              }
            }}>Reset</button>
            <button className="btn" onClick={()=>{
              const blob=new Blob([JSON.stringify({employees,vacations,vacancies,bids,settings},null,2)],{type:"application/json"});
              const url=URL.createObjectURL(blob);
              const a=document.createElement("a");
              a.href=url; a.download="maplewood-scheduler-backup.json"; a.click();
              URL.revokeObjectURL(url);
            }}>Export</button>
          </div>
        </div>

        <div className="tabs">
          {(["dashboard","schedule","employees","vacations","vacancies","bids","awards","alerts","settings","tests"] as const).map(k=> (
            <button key={k} className={`tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{k[0].toUpperCase()+k.slice(1)}</button>
          ))}
        </div>

        {tab==="dashboard" && (
          <div className="grid grid3">
            <div className="card"><div className="card-h">Open Vacancies</div><div className="card-c"><div style={{fontSize:30,fontWeight:700}}>{vacancies.filter(v=>v.status!=="Awarded").length}</div><div className="subtitle">Shifts needing action</div></div></div>
            <div className="card"><div className="card-h">Bids Logged</div><div className="card-c"><div style={{fontSize:30,fontWeight:700}}>{bids.length}</div><div className="subtitle">Manual entries from WhatsApp</div></div></div>
            <div className="card"><div className="card-h">Deadlines Today</div><div className="card-c"><DeadlineList vacancies={vacancies} settings={settings}/></div></div>
          </div>
        )}

        {tab==="schedule" && (
          <div className="grid">
            <div className="card">
              <div className="card-h">
                <span>Monthly Schedule (open shifts)</span>
              </div>
              <div className="card-c">
                <MonthlySchedule vacancies={vacancies}/>
              </div>
            </div>
          </div>
        )}

        {tab==="employees" && (
          <div className="grid">
            <div className="card"><div className="card-h">Import Seniority (CSV)</div><div className="card-c">
              <input type="file" accept=".csv" onChange={async e=>{
                const f=e.target.files?.[0]; if(!f) return;
                const text=await f.text();
                const rows=parseCSV(text);
                const out:Employee[]=rows.map((r:any,i:number)=>({
                  id:String(r.id??r.EmployeeID??`emp_${i}`),
                  firstName:String(r.firstName??r.FirstName??""),
                  lastName:String(r.lastName??r.LastName??""),
                  classification:(r.classification??r.Classification??"RCA") as Classification,
                  status:(r.status??r.Status??"FT") as Status,
                  homeWing:String(r.homeWing??r.HomeWing??""),
                  seniorityRank:Number(r.seniorityRank??r.SeniorityRank??9999),
                  active:String(r.active??r.Active??"Yes").toLowerCase().startsWith("y")
                }));
                setEmployees(out.filter(e=>!!e.id));
              }}/>
              <div className="subtitle">Columns: id, firstName, lastName, classification (RCA/LPN/RN), status (FT/PT/Casual), homeWing, seniorityRank, active (Yes/No)</div>
            </div></div>
            <div className="card"><div className="card-h">Employees</div><div className="card-c">
              <table><thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Status</th><th>Wing</th><th>Rank</th><th>Active</th></tr></thead>
              <tbody>{employees.map(e=> (
                <tr key={e.id}><td>{e.id}</td><td>{e.firstName} {e.lastName}</td><td>{e.classification}</td><td>{e.status}</td><td>{e.homeWing}</td><td>{e.seniorityRank}</td><td>{e.active?"Yes":"No"}</td></tr>
              ))}</tbody></table>
            </div></div>
          </div>
        )}

        {tab==="vacations" && (
          <div className="grid">
            <div className="card"><div className="card-h">Add Vacation</div><div className="card-c">
              <div className="row cols2">
                <div>
                  <label>Employee</label>
                  <EmployeeCombo employees={employees} onSelect={(id)=>{
                    const e=employeesById[id];
                    setNewVacay(v=>({
                      ...v,
                      employeeId:id,
                      employeeName: e? `${e.firstName} ${e.lastName}`: "" ,
                      classification: (e?.classification??v.classification??"RCA") as Classification
                    }));
                  }} />
                </div>
                <div>
                  <label>Status</label>
                  <select defaultValue="Pending" onChange={e=> setNewVacay(v=>({...v, status: e.target.value as Vacation["status"]}))}>
                    <option>Pending</option><option>Approved</option>
                  </select>
                </div>
                <div>
                  <label>Classification</label>
                  <select value={(newVacay.classification ?? "RCA")} onChange={e=> setNewVacay(v=>({...v, classification: e.target.value as Classification}))}>
                    <option>RCA</option><option>LPN</option><option>RN</option>
                  </select>
                </div>
                <div><label>Start</label><input type="date" onChange={e=> setNewVacay(v=>({...v,startDate:e.target.value}))}/></div>
                <div><label>End</label><input type="date" onChange={e=> setNewVacay(v=>({...v,endDate:e.target.value}))}/></div>
                <div style={{gridColumn:"1 / -1"}}><label>Notes</label><textarea onChange={e=> setNewVacay(v=>({...v,notes:e.target.value}))}/></div>
                <div style={{gridColumn:"1 / -1"}}>
                  <button className="btn" onClick={()=>{
                    if(!newVacay.employeeId||!newVacay.startDate||!newVacay.endDate) return alert("Employee, start and end required");
                    addVacation(newVacay);
                    setNewVacay({ status:"Pending" });
                  }}>Add</button>
                </div>
              </div>
            </div></div>
            <div className="card"><div className="card-h">Vacations</div><div className="card-c">
              <table><thead><tr><th>Employee</th><th>Status</th><th>Class</th><th>Start</th><th>End</th><th>Prime?</th></tr></thead>
              <tbody>{vacations.map(v=>{
                const s=new Date(v.startDate), e=new Date(v.endDate),
                  p1s=new Date(settings.prime1Start), p1e=new Date(settings.prime1End),
                  p2s=new Date(settings.prime2Start), p2e=new Date(settings.prime2End);
                const prime=((s>=p1s&&s<=p1e)||(e>=p1s&&e<=p1e)||(s>=p2s&&s<=p2e)||(e>=p2s&&e<=p2e));
                return (
                  <tr key={v.id}><td>{v.employeeName}</td><td>{v.status}</td><td>{v.classification}</td><td>{v.startDate}</td><td>{v.endDate}</td><td>{prime? <span className="pill warn">Prime</span>: ""}</td></tr>
                );
              })}</tbody></table>
            </div></div>
          </div>
        )}

        {tab==="vacancies" && (
          <div className="grid">
            <div className="card"><div className="card-h">Create Vacancy</div><div className="card-c">
              <div className="row cols2">
                <div><label>Reason</label><input placeholder="Vacation Backfill" value={newVac.reason??""} onChange={e=> setNewVac(v=>({...v,reason:e.target.value}))}/></div>
                <div><label>Classification</label><select value={newVac.classification} onChange={e=> setNewVac(v=>({...v,classification:e.target.value as Classification}))}><option>RCA</option><option>LPN</option><option>RN</option></select></div>
                <div><label>Wing</label><input placeholder="Shamrock" value={newVac.wing??""} onChange={e=> setNewVac(v=>({...v,wing:e.target.value}))}/></div>
                <div><label>Shift Date</label><input type="date" value={newVac.shiftDate} onChange={e=> setNewVac(v=>({...v,shiftDate:e.target.value}))}/></div>
                <div><label>Start</label><input type="time" value={newVac.shiftStart} onChange={e=> setNewVac(v=>({...v,shiftStart:e.target.value}))}/></div>
                <div><label>End</label><input type="time" value={newVac.shiftEnd} onChange={e=> setNewVac(v=>({...v,shiftEnd:e.target.value}))}/></div>
                <div><label>Known At</label><input type="datetime-local" value={newVac.knownAt??""} onChange={e=> setNewVac(v=>({...v,knownAt:e.target.value}))}/></div>
                <div><label>Offering Step</label><select value={newVac.offeringStep} onChange={e=> setNewVac(v=>({...v,offeringStep:e.target.value as Vacancy["offeringStep"]}))}><option>Casuals</option><option>OT-Regular</option><option>OT-Casuals</option></select></div>
                <div><label>Status</label><select value={newVac.status??"Open"} onChange={e=> setNewVac(v=>({...v,status:e.target.value as Vacancy["status"]}))}><option>Open</option><option>Pending Award</option><option>Awarded</option></select></div>
                <div style={{gridColumn:"1 / -1"}}><button className="btn" onClick={()=>{
                  if(!newVac.shiftDate) return alert("Shift date required");
                  addVacancy(newVac);
                  setNewVac({ classification:"RCA", shiftDate: isoDate(new Date()), shiftStart:"06:30", shiftEnd:"14:30", offeringStep:"Casuals" });
                }}>Create</button></div>
              </div>
            </div></div>
            <div className="card"><div className="card-h">Vacancies</div><div className="card-c">
              <table><thead><tr><th>ID</th><th>When</th><th>Class</th><th>Wing</th><th>KnownAt</th><th>Offering</th><th>Status</th><th>Recommended</th><th>Action</th></tr></thead>
              <tbody>{vacancies.map(v=>{
                const empId=recommendations[v.id];
                const emp=empId? employeesById[empId]:undefined;
                return (
                  <tr key={v.id}>
                    <td>{v.id}</td><td>{v.shiftDate} {v.shiftStart}-{v.shiftEnd}</td>
                    <td>{v.classification}</td><td>{v.wing??""}</td>
                    <td>{human(v.knownAt)}</td><td>{v.offeringStep}</td><td>{v.status}</td>
                    <td>{emp? `${emp.firstName} ${emp.lastName}`: "—"}</td>
                    <td><button className="btn" disabled={!emp||v.status==="Awarded"} onClick={()=> awardVacancy(v.id)}>Award</button></td>
                  </tr>
                );
              })}</tbody></table>
            </div></div>
          </div>
        )}

        {tab==="bids" && (
          <div className="grid">
            <div className="card"><div className="card-h">Add Bid (manual)</div><div className="card-c">
              <div className="row cols2">
                <div>
                  <label>Vacancy</label>
                  <select onChange={e=> setNewBid(b=>({...b, vacancyId:e.target.value}))} defaultValue="">
                    <option value="" disabled>Pick vacancy</option>
                    {vacancies.map(v=> <option key={v.id} value={v.id}>{v.id} • {v.shiftDate} {v.shiftStart}</option>)}
                  </select>
                </div>
                <div>
                  <label>Employee</label>
                  <EmployeeCombo employees={employees} onSelect={(id)=>{
                    const e=employeesById[id];
                    setNewBid(b=>({
                      ...b,
                      bidderEmployeeId:id,
                      bidderName:e? `${e.firstName} ${e.lastName}`: "",
                      bidderStatus: e?.status,
                      bidderClassification: e?.classification
                    }));
                  }} />
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
                  <tr key={i}>
                    <td>{b.vacancyId}</td><td>{b.bidderName}</td><td>{b.bidderClassification}</td>
                    <td>{b.bidderStatus}</td><td>{human(b.bidTimestamp)}</td>
                    <td>{inWin? <span className="ok">Yes</span>: <span className="bad">No</span>}</td>
                    <td>{stepOK? <span className="ok">Yes</span>: <span className="bad">No</span>}</td>
                  </tr>
                );
              })}</tbody></table>
            </div></div>
          </div>
        )}

        {tab==="awards" && (
          <div className="grid">
            <div className="card"><div className="card-h">Recommend & Award</div><div className="card-c">
              <table><thead><tr><th>Vacancy</th><th>When</th><th>Offering</th><th>Top Eligible</th><th>Action</th></tr></thead>
              <tbody>{vacancies.filter(v=>v.status!=="Awarded").map(v=>{
                const id=recommendations[v.id];
                const e=id? employeesById[id]:undefined;
                return (
                  <tr key={v.id}>
                    <td>{v.id}</td><td>{v.shiftDate} {v.shiftStart}</td><td>{v.offeringStep}</td>
                    <td>{e? `${e.firstName} ${e.lastName} (rank ${e.seniorityRank})` : "—"}</td>
                    <td><button className="btn" disabled={!e} onClick={()=> awardVacancy(v.id)}>Award</button></td>
                  </tr>
                );
              })}</tbody></table>
            </div></div>
          </div>
        )}

        {tab==="alerts" && (
          <div className="grid"><div className="card"><div className="card-h">Response Windows (open vacancies)</div><div className="card-c"><DeadlineList vacancies={vacancies} settings={settings} detailed/></div></div></div>
        )}

        {tab==="settings" && (
          <div className="grid">
            <div className="card"><div className="card-h">Response Windows (minutes)</div><div className="card-c">
              <div className="row cols2">
                {([ ["<2h","lt2h"],["2–4h","h2to4"],["4–24h","h4to24"],["24–72h","h24to72"],[">72h","gt72"] ] as const).map(([label,key])=> (
                  <div key={key}><label>{label}</label><input type="number" value={(settings.responseWindows as any)[key]} onChange={e=> setSettings(s=>({...s, responseWindows:{...s.responseWindows, [key]: Number(e.target.value)}}))}/></div>
                ))}
              </div>
            </div></div>
            <div className="card"><div className="card-h">Prime Periods</div><div className="card-c">
              <div className="row cols2">
                <div><label>Prime #1 Start</label><input type="date" value={settings.prime1Start} onChange={e=> setSettings(s=>({...s, prime1Start:e.target.value}))}/></div>
                <div><label>Prime #1 End</label><input type="date" value={settings.prime1End} onChange={e=> setSettings(s=>({...s, prime1End:e.target.value}))}/></div>
                <div><label>Prime #2 Start</label><input type="date" value={settings.prime2Start} onChange={e=> setSettings(s=>({...s, prime2Start:e.target.value}))}/></div>
                <div><label>Prime #2 End</label><input type="date" value={settings.prime2End} onChange={e=> setSettings(s=>({...s, prime2End:e.target.value}))}/></div>
              </div>
            </div></div>
          </div>
        )}

        {tab==="tests" && (
          <div className="grid"><div className="card"><div className="card-h">Diagnostics</div><div className="card-c"><Diagnostics settings={settings} employees={employees} vacancies={vacancies}/></div></div></div>
        )}

      </div>
    </div>
  );
}

// ---------- Components ----------
function DeadlineList({vacancies, settings}:{vacancies:Vacancy[]; settings:Settings; detailed?:boolean}){
  const now = new Date();
  const items = vacancies
    .filter(v=>v.status!=="Awarded")
    .map(v=>{
      const start=combineDateTime(v.shiftDate,v.shiftStart);
      const known=new Date(v.knownAt);
      const mins=windowMinutes(diffHours(start,known),settings);
      const deadline=new Date(known.getTime()+mins*60000);
      const left=Math.max(0,Math.round((deadline.getTime()-now.getTime())/60000));
      return { id:v.id, offering:v.offeringStep, deadline, left };
    })
    .sort((a,b)=>a.deadline.getTime()-b.deadline.getTime());
  if(!items.length) return <div className="subtitle">No open response windows.</div>;
  return <div className="row">{items.map(it=> (
    <div key={it.id} className="pill" style={{display:"flex",justifyContent:"space-between",gap:8}}>
      <span>Vacancy <b>{it.id}</b> • {it.offering}</span>
      <span className={it.left<=5?"bad":it.left<=30?"warn":""}>{it.left} min left (deadline {it.deadline.toLocaleTimeString()})</span>
    </div>
  ))}</div>;
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

// Monthly schedule grid (shows OPEN vacancies count per day; click a day to see list)
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
  const daysOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div>
      <div className="cal-head">
        <div className="row" style={{gridTemplateColumns:'auto auto auto', gap:8}}>
          <button className="btn" onClick={()=> prevMonth(setYear,setMonth,year,month)}>&lt;</button>
          <div className="pill" style={{alignSelf:'center'}}>{monthLabel}</div>
          <button className="btn" onClick={()=> nextMonth(setYear,setMonth,year,month)}>&gt;</button>
        </div>
        <div style={{marginLeft:'auto'}} className="subtitle">Click a day to list open shifts</div>
      </div>
      <div className="cal-grid">
        {daysOfWeek.map(d=> <div key={d} className="cal-dow">{d}</div>)}
        {calDays.map(({date, inMonth})=>{
          const key = isoDate(date);
          const opens = openByDay.get(key) || [];
          return (
            <div key={key} className={`cal-day ${inMonth?"":"mute"}`} onClick={()=> setSelectedISO(key)}>
              <div className="cal-num">{date.getDate()}</div>
              <div className="cal-open">
                {opens.length? <span className="pill bad">{opens.length} open</span> : <span className="subtitle">—</span>}
              </div>
            </div>
          );
        })}
      </div>
      <DayOpenList dateISO={selectedISO} vacancies={openByDay.get(selectedISO)||[]} />
    </div>
  );
}

function buildCalendar(year:number, month:number){
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // start on Sunday
  const days = [] as {date: Date; inMonth: boolean}[];
  for(let i=0;i<42;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    days.push({ date: d, inMonth: d.getMonth()===month });
  }
  return days;
}
function prevMonth(setY:Function,setM:Function,y:number,m:number){ if(m===0){setY(y-1); setM(11);} else setM(m-1); }
function nextMonth(setY:Function,setM:Function,y:number,m:number){ if(m===11){setY(y+1); setM(0);} else setM(m+1); }

function DayOpenList({dateISO, vacancies}:{dateISO:string; vacancies:Vacancy[]}){
  return (
    <div style={{marginTop:12}}>
      <div className="pill">Open on {dateISO}: {vacancies.length}</div>
      {vacancies.length>0 && (
        <table style={{marginTop:8}}>
          <thead><tr><th>ID</th><th>Class</th><th>Wing</th><th>Time</th><th>Offering</th><th>Status</th></tr></thead>
          <tbody>
            {vacancies.map(v=> (
              <tr key={v.id}><td>{v.id}</td><td>{v.classification}</td><td>{v.wing??''}</td><td>{v.shiftStart}-{v.shiftEnd}</td><td>{v.offeringStep}</td><td>{v.status}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- Diagnostics (Tests) ----------
function Diagnostics({ settings, employees, vacancies }:{ settings:Settings; employees:Employee[]; vacancies:Vacancy[] }){
  const now = new Date("2025-08-25T15:00:00");
  const shiftSoon = new Date("2025-08-25T16:00:00"); // 1h later => lt2h => 7min
  const shift4h = new Date("2025-08-25T19:00:00"); // 4h => h4to24 => 30min
  const shift30h = new Date("2025-08-26T21:00:00"); // 30h => h24to72 => 120min
  const w1 = windowMinutes(diffHours(shiftSoon, now), settings);
  const w2 = windowMinutes(diffHours(shift4h, now), settings);
  const w3 = windowMinutes(diffHours(shift30h, now), settings);
  const within = withinDeadline(new Date("2025-08-25T15:06:00"), now, shiftSoon, settings);
  const testBids: Bid[] = [
    { vacancyId:"t1", bidderEmployeeId: employees[0]?.id ?? "1001", bidderName:"A", bidderStatus:"FT", bidderClassification:"RCA", bidTimestamp: now.toISOString() },
    { vacancyId:"t1", bidderEmployeeId: employees[1]?.id ?? "1002", bidderName:"B", bidderStatus:"PT", bidderClassification:"RCA", bidTimestamp: now.toISOString() },
  ];
  const sorted = sortBySeniority(testBids, employees);
  const sampleName = `${employees[0]?.firstName ?? "Priya"} ${employees[0]?.lastName ?? "Kaur"}`;
  const comboListMatches = matchText("pri ka", sampleName);
  const openOnAug26 = vacancies.filter(v=> v.shiftDate==="2025-08-26" && v.status!=="Awarded").length; // seed is 1
  const rows = [
    { name:"Bucket <2h => 7min", pass: w1===settings.responseWindows.lt2h, value:w1 },
    { name:"Bucket 4h => 30min", pass: w2===settings.responseWindows.h4to24, value:w2 },
    { name:"Bucket 30h => 120min", pass: w3===settings.responseWindows.h24to72, value:w3 },
    { name:"Within 7-min window", pass: within===true, value:String(within) },
    { name:"Seniority sort stable", pass: sorted[0]?.bidderEmployeeId === (employees[0]?.id ?? "1001"), value: sorted.map(s=>s.bidderEmployeeId).join(",") },
    { name:"Combo fuzzy match", pass: comboListMatches===true, value:String(comboListMatches) },
    { name:"Calendar open count 2025-08-26", pass: openOnAug26===1, value: openOnAug26 },
  ];
  return (
    <div className="row">
      {rows.map((r,i)=> (
        <div key={i} className="pill" style={{display:"flex",justifyContent:"space-between"}}>
          <span>{r.name}</span>
          <span className={r.pass?"ok":"bad"}>{r.pass?"PASS":"FAIL"} <span className="subtitle">({String(r.value)})</span></span>
        </div>
      ))}
      <div className="subtitle">If any expectation should be different (e.g., bucket times), tell me and I’ll change the logic.</div>
    </div>
  );
}
