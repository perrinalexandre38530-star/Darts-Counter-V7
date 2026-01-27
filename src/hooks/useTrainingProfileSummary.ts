import { useEffect, useMemo, useState } from "react";
import { fetchTrainingProfileSummary } from "../training/sync/trainingProfileApi";
import { useAuthOnline } from "./useAuthOnline";
import { awardTrainingBadgesFromSummary } from "../training/profile/trainingBadgeAwarder";

export function useTrainingProfileSummary() {
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
        const s = await fetchTrainingProfileSummary(user.id);
        if (!alive) return;
        setSummary(s);
        // best-effort badge awarding (idempotent)
        awardTrainingBadgesFromSummary(s).catch(() => void 0);
      } catch (e) {
        if (!alive) return;
        setError(e);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [user, online]);

  return { summary, loading, error };
}
