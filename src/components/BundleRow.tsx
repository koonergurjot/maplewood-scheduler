import React from "react";
import type { Vacancy, Employee, Settings } from "../types";
import { formatDateLong, combineDateTime, minutesBetween } from "../lib/dates";
import { deadlineFor, pickWindowMinutes, fmtCountdown } from "../lib/vacancy";

type Props = {
  groupId: string;                 // vacationId or bundleId
  items: Vacancy[];                // child vacancies in the bundle (open only)
  employees: Employee[];
  settings: Settings;
  selectedIds: string[];
  onToggleSelectMany: (ids: string[]) => void;
  onDeleteMany: (ids: string[]) => void;
  dueNextId: string | null;        // id of the globally “due next” vacancy
};

export default function BundleRow({
  groupId, items, settings, selectedIds, onToggleSelectMany, onDeleteMany, dueNextId,
}: Props) {
  // Sort children by date/time to find the FIRST shift
  const sorted = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const aDt = combineDateTime(a.shiftDate, a.shiftStart).getTime();
      const bDt = combineDateTime(b.shiftDate, b.shiftStart).getTime();
      return aDt - bDt;
    });
  }, [items]);

  const first = sorted[0];
  const last  = sorted[sorted.length - 1];

  // Countdown & color based on FIRST shift only
  const now = Date.now();
  const msLeft = deadlineFor(first, settings).getTime() - now;
  const winMin = pickWindowMinutes(first, settings);
  const sinceKnownMin = minutesBetween(new Date(), new Date(first.knownAt));
  const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
  let cdClass = "cd-green";
  if (msLeft <= 0) cdClass = "cd-red";
  else if (pct < 0.25) cdClass = "cd-yellow";

  // Selection state: checked if ALL children are selected
  const childIds = sorted.map(v => v.id);
  const allSelected = childIds.every(id => selectedIds.includes(id));

  const toggleBundle = () => {
    if (allSelected) onToggleSelectMany(childIds.filter(id => !id.startsWith("__"))); // unselect all
    else onToggleSelectMany(childIds);                                                // select all
  };

  const handleDelete = () => onDeleteMany(childIds);

  const isDueNext = dueNextId ? childIds.includes(dueNextId) : false;

  return (
    <tr data-bundle-id={groupId} className={isDueNext ? "due-next" : undefined}>
      <td>
        <input
          type="checkbox"
          aria-label="Select bundle"
          checked={allSelected}
          onChange={toggleBundle}
        />
      </td>
      <td>
        <div style={{ display:"flex", flexDirection:"column" }}>
          <div style={{ fontWeight: 600 }}>
            {formatDateLong(first.shiftDate)} → {formatDateLong(last.shiftDate)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {items.length} days • {first.wing ?? "Wing"} • {first.classification}
          </div>
        </div>
      </td>
      <td>
        <div className={`countdown ${cdClass}`} title="Time left for first day">
          {fmtCountdown(msLeft)}
        </div>
      </td>
      <td style={{ textAlign:"right" }}>
        <button className="btn btn-sm" onClick={toggleBundle} title="Select all days">Select</button>
        <button className="btn btn-sm danger" onClick={handleDelete} title="Delete all days">Delete</button>
      </td>
    </tr>
  );
}
