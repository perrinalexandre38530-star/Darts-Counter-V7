// @ts-nocheck
// ============================================
// src/pages/statscenter/StatsCenterShell.tsx
// ✅ Menu Stats Center UNIQUE — même structure pour tous les sports
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

type Props = { go?: any };

export default function StatsCenterShell({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const accent = theme?.accent || "#b7ff00";
  const border = "rgba(183,255,0,0.35)";

  const tr = (k: string, fallback?: string) => (t ? t(k) : "") || fallback || k;

  const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 700px at 50% 0%, rgba(183,255,0,0.10), rgba(0,0,0,0) 60%), #050607",
    color: "#fff",
    padding: "14px 12px 90px",
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  };

  const title: React.CSSProperties = {
    fontWeight: 900,
    letterSpacing: 1,
    fontSize: 12,
    opacity: 0.9,
    textTransform: "uppercase",
  };

  const pill: React.CSSProperties = {
    margin: "10px auto 14px",
    width: "100%",
    maxWidth: 520,
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.30)",
    textAlign: "center",
    fontWeight: 800,
    letterSpacing: 0.4,
  };

  const menuCard: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    border: `1px solid ${border}`,
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    padding: "14px 14px",
    margin: "10px auto",
  };

  const btn: React.CSSProperties = {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const badge: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    color: accent,
    fontWeight: 900,
    fontSize: 12,
  };

  return (
    <div style={pageWrap}>
      <div style={topRow}>
        <BackDot onClick={() => (go ? go("home") : null)} />
        <div style={title}>{tr("stats.center", "CENTRE DE STATISTIQUES")}</div>
        <InfoDot onClick={() => null} />
      </div>

      <div style={pill}>{tr("stats.dashboardGlobal", "DASHBOARD GLOBAL")}</div>

      <div style={menuCard}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button style={btn} onClick={() => (go ? go("molkky_stats_players") : null)}>
            <span>{tr("stats.menu.players", "Joueurs")}</span>
            <span style={badge}>›</span>
          </button>

          <button style={btn} onClick={() => (go ? go("molkky_stats_locals") : null)}>
            <span>{tr("stats.menu.locals", "Profils locaux")}</span>
            <span style={badge}>›</span>
          </button>

          <button style={btn} onClick={() => (go ? go("molkky_stats_leaderboards") : null)}>
            <span>{tr("stats.menu.rankings", "Classements")}</span>
            <span style={badge}>›</span>
          </button>

          <button style={btn} onClick={() => (go ? go("molkky_stats_history") : null)}>
            <span>{tr("stats.menu.history", "Historique")}</span>
            <span style={badge}>›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
