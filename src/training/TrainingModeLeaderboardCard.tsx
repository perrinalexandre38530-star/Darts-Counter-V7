import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../lib/supabaseClient";

type Row = {
  user_id: string;
  public_name: string;
  metric: "time" | "score" | string;
  best_score: number | null;
  best_time_ms: number | null;
  plays: number;
  last_played_at: string | null;
  tier: string | null;
};

function fmtMs(ms?: number | null) {
  if (!ms && ms !== 0) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  const mm = m > 0 ? String(m) + "m " : "";
  return mm + String(r) + "s";
}

export default function TrainingModeLeaderboardCard({
  modeId,
  modeLabel,
}: {
  modeId: string;
  modeLabel: string;
}) {
  const { theme } = useTheme();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      if (!modeId) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc("get_training_mode_leaderboard", {
          p_mode_id: modeId,
          p_limit: 20,
        });
        if (error) throw error;
        if (!alive) return;
        setRows((data as any) || []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Erreur leaderboard");
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
  }, [modeId]);

  const card: React.CSSProperties = {
    marginTop: 10,
    borderRadius: 16,
    padding: 12,
    border: `1px solid ${theme.primary}44`,
    background: "rgba(0,0,0,0.35)",
    boxShadow: `0 0 18px ${theme.primary}22`,
  };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 900, color: theme.primary }}>{modeLabel} — Classement</div>
        {loading ? <div style={{ fontSize: 12, opacity: 0.75 }}>Chargement…</div> : null}
      </div>

      {error ? (
        <div style={{ marginTop: 8, color: "tomato", fontSize: 12 }}>{error}</div>
      ) : null}

      <div style={{ marginTop: 10 }}>
        {rows && rows.length === 0 && !loading ? (
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Aucun score sync (table training_stats_events vide ou non sync).
          </div>
        ) : null}

        {rows && rows.length ? (
          <div style={{ display: "grid", gap: 6 }}>
            {rows.slice(0, 20).map((r, idx) => (
              <div
                key={r.user_id + ":" + idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 90px 52px",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontWeight: 900, opacity: 0.85 }}>#{idx + 1}</div>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 800 }}>{r.public_name}</span>
                  <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.75 }}>
                    ({r.plays} partie{r.plays > 1 ? "s" : ""})
                  </span>
                </div>
                <div style={{ textAlign: "right", fontWeight: 900 }}>
                  {r.metric === "time" ? fmtMs(r.best_time_ms) : (r.best_score ?? "—")}
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 900,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.18)",
                    padding: "2px 8px",
                    background: "rgba(0,0,0,0.2)",
                  }}
                  title="Tier"
                >
                  {(r.tier || "D").toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
