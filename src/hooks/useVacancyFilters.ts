import { useEffect, useMemo, useRef, useState } from "react";
import type { Classification } from "../types";
import {
  clearVacancyFilters,
  loadVacancyFilters,
  saveVacancyFilters,
  type CountdownFilter,
  type VacancyFilterSnapshot,
} from "../utils/storage";

const DEFAULT_FILTERS: VacancyFilterSnapshot = {
  selectedWings: [],
  selectedPositions: [],
  filterShift: "",
  filterCountdown: "",
  start: "",
  end: "",
  search: "",
  bundleMode: "all",
};

export function useVacancyFilters() {
  const persistedFilters = useMemo(() => loadVacancyFilters(), []);
  const [selectedWings, setSelectedWings] = useState<string[]>(
    () => persistedFilters?.selectedWings ?? DEFAULT_FILTERS.selectedWings,
  );
  const [selectedPositions, setSelectedPositions] = useState<Classification[]>(
    () => persistedFilters?.selectedPositions ?? DEFAULT_FILTERS.selectedPositions,
  );
  const [filterShift, setFilterShift] = useState<string>(
    () => persistedFilters?.filterShift ?? DEFAULT_FILTERS.filterShift,
  );
  const [filterCountdown, setFilterCountdown] = useState<CountdownFilter>(
    () => persistedFilters?.filterCountdown ?? DEFAULT_FILTERS.filterCountdown,
  );
  const [start, setStart] = useState<string>(
    () => persistedFilters?.start ?? DEFAULT_FILTERS.start,
  );
  const [end, setEnd] = useState<string>(() => persistedFilters?.end ?? DEFAULT_FILTERS.end);
  const [search, setSearch] = useState<string>(
    () => persistedFilters?.search ?? DEFAULT_FILTERS.search,
  );
  const [bundleMode, setBundleMode] = useState<"all" | "bundles" | "singles">(
    () => persistedFilters?.bundleMode ?? DEFAULT_FILTERS.bundleMode,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const snapshot: VacancyFilterSnapshot = {
      selectedWings,
      selectedPositions,
      filterShift,
      filterCountdown,
      start,
      end,
      search,
      bundleMode,
    };
    saveVacancyFilters(snapshot);
  }, [
    selectedWings,
    selectedPositions,
    filterShift,
    filterCountdown,
    start,
    end,
    search,
    bundleMode,
  ]);

  const resetFilters = () => {
    skipNextPersistRef.current = true;
    setSelectedWings(DEFAULT_FILTERS.selectedWings);
    setSelectedPositions(DEFAULT_FILTERS.selectedPositions);
    setFilterShift(DEFAULT_FILTERS.filterShift);
    setFilterCountdown(DEFAULT_FILTERS.filterCountdown);
    setStart(DEFAULT_FILTERS.start);
    setEnd(DEFAULT_FILTERS.end);
    setSearch(DEFAULT_FILTERS.search);
    setBundleMode(DEFAULT_FILTERS.bundleMode);
    clearVacancyFilters();
  };

  return {
    selectedWings,
    setSelectedWings,
    selectedPositions,
    setSelectedPositions,
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
    resetFilters,
  };
}
