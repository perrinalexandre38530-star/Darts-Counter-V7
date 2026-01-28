import React, { useMemo, useState } from "react";
import { useTrainingLeaderboards, type PeriodFilter, type BoardScope } from "../../hooks/useTrainingLeaderboards";
import { useTrainingTrends } from "../../hooks/useTrainingTrends";
import { formatCanonical, formatMetricLabel } from "../../training/lib/trainingCanonical";

const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: "8px 10px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.25)",
  fontWeight: 900,
  letterSpacing: 0.4,
  cursor: "pointer",
};

const card: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.25)",
  padding: 12,
};

type SparklineProps = {
  values: number[];
};

function Sparkline(props: SparklineProps) {
  const { values } = props;
  const w = 160;
  const h = 42;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = Math.max(1e-9, max - min);
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (w - 2) + 1;
      const y = h - 1 - ((v - min) / span) * (h - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ opacity: 0.95 }}>
      <polyline fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" points={pts} />
    </svg>
  );
}

function deltaLabel(cur: number | null, prev: number | null) {
  if (cur == null || prev == null || prev <= 0) return "—";
  const pct = ((cur - prev) / prev) * 100;
  const s = pct >= 0 ? "+" : "";
  return `${s}${pct.toFixed(0)}%`;
}

export default function StatsTrainingLeaderboards({
  defaultModeId,
  modeOptions,
}: {
  defaultModeId?: string | null;
  modeOptions: { id: string; name: string }[];
}) {
  const [scope, setScope] = useState<BoardScope>("global");
  const [modeId, setModeId] = useState<string | null>(defaultModeId || (modeOptions[0]?.id ?? null));
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [includeBots, setIncludeBots] = useState(false);
  const [limit, setLimit] = useState(50);

  const trends = useTrainingTrends({ modeId: scope === "mode" ? modeId : null });

  const { rows, loading, error } = useTrainingLeaderboards({
    scope,
    modeId,
    period,
    includeBots,
    limit,
  });

  const title = useMemo(() => {
    if (scope === "global") return "Classement global Training";
    const m = modeOptions.find((x) => x.id === modeId);
    return `Classement — ${m?.name ?? modeId ?? "Mode"}`;
  }, [scope, modeId, modeOptions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>{title}</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ ...pill, opacity: scope === "global" ? 1 : 0.7 }} onClick={() => setScope("global")}>
              Global
            </button>
            <button style={{ ...pill, opacity: scope === "mode" ? 1 : 0.7 }} onClick={() => setScope("mode")}>
              Par mode
            </button>
          </div>
        </div>

        {scope === "mode" && (
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>Mode</div>
            <select
              value={modeId ?? ""}
              onChange={(e) => setModeId(e.target.value || null)}
              style={{
                borderRadius: 12,
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.22)",
                color: "white",
                fontWeight: 800,
              }}
            >
              {modeOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>Période</div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            style={{
              borderRadius: 12,
              padding: "8px 10px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.22)",
              color: "white",
              fontWeight: 800,
            }}
          >
            <option value="all">Tout</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
          </select>

          <button style={{ ...pill, opacity: includeBots ? 1 : 0.7 }} onClick={() => setIncludeBots((v) => !v)}>
            Bots {includeBots ? "ON" : "OFF"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 900 }}>Top</div>
            <input
              type="number"
              value={limit}
              min={5}
              max={200}
              onChange={(e) => setLimit(Math.max(5, Math.min(200, Number(e.target.value || 50))))}
              style={{
                width: 80,
                borderRadius: 12,
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.22)",
                color: "white",
                fontWeight: 900,
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 1000 }}>Ta tendance — {scope === "mode" ? (formatMetricLabel(modeId) || "—") : "Score (global)"}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 1000, opacity: 0.95 }}>7j: <span style={{ opacity: 0.9 }}>{deltaLabel(trends.best7, trends.prev7)}</span></div>
              <div style={{ fontWeight: 1000, opacity: 0.95 }}>30j: <span style={{ opacity: 0.9 }}>{deltaLabel(trends.best30, trends.prev30)}</span></div>
              {trends.loading && <div style={{ fontSize: 12, opacity: 0.75 }}>calcul…</div>}
              {trends.error && <div style={{ fontSize: 12, color: "tomato" }}>trend error</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkline values={(trends.spark14 && trends.spark14.length ? trends.spark14 : Array.from({ length: 14 }, () => 0))} />
          </div>
        </div>
      </div>

      <div style={card}>
        {loading && <div style={{ opacity: 0.85 }}>Chargement…</div>}
        {error && (
          <div style={{ color: "tomato" }}>
            Erreur leaderboard (RPC). Vérifie que tu as exécuté le SQL LOT 22.
          </div>
        )}
        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.length === 0 && <div style={{ opacity: 0.8 }}>Aucun résultat.</div>}

            {rows.map((r: any, idx: number) => (
              <div
                key={(r.user_id || idx) + ":" + idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "46px 1fr 110px 230px",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontWeight: 1000, opacity: 0.9 }}>#{idx + 1}</div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {r.avatar_url ? (
                    <img
                      src={r.avatar_url}
                      alt="avatar"
                      style={{ width: 34, height: 34, borderRadius: 999, objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(255,255,255,0.08)" }} />
                  )}

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.public_name || "Player"}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{r.plays ?? ""} plays</div>
                  </div>
                </div>

                <div style={{ justifySelf: "end", fontWeight: 900 }}>
                  {scope === "mode" ? (
                    <span>{formatCanonical(modeId, r)}</span>
                  ) : r.best_score != null ? (
                    <span>{Number(r.best_score).toFixed(0)}</span>
                  ) : r.best_time_ms != null ? (
                    <span>{Math.round(Number(r.best_time_ms) / 1000)}s</span>
                  ) : (
                    "—"
                  )}
                </div>

<div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 10 }}>
  {Array.isArray(r.sparkline_30d) && r.sparkline_30d.length >= 3 ? (
    <Sparkline values={r.sparkline_30d.map((v: any) => Number(v) || 0)} />
  ) : (
    <div style={{ width: 160, height: 42, opacity: 0.25 }} />
  )}
  <div style={{ textAlign: "right", minWidth: 52 }}>
    <div style={{ fontWeight: 1000, opacity: 0.95 }}>{r.tier ?? "—"}</div>
    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
      {r.trend_7d != null ? (Number(r.trend_7d) >= 0 ? "+" : "") + Number(r.trend_7d).toFixed(1) : "—"}
      <span style={{ opacity: 0.55, fontWeight: 800 }}> /7j</span>
    </div>
  </div>
</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
