import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { formatCoverageSummary, getDatesInRange } from "../../utils/date";
export default function CoverageChip({ startDate, endDate, coverageDates, workingDays, variant = "compact", className = "" }) {
    // For regular vacancies, no chip needed
    if (!startDate || !endDate) {
        return null;
    }
    // For single-day ranges, no chip needed
    const allDates = getDatesInRange(startDate, endDate);
    if (allDates.length <= 1) {
        return null;
    }
    // Use coverageDates or workingDays, whichever is available
    const selectedDates = coverageDates || workingDays || [];
    const summaryText = formatCoverageSummary(selectedDates, allDates);
    if (variant === "compact") {
        return (_jsxs("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 ${className}`, title: `Coverage: ${selectedDates.join(", ")}`, children: ["\uD83D\uDCC5 ", summaryText] }));
    }
    return (_jsxs("div", { className: `inline-flex flex-col ${className}`, children: [_jsx("span", { className: "text-xs font-medium text-blue-800", children: "Coverage" }), _jsx("span", { className: "text-xs text-blue-600", children: summaryText }), selectedDates.length > 0 && selectedDates.length < 10 && (_jsxs("span", { className: "text-xs text-gray-500", children: [selectedDates.slice(0, 5).join(", "), selectedDates.length > 5 && "..."] }))] }));
}
