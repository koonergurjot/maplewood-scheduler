export function matchText(q, label) {
    return q
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((p) => label.toLowerCase().includes(p));
}
