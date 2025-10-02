type MultiSelectOption<T extends string> = {
  value: T;
  label: string;
};

export type MultiSelectDropdownProps<T extends string> = {
  label: string;
  namePrefix: string;
  options: MultiSelectOption<T>[];
  selected: T[];
  onChange: (next: T[]) => void;
};

export function MultiSelectDropdown<T extends string>({
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
      <summary aria-haspopup="listbox">
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

export default MultiSelectDropdown;

