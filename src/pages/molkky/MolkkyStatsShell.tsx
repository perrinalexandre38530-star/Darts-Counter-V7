// =============================================================
// src/pages/molkky/MolkkyStatsShell.tsx
// Stats MÖLKKY (LOCAL ONLY)
// - Source: store.history (pushMolkkyHistory dans App.tsx)
// =============================================================

import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
};

function isDark(theme: any) {
  return theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
}

export default function MolkkyStatsShell({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const stats = useMemo(() => {
    const raw = (store?.history || []).filter((r: any) => (r?.sport || r?.kind) === "molkky");

    let lastWhen = 0;
    let lastWinner = "";

    let totalTurns = 0;
    let totalDuration = 0;

    for (const r of raw) {
      const when = Number(r.updatedAt || r.createdAt) || 0;
      if (when > lastWhen) {
        lastWhen = when;
        lastWinner = r?.summary?.winnerName || r?.payload?.summary?.winnerName || "";
      }
      totalTurns += Number(r?.summary?.turns ?? r?.payload?.summary?.turns ?? 0) || 0;
      totalDuration += Number(r?.summary?.durationMs ?? r?.payload?.summary?.durationMs ?? 0) || 0;
    }

    return {
      total: raw.length,
      avgTurns: raw.length ? Math.round(totalTurns / raw.length) : 0,
      avgDurationSec: raw.length ? Math.round(totalDuration / raw.length / 1000) : 0,
      lastWhen,
      lastWinner,
    };
  }, [store?.history]);

  const dark = isDark(theme);

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("molkky_menu")} />
        <div style={topTitle}>MÖLKKY — STATS</div>
        <div style={{ width: 48 }} />
      </div>

      <div style={card(theme)}>
        <div style={kpiTitle}>Parties jouées</div>
        <div style={kpiValue(theme)}>{stats.total}</div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <div style={rowLine(dark)}>
            <span>Durée moyenne</span>
            <b>{stats.avgDurationSec}s</b>
          </div>
          <div style={rowLine(dark)}>
            <span>Tours moyens</span>
            <b>{stats.avgTurns}</b>
          </div>
          <div style={rowLine(dark)}>
            <span>Dernier vainqueur</span>
            <b>{stats.lastWinner || "—"}</b>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <button style={btn(theme)} onClick={() => go("molkky_stats_history")}>HISTORIQUE</button>
        <button style={btn(theme)} onClick={() => go("molkky_stats_leaderboards")}>CLASSEMENTS</button>
      </div>

      {stats.lastWhen ? (
        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12, fontWeight: 800 }}>
          Dernière partie : {new Date(stats.lastWhen).toLocaleString()}
        </div>
      ) : null}

      {!stats.total ? (
        <div style={{ marginTop: 14, opacity: 0.75, fontSize: 13, fontWeight: 900 }}>
          {t?.("Aucune partie enregistrée") ?? "Aucune partie enregistrée"}.
        </div>
      ) : null}
    </div>
  );
}

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
  background: theme?.colors?.bg ?? "#05060a",
  color: theme?.colors?.text ?? "#fff",
});

const topRow: any = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 48px",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const topTitle: any = {
  textAlign: "center",
  fontWeight: 1000,
  letterSpacing: 2,
  opacity: 0.95,
};

const card = (theme: any) => ({
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 12,
  marginBottom: 12,
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const kpiTitle: any = {
  opacity: 0.8,
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1,
};

const kpiValue = (theme: any): React.CSSProperties => ({
  fontSize: 48,
  fontWeight: 1200,
  lineHeight: 1,
  marginTop: 6,
  color: theme?.colors?.accent ?? "#6cff7a",
  textShadow: `0 0 18px ${theme?.colors?.accent ?? "#6cff7a"}`,
});

const rowLine = (dark: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 10px",
  borderRadius: 14,
  background: dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  fontSize: 13,
  opacity: 0.95,
});

const btn = (theme: any) => ({
  width: "100%",
  borderRadius: 16,
  padding: "14px 12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 1100,
  letterSpacing: 1,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});
