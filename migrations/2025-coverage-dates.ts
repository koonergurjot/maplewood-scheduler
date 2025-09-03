export default function migrate(state: any) {
  if (Array.isArray(state?.vacancies)) {
    state.vacancies = state.vacancies.map((v: any) => ({
      ...v,
      coverageDates:
        Array.isArray(v.coverageDates) && v.coverageDates.length > 0
          ? v.coverageDates
          : undefined,
    }));
  }
  return state;
}
