// @ts-nocheck
// =============================================================
// SHOOTER — moteur complet, bots, undo, équipes, stats/history
// UI harmonisée CAPITAL / X01 + tableau des marks par round
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
  cloneShooterState,
  createShooterState,
  emptyShooterStats,
  getShooterActiveEntity,
  getShooterActivePlayerId,
  getShooterCurrentTarget,
  isShooterTargetHit,
  playShooterVisit,
  shooterTargetLabel,
  type ShooterConfigPayload,
  type ShooterHitZone,
  type ShooterPlayerStats,
  type ShooterState,
  type ShooterTeamConfig,
} from "../lib/gameEngines/shooterEngine";
import tickerShooter from "../assets/tickers/ticker_shooter.png";
import targetBg from "../assets/target_bg.png";

type UiDart = { v: number; mult: 1 | 2 | 3 };
const C = {
  gold: "#ffd76a",
  goldStrong: "#ffc63a",
  cyan: "#42d6ff",
  green: "#65efb4",
  red: "#ff667e",
  pink: "#ff63b8",
  text: "#f8fafc",
  soft: "rgba(226,232,240,.72)",
};

const SHOOTER_PLAYER_COLORS = [
  "#2fd8ff",
  "#e761c4",
  "#ff9b52",
  "#8c7dff",
  "#67e2a1",
  "#ffcf57",
  "#ff6f88",
  "#62d7c9",
];

function shooterPlayerColor(index: number) {
  return SHOOTER_PLAYER_COLORS[Math.max(0, Number(index) || 0) % SHOOTER_PLAYER_COLORS.length];
}

function rankColor(rank: number, fallback: string) {
  if (rank === 1) return "#f5c84b";
  if (rank === 2) return "#c7ced8";
  if (rank === 3) return "#c98245";
  return fallback;
}

function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur";
}

function isBot(profile: any, botIds: Set<string>) {
  return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot");
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function fmtDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function toGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}

function uiLabel(dart?: UiDart) {
  if (!dart) return "—";
  if (dart.v === 0) return "MISS";
  if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

function dartMarks(dart: UiDart) {
  if (!dart || dart.v === 0) return 0;
  if (dart.v === 25) return dart.mult === 2 ? 2 : 1;
  return dart.mult;
}

function dartPoints(dart: UiDart) {
  if (!dart || dart.v === 0) return 0;
  if (dart.v === 25) return dart.mult === 2 ? 50 : 25;
  return dart.v * dart.mult;
}

function panelStyle(): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 12,
    background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.25))",
    border: "1px solid rgba(255,255,255,.10)",
    boxShadow: "0 14px 34px rgba(0,0,0,.30)",
    boxSizing: "border-box",
  };
}

function normalizeConfig(props: any): ShooterConfigPayload {
  const raw = props?.params?.config || props?.config || props?.params || {};
  const zone: ShooterHitZone = raw?.hitZone === "single" || raw?.hitZone === "double" || raw?.hitZone === "triple" ? raw.hitZone : "any";
  return {
    mode: "shooter",
    participantMode: raw?.participantMode === "teams" ? "teams" : "players",
    players: Math.max(1, Number(raw?.players || raw?.selectedIds?.length || 1)),
    selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [],
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    playerDartSets: raw?.playerDartSets || {},
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    sequencePreset: raw?.sequencePreset === "around" || raw?.sequencePreset === "pro" || raw?.sequencePreset === "random" ? raw.sequencePreset : "classic",
    randomTargetCount: Math.max(3, Math.min(20, Number(raw?.randomTargetCount || 10))),
    includeBull: zone === "triple" ? false : raw?.includeBull !== false,
    hitZone: zone,
    marksToClear: ([1, 2, 3, 4, 5, 6].includes(Number(raw?.marksToClear)) ? Number(raw.marksToClear) : 3) as any,
    maxRounds: Math.max(0, Math.min(99, Number(raw?.maxRounds ?? 15))),
    penaltyRule: raw?.penaltyRule === "score" || raw?.penaltyRule === "progress" ? raw.penaltyRule : "none",
    randomOrder: Boolean(raw?.randomOrder),
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
  };
}

function botHitChance(level: string) {
  const v = String(level || "").toLowerCase();
  if (v.includes("hard") || v.includes("pro") || v.includes("diffic")) return .72;
  if (v.includes("easy") || v.includes("facile")) return .34;
  return .52;
}

function validBotDart(target: number, zone: ShooterHitZone, level: string): UiDart {
  if (target === 25) {
    if (zone === "double") return { v: 25, mult: 2 };
    if (zone === "single") return { v: 25, mult: 1 };
    return { v: 25, mult: String(level).toLowerCase().includes("hard") && Math.random() < .45 ? 2 : 1 };
  }
  if (zone === "single") return { v: target, mult: 1 };
  if (zone === "double") return { v: target, mult: 2 };
  if (zone === "triple") return { v: target, mult: 3 };
  const roll = Math.random();
  return { v: target, mult: roll < .24 ? 3 : roll < .50 ? 2 : 1 };
}

function missBotDart(target: number): UiDart {
  if (Math.random() < .16) return { v: 0, mult: 1 };
  if (target === 25) return { v: [20, 1, 18, 5][Math.floor(Math.random() * 4)], mult: Math.random() < .2 ? 3 : 1 } as UiDart;
  let value = Math.max(1, Math.min(20, target + (Math.random() < .5 ? -1 : 1)));
  if (value === target) value = target === 20 ? 19 : target + 1;
  const roll = Math.random();
  return { v: value, mult: roll < .17 ? 2 : roll < .31 ? 3 : 1 } as UiDart;
}

function randomBotVisit(target: number, zone: ShooterHitZone, level: string): UiDart[] {
  const chance = botHitChance(level);
  return Array.from({ length: 3 }, () => Math.random() < chance ? validBotDart(target, zone, level) : missBotDart(target));
}

function zoneLabel(zone: ShooterHitZone) {
  if (zone === "single") return "SIMPLE";
  if (zone === "double") return "DOUBLE";
  if (zone === "triple") return "TRIPLE";
  return "S / D / T";
}

function presetLabel(preset: string) {
  if (preset === "around") return "TOUR 1 → 20";
  if (preset === "pro") return "PRO 20 → 2";
  if (preset === "random") return "CIBLES ALÉATOIRES";
  return "CLASSIQUE 20 → 15";
}

