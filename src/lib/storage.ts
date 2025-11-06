import { loadLocalSnapshot, saveLocalSnapshot } from "../utils/persistence";

export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createMemoryStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
}

const storage: Storage =
  typeof window !== "undefined"
    ? {
        getItem: (key: string) => {
          const value = loadLocalSnapshot<string>(key);
          if (typeof value === "string") return value;
          if (value == null) return null;
          return JSON.stringify(value);
        },
        setItem: (key: string, value: string) => {
          saveLocalSnapshot(key, value);
        },
      }
    : createMemoryStorage();

export default storage;
