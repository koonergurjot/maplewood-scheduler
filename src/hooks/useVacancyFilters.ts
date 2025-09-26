import { useState } from "react";
import type { Classification } from "../types";

export function useVacancyFilters() {
  const [filterWing, setFilterWing] = useState<string>("");
  const [filterClass, setFilterClass] = useState<Classification | "">("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCountdown, setFilterCountdown] = useState<string>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [bundleMode, setBundleMode] = useState<"all" | "bundles" | "singles">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  return {
    filterWing,
    setFilterWing,
    filterClass,
    setFilterClass,
    filterShift,
    setFilterShift,
    filterCountdown,
    setFilterCountdown,
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
