import { useState } from "react";
export function useVacancyFilters() {
    const [filterWing, setFilterWing] = useState("");
    const [filterClass, setFilterClass] = useState("");
    const [filterShift, setFilterShift] = useState("");
    const [filterCountdown, setFilterCountdown] = useState("");
    const [filterStart, setFilterStart] = useState("");
    const [filterEnd, setFilterEnd] = useState("");
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
