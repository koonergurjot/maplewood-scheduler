import { useEffect, useState } from "react";

import {
  getOfflineStatus,
  subscribeOfflineStatus,
  type OfflineStatus,
} from "../utils/offlineQueue";

export function useOfflineStatus(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>(() => getOfflineStatus());

  useEffect(() => {
    const unsubscribe = subscribeOfflineStatus((next) => {
      setStatus(next);
    });
    return unsubscribe;
  }, []);

  return status;
}

export default useOfflineStatus;