function RulesContent({ config, primary }: { config: ShooterConfigPayload; primary: string }) {
  const penaltyText = config.penaltyRule === "score"
    ? "Si tu ne touches pas du tout ta cible pendant les 3 fléchettes, la valeur de la cible est retirée de ton score."
    : config.penaltyRule === "progress"
      ? "Si tu fais 0/3 sur ta cible, tu perds 1 mark déjà acquis sur cette cible (sans descendre sous 0)."
      : "Un 0/3 ne retire rien : tu passes simplement ton tour sans progresser.";
  const bullText = config.hitZone === "triple"
    ? "Le BULL est automatiquement absent lorsque la zone exigée est TRIPLE."
    : config.hitZone === "double"
      ? "Sur le BULL, seul le DBULL compte et vaut 2 marks."
      : config.hitZone === "single"
        ? "Sur le BULL, seul le BULL extérieur compte et vaut 1 mark."
        : "Sur le BULL : BULL = 1 mark et DBULL = 2 marks.";

  return (
    <div style={{ display: "grid", gap: 11, fontSize: 12.5, lineHeight: 1.46 }}>
      <div style={{ padding: 10, borderRadius: 12, background: `${primary}10`, border: `1px solid ${primary}33` }}>
        <strong style={{ color: primary }}>LE PRINCIPE EN UNE PHRASE</strong><br />
        Chaque joueur ou équipe avance dans la même séquence de cibles, mais à son propre rythme : il faut remplir les marks de la cible actuelle pour passer à la suivante.
      </div>

      <div><strong style={{ color: C.gold }}>1 — TA CIBLE ACTUELLE</strong><br />
        La partie utilise le parcours <b>{presetLabel(config.sequencePreset)}</b>{config.includeBull ? " + BULL" : ""}. Tu ne peux marquer que sur <b>ta cible affichée</b>. Toucher un autre numéro ne donne ni mark ni point.
      </div>

      <div><strong style={{ color: C.gold }}>2 — UN TOUR = 3 FLÉCHETTES</strong><br />
        Tu lances exactement 3 fléchettes sur la cible demandée. Après validation, le tour passe au joueur suivant. Quand tout le monde a joué, on passe au round suivant.
      </div>

      <div><strong style={{ color: primary }}>3 — COMMENT GAGNER DES MARKS ?</strong><br />
        Il faut atteindre la cible dans la zone autorisée : <b>{zoneLabel(config.hitZone)}</b>. En mode S / D / T : Simple = 1 mark, Double = 2 marks, Triple = 3 marks. Il faut <b>{config.marksToClear} mark{config.marksToClear > 1 ? "s" : ""}</b> pour fermer une cible. {bullText}
      </div>

      <div><strong style={{ color: primary }}>4 — QUAND LA CIBLE EST FERMÉE</strong><br />
        Dès que tu atteins {config.marksToClear} mark{config.marksToClear > 1 ? "s" : ""}, la cible est validée. <b>La cible suivante commencera à ton prochain tour.</b> Les marks en trop ne sont pas transférés sur la cible suivante.
      </div>

      <div><strong style={{ color: C.green }}>5 — À QUOI SERVENT LES POINTS ?</strong><br />
        Chaque impact valide ajoute aussi sa valeur réelle au score : S20 = 20 pts, D20 = 40 pts, T20 = 60 pts, BULL = 25 pts, DBULL = 50 pts. Les points servent surtout à départager deux progressions identiques.
      </div>

      <div style={{ padding: 10, borderRadius: 12, background: "rgba(101,239,180,.07)", border: "1px solid rgba(101,239,180,.24)" }}>
        <strong style={{ color: C.green }}>EXEMPLE TRÈS CONCRET</strong><br />
        Ta cible est <b>20</b> et il faut 3 marks. Tu fais <b>S20 + D20 + S5</b> : 1 + 2 + 0 = <b>3 marks</b>. Le 20 est fermé, tu marques <b>60 points</b>, et à ton prochain tour tu joueras la cible suivante. Le S5 ne compte pas car 5 n'était pas ta cible.
      </div>

      <div><strong style={{ color: C.red }}>6 — SI TU FAIS 0/3</strong><br />{penaltyText}</div>

      {config.participantMode === "teams" ? (
        <div><strong style={{ color: C.pink }}>7 — MODE ÉQUIPES</strong><br />
          Les joueurs gardent chacun leur tour, mais <b>la progression, les marks de la cible et le score sont partagés par l'équipe</b>. Les statistiques de précision restent aussi enregistrées joueur par joueur.
        </div>
      ) : null}

      <div><strong style={{ color: C.gold }}>{config.participantMode === "teams" ? "8" : "7"} — COMMENT GAGNER ?</strong><br />
        Le premier joueur ou la première équipe qui ferme la dernière cible gagne immédiatement. {config.maxRounds ? `Si personne ne termine avant la fin du round ${config.maxRounds}, le classement compare d'abord les cibles fermées, puis les marks sur la cible en cours, puis le score et enfin la précision.` : "Sans limite de rounds, la partie continue jusqu'à ce qu'un participant termine toute la séquence."}
      </div>

      <div><strong style={{ color: primary }}>LECTURE DE L'ÉCRAN</strong><br />
        La grande carte indique le joueur actif, son score et sa cible. La barre de marks indique l'avancement sur cette cible : <b>touche-la pour ouvrir le tableau des marks round par round</b>. Les cartes sous le parcours affichent le classement live.
      </div>

      <div><strong style={{ color: primary }}>ANNULER / CORRIGER</strong><br />
        ANNULER retire la dernière saisie de la volée. Si la volée est vide, il restaure le tour précédent lorsque c'est possible.
      </div>
    </div>
  );
}

