import { useEffect, useMemo, useRef, useState } from "react";
import type { Employee } from "../App";
import { matchText } from "../utils/text";

type Props = { employees: Employee[]; value: string; onChange: (v: string) => void };

export default function SelectEmployee({ employees, value, onChange }: Props){
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
