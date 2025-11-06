import type { ZodType, ZodTypeAny } from "zod";

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type Schema<T> = ZodType<T> | ZodTypeAny;

type Serializable = string | number | boolean | Record<string, unknown> | unknown[] | null;

function serialize(value: Serializable): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

export function byteLength(json: string | Serializable): number {
  const text = typeof json === "string" ? json : serialize(json);
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text).length;
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.byteLength(text, "utf8");
  }
  return Array.from(text).length;
}

export function loadLocalSnapshot<T>(key: string, schema?: Schema<T>): T | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    let value: unknown = raw;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
    if (schema) {
      const result = schema.safeParse(value);
      return result.success ? result.data : null;
    }
    return value as T;
  } catch {
    return null;
  }
}

export function saveLocalSnapshot<T>(
  key: string,
  value: T | null | undefined,
  schema?: Schema<T>,
): boolean {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }
  try {
    if (value === null || value === undefined) {
      storage.removeItem(key);
      return true;
    }
    let normalized: unknown = value;
    if (schema) {
      const result = schema.safeParse(value);
      if (!result.success) {
        return false;
      }
      normalized = result.data;
    }
    storage.setItem(key, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}
