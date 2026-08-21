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
  isDartsPokerContractCompleted,
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
type WonCardPopup = {
  card: PokerCard;
  dartLabel: string;
  bonusLabel?: string | null;
  beforeStatus?: string | null;
  afterStatus?: string | null;
  impactLabel?: string | null;
  contractLabel?: string | null;
};

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
    dartsPerHand: 6,
    powersEnabled: raw?.powersEnabled !== false, jokerEnabled: raw?.jokerEnabled !== false, contractsEnabled: raw?.contractsEnabled !== false, assistanceEnabled: raw?.assistanceEnabled !== false, autoDrawMissing: true,
    openHands: raw?.openHands !== false, randomOrder: Boolean(raw?.randomOrder), scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function Rules({ config }: { config: DartsPokerConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.45 }}>
    <div><strong style={{ color: GOLD }}>MARCHÉ</strong><br />Les 20 secteurs portent 20 cartes. Une touche prend la carte puis renouvelle immédiatement le secteur.</div>
    <div><strong style={{ color: GREEN }}>POUVOIRS</strong><br />Double : Échange. Triple et Bull : tirer 2 cartes et en choisir 1. DBull : Joker.</div>
    <div><strong style={{ color: RED }}>MAIN</strong><br />{config.dartsPerHand} fléchettes, puis la meilleure combinaison de 5 cartes est calculée automatiquement.</div>
    <div><strong style={{ color: GOLD }}>CONTRAT</strong><br />{config.contractsEnabled ? "Un objectif bonus par manche rapporte 1 point supplémentaire." : "Contrats désactivés pour cette partie."}</div><div><strong style={{ color: BLUE }}>MATCH</strong><br />{config.rounds} manches. Une victoire vaut 1 point. Le classement final se joue au total de points, puis aux victoires.</div>
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
  const [wonCardPopup, setWonCardPopup] = React.useState<WonCardPopup | null>(null);
  const [quickPanel, setQuickPanel] = React.useState<null | "active" | "market" | "table" | "stats" | "objectives" | "dartboard">(null);
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
    if (botThinking || state.phase !== "throwing" || remainingDarts <= 0 || wonCardPopup) return;
    const hit: UiDart = { v: Number(v) || 0, mult: (mult || multiplier) as 1 | 2 | 3 };
    setThrowDarts([hit]);
    setNotice(`${dartsPokerDartLabel(uiToGameDart(hit))} prêt à valider.`);
  }
  function commitVisit(source?: UiDart[]) {
    const hit = (source || throwDarts)[0];
    if (!hit || state.phase !== "throwing" || remainingDarts <= 0) return;
    setUndoStack((prev) => [...prev.slice(-29), cloneDartsPokerState(state)]);
    const next = playDartsPokerVisit(state, [uiToGameDart(hit)]);
    setState(next); setThrowDarts([]); setMultiplier(1);
    const visit = next.visits[next.visits.length - 1];
    const cardEvent = visit?.events?.find((event) => Boolean(event.card) && (event.type === "market_card" || event.type === "joker"));
    const bonusLabel = visit?.events
      ?.filter((event) => event.type === "exchange_token" || event.type === "choice_token")
      .map((event) => event.label)
      .join(" · ");
    if (cardEvent?.card) {
      const beforeCards = visit?.cardsBefore || [];
      const afterCards = visit?.cardsAfter || [];
      const beforeStatus = describeHandSnapshot(beforeCards);
      const afterStatus = describeHandSnapshot(afterCards);
      const afterEvaluation = evaluateBestPokerHand(afterCards);
      const contractDone = state.roundContract
        ? (state.roundContract.key === "joker" ? afterCards.some((card) => Boolean(card?.joker)) : isDartsPokerContractCompleted(state.roundContract, afterEvaluation, afterCards))
        : false;
      setWonCardPopup({
        card: cardEvent.card,
        dartLabel: visit?.labels?.[0] || dartsPokerDartLabel(uiToGameDart(hit)),
        bonusLabel: bonusLabel || null,
        beforeStatus,
        afterStatus,
        impactLabel: describeCardImpact(beforeCards, afterCards, cardEvent.card),
        contractLabel: contractDone && state.roundContract ? `CONTRAT VALIDÉ · ${state.roundContract.label}` : null,
      });
    }
    setNotice(visit?.events?.map((event) => event.label).join(" · ") || "Fléchette validée.");
  }
  function cancelOrUndo() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice("Saisie effacée."); return; }
    const previous = undoStack[undoStack.length - 1];
    if (!previous) { setNotice("Aucune action à annuler."); return; }
    setState(previous); setUndoStack((prev) => prev.slice(0, -1)); setShowRound(false); setShowEnd(false); setWonCardPopup(null); autoSavedRef.current = ""; setNotice("Dernière action annulée.");
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
    autoSavedRef.current = ""; setState(createDartsPokerState(players, config)); setThrowDarts([]); setUndoStack([]); setShowRound(false); setShowEnd(false); setWonCardPopup(null); setNotice("Nouvelle table ouverte.");
  }

  React.useEffect(() => {
    if (!activePlayer || !isBot(activeProfile, botIds) || botThinking || wonCardPopup || state.phase === "round_result" || state.phase === "finished") return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      let next = state;
      if (next.phase === "throwing") {
        const hand = getDartsPokerActiveHand(next); const remaining = Math.max(0, config.dartsPerHand - Number(hand?.dartsUsed || 0));
        const count = Math.min(1, remaining); const target = pickBestPokerMarketSector(next, activePlayer.id);
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
  }, [state.phase, state.activePlayerIndex, activeHand?.dartsUsed, activeHand?.choiceTokens, activeHand?.exchangeTokens, state.roundIndex, wonCardPopup]);

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
      totalPoints: playerRows.reduce((sum, row) => sum + Number(row.roundPoints || 0), 0),
      contractsCompleted: playerRows.reduce((sum, row) => sum + Number(row.contractHits || 0), 0),
      contractBonusPoints: playerRows.reduce((sum, row) => sum + Number(row.contractBonusPoints || 0), 0),
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
      contractsEnabled: config.contractsEnabled !== false,
      players: playerRows, perPlayer: playerRows, rankings: finished ? playerRows.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)) : [],
      rounds: state.rounds, visits: state.visits, matchStats, config,
      scoreLine: `${state.rounds.length}/${config.rounds} manches · ${matchStats.totalPoints} points · ${matchStats.contractsCompleted} contrats`,
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

  const selectedHitLabel = throwDarts[0] ? dartsPokerDartLabel(uiToGameDart(throwDarts[0])) : "—";
  const centerScore = <div style={{ textAlign: "center", minWidth: 58 }}><div style={{ color: throwDarts[0] ? GOLD : SOFT, fontSize: 22, fontWeight: 1200, lineHeight: 1 }}>{selectedHitLabel}</div><div style={{ color: SOFT, fontSize: 8, fontWeight: 1000, marginTop: 3 }}>{remainingDarts} fléchette{remainingDarts > 1 ? "s" : ""} restante{remainingDarts > 1 ? "s" : ""}</div></div>;
  const keypadNotice = <div style={{ color: state.phase === "powers" ? GOLD : SOFT, fontSize: 9, fontWeight: 900, textAlign: "center", lineHeight: 1.3 }}>{botThinking ? "BOT EN RÉFLEXION…" : notice}</div>;
  const assistanceEnabled = config.assistanceEnabled !== false;
  const marketTargets = assistanceEnabled ? rankMarketSuggestions(state, String(activePlayer?.id || ""), 4) : [];
  const bestTarget = marketTargets[0] || null;
  const objective = buildPokerObjectiveHint(state, String(activePlayer?.id || ""), liveEvaluation, remainingDarts);
  const activeAccuracy = pct(Number(activeStats?.hits || 0), Number(activeStats?.darts || 0));
  const handSnapshot = describeHandSnapshot(activeHand?.cards || []);
  const contractLive = describeContractLiveState(state.roundContract, activeHand?.cards || []);
  const quickColumns = config.scoreInputMethod === "dartboard" ? 4 : 3;

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: "radial-gradient(circle at 50% -10%,rgba(232,58,67,.25),#08090d 42%,#020203 100%)", overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerDartsPoker} tickerAlt="DARTS POKER" tickerHeight={84} tickerBottomGap={8} left={<BackDot onClick={backToConfig} color={GOLD} glow={`${GOLD}88`} />} right={<InfoDot title="Règles DARTS POKER" color={RED} glow={`${RED}88`} content={<Rules config={config} />} />} />
    <main style={{ width: "min(980px,100%)", margin: "0 auto", padding: "4px 8px 10px", boxSizing: "border-box", display: "grid", gap: 6 }}>
      <section style={{ ...panel(), display: "grid", gridTemplateColumns: "46px minmax(0,1fr) auto", gap: 8, alignItems: "center", borderColor: `${activeColor}55`, padding: 8 }}>
        <ProfileAvatar profile={activeProfile} size={42} />
        <button type="button" onClick={() => setQuickPanel("active")} style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", minWidth: 0, cursor: "pointer", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
            <div style={{ color: activeColor, fontSize: 12, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(activeProfile)}{state.activePlayerIndex === state.dealerIndex ? <span style={{ marginLeft: 6, color: GOLD, fontSize: 7.5, border: `1px solid ${GOLD}66`, borderRadius: 999, padding: "2px 5px" }}>DEALER</span> : null}</div>
            <div style={{ color: SOFT, fontSize: 8, whiteSpace: "nowrap" }}>M{state.roundIndex}/{config.rounds} · F{Math.min(config.dartsPerHand, Number(activeHand?.dartsUsed || 0) + 1)}/{config.dartsPerHand}</div>
          </div>
          <div style={{ marginTop: 5, display: "flex", gap: 4, alignItems: "center", minHeight: 36 }}>
            {Array.from({ length: 5 }, (_, index) => <MiniHandCard key={index} card={activeHand?.cards?.[index] || null} />)}
          </div>
          <div style={{ marginTop: 4, display: "flex", gap: 5, alignItems: "center", minWidth: 0 }}>
            <span style={{ color: liveEvaluation ? GREEN : GOLD, fontSize: 7.8, fontWeight: 1050, whiteSpace: "nowrap" }}>{handSnapshot}</span>
            {state.roundContract ? <span style={{ color: contractLive.done ? GREEN : SOFT, fontSize: 7.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contractLive.done ? "◆ CONTRAT OK" : `◆ ${contractLive.label}`}</span> : null}
          </div>
        </button>
        <div style={{ display: "grid", gap: 5, justifyItems: "end" }}>
          <div style={{ display: "flex", gap: 5 }}>
            <TinyIconButton accent={BLUE} label="Journal" onClick={() => setShowTimeline(true)}><IconList /></TinyIconButton>
            <TinyIconButton accent={RED} label="Undo" onClick={cancelOrUndo}><IconUndo /></TinyIconButton>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <span title="Jetons échange" style={{ borderRadius: 999, padding: "3px 6px", color: BLUE, border: `1px solid ${BLUE}55`, fontSize: 7.5, fontWeight: 1000 }}>↔ {activeHand?.exchangeTokens || 0}</span>
            <span title="Jetons choix" style={{ borderRadius: 999, padding: "3px 6px", color: GOLD, border: `1px solid ${GOLD}55`, fontSize: 7.5, fontWeight: 1000 }}>✦ {activeHand?.choiceTokens || 0}</span>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 128px", gap: 6 }}>
        <button type="button" onClick={() => setQuickPanel("objectives")} style={{ ...panel(), padding: 8, textAlign: "left", cursor: "pointer", minWidth: 0, color: "inherit" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div style={{ color: GOLD, fontSize: 9, fontWeight: 1100, letterSpacing: .7 }}>{state.roundContract ? "CONTRAT DE MANCHE" : "OBJECTIF"}</div>
            <IconTarget />
          </div>
          <div style={{ color: "#fff", fontSize: 10.5, fontWeight: 950, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.roundContract?.label || objective.title}</div>
          <div style={{ color: SOFT, fontSize: 8.2, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.roundContract ? `${contractLive.done ? "✓ VALIDÉ" : `+${state.roundContract.bonusPoints} pt`} · ${state.roundContract.description}` : assistanceEnabled && bestTarget ? `Conseil : S${bestTarget.sector} · ${pokerCardLabel(bestTarget.card)}` : objective.description}</div>
          {assistanceEnabled && bestTarget ? <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: GOLD, fontSize: 8, fontWeight: 1100 }}>CIBLE PRIORITAIRE</span><span style={{ color: "#fff", fontSize: 9, fontWeight: 1100 }}>S{bestTarget.sector}</span><span style={{ color: SOFT, fontSize: 8 }}>{pokerCardLabel(bestTarget.card)}</span><span style={{ color: bestTarget.contractMatch ? GREEN : BLUE, fontSize: 7.5 }}>{bestTarget.contractMatch ? "CONTRAT" : "MAIN"}</span></div> : null}
        </button>
        <div style={{ ...panel(), padding: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 4 }}>
            <MiniStat label="PTS" value={`${activeStats?.roundPoints || 0}`} color={GOLD} compact />
            <MiniStat label="PRÉC" value={`${activeAccuracy}%`} color={GREEN} compact />
            <MiniStat label="CARTES" value={`${activeHand?.cards?.length || 0}/5`} color={BLUE} compact />
            <MiniStat label="RESTE" value={`${remainingDarts}`} color={RED} compact />
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: `repeat(${quickColumns},minmax(0,1fr))`, gap: 5 }}>
        <QuickLauncher label="MARCHÉ" value={`${state.deck.length}`} accent={GOLD} icon={<IconGrid />} onClick={() => setQuickPanel("market")} />
        <QuickLauncher label="TABLE" value={`${state.players.length}`} accent={RED} icon={<IconTable />} onClick={() => setQuickPanel("table")} />
        <QuickLauncher label="STATS" value={`${state.visits.length}`} accent={GREEN} icon={<IconStats />} onClick={() => setQuickPanel("stats")} />
        {config.scoreInputMethod === "dartboard" ? <QuickLauncher label="CIBLE" value="OUVRIR" accent={BLUE} icon={<IconTarget />} onClick={() => setQuickPanel("dartboard")} /> : null}
      </section>

      <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts([])} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={() => commitVisit()} centerSlot={centerScore} noticeSlot={keypadNotice} validateAttention={throwDarts.length === 1} hidePreview safeBottomPad />
    </main>

    {wonCardPopup ? <WonCardModal popup={wonCardPopup} onClose={() => setWonCardPopup(null)} /> : null}
    {state.pendingChoice ? <ChoiceModal cards={state.pendingChoice.cards} onChoose={chooseCard} /> : null}
    {showRound && state.phase === "round_result" ? <RoundModal state={state} profilesById={profilesById} onNext={nextRound} /> : null}
    {showTimeline ? <TimelineModal state={state} profilesById={profilesById} onClose={() => setShowTimeline(false)} /> : null}
    {quickPanel === "active" ? <ActivePlayerModal state={state} activeProfile={activeProfile} activePlayer={activePlayer} activeHand={activeHand} activeColor={activeColor} activeStats={activeStats} liveEvaluation={liveEvaluation} onClose={() => setQuickPanel(null)} onExchange={exchangeCard} onChoice={useChoice} onValidate={validateHand} /> : null}
    {quickPanel === "market" ? <MarketModal state={state} suggestions={marketTargets} assistanceEnabled={assistanceEnabled} onClose={() => setQuickPanel(null)} /> : null}
    {quickPanel === "table" ? <TableModal state={state} profilesById={profilesById} config={config} onClose={() => setQuickPanel(null)} /> : null}
    {quickPanel === "stats" ? <LiveStatsModal state={state} profilesById={profilesById} onClose={() => setQuickPanel(null)} /> : null}
    {quickPanel === "objectives" ? <ObjectivesModal objective={objective} contract={state.roundContract} suggestions={marketTargets} assistanceEnabled={assistanceEnabled} onClose={() => setQuickPanel(null)} /> : null}
    {quickPanel === "dartboard" ? <DartboardPanel multiplier={multiplier} onSetMultiplier={setMultiplier} disabled={botThinking || throwDarts.length >= 1 || remainingDarts <= 0 || Boolean(wonCardPopup)} onHit={(segment, mult) => addDart(segment, mult)} onClose={() => setQuickPanel(null)} /> : null}
    {showEnd && state.phase === "finished" ? <DartsPokerEnd state={state} profilesById={profilesById} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.players[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "darts_poker" }); }} onHistory={() => { try { onFinish?.(buildHistoryRecord("finished"), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function TinyIconButton({ accent, label, onClick, children }: any) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, display: "grid", placeItems: "center", padding: 0, cursor: "pointer" }}>{children}</button>;
}

function MiniHandCard({ card }: { card: PokerCard | null }) {
  if (!card) return <span style={{ width: 28, height: 36, borderRadius: 7, border: "1px dashed rgba(255,255,255,.20)", background: "rgba(255,255,255,.02)", flex: "0 0 auto" }} />;
  const red = card.suit === "H" || card.suit === "D";
  return <span style={{ position: "relative", width: 28, height: 36, borderRadius: 7, border: `1px solid ${card.joker ? GOLD : "rgba(255,255,255,.35)"}`, background: card.joker ? "linear-gradient(145deg,#17161d,#6d1721)" : "linear-gradient(145deg,#fff,#e8e8eb)", color: card.joker ? GOLD : red ? "#c3172b" : "#111", boxShadow: "0 3px 8px rgba(0,0,0,.30)", flex: "0 0 auto" }}><b style={{ position: "absolute", left: 3, top: 2, fontSize: 8, lineHeight: 1 }}>{card.joker ? "J" : pokerRankLabel(card.rank)}</b><span style={{ display: "grid", height: "100%", placeItems: "center", fontSize: 16 }}>{card.joker ? "★" : pokerSuitSymbol(card.suit)}</span></span>;
}

function QuickLauncher({ label, value, accent, icon, onClick }: any) {
  return <button type="button" onClick={onClick} style={{ minWidth: 0, minHeight: 50, borderRadius: 13, border: `1px solid ${accent}66`, background: `${accent}12`, color: "#fff", padding: "5px 4px", textAlign: "center" }}><div style={{ display: "grid", placeItems: "center", color: accent }}>{icon}</div><div style={{ color: accent, fontSize: 8, fontWeight: 1100, marginTop: 2 }}>{label}</div><div style={{ color: SOFT, fontSize: 7.3, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></button>;
}

function MiniStat({ label, value, color, compact = false }: any) {
  return <div style={{ minWidth: 0, padding: compact ? 4 : 6, borderRadius: compact ? 9 : 11, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", textAlign: "center" }}><div style={{ color, fontSize: compact ? 10 : 11, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div><div style={{ color: SOFT, fontSize: compact ? 6.2 : 6.8, fontWeight: 950 }}>{label}</div></div>;
}

function IconShell({ children }: any) { return <span style={{ width: 17, height: 17, display: "inline-grid", placeItems: "center" }}>{children}</span>; }
function IconGrid() { return <IconShell><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg></IconShell>; }
function IconTarget() { return <IconShell><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg></IconShell>; }
function IconTable() { return <IconShell><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/><path d="M8 4v16"/><path d="M16 4v16"/></svg></IconShell>; }
function IconStats() { return <IconShell><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19V10"/><path d="M12 19V5"/><path d="M19 19v-8"/></svg></IconShell>; }
function IconList() { return <IconShell><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></svg></IconShell>; }
function IconUndo() { return <IconShell><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 8 5 12l4 4"/><path d="M5 12h8a6 6 0 1 1 0 12"/></svg></IconShell>; }


function WonCardModal({ popup, onClose }: { popup: WonCardPopup; onClose: () => void }) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.86)", backdropFilter: "blur(9px)", display: "grid", placeItems: "center", padding: 12 }}>
    <div onClick={(event) => event.stopPropagation()} style={{ ...panel(), width: "min(360px,100%)", padding: 17, textAlign: "center", borderColor: `${GOLD}88`, background: "radial-gradient(circle at 50% 0%,rgba(246,194,86,.13),#211317 26%,#08090d 72%)", boxShadow: `0 0 38px ${GOLD}28, 0 22px 64px rgba(0,0,0,.68)` }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 7 }}><span style={{ color: GOLD, fontSize: 15 }}>♠</span><div style={{ color: GOLD, fontSize: 11, fontWeight: 1100, letterSpacing: 1 }}>CARTE REMPORTÉE</div><span style={{ color: RED, fontSize: 15 }}>♥</span></div>
      <div style={{ color: SOFT, fontSize: 9, marginTop: 3 }}>{popup.dartLabel}</div>
      <div style={{ marginTop: 13, display: "flex", justifyContent: "center", transform: "scale(1.28)", transformOrigin: "center" }}><CardView card={popup.card} /></div>
      <div style={{ color: "#fff", fontSize: 19, fontWeight: 1200, marginTop: 23 }}>{pokerCardLabel(popup.card)}</div>
      {popup.impactLabel ? <div style={{ color: GREEN, fontSize: 10, fontWeight: 1050, marginTop: 5 }}>{popup.impactLabel}</div> : null}
      {(popup.beforeStatus || popup.afterStatus) ? <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 7, alignItems: "center", padding: 8, borderRadius: 12, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><div><div style={{ color: SOFT, fontSize: 7 }}>AVANT</div><div style={{ color: "#fff", fontSize: 9, fontWeight: 950 }}>{popup.beforeStatus || "—"}</div></div><div style={{ color: GOLD, fontSize: 15 }}>→</div><div><div style={{ color: SOFT, fontSize: 7 }}>APRÈS</div><div style={{ color: GOLD, fontSize: 9, fontWeight: 1050 }}>{popup.afterStatus || "—"}</div></div></div> : null}
      {popup.bonusLabel ? <div style={{ color: BLUE, fontSize: 9, fontWeight: 1000, marginTop: 8 }}>{popup.bonusLabel}</div> : null}
      {popup.contractLabel ? <div style={{ color: GREEN, fontSize: 9, fontWeight: 1100, marginTop: 6, borderRadius: 999, padding: "5px 8px", border: `1px solid ${GREEN}55`, background: `${GREEN}0c` }}>{popup.contractLabel}</div> : null}
      <button type="button" onClick={onClose} style={{ ...action(GOLD), width: "100%", marginTop: 13 }}>CONTINUER</button>
    </div>
  </div>;
}

function ChoiceModal({ cards, onChoose }: any) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.86)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panel(), width: "min(420px,100%)", background: "linear-gradient(180deg,#1a1013,#08090d)", borderColor: `${GOLD}66`, textAlign: "center", padding: 16 }}><div style={{ color: GOLD, fontSize: 13, fontWeight: 1100 }}>CHOISIS UNE CARTE</div><div style={{ color: SOFT, fontSize: 9, marginTop: 3 }}>L’autre carte sera défaussée.</div><div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 18 }}>{cards.map((card: PokerCard, index: number) => <CardView key={`${card.id}-${index}`} card={card} onClick={() => onChoose(index)} />)}</div></div></div>;
}

