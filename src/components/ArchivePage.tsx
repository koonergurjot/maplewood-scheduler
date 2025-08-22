import type { Vacation } from "../App";
import { formatDateLong } from "../utils/date";

export default function ArchivePage({vacations}:{vacations:Vacation[]}){
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
