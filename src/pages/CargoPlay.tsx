// @ts-nocheck
// =============================================================
// CARGO — PLAY V1 complet
// Contrats, camion, séries, bots, undo, reprise et historique.
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
  buildCargoMatchStats,
  cargoContractTargetLabel,
  cargoCurrentObjective,
  cargoVariantLabel,
  cloneCargoState,
  createCargoState,
  getCargoActivePlayer,
  getCargoActiveStats,
  normalizeCargoConfig,
  pickCargoBotDarts,
  playCargoVisit,
  type CargoConfigPayload,
  type CargoState,
} from "../lib/gameEngines/cargoEngine";
import { History } from "../lib/history";
import tickerCargo from "../assets/tickers/ticker_cargo.png";
import CargoEnd from "./CargoEnd";

type UiDart = { v: number; mult: 1 | 2 | 3 };
const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const SOFT = "#aab1bf";
const PLAYER_COLORS = [ORANGE, BLUE, GREEN, GOLD, RED, "#a78bfa", "#ff63b8", "#d4d8e5"];

function panel(accent = "rgba(255,255,255,.10)"): React.CSSProperties { return { borderRadius: 18, padding: 9, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.30))", border: `1px solid ${accent}`, boxShadow: "0 14px 34px rgba(0,0,0,.28)", boxSizing: "border-box" }; }
function action(color: string): React.CSSProperties { return { minHeight: 38, borderRadius: 12, border: `1px solid ${color}88`, background: `${color}17`, color, fontWeight: 1050, cursor: "pointer" }; }
function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 1000) / 10 : 0; }
function uiToGameDart(dart: UiDart): GameDart { if (!dart || dart.v === 0) return { bed: "MISS" }; if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" }; return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart; }
function normalizeConfig(props: any): CargoConfigPayload {
  const record = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || props?.config || props?.params || {};
  return normalizeCargoConfig(raw);
}

function Rules({ config }: { config: CargoConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.46 }}>
    <div><strong style={{ color: ORANGE }}>{cargoVariantLabel(config.variant).toUpperCase()}</strong><br />{config.variant === "parcel_delivery" ? "Enchaîne une adresse jusqu’à 5 touches et gagne des colis bonus." : "Complète les contrats ou construis librement des séries pour charger le camion."}</div>
    <div><strong style={{ color: GOLD }}>SÉRIE</strong><br />{config.seriesRule === "exact_segment" ? "Le segment S/D/T doit être identique." : "Le numéro suffit, même si le multiplicateur change."}</div>
    <div><strong style={{ color: GREEN }}>TOURS</strong><br />{config.rounds} tours, 3 fléchettes par volée. {config.carrySeriesBetweenTurns ? "La série continue entre les tours." : "La série est clôturée à chaque volée."}</div>
    <div><strong style={{ color: BLUE }}>BULLS</strong><br />Bull : {config.bullRule}. Double Bull : {config.dbullRule}.</div>
  </div>;
}

