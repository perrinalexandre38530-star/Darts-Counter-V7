// @ts-nocheck
// =============================================================
// DARTS POKER — PLAY V1 complet
// Marché 20 cartes, pouvoirs, bots, undo, reprise, historique.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import type { GameDart } from "../lib/types-game";
import {
  advanceDartsPokerRound,
  chooseBestPokerOption,
  cloneDartsPokerState,
  createDartsPokerState,
  dartsPokerDartLabel,
  evaluateBestPokerHand,
  finishDartsPokerHand,
  getDartsPokerActiveHand,
  getDartsPokerActivePlayer,
  openDartsPokerChoice,
  pickBestPokerMarketSector,
  playDartsPokerVisit,
  pokerCardLabel,
  pokerRankLabel,
  pokerSuitSymbol,
  resolveDartsPokerChoice,
  useDartsPokerExchange,
  type DartsPokerConfigPayload,
  type DartsPokerState,
  type PokerCard,
} from "../lib/gameEngines/dartsPokerEngine";
import { History } from "../lib/history";
import tickerDartsPoker from "../assets/tickers/ticker_darts_poker.png";
import DartsPokerEnd from "./DartsPokerEnd";

type UiDart = { v: number; mult: 1 | 2 | 3 };

const GOLD = "#f6c256";
const RED = "#e83a43";
const GREEN = "#5ce6a8";
const BLUE = "#55c7ff";
const SOFT = "#9aa1b2";
const PLAYER_COLORS = [GOLD, RED, BLUE, GREEN, "#a78bfa", "#ff9b52", "#ff63b8", "#d4d8e5"];

