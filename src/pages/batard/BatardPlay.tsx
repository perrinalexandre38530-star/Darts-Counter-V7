import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import Section from "../../components/Section";
import Keypad from "../../components/Keypad";
import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";
import tickerBatard from "../../assets/tickers/ticker_bastard.png";

import type { Dart as UIDart } from "../../lib/types";
import type { BatardConfig as BatardRulesConfig, BatardRound } from "../../lib/batard/batardTypes";
import { computeBatardReplaySnapshot, useBatardEngine } from "../../hooks/useBatardEngine";
import type { BatardConfigPayload } from "./BatardConfig";

import { History } from "../../lib/history";
import { PRO_BOTS } from "../../lib/botsPro";
import { getProBotAvatar } from "../../lib/botsProAvatars";

const INFO_TEXT = `BÂTARD — basé sur BatardConfig
- Chaque round impose une contrainte (cible / bull / multiplicateur)
- scoreOnlyValid: si activé => tu scores uniquement les flèches valides
- minValidHitsToAdvance: nb minimum de hits valides pour avancer
- failPolicy: malus / recul rounds / freeze
`;

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function roundLabel(round: BatardRound | null, idx: number) {
  if (!round) return `Round #${idx + 1}`;

  if (round.type === "TARGET_BULL") {
    return `Round #${idx + 1} — BULL (${round.multiplierRule || "ANY"})`;
  }

  if (round.type === "ANY_SCORE") {
    const m = round.multiplierRule || "ANY";
    return `Round #${idx + 1} — SCORE LIBRE (${m})`;
  }

  // TARGET_NUMBER
  const t = typeof (round as any).target === "number" ? (round as any).target : "?";
  const m = round.multiplierRule || "ANY";
  return `Round #${idx + 1} — ${m} ${t}`;
}

function makeMatchId(prefix: string) {
  const ts = Date.now();
  return `${prefix}-${ts}-${Math.random().toString(36).slice(2, 8)}`;
}

type LightPlayer = { id: string; name?: string; avatarDataUrl?: string | null };

