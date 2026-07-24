// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFullscreenPlay } from "../../hooks/useFullscreenPlay";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import Keypad from "../../components/Keypad";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileStarRing from "../../components/ProfileStarRing";
import { useTheme } from "../../contexts/ThemeContext";
import tickerBatard from "../../assets/tickers/ticker_bastard.png";
import targetBg from "../../assets/target_bg.png";
import type { Dart as UIDart } from "../../lib/types";
import type { BatardConfig as BatardRulesConfig, BatardRound } from "../../lib/batard/batardTypes";
import { computeBatardReplaySnapshot, isDartValid, useBatardEngine } from "../../hooks/useBatardEngine";
import type { BatardConfigPayload } from "./BatardConfig";
import { History } from "../../lib/history";
import { PRO_BOTS } from "../../lib/botsPro";
import { getProBotAvatar } from "../../lib/botsProAvatars";
import { loadBots, parseBotLevelValue } from "../../lib/bots";

const T = {
  bg: "#040710",
  stroke: "rgba(255,255,255,.105)",
  text: "#f8fafc",
  soft: "rgba(226,232,240,.70)",
  cyan: "#42d6ff",
  gold: "#ffd76a",
  green: "#65efb4",
  red: "#ff667e",
  pink: "#ff63b8",
  violet: "#c24cff",
};

type LightPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: any;
  avatarUrl?: any;
  dartSetId?: string | null;
  isBot?: boolean;
  botLevel?: any;
  source?: string;
};

function makeMatchId(prefix = "batard") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dartScore(d?: UIDart | null) {
  if (!d) return 0;
  return Number(d.v || 0) * Number(d.mult || 1);
}

function visitScore(darts: UIDart[]) {
  return (darts || []).reduce((sum, d) => sum + dartScore(d), 0);
}

function dartLabel(d?: UIDart | null) {
  if (!d) return "—";
  if (Number(d.v) === 0) return "MISS";
  if (Number(d.v) === 25) return Number(d.mult) === 2 ? "DBULL" : "BULL";
  return `${Number(d.mult) === 3 ? "T" : Number(d.mult) === 2 ? "D" : "S"}${Number(d.v)}`;
}

function roundLabel(round?: BatardRound | null) {
  if (!round) return "—";
  const mult = String(round.multiplierRule || "ANY");
  if (round.type === "TARGET_BULL") return mult === "DOUBLE" ? "DBULL" : "BULL";
  if (round.type === "ANY_SCORE") {
    if (mult === "SINGLE") return "SIMPLE";
    if (mult === "DOUBLE") return "DOUBLE";
    if (mult === "TRIPLE") return "TRIPLE";
    return "SCORE";
  }
  const prefix = mult === "SINGLE" ? "S" : mult === "DOUBLE" ? "D" : mult === "TRIPLE" ? "T" : "";
  return `${prefix}${round.target ?? "?"}`;
}

function roundDetail(round?: BatardRound | null) {
  if (!round) return "Aucune cible";
  if (round.type === "TARGET_BULL") return "Toucher le Bull ou DBull";
  if (round.type === "ANY_SCORE") {
    if (round.multiplierRule === "DOUBLE") return "N’importe quel double";
    if (round.multiplierRule === "TRIPLE") return "N’importe quel triple";
    if (round.multiplierRule === "SINGLE") return "N’importe quel simple";
    return "Score libre";
  }
  const m = round.multiplierRule || "ANY";
  const txt = m === "SINGLE" ? "Simple" : m === "DOUBLE" ? "Double" : m === "TRIPLE" ? "Triple" : "N’importe quelle zone";
  return `${txt} sur ${round.target}`;
}

function failLabel(policy: string, value: number) {
  if (policy === "MINUS_POINTS") return `−${value} pts`;
  if (policy === "BACK_ROUND") return `−${value} round${value > 1 ? "s" : ""}`;
  if (policy === "FREEZE") return "À rejouer";
  return "Aucune";
}

function RulesContent({ config, primary, secondary }: any) {
  const rules = config?.batard || config || {};
  return (
    <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.45 }}>
      <div><b style={{ color: primary }}>OBJECTIF</b><br />Chaque joueur progresse dans la même séquence de rounds. Chaque round impose une cible ou un type de touche.</div>
      <div><b style={{ color: secondary }}>VOLÉE</b><br />Tu disposes de 3 fléchettes. Il faut au moins {Math.max(1, Number(rules.minValidHitsToAdvance || 1))} touche{Number(rules.minValidHitsToAdvance || 1) > 1 ? "s" : ""} valide{Number(rules.minValidHitsToAdvance || 1) > 1 ? "s" : ""} pour avancer.</div>
      <div><b style={{ color: T.pink }}>ÉCHEC</b><br />{failLabel(String(rules.failPolicy || "NONE"), Number(rules.failValue || 0))} si la volée ne valide pas le round.</div>
      <div><b style={{ color: T.green }}>VICTOIRE</b><br />{rules.winMode === "RACE_TO_FINISH" ? "Le premier joueur qui termine toute la séquence gagne immédiatement." : "Tous les joueurs terminent la séquence ; le score final le plus élevé gagne."}</div>
      <div><b style={{ color: primary }}>SCORE</b><br />{rules.scoreOnlyValid !== false ? "Seules les fléchettes valides ajoutent des points." : "Toutes les fléchettes ajoutent leurs points, mais seules les touches conformes permettent d’avancer."}</div>
    </div>
  );
}

