// @ts-nocheck
// ============================================================
// src/components/stats/StatsShanghaiDashboard.tsx
// Dashboard Shanghai — UI calquée sur X01 MULTI (pills + KPI grid + table)
// ============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

type PeriodKey = "day" | "week" | "month" | "year" | "all";

type ShanghaiTopTarget = {
  n: number; // 1..20
  points?: number; // points gagnés sur cette cible
  hitsS?: number;
  hitsD?: number;
  hitsT?: number;
  miss?: number;
  totalHits?: number;
};

type Props = {
  playerName?: string;
  period: PeriodKey;
  setPeriod: (p: PeriodKey) => void;

  // stats déjà calculées (peu importe la source)
  stats: {
    matches?: number;
    wins?: number;
    ties?: number;
    winRate?: number; // 0..100
    accuracy?: number; // 0..100

    avgScore?: number;
    bestScore?: number;
    worstScore?: number;

    hits?: number;
    miss?: number;
    pointsCibles?: number;

    dartsTotal?: number;
    sessions?: number;

    // pour le tableau détaillé
    rows?: Array<{
      key: string;
      label: string;
      min?: number;
      max?: number;
      total?: number;
      pct?: number;
    }>;

    // top targets
    topTargets?: ShanghaiTopTarget[];
  };
};

