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
  typeof localStorage !== "undefined"
    ? {
        getItem: (key: string) => localStorage.getItem(key),
        setItem: (key: string, value: string) =>
          localStorage.setItem(key, value),
      }
    : createMemoryStorage();

export default storage;