function botAccuracy(bot: any, globalLevel: string) {
  const base = globalLevel === "hard" ? .82 : globalLevel === "easy" ? .46 : .66;
  const stars = parseBotLevelValue(bot?.botLevel ?? bot?.level ?? 3, 3);
  return Math.max(.28, Math.min(.95, base + (stars - 3) * .075));
}

function makeValidBotDart(round: BatardRound): UIDart {
  const rule = String(round?.multiplierRule || "ANY");
  if (round?.type === "TARGET_BULL") return { v: 25, mult: Math.random() < .24 ? 2 : 1 } as UIDart;
  const mult: 1 | 2 | 3 = rule === "DOUBLE" ? 2 : rule === "TRIPLE" ? 3 : rule === "SINGLE" ? 1 : Math.random() < .18 ? 3 : Math.random() < .34 ? 2 : 1;
  if (round?.type === "TARGET_NUMBER") return { v: Math.max(1, Math.min(20, Number(round.target || 20))), mult } as UIDart;
  return { v: 12 + Math.floor(Math.random() * 9), mult } as UIDart;
}

function makeBotVisit(round: BatardRound, bot: any, globalLevel: string): UIDart[] {
  const accuracy = botAccuracy(bot, globalLevel);
  return Array.from({ length: 3 }, () => {
    if (Math.random() <= accuracy) return makeValidBotDart(round);
    if (Math.random() < .62) return { v: 0, mult: 1 } as UIDart;
    let v = 1 + Math.floor(Math.random() * 20);
    if (round?.type === "TARGET_NUMBER" && v === Number(round.target)) v = v === 20 ? 19 : v + 1;
    return { v, mult: 1 } as UIDart;
  });
}

function avatarSrc(player: any) {
  return player?.avatarDataUrl || player?.avatarUrl || player?.avatar || null;
}

function participantName(player: any) {
  return String(player?.name || player?.displayName || player?.nickname || "Joueur");
}

