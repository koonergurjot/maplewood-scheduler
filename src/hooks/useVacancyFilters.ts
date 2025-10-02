import { useEffect, useMemo, useRef, useState } from "react";
import type { Classification } from "../types";
import {
  clearVacancyFilters,
  loadVacancyFilters,
  saveVacancyFilters,
  type VacancyFilterSnapshot,
} from "../utils/storage";

const DEFAULT_FILTERS: VacancyFilterSnapshot = {
  selectedWings: [],
  selectedPositions: [],
  filterShift: "",
  start: "",
  end: "",
  search: "",
  bundleMode: "all",
  countdown: "",
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
  const [countdown, setCountdown] = useState<VacancyFilterSnapshot["countdown"]>(
    () => persistedFilters?.countdown ?? DEFAULT_FILTERS.countdown,
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
      start,
      end,
      search,
      bundleMode,
      countdown,
    };
    saveVacancyFilters(snapshot);
  }, [
    selectedWings,
    selectedPositions,
    filterShift,
    start,
    end,
    search,
    bundleMode,
    countdown,
  ]);

  const resetFilters = () => {
    skipNextPersistRef.current = true;
    setSelectedWings(DEFAULT_FILTERS.selectedWings);
    setSelectedPositions(DEFAULT_FILTERS.selectedPositions);
    setFilterShift(DEFAULT_FILTERS.filterShift);
    setStart(DEFAULT_FILTERS.start);
    setEnd(DEFAULT_FILTERS.end);
    setSearch(DEFAULT_FILTERS.search);
    setBundleMode(DEFAULT_FILTERS.bundleMode);
    setCountdown(DEFAULT_FILTERS.countdown);
    clearVacancyFilters();
  };

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
    countdown,
    setCountdown,
    filtersOpen,
    setFiltersOpen,
    resetFilters,
  };
}
