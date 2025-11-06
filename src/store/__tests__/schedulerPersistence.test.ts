import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSchedulerPersistenceManager,
  MAX_SNAPSHOT_BYTES,
} from "../schedulerPersistence";
import type { PersistedState } from "../schedulerStore";
import { __resetOfflineQueueForTests } from "../../utils/offlineQueue";

const apiMocks = vi.hoisted(() => ({
  getToken: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  saveState: vi.fn(),
}));

vi.mock("../../utils/api", () => apiMocks);
vi.mock("../../utils/storage", () => storageMocks);

const mockGetToken = apiMocks.getToken as ReturnType<typeof vi.fn>;
const mockSaveState = storageMocks.saveState as ReturnType<typeof vi.fn>;

describe("createSchedulerPersistenceManager", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    mockGetToken.mockReset();
    mockSaveState.mockReset();
    __resetOfflineQueueForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  const baseSnapshot: PersistedState = {
    employees: [],
    vacations: [],
    vacancies: [],
    bids: [],
    archivedBids: {},
    settings: {
      responseWindows: { lt2h: 1, h2to4: 2, h4to24: 3, h24to72: 4, gt72: 5 },
    },
    vacancyRanges: [],
    version: 1,
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  it("debounces rapid updates and only posts the last snapshot", async () => {
    mockGetToken.mockReturnValue("token");
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        version: 5,
        updatedAt: "2024-02-01T00:00:00.000Z",
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const onServerAck = vi.fn();
    const onConflict = vi.fn();
    const manager = createSchedulerPersistenceManager({
      onServerAck,
      onConflict,
      debounceMs: 100,
    });

    manager.queue({ ...baseSnapshot, version: 1 });
    manager.queue({ ...baseSnapshot, version: 2 });
    manager.queue({ ...baseSnapshot, version: 3 });

    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.state.version).toBe(3);
    expect(body.version).toBe(3);

    await Promise.resolve();

    expect(mockSaveState).toHaveBeenCalledWith(
      expect.objectContaining({ version: 5, updatedAt: "2024-02-01T00:00:00.000Z" }),
    );
    expect(onServerAck).toHaveBeenCalledWith(
      expect.objectContaining({ version: 5, updatedAt: "2024-02-01T00:00:00.000Z" }),
    );

    manager.dispose();
  });

  it("aborts in-flight requests when a new snapshot is queued", async () => {
    mockGetToken.mockReturnValue("token");
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn().mockImplementation(async (_input, init: RequestInit = {}) => {
      if (init.signal) {
        signals.push(init.signal);
      }
      return {
        status: 200,
        json: async () => ({ version: init.body ? JSON.parse(init.body as string).version : 1 }),
      };
    });
    global.fetch = fetchMock as typeof fetch;

    const manager = createSchedulerPersistenceManager({
      onServerAck: vi.fn(),
      onConflict: vi.fn(),
      debounceMs: 100,
    });

    manager.queue({ ...baseSnapshot, version: 10 });
    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(false);

    manager.queue({ ...baseSnapshot, version: 11 });
    await vi.advanceTimersByTimeAsync(100);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signals[0]?.aborted).toBe(true);

    manager.dispose();
  });

  it("notifies when a snapshot exceeds the maximum payload size", async () => {
    mockGetToken.mockReturnValue("token");
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const onOversizedSnapshot = vi.fn();
    const manager = createSchedulerPersistenceManager({
      onServerAck: vi.fn(),
      onConflict: vi.fn(),
      onOversizedSnapshot,
      debounceMs: 0,
    });

    const largeString = "x".repeat(MAX_SNAPSHOT_BYTES + 10);
    manager.queue({ ...baseSnapshot, large: largeString } as PersistedState);

    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(onOversizedSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ bytes: expect.any(Number) }),
    );
    expect(fetchMock).not.toHaveBeenCalled();

    manager.dispose();
  });
});
