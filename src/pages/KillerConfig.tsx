// @ts-nocheck
// =============================================================
// src/pages/KillerConfig.tsx
// KILLER — CONFIG (V3 look & feel, FR, robust profils)
// - Style proche X01ConfigV3 (cards, pills, carrousels)
// - 100% labels FR
// - Affiche profils locaux depuis store.profiles
// - Ajout bots : 14 KILLER IA officiels + BOTS CPU utilisateur depuis localStorage dc_bots_v1 (fallback)
// - Corrige warning: pas de <button> imbriqués
// - Sort un KillerConfig consommé par KillerPlay (routeParams.config)
// - FIX: onStart peut être absent -> fallback go("killer_play", { config })
//
// ✅ NEW (ce fichier):
// - Ordre de départ (randomStartOrder) en haut des options
// - Attribution des numéros juste dessous
// - Variantes renommées (compréhensibles) + suppression variante inutile
// - ✅ Variantes avancées : self-penalty, multiplier self-penalty, life steal, blind killer
// - AVATARS BOTS OK avec ton ProfileAvatar actuel (qui refuse /assets/)
// - ✅ FIX: randomStartOrder appliqué DIRECTEMENT dans le cfg.players (shuffle garanti)
// - ✅ NEW: incompatibilités variantes (griser + raison + auto-off incompatibles)
// - ✅ REMOVED: Killer vs Killer (Friendly Fire)
// - ✅ FIX BLIND: Blind Killer incompatible avec "1er lancer" (force random + UI grisée)
// =============================================================

import React from "react";
import DartsRelatedModesPanel from "../components/DartsRelatedModesPanel";
import { dartsFamilyGameNavigation } from "../games/dartsGameFamilies";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import MssIntegratedAvatarPicker from "../components/MssIntegratedAvatarPicker";
import ProfileStarRing from "../components/ProfileStarRing";
import BotPagedSelector from "../components/BotPagedSelector";
import MssSelectorIconButton from "../components/MssSelectorIconButton";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
// Le sélecteur commun réellement employé par X01 (Manuel / Enregistrées / Brassage auto).
import { TeamsSection, buildX01DartsBotTeams, X01_PRO_BOTS } from "./X01ConfigV3";
import { findRememberedGeneratedTeam } from "../lib/teamAutoShuffle";
import { loadTeamsBySport, createTeam, upsertTeam } from "../lib/petanqueTeamsStore";
import { groupKillerTeamMembers } from "../lib/killerTeams";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import BackDot from "../components/BackDot";
import tickerKiller from "../assets/tickers/ticker_killer.png";
import tickerKillerProgressiveFr from "../assets/tickers/ticker_killer_progressive_fr.webp";
import tickerKillerProgressiveEn from "../assets/tickers/ticker_killer_progressive_en.webp";
import teamGoldLogo from "../ui_assets/teams/team_gold.png";
import teamPinkLogo from "../ui_assets/teams/team_pink.png";
import teamBlueLogo from "../ui_assets/teams/team_blue.png";
import teamGreenLogo from "../ui_assets/teams/team_green.png";
import InfoDot from "../components/InfoDot";
import KillerAwenaRulesVideo from "../components/KillerAwenaRulesVideo";
import killerAwenaRulesPosterFr from "../assets/videos/killer_awena_rules_poster.webp";
import killerAwenaRulesPosterEn from "../assets/videos/killer_awena_rules_poster_en.webp";
import { loadStoredBots, saveStoredBots, subscribeBotsChange, parseBotLevelValue, botLevelToStarAvg3d } from "../lib/bots";

import { DARTS_KILLER_BOTS } from "../lib/dartsKillerBots";

// --------------------------------------------------
// Types exportés (utilisés par KillerPlay.tsx)
// --------------------------------------------------
export type KillerBecomeRule = "single" | "double";
export type KillerDamageRule = "one" | "multiplier";
export type KillerNumberAssignMode = "none" | "random" | "throw";


export type KillerResurrectionMode = "off" | "one_player_once" | "all_once" | "all";
export type KillerConfigPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
  botLevel?: string;
  number: number; // 1..20 ; 0 si numberAssignMode === "throw"
  teamId?: string;
  teamMembers?: Array<{ id: string; name: string; avatarDataUrl?: string | null; isBot?: boolean; botLevel?: string }>;
};

export type KillerConfig = {
  id: string;
  mode: "killer";
  createdAt: number;

  // Variante autonome du menu Games. Absent = Killer classique.
  variantId?: "classic" | "progressive" | string;
  gameId?: "killer" | "killer_progressive" | string;
  progressiveTarget?: number;
  participantMode?: "players" | "teams";
  teamCount?: number;
  teamSize?: number;
  playerFormat?: "duel" | "multi";
  teamAssignments?: Record<string, number>;
  teamNames?: string[];
  teamsSourceMode?: "manual" | "saved" | "auto";
  selectedBotTeamIds?: string[];
  savedTeamIds?: string[];
  savedTeamMemberSelections?: Record<string, string[]>;

  lives: number;
  becomeRule: KillerBecomeRule;
  damageRule: KillerDamageRule;

  numberAssignMode: KillerNumberAssignMode;
  randomStartOrder?: boolean;
  startOrderMode?: "random" | "alternate" | "manual" | "bull";

  // ✅ Variantes claires (et prévues pour KillerPlay patché)
  selfHitWhileKiller: boolean; // toucher son numéro quand KILLER => perd vie(s) (PAS dead instant)
  selfHitUsesMultiplier: boolean; // si ON : perte = 1/2/3 selon S/D/T sinon -1
  lifeSteal: boolean; // vols de vies : ce que perd la cible est gagné par le killer
  blindKiller: boolean; // masque les numéros à l'écran pendant la partie (mode aveugle)

  // ✅ Variantes BULL
  bullSplash: boolean; // SBULL => -1 à tous les adversaires ; DBULL => -2 à tous
  bullHeal: boolean; // toucher BULL/DBULL permet de regagner des vies (selon implémentation KillerPlay)
  bullHealLives?: number; // 1..3 vies récupérées pour la variante soin
  bullRotate?: boolean; // alterne les fonctions BULL sélectionnées tour après tour

  // ✅ Résurrection
  resurrectionMode?: KillerResurrectionMode; // off | one_player_once | all_once | all
  resurrectionLives?: number; // 1..6

  // ✅ DBULL / Bouclier / Désarmement
  shieldOnDBull?: boolean; // DBULL => bouclier
  disarmOnDBull?: boolean; // DBULL => désarme tous les autres killers sauf le tireur
  dbullRotate?: boolean; // alterne les fonctions DBULL sélectionnées tour après tour
  shieldTurns?: number; // durée en nombre de tours du joueur
  selectBonusShield?: boolean; // bonus bouclier pendant l'attribution au lancer
  missAutoHit?: boolean; // MISS => le joueur se retire 1 vie

  players: KillerConfigPlayer[];
};

type Props = {
  store: Store;
  update?: (mut: (s: Store) => Store) => void;
  go?: (tab: any, params?: any) => void;
  onBack?: () => void;
  onStart?: (cfg: KillerConfig) => void;
  onStartGame?: (cfg: KillerConfig) => void;
  onPlay?: (cfg: KillerConfig) => void;
  params?: any;
};

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string;
  profileStarring?: number;
  groupLabel?: string;
  source?: string;
  isUserBot?: boolean;
};

function isNonUserSystemBot(input: any): boolean {
  const id = String(input?.id || "").trim().toLowerCase();
  const source = String(input?.source || "").trim().toLowerCase();
  return Boolean(
    input?.systemBot === true ||
    input?.officialCharacter === true ||
    input?.isProBot === true ||
    source === "pro" ||
    id === "bot_awena_official" ||
    /^bot_pro_/.test(id) ||
    /^pro_/.test(id)
  );
}

// Casting IA officiel exclusif au mode Killer
const KILLER_BOTS: BotLite[] = DARTS_KILLER_BOTS.map((bot) => ({
  id: bot.id,
  name: bot.name,
  avatarDataUrl: bot.avatarDataUrl,
  botLevel: bot.botLevel,
  profileStarring: bot.profileStarring,
  groupLabel: bot.groupLabel,
  source: bot.source,
}));


const KILLER_TEAM_LIMITS = { min: 2, max: 4 } as const;

const KILLER_MANUAL_TEAM_PRESETS = [
  { id: "gold", name: "Team Gold", short: "TG", color: "#f7c85c", ring: "#ffebad", logo: teamGoldLogo },
  { id: "pink", name: "Team Pink", short: "TP", color: "#ff4fa2", ring: "#ffd0e8", logo: teamPinkLogo },
  { id: "blue", name: "Team Blue", short: "TB", color: "#4fc3ff", ring: "#d0f1ff", logo: teamBlueLogo },
  { id: "green", name: "Team Green", short: "TV", color: "#6dff7c", ring: "#dafedf", logo: teamGreenLogo },
] as const;

type KillerManualTeamPreset = (typeof KILLER_MANUAL_TEAM_PRESETS)[number];

type StartOrderMode = "random" | "alternate" | "manual" | "bull";

const KILLER_START_ORDER_OPTIONS: Array<{ id: StartOrderMode; icon: any; label: string; detail: string }> = [
  { id: "random", icon: "random-order", label: "Aléatoire", detail: "Les participants sont mélangés automatiquement au lancement de la partie." },
  { id: "alternate", icon: "alternate-order", label: "Alterné", detail: "Le premier départ respecte l'ordre actuel de sélection des participants." },
  { id: "manual", icon: "manual-order", label: "Manuel", detail: "Tu choisis l'ordre exact des participants avant le début de la partie." },
  { id: "bull", icon: "bull-order", label: "Bull", detail: "Après le lancer physique à la bull, classe les participants selon le résultat obtenu." },
];

function clampInt(n: any, min: number, max: number, fb: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return fb;
  return Math.max(min, Math.min(max, x));
}

function resolveBotLevel(botLevelRaw?: string | null): { level: number } {
  return { level: parseBotLevelValue(botLevelRaw, 1) };
}

function pickAvatar(p: any): string | null {
  if (!p) return null;
  return p.avatarDataUrl ?? p.avatar ?? p.avatarUrl ?? p.photoDataUrl ?? null;
}

// ✅ normalise vite/webpack: import png peut être string OU {default:string}
function normalizeImgSrc(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object") {
    const d = (v as any).default;
    if (typeof d === "string") return d.trim() || null;
  }
  return null;
}

// ✅ FIX: shuffle garanti dans cfg.players
function shuffleArray<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------ UI bits ------------------

type PillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  primary: string;
  primarySoft: string;
  compact?: boolean;
  disabled?: boolean;
  title?: string;
};

