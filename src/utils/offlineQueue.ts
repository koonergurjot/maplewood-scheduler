type OfflineStatus = {
  isOffline: boolean;
  queueSize: number;
  nextRetryInMs: number | null;
};

type OfflineStatusListener = (status: OfflineStatus) => void;

type QueuedRequest = {
  input: RequestInfo | URL;
  init: RequestInit;
  attempts: number;
  resolve: (response: Response) => void;
  reject: (reason?: unknown) => void;
  originalSignal: AbortSignal | null;
};

const listeners = new Set<OfflineStatusListener>();

const queue: QueuedRequest[] = [];

let signalBridge = new WeakMap<AbortSignal, AbortController>();

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;

let currentStatus: OfflineStatus = {
  isOffline: false,
  queueSize: 0,
  nextRetryInMs: null,
};

let processing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const ABORT_ERROR = typeof DOMException !== "undefined"
  ? new DOMException("Aborted", "AbortError")
  : ((): Error => {
      const error = new Error("Aborted");
      (error as Error & { name: string }).name = "AbortError";
      return error;
    })();

function isAbortError(value: unknown): boolean {
  return (value as DOMException | undefined)?.name === "AbortError";
}

function computeDelay(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  const delay = BASE_DELAY_MS * 2 ** exponent;
  return Math.min(MAX_DELAY_MS, delay);
}

function registerSignalBridge(signal: AbortSignal | null, controller: AbortController) {
  if (!signal) return;
  signalBridge.set(signal, controller);
}

function cloneHeaders(headers: HeadersInit | undefined): HeadersInit | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    return new Headers(headers);
  }
  if (Array.isArray(headers)) {
    return headers.map(([key, value]) => [key, value]) as HeadersInit;
  }
  return { ...headers };
}

function cloneBody(body: BodyInit | null | undefined): BodyInit | undefined {
  if (body === null || body === undefined) return undefined;
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  if (body instanceof Blob) {
    return body.slice();
  }
  if (body instanceof FormData) {
    const clone = new FormData();
    body.forEach((value, key) => {
      clone.append(key, value as string | Blob);
    });
    return clone;
  }
  if (body instanceof ArrayBuffer) {
    return body.slice(0);
  }
  if (ArrayBuffer.isView(body)) {
    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
  }
  console.warn("Unsupported request body type for offline retry; request will not be retried.");
  return undefined;
}

function normalizeInit(init: RequestInit): RequestInit {
  const { signal: _signal, headers, body, ...rest } = init;
  const normalized: RequestInit = {
    ...rest,
  };
  if (headers) {
    normalized.headers = cloneHeaders(headers);
  }
  if (body !== undefined && body !== null) {
    normalized.body = cloneBody(body as BodyInit);
  }
  return normalized;
}

function getNavigatorOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

function emitStatus(nextRetryInMs: number | null) {
  const queueSize = queue.length;
  const isOffline = queueSize > 0 || !getNavigatorOnline();
  const nextDelay = queueSize > 0 ? nextRetryInMs : null;
  const nextStatus: OfflineStatus = {
    isOffline,
    queueSize,
    nextRetryInMs: nextDelay,
  };
  if (
    currentStatus.isOffline === nextStatus.isOffline &&
    currentStatus.queueSize === nextStatus.queueSize &&
    currentStatus.nextRetryInMs === nextStatus.nextRetryInMs
  ) {
    return;
  }
  currentStatus = nextStatus;
  listeners.forEach((listener) => listener(currentStatus));
}

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleNextAttempt(delay: number) {
  clearRetryTimer();
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void processQueue();
  }, delay);
}

