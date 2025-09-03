import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
export default function RangeBidDialog({ open, onClose, range, employees, onSubmit }) {
    const [employeeId, setEmployeeId] = useState("");
    const [note, setNote] = useState("");
    const [coverageType, setCoverageType] = useState("full");
    const [selectedDays, setSelectedDays] = useState(range.workingDays ?? []);
    const empOpts = useMemo(() => employees.filter(e => e.active).sort((a, b) => a.seniorityRank - b.seniorityRank), [employees]);
    function toggleDay(d) {
        setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
    }
    function submit() {
        if (!employeeId)
            return;
        const e = employees.find(x => x.id === employeeId);
        const bid = {
            vacancyId: range.id,
            bidderEmployeeId: employeeId,
            bidderName: (e?.firstName ?? "") + " " + (e?.lastName ?? ""),
            bidderStatus: (e?.status),
            bidderClassification: (e?.classification),
            bidTimestamp: new Date().toISOString(),
            notes: note || undefined,
            coverageType,
            selectedDays: coverageType === "full" ? [...(range.workingDays ?? [])] : [...selectedDays],
        };
        onSubmit(bid);
        onClose();
    }
    if (!open)
        return null;
    return (_jsx("div", { role: "dialog", "aria-modal": "true", className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-2xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Enter Bid for Multi\u2011day Vacancy" }), _jsx("button", { onClick: onClose, className: "px-2 py-1 rounded-md border", children: "Close" })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Bidder" }), _jsxs("select", { value: employeeId, onChange: e => setEmployeeId(e.target.value), className: "border rounded-md px-2 py-1", children: [_jsx("option", { value: "", children: "Select employee\u2026" }), empOpts.map(e => _jsxs("option", { value: e.id, children: [e.seniorityRank, ". ", e.lastName, ", ", e.firstName, " \u2014 ", e.classification] }, e.id))] })] }), _jsxs("fieldset", { className: "border rounded-md p-2", children: [_jsx("legend", { className: "px-1 text-sm", children: "Coverage" }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "radio", checked: coverageType === "full", onChange: () => setCoverageType("full") }), _jsx("span", { children: "Entire vacancy (all working days)" })] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "radio", checked: coverageType === "some-days", onChange: () => setCoverageType("some-days") }), _jsx("span", { children: "Some days only" })] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "radio", checked: coverageType === "partial-day", onChange: () => setCoverageType("partial-day") }), _jsx("span", { children: "Partial-day (time differs on specific day)" })] }), (coverageType !== "full") && (_jsx("div", { className: "mt-2 max-h-48 overflow-auto border rounded p-2", children: (range.workingDays ?? []).map((d) => (_jsxs("label", { className: "flex items-center gap-2 py-0.5", children: [_jsx("input", { type: "checkbox", checked: selectedDays.includes(d), onChange: () => toggleDay(d) }), _jsx("span", { children: d })] }, d))) }))] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Notes" }), _jsx("textarea", { value: note, onChange: e => setNote(e.target.value), className: "border rounded-md px-2 py-1", rows: 3, placeholder: "Add context (e.g., availability, restrictions)" })] })] }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { onClick: onClose, className: "px-3 py-2 rounded-md border", children: "Cancel" }), _jsx("button", { onClick: submit, className: "px-3 py-2 rounded-md bg-black text-white", children: "Submit bid" })] })] }) }));
}