export default function BatardPlay(props: any) {
  useFullscreenPlay();
  const themeCtx: any = useTheme();
  const theme: any = themeCtx?.theme || themeCtx || {};
  const primary = theme?.primary || T.cyan;
  const secondary = theme?.secondary || T.gold;
  const bg = theme?.bg || T.bg;
  const store = props?.store ?? props?.params?.store ?? null;
  const storeProfiles: any[] = Array.isArray(store?.profiles) ? store.profiles : [];

  const initialCfg: BatardConfigPayload =
    (props?.params?.config as BatardConfigPayload) ||
    (props?.config as BatardConfigPayload) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      presetId: "classic",
      selectedHumanIds: [],
      selectedBotIds: [],
      batard: {
        presetId: "classic_bar",
        label: "Classic (Bar)",
        winMode: "SCORE_MAX",
        failPolicy: "NONE",
        failValue: 0,
        scoreOnlyValid: true,
        minValidHitsToAdvance: 1,
        rounds: [{ id: "r1", label: "Score Max", type: "ANY_SCORE", multiplierRule: "ANY" }],
      } as BatardRulesConfig,
    };

  const resumeId: string | null = props?.params?.resumeId || props?.params?.matchId || props?.resumeId || null;
  const [runtimeCfg, setRuntimeCfg] = useState<BatardConfigPayload>(initialCfg);
  const [resumeLoaded, setResumeLoaded] = useState(!resumeId);
  const [engineResetKey, setEngineResetKey] = useState(0);
  const [engineInit, setEngineInit] = useState<any | null>(null);
  const [storedBots] = useState<any[]>(() => {
    try { return loadBots(); } catch { return []; }
  });

  const botPool = useMemo(() => {
    const map = new Map<string, any>();
    for (const bot of storedBots || []) {
      const id = String(bot?.id || "");
      if (id) map.set(id, { ...bot, id, name: bot?.name || "BOT", isBot: true, source: "home" });
    }
    for (const bot of PRO_BOTS || []) {
      const id = String(bot.id);
      map.set(id, {
        ...bot,
        id,
        name: bot.displayName,
        avatarDataUrl: getProBotAvatar(bot.avatarKey || bot.id),
        isBot: true,
        source: "pro",
      });
    }
    return map;
  }, [storedBots]);

  const lightPlayers: LightPlayer[] = useMemo(() => {
    const humanIds = Array.isArray(runtimeCfg?.selectedHumanIds) ? runtimeCfg.selectedHumanIds.map(String) : [];
    const botIds = runtimeCfg?.botsEnabled && Array.isArray(runtimeCfg?.selectedBotIds) ? runtimeCfg.selectedBotIds.map(String) : [];
    let ids = [...humanIds, ...botIds];

    if (!ids.length) {
      ids = storeProfiles
        .filter((p: any) => !p?.isBot && !p?.bot && !p?.cpu)
        .slice(0, Math.max(2, Number(runtimeCfg?.players || 2)))
        .map((p: any) => String(p.id));
    }

    return ids.map((id) => {
      const bot = botPool.get(id);
      if (bot) {
        return {
          id,
          name: participantName(bot),
          avatarDataUrl: avatarSrc(bot),
          avatarUrl: bot?.avatarUrl || null,
          dartSetId: null,
          isBot: true,
          botLevel: bot?.botLevel || bot?.level || 3,
          source: bot?.source,
        };
      }
      const p = storeProfiles.find((x: any) => String(x?.id) === id) || { id, name: id };
      return {
        id,
        name: participantName(p),
        avatarDataUrl: p?.avatarDataUrl || p?.avatar || null,
        avatarUrl: p?.avatarUrl || null,
        dartSetId: p?.dartSetId || p?.activeDartSetId || null,
        isBot: false,
        source: "profile",
      };
    });
  }, [runtimeCfg?.selectedHumanIds, runtimeCfg?.selectedBotIds, runtimeCfg?.botsEnabled, runtimeCfg?.players, storeProfiles, botPool]);

  const playerIds = useMemo(() => lightPlayers.map((p) => p.id), [lightPlayers]);
  const botIds = useMemo(() => new Set(lightPlayers.filter((p) => p.isBot).map((p) => p.id)), [lightPlayers]);

  const { states, ranking, currentPlayerIndex, currentRound, submitVisit, finished, winnerId, turnCounter } =
    useBatardEngine(playerIds, runtimeCfg.batard, { resetKey: engineResetKey, initialSnapshot: engineInit });

  const matchIdRef = useRef<string>(props?.params?.matchId || makeMatchId());
  const createdAtRef = useRef<number>(Date.now());
  const visitsRef = useRef<any[]>([]);
  const finishedSavedRef = useRef(false);
  const finishCallbackRef = useRef(false);
  const saveSigRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    if (!resumeId) return;
    (async () => {
      try {
        const rec: any = await History.get(resumeId);
        if (!rec || cancelled) return;
        const payload = rec?.payload || rec?.decoded || {};
        const savedCfg = payload?.config || null;
        const savedVisits = Array.isArray(payload?.visits) ? payload.visits : [];
        if (rec?.id) matchIdRef.current = String(rec.id);
        if (payload?.createdAt || rec?.createdAt) createdAtRef.current = Number(payload?.createdAt || rec?.createdAt) || createdAtRef.current;
        visitsRef.current = savedVisits;
        if (savedCfg) {
          const count = Array.isArray(savedCfg.players) ? savedCfg.players.length : Number(savedCfg.players || runtimeCfg.players || 2);
          setRuntimeCfg((prev) => ({ ...prev, ...savedCfg, players: Math.max(2, count) }));
          const ids = Array.isArray(savedCfg.players)
            ? savedCfg.players.map((p: any) => String(p?.id || "")).filter(Boolean)
            : playerIds;
          const snap = computeBatardReplaySnapshot(ids, savedCfg?.batard || runtimeCfg.batard, savedVisits);
          setEngineInit(snap);
          setEngineResetKey((k) => k + 1);
        }
      } catch (error) {
        console.warn("[BatardPlay] resume failed", error);
      } finally {
        if (!cancelled) setResumeLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [resumeId]);

  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [sequenceOpen, setSequenceOpen] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [botThinking, setBotThinking] = useState(false);

  const activeState: any = states?.[currentPlayerIndex] || null;
  const activeId = String(activeState?.id || playerIds?.[currentPlayerIndex] || "");
  const activePlayer = lightPlayers.find((p) => p.id === activeId) || lightPlayers[currentPlayerIndex] || null;
  const activeRoundIndex = Math.max(0, Number(activeState?.roundIndex || 0));
  const rounds = Array.isArray(runtimeCfg?.batard?.rounds) ? runtimeCfg.batard.rounds : [];
  const roundsTotal = Math.max(1, rounds.length);
  const activeScore = Number(activeState?.score || 0);
  const activeStats = activeState?.stats || {};
  const activeDarts = Number(activeStats?.dartsThrown || 0);
  const activeAvg3 = activeDarts > 0 ? ((Number(activeStats?.pointsAdded || 0) / activeDarts) * 3).toFixed(1) : "0.0";

  const activeBestVisit = useMemo(() => {
    let best = 0;
    for (const row of visitsRef.current || []) {
      if (String(row?.p || "") === activeId) best = Math.max(best, Number(row?.score || 0));
    }
    return best;
  }, [activeId, turnCounter]);

  const liveRanking = useMemo(() => {
    const source = Array.isArray(ranking) && ranking.length ? ranking : states || [];
    return source
      .map((row: any) => {
        const player = lightPlayers.find((p) => p.id === String(row?.id));
        return { ...row, player, id: String(row?.id || ""), name: participantName(player || row), score: Number(row?.score || 0) };
      })
      .sort((a: any, b: any) => {
        if (runtimeCfg?.batard?.winMode === "RACE_TO_FINISH") {
          const af = a?.stats?.finishedAtTurn ?? Number.MAX_SAFE_INTEGER;
          const bf = b?.stats?.finishedAtTurn ?? Number.MAX_SAFE_INTEGER;
          if (af !== bf) return af - bf;
          if (Number(b?.roundIndex || 0) !== Number(a?.roundIndex || 0)) return Number(b?.roundIndex || 0) - Number(a?.roundIndex || 0);
        }
        return Number(b.score || 0) - Number(a.score || 0);
      });
  }, [ranking, states, lightPlayers, runtimeCfg?.batard?.winMode, turnCounter]);

  const throwValidHits = useMemo(
    () => (currentThrow || []).filter((d) => (currentRound ? isDartValid(d, currentRound) : false)).length,
    [currentThrow, currentRound]
  );
  const neededHits = Math.max(1, Math.min(3, Number(runtimeCfg?.batard?.minValidHitsToAdvance || 1)));
  const throwPoints = visitScore(currentThrow);
  const projectedScore =
    activeScore +
    (runtimeCfg?.batard?.scoreOnlyValid !== false
      ? currentThrow.reduce((sum, d) => sum + (currentRound && isDartValid(d, currentRound) ? dartScore(d) : 0), 0)
      : throwPoints);

  function recordVisit(pid: string, darts: UIDart[], roundIdx: number) {
    visitsRef.current.push({
      p: pid,
      darts: (darts || []).map((d) => ({ v: Number(d.v || 0), mult: Number(d.mult || 1) })),
      score: visitScore(darts),
      ts: Date.now(),
      roundIndexBefore: roundIdx,
    });
  }

  function addNumber(v: number) {
    if (finished || botThinking || currentThrow.length >= 3) return;
    const m = multiplier;
    setCurrentThrow((prev) => [...prev, { v, mult: m } as UIDart]);
    if (m !== 1) setMultiplier(1);
  }

  function addBull() {
    if (finished || botThinking || currentThrow.length >= 3) return;
    const m = multiplier === 2 ? 2 : 1;
    setCurrentThrow((prev) => [...prev, { v: 25, mult: m } as UIDart]);
    if (multiplier !== 1) setMultiplier(1);
  }

  function validateVisit() {
    if (finished || botThinking || !currentThrow.length) return;
    const darts = [...currentThrow];
    recordVisit(activeId, darts, activeRoundIndex);
    submitVisit(darts);
    setCurrentThrow([]);
    setMultiplier(1);
  }

  const botTurnKeyRef = useRef("");
  useEffect(() => {
    if (!resumeLoaded || finished || !activeId || !botIds.has(activeId) || !currentRound) {
      setBotThinking(false);
      return;
    }
    const key = `${matchIdRef.current}:${turnCounter}:${activeId}:${activeRoundIndex}`;
    if (botTurnKeyRef.current === key) return;
    botTurnKeyRef.current = key;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const bot = activePlayer || botPool.get(activeId) || {};
      const darts = makeBotVisit(currentRound, bot, runtimeCfg?.botLevel || "normal");
      recordVisit(activeId, darts, activeRoundIndex);
      submitVisit(darts);
      setBotThinking(false);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [resumeLoaded, finished, activeId, activeRoundIndex, turnCounter, currentRound, botIds, activePlayer, runtimeCfg?.botLevel]);

  function buildSummary(finalStates: any[]) {
    const dartsByPlayer: Record<string, number> = {};
    const pointsByPlayer: Record<string, number> = {};
    const turnsByPlayer: Record<string, number> = {};
    const avg3ByPlayer: Record<string, number> = {};
    const failsByPlayer: Record<string, number> = {};
    const validHitsByPlayer: Record<string, number> = {};
    const advancesByPlayer: Record<string, number> = {};
    const bestVisitByPlayer: Record<string, number> = {};

    for (const row of visitsRef.current || []) {
      const id = String(row?.p || "");
      if (id) bestVisitByPlayer[id] = Math.max(Number(bestVisitByPlayer[id] || 0), Number(row?.score || 0));
    }
    for (const row of finalStates || []) {
      const id = String(row?.id || "");
      const darts = Number(row?.stats?.dartsThrown || 0);
      const points = Number(row?.stats?.pointsAdded || 0);
      dartsByPlayer[id] = darts;
      pointsByPlayer[id] = points;
      turnsByPlayer[id] = Number(row?.stats?.turns || 0);
      avg3ByPlayer[id] = darts > 0 ? (points / darts) * 3 : 0;
      failsByPlayer[id] = Number(row?.stats?.fails || 0);
      validHitsByPlayer[id] = Number(row?.stats?.validHits || 0);
      advancesByPlayer[id] = Number(row?.stats?.advances || 0);
    }

    return {
      matchId: matchIdRef.current,
      mode: "batard",
      presetId: runtimeCfg?.presetId,
      status: finished ? "finished" : "in_progress",
      darts: dartsByPlayer,
      dartsByPlayer,
      pointsByPlayer,
      turnsByPlayer,
      avg3ByPlayer,
      bestVisitByPlayer,
      failsByPlayer,
      validHitsByPlayer,
      advancesByPlayer,
      turns: turnCounter,
      winMode: runtimeCfg?.batard?.winMode,
      failPolicy: runtimeCfg?.batard?.failPolicy,
      failValue: runtimeCfg?.batard?.failValue,
      scoreOnlyValid: runtimeCfg?.batard?.scoreOnlyValid,
      minValidHitsToAdvance: runtimeCfg?.batard?.minValidHitsToAdvance,
    };
  }

  function makeHistoryRecord(status: "in_progress" | "finished") {
    const now = Date.now();
    const summary = buildSummary(states as any[]);
    const playerRows = lightPlayers.map((p) => {
      const state: any = (states || []).find((s: any) => String(s?.id) === p.id) || {};
      return {
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl || null,
        avatarUrl: p.avatarUrl || null,
        isBot: Boolean(p.isBot),
        botLevel: p.botLevel || null,
        dartSetId: p.dartSetId || null,
        score: Number(state?.score || 0),
      };
    });

    const unifiedStats = {
      sport: "darts",
      mode: "batard",
      players: playerRows.map((p) => ({
        id: p.id,
        name: p.name,
        win: status === "finished" ? p.id === String(winnerId || "") : undefined,
        score: Number(summary.pointsByPlayer?.[p.id] || 0),
        darts: { thrown: Number(summary.dartsByPlayer?.[p.id] || 0) },
        averages: { avg3d: Number(summary.avg3ByPlayer?.[p.id] || 0) },
        special: {
          turns: Number(summary.turnsByPlayer?.[p.id] || 0),
          fails: Number(summary.failsByPlayer?.[p.id] || 0),
          validHits: Number(summary.validHitsByPlayer?.[p.id] || 0),
          advances: Number(summary.advancesByPlayer?.[p.id] || 0),
          bestVisit: Number(summary.bestVisitByPlayer?.[p.id] || 0),
        },
      })),
      global: { duration: now - createdAtRef.current, turns: Number(turnCounter || 0) },
    };

    const payload = {
      matchId: matchIdRef.current,
      kind: "batard",
      status,
      createdAt: createdAtRef.current,
      updatedAt: now,
      stats: unifiedStats,
      config: { ...runtimeCfg, players: playerRows },
      visits: visitsRef.current,
      states,
      winnerId: status === "finished" ? winnerId : null,
    };

    return {
      id: matchIdRef.current,
      kind: "batard",
      status,
      createdAt: createdAtRef.current,
      updatedAt: now,
      players: playerRows,
      winnerId: status === "finished" ? winnerId : null,
      summary,
      payload,
    };
  }

  async function persist(status: "in_progress" | "finished") {
    const record = makeHistoryRecord(status);
    const sig = JSON.stringify({
      status,
      turnCounter,
      winnerId,
      visits: visitsRef.current.length,
      activeId,
      round: activeRoundIndex,
    });
    if (status === "in_progress" && sig === saveSigRef.current) return record;
    saveSigRef.current = sig;
    try {
      await History.upsert(record as any);
    } catch (error) {
      console.warn("[BatardPlay] History.upsert failed", error);
    }
    return record;
  }

  useEffect(() => {
    if (!resumeLoaded || finished || turnCounter <= 0) return;
    void persist("in_progress");
  }, [turnCounter, resumeLoaded, finished]);

  useEffect(() => {
    if (!finished) return;
    setShowEnd(true);
    if (!finishedSavedRef.current) {
      finishedSavedRef.current = true;
      void persist("finished").then((record) => {
        if (!finishCallbackRef.current) {
          finishCallbackRef.current = true;
          try { props?.onFinish?.(record, { navigate: false }); } catch {}
        }
      });
    }
  }, [finished]);

  function backToConfig() {
    if (props?.setTab) props.setTab("batard_config");
    else if (props?.go) props.go("batard_config");
    else window.history.back();
  }

  const winner = lightPlayers.find((p) => p.id === String(winnerId || "")) || null;
  const topRows = liveRanking.slice(0, 2);

  if (!resumeLoaded && resumeId) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: bg, color: primary, fontWeight: 1000 }}>
        REPRISE BÂTARD…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", color: T.text, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${bg} 46%, #020309 100%)`, overflowX: "hidden", paddingBottom: 8 }}>
      <PageHeader
        tickerSrc={tickerBatard}
        tickerAlt="BÂTARD"
        tickerBottomGap={8}
        left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>}
        right={<div style={{ marginRight: 6 }}><InfoDot title="Règles du BÂTARD" color={secondary} glow={`${secondary}77`} content={<RulesContent config={runtimeCfg} primary={primary} secondary={secondary} />} /></div>}
      />

      <main style={{ padding: "8px 8px 10px", width: "100%", maxWidth: 760, margin: "0 auto", boxSizing: "border-box" }}>
        <section style={{ ...panelStyle(primary), marginBottom: 7, padding: 0, overflow: "hidden" }}>
          <div style={{ position: "relative", minHeight: 126, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(128px,142px)", gap: 4, alignItems: "stretch", padding: "8px 10px" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,.36),rgba(0,0,0,.16) 46%,rgba(0,0,0,.30))" }} />
            {activePlayer ? (
              <div style={{ position: "absolute", left: -20, top: -6, bottom: -6, width: "28%", minWidth: 92, overflow: "hidden", opacity: .18, pointerEvents: "none" }}>
                <div style={{ position: "absolute", left: -12, top: 14, transform: "scale(1.42)", transformOrigin: "left top", filter: "saturate(.9)" }}>
                  <ProfileAvatar profile={activePlayer as any} dataUrl={activePlayer.avatarDataUrl as any} size={86} showStars={false} />
                </div>
              </div>
            ) : null}

            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0, padding: "2px 6px" }}>
              {botThinking ? <div style={{ color: T.pink, fontSize: 8.5, fontWeight: 1100, letterSpacing: .9, marginBottom: 2 }}>BOT EN RÉFLEXION</div> : null}
              <div style={{ color: activePlayer?.isBot ? T.pink : primary, fontSize: 14, fontWeight: 1100, letterSpacing: .8, textTransform: "uppercase", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{participantName(activePlayer)}</div>
              <div style={{ marginTop: 4, color: secondary, fontSize: 62, fontWeight: 1000, lineHeight: 1, textShadow: `0 4px 18px ${secondary}32` }}>{projectedScore}</div>
              <div style={{ marginTop: 4, color: T.soft, fontSize: 8.5, fontWeight: 900, letterSpacing: .45 }}>{runtimeCfg?.batard?.winMode === "RACE_TO_FINISH" ? `PROGRESSION ${Math.min(activeRoundIndex + 1, roundsTotal)}/${roundsTotal}` : `SCORE • ROUND ${Math.min(activeRoundIndex + 1, roundsTotal)}/${roundsTotal}`}</div>
            </div>

            <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "stretch", justifyContent: "center", minWidth: 0, overflow: "hidden", borderRadius: 18, background: "#050913", isolation: "isolate" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 18, backgroundImage: `linear-gradient(180deg,rgba(4,8,16,.34),rgba(4,8,16,.68)),url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover" }} />
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 38, background: "linear-gradient(90deg,rgba(4,8,16,.98),rgba(4,8,16,.28),transparent)" }} />
              <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 4px", textAlign: "center" }}>
                <div style={{ color: T.soft, fontSize: 9, fontWeight: 1000 }}>CIBLE</div>
                <div style={{ color: secondary, fontSize: roundLabel(currentRound).length > 5 ? 22 : 38, lineHeight: 1, fontWeight: 1100, marginTop: 4, textShadow: `0 0 18px ${secondary}88` }}>{roundLabel(currentRound)}</div>
                <div style={{ color: T.soft, fontSize: 7.7, fontWeight: 850, marginTop: 6, lineHeight: 1.2, padding: "0 3px" }}>{roundDetail(currentRound)}</div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...panelStyle(), marginBottom: 7, padding: 7 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
            <MiniKpi label="HITS" value={Number(activeStats?.validHits || 0)} color={T.green} />
            <MiniKpi label="ÉCHECS" value={Number(activeStats?.fails || 0)} color={T.red} />
            <MiniKpi label="AVANCES" value={Number(activeStats?.advances || 0)} color={primary} />
            <MiniKpi label="AVG / 3" value={activeAvg3} color={secondary} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4, marginTop: 4 }}>
            <MiniKpi compact label="DARTS" value={activeDarts} color={primary} />
            <MiniKpi compact label="TOURS" value={Number(activeStats?.turns || 0)} color={T.text} />
            <MiniKpi compact label="BEST" value={activeBestVisit} color={secondary} />
            <MiniKpi compact label="FAIL" value={failLabel(String(runtimeCfg?.batard?.failPolicy || "NONE"), Number(runtimeCfg?.batard?.failValue || 0))} color={T.pink} />
          </div>
        </section>

        <section style={{ ...panelStyle(), marginBottom: 7, padding: 8 }}>
          <button type="button" onClick={() => setRankingOpen(true)} style={{ position: "relative", width: "100%", minHeight: 82, overflow: "hidden", borderRadius: 17, border: `1px solid ${T.stroke}`, background: "linear-gradient(90deg,rgba(10,18,34,.96),rgba(16,28,46,.94) 50%,rgba(10,18,34,.96))", padding: "8px 36px 8px 8px", cursor: "pointer", color: T.text }}>
            <div style={{ position: "absolute", right: 5, top: 5, width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${primary}88`, background: "rgba(0,0,0,.30)", color: primary, fontWeight: 1000 }}>☰</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", minHeight: 64 }}>
              <BandPlayer row={topRows[0]} color={primary} align="left" />
              <div style={{ color: secondary, fontSize: 30, fontWeight: 1100, whiteSpace: "nowrap", textShadow: `0 0 16px ${secondary}33` }}>{topRows[0]?.score ?? 0}<span style={{ color: T.soft, margin: "0 6px", fontSize: 18 }}>–</span>{topRows[1]?.score ?? 0}</div>
              <BandPlayer row={topRows[1]} color={T.pink} align="right" />
            </div>
            <div style={{ color: T.soft, fontSize: 8.5, fontWeight: 850, textAlign: "center", marginTop: 2 }}>CLASSEMENT • {liveRanking.length} PARTICIPANT{liveRanking.length > 1 ? "S" : ""}</div>
          </button>
        </section>

        <section style={{ ...panelStyle(), marginBottom: 7, padding: 8 }}>
          <button type="button" onClick={() => setSequenceOpen(true)} style={{ width: "100%", border: 0, background: "transparent", padding: 0, color: T.text, cursor: "pointer", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div>
                <div style={{ color: primary, fontSize: 9, fontWeight: 1100, letterSpacing: .7 }}>SÉQUENCE</div>
                <div style={{ color: T.soft, fontSize: 8.5, marginTop: 1 }}>Touchez pour afficher tous les rounds</div>
              </div>
              <div style={{ color: secondary, fontSize: 10, fontWeight: 1000 }}>R{Math.min(activeRoundIndex + 1, roundsTotal)}/{roundsTotal} ›</div>
            </div>
            <div className="dc-scroll-thin" style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 3 }}>
              {rounds.map((round: any, index: number) => (
                <RoundChip key={round?.id || index} round={round} index={index} active={index === activeRoundIndex} done={index < activeRoundIndex} primary={primary} secondary={secondary} />
              ))}
            </div>
          </button>
        </section>

        {!finished ? (
          <section style={{ ...panelStyle(), padding: 8 }}>
            <VisitStrip darts={currentThrow} validHits={throwValidHits} neededHits={neededHits} rawScore={throwPoints} primary={primary} secondary={secondary} botThinking={botThinking} />
            <div style={{ opacity: botThinking ? .42 : 1, pointerEvents: botThinking ? "none" : "auto", marginTop: 5 }}>
              <Keypad
                currentThrow={currentThrow as any}
                multiplier={multiplier}
                onSimple={() => setMultiplier(1)}
                onDouble={() => setMultiplier(2)}
                onTriple={() => setMultiplier(3)}
                onNumber={addNumber}
                onBull={addBull}
                onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
                onUndo={() => setCurrentThrow((prev) => prev.slice(0, -1))}
                onCancel={() => { setCurrentThrow([]); setMultiplier(1); }}
                onValidate={validateVisit}
                hidePreview={false}
                centerSlot={<span style={{ display: "inline-grid", placeItems: "center", minWidth: 62, minHeight: 37, padding: "0 12px", borderRadius: 13, background: `${secondary}16`, border: `1px solid ${secondary}77`, color: secondary, fontSize: 19, fontWeight: 1100, boxShadow: `0 0 14px ${secondary}20` }}>{throwPoints}</span>}
              />
            </div>
          </section>
        ) : null}
      </main>

      <RankingModal open={rankingOpen} onClose={() => setRankingOpen(false)} rows={liveRanking} activeId={activeId} primary={primary} secondary={secondary} roundsTotal={roundsTotal} />
      <SequenceModal open={sequenceOpen} onClose={() => setSequenceOpen(false)} rounds={rounds} activeIndex={activeRoundIndex} primary={primary} secondary={secondary} />
      {showEnd && finished ? (
        <EndModal
          winner={winner}
          rows={liveRanking}
          primary={primary}
          secondary={secondary}
          onClose={() => setShowEnd(false)}
          onHistory={() => props?.setTab?.("statsHub", { tab: "history" })}
          onConfig={backToConfig}
        />
      ) : null}
    </div>
  );
}

