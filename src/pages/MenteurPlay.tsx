// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import tickerMenteur from "../assets/tickers/ticker_menteur.webp";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { playNewModeDartSequence, playNewModeDartSfx, playNewModeSfx, unlockNewModeAudio } from "../lib/newModesArcadeSfx";
import { commitPremiumPartyProgress } from "../lib/premiumPartyProgress";
import {
  callMenteur, cloneMenteurState, createMenteurState, isMenteurConditionSatisfied, isMenteurContractSatisfied,
  menteurConditionLabel, normalizeMenteurConfig, pickMenteurBotAction, pickMenteurBotDarts, playMenteurVisit,
  raiseMenteurBid, raiseMenteurBidTo, scoreMenteurVisit, type MenteurState,
} from "../lib/gameEngines/menteurEngine";
import {
  NewModeInput, actionStyle, dartLabel, isBotProfile, lastEvents, panelStyle, playerName,
  resolveModeProfiles, SOFT, uiToGameDart,
} from "./newModes/newModePlayShared";
import {
  ActiveHero, BotTurn, FloatingAdvice, GameplayMission, KpiStrip, LogModal, PlayersModal, PremiumAwenaButton,
  PremiumEndPanel, PremiumMomentOverlay, QuickRow, RankingModal, StatsModal, SummaryStrip, bestBy, modePlayerColors, percent,
} from "./newModes/PremiumPartyModeUi";
import { resolvePremiumPartyMoment } from "./newModes/premiumPartyMoments";
import { premiumBotTacticalPlan, resolvePremiumBotBrain } from "../lib/premiumPartyBotAI";
import { adaptPremiumBotBrain } from "../lib/premiumPartyBotMemory";
import { adaptPremiumBotBrainFromScouting, commitPremiumPartyScouting } from "../lib/premiumPartyBotScouting";
import { adaptPremiumBotBrainFromRivalry, commitPremiumPartyRivalry } from "../lib/premiumPartyBotRivalry";
import "./newModes/PremiumPartyModeUi.css";

const ACCENT = "#ffbf37";
const RED = "#ff5e4d";
const BLUE = "#5ac8ff";
const GREEN = "#72efb1";

function coachText(state: MenteurState, active: any) {
  if (!active) return "";
  const lives = Number(state.lives?.[active.id] || 0), maxLives = Number(state.config.rules.lives || 5);
  if (state.phase === "auction") {
    if (!state.lastBidderId) return `Ouvre l'enchère sans te piéger : ${Math.max(30, state.config.rules.raiseStep * 6)} est une base raisonnable.`;
    const condition = menteurConditionLabel(state.condition);
    if (state.bid >= 150) return `Annonce très haute (${state.bid}) : appeler MENTEUR devient une vraie option, surtout avec ${condition}.`;
    if (lives <= 1) return `Dernière vie : évite une surenchère gratuite. Évalue ${state.bid} + ${condition}.`;
    return `Tu peux surenchérir de ${state.config.rules.raiseStep} minimum ou appeler MENTEUR si l'annonce paraît irréaliste.`;
  }
  if (state.condition === "double") return `Preuve : assure d'abord un Double, puis complète le score ${state.bid}.`;
  if (state.condition === "triple") return `Preuve : place un Triple puis sécurise ${state.bid} points.`;
  if (state.condition === "bull") return `Preuve : le Bull est obligatoire. Cherche-le avant de construire le reste du score.`;
  if (state.condition === "distinct") return `Preuve : 3 numéros différents ET au moins ${state.bid} points.`;
  return `Preuve libre : il faut atteindre au moins ${state.bid} points en 3 fléchettes.`;
}

function BluffBadge({ phase, bid, condition }: any) {
  const danger = phase === "challenge";
  return <div style={{ width: 96, height: 96, borderRadius: 999, border: `2px solid ${danger ? RED : ACCENT}88`, boxShadow: `0 0 24px ${danger ? RED : ACCENT}22`, background: "radial-gradient(circle,#40210c,#100b09 70%)", display: "grid", placeItems: "center", textAlign: "center" }}>
    <div style={{ fontSize: 31 }}>🤥</div><div style={{ marginTop: -15, color: danger ? RED : ACCENT, fontSize: 9, fontWeight: 1100 }}>{danger ? "PREUVE" : bid ? `${bid} PTS` : "BLUFF"}</div><small style={{ marginTop: -18, color: SOFT, fontSize: 7.5 }}>{menteurConditionLabel(condition)}</small>
  </div>;
}


