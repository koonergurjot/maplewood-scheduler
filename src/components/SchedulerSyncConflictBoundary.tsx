import { useCallback, useEffect, useMemo, useState } from "react";

import { parsePersistedStatePayload } from "../store/persistedState";
import type { PersistedState, SyncConflict } from "../store/schedulerStore";
import { getToken } from "../utils/api";

import Button from "./ui/Button";
import Modal from "./ui/Modal";
import Toast from "./ui/Toast";

type Props = {
  conflict: SyncConflict | null;
  clearConflict: () => void;
  setConflictVersion: (value: number | null) => void;
  applyServerSnapshot: (persistedState: PersistedState) => void;
  confirmDiscard: (message: string, title?: string) => Promise<boolean>;
};

const DISCARD_CONFIRM_MESSAGE =
  "Refreshing will discard any local changes that have not synced yet. Continue?";
const DISCARD_CONFIRM_TITLE = "Discard unsynced changes?";

function createEmptyPersistedState(): PersistedState {
  return {
    employees: [],
    vacations: [],
    vacancies: [],
    bids: [],
    archivedBids: {},
    settings: undefined,
    vacancyRanges: [],
    version: undefined,
    updatedAt: undefined,
  };
}

export default function SchedulerSyncConflictBoundary({
  conflict,
  clearConflict,
  setConflictVersion,
  applyServerSnapshot,
  confirmDiscard,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (conflict) {
      setToastOpen(true);
      setModalOpen(true);
    } else {
      setToastOpen(false);
      setModalOpen(false);
    }
  }, [conflict]);

  useEffect(() => {
    if (!errorToast) return;
    const timer = setTimeout(() => setErrorToast(null), 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [errorToast]);

  const serverVersionLabel = useMemo(() => {
    if (!conflict) return "Unknown";
    return conflict.serverVersion === null
      ? "Unknown"
      : `v${conflict.serverVersion}`;
  }, [conflict]);

  const updatedAtLabel = useMemo(() => {
    if (!conflict?.updatedAt) return "Unknown";
    return conflict.updatedAt;
  }, [conflict]);

  const handleRefresh = useCallback(async () => {
    if (!conflict || refreshing) return;
    const confirmed = await confirmDiscard(
      DISCARD_CONFIRM_MESSAGE,
      DISCARD_CONFIRM_TITLE,
    );
    if (!confirmed) return;

    const token = getToken();
    if (!token) {
      setErrorToast("Missing authentication token. Unable to refresh.");
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetch("/api/scheduler-state", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        applyServerSnapshot(createEmptyPersistedState());
        clearConflict();
        return;
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      let payload: any = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const remoteState = parsePersistedStatePayload(payload);
      if (remoteState) {
        applyServerSnapshot(remoteState);
      } else {
        applyServerSnapshot(createEmptyPersistedState());
      }
      clearConflict();
    } catch (error) {
      console.error("Failed to refresh scheduler state after conflict", error);
      setErrorToast("Unable to refresh remote state. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [
    applyServerSnapshot,
    clearConflict,
    confirmDiscard,
    conflict,
    refreshing,
  ]);

  const handleOverwrite = useCallback(() => {
    if (!conflict) return;
    const baseVersion =
      typeof conflict.serverVersion === "number"
        ? conflict.serverVersion
        : typeof conflict.snapshot.version === "number"
          ? conflict.snapshot.version
          : null;
    const nextVersion = baseVersion === null ? null : baseVersion + 1;
    setConflictVersion(nextVersion);
    clearConflict();
  }, [clearConflict, conflict, setConflictVersion]);

  return (
    <>
      <Toast
        open={toastOpen}
        message="Newer changes were saved on the server."
        actionLabel="Resolve"
        onAction={() => setModalOpen(true)}
      />
      <Toast open={!!errorToast} message={errorToast ?? ""} />
      <Modal
        open={modalOpen && !!conflict}
        title="Sync conflict detected"
        onClose={() => setModalOpen(false)}
      >
        <div className="wrap-anywhere" style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0 }}>
            Another browser or user saved a newer scheduler state.
            Refreshing will load their version; overwriting will resend your
            changes as the next version.
          </p>
          <div
            style={{
              display: "grid",
              gap: 4,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            <div>
              <strong>Server version:</strong> {serverVersionLabel}
            </div>
            <div>
              <strong>Updated at:</strong> {updatedAtLabel}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="secondary"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={handleOverwrite}
              disabled={refreshing}
            >
              Overwrite
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