export default function StatsShanghaiDashboard({
  playerName,
  period,
  setPeriod,
  stats,
}: Props) {
  const { t } = useLang();
  const { theme } = useTheme();
  const T = theme;

  const card: React.CSSProperties = {
    background: "rgba(0,0,0,0.55)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
  };

  const sectionTitle: React.CSSProperties = {
    color: "#d8b25c",
    fontWeight: 900,
    letterSpacing: 0.6,
    fontSize: 12,
    margin: "10px 0 8px",
    textTransform: "uppercase",
  };

  const pillsWrap: React.CSSProperties = {
    display: "flex",
    gap: 8,
    padding: 8,
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    justifyContent: "center",
  };

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    border: active
      ? "1px solid rgba(255,215,120,0.55)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active ? "rgba(255,215,120,0.14)" : "rgba(0,0,0,0.25)",
    color: active ? "#ffd67a" : "rgba(255,255,255,0.75)",
    boxShadow: active ? "0 0 18px rgba(255,215,120,0.18)" : "none",
    userSelect: "none",
  });

  const grid2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 10,
  };

  const kpiCard = (
    glow: "gold" | "blue" | "pink" | "green"
  ): React.CSSProperties => {
    const map = {
      gold: { b: "rgba(255,210,120,0.45)", s: "rgba(255,210,120,0.16)" },
      blue: { b: "rgba(120,210,255,0.45)", s: "rgba(120,210,255,0.16)" },
      pink: { b: "rgba(255,120,210,0.45)", s: "rgba(255,120,210,0.16)" },
      green: { b: "rgba(120,255,190,0.45)", s: "rgba(120,255,190,0.16)" },
    }[glow];

    return {
      borderRadius: 16,
      padding: 12,
      background: "rgba(0,0,0,0.40)",
      border: `1px solid ${map.b}`,
      boxShadow: `0 0 22px ${map.s}`,
      minHeight: 64,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: 4,
    };
  };

  const kpiLabel: React.CSSProperties = {
    fontSize: 11,
    color: "rgba(255,255,255,0.70)",
    fontWeight: 900,
  };
  const kpiValue: React.CSSProperties = {
    fontSize: 22,
    color: "rgba(255,255,255,0.92)",
    fontWeight: 1000,
  };

  const smallChip: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: 900,
  };

  const tableWrap: React.CSSProperties = {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.28)",
  };

  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: 11,
    padding: "10px 10px",
    color: "rgba(255,255,255,0.75)",
    fontWeight: 900,
    background: "rgba(255,255,255,0.05)",
  };

  const td: React.CSSProperties = {
    fontSize: 12,
    padding: "10px 10px",
    color: "rgba(255,255,255,0.85)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    whiteSpace: "nowrap",
  };

  const fmt = (n: any, d = 0) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return "—";
    return x.toFixed(d);
  };

  const fmtPct = (n: any, d = 1) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return "—";
    return `${x.toFixed(d)}%`;
  };

  const periods: Array<{ k: PeriodKey; label: string }> = [
    { k: "day", label: t?.("Jour") || "Jour" },
    { k: "week", label: t?.("Semaine") || "Semaine" },
    { k: "month", label: t?.("Mois") || "Mois" },
    { k: "year", label: t?.("Année") || "Année" },
    { k: "all", label: "All" },
  ];

  const rows =
    stats?.rows?.length
      ? stats.rows
      : [
          { key: "darts", label: "Darts", total: stats?.dartsTotal },
          {
            key: "hits",
            label: "Hits",
            total: stats?.hits,
            pct: stats?.accuracy,
          },
          { key: "miss", label: "Miss", total: stats?.miss },
          { key: "points", label: "Points cibles", total: stats?.pointsCibles },
          {
            key: "co",
            label: "WinRate",
            total: stats?.winRate,
            pct: stats?.winRate,
          },
        ];

  const cumulValue =
    stats?.dartsTotal != null
      ? Number(stats.dartsTotal)
      : stats?.hits != null
      ? Number(stats.hits)
      : 0;

  return (
    <div style={card}>
      {/* pills */}
      <div style={pillsWrap}>
        {periods.map((p) => (
          <div
            key={p.k}
            style={pill(period === p.k)}
            onClick={() => setPeriod(p.k)}
          >
            {p.label}
          </div>
        ))}
      </div>

      {/* KPI GRID (comme X01 MULTI) */}
      <div style={grid2}>
        <div style={kpiCard("blue")}>
          <div style={kpiLabel}>CUMUL</div>
          <div style={kpiValue}>{fmt(cumulValue, 0)}</div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.60)",
              fontWeight: 800,
            }}
          >
            {stats?.dartsTotal != null ? "Darts total" : "Hits total"}
          </div>
        </div>

        <div style={kpiCard("pink")}>
          <div style={kpiLabel}>MOYENNE</div>
          <div style={kpiValue}>{fmt(stats?.avgScore, 1)}</div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.60)",
              fontWeight: 800,
            }}
          >
            Score final
          </div>
        </div>

        <div style={kpiCard("gold")}>
          <div style={kpiLabel}>RECORDS</div>
          <div style={kpiValue}>{fmt(stats?.bestScore, 0)}</div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.60)",
              fontWeight: 800,
            }}
          >
            Best / Worst {fmt(stats?.worstScore, 0)}
          </div>
        </div>

        <div style={kpiCard("green")}>
          <div style={kpiLabel}>POURCENTAGES</div>
          <div style={kpiValue}>{fmt(stats?.accuracy, 1)}%</div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.60)",
              fontWeight: 800,
            }}
          >
            Win {fmt(stats?.winRate, 1)}%
          </div>
        </div>
      </div>

      {/* chip sessions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
          alignItems: "center",
        }}
      >
        <div style={smallChip}>Sessions</div>
        <div style={smallChip}>{fmt(stats?.sessions ?? stats?.matches ?? 0, 0)}</div>
      </div>

      {/* table */}
      <div style={sectionTitle}>STATS DÉTAILLÉES (PÉRIODE)</div>
      <div style={tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Stat</th>
              <th style={th}>Min / Max</th>
              <th style={th}>Total</th>
              <th style={th}>%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td style={td}>{r.label}</td>
                <td style={td}>
                  {r.min != null || r.max != null
                    ? `${fmt(r.min, 0)} / ${fmt(r.max, 0)}`
                    : "—"}
                </td>
                <td style={td}>{r.total != null ? fmt(r.total, 0) : "—"}</td>
                <td style={td}>{r.pct != null ? fmtPct(r.pct, 1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top targets */}
      <div style={sectionTitle}>TOP CIBLES (PAR POINTS)</div>
      <div style={{ display: "grid", gap: 8 }}>
        {(stats?.topTargets || []).slice(0, 6).map((x, idx) => (
          <div
            key={idx}
            style={{
              borderRadius: 14,
              padding: 10,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 1000,
                  color: "rgba(255,255,255,0.90)",
                  border: "1px solid rgba(255,215,120,0.35)",
                  background: "rgba(255,215,120,0.10)",
                }}
              >
                {x.n}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 1000,
                    color: "rgba(255,255,255,0.92)",
                    fontSize: 13,
                  }}
                >
                  {fmt(x.points, 0)} pts
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.65)",
                    fontWeight: 800,
                  }}
                >
                  Hits: S{x.hitsS ?? 0} D{x.hitsD ?? 0} T{x.hitsT ?? 0} • Miss{" "}
                  {x.miss ?? 0}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.75)",
                fontWeight: 900,
              }}
            >
              Total hits{" "}
              {x.totalHits ??
                (x.hitsS ?? 0) + (x.hitsD ?? 0) + (x.hitsT ?? 0)}
            </div>
          </div>
        ))}

        {!stats?.topTargets?.length && (
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.65)",
              fontWeight: 800,
            }}
          >
            Aucune donnée Shanghai sur la période.
          </div>
        )}
      </div>
    </div>
  );
}
