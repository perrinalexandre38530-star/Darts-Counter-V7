// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import tickerPendu from "../assets/tickers/ticker_pendu.webp";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { playNewModeDartSequence, playNewModeDartSfx, playNewModeSfx, unlockNewModeAudio } from "../lib/newModesArcadeSfx";
import { commitPremiumPartyProgress } from "../lib/premiumPartyProgress";
import { penduPenaltyConstraintDetail, penduPenaltyConstraintLabel, penduPenaltyModeIcon, penduPenaltyModeLabel, penduPenaltyRarityLabel } from "../lib/penduPenaltySystem";
import {
  clonePenduState, createPenduState, getPenduMaxDarts, getPenduPenaltyState, isPenduAttemptSatisfied, normalizePenduConfig,
  penduChallengeDifficulty, penduChallengeIcon, penduChallengeInstruction, penduChallengeLabel,
  pickPenduBotDarts, playPenduVisit, randomPenduChallenge, scorePenduVisit, setPenduChallenge, usePenduSabotage,
  type PenduChallenge, type PenduState,
} from "../lib/gameEngines/penduEngine";
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

const ACCENT = "#ffb33f";
const RED = "#ff6257";
const GOLD = "#ffd66a";
const GREEN = "#72efb1";

function PenduFigure({ errors = 0, max = 6, accent = ACCENT, compact = false }: any) {
  const e = Math.max(0, Math.min(Number(max) || 6, Number(errors) || 0));
  const long = Number(max) >= 8;
  const visible = {
    rope: long ? e >= 1 : true, head: long ? e >= 2 : e >= 1, body: long ? e >= 3 : e >= 2,
    leftArm: long ? e >= 4 : e >= 3, rightArm: long ? e >= 5 : e >= 4,
    leftLeg: long ? e >= 6 : e >= 5, rightLeg: long ? e >= 7 : e >= 6, eyes: long ? e >= 8 : e >= 6,
  };
  const body = e >= max ? RED : accent;
  const size = compact ? 94 : 118;
  return <div style={{ width: size, height: size, borderRadius: compact ? 16 : 20, border: `1px solid ${body}55`, background: "radial-gradient(circle at 50% 38%,rgba(255,179,63,.13),rgba(5,7,12,.95) 68%)", boxShadow: `inset 0 0 28px ${body}10,0 0 18px ${body}18`, display: "grid", placeItems: "center" }}>
    <svg viewBox="0 0 120 120" width={compact ? 82 : 104} height={compact ? 82 : 104} aria-label={`${e} erreurs sur ${max}`}>
      <path d="M18 105H84M29 105V16H78M78 16V29" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {visible.rope ? <path d="M78 29V37" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.head ? <circle cx="78" cy="47" r="10" fill="none" stroke={body} strokeWidth="3.5" /> : null}
      {visible.body ? <path d="M78 57V81" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.leftArm ? <path d="M78 64L64 72" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.rightArm ? <path d="M78 64L92 72" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.leftLeg ? <path d="M78 81L66 96" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.rightLeg ? <path d="M78 81L90 96" fill="none" stroke={body} strokeWidth="3.5" strokeLinecap="round" /> : null}
      {visible.eyes ? <><path d="M72 44l4 4m0-4l-4 4M81 44l4 4m0-4l-4 4" stroke={RED} strokeWidth="2" strokeLinecap="round" /><path d="M73 52q5-4 10 0" fill="none" stroke={RED} strokeWidth="2" /></> : null}
    </svg>
  </div>;
}

function PenduObjectiveCard({ challenge, roundNumber, previewScore, previewOk, dartsCount, accent, executionMode, maxDarts = 3, penalty }: any) {
  const difficulty = penduChallengeDifficulty(challenge);
  const icon = penduChallengeIcon(challenge);
  const label = penduChallengeLabel(challenge, executionMode);
  const instruction = penduChallengeInstruction(challenge, executionMode);
  const isScore = challenge?.kind === "score";
  const progress = isScore ? Math.min(100, Math.round((Number(previewScore || 0) / Math.max(1, Number(challenge?.target || 1))) * 100)) : (previewOk ? 100 : Math.min(82, Number(dartsCount || 0) * 27));
  return <section className={`pendu-objective${previewOk ? " is-success" : ""}`} style={{ ["--pendu-accent" as any]: accent }}>
    <div className="pendu-objective__head"><span>{icon}</span><div><small>RONDE {roundNumber || 1} · OBJECTIF ALÉATOIRE</small><b>{label}</b></div><em>{"★".repeat(difficulty)}{"☆".repeat(3 - difficulty)}</em></div>
    <p>{instruction}</p>
    {penalty?.curse ? <div className={`pendu-objective__curse is-${penalty.curse.rarity || "common"}`}><span>{penalty.curse.icon}</span><div><small>MALÉDICTION ACTIVE · {penduPenaltyRarityLabel(penalty.curse.rarity)}</small><b>{penalty.curse.label}</b><em>{penalty.curse.detail}</em></div></div> : null}
    <div className="pendu-objective__progress"><i style={{ width: `${progress}%`, background: previewOk ? GREEN : accent }} /></div>
    <div className="pendu-objective__foot"><span>{dartsCount ? `${dartsCount}/${maxDarts} FLÉCHETTES` : `${maxDarts} FLÉCHETTE${maxDarts > 1 ? "S" : ""} MAX`}</span><strong style={{ color: previewOk ? GREEN : accent }}>{previewOk ? "✓ OBJECTIF RÉUSSI" : isScore && dartsCount ? `${previewScore}/${challenge.target} PTS` : "À RÉUSSIR"}</strong></div>
  </section>;
}


