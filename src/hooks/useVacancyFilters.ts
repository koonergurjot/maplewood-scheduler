import { useState } from "react";
import type { Classification } from "../types";

export function useVacancyFilters() {
  const [filterWing, setFilterWing] = useState<string>("");
  const [filterClass, setFilterClass] = useState<Classification | "">("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCountdown, setFilterCountdown] = useState<string>("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
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
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    filtersOpen,
    setFiltersOpen,
  };
}
