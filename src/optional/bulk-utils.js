export function ensureBundleId(v, genId) {
    if (v.bundleId)
        return v.bundleId;
    v.bundleId = genId();
    return v.bundleId;
}
/** Attach a set of vacancy ids into the target vacancy's bundle (create if missing). */
export function attachVacanciesToTargetBundle(all, targetVacancyId, attachIds, genId) {
    const byId = new Map(all.map(v => [v.id, v]));
    const target = byId.get(targetVacancyId);
    if (!target)
        return all;
    const bid = ensureBundleId(target, genId);
    for (const id of attachIds) {
        if (id === targetVacancyId)
            continue;
        const v = byId.get(id);
        if (!v)
            continue;
        v.bundleId = bid;
    }
    return Array.from(byId.values());
}
/** Add bids to vacancies (and optionally to entire bundles). */
export function addBidsToVacancies(all, vacancyIds, employees, opts) {
    const byId = new Map(all.map(v => [v.id, v]));
    const targetIds = new Set(vacancyIds);
    // Expand by bundle?
    if (opts.applyToBundles) {
        const bundleIds = new Set();
        for (const id of vacancyIds) {
            const v = byId.get(id);
            if (v?.bundleId)
                bundleIds.add(v.bundleId);
        }
        for (const v of all) {
            if (v.bundleId && bundleIds.has(v.bundleId))
                targetIds.add(v.id);
        }
    }
    let baseRank = 1;
    for (const id of targetIds) {
        const v = byId.get(id);
        if (!v)
            continue;
        if (!v.bids)
            v.bids = [];
        if (opts.overwrite)
            v.bids = [];
        let r = baseRank;
        for (const e of employees) {
            const next = { employeeId: e.id, note: opts.note };
            if (opts.sameRank)
                next.rank = 1;
            else
                next.rank = r++;
            // Dedup by employeeId
            v.bids = v.bids.filter(b => b.employeeId !== e.id);
            v.bids.push(next);
        }
    }
    return Array.from(byId.values());
}