function PenduPenaltyPanel({ state, activePlayer, activeColor, onSabotage }: any) {
  if (!activePlayer) return null;
  const mode = state.config.rules.penaltyMode;
  const ps = getPenduPenaltyState(state, activePlayer.id);
  const curse = ps.curse;
  const lastEffect = ps.lastDraw || ps.lastBodyEffect;
  const targets = (state.players || []).filter((p: any) => p.id !== activePlayer.id && !state.eliminated[p.id]);
  const canSabotage = (mode === "sabotage" || mode === "chaos") && Number(ps.sabotageTokens || 0) > 0;
  return <section className={`pendu-penalty-panel mode-${mode}`} style={{ ["--pendu-accent" as any]: activeColor }}>
    <header><div><span>{penduPenaltyModeIcon(mode)}</span><div><small>VARIANTE DE PÉNALITÉS</small><b>{penduPenaltyModeLabel(mode)}</b></div></div><em>{Number(ps.sabotageTokens || 0) ? `💣 ×${ps.sabotageTokens}` : ps.shield ? `🛡️ ×${ps.shield}` : ps.joker ? `🎁 ×${ps.joker}` : "SURVIE"}</em></header>
    <div className="pendu-penalty-panel__grid">
      <div className={curse ? "is-active" : ""}><small>PROCHAIN HANDICAP</small><strong>{curse ? penduPenaltyConstraintLabel(ps) : "Aucun"}</strong><span>{curse ? penduPenaltyConstraintDetail(ps) : mode === "classic" ? "Échec = +1 morceau." : "Réussis pour rester intact."}</span></div>
      <div><small>RÉSERVES</small><strong>{ps.shield ? `🛡️ ${ps.shield} bouclier` : ps.joker ? `🎁 ${ps.joker} joker` : "—"}</strong><span>{ps.shield ? "Annule automatiquement la prochaine erreur." : ps.joker ? "Sauve automatiquement d'une erreur fatale." : "Aucun bonus en réserve."}</span></div>
      <div><small>DERNIER EFFET</small><strong>{lastEffect ? `${lastEffect.icon} ${lastEffect.label}` : "—"}</strong><span>{lastEffect ? lastEffect.detail : "Aucun tirage ou morceau spécial."}</span></div>
    </div>
    {canSabotage ? <div className="pendu-sabotage"><div><b>💣 SABOTAGE DISPONIBLE</b><span>Choisis l’adversaire à maudire pour son prochain tour.</span></div><div>{targets.map((p:any)=><button key={p.id} type="button" onClick={()=>onSabotage?.(p.id)}>{p.name}</button>)}</div></div> : null}
  </section>;
}

function coachText(state: PenduState, activePlayer: any) {
  if (!activePlayer) return "";
  const errors = Number(state.errors?.[activePlayer.id] || 0), limit = Number(state.config.rules.partsToLose || 6);
  const danger = errors >= limit - 1;
  const c = state.challenge;
  if (state.phase === "round") {
    const mission = penduChallengeInstruction(c, state.config.rules.executionMode);
    const ps = getPenduPenaltyState(state, activePlayer.id);
    if (danger) return `Dernière chance : ${mission}${ps.curse ? ` Attention : ${penduPenaltyConstraintLabel(ps)}.` : ""} Sinon le pendu est complet.`;
    if (ps.curse) return `${mission} Malédiction : ${penduPenaltyConstraintDetail(ps)}`;
    return `${mission} Réussite = aucune nouvelle partie du pendu.`;
  }
  if (state.phase === "caller") {
    if (danger) return "Tu es à une erreur du PENDU : privilégie un défi que tu maîtrises vraiment.";
    return `Tu dois d'abord réussir ${penduChallengeLabel(c, state.config.rules.executionMode)} pour l'imposer aux autres.`;
  }
  if (danger) return `Dernière chance : reproduis ${penduChallengeLabel(c, state.config.rules.executionMode)} ou tu es éliminé.`;
  return `Copie le défi du bourreau : ${penduChallengeLabel(c, state.config.rules.executionMode)}.`;
}

