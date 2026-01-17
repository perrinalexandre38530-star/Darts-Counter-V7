// =============================================================
// src/pages/pingpong/PingPongHome.tsx
// HOME Ping-Pong (LOCAL ONLY)
// Objectif: même rendu global que Home Darts/Pétanque
// - ActiveProfileCard + ArcadeTicker + bloc détails
// - Resume de match via pingpongStore
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import type { Store, Profile } from "../../lib/types";
import ActiveProfileCard, { type ActiveProfileStats } from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";

import { loadPingPongState } from "../../lib/pingpongStore";

type Props = {
  store: Store;
  update: (mut: any) => void; // compat, non utilisé
  go: (tab: any, params?: any) => void;
};

const PAGE_MAX_WIDTH = 520;
const DETAIL_INTERVAL_MS = 7000;

function safeActiveProfile(store: Store): Profile | null {
  const anyStore = store as any;
  const profiles: Profile[] = anyStore?.profiles ?? [];
  const activeProfileId: string | null = anyStore?.activeProfileId ?? null;
  if (!profiles.length) return null;
  if (!activeProfileId) return profiles[0];
  return profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
}

function emptyActiveProfileStats(): ActiveProfileStats {
  return {
    ratingGlobal: 0,
    winrateGlobal: 0,
    avg3DGlobal: 0,
    sessionsGlobal: 0,
    favoriteNumberLabel: null,

    recordBestVisitX01: 0,
    recordBestCOX01: 0,
    recordMinDarts501: null,
    recordBestAvg3DX01: 0,
    recordBestStreak: null,
    recordBestCricketScore: null,

    onlineMatches: 0,
    onlineWinrate: 0,
    onlineAvg3D: 0,
    onlineBestVisit: 0,
    onlineBestCO: 0,
    onlineRank: null,
    onlineBestRank: null,

    x01MultiAvg3D: 0,
    x01MultiSessions: 0,
    x01MultiWinrate: 0,
    x01MultiBestVisit: 0,
    x01MultiBestCO: 0,
    x01MultiMinDartsLabel: null,

    cricketPointsPerRound: 0,
    cricketHitsTotal: 0,
    cricketCloseRate: 0,
    cricketLegsWinrate: 0,
    cricketAvgClose201918: 0,
    cricketOpenings: 0,

    trainingAvg3D: 0,
    trainingHitsS: 0,
    trainingHitsD: 0,
    trainingHitsT: 0,
    trainingGoalSuccessRate: 0,
    trainingBestCO: 0,

    clockTargetsHit: 0,
    clockSuccessRate: 0,
    clockTotalTimeSec: 0,
    clockBestStreak: 0,
  };
}

