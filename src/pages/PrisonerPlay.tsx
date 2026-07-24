// @ts-nocheck
// =============================================================
// PRISONER — Play complet / moteur / bots / undo / stats / history
// Refonte UI : bloc joueur actif + scores style CAPITAL,
// détails de partie en modal, keypad PRISONER intégré, règles détaillées.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { DartIconColorizable } from "../components/MaskIcon";
import { useTheme } from "../contexts/ThemeContext";
import {
  clonePrisonerState,
  createPrisonerState,
  emptyPrisonerStats,
  getPrisonerActivePlayerId,
  getPrisonerAvailableDarts,
  getPrisonersOwnedCount,
  getPrisonerTarget,
  playPrisonerVisit,
  prisonerDartLabel,
  type PrisonerConfigPayload,
  type PrisonerDart,
  type PrisonerPlayerStats,
  type PrisonerState,
  type PrisonerTeamConfig,
} from "../lib/gameEngines/prisonerEngine";
import tickerPrisoner from "../assets/tickers/ticker_prisoner.png";
import targetBg from "../assets/target_bg.png";

type UiDart = { v: number; mult: 1 | 2 | 3; singleRing?: "inner" | "outer" };
type DetailTab = "route" | "prison" | "stats" | "visits";

const C = {
  gold: "#ffd76a",
  cyan: "#42d6ff",
  green: "#65efb4",
  red: "#ff667e",
  pink: "#ff63b8",
  text: "#f8fafc",
  soft: "rgba(226,232,240,.72)",
};

// Même palette joueurs que CAPITAL afin de conserver une identité visuelle cohérente.
const PLAYER_COLORS = ["#2fd8ff", "#e761c4", "#ff9b52", "#8c7dff", "#67e2a1", "#ffcf57", "#ff6f88", "#62d7c9"];

function playerColor(index: number) {
  return PLAYER_COLORS[Math.max(0, Number(index) || 0) % PLAYER_COLORS.length];
}
function rankColor(rank: number, fallback: string) {
  if (rank === 1) return "#f5c84b";
  if (rank === 2) return "#c7ced8";
  if (rank === 3) return "#c98245";
  return fallback;
}
function playerName(profile: any) { return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur"; }
function isBot(profile: any, botIds: Set<string>) { return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot"); }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 1000) / 10 : 0; }
function fmtDuration(ms: number) { const total = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`; }
function panelStyle(): React.CSSProperties { return { borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.25))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.30)", boxSizing: "border-box" }; }
function progressPct(value: number, total = 20) { return total > 0 ? Math.round((Math.max(0, value) / total) * 1000) / 10 : 0; }

function normalizeConfig(props: any): PrisonerConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  return {
    mode: "prisoner",
    participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(2, Number(raw?.players || raw?.selectedIds?.length || 2)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    startingDarts: Math.max(1, Math.min(9, Number(raw?.startingDarts || 3))),
    sequenceMode: raw?.sequenceMode === "numeric" ? "numeric" : "clockwise",
    bullCaptureRule: "bull",
    missPenaltyEnabled: raw?.missPenaltyEnabled !== false,
    eliminationEnabled: raw?.eliminationEnabled !== false,
    randomOrder: Boolean(raw?.randomOrder),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function toPrisonerDart(dart: UiDart): PrisonerDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  if (dart.mult === 3) return { bed: "T", number: dart.v };
  if (dart.mult === 2) return { bed: "D", number: dart.v };
  return { bed: "S", number: dart.v, singleRing: dart.singleRing === "inner" ? "inner" : "outer" };
}
function uiLabel(dart?: UiDart | null) {
  if (!dart) return "—";
  if (dart.v === 0) return "MISS";
  if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL";
  if (dart.mult === 3) return `T${dart.v}`;
  if (dart.mult === 2) return `D${dart.v}`;
  return `${dart.singleRing === "inner" ? "SI" : "SE"}${dart.v}`;
}

function TeamLogo({ team, size = 48 }: { team: any; size?: number }) {
  const src = team?.logoDataUrl || team?.logoUrl || team?.logo || null;
  return <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${team?.color || C.gold}`, display: "grid", placeItems: "center", overflow: "hidden", background: `${team?.color || C.gold}18`, boxShadow: `0 0 15px ${team?.color || C.gold}44`, flex: "0 0 auto" }}>{src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: team?.color || C.gold, fontWeight: 1000, fontSize: size * .34 }}>{String(team?.name || "E").slice(0, 2).toUpperCase()}</span>}</div>;
}

function RuleBlock({ title, color, children }: any) {
  return <div style={{ padding: "9px 10px", borderRadius: 13, background: `${color}0b`, border: `1px solid ${color}24` }}>
    <div style={{ color, fontSize: 11, fontWeight: 1100, letterSpacing: .55 }}>{title}</div>
    <div style={{ marginTop: 4, color: "rgba(255,255,255,.88)", fontSize: 12, lineHeight: 1.5 }}>{children}</div>
  </div>;
}