function TeamLogo({ team, size = 48 }: { team: any; size?: number }) {
  const src = team?.logoDataUrl || team?.logoUrl || null;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${team?.color || C.gold}`, display: "grid", placeItems: "center", overflow: "hidden", background: `${team?.color || C.gold}18`, boxShadow: `0 0 15px ${team?.color || C.gold}44`, flex: "0 0 auto" }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: team?.color || C.gold, fontWeight: 1000, fontSize: size * .34 }}>{String(team?.name || "E").slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

export default function ShooterPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || C.cyan;
  const secondary = theme?.accent1 || primary;
  const themeText = theme?.text || C.text;
  const themeSoft = theme?.textSoft || C.soft;
  const themeStroke = theme?.borderSoft || "rgba(255,255,255,.10)";

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => {
      const id = String(profile?.id || profile?.profileId || "");
      if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) });
    });
    const ordered = (config.selectedIds || []).map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config.selectedIds, config.playersList, config.players]);

  const teamConfigs = React.useMemo<ShooterTeamConfig[]>(() => (config.teamConfigs || []).map((team: any, index: number) => ({
    id: String(team?.id || `team-${index + 1}`),
    name: String(team?.name || `Équipe ${index + 1}`),
    color: team?.color || [C.gold, C.pink, C.cyan, C.green][index % 4],
    logoDataUrl: team?.logoDataUrl || team?.logoUrl || null,
    playerIds: Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [],
    isBotTeam: Boolean(team?.isBotTeam),
  })), [config.teamConfigs]);

  const rules = React.useMemo(() => ({
    participantMode: config.participantMode,
    sequencePreset: config.sequencePreset,
    randomTargetCount: config.randomTargetCount,
    includeBull: config.includeBull,
    hitZone: config.hitZone,
    marksToClear: config.marksToClear,
    maxRounds: config.maxRounds,
    penaltyRule: config.penaltyRule,
  }), [config]);

  const initialState = React.useMemo(() => createShooterState(profiles as any, rules, teamConfigs, config.selectedIds), []);
  const [state, setState] = React.useState<ShooterState>(initialState);
  const [undoStack, setUndoStack] = React.useState<ShooterState[]>([]);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [showMarksTable, setShowMarksTable] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const matchIdRef = React.useRef(`shooter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const autoSavedRef = React.useRef("");
  const lastBackRef = React.useRef(0);

  const byId = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const teamById = React.useMemo(() => new Map(teamConfigs.map((team) => [String(team.id), team])), [teamConfigs]);
  const activePlayerId = getShooterActivePlayerId(state);
  const activeProfile = byId.get(String(activePlayerId)) || state.players.find((p) => p.id === activePlayerId) || state.players[0];
  const activeStats = state.statsByPlayer[activePlayerId] || emptyShooterStats();
  const activeTeamId = state.teamByPlayer[activePlayerId] || null;
  const activeTeam = activeTeamId ? teamById.get(activeTeamId) : null;
  const activeEntity = getShooterActiveEntity(state);
  const target = getShooterCurrentTarget(state);
  const targetLabel = shooterTargetLabel(target);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const activePlayerIndex = Math.max(0, state.players.findIndex((p) => String(p.id) === String(activePlayerId)));
  const activeColor = activeTeam?.color || shooterPlayerColor(activePlayerIndex);
  const activeStanding = state.standings.find((row) => String(row.id) === String(activeEntity?.id));

  function commitVisit(darts: UiDart[]) {
    if (state.finished || darts.length < 1) return;
    setUndoStack((stack) => [...stack.slice(-49), cloneShooterState(state)]);
    setState((prev) => playShooterVisit(prev, darts.map(toGameDart)));
    setThrowDarts([]);
    setMultiplier(1);
    setNotice("");
  }

  function addDart(value: number, directMultiplier?: 1 | 2 | 3) {
    if (state.finished || botThinking || throwDarts.length >= 3) return;
    const mult = directMultiplier || multiplier;
    const dart: UiDart = value === 25
      ? { v: 25, mult: mult === 2 ? 2 : 1 }
      : { v: Math.max(0, Math.min(20, Number(value) || 0)), mult };
    const next = [...throwDarts, dart];
    setThrowDarts(next);
    if (mult > 1) setMultiplier(1);
    if (next.length === 3) setNotice("Volée complète — VALIDER");
  }

  function validateVisit() {
    if (state.finished || botThinking) return;
    if (throwDarts.length !== 3) {
      setNotice("SHOOTER se joue avec 3 fléchettes par volée.");
      return;
    }
    commitVisit(throwDarts);
  }

  function cancelOrUndo() {
    if (botThinking) return;
    if (throwDarts.length) {
      setThrowDarts((prev) => prev.slice(0, -1));
      setMultiplier(1);
      setNotice("");
      return;
    }
    if (undoStack.length) {
      const previous = undoStack[undoStack.length - 1];
      setUndoStack((stack) => stack.slice(0, -1));
      setState(cloneShooterState(previous));
      setShowEnd(false);
      setNotice("Tour précédent restauré.");
    }
  }

  React.useEffect(() => {
    if (!activeProfile || state.finished || !isBot(activeProfile, botIds)) {
      setBotThinking(false);
      return;
    }
    setBotThinking(true);
    const level = activeProfile?.botLevel || config.botLevel || "normal";
    const timer = window.setTimeout(() => {
      const darts = randomBotVisit(target, config.hitZone, String(level));
      commitVisit(darts);
      setBotThinking(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state.history.length, state.roundIndex, state.activePlayerIndex, state.finished, activePlayerId, target]);

  function resetMatch() {
    const next = createShooterState(profiles as any, rules, teamConfigs, config.selectedIds);
    setState(next);
    setUndoStack([]);
    setThrowDarts([]);
    setMultiplier(1);
    setShowEnd(false);
    setShowTable(false);
    setShowMarksTable(false);
    setNotice("");
    matchIdRef.current = `shooter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    autoSavedRef.current = "";
  }

  function backToConfig() {
    const now = Date.now();
    if (now - lastBackRef.current < 350) return;
    lastBackRef.current = now;
    if (state.history.length && !state.finished && !window.confirm("Quitter cette partie de SHOOTER en cours ?")) return;
    if (typeof go === "function") go("shooter_config", config);
  }

  function buildHistoryRecord() {
    const now = Date.now();
    const winnerEntityIds = new Set(state.winnerIds || []);
    const teams = state.teams.map((team) => {
      const standing = state.standings.find((row) => row.id === team.id);
      const rows = team.playerIds.map((id) => state.statsByPlayer[id] || emptyShooterStats());
      const darts = rows.reduce((a, r) => a + r.darts, 0);
      const hits = rows.reduce((a, r) => a + r.validDarts, 0);
      return {
        ...team,
        players: team.playerIds,
        score: standing?.score || 0,
        points: standing?.score || 0,
        targetsCleared: standing?.targetsCleared || 0,
        marksOnTarget: standing?.marksOnTarget || 0,
        hits,
        darts,
        accuracy: pct(hits, darts),
        winner: winnerEntityIds.has(team.id),
        rank: standing?.rank || 1,
      };
    });

    const playerRows = state.players.map((player: any) => {
      const profile: any = byId.get(String(player.id)) || player;
      const stats: ShooterPlayerStats = state.statsByPlayer[player.id] || emptyShooterStats();
      const teamId = state.teamByPlayer[player.id] || null;
      const entityId = state.entityByPlayer[player.id];
      const standing = state.standings.find((row) => row.id === entityId);
      const win = Boolean(entityId && winnerEntityIds.has(entityId));
      return {
        id: player.id,
        playerId: player.id,
        profileId: player.id,
        name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        teamId,
        team: teamId,
        teamName: teamId ? teamById.get(teamId)?.name : null,
        win,
        winner: win,
        rank: standing?.rank || 1,
        score: standing?.score || 0,
        points: stats.points,
        finalScore: standing?.score || 0,
        targetsCleared: standing?.targetsCleared || 0,
        progressTargetIndex: standing?.targetIndex || 0,
        marksOnCurrentTarget: standing?.marksOnTarget || 0,
        darts: stats.darts,
        dartsThrown: stats.darts,
        visits: stats.visits,
        targetAttempts: stats.targetAttempts,
        targetHits: stats.validDarts,
        validHits: stats.validDarts,
        validDarts: stats.validDarts,
        invalidDarts: stats.invalidDarts,
        accuracy: pct(stats.validDarts, stats.darts),
        marks: stats.marks,
        marksApplied: stats.marksApplied,
        pointsWon: stats.points,
        netPoints: stats.netPoints,
        penaltyEvents: stats.penaltyEvents,
        penaltyPoints: stats.penaltyPoints,
        progressPenalties: stats.progressPenalties,
        targetClearCredits: stats.targetClearCredits,
        successfulVisits: stats.successfulVisits,
        failedVisits: stats.failedVisits,
        oneHitVisits: stats.oneHitVisits,
        twoHitVisits: stats.twoHitVisits,
        threeHitVisits: stats.threeHitVisits,
        perfectVisits: stats.perfectVisits,
        firstDartHits: stats.firstDartHits,
        singles: stats.singles,
        doubles: stats.doubles,
        triples: stats.triples,
        bulls: stats.bulls,
        dbulls: stats.dbulls,
        misses: stats.misses,
        bestVisitMarks: stats.bestVisitMarks,
        bestVisitPoints: stats.bestVisitPoints,
        bestHitStreak: stats.bestHitStreak,
        bestSuccessVisitStreak: stats.bestSuccessVisitStreak,
        lastTargetReached: stats.lastTargetReached,
        averageMarksPerVisit: stats.visits ? Math.round((stats.marks / stats.visits) * 100) / 100 : 0,
        averagePointsPerVisit: stats.visits ? Math.round((stats.points / stats.visits) * 10) / 10 : 0,
        successRate: pct(stats.successfulVisits, stats.visits),
        failureRate: pct(stats.failedVisits, stats.visits),
        targetStats: stats.targets,
        rawStats: stats,
      };
    });

    const winnerStanding = state.standings[0] || null;
    const winnerId = state.tied ? null : winnerStanding?.id || null;
    const totalDarts = playerRows.reduce((a, p) => a + p.darts, 0);
    const totalHits = playerRows.reduce((a, p) => a + p.validDarts, 0);
    const matchStats = {
      durationMs: Math.max(0, now - state.startedAt),
      totalDarts,
      totalHits,
      accuracy: pct(totalHits, totalDarts),
      totalMarks: playerRows.reduce((a, p) => a + p.marks, 0),
      totalPoints: playerRows.reduce((a, p) => a + p.pointsWon, 0),
      penaltyEvents: playerRows.reduce((a, p) => a + p.penaltyEvents, 0),
      penaltyPoints: playerRows.reduce((a, p) => a + p.penaltyPoints, 0),
      perfectVisits: playerRows.reduce((a, p) => a + p.perfectVisits, 0),
      targetClearCredits: playerRows.reduce((a, p) => a + p.targetClearCredits, 0),
      sequenceLength: state.sequence.length,
      roundsPlayed: Math.min(state.roundIndex + 1, config.maxRounds || state.roundIndex + 1),
    };

    const summary = {
      kind: "shooter",
      mode: "shooter",
      sport: "darts",
      finished: true,
      participantMode: config.participantMode,
      winnerId,
      winnerIds: state.winnerIds,
      winnerName: state.tied ? "Égalité" : winnerStanding?.name || "—",
      tied: state.tied,
      targetSequence: [...state.sequence],
      sequencePreset: state.rules.sequencePreset,
      marksToClear: state.rules.marksToClear,
      hitZone: state.rules.hitZone,
      finishReason: state.finishReason,
      roundsPlayed: matchStats.roundsPlayed,
      duration: matchStats.durationMs,
      durationMs: matchStats.durationMs,
      standings: state.standings,
      rankings: state.standings,
      players: playerRows,
      perPlayer: playerRows,
      teams,
      matchStats,
      scoreLine: state.standings.map((row) => `${row.name} ${row.targetsCleared}/${state.sequence.length} · ${row.score}`).join(" • "),
      game: { mode: "shooter", teams },
    };

    return {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: "shooter",
      mode: "shooter",
      sport: "darts",
      status: "finished",
      createdAt: state.startedAt,
      updatedAt: now,
      winnerId,
      winnerIds: state.winnerIds,
      players: playerRows,
      teams,
      game: { mode: "shooter", teams },
      summary,
      payload: {
        kind: "shooter",
        mode: "shooter",
        sport: "darts",
        winnerId,
        winnerIds: state.winnerIds,
        tied: state.tied,
        config,
        rules: state.rules,
        players: playerRows,
        teams,
        summary,
        visits: state.history,
        visitHistory: state.history,
        state: {
          roundIndex: state.roundIndex,
          sequence: state.sequence,
          entities: state.entities,
          standings: state.standings,
          finishReason: state.finishReason,
        },
        stats: { sport: "darts", mode: "shooter", players: playerRows, teams, match: matchStats, global: matchStats },
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

  const previewValid = throwDarts.map((d) => isShooterTargetHit(toGameDart(d), target, config.hitZone));
  const currentHitCount = previewValid.filter(Boolean).length;
  const currentRawMarks = throwDarts.reduce((sum, d, i) => sum + (previewValid[i] ? dartMarks(d) : 0), 0);
  const currentPoints = throwDarts.reduce((sum, d, i) => sum + (previewValid[i] ? dartPoints(d) : 0), 0);
  const neededMarks = Math.max(0, config.marksToClear - Number(activeEntity?.marksOnTarget || 0));

  const keypadStatus = (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0 3px", color: themeSoft, fontSize: 9.5, fontWeight: 900 }}>
        <span>CIBLE {targetLabel} · {currentHitCount}/3 touche{currentHitCount > 1 ? "s" : ""}</span>
        <span style={{ color: currentRawMarks > 0 ? primary : themeSoft }}>{currentRawMarks} mark{currentRawMarks > 1 ? "s" : ""}</span>
      </div>
      {notice ? <div style={{ textAlign: "center", color: primary, fontSize: 9.5, fontWeight: 1000 }}>{notice}</div> : null}
    </div>
  );

  const goldVisitScore = (
    <div
      title="Score de la volée valide"
      style={{
        minWidth: 58,
        height: 46,
        padding: "0 8px",
        borderRadius: 13,
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg,#ffd34d,#ffad00)",
        border: "1px solid rgba(255,225,120,.82)",
        color: "#17120a",
        fontSize: 20,
        lineHeight: 1,
        fontWeight: 1100,
        boxShadow: "0 0 20px rgba(255,181,0,.34), inset 0 1px 0 rgba(255,255,255,.45)",
      }}
    >
      {currentPoints}
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", color: themeText, background: `radial-gradient(circle at 50% -5%, ${primary}22 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
      <PageHeader
        tickerSrc={tickerShooter}
        tickerAlt="SHOOTER"
        left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={primary} glow={`${primary}88`} title="Retour à la configuration" /></div>}
        right={<div style={{ marginRight: 6 }}><InfoDot title="Règles de SHOOTER" color={secondary} glow={`${secondary}77`} content={<RulesContent config={config} primary={primary} />} /></div>}
      />

      <div style={{ padding: "6px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        {/* Bloc joueur actif — structure visuelle CAPITAL */}
        <section
          style={{
            marginBottom: 6,
            padding: 0,
            overflow: "hidden",
            borderRadius: 19,
            border: `1px solid ${primary}88`,
            background: "linear-gradient(180deg,rgba(7,17,24,.94),rgba(3,8,12,.96))",
            boxShadow: `0 0 22px ${primary}18,0 14px 34px rgba(0,0,0,.34)`,
          }}
        >
          <div style={{ position: "relative", minHeight: 114, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(124px,140px)", gap: 4, alignItems: "stretch", padding: "7px 9px" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(0,0,0,.38),rgba(0,0,0,.16) 36%,rgba(0,0,0,.10) 62%,rgba(0,0,0,.30))" }} />

            <div style={{ position: "absolute", left: -20, top: -5, bottom: -5, width: "27%", minWidth: 86, overflow: "hidden", opacity: .34, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: -14, top: 11, transform: "scale(1.28)", transformOrigin: "left top", filter: `saturate(.98) brightness(.96) drop-shadow(0 0 8px ${activeColor}33)` }}>
                <ProfileAvatar profile={activeProfile as any} size={84} showStars={false} />
              </div>
            </div>

            {activeTeam?.logoDataUrl ? (
              <div style={{ position: "absolute", right: "calc(124px + 11px)", top: -5, bottom: -5, width: "24%", minWidth: 82, overflow: "hidden", opacity: .15, pointerEvents: "none" }}>
                <div style={{ position: "absolute", right: -16, top: 13, transform: "scale(1.24)", transformOrigin: "right top" }}>
                  <img src={activeTeam.logoDataUrl} alt="" style={{ width: 82, height: 82, borderRadius: "50%", objectFit: "cover", display: "block" }} />
                </div>
              </div>
            ) : null}

            <div style={{ gridColumn: "1 / 2", position: "relative", zIndex: 2, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2px 9px 2px 5px" }}>
              {botThinking ? <div style={{ color: activeColor, fontSize: 8.5, fontWeight: 1000, letterSpacing: .8 }}>BOT EN RÉFLEXION</div> : null}
              <div style={{ color: activeColor, fontSize: 13.2, fontWeight: 1000, letterSpacing: .75, lineHeight: 1.02, maxWidth: "100%", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(activeProfile)}</div>
              <div style={{ marginTop: 4, color: "#f5f7fb", fontSize: 49, fontWeight: 1000, lineHeight: .95, letterSpacing: -1.6, textShadow: "0 4px 18px rgba(0,0,0,.52)" }}>{Number(activeEntity?.score || 0)}</div>
              <div style={{ marginTop: 2, color: C.gold, fontSize: 8.1, fontWeight: 1000, letterSpacing: .55 }}>POINTS</div>
              <div style={{ marginTop: 3, color: "rgba(255,255,255,.50)", fontSize: 8.2, fontWeight: 950, letterSpacing: .3, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                #{Math.max(1, activeStanding?.rank || 1)}/{state.standings.length} · PRÉC. {pct(activeStats.validDarts, activeStats.darts)}% · SÉRIE {activeStats.bestHitStreak}{activeTeam ? ` · ${activeTeam.name}` : ""}
              </div>
            </div>

            <div style={{ gridColumn: "2 / 3", position: "relative", zIndex: 2, display: "flex", alignItems: "stretch", justifyContent: "center", minWidth: 0, overflow: "hidden", borderRadius: 17, background: "#050913", isolation: "isolate" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 17, backgroundImage: `linear-gradient(180deg,rgba(4,8,16,.26),rgba(4,8,16,.62)),url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }} />
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 38, background: "linear-gradient(90deg,rgba(4,8,16,.98),rgba(4,8,16,.76) 44%,rgba(4,8,16,0))", pointerEvents: "none" }} />
              <div style={{ position: "absolute", left: 0, top: 9, bottom: 9, width: 1, background: `linear-gradient(180deg,rgba(255,255,255,.02),${primary},rgba(255,255,255,.02))`, boxShadow: `0 0 12px ${primary}66`, pointerEvents: "none" }} />
              <div style={{ position: "relative", width: "100%", padding: "5px 4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <div style={{ color: "rgba(255,255,255,.62)", fontSize: 8.2, fontWeight: 950, letterSpacing: .75 }}>CIBLE</div>
                <div style={{ marginTop: 1, color: secondary, fontSize: target === 25 ? 25 : 45, lineHeight: .92, fontWeight: 1000, letterSpacing: -1, textShadow: `0 0 18px ${secondary}70` }}>{targetLabel}</div>

                <button
                  type="button"
                  onClick={() => setShowMarksTable(true)}
                  title="Voir le tableau des marks par round"
                  style={{ width: "100%", maxWidth: 112, marginTop: 6, padding: "3px 4px 2px", border: 0, background: "transparent", color: "inherit", cursor: "pointer" }}
                >
                  <div style={{ width: "100%", height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.10)", border: `1px solid ${primary}44`, boxShadow: `0 0 12px ${primary}16` }}>
                    <div style={{ width: `${Math.min(100, (Number(activeEntity?.marksOnTarget || 0) / config.marksToClear) * 100)}%`, height: "100%", background: `linear-gradient(90deg,${primary},${secondary})`, boxShadow: `0 0 9px ${primary}88` }} />
                  </div>
                  <div style={{ color: primary, fontSize: 9, fontWeight: 1000, marginTop: 3 }}>{Number(activeEntity?.marksOnTarget || 0)}/{config.marksToClear} MARKS <span style={{ opacity: .65 }}>›</span></div>
                </button>

                <div style={{ color: themeSoft, fontSize: 7.7, fontWeight: 900, marginTop: 0 }}>{zoneLabel(config.hitZone)} · CIBLE {Math.min(Number(activeEntity?.targetIndex || 0) + 1, state.sequence.length)}/{state.sequence.length}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Parcours */}
        <section style={{ ...panelStyle(), padding: 8, marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
            {state.sequence.map((n, idx) => {
              const done = idx < Number(activeEntity?.targetIndex || 0);
              const active = idx === Number(activeEntity?.targetIndex || 0) && !state.finished;
              return (
                <div key={`${n}-${idx}`} title={shooterTargetLabel(n)} style={{ minWidth: n === 25 ? 42 : 28, height: 26, padding: "0 6px", borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${active ? primary : done ? primary + "77" : themeStroke}`, background: active ? `${primary}22` : done ? `${primary}0d` : "rgba(255,255,255,.025)", color: active ? primary : done ? "rgba(255,255,255,.82)" : "rgba(255,255,255,.42)", fontSize: 9.5, fontWeight: 1000 }}>
                  {n === 25 ? "BULL" : n}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 5, textAlign: "center", color: themeSoft, fontSize: 9 }}>ROUND {state.roundIndex + 1}{config.maxRounds ? `/${config.maxRounds}` : ""} · {neededMarks} mark{neededMarks > 1 ? "s" : ""} restant{neededMarks > 1 ? "s" : ""}</div>
        </section>

        {/* Scores — visuel inspiré CAPITAL */}
        <section style={{ ...panelStyle(), marginBottom: 6, padding: 7 }}>
          <button type="button" onClick={() => setShowTable(true)} style={{ width: "100%", border: 0, background: "transparent", color: "inherit", padding: 0, cursor: "pointer" }}>
            <div
              className={state.standings.length > 2 ? "dc-scroll-thin" : undefined}
              style={state.standings.length > 2
                ? { display: "flex", gap: 7, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 2 }
                : { display: "grid", gridTemplateColumns: state.standings.length === 1 ? "1fr" : "1fr 1fr", gap: 7 }}
            >
              {state.standings.map((standing, index) => {
                const team = config.participantMode === "teams" ? teamById.get(standing.id) : null;
                const profile = config.participantMode === "players" ? byId.get(standing.id) : null;
                const originalPlayerIndex = config.participantMode === "players" ? Math.max(0, state.players.findIndex((p) => String(p.id) === String(standing.id))) : index;
                const color = team?.color || shooterPlayerColor(originalPlayerIndex);
                const active = String(standing.id) === String(activeEntity?.id) && !state.finished;
                const rColor = rankColor(standing.rank, color);
                return (
                  <div
                    key={standing.id}
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      flex: state.standings.length > 2 ? "0 0 min(46vw,205px)" : undefined,
                      minWidth: state.standings.length > 2 ? 160 : 0,
                      minHeight: 112,
                      scrollSnapAlign: state.standings.length > 2 ? "start" : undefined,
                      borderRadius: 17,
                      padding: "6px 7px 7px",
                      border: `1px solid ${active ? color : `${color}66`}`,
                      background: `linear-gradient(150deg,${color}18,rgba(2,7,11,.74) 56%,rgba(0,0,0,.88))`,
                      boxShadow: active ? `0 0 19px ${color}28,inset 0 0 22px ${color}0d` : "none",
                      isolation: "isolate",
                    }}
                  >
                    <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `linear-gradient(180deg,rgba(1,5,9,.32),rgba(1,5,9,.72)),url(${targetBg})`, backgroundPosition: "center", backgroundSize: "cover", opacity: .28, transform: "scale(1.05)" }} />
                    <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ flex: "0 0 auto", width: 21, height: 21, borderRadius: "50%", display: "grid", placeItems: "center", background: `${rColor}20`, border: `1.5px solid ${rColor}`, color: rColor, boxShadow: `0 0 9px ${rColor}22`, fontSize: 9.5, fontWeight: 1000 }}>{standing.rank}</span>
                      <div style={{ minWidth: 0, maxWidth: "calc(100% - 32px)", color: active ? color : "rgba(255,255,255,.95)", fontSize: 10.2, lineHeight: 1, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{state.finished && standing.rank === 1 ? " 🏆" : ""}</div>
                    </div>
                    <div style={{ position: "relative", zIndex: 1, marginTop: 3, display: "flex", justifyContent: "center", filter: "drop-shadow(0 4px 12px rgba(0,0,0,.55))" }}>
                      {team ? <TeamLogo team={team} size={46} /> : <ProfileAvatar profile={profile as any} size={46} showStars={false} />}
                    </div>
                    <div style={{ position: "relative", zIndex: 1, marginTop: 2, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 5, alignItems: "end" }}>
                      <div style={{ textAlign: "right" }}><span style={{ color, fontSize: 20, lineHeight: 1, fontWeight: 1000 }}>{standing.targetsCleared}</span><span style={{ color: "rgba(255,255,255,.48)", fontSize: 10, fontWeight: 900 }}>/{state.sequence.length}</span></div>
                      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.12)" }} />
                      <div style={{ textAlign: "left" }}><span style={{ color: C.gold, fontSize: 16, lineHeight: 1, fontWeight: 1000 }}>{standing.score}</span><span style={{ color: "rgba(255,255,255,.48)", fontSize: 8, fontWeight: 900 }}> PTS</span></div>
                    </div>
                    <div style={{ position: "relative", zIndex: 1, marginTop: 4, textAlign: "center", color: "rgba(255,255,255,.55)", fontSize: 8.1, fontWeight: 900 }}>CIBLE {Math.min(standing.targetIndex + 1, state.sequence.length)}/{state.sequence.length} · {standing.marksOnTarget}/{state.rules.marksToClear} MARKS</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 6, color: themeSoft, fontSize: 9.2, fontWeight: 850 }}>CLASSEMENT · TOUCHER POUR LE DÉTAIL</div>
          </button>
        </section>

        {!state.finished ? (
          <section style={{ ...panelStyle(), padding: 7 }}>
            {config.scoreInputMethod === "dartboard" ? (
              <>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 7 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ minWidth: 58, padding: "8px 10px", borderRadius: 13, textAlign: "center", background: "rgba(0,0,0,.48)", border: `1px solid ${throwDarts[i] ? (previewValid[i] ? C.green : C.red) + "66" : themeStroke}`, color: throwDarts[i] ? (previewValid[i] ? C.green : C.red) : "rgba(255,255,255,.42)", fontWeight: 1000 }}>
                      {uiLabel(throwDarts[i])}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "0 4px 7px", color: themeSoft, fontSize: 10, fontWeight: 850 }}>
                  <span>CIBLE {targetLabel} · {currentHitCount}/3 touches · {currentRawMarks} marks</span>
                  <span style={{ color: currentPoints > 0 ? C.gold : themeSoft }}>{currentPoints} pts</span>
                </div>
                {notice ? <div style={{ textAlign: "center", color: primary, fontSize: 10, fontWeight: 900, marginBottom: 7 }}>{notice}</div> : null}
                <DartboardClickable multiplier={multiplier} disabled={botThinking || state.finished || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}>
                  <button onClick={() => setMultiplier(1)} style={modeButton(multiplier === 1, C.green)}>SIMPLE</button>
                  <button onClick={() => setMultiplier(2)} style={modeButton(multiplier === 2, C.cyan)}>DOUBLE</button>
                  <button onClick={() => setMultiplier(3)} style={modeButton(multiplier === 3, C.pink)}>TRIPLE</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 7 }}>
                  <button onClick={cancelOrUndo} style={actionButton(C.gold)}>ANNULER</button>
                  <button onClick={() => addDart(0, 1)} style={actionButton(C.red)}>MISS</button>
                  <button onClick={validateVisit} style={actionButton(C.green)}>VALIDER</button>
                </div>
              </>
            ) : (
              <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking ? "none" : "auto" }}>
                <Keypad
                  currentThrow={throwDarts as any}
                  multiplier={multiplier}
                  onSimple={() => setMultiplier(1)}
                  onDouble={() => setMultiplier(2)}
                  onTriple={() => setMultiplier(3)}
                  onCancel={cancelOrUndo}
                  onBackspace={() => setThrowDarts((prev) => prev.slice(0, -1))}
                  onNumber={(n) => addDart(n)}
                  onBull={() => addDart(25)}
                  onValidate={validateVisit}
                  centerSlot={goldVisitScore}
                  noticeSlot={keypadStatus}
                  validateAttention={throwDarts.length === 3}
                  safeBottomPad
                />
              </div>
            )}
          </section>
        ) : null}
      </div>

      {showTable ? <StandingsModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowTable(false)} /> : null}
      {showMarksTable ? <MarksRoundModal state={state} profilesById={byId} teamById={teamById} participantMode={config.participantMode} primary={primary} onClose={() => setShowMarksTable(false)} /> : null}
      {showEnd && state.finished ? (
        <EndModal
          state={state}
          profilesById={byId}
          teamById={teamById}
          participantMode={config.participantMode}
          primary={primary}
          onClose={() => setShowEnd(false)}
          onReplay={resetMatch}
          onHistory={() => {
            try { onFinish?.(buildHistoryRecord(), { navigate: true }); }
            catch { if (typeof go === "function") go("statsHub", { tab: "history" }); }
          }}
        />
      ) : null}
    </div>
  );
}