function MenteurTableBoard({ state, colorById, previewScore = 0, previewConditionOk = false, previewContractOk = false, dartsCount = 0 }: any) {
  const last = state.players.find((p:any)=>p.id===state.lastBidderId);
  const conditionPenalty = state.condition === "none" ? 0 : state.condition === "distinct" ? 18 : state.condition === "bull" ? 22 : 12;
  const pressure = Math.max(0, Math.min(100, Math.round(((Number(state.bid || 0) + conditionPenalty) / 180) * 100)));
  const pressureLabel = Number(state.bid || 0) === 0 ? "OUVERTURE" : pressure < 52 ? "CRÉDIBLE" : pressure < 72 ? "TENDU" : pressure < 88 ? "TRÈS RISQUÉ" : "EXTRÊME";
  return <section className={`menteur-table ${state.phase==="challenge"?"is-proof":""}`}>
    <header><div><span>{state.phase==="challenge"?"🔥":"🤥"}</span><div><small>{state.phase==="challenge"?"PHASE DE PREUVE":"TABLE D’ENCHÈRE"}</small><b>{state.phase==="challenge"?`PROUVER ${state.bid} PTS`:(state.bid?`${state.bid} PTS · ${menteurConditionLabel(state.condition)}`:"OUVERTURE")}</b></div></div><em>{state.phase==="challenge" ? (previewContractOk ? "✓ CONTRAT PROUVÉ" : `${dartsCount}/3 DARTS`) : (last ? `par ${last.name}` : "aucune annonce")}</em></header>
    {state.phase === "challenge" ? <div className={`menteur-proof-live${previewContractOk?" is-ok":""}`}>
      <div><small>SCORE À PROUVER</small><b>{previewScore}<em>/{state.bid}</em></b><span>{previewScore >= state.bid ? "✓ score atteint" : `${Math.max(0, state.bid-previewScore)} point(s) manquant(s)`}</span></div>
      <div><small>CONDITION</small><b>{previewConditionOk ? "✓" : "✕"} {menteurConditionLabel(state.condition)}</b><span>{previewConditionOk ? "condition validée" : "condition encore requise"}</span></div>
      <div className="menteur-proof-live__meter"><i style={{width:`${Math.min(100,Number(state.bid||0)?previewScore/Number(state.bid)*100:0)}%`}} /></div>
    </div> : <div className="menteur-pressure">
      <div><small>PRESSION DE L’ANNONCE</small><b>{pressureLabel}</b><span>{pressure}% · {state.bid >= 150 ? "MENTEUR devient une option forte" : state.bid >= 110 ? "évalue la condition avant de surenchérir" : "enchère encore plausible"}</span></div>
      <div className="menteur-pressure__meter"><i style={{width:`${pressure}%`}} /></div>
    </div>}
    <div className="menteur-table__players">{state.players.map((p:any)=>{
      const lives=Number(state.lives[p.id]||0), dead=!!state.eliminated[p.id], active=p.id===state.players[state.activePlayerIndex]?.id, bidder=p.id===state.lastBidderId, color=colorById.get(String(p.id))||ACCENT;
      return <div key={p.id} className={`${active?"is-active ":""}${bidder?"is-bidder ":""}${dead?"is-dead":""}`} style={{["--liar-color" as any]:color}}>
        <strong>{dead?"☠️":active?"🎯":bidder?"📣":"👤"} {p.name}</strong>
        <span>{dead?"ÉLIMINÉ":`${"♥".repeat(Math.max(0,lives))}${"♡".repeat(Math.max(0,Number(state.config.rules.lives||5)-lives))}`}</span>
        <em>{bidder?`BID ${state.bid}`:`max ${state.statsByPlayer[p.id]?.maxBid||0}`}</em>
      </div>;
    })}</div>
  </section>;
}