function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 1000) / 10 : 0; }
function panel(): React.CSSProperties { return { borderRadius: 18, padding: 9, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.30))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.28)", boxSizing: "border-box" }; }
function action(color: string): React.CSSProperties { return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}17`, color, fontWeight: 1050, cursor: "pointer" }; }
function uiToGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}
function normalizeConfig(props: any): DartsPokerConfigPayload {
  const record = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || props?.config || props?.params || {};
  return {
    mode: "darts_poker", players: Math.max(1, Number(raw?.players || raw?.selectedIds?.length || 1)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [], playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    playerDartSets: raw?.playerDartSets || {}, botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [], botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    rounds: ([3,5,7,10].includes(Number(raw?.rounds)) ? Number(raw.rounds) : 5) as any,
    dartsPerHand: ([5,6,7].includes(Number(raw?.dartsPerHand)) ? Number(raw.dartsPerHand) : 6) as any,
    powersEnabled: raw?.powersEnabled !== false, jokerEnabled: raw?.jokerEnabled !== false, autoDrawMissing: true,
    openHands: raw?.openHands !== false, randomOrder: Boolean(raw?.randomOrder), scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function Rules({ config }: { config: DartsPokerConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: GOLD }}>MARCHÉ</strong><br />Les 20 secteurs portent 20 cartes. Une touche prend la carte puis renouvelle immédiatement le secteur.</div>
    <div><strong style={{ color: GREEN }}>POUVOIRS</strong><br />Double : Échange. Triple et Bull : tirer 2 cartes et en choisir 1. DBull : Joker.</div>
    <div><strong style={{ color: RED }}>MAIN</strong><br />{config.dartsPerHand} fléchettes, puis la meilleure combinaison de 5 cartes est calculée automatiquement.</div>
    <div><strong style={{ color: BLUE }}>MATCH</strong><br />{config.rounds} manches. Une victoire de main vaut un point. Les égalités donnent un point à chaque joueur concerné.</div>
  </div>;
}

function CardView({ card, small = false, hidden = false, selected = false, onClick, badge }: any) {
  if (hidden) return <div style={{ width: small ? 42 : 55, height: small ? 58 : 76, borderRadius: 9, background: "repeating-linear-gradient(45deg,#2b1115,#2b1115 5px,#6d1721 5px,#6d1721 10px)", border: `1px solid ${GOLD}88`, boxShadow: "0 5px 12px rgba(0,0,0,.35)" }} />;
  const red = card?.suit === "H" || card?.suit === "D";
  return <button type="button" onClick={onClick} disabled={!onClick} style={{ width: small ? 42 : 55, height: small ? 58 : 76, padding: 3, position: "relative", borderRadius: 9, background: card?.joker ? "linear-gradient(145deg,#16161d,#6d1721)" : "linear-gradient(145deg,#fff,#e9e9ec)", border: `2px solid ${selected ? GREEN : card?.joker ? GOLD : "rgba(255,255,255,.40)"}`, boxShadow: selected ? `0 0 14px ${GREEN}99` : "0 5px 12px rgba(0,0,0,.35)", color: card?.joker ? GOLD : red ? "#c3172b" : "#111", cursor: onClick ? "pointer" : "default" }}>
    {card?.joker ? <div style={{ display: "grid", height: "100%", placeItems: "center", fontSize: small ? 8 : 10, fontWeight: 1200, transform: "rotate(-12deg)" }}>JOKER<br />★</div> : <><div style={{ position: "absolute", left: 4, top: 2, fontSize: small ? 10 : 13, fontWeight: 1200, lineHeight: 1 }}>{pokerRankLabel(card?.rank)}</div><div style={{ display: "grid", height: "100%", placeItems: "center", fontSize: small ? 23 : 31 }}>{pokerSuitSymbol(card?.suit)}</div></>}
    {badge ? <div style={{ position: "absolute", right: -5, bottom: -5, borderRadius: 999, padding: "2px 5px", background: "#090a0e", border: `1px solid ${GOLD}`, color: GOLD, fontSize: 7, fontWeight: 1100 }}>{badge}</div> : null}
  </button>;
}

export default function DartsPokerPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => { const id = String(profile?.id || profile?.profileId || ""); if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) }); });
    const ordered = config.selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile) })), [profiles]);
  const profilesById = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const initialState = React.useMemo(() => {
    const snapshot = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || null;
    if (snapshot?.mode === "darts_poker") return cloneDartsPokerState(snapshot);
    return createDartsPokerState(players, config);
  }, []);

  const [state, setState] = React.useState<DartsPokerState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<DartsPokerState[]>([]);
  const [notice, setNotice] = React.useState("Vise une carte du marché.");
  const [showRound, setShowRound] = React.useState(state.phase === "round_result");
  const [showEnd, setShowEnd] = React.useState(state.phase === "finished");
  const [showTimeline, setShowTimeline] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `darts-poker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");

  const activePlayer = getDartsPokerActivePlayer(state);
  const activeHand = getDartsPokerActiveHand(state);
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeColor = PLAYER_COLORS[state.activePlayerIndex % PLAYER_COLORS.length];
  const activeStats = state.statsByPlayer[String(activePlayer?.id)] || {};
  const liveEvaluation = evaluateBestPokerHand(activeHand?.cards || []);
  const remainingDarts = Math.max(0, config.dartsPerHand - Number(activeHand?.dartsUsed || 0));

  function backToConfig() { if (typeof go === "function") go("darts_poker_config", config); }
  function addDart(v: number, mult?: 1 | 2 | 3) {
    if (botThinking || state.phase !== "throwing" || throwDarts.length >= 3 || throwDarts.length >= remainingDarts) return;
    const next = [...throwDarts, { v: Number(v) || 0, mult: (mult || multiplier) as any }].slice(0, Math.min(3, remainingDarts));
    setThrowDarts(next);
  }
  function commitVisit(source?: UiDart[]) {
    const darts = (source || throwDarts).slice(0, Math.min(3, remainingDarts));
    if (!darts.length || state.phase !== "throwing") return;
    setUndoStack((prev) => [...prev.slice(-29), cloneDartsPokerState(state)]);
    const next = playDartsPokerVisit(state, darts.map(uiToGameDart));
    setState(next); setThrowDarts([]); setMultiplier(1);
    const visit = next.visits[next.visits.length - 1];
    setNotice(visit?.events?.map((event) => event.label).join(" · ") || "Volée validée.");
  }
  function cancelOrUndo() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice("Volée effacée."); return; }
    const previous = undoStack[undoStack.length - 1];
    if (!previous) { setNotice("Aucune action à annuler."); return; }
    setState(previous); setUndoStack((prev) => prev.slice(0, -1)); setShowRound(false); setShowEnd(false); autoSavedRef.current = ""; setNotice("Dernière action annulée.");
  }
  function useChoice() {
    setUndoStack((prev) => [...prev.slice(-29), cloneDartsPokerState(state)]);
    setState(openDartsPokerChoice(state));
  }
  function chooseCard(index: number) {
    const selected = state.pendingChoice?.cards?.[index];
    setState(resolveDartsPokerChoice(state, index)); setNotice(selected ? `${pokerCardLabel(selected)} ajouté à la main.` : "Carte choisie.");
  }
  function exchangeCard(index: number) {
    if (!activeHand?.exchangeTokens) return;
    setUndoStack((prev) => [...prev.slice(-29), cloneDartsPokerState(state)]);
    const old = activeHand.cards[index];
    const next = useDartsPokerExchange(state, index);
    setState(next); setNotice(`${pokerCardLabel(old)} échangé.`);
  }
  function validateHand() {
    if (state.phase !== "powers") return;
    setUndoStack((prev) => [...prev.slice(-29), cloneDartsPokerState(state)]);
    const next = finishDartsPokerHand(state);
    setState(next);
    const completedId = activePlayer?.id;
    const completed = next.handsByPlayer[String(completedId)];
    setNotice(completed?.evaluation?.label || "Main validée.");
    if (next.phase === "round_result") setShowRound(true);
  }
  function nextRound() {
    const next = advanceDartsPokerRound(state);
    setState(next); setShowRound(false);
    if (next.phase === "finished") { setShowEnd(true); setNotice("Showdown final terminé."); }
    else setNotice(`Manche ${next.roundIndex} · nouveau marché.`);
  }
  function resetMatch() {
    matchIdRef.current = `darts-poker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    autoSavedRef.current = ""; setState(createDartsPokerState(players, config)); setThrowDarts([]); setUndoStack([]); setShowRound(false); setShowEnd(false); setNotice("Nouvelle table ouverte.");
  }

  React.useEffect(() => {
    if (!activePlayer || !isBot(activeProfile, botIds) || botThinking || state.phase === "round_result" || state.phase === "finished") return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      let next = state;
      if (next.phase === "throwing") {
        const hand = getDartsPokerActiveHand(next); const remaining = Math.max(0, config.dartsPerHand - Number(hand?.dartsUsed || 0));
        const count = Math.min(3, remaining); const target = pickBestPokerMarketSector(next, activePlayer.id);
        const missChance = config.botLevel === "hard" ? .05 : config.botLevel === "easy" ? .28 : .13;
        const darts: GameDart[] = Array.from({ length: count }, () => {
          if (Math.random() < missChance) return { bed: "MISS" } as GameDart;
          const r = Math.random();
          const bed = config.botLevel === "hard" ? (r < .25 ? "T" : r < .48 ? "D" : "S") : config.botLevel === "easy" ? (r < .08 ? "T" : r < .18 ? "D" : "S") : (r < .15 ? "T" : r < .34 ? "D" : "S");
          return { bed, number: target } as GameDart;
        });
        setUndoStack((prev) => [...prev.slice(-29), cloneDartsPokerState(state)]);
        next = playDartsPokerVisit(next, darts);
        setNotice(`BOT ${activePlayer.name} · ${darts.map(dartsPokerDartLabel).join(" / ")}`);
      } else if (next.phase === "powers") {
        const hand = getDartsPokerActiveHand(next);
        if ((hand?.choiceTokens || 0) > 0) {
          next = openDartsPokerChoice(next);
          if (next.pendingChoice) next = resolveDartsPokerChoice(next, chooseBestPokerOption(hand?.cards || [], next.pendingChoice.cards));
        } else if ((hand?.exchangeTokens || 0) > 0 && (hand?.cards || []).some((card) => !card.joker)) {
          let worst = 0; (hand?.cards || []).forEach((card, index) => { if (!card.joker && card.rank < (hand.cards[worst]?.rank || 99)) worst = index; });
          next = useDartsPokerExchange(next, worst);
        } else next = finishDartsPokerHand(next);
        setNotice(`BOT ${activePlayer.name} prépare sa main.`);
        if (next.phase === "round_result") setShowRound(true);
      }
      setState(next); setBotThinking(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.activePlayerIndex, activeHand?.dartsUsed, activeHand?.choiceTokens, activeHand?.exchangeTokens, state.roundIndex]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const status = statusOverride || (state.phase === "finished" ? "finished" : "in_progress");
    const finished = status === "finished";
    const now = finished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player, index) => {
      const profile = profilesById.get(String(player.id)) || player;
      const stats = state.statsByPlayer[player.id] || {};
      const visits = state.visits.filter((visit) => String(visit.playerId) === String(player.id));
      const rounds = state.rounds.flatMap((round) => round.rows.filter((row) => String(row.playerId) === String(player.id)).map((row) => ({ round: round.round, ...row })));
      const dartsDetail = visits.flatMap((visit) => visit.darts.map((dart, dartIndex) => ({ ...dart, label: visit.labels[dartIndex], round: visit.round, visit: visit.visit, dartIndex: dartIndex + 1 })));
      const standing = state.standings.find((row) => String(row.id) === String(player.id));
      return {
        id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null, color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        rank: standing?.rank || null, win: finished && state.winnerIds.includes(player.id), winner: finished && state.winnerIds.includes(player.id),
        ...stats, accuracy: pct(stats.hits, stats.darts), averageHandScore: stats.handsPlayed ? stats.totalHandScore / stats.handsPlayed : 0,
        visitsHistory: visits, visitHistory: visits, rounds, dartsDetail, hitsBySegment: { ...(stats.hitsBySegment || {}) },
      };
    });
    const totalDarts = playerRows.reduce((sum, row) => sum + Number(row.darts || 0), 0);
    const totalHits = playerRows.reduce((sum, row) => sum + Number(row.hits || 0), 0);
    const matchStats = {
      statisticsVersion: 1, telemetryVersion: 1, roundsPlayed: state.rounds.length, configuredRounds: config.rounds,
      totalHands: playerRows.reduce((sum, row) => sum + Number(row.handsPlayed || 0), 0),
      totalHandsWon: playerRows.reduce((sum, row) => sum + Number(row.handsWon || 0), 0),
      totalDarts, totalHits, accuracy: pct(totalHits, totalDarts), totalVisits: state.visits.length,
      cardsCollected: playerRows.reduce((sum, row) => sum + Number(row.cardsCollected || 0), 0),
      exchangesUsed: playerRows.reduce((sum, row) => sum + Number(row.exchangesUsed || 0), 0),
      choicesUsed: playerRows.reduce((sum, row) => sum + Number(row.choicesUsed || 0), 0),
      jokers: playerRows.reduce((sum, row) => sum + Number(row.jokers || 0), 0),
      pairs: playerRows.reduce((sum, row) => sum + Number(row.pairs || 0), 0), twoPairs: playerRows.reduce((sum, row) => sum + Number(row.twoPairs || 0), 0),
      threeOfAKinds: playerRows.reduce((sum, row) => sum + Number(row.threeOfAKinds || 0), 0), straights: playerRows.reduce((sum, row) => sum + Number(row.straights || 0), 0),
      flushes: playerRows.reduce((sum, row) => sum + Number(row.flushes || 0), 0), fullHouses: playerRows.reduce((sum, row) => sum + Number(row.fullHouses || 0), 0),
      fourOfAKinds: playerRows.reduce((sum, row) => sum + Number(row.fourOfAKinds || 0), 0), straightFlushes: playerRows.reduce((sum, row) => sum + Number(row.straightFlushes || 0), 0),
      royalFlushes: playerRows.reduce((sum, row) => sum + Number(row.royalFlushes || 0), 0), durationMs: Math.max(0, now - state.startedAt),
    };
    const summary = {
      kind: "darts_poker", mode: "darts_poker", sport: "darts", finished, statisticsVersion: 1, telemetryVersion: 1,
      winnerId: finished ? state.winnerIds[0] || null : null, winnerIds: finished ? state.winnerIds : [],
      winnerName: finished ? state.standings.filter((row) => row.rank === 1).map((row) => row.name).join(" / ") : null,
      roundsPlayed: state.rounds.length, configuredRounds: config.rounds, dartsPerHand: config.dartsPerHand,
      players: playerRows, perPlayer: playerRows, rankings: finished ? playerRows.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)) : [],
      rounds: state.rounds, visits: state.visits, matchStats, config,
      scoreLine: `${state.rounds.length}/${config.rounds} manches · ${matchStats.cardsCollected} cartes · ${matchStats.accuracy}% précision`,
      game: { mode: "darts_poker", rounds: config.rounds, dartsPerHand: config.dartsPerHand },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "darts_poker", mode: "darts_poker", sport: "darts", status,
      statisticsVersion: 1, telemetryVersion: 1, createdAt: state.startedAt, startedAt: state.startedAt, updatedAt: now,
      ...(finished ? { finishedAt: now, endedAt: now } : {}), winnerId: summary.winnerId, winnerIds: summary.winnerIds, winnerName: summary.winnerName,
      players: playerRows, resumeId: matchIdRef.current, resume: { config, state: cloneDartsPokerState(state), updatedAt: now }, game: summary.game, summary,
      payload: {
        kind: "darts_poker", mode: "darts_poker", sport: "darts", statisticsVersion: 1, telemetryVersion: 1,
        config, players: playerRows, summary, rounds: state.rounds, visits: state.visits, visitHistory: state.visits, stateSnapshot: cloneDartsPokerState(state),
        stats: { sport: "darts", mode: "darts_poker", players: playerRows, match: matchStats, global: matchStats },
      },
    };
  }

  React.useEffect(() => {
    if (state.phase === "finished" || state.visits.length === 0) return;
    const timer = window.setTimeout(() => { void (History as any).upsert(buildHistoryRecord("in_progress")); }, 280);
    return () => window.clearTimeout(timer);
  }, [state]);
  React.useEffect(() => {
    if (state.phase !== "finished") return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    try { onFinish?.(buildHistoryRecord("finished"), { navigate: false }); } catch {}
  }, [state.phase]);

  const centerScore = <div style={{ textAlign: "center" }}><div style={{ color: GOLD, fontSize: 19, fontWeight: 1200 }}>{activeHand?.cards?.length || 0} CARTES</div><div style={{ color: liveEvaluation ? GREEN : SOFT, fontSize: 9, fontWeight: 1000 }}>{liveEvaluation?.label || `${remainingDarts} fléchette${remainingDarts > 1 ? "s" : ""} restante${remainingDarts > 1 ? "s" : ""}`}</div></div>;
  const keypadNotice = <div style={{ color: state.phase === "powers" ? GOLD : SOFT, fontSize: 9, fontWeight: 900, textAlign: "center", lineHeight: 1.3 }}>{botThinking ? "BOT EN RÉFLEXION…" : notice}</div>;

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: "radial-gradient(circle at 50% -10%,rgba(232,58,67,.25),#08090d 42%,#020203 100%)", paddingBottom: 10 }}>
    <PageHeader tickerSrc={tickerDartsPoker} tickerAlt="DARTS POKER" left={<BackDot onClick={backToConfig} color={GOLD} glow={`${GOLD}88`} />} right={<InfoDot title="Règles DARTS POKER" color={RED} glow={`${RED}88`} content={<Rules config={config} />} />} />
    <main style={{ width: "min(980px,100%)", margin: "0 auto", padding: "6px 8px", boxSizing: "border-box" }}>
      <section style={{ ...panel(), display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 8, alignItems: "center", marginBottom: 6, borderColor: `${activeColor}55` }}>
        <ProfileAvatar profile={activeProfile} size={46} />
        <div style={{ minWidth: 0 }}><div style={{ color: activeColor, fontSize: 12, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(activeProfile)}</div><div style={{ color: SOFT, fontSize: 8.5 }}>Manche {state.roundIndex}/{config.rounds} · {state.phase === "powers" ? "PHASE POUVOIRS" : `Fléchette ${Number(activeHand?.dartsUsed || 0) + 1}/${config.dartsPerHand}`}</div></div>
        <div style={{ display: "flex", gap: 5 }}><button onClick={() => setShowTimeline(true)} style={{ ...action(BLUE), minHeight: 34, padding: "0 9px", fontSize: 8 }}>JOURNAL</button><button onClick={cancelOrUndo} style={{ ...action(RED), minHeight: 34, padding: "0 9px", fontSize: 8 }}>UNDO</button></div>
      </section>

      <section style={{ ...panel(), marginBottom: 6, padding: 7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><div><div style={{ color: GOLD, fontSize: 9, fontWeight: 1100, letterSpacing: .8 }}>MARCHÉ DES 20 CARTES</div><div style={{ color: SOFT, fontSize: 8 }}>Touchez le secteur correspondant pour prendre sa carte.</div></div><div style={{ color: RED, fontSize: 9, fontWeight: 1000 }}>{state.deck.length} cartes dans le sabot</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 4 }}>
          {Array.from({ length: 20 }, (_, index) => index + 1).map((sector) => <div key={sector} style={{ minWidth: 0, textAlign: "center", padding: "4px 1px", borderRadius: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ color: GOLD, fontSize: 10, fontWeight: 1100, marginBottom: 2 }}>{sector}</div><div style={{ display: "flex", justifyContent: "center", transform: "scale(.86)", transformOrigin: "top center", height: 52 }}><CardView card={state.market[sector]} small /></div></div>)}
        </div>
      </section>

      <section style={{ ...panel(), marginBottom: 6, borderColor: `${activeColor}44` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><div><div style={{ color: activeColor, fontSize: 9, fontWeight: 1100 }}>MAIN ACTUELLE</div><div style={{ color: liveEvaluation ? GREEN : SOFT, fontSize: 8.5 }}>{liveEvaluation?.label || "Construis une main de 5 cartes"}</div></div><div style={{ display: "flex", gap: 5 }}><span style={{ borderRadius: 999, padding: "4px 7px", color: BLUE, border: `1px solid ${BLUE}55`, fontSize: 8, fontWeight: 1000 }}>↔ {activeHand?.exchangeTokens || 0}</span><span style={{ borderRadius: 999, padding: "4px 7px", color: GOLD, border: `1px solid ${GOLD}55`, fontSize: 8, fontWeight: 1000 }}>✦ {activeHand?.choiceTokens || 0}</span></div></div>
        <div style={{ marginTop: 7, display: "flex", gap: 5, overflowX: "auto", minHeight: 79 }}>{(activeHand?.cards || []).map((card, index) => <CardView key={`${card.id}-${index}`} card={card} selected={state.phase === "powers" && (activeHand?.exchangeTokens || 0) > 0 && !card.joker} onClick={state.phase === "powers" && (activeHand?.exchangeTokens || 0) > 0 && !card.joker ? () => exchangeCard(index) : undefined} badge={state.phase === "powers" && (activeHand?.exchangeTokens || 0) > 0 && !card.joker ? "ÉCH." : undefined} />)}{!(activeHand?.cards || []).length ? <div style={{ color: SOFT, fontSize: 10, padding: 20 }}>Aucune carte obtenue.</div> : null}</div>
        {state.phase === "powers" ? <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}><button disabled={!activeHand?.choiceTokens || !!state.pendingChoice} onClick={useChoice} style={{ ...action(GOLD), opacity: activeHand?.choiceTokens ? 1 : .4 }}>✦ UTILISER UN CHOIX</button><button onClick={validateHand} style={action(GREEN)}>✓ VALIDER LA MAIN</button></div> : null}
      </section>

      <section style={{ ...panel(), marginBottom: 6, padding: 7 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${state.players.length},minmax(0,1fr))`, gap: 5 }}>
          {state.players.map((player, index) => { const hand = state.handsByPlayer[player.id]; const stats = state.statsByPlayer[player.id]; const profile = profilesById.get(player.id) || player; const active = index === state.activePlayerIndex; const hidden = !config.openHands && !active && state.phase !== "round_result" && state.phase !== "finished"; return <div key={player.id} style={{ minWidth: 0, padding: 6, borderRadius: 12, border: `1px solid ${active ? PLAYER_COLORS[index % PLAYER_COLORS.length] : "rgba(255,255,255,.08)"}`, background: active ? `${PLAYER_COLORS[index % PLAYER_COLORS.length]}0c` : "rgba(255,255,255,.02)", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center" }}><ProfileAvatar profile={profile} size={30} /></div><div style={{ marginTop: 3, fontSize: 8, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(profile)}</div><div style={{ color: GOLD, fontSize: 12, fontWeight: 1100 }}>{stats?.handsWon || 0} pt</div><div style={{ color: SOFT, fontSize: 7 }}>{hidden ? "MAIN CACHÉE" : hand?.evaluation?.label || `${hand?.cards?.length || 0} cartes`}</div></div>; })}
        </div>
      </section>

      {state.phase === "throwing" ? <section style={{ ...panel(), padding: 6 }}>
        {config.scoreInputMethod === "dartboard" ? <DartboardClickable multiplier={multiplier} disabled={botThinking || throwDarts.length >= 3 || remainingDarts <= throwDarts.length} onHit={(segment, mult) => addDart(segment, mult)} /> : null}
        <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={() => commitVisit()} centerSlot={centerScore} noticeSlot={keypadNotice} validateAttention={throwDarts.length === 3 || throwDarts.length === remainingDarts} safeBottomPad />
      </section> : null}
    </main>

    {state.pendingChoice ? <ChoiceModal cards={state.pendingChoice.cards} onChoose={chooseCard} /> : null}
    {showRound && state.phase === "round_result" ? <RoundModal state={state} profilesById={profilesById} onNext={nextRound} /> : null}
    {showTimeline ? <TimelineModal state={state} profilesById={profilesById} onClose={() => setShowTimeline(false)} /> : null}
    {showEnd && state.phase === "finished" ? <DartsPokerEnd state={state} profilesById={profilesById} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.players[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "darts_poker" }); }} onHistory={() => { try { onFinish?.(buildHistoryRecord("finished"), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function ChoiceModal({ cards, onChoose }: any) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.86)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panel(), width: "min(420px,100%)", background: "linear-gradient(180deg,#1a1013,#08090d)", borderColor: `${GOLD}66`, textAlign: "center", padding: 16 }}><div style={{ color: GOLD, fontSize: 13, fontWeight: 1100 }}>CHOISIS UNE CARTE</div><div style={{ color: SOFT, fontSize: 9, marginTop: 3 }}>L’autre carte sera défaussée.</div><div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 18 }}>{cards.map((card: PokerCard, index: number) => <CardView key={`${card.id}-${index}`} card={card} onClick={() => onChoose(index)} />)}</div></div></div>;
}

function RoundModal({ state, profilesById, onNext }: any) {
  const round = state.rounds[state.rounds.length - 1];
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.88)", backdropFilter: "blur(8px)", overflow: "auto", padding: 8 }}><div style={{ ...panel(), width: "min(760px,100%)", margin: "12px auto", background: "linear-gradient(180deg,#171014,#07080b)", borderColor: `${GOLD}66`, padding: 14 }}><div style={{ textAlign: "center" }}><div style={{ color: GOLD, fontSize: 11, fontWeight: 1100 }}>SHOWDOWN · MANCHE {round?.round}</div><div style={{ color: "#fff", fontSize: 19, fontWeight: 1200, marginTop: 3 }}>{round?.winnerIds?.length > 1 ? "ÉGALITÉ" : `${playerName(profilesById.get(String(round?.winnerIds?.[0])))} GAGNE`}</div></div><div style={{ marginTop: 12, display: "grid", gap: 7 }}>{round?.rows?.map((row: any) => <div key={row.playerId} style={{ padding: 9, borderRadius: 14, border: `1px solid ${row.win ? GOLD : "rgba(255,255,255,.09)"}`, background: row.win ? `${GOLD}0d` : "rgba(255,255,255,.025)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: row.win ? GOLD : "#fff" }}>#{row.rank} · {playerName(profilesById.get(String(row.playerId)))}</strong><strong style={{ color: GREEN }}>{row.evaluation.label}</strong></div><div style={{ marginTop: 7, display: "flex", gap: 4, overflowX: "auto" }}>{row.bestFive.map((card: PokerCard, index: number) => <CardView key={`${card.id}-${index}`} card={card} small />)}</div></div>)}</div><button onClick={onNext} style={{ ...action(state.roundIndex >= state.config.rounds ? RED : GREEN), width: "100%", marginTop: 12 }}>{state.roundIndex >= state.config.rounds ? "TERMINER LA PARTIE" : "MANCHE SUIVANTE"}</button></div></div>;
}

function TimelineModal({ state, profilesById, onClose }: any) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.86)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panel(), width: "min(820px,100%)", maxHeight: "92dvh", overflow: "auto", background: "linear-gradient(180deg,#111217,#050609)", borderColor: `${BLUE}55` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: BLUE, fontWeight: 1100 }}>JOURNAL DES VOLÉES</div><div style={{ color: SOFT, fontSize: 9 }}>{state.visits.length} volée{state.visits.length > 1 ? "s" : ""}</div></div><button onClick={onClose} style={action("#c9ced8")}>FERMER</button></div><div style={{ marginTop: 10, display: "grid", gap: 6 }}>{[...state.visits].reverse().map((visit) => <div key={visit.id} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 9.5 }}>{playerName(profilesById.get(String(visit.playerId)))} · M{visit.round} · V{visit.visit}</strong><strong style={{ color: GOLD }}>{visit.labels.join(" / ")}</strong></div><div style={{ marginTop: 4, color: "#cfd5df", fontSize: 8.3 }}>{visit.events.map((event) => event.label).join(" · ") || "Aucun effet"}</div></div>)}</div></div></div>;
}
