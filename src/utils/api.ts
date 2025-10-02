import { getApiAuthExternalController, TOKEN_STORAGE_KEY } from "../state/apiAuth";

export function getApiBaseUrl(): string {
  const metaEnv = (import.meta as unknown as {
    env?: Record<string, string | undefined>;
  }).env;
  const raw = (metaEnv?.VITE_API_BASE_URL ?? "").trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

function getFallbackToken(): string | null {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) return stored;
  }
  const metaEnv = (import.meta as unknown as {
    env?: Record<string, string | undefined>;
  }).env;
  const envToken = (metaEnv?.VITE_API_TOKEN ?? "").trim();
  return envToken || null;
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
  const authController = getApiAuthExternalController();
  const token = authController?.getToken() ?? getFallbackToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(resolvedInput, { ...init, headers });
  if (response.status === 401) {
    authController?.reportAuthError();
  }
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
