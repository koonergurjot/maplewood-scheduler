export function aggregateByMonth(vacancies) {
  const groups = new Map();
  for (const v of vacancies) {
    const month = v.date.slice(0, 7);
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(v);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, items]) => {
      const posted = items.length;
      const awarded = items.filter(i => i.status === 'awarded').length;
      const cancelled = items.filter(i => i.status === 'cancelled').length;
      const cancellationRate = posted ? cancelled / posted : 0;
      const overtime = items
        .filter(i => i.status === 'awarded')
        .reduce((sum, i) => sum + Math.max(0, i.hours - 8), 0);
      return { period, posted, awarded, cancelled, cancellationRate, overtime };
    });
}
