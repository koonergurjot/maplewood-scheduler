import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import BodyLock from "./BodyLock";
import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
export default function EmployeePickerModal({ open, employees, classification, onClose, onSelect }) {
    const dialogRef = useRef(null);
    useFocusTrap(dialogRef, onClose);
    const [query, setQuery] = useState("");
    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        return employees
            .filter(e => e.active)
            .filter(e => !classification || e.classification === classification)
            .filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q))
            .sort((a, b) => a.seniorityRank - b.seniorityRank);
    }, [employees, query, classification]);
    if (!open)
        return null;
    return createPortal(_jsxs("div", { className: "modal-overlay", children: [_jsx(BodyLock, {}), _jsxs("div", { role: "dialog", "aria-modal": "true", className: "modal", ref: dialogRef, children: [_jsx("div", { className: "modal-h", children: "Select employee" }), _jsx("input", { autoFocus: true, placeholder: "Search by name\u2026", value: query, onChange: e => setQuery(e.target.value), style: { width: "100%", marginBottom: 8 } }), _jsx("div", { style: { maxHeight: 360, overflow: "auto" }, children: list.map(e => (_jsxs("button", { className: "btn row", onClick: () => onSelect(e.id), children: [e.firstName, " ", e.lastName, " \u2022 ", e.classification, " \u2022 Rank #", e.seniorityRank] }, e.id))) }), _jsx("div", { className: "modal-f", style: { display: "flex", justifyContent: "flex-end", gap: 8 }, children: _jsx("button", { className: "btn", onClick: onClose, children: "Cancel" }) })] })] }), document.body);
}
