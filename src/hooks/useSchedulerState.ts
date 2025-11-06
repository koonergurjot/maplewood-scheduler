import { useState } from "react";

import { useSchedulerStore, type PersistedState } from "../store/schedulerStore";
import { loadState } from "../utils/storage";

export type { PersistedState } from "../store/schedulerStore";

export function useSchedulerState(persistedArg?: PersistedState | null) {
  const [persisted] = useState<PersistedState | null>(() => {
    if (persistedArg !== undefined) {
      return persistedArg ?? null;
    }
    return loadState<PersistedState>() ?? null;
  });

  return useSchedulerStore(persisted ?? undefined);
}

export default useSchedulerState;
