// =============================================================
// src/pages/babyfoot/BabyFootHome.tsx
// HOME Baby-Foot — même structure visuelle que Pétanque / Darts
// - Header "Bienvenue" + titre (auto-fit)
// - ActiveProfileCard + KPI Babyfoot (depuis store.history)
// ✅ HOME = 3 tickers empilés : Résultats / Ligue / News
// ✅ Auto-défilement (rotation auto du contenu) sur les 3 cartes
// =============================================================

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import type { Store, Profile } from "../../lib/types";
import ActiveProfileCard from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";

import { loadBabyFootState } from "../../lib/babyfootStore";
import { History } from "../../lib/history";
import { computeShotConversion } from "../../lib/babyfootQualityStats";
import {
  babyFootRating,
  computeBabyFootProfileAggregate,
  formatBabyFootRatio,
  normalizeBabyFootMatches,
} from "../../lib/babyfootStatsAggregate";
import { babyFootLevelScoreFromRating } from "../../lib/babyFootLevelStarring";

// ✅ Home ticker backgrounds (catégories)
import tickerBabyfootActu1 from "../../assets/tickers/ticker_babyfoot_actu_1.png";
import tickerBabyfootActu2 from "../../assets/tickers/ticker_babyfoot_actu_2.png";
import tickerBabyfootActu3 from "../../assets/tickers/ticker_babyfoot_actu_3.png";

import tickerBabyfootNew1 from "../../assets/tickers/ticker_babyfoot_new_1.png";
import tickerBabyfootNew2 from "../../assets/tickers/ticker_babyfoot_new_2.png";
import tickerBabyfootNew3 from "../../assets/tickers/ticker_babyfoot_new_3.png";

import tickerBabyfootResults1 from "../../assets/tickers/ticker_babyfoot_results_1.png";
import tickerBabyfootResults2 from "../../assets/tickers/ticker_babyfoot_results_2.png";
import tickerBabyfootResults3 from "../../assets/tickers/ticker_babyfoot_results_3.png";

import tickerBabyfootEvents1 from "../../assets/tickers/ticker_babyfoot_events_1.png";
import tickerBabyfootEvents2 from "../../assets/tickers/ticker_babyfoot_events_2.png";
import tickerBabyfootEvents3 from "../../assets/tickers/ticker_babyfoot_events_3.png";

import tickerBabyfootTips1 from "../../assets/tickers/ticker_babyfoot_tips_1.png";
import tickerBabyfootTips2 from "../../assets/tickers/ticker_babyfoot_tips_2.png";
import tickerBabyfootTips3 from "../../assets/tickers/ticker_babyfoot_tips_3.png";

type Props = {
  store: Store;
  update?: (mut: any) => void;
  go: (tab: any, params?: any) => void;
};

const PAGE_MAX_WIDTH = 620;

// ✅ Alignement unique (mêmes extérieurs partout)
const SECTION_PAD_X = 10;
const sectionWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: PAGE_MAX_WIDTH,
  paddingInline: SECTION_PAD_X,
};

// -------------------------------------------------------------
// helpers
// -------------------------------------------------------------

