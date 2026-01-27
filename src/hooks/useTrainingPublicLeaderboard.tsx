import React from "react";
import type { TrainingLeaderboardRow } from "../training/sync/trainingLeaderboardApi";
import { fetchTrainingPublicLeaderboard } from "../training/sync/trainingLeaderboardApi";

export function useTrainingPublicLeaderboard(modeId: string | null, limit = 20) {
  const [rows, setRows] = React.useState<TrainingLeaderboardRow[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    if (!modeId) return;

    setLoading(true);
    setError(null);

    fetchTrainingPublicLeaderboard(modeId, limit)
      .then((r) => {
        if (!alive) return;
        setRows(r);
      })
      .catch((e: any) => {
        if (!alive) return;
        setRows(null);
        setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [modeId, limit]);

  return { rows, loading, error };
}
