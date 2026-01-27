import { useEffect } from "react";
import { syncTrainingEvents } from "./trainingSyncEngine";
import { useAuthOnline } from "../../hooks/useAuthOnline";

export function useTrainingAutoSync() {
  const { user, online } = useAuthOnline();

  useEffect(() => {
    if (!user || !online) return;
    syncTrainingEvents(user.id);
  }, [user, online]);
}