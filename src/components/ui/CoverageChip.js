import { jsx as _jsx } from "react/jsx-runtime";
export default function CoverageChip({ startDate, endDate, coverageDates, workingDays, className = "", }) {
    if (!startDate || !endDate || startDate === endDate) {
        return null;
    }
    const dates = coverageDates && coverageDates.length > 0 ? coverageDates : workingDays;
    const text = dates && dates.length > 0
        ? `Coverage: ${dates.length} days`
        : "Coverage: all days";
    return (_jsx("span", { className: `pill ${className}`.trim(), "data-testid": "coverage-chip", children: text }));
}
