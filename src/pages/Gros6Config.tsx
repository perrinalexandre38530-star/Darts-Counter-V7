// @ts-nocheck
// =============================================================
// GROS 6 / BIG 6 — CONFIG V3
// Aligné sur le standard X01ConfigV3 :
// - ticker + BackDot + InfoDot
// - configuration GUIDÉE / COMPLÈTE
// - joueurs individuels / équipes
// - PlayerPagedSelector + BotPagedSelector
// - équipes enregistrées, équipes IA, manuel, brassage auto
// - variantes, vies, zones spéciales, bonus 3e fléchette
// =============================================================

import React from "react";
import { MssKillerParticipantMode, MssKillerFormat } from "../components/config/MssKillerParticipantProtocol";
import MssSelectorIconButton from "../components/MssSelectorIconButton";
import MssGros6AwenaTip from "../components/config/MssGros6AwenaTip";
import MssLivesHeartChoice from "../components/config/MssLivesHeartChoice";
import MssKillerBooleanToggle from "../components/config/MssKillerBooleanToggle";
import MssKillerCreateMenu from "../components/config/MssKillerCreateMenu";
import MssKillerCreateParticipantDialog from "../components/config/MssKillerCreateParticipantDialog";
import { loadStoredBots, saveStoredBots } from "../lib/bots";
import MssGros6InputSelector from "../components/config/MssGros6InputSelector";
import { MssConfigFact } from "../components/config/MssPremiumConfig";
import MssGolfKillerTeamSelector from "./MssGolfKillerTeamSelector";
import teamGoldLogo from "../ui_assets/teams/team_gold.png";
import teamPinkLogo from "../ui_assets/teams/team_pink.png";
import MssGuidedAudioPanel from "../components/config/MssGuidedAudioPanel";
import { MssClassicConfigFlow, MssClassicOverview } from "../components/config/MssClassicConfigFlow";

import DartsRelatedModesPanel from "../components/DartsRelatedModesPanel";
import { dartsFamilyGameNavigation } from "../games/dartsGameFamilies";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import BackDot from "../components/BackDot";
import GameDifficultyStars from "../components/GameDifficultyStars";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import BotPagedSelector from "../components/BotPagedSelector";
import SelectionStickyBanner from "../components/SelectionStickyBanner";
import DartsSpecialZonesRulesVisual from "../components/DartsSpecialZonesRulesVisual";
import { applyResolvedBotCountries } from "../lib/botCountries";
import { loadBotPlayers } from "../lib/bots";
import { loadTeamsBySport } from "../lib/petanqueTeamsStore";
import { BOT_PRO_TEAMS } from "../lib/botTeams";
import { generateShuffledTeams, rememberGeneratedTeams } from "../lib/teamAutoShuffle";
import { readProfileUsageCounts, recordProfileUsageForMode } from "../lib/profileUsage";
import { makeGros6Segment, randomGros6StartTarget } from "../lib/gros6Engine";
import tickerGros6 from "../assets/tickers/ticker_gros_6.webp";
import tickerBig6 from "../assets/tickers/ticker_gros_6_en.webp";
import gros6RulesBoard from "../assets/gros6/gros6_rules_board.webp";
import cricketDartShape from "../ui_assets/cricket-dart.svg";
import smallSingleZoneVisual from "../assets/rules/darts-single-zones/zone_petit_simple.webp";
import bigSingleZoneVisual from "../assets/rules/darts-single-zones/zone_gros_simple.webp";
import smallSingleZoneVisualEn from "../assets/rules/darts-single-zones/zone_petit_simple_en.webp";
import bigSingleZoneVisualEn from "../assets/rules/darts-single-zones/zone_gros_simple_en.webp";

import botTeamEliteLogo from "../assets/ui/competition_bot_team_elite.webp";
import botTeamProLogo from "../assets/ui/competition_bot_team_pro.webp";
import botTeamChallengerLogo from "../assets/ui/competition_bot_team_challenger.webp";
import botTeamMixLogo from "../assets/ui/competition_bot_team_mix.webp";
import botTeamRisingLogo from "../assets/ui/competition_bot_team_rising.webp";

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

type ParticipantMode = "players" | "teams";
type ConfigViewMode = "guided" | "complete";
type TeamsSourceMode = "saved" | "manual" | "auto";
type TeamLifeMode = "individual" | "shared";
type SelectionPolicy = "open" | "pro";
type StartingTargetMode = "s6" | "random";

const TEAM_SLOTS = [
  { id: "gold", name: "GOLD", color: "#ffd75a" },
  { id: "pink", name: "PINK", color: "#ff59d6" },
  { id: "blue", name: "BLUE", color: "#4ebcff" },
  { id: "green", name: "GREEN", color: "#60f28b" },
];

const BOT_TEAM_LOGO_BY_KEY = {
  elite: botTeamEliteLogo,
  pro: botTeamProLogo,
  challenger: botTeamChallengerLogo,
  mix: botTeamMixLogo,
  rising: botTeamRisingLogo,
};

const PRO_BOTS = applyResolvedBotCountries([
  { id: "bot_pro_mvg", name: "Green Machine", botLevel: "5/5", avatarDataUrl: avatarGreenMachine },
  { id: "bot_pro_littler", name: "Wonder Kid", botLevel: "5/5", avatarDataUrl: avatarWonderKid },
  { id: "bot_pro_humphries", name: "Cool Hand", botLevel: "5/5", avatarDataUrl: avatarCoolHand },
  { id: "bot_pro_taylor", name: "The Power", botLevel: "5/5", avatarDataUrl: avatarThePower },
  { id: "bot_pro_crafty", name: "Crafty", botLevel: "5/5", avatarDataUrl: avatarCraftyCockney },
  { id: "bot_pro_jackpot", name: "Jackpot", botLevel: "4.5/5", avatarDataUrl: avatarJackpot },
  { id: "bot_pro_barney", name: "Barney", botLevel: "4.5/5", avatarDataUrl: avatarBarney },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "4/5", avatarDataUrl: avatarIceMan },
  { id: "bot_pro_wright", name: "Snake King", botLevel: "4/5", avatarDataUrl: avatarSnakeKing },
  { id: "bot_pro_anderson", name: "Flying Scotsman", botLevel: "4/5", avatarDataUrl: avatarFlyingScotsman },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "4/5", avatarDataUrl: avatarBullyBoy },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "4/5", avatarDataUrl: avatarTheFerret },
  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "3.5/5", avatarDataUrl: avatarTheAsp },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "3.5/5", avatarDataUrl: avatarHollywood },
  { id: "bot_pro_darth_maple", name: "Darth Maple", botLevel: "3.5/5", avatarDataUrl: avatarDarthMaple },
  { id: "bot_pro_menace", name: "The Menace", botLevel: "3.5/5", avatarDataUrl: avatarTheMenace },
  { id: "bot_pro_the_giant", name: "The Giant", botLevel: "3/5", avatarDataUrl: avatarTheGiant },
  { id: "bot_pro_voltage", name: "Voltage", botLevel: "3/5", avatarDataUrl: avatarVoltage },
  { id: "bot_pro_one_dart", name: "One Dart", botLevel: "3/5", avatarDataUrl: avatarOneDart },
  { id: "bot_pro_the_hammer", name: "The Hammer", botLevel: "3/5", avatarDataUrl: avatarTheHammer },
]);

const PRO_BOT_BY_NAME = new Map(PRO_BOTS.map((bot) => [String(bot.name).toLowerCase(), bot]));

