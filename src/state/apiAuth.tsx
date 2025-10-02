import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const TOKEN_STORAGE_KEY = "apiToken" as const;

type ApiAuthStatus = "ready" | "missing" | "error";

type ApiAuthState = {
  token: string | null;
  status: ApiAuthStatus;
  message: string | null;
};

type ApiAuthContextValue = {
  token: string | null;
  status: ApiAuthStatus;
  message: string | null;
  setToken: (token: string | null) => void;
  clearToken: () => void;
  reportError: (message?: string | null) => void;
  waitForValidToken: () => Promise<string>;
};

type ApiAuthExternalController = {
  getToken: () => string | null;
  getStatus: () => ApiAuthStatus;
  reportAuthError: (message?: string | null) => void;
  waitForValidToken: () => Promise<string>;
};

let externalController: ApiAuthExternalController | null = null;

export function getApiAuthExternalController() {
  return externalController;
}

function setApiAuthExternalController(controller: ApiAuthExternalController | null) {
  externalController = controller;
}

function readInitialToken(): string | null {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) return stored;
  }
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const envToken = (metaEnv?.VITE_API_TOKEN ?? "").trim();
  return envToken || null;
}

const ApiAuthContext = createContext<ApiAuthContextValue | null>(null);

export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ApiAuthState>(() => {
    const token = readInitialToken();
    return {
      token,
      status: token ? "ready" : "missing",
      message: null,
    };
  });
  const stateRef = useRef(state);
  const waitersRef = useRef<((token: string) => void)[]>([]);

  useEffect(() => {
    stateRef.current = state;
    if (state.status === "ready" && state.token) {
      const resolvers = waitersRef.current.splice(0, waitersRef.current.length);
      for (const resolve of resolvers) {
        resolve(state.token);
      }
    }
  }, [state]);

  const setToken = useCallback((token: string | null) => {
    const normalized = token?.trim() || null;
    if (typeof window !== "undefined") {
      if (normalized) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
    setState({
      token: normalized,
      status: normalized ? "ready" : "missing",
      message: null,
    });
  }, []);

  const clearToken = useCallback(() => {
    setToken(null);
  }, [setToken]);

  const reportError = useCallback((message?: string | null) => {
    setState((prev) => ({
      token: prev.token,
      status: "error",
      message: typeof message === "string" ? message : prev.message,
    }));
  }, []);

  const waitForValidToken = useCallback(() => {
    const snapshot = stateRef.current;
    if (snapshot.status === "ready" && snapshot.token) {
      return Promise.resolve(snapshot.token);
    }
    return new Promise<string>((resolve) => {
      waitersRef.current.push(resolve);
    });
  }, []);

  useEffect(() => {
    setApiAuthExternalController({
      getToken: () => stateRef.current.token,
      getStatus: () => stateRef.current.status,
      reportAuthError: (message?: string | null) => {
        reportError(message);
      },
      waitForValidToken,
    });
    return () => setApiAuthExternalController(null);
  }, [reportError, waitForValidToken]);

  const value = useMemo<ApiAuthContextValue>(
    () => ({
      token: state.token,
      status: state.status,
      message: state.message,
      setToken,
      clearToken,
      reportError,
      waitForValidToken,
    }),
    [state, setToken, clearToken, reportError, waitForValidToken],
  );

  return <ApiAuthContext.Provider value={value}>{children}</ApiAuthContext.Provider>;
}

export function useApiAuth() {
  const context = useContext(ApiAuthContext);
  if (!context) {
    throw new Error("useApiAuth must be used within an ApiAuthProvider");
  }
  return context;
}

export function useApiTokenPrompt(message = "Enter API token") {
  const { setToken } = useApiAuth();
  return useCallback(() => {
    if (typeof window === "undefined") return null;
    const input = window.prompt(message);
    const normalized = input?.trim();
    if (normalized) {
      setToken(normalized);
      return normalized;
    }
    return null;
  }, [setToken, message]);
}

export type { ApiAuthStatus };
