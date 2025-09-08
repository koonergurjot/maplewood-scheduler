import { useEffect, useRef, useState } from "react";
import { loadState, saveState } from "../utils/storage";
const UNDO_MS = 10000;
export function useVacancies() {
    const persisted = loadState() || {};
    let initialVacancies = Array.isArray(persisted.vacancies)
        ? persisted.vacancies.map((v) => ({
            id: v.id ||
                (typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : Date.now().toString()),
            ...v,
        }))
        : [];
    // backfill ids if needed
    useEffect(() => {
        if (persisted.vacancies && persisted.vacancies.some((v) => !v.id)) {
            persist(initialVacancies, persisted.auditLog || []);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [vacancies, setVacancies] = useState(initialVacancies);
    const [auditLog, setAuditLog] = useState(Array.isArray(persisted.auditLog) ? persisted.auditLog : []);
    const [staged, setStaged] = useState(null);
    const undoTimerRef = useRef(null);
    function persist(vacs, log = auditLog) {
        const current = loadState() || {};
        current.vacancies = vacs;
        current.auditLog = log;
        saveState(current);
    }
    function stageDelete(ids) {
        const toDelete = vacancies.filter((v) => ids.includes(v.id));
        if (!toDelete.length)
            return;
        setStaged(toDelete);
        const remaining = vacancies.filter((v) => !ids.includes(v.id));
        setVacancies(remaining);
        persist(remaining);
        if (undoTimerRef.current)
            window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = window.setTimeout(() => finalizeDeletes(ids), UNDO_MS);
    }
    function undoDelete() {
        if (!staged)
            return;
        const restored = [...staged, ...vacancies];
        setVacancies(restored);
        setStaged(null);
        if (undoTimerRef.current) {
            window.clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
        persist(restored);
    }
    function finalizeDeletes(ids) {
        const entry = {
            id: typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2),
            type: "VACANCY_DELETE",
            at: new Date().toISOString(),
            payload: {
                vacancyIds: ids,
                userAction: ids.length > 1 ? "bulk" : "single",
            },
        };
        const nextLog = [...auditLog, entry];
        setAuditLog(nextLog);
        setStaged(null);
        undoTimerRef.current = null;
        persist(vacancies, nextLog);
    }
    return {
        vacancies,
        stageDelete,
        undoDelete,
        staged,
        auditLog,
    };
}
export default useVacancies;
