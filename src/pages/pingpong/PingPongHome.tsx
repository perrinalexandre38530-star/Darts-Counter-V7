// =============================================================
// src/pages/pingpong/PingPongHome.tsx
// HOME Ping-Pong (LOCAL ONLY)
// Objectif: rendu identique aux homes Pétanque / Darts :
// - Header "Bienvenue" + titre
// - ActiveProfileCard + ArcadeTicker
// - Bloc "Vue globale" = KPIs Ping-Pong
// - ✅ Remplacement du bloc/boutons d'accès rapide par un 2e ticker d'infos Ping-Pong
// =============================================================

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import type { Store, Profile } from "../../lib/types";
import ActiveProfileCard, { type ActiveProfileStats } from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";

import { loadPingPongState, newPingPongState, savePingPongState } from "../../lib/pingpongStore";
import { loadPingPongHistory } from "../../lib/pingpongHistory";

type Props = {
  store: Store;
  update: (mut: any) => void; // compat, non utilisé
  go: (tab: any, params?: any) => void;
};

const PAGE_MAX_WIDTH = 620;
const DETAIL_INTERVAL_MS = 7000;

// ✅ Alignement unique (mêmes extérieurs partout)
const SECTION_PAD_X = 10;
const sectionWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: PAGE_MAX_WIDTH,
  paddingInline: SECTION_PAD_X,
};

function safeActiveProfile(store: Store): Profile | null {
  const anyStore = store as any;
  const profiles: Profile[] = anyStore?.profiles ?? [];
  const activeProfileId: string | null = anyStore?.activeProfileId ?? null;
  if (!profiles.length) return null;
  if (!activeProfileId) return profiles[0];
  return profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
}

function emptyActiveProfileStats(): ActiveProfileStats {
  // ⚠️ Pour Ping-Pong on override les KPIs "Vue globale" via globalKpis.
  // On garde un objet compatible pour ne pas afficher les autres slides (records / X01 / cricket / etc.).
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

/**
 * Auto-fit du titre (copié des homes Petanque/Darts) : le titre ne sera jamais coupé,
 * on le scale si ça dépasse.
 */
function useAutoFitTitle(deps: any[] = []) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const text = textRef.current;
      if (!wrap || !text) return;

      // reset scale for accurate measurement
      text.style.transform = "scale(1)";
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      text.offsetHeight;

      const wrapW = wrap.getBoundingClientRect().width;
      const textW = text.getBoundingClientRect().width;

      if (!wrapW || !textW) return;
      const next = textW > wrapW ? Math.max(0.75, Math.min(1, wrapW / textW)) : 1;
      setScale(next);
    };

    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { wrapRef, textRef, scale };
}

