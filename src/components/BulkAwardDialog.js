import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { OVERRIDE_REASONS } from "../types";
import { logBulkAward } from "../utils/logger";
export default function BulkAwardDialog({ open, employees, vacancies, bids, onConfirm, onClose }) {
    const [empId, setEmpId] = useState("");
    const [message, setMessage] = useState("");
    const [reason, setReason] = useState("");
    const [overrideChecked, setOverrideChecked] = useState(false);
    const [error, setError] = useState(null);
    const selectedEmployee = useMemo(() => { var _a; return (_a = employees.find((e) => e.id === empId)) !== null && _a !== void 0 ? _a : null; }, [employees, empId]);
    const missingBundleDays = useMemo(() => {
        if (!empId || !vacancies.length)
            return [];
        if (!vacancies.some((v) => v.bundleId))
            return [];
        const employeeBidVacancies = new Set(
        bids
            .filter((b) => {
            const bidderId = b.bidderEmployeeId || b.employeeId;
            return bidderId === empId;
        })
            .map((b) => b.vacancyId));
        const groups = new Map();
        for (const vacancy of vacancies) {
            const bundleKey = vacancy.bundleId;
            if (!bundleKey)
                continue;
            if (employeeBidVacancies.has(vacancy.id))
                continue;
            if (!groups.has(bundleKey)) {
                groups.set(bundleKey, {
                    bundleId: bundleKey,
                    dates: new Set(),
                });
            }
            if (vacancy.shiftDate) {
                groups.get(bundleKey).dates.add(vacancy.shiftDate);
            }
        }
        return Array.from(groups.values())
            .map((group) => ({
            bundleId: group.bundleId,
            dates: Array.from(group.dates).sort(),
        }))
            .filter((group) => group.dates.length > 0);
    }, [bids, empId, vacancies]);
    useEffect(() => {
        if (!missingBundleDays.length) {
            setOverrideChecked(false);
        }
    }, [missingBundleDays.length]);
    useEffect(() => {
        setOverrideChecked(false);
    }, [empId]);
    useEffect(() => {
        setError(null);
    }, [empId, reason, message, overrideChecked, missingBundleDays.length]);
    useEffect(() => {
        if (!open) {
            setEmpId("");
            setMessage("");
            setReason("");
            setOverrideChecked(false);
            setError(null);
        }
    }, [open]);
    const confirm = async () => {
        if (!empId)
            return;
        if (missingBundleDays.length && !overrideChecked) {
            setError("Override required to award bundled days without matching bids.");
            return;
        }
        if (overrideChecked && !reason) {
            setError("Please select an override reason.");
            return;
        }
        const payload = {
            empId: empId || undefined,
            reason: reason || undefined,
            overrideUsed: overrideChecked,
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
        setOverrideChecked(false);
    };
    if (!open)
        return null;
    return (_jsxs("div", { role: "alertdialog", "aria-modal": "true", className: "modal", children: [_jsx("h3", { children: "Bulk Award Vacancies" }), _jsxs("label", { children: ["Employee", _jsxs("select", { value: empId, onChange: (e) => setEmpId(e.target.value), children: [_jsx("option", { value: "", children: "Select employee…" }), employees.map((e) => (_jsxs("option", { value: e.id, children: [e.firstName, " ", e.lastName] }, e.id)))] })] }), _jsxs("label", { children: ["Message (optional)", _jsx("textarea", { value: message, onChange: (e) => setMessage(e.target.value) })] }), _jsxs("label", { children: ["Override reason", _jsxs("select", { value: reason, onChange: (e) => setReason(e.target.value), children: [_jsx("option", { value: "", children: "None" }), OVERRIDE_REASONS.map((r) => (_jsx("option", { value: r, children: r }, r)))] })] }), missingBundleDays.length > 0 && selectedEmployee && (_jsxs("div", { role: "alert", style: {
                backgroundColor: "#fff3cd",
                border: "1px solid #ffe69c",
                borderRadius: 4,
                color: "#664d03",
                marginTop: 12,
                padding: 12,
            }, children: [_jsxs("p", { style: { margin: "0 0 8px" }, children: [selectedEmployee.firstName, " ", selectedEmployee.lastName, " has no bid for the following bundle dates:"] }), _jsx("ul", { style: { margin: 0, paddingLeft: 18 }, children: missingBundleDays.map((group) => (_jsxs("li", { children: ["Bundle ", group.bundleId, ": ", group.dates.join(", ")] }, group.bundleId))) }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 }, children: [_jsx("input", { type: "checkbox", checked: overrideChecked, onChange: (e) => setOverrideChecked(e.target.checked) }), "Override and award without matching bids"] }), overrideChecked && (_jsx("p", { style: { margin: "8px 0 0" }, children: "An override reason is required to continue." }))] })), _jsxs("div", { style: { marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }, children: [_jsx("button", { className: "btn", onClick: onClose, children: "Cancel" }), _jsx("button", { className: "btn", onClick: confirm, disabled: !empId, children: "Confirm" })] }), error && (_jsx("div", { role: "alert", style: { color: "red", marginTop: 8 }, children: error }))] }));
}
