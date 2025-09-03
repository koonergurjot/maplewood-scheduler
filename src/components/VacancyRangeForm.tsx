import React, { useMemo, useState } from "react";
import type { VacancyRange, Classification } from "../types";
import CoverageDaysModal from "./CoverageDaysModal";
import { getDatesInRange, formatCoverageSummary } from "../utils/date";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (range: VacancyRange) => void;
  defaultClassification?: Classification;
  defaultWing?: string;
};

// Remove enumerateDates as we now use getDatesInRange from utils

export default function VacancyRangeForm({ open, onClose, onSave, defaultClassification, defaultWing }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classification, setClassification] = useState<Classification>(defaultClassification ?? "RCA");
  const [wing, setWing] = useState<string>(defaultWing ?? "");
  const [shiftStart, setShiftStart] = useState("06:30");
  const [shiftEnd, setShiftEnd] = useState("14:30");
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [perDayTimes, setPerDayTimes] = useState<Record<string,{start:string;end:string}>>({});
  const [showCoverageModal, setShowCoverageModal] = useState(false);

  const allDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    return getDatesInRange(startDate, endDate);
  }, [startDate, endDate]);

  const isMultiDay = allDays.length > 1;

  function toggleDay(iso: string) {
    setWorkingDays(prev => prev.includes(iso) ? prev.filter(d => d !== iso) : [...prev, iso]);
  }

  function applyPresetToAll() {
    const upd: Record<string,{start:string;end:string}> = {};
    for (const d of workingDays) upd[d] = { start: shiftStart, end: shiftEnd };
    setPerDayTimes(upd);
  }

  function updateTime(d: string, field: "start"|"end", value: string) {
    setPerDayTimes(prev => ({ ...prev, [d]: { start: prev[d]?.start ?? shiftStart, end: prev[d]?.end ?? shiftEnd, [field]: value } as any }));
  }

  const handleCoverageDaysChange = (selectedDates: string[]) => {
    setWorkingDays(selectedDates);
    setShowCoverageModal(false);
  };

  // Auto-select all days when dates change and no working days selected
  React.useEffect(() => {
    if (allDays.length > 0 && workingDays.length === 0) {
      setWorkingDays([...allDays]);
    }
  }, [allDays, workingDays.length]);

  function save() {
    if (!startDate || !endDate || workingDays.length === 0) return;
    const now = new Date().toISOString();
    const range: VacancyRange = {
      id: crypto.randomUUID(),
      reason: "Vacation",
      classification,
      wing: wing || undefined,
      startDate,
      endDate,
      knownAt: now,
      workingDays: [...workingDays].sort(),
      perDayTimes,
      shiftStart,
      shiftEnd,
      offeringStep: "Casuals",
      status: "Open",
    };
    onSave(range);
    onClose();
  }

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Create Multi-Day Vacancy</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md border">Close</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Start date</span>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="border rounded-md px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">End date</span>
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="border rounded-md px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Classification</span>
            <select value={classification} onChange={e=>setClassification(e.target.value as Classification)} className="border rounded-md px-2 py-1">
              <option>RCA</option><option>LPN</option><option>RN</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Wing</span>
            <input value={wing} onChange={e=>setWing(e.target.value)} className="border rounded-md px-2 py-1" placeholder="Bluebell / Rosewood / Shamrock" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Default start</span>
            <input type="time" value={shiftStart} onChange={e=>setShiftStart(e.target.value)} className="border rounded-md px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Default end</span>
            <input type="time" value={shiftEnd} onChange={e=>setShiftEnd(e.target.value)} className="border rounded-md px-2 py-1" />
          </label>
        </div>

        {isMultiDay && allDays.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Coverage Days</h3>
              <button 
                onClick={() => setShowCoverageModal(true)}
                className="px-3 py-2 rounded-md border bg-blue-50 hover:bg-blue-100"
              >
                Select Coverage Days
              </button>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-md mb-2">
              <p className="text-sm text-gray-600 mb-1">
                <strong>Coverage Summary:</strong> {formatCoverageSummary(workingDays, allDays)}
              </p>
              {workingDays.length > 0 && (
                <p className="text-xs text-gray-500">
                  Selected days: {workingDays.join(", ")}
                </p>
              )}
            </div>

            {workingDays.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Per-day Time Overrides (Optional)</h4>
                  <button onClick={applyPresetToAll} className="px-2 py-1 text-sm rounded-md border">
                    Apply default time to all days
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-auto border rounded-md p-2">
                  {workingDays.map((d: string) => (
                    <label key={d} className="flex items-center gap-2 px-2 py-1 rounded bg-green-50">
                      <span className="min-w-[8rem] text-sm">{d}</span>
                      <input 
                        type="time" 
                        value={(perDayTimes[d]?.start) ?? shiftStart} 
                        onChange={e=>updateTime(d,"start",e.target.value)} 
                        className="border rounded-md px-1 py-0.5 text-sm" 
                      />
                      <span>—</span>
                      <input 
                        type="time" 
                        value={(perDayTimes[d]?.end) ?? shiftEnd} 
                        onChange={e=>updateTime(d,"end",e.target.value)} 
                        className="border rounded-md px-1 py-0.5 text-sm" 
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md border">Cancel</button>
          <button 
            onClick={save} 
            className="px-3 py-2 rounded-md bg-black text-white"
            disabled={!startDate || !endDate || workingDays.length === 0}
          >
            Save range
          </button>
        </div>

        <CoverageDaysModal
          open={showCoverageModal}
          onClose={() => setShowCoverageModal(false)}
          onSave={handleCoverageDaysChange}
          startDate={startDate}
          endDate={endDate}
          initialSelection={workingDays}
          title="Select Coverage Days"
        />
      </div>
    </div>
  );
}
