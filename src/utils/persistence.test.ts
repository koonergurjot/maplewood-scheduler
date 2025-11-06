import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  byteLength,
  loadLocalSnapshot,
  saveLocalSnapshot,
} from "./persistence";

const ORIGINAL_LOCAL_STORAGE = globalThis.localStorage;

describe("persistence helpers", () => {
  let store: Record<string, string>;
  let mockStorage: Storage;

  beforeEach(() => {
    store = {};
    mockStorage = {
      getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      get length() {
        return Object.keys(store).length;
      },
    } as Storage;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: mockStorage,
    });
  });

  afterEach(() => {
    if (ORIGINAL_LOCAL_STORAGE) {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: ORIGINAL_LOCAL_STORAGE,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as Record<string, unknown>).localStorage;
    }
    vi.restoreAllMocks();
  });

  it("saves snapshots as JSON and loads them via schema", () => {
    const schema = z.object({ foo: z.string(), count: z.number() });
    const snapshot = { foo: "bar", count: 3 };
    expect(saveLocalSnapshot("example", snapshot, schema)).toBe(true);
    expect(store.example).toBe(JSON.stringify(snapshot));

    const loaded = loadLocalSnapshot("example", schema);
    expect(loaded).toEqual(snapshot);
  });

  it("removes entries when saving null or undefined", () => {
    store.persisted = JSON.stringify({ ok: true });
    expect(saveLocalSnapshot("persisted", null)).toBe(true);
    expect(store.persisted).toBeUndefined();
  });

  it("returns primitive strings without a schema", () => {
    expect(saveLocalSnapshot("theme", "dark")).toBe(true);
    expect(store.theme).toBe(JSON.stringify("dark"));

    expect(loadLocalSnapshot("theme")).toBe("dark");
  });

  it("computes UTF-8 byte length", () => {
    const json = JSON.stringify({ greeting: "héllo" });
    const expected = new TextEncoder().encode(json).length;
    expect(byteLength(json)).toBe(expected);
  });
});
