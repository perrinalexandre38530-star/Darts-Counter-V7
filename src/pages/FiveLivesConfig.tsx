// @ts-nocheck
// =============================================================
// src/pages/FiveLivesConfig.tsx
// LES 5 VIES — CONFIG V2
// ✅ UI = pattern KillerConfig (carrousels profils + bots)
// - Sélection profils locaux (store.profiles)
// - Ajout bots : PRO + bots user depuis localStorage dc_bots_v1
// - Options : vies de départ, ordre de départ aléatoire
// - Lance FiveLivesPlay via go("five_lives_play", { config })
// ✅ NEW: BackDot + InfoDot harmonisés (même taille / halo / couleur thème)
// ✅ FIX: aura sélection BOTS = EXACTEMENT comme JOUEURS (theme.primary)
// =============================================================

import React from "react";
import { HeartLivesChoice, VariantIconChoice } from "../components/config/MssFiveLivesChoices";
import { MssKillerParticipantMode, MssKillerFormat } from "../components/config/MssKillerParticipantProtocol";
import MssGolfKillerTeamSelector from "./MssGolfKillerTeamSelector";
import MssSelectorIconButton from "../components/MssSelectorIconButton";
import MssClassicInputMethodSelector from "../components/config/MssClassicInputMethodSelector";
import MssGuidedAudioPanel from "../components/config/MssGuidedAudioPanel";
import awenaConseils from "../assets/president/awena_conseils.webp";

import { MssClassicConfigFlow, MssClassicOverview, type ClassicConfigView } from "../components/config/MssClassicConfigFlow";
import { applyResolvedBotCountries } from "../lib/botCountries";
import { loadBotPlayers, parseBotLevelValue, botLevelToStarAvg3d } from "../lib/bots";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import BotPagedSelector from "../components/BotPagedSelector";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import MssKillerPlayersShared from "../components/config/MssKillerPlayersShared";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";
import DartsRelatedModesPanel from "../components/DartsRelatedModesPanel";
import { dartsFamilyGameNavigation } from "../games/dartsGameFamilies";
import DartsResumeDraftCard from "../components/DartsResumeDraftCard";
import DartsPendingFinalCard from "../components/DartsPendingFinalCard";
import { clearDartsMatchDraft } from "../lib/dartsMatchDrafts";
import { getStorageUser } from "../lib/storage";
import {
  SCORE_INPUT_LS_KEY,
  sanitizeScoreInputMethod,
  type ScoreInputMethod,
} from "../lib/scoreInput/types";

import tickerFiveLives from "../assets/tickers/ticker_five_lives.png";
import tickerChaseFr from "../assets/tickers/ticker_chase_fr.webp";
import tickerChaseEn from "../assets/tickers/ticker_chase_en.webp";
// 🔽 AVATARS BOTS PRO (mêmes chemins que KillerConfig)
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

// --------------------------------------------------
// Types exportés (utilisés par FiveLivesPlay)
// --------------------------------------------------
export type FiveLivesConfigPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
  botLevel?: string;
};

export type FiveLivesPlayerLite = FiveLivesConfigPlayer;

export type FiveLivesConfig = {
  id: string;
  mode: "five_lives";
  createdAt: number;
  startingLives: number;
  randomStartOrder: boolean;
  startOrderSource?: "random" | "selection" | "bull";
  startOrderMode?: "random" | "alternate" | "manual" | "bull";
  allowEqualScore?: boolean; // CHASE : égalité autorisée
  variantId?: "chase";
  scoreInputMethod: ScoreInputMethod;
  players: FiveLivesConfigPlayer[];
};

type Props = {
  store: Store;
  presetVariantId?: "chase";
  go?: (tab: any, params?: any) => void;
  onBack?: () => void;
  onStart?: (cfg: FiveLivesConfig) => void;
  onStartGame?: (cfg: FiveLivesConfig) => void;
  onPlay?: (cfg: FiveLivesConfig) => void;
};

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string;
};

