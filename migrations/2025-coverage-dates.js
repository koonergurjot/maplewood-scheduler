export default function migrate(state) {
    if (Array.isArray(state?.vacancies)) {
        state.vacancies = state.vacancies.map((v) => ({
            ...v,
            coverageDates: Array.isArray(v.coverageDates) && v.coverageDates.length > 0
                ? v.coverageDates
                : undefined,
        }));
    }
    return state;
}
