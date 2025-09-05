import BodyLock from "../components/BodyLock";
import { useFocusTrap } from "../hooks/useFocusTrap";

import React, { useRef,  useMemo, useState } from "react";

export type Employee = { id: string; name: string; email?: string };
export type VacancyLite = { id: string; date: string; start?: string; end?: string; bundleId?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedVacancyIds: string[];
  allVacancies: VacancyLite[];
  onApply: (opts: {
    vacancyIds: string[];
    employeeIds: string[];
    applyToBundles: boolean;
    overwrite: boolean;
    sameRank: boolean;
    note?: string;
  }) => void;
};

export default function MultiBidModal({
  open, onClose, employees, selectedVacancyIds, allVacancies, onApply
}: Props) {
  const [query, setQuery] = useState("");
  const [pasted, setPasted] = useState("");
  const [chosenIds, setChosenIds] = useState<string[]>([]);
  const [applyToBundles, setApplyToBundles] = useState(true);
  const [overwrite, setOverwrite] = useState(false);
  const [sameRank, setSameRank] = useState(true);
  const [note, setNote] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.email ?? "").toLowerCase().includes(q));
  }, [employees, query]);

  if (!open) return null;

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);

  function toggle(id: string) {
    setChosenIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function addFromPaste() {
    const lines = pasted.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const map = new Map(employees.map(e => [e.name.toLowerCase(), e.id]));
    const map2 = new Map(employees.map(e => [(e.email ?? "").toLowerCase(), e.id]));
    const found: string[] = [];
    for (const line of lines) {
      const key = line.toLowerCase();
      if (map.has(key)) found.push(map.get(key)!);
      else if (map2.has(key)) found.push(map2.get(key)!);
    }
    if (found.length) {
      setChosenIds(prev => Array.from(new Set([...prev, ...found])));
    }
  }

  function submit() {
    onApply({
      vacancyIds: selectedVacancyIds,
      employeeIds: chosenIds,
      applyToBundles,
      overwrite,
      sameRank,
      note: note.trim() || undefined,
    });
    onClose();
  }

  const expandedVacIds = useMemo(() => {
    if (!applyToBundles) return selectedVacancyIds;
    const selectedSet = new Set(selectedVacancyIds);
    const bundleIds = new Set(allVacancies.filter(v => selectedSet.has(v.id) && v.bundleId).map(v => v.bundleId!));
    const vacIds = new Set(selectedVacancyIds);
    for (const v of allVacancies) {
      if (v.bundleId && bundleIds.has(v.bundleId)) vacIds.add(v.id);
    }
    return Array.from(vacIds);
  }, [applyToBundles, selectedVacancyIds, allVacancies]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <BodyLock />
      <div
        role="dialog"
        aria-modal="true"
        className="modal"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Bulk Bid</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md border">Close</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search employees</label>
            <input value={query} onChange={e => setQuery(e.target.value)}
                   className="w-full border rounded-md px-2 py-1" placeholder="Type a name or email" />
            <div className="mt-2 max-h-48 overflow-auto border rounded-md">
              {filtered.map(e => (
                <label key={e.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={chosenIds.includes(e.id)} onChange={() => toggle(e.id)} />
                  <span>{e.name}{e.email ? ` • ${e.email}` : ""}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Paste list (one per line)</label>
            <textarea value={pasted} onChange={e => setPasted(e.target.value)}
                      className="w-full h-32 border rounded-md px-2 py-1" placeholder="Name or email per line"/>
            <button onClick={addFromPaste} className="mt-2 px-3 py-1 rounded-md border">Add from paste</button>

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={applyToBundles} onChange={e => setApplyToBundles(e.target.checked)} />
                <span>Apply to entire bundle(s)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
                <span>Overwrite existing bids on those days</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={sameRank} onChange={e => setSameRank(e.target.checked)} />
                <span>Keep the same rank for all selected employees</span>
              </label>
              <div>
                <label className="block text-sm font-medium mb-1">Note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)}
                       className="w-full border rounded-md px-2 py-1" placeholder="e.g. offsite coverage"/>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <div>Selected days: <b>{selectedVacancyIds.length}</b>{applyToBundles ? ` → Expanded to ${expandedVacIds.length} with bundles` : ""}</div>
          <div>Selected employees: <b>{chosenIds.length}</b></div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded-md border">Cancel</button>
          <button onClick={submit} className="px-3 py-1 rounded-md bg-black text-white disabled:opacity-50"
                  disabled={!chosenIds.length || !selectedVacancyIds.length}>
            Apply Bids
          </button>
        </div>
      </div>
    </div>
  );
}
