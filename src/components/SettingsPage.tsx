import type { Settings } from "../App";

export default function SettingsPage({settings,setSettings}:{settings:Settings; setSettings:(u:any)=>void}){
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
