import { ChangeEvent } from "react";

interface Props {
  query: string;
  startDate: string;
  endDate: string;
  category: string;
  categories: string[];
  onQueryChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClear?: () => void;
}

export default function SearchFilterBar({
  query,
  startDate,
  endDate,
  category,
  categories,
  onQueryChange,
  onStartDateChange,
  onEndDateChange,
  onCategoryChange,
  onClear,
}: Props) {
  const clear = () => {
    onQueryChange("");
    onStartDateChange("");
    onEndDateChange("");
    onCategoryChange("");
    onClear?.();
  };

  return (
    <div className="toolbar search-filter-bar">
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onQueryChange(e.target.value)}
      />
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
      <select
        value={category}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onCategoryChange(e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button className="btn" onClick={clear}>
        Clear
      </button>
    </div>
  );
}