export default function PingPongHome({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const activeProfile = useMemo(() => safeActiveProfile(store), [store]);

  // -------------------------------------------------------------
  // ✅ KPI Ping-Pong (LOCAL) pour "Vue globale" du profil actif
  // -------------------------------------------------------------
  const ppGlobalStats = useMemo(() => {
    const profId = String(activeProfile?.id ?? "").trim();
    const profName = String((activeProfile as any)?.name ?? "").trim().toLowerCase();

    const history = loadPingPongHistory();

    // match = tout sauf training
    const matches = history.filter((h: any) => h?.mode !== "training");

    // on ne garde que les matchs où le profil apparaît (id OU nom)
    const myMatches = matches.filter((h: any) => {
      const players = Array.isArray(h?.players) ? h.players : [];
      if (!players.length) return false;

      const byId = profId ? players.some((p: any) => String(p?.id ?? "") === profId) : false;
      const byName = profName
        ? players.some((p: any) => String(p?.name ?? "").trim().toLowerCase() === profName)
        : false;

      return byId || byName;
    });

    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;

    for (const h of myMatches) {
      const winnerId = String(h?.winnerId ?? "");
      const didWin = profId ? winnerId === profId : false;

      if (winnerId) {
        if (didWin) wins += 1;
        else losses += 1;
      }

      const scores = h?.scores && typeof h.scores === "object" ? h.scores : null;
      if (scores) {
        const my = profId ? Number(scores[profId] ?? 0) : 0;
        pointsFor += Number.isFinite(my) ? my : 0;

        // opponents = somme des autres scores
        let opp = 0;
        for (const [k, v] of Object.entries(scores)) {
          if (profId && String(k) === profId) continue;
          const n = Number(v ?? 0);
          opp += Number.isFinite(n) ? n : 0;
        }
        pointsAgainst += opp;
      }
    }

    const played = myMatches.length;
    const decided = wins + losses;
    const winRate = decided > 0 ? wins / decided : 0;

    const avgPts = played > 0 ? pointsFor / played : 0;
    const diff = pointsFor - pointsAgainst;

    return { played, wins, losses, winRate, pointsFor, pointsAgainst, diff, avgPts };
  }, [activeProfile?.id]);

  // -------------------------------------------------------------
  // ✅ Resume de match via pingpongStore
  // -------------------------------------------------------------
  const [resume, setResume] = useState<any>(() => loadPingPongState());

  useEffect(() => {
    try {
      setResume(loadPingPongState());
    } catch {
      setResume(null);
    }
  }, [activeProfile?.id]);

  const seed = String(activeProfile?.id ?? "anon");

  // ✅ Reprendre un match (state non terminé + contenu non vide)
  const canResume = useMemo(() => {
    const st: any = resume;
    if (!st) return false;
    if (st.finished) return false;

    const hasScore = !!(st.setsA || st.setsB || st.pointsA || st.pointsB || (st.setIndex && st.setIndex > 1));
    const hasTournante =
      st.mode === "tournante" &&
      !!(
        st.tournanteActiveA ||
        st.tournanteActiveB ||
        (Array.isArray(st.tournanteQueue) && st.tournanteQueue.length) ||
        (Array.isArray(st.tournanteEliminated) && st.tournanteEliminated.length) ||
        (st.pointsA || st.pointsB) ||
        (st.setIndex && st.setIndex > 1)
      );

    return hasScore || hasTournante;
  }, [resume]);

  // -------------------------------------------------------------
  // ✅ TICKER #1 (conservé)
  // -------------------------------------------------------------
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
        detail: `${st?.sideA ?? "A"} vs ${st?.sideB ?? "B"}`,
        backgroundImage: "",
        accentColor: theme.primary ?? "#F6C256",
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

  // -------------------------------------------------------------
  // ✅ TICKER #2 (nouveau) : infos Ping-Pong (actualité / nouveautés / astuces / évènements / résultats)
  // Remplace l'ancien bloc avec boutons "Accès rapide"
  // -------------------------------------------------------------
  const infoItems: ArcadeTickerItem[] = useMemo(
    () => [
      {
        id: "pp-news",
        title: t("pingpong.home.info.news.title", "Actualité"),
        text: t("pingpong.home.info.news.text", "Nouvelle page Ping-Pong : vue globale dédiée + tickers d'infos."),
        detail: t("pingpong.home.info.news.detail", "Mise à jour"),
        backgroundImage: "",
        accentColor: theme.primary ?? "#F6C256",
      },
      {
        id: "pp-new",
        title: t("pingpong.home.info.new.title", "Nouveauté"),
        text: t("pingpong.home.info.new.text", "Ajoute tes matchs : ton winrate et tes points se mettent à jour automatiquement."),
        detail: t("pingpong.home.info.new.detail", "Local only"),
        backgroundImage: "",
        accentColor: "#00E5A8",
      },
      {
        id: "pp-tips",
        title: t("pingpong.home.info.tips.title", "Infos & astuces"),
        text: t("pingpong.home.info.tips.text", "Service court, remise tendue : varie les rythmes, pas seulement la vitesse."),
        detail: t("pingpong.home.info.tips.detail", "Technique"),
        backgroundImage: "",
        accentColor: "#FFFFFF",
      },
      {
        id: "pp-events",
        title: t("pingpong.home.info.events.title", "Évènements"),
        text: t("pingpong.home.info.events.text", "Crée un mini-tournoi maison : enregistre les résultats pour suivre tes séries."),
        detail: t("pingpong.home.info.events.detail", "Organisation"),
        backgroundImage: "",
        accentColor: "#B26BFF",
      },
      {
        id: "pp-results",
        title: t("pingpong.home.info.results.title", "Résultats"),
        text: t("pingpong.home.info.results.text", "Consulte ton historique Ping-Pong pour revoir tes scores et ta progression."),
        detail: t("pingpong.home.info.results.detail", "Historique"),
        backgroundImage: "",
        accentColor: "#FFB24A",
      },
    ],
    [t, theme.primary]
  );

  const [infoIndex, setInfoIndex] = useState(0);

  useEffect(() => {
    if (!infoItems.length) return;
    const id = window.setInterval(() => {
      setInfoIndex((prev) => (infoItems.length ? (prev + 1) % infoItems.length : 0));
    }, 6500);
    return () => window.clearInterval(id);
  }, [infoItems.length]);

  useEffect(() => {
    setInfoIndex(0);
  }, [activeProfile?.id]);

  // -------------------------------------------------------------
  // ✅ Header "Bienvenue" + titre
  // -------------------------------------------------------------
  const { wrapRef: titleWrapRef, textRef: titleTextRef, scale: titleScale } = useAutoFitTitle([
    theme.primary,
    t("home.welcome", "Bienvenue"),
  ]);

  return (
    <div
      className="pingpong-home container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: 16,
        paddingBottom: 90,
        alignItems: "center",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <style>{`
        @keyframes dcTitlePulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }
        @keyframes dcTitleShimmer { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
      `}</style>

      {/* ===== HEADER (Bienvenue + titre) ===== */}
      <div style={{ ...sectionWrap, marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {/* ✅ Bienvenue = pill/badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
              background: "rgba(255,255,255,0.06)",
              boxShadow: "0 6px 22px rgba(0,0,0,0.28)",
              fontWeight: 950,
              letterSpacing: 0.25,
              color: theme.text,
              userSelect: "none",
            }}
          >
            <span style={{ opacity: 0.95 }}>👋</span>
            <span>{t("home.welcome", "Bienvenue")}</span>
          </div>

          {/* ✅ Titre auto-fit (jamais coupé) */}
          <div ref={titleWrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <div
              ref={titleTextRef}
              style={{
                transform: `scale(${titleScale})`,
                transformOrigin: "center",
                fontSize: 28,
                fontWeight: 1000,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                lineHeight: 1.05,
                paddingInline: 6,
                backgroundImage: `linear-gradient(90deg, ${theme.primary} 0%, #ffffff 35%, ${theme.primary} 70%, #ffffff 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                backgroundSize: "200% 100%",
                animation: "dcTitleShimmer 3.6s linear infinite, dcTitlePulse 2.8s ease-in-out infinite",
                textShadow: "0 10px 30px rgba(0,0,0,0.35)",
                whiteSpace: "nowrap",
              }}
            >
              {t("pingpong.title", "Ping-Pong")}
            </div>
          </div>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div style={{ ...sectionWrap }}>
        <div style={{ marginBottom: 10 }}>
          <ActiveProfileCard
            hideStatus={true}
            profile={activeProfile as any}
            stats={
              {
                // ✅ mapping simple (utilisé si jamais, mais on override via globalKpis)
                ratingGlobal: ppGlobalStats.diff,
                winrateGlobal: ppGlobalStats.winRate,
                avg3DGlobal: ppGlobalStats.avgPts,
                sessionsGlobal: ppGlobalStats.played,
                favoriteNumberLabel: "—",
              } as any
            }
            globalTitle={t("pingpong.home.global.title", "Vue globale")}
            globalKpis={[
              { label: t("pingpong.home.global.played", "Matchs"), value: ppGlobalStats.played },
              { label: t("pingpong.home.global.wl", "V / D"), value: `${ppGlobalStats.wins} / ${ppGlobalStats.losses}` },
              { label: t("pingpong.home.global.winrate", "Winrate"), value: `${Math.round(ppGlobalStats.winRate * 100)}%` },
              { label: t("pingpong.home.global.points", "Pts (pour/contre)"), value: `${ppGlobalStats.pointsFor} / ${ppGlobalStats.pointsAgainst}` },
              { label: t("pingpong.home.global.diff", "Diff."), value: ppGlobalStats.diff >= 0 ? `+${ppGlobalStats.diff}` : `${ppGlobalStats.diff}` },
            ]}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <ArcadeTicker items={tickerItems} activeIndex={tickerIndex} onChangeIndex={setTickerIndex} />
        </div>

        {/* ✅ Remplacement de l'ancien bloc avec boutons : ticker d'infos Ping-Pong */}
        <div style={{ marginBottom: 12 }}>
          <ArcadeTicker items={infoItems} activeIndex={infoIndex} onChangeIndex={setInfoIndex} />
        </div>

        {/* CTA minimal (sans boutons dans le "ticker") : on garde un accès logique via le menu global.
            Si tu veux remettre 1 seul bouton discret, dis-moi où tu préfères (en header, ou sous les tickers). */}
        {canResume && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
            <button
              onClick={() => go("pingpong_play")}
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(255,255,255,0.08)",
                color: theme.text,
                fontWeight: 950,
                cursor: "pointer",
                boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
              }}
            >
              {t("pingpong.cta.resume", "Reprendre le match")}
            </button>
            <button
              onClick={() => {
                try {
                  savePingPongState(newPingPongState());
                } catch {}
                setResume(loadPingPongState());
                go("pingpong_play");
              }}
              style={{
                marginLeft: 10,
                borderRadius: 999,
                padding: "10px 14px",
                border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(255,255,255,0.04)",
                color: theme.text,
                fontWeight: 900,
                cursor: "pointer",
                opacity: 0.96,
              }}
            >
              {t("pingpong.cta.new", "Nouvelle partie")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
