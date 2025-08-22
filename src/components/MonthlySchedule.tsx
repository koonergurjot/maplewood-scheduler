import { useState, useMemo } from "react";
import type { Vacancy } from "../App";
import { isoDate, buildCalendar, formatDateLong, prevMonth, nextMonth } from "../utils/date";

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

export default function MonthlySchedule({ vacancies }:{ vacancies:Vacancy[] }){
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