export default function MenteurPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const awena = useAwenaOptional(); const go = props?.go ?? props?.setTab; const store = props?.store; const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizeMenteurConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const recoveredThrow = resumeRecord?.resume?.currentThrow ?? resumeRecord?.payload?.currentThrow;
  const [state, setState] = React.useState<MenteurState>(() => restored?.mode === "menteur" ? cloneMenteurState(restored) : createMenteurState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>(() => Array.isArray(recoveredThrow) ? recoveredThrow.slice(0, 3) : []);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(() => { const v = resumeRecord?.resume?.multiplier ?? resumeRecord?.payload?.multiplier; return v === 2 || v === 3 ? v : 1; });
  const [undo, setUndo] = React.useState<MenteurState[]>([]); const [notice, setNotice] = React.useState(""); const [moment, setMoment] = React.useState<any>(null); const [progression, setProgression] = React.useState<any>(() => resumeRecord?.summary?.progression || resumeRecord?.payload?.summary?.progression || null); const [customBid, setCustomBid] = React.useState(30);
  const [playersOpen, setPlayersOpen] = React.useState(false), [statsOpen, setStatsOpen] = React.useState(false), [logOpen, setLogOpen] = React.useState(false), [rankingOpen, setRankingOpen] = React.useState(false);
  const botBusy = React.useRef(false), finishedRef = React.useRef(false), introPlayedRef = React.useRef(false), initialCheckpointRef = React.useRef(false), historyHydratedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `menteur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]); const colorById = React.useMemo(() => modePlayerColors(state.players, ACCENT), [state.players]);
  const activePlayer = state.players[state.activePlayerIndex]; const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null; const activeColor = activePlayer ? colorById.get(String(activePlayer.id)) || ACCENT : ACCENT; const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const baseBotBrain = React.useMemo(() => resolvePremiumBotBrain(activeProfile, config.botLevel), [activeProfile?.id, activeProfile?.style, activeProfile?.botLevel, config.botLevel]);
  const careerBotAdaptation = React.useMemo(() => adaptPremiumBotBrainFromScouting("menteur", state, activePlayer, baseBotBrain, botIds), [state, activePlayer?.id, baseBotBrain.key, baseBotBrain.confidence, botIds]);
  const activeBotScouting = careerBotAdaptation.model;
  const rivalryBotAdaptation = React.useMemo(() => adaptPremiumBotBrainFromRivalry("menteur", state, activePlayer, careerBotAdaptation.brain, botIds), [state, activePlayer?.id, careerBotAdaptation.brain.key, careerBotAdaptation.brain.confidence, botIds]);
  const activeBotRivalry = rivalryBotAdaptation.model;
  const activeBotAdaptation = React.useMemo(() => adaptPremiumBotBrain("menteur", state, activePlayer, rivalryBotAdaptation.brain, botIds), [state, activePlayer?.id, rivalryBotAdaptation.brain.key, rivalryBotAdaptation.brain.confidence, botIds]);
  const activeBotBrain = activeBotAdaptation.brain;
  const activeBotMemory = activeBotAdaptation.model;
  const activeBotPlan = React.useMemo(() => premiumBotTacticalPlan("menteur", state, activePlayer, activeBotBrain), [state, activePlayer?.id, activeBotBrain.key, activeBotBrain.confidence, activeBotMemory?.patternKey, activeBotScouting?.patternKey, activeBotRivalry?.state]);
  const sfxEnabled = config.sfxEnabled !== false, awenaEnabled = config.awenaEnabled !== false, coachEnabled = config.coachEnabled !== false; const nameById = React.useCallback((id: any) => state.players.find((p: any) => String(p.id) === String(id))?.name || "Joueur", [state.players]);

  const buildRecord = React.useCallback((s: MenteurState, status: "in_progress" | "finished", draft: UIDart[] = currentThrow, draftMultiplier: 1 | 2 | 3 = multiplier) => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    const perPlayer = Object.fromEntries(Object.entries(s.statsByPlayer).map(([id, st]: any) => [id, { ...st, lives: Number(s.lives[id] || 0), eliminated: !!s.eliminated[id], wins: Number(s.legWins[id] || 0), proofRate: percent(st.contractsProven, st.contractsAttempted) }]));
    const ranking = [...s.players].map((p: any, i: number) => ({ id: p.id, name: p.name, wins: Number(s.legWins[p.id] || 0), lives: Number(s.lives[p.id] || 0), proven: Number(s.statsByPlayer[p.id]?.contractsProven || 0), calls: Number(s.statsByPlayer[p.id]?.successfulCalls || 0), maxBid: Number(s.statsByPlayer[p.id]?.maxBid || 0), eliminated: !!s.eliminated[p.id], order: i })).sort((a, b) => b.wins - a.wins || Number(a.eliminated) - Number(b.eliminated) || b.lives - a.lives || b.calls - a.calls || b.proven - a.proven || b.maxBid - a.maxBid || a.order - b.order);
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current, kind: "menteur", mode: "menteur", sport: "darts", status,
      createdAt: s.startedAt, updatedAt: Date.now(), finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, players: rows,
      game: { mode: "menteur", lives: s.config.rules.lives, seriesWins: s.config.seriesWins },
      summary: { mode: "menteur", finished: status === "finished", winnerId: s.winnerId, legWins: s.legWins, config: s.config, perPlayer, ranking, durationMs: Math.max(0, Number((status === "finished" ? (s.finishedAt || Date.now()) : Date.now())) - Number(s.startedAt || Date.now())), totalDarts: Object.values(s.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0) },
      resume: { mode: "menteur", config: s.config, state: cloneMenteurState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, updatedAt: Date.now() },
      payload: { kind: "menteur", mode: "menteur", sport: "darts", config: s.config, stateSnapshot: cloneMenteurState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, visits: s.visits, visitHistory: s.visits, stats: { mode: "menteur", players: s.statsByPlayer, legWins: s.legWins } },
    };
  }, [profiles, currentThrow, multiplier]);
  const saveInProgress = React.useCallback(async (s: MenteurState, draft: UIDart[] = currentThrow, m: 1 | 2 | 3 = multiplier) => { try { await History.upsert(buildRecord(s, "in_progress", draft, m)); } catch (e) { console.warn("[MENTEUR] checkpoint failed", e); } }, [buildRecord, currentThrow, multiplier]);
  const persist = React.useCallback((s: MenteurState) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      commitPremiumPartyRivalry({
        mode: "menteur",
        matchId: matchIdRef.current,
        winnerId: s.winnerId,
        state: s,
        participants: (s.players || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          isBot: isBotProfile(profileById.get(String(p.id)) || p, botIds),
        })),
        botIds,
      });
      commitPremiumPartyScouting({
        mode: "menteur",
        matchId: matchIdRef.current,
        winnerId: s.winnerId,
        state: s,
        participants: (s.players || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          isBot: isBotProfile(profileById.get(String(p.id)) || p, botIds),
        })),
        botIds,
      });
      const progress = commitPremiumPartyProgress({
        mode: "menteur",
        matchId: matchIdRef.current,
        winnerId: s.winnerId,
        participants: (s.players || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          stats: s.statsByPlayer?.[p.id] || {},
          isBot: isBotProfile(profileById.get(String(p.id)) || p, botIds),
        })),
      });
      setProgression(progress);
      const rec: any = buildRecord(s, "finished", [], 1);
      rec.summary = { ...(rec.summary || {}), progression: progress };
      rec.payload = { ...(rec.payload || {}), summary: { ...(rec.payload?.summary || {}), progression: progress } };
      if (typeof onFinish === "function") onFinish(rec, { navigate: false });
      else void History.upsert(rec).catch(() => {});
    } else void saveInProgress(s, [], 1);
  }, [buildRecord, onFinish, saveInProgress, profileById, botIds]);

  React.useEffect(() => { if (initialCheckpointRef.current) return; initialCheckpointRef.current = true; if (state.phase !== "finished") void saveInProgress(state, currentThrow, multiplier); }, [saveInProgress, state, currentThrow, multiplier]);
  React.useEffect(() => { if (state.phase === "finished") return; const t = window.setTimeout(() => void saveInProgress(state, currentThrow, multiplier), 190); return () => window.clearTimeout(t); }, [state, currentThrow, multiplier, saveInProgress]);
  React.useEffect(() => { if (historyHydratedRef.current) return; const resumeId = String(props?.params?.resumeId || resumeRecord?.id || resumeRecord?.matchId || "").trim(); if (!resumeId) return; let cancelled = false; void History.get(resumeId).then((full: any) => { if (cancelled || !full) return; const r = full?.resume?.state || full?.payload?.stateSnapshot || full?.payload?.state; if (!r || r.mode !== "menteur") return; historyHydratedRef.current = true; matchIdRef.current = String(full.id || full.matchId || resumeId); setState(cloneMenteurState(r)); const d = full?.resume?.currentThrow ?? full?.payload?.currentThrow; setCurrentThrow(Array.isArray(d) ? d.slice(0, 3) : []); const m = full?.resume?.multiplier ?? full?.payload?.multiplier; setMultiplier(m === 2 || m === 3 ? m : 1); setUndo([]); setNotice("Partie MENTEUR reprise depuis l’historique"); initialCheckpointRef.current = true; }).catch(() => {}); return () => { cancelled = true; }; }, [props?.params?.resumeId, resumeRecord]);
  React.useEffect(() => { const flush = () => { if (state.phase !== "finished") void saveInProgress(state, currentThrow, multiplier); }; const vis = () => { if (document.visibilityState === "hidden") flush(); }; window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", vis); return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", vis); }; }, [state, currentThrow, multiplier, saveInProgress]);
  React.useEffect(() => { if (restored?.mode === "menteur" || resumeRecord) return; const start = () => { if (!sfxEnabled || introPlayedRef.current) return; introPlayedRef.current = true; void unlockNewModeAudio(); playNewModeSfx("intro", true); }; try { if ((navigator as any)?.userActivation?.hasBeenActive) { start(); return; } } catch {} window.addEventListener("pointerdown", start, { once: true, capture: true } as any); return () => window.removeEventListener("pointerdown", start, true); }, [sfxEnabled]);
  React.useEffect(() => { awena?.setRuntime?.({ route: "menteur_play", sport: "darts", mode: "menteur", phase: state.phase === "finished" ? "summary" : "play", inGame: state.phase !== "finished", screenLabel: "MENTEUR · Partie", playerName: activePlayer?.name, extra: { bid: state.bid, contract: menteurConditionLabel(state.condition), phase: state.phase, lives: Number(state.lives?.[activePlayer?.id] || 0), lastBidder: state.lastBidderId ? nameById(state.lastBidderId) : null, leg: Number(state.legIndex || 0) + 1, action: Number(state.turnIndex || 0) + 1, awenaRememberedMode: "menteur", awenaKnowledgeTopic: "screen:menteur_play" } }); }, [awena, state.phase, state.legIndex, state.turnIndex, state.bid, state.condition, state.lives, activePlayer?.id, state.lastBidderId, nameById]);

  const commit = React.useCallback((next: MenteurState, previous = state, forcedNotice?: string) => { setUndo((u) => [...u.slice(-39), cloneMenteurState(previous)]); setState(next); setCurrentThrow([]); setMultiplier(1); let message = forcedNotice || ""; if (!message && next.phase === "finished" && next.winnerId) { message = `🏆 ${nameById(next.winnerId)} remporte MENTEUR !`; playNewModeSfx("victory", sfxEnabled); } else if (!message && next.legIndex > previous.legIndex && next.lastLegWinnerId) message = `🤥 ${nameById(next.lastLegWinnerId)} remporte la manche ${previous.legIndex + 1}`; else if (!message) message = lastEvents(next.visits).join(" · "); const momentNext = resolvePremiumPartyMoment("menteur", next, previous, nameById); if (momentNext) setMoment(momentNext); setNotice(message); persist(next); }, [state, nameById, persist, sfxEnabled]);
  const validate = () => { if (!currentThrow.length || state.phase !== "challenge" || activeIsBot) return; commit(playMenteurVisit(state, currentThrow.map(uiToGameDart))); };
  const doUndo = () => setUndo((u) => { if (!u.length) return u; const prev = u[u.length - 1]; setState(cloneMenteurState(prev)); setCurrentThrow([]); setMultiplier(1); setNotice("Dernière action annulée"); setMoment(null); finishedRef.current = false; void saveInProgress(prev, [], 1); return u.slice(0, -1); });
  const handleCancel = () => { if (currentThrow.length) { setCurrentThrow([]); setMultiplier(1); setNotice("Saisie annulée"); } else doUndo(); };
  const raiseTo = (n: number) => commit(raiseMenteurBidTo(state, n)); const call = () => state.lastBidderId && commit(callMenteur(state));
  const setThrowWithSfx = React.useCallback((update: any) => setCurrentThrow((prev: UIDart[]) => { const next = (typeof update === "function" ? update(prev) : update) || prev; const out = Array.isArray(next) ? next.slice(0, 3) : prev; if (out.length > prev.length) out.slice(prev.length).forEach((d: any, i: number) => window.setTimeout(() => playNewModeDartSfx(d, sfxEnabled), i * 120)); return out; }), [sfxEnabled]);
  React.useEffect(() => { if (!activeIsBot || state.phase === "finished" || botBusy.current) return; botBusy.current = true; const t = window.setTimeout(() => { try { if (state.phase === "auction") { const a = pickMenteurBotAction(state, config.botLevel, activeBotBrain); commit(a.type === "liar" ? callMenteur(state) : raiseMenteurBid(state, a.amount)); botBusy.current = false; } else { const darts = pickMenteurBotDarts(state, config.botLevel, activeBotBrain); const span = playNewModeDartSequence(darts, sfxEnabled); window.setTimeout(() => { try { commit(playMenteurVisit(state, darts)); } finally { botBusy.current = false; } }, span + 100); } } catch { botBusy.current = false; } }, 620); return () => window.clearTimeout(t); }, [state, activeIsBot, activePlayer?.id]);

  function replay() { matchIdRef.current = `menteur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; finishedRef.current = false; setUndo([]); setNotice(""); setMoment(null); setCurrentThrow([]); setMultiplier(1); const next = createMenteurState(players, config); setState(next); initialCheckpointRef.current = true; void saveInProgress(next, [], 1); if (sfxEnabled) playNewModeSfx("intro", true); }

  const legTarget = config.seriesWins * 2 - 1, step = config.rules.raiseStep, opening = state.lastBidderId == null, minBid = opening ? 30 : Math.min(180, state.bid + step);
  React.useEffect(() => { setCustomBid(minBid); }, [minBid, state.activePlayerIndex, state.phase]);
  const quickTargets = [minBid, Math.min(180, minBid + step * 2), Math.min(180, minBid + step * 4)].filter((v, i, arr) => arr.indexOf(v) === i);
  const previewDarts = currentThrow.map(uiToGameDart), previewScore = scoreMenteurVisit(previewDarts), previewScoreOk = previewScore >= state.bid, previewConditionOk = isMenteurConditionSatisfied(state.condition, previewDarts), previewContractOk = currentThrow.length ? isMenteurContractSatisfied(state, previewDarts) : false;
  const activeLives = activePlayer ? Number(state.lives[activePlayer.id] || 0) : 0, activeStats = activePlayer ? state.statsByPlayer[activePlayer.id] || {} : {}, coach = coachEnabled && !activeIsBot ? coachText(state, activePlayer) : "";
  const lastBidderName = state.lastBidderId ? nameById(state.lastBidderId) : "—", challengerName = state.challengerId ? nameById(state.challengerId) : "—";
  const rankingRows = React.useMemo(() => [...state.players].map((p: any, i: number) => { const st = state.statsByPlayer[p.id] || {}, color = colorById.get(String(p.id)) || ACCENT, lives = Number(state.lives[p.id] || 0), dead = !!state.eliminated[p.id]; return { id: String(p.id), name: p.name, profile: profileById.get(String(p.id)) || p, color, wins: Number(state.legWins[p.id] || 0), lives, dead, pressure: Number(st.successfulCalls || 0) + Number(st.contractsProven || 0), subtitle: `${dead ? "OUT" : `${lives} ♥`} · ${st.successfulCalls || 0} appels gagnés · ${st.contractsProven || 0} preuves`, value: Number(state.legWins[p.id] || 0), suffix: " M", order: i }; }).sort((a, b) => b.wins - a.wins || Number(a.dead) - Number(b.dead) || b.lives - a.lives || b.pressure - a.pressure || a.order - b.order), [state.players, state.legWins, state.lives, state.eliminated, state.statsByPlayer, profileById, colorById]);
  const playersRows = state.players.map((p: any, i: number) => { const st = state.statsByPlayer[p.id] || {}, color = colorById.get(String(p.id)) || ACCENT, lives = Number(state.lives[p.id] || 0), dead = !!state.eliminated[p.id]; const status = dead ? "ÉLIMINÉ" : state.lastBidderId === p.id ? "DERNIER ANNONCEUR" : state.phase === "challenge" && state.challengerId === p.id ? "CHALLENGER" : i === state.activePlayerIndex ? (state.phase === "auction" ? "À TOI D'ANNONCER" : "DOIT PROUVER") : "EN ATTENTE"; return { id: p.id, name: p.name, profile: profileById.get(String(p.id)) || p, color, active: i === state.activePlayerIndex, status, progress: lives, progressMax: config.rules.lives, metrics: [{ label: "VIES", value: `${lives}/${config.rules.lives}`, color: lives <= 1 ? RED : color }, { label: "BID MAX", value: st.maxBid || 0 }, { label: "APPELS", value: st.successfulCalls || 0 }, { label: "M", value: state.legWins[p.id] || 0 }] }; });
  const statsItems = [
    { label: "ENCHÈRES", value: activeStats.raises || 0 }, { label: "BID MAX", value: activeStats.maxBid || 0 }, { label: "APPELS MENTEUR", value: activeStats.liarCalls || 0, color: RED },
    { label: "APPELS GAGNÉS", value: activeStats.successfulCalls || 0, color: GREEN }, { label: "CONTRATS TENTÉS", value: activeStats.contractsAttempted || 0 }, { label: "CONTRATS PROUVÉS", value: activeStats.contractsProven || 0, color: GREEN },
    { label: "TAUX PREUVE", value: `${percent(activeStats.contractsProven, activeStats.contractsAttempted)}%` }, { label: "MENSONGES DÉMASQUÉS", value: activeStats.liesCaught || 0 }, { label: "MEILLEURE PREUVE", value: activeStats.bestVisit || 0 },
    { label: "SÉRIE PREUVES", value: activeStats.bestProofStreak || 0 }, { label: "S / D / T", value: `${activeStats.singles || 0}/${activeStats.doubles || 0}/${activeStats.triples || 0}` }, { label: "BULL / DBULL", value: `${activeStats.bulls || 0}/${activeStats.dbulls || 0}` },
    { label: "VIES PERDUES", value: activeStats.livesLost || 0, color: RED }, { label: "DARTS PREUVE", value: activeStats.darts || 0 },
  ];
  const awards = React.useMemo(() => { const rows = rankingRows.map((r: any) => ({ ...r, st: state.statsByPlayer[r.id] || {} })); const bluff = bestBy(rows, (r) => Number(r.st.maxBid || 0) + Number(r.st.raises || 0) * .1); const detective = bestBy(rows, (r) => Number(r.st.successfulCalls || 0)); const proof = bestBy(rows, (r) => Number(r.st.contractsProven || 0) * 100 + percent(r.st.contractsProven, r.st.contractsAttempted)); const nerve = bestBy(rows, (r) => Number(r.st.bestProofStreak || 0)); return [{ icon: "🤥", label: "BLUFFEUR", name: bluff?.name || "—", value: `bid ${bluff?.st?.maxBid || 0}`, color: bluff?.color }, { icon: "🕵️", label: "DÉTECTIVE", name: detective?.name || "—", value: `${detective?.st?.successfulCalls || 0} appels gagnés`, color: detective?.color }, { icon: "🎯", label: "PREUVE", name: proof?.name || "—", value: `${proof?.st?.contractsProven || 0} contrats`, color: proof?.color }, { icon: "🔥", label: "SANG-FROID", name: nerve?.name || "—", value: `${nerve?.st?.bestProofStreak || 0} preuves`, color: nerve?.color }]; }, [rankingRows, state.statsByPlayer]);
  const totalDarts = Object.values(state.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0), durationMs = Math.max(0, Number((state.finishedAt || Date.now())) - Number(state.startedAt || Date.now()));

  if (state.phase === "finished") return <div className="party-mode" style={{ ["--mode-accent" as any]: ACCENT }} data-mss-native-play-layout="1"><PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || ACCENT) : activeColor} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} /><PageHeader tickerSrc={tickerMenteur} tickerAlt="MENTEUR" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("menteur_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={awenaEnabled ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="menteur_play" mode="menteur" screenLabel="MENTEUR · Partie" accent={ACCENT} /></div> : null} /><div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}><PremiumEndPanel title="MENTEUR" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} progression={progression ? {...progression, winnerCareer: progression.byPlayer?.[String(state.winnerId || "")] || null} : null} onReplay={replay} onStats={() => go?.("statsHub", { mode: "active", initialStatsSubTab: "menteur", playerId: state.winnerId || state.players[0]?.id, focusMatchId: matchIdRef.current })} onHistory={() => go?.("statsHub", { tab: "history", mode: "active", initialStatsSubTab: "history", focusMatchId: matchIdRef.current })} onConfig={() => go?.("menteur_config")} onGames={() => go?.("games", { gamesView: "all" })} /></div></div>;

  return <div className="party-mode" style={{ ["--mode-accent" as any]: ACCENT }} data-mss-native-play-layout="1"><PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || ACCENT) : activeColor} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} />
    <PageHeader tickerSrc={tickerMenteur} tickerAlt="MENTEUR" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("menteur_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={awenaEnabled ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="menteur_play" mode="menteur" screenLabel="MENTEUR · Partie" accent={ACCENT} /></div> : null} />
    {coach ? <FloatingAdvice text={coach} accent={state.phase === "challenge" ? RED : activeColor} kicker={state.phase === "challenge" ? "CONSEIL PREUVE" : "CONSEIL BLUFF"} /> : null}
    <main className="party-mode__body"><div className="party-mode__stage"><div className="party-mode__left">
      <SummaryStrip players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} winsById={state.legWins} primaryById={(pid: string) => state.eliminated[pid] ? "OUT" : `${state.lives[pid] || 0}♥`} secondaryById={(pid: string) => state.lastBidderId === pid ? `BID ${state.bid}` : `${state.statsByPlayer[pid]?.successfulCalls || 0} appels gagnés · ${state.statsByPlayer[pid]?.contractsProven || 0} preuves`} />
      <ActiveHero profile={activeProfile} name={activePlayer?.name} accent={state.phase === "challenge" ? (previewContractOk ? GREEN : RED) : activeColor} eyebrow={`MANCHE ${state.legIndex + 1} · BO${legTarget} · ${state.phase === "auction" ? "ENCHÈRE" : "PREUVE"}`} primary={state.phase === "auction" ? (state.bid || "—") : previewScore} primarySuffix={state.phase === "auction" ? (state.bid ? " pts" : "") : `/${state.bid}`} secondary={state.phase === "auction" ? (state.bid ? `Dernier annonceur : ${lastBidderName} · ${menteurConditionLabel(state.condition)}` : `Ouvre à ${minBid} points · ${menteurConditionLabel(state.condition)}`) : `${previewContractOk ? "✓ CONTRAT PROUVÉ" : `Doit prouver ${state.bid} points`} · appelé par ${challengerName}`} tertiary={`${activeLives}/${config.rules.lives} vies · bid max ${activeStats.maxBid || 0} · ${activeStats.successfulCalls || 0} appels gagnés`} progress={state.phase === "auction" ? state.bid : previewScore} progressMax={180} notice={notice} noticeTone={notice.includes("🏆") ? "win" : notice.includes("mensonge") || notice.includes("perd 1 vie") ? "danger" : "normal"} aside={<BluffBadge phase={state.phase} bid={state.bid} condition={state.condition} />} />
      <GameplayMission accent={state.phase === "challenge" ? (previewContractOk ? GREEN : RED) : activeColor} icon={state.phase === "challenge" ? "🎯" : "🤥"} title={state.phase === "challenge" ? "PROUVE L’ANNONCE" : "SURENCHÉRIS OU APPELLE MENTEUR"} text={state.phase === "challenge" ? `Tu dois prouver ${state.bid} points et respecter : ${menteurConditionLabel(state.condition)}.` : state.bid ? `Annonce actuelle : ${state.bid} par ${lastBidderName}. Monte l’enchère ou accuse le dernier annonceur.` : `Ouvre l’enchère à partir de ${minBid} points.`} chips={state.phase === "challenge" ? [`SCORE ${previewScore}/${state.bid}`, previewScoreOk ? "SCORE ✓" : "SCORE ○", previewConditionOk ? "CONDITION ✓" : "CONDITION ○"] : [`MIN ${minBid}`, `PAS ${step}`, `${activeLives}/${config.rules.lives} VIES`]} tone={state.phase === "challenge" ? (previewContractOk ? "success" : "danger") : "normal"} />
      <MenteurTableBoard state={state} colorById={colorById} previewScore={previewScore} previewConditionOk={previewConditionOk} previewContractOk={previewContractOk} dartsCount={currentThrow.length} />
      {state.phase === "challenge" ? <section style={{ ...panelStyle(previewContractOk ? `${GREEN}55` : `${RED}33`), padding: 8, display: "grid", gap: 6 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><div style={{ borderRadius: 10, padding: 7, border: `1px solid ${previewScoreOk ? GREEN + "55" : "rgba(255,255,255,.10)"}`, color: previewScoreOk ? GREEN : SOFT, fontSize: 9, fontWeight: 1000, textAlign: "center" }}>{previewScoreOk ? "✓" : "○"} SCORE ≥ {state.bid}</div><div style={{ borderRadius: 10, padding: 7, border: `1px solid ${previewConditionOk ? GREEN + "55" : "rgba(255,255,255,.10)"}`, color: previewConditionOk ? GREEN : SOFT, fontSize: 9, fontWeight: 1000, textAlign: "center" }}>{previewConditionOk ? "✓" : "○"} {menteurConditionLabel(state.condition)}</div></div></section> : null}
      <KpiStrip accent={activeColor} onClick={() => setStatsOpen(true)} items={[["VIES", activeLives], ["BID MAX", activeStats.maxBid || 0], ["APPELS", activeStats.successfulCalls || 0], ["PREUVES", activeStats.contractsProven || 0]]} />
      <QuickRow players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} ticker={tickerMenteur} onPlayers={() => setPlayersOpen(true)} onStats={() => setStatsOpen(true)} onLog={() => setLogOpen(true)} onRanking={() => setRankingOpen(true)} />
    </div><div className="party-mode__input">{state.phase === "challenge" ? (!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={handleCancel} preferredMethod={config.scoreInputMethod} validateLabel={previewContractOk ? "VALIDER LA PREUVE" : "PROUVER L'ANNONCE"} accent={previewContractOk ? GREEN : RED} fitMinScale={0.16} /> : <BotTurn intent={activeBotPlan.intent} objectiveDetail={activeBotPlan.detail} reaction={activeBotPlan.reaction} persona={activeBotPlan.persona} personaIcon={activeBotPlan.personaIcon} confidence={activeBotPlan.confidence} adaptation={activeBotMemory ? `${activeBotMemory.icon} ${activeBotMemory.label}` : undefined} adaptationDetail={activeBotMemory?.detail} learningConfidence={activeBotMemory?.confidence} learningTarget={activeBotMemory?.targetName} rivalry={activeBotRivalry ? `${activeBotRivalry.icon} ${activeBotRivalry.label}` : undefined} rivalryDetail={activeBotRivalry?.detail} rivalryRecord={activeBotRivalry?.record} rivalryMatches={activeBotRivalry?.matches} rivalryConfidence={activeBotRivalry?.confidence} rivalryTension={activeBotRivalry?.tension} rivalryTarget={activeBotRivalry?.targetName} rivalryQuote={activeBotRivalry?.quote} scouting={activeBotScouting ? `${activeBotScouting.icon} ${activeBotScouting.label}` : undefined} scoutingDetail={activeBotScouting?.detail} scoutingMatches={activeBotScouting?.matches} scoutingConfidence={activeBotScouting?.confidence} scoutingTarget={activeBotScouting?.targetName} phaseLabel={state.phase==="challenge"?"PREUVE":"ENCHÈRE"} profile={activeProfile} name={activePlayer?.name} accent={activeColor} text={`tente de prouver ${state.bid} points…`} icon="🎯" />) : activeIsBot ? <BotTurn intent={activeBotPlan.intent} objectiveDetail={activeBotPlan.detail} reaction={activeBotPlan.reaction} persona={activeBotPlan.persona} personaIcon={activeBotPlan.personaIcon} confidence={activeBotPlan.confidence} adaptation={activeBotMemory ? `${activeBotMemory.icon} ${activeBotMemory.label}` : undefined} adaptationDetail={activeBotMemory?.detail} learningConfidence={activeBotMemory?.confidence} learningTarget={activeBotMemory?.targetName} rivalry={activeBotRivalry ? `${activeBotRivalry.icon} ${activeBotRivalry.label}` : undefined} rivalryDetail={activeBotRivalry?.detail} rivalryRecord={activeBotRivalry?.record} rivalryMatches={activeBotRivalry?.matches} rivalryConfidence={activeBotRivalry?.confidence} rivalryTension={activeBotRivalry?.tension} rivalryTarget={activeBotRivalry?.targetName} rivalryQuote={activeBotRivalry?.quote} scouting={activeBotScouting ? `${activeBotScouting.icon} ${activeBotScouting.label}` : undefined} scoutingDetail={activeBotScouting?.detail} scoutingMatches={activeBotScouting?.matches} scoutingConfidence={activeBotScouting?.confidence} scoutingTarget={activeBotScouting?.targetName} phaseLabel={state.phase==="challenge"?"PREUVE":"ENCHÈRE"} profile={activeProfile} name={activePlayer?.name} accent={activeColor} text="analyse l'enchère et le bluff…" icon="🤥" /> : <section style={{ ...panelStyle(`${activeColor}44`), height: "100%", minHeight: 0, display: "grid", alignContent: "center", gap: 10, padding: 12 }}><div style={{ textAlign: "center" }}><div style={{ color: activeColor, fontSize: 10, fontWeight: 1100, letterSpacing: 1 }}>TABLE D'ENCHÈRE</div><div style={{ marginTop: 4, color: "#fff", fontSize: 28, fontWeight: 1100 }}>{state.bid || "—"}<small style={{ fontSize: 11, color: SOFT }}> {state.bid ? "POINTS" : "AUCUNE ANNONCE"}</small></div><div style={{ marginTop: 3, color: BLUE, fontSize: 9.5, fontWeight: 1000 }}>{menteurConditionLabel(state.condition)}</div></div><div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, quickTargets.length)},1fr)`, gap: 6 }}>{quickTargets.map((target: number) => <button key={target} type="button" disabled={state.bid >= 180} onClick={() => raiseTo(target)} style={actionStyle(activeColor, state.bid >= 180)}><span style={{ display: "block", fontSize: 8, color: SOFT }}>{opening ? "ANNONCER" : "SURENCHÉRIR"}</span>{target}</button>)}</div><div style={{ display: "grid", gridTemplateColumns: "auto minmax(64px,1fr) auto", gap: 6 }}><button type="button" onClick={() => setCustomBid((v) => Math.max(minBid, v - step))} disabled={customBid <= minBid} style={actionStyle(activeColor, customBid <= minBid)}>−{step}</button><div style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${activeColor}55`, background: `${activeColor}0d`, display: "grid", placeItems: "center", color: "#fff", fontSize: 18, fontWeight: 1100 }}>{customBid}</div><button type="button" onClick={() => setCustomBid((v) => Math.min(180, v + step))} disabled={customBid >= 180} style={actionStyle(activeColor, customBid >= 180)}>+{step}</button></div><button type="button" onClick={() => raiseTo(customBid)} disabled={state.bid >= 180} style={{ ...actionStyle(GREEN, state.bid >= 180), minHeight: 46 }}>VALIDER L'ANNONCE · {customBid}</button><button type="button" disabled={!state.lastBidderId} onClick={call} style={{ ...actionStyle(RED, !state.lastBidderId), minHeight: 52, fontSize: 15 }}>🤥 MENTEUR !</button><button type="button" disabled={!undo.length} onClick={doUndo} style={actionStyle("#9ea7bb", !undo.length)}>↶ ANNULER LA DERNIÈRE ACTION</button></section>}</div></div></main>
    {playersOpen ? <PlayersModal rows={playersRows} onClose={() => setPlayersOpen(false)} /> : null}
    {statsOpen ? <StatsModal items={statsItems} accent={activeColor} subtitle={activePlayer?.name} onClose={() => setStatsOpen(false)} /> : null}
    {logOpen ? <LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={dartLabel} title="JOURNAL MENTEUR" onClose={() => setLogOpen(false)} /> : null}
    {rankingOpen ? <RankingModal rows={rankingRows} title="CLASSEMENT MENTEUR" onClose={() => setRankingOpen(false)} /> : null}
  </div>;
}
