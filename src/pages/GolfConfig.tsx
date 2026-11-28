import MssKillerBooleanToggle from "../components/config/MssKillerBooleanToggle";
import MssGuidedAudioPanel from "../components/config/MssGuidedAudioPanel";
import { MssGolfInputMethodSelector, MssGolfAwenaTip } from "../components/config/MssGolfInputAndTips";
import { MssQuickStartOrder, type QuickStartOrderMode } from "../components/config/MssGolfQuickControls";
import { MssClassicConfigFlow, MssClassicOverview, MssClassicRecap, type ClassicConfigView } from "../components/config/MssClassicConfigFlow";
// =============================================================
// src/pages/GolfConfig.tsx
// GOLF (Darts) — Config PRO (UX alignée sur DepartementsConfig / X01Config)
// - Carrousel Profils (humains) toujours visible
// - Carrousel Bots IA visible si toggle activé
// - Bots = PRO_BOTS + bots custom (localStorage dc_bots_v1)
// - Sélection via click (selectedIds)
// - Mode TEAMS: GOLD / PINK / BLUE / GREEN (2 à 4 équipes, 3 possible)
//   + assignation manuelle ou auto (round-robin)
//   + équipes déséquilibrées autorisées (5/7 joueurs, etc.)
// - Ordre de départ: Chronologique ou Aléatoire (joueurs ou équipes)
// =============================================================

import React from "react";
import { applyResolvedBotCountries } from "../lib/botCountries";
import { loadBotPlayers } from "../lib/bots";

import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import ProfileAvatar from "../components/ProfileAvatar";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import MssKillerPlayersShared from "../components/config/MssKillerPlayersShared";
import { MssKillerParticipantMode, MssKillerFormat } from "../components/config/MssKillerParticipantProtocol";
import MssSelectorIconButton from "../components/MssSelectorIconButton";
import MssGolfKillerTeamSelector from "./MssGolfKillerTeamSelector";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import BotPagedSelector from "../components/BotPagedSelector";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";

import tickerGolf from "../assets/tickers/ticker_golf.png";

// ✅ Logos teams (déjà présents dans le projet)
import teamGoldLogo from "../ui_assets/teams/team_gold.png";
import teamPinkLogo from "../ui_assets/teams/team_pink.png";
import teamBlueLogo from "../ui_assets/teams/team_blue.png";
import teamGreenLogo from "../ui_assets/teams/team_green.png";

// ✅ Avatars PRO bots (assets locaux)
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarJackpot from "../assets/avatars/bots-pro/jackpot.png";
import avatarCraftyCockney from "../assets/avatars/bots-pro/crafty-cockney.png";
import avatarBarney from "../assets/avatars/bots-pro/barney.png";
import avatarTheMenace from "../assets/avatars/bots-pro/the-menace.png";
import avatarDarthMaple from "../assets/avatars/bots-pro/darth-maple.png";
import avatarTheGiant from "../assets/avatars/bots-pro/the-giant.png";
import avatarTheHammer from "../assets/avatars/bots-pro/the-hammer.png";
import avatarVoltage from "../assets/avatars/bots-pro/voltage.png";
import avatarOneDart from "../assets/avatars/bots-pro/one-dart.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";

type BotLevel = "easy" | "normal" | "hard";
type HoleOrderMode = "chronological" | "random";
type GolfScoringMode = "strokes" | "points";
type StartOrderMode = QuickStartOrderMode;
type TeamKey = "gold" | "pink" | "blue" | "green";

export type GolfConfigPayload = {
  players: number;
  selectedIds: string[];
  quickPlayers?: any[];
  holes: 9 | 18;

  teamsEnabled: boolean;
  teamCount?: 2 | 3 | 4;
  teamAssignments?: Record<string, TeamKey>;

  botsEnabled: boolean;
  botLevel: BotLevel;

  missStrokes: 4 | 5 | 6 | 7 | 8;
  holeOrderMode: HoleOrderMode;
  scoringMode: GolfScoringMode;

  // ✅ ordre de départ (joueurs ou équipes)
  startOrderMode: StartOrderMode;
  scoreInputMethod?: "keypad" | "dartboard";
  audioEnabled?: boolean;
  audio?: { arcadeEnabled: boolean; hitEnabled: boolean; voiceEnabled: boolean; voiceId: string };

  showHoleGrid: boolean;
};

