import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { filterAuditLogs, clearAuditLogs, } from "./lib/audit";
import storage from "./lib/storage";
export default function AuditLog() {
    const [date, setDate] = useState("");
    const [vacancyId, setVacancyId] = useState("");
    const [refresh, setRefresh] = useState(0);
    const logs = useMemo(() => filterAuditLogs(storage, {
        date: date || undefined,
        vacancyId: vacancyId || undefined,
    }), [date, vacancyId, refresh]);
    const clear = () => {
        clearAuditLogs(storage);
        setRefresh((r) => r + 1);
    };
    const exportCsv = () => {
        const rows = [
            ["ts", "actor", "vacancyId", "from", "to", "reason", "note"],
            ...logs.map((l) => [
                l.ts,
                l.actor,
                l.targetId,
                l.details.from,
                l.details.to,
                l.details.reason,
                l.details.note ?? "",
            ]),
        ];
        const csv = rows
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "audit-log.csv";
        a.click();
        URL.revokeObjectURL(url);
    };
    return (_jsx("div", { className: "grid", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Audit Log" }), _jsxs("div", { className: "card-c", children: [_jsxs("div", { className: "row", style: { gap: 8, marginBottom: 8 }, children: [_jsx("input", { type: "date", value: date, onChange: (e) => setDate(e.target.value) }), _jsx("input", { placeholder: "Vacancy ID", value: vacancyId, onChange: (e) => setVacancyId(e.target.value) }), _jsx("button", { className: "btn", onClick: exportCsv, children: "Export CSV" }), _jsx("button", { className: "btn", onClick: clear, children: "Clear Logs" })] }), _jsxs("table", { className: "responsive-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Date" }), _jsx("th", { children: "Vacancy" }), _jsx("th", { children: "Actor" }), _jsx("th", { children: "From" }), _jsx("th", { children: "To" }), _jsx("th", { children: "Reason" }), _jsx("th", { children: "Note" })] }) }), _jsxs("tbody", { children: [logs.map((l) => (_jsxs("tr", { children: [_jsx("td", { children: new Date(l.ts).toLocaleString() }), _jsx("td", { children: l.targetId }), _jsx("td", { children: l.actor }), _jsx("td", { children: l.details.from }), _jsx("td", { children: l.details.to }), _jsx("td", { children: l.details.reason }), _jsx("td", { children: l.details.note })] }, l.id))), !logs.length && (_jsx("tr", { children: _jsx("td", { colSpan: 7, style: { textAlign: "center" }, children: "No logs" }) }))] })] })] })] }) }));
}
