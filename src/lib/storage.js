export function createMemoryStorage() {
    const store = {};
    return {
        getItem: (key) => (key in store ? store[key] : null),
        setItem: (key, value) => {
            store[key] = value;
        },
    };
}
const storage = typeof localStorage !== "undefined"
    ? {
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
    }
    : createMemoryStorage();
export default storage;