export default function PingPongHome({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const activeProfile = useMemo(() => safeActiveProfile(store), [store]);
  const [stats] = useState<ActiveProfileStats>(() => emptyActiveProfileStats());

  const [resume, setResume] = useState(() => loadPingPongState());

  useEffect(() => {
    const id = window.setInterval(() => {
      setResume(loadPingPongState());
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const seed = String(activeProfile?.id ?? "anon");

  const tickerItems: ArcadeTickerItem[] = useMemo(() => {
    const st = resume;
    const finished = !!st?.finished;
    const text = finished
      ? t("pingpong.home.ticker.resume.finished", "Match terminé — relance une nouvelle partie.")
      : st?.setsA || st?.setsB || st?.pointsA || st?.pointsB
      ? t(
          "pingpong.home.ticker.resume.dynamic",
          `Reprends : Sets ${st.setsA}-${st.setsB} · Points ${st.pointsA}-${st.pointsB} (Set ${st.setIndex}).`
        )
      : t("pingpong.home.ticker.resume.empty", "Aucun match en cours — lance une partie pour commencer.");

    return [
      {
        id: "pp-resume",
        title: t("pingpong.home.ticker.resume.title", "Ping-Pong — Match"),
        text,
        detail: `${st.sideA} vs ${st.sideB}`,
        backgroundImage: "",
        accentColor: theme.primary ?? "#F6C256",
      },
      {
        id: "pp-quick",
        title: t("pingpong.home.ticker.quick.title", "Accès rapide"),
        text: t("pingpong.home.ticker.quick.text", "Configurer, jouer, tournois, stats."),
        detail: t("pingpong.home.ticker.quick.detail", "Local only"),
        backgroundImage: "",
        accentColor: "#00E5A8",
      },
      {
        id: "pp-tip",
        title: t("pingpong.home.ticker.tip.title", "Astuce"),
        text: t("pingpong.home.ticker.tip.text", "Annonce clairement le set et le score avant de reprendre."),
        detail: t("pingpong.home.ticker.tip.detail", "Rythme · Clarté"),
        backgroundImage: "",
        accentColor: "#FFFFFF",
      },
    ];
  }, [resume, seed, t, theme.primary]);

  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    if (!tickerItems.length) return;
    const id = window.setInterval(() => {
      setTickerIndex((prev) => (tickerItems.length ? (prev + 1) % tickerItems.length : 0));
    }, DETAIL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [tickerItems.length]);

  useEffect(() => {
    setTickerIndex(0);
  }, [activeProfile?.id]);

  const currentTicker = tickerItems.length ? tickerItems[Math.min(tickerIndex, tickerItems.length - 1)] : null;

  const detailAccent = currentTicker?.accentColor ?? theme.primary ?? "#F6C256";
  const leftTitle = currentTicker?.title ?? t("pingpong.title", "PING-PONG");
  const leftText = currentTicker?.text ?? "";
  const rightTitle = t("pingpong.home.detail.right.title", "Accès rapide");
  const rightText = t("pingpong.home.detail.right.text", "Lance une partie, ouvre le menu Ping-Pong, ou va sur Tournois/Stats.");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 14,
        paddingBottom: 90,
        background: theme.bg,
        color: theme.text,
      }}
    >
      <div style={{ width: "100%", maxWidth: PAGE_MAX_WIDTH }}>
        <div style={{ marginBottom: 10 }}>
          <ActiveProfileCard profile={activeProfile} stats={stats} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <ArcadeTicker items={tickerItems} activeIndex={tickerIndex} onChangeIndex={setTickerIndex} />
        </div>

        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
            background: theme.card,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset, 0 16px 32px rgba(0,0,0,0.30)`,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", minWidth: 240 }}>
              <div style={{ fontWeight: 1000, letterSpacing: 0.6, fontSize: 14, color: detailAccent }}>{leftTitle}</div>
              <div style={{ marginTop: 8, color: theme.text, fontWeight: 900, lineHeight: 1.35 }}>{leftText}</div>
            </div>

            <div style={{ flex: "1 1 220px", minWidth: 220 }}>
              <div style={{ fontWeight: 1000, letterSpacing: 0.6, fontSize: 14, color: theme.primary }}>{rightTitle}</div>
              <div style={{ marginTop: 8, color: theme.textSoft, fontWeight: 900, lineHeight: 1.35 }}>{rightText}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btn(theme)} onClick={() => go("home")}>{t("home.cta.home", "Accueil")}</button>
            <button style={btn(theme)} onClick={() => go("games")}>{t("home.cta.local", "Local")}</button>
            <button style={btnGhost(theme)} onClick={() => go("pingpong_config")}>{t("pingpong.cta.config", "Configurer")}</button>
            <button style={btnGhost(theme)} onClick={() => go("pingpong_play")}>{t("pingpong.cta.play", "Jouer")}</button>
            <button style={btnGhost(theme)} onClick={() => go("stats")}>{t("home.cta.stats", "Stats")}</button>
            <button style={btnGhost(theme)} onClick={() => go("tournaments", { forceMode: "pingpong" })}>{t("home.cta.tournaments", "Tournois")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function btn(theme: any): React.CSSProperties {
  return {
    flex: "1 1 160px",
    borderRadius: 14,
    padding: "10px 12px",
    border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
    background: "rgba(255,255,255,0.08)",
    color: theme.text,
    fontWeight: 950,
    cursor: "pointer",
  };
}

function btnGhost(theme: any): React.CSSProperties {
  return {
    flex: "1 1 120px",
    borderRadius: 14,
    padding: "10px 12px",
    border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
    background: "rgba(255,255,255,0.04)",
    color: theme.text,
    fontWeight: 900,
    cursor: "pointer",
    opacity: 0.94,
  };
}
