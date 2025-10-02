import { useState } from "react";
import type { Classification } from "../types";

export function useVacancyFilters() {
  const [selectedWings, setSelectedWings] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<Classification[]>([]);
  const [filterShift, setFilterShift] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [bundleMode, setBundleMode] = useState<"all" | "bundles" | "singles">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  return {
    selectedWings,
    setSelectedWings,
    selectedPositions,
    setSelectedPositions,
    filterShift,
    setFilterShift,
    start,
    setStart,
    end,
    setEnd,
    search,
    setSearch,
    bundleMode,
    setBundleMode,
    filtersOpen,
    setFiltersOpen,
  };
}
