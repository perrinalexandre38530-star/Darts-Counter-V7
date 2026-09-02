// =============================================================
// src/components/home/ActiveProfileCard.tsx
// Carte joueur actif scindée en 2 :
// - Gauche : avatar médaillon + nom + statut (sur carte dorée)
// - Droite : carrousel auto sans plafond, alimenté par tous les modes joués
//   Vue globale / Records / Online / X01 / Cricket / Killer + résumés History
// - N'affiche que les slides qui ont des données (ex : sessions > 0)
// - Stats affichées en blocs KPI centrés avec halo léger
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../ProfileAvatar";
import ProfileStarRing from "../ProfileStarRing";
import type { Profile } from "../../lib/types";

type MaybeNum = number | null | undefined;

export type ActiveProfileStats = {
  // ---- Vue globale ----
  ratingGlobal?: MaybeNum;
  winrateGlobal?: MaybeNum; // 0–1
  avg3DGlobal?: MaybeNum;
  sessionsGlobal?: MaybeNum;
  favoriteNumberLabel?: string | null; // ex: "T20", "D16", "S19"

  // ---- Records ----
  recordBestVisitX01?: MaybeNum;
  recordBestCOX01?: MaybeNum;
  recordMinDarts501?: MaybeNum;
  recordBestAvg3DX01?: MaybeNum;
  recordBestStreak?: MaybeNum;
  recordBestCricketScore?: MaybeNum;

  // ---- Online ----
  onlineMatches?: MaybeNum;
  onlineWinrate?: MaybeNum; // 0–1
  onlineAvg3D?: MaybeNum;
  onlineBestVisit?: MaybeNum;
  onlineBestCO?: MaybeNum;
  onlineRank?: MaybeNum;
  onlineBestRank?: MaybeNum;

  // ---- X01 Multi ----
  x01MultiAvg3D?: MaybeNum;
  x01MultiSessions?: MaybeNum;
  x01MultiWinrate?: MaybeNum;
  x01MultiBestVisit?: MaybeNum;
  x01MultiBestCO?: MaybeNum;
  x01MultiBestAvg3D?: MaybeNum;
  x01MultiMinDartsLabel?: string | null; // ex: "11 darts (501)"

  // ---- Cricket ----
  cricketPointsPerRound?: MaybeNum;
  cricketHitsTotal?: MaybeNum;
  cricketCloseRate?: MaybeNum; // 0–1
  cricketLegsWinrate?: MaybeNum; // 0–1
  cricketAvgClose201918?: MaybeNum;
  cricketOpenings?: MaybeNum;

  // ---- Killer ----
  killerSessions?: MaybeNum;
  killerWins?: MaybeNum;
  killerWinrate?: MaybeNum;
  killerKills?: MaybeNum;
  killerTotalHits?: MaybeNum;
  killerFavNumberHits?: MaybeNum;
  killerFavSegmentHits?: MaybeNum;

  // ---- Training X01 ----
  trainingAvg3D?: MaybeNum;
  trainingHitsS?: MaybeNum;
  trainingHitsD?: MaybeNum;
  trainingHitsT?: MaybeNum;
  trainingGoalSuccessRate?: MaybeNum; // 0–1
  trainingBestCO?: MaybeNum;

  // ---- Tour de l'Horloge ----
  clockSessions?: MaybeNum;
  clockTargetsHit?: MaybeNum;
  clockAttempts?: MaybeNum;
  clockSuccessRate?: MaybeNum; // 0–1
  clockTotalTimeSec?: MaybeNum;
  clockBestStreak?: MaybeNum;

  // ---- Résumés automatiques de tous les modes joués (History) ----
  homeModeSlides?: SlideDef[];
};

type Props = {
  hideStatus?: boolean;
  hideStarRing?: boolean;
  starAvg3D?: MaybeNum;
  customSlides?: SlideDef[];
  suppressDefaultStatsSlides?: boolean;

  // ✅ override des KPIs (ex: Pétanque)
  globalKpis?: { label: string; value: string | number }[];
  globalTitle?: string;

  profile: Profile | null;
  stats: ActiveProfileStats;

  // optionnel : si Home le fournit, on l'utilise, sinon fallback sur profile.status
  status?: "online" | "away" | "offline";
};

