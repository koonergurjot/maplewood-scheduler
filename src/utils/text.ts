export const matchText = (q: string, label: string) =>
  q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(p => label.toLowerCase().includes(p));