function RoundModal({ state, profilesById, onNext }: any) {
  const round = state.rounds[state.rounds.length - 1];
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.88)", backdropFilter: "blur(8px)", overflow: "auto", padding: 8 }}><div style={{ ...panel(), width: "min(760px,100%)", margin: "12px auto", background: "linear-gradient(180deg,#171014,#07080b)", borderColor: `${GOLD}66`, padding: 14 }}>
    <div style={{ textAlign: "center" }}><div style={{ color: GOLD, fontSize: 11, fontWeight: 1100 }}>SHOWDOWN · MANCHE {round?.round}</div><div style={{ color: "#fff", fontSize: 19, fontWeight: 1200, marginTop: 3 }}>{round?.winnerIds?.length > 1 ? "ÉGALITÉ" : `${playerName(profilesById.get(String(round?.winnerIds?.[0])))} GAGNE`}</div></div>
    {round?.contract ? <div style={{ marginTop: 10, padding: 9, borderRadius: 13, textAlign: "center", border: `1px solid ${GOLD}55`, background: `${GOLD}0d` }}><div style={{ color: GOLD, fontSize: 8.5, fontWeight: 1100 }}>CONTRAT DE MANCHE · +{round.contract.bonusPoints} PT</div><div style={{ color: "#fff", fontWeight: 1050, marginTop: 3 }}>{round.contract.label}</div></div> : null}
    <div style={{ marginTop: 12, display: "grid", gap: 7 }}>{round?.rows?.map((row: any) => <div key={row.playerId} style={{ padding: 9, borderRadius: 14, border: `1px solid ${row.win ? GOLD : row.contractCompleted ? GREEN : "rgba(255,255,255,.09)"}`, background: row.win ? `${GOLD}0d` : row.contractCompleted ? `${GREEN}09` : "rgba(255,255,255,.025)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ color: row.win ? GOLD : "#fff" }}>#{row.rank} · {playerName(profilesById.get(String(row.playerId)))}</strong><div style={{ textAlign: "right" }}><strong style={{ color: GREEN }}>{row.evaluation.label}</strong><div style={{ color: GOLD, fontSize: 8, marginTop: 2 }}>+{row.pointsAwarded || 0} pt{Number(row.pointsAwarded || 0) > 1 ? "s" : ""}{row.contractCompleted ? " · CONTRAT ✓" : ""}</div></div></div>
      <div style={{ marginTop: 7, display: "flex", gap: 4, overflowX: "auto" }}>{row.bestFive.map((card: PokerCard, index: number) => <CardView key={`${card.id}-${index}`} card={card} small />)}</div>
    </div>)}</div>
    <button onClick={onNext} style={{ ...action(state.roundIndex >= state.config.rounds ? RED : GREEN), width: "100%", marginTop: 12 }}>{state.roundIndex >= state.config.rounds ? "TERMINER LA PARTIE" : "MANCHE SUIVANTE"}</button>
  </div></div>;
}

function TimelineModal({ state, profilesById, onClose }: any) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.86)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panel(), width: "min(820px,100%)", maxHeight: "92dvh", overflow: "auto", background: "linear-gradient(180deg,#111217,#050609)", borderColor: `${BLUE}55` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: BLUE, fontWeight: 1100 }}>JOURNAL DES LANCERS</div><div style={{ color: SOFT, fontSize: 9 }}>{state.visits.length} lancer{state.visits.length > 1 ? "s" : ""}</div></div><button onClick={onClose} style={action("#c9ced8")}>FERMER</button></div><div style={{ marginTop: 10, display: "grid", gap: 6 }}>{[...state.visits].reverse().map((visit) => <div key={visit.id} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 9.5 }}>{playerName(profilesById.get(String(visit.playerId)))} · M{visit.round} · L{visit.visit}</strong><strong style={{ color: GOLD }}>{visit.labels.join(" / ")}</strong></div><div style={{ marginTop: 4, color: "#cfd5df", fontSize: 8.3 }}>{visit.events.map((event) => event.label).join(" · ") || "Aucun effet"}</div></div>)}</div></div></div>;
}

