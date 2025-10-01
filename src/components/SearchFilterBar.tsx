import { ChangeEvent } from "react";
import { CLASSIFICATIONS } from "../types";
import type { Classification } from "../types";

type BundleMode = "all" | "bundles" | "singles";

interface Props {
  query: string;
  startDate: string;
  endDate: string;
  category: Classification | "";
  bundleMode: BundleMode;
  onQueryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCategoryChange: (value: Classification | "") => void;
  onBundleModeChange: (value: BundleMode) => void;
  onClear?: () => void;
}

export default function SearchFilterBar({
  query,
  startDate,
  endDate,
  category,
  bundleMode,
  onQueryChange,
  onStartDateChange,
  onEndDateChange,
  onCategoryChange,
  onBundleModeChange,
  onClear,
}: Props) {
  const clear = () => {
    onQueryChange("");
    onStartDateChange("");
    onEndDateChange("");
    onCategoryChange("");
    onBundleModeChange("all");
    onClear?.();
  };

  const toggleClassification = (value: Classification) => {
    if (category === value) {
      onCategoryChange("");
    } else {
      onCategoryChange(value);
    }
  };

  const toggleBundleMode = (value: BundleMode) => {
    if (value === "all") {
      onBundleModeChange("all");
      return;
    }
    if (bundleMode === value) {
      onBundleModeChange("all");
    } else {
      onBundleModeChange(value);
    }
  };

  const activeFilters: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (query.trim()) {
    activeFilters.push({ key: "search", label: `Search: “${query.trim()}”`, onRemove: () => onQueryChange("") });
  }
  if (category) {
    activeFilters.push({ key: "category", label: `Class: ${category}`, onRemove: () => onCategoryChange("") });
  }
  if (startDate || endDate) {
    const startLabel = startDate || "Any";
    const endLabel = endDate || "Any";
    activeFilters.push({
      key: "dates",
      label: `Dates: ${startLabel} → ${endLabel}`,
      onRemove: () => {
        onStartDateChange("");
        onEndDateChange("");
      },
    });
  }
  if (bundleMode !== "all") {
    activeFilters.push({
      key: "bundle",
      label: bundleMode === "bundles" ? "Bundles only" : "Singles only",
      onRemove: () => onBundleModeChange("all"),
    });
  }

  return (
    <div className="toolbar smart-filter-bar search-filter-bar">
      <div style={{ minWidth: 180, flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="chip-group" aria-label="Classification filters">
        {CLASSIFICATIONS.map((c) => (
          <button
            key={c}
            type="button"
            className="pill pill-toggle"
            data-active={category === c}
            aria-pressed={category === c}
            onClick={() => toggleClassification(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="date-range" aria-label="Date range filters">
        <input
          type="date"
          value={startDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onStartDateChange(e.target.value)}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onEndDateChange(e.target.value)}
        />
      </div>
      <div className="chip-group" aria-label="Bundle filters">
        <button
          type="button"
          className="pill pill-toggle"
          data-active={bundleMode === "all"}
          aria-pressed={bundleMode === "all"}
          onClick={() => toggleBundleMode("all")}
        >
          All
        </button>
        <button
          type="button"
          className="pill pill-toggle"
          data-active={bundleMode === "bundles"}
          aria-pressed={bundleMode === "bundles"}
          onClick={() => toggleBundleMode("bundles")}
        >
          Bundles only
        </button>
        <button
          type="button"
          className="pill pill-toggle"
          data-active={bundleMode === "singles"}
          aria-pressed={bundleMode === "singles"}
          onClick={() => toggleBundleMode("singles")}
        >
          Singles only
        </button>
      </div>
      <button className="btn" onClick={clear} type="button">
        Clear
      </button>
      {activeFilters.length > 0 && (
        <div className="active-filter-chips">
          {activeFilters.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="pill active-filter-chip"
              onClick={chip.onRemove}
              aria-label={`Remove ${chip.label}`}
            >
              <span>{chip.label}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

