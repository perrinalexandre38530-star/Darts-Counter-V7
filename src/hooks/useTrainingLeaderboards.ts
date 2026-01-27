import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type PeriodFilter = "all" | "7d" | "30d";
export type BoardScope = "global" | "mode";

export type TrainingLeaderboardRow = {
  user_id: string;
  public_name: string;
  avatar_url?: string | null;
  plays?: number;
  best_score?: number | null;
  best_time_ms?: number | null;
  tier?: string | null;
  last_played_at?: string | null;
};

function periodToDays(p: PeriodFilter): number | null {
  if (p === "7d") return 7;
  if (p === "30d") return 30;
  return null;
}

export function useTrainingLeaderboards(params: {
  scope: BoardScope;
  modeId?: string | null;
  period: PeriodFilter;
  includeBots: boolean;
  limit: number;
}) {
  const { scope, modeId, period, includeBots, limit } = params;
  const [rows, setRows] = useState<TrainingLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const days = useMemo(() => periodToDays(period), [period]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (scope === "global") {
          const { data, error } = await supabase.rpc("get_training_global_leaderboard", {
            p_limit: limit,
            p_period_days: days,
            p_include_bots: includeBots,
          });
          if (error) throw error;
          if (!alive) return;
          setRows((data as any) || []);
          return;
        }

        // scope === "mode"
        if (!modeId) {
          if (!alive) return;
          setRows([]);
          return;
        }

        const { data, error } = await supabase.rpc("get_training_mode_leaderboard_v2", {
          p_mode_id: modeId,
          p_limit: limit,
          p_period_days: days,
          p_include_bots: includeBots,
        });
        if (error) throw error;
        if (!alive) return;
        setRows((data as any) || []);
      } catch (e) {
        if (!alive) return;
        setError(e);
        setRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [scope, modeId, days, includeBots, limit]);

  return { rows, loading, error };
}