export default function PenduPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const awena = useAwenaOptional();
  const go = props?.go ?? props?.setTab; const store = props?.store; const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizePenduConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const recoveredThrow = resumeRecord?.resume?.currentThrow ?? resumeRecord?.payload?.currentThrow;
  const [state, setState] = React.useState<PenduState>(() => restored?.mode === "pendu" ? clonePenduState(restored) : createPenduState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>(() => Array.isArray(recoveredThrow) ? recoveredThrow.slice(0, 3) : []);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(() => { const v = resumeRecord?.resume?.multiplier ?? resumeRecord?.payload?.multiplier; return v === 2 || v === 3 ? v : 1; });
  const [undo, setUndo] = React.useState<PenduState[]>([]); const [notice, setNotice] = React.useState(""); const [moment, setMoment] = React.useState<any>(null); const [progression, setProgression] = React.useState<any>(() => resumeRecord?.summary?.progression || resumeRecord?.payload?.summary?.progression || null);
  const [playersOpen, setPlayersOpen] = React.useState(false), [statsOpen, setStatsOpen] = React.useState(false), [logOpen, setLogOpen] = React.useState(false), [rankingOpen, setRankingOpen] = React.useState(false);
  const botBusy = React.useRef(false), finishedRef = React.useRef(false), introPlayedRef = React.useRef(false), initialCheckpointRef = React.useRef(false), historyHydratedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `pendu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const colorById = React.useMemo(() => modePlayerColors(state.players, ACCENT), [state.players]);
  const activePlayer = state.players[state.activePlayerIndex]; const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeColor = activePlayer ? colorById.get(String(activePlayer.id)) || ACCENT : ACCENT;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const activePenalty = activePlayer ? getPenduPenaltyState(state, activePlayer.id) : null;
  const activeMaxDarts = activePlayer ? getPenduMaxDarts(state, activePlayer.id) : 3;
  const baseBotBrain = React.useMemo(() => resolvePremiumBotBrain(activeProfile, config.botLevel), [activeProfile?.id, activeProfile?.style, activeProfile?.botLevel, config.botLevel]);
  const careerBotAdaptation = React.useMemo(() => adaptPremiumBotBrainFromScouting("pendu", state, activePlayer, baseBotBrain, botIds), [state, activePlayer?.id, baseBotBrain.key, baseBotBrain.confidence, botIds]);
  const activeBotScouting = careerBotAdaptation.model;
  const rivalryBotAdaptation = React.useMemo(() => adaptPremiumBotBrainFromRivalry("pendu", state, activePlayer, careerBotAdaptation.brain, botIds), [state, activePlayer?.id, careerBotAdaptation.brain.key, careerBotAdaptation.brain.confidence, botIds]);
  const activeBotRivalry = rivalryBotAdaptation.model;
  const activeBotAdaptation = React.useMemo(() => adaptPremiumBotBrain("pendu", state, activePlayer, rivalryBotAdaptation.brain, botIds), [state, activePlayer?.id, rivalryBotAdaptation.brain.key, rivalryBotAdaptation.brain.confidence, botIds]);
  const activeBotBrain = activeBotAdaptation.brain;
  const activeBotMemory = activeBotAdaptation.model;
  const activeBotPlan = React.useMemo(() => premiumBotTacticalPlan("pendu", state, activePlayer, activeBotBrain), [state, activePlayer?.id, activeBotBrain.key, activeBotBrain.confidence, activeBotMemory?.patternKey, activeBotScouting?.patternKey, activeBotRivalry?.state]);
  const sfxEnabled = config.sfxEnabled !== false, awenaEnabled = config.awenaEnabled !== false, coachEnabled = config.coachEnabled !== false;
  const nameById = React.useCallback((id: any) => state.players.find((p: any) => String(p.id) === String(id))?.name || "Joueur", [state.players]);

  const buildRecord = React.useCallback((s: PenduState, status: "in_progress" | "finished", draft: UIDart[] = currentThrow, draftMultiplier: 1 | 2 | 3 = multiplier) => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    const perPlayer = Object.fromEntries(Object.entries(s.statsByPlayer).map(([id, st]: any) => [id, { ...st, errors: Number(s.errors[id] || 0), eliminated: !!s.eliminated[id], wins: Number(s.legWins[id] || 0), successRate: percent(st.challengesPassed, st.visits), penalty: getPenduPenaltyState(s, id) }]));
    const ranking = [...s.players].map((p: any, i: number) => ({ id: p.id, name: p.name, wins: Number(s.legWins[p.id] || 0), errors: Number(s.errors[p.id] || 0), passed: Number(s.statsByPlayer[p.id]?.challengesPassed || 0), streak: Number(s.statsByPlayer[p.id]?.bestSuccessStreak || 0), eliminated: !!s.eliminated[p.id], order: i })).sort((a, b) => b.wins - a.wins || Number(a.eliminated) - Number(b.eliminated) || a.errors - b.errors || b.passed - a.passed || b.streak - a.streak || a.order - b.order);
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current, kind: "pendu", mode: "pendu", sport: "darts", status,
      createdAt: s.startedAt, updatedAt: Date.now(), finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, players: rows,
      game: { mode: "pendu", partsToLose: s.config.rules.partsToLose, penaltyMode: s.config.rules.penaltyMode, seriesWins: s.config.seriesWins },
      summary: { mode: "pendu", finished: status === "finished", winnerId: s.winnerId, legWins: s.legWins, config: s.config, perPlayer, ranking, durationMs: Math.max(0, Number((status === "finished" ? (s.finishedAt || Date.now()) : Date.now())) - Number(s.startedAt || Date.now())), totalDarts: Object.values(s.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0) },
      resume: { mode: "pendu", config: s.config, state: clonePenduState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, updatedAt: Date.now() },
      payload: { kind: "pendu", mode: "pendu", sport: "darts", config: s.config, stateSnapshot: clonePenduState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, visits: s.visits, visitHistory: s.visits, stats: { mode: "pendu", players: s.statsByPlayer, legWins: s.legWins } },
    };
  }, [profiles, currentThrow, multiplier]);
  const saveInProgress = React.useCallback(async (s: PenduState, draft: UIDart[] = currentThrow, m: 1 | 2 | 3 = multiplier) => { try { await History.upsert(buildRecord(s, "in_progress", draft, m)); } catch (e) { console.warn("[PENDU] checkpoint failed", e); } }, [buildRecord, currentThrow, multiplier]);
  const persist = React.useCallback((s: PenduState) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      commitPremiumPartyRivalry({
        mode: "pendu",
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
        mode: "pendu",
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
        mode: "pendu",
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
  React.useEffect(() => { if (historyHydratedRef.current) return; const resumeId = String(props?.params?.resumeId || resumeRecord?.id || resumeRecord?.matchId || "").trim(); if (!resumeId) return; let cancelled = false; void History.get(resumeId).then((full: any) => { if (cancelled || !full) return; const r = full?.resume?.state || full?.payload?.stateSnapshot || full?.payload?.state; if (!r || r.mode !== "pendu") return; historyHydratedRef.current = true; matchIdRef.current = String(full.id || full.matchId || resumeId); setState(clonePenduState(r)); const d = full?.resume?.currentThrow ?? full?.payload?.currentThrow; setCurrentThrow(Array.isArray(d) ? d.slice(0, 3) : []); const m = full?.resume?.multiplier ?? full?.payload?.multiplier; setMultiplier(m === 2 || m === 3 ? m : 1); setUndo([]); setNotice("Partie PENDU reprise depuis l’historique"); initialCheckpointRef.current = true; }).catch(() => {}); return () => { cancelled = true; }; }, [props?.params?.resumeId, resumeRecord]);
  React.useEffect(() => { const flush = () => { if (state.phase !== "finished") void saveInProgress(state, currentThrow, multiplier); }; const vis = () => { if (document.visibilityState === "hidden") flush(); }; window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", vis); return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", vis); }; }, [state, currentThrow, multiplier, saveInProgress]);
  React.useEffect(() => { if (restored?.mode === "pendu" || resumeRecord) return; const start = () => { if (!sfxEnabled || introPlayedRef.current) return; introPlayedRef.current = true; void unlockNewModeAudio(); playNewModeSfx("intro", true); }; try { if ((navigator as any)?.userActivation?.hasBeenActive) { start(); return; } } catch {} window.addEventListener("pointerdown", start, { once: true, capture: true } as any); return () => window.removeEventListener("pointerdown", start, true); }, [sfxEnabled]);
  React.useEffect(() => { awena?.setRuntime?.({ route: "pendu_play", sport: "darts", mode: "pendu", phase: state.phase === "finished" ? "summary" : "play", inGame: state.phase !== "finished", screenLabel: "PENDU · Partie", playerName: activePlayer?.name, extra: { challenge: penduChallengeLabel(state.challenge, state.config.rules.executionMode), role: state.phase, errors: Number(state.errors?.[activePlayer?.id] || 0), errorLimit: state.config.rules.partsToLose, leg: Number(state.legIndex || 0) + 1, visit: Number(state.turnIndex || 0) + 1, awenaRememberedMode: "pendu", awenaKnowledgeTopic: "screen:pendu_play", penaltyMode: state.config.rules.penaltyMode, activeCurse: activePlayer ? getPenduPenaltyState(state, activePlayer.id)?.curse?.label || null : null } }); }, [awena, state.phase, state.legIndex, state.turnIndex, state.challenge, state.errors, activePlayer?.id]);

  const commit = React.useCallback((next: PenduState, previous = state, forcedNotice?: string) => {
    setUndo((u) => [...u.slice(-39), clonePenduState(previous)]); setState(next); setCurrentThrow([]); setMultiplier(1);
    let message = forcedNotice || "";
    if (!message && next.phase === "finished" && next.winnerId) { message = `🏆 ${nameById(next.winnerId)} remporte PENDU !`; playNewModeSfx("victory", sfxEnabled); }
    else if (!message && next.legIndex > previous.legIndex && next.lastLegWinnerId) message = `🎯 ${nameById(next.lastLegWinnerId)} remporte la manche ${previous.legIndex + 1}`;
    else if (!message && next.phase === "round" && previous.phase === "round" && Number(next.roundNumber || 0) > Number(previous.roundNumber || 0)) message = `🎲 RONDE ${next.roundNumber} · ${penduChallengeLabel(next.challenge, next.config.rules.executionMode)}`;
    else if (!message) message = lastEvents(next.visits).join(" · ");
    const momentNext = resolvePremiumPartyMoment("pendu", next, previous, nameById); if (momentNext) setMoment(momentNext); setNotice(message); persist(next);
  }, [state, nameById, persist, sfxEnabled]);
  const validate = () => { if (!currentThrow.length || state.phase === "finished" || activeIsBot) return; commit(playPenduVisit(state, currentThrow.map(uiToGameDart))); };
  const doUndo = () => setUndo((u) => { if (!u.length) return u; const prev = u[u.length - 1]; setState(clonePenduState(prev)); setCurrentThrow([]); setMultiplier(1); setNotice("Dernière action annulée"); setMoment(null); finishedRef.current = false; void saveInProgress(prev, [], 1); return u.slice(0, -1); });
  const handleCancel = () => { if (currentThrow.length) { setCurrentThrow([]); setMultiplier(1); setNotice("Saisie annulée"); } else doUndo(); };
  const applyChallenge = (c: PenduChallenge) => { const next = setPenduChallenge(state, c); setState(next); setNotice(`Défi réglé sur ${penduChallengeLabel(c, config.rules.executionMode)}`); void saveInProgress(next, currentThrow, multiplier); };
  const sabotage = (targetId: string) => {
    if (!activePlayer || currentThrow.length) return;
    const before = clonePenduState(state);
    const next = usePenduSabotage(state, activePlayer.id, targetId);
    if (JSON.stringify(next.penaltiesByPlayer) === JSON.stringify(state.penaltiesByPlayer)) return;
    setUndo((u) => [...u.slice(-39), before]);
    setState(next);
    const target = next.players.find((p:any)=>p.id===targetId);
    const curse = getPenduPenaltyState(next, targetId)?.curse;
    setNotice(`💣 ${target?.name || "Adversaire"} : ${curse?.label || "SABOTÉ"}`);
    playNewModeSfx("hit", sfxEnabled);
    void saveInProgress(next, currentThrow, multiplier);
  };
  const setThrowWithSfx = React.useCallback((update: any) => setCurrentThrow((prev: UIDart[]) => { const next = (typeof update === "function" ? update(prev) : update) || prev; const out = Array.isArray(next) ? next.slice(0, activeMaxDarts) : prev; if (out.length > prev.length) out.slice(prev.length).forEach((d: any, i: number) => window.setTimeout(() => playNewModeDartSfx(d, sfxEnabled), i * 120)); return out; }), [sfxEnabled, activeMaxDarts]);
  React.useEffect(() => { if (!activeIsBot || state.phase === "finished" || botBusy.current) return; botBusy.current = true; const t = window.setTimeout(() => { try {
    const botPenalty = activePlayer ? getPenduPenaltyState(state, activePlayer.id) : null;
    const targets = state.players.filter((p:any)=>p.id!==activePlayer?.id && !state.eliminated[p.id]).sort((a:any,b:any)=>Number(state.errors[b.id]||0)-Number(state.errors[a.id]||0));
    if (botPenalty && botPenalty.sabotageTokens > 0 && targets.length && (config.rules.penaltyMode === "sabotage" || config.rules.penaltyMode === "chaos")) {
      const sabotaged = usePenduSabotage(state, activePlayer.id, targets[0].id);
      setState(sabotaged); setNotice(`💣 ${activePlayer.name} sabote ${targets[0].name}`); void saveInProgress(sabotaged, [], 1); botBusy.current = false; return;
    }
    const darts = pickPenduBotDarts(state, config.botLevel, activeBotBrain); const span = playNewModeDartSequence(darts, sfxEnabled); window.setTimeout(() => { try { commit(playPenduVisit(state, darts)); } finally { botBusy.current = false; } }, span + 100);
  } catch { botBusy.current = false; } }, 620); return () => window.clearTimeout(t); }, [state, activeIsBot, activePlayer?.id]);

  function replay() { matchIdRef.current = `pendu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; finishedRef.current = false; setUndo([]); setNotice(""); setMoment(null); setCurrentThrow([]); setMultiplier(1); const next = createPenduState(players, config); setState(next); initialCheckpointRef.current = true; void saveInProgress(next, [], 1); if (sfxEnabled) playNewModeSfx("intro", true); }

  const challenge = state.challenge; const legTarget = config.seriesWins * 2 - 1; const activeErrors = activePlayer ? Number(state.errors[activePlayer.id] || 0) : 0;
  const randomRounds = state.phase === "round" || config.rules.challengeMode !== "caller";
  const editable = state.phase === "caller" && !activeIsBot && !currentThrow.length && config.rules.challengeMode === "caller";
  const previewDarts = currentThrow.map(uiToGameDart), previewScore = scorePenduVisit(previewDarts), previewOk = currentThrow.length && activePlayer ? isPenduAttemptSatisfied(state, activePlayer.id, previewDarts) : false;
  const activeStats = activePlayer ? state.statsByPlayer[activePlayer.id] || {} : {};
  const coach = coachEnabled && !activeIsBot ? coachText(state, activePlayer) : "";
  const rankingRows = React.useMemo(() => [...state.players].map((p: any, i: number) => { const st = state.statsByPlayer[p.id] || {}, color = colorById.get(String(p.id)) || ACCENT, errors = Number(state.errors[p.id] || 0), dead = !!state.eliminated[p.id]; return { id: String(p.id), name: p.name, profile: profileById.get(String(p.id)) || p, color, wins: Number(state.legWins[p.id] || 0), errors, dead, passed: Number(st.challengesPassed || 0), subtitle: `${dead ? "PENDU" : `${errors}/${config.rules.partsToLose} erreurs`} · ${st.challengesPassed || 0} défis`, value: Number(state.legWins[p.id] || 0), suffix: " M", order: i }; }).sort((a, b) => b.wins - a.wins || Number(a.dead) - Number(b.dead) || a.errors - b.errors || b.passed - a.passed || a.order - b.order), [state.players, state.legWins, state.errors, state.eliminated, state.statsByPlayer, profileById, colorById]);
  const playersRows = state.players.map((p: any, i: number) => { const st = state.statsByPlayer[p.id] || {}, color = colorById.get(String(p.id)) || ACCENT, err = Number(state.errors[p.id] || 0), dead = !!state.eliminated[p.id]; const role = dead ? "PENDU · ÉLIMINÉ" : state.phase === "round" ? (state.activePlayerIndex === i ? `RONDE ${state.roundNumber} · À TOI` : `RONDE ${state.roundNumber} · EN ATTENTE`) : state.callerPlayerIndex === i ? "BOURREAU" : state.phase === "copy" && state.activePlayerIndex === i ? "COPIE LE DÉFI" : "EN ATTENTE"; return { id: p.id, name: p.name, profile: profileById.get(String(p.id)) || p, color, active: i === state.activePlayerIndex, status: role, progress: err, progressMax: config.rules.partsToLose, metrics: [{ label: "ERREURS", value: `${err}/${config.rules.partsToLose}`, color: err >= config.rules.partsToLose - 1 ? RED : color }, { label: "RÉUSSIS", value: st.challengesPassed || 0 }, { label: "SÉRIE", value: st.bestSuccessStreak || 0 }, { label: "M", value: state.legWins[p.id] || 0 }] }; });
  const statsItems = [
    { label: "OBJECTIFS RÉUSSIS", value: activeStats.challengesPassed || 0, color: GREEN }, { label: "OBJECTIFS RATÉS", value: activeStats.challengesFailed || 0, color: RED },
    { label: "TAUX RÉUSSITE", value: `${percent(activeStats.challengesPassed, activeStats.visits)}%` }, { label: "ERREURS", value: activeStats.errorsTaken || 0, color: RED },
    { label: "RONDES SURVÉCUES", value: `${activeStats.roundsSurvived || 0}/${activeStats.roundsPlayed || 0}` }, { label: "MEILLEURE SÉRIE", value: activeStats.bestSuccessStreak || 0 },
    { label: "BEST VISIT", value: activeStats.bestVisit || 0 }, { label: "S / D / T", value: `${activeStats.singles || 0}/${activeStats.doubles || 0}/${activeStats.triples || 0}` },
    { label: "BULL / DBULL", value: `${activeStats.bulls || 0}/${activeStats.dbulls || 0}` }, { label: "MISS", value: activeStats.misses || 0 }, { label: "DARTS", value: activeStats.darts || 0 },
  ];
  const awards = React.useMemo(() => { const rows = rankingRows.map((r: any) => ({ ...r, st: state.statsByPlayer[r.id] || {} })); const objectives = bestBy(rows, (r) => Number(r.st.challengesPassed || 0)); const survival = bestBy(rows, (r) => Number(r.st.roundsSurvived || 0)); const streak = bestBy(rows, (r) => Number(r.st.bestSuccessStreak || 0)); const survivor = bestBy(rows, (r) => -Number(r.st.errorsTaken || 0)); return [{ icon: "🎯", label: "OBJECTIFS", name: objectives?.name || "—", value: `${objectives?.st?.challengesPassed || 0} réussis`, color: objectives?.color }, { icon: "🪢", label: "SURVIE", name: survival?.name || "—", value: `${survival?.st?.roundsSurvived || 0} rondes`, color: survival?.color }, { icon: "🔥", label: "SÉRIE", name: streak?.name || "—", value: `${streak?.st?.bestSuccessStreak || 0} réussites`, color: streak?.color }, { icon: "🛡️", label: "SANG-FROID", name: survivor?.name || "—", value: `${survivor?.st?.errorsTaken || 0} erreurs`, color: survivor?.color }]; }, [rankingRows, state.statsByPlayer]);
  const totalDarts = Object.values(state.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0), durationMs = Math.max(0, Number((state.finishedAt || Date.now())) - Number(state.startedAt || Date.now()));

  if (state.phase === "finished") return <div className="party-mode" style={{ ["--mode-accent" as any]: ACCENT }} data-mss-native-play-layout="1"><PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || ACCENT) : activeColor} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} /><PageHeader tickerSrc={tickerPendu} tickerAlt="PENDU" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("pendu_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={awenaEnabled ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="pendu_play" mode="pendu" screenLabel="PENDU · Partie" accent={ACCENT} /></div> : null} /><div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}><PremiumEndPanel title="PENDU" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} progression={progression ? {...progression, winnerCareer: progression.byPlayer?.[String(state.winnerId || "")] || null} : null} onReplay={replay} onStats={() => go?.("statsHub", { mode: "active", initialStatsSubTab: "pendu", playerId: state.winnerId || state.players[0]?.id, focusMatchId: matchIdRef.current })} onHistory={() => go?.("statsHub", { tab: "history", mode: "active", initialStatsSubTab: "history", focusMatchId: matchIdRef.current })} onConfig={() => go?.("pendu_config")} onGames={() => go?.("games", { gamesView: "all" })} /></div></div>;

  return <div className="party-mode" style={{ ["--mode-accent" as any]: ACCENT }} data-mss-native-play-layout="1"><PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || ACCENT) : activeColor} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} />
    <PageHeader tickerSrc={tickerPendu} tickerAlt="PENDU" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("pendu_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={awenaEnabled ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="pendu_play" mode="pendu" screenLabel="PENDU · Partie" accent={ACCENT} /></div> : null} />
    {coach ? <FloatingAdvice text={coach} accent={activeErrors >= config.rules.partsToLose - 1 ? RED : activeColor} kicker={state.phase === "round" ? "CONSEIL OBJECTIF" : state.phase === "caller" ? "CONSEIL BOURREAU" : "CONSEIL COPIE"} /> : null}
    <main className="party-mode__body"><div className="party-mode__stage"><div className="party-mode__left">
      <SummaryStrip players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} winsById={state.legWins} primaryById={(pid: string) => state.eliminated[pid] ? "☠" : `${state.errors[pid] || 0}/${config.rules.partsToLose}`} secondaryById={(pid: string) => state.eliminated[pid] ? "PENDU" : state.phase === "round" ? `${state.statsByPlayer[pid]?.challengesPassed || 0} objectifs réussis` : state.players[state.callerPlayerIndex]?.id === pid ? "Bourreau" : `${state.statsByPlayer[pid]?.challengesPassed || 0} défis réussis`} />
      <ActiveHero profile={activeProfile} name={activePlayer?.name} accent={activeErrors >= config.rules.partsToLose - 1 ? RED : activeColor} eyebrow={`MANCHE ${state.legIndex + 1} · BO${legTarget} · ${state.phase === "round" ? `RONDE ${state.roundNumber} · ${Math.min(state.copyIndex + 1, Math.max(1, state.copyQueue.length))}/${Math.max(1, state.copyQueue.length)}` : state.phase === "caller" ? "BOURREAU" : `COPIE ${Math.min(state.copyIndex + 1, Math.max(1, state.copyQueue.length))}/${Math.max(1, state.copyQueue.length)}`}`} primary={state.phase === "round" ? activeErrors : penduChallengeLabel(challenge, config.rules.executionMode)} primarySuffix={state.phase === "round" ? `/${config.rules.partsToLose} ERREURS` : ""} secondary={state.phase === "round" ? (currentThrow.length ? `${previewOk ? "✓ OBJECTIF RÉUSSI" : "TENTATIVE EN COURS"} · ${currentThrow.length}/${activeMaxDarts} darts` : config.rules.penaltyMode === "classic" ? "Chaque échec dessine une nouvelle partie du pendu" : `${penduPenaltyModeIcon(config.rules.penaltyMode)} ${penduPenaltyModeLabel(config.rules.penaltyMode)} · les erreurs ont des conséquences`) : currentThrow.length ? `${previewOk ? "✓ DÉFI VALIDÉ" : "VOLÉE EN COURS"} · ${previewScore} pts · ${currentThrow.length}/3 darts` : (state.phase === "caller" ? "Réussis ton propre défi pour l'imposer aux autres" : "Reproduis exactement le défi du bourreau")} tertiary={`${activeStats.challengesPassed || 0} objectifs réussis · série ${activeStats.bestSuccessStreak || 0} · ${activeStats.roundsSurvived || 0} rondes survécues`} progress={activeErrors} progressMax={config.rules.partsToLose} notice={notice} noticeTone={notice.includes("🏆") ? "win" : notice.includes("PENDU") || notice.includes("rate") ? "danger" : "normal"} aside={<PenduFigure errors={activeErrors} max={config.rules.partsToLose} accent={activeColor} compact />} />
      <GameplayMission accent={previewOk ? GREEN : activeErrors >= config.rules.partsToLose - 1 ? RED : activeColor} icon="🎯" title={state.phase === "round" ? `RÉUSSIS L’OBJECTIF EN ${activeMaxDarts} DART${activeMaxDarts > 1 ? "S" : ""} MAX` : state.phase === "caller" ? "CRÉE ET RÉUSSIS TON DÉFI" : "REPRODUIS LE DÉFI DU BOURREAU"} text={state.phase === "round" ? (activePenalty?.curse ? `${penduPenaltyConstraintLabel(activePenalty)} · ${penduPenaltyConstraintDetail(activePenalty)}` : config.rules.penaltyMode === "classic" ? "Réussite : intact. Échec : +1 morceau." : "Réussis pour rester intact ; les pénalités peuvent modifier ton prochain tour.") : `Tu as jusqu’à ${activeMaxDarts} fléchette${activeMaxDarts > 1 ? "s" : ""} pour réussir.`} chips={state.phase === "round" ? [`RONDE ${state.roundNumber}`, `${activeErrors}/${config.rules.partsToLose} ERREURS`, previewOk ? "SAUVÉ ✓" : `${activeMaxDarts} DART${activeMaxDarts > 1 ? "S" : ""} MAX`, `${penduPenaltyModeIcon(config.rules.penaltyMode)} ${penduPenaltyModeLabel(config.rules.penaltyMode)}`] : [penduChallengeLabel(challenge, config.rules.executionMode), `${activeErrors}/${config.rules.partsToLose} ERREURS`]} tone={previewOk ? "success" : activeErrors >= config.rules.partsToLose - 1 ? "danger" : "normal"} />
      {state.phase === "round" ? <PenduObjectiveCard challenge={challenge} roundNumber={state.roundNumber} previewScore={previewScore} previewOk={previewOk} dartsCount={currentThrow.length} accent={activeColor} executionMode={config.rules.executionMode} maxDarts={activeMaxDarts} penalty={activePenalty} /> : null}
      <PenduPenaltyPanel state={state} activePlayer={activePlayer} activeColor={activeColor} onSabotage={sabotage} />
      {editable ? <section style={{ ...panelStyle(`${activeColor}44`), padding: 8, display: "grid", gap: 6 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><b style={{ color: activeColor, fontSize: 10 }}>RÉGLER LE DÉFI</b><span style={{ color: SOFT, fontSize: 8.5 }}>avant la 1re fléchette</span></div><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{config.rules.targetFamily === "mixed" ? <button type="button" style={actionStyle(activeColor)} onClick={() => applyChallenge(challenge.kind === "score" ? { kind: "segment", number: 20, bed: "S" } : { kind: "score", target: 50 })}>{challenge.kind === "score" ? "SEGMENT" : "SCORE"}</button> : null}{challenge.kind === "segment" ? <><button type="button" style={actionStyle(activeColor)} onClick={() => applyChallenge({ ...challenge, number: ((challenge.number + 18) % 20) + 1 })}>−</button>{(["S", "D", "T"] as const).map((b) => <button key={b} type="button" style={{ ...actionStyle(activeColor), background: challenge.bed === b ? `${activeColor}35` : `${activeColor}18` }} onClick={() => applyChallenge({ ...challenge, bed: b })}>{b}</button>)}<button type="button" style={actionStyle(activeColor)} onClick={() => applyChallenge({ ...challenge, number: (challenge.number % 20) + 1 })}>+</button></> : <><button type="button" style={actionStyle(activeColor)} onClick={() => applyChallenge({ ...challenge, target: Math.max(10, challenge.target - 10) })}>−10</button><button type="button" style={actionStyle(activeColor)} onClick={() => applyChallenge({ ...challenge, target: Math.min(170, challenge.target + 10) })}>+10</button></>}<button type="button" style={{ ...actionStyle(GOLD), marginLeft: "auto" }} onClick={() => applyChallenge(randomPenduChallenge(config))}>🎲</button></div></section> : null}
      <KpiStrip accent={activeColor} onClick={() => setStatsOpen(true)} items={[["RÉUSSIS", activeStats.challengesPassed || 0], ["ERREURS", activeErrors], ["TAUX", `${percent(activeStats.challengesPassed, activeStats.visits)}%`], ["SÉRIE", activeStats.bestSuccessStreak || 0]]} />
      <QuickRow players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} ticker={tickerPendu} onPlayers={() => setPlayersOpen(true)} onStats={() => setStatsOpen(true)} onLog={() => setLogOpen(true)} onRanking={() => setRankingOpen(true)} />
    </div><div className="party-mode__input">{!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={handleCancel} preferredMethod={config.scoreInputMethod} validateLabel={previewOk ? "OBJECTIF RÉUSSI ✓" : state.phase === "round" ? "VALIDER LA TENTATIVE" : state.phase === "caller" ? "TENTER LE DÉFI" : "REPRODUIRE"} accent={previewOk ? GREEN : activeErrors >= config.rules.partsToLose - 1 ? RED : activeColor} fitMinScale={0.16} maxDarts={activeMaxDarts} /> : <BotTurn intent={activeBotPlan.intent} objectiveDetail={activeBotPlan.detail} reaction={activeBotPlan.reaction} persona={activeBotPlan.persona} personaIcon={activeBotPlan.personaIcon} confidence={activeBotPlan.confidence} adaptation={activeBotMemory ? `${activeBotMemory.icon} ${activeBotMemory.label}` : undefined} adaptationDetail={activeBotMemory?.detail} learningConfidence={activeBotMemory?.confidence} learningTarget={activeBotMemory?.targetName} rivalry={activeBotRivalry ? `${activeBotRivalry.icon} ${activeBotRivalry.label}` : undefined} rivalryDetail={activeBotRivalry?.detail} rivalryRecord={activeBotRivalry?.record} rivalryMatches={activeBotRivalry?.matches} rivalryConfidence={activeBotRivalry?.confidence} rivalryTension={activeBotRivalry?.tension} rivalryTarget={activeBotRivalry?.targetName} rivalryQuote={activeBotRivalry?.quote} scouting={activeBotScouting ? `${activeBotScouting.icon} ${activeBotScouting.label}` : undefined} scoutingDetail={activeBotScouting?.detail} scoutingMatches={activeBotScouting?.matches} scoutingConfidence={activeBotScouting?.confidence} scoutingTarget={activeBotScouting?.targetName} phaseLabel={state.phase==="round"?`RONDE ${state.roundNumber}`:state.phase==="caller"?"MENEUR":"COPIE"} profile={activeProfile} name={activePlayer?.name} accent={activeColor} text={state.phase === "round" ? "tente de survivre à l’objectif aléatoire…" : state.phase === "caller" ? "prépare et tente son défi…" : "tente de reproduire le défi…"} icon="🪢" />}</div></div></main>
    {playersOpen ? <PlayersModal rows={playersRows} onClose={() => setPlayersOpen(false)} /> : null}
    {statsOpen ? <StatsModal items={statsItems} accent={activeColor} subtitle={activePlayer?.name} onClose={() => setStatsOpen(false)} /> : null}
    {logOpen ? <LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={dartLabel} title="JOURNAL PENDU" onClose={() => setLogOpen(false)} /> : null}
    {rankingOpen ? <RankingModal rows={rankingRows} title="CLASSEMENT PENDU" onClose={() => setRankingOpen(false)} /> : null}
  </div>;
}
