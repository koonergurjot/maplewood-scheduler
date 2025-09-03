import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { getDatesInRange, applyPreset, formatCoverageSummary, getDayOfWeekShort } from "../utils/date";
import { formatDateLong } from "../lib/dates";
export default function CoverageDaysModal({ open, onClose, onSave, startDate, endDate, initialSelection = [], title = "Select Coverage Days" }) {
    const [selectedDates, setSelectedDates] = useState([]);
    const modalRef = useRef(null);
    const firstFocusableRef = useRef(null);
    const allDates = getDatesInRange(startDate, endDate);
    const isMultiDay = allDates.length > 1;
    // Initialize selection when modal opens
    useEffect(() => {
        if (open) {
            setSelectedDates(initialSelection.length > 0 ? [...initialSelection] : [...allDates]);
        }
    }, [open, initialSelection, allDates]);
    // Focus management for accessibility
    useEffect(() => {
        if (open && firstFocusableRef.current) {
            firstFocusableRef.current.focus();
        }
    }, [open]);
    // Keyboard shortcuts
    useEffect(() => {
        if (!open)
            return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);
    const toggleDate = (date) => {
        setSelectedDates(prev => prev.includes(date)
            ? prev.filter(d => d !== date)
            : [...prev, date].sort());
    };
    const handlePreset = (pattern) => {
        if (pattern === "clear") {
            setSelectedDates([]);
        }
        else {
            const presetDates = applyPreset(pattern, startDate, endDate);
            setSelectedDates(presetDates);
        }
    };
    const handleSave = () => {
        onSave([...selectedDates]);
        onClose();
    };
    const summaryText = formatCoverageSummary(selectedDates, allDates);
    if (!open)
        return null;
    return (_jsx("div", { className: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "coverage-modal-title", ref: modalRef, style: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
        }, children: _jsxs("div", { style: {
                backgroundColor: "white",
                borderRadius: 8,
                padding: 24,
                maxWidth: 600,
                width: "90%",
                maxHeight: "80vh",
                overflow: "auto",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
            }, children: [_jsx("h2", { id: "coverage-modal-title", style: { marginTop: 0, marginBottom: 16 }, children: title }), _jsx("div", { style: { marginBottom: 16 }, children: _jsxs("p", { children: [_jsx("strong", { children: "Date Range:" }), " ", formatDateLong(startDate), " to ", formatDateLong(endDate), isMultiDay && (_jsxs("span", { style: { marginLeft: 8, fontWeight: "normal" }, children: ["(", allDates.length, " days)"] }))] }) }), isMultiDay && (_jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("h3", { style: { marginBottom: 12 }, children: "Quick Presets" }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsx("button", { ref: firstFocusableRef, className: "btn btn-sm", onClick: () => handlePreset("all"), "aria-label": "Select all days", children: "All days" }), _jsx("button", { className: "btn btn-sm", onClick: () => handlePreset("weekdays"), "aria-label": "Select weekdays only", children: "Weekdays only" }), _jsx("button", { className: "btn btn-sm", onClick: () => handlePreset("4-on-2-off"), "aria-label": "Apply 4 days on, 2 days off pattern", children: "4-on/2-off pattern" }), _jsx("button", { className: "btn btn-sm", onClick: () => handlePreset("5-on-2-off"), "aria-label": "Apply 5 days on, 2 days off pattern", children: "5-on/2-off pattern" }), _jsx("button", { className: "btn btn-sm", onClick: () => handlePreset("clear"), "aria-label": "Clear all selections", children: "Clear selection" })] })] })), _jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("h3", { style: { marginBottom: 12 }, children: "Select Days" }), _jsx("div", { style: {
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                                gap: 8,
                                maxHeight: 300,
                                overflowY: "auto",
                                padding: 8,
                                border: "1px solid #e5e5e5",
                                borderRadius: 4
                            }, children: allDates.map(date => (_jsxs("label", { style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: 8,
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    backgroundColor: selectedDates.includes(date) ? "#f0f9ff" : "transparent",
                                    border: selectedDates.includes(date) ? "1px solid #0ea5e9" : "1px solid transparent"
                                }, onKeyDown: (e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        toggleDate(date);
                                    }
                                }, children: [_jsx("input", { type: "checkbox", checked: selectedDates.includes(date), onChange: () => toggleDate(date), "aria-describedby": `date-${date}-desc` }), _jsxs("span", { children: [_jsx("strong", { children: getDayOfWeekShort(date) }), _jsx("br", {}), _jsx("span", { id: `date-${date}-desc`, style: { fontSize: "0.9em", color: "#666" }, children: formatDateLong(date) })] })] }, date))) })] }), _jsxs("div", { style: {
                        padding: 12,
                        backgroundColor: "#f8f9fa",
                        borderRadius: 4,
                        marginBottom: 20,
                        textAlign: "center"
                    }, "aria-live": "polite", children: [_jsx("strong", { children: "Coverage Summary:" }), " ", summaryText] }), _jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [_jsx("button", { className: "btn", onClick: onClose, "aria-label": "Cancel and close dialog", children: "Cancel" }), _jsx("button", { className: "btn", onClick: handleSave, style: {
                                backgroundColor: "#0ea5e9",
                                color: "white",
                                border: "1px solid #0ea5e9"
                            }, "aria-label": `Save coverage selection: ${summaryText}`, children: "Save Selection" })] })] }) }));
}
