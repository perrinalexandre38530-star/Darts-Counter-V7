// @ts-nocheck
// =============================================================
// DARTS FOOTBALL — match compact, lisible et tactique
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad"; // contrat historique conservé, remplacé visuellement par CompactFootballPad
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import type { GameDart } from "../lib/types-game";
import {
  buildFootballMatchStats,
  cloneFootballState,
  createFootballState,
  footballAccuracy,
  footballActionLabel,
  footballTacticalHint,
  footballVariantLabel,
  footballZoneLabel,
  getFootballAction,
  getFootballActivePlayer,
  getFootballActiveSide,
  getFootballPossessionSide,
  getFootballTargets,
  normalizeFootballConfig,
  pickFootballBotDarts,
  playFootballVisit,
  type FootballAction,
  type FootballConfigPayload,
  type FootballState,
} from "../lib/gameEngines/footballEngine";
import { buildDartsTelemetry } from "../lib/dartsTelemetry";
import { History } from "../lib/history";
import tickerFootball from "../assets/tickers/ticker_football.png";
import FootballEnd from "./FootballEnd";
import "../styles/football-play.css";

const GREEN = "#65e5aa";
const BLUE = "#35d0ff";
const RED = "#ff5b77";
const GOLD = "#ffd36b";
const SOFT = "#aeb8c9";
const WHITE = "#f7fbff";
const PLAYER_COLORS = [BLUE, RED, GREEN, GOLD, "#a78bfa", "#ff70c5", "#65e6d6", "#d7dde8"];

type UiDart = { v: number; mult: 1 | 2 | 3 };
type Overlay = null | "stats" | "log" | "teams";

function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur";
}

function isBot(profile: any, botIds: Set<string>) {
  return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot");
}

function uiToGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}

function gameDartLabel(dart: GameDart) {
  if (!dart || dart.bed === "MISS") return "MISS";
  if (dart.bed === "OB") return "BULL";
  if (dart.bed === "IB") return "DBULL";
  return `${dart.bed}${dart.number}`;
}

function normalizeConfig(props: any): FootballConfigPayload {
  const record = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const decoded = record?.decoded || null;
  const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || decoded?.config || decoded?.payload?.config || record?.config || props?.config || props?.params || {};
  return normalizeFootballConfig(raw);
}

function buildHitsBySegment(visits: any[]) {
  const out: Record<string, number> = {};
  visits.forEach((visit) => (visit.darts || []).forEach((dart: GameDart) => {
    const label = gameDartLabel(dart);
    out[label] = Number(out[label] || 0) + 1;
  }));
  return out;
}

function actionColor(action: FootballAction) {
  if (action === "defense") return RED;
  if (action === "goalkeeper" || action === "shot" || action === "penalty" || action === "classic_shot") return GOLD;
  if (action === "classic_possession") return BLUE;
  return GREEN;
}

function actionMeta(action: FootballAction) {
  if (action === "attack") return { title: "CONSTRUIS L’ATTAQUE", subtitle: "Touche une cible pour avancer vers le but", effects: ["S · +1 ZONE", "D · +2 ZONES", "T · +3 ZONES"] };
  if (action === "defense") return { title: "RÉCUPÈRE LE BALLON", subtitle: "Stoppe la progression adverse", effects: ["S · REPOUSSE", "D · INTERCEPTE", "T · CONTRE"] };
  if (action === "shot") return { title: "FRAPPE AU BUT", subtitle: "Touche une zone de tir", effects: ["S · CADRÉ", "D · PUISSANT", "T · BUT DIRECT"] };
  if (action === "goalkeeper") return { title: "FAIS L’ARRÊT", subtitle: "Une seule zone de parade suffit", effects: ["CIBLE · ARRÊT", "HORS CIBLE · BUT", "3 FLÉCHETTES"] };
  if (action === "penalty") return { title: "TIRE LE PENALTY", subtitle: "Une cible touchée = but", effects: ["CIBLE · BUT", "HORS CIBLE · RATÉ", "MORT SUBITE"] };
  if (action === "classic_possession") return { title: "PRENDS LA POSSESSION", subtitle: "Touche le centre de la cible", effects: ["BULL · BALLON", "DBULL · BALLON", "SINON · RIEN"] };
  return { title: "MARQUE LE BUT", subtitle: "N’importe quel double est valable", effects: ["DOUBLE · BUT", "DBULL · BUT", "SINON · PERDU"] };
}

