import React from "react";
import { formatCoverageSummary, getDatesInRange } from "../../utils/date";

interface CoverageChipProps {
  startDate?: string;
  endDate?: string;
  coverageDates?: string[];
  workingDays?: string[];
  variant?: "compact" | "detailed";
  className?: string;
}

export default function CoverageChip({
  startDate,
  endDate,
  coverageDates,
  workingDays,
  variant = "compact",
  className = ""
}: CoverageChipProps) {
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
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 ${className}`}
        title={`Coverage: ${selectedDates.join(", ")}`}
      >
        📅 {summaryText}
      </span>
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span className="text-xs font-medium text-blue-800">Coverage</span>
      <span className="text-xs text-blue-600">{summaryText}</span>
      {selectedDates.length > 0 && selectedDates.length < 10 && (
        <span className="text-xs text-gray-500">
          {selectedDates.slice(0, 5).join(", ")}
          {selectedDates.length > 5 && "..."}
        </span>
      )}
    </div>
  );
}