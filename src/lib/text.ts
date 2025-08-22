export function matchText(q: string, label: string) {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => label.toLowerCase().includes(p));
}

