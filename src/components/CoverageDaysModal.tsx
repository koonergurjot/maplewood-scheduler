import React, { useEffect, useState } from "react";
import { getDayOfWeekShort } from "../utils/date";

type Preset = "four-two" | "custom";

type Result = {
  selectedDates: string[];
  perDayTimes: Record<string, { start: string; end: string }>;
  perDayWings: Record<string, string>;
};

interface Props {
  open: boolean;
  onClose: () => void;
  dates: string[];
  defaultShiftStart: string;
  defaultShiftEnd: string;
  defaultWing: string;
  initialSelected: string[];
  initialTimes: Record<string, { start: string; end: string }>;
  initialWings: Record<string, string>;
  onSave: (res: Result) => void;
}

export default function CoverageDaysModal({
  open,
  onClose,
  dates,
  defaultShiftStart,
  defaultShiftEnd,
  defaultWing,
  initialSelected,
  initialTimes,
  initialWings,
  onSave,
}: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [times, setTimes] = useState<Record<string, { start: string; end: string }>>({});
  const [wings, setWings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const init = initialSelected.length > 0 ? initialSelected : dates;
      setSelected(Object.fromEntries(dates.map((d) => [d, init.includes(d)])));
      setTimes(initialTimes || {});
      setWings(initialWings || {});
    }
  }, [open, dates, initialSelected, initialTimes, initialWings]);

  if (!open) return null;

  const toggle = (d: string) => {
    setSelected((prev) => ({ ...prev, [d]: !prev[d] }));
  };

  const updateTime = (d: string, field: "start" | "end", value: string) => {
    setTimes((prev) => ({
      ...prev,
      [d]: { start: prev[d]?.start ?? defaultShiftStart, end: prev[d]?.end ?? defaultShiftEnd, [field]: value } as any,
    }));
  };

  const updateWing = (d: string, value: string) => {
    setWings((prev) => ({ ...prev, [d]: value }));
  };

  const applyPreset = (preset: Preset) => {
    const next: Record<string, boolean> = {};
    if (preset === "four-two") {
      dates.forEach((d, idx) => {
        next[d] = idx % 6 < 4;
      });
    } else {
      dates.forEach((d) => {
        next[d] = true;
      });
    }
    setSelected(next);
  };

  const handleSave = () => {
    const selectedDates = dates.filter((d) => selected[d]);
    const filteredTimes: Record<string, { start: string; end: string }> = {};
    const filteredWings: Record<string, string> = {};
    for (const d of selectedDates) {
      const t = times[d];
      if (t && (t.start !== defaultShiftStart || t.end !== defaultShiftEnd)) {
        filteredTimes[d] = t;
      }
      const w = wings[d];
      if (w && w !== defaultWing) {
        filteredWings[d] = w;
      }
    }
    onSave({ selectedDates, perDayTimes: filteredTimes, perDayWings: filteredWings });
  };

  const selectedCount = dates.filter((d) => selected[d]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Coverage Days</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md border">
            Close
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex gap-2">
            <button
              className="px-2 py-1 rounded-md border text-sm"
              onClick={() => applyPreset("four-two")}
            >
              4-on/2-off
            </button>
            <button
              className="px-2 py-1 rounded-md border text-sm"
              onClick={() => applyPreset("custom")}
            >
              Custom
            </button>
          </div>
          <p className="text-sm">
            {selectedCount} of {dates.length} selected
          </p>
        </div>

        <div className="flex flex-col gap-2 max-h-64 overflow-auto mb-4">
          {dates.map((d) => {
            const isSelected = !!selected[d];
            const date = new Date(d + "T00:00:00");
            const label = `${getDayOfWeekShort(d)} ${date
              .getDate()
              .toString()
              .padStart(2, "0")}`;
            return (
              <label key={d} className="flex items-center gap-2">
                <input type="checkbox" checked={isSelected} onChange={() => toggle(d)} />
                <span className="w-28 text-sm">{label}</span>
                <input
                  type="time"
                  value={times[d]?.start ?? defaultShiftStart}
                  onChange={(e) => updateTime(d, "start", e.target.value)}
                  disabled={!isSelected}
                  className="border rounded-md px-1 py-0.5 text-sm"
                />
                <span>—</span>
                <input
                  type="time"
                  value={times[d]?.end ?? defaultShiftEnd}
                  onChange={(e) => updateTime(d, "end", e.target.value)}
                  disabled={!isSelected}
                  className="border rounded-md px-1 py-0.5 text-sm"
                />
                <input
                  type="text"
                  value={wings[d] ?? ""}
                  onChange={(e) => updateWing(d, e.target.value)}
                  disabled={!isSelected}
                  className="border rounded-md px-1 py-0.5 text-sm w-24"
                  placeholder="Wing"
                />
              </label>
            );
          })}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md border">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-2 rounded-md bg-black text-white"
            disabled={selectedCount === 0}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