function TruckVisual({ state, stats }: any) {
  const parcel = state.config.variant === "parcel_delivery";
  const capacity = Math.max(1, Number(state.config.truckCapacity || state.config.targetWeight || 1000));
  const value = parcel ? Number(stats?.parcelsDelivered || 0) : Number(stats?.totalWeight || 0);
  const fill = parcel ? Math.min(100, value / Math.max(30, state.config.rounds * 5) * 100) : Math.min(100, value / capacity * 100);
  const pallets = Math.min(16, Number(stats?.pallets || 0));
  return <div style={{ position: "relative", minHeight: 122, overflow: "hidden", borderRadius: 16, background: parcel ? "linear-gradient(180deg,#182433,#0d121a)" : "linear-gradient(180deg,#20252c,#0d1014)", border: "1px solid rgba(255,255,255,.09)" }}>
    <div style={{ position: "absolute", inset: "auto 0 0", height: 25, background: "repeating-linear-gradient(90deg,#222 0 22px,#292929 22px 44px)" }} />
    {parcel ? <>
      <div style={{ position: "absolute", top: 12, left: 12, color: BLUE, fontSize: 9, fontWeight: 1100 }}>TOURNÉE URBAINE</div>
      <div style={{ position: "absolute", right: 16, top: 30, fontSize: 45 }}>🏠</div><div style={{ position: "absolute", right: 68, top: 54, fontSize: 25 }}>📦</div>
      <div style={{ position: "absolute", left: 20, bottom: 19, fontSize: 58, filter: "drop-shadow(0 8px 8px #000)" }}>🚚</div>
    </> : <>
      <div style={{ position: "absolute", top: 12, left: 12, color: ORANGE, fontSize: 9, fontWeight: 1100 }}>QUAI DE CHARGEMENT</div>
      <div style={{ position: "absolute", left: 16, bottom: 18, width: "72%", height: 62, borderRadius: "8px 3px 3px 8px", background: "linear-gradient(180deg,#e4e8ec,#9aa4ad)", border: "3px solid #56616b", boxShadow: "0 10px 20px rgba(0,0,0,.45)" }}>
        <div style={{ position: "absolute", left: 4, right: 4, bottom: 4, top: 4, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3, alignContent: "end" }}>{Array.from({ length: pallets }).map((_, i) => <div key={i} style={{ height: 19 + (i % 2) * 5, borderRadius: 3, background: i % 3 === 0 ? "#d89a4b" : i % 3 === 1 ? "#b97238" : "#efbd6b", border: "1px solid #6d4524", boxShadow: "inset 0 -4px rgba(0,0,0,.15)" }} />)}</div>
      </div>
      <div style={{ position: "absolute", right: 11, bottom: 13, fontSize: 55 }}>🚛</div>
    </>}
    <div style={{ position: "absolute", left: 12, right: 12, top: 28, height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(0,0,0,.55)", border: "1px solid rgba(255,255,255,.12)" }}><div style={{ width: `${fill}%`, height: "100%", background: `linear-gradient(90deg,${GREEN},${fill > 90 ? RED : ORANGE})`, transition: "width .25s ease" }} /></div>
    <div style={{ position: "absolute", right: 13, top: 8, color: fill > 90 ? RED : GREEN, fontSize: 10, fontWeight: 1100 }}>{parcel ? `${value} COLIS` : `${value} / ${state.config.variant === "exact_load" ? state.config.targetWeight : capacity} KG`}</div>
  </div>;
}

function ContractCard({ contract, active }: any) {
  return <div style={{ minWidth: 0, borderRadius: 13, padding: 8, background: active ? `${ORANGE}13` : "rgba(255,255,255,.025)", border: `1px solid ${active ? ORANGE : contract.fragile ? RED : contract.urgent ? GOLD : "rgba(255,255,255,.08)"}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 5 }}><strong style={{ color: active ? ORANGE : "#fff", fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contract.icon} {contract.label}</strong><span style={{ color: GOLD, fontSize: 9, fontWeight: 1100 }}>{contract.finalWeight} kg</span></div>
    <div style={{ marginTop: 5, color: GREEN, fontWeight: 1100, fontSize: 13 }}>{cargoContractTargetLabel(contract)}</div>
    <div style={{ marginTop: 3, display: "flex", gap: 4, flexWrap: "wrap" }}>{contract.fragile ? <span style={{ color: RED, fontSize: 7, fontWeight: 1000 }}>FRAGILE</span> : null}{contract.urgent ? <span style={{ color: GOLD, fontSize: 7, fontWeight: 1000 }}>URGENT</span> : null}<span style={{ color: SOFT, fontSize: 7 }}>{contract.cargoType}</span></div>
  </div>;
}

export default function CargoPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => { const id = String(profile?.id || profile?.profileId || ""); if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) }); });
    const ordered = config.selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile) })), [profiles]);
  const profilesById = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const initialState = React.useMemo(() => { const snapshot = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || null; return snapshot?.mode === "cargo" ? cloneCargoState(snapshot) : createCargoState(players, config); }, []);

  const [state, setState] = React.useState<CargoState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<CargoState[]>([]);
  const [notice, setNotice] = React.useState(cargoCurrentObjective(initialState));
  const [showTimeline, setShowTimeline] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(initialState.phase === "finished");
  const [botThinking, setBotThinking] = React.useState(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `cargo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");

  const activePlayer = getCargoActivePlayer(state);
  const activeStats = getCargoActiveStats(state) || {};
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeColor = PLAYER_COLORS[state.activePlayerIndex % PLAYER_COLORS.length];
  const activeSeries = activeStats?.currentSeries;
  const activeContract = activeSeries?.contractId ? state.contracts.find((contract) => contract.id === activeSeries.contractId) : null;

  function backToConfig() { if (typeof go === "function") go("cargo_config", config); }
  function addDart(v: number, mult?: 1 | 2 | 3) { if (botThinking || state.phase !== "playing" || throwDarts.length >= 3) return; setThrowDarts((prev) => [...prev, { v: Number(v) || 0, mult: (mult || multiplier) as any }].slice(0, 3)); }
  function commitVisit(source?: UiDart[]) {
    const darts = (source || throwDarts).slice(0, 3); if (!darts.length || state.phase !== "playing") return;
    setUndoStack((prev) => [...prev.slice(-29), cloneCargoState(state)]);
    const next = playCargoVisit(state, darts.map(uiToGameDart));
    setState(next); setThrowDarts([]); setMultiplier(1);
    const visit = next.visits[next.visits.length - 1];
    setNotice(visit?.events?.map((event) => event.label).join(" · ") || cargoCurrentObjective(next));
    if (next.phase === "finished") setShowEnd(true);
  }
  function cancelOrUndo() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice("Volée effacée."); return; }
    const previous = undoStack[undoStack.length - 1]; if (!previous) { setNotice("Aucune action à annuler."); return; }
    setState(previous); setUndoStack((prev) => prev.slice(0, -1)); setShowEnd(false); autoSavedRef.current = ""; setNotice("Dernière volée annulée.");
  }
  function resetMatch() { matchIdRef.current = `cargo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const next = createCargoState(players, config); setState(next); setThrowDarts([]); setUndoStack([]); setShowEnd(false); setNotice(cargoCurrentObjective(next)); autoSavedRef.current = ""; }

  React.useEffect(() => {
    if (state.phase !== "playing" || !activePlayer || !isBot(activeProfile, botIds) || botThinking) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const darts = pickCargoBotDarts(state).map((dart: any) => dart?.bed === "MISS" ? ({ v: 0, mult: 1 }) : dart?.bed === "OB" || dart?.bed === "BULL" ? ({ v: 25, mult: 1 }) : dart?.bed === "IB" || dart?.bed === "DBULL" ? ({ v: 25, mult: 2 }) : ({ v: Number(dart?.number || 0), mult: dart?.bed === "T" ? 3 : dart?.bed === "D" ? 2 : 1 }));
      const next = playCargoVisit(state, darts.map(uiToGameDart));
      setUndoStack((prev) => [...prev.slice(-29), cloneCargoState(state)]); setState(next); setThrowDarts([]); setBotThinking(false);
      const visit = next.visits[next.visits.length - 1]; setNotice(visit?.events?.map((event) => event.label).join(" · ") || "Volée BOT validée."); if (next.phase === "finished") setShowEnd(true);
    }, 620);
    return () => { window.clearTimeout(timer); setBotThinking(false); };
  }, [state.activePlayerIndex, state.roundIndex, state.phase]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const status = statusOverride || (state.phase === "finished" ? "finished" : "in_progress");
    const finished = status === "finished"; const now = finished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player, index) => {
      const profile = profilesById.get(String(player.id)) || player; const stats = state.statsByPlayer[player.id] || {}; const standing = state.standings.find((row) => row.id === player.id);
      const visits = state.visits.filter((visit) => String(visit.playerId) === String(player.id));
      const dartsDetail = visits.flatMap((visit) => visit.darts.map((dart, dartIndex) => ({ ...dart, label: visit.labels[dartIndex], round: visit.round, visit: visit.visit, dartIndex: dartIndex + 1, events: visit.events })));
      return { id: player.id, playerId: player.id, profileId: player.id, name: playerName(profile), avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null, dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null, color: PLAYER_COLORS[index % PLAYER_COLORS.length], rank: standing?.rank || null, win: finished && state.winnerIds.includes(player.id), winner: finished && state.winnerIds.includes(player.id), ...stats, accuracy: pct(stats.hits, stats.darts), visitsHistory: visits, visitHistory: visits, dartsDetail, hitsBySegment: { ...(stats.hitsBySegment || {}) } };
    });
    const matchStats = buildCargoMatchStats(state);
    const scoreWord = config.variant === "parcel_delivery" ? "colis" : "kg";
    const summary = { kind: "cargo", mode: "cargo", sport: "darts", variant: config.variant, variantLabel: cargoVariantLabel(config.variant), finished, statisticsVersion: 1, telemetryVersion: 1, winnerId: finished ? state.winnerIds[0] || null : null, winnerIds: finished ? state.winnerIds : [], winnerName: finished ? state.standings.filter((row) => row.rank === 1).map((row) => row.name).join(" / ") : null, roundsPlayed: Math.min(config.rounds, state.roundIndex), configuredRounds: config.rounds, players: playerRows, perPlayer: playerRows, rankings: finished ? playerRows.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)) : [], visits: state.visits, matchStats, config, scoreLine: `${cargoVariantLabel(config.variant)} · ${config.variant === "parcel_delivery" ? matchStats.totalParcels : matchStats.totalWeight} ${scoreWord} · ${matchStats.totalDarts} fléchettes`, game: { mode: "cargo", variant: config.variant, rounds: config.rounds } };
    return { id: matchIdRef.current, matchId: matchIdRef.current, kind: "cargo", mode: "cargo", sport: "darts", status, statisticsVersion: 1, telemetryVersion: 1, createdAt: state.startedAt, startedAt: state.startedAt, updatedAt: now, ...(finished ? { finishedAt: now, endedAt: now } : {}), winnerId: summary.winnerId, winnerIds: summary.winnerIds, winnerName: summary.winnerName, players: playerRows, resumeId: matchIdRef.current, resume: { config, state: cloneCargoState(state), updatedAt: now }, game: summary.game, summary, payload: { kind: "cargo", mode: "cargo", sport: "darts", variant: config.variant, statisticsVersion: 1, telemetryVersion: 1, config, players: playerRows, summary, visits: state.visits, visitHistory: state.visits, stateSnapshot: cloneCargoState(state), stats: { sport: "darts", mode: "cargo", variant: config.variant, players: playerRows, match: matchStats, global: matchStats } } };
  }

  React.useEffect(() => { if (state.phase === "finished" || state.visits.length === 0) return; const timer = window.setTimeout(() => { void (History as any).upsert(buildHistoryRecord("in_progress")); }, 280); return () => window.clearTimeout(timer); }, [state]);
  React.useEffect(() => { if (state.phase !== "finished") return; setShowEnd(true); if (autoSavedRef.current === matchIdRef.current) return; autoSavedRef.current = matchIdRef.current; try { onFinish?.(buildHistoryRecord("finished"), { navigate: false }); } catch {} }, [state.phase]);

  const centerScore = <div style={{ textAlign: "center" }}><div style={{ color: config.variant === "parcel_delivery" ? BLUE : ORANGE, fontSize: 18, fontWeight: 1200 }}>{config.variant === "parcel_delivery" ? `${activeStats.parcelsDelivered || 0} COLIS` : `${activeStats.totalWeight || 0} KG`}</div><div style={{ color: activeSeries ? GREEN : SOFT, fontSize: 8.5, fontWeight: 1000 }}>{activeSeries ? `SÉRIE ${activeSeries.count}${config.variant === "parcel_delivery" ? "/5" : ""}` : `TOUR ${state.roundIndex}/${config.rounds}`}</div></div>;
  const keypadNotice = <div style={{ color: botThinking ? GOLD : SOFT, fontSize: 8.5, fontWeight: 900, textAlign: "center", lineHeight: 1.25 }}>{botThinking ? "BOT EN CHARGEMENT…" : notice}</div>;

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: "radial-gradient(circle at 50% -10%,rgba(255,155,66,.24),#080a0e 43%,#020203 100%)", paddingBottom: 8 }}>
    <PageHeader tickerSrc={tickerCargo} tickerAlt="CARGO" left={<BackDot onClick={backToConfig} color={ORANGE} glow={`${ORANGE}88`} />} right={<InfoDot title="Règles CARGO" color={GOLD} glow={`${GOLD}88`} content={<Rules config={config} />} />} />
    <main style={{ width: "min(980px,100%)", margin: "0 auto", padding: "6px 8px", boxSizing: "border-box" }}>
      <section style={{ ...panel(`${activeColor}55`), display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <ProfileAvatar profile={activeProfile} size={46} />
        <div style={{ minWidth: 0 }}><div style={{ color: activeColor, fontSize: 12, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(activeProfile)}</div><div style={{ color: SOFT, fontSize: 8.5 }}>{cargoVariantLabel(config.variant)} · Tour {Math.min(state.roundIndex, config.rounds)}/{config.rounds}</div><div style={{ color: activeSeries ? GREEN : ORANGE, fontSize: 8.5, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cargoCurrentObjective(state)}</div></div>
        <div style={{ display: "flex", gap: 5 }}><button onClick={() => setShowTimeline(true)} style={{ ...action(BLUE), padding: "0 8px", fontSize: 8 }}>JOURNAL</button><button onClick={cancelOrUndo} style={{ ...action(RED), padding: "0 8px", fontSize: 8 }}>UNDO</button></div>
      </section>

      <section style={{ ...panel(), marginBottom: 6, padding: 7 }}><TruckVisual state={state} stats={activeStats} /></section>

      {state.contracts.length ? <section style={{ ...panel(), marginBottom: 6, padding: 7 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><strong style={{ color: GOLD, fontSize: 9.5, letterSpacing: .7 }}>MANIFESTE DE CHARGEMENT</strong><span style={{ color: SOFT, fontSize: 8 }}>{state.contracts.length} contrats disponibles</span></div><div style={{ display: "grid", gridTemplateColumns: `repeat(${state.contracts.length},minmax(0,1fr))`, gap: 5 }}>{state.contracts.map((contract) => <ContractCard key={contract.id} contract={contract} active={activeContract?.id === contract.id} />)}</div></section> : null}

      <section style={{ ...panel(`${activeColor}44`), marginBottom: 6, padding: 7 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${state.players.length},minmax(0,1fr))`, gap: 5 }}>{state.players.map((player, index) => { const stats = state.statsByPlayer[player.id] || {}; const profile = profilesById.get(player.id) || player; const active = index === state.activePlayerIndex; const score = config.variant === "parcel_delivery" ? stats.parcelsDelivered : stats.totalWeight; return <div key={player.id} style={{ minWidth: 0, padding: 6, borderRadius: 12, border: `1px solid ${active ? PLAYER_COLORS[index % PLAYER_COLORS.length] : "rgba(255,255,255,.08)"}`, background: active ? `${PLAYER_COLORS[index % PLAYER_COLORS.length]}0c` : "rgba(255,255,255,.02)", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center" }}><ProfileAvatar profile={profile} size={29} /></div><div style={{ marginTop: 3, fontSize: 8, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(profile)}</div><div style={{ color: config.variant === "parcel_delivery" ? BLUE : ORANGE, fontSize: 13, fontWeight: 1100 }}>{score || 0} <small style={{ fontSize: 7 }}>{config.variant === "parcel_delivery" ? "COLIS" : "KG"}</small></div><div style={{ color: SOFT, fontSize: 7 }}>{stats.pallets || 0} palettes · série {stats.longestSeries || 0}</div></div>; })}</div>
      </section>

      {state.phase === "playing" ? <section style={{ ...panel(), padding: 6 }}>
        {config.scoreInputMethod === "dartboard" ? <DartboardClickable multiplier={multiplier} disabled={botThinking || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} /> : null}
        <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onCancel={cancelOrUndo} onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))} onNumber={(n) => addDart(n)} onBull={() => addDart(25)} onValidate={() => commitVisit()} centerSlot={centerScore} noticeSlot={keypadNotice} validateAttention={throwDarts.length === 3} safeBottomPad />
      </section> : null}
    </main>

    {showTimeline ? <TimelineModal state={state} profilesById={profilesById} onClose={() => setShowTimeline(false)} /> : null}
    {showEnd && state.phase === "finished" ? <CargoEnd state={state} profilesById={profilesById} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.players[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "cargo" }); }} onHistory={() => { try { onFinish?.(buildHistoryRecord("finished"), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function TimelineModal({ state, profilesById, onClose }: any) {
  return <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.87)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ ...panel(`${BLUE}55`), width: "min(820px,100%)", maxHeight: "92dvh", overflow: "auto", background: "linear-gradient(180deg,#11151a,#050609)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: BLUE, fontWeight: 1100 }}>JOURNAL DES CHARGEMENTS</div><div style={{ color: SOFT, fontSize: 9 }}>{state.visits.length} volée{state.visits.length > 1 ? "s" : ""}</div></div><button onClick={onClose} style={action("#c9ced8")}>FERMER</button></div><div style={{ marginTop: 10, display: "grid", gap: 6 }}>{[...state.visits].reverse().map((visit) => <div key={visit.id} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 9.5 }}>{playerName(profilesById.get(String(visit.playerId)))} · T{visit.round} · V{visit.visit}</strong><strong style={{ color: ORANGE }}>{visit.labels.join(" / ")}</strong></div><div style={{ marginTop: 4, color: "#cfd5df", fontSize: 8.3 }}>{visit.events.map((event) => event.label).join(" · ") || "Aucun chargement"}</div></div>)}</div></div></div>;
}