function RulesContent({ config, primary }: { config: PrisonerConfigPayload; primary: string }) {
  const sequence = config.sequenceMode === "clockwise"
    ? "1 → 18 → 4 → 13 → 6 → 10 → 15 → 2 → 17 → 3 → 19 → 7 → 16 → 8 → 11 → 14 → 9 → 12 → 5 → 20"
    : "1 → 2 → 3 → … → 20";

  return <div style={{ display: "grid", gap: 8, maxWidth: 620 }}>
    <RuleBlock title="BUT DU JEU" color={C.gold}>
      Tu fais une course de <b>20 cibles</b>. Le premier joueur qui termine tout le parcours gagne immédiatement. {config.eliminationEnabled ? <>Tu peux aussi gagner en restant le <b>dernier joueur</b> — ou la dernière équipe — possédant encore au moins une fléchette définitivement jouable.</> : <>Les éliminations sont désactivées : seule la fin du parcours donne la victoire.</>}
    </RuleBlock>

    <RuleBlock title="1 · DÉPART ET PARCOURS" color={primary}>
      Chaque joueur commence avec <b>{config.startingDarts} fléchette{config.startingDarts > 1 ? "s" : ""}</b>. Le parcours utilisé dans cette partie est :<br /><b>{sequence}</b>.<br />Ta grande valeur « CIBLE » indique toujours le numéro que tu dois valider maintenant.
    </RuleBlock>

    <RuleBlock title="2 · COMMENT AVANCER" color={C.green}>
      Pour valider ta cible actuelle, touche ce numéro en <b>Simple extérieur (SE)</b>, <b>Double</b> ou <b>Triple</b>. Dès qu'une cible est validée, la suivante devient immédiatement active : tu peux donc avancer plusieurs fois dans la même volée si tes fléchettes suivantes touchent les nouvelles cibles.
    </RuleBlock>

    <RuleBlock title="3 · SIMPLE EXTÉRIEUR / SIMPLE INTÉRIEUR" color={C.cyan}>
      Sur un vrai dartboard, il existe deux zones « simple » :<br />
      <b>SI — Simple intérieur</b> = zone entre le Bull et l'anneau Triple.<br />
      <b>SE — Simple extérieur</b> = zone entre l'anneau Triple et l'anneau Double.<br />
      En saisie clavier, utilise donc explicitement les touches <b>SIMPLE EXT.</b> ou <b>SIMPLE INT.</b> avant le numéro.
    </RuleBlock>

    <RuleBlock title="4 · QUAND UNE FLÉCHETTE DEVIENT PRISONNIÈRE" color={C.pink}>
      Si tu touches un numéro en <b>Simple intérieur (SI)</b>, cette fléchette reste prisonnière sur ce numéro. Elle compte toujours comme une fléchette que tu possèdes, mais elle n'est plus disponible pour tes prochains tours tant qu'elle n'est pas libérée ou capturée.<br />
      Au <b>Bull / DBull</b> : s'il n'y a aucun prisonnier au Bull, ta fléchette devient prisonnière au Bull. S'il y en a déjà un, ton Bull sert au contraire à le libérer / le capturer.
    </RuleBlock>

    <RuleBlock title="5 · LIBÉRER OU CAPTURER UNE FLÉCHETTE" color={C.cyan}>
      Pour récupérer un prisonnier placé sur un numéro, touche <b>ce même numéro en zone extérieure</b> : SE, Double ou Triple. Une fléchette libère un prisonnier à la fois.<br />
      • Si le prisonnier est <b>à toi</b>, tu récupères simplement ta fléchette.<br />
      • Si le prisonnier est <b>à un adversaire</b>, tu le captures : l'adversaire perd définitivement cette fléchette et elle devient la tienne. Tu pourras donc disposer de davantage de fléchettes lors de tes prochains tours.<br />
      Une même fléchette peut <b>capturer et valider ta cible</b> si le numéro touché est aussi ta cible actuelle.
    </RuleBlock>

    <RuleBlock title="6 · COMBIEN DE FLÉCHETTES PUIS-JE LANCER ?" color={primary}>
      Ce n'est pas forcément toujours 3. Ton nombre de fléchettes jouables est : <b>fléchettes possédées − fléchettes prisonnières − pénalités MISS du prochain tour</b>. Les captures peuvent donc augmenter ton nombre de lancers, tandis que les prisonniers peuvent le réduire.
    </RuleBlock>

    <RuleBlock title="7 · MISS / HORS CIBLE" color={C.red}>
      {config.missPenaltyEnabled ? <>Chaque <b>MISS</b> rend une de tes fléchettes indisponible pendant <b>ton prochain tour uniquement</b>. Si toutes tes fléchettes disponibles sont bloquées uniquement par cette pénalité, ton tour est passé puis la pénalité disparaît. Un MISS temporaire ne t'élimine jamais à lui seul.</> : <>La pénalité temporaire de MISS est désactivée dans cette partie.</>}
    </RuleBlock>

    <RuleBlock title="8 · ÉLIMINATION" color={C.red}>
      {config.eliminationEnabled ? <>Tu es éliminé lorsque tu n'as plus aucune fléchette <b>définitivement jouable</b>, c'est-à-dire lorsque toutes les fléchettes que tu possèdes sont prisonnières / ont été perdues par capture. Les pénalités MISS temporaires ne comptent pas pour cette élimination.</> : <>Les éliminations sont désactivées.</>}
    </RuleBlock>

    {config.participantMode === "teams" ? <RuleBlock title="9 · MODE ÉQUIPES" color={C.gold}>
      Chaque joueur garde ses propres fléchettes, ses prisonniers et ses captures. Une équipe gagne immédiatement dès qu'un de ses membres termine le parcours. Pour l'élimination, une équipe n'est éliminée que lorsque <b>tous ses membres</b> sont éliminés.
    </RuleBlock> : null}

    <RuleBlock title="EXEMPLE TRÈS CONCRET" color={C.green}>
      Ta cible est <b>18</b>. Tu joues <b>SE18</b> : tu valides 18 et ta nouvelle cible devient 4. Deuxième fléchette : <b>SI4</b> → elle devient prisonnière sur le 4, sans faire avancer le parcours. Troisième fléchette : <b>D4</b> → elle libère ton prisonnier du 4 <b>et</b> valide la cible 4 ; ta prochaine cible devient 13.
    </RuleBlock>
  </div>;
}

function botChance(level: string) { const v = String(level || "").toLowerCase(); if (v.includes("hard") || v.includes("pro") || v.includes("diffic")) return .62; if (v.includes("easy") || v.includes("facile")) return .30; return .45; }
function randomBotVisit(state: PrisonerState, playerId: string, level: string): PrisonerDart[] {
  const budget = getPrisonerAvailableDarts(state, playerId);
  const hitChance = botChance(level);
  const out: PrisonerDart[] = [];
  const captureTargets = state.prisoners.map((p) => p.location);
  let predictedProgress = Number(state.progressIndexByPlayer[playerId] || 0);

  const push = (dart: PrisonerDart) => {
    out.push(dart);
    const target = state.sequence[predictedProgress] ?? null;
    const playable = dart.bed === "D" || dart.bed === "T" || (dart.bed === "S" && dart.singleRing !== "inner");
    if (target !== null && playable && Number(dart.number) === target) predictedProgress = Math.min(state.sequence.length, predictedProgress + 1);
  };

  for (let i = 0; i < budget; i += 1) {
    const target = state.sequence[predictedProgress] ?? 20;
    const roll = Math.random();
    if (captureTargets.length && roll < .12) {
      const location = captureTargets[Math.floor(Math.random() * captureTargets.length)];
      if (location === "BULL") push(Math.random() < .25 ? { bed: "IB" } : { bed: "OB" });
      else push({ bed: Math.random() < .2 ? "D" : Math.random() < .35 ? "T" : "S", number: location, singleRing: "outer" });
      continue;
    }
    if (roll < hitChance) {
      const r = Math.random();
      push({ bed: r < .18 ? "D" : r < .34 ? "T" : "S", number: target, singleRing: "outer" });
      continue;
    }
    if (roll < hitChance + .14) { push({ bed: "S", number: target, singleRing: "inner" }); continue; }
    if (roll < hitChance + .20) { push(Math.random() < .25 ? { bed: "IB" } : { bed: "OB" }); continue; }
    if (roll < hitChance + .30) { push({ bed: "MISS" }); continue; }
    let n = Math.max(1, Math.min(20, target + (Math.random() < .5 ? -1 : 1)));
    if (n === target) n = target === 20 ? 19 : target + 1;
    push({ bed: "S", number: n, singleRing: "outer" });
  }
  return out;
}

export default function PrisonerPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || C.gold;
  const secondary = theme?.accent1 || primary;
  const themeText = theme?.text || C.text;
  const themeSoft = theme?.textSoft || C.soft;
  const themeStroke = theme?.borderSoft || "rgba(255,255,255,.10)";

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => { const id = String(profile?.id || profile?.profileId || ""); if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) }); });
    const ordered = (config.selectedIds || []).map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);

  const teamConfigs = React.useMemo<PrisonerTeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({
    id: String(team?.id || `team-${index + 1}`),
    name: String(team?.name || `Équipe ${index + 1}`),
    color: team?.color || [C.gold, C.pink, C.cyan, C.green][index % 4],
    logoDataUrl: team?.logoDataUrl || team?.logoUrl || null,
    logoUrl: team?.logoUrl || null,
    playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [],
    isBotTeam: Boolean(team?.isBotTeam),
  })), [config.teamConfigs]);

  const rules = React.useMemo(() => ({
    participantMode: config.participantMode,
    startingDarts: config.startingDarts,
    sequenceMode: config.sequenceMode,
    bullCaptureRule: config.bullCaptureRule,
    missPenaltyEnabled: config.missPenaltyEnabled,
    eliminationEnabled: config.eliminationEnabled,
  }), [config]);

  const initialState = React.useMemo(() => createPrisonerState(profiles as any, rules, teamConfigs, config.selectedIds), []);
  const [state, setState] = React.useState<PrisonerState>(initialState);
  const [undoStack, setUndoStack] = React.useState<PrisonerState[]>([]);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [singleRing, setSingleRing] = React.useState<"inner" | "outer">("outer");
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(`prisoner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");

  const byId = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((team) => [String(team.id), team])), [teamConfigs]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const activePlayerId = getPrisonerActivePlayerId(state);
  const activeProfile = byId.get(activePlayerId) || state.players.find((p) => p.id === activePlayerId) || { id: activePlayerId, name: "Joueur" };
  const activeTeam = config.participantMode === "teams" ? teamById.get(state.teamByPlayer[activePlayerId]) : null;
  const activeStats = state.statsByPlayer[activePlayerId] || emptyPrisonerStats(config.startingDarts);
  const target = getPrisonerTarget(state, activePlayerId);
  const dartsBudget = getPrisonerAvailableDarts(state, activePlayerId);
  const prisonersOwned = getPrisonersOwnedCount(state, activePlayerId);
  const owned = Number(state.dartsOwnedByPlayer[activePlayerId] || 0);
  const missPenalty = Number(state.missPenaltyByPlayer[activePlayerId] || 0);
  const activeIsBot = isBot(activeProfile, botIds);
  const activeProgress = Number(state.progressIndexByPlayer[activePlayerId] || 0);
  const activeEntityId = config.participantMode === "teams" ? String(state.teamByPlayer[activePlayerId] || "") : String(activePlayerId);
  const activeStanding = state.standings.find((s) => String(s.id) === activeEntityId) || null;
  const activeProfileIndex = Math.max(0, profiles.findIndex((p: any) => String(p.id) === String(activePlayerId)));
  const activeAccent = activeTeam?.color || playerColor(activeProfileIndex);
  const nextTargets = state.sequence.slice(activeProgress, activeProgress + 5);

  function commitVisit(darts: UiDart[] | PrisonerDart[]) {
    if (state.finished) return;
    const converted = darts.map((d: any) => d?.bed ? d : toPrisonerDart(d));
    setUndoStack((prev) => [...prev.slice(-39), clonePrisonerState(state)]);
    const next = playPrisonerVisit(state, converted as PrisonerDart[]);
    setState(next);
    setThrowDarts([]);
    setMultiplier(1);
    setSingleRing("outer");
    const last = next.history[next.history.length - 1];
    if (last?.skipped) setNotice("Tour passé : tes pénalités MISS sont maintenant effacées.");
    else if (last?.captures) setNotice(`${last.captures} capture${last.captures > 1 ? "s" : ""} !`);
    else if (last?.prisonersCreated) setNotice(`${last.prisonersCreated} fléchette${last.prisonersCreated > 1 ? "s" : ""} prisonnière${last.prisonersCreated > 1 ? "s" : ""}.`);
    else if (last?.progressHits) setNotice(`+${last.progressHits} cible${last.progressHits > 1 ? "s" : ""} validée${last.progressHits > 1 ? "s" : ""}.`);
    else setNotice("");
  }

  function validateVisit() {
    if (state.finished || activeIsBot) return;
    if (dartsBudget <= 0) return commitVisit([]);
    if (!throwDarts.length) { setNotice("Entre au moins une fléchette avant de valider."); return; }
    commitVisit(throwDarts);
  }
  function cancelOrUndo() {
    if (throwDarts.length) { setThrowDarts((prev) => prev.slice(0, -1)); return; }
    setUndoStack((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      setState(clonePrisonerState(last));
      setNotice("Tour précédent restauré.");
      return prev.slice(0, -1);
    });
  }
  function addDart(v: number, forcedMult?: 1 | 2 | 3, ring?: "inner" | "outer") {
    if (state.finished || activeIsBot || throwDarts.length >= dartsBudget) return;
    const mult = v === 25 ? (forcedMult === 2 ? 2 : 1) : (forcedMult || multiplier);
    const dart: UiDart = { v, mult, singleRing: mult === 1 && v >= 1 && v <= 20 ? (ring || singleRing) : undefined };
    setThrowDarts((prev) => [...prev, dart]);
    setMultiplier(1);
  }
  function onDetailedBoardHit(hit: any) {
    if (throwDarts.length >= dartsBudget) return;
    if (!hit || hit.ring === "miss" || hit.segment === 0) return addDart(0, 1);
    if (hit.segment === 25) return addDart(25, hit.mult === 2 ? 2 : 1);
    if (hit.ring === "inner_single") return addDart(hit.segment, 1, "inner");
    if (hit.ring === "outer_single") return addDart(hit.segment, 1, "outer");
    return addDart(hit.segment, hit.mult);
  }

  React.useEffect(() => {
    if (state.finished || !activeIsBot || botThinking) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const darts = randomBotVisit(state, activePlayerId, String(activeProfile?.botLevel || config.botLevel));
      commitVisit(darts);
      setBotThinking(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.activePlayerIndex, state.finished, activePlayerId, activeIsBot]);

  function backToConfig() {
    if (state.history.length && !state.finished && !window.confirm("Quitter cette partie de PRISONER en cours ?")) return;
    if (typeof go === "function") go("prisoner_config", config);
  }
  function resetMatch() {
    const next = createPrisonerState(profiles as any, rules, teamConfigs, config.selectedIds);
    setState(next);
    setUndoStack([]);
    setThrowDarts([]);
    setShowEnd(false);
    setNotice("");
    matchIdRef.current = `prisoner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    autoSavedRef.current = "";
  }

  function buildHistoryRecord() {
    const now = state.finishedAt || Date.now();
    const individualOrder = state.players.map((player: any) => {
      const st = state.statsByPlayer[player.id] || emptyPrisonerStats(config.startingDarts);
      return { id: player.id, completed: Boolean(state.completedByPlayer[player.id]), progress: Number(state.progressIndexByPlayer[player.id] || 0), dartsOwned: Number(state.dartsOwnedByPlayer[player.id] || 0), captures: st.captures };
    }).sort((a, b) => Number(b.completed) - Number(a.completed) || b.progress - a.progress || b.dartsOwned - a.dartsOwned || b.captures - a.captures);
    const rankById = new Map(individualOrder.map((r, i) => [String(r.id), i + 1]));
    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player;
      const stats: PrisonerPlayerStats = state.statsByPlayer[player.id] || emptyPrisonerStats(config.startingDarts);
      const teamId = state.teamByPlayer[player.id] || null;
      const winner = config.participantMode === "teams" ? Boolean(teamId && state.winnerIds.includes(teamId)) : state.winnerIds.includes(player.id);
      const progress = Number(state.progressIndexByPlayer[player.id] || 0);
      const dartsOwned = Number(state.dartsOwnedByPlayer[player.id] || 0);
      return {
        id: String(player.id), playerId: String(player.id), name: playerName(profile), avatar: profile?.avatarDataUrl || profile?.avatarUrl || profile?.avatar || null,
        teamId, rank: rankById.get(String(player.id)) || 99, win: winner, winner, completed: Boolean(state.completedByPlayer[player.id]), eliminated: Boolean(state.eliminatedByPlayer[player.id]),
        progress, targetsCompleted: progress, progressPct: progressPct(progress, state.sequence.length), currentTarget: getPrisonerTarget(state, player.id), dartsOwned, availableDarts: getPrisonerAvailableDarts(state, player.id), prisonersRemaining: getPrisonersOwnedCount(state, player.id),
        darts: stats.darts, dartsThrown: stats.darts, visits: stats.visits, turnsSkipped: stats.turnsSkipped, progressHits: stats.progressHits, bestProgressVisit: stats.bestProgressVisit, bestProgressStreak: stats.bestProgressStreak,
        captures: stats.captures, opponentCaptures: stats.opponentCaptures, ownRescues: stats.ownRescues, captureLosses: stats.captureLosses, prisonersCreated: stats.prisonersCreated,
        innerSinglePrisoners: stats.innerSinglePrisoners, bullPrisoners: stats.bullPrisoners, offboardMisses: stats.offboardMisses, temporaryLostDarts: stats.temporaryLostDarts,
        validOuterHits: stats.validOuterHits, outerSingles: stats.outerSingles, innerSingles: stats.innerSingles, doubles: stats.doubles, triples: stats.triples, bulls: stats.bulls, dbulls: stats.dbulls, misses: stats.misses,
        maxDartsOwned: stats.maxDartsOwned, minDartsOwned: stats.minDartsOwned, finalDartsOwned: dartsOwned, completedAtVisit: stats.completedAtVisit, eliminatedAtVisit: stats.eliminatedAtVisit,
        progressAccuracy: pct(stats.progressHits, stats.darts), captureRate: pct(stats.captures, Math.max(1, stats.validOuterHits)), targetStats: stats.targets, rawStats: stats,
      };
    });
    const teams = teamConfigs.map((team: any) => { const standing = state.standings.find((s) => s.id === team.id); return { ...team, ...(standing || {}), winner: state.winnerIds.includes(team.id), win: state.winnerIds.includes(team.id) }; });
    const winnerStanding = state.standings.find((s) => state.winnerIds.includes(s.id)) || state.standings[0] || null;
    const winnerId = state.tied ? null : state.winnerIds[0] || null;
    const totalDarts = playerRows.reduce((a, p) => a + p.darts, 0);
    const totalCaptures = playerRows.reduce((a, p) => a + p.captures, 0);
    const totalPrisonersCreated = playerRows.reduce((a, p) => a + p.prisonersCreated, 0);
    const totalProgress = playerRows.reduce((a, p) => a + p.progressHits, 0);
    const matchStats = {
      durationMs: Math.max(0, now - state.startedAt), totalDarts, totalVisits: playerRows.reduce((a, p) => a + p.visits, 0), totalProgress,
      totalCaptures, totalPrisonersCreated, prisonersRemaining: state.prisoners.length, totalMisses: playerRows.reduce((a, p) => a + p.offboardMisses, 0),
      totalDartsOwnedFinal: playerRows.reduce((a, p) => a + p.finalDartsOwned, 0), progressAccuracy: pct(totalProgress, totalDarts), courseLength: state.sequence.length,
    };
    const summary = {
      kind: "prisoner", mode: "prisoner", sport: "darts", finished: true, participantMode: config.participantMode,
      winnerId, winnerIds: state.winnerIds, winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—", tied: state.tied,
      finishReason: state.finishReason, duration: matchStats.durationMs, durationMs: matchStats.durationMs, sequence: state.sequence, sequenceMode: config.sequenceMode, startingDarts: config.startingDarts,
      standings: state.standings, rankings: state.standings, players: playerRows, perPlayer: playerRows, teams, matchStats,
      scoreLine: state.standings.map((row) => `${row.name} ${row.progress}/${state.sequence.length} · ${row.dartsOwned}🎯`).join(" • "), game: { mode: "prisoner", teams },
    };
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, kind: "prisoner", mode: "prisoner", sport: "darts", status: "finished", createdAt: state.startedAt, updatedAt: now,
      winnerId, winnerIds: state.winnerIds, players: playerRows, teams, game: { mode: "prisoner", teams }, summary,
      payload: {
        kind: "prisoner", mode: "prisoner", sport: "darts", winnerId, winnerIds: state.winnerIds, tied: state.tied, config, rules: state.rules, players: playerRows, teams, summary,
        visits: state.history, visitHistory: state.history, prisoners: state.prisoners,
        state: { visitNo: state.visitNo, sequence: state.sequence, progressIndexByPlayer: state.progressIndexByPlayer, dartsOwnedByPlayer: state.dartsOwnedByPlayer, missPenaltyByPlayer: state.missPenaltyByPlayer, eliminatedByPlayer: state.eliminatedByPlayer, completedByPlayer: state.completedByPlayer, standings: state.standings, finishReason: state.finishReason },
        stats: { sport: "darts", mode: "prisoner", players: playerRows, teams, match: matchStats, global: matchStats },
      },
    };
  }

  React.useEffect(() => {
    if (!state.finished) return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    try { onFinish?.(buildHistoryRecord(), { navigate: false }); } catch {}
  }, [state.finished]);

  return <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
    <PageHeader
      tickerSrc={tickerPrisoner}
      tickerAlt="PRISONER"
      left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>}
      right={<div style={{ marginRight: 6 }}><InfoDot title="Règles complètes de PRISONER" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>}
    />

    <div style={{ padding: "6px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      {/* BLOC JOUEUR ACTIF — structure alignée sur CAPITAL */}
      <section style={{ marginBottom: 5, padding: 0, overflow: "hidden", borderRadius: 19, border: `1px solid ${activeAccent}88`, background: "linear-gradient(180deg, rgba(7,17,24,.94), rgba(3,8,12,.96))", boxShadow: `0 0 22px ${activeAccent}16, 0 14px 34px rgba(0,0,0,.34)` }}>
        <div style={{ position: "relative", minHeight: 126, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(124px,138px)", gap: 4, alignItems: "stretch", padding: "7px 9px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.38), rgba(0,0,0,.16) 36%, rgba(0,0,0,.10) 62%, rgba(0,0,0,.30))" }} />

          <div style={{ position: "absolute", left: -20, top: -5, bottom: -5, width: "27%", minWidth: 86, overflow: "hidden", opacity: .34, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -14, top: 12, transform: "scale(1.28)", transformOrigin: "left top", filter: `saturate(.98) brightness(.96) drop-shadow(0 0 8px ${activeAccent}28)` }}>
              <ProfileAvatar profile={activeProfile as any} size={84} showStars={false} />
            </div>
          </div>

          {config.participantMode === "teams" && activeTeam ? <div style={{ position: "absolute", right: "calc(124px + 11px)", top: -5, bottom: -5, width: "24%", minWidth: 82, overflow: "hidden", opacity: .16, pointerEvents: "none" }}>
            <div style={{ position: "absolute", right: -16, top: 13, transform: "scale(1.24)", transformOrigin: "right top" }}><TeamLogo team={activeTeam} size={82} /></div>
          </div> : null}

          <div style={{ gridColumn: "1 / 2", position: "relative", zIndex: 2, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2px 9px 2px 5px" }}>
            {botThinking ? <div style={{ color: activeAccent, fontSize: 8.3, fontWeight: 1000, letterSpacing: .8 }}>BOT EN RÉFLEXION</div> : null}
            <div style={{ color: activeAccent, fontSize: 13.2, fontWeight: 1000, letterSpacing: .75, lineHeight: 1.02, maxWidth: "100%", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(activeProfile)}</div>
            <div style={{ marginTop: 4, color: "#f5f7fb", fontSize: 46, fontWeight: 1000, lineHeight: .95, letterSpacing: -1.5, textShadow: "0 4px 18px rgba(0,0,0,.52)" }}>{activeProgress}<span style={{ fontSize: 17, color: "rgba(255,255,255,.55)", letterSpacing: 0 }}>/20</span></div>
            <div style={{ marginTop: 4, color: "rgba(255,255,255,.48)", fontSize: 8.2, fontWeight: 950, letterSpacing: .42, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{Math.max(1, Number(activeStanding?.rank || 1))}/{Math.max(1, state.standings.length)}{activeTeam ? ` • ${activeTeam.name}` : ""} • {activeStats.captures} CAP.</div>
            <ActiveDartsTray playable={dartsBudget} prisoners={prisonersOwned} misses={missPenalty} owned={owned} color={activeAccent} />
          </div>

          <div style={{ gridColumn: "2 / 3", position: "relative", zIndex: 2, display: "flex", alignItems: "stretch", justifyContent: "center", minWidth: 0, overflow: "hidden", borderRadius: 17, background: "#050913", isolation: "isolate" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 17, backgroundImage: `linear-gradient(180deg, rgba(4,8,16,.26), rgba(4,8,16,.60)), url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 38, background: "linear-gradient(90deg, rgba(4,8,16,.98), rgba(4,8,16,.76) 44%, rgba(4,8,16,0))", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: 0, top: 9, bottom: 9, width: 1, background: `linear-gradient(180deg, rgba(255,255,255,.02), ${activeAccent}, rgba(255,255,255,.02))`, boxShadow: `0 0 12px ${activeAccent}44`, pointerEvents: "none" }} />
            <div style={{ position: "relative", width: "100%", padding: "5px 4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,.62)", fontSize: 8.2, fontWeight: 950, letterSpacing: .75 }}>CIBLE</div>
              <div style={{ marginTop: 1, color: activeAccent, fontSize: 46, lineHeight: .92, fontWeight: 1000, letterSpacing: -1.2, textShadow: `0 0 18px ${activeAccent}55` }}>{target ?? "✓"}</div>
              <div style={{ marginTop: 4, color: C.green, fontSize: 8.2, fontWeight: 1000 }}>SE / D / T = AVANCE</div>
              <div style={{ marginTop: 1, color: C.pink, fontSize: 7.9, fontWeight: 1000 }}>SI = PRISON</div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCS SCORES — structure CAPITAL */}
      <div className={state.standings.length > 2 ? "dc-scroll-thin" : undefined} style={state.standings.length > 2 ? { marginTop: 5, display: "flex", gap: 7, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 2 } : { marginTop: 5, display: "grid", gridTemplateColumns: state.standings.length === 1 ? "1fr" : "1fr 1fr", gap: 7 }}>
        {state.standings.map((standing: any, i: number) => {
          const team = config.participantMode === "teams" ? teamById.get(String(standing.id)) : null;
          const profile = config.participantMode === "players" ? byId.get(String(standing.id)) : null;
          const accent = team?.color || playerColor(i);
          const rColor = rankColor(Number(standing.rank || i + 1), accent);
          const active = String(standing.id) === activeEntityId && !state.finished;
          const leader = state.finished && state.winnerIds.includes(String(standing.id));
          return <button key={standing.id} type="button" onClick={() => setShowTable(true)} style={{ position: "relative", overflow: "hidden", flex: state.standings.length > 2 ? "0 0 min(46vw,205px)" : undefined, minWidth: state.standings.length > 2 ? 160 : 0, minHeight: 108, scrollSnapAlign: state.standings.length > 2 ? "start" : undefined, borderRadius: 17, padding: "6px 7px", border: `1px solid ${active || leader ? accent : `${accent}66`}`, background: `linear-gradient(150deg, ${accent}18, rgba(2,7,11,.74) 56%, rgba(0,0,0,.88))`, boxShadow: active ? `0 0 19px ${accent}20, inset 0 0 22px ${accent}0d` : "none", isolation: "isolate", color: "inherit", cursor: "pointer" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(180deg, rgba(1,5,9,.18), rgba(1,5,9,.58)), url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", opacity: .20, zIndex: 0 }} />
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minWidth: 0 }}>
              <span style={{ flex: "0 0 auto", width: 21, height: 21, borderRadius: "50%", display: "grid", placeItems: "center", background: `${rColor}20`, border: `1.5px solid ${rColor}`, color: rColor, boxShadow: `0 0 9px ${rColor}22`, fontSize: 9.5, fontWeight: 1000 }}>{standing.rank}</span>
              <div style={{ minWidth: 0, maxWidth: "calc(100% - 32px)", color: active ? accent : "rgba(255,255,255,.95)", fontSize: 10.5, lineHeight: 1, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{leader ? " 🏆" : ""}</div>
            </div>
            <div style={{ position: "relative", zIndex: 1, marginTop: 2, display: "flex", justifyContent: "center", filter: "drop-shadow(0 4px 12px rgba(0,0,0,.55))" }}>{team ? <TeamLogo team={team} size={48} /> : <ProfileAvatar profile={profile as any} size={48} showStars={false} />}</div>
            <div style={{ position: "relative", zIndex: 1, marginTop: 1, textAlign: "center", color: accent, fontSize: 22, lineHeight: 1, fontWeight: 1000, letterSpacing: -.8, textShadow: `0 0 12px ${accent}2e, 0 2px 8px rgba(0,0,0,.72)` }}>{standing.progress}<span style={{ fontSize: 10, color: "rgba(255,255,255,.55)", letterSpacing: 0 }}>/20</span></div>
            <div style={{ position: "relative", zIndex: 1, marginTop: 3, color: standing.eliminated ? C.red : "rgba(255,255,255,.58)", fontSize: 8.2, fontWeight: 900 }}>{standing.eliminated ? "ÉLIMINÉ" : `${standing.dartsOwned} fl. • ${standing.captures} cap. • ${standing.prisoners} prison.`}</div>
          </button>;
        })}
      </div>

      {/* DÉTAILS DE PARTIE : remplace PROCHAINES CIBLES + PRISONNIERS */}
      <button type="button" onClick={() => setShowDetails(true)} style={{ width: "100%", minHeight: 40, marginTop: 6, padding: "5px 10px", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "center", gap: 8, borderRadius: 14, border: `1px solid ${primary}28`, background: `linear-gradient(90deg, ${primary}08, rgba(66,214,255,.035), ${primary}08)`, color: "inherit", cursor: "pointer", boxShadow: "inset 0 0 18px rgba(0,0,0,.18)" }}>
        <div style={{ minWidth: 0, textAlign: "left" }}><div style={{ color: primary, fontSize: 10.5, fontWeight: 1100, letterSpacing: .8 }}>DÉTAILS DE PARTIE</div><div style={{ marginTop: 2, color: themeSoft, fontSize: 8.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Cible {target ?? "FIN"} • {state.prisoners.length} prisonnier{state.prisoners.length > 1 ? "s" : ""} • {activeStats.captures} capture{activeStats.captures > 1 ? "s" : ""} • prochaines : {nextTargets.join(" · ") || "—"}</div></div>
        <span style={{ width: 24, height: 24, borderRadius: "50%", display: "grid", placeItems: "center", border: `1px solid ${primary}66`, color: primary, fontSize: 15, fontWeight: 1000 }}>›</span>
      </button>

      {!state.finished ? <section style={{ marginTop: 6 }}>
        {notice ? <div style={{ marginBottom: 6, padding: "6px 9px", borderRadius: 11, background: `${primary}0d`, border: `1px solid ${primary}22`, color: primary, fontSize: 9.2, fontWeight: 900, textAlign: "center" }}>{notice}</div> : null}

        {dartsBudget > 0 && !activeIsBot ? <VolleyStrip darts={throwDarts} budget={dartsBudget} primary={primary} soft={themeSoft} /> : null}

        {dartsBudget <= 0 && !activeIsBot ? <button onClick={validateVisit} style={{ width: "100%", minHeight: 50, borderRadius: 999, border: `1px solid ${C.red}88`, background: `${C.red}14`, color: C.red, fontWeight: 1100 }}>PASSER LE TOUR · AUCUNE FLÉCHETTE DISPONIBLE</button> : null}

        {dartsBudget > 0 && !activeIsBot ? <>
          {config.scoreInputMethod === "dartboard" ? <div style={{ ...panelStyle(), padding: 8, opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}>
            <DartboardClickable onHit={() => {}} onDetailedHit={onDetailedBoardHit} multiplier={multiplier} size={305} disabled={throwDarts.length >= dartsBudget} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}><button onClick={cancelOrUndo} style={actionButton(primary)}>ANNULER</button><button onClick={() => addDart(0, 1)} style={actionButton(C.red)}>MISS</button><button onClick={validateVisit} style={actionButton(C.green)}>VALIDER</button></div>
          </div> : <Keypad
            currentThrow={throwDarts as any}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onCancel={cancelOrUndo}
            onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))}
            onNumber={(n: number) => addDart(n)}
            onBull={() => addDart(25, multiplier === 2 ? 2 : 1)}
            onValidate={validateVisit}
            hidePreview
            hideTotal
            singleRingSelector={{
              value: singleRing,
              onOuter: () => { setSingleRing("outer"); setMultiplier(1); },
              onInner: () => { setSingleRing("inner"); setMultiplier(1); },
              outerLabel: "SIMPLE EXT.",
              innerLabel: "SIMPLE INT.",
            }}
            validateAttention={throwDarts.length >= dartsBudget}
            safeBottomPad
          />}
        </> : null}

        {activeIsBot ? <div style={{ ...panelStyle(), minHeight: 82, display: "grid", placeItems: "center", color: primary, fontWeight: 1000, letterSpacing: 1 }}>{botThinking ? "BOT EN RÉFLEXION…" : "TOUR DU BOT"}</div> : null}
      </section> : null}
    </div>

    {showTable ? <StandingsModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowTable(false)} /> : null}
    {showDetails ? <DetailsModal state={state} config={config} profilesById={byId} teamById={teamById} activePlayerId={activePlayerId} primary={primary} secondary={secondary} onClose={() => setShowDetails(false)} /> : null}
    {showEnd && state.finished ? <EndModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowEnd(false)} onReplay={resetMatch} onHistory={() => { try { onFinish?.(buildHistoryRecord(), { navigate: true }); } catch { if (typeof go === "function") go("statsHub", { tab: "history" }); } }} /> : null}
  </div>;
}

function ActiveDartsTray({ playable, prisoners, misses, owned, color }: any) {
  const total = Math.max(0, Number(owned || 0));
  const slots = Array.from({ length: total }, (_, i) => i < playable ? "playable" : i < playable + prisoners ? "prison" : "miss");
  return <div style={{ marginTop: 5, minHeight: 28, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, maxWidth: "100%", overflow: "hidden" }}>
      {slots.length ? slots.map((status, i) => <DartIconColorizable key={`${status}-${i}`} color={status === "prison" ? C.pink : status === "miss" ? C.red : color} active size={22} />) : <span style={{ color: C.red, fontSize: 8.5, fontWeight: 1000 }}>AUCUNE FLÉCHETTE</span>}
    </div>
    {slots.length ? <div style={{ marginTop: 1, color: "rgba(255,255,255,.42)", fontSize: 6.9, fontWeight: 900, letterSpacing: .25 }}>{playable} JOUABLE{prisoners ? ` • ${prisoners} PRISON` : ""}{misses ? ` • ${misses} MISS` : ""}</div> : null}
  </div>;
}

function VolleyStrip({ darts, budget, primary, soft }: any) {
  const slots = Math.max(3, Number(budget || 0));
  return <div style={{ marginBottom: 6, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(180deg,rgba(18,18,20,.76),rgba(9,9,11,.92))", padding: "6px 8px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}><span style={{ color: soft, fontSize: 8.2, fontWeight: 1000, letterSpacing: .7 }}>VOLÉE</span><span style={{ color: primary, fontSize: 8.2, fontWeight: 1000 }}>{darts.length}/{budget}</span></div>
    <div className="dc-scroll-thin" style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 1 }}>
      {Array.from({ length: slots }, (_, i) => <div key={i} style={{ flex: "1 0 58px", minWidth: 58, minHeight: 33, display: "grid", placeItems: "center", borderRadius: 12, background: darts[i] ? "rgba(0,0,0,.58)" : "rgba(255,255,255,.025)", border: `1px solid ${darts[i] ? `${primary}55` : "rgba(255,255,255,.08)"}`, color: darts[i] ? primary : "rgba(255,255,255,.28)", fontSize: 10.5, fontWeight: 1000, letterSpacing: .4, boxShadow: darts[i] ? `0 0 14px ${primary}18` : "none" }}>{darts[i] ? uiLabel(darts[i]) : "—"}</div>)}
    </div>
  </div>;
}

function actionButton(color: string): React.CSSProperties { return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer" }; }
function td(color = "#fff"): React.CSSProperties { return { padding: 7, textAlign: "center", fontWeight: 950, color }; }

function StandingsModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(780px,100%)", maxHeight: "86vh", overflow: "auto", padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ width: 34 }} /><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CLASSEMENT PRISONER</div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ display: "grid", gap: 8 }}>{state.standings.map((standing: any) => <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}`, opacity: standing.eliminated ? .55 : 1 }}><div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>{participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={38} /> : <ProfileAvatar profile={profilesById.get(standing.id)} size={38} showStars={false} />}<div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏆" : ""}</div><div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>{standing.progress}/20 · {standing.captures} captures · {standing.prisoners} prisonniers{standing.eliminated ? " · ÉLIMINÉ" : ""}</div></div><div style={{ color: primary, fontSize: 20, fontWeight: 1100 }}>{standing.dartsOwned} 🎯</div></div>)}</div>
  </div></div>;
}

function PrisonAvatar({ profile, color }: any) {
  return <div style={{ position: "relative", width: 56, height: 56, borderRadius: 14, overflow: "hidden", border: `1px solid ${color}66`, background: "#05070c", boxShadow: "inset 0 0 18px rgba(0,0,0,.65)" }}>
    <div style={{ position: "absolute", inset: 2, display: "grid", placeItems: "center", opacity: .82 }}><ProfileAvatar profile={profile} size={50} showStars={false} /></div>
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, transparent 0 8px, rgba(205,214,224,.92) 8px 11px, transparent 11px 18px), linear-gradient(180deg, transparent 0 33%, rgba(205,214,224,.82) 33% 38%, transparent 38% 66%, rgba(205,214,224,.82) 66% 71%, transparent 71% 100%)", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.9))", pointerEvents: "none" }} />
  </div>;
}

function DetailsModal({ state, config, profilesById, teamById, activePlayerId, primary, secondary, onClose }: any) {
  const [tab, setTab] = React.useState<DetailTab>("route");
  const progress = Number(state.progressIndexByPlayer[activePlayerId] || 0);
  const currentTarget = getPrisonerTarget(state, activePlayerId);
  const activeStats = state.statsByPlayer[activePlayerId] || emptyPrisonerStats(state.rules.startingDarts);
  const tabs: Array<[DetailTab, string]> = [["route","PARCOURS"],["prison","PRISON"],["stats","STATS"],["visits","VOLÉES"]];

  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.76)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(820px,100%)", maxHeight: "90vh", overflow: "hidden", padding: 0, borderColor: `${primary}55` }}>
      <div style={{ padding: "11px 12px 9px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div><div style={{ color: primary, fontSize: 11, fontWeight: 1100, letterSpacing: 1 }}>DÉTAILS DE PARTIE</div><div style={{ marginTop: 3, color: "rgba(255,255,255,.56)", fontSize: 9.2 }}>Cible {currentTarget ?? "FIN"} • {state.prisoners.length} prisonnier{state.prisoners.length > 1 ? "s" : ""} • tour #{state.visitNo + 1}</div></div>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button>
      </div>

      <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 9px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>{tabs.map(([id,label]) => <button key={id} onClick={() => setTab(id)} style={{ flex: "1 0 86px", minHeight: 34, borderRadius: 999, border: `1px solid ${tab === id ? primary : "rgba(255,255,255,.10)"}`, background: tab === id ? `${primary}18` : "rgba(255,255,255,.035)", color: tab === id ? primary : "rgba(255,255,255,.68)", fontSize: 8.8, fontWeight: 1000 }}>{label}</button>)}</div>

      <div className="dc-scroll-thin" style={{ padding: 11, overflowY: "auto", maxHeight: "calc(90vh - 118px)" }}>
        {tab === "route" ? <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginBottom: 10 }}>{[["PROGRESSION",`${progress}/20`,primary],["CIBLE",currentTarget ?? "✓",secondary],["JOUABLES",getPrisonerAvailableDarts(state,activePlayerId),C.green],["PRISON",getPrisonersOwnedCount(state,activePlayerId),C.pink]].map(([label,value,color]: any) => <Kpi key={label} label={label} value={value} color={color} />)}</div>
          <div style={{ color: "rgba(255,255,255,.56)", fontSize: 9.5, marginBottom: 8 }}>{config.sequenceMode === "clockwise" ? "Ordre physique du cadran" : "Ordre numérique 1 → 20"}. Les cases validées sont assombries, la cible actuelle est mise en évidence.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6 }}>{state.sequence.map((n: number, i: number) => { const done = i < progress; const current = i === progress; return <div key={`${n}-${i}`} style={{ minHeight: 38, borderRadius: 12, display: "grid", placeItems: "center", border: `1px solid ${current ? primary : done ? `${C.green}44` : "rgba(255,255,255,.08)"}`, background: current ? `${primary}1d` : done ? `${C.green}0b` : "rgba(255,255,255,.025)", color: current ? primary : done ? C.green : "rgba(255,255,255,.56)", fontWeight: 1100, fontSize: current ? 16 : 11 }}>{done ? "✓ " : ""}{n}</div>; })}</div>
        </div> : null}

        {tab === "prison" ? <div>
          <div style={{ padding: 9, borderRadius: 13, background: `${C.pink}0b`, border: `1px solid ${C.pink}24`, color: "rgba(255,255,255,.70)", fontSize: 9.5, lineHeight: 1.45 }}>Chaque carte représente une <b style={{ color: C.pink }}>fléchette emprisonnée</b>. L'avatar derrière les barreaux indique son propriétaire actuel. Touche le même numéro en SE / Double / Triple pour la libérer ou la capturer ; au Bull, touche Bull ou DBull.</div>
          <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8 }}>{state.prisoners.map((token: any, index: number) => { const profile = profilesById.get(String(token.ownerId)); const pIndex = state.players.findIndex((p: any) => String(p.id) === String(token.ownerId)); const col = playerColor(pIndex < 0 ? index : pIndex); return <div key={token.id} style={{ position: "relative", minHeight: 82, display: "grid", gridTemplateColumns: "60px minmax(0,1fr)", gap: 8, alignItems: "center", padding: 8, borderRadius: 14, background: `${C.pink}0a`, border: `1px solid ${C.pink}2a` }}><PrisonAvatar profile={profile} color={col} /><div style={{ minWidth: 0 }}><div style={{ color: C.pink, fontSize: 19, lineHeight: 1, fontWeight: 1100 }}>{token.location === "BULL" ? "BULL" : token.location}</div><div style={{ marginTop: 4, color: "#fff", fontSize: 10, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(profile)}</div><div style={{ marginTop: 3, color: "rgba(255,255,255,.48)", fontSize: 8.2 }}>Prisonnier depuis la volée #{token.createdVisit}</div></div></div>; })}{!state.prisoners.length ? <div style={{ gridColumn: "1/-1", padding: 24, borderRadius: 14, textAlign: "center", color: "rgba(255,255,255,.48)", border: "1px dashed rgba(255,255,255,.10)" }}>Aucune fléchette en prison.</div> : null}</div>
        </div> : null}

        {tab === "stats" ? <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginBottom: 9 }}>{[["VOLÉES",state.history.length,primary],["CAPTURES",state.players.reduce((a:any,p:any)=>a+Number(state.statsByPlayer[p.id]?.captures||0),0),C.green],["PRISONNIERS",state.players.reduce((a:any,p:any)=>a+Number(state.statsByPlayer[p.id]?.prisonersCreated||0),0),C.pink],["MISS",state.players.reduce((a:any,p:any)=>a+Number(state.statsByPlayer[p.id]?.offboardMisses||0),0),C.red]].map(([label,value,color]: any) => <Kpi key={label} label={label} value={value} color={color} />)}</div>
          <div style={{ display: "grid", gap: 7 }}>{state.players.map((p: any, i: number) => { const st = state.statsByPlayer[p.id] || emptyPrisonerStats(state.rules.startingDarts); const profile = profilesById.get(p.id) || p; const col = playerColor(i); return <div key={p.id} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.035)", border: `1px solid ${col}35` }}><ProfileAvatar profile={profile} size={38} showStars={false} /><div style={{ minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ color: col, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(profile)}</b><b>{Number(state.progressIndexByPlayer[p.id]||0)}/20</b></div><div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4, color: "rgba(255,255,255,.56)", fontSize: 8.2 }}><span>{st.captures} cap.</span><span>{st.prisonersCreated} prison.</span><span>{st.offboardMisses} miss</span><span>{Number(state.dartsOwnedByPlayer[p.id]||0)} fl.</span></div></div></div>; })}</div>
        </div> : null}

        {tab === "visits" ? <div style={{ display: "grid", gap: 7 }}>{state.history.slice().reverse().slice(0, 30).map((visit: any) => { const profile = profilesById.get(String(visit.playerId)); return <div key={visit.id} style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 8, borderRadius: 13, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)" }}><ProfileAvatar profile={profile} size={34} showStars={false} /><div style={{ minWidth: 0 }}><div style={{ fontSize: 9.5, fontWeight: 1000 }}>{playerName(profile)} • Volée #{visit.visitNo}</div><div style={{ marginTop: 3, color: "rgba(255,255,255,.55)", fontSize: 8.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{visit.skipped ? "TOUR PASSÉ" : (visit.labels || []).join(" · ") || "—"}</div></div><div style={{ textAlign: "right", fontSize: 8.2, lineHeight: 1.35 }}><div style={{ color: C.green }}>+{visit.progressHits || 0} cible</div><div style={{ color: C.cyan }}>{visit.captures || 0} cap.</div><div style={{ color: C.pink }}>{visit.prisonersCreated || 0} prison.</div></div></div>; })}{!state.history.length ? <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,.48)" }}>Aucune volée jouée pour le moment.</div> : null}</div> : null}
      </div>
    </div>
  </div>;
}

function Kpi({ label, value, color }: any) {
  return <div style={{ minWidth: 0, padding: "7px 4px", borderRadius: 12, textAlign: "center", background: `${color}09`, border: `1px solid ${color}28` }}><div style={{ color: "rgba(255,255,255,.45)", fontSize: 7.2, fontWeight: 950, letterSpacing: .35 }}>{label}</div><div style={{ marginTop: 4, color, fontSize: 14, lineHeight: 1, fontWeight: 1100 }}>{value}</div></div>;
}

function EndModal({ state, profilesById, teamById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const rows = state.players.map((player: any) => ({ player, profile: profilesById.get(player.id) || player, stats: state.statsByPlayer[player.id] || emptyPrisonerStats(state.rules.startingDarts), progress: Number(state.progressIndexByPlayer[player.id] || 0), dartsOwned: Number(state.dartsOwnedByPlayer[player.id] || 0), prisoners: getPrisonersOwnedCount(state, player.id), completed: Boolean(state.completedByPlayer[player.id]), eliminated: Boolean(state.eliminatedByPlayer[player.id]), teamId: state.teamByPlayer[player.id] || null })).sort((a: any, b: any) => Number(b.completed) - Number(a.completed) || b.progress - a.progress || b.dartsOwned - a.dartsOwned || b.stats.captures - a.stats.captures);
  const winner = state.standings.find((s: any) => state.winnerIds.includes(s.id)) || state.standings[0];
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.80)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}><div style={{ ...panelStyle(), width: "min(940px,100%)", maxHeight: "94vh", overflow: "auto", borderColor: `${primary}77`, padding: 13 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ width: 34 }} /><div style={{ textAlign: "center" }}><div style={{ color: primary, fontSize: 11, fontWeight: 1000, letterSpacing: 1.2 }}>FIN DE PARTIE</div><div style={{ fontSize: 20, fontWeight: 1100 }}>PRISONER</div></div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ marginTop: 11, padding: 12, borderRadius: 16, background: `${primary}10`, border: `1px solid ${primary}44`, textAlign: "center" }}><div style={{ color: C.gold, fontSize: 10, fontWeight: 1000 }}>VAINQUEUR</div><div style={{ marginTop: 4, fontSize: 22, fontWeight: 1100 }}>{state.tied ? "ÉGALITÉ" : winner?.name || "—"}</div><div style={{ color: primary, fontSize: 12, fontWeight: 900, marginTop: 4 }}>{state.finishReason === "course_completed" ? "Parcours terminé" : state.finishReason === "last_team" ? "Dernière équipe encore en jeu" : "Dernier joueur encore en jeu"}</div></div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>{[["Durée", fmtDuration((state.finishedAt || Date.now()) - state.startedAt)], ["Flèches", rows.reduce((a: number, r: any) => a + r.stats.darts, 0)], ["Captures", rows.reduce((a: number, r: any) => a + r.stats.captures, 0)], ["Prisonniers", rows.reduce((a: number, r: any) => a + r.stats.prisonersCreated, 0)]].map(([label, value]: any) => <div key={label} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.55)", fontSize: 9 }}>{label}</div><div style={{ fontWeight: 1100, fontSize: 18, color: primary }}>{value}</div></div>)}</div>
    <div style={{ marginTop: 10, overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980, fontSize: 10.5 }}><thead><tr style={{ background: "rgba(255,255,255,.05)" }}>{["Joueur","Prog.","🎯 fin","Capt.","Perdues","Prison.","Rescues","MISS","SE","SI","D","T","Bull","Darts","Best +"].map((h) => <th key={h} style={{ padding: "8px 6px", textAlign: h === "Joueur" ? "left" : "center", color: "rgba(255,255,255,.68)" }}>{h}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}{row.completed ? <span style={{ color: C.green }}> · FINI</span> : row.eliminated ? <span style={{ color: C.red }}> · OUT</span> : ""}</td><td style={td(primary)}>{row.progress}/20</td><td style={td(C.gold)}>{row.dartsOwned}</td><td style={td(C.green)}>{row.stats.captures}</td><td style={td(C.red)}>{row.stats.captureLosses}</td><td style={td(C.pink)}>{row.stats.prisonersCreated}</td><td style={td(C.cyan)}>{row.stats.ownRescues}</td><td style={td(C.red)}>{row.stats.offboardMisses}</td><td style={td()}>{row.stats.outerSingles}</td><td style={td(C.pink)}>{row.stats.innerSingles}</td><td style={td()}>{row.stats.doubles}</td><td style={td()}>{row.stats.triples}</td><td style={td()}>{row.stats.bulls + row.stats.dbulls}</td><td style={td()}>{row.stats.darts}</td><td style={td(C.green)}>{row.stats.bestProgressVisit}</td></tr>)}</tbody></table></div>
    <div style={{ marginTop: 10, display: "grid", gap: 7 }}>{rows.map((row: any) => <details key={row.player.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><summary style={{ cursor: "pointer", fontWeight: 1000, color: primary }}>{playerName(row.profile)} — stats complètes</summary><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 6 }}>{[["Progression", `${row.progress}/20 (${progressPct(row.progress)}%)`], ["Captures adverses", row.stats.opponentCaptures], ["Sauvetages propres", row.stats.ownRescues], ["Flèches perdues", row.stats.captureLosses], ["Prisonniers créés", row.stats.prisonersCreated], ["Prisonniers restants", row.prisoners], ["Max flèches possédées", row.stats.maxDartsOwned], ["Min flèches possédées", row.stats.minDartsOwned], ["Tours passés", row.stats.turnsSkipped], ["MISS hors cible", row.stats.offboardMisses], ["Précision progression", `${pct(row.stats.progressHits,row.stats.darts)}%`], ["Série progression", row.stats.bestProgressStreak]].map(([k,v]: any) => <div key={k} style={{ padding: 8, borderRadius: 11, background: "rgba(0,0,0,.23)" }}><div style={{ color: "rgba(255,255,255,.52)", fontSize: 8.8 }}>{k}</div><div style={{ color: primary, fontWeight: 1100, marginTop: 2 }}>{v}</div></div>)}</div></details>)}</div>
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}><button onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}16`, color: primary, fontWeight: 1100 }}>REJOUER</button><button onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,${primary},#ffd76a)`, color: "#14120b", fontWeight: 1100 }}>HISTORIQUE & STATS</button></div>
  </div></div>;
}