const LS_CFG_KEY = "dc_modecfg_golf";
type BotLite = { id: string; name: string; avatarDataUrl: string | null; botLevel?: string };

const PRO_BOTS: BotLite[] = applyResolvedBotCountries([
  { id: "pro_mvg", name: "Green Machine", botLevel: "5/5", avatarDataUrl: avatarGreenMachine as any },
  { id: "pro_littler", name: "Wonder Kid", botLevel: "5/5", avatarDataUrl: avatarWonderKid as any },
  { id: "pro_humphries", name: "Cool Hand", botLevel: "5/5", avatarDataUrl: avatarCoolHand as any },
  { id: "pro_taylor", name: "The Power", botLevel: "5/5", avatarDataUrl: avatarThePower as any },

  { id: "pro_crafty", name: "Crafty", botLevel: "5/5", avatarDataUrl: avatarCraftyCockney as any },
  { id: "pro_jackpot", name: "Jackpot", botLevel: "4.5/5", avatarDataUrl: avatarJackpot as any },
  { id: "pro_barney", name: "Barney", botLevel: "4.5/5", avatarDataUrl: avatarBarney as any },
  { id: "pro_price", name: "Ice Man", botLevel: "4/5", avatarDataUrl: avatarIceMan as any },

  { id: "pro_wright", name: "Snake King", botLevel: "4/5", avatarDataUrl: avatarSnakeKing as any },
  { id: "pro_anderson", name: "Flying Scotsman", botLevel: "4/5", avatarDataUrl: avatarFlyingScotsman as any },
  { id: "pro_smith", name: "Bully Boy", botLevel: "4/5", avatarDataUrl: avatarBullyBoy as any },
  { id: "pro_clayton", name: "The Ferret", botLevel: "4/5", avatarDataUrl: avatarTheFerret as any },

  { id: "pro_aspinall", name: "The Asp", botLevel: "3.5/5", avatarDataUrl: avatarTheAsp as any },
  { id: "pro_dobey", name: "Hollywood", botLevel: "3.5/5", avatarDataUrl: avatarHollywood as any },
  { id: "pro_darth_maple", name: "Darth Maple", botLevel: "3.5/5", avatarDataUrl: avatarDarthMaple as any },
  { id: "pro_menace", name: "The Menace", botLevel: "3.5/5", avatarDataUrl: avatarTheMenace as any },

  { id: "pro_the_giant", name: "The Giant", botLevel: "3/5", avatarDataUrl: avatarTheGiant as any },
  { id: "pro_voltage", name: "Voltage", botLevel: "3/5", avatarDataUrl: avatarVoltage as any },
  { id: "pro_one_dart", name: "One Dart", botLevel: "3/5", avatarDataUrl: avatarOneDart as any },
  { id: "pro_the_hammer", name: "The Hammer", botLevel: "3/5", avatarDataUrl: avatarTheHammer as any },
]) as BotLite[];

const TEAM_META: Record<TeamKey, { label: string; color: string; logo: string }> = {
  gold: { label: "TEAM GOLD", color: "#ffcf57", logo: teamGoldLogo },
  pink: { label: "TEAM PINK", color: "#ff7ac8", logo: teamPinkLogo },
  blue: { label: "TEAM BLUE", color: "#6bb7ff", logo: teamBlueLogo },
  green: { label: "TEAM GREEN", color: "#7fe2a9", logo: teamGreenLogo },
};

const TEAM_KEYS_ALL: TeamKey[] = ["gold", "pink", "blue", "green"];


