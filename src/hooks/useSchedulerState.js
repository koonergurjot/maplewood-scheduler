import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "../utils/storage";
const defaultSettings = {
    responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
};
export function useSchedulerState() {
    const persisted = loadState();
    const [employees, setEmployees] = useState(persisted?.employees ?? []);
    const [vacations, setVacations] = useState(persisted?.vacations ?? []);
    const [vacancies, setVacancies] = useState(persisted?.vacancies ?? []);
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
    };
}
