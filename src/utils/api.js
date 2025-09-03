export const TOKEN_KEY = "apiToken";
export function getToken() {
    // Prefer token from localStorage if available
    if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(TOKEN_KEY);
        if (stored)
            return stored;
    }
    // Fallback to environment variable
    const envToken = (import.meta.env.VITE_API_TOKEN || '').trim();
    return envToken || null;
}
export function setToken(token) {
    if (typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_KEY, token);
    }
}
export async function authFetch(input, init = {}) {
    const token = getToken();
    const headers = new Headers(init.headers);
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(input, { ...init, headers });
    if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
            const text = await response.text();
            if (text)
                message += `: ${text}`;
        }
        catch {
            // ignore
        }
        const error = new Error(message);
        error.status = response.status;
        error.response = response;
        throw error;
    }
    return response;
}