function Rules({ config }: { config: FootballConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.46 }}>
    <div><strong style={{ color: GREEN }}>{footballVariantLabel(config.variant).toUpperCase()}</strong><br />La mission affichée change automatiquement selon la possession et la position du ballon.</div>
    <div><strong style={{ color: BLUE }}>ATTAQUE</strong><br />S = +1 zone, D = +2, T = +3. BULL et DBULL produisent une longue passe.</div>
    <div><strong style={{ color: RED }}>DÉFENSE</strong><br />S repousse, D intercepte, T intercepte et lance une contre-attaque.</div>
    <div><strong style={{ color: GOLD }}>TIR / GARDIEN</strong><br />Triple ou DBULL marque directement. Un tir S/D peut ouvrir une volée de gardien.</div>
    <div><strong style={{ color: GREEN }}>ANNULER</strong><br />Efface la volée en cours ; à vide, restaure la dernière volée validée.</div>
  </div>;
}

function FootballField({ state }: { state: FootballState }) {
  const ballLeft = `${Math.max(4, Math.min(96, (state.ballPosition / 6) * 100))}%`;
  const possession = getFootballPossessionSide(state);
  const possessionIndex = state.possessionSideIndex;
  const zones = ["BUT", "SURF.", "DÉF.", "MILIEU", "ATT.", "SURF.", "BUT"];
  const leftColor = state.sides[0]?.color || BLUE;
  const rightColor = state.sides[1]?.color || RED;

  return <div className="football-field football-glass">
    <div className="football-field__outline" />
    <div className="football-field__midline" />
    <div className="football-field__circle" />
    <div className="football-field__box is-left" />
    <div className="football-field__box is-right" />
    <div className="football-field__goal is-left" style={{ color: leftColor }} />
    <div className="football-field__goal is-right" style={{ color: rightColor }} />
    <div className="football-field__team is-left" style={{ color: leftColor }}>{state.sides[0]?.name}</div>
    <div className="football-field__team is-right" style={{ color: rightColor }}>{state.sides[1]?.name}</div>
    <div className={`football-field__direction ${possessionIndex === 0 ? "is-left" : "is-right"}`} style={{ color: possession?.color || GREEN }}>{possessionIndex === 0 ? "➜➜" : "➜➜"}</div>
    <div className="football-field__status" style={{ color: possession?.color || GREEN }}>⚡ {possession?.name} · {footballZoneLabel(state.ballPosition)}</div>
    <div className="football-field__ball" style={{ left: ballLeft, ["--football-possession-glow" as any]: `${possession?.color || GREEN}66` }}>
      <div className="football-field__ball-core">⚽</div>
    </div>
    <div className="football-field__zones">{zones.map((zone, index) => <span key={`${zone}-${index}`} className={`football-field__zone ${index === state.ballPosition ? "is-active" : ""}`}>{zone}</span>)}</div>
  </div>;
}

