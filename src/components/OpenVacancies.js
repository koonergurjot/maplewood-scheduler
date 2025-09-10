import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import ConfirmDialog from "./ui/ConfirmDialog";
import Toast from "./ui/Toast";
import { TrashIcon } from "./ui/Icon";
import CoverageChip from "./ui/CoverageChip";
export default function OpenVacancies({ vacancies, vacations = [], stageDelete, undoDelete, staged, readOnly = false, resetBundleKnownAt, }) {
    const [selected, setSelected] = useState([]);
    const [pending, setPending] = useState(null);
    const vacNameById = useMemo(() => {
        const m = {};
        for (const v of vacations)
            m[v.id] = v.employeeName;
        return m;
    }, [vacations]);
    const toggleSelect = (id) => {
        setSelected((ids) => ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);
    };
    const openVacancies = vacancies.filter((v) => v.status !== "Filled" && v.status !== "Awarded");
    const [groupByBundle, setGroupByBundle] = useState(true);
    const [expanded, setExpanded] = useState({});
    const grouped = useMemo(() => {
        if (!groupByBundle)
            return openVacancies.map((v) => [v]);
        const m = new Map();
        for (const v of openVacancies) {
            const key = v.bundleId || v.id;
            const arr = m.get(key) || [];
            arr.push(v);
            m.set(key, arr);
        }
        return Array.from(m.values());
    }, [openVacancies, groupByBundle]);
    const allChecked = openVacancies.length > 0 && selected.length === openVacancies.length;
    const toggleAll = (checked) => {
        setSelected(checked ? openVacancies.map((v) => v.id) : []);
    };
    const confirmDelete = (ids) => {
        setPending(ids);
    };
    const toggleGroup = (ids) => {
        setSelected((prev) => {
            const allSelected = ids.every((id) => prev.includes(id));
            return allSelected
                ? prev.filter((id) => !ids.includes(id))
                : [...prev, ...ids.filter((id) => !prev.includes(id))];
        });
    };
    const handleConfirm = () => {
        if (pending) {
            stageDelete(pending);
            setSelected((ids) => ids.filter((id) => !pending.includes(id)));
            setPending(null);
        }
    };
    const handleCancel = () => setPending(null);
    const singleMessage = (v) => `This will remove the vacancy for ${v.classification} – ${v.shiftDate} ${v.shiftStart}. You can undo within 10 seconds.`;
    return (_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 8 }, children: _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("input", { type: "checkbox", checked: groupByBundle, onChange: () => setGroupByBundle(true) }), "Group by bundle"] }) }), !readOnly && selected.length > 0 && (_jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    border: "1px solid var(--stroke)",
                    padding: 8,
                    borderRadius: 8,
                }, children: [_jsxs("span", { children: [selected.length, " selected"] }), _jsx("button", { className: "btn btn-sm danger", "data-testid": "vacancy-delete-selected", "aria-label": "Delete selected vacancies", tabIndex: 0, onClick: () => confirmDelete(selected), title: "Delete selected vacancies", children: _jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 }, children: [TrashIcon ? (_jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" })) : ("Delete"), _jsx("span", { children: "Delete selected" })] }) })] })), _jsxs("table", { className: "responsive-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: _jsx("input", { type: "checkbox", checked: allChecked, onChange: (e) => toggleAll(e.target.checked), "aria-label": "Select all vacancies" }) }), _jsx("th", { children: "Role" }), _jsx("th", { children: "Covering" }), _jsx("th", { children: "Date" }), _jsx("th", { children: "Time" }), _jsx("th", { style: { textAlign: "right", minWidth: 60 }, children: "Actions" })] }) }), _jsxs("tbody", { children: [grouped.map((group) => {
                                const primary = group[0];
                                const ids = group.map((v) => v.id);
                                const checked = ids.every((id) => selected.includes(id));
                                const sameTime = group.every((v) => v.shiftStart === primary.shiftStart && v.shiftEnd === primary.shiftEnd);
                                if (groupByBundle && group.length > 1 && primary.bundleId) {
                                    const isOpen = expanded[primary.bundleId] || false;
                                    return (_jsxs(_Fragment, { children: [_jsxs("tr", { children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: checked, onChange: () => toggleGroup(ids), "aria-label": `Select bundle ${primary.bundleId}` }) }), _jsx("td", { children: primary.classification }), _jsx("td", { children: vacNameById[primary.vacationId ?? ""] || "—" }), _jsx("td", { children: _jsxs("div", { style: {
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 4,
                                                                flexWrap: "wrap",
                                                            }, children: [_jsx("span", { children: primary.startDate && primary.endDate && primary.startDate !== primary.endDate
                                                                        ? `${primary.startDate}–${primary.endDate}`
                                                                        : primary.shiftDate }), _jsxs("span", { className: "pill", children: [group.length, " days"] }), _jsx(CoverageChip, { startDate: primary.startDate, endDate: primary.endDate, coverageDates: primary.coverageDates })] }) }), _jsx("td", { children: sameTime
                                                            ? `${primary.shiftStart}–${primary.shiftEnd}`
                                                            : "Varies" }), _jsx("td", { style: { textAlign: "right" }, children: !readOnly && (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm", onClick: () => setExpanded((prev) => ({
                                                                        ...prev,
                                                                        [primary.bundleId]: !isOpen,
                                                                    })), children: isOpen ? "Hide" : "Expand" }), resetBundleKnownAt && (_jsx("button", { className: "btn btn-sm", onClick: () => resetBundleKnownAt(primary.bundleId), children: "Reset timers" })), _jsx("button", { className: "btn btn-sm", title: "Delete vacancy", "aria-label": "Delete vacancy", "data-testid": `vacancy-delete-${primary.id}`, tabIndex: 0, onClick: () => confirmDelete(ids), children: TrashIcon ? (_jsxs(_Fragment, { children: [_jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" }), _jsx("span", { className: "sr-only", children: "Delete vacancy" })] })) : ("Delete") })] })) })] }, primary.bundleId), isOpen && (_jsxs("tr", { children: [_jsx("td", {}), _jsx("td", { colSpan: 4, children: _jsx("div", { className: "bundle-expand", children: group.map((v, i) => (_jsxs("div", { style: {
                                                                    display: "flex",
                                                                    gap: 8,
                                                                    padding: "4px 0",
                                                                    borderTop: i === 0 ? undefined : "1px solid var(--stroke)",
                                                                }, children: [_jsx("div", { style: { minWidth: 160 }, children: v.shiftDate }), _jsxs("div", { style: { minWidth: 100 }, children: [v.shiftStart, "\u2013", v.shiftEnd] }), _jsx("div", { style: { minWidth: 100 }, children: v.wing ?? "-" })] }, v.id))) }) })] }, `${primary.bundleId}-exp`))] }));
                                }
                                return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: checked, onChange: () => toggleSelect(primary.id), "aria-label": `Select vacancy ${primary.id}` }) }), _jsx("td", { children: primary.classification }), _jsx("td", { children: vacNameById[primary.vacationId ?? ""] || "—" }), _jsx("td", { children: _jsxs("div", { style: {
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    flexWrap: "wrap",
                                                }, children: [_jsx("span", { children: primary.startDate && primary.endDate && primary.startDate !== primary.endDate
                                                            ? `${primary.startDate}–${primary.endDate}`
                                                            : primary.shiftDate }), _jsx(CoverageChip, { startDate: primary.startDate, endDate: primary.endDate, coverageDates: primary.coverageDates })] }) }), _jsx("td", { children: sameTime
                                                ? `${primary.shiftStart}–${primary.shiftEnd}`
                                                : "Varies" }), _jsx("td", { style: { textAlign: "right" }, children: !readOnly && (_jsx("button", { className: "btn btn-sm", title: "Delete vacancy", "aria-label": "Delete vacancy", "data-testid": `vacancy-delete-${primary.id}`, tabIndex: 0, onClick: () => confirmDelete(ids), children: TrashIcon ? (_jsxs(_Fragment, { children: [_jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" }), _jsx("span", { className: "sr-only", children: "Delete vacancy" })] })) : ("Delete") })) })] }, primary.id));
                            }), grouped.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, style: { textAlign: "center" }, children: "No vacancies" }) }))] })] }), _jsx(ConfirmDialog, { open: !!pending, title: "Delete vacancy?", body: pending && pending.length === 1
                    ? singleMessage(vacancies.find((v) => v.id === pending[0]))
                    : `This will remove ${pending?.length ?? 0} selected vacancies. You can undo within 10 seconds.`, onConfirm: handleConfirm, onCancel: handleCancel }), _jsx(Toast, { open: !!staged, message: staged && staged.length > 1 ? "Vacancies deleted." : "Vacancy deleted.", actionLabel: "Undo", onAction: undoDelete })] }));
}
