// ============================================
// src/pages/CricketPlay.tsx
// Mode Cricket — profils réels + tableau centré
// - Setup : sélection 2 à 4 profils + options style "menus config X01"
// - Play  : tableau Cricket (15..20 + Bull) avec colonnes centrées
// - Keypad 0..20 (3 × 7) + bouton BULL
// - Intégration Historique : enregistre chaque manche dans History (kind: "cricket")
// ✅ FIX: maxRounds appliqué (hard stop + tie-break)
// ✅ NEW: SFX arcade DOUBLE/TRIPLE/BULL/DBULL + MISS(0..14)=BUST
// ✅ NEW: Fin de partie = résumé propre + save history + actions
// ✅ NEW: legStats par joueur dans payload.players pour StatsCricket
// ✅ NEW: Setup options visuel type X01 : ON/OFF + chips
// ✅ NEW: Ordre départ : aléatoire ou ordre sélection
// ✅ NEW: 2v2 (équipe) + "compléter avec bots" (simple, 1 bot si 3 joueurs)
// ✅ FIX: BOTS IA affichés depuis src/lib/botsPro.ts (pas localStorage)
// ✅ FIX: plus de double toggleBot + plus de bloc if non fermé (Unexpected token)
// ✅ FIX: AVATARS BOTS OK (via ProfileAvatar + avatarKey)
// ============================================

import React from "react";
import { dartsQuickTicker } from "../components/DartsQuickHeader";
import DartsRelatedModesPanel from "../components/DartsRelatedModesPanel";
import { dartsFamilyGameNavigation } from "../games/dartsGameFamilies";
import { applyResolvedBotCountries } from "../lib/botCountries";
import { loadBotPlayers, parseBotLevelValue } from "../lib/bots";
import {
  createCricketMatch,
  applyCricketHit,
  undoLastCricketHit,
  CRICKET_TARGETS,
  CRICKET_EXTENDED_TARGETS,
  type CricketTarget,
  type Multiplier,
  type CricketState,
} from "../lib/cricketEngine";
import { playSound } from "../lib/sound";
import { useCricketStatsRecorder } from "../hooks/useCricketStatsRecorder";
import type { Profile } from "../lib/types";
import type { SavedMatch } from "../lib/history";
import { History } from "../lib/history";
import { SCORE_INPUT_LS_KEY } from "../lib/scoreInput/types";
import { DartIconColorizable, CricketMarkIcon } from "../components/MaskIcon";
import ShoveActivePlayerCard from "../components/ShoveActivePlayerCard";
import ShoveFloatingHeader from "../components/ShoveFloatingHeader";
import CricketShoveMarksBoard from "../components/CricketShoveMarksBoard";
import "../components/ShoveMatchMidZone.css";
import shovePlayersTicker from "../assets/tickers/ticker_shove_players.webp";
import shoveMarksTicker from "../assets/tickers/ticker_shove_marks.webp";

import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import DartboardClickable from "../components/DartboardClickable";
import MssKillerPlayersShared from "../components/config/MssKillerPlayersShared";
import { MssClassicConfigFlow, MssClassicOverview } from "../components/config/MssClassicConfigFlow";
import { MssKillerParticipantMode, MssKillerFormat } from "../components/config/MssKillerParticipantProtocol";
import MssKillerBooleanToggle from "../components/config/MssKillerBooleanToggle";
import MssCricketAwenaTip from "../components/config/MssCricketAwenaTip";
import MssSelectorIconButton from "../components/MssSelectorIconButton";
import { MssInputMethodChoice, MssConfigCaption, MssConfigFact } from "../components/config/MssPremiumConfig";
import { appendGoogleCastDiag, sendCastSnapshot, subscribeGoogleCastStatus } from "../cast/googleCast";

// 🔽 IMPORTS DE TOUS LES AVATARS BOTS PRO
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";
import avatarJackpot from "../assets/avatars/bots-pro/jackpot.png";
import avatarCraftyCockney from "../assets/avatars/bots-pro/crafty-cockney.png";
import avatarBarney from "../assets/avatars/bots-pro/barney.png";
import avatarTheMenace from "../assets/avatars/bots-pro/the-menace.png";
import avatarDarthMaple from "../assets/avatars/bots-pro/darth-maple.png";
import avatarTheGiant from "../assets/avatars/bots-pro/the-giant.png";
import avatarTheHammer from "../assets/avatars/bots-pro/the-hammer.png";
import avatarVoltage from "../assets/avatars/bots-pro/voltage.png";
import avatarOneDart from "../assets/avatars/bots-pro/one-dart.png";

import tickerCricket from "../assets/tickers/ticker_cricket.webp";
import tickerEnculette from "../assets/tickers/ticker_enculette.png";
import tickerCutThroat from "../assets/tickers/ticker_cricket_cut_throat.png";
import tickerMaster from "../assets/tickers/ticker_cricket_master.webp";
import CricketMasterPlayStage from "../components/CricketMasterPlayStage";
import EnglishCricketPlay from "./EnglishCricketPlay";
import { CRICKET_VARIANT_RULES, configuredCricketTargets, type CricketRuleVariant } from "../lib/cricketVariantRules";

const T = {
  bg: "#050712",
  card: "#121420",
  text: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.7)",
  gold: "#F6C256",
  borderSoft: "rgba(255,255,255,0.08)",
};

// Couleurs d’accent par joueur (1 à 4)
const ACCENTS = ["#fbbf24", "#f472b6", "#22c55e", "#38bdf8"];

// Ordre d’affichage de la colonne centrale (croissant)
const CRICKET_UI_TARGETS: CricketTarget[] = [15, 16, 17, 18, 19, 20, 25];
const CRICKET_EXTENDED_UI_TARGETS: CricketTarget[] = [15, 16, 17, 18, 19, 20, 26, 27, 25];

// Dégradé 15 → Bull
const TARGET_COLORS: Record<number, string> = {
  15: "#F6C256",
  16: "#fbbf24",
  17: "#fb923c",
  18: "#f97316",
  19: "#fb7185",
  20: "#ef4444",
  25: "#22c55e",
  26: "#06b6d4", // DOUBLE MSS
  27: "#d946ef", // TRIPLE MSS
};

function getTargetColor(target: CricketTarget): string {
  return TARGET_COLORS[target] ?? "#fef3c7";
}

// Petit helper pour assombrir une couleur hex
function darkenColor(hex: string, factor: number = 0.7): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return hex;
  const r = Math.round(parseInt(m[1], 16) * factor);
  const g = Math.round(parseInt(m[2], 16) * factor);
  const b = Math.round(parseInt(m[3], 16) * factor);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

type Phase = "setup" | "play";
type ScoreMode = "points" | "no-points";
type HitMode = "S" | "D" | "T";

type Props = {
  profiles?: Profile[];
  params?: any;
  onFinish?: (m: SavedMatch) => void;
  go?: (tab: any, params?: any) => void;
};

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string;
};

// BOTS IA "PRO" PRÉDÉFINIS (identique X01)
const PRO_BOTS: BotLite[] = applyResolvedBotCountries([
  { id: "bot_pro_mvg", name: "Green Machine", botLevel: "Légende", avatarDataUrl: avatarGreenMachine },
  { id: "bot_pro_wright", name: "Snake King", botLevel: "Pro", avatarDataUrl: avatarSnakeKing },
  { id: "bot_pro_littler", name: "Wonder Kid", botLevel: "Prodige Pro", avatarDataUrl: avatarWonderKid },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "Pro", avatarDataUrl: avatarIceMan },
  { id: "bot_pro_anderson", name: "Flying Scotsman", botLevel: "Pro", avatarDataUrl: avatarFlyingScotsman },
  { id: "bot_pro_humphries", name: "Cool Hand", botLevel: "Pro", avatarDataUrl: avatarCoolHand },
  { id: "bot_pro_taylor", name: "The Power", botLevel: "Légende", avatarDataUrl: avatarThePower },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "Pro", avatarDataUrl: avatarBullyBoy },
  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "Fort", avatarDataUrl: avatarTheAsp },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "Fort", avatarDataUrl: avatarHollywood },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "Fort", avatarDataUrl: avatarTheFerret },

  { id: "bot_pro_jackpot", name: "Jackpot", botLevel: "4.5/5", avatarDataUrl: avatarJackpot as any },
  { id: "bot_pro_crafty", name: "Crafty", botLevel: "5/5", avatarDataUrl: avatarCraftyCockney as any },
  { id: "bot_pro_barney", name: "Barney", botLevel: "4.5/5", avatarDataUrl: avatarBarney as any },
  { id: "bot_pro_darth_maple", name: "Darth Maple", botLevel: "3.5/5", avatarDataUrl: avatarDarthMaple as any },
  { id: "bot_pro_menace", name: "The Menace", botLevel: "3/5", avatarDataUrl: avatarTheMenace as any },
  { id: "bot_pro_the_giant", name: "The Giant", botLevel: "4/5", avatarDataUrl: avatarTheGiant as any },
  { id: "bot_pro_voltage", name: "Voltage", botLevel: "3.5/5", avatarDataUrl: avatarVoltage as any },
  { id: "bot_pro_one_dart", name: "One Dart", botLevel: "3.5/5", avatarDataUrl: avatarOneDart as any },
  { id: "bot_pro_the_hammer", name: "The Hammer", botLevel: "3/5", avatarDataUrl: avatarTheHammer as any },
]) as BotLite[];

// --------------------------------------------------
// UI helpers style "config X01"
// --------------------------------------------------

