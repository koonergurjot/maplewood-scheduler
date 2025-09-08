import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
export default function BundleEditor({ open, onClose, allVacancies, selectedVacancyIds, onAttach }) {
    const [targetId, setTargetId] = useState("");
    const targetOptions = useMemo(() => {
        return allVacancies.map(v => {
            const label = v.bundleId ? `${v.date} (${v.start ?? ""}-${v.end ?? ""}) • bundle ${v.bundleId}`
                : `${v.date} (${v.start ?? ""}-${v.end ?? ""})`;
            return { id: v.id, label };
        });
    }, [allVacancies]);
    if (!open)
        return null;
    function submit() {
        const attachIds = selectedVacancyIds.filter(id => id !== targetId);
        if (!targetId || attachIds.length === 0)
            return;
        onAttach({ targetVacancyId: targetId, attachIds });
        onClose();
    }
    return (_jsx("div", { role: "dialog", "aria-modal": "true", className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-2xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Add Vacancies into Existing Vacancy (Bundle)" }), _jsx("button", { onClick: onClose, className: "px-2 py-1 rounded-md border", children: "Close" })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "text-sm text-gray-700", children: ["Choose the ", _jsx("b", { children: "target vacancy" }), ". All the other selected days will be attached into its bundle (creating one if needed)."] }), _jsx("label", { className: "block text-sm font-medium", children: "Target vacancy" }), _jsxs("select", { value: targetId, onChange: e => setTargetId(e.target.value), className: "w-full border rounded-md px-2 py-1", children: [_jsx("option", { value: "", children: "Select" }), targetOptions.map(opt => (_jsx("option", { value: opt.id, children: opt.label }, opt.id)))] }), _jsxs("div", { className: "text-sm text-gray-600", children: ["Selected days to attach: ", _jsx("b", { children: selectedVacancyIds.length })] })] }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { onClick: onClose, className: "px-3 py-1 rounded-md border", children: "Cancel" }), _jsx("button", { onClick: submit, className: "px-3 py-1 rounded-md bg-black text-white", disabled: !targetId || selectedVacancyIds.length < 2, children: "Attach to Bundle" })] })] }) }));
}