const PRO_BOTS: BotLite[] = applyResolvedBotCountries([
  { id: "bot_pro_mvg", name: "Green Machine", botLevel: "5/5", avatarDataUrl: avatarGreenMachine as any },
  { id: "bot_pro_littler", name: "Wonder Kid", botLevel: "5/5", avatarDataUrl: avatarWonderKid as any },
  { id: "bot_pro_humphries", name: "Cool Hand", botLevel: "5/5", avatarDataUrl: avatarCoolHand as any },
  { id: "bot_pro_taylor", name: "The Power", botLevel: "5/5", avatarDataUrl: avatarThePower as any },

  { id: "bot_pro_crafty", name: "Crafty", botLevel: "5/5", avatarDataUrl: avatarCraftyCockney as any },
  { id: "bot_pro_jackpot", name: "Jackpot", botLevel: "4.5/5", avatarDataUrl: avatarJackpot as any },
  { id: "bot_pro_barney", name: "Barney", botLevel: "4.5/5", avatarDataUrl: avatarBarney as any },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "4/5", avatarDataUrl: avatarIceMan as any },

  { id: "bot_pro_wright", name: "Snake King", botLevel: "4/5", avatarDataUrl: avatarSnakeKing as any },
  { id: "bot_pro_anderson", name: "Flying Scotsman", botLevel: "4/5", avatarDataUrl: avatarFlyingScotsman as any },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "4/5", avatarDataUrl: avatarBullyBoy as any },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "4/5", avatarDataUrl: avatarTheFerret as any },

  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "3.5/5", avatarDataUrl: avatarTheAsp as any },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "3.5/5", avatarDataUrl: avatarHollywood as any },
  { id: "bot_pro_darth_maple", name: "Darth Maple", botLevel: "3.5/5", avatarDataUrl: avatarDarthMaple as any },
  { id: "bot_pro_menace", name: "The Menace", botLevel: "3.5/5", avatarDataUrl: avatarTheMenace as any },

  { id: "bot_pro_the_giant", name: "The Giant", botLevel: "3/5", avatarDataUrl: avatarTheGiant as any },
  { id: "bot_pro_voltage", name: "Voltage", botLevel: "3/5", avatarDataUrl: avatarVoltage as any },
  { id: "bot_pro_one_dart", name: "One Dart", botLevel: "3/5", avatarDataUrl: avatarOneDart as any },
  { id: "bot_pro_the_hammer", name: "The Hammer", botLevel: "3/5", avatarDataUrl: avatarTheHammer as any },
]) as BotLite[];

function clampInt(n: any, min: number, max: number, fb: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return fb;
  return Math.max(min, Math.min(max, x));
}

function sanitizeFiveLivesScoreInput(value: unknown): ScoreInputMethod {
  const method = sanitizeScoreInputMethod(value);
  return method === "dartboard" ? method : "keypad";
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

function shuffleArray<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadUserBots(): BotLite[] {
  try {
    return loadBotPlayers().map((b: any) => ({
      ...b,
      id: String(b.id),
      name: b?.name || "BOT",
      avatarDataUrl: b?.avatarDataUrl ?? b?.avatarUrl ?? b?.avatar ?? null,
      avatarUrl: b?.avatarUrl ?? b?.avatar ?? null,
      avatar: b?.avatar ?? b?.avatarUrl ?? b?.avatarDataUrl ?? null,
      botLevel: b?.botLevel ?? b?.level ?? "",
    })).filter((b: any) => !!b.id);
  } catch {
    return [];
  }
}

function resolveBotLevel(botLevelRaw?: string | null): { level: number } {
  return { level: parseBotLevelValue(botLevelRaw, 1) };
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
        fontWeight: active && !isDisabled ? 800 : 650,
        boxShadow: active && !isDisabled ? `0 0 14px ${primary}55` : "none",
        whiteSpace: "nowrap",
        opacity: isDisabled ? 0.7 : 1,
        cursor: isDisabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

/* Médaillon BOT – étoiles à l'extérieur (StarRing hors médaillon)
   ✅ StarRing toujours visible (hors disque)
   ✅ Aucun cercle/halo de sélection
   ✅ Sélection = couleur / désélection = gris (comme carousel joueurs)
*/
function BotMedallion({
  bot,
  level,
  active,
}: {
  bot: BotLite;
  level: number;
  active: boolean;
}) {
  const isPro = bot.id.startsWith("bot_pro_");
  const COLOR = isPro ? "#f7c85c" : "#00b4ff";
  const COLOR_GLOW = isPro ? "rgba(247,200,92,0.9)" : "rgba(0,172,255,0.65)";

  const SCALE = 0.62;
  const AVATAR = 96 * SCALE;
  const MEDALLION = 104 * SCALE;
  const STAR = 18 * SCALE;

  // ✅ WRAP plus grand pour que les étoiles soient "dehors"
  const WRAP = MEDALLION + STAR * 2;

  const lvl = Math.max(1, Math.min(5, Number(level) || 1));
  const fakeAvg3d = botLevelToStarAvg3d(lvl, 1);

  const src = normalizeImgSrc(bot.avatarDataUrl);
  const fakeProfile = React.useMemo(
    () =>
      ({
        id: bot.id,
        name: bot.name,
        avatarUrl: src,
        avatarDataUrl: null,
      }) as any,
    [bot.id, bot.name, src]
  );

  return (
    <div
      style={{
        position: "relative",
        width: WRAP,
        height: WRAP,
        flex: "0 0 auto",
        overflow: "visible",
      }}
    >
      {/* ✅ StarRing = toujours visible, AU-DESSUS, "dehors" */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 5,
          filter: `drop-shadow(0 0 6px ${COLOR_GLOW})`,
        }}
      >
        <ProfileStarRing
          anchorSize={MEDALLION}
          gapPx={-2 * SCALE}
          starSize={STAR}
          stepDeg={10}
          avg3d={fakeAvg3d}
          color={COLOR}
        />
      </div>

      {/* ✅ Disque médaillon centré, SANS halo active */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: MEDALLION,
          height: MEDALLION,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          overflow: "hidden",

          // ✅ Pas de cercle de sélection
          boxShadow: "0 0 14px rgba(0,0,0,0.65)",

          // ✅ fond neutre (transparent autour = c'est le WRAP qui est "vide")
          background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), rgba(0,0,0,0.6))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2, // sous le StarRing
        }}
      >
        <div
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: "50%",
            overflow: "hidden",

            // ✅ EXACTEMENT comme joueurs : couleur si selected, gris si non
            filter: active ? "none" : "grayscale(100%) brightness(0.55)",
            opacity: active ? 1 : 0.6,
            transition: "filter .2s ease, opacity .2s ease",
          }}
        >
          <ProfileAvatar profile={fakeProfile} size={AVATAR} />
        </div>
      </div>
    </div>
  );
}