function FloatingPanel({ title, subtitle, onClose, children, accent = GOLD, width = "min(760px,100%)" }: any) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.86)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panel(), width, maxHeight: "92dvh", overflow: "auto", background: "linear-gradient(180deg,#13141a,#050609)", borderColor: `${accent}66`, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><div><div style={{ color: accent, fontSize: 12, fontWeight: 1100 }}>{title}</div>{subtitle ? <div style={{ color: SOFT, fontSize: 9, marginTop: 2 }}>{subtitle}</div> : null}</div><button onClick={onClose} style={{ ...action("#c9ced8"), minHeight: 36, padding: "0 12px", fontSize: 8 }}>FERMER</button></div><div style={{ marginTop: 12 }}>{children}</div></div></div>;
}

function ActivePlayerModal({ state, activeProfile, activePlayer, activeHand, activeColor, activeStats, liveEvaluation, onClose, onExchange, onChoice, onValidate }: any) {
  return <FloatingPanel title="Bloc joueur actif" subtitle={playerName(activeProfile)} accent={activeColor} onClose={onClose} width="min(720px,100%)"><div style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 10, alignItems: "center" }}><ProfileAvatar profile={activeProfile || activePlayer} size={52} /><div><div style={{ color: activeColor, fontWeight: 1100 }}>{playerName(activeProfile || activePlayer)}</div><div style={{ color: liveEvaluation ? GREEN : SOFT, fontSize: 10, marginTop: 3 }}>{liveEvaluation?.label || "Aucune combinaison encore verrouillée"}</div></div></div><div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>{(activeHand?.cards || []).map((card: PokerCard, index: number) => <CardView key={`${card.id}-${index}`} card={card} selected={state.phase === "powers" && (activeHand?.exchangeTokens || 0) > 0 && !card.joker} onClick={state.phase === "powers" && (activeHand?.exchangeTokens || 0) > 0 && !card.joker ? () => onExchange(index) : undefined} badge={state.phase === "powers" && (activeHand?.exchangeTokens || 0) > 0 && !card.joker ? "ÉCH." : undefined} />)}</div><div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}><MiniStat label="Points" value={`${activeStats?.roundPoints || 0}`} color={GOLD} /><MiniStat label="Précision" value={`${pct(activeStats?.hits || 0, activeStats?.darts || 0)}%`} color={GREEN} /><MiniStat label="Échanges" value={`${activeHand?.exchangeTokens || 0}`} color={BLUE} /><MiniStat label="Contrats" value={`${activeStats?.contractHits || 0}`} color={RED} /></div>{state.phase === "powers" ? <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><button disabled={!activeHand?.choiceTokens || !!state.pendingChoice} onClick={onChoice} style={{ ...action(GOLD), opacity: activeHand?.choiceTokens ? 1 : .4 }}>✦ UTILISER UN CHOIX</button><button onClick={onValidate} style={action(GREEN)}>✓ VALIDER LA MAIN</button></div> : null}</FloatingPanel>;
}

