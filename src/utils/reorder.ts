export function reorder<T>(arr: T[], from: number, to: number): T[] {
  if (
    from < 0 ||
    from >= arr.length ||
    to < 0 ||
    to >= arr.length ||
    from === to
  ) {
    return arr;
  }

  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