// 5 VIES / CHASE — paramètres historiques conservés, nouveau rituel UI MSS KILLER.
const FIVE_STEPS = ["Awena", "Joueurs ou équipes", "Format", "Sélection", "Variante", "Vies", "Départ", "Saisie", "Audio", "Récapitulatif"];
const FIVE_TIPS = [
  "", 
  "Commence par choisir JOUEURS ou ÉQUIPES. Le format se définit ensuite.",
  "En duel, deux adversaires s'affrontent ; en multi, le défi devient plus imprévisible.",
  "Vérifie les avatars et les bots choisis avant de lancer la partie.",
  "En classique, il faut dépasser le score précédent. En relais, l'égalité suffit.",
  "Plus de vies rallonge la partie. Cinq vies offrent un bon équilibre.",
  "Le BULL peut servir à départager les joueurs avant le premier tour.",
  "Le keypad et la cible saisissent les mêmes fléchettes : choisis ton confort.",
  "Ajuste les sons, les impacts et l'annonceur avant la première volée.",
  "Vérifie les vies, la variante, les participants et l'ordre de départ.",
];
const TEAM_KEYS = ["gold", "pink", "blue", "green"] as const;
type FiveTeamKey = typeof TEAM_KEYS[number];

function FiveAwenaTip({ text }: { text: string }) {
  return <div role="note" aria-label="Astuce Awena" style={{ width:"100%", maxWidth:260, margin:"14px auto", position:"relative", containerType:"inline-size", pointerEvents:"none" }}>
    <img src={awenaConseils} alt="Awena te donne une astuce" style={{ display:"block",width:"100%",height:"auto" }} />
    <div style={{ position:"absolute",top:"16%",left:"39%",width:"56%",height:"68%",display:"grid",alignContent:"center",textAlign:"center",color:"#241b26",overflow:"hidden",padding:"0 1%",boxSizing:"border-box" }}>
      <b style={{fontSize:"clamp(8px,4.2cqw,10px)",color:"#d81e2b",fontWeight:1000}}>ASTUCE</b>
      <span style={{fontSize:"clamp(7px,3.1cqw,8.5px)",fontWeight:900,lineHeight:1.13,overflowWrap:"break-word"}}>{text}</span>
    </div>
  </div>;
}

