import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSchedulerState } from "./useSchedulerState";
import { DEFAULT_NOTIFICATION_PREFS } from "../state/useNotificationPrefs";

const storageMocks = vi.hoisted(() => ({
  loadState: vi.fn(),
  saveState: vi.fn(),
}));

vi.mock("../utils/storage", () => storageMocks);

const mockLoadState = storageMocks.loadState as ReturnType<typeof vi.fn>;
const mockSaveState = storageMocks.saveState as ReturnType<typeof vi.fn>;

describe("useSchedulerState", () => {
  beforeEach(() => {
    mockLoadState.mockReset();
    mockSaveState.mockReset();
    mockLoadState.mockReturnValue(null);
  });

  it("persists notification preferences when provided", async () => {
    const prefs = {
      ...DEFAULT_NOTIFICATION_PREFS,
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const { rerender } = renderHook(({ notificationPrefs }) =>
      useSchedulerState({ notificationPrefs }),
    {
      initialProps: { notificationPrefs: prefs },
    });

    await waitFor(() => {
      expect(mockSaveState).toHaveBeenCalled();
    });

    expect(mockSaveState).toHaveBeenLastCalledWith(
      expect.objectContaining({ notificationPrefs: prefs }),
    );

    const updatedPrefs = {
      ...prefs,
      updatedAt: "2024-01-02T00:00:00.000Z",
      channels: {
        ...prefs.channels,
        email: { ...prefs.channels.email, enabled: true },
      },
    };

    rerender({ notificationPrefs: updatedPrefs });

    await waitFor(() => {
      expect(mockSaveState).toHaveBeenCalledTimes(2);
      expect(mockSaveState).toHaveBeenLastCalledWith(
        expect.objectContaining({ notificationPrefs: updatedPrefs }),
      );
    });
  });
});

