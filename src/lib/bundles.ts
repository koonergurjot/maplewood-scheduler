export function ensureBundleId<T extends { bundleId?: string }>(v: T): string {
  if (!v.bundleId) v.bundleId = crypto.randomUUID();
  return v.bundleId;
}