/** Fiche récapitulative alignée sur les sections, cartes de participants et le statut KILLER. */
function FiveLivesKillerRecap({
  accent, ready, players, mode, teamCount, teamSize, teamAssignments,
  variant, lives, startOrder, inputMethod, arcade, hits, voice, voiceLabel,
}: {
  accent: string;
  ready: boolean;
  players: FiveLivesConfigPlayer[];
  mode: "players" | "teams";
  teamCount: number;
  teamSize: number;
  teamAssignments: Record<string, FiveTeamKey>;
  variant: string;
  lives: number;
  startOrder: string;
  inputMethod: string;
  arcade: boolean;
  hits: boolean;
  voice: boolean;
  voiceLabel: string;
}) {
  const divider = `1px solid rgba(255,255,255,.09)`;
  const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 950, letterSpacing: .7, color: accent, marginBottom: 8, textTransform: "uppercase" };
  const teamNames = ["Team Gold", "Team Pink", "Team Blue", "Team Green"];
  const teamColors = ["#f7c85c", "#f452a8", "#42baf7", "#69c98d"];
  const rows: Array<[string, string]> = [
    ["Variante", variant], ["Vies", `${lives} / joueur`],
    ["Départ", startOrder], ["Saisie", inputMethod],
    ["Arcade", arcade ? "Activés" : "Désactivés"],
    ["Bruitages", hits ? "Activés" : "Désactivés"],
    ["Annonces", voice ? voiceLabel : "Désactivées"],
  ];
  const avatar = (player: FiveLivesConfigPlayer, size = 32) => <span key={player.id} style={{ width: size, height: size, flexShrink: 0, display: "inline-grid", placeItems: "center", overflow: "hidden", borderRadius: "50%", background: `${accent}21`, border: `1px solid ${accent}88` }}>
    {player.avatarDataUrl ? <img src={player.avatarDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <strong style={{ fontSize: 10, color: accent }}>{player.name.slice(0, 2).toUpperCase()}</strong>}
  </span>;
  return <section aria-label="Fiche de partie LES 5 VIES" style={{ border: `1px solid ${accent}55`, borderRadius: 16, background: "linear-gradient(155deg,rgba(25,26,37,.9),rgba(9,11,21,.94))", padding: "12px 12px 10px", display: "grid", gap: 12, minWidth: 0, marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
        <strong style={{ fontSize: 14, fontWeight: 1000, letterSpacing: .65, color: accent }}>FICHE DE PARTIE</strong>
        <span style={{ fontSize: 11, color: "#afb8cb" }}>{mode === "teams" ? `${teamCount} équipes · ${teamSize} membres / équipe` : `${players.length} joueur${players.length > 1 ? "s" : ""}`}</span>
      </div>
      <span role="status" style={{ border: `1px solid ${ready ? accent : "#fb7185"}55`, color: ready ? accent : "#fb7185", borderRadius: 20, padding: "5px 9px", fontWeight: 950, fontSize: 10, whiteSpace: "nowrap" }}>{ready ? "✓ PRÊT" : "À COMPLÉTER"}</span>
    </div>
    <div style={{ borderTop: divider, paddingTop: 9 }}>
      <div style={sectionTitle}>{mode === "teams" ? "ÉQUIPES EN JEU" : "JOUEURS EN JEU"}</div>
      {mode === "teams" ? <div style={{ display: "grid", gap: 6 }}>
        {Array.from({ length: teamCount }, (_, index) => {
          const key = TEAM_KEYS[index];
          const members = players.filter(player => teamAssignments[player.id] === key);
          return <div key={key} style={{ display: "flex", gap: 9, alignItems: "center", minWidth: 0, background: "rgba(255,255,255,.025)", borderRadius: 10, borderLeft: `2px solid ${teamColors[index]}`, padding: "7px 8px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: 12, color: teamColors[index] }}>{teamNames[index]}</strong>
              <div style={{ fontSize: 10, color: "#bbc2d3", overflowWrap: "anywhere" }}>{members.length ? members.map(member => member.name).join(" · ") : "Aucun membre sélectionné"}</div>
            </div>
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>{members.slice(0, 5).map(member => avatar(member, 25))}</div>
            <span style={{ fontSize: 10, color: "#aeb5c9", whiteSpace: "nowrap" }}>{members.length}/{teamSize}</span>
          </div>;
        })}
      </div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
        {players.length ? players.map(player => <div key={player.id} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, padding: 5 }}>{avatar(player)}<span style={{ minWidth: 0, overflowWrap: "anywhere", fontSize: 11, fontWeight: 850 }}>{player.name}</span></div>) : <span style={{ color: "#adb6c8", fontSize: 11, gridColumn: "1 / -1" }}>Aucun participant sélectionné</span>}
      </div>}
    </div>
    <div style={{ borderTop: divider, paddingTop: 9 }}>
      <div style={sectionTitle}>RÈGLES ESSENTIELLES</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: 14 }}>
        {rows.slice(0, 4).map(([label, value]) => <div key={label} style={{ padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.055)", minWidth: 0 }}><div style={{ color: "#a9afc4", fontSize: 10, fontWeight: 850, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 12, fontWeight: 850, marginTop: 3, color: "#f9f8ff", overflowWrap: "anywhere" }}>{value}</div></div>)}
      </div>
    </div>
    <div style={{ borderTop: divider, paddingTop: 9 }}>
      <div style={sectionTitle}>AUDIO</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: 14 }}>
        {rows.slice(4).map(([label, value]) => <div key={label} style={{ padding: "7px 0", minWidth: 0 }}><div style={{ color: "#a9afc4", fontSize: 10, fontWeight: 850, textTransform: "uppercase" }}>{label}</div><div style={{ color: "#f9f8ff", fontSize: 11, fontWeight: 850, marginTop: 3, overflowWrap: "anywhere" }}>{value}</div></div>)}
      </div>
    </div>
    {!ready && <p style={{ fontSize: 10.5, color: "#fca5a5", margin: 0 }}>Complète la sélection des participants avant le lancement.</p>}
  </section>;
}

export default function FiveLivesConfig({ store, go, presetVariantId, onBack, onStart, onStartGame, onPlay }: Props) {
  const { theme } = useTheme();
  const { lang, t } = useLang();
  const primary = theme?.primary || "#f7c85c";
  const cardBg = "rgba(9,12,24,.95)";
  const chasePreset = presetVariantId === "chase";
  const tickerSrc = chasePreset ? (String(lang).toLowerCase()==="fr" ? tickerChaseFr : tickerChaseEn) : tickerFiveLives;
  const [view,setView] = React.useState<ClassicConfigView>("guided");
  const [step,setStep] = React.useState(0);
  const guided = view==="guided";
  const [infoOpen,setInfoOpen] = React.useState(false);
  const [participantsMode,setParticipantsMode] = React.useState<"players"|"teams">("players");
  const [playerFormat,setPlayerFormat] = React.useState<"duel"|"multi">("duel");
  const [teamCount,setTeamCount] = React.useState(2);
  const [teamSize,setTeamSize] = React.useState(2);
  const [teamAssignments,setTeamAssignments] = React.useState<Record<string,FiveTeamKey>>({});
  const [startingLives,setStartingLives] = React.useState(5);
  const [allowEqualScore,setAllowEqualScore] = React.useState(chasePreset);
  const [startOrderMode,setStartOrderMode] = React.useState<"random"|"alternate"|"manual"|"bull">("random");
  const [scoreInputMethod,setScoreInputMethod] = React.useState<ScoreInputMethod>(()=>{
    try { return sanitizeFiveLivesScoreInput(localStorage.getItem(SCORE_INPUT_LS_KEY)||"keypad"); } catch { return "keypad"; }
  });
  const [arcadeEnabled,setArcadeEnabled] = React.useState(true);
  const [hitEnabled,setHitEnabled] = React.useState(true);
  const [voiceEnabled,setVoiceEnabled] = React.useState(true);
  const [voiceId,setVoiceId] = React.useState("awena");
  const [botRevision,setBotRevision] = React.useState(0);
  const [extraBots,setExtraBots] = React.useState<any[]>([]);
  const [localProfiles,setLocalProfiles] = React.useState<any[]>([]);
  const [showBots,setShowBots] = React.useState(false);
  const humanProfiles = React.useMemo(()=>[...(store?.profiles||[]).filter((x:any)=>!x.isBot),...localProfiles], [store?.profiles,localProfiles]);
  const botProfiles = React.useMemo(()=>{
    const items=[...PRO_BOTS,...loadUserBots(),...extraBots];
    return Array.from(new Map(items.map((b:any)=>[String(b.id),b])).values()) as BotLite[];
  },[botRevision,extraBots]);
  const [selectedIds,setSelectedIds] = React.useState<string[]>(()=>{
    const ps=(store?.profiles||[]).filter((x:any)=>!x.isBot);
    return ps.slice(0,2).map((x:any)=>String(x.id));
  });
  const togglePlayer=(id:string)=>setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const resolvePlayer=(id:string):FiveLivesConfigPlayer|null=>{
    const p=[...humanProfiles,...botProfiles].find((x:any)=>String(x.id)===String(id));
    if(!p)return null;
    return {id:String(p.id),name:String(p.name||"Joueur"),avatarDataUrl:pickAvatar(p) || normalizeImgSrc((p as any).avatarDataUrl),isBot:!!(p as any).isBot || botProfiles.some(b=>String(b.id)===id),botLevel:(p as any).botLevel};
  };
  const teamMode=participantsMode==="teams";
  const required=teamCount*teamSize;
  const maxSelection=teamMode?required:playerFormat==="duel"?2:20;
  const validTeams=TEAM_KEYS.slice(0,teamCount).every(key=>selectedIds.filter(id=>teamAssignments[id]===key).length===teamSize);
  const canStart=teamMode?selectedIds.length===required && validTeams:playerFormat==="duel"?selectedIds.length===2:selectedIds.length>=2;
  const onModeChange=(mode:"players"|"teams")=>{setParticipantsMode(mode);setSelectedIds([]);setTeamAssignments({});};
  const sectionStyle:React.CSSProperties={background:cardBg,border:`1px solid ${primary}40`,borderRadius:18,padding:"15px 13px",marginBottom:14,minWidth:0};
  const titleStyle:React.CSSProperties={fontSize:14,fontWeight:950,color:primary,letterSpacing:.65,textTransform:"uppercase",marginBottom:12};
  const show=(i:number)=>!guided || step===i;
  const option=(value:string,active:boolean,click:()=>void)=> <button key={value} type="button" onClick={click} aria-pressed={active} style={{borderRadius:12,padding:"10px 12px",fontSize:12,fontWeight:950,cursor:"pointer",minWidth:0,border:`1px solid ${active?primary:`${primary}65`}`,background:active?`${primary}21`:"rgba(255,255,255,.03)",color:active?primary:"#fff"}}>{value}</button>;
  function launch(){
    if(!canStart)return;
    const players=selectedIds.map(resolvePlayer).filter(Boolean) as FiveLivesConfigPlayer[];
    const finalPlayers=startOrderMode==="random"?shuffleArray(players):players;
    const cfg:FiveLivesConfig={id:`fiveLives-${Date.now()}`,mode:"five_lives",createdAt:Date.now(),...(chasePreset?{variantId:"chase" as const}:{}),startingLives,randomStartOrder:startOrderMode==="random",startOrderSource:startOrderMode==="bull"?"bull":startOrderMode==="random"?"random":"selection",startOrderMode,allowEqualScore:chasePreset||allowEqualScore,scoreInputMethod,players:finalPlayers};
    // Métadonnées de configuration : FiveLivesPlay reste un moteur individuel.
    (cfg as any).participantMode=participantsMode;
    (cfg as any).teamCount=teamMode?teamCount:undefined;
    (cfg as any).teamAssignments=teamMode?teamAssignments:undefined;
    (cfg as any).arcadeEnabled=arcadeEnabled;
    (cfg as any).hitEnabled=hitEnabled;
    (cfg as any).voiceEnabled=voiceEnabled;
    (cfg as any).voiceId=voiceId;
    clearDartsMatchDraft(chasePreset?"chase":"five_lives",getStorageUser());
    try{localStorage.setItem(SCORE_INPUT_LS_KEY,scoreInputMethod);}catch{}
    try{recordProfileUsageForMode("five_lives",finalPlayers.map(x=>x.id));}catch{}
    const startCb=onStart||onStartGame||onPlay;
    if(startCb)return startCb(cfg);
    go?.("five_lives_play",{config:cfg});
  }
  const audioVoices=[{id:"awena",label:"Awena · voix officielle"},{id:"default",label:"Défaut"},{id:"female",label:"Voix féminine"},{id:"male",label:"Voix masculine"}];
  const startModes=[{id:"random",icon:"random-order",label:"Aléatoire",description:"L'ordre est mélangé au lancement."},{id:"alternate",icon:"alternate-order",label:"Alterné",description:"Conserve l'ordre de sélection."},{id:"manual",icon:"manual-pick",label:"Manuel",description:"Défini par les participants sélectionnés."},{id:"bull",icon:"bull-order",label:"Bull",description:"Départagez-vous par lancer physique au bull."}] as const;
  const methodLabel=scoreInputMethod==="dartboard"?"CIBLE":"KEYPAD";
  return <div className="screen five-lives-config msc-mode-config msc-mode-config--split" style={{display:"flex",flexDirection:"column",minHeight:"100dvh",padding:"12px 12px 100px",background:"#050710",color:"#fff"}}>
    <div style={{position:"sticky",top:0,zIndex:60,margin:"0 -12px 12px",background:"#050710"}}>
      <img src={tickerSrc as any} alt={chasePreset?"CHASE":"Five Lives"} style={{width:"100%",height:100,objectFit:"cover",display:"block"}} />
      <div style={{position:"absolute",inset:0,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 12px",pointerEvents:"none"}}>
        <div style={{pointerEvents:"auto"}}><BackDot onClick={()=>onBack?onBack():go?.("games")} size={42} color={primary} glow={`${primary}AA`} /></div>
        <div style={{pointerEvents:"auto"}}><InfoDot onClick={()=>setInfoOpen(true)} size={42} color={primary} glow={`${primary}AA`} title="Règles" /></div>
      </div>
    </div>
    {step===0 && <DartsRelatedModesPanel gameId={chasePreset?"chase":"five_lives"} accent={primary} compact onOpenGame={id=>{const target=dartsFamilyGameNavigation(id);if(target)go?.(target.tab,target.params);}} />}
    <MssClassicConfigFlow title={chasePreset?"Chase":"Les 5 vies"} steps={FIVE_STEPS} step={step} view={view} accent={primary} summary={`${selectedIds.length} participants${teamMode?` · ${teamCount} équipes`:""}`} onStep={setStep} onView={setView} onHelp={()=>setInfoOpen(true)} />
    <main className="msc-mode-config-body" style={{flex:1,overflowY:"auto",paddingBottom:24}}>
      <DartsPendingFinalCard mode={chasePreset?"chase":"five_lives"} accent={primary} onRecovered={()=>go?.("statsHub",{tab:"history"})}/>
      <DartsResumeDraftCard mode={chasePreset?"chase":"five_lives"} accent={primary} onResume={savedConfig=>go?.("five_lives_play",{config:savedConfig,resumeDraft:true})}/>
      {show(0) && <MssClassicOverview title={`${chasePreset?"CHASE":"LES 5 VIES"} · AWENA VOUS EXPLIQUE`} accent={primary} onHelp={()=>setInfoOpen(true)} description="Sur chaque volée, dépasse le score précédent en classique, ou égale-le en relais. Choisis les participants puis les vies et les options avant de jouer." />}
      {show(1) && <section style={sectionStyle}><div style={titleStyle}>PARTICIPANTS</div><MssKillerParticipantMode mode={participantsMode} onChange={onModeChange} accent={primary} /></section>}
      {show(2) && <section style={sectionStyle}><div style={titleStyle}>{teamMode?"FORMAT DES ÉQUIPES":"FORMAT JOUEURS"}</div><MssKillerFormat mode={participantsMode} playerFormat={playerFormat} onPlayerFormat={value=>{setPlayerFormat(value);if(value==="duel")setSelectedIds(ids=>ids.slice(0,2));}} teamCount={teamCount} onTeamCount={count=>{setTeamCount(count);setSelectedIds([]);setTeamAssignments({});}} teamSize={teamSize} onTeamSize={size=>{setTeamSize(size);setSelectedIds([]);setTeamAssignments({});}} accent={primary} maxPlayers={20}/></section>}
      {show(3) && <section style={sectionStyle}><div style={titleStyle}>{teamMode?"CHOIX ÉQUIPES":"CHOIX JOUEURS"}</div>
        {teamMode ? <MssGolfKillerTeamSelector humanProfiles={humanProfiles} bots={botProfiles} selectedIds={selectedIds} setSelectedIds={setSelectedIds} teamAssignments={teamAssignments as any} setTeamAssignments={setTeamAssignments as any} teamCount={teamCount} teamSize={teamSize} accent={primary} onRefreshBots={()=>setBotRevision(v=>v+1)} onAddBots={bots=>setExtraBots(prev=>[...prev,...bots])} onUpdateProfiles={update=>setLocalProfiles(prev=>{const result=update({profiles:[...(store?.profiles||[]),...prev]});return (result?.profiles||[]).filter((x:any)=>!(store?.profiles||[]).some((p:any)=>p.id===x.id));})} /> : <MssKillerPlayersShared usageMode="five_lives" profiles={humanProfiles} bots={botProfiles}
          selectedIds={selectedIds} onToggle={(id:string)=>{if(!selectedIds.includes(id)&&selectedIds.length>=maxSelection)return;togglePlayer(id);}}
          accent={primary} maxSelection={maxSelection}
          onCreateProfile={(p:any)=>setLocalProfiles(prev=>[...prev,p])}
          onCreateBot={(bot:any)=>setExtraBots(prev=>[...prev,{...bot,isBot:true}])} />}
        {teamMode&&<p style={{fontSize:11,color:"#c1c8d5",marginTop:12}}>Les compositions sont enregistrées ; le moteur actuel des 5 Vies conserve un classement individuel par joueur.</p>}<div style={{fontSize:11,color:canStart?primary:"#ffb3a9",marginTop:12}}>{teamMode?`${selectedIds.length}/${required} membres · ${teamCount} équipes`:playerFormat === "duel" ? "Sélectionne 2 participants" : `Sélection : ${selectedIds.length} participants · MULTI`}</div>
      </section>}
      {show(4) && <section style={sectionStyle}><div style={titleStyle}>VARIANTE DE JEU</div><div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:14,flexWrap:"wrap",marginBottom:12}}>{!chasePreset&&<VariantIconChoice accent={primary} active={!allowEqualScore} title="Classique" subtitle="Classique" mode="classic" onClick={()=>setAllowEqualScore(false)} />}{<VariantIconChoice accent={primary} active={chasePreset||allowEqualScore} title={chasePreset?"Chase":"Relais"} subtitle={chasePreset?"Chase":"Relais"} mode={chasePreset?"chase":"relay"} onClick={()=>setAllowEqualScore(true)} />}</div><div style={{textAlign:"center",display:"grid",gap:6}}><strong style={{fontSize:15,fontWeight:1000,color:primary,letterSpacing:.55}}>{chasePreset?"CHASE":allowEqualScore?"RELAIS":"CLASSIQUE"}</strong><p style={{fontSize:12,color:"#b0bbcf",lineHeight:1.52,maxWidth:360,margin:"0 auto"}}>{chasePreset?"CHASE : une égalité suffit ; les survivants changent d'ordre après chaque cycle et le rythme de survie reste tendu du début à la fin.":allowEqualScore?"RELAIS : l'égalité est acceptée pour valider la volée. Le rythme est plus souple et convient mieux aux parties coopératives ou accessibles.":"CLASSIQUE : la nouvelle volée doit être strictement supérieure à la précédente. Cette version récompense la régularité et met davantage de pression sur chaque passage."}</p></div></section>}
      {show(5) && <section style={sectionStyle}><div style={titleStyle}>VIES DE DÉPART</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",justifyItems:"center",gap:6}}>{[3,4,5,6,7,8,9,10].map(n=><HeartLivesChoice key={n} value={n} active={startingLives===n} onClick={()=>setStartingLives(n)} primary={primary} />)}</div><p style={{fontSize:11,color:"#adb5c7",textAlign:"center",margin:"6px auto 0",maxWidth:320}}>Chaque joueur commence avec le même nombre de vies. Choisis le cœur qui définit la réserve de départ.</p></section>}
      {show(6) && <section style={sectionStyle}><div style={titleStyle}>ORDRE DE DÉPART</div><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{startModes.map(m=><MssSelectorIconButton key={m.id} icon={m.icon} label={m.label} accent={primary} active={startOrderMode===m.id} onClick={()=>setStartOrderMode(m.id)}/>)}</div><div style={{textAlign:"center",marginTop:12}}><b style={{fontSize:13,color:primary}}>{startModes.find(x=>x.id===startOrderMode)?.label.toUpperCase()}</b><p style={{fontSize:11,color:"#aeb7ca"}}>{startModes.find(x=>x.id===startOrderMode)?.description}</p></div></section>}
      {show(7) && <section style={sectionStyle}><MssClassicInputMethodSelector value={scoreInputMethod} onChange={setScoreInputMethod} accent={primary} /></section>}
      {show(8) && <section style={sectionStyle}><div style={titleStyle}>MODE AUDIO</div><MssGuidedAudioPanel accent={primary} arcade={arcadeEnabled} hits={hitEnabled} voice={voiceEnabled} onArcadeChange={setArcadeEnabled} onHitsChange={setHitEnabled} onVoiceChange={setVoiceEnabled} voiceId={voiceId} voices={audioVoices} onVoiceIdChange={setVoiceId}/></section>}
      {show(9) && <FiveLivesKillerRecap accent={primary} ready={canStart}
        players={selectedIds.map(resolvePlayer).filter(Boolean) as FiveLivesConfigPlayer[]}
        mode={participantsMode} teamCount={teamCount} teamSize={teamSize} teamAssignments={teamAssignments}
        variant={chasePreset ? "CHASE" : allowEqualScore ? "RELAIS" : "CLASSIQUE"}
        lives={startingLives} startOrder={startModes.find(m => m.id === startOrderMode)?.label || "Aléatoire"}
        inputMethod={methodLabel} arcade={arcadeEnabled} hits={hitEnabled} voice={voiceEnabled}
        voiceLabel={audioVoices.find(v => v.id === voiceId)?.label || "Voix"} />}
      {(!guided || step>0)&&<FiveAwenaTip text={guided?FIVE_TIPS[step]:FIVE_TIPS[9]}/>}
      {show(9) && <div style={{padding:"0 0 35px"}}><button type="button" disabled={!canStart} onClick={launch} style={{width:"100%",height:52,borderRadius:999,border:0,background:canStart?primary:"#555",color:"#161616",fontSize:16,fontWeight:1000,opacity:canStart?1:.6}}>LANCER LA PARTIE</button>{!canStart&&<p style={{fontSize:11,color:"#ffada4",textAlign:"center"}}>Sélectionne tous les participants requis.</p>}</div>}
    </main>
    {infoOpen&&<div onClick={()=>setInfoOpen(false)} role="presentation" style={{position:"fixed",inset:0,zIndex:10000,background:"#000d",display:"grid",placeItems:"center",padding:15}}><div role="dialog" onClick={e=>e.stopPropagation()} style={{maxWidth:450,padding:20,background:"#101421",border:`1px solid ${primary}`,borderRadius:18}}><b style={{color:primary}}>RÈGLES · {chasePreset?"CHASE":"LES 5 VIES"}</b><p style={{fontSize:13,lineHeight:1.5}}>Chacun commence avec {startingLives} vies. Chaque volée doit {chasePreset||allowEqualScore?"égaler ou dépasser":"dépasser"} le score précédent, sinon une vie est perdue. Le dernier survivant gagne.</p><button type="button" onClick={()=>setInfoOpen(false)} style={{background:primary,padding:"10px 22px",border:0,borderRadius:12,fontWeight:900}}>FERMER</button></div></div>}
  </div>;
}
