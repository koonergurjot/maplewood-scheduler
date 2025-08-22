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
      const posted = items.length;
      const awarded = items.filter((i) => i.status === "awarded").length;
      const cancelled = items.filter((i) => i.status === "cancelled").length;
      const cancellationRate = posted ? cancelled / posted : 0;
      const overtime = items
        .filter((i) => i.status === "awarded")
        .reduce((sum, i) => sum + Math.max(0, i.hours - overtimeThreshold), 0);
      const avgHours = items.length
        ? items.reduce((sum, i) => sum + i.hours, 0) / items.length
        : 0;
      return {
        period,
        posted,
        awarded,
        cancelled,
        cancellationRate,
        overtime,
        averageHours: avgHours,
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
