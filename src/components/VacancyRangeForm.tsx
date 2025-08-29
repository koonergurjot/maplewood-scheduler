import React, { useMemo, useState } from "react";
import type { VacancyRange, Classification } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (range: VacancyRange) => void;
  defaultClassification?: Classification;
  defaultWing?: string;
};

function enumerateDates(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const d = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  for (; d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0,10));
  }
  return out;
}

export default function VacancyRangeForm({ open, onClose, onSave, defaultClassification, defaultWing }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classification, setClassification] = useState<Classification>(defaultClassification ?? "RCA");
  const [wing, setWing] = useState<string>(defaultWing ?? "");
  const [shiftStart, setShiftStart] = useState("06:30");
  const [shiftEnd, setShiftEnd] = useState("14:30");
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [perDayTimes, setPerDayTimes] = useState<Record<string,{start:string;end:string}>>({});

  const allDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    return enumerateDates(startDate, endDate);
  }, [startDate, endDate]);

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

        {!!allDays.length && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Pick working days in this range</h3>
              <button onClick={applyPresetToAll} className="px-2 py-1 rounded-md border">Apply default time to all picked days</button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto border rounded-md p-2">
              {allDays.map((d: string) => (
                <label key={d} className={"flex items-center gap-2 px-2 py-1 rounded "+(workingDays.includes(d)?"bg-green-50":"")}>
                  <input type="checkbox" checked={workingDays.includes(d)} onChange={()=>toggleDay(d)} />
                  <span className="min-w-[8rem]">{d}</span>
                  <input type="time" value={ (perDayTimes[d]?.start) ?? shiftStart } onChange={e=>updateTime(d,"start",e.target.value)} className="border rounded-md px-1 py-0.5" />
                  <span>—</span>
                  <input type="time" value={ (perDayTimes[d]?.end) ?? shiftEnd } onChange={e=>updateTime(d,"end",e.target.value)} className="border rounded-md px-1 py-0.5" />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={save} className="px-3 py-2 rounded-md bg-black text-white">Save range</button>
        </div>
      </div>
    </div>
  );
}
