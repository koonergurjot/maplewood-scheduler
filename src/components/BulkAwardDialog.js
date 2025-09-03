import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { OVERRIDE_REASONS } from "../types";
import { logBulkAward } from "../utils/logger";
export default function BulkAwardDialog({ open, employees, vacancies, onConfirm, onClose }) {
    const [empId, setEmpId] = useState("");
    const [message, setMessage] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState(null);
    if (!open)
        return null;
    const confirm = async () => {
        const payload = {
            empId: empId || undefined,
            reason: reason || undefined,
            overrideUsed: !!reason,
            message: message || undefined,
        };
        onConfirm(payload);
        try {
            await logBulkAward({
                vacancyIds: vacancies.map((v) => v.id),
                employeeId: payload.empId,
                reason: payload.reason,
            });
            setError(null);
        }
        catch (err) {
            setError(err.message || "Failed to log bulk award");
        }
        setEmpId("");
        setMessage("");
        setReason("");
    };
    return (_jsxs("div", { role: "alertdialog", "aria-modal": "true", className: "modal", children: [_jsx("h3", { children: "Bulk Award Vacancies" }), _jsxs("label", { children: ["Employee", _jsxs("select", { value: empId, onChange: (e) => setEmpId(e.target.value), children: [_jsx("option", { value: "", children: "Select employee\u2026" }), employees.map((e) => (_jsxs("option", { value: e.id, children: [e.firstName, " ", e.lastName] }, e.id)))] })] }), _jsxs("label", { children: ["Message (optional)", _jsx("textarea", { value: message, onChange: (e) => setMessage(e.target.value) })] }), _jsxs("label", { children: ["Override reason", _jsxs("select", { value: reason, onChange: (e) => setReason(e.target.value), children: [_jsx("option", { value: "", children: "None" }), OVERRIDE_REASONS.map((r) => (_jsx("option", { value: r, children: r }, r)))] })] }), _jsxs("div", { style: { marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }, children: [_jsx("button", { className: "btn", onClick: onClose, children: "Cancel" }), _jsx("button", { className: "btn", onClick: confirm, disabled: !empId, children: "Confirm" })] }), error && (_jsx("div", { role: "alert", style: { color: "red", marginTop: 8 }, children: error }))] }));
}
