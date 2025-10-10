import { ChangeEvent, useId } from "react";
import type { CSSProperties } from "react";
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
  selectLabel: string;
};

const visuallyHiddenStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

function MultiSelectDropdown<T extends string>({
  label,
  namePrefix,
  options,
  selected,
  onChange,
  selectLabel,
}: MultiSelectDropdownProps<T>) {
  const dropdownId = useId();
  const toggleValue = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    onChange(value ? ([value as T]) : ([] as T[]));
  };

  return (
    <div className="filter-dropdown">
      <div className="filter-dropdown__summary" aria-hidden="true">
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="filter-dropdown__count" aria-live="polite">
            {selected.length}
          </span>
        )}
      </div>
      <div role="group" aria-label={label} className="filter-dropdown__list">
        {options.map((option) => {
          const safeValue = option.value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
          const id = `${dropdownId}-${namePrefix}-${safeValue}`;
          const isActive = selected.includes(option.value);
          return (
            <button
              key={option.value}
              id={id}
              type="button"
              className="filter-dropdown__option"
              data-active={isActive}
              aria-pressed={isActive}
              onClick={() => toggleValue(option.value)}
            >
              {option.label}
            </button>
          );
        })}
        {options.length === 0 && (
          <p className="filter-dropdown__empty">No options available.</p>
        )}
      </div>
      <select
        aria-label={selectLabel}
        value={selected[0] ?? ""}
        onChange={handleSelectChange}
        style={visuallyHiddenStyle}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
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
  countdownStatus?: string;
  onQueryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPositionsChange: (value: Classification[]) => void;
  onBundleModeChange: (value: BundleMode) => void;
  onWingsChange: (value: string[]) => void;
  onShiftPresetChange?: (value: string) => void;
  onCountdownChange?: (value: string) => void;
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
  countdownStatus = "",
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
  const searchInputId = useId();
  const startDateId = useId();
  const endDateId = useId();
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

  const toggleCountdown = (value: string) => {
    if (!onCountdownChange) return;
    if (countdownStatus === value) onCountdownChange("");
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
  if (countdownStatus && onCountdownChange) {
    activeFilters.push({
      key: "countdown",
      label: `Countdown: ${countdownStatus.charAt(0).toUpperCase()}${countdownStatus.slice(1)}`,
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
    <section
      className="toolbar search-filter-bar"
      aria-label="Search and filter vacancies"
    >
      <div className="search-filter-bar__field">
        <label className="sr-only" htmlFor={searchInputId}>
          Search vacancies
        </label>
        <input
          id={searchInputId}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="search-filter-bar__field">
        <MultiSelectDropdown
          label="Classifications"
          namePrefix="classification"
          options={CLASSIFICATIONS.map((classification) => ({
            value: classification,
            label: classification,
          }))}
          selected={selectedPositions}
          onChange={onPositionsChange}
          selectLabel="Classification filter"
        />
      </div>
      <div className="search-filter-bar__field">
        <MultiSelectDropdown
          label="Wings"
          namePrefix="wing"
          options={WINGS.map((wing) => ({ value: wing, label: wing }))}
          selected={selectedWings}
          onChange={onWingsChange}
          selectLabel="Wing filter"
        />
      </div>
      <div className="search-filter-bar__field">
        <span className="search-filter-bar__label" aria-hidden="true">
          Dates
        </span>
        <div className="search-filter-bar__date-range" aria-label="Date range filters">
          <label className="sr-only" htmlFor={startDateId}>
            Filter from date
          </label>
          <input
            id={startDateId}
            type="date"
            value={startDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onStartDateChange(e.target.value)}
          />
          <label className="sr-only" htmlFor={endDateId}>
            Filter to date
          </label>
          <input
            id={endDateId}
            type="date"
            value={endDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onEndDateChange(e.target.value)}
          />
        </div>
      </div>
      {onShiftPresetChange && (
        <div className="search-filter-bar__segmented" role="group" aria-label="Shift filters">
          <span className="search-filter-bar__label" aria-hidden="true">
            Shifts
          </span>
          <div className="search-filter-bar__segmented-buttons">
            {SHIFT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="segmented-option"
                data-active={shiftPreset === preset.label}
                aria-pressed={shiftPreset === preset.label}
                onClick={() => toggleShiftPreset(preset.label)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {onShiftPresetChange && (
        <select
          aria-label="Shift preset filter"
          value={shiftPreset}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onShiftPresetChange(event.target.value)
          }
          style={visuallyHiddenStyle}
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
        <div className="search-filter-bar__segmented" role="group" aria-label="Countdown filters">
          <span className="search-filter-bar__label" aria-hidden="true">
            Countdown
          </span>
          <div className="search-filter-bar__segmented-buttons">
            {[
              { label: "Green", value: "green" },
              { label: "Yellow", value: "yellow" },
              { label: "Red", value: "red" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className="segmented-option"
                data-active={countdownStatus === option.value}
                aria-pressed={countdownStatus === option.value}
                onClick={() => toggleCountdown(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {onCountdownChange && (
        <select
          aria-label="Countdown filter"
          value={countdownStatus}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onCountdownChange(event.target.value)
          }
          style={visuallyHiddenStyle}
        >
          <option value="">All Countdowns</option>
          <option value="green">Green</option>
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
        </select>
      )}
      <div className="search-filter-bar__segmented" role="group" aria-label="Bundle filters">
        <span className="search-filter-bar__label" aria-hidden="true">
          Bundle mode
        </span>
        <div className="search-filter-bar__segmented-buttons">
          <button
            type="button"
            className="segmented-option"
            data-active={bundleMode === "all"}
            aria-pressed={bundleMode === "all"}
            onClick={() => toggleBundleMode("all")}
          >
            All
          </button>
          <button
            type="button"
            className="segmented-option"
            data-active={bundleMode === "bundles"}
            aria-pressed={bundleMode === "bundles"}
            onClick={() => toggleBundleMode("bundles")}
          >
            Bundles only
          </button>
          <button
            type="button"
            className="segmented-option"
            data-active={bundleMode === "singles"}
            aria-pressed={bundleMode === "singles"}
            onClick={() => toggleBundleMode("singles")}
          >
            Singles only
          </button>
        </div>
      </div>
      <div className="search-filter-bar__field search-filter-bar__action">
        <button className="btn" onClick={clear} type="button">
          Clear
        </button>
      </div>
      {activeFilters.length > 0 && (
        <div className="search-filter-bar__chips-row" aria-label="Active filters">
          {activeFilters.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="active-filter-chip"
              onClick={chip.onRemove}
              aria-label={`Remove ${chip.label}`}
            >
              <span>{chip.label}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
