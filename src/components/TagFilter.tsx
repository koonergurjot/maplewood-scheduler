import React from "react";
import type { Tag } from "../models/tag";

type Props = {
  tags: Tag[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

/**
 * Sidebar filter allowing users to filter events by tag.
 */
export default function TagFilter({ tags, selected, onChange }: Props) {
  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((t) => t !== id)
        : [...selected, id],
    );
  }

  return (
    <div className="tag-filter">
      <h3 className="text-sm font-medium mb-2">Filter by tag</h3>
      <ul className="flex flex-col gap-1">
        {tags.map((t) => (
          <li key={t.id}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
              />
              <span
                className="px-2 py-1 rounded text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.label}
              </span>
            </label>
          </li>
        ))}
        {tags.length === 0 && (
          <li className="text-sm text-gray-500">No tags available</li>
        )}
      </ul>
    </div>
  );
}
