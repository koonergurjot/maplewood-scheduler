export function parseNumberParam(name, value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${name} must be numeric`);
  }
  if (value.trim() === '') {
    throw new Error(`${name} must be numeric`);
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`${name} must be numeric`);
  }
  return num;
}
