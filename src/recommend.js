export function recommend(vac, bids, employeesById) {
    const relevant = bids.filter((b) => b.vacancyId === vac.id);
    const candidates = relevant
        .map((b, idx) => {
        const parsed = b.placedAt ? Date.parse(b.placedAt) : undefined;
        return {
            emp: employeesById[b.bidderEmployeeId],
            order: idx,
            time: parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined,
        };
    })
        .filter((c) => !!c.emp && c.emp.active && c.emp.classification === vac.classification);
    if (!candidates.length) {
        return { why: ["No eligible bidders"] };
    }
    candidates.sort((a, b) => {
        // Primary sort by seniority hours when available, otherwise rank.
        // If those tie, prefer the earlier bid determined by timestamp when
        // present, otherwise by bid order.
        const hoursDiff = (b.emp.seniorityHours ?? 0) - (a.emp.seniorityHours ?? 0);
        if (hoursDiff !== 0)
            return hoursDiff;
        const rankDiff = (a.emp.seniorityRank ?? 99999) - (b.emp.seniorityRank ?? 99999);
        if (rankDiff !== 0)
            return rankDiff;
        if (a.time !== undefined &&
            b.time !== undefined &&
            !Number.isNaN(a.time) &&
            !Number.isNaN(b.time) &&
            a.time !== b.time) {
            return a.time - b.time;
        }
        return a.order - b.order;
    });
    const chosen = candidates[0].emp;
    const why = [
        "Bidder",
        chosen.seniorityHours !== undefined
            ? `Hours ${chosen.seniorityHours}`
            : `Rank ${chosen.seniorityRank ?? "?"}`,
        `Class ${chosen.classification}`,
    ];
    return { id: chosen.id, why };
}
