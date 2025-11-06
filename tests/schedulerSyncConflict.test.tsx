import { vi, beforeAll, afterAll, afterEach, beforeEach, describe, expect, test } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import SchedulerSyncConflictBoundary from "../src/components/SchedulerSyncConflictBoundary";
import type { PersistedState, SyncConflict } from "../src/store/schedulerStore";
import { createSchedulerPersistenceManager } from "../src/store/schedulerPersistence";
import * as api from "../src/utils/api";

vi.mock("../src/store/utils", () => {
  return {
    debounce<T extends (...args: any[]) => void>(fn: T) {
      let scheduledArgs: Parameters<T> | null = null;
      let scheduled = false;
      const debounced = ((...args: Parameters<T>) => {
        scheduledArgs = args;
        if (scheduled) return;
        scheduled = true;
        Promise.resolve().then(() => {
          scheduled = false;
          if (scheduledArgs) {
            fn(...scheduledArgs);
            scheduledArgs = null;
          }
        });
      }) as T & { cancel: () => void };
      debounced.cancel = () => {
        scheduled = false;
        scheduledArgs = null;
      };
      return debounced;
    },
  };
});

const server = setupServer();
const tokenSpy = vi.spyOn(api, "getToken");

const SETTINGS = {
  responseWindows: { lt2h: 1, h2to4: 2, h4to24: 3, h24to72: 4, gt72: 5 },
};

const INITIAL_STATE: PersistedState = {
  employees: [],
  vacations: [],
  vacancies: [],
  bids: [],
  archivedBids: {},
  settings: SETTINGS,
  vacancyRanges: [],
  version: 4,
  updatedAt: "2024-04-01T00:00:00.000Z",
};

const LOCAL_VACANCY = {
  id: "local-vacancy",
  reason: "Local edit",
  classification: "Registered Nurse" as const,
  date: "2024-04-10",
  shiftDate: "2024-04-10",
  shiftStart: "07:00",
  shiftEnd: "15:00",
  knownAt: "2024-04-01T12:00:00.000Z",
  offeringTier: "TierA",
  offeringStep: "Casuals" as const,
  status: "Open" as const,
};

const REMOTE_STATE: PersistedState = {
  employees: [],
  vacations: [],
  vacancies: [
    {
      id: "remote-vacancy",
      reason: "Server copy",
      classification: "Registered Nurse",
      date: "2024-05-01",
      shiftDate: "2024-05-01",
      shiftStart: "07:00",
      shiftEnd: "15:00",
      knownAt: "2024-04-25T09:00:00.000Z",
      offeringTier: "TierA",
      offeringStep: "Casuals",
      status: "Open",
    },
  ],
  bids: [],
  archivedBids: {},
  settings: SETTINGS,
  vacancyRanges: [],
  version: 7,
  updatedAt: "2024-05-01T12:00:00.000Z",
};

const DISCARD_MESSAGE =
  "Refreshing will discard any local changes that have not synced yet. Continue?";
const DISCARD_TITLE = "Discard unsynced changes?";

type ConfirmFn = (message: string, title?: string) => Promise<boolean>;

type HarnessProps = {
  confirm?: ConfirmFn;
};

function SchedulerHarness({ confirm }: HarnessProps) {
  const [snapshot, setSnapshot] = useState<PersistedState>(INITIAL_STATE);
  const [syncConflict, setSyncConflict] = useState<SyncConflict | null>(null);

  const managerRef = useRef(
    createSchedulerPersistenceManager({
      onServerAck(persisted) {
        setSnapshot(persisted);
        setSyncConflict(null);
      },
      onConflict(details) {
        setSyncConflict(details);
      },
      debounceMs: 0,
    }),
  );

  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    return () => {
      managerRef.current.dispose();
    };
  }, []);

  const queueSnapshot = () => {
    managerRef.current.queue(snapshotRef.current);
  };

  const mutateSnapshot = () => {
    setSnapshot((prev) => {
      const nextVacancies = [...(prev.vacancies ?? []), LOCAL_VACANCY];
      return { ...prev, vacancies: nextVacancies };
    });
    Promise.resolve().then(queueSnapshot);
  };

  const clearConflict = () => setSyncConflict(null);

  const setConflictVersion = (value: number | null) => {
    setSnapshot((prev) => {
      const next = { ...prev, version: value ?? undefined };
      return next;
    });
    Promise.resolve().then(queueSnapshot);
  };

  const applyServerSnapshot = (persisted: PersistedState) => {
    setSnapshot(persisted);
    setSyncConflict(null);
  };

  const confirmDiscard = confirm ?? (() => Promise.resolve(true));

  return (
    <>
      <button type="button" onClick={mutateSnapshot}>
        Mutate snapshot
      </button>
      <div data-testid="version">{snapshot.version ?? "null"}</div>
      <div data-testid="vacancy-names">
        {(snapshot.vacancies ?? []).map((vacancy) => vacancy.id).join(",")}
      </div>
      <SchedulerSyncConflictBoundary
        conflict={syncConflict}
        clearConflict={clearConflict}
        setConflictVersion={setConflictVersion}
        applyServerSnapshot={applyServerSnapshot}
        confirmDiscard={confirmDiscard}
      />
    </>
  );
}

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  tokenSpy.mockReset();
});
afterAll(() => server.close());