function panelStyle(color?: string): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${color ? `${color}66` : T.stroke}`,
    background: "linear-gradient(180deg,rgba(255,255,255,.065),rgba(5,8,16,.74))",
    boxShadow: `0 10px 22px rgba(0,0,0,.24)${color ? `,0 0 20px ${color}12` : ""}`,
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  };
}

function MiniKpi({ label, value, color, compact = false }: any) {
  return (
    <div style={{ minWidth: 0, padding: compact ? "5px 2px" : "6px 3px", borderRadius: compact ? 10 : 12, textAlign: "center", background: "rgba(255,255,255,.04)", border: `1px solid ${T.stroke}` }}>
      <div style={{ color: T.soft, fontSize: compact ? "clamp(6px,1.5vw,7.2px)" : 8.1, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ color, fontSize: compact ? "clamp(9px,2.7vw,12.5px)" : 14.5, fontWeight: 1100, lineHeight: 1.05, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

function BandPlayer({ row, color, align }: any) {
  if (!row) return <div />;
  const player = row?.player || {};
  return (
    <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 7, flexDirection: align === "right" ? "row-reverse" : "row", textAlign: align === "right" ? "right" : "left" }}>
      <div style={{ position: "relative", width: 42, height: 42, flex: "0 0 42px" }}>
        <div style={{ position: "absolute", inset: 4 }}>
          <ProfileAvatar profile={player} dataUrl={player?.avatarDataUrl} size={34} showStars={false} />
        </div>
        {!player?.isBot ? <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}><ProfileStarRing profile={player} size={42} glow /></div> : null}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color, fontSize: 10.5, fontWeight: 1100, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
        <div style={{ color: T.soft, fontSize: 7.8, marginTop: 2 }}>R{Number(row?.roundIndex || 0) + 1} • {Number(row?.stats?.validHits || 0)} hits</div>
      </div>
    </div>
  );
}

function RoundChip({ round, index, active, done, primary, secondary }: any) {
  const color = active ? secondary : done ? T.green : primary;
  return (
    <div style={{ flex: "0 0 auto", minWidth: 50, height: 38, borderRadius: 12, display: "grid", placeItems: "center", padding: "2px 7px", border: `1px solid ${active ? `${color}cc` : `${color}44`}`, background: active ? `${color}18` : done ? `${T.green}0d` : "rgba(255,255,255,.025)", boxShadow: active ? `0 0 14px ${color}25` : "none" }}>
      <div style={{ color: T.soft, fontSize: 6.5, fontWeight: 900 }}>{done ? "✓" : `R${index + 1}`}</div>
      <div style={{ color, fontSize: 9.5, fontWeight: 1100, lineHeight: 1 }}>{roundLabel(round)}</div>
    </div>
  );
}

function VisitStrip({ darts, validHits, neededHits, rawScore, primary, secondary, botThinking }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 7, alignItems: "center", padding: "4px 3px 8px" }}>
      <div style={{ display: "flex", gap: 5, minWidth: 0 }}>
        {[0, 1, 2].map((i) => {
          const d = darts?.[i];
          return (
            <div key={i} style={{ flex: "1 1 0", minWidth: 0, minHeight: 31, borderRadius: 10, border: `1px solid ${d ? `${primary}66` : T.stroke}`, background: d ? `${primary}0f` : "rgba(255,255,255,.025)", display: "grid", placeItems: "center", color: d ? T.text : "rgba(255,255,255,.22)", fontSize: 10, fontWeight: 1000 }}>
              {botThinking && !d ? "…" : dartLabel(d)}
            </div>
          );
        })}
      </div>
      <div style={{ minWidth: 76, textAlign: "right" }}>
        <div style={{ color: validHits >= neededHits ? T.green : secondary, fontSize: 11, fontWeight: 1100 }}>{botThinking ? "BOT…" : `${validHits}/${neededHits} VALIDES`}</div>
        <div style={{ color: T.soft, fontSize: 8, marginTop: 2 }}>{rawScore} pts volée</div>
      </div>
    </div>
  );
}

function RankingModal({ open, onClose, rows, activeId, primary, secondary, roundsTotal }: any) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 12000, background: "rgba(0,0,0,.74)", backdropFilter: "blur(7px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px,97vw)", maxHeight: "88dvh", overflow: "hidden", borderRadius: 20, border: `1px solid ${primary}66`, background: "linear-gradient(180deg,rgba(7,17,25,.99),rgba(2,7,12,.99))", boxShadow: `0 24px 80px rgba(0,0,0,.72),0 0 26px ${primary}18` }}>
        <ModalHead title="CLASSEMENT LIVE" color={primary} onClose={onClose} />
        <div className="dc-scroll-thin" style={{ maxHeight: "calc(88dvh - 56px)", overflowY: "auto", padding: 10, display: "grid", gap: 6 }}>
          {rows.map((row: any, index: number) => {
            const active = String(row.id) === String(activeId);
            return (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "28px 44px minmax(0,1fr) auto", gap: 8, alignItems: "center", borderRadius: 15, border: `1px solid ${active ? `${primary}88` : T.stroke}`, background: active ? `${primary}10` : "rgba(255,255,255,.03)", padding: 8 }}>
                <div style={{ color: index === 0 ? secondary : T.soft, fontSize: 17, fontWeight: 1100, textAlign: "center" }}>{index + 1}</div>
                <ProfileAvatar profile={row.player || {}} dataUrl={row.player?.avatarDataUrl} size={40} showStars={false} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: active ? primary : T.text, fontSize: 12, fontWeight: 1100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}{active ? " • ACTIF" : ""}</div>
                  <div style={{ marginTop: 4, display: "flex", gap: 8, color: T.soft, fontSize: 8.5 }}>
                    <span>R {Math.min(Number(row.roundIndex || 0) + 1, roundsTotal)}/{roundsTotal}</span>
                    <span>Hits {Number(row?.stats?.validHits || 0)}</span>
                    <span>Échecs {Number(row?.stats?.fails || 0)}</span>
                  </div>
                </div>
                <div style={{ color: secondary, fontSize: 24, fontWeight: 1100 }}>{Number(row.score || 0)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SequenceModal({ open, onClose, rounds, activeIndex, primary, secondary }: any) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 12000, background: "rgba(0,0,0,.74)", backdropFilter: "blur(7px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px,97vw)", maxHeight: "88dvh", overflow: "hidden", borderRadius: 20, border: `1px solid ${secondary}66`, background: "linear-gradient(180deg,rgba(7,17,25,.99),rgba(2,7,12,.99))" }}>
        <ModalHead title="SÉQUENCE DES ROUNDS" color={secondary} onClose={onClose} />
        <div className="dc-scroll-thin" style={{ maxHeight: "calc(88dvh - 56px)", overflowY: "auto", padding: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
          {rounds.map((round: any, index: number) => {
            const active = index === activeIndex;
            const done = index < activeIndex;
            const color = active ? secondary : done ? T.green : primary;
            return (
              <div key={round?.id || index} style={{ minWidth: 0, borderRadius: 15, border: `1px solid ${color}${active ? "bb" : "44"}`, background: active ? `${color}14` : "rgba(255,255,255,.025)", padding: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ color, fontSize: 8.5, fontWeight: 1100 }}>R{index + 1}{done ? " ✓" : active ? " • ACTIF" : ""}</div>
                  <div style={{ color, fontSize: 11, fontWeight: 1100 }}>{roundLabel(round)}</div>
                </div>
                <div style={{ marginTop: 5, color: T.text, fontSize: 10.5, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{round?.label || "Round"}</div>
                <div style={{ marginTop: 3, color: T.soft, fontSize: 8.5, lineHeight: 1.25 }}>{roundDetail(round)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ModalHead({ title, color, onClose }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 36px", alignItems: "center", gap: 8, padding: "10px 11px", borderBottom: `1px solid ${T.stroke}` }}>
      <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${color}77`, background: "rgba(0,0,0,.28)", color, fontWeight: 1100, cursor: "pointer" }}>×</button>
      <div style={{ color, textAlign: "center", fontSize: 12, fontWeight: 1100, letterSpacing: .8 }}>{title}</div>
      <div />
    </div>
  );
}