function Pill({
  active,
  children,
  onClick,
  disabled,
  tone = "gold",
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "gold" | "green" | "gray";
}) {
  const grad =
    tone === "green"
      ? "linear-gradient(135deg,#22c55e,#16a34a)"
      : tone === "gray"
      ? "linear-gradient(135deg,#6b7280,#4b5563)"
      : "linear-gradient(135deg,#ffc63a,#ffaf00)";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: active ? "none" : `1px solid rgba(255,255,255,0.10)`,
        background: active ? grad : "rgba(0,0,0,0.18)",
        color: active ? (tone === "gray" ? "#0b1220" : "#211500") : "rgba(255,255,255,0.75)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        boxShadow: active ? "0 0 18px rgba(240,177,42,.25)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function OnOff({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Pill tone="gold" active={value} onClick={() => !disabled && onChange(true)} disabled={disabled}>
        ON
      </Pill>
      <Pill tone="gray" active={!value} onClick={() => !disabled && onChange(false)} disabled={disabled}>
        OFF
      </Pill>
    </div>
  );
}

function SectionCard({
  title,
  children,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        background: "rgba(9,12,24,.96)",
        border: `1px solid ${T.gold}55`,
        padding: 14,
        marginBottom: 14,
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: T.gold,
          fontWeight: 950,
          marginBottom: subtitle ? 6 : 10,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 10,
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {children}
    </div>
  );
}

// --------------------------------------------------
// Cricket end-by-round tie-break
// --------------------------------------------------

function marksTotal(p: any, extended = false, targets?: number[]) {
  const marks = p?.marks || {};
  return (targets ?? (extended ? CRICKET_EXTENDED_TARGETS : CRICKET_TARGETS)).reduce((acc: number, t: any) => acc + Number(marks[t] ?? 0), 0);
}
function closedCount(p: any, extended = false, targets?: number[]) {
  const marks = p?.marks || {};
  return (targets ?? (extended ? CRICKET_EXTENDED_TARGETS : CRICKET_TARGETS)).reduce((acc: number, t: any) => acc + (Number(marks[t] ?? 0) >= 3 ? 1 : 0), 0);
}
function scoreNum(p: any) {
  return Number(p?.score ?? 0);
}

// returns winnerId or null if true tie
function decideWinnerAtMaxRounds(state: CricketState, withPoints: boolean, teamMode: boolean): string | null {
  const players = state.players || [];
  if (players.length < 2) return null;

  // team mode only meaningful for 4 players (2v2)
  if (teamMode && players.length === 4) {
    const teamA = [players[0], players[2]];
    const teamB = [players[1], players[3]];

    const aClosed = teamA.reduce((acc: number, p: any) => acc + closedCount(p, !!state.extended, state.targets), 0);
    const bClosed = teamB.reduce((acc: number, p: any) => acc + closedCount(p, !!state.extended, state.targets), 0);
    if (aClosed !== bClosed) return aClosed > bClosed ? teamA[0].id : teamB[0].id;

    const aMarks = teamA.reduce((acc: number, p: any) => acc + marksTotal(p, !!state.extended, state.targets), 0);
    const bMarks = teamB.reduce((acc: number, p: any) => acc + marksTotal(p, !!state.extended, state.targets), 0);
    if (aMarks !== bMarks) return aMarks > bMarks ? teamA[0].id : teamB[0].id;

    if (withPoints) {
      const aScore = teamA.reduce((acc: number, p: any) => acc + scoreNum(p), 0);
      const bScore = teamB.reduce((acc: number, p: any) => acc + scoreNum(p), 0);
      if (aScore !== bScore) return aScore > bScore ? teamA[0].id : teamB[0].id;
    }

    return null;
  }

  // solo mode: compare closed targets, then marks, then points (if enabled)
  const ranked = [...players].map((p: any) => ({
    id: p.id,
    closed: closedCount(p, !!state.extended, state.targets),
    marks: marksTotal(p, !!state.extended, state.targets),
    score: scoreNum(p),
  }));

  ranked.sort((a, b) => {
    if (b.closed !== a.closed) return b.closed - a.closed;
    if (b.marks !== a.marks) return b.marks - a.marks;
    if (withPoints && b.score !== a.score) return b.score - a.score;
    return 0;
  });

  const top = ranked[0];
  const second = ranked[1];
  const tied =
    top.closed === second.closed &&
    top.marks === second.marks &&
    (!withPoints || top.score === second.score);

  return tied ? null : top.id;
}

function clampRoundNumber(state: any): number {
  const rn = Number(state?.roundNumber ?? 0);
  return Number.isFinite(rn) ? rn : 0;
}

function normalizeBotLevel(lvl: any): string {
  const n = parseBotLevelValue(lvl, 2);
  if (n >= 4.75) return "legend";
  if (n >= 4.5) return "prodigy";
  if (n >= 4) return "pro";
  if (n >= 3) return "strong";
  return "normal";
}

function botParams(level: string) {
  // plus c’est haut, plus ça vise juste + plus de doubles/triples “logiques”
  switch (level) {
    case "legend":
      return { thinkMs: 260, hitQuality: 0.92, preferHighMult: 0.65, mistake: 0.03 };
    case "prodigy":
      return { thinkMs: 320, hitQuality: 0.86, preferHighMult: 0.55, mistake: 0.05 };
    case "pro":
      return { thinkMs: 380, hitQuality: 0.78, preferHighMult: 0.45, mistake: 0.08 };
    case "strong":
      return { thinkMs: 420, hitQuality: 0.72, preferHighMult: 0.40, mistake: 0.11 };
    default:
      return { thinkMs: 520, hitQuality: 0.62, preferHighMult: 0.30, mistake: 0.18 };
  }
}

function isBotProfile(p: any): boolean {
  return !!p?.isBot || String(p?.id || "").startsWith("bot_") || !!p?.botLevel;
}

// Choix “intelligent” du prochain lancer (Cricket)
function pickCricketBotThrow(state: any, player: any, withPoints: boolean, quality: number) {
  const marks = player?.marks || {};

  // 1) Priorité: fermer les cibles pas encore fermées
  const openTargets = (state.targets ?? CRICKET_TARGETS).filter((t: any) => t < 26 && Number(marks[t] ?? 0) < 3);
  if (state.extended && Number(marks[26] || 0) < 3) return { target: 20, mult: 2 };
  if (state.extended && Number(marks[27] || 0) < 3) return { target: 20, mult: 3 };

  // 2) Si tout est fermé: chercher scoring (si points) sinon random “propre”
  const scoringTargets = (state.targets ?? CRICKET_TARGETS).filter((t:number)=>t < 26).slice();

  // petite chance d’erreur (viser 0..14 => “bust” sfx)
  const doMistake = Math.random() > quality;
  if (doMistake) {
    const miss = Math.floor(Math.random() * 15); // 0..14
    return { target: miss, mult: 1 };
  }

  const target = openTargets.length
    ? openTargets[Math.floor(Math.random() * Math.min(openTargets.length, 2))] // vise plutôt les 2 plus proches
    : scoringTargets[Math.floor(Math.random() * scoringTargets.length)];

  // Multiplier: selon besoin de marks restant
  const cur = Number(marks[target] ?? 0);
  const need = Math.max(0, 3 - cur);

  let mult: Multiplier = 1;

  if (need >= 2) {
    // si besoin 2 ou 3: double/triple souvent pertinent
    mult = (Math.random() < 0.55 ? 2 : 3) as any;
  } else if (need === 1) {
    mult = (Math.random() < 0.25 ? 2 : 1) as any;
  } else {
    // déjà fermé: scoring uniquement si points
    if (withPoints) mult = (Math.random() < 0.35 ? 2 : 1) as any;
    else mult = 1;
  }

  // Bull: autorise dbull parfois
  if (target === 25) {
    mult = (Math.random() < 0.25 ? 2 : 1) as any;
  }

  return { target: Number(target), mult };
}

type CricketVariantId = "classic" | "enculette" | "cut_throat" | "extended" | CricketRuleVariant;

function CricketPlayCore({ profiles, params, onFinish, go }: Props) {
  const isQuickParty = params?.quickParty === true || String(params?.partyMode || "").toLowerCase() === "quick";
  const quickSafePlaySound = React.useCallback((name: any) => { if (!isQuickParty) playSound(name); }, [isQuickParty]);
  const [castStatusTick, setCastStatusTick] = React.useState(0);
  React.useEffect(() => subscribeGoogleCastStatus(() => setCastStatusTick((n) => n + 1)), []);
  const [cricketCreatedProfiles, setCricketCreatedProfiles] = React.useState<any[]>([]);
  const [cricketCreatedBots, setCricketCreatedBots] = React.useState<any[]>([]);
  const allProfiles = React.useMemo(() => [...(profiles ?? []), ...(isQuickParty && Array.isArray(params?.quickPlayers) ? params.quickPlayers : []), ...cricketCreatedProfiles], [profiles, params?.quickPlayers, isQuickParty, cricketCreatedProfiles]);
  const matchIdRef = React.useRef<string>(
    (params as any)?.matchId ?? `cricket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const autosaveLastSigRef = React.useRef("");
  const autosaveIdleRef = React.useRef<any>(null);

  // ✅ BackDot + InfoDot (règles)
  const [infoOpen, setInfoOpen] = React.useState(false);

  // ---- Phase (setup -> play) ----
  const [phase, setPhase] = React.useState<Phase>("setup");

  // ---- Joueurs sélectionnés ----
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => isQuickParty && Array.isArray(params?.quickPlayers) ? params.quickPlayers.map((p: any) => String(p?.id || "")).filter(Boolean) : []);
  const [selectedBotIds, setSelectedBotIds] = React.useState<string[]>([]);

  // ---- Paramètres ----
  const [scoreMode, setScoreMode] = React.useState<ScoreMode>(() => isQuickParty && params?.quickScoreMode === "no-points" ? "no-points" : "points");
  const [maxRounds, setMaxRounds] = React.useState<number>(() => isQuickParty ? Math.max(0, Math.min(99, Number(params?.quickMaxRounds ?? 0))) : String(params?.variantId || "").toLowerCase()==="quickie" ? 10 : 0);
  const [continueToLast, setContinueToLast] = React.useState<boolean>(() => !!params?.quickContinueToLast);
  const [rotateFirstPlayer, setRotateFirstPlayer] = React.useState<boolean>(true);

  // ---- Variante (2A): Cricket classique / Enculette-Vache ----
  const [pendingBull50, setPendingBull50] = React.useState(false);
  const [pendingWildMouse, setPendingWildMouse] = React.useState<{target:number;mult:Multiplier}|null>(null);
  const [variantId, setVariantId] = React.useState<CricketVariantId>(() => isQuickParty && params?.quickExtended ? "tactics" : (String(params?.variantId || params?.presetVariantId || "classic") as CricketVariantId));
  const isExtendedCricket = ["extended","tactics","mickey_mouse","wild_mouse"].includes(variantId);
  const cricketRule: CricketRuleVariant = variantId === "wild_mouse" ? "wild_mouse" : variantId === "mickey_mouse" ? "mickey_mouse" : isExtendedCricket ? "tactics" : variantId in CRICKET_VARIANT_RULES ? variantId as CricketRuleVariant : "classic";
  const cricketRuleData = CRICKET_VARIANT_RULES[cricketRule];
  // Source unique pour les tickers des variantes : configuration, Play et modales.
  // Ne jamais retomber sur le ticker CRICKET classique si l'image dédiée existe.
  const cricketTickerKey = variantId === "enculette" ? "enculette"
    : cricketRule === "double_only" ? "cricket_master"
    : cricketRule === "classic" ? "cricket"
    : `cricket_${cricketRule}`;
  const cricketVariantTicker = dartsQuickTicker(cricketTickerKey)
    || (variantId === "enculette" ? tickerEnculette
      : cricketRule === "tactics" ? tickerMaster
      : cricketRule === "cut_throat" ? tickerCutThroat : tickerCricket);

  const [pickItNumbers, setPickItNumbers] = React.useState<number[]>(() => Array.isArray(params?.quickPickItNumbers) && params.quickPickItNumbers.length===6 ? params.quickPickItNumbers : [20,19,18,17,16,15]);
  const [masterAllowsTriples, setMasterAllowsTriples] = React.useState(!!params?.quickMasterAllowsTriples);
  const isNoScoreRoute = ["no_score", "no-score", "cricket_no_score"].includes(String((params as any)?.variantId ?? (params as any)?.presetVariantId ?? "").toLowerCase());

  type CricketStartOrderMode = "random" | "alternate" | "manual" | "bull";
  const [startOrderMode, setStartOrderMode] = React.useState<CricketStartOrderMode>(() => isQuickParty && params?.quickRandomStart ? "random" : "alternate");
  const [orderedStartIds, setOrderedStartIds] = React.useState<string[]>([]);
  const cricketOrderOptions: {id: CricketStartOrderMode; icon: "random-order" | "alternate-order" | "manual-pick" | "bull-order"; label: string; detail: string}[] = [
    {id:"random",icon:"random-order",label:"ALÉATOIRE",detail:"Les participants sont mélangés automatiquement au lancement de la partie."},
    {id:"alternate",icon:"alternate-order",label:"ALTERNÉ",detail:"Le premier départ respecte l’ordre actuel de sélection des participants."},
    {id:"manual",icon:"manual-pick",label:"MANUEL",detail:"Définis l’ordre exact des participants à l’aide des flèches ci-dessous."},
    {id:"bull",icon:"bull-order",label:"BULL",detail:"Effectue le lancer au BULL, puis classe les participants selon les résultats avant de lancer la partie."},
  ];
  const selectedStartIds = [...selectedIds, ...selectedBotIds];
  const resolvedStartIds = [...orderedStartIds.filter(id => selectedStartIds.includes(id)),...selectedStartIds.filter(id => !orderedStartIds.includes(id))];
  const moveStartParticipant = (id:string, direction:-1|1) => {
    const copy=[...resolvedStartIds];
    const index=copy.indexOf(id), next=index+direction;
    if(index<0||next<0||next>=copy.length)return;
    [copy[index],copy[next]]=[copy[next],copy[index]];
    setOrderedStartIds(copy);
  };
  const changeStartOrderMode = (mode:CricketStartOrderMode) => {
    setStartOrderMode(mode);
    setRandomStart(mode==="random");
  };
  const [randomStart, setRandomStart] = React.useState<boolean>(() => isQuickParty && params?.quickRandomStart === true);
  const [teamMode, setTeamMode] = React.useState<boolean>(() => isQuickParty && params?.quickTeamMode === true);
  const cricketMaxParticipants = (isExtendedCricket || cricketRule !== "classic") && !teamMode ? Number.MAX_SAFE_INTEGER : 4;
  const [fillWithBots, setFillWithBots] = React.useState<boolean>(false);
  const [mssCricketStep, setMssCricketStep] = React.useState(0);
  const [mssCricketView, setMssCricketView] = React.useState<"guided" | "complete">("guided");
  const [mssCricketFormat, setMssCricketFormat] = React.useState<"duel" | "multi">("duel");
  // La limite du sélecteur doit refléter le format choisi, pas seulement la variante.
  // Les parties rapides conservent leur propre configuration de participants.
  const cricketSelectionLimit = teamMode ? 4 : (!isQuickParty && mssCricketFormat === "duel" ? 2 : cricketMaxParticipants);
  const changeCricketFormat = (next: "duel" | "multi") => {
    setMssCricketFormat(next);
    if (next === "duel" && !teamMode && !isQuickParty) {
      const keep = [...selectedIds.map(id => ({ id, bot: false })), ...selectedBotIds.map(id => ({ id, bot: true }))].slice(0, 2);
      setSelectedIds(keep.filter(x => !x.bot).map(x => x.id));
      setSelectedBotIds(keep.filter(x => x.bot).map(x => x.id));
    }
  };
  // MSS — étapes dédiées aux règles de chaque variante (sans dupliquer le moteur).
  const hasVariantRulesStep = cricketRule !== "classic" || isNoScoreRoute || variantId === "enculette";
  const cricketSteps = React.useMemo(() => [
    "Awena vous explique", "Joueurs ou équipes", "Format", "Sélection",
    ...(hasVariantRulesStep ? ["Règles de la variante"] : []),
    "Scoring", "Volées", "Départ", "Saisie", "Récapitulatif",
  ], [hasVariantRulesStep]);
  const cricketStepIndex = (label: string) => cricketSteps.indexOf(label);
  React.useEffect(() => {
    setMssCricketStep(current => Math.min(current, cricketSteps.length - 1));
  }, [cricketSteps.length]);


  // ✅ DartSet (v1) — utile pour StatsHub / Stats par fléchettes
  const dartSetId = String(params?.dartSetId ?? params?.config?.dartSetId ?? "").trim() || null;

  // Preset depuis la route (Games / registry / liens)
  // - presetVariantId : ancienne clé utilisée par certaines cartes
  // - variantId       : clé standard (ex: enculette, cut_throat)
  React.useEffect(() => {
    const raw = String((isQuickParty && params?.quickExtended) ? "extended" : ((params as any)?.presetVariantId ?? (params as any)?.variantId ?? ""))
      .trim()
      .toLowerCase();
  
    const normalize = (v: string): CricketVariantId | null => {
      if (!v) return null;
  
      // Cut-Throat (toutes formes possibles)
      if (v === "cut_throat" || v === "cut-throat" || v === "cutthroat") return "cut_throat";
  
      // Enculette / Vache (tolérance)
      if (v === "enculette" || v === "enculette_vache" || v === "enculette-vache") return "enculette";
  
      // Classic
      if (v === "extended" || v === "cricket_extended" || v === "cricket-extended" || v === "tactics" || v === "cricket_tactics") return "tactics";
      if (v === "cricket_master" || v === "cricket-master" || v === "double_only" || v === "master") return "double_only";
      if (v in CRICKET_VARIANT_RULES) return v as CricketRuleVariant;
      if (v === "classic" || v === "cricket") return "classic";
  
      return null;
    };
  
    const preset = normalize(raw);
    if (preset && preset !== variantId) {
      setVariantId(preset);
    }
  }, [params]);

  // Preset Cut-Throat (route / registry)
  const isCutThroatRoute = (() => {
    const v = String((params as any)?.variantId ?? (params as any)?.presetVariantId ?? "").toLowerCase();
    return v === "cut_throat" || v === "cut-throat";
  })();
  React.useEffect(() => {
    if (isNoScoreRoute) setScoreMode("no-points");
  }, [isNoScoreRoute]);
  React.useEffect(() => {
    if (isCutThroatRoute || cricketRule === "sudden_death") {
      setScoreMode('points'); // Cut-throat = points obligatoires
      // On garde variantId UI (classic/enculette) mais le moteur bascule en cut-throat via option.
    }
  }, [isCutThroatRoute, cricketRule]);



// ---- Recorder STATS (par fléchette) ----
const legIdRef = React.useRef<string>(`cricket:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`);
const cricketRecorder = useCricketStatsRecorder(legIdRef.current);

const scoringVariant = React.useMemo(() => {
  if (variantId === "cut_throat" || isCutThroatRoute) return "cut-throat";
  if (isNoScoreRoute) return "no-points";
  return scoreMode === "no-points" ? "no-points" : "points";
}, [variantId, isCutThroatRoute, isNoScoreRoute, scoreMode]);

// ---- Match en cours ----
const [state, setState] = React.useState<CricketState | null>(null);
const [hitMode, setHitMode] = React.useState<HitMode>("S");
const [showMasterOtherSectors, setShowMasterOtherSectors] = React.useState(false);

// --- Multi-input (KEYPAD / CIBLE) — persistant via SCORE_INPUT_LS_KEY
type InputMethod = "keypad" | "dartboard";
const [inputMethod, setInputMethod] = React.useState<InputMethod>(() => {
  try {
    const v = isQuickParty && params?.quickInputMethod ? params.quickInputMethod : localStorage.getItem(SCORE_INPUT_LS_KEY);
    return v === "dartboard" ? "dartboard" : "keypad";
  } catch {
    return "keypad";
  }
});

React.useEffect(() => {
  try {
    // On écrit uniquement les 2 valeurs utiles pour Cricket
    localStorage.setItem(SCORE_INPUT_LS_KEY, inputMethod === "dartboard" ? "dartboard" : "keypad");
  } catch {
    // ignore
  }
}, [inputMethod]);
const [showHelp, setShowHelp] = React.useState(false);
const [showEnd, setShowEnd] = React.useState(false);
const [cricketPanel, setCricketPanel] = React.useState<"players"|"ranking"|"marks"|"stats"|"actions"|null>(null);

// 🕒 timestamp de début de manche (pour createdAt)
const [legStartAt, setLegStartAt] = React.useState<number | null>(null);

const currentPlayer =
  state && state.players[state.currentPlayerIndex]
    ? state.players[state.currentPlayerIndex]
    : null;

const isFinished = !!state?.winnerId;

React.useEffect(() => {
  if (isFinished) setShowEnd(true);
}, [isFinished]);

React.useEffect(() => {
  if (!state || !Array.isArray(state.players) || !state.players.length) return;
  try {
    const castPlayers = state.players.map((p: any, idx: number) => {
      const leg = computeLegStatsForPlayer(p);
      const totalThrows = Number(leg?.darts ?? p?.dartsThrown ?? p?.darts ?? 0);
      const totalMarks = Number(leg?.totalMarks ?? 0);
      const misses = Math.max(0, totalThrows - totalMarks);
      return {
        id: String(p?.id ?? idx),
        name: String(p?.name || "Joueur"),
        score: Number(p?.score ?? 0),
        active: idx === Number(state?.currentPlayerIndex ?? -1),
        avatarUrl: typeof (p?.avatarUrl ?? p?.photoUrl ?? p?.avatar) === "string" && /^(https?:|blob:|\/)/i.test(String(p?.avatarUrl ?? p?.photoUrl ?? p?.avatar)) ? String(p?.avatarUrl ?? p?.photoUrl ?? p?.avatar) : "",
        stats: {
          avg3d: Number(leg?.mpr ?? 0).toFixed(2),
          bestVisit: Number(leg?.bestVisitMarks ?? 0),
          hits: totalMarks,
          miss: misses,
          simple: 0,
          double: 0,
          triple: 0,
          bull: Number(leg?.perSegment?.[25]?.marks ?? 0),
          dbull: 0,
          bust: 0,
          totalThrows,
        },
      };
    });

    const snapshot = {
      screen: "game",
      game: "cricket",
      title: "Cricket",
      status: isFinished ? "finished" : "live",
      players: castPlayers,
      currentPlayer: String(state.players?.[state.currentPlayerIndex]?.id ?? ""),
      scores: castPlayers.map((p: any) => Number(p?.score ?? 0)),
      meta: {
        round: Number(state?.round ?? state?.currentRound ?? 1),
        variant: String(variantId || "classic"),
        scoreMode: String(scoreMode || "points"),
      },
      updatedAt: Date.now(),
    };

    appendGoogleCastDiag("cricket_snapshot_send_now", {
      players: castPlayers.length,
      currentPlayer: snapshot.currentPlayer,
      status: snapshot.status,
    });

    void appendGoogleCastDiag("cricket_snapshot_payload_slim", { hasBase64Avatar: castPlayers.some((p: any) => !!p?.avatarDataUrl) });

      Promise.resolve(sendCastSnapshot(snapshot))
      .then((ok) => appendGoogleCastDiag(ok ? "cricket_snapshot_sent" : "cricket_snapshot_not_sent", { players: castPlayers.length }))
      .catch((err) => appendGoogleCastDiag("cricket_snapshot_throw", String(err)));
  } catch (err) {
    appendGoogleCastDiag("cricket_snapshot_build_failed", String(err));
  }
}, [state, isFinished, variantId, scoreMode, teamMode, scoringVariant, isCutThroatRoute, castStatusTick]);

React.useEffect(() => {
  // ✅ AUTOSAVE in_progress pour reprise (toutes les 8s)
  if (!state) return;
  if (isFinished) return;
  const flush = () => {
    try {
      const rec = buildHistoryRecord();
      if (!rec) return;
      const payload: any = (rec as any)?.payload || {};
      const sig = JSON.stringify({
        id: (rec as any)?.id,
        status: (rec as any)?.status,
        winnerId: (rec as any)?.winnerId ?? null,
        currentPlayerIndex: Number((state as any)?.currentPlayerIndex ?? -1),
        players: Array.isArray((state as any)?.players)
          ? (state as any).players.map((p: any) => ({ id: p?.id, score: p?.score, marks: p?.marks }))
          : [],
        darts: Number((rec as any)?.summary?.darts ?? 0),
        visits: Array.isArray(payload?.visits) ? payload.visits.length : 0,
      });
      if (sig === autosaveLastSigRef.current) return;
      autosaveLastSigRef.current = sig;
      void History.upsert(rec as any);
    } catch {}
  };
  const t = window.setInterval(() => {
    const ric = (window as any)?.requestIdleCallback;
    if (typeof ric === "function") {
      autosaveIdleRef.current = ric(() => {
        autosaveIdleRef.current = null;
        flush();
      }, { timeout: 1200 });
    } else {
      flush();
    }
  }, 8000);
  return () => {
    window.clearInterval(t);
    const cancelIdle = (window as any)?.cancelIdleCallback;
    if (autosaveIdleRef.current && typeof cancelIdle === "function") {
      try { cancelIdle(autosaveIdleRef.current); } catch {}
      autosaveIdleRef.current = null;
    }
  };
}, [state, isFinished]);

// --------------------------------------------------
// ✅ BOTS IA (stable, sans casser la syntaxe)
// - PRO_BOTS : ceux déclarés plus haut dans le fichier
// - User bots : profils marqués isBot dans profiles[] (si présents)
// - Fallback LS "dc_bots_v1" si aucun bot dans profiles
// --------------------------------------------------

const [botsFromLS, setBotsFromLS] = React.useState<BotLite[]>([]);

React.useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    const mapped: BotLite[] = loadBotPlayers().map((b: any) => ({
      ...b,
      id: String(b.id),
      name: b.name || "BOT",
      avatarDataUrl: b.avatarDataUrl ?? b.avatarUrl ?? b.avatar ?? null,
      avatarUrl: b.avatarUrl ?? b.avatar ?? null,
      avatar: b.avatar ?? b.avatarUrl ?? b.avatarDataUrl ?? null,
      botLevel: b.botLevel ?? b.level ?? "",
    }));
    setBotsFromLS(mapped);
  } catch (e) {
    console.warn("[CricketPlay] load bots LS failed:", e);
  }
}, []);

const userBotsFromStore: BotLite[] = React.useMemo(() => {
  return (allProfiles || [])
    .filter((p: any) => !!p?.isBot)
    .map((p: any) => ({
      id: String(p.id),
      name: p.name || "BOT",
      avatarDataUrl: p.avatarDataUrl ?? null,
      botLevel:
        p.botLevel ??
        p.levelLabel ??
        p.levelName ??
        p.performanceLevel ??
        p.performance ??
        p.skill ??
        p.difficulty ??
        "",
    }));
}, [allProfiles]);

const userBots: BotLite[] = React.useMemo(() => {
  if (userBotsFromStore.length > 0) return userBotsFromStore;
  return botsFromLS;
}, [userBotsFromStore, botsFromLS]);

// Liste finale affichée dans le carrousel bots
const botProfiles = React.useMemo(() => {
  // PRO_BOTS ont avatarDataUrl (import image) => OK pour ProfileAvatar
  return [...PRO_BOTS, ...userBots, ...cricketCreatedBots] as any[];
}, [userBots, cricketCreatedBots]);

// Map ID -> profil utilisable partout (humains + bots)
const profileById = React.useMemo(() => {
  const m = new Map<string, any>();
  for (const p of allProfiles) if (p?.id) m.set(String(p.id), p);

  // PRO bots
  for (const b of PRO_BOTS) {
    if (!b?.id) continue;
    m.set(String(b.id), {
      id: String(b.id),
      name: b.name || "BOT",
      avatarDataUrl: b.avatarDataUrl ?? null,
      isBot: true,
      botLevel: b.botLevel ?? "",
    });
  }

  // user bots and locally created bots (preserve their avatars during launch)
  for (const b of [...userBots, ...cricketCreatedBots]) {
    if (!b?.id) continue;
    m.set(String(b.id), {
      id: String(b.id),
      name: b.name || "BOT",
      avatarDataUrl: b.avatarDataUrl ?? null,
      isBot: true,
      botLevel: b.botLevel ?? "",
    });
  }

  return m;
}, [allProfiles, userBots, cricketCreatedBots]);

// --------------------------------------------------
// ✅ BOT ENGINE (auto-play) — joue automatiquement quand c'est le tour d'un bot
// ✅ FIX: anti "stale currentPlayer" -> on capture botId au début et on compare cp.id à botId
// ✅ Robust: clear timers + lock + UI flag botThinking
// À COLLER ICI : juste après profileById (sinon profileById pas défini)
// --------------------------------------------------

const botTurnLockRef = React.useRef(false);
const botTimersRef = React.useRef<number[]>([]);
const [botThinking, setBotThinking] = React.useState(false);

React.useEffect(() => {
  return () => {
    try {
      botTimersRef.current.forEach((t) => window.clearTimeout(t));
    } catch {}
    botTimersRef.current = [];
    botTurnLockRef.current = false;
  };
}, []);

React.useEffect(() => {
  if (!state) return;
  if (!currentPlayer) return;
  if ((state as any).winnerId) return;
  if ((state as any).forcedFinished) return;

  const prof = profileById.get(currentPlayer.id) ?? null;
  if (!isBotProfile(prof)) return;

  // ✅ capture l'id du bot AU MOMENT où l'effet démarre (évite currentPlayer "stale")
  const botId = String(currentPlayer.id);

  if (botTurnLockRef.current) return;
  botTurnLockRef.current = true;
  setBotThinking(true);

  const withPoints = scoreMode === "points";
  const lvl = normalizeBotLevel((prof as any)?.botLevel);
  const { thinkMs, hitQuality, preferHighMult, mistake } = botParams(lvl);

  const schedule = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    botTimersRef.current.push(t);
  };

  const doOneDart = (dartIndex: number) => {
    schedule(() => {
      setState((prev) => {
        if (!prev) return prev;
        if ((prev as any).winnerId) return prev;
        if ((prev as any).forcedFinished) return prev;

        const cp = (prev as any).players?.[(prev as any).currentPlayerIndex];
        if (!cp) return prev;

        // ✅ si ce n’est plus le bot courant (id capturé), stop
        if (String(cp.id) !== botId) return prev;

        const paramsQuality = Math.max(
          0.1,
          Math.min(0.98, hitQuality - (Math.random() < mistake ? 0.25 : 0))
        );

        const botNeedsBed = prev.exclusiveSpecial && Number(cp?.marks?.[28]||0)<3;
        const pick = botNeedsBed ? {target:20,mult:1} : pickCricketBotThrow(prev, cp, withPoints, paramsQuality);

        let mult = pick.mult as any;
        if (mult > 1 && Math.random() > preferHighMult) mult = 1;

        const botSpecialChoice = prev.exclusiveSpecial ? (botNeedsBed ? "bed" : (mult===2&&Number(cp.marks?.[26]||0)<3)||(mult===3&&Number(cp.marks?.[27]||0)<3) ? "special" : "number") : undefined;
        const before = prev as any;

        // ---- STATS recorder : log bot dart ----
        try {
          const pid = String(before.players?.[before.currentPlayerIndex]?.id ?? "");
          const beforeP = before.players?.[before.currentPlayerIndex];
          const beforeScore = Number(beforeP?.score ?? 0);
          const recordedGoal = before.extended && Number(pick.target) === 25 && mult === 2 && Number(beforeP?.marks?.[25] || 0) >= 3 ? 26 : Number(pick.target);
          const beforeMarksRaw = beforeP?.marks?.[recordedGoal] ?? 0;
          const beforeMarks = Math.min(3, Number(beforeMarksRaw ?? 0));

          const hitsSoFar = extractHitsForPlayerFromState(before, pid).length;
          const visitIndex = Math.floor(hitsSoFar / 3);
          const dartIndex = (hitsSoFar % 3) as 0 | 1 | 2;

          let seg: any = "MISS";
          let ring: any = "MISS";
          let marks = 0;
          let rawScore = 0;

          const rawTarget = Number(pick.target);

          if (rawTarget === 25) {
            seg = 25;
            if (mult >= 2) ring = "DB";
            else ring = "SB";
            marks = mult >= 2 ? 2 : 1;
            rawScore = (25 * (mult >= 2 ? 2 : 1));
          } else if (rawTarget >= 1 && rawTarget <= 20) {
            seg = rawTarget;
            ring = mult >= 3 ? "T" : mult >= 2 ? "D" : "S";
            marks = mult;
            rawScore = rawTarget * mult;
          }

          let next = applyCricketHit(before as any, pick.target as any, mult, undefined, botSpecialChoice as any) as any;

          const afterP = next.players?.[before.currentPlayerIndex];
          const afterScore = Number(afterP?.score ?? 0);
          const scoredPoints = Math.max(0, afterScore - beforeScore);

          let inflictedPoints = 0;
          if (isCutThroatRoute) {
            for (let i = 0; i < (next.players?.length ?? 0); i++) {
              if (i === before.currentPlayerIndex) continue;
              const ds = Number(next.players[i]?.score ?? 0) - Number(before.players[i]?.score ?? 0);
              if (ds > 0) inflictedPoints += ds;
            }
          }

          const afterMarksRaw = (afterP?.marks?.[recordedGoal] ?? beforeMarksRaw);
          const afterMarks = Math.min(3, Number(afterMarksRaw ?? 0));
          const closedSegmentNow = (recordedGoal === 26 || rawTarget === 25 || (rawTarget >= 15 && rawTarget <= 20))
            ? (beforeMarks < 3 && afterMarks >= 3)
            : false;

          const winningThrow = !before.winnerId && !!next.winnerId;

          cricketRecorder.logDart({
            matchId: matchIdRef.current,
            setId: (before as any)?.setId,
            legId: legIdRef.current,
            playerId: pid,
            visitIndex,
            dartIndex,
            segment: seg,
            ring,
            marks,
            rawScore,
            scoredPoints,
            inflictedPoints,
            beforeMarksOnSegment: beforeMarks,
            afterMarksOnSegment: afterMarks,
            closedSegmentNow,
            winningThrow,
          });

          // SFX
          sfxForHit(pick.target, mult);

          // hard stop maxRounds
          next = maybeApplyMaxRoundsHardStop(next);

          return next;
        } catch {
          let next = applyCricketHit(prev as any, pick.target as any, mult, undefined, botSpecialChoice as any) as any;

          // SFX
          sfxForHit(pick.target, mult);

          // hard stop maxRounds
          next = maybeApplyMaxRoundsHardStop(next);

          return next;
        }

      });

      // fin des 3 darts
      if (dartIndex === 2) {
        schedule(() => {
          botTurnLockRef.current = false;
          setBotThinking(false);
        }, 80);
      }
    }, thinkMs + dartIndex * (thinkMs + 90));
  };

  doOneDart(0);
  doOneDart(1);
  doOneDart(2);

  return () => {
    try {
      botTimersRef.current.forEach((t) => window.clearTimeout(t));
    } catch {}
    botTimersRef.current = [];
    botTurnLockRef.current = false;
    setBotThinking(false);
  };
}, [
  state?.currentPlayerIndex,
  state?.remainingDarts,
  state?.winnerId,
  (state as any)?.forcedFinished,
  currentPlayer?.id,
  scoreMode,
  maxRounds,
  profileById,
]);

// --------------------------------------------------
// Helpers visuels
// --------------------------------------------------

function renderAvatarCircle(
  prof: any,
  opts?: { selected?: boolean; size?: number; mode?: "setup" | "play" }
) {
  const size = opts?.size ?? 40;
  const selected = !!opts?.selected;
  const mode = opts?.mode ?? "play";

  const isBot = !!prof?.isBot || String(prof?.id || "").startsWith("bot_") || !!prof?.botLevel;

  const initials =
    (prof?.name || "")
      .split(" ")
      .filter(Boolean)
      .map((s: string) => s[0])
      .join("")
      .toUpperCase() || "?";

  const borderColor = selected ? T.gold : "rgba(148,163,184,0.3)";
  const showNeon = selected;
  const grayscale = mode === "setup" && !selected;

  const src =
    prof?.avatarDataUrl ||
    prof?.avatarUrl ||
    prof?.avatar ||
    null;

  const core = src ? (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        border: `2px solid ${borderColor}`,
        boxShadow: showNeon
          ? "0 0 10px rgba(246,194,86,0.9), 0 0 24px rgba(246,194,86,0.7)"
          : "0 0 4px rgba(0,0,0,0.8)",
        background:
          mode === "setup"
            ? "radial-gradient(circle at 30% 0%, #1f2937 0, #020617 80%)"
            : "#000",
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt={prof?.name ?? "avatar"}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          filter: grayscale ? "grayscale(1) brightness(0.6)" : "none",
          opacity: grayscale ? 0.7 : 1,
        }}
      />
    </div>
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: selected ? T.gold : "#0f172a",
        color: selected ? "#3A2300" : "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 800,
        border: `2px solid ${borderColor}`,
        boxShadow: showNeon
          ? "0 0 10px rgba(246,194,86,0.9), 0 0 24px rgba(246,194,86,0.7)"
          : "0 0 4px rgba(0,0,0,0.8)",
        flexShrink: 0,
        filter: grayscale ? "grayscale(1) brightness(0.6)" : "none",
        opacity: grayscale ? 0.7 : 1,
      }}
    >
      {initials}
    </div>
  );

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {core}
      {isBot ? (
        <div style={{ position: "absolute", inset: -6, pointerEvents: "none" }}>
          <ProfileStarRing profile={{ ...(prof || {}), isBot: true } as any} size={size + 12} />
        </div>
      ) : null}
    </div>
  );
}

  // --------------------------------------------------
  // SETUP helpers + start match (humans + bots + team)
  // --------------------------------------------------

  function toggleProfile(id: string) {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx !== -1) {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      }
      if (prev.length + selectedBotIds.length >= cricketSelectionLimit) return prev;
      return [...prev, id];
    });
  }

  function toggleBot(id: string) {
    setSelectedBotIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx !== -1) {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      }
      if (selectedIds.length + prev.length >= cricketSelectionLimit) return prev;
      return [...prev, id];
    });
  }

  const selectedHumanCount = selectedIds.length;
  const selectedBotCount = selectedBotIds.length;
  const selectedCount = selectedHumanCount + selectedBotCount;

  const canStartBase = selectedCount >= 2 && selectedCount <= cricketMaxParticipants;
  const wantsTeam = teamMode;
  const teamNeedsBot = wantsTeam && selectedCount === 3 && fillWithBots;
  const teamValidCount = wantsTeam ? selectedCount === 4 || teamNeedsBot : true;
  const formatValid = teamMode || isQuickParty || (mssCricketFormat === "duel" ? selectedCount === 2 : selectedCount >= 3);
  const canStart = canStartBase && teamValidCount && formatValid;

  function handleStartMatch() {
    if (!canStart) return;

    const selectedProfiles = selectedIds
      .map((id) => profileById.get(id) || null)
      .filter(Boolean) as Profile[];

    const selectedBots = (selectedBotIds ?? [])
      .map((id) => profileById.get(id) || null)
      .filter(Boolean) as any[];

    if (selectedProfiles.length + selectedBots.length < 2) return;

    let finalProfiles: Array<any> = [
      ...selectedProfiles,
      ...selectedBots.map((b) => ({
        id: b.id,
        name: (b as any).name ?? (b as any).displayName ?? "BOT",
        avatarDataUrl: (b as any).avatarDataUrl ?? null,
        avatarKey: (b as any).avatarKey ?? null, // ✅ conserve avatarKey
        isBot: true,
      })),
    ];

    // ✅ auto-complète en 2v2 si 3 joueurs
    if (teamNeedsBot && finalProfiles.length === 3) {
      const bot =
        (PRO_BOTS as any[]).find((bb: any) => !finalProfiles.some((p) => p.id === bb.id)) ??
        (PRO_BOTS[0] as any);
    
      if (bot) {
        finalProfiles.push({
          id: String(bot.id),
          name: bot.name ?? "BOT",
          avatarDataUrl: bot.avatarDataUrl ?? null,
          isBot: true,
        });
      }
    }

    finalProfiles = finalProfiles.slice(0, cricketMaxParticipants);
    // MANUEL et BULL appliquent l'ordre défini avec les commandes du configurateur.
    if (startOrderMode === "manual" || startOrderMode === "bull") {
      const order = new Map(resolvedStartIds.map((id, index) => [id, index]));
      finalProfiles = [...finalProfiles].sort((a,b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    }

    let players = finalProfiles.map((p) => ({ id: p.id, name: p.name }));

    if (randomStart) {
      players = [...players].sort(() => Math.random() - 0.5);
    }

    const match = createCricketMatch(players, {
      withPoints: (scoreMode === "points") || isCutThroatRoute,
      cutThroat: isCutThroatRoute,
      maxRounds: cricketRule === "quickie" ? 10 : maxRounds,
      continueToLast: cricketRule !== "quickie" && !teamMode && variantId !== "enculette" && continueToLast,
      extended: isExtendedCricket,
      targets: configuredCricketTargets(cricketRule, pickItNumbers),
      doubleOnly: cricketRuleData.doubleOnly,
      allowTripleMaster: masterAllowsTriples,
      hiddenTargets: cricketRuleData.hidden,
      sameBed: cricketRuleData.sameBed,
      exclusiveSpecial: cricketRuleData.exclusiveSpecial,
      wildCard: cricketRuleData.wildCard,
      suddenDeathGap: cricketRuleData.suddenDeath,
    });

    // new legId + reset recorder
    legIdRef.current = `cricket:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    cricketRecorder.resetLeg(legIdRef.current);

    setPendingBull50(false);
    setPendingWildMouse(null);
    setState(match);
    setPhase("play");
    setHitMode("S");
    setLegStartAt(Date.now());
    setShowEnd(false);
    quickSafePlaySound("start");
  }

  const quickAutoStartedRef = React.useRef(false);
  React.useEffect(() => {
    if (!isQuickParty || params?.autoQuickStart !== true || quickAutoStartedRef.current || !canStart) return;
    quickAutoStartedRef.current = true;
    handleStartMatch();
  }, [isQuickParty, params?.autoQuickStart, canStart]);

  // --------------------------------------------------
  // PLAY : SFX + logique
  // --------------------------------------------------

  function sfxForHit(target: number, mult: Multiplier) {
    if (target >= 0 && target <= 14 && !(state?.targets?.includes(target)) && !(isExtendedCricket && target > 0 && mult >= 2)) {
      quickSafePlaySound("bust");
      return;
    }
    if (target === 25) {
      if (mult === 2) quickSafePlaySound("dbull");
      else quickSafePlaySound("bull");
      return;
    }
    if (mult === 2) {
      quickSafePlaySound("double");
      return;
    }
    if (mult === 3) {
      quickSafePlaySound("triple");
      return;
    }
    quickSafePlaySound("ok");
  }

  function maybeApplyMaxRoundsHardStop(next: CricketState): CricketState {
    if ((next as any)?.winnerId) return next;

    const rn = clampRoundNumber(next);
    if (!rn) return next;

    // Le moteur gère déjà la fin de la dernière volée. Ne jamais arrêter
    // une partie au début de la dernière manche.
    if (maxRounds > 0 && rn >= maxRounds && next.remainingDarts === 0) {
      const withPoints = scoreMode === "points";
      const winnerId = decideWinnerAtMaxRounds(next, withPoints, teamMode);
      if (winnerId) return { ...(next as any), winnerId } as any;

      return { ...(next as any), winnerId: null, forcedFinished: true } as any;
    }

    return next;
  }

  function registerHit(rawTarget: number, multOverride?: Multiplier, bull50Choice?: "bull" | "double", specialChoice?: "number" | "special" | "bed") {
    if (!state || !currentPlayer) return;
    if (state.winnerId) return;
    if ((state as any).forcedFinished) return;
    if (pendingBull50 && !bull50Choice) return;
    if (pendingWildMouse && !specialChoice) return;

    let mult: Multiplier = multOverride ?? 1;
    if (!multOverride) {
      if (hitMode === "D") mult = 2;
      if (hitMode === "T") mult = 3;
    }

    if (state.exclusiveSpecial && rawTarget>=1 && rawTarget<=20 && state.targets?.includes(rawTarget) && !specialChoice) {
      setPendingWildMouse({target:rawTarget,mult});
      return;
    }

    // Proposer le choix uniquement pour un DBULL50 humain en Cricket Étendu.
    // BULL fermé : affectation automatique d'un impact à DOUBLE.
    if (isExtendedCricket && rawTarget === 25 && mult === 2 && !bull50Choice) {
      const activePlayer = state.players[state.currentPlayerIndex];
      if (Number(activePlayer?.marks?.[25] || 0) < 3 && Number(activePlayer?.marks?.[26] || 0) < 3) {
        setPendingBull50(true);
        return;
      }
      bull50Choice = Number(activePlayer?.marks?.[25] || 0) >= 3 ? "double" : "bull";
    }

    const prev = state as any;

    // ---- STATS recorder : log 1 dart ----
    try {
      const pid = String(prev.players?.[prev.currentPlayerIndex]?.id ?? "");
      const beforeP = prev.players?.[prev.currentPlayerIndex];
      const beforeScore = Number(beforeP?.score ?? 0);

      const recordedGoal = specialChoice === "bed" ? 28 : specialChoice === "special" && mult === 2 ? 26 : specialChoice === "special" && mult === 3 ? 27 : isExtendedCricket && rawTarget === 25 && mult === 2 && (bull50Choice === "double" || (Number(beforeP?.marks?.[25] || 0) >= 3)) ? 26 : rawTarget;
      const beforeMarksRaw = beforeP?.marks?.[recordedGoal] ?? 0;
      const beforeMarks = Math.min(3, Number(beforeMarksRaw ?? 0));

      const hitsSoFar = extractHitsForPlayerFromState(prev, pid).length;
      const visitIndex = Math.floor(hitsSoFar / 3);
      const dartIndex = (hitsSoFar % 3) as 0 | 1 | 2;

      let seg: any = "MISS";
      let ring: any = "MISS";
      let marks = 0;
      let rawScore = 0;

      if (rawTarget === 25) {
        seg = 25;
        if (mult >= 2) ring = "DB";
        else ring = "SB";
        marks = recordedGoal === 26 ? 1 : mult >= 2 ? 2 : 1;
        rawScore = (25 * (mult >= 2 ? 2 : 1));
      } else if (rawTarget >= 1 && rawTarget <= 20) {
        seg = rawTarget;
        ring = mult >= 3 ? "T" : mult >= 2 ? "D" : "S";
        marks = mult;
        rawScore = rawTarget * mult;
      }

      let nextTmp = applyCricketHit(prev, rawTarget as any, mult, bull50Choice, specialChoice) as any;

      const afterP = nextTmp.players?.[nextTmp.history?.[nextTmp.history.length - 1]?.playerIndex ?? nextTmp.currentPlayerIndex] ?? nextTmp.players?.[prev.currentPlayerIndex];
      const afterScore = Number(afterP?.score ?? 0);
      const scoredPoints = Math.max(0, afterScore - beforeScore);

      // Cut-throat: points ajoutés aux adversaires
      let inflictedPoints = 0;
      if (isCutThroatRoute) {
        for (let i = 0; i < (nextTmp.players?.length ?? 0); i++) {
          if (i === prev.currentPlayerIndex) continue;
          const ds = Number(nextTmp.players[i]?.score ?? 0) - Number(prev.players[i]?.score ?? 0);
          if (ds > 0) inflictedPoints += ds;
        }
      }

      const afterMarksRaw = (afterP?.marks?.[recordedGoal] ?? beforeMarksRaw);
      const afterMarks = Math.min(3, Number(afterMarksRaw ?? 0));
      const closedSegmentNow = (rawTarget === 25 || (rawTarget >= 15 && rawTarget <= 20))
        ? (beforeMarks < 3 && afterMarks >= 3)
        : false;

      const winningThrow = !prev.winnerId && !!nextTmp.winnerId;

      cricketRecorder.logDart({
        matchId: (prev as any)?.matchId,
        setId: (prev as any)?.setId,
        legId: legIdRef.current,

        playerId: pid,
        visitIndex,
        dartIndex,

        segment: seg,
        ring,

        marks,
        rawScore,
        scoredPoints,
        inflictedPoints,

        beforeMarksOnSegment: beforeMarks,
        afterMarksOnSegment: afterMarks,
        closedSegmentNow,

        winningThrow,
      });

      // SFX / hard stop
      sfxForHit(rawTarget, mult);
      nextTmp = maybeApplyMaxRoundsHardStop(nextTmp);

      setState(nextTmp);
    } catch (e) {
      // fallback : si recorder fail, on applique juste le hit
      let next = applyCricketHit(state, rawTarget as any, mult, bull50Choice, specialChoice) as any;
      sfxForHit(rawTarget, mult);
      next = maybeApplyMaxRoundsHardStop(next);
      setState(next);
    }

    if (mult >= 2 || hitMode === "D" || hitMode === "T") setHitMode("S");
  }

  function handleKeyPress(value: number) {
    if (!state || !currentPlayer) return;
    if (state.winnerId) return;
    if ((state as any).forcedFinished) return;
    registerHit(value);
  }

  function handleBull() {
    if (!state || !currentPlayer) return;
    if (state.winnerId) return;
    if ((state as any).forcedFinished) return;
    registerHit(25);
  }

  function handleUndo() {
    if (pendingBull50) { setPendingBull50(false); return; }
    if (pendingWildMouse) { setPendingWildMouse(null); return; }
    if (!state) return;
    const next = undoLastCricketHit(state) as any;
    try { cricketRecorder.eventsRef.current.pop(); } catch {}
    if ((next as any).forcedFinished) (next as any).forcedFinished = false;
    setState(next);
    quickSafePlaySound("undo");
  }

  function handleNewLegInternal() {
    if (!state) return;

    let nextPlayers = state.players;
    if (rotateFirstPlayer && state.players.length > 1) {
      const [first, ...rest] = state.players;
      nextPlayers = [...rest, first];
    }

    const match = createCricketMatch(
      nextPlayers.map((p) => ({ id: p.id, name: p.name })),
      {
        withPoints: scoreMode === "points",
        cutThroat: isCutThroatRoute,
        maxRounds: cricketRule === "quickie" ? 10 : maxRounds,
      continueToLast: cricketRule !== "quickie" && !teamMode && variantId !== "enculette" && continueToLast,
        extended: isExtendedCricket,
        targets: configuredCricketTargets(cricketRule, pickItNumbers),
        doubleOnly: cricketRuleData.doubleOnly,
        allowTripleMaster: masterAllowsTriples,
        hiddenTargets: cricketRuleData.hidden,
        sameBed: cricketRuleData.sameBed,
        exclusiveSpecial: cricketRuleData.exclusiveSpecial,
        wildCard: cricketRuleData.wildCard,
        suddenDeathGap: cricketRuleData.suddenDeath,
      }
    );

    // new legId + reset recorder
    legIdRef.current = `cricket:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    cricketRecorder.resetLeg(legIdRef.current);

    setPendingBull50(false);
    setPendingWildMouse(null);
    setState(match);
    setHitMode("S");
    setLegStartAt(Date.now());;
    setShowEnd(false);
    quickSafePlaySound("start");
  }

  function handleQuitInternal() {
    setPendingBull50(false);
    setState(null);
    setPhase("setup");
    setHitMode("S");
    setLegStartAt(null);
    setShowEnd(false);
  }

// --------------------------------------------------
// CONSTRUCTION DU RECORD POUR L'HISTORIQUE
// ✅ FIX CRITIQUE : reconstruction des hits Cricket
// --------------------------------------------------

function computeLegStatsForPlayer(p: any) {
  if (!state) {
    return {
      legId: legIdRef.current,
      playerId: String(p?.id ?? ""),
      mode: teamMode ? "teams" : "solo",
      scoringVariant,
      variantId,
      cutThroat: isCutThroatRoute,
      darts: 0,
      visits: 0,
      totalMarks: 0,
      totalPoints: 0,
      totalInflictedPoints: 0,
      mpr: 0,
      hitRate: 0,
      scoringRate: 0,
      won: false,
      winningDartIndex: 0,
      winningVisitIndex: 0,
      opponentTotalPoints: 0,
      perSegment: {
        15: { segment: 15, marks: 0, closes: 0, pointsScored: 0 },
        16: { segment: 16, marks: 0, closes: 0, pointsScored: 0 },
        17: { segment: 17, marks: 0, closes: 0, pointsScored: 0 },
        18: { segment: 18, marks: 0, closes: 0, pointsScored: 0 },
        19: { segment: 19, marks: 0, closes: 0, pointsScored: 0 },
        20: { segment: 20, marks: 0, closes: 0, pointsScored: 0 },
        25: { segment: 25, marks: 0, closes: 0, pointsScored: 0 },
      },
      bestVisitMarks: 0,
      avgMarksWhenScoring: 0,
      closeOrder: [],
      startedAt: legStartAt ?? Date.now(),
      endedAt: Date.now(),
      durationMs: 0,
    };
  }

  const pid = String(p?.id ?? "");
  const won = !!state.winnerId && String(state.winnerId) === pid;

  const oppScores = (state.players || [])
    .filter((x: any) => String(x?.id ?? "") !== pid)
    .map((x: any) => Number(x?.score ?? 0));

  const opponentTotalPoints = oppScores.length ? Math.max(...oppScores) : 0;

  return cricketRecorder.computeLegStatsForPlayer(pid, {
    mode: teamMode ? "teams" : "solo",
    won,
    opponentTotalPoints,
    opponentLabel: teamMode ? "Team" : "Opponent",
    scoringVariant,
    variantId,
    cutThroat: isCutThroatRoute,
  });
}

// --------------------------------------------------
// HIT NORMALIZATION
// --------------------------------------------------

function toHitStringFromObj(h: any): string | null {
  if (!h) return null;

  if (typeof h === "string") {
    const s = h.trim().toUpperCase();
    if (!s || s === "0" || s === "M" || s === "MISS") return "MISS";
    return s;
  }

  if (typeof h !== "object") return null;

  const seg =
    h.segment ??
    h.bed ??
    h.code ??
    h.label ??
    h.text ??
    null;

  if (typeof seg === "string") {
    const s = seg.toUpperCase();
    if (s === "0" || s === "MISS") return "MISS";
    // Les événements du recorder stockent parfois segment="20" + ring="T".
    if (/^\d{1,2}$/.test(s)) {
      const numericSeg = Number(s);
      const ring = String(h.ring ?? h.r ?? "S").toUpperCase();
      if (numericSeg === 25) return ring === "DB" || ring === "DBULL" || ring === "D" ? "DBULL" : "SBULL";
      if (numericSeg >= 15 && numericSeg <= 20) return `${ring === "T" ? "T" : ring === "D" ? "D" : "S"}${numericSeg}`;
    }
    return s;
  }

  if (typeof seg === "number") {
    const ring = String(h.ring ?? h.r ?? "S").toUpperCase();
    if (seg <= 14 || ring === "MISS") return "MISS";
    if (seg === 25) return ring === "DB" || ring === "DBULL" || ring === "D" ? "DBULL" : "SBULL";
    if (seg >= 15 && seg <= 20) return `${ring === "T" ? "T" : ring === "D" ? "D" : "S"}${seg}`;
  }

  const target = h.target ?? h.number ?? null;
  const mult = h.mult ?? h.multiplier ?? 1;

  if (typeof target === "number") {
    if (target >= 0 && target <= 14) return "MISS";
    if (target === 25) return mult >= 2 ? "DBULL" : "SBULL";
    if (target >= 15 && target <= 20) {
      return `${mult >= 3 ? "T" : mult >= 2 ? "D" : "S"}${target}`;
    }
  }

  return null;
}

// --------------------------------------------------
// EXTRACTION DES HITS DEPUIS LE STATE
// --------------------------------------------------

function extractHitsForPlayerFromState(st: any, playerId: string): string[] {
  if (!st) return [];

  // priorité : p.hits s’il existe
  const p = (st.players || []).find((x: any) => String(x.id) === String(playerId));
  if (Array.isArray(p?.hits) && p.hits.length) {
    return p.hits.map(toHitStringFromObj).filter(Boolean) as string[];
  }

  const sources = [
    st.history,
    st.events,
    st.turns,
    st.visits,
    st.log,
    st.throws,
    st.darts,
  ].filter(Array.isArray);

  for (const src of sources) {
    const out: string[] = [];
    for (const e of src) {
      if (!e) continue;
      if (e.playerId && String(e.playerId) !== String(playerId)) continue;

      if (Array.isArray(e.darts)) {
        e.darts.forEach((d: any) => {
          const h = toHitStringFromObj(d);
          if (h) out.push(h);
        });
      } else {
        const h = toHitStringFromObj(e);
        if (h) out.push(h);
      }
    }
    if (out.length) return out;
  }

  return [];
}

function summarizeCricketHitStrings(hits: string[]) {
  const out: any = {
    S: 0,
    D: 0,
    T: 0,
    BULL: 0,
    DBULL: 0,
    MISS: 0,
    darts: 0,
    marks: 0,
    bestVisitMarks: 0,
    byNumber: {} as Record<string, number>,
    byRing: {} as Record<string, number>,
  };

  let currentVisitMarks = 0;
  hits.forEach((raw, idx) => {
    const h = String(raw || '').trim().toUpperCase();
    out.darts += 1;
    let marks = 0;
    let numberKey = '';
    let ringKey = '';

    if (!h || h === '0' || h === 'M' || h === 'MISS') {
      out.MISS += 1;
      ringKey = 'MISS';
    } else if (h === 'DBULL' || h === 'DB' || h === 'D25') {
      out.DBULL += 1;
      marks = 2;
      numberKey = '25';
      ringKey = 'DBULL';
    } else if (h === 'BULL' || h === 'SBULL' || h === 'SB' || h === 'S25') {
      out.BULL += 1;
      marks = 1;
      numberKey = '25';
      ringKey = 'BULL';
    } else {
      const m = h.match(/^([SDT])\s*(\d{1,2})$/);
      if (m) {
        const ring = m[1];
        const seg = m[2];
        numberKey = seg;
        ringKey = ring;
        if (ring === 'S') { out.S += 1; marks = 1; }
        else if (ring === 'D') { out.D += 1; marks = 2; }
        else if (ring === 'T') { out.T += 1; marks = 3; }
      } else {
        out.MISS += 1;
        ringKey = 'MISS';
      }
    }

    if (numberKey) out.byNumber[numberKey] = (out.byNumber[numberKey] || 0) + marks;
    if (ringKey) out.byRing[ringKey] = (out.byRing[ringKey] || 0) + 1;
    out.marks += marks;
    currentVisitMarks += marks;

    if ((idx + 1) % 3 === 0 || idx === hits.length - 1) {
      out.bestVisitMarks = Math.max(out.bestVisitMarks, currentVisitMarks);
      currentVisitMarks = 0;
    }
  });

  return out;
}

// --------------------------------------------------
// BUILD HISTORY RECORD
// --------------------------------------------------

function buildHistoryRecord(): SavedMatch | null {
  if (!state) return null;

  const now = Date.now();
  const createdAt = legStartAt ?? now;
  const finishedFlag = !!state.winnerId || !!(state as any).forcedFinished;

  const playersLite = state.players.map((p) => {
    const prof = profileById.get(p.id);
    const pDartSetId =
      (prof as any)?.dartSetId ?? (prof as any)?.favoriteDartSetId ?? dartSetId ?? null;
    return {
      id: p.id,
      name: p.name,
      avatarDataUrl: prof?.avatarDataUrl ?? null,
      dartSetId: pDartSetId,
      temporaryPlayerId: isQuickParty ? p.id : undefined,
      isTemporary: isQuickParty,
      profileId: isQuickParty ? null : p.id,
    };
  });

const playersPayload = state.players.map((p: any) => {
    const pid = String(p.id);
    const stateHits = extractHitsForPlayerFromState(state, pid);
    const recorderHits = (cricketRecorder.eventsRef.current || [])
      .filter((ev: any) => String(ev?.playerId ?? ev?.profileId ?? "") === pid)
      .map((ev: any) => toHitStringFromObj(ev))
      .filter(Boolean) as string[];
    // Source prioritaire : le recorder Cricket est alimenté à chaque fléchette.
    // L'ancien state ne conservait pas toujours p.hits/history, ce qui faisait
    // disparaître S/D/T au moment de sauver la partie. On garde la source la plus riche.
    const hits = recorderHits.length > stateHits.length ? recorderHits : stateHits;
    const prof = profileById.get(pid);
    const pDartSetId =
      (prof as any)?.dartSetId ?? (prof as any)?.favoriteDartSetId ?? dartSetId ?? null;

    const legStats = computeLegStatsForPlayer(p);
    const hitSummary = summarizeCricketHitStrings(Array.isArray(hits) ? hits : []);
    const marksObj = p.marks && typeof p.marks === "object" ? p.marks : null;
    const marksTotal = Number(legStats?.totalMarks ?? 0) || Number(hitSummary?.marks ?? 0) || (marksObj
      ? Object.values(marksObj).reduce((a: any, b: any) => (Number(a) || 0) + (Number(b) || 0), 0)
      : 0);
    const closedSegments = marksObj
      ? Object.values(marksObj).filter((v: any) => Number(v || 0) >= 3).length
      : 0;

    return {
      profileId: pid,
      id: pid,
      name: p.name,
      score: p.score,
      marks: p.marks,
      marksTotal,
      hits,
      hitSummary,
      cricketStats: {
        totalMarks: marksTotal,
        totalPoints: Number(p.score ?? legStats?.totalPoints ?? 0) || 0,
        darts: Array.isArray(hits) ? hits.length : Number(legStats?.darts ?? 0) || 0,
        hitCount: Array.isArray(hits) ? hits.filter((h: any) => String(h || '').toUpperCase() !== "MISS").length : 0,
        mpr: Number(legStats?.mpr ?? 0) || 0,
        hitRate: Number(legStats?.hitRate ?? 0) || 0,
        bestVisitMarks: Math.max(Number(legStats?.bestVisitMarks ?? 0) || 0, Number(hitSummary?.bestVisitMarks ?? 0) || 0),
        closedSegments,
        byNumber: hitSummary.byNumber,
        byRing: hitSummary.byRing,
        cutThroatDamage: Number(legStats?.totalInflictedPoints ?? 0) || 0,
      },
      darts: Array.isArray(hits) ? hits.length : 0,
      hitCount: Array.isArray(hits) ? hits.filter((h: any) => h && String(h).toUpperCase() !== "MISS").length : 0,
      legStats,
      dartSetId: pDartSetId,
    };
  });

const totalDarts = playersPayload.reduce((a, p) => a + p.hits.length, 0);

    const dartSetIdsByPlayer: Record<string, string | null> = Object.fromEntries(
    (playersPayload || []).map((p: any) => [String(p.id ?? p.profileId ?? ""), (p as any)?.dartSetId ?? null])
  );

return {
    id: matchIdRef.current,
    kind: "cricket",
    quickParty: isQuickParty,
    partyMode: isQuickParty ? "quick" : "arcade",
    profileStatsDeferred: isQuickParty,
    temporaryParticipants: isQuickParty,
    // Garder la variante dans le HEADER léger History. Sans ceci, listFinished()
    // ne voit que kind=cricket car payload est stocké séparément/compressé.
    variantId,
    scoringVariant,
    cutThroat: isCutThroatRoute,
    status: finishedFlag ? "finished" : "in_progress",
    players: playersLite,
    winnerId: state.winnerId ?? null,
    createdAt,
    updatedAt: now,
    summary: {
      legs: 1,
      darts: totalDarts,
      mode: "cricket",
      quickParty: isQuickParty,
      partyMode: isQuickParty ? "quick" : "arcade",
      variantId,
      scoringVariant,
      cutThroat: isCutThroatRoute,
    },
    payload: {
      mode: "cricket",
      quickParty: isQuickParty,
      partyMode: isQuickParty ? "quick" : "arcade",
      profileStatsDeferred: isQuickParty,
      temporaryParticipants: isQuickParty,
      quickPlayers: isQuickParty ? (params?.quickPlayers || []) : undefined,
      dartSetId,
      dartSetIdsByPlayer,
      meta: { ...(params?.meta || {}), dartSetId, dartSetIdsByPlayer },
	      // ✅ Stats unifiées (léger) — utilisées par StatsHub si présent
	      stats: {
	        sport: "cricket",
	        mode: "cricket",
	        players: (playersPayload || []).map((p: any) => {
	          const hitsArr = Array.isArray(p?.hits) ? p.hits : [];
	          const marksObj = p?.marks && typeof p.marks === "object" ? p.marks : null;
	          const marksTotal = marksObj ? Object.values(marksObj).reduce((a: any, b: any) => (Number(a) || 0) + (Number(b) || 0), 0) : 0;
	          return {
	            id: String(p?.id ?? p?.profileId ?? ""),
	            name: String(p?.name ?? ""),
	            win: state?.winnerId ? String(p?.id ?? p?.profileId) === String(state.winnerId) : false,
	            score: Number(p?.score ?? 0) || 0,
            hits: hitsArr,
            hitSummary: (p as any)?.hitSummary ?? summarizeCricketHitStrings(hitsArr),
            cricketStats: (p as any)?.cricketStats ?? null,
            hitCount: hitsArr.filter((h: any) => h && String(h).toUpperCase() !== "MISS").length,
            marks: marksObj ?? {},
            marksTotal: Number(marksTotal) || 0,
            darts: {
              thrown: hitsArr.length,
              hits: hitsArr.filter((h: any) => h && String(h).toUpperCase() !== "MISS").length,
              misses: hitsArr.filter((h: any) => !h || String(h).toUpperCase() === "MISS").length,
            },
            special: {
              marksTotal: Number(marksTotal) || 0,
              cricketStats: (p as any)?.cricketStats ?? null,
              hitSummary: (p as any)?.hitSummary ?? summarizeCricketHitStrings(hitsArr),
            },
	          };
	        }),
	        global: {
	          duration: Math.max(0, now - Number(createdAt || now)),
	          legs: 1,
	        },
	      },
      variantId,
      scoringVariant,
      withPoints: scoreMode === "points",
      cutThroat: isCutThroatRoute,
      maxRounds,
      rotateFirstPlayer,
      randomStart,
      teamMode,
      fillWithBots,
      roundNumber: (state as any).roundNumber,
      forcedFinished: !!(state as any).forcedFinished,
      players: playersPayload,
      // Journal complet fléchette par fléchette.
      // IMPORTANT: ne pas tronquer ici. Le compacteur sait réduire proprement si besoin,
      // mais la sauvegarde complète doit garder assez d'information pour reconstruire
      // les futures stats Cricket (S/D/T, MISS, Bull/DBull, best visit, etc.).
      cricketEvents: cricketRecorder.eventsRef.current.slice(),
      cricketDartLog: cricketRecorder.eventsRef.current.slice(),
    },
  };
}

  function handleSaveAndQuit() {
    const finishedFlag = isFinished || !!(state as any)?.forcedFinished;
    if (finishedFlag && onFinish) {
      const rec = buildHistoryRecord();
      if (rec) onFinish(rec);
    }
    handleQuitInternal();
  }

  function handleSaveAndReplay() {
    const finishedFlag = isFinished || !!(state as any)?.forcedFinished;
    if (finishedFlag && onFinish) {
      const rec = buildHistoryRecord();
      if (rec) onFinish(rec);
    }
    handleNewLegInternal();
  }

  // ✅ Ticker: descendre légèrement + ajuster le cadrage selon variante
 const TICKER_Y_OFFSET_PX = 8; // ← monte/descend le header (8 = descend un peu)

 const tickerObjectPosition =
  variantId === "cut_throat"
    ? "center 20%" // ajuste si besoin
    : variantId === "enculette"
    ? "center 58%"
    : "center 55%";

  // --------------------------------------------------
  // PHASE SETUP RENDER
  // --------------------------------------------------

  if (phase === "setup") {
    const selectionOrder = [...selectedIds, ...selectedBotIds].slice(0, cricketSelectionLimit);

    const labelForId = (id: string) => {
      const idx = selectionOrder.indexOf(id);
      return idx === -1 ? null : `J${idx + 1}`;
    };

    const selectedCountLocal = selectedIds.length + selectedBotIds.length;

    const canStartBaseLocal = selectedCountLocal >= 2 && selectedCountLocal <= cricketMaxParticipants && (!cricketRuleData.pick || pickItNumbers.length===6);
    const wantsTeamLocal = teamMode;
    const teamNeedsBotLocal = wantsTeamLocal && selectedCountLocal === 3 && fillWithBots;
    const teamValidCountLocal = wantsTeamLocal ? selectedCountLocal === 4 || teamNeedsBotLocal : true;
    const cricketFormatValidLocal = teamMode || isQuickParty || (mssCricketFormat === "duel" ? selectedCountLocal === 2 : selectedCountLocal >= 3);
    const canStartLocal = canStartBaseLocal && teamValidCountLocal && cricketFormatValidLocal;

    const ArrowBtn = ({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) => (
      <button
        type="button"
        onClick={onClick}
        style={{
          position: "absolute",
          [dir === "left" ? "left" : "right"]: -4,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          background: "rgba(0,0,0,0.6)",
          border: `1px solid ${T.borderSoft}`,
          color: T.gold,
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 0 10px rgba(0,0,0,0.7)",
        }}
      >
        {dir === "left" ? "‹" : "›"}
      </button>
    );

    const ChipMini = ({ active, label }: { active: boolean; label: string }) => (
      <div
        style={{
          marginTop: 2,
          padding: "2px 8px",
          borderRadius: 999,
          background: active ? "rgba(246,194,86,0.2)" : "rgba(255,255,255,0.07)",
          color: active ? T.gold : T.textSoft,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    );

    return (
      <React.Fragment>
      <div
        className="page cricket-config-setup"
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
          color: T.text,
          padding: "0 12px 80px",
          boxSizing: "border-box",
        }}
      >

	    	{/* HEADER TICKER full-width (remplace titre + annotation) */}
        <div
  style={{
    position: "sticky",
    top: 0,
    zIndex: 60,
    // ✅ descend le ticker (safe-area + offset)
    paddingTop: `calc(env(safe-area-inset-top) + ${TICKER_Y_OFFSET_PX}px)`,
    marginBottom: 16,
  }}
>
  <div
    style={{
      position: "relative",
      // full-bleed (annule le padding horizontal de la page)
      marginLeft: -12,
      marginRight: -12,
    }}
  >
    <img
      src={cricketVariantTicker}
      alt={`Configuration · ${cricketRuleData.label}`}
      draggable={false}
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: "800 / 230",
        objectFit: "contain",
        // ✅ si le titre du ticker est “coupé”, ajuste ce % (plus grand = montre plus bas)
        objectPosition: tickerObjectPosition,
        display: "block",
      }}
    />


    {/* Overlay boutons */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <BackDot
          onClick={() => {
            // Use the router callback provided by App: the old global lookup
            // was missing on several screens and made BackDot inert.
            if (typeof go === "function") {
              if (phase === "setup") go("cricket", { variantId: params?.variantId || undefined });
              else go("cricket", { ...params, launchMode: "arcade" });
              return;
            }
            window.history.back();
          }}
          color={T.gold}
          glow={"rgba(246,194,86,0.55)"}
          title="Retour"
        />
      </div>

      <div style={{ pointerEvents: "auto" }}>
        <InfoDot
          onClick={() => setInfoOpen(true)}
          color={T.gold}
          glow={"rgba(246,194,86,0.55)"}
          title="Règles"
        />
      </div>
    </div>
  </div>
</div>

        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <MssClassicConfigFlow
            title="Cricket"
            steps={cricketSteps}
            step={mssCricketStep} view={mssCricketView} accent={T.gold} progressiveSingleLine
            summary={`${selectedCountLocal} joueurs · ${teamMode ? "2 équipes" : "individuel"}`}
            onStep={setMssCricketStep} onView={setMssCricketView}
            onHelp={() => setInfoOpen(true)}
          />
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Awena vous explique")) && <>
            <MssClassicOverview title="CRICKET · AWENA VOUS EXPLIQUE"
              description={isExtendedCricket ? "TACTICS : ferme 15 à 20, DOUBLE, TRIPLE et BULL (trois marques chacun)." : isNoScoreRoute ? "CRICKET SANS POINTS : ferme les sept cibles. Le score ne compte pas, seule la fermeture décide du classement." : cricketRuleData.description}
              accent={T.gold} onHelp={() => setInfoOpen(true)} />
            <DartsRelatedModesPanel gameId={isExtendedCricket ? "cricket_tactics" : variantId === "cut_throat" ? "cricket_cut_throat" : (params?.gameId || "cricket")}
              accent={T.gold} compact onOpenGame={id => { const target=dartsFamilyGameNavigation(id); if(target) go?.(target.tab,target.params); }} />
          </>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Joueurs ou équipes")) && <SectionCard title="JOUEURS / ÉQUIPES">
            <MssKillerParticipantMode mode={teamMode ? "teams" : "players"} accent={T.gold} onChange={v=>{setTeamMode(v==="teams"); if(v==="teams"){setSelectedIds(prev=>prev.slice(0,4));setSelectedBotIds([]);} else if(mssCricketFormat==="duel" && !isQuickParty){const keep=[...selectedIds.map(id=>({id,bot:false})),...selectedBotIds.map(id=>({id,bot:true}))].slice(0,2);setSelectedIds(keep.filter(p=>!p.bot).map(p=>p.id));setSelectedBotIds(keep.filter(p=>p.bot).map(p=>p.id));}}} />
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Format")) && <SectionCard title="FORMAT">
            <MssKillerFormat mode={teamMode ? "teams" : "players"} playerFormat={mssCricketFormat}
              onPlayerFormat={changeCricketFormat} teamCount={2} onTeamCount={()=>{}} teamSize={2}
              onTeamSize={()=>{}} accent={T.gold} maxPlayers={cricketMaxParticipants > 4 ? 999 : 4} unlimitedPlayers={cricketMaxParticipants > 4} />
            {teamMode && <div style={{textAlign:"center",fontSize:12,color:T.textSoft,marginTop:12}}>Format du moteur CRICKET : deux équipes de deux participants (2v2).</div>}
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Sélection")) && <SectionCard title={teamMode ? "CHOIX ÉQUIPES" : "CHOIX JOUEURS"}>
            <p style={{fontSize:12,color:T.textSoft,lineHeight:1.45,margin:"0 0 10px"}}>
              {teamMode ? "Choisis quatre participants. Équipes J1+J3 contre J2+J4." : cricketMaxParticipants > 4 ? "Nombre de joueurs illimité : ajoute les profils et bots nécessaires." : mssCricketFormat === "duel" ? "DUEL : sélectionne exactement deux joueurs ou bots." : "MULTI : sélectionne trois ou quatre joueurs ou bots."}
            </p>
            <MssKillerPlayersShared
              usageMode="cricket"
              profiles={allProfiles.filter((p:any)=>!p?.isBot)}
              bots={botProfiles}
              selectedIds={[...selectedIds, ...selectedBotIds]}
              onToggle={(id:string) => {
                if (String(id).startsWith("mss-bot-") || botProfiles.some((b:any) => String(b.id) === String(id))) toggleBot(id);
                else toggleProfile(id);
              }}
              accent={T.gold}
              maxSelection={cricketSelectionLimit}
              onCreateProfile={(profile:any) => {
                setCricketCreatedProfiles(prev => [...prev, profile]);
              }}
              onCreateBot={(bot:any) => {
                setCricketCreatedBots(prev => [...prev, { ...bot, isBot: true }]);
              }}
            />
            <div style={{marginTop:9,textAlign:"center",fontSize:12,color:selectedCountLocal>=2?T.gold:"#ff929b"}}>
              {teamMode ? `Sélection : ${selectedCountLocal}/4 participants · ÉQUIPES` : mssCricketFormat === "duel" ? "Sélectionne 2 participants" : `Sélection : ${selectedCountLocal} participants · MULTI (minimum 3)`}
            </div>
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Règles de la variante")) && cricketRuleData.pick && <SectionCard title="CIBLES · PICK-IT">
            <p style={{fontSize:12,color:T.textSoft}}>Sélectionne exactement six numéros de 1 à 20. Le BULL est ajouté automatiquement.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:7}}>{Array.from({length:20},(_,i)=>i+1).map(n=><button key={n} type="button" aria-pressed={pickItNumbers.includes(n)} onClick={()=>setPickItNumbers(prev=>prev.includes(n) ? prev.filter(k=>k!==n) : prev.length<6 ? [...prev,n] : prev)} style={{minHeight:40,borderRadius:10,border:`1px solid ${pickItNumbers.includes(n)?T.gold:'#ffffff36'}`,background:pickItNumbers.includes(n)?'#f6c25624':'#ffffff08',color:pickItNumbers.includes(n)?T.gold:'#fff',fontWeight:900}}>{n}</button>)}</div>
            <div style={{textAlign:'center',fontSize:12,color:T.gold}}>{pickItNumbers.length}/6 numéros sélectionnés</div>
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Règles de la variante")) && cricketRuleData.doubleOnly && <SectionCard title="MASTER · VALIDATION">
            <MssKillerBooleanToggle label="AUTORISER AUSSI LES TRIPLES" checked={masterAllowsTriples} accent={T.gold} onChange={setMasterAllowsTriples} />
            <p style={{fontSize:12,color:T.textSoft}}>Doubles obligatoires par défaut. Lorsque l'option est activée, les triples comptent aussi. Chaque impact valide une marque.</p>
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Règles de la variante")) && (cricketRuleData.random || cricketRuleData.hidden) && <SectionCard title="CIBLES ALÉATOIRES">
            <p style={{fontSize:12,color:T.textSoft}}>{cricketRuleData.hidden ? 'Les six numéros secrets sont tirés au lancement et révélés quand un joueur les touche.' : 'Six numéros sont tirés au lancement, plus BULL.'}</p>
          </SectionCard>}
          {hasVariantRulesStep && (mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Règles de la variante")) && <SectionCard title={`RÈGLES · ${isNoScoreRoute ? "SANS POINTS" : cricketRuleData.label}`}>
            <p style={{fontSize:13,color:T.textSoft,lineHeight:1.55,margin:"0 0 8px"}}>{isNoScoreRoute ? "Sans points : le premier à fermer toutes les cibles remporte la partie." : cricketRuleData.description}</p>
            {cricketRuleData.extended && <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:10}}>
              {(["DOUBLE", "TRIPLE", "BULL", ...(cricketRuleData.sameBed ? ["3 DANS UN LIT"] : [])]).map(item=><div key={item} style={{border:`1px solid ${T.gold}55`,borderRadius:12,padding:"10px 3px",textAlign:"center",color:item==="DOUBLE"?"#29caff":item==="TRIPLE"?"#ee5de9":T.gold,fontWeight:900,fontSize:11}}>{item}</div>)}
            </div>}
            {cricketRuleData.exclusiveSpecial && <p style={{color:T.textSoft,fontSize:12,lineHeight:1.5}}>WILD MOUSE : chaque impact valide une seule condition, à choisir lors du lancer. Il n'est jamais compté deux fois.</p>}
            {cricketRuleData.wildCard && <p style={{color:T.textSoft,fontSize:12}}>JOKER : la cible bonus évolue à chaque manche et accorde une marque supplémentaire.</p>}
            {cricketRuleData.suddenDeath != null && <div style={{color:T.gold,fontWeight:900,textAlign:"center",marginTop:8}}>ÉLIMINATION : {cricketRuleData.suddenDeath} POINTS DE RETARD</div>}
            {cricketRuleData.maxRounds != null && <p style={{color:T.gold,fontWeight:900,textAlign:"center"}}>LIMITE : {cricketRuleData.maxRounds} VOLÉES</p>}
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Scoring")) && <SectionCard title="MODE DE SCORING">
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
              {([['points','AVEC POINTS'],['no-points','SANS POINTS']] as const).map(([id,label])=><button key={id} type="button" disabled={((isCutThroatRoute||variantId==='cut_throat'||cricketRule==='sudden_death')&&id==='no-points') || (isNoScoreRoute&&id==='points')} aria-pressed={scoreMode===id} onClick={()=>setScoreMode(id)} style={{minHeight:70,borderRadius:15,border:`1px solid ${scoreMode===id?T.gold:'#ffffff30'}`,background:scoreMode===id?'#f6c25622':'#ffffff08',color:scoreMode===id?T.gold:'#fff',fontWeight:900,opacity:(((isCutThroatRoute||variantId==='cut_throat'||cricketRule==='sudden_death')&&id==='no-points')||(isNoScoreRoute&&id==='points'))?.35:1}}>{label}</button>)}
            </div>
            <p style={{color:T.textSoft,fontSize:12,textAlign:'center',lineHeight:1.5}}>{isNoScoreRoute?'Cricket sans points : la victoire dépend uniquement de la fermeture des objectifs.':(isCutThroatRoute||variantId==='cut_throat')?'Cut-Throat impose le calcul des points.':scoreMode==='points'?'Les secteurs fermés peuvent rapporter des points tant qu’ils restent ouverts chez un adversaire.':'La victoire repose sur la fermeture des secteurs, sans comptabiliser de points.'}</p>
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Volées")) && <SectionCard title={cricketRule === "quickie" ? "QUICKIE · 10 VOLÉES DE 3 FLÉCHETTES" : "VOLÉES DE 3 FLÉCHETTES"}>
            <div style={{display:'flex',justifyContent:'center',gap:12}}>{(cricketRule === "quickie" ? [10] : [0,10,15,20]).map(n=><button key={n} type="button" aria-pressed={maxRounds===n} onClick={()=>{setMaxRounds(n);if(n>0)setContinueToLast(false);}} style={{width:62,height:55,borderRadius:15,border:`1px solid ${maxRounds===n?T.gold:'#ffffff30'}`,background:maxRounds===n?'#f6c25622':'#ffffff08',color:maxRounds===n?T.gold:'#fff',fontWeight:950,fontSize:17}}>{n===0?"∞":n}</button>)}</div>
            <p style={{textAlign:"center",color:T.textSoft,fontSize:12}}> {cricketRule === "quickie" ? "QUICKIE conserve sa limite de 10 volées." : maxRounds===0 ? "Sans limite : jouer jusqu’à la condition de victoire." : `Arrêt après ${maxRounds} volées de 3 fléchettes par joueur.`}</p>
            {cricketRule !== "quickie" && !teamMode && variantId !== "enculette" && <MssKillerBooleanToggle label="CONTINUER JUSQU’AU DERNIER JOUEUR" checked={continueToLast} accent={T.gold} onChange={(enabled: boolean)=>{setContinueToLast(enabled);if(enabled)setMaxRounds(0);}} />}
            {continueToLast && cricketRule !== "quickie" && !teamMode && variantId !== "enculette" && <p style={{textAlign:"center",color:T.textSoft,fontSize:12}}>Les joueurs qui terminent quittent la rotation. Le classement se complète jusqu’au dernier.</p>}
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Départ")) && <SectionCard title="ORDRE DE DÉPART">
            <div style={{display:'grid',gap:12,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:10,flexWrap:'nowrap'}}>
                {cricketOrderOptions.map(option=><MssSelectorIconButton key={option.id} icon={option.icon} label={option.label} accent={T.gold} active={startOrderMode===option.id} onClick={()=>changeStartOrderMode(option.id)}/>)}
              </div>
              {(()=>{const option=cricketOrderOptions.find(item=>item.id===startOrderMode)!;return <div style={{display:'grid',gap:5,textAlign:'center'}}><strong style={{color:T.gold,fontSize:16,fontWeight:950}}>{option.label}</strong><p style={{color:T.textSoft,fontSize:12,lineHeight:1.5,margin:0}}>{option.detail}</p></div>})()}
              {(startOrderMode==='manual'||startOrderMode==='bull') && <div style={{display:'grid',gap:7,maxWidth:380,width:'100%',margin:'0 auto'}}>
                {resolvedStartIds.map((id,index)=>{const player=profileById.get(id);return <div key={id} style={{display:'flex',alignItems:'center',gap:9,padding:'6px 9px',border:`1px solid ${T.gold}55`,borderRadius:12,background:'rgba(255,255,255,.035)'}}>
                  <strong style={{color:T.gold,width:18}}>{index+1}</strong><ProfileAvatar profile={player as any} size={30}/><span style={{flex:1,fontWeight:850,fontSize:12,overflowWrap:'anywhere'}}>{(player as any)?.name||'Participant'}</span>
                  <button type="button" aria-label={`Monter ${(player as any)?.name||'participant'}`} disabled={index===0} onClick={()=>moveStartParticipant(id,-1)} style={{border:`1px solid ${T.gold}66`,borderRadius:9,background:'#ffffff09',color:T.gold,minWidth:32,minHeight:32,opacity:index===0?.35:1}}>↑</button>
                  <button type="button" aria-label={`Descendre ${(player as any)?.name||'participant'}`} disabled={index===resolvedStartIds.length-1} onClick={()=>moveStartParticipant(id,1)} style={{border:`1px solid ${T.gold}66`,borderRadius:9,background:'#ffffff09',color:T.gold,minWidth:32,minHeight:32,opacity:index===resolvedStartIds.length-1?.35:1}}>↓</button>
                </div>})}
                {resolvedStartIds.length<2 && <p style={{textAlign:'center',color:T.textSoft,fontSize:12}}>Sélectionne d’abord tes participants.</p>}
              </div>}
              <MssKillerBooleanToggle label="ALTERNANCE DU PREMIER JOUEUR" checked={rotateFirstPlayer} accent={T.gold} onChange={setRotateFirstPlayer} />
              {teamMode && <MssKillerBooleanToggle label="COMPLÉTER L’ÉQUIPE AVEC UN BOT" checked={fillWithBots} accent={T.gold} onChange={setFillWithBots} />}
            </div>
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Saisie")) && <SectionCard title="MODE DE SAISIE">
            <div style={{display:"grid",gap:12,minWidth:0}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:6,maxWidth:340,width:'100%',margin:'0 auto',minWidth:0}}>
                {(['keypad','dartboard','voice','camera','autodarts'] as const).map(method=><div key={method} style={{display:'grid',placeItems:'center'}}>
                  <MssInputMethodChoice icon={method} label={method.toUpperCase()} active={inputMethod===method} accent={T.gold}
                    disabled={method!=='keypad'&&method!=='dartboard'} onClick={()=>setInputMethod(method as InputMethod)}/>
                </div>)}
              </div>
              <div style={{fontSize:12,color:T.gold,fontWeight:900,textAlign:'center'}}>{inputMethod==='keypad'?'KEYPAD':'CIBLE'}</div>
              <p style={{margin:0,fontSize:12,color:T.textSoft,textAlign:"center",lineHeight:1.5}}>Les options indisponibles restent désactivées. Les couleurs et icônes sont celles du sélecteur commun MSS.</p>
            </div>
          </SectionCard>}
          {(mssCricketView === "complete" || mssCricketStep === cricketStepIndex("Récapitulatif")) && <SectionCard title="RÉCAPITULATIF">
            {/* Structure et densité identiques à la fiche premium KILLER. */}
            <div style={{border:`1px solid ${T.gold}55`,borderRadius:16,background:"linear-gradient(155deg,rgba(25,26,37,.9),rgba(9,11,21,.94))",padding:"12px 12px 10px",display:"grid",gap:12,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <div style={{display:"grid",gap:2,minWidth:0}}>
                  <strong style={{fontSize:14,fontWeight:1000,letterSpacing:.65,color:T.gold}}>FICHE DE PARTIE</strong>
                  <span style={{color:"#afb8cb",fontSize:11}}>{teamMode ? "2 équipes · 2 membres / équipe" : `${selectedCountLocal} joueurs · ${mssCricketFormat === "duel" ? "Duel" : "Multi"}`}</span>
                </div>
                <span role="status" style={{border:`1px solid ${canStartLocal?T.gold:"#fb7185"}55`,borderRadius:20,padding:"5px 9px",fontWeight:950,fontSize:10,whiteSpace:"nowrap",color:canStartLocal?T.gold:"#fb7185"}}>{canStartLocal?"✓ PRÊT":"À COMPLÉTER"}</span>
              </div>
              <div style={{borderTop:"1px solid rgba(255,255,255,.09)",paddingTop:9}}>
                <MssConfigCaption accent={T.gold}>{teamMode?"ÉQUIPES EN JEU":"JOUEURS EN JEU"}</MssConfigCaption>
                {teamMode ? <div style={{display:"grid",gap:6}}>{[0,1].map((teamIndex)=><div key={teamIndex} style={{borderLeft:`2px solid ${teamIndex===0?"#f6c256":"#f472b6"}`,borderRadius:10,background:"rgba(255,255,255,.025)",padding:"7px 9px",display:"grid",gap:5}}><strong style={{fontSize:12,color:teamIndex===0?"#f6c256":"#f472b6"}}>ÉQUIPE {teamIndex+1}</strong><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{selectionOrder.filter((_,i)=>i%2===teamIndex).map(id=>{const player=allProfiles.find((p:any)=>p.id===id)||botProfiles.find((p:any)=>p.id===id);return <div key={id} style={{display:"flex",gap:6,alignItems:"center",minWidth:0}}><ProfileAvatar profile={player as any} size={28}/><span style={{fontSize:11,fontWeight:800}}>{(player as any)?.name||id}</span></div>})}</div></div>)}</div> : <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:6}}>{selectionOrder.map((id,i)=>{const player=allProfiles.find((p:any)=>p.id===id)||botProfiles.find((p:any)=>p.id===id);return <div key={id} style={{display:"flex",alignItems:"center",minWidth:0,gap:7,padding:5}}><ProfileAvatar profile={player as any} size={29}/><span style={{fontSize:11,fontWeight:850,overflowWrap:"anywhere"}}>{(player as any)?.name||`J${i+1}`}</span></div>})}</div>}
              </div>
              <div style={{borderTop:"1px solid rgba(255,255,255,.09)",paddingTop:8}}>
                <MssConfigCaption accent={T.gold}>RÈGLES ESSENTIELLES</MssConfigCaption>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",columnGap:13}}>
                  <MssConfigFact label="Format" value={teamMode?"2 équipes · 2v2":mssCricketFormat==="duel"?"DUEL":"MULTI"}/>
                  <MssConfigFact label="Variante" value={isNoScoreRoute?"Sans points":variantId==="classic"?"Classique":variantId==="cut_throat"?"Cut-Throat":isExtendedCricket?"Tactics":cricketRuleData.label}/>
                  <MssConfigFact label="Scoring" value={scoreMode==="points"?"Avec points":"Sans points"}/>
                  <MssConfigFact label="Volées max" value={cricketRule==="quickie"?"10":maxRounds===0?"Sans limite":String(maxRounds)}/>
                  <MssConfigFact label="Départ" value={cricketOrderOptions.find(option=>option.id===startOrderMode)?.label||"Alterné"}/>
                  <MssConfigFact label="Rotation" value={rotateFirstPlayer?"ON":"OFF"}/>
                  <MssConfigFact label="Classement" value={continueToLast && !teamMode && variantId!=="enculette"?"Jusqu’au dernier":"1er gagnant"}/>
                </div>
              </div>
              <div style={{borderTop:"1px solid rgba(255,255,255,.09)",paddingTop:8}}>
                <MssConfigCaption accent={T.gold}>SAISIE ET AUDIO</MssConfigCaption>
                <MssConfigFact label="Saisie" value={inputMethod==="dartboard"?"CIBLE":"KEYPAD"}/>
                <MssConfigFact label="Audio" value="Réglages globaux"/>
              </div>
            </div>
            <button type="button" disabled={!canStartLocal} onClick={handleStartMatch} style={{width:"100%",marginTop:14,border:"none",borderRadius:999,padding:"14px 18px",background:canStartLocal?T.gold:"#555b67",color:canStartLocal?"#1a1408":"#eee",fontWeight:1000,fontSize:15,cursor:canStartLocal?"pointer":"not-allowed"}}>LANCER LE CRICKET</button>
            {!canStartLocal&&<p style={{margin:"8px 0 0",fontSize:11,color:"#ff9c9c",textAlign:"center"}}>{!teamMode&&mssCricketFormat==="duel"?"Le DUEL nécessite exactement 2 participants.":!teamMode&&mssCricketFormat==="multi"?"Le MULTI nécessite au moins 3 participants.":"Sélectionne les participants nécessaires avant de lancer."}</p>}
          </SectionCard>}
          {mssCricketView === "guided" && mssCricketStep > 0 && <MssCricketAwenaTip step={mssCricketStep} stepName={cricketSteps[mssCricketStep]} variant={isNoScoreRoute ? "no_score" : cricketRule} />}
        </div>

	        {/* INFO (Règles) */}
	        {infoOpen && (
	          <div
	            onClick={() => setInfoOpen(false)}
	            style={{
	              position: "fixed",
	              inset: 0,
	              zIndex: 99999,
	              background: "rgba(0,0,0,0.62)",
	              display: "flex",
	              alignItems: "center",
	              justifyContent: "center",
	              padding: 16,
	            }}
	          >
	            <div
	              onClick={(e) => e.stopPropagation()}
	              style={{
	                width: "min(520px, 92vw)",
	                borderRadius: 18,
	                border: `1px solid ${T.borderSoft}`,
	                background: "rgba(10,12,20,0.96)",
	                boxShadow: "0 18px 40px rgba(0,0,0,0.65)",
	                padding: 14,
	              }}
	            >
	              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
	                <div style={{ fontSize: 14, fontWeight: 1000, letterSpacing: 1.2, color: T.gold, textTransform: "uppercase" }}>
	                  Règles — Cricket
	                </div>
	                <button
	                  type="button"
	                  onClick={() => setInfoOpen(false)}
	                  style={{
	                    border: "none",
	                    background: "rgba(255,255,255,0.08)",
	                    color: "#fff",
	                    borderRadius: 999,
	                    padding: "6px 10px",
	                    fontWeight: 900,
	                    cursor: "pointer",
	                  }}
	                >
	                  OK
	                </button>
	              </div>

	              <div style={{ marginTop: 10, fontSize: 12, color: T.textSoft, lineHeight: 1.45 }}>
	                <div style={{ marginBottom: 8 }}>
	                  Cibles : <strong>15–20</strong> + <strong>Bull</strong>.
	                </div>
	                <ul style={{ margin: 0, paddingLeft: 18 }}>
	                  <li>
	                    Chaque hit ajoute des <strong>marks</strong> (simple=1, double=2, triple=3). À <strong>3 marks</strong>, la cible est
	                    <strong> fermée</strong>.
	                  </li>
	                  <li>
	                    En mode <strong>Points</strong> : si tu marques sur une cible déjà fermée par toi mais pas par l’adversaire, tu ajoutes des
	                    points.
	                  </li>
	                  <li>
	                    Victoire : tu fermes toutes les cibles <strong>et</strong> tu as au moins autant de points que l’adversaire (si mode Points).
	                  </li>
	                  <li>
	                    Variante <strong>Enculette / Vache</strong> : même principe, mais les cibles changent (selon le mode choisi).
	                  </li>
	                </ul>
	              </div>
	            </div>
	          </div>
	        )}
      </div>
      </React.Fragment>
    );
  }

  // --------------------------------------------------
  // PHASE PLAY
  // --------------------------------------------------

  if (!state || !currentPlayer) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
          color: T.text,
          padding: "0 12px 80px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Configuration manquante</div>
          <div style={{ fontSize: 14, color: T.textSoft, marginBottom: 16 }}>
            Retourne à l&apos;écran de préparation pour lancer une partie de Cricket.
          </div>
          <button
            type="button"
            onClick={() => {
              setState(null);
              setPhase("setup");
            }}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "none",
              background: T.gold,
              color: "#3A2300",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Revenir au setup
          </button>
        </div>
      </div>
    );
  }

  const totalDartsPerTurn = 3;
  const thrown = Math.max(0, Math.min(totalDartsPerTurn, totalDartsPerTurn - state.remainingDarts));

  const activePlayerIndex = state.players.findIndex((p) => p.id === currentPlayer.id);
  const activeAccent = ACCENTS[activePlayerIndex >= 0 ? activePlayerIndex : 0];

  const playerCardColors = ["#1f2937", "#2d1b2f", "#052e16", "#082f49"];

  function MarkCell({ marks, playerIndex, isActive }: { marks: number; playerIndex: number; isActive: boolean }) {
    const accent = ACCENTS[playerIndex % ACCENTS.length];
    const hasMarks = marks > 0;
    const isClosed = marks >= 3;

    const darkerAccent = darkenColor(accent, 0.55);

    const background = isClosed ? accent : "rgba(15,23,42,0.95)";
    const borderColor = isClosed
      ? darkerAccent
      : hasMarks
      ? "rgba(148,163,184,0.9)"
      : "rgba(51,65,85,0.9)";

    const boxShadow = isClosed
      ? `0 0 18px ${accent}aa`
      : hasMarks && isActive
      ? `0 0 12px ${accent}99`
      : "none";

    return (
      <div
        style={{
          height: 32,
          borderRadius: 10,
          background,
          border: `1px solid ${borderColor}`,
          boxShadow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px 0",
          transition: "all 0.12s ease",
        }}
      >
        {!hasMarks ? null : isClosed ? (
          <CricketMarkIcon marks={3} color={accent} size={36} glow={isActive} />
        ) : (
          <CricketMarkIcon marks={marks} color={accent} size={28} glow={isActive} />
        )}
      </div>
    );
  }

  const finishedFlag = isFinished || !!(state as any).forcedFinished;

  const winnerName = (() => {
    const wid = state.winnerId;
    if (!wid) return null;
    const p = state.players.find((x) => x.id === wid);
    return p?.name ?? null;
  })();

  const teamWinnerLabel = (() => {
    if (!teamMode || state.players.length !== 4 || !state.winnerId) return null;
    const idsA = [state.players[0].id, state.players[2].id];
    const aWins = idsA.includes(state.winnerId);
    return aWins
      ? `${state.players[0].name} + ${state.players[2].name}`
      : `${state.players[1].name} + ${state.players[3].name}`;
  })();
  const roundDisplay = Math.max(1, clampRoundNumber(state) || 1);
  const boardTargets = (state.targets ?? (state.extended ? CRICKET_EXTENDED_UI_TARGETS : CRICKET_UI_TARGETS)) as CricketTarget[];
  const currentClosedCount = closedCount(currentPlayer, !!state.extended, state.targets);
  const currentProfileData = profileById.get(currentPlayer.id) ?? ({ id: currentPlayer.id, name: currentPlayer.name } as any);
  const cricketInputControls = (<>

<section style={{ marginBottom: 12, borderRadius: 16, border: `1px solid ${activeAccent}44`, background: "linear-gradient(180deg, rgba(11,16,28,.98), rgba(5,8,14,.98))", padding: 10, boxShadow: "0 10px 24px rgba(0,0,0,.26)" }}>
{inputMethod === "dartboard" ? (
  <div style={{ paddingBottom: 10 }}>
    <DartboardClickable
      multiplier={hitMode === "T" ? 3 : hitMode === "D" ? 2 : 1}
      disabled={finishedFlag || botThinking}
      onHit={(seg, mul) => {
        if (finishedFlag || botThinking) return;
        registerHit(seg === 25 ? 25 : seg, mul as any);
      }}
    />
  </div>
) : null}

{/* Pavé MSS compact : seules les cibles de la variante et MISS sont proposées. */}
{inputMethod === "keypad" ? (() => {
  const raw = (state.targets ?? (state.extended ? CRICKET_EXTENDED_UI_TARGETS : CRICKET_UI_TARGETS)) as number[];
  // Hidden Cricket exige l'accès aux vingt secteurs pour découvrir les cibles invisibles.
  const digits = (state.hiddenTargets
    ? Array.from({ length: 20 }, (_, index) => index + 1)
    : raw.filter((target) => target >= 1 && target <= 20))
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((a, b) => b - a);
  const locked = finishedFlag || botThinking;
  const cell: React.CSSProperties = {
    minHeight: 48, borderRadius: 12, border: "1px solid rgba(246,194,86,.43)",
    background: "linear-gradient(180deg,#292114,#100f13)", color: "#f6c256",
    fontWeight: 1000, fontSize: 19, cursor: locked ? "not-allowed" : "pointer",
    opacity: locked ? .45 : 1, touchAction: "manipulation",
  };
  const modButton = (mode: HitMode, label: string, tone: string) => {
    const active = hitMode === mode;
    return <button key={mode} type="button" disabled={locked} aria-pressed={active}
      onClick={() => setHitMode(mode)} style={{ minHeight: 42, borderRadius: 12,
        border: `1px solid ${tone}${active ? "" : "88"}`,
        background: active ? `${tone}42` : `${tone}16`, color: mode === "S" ? "#f2f3f5" : tone,
        fontSize: 12, fontWeight: 1000, cursor: locked ? "not-allowed" : "pointer",
        boxShadow: active ? `0 0 12px ${tone}66` : "none", opacity: locked ? .45 : 1,
      }}>{label}</button>;
  };
  const showModeButtons = !state.doubleOnly || !!state.allowTripleMaster;
  const forcedLabelPrefix = state.doubleOnly ? (hitMode === "T" && state.allowTripleMaster ? "T" : "D") : "";
  return <div aria-label={state.hiddenTargets ? "Keypad complet Hidden Cricket" : "Pavé Cricket compact"} style={{ display: "grid", gap: 8 }}>
    {showModeButtons ? <div style={{ display: "grid", gridTemplateColumns: `repeat(${state.doubleOnly ? 2 : 3},minmax(0,1fr))`, gap: 7 }}>
      {state.doubleOnly ? <>
        {modButton("D", "DOUBLE", "#28bce9")}
        {state.allowTripleMaster ? modButton("T", "TRIPLE", "#d946ef") : null}
      </> : <>
        {modButton("S", "SIMPLE", "#9ca3af")}
        {modButton("D", "DOUBLE", "#28bce9")}
        {modButton("T", "TRIPLE", "#d946ef")}
      </>}
    </div> : null}
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${state.hiddenTargets ? 5 : Math.min(3, Math.max(1, digits.length))},minmax(0,1fr))`, gap: state.hiddenTargets ? 6 : 7 }}>
      {digits.map((value) => <button key={value} type="button" disabled={locked}
        onClick={() => registerHit(value, state.doubleOnly ? (hitMode === "T" && state.allowTripleMaster ? 3 : 2) : undefined)} style={state.hiddenTargets ? { ...cell, minHeight: 48, fontSize: 18, borderRadius: 12 } : cell}>{state.doubleOnly ? `${forcedLabelPrefix}${value}` : value}</button>)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${state.doubleOnly ? 2 : 3},minmax(0,1fr))`, gap: 7 }}>
      {!state.doubleOnly ? <button type="button" disabled={locked} onClick={() => registerHit(25,1)} style={{ ...cell, minHeight: 43, background: "#075b38", border: "1px solid #22c55e", color: "#fff", fontSize: 12 }}>BULL25</button> : null}
      <button type="button" disabled={locked} onClick={() => registerHit(25,2)} style={{ ...cell, minHeight: 43, background: "#9b1c25", border: "1px solid #ef4444", color: "#fff", fontSize: 12 }}>{state.doubleOnly ? "DBULL" : "BULL50"}</button>
      <button type="button" disabled={locked} onClick={() => registerHit(0,1)} style={{ ...cell, minHeight: 43, background: "#bd812d", border: "1px solid #efad46", color: "#422709", fontSize: 12 }}>MISS</button>
    </div>
  </div>;
})() : <div style={{ textAlign: "center", fontSize: 11, color: "#b1bacd", padding: 8 }}>Touche la cible pour enregistrer chaque fléchette, y compris les MISS.</div>}

</section>

{/* BAS : ANNULER / RESUME */}
<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
  <button
    type="button"
    onClick={handleUndo}
    disabled={botThinking}
    style={{
      flex: 1,
      padding: "10px 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,.18)",
      background: "linear-gradient(180deg,#222733,#121620)",
      color: "#d7dce6",
      fontSize: 14,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      cursor: botThinking ? "not-allowed" : "pointer",
      boxShadow: "none",
      opacity: botThinking ? 0.55 : 1,
    }}
  >
    Annuler
  </button>

  <button
    type="button"
    onClick={() => setShowEnd(true)}
    style={{
      flex: 1,
      padding: "10px 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,205,95,.9)",
      background: "linear-gradient(180deg,#f6c256,#e9a824)",
      color: "#211500",
      fontSize: 14,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      cursor: "pointer",
      opacity: botThinking ? 0.55 : 1,
      boxShadow: "0 6px 16px rgba(246,194,86,.16)",
    }}
  >
    {finishedFlag ? "Résumé" : "Valider"}
  </button>
</div>
  </>);

  return (
    <div
      className="mss-cricket-play-root"
      style={{
        minHeight: "100vh",
        maxWidth: "100%",
        overflowX: "clip",
        background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
        color: T.text,
        padding: "12px 10px 80px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .mss-cricket-play-columns { display: block; width: 100%; min-width: 0; }
        .mss-cricket-play-left, .mss-cricket-play-right { min-width: 0; max-width: 100%; }
        .mss-cricket-header-band { display: flex; justify-content: center; align-items: center; }
        .mss-cricket-header-image { max-width: 100%; }
        @media (orientation: landscape) and (min-width: 650px) {
          .mss-cricket-play-root { padding: 6px 8px 10px !important; min-height: 0 !important; overflow-x: clip; width: 100%; max-width: 100%; }
          .mss-cricket-header-band { height: clamp(66px, 15dvh, 112px); width: 100%; max-width: 100%; margin-bottom: 7px !important; box-sizing: border-box; }
          .mss-cricket-header-image { height: 100% !important; width: auto !important; max-width: calc(100% - 115px); aspect-ratio: auto !important; object-fit: contain !important; }
          .mss-cricket-play-columns { display: grid; grid-template-columns: minmax(0,1.12fr) minmax(0,.88fr); column-gap: clamp(5px,1vw,12px); align-items: stretch; }
          .mss-cricket-play-left, .mss-cricket-play-right { display: flex; flex-direction: column; gap: clamp(4px,.7dvh,8px); min-height: 0; width: 100%; }
          .mss-cricket-play-left > *, .mss-cricket-play-right > * { margin-bottom: 0 !important; max-width: 100%; min-width: 0; box-sizing: border-box; }
          .mss-cricket-play-left [data-cricket-shove-card] { flex: 1 0 auto; display: flex; flex-direction: column; min-height: 0; }
          .mss-cricket-play-left [data-cricket-shove-card] > * { flex: 1 1 auto; width: 100%; }
          .mss-cricket-play-left [data-cricket-shove-tools] { flex: 0 0 auto; }
          .mss-cricket-play-left [data-cricket-shove-board-trigger] { flex: 0 0 auto; }
          .mss-cricket-play-right .mss-shove-validated-scroll { min-height: 40px; max-width: 100%; }
          .mss-cricket-play-right section { padding: clamp(4px,.6dvh,8px) !important; }
          .mss-cricket-play-right section button { min-height: 32px; }
          .mss-cricket-play-right [data-cricket-input-controls] { width: 100%; min-width: 0; }
          .mss-cricket-play-right button { min-width: 0; max-width: 100%; }
        }
        @media (orientation: landscape) and (max-height: 530px) and (min-width: 650px) {
          .mss-cricket-header-band { height: clamp(50px,14dvh,70px); }
          .mss-cricket-play-right section button { min-height: 29px !important; }
          .mss-cricket-play-right .mss-shove-validated-case { min-height: 34px; }
          .mss-cricket-play-left [data-cricket-shove-board-trigger] { height: 53px !important; }
        }
      `}</style>
      {pendingWildMouse && state.exclusiveSpecial && (
        <div role="dialog" aria-modal="true" aria-label="Affectation Wild Mouse" style={{position:'fixed',inset:0,zIndex:3200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.8)',padding:15}}>
          <div style={{maxWidth:440,width:'100%',background:'#0b1020',border:`1px solid ${T.gold}`,borderRadius:20,padding:16,display:'grid',gap:10}}>
            <div style={{color:T.gold,fontSize:18,fontWeight:1000,textAlign:'center'}}>WILD MOUSE · CHOISIR L'OBJECTIF</div>
            <p style={{fontSize:12,color:'#c9d2e6',lineHeight:1.5,textAlign:'center',margin:0}}>Une fléchette ne peut compter que pour une seule condition. Trois fléchettes affectées à BED dans le même lit pendant une volée ajoutent une marque BED.</p>
            {([['number',String(pendingWildMouse.target),`Une marque sur ${pendingWildMouse.target}`],...(pendingWildMouse.mult>1?[['special',pendingWildMouse.mult===2?'DOUBLE':'TRIPLE','Une marque sur la ligne spéciale']]:[]),['bed','BED · TROIS-DANS-UN-LIT','Garder cet impact pour une série de trois identiques']] as string[][]).map(([choice,label,desc])=><button key={choice} type="button" onClick={()=>{const pending=pendingWildMouse;setPendingWildMouse(null);registerHit(pending.target,pending.mult,undefined,choice as 'number'|'special'|'bed');}} style={{border:'1px solid #f6c25688',borderRadius:12,padding:11,background:'#151b2b',color:'#fff',display:'grid',gap:3,cursor:'pointer'}}><strong style={{color:T.gold}}>{label}</strong><small style={{color:'#bac5dc'}}>{desc}</small></button>)}
            <button type="button" style={{border:'1px solid #ffffff33',borderRadius:11,padding:11,background:'#101521',color:'#fff'}} onClick={()=>setPendingWildMouse(null)}>ANNULER</button>
          </div>
        </div>
      )}
      {pendingBull50 && isExtendedCricket && (
        <div role="dialog" aria-modal="true" aria-label="Choix impact BULL50" style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,.78)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 440, background: "#0b1020", border: `1px solid ${T.gold}`, borderRadius: 20, padding: 18, display: "grid", gap: 14, boxShadow: "0 25px 70px rgba(0,0,0,.7)" }}>
            <div style={{ textAlign: "center", color: T.gold, fontWeight: 950, fontSize: 20 }}>DBULL50 · CHOISIR L’OBJECTIF</div>
            <div style={{ textAlign: "center", color: "#c9d2e6", fontSize: 13 }}>Affecte ton impact au BULL ou au DOUBLE. Une seule option sera comptabilisée.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button type="button" onClick={() => { setPendingBull50(false); registerHit(25, 2, "bull"); }} style={{ border: "1px solid #22c55e", background: "rgba(34,197,94,.12)", borderRadius: 16, padding: 14, color: "#86efac", cursor: "pointer", minHeight: 100, display: "grid", gap: 8, justifyItems: "center" }}>
                <strong style={{ fontSize: 18 }}>BULL</strong><span style={{ fontSize: 13 }}>+2 marques</span>
              </button>
              <button type="button" onClick={() => { setPendingBull50(false); registerHit(25, 2, "double"); }} style={{ border: "1px solid #06b6d4", background: "rgba(6,182,212,.12)", borderRadius: 16, padding: 14, color: "#67e8f9", cursor: "pointer", minHeight: 100, display: "grid", gap: 8, justifyItems: "center" }}>
                <strong style={{ fontSize: 18 }}>DOUBLE</strong><span style={{ fontSize: 13 }}>+1 marque</span>
              </button>
            </div>
            <button type="button" onClick={() => setPendingBull50(false)} style={{ border: "1px solid #ffffff33", background: "#161c2c", borderRadius: 12, padding: 11, color: "#fff", fontWeight: 800, cursor: "pointer" }}>ANNULER</button>
          </div>
        </div>
      )}
      {state.wildCard != null && <div style={{textAlign:'center',color:T.gold,background:'#f6c2561a',border:'1px solid #f6c25666',borderRadius:10,padding:9,fontWeight:900,fontSize:13,marginBottom:8}}>🃏 JOKER DE LA MANCHE : {state.wildCard} · +1 MARQUE</div>}
      {(state.eliminatedIds?.length||0)>0 && <div style={{fontSize:12,color:'#ff8a93',marginBottom:8}}>ÉLIMINÉS : {state.players.filter(p=>state.eliminatedIds?.includes(p.id)).map(p=>p.name).join(' · ')}</div>}
      {state.extended ? <div className="mss-cricket-header-band" style={{marginBottom:9,position:'relative',borderRadius:8,overflow:'hidden',background:'#05070d'}}>
        <img src={cricketVariantTicker} alt={cricketRuleData.label} className="mss-cricket-header-image" style={{width:'100%',height:'auto',aspectRatio:'800/230',objectFit:'contain',display:'block'}} />
        <div style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',zIndex:4}}><BackDot onClick={handleQuitInternal} color={T.gold} glow="rgba(246,194,86,.55)" title="Retour à la configuration Cricket" size={36} /></div>
      </div> : null}
      {!state.extended ? <>
        <div data-cricket-shove-header="1" className="mss-cricket-header-band" style={{marginBottom:9,position:"relative",borderRadius:13,overflow:"hidden",background:"#05070d",border:`1px solid ${activeAccent}50`}}>
          <img src={cricketVariantTicker} alt={cricketRuleData.label} className="mss-cricket-header-image" style={{width:"100%",aspectRatio:"800 / 230",display:"block",objectFit:"contain"}} />
          <div style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",zIndex:4}}><BackDot onClick={handleQuitInternal} color={T.gold} glow="rgba(246,194,86,.55)" title="Retour à la configuration Cricket" size={36} /></div>
        </div>
        <div className="mss-cricket-play-columns">
          <div className="mss-cricket-play-left">
        <div data-cricket-shove-card="1" style={{marginBottom:7}}>
          <ShoveActivePlayerCard
            profile={currentProfileData}
            name={currentPlayer.name}
            closedCases={currentClosedCount}
            totalCases={boardTargets.length}
            ruleSet="electronic"
            round={roundDisplay}
            maxRounds={maxRounds}
            darts={[]}
            dartsPlayed={thrown}
            score={state.withPoints ? currentPlayer.score : undefined}
            accent={activeAccent}
            objectiveTitle="15 À BULL"
            objectiveSubtitle={state.withPoints ? "FERMER · MARQUER" : "FERMER LES CIBLES"}
            onObjective={()=>setShowHelp(true)}
          />
        </div>
        <div data-cricket-shove-tools="1" style={{display:"grid",gridTemplateColumns:".85fr 1fr 2fr .85fr",gap:5,marginBottom:7}}>
          {([
            {id:"stats",label:"STATS",symbol:"▥"},
            {id:"ranking",label:"CLASSEMENT",symbol:"🏆"},
            {id:"players",label:"JOUEURS",symbol:""},
            {id:"actions",label:"ACTIONS",symbol:"↺"},
          ] as const).map(b=><button key={b.id} type="button" onClick={()=>setCricketPanel(b.id)} aria-label={b.label} title={b.label} style={{position:"relative",overflow:"hidden",minHeight:48,borderRadius:13,border:`1px solid ${activeAccent}60`,background:b.id==="players"?`url(${shovePlayersTicker}) center/100% 100% no-repeat`:`linear-gradient(180deg,${activeAccent}0b,rgba(7,10,16,.96))`,color:activeAccent,display:"grid",placeItems:"center",cursor:"pointer",padding:4,minWidth:0}}>
            {b.id==="players"?<><span aria-hidden="true" style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(5,8,14,.18),rgba(5,8,14,.58))"}}/><b style={{position:"relative",fontSize:"clamp(10px,2.5vw,16px)",letterSpacing:.6,textShadow:"0 1px 5px #000"}}>JOUEURS</b></>:<><span style={{fontSize:18,lineHeight:1}}>{b.symbol}</span><small style={{fontSize:8,fontWeight:950}}>{b.label}</small></>}
          </button>)}
        </div>
        <button type="button" data-cricket-shove-board-trigger="1" onClick={()=>setCricketPanel("marks")} aria-label="Ouvrir le tableau des marques de tous les joueurs" style={{position:"relative",width:"100%",height:67,borderRadius:12,border:`1px solid ${activeAccent}85`,background:"#0a0c13",padding:0,overflow:"hidden",cursor:"pointer",marginBottom:7}}>
          <img src={shoveMarksTicker} alt="TABLEAU DES MARQUES" style={{display:"block",width:"100%",height:"100%",objectFit:"fill"}}/>
          <span aria-hidden="true" style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(4,7,13,.08),rgba(4,7,13,.34))"}}/>
          <span style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",whiteSpace:"nowrap",fontSize:"clamp(12px,2.7vw,18px)",fontWeight:1000,letterSpacing:.7,color:activeAccent,textShadow:"0 2px 7px #000"}}>TABLEAU DES MARQUES</span>
        </button>
          </div>
          <div className="mss-cricket-play-right">
        <div data-cricket-shove-marks="1" className="mss-shove-validated-band" style={{"--shove-mid-accent":activeAccent,marginBottom:9} as React.CSSProperties}>
          <div className="mss-shove-validated-scroll is-electronic" tabIndex={0} aria-label="Marques validées : fais défiler les objectifs">
            {boardTargets.map(target=>{
              const count=Number(currentPlayer.marks[target]||0);
              const discovered = !state.hiddenTargets || target === 25 || state.players.some(p => Number(p.marks[target] || 0) > 0);
              const targetLabel = discovered ? (target===25?"BULL":target===26?"D":target===27?"T":target) : "?";
              return <div key={target} className={`mss-shove-validated-case${count>=3?" is-closed":""}`} aria-label={discovered ? `${targetLabel}: ${count} marques sur trois` : "Objectif encore caché"}>
                <b className="mss-shove-validated-value">{targetLabel}</b>
                <span className="mss-shove-validated-symbol">
                  {count>0?<CricketMarkIcon marks={Math.min(3,count)} size={26} color={activeAccent} glow={count>=3}/>:<span className="mss-shove-validated-empty">—</span>}
                </span>
              </div>;
            })}
          </div>
        </div>
            {cricketInputControls}
          </div>
        </div>
      </> : null}
      {cricketPanel && !state.extended ? <div role="dialog" aria-modal="true" aria-label={`Cricket · ${cricketPanel}`} onClick={()=>setCricketPanel(null)} style={{position:"fixed",inset:0,zIndex:3100,background:"rgba(0,0,0,.76)",backdropFilter:"blur(8px)",display:"grid",placeItems:"center",padding:14}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"min(560px,96vw)",maxHeight:"78dvh",overflow:"auto",background:"linear-gradient(155deg,rgba(14,18,29,.99),rgba(5,7,13,.99))",border:`1px solid ${activeAccent}66`,borderRadius:20,padding:13,boxShadow:`0 22px 70px rgba(0,0,0,.7),0 0 34px ${activeAccent}20`}}>
          <ShoveFloatingHeader title={({players:"LISTE DES JOUEURS",ranking:"CLASSEMENT LIVE",marks:"TABLEAU DES MARQUES",stats:"STATISTIQUES DE LA PARTIE",actions:"ACTIONS"} as const)[cricketPanel]} accent={activeAccent} onClose={()=>setCricketPanel(null)} tickerSrc={cricketVariantTicker} tickerAlt={cricketRuleData.label} />
          <div style={{height:12}} />
          {cricketPanel==="marks"?<CricketShoveMarksBoard players={state.players as any} targets={boardTargets} activeId={currentPlayer.id} accent={activeAccent} profiles={[...allProfiles,...botProfiles]} hiddenTargets={!!state.hiddenTargets}/>:null}
          {cricketPanel==="players"?<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>{state.players.map((p,idx)=>{const prof=profileById.get(p.id)??p;return <div key={p.id} style={{border:`1px solid ${p.id===currentPlayer.id?activeAccent:"#ffffff25"}`,borderRadius:12,padding:12,display:"grid",justifyItems:"center",gap:6,background:p.id===currentPlayer.id?`${activeAccent}18`:"rgba(255,255,255,.035)"}}>{renderAvatarCircle(prof as any,{selected:p.id===currentPlayer.id,size:58,mode:"play"})}<b style={{fontSize:13}}>{p.name}</b><strong style={{fontSize:20,color:ACCENTS[idx%ACCENTS.length]}}>{p.score}</strong><small>{closedCount(p,!!state.extended,state.targets)}/{boardTargets.length} cibles fermées</small></div>})}</div>:null}
          {cricketPanel==="ranking"?<div style={{display:"grid",gap:7}}>{[...state.players].sort((a,b)=>closedCount(b,!!state.extended,state.targets)-closedCount(a,!!state.extended,state.targets)|| (state.withPoints?b.score-a.score:0)).map((p,i)=><div key={p.id} style={{border:`1px solid ${activeAccent}35`,borderRadius:12,padding:10,background:"rgba(255,255,255,.035)",display:"grid",gridTemplateColumns:"32px minmax(0,1fr) auto",gap:8,alignItems:"center"}}><b style={{color:activeAccent}}>{i+1}</b><strong>{p.name}</strong><small>{closedCount(p,!!state.extended,state.targets)} fermées · {p.score} pts</small></div>)}</div>:null}
          {cricketPanel==="stats"?<div style={{display:"grid",gap:8}}>{state.players.map(p=><div key={p.id} style={{border:`1px solid ${activeAccent}35`,borderRadius:12,padding:11,background:"rgba(255,255,255,.035)"}}><b style={{color:activeAccent}}>{p.name}</b><div style={{marginTop:5,fontSize:12,color:"#dce3f1"}}>Score : {p.score} · Cibles fermées : {closedCount(p,!!state.extended,state.targets)}/{boardTargets.length} · Marques : {marksTotal(p,!!state.extended,state.targets)}</div></div>)}</div>:null}
          {cricketPanel==="actions"?<div style={{display:"grid",gap:8}}><button type="button" onClick={()=>{setCricketPanel(null);setShowHelp(true)}} style={{border:`1px solid ${activeAccent}88`,borderRadius:12,background:"#161b29",color:"#fff",minHeight:42,fontWeight:900}}>RÈGLES / OBJECTIFS</button><button type="button" onClick={()=>{setCricketPanel(null);setShowEnd(true)}} style={{border:`1px solid ${activeAccent}88`,borderRadius:12,background:"#161b29",color:"#fff",minHeight:42,fontWeight:900}}>FIN DE PARTIE / QUITTER</button></div>:null}
        </div>
      </div>:null}
      {/* MODAL AIDE */}
      {showHelp && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.76)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 999,
          }}
          onClick={() => setShowHelp(false)}
        >
          <div
            style={{
              background: "linear-gradient(155deg,rgba(14,18,29,.99),rgba(5,7,13,.99))",
              borderRadius: 20,
              padding: 13,
              border: `1px solid ${activeAccent}66`,
              boxShadow: `0 22px 70px rgba(0,0,0,.7),0 0 34px ${activeAccent}20`,
              width: "min(560px,96vw)",
              maxHeight:"78dvh",
              overflowY:"auto",
              color: "#fff",
              fontSize: 14,
              lineHeight: 1.45,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ShoveFloatingHeader title="RÈGLES DU CRICKET" accent={activeAccent} onClose={() => setShowHelp(false)} tickerSrc={cricketVariantTicker} tickerAlt={cricketRuleData.label} />
            <div style={{ height: 12 }} />
            <div>
              • Fermer <strong>15,16,17,18,19,20 & Bull</strong>
              <br />• Fermer = <strong>3 marques</strong>
              <br />• Sur-marques = <strong>points</strong> si les autres n’ont pas fermé
              <br />• À <strong>{maxRounds===0?"∞":maxRounds}</strong> manches : fin forcée + tie-break (fermés → marques → points)
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(false)}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "10px 0",
                borderRadius: 999,
                background: T.gold,
                border: "none",
                color: "#402800",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* MODAL FIN */}
      {showEnd && finishedFlag && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.76)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            zIndex: 1000,
          }}
          onClick={() => setShowEnd(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "78dvh",
              overflowY: "auto",
              borderRadius: 20,
              background: "linear-gradient(155deg,rgba(14,18,29,.99),rgba(5,7,13,.99))",
              border: `1px solid ${activeAccent}66`,
              boxShadow: `0 22px 70px rgba(0,0,0,.7),0 0 34px ${activeAccent}20`,
              padding: 13,
              color: "#fff",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ShoveFloatingHeader title="FIN DE PARTIE" accent={activeAccent} onClose={() => setShowEnd(false)} tickerSrc={cricketVariantTicker} tickerAlt={cricketRuleData.label} />

            <div style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
              {teamWinnerLabel ? (
                <>
                  Équipe gagnante : <strong style={{ color: "#fff" }}>{teamWinnerLabel}</strong>
                </>
              ) : winnerName ? (
                <>
                  Vainqueur : <strong style={{ color: "#fff" }}>{winnerName}</strong>
                </>
              ) : (
                "Égalité"
              )}
              {((state as any).forcedFinished || (maxRounds>0 && clampRoundNumber(state) >= maxRounds)) && (
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>Fin après {maxRounds} volées</div>
              )}
            </div>

            {Array.isArray((state as any).finishOrder) && (state as any).finishOrder.length > 0 && (
              <div style={{marginTop:10,display:"grid",gap:5}}>
                {(state as any).finishOrder.map((id:string,index:number)=><div key={id} style={{padding:"6px 10px",border:"1px solid rgba(246,194,86,.3)",borderRadius:9,fontWeight:800}}>{index+1}ᵉ · {state.players.find(p=>p.id===id)?.name||id}</div>)}
              </div>
            )}
            <div
              style={{
                marginTop: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: scoreMode === "points" ? "1.7fr 1fr 1fr 1fr" : "1.7fr 1fr 1fr",
                  padding: "8px 10px",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: "rgba(255,255,255,0.7)",
                  background: "rgba(0,0,0,0.35)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>Joueur</div>
                <div style={{ textAlign: "right" }}>Fermés</div>
                <div style={{ textAlign: "right" }}>Marks</div>
                {scoreMode === "points" && <div style={{ textAlign: "right" }}>Pts</div>}
              </div>

              {state.players.map((p, idx) => {
                const accent = ACCENTS[idx % ACCENTS.length];
                const mTotal = marksTotal(p, !!state.extended, state.targets);
                const cCount = closedCount(p, !!state.extended, state.targets);
                const winner = p.id === state.winnerId;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: scoreMode === "points" ? "1.7fr 1fr 1fr 1fr" : "1.7fr 1fr 1fr",
                      padding: "8px 10px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      background: winner ? "rgba(246,194,86,0.12)" : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: accent,
                          boxShadow: `0 0 10px ${accent}aa`,
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800 }}>{cCount}</div>
                    <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800 }}>{mTotal}</div>
                    {scoreMode === "points" && (
                      <div style={{ textAlign: "right", fontSize: 13, fontWeight: 800 }}>{p.score}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={handleSaveAndQuit}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg,#ef4444,#b91c1c)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  cursor: "pointer",
                }}
              >
                Sauver & quitter
              </button>
              <button
                type="button"
                onClick={handleSaveAndReplay}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg,#ffc63a,#ffaf00)",
                  color: "#211500",
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  cursor: "pointer",
                }}
              >
                Rejouer
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowEnd(false)}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.25)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {state.extended ? <CricketMasterPlayStage
        targets={state.targets}
        gameLabel={cricketRuleData.label}
        players={state.players as any[]}
        activePlayerId={currentPlayer.id}
        profiles={[...allProfiles, ...botProfiles]}
        dartsThrown={thrown}
        round={Math.max(1, clampRoundNumber(state) || 1)}
        maxRounds={maxRounds}
        withPoints={state.withPoints}
        onObjective={() => setShowHelp(true)}
        onActions={() => setShowEnd(true)}
      /> : <>
      {/* SHOVE: les joueurs et la grille intégrale sont accessibles via les boutons flottants. */}
      </>}

      {state.extended ? cricketInputControls : null}

    </div>
  );
}

/** English Cricket uses a separate innings/wickets engine, never the Cricket marks engine. */
export default function CricketPlay(props: Props) {
  const variant = String(props.params?.variantId ?? props.params?.presetVariantId ?? '').toLowerCase();
  if (variant === 'english') return <EnglishCricketPlay {...props} />;
  return <CricketPlayCore {...props} />;
}
