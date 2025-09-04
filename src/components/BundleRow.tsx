import React from "react";
import type { Vacancy, Employee, Settings } from "../types";
import { formatDateLong, combineDateTime, minutesBetween } from "../lib/dates";
import { deadlineFor, pickWindowMinutes, fmtCountdown } from "../lib/vacancy";
import EmployeePickerModal from "./EmployeePickerModal";

type Props = {
  groupId: string;
  items: Vacancy[];
  employees: Employee[];
  settings: Settings;
  selectedIds: string[];
  onToggleSelectMany: (ids: string[]) => void;
  onDeleteMany: (ids: string[]) => void;
  onSplitBundle: (ids: string[]) => void;          // unsets bundleId on every child
  onAwardBundle?: (employeeId: string) => void;     // optional hook
  dueNextId: string | null;
};

export default function BundleRow({
  groupId, items, employees, settings, selectedIds,
  onToggleSelectMany, onDeleteMany, onSplitBundle,
  onAwardBundle, dueNextId,
}: Props) {
  const sorted = React.useMemo(() =>
    [...items].sort((a,b) =>
      combineDateTime(a.shiftDate, a.shiftStart).getTime() -
      combineDateTime(b.shiftDate, b.shiftStart).getTime()
    ), [items]);

  const first = sorted[0];
  const childIds = sorted.map(v => v.id);
  const allSelected = childIds.every(id => selectedIds.includes(id));
  const toggleAll = () => onToggleSelectMany(childIds);
  const isDueNext = dueNextId ? childIds.includes(dueNextId) : false;

  // countdown from first day only
  const now = Date.now();
  const msLeft = deadlineFor(first, settings).getTime() - now;
  const winMin = pickWindowMinutes(first, settings);
  const sinceKnownMin = minutesBetween(new Date(), new Date(first.knownAt));
  const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
  let cdClass = "cd-green";
  if (msLeft <= 0) cdClass = "cd-red";
  else if (pct < 0.25) cdClass = "cd-yellow";

  const [open, setOpen] = React.useState(false);
  const [pickOpen, setPickOpen] = React.useState(false);
  const explicitDates = sorted.map(v => formatDateLong(v.shiftDate)).join(", ");

  return (
    <>
      <tr data-bundle-id={groupId} className={isDueNext ? "due-next" : undefined}>
        <td><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select bundle" /></td>
        <td>
          <div style={{display:"flex", flexDirection:"column"}}>
            <div style={{fontWeight:600}}>
              {items.length} days • {first.wing ?? "Wing"} • {first.classification}
            </div>
            <div style={{fontSize:12, opacity:0.85}}>{explicitDates}</div>
          </div>
        </td>
        <td><div className={`countdown ${cdClass}`}>{fmtCountdown(msLeft)}</div></td>
        <td style={{textAlign:"right"}}>
          <button className="btn btn-sm" onClick={() => setOpen(o => !o)}>{open ? "Hide" : "Expand"}</button>
          <button className="btn btn-sm" onClick={() => setPickOpen(true)}>Award Bundle</button>
          <button className="btn btn-sm" onClick={toggleAll}>Select</button>
          <button className="btn btn-sm" onClick={() => onSplitBundle(childIds)}>Split</button>
          <button className="btn btn-sm danger" onClick={() => onDeleteMany(childIds)}>Delete</button>
        </td>
      </tr>

      <EmployeePickerModal
        open={pickOpen}
        employees={employees}
        classification={first.classification}
        onClose={() => setPickOpen(false)}
        onSelect={(eid) => { setPickOpen(false); onAwardBundle?.(eid); }}
      />
      {open && (
        <tr>
          <td />
          <td colSpan={3}>
            <div className="bundle-expand">
              {sorted.map(v => (
                <div key={v.id} style={{display:"flex", gap:8, padding:"4px 0"}}>
                  <div style={{minWidth:160}}>{formatDateLong(v.shiftDate)}</div>
                  <div style={{minWidth:100}}>{v.shiftStart}–{v.shiftEnd}</div>
                  <div style={{minWidth:100}}>{v.wing ?? "-"}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

