import React from "react";
import Button from "./Button";

export type FilterItem =
  | { type: "text"; key: string; placeholder?: string }
  | { type: "select"; key: string; options: { value: string; label: string }[] }
  | { type: "date"; key: string; placeholder?: string };

export function FilterBar({
  items,
  values,
  onChange,
  onClear,
  style,
}: {
  items: FilterItem[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div className="toolbar" style={{ gap: 8, flexWrap: "wrap", ...style }}>
      {items.map((it) => {
        if (it.type === "text") {
          return (
            <input
              key={it.key}
              placeholder={it.placeholder || "Search…"}
              value={values[it.key] || ""}
              onChange={(e) => onChange(it.key, e.target.value)}
            />
          );
        }
        if (it.type === "select") {
          return (
            <select
              key={it.key}
              value={values[it.key] || ""}
              onChange={(e) => onChange(it.key, e.target.value)}
            >
              {it.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            key={it.key}
            type="date"
            value={values[it.key] || ""}
            onChange={(e) => onChange(it.key, e.target.value)}
          />
        );
      })}
      {onClear && (
        <Button onClick={onClear} size="sm">
          Clear
        </Button>
      )}
    </div>
  );
}

export default FilterBar;