function EndModal({ winner, rows, primary, secondary, onClose, onHistory, onConfig }: any) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 13000, background: "rgba(0,0,0,.80)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,96vw)", borderRadius: 22, border: `1px solid ${secondary}88`, background: "linear-gradient(180deg,rgba(11,19,31,.99),rgba(3,7,13,.99))", boxShadow: `0 28px 90px rgba(0,0,0,.78),0 0 30px ${secondary}22`, overflow: "hidden" }}>
        <div style={{ padding: "18px 14px 12px", textAlign: "center" }}>
          <div style={{ color: secondary, fontSize: 9, fontWeight: 1100, letterSpacing: 1.2 }}>PARTIE TERMINÉE</div>
          <div style={{ margin: "10px auto 6px", width: 82, height: 82, borderRadius: "50%", display: "grid", placeItems: "center", border: `2px solid ${secondary}`, boxShadow: `0 0 25px ${secondary}44`, overflow: "hidden" }}>
            <ProfileAvatar profile={winner || {}} dataUrl={winner?.avatarDataUrl} size={76} showStars={false} />
          </div>
          <div style={{ color: T.text, fontSize: 20, fontWeight: 1100 }}>{winner?.name || "Gagnant"}</div>
          <div style={{ color: secondary, fontSize: 42, fontWeight: 1100, lineHeight: 1, marginTop: 5 }}>{rows?.find((r: any) => String(r.id) === String(winner?.id))?.score ?? rows?.[0]?.score ?? 0}</div>
        </div>
        <div style={{ padding: "0 12px 12px", display: "grid", gap: 5 }}>
          {(rows || []).slice(0, 4).map((row: any, i: number) => (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "7px 9px", borderRadius: 12, background: "rgba(255,255,255,.035)", border: `1px solid ${T.stroke}` }}>
              <div style={{ color: i === 0 ? secondary : T.soft, fontWeight: 1100 }}>{i + 1}</div>
              <div style={{ fontSize: 10.5, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</div>
              <div style={{ color: i === 0 ? secondary : primary, fontSize: 15, fontWeight: 1100 }}>{row.score}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: "0 12px 14px" }}>
          <button type="button" onClick={onHistory} style={endButton(primary)}>HISTORIQUE</button>
          <button type="button" onClick={onConfig} style={endButton(secondary)}>RECONFIGURER</button>
        </div>
      </div>
    </div>
  );
}

function endButton(color: string): React.CSSProperties {
  return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}13`, color, fontSize: 10.5, fontWeight: 1100, letterSpacing: .55, cursor: "pointer" };
}