// -------------------------------------------------------------
// BatardPlay
// -------------------------------------------------------------
export default function BatardPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const storeProfiles: any[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];

  const cfg: BatardConfigPayload =
    (props?.params?.config as BatardConfigPayload) ||
    (props?.config as BatardConfigPayload) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      presetId: "classic",
      batard: {
        presetId: "classic_bar",
        label: "Classic (Bar)",
        winMode: "SCORE_MAX",
        failPolicy: "NONE",
        failValue: 0,
        scoreOnlyValid: true,
        minValidHitsToAdvance: 1,
        rounds: [{ id: "r9", label: "Score Max", type: "ANY_SCORE", multiplierRule: "ANY" }],
      } as BatardRulesConfig,
    };


  // -----------------------------------------------------------
  // Resume (History) — rebuild from visits[] + saved config
  // -----------------------------------------------------------
  const resumeId: string | null =
    (props?.params?.resumeId as string) ||
    (props?.params?.matchId as string) ||
    (props?.resumeId as string) ||
    null;

  const [resumeLoaded, setResumeLoaded] = useState<boolean>(false);
  const [runtimeCfg, setRuntimeCfg] = useState<BatardConfigPayload>(cfg);
  const [engineResetKey, setEngineResetKey] = useState<number>(0);
  const [engineInit, setEngineInit] = useState<any | null>(null);

  // -----------------------------------------------------------
  // Players resolution (human profiles + bots) — from BatardConfig
  // -----------------------------------------------------------
  const lightPlayers: LightPlayer[] = useMemo(() => {
    const humans = (runtimeCfg.selectedHumanIds || []).filter(Boolean);
    const bots = runtimeCfg.botsEnabled ? (runtimeCfg.selectedBotIds || []).filter(Boolean) : [];

    // If config is empty (edge), fallback to first N store profiles.
    const fallbackHumans =
      humans.length > 0
        ? humans
        : storeProfiles
            .filter((p) => p && p.id != null && !(p.isBot === true))
            .slice(0, Math.max(2, runtimeCfg.players))
            .map((p) => String(p.id));

    const allIds = [...fallbackHumans, ...bots].slice(0, Math.max(2, runtimeCfg.players));

    return allIds.map((id) => {
      // bot pro?
      const bot = PRO_BOTS.find((b) => b.id === id);
      if (bot) {
        return {
          id,
          name: bot.displayName || id,
          avatarDataUrl: getProBotAvatar(bot.avatarKey || bot.id) || null,
        };
      }

      const prof = storeProfiles.find((p) => String(p?.id) === String(id));
      return {
        id: String(id),
        name: prof?.name || prof?.displayName || String(id),
        avatarDataUrl: prof?.avatarDataUrl ?? null,
      };
    });
  }, [runtimeCfg.selectedHumanIds, runtimeCfg.selectedBotIds, runtimeCfg.botsEnabled, runtimeCfg.players, storeProfiles]);

  const playerIds = useMemo(() => lightPlayers.map((p) => p.id), [lightPlayers]);


  // -----------------------------------------------------------
  // Engine
  // -----------------------------------------------------------
  const { states, ranking, currentPlayerIndex, currentRound, submitVisit, finished, winnerId, turnCounter } =
    useBatardEngine(playerIds, runtimeCfg.batard, { resetKey: engineResetKey, initialSnapshot: engineInit });

  const active = states[currentPlayerIndex];
  const activeRoundIdx = active?.roundIndex ?? 0;

  // -----------------------------------------------------------
  // Persistence (History)
  // - In progress: upsert after each visit
  // - Finished: upsert once with summary + payload
  // -----------------------------------------------------------
  const matchIdRef = useRef<string>((props?.params?.matchId as string) || makeMatchId("batard"));
  const createdAtRef = useRef<number>(Date.now());
  const visitsRef = useRef<any[]>([]);
  const didSaveFinishedRef = useRef<boolean>(false);


  // Load resume match from History (if provided)
  useEffect(() => {
    let cancelled = false;
    if (!resumeId || resumeLoaded) return;
    (async () => {
      try {
        const rec: any = await History.get(resumeId);
        if (!rec || cancelled) {
          setResumeLoaded(true);
          return;
        }

        const payload = (rec as any).payload || (rec as any).decoded || null;
        const savedCfg = payload?.config || null;
        const savedVisits = Array.isArray(payload?.visits) ? payload.visits : [];

        // restore match id + createdAt
        if (rec?.id) matchIdRef.current = String(rec.id);
        if (payload?.createdAt) createdAtRef.current = Number(payload.createdAt) || createdAtRef.current;

        // restore visits for bestVisit/summary consistency
        visitsRef.current = savedVisits;

        // apply config from saved match (prefer saved players list)
        if (savedCfg) {
          // savedCfg.players may already be LightPlayer[]
          const maybePlayers = Array.isArray(savedCfg.players) ? savedCfg.players : null;
          if (maybePlayers && maybePlayers.length) {
            // keep same shape as BatardConfigPayload expects (players count etc.)
            setRuntimeCfg((prev) => ({ ...(prev as any), ...(savedCfg as any), players: maybePlayers.length }));
          } else {
            setRuntimeCfg((prev) => ({ ...(prev as any), ...(savedCfg as any) }));
          }
        }

        // build engine init snapshot
        const ids: string[] = Array.isArray(savedCfg?.players)
          ? savedCfg.players.map((p: any) => String(p.id))
          : lightPlayers.map((p) => p.id);

        const snap = computeBatardReplaySnapshot(ids, (savedCfg?.batard || runtimeCfg.batard) as any, savedVisits);
        setEngineInit(snap);
        setEngineResetKey((k) => k + 1);
      } catch (e) {
        console.warn("[BatardPlay] resume load failed", e);
      } finally {
        if (!cancelled) setResumeLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  function buildSummaryFromStates(finalStates: any[]) {
    const dartsByPlayer: Record<string, number> = {};
    const pointsByPlayer: Record<string, number> = {};
    const turnsByPlayer: Record<string, number> = {};
    const avg3ByPlayer: Record<string, number> = {};
    const failsByPlayer: Record<string, number> = {};
    const validHitsByPlayer: Record<string, number> = {};
    const advancesByPlayer: Record<string, number> = {};
    const bestVisitByPlayer: Record<string, number> = {};

    // best visit: from payload.visits if present
    try {
      for (const v of visitsRef.current) {
        const pid = String(v?.p || "");
        if (!pid) continue;
        const sc = Number(v?.score || 0);
        bestVisitByPlayer[pid] = Math.max(Number(bestVisitByPlayer[pid] || 0), sc);
      }
    } catch {}

    for (const p of finalStates || []) {
      const pid = String(p.id);
      const darts = Number(p?.stats?.dartsThrown || 0);
      const pts = Number(p?.stats?.pointsAdded || 0);
      const turns = Number(p?.stats?.turns || 0);
      const a3 = darts > 0 ? (pts / darts) * 3 : 0;

      dartsByPlayer[pid] = darts;
      pointsByPlayer[pid] = pts;
      turnsByPlayer[pid] = turns;
      avg3ByPlayer[pid] = a3;

      failsByPlayer[pid] = Number(p?.stats?.fails || 0);
      validHitsByPlayer[pid] = Number(p?.stats?.validHits || 0);
      advancesByPlayer[pid] = Number(p?.stats?.advances || 0);
    }

    return {
      matchId: matchIdRef.current,
      mode: "batard",
      presetId: runtimeCfg.presetId,
      batardPresetId: (runtimeCfg.batard as any)?.presetId,
      status: finished ? "finished" : "in_progress",

      // maps (compat deriveHistoryStats + statsBridge)
      darts: dartsByPlayer,
      pointsByPlayer,
      dartsByPlayer,
      turnsByPlayer,
      avg3ByPlayer,
      bestVisitByPlayer,

      // batard specifics
      failsByPlayer,
      validHitsByPlayer,
      advancesByPlayer,

      turns: turnCounter,
      winMode: runtimeCfg.batard.winMode,
      failPolicy: runtimeCfg.batard.failPolicy,
      failValue: runtimeCfg.batard.failValue,
      scoreOnlyValid: runtimeCfg.batard.scoreOnlyValid,
      minValidHitsToAdvance: runtimeCfg.batard.minValidHitsToAdvance,
    };
  }

  async function upsertHistory(status: "in_progress" | "finished") {
    const matchId = matchIdRef.current;
    const createdAt = createdAtRef.current;
    const updatedAt = Date.now();

    const summary = buildSummaryFromStates(states as any);

    const payload = {
      matchId,
      kind: "batard",
      status,
      createdAt,
      updatedAt,

      // store light config only (safe + stable)
      config: {
        ...runtimeCfg,
        players: lightPlayers,
      },

      // replay-friendly visits
      visits: visitsRef.current,

      // snapshot final states for summary / debug
      states: states,

      winnerId: status === "finished" ? winnerId : null,
    };

    const record: any = {
      id: matchId,
      kind: "batard",
      status,
      createdAt,
      updatedAt,
      players: lightPlayers,
      winnerId: status === "finished" ? winnerId : null,
      summary,
      payload,
    };

    try {
      await History.upsert(record);
    } catch (e) {
      console.warn("[BatardPlay] History.upsert failed", e);
    }
  }

  // -----------------------------------------------------------
  // UI local state (keypad)
  // -----------------------------------------------------------
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  function goBack() {
    // demandé: BackDot doit revenir au menu Games de darts (pas gameselect)
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  // Keypad handlers
  const onNumber = (v: number) => {
    if (finished) return;
    if (currentThrow.length >= 3) return;
    setInfoMsg(null);
    setCurrentThrow((prev) => [...prev, { v, mult: multiplier, label: `${multiplier}x${v}` }]);
  };

  const onBull = () => {
    if (finished) return;
    if (currentThrow.length >= 3) return;
    setInfoMsg(null);
    setCurrentThrow((prev) => [...prev, { v: 25, mult: multiplier, label: multiplier === 2 ? "DBULL" : "BULL" }]);
  };

  const onUndo = () => {
    if (finished) return;
    setInfoMsg(null);
    setCurrentThrow((prev) => prev.slice(0, -1));
  };

  const onCancel = () => {
    if (finished) return;
    setInfoMsg(null);
    setCurrentThrow([]);
    setMultiplier(1);
  };

  const onValidate = () => {
    if (finished) return;

    const darts = [...currentThrow];
    const pid = String(active?.id || playerIds[currentPlayerIndex] || "");

    // compute visit score (for bestVisit + replay)
    const sc = darts.reduce((s, d) => s + Number((d.v || 0) * (d.mult || 1)), 0);

    visitsRef.current.push({
      p: pid,
      darts: darts.map((d) => ({ v: d.v, mult: d.mult })),
      score: sc,
      ts: Date.now(),
      roundIndexBefore: active?.roundIndex ?? 0,
    });

    submitVisit(darts);

    setCurrentThrow([]);
    setMultiplier(1);
    setInfoMsg(null);
  };

  // Autosave: after each turnCounter change, persist in_progress (unless finished)
  const lastSavedTurnRef = useRef<number>(-1);
  useEffect(() => {
    if (finished) return;
    if (turnCounter === lastSavedTurnRef.current) return;
    lastSavedTurnRef.current = turnCounter;

    // only save after at least one turn (avoid junk record on open)
    if (turnCounter <= 0) return;

    upsertHistory("in_progress");
  }, [turnCounter, finished]);

  // Save finished once
  useEffect(() => {
    if (!finished) return;
    if (didSaveFinishedRef.current) return;
    didSaveFinishedRef.current = true;

    upsertHistory("finished");
  }, [finished]);

  // winner memo
  const winner = useMemo(() => {
    if (!finished || !winnerId) return null;
    const w = states.find((p) => p.id === winnerId) || null;
    return w ? { id: w.id, score: w.score } : null;
  }, [finished, winnerId, states]);

  return (
    <div className="page">
      <PageHeader
        title="BÂTARD"
        tickerSrc={tickerBatard}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="BÂTARD" content={INFO_TEXT} />}
      />

      <Section title={t("game.status", "Statut")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            Joueur: <span style={{ opacity: 0.9 }}>{lightPlayers.find((p) => p.id === active?.id)?.name || active?.id}</span>
          </div>
          <div style={{ fontWeight: 700, opacity: 0.9 }}>{roundLabel(currentRound as any, activeRoundIdx)}</div>
        </div>

        <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12, lineHeight: 1.35 }}>
          <div>
            <b>winMode</b>: {runtimeCfg.batard.winMode} — <b>failPolicy</b>: {runtimeCfg.batard.failPolicy}
            {runtimeCfg.batard.failPolicy !== "NONE" ? ` (${runtimeCfg.batard.failValue})` : ""}
          </div>
          <div>
            <b>scoreOnlyValid</b>: {String(runtimeCfg.batard.scoreOnlyValid)} — <b>minValidHitsToAdvance</b>: {runtimeCfg.batard.minValidHitsToAdvance}
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {states.map((p, idx) => {
            const lp = lightPlayers.find((x) => x.id === p.id);
            return (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: idx === currentPlayerIndex ? "rgba(255,215,0,0.10)" : "rgba(0,0,0,0.18)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 800 }}>{lp?.name || p.id}</div>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>
                    Round {Math.min(p.roundIndex + 1, runtimeCfg.batard.rounds.length)}/{runtimeCfg.batard.rounds.length}
                  </div>
                </div>

                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{p.score}</div>

                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, opacity: 0.9 }}>
                  <span>🎯 hits: {p.stats.validHits}</span>
                  <span>🧮 tours: {p.stats.turns}</span>
                  <span>⚠️ fails: {p.stats.fails}</span>
                </div>

                {p.lastVisit && p.lastVisit.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                    Dernier tour:{" "}
                    {p.lastVisit.map((d, i) => (
                      <span key={i} style={{ marginRight: 8 }}>
                        {d.mult}×{d.v}
                      </span>
                    ))}
                    <span style={{ marginLeft: 8, fontWeight: 800 }}>
                      ({p.lastValidHits} hit{p.lastValidHits === 1 ? "" : "s"})
                    </span>
                    {p.lastAdvanced ? <span style={{ marginLeft: 8, fontWeight: 800 }}>✅</span> : <span style={{ marginLeft: 8, fontWeight: 800 }}>❌</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {infoMsg && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.08)" }}>
            {infoMsg}
          </div>
        )}
      </Section>

      {finished && winner ? (
        <Section title="🏁 Fin de partie">
          <div style={{ fontWeight: 900, fontSize: 22 }}>
            Gagnant: {lightPlayers.find((p) => p.id === winner.id)?.name || winner.id} — {winner.score} pts
          </div>

          <div style={{ marginTop: 12, opacity: 0.9, fontSize: 13 }}>
            Classement:
            <ol style={{ marginTop: 8 }}>
              {ranking.map((p) => (
                <li key={p.id}>
                  {(lightPlayers.find((x) => x.id === p.id)?.name || p.id)} — {p.score} pts (fails {p.stats.fails}, turns {p.stats.turns})
                </li>
              ))}
            </ol>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => props?.setTab?.("statsHub", { tab: "history" })}>
              Historique
            </button>
            <button className="btn" onClick={() => props?.setTab?.("batard_config")}>
              Rejouer / Reconfigurer
            </button>
          </div>
        </Section>
      ) : (
        <div style={{ paddingBottom: 120 }}>
          <Keypad
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onNumber={onNumber}
            onBull={onBull}
            onUndo={onUndo}
            onCancel={onCancel}
            onValidate={onValidate}
            hidePreview={false}
          />
        </div>
      )}
    </div>
  );
}
