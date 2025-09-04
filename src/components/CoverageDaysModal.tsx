import React, { useMemo, useState, useEffect } from "react";

type Times = { start: string; end: string };
type Props = {
  open: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  defaultStart: string; // HH:mm
  defaultEnd: string;   // HH:mm
  classification: string; // display only (locked)
  initial?: {
    selectedDates?: string[];
    perDayTimes?: Record<string, Times>;
    perDayWing?: Record<string, string>;
  };
  onSave: (payload: {
    selectedDates: string[];
    perDayTimes: Record<string, Times>;
    perDayWing: Record<string, string>;
  }) => void;
  onClose: () => void;
};

function addDaysISO(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function startOfWeekISO(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay(); // 0 Sun..6 Sat
  d.setDate(d.getDate() - ((day + 6) % 7)); // make Monday start; for Sunday-start use 'day'
  return d.toISOString().slice(0,10);
}
function endOfWeekISO(iso: string) {
  const start = new Date(startOfWeekISO(iso) + "T00:00:00");
  start.setDate(start.getDate() + 6);
  return start.toISOString().slice(0,10);
}
function formatShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function weekdayLabel(i: number) { return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]; }

function BodyScrollLock() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return null;
}

export default function CoverageDaysModal({
  open, startDate, endDate, defaultStart, defaultEnd, classification, initial, onSave, onClose
}: Props) {
  if (!open) return null;

  // Build a week-grid (calendar) that fully covers the range
  const grid = useMemo(() => {
    const start = startOfWeekISO(startDate);
    const end   = endOfWeekISO(endDate);
    const days: string[] = [];
    for (let d = start; d <= end; d = addDaysISO(d, 1)) days.push(d);
    // chunk into weeks of 7
    const weeks: string[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i+7));
    return weeks;
  }, [startDate, endDate]);

  // All in-range dates
  const inRangeSet = useMemo(() => {
    const set = new Set<string>();
    for (let d = startDate; d <= endDate; d = addDaysISO(d, 1)) set.add(d);
    return set;
  }, [startDate, endDate]);

  // Selection + overrides
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    // default: all in range selected
    const seed: Record<string, boolean> = {};
    grid.flat().forEach(d => { seed[d] = inRangeSet.has(d) ? true : false; });
    if (initial?.selectedDates?.length) {
      const chosen = new Set(initial.selectedDates);
      grid.flat().forEach(d => { seed[d] = chosen.has(d); });
    }
    return seed;
  });

  const [perDayTimes, setPerDayTimes] = useState<Record<string, Times>>(() => {
    const t: Record<string, Times> = {};
    grid.flat().forEach(d => {
      t[d] = initial?.perDayTimes?.[d] ?? { start: defaultStart, end: defaultEnd };
    });
    return t;
  });

  const [perDayWing, setPerDayWing] = useState<Record<string, string>>(() => {
    const w: Record<string, string> = {};
    grid.flat().forEach(d => { w[d] = initial?.perDayWing?.[d] ?? ""; });
    return w;
  });

  const toggle = (d: string) => {
    if (!inRangeSet.has(d)) return;
    setSelected(s => ({ ...s, [d]: !s[d] }));
  };

  const selectAll = () => {
    setSelected(s => {
      const next = { ...s };
      grid.flat().forEach(d => { if (inRangeSet.has(d)) next[d] = true; });
      return next;
    });
  };
  const selectNone = () => {
    setSelected(s => {
      const next = { ...s };
      grid.flat().forEach(d => { if (inRangeSet.has(d)) next[d] = false; });
      return next;
    });
  };
  const applyFourOnTwoOff = () => {
    let onCount = 0;
    setSelected(s => {
      const next = { ...s };
      // cadence across the in-range days in chronological order
      const seq: string[] = [];
      for (let d = startDate; d <= endDate; d = addDaysISO(d, 1)) seq.push(d);
      seq.forEach(d => {
        next[d] = onCount < 4;
        onCount = (onCount + 1) % 6;
      });
      return next;
    });
  };

  const save = () => {
    const chosen = grid.flat().filter(d => selected[d] && inRangeSet.has(d));
    onSave({
      selectedDates: chosen,
      perDayTimes: Object.fromEntries(chosen.map(d => [d, perDayTimes[d]])),
      perDayWing:  Object.fromEntries(chosen.map(d => [d, perDayWing[d] ?? ""])),
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <BodyScrollLock />
      <div className="modal">
        <div className="modal-h">Coverage days • Class: {classification}</div>

        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <button className="btn btn-sm" onClick={selectAll}>All</button>
          <button className="btn btn-sm" onClick={selectNone}>None</button>
          <button className="btn btn-sm" onClick={applyFourOnTwoOff}>4-on / 2-off</button>
        </div>

        <div className="calendar">
          {/* Weekday headers */}
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((h) => (
            <div key={h} className="cal-head">{h}</div>
          ))}
          {/* Weeks */}
          {grid.map((week, wi) => week.map((d, di) => {
            const disabled = !inRangeSet.has(d);
            const isSel = !!selected[d] && !disabled;
            return (
              <div
                key={`${wi}-${di}`}
                className={`day ${isSel ? "selected" : ""} ${disabled ? "disabled" : ""}`}
                onClick={() => toggle(d)}
              >
                <div className="day-label">{formatShort(d)}</div>
              </div>
            );
          }))}
        </div>

        {/* Per-day overrides (only selected days) */}
        <div style={{ marginTop: 12, maxHeight: 220, overflow: "auto" }}>
          {grid.flat().filter(d => selected[d] && inRangeSet.has(d)).map(d => (
            <div key={`ovr-${d}`} className="row" style={{ display:"grid", gridTemplateColumns:"160px 100px 100px 1fr", gap:8, alignItems:"center", padding:"4px 0" }}>
              <div>{formatShort(d)}</div>
              <input type="time" value={perDayTimes[d].start} onChange={(e) => setPerDayTimes(t => ({ ...t, [d]: { ...t[d], start: e.target.value } }))} />
              <input type="time" value={perDayTimes[d].end}   onChange={(e) => setPerDayTimes(t => ({ ...t, [d]: { ...t[d], end: e.target.value } }))} />
              <input placeholder="Wing (optional)" value={perDayWing[d] ?? ""} onChange={(e) => setPerDayWing(w => ({ ...w, [d]: e.target.value }))} />
            </div>
          ))}
        </div>

        <div className="modal-f" style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

