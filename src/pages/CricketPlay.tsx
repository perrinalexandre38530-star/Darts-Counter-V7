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
import {
  createCricketMatch,
  applyCricketHit,
  undoLastCricketHit,
  CRICKET_TARGETS,
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

import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import DartboardClickable from "../components/DartboardClickable";

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

import tickerCricket from "../assets/tickers/ticker_cricket.png";
import tickerEnculette from "../assets/tickers/ticker_enculette.png";


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

// Dégradé 15 → Bull
const TARGET_COLORS: Record<number, string> = {
  15: "#F6C256",
  16: "#fbbf24",
  17: "#fb923c",
  18: "#f97316",
  19: "#fb7185",
  20: "#ef4444",
  25: "#b91c1c",
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
};

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string;
};

// Clé locale BOTS (même que Profils>Bots)
const LS_BOTS_KEY = "dc_bots_v1";

// BOTS IA "PRO" PRÉDÉFINIS (identique X01)
const PRO_BOTS: BotLite[] = [
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
];

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
        background: T.card,
        border: `1px solid ${T.borderSoft}`,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: T.textSoft,
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

function marksTotal(p: any) {
  const marks = p?.marks || {};
  return CRICKET_TARGETS.reduce((acc: number, t: any) => acc + Number(marks[t] ?? 0), 0);
}
function closedCount(p: any) {
  const marks = p?.marks || {};
  return CRICKET_TARGETS.reduce((acc: number, t: any) => acc + (Number(marks[t] ?? 0) >= 3 ? 1 : 0), 0);
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

    const aClosed = teamA.reduce((acc: number, p: any) => acc + closedCount(p), 0);
    const bClosed = teamB.reduce((acc: number, p: any) => acc + closedCount(p), 0);
    if (aClosed !== bClosed) return aClosed > bClosed ? teamA[0].id : teamB[0].id;

    const aMarks = teamA.reduce((acc: number, p: any) => acc + marksTotal(p), 0);
    const bMarks = teamB.reduce((acc: number, p: any) => acc + marksTotal(p), 0);
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
    closed: closedCount(p),
    marks: marksTotal(p),
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
  const s = String(lvl || "").toLowerCase();
  if (s.includes("légende") || s.includes("legend")) return "legend";
  if (s.includes("prodige")) return "prodigy";
  if (s.includes("fort") || s.includes("strong")) return "strong";
  if (s.includes("pro")) return "pro";
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
  const openTargets = CRICKET_TARGETS.filter((t: any) => Number(marks[t] ?? 0) < 3);

  // 2) Si tout est fermé: chercher scoring (si points) sinon random “propre”
  const scoringTargets = CRICKET_TARGETS.slice();

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

type CricketVariantId = "classic" | "enculette";

export default function CricketPlay({ profiles, params, onFinish }: Props) {
  const allProfiles = profiles ?? [];
  const matchIdRef = React.useRef<string>(
    (params as any)?.matchId ?? `cricket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  // ✅ BackDot + InfoDot (règles)
  const [infoOpen, setInfoOpen] = React.useState(false);

  // ---- Phase (setup -> play) ----
  const [phase, setPhase] = React.useState<Phase>("setup");

  // ---- Joueurs sélectionnés ----
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedBotIds, setSelectedBotIds] = React.useState<string[]>([]);

  // ---- Paramètres ----
  const [scoreMode, setScoreMode] = React.useState<ScoreMode>("points");
  const [maxRounds, setMaxRounds] = React.useState<number>(20);
  const [rotateFirstPlayer, setRotateFirstPlayer] = React.useState<boolean>(true);

  // ---- Variante (2A): Cricket classique / Enculette-Vache ----
  const [variantId, setVariantId] = React.useState<CricketVariantId>("classic");
  // ✅ ENCULETTE : objectif optionnel (0 => pas d'objectif)
  const [encObjective, setEncObjective] = React.useState<number>(0);

  const [randomStart, setRandomStart] = React.useState<boolean>(false);
  const [teamMode, setTeamMode] = React.useState<boolean>(false);
  const [fillWithBots, setFillWithBots] = React.useState<boolean>(true);

  // ✅ DartSet (v1) — utile pour StatsHub / Stats par fléchettes
  const dartSetId = String(params?.dartSetId ?? params?.config?.dartSetId ?? "").trim() || null;

    // Preset depuis la route (registry / darts_mode)
  React.useEffect(() => {
    const raw = (params as any)?.variantId ?? (params as any)?.presetVariantId ?? "";
    const v = String(raw).toLowerCase();

    if (v === "enculette") setVariantId("enculette");
    else if (v === "cut_throat" || v === "cut-throat") setVariantId("cut_throat");
    else if (v === "classic") setVariantId("classic");
    else if (v) setVariantId("classic");
  }, [params?.variantId, params?.presetVariantId]);// Preset Cut-Throat depuis le registry (Cricket Cut-Throat)
  const isCutThroatRoute = String(params?.variantId || '').toLowerCase() === 'cut_throat';
    React.useEffect(() => {
    if (variantId !== "enculette") setEncObjective(0);
    if (variantId === "enculette") setScoreMode("points");
  }, [variantId]);

React.useEffect(() => {
    if (isCutThroatRoute) {
      setScoreMode('points'); // Cut-throat = points obligatoires
      // On garde variantId UI (classic/enculette) mais le moteur bascule en cut-throat via option.
    }
  }, [isCutThroatRoute]);



// ---- Recorder STATS (par fléchette) ----
const legIdRef = React.useRef<string>(`cricket:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`);
const cricketRecorder = useCricketStatsRecorder(legIdRef.current);

const scoringVariant = React.useMemo(() => {
  if (isCutThroatRoute) return "cut-throat";
  return scoreMode === "no-points" ? "no-points" : "points";
}, [isCutThroatRoute, scoreMode]);

// ---- Match en cours ----
const [state, setState] = React.useState<CricketState | null>(null);
const [hitMode, setHitMode] = React.useState<HitMode>("S");

// --- Multi-input (KEYPAD / CIBLE) — persistant via SCORE_INPUT_LS_KEY
type InputMethod = "keypad" | "dartboard";
const [inputMethod, setInputMethod] = React.useState<InputMethod>(() => {
  try {
    const v = localStorage.getItem(SCORE_INPUT_LS_KEY);
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
  // ✅ AUTOSAVE in_progress pour reprise (toutes les 8s)
  if (!state) return;
  if (isFinished) return;
  const t = window.setInterval(() => {
    try {
      const rec = buildHistoryRecord();
      if (rec) void History.upsert(rec as any);
    } catch {}
  }, 8000);
  return () => window.clearInterval(t);
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
    const raw = window.localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as any[];

    const mapped: BotLite[] = (parsed || []).map((b: any) => ({
      id: String(b.id),
      name: b.name || "BOT",
      avatarDataUrl: b.avatarDataUrl ?? null,
      botLevel:
        b.botLevel ??
        b.levelLabel ??
        b.levelName ??
        b.performanceLevel ??
        b.performance ??
        b.skill ??
        b.difficulty ??
        "",
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
  return [...PRO_BOTS, ...userBots] as any[];
}, [userBots]);

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

  // user bots
  for (const b of userBots) {
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
}, [allProfiles, userBots]);

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

        const pick = pickCricketBotThrow(prev, cp, withPoints, paramsQuality);

        let mult = pick.mult as any;
        if (mult > 1 && Math.random() > preferHighMult) mult = 1;

        const before = prev as any;

        // ---- STATS recorder : log bot dart ----
        try {
          const pid = String(before.players?.[before.currentPlayerIndex]?.id ?? "");
          const beforeP = before.players?.[before.currentPlayerIndex];
          const beforeScore = Number(beforeP?.score ?? 0);
          const beforeMarksRaw = beforeP?.marks?.[pick.target] ?? 0;
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
          } else if (rawTarget >= 15 && rawTarget <= 20) {
            seg = rawTarget;
            ring = mult >= 3 ? "T" : mult >= 2 ? "D" : "S";
            marks = mult;
            rawScore = rawTarget * mult;
          }

          let next = applyCricketHit(before as any, pick.target as any, mult) as any;

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

          const afterMarksRaw = (afterP?.marks?.[pick.target] ?? beforeMarksRaw);
          const afterMarks = Math.min(3, Number(afterMarksRaw ?? 0));
          const closedSegmentNow = (rawTarget === 25 || (rawTarget >= 15 && rawTarget <= 20))
            ? (beforeMarks < 3 && afterMarks >= 3)
            : false;

          const winningThrow = !before.winnerId && !!next.winnerId;

          cricketRecorder.logDart({
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
          let next = applyCricketHit(prev as any, pick.target as any, mult) as any;

          // SFX
          sfxForHit(pick.target, mult);

          // hard stop maxRounds
          next = maybeApplyMaxRoundsHardStop(next);

          return next;
        }

        sfxForHit(pick.target, mult);

        // hard stop maxRounds
        next = maybeApplyMaxRoundsHardStop(next);

        return next;
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
      if (prev.length >= 4) return prev;
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
      if (selectedIds.length + prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  const selectedHumanCount = selectedIds.length;
  const selectedBotCount = selectedBotIds.length;
  const selectedCount = selectedHumanCount + selectedBotCount;

  const canStartBase = selectedCount >= 2 && selectedCount <= 4;
  const wantsTeam = teamMode;
  const teamNeedsBot = wantsTeam && selectedCount === 3 && fillWithBots;
  const teamValidCount = wantsTeam ? selectedCount === 4 || teamNeedsBot : true;
  const canStart = canStartBase && teamValidCount;

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

    finalProfiles = finalProfiles.slice(0, 4);

    let players = finalProfiles.map((p) => ({ id: p.id, name: p.name }));

    if (randomStart) {
      players = [...players].sort(() => Math.random() - 0.5);
    }

    const match = createCricketMatch(players, {
      variant: variantId === "enculette" ? "enculette" : "classic",
      objective: variantId === "enculette" ? encObjective : 0,
      withPoints: (variantId === "enculette") ? true : ((scoreMode === "points") || isCutThroatRoute),
      cutThroat: isCutThroatRoute,
      maxRounds,
    });

    // new legId + reset recorder
    legIdRef.current = `cricket:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    cricketRecorder.resetLeg(legIdRef.current);

    setState(match);
    setPhase("play");
    setHitMode("S");
    setLegStartAt(Date.now());
    setShowEnd(false);
    playSound("start");
  }

  // --------------------------------------------------
  // PLAY : SFX + logique
  // --------------------------------------------------

  function sfxForHit(target: number, mult: Multiplier) {
    if (target >= 0 && target <= 14) {
      playSound("bust");
      return;
    }
    if (target === 25) {
      if (mult === 2) playSound("dbull");
      else playSound("bull");
      return;
    }
    if (mult === 2) {
      playSound("double");
      return;
    }
    if (mult === 3) {
      playSound("triple");
      return;
    }
    playSound("ok");
  }

  function maybeApplyMaxRoundsHardStop(next: CricketState): CricketState {
    if ((next as any)?.winnerId) return next;

    const rn = clampRoundNumber(next);
    if (!rn) return next;

    if (rn >= maxRounds) {
      const withPoints = scoreMode === "points";
      const winnerId = decideWinnerAtMaxRounds(next, withPoints, teamMode);
      if (winnerId) return { ...(next as any), winnerId } as any;

      return { ...(next as any), winnerId: null, forcedFinished: true } as any;
    }

    return next;
  }

  function registerHit(rawTarget: number, multOverride?: Multiplier) {
    if (!state || !currentPlayer) return;
    if (state.winnerId) return;
    if ((state as any).forcedFinished) return;

    let mult: Multiplier = multOverride ?? 1;
    if (!multOverride) {
      if (hitMode === "D") mult = 2;
      if (hitMode === "T") mult = 3;
    }

    const prev = state as any;

    // ---- STATS recorder : log 1 dart ----
    try {
      const pid = String(prev.players?.[prev.currentPlayerIndex]?.id ?? "");
      const beforeP = prev.players?.[prev.currentPlayerIndex];
      const beforeScore = Number(beforeP?.score ?? 0);

      const beforeMarksRaw = beforeP?.marks?.[rawTarget] ?? 0;
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
        marks = mult >= 2 ? 2 : 1;
        rawScore = (25 * (mult >= 2 ? 2 : 1));
      } else if (rawTarget >= 15 && rawTarget <= 20) {
        seg = rawTarget;
        ring = mult >= 3 ? "T" : mult >= 2 ? "D" : "S";
        marks = mult;
        rawScore = rawTarget * mult;
      }

      let nextTmp = applyCricketHit(prev, rawTarget as any, mult) as any;

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

      const afterMarksRaw = (afterP?.marks?.[rawTarget] ?? beforeMarksRaw);
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
      let next = applyCricketHit(state, rawTarget as any, mult) as any;
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
    if (!state) return;
    const next = undoLastCricketHit(state) as any;
    try { cricketRecorder.eventsRef.current.pop(); } catch {}
    if ((next as any).forcedFinished) (next as any).forcedFinished = false;
    setState(next);
    playSound("undo");
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
        maxRounds,
      }
    );

    // new legId + reset recorder
    legIdRef.current = `cricket:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    cricketRecorder.resetLeg(legIdRef.current);

    setState(match);
    setHitMode("S");
    setLegStartAt(Date.now());;
    setShowEnd(false);
    playSound("start");
  }

  function handleQuitInternal() {
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
    if (s === "0") return "MISS";
    return s;
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
    };
  });

const playersPayload = state.players.map((p: any) => {
    const pid = String(p.id);
    const hits = extractHitsForPlayerFromState(state, pid);
    const prof = profileById.get(pid);
    const pDartSetId =
      (prof as any)?.dartSetId ?? (prof as any)?.favoriteDartSetId ?? dartSetId ?? null;

    return {
      profileId: pid,
      id: pid,
      name: p.name,
      score: p.score,
      marks: p.marks,
      hits,
      legStats: computeLegStatsForPlayer(p),
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
    status: finishedFlag ? "finished" : "in_progress",
    players: playersLite,
    winnerId: state.winnerId ?? null,
    createdAt,
    updatedAt: now,
    summary: {
      legs: 1,
      darts: totalDarts,
    },
    payload: {
      mode: "cricket",
      dartSetId,
      dartSetIdsByPlayer,
      meta: { ...(params?.meta || {}), dartSetId, dartSetIdsByPlayer, variantId: (isCutThroatRoute ? "cut_throat" : variantId), scoringVariant },
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
	            darts: {
	              thrown: hitsArr.length,
	              hits: hitsArr.length,
	              misses: 0,
	            },
	            special: {
	              marksTotal: Number(marksTotal) || 0,
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

  // --------------------------------------------------
  // PHASE SETUP RENDER
  // --------------------------------------------------

  if (phase === "setup") {
    const selectionOrder = [...selectedIds, ...selectedBotIds].slice(0, 4);

    const labelForId = (id: string) => {
      const idx = selectionOrder.indexOf(id);
      return idx === -1 ? null : `J${idx + 1}`;
    };

    const selectedCountLocal = selectedIds.length + selectedBotIds.length;

    const canStartBaseLocal = selectedCountLocal >= 2 && selectedCountLocal <= 4;
    const wantsTeamLocal = teamMode;
    const teamNeedsBotLocal = wantsTeamLocal && selectedCountLocal === 3 && fillWithBots;
    const teamValidCountLocal = wantsTeamLocal ? selectedCountLocal === 4 || teamNeedsBotLocal : true;
    const canStartLocal = canStartBaseLocal && teamValidCountLocal;

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
      <div
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
            paddingTop: "env(safe-area-inset-top)",
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
              src={variantId === "enculette" ? tickerEnculette : tickerCricket}
              alt={variantId === "enculette" ? "Cricket — Enculette" : "Cricket"}
              draggable={false}
              style={{
                width: "100%",
                height: 92,
                objectFit: "cover",
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
                    try {
                      // ✅ Retour vers le menu "Games" (sport-aware) via le routeur central (App.tsx)
                      const go = (window as any)?.__appGo || (window as any)?.__appStore?.go;
                      if (typeof go === "function") {
                        go("games");
                        return;
                      }
                    } catch {}
                    // Fallback (si go indispo)
                    try {
                      window.location.hash = "#/";
                    } catch {}
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

        {/* JOUEURS (HUMAINS) */}
        <div
          style={{
            borderRadius: 18,
            background: T.card,
            border: `1px solid ${T.borderSoft}`,
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: T.textSoft,
              marginBottom: 4,
            }}
          >
            Joueurs
          </div>

          <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 10 }}>
            Sélectionne <strong>2 à 4 joueurs</strong>. L’ordre est celui de la sélection{" "}
            <span style={{ opacity: 0.75 }}>(sauf “départ aléatoire”).</span>
          </div>

          <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
            <ArrowBtn
              dir="left"
              onClick={() => {
                const el = document.getElementById("cricket-humans-scroll");
                if (el) el.scrollBy({ left: -140, behavior: "smooth" });
              }}
            />

            <div
              id="cricket-humans-scroll"
              style={{
                display: "flex",
                gap: 14,
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                padding: "0 26px 8px 26px",
              }}
            >
              {allProfiles.filter((p: any) => !p?.isBot).map((p) => {
                const active = selectedIds.includes(p.id);
                const j = labelForId(p.id);

                return (
                  <div
                    key={p.id}
                    onClick={() => toggleProfile(p.id)}
                    style={{
                      scrollSnapAlign: "start",
                      minWidth: "25%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                      opacity: !active && selectedCountLocal >= 4 ? 0.45 : 1,
                    }}
                  >
                    {renderAvatarCircle(p, { selected: active, size: 58, mode: "setup" })}

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        color: active ? "#ffffff" : T.textSoft,
                        textAlign: "center",
                        maxWidth: 92,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </div>

                    <ChipMini active={active} label={j ?? "—"} />
                  </div>
                );
              })}
            </div>

            <ArrowBtn
              dir="right"
              onClick={() => {
                const el = document.getElementById("cricket-humans-scroll");
                if (el) el.scrollBy({ left: 140, behavior: "smooth" });
              }}
            />
          </div>
        </div>

        {/* BOTS IA */}
        <div
          style={{
            borderRadius: 18,
            background: T.card,
            border: `1px solid ${T.borderSoft}`,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: T.textSoft,
              marginBottom: 6,
            }}
          >
            Bots IA
          </div>

          <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 10 }}>
            Ajoute des bots pour compléter une partie (ils comptent dans les 2–4 joueurs).
          </div>

          {!botProfiles?.length ? (
  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>Aucun bot détecté.</div>
          ) : (
            <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
              <ArrowBtn
                dir="left"
                onClick={() => {
                  const el = document.getElementById("cricket-bots-scroll");
                  if (el) el.scrollBy({ left: -140, behavior: "smooth" });
                }}
              />

              <div
                id="cricket-bots-scroll"
                style={{
                  display: "flex",
                  gap: 14,
                  overflowX: "auto",
                  scrollSnapType: "x mandatory",
                  padding: "0 26px 8px 26px",
                }}
              >
                {botProfiles.map((b: any) => {
  const id = String(b.id);
  const active = selectedBotIds.includes(id);
  const j = labelForId(id);
  const botProfile = (profileById.get(id) as any) ?? (b as any);

  return (
    <div
      key={id}
      onClick={() => toggleBot(id)}
      style={{
        scrollSnapAlign: "start",
        minWidth: "25%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        opacity: !active && selectedCountLocal >= 4 ? 0.45 : 1,
      }}
    >
      {renderAvatarCircle(botProfile as any, { selected: active, size: 58, mode: "setup" })}

      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 800,
          color: active ? "#ffffff" : T.textSoft,
          textAlign: "center",
          maxWidth: 92,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {botProfile.name ?? "BOT"}
      </div>

      <ChipMini active={active} label={j ?? "BOT"} />
    </div>
                  );
                })}
              </div>

              <ArrowBtn
                dir="right"
                onClick={() => {
                  const el = document.getElementById("cricket-bots-scroll");
                  if (el) el.scrollBy({ left: 140, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </div>

        {/* ... LE RESTE DE TON FICHIER EST INCHANGÉ ... */}
        {/* (À partir d’ici, tu gardes exactement la suite de ton bloc actuel) */}

        {/* PARAMÈTRES DE BASE */}
        <SectionCard
          title="Paramètres de base"
          subtitle={
            variantId === "enculette"
              ? "Variante Enculette / Vache : même cibles (20..15 + Bull). La règle spécifique pourra être activée ensuite."
              : "Mode Cricket standard : 20, 19, 18, 17, 16, 15 & Bull (3 marques pour fermer)."
          }
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: T.textSoft }}>Variante</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Pill tone="gold" active={variantId === "classic"} onClick={() => setVariantId("classic")}>
                Cricket
              </Pill>
              <Pill tone="gold" active={variantId === "enculette"} onClick={() => setVariantId("enculette")}>
                Enculette / Vache
              </Pill>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 13, color: T.textSoft }}>Mode de score</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Pill
                tone="green"
                active={scoreMode === "points" || isCutThroatRoute || variantId === "enculette"}
                onClick={() => setScoreMode("points")}
              >
                Points
              </Pill>
              <Pill
                tone="gray"
                active={!isCutThroatRoute && variantId !== "enculette" && scoreMode === "no-points"}
                onClick={() => {
                  if (isCutThroatRoute || variantId === "enculette") return;
                  setScoreMode("no-points");
                }}
                disabled={isCutThroatRoute || variantId === "enculette"}
              >
                Sans points
              </Pill>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, color: T.textSoft }}>Nombre max de manches</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[10, 15, 20].map((n) => (
                <Pill key={n} tone="gold" active={maxRounds === n} onClick={() => setMaxRounds(n)}>
                  {n}
                </Pill>
              ))}
            </div>
          </div>

          {variantId === "enculette" && (
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.2 }}>
                Objectif{" "}
                <span style={{ opacity: 0.7, fontSize: 12 }}>
                  (0 = pas d&apos;objectif)
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {[0, 100, 200, 300, 500, 1000].map((n) => (
                  <Pill key={n} tone={n === 0 ? "gray" : "gold"} active={encObjective === n} onClick={() => setEncObjective(n)}>
                    {n === 0 ? "OFF" : n}
                  </Pill>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* OPTIONS AVANCÉES */}
        <SectionCard title="Options avancées">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.2 }}>
              Premier joueur tourne{" "}
              <span style={{ opacity: 0.7, fontSize: 12 }}>
                (le lanceur 1 passe en dernier à chaque nouvelle manche)
              </span>
            </div>
            <OnOff value={rotateFirstPlayer} onChange={setRotateFirstPlayer} />
          </div>

          <div style={{ height: 10 }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.2 }}>
              Ordre de départ aléatoire{" "}
              <span style={{ opacity: 0.7, fontSize: 12 }}>(sinon = ordre de sélection)</span>
            </div>
            <OnOff value={randomStart} onChange={setRandomStart} />
          </div>

          <div style={{ height: 10 }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.2 }}>
              Mode équipe 2v2{" "}
              <span style={{ opacity: 0.7, fontSize: 12 }}>(4 joueurs, équipes auto: J1+J3 vs J2+J4)</span>
            </div>
            <OnOff value={teamMode} onChange={setTeamMode} />
          </div>

          <div style={{ height: 10 }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.2 }}>
              Compléter avec bots{" "}
              <span style={{ opacity: 0.7, fontSize: 12 }}>(si tu es 3 en 2v2 → ajoute 1 bot)</span>
            </div>
            <OnOff value={fillWithBots} onChange={setFillWithBots} disabled={!teamMode} />
          </div>

          {teamMode && selectedCountLocal > 0 && selectedCountLocal < 3 ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              En 2v2 : sélectionne 4 joueurs (ou 3 + bots).
            </div>
          ) : null}
        </SectionCard>

        {/* BOUTON LANCER */}
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 80, padding: "0 16px" }}>
          <button
            type="button"
            onClick={handleStartMatch}
            disabled={!canStartLocal}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 999,
              border: "none",
              background: canStartLocal
                ? "linear-gradient(135deg,#ffc63a,#ffaf00)"
                : "linear-gradient(135deg,#6b7280,#4b5563)",
              color: canStartLocal ? "#211500" : "#e5e7eb",
              fontSize: 15,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 1.4,
              cursor: canStartLocal ? "pointer" : "not-allowed",
              boxShadow: canStartLocal ? "0 0 20px rgba(240,177,42,.35)" : "none",
            }}
          >
            Lancer la partie
          </button>
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
        color: T.text,
        padding: "12px 10px 80px",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: T.gold,
                textShadow: "0 0 6px rgba(246,194,86,0.8), 0 0 18px rgba(246,194,86,0.7)",
              }}
            >
              Cricket
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(true)}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                border: "1px solid rgba(246,194,86,0.6)",
                background: "rgba(0,0,0,0.4)",
                color: T.gold,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                textShadow: "0 0 6px rgba(246,194,86,0.8)",
                boxShadow: "0 0 8px rgba(246,194,86,0.5)",
              }}
            >
              i
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {Array.from({ length: totalDartsPerTurn }).map((_, i) => {
              const active = i < thrown;
              return (
                <div
                  key={i}
                  style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <DartIconColorizable color={activeAccent} active={active} size={30} />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
          Manche: <strong style={{ color: "#fff" }}>{Math.max(1, clampRoundNumber(state) || 1)}</strong> /{" "}
          <strong style={{ color: T.gold }}>{maxRounds}</strong>
          {teamMode && state.players.length === 4 ? <span style={{ marginLeft: 10, opacity: 0.85 }}>• 2v2</span> : null}
        </div>
      </div>

      {/* MODAL AIDE */}
      {showHelp && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
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
              background: "#111827",
              borderRadius: 18,
              padding: 20,
              border: "1px solid rgba(246,194,86,0.4)",
              boxShadow: "0 0 20px rgba(246,194,86,0.4)",
              maxWidth: 340,
              color: "#fff",
              fontSize: 14,
              lineHeight: 1.45,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: T.gold, textAlign: "center" }}>
              Règles du Cricket
            </div>
            <div>
              • Fermer <strong>15,16,17,18,19,20 & Bull</strong>
              <br />• Fermer = <strong>3 marques</strong>
              <br />• Sur-marques = <strong>points</strong> si les autres n’ont pas fermé
              <br />• À <strong>{maxRounds}</strong> manches : fin forcée + tie-break (fermés → marques → points)
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
            background: "rgba(0,0,0,0.68)",
            backdropFilter: "blur(7px)",
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
              maxWidth: 380,
              borderRadius: 18,
              background: "#111827",
              border: "1px solid rgba(246,194,86,0.45)",
              boxShadow: "0 0 24px rgba(246,194,86,0.25)",
              padding: 16,
              color: "#fff",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: 1.2,
                color: T.gold,
                textAlign: "center",
                textShadow: "0 0 10px rgba(246,194,86,0.65)",
                marginBottom: 6,
              }}
            >
              Fin de partie
            </div>

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
              {((state as any).forcedFinished || clampRoundNumber(state) >= maxRounds) && (
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>Fin au max de manches ({maxRounds})</div>
              )}
            </div>

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
                const mTotal = marksTotal(p);
                const cCount = closedCount(p);
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

      {/* CARTES JOUEURS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {state.players.map((p, idx) => {
          const isActive = p.id === currentPlayer.id;
          const isWinnerPlayer = p.id === state.winnerId;
          const prof = profileById.get(p.id) ?? ({ id: p.id, name: p.name } as any);
          const accent = ACCENTS[idx % ACCENTS.length];
          const baseColor = playerCardColors[idx % playerCardColors.length];

          const bg = isActive ? "linear-gradient(135deg,#111827,#020617)" : baseColor;
          const border = isActive ? `1px solid ${accent}` : `1px solid ${T.borderSoft}`;
          const glow = isActive ? `0 0 22px ${accent}80` : "0 0 6px rgba(0,0,0,0.7)";

          const scoreColor = isActive ? "#fef9c3" : isWinnerPlayer ? accent : T.text;
          const scoreShadow = isActive
            ? `0 0 10px ${accent}cc, 0 0 25px ${accent}80`
            : isWinnerPlayer
            ? `0 0 10px ${accent}aa`
            : "none";

          const totalPlayers = state.players.length;
          const avatarSize = totalPlayers === 2 ? 58 : totalPlayers === 4 ? 40 : 48;
          const layout4Players = totalPlayers === 4;

          return (
            <div
              key={p.id}
              style={{
                flex: 1,
                padding: layout4Players ? "8px 6px" : "10px",
                borderRadius: 16,
                background: bg,
                border,
                boxShadow: glow,
                display: "flex",
                flexDirection: layout4Players ? "column" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: layout4Players ? 6 : 8,
                transition: "all 0.15s ease",
              }}
            >
              {renderAvatarCircle(prof as any, { selected: isActive || isWinnerPlayer, size: avatarSize, mode: "play" })}

              {layout4Players ? (
                <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor, textShadow: scoreShadow, marginTop: 2 }}>
                  {p.score}
                </div>
              ) : (
                <div style={{ flex: 1, textAlign: "right", fontSize: 26, fontWeight: 900, color: scoreColor, textShadow: scoreShadow }}>
                  {p.score}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TABLEAU MARQUES */}
<div
  style={{
    borderRadius: 16,
    background: T.card,
    border: `1px solid ${T.borderSoft}`,
    padding: 10,
    marginBottom: 12,
  }}
>
  {state.players.length === 2 ? (
    <>
      {CRICKET_UI_TARGETS.map((target) => {
        const label = target === 25 ? "Bull" : String(target);
        const colColor = getTargetColor(target);
        return (
          <div
            key={target}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 40px 1fr",
              gap: 8,
              alignItems: "center",
              padding: "5px 0",
              borderTop: `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            <MarkCell
              marks={(state.players[0].marks as any)[target]}
              playerIndex={0}
              isActive={state.players[0].id === currentPlayer.id}
            />

            <div
              style={{
                fontSize: label === "Bull" ? 16 : 18,
                fontWeight: 900,
                textAlign: "center",
                color: colColor,
                textShadow: `0 0 8px ${colColor}cc, 0 0 18px ${colColor}80`,
                letterSpacing: 1,
                padding: "2px 0",
                borderLeft: `1px solid rgba(148,163,184,0.5)`,
                borderRight: `1px solid rgba(148,163,184,0.5)`,
              }}
            >
              {label}
            </div>

            <MarkCell
              marks={(state.players[1].marks as any)[target]}
              playerIndex={1}
              isActive={state.players[1].id === currentPlayer.id}
            />
          </div>
        );
      })}
    </>
  ) : state.players.length === 4 ? (
    <>
      {CRICKET_UI_TARGETS.map((target) => {
        const label = target === 25 ? "Bull" : String(target);
        const colColor = getTargetColor(target);
        return (
          <div
            key={target}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 40px 1fr 1fr",
              gap: 8,
              alignItems: "center",
              padding: "5px 0",
              borderTop: `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            <MarkCell
              marks={(state.players[0].marks as any)[target]}
              playerIndex={0}
              isActive={state.players[0].id === currentPlayer.id}
            />
            <MarkCell
              marks={(state.players[1].marks as any)[target]}
              playerIndex={1}
              isActive={state.players[1].id === currentPlayer.id}
            />

            <div
              style={{
                fontSize: label === "Bull" ? 16 : 18,
                fontWeight: 900,
                textAlign: "center",
                color: colColor,
                textShadow: `0 0 8px ${colColor}cc, 0 0 18px ${colColor}80`,
                letterSpacing: 1,
                padding: "2px 0",
                borderLeft: `1px solid rgba(148,163,184,0.5)`,
                borderRight: `1px solid rgba(148,163,184,0.5)`,
              }}
            >
              {label}
            </div>

            <MarkCell
              marks={(state.players[2].marks as any)[target]}
              playerIndex={2}
              isActive={state.players[2].id === currentPlayer.id}
            />
            <MarkCell
              marks={(state.players[3].marks as any)[target]}
              playerIndex={3}
              isActive={state.players[3].id === currentPlayer.id}
            />
          </div>
        );
      })}
    </>
  ) : (
    <>
      {CRICKET_UI_TARGETS.map((target) => {
        const label = target === 25 ? "Bull" : String(target);
        const colColor = getTargetColor(target);
        return (
          <div
            key={target}
            style={{
              display: "grid",
              gridTemplateColumns: `40px repeat(${state.players.length}, 1fr)`,
              gap: 8,
              alignItems: "center",
              padding: "5px 0",
              borderTop: `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            <div
              style={{
                fontSize: label === "Bull" ? 16 : 18,
                fontWeight: 900,
                textAlign: "center",
                color: colColor,
                textShadow: `0 0 8px ${colColor}cc, 0 0 18px ${colColor}80`,
                letterSpacing: 1,
                padding: "2px 0",
                borderRight: `1px solid rgba(148,163,184,0.5)`,
              }}
            >
              {label}
            </div>

            {state.players.map((p, idx) => (
              <MarkCell
                key={p.id}
                marks={(p.marks as any)[target]}
                playerIndex={idx}
                isActive={p.id === currentPlayer.id}
              />
            ))}
          </div>
        );
      })}
    </>
  )}