async function processQueue(): Promise<void> {
  if (processing) return;
  if (queue.length === 0) {
    emitStatus(null);
    return;
  }

  processing = true;
  const request = queue[0];

  if (request.originalSignal?.aborted) {
    queue.shift();
    processing = false;
    request.reject(ABORT_ERROR);
    emitStatus(queue.length > 0 ? computeDelay(queue[0].attempts) : null);
    if (queue.length > 0) {
      scheduleNextAttempt(computeDelay(queue[0].attempts));
    }
    return;
  }

  const controller = new AbortController();
  const abortHandler = () => controller.abort();
  if (request.originalSignal) {
    request.originalSignal.addEventListener("abort", abortHandler, { once: true });
    registerSignalBridge(request.originalSignal, controller);
  }

  let response: Response | null = null;
  let error: unknown = null;

  try {
    response = await fetch(request.input, {
      ...request.init,
      signal: controller.signal,
    });
  } catch (err) {
    error = err;
  } finally {
    if (request.originalSignal) {
      request.originalSignal.removeEventListener("abort", abortHandler);
      if (request.originalSignal.aborted && !controller.signal.aborted) {
        controller.abort();
      }
    }
  }

  const aborted = isAbortError(error) || request.originalSignal?.aborted;
  const shouldRetry = !aborted && (
    (response ? response.status >= 500 && response.status < 600 : true)
  );

  if (shouldRetry) {
    request.attempts += 1;
    processing = false;
    const delay = computeDelay(request.attempts);
    emitStatus(delay);
    scheduleNextAttempt(delay);
    return;
  }

  queue.shift();
  processing = false;

  if (aborted) {
    request.reject(error ?? ABORT_ERROR);
  } else if (error) {
    request.reject(error);
  } else if (response) {
    request.resolve(response);
  }

  if (queue.length > 0) {
    const delay = computeDelay(queue[0].attempts);
    emitStatus(delay);
    scheduleNextAttempt(delay);
  } else {
    emitStatus(null);
  }
}

function enqueueRequest(request: QueuedRequest) {
  if (request.originalSignal?.aborted) {
    request.reject(ABORT_ERROR);
    return;
  }
  queue.push(request);
  const delay = computeDelay(queue[0].attempts);
  emitStatus(delay);
  if (!processing && retryTimer === null) {
    scheduleNextAttempt(delay);
  }
}

async function attemptImmediate(
  input: RequestInfo | URL,
  init: RequestInit,
  originalSignal: AbortSignal | null,
): Promise<Response> {
  const controller = new AbortController();
  const abortHandler = () => controller.abort();
  if (originalSignal) {
    if (originalSignal.aborted) {
      throw ABORT_ERROR;
    }
    originalSignal.addEventListener("abort", abortHandler, { once: true });
    registerSignalBridge(originalSignal, controller);
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    if (originalSignal) {
      originalSignal.removeEventListener("abort", abortHandler);
      if (originalSignal.aborted && !controller.signal.aborted) {
        controller.abort();
      }
    }
  }
}

function enqueueForRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  originalSignal: AbortSignal | null,
  attempts: number,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const request: QueuedRequest = {
      input,
      init,
      attempts,
      resolve,
      reject,
      originalSignal,
    };
    enqueueRequest(request);
  });
}

export async function queuedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const normalizedInit = normalizeInit(init);
  const originalSignal = init.signal ?? null;

  try {
    const response = await attemptImmediate(input, normalizedInit, originalSignal);
    if (response.status >= 500 && response.status < 600) {
      return enqueueForRetry(input, normalizedInit, originalSignal, 1);
    }
    return response;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return enqueueForRetry(input, normalizedInit, originalSignal, 1);
  }
}

export function getOfflineStatus(): OfflineStatus {
  return currentStatus;
}

export function subscribeOfflineStatus(
  listener: OfflineStatusListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function triggerOfflineQueueFlush() {
  clearRetryTimer();
  if (!processing) {
    void processQueue();
  }
}

export function abortQueuedFetchSignal(signal: AbortSignal) {
  const controller = signalBridge.get(signal);
  if (controller && !controller.signal.aborted) {
    controller.abort();
  }
  signalBridge.delete(signal);
}

export function __resetOfflineQueueForTests() {
  clearRetryTimer();
  queue.splice(0, queue.length);
  processing = false;
  signalBridge = new WeakMap();
  emitStatus(null);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    emitStatus(queue.length > 0 ? computeDelay(queue[0].attempts) : null);
    triggerOfflineQueueFlush();
  });
  window.addEventListener("offline", () => {
    emitStatus(queue.length > 0 ? computeDelay(queue[0].attempts) : null);
  });
}

export type { OfflineStatus };
