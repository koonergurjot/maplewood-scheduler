import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import OfferingControls from "./OfferingControls";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useOfferingRound } from "../offering/useOfferingRound";
// Dummy store placeholder for demo/testing
function useVacancyStore() {
    return {
        updateVacancy: (_id, _patch) => { },
        deleteVacancy: (_id) => { },
        currentUser: "demo-user",
    };
}
export default function VacancyDetail({ vacancy, onDelete, readOnly = false }) {
    const { updateVacancy, deleteVacancy, currentUser } = useVacancyStore();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const round = useOfferingRound(vacancy, (patch) => updateVacancy(vacancy.id, patch), currentUser);
    const handleDelete = () => {
        if (onDelete) {
            onDelete(vacancy.id);
        }
        else {
            deleteVacancy(vacancy.id);
        }
        setShowDeleteConfirm(false);
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }, children: [_jsx("h2", { children: "Vacancy Detail" }), !readOnly && (_jsx("button", { className: "btn danger", onClick: () => setShowDeleteConfirm(true), title: "Delete vacancy permanently", "aria-label": "Delete vacancy", children: "Delete" }))] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("p", { children: [_jsx("strong", { children: "Date:" }), " ", vacancy.shiftDate] }), _jsxs("p", { children: [_jsx("strong", { children: "Time:" }), " ", vacancy.shiftStart, " - ", vacancy.shiftEnd] }), _jsxs("p", { children: [_jsx("strong", { children: "Classification:" }), " ", vacancy.classification] }), _jsxs("p", { children: [_jsx("strong", { children: "Wing:" }), " ", vacancy.wing || 'N/A'] }), _jsxs("p", { children: [_jsx("strong", { children: "Status:" }), " ", vacancy.status] }), _jsxs("p", { children: [_jsx("strong", { children: "Reason:" }), " ", vacancy.reason] })] }), _jsx(OfferingControls, { vacancy: vacancy, round: round }), _jsx(ConfirmDialog, { open: showDeleteConfirm, title: "Delete vacancy?", body: "This action permanently deletes the vacancy. This cannot be undone.", onConfirm: handleDelete, onCancel: () => setShowDeleteConfirm(false) })] }));
}