function modeButton(active: boolean, color: string): React.CSSProperties {
  return { minHeight: 40, borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `${color}20` : "rgba(255,255,255,.04)", color: active ? color : "#fff", fontWeight: 1000, cursor: "pointer" };
}

function actionButton(color: string): React.CSSProperties {
  return { minHeight: 42, borderRadius: 13, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1000, cursor: "pointer" };
}

function StandingsModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(760px,100%)", maxHeight: "86vh", overflow: "auto", padding: 13 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ width: 34 }} />
          <div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CLASSEMENT SHOOTER</div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {state.standings.map((standing: any) => (
            <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${standing.rank === 1 ? primary + "66" : "rgba(255,255,255,.08)"}` }}>
              <div style={{ color: standing.rank === 1 ? C.gold : "#fff", fontWeight: 1000, textAlign: "center" }}>{standing.rank}.</div>
              {participantMode === "teams" ? <TeamLogo team={teamById.get(standing.id)} size={38} /> : <ProfileAvatar profile={profilesById.get(standing.id)} size={38} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{standing.name}{standing.rank === 1 ? " 🏆" : ""}</div>
                <div style={{ color: "rgba(255,255,255,.58)", fontSize: 10 }}>{standing.targetsCleared}/{state.sequence.length} cibles · {standing.marksOnTarget}/{state.rules.marksToClear} marks · précision {standing.accuracy}%</div>
              </div>
              <div style={{ textAlign: "right" }}><div style={{ color: primary, fontSize: 22, fontWeight: 1100 }}>{standing.score}</div><div style={{ fontSize: 8.5, opacity: .55 }}>PTS</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarksRoundModal({ state, profilesById, teamById, participantMode, primary, onClose }: any) {
  const entities = Object.values(state.entities || {}) as any[];
  const maxHistoryRound = Math.max(0, ...(state.history || []).map((visit: any) => Number(visit.round || 0)));
  const roundsPlayed = Math.max(1, maxHistoryRound, Number(state.roundIndex || 0) + 1);
  const rounds = Array.from({ length: roundsPlayed }, (_, i) => i + 1);

  const cellFor = (round: number, entityId: string) => {
    const visits = (state.history || []).filter((visit: any) => Number(visit.round) === round && String(visit.entityId) === String(entityId));
    if (!visits.length) return null;
    const rawMarks = visits.reduce((sum: number, visit: any) => sum + Number(visit.rawMarks || 0), 0);
    const appliedMarks = visits.reduce((sum: number, visit: any) => sum + Number(visit.appliedMarks || 0), 0);
    const validDarts = visits.reduce((sum: number, visit: any) => sum + Number(visit.validDarts || 0), 0);
    const points = visits.reduce((sum: number, visit: any) => sum + Number(visit.points || 0), 0);
    const targets = visits.map((visit: any) => String(visit.targetLabel || shooterTargetLabel(visit.target))).filter((v: string, idx: number, arr: string[]) => idx === 0 || v !== arr[idx - 1]);
    const cleared = visits.some((visit: any) => Boolean(visit.clearedTarget));
    return { rawMarks, appliedMarks, validDarts, points, targets, cleared, visits };
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(920px,100%)", maxHeight: "91vh", overflow: "hidden", padding: 12, borderColor: `${primary}66` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ width: 34 }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ color: primary, fontSize: 10, fontWeight: 1000, letterSpacing: 1.1 }}>TABLEAU DES MARKS</div>
            <div style={{ fontSize: 17, fontWeight: 1100 }}>ROUND PAR ROUND</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button>
        </div>

        <div style={{ marginTop: 8, padding: "8px 9px", borderRadius: 12, background: `${primary}0d`, border: `1px solid ${primary}2e`, color: "rgba(255,255,255,.66)", fontSize: 9.5, lineHeight: 1.35 }}>
          <b style={{ color: primary }}>+3</b> = marks obtenus pendant le round. <b>APPL.</b> = marks réellement utilisés pour fermer la cible. Les marks en trop ne passent jamais sur la cible suivante. ✓ indique qu'une cible a été fermée pendant le round.
        </div>

        <div className="dc-scroll-thin" style={{ marginTop: 9, maxHeight: "70vh", overflow: "auto", borderRadius: 13, border: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ minWidth: 120 + entities.length * 142 }}>
            <div style={{ display: "grid", gridTemplateColumns: `92px repeat(${entities.length},minmax(142px,1fr))`, position: "sticky", top: 0, zIndex: 3, background: "rgba(6,9,15,.98)", borderBottom: "1px solid rgba(255,255,255,.09)" }}>
              <div style={{ padding: 9, display: "grid", placeItems: "center", color: "rgba(255,255,255,.55)", fontSize: 9, fontWeight: 1000 }}>ROUND</div>
              {entities.map((entity: any, index: number) => {
                const team = participantMode === "teams" ? teamById.get(entity.id) : null;
                const profile = participantMode === "players" ? profilesById.get(entity.id) : null;
                const color = team?.color || shooterPlayerColor(index);
                return (
                  <div key={entity.id} style={{ padding: "7px 6px", minWidth: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 6, borderLeft: "1px solid rgba(255,255,255,.07)" }}>
                    {team ? <TeamLogo team={team} size={28} /> : <ProfileAvatar profile={profile} size={28} showStars={false} />}
                    <div style={{ minWidth: 0, color, fontSize: 9, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entity.name}</div>
                  </div>
                );
              })}
            </div>

            {rounds.map((round) => {
              const current = round === Number(state.roundIndex || 0) + 1 && !state.finished;
              return (
                <div key={round} style={{ display: "grid", gridTemplateColumns: `92px repeat(${entities.length},minmax(142px,1fr))`, borderBottom: "1px solid rgba(255,255,255,.06)", background: current ? `${primary}08` : "rgba(255,255,255,.012)" }}>
                  <div style={{ padding: 10, display: "grid", placeItems: "center", position: "sticky", left: 0, zIndex: 2, background: current ? "rgba(12,26,31,.98)" : "rgba(7,10,16,.98)" }}>
                    <div style={{ color: current ? primary : "#fff", fontSize: 13, fontWeight: 1100 }}>R{round}</div>
                    {current ? <div style={{ marginTop: 2, color: primary, fontSize: 7.5, fontWeight: 1000 }}>EN COURS</div> : null}
                  </div>
                  {entities.map((entity: any, index: number) => {
                    const data = cellFor(round, entity.id);
                    const team = participantMode === "teams" ? teamById.get(entity.id) : null;
                    const color = team?.color || shooterPlayerColor(index);
                    return (
                      <div key={entity.id} style={{ minHeight: 70, padding: "8px 6px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        {data ? (
                          <>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
                              <span style={{ color: data.rawMarks > 0 ? color : C.red, fontSize: 21, lineHeight: 1, fontWeight: 1100 }}>+{data.rawMarks}</span>
                              {data.cleared ? <span style={{ color: C.green, fontSize: 12, fontWeight: 1100 }}>✓</span> : null}
                            </div>
                            <div style={{ marginTop: 3, color: "rgba(255,255,255,.55)", fontSize: 8.2, fontWeight: 900 }}>CIBLE {data.targets.join("→") || "—"}</div>
                            <div style={{ marginTop: 2, color: "rgba(255,255,255,.45)", fontSize: 7.8 }}>APPL. {data.appliedMarks} · {data.validDarts} touche{data.validDarts > 1 ? "s" : ""} · {data.points} pts</div>
                          </>
                        ) : <span style={{ color: "rgba(255,255,255,.20)", fontSize: 16 }}>—</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div style={{ display: "grid", gridTemplateColumns: `92px repeat(${entities.length},minmax(142px,1fr))`, background: "rgba(255,255,255,.025)" }}>
              <div style={{ padding: 9, display: "grid", placeItems: "center", color: C.gold, fontSize: 8, fontWeight: 1000 }}>TOTAL</div>
              {entities.map((entity: any, index: number) => {
                const visits = (state.history || []).filter((visit: any) => String(visit.entityId) === String(entity.id));
                const marks = visits.reduce((sum: number, visit: any) => sum + Number(visit.rawMarks || 0), 0);
                const applied = visits.reduce((sum: number, visit: any) => sum + Number(visit.appliedMarks || 0), 0);
                const standing = state.standings.find((row: any) => String(row.id) === String(entity.id));
                const team = participantMode === "teams" ? teamById.get(entity.id) : null;
                const color = team?.color || shooterPlayerColor(index);
                return (
                  <div key={entity.id} style={{ padding: "8px 5px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.06)" }}>
                    <div style={{ color, fontSize: 15, fontWeight: 1100 }}>{marks} MARKS</div>
                    <div style={{ marginTop: 2, color: "rgba(255,255,255,.48)", fontSize: 8 }}>{applied} appliqués · {standing?.targetsCleared || 0}/{state.sequence.length} cibles</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EndModal({ state, profilesById, teamById, participantMode, primary, onClose, onReplay, onHistory }: any) {
  const rows = state.players.map((player: any) => {
    const profile = profilesById.get(player.id) || player;
    const stats = state.statsByPlayer[player.id] || emptyShooterStats();
    const standing = state.standings.find((s: any) => s.id === state.entityByPlayer[player.id]);
    return { player, profile, stats, standing };
  }).sort((a: any, b: any) => Number(a.standing?.rank || 99) - Number(b.standing?.rank || 99) || b.stats.validDarts - a.stats.validDarts);
  const best = state.standings[0];
  const totalDarts = rows.reduce((a: number, r: any) => a + r.stats.darts, 0);
  const totalHits = rows.reduce((a: number, r: any) => a + r.stats.validDarts, 0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}>
      <div style={{ ...panelStyle(), width: "min(930px,100%)", maxHeight: "94vh", overflow: "auto", borderColor: `${primary}77`, padding: 13 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ width: 34 }} />
          <div style={{ textAlign: "center" }}><div style={{ color: primary, fontSize: 11, fontWeight: 1000, letterSpacing: 1.2 }}>FIN DE PARTIE</div><div style={{ fontSize: 20, fontWeight: 1100 }}>SHOOTER</div></div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button>
        </div>

        <div style={{ marginTop: 11, padding: 12, borderRadius: 16, background: `${primary}10`, border: `1px solid ${primary}44`, textAlign: "center" }}>
          <div style={{ color: C.gold, fontSize: 10, fontWeight: 1000 }}>VAINQUEUR</div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 1100 }}>{state.tied ? "ÉGALITÉ" : best?.name || "—"}</div>
          <div style={{ color: primary, fontSize: 28, fontWeight: 1100 }}>{best?.targetsCleared || 0}/{state.sequence.length} CIBLES · {best?.score || 0} PTS</div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
          {[
            ["Durée", fmtDuration((state.finishedAt || Date.now()) - state.startedAt)],
            ["Darts", totalDarts],
            ["Précision", `${pct(totalHits, totalDarts)}%`],
            ["Parfaits 3/3", rows.reduce((a: number, r: any) => a + r.stats.perfectVisits, 0)],
          ].map(([label, value]: any) => (
            <div key={label} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,.55)", fontSize: 9 }}>{label}</div>
              <div style={{ fontWeight: 1100, fontSize: 18, color: primary }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900, fontSize: 10.5 }}>
            <thead><tr style={{ background: "rgba(255,255,255,.05)" }}>{["Joueur", "Rang", "Cibles", "Préc.", "Marks", "Score", "0/3", "1/3", "2/3", "3/3", "Best marks", "Best pts", "Série", "Darts"].map((h) => <th key={h} style={{ padding: "8px 6px", textAlign: h === "Joueur" ? "left" : "center", color: "rgba(255,255,255,.68)" }}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((row: any) => <tr key={row.player.id} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{playerName(row.profile)}{row.standing?.rank === 1 ? <span style={{ color: C.gold }}> · 🏆</span> : ""}</td><td style={td(C.gold)}>{row.standing?.rank || "—"}</td><td style={td(primary)}>{row.standing?.targetsCleared || 0}/{state.sequence.length}</td><td style={td()}>{pct(row.stats.validDarts, row.stats.darts)}%</td><td style={td()}>{row.stats.marks}</td><td style={td(primary)}>{row.stats.points}</td><td style={td(C.red)}>{row.stats.failedVisits}</td><td style={td()}>{row.stats.oneHitVisits}</td><td style={td()}>{row.stats.twoHitVisits}</td><td style={td(C.green)}>{row.stats.threeHitVisits}</td><td style={td()}>{row.stats.bestVisitMarks}</td><td style={td()}>{row.stats.bestVisitPoints}</td><td style={td()}>{row.stats.bestHitStreak}</td><td style={td()}>{row.stats.darts}</td></tr>)}</tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
          {rows.map((row: any) => (
            <details key={row.player.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 1000, color: primary }}>{playerName(row.profile)} — détail par cible</summary>
              <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(82px,1fr))", gap: 6 }}>
                {state.sequence.map((target: number, idx: number) => {
                  const s = row.stats.targets?.[String(target)];
                  return (
                    <div key={`${target}-${idx}`} style={{ padding: 7, borderRadius: 11, background: "rgba(0,0,0,.23)", textAlign: "center" }}>
                      <div style={{ color: "rgba(255,255,255,.58)", fontSize: 9 }}>{shooterTargetLabel(target)}</div>
                      <div style={{ color: s?.validDarts ? C.green : C.red, fontWeight: 1100 }}>{s?.validDarts || 0}/{s?.darts || 0}</div>
                      <div style={{ fontSize: 8.5, opacity: .65 }}>{s?.marks || 0} marks · {s?.points || 0} pts</div>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
          <button onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}16`, color: primary, fontWeight: 1100 }}>REJOUER</button>
          <button onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,${primary},#ffd76a)`, color: "#14120b", fontWeight: 1100 }}>HISTORIQUE & STATS</button>
        </div>
      </div>
    </div>
  );
}

function td(color = "#fff"): React.CSSProperties {
  return { padding: 7, textAlign: "center", fontWeight: 950, color };
}
