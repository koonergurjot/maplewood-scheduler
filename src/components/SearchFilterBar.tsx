import { ChangeEvent } from "react";
import { CLASSIFICATIONS, WINGS, SHIFT_PRESETS } from "../types";
import type { Classification } from "../types";

type BundleMode = "all" | "bundles" | "singles";

interface Props {
  query: string;
  startDate: string;
  endDate: string;
  category: Classification | "";
  bundleMode: BundleMode;
  wing?: string;
  shiftPreset?: string;
  countdown?: string;
  onQueryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCategoryChange: (value: Classification | "") => void;
  onBundleModeChange: (value: BundleMode) => void;
  onWingChange?: (value: string) => void;
  onShiftPresetChange?: (value: string) => void;
  onCountdownChange?: (value: string) => void;
  onClear?: () => void;
}

export default function SearchFilterBar({
  query,
  startDate,
  endDate,
  category,
  bundleMode,
  wing = "",
  shiftPreset = "",
  countdown = "",
  onQueryChange,
  onStartDateChange,
  onEndDateChange,
  onCategoryChange,
  onBundleModeChange,
  onWingChange,
  onShiftPresetChange,
  onCountdownChange,
  onClear,
}: Props) {
  const clear = () => {
    onQueryChange("");
    onStartDateChange("");
    onEndDateChange("");
    onCategoryChange("");
    onBundleModeChange("all");
    onWingChange?.("");
    onShiftPresetChange?.("");
    onCountdownChange?.("");
    onClear?.();
  };

  const toggleClassification = (value: Classification) => {
    if (category === value) {
      onCategoryChange("");
    } else {
      onCategoryChange(value);
    }
  };

  const toggleWing = (value: string) => {
    if (!onWingChange) return;
    if (wing === value) onWingChange("");
    else onWingChange(value);
  };

  const quickWings = WINGS.slice(0, 4);
  const overflowWings = WINGS.slice(4);
  const overflowWingValue = overflowWings.includes(wing) ? wing : "";

  const toggleShiftPreset = (value: string) => {
    if (!onShiftPresetChange) return;
    if (shiftPreset === value) onShiftPresetChange("");
    else onShiftPresetChange(value);
  };

  const toggleCountdown = (value: string) => {
    if (!onCountdownChange) return;
    if (countdown === value) onCountdownChange("");
    else onCountdownChange(value);
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
  if (wing && onWingChange) {
    activeFilters.push({ key: "wing", label: `Wing: ${wing}`, onRemove: () => onWingChange("") });
  }
  if (shiftPreset && onShiftPresetChange) {
    activeFilters.push({
      key: "shift",
      label: `Shift: ${shiftPreset}`,
      onRemove: () => onShiftPresetChange(""),
    });
  }
  if (countdown && onCountdownChange) {
    const label = countdown.charAt(0).toUpperCase() + countdown.slice(1);
    activeFilters.push({
      key: "countdown",
      label: `Countdown: ${label}`,
      onRemove: () => onCountdownChange(""),
    });
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
        <label className="sr-only" htmlFor="vacancy-search-input">
          Search vacancies
        </label>
        <input
          id="vacancy-search-input"
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
      <select
        aria-label="Classification filter"
        value={category}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onCategoryChange(event.target.value as Classification | "")
        }
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        <option value="">All Classes</option>
        {CLASSIFICATIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {onWingChange && (
        <div className="chip-group" aria-label="Wing filters">
          {quickWings.map((w) => (
            <button
              key={w}
              type="button"
              className="pill pill-toggle"
              data-active={wing === w}
              aria-pressed={wing === w}
              onClick={() => toggleWing(w)}
            >
              {w}
            </button>
          ))}
          {overflowWings.length > 0 && (
            <select
              className="pill pill-toggle wing-overflow-select"
              aria-label="More wings"
              value={overflowWingValue}
              data-active={Boolean(overflowWingValue)}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => toggleWing(event.target.value)}
            >
              <option value="">More wings…</option>
              {overflowWings.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {onWingChange && (
        <select
          aria-label="Wing filter"
          value={wing}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onWingChange(event.target.value)}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          <option value="">All Wings</option>
          {WINGS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      )}
      <div className="date-range" aria-label="Date range filters">
        <input
          aria-label="Filter from date"
          type="date"
          value={startDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onStartDateChange(e.target.value)}
        />
        <input
          aria-label="Filter to date"
          type="date"
          value={endDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onEndDateChange(e.target.value)}
        />
      </div>
      {onShiftPresetChange && (
        <div className="chip-group" aria-label="Shift filters">
          {SHIFT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="pill pill-toggle"
              data-active={shiftPreset === preset.label}
              aria-pressed={shiftPreset === preset.label}
              onClick={() => toggleShiftPreset(preset.label)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      {onShiftPresetChange && (
        <select
          aria-label="Shift preset filter"
          value={shiftPreset}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onShiftPresetChange(event.target.value)
          }
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          <option value="">All Shifts</option>
          {SHIFT_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.label}>
              {preset.label}
            </option>
          ))}
        </select>
      )}
      {onCountdownChange && (
        <div className="chip-group" aria-label="Countdown filters">
          {["green", "yellow", "red"].map((value) => (
            <button
              key={value}
              type="button"
              className="pill pill-toggle"
              data-active={countdown === value}
              aria-pressed={countdown === value}
              onClick={() => toggleCountdown(value)}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      )}
      {onCountdownChange && (
        <select
          aria-label="Countdown filter"
          value={countdown}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onCountdownChange(event.target.value)
          }
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          <option value="">All Countdowns</option>
          <option value="green">Green</option>
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
        </select>
      )}
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