</div>



{/* Cricket — méthode de saisie */}
<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
  <button
    type="button"
    onClick={() => setInputMethod("keypad")}
    disabled={finishedFlag || botThinking}
    style={{
      flex: 1,
      height: 36,
      borderRadius: 14,
      border:
        inputMethod === "keypad"
          ? "1px solid rgba(255,198,58,.65)"
          : "1px solid rgba(255,255,255,.10)",
      background:
        inputMethod === "keypad"
          ? "linear-gradient(180deg, rgba(255,198,58,.18), rgba(0,0,0,.12))"
          : "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.10))",
      color: inputMethod === "keypad" ? "#ffe8a3" : "rgba(226,232,240,.90)",
      fontWeight: 900,
      letterSpacing: 1.0,
      cursor: finishedFlag || botThinking ? "not-allowed" : "pointer",
      opacity: finishedFlag || botThinking ? 0.45 : 1,
    }}
  >
    KEYPAD
  </button>

  <button
    type="button"
    onClick={() => setInputMethod("dartboard")}
    disabled={finishedFlag || botThinking}
    style={{
      flex: 1,
      height: 36,
      borderRadius: 14,
      border:
        inputMethod === "dartboard"
          ? "1px solid rgba(56,189,248,.55)"
          : "1px solid rgba(255,255,255,.10)",
      background:
        inputMethod === "dartboard"
          ? "linear-gradient(180deg, rgba(56,189,248,.18), rgba(0,0,0,.12))"
          : "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.10))",
      color: inputMethod === "dartboard" ? "#7dd3fc" : "rgba(226,232,240,.90)",
      fontWeight: 900,
      letterSpacing: 1.0,
      cursor: finishedFlag || botThinking ? "not-allowed" : "pointer",
      opacity: finishedFlag || botThinking ? 0.45 : 1,
    }}
  >
    CIBLE
  </button>
