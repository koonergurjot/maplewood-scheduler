import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "../utils/storage";
import { bundleContiguousVacanciesByRef } from "../lib/bundles";
const defaultSettings = {
    responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
};
export function useSchedulerState() {
    const persisted = loadState();
    const [employees, setEmployees] = useState(persisted?.employees ?? []);
    const [vacations, setVacations] = useState(persisted?.vacations ?? []);
    const seededVacancies = bundleContiguousVacanciesByRef(persisted?.vacancies ? [...persisted.vacancies] : []);
    const [vacancies, setVacancies] = useState(seededVacancies);
    const [bids, setBids] = useState(persisted?.bids ?? []);
    const [archivedBids, setArchivedBids] = useState(persisted?.archivedBids ?? {});
    const [settings, setSettings] = useState(persisted?.settings ?? defaultSettings);
    const [vacancyRanges, setVacancyRanges] = useState(persisted?.vacancyRanges ?? []);
    const employeesById = useMemo(() => {
        const m = new Map();
        for (const e of employees)
            m.set(e.id, e);
        return m;
    }, [employees]);
    useEffect(() => {
        saveState({
            employees,
            vacations,
            vacancies,
            bids,
            archivedBids,
            settings,
            vacancyRanges,
        });
    }, [employees, vacations, vacancies, bids, archivedBids, settings, vacancyRanges]);
    const updateVacancy = (id, patch) => {
        setVacancies((prev) => prev.map((v) => v.id === id
            ? {
                ...v,
                ...patch,
                bundleId: patch.bundleId === undefined ? v.bundleId : patch.bundleId,
                bundleMode: patch.bundleMode === undefined ? v.bundleMode : patch.bundleMode,
            }
            : v));
    };
    return {
        employees,
        setEmployees,
        vacations,
        setVacations,
        vacancies,
        setVacancies,
        bids,
        setBids,
        archivedBids,
        setArchivedBids,
        settings,
        setSettings,
        employeesById,
        vacancyRanges,
        setVacancyRanges,
        updateVacancy,
    };
}
