export function aggregateByMonth(vacancies, options = {}) {
  const { overtimeThreshold = 8 } = options;
  const groups = {};
  for (const v of vacancies) {
    const month = v.date.slice(0, 7);
    groups[month] = groups[month] || [];
    groups[month].push(v);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, items]) => {
      const stats = items.reduce(
        (acc, item) => {
          acc.posted++;
          acc.totalHours += item.hours;
          if (item.status === "awarded") {
            acc.awarded++;
            acc.overtime += Math.max(0, item.hours - overtimeThreshold);
          } else if (item.status === "cancelled") {
            acc.cancelled++;
          }
          return acc;
        },
        { posted: 0, awarded: 0, cancelled: 0, overtime: 0, totalHours: 0 },
      );

      const cancellationRate = stats.posted
        ? stats.cancelled / stats.posted
        : 0;
      const averageHours = stats.posted
        ? stats.totalHours / stats.posted
        : 0;

      return {
        period,
        posted: stats.posted,
        awarded: stats.awarded,
        cancelled: stats.cancelled,
        cancellationRate,
        overtime: stats.overtime,
        averageHours,
      };
    });
}

export const sampleVacancies = [
  { date: "2024-01-01", status: "awarded", hours: 10 },
  { date: "2024-01-05", status: "cancelled", hours: 8 },
  { date: "2024-01-07", status: "posted", hours: 8 },
  { date: "2024-02-02", status: "awarded", hours: 9 },
  { date: "2024-02-04", status: "awarded", hours: 8 },
  { date: "2024-02-08", status: "cancelled", hours: 8 },
  { date: "2024-03-03", status: "posted", hours: 8 },
];