function safeActiveProfile(store: Store): Profile | null {
  const profiles = store?.profiles ?? [];
  const activeProfileId = (store as any)?.activeProfileId ?? null;
  return profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatSignedInt(value: number) {
  const n = Math.round(Number(value || 0));
  return `${n >= 0 ? "+" : ""}${n}`;
}

function hashStringToInt(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function shuffleWithSeed<T>(arr: T[], seed: string) {
  const a = [...arr];
  let s = hashStringToInt(seed);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type HomeKey = "results" | "league" | "news";

const HOME_TICKER_IMAGES: Record<HomeKey, string[]> = {
  results: [tickerBabyfootResults1, tickerBabyfootResults2, tickerBabyfootResults3],
  league: [tickerBabyfootActu1, tickerBabyfootActu2, tickerBabyfootActu3],
  news: [
    tickerBabyfootNew1,
    tickerBabyfootNew2,
    tickerBabyfootNew3,
    tickerBabyfootEvents1,
    tickerBabyfootEvents2,
    tickerBabyfootEvents3,
    tickerBabyfootTips1,
    tickerBabyfootTips2,
    tickerBabyfootTips3,
  ],
};

function pickHomeBg(key: HomeKey, seed: string, opts?: { avoid?: string[] }) {
  const list = (HOME_TICKER_IMAGES[key] ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);
  if (!list.length) return "";
  const avoid = (opts?.avoid ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);

  let idx = hashStringToInt(`${key}::${seed}`) % list.length;
  let picked = list[idx] ?? "";

  if (picked && avoid.includes(picked) && list.length > 1) {
    picked = list[(idx + 1) % list.length] ?? picked;
  }
  return picked;
}

/**
 * ✅ Important : "BABYFOOT COUNTER" ne doit JAMAIS être coupé.
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

      text.style.transform = "scale(1)";
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      text.offsetHeight;

      const available = wrap.clientWidth;
      const needed = text.scrollWidth;

      if (!available || !needed) return setScale(1);
      if (needed <= available) return setScale(1);

      setScale(Math.max(0.72, Math.min(1, available / needed)));
    };

    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { wrapRef, textRef, scale };
}

// -------------------------------------------------------------
// KPI Babyfoot (LOCAL) — source Historique complète comme le centre stats
// -------------------------------------------------------------

function mergeBabyFootHistoryRows(...sources: any[][]): any[] {
  const byId = new Map<string, any>();
  const quality = (row: any) => {
    const payload = row?.payload || row;
    const summary = row?.summary || payload?.summary || {};
    return (row?.payload ? 10 : 0)
      + (Array.isArray(payload?.events) ? payload.events.length * 3 : 0)
      + (Array.isArray(summary?.events) ? summary.events.length * 3 : 0)
      + (Array.isArray(payload?.players) ? payload.players.length : 0)
      + (payload?.compact ? 4 : 0);
  };
  for (const source of sources) {
    for (const row of Array.isArray(source) ? source : []) {
      const id = String(row?.id || row?.matchId || row?.payload?.id || row?.payload?.matchId || "").trim();
      if (!id) continue;
      const previous = byId.get(id);
      if (!previous || quality(row) >= quality(previous)) byId.set(id, row);
    }
  }
  return Array.from(byId.values());
}

async function loadBabyFootHistoryRowsFromAllSources(store: Store): Promise<any[]> {
  const fromStore = Array.isArray((store as any)?.history) ? ((store as any).history as any[]) : [];
  try {
    const api: any = History as any;
    let fromHistory: any[] = [];
    if (typeof api.getAll === "function") {
      fromHistory = await api.getAll();
    } else if (typeof api.list === "function") {
      const light = await api.list();
      fromHistory = await Promise.all((Array.isArray(light) ? light : []).map(async (row: any) => {
        const id = String(row?.id || row?.matchId || "").trim();
        return id && typeof api.get === "function" ? ((await api.get(id).catch(() => null)) || row) : row;
      }));
    }
    return mergeBabyFootHistoryRows(fromStore, fromHistory);
  } catch {
    return fromStore;
  }
}

function computeBabyfootGlobalStats(historyRows: any[], profiles: Profile[], activeProfile: Profile | null) {
  const profileId = String(activeProfile?.id ?? "").trim();
  const rows = normalizeBabyFootMatches(historyRows, { mode: "all", period: "ARV" });
  const agg = computeBabyFootProfileAggregate(rows, profiles, profileId);

  let shots = 0;
  let shotGoals = 0;
  for (const match of rows) {
    if (!profileId) continue;
    const inMatch = match.teamAProfileIds.includes(profileId) || match.teamBProfileIds.includes(profileId);
    if (!inMatch) continue;
    const conv = computeShotConversion(Array.isArray(match.data?.events) ? match.data.events : []);
    shots += Number(conv?.shots ?? 0) || 0;
    shotGoals += Number(conv?.goals ?? 0) || 0;
  }

  return {
    sessions: agg.matches,
    wins: agg.wins,
    losses: agg.losses,
    draws: agg.draws,
    winRate: agg.winRate,
    rating: babyFootRating(agg),
    goalsFor: agg.goalsFor,
    goalsAgainst: agg.goalsAgainst,
    cleanSheets: agg.cleanSheets,
    avgGF: agg.avgGoalsFor,
    avgGA: agg.avgGoalsAgainst,
    avgDiff: agg.matches ? agg.goalDiff / agg.matches : 0,
    ratio: agg.ratio,
    bestWinStreak: agg.bestWinStreak,
    currentWinStreak: agg.currentWinStreak,
    bestGoalsFor: agg.bestGoalsFor,
    bestGoalDiff: agg.bestGoalDiff,
    personalPoints: agg.personalPoints,
    actualGoals: agg.actualGoals,
    demi: agg.demi,
    gamelle: agg.gamelle,
    pissetteValid: agg.pissetteValid,
    conversion: shots > 0 ? shotGoals / shots : null,
  };
}

// -------------------------------------------------------------
// UI blocks (laissés en place : pas de suppression massive)
// -------------------------------------------------------------

function TickerCard({
  theme,
  title,
  pill,
  text,
  bg,
  accent,
  rightBadge,
}: {
  theme: any;
  title: string;
  pill?: string;
  text: string;
  bg?: string;
  accent: string;
  rightBadge?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        borderRadius: 18,
        overflow: "hidden",
        position: "relative",
        minHeight: 108,
        backgroundColor: "#05060C",
        backgroundImage: bg ? `url("${bg}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
        boxShadow: "0 14px 34px rgba(0,0,0,0.70)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(0,0,0,0.92), rgba(0,0,0,0.55))",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 10px ${accent}CC`,
              }}
            />
            <div
              style={{
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: 1.0,
                textTransform: "uppercase",
                color: accent,
                textShadow: `0 0 10px ${accent}55`,
              }}
            >
              {title}
            </div>
            {pill ? (
              <div
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  fontWeight: 900,
                  opacity: 0.92,
                  background: "rgba(0,0,0,0.28)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  borderRadius: 999,
                  padding: "3px 8px",
                }}
              >
                {pill}
              </div>
            ) : null}
          </div>

          {rightBadge ? (
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: "rgba(255,255,255,0.9)",
                background: "rgba(0,0,0,0.30)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 999,
                padding: "4px 10px",
              }}
            >
              {rightBadge}
            </div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "rgba(255,255,255,0.92)",
            fontWeight: 850,
            lineHeight: 1.35,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function NewsCard({
  theme,
  title,
  bg,
  accent,
  marqueeText,
  focusText,
}: {
  theme: any;
  title: string;
  bg?: string;
  accent: string;
  marqueeText: string;
  focusText: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        borderRadius: 18,
        overflow: "hidden",
        position: "relative",
        minHeight: 108,
        backgroundColor: "#05060C",
        backgroundImage: bg ? `url("${bg}")` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
        boxShadow: "0 14px 34px rgba(0,0,0,0.70)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(0,0,0,0.92), rgba(0,0,0,0.55))",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontWeight: 950,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              fontSize: 12,
              color: accent,
              textShadow: `0 0 10px ${accent}55`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 10px ${accent}CC`,
                display: "inline-block",
              }}
            />
            {title}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              opacity: 0.88,
              background: "rgba(0,0,0,0.28)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 999,
              padding: "3px 8px",
            }}
          >
            LIVE
          </div>
        </div>

        <div
          style={{
            width: "100%",
            overflow: "hidden",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.28)",
            padding: "8px 10px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              whiteSpace: "nowrap",
              willChange: "transform",
              animation: "bfMarquee 12s linear infinite",
              transform: "translateX(0%)",
            }}
          >
            <div style={{ paddingRight: 26, fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>
              {marqueeText}
            </div>
            <div style={{ paddingRight: 26, fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>
              {marqueeText}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            lineHeight: 1.25,
            color: "rgba(255,255,255,0.92)",
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          {focusText}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// COMPONENT
// -------------------------------------------------------------

export default function BabyFootHome({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const activeProfile = useMemo(() => safeActiveProfile(store), [store]);
  const seed = String(activeProfile?.id ?? "anon");

  // refresh state (pour news live)
  const [st, setSt] = useState(() => loadBabyFootState());
  useEffect(() => {
    const id = window.setInterval(() => setSt(loadBabyFootState()), 600);
    return () => window.clearInterval(id);
  }, []);

  const profiles = useMemo(() => Array.isArray((store as any)?.profiles) ? ((store as any).profiles as Profile[]) : [], [store]);
  const [historyRows, setHistoryRows] = useState<any[]>(() => Array.isArray((store as any)?.history) ? ((store as any).history as any[]) : []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const rows = await loadBabyFootHistoryRowsFromAllSources(store);
      if (alive) setHistoryRows(rows);
    };
    load();
    window.addEventListener("dc-history-updated", load as EventListener);
    window.addEventListener("dc-stats-index-updated", load as EventListener);
    window.addEventListener("storage", load as EventListener);
    return () => {
      alive = false;
      window.removeEventListener("dc-history-updated", load as EventListener);
      window.removeEventListener("dc-stats-index-updated", load as EventListener);
      window.removeEventListener("storage", load as EventListener);
    };
  }, [store]);

  const babyfootGlobalStats = useMemo(() => computeBabyfootGlobalStats(historyRows, profiles, activeProfile), [historyRows, profiles, activeProfile]);
  const primary = theme.primary ?? "#F6C256";
  const convLabel = babyfootGlobalStats.conversion == null ? "—" : `${Math.round(babyfootGlobalStats.conversion * 100)}%`;
  const starAvg3D = babyFootLevelScoreFromRating(babyfootGlobalStats.rating);

  const homeRecordSlides = useMemo(() => {
    if (!babyfootGlobalStats.sessions) return [];
    return [
      {
        id: "babyfoot-records",
        title: t("babyfoot.home.records.title", "Records"),
        rows: [
          { label: t("babyfoot.home.records.bestBp", "best BP"), value: String(babyfootGlobalStats.bestGoalsFor) },
          { label: t("babyfoot.home.records.bestDiff", "best diff"), value: formatSignedInt(babyfootGlobalStats.bestGoalDiff) },
          { label: t("babyfoot.home.records.bestSerie", "série max"), value: String(babyfootGlobalStats.bestWinStreak) },
          { label: t("babyfoot.home.records.clean", "clean sheets"), value: String(babyfootGlobalStats.cleanSheets) },
          { label: t("babyfoot.home.records.butsPerso", "buts perso"), value: String(babyfootGlobalStats.personalPoints) },
          { label: t("babyfoot.home.records.rating", "rating"), value: String(babyfootGlobalStats.rating) },
        ],
      },
    ];
  }, [babyfootGlobalStats, t]);

  // ✅ Auto-fit title
  const { wrapRef: titleWrapRef, textRef: titleTextRef, scale: titleScale } = useAutoFitTitle([
    theme.primary,
    t("home.welcome", "Bienvenue"),
  ]);

  // ✅ Backgrounds (aléa déterministe) — gardé
  const { resultsBg, leagueBg, newsBg } = useMemo(() => {
    const r = pickHomeBg("results", `${seed}::results`);
    const l = pickHomeBg("league", `${seed}::league`, { avoid: [r] });
    const n = pickHomeBg("news", `${seed}::news`, { avoid: [r, l] });
    return { resultsBg: r, leagueBg: l, newsBg: n };
  }, [seed]);

  // ✅ Pools de textes
  const resultsPool = useMemo(() => {
    if (!babyfootGlobalStats.sessions) {
      return [t("babyfoot.home.results.empty", "Aucun résultat pour ce profil — lance un match pour démarrer tes stats.")];
    }
    const losses = babyfootGlobalStats.sessions - babyfootGlobalStats.wins - babyfootGlobalStats.draws;
    return [
      t(
        "babyfoot.home.results.line1",
        `Bilan: ${babyfootGlobalStats.wins}V / ${babyfootGlobalStats.draws}N / ${losses}D · win ${Math.round(babyfootGlobalStats.winRate * 100)}%.`
      ),
      t("babyfoot.home.results.line2", `Buts pour: ${babyfootGlobalStats.goalsFor} · buts contre: ${babyfootGlobalStats.goalsAgainst}.`),
      t("babyfoot.home.results.line3", `Différence moyenne: ${babyfootGlobalStats.avgDiff.toFixed(1)} but(s)/match.`),
      t("babyfoot.home.results.line4", `Moy. buts marqués: ${babyfootGlobalStats.avgGF.toFixed(1)} · encaissés: ${babyfootGlobalStats.avgGA.toFixed(1)}.`),
      t("babyfoot.home.results.line5", `Conversion tirs: ${convLabel}.`),
    ];
  }, [babyfootGlobalStats, convLabel, t]);

  const leaguePool = useMemo(() => {
    if (!babyfootGlobalStats.sessions) {
      return [t("babyfoot.home.league.empty", "Aucune stat Babyfoot — joue un match pour alimenter la ligue/classement.")];
    }
    return [
      t("babyfoot.home.league.line1", `Ratio BP/BC: ${formatBabyFootRatio(babyfootGlobalStats.ratio)} · ${babyfootGlobalStats.sessions} matchs.`),
      t("babyfoot.home.league.line2", `Win%: ${Math.round(babyfootGlobalStats.winRate * 100)}% · série: ${babyfootGlobalStats.currentWinStreak} · clean: ${babyfootGlobalStats.cleanSheets}.`),
      t("babyfoot.home.league.line3", `Objectif ligue: enchaîne 3 matchs pour stabiliser ton rating.`),
      t("babyfoot.home.league.line4", `Conseil: joue en sets pour mieux comparer tes performances.`),
    ];
  }, [babyfootGlobalStats, t]);

  const newsPool = useMemo(() => {
    const base = [
      t("babyfoot.news.tip.angles", "Astuce : varie tes angles de frappe pour surprendre le gardien."),
      t("babyfoot.news.tip.bank", "Astuce : joue le rebond sur la bande pour casser le timing adverse."),
      t("babyfoot.news.tip.keeper", "Astuce : micro-mouvements du gardien plutôt que rester figé."),
      t("babyfoot.news.new.stats", "Nouveauté : tes stats Babyfoot s’affichent désormais sur la Home."),
      t("babyfoot.news.event.tournament", "Événement : organise un mini-tournoi local (poules + KO) en 2 minutes."),
      t("babyfoot.news.event.league", "Événement : lance une ligue entre amis et comparez vos performances."),
      t("babyfoot.news.fun.modes", "Fun : essaye 2v1 / 2v2 — active golden goal pour des fins explosives."),
    ];

    const live: string[] = [];
    const a = Number(st?.scoreA ?? 0) || 0;
    const b = Number(st?.scoreB ?? 0) || 0;
    const target = Number(st?.target ?? 10) || 10;
    const finished = !!st?.finished;

    if (finished) live.push(t("babyfoot.news.live.finished", "Match terminé : pense à consulter l’historique."));
    else if (a > 0 || b > 0) live.push(t("babyfoot.news.live.match", `Match en cours : ${a} — ${b} (objectif ${target}).`));

    if (babyfootGlobalStats.sessions) {
      live.push(
        t(
          "babyfoot.news.live.winrate",
          `Bilan profil : ${babyfootGlobalStats.wins}/${babyfootGlobalStats.sessions} victoires (win ${Math.round(
            babyfootGlobalStats.winRate * 100
          )}%).`
        )
      );
      live.push(t("babyfoot.news.live.diff", `Différence moyenne : ${babyfootGlobalStats.avgDiff.toFixed(1)} but(s)/match.`));
    }

    return shuffleWithSeed([...live, ...base], `${seed}::newsPool`);
  }, [t, seed, st, babyfootGlobalStats]);

  const [resultsIdx, setResultsIdx] = useState(0);
  const [leagueIdx, setLeagueIdx] = useState(0);
  const [newsIdx, setNewsIdx] = useState(0);

  useEffect(() => {
    setResultsIdx(0);
    setLeagueIdx(0);
    setNewsIdx(0);
  }, [seed]);

  // (anciens timers gardés : plus utilisés pour l’UI ArcadeTicker, mais conservés pour éviter suppressions massives)
  useEffect(() => {
    if (!resultsPool.length) return;
    const id = window.setInterval(() => setResultsIdx((i) => (i + 1) % resultsPool.length), 4200);
    return () => window.clearInterval(id);
  }, [resultsPool]);

  useEffect(() => {
    if (!leaguePool.length) return;
    const id = window.setInterval(() => setLeagueIdx((i) => (i + 1) % leaguePool.length), 5200);
    return () => window.clearInterval(id);
  }, [leaguePool]);

  useEffect(() => {
    if (!newsPool.length) return;
    const id = window.setInterval(() => setNewsIdx((i) => (i + 1) % newsPool.length), 4200);
    return () => window.clearInterval(id);
  }, [newsPool]);

  const marqueeText = useMemo(() => {
    if (!newsPool.length) return "";
    const a = newsPool[newsIdx] ?? "";
    const b = newsPool[(newsIdx + 1) % Math.max(1, newsPool.length)] ?? "";
    const c = newsPool[(newsIdx + 2) % Math.max(1, newsPool.length)] ?? "";
    return [a, "•", b, "•", c, "•", a].filter(Boolean).join(" ");
  }, [newsPool, newsIdx]);

  const resultsText = resultsPool[resultsIdx] ?? "";
  const leagueText = leaguePool[leagueIdx] ?? "";
  const newsFocus = newsPool[newsIdx] ?? "";

  const resultsBadge = babyfootGlobalStats.sessions ? `win ${Math.round(babyfootGlobalStats.winRate * 100)}%` : "";
  const leagueBadge = babyfootGlobalStats.sessions ? `ratio ${formatBabyFootRatio(babyfootGlobalStats.ratio)}` : "";

  // ✅ ArcadeTicker (comme HOME Darts/Pétanque) — 3 tickers empilés
  const resultsTickerItems: ArcadeTickerItem[] = useMemo(() => {
    const bgs = shuffleWithSeed(HOME_TICKER_IMAGES.results, `${seed}::resultsBgs`);
    const lines = resultsPool.length
      ? resultsPool
      : [t("babyfoot.home.results.empty", "Aucun résultat pour ce profil — lance un match pour démarrer tes stats.")];
    return lines.map((line, i) => ({
      id: `bf-home-results-${i}`,
      title: t("babyfoot.home.ticker.results.title", "Résultats"),
      text: line,
      detail: resultsBadge,
      backgroundImage: bgs[i % Math.max(1, bgs.length)],
      accentColor: "#7DBEFF",
    }));
  }, [resultsPool, seed, t, resultsBadge]);

  const leagueTickerItems: ArcadeTickerItem[] = useMemo(() => {
    const bgs = shuffleWithSeed(HOME_TICKER_IMAGES.league, `${seed}::leagueBgs`);
    const lines = leaguePool.length
      ? leaguePool
      : [t("babyfoot.home.league.empty", "Aucune stat Babyfoot — joue un match pour alimenter la ligue/classement.")];
    return lines.map((line, i) => ({
      id: `bf-home-league-${i}`,
      title: t("babyfoot.home.ticker.league.title", "Ligue"),
      text: line,
      detail: leagueBadge,
      backgroundImage: bgs[i % Math.max(1, bgs.length)],
      accentColor: "#00E5A8",
    }));
  }, [leaguePool, seed, t, leagueBadge]);

  const newsTickerItems: ArcadeTickerItem[] = useMemo(() => {
    const bgs = shuffleWithSeed(HOME_TICKER_IMAGES.news, `${seed}::newsBgs`);
    const lines = newsPool.length ? newsPool : [t("babyfoot.home.news.empty", "Ajoute des news/astuces pour enrichir ce ticker.")];
    return lines.map((line, i) => ({
      id: `bf-home-news-${i}`,
      title: t("babyfoot.home.ticker.news.title", "News"),
      text: line,
      detail: "LIVE",
      backgroundImage: bgs[i % Math.max(1, bgs.length)],
      accentColor: primary,
    }));
  }, [newsPool, seed, t, primary]);

  return (
    <div
      className="babyfoot-home container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: 16,
        paddingBottom: 0,
        alignItems: "center",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <style>{`
        @keyframes dcTitlePulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }
        @keyframes dcTitleShimmer { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
        @keyframes bfMarquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
      `}</style>

      {/* ===== HEADER ===== */}
      <div style={{ ...sectionWrap, marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "5px 12px",
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.28))",
              boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
              color: primary,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            {t("home.welcome", "Bienvenue")}
          </div>

          <div ref={titleWrapRef} style={{ width: "100%", overflow: "hidden" }}>
            <div
              ref={titleTextRef}
              style={{
                width: "fit-content",
                marginInline: "auto",
                textAlign: "center",
                textTransform: "uppercase",
                fontWeight: 1000,
                fontSize: "clamp(18px, 6.2vw, 30px)",
                letterSpacing: "clamp(0.6px, 0.75vw, 3px)",
                lineHeight: 1.05,
                whiteSpace: "nowrap",
                backgroundImage: `linear-gradient(120deg, ${primary}, #ffffff, ${primary})`,
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                color: "transparent",
                animation: "dcTitlePulse 3.6s ease-in-out infinite, dcTitleShimmer 7s linear infinite",
                transform: `scale(${titleScale})`,
                transformOrigin: "center",
              }}
            >
              BABYFOOT COUNTER
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Carte joueur actif */}
      {activeProfile && (
        <div style={sectionWrap}>
          <ActiveProfileCard
            hideStatus={true}
            profile={activeProfile as any}
            stats={
              {
                ratingGlobal: babyfootGlobalStats.rating,
                winrateGlobal: babyfootGlobalStats.winRate,
                avg3DGlobal: starAvg3D,
                sessionsGlobal: babyfootGlobalStats.sessions,
                favoriteNumberLabel: "—",
              } as any
            }
            starAvg3D={starAvg3D}
            suppressDefaultStatsSlides={true}
            customSlides={homeRecordSlides}
            globalTitle={t("babyfoot.home.global.title", "Vue globale")}
            globalKpis={[
              { label: t("babyfoot.kpi.ratio", "ratio"), value: formatBabyFootRatio(babyfootGlobalStats.ratio) },
              { label: t("babyfoot.kpi.win", "win%"), value: `${Math.round(babyfootGlobalStats.winRate * 100)}%` },
              { label: t("babyfoot.kpi.bpMatch", "BP/match"), value: Number(babyfootGlobalStats.avgGF).toFixed(1) },
              { label: t("babyfoot.kpi.bcMatch", "BC/match"), value: Number(babyfootGlobalStats.avgGA).toFixed(1) },
              { label: t("babyfoot.kpi.serie", "série"), value: babyfootGlobalStats.currentWinStreak },
              { label: t("babyfoot.kpi.clean", "clean"), value: babyfootGlobalStats.cleanSheets },
            ]}
          />
        </div>
      )}

      {/* ✅ HOME = 3 tickers Babyfoot (stack) — auto-défilement via ArcadeTicker (comme Darts/Pétanque) */}
      <div style={{ ...sectionWrap, marginTop: 10, marginBottom: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ArcadeTicker items={resultsTickerItems} intervalMs={4200} />
          <ArcadeTicker items={leagueTickerItems} intervalMs={5200} />
          <ArcadeTicker items={newsTickerItems} intervalMs={4200} />
        </div>
      </div>

      {false && (
        <>
          {/* CTA supprimés (désactivés) */}
          <div style={{ ...sectionWrap, marginTop: 8, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={{ flex: "1 1 180px" }} onClick={() => go("babyfoot_config", { mode: "match_1v1" })}>
                {t("babyfoot.home.cta.new", "Nouvelle partie")}
              </button>
              <button style={{ flex: "1 1 180px" }} onClick={() => go("games")}>
                {t("babyfoot.home.cta.menu", "Menu Local")}
              </button>
              <button style={{ flex: "1 1 180px" }} onClick={() => go("tournaments", { forceMode: "babyfoot" })}>
                {t("babyfoot.home.cta.tournaments", "Tournois")}
              </button>
              <button style={{ flex: "1 1 180px" }} onClick={() => go("stats")}>
                {t("babyfoot.home.cta.stats", "Stats")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


/* ===== PATCH: AUTO-ROTATING RESULTS & LEAGUE (SAFE, ADDITIVE) ===== */

// ---- Derive real babyfoot results from store.history (last N) ----
const __BF_PATCH_LAST_N = 6;

function __bfRecentResults(store: any, profile: any) {
  const rows = ((store as any)?.history ?? []) as any[];
  const out: string[] = [];
  const pid = String(profile?.id ?? "");
  for (let i = rows.length - 1; i >= 0 && out.length < __BF_PATCH_LAST_N; i--) {
    const r = rows[i];
    const sport = String(r?.sport ?? "").toLowerCase();
    const kind = String(r?.kind ?? r?.summary?.kind ?? "").toLowerCase();
    if (!(sport === "babyfoot" || kind.includes("baby"))) continue;

    const p = r?.payload ?? r;
    const a = Number(p?.scoreA ?? r?.summary?.scoreA ?? 0) || 0;
    const b = Number(p?.scoreB ?? r?.summary?.scoreB ?? 0) || 0;
    const winner = String(p?.winner ?? r?.summary?.winner ?? "").toUpperCase();
    const vs = `Score ${a}–${b}`;
    const res = winner ? (winner === "A" ? "Victoire A" : winner === "B" ? "Victoire B" : "Terminé") : "Terminé";
    out.push(`${vs} · ${res}`);
  }
  return out.length ? out : ["Aucun match récent — lance une partie pour alimenter les résultats."];
}

// ---- League lines from aggregated stats ----
function __bfLeagueLines(stats: any) {
  if (!stats?.sessions) return ["Aucune donnée de ligue — joue quelques matchs pour apparaître au classement."];
  return [
    `Rating ${stats.rating} · Sessions ${stats.sessions}`,
    `Win ${Math.round((stats.winRate ?? 0) * 100)}% · Clean ${stats.cleanSheets ?? 0}`,
    `Diff/match ${Number(stats.avgDiff ?? 0).toFixed(1)}`
  ];
}

// ---- Auto-rotation hooks (identical pattern as Darts/Pétanque) ----
function __useAutoRotate(len: number, ms: number) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (!len || len <= 1) return;
    const id = setInterval(() => setI(v => (v + 1) % len), ms);
    return () => clearInterval(id);
  }, [len, ms]);
  return i;
}
