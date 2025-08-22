import { useState } from 'react';
import type { Employee, Vacancy } from '../types';
import { formatDateLong, formatDowShort } from '../utils';
import SelectEmployee from './SelectEmployee';

interface Props {
  v: Vacancy;
  recId?: string;
  recName: string;
  recWhy: string[];
  employees: Employee[];
  countdownLabel: string;
  countdownClass: string;
  isDueNext: boolean;
  overrideReasons: readonly string[];
  onAward: (payload: { empId?: string; reason?: string; overrideUsed?: boolean }) => void;
  onResetKnownAt: () => void;
}

export default function VacancyRow({
  v,
  recId,
  recName,
  recWhy,
  employees,
  countdownLabel,
  countdownClass,
  isDueNext,
  overrideReasons,
  onAward,
  onResetKnownAt,
}: Props) {
  const [choice, setChoice] = useState<string>('');
  const [overrideClass, setOverrideClass] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');

  const chosen = employees.find(e => e.id === choice);
  const classMismatch = chosen && chosen.classification !== v.classification;
  const needReason = (!!recId && choice && choice !== recId) || (classMismatch && overrideClass);

  function handleAward(){
    if (classMismatch && !overrideClass){
      alert(`Selected employee is ${chosen?.classification}; vacancy requires ${v.classification}. Check "Allow class override" to proceed.`);
      return;
    }
    if (needReason && !reason){
      alert('Please select a reason for this override.');
      return;
    }
    onAward({ empId: choice || undefined, reason: reason || undefined, overrideUsed: overrideClass });
    setChoice(''); setReason(''); setOverrideClass(false);
  }

  return (
    <tr className={isDueNext ? 'due-next' : ''}>
      <td><span className="pill">{formatDowShort(v.shiftDate)}</span> {formatDateLong(v.shiftDate)} • {v.shiftStart}-{v.shiftEnd}</td>
      <td>{v.wing ?? ''}</td>
      <td>{v.classification}</td>
      <td>{v.offeringStep}</td>
      <td>
        <div style={{display:'flex', alignItems:'center', flexWrap:'wrap', gap:4}}>
          <span>{recName}</span>
          {recWhy.map((w,i)=> (
            <span key={i} className="pill">{w}</span>
          ))}
        </div>
      </td>
      <td>
        <span className={`cd-chip ${countdownClass}`}>{countdownLabel}</span>
      </td>
      <td style={{minWidth:220}}>
        <SelectEmployee allowEmpty employees={employees} value={choice} onChange={setChoice}/>
      </td>
      <td style={{whiteSpace:'nowrap'}}>
        <label style={{display:'flex', gap:6, alignItems:'center'}}>
          <input type="checkbox" checked={overrideClass} onChange={e=> setOverrideClass(e.target.checked)} />
          <span className="subtitle">Allow class override</span>
        </label>
      </td>
      <td style={{minWidth:230}}>
        {(needReason || overrideClass || (recId && choice && choice !== recId)) ? (
          <select value={reason} onChange={e=> setReason(e.target.value)}>
            <option value="">Select reason…</option>
            {overrideReasons.map(r=> <option key={r} value={r}>{r}</option>)}
          </select>
        ) : <span className="subtitle">—</span>}
      </td>
      <td style={{display:'flex', gap:6}}>
        <button className="btn" onClick={onResetKnownAt}>Reset knownAt</button>
        <button className="btn" onClick={handleAward} disabled={!choice}>Award</button>
      </td>
    </tr>
  );
}
