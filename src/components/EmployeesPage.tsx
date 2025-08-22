import type { Employee, Classification, Status } from "../App";
import { parseCSV } from "../utils/csv";

export default function EmployeesPage({employees, setEmployees}:{employees:Employee[]; setEmployees:(u:any)=>void}){
  return (
    <div className="grid">
      <div className="card"><div className="card-h">Import Staff (CSV)</div><div className="card-c">
        <input type="file" accept=".csv" onChange={async e=>{
          const f=e.target.files?.[0]; if(!f) return; const text=await f.text(); const rows=parseCSV(text);
          const out:Employee[]=rows.map((r,i)=>({
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