function MarketModal({ state, suggestions, assistanceEnabled, onClose }: any) {
  const bestSectors = new Set((suggestions || []).map((item: any) => Number(item.sector)));
  return <FloatingPanel title="Marché des 20 cartes" subtitle={assistanceEnabled ? "Lecture stratégique du marché en temps réel" : "20 cartes visibles · une carte remplacée après chaque prise"} accent={GOLD} onClose={onClose} width="min(880px,100%)">
    {assistanceEnabled && suggestions?.length ? <div style={{ marginBottom: 11 }}><div style={{ color: SOFT, fontSize: 8, fontWeight: 1000, marginBottom: 6 }}>TOP CIBLES</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>{suggestions.map((item: any, index: number) => <div key={item.sector} style={{ padding: 8, borderRadius: 13, border: `1px solid ${index === 0 ? GOLD : "rgba(255,255,255,.10)"}`, background: index === 0 ? `${GOLD}10` : "rgba(255,255,255,.025)", display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 7, alignItems: "center" }}><CardView card={item.card} small /><div style={{ minWidth: 0 }}><div style={{ color: index === 0 ? GOLD : "#fff", fontSize: 10, fontWeight: 1100 }}>S{item.sector} · {pokerCardLabel(item.card)}</div><div style={{ color: item.contractMatch ? GREEN : SOFT, fontSize: 7.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.contractMatch ? "Priorité contrat" : item.reason}</div></div></div>)}</div></div> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 7 }}>{Array.from({ length: 20 }, (_, i) => i + 1).map((sector) => { const hot = assistanceEnabled && bestSectors.has(sector); const rank = (suggestions || []).findIndex((item: any) => Number(item.sector) === sector); return <div key={sector} style={{ minWidth: 0, textAlign: "center", padding: "6px 2px", borderRadius: 12, background: hot ? `${GOLD}0e` : "rgba(255,255,255,.025)", border: `1px solid ${hot ? GOLD : "rgba(255,255,255,.08)"}`, position: "relative" }}>{hot ? <div style={{ position: "absolute", right: 4, top: 4, width: 17, height: 17, borderRadius: 999, display: "grid", placeItems: "center", background: GOLD, color: "#111", fontSize: 7.5, fontWeight: 1200 }}>{rank + 1}</div> : null}<div style={{ color: hot ? GOLD : "#fff", fontSize: 10, fontWeight: 1100 }}>{sector}</div><div style={{ display: "flex", justifyContent: "center", marginTop: 5 }}><CardView card={state.market[sector]} small /></div></div>; })}</div>
  </FloatingPanel>;
}

