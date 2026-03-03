// @ts-nocheck
// ============================================
// src/pages/statscenter/StatsCenterLeaderboardsPage.tsx
// ✅ UI UNIQUE — Classements (local) via StatsProvider
// ============================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

import { useStatsProvider } from "../../stats/useStatsProvider";
import type { StatsPeriod } from "../../stats/types";

type Props = { go?: any };

type SortKey = "matches" | "winrate" | "avg" | "best";

const PERIODS: StatsPeriod[] = ["J", "S", "M", "A", "ALL", "TOUT"];
const SORTS: { key: SortKey; label: string }[] = [
  { key: "matches", label: "MATCHS JOUÉS" },
  { key: "winrate", label: "TAUX VICTOIRE" },
  { key: "avg", label: "MOYENNE" },
  { key: "best", label: "MEILLEUR" },
];

export default function StatsCenterLeaderboardsPage({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const provider = useStatsProvider();

  const [period, setPeriod] = useState<StatsPeriod>("ALL");
  const [sortIdx, setSortIdx] = useState(0);

  const sort = SORTS[sortIdx]?.key || "matches";

  const rows = useMemo(() => {
    try {
      return provider.getRankings(period, sort) || [];
    } catch {
      return [];
    }
  }, [provider, period, sort]);

  const accent = theme?.accent || "#b7ff00";
  const border = "rgba(183,255,0,0.35)";

  const tr = (k: string, fallback?: string) => (t ? t(k) : "") || fallback || k;

  const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    background: "#050607",
    color: "#fff",
    padding: "14px 12px 90px",
  };

  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    border: `1px solid ${border}`,
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    padding: "14px 14px",
    margin: "12px auto",
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
    fontSize: 16,
    textTransform: "uppercase",
    color: accent,
    textShadow: `0 0 16px ${accent}66`,
  };

  const tabRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 10,
  };

  const tab: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: 0.6,
    opacity: 0.6,
  };

  const tabActive: React.CSSProperties = {
    ...tab,
    opacity: 1,
    background: `linear-gradient(180deg, ${accent}bb, rgba(0,0,0,0.55))`,
    color: "#101200",
  };

  const smallPill: React.CSSProperties = {
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: 0.6,
  };

  const periodRow: React.CSSProperties = {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 10,
  };

  const periodBtn = (active: boolean): React.CSSProperties => ({
    width: 38,
    height: 38,
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: active ? `rgba(183,255,0,0.18)` : "rgba(0,0,0,0.35)",
    color: active ? accent : "#fff",
    fontWeight: 900,
    letterSpacing: 0.6,
  });

  const sortRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "36px 1fr 36px",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  };

  const arrowBtn: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    color: accent,
    fontWeight: 900,
  };

  const sortPill: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: 0.8,
  };

  const listBox: React.CSSProperties = {
    marginTop: 14,
    borderRadius: 16,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.28)",
    padding: 12,
    minHeight: 90,
  };

  return (
    <div style={pageWrap}>
      <div style={topRow}>
        <BackDot onClick={() => (go ? go("molkky_stats") : null)} />
        <div style={title}>{tr("stats.rankings", "CLASSEMENTS")}</div>
        <InfoDot onClick={() => (go ? go("molkky_stats") : null)} />
      </div>

      <div style={card}>
        <div style={tabRow}>
          <div style={tabActive}>{tr("stats.local", "LOCAL")}</div>
          <div style={tab}>{tr("stats.online", "ONLINE")}</div>
        </div>

        <div style={smallPill}>{tr("stats.botsOn", "BOTS : ON")}</div>
        <div style={{ ...smallPill, opacity: 0.85 }}>{tr("stats.sport", "MÖLKKY")}</div>

        <div style={{ marginTop: 14, fontWeight: 900, opacity: 0.8 }}>
          {tr("stats.period", "PÉRIODE")}
        </div>
        <div style={periodRow}>
          {PERIODS.map((p) => (
            <button key={p} style={periodBtn(p === period)} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 14, fontWeight: 900, opacity: 0.8 }}>
          {tr("stats.rankBy", "CLASSEMENT PAR")}
        </div>

        <div style={sortRow}>
          <button
            style={arrowBtn}
            onClick={() => setSortIdx((v) => (v - 1 + SORTS.length) % SORTS.length)}
          >
            ‹
          </button>
          <div style={sortPill}>{SORTS[sortIdx]?.label}</div>
          <button
            style={arrowBtn}
            onClick={() => setSortIdx((v) => (v + 1) % SORTS.length)}
          >
            ›
          </button>
        </div>

        <div style={listBox}>
          {rows.length === 0 ? (
            <div style={{ opacity: 0.7, fontWeight: 800, textAlign: "center", padding: 10 }}>
              {tr("stats.noData", "Aucune donnée.")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rows.slice(0, 20).map((r: any, i: number) => (
                <div
                  key={r.playerId + i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: `1px solid ${border}`,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        border: `1px solid ${border}`,
                        display: "grid",
                        placeItems: "center",
                        color: accent,
                        fontWeight: 900,
                        background: "rgba(0,0,0,0.35)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ fontWeight: 900 }}>{r.playerName || "—"}</div>
                  </div>
                  <div style={{ fontWeight: 900, color: accent }}>
                    {sort === "winrate" ? `${Math.round(safeNum(r.value))}%` : safeNum(r.value).toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
