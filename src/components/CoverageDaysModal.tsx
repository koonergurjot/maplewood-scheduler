import React, { useMemo, useState } from "react";

type Times = { start: string; end: string };
type Props = {
  open: boolean;
  startDate: string;
  endDate: string;
  defaultStart: string;
  defaultEnd: string;
  classification: string;
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

function isoDatesInclusive(a: string, b: string): string[] {
  const out: string[] = [];
  const start = new Date(a + "T00:00:00");
  const end = new Date(b + "T00:00:00");
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

function formatShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
}

export default function CoverageDaysModal({
  open,
  startDate,
  endDate,
  defaultStart,
  defaultEnd,
  classification,
  initial,
  onSave,
  onClose,
}: Props) {
  const allDates = useMemo(() => isoDatesInclusive(startDate, endDate), [startDate, endDate]);
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init = Object.fromEntries(allDates.map((d) => [d, true]));
    if (initial?.selectedDates?.length) {
      allDates.forEach((d) => {
        init[d] = initial.selectedDates!.includes(d);
      });
    }
    return init;
  });
  const [perDayTimes, setPerDayTimes] = useState<Record<string, Times>>(() => {
    const init: Record<string, Times> = {};
    allDates.forEach((d) => {
      init[d] = initial?.perDayTimes?.[d] ?? { start: defaultStart, end: defaultEnd };
    });
    return init;
  });
  const [perDayWing, setPerDayWing] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    allDates.forEach((d) => {
      init[d] = initial?.perDayWing?.[d] ?? "";
    });
    return init;
  });

  if (!open) return null;

  const applyFourOnTwoOff = () => {
    const next: Record<string, boolean> = {};
    let onCount = 0;
    for (let i = 0; i < allDates.length; i++) {
      const d = allDates[i];
      next[d] = onCount < 4;
      onCount = (onCount + 1) % 6;
    }
    setSelected(next);
  };

  const save = () => {
    const chosen = allDates.filter((d) => selected[d]);
    onSave({
      selectedDates: chosen,
      perDayTimes: Object.fromEntries(chosen.map((d) => [d, perDayTimes[d]])),
      perDayWing: Object.fromEntries(chosen.map((d) => [d, perDayWing[d] ?? ""])),
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-h">Coverage days • Class: {classification}</div>
        <div className="modal-c" style={{ maxHeight: 420, overflow: "auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              className="btn btn-sm"
              onClick={() =>
                setSelected(Object.fromEntries(allDates.map((d) => [d, true])))
              }
            >
              All
            </button>
            <button
              className="btn btn-sm"
              onClick={() =>
                setSelected(Object.fromEntries(allDates.map((d) => [d, false])))
              }
            >
              None
            </button>
            <button className="btn btn-sm" onClick={applyFourOnTwoOff}>
              4-on / 2-off
            </button>
            <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 6 }}>
              Toggle dates; times & wing per day are optional.
            </span>
          </div>

          {allDates.map((d) => (
            <div
              key={d}
              className="row"
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto auto",
                gap: 8,
                alignItems: "center",
                padding: "4px 0",
              }}
            >
              <input
                type="checkbox"
                checked={!!selected[d]}
                onChange={(e) =>
                  setSelected((s) => ({ ...s, [d]: e.target.checked }))
                }
                aria-label={`Include ${d}`}
              />
              <div style={{ minWidth: 160 }}>{formatShort(d)}</div>
              <input
                type="time"
                value={perDayTimes[d].start}
                onChange={(e) =>
                  setPerDayTimes((t) => ({
                    ...t,
                    [d]: { ...t[d], start: e.target.value },
                  }))
                }
              />
              <input
                type="time"
                value={perDayTimes[d].end}
                onChange={(e) =>
                  setPerDayTimes((t) => ({
                    ...t,
                    [d]: { ...t[d], end: e.target.value },
                  }))
                }
              />
              <input
                placeholder="Wing (optional)"
                value={perDayWing[d] ?? ""}
                onChange={(e) =>
                  setPerDayWing((w) => ({ ...w, [d]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div
          className="modal-f"
          style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
        >
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

