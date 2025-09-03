import React, { useState, useMemo } from "react";
import type { Vacancy, Settings } from "../types";
import { formatDateLong, combineDateTime, minutesBetween } from "../lib/dates";
import { deadlineFor, pickWindowMinutes, fmtCountdown } from "../lib/vacancy";

interface Props {
  groupId: string; // bundleId
  items: Vacancy[];
  settings: Settings;
  selectedIds: string[];
  onToggleSelectMany: (ids: string[]) => void;
  onEdit: (items: Vacancy[]) => void;
  onSplit: (ids: string[]) => void;
  onDeleteMany: (ids: string[]) => void;
  dueNextId: string | null;
}

export default function BundleRow({
  groupId,
  items,
  settings,
  selectedIds,
  onToggleSelectMany,
  onEdit,
  onSplit,
  onDeleteMany,
  dueNextId,
}: Props) {
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDt = combineDateTime(a.shiftDate, a.shiftStart).getTime();
      const bDt = combineDateTime(b.shiftDate, b.shiftStart).getTime();
      return aDt - bDt;
    });
  }, [items]);

  const first = sorted[0];

  // countdown based on first shift only
  const now = Date.now();
  const msLeft = deadlineFor(first, settings).getTime() - now;
  const winMin = pickWindowMinutes(first, settings);
  const sinceKnownMin = minutesBetween(new Date(), new Date(first.knownAt));
  const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
  let cdClass = "cd-green";
  if (msLeft <= 0) cdClass = "cd-red";
  else if (pct < 0.25) cdClass = "cd-yellow";

  const childIds = sorted.map((v) => v.id);
  const allSelected = childIds.every((id) => selectedIds.includes(id));

  const toggleBundle = () => {
    if (allSelected) {
      onToggleSelectMany(childIds.filter((id) => !id.startsWith("__")));
    } else {
      onToggleSelectMany(childIds);
    }
  };

  const [expanded, setExpanded] = useState(false);

  const dateList = sorted
    .map((v) =>
      new Date(v.shiftDate + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    )
    .join(", ");

  const isDueNext = dueNextId ? childIds.includes(dueNextId) : false;

  return (
    <>
      <tr data-bundle-id={groupId} className={isDueNext ? "due-next" : undefined}>
        <td>
          <input
            type="checkbox"
            aria-label="Select bundle"
            checked={allSelected}
            onChange={toggleBundle}
          />
        </td>
        <td colSpan={8}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="btn btn-sm"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? "Collapse" : "Expand"}
              style={{ padding: "2px 6px" }}
            >
              {expanded ? "▾" : "▸"}
            </button>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 600 }}>
                {first.classification} • {first.wing ?? ""}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{dateList}</div>
            </div>
          </div>
        </td>
        <td>
          <div className={`countdown ${cdClass}`} title="Time left for first day">
            {fmtCountdown(msLeft)}
          </div>
        </td>
        <td colSpan={2} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <button className="btn btn-sm" onClick={() => onEdit(items)}>
            Edit
          </button>
          <button className="btn btn-sm" onClick={() => onSplit(childIds)}>
            Split
          </button>
          <button
            className="btn btn-sm danger"
            onClick={() => onDeleteMany(childIds)}
          >
            Delete
          </button>
        </td>
      </tr>
      {expanded &&
        sorted.map((v) => (
          <tr key={v.id} className="bundle-child">
            <td></td>
            <td colSpan={8}>
              {formatDateLong(v.shiftDate)} • {v.shiftStart}-{v.shiftEnd} • {v.wing ?? ""}
            </td>
            <td></td>
            <td colSpan={2}></td>
          </tr>
        ))}
    </>
  );
}

