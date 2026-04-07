// @ts-nocheck
// ============================================
// src/pages/statscenter/StatsCenterPlayersPage.tsx
// ✅ UI UNIQUE (copie du modèle Stats Center) — données via StatsProvider
// ============================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { useSport } from "../../contexts/SportContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileStarRing from "../../components/ProfileStarRing";

import { useStore } from "../../contexts/StoreContext";
import { useStatsProvider } from "../../stats/useStatsProvider";

import type { Profile } from "../../lib/types";

type Props = { go?: any };

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function StatsCenterPlayersPage({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const { sport } = useSport();
  const { store } = useStore();
  const provider = useStatsProvider();

  const profiles: Profile[] = useMemo(() => {
    const arr = (store as any)?.profiles;
    return Array.isArray(arr) ? arr : [];
  }, [store]);

  const activeProfileId = (store as any)?.activeProfileId || "";

  const initialIndex = useMemo(() => {
    const idx = profiles.findIndex((p) => p?.id === activeProfileId);
    return idx >= 0 ? idx : 0;
  }, [profiles, activeProfileId]);

  const [idx, setIdx] = useState(initialIndex);
  useEffect(() => setIdx(initialIndex), [initialIndex]);

  const selected = profiles[idx] || profiles[0] || null;

  const globalStats = useMemo(() => {
    try {
      return provider.getGlobalStats();
    } catch {
      return { matches: 0, winRate: 0, avgScore: 0, bestScore: 0 };
    }
  }, [provider]);

  const stats = useMemo(() => {
    if (!selected?.id) {
      return {
        matches: 0,
        winratePct: 0,
        avgScore: 0,
        bestScore: 0,
        avgTurns: 0,
        avgDurationMs: 0,
      };
    }
    try {
      const s = provider.getPlayerStats(String(selected.id));
      return {
        matches: safeNum(s?.matches),
        winratePct: safeNum(s?.winRate) * 100,
        avgScore: safeNum(s?.avgScore),
        bestScore: safeNum(s?.bestScore),
        avgTurns: safeNum(s?.avgTurns),
        avgDurationMs: safeNum(s?.avgDurationMs),
      };
    } catch {
      return {
        matches: 0,
        winratePct: 0,
        avgScore: 0,
        bestScore: 0,
        avgTurns: 0,
        avgDurationMs: 0,
      };
    }
  }, [provider, selected]);

  const canPrev = idx > 0;
  const canNext = idx < profiles.length - 1;

  const accent = theme?.accent || "#b7ff00";
  const border = "rgba(183,255,0,0.35)";

  const tr = (k: string, fallback?: string) => (t ? t(k) : "") || fallback || k;

  const labels = useMemo(() => {
    switch (sport) {
      case "molkky":
        return {
          favoriteModeLabel: tr("stats.favoriteMode", "Mode de jeu préféré"),
          avgTitle: tr("stats.avgPtsTitle", "Moyenne (pts / lancer)"),
          avgLabel: tr("stats.avgLabel", "Moyenne"),
          bestTitle: tr("stats.bestTitle", "Meilleur score"),
          bestLabel: tr("stats.record", "Record"),
          winTitle: tr("stats.winrateTitle", "Taux de victoire"),
          winLabel: tr("stats.total", "Tous matchs"),
          durationLabel: tr("stats.avgDuration", "Durée moyenne"),
          turnsLabel: tr("stats.avgTurns", "Tours moyens"),
        };
      case "dicegame":
        return {
          favoriteModeLabel: tr("stats.favoriteMode", "Mode de jeu préféré"),
          avgTitle: tr("stats.avgPtsTitle", "Moyenne (pts / lancer)"),
          avgLabel: tr("stats.avgLabel", "Moyenne"),
          bestTitle: tr("stats.bestTitle", "Meilleur score"),
          bestLabel: tr("stats.record", "Record"),
          winTitle: tr("stats.winrateTitle", "Taux de victoire"),
          winLabel: tr("stats.total", "Tous matchs"),
          durationLabel: tr("stats.avgDuration", "Durée moyenne"),
          turnsLabel: tr("stats.avgTurns", "Tours moyens"),
        };
      default:
        return {
          favoriteModeLabel: tr("stats.favoriteMode", "Mode de jeu préféré"),
          avgTitle: tr("stats.avgTitle", "Moyenne"),
          avgLabel: tr("stats.avgLabel", "Moyenne"),
          bestTitle: tr("stats.bestTitle", "Meilleur score"),
          bestLabel: tr("stats.record", "Record"),
          winTitle: tr("stats.winrateTitle", "Taux de victoire"),
          winLabel: tr("stats.total", "Tous matchs"),
          durationLabel: tr("stats.avgDuration", "Durée moyenne"),
          turnsLabel: tr("stats.avgTurns", "Tours moyens"),
        };
    }
  }, [sport, t]);

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

  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    border: `1px solid ${border}`,
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    padding: "14px 14px",
    margin: "10px auto",
  };

  const cardTitle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 18,
    letterSpacing: 0.4,
  };

  const sub: React.CSSProperties = {
    opacity: 0.85,
    fontSize: 13,
    marginTop: 2,
  };

  const btnRound: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    color: accent,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  };

  const row3: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 10,
  };

  const modePill: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.35)",
    color: accent,
    fontWeight: 900,
    letterSpacing: 0.5,
    fontSize: 12,
    textTransform: "uppercase",
    justifySelf: "end",
  };

  const metricCard: React.CSSProperties = {
    ...card,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const metricLeft: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };

  const metricTitle: React.CSSProperties = {
    fontWeight: 800,
    opacity: 0.9,
  };

  const metricValue: React.CSSProperties = {
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: 0.2,
    lineHeight: 1,
  };

  const metricUnit: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 800,
    opacity: 0.9,
    marginLeft: 6,
  };

  const metricSub: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.75,
  };

  const iconBox: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: `1px solid ${border}`,
    display: "grid",
    placeItems: "center",
    color: accent,
    background: "rgba(0,0,0,0.35)",
    fontWeight: 900,
  };

  const formatMode = (m: any) => {
    const s = String(m || "");
    if (!s) return "";
    // si c'est une clé i18n, on tente traduction, sinon on affiche
    return (t ? t(s) : "") || s;
  };

  return (
    <div style={pageWrap}>
      <div style={topRow}>
        <BackDot onClick={() => (go ? go("stats") : null)} />
        <div style={title}>{tr("stats.center", "CENTRE DE STATISTIQUES")}</div>
        <InfoDot onClick={() => (go ? go("stats") : null)} />
      </div>

      <div style={pill}>{tr("stats.dashboardGlobal", "DASHBOARD GLOBAL")}</div>

      {/* ===== Carousel profil ===== */}
      <div style={{ ...card, padding: "12px 14px" }}>
        <div style={row3}>
          <button
            style={{ ...btnRound, opacity: canPrev ? 1 : 0.25 }}
            disabled={!canPrev}
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
          >
            ‹
          </button>

          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ProfileStarRing size={64} profile={selected} />
              <div style={{ position: "absolute" }} />
              <div style={{ marginTop: 2 }}>
                <ProfileAvatar size={62} profile={selected} />
              </div>
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>
              {selected?.name || tr("profiles.none", "Aucun profil.")}
            </div>
            <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
              {tr("stats.matches", "Matchs")}: {stats.matches} • {tr("stats.winrate", "Winrate")}: {Math.round(stats.winratePct)}%
            </div>
          </div>

          <button
            style={{ ...btnRound, opacity: canNext ? 1 : 0.25 }}
            disabled={!canNext}
            onClick={() => setIdx((v) => Math.min(profiles.length - 1, v + 1))}
          >
            ›
          </button>
        </div>
      </div>

      {/* ===== Bloc Statistiques ===== */}
      <div style={card}>
        <div style={cardTitle}>{tr("stats.title", "Statistiques")}</div>
        <div style={sub}>
          {tr("stats.desc", "Analyse des performances")}
          {sport === "molkky" ? " — Mölkky." : ""}
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ opacity: 0.85, fontSize: 13 }}>{labels.favoriteModeLabel}</div>
          <div style={modePill}>{formatMode(globalStats?.favoriteMode || "")}</div>
        </div>
      </div>

      {/* ===== Moyenne ===== */}
      <div style={metricCard}>
        <div style={metricLeft}>
          <div style={metricTitle}>{labels.avgTitle}</div>
          <div>
            <span style={metricValue}>{safeNum(stats.avgScore).toFixed(1)}</span>
            <span style={metricUnit}>pts</span>
          </div>
          <div style={metricSub}>{labels.avgLabel}</div>
        </div>
        <div style={iconBox}>Ø</div>
      </div>

      {/* ===== Best ===== */}
      <div style={metricCard}>
        <div style={metricLeft}>
          <div style={metricTitle}>{labels.bestTitle}</div>
          <div>
            <span style={metricValue}>{Math.round(safeNum(stats.bestScore))}</span>
            <span style={metricUnit}>pts</span>
          </div>
          <div style={metricSub}>{labels.bestLabel}</div>
        </div>
        <div style={iconBox}>★</div>
      </div>

      {/* ===== Winrate ===== */}
      <div style={metricCard}>
        <div style={metricLeft}>
          <div style={metricTitle}>{labels.winTitle}</div>
          <div>
            <span style={metricValue}>{Math.round(safeNum(stats.winratePct))}</span>
            <span style={metricUnit}>%</span>
          </div>
          <div style={metricSub}>{labels.winLabel}</div>
        </div>
        <div style={iconBox}>%</div>
      </div>

      {/* ===== Evolution (placeholder chart) ===== */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={cardTitle}>{tr("stats.evolution", "Évolution")}</div>
          <div style={{ opacity: 0.75, fontSize: 12 }}>{tr("stats.perGame", "Moyenne par partie")}</div>
        </div>

        <div
          style={{
            marginTop: 10,
            borderRadius: 14,
            border: `1px solid ${border}`,
            background:
              "radial-gradient(600px 240px at 50% 0%, rgba(183,255,0,0.10), rgba(0,0,0,0) 65%), rgba(0,0,0,0.30)",
            height: 140,
            display: "grid",
            placeItems: "center",
            opacity: 0.7,
            fontWeight: 900,
            letterSpacing: 0.8,
          }}
        >
          {tr("stats.chartSoon", "GRAPHIQUE")}
        </div>

        <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
          {labels.durationLabel}: {"0:00"} • {labels.turnsLabel}: {safeNum(stats.avgTurns).toFixed(1)}
        </div>
      </div>
    </div>
  );
}
