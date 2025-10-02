import { ChangeEvent } from "react";
import { CLASSIFICATIONS, WINGS, SHIFT_PRESETS } from "../types";
import type { Classification } from "../types";

type BundleMode = "all" | "bundles" | "singles";

type MultiSelectOption<T extends string> = {
  value: T;
  label: string;
};

type MultiSelectDropdownProps<T extends string> = {
  label: string;
  namePrefix: string;
  options: MultiSelectOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
};

function MultiSelectDropdown<T extends string>({
  label,
  namePrefix,
  options,
  selected,
  onChange,
}: MultiSelectDropdownProps<T>) {
  const toggleValue = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <details className="filter-dropdown">
      <summary role="button" aria-haspopup="listbox" tabIndex={0}>
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="filter-dropdown__count" aria-live="polite">
            {selected.length}
          </span>
        )}
      </summary>
      <div role="group" aria-label={label} className="filter-dropdown__list">
        {options.map((option) => {
          const id = `${namePrefix}-${option.value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}`;
          const checked = selected.includes(option.value);
          return (
            <label key={option.value} htmlFor={id} className="filter-dropdown__option">
              <input
                id={id}
                type="checkbox"
                role="option"
                aria-selected={checked}
                checked={checked}
                onChange={() => toggleValue(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
        {options.length === 0 && (
          <p className="filter-dropdown__empty">No options available.</p>
        )}
      </div>
    </details>
  );
}

interface Props {
  query: string;
  startDate: string;
  endDate: string;
  selectedPositions: Classification[];
  bundleMode: BundleMode;
  selectedWings: string[];
  shiftPreset?: string;
  countdownFilter?: "" | "green" | "yellow" | "red";
  onQueryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPositionsChange: (value: Classification[]) => void;
  onBundleModeChange: (value: BundleMode) => void;
  onWingsChange: (value: string[]) => void;
  onShiftPresetChange?: (value: string) => void;
  onCountdownChange?: (value: "" | "green" | "yellow" | "red") => void;
  onClear?: () => void;
}

export default function SearchFilterBar({
  query,
  startDate,
  endDate,
  selectedPositions,
  bundleMode,
  selectedWings,
  shiftPreset = "",
  countdownFilter = "",
  onQueryChange,
  onStartDateChange,
  onEndDateChange,
  onPositionsChange,
  onBundleModeChange,
  onWingsChange,
  onShiftPresetChange,
  onCountdownChange,
  onClear,
}: Props) {
  const clear = () => {
    if (onClear) {
      onClear();
      onShiftPresetChange?.("");
      onCountdownChange?.("");
      return;
    }
    onQueryChange("");
    onStartDateChange("");
    onEndDateChange("");
    onPositionsChange([]);
    onBundleModeChange("all");
    onWingsChange([]);
    onShiftPresetChange?.("");
    onCountdownChange?.("");
  };

  const toggleShiftPreset = (value: string) => {
    if (!onShiftPresetChange) return;
    if (shiftPreset === value) onShiftPresetChange("");
    else onShiftPresetChange(value);
  };

  const toggleCountdown = (value: "" | "green" | "yellow" | "red") => {
    if (!onCountdownChange) return;
    if (countdownFilter === value) {
      onCountdownChange("");
    } else {
      onCountdownChange(value);
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
  if (selectedPositions.length) {
    selectedPositions.forEach((classification) =>
      activeFilters.push({
        key: `classification-${classification}`,
        label: `Class: ${classification}`,
        onRemove: () =>
          onPositionsChange(selectedPositions.filter((item) => item !== classification)),
      }),
    );
  }
  if (selectedWings.length) {
    selectedWings.forEach((wing) =>
      activeFilters.push({
        key: `wing-${wing}`,
        label: `Wing: ${wing}`,
        onRemove: () => onWingsChange(selectedWings.filter((item) => item !== wing)),
      }),
    );
  }
  if (shiftPreset && onShiftPresetChange) {
    activeFilters.push({
      key: "shift",
      label: `Shift: ${shiftPreset}`,
      onRemove: () => onShiftPresetChange(""),
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
  if (countdownFilter && onCountdownChange) {
    const label =
      countdownFilter === "red"
        ? "Countdown: Red"
        : countdownFilter === "yellow"
        ? "Countdown: Yellow"
        : "Countdown: Green";
    activeFilters.push({
      key: "countdown",
      label,
      onRemove: () => onCountdownChange(""),
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
      <MultiSelectDropdown
        label="Classifications"
        namePrefix="classification"
        options={CLASSIFICATIONS.map((classification) => ({
          value: classification,
          label: classification,
        }))}
        selected={selectedPositions}
        onChange={onPositionsChange}
      />
      <MultiSelectDropdown
        label="Wings"
        namePrefix="wing"
        options={WINGS.map((wing) => ({ value: wing, label: wing }))}
        selected={selectedWings}
        onChange={onWingsChange}
      />
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
          <button
            type="button"
            className="pill pill-toggle"
            data-active={countdownFilter === ""}
            aria-pressed={countdownFilter === ""}
            onClick={() => toggleCountdown("")}
          >
            All
          </button>
          <button
            type="button"
            className="pill pill-toggle"
            data-active={countdownFilter === "red"}
            aria-pressed={countdownFilter === "red"}
            onClick={() => toggleCountdown("red")}
          >
            Red
          </button>
          <button
            type="button"
            className="pill pill-toggle"
            data-active={countdownFilter === "yellow"}
            aria-pressed={countdownFilter === "yellow"}
            onClick={() => toggleCountdown("yellow")}
          >
            Yellow
          </button>
          <button
            type="button"
            className="pill pill-toggle"
            data-active={countdownFilter === "green"}
            aria-pressed={countdownFilter === "green"}
            onClick={() => toggleCountdown("green")}
          >
            Green
          </button>
        </div>
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
