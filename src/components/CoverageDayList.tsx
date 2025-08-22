import type { Vacancy } from '../types';
import { formatDateLong } from '../utils';

export default function CoverageDayList({ dateISO, vacancies }: { dateISO: string; vacancies: Vacancy[] }) {
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
