export const TOKEN_KEY = "apiToken";

export function getToken(): string | null {
  // Prefer token from localStorage if available
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
  }
  // Fallback to environment variable
  const envToken = import.meta.env.VITE_API_TOKEN as string | undefined;
  return envToken ?? null;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
