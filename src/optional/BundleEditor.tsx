
import React, { useMemo, useState } from "react";

export type VacancyLite = { id: string; date: string; start?: string; end?: string; bundleId?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  allVacancies: VacancyLite[];
  selectedVacancyIds: string[]; // days you want to attach into the target's bundle
  onAttach: (opts: { targetVacancyId: string; attachIds: string[] }) => void;
};

export default function BundleEditor({ open, onClose, allVacancies, selectedVacancyIds, onAttach }: Props) {
  const [targetId, setTargetId] = useState<string>("");

  const targetOptions = useMemo(() => {
    return allVacancies.map(v => {
      const label = v.bundleId ? `${v.date} (${v.start ?? ""}-${v.end ?? ""}) • bundle ${v.bundleId}`
                               : `${v.date} (${v.start ?? ""}-${v.end ?? ""})`;
      return { id: v.id, label };
    });
  }, [allVacancies]);

  if (!open) return null;

  function submit() {
    const attachIds = selectedVacancyIds.filter(id => id !== targetId);
    if (!targetId || attachIds.length === 0) return;
    onAttach({ targetVacancyId: targetId, attachIds });
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Add Vacancies into Existing Vacancy (Bundle)</h2>
          <button onClick={onClose} className="px-2 py-1 rounded-md border">Close</button>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-gray-700">
            Choose the <b>target vacancy</b>. All the other selected days will be attached into its bundle (creating one if needed).
          </div>

          <label className="block text-sm font-medium">Target vacancy</label>
          <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full border rounded-md px-2 py-1">
            <option value="">Select</option>
            {targetOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>

          <div className="text-sm text-gray-600">
            Selected days to attach: <b>{selectedVacancyIds.length}</b>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded-md border">Cancel</button>
          <button onClick={submit} className="px-3 py-1 rounded-md bg-black text-white" disabled={!targetId || selectedVacancyIds.length < 2}>
            Attach to Bundle
          </button>
        </div>
      </div>
    </div>
  );
}
