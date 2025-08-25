export function reorder<T>(arr: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    from >= arr.length ||
    to < 0 ||
    to > arr.length ||
    from === to
  ) {
    return arr;
  }

  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  const insertIndex = to === arr.length ? arr.length : to;
  copy.splice(insertIndex, 0, item);
  return copy;
}