export type SlideRowDef = {
  label: string;
  value: string;
  onClick?: () => void;
  backgroundImage?: string;
  tileImage?: string;
  ariaLabel?: string;
};

export type SlideDef = {
  id: string;
  title: string;
  rows: SlideRowDef[];
};

function fmtPct(v?: MaybeNum): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(0)}%`;
}

function fmtNum(v?: MaybeNum, decimals = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  const n = Number(v);
  return n % 1 === 0 ? String(n) : n.toFixed(decimals);
}

/* ============================================================
   CSS shimmer du nom (même logique que StatsHub)
============================================================ */

const statsNameCss = `
.dc-stats-name-wrapper { position: relative; isolation: isolate; }
.dc-stats-name-base, .dc-stats-name-shimmer { position: relative; }

.dc-stats-name-base {
  color: var(--dc-accent, #f6c256);
  text-shadow:
    0 0 4px rgba(0,0,0,0.9),
    0 0 10px var(--dc-accent-soft, rgba(246,194,86,0.4)),
    0 0 18px var(--dc-accent-soft, rgba(246,194,86,0.4));
}

.dc-stats-name-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(255,255,255,0.1) 20%,
    rgba(255,255,255,0.95) 50%,
    rgba(255,255,255,0.15) 80%,
    transparent 100%
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0.9;
  mix-blend-mode: screen;
  animation: dcStatsNameShimmer 3.6s ease-in-out infinite;
}

