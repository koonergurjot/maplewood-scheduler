import React from "react";

interface CoverageChipProps {
  startDate?: string;
  endDate?: string;
  coverageDates?: string[];
  workingDays?: string[];
  className?: string;
}

export default function CoverageChip({
  startDate,
  endDate,
  coverageDates,
  workingDays,
  className = "",
}: CoverageChipProps) {
  if (!startDate || !endDate || startDate === endDate) {
    return null;
  }

  const dates = coverageDates && coverageDates.length > 0 ? coverageDates : workingDays;
  const text =
    dates && dates.length > 0
      ? `Coverage: ${dates.length} days`
      : "Coverage: all days";

  return (
    <span className={`pill ${className}`.trim()} data-testid="coverage-chip">
      {text}
    </span>
  );
}
