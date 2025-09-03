import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
export default function MultiBidModal({ open, onClose, employees, selectedVacancyIds, allVacancies, onApply }) {
    const [query, setQuery] = useState("");
    const [pasted, setPasted] = useState("");
    const [chosenIds, setChosenIds] = useState([]);
    const [applyToBundles, setApplyToBundles] = useState(true);
    const [overwrite, setOverwrite] = useState(false);
    const [sameRank, setSameRank] = useState(true);
    const [note, setNote] = useState("");
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q)
            return employees;
        return employees.filter(e => e.name.toLowerCase().includes(q) ||
            (e.email ?? "").toLowerCase().includes(q));
    }, [employees, query]);
    if (!open)
        return null;
    function toggle(id) {
        setChosenIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
    function addFromPaste() {
        const lines = pasted.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const map = new Map(employees.map(e => [e.name.toLowerCase(), e.id]));
        const map2 = new Map(employees.map(e => [(e.email ?? "").toLowerCase(), e.id]));
        const found = [];
        for (const line of lines) {
            const key = line.toLowerCase();
            if (map.has(key))
                found.push(map.get(key));
            else if (map2.has(key))
                found.push(map2.get(key));
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
        if (!applyToBundles)
            return selectedVacancyIds;
        const selectedSet = new Set(selectedVacancyIds);
        const bundleIds = new Set(allVacancies.filter(v => selectedSet.has(v.id) && v.bundleId).map(v => v.bundleId));
        const vacIds = new Set(selectedVacancyIds);
        for (const v of allVacancies) {
            if (v.bundleId && bundleIds.has(v.bundleId))
                vacIds.add(v.id);
        }
        return Array.from(vacIds);
    }, [applyToBundles, selectedVacancyIds, allVacancies]);
    return (_jsx("div", { role: "dialog", "aria-modal": "true", className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-3xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Bulk Bid" }), _jsx("button", { onClick: onClose, className: "px-2 py-1 rounded-md border", children: "Close" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Search employees" }), _jsx("input", { value: query, onChange: e => setQuery(e.target.value), className: "w-full border rounded-md px-2 py-1", placeholder: "Type a name or email" }), _jsx("div", { className: "mt-2 max-h-48 overflow-auto border rounded-md", children: filtered.map(e => (_jsxs("label", { className: "flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: chosenIds.includes(e.id), onChange: () => toggle(e.id) }), _jsxs("span", { children: [e.name, e.email ? ` • ${e.email}` : ""] })] }, e.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Paste list (one per line)" }), _jsx("textarea", { value: pasted, onChange: e => setPasted(e.target.value), className: "w-full h-32 border rounded-md px-2 py-1", placeholder: "Name or email per line" }), _jsx("button", { onClick: addFromPaste, className: "mt-2 px-3 py-1 rounded-md border", children: "Add from paste" }), _jsxs("div", { className: "mt-4 space-y-2", children: [_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: applyToBundles, onChange: e => setApplyToBundles(e.target.checked) }), _jsx("span", { children: "Apply to entire bundle(s)" })] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: overwrite, onChange: e => setOverwrite(e.target.checked) }), _jsx("span", { children: "Overwrite existing bids on those days" })] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: sameRank, onChange: e => setSameRank(e.target.checked) }), _jsx("span", { children: "Keep the same rank for all selected employees" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-1", children: "Note (optional)" }), _jsx("input", { value: note, onChange: e => setNote(e.target.value), className: "w-full border rounded-md px-2 py-1", placeholder: "e.g. offsite coverage" })] })] })] })] }), _jsxs("div", { className: "mt-4 text-sm text-gray-600", children: [_jsxs("div", { children: ["Selected days: ", _jsx("b", { children: selectedVacancyIds.length }), applyToBundles ? ` → Expanded to ${expandedVacIds.length} with bundles` : ""] }), _jsxs("div", { children: ["Selected employees: ", _jsx("b", { children: chosenIds.length })] })] }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { onClick: onClose, className: "px-3 py-1 rounded-md border", children: "Cancel" }), _jsx("button", { onClick: submit, className: "px-3 py-1 rounded-md bg-black text-white disabled:opacity-50", disabled: !chosenIds.length || !selectedVacancyIds.length, children: "Apply Bids" })] })] }) }));
}
