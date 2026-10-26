import { useEffect } from "react";
import { useAuthOnline } from "../../hooks/useAuthOnline";
import { requestGlobalSync } from "../../lib/sync/syncOrchestrator";

export function useTrainingAutoSync(enabled: boolean = true) {
  const { user } = useAuthOnline();

  useEffect(() => {
    if (!enabled || !user) return;
    try {
      localStorage.setItem("dc_user_id", user.id);
    } catch {}

    // OFFLINE-FIRST W6 : plus de timer/focus/online propre au Training.
    // Le coordinateur global pilote la queue et son backoff.
    requestGlobalSync("training-auth-ready", { delayMs: 1_000 });
  }, [user, enabled]);
}