function PillButton({ label, active, onClick, primary, primarySoft, compact, disabled, title }: PillProps) {
  const isDisabled = !!disabled;

  const bg = isDisabled ? "rgba(40,42,60,0.7)" : active ? primarySoft : "rgba(9,11,20,0.9)";
  const border = isDisabled
    ? "1px solid rgba(255,255,255,0.04)"
    : active
    ? `1px solid ${primary}`
    : "1px solid rgba(255,255,255,0.07)";
  const color = isDisabled ? "#777b92" : active ? "#fdf9ee" : "#d0d3ea";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      style={{
        borderRadius: 999,
        padding: compact ? "4px 9px" : "6px 12px",
        border,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: active && !isDisabled ? 700 : 600,
        boxShadow: active && !isDisabled ? "0 0 12px rgba(0,0,0,0.7)" : "none",
        whiteSpace: "nowrap",
        opacity: isDisabled ? 0.7 : 1,
        cursor: isDisabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

/* Médaillon BOT – rouge/or KILLER IA, bleu BOTS CPU utilisateur */
function BotMedallion({ bot, level, active }: { bot: BotLite; level: number; active: boolean }) {
  const isPro = bot.id.startsWith("bot_killer_");
  const COLOR = isPro ? "#f7c85c" : "#00b4ff";
  const COLOR_GLOW = isPro ? "rgba(247,200,92,0.9)" : "rgba(0,172,255,0.65)";

  const SCALE = 0.62;
  const AVATAR = 96 * SCALE;
  const MEDALLION = 104 * SCALE;
  const STAR = 18 * SCALE;
  const WRAP = MEDALLION + STAR;

  const lvl = Math.max(1, Math.min(5, Number(level) || 1));
  const fakeAvg3d = botLevelToStarAvg3d(lvl, 1);

  // ✅ IMPORTANT: passer via profile (ProfileAvatar refuse /assets/ si on le met en dataUrl brut)
  const src = normalizeImgSrc(bot.avatarDataUrl);
  const fakeProfile = React.useMemo(
    () =>
      ({
        id: bot.id,
        name: bot.name,
        avatarUrl: src, // ✅ avatarUrl gagne dans ProfileAvatar
        avatarDataUrl: null,
      }) as any,
    [bot.id, bot.name, src]
  );

  return (
    <div style={{ position: "relative", width: WRAP, height: WRAP, flex: "0 0 auto", overflow: "visible" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
          filter: `drop-shadow(0 0 6px ${COLOR_GLOW})`,
        }}
      >
        <ProfileStarRing anchorSize={MEDALLION} gapPx={-2 * SCALE} starSize={STAR} stepDeg={10} avg3d={fakeAvg3d} color={COLOR} />
      </div>

      <div
        style={{
          position: "absolute",
          top: (WRAP - MEDALLION) / 2,
          left: (WRAP - MEDALLION) / 2,
          width: MEDALLION,
          height: MEDALLION,
          borderRadius: "50%",
          padding: 6 * SCALE,
          background: active
            ? isPro
              ? "linear-gradient(135deg, #fff3c2, #f7c85c)"
              : "linear-gradient(135deg, #7df3ff, #00b4ff)"
            : isPro
            ? "linear-gradient(135deg, #2a2a1f, #1a1a12)"
            : "linear-gradient(135deg, #2c3640, #141b26)",
          boxShadow: active ? `0 0 24px ${COLOR_GLOW}, inset 0 0 10px rgba(0,0,0,.7)` : `0 0 14px rgba(0,0,0,0.7)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: active ? "scale(1.05)" : "scale(1)",
          transition: "transform .15s ease, box-shadow .15s ease",
          border: active ? `2px solid ${COLOR}` : `2px solid ${isPro ? "rgba(247,200,92,0.5)" : "rgba(144,228,255,0.9)"}`,
          overflow: "hidden",
        }}
      >
        <ProfileAvatar profile={fakeProfile} size={AVATAR} showStars={false} />
      </div>
    </div>
  );
}

function uniqueKillerNumbers(selected: Record<string, number>) {
  const used = new Set<number>();
  const out: Record<string, number> = { ...selected };
  for (const pid of Object.keys(out)) {
    let n = clampInt(out[pid], 1, 20, 20);
    for (let k = 0; k < 40; k++) {
      if (!used.has(n)) break;
      n = n - 1;
      if (n < 1) n = 20;
    }
    used.add(n);
    out[pid] = n;
  }
  return out;
}

function sameStringArray(a: string[], b: string[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ------------------ Variants incompat matrix ------------------

type VariantKey = "selfHitWhileKiller" | "selfHitUsesMultiplier" | "lifeSteal" | "blindKiller" | "bullSplash" | "bullHeal" | "shieldOnDBull" | "disarmOnDBull" | "selectBonusShield" | "missAutoHit";

// ✅ règles validées
const INCOMPATIBLE: Record<VariantKey, VariantKey[]> = {
  selfHitWhileKiller: [],
  selfHitUsesMultiplier: [], // dépendance gérée à part (grisé si selfHitWhileKiller=OFF)
  blindKiller: [], // incompat "1er lancer" géré via numberAssignMode (UI + sécurité)
  bullSplash: ["bullHeal"],
  bullHeal: ["bullSplash", "lifeSteal"],
  lifeSteal: ["bullHeal"],
  shieldOnDBull: ["disarmOnDBull"],
  disarmOnDBull: ["shieldOnDBull"],
  selectBonusShield: [],
  missAutoHit: [],
};

function getConflictReason(k: VariantKey, state: Record<VariantKey, boolean> & Record<string, any>) {
  // dépendance
  if (k === "selfHitUsesMultiplier" && !state.selfHitWhileKiller) {
    return "Disponible uniquement si “Auto-pénalité” est activée.";
  }

  const bullRotate = !!state.bullRotate;
  const dbullRotate = !!state.dbullRotate;
  if (bullRotate && (k === "bullSplash" || k === "bullHeal")) return "";
  if (dbullRotate && (k === "shieldOnDBull" || k === "disarmOnDBull")) return "";

  // incompatibles ON
  const bad = (INCOMPATIBLE[k] || []).filter((other) => !!state[other]);
  if (bad.length > 0) {
    const names: Record<VariantKey, string> = {
      selfHitWhileKiller: "Auto-pénalité",
      selfHitUsesMultiplier: "Auto-pénalité = multiplicateur",
      lifeSteal: "Vol de vies",
      blindKiller: "Blind Killer",
      bullSplash: "BULL = dégâts à tous",
      bullHeal: "BULL = soins",
      shieldOnDBull: "DBULL = bouclier",
      disarmOnDBull: "DBULL = désarmement",
      selectBonusShield: "Bonus bouclier au choix du numéro",
      missAutoHit: "MISS = auto-hit",
    };
    return `Incompatible avec : ${bad.map((x) => names[x] || x).join(", ")}.`;
  }

  return "";
}

function isVariantDisabled(k: VariantKey, state: Record<VariantKey, boolean> & Record<string, any>) {
  return !!getConflictReason(k, state);
}

// KILLER — préférences légères : aucune image ni donnée de partie en cours.
// Séparation classique / progressif ; une entrée n'est enregistrée qu'au lancement.
type KillerLaunchPreference = {
  config: Partial<KillerConfig>;
  selectedIds: string[];
  numberById: Record<string, number>;
};
type KillerLaunchPreferenceStats = { signature: string; count: number; lastPlayed: number; value: KillerLaunchPreference };
type KillerLaunchPreferenceStore = { version: 1; last: KillerLaunchPreference | null; entries: KillerLaunchPreferenceStats[] };
const killerPreferenceKey = (progressive: boolean) => `mss_killer_launch_prefs_v1_${progressive ? "progressive" : "classic"}`;
function readKillerLaunchPreferences(progressive: boolean): KillerLaunchPreferenceStore {
  const empty: KillerLaunchPreferenceStore = { version: 1, last: null, entries: [] };
  try {
    const raw = localStorage.getItem(killerPreferenceKey(progressive));
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return empty;
    const valid = (v: any) => v && typeof v === "object" && Array.isArray(v.selectedIds) && v.config && typeof v.config === "object";
    return {
      version: 1,
      last: valid(parsed.last) ? parsed.last : null,
      entries: Array.isArray(parsed.entries) ? parsed.entries.filter((e: any) => valid(e?.value) && typeof e.signature === "string").slice(0, 12) : [],
    };
  } catch { return empty; }
}
function saveKillerLaunchPreference(progressive: boolean, preference: KillerLaunchPreference) {
  try {
    const data = readKillerLaunchPreferences(progressive);
    // Une configuration favorite est une configuration réellement jouée plusieurs fois.
    // Les identifiants et numéros choisis manuellement font partie du groupe mémorisé.
    const signature = JSON.stringify({ config: preference.config, selectedIds: preference.selectedIds, numberById: preference.numberById });
    const old = data.entries.find((e) => e.signature === signature);
    const updated: KillerLaunchPreferenceStats = { signature, count: (old?.count || 0) + 1, lastPlayed: Date.now(), value: preference };
    const entries = [updated, ...data.entries.filter((e) => e.signature !== signature)]
      .sort((a, b) => b.count - a.count || b.lastPlayed - a.lastPlayed).slice(0, 12);
    localStorage.setItem(killerPreferenceKey(progressive), JSON.stringify({ version: 1, last: preference, entries }));
  } catch { /* stockage indisponible : lancer la partie normalement */ }
}
function getMostPlayedKillerPreference(progressive: boolean): KillerLaunchPreference | null {
  const data = readKillerLaunchPreferences(progressive);
  const best = [...data.entries].sort((a, b) => b.count - a.count || b.lastPlayed - a.lastPlayed)[0];
  return best && best.count >= 2 ? best.value : null;
}

function KillerParticipantModeButton({
  mode,
  label,
  active,
  accent,
  onClick,
}: {
  mode: "players" | "teams";
  label: string;
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  const icon = mode === "players"
    ? <><circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20v-1.8A6.5 6.5 0 0 1 12 11.7a6.5 6.5 0 0 1 6.5 6.5V20"/></>
    : <><circle cx="7" cy="8.5" r="2.4"/><circle cx="12" cy="6.4" r="2.8"/><circle cx="17" cy="8.5" r="2.4"/><path d="M2.5 19.5v-1a4.5 4.5 0 0 1 6.8-3.8"/><path d="M7.5 20v-1.7A5.4 5.4 0 0 1 12.9 12.9h.2a5.4 5.4 0 0 1 5.4 5.4V20"/><path d="M14.7 14.7a4.5 4.5 0 0 1 6.8 3.8v1"/></>;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      style={{
        minHeight: 86,
        width: "100%",
        borderRadius: 18,
        border: active ? `1px solid ${accent}` : `1px solid ${accent}66`,
        background: active ? `linear-gradient(135deg, ${accent}, #f7df9b)` : "rgba(255,255,255,.035)",
        color: active ? "#383c47" : accent,
        display: "grid",
        placeItems: "center",
        gap: 6,
        padding: "10px 8px",
        cursor: "pointer",
        boxShadow: active ? `0 0 20px ${accent}33` : "none",
      }}
    >
      <svg viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon}
      </svg>
      <span style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 0.9, textTransform: "uppercase" }}>{label}</span>
    </button>
  );
}

export default function KillerConfigPage(props: Props) {
  const { store, go, onBack } = props;

  const requestedVariant = String(
    props?.params?.variantId || props?.params?.gameId || ""
  ).toLowerCase();
  const isProgressive =
    requestedVariant === "progressive" || requestedVariant === "killer_progressive";

  const startCb =
    (typeof (props as any).onStart === "function" && (props as any).onStart) ||
    (typeof (props as any).onStartGame === "function" && (props as any).onStartGame) ||
    (typeof (props as any).onPlay === "function" && (props as any).onPlay) ||
    null;

  const { theme } = useTheme();
  const { t, lang } = useLang();
  const savedLaunch = React.useMemo(() => readKillerLaunchPreferences(isProgressive).last, [isProgressive]);
  const savedCfg = savedLaunch?.config;
  const [hasLastPreference, setHasLastPreference] = React.useState(() => !!savedLaunch);
  const [hasFrequentPreference, setHasFrequentPreference] = React.useState(() => !!getMostPlayedKillerPreference(isProgressive));


  React.useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  // Création rapide dans une modale : ne jamais quitter le configurateur.
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);
  const [creationMenuOpen, setCreationMenuOpen] = React.useState(false);
  const [quickCreateKind, setQuickCreateKind] = React.useState<"profile" | "bot">("profile");
  const [quickCreateName, setQuickCreateName] = React.useState("");
  const [quickCreateLevel, setQuickCreateLevel] = React.useState<"easy" | "medium" | "strong" | "pro" | "legend">("medium");
  const [quickCreateAvatar, setQuickCreateAvatar] = React.useState<string | null>(null);
  const [quickAvatarPickerOpen, setQuickAvatarPickerOpen] = React.useState(false);
  const [quickCreateCountry, setQuickCreateCountry] = React.useState("");
  const [quickCreateBusy, setQuickCreateBusy] = React.useState(false);
  const [quickCreateError, setQuickCreateError] = React.useState("");
  const [participantMode, setParticipantMode] = React.useState<"players" | "teams">(savedCfg?.participantMode === "teams" ? "teams" : "players");
  const [teamCreateOpen, setTeamCreateOpen] = React.useState(false);
  // Le type de l'équipe dépend du sélecteur d'origine ; ne jamais mélanger humains et CPU.
  const [teamCreateKind, setTeamCreateKind] = React.useState<"players" | "bots">("players");
  const [teamCreateName, setTeamCreateName] = React.useState("");
  const [teamCreateLogo, setTeamCreateLogo] = React.useState<string | null>(null);
  const [teamCreateMembers, setTeamCreateMembers] = React.useState<string[]>([]);
  const [teamCreatePage, setTeamCreatePage] = React.useState(0);
  const [teamCreateError, setTeamCreateError] = React.useState("");
  const [teamStoreRevision, setTeamStoreRevision] = React.useState(0);
  const [teamPickerOpen, setTeamPickerOpen] = React.useState(false);
  const [teamPickerTab, setTeamPickerTab] = React.useState<"manual" | "saved" | "auto" | "bots">("manual");
  const [teamInfoOpen, setTeamInfoOpen] = React.useState(false);
  const [botTeamsPage, setBotTeamsPage] = React.useState(0);
  const [botTeamEditing, setBotTeamEditing] = React.useState<any | null>(null);
  const [editingBotInstanceId, setEditingBotInstanceId] = React.useState<string | null>(null);
  const [botTeamMembersDraft, setBotTeamMembersDraft] = React.useState<string[]>([]);
  const [botMemberPage, setBotMemberPage] = React.useState(0);
  const [botMemberError, setBotMemberError] = React.useState("");
  const teamPickerScrollRef = React.useRef<HTMLDivElement>(null);
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>(() => Array.isArray(savedCfg?.selectedBotTeamIds) ? savedCfg.selectedBotTeamIds.map(String) : []);
  // KILLER: 2 à 4 équipes, 2 à 5 membres chacune (20 participants au maximum).
  // Les contraintes sont choisies AVANT les profils et vérifiées au lancement.
  const [teamCount, setTeamCount] = React.useState<number>(clampInt(savedCfg?.teamCount, 2, KILLER_TEAM_LIMITS.max, 2));
  const [teamSize, setTeamSize] = React.useState<number>(clampInt(savedCfg?.teamSize, 2, 5, 2));
  const [playerFormat, setPlayerFormat] = React.useState<"duel" | "multi">(savedCfg?.playerFormat === "multi" ? "multi" : "duel");
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, number>>(() => ({ ...(savedCfg?.teamAssignments || {}) }));
  const [teamNames, setTeamNames] = React.useState<string[]>(() => Array.isArray(savedCfg?.teamNames) ? savedCfg.teamNames : ["Équipe A", "Équipe B", "Équipe C", "Équipe D"]);
  // Le mode Teams utilise le même composant et les mêmes sources que X01.
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<"manual" | "saved" | "auto">(
    savedCfg?.teamsSourceMode === "saved" || savedCfg?.teamsSourceMode === "auto" ? savedCfg.teamsSourceMode : "manual"
  );
  const [selectedStoredTeamIds, setSelectedStoredTeamIds] = React.useState<string[]>(
    () => Array.isArray(savedCfg?.savedTeamIds) ? savedCfg.savedTeamIds.map(String) : []
  );
  const [savedTeamMemberSelections, setSavedTeamMemberSelections] = React.useState<Record<string, string[]>>(
    () => savedCfg?.savedTeamMemberSelections && typeof savedCfg.savedTeamMemberSelections === "object" ? { ...savedCfg.savedTeamMemberSelections } : {}
  );
  const storedDartsTeams = React.useMemo(() => {
    try { return loadTeamsBySport("darts").filter((t: any) => Array.isArray(t?.playerIds) && t.playerIds.length > 0); }
    catch { return []; }
  }, [store, teamStoreRevision]);
  const openQuickCreate = (kind: "profile" | "bot") => {
    setQuickCreateKind(kind); setQuickCreateName(""); setQuickCreateAvatar(null); setQuickCreateCountry("");
    setQuickCreateLevel("medium"); setQuickCreateError(""); setQuickCreateOpen(true);
  };
  const readQuickAvatar = (file?: File | null): Promise<void> => new Promise((resolve, reject) => {
    if (!file) { setQuickCreateAvatar(null); resolve(); return; }
    if (!file.type.startsWith("image/")) { setQuickCreateError("Sélectionne une image."); reject(new Error("Invalid image")); return; }
    if (file.size > 2 * 1024 * 1024) { setQuickCreateError("Image trop volumineuse (2 Mo maximum)."); reject(new Error("Image too large")); return; }
    const reader = new FileReader();
    reader.onload = () => { setQuickCreateAvatar(typeof reader.result === "string" ? reader.result : null); resolve(); };
    reader.onerror = () => { setQuickCreateError("Impossible de lire cet avatar."); reject(new Error("Cannot read avatar")); };
    reader.readAsDataURL(file);
  });
  const createQuickParticipant = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = quickCreateName.trim();
    if (!name || quickCreateBusy) return;
    setQuickCreateBusy(true); setQuickCreateError("");
    try {
      const id = `mss-${quickCreateKind}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      if (quickCreateKind === "bot") {
        const now = new Date().toISOString();
        const record = { id, name, level: quickCreateLevel, botLevel: quickCreateLevel,
          avatarSeed: Math.random().toString(36).slice(2, 10), avatarDataUrl: quickCreateAvatar, country: quickCreateCountry.trim() || undefined,
          createdAt: now, updatedAt: now, isBot: true, type: "bot", kind: "bot", bot: true, cpu: true };
        if (!saveStoredBots([...loadStoredBots(), record])) throw new Error("Impossible de sauvegarder le bot CPU.");
      } else {
        if (!props.update) throw new Error("La création locale est indisponible dans cette configuration.");
        const profile = { id, name, avatarDataUrl: quickCreateAvatar, avatarUpdatedAt: Date.now(), privateInfo: quickCreateCountry.trim() ? { country: quickCreateCountry.trim() } : undefined } as Profile;
        props.update((current) => ({ ...current, profiles: [...(Array.isArray(current.profiles) ? current.profiles : []), profile] }));
      }
      if (teamCreateOpen) {
        setTeamCreateMembers((prev) => prev.includes(id) || prev.length >= teamSize ? prev : [...prev, id]);
      } else {
        const max = participantMode === "teams" ? teamCount * teamSize : playerFormat === "duel" ? 2 : 20;
        setSelectedIds((prev) => prev.includes(id) || prev.length >= max ? prev : [...prev, id]);
      }
      setTeamAssignments((prev) => ({ ...prev, [id]: Math.min(teamCount - 1, Math.max(0, Number(prev[id]) || 0)) }));
      setQuickCreateOpen(false); setQuickCreateName(""); setQuickCreateAvatar(null);
    } catch (error) { setQuickCreateError(error instanceof Error ? error.message : "Création impossible."); }
    finally { setQuickCreateBusy(false); }
  };

  const primary = theme?.primary ?? "#f7c85c";
  const primarySoft = theme?.primarySoft ?? "rgba(247,200,92,0.16)";
  const textMain = theme?.text ?? "#f5f5ff";
  const cardBg = "rgba(10, 12, 24, 0.96)";

  const profiles: Profile[] = React.useMemo(
    () => (Array.isArray((store as any)?.profiles) ? (((store as any).profiles as Profile[]) ?? []) : []),
    [store]
  );
  const humanProfiles = React.useMemo(
    () => (profiles || []).filter((p: any) => !p?.isBot),
    [profiles]
  );
  const storeBots = React.useMemo(
    () => (profiles || []).filter((p: any) => !!p?.isBot && !isNonUserSystemBot(p)),
    [profiles]
  );

  const [botsFromLS, setBotsFromLS] = React.useState<BotLite[]>([]);
  const [botsLoaded, setBotsLoaded] = React.useState(false);
  React.useEffect(() => {
    const syncBots = () => {
      try {
        const loaded = loadStoredBots();
        const mapped: BotLite[] = (loaded || []).filter((b: any) => !isNonUserSystemBot(b)).map((b: any) => ({
          id: b.id,
          name: b.name || "BOT",
          avatarDataUrl: b.avatarDataUrl ?? b.avatarUrl ?? b.avatar ?? null,
          avatarUrl: b.avatarUrl ?? b.avatar ?? null,
          avatar: b.avatar ?? b.avatarUrl ?? b.avatarDataUrl ?? null,
          botLevel:
            b.botLevel ??
            b.level ??
            b.levelLabel ??
            b.levelName ??
            b.performanceLevel ??
            b.difficulty ??
            "",
          groupLabel: "CPU Home",
          source: "cpu",
          isUserBot: true,
        }));
        setBotsFromLS(mapped);
        setBotsLoaded(true);
      } catch {
        // Ne jamais relire l'ancienne clé globale dc_bots_v1 : sur un appareil
        // multi-comptes elle pourrait appartenir à un autre utilisateur.
        setBotsFromLS([]);
        setBotsLoaded(true);
      }
    };

    syncBots();
    return subscribeBotsChange(syncBots);
  }, []);

  const userBots: BotLite[] = React.useMemo(() => {
    const fromStore = (storeBots || []).map((p: any) => ({
      id: p.id,
      name: p.name || "BOT",
      avatarDataUrl: pickAvatar(p),
      botLevel:
        p.botLevel ??
        p.level ??
        p.levelLabel ??
        p.levelName ??
        p.performanceLevel ??
        p.difficulty ??
        "",
      groupLabel: "CPU Home",
      source: "cpu",
      isUserBot: true,
    }));

    const merged = [...fromStore];
    const seen = new Set(merged.map((b) => String(b.id || "")));
    for (const b of botsFromLS || []) {
      const bid = String((b as any)?.id || "");
      if (!bid || seen.has(bid)) continue;
      merged.push(b);
      seen.add(bid);
    }
    return merged;
  }, [storeBots, botsFromLS]);

  const botProfiles: BotLite[] = React.useMemo(() => {
    const official = KILLER_BOTS.map((b) => ({ ...b, avatarDataUrl: normalizeImgSrc(b.avatarDataUrl) ?? null }));
    const usr = (userBots || []).map((b) => ({
      ...b,
      avatarDataUrl: normalizeImgSrc(b.avatarDataUrl) ?? (typeof b.avatarDataUrl === "string" ? b.avatarDataUrl : null),
    }));
    return [...official, ...usr];
  }, [userBots]);

  const allAvailableBots = React.useMemo(() => {
    const merged = [...KILLER_BOTS, ...botProfiles, ...X01_PRO_BOTS];
    const byId = new Map<string, any>();
    for (const bot of merged) {
      const id = String((bot as any)?.id || "").trim();
      if (!id || byId.has(id)) continue;
      byId.set(id, { ...bot, id, name: String((bot as any)?.name || "BOT"), avatarDataUrl: normalizeImgSrc((bot as any)?.avatarDataUrl) ?? ((bot as any)?.avatarDataUrl || null) });
    }
    return Array.from(byId.values());
  }, [botProfiles]);

  // ------------------ state config ------------------
  const [lives, setLives] = React.useState<number>(isProgressive ? 5 : clampInt(savedCfg?.lives, 1, 9, 3));
  const [becomeRule, setBecomeRule] = React.useState<KillerBecomeRule>(savedCfg?.becomeRule === "double" ? "double" : "single");
  const [damageRule, setDamageRule] = React.useState<KillerDamageRule>(isProgressive ? "multiplier" : savedCfg?.damageRule === "multiplier" ? "multiplier" : "one");

  const [numberAssignMode, setNumberAssignMode] = React.useState<KillerNumberAssignMode>(isProgressive ? "throw" : (["none", "random", "throw"].includes(String(savedCfg?.numberAssignMode)) ? savedCfg?.numberAssignMode! : "random"));
  const [randomStartOrder, setRandomStartOrder] = React.useState<boolean>(false);
  const [startOrderMode, setStartOrderMode] = React.useState<StartOrderMode>((["random", "alternate", "manual", "bull"].includes(String(savedCfg?.startOrderMode)) ? savedCfg?.startOrderMode! : "alternate"));

  // ✅ variantes
  const [selfHitWhileKiller, setSelfHitWhileKiller] = React.useState<boolean>(!isProgressive && savedCfg?.selfHitWhileKiller === true);
  const [selfHitUsesMultiplier, setSelfHitUsesMultiplier] = React.useState<boolean>(!isProgressive && savedCfg?.selfHitUsesMultiplier === true);
  const [lifeSteal, setLifeSteal] = React.useState<boolean>(!isProgressive && savedCfg?.lifeSteal === true);
  const [blindKiller, setBlindKiller] = React.useState<boolean>(!isProgressive && savedCfg?.blindKiller === true);

  // ✅ Bull variants
  const [bullSplash, setBullSplash] = React.useState<boolean>(!isProgressive && savedCfg?.bullSplash === true);
  const [bullHeal, setBullHeal] = React.useState<boolean>(!isProgressive && savedCfg?.bullHeal === true);
  const [bullHealLives, setBullHealLives] = React.useState<number>(isProgressive ? 1 : clampInt(savedCfg?.bullHealLives, 1, 3, 1));
  const [bullRotate, setBullRotate] = React.useState<boolean>(!isProgressive && savedCfg?.bullRotate === true);

  // ✅ Bouclier / variantes avancées
  const [shieldOnDBull, setShieldOnDBull] = React.useState<boolean>(!isProgressive && savedCfg?.shieldOnDBull === true);
  const [disarmOnDBull, setDisarmOnDBull] = React.useState<boolean>(!isProgressive && savedCfg?.disarmOnDBull === true);
  const [dbullRotate, setDbullRotate] = React.useState<boolean>(!isProgressive && savedCfg?.dbullRotate === true);
  const [shieldTurns, setShieldTurns] = React.useState<number>(isProgressive ? 1 : clampInt(savedCfg?.shieldTurns, 1, 5, 1));
  const [selectBonusShield, setSelectBonusShield] = React.useState<boolean>(!isProgressive && savedCfg?.selectBonusShield === true);
  const [missAutoHit, setMissAutoHit] = React.useState<boolean>(!isProgressive && savedCfg?.missAutoHit === true);

  // ✅ Résurrection
  const [resurrectionMode, setResurrectionMode] = React.useState<KillerResurrectionMode>(!isProgressive && ["off", "one_player_once", "all_once", "all"].includes(String(savedCfg?.resurrectionMode)) ? savedCfg?.resurrectionMode! : "off");
  const [resurrectionLives, setResurrectionLives] = React.useState<number>(isProgressive ? 1 : clampInt(savedCfg?.resurrectionLives, 1, 6, 1));

  // Le mode progressif possède des règles fixes et isolées.
  // On neutralise les variantes du Killer classique même en cas de navigation réutilisant le composant.
  React.useEffect(() => {
    if (!isProgressive) return;
    setLives(5);
    setBecomeRule("single");
    setDamageRule("multiplier");
    setNumberAssignMode("throw");
    setSelfHitWhileKiller(false);
    setSelfHitUsesMultiplier(false);
    setLifeSteal(false);
    setBlindKiller(false);
    setBullSplash(false);
    setBullHeal(false);
    setBullRotate(false);
    setShieldOnDBull(false);
    setDisarmOnDBull(false);
    setDbullRotate(false);
    setSelectBonusShield(false);
    setMissAutoHit(false);
    setResurrectionMode("off");
  }, [isProgressive]);

  // ✅ bouton "i" (règles / variantes)
  const [infoOpen, setInfoOpen] = React.useState<boolean>(false);
  const [rulesVideoOpen, setRulesVideoOpen] = React.useState<boolean>(false);
  const killerRulesVideoIsFrench = String(lang || "fr").toLowerCase() === "fr";
  const killerAwenaRulesPoster = killerRulesVideoIsFrench ? killerAwenaRulesPosterFr : killerAwenaRulesPosterEn;
  const killerRulesVideoDuration = killerRulesVideoIsFrench ? "1:20" : "1:11";
  const [resInfo, setResInfo] = React.useState<{ title: string; text: string } | null>(null);

  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
    const raf = window.requestAnimationFrame(() => {
      try {
        contentRef.current?.scrollTo({ top: 0, behavior: 'auto' as any });
        // fallback
        if (contentRef.current) contentRef.current.scrollTop = 0;
      } catch {}
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);


  const variantState = React.useMemo(
    () =>
      ({
        selfHitWhileKiller,
        selfHitUsesMultiplier,
        lifeSteal,
        blindKiller,
        bullSplash,
        bullHeal,
        shieldOnDBull,
        disarmOnDBull,
        bullRotate,
        dbullRotate,
        selectBonusShield,
        missAutoHit,
      }) as Record<VariantKey, boolean> & Record<string, any>,
    [
      selfHitWhileKiller,
      selfHitUsesMultiplier,
      lifeSteal,
      blindKiller,
      bullSplash,
      bullHeal,
      shieldOnDBull,
      disarmOnDBull,
      bullRotate,
      dbullRotate,
      selectBonusShield,
      missAutoHit,
    ]
  );

  function setVariant(k: VariantKey, v: boolean) {
    // OFF
    if (!v) {
      if (k === "selfHitWhileKiller") {
        setSelfHitWhileKiller(false);
        setSelfHitUsesMultiplier(false); // dépendance
        return;
      }
      if (k === "selfHitUsesMultiplier") return setSelfHitUsesMultiplier(false);
      if (k === "lifeSteal") return setLifeSteal(false);
      if (k === "blindKiller") return setBlindKiller(false);
      if (k === "bullSplash") return setBullSplash(false);
      if (k === "bullHeal") return setBullHeal(false);
      if (k === "shieldOnDBull") return setShieldOnDBull(false);
      if (k === "disarmOnDBull") return setDisarmOnDBull(false);
      if (k === "selectBonusShield") return setSelectBonusShield(false);
      if (k === "missAutoHit") return setMissAutoHit(false);
      return;
    }

    // ON : bloque si disabled
    const reason = getConflictReason(k, variantState as any);
    if (reason) return;

    // ON : auto-OFF incompatibles
    let toOff = INCOMPATIBLE[k] || [];
    if (bullRotate && (k === "bullSplash" || k === "bullHeal")) {
      toOff = toOff.filter((x) => x !== "bullSplash" && x !== "bullHeal");
    }
    if (dbullRotate && (k === "shieldOnDBull" || k === "disarmOnDBull")) {
      toOff = toOff.filter((x) => x !== "shieldOnDBull" && x !== "disarmOnDBull");
    }
    if (toOff.includes("bullHeal")) setBullHeal(false);
    if (toOff.includes("bullSplash")) setBullSplash(false);
    if (toOff.includes("lifeSteal")) setLifeSteal(false);
    if (toOff.includes("shieldOnDBull")) setShieldOnDBull(false);
    if (toOff.includes("disarmOnDBull")) setDisarmOnDBull(false);
    if (toOff.includes("selectBonusShield")) setSelectBonusShield(false);
    if (toOff.includes("missAutoHit")) setMissAutoHit(false);

    // dépendance : activer multiplier => force auto-pénalité
    if (k === "selfHitUsesMultiplier") {
      setSelfHitWhileKiller(true);
      setSelfHitUsesMultiplier(true);
      return;
    }

    // set ON normal
    if (k === "selfHitWhileKiller") return setSelfHitWhileKiller(true);
    if (k === "lifeSteal") return setLifeSteal(true);

    // ✅ FIX BLIND: incompatible avec "1er lancer = choisir son numéro"
    // On évite tout changement silencieux du mode d'attribution :
    // si "1er lancer" est activé, l'option Blind Killer doit être bloquée.
    if (k === "blindKiller") {
      if (numberAssignMode === "throw") return; // bloqué (UI grisée + raison)
      setBlindKiller(true);
      return;
    }

    if (k === "bullSplash") return setBullSplash(true);
    if (k === "bullHeal") return setBullHeal(true);
    if (k === "shieldOnDBull") return setShieldOnDBull(true);
    if (k === "disarmOnDBull") return setDisarmOnDBull(true);
    if (k === "selectBonusShield") return setSelectBonusShield(true);
    if (k === "missAutoHit") return setMissAutoHit(true);
  }

  React.useEffect(() => {
    if (!selfHitWhileKiller && selfHitUsesMultiplier) setSelfHitUsesMultiplier(false);
  }, [selfHitWhileKiller]);

  React.useEffect(() => {
    if (!bullRotate && bullSplash && bullHeal) setBullHeal(false);
  }, [bullRotate, bullSplash, bullHeal]);

  React.useEffect(() => {
    if (!dbullRotate && shieldOnDBull && disarmOnDBull) setDisarmOnDBull(false);
  }, [dbullRotate, shieldOnDBull, disarmOnDBull]);

  // ✅ FIX BLIND: si l'utilisateur passe en "1er lancer", on coupe Blind Killer.
  React.useEffect(() => {
    if (numberAssignMode === "throw" && blindKiller) setBlindKiller(false);
  }, [numberAssignMode, blindKiller]);

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    Array.isArray(savedLaunch?.selectedIds) ? [...new Set(savedLaunch.selectedIds.map(String))].slice(0, 20) : []
  );
  const [botsPickerOpen, setBotsPickerOpen] = React.useState<boolean>(false);
  const selectedBotProfiles = React.useMemo(() => {
    const selected = new Set(selectedIds);
    return allAvailableBots.filter((b) => selected.has(b.id));
  }, [allAvailableBots, selectedIds]);

  const [killerNumberById, setKillerNumberById] = React.useState<Record<string, number>>(() =>
    savedLaunch?.numberById && typeof savedLaunch.numberById === "object" ? { ...savedLaunch.numberById } : {}
  );

  function restoreLaunchPreference(pref: KillerLaunchPreference | null) {
    if (!pref) return;
    const c = pref.config || {};
    if (!isProgressive) {
      setLives(clampInt(c.lives, 1, 9, 3));
      setBecomeRule(c.becomeRule === "double" ? "double" : "single");
      setDamageRule(c.damageRule === "multiplier" ? "multiplier" : "one");
      setNumberAssignMode(["none", "random", "throw"].includes(String(c.numberAssignMode)) ? c.numberAssignMode! : "random");
      setSelfHitWhileKiller(c.selfHitWhileKiller === true);
      setSelfHitUsesMultiplier(c.selfHitWhileKiller === true && c.selfHitUsesMultiplier === true);
      setLifeSteal(c.lifeSteal === true);
      setBlindKiller(c.numberAssignMode !== "throw" && c.blindKiller === true);
      setBullSplash(c.bullSplash === true);
      setBullHeal(c.bullHeal === true);
      setBullHealLives(clampInt(c.bullHealLives, 1, 3, 1));
      setBullRotate(c.bullRotate === true);
      setShieldOnDBull(c.shieldOnDBull === true);
      setDisarmOnDBull(c.disarmOnDBull === true);
      setDbullRotate(c.dbullRotate === true);
      setShieldTurns(clampInt(c.shieldTurns, 1, 5, 1));
      setSelectBonusShield(c.selectBonusShield === true);
      setParticipantMode(c.participantMode === "teams" ? "teams" : "players");
      setTeamCount(clampInt(c.teamCount, 2, KILLER_TEAM_LIMITS.max, 2));
      setTeamSize(clampInt(c.teamSize, 2, 5, 2));
      setPlayerFormat(c.playerFormat === "multi" ? "multi" : "duel");
      setTeamAssignments({ ...(c.teamAssignments || {}) });
      setTeamNames(Array.isArray(c.teamNames) ? [...c.teamNames] : ["Équipe A", "Équipe B", "Équipe C", "Équipe D"]);
      setTeamsSourceMode(c.teamsSourceMode === "saved" || c.teamsSourceMode === "auto" ? c.teamsSourceMode : "manual");
      setSelectedBotTeamIds(Array.isArray(c.selectedBotTeamIds) ? c.selectedBotTeamIds.map(String) : []);
      setSelectedStoredTeamIds(Array.isArray(c.savedTeamIds) ? c.savedTeamIds.map(String) : []);
      setSavedTeamMemberSelections(c.savedTeamMemberSelections && typeof c.savedTeamMemberSelections === "object" ? { ...c.savedTeamMemberSelections } : {});
      setMissAutoHit(c.missAutoHit === true);
      setResurrectionMode(["off", "one_player_once", "all_once", "all"].includes(String(c.resurrectionMode)) ? c.resurrectionMode! : "off");
      setResurrectionLives(clampInt(c.resurrectionLives, 1, 6, 1));
    }
    setStartOrderMode(["random", "alternate", "manual", "bull"].includes(String(c.startOrderMode)) ? c.startOrderMode! : "alternate");
    // Les profils disparus sont ignorés, jamais recréés ; on conserve l'ordre de sélection.
    const ids = [...new Set((pref.selectedIds || []).map(String))].filter((id) => selectableIdSet.has(id)).slice(0, 20);
    if (ids.length) setSelectedIds(ids);
    if (pref.numberById && typeof pref.numberById === "object") setKillerNumberById({ ...pref.numberById });
  }

  const selectableIdSet = React.useMemo(() => {
    return new Set<string>([
      ...humanProfiles.map((p: any) => String(p?.id || "")),
      ...botProfiles.map((b: any) => String(b?.id || "")),
    ]);
  }, [humanProfiles, allAvailableBots]);

  React.useEffect(() => {
    // Attendre le chargement des bots ET celui des profils avant de supprimer une sélection restaurée.
    if (!botsLoaded || (!profiles.length && selectedIds.length > 0)) return;
    setSelectedIds((prev) => {
      const validPrev = prev.filter((id) => selectableIdSet.has(String(id || "")));
      if (validPrev.length > 0) return sameStringArray(prev, validPrev) ? prev : validPrev;
      if (humanProfiles.length >= 2) return [String(humanProfiles[0].id), String(humanProfiles[1].id)];
      if (humanProfiles.length === 1) return [String(humanProfiles[0].id)];
      return prev.length === 0 ? prev : [];
    });
  }, [humanProfiles, profiles.length, selectableIdSet, botsLoaded]);

  React.useEffect(() => {
    setKillerNumberById((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (!next[id]) next[id] = 20;
      }
      for (const id of Object.keys(next)) {
        if (!selectedIds.includes(id)) delete next[id];
      }
      return uniqueKillerNumbers(next);
    });
  }, [selectedIds]);

  function togglePlayer(id: string) {
    const exists = selectedIds.includes(id);
    const maxPlayers = participantMode === "players" ? (playerFormat === "duel" ? 2 : 20) : teamCount * teamSize;
    if (!exists && selectedIds.length >= maxPlayers) {
      alert(`Ce format autorise ${maxPlayers} participant(s) maximum.`);
      return;
    }
    setSelectedIds((prev) => {
      const isSelected = prev.includes(id);
      return isSelected ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }

  function randomizeNumbers() {
    if (numberAssignMode === "throw") return;
    setKillerNumberById((prev) => {
      const ids = Object.keys(prev);
      const pool = Array.from({ length: 20 }, (_, i) => i + 1);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const next: Record<string, number> = {};
      ids.forEach((id, idx) => (next[id] = pool[idx % pool.length]));
      return uniqueKillerNumbers(next);
    });
  }

  const miniRoundBtn: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.25)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };

  // L'ossature collective KILLER ne change pas : nous adaptons uniquement
  // les sélections X01 à la liste d'équipes transmise au lancement.
  // Un joueur nouvellement sélectionné n'ouvre pas une nouvelle équipe.
  // Par défaut, on constitue Gold/Pink en alternance (2v2 pour 4 joueurs).
  // Les affectations manuelles restent prioritaires, et Blue/Green sont disponibles
  // uniquement si une vraie composition multi-équipes est choisie.
  const manualTeamAssignments = React.useMemo(() => {
    const counts = Array.from({ length: teamCount }, () => 0);
    const assignment: Record<string, number> = {};
    for (const id of selectedIds) {
      const proposed = Number(teamAssignments[id]);
      let team = Number.isInteger(proposed) && proposed >= 0 && proposed < teamCount && counts[proposed] < teamSize ? proposed : -1;
      if (team < 0) team = counts.findIndex((count) => count < teamSize);
      // En surnombre : ne pas inventer une équipe supplémentaire.
      if (team < 0) continue;
      assignment[id] = team;
      counts[team]++;
    }
    return assignment;
  }, [selectedIds, teamAssignments, teamCount, teamSize]);
  const teamMembersByIndex = groupKillerTeamMembers(selectedIds.filter((id) => manualTeamAssignments[id] !== undefined), manualTeamAssignments, teamCount);
  const botTeamsCatalog = React.useMemo(() => [
    ...buildX01DartsBotTeams(X01_PRO_BOTS),
    ...storedDartsTeams.filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length >= 2 &&
      team.playerIds.every((id: string) => allAvailableBots.some((bot: any) => String(bot.id) === String(id)))).map((team: any) => ({
      ...team,
      members: (team.playerIds || []).map((id: string) => allAvailableBots.find((bot: any) => String(bot.id) === String(id))).filter(Boolean),
    })),
  ], [storedDartsTeams, allAvailableBots]);
  const humanStoredDartsTeams = React.useMemo(() => storedDartsTeams.filter((team: any) =>
    (team.playerIds || []).every((id: string) =>
      humanProfiles.some((profile: any) => String(profile.id) === String(id))
    )
  ), [storedDartsTeams, humanProfiles]);
  const teamProfiles = React.useMemo(() => {
    const byId = new Map<string, any>();
    for (const p of [...humanProfiles, ...allAvailableBots]) {
      const id = String((p as any)?.id || "");
      if (id && !byId.has(id)) byId.set(id, { ...p, id, name: String((p as any)?.name || "Joueur") });
    }
    return Array.from(byId.values());
  }, [humanProfiles, allAvailableBots]);
  const selectedBotTeamGroups = React.useMemo(() => selectedBotTeamIds.map((instanceId) => {
    const baseId = String(instanceId).split("__slot_")[0];
    const team = botTeamsCatalog.find((t: any) => String(t.id) === baseId);
    const ids = (savedTeamMemberSelections[instanceId] || team?.playerIds || []).map(String);
    return team ? { instanceId, team, ids: [...new Set(ids)] } : null;
  }).filter(Boolean) as Array<{ instanceId: string; team: any; ids: string[] }>, [selectedBotTeamIds, botTeamsCatalog, savedTeamMemberSelections]);
  const botTeamsForPicker = botTeamsCatalog;
  const storedTeamSelection = React.useMemo(() => {
    return selectedStoredTeamIds.map((instanceId) => {
      const baseId = String(instanceId).split("__slot_")[0];
      const team = storedDartsTeams.find((t: any) => String(t?.id) === baseId) || findRememberedGeneratedTeam(baseId);
      const ids = (savedTeamMemberSelections[instanceId] || (team?.playerIds || [])).map(String);
      return team ? { instanceId, team, ids: [...new Set(ids)] } : null;
    }).filter(Boolean) as Array<{ instanceId: string; team: any; ids: string[] }>;
  }, [selectedStoredTeamIds, savedTeamMemberSelections, storedDartsTeams]);
  const activeTeamGroups = teamsSourceMode === "manual"
    ? teamMembersByIndex.map((ids, idx) => {
      const preset = KILLER_MANUAL_TEAM_PRESETS[idx] || KILLER_MANUAL_TEAM_PRESETS[0];
      return {
        ids,
        name: preset.name,
        short: preset.short,
        color: preset.color,
        ring: preset.ring,
        teamId: `killer-team-${preset.id}`,
        source: "manual" as const,
        logo: preset.logo || null,
      };
    }).filter((group) => group.ids.length > 0)
    : [...storedTeamSelection.map((item) => ({ ...item, source: "stored" as const })), ...selectedBotTeamGroups.map((item) => ({ ...item, source: "bot" as const }))].map((item, idx) => ({ ids: item.ids, source: item.source, name: String(item.team?.name || `Équipe ${idx + 1}`), short: String(item.team?.name || `Équipe ${idx + 1}`).slice(0, 2).toUpperCase(), teamId: item.instanceId, logo: item.team?.logoDataUrl || item.team?.logoUrl || item.team?.avatarDataUrl || null, color: primary, ring: primary }));
  const validTeams = activeTeamGroups.length === teamCount && activeTeamGroups.every((g) =>
    g.ids.length === teamSize && g.ids.every((id) => !!teamProfiles.find((p: any) => String(p.id) === id))
  ) && new Set(activeTeamGroups.flatMap((g) => g.ids)).size === activeTeamGroups.reduce((sum, g) => sum + g.ids.length, 0)
    && (teamsSourceMode !== "manual" || selectedIds.length === teamCount * teamSize);
  const validPlayers = playerFormat === "duel" ? selectedIds.length === 2 : selectedIds.length >= 2 && selectedIds.length <= 20;
  const canStart = participantMode === "teams" ? validTeams : validPlayers;
  const selectedParticipantIds = participantMode === "teams"
    ? [...new Set(activeTeamGroups.flatMap((g) => g.ids))] : selectedIds;
  const teamCreateEligibleMembers = teamCreateKind === "bots" ? allAvailableBots : humanProfiles;
  const teamCreatePageSize = 9;
  const teamCreatePages = Math.max(1, Math.ceil(teamCreateEligibleMembers.length / teamCreatePageSize));
  const safeTeamCreatePage = Math.min(teamCreatePages - 1, Math.max(0, teamCreatePage));
  const teamCreatePageItems = teamCreateEligibleMembers.slice(safeTeamCreatePage * teamCreatePageSize, safeTeamCreatePage * teamCreatePageSize + teamCreatePageSize);

  const x01ManualTeamKeys = ["gold", "pink", "blue", "green"] as const;
  function setX01ManualTeam(id: string, x01Team: string) {
    const index = x01ManualTeamKeys.findIndex((key) => key === String(x01Team).toLowerCase());
    if (index < 0 || index >= teamCount) return;
    const occupied = Object.entries(manualTeamAssignments).filter(([playerId, team]) => playerId !== id && team === index).length;
    if (occupied >= teamSize) return;
    setTeamAssignments((prev) => ({ ...prev, [id]: index }));
  }
  function addStoredTeamSelection(teamId: string, playerIds: string[]) {
    const baseId = String(teamId || "").split("__slot_")[0];
    const ids = [...new Set(playerIds.map(String))].filter((id) => teamProfiles.some((p: any) => p.id === id));
    if (!baseId) return;
    if (ids.length !== teamSize) { alert(`Sélectionne exactement ${teamSize} membres pour cette équipe.`); return; }
    if (selectedStoredTeamIds.length + selectedBotTeamIds.length >= teamCount) { alert(`Maximum ${teamCount} équipes pour ce format.`); return; }
    setSelectedStoredTeamIds((prev) => {
      const existing = prev.filter((id) => id.split("__slot_")[0] === baseId).length;
      const instanceId = existing ? `${baseId}__slot_${existing + 1}` : baseId;
      setSavedTeamMemberSelections((old) => ({ ...old, [instanceId]: ids }));
      return [...prev, instanceId].slice(0, KILLER_TEAM_LIMITS.max);
    });
  }
  function removeStoredTeamSelection(instanceId: string) {
    setSelectedStoredTeamIds((prev) => prev.filter((id) => id !== instanceId));
    setSavedTeamMemberSelections((prev) => { const next = { ...prev }; delete next[instanceId]; return next; });
  }
  function toggleStoredTeam(teamId: string) {
    const baseId = String(teamId || "");
    const selected = selectedStoredTeamIds.find((id) => id.split("__slot_")[0] === baseId);
    if (selected) removeStoredTeamSelection(selected);
    else {
      const team = humanStoredDartsTeams.find((item: any) => String(item?.id) === baseId);
      if (team) addStoredTeamSelection(baseId, team.playerIds || []);
    }
  }
  function addBotTeamMembers(teamId: string, memberIds: string[]): boolean {
    const baseId = String(teamId || "");
    const ids = [...new Set(memberIds.map(String))].filter((id) => teamProfiles.some((p: any) => p.id === id));
    if (ids.length !== teamSize) {
      setBotMemberError(`Sélectionne exactement ${teamSize} bots différents.`);
      return false;
    }
    if (!editingBotInstanceId && selectedBotTeamIds.length + selectedStoredTeamIds.length >= teamCount) {
      setBotMemberError(`Cette partie accepte ${teamCount} équipes maximum.`);
      return false;
    }
    if (selectedBotTeamGroups.some((team) => team.instanceId !== editingBotInstanceId && team.ids.some((id) => ids.includes(id))) || storedTeamSelection.some((team) => team.ids.some((id) => ids.includes(id)))) {
      setBotMemberError("Un de ces bots appartient déjà à une équipe sélectionnée.");
      return false;
    }
    const instanceId = editingBotInstanceId || `${baseId}__slot_${Date.now()}`;
    setSavedTeamMemberSelections((prev) => ({ ...prev, [instanceId]: ids }));
    if (!editingBotInstanceId) setSelectedBotTeamIds((prev) => [...prev, instanceId]);
    setTeamsSourceMode("saved");
    setBotTeamEditing(null);
    setEditingBotInstanceId(null);
    setBotTeamMembersDraft([]);
    setBotMemberPage(0);
    setBotMemberError("");
    if (teamPickerScrollRef.current) teamPickerScrollRef.current.scrollTop = 0;
    return true;
  }
  function openBotTeamMembers(team: any, instanceId?: string) {
    if (teamPickerScrollRef.current) teamPickerScrollRef.current.scrollTop = 0;
    setBotTeamEditing(team);
    setEditingBotInstanceId(instanceId || null);
    const previous = instanceId ? selectedBotTeamGroups.find((g) => g.instanceId === instanceId) : null;
    setBotTeamMembersDraft(previous?.ids.length === teamSize ? [...previous.ids] : []);
    setBotMemberPage(0);
    setBotMemberError("");
  }
  function chooseBotTeamMember(botId: string) {
    if (!botTeamEditing) return;
    const id = String(botId);
    if (botTeamMembersDraft.includes(id)) {
      setBotTeamMembersDraft((prev) => prev.filter((value) => value !== id));
      setBotMemberError("");
      return;
    }
    const next = [...botTeamMembersDraft, id];
    if (next.length === teamSize) {
      // Dernier avatar : validation immédiate, puis retour à la galerie des équipes.
      if (!addBotTeamMembers(botTeamEditing.id, next)) setBotTeamMembersDraft(next.slice(0, 1));
    } else {
      setBotTeamMembersDraft(next);
      setBotMemberError("");
    }
  }
  function removeBotTeamMembers(instanceId: string) {
    setSelectedBotTeamIds((prev) => prev.filter((id) => id !== instanceId));
    setSavedTeamMemberSelections((prev) => { const next = { ...prev }; delete next[instanceId]; return next; });
    if (editingBotInstanceId === instanceId) { setBotTeamEditing(null); setEditingBotInstanceId(null); setBotTeamMembersDraft([]); }
  }
  function removeSelectedTeam(group: (typeof activeTeamGroups)[number]) {
    if (group.source === "bot") return removeBotTeamMembers(group.teamId);
    if (group.source === "stored") return removeStoredTeamSelection(group.teamId);
    setSelectedIds((prev) => prev.filter((id) => !group.ids.includes(id)));
    setTeamAssignments((prev) => { const next = { ...prev }; group.ids.forEach((id) => delete next[id]); return next; });
  }
  function editSelectedTeam(group: (typeof activeTeamGroups)[number]) {
    if (group.source === "bot") {
      const selection = selectedBotTeamGroups.find((item) => item.instanceId === group.teamId);
      if (selection) { openTeamPicker("bots"); openBotTeamMembers(selection.team, selection.instanceId); }
    } else openTeamPicker(group.source === "manual" ? "manual" : "saved");
  }
  function openCreateTeam(kind: "players" | "bots" = teamPickerTab === "bots" ? "bots" : "players") {
    setTeamCreateKind(kind);
    setTeamPickerOpen(false);
    setTeamCreateError("");
    setTeamCreateName("");
    setTeamCreateLogo(null);
    setTeamCreateMembers([]);
    setTeamCreatePage(0);
    setTeamCreateOpen(true);
  }
  function runCreationChoice(kind: "profile" | "bot" | "team" | "bot-team") {
    setCreationMenuOpen(false);
    if (kind === "team" || kind === "bot-team") {
      openCreateTeam(kind === "bot-team" ? "bots" : "players");
      return;
    }
    openQuickCreate(kind);
  }

  function readTeamLogo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setTeamCreateError("Choisis une image de 2 Mo maximum.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setTeamCreateLogo(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => setTeamCreateError("Le logo n'a pas pu être importé.");
    reader.readAsDataURL(file);
  }
  function saveNewTeam(event: React.FormEvent) {
    event.preventDefault();
    const name = teamCreateName.trim();
    const eligibleMembers = teamCreateKind === "bots" ? allAvailableBots : humanProfiles;
    const ids = [...new Set(teamCreateMembers)].filter((id) => eligibleMembers.some((p: any) => String(p.id) === id));
    if (!name || ids.length !== teamSize) { setTeamCreateError(`Nomme l'équipe et sélectionne exactement ${teamSize} membres.`); return; }
    if (selectedStoredTeamIds.length + selectedBotTeamIds.length >= teamCount) {
      setTeamCreateError(`Maximum ${teamCount} équipes pour cette partie.`); return;
    }
    const alreadyUsed = new Set([...storedTeamSelection, ...selectedBotTeamGroups].flatMap((team) => team.ids));
    if (ids.some((id) => alreadyUsed.has(id))) {
      setTeamCreateError("Un membre appartient déjà à une autre équipe sélectionnée."); return;
    }
    try {
      const newTeam = createTeam({ sport: "darts", name, logoDataUrl: teamCreateLogo, teamKind: "leisure" });
      upsertTeam({ ...newTeam, playerIds: ids });
      setTeamStoreRevision((v) => v + 1);
      if (teamCreateKind === "bots") setSelectedBotTeamIds((prev) => [...prev, newTeam.id]);
      else setSelectedStoredTeamIds((prev) => [...prev, newTeam.id]);
      setSavedTeamMemberSelections((prev) => ({ ...prev, [newTeam.id]: ids }));
      setTeamsSourceMode("saved");
      setTeamPickerTab(teamCreateKind === "bots" ? "bots" : "saved");
      setTeamCreateOpen(false);
    } catch (error) {
      setTeamCreateError(error instanceof Error ? error.message : "Impossible d'enregistrer cette équipe.");
    }
  }
  function openTeamPicker(tab: "manual" | "saved" | "auto" | "bots") {
    setBotTeamEditing(null);
    setEditingBotInstanceId(null);
    setBotTeamMembersDraft([]);
    setBotMemberPage(0);
    setBotMemberError("");
    setTeamPickerTab(tab);
    if (tab !== "bots") setTeamsSourceMode(tab);
    else setTeamsSourceMode("saved");
    setTeamPickerOpen(true);
  }
  function toggleSavedTeamMember(teamId: string, playerId: string) {
    setSavedTeamMemberSelections((prev) => {
      const current = prev[teamId] || [];
      return { ...prev, [teamId]: current.includes(playerId) ? current.filter((id) => id !== playerId) : current.length < teamSize ? [...current, playerId] : current };
    });
  }
  function resolvePlayer(id: string) {
    const human = profiles.find((p) => p.id === id);
    if (human) {
      return {
        id: human.id,
        name: human.name,
        avatarDataUrl: pickAvatar(human),
        isBot: !!(human as any).isBot,
        botLevel: (human as any).botLevel ?? undefined,
      };
    }
    const bot = allAvailableBots.find((b) => b.id === id);
    if (bot) {
      return {
        id: bot.id,
        name: bot.name,
        avatarDataUrl: normalizeImgSrc(bot.avatarDataUrl) ?? (bot.avatarDataUrl ?? null),
        isBot: true,
        botLevel: bot.botLevel ?? undefined,
      };
    }
    return null;
  }

  function handleStart() {
    if (participantMode === "teams" && !validTeams) {
      alert(`Sélectionne exactement ${teamCount} équipes de ${teamSize} membres distincts.`);
      return;
    }
    if (participantMode === "players" && !validPlayers) {
      alert(playerFormat === "duel" ? "Le duel exige exactement 2 joueurs." : "Le Multi exige de 2 à 20 joueurs.");
      return;
    }
    if (selectedParticipantIds.length < 2) {
      alert("Ajoute au moins 2 joueurs (profils locaux ou bots).");
      return;
    }
    if (selectedParticipantIds.length > 20) {
      alert("Killer est limité à 20 participants afin de conserver des numéros uniques de 1 à 20.");
      return;
    }

    const effectiveNumberAssignMode: KillerNumberAssignMode = isProgressive ? "throw" : numberAssignMode;

    const players: KillerConfigPlayer[] = selectedParticipantIds
      .map((id) => {
        const base = resolvePlayer(id);
        if (!base) return null;

        return {
          id: base.id,
          name: base.name,
          avatarDataUrl: base.avatarDataUrl ?? null,
          isBot: !!base.isBot,
          botLevel: base.botLevel,
          number: effectiveNumberAssignMode === "throw" ? 0 : clampInt(killerNumberById[id], 1, 20, 20),
        };
      })
      .filter(Boolean) as any[];

    if (effectiveNumberAssignMode !== "throw") {
      const used = new Set<number>();
      for (const p of players) {
        let n = clampInt(p.number, 1, 20, 20);
        while (used.has(n)) {
          n = n - 1;
          if (n < 1) n = 20;
        }
        used.add(n);
        p.number = n;
      }
    }

    // En équipes, le moteur KILLER conserve UNE entité de jeu par équipe :
    // numéro, statut, boucliers, vies, éliminations et vainqueur sont collectifs.
    // Les membres jouent à tour de rôle à chaque nouveau passage de leur équipe.
    const playEntities: KillerConfigPlayer[] = participantMode === "teams"
      ? activeTeamGroups.map((group, idx) => {
          const members = group.ids.map((id) => players.find((p) => p.id === id)).filter(Boolean) as KillerConfigPlayer[];
          const first = members.find((m) => !m.isBot) || members[0];
          const orderedMembers = [first, ...members.filter((m) => m.id !== first.id)];
          return {
            id: `killer-team-${idx + 1}`,
            teamId: group.teamId,
            name: group.name,
            avatarDataUrl: group.logo || first?.avatarDataUrl || null,
            isBot: !!first?.isBot,
            botLevel: first?.botLevel,
            number: effectiveNumberAssignMode === "throw" ? 0 : Number(first?.number || idx + 1),
            teamMembers: orderedMembers.map((m) => ({ id: m.id, name: m.name, avatarDataUrl: m.avatarDataUrl ?? null, isBot: !!m.isBot, botLevel: m.botLevel })),
          };
        })
      : players;
    const finalPlayers = startOrderMode === "random" ? shuffleArray(playEntities) : playEntities;

    const cfg: KillerConfig = {
      id: `${isProgressive ? "killer-progressive" : "killer"}-${Date.now()}`,
      mode: "killer",
      createdAt: Date.now(),
      variantId: isProgressive ? "progressive" : "classic",
      gameId: isProgressive ? "killer_progressive" : "killer",
      progressiveTarget: isProgressive ? 5 : undefined,
      participantMode,
      teamCount: participantMode === "teams" ? activeTeamGroups.length : undefined,
      teamSize: participantMode === "teams" ? teamSize : undefined,
      playerFormat: participantMode === "players" ? playerFormat : undefined,
      teamAssignments: participantMode === "teams" ? { ...manualTeamAssignments } : undefined,
      teamNames: participantMode === "teams" ? [...teamNames] : undefined,
      teamsSourceMode: participantMode === "teams" ? teamsSourceMode : undefined,
      savedTeamIds: participantMode === "teams" ? [...selectedStoredTeamIds] : undefined,
      selectedBotTeamIds: participantMode === "teams" ? [...selectedBotTeamIds] : undefined,
      savedTeamMemberSelections: participantMode === "teams" ? { ...savedTeamMemberSelections } : undefined,

      lives: isProgressive ? 5 : clampInt(lives, 1, 9, 3),
      becomeRule: isProgressive ? "single" : becomeRule,
      damageRule: isProgressive ? "multiplier" : damageRule,

      numberAssignMode: effectiveNumberAssignMode,
      randomStartOrder: startOrderMode === "random",
      startOrderMode,

      selfHitWhileKiller: isProgressive ? false : selfHitWhileKiller,
      selfHitUsesMultiplier: isProgressive ? false : selfHitUsesMultiplier,
      lifeSteal: isProgressive ? false : lifeSteal,
      blindKiller: isProgressive ? false : blindKiller,

      bullSplash: isProgressive ? false : bullSplash,
      bullHeal: isProgressive ? false : bullHeal,
      bullHealLives: isProgressive ? 1 : clampInt(bullHealLives, 1, 3, 1),
      bullRotate: isProgressive ? false : bullRotate,

      shieldOnDBull: isProgressive ? false : shieldOnDBull,
      disarmOnDBull: isProgressive ? false : disarmOnDBull,
      dbullRotate: isProgressive ? false : dbullRotate,
      shieldTurns: isProgressive ? 1 : clampInt(shieldTurns, 1, 5, 1),
      selectBonusShield: isProgressive ? false : selectBonusShield,
      missAutoHit: isProgressive ? false : missAutoHit,

      resurrectionMode: isProgressive ? "off" : resurrectionMode,
      resurrectionEnabled: isProgressive ? false : resurrectionMode !== "off",
      resurrection: isProgressive ? false : resurrectionMode !== "off",
      resurrectionLives: isProgressive ? 1 : clampInt(resurrectionLives, 1, 6, 1),

      players: finalPlayers,
    };

    // Enregistrer seulement lors d'un vrai lancement, sans avatar ni ID de partie.
    // Le numéro aléatoire n'est pas mémorisé comme choix : il sera recalculé à la prochaine partie.
    const { players: _participantDetails, id: _matchId, createdAt: _createdAt, ...persistentConfig } = cfg;
    const launchPreference: KillerLaunchPreference = {
      config: persistentConfig,
      selectedIds: [...selectedParticipantIds],
      numberById: effectiveNumberAssignMode === "none" ? { ...killerNumberById } : {},
    };
    if (startCb || typeof go === "function") {
      saveKillerLaunchPreference(isProgressive, launchPreference);
      setHasLastPreference(true);
      setHasFrequentPreference(!!getMostPlayedKillerPreference(isProgressive));
    }

    try { recordProfileUsageForMode(cfg.gameId || cfg.variantId || "killer", participantMode === "teams" ? selectedParticipantIds : finalPlayers.map((p: any) => p.id)); } catch {}

    if (startCb) {
      startCb(cfg);
      return;
    }
    if (typeof go === "function") {
      go("killer_play", { config: cfg });
      return;
    }

    console.error("[KillerConfig] Aucun callback de start fourni (onStart/onStartGame/onPlay/go).");
    alert("Impossible de lancer : callback manquant (voir console).");
  }

  // ------------------ render ------------------
  const blindLocksThrow = !!blindKiller;

  return (
    <div
      className="screen killer-config-v3 msc-mode-config msc-mode-config--split"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 76px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      
{/* HEADER TICKER */}
<div
  style={{
    position: "sticky",
    top: 0,
    zIndex: 60,
    paddingTop: "env(safe-area-inset-top)",
    marginBottom: 10,
  }}
>
  <div style={{ position: "relative", marginLeft: -12, marginRight: -12 }}>
    <img
      src={isProgressive ? (String(lang).startsWith("fr") ? tickerKillerProgressiveFr : tickerKillerProgressiveEn) : tickerKiller}
      alt={isProgressive ? "Killer Progressif" : "Killer"}
      draggable={false}
      style={{ width: "100%", height: 92, objectFit: "cover", display: "block" }}
    />
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
          onClick={() => (onBack ? onBack() : typeof go === "function" ? go("games") : null)}
          title={t?.("common.back", "Retour") ?? "Retour"}
          size={42}
          color={primary}
          glow={`${primary}AA`}
        />
      </div>
      <div style={{ pointerEvents: "auto" }}>
        <InfoDot
          onClick={() => setInfoOpen(true)}
          title={t?.("common.rules", "Règles") ?? "Règles"}
          size={42}
          color={primary}
          glow={`${primary}AA`}
        />
      </div>
    </div>
  </div>
</div>

      {/* Ancre stable gérée par React : la barre Guidée / Complète reste présente après les rerenders. */}
      <div data-mss-config-guide-anchor="1" style={{ flexShrink: 0 }} />

      <DartsRelatedModesPanel gameId={isProgressive ? "killer_progressive" : "killer"} accent={primary} compact onOpenGame={id => { const target=dartsFamilyGameNavigation(id); if(target) go?.(target.tab, target.params); }} />
      {/* CONTENT */}
      <div ref={contentRef as any} className="msc-mode-config-body" style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12 }}>
        {(hasLastPreference || hasFrequentPreference) && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            {hasLastPreference && (
              <button type="button" onClick={() => restoreLaunchPreference(readKillerLaunchPreferences(isProgressive).last)}
                title="Restaurer les paramètres et participants de la dernière partie lancée"
                style={{ borderRadius: 12, padding: "7px 11px", background: "rgba(255,198,58,.10)", border: `1px solid ${primary}66`, color: primary, fontWeight: 800, fontSize: 11, cursor: "pointer" }}>
                ↶ Dernière partie
              </button>
            )}
            {hasFrequentPreference && (
              <button type="button" onClick={() => restoreLaunchPreference(getMostPlayedKillerPreference(isProgressive))}
                title="Restaurer la configuration la plus souvent utilisée"
                style={{ borderRadius: 12, padding: "7px 11px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.16)", color: textMain, fontWeight: 800, fontSize: 11, cursor: "pointer" }}>
                ★ Configuration favorite
              </button>
            )}
          </div>
        )}
        {!isProgressive && (
          <section
            data-mss-guide-section="awena-intro"
            data-mss-guide-label="Awena vous explique"
            data-mss-guide-order="0"
            className="killer-config-overview"
            style={{
              background: "rgba(10,12,24,0.94)",
              borderRadius: 18,
              padding: 12,
              marginBottom: 14,
              boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
              border: `1px solid ${primary}33`,
            }}
          >
            <div className="killer-config-overview-inner" style={{ display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: 12 }}>
              <div className="killer-config-mode-panel" style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 900, color: primary }}>
                  Configuration Killer
                </div>

                <div style={{ fontSize: 11, color: "#9298bb", lineHeight: 1.4 }}>
                  Configure les joueurs, l’attribution des numéros, les vies et les variantes du Killer. Awena peut aussi te présenter les règles en vidéo.
                </div>

                <div className="killer-config-awena-wide-banner" style={{ marginTop: "auto", width: "100%" }}>
                  <div
                    style={{
                      position: "relative",
                      height: 44,
                      borderRadius: 14,
                      overflow: "hidden",
                      boxShadow: `0 0 16px ${primary}20`,
                      border: `1px solid ${primary}30`,
                    }}
                  >
                    <svg
                      viewBox="0 0 760 88"
                      preserveAspectRatio="none"
                      style={{ display: "block", width: "100%", height: "100%" }}
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="killerAwenaExplainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={primary} stopOpacity="0.96" />
                          <stop offset="55%" stopColor="#ffe09a" stopOpacity="0.96" />
                          <stop offset="100%" stopColor="#ff9adf" stopOpacity="0.96" />
                        </linearGradient>
                        <mask id="killerAwenaExplainCutoutMask">
                          <rect x="0" y="0" width="760" height="88" rx="16" ry="16" fill="white" />
                          <text
                            x="380"
                            y="57"
                            textAnchor="middle"
                            fontSize="28"
                            fontWeight="900"
                            letterSpacing="1.6"
                            fill="black"
                          >
                            {killerRulesVideoIsFrench ? "AWENA VOUS EXPLIQUE" : "AWENA EXPLAINS"}
                          </text>
                        </mask>
                      </defs>
                      <rect x="0" y="0" width="760" height="88" rx="16" ry="16" fill="url(#killerAwenaExplainGradient)" mask="url(#killerAwenaExplainCutoutMask)" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-mss-guide-awena-trigger="1"
                className="killer-config-awena-sidecard"
                onClick={() => setRulesVideoOpen(true)}
                aria-label={killerRulesVideoIsFrench ? "Voir la vidéo Awena des règles du Killer" : "Watch Awena's Killer rules video"}
                title={killerRulesVideoIsFrench ? "Awena · Voir l’explication vidéo" : "Awena · Watch rules video"}
                style={{
                  flex: "0 0 auto",
                  width: 98,
                  alignSelf: "stretch",
                  borderRadius: 18,
                  border: `1px solid ${primary}66`,
                  background: "linear-gradient(180deg, rgba(10,14,28,.98), rgba(6,8,18,.98))",
                  padding: 5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  cursor: "pointer",
                  boxShadow: `0 0 20px ${primary}1c`,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "9 / 16",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#050713",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.05)",
                  }}
                >
                  <img src={killerAwenaRulesPoster} alt={killerRulesVideoIsFrench ? "Awena vous explique le Killer" : "Awena explains Killer"} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.36))" }} />
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "rgba(4,8,18,.82)",
                      border: `1px solid ${primary}77`,
                      boxShadow: `0 0 18px ${primary}30`,
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ▶
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      right: 6,
                      bottom: 6,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "rgba(5,8,18,.86)",
                      border: "1px solid rgba(255,255,255,.12)",
                      color: "#fff",
                      fontSize: 9.5,
                      fontWeight: 900,
                    }}
                  >
                    {killerRulesVideoDuration}
                  </div>
                </div>
                <div style={{ textAlign: "left", minWidth: 0, padding: "0 3px 2px" }}>
                  <div style={{ color: primary, fontSize: 9.5, fontWeight: 950, letterSpacing: .75, textTransform: "uppercase" }}>
                    AWENA · KILLER
                  </div>
                  <div style={{ marginTop: 2, color: "#e9ebf7", fontSize: 10.5, fontWeight: 800, lineHeight: 1.2 }}>
                    {killerRulesVideoIsFrench ? "Voir la vidéo" : "Watch video"}
                  </div>
                </div>
              </button>
            </div>
          </section>
        )}

        {isProgressive && (
          <div
            style={{
              marginBottom: 12,
              padding: "12px 14px",
              borderRadius: 16,
              border: `1px solid ${primary}66`,
              background: `${primary}14`,
              boxShadow: `0 0 18px ${primary}22`,
            }}
          >
            <div style={{ color: primary, fontWeight: 1000, letterSpacing: 1.1, textTransform: "uppercase" }}>
              Killer Progressif
            </div>
            <div style={{ marginTop: 5, fontSize: 12, color: "#d7daf0", lineHeight: 1.35 }}>
              Règles fixes : 0 → 5 cœurs pour devenir KILLER, perte du statut sous 5 et élimination uniquement sous 0.
            </div>
          </div>
        )}

        {creationMenuOpen && (
          <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreationMenuOpen(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 10110, background: "rgba(0,0,0,.82)", display: "grid", placeItems: "center", padding: 14 }}>
            <div role="dialog" aria-modal="true" aria-label="Choisir le type de création"
              style={{ width: "min(430px,100%)", boxSizing: "border-box", background: "#0b0e1b", border: `1px solid ${primary}88`, borderRadius: 18, padding: 15, display: "grid", gap: 17, boxShadow: "0 20px 60px rgba(0,0,0,.6)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: primary, fontSize: 14, fontWeight: 1000, letterSpacing: .8 }}>CRÉER</span>
                <button type="button" onClick={() => setCreationMenuOpen(false)} aria-label="Fermer" style={{ border: 0, background: "transparent", color: primary, fontSize: 26, cursor: "pointer" }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${participantMode === "teams" ? 4 : 2}, minmax(0,1fr))`, gap: 6, alignItems: "start" }}>
                {([
                  { kind: "profile", icon: "players", label: "JOUEUR" },
                  { kind: "bot", icon: "bots", label: "BOT CPU" },
                  ...(participantMode === "teams" ? [
                    { kind: "team", icon: "teams", label: "ÉQUIPE" },
                    { kind: "bot-team", icon: "bot-teams", label: "TEAM BOT" },
                  ] : []),
                ] as Array<{ kind: "profile" | "bot" | "team" | "bot-team"; icon: any; label: string }>).map((choice) => (
                  <div key={choice.kind} style={{ display: "grid", justifyItems: "center", gap: 7, minWidth: 0 }}>
                    <MssSelectorIconButton icon={choice.icon} label={`Créer ${choice.label.toLowerCase()}`} accent={primary} onClick={() => runCreationChoice(choice.kind)} />
                    <span style={{ fontSize: 10, fontWeight: 950, textAlign: "center", lineHeight: 1.25, color: primary }}>{choice.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {quickCreateOpen && (
          <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setQuickCreateOpen(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 10120, display: "grid", placeItems: "center", padding: 14, background: "rgba(0,0,0,.79)" }}>
            <form onSubmit={createQuickParticipant} role="dialog" aria-modal="true" aria-label="Créer un participant"
              style={{ width: "min(460px, 100%)", maxHeight: "88dvh", overflowY: "auto", borderRadius: 18, padding: 14,
                background: "#0c0e19", border: `1px solid ${primary}88`, display: "grid", gap: 12, boxShadow: "0 16px 60px #000" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: primary, fontWeight: 900 }}>
                <span>{quickCreateKind === "profile" ? "CRÉER UN JOUEUR" : "CRÉER UN BOT CPU"}</span>
                <button type="button" onClick={() => setQuickCreateOpen(false)} aria-label="Fermer" style={{ color: primary, background: "none", border: 0, fontSize: 24, cursor: "pointer" }}>×</button>
              </div>
              <div style={{ border: `1px solid ${primary}44`, borderRadius: 14, padding: 10, background: "rgba(0,0,0,.22)" }}>
                <div style={{ color: primary, fontSize: 11, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
                  {quickCreateKind === "profile" ? "Créer un profil local" : "Créer un bot CPU"}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button type="button" aria-label="Choisir un avatar" title="Choisir un avatar MSS ou importer une image"
                    onClick={() => setQuickAvatarPickerOpen(true)}
                    style={{ width: 62, height: 62, flex: "0 0 62px", borderRadius: "50%", overflow: "hidden", padding: 0,
                      border: `1px solid ${primary}77`, background: "#161827", color: "#d8def0", cursor: "pointer" }}>
                    {quickCreateAvatar ? <img src={quickCreateAvatar} alt="Avatar choisi" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Avatar"}
                  </button>
                  <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 0 }}>
                    <input autoFocus required maxLength={32} value={quickCreateName} onChange={(e) => setQuickCreateName(e.target.value)}
                      aria-label="Nom du participant" placeholder={quickCreateKind === "bot" ? "Nom du bot" : "Nom du profil"}
                      style={{ width: "100%", boxSizing: "border-box", borderRadius: 11, padding: 11, background: "#101119", border: "1px solid rgba(255,255,255,.12)", color: "white" }} />
                    <input maxLength={48} value={quickCreateCountry} onChange={(e) => setQuickCreateCountry(e.target.value)}
                      aria-label="Pays" placeholder="Pays"
                      style={{ width: "100%", boxSizing: "border-box", borderRadius: 11, padding: 11, background: "#101119", border: "1px solid rgba(255,255,255,.12)", color: "white" }} />
                  </div>
                  <button type="submit" disabled={!quickCreateName.trim() || quickCreateBusy} title="Créer et ajouter"
                    aria-label="Créer et ajouter le participant"
                    style={{ width: 54, height: 54, flex: "0 0 54px", borderRadius: 14, border: `1px solid ${primary}`,
                      color: "#fff", fontSize: 35, fontWeight: 300, background: `${primary}33`, cursor: "pointer",
                      boxShadow: `0 0 18px ${primary}88`, opacity: !quickCreateName.trim() || quickCreateBusy ? .55 : 1 }}>+</button>
                </div>
              </div>
              {quickCreateKind === "bot" && <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#ddd" }}>Niveau de performance
                <select value={quickCreateLevel} onChange={(e) => setQuickCreateLevel(e.target.value as any)}
                  style={{ padding: 11, borderRadius: 10, background: "#161827", color: "white", border: `1px solid ${primary}66` }}>
                  <option value="easy">Débutant</option><option value="medium">Intermédiaire</option><option value="strong">Confirmé</option>
                  <option value="pro">Expert</option><option value="legend">Légende</option>
                </select>
              </label>}
              {quickCreateError && <div role="alert" style={{ color: "#ff9b8b", fontSize: 12 }}>{quickCreateError}</div>}
              <div style={{ color: "#aeb6cc", fontSize: 11 }}>Appuie sur l’avatar pour choisir parmi les avatars MSS ou importer une image.</div>
            </form>
            <MssIntegratedAvatarPicker open={quickAvatarPickerOpen} onClose={() => setQuickAvatarPickerOpen(false)}
              onChooseFile={(file) => readQuickAvatar(file)} />
          </div>
        )}

        {/* SÉLECTEUR UNIFIÉ MSS : une bande d’icônes et une zone de sélection commune. */}
        <section
          data-mss-guide-section="killer-participant-mode"
          data-mss-guide-label="Mode participants"
          data-mss-guide-order="1"
          style={{
            background: cardBg, borderRadius: 18, padding: "14px 12px",
            marginBottom: 14, boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary }}>Participants</span>
            <button type="button" onClick={() => setTeamInfoOpen(true)} aria-label="Informations sur les équipes KILLER"
              title="Informations sur les équipes" style={{ width: 24, height: 24, borderRadius: 99, border: `1px solid ${primary}77`, background: "rgba(255,255,255,.04)", color: primary, fontWeight: 900, cursor: "pointer" }}>i</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }} role="group" aria-label="Type de partie">
            <KillerParticipantModeButton mode="players" label="Joueurs" accent={primary} active={participantMode === "players"} onClick={() => setParticipantMode("players")} />
            <KillerParticipantModeButton mode="teams" label="Équipes" accent={primary} active={participantMode === "teams"} onClick={() => setParticipantMode("teams")} />
          </div>
        </section>

        <section
          data-mss-guide-section="killer-match-format"
          data-mss-guide-label={participantMode === "teams" ? "Format des équipes" : "Format joueurs"}
          data-mss-guide-order="2"
          style={{ background: cardBg, borderRadius: 18, padding: "14px 12px", marginBottom: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div style={{ color: primary, fontWeight: 900, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            {participantMode === "teams" ? "FORMAT DES ÉQUIPES" : "FORMAT JOUEURS"}
          </div>
          {participantMode === "players" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([ ["duel", "DUEL", "2 joueurs"], ["multi", "MULTI", "2 à 20 joueurs"] ] as const).map(([id, label, detail]) => (
                <button key={id} type="button" aria-pressed={playerFormat === id} onClick={() => setPlayerFormat(id)}
                  style={{ minWidth: 0, minHeight: 79, borderRadius: 14, background: playerFormat === id ? `${primary}2c` : "rgba(255,255,255,.03)", border: `1px solid ${playerFormat === id ? primary : `${primary}55`}`, color: playerFormat === id ? primary : "#fff", cursor: "pointer", display: "grid", placeContent: "center", gap: 4 }}>
                  <strong style={{ fontSize: 16 }}>{label}</strong><span style={{ fontSize: 11, opacity: .82 }}>{detail}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: "#e5e7f1", fontSize: 12 }}>Nombre d'équipes</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                  {[2,3,4].map((n) => <button key={n} type="button" aria-pressed={teamCount === n} onClick={() => setTeamCount(n)}
                    style={{ padding: 11, borderRadius: 12, border: `1px solid ${teamCount === n ? primary : `${primary}55`}`, background: teamCount === n ? `${primary}28` : "rgba(255,255,255,.03)", color: teamCount === n ? primary : "#fff", fontWeight: 900, cursor: "pointer" }}>{n}</button>)}
                </div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: "#e5e7f1", fontSize: 12 }}>Joueurs / bots par équipe</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
                  {[2,3,4,5].map((n) => <button key={n} type="button" aria-pressed={teamSize === n} onClick={() => setTeamSize(n)}
                    style={{ padding: 11, borderRadius: 12, border: `1px solid ${teamSize === n ? primary : `${primary}55`}`, background: teamSize === n ? `${primary}28` : "rgba(255,255,255,.03)", color: teamSize === n ? primary : "#fff", fontWeight: 900, cursor: "pointer" }}>{n}</button>)}
                </div>
              </div>
              <div style={{ textAlign: "center", color: primary, fontSize: 12, fontWeight: 800 }}>
                {teamCount} équipes × {teamSize} membres = {teamCount * teamSize} participants
              </div>
            </div>
          )}
        </section>

        <section
          data-mss-guide-section="killer-participant-selection"
          data-mss-guide-label={participantMode === "teams" ? "Choix équipes" : "Choix joueurs"}
          data-mss-guide-order="3"
          style={{
            background: cardBg, borderRadius: 18, padding: "14px 12px",
            marginBottom: 14, boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary }}>{participantMode === "teams" ? "Choix équipes" : "Choix joueurs"}</span>
            {participantMode === "teams" ? <button type="button" onClick={() => setTeamInfoOpen(true)} aria-label="Informations sur les équipes KILLER"
              title="Informations sur les équipes" style={{ width: 24, height: 24, borderRadius: 99, border: `1px solid ${primary}77`, background: "rgba(255,255,255,.04)", color: primary, fontWeight: 900, cursor: "pointer" }}>i</button> : null}
          </div>
          {participantMode === "teams" ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                {([
                  ["manual", "Composition manuelle", "teams"],
                  ["saved", "Équipes enregistrées", "saved-teams"],
                  ["auto", "Brassage automatique", "shuffle"],
                  ["bots", "Équipes bots CPU", "bot-teams"],
                ] as const).map(([tab, label, icon]) => (
                  <MssSelectorIconButton key={tab} icon={icon} label={label} accent={primary}
                    active={teamPickerOpen && teamPickerTab === tab} onClick={() => openTeamPicker(tab)} />
                ))}
                <MssSelectorIconButton icon="plus" label="Créer un participant ou une équipe" accent={primary} onClick={() => setCreationMenuOpen(true)} />
              </div>
              {activeTeamGroups.some((g) => g.ids.length > 0) && (
                <div style={{ border: `1px solid ${primary}44`, borderRadius: 15, padding: 10, background: "rgba(255,255,255,.025)" }}>
                  <div style={{ color: primary, fontSize: 12, fontWeight: 900, letterSpacing: .6, marginBottom: 9 }}>ÉQUIPES SÉLECTIONNÉES</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                    {activeTeamGroups.filter((g) => g.ids.length > 0).map((g, idx) => (
                      <div key={g.teamId}
                        style={{ display: "grid", justifyItems: "center", gap: 5, textAlign: "center", background: "rgba(255,255,255,.035)", border: `1px solid ${primary}55`, borderRadius: 13, padding: "10px 6px", color: "#fff", minWidth: 0 }}>
                        <div style={{ width: 62, height: 62, borderRadius: "50%", border: `2px solid ${g.ring || primary}`, overflow: "hidden", display: "grid", placeItems: "center", background: g.logo ? "#141826" : `radial-gradient(circle at 30% 30%, ${g.ring || primary}55 0%, ${g.color || primary}55 40%, rgba(10,12,24,.95) 100%)`, color: g.ring || primary, fontWeight: 1000, fontSize: 18, boxShadow: `0 0 18px ${(g.color || primary)}55` }}>
                          {g.logo ? <img src={g.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{g.short || String(g.name).slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div style={{ color: g.color || primary, fontSize: 12, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", whiteSpace: "nowrap" }}>{g.name}</div>
                        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 5, width: "100%" }}>
                          {g.ids.map((memberId) => {
                            const member = teamProfiles.find((p: any) => String(p.id) === memberId);
                            if (!member) return null;
                            const avatar = pickAvatar(member);
                            return <div key={memberId} title={member.name} style={{ display: "grid", justifyItems: "center", gap: 3, maxWidth: 54 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", background: "#232530", border: `1px solid ${primary}88`, display: "grid", placeItems: "center", color: primary, fontWeight: 900, fontSize: 10 }}>
                                {avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : String(member.name).slice(0,2).toUpperCase()}
                              </div>
                              <span style={{ fontSize: 9, maxWidth: 50, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{member.name}</span>
                            </div>;
                          })}
                        </div>
                        <div style={{ display: "flex", gap: 9, justifyContent: "center", alignItems: "center", paddingTop: 5 }}>
                          <button type="button" onClick={() => editSelectedTeam(g)} aria-label={`Modifier les membres de ${g.name}`} title="Modifier"
                            style={{ width: 34, height: 34, display: "grid", placeItems: "center", border: `1px solid ${primary}88`, color: primary, background: `${primary}12`, borderRadius: 11, cursor: "pointer", fontSize: 18 }}>✎</button>
                          <button type="button" onClick={() => removeSelectedTeam(g)} aria-label={`Retirer ${g.name}`} title="Retirer"
                            style={{ width: 34, height: 34, display: "grid", placeItems: "center", border: "1px solid rgba(255,130,130,.55)", color: "#ffa29a", background: "rgba(180,35,35,.1)", borderRadius: 11, cursor: "pointer", fontSize: 21 }}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!validTeams && <div style={{ color: "#f29b92", fontSize: 11, textAlign: "center" }}>Sélectionne exactement {teamCount} équipes de {teamSize} membres chacune.</div>}
              {teamCreateOpen && <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setTeamCreateOpen(false); }}
                style={{ position: "fixed", inset: 0, zIndex: 10010, display: "grid", placeItems: "center", padding: 12, background: "rgba(0,0,0,.82)" }}>
                <form onSubmit={saveNewTeam} role="dialog" aria-modal="true" aria-label="Créer une équipe"
                  style={{ width: "min(510px,100%)", maxHeight: "88dvh", overflowY: "auto", boxSizing: "border-box", display: "grid", gap: 12, padding: 14, background: "#0c101c", border: `1px solid ${primary}88`, borderRadius: 17 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: primary, fontWeight: 900 }}>
<span>CRÉER UNE ÉQUIPE {teamCreateKind === "bots" ? "BOTS CPU" : "JOUEURS"}</span><button type="button" onClick={() => setTeamCreateOpen(false)} aria-label="Fermer" style={{ color: primary, border: 0, background: "none", fontSize: 24, cursor: "pointer" }}>×</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <label title="Importer le logo de l'équipe" style={{ width: 72, height: 72, flexShrink: 0, border: `1px solid ${primary}`, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", cursor: "pointer", color: primary, fontSize: 12, textAlign: "center", background: `${primary}16` }}>
                      {teamCreateLogo ? <img src={teamCreateLogo} alt="Logo de l'équipe" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "LOGO +"}
                      <input type="file" accept="image/*" onChange={(e) => readTeamLogo(e.target.files?.[0])} style={{ display: "none" }} />
                    </label>
                    <input required maxLength={48} value={teamCreateName} onChange={(e) => setTeamCreateName(e.target.value)} placeholder="Nom de l'équipe" aria-label="Nom de l'équipe"
                      style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 11, border: `1px solid ${primary}55`, background: "#151724", color: "#fff" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <strong style={{ color: primary, fontSize: 12 }}>MEMBRES ({teamCreateMembers.length})</strong>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {teamCreateKind === "players" && <button type="button" onClick={() => openQuickCreate("profile")} style={{ border: `1px solid ${primary}55`, color: primary, background: "transparent", borderRadius: 9, padding: "7px 9px", cursor: "pointer" }}>＋ JOUEUR</button>}
                      {teamCreateKind === "bots" && <button type="button" onClick={() => openQuickCreate("bot")} style={{ border: `1px solid ${primary}55`, color: primary, background: "transparent", borderRadius: 9, padding: "7px 9px", cursor: "pointer" }}>＋ BOT</button>}
                    </div>
                  </div>
                  <div style={{ color: "#aab0cc", fontSize: 11, fontWeight: 800 }}>{teamCreatePageSize} {teamCreateKind === "bots" ? "bots" : "profils"}/page · page {safeTeamCreatePage + 1}/{teamCreatePages}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                    {teamCreatePageItems.map((member: any) => {
                      const id = String(member.id);
                      const selected = teamCreateMembers.includes(id);
                      const avatar = pickAvatar(member);
                      return <button key={id} type="button" aria-pressed={selected} onClick={() => setTeamCreateMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= teamSize ? prev : [...prev,id])}
                        style={{ display: "grid", justifyItems: "center", gap: 4, minWidth: 0, padding: 8, borderRadius: 11, border: `1px solid ${selected ? primary : `${primary}44`}`, background: selected ? `${primary}24` : "rgba(255,255,255,.025)", color: selected ? primary : "#fff", cursor: "pointer", minHeight: 96 }}>
                        <div style={{ width: 46, height: 46, borderRadius: "50%", overflow: "hidden", background: "#222", display: "grid", placeItems: "center" }}>{avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : String(member.name).slice(0,2).toUpperCase()}</div>
                        <span style={{ fontSize: 10, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{member.name}</span>
                      </button>;
                    })}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 84px", alignItems: "center", gap: 10 }}>
                    <button type="button" onClick={() => setTeamCreatePage((p) => Math.max(0, p - 1))} disabled={safeTeamCreatePage <= 0} style={{ borderRadius: 999, border: `1px solid ${primary}55`, background: "rgba(255,255,255,.03)", color: primary, padding: "9px 0", cursor: safeTeamCreatePage <= 0 ? "default" : "pointer", opacity: safeTeamCreatePage <= 0 ? .4 : 1 }}>←</button>
                    <div style={{ color: "#aab0cc", fontSize: 12, fontWeight: 900, textAlign: "center" }}>PAGE {safeTeamCreatePage + 1}/{teamCreatePages}</div>
                    <button type="button" onClick={() => setTeamCreatePage((p) => Math.min(teamCreatePages - 1, p + 1))} disabled={safeTeamCreatePage >= teamCreatePages - 1} style={{ borderRadius: 999, border: `1px solid ${primary}55`, background: "rgba(255,255,255,.03)", color: primary, padding: "9px 0", cursor: safeTeamCreatePage >= teamCreatePages - 1 ? "default" : "pointer", opacity: safeTeamCreatePage >= teamCreatePages - 1 ? .4 : 1 }}>→</button>
                  </div>
                  {teamCreateError && <div role="alert" style={{ color: "#ff9288", fontSize: 12 }}>{teamCreateError}</div>}
                  <button type="submit" disabled={!teamCreateName.trim() || teamCreateMembers.length !== teamSize} style={{ padding: 12, borderRadius: 12, border: `1px solid ${primary}`, background: `${primary}33`, color: primary, fontWeight: 900, opacity: !teamCreateName.trim() || teamCreateMembers.length !== teamSize ? .45 : 1, cursor: "pointer" }}>CRÉER ET SÉLECTIONNER</button>
                </form>
              </div>}
              {teamInfoOpen && <div role="presentation" onClick={() => setTeamInfoOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10070, background: "rgba(0,0,0,.78)", display: "grid", placeItems: "center", padding: 16 }}>
                <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ width: "min(440px,100%)", background: "#0c101c", border: `1px solid ${primary}66`, borderRadius: 18, padding: 16, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: primary, fontWeight: 900 }}>KILLER — CHOIX ÉQUIPES <button type="button" aria-label="Fermer" onClick={() => setTeamInfoOpen(false)} style={{ background: "none", color: primary, border: 0, cursor: "pointer", fontSize: 22 }}>×</button></div>
                  <p style={{ margin: 0, fontSize: 13 }}>Chaque équipe possède un numéro, des vies, un statut KILLER et des boucliers communs. Ses membres jouent en alternance. Dans KILLER, choisis 2 à 4 équipes de 2 à 5 membres. Le nombre exact est défini à l'étape « Format des équipes » ; jusqu'à 20 participants au total.</p>
                </div>
              </div>}
              {teamPickerOpen && (
                <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setTeamPickerOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 10060, display: "grid", placeItems: "center", padding: 10, background: "rgba(0,0,0,.80)" }}>
                  <div ref={teamPickerScrollRef} role="dialog" aria-modal="true" aria-label="Sélection des équipes" style={{ width: "min(600px,100%)", maxHeight: "88dvh", overflowY: "auto", background: "#0a0c18", borderRadius: 18, border: `1px solid ${primary}77`, padding: 12, boxSizing: "border-box" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ color: primary, fontWeight: 900, letterSpacing: 1, fontSize: 13 }}>{botTeamEditing && teamPickerTab === "bots" ? "CHOIX BOTS" : "CHOIX ÉQUIPES"}</div>
                        <button type="button" aria-label="Infos équipes" onClick={() => setTeamInfoOpen(true)} style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${primary}77`, background: "rgba(255,255,255,.03)", color: primary, fontSize: 12, fontWeight: 900, cursor: "pointer" }}>i</button>
                      </div>
                      <button type="button" aria-label="Fermer" onClick={() => setTeamPickerOpen(false)} style={{ background: "none", border: 0, color: primary, fontSize: 26, cursor: "pointer" }}>×</button>
                    </div>
                    {!(botTeamEditing && teamPickerTab === "bots") && <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 12 }}>
                      {(["manual", "saved", "auto", "bots"] as const).map((tab) => <MssSelectorIconButton key={tab} icon={tab === "manual" ? "teams" : tab === "saved" ? "saved-teams" : tab === "auto" ? "shuffle" : "bot-teams"}
                        label={tab === "manual" ? "Manuel" : tab === "saved" ? "Enregistrées" : tab === "auto" ? "Brassage auto" : "Teams bots"} active={teamPickerTab === tab} accent={primary} onClick={() => openTeamPicker(tab)} />)}
                      <MssSelectorIconButton icon="plus" label="Créer un joueur, un bot ou une équipe" accent={primary} onClick={() => setCreationMenuOpen(true)} />
                    </div>}
                    {teamPickerTab !== "saved" && teamPickerTab !== "bots" && <div style={{ marginBottom: 12, padding: "8px 10px", borderRadius: 12, border: `1px solid ${primary}33`, background: "rgba(255,255,255,.03)", color: "#c6c9dc", fontSize: 11, lineHeight: 1.45 }}>
                      Format choisi : <b style={{ color: primary }}>{teamCount} équipes</b> de <b style={{ color: primary }}>{teamSize} membres</b>. Modifie ce format à l'étape précédente.
                    </div>}
                    {teamPickerTab === "bots" && botTeamEditing ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <button type="button" onClick={() => { setBotTeamEditing(null); setEditingBotInstanceId(null); setBotTeamMembersDraft([]); setBotMemberError(""); if (teamPickerScrollRef.current) teamPickerScrollRef.current.scrollTop = 0; }} style={{ justifySelf: "start", padding: "7px 12px", color: primary, borderRadius: 10, background: "rgba(255,255,255,.04)", border: `1px solid ${primary}66`, cursor: "pointer", fontWeight: 850 }}>← ÉQUIPES BOTS</button>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", color: primary, fontWeight: 900 }}>
                          {botTeamEditing.logoDataUrl && <img src={botTeamEditing.logoDataUrl} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />}
                          <span>{botTeamEditing.name}</span>
                        </div>
                        <div style={{ color: "#c9cfdf", textAlign: "center", fontSize: 12 }}>Choisis {teamSize} bots en touchant leurs avatars · {botTeamMembersDraft.length}/{teamSize}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9 }}>
                          {(botTeamEditing.members || []).slice(botMemberPage * 9, botMemberPage * 9 + 9).map((bot: any) => {
                            const selected = botTeamMembersDraft.includes(String(bot.id));
                            const inOtherTeam = selectedBotTeamGroups.some((g) => g.instanceId !== editingBotInstanceId && g.ids.includes(String(bot.id))) || storedTeamSelection.some((g) => g.ids.includes(String(bot.id)));
                            const avatar = bot.avatarDataUrl || bot.avatarUrl || null;
                            return <button key={bot.id} type="button" disabled={inOtherTeam} onClick={() => chooseBotTeamMember(String(bot.id))} aria-pressed={selected} title={inOtherTeam ? "Bot déjà sélectionné dans une équipe" : bot.name}
                              style={{ position: "relative", border: `1px solid ${selected ? primary : `${primary}66`}`, borderRadius: 14, background: selected ? `${primary}28` : "rgba(255,255,255,.035)", boxShadow: selected ? `0 0 12px ${primary}55` : "none", color: "#fff", minWidth: 0, minHeight: 108, padding: "10px 5px", cursor: inOtherTeam ? "not-allowed" : "pointer", opacity: inOtherTeam ? .35 : 1, display: "grid", alignContent: "center", justifyItems: "center", gap: 6 }}>
                              <div style={{ width: 58, height: 58, borderRadius: "50%", border: `2px solid ${selected ? primary : `${primary}66`}`, overflow: "hidden", display: "grid", placeItems: "center", fontWeight: 900, background: `${primary}14`, color: primary }}>
                                {avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : String(bot.name || "BOT").slice(0, 2).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 800, fontSize: 11, textAlign: "center", overflowWrap: "anywhere" }}>{bot.name}</span>
                              {selected && <span aria-hidden="true" style={{ position: "absolute", top: 6, right: 7, color: primary, fontWeight: 900 }}>✓</span>}
                            </button>;
                          })}
                        </div>
                        {(() => { const count = Math.max(1, Math.ceil((botTeamEditing.members || []).length / 9)); return <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 70px", gap: 8, alignItems: "center" }}>
                          <button type="button" aria-label="Page précédente" disabled={botMemberPage === 0} onClick={() => setBotMemberPage((p) => Math.max(0, p - 1))} style={{ borderRadius: 12, border: `1px solid ${primary}66`, background: "transparent", color: primary, padding: 9, opacity: botMemberPage === 0 ? .3 : 1 }}>←</button>
                          <span style={{ textAlign: "center", color: primary, fontWeight: 900, fontSize: 12 }}>PAGE {botMemberPage + 1}/{count}</span>
                          <button type="button" aria-label="Page suivante" disabled={botMemberPage + 1 >= count} onClick={() => setBotMemberPage((p) => Math.min(count - 1, p + 1))} style={{ borderRadius: 12, border: `1px solid ${primary}66`, background: "transparent", color: primary, padding: 9, opacity: botMemberPage + 1 >= count ? .3 : 1 }}>→</button>
                        </div>; })()}
                        {botMemberError && <div role="alert" style={{ textAlign: "center", color: "#ff9a91", fontSize: 12 }}>{botMemberError}</div>}
                      </div>
                    ) : teamPickerTab === "bots" ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                          {botTeamsForPicker.slice(botTeamsPage * 9, botTeamsPage * 9 + 9).map((team: any) => (
                            <button key={team.id} type="button" onClick={() => openBotTeamMembers(team)}
                              style={{ border: `1px solid ${primary}66`, borderRadius: 12, background: "rgba(255,255,255,.035)", color: "#fff", minWidth: 0, padding: 8, cursor: "pointer", display: "grid", justifyItems: "center", gap: 5 }}>
                              {team.logoDataUrl ? <img src={team.logoDataUrl} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} /> : <span>🤖</span>}
                              <span style={{ fontWeight: 850, fontSize: 11, textAlign: "center" }}>{team.name}</span>
                            </button>
                          ))}
                        </div>
                        {botTeamsForPicker.length > 9 && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: primary, fontWeight: 800 }}>
                          <button type="button" onClick={() => setBotTeamsPage(Math.max(0,botTeamsPage-1))} disabled={botTeamsPage===0}>←</button>
                          PAGE {botTeamsPage+1}/{Math.ceil(botTeamsForPicker.length/9)}
                          <button type="button" onClick={() => setBotTeamsPage(botTeamsPage+1)} disabled={(botTeamsPage+1)*9>=botTeamsForPicker.length}>→</button>
                        </div>}
                        {selectedBotTeamGroups.map((group) => <div key={group.instanceId} style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", color: primary }}><span>{group.team.name} · {group.ids.length} bots</span><button type="button" onClick={() => removeBotTeamMembers(group.instanceId)} aria-label={`Retirer ${group.team.name}`} style={{ background: "none", border: `1px solid ${primary}55`, borderRadius: 8, color: primary }}>×</button></div>)}
                      </div>
                    ) : (
                      <TeamsSection
                        profiles={teamProfiles} selectableProfiles={humanProfiles} allProfiles={teamProfiles} selectedIds={selectedIds}
                        teamAssignments={Object.fromEntries(Object.entries(manualTeamAssignments).map(([pid, index]) => [pid, x01ManualTeamKeys[Math.max(0, Math.min(3, Number(index)||0))]]))}
                        setPlayerTeam={setX01ManualTeam} togglePlayer={togglePlayer} sourceMode={teamsSourceMode} setSourceMode={setTeamsSourceMode}
                        storedTeams={humanStoredDartsTeams} selectedStoredTeamIds={selectedStoredTeamIds} toggleStoredTeam={toggleStoredTeam}
                        addStoredTeamSelection={addStoredTeamSelection} removeStoredTeamSelection={removeStoredTeamSelection}
                        savedTeamMemberSelections={savedTeamMemberSelections} toggleSavedTeamMember={toggleSavedTeamMember}
                        teamSizeOverride={teamSize} teamCountOverride={teamCount} primary={primary} primarySoft={primarySoft} compactContent
                      />
                    )}
                    {!(botTeamEditing && teamPickerTab === "bots") && <button type="button" onClick={() => setTeamPickerOpen(false)} style={{ width: "100%", borderRadius: 12, padding: 12, marginTop: 12, border: `1px solid ${primary}`, background: `${primary}33`, color: primary, fontWeight: 900, cursor: "pointer" }}>TERMINER</button>}
                  </div>
                </div>
              )}
            </div>
          ) : (<>

          {humanProfiles.length === 0 ? (
            <p style={{ fontSize: 12, color: "#b3b8d0", margin: "6px 0 12px" }}>Aucun profil local. Crée des joueurs dans Profils.</p>
          ) : null}
          <PlayerPagedSelector

                  usageMode={String(props?.params?.variantId || props?.params?.gameId || "killer")}
                  profiles={humanProfiles}
                  selectedIds={selectedIds}
                  onToggle={togglePlayer}
                  accent={primary}
                  pageSize={9}
                  toolbarExtra={<>
                    <MssSelectorIconButton icon="bots" label="Choisir les bots IA" accent={primary} active={botsPickerOpen} onClick={() => setBotsPickerOpen(true)} />
                    <MssSelectorIconButton icon="plus" label="Créer un joueur ou un bot CPU" accent={primary} onClick={() => setCreationMenuOpen(true)} />
                  </>}
                  summaryExtra={selectedBotProfiles.length > 0 ? (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.09)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(94px, 1fr))", gap: 10 }}>
                        {selectedBotProfiles.map((bot) => (
                          <div key={bot.id} style={{ display: "grid", justifyItems: "center", gap: 5, minWidth: 0 }}>
                            <div style={{ width: 64, height: 64, position: "relative", borderRadius: "50%", border: `2px solid ${primary}88`, background: "rgba(0,0,0,.4)" }}>
                              {bot.avatarDataUrl ? <img src={bot.avatarDataUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ display: "grid", placeItems: "center", height: "100%", color: primary, fontWeight: 900 }}>BOT</div>}
                              <button type="button" onClick={() => togglePlayer(bot.id)} aria-label={`Retirer ${bot.name}`} title={`Retirer ${bot.name}`} style={{ position: "absolute", right: -5, top: -5, width: 23, height: 23, borderRadius: "50%", background: "#08090e", color: primary, border: `1px solid ${primary}`, fontWeight: 900, cursor: "pointer" }}>×</button>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 800, textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bot.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  modalTitle="Choisir des joueurs"
                  modalHeaderExtra={<MssSelectorIconButton icon="plus" label="Créer un joueur ou un bot CPU" accent={primary} onClick={() => setCreationMenuOpen(true)} />}
                  renderActions={numberAssignMode === "none" ? ((p: any) => {
                    const num = killerNumberById[p.id] ?? 20;
                    return (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}
                        title="Ajuster le numéro KILLER"
                      >
                        <button type="button" onClick={() => setKillerNumberById((prev) => uniqueKillerNumbers({ ...prev, [p.id]: num - 1 < 1 ? 20 : num - 1 }))} style={miniRoundBtn}>−</button>
                        <div style={{ width: 40, height: 30, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#111", background: `linear-gradient(135deg, ${primary}, #ffe9a3)`, boxShadow: `0 0 14px ${primary}55` }}>{num}</div>
                        <button type="button" onClick={() => setKillerNumberById((prev) => uniqueKillerNumbers({ ...prev, [p.id]: num + 1 > 20 ? 1 : num + 1 }))} style={miniRoundBtn}>+</button>
                      </div>
                    );
                  }) : undefined}
                />
          <BotPagedSelector
            bots={allAvailableBots}
            selectedIds={selectedIds}
            onToggle={togglePlayer}
            accent={primary}
            label="BOTS IA"
            showCheckbox={false}
            showSelectedSummary={false}
            hideToolbar
            controlledOpen={botsPickerOpen}
            onControlledOpenChange={setBotsPickerOpen}
          />
          <p style={{ fontSize: 11, color: "#7c80a0", margin: "9px 0 0" }}>Au moins 2 participants pour démarrer · 20 maximum.</p>
          </>)}
        </section>

        {/* OPTIONS */}
        <section
          data-mss-guide-container="killer-options"
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary, marginBottom: 10 }}>
            Ordre de départ
          </div>

          {/* ✅ ORDRE DE DÉPART */}
          <div data-mss-guide-section="killer-start-order" data-mss-guide-label="Ordre de départ" style={{ marginTop: 2, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6, flexWrap: "nowrap" }}>
              {KILLER_START_ORDER_OPTIONS.map((option) => (
                <MssSelectorIconButton
                  key={option.id}
                  icon={option.icon as any}
                  label={option.label}
                  accent={primary}
                  active={startOrderMode === option.id}
                  onClick={() => { setStartOrderMode(option.id); setRandomStartOrder(option.id === "random"); }}
                />
              ))}
            </div>
            {(() => {
              const activeOption = KILLER_START_ORDER_OPTIONS.find((option) => option.id === startOrderMode) || KILLER_START_ORDER_OPTIONS[0];
              return (
                <div style={{ marginTop: 10, textAlign: "center", display: "grid", gap: 4 }}>
                  <div style={{ color: primary, fontSize: 13, fontWeight: 950, textTransform: "uppercase", letterSpacing: .9 }}>{activeOption.label}</div>
                  <div style={{ fontSize: 11, color: "#9da5b9", maxWidth: 420, margin: "0 auto", lineHeight: 1.45 }}>{activeOption.detail}</div>
                </div>
              );
            })()}
          </div>

          {isProgressive ? (
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${primary}55`,
                background: "rgba(0,0,0,.28)",
                padding: 13,
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontWeight: 1000, color: primary, marginBottom: 8 }}>Règles verrouillées</div>
              <div style={{ fontSize: 12, color: "#d7daf0" }}>
                🎯 Le numéro est attribué au premier lancer, effectué physiquement avec la main opposée. Les doublons sont refusés.
              </div>
              <div style={{ fontSize: 12, color: "#d7daf0", marginTop: 6 }}>
                ❤️ Chaque joueur commence à 0. Sur son numéro : simple +1, double +2, triple +3, maximum 5.
              </div>
              <div style={{ fontSize: 12, color: "#d7daf0", marginTop: 6 }}>
                ☠️ À 5, le logo KILLER apparaît. Sous 5, il disparaît. À 0 le joueur vit encore ; sous 0 il est éliminé.
              </div>
            </div>
          ) : (
          <div>
          {/* attribution numéros */}
          <div data-mss-guide-section="killer-number-assignment" data-mss-guide-label="Attribution des numéros" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Attribution des numéros</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label="✋ Choix manuel"
                active={numberAssignMode === "none"}
                onClick={() => setNumberAssignMode("none")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label="🎲 Numéros aléatoires"
                active={numberAssignMode === "random"}
                onClick={() => setNumberAssignMode("random")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label="🎯 1er lancer = choisir son numéro"
                active={numberAssignMode === "throw"}
                onClick={() => {
                  // si l’utilisateur force "1er lancer" => BLIND OFF
                  if (blindKiller) setBlindKiller(false);
                  setNumberAssignMode("throw");
                }}
                primary={primary}
                primarySoft={primarySoft}
                disabled={blindLocksThrow}
                title={blindLocksThrow ? "Incompatible avec Blind Killer." : undefined}
              />
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
              Les sélecteurs de numéros sous les joueurs s’affichent uniquement en “Choix manuel”. En “Numéros aléatoires” ou “1er lancer”, aucun numéro manuel n’est affiché.
            </div>

            {blindLocksThrow && (
              <div style={{ marginTop: 6, fontSize: 10.5, color: "#ffb3b3", fontWeight: 800, lineHeight: 1.2 }}>
                Blind Killer est incompatible avec “1er lancer = choisir son numéro”.
              </div>
            )}
          </div>

          {/* vies */}
          <div data-mss-guide-section="killer-lives" data-mss-guide-label="Vies de départ" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Vies de départ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <PillButton
                  key={n}
                  label={String(n)}
                  active={lives === n}
                  onClick={() => setLives(n)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>Vies identiques pour tous les joueurs.</div>
          </div>

          {/* become rule */}
          <div data-mss-guide-section="killer-become" data-mss-guide-label="Devenir KILLER" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Règle pour devenir KILLER</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label="Toucher son numéro (simple)"
                active={becomeRule === "single"}
                onClick={() => setBecomeRule("single")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label="Double sur son numéro"
                active={becomeRule === "double"}
                onClick={() => setBecomeRule("double")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
          </div>

          {/* damage rule */}
          <div data-mss-guide-section="killer-damage" data-mss-guide-label="Dégâts KILLER" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Dégâts quand on est KILLER</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label="-1 par hit"
                active={damageRule === "one"}
                onClick={() => setDamageRule("one")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label="Multiplicateur (S/D/T)"
                active={damageRule === "multiplier"}
                onClick={() => setDamageRule("multiplier")}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>Quand tu touches le numéro d’un adversaire vivant.</div>
          </div>

          {/* variantes */}
          <div data-mss-guide-container="killer-variants-container" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#9fa4c0", textTransform: "uppercase", letterSpacing: 0.9 }}>
              Variantes
            </div>

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              <div data-mss-guide-section="killer-variants" data-mss-guide-label="Variantes avancées" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <VariantRow
                title="Auto-pénalité (toucher son numéro quand KILLER)"
                desc="Si ON, quand tu es KILLER et que tu touches ton numéro, tu perds des vies (pas mort instant)."
                value={selfHitWhileKiller}
                onChange={(v) => setVariant("selfHitWhileKiller", v)}
                primary={primary}
                primarySoft={primarySoft}
                disabled={isVariantDisabled("selfHitWhileKiller", variantState) && !selfHitWhileKiller}
                disabledReason={getConflictReason("selfHitWhileKiller", variantState)}
              />

              <VariantRow
                title="Auto-pénalité = multiplicateur (S/D/T)"
                desc="Si ON, la pénalité vaut 1/2/3 selon S/D/T (sinon c'est toujours -1)."
                value={selfHitUsesMultiplier}
                onChange={(v) => setVariant("selfHitUsesMultiplier", v)}
                primary={primary}
                primarySoft={primarySoft}
                disabled={isVariantDisabled("selfHitUsesMultiplier", variantState) && !selfHitUsesMultiplier}
                disabledReason={getConflictReason("selfHitUsesMultiplier", variantState)}
              />

              <VariantRow
                title="Vol de vies (Life Steal)"
                desc="Si ON, les vies perdues par la cible sont transférées au KILLER (plus de chaos)."
                value={lifeSteal}
                onChange={(v) => setVariant("lifeSteal", v)}
                primary={primary}
                primarySoft={primarySoft}
                disabled={isVariantDisabled("lifeSteal", variantState) && !lifeSteal}
                disabledReason={getConflictReason("lifeSteal", variantState)}
              />

              <VariantRow
                title="Blind Killer (mode aveugle)"
                desc="Si ON, les numéros sont masqués à l'écran pendant la partie (plus dur, plus fun)."
                value={blindKiller}
                onChange={(v) => setVariant("blindKiller", v)}
                primary={primary}
                primarySoft={primarySoft}
                disabled={(numberAssignMode === "throw" && !blindKiller) || (isVariantDisabled("blindKiller", variantState) && !blindKiller)}
                disabledReason={
                  numberAssignMode === "throw"
                    ? "Incompatible avec “1er lancer = choisir son numéro”."
                    : getConflictReason("blindKiller", variantState)
                }
              />

              </div>

              <div
                data-mss-guide-section="killer-bull"
                data-mss-guide-label="Fonctions BULL"
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.20)",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, color: "#fff" }}>Fonctions BULL</div>
                <div style={{ opacity: 0.78, fontSize: 12, lineHeight: 1.25 }}>
                  Toutes les fonctions déjà existantes du BULL sont regroupées ici pour une lecture plus claire. Une seule fonction BULL doit rester active à la fois, sauf si la rotation est activée.
                </div>

                <VariantRow
                  title="BULL = dégâts à tous (SBULL/DBULL)"
                  desc="Si ON : SBULL enlève 1 vie à chaque adversaire, DBULL enlève 2 vies à chaque adversaire."
                  value={bullSplash}
                  onChange={(v) => setVariant("bullSplash", v)}
                  primary={primary}
                  primarySoft={primarySoft}
                  disabled={isVariantDisabled("bullSplash", variantState) && !bullSplash}
                  disabledReason={getConflictReason("bullSplash", variantState)}
                />

                <VariantRow
                  title="BULL = soins (récupérer des vies)"
                  desc="Si ON : toucher BULL ou DBULL rend un nombre de vies configurable entre 1 et 3."
                  value={bullHeal}
                  onChange={(v) => setVariant("bullHeal", v)}
                  primary={primary}
                  primarySoft={primarySoft}
                  disabled={isVariantDisabled("bullHeal", variantState as any) && !bullHeal}
                  disabledReason={getConflictReason("bullHeal", variantState as any)}
                />

                {bullHeal && (
                  <div
                    style={{
                      marginTop: -2,
                      marginLeft: 8,
                      borderLeft: "2px solid rgba(119,255,155,0.35)",
                      paddingLeft: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#9fa4c0", fontWeight: 800 }}>
                      Nombre de vies rendues
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[1, 2, 3].map((n) => (
                        <PillButton
                          key={`bull-heal-lives-${n}`}
                          label={`+${n} vie${n > 1 ? "s" : ""}`}
                          active={bullHealLives === n}
                          onClick={() => setBullHealLives(n)}
                          primary={primary}
                          primarySoft={primarySoft}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}

                <VariantRow
                  title="Rotation BULL (1 tour / fonction)"
                  desc="Si ON : les fonctions BULL activées tournent automatiquement à chaque changement de tour. Si deux fonctions sont ON, elles alternent tour après tour."
                  value={bullRotate}
                  onChange={(v) => setBullRotate(v)}
                  primary={primary}
                  primarySoft={primarySoft}
                />

                {bullRotate && (
                  <div style={{ marginTop: -2, marginLeft: 8, borderLeft: "2px solid rgba(247,200,92,0.35)", paddingLeft: 12, fontSize: 11, color: "#9fa4c0", lineHeight: 1.35 }}>
                    Fonction active = index du tour courant modulo nombre de fonctions BULL actives.
Active uniquement parmi les fonctions cochées ci-dessus.
                  </div>
                )}
              </div>

              <div
                data-mss-guide-section="killer-dbull"
                data-mss-guide-label="Fonctions DBULL"
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.20)",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, color: "#fff" }}>Fonctions DBULL</div>
                <div style={{ opacity: 0.78, fontSize: 12, lineHeight: 1.25 }}>
                  Une seule fonction DBULL peut être active en même temps. Le désarmement retire le statut KILLER à tous les autres killers sauf le tireur. Le DBULL peut aussi conserver la fonction dégâts à tous (−2).
                </div>

                <VariantRow
                  title="DBULL = dégâts à tous (-2)"
                  desc="Si ON : lorsque la fonction dégâts de zone est active, toucher DBULL enlève 2 vies à chaque adversaire vivant. Cette fonction peut aussi entrer dans la rotation DBULL."
                  value={bullSplash}
                  onChange={(v) => setVariant("bullSplash", v)}
                  primary={primary}
                  primarySoft={primarySoft}
                  disabled={isVariantDisabled("bullSplash", variantState) && !bullSplash}
                  disabledReason={getConflictReason("bullSplash", variantState)}
                />

                <VariantRow
                  title="DBULL = bouclier"
                  desc="Si ON : toucher DBULL donne un bouclier temporaire. Un DOUBLE adverse sur le chiffre du joueur protégé casse entièrement le bouclier. Un TRIPLE l'affaiblit de moitié. Deux triples l'annulent."
                  value={shieldOnDBull}
                  onChange={(v) => setVariant("shieldOnDBull", v)}
                  primary={primary}
                  primarySoft={primarySoft}
                  disabled={isVariantDisabled("shieldOnDBull", variantState) && !shieldOnDBull}
                  disabledReason={getConflictReason("shieldOnDBull", variantState)}
                />

                {shieldOnDBull && (
                  <div
                    style={{
                      marginTop: -2,
                      marginLeft: 8,
                      borderLeft: "2px solid rgba(94,234,212,0.35)",
                      paddingLeft: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#9fa4c0", fontWeight: 800 }}>
                      Durée du bouclier (tours du joueur)
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <PillButton
                          key={`shield-turns-${n}`}
                          label={`${n} tour${n > 1 ? "s" : ""}`}
                          active={shieldTurns === n}
                          onClick={() => setShieldTurns(n)}
                          primary={primary}
                          primarySoft={primarySoft}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}

                <VariantRow
                  title="DBULL = désarmement"
                  desc="Si ON : toucher DBULL désarme tous les autres killers sauf le tireur. Ils repassent au statut de base et doivent retoucher leur chiffre pour redevenir killer."
                  value={disarmOnDBull}
                  onChange={(v) => setVariant("disarmOnDBull", v)}
                  primary={primary}
                  primarySoft={primarySoft}
                  disabled={isVariantDisabled("disarmOnDBull", variantState as any) && !disarmOnDBull}
                  disabledReason={getConflictReason("disarmOnDBull", variantState as any)}
                />

                <VariantRow
                  title="Rotation DBULL (1 tour / fonction)"
                  desc="Si ON : les fonctions DBULL activées tournent automatiquement à chaque changement de tour. Si dégâts à tous, bouclier et/ou désarmement sont ON, elles alternent tour après tour."
                  value={dbullRotate}
                  onChange={(v) => setDbullRotate(v)}
                  primary={primary}
                  primarySoft={primarySoft}
                />

                {dbullRotate && (
                  <div style={{ marginTop: -2, marginLeft: 8, borderLeft: "2px solid rgba(247,200,92,0.35)", paddingLeft: 12, fontSize: 11, color: "#9fa4c0", lineHeight: 1.35 }}>
                    Fonction active = index du tour courant modulo nombre de fonctions DBULL actives.
Active uniquement parmi les fonctions cochées ci-dessus.
                  </div>
                )}
              </div>

              <div data-mss-guide-section="killer-bonus" data-mss-guide-label="Bonus & MISS" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <VariantRow
                title="Bonus bouclier au choix du numéro"
                desc="En mode “1er lancer = choisir son numéro” : D = bouclier 2 tours, T = 3 tours, BULL = choix libre + 2 tours, DBULL = choix libre + 3 tours."
                value={selectBonusShield}
                onChange={(v) => setVariant("selectBonusShield", v)}
                primary={primary}
                primarySoft={primarySoft}
                disabled={numberAssignMode !== "throw" || (isVariantDisabled("selectBonusShield", variantState) && !selectBonusShield)}
                disabledReason={
                  numberAssignMode !== "throw"
                    ? "Disponible uniquement avec “1er lancer = choisir son numéro”."
                    : getConflictReason("selectBonusShield", variantState)
                }
              />

              <VariantRow
                title="MISS = auto-hit"
                desc="Si ON : toute fléchette hors cible retire automatiquement 1 vie au joueur actif."
                value={missAutoHit}
                onChange={(v) => setVariant("missAutoHit", v)}
                primary={primary}
                primarySoft={primarySoft}
                disabled={isVariantDisabled("missAutoHit", variantState) && !missAutoHit}
                disabledReason={getConflictReason("missAutoHit", variantState)}
              />



              </div>

              <div
                data-mss-guide-section="killer-resurrection"
                data-mss-guide-label="Résurrection"
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.20)",
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>
                  Résurrection
                </div>
                <div style={{ opacity: 0.78, fontSize: 12, lineHeight: 1.25, marginBottom: 10 }}>
                  Si un joueur touche le numéro d’un joueur DEAD, il peut lui redonner {resurrectionLives} vie(s), selon le mode choisi.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* OFF */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <PillButton
                      label="OFF"
                      active={resurrectionMode === "off"}
                      onClick={() => setResurrectionMode("off")}
                      primary={primary}
                      primarySoft={primarySoft}
                      compact
                    />
                    <button
                      type="button"
                      aria-label="Info OFF"
                      onClick={() => setResInfo({ title: "OFF", text: "Aucune résurrection possible." })}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.70)",
                        fontSize: 11,
                        fontWeight: 900,
                        lineHeight: "18px",
                        textAlign: "center",
                        cursor: "pointer",
                      }}
                      title="Détails"
                    >
                      i
                    </button>
                  </div>
                
                  {/* 1 Joueur (1×) */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <PillButton
                      label="1 Joueur (1×)"
                      active={resurrectionMode === "one_player_once"}
                      onClick={() => setResurrectionMode("one_player_once")}
                      primary={primary}
                      primarySoft={primarySoft}
                      compact
                    />
                    <button
                      type="button"
                      aria-label="Info 1 Joueur"
                      onClick={() => setResInfo({ title: "1 Joueur (1×)", text: "Une seule résurrection possible dans toute la partie. Un seul joueur (au total) peut revenir une fois." })}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.70)",
                        fontSize: 11,
                        fontWeight: 900,
                        lineHeight: "18px",
                        textAlign: "center",
                        cursor: "pointer",
                      }}
                      title="Détails"
                    >
                      i
                    </button>
                  </div>
                
                  {/* All (1×) */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <PillButton
                      label="All (1×)"
                      active={resurrectionMode === "all_once"}
                      onClick={() => setResurrectionMode("all_once")}
                      primary={primary}
                      primarySoft={primarySoft}
                      compact
                    />
                    <button
                      type="button"
                      aria-label="Info All 1×"
                      onClick={() => setResInfo({ title: "All (1×)", text: "Chaque joueur peut être ressuscité une seule fois maximum." })}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.70)",
                        fontSize: 11,
                        fontWeight: 900,
                        lineHeight: "18px",
                        textAlign: "center",
                        cursor: "pointer",
                      }}
                      title="Détails"
                    >
                      i
                    </button>
                  </div>
                
                  {/* All (illimité) */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <PillButton
                      label="All (illimité)"
                      active={resurrectionMode === "all"}
                      onClick={() => setResurrectionMode("all")}
                      primary={primary}
                      primarySoft={primarySoft}
                      compact
                    />
                    <button
                      type="button"
                      aria-label="Info All illimité"
                      onClick={() => setResInfo({ title: "All (illimité)", text: "Chaque joueur peut être ressuscité autant de fois que nécessaire." })}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.70)",
                        fontSize: 11,
                        fontWeight: 900,
                        lineHeight: "18px",
                        textAlign: "center",
                        cursor: "pointer",
                      }}
                      title="Détails"
                    >
                      i
                    </button>
                  </div>
                </div>

                {resurrectionMode !== "off" && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Vies données au ressuscité</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <PillButton
                          key={n}
                          label={String(n)}
                          active={resurrectionLives === n}
                          onClick={() => setResurrectionLives(n)}
                          primary={primary}
                          primarySoft={primarySoft}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
</div>

            <div style={{ marginTop: 10, fontSize: 10.5, color: "#7c80a0", lineHeight: 1.35 }}>
              Astuce : certaines variantes sont <b>exclusives</b> pour garder un gameplay lisible (ex : BULL dégâts vs BULL soins).
            </div>
          </div>
          </div>
          )}
        </section>

      </div>

      {/* CTA */}
      <div data-mss-guide-launch="killer" data-mss-guide-ready={canStart ? "true" : "false"} style={{ position: "fixed", left: 0, right: 0, bottom: 88, padding: "6px 12px 8px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 999,
              border: "none",
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: 1,
              textTransform: "uppercase",
              background: canStart ? `linear-gradient(90deg, ${primary}, #ffe9a3)` : "rgba(120,120,120,0.5)",
              color: canStart ? "#151515" : "#2b2bb2",
              boxShadow: canStart ? "0 0 18px rgba(255, 207, 120, 0.65)" : "none",
              opacity: canStart ? 1 : 0.6,
              cursor: canStart ? "pointer" : "default",
            }}
            title={canStart ? "Démarrer la partie" : (participantMode === "teams" ? "Choisis deux équipes complètes" : "Ajoute au moins 2 joueurs")}
          >
            {isProgressive ? "Lancer Killer Progressif" : "Lancer la partie"}
          </button>

          {!canStart && (
            <div style={{ marginTop: 6, textAlign: "center", fontSize: 11, color: "#ff6b6b", fontWeight: 800 }}>
              {participantMode === "teams" ? "Choisis au moins 2 équipes avec 2 membres chacune" : "Ajoute au moins 2 joueurs pour démarrer"}
            </div>
          )}
        </div>
      </div>

      {/* ✅ MODAL INFOS : règles / déroulé / variantes */}
      {infoOpen && (
        <div
          onClick={() => setInfoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 96vw)",
              maxHeight: "min(78vh, 620px)",
              overflow: "hidden",
              borderRadius: 18,
              background: "rgba(12,14,26,0.98)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.70)",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 1000, color: primary, letterSpacing: 0.8, textTransform: "uppercase" }}>
                {isProgressive ? "Règles — Killer Progressif" : "Règles — Killer"}
              </div>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  padding: "6px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>

            <div style={{ padding: 14, overflowY: "auto", maxHeight: "calc(min(78vh, 620px) - 52px)" }}>
              {isProgressive ? (
                <div style={{ fontSize: 13, color: "#d7daf0", lineHeight: 1.4 }}>
                  <div style={{ fontWeight: 1000, color: primary, marginBottom: 8 }}>Objectif</div>
                  <div style={{ marginBottom: 13 }}>Être le dernier joueur encore vivant.</div>

                  <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>1. Attribution des numéros</div>
                  <div style={{ marginBottom: 13 }}>
                    Chaque joueur lance une fléchette avec sa <b>main opposée</b>, puis saisit le résultat réel. Chaque numéro doit être unique : un numéro déjà pris doit être relancé.
                  </div>

                  <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>2. Monter jusqu’à 5 cœurs</div>
                  <div style={{ marginBottom: 13 }}>
                    Tous commencent à <b>0 cœur</b>. En touchant son propre numéro : simple = +1, double = +2, triple = +3. Le total est plafonné à 5.
                  </div>

                  <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>3. Statut KILLER</div>
                  <div style={{ marginBottom: 13 }}>
                    À <b>5 cœurs exactement</b>, le petit logo KILLER existant apparaît et le joueur peut attaquer. Dès qu’il redescend à 4 ou moins, le logo disparaît et il doit revenir à 5 pour redevenir KILLER.
                  </div>

                  <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>4. Attaques et élimination</div>
                  <div style={{ marginBottom: 13 }}>
                    Seul un KILLER peut retirer des cœurs en touchant le numéro d’un adversaire : simple = −1, double = −2, triple = −3. À <b>0</b>, le joueur reste vivant. Il est éliminé uniquement lorsque son total passe <b>sous 0</b>.
                  </div>

                  <div style={{ fontSize: 11, color: "#9aa0c4" }}>
                    Le statut est recalculé après chaque fléchette : atteindre 5 avec la première fléchette permet donc d’attaquer dès la suivante.
                  </div>
                </div>
              ) : (
              <div style={{ fontSize: 13, color: "#d7daf0", lineHeight: 1.35 }}>
                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Objectif</div>
                <div style={{ marginBottom: 12 }}>
                  Éliminer tous les adversaires. Le dernier joueur vivant gagne.
                </div>

                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Mise en place</div>
                <ul style={{ marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
                  <li>Chaque joueur a un nombre de vies (1–6).</li>
                  <li>
                    Chaque joueur reçoit un <b>numéro</b> (1–20) : soit <b>aléatoire</b>, soit <b>au 1er lancer</b> (option
                    « 1er lancer = choisir son numéro »).
                  </li>
                </ul>

                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Déroulé</div>
                <ul style={{ marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
                  <li>
                    Tant qu’un joueur n’est pas KILLER, il doit <b>toucher son numéro</b> pour devenir KILLER.
                  </li>
                  <li>
                    Une fois KILLER, il inflige des dégâts en touchant le <b>numéro d’un adversaire vivant</b>.
                  </li>
                  <li>Quand un joueur tombe à 0 vie, il est éliminé.</li>
                </ul>

                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Règles de base configurables</div>
                <ul style={{ marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
                  <li>
                    <b>Devenir KILLER</b> : toucher son numéro (simple) ou double sur son numéro.
                  </li>
                  <li>
                    <b>Dégâts</b> : « 1 par hit » ou « multiplicateur S/D/T » (S=1, D=2, T=3).
                  </li>
                </ul>

                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Variantes & fonctions spéciales</div>
                <ul style={{ marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
                  <li>
                    <b>Auto‑pénalité</b> : si tu es KILLER et tu touches ton numéro, tu perds des vies.
                  </li>
                  <li>
                    <b>Auto‑pénalité = multiplicateur</b> : la pénalité suit S/D/T au lieu de −1.
                  </li>
                  <li>
                    <b>Vol de vies</b> : les vies perdues par la cible sont transférées au KILLER.
                  </li>
                  <li>
                    <b>Blind Killer</b> : masque les numéros à l’écran pendant la partie (incompatible avec « 1er lancer »).
                  </li>
                </ul>

                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Fonctions BULL</div>
                <ul style={{ marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
                  <li>
                    <b>Dégâts à tous</b> : le SBULL inflige −1 à tous les adversaires vivants.
                  </li>
                  <li>
                    <b>Soin</b> : le BULL redonne des vies au tireur, selon la valeur de vies de départ / la configuration active.
                  </li>
                  <li>
                    <b>Rotation BULL</b> : si plusieurs fonctions BULL sont cochées avec la rotation activée, la fonction active alterne <b>tour après tour</b>.
                  </li>
                </ul>

                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Fonctions DBULL</div>
                <ul style={{ marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
                  <li>
                    <b>Dégâts à tous</b> : le DBULL inflige −2 à tous les adversaires vivants quand cette fonction est active.
                  </li>
                  <li>
                    <b>Bouclier</b> : le tireur gagne un bouclier qui bloque les dégâts reçus.
                  </li>
                  <li>
                    <b>Désarmement</b> : le tireur garde son statut KILLER et <b>désarme tous les autres killers</b>. Ils repassent à l’état de base et doivent retoucher leur numéro pour redevenir KILLER.
                  </li>
                  <li>
                    <b>Rotation DBULL</b> : si plusieurs fonctions DBULL sont cochées avec la rotation activée, la fonction active alterne <b>tour après tour</b>.
                  </li>
                </ul>

                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Bouclier : règles avancées</div>
                <ul style={{ marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
                  <li>
                    <b>Bouclier plein</b> : protège totalement tant qu’il n’a pas été contré.
                  </li>
                  <li>
                    <b>Contre sur DOUBLE</b> : si un adversaire touche en <b>double</b> le numéro du joueur protégé, le bouclier est <b>cassé immédiatement</b>.
                  </li>
                  <li>
                    <b>Contre sur TRIPLE</b> : si un adversaire touche en <b>triple</b> le numéro du joueur protégé, le bouclier perd <b>50 %</b> de son effet.
                  </li>
                  <li>
                    <b>Deux triples</b> : deux contres en triple annulent complètement le bouclier.
                  </li>
                </ul>

                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Résurrection</div>
                <ul style={{ marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
                  <li>
                    <b>Résurrection d’un joueur éliminé</b> : selon le mode choisi, un joueur mort peut revenir en jeu lorsqu’un adversaire vivant touche son numéro.
                  </li>
                  <li>
                    <b>Retour en jeu</b> : le joueur ressuscité revient avec le nombre de vies prévu par la configuration.
                  </li>
                  <li>
                    <b>Protection blanche temporaire</b> : juste après une résurrection, le joueur est protégé jusqu’à <b>son prochain tour</b>. Le petit bouclier blanc disparaît quand son tour arrive, mais le contour blanc reste pour identifier qu’il a été ressuscité.
                  </li>
                </ul>

                <div style={{ fontWeight: 900, color: "#fff", marginBottom: 6 }}>Lecture rapide</div>
                <ul style={{ marginTop: 0, marginBottom: 12, paddingLeft: 18 }}>
                  <li>
                    <b>Contour blanc</b> : joueur ressuscité.
                  </li>
                  <li>
                    <b>Petit bouclier blanc</b> : protection temporaire de résurrection, active jusqu’au tour du joueur.
                  </li>
                  <li>
                    <b>Petit bouclier bleu</b> : bouclier DBULL classique.
                  </li>
                </ul>

                <div style={{ fontSize: 11, color: "#9aa0c4" }}>
                  Astuce : certaines variantes sont incompatibles entre elles. Quand c’est le cas, l’option se grise avec une
                  explication. Les fonctions BULL et DBULL sont regroupées pour une lecture plus claire ; une seule fonction peut être active par case, sauf si la rotation est activée.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInfoOpen(false);
                    setRulesVideoOpen(true);
                  }}
                  style={{
                    width: "100%",
                    minHeight: 42,
                    marginTop: 14,
                    borderRadius: 999,
                    border: `1px solid ${primary}66`,
                    background: `linear-gradient(90deg, ${primary}22, rgba(255,255,255,.06))`,
                    color: "#fff",
                    fontWeight: 950,
                    fontSize: 11.5,
                    letterSpacing: .45,
                    cursor: "pointer",
                  }}
                >
                  ▶ AWENA · VOIR LES RÈGLES EN VIDÉO · 1 MIN 20
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      <KillerAwenaRulesVideo
        open={rulesVideoOpen}
        onDone={() => setRulesVideoOpen(false)}
      />

      {/* ✅ mini modal : détails Résurrection */}
      {resInfo && (
        <div
          onClick={() => setResInfo(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 96vw)",
              borderRadius: 18,
              background: "rgba(12,14,26,0.98)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.70)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 1000, color: primary, letterSpacing: 0.6 }}>{resInfo.title}</div>
              <button
                type="button"
                onClick={() => setResInfo(null)}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  padding: "6px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 12.5, color: "#d7daf0", lineHeight: 1.35 }}>
              {resInfo.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VariantRow({
  title,
  desc,
  value,
  onChange,
  primary,
  primarySoft,
  disabled,
  disabledReason,
}: {
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  primary: string;
  primarySoft: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const isDisabled = !!disabled;

  return (
    <div
      title={isDisabled ? disabledReason || "Option indisponible." : undefined}
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.20)",
        padding: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        opacity: isDisabled ? 0.45 : 1,
        filter: isDisabled ? "grayscale(35%)" : "none",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", color: "#d6d8ea" }}>
          {title}
        </div>
        <div style={{ marginTop: 4, fontSize: 10.5, color: "#7c80a0", lineHeight: 1.25 }}>{desc}</div>

        {isDisabled && !!disabledReason && (
          <div style={{ marginTop: 6, fontSize: 10.5, color: "#ffb3b3", fontWeight: 800, lineHeight: 1.2 }}>
            {disabledReason}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, flexShrink: 0, pointerEvents: isDisabled ? "none" : "auto" }}>
        <PillButton label="ON" active={value === true} onClick={() => onChange(true)} primary={primary} primarySoft={primarySoft} compact />
        <PillButton label="OFF" active={value === false} onClick={() => onChange(false)} primary={primary} primarySoft={primarySoft} compact />
      </div>
    </div>
  );
}
