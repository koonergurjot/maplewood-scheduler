import React, { useEffect, useRef, useState } from "react";
import {
  datesInRange,
  isWeekday,
  applyPattern4on2off,
  applyPattern5on2off,
} from "../../utils/date";

export type CoverageDaysModalProps = {
  open: boolean;
  role: string;
  startDate: string;
  endDate: string;
  initialSelected?: string[];
  onClose: () => void;
  onSave: (selectedISO: string[]) => void;
};

export default function CoverageDaysModal({
  open,
  role,
  startDate,
  endDate,
  initialSelected,
  onClose,
  onSave,
}: CoverageDaysModalProps) {
  const all = datesInRange(startDate, endDate);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const init = initialSelected && initialSelected.length ? initialSelected : all;
    setSelected(new Set(init));
    setError(null);
  }, [open, initialSelected, startDate, endDate]);

  useEffect(() => {
    if (open && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [open]);

  const toggle = (iso: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  const applyPreset = (preset: string) => {
    let picks: string[] = [];
    if (preset === "every") picks = all;
    if (preset === "weekdays") picks = all.filter(isWeekday);
    if (preset === "4on2off") picks = applyPattern4on2off(all);
    if (preset === "5on2off") picks = applyPattern5on2off(all);
    if (preset === "clear") picks = [];
    setSelected(new Set(picks));
  };

  const handleSave = () => {
    if (selected.size === 0) {
      setError("Select at least one coverage day.");
      return;
    }
    onSave(Array.from(selected).sort());
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
      data-testid="coverage-days-modal"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-auto p-4 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          Coverage days for {role} – {startDate} → {endDate}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            ref={firstButtonRef}
            className="btn btn-sm"
            onClick={() => applyPreset("every")}
            data-testid="preset-every"
          >
            Every day
          </button>
          <button
            className="btn btn-sm"
            onClick={() => applyPreset("weekdays")}
            data-testid="preset-weekdays"
          >
            Weekdays only
          </button>
          <button
            className="btn btn-sm"
            onClick={() => applyPreset("4on2off")}
            data-testid="preset-4on2off"
          >
            4-on/2-off
          </button>
          <button
            className="btn btn-sm"
            onClick={() => applyPreset("5on2off")}
            data-testid="preset-5on2off"
          >
            5-on/2-off
          </button>
          <button
            className="btn btn-sm"
            onClick={() => applyPreset("clear")}
            data-testid="preset-clear"
          >
            Clear all
          </button>
        </div>
        {error && (
          <div className="bg-red-100 text-red-800 p-2 rounded" data-testid="coverage-error">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-auto border rounded-md divide-y">
          {all.map((iso) => (
            <label
              key={iso}
              className="flex items-center gap-2 px-2 py-1"
              data-testid={`coverage-date-${iso}`}
            >
              <input
                type="checkbox"
                checked={selected.has(iso)}
                onChange={() => toggle(iso)}
              />
              <span className="flex-1">
                {new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
            data-testid="coverage-save"
          >
            Save coverage days
          </button>
        </div>
      </div>
    </div>
  );
}
