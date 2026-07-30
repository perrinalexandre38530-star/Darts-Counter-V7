// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import type { CommonConfig } from "../lib/simpleRounds/types";
import { History } from "../lib/history";
import ScoreInputHub from "../components/ScoreInputHub";
import type { Dart as UIDart } from "../lib/types";
import { buildDartsTelemetry, canonicalToUiDart, canonicalVisitFromUiDarts, exactDartsForScore, scoreDarts } from "../lib/dartsTelemetry";

const clamp = (n: number) => {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return Math.max(0, Math.min(180, v));
};

export default function SimpleRoundsPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const variantId: string = props?.variantId ?? "count_up";
  const spec = SIMPLE_ROUND_VARIANTS[variantId];

  const cfg: CommonConfig =
    (props?.params?.config as CommonConfig) ||
    (props?.config as CommonConfig) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      rounds: 10,
      objective: 0,
      humansCount: 1,
    };

  const playerRows = useMemo(() => {
    const explicit = props?.params?.players ?? props?.players ?? (Array.isArray((cfg as any)?.players) ? (cfg as any).players : null);
    if (Array.isArray(explicit) && explicit.length) {
      return explicit.map((p: any, i: number) => ({
        id: String(p?.id ?? p?.profileId ?? `p${i + 1}`),
        name: String(p?.name ?? p?.displayName ?? `${t("generic.player", "Joueur")} ${i + 1}`),
        avatarDataUrl: p?.avatarDataUrl ?? p?.avatarUrl ?? null,
        isBot: !!p?.isBot,
      }));
    }
    const count = Math.max(1, Number((cfg as any)?.players) || 1);
    return Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `${t("generic.player", "Joueur")} ${i + 1}`,
      avatarDataUrl: null,
      isBot: false,
    }));
  }, [props?.params?.players, props?.players, (cfg as any)?.players, t]);
  const playerCount = playerRows.length;

  const [roundIdx, setRoundIdx] = useState(0); // 0..cfg.rounds
  const [playerIdx, setPlayerIdx] = useState(0);
  const [scores, setScores] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const visitHistoryRef = useRef<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);

  // Stats (par joueur) — 1 saisie = 1 volée (3 darts)
  const [dartsByP, setDartsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [pointsByP, setPointsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [bestVisitByP, setBestVisitByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [visitsByP, setVisitsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));

  // Auto-play bots
  // Guard (avoid double auto-play)
  const botActRef = useRef<{ key: string } | null>(null);

  // Persist history once
  const savedRef = useRef(false);

  const isFinished = gameOver || roundIdx >= cfg.rounds;

  const winner = useMemo(() => {
    if (!isFinished) return null;
    if (winnerIdx != null) return { idx: winnerIdx, score: scores[winnerIdx] };
    const idx = spec?.computeWinnerOnEnd(scores) ?? 0;
    return { idx, score: scores[idx] };
  }, [isFinished, winnerIdx, scores, spec]);

  const configTab = useMemo(() => {
    // Note: keep this map minimal + explicit to avoid wrong navigation
    const map: Record<string, string> = {
      count_up: "count_up_config",
      halve_it: "halve_it_config",
      bobs_27: "bobs27_config",
      bobs27: "bobs27_config",
      enculette: "enculette_config",
      super_bull: "super_bull_config",
      happy_mille: "happy_mille_config",
      game_170: "game_170_config",
    };
    return map[String(variantId || "")] || "games";
  }, [variantId]);

  const botMask = useMemo(() => {
    // Convention: si botsEnabled, les N premiers sont humains, le reste = bots
    if (!cfg?.botsEnabled) return Array.from({ length: playerCount }, () => false);
    const humans = Math.min(Math.max(1, Number(cfg?.humansCount ?? 1)), Math.max(1, playerCount));
    return Array.from({ length: playerCount }, (_, i) => i >= humans);
  }, [cfg?.botsEnabled, playerCount, (cfg as any)?.humansCount]);
function goBack() {
    if (props?.setTab) {
      // Retour logique vers la config du mode (plutôt que sortir du flow)
      if (configTab && configTab !== "games") return props.setTab(configTab, { config: cfg });
      return props.setTab("games");
    }
    window.history.back();
  }

  function advanceTurn(nextScores: number[], forcedWinner: number | null) {
    setScores(nextScores);

    if (forcedWinner != null) {
      setWinnerIdx(forcedWinner);
      setGameOver(true);
      return;
    }

    // next player
    let nextPlayer = playerIdx + 1;
    let nextRound = roundIdx;

    if (nextPlayer >= playerCount) {
      nextPlayer = 0;
      nextRound = roundIdx + 1;
    }

    setPlayerIdx(nextPlayer);
    setRoundIdx(nextRound);

    if (nextRound >= cfg.rounds) {
      setGameOver(true);
    }
  }

  function applyVisitFor(pIdx: number, rawDarts: UIDart[]) {
    if (!spec) return;
    const exactDarts = (Array.isArray(rawDarts) ? rawDarts : []).slice(0, 3);
    const v = clamp(scoreDarts(exactDarts));
    const pid = String(playerRows[pIdx]?.id ?? `p${pIdx + 1}`);
    const visitIndex = visitHistoryRef.current.filter((row: any) => String(row?.playerId) === pid).length;
    visitHistoryRef.current.push(canonicalVisitFromUiDarts({
      playerId: pid,
      darts: exactDarts,
      visitIndex,
      roundIndex: roundIdx,
      source: `simple_rounds:${variantId}`,
    }));

    const res = spec.applyVisit({
      visit: v,
      currentScore: scores[pIdx] ?? 0,
      objective: cfg.objective,
      roundIndex: roundIdx,
    });

    const nextScores = [...scores];
    nextScores[pIdx] = (nextScores[pIdx] ?? 0) + (res.delta ?? 0);

    // stats local match
    setVisitsByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = (nx[pIdx] ?? 0) + 1;
      return nx;
    });
    setDartsByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = (nx[pIdx] ?? 0) + exactDarts.length;
      return nx;
    });
    setPointsByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = (nx[pIdx] ?? 0) + (res.delta ?? 0);
      return nx;
    });
    setBestVisitByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = Math.max(nx[pIdx] ?? 0, v);
      return nx;
    });

    const forceWin = !!res.forceWin;
    advanceTurn(nextScores, forceWin ? pIdx : null);
  }

  function validate() {
    if (!currentThrow.length) return;
    applyVisitFor(playerIdx, currentThrow);
    setCurrentThrow([]);
    setMultiplier(1);
  }

  function resetMatch() {
    savedRef.current = false;
    botActRef.current = null;
    setRoundIdx(0);
    setPlayerIdx(0);
    setScores(Array.from({ length: playerCount }, () => 0));
    setCurrentThrow([]);
    setMultiplier(1);
    visitHistoryRef.current = [];
    setGameOver(false);
    setWinnerIdx(null);
    setVisitsByP(Array.from({ length: playerCount }, () => 0));
    setDartsByP(Array.from({ length: playerCount }, () => 0));
    setPointsByP(Array.from({ length: playerCount }, () => 0));
    setBestVisitByP(Array.from({ length: playerCount }, () => 0));
  }

  function botPickVisit(): number {
    const lvl = String(cfg?.botLevel || "normal");
    const r = Math.random();

    // Mode spécial SUPER BULL : modèle bull (25/50) sur 3 fléchettes
    if (variantId === "super_bull") {
      const pBull = lvl === "hard" ? 0.38 : lvl === "easy" ? 0.12 : 0.24; // probabilité d'outer bull (25)
      const pDBull = lvl === "hard" ? 0.18 : lvl === "easy" ? 0.03 : 0.09; // probabilité de double bull (50)
      let total = 0;
      for (let d = 0; d < 3; d++) {
        const x = Math.random();
        if (x < pDBull) total += 50;
        else if (x < pDBull + pBull) total += 25;
        else total += 0;
      }
      return clamp(total); // 0..150
    }

    // Mode spécial 170 : le bot doit parfois sortir 170
    if (variantId === "game_170") {
      const p170 = lvl === "hard" ? 0.22 : lvl === "easy" ? 0.04 : 0.11;
      if (r < p170) return 170;
      // sinon volée “normale”
      const base = lvl === "hard" ? 85 : lvl === "easy" ? 35 : 60;
      const span = lvl === "hard" ? 70 : lvl === "easy" ? 55 : 65;
      return clamp(base + (Math.random() - 0.5) * span);
    }

    // Générateur simple par difficulté
    const base = lvl === "hard" ? 95 : lvl === "easy" ? 35 : 70;
    const span = lvl === "hard" ? 85 : lvl === "easy" ? 70 : 80;

    // Petites chances de gros score
    const spike = lvl === "hard" ? 0.12 : lvl === "easy" ? 0.02 : 0.06;
    if (Math.random() < spike) {
      const high = lvl === "hard" ? 140 : 120;
      return clamp(high + Math.random() * 40);
    }

    // Petites chances de zéro (important pour enculette)
    const miss = lvl === "hard" ? 0.02 : lvl === "easy" ? 0.10 : 0.06;
    if (Math.random() < miss) return 0;

    return clamp(base + (Math.random() - 0.5) * span);
  }

  function botPickDarts(): UIDart[] {
    if (variantId === "super_bull") {
      const lvl = String(cfg?.botLevel || "normal");
      const pBull = lvl === "hard" ? 0.38 : lvl === "easy" ? 0.12 : 0.24;
      const pDBull = lvl === "hard" ? 0.18 : lvl === "easy" ? 0.03 : 0.09;
      return Array.from({ length: 3 }, () => {
        const x = Math.random();
        if (x < pDBull) return { v: 25, mult: 2 as const };
        if (x < pDBull + pBull) return { v: 25, mult: 1 as const };
        return { v: 0, mult: 1 as const };
      });
    }
    return exactDartsForScore(botPickVisit()).map(canonicalToUiDart);
  }

  // Auto-play bots
  useEffect(() => {
    if (isFinished) return;
    if (!cfg?.botsEnabled) return;
    if (!botMask[playerIdx]) return;

    const key = `${roundIdx}:${playerIdx}:${scores.join(",")}`;
    if (botActRef.current?.key === key) return;
    botActRef.current = { key };

    const timer = window.setTimeout(() => {
      const darts = botPickDarts();
      applyVisitFor(playerIdx, darts);
    }, 520);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.botsEnabled, botMask, playerIdx, roundIdx, isFinished, scores.join("|")]);

  // Persist history + summary once when finished
  useEffect(() => {
    if (!isFinished) return;
    if (savedRef.current) return;
    if (!winner) return;

    savedRef.current = true;

    const now = Date.now();
    const id =
      (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
        ? (crypto as any).randomUUID()
        : `sr_${variantId}_${now}_${Math.random().toString(16).slice(2)}`);

    const players = playerRows.map((p: any, i: number) => ({
      id: String(p.id),
      name: botMask[i] && !String(p.name).includes("BOT") ? `${p.name} (BOT)` : p.name,
      avatarDataUrl: p.avatarDataUrl ?? null,
    }));

    const avg3ByPlayer: Record<string, number> = {};
    const dartsMap: Record<string, number> = {};
    const bestVisitMap: Record<string, number> = {};
    const bestCheckoutMap: Record<string, number> = {};

    for (let i = 0; i < playerCount; i++) {
      const pid = String(players[i]?.id ?? `p${i + 1}`);
      const visits = visitsByP[i] || 0;
      const darts = dartsByP[i] || visits * 3;
      const pts = pointsByP[i] || 0;
      const avg3 = visits > 0 ? pts / visits : 0;
      avg3ByPlayer[pid] = Math.round(avg3 * 100) / 100;
      dartsMap[pid] = darts;
      bestVisitMap[pid] = bestVisitByP[i] || 0;
      bestCheckoutMap[pid] = 0;
    }

    const rec: any = {
      id,
      matchId: id,
      kind: String(variantId || "simple_rounds"),
      status: "finished",
      createdAt: now,
      updatedAt: now,
      players,
      winnerId: String(players[winner.idx]?.id ?? `p${winner.idx + 1}`),
      game: {
        mode: String(variantId || "simple_rounds"),
        rounds: cfg.rounds,
        objective: cfg.objective,
        botsEnabled: !!cfg.botsEnabled,
        botLevel: cfg.botLevel,
      },
      summary: {
        legs: 1,
        avg3ByPlayer,
        darts: dartsMap,
        bestVisitByPlayer: bestVisitMap,
        bestCheckoutByPlayer: bestCheckoutMap,
        // co: 0 (pas de checkout sur ces variantes)
      },
      payload: {
        variantId,
        mode: variantId,
        sport: "darts",
        config: cfg,
        scores,
        visitHistory: visitHistoryRef.current.slice(),
        events: visitHistoryRef.current.slice(),
      },
    };

    const telemetry = buildDartsTelemetry(rec, rec.payload);
    if (telemetry) {
      rec.payload.telemetry = telemetry;
      rec.payload.dartTelemetry = telemetry;
      rec.summary.hitSummary = { ...telemetry.totals, byPlayer: telemetry.perPlayer };
      rec.summary.telemetryExact = true;
      rec.summary.telemetryCoverage = "full";
    }

    // best effort: don't break gameplay if history fails
    Promise.resolve(History.upsert(rec)).catch((e) => console.warn("History.upsert(simpleRounds) failed:", e));
  }, [
    isFinished,
    winner,
    variantId,
    cfg,
    botMask,
    visitsByP,
    dartsByP,
    pointsByP,
    bestVisitByP,
    scores,
    t,
    playerRows,
    playerCount,
  ]);

  if (!spec) {
    return (
      <div className="page" style={{ padding: 16, color: "#fff" }}>
        Variante inconnue: {String(variantId)}
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={spec.title}
        tickerSrc={spec.tickerSrc}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title={spec.infoTitle} content={spec.infoText} />}
      />

      <div style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 1000 }}>
            {t("generic.round", "Round")} {Math.min(roundIdx + 1, cfg.rounds)}/{cfg.rounds}
          </div>
          {!isFinished && (
            <div style={{ fontWeight: 900, opacity: 0.9 }}>
              {t("generic.turn", "Tour")} : {t("generic.player", "Joueur")} {playerIdx + 1}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${playerCount}, minmax(0,1fr))`, gap: 10 }}>
          {scores.map((s, i) => {
            const active = !isFinished && i === playerIdx;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: active ? "1px solid rgba(120,255,200,0.35)" : "1px solid rgba(255,255,255,0.10)",
                  background: active ? "rgba(120,255,200,0.10)" : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>
                  {t("generic.player", "Joueur")} {i + 1}
                  {botMask[i] ? " • BOT" : ""}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{s}</div>
              </div>
            );
          })}
        </div>

        {!isFinished && !botMask[playerIdx] && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 0.8 }}>
              {t("generic.visit", "VOLÉE")} — {variantId === "super_bull" ? t("generic.input", "BULL (0..150, paliers 25)") : t("generic.input", "entre un score 0..180")}
            </div>

            <div style={{ marginTop: 10 }}>
              <ScoreInputHub
                currentThrow={currentThrow}
                multiplier={multiplier}
                onSimple={() => setMultiplier(1)}
                onDouble={() => setMultiplier(2)}
                onTriple={() => setMultiplier(3)}
                onCancel={() => { setCurrentThrow([]); setMultiplier(1); }}
                onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
                onNumber={(n: number) => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, { v: n, mult: multiplier }])}
                onBull={() => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, { v: 25, mult: multiplier === 3 ? 1 : multiplier } as UIDart])}
                onValidate={validate}
                onDirectDart={(d: UIDart) => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, d])}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