beforeEach(() => {
  tokenSpy.mockReturnValue("test-token");
});

describe("Scheduler sync conflict boundary", () => {
  test("refresh path discards local changes and loads remote state", async () => {
    const postBodies: any[] = [];
    const confirmMock = vi.fn().mockResolvedValue(true);

    server.use(
      http.post("/api/scheduler-state", async ({ request }) => {
        postBodies.push(await request.json());
        return HttpResponse.json(
          {
            serverVersion: REMOTE_STATE.version,
            updatedAt: REMOTE_STATE.updatedAt,
          },
          { status: 409 },
        );
      }),
      http.get("/api/scheduler-state", () =>
        HttpResponse.json(
          {
            state: REMOTE_STATE,
            version: REMOTE_STATE.version,
            updatedAt: REMOTE_STATE.updatedAt,
          },
          { status: 200 },
        ),
      ),
    );

    render(<SchedulerHarness confirm={confirmMock} />);

    await act(async () => {
      const mutateButtons = screen.getAllByRole("button", { name: "Mutate snapshot" });
      fireEvent.click(mutateButtons[0]);
    });
    await Promise.resolve();

    await waitFor(() => expect(postBodies.length).toBeGreaterThanOrEqual(1));
    await waitFor(() =>
      expect(screen.queryAllByText(/Sync conflict detected/).length).toBeGreaterThan(0),
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith(DISCARD_MESSAGE, DISCARD_TITLE),
    );

    await waitFor(() =>
      expect(screen.getAllByTestId("vacancy-names")[0].textContent).toBe("remote-vacancy"),
    );
    await waitFor(() =>
      expect(screen.getAllByTestId("version")[0].textContent).toBe(
        String(REMOTE_STATE.version),
      ),
    );
    await waitFor(() => expect(screen.queryByText(/Sync conflict detected/)).toBeNull());
  });

  test("overwrite path retries with the server version + 1", async () => {
    const postBodies: any[] = [];
    let postCount = 0;

    server.use(
      http.post("/api/scheduler-state", async ({ request }) => {
        postCount += 1;
        const body = await request.json();
        postBodies.push(body);
        if (postCount === 1) {
          return HttpResponse.json(
            {
              serverVersion: REMOTE_STATE.version,
              updatedAt: REMOTE_STATE.updatedAt,
            },
            { status: 409 },
          );
        }
        return HttpResponse.json(
          { version: REMOTE_STATE.version + 1 },
          { status: 200 },
        );
      }),
    );

    render(<SchedulerHarness />);

    await act(async () => {
      const mutateButtons = screen.getAllByRole("button", { name: "Mutate snapshot" });
      fireEvent.click(mutateButtons[0]);
    });
    await Promise.resolve();

    await waitFor(() => expect(postBodies.length).toBeGreaterThanOrEqual(1));
    await waitFor(() =>
      expect(screen.queryAllByText(/Sync conflict detected/).length).toBeGreaterThan(0),
    );

    fireEvent.click(screen.getByRole("button", { name: "Overwrite" }));

    await waitFor(() => expect(postBodies.length).toBeGreaterThanOrEqual(2));
    expect(postBodies[1].version).toBe(REMOTE_STATE.version + 1);

    await waitFor(() =>
      expect(screen.getAllByTestId("version")[0].textContent).toBe(
        String(REMOTE_STATE.version + 1),
      ),
    );
    expect(screen.getAllByTestId("vacancy-names")[0].textContent).toContain(
      "local-vacancy",
    );
    await waitFor(() => expect(screen.queryByText(/Sync conflict detected/)).toBeNull());
  });
});