@keyframes dcStatsNameShimmer {
  0%   { background-position: -80% 0; transform: scale(1); }
  45%  { background-position: 130% 0; transform: scale(1.05); }
  100% { background-position: 130% 0; transform: scale(1); }
}
`;

function useInjectStatsNameCss() {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("dc-stats-name-css")) return;
    const style = document.createElement("style");
    style.id = "dc-stats-name-css";
    style.innerHTML = statsNameCss;
    document.head.appendChild(style);
  }, []);
}


function normalizeNickKey(value: any): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function looksLikeEmailLocalNickname(candidate: any, email: any): boolean {
  const cand = normalizeNickKey(candidate);
  const mail = String(email || "").trim().toLowerCase();
  if (!cand || !mail.includes("@")) return false;
  const local = normalizeNickKey(mail.split("@")[0]);
  if (!local) return false;
  if (cand === local) return true;
  if (cand.length >= 6 && local.startsWith(cand)) return true;
  return local.length >= 6 && cand.startsWith(local.slice(0, Math.min(local.length, 12)))
}



function looksLikeGenericPlayerName(candidate: any): boolean {
  const v = String(candidate || "").trim().toLowerCase();
  if (!v) return true;
  const normalized = v.replace(/[^a-z0-9]/g, "");
  return normalized === "joueur" || normalized === "player" || normalized === "hote" || normalized === "host" || normalized === "moi" || normalized === "user";
}

function getLinkedProfileNameCandidates(profile: any): string[] {
  try {
    const profiles = Array.isArray((window as any)?.__appStore?.store?.profiles)
      ? (window as any).__appStore.store.profiles
      : [];
    const ids = new Set<string>();
    const push = (v: any) => {
      const s = String(v || "").trim().toLowerCase();
      if (s) ids.add(s);
    };
    push(profile?.id);
    push(profile?.userId);
    push(profile?.privateInfo?.onlineUserId);
    push(profile?.privateInfo?.userId);
    push(profile?.privateInfo?.accountUserId);
    push(profile?.email);
    push(profile?.privateInfo?.email);
    push(profile?.privateInfo?.onlineEmail);

    const out: string[] = [];
    for (const p of profiles as any[]) {
      const refs = [
        p?.id,
        p?.userId,
        p?.privateInfo?.onlineUserId,
        p?.privateInfo?.userId,
        p?.privateInfo?.accountUserId,
        p?.email,
        p?.privateInfo?.email,
        p?.privateInfo?.onlineEmail,
      ].map((v) => String(v || "").trim().toLowerCase()).filter(Boolean);
      if (!refs.some((r) => ids.has(r))) continue;
      const names = [p?.privateInfo?.nickname, p?.surname, p?.displayName, p?.name]
        .map((v) => String(v || "").trim())
        .filter(Boolean);
      out.push(...names);
    }
    return out;
  } catch {
    return [];
  }
}
/* ============================================================
   Composant principal
============================================================ */

function ActiveProfileCard({
  hideStatus,
  hideStarRing,
  globalKpis,
  globalTitle,
  profile,
  stats,
  status: statusProp,
  starAvg3D,
  customSlides,
  suppressDefaultStatsSlides,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const [index, setIndex] = useState(0);

  useInjectStatsNameCss();

  if (!profile) return null;

  const primary = theme.primary ?? "#F6C256";

  const shimmerCss = `
    @keyframes apcTitlePulse {
      0%, 100% { transform: translateY(0) scale(1); text-shadow: 0 0 6px ${primary}55; }
      50% { transform: translateY(-1px) scale(1.01); text-shadow: 0 0 12px ${primary}AA; }
    }
    @keyframes apcValueGlow {
      0%, 100% { text-shadow: 0 0 6px ${primary}66; }
      50% { text-shadow: 0 0 12px ${primary}CC; }
    }
  `;

  const slides = useMemo<SlideDef[]>(() => {
        const s: any = stats ?? {};
    const out: SlideDef[] = [];

    // ✅ KILLER (stats attachées via Home.tsx, donc access en any ici)
    const killerSessions = Number(s?.killerSessions ?? 0) || 0;
    const killerWins = Number(s?.killerWins ?? 0) || 0;
    const killerWinrate01 = Number(s?.killerWinrate ?? 0) || 0; // attendu 0-1
    const killerKills = Number(s?.killerKills ?? 0) || 0;
    const killerTotalHits = Number(s?.killerTotalHits ?? 0) || 0;
    const killerFavNumberHits = Number(s?.killerFavNumberHits ?? 0) || 0;
    const killerFavSegmentHits = Number(s?.killerFavSegmentHits ?? 0) || 0;
    const x01BestAvg3D = Number(s?.x01MultiBestAvg3D ?? s?.recordBestAvg3DX01 ?? 0) || 0;

    const hasKillerData =
      killerSessions > 0 ||
      killerKills > 0 ||
      killerTotalHits > 0 ||
      killerFavNumberHits > 0 ||
      killerFavSegmentHits > 0;

    // 1) Vue globale — TOUJOURS AFFICHÉE
    out.push({
      id: "global",
      title: globalTitle ?? t("home.stats?.global", "Vue globale"),
      rows:
        globalKpis && globalKpis.length
          ? globalKpis.map((k) => ({
              label: String(k.label),
              value: String(k.value),
            }))
          : [
              { label: t("home.stats?.rating", "rating"), value: fmtNum(Number(s.ratingGlobal ?? 0), 1) },
              { label: t("home.stats?.winrateGlobal", "win%"), value: fmtPct(Number(s.winrateGlobal ?? 0)) },
              { label: t("home.stats?.avg3dGlobal", "AVG3D"), value: fmtNum(Number(s.avg3DGlobal ?? 0), 2) },
              { label: t("home.stats?.sessionsGlobal", "sessions"), value: fmtNum(Number(s.sessionsGlobal ?? 0), 0) },
              { label: t("home.stats?.bestVisit", "best visit"), value: fmtNum(Number(s.recordBestVisitX01 ?? 0), 0) },
              { label: t("home.stats?.bestCO", "best co"), value: fmtNum(Number(s.recordBestCOX01 ?? 0), 0) },
            ],
    });

    if (Array.isArray(customSlides) && customSlides.length) {
      for (const custom of customSlides) {
        if (!custom || !custom.rows?.length) continue;
        out.push({
          id: String(custom.id || `custom-${out.length}`),
          title: String(custom.title || "Stats"),
          rows: custom.rows.map((row) => ({
            label: String(row.label || ""),
            value: String(row.value ?? "—"),
            onClick: row.onClick,
            backgroundImage: row.backgroundImage,
            tileImage: row.tileImage,
            ariaLabel: row.ariaLabel,
          })),
        });
      }
    }

    const automaticModeSlides: SlideDef[] = Array.isArray(s.homeModeSlides)
      ? s.homeModeSlides
          .filter((slide: any) => slide && Array.isArray(slide.rows) && slide.rows.length > 0)
          .map((slide: any, modeIndex: number) => ({
            id: String(slide.id || `mode-${modeIndex}`),
            title: String(slide.title || "Stats"),
            rows: slide.rows.slice(0, 6).map((row: any) => ({
              label: String(row?.label || ""),
              value: String(row?.value ?? "0"),
            })),
          }))
      : [];
    const automaticModeIds = new Set(automaticModeSlides.map((slide) => slide.id));

    if (suppressDefaultStatsSlides) return out;

    // 2) Killer
    if (hasKillerData && !automaticModeIds.has("mode-killer")) {
      out.push({
        id: "killer",
        title: t("home.stats?.killer", "killer"),
        rows: [
          { label: t("home.stats?.killerSessions", "sessions"), value: fmtNum(killerSessions, 0) },
          { label: t("home.stats?.killerWins", "victoires"), value: fmtNum(killerWins, 0) },
          { label: t("home.stats?.killerWinrate", "win%"), value: fmtPct(killerWinrate01) },
          { label: t("home.stats?.killerKills", "kills"), value: fmtNum(killerKills, 0) },
          { label: t("home.stats?.killerHits", "hits"), value: fmtNum(killerTotalHits, 0) },
          { label: t("home.stats?.killerKillsPerSession", "kills/session"), value: fmtNum(killerSessions > 0 ? killerKills / killerSessions : 0, 2) },
        ],
      });
    }

    // 3) Records
    if (
      (s.sessionsGlobal ?? 0) > 0 ||
      (s.x01MultiSessions ?? 0) > 0 ||
      (s.recordBestVisitX01 ?? 0) > 0 ||
      (s.recordBestCOX01 ?? 0) > 0 ||
      (s.recordBestCricketScore ?? 0) > 0
    ) {
      out.push({
        id: "records",
        title: t("home.stats?.records", "records"),
        rows: [
          { label: t("home.stats?.bestVisitX01", "best visit"), value: fmtNum(Number(s.recordBestVisitX01 ?? 0), 0) },
          { label: t("home.stats?.bestCOX01", "best co"), value: fmtNum(Number(s.recordBestCOX01 ?? 0), 0) },
          { label: t("home.stats?.bestAvg3DX01", "best AVG3D"), value: fmtNum(Number(s.recordBestAvg3DX01 ?? 0), 2) },
          { label: t("home.stats?.bestStreak", "meilleure série"), value: fmtNum(Number(s.recordBestStreak ?? 0), 0) },
          { label: t("home.stats?.bestCricketScore", "best cricket"), value: fmtNum(Number(s.recordBestCricketScore ?? 0), 0) },
          Number(s.recordMinDarts501 ?? 0) > 0
            ? { label: t("home.stats?.minDarts501", "min darts 501"), value: fmtNum(Number(s.recordMinDarts501), 0) }
            : { label: t("home.stats?.sessions", "sessions X01"), value: fmtNum(Number(s.x01MultiSessions ?? 0), 0) },
        ],
      });
    }

    // 4) Online
    if ((s.onlineMatches ?? 0) > 0) {
      out.push({
        id: "online",
        title: t("home.stats?.online", "online"),
        rows: [
          { label: t("home.stats?.onlineMatches", "matchs"), value: fmtNum(s.onlineMatches, 0) },
          { label: t("home.stats?.onlineWinrate", "win%"), value: fmtPct(s.onlineWinrate) },
          { label: t("home.stats?.onlineAvg3D", "AVG3D"), value: fmtNum(s.onlineAvg3D, 2) },
          { label: t("home.stats?.onlineBestVisit", "best visit"), value: fmtNum(s.onlineBestVisit, 0) },
          { label: t("home.stats?.onlineBestCO", "best co"), value: fmtNum(s.onlineBestCO, 0) },
          {
            label: t("home.stats?.onlineRank", "rank"),
            value:
              s.onlineRank != null
                ? s.onlineBestRank != null
                  ? `${fmtNum(s.onlineRank, 0)} (${fmtNum(s.onlineBestRank, 0)})`
                  : fmtNum(s.onlineRank, 0)
                : t("home.stats?.unranked", "non classé"),
          },
        ],
      });
    }

    // 5) X01 Multi
    if ((s.x01MultiSessions ?? 0) > 0 && !automaticModeIds.has("mode-x01")) {
      out.push({
        id: "x01multi",
        title: t("home.stats?.x01multi", "x01 multi"),
        rows: [
          { label: t("home.stats?.avg3d", "AVG3D"), value: fmtNum(Number(s.x01MultiAvg3D ?? 0), 2) },
          { label: t("home.stats?.sessions", "sessions"), value: fmtNum(Number(s.x01MultiSessions ?? 0), 0) },
          { label: t("home.stats?.winrate", "win%"), value: fmtPct(Number(s.x01MultiWinrate ?? 0)) },
          { label: t("home.stats?.bestVisit", "best visit"), value: fmtNum(Number(s.x01MultiBestVisit ?? 0), 0) },
          { label: t("home.stats?.bestCO", "best co"), value: fmtNum(Number(s.x01MultiBestCO ?? 0), 0) },
          String(s.x01MultiMinDartsLabel ?? "").trim() && String(s.x01MultiMinDartsLabel).trim() !== "0"
            ? { label: t("home.stats?.minDarts", "min darts"), value: String(s.x01MultiMinDartsLabel).trim() }
            : { label: t("home.stats?.bestAvg3DX01", "best AVG3D"), value: fmtNum(x01BestAvg3D, 2) },
        ],
      });
    }

    // 6) Cricket
    if (((s.cricketOpenings ?? 0) > 0 || (s.cricketHitsTotal ?? 0) > 0) && !automaticModeIds.has("mode-cricket")) {
      out.push({
        id: "cricket",
        title: t("home.stats?.cricket", "cricket"),
        rows: [
          { label: t("home.stats?.cricketMpr", "MPR"), value: fmtNum(Number(s.cricketPointsPerRound ?? 0), 2) },
          { label: t("home.stats?.cricketMarks", "marks"), value: fmtNum(Number(s.cricketHitsTotal ?? 0), 0) },
          { label: t("home.stats?.cricketHitRate", "hit%"), value: fmtPct(Number(s.cricketCloseRate ?? 0)) },
          { label: t("home.stats?.legsWinrate", "win%"), value: fmtPct(Number(s.cricketLegsWinrate ?? 0)) },
          { label: t("home.stats?.cricketAvgScore", "score moyen"), value: fmtNum(Number(s.cricketAvgClose201918 ?? 0), 1) },
          { label: t("home.stats?.sessions", "sessions"), value: fmtNum(Number(s.cricketOpenings ?? 0), 0) },
        ],
      });
    }

    // Tous les autres modes réellement joués, triés par nombre de sessions.
    // Aucun plafond : chaque mode présent dans l'Historique doit entrer dans la boucle.
    out.push(...automaticModeSlides);

    // 7) Training X01
    if ((s.trainingHitsS ?? 0) + (s.trainingHitsD ?? 0) + (s.trainingHitsT ?? 0) > 0 && !automaticModeIds.has("mode-training")) {
      out.push({
        id: "trainingx01",
        title: t("home.stats?.trainingX01", "training x01"),
        rows: [
          { label: t("home.stats?.avg3dTraining", "AVG3D"), value: fmtNum(s.trainingAvg3D, 2) },
          { label: t("home.stats?.hitsS", "hits s"), value: fmtNum(s.trainingHitsS, 0) },
          { label: t("home.stats?.hitsD", "hits d"), value: fmtNum(s.trainingHitsD, 0) },
          { label: t("home.stats?.hitsT", "hits t"), value: fmtNum(s.trainingHitsT, 0) },
          { label: t("home.stats?.goalSuccess", "obj%"), value: fmtPct(s.trainingGoalSuccessRate) },
          { label: t("home.stats?.bestCOTraining", "best co"), value: fmtNum(s.trainingBestCO, 0) },
        ],
      });
    }

    // 8) Horloge
    if (((s.clockSessions ?? 0) > 0 || (s.clockTargetsHit ?? 0) > 0) && !automaticModeIds.has("mode-clock")) {
      const clockSessions = Number(s.clockSessions ?? 0) || 0;
      const clockTotalTime = Number(s.clockTotalTimeSec ?? 0) || 0;
      out.push({
        id: "clock",
        title: t("home.stats?.clock", "horloge"),
        rows: [
          { label: t("home.stats?.sessions", "sessions"), value: fmtNum(clockSessions, 0) },
          { label: t("home.stats?.targetsHit", "cibles"), value: fmtNum(s.clockTargetsHit, 0) },
          { label: t("home.stats?.attempts", "essais"), value: fmtNum(s.clockAttempts, 0) },
          { label: t("home.stats?.clockSuccess", "succès%"), value: fmtPct(s.clockSuccessRate) },
          {
            label: t("home.stats?.clockAvgTime", "temps moyen"),
            value: `${Math.round(clockSessions > 0 ? clockTotalTime / clockSessions : clockTotalTime)} s`,
          },
          { label: t("home.stats?.bestStreakClock", "série"), value: fmtNum(s.clockBestStreak, 0) },
        ],
      });
    }

    return out;
  }, [stats, t, globalTitle, globalKpis, customSlides, suppressDefaultStatsSlides]);

  useEffect(() => {
    if (!slides.length) {
      setIndex(0);
      return;
    }
    setIndex((i) => (i >= slides.length ? 0 : i));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const slide = slides[index] ?? slides[0];

  const status: "online" | "away" | "offline" =
    statusProp ??
    (((profile as any).status as "online" | "away" | "offline" | undefined) ?? "online");

  const statusColor =
    status === "online" ? "#18FF6D" : status === "away" ? "#FFD95E" : "#888888";

  const accent = (theme as any).accent ?? primary;
  const accentSoft = (theme as any).accent20 ?? `${primary}33`;
  const profileEmail =
    String(
      (profile as any)?.email ||
      (profile as any)?.privateInfo?.email ||
      (profile as any)?.privateInfo?.onlineEmail ||
      ""
    ).trim().toLowerCase();

  const lastStableProfileNameRef = React.useRef<string>("");

  const profileName = React.useMemo(() => {
    const candidates = [
      (profile as any)?.privateInfo?.nickname,
      (profile as any)?.name,
      (profile as any)?.surname,
      (profile as any)?.displayName,
      ...getLinkedProfileNameCandidates(profile),
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean);

    const picked = candidates.find((value) => {
      if (!value) return false;
      if (looksLikeEmailLocalNickname(value, profileEmail)) return false;
      if (looksLikeGenericPlayerName(value)) return false;
      return true;
    }) || "";

    if (picked) {
      lastStableProfileNameRef.current = picked;
      return picked;
    }

    if (lastStableProfileNameRef.current) {
      return lastStableProfileNameRef.current;
    }

    return t("home.noName", "Joueur");
  }, [
    (profile as any)?.privateInfo?.nickname,
    (profile as any)?.name,
    (profile as any)?.surname,
    (profile as any)?.displayName,
    (profile as any)?.id,
    profileEmail,
    t,
  ]);

  const handleNextSlide = React.useCallback(() => {
    if (!slides.length || slides.length <= 1) return;
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const handlePreviousSlide = React.useCallback(() => {
    if (!slides.length || slides.length <= 1) return;
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const swipeStartRef = React.useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const swipeMovedRef = React.useRef(false);
  const onSlidePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (slides.length <= 1) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    swipeMovedRef.current = false;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  };
  const onSlidePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swipeMovedRef.current = true;
  };
  const onSlidePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      if (dx < 0) handleNextSlide();
      else handlePreviousSlide();
    }
  };

  const starRingAvg3D = Number.isFinite(Number(starAvg3D))
    ? Number(starAvg3D)
    : Number(stats?.avg3DGlobal ?? 0) || 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shimmerCss }} />
      <div
        style={{
          borderRadius: 24,
          padding: 16,
          marginBottom: 14,
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.04), rgba(0,0,0,0.95))",
          border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.10)"}`,
          boxShadow: `0 0 24px rgba(0,0,0,0.8), 0 0 30px ${primary}33`,
          display: "flex",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {/* Colonne gauche */}
        <div style={{ width: 130, minWidth: 130, display: "flex", alignItems: "stretch" }}>
          <div
            style={{
              borderRadius: 22,
              padding: 10,
              background:
                "radial-gradient(circle at 0% 0%, rgba(246,194,86,0.22), rgba(5,7,16,0.96))",
              border: `1px solid ${primary}77`,
              boxShadow: `0 0 28px ${primary}55`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
            }}
          >
            <div style={{ position: "relative", width: 84, height: 84, marginBottom: 4 }}>
              <ProfileAvatar
                size={84}
                profile={profile as any}
                ringColor={primary}
                showStars={false}
              />
              {!hideStarRing && (
                <div style={{ position: "absolute", inset: 0, transform: "translateX(2px) translateY(-1px)", pointerEvents: "none" }}>
                  <ProfileStarRing
                    anchorSize={84}
                    avg3d={starRingAvg3D}
                    gapPx={-2}
                    starSize={14}
                    stepDeg={10}
                    animateGlow={true}
                  />
                </div>
              )}
            </div>

            {/* NOM shimmer */}
            <div style={{ marginTop: 2, maxWidth: "100%" }}>
              <span
                className="dc-stats-name-wrapper"
                style={
                  {
                    "--dc-accent": accent,
                    "--dc-accent-soft": accentSoft,
                    maxWidth: "100%",
                    display: "block",
                  } as React.CSSProperties
                }
              >
                <span
                  className="dc-stats-name-base"
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    fontFamily: '"Luckiest Guy","Impact","system-ui",sans-serif',
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                    textAlign: "center",
                  }}
                >
                  {profileName}
                </span>
                <span
                  className="dc-stats-name-shimmer"
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    fontFamily: '"Luckiest Guy","Impact","system-ui",sans-serif',
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                    textAlign: "center",
                  }}
                >
                  {profileName}
                </span>
              </span>
            </div>

            {/* Statut */}
            {!hideStatus && status && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: statusColor,
                    boxShadow: status === "offline" ? "none" : `0 0 8px ${statusColor}, 0 0 14px ${statusColor}`,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.textSoft ?? "rgba(255,255,255,0.7)" }}>
                  {status === "online"
                    ? t("status.online", "En ligne")
                    : status === "away"
                    ? t("status.away", "Absent")
                    : t("status.offline", "Hors ligne")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite */}
        <div
          onPointerDown={onSlidePointerDown}
          onPointerMove={onSlidePointerMove}
          onPointerUp={onSlidePointerUp}
          onPointerCancel={() => { swipeStartRef.current = null; }}
          style={{
            flex: 1,
            borderRadius: 18,
            padding: 12,
            background: `linear-gradient(135deg, ${primary}18, rgba(0,0,0,0.98))`,
            position: "relative",
            overflow: "hidden",
            boxShadow: `0 0 24px ${primary}55, inset 0 0 0 1px rgba(0,0,0,0.8)`,
            border: `1px solid ${primary}AA`,
            cursor: slides.length > 1 ? "grab" : "default",
            touchAction: "pan-y",
            userSelect: "none",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -20,
              background: `radial-gradient(circle at top, ${primary}22, transparent 60%)`,
              opacity: 0.6,
              pointerEvents: "none",
            }}
          />

          {slide && (
            <div key={slide.id} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 4 }}>
                <div
                  style={{
                    width: "100%",
                    fontSize: 14,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    color: primary,
                    textAlign: "center",
                    textTransform: "uppercase",
                    animation: "apcTitlePulse 3.2s ease-in-out infinite",
                  }}
                >
                  {String(slide.title || "").toLocaleUpperCase("fr-FR")}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
                {slide.rows.map((row) => (
                  <KpiCell
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    primary={primary}
                    theme={theme}
                    onClick={row.onClick}
                    backgroundImage={row.backgroundImage}
                    tileImage={row.tileImage}
                    ariaLabel={row.ariaLabel}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

type KpiCellProps = {
  label: string;
  value: string;
  primary: string;
  theme: any;
  onClick?: () => void;
  backgroundImage?: string;
  tileImage?: string;
  ariaLabel?: string;
};

function splitKpiDisplayValue(value: string) {
  const raw = String(value || "").trim();
  const match = raw.match(/^([+−-]?\d+(?:[.,]\d+)?)(?:\s*)(km\/h|km|m|bpm|spm|%|\/km)$/i);
  return match ? { main: match[1], unit: match[2] } : { main: raw, unit: "" };
}

function KpiCell({ label, value, primary, theme, onClick, backgroundImage, tileImage, ariaLabel }: KpiCellProps) {
  const display = splitKpiDisplayValue(value);
  const interactive = typeof onClick === "function";
  const illustrationMode = Boolean(tileImage);
  const content = (
    <>
      {backgroundImage ? <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(180deg,rgba(2,5,10,.22),rgba(2,5,10,.86)),url("${backgroundImage}")`, backgroundSize: "cover", backgroundPosition: "center", opacity: .9, pointerEvents: "none" }} /> : null}
      {illustrationMode ? <div aria-hidden style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 12%, ${primary}18, transparent 48%), linear-gradient(180deg, rgba(255,255,255,.04), rgba(4,8,16,.02) 34%, rgba(4,8,16,.22) 100%)`, pointerEvents: "none" }} /> : null}
      {illustrationMode && tileImage ? (
        <div style={{ position: "relative", zIndex: 1, minHeight: 58, marginBottom: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={tileImage} alt="" style={{ maxWidth: "76%", maxHeight: 58, objectFit: "contain", filter: "drop-shadow(0 8px 16px rgba(0,0,0,.6))" }} />
        </div>
      ) : null}
      <div style={{ position: "relative", zIndex: 1, fontSize: illustrationMode ? 11.2 : 10, fontWeight: illustrationMode ? 800 : 600, letterSpacing: illustrationMode ? 0.2 : 0.4, opacity: illustrationMode ? 0.96 : 0.88, marginBottom: illustrationMode ? 2 : 3, textTransform: illustrationMode ? "none" : "lowercase", color: illustrationMode ? "#f4fbff" : undefined, textShadow: illustrationMode ? "0 2px 8px rgba(0,0,0,.55)" : undefined }}>
        {label}
      </div>
      {!illustrationMode ? <div style={{ position: "relative", zIndex: 1, height: 2, width: 32, borderRadius: 999, marginBottom: 4, background: `linear-gradient(90deg, transparent, ${primary}, transparent)`, boxShadow: `0 0 8px ${primary}66` }} /> : null}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: illustrationMode ? "center" : "baseline", justifyContent: "center", gap: 3, minWidth: 0, color: illustrationMode ? (theme.textSoft ?? "rgba(255,255,255,.76)") : primary, animation: illustrationMode ? undefined : "apcValueGlow 2.8s ease-in-out infinite", lineHeight: illustrationMode ? 1.2 : 1.05, textAlign: "center", maxWidth: "100%" }}>
        {illustrationMode ? (
          <span style={{ fontSize: 8.8, fontWeight: 600, opacity: .92, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any }}>
            {value}
          </span>
        ) : (
          <>
            <span style={{ fontSize: interactive ? 17 : 20, fontWeight: 900, minWidth: 0, textShadow: backgroundImage ? "0 2px 12px #000" : undefined }}>{display.main}</span>
            {display.unit ? <span style={{ fontSize: 8, fontWeight: 900, lineHeight: 1, opacity: .72, textTransform: "none" }}>{display.unit}</span> : null}
          </>
        )}
      </div>
      {interactive ? <div style={{ position: "absolute", zIndex: 2, right: 7, bottom: 5, fontSize: 11, color: primary, opacity: .9 }}>›</div> : null}
    </>
  );
  const baseStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    minHeight: interactive ? (illustrationMode ? 104 : 82) : undefined,
    borderRadius: 14,
    padding: illustrationMode ? "8px 8px 10px" : "6px 8px 8px",
    background: illustrationMode ? "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), rgba(5,7,16,0.98))" : "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.06), rgba(5,7,16,0.96))",
    border: `1px solid ${interactive ? `${primary}66` : (theme.borderSoft ?? "rgba(255,255,255,0.18)")}`,
    boxShadow: interactive ? `0 10px 24px rgba(0,0,0,.78), inset 0 0 20px ${primary}0d` : "0 10px 22px rgba(0,0,0,0.75)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: illustrationMode ? "flex-start" : "center",
    textAlign: "center",
    color: "inherit",
  };
  if (interactive) {
    return <button type="button" aria-label={ariaLabel || `${label}: ${value}`} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClick?.(); }} style={{ ...baseStyle, width: "100%", cursor: "pointer", font: "inherit" }}>{content}</button>;
  }
  return <div style={baseStyle}>{content}</div>;
}

export default ActiveProfileCard;