function TeamPillButton({
  label,
  color,
  active,
  onClick,
  disabled,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      onClick={onClick}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 999,
        border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.12)",
        background: active ? `linear-gradient(180deg, ${color}33, rgba(0,0,0,0.22))` : "rgba(0,0,0,0.18)",
        color: active ? color : "rgba(255,255,255,0.85)",
        fontWeight: 950,
        fontSize: 12,
        letterSpacing: 0.4,
        boxShadow: active ? `0 0 18px ${color}26` : "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function readUserBotsFromLS(): BotLite[] {
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

function botToFakeProfile(b: BotLite) {
  return {
    id: b.id,
    name: b.name,
    avatarDataUrl: (b as any).avatarDataUrl ?? (b as any).avatarUrl ?? (b as any).avatar ?? null,
    avatarUrl: (b as any).avatarUrl ?? (b as any).avatar ?? null,
    avatar: (b as any).avatar ?? (b as any).avatarUrl ?? (b as any).avatarDataUrl ?? null,
    isBot: true,
    botLevel: b.botLevel || "",
  } as any;
}

function isBotLike(p: any) {
  if (!p) return false;
  if (p.isBot || p.bot || p.type === "bot" || p.kind === "bot") return true;
  if (typeof p.botLevel === "string" && p.botLevel) return true;
  if (typeof p.level === "string" && p.level) return true;
  return false;
}

function normalizeTeamCount(n: any): 2 | 3 | 4 {
  const v = Number(n);
  if (v === 3) return 3;
  if (v >= 4) return 4;
  return 2;
}

/** Sélections MSS — même accent que le thème actif, sans panneau gris hérité des anciennes règles. */
function GolfThemeChoice<T extends string | number>({ label, value, options, onChange, accent, hint, compact = false }: {
  label: string; value: T; options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void; accent: string; hint?: string; compact?: boolean;
}) {
  return <div style={{ display: "grid", gap: 8, marginBottom: 16, minWidth: 0 }}>
    <div style={{ color: accent, fontWeight: 900, fontSize: 12, letterSpacing: .5 }}>{label}</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: compact ? "center" : "flex-start" }}>
      {options.map((option) => {
        const selected = option.value === value;
        return <button type="button" key={String(option.value)} aria-pressed={selected}
          onClick={() => onChange(option.value)} style={{ minHeight: 42, minWidth: compact ? 45 : 75,
            padding: compact ? "8px 11px" : "9px 13px", borderRadius: compact ? 999 : 13,
            border: `1px solid ${selected ? accent : `${accent}55`}`,
            background: selected ? `${accent}24` : "rgba(255,255,255,.035)",
            color: selected ? accent : "#edf0f8", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>
          {option.label}
        </button>;
      })}
    </div>
    {hint && <div style={{ color: "#aeb8d0", fontSize: 11 }}>{hint}</div>}
  </div>;
}

export default function GolfConfig(props: any) {
  const { t } = useLang();
  const { theme } = useTheme();

  React.useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const storeProfiles: any[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
  const [golfNewProfiles,setGolfNewProfiles] = React.useState<any[]>([]);
  const humanProfiles = [...storeProfiles.filter((p) => !isBotLike(p)), ...golfNewProfiles];

  // Source normative : accent du thème actif, jamais de vert GOLF codé en dur.
  const primary = theme.primary;
  const cardBg = `radial-gradient(120% 160% at 0% 0%, color-mix(in srgb, ${primary} 14%, transparent), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.34))`;
  const golfVoiceChoices = React.useMemo(() => [
    { id: "default", label: "Défaut" },
    { id: "female", label: "Voix féminine" },
    { id: "male", label: "Voix masculine" },
    { id: "robot", label: "Voix robot" },
    { id: "awena", label: "Awena · voix officielle" },
  ], []);

  const [golfHelpOpen, setGolfHelpOpen] = React.useState(false);
  const [configView, setConfigView] = React.useState<ClassicConfigView>("guided");
  const [configStep, setConfigStep] = React.useState(0);
  const guided = configView === "guided";
  const classicSteps = ["Awena", "Joueurs ou équipes", "Format", "Sélection", "Parcours", "Scoring", "Départ", "Saisie et grille", "Audio", "Récapitulatif"];

  const [teamsEnabled, setTeamsEnabled] = React.useState(false);
  const [playerFormat, setPlayerFormat] = React.useState<"duel" | "multi">("duel");
  const [teamSize, setTeamSize] = React.useState<2 | 3 | 4>(2);
  const [teamCount, setTeamCount] = React.useState<2 | 3 | 4>(2);
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamKey>>({});

  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");
  const [holes, setHoles] = React.useState<9 | 18>(9);
  const [holeOrderMode, setHoleOrderMode] = React.useState<HoleOrderMode>("chronological");
  const [scoringMode, setScoringMode] = React.useState<GolfScoringMode>("strokes");
  const [missStrokes, setMissStrokes] = React.useState<4 | 5 | 6 | 7 | 8>(5);
  const [showHoleGrid, setShowHoleGrid] = React.useState(true);

  // ✅ ordre de départ (joueurs ou équipes)
  const [startOrderMode, setStartOrderMode] = React.useState<StartOrderMode>("alternate");
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">("keypad");
  // Paramètres audio séparés, même panneau que KILLER.
  const [arcadeEnabled, setArcadeEnabled] = React.useState(true);
  const [hitEnabled, setHitEnabled] = React.useState(true);
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [voiceId, setVoiceId] = React.useState("default");

  const [userBots, setUserBots] = React.useState<BotLite[]>([]);
  React.useEffect(() => {
    const custom = readUserBotsFromLS();
    const m = new Map<string, BotLite>();
    for (const b of PRO_BOTS) m.set(b.id, b);
    for (const b of custom) m.set(b.id, b);
    setUserBots(Array.from(m.values()));
  }, []);

  // Load config LS
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CFG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.selectedIds)) return parsed.selectedIds.slice(0, 8);
      }
    } catch {}
    return humanProfiles.slice(0, 2).map((p) => String(p.id));
  });

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CFG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      setTeamsEnabled(!!parsed?.teamsEnabled);
      setPlayerFormat(parsed?.playerFormat === "multi" ? "multi" : "duel");
      setTeamSize(([2, 3, 4].includes(Number(parsed?.teamSize)) ? Number(parsed.teamSize) : 2) as 2 | 3 | 4);
      setTeamCount(normalizeTeamCount(parsed?.teamCount ?? 2));
      setTeamAssignments((parsed?.teamAssignments && typeof parsed.teamAssignments === "object") ? parsed.teamAssignments : {});

      setBotsEnabled(!!parsed?.botsEnabled);
      setBotLevel((parsed?.botLevel === "easy" || parsed?.botLevel === "hard" || parsed?.botLevel === "normal") ? parsed.botLevel : "normal");

      setHoles(Number(parsed?.holes) === 18 ? 18 : 9);
      setHoleOrderMode(parsed?.holeOrderMode === "random" ? "random" : "chronological");
      setScoringMode(parsed?.scoringMode === "points" ? "points" : "strokes");
      setMissStrokes((Number(parsed?.missStrokes) === 4 ? 4 : Number(parsed?.missStrokes) === 5 ? 5 : Number(parsed?.missStrokes) === 6 ? 6 : Number(parsed?.missStrokes) === 7 ? 7 : Number(parsed?.missStrokes) === 8 ? 8 : 5) as any);
      setShowHoleGrid(parsed?.showHoleGrid !== false);

      setStartOrderMode((["random", "alternate", "manual", "bull"].includes(parsed?.startOrderMode) ? parsed.startOrderMode : "alternate") as StartOrderMode);
      setScoreInputMethod(parsed?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
      const legacyAudioEnabled = parsed?.audioEnabled !== false;
      setArcadeEnabled(typeof parsed?.audio?.arcadeEnabled === "boolean" ? parsed.audio.arcadeEnabled : legacyAudioEnabled);
      setHitEnabled(typeof parsed?.audio?.hitEnabled === "boolean" ? parsed.audio.hitEnabled : legacyAudioEnabled);
      setVoiceEnabled(typeof parsed?.audio?.voiceEnabled === "boolean" ? parsed.audio.voiceEnabled : legacyAudioEnabled);
      setVoiceId(typeof parsed?.audio?.voiceId === "string" ? parsed.audio.voiceId : "default");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist
  React.useEffect(() => {
    try {
      localStorage.setItem(
        LS_CFG_KEY,
        JSON.stringify({
          selectedIds,

          teamsEnabled,
          playerFormat,
          teamSize,
          teamCount,
          teamAssignments,

          botsEnabled,
          botLevel,

          holes,
          holeOrderMode,
          scoringMode,
          missStrokes,

          startOrderMode,
          scoreInputMethod,
          audioEnabled: arcadeEnabled || hitEnabled || voiceEnabled,
          audio: { arcadeEnabled, hitEnabled, voiceEnabled, voiceId },

          showHoleGrid,
        })
      );
    } catch {}
  }, [
    selectedIds,
    teamsEnabled,
    playerFormat,
    teamSize,
    teamCount,
    teamAssignments,
    botsEnabled,
    botLevel,
    holes,
    holeOrderMode,
    scoringMode,
    missStrokes,
    startOrderMode,
    scoreInputMethod,
    arcadeEnabled,
    hitEnabled,
    voiceEnabled,
    voiceId,
    showHoleGrid,
  ]);

  // Si bots désactivés: retirer ids bots
  React.useEffect(() => {
    if (botsEnabled) return;
    const botIds = new Set(userBots.map((b) => b.id));
    setSelectedIds((prev) => prev.filter((id) => !botIds.has(id)));
  }, [botsEnabled, userBots]);

  // Nettoyage assignments quand roster change + auto fallback round-robin
  React.useEffect(() => {
    if (!teamsEnabled) return;

    const keys = TEAM_KEYS_ALL.slice(0, teamCount);
    setTeamAssignments((prev) => {
      const next: Record<string, TeamKey> = {};
      let rr = 0;
      for (const id of selectedIds) {
        const assigned = prev[id];
        const valid = assigned && keys.includes(assigned);
        next[id] = (valid ? assigned : keys[rr % keys.length]) as TeamKey;
        rr++;
      }
      return next;
    });
  }, [teamsEnabled, teamCount, selectedIds]);

  const requiredMaxTeamPlayers = teamCount * teamSize;

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= (teamsEnabled ? requiredMaxTeamPlayers : playerFormat === "duel" ? 2 : 8)) return prev;
      return [...prev, id];
    });
  }

  function onStart() {
    const payload: GolfConfigPayload = {
      players: selectedIds.length,
      selectedIds,
      holes,

      teamsEnabled,
      teamCount: teamsEnabled ? teamCount : undefined,
      teamAssignments: teamsEnabled ? teamAssignments : undefined,
      // Le moteur GOLF sait déjà lire quickPlayers : résoudre les bots sans changer ses règles.
      quickPlayers: selectedIds.map((id) => {
        const p = humanProfiles.find((p: any) => String(p.id) === id) || userBots.find((b: any) => String(b.id) === id);
        return p ? { id, name: p.name, avatarDataUrl: (p as any).avatarDataUrl ?? (p as any).avatarUrl ?? (p as any).avatar ?? null,
          isBot: !!userBots.find((b: any) => String(b.id) === id) } : { id, name: id };
      }),

      botsEnabled,
      botLevel,

      missStrokes,
      holeOrderMode,
      scoringMode,

      startOrderMode,
      scoreInputMethod,
      audioEnabled: arcadeEnabled || hitEnabled || voiceEnabled,
      audio: { arcadeEnabled, hitEnabled, voiceEnabled, voiceId },

      showHoleGrid,
    };

    try { recordProfileUsageForMode("golf", selectedIds); } catch {}

    const go = (props as any)?.go ?? (props as any)?.params?.go;
    if (typeof go === "function") {
      go("golf_play", { config: payload });
      return;
    }
    const setTab = (props as any)?.setTab;
    if (typeof setTab === "function") {
      setTab("golf_play", { config: payload });
    }
  }

  // canStart : min 2 joueurs, et en teams => min 2 équipes non vides
  const enabledKeys = TEAM_KEYS_ALL.slice(0, teamCount);
  const teamNonEmptyCount = React.useMemo(() => {
    if (!teamsEnabled) return 0;
    const counts: Record<string, number> = {};
    enabledKeys.forEach((k) => (counts[k] = 0));
    selectedIds.forEach((id, idx) => {
      const k = teamAssignments[id] ?? enabledKeys[idx % enabledKeys.length];
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return Object.values(counts).filter((n) => n > 0).length;
  }, [teamsEnabled, enabledKeys, selectedIds, teamAssignments]);

  const requiredTeamPlayers = teamCount * teamSize;
  const teamSizesValid = enabledKeys.every((key) => selectedIds.filter((id) => teamAssignments[id] === key).length === teamSize);
  const canStart = selectedIds.length >= 2 && (teamsEnabled ? selectedIds.length === requiredTeamPlayers && teamNonEmptyCount === teamCount && teamSizesValid : playerFormat === "multi" || selectedIds.length === 2);

  return (
    <div style={{ minHeight: "100dvh" }}>
      <PageHeader difficultyGameId="golf"
        title="GOLF"
        left={<BackDot onClick={() => (props as any)?.go?.("games") || (props as any)?.setTab?.("games")} />}
        right={
          <InfoDot
            title="GOLF"
            content={
              "Règles GOLF (darts)\n\n- Partie en 9 ou 18 trous.\n- Ordre des trous: Chronologique ou Aléatoire.\n- Chaque tour: jusqu’à 3 flèches.\n- Le score du trou dépend du dernier tir validé.\n- Total bas = vainqueur (Strokes) ou total haut = vainqueur (Points)."
            }
          />
        }
        tickerSrc={tickerGolf}
      />

      <div style={{ padding: 12, paddingTop: 10 }}>
        <MssClassicConfigFlow title="Golf" steps={classicSteps} step={configStep} view={configView}
          accent={primary} summary={`${selectedIds.length} joueurs · ${teamsEnabled ? `${teamCount} équipes` : "individuel"}`}
          onStep={setConfigStep} onView={setConfigView}
          onHelp={() => setGolfHelpOpen(v => !v)} />
        {guided && configStep === 0 && <MssClassicOverview title="GOLF · AWENA VOUS EXPLIQUE" onHelp={() => setGolfHelpOpen(v => !v)}
          description="Choisis tes joueurs ou équipes, configure les trous et la pénalité, puis vérifie le récapitulatif avant de lancer."
          accent={primary} />}
        {golfHelpOpen && <div style={{ border: `1px solid ${primary}55`, borderRadius: 14,
          padding: 12, marginBottom: 12, fontSize: 12, color: "#bac4d9" }}>
          Un trou est joué en trois fléchettes maximum. Le score dépend du dernier tir validé :
          en Strokes, le plus petit total gagne ; en Points, le plus grand total gagne.
        </div>}
        {/* HERO banner : conserver pour la vue complète uniquement */}
        <div hidden={guided}
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.22)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.38)",
            marginBottom: 14,
            position: "relative",
            height: 86,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${tickerGolf})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "saturate(1.12) contrast(1.08)",
              opacity: 0.85,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(0,0,0,.86) 0%, rgba(0,0,0,.42) 42%, rgba(0,0,0,.84) 100%), radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--dc-accent, currentColor) 20%, transparent), transparent 60%)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1, padding: "12px 14px" }}>
            <div
              style={{
                fontWeight: 1000,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.92)",
                textShadow: "0 10px 26px rgba(0,0,0,0.55)",
                fontSize: 16,
              }}
            >
              Configuration
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.26)",
                  color: primary,
                  fontWeight: 900,
                  fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                {holes} trous
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.26)",
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: 900,
                  fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                {holeOrderMode === "random" ? "Trous aléatoires" : "Trous chronologiques"}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: teamsEnabled ? `${primary}1f` : "rgba(0,0,0,0.26)",
                  color: teamsEnabled ? primary : "rgba(255,255,255,0.75)",
                  fontWeight: 900,
                  fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                {teamsEnabled ? `TEAMS (${teamCount})` : "SOLO"}
              </span>
            </div>
          </div>
        </div>

        {/* Même conteneur + mêmes contrôles, extraits de KILLER : aucune variante locale. */}
        <div hidden={guided && configStep !== 1}>
          <section data-mss-killer-protocol="participants" style={{ background: cardBg, borderRadius: 18, padding: "14px 12px", marginBottom: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary, marginBottom: 10 }}>Participants</div>
            <MssKillerParticipantMode mode={teamsEnabled ? "teams" : "players"} accent={primary} onChange={(mode) => {
              setTeamsEnabled(mode === "teams");
              if (mode === "players" && playerFormat === "duel") setSelectedIds(prev => prev.slice(0, 2));
            }} />
          </section>
        </div>

        <div hidden={guided && configStep !== 2}>
          <section data-mss-killer-protocol="format" style={{ background: cardBg, borderRadius: 18, padding: "14px 12px", marginBottom: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ color: primary, fontWeight: 900, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              {teamsEnabled ? "FORMAT DES ÉQUIPES" : "FORMAT JOUEURS"}
            </div>
            <MssKillerFormat mode={teamsEnabled ? "teams" : "players"} playerFormat={playerFormat}
              onPlayerFormat={(mode) => { setPlayerFormat(mode); if (mode === "duel") setSelectedIds(prev => prev.slice(0, 2)); }}
              teamCount={teamCount} onTeamCount={(n) => { setTeamCount(normalizeTeamCount(n)); if (n * teamSize > 8) setTeamSize(2); }}
              teamSize={teamSize} onTeamSize={setTeamSize} accent={primary} maxPlayers={8} />
          </section>
        </div>

        {/* Standard KILLER : étape 3 = sélection des profils et bots. */}
        <div hidden={guided && configStep !== 3}>
        <Section title={teamsEnabled ? "CHOIX ÉQUIPES" : "CHOIX JOUEURS"}>
          <div
            style={{
              borderRadius: 18,
              padding: 12,
              background: cardBg,
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 14px 34px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950, marginBottom: 8 }}>
              {teamsEnabled
                ? `Sélection : ${selectedIds.length}/${requiredMaxTeamPlayers} participants · ${teamCount} équipes de ${teamSize}`
                : playerFormat === "duel"
                  ? "Sélectionne 2 participants"
                  : `Sélection : ${selectedIds.length}/8 participants · MULTI`}
            </div>

            {teamsEnabled ? (
              <MssGolfKillerTeamSelector
                humanProfiles={humanProfiles}
                bots={userBots}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                teamAssignments={teamAssignments}
                setTeamAssignments={setTeamAssignments}
                teamCount={teamCount}
                teamSize={teamSize}
                accent={primary}
                onBotsUsed={() => setBotsEnabled(true)}
                onAddBots={(newBots) => setUserBots(prev => {
                  const byId = new Map(prev.map(b => [String(b.id), b]));
                  newBots.forEach((bot: any) => byId.set(String(bot.id), bot));
                  return Array.from(byId.values());
                })}
                onUpdateProfiles={(props as any)?.update}
                onRefreshBots={() => setUserBots(prev => {
                  const map = new Map(prev.map(b => [String(b.id), b]));
                  readUserBotsFromLS().forEach(b => map.set(String(b.id), b));
                  return Array.from(map.values());
                })}
              />
            ) : (
              <MssKillerPlayersShared usageMode="golf" profiles={humanProfiles} bots={userBots}
                selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} maxSelection={playerFormat === "duel" ? 2 : 8}
                onCreateProfile={(p:any)=>{setGolfNewProfiles(prev=>[...prev,p]);}}
                onBotSelected={()=>setBotsEnabled(true)}
                onCreateBot={(bot:any)=>{setBotsEnabled(true);setUserBots(prev=>[...prev,{...bot,isBot:true}]);}} />
            )}
          </div>
        </Section>
        </div>

        <div hidden={guided && ![4, 5, 6, 7, 8].includes(configStep)}>
        <Section title={guided ? classicSteps[configStep].toUpperCase() : "RÈGLES"}>
          <div
            style={{
              borderRadius: 18,
              padding: 12,
              background: `linear-gradient(160deg, color-mix(in srgb, ${primary} 9%, #0c101d), #090c18 75%)`,
              border: `1px solid ${primary}45`,
              boxShadow: "0 14px 34px rgba(0,0,0,0.32)",
            }}
          >
            <div hidden={guided && configStep !== 4}>
            <GolfThemeChoice label="NOMBRE DE TROUS" value={holes} options={[{ value: 9, label: "9" }, { value: 18, label: "18" }]}
              accent={primary} onChange={(v) => setHoles(v === 18 ? 18 : 9)} />
            <GolfThemeChoice label="ORDRE DES TROUS" value={holeOrderMode} options={[{ value: "chronological", label: "CHRONOLOGIQUE" }, { value: "random", label: "ALÉATOIRE" }]}
              accent={primary} onChange={setHoleOrderMode} />

            </div>
            <div hidden={guided && configStep !== 5}>
            <GolfThemeChoice label="MODE DE SCORING" value={scoringMode} options={[{ value: "strokes", label: "STROKES" }, { value: "points", label: "POINTS" }]}
              accent={primary} onChange={setScoringMode} hint={scoringMode === "strokes" ? "Le total le plus bas gagne" : "Le total le plus haut gagne"} />
            <GolfThemeChoice label="PÉNALITÉ MISS" value={missStrokes} options={[4, 5, 6, 7, 8].map(v => ({value: v, label: String(v)}))}
              accent={primary} onChange={(v) => setMissStrokes(v as any)} compact />

            </div>
            <div hidden={guided && configStep !== 6}>
              <MssQuickStartOrder value={startOrderMode} onChange={setStartOrderMode} />
            </div>
            <div hidden={guided && configStep !== 7}>
              <MssKillerBooleanToggle label="Grille des trous" checked={showHoleGrid} onChange={setShowHoleGrid} accent={primary} />
              <MssGolfInputMethodSelector value={scoreInputMethod} onChange={setScoreInputMethod} accent={primary} />
            </div>
            <div hidden={guided && configStep !== 8}>
              <MssGuidedAudioPanel accent={primary}
                arcade={arcadeEnabled} hits={hitEnabled} voice={voiceEnabled}
                onArcadeChange={setArcadeEnabled} onHitsChange={setHitEnabled} onVoiceChange={setVoiceEnabled}
                voiceId={voiceId} voices={golfVoiceChoices} onVoiceIdChange={setVoiceId} />
            </div>
          </div>
        </Section>
        </div>

        {guided && configStep === 9 && <MssClassicRecap accent={primary} ready={canStart} entries={[
          ["Participants", `${selectedIds.length} joueurs / bots`],
          ["Équipes", teamsEnabled ? `${teamCount} équipes · ${teamNonEmptyCount} composées` : "Partie individuelle"],
          ["Parcours", `${holes} trous · ${holeOrderMode === "random" ? "Aléatoire" : "Chronologique"}`],
          ["Scoring", scoringMode === "strokes" ? "Strokes · total bas gagnant" : "Points · total haut gagnant"],
          ["Pénalité MISS", `${missStrokes} coups`],
          ["Départ", ({random:"Aléatoire",alternate:"Alterné",manual:"Manuel",bull:"Bull"} as const)[startOrderMode]],
          ["Saisie", scoreInputMethod === "dartboard" ? "Cible" : "Keypad"],
          ["Audio", `${arcadeEnabled ? "Arcade" : "Sans arcade"} · ${hitEnabled ? "Bruitages" : "Sans bruitages"} · ${voiceEnabled ? golfVoiceChoices.find(v => v.id === voiceId)?.label || "Voix" : "Voix OFF"}`],
        ]} />}

        {/* AR : une seule astuce en bas de l’étape active, sans rotation. */}
        {(!guided || configStep > 0) && <MssGolfAwenaTip mode="arcade" step={guided ? (["intro", "participants", "participants", "participants", "rules", "rules", "rules", "rules", "rules", "recap"] as const)[configStep] || "intro" : "recap"} tipOverride={guided ? ({ 4: "Neuf trous pour une manche courte, dix-huit pour un parcours complet. L'ordre aléatoire varie les cibles.", 5: "En STROKES, le total le plus bas gagne. Chaque MISS ajoute la pénalité choisie.", 6: "En mode BULL, départage les joueurs par un vrai lancer au centre de la cible.", 7: "La cible et le keypad saisissent les mêmes impacts ; la grille des trous peut être masquée.", 8: "Ajuste séparément les sons Arcade, les impacts et les annonces vocales avant de jouer.", 9: "Vérifie les équipes, le parcours et toutes les options avant de lancer." } as Record<number, string>)[configStep] : undefined} />}

        {/* CTA collée au-dessus de la barre de nav (même design que X01/Killer) */}
        <div style={{ height: 96 }} />
        <div hidden={guided && configStep !== 9} style={{ position: "fixed", left: 0, right: 0, bottom: 88, padding: "6px 12px 8px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <button
              type="button"
              onClick={onStart}
              disabled={!canStart}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 999,
                border: "none",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: 1,
                textTransform: "uppercase",
                background: canStart ? primary : "rgba(120,120,120,0.5)",
                color: canStart ? "#151515" : "#2b2b52",
                boxShadow: canStart ? "0 0 18px rgba(255, 207, 120, 0.65)" : "none",
                opacity: canStart ? 1 : 0.6,
                cursor: canStart ? "pointer" : "default",
              }}
            >
              {t("x01v3.start", "Lancer la partie")}
            </button>
            {!canStart && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, fontWeight: 900, textAlign: "center" }}>
                {teamsEnabled
                  ? "Sélectionne au moins 2 joueurs, et au moins 2 équipes non vides."
                  : "Sélectionne au moins 2 joueurs (humains et/ou bots)."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