function TableModal({ state, profilesById, config, onClose }: any) {
  return <FloatingPanel title="Table & classement live" subtitle={`Manche ${state.roundIndex}/${config.rounds}`} accent={RED} onClose={onClose} width="min(760px,100%)"><div style={{ display: "grid", gap: 7 }}>{state.players.map((player: any, index: number) => { const hand = state.handsByPlayer[player.id]; const stats = state.statsByPlayer[player.id]; const profile = profilesById.get(player.id) || player; const active = index === state.activePlayerIndex; const hidden = !config.openHands && !active && state.phase !== "round_result" && state.phase !== "finished"; return <div key={player.id} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) repeat(3,minmax(56px,auto))", gap: 7, alignItems: "center", padding: 8, borderRadius: 14, border: `1px solid ${active ? PLAYER_COLORS[index % PLAYER_COLORS.length] : "rgba(255,255,255,.09)"}`, background: active ? `${PLAYER_COLORS[index % PLAYER_COLORS.length]}0d` : "rgba(255,255,255,.025)" }}><ProfileAvatar profile={profile} size={38} /><div style={{ minWidth: 0 }}><div style={{ color: active ? PLAYER_COLORS[index % PLAYER_COLORS.length] : "#fff", fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(profile)}{index === state.dealerIndex ? <span style={{ marginLeft: 5, color: GOLD, fontSize: 7 }}>● DEALER</span> : null}</div><div style={{ color: SOFT, fontSize: 8.2 }}>{hidden ? "Main cachée" : hand?.evaluation?.label || `${hand?.cards?.length || 0} cartes`}</div></div><MiniStat label="PTS" value={`${stats?.roundPoints || 0}`} color={GOLD} /><MiniStat label="PRÉC." value={`${pct(stats?.hits || 0, stats?.darts || 0)}%`} color={GREEN} /><MiniStat label="CARTES" value={`${hand?.cards?.length || 0}`} color={BLUE} /></div>; })}</div></FloatingPanel>;
}

function LiveStatsModal({ state, profilesById, onClose }: any) {
  return <FloatingPanel title="Statistiques live" subtitle="Résumé rapide de la partie en cours" accent={GREEN} onClose={onClose} width="min(760px,100%)"><div style={{ display: "grid", gap: 8 }}>{state.players.map((player: any) => { const stats = state.statsByPlayer[player.id] || {}; const profile = profilesById.get(player.id) || player; return <div key={player.id} style={{ padding: 9, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><ProfileAvatar profile={profile} size={34} /><div style={{ color: "#fff", fontWeight: 1100 }}>{playerName(profile)}</div></div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}><MiniStat label="Points" value={`${stats.roundPoints || 0}`} color={GOLD} /><MiniStat label="Préc." value={`${pct(stats.hits || 0, stats.darts || 0)}%`} color={GREEN} /><MiniStat label="Contrats" value={`${stats.contractHits || 0}`} color={RED} /><MiniStat label="Lancers" value={`${stats.visits || 0}`} color={BLUE} /></div></div>; })}</div></FloatingPanel>;
}

function ObjectivesModal({ objective, contract, suggestions, assistanceEnabled, onClose }: any) {
  return <FloatingPanel title="Contrat & stratégie" subtitle={assistanceEnabled ? "Objectif bonus + lecture du marché" : "Objectif de manche"} accent={GOLD} onClose={onClose} width="min(720px,100%)">
    {contract ? <div style={{ padding: 11, borderRadius: 14, background: `${GOLD}10`, border: `1px solid ${GOLD}55` }}><div style={{ color: GOLD, fontSize: 9, fontWeight: 1100 }}>CONTRAT · +{contract.bonusPoints} POINT</div><div style={{ color: "#fff", fontWeight: 1100, marginTop: 4 }}>{contract.label}</div><div style={{ color: SOFT, fontSize: 10, lineHeight: 1.45, marginTop: 5 }}>{contract.description}</div></div> : null}
    <div style={{ marginTop: contract ? 8 : 0, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color: "#fff", fontWeight: 1100 }}>{objective.title}</div><div style={{ color: SOFT, fontSize: 10, lineHeight: 1.45, marginTop: 5 }}>{objective.description}</div></div>
    {assistanceEnabled ? <div style={{ marginTop: 12, display: "grid", gap: 7 }}>{suggestions.map((item: any, index: number) => <div key={`${item.sector}-${index}`} style={{ display: "grid", gridTemplateColumns: "64px minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: 8, borderRadius: 13, background: index === 0 ? `${GOLD}0e` : "rgba(255,255,255,.025)", border: `1px solid ${index === 0 ? GOLD : "rgba(255,255,255,.08)"}` }}><div style={{ textAlign: "center" }}><div style={{ color: index === 0 ? GOLD : SOFT, fontSize: 8.5, fontWeight: 1100 }}>SECTEUR {item.sector}</div><div style={{ marginTop: 5, display: "flex", justifyContent: "center" }}><CardView card={item.card} small /></div></div><div><div style={{ color: "#fff", fontWeight: 1000 }}>{index === 0 ? "Meilleur choix" : `Alternative ${index}`}</div><div style={{ color: SOFT, fontSize: 9, marginTop: 3 }}>{item.reason}</div></div><div style={{ color: item.contractMatch ? GREEN : BLUE, border: `1px solid ${item.contractMatch ? GREEN : BLUE}55`, borderRadius: 999, padding: "4px 6px", fontSize: 7, fontWeight: 1050 }}>{item.contractMatch ? "CONTRAT" : "MAIN"}</div></div>)}</div> : <div style={{ marginTop: 10, color: SOFT, fontSize: 9, textAlign: "center" }}>Conseils stratégiques désactivés dans la configuration.</div>}
  </FloatingPanel>;
}

function DartboardPanel({ multiplier, onSetMultiplier, disabled, onHit, onClose }: any) {
  return <FloatingPanel title="Cible interactive" subtitle="Touchez le secteur voulu" accent={BLUE} onClose={onClose} width="min(620px,100%)"><div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10 }}><button onClick={() => onSetMultiplier(1)} style={{ ...action(multiplier === 1 ? GREEN : "#c9ced8"), minHeight: 36, padding: "0 12px", fontSize: 8 }}>SIMPLE</button><button onClick={() => onSetMultiplier(2)} style={{ ...action(multiplier === 2 ? RED : "#c9ced8"), minHeight: 36, padding: "0 12px", fontSize: 8 }}>DOUBLE</button><button onClick={() => onSetMultiplier(3)} style={{ ...action(multiplier === 3 ? GOLD : "#c9ced8"), minHeight: 36, padding: "0 12px", fontSize: 8 }}>TRIPLE</button></div><DartboardClickable multiplier={multiplier} disabled={disabled} onHit={onHit} /></FloatingPanel>;
}

function rankMarketSuggestions(state: DartsPokerState, playerId: string, count = 4) {
  const hand = state.handsByPlayer[playerId] || { cards: [] } as any;
  const suggestions = Array.from({ length: 20 }, (_, i) => i + 1).map((sector) => {
    const card = state.market[sector] || null;
    if (!card) return null;
    const futureCards = [...(hand.cards || []), card];
    const futureEval = futureCards.length >= 5 ? evaluateBestPokerHand(futureCards) : null;
    const rankCounts = new Map<number, number>();
    const suitCounts = new Map<string, number>();
    futureCards.filter((c: any) => !c?.joker).forEach((c: any) => { rankCounts.set(c.rank, (rankCounts.get(c.rank) || 0) + 1); suitCounts.set(String(c.suit), (suitCounts.get(String(c.suit)) || 0) + 1); });
    const bestRank = Math.max(0, ...Array.from(rankCounts.values()));
    const bestSuit = Math.max(0, ...Array.from(suitCounts.values()));
    const contract = state.roundContract;
    const contractMatch = contract ? (contract.key === "joker" ? Boolean(card.joker) || futureCards.some((c: any) => c?.joker) : Boolean(futureEval && isDartsPokerContractCompleted(contract, futureEval, futureCards))) : false;
    let contractBoost = contractMatch ? 900000000 : 0;
    if (contract && !contractMatch) {
      if (contract.key === "flush") contractBoost += bestSuit * 80000;
      if (["pair", "two_pair", "three_of_a_kind", "full_house"].includes(contract.key)) contractBoost += bestRank * 110000;
    }
    const score = contractBoost + Number(futureEval?.score || 0) + bestRank * 100000 + bestSuit * 1000 + Number(card.rank || 0);
    return { sector, card, score, contractMatch, reason: describeSuggestionReason(hand.cards || [], card, futureEval, bestRank, bestSuit, contractMatch) };
  }).filter(Boolean) as any[];
  return suggestions.sort((a, b) => b.score - a.score).slice(0, count);
}

function describeSuggestionReason(currentCards: PokerCard[], card: PokerCard, evaluation: any, bestRankCount: number, bestSuitCount: number, contractMatch = false) {
  if (contractMatch) return "Cette carte valide ou sécurise directement le contrat de la manche.";
  if (card?.joker) return "Le Joker améliore presque toutes les combinaisons et sécurise un gros showdown.";
  if (evaluation?.categoryRank >= 6) return `Cette carte peut te rapprocher d'une main premium : ${evaluation.label}.`;
  if (bestRankCount >= 3) return `Très bon potentiel de brelan/carré avec ${pokerRankLabel(card.rank)}.`;
  if (bestSuitCount >= 4) return `Fort potentiel de couleur en ${pokerSuitSymbol(card.suit)}.`;
  const sameRank = currentCards.filter((row: any) => !row?.joker && row?.rank === card.rank).length;
  if (sameRank >= 1) return `Elle renforce une paire ou un brelan de ${pokerRankLabel(card.rank)}.`;
  return `Carte utile pour améliorer la valeur moyenne de la main avec ${pokerCardLabel(card)}.`;
}

function describeHandSnapshot(cards: PokerCard[] = []): string {
  if (!cards.length) return "Main vide";
  const evaluation = evaluateBestPokerHand(cards);
  if (evaluation) return evaluation.label;
  const clean = cards.filter((card) => !card?.joker);
  const rankCounts = new Map<number, number>();
  const suitCounts = new Map<string, number>();
  clean.forEach((card) => { rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1); suitCounts.set(String(card.suit), (suitCounts.get(String(card.suit)) || 0) + 1); });
  const maxRank = Math.max(0, ...Array.from(rankCounts.values()));
  const maxSuit = Math.max(0, ...Array.from(suitCounts.values()));
  if (cards.some((card) => card?.joker)) return `${cards.length}/5 · Joker en main`;
  if (maxRank >= 3) return `${cards.length}/5 · Brelan en construction`;
  if (maxRank >= 2) return `${cards.length}/5 · Paire en construction`;
  if (maxSuit >= 3) return `${cards.length}/5 · Couleur en vue`;
  return `${cards.length}/5 · Main en construction`;
}

function describeCardImpact(beforeCards: PokerCard[] = [], afterCards: PokerCard[] = [], card?: PokerCard | null): string {
  const before = describeHandSnapshot(beforeCards);
  const after = describeHandSnapshot(afterCards);
  if (after !== before) return `Impact : ${after}`;
  if (card?.joker) return "Impact : Joker stratégique";
  const sameRank = beforeCards.filter((row) => !row?.joker && row.rank === card?.rank).length;
  if (sameRank >= 1) return `Impact : renforce les ${pokerRankLabel(Number(card?.rank || 0))}`;
  const sameSuit = beforeCards.filter((row) => !row?.joker && row.suit === card?.suit).length;
  if (sameSuit >= 2) return `Impact : couleur ${pokerSuitSymbol(card?.suit || null)} renforcée`;
  return "Impact : nouvelle option de combinaison";
}

function describeContractLiveState(contract: any, cards: PokerCard[] = []) {
  if (!contract) return { done: false, label: "Aucun contrat" };
  const evaluation = evaluateBestPokerHand(cards);
  const done = contract.key === "joker" ? cards.some((card) => Boolean(card?.joker)) : isDartsPokerContractCompleted(contract, evaluation, cards);
  if (done) return { done: true, label: "Validé" };
  if (contract.key === "joker") return { done: false, label: cards.some((card) => card?.joker) ? "Joker acquis" : "DBULL requis" };
  if (!evaluation) return { done: false, label: `${cards.length}/5 cartes` };
  const missing = Math.max(0, Number(contract.minimumCategoryRank || 0) - Number(evaluation.categoryRank || 0));
  return { done: false, label: missing <= 1 ? "À portée" : "En construction" };
}

function buildPokerObjectiveHint(state: DartsPokerState, playerId: string, liveEvaluation: any, remainingDarts: number) {
  const hand = state.handsByPlayer[playerId] || ({ cards: [], exchangeTokens: 0, choiceTokens: 0 } as any);
  if (state.phase === "powers") {
    if (hand.choiceTokens > 0) return { title: "Utilise tes choix bonus", description: `Tu disposes de ${hand.choiceTokens} choix. Tire 2 cartes et garde la meilleure avant de valider.` };
    if (hand.exchangeTokens > 0) return { title: "Affiner la main", description: `Tu peux encore échanger ${hand.exchangeTokens} carte${hand.exchangeTokens > 1 ? "s" : ""}. Remplace les cartes faibles avant validation.` };
    return { title: "Valide le showdown", description: "La main est prête. Vérifie rapidement tes cartes puis valide pour passer au joueur suivant." };
  }
  const cards = hand.cards || [];
  const nonJokers = cards.filter((card: any) => !card?.joker);
  const rankCounts = new Map<number, number>();
  const suitCounts = new Map<string, number>();
  nonJokers.forEach((card: any) => { rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1); suitCounts.set(String(card.suit), (suitCounts.get(String(card.suit)) || 0) + 1); });
  let bestRank = 0; let bestRankCount = 0;
  Array.from(rankCounts.entries()).forEach(([rank, count]) => { if (count > bestRankCount) { bestRank = rank; bestRankCount = count; } });
  let bestSuit = ""; let bestSuitCount = 0;
  Array.from(suitCounts.entries()).forEach(([suit, count]) => { if (count > bestSuitCount) { bestSuit = suit; bestSuitCount = count; } });
  if (!cards.length) return { title: "Démarre par une base solide", description: "Cherche une carte haute ou un premier doublon. Les As, Rois et cartes assorties sont de très bons départs." };
  if (liveEvaluation?.category === "pair" || bestRankCount >= 2) return { title: `Transformer ${pokerRankLabel(bestRank)} en brelan`, description: `Tu as déjà une paire. Il reste ${remainingDarts} fléchette${remainingDarts > 1 ? "s" : ""} pour viser un 3e ${pokerRankLabel(bestRank)} ou construire un full.` };
  if (liveEvaluation?.category === "two_pair") return { title: "Chercher le full", description: "Ta double paire est déjà bonne. Priorité : compléter un full house plutôt que prendre une simple carte haute." };
  if (bestSuitCount >= 3) return { title: `Pousser la couleur ${pokerSuitSymbol(bestSuit as any)}`, description: `Tu as ${bestSuitCount} cartes de la même couleur. Vise les secteurs qui exposent encore cette couleur pour préparer une flush.` };
  if (liveEvaluation?.category === "straight") return { title: "Conserver la suite et monter en gamme", description: "Ta suite est déjà intéressante. Privilégie désormais la sécurité ou un potentiel de flush si le marché l'autorise." };
  return { title: "Construire une paire forte", description: `Tu as encore ${remainingDarts} fléchette${remainingDarts > 1 ? "s" : ""}. Cherche un doublon ou des cartes assorties pour enclencher une vraie combinaison.` };
}
