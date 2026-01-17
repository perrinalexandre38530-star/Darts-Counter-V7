// =============================================================
// src/pages/babyfoot/BabyFootHome.tsx
// HOME Baby-Foot (LOCAL ONLY)
// Objectif: même rendu global que Home Darts/Pétanque
// - ActiveProfileCard + ArcadeTicker + bloc détails
// - Resume de partie via babyfootStore
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import type { Store, Profile } from "../../lib/types";
import ActiveProfileCard, { type ActiveProfileStats } from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";

import { loadBabyFootState } from "../../lib/babyfootStore";

type Props = {
  store: Store;
  update: (mut: any) => void; // conservé pour compat signature, pas utilisé ici
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

export default function BabyFootHome({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const activeProfile = useMemo(() => safeActiveProfile(store), [store]);

  const [st, setSt] = useState(() => loadBabyFootState());

  useEffect(() => {
    const id = window.setInterval(() => setSt(loadBabyFootState()), 500);
    return () => window.clearInterval(id);
  }, []);

  const tickerItems: ArcadeTickerItem[] = useMemo(() => {
    const a = Number(st?.scoreA ?? 0) || 0;
    const b = Number(st?.scoreB ?? 0) || 0;
    const target = Number(st?.target ?? 10) || 10;
    const finished = !!st?.finished;

    const resume = finished
      ? t("babyfoot.home.ticker.resume.finished", "Partie terminée — relance une nouvelle partie.")
      : a > 0 || b > 0
      ? t("babyfoot.home.ticker.resume.dynamic", `Reprends : ${a} — ${b} (objectif ${target}).`)
      : t("babyfoot.home.ticker.resume.empty", "Aucun but enregistré — lance une partie pour commencer.");

    return [
      {
        id: "babyfoot-resume",
        title: t("babyfoot.home.ticker.resume.title", "Baby-Foot — Partie"),
        text: resume,
        detail: `${a}—${b} · obj ${target}`,
        backgroundImage: "",
        accentColor: theme.primary ?? "#F6C256",
      },
      {
        id: "babyfoot-tournaments",
        title: t("babyfoot.home.ticker.tournaments.title", "Tournois"),
        text: t("babyfoot.home.ticker.tournaments.text", "Crée et gère tes tournois (local)."),
        detail: t("babyfoot.home.ticker.tournaments.detail", "KO · Poules · RR"),
        backgroundImage: "",
        accentColor: "#FF7A18",
      },
      {
        id: "babyfoot-tip",
        title: t("babyfoot.home.ticker.tip.title", "Astuce"),
        text: t("babyfoot.home.ticker.tip.text", "Fixe un score cible et alterne les services pour garder le rythme."),
        detail: t("babyfoot.home.ticker.tip.detail", "Rythme · Fair-play"),
        backgroundImage: "",
        accentColor: "#FFFFFF",
      },
    ];
  }, [st, theme.primary, t]);

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

  const leftTitle = currentTicker?.title ?? t("babyfoot.home.detail.left.title", "Baby-Foot");
  const leftText = currentTicker?.text ?? "";
  const statsBackgroundImage = currentTicker?.backgroundImage ?? "";

  const rightTitle = t("babyfoot.home.detail.right.title", "Accès rapide");
  const rightText = t("babyfoot.home.detail.right.text", "Nouvelle partie, menu local, tournois et stats.");

  const stats = useMemo(() => emptyActiveProfileStats(), []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 14,
        paddingBottom: 92,
        background: theme.bg,
        color: theme.text,
      }}
    >
      <div style={{ width: "100%", maxWidth: PAGE_MAX_WIDTH, display: "flex", flexDirection: "column", gap: 12 }}>
        <ActiveProfileCard profile={activeProfile} stats={stats} />

        <ArcadeTicker
          items={tickerItems}
          currentIndex={tickerIndex}
          onIndexChange={(i) => setTickerIndex(i)}
        />

        {/* Détails */}
        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
            background: theme.card,
            overflow: "hidden",
            boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset, 0 18px 38px rgba(0,0,0,0.34)`,
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.10)"}`,
              background:
                statsBackgroundImage
                  ? `linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.35)), url(${statsBackgroundImage}) center/cover no-repeat`
                  : `linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.35))`,
            }}
          >
            <div style={{ fontWeight: 1000, letterSpacing: 0.5, color: detailAccent, textShadow: `0 0 12px ${detailAccent}66` }}>
              {leftTitle}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: theme.textSoft, fontWeight: 800, lineHeight: 1.35 }}>{leftText}</div>
          </div>

          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontWeight: 1000, letterSpacing: 0.4 }}>{rightTitle}</div>
            <div style={{ fontSize: 13, color: theme.textSoft, fontWeight: 800, lineHeight: 1.35 }}>{rightText}</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={btn(theme)} onClick={() => go("babyfoot_config", { mode: "match_1v1" })}>
                {t("babyfoot.home.cta.new", "Nouvelle partie")}
              </button>
              <button style={btnGhost(theme)} onClick={() => go("games")}>{t("babyfoot.home.cta.menu", "Menu Local")}</button>
              <button style={btnGhost(theme)} onClick={() => go("tournaments", { forceMode: "babyfoot" })}>{t("babyfoot.home.cta.tournaments", "Tournois")}</button>
              <button style={btnGhost(theme)} onClick={() => go("stats")}>{t("babyfoot.home.cta.stats", "Stats")}</button>
            </div>
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
