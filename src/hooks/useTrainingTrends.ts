import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getTrainingModeMetric, performanceFromEvent } from "../training/lib/trainingCanonical";
import { useAuthOnline } from "./useAuthOnline";

type TrendState = {
  loading: boolean;
  error: any;
  // last 14 days performance (higher is better)
  spark14: number[];
  best7: number | null;
  prev7: number | null;
  best30: number | null;
  prev30: number | null;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function pickBest(list: number[]) {
  if (!list.length) return null;
  return Math.max(...list);
}

export function useTrainingTrends(params: { modeId?: string | null }) {
  const { modeId } = params;
  const { user, status } = useAuthOnline();
  const online = status === "signed_in";
  const [state, setState] = useState<TrendState>({
    loading: false,
    error: null,
    spark14: [],
    best7: null,
    prev7: null,
    best30: null,
    prev30: null,
  });

  const metric = useMemo(() => getTrainingModeMetric(modeId), [modeId]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!user || !online) {
        setState((s) => ({ ...s, loading: false, error: null, spark14: [], best7: null, prev7: null, best30: null, prev30: null }));
        return;
      }
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        // Fetch last ~60 days for trend windows
        const since = daysAgo(60).toISOString();
        let q = supabase
          .from("training_stats_events")
          .select("created_at,mode_id,score,duration_ms")
          .eq("user_id", user.id)
          .gte("created_at", since)
          .order("created_at", { ascending: true });

        if (modeId) q = q.eq("mode_id", modeId);

        const { data, error } = await q;
        if (error) throw error;

        const rows = (data as any[]) || [];
        // group by day -> best performance that day
        const byDay = new Map<string, number>();
        for (const r of rows) {
          const perf = performanceFromEvent(modeId ?? r.mode_id, r);
          if (perf == null) continue;
          const day = startOfDay(new Date(r.created_at)).toISOString().slice(0, 10);
          const prev = byDay.get(day);
          if (prev == null || perf > prev) byDay.set(day, perf);
        }

        // build 14-day sparkline ending today (inclusive)
        const spark: number[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = startOfDay(daysAgo(i));
          const key = d.toISOString().slice(0, 10);
          spark.push(byDay.get(key) ?? 0);
        }

        // window helpers
        const bestLast7 = pickBest(spark.slice(7)); // last 7 points
        const bestPrev7 = pickBest(spark.slice(0, 7));

        // 30-day best / prev 30 (use byDay map)
        const best30List: number[] = [];
        const prev30List: number[] = [];
        for (let i = 0; i < 30; i++) {
          const key = startOfDay(daysAgo(i)).toISOString().slice(0, 10);
          const v = byDay.get(key);
          if (v != null) best30List.push(v);
        }
        for (let i = 30; i < 60; i++) {
          const key = startOfDay(daysAgo(i)).toISOString().slice(0, 10);
          const v = byDay.get(key);
          if (v != null) prev30List.push(v);
        }
        const best30 = pickBest(best30List);
        const prev30 = pickBest(prev30List);

        if (!alive) return;
        setState({ loading: false, error: null, spark14: spark, best7: bestLast7, prev7: bestPrev7, best30, prev30 });
      } catch (e) {
        if (!alive) return;
        setState((s) => ({ ...s, loading: false, error: e }));
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [user?.id, online, modeId, metric]);

  return { ...state, metric };
}
