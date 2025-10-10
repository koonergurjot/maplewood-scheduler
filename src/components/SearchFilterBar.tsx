import { ChangeEvent, useId } from "react";
import type { CSSProperties } from "react";
import { CLASSIFICATIONS, WINGS, SHIFT_PRESETS } from "../types";
import type { Classification } from "../types";
import type { CountdownFilter } from "../utils/storage";

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
  accessibleLabel?: string;
  accessibleMode?: "select" | "buttons";
  accessibleAllLabel?: string;
};

function MultiSelectDropdown<T extends string>({
  label,
  namePrefix,
  options,
  selected,
  onChange,
  accessibleLabel = label,
  accessibleMode = "select",
  accessibleAllLabel,
}: MultiSelectDropdownProps<T>) {
  const dropdownId = useId();
  const toggleValue = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <>
      <details className="filter-dropdown">
        <summary className="filter-dropdown__summary" aria-haspopup="listbox">
          <span>{label}</span>
          {selected.length > 0 && (
            <span className="filter-dropdown__count" aria-live="polite">
              {selected.length}
            </span>
          )}
        </summary>
        <div role="group" aria-label={label} className="filter-dropdown__list">
          {options.map((option) => {
            const safeValue = option.value
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-");
            const id = `${dropdownId}-${namePrefix}-${safeValue}`;
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
      {accessibleMode === "select" ? (
        <select
          aria-label={accessibleLabel}
          value={selected[0] ?? ""}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            const { value } = event.target;
            onChange(value ? [value as T] : []);
          }}
          style={visuallyHiddenStyle}
        >
          <option value="">{accessibleAllLabel ?? `All ${label}`}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div role="group" aria-label={accessibleLabel} style={visuallyHiddenStyle}>
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={checked}
                onClick={() => toggleValue(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </>
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
  countdownStatus?: CountdownFilter;
  onQueryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onPositionsChange: (value: Classification[]) => void;
  onBundleModeChange: (value: BundleMode) => void;
  onWingsChange: (value: string[]) => void;
  onShiftPresetChange?: (value: string) => void;
  onCountdownChange?: (value: CountdownFilter) => void;
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

  const toggleCountdownPreset = (value: CountdownFilter) => {
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
  if (countdownStatus && onCountdownChange) {
    const label =
      countdownStatus.charAt(0).toUpperCase() + countdownStatus.slice(1);
    activeFilters.push({
      key: `countdown-${countdownStatus}`,
      label: `Countdown: ${label}`,
      onRemove: () => onCountdownChange(""),
    });
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
          accessibleLabel="Classification filter"
          accessibleMode="select"
          accessibleAllLabel="All Classifications"
        />
      </div>
      <div className="search-filter-bar__field">
        <MultiSelectDropdown
          label="Wings"
          namePrefix="wing"
          options={WINGS.map((wing) => ({ value: wing, label: wing }))}
          selected={selectedWings}
          onChange={onWingsChange}
          accessibleLabel="Wing filters"
          accessibleMode="buttons"
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
        <div
          className="search-filter-bar__segmented"
          role="group"
          aria-label="Countdown status filters"
        >
          <span className="search-filter-bar__label" aria-hidden="true">
            Countdown
          </span>
          <div className="search-filter-bar__segmented-buttons">
            <button
              type="button"
              className="segmented-option"
              data-active={countdownStatus === "red"}
              aria-pressed={countdownStatus === "red"}
              onClick={() => toggleCountdownPreset("red")}
            >
              Red
            </button>
            <button
              type="button"
              className="segmented-option"
              data-active={countdownStatus === "yellow"}
              aria-pressed={countdownStatus === "yellow"}
              onClick={() => toggleCountdownPreset("yellow")}
            >
              Yellow
            </button>
            <button
              type="button"
              className="segmented-option"
              data-active={countdownStatus === "green"}
              aria-pressed={countdownStatus === "green"}
              onClick={() => toggleCountdownPreset("green")}
            >
              Green
            </button>
          </div>
        </div>
      )}
      {onCountdownChange && (
        <select
          aria-label="Countdown status filter"
          value={countdownStatus}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onCountdownChange(event.target.value as CountdownFilter)
          }
          style={visuallyHiddenStyle}
        >
          <option value="">All Countdown Statuses</option>
          <option value="red">Red</option>
          <option value="yellow">Yellow</option>
          <option value="green">Green</option>
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