</div>

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

{/* DOUBLE / TRIPLE / BULL */}
<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
  <button
    type="button"
    onClick={() => setHitMode("D")}
    disabled={finishedFlag || botThinking}
    style={{
      flex: 1,
      padding: "9px 12px",
      borderRadius: 999,
      border: "none",
      cursor: finishedFlag || botThinking ? "not-allowed" : "pointer",
      fontSize: 13,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      background: "linear-gradient(135deg,#0f766e,#0b3b4b)",
      color: "#7dd3fc",
      boxShadow: hitMode === "D" ? "0 0 20px rgba(56,189,248,0.8)" : "0 0 8px rgba(15,23,42,0.9)",
      transition: "all 0.12s ease",
      opacity: finishedFlag || botThinking ? 0.45 : 1,
    }}
  >
    Double
  </button>

  <button
    type="button"
    onClick={() => setHitMode("T")}
    disabled={finishedFlag || botThinking}
    style={{
      flex: 1,
      padding: "9px 12px",
      borderRadius: 999,
      border: "none",
      cursor: finishedFlag || botThinking ? "not-allowed" : "pointer",
      fontSize: 13,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      background: "linear-gradient(135deg,#7e22ce,#4c1d95)",
      color: "#f9a8d4",
      boxShadow: hitMode === "T" ? "0 0 20px rgba(244,114,182,0.8)" : "0 0 8px rgba(15,23,42,0.9)",
      transition: "all 0.12s ease",
      opacity: finishedFlag || botThinking ? 0.45 : 1,
    }}
  >
    Triple
  </button>

  <button
    type="button"
    onClick={handleBull}
    disabled={finishedFlag || botThinking}
    style={{
      flex: 1,
      padding: "9px 12px",
      borderRadius: 999,
      border: "none",
      cursor: finishedFlag || botThinking ? "not-allowed" : "pointer",
      fontSize: 13,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      background: "linear-gradient(135deg,#059669,#065f46)",
      color: "#bbf7d0",
      boxShadow: "0 0 16px rgba(34,197,94,0.8)",
      transition: "all 0.12s ease",
      opacity: finishedFlag || botThinking ? 0.45 : 1,
    }}
  >
    Bull
  </button>