const PRESETS = [
  {
    id: "mss",
    label: "Gros 6 MSS",
    detail: "5 vies • strict • Bull • zones spéciales • bonus 3e fléchette",
    values: { startingLives: 5, targetRule: "strict", allowBull: true, allowSpecialZones: true, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
  {
    id: "classic",
    label: "Classique",
    detail: "5 vies • S/D/T distincts • départ G6",
    values: { startingLives: 5, targetRule: "strict", allowBull: true, allowSpecialZones: false, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
  {
    id: "easy",
    label: "Facile",
    detail: "Même valeur acceptée en simple/double/triple",
    values: { startingLives: 6, targetRule: "value", allowBull: true, allowSpecialZones: false, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
  {
    id: "pro",
    label: "PRO",
    detail: "Cibles imposées limitées aux doubles/triples et Bulls",
    values: { startingLives: 6, targetRule: "strict", allowBull: true, allowSpecialZones: false, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "pro", startingTargetMode: "s6" },
  },
  {
    id: "sudden",
    label: "Sudden Death",
    detail: "1 seule vie • pression maximale",
    values: { startingLives: 1, targetRule: "strict", allowBull: true, allowSpecialZones: true, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
  {
    id: "endurance",
    label: "Endurance",
    detail: "10 vies • partie longue",
    values: { startingLives: 10, targetRule: "strict", allowBull: true, allowSpecialZones: true, thirdDartBonusSelection: true, thirdDartBonusCount: 3, selectionPolicy: "open", startingTargetMode: "s6" },
  },
];

const START_ORDER_OPTIONS = [
  { id: "random", icon: "random-order", label: "Aléatoire", detail: "Les participants sont mélangés automatiquement au lancement de la partie." },
  { id: "alternate", icon: "alternate-order", label: "Alterné", detail: "Le premier départ respecte l'ordre actuel de sélection des participants." },
  { id: "manual", icon: "manual-pick", label: "Manuel", detail: "Tu choisis l'ordre exact des participants avant le début de la partie." },
  { id: "bull", icon: "bull-order", label: "Bull", detail: "Après le lancer physique à la Bull, classe les participants selon le résultat obtenu." },
] as const;

function avatarOf(value: any): string | null {
  return value?.avatarDataUrl ?? value?.avatarUrl ?? value?.avatar ?? value?.photoDataUrl ?? null;
}

function sanitizePlayer(player: any, isBot = false) {
  return {
    ...player,
    id: String(player?.id || player?.profileId || `gros6-${Math.random().toString(36).slice(2, 10)}`),
    name: String(player?.name || player?.displayName || "Joueur"),
    avatarDataUrl: avatarOf(player),
    isBot: isBot || !!player?.isBot,
    botLevel: player?.botLevel ?? player?.level ?? null,
  };
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function PillButton({ label, active, onClick, primary, primarySoft, disabled = false, compact = false }: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: `1px solid ${active ? primary : "rgba(255,255,255,.10)"}`,
        background: active ? primarySoft : "rgba(255,255,255,.035)",
        color: disabled ? "#747991" : active ? "#fff" : "#d5d8e8",
        padding: compact ? "6px 10px" : "8px 12px",
        fontSize: compact ? 11 : 12,
        fontWeight: active ? 950 : 800,
        cursor: disabled ? "default" : "pointer",
        boxShadow: active ? `0 0 18px ${primary}44` : "none",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Section({ title, subtitle, primary, children }: any) {
  return (
    <section style={{ background: "rgba(9,12,24,.95)", borderRadius: 20, padding: 16, marginBottom: 14, border: `1px solid ${primary}33`, boxShadow: "0 16px 40px rgba(0,0,0,.42)" }}>
      <div style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, fontWeight: 1000, color: primary, marginBottom: subtitle ? 5 : 11 }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 12, color: "#a7afc7", lineHeight: 1.45, marginBottom: 12 }}>{subtitle}</div> : null}
      {children}
    </section>
  );
}

function TeamCard({ team, active, primary, onClick, members, memberSelection, onToggleMember }: any) {
  const logo = team?.logoDataUrl || team?.logoUrl || team?.avatarUrl || null;
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${active ? primary : "rgba(255,255,255,.09)"}`,
        background: active ? `${primary}16` : "rgba(255,255,255,.035)",
        boxShadow: active ? `0 0 20px ${primary}35` : "none",
        padding: 12,
        display: "grid",
        gap: 9,
      }}
    >
      <button type="button" onClick={onClick} style={{ all: "unset", cursor: "pointer", display: "grid", gridTemplateColumns: "54px 1fr", gap: 10, alignItems: "center" }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, overflow: "hidden", border: `1px solid ${active ? primary : "rgba(255,255,255,.10)"}`, background: "rgba(0,0,0,.28)", display: "grid", placeItems: "center" }}>
          {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>🎯</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 950, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team?.name || "Équipe"}</div>
          <div style={{ color: "#9298bb", fontSize: 11, marginTop: 3 }}>{members?.length || 0} joueur{members?.length > 1 ? "s" : ""}</div>
        </div>
      </button>

      {active && Array.isArray(members) && members.length > 0 ? (
        <div style={{ display: "grid", gap: 6, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 10, color: "#8990ae", textTransform: "uppercase", letterSpacing: .8, fontWeight: 900 }}>Joueurs retenus</div>
          {members.map((member: any) => {
            const checked = memberSelection?.includes(String(member.id));
            return (
              <button key={member.id} type="button" onClick={() => onToggleMember?.(String(member.id))} style={{ border: 0, background: "transparent", color: "#fff", padding: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 17, height: 17, borderRadius: 5, border: `1px solid ${checked ? primary : "rgba(255,255,255,.20)"}`, background: checked ? `${primary}44` : "rgba(255,255,255,.04)", display: "grid", placeItems: "center", fontSize: 11 }}>{checked ? "✓" : ""}</span>
                <ProfileAvatar name={member.name} avatarDataUrl={member.avatarDataUrl} size={28} />
                <span style={{ fontSize: 11, fontWeight: 800 }}>{member.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function Gros6Config({ store, go }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const isFrenchRulesVisual = String(lang || "fr").toLowerCase().startsWith("fr");
  const primary = theme.primary || "#ff9d25";
  const primarySoft = `${primary}20`;

  const [localNewProfiles,setLocalNewProfiles] = React.useState<any[]>([]);
  const [extraBots,setExtraBots] = React.useState<any[]>([]);
  const [botsRevision,setBotsRevision] = React.useState(0);
  const humanProfiles = React.useMemo(() => [...(Array.isArray(store?.profiles) ? store.profiles : []),...localNewProfiles].filter((p:any)=>!p.isBot).map((p: any) => sanitizePlayer(p, false)), [store?.profiles,localNewProfiles]);
  const userBots = React.useMemo(() => {
    try { return loadBotPlayers().map((b: any) => sanitizePlayer({ ...b, isUserBot: true, source: "home" }, true)); } catch { return []; }
  }, [botsRevision]);
  const botProfiles = React.useMemo(() => {
    const merged = [...PRO_BOTS.map((b: any) => sanitizePlayer({ ...b, isProBot: true, source: "pro" }, true)), ...userBots, ...extraBots.map((bot:any)=>sanitizePlayer(bot,true))];
    const seen = new Set<string>();
    return merged.filter((bot: any) => {
      const id = String(bot.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [userBots,extraBots]);

  const allSelectable = React.useMemo(() => [...humanProfiles, ...botProfiles], [humanProfiles, botProfiles]);
  const byId = React.useMemo(() => new Map(allSelectable.map((p: any) => [String(p.id), p])), [allSelectable]);

  const storedTeams = React.useMemo(() => {
    try { return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0); } catch { return []; }
  }, []);
  const botTeams = React.useMemo(() => BOT_PRO_TEAMS.map((team: any) => ({
    id: `gros6_botteam_${team.key}`,
    key: team.key,
    name: team.name,
    isBotTeam: true,
    botLevel: `${team.botLevel}/5`,
    logoDataUrl: BOT_TEAM_LOGO_BY_KEY[team.key] || null,
    members: (team.members || []).map((member: any) => {
      const pro = PRO_BOT_BY_NAME.get(String(member.name).toLowerCase());
      return sanitizePlayer({ ...(pro || {}), ...member, id: pro?.id || member.id, isBot: true, botLevel: `${member.botLevel}/5`, avatarDataUrl: pro?.avatarDataUrl || null }, true);
    }),
  })), []);

  const [configViewMode, setConfigViewMode] = React.useState<ConfigViewMode>(() => {
    try { return localStorage.getItem("dc_gros6_config_view_mode") === "complete" ? "complete" : "guided"; } catch { return "guided"; }
  });
  const [guidedStep, setGuidedStep] = React.useState(0);
  const [participantMode, setParticipantMode] = React.useState<ParticipantMode>("players");
  const [playerFormat, setPlayerFormat] = React.useState<"duel" | "multi">("duel");
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<TeamsSourceMode>("manual");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedSavedTeamIds, setSelectedSavedTeamIds] = React.useState<string[]>([]);
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>([]);
  const [teamMemberSelections, setTeamMemberSelections] = React.useState<Record<string, string[]>>({});
  const [manualAssignments, setManualAssignments] = React.useState<Record<string, string | null>>({});
  const [teamMetadata,setTeamMetadata] = React.useState<Record<string,{name:string;logo:string|null}>>({});
  const [autoTeamCount, setAutoTeamCount] = React.useState(2);
  const [autoTeamSize, setAutoTeamSize] = React.useState(2);
  const [autoShuffleMode, setAutoShuffleMode] = React.useState<"balanced" | "random">("balanced");
  const [autoTeams, setAutoTeams] = React.useState<any[]>([]);

  const [presetId, setPresetId] = React.useState("mss");
  const [startingLives, setStartingLives] = React.useState(6);
  const [targetRule, setTargetRule] = React.useState<"strict" | "value">("strict");
  const [allowBull, setAllowBull] = React.useState(true);
  const [allowSpecialZones, setAllowSpecialZones] = React.useState(true);
  const [allowOuterRing, setAllowOuterRing] = React.useState(true);
  const [selectionPolicy, setSelectionPolicy] = React.useState<SelectionPolicy>("open");
  const [startingTargetMode, setStartingTargetMode] = React.useState<StartingTargetMode>("s6");
  const [thirdDartBonusSelection, setThirdDartBonusSelection] = React.useState(true);
  const [thirdDartBonusCount, setThirdDartBonusCount] = React.useState(3);
  const [randomStartOrder, setRandomStartOrder] = React.useState(false);
  const [startOrderMode, setStartOrderMode] = React.useState<"random" | "alternate" | "manual" | "bull">("alternate");
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "voice">("keypad");
  const [teamLifeMode, setTeamLifeMode] = React.useState<TeamLifeMode>("individual");
  const [arcadeEnabled,setArcadeEnabled] = React.useState(true);
  const [hitEnabled,setHitEnabled] = React.useState(true);
  const [voiceEnabled,setVoiceEnabled] = React.useState(true);
  const [voiceId,setVoiceId] = React.useState("awena");
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [gros6HelpOpen, setGros6HelpOpen] = React.useState(false);
  const [variantInfoId, setVariantInfoId] = React.useState<string | null>(null);
  const [specialZonesDetail, setSpecialZonesDetail] = React.useState<"closed" | "outer" | null>(null);
  const [botsPickerOpen, setBotsPickerOpen] = React.useState(false);
  const [createMenuOpen, setCreateMenuOpen] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [createKind, setCreateKind] = React.useState<"profile" | "bot">("profile");
  const [createName, setCreateName] = React.useState("");
  const [createCountry, setCreateCountry] = React.useState("");
  const [createAvatar, setCreateAvatar] = React.useState<string | null>(null);
  const [createLevel, setCreateLevel] = React.useState<"easy" | "medium" | "strong" | "pro" | "legend">("medium");
  const [createError, setCreateError] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    try { localStorage.setItem("dc_gros6_config_view_mode", configViewMode); } catch {}
  }, [configViewMode]);

  const restoredSelectionRef = React.useRef(false);
  React.useEffect(() => {
    if (restoredSelectionRef.current || !allSelectable.length) return;
    restoredSelectionRef.current = true;
    let remembered: string[] = [];
    try {
      const raw = localStorage.getItem("dc_gros6_last_participants_v1");
      const parsed = raw ? JSON.parse(raw) : null;
      const ids = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.ids) ? parsed.ids : [];
      remembered = ids.map(String).filter((id: string) => byId.has(id));
    } catch {}

    if (remembered.length >= 2) {
      setSelectedIds(remembered);
      return;
    }

    try {
      const counts = readProfileUsageCounts("gros_6");
      const mostUsed = allSelectable
        .map((profile: any) => ({ id: String(profile.id), uses: Number(counts?.[String(profile.id)] || 0) }))
        .filter((row: any) => row.uses > 0)
        .sort((a: any, b: any) => b.uses - a.uses)
        .slice(0, 2)
        .map((row: any) => row.id);
      if (mostUsed.length >= 2) setSelectedIds(mostUsed);
    } catch {}
  }, [allSelectable, byId]);

  const selectedPlayers = React.useMemo(() => selectedIds.map((id) => byId.get(String(id))).filter(Boolean), [selectedIds, byId]);

  const togglePlayer = React.useCallback((id: string) => {
    setError("");
    setSelectedIds((prev) => prev.includes(String(id)) ? prev.filter((x) => x !== String(id)) : [...prev, String(id)]);
  }, []);

  const resolveStoredTeamMembers = React.useCallback((team: any) => {
    const ids = Array.isArray(team?.playerIds) ? team.playerIds.map(String) : [];
    return ids.map((id: string) => byId.get(id)).filter(Boolean);
  }, [byId]);

  const toggleTeam = React.useCallback((team: any, kind: "saved" | "bot") => {
    const id = String(team.id);
    const setFn = kind === "saved" ? setSelectedSavedTeamIds : setSelectedBotTeamIds;
    setFn((prev) => {
      const exists = prev.includes(id);
      if (exists) return prev.filter((x) => x !== id);
      const members = kind === "saved" ? resolveStoredTeamMembers(team) : (team.members || []);
      setTeamMemberSelections((bag) => ({ ...bag, [id]: members.map((m: any) => String(m.id)) }));
      return [...prev, id];
    });
  }, [resolveStoredTeamMembers]);

  const toggleTeamMember = React.useCallback((teamId: string, playerId: string) => {
    setTeamMemberSelections((prev) => {
      const current = Array.isArray(prev[teamId]) ? prev[teamId] : [];
      return { ...prev, [teamId]: current.includes(playerId) ? current.filter((x) => x !== playerId) : [...current, playerId] };
    });
  }, []);

  const applyPreset = React.useCallback((preset: any) => {
    setPresetId(preset.id);
    const v = preset.values;
    setStartingLives(v.startingLives);
    setTargetRule(v.targetRule);
    setAllowBull(v.allowBull);
    setAllowSpecialZones(v.allowSpecialZones);
    setAllowOuterRing(v.allowOuterRing !== false);
    setThirdDartBonusSelection(v.thirdDartBonusSelection);
    setThirdDartBonusCount(v.thirdDartBonusCount);
    setSelectionPolicy(v.selectionPolicy);
    setStartingTargetMode(v.startingTargetMode);
  }, []);

  const generateAuto = React.useCallback(() => {
    setError("");
    const required = autoTeamCount * autoTeamSize;
    if (selectedPlayers.length !== required) {
      setError(`Brassage auto : sélectionne exactement ${required} joueurs (${autoTeamCount} équipes × ${autoTeamSize}).`);
      return;
    }
    const generated = generateShuffledTeams({ players: selectedPlayers, teamCount: autoTeamCount, teamSize: autoTeamSize, mode: autoShuffleMode, sport: "darts", accent: primary });
    rememberGeneratedTeams(generated);
    setAutoTeams(generated);
  }, [autoTeamCount, autoTeamSize, selectedPlayers, autoShuffleMode, primary]);

  React.useEffect(() => {
    if (teamsSourceMode !== "auto") return;
    setAutoTeams([]);
  }, [selectedIds, autoTeamCount, autoTeamSize, autoShuffleMode, teamsSourceMode]);

  const guidedSteps = ["Awena vous explique", "Joueurs ou équipes", "Format", "Sélection", "Variantes", "Vies de départ",
    ...(participantMode === "teams" ? ["Vies d'équipes"] : []), "Validation", "Bulls", "Cible imposable", "Première cible", "Zones spéciales", "Bonus", "Départ", "Mode de saisie", "Mode audio", "Récapitulatif"];
  const hasTeamLifeStep = participantMode === "teams";
  const stepAfterLives = guidedStep + (!hasTeamLifeStep && guidedStep >= 6 ? 1 : 0);
  const [teamChoiceAction, setTeamChoiceAction] = React.useState("saved");
  const guidedSelectionLabel = participantMode === "players"
    ? `${selectedPlayers.length} joueur${selectedPlayers.length > 1 ? "s" : ""}`
    : teamsSourceMode === "saved"
      ? `${selectedSavedTeamIds.length + selectedBotTeamIds.length} équipe${selectedSavedTeamIds.length + selectedBotTeamIds.length > 1 ? "s" : ""}`
      : teamsSourceMode === "manual"
        ? `${selectedPlayers.length} joueur${selectedPlayers.length > 1 ? "s" : ""}`
        : `${autoTeams.length || autoTeamCount} équipe${(autoTeams.length || autoTeamCount) > 1 ? "s" : ""}`;

  function buildSelectedTeams() {
    if (teamsSourceMode === "saved") {
      const teams: any[] = [];
      for (const id of selectedSavedTeamIds) {
        const team = storedTeams.find((t: any) => String(t.id) === id);
        if (!team) continue;
        const all = resolveStoredTeamMembers(team);
        const chosenIds = teamMemberSelections[id] || all.map((m: any) => String(m.id));
        const players = all.filter((m: any) => chosenIds.includes(String(m.id)));
        if (players.length) teams.push({ id: String(team.id), name: team.name, color: team.color || null, logoDataUrl: team.logoDataUrl || team.logoUrl || null, players });
      }
      for (const id of selectedBotTeamIds) {
        const team = botTeams.find((t: any) => String(t.id) === id);
        if (!team) continue;
        const all = team.members || [];
        const chosenIds = teamMemberSelections[id] || all.map((m: any) => String(m.id));
        const players = all.filter((m: any) => chosenIds.includes(String(m.id)));
        if (players.length) teams.push({ id: String(team.id), name: team.name, color: team.color || null, logoDataUrl: team.logoDataUrl || null, isBotTeam: true, players });
      }
      return teams;
    }

    if (teamsSourceMode === "manual") {
      return TEAM_SLOTS.map((slot) => ({
        id: `gros6_manual_${slot.id}`,
        name: teamMetadata[slot.id]?.name || `Team ${slot.name.charAt(0).toUpperCase()+slot.name.slice(1).toLowerCase()}`,
        logoDataUrl: teamMetadata[slot.id]?.logo || ({gold:teamGoldLogo,pink:teamPinkLogo} as Record<string,string>)[slot.id] || null,
        color: slot.color,
        players: selectedPlayers.filter((player: any) => manualAssignments[String(player.id)] === slot.id),
      })).filter((team) => team.players.length > 0);
    }

    return (autoTeams || []).map((team: any) => ({
      ...team,
      players: (team.playerIds || []).map((id: any) => byId.get(String(id))).filter(Boolean),
    })).filter((team: any) => team.players.length > 0);
  }

  function validateAndBuild() {
    setError("");
    if (participantMode === "players") {
      if (playerFormat === "duel" && selectedPlayers.length !== 2) return { error: "Sélectionne exactement 2 joueurs pour un DUEL." };
      if (selectedPlayers.length < 2) return { error: "Sélectionne au moins 2 joueurs." };
      return { teams: null, players: selectedPlayers.map((p: any) => sanitizePlayer(p, !!p.isBot)) };
    }

    if (teamsSourceMode === "auto" && !autoTeams.length) return { error: "Génère d'abord les équipes du brassage auto." };
    const teams = buildSelectedTeams();
    if (teams.length !== autoTeamCount) return { error: `Compose ${autoTeamCount} équipes pour ce format.` };
    if (teams.some((team:any)=>team.players.length !== autoTeamSize)) return { error: `Chaque équipe doit avoir ${autoTeamSize} membres.` };
    if (teams.some((team) => !Array.isArray(team.players) || team.players.length < 1)) return { error: "Chaque équipe doit contenir au moins 1 joueur." };

    if (teamsSourceMode === "manual") {
      const assigned = new Set(teams.flatMap((team) => team.players.map((player: any) => String(player.id))));
      if (assigned.size !== selectedPlayers.length) return { error: "Tous les joueurs sélectionnés doivent être affectés à une équipe." };
    }

    let orderedTeams = randomStartOrder ? shuffle(teams) : [...teams];
    if (randomStartOrder) orderedTeams = orderedTeams.map((team) => ({ ...team, players: shuffle(team.players) }));
    const maxMembers = Math.max(...orderedTeams.map((team) => team.players.length));
    const flattened: any[] = [];
    for (let memberIndex = 0; memberIndex < maxMembers; memberIndex += 1) {
      for (const team of orderedTeams) {
        const player = team.players[memberIndex];
        if (!player) continue;
        flattened.push({
          ...sanitizePlayer(player, !!player.isBot),
          teamId: String(team.id),
          teamName: String(team.name),
          teamLogoDataUrl: team.logoDataUrl || team.logoUrl || null,
          teamColor: team.color || null,
        });
      }
    }
    const normalizedTeams = orderedTeams.map((team) => ({
      id: String(team.id),
      name: String(team.name),
      logoDataUrl: team.logoDataUrl || team.logoUrl || null,
      color: team.color || null,
      isBotTeam: !!team.isBotTeam,
      playerIds: team.players.map((p: any) => String(p.id)),
    }));
    return { teams: normalizedTeams, players: flattened };
  }

  const launch = React.useCallback(() => {
    const built: any = validateAndBuild();
    if (built.error) {
      setError(built.error);
      return;
    }
    let players = [...built.players];
    if (participantMode === "players" && randomStartOrder) players = shuffle(players);
    const startingTarget = startingTargetMode === "random"
      ? randomGros6StartTarget({ selectionPolicy, allowBull, allowSpecialZones, allowOuterRing })
      : makeGros6Segment("S", 6);
    const config = {
      id: `gros6-${Date.now()}`,
      mode: "gros_6",
      createdAt: Date.now(),
      participantMode,
      teamsSourceMode: participantMode === "teams" ? teamsSourceMode : undefined,
      teamLifeMode: participantMode === "teams" ? teamLifeMode : undefined,
      startingLives,
      targetRule,
      allowBull,
      allowSpecialZones,
      allowOuterRing,
      selectionPolicy,
      startingTargetMode,
      startingTarget,
      randomStartOrder: startOrderMode === "random",
      startOrderMode,
      thirdDartBonusSelection,
      thirdDartBonusCount,
      scoreInputDefaultMethod: scoreInputMethod,
      presetId,
      audio: {arcadeEnabled,hitEnabled,voiceEnabled,voiceId},
      arcadeEnabled,hitEnabled,voiceEnabled,voiceId,
      players,
      teams: built.teams || undefined,
    };
    try {
      const ids = players.map((p: any) => String(p.id));
      localStorage.setItem("dc_gros6_last_participants_v1", JSON.stringify({ ids, participantMode, savedAt: Date.now() }));
      recordProfileUsageForMode("gros_6", ids);
    } catch {}
    go?.("gros_6_play", { config });
  }, [participantMode, teamsSourceMode, teamLifeMode, startingLives, targetRule, allowBull, allowSpecialZones, allowOuterRing, selectionPolicy, startingTargetMode, randomStartOrder, startOrderMode, thirdDartBonusSelection, thirdDartBonusCount, scoreInputMethod, presetId, arcadeEnabled, hitEnabled, voiceEnabled, voiceId, go, selectedIds, selectedSavedTeamIds, selectedBotTeamIds, teamMemberSelections, manualAssignments, autoTeams, teamMetadata]);

  const readCreateAvatar = (file: File) => new Promise<void>((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setCreateError("Image invalide ou supérieure à 2 Mo."); reject(new Error("Invalid avatar")); return;
    }
    const reader = new FileReader();
    reader.onload = () => { setCreateAvatar(typeof reader.result === "string" ? reader.result : null); resolve(); };
    reader.onerror = () => { setCreateError("Impossible de lire cette image."); reject(new Error("Avatar read failed")); };
    reader.readAsDataURL(file);
  });
  const submitCreatedParticipant = (event: React.FormEvent) => {
    event.preventDefault();
    if (!createName.trim()) return;
    const id = `mss-${createKind}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    if (createKind === "bot") {
      const now = new Date().toISOString();
      const record = { id, name:createName.trim(), level:createLevel, botLevel:createLevel,
        avatarDataUrl:createAvatar, country:createCountry.trim(), isBot:true, cpu:true,
        type:"bot", kind:"bot", createdAt:now, updatedAt:now };
      if (!saveStoredBots([...loadStoredBots(), record])) {
        setCreateError("Impossible de sauvegarder le bot CPU."); return;
      }
      setExtraBots(prev => [...prev, record]);
      setBotsRevision(n => n + 1);
    } else {
      setLocalNewProfiles(prev => [...prev, { id, name:createName.trim(), avatarDataUrl:createAvatar,
        avatarUpdatedAt:Date.now(), privateInfo:createCountry.trim() ? { country:createCountry.trim() } : undefined }]);
    }
    const limit = playerFormat === "duel" ? 2 : 20;
    setSelectedIds(prev => prev.length < limit ? [...prev, id] : prev);
    setCreateDialogOpen(false); setCreateName(""); setCreateCountry(""); setCreateAvatar(null); setCreateError("");
  };
  const openCreateChoice = (kind: "profile" | "bot" | "team" | "bot-team") => {
    setCreateMenuOpen(false);
    if (kind === "team" || kind === "bot-team") return; // mode équipes : création pilotée par son sélecteur dédié
    setCreateKind(kind); setCreateDialogOpen(true); setCreateError("");
  };
  const onTeamMetaChange = React.useCallback((next: Record<string,{name:string;logo:string|null}>) => {
    setTeamMetadata(prev => JSON.stringify(prev) === JSON.stringify(next) ? prev : next);
  }, []);

  const renderParticipantsSelector = () => (
    <Section title="3. SÉLECTION" subtitle={participantMode === "players" ? "Ajoute les profils locaux et les bots IA qui participeront à la partie." : "Compose les équipes en reprenant le sélecteur standard MSS de Killer / Golf."} primary={primary}>
      {participantMode === "teams" ? <div style={{position:"relative",zIndex:1}}><MssGolfKillerTeamSelector 
        humanProfiles={humanProfiles} bots={botProfiles} selectedIds={selectedIds} setSelectedIds={setSelectedIds}
        teamAssignments={manualAssignments as any} setTeamAssignments={setManualAssignments as any}
        onTeamMetaChange={onTeamMetaChange}
        teamCount={autoTeamCount} teamSize={autoTeamSize} accent={primary}
        onRefreshBots={()=>setBotsRevision(n=>n+1)}
        onAddBots={(bots:any[])=>setExtraBots(old=>[...old,...bots])}
        onUpdateProfiles={(update:any)=>setLocalNewProfiles(prev=>{
          const next=update({profiles:[...(store?.profiles||[]),...prev]});
          return (next?.profiles||[]).filter((x:any)=>!(store?.profiles||[]).some((p:any)=>String(p.id)===String(x.id)));
        })}
      /></div> : <>
        <PlayerPagedSelector usageMode="gros_6" profiles={humanProfiles} selectedIds={selectedIds}
          onToggle={(id:any) => { if (!selectedIds.includes(String(id)) && playerFormat === "duel" && selectedIds.length >= 2) return; togglePlayer(String(id)); }}
          accent={primary} pageSize={9} modalTitle="Choisir des joueurs"
          toolbarExtra={<>
            <MssSelectorIconButton icon="bots" label="Choisir les bots IA" accent={primary} active={botsPickerOpen} onClick={() => setBotsPickerOpen(true)} />
            <MssSelectorIconButton icon="plus" label="Créer un joueur ou un bot CPU" accent={primary} onClick={() => setCreateMenuOpen(true)} />
          </>}
          modalHeaderExtra={<MssSelectorIconButton icon="plus" label="Créer un joueur ou un bot CPU" accent={primary} onClick={() => setCreateMenuOpen(true)} />}
          summaryExtra={selectedPlayers.filter((p:any) => p.isBot).length ? <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap",marginTop:10}}>
            {selectedPlayers.filter((p:any) => p.isBot).map((p:any) => <button key={p.id} type="button" onClick={()=>togglePlayer(String(p.id))} title={`Retirer ${p.name}`} style={{border:`1px solid ${primary}66`,background:`${primary}16`,borderRadius:10,color:primary,padding:7,cursor:"pointer"}}>{p.name} ×</button>)}
          </div> : null} />
        <BotPagedSelector bots={botProfiles} selectedIds={selectedIds}
          onToggle={(id:any) => { if (!selectedIds.includes(String(id)) && playerFormat === "duel" && selectedIds.length >= 2) return; togglePlayer(String(id)); }}
          accent={primary} label="BOTS IA" pageSize={4} showCheckbox={false} showSelectedSummary={false}
          hideToolbar controlledOpen={botsPickerOpen} onControlledOpenChange={setBotsPickerOpen} />
      </>}
    </Section>
  );

  const PartyTypeSection = () => (
    <Section title="1. TYPE DE PARTIE" subtitle="Choisis si le Gros 6 se joue en individuel ou par équipes." primary={primary}>
      <MssKillerParticipantMode mode={participantMode} onChange={(mode) => {setParticipantMode(mode);setGuidedStep(s => Math.min(s, mode === "teams" ? 13 : 12));setError("");}} accent={primary} />
    </Section>
  );

  const FormatSection = () => (
    <Section title="2. FORMAT" subtitle={participantMode === "teams" ? "Définis le nombre d'équipes et le nombre de joueurs par équipe." : "Choisis un duel ou un mode multi-joueurs."} primary={primary}>
      <MssKillerFormat mode={participantMode} playerFormat={playerFormat} onPlayerFormat={setPlayerFormat}
        teamCount={autoTeamCount} onTeamCount={(n)=>{setAutoTeamCount(n);setAutoTeams([]);}}
        teamSize={autoTeamSize} onTeamSize={(n)=>{setAutoTeamSize(n);setAutoTeams([]);}}
        accent={primary} maxPlayers={20}/>
    </Section>
  );

  const VariantPresetsSection = () => (
    <Section title="4. VARIANTES" subtitle="Choisis un preset de règles pour démarrer rapidement. Les autres cartes se grisent dès qu'une variante est active." primary={primary}>
      <div style={{ display: "grid", gap: 10 }}>
        {PRESETS.map((preset, index) => {
          const active = presetId === preset.id;
          const muted = presetId !== "custom" && presetId !== preset.id;
          const gradients = [
            "linear-gradient(135deg, rgba(255,166,0,.35), rgba(255,72,0,.16))",
            "linear-gradient(135deg, rgba(255,205,90,.30), rgba(255,120,30,.12))",
            "linear-gradient(135deg, rgba(86,162,255,.30), rgba(64,97,255,.12))",
            "linear-gradient(135deg, rgba(210,64,255,.28), rgba(76,34,120,.12))",
            "linear-gradient(135deg, rgba(61,226,149,.25), rgba(24,120,82,.12))",
          ];
          const gradient = gradients[index % gradients.length];
          return (
            <div key={preset.id} style={{ opacity: muted ? .46 : 1, transition: 'opacity .18s ease' }}>
              <div role="button" tabIndex={0} onClick={() => applyPreset(preset)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset(preset); } }} style={{ width: "100%", borderRadius: 18, border: `1px solid ${active ? primary : "rgba(255,255,255,.10)"}`, background: active ? gradient : "rgba(255,255,255,.03)", color: "#fff", overflow: "hidden", textAlign: "left", cursor: "pointer", boxShadow: active ? `0 0 22px ${primary}22` : "none" }}>
                <div style={{ display: "flex", alignItems: "stretch", minHeight: 84 }}>
                  <div style={{ flex: 1, padding: "12px 14px", display: "grid", gap: 6, alignContent: "center" }}>
                    <div style={{ fontSize: 18, lineHeight: 1, fontWeight: 1000, letterSpacing: .4, color: active ? primary : "#fff", textTransform: "uppercase" }}>{preset.label}</div>
                    <div style={{ fontSize: 12, color: "#d1d7e9", lineHeight: 1.35 }}>{preset.detail}</div>
                  </div>
                  <div style={{ width: 78, borderLeft: '1px solid rgba(255,255,255,.08)', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.04)' }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setVariantInfoId((v) => v === preset.id ? null : preset.id); }} aria-label={`Infos ${preset.label}`} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${primary}99`, background: "rgba(10,12,24,.7)", color: primary, fontWeight: 1000, fontSize: 16, cursor: "pointer" }}>i</button>
                  </div>
                </div>
              </div>
              {variantInfoId === preset.id ? (
                <div style={{ marginTop: 6, borderRadius: 12, border: `1px solid ${primary}33`, background: 'rgba(255,255,255,.03)', color: '#b7bfd5', fontSize: 11.5, lineHeight: 1.45, padding: '10px 12px' }}>
                  {preset.id === 'mss' ? 'Preset signature MSS : Bull actif, zones spéciales activées et bonus de troisième fléchette pour enrichir les enchaînements.' : preset.id === 'classic' ? 'La base Gros 6 classique : départ sur Gros 6, validation stricte et structure équilibrée.' : preset.id === 'easy' ? 'Version plus accessible : la même valeur compte quel que soit le segment touché (simple, double ou triple).' : preset.id === 'pro' ? 'Version plus exigeante : les cibles imposées sont limitées aux doubles, triples et Bulls.' : preset.id === 'sudden' ? 'Version ultra nerveuse : une seule vie, chaque erreur peut éliminer immédiatement.' : 'Version longue : plus de vies pour prolonger la pression stratégique.'}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {presetId === 'custom' ? <div style={{ marginTop: 8, color: '#f7d27a', fontSize: 11 }}>Mode personnalisé actif : les réglages ont été modifiés manuellement.</div> : null}
    </Section>
  );

  const StartingLivesSection = () => (
    <Section title="5. VIES DE DÉPART" subtitle="Choisis la réserve de vies de départ. Le contour en cœur reste la référence visuelle MSS pour tout ce qui touche aux vies." primary={primary}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:7,justifyItems:"center"}}>
        {[1,3,5,6,7,10,15,20].map(n=><MssLivesHeartChoice key={n} value={n} active={startingLives===n} onClick={()=>{setStartingLives(n);setPresetId("custom");}} accent={primary}/>)}
      </div>
    </Section>
  );

  const TeamLivesSection = () => {
    const methods = [
      { id: "individual", icon: "♡", title: "VIES INDIVIDUELLES", description: `Chaque membre possède ${startingLives} vies. L'équipe reste en jeu tant qu'un joueur survit.` },
      { id: "shared", icon: "♧", title: "RÉSERVE COMMUNE", description: `Les coéquipiers partagent ${startingLives} vies et poursuivent la partie ensemble jusqu'à épuisement de la réserve.` },
    ] as const;
    const selected = methods.find(method => method.id === teamLifeMode) || methods[0];
    return <Section title="GESTION DES VIES PAR ÉQUIPES" primary={primary}>
      <div style={{display:"flex",justifyContent:"center",gap:12,alignItems:"center"}}>
        {methods.map(method => <button key={method.id} type="button" title={method.title} aria-label={method.title} aria-pressed={teamLifeMode === method.id}
          onClick={() => setTeamLifeMode(method.id)} style={{width:70,height:70,borderRadius:18,border:`1px solid ${teamLifeMode===method.id?primary:`${primary}55`}`,background:teamLifeMode===method.id?`${primary}24`:'rgba(255,255,255,.03)',color:primary,fontSize:34,fontWeight:900,cursor:'pointer',boxShadow:teamLifeMode===method.id?`0 0 14px ${primary}35`:'none'}}>{method.icon}</button>)}
      </div>
      <div style={{textAlign:'center',marginTop:13}}>
        <strong style={{color:primary,fontSize:14,letterSpacing:.35}}>{selected.title}</strong>
        <p style={{color:'#adb8d2',fontSize:12,lineHeight:1.55,maxWidth:380,margin:'7px auto 0'}}>{selected.description}</p>
        <p style={{color:'#8896b8',fontSize:11,lineHeight:1.4,margin:'8px auto 0'}}>Une équipe joue une fois par cycle et fait tourner ses membres.</p>
      </div>
    </Section>;
  };

  const TargetChoice = ({label, detail, active, onClick}: {label:string;detail:string;active:boolean;onClick:()=>void}) => <button type="button" aria-pressed={active} onClick={onClick}
    style={{minWidth:0,minHeight:110,display:'grid',placeItems:'center',alignContent:'center',gap:8,borderRadius:18,padding:12,border:`1px solid ${active?primary:`${primary}50`}`,background:active?`${primary}24`:'rgba(255,255,255,.025)',color:active?primary:'#fff',cursor:'pointer'}}>
    <strong style={{fontSize:16,fontWeight:950}}>{label}</strong><span style={{fontSize:11,textAlign:'center',lineHeight:1.35}}>{detail}</span>
  </button>;

  const TargetsSection = ({part="all"}: {part?:"all"|"validation"|"bull"|"policy"|"first"}) => (
    <Section title={part === 'validation' ? 'VALIDATION DE LA CIBLE' : part === 'bull' ? 'BULL25 ET BULL50' : part === 'policy' ? 'CIBLE IMPOSABLE' : part === 'first' ? 'PREMIÈRE CIBLE' : 'CIBLES'} primary={primary}>
      <div style={{display:'grid',gap:14}}>
        {(part==='all'||part==='validation') && <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
          <TargetChoice label="S / D / T" detail="Chaque multiplicateur compte séparément" active={targetRule==='strict'} onClick={()=>{setTargetRule('strict');setPresetId('custom');}}/>
          <TargetChoice label="VALEUR" detail="Simple, double ou triple acceptés" active={targetRule==='value'} onClick={()=>{setTargetRule('value');setPresetId('custom');}}/>
        </div>}
        {(part==='all'||part==='bull') && <div style={{display:'grid',gap:10}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
            {([{name:'BULL25',score:'25',color:'#25b76b',text:'#ffffff'},{name:'BULL50 / DBULL',score:'50',color:'#ce263c',text:'#ffffff'}] as const).map(b => <button key={b.score} type="button"
              aria-label={`${b.name} : ${allowBull?'actif':'inactif'}`} aria-pressed={allowBull} onClick={()=>{setAllowBull(!allowBull);setPresetId('custom');}}
              style={{minHeight:97,borderRadius:15,padding:10,background:allowBull?b.color:'rgba(255,255,255,.035)',border:`2px solid ${b.color}`,opacity:allowBull?1:.55,display:'grid',placeItems:'center',gap:5,cursor:'pointer',color:allowBull?b.text:b.color,boxShadow:allowBull?`0 0 12px ${b.color}55`:'none'}}>
                <strong style={{fontSize:27,fontWeight:1000}}>{b.score}</strong><span style={{fontSize:11,fontWeight:900}}>{b.name}</span>
              </button>)}
          </div>
          <MssKillerBooleanToggle label="AUTORISER LES DEUX BULLS" checked={allowBull} accent={primary} onChange={v=>{setAllowBull(v);setPresetId('custom');}}/>
          <p style={{fontSize:11,color:'#aebbd4',lineHeight:1.5,margin:0,textAlign:'center'}}>BULL25 = anneau vert · BULL50/DBULL = centre rouge. Le moteur GROS 6 les active ensemble pour le moment.</p>
        </div>}
        {(part==='all'||part==='policy') && <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
          <TargetChoice label="LIBRE" detail="Toutes les zones autorisées" active={selectionPolicy==='open'} onClick={()=>{setSelectionPolicy('open');setPresetId('custom');}}/>
          <TargetChoice label="PRO" detail="Doubles, triples et Bulls" active={selectionPolicy==='pro'} onClick={()=>{setSelectionPolicy('pro');setPresetId('custom');}}/>
        </div>}
        {(part==='all'||part==='first') && <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
          <TargetChoice label="GROS 6" detail="Départ sur la cible classique" active={startingTargetMode==='s6'} onClick={()=>setStartingTargetMode('s6')}/>
          <TargetChoice label="ALÉATOIRE" detail="Cible tirée au sort" active={startingTargetMode==='random'} onClick={()=>setStartingTargetMode('random')}/>
        </div>}
      </div>
    </Section>
  );

  const SpecialZonesSection = () => (
    <Section title="ZONES SPÉCIALES" subtitle="Active ou désactive les zones hors cible et le contour indépendant." primary={primary}>
      <div style={{ display: "grid", gap: 12, position: "relative" }}>
        <div style={{ display: "grid", gap: 8, borderRadius: 16, border: `1px solid ${primary}22`, background: "rgba(255,255,255,.02)", padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
            <MssKillerBooleanToggle label="ZONES FERMÉES" checked={allowSpecialZones} accent={primary} onChange={v=>{setAllowSpecialZones(v);setPresetId('custom');}}/>
            <button type="button" onClick={() => setSpecialZonesDetail((v) => v === "closed" ? null : "closed")} style={{ height: 34, borderRadius: 999, border: `1px solid ${primary}66`, background: "rgba(255,255,255,.03)", color: primary, fontWeight: 900, padding: "0 12px", cursor: "pointer", whiteSpace: "nowrap" }}>Détail</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
            <MssKillerBooleanToggle label="CONTOUR EXTÉRIEUR" checked={allowOuterRing} accent={primary} onChange={v=>{setAllowOuterRing(v);setPresetId('custom');}} />
            <button type="button" onClick={() => setSpecialZonesDetail((v) => v === "outer" ? null : "outer")} style={{ height: 34, borderRadius: 999, border: `1px solid ${primary}66`, background: "rgba(255,255,255,.03)", color: primary, fontWeight: 900, padding: "0 12px", cursor: "pointer", whiteSpace: "nowrap" }}>Détail</button>
          </div>
          <div style={{color:'#a8b2c9',fontSize:11,lineHeight:1.55}}>Zones fermées : 4, 6, 8, 9, 10, 14, 16, 18, 19 et 20 selon les secteurs concernés. Le contour extérieur reste indépendant des zones fermées.</div>
        </div>

        {specialZonesDetail ? (
          <div style={{ position: "relative", zIndex: 2, borderRadius: 18, border: `1px solid ${primary}55`, background: "rgba(7,10,20,.98)", boxShadow: "0 18px 46px rgba(0,0,0,.55)", padding: 14, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ color: primary, fontSize: 13, fontWeight: 950, textTransform: "uppercase", letterSpacing: .9 }}>
                  {specialZonesDetail === "closed" ? "Détail · zones fermées" : "Détail · contour extérieur"}
                </div>
                <div style={{ color: "#aeb7ce", fontSize: 11, marginTop: 4 }}>
                  {specialZonesDetail === "closed" ? "Visualise les secteurs neutralisés hors cible et les règles d'application." : "Visualise la zone de contour indépendante et la logique de validation associée."}
                </div>
              </div>
              <button type="button" onClick={() => setSpecialZonesDetail(null)} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${primary}66`, background: "rgba(255,255,255,.03)", color: primary, fontSize: 18, fontWeight: 900, cursor: "pointer" }}>×</button>
            </div>
            <DartsSpecialZonesRulesVisual lang={lang} compact borderColor={`${primary}77`} />
            <div style={{ display: "grid", gap: 6, color: "#d8deee", fontSize: 11.5, lineHeight: 1.5 }}>
              {specialZonesDetail === "closed" ? (<>
                <div><strong style={{ color: primary }}>Zones fermées :</strong> les impacts hors cible dans les secteurs 4, 6, 8 haut/bas, 9, 10, 14, 16, 18 haut/bas, 19 et 20 sont bloqués quand l'option est activée.</div>
                <div><strong style={{ color: primary }}>Effet en jeu :</strong> ces zones ne peuvent pas devenir des cibles de remplacement. Elles augmentent la précision demandée et rendent les erreurs plus punitives.</div>
              </>) : (<>
                <div><strong style={{ color: primary }}>Contour extérieur :</strong> l'anneau externe est géré séparément des zones fermées. Il peut rester actif même si certaines zones hors cible sont interdites.</div>
                <div><strong style={{ color: primary }}>Effet en jeu :</strong> un impact sur le contour suit sa propre règle de validation. Tu peux donc garder un filet de sécurité partiel sans rouvrir toutes les zones fermées.</div>
              </>)}
            </div>
          </div>
        ) : null}
      </div>
    </Section>
  );

  const OptionsSection = ({part="all"}:{part?:"all"|"bonus"|"order"}) => (
    <Section title={part === "bonus" ? "BONUS D3" : part === "order" ? "ORDRE DE DÉPART" : "OPTIONS"} subtitle={part === "bonus" ? "Définis le bonus accordé lorsque la cible est validée sur la troisième fléchette." : part === "order" ? "Choisis la méthode de départ, avec les mêmes icônes MSS que KILLER." : "Bonus de validation sur D3 et ordre de départ."} primary={primary}>
      <div style={{ display: "grid", gap: 14 }}>
        {(part === "all" || part === "bonus") && <div style={{ display: "grid", gap: 14 }}>
          <MssKillerBooleanToggle label="ACTIVER LE BONUS D3" checked={thirdDartBonusSelection} accent={primary} onChange={v=>{setThirdDartBonusSelection(v);setPresetId('custom');}}/>
          {thirdDartBonusSelection && <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginTop:2}}>
              {[1,2,3].map(n => {
                const active = thirdDartBonusCount === n;
                const label = `${n} FLÉCHETTE${n > 1 ? 'S' : ''}`;
                const detail = n === 1
                  ? "Une fléchette bonus pour désigner l'objectif suivant."
                  : n === 2
                  ? "Deux fléchettes bonus pour élargir la relance."
                  : "Trois fléchettes bonus pour viser le prochain objectif.";
                return (
                  <button key={n} type="button" aria-label={label} aria-pressed={active} onClick={()=>{setThirdDartBonusCount(n);setPresetId('custom');}}
                    style={{minHeight:142,borderRadius:18,border:`1px solid ${active?primary:`${primary}44`}`,background:active?`${primary}20`:'rgba(255,255,255,.03)',boxShadow:active?`0 0 18px ${primary}33`:'none',display:'grid',gridTemplateRows:'70px auto auto',alignItems:'center',justifyItems:'center',padding:'12px 10px',cursor:'pointer',color:active?primary:'#eef2ff',textAlign:'center'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:n===3?2:6}}>
                      {Array.from({length:n}).map((_,i)=><span key={i} aria-hidden="true" style={{width:n===3?18:22,height:n===3?42:48,display:'block',backgroundColor:active?primary:'#60698a',opacity:active?1:.85,WebkitMaskImage:`url(${cricketDartShape})`,maskImage:`url(${cricketDartShape})`,WebkitMaskRepeat:'no-repeat',maskRepeat:'no-repeat',WebkitMaskSize:'contain',maskSize:'contain',WebkitMaskPosition:'center',maskPosition:'center',filter:active?`drop-shadow(0 0 5px ${primary}66)`: 'none'}} />)}
                    </div>
                    <strong style={{fontSize:14,fontWeight:1000,lineHeight:1.05}}>{label}</strong>
                    <span style={{fontSize:11,lineHeight:1.35,color:active?'#ffeec3':'#adb6cc'}}>{detail}</span>
                  </button>
                );
              })}
            </div>
          </>}
        </div>}
        {(part === "all" || part === "order") && <div>
          <div data-mss-guide-section="gros6-start-order" data-mss-guide-label="Ordre de départ" style={{ marginTop: 2, marginBottom: 2 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary, marginBottom: 10 }}>Ordre de départ</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6, flexWrap: "nowrap" }}>
              {START_ORDER_OPTIONS.map((option) => (
                <MssSelectorIconButton
                  key={option.id}
                  icon={option.icon as any}
                  label={option.label}
                  accent={primary}
                  active={startOrderMode === option.id}
                  onClick={() => { setStartOrderMode(option.id as any); setRandomStartOrder(option.id === "random"); }}
                />
              ))}
            </div>
            {(() => {
              const activeOption = START_ORDER_OPTIONS.find((option) => option.id === startOrderMode) || START_ORDER_OPTIONS[0];
              return (
                <div style={{ marginTop: 10, textAlign: "center", display: "grid", gap: 4 }}>
                  <div style={{ color: primary, fontSize: 13, fontWeight: 950, textTransform: "uppercase", letterSpacing: .9 }}>{activeOption.label}</div>
                  <div style={{ fontSize: 11, color: "#9da5b9", maxWidth: 420, margin: "0 auto", lineHeight: 1.45 }}>{activeOption.detail}</div>
                </div>
              );
            })()}
          </div>
        </div>}
      </div>
    </Section>
  );

  const PreviewRecapSection = () => {
    const teams = participantMode === "teams" ? buildSelectedTeams() : [];
    const validTeamSize = teams.length === autoTeamCount && teams.every((team:any)=>team.players.length===autoTeamSize);
    const uniqueMemberIds = new Set(teams.flatMap((team:any)=>team.players.map((player:any)=>String(player.id))));
    const canStart = participantMode === "teams"
      ? validTeamSize && uniqueMemberIds.size===autoTeamCount*autoTeamSize
      : (playerFormat === "duel" ? selectedPlayers.length===2 : selectedPlayers.length>=2);
    const textValue = (label:string,value:any)=><MssConfigFact label={label} value={value}/>;
    return <Section title="FICHE DE PARTIE" primary={primary}>
      <div style={{display:"grid",gap:13,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:9}}>
          <div style={{color:"#aeb8cc",fontSize:11}}>{participantMode==="teams"?`${teams.length} équipes · ${autoTeamSize} membres`:`${selectedPlayers.length} joueurs · ${playerFormat.toUpperCase()}`}</div>
          <span role="status" style={{flexShrink:0,borderRadius:999,border:`1px solid ${canStart?primary:"#fb7185"}77`,color:canStart?primary:"#fb7185",fontSize:10,fontWeight:950,padding:"5px 9px"}}>{canStart?"✓ PRÊT":"À COMPLÉTER"}</span>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:9}}>
          <strong style={{color:primary,fontSize:11,letterSpacing:.6}}>{participantMode==="teams"?"ÉQUIPES EN JEU":"JOUEURS EN JEU"}</strong>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7,marginTop:10}}>
            {participantMode==="teams"?teams.map((team:any)=><div key={team.id} style={{minWidth:0,background:"rgba(255,255,255,.04)",border:`1px solid ${team.color||primary}55`,padding:8,borderRadius:12,display:"grid",justifyItems:"center",gap:7,textAlign:"center"}}>
              {team.logoDataUrl?<img src={team.logoDataUrl} alt="" style={{width:56,height:56,borderRadius:"50%",objectFit:"contain"}}/>:<span style={{color:team.color||primary,fontWeight:950}}>ÉQUIPE</span>}
              <strong style={{fontSize:12,color:team.color||primary,overflowWrap:"anywhere"}}>{team.name}</strong>
              <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap"}}>{team.players.map((player:any)=><div key={player.id} style={{display:"grid",justifyItems:"center",gap:3}}><ProfileAvatar name={player.name} avatarDataUrl={avatarOf(player)} size={30}/><span style={{fontSize:9,color:"#d9dce8",maxWidth:65,overflow:"hidden",textOverflow:"ellipsis"}}>{player.name}</span></div>)}</div>
            </div>):selectedPlayers.map((player:any)=><div key={player.id} style={{display:"flex",alignItems:"center",gap:8,minWidth:0,borderRadius:11,background:"rgba(255,255,255,.035)",padding:6}}><ProfileAvatar name={player.name} avatarDataUrl={avatarOf(player)} size={30}/><strong style={{fontSize:11,overflowWrap:"anywhere"}}>{player.name}</strong></div>)}
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:9}}>
          <strong style={{color:primary,fontSize:11,letterSpacing:.6}}>RÈGLES ESSENTIELLES</strong>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",columnGap:12,marginTop:7}}>
            {textValue("Vies",`${startingLives} / ${participantMode==="teams" && teamLifeMode==="shared"?"équipe":"joueur"}`)}
            {textValue("Validation",targetRule==="strict"?"S / D / T":"Valeur libre")}
            {textValue("BULL",allowBull?"ON":"OFF")}
            {textValue("Zones",allowSpecialZones?"ON":"OFF")}
            {textValue("Contour",allowOuterRing?"ON":"OFF")}
            {textValue("Départ",startOrderMode.toUpperCase())}
            {textValue("Première cible",startingTargetMode==="s6"?"G6":"Aléatoire")}
            {textValue("Bonus D3",thirdDartBonusSelection?`+${thirdDartBonusCount} fléchettes`:"OFF")}
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:9}}>
          <strong style={{color:primary,fontSize:11,letterSpacing:.6}}>SAISIE ET AUDIO</strong>
          {textValue("Saisie",scoreInputMethod.toUpperCase())}
          {textValue("Audio",[arcadeEnabled?"Arcade":null,hitEnabled?"Bruitages":null,voiceEnabled?"Annonces":null].filter(Boolean).join(" · ")||"OFF")}
        </div>
        {!canStart && <p style={{margin:0,fontSize:11,color:"#fda4af"}}>{participantMode==="teams"?`Complète ${autoTeamCount} équipes de ${autoTeamSize} membres.`:playerFormat==="duel"?"Sélectionne exactement 2 joueurs.":"Sélectionne au moins 2 joueurs."}</p>}
        {error && <p role="alert" style={{fontSize:11,color:"#fda4af",margin:0}}>{error}</p>}
        <button type="button" disabled={!canStart} onClick={launch} style={{border:0,borderRadius:999,padding:"15px 18px",background:canStart?primary:"#4c4f58",color:canStart?"#17131c":"#b6b9c4",fontWeight:1000,fontSize:15,cursor:canStart?"pointer":"not-allowed",boxShadow:canStart?`0 0 22px ${primary}44`:"none"}}>LANCER LE GROS 6</button>
      </div>
    </Section>;
  };


  return (
    <div className={`msc-mode-config gros6-config-screen ${configViewMode === "guided" ? "msc-mode-config--guided" : "msc-mode-config--split"}`} style={{ minHeight: "100vh", background: theme.pageBg || theme.bg || "#070912", color: theme.text || "#fff", display: "flex", flexDirection: "column", padding: 12 }}>
      <header className="msc-mode-config-header" style={{ position: "sticky", top: 0, zIndex: 60, margin: "-12px -12px 12px", background: theme.pageBg || theme.bg || "#070912", paddingTop: "env(safe-area-inset-top)" }}>
        <div className="msc-config-ticker-frame" style={{ position: "relative", height: 92, overflow: "hidden", boxShadow: "0 12px 30px rgba(0,0,0,.42)" }}>
          <img className="msc-config-ticker-image" src={(lang === "fr" ? tickerGros6 : tickerBig6) as any} alt={lang === "fr" ? "Gros 6" : "Big 6"} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
            <div style={{ pointerEvents: "auto" }}><BackDot onClick={() => go?.("games")} size={42} color={primary} glow={`${primary}AA`} /></div>
            <div style={{ pointerEvents: "auto" }}><InfoDot onClick={() => setRulesOpen(true)} title="Règles du Gros 6" size={42} color={primary} glow={`${primary}AA`} /></div>
          </div>
        </div>
      </header>
      <div data-mss-config-difficulty="1" style={{ display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 8 }}><GameDifficultyStars game="gros_6" compact showValue={false} /></div>

      {configViewMode === "complete" && <DartsRelatedModesPanel gameId="gros_6" accent={primary} compact onOpenGame={id => { const target=dartsFamilyGameNavigation(id); if(target) go?.(target.tab, target.params); }} />}
      <div className="msc-mode-config-body gros6-config-content" style={{ width: "100%", maxWidth: 1180, margin: "0 auto" }}>
        <MssKillerCreateMenu open={createMenuOpen} accent={primary} withTeams={false}
          onClose={() => setCreateMenuOpen(false)} onChoose={openCreateChoice} />
        <MssKillerCreateParticipantDialog open={createDialogOpen} kind={createKind} accent={primary}
          name={createName} country={createCountry} avatar={createAvatar} level={createLevel} error={createError}
          onClose={() => setCreateDialogOpen(false)} onSubmit={submitCreatedParticipant}
          onName={setCreateName} onCountry={setCreateCountry} onAvatar={readCreateAvatar} onLevel={setCreateLevel} />
        <MssClassicConfigFlow title="Gros 6" steps={guidedSteps} step={guidedStep} view={configViewMode}
          accent={primary} summary={guidedSelectionLabel}
          progressiveSingleLine
          onStep={setGuidedStep} onView={setConfigViewMode}
          onHelp={() => setGros6HelpOpen((v) => !v)} />
        {configViewMode === "guided" ? (
          <>
            {guidedStep === 0 && <MssClassicOverview title="GROS 6 · AWENA VOUS EXPLIQUE" onHelp={() => setGros6HelpOpen((v) => !v)}
              description="Choisis le type de partie, sélectionne les joueurs ou les équipes, ajuste les vies, les cibles, les zones spéciales et le lancement avant de vérifier la fiche de partie."
              accent={primary} />}
            {gros6HelpOpen && <div style={{ border: `1px solid ${primary}55`, borderRadius: 14,
              padding: 12, marginBottom: 12, fontSize: 12, color: "#bac4d9" }}>
              Le Gros 6 impose une cible au joueur suivant. Quand une cible est validée, les fléchettes restantes servent à définir la prochaine cible. Les zones spéciales et le bonus de troisième fléchette peuvent durcir ou enrichir la partie.
            </div>}
            {guidedStep === 0 && <DartsRelatedModesPanel gameId="gros_6" accent={primary} compact onOpenGame={id => { const target=dartsFamilyGameNavigation(id); if(target) go?.(target.tab, target.params); }} />}
            {guidedStep === 1 && <PartyTypeSection />}
            {guidedStep === 2 && <FormatSection />}
            {guidedStep === 3 && renderParticipantsSelector()}
            {guidedStep === 4 && <VariantPresetsSection />}
            {guidedStep === 5 && <StartingLivesSection />}
            {hasTeamLifeStep && guidedStep === 6 && <TeamLivesSection />}
            {stepAfterLives === 7 && <TargetsSection part="validation" />}
            {stepAfterLives === 8 && <TargetsSection part="bull" />}
            {stepAfterLives === 9 && <TargetsSection part="policy" />}
            {stepAfterLives === 10 && <TargetsSection part="first" />}
            {stepAfterLives === 11 && <SpecialZonesSection />}
            {stepAfterLives === 12 && <OptionsSection part="bonus" />}
            {stepAfterLives === 13 && <OptionsSection part="order" />}
            {stepAfterLives === 14 && <Section title="MODE DE SAISIE" subtitle="Réutilise le panneau de saisie standard MSS du Gros 6." primary={primary}><MssGros6InputSelector value={scoreInputMethod} onChange={setScoreInputMethod} accent={primary}/></Section>}
            {stepAfterLives === 15 && <Section title="MODE AUDIO" subtitle="Active les sons Arcade, les bruitages et les annonces vocales." primary={primary}><MssGuidedAudioPanel accent={primary} arcade={arcadeEnabled} hits={hitEnabled} voice={voiceEnabled} onArcadeChange={setArcadeEnabled} onHitsChange={setHitEnabled} onVoiceChange={setVoiceEnabled} voiceId={voiceId} voices={[{id:"awena",label:"Awena · voix officielle"},{id:"default",label:"Défaut"},{id:"female",label:"Voix féminine"},{id:"male",label:"Voix masculine"}]} onVoiceIdChange={setVoiceId}/></Section>}
            {stepAfterLives === 16 && <PreviewRecapSection />}
            {guidedStep > 0 && <MssGros6AwenaTip mode="arcade" step={stepAfterLives} />}
          </>
        ) : (
          <>
            <PartyTypeSection />
            <FormatSection />
            {renderParticipantsSelector()}
            <VariantPresetsSection />
            <StartingLivesSection />
            {participantMode === "teams" && <TeamLivesSection />}
            <TargetsSection />
            <SpecialZonesSection />
            <OptionsSection />
            <Section title="MODE AUDIO" subtitle="Active les sons Arcade, les bruitages et les annonces vocales." primary={primary}><MssGuidedAudioPanel accent={primary} arcade={arcadeEnabled} hits={hitEnabled} voice={voiceEnabled} onArcadeChange={setArcadeEnabled} onHitsChange={setHitEnabled} onVoiceChange={setVoiceEnabled} voiceId={voiceId} voices={[{id:"awena",label:"Awena · voix officielle"},{id:"default",label:"Défaut"},{id:"female",label:"Voix féminine"},{id:"male",label:"Voix masculine"}]} onVoiceIdChange={setVoiceId}/></Section>
            <Section title="MODE DE SAISIE" subtitle="Réutilise le panneau de saisie standard MSS du Gros 6." primary={primary}><MssGros6InputSelector value={scoreInputMethod} onChange={setScoreInputMethod} accent={primary}/></Section>
            <PreviewRecapSection />
          </>
        )}
      </div>

      {rulesOpen ? (
        <div onClick={() => setRulesOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 18 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(820px,96vw)", maxHeight: "88vh", overflow: "auto", borderRadius: 20, border: `1px solid ${primary}66`, background: "linear-gradient(180deg,rgba(13,16,31,.99),rgba(5,7,16,.99))", padding: 18, boxShadow: `0 0 44px ${primary}33` }}>
            <div style={{ color: primary, fontWeight: 1000, fontSize: 20, marginBottom: 10 }}>{lang === "fr" ? "RÈGLES — GROS 6" : "RULES — BIG 6"}</div>
            <div style={{ display: "grid", gap: 14 }}>
              <img src={gros6RulesBoard as any} alt="Gros 6 board" style={{ width: "100%", maxWidth: 460, margin: "0 auto", display: "block", borderRadius: 18, border: `1px solid ${primary}44`, boxShadow: `0 0 24px ${primary}22` }} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                <figure style={{ margin: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${primary}44`, background: "#05070c" }}>
                  <img src={(isFrenchRulesVisual ? smallSingleZoneVisual : smallSingleZoneVisualEn) as any} alt={isFrenchRulesVisual ? "Zone de petit simple" : "Small single zone"} style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "contain" }} />
                  <figcaption style={{ padding: "8px 10px", textAlign: "center", color: primary, fontSize: 10, fontWeight: 1000, letterSpacing: .7 }}>{isFrenchRulesVisual ? "PETIT SIMPLE" : "SMALL SINGLE"}</figcaption>
                </figure>
                <figure style={{ margin: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${primary}44`, background: "#05070c" }}>
                  <img src={(isFrenchRulesVisual ? bigSingleZoneVisual : bigSingleZoneVisualEn) as any} alt={isFrenchRulesVisual ? "Zone de gros simple" : "Large single zone"} style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "contain" }} />
                  <figcaption style={{ padding: "8px 10px", textAlign: "center", color: primary, fontSize: 10, fontWeight: 1000, letterSpacing: .7 }}>{isFrenchRulesVisual ? "GROS SIMPLE" : "LARGE SINGLE"}</figcaption>
                </figure>
              </div>

              <div style={{ color: "#e2e4ef", fontSize: 13, lineHeight: 1.68 }}>
                {lang === "fr"
                  ? "Le Gros 6 / Big 6 est un mode à élimination. La partie démarre généralement sur GROS 6. Chaque joueur dispose de 3 fléchettes pour toucher exactement la cible courante. Si la cible n'est pas validée avant la 3e fléchette, le joueur — ou l'équipe si la réserve commune est activée — perd une vie. Le dernier joueur ou la dernière équipe encore en vie gagne la partie. Lorsqu'un joueur impose la nouvelle cible, il est protégé ; en mode équipes, toute son équipe est protégée et saute ses tours jusqu'à ce qu'une autre équipe valide une nouvelle cible."
                  : "Big 6 is an elimination game. The match usually starts on BIG 6. Each player has 3 darts to hit the exact current target. If the target is not cleared within 3 darts, the player — or the team when shared lives are enabled — loses one life. The last surviving player or team wins the match. When a player sets the new target, that player is protected; in Teams mode, the whole team is skipped until another team clears a different target."}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ color: primary, fontWeight: 900, fontSize: 14 }}>{lang === "fr" ? "Déroulement d'un tour" : "Turn flow"}</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#dfe3f8", fontSize: 12.5, lineHeight: 1.6 }}>
                  <li>{lang === "fr" ? "Touchez la cible exacte : GROS 6, PETIT 6, D6, T6, BULL, DBULL ou une zone spéciale selon la configuration." : "Hit the exact target: BIG 6, SMALL 6, D6, T6, BULL, DBULL or a special off-board zone depending on the configuration."}</li>
                  <li>{lang === "fr" ? "Dès qu'une cible est validée, les fléchettes restantes servent à imposer la cible du joueur suivant." : "As soon as the target is cleared, all remaining darts are used to set the next target for the following player."}</li>
                  <li>{lang === "fr" ? "Si la validation arrive sur la 3e fléchette, le bonus de 3e fléchette peut ouvrir une nouvelle mini-volée de sélection pour définir la prochaine cible." : "If the target is cleared with the 3rd dart, the 3rd-dart bonus can open a fresh selection mini-visit to define the next target."}</li>
                  <li>{lang === "fr" ? "Rater la cible pendant toute la volée fait perdre 1 vie et la cible reste inchangée pour le tour suivant." : "Failing to clear the target within the whole visit costs 1 life and the same target stays in play for the next turn."}</li>
                </ul>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ color: primary, fontWeight: 900, fontSize: 14 }}>{lang === "fr" ? "Zones hors cible / spéciales" : "Off-board / special zones"}</div>
                <div style={{ color: "#e2e4ef", fontSize: 12.5, lineHeight: 1.66 }}>
                  {lang === "fr"
                    ? "Avec l'option Zones spéciales, certaines zones hors cible deviennent de vraies cibles jouables. Cela comprend le contour extérieur du cercle des chiffres ainsi que plusieurs zones fermées autour des numéros 4, 6, 8, 9, 10, 14, 16, 18, 19 et 20. Lorsqu'un joueur impose l'une de ces zones, le joueur suivant doit toucher exactement cette zone précise pour sauver sa vie."
                    : "With Special Zones enabled, several off-board areas become real playable targets. This includes the outer number ring and several closed areas around numbers 4, 6, 8, 9, 10, 14, 16, 18, 19 and 20. When a player sets one of these zones, the next player must hit that exact area to save their life."}
                </div>
                <DartsSpecialZonesRulesVisual lang={lang} borderColor={`${primary}66`} />
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ color: primary, fontWeight: 900, fontSize: 14 }}>{lang === "fr" ? "Variantes principales" : "Main variants"}</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#dfe3f8", fontSize: 12.5, lineHeight: 1.6 }}>
                  <li>{lang === "fr" ? "Classique : départ Gros 6, règle stricte avec gros simple, petit simple, double et triple distincts, Bull actif." : "Classic: starts on Big 6, strict big single, small single, double and treble targeting, Bull enabled."}</li>
                  <li>{lang === "fr" ? "Facile : la valeur seule peut suffire, même si simple/double/triple diffèrent." : "Easy: the value alone may count even if simple/double/triple differ."}</li>
                  <li>{lang === "fr" ? "PRO : les cibles imposées se limitent aux doubles, triples et Bulls." : "PRO: the targets you may set are limited to doubles, triples and Bulls."}</li>
                  <li>{lang === "fr" ? "Sudden Death : une seule vie par joueur ou équipe." : "Sudden Death: only one life per player or team."}</li>
                  <li>{lang === "fr" ? "Endurance : plus de vies pour des parties longues." : "Endurance: extra lives for longer matches."}</li>
                </ul>
              </div>
            </div>
            <button type="button" onClick={() => setRulesOpen(false)} style={{ marginTop: 16, borderRadius: 999, border: `1px solid ${primary}`, background: primarySoft, color: "#fff", padding: "8px 13px", fontWeight: 950, cursor: "pointer" }}>{lang === "fr" ? "FERMER" : "CLOSE"}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
