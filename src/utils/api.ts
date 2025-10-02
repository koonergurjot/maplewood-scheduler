export const TOKEN_KEY = "apiToken";

export function getToken(): string | null {
  // Prefer token from localStorage if available
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
  }
  // Fallback to environment variable
  const metaEnv = (import.meta as unknown as {
    env?: Record<string, string | undefined>;
  }).env;
  const envToken = (metaEnv?.VITE_API_TOKEN ?? "").trim();
  return envToken || null;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getApiBaseUrl(): string {
  const metaEnv = (import.meta as unknown as {
    env?: Record<string, string | undefined>;
  }).env;
  const raw = (metaEnv?.VITE_API_BASE_URL ?? "").trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

function resolveRequestInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string") {
    try {
      // Absolute URLs will parse without throwing.
      new URL(input);
      return input;
    } catch {
      const base = getApiBaseUrl();
      const normalizedPath = input.startsWith("/") ? input : `/${input}`;
      if (base) {
        return `${base}${normalizedPath}`;
      }
      if (typeof window !== "undefined" && window.location?.origin) {
        return new URL(normalizedPath, window.location.origin).toString();
      }
    }
  }
  return input;
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const resolvedInput = resolveRequestInput(input);
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(resolvedInput, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const text = await response.text();
      if (text) message += `: ${text}`;
    } catch {
      // ignore
    }
    const error: any = new Error(message);
    error.status = response.status;
    error.response = response;
    throw error;
  }
  return response;
}