</div>

{/* CLAVIER 0–20 */}
<div
  style={{
    borderRadius: 20,
    background: "#050816",
    border: `1px solid ${T.borderSoft}`,
    padding: 10,
    marginBottom: 10,
    boxShadow: "0 0 24px rgba(0,0,0,0.6)",
    opacity: finishedFlag || botThinking ? 0.55 : 1,
    pointerEvents: finishedFlag || botThinking ? "none" : "auto",
  }}
>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 8 }}>
    {Array.from({ length: 21 }).map((_, value) => {
      const isCricketNumber = value >= 15 && value <= 20;
      const accent = isCricketNumber ? getTargetColor(value as CricketTarget) : "#111827";

      return (
        <button
          key={value}
          type="button"
          onClick={() => handleKeyPress(value)}
          disabled={finishedFlag || botThinking}
          style={{
            padding: "11px 0",
            borderRadius: 16,
            border: isCricketNumber ? `1px solid ${accent}dd` : "none",
            cursor: finishedFlag || botThinking ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: 700,
            background: "linear-gradient(135deg,#111827,#020617)",
            color: isCricketNumber ? accent : "#f9fafb",
            boxShadow: isCricketNumber ? `0 0 12px ${accent}66` : "0 0 14px rgba(0,0,0,0.65)",
            transition: "all 0.1s ease",
            opacity: finishedFlag || botThinking ? 0.65 : 1,
          }}
        >
          {value}
        </button>
      );
    })}
  </div>
</div>

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
      border: "none",
      background: "linear-gradient(135deg,#dc2626,#7f1d1d)",
      color: "#fee2e2",
      fontSize: 14,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      cursor: botThinking ? "not-allowed" : "pointer",
      boxShadow: "0 0 16px rgba(248,113,113,0.8)",
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
      border: "none",
      background: finishedFlag ? "linear-gradient(135deg,#ffc63a,#ffaf00)" : "rgba(255,255,255,0.12)",
      color: finishedFlag ? "#211500" : "rgba(255,255,255,0.9)",
      fontSize: 14,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      cursor: "pointer",
      opacity: botThinking ? 0.7 : 1,
    }}
  >
    {finishedFlag ? "Résumé" : "Valider"}
  </button>
</div>
    </div>
  );
}