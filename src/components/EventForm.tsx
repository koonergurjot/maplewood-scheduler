import React from "react";
import type { Tag } from "../models/tag";

export type EventFormProps = {
  availableTags: Tag[];
  selectedTagIds: string[];
  onTagChange: (ids: string[]) => void;
};

/**
 * Simple event form that allows selecting tags for an event.
 * Other event fields are omitted for brevity.
 */
export default function EventForm({
  availableTags,
  selectedTagIds,
  onTagChange,
}: EventFormProps) {
  function toggle(id: string) {
    onTagChange(
      selectedTagIds.includes(id)
        ? selectedTagIds.filter((t) => t !== id)
        : [...selectedTagIds, id],
    );
  }

  return (
    <div className="event-form">
      <h3 className="text-sm font-medium">Tags</h3>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <label key={tag.id} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={selectedTagIds.includes(tag.id)}
              onChange={() => toggle(tag.id)}
            />
            <span
              className="px-2 py-1 rounded text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
