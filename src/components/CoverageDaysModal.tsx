import React, { useEffect, useRef } from "react";
import { getDayOfWeekShort } from "../utils/date";

type Preset = "weekdays" | "every-other" | "all" | "none";

interface Props {
  open: boolean;
  onClose: () => void;
  dates: string[];
  selected: Record<string, boolean>;
  onToggle: (iso: string) => void;
  onApplyPreset: (preset: Preset) => void;
}

export default function CoverageDaysModal({
  open,
  onClose,
  dates,
  selected,
  onToggle,
  onApplyPreset,
}: Props) {
  const buttonRefs = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    if (open) {
      buttonRefs.current[0]?.focus();
    }
  }, [open]);

  const handleKeyDown = (idx: number, date: string) => (e: React.KeyboardEvent) => {
    const cols = 7;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      buttonRefs.current[(idx + 1) % dates.length]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      buttonRefs.current[(idx - 1 + dates.length) % dates.length]?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(idx + cols, dates.length - 1);
      buttonRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(idx - cols, 0);
      buttonRefs.current[prev]?.focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onToggle(date);
    }
  };

  if (!open) return null;

  const selectedCount = dates.filter((d) => selected[d]).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Coverage Days</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md border">
            Close
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2 mb-4">
          {dates.map((d, idx) => {
            const date = new Date(d + "T00:00:00");
            const label = `${getDayOfWeekShort(d)} ${date
              .getDate()
              .toString()
              .padStart(2, "0")}`;
            const isSelected = !!selected[d];
            return (
              <button
                key={d}
                ref={(el) => (buttonRefs.current[idx] = el!)}
                data-testid={`date-${d}`}
                className={`px-2 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isSelected ? "bg-blue-600 text-white" : "bg-white"
                }`}
                aria-pressed={isSelected}
                onClick={() => onToggle(d)}
                onKeyDown={handleKeyDown(idx, d)}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="preset-weekdays"
              className="px-2 py-1 rounded-md border text-sm"
              onClick={() => onApplyPreset("weekdays")}
            >
              Weekdays
            </button>
            <button
              data-testid="preset-every-other"
              className="px-2 py-1 rounded-md border text-sm"
              onClick={() => onApplyPreset("every-other")}
            >
              Every Other
            </button>
            <button
              data-testid="preset-all"
              className="px-2 py-1 rounded-md border text-sm"
              onClick={() => onApplyPreset("all")}
            >
              All
            </button>
            <button
              data-testid="preset-none"
              className="px-2 py-1 rounded-md border text-sm"
              onClick={() => onApplyPreset("none")}
            >
              None
            </button>
          </div>
          <p className="text-sm">
            {selectedCount} of {dates.length} selected
          </p>
        </div>

        {selectedCount === 0 && (
          <p className="mt-2 text-sm text-amber-600">
            At least one day recommended for coverage.
          </p>
        )}
      </div>
    </div>
  );
}

