import { useEffect, useState } from "react";
import { useAuthOnline } from "./useAuthOnline";
import { fetchTrainingProfileSummaryModes } from "../training/sync/trainingProfileApi";
// NOTE: keep this hook resilient.
// Badge awarding is best-effort and must never crash the app if the Training module
// is temporarily unavailable or a file got out of sync in a patch.

export function useTrainingProfileSummaryModes() {
  const { user, online } = useAuthOnline();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!user || !online) return;
      setLoading(true);
      setError(null);
      try {
        const s = await fetchTrainingProfileSummaryModes(user.id);
        if (!alive) return;
        setSummary(s);
        // best-effort badge awarding (idempotent)
        import("../training/profile/trainingBadgeAwarder")
          .then((m) => m.awardTrainingBadgesFromModesSummary?.(s))
          .catch(() => void 0);
      } catch (e) {
        if (!alive) return;
        setError(e);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [user, online]);

  return { summary, loading, error };
}