function MissionCard({ state }: { state: FootballState }) {
  const action = getFootballAction(state);
  const meta = actionMeta(action);
  const color = actionColor(action);
  const targets = getFootballTargets(state, action);
  const specialTargets = action === "classic_possession" ? ["BULL", "DBULL"] : action === "classic_shot" ? ["TOUT DOUBLE", "DBULL"] : [];

  return <section className="football-mission-card football-glass" style={{ borderColor: `${color}55` }}>
    <div className="football-mission-head">
      <div className="football-mission-title" style={{ color }}>{meta.title}</div>
      <div className="football-mission-turn">{state.stage === "penalties" ? `TIR ${Math.floor(state.turnCount / 2) + 1}` : `P${state.period} · T${state.roundInPeriod}`}</div>
    </div>
    <div style={{ marginTop: 2, color: SOFT, fontSize: 6.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.subtitle}</div>
    <div className="football-targets">
      {(specialTargets.length ? specialTargets : targets).map((target: any) => <span key={String(target)} className="football-target-chip" style={{ color }}>{target}</span>)}
    </div>
    <div className="football-effects">{meta.effects.map((effect) => <span key={effect} className="football-effect">{effect}</span>)}</div>
  </section>;
}

function QuickAction({ icon, label, value, color, onClick }: any) {
  return <button type="button" className="football-quick-action" onClick={onClick} style={{ border: `1px solid ${color}55`, background: `linear-gradient(180deg,${color}14,rgba(2,8,5,.94))` }}>
    <span className="football-quick-action__icon">{icon}</span>
    <span className="football-quick-action__label">{label}</span>
    <strong className="football-quick-action__value" style={{ color }}>{value}</strong>
  </button>;
}

function dartPreviewLabel(dart?: UiDart) {
  if (!dart) return "—";
  if (Number(dart.v) === 0) return "MISS";
  if (Number(dart.v) === 25) return dart.mult === 2 ? "DB" : "B";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

function CompactFootballPad({ currentThrow, multiplier, targets, targetColor, action, notice, onSimple, onDouble, onTriple, onNumber, onBull, onCancel, onBackspace, onValidate, disabled }: any) {
  const rows = [[0, 1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12, 13], [14, 15, 16, 17, 18, 19, 20]];
  const targetSet = new Set(action === "classic_shot" || action === "classic_possession" ? [] : targets);

  return <div className="football-compact-pad">
    <div className="football-pad-status">
      <div className="football-pad-notice" style={{ color: String(notice || "").includes("BUT") ? GOLD : SOFT }}>{notice || "Saisis jusqu’à trois fléchettes puis valide la volée."}</div>
      <div className="football-pad-preview">{[0, 1, 2].map((index) => <span key={index} className="football-pad-preview-chip">{dartPreviewLabel(currentThrow[index])}</span>)}</div>
    </div>

    <div className="football-pad-modes">
      <button type="button" className={`football-pad-mode ${multiplier === 1 ? "is-active is-simple" : ""}`} onClick={onSimple} disabled={disabled}>SIMPLE</button>
      <button type="button" className={`football-pad-mode ${multiplier === 2 ? "is-active is-double" : ""}`} onClick={onDouble} disabled={disabled}>DOUBLE</button>
      <button type="button" className={`football-pad-mode ${multiplier === 3 ? "is-active is-triple" : ""}`} onClick={onTriple} disabled={disabled}>TRIPLE</button>
      <button type="button" className="football-pad-undo" onClick={onCancel} disabled={disabled}>↶</button>
    </div>

    {rows.map((row, rowIndex) => <div key={rowIndex} className="football-pad-row">{row.map((number) => <button
      key={number}
      type="button"
      className={`football-pad-cell ${number === 0 ? "is-miss" : ""} ${targetSet.has(number) ? "is-target" : ""}`}
      style={targetSet.has(number) ? { ["--football-target-color" as any]: targetColor } : undefined}
      onClick={() => onNumber(number)}
      disabled={disabled}
    >{number === 0 ? "MISS" : number}</button>)}</div>)}

    <div className="football-pad-footer">
      <button type="button" className={`football-pad-bull ${multiplier === 2 ? "is-dbull" : ""}`} onClick={onBull} disabled={disabled}>{multiplier === 2 ? "DBULL" : "BULL"}</button>
      <button type="button" className="football-pad-backspace" onClick={onBackspace} disabled={disabled || !currentThrow.length}>⌫</button>
      <button type="button" className="football-pad-validate" onClick={onValidate} disabled={disabled || !currentThrow.length}>VALIDER · {currentThrow.length}/3</button>
    </div>
  </div>;
}

function OverlayShell({ title, subtitle, color, onClose, children }: any) {
  React.useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, []);

  return <div role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 9998, display: "grid", placeItems: "center", padding: 10, background: "rgba(0,0,0,.78)", backdropFilter: "blur(7px)" }}>
    <div style={{ width: "min(620px,100%)", maxHeight: "88dvh", overflowY: "auto", borderRadius: 22, padding: 13, border: `1px solid ${color}77`, background: "linear-gradient(180deg,#101713,#050806)", boxShadow: `0 0 45px ${color}22` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div><div style={{ color, fontSize: 12, fontWeight: 1150, letterSpacing: 1 }}>{title}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8 }}>{subtitle}</div></div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${color}66`, background: `${color}12`, color, fontWeight: 1100 }}>✕</button>
      </div>
      {children}
    </div>
  </div>;
}

function Kpi({ label, value, detail, color = GREEN }: any) {
  return <div style={{ borderRadius: 14, padding: 10, border: `1px solid ${color}44`, background: `${color}0c` }}>
    <div style={{ color: SOFT, fontSize: 7, fontWeight: 1000 }}>{label}</div>
    <div style={{ marginTop: 4, color, fontSize: 19, fontWeight: 1150 }}>{value}</div>
    {detail ? <div style={{ marginTop: 2, color: SOFT, fontSize: 7 }}>{detail}</div> : null}
  </div>;
}

export default function FootballPlay(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const onFinish = props?.onFinish;
  const config = React.useMemo(() => normalizeConfig(props), []);
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => {
      const id = String(profile?.id || profile?.profileId || "");
      if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) });
    });
    const ordered = config.selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length >= 2 ? ordered : [{ id: "p1", name: "Joueur 1" }, { id: "p2", name: "Joueur 2" }];
  }, [store, config]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile) })), [profiles]);
  const profilesById = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const initialState = React.useMemo(() => {
    const decoded = resumeRecord?.decoded || null;
    const snapshot = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.stateSnapshot || decoded?.stateSnapshot || decoded?.payload?.stateSnapshot || null;
    return snapshot?.mode === "football" ? cloneFootballState(snapshot) : createFootballState(players, config);
  }, []);
  const [state, setState] = React.useState<FootballState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<FootballState[]>([]);
  const [notice, setNotice] = React.useState(footballTacticalHint(initialState));
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const [showEnd, setShowEnd] = React.useState(initialState.phase === "finished");
  const [botThinking, setBotThinking] = React.useState(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `football-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const activePlayer = getFootballActivePlayer(state);
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeSide = getFootballActiveSide(state);
  const activeStats = state.statsByPlayer[String(activePlayer?.id || "")] || {};
  const actionNow = getFootballAction(state);
  const targetsNow = getFootballTargets(state, actionNow);
  const currentActionColor = actionColor(actionNow);
  const score0 = Number(state.scoreBySide[state.sides[0]?.id] || 0);
  const score1 = Number(state.scoreBySide[state.sides[1]?.id] || 0);
  const lastVisit = state.visits[state.visits.length - 1];
  const lastEvent = lastVisit?.events?.map((event: any) => event.label).join(" · ") || "Coup d’envoi : construis la première attaque.";
  const stageLabel = state.stage === "penalties" ? "TIRS AU BUT" : state.stage === "extra_time" ? "PROLONGATION" : `PÉRIODE ${state.period}`;
  const roundLimit = state.stage === "extra_time" ? config.extraRounds : config.halfRounds;
  const progressPercent = state.stage === "penalties" ? Math.min(100, (state.turnCount / 10) * 100) : Math.min(100, (state.roundInPeriod / Math.max(1, roundLimit)) * 100);

  function backToConfig() {
    if (typeof go === "function") go("football_config", { config });
  }

  function addDart(v: number, mult?: 1 | 2 | 3) {
    if (botThinking || state.phase === "finished" || throwDarts.length >= 3) return;
    setThrowDarts((previous) => [...previous, { v: Number(v) || 0, mult: (mult || multiplier) as any }].slice(0, 3));
  }

  function commitVisit(source?: UiDart[]) {
    const darts = (source || throwDarts).slice(0, 3);
    if (!darts.length || state.phase === "finished") return;
    setUndoStack((previous) => [...previous.slice(-39), cloneFootballState(state)]);
    const next = playFootballVisit(state, darts.map(uiToGameDart));
    setState(next);
    setThrowDarts([]);
    setMultiplier(1);
    const visit = next.visits[next.visits.length - 1];
    setNotice(visit?.events?.map((event: any) => event.label).join(" · ") || footballTacticalHint(next));
    if (next.phase === "finished") setShowEnd(true);
  }

  function cancelOrUndo() {
    if (throwDarts.length) {
      setThrowDarts([]);
      setMultiplier(1);
      setNotice("Volée effacée.");
      return;
    }
    const previous = undoStack[undoStack.length - 1];
    if (!previous) {
      setNotice("Aucune volée à annuler.");
      return;
    }
    setState(previous);
    setUndoStack((stack) => stack.slice(0, -1));
    setShowEnd(false);
    autoSavedRef.current = "";
    setNotice("Dernière volée annulée.");
  }

  function resetMatch() {
    matchIdRef.current = `football-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = createFootballState(players, config);
    setState(next);
    setThrowDarts([]);
    setUndoStack([]);
    setOverlay(null);
    setShowEnd(false);
    setNotice(footballTacticalHint(next));
    autoSavedRef.current = "";
  }

  React.useEffect(() => {
    if (state.phase === "finished" || !activePlayer || !isBot(activeProfile, botIds) || botThinking) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const gameDarts = pickFootballBotDarts(state, config.botLevel);
      setUndoStack((previous) => [...previous.slice(-39), cloneFootballState(state)]);
      const next = playFootballVisit(state, gameDarts);
      setState(next);
      setThrowDarts([]);
      setMultiplier(1);
      setBotThinking(false);
      const visit = next.visits[next.visits.length - 1];
      setNotice(visit?.events?.map((event: any) => event.label).join(" · ") || "Volée BOT validée.");
      if (next.phase === "finished") setShowEnd(true);
    }, 650);
    return () => {
      window.clearTimeout(timer);
      setBotThinking(false);
    };
  }, [state.activeSideIndex, state.turnCount, state.phase, state.pendingShot?.target]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const status = statusOverride || (state.phase === "finished" ? "finished" : "in_progress");
    const finished = status === "finished";
    const now = finished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player: any, index: number) => {
      const profile = profilesById.get(String(player.id)) || player;
      const stats = state.statsByPlayer[player.id] || {};
      const sideIndex = state.sideByPlayer[player.id] ?? 0;
      const side = state.sides[sideIndex];
      const visits = state.visits.filter((visit: any) => String(visit.playerId) === String(player.id));
      const dartsDetail = visits.flatMap((visit: any) => visit.darts.map((dart: any, dartIndex: number) => ({ ...dart, label: visit.labels[dartIndex], period: visit.period, round: visit.round, turn: visit.turn, action: visit.action, targets: visit.targets, events: visit.events, dartIndex: dartIndex + 1 })));
      const won = finished && state.winnerPlayerIds.includes(player.id);
      return {
        id: player.id,
        playerId: player.id,
        profileId: player.id,
        name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        color: side?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        sideId: side?.id,
        sideName: side?.name,
        rank: won ? 1 : state.draw ? 1 : 2,
        win: won,
        winner: won,
        ...stats,
        accuracy: footballAccuracy(stats),
        visitsHistory: visits,
        visitHistory: visits,
        dartsDetail,
        hitsBySegment: buildHitsBySegment(visits),
        score: Number(state.scoreBySide[side?.id] || 0),
      };
    });
    const matchStats = buildFootballMatchStats(state);
    const winnerSides = state.sides.filter((side) => state.winnerSideIds.includes(side.id));
    const summary: any = {
      kind: "football",
      mode: "football",
      sport: "darts",
      variant: config.variant,
      variantLabel: footballVariantLabel(config.variant),
      finished,
      draw: state.draw,
      statisticsVersion: 2,
      telemetryVersion: 1,
      winnerId: finished ? state.winnerPlayerIds[0] || null : null,
      winnerIds: finished ? state.winnerPlayerIds : [],
      winnerSideIds: finished ? state.winnerSideIds : [],
      winnerName: finished ? (state.draw ? "Match nul" : winnerSides.map((side) => side.name).join(" / ")) : null,
      players: playerRows,
      perPlayer: playerRows,
      rankings: finished ? playerRows.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)) : [],
      visits: state.visits,
      matchStats,
      config,
      scoreBySide: state.scoreBySide,
      scoreLine: `${state.sides[0]?.name} ${score0} - ${score1} ${state.sides[1]?.name}`,
      game: { mode: "football", variant: config.variant, halfRounds: config.halfRounds, tieBreaker: config.tieBreaker },
    };
    const record: any = {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: "football",
      mode: "football",
      sport: "darts",
      status,
      statisticsVersion: 2,
      telemetryVersion: 1,
      createdAt: state.startedAt,
      startedAt: state.startedAt,
      updatedAt: now,
      ...(finished ? { finishedAt: now, endedAt: now } : {}),
      winnerId: summary.winnerId,
      winnerIds: summary.winnerIds,
      winnerName: summary.winnerName,
      players: playerRows,
      resumeId: matchIdRef.current,
      resume: { config, state: cloneFootballState(state), updatedAt: now },
      game: summary.game,
      summary,
      payload: {
        kind: "football",
        mode: "football",
        sport: "darts",
        variant: config.variant,
        statisticsVersion: 2,
        telemetryVersion: 1,
        config,
        players: playerRows,
        summary,
        visits: state.visits,
        visitHistory: state.visits,
        events: state.visits,
        stateSnapshot: cloneFootballState(state),
        stats: { sport: "darts", mode: "football", variant: config.variant, players: playerRows, match: matchStats, global: matchStats },
      },
    };
    const telemetry = buildDartsTelemetry(record, record.payload);
    if (telemetry) {
      record.payload.telemetry = telemetry;
      record.payload.dartTelemetry = telemetry;
      record.summary.hitSummary = { ...telemetry.totals, byPlayer: telemetry.perPlayer };
      record.summary.telemetryExact = true;
      record.summary.telemetryCoverage = "full";
    }
    return record;
  }

  React.useEffect(() => {
    if (state.phase === "finished" || state.visits.length === 0) return;
    const timer = window.setTimeout(() => { void (History as any).upsert(buildHistoryRecord("in_progress")); }, 260);
    return () => window.clearTimeout(timer);
  }, [state]);

  React.useEffect(() => {
    if (state.phase !== "finished") return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    try {
      onFinish?.(buildHistoryRecord("finished"), { navigate: false });
    } catch {
      void (History as any).upsert(buildHistoryRecord("finished"));
    }
  }, [state.phase]);

  const inputDisabled = botThinking || state.phase === "finished" || throwDarts.length >= 3;

  return <div className="football-play-page" style={{ color: theme?.text || WHITE }}>
    <PageHeader tickerSrc={tickerFootball} tickerAlt="DARTS FOOTBALL" left={<BackDot onClick={backToConfig} color={GREEN} glow={`${GREEN}88`} />} right={<InfoDot title="Règles DARTS FOOTBALL" color={BLUE} glow={`${BLUE}88`} content={<Rules config={config} />} />} />

    <main className="football-play-main">
      <section className="football-scoreboard football-glass">
        <div className="football-score-team">
          <div className="football-score-team__name" style={{ color: state.sides[0]?.color || BLUE }}>{state.sides[0]?.name}</div>
          <div className="football-score-team__score">{score0}</div>
        </div>
        <div className="football-score-center">
          <div className="football-score-center__stage">{stageLabel}</div>
          <div className="football-score-center__meta">{footballVariantLabel(config.variant)} · TOUR {state.roundInPeriod}</div>
          <div className="football-score-progress"><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
        <div className="football-score-team is-away">
          <div className="football-score-team__name" style={{ color: state.sides[1]?.color || RED }}>{state.sides[1]?.name}</div>
          <div className="football-score-team__score">{score1}</div>
        </div>
      </section>

      <FootballField state={state} />

      <div className="football-command-row">
        <section className="football-player-card football-glass" style={{ borderColor: `${activeSide?.color || GREEN}55` }}>
          <ProfileAvatar profile={activeProfile} size={38} />
          <div style={{ minWidth: 0 }}>
            <div className="football-player-card__eyebrow" style={{ color: activeSide?.color || GREEN }}>{botThinking ? "BOT EN RÉFLEXION" : "JOUEUR ACTIF"}</div>
            <div className="football-player-card__name">{playerName(activeProfile)}</div>
            <div className="football-player-card__stats">{activeStats.goals || 0} but · {activeStats.shotsOnTarget || 0} cadré · {activeStats.interceptions || 0} interception</div>
          </div>
        </section>
        <MissionCard state={state} />
      </div>

      <section className="football-quick-actions">
        <QuickAction icon="⚽" label="FEUILLE DE MATCH" value={`${score0}-${score1}`} color={BLUE} onClick={() => setOverlay("teams")} />
        <QuickAction icon="📊" label="MES STATISTIQUES" value={`${footballAccuracy(activeStats)}%`} color={GREEN} onClick={() => setOverlay("stats")} />
        <QuickAction icon="🕘" label="DERNIÈRE ACTION" value={state.visits.length} color={GOLD} onClick={() => setOverlay("log")} />
      </section>

      <section style={{ minWidth: 0 }}>
        {config.scoreInputMethod === "dartboard" ? <div className="football-dartboard-shell football-glass">
          <div style={{ width: "100%", color: String(notice || "").includes("BUT") ? GOLD : SOFT, fontSize: 7, fontWeight: 900, textAlign: "center", lineHeight: 1.3 }}>{notice}</div>
          <DartboardClickable onHit={(segment, mult) => addDart(segment, mult)} multiplier={multiplier} size={Math.min(260, typeof window !== "undefined" ? window.innerWidth - 30 : 250)} disabled={inputDisabled} />
          <div className="football-dartboard-actions">
            <button type="button" onClick={cancelOrUndo} className="football-dartboard-action" style={{ border: `1px solid ${RED}66`, background: `${RED}12`, color: RED }}>↶ ANNULER</button>
            <div style={{ display: "grid", placeItems: "center", color: activeSide?.color || GREEN, fontSize: 13, fontWeight: 1200 }}>{throwDarts.length}/3</div>
            <button type="button" disabled={!throwDarts.length} onClick={() => commitVisit()} className="football-dartboard-action" style={{ border: `1px solid ${GOLD}88`, background: "linear-gradient(180deg,#ffd36b,#ffad00)", color: "#171008" }}>VALIDER</button>
          </div>
        </div> : <CompactFootballPad
          currentThrow={throwDarts}
          multiplier={multiplier}
          targets={targetsNow}
          targetColor={currentActionColor}
          action={actionNow}
          notice={notice || lastEvent}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onCancel={cancelOrUndo}
          onBackspace={() => setThrowDarts((previous) => previous.slice(0, -1))}
          onNumber={(number: number) => addDart(number)}
          onBull={() => addDart(25)}
          onValidate={() => commitVisit()}
          disabled={botThinking || state.phase === "finished"}
        />}
      </section>
    </main>

    {overlay === "stats" ? <OverlayShell title={`STATS · ${playerName(activeProfile).toUpperCase()}`} subtitle={`${footballActionLabel(actionNow)} · ${activeSide?.name}`} color={GREEN} onClose={() => setOverlay(null)}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <Kpi label="PRÉCISION ACTIONS" value={`${footballAccuracy(activeStats)}%`} color={GREEN} />
        <Kpi label="BUTS" value={activeStats.goals || 0} color={GOLD} />
        <Kpi label="TIRS CADRÉS" value={activeStats.shotsOnTarget || 0} color={BLUE} />
        <Kpi label="ARRÊTS" value={activeStats.saves || 0} color={GOLD} />
        <Kpi label="INTERCEPTIONS" value={activeStats.interceptions || 0} color={RED} />
        <Kpi label="TACLES" value={activeStats.tackles || 0} color={RED} />
        <Kpi label="PROGRESSION" value={activeStats.advances || 0} color={GREEN} detail={`meilleure action +${activeStats.bestProgress || 0}`} />
        <Kpi label="FLÉCHETTES" value={activeStats.darts || 0} color={WHITE} />
      </div>
    </OverlayShell> : null}

    {overlay === "teams" ? <OverlayShell title="FEUILLE DE MATCH" subtitle={`${footballVariantLabel(config.variant)} · ${state.visits.length} volées`} color={BLUE} onClose={() => setOverlay(null)}>
      <div style={{ display: "grid", gap: 9 }}>{state.sides.map((side: any) => <div key={side.id} style={{ borderRadius: 16, padding: 10, border: `1px solid ${side.color}55`, background: `${side.color}0d` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: side.color }}>{side.name}</strong><strong style={{ color: WHITE, fontSize: 18 }}>{state.scoreBySide[side.id] || 0}</strong></div>
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>{side.playerIds.map((id: string) => {
          const profile = profilesById.get(id);
          const stats = state.statsByPlayer[id] || {};
          return <div key={id} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) auto", gap: 7, alignItems: "center" }}>
            <ProfileAvatar profile={profile} size={30} />
            <span style={{ color: WHITE, fontSize: 9, fontWeight: 1000 }}>{playerName(profile)}</span>
            <span style={{ color: SOFT, fontSize: 8 }}>{stats.goals || 0}B · {stats.shotsOnTarget || 0}TC · {stats.interceptions || 0}INT</span>
          </div>;
        })}</div>
      </div>)}</div>
    </OverlayShell> : null}

    {overlay === "log" ? <OverlayShell title="FIL DU MATCH" subtitle={`${state.visits.length} action${state.visits.length > 1 ? "s" : ""}`} color={GOLD} onClose={() => setOverlay(null)}>
      <div style={{ display: "grid", gap: 7 }}>
        {!state.visits.length ? <div style={{ color: SOFT, fontSize: 10, padding: 10 }}>Le coup d’envoi vient d’être donné. Aucune action enregistrée.</div> : null}
        {[...state.visits].reverse().map((visit: any) => <div key={visit.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: state.sides.find((side) => side.id === visit.sideId)?.color || WHITE, fontSize: 9 }}>{playerName(profilesById.get(String(visit.playerId)))} · P{visit.period} T{visit.round}</strong><strong style={{ color: actionColor(visit.action), fontSize: 8 }}>{footballActionLabel(visit.action)}</strong></div>
          <div style={{ marginTop: 4, color: SOFT, fontSize: 7.5 }}>{visit.labels.join(" / ")}</div>
          <div style={{ marginTop: 4, color: WHITE, fontSize: 8.2, lineHeight: 1.4 }}>{visit.events.map((event: any) => event.label).join(" · ") || "Aucun événement"}</div>
        </div>)}
      </div>
    </OverlayShell> : null}

    {showEnd && state.phase === "finished" ? <FootballEnd
      state={state}
      profilesById={profilesById}
      onClose={() => setShowEnd(false)}
      onReplay={resetMatch}
      onStats={() => {
        const focusId = state.players[0]?.id;
        if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialStatsSubTab: "football", initialPlayerId: focusId, playerId: focusId });
      }}
      onHistory={() => {
        try {
          onFinish?.(buildHistoryRecord("finished"), { navigate: true });
        } catch {
          if (typeof go === "function") go("statsHub", { tab: "history" });
        }
      }}
    /> : null}
  </div>;
}
