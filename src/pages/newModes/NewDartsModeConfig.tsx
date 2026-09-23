// @ts-nocheck
import React from "react";
import BackDot from "../../components/BackDot";
import BotPagedSelector from "../../components/BotPagedSelector";
import InfoDot from "../../components/InfoDot";
import OptionRow from "../../components/OptionRow";
import OptionSelect from "../../components/OptionSelect";
import OptionToggle from "../../components/OptionToggle";
import PageHeader from "../../components/PageHeader";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import Section from "../../components/Section";
import { useTheme } from "../../contexts/ThemeContext";
import { loadBotPlayers } from "../../lib/bots";
import { recordProfileUsageForMode } from "../../lib/profileUsage";
import { loadTeamsBySport } from "../../lib/petanqueTeamsStore";
import { BotTeamsSection, PillButton, X01_PRO_BOTS, TeamsSection, SelectedParticipantsCompactBlock } from "../X01ConfigV3";
import { findRememberedGeneratedTeam } from "../../lib/teamAutoShuffle";
import { CRADOS_BOTS, CRADOS_BOT_TEAMS } from "../../lib/dartsCradosBots";

export type NewDartsModeId = "castle" | "gotcha" | "hare_hounds" | "pendu" | "menteur" | "crados" | "fifty_one_by_five" | "looper" | "call_three" | "steeplechase";
type BotLevel = "easy" | "normal" | "hard";
type ConfigViewMode = "guided" | "complete";

type ModeDefinition = {
  id: NewDartsModeId;
  title: string;
  ticker: string;
  accent: string;
  accent2: string;
  minPlayers: number;
  maxPlayers: number;
  playTab: string;
  guidedSteps: string[];
  rulesContent: React.ReactNode;
};

type Props = {
  mode: NewDartsModeId;
  definition: ModeDefinition;
  store?: any;
  go?: (tab: any, params?: any) => void;
  setTab?: (tab: any, params?: any) => void;
  params?: any;
};

const LS_PREFIX = "dc_modecfg_new_darts_v1_";

const CRADOS_TEAM_SLOTS = [
  { id: "gold", name: "Team Gold", color: "#f7c85c" },
  { id: "pink", name: "Team Pink", color: "#ff4fa2" },
  { id: "blue", name: "Team Blue", color: "#4fc3ff" },
  { id: "green", name: "Team Green", color: "#6dff7c" },
];

function cradosNormalizeTeamId(value: any): string {
  const raw = String(value || "");
  return raw.replace(/^crados_team_/, "");
}

function cradosTeamBaseId(value: any): string {
  return String(value?.baseTeamId || value?.sourceTeamId || value?.id || value || "").split("__slot_")[0];
}

function cradosTeamSuffix(index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return index < letters.length ? letters[index] : `#${index + 1}`;
}

function uniqueStrings(values: any[]) {
  return Array.from(new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean)));
}

function shuffleCopy<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}


function interleaveCradosTeamIds(teams: any[], randomOrder: boolean): string[] {
  const source = randomOrder ? shuffleCopy(teams || []) : [...(teams || [])];
  const normalized = source.map((team) => ({ ...team, playerIds: randomOrder ? shuffleCopy(uniqueStrings(team?.playerIds || [])) : uniqueStrings(team?.playerIds || []) }));
  const max = Math.max(0, ...normalized.map((team) => team.playerIds.length));
  const out: string[] = [];
  for (let member = 0; member < max; member += 1) {
    for (const team of normalized) if (team.playerIds[member]) out.push(team.playerIds[member]);
  }
  return uniqueStrings(out);
}

function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}

function avatarOf(value: any): string | null {
  return value?.avatarDataUrl ?? value?.avatarUrl ?? value?.avatar ?? value?.photoDataUrl ?? null;
}

function normalizeProfile(profile: any, isBot = false) {
  return {
    ...profile,
    id: String(profile?.id || profile?.profileId || `profile-${Math.random().toString(36).slice(2, 9)}`),
    name: String(profile?.name || profile?.displayName || (isBot ? "BOT" : "Joueur")),
    avatarDataUrl: avatarOf(profile),
    isBot: isBot || !!profile?.isBot,
  };
}

function readSaved(mode: NewDartsModeId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${LS_PREFIX}${mode}`) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSaved(mode: NewDartsModeId, value: any) {
  try { localStorage.setItem(`${LS_PREFIX}${mode}`, JSON.stringify(value)); } catch {}
}

function Pill({ children, active, onClick, accent }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 36,
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? accent : "rgba(255,255,255,.11)"}`,
        background: active ? `${accent}20` : "rgba(255,255,255,.035)",
        color: active ? "#fff" : "#c7cad9",
        fontWeight: 900,
        fontSize: 11.5,
        boxShadow: active ? `0 0 18px ${accent}33` : "none",
      }}
    >{children}</button>
  );
}

function SummaryLine({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, fontSize: 11.5 }}><span style={{ color: "#8f94b5" }}>{label}</span><strong style={{ color: "#fff", textAlign: "right" }}>{value}</strong></div>;
}

export default function NewDartsModeConfig(props: Props) {
  const { mode, definition } = props;
  const { theme } = useTheme();
  const go = props.go ?? props.setTab;
  const store = props.store ?? props.params?.store ?? null;
  const saved = React.useMemo(() => readSaved(mode), [mode]);
  const accent = definition.accent || theme?.primary || "#ffb13b";
  const accent2 = definition.accent2 || theme?.accent2 || theme?.accent1 || accent;
  const soft = theme?.textSoft || "#aeb2d3";

  const [viewMode, setViewMode] = React.useState<ConfigViewMode>(() => {
    try { return localStorage.getItem(`dc_${mode}_config_view_mode`) === "complete" ? "complete" : "guided"; } catch { return "guided"; }
  });
  const [guidedStep, setGuidedStep] = React.useState(0);
  const [viewModeChosen, setViewModeChosen] = React.useState(() => mode !== "crados");
  const configScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(Array.isArray(saved.selectedIds) ? saved.selectedIds.map(String).slice(0, definition.maxPlayers) : []);
  const [botsOpen, setBotsOpen] = React.useState(saved.botsOpen === true);
  const [botLevel, setBotLevel] = React.useState<BotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [randomOrder, setRandomOrder] = React.useState(saved.randomOrder !== false);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [seriesWins, setSeriesWins] = React.useState<1 | 2 | 3>(saved.seriesWins === 2 || saved.seriesWins === 3 ? saved.seriesWins : 1);

  // CASTLE
  const [castleBricks, setCastleBricks] = React.useState(saved.castleBricks === 10 || saved.castleBricks === 20 ? saved.castleBricks : 15);
  const [castleAssignment, setCastleAssignment] = React.useState<"random" | "offhand">(saved.castleAssignment === "offhand" ? "offhand" : "random");
  const [castleAttacks, setCastleAttacks] = React.useState(saved.castleAttacks !== false);
  const [castleReassignEachLeg, setCastleReassignEachLeg] = React.useState(saved.castleReassignEachLeg !== false);

  // GOTCHA
  const [gotchaTarget, setGotchaTarget] = React.useState([201,301,401,501,601,701].includes(Number(saved.gotchaTarget)) ? Number(saved.gotchaTarget) : 301);
  const [gotchaOut, setGotchaOut] = React.useState<"straight" | "double" | "master">(["double","master"].includes(saved.gotchaOut) ? saved.gotchaOut : "straight");
  const [gotchaMaxRounds, setGotchaMaxRounds] = React.useState([0,15,20,50,80].includes(Number(saved.gotchaMaxRounds)) ? Number(saved.gotchaMaxRounds) : 0);
  const [gotchaBust, setGotchaBust] = React.useState<"turn" | "zero">(saved.gotchaBust === "zero" ? "zero" : "turn");

  // HARE & HOUNDS
  const [houndStart, setHoundStart] = React.useState<5 | 12>(saved.houndStart === 12 ? 12 : 5);
  const [hareTargetZone, setHareTargetZone] = React.useState<"any" | "double" | "triple">(["double","triple"].includes(saved.hareTargetZone) ? saved.hareTargetZone : "any");
  const [hareRoleMode, setHareRoleMode] = React.useState<"first" | "random" | "rotate">(["random","rotate"].includes(saved.hareRoleMode) ? saved.hareRoleMode : "first");
  const [hareDirection, setHareDirection] = React.useState<"clockwise" | "counter">(saved.hareDirection === "counter" ? "counter" : "clockwise");

  // PENDU
  const [penduPartsToLose, setPenduPartsToLose] = React.useState<6 | 8>(saved.penduPartsToLose === 8 ? 8 : 6);
  const [penduChallengeMode, setPenduChallengeMode] = React.useState<"caller" | "random" | "mixed">(["random", "mixed"].includes(saved.penduChallengeMode) ? saved.penduChallengeMode : "caller");
  const [penduTargetFamily, setPenduTargetFamily] = React.useState<"segments" | "scores" | "mixed">(["scores", "mixed"].includes(saved.penduTargetFamily) ? saved.penduTargetFamily : "segments");
  const [penduExecution, setPenduExecution] = React.useState<"strict" | "flex">(saved.penduExecution === "flex" ? "flex" : "strict");

  // MENTEUR
  const [menteurLives, setMenteurLives] = React.useState<3 | 5 | 7>(saved.menteurLives === 3 || saved.menteurLives === 7 ? saved.menteurLives : 5);
  const [menteurContractDeck, setMenteurContractDeck] = React.useState<"score" | "mixed" | "advanced">(["mixed", "advanced"].includes(saved.menteurContractDeck) ? saved.menteurContractDeck : "score");
  const [menteurRaiseStep, setMenteurRaiseStep] = React.useState<5 | 10 | 20>(saved.menteurRaiseStep === 10 || saved.menteurRaiseStep === 20 ? saved.menteurRaiseStep : 5);
  const [menteurBullAllowed, setMenteurBullAllowed] = React.useState(saved.menteurBullAllowed !== false);

  // CRADOS
  const [cradosDirtLimit, setCradosDirtLimit] = React.useState<10 | 15 | 20>(saved.cradosDirtLimit === 15 || saved.cradosDirtLimit === 20 ? saved.cradosDirtLimit : 10);
  const [cradosLayersToOwn, setCradosLayersToOwn] = React.useState<2 | 3 | 4>(saved.cradosLayersToOwn === 2 || saved.cradosLayersToOwn === 4 ? saved.cradosLayersToOwn : 3);
  const [cradosBullWash, setCradosBullWash] = React.useState(saved.cradosBullWash !== false);
  const [cradosStealMode, setCradosStealMode] = React.useState<"block" | "flip">(saved.cradosStealMode === "flip" ? "flip" : "block");
  const [cradosSectorRaceMode, setCradosSectorRaceMode] = React.useState<"claim" | "race">(saved.cradosSectorRaceMode === "race" ? "race" : "claim");
  const [cradosCleanBullSplash, setCradosCleanBullSplash] = React.useState(saved.cradosCleanBullSplash === true);
  const [cradosParticipantMode, setCradosParticipantMode] = React.useState<"players" | "teams">(saved.cradosParticipantMode === "teams" ? "teams" : "players");
  const [cradosTeamsSourceMode, setCradosTeamsSourceMode] = React.useState<"manual" | "saved" | "auto">(saved.cradosTeamsSourceMode === "saved" || saved.cradosTeamsSourceMode === "auto" ? saved.cradosTeamsSourceMode : "manual");
  const [cradosTeamAssignments, setCradosTeamAssignments] = React.useState<Record<string, string>>(() => {
    const raw = saved.cradosTeamAssignments && typeof saved.cradosTeamAssignments === "object" ? saved.cradosTeamAssignments : {};
    return Object.fromEntries(Object.entries(raw).map(([playerId, teamId]) => [String(playerId), cradosNormalizeTeamId(teamId)]));
  });
  const legacyCradosSelectedTeamIds = Array.isArray(saved.cradosSelectedTeamIds) ? saved.cradosSelectedTeamIds.map(String) : [];
  const [cradosSelectedTeamIds, setCradosSelectedTeamIds] = React.useState<string[]>(() => legacyCradosSelectedTeamIds.filter((id) => !cradosTeamBaseId(id).startsWith("bot_team_crados_")));
  const [cradosSelectedBotTeamIds, setCradosSelectedBotTeamIds] = React.useState<string[]>(() => Array.isArray(saved.cradosSelectedBotTeamIds) ? saved.cradosSelectedBotTeamIds.map(String) : legacyCradosSelectedTeamIds.filter((id) => cradosTeamBaseId(id).startsWith("bot_team_crados_")));
  const [cradosSavedTeamMemberSelections, setCradosSavedTeamMemberSelections] = React.useState<Record<string, string[]>>(() => saved.cradosSavedTeamMemberSelections && typeof saved.cradosSavedTeamMemberSelections === "object" ? saved.cradosSavedTeamMemberSelections : {});
  const [cradosBotTeamsPanelEnabled, setCradosBotTeamsPanelEnabled] = React.useState(saved.cradosBotTeamsPanelEnabled === true);
  const [cradosTeamError, setCradosTeamError] = React.useState("");

  // 51 BY 5
  const [fiftyOneTarget, setFiftyOneTarget] = React.useState<31 | 51 | 71 | 101>([31, 71, 101].includes(Number(saved.fiftyOneTarget)) ? Number(saved.fiftyOneTarget) as any : 51);
  const [fiftyOneRequireThreeScoringDarts, setFiftyOneRequireThreeScoringDarts] = React.useState(saved.fiftyOneRequireThreeScoringDarts !== false);
  const [fiftyOneBust, setFiftyOneBust] = React.useState<"hold" | "zero">(saved.fiftyOneBust === "zero" ? "zero" : "hold");

  // LOOPER
  const [looperLives, setLooperLives] = React.useState<3 | 4 | 5>(saved.looperLives === 3 || saved.looperLives === 4 ? saved.looperLives : 5);
  const [looperStartTarget, setLooperStartTarget] = React.useState<"offhand" | "random">(saved.looperStartTarget === "random" ? "random" : "offhand");
  const [looperNumberLoops, setLooperNumberLoops] = React.useState(saved.looperNumberLoops !== false);
  const [looperSetterShield, setLooperSetterShield] = React.useState(saved.looperSetterShield !== false);

  // CALL THREE
  const [callThreeRounds, setCallThreeRounds] = React.useState<5 | 10 | 15>(saved.callThreeRounds === 5 || saved.callThreeRounds === 15 ? saved.callThreeRounds : 10);
  const [callThreeCaller, setCallThreeCaller] = React.useState<"next" | "random">(saved.callThreeCaller === "random" ? "random" : "next");
  const [callThreeOrderStrict, setCallThreeOrderStrict] = React.useState(saved.callThreeOrderStrict !== false);
  const [callThreeBull, setCallThreeBull] = React.useState(saved.callThreeBull !== false);

  // STEEPLECHASE
  const [steepleDirection, setSteepleDirection] = React.useState<"clockwise" | "counter">(saved.steepleDirection === "counter" ? "counter" : "clockwise");
  const [steepleFences, setSteepleFences] = React.useState(saved.steepleFences !== false);
  const [steepleFinishBull, setSteepleFinishBull] = React.useState<"any" | "double">(saved.steepleFinishBull === "double" ? "double" : "any");
  const [steepleZone, setSteepleZone] = React.useState<"inner_single" | "any_single">(saved.steepleZone === "any_single" ? "any_single" : "inner_single");

  const humanProfiles = React.useMemo(() => {
    const raw = Array.isArray(store?.profiles) ? store.profiles : [];
    return raw.filter((p: any) => !isBotLike(p)).map((p: any) => normalizeProfile(p, false));
  }, [store?.profiles]);

  const buildBotPool = React.useCallback(() => {
    const map = new Map<string, any>();
    const officialBots = mode === "crados" ? CRADOS_BOTS : (X01_PRO_BOTS || []);
    officialBots.forEach((b: any) => map.set(String(b.id), normalizeProfile(b, true)));
    // Les BOTS CPU personnels restent disponibles dans CRADOS et dans les autres modes.
    try { loadBotPlayers().forEach((b: any) => map.set(String(b.id), normalizeProfile({ ...b, isUserBot: true, source: b?.source || "cpu", groupLabel: b?.groupLabel || "CPU Home" }, true))); } catch {}
    return [...map.values()];
  }, [mode]);
  const [bots, setBots] = React.useState<any[]>(() => buildBotPool());
  React.useEffect(() => { setBots(buildBotPool()); }, [buildBotPool]);

  const profileById = React.useMemo(() => {
    const map = new Map<string, any>();
    [...humanProfiles, ...bots].forEach((p: any) => map.set(String(p.id), p));
    return map;
  }, [humanProfiles, bots]);

  const selectedProfiles = selectedIds.map((id) => profileById.get(String(id))).filter(Boolean);
  const botCount = selectedProfiles.filter(isBotLike).length;
  const cradosCpuBotCount = mode === "crados" ? selectedProfiles.filter((p: any) => isBotLike(p) && p?.source !== "crados_official").length : botCount;
  const maxReached = selectedProfiles.length >= definition.maxPlayers;

  const storedDartsTeams = React.useMemo(() => {
    if (mode !== "crados") return [];
    try {
      return (loadTeamsBySport("darts") || []).filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0);
    } catch { return []; }
  }, [mode, store?.profiles]);

  const cradosStoredTeamOptions = React.useMemo(() => {
    if (mode !== "crados") return [];
    return storedDartsTeams.map((team: any, index: number) => ({
      ...team,
      id: String(team.id),
      name: String(team.name || `Équipe ${index + 1}`),
      color: team?.color || CRADOS_TEAM_SLOTS[index % CRADOS_TEAM_SLOTS.length].color,
      logoDataUrl: team?.logoDataUrl ?? team?.logoUrl ?? team?.avatarUrl ?? null,
      playerIds: uniqueStrings(team?.playerIds || []).filter((id) => profileById.has(id)),
      isBotTeam: false,
      isCradosFamily: false,
    })).filter((team: any) => team.playerIds.length > 0);
  }, [mode, storedDartsTeams, profileById]);

  const cradosBotTeamOptions = React.useMemo(() => {
    if (mode !== "crados") return [];
    return CRADOS_BOT_TEAMS.map((team: any, index: number) => ({
      ...team,
      id: String(team.id),
      name: `Famille ${team.familyLabel}`,
      color: team.accent || CRADOS_TEAM_SLOTS[index % CRADOS_TEAM_SLOTS.length].color,
      logoDataUrl: team.avatarDataUrl || null,
      logoUrl: team.avatarDataUrl || null,
      playerIds: uniqueStrings(team.memberIds || []).filter((id) => profileById.has(id)),
      isBotTeam: true,
      isCradosFamily: true,
      botTeamLevel: team.botTeamLevel,
    })).filter((team: any) => team.playerIds.length > 0);
  }, [mode, profileById]);

  const cradosSelectedStoredTeams = React.useMemo(() => {
    return (cradosSelectedTeamIds || []).map((rawId: string, index: number) => {
      const baseId = cradosTeamBaseId(rawId);
      const occurrence = (cradosSelectedTeamIds || []).slice(0, index).filter((id) => cradosTeamBaseId(id) === baseId).length;
      const source = cradosStoredTeamOptions.find((team: any) => String(team.id) === baseId) || findRememberedGeneratedTeam(baseId);
      if (!source) return null;
      const suffix = cradosTeamSuffix(occurrence);
      return {
        ...source,
        id: occurrence > 0 ? `${baseId}__slot_${suffix}` : baseId,
        baseTeamId: baseId,
        sourceTeamId: baseId,
        teamSlotLabel: suffix,
        name: source.name,
      };
    }).filter(Boolean);
  }, [cradosSelectedTeamIds, cradosStoredTeamOptions]);

  const cradosSelectedBotTeams = React.useMemo(() => {
    if (!cradosBotTeamsPanelEnabled) return [];
    return (cradosSelectedBotTeamIds || []).map((rawId: string, index: number) => {
      const baseId = cradosTeamBaseId(rawId);
      const occurrence = (cradosSelectedBotTeamIds || []).slice(0, index).filter((id) => cradosTeamBaseId(id) === baseId).length;
      const source = cradosBotTeamOptions.find((team: any) => String(team.id) === baseId);
      if (!source) return null;
      const suffix = cradosTeamSuffix(occurrence);
      return {
        ...source,
        id: occurrence > 0 ? `${baseId}__slot_${suffix}` : baseId,
        baseTeamId: baseId,
        sourceTeamId: baseId,
        teamSlotLabel: suffix,
        name: source.name,
      };
    }).filter(Boolean);
  }, [cradosSelectedBotTeamIds, cradosBotTeamOptions, cradosBotTeamsPanelEnabled]);

  const cradosManualTeams = React.useMemo(() => {
    if (mode !== "crados") return [];
    return CRADOS_TEAM_SLOTS.map((slot) => ({
      ...slot,
      logoDataUrl: null,
      playerIds: selectedIds.filter((id) => cradosNormalizeTeamId(cradosTeamAssignments[String(id)]) === slot.id),
      isBotTeam: false,
      isCradosFamily: false,
    })).filter((team) => team.playerIds.length > 0);
  }, [mode, selectedIds, cradosTeamAssignments]);

  const cradosExternalTeams = React.useMemo(() => {
    const selected = [...cradosSelectedStoredTeams, ...cradosSelectedBotTeams];
    return selected.map((team: any, index: number) => {
      const tid = String(team.id || `crados_saved_${index + 1}`);
      const allIds = uniqueStrings(team.playerIds || []).filter((id) => profileById.has(id));
      const chosen = Array.isArray(cradosSavedTeamMemberSelections[tid])
        ? uniqueStrings(cradosSavedTeamMemberSelections[tid]).filter((id) => allIds.includes(id))
        : allIds;
      return { ...team, id: tid, playerIds: chosen };
    }).filter((team: any) => team.playerIds.length > 0);
  }, [cradosSelectedStoredTeams, cradosSelectedBotTeams, cradosSavedTeamMemberSelections, profileById]);

  // Même logique que X01 : en manuel, les équipes BOTS activées s'ajoutent aux
  // équipes Gold/Pink/Blue/Green ; en enregistré/auto, elles rejoignent les équipes externes.
  const activeCradosTeams = cradosTeamsSourceMode === "manual"
    ? [...cradosManualTeams, ...cradosSelectedBotTeams.map((team: any, index: number) => {
        const tid = String(team.id || `crados_bot_${index + 1}`);
        const allIds = uniqueStrings(team.playerIds || []).filter((id) => profileById.has(id));
        const chosen = Array.isArray(cradosSavedTeamMemberSelections[tid])
          ? uniqueStrings(cradosSavedTeamMemberSelections[tid]).filter((id) => allIds.includes(id))
          : allIds;
        return { ...team, id: tid, playerIds: chosen };
      }).filter((team: any) => team.playerIds.length > 0)]
    : cradosExternalTeams;
  const cradosTeamMemberIds = uniqueStrings((activeCradosTeams || []).flatMap((team: any) => team?.playerIds || []));
  const cradosTeamMemberTotal = (activeCradosTeams || []).reduce((sum: number, team: any) => sum + uniqueStrings(team?.playerIds || []).length, 0);
  const cradosTeamsHaveNoOverlap = cradosTeamMemberTotal === cradosTeamMemberIds.length;
  const cradosTeamsValid = mode === "crados" && cradosParticipantMode === "teams"
    ? activeCradosTeams.length >= 2
      && cradosTeamMemberIds.length >= (cradosTeamsSourceMode === "manual" && cradosSelectedBotTeams.length === 0 ? 4 : 2)
      && cradosTeamMemberIds.length <= definition.maxPlayers
      && cradosTeamsHaveNoOverlap
    : false;
  const cradosTeamsValidationMessage = !activeCradosTeams.length
    ? "Choisis au moins 2 équipes."
    : activeCradosTeams.length < 2
      ? "Choisis au moins 2 équipes."
      : !cradosTeamsHaveNoOverlap
        ? "Un même joueur ne peut pas appartenir à deux équipes dans le même match."
        : cradosTeamMemberIds.length > definition.maxPlayers
          ? `Maximum ${definition.maxPlayers} participants.`
          : cradosTeamsSourceMode === "manual" && cradosSelectedBotTeams.length === 0 && cradosTeamMemberIds.length < 4
            ? "Sélectionne au moins 4 joueurs pour les équipes manuelles."
            : "Chaque équipe doit contenir au moins un joueur.";
  const baseValidSelection = selectedProfiles.length >= definition.minPlayers && selectedProfiles.length <= definition.maxPlayers;
  const validSelection = mode === "crados" && cradosParticipantMode === "teams" ? cradosTeamsValid : baseValidSelection;

  function ensureCradosTeamMembersInitialized(instanceId: string, teamList: any[]) {
    const tid = String(instanceId || "");
    const baseId = cradosTeamBaseId(tid);
    setCradosSavedTeamMemberSelections((prev) => {
      if (Array.isArray(prev[tid])) return prev;
      const team = (teamList || []).find((row: any) => String(row?.id || row?.baseTeamId || "") === baseId) || findRememberedGeneratedTeam(baseId);
      const allIds = uniqueStrings(team?.playerIds || []).filter((id) => profileById.has(id));
      return { ...prev, [tid]: allIds };
    });
  }

  function addCradosStoredTeamSelection(teamId: string, playerIds: string[]) {
    const baseId = String(teamId || "");
    const picked = uniqueStrings(playerIds || []).filter((id) => profileById.has(id));
    if (!baseId || !picked.length) return;
    setCradosSelectedTeamIds((prev) => {
      const same = prev.filter((id) => cradosTeamBaseId(id) === baseId);
      const nextId = same.length ? `${baseId}__slot_${cradosTeamSuffix(same.length)}` : baseId;
      setCradosSavedTeamMemberSelections((old) => ({ ...old, [nextId]: picked }));
      return [...prev, nextId];
    });
  }

  function removeCradosStoredTeamSelection(instanceId: string) {
    const tid = String(instanceId || "");
    setCradosSelectedTeamIds((prev) => prev.filter((id) => String(id) !== tid));
    setCradosSavedTeamMemberSelections((prev) => { const next = { ...prev }; delete next[tid]; return next; });
  }

  function toggleCradosStoredTeam(teamId: string) {
    const baseId = String(teamId || "");
    const team = cradosStoredTeamOptions.find((row: any) => String(row.id) === baseId);
    setCradosSelectedTeamIds((prev) => {
      const same = prev.filter((id) => cradosTeamBaseId(id) === baseId);
      const allIds = uniqueStrings(team?.playerIds || []);
      const used = new Set<string>();
      same.forEach((instanceId) => (cradosSavedTeamMemberSelections[String(instanceId)] || []).forEach((id) => used.add(String(id))));
      if (same.length && allIds.filter((id) => !used.has(id)).length < 1) return prev;
      const nextId = same.length ? `${baseId}__slot_${cradosTeamSuffix(same.length)}` : baseId;
      return [...prev, nextId];
    });
    ensureCradosTeamMembersInitialized(baseId, cradosStoredTeamOptions);
  }

  function addCradosBotTeamSelection(teamId: string, playerIds: string[]) {
    const baseId = String(teamId || "");
    const picked = uniqueStrings(playerIds || []).filter((id) => profileById.has(id));
    if (!baseId || !picked.length) return;
    setCradosSelectedBotTeamIds((prev) => {
      const same = prev.filter((id) => cradosTeamBaseId(id) === baseId);
      const nextId = same.length ? `${baseId}__slot_${cradosTeamSuffix(same.length)}` : baseId;
      setCradosSavedTeamMemberSelections((old) => ({ ...old, [nextId]: picked }));
      return [...prev, nextId];
    });
  }

  function removeCradosBotTeamSelection(instanceId: string) {
    const tid = String(instanceId || "");
    setCradosSelectedBotTeamIds((prev) => prev.filter((id) => String(id) !== tid));
    setCradosSavedTeamMemberSelections((prev) => { const next = { ...prev }; delete next[tid]; return next; });
  }

  function toggleCradosBotTeam(teamId: string) {
    const team = cradosBotTeamOptions.find((row: any) => String(row.id) === String(teamId));
    const first = uniqueStrings(team?.playerIds || [])[0];
    if (first) addCradosBotTeamSelection(String(teamId), [first]);
  }

  function toggleCradosSavedTeamMember(teamId: string, playerId: string) {
    const tid = String(teamId || "");
    const baseId = cradosTeamBaseId(tid);
    const team = cradosStoredTeamOptions.find((row: any) => String(row.id) === baseId)
      || cradosBotTeamOptions.find((row: any) => String(row.id) === baseId)
      || findRememberedGeneratedTeam(baseId);
    const allIds = uniqueStrings(team?.playerIds || []).filter((id) => profileById.has(id));
    setCradosSavedTeamMemberSelections((prev) => {
      const current = Array.isArray(prev[tid]) ? prev[tid] : allIds;
      const pid = String(playerId || "");
      const next = current.includes(pid) ? current.filter((id) => id !== pid) : [...current, pid];
      return { ...prev, [tid]: next };
    });
  }

  // Migration douce : les anciens BOTS Pro X01 mémorisés dans la config CRADOS
  // ne doivent pas survivre au remplacement par les 24 personnages CRADOS.
  React.useEffect(() => {
    if (mode !== "crados") return;
    setSelectedIds((prev) => prev.filter((id) => profileById.has(String(id))));
  }, [mode, profileById]);

  function togglePlayer(idRaw: any) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        setCradosTeamAssignments((map) => { const next = { ...map }; delete next[id]; return next; });
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= definition.maxPlayers) return prev;
      return [...prev, id];
    });
  }

  React.useEffect(() => {
    const snapshot = {
      selectedIds, botsOpen, botLevel, randomOrder, scoreInputMethod, seriesWins,
      castleBricks, castleAssignment, castleAttacks, castleReassignEachLeg,
      gotchaTarget, gotchaOut, gotchaMaxRounds, gotchaBust,
      houndStart, hareTargetZone, hareRoleMode, hareDirection,
      penduPartsToLose, penduChallengeMode, penduTargetFamily, penduExecution,
      menteurLives, menteurContractDeck, menteurRaiseStep, menteurBullAllowed,
      cradosDirtLimit, cradosLayersToOwn, cradosBullWash, cradosStealMode, cradosSectorRaceMode, cradosCleanBullSplash,
      cradosParticipantMode, cradosTeamsSourceMode, cradosTeamAssignments, cradosSelectedTeamIds, cradosSelectedBotTeamIds, cradosSavedTeamMemberSelections, cradosBotTeamsPanelEnabled,
      fiftyOneTarget, fiftyOneRequireThreeScoringDarts, fiftyOneBust,
      looperLives, looperStartTarget, looperNumberLoops, looperSetterShield,
      callThreeRounds, callThreeCaller, callThreeOrderStrict, callThreeBull,
      steepleDirection, steepleFences, steepleFinishBull, steepleZone,
    };
    writeSaved(mode, snapshot);
  }, [mode, selectedIds, botsOpen, botLevel, randomOrder, scoreInputMethod, seriesWins, castleBricks, castleAssignment, castleAttacks, castleReassignEachLeg, gotchaTarget, gotchaOut, gotchaMaxRounds, gotchaBust, houndStart, hareTargetZone, hareRoleMode, hareDirection, penduPartsToLose, penduChallengeMode, penduTargetFamily, penduExecution, menteurLives, menteurContractDeck, menteurRaiseStep, menteurBullAllowed, cradosDirtLimit, cradosLayersToOwn, cradosBullWash, cradosStealMode, cradosSectorRaceMode, cradosCleanBullSplash, cradosParticipantMode, cradosTeamsSourceMode, cradosTeamAssignments, cradosSelectedTeamIds, cradosSelectedBotTeamIds, cradosSavedTeamMemberSelections, cradosBotTeamsPanelEnabled, fiftyOneTarget, fiftyOneRequireThreeScoringDarts, fiftyOneBust, looperLives, looperStartTarget, looperNumberLoops, looperSetterShield, callThreeRounds, callThreeCaller, callThreeOrderStrict, callThreeBull, steepleDirection, steepleFences, steepleFinishBull, steepleZone]);

  function selectView(value: ConfigViewMode) {
    setViewMode(value);
    if (mode === "crados") setViewModeChosen(true);
    try { localStorage.setItem(`dc_${mode}_config_view_mode`, value); } catch {}
  }

  function backToGames() {
    if (typeof props?.params?.onBack === "function") return props.params.onBack();
    if (typeof go === "function") return go("games", { gamesView: "all" });
    window.history.back();
  }

  function modeRulesPayload() {
    if (mode === "castle") return { targetBricks: castleBricks, numberAssignment: castleAssignment, attacksEnabled: castleAttacks, reassignEachLeg: castleReassignEachLeg };
    if (mode === "gotcha") return { targetScore: gotchaTarget, outMode: gotchaOut, maxRounds: gotchaMaxRounds, bustRule: gotchaBust, gotchaReset: "zero" };
    if (mode === "hare_hounds") return { houndStart, targetZone: hareTargetZone, roleMode: hareRoleMode, direction: hareDirection, hareStart: 20 };
    if (mode === "pendu") return { partsToLose: penduPartsToLose, challengeMode: penduChallengeMode, targetFamily: penduTargetFamily, executionMode: penduExecution };
    if (mode === "menteur") return { lives: menteurLives, contractDeck: menteurContractDeck, raiseStep: menteurRaiseStep, bullAllowed: menteurBullAllowed };
    if (mode === "crados") return { dirtLimit: cradosDirtLimit, layersToOwn: cradosLayersToOwn, bullWash: cradosBullWash, stealMode: cradosStealMode, sectorRaceMode: cradosSectorRaceMode, cleanBullSplash: cradosCleanBullSplash };
    if (mode === "fifty_one_by_five") return { target: fiftyOneTarget, divisor: 5, requireThreeScoringDarts: fiftyOneRequireThreeScoringDarts, bustRule: fiftyOneBust, exactFinish: true };
    if (mode === "looper") return { lives: looperLives, startTarget: looperStartTarget, exactSegment: true, numberLoopsEnabled: looperNumberLoops, setterShield: looperSetterShield };
    if (mode === "call_three") return { rounds: callThreeRounds, callerMode: callThreeCaller, orderedTargets: callThreeOrderStrict, bullAllowed: callThreeBull, multiplierScoring: true };
    return { direction: steepleDirection, innerSingleOnly: steepleZone === "inner_single", fencesEnabled: steepleFences, fences: [13, 17, 8, 5], finishBull: steepleFinishBull };
  }

  function start() {
    if (!validSelection || typeof go !== "function") return;
    let teams: any[] = [];
    let resolvedIds = selectedProfiles.map((p: any) => String(p.id));
    if (mode === "crados" && cradosParticipantMode === "teams") {
      const configuredTeams = (activeCradosTeams || []).map((team: any, index: number) => ({
        id: String(team.id || `crados_team_${index + 1}`),
        name: String(team.name || `Équipe ${index + 1}`),
        color: team.color || CRADOS_TEAM_SLOTS[index % CRADOS_TEAM_SLOTS.length].color,
        logoDataUrl: team.logoDataUrl ?? team.logoUrl ?? null,
        playerIds: uniqueStrings(team.playerIds || []).filter((id) => profileById.has(id)),
        isBotTeam: Boolean(team.isBotTeam),
        isCradosFamily: Boolean(team.isCradosFamily),
      }));
      // L'ordre aléatoire porte aussi sur les équipes et l'ordre interne des membres,
      // sinon le moteur équipe conserverait toujours la même rotation.
      teams = randomOrder
        ? shuffleCopy(configuredTeams).map((team: any) => ({ ...team, playerIds: shuffleCopy(team.playerIds || []) }))
        : configuredTeams;
      resolvedIds = interleaveCradosTeamIds(teams, false);
    }
    const orderedIds = mode === "crados" && cradosParticipantMode === "teams"
      ? resolvedIds
      : (randomOrder ? shuffleCopy(resolvedIds) : [...resolvedIds]);
    const playersList = orderedIds.map((id) => profileById.get(String(id))).filter(Boolean).map((p: any) => ({ ...p, id: String(p.id), name: p?.name || p?.displayName || "Joueur" }));
    const payload = {
      mode,
      selectedIds: orderedIds,
      players: orderedIds.length,
      playersList,
      botIds: playersList.filter(isBotLike).map((p: any) => String(p.id)),
      botsEnabled: playersList.some(isBotLike),
      botLevel,
      randomOrder,
      scoreInputMethod,
      seriesWins,
      rules: modeRulesPayload(),
      ...(mode === "crados" ? {
        participantMode: cradosParticipantMode,
        gameMode: cradosParticipantMode === "teams" ? "teams" : "players",
        teamsSourceMode: cradosParticipantMode === "teams" ? cradosTeamsSourceMode : undefined,
        teams: cradosParticipantMode === "teams" ? teams : undefined,
        familyTeamIds: cradosParticipantMode === "teams"
          ? teams.filter((team: any) => team.isCradosFamily || String(team.id).startsWith("bot_team_crados_")).map((team: any) => String(team.id))
          : [],
      } : {}),
      menuVersion: 3,
    };
    try { recordProfileUsageForMode(mode, orderedIds); } catch {}
    go(definition.playTab, { config: payload });
  }

  const selectorCard: React.CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", overflow: "hidden", background: "rgba(10,12,24,.96)", borderRadius: 18, padding: "15px 12px", marginBottom: 12, boxShadow: "0 16px 40px rgba(0,0,0,.55)", border: `1px solid ${accent}33` };
  const panel: React.CSSProperties = { borderRadius: 16, padding: 11, background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.24))", border: "1px solid rgba(255,255,255,.09)" };

  const cradosTeamMode = mode === "crados" && cradosParticipantMode === "teams";
  const cradosSelectableTeamProfiles = React.useMemo(() => {
    const map = new Map<string, any>();
    [...humanProfiles, ...bots].forEach((profile: any) => map.set(String(profile.id), profile));
    return [...map.values()];
  }, [humanProfiles, bots]);

  function setCradosPlayerTeam(playerId: string, teamId: string) {
    const pid = String(playerId || "");
    const tid = cradosNormalizeTeamId(teamId);
    if (!pid || !tid) return;
    setCradosTeamAssignments((prev) => ({ ...prev, [pid]: cradosNormalizeTeamId(prev[pid]) === tid ? "" : tid }));
  }

  const cradosModeChoiceBlock = mode === "crados" ? <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 8 }}>Type de partie</div>
    <div style={{ color: soft, fontSize: 11.5, lineHeight: 1.4, marginBottom: 12 }}>Comme dans X01, choisis d'abord si la partie se joue avec des profils individuels ou avec des équipes.</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginBottom: 14 }}>
      <button type="button" onClick={() => { setCradosParticipantMode("players"); setCradosTeamError(""); }} style={{ borderRadius: 18, border: `1px solid ${!cradosTeamMode ? accent : "rgba(255,255,255,.10)"}`, background: !cradosTeamMode ? `${accent}20` : "rgba(255,255,255,.035)", color: "#fff", padding: 14, textAlign: "left", cursor: "pointer" }}>
        <div style={{ color: accent, fontWeight: 950, fontSize: 18 }}>Joueurs</div>
        <div style={{ color: soft, fontSize: 12, marginTop: 4 }}>2 à {definition.maxPlayers} profils, humains ou BOTS.</div>
      </button>
      <button type="button" onClick={() => { setCradosParticipantMode("teams"); setCradosTeamError(""); }} style={{ borderRadius: 18, border: `1px solid ${cradosTeamMode ? accent : "rgba(255,255,255,.10)"}`, background: cradosTeamMode ? `${accent}20` : "rgba(255,255,255,.035)", color: "#fff", padding: 14, textAlign: "left", cursor: "pointer" }}>
        <div style={{ color: accent, fontWeight: 950, fontSize: 18 }}>Équipes</div>
        <div style={{ color: soft, fontSize: 12, marginTop: 4 }}>Manuel, équipes enregistrées ou brassage automatique.</div>
      </button>
    </div>
    {cradosTeamMode ? <div>
      <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 7 }}>Source des équipes</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <PillButton label="Manuel" active={cradosTeamsSourceMode === "manual"} onClick={() => setCradosTeamsSourceMode("manual")} primary={accent} primarySoft={`${accent}18`} />
        <PillButton label="Équipes enregistrées" active={cradosTeamsSourceMode === "saved"} onClick={() => setCradosTeamsSourceMode("saved")} primary={accent} primarySoft={`${accent}18`} />
        <PillButton label="Brassage auto" active={cradosTeamsSourceMode === "auto"} onClick={() => setCradosTeamsSourceMode("auto")} primary={accent} primarySoft={`${accent}18`} />
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: "#8f94b5" }}>Même logique que X01 : Gold/Pink/Blue/Green en manuel, équipes sauvegardées, ou génération automatique.</div>
    </div> : null}
  </section> : null;

  // Vue complète : même présentation que X01 (onglets Joueurs / Équipes, puis source).
  // La vue guidée conserve les deux grandes cartes de l'étape 1, également calées sur X01.
  const cradosCompleteModeChoiceBlock = mode === "crados" ? <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Participants</div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: cradosTeamMode ? 14 : 0 }}>
      <PillButton label="Joueurs" active={!cradosTeamMode} onClick={() => { setCradosParticipantMode("players"); setCradosTeamError(""); }} primary={accent} primarySoft={`${accent}18`} />
      <PillButton label="Équipes" active={cradosTeamMode} onClick={() => { setCradosParticipantMode("teams"); setCradosTeamError(""); }} primary={accent} primarySoft={`${accent}18`} />
    </div>
    {cradosTeamMode ? <div>
      <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 7 }}>Source des équipes</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <PillButton label="Manuel" active={cradosTeamsSourceMode === "manual"} onClick={() => setCradosTeamsSourceMode("manual")} primary={accent} primarySoft={`${accent}18`} />
        <PillButton label="Équipes enregistrées" active={cradosTeamsSourceMode === "saved"} onClick={() => setCradosTeamsSourceMode("saved")} primary={accent} primarySoft={`${accent}18`} />
        <PillButton label="Brassage auto" active={cradosTeamsSourceMode === "auto"} onClick={() => setCradosTeamsSourceMode("auto")} primary={accent} primarySoft={`${accent}18`} />
      </div>
    </div> : null}
  </section> : null;

  const playerParticipantsBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>{mode === "crados" ? "Joueurs" : "Participants"}</div>
    {mode === "crados" && selectedProfiles.length ? <SelectedParticipantsCompactBlock items={selectedProfiles} accent={accent} onRemove={(id: string) => togglePlayer(id)} allProfiles={[...humanProfiles, ...bots]} /> : null}
    <PlayerPagedSelector usageMode={mode} profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary={false} />
    <div style={{ marginTop: 12, paddingTop: 11, borderTop: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: botsOpen ? 9 : 0 }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 900, color: accent }}>Bots IA</div>
        <Pill active={botsOpen} onClick={() => setBotsOpen((v) => !v)} accent={accent}>{botsOpen ? "ON" : "OFF"}</Pill>
      </div>
      {botsOpen ? <BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} label={mode === "crados" ? "BOTS CRADOS + CPU" : "BOTS IA"} modalTitle={mode === "crados" ? "Choisir les BOTS CRADOS" : "Choisir des BOTS IA"} showCheckbox={false} showSelectedSummary={false} /> : null}
      {(mode === "crados" ? cradosCpuBotCount > 0 : botCount > 0) && botsOpen ? <div style={{ marginTop: 10 }}><OptionRow label={mode === "crados" ? "Secours difficulté BOTS CPU" : "Difficulté IA"}><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow></div> : null}
    </div>
    <div style={{ marginTop: 10, color: validSelection ? accent : "#ff9baa", fontSize: 11.5, fontWeight: 900 }}>{validSelection ? `${selectedProfiles.length} participant${selectedProfiles.length > 1 ? "s" : ""} sélectionné${selectedProfiles.length > 1 ? "s" : ""}` : `Sélectionne ${definition.minPlayers} à ${definition.maxPlayers} participants.`}</div>
    {maxReached ? <div style={{ marginTop: 6, color: soft, fontSize: 10.5 }}>Maximum atteint : {definition.maxPlayers} participants.</div> : null}
  </section>;

  const cradosTeamsBlock = mode === "crados" ? <>
    <TeamsSection
      profiles={cradosSelectableTeamProfiles as any}
      selectableProfiles={humanProfiles as any}
      selectedIds={selectedIds}
      teamAssignments={cradosTeamAssignments as any}
      setPlayerTeam={setCradosPlayerTeam as any}
      togglePlayer={togglePlayer}
      allProfiles={cradosSelectableTeamProfiles as any}
      sourceMode={cradosTeamsSourceMode as any}
      setSourceMode={(value: any) => { setCradosTeamsSourceMode(value); setCradosTeamError(""); }}
      storedTeams={cradosStoredTeamOptions as any}
      selectedStoredTeamIds={cradosSelectedTeamIds}
      toggleStoredTeam={toggleCradosStoredTeam}
      addStoredTeamSelection={addCradosStoredTeamSelection}
      removeStoredTeamSelection={removeCradosStoredTeamSelection}
      botTeams={cradosBotTeamOptions}
      botTeamsPanelEnabled={cradosBotTeamsPanelEnabled}
      setBotTeamsPanelEnabled={setCradosBotTeamsPanelEnabled}
      selectedBotTeamIds={cradosSelectedBotTeamIds}
      toggleBotTeam={toggleCradosBotTeam}
      addBotTeamSelection={addCradosBotTeamSelection}
      removeBotTeamSelection={removeCradosBotTeamSelection}
      savedTeamMemberSelections={cradosSavedTeamMemberSelections}
      toggleSavedTeamMember={toggleCradosSavedTeamMember}
      allowSaveGeneratedTeams={true}
      primary={accent}
      primarySoft={`${accent}18`}
    />
    {cradosTeamsSourceMode !== "auto" ? <BotTeamsSection
      botTeams={cradosBotTeamOptions}
      selectedBotTeamIds={cradosSelectedBotTeamIds}
      toggleBotTeam={toggleCradosBotTeam}
      addBotTeamSelection={addCradosBotTeamSelection}
      removeBotTeamSelection={removeCradosBotTeamSelection}
      botTeamsPanelEnabled={cradosBotTeamsPanelEnabled}
      setBotTeamsPanelEnabled={setCradosBotTeamsPanelEnabled}
      profiles={cradosSelectableTeamProfiles}
      savedTeamMemberSelections={cradosSavedTeamMemberSelections}
      toggleSavedTeamMember={toggleCradosSavedTeamMember}
      primary={accent}
      primarySoft={`${accent}18`}
    /> : null}
    <section style={{ ...selectorCard, paddingTop: 10, paddingBottom: 10 }}>
      {cradosTeamError ? <div style={{ color: "#ff9baa", fontSize: 10.8, fontWeight: 900, marginBottom: 5 }}>{cradosTeamError}</div> : null}
      <div style={{ color: cradosTeamsValid ? accent : "#ff9baa", fontSize: 10.8, fontWeight: 900 }}>{cradosTeamsValid ? `${activeCradosTeams.length} équipes · ${cradosTeamMemberIds.length} participants · prêt à jouer` : cradosTeamsValidationMessage}</div>
    </section>
  </> : null;

  const participantsBlock = mode === "crados" ? (cradosTeamMode ? cradosTeamsBlock : playerParticipantsBlock) : playerParticipantsBlock;
  const cradosOrderBlock = mode === "crados" ? <section style={{ ...selectorCard, padding: "9px 10px" }}>
    <OptionRow compact label="Ordre de passage aléatoire" hint="Mélange les participants au lancement"><OptionToggle compact value={randomOrder} onChange={setRandomOrder} /></OptionRow>
  </section> : null;

  const matchBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Format de match</div>
    <div style={panel}>
      <OptionRow compact={mode === "crados"} label="Série"><OptionSelect compact={mode === "crados"} value={seriesWins} options={[{ value: 1, label: "BO1 — 1 victoire" }, { value: 2, label: "BO3 — 2 victoires" }, { value: 3, label: "BO5 — 3 victoires" }]} onChange={(v: any) => setSeriesWins(Number(v) as any)} /></OptionRow>
      {mode !== "crados" ? <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow> : null}
    </div>
  </section>;

  const castleBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles CASTLE</div>
    <div style={panel}>
      <OptionRow label="Taille du château"><OptionSelect value={castleBricks} options={[{ value: 10, label: "10 briques — rapide" }, { value: 15, label: "15 briques — classique" }, { value: 20, label: "20 briques — endurance" }]} onChange={(v: any) => setCastleBricks(Number(v))} /></OptionRow>
      <OptionRow label="Attribution des numéros"><OptionSelect value={castleAssignment} options={[{ value: "random", label: "Aléatoire unique" }, { value: "offhand", label: "Lancer main opposée" }]} onChange={setCastleAssignment} /></OptionRow>
      <OptionRow label="Attaque des châteaux adverses"><OptionToggle value={castleAttacks} onChange={setCastleAttacks} /></OptionRow>
      <OptionRow label="Nouveaux numéros à chaque manche"><OptionToggle value={castleReassignEachLeg} onChange={setCastleReassignEachLeg} /></OptionRow>
    </div>
  </section>;

  const gotchaBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles GOTCHA</div>
    <div style={panel}>
      <OptionRow label="Score cible"><OptionSelect value={gotchaTarget} options={[201,301,401,501,601,701]} onChange={(v: any) => setGotchaTarget(Number(v))} /></OptionRow>
      <OptionRow label="Sortie"><OptionSelect value={gotchaOut} options={[{ value: "straight", label: "Straight — n'importe quelle zone" }, { value: "double", label: "Double Out" }, { value: "master", label: "Master Out — D ou T" }]} onChange={setGotchaOut} /></OptionRow>
      <OptionRow label="Limite de rounds"><OptionSelect value={gotchaMaxRounds} options={[{ value: 0, label: "Illimitée" }, { value: 15, label: "15 rounds" }, { value: 20, label: "20 rounds" }, { value: 50, label: "50 rounds" }, { value: 80, label: "80 rounds" }]} onChange={(v: any) => setGotchaMaxRounds(Number(v))} /></OptionRow>
      <OptionRow label="Bust au-dessus de la cible"><OptionSelect value={gotchaBust} options={[{ value: "turn", label: "Retour au début de la volée" }, { value: "zero", label: "Hardcore — retour à 0" }]} onChange={setGotchaBust} /></OptionRow>
    </div>
    <div style={{ marginTop: 9, color: soft, fontSize: 10.7, lineHeight: 1.45 }}>GOTCHA reste actif : égaler exactement le total d'un adversaire le renvoie à 0.</div>
  </section>;

  const hareBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles HARE & HOUNDS</div>
    <div style={panel}>
      <OptionRow label="Départ du Lièvre"><OptionSelect value={20} options={[{ value: 20, label: "20 — classique" }]} onChange={() => {}} /></OptionRow>
      <OptionRow label="Départ du/des Limier(s)"><OptionSelect value={houndStart} options={[{ value: 5, label: "5 — poursuite serrée" }, { value: 12, label: "12 — avance du Lièvre" }]} onChange={(v: any) => setHoundStart(Number(v) === 12 ? 12 : 5)} /></OptionRow>
      <OptionRow label="Zone valide"><OptionSelect value={hareTargetZone} options={[{ value: "any", label: "Toute la tranche S/D/T" }, { value: "double", label: "Doubles uniquement" }, { value: "triple", label: "Triples uniquement" }]} onChange={setHareTargetZone} /></OptionRow>
      <OptionRow label="Attribution du Lièvre"><OptionSelect value={hareRoleMode} options={[{ value: "first", label: "1er joueur sélectionné" }, { value: "random", label: "Aléatoire" }, { value: "rotate", label: "Rotation à chaque manche" }]} onChange={setHareRoleMode} /></OptionRow>
      <OptionRow label="Sens de poursuite"><OptionSelect value={hareDirection} options={[{ value: "clockwise", label: "Horaire — classique" }, { value: "counter", label: "Anti-horaire — variante" }]} onChange={setHareDirection} /></OptionRow>
    </div>
  </section>;

  const penduBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles PENDU</div>
    <div style={panel}>
      <OptionRow label="Erreurs avant élimination"><OptionSelect value={penduPartsToLose} options={[{ value: 6, label: "6 parties — pendu classique" }, { value: 8, label: "8 parties — version longue" }]} onChange={(v: any) => setPenduPartsToLose(Number(v) === 8 ? 8 : 6)} /></OptionRow>
      <OptionRow label="Création des défis"><OptionSelect value={penduChallengeMode} options={[{ value: "caller", label: "Annonce libre par le joueur actif" }, { value: "random", label: "Défi tiré au hasard" }, { value: "mixed", label: "Mixte — libre + aléatoire" }]} onChange={setPenduChallengeMode} /></OptionRow>
      <OptionRow label="Famille de défis"><OptionSelect value={penduTargetFamily} options={[{ value: "segments", label: "Segments exacts" }, { value: "scores", label: "Scores / objectifs" }, { value: "mixed", label: "Mixte" }]} onChange={setPenduTargetFamily} /></OptionRow>
      <OptionRow label="Validation"><OptionSelect value={penduExecution} options={[{ value: "strict", label: "Stricte — défi exact" }, { value: "flex", label: "Souple — défi ou mieux" }]} onChange={setPenduExecution} /></OptionRow>
    </div>
  </section>;

  const menteurBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles MENTEUR</div>
    <div style={panel}>
      <OptionRow label="Vies"><OptionSelect value={menteurLives} options={[3,5,7]} onChange={(v: any) => setMenteurLives(Number(v) === 3 ? 3 : Number(v) === 7 ? 7 : 5)} /></OptionRow>
      <OptionRow label="Contrats"><OptionSelect value={menteurContractDeck} options={[{ value: "score", label: "Scores uniquement" }, { value: "mixed", label: "Mixte — scores + zones" }, { value: "advanced", label: "Avancé — inclut combos / checkout" }]} onChange={setMenteurContractDeck} /></OptionRow>
      <OptionRow label="Pas minimal de surenchère"><OptionSelect value={menteurRaiseStep} options={[5,10,20]} onChange={(v: any) => setMenteurRaiseStep(Number(v) === 10 ? 10 : Number(v) === 20 ? 20 : 5)} /></OptionRow>
      <OptionRow label="Bull autorisé dans les annonces"><OptionToggle value={menteurBullAllowed} onChange={setMenteurBullAllowed} /></OptionRow>
    </div>
  </section>;

  const cradosBlock = <section style={{ ...selectorCard, padding: "11px 10px" }}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 11.2, fontWeight: 950, marginBottom: 7 }}>Règles CRADOS</div>
    <div style={{ ...panel, padding: 7, display: "grid", gap: 5 }}>
      <OptionRow compact label="Jauge de crasse"><OptionSelect compact value={cradosDirtLimit} options={[10,15,20]} onChange={(v: any) => setCradosDirtLimit(Number(v) === 15 ? 15 : Number(v) === 20 ? 20 : 10)} /></OptionRow>
      <OptionRow compact label="Couches / secteur"><OptionSelect compact value={cradosLayersToOwn} options={[{ value: 2, label: "2 — rapide" }, { value: 3, label: "3 — classique" }, { value: 4, label: "4 — endurance" }]} onChange={(v: any) => setCradosLayersToOwn(Number(v) === 2 ? 2 : Number(v) === 4 ? 4 : 3)} /></OptionRow>
      <OptionRow compact label="Bull douche"><OptionToggle compact value={cradosBullWash} onChange={setCradosBullWash} /></OptionRow>
      <OptionRow compact label="Bull propre contagieux"><OptionToggle compact value={cradosCleanBullSplash} onChange={setCradosCleanBullSplash} /></OptionRow>
      <OptionRow compact label="Secteur vierge"><OptionSelect compact value={cradosSectorRaceMode} options={[{ value: "claim", label: "Prise en main — le dernier efface l’autre" }, { value: "race", label: "Course — toutes les touches comptent" }]} onChange={setCradosSectorRaceMode} /></OptionRow>
      <OptionRow compact label="Secteur adverse"><OptionSelect compact value={cradosStealMode} options={[{ value: "block", label: "Blocage" }, { value: "flip", label: "Vol" }]} onChange={setCradosStealMode} /></OptionRow>
    </div>
  </section>;

  const cradosDirtBlock = <section style={{ ...selectorCard, padding: "11px 10px" }}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 11.2, fontWeight: 950, marginBottom: 7 }}>Crasse & nettoyage</div>
    <div style={{ ...panel, padding: 7, display: "grid", gap: 5 }}>
      <OptionRow compact label="Jauge de crasse" hint="À 100 %, le joueur ou l’équipe est éliminé."><OptionSelect compact value={cradosDirtLimit} options={[10,15,20]} onChange={(v: any) => setCradosDirtLimit(Number(v) === 15 ? 15 : Number(v) === 20 ? 20 : 10)} /></OptionRow>
      <OptionRow compact label="Bull douche" hint="BULL −1 · DBULL −3"><OptionToggle compact value={cradosBullWash} onChange={setCradosBullWash} /></OptionRow>
      <OptionRow compact label="Bull propre contagieux" hint="Si tu es totalement propre, un BULL / DBULL salit tous les autres."><OptionToggle compact value={cradosCleanBullSplash} onChange={setCradosCleanBullSplash} /></OptionRow>
    </div>
  </section>;

  const cradosZonesBlock = <section style={{ ...selectorCard, padding: "11px 10px" }}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 11.2, fontWeight: 950, marginBottom: 7 }}>Zones & contamination</div>
    <div style={{ ...panel, padding: 7, display: "grid", gap: 5 }}>
      <OptionRow compact label="Couches / secteur"><OptionSelect compact value={cradosLayersToOwn} options={[{ value: 2, label: "2 — rapide" }, { value: 3, label: "3 — classique" }, { value: 4, label: "4 — endurance" }]} onChange={(v: any) => setCradosLayersToOwn(Number(v) === 2 ? 2 : Number(v) === 4 ? 4 : 3)} /></OptionRow>
      <OptionRow compact label="Secteur vierge"><OptionSelect compact value={cradosSectorRaceMode} options={[{ value: "claim", label: "Prise en main" }, { value: "race", label: "Course au secteur" }]} onChange={setCradosSectorRaceMode} /></OptionRow>
      <OptionRow compact label="Secteur adverse"><OptionSelect compact value={cradosStealMode} options={[{ value: "block", label: "Blocage" }, { value: "flip", label: "Vol" }]} onChange={setCradosStealMode} /></OptionRow>
    </div>
  </section>;

  const fiftyOneBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles 51 BY 5</div>
    <div style={panel}>
      <OptionRow label="Objectif"><OptionSelect value={fiftyOneTarget} options={[{ value: 31, label: "31 — express" }, { value: 51, label: "51 — classique" }, { value: 71, label: "71 — long" }, { value: 101, label: "101 — endurance" }]} onChange={(v: any) => setFiftyOneTarget(Number(v) as any)} /></OptionRow>
      <OptionRow label="3 fléchettes doivent scorer"><OptionToggle value={fiftyOneRequireThreeScoringDarts} onChange={setFiftyOneRequireThreeScoringDarts} /></OptionRow>
      <OptionRow label="Dépassement de l'objectif"><OptionSelect value={fiftyOneBust} options={[{ value: "hold", label: "Bust — score du tour annulé" }, { value: "zero", label: "Hardcore — retour à 0" }]} onChange={setFiftyOneBust} /></OptionRow>
    </div>
    <div style={{ marginTop: 9, color: soft, fontSize: 10.7, lineHeight: 1.45 }}>La somme de la volée doit être divisible par 5. Le quotient devient le score de la volée.</div>
  </section>;

  const looperBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles LOOPER</div>
    <div style={panel}>
      <OptionRow label="Vies"><OptionSelect value={looperLives} options={[3,4,5]} onChange={(v: any) => setLooperLives(Number(v) === 3 ? 3 : Number(v) === 4 ? 4 : 5)} /></OptionRow>
      <OptionRow label="Première cible"><OptionSelect value={looperStartTarget} options={[{ value: "offhand", label: "Lancer main opposée — classique" }, { value: "random", label: "Cible aléatoire" }]} onChange={setLooperStartTarget} /></OptionRow>
      <OptionRow label="Boucles des chiffres actives"><OptionToggle value={looperNumberLoops} onChange={setLooperNumberLoops} /></OptionRow>
      <OptionRow label="Poseur protégé si le tour revient"><OptionToggle value={looperSetterShield} onChange={setLooperSetterShield} /></OptionRow>
    </div>
    <div style={{ marginTop: 9, color: soft, fontSize: 10.7, lineHeight: 1.45 }}>Le segment doit être touché exactement : simple intérieur/extérieur, double, triple, bull ou boucle fermée d'un chiffre si activée.</div>
  </section>;

  const callThreeBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles CALL THREE</div>
    <div style={panel}>
      <OptionRow label="Nombre de rounds"><OptionSelect value={callThreeRounds} options={[5,10,15]} onChange={(v: any) => setCallThreeRounds(Number(v) === 5 ? 5 : Number(v) === 15 ? 15 : 10)} /></OptionRow>
      <OptionRow label="Qui appelle les 3 cibles ?"><OptionSelect value={callThreeCaller} options={[{ value: "next", label: "Joueur suivant — classique" }, { value: "random", label: "Application — aléatoire" }]} onChange={setCallThreeCaller} /></OptionRow>
      <OptionRow label="Ordre des 3 cibles obligatoire"><OptionToggle value={callThreeOrderStrict} onChange={setCallThreeOrderStrict} /></OptionRow>
      <OptionRow label="Bull autorisé"><OptionToggle value={callThreeBull} onChange={setCallThreeBull} /></OptionRow>
    </div>
    <div style={{ marginTop: 9, color: soft, fontSize: 10.7, lineHeight: 1.45 }}>Simple = 1 point, Double = 2, Triple = 3 · Bull extérieur = 2 · DBULL = 3. Chaque fléchette correspond à la cible appelée au même rang ; égalité finale = round supplémentaire.</div>
  </section>;

  const steeplechaseBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles STEEPLECHASE</div>
    <div style={panel}>
      <OptionRow label="Sens du parcours"><OptionSelect value={steepleDirection} options={[{ value: "clockwise", label: "Horaire — classique" }, { value: "counter", label: "Anti-horaire — variante" }]} onChange={setSteepleDirection} /></OptionRow>
      <OptionRow label="Zone normale"><OptionSelect value={steepleZone} options={[{ value: "inner_single", label: "Petit simple intérieur — classique" }, { value: "any_single", label: "Tout simple — accessible" }]} onChange={setSteepleZone} /></OptionRow>
      <OptionRow label="Haies T13 / T17 / T8 / T5"><OptionToggle value={steepleFences} onChange={setSteepleFences} /></OptionRow>
      <OptionRow label="Arrivée Bull"><OptionSelect value={steepleFinishBull} options={[{ value: "any", label: "SBULL ou DBULL" }, { value: "double", label: "DBULL uniquement" }]} onChange={setSteepleFinishBull} /></OptionRow>
    </div>
  </section>;

  const inputBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Saisie</div>
    <OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "KEYPAD" }, { value: "dartboard", label: "CIBLE INTERACTIVE" }]} onChange={setScoreInputMethod} /></OptionRow>
  </section>;

  const boLabel = seriesWins === 1 ? "BO1" : seriesWins === 2 ? "BO3" : "BO5";
  const summaryBlock = <section style={{ ...selectorCard, border: `1px solid ${validSelection ? accent + "66" : "rgba(255,120,150,.30)"}` }}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Résumé</div>
    <div style={{ ...panel, display: "grid", gap: 8 }}>
      <SummaryLine label="Mode" value={definition.title} />
      <SummaryLine label="Participants" value={mode === "crados" && cradosTeamMode ? `${activeCradosTeams.length} équipes · ${cradosTeamMemberIds.length} joueurs` : `${selectedIds.length} / ${definition.maxPlayers}${botCount ? ` · ${botCount} BOT${botCount > 1 ? "S" : ""}` : ""}`} />
      <SummaryLine label="Format" value={boLabel} />
      <SummaryLine label="Saisie" value={scoreInputMethod === "dartboard" ? "Cible interactive" : "Keypad"} />
      {mode === "castle" ? <><SummaryLine label="Objectif" value={`${castleBricks} briques`} /><SummaryLine label="Combat" value={castleAttacks ? "Construction + attaque" : "Construction seule"} /></> : null}
      {mode === "gotcha" ? <><SummaryLine label="Cible" value={gotchaTarget} /><SummaryLine label="Sortie" value={gotchaOut === "straight" ? "Straight" : gotchaOut === "double" ? "Double" : "Master"} /></> : null}
      {mode === "hare_hounds" ? <><SummaryLine label="Départs" value={`Lièvre 20 · Limier ${houndStart}`} /><SummaryLine label="Zone" value={hareTargetZone === "any" ? "S/D/T" : hareTargetZone === "double" ? "Doubles" : "Triples"} /></> : null}
      {mode === "pendu" ? <><SummaryLine label="Élimination" value={`${penduPartsToLose} erreurs`} /><SummaryLine label="Défis" value={penduTargetFamily === "segments" ? "Segments" : penduTargetFamily === "scores" ? "Scores" : "Mixte"} /></> : null}
      {mode === "menteur" ? <><SummaryLine label="Vies" value={`${menteurLives}`} /><SummaryLine label="Contrats" value={menteurContractDeck === "score" ? "Scores" : menteurContractDeck === "mixed" ? "Mixte" : "Avancé"} /></> : null}
      {mode === "crados" ? <><SummaryLine label="Type de partie" value={cradosTeamMode ? "Équipes" : "Joueurs"} />{cradosTeamMode ? <SummaryLine label="Composition" value={cradosTeamsSourceMode === "saved" ? "Équipes créées / familles IA" : cradosTeamsSourceMode === "auto" ? "Brassage automatique" : "Manuelle"} /> : null}<SummaryLine label="Crasse max" value={`${cradosDirtLimit}`} /><SummaryLine label="Contamination" value={`${cradosLayersToOwn} couche${cradosLayersToOwn > 1 ? "s" : ""} / secteur`} /><SummaryLine label="Secteur vierge" value={cradosSectorRaceMode === "race" ? "Course — toutes les touches comptent" : "Prise en main — le dernier efface l’autre"} /><SummaryLine label="Bull spécial" value={cradosCleanBullSplash ? "Bull propre contagieux" : "Standard"} /></> : null}
      {mode === "fifty_one_by_five" ? <><SummaryLine label="Objectif" value={`${fiftyOneTarget}`} /><SummaryLine label="Calcul" value="Total ÷ 5 si divisible" /></> : null}
      {mode === "looper" ? <><SummaryLine label="Vies" value={`${looperLives}`} /><SummaryLine label="Cible" value="Segment exact" /></> : null}
      {mode === "call_three" ? <><SummaryLine label="Rounds" value={`${callThreeRounds}`} /><SummaryLine label="Appel" value={callThreeCaller === "next" ? "Joueur suivant" : "Aléatoire"} /></> : null}
      {mode === "steeplechase" ? <><SummaryLine label="Parcours" value={steepleDirection === "clockwise" ? "Horaire" : "Anti-horaire"} /><SummaryLine label="Haies" value={steepleFences ? "T13 · T17 · T8 · T5" : "Désactivées"} /></> : null}
    </div>
    {!validSelection ? <div style={{ marginTop: 10, color: "#ff9baa", fontSize: 11.5, fontWeight: 900, textAlign: "center" }}>Sélectionne au moins {definition.minPlayers} participants pour continuer.</div> : null}
  </section>;

  const modeBlock = mode === "castle" ? castleBlock
    : mode === "gotcha" ? gotchaBlock
    : mode === "hare_hounds" ? hareBlock
    : mode === "pendu" ? penduBlock
    : mode === "menteur" ? menteurBlock
    : mode === "crados" ? cradosBlock
    : mode === "fifty_one_by_five" ? fiftyOneBlock
    : mode === "looper" ? looperBlock
    : mode === "call_three" ? callThreeBlock
    : steeplechaseBlock;
  const steps = mode === "crados"
    ? ["Mode", cradosTeamMode ? "Équipes" : "Joueurs", "Crasse", "Zones", "Format", "Saisie", "Résumé"]
    : definition.guidedSteps;
  const maxStep = steps.length - 1;
  React.useEffect(() => {
    setGuidedStep((step) => Math.max(0, Math.min(step, maxStep)));
  }, [maxStep]);
  const goGuidedStep = React.useCallback((step: number) => {
    setGuidedStep(Math.max(0, Math.min(step, maxStep)));
    window.requestAnimationFrame(() => {
      try { configScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" }); } catch {}
    });
  }, [maxStep]);

  return <div ref={configScrollRef} className="msc-new-darts-config" style={{ height: "100dvh", minHeight: "100dvh", width: "100%", maxWidth: "100%", overflowX: "hidden", overflowY: "auto", WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehaviorY: "contain", paddingBottom: 92, boxSizing: "border-box" }}>
    <style>{`
      .msc-new-darts-config { scrollbar-gutter: stable; }
      @media (max-width: 560px) {
        .msc-crados-guided-head { padding: 11px 10px !important; }
        .msc-crados-guided-head .msc-crados-step-dots { gap: 3px !important; margin-left: auto; }
        .msc-crados-guided-head .msc-crados-step-dots button { width: 22px !important; height: 22px !important; font-size: 8.5px !important; }
      }
      @media (orientation: landscape) and (max-height: 620px) {
        .msc-new-darts-config { height: 100dvh !important; min-height: 0 !important; overflow-y: auto !important; padding-bottom: max(84px, env(safe-area-inset-bottom)) !important; }
        .msc-new-darts-config-content { padding-top: 4px !important; }
        .msc-new-darts-guided-nav { position: sticky !important; bottom: max(6px, env(safe-area-inset-bottom)) !important; z-index: 50 !important; background: rgba(3,5,10,.92) !important; backdrop-filter: blur(14px); padding: 6px !important; border-radius: 14px; box-shadow: 0 -8px 24px rgba(0,0,0,.45); }
      }
    `}</style>
    <PageHeader tickerSrc={definition.ticker} tickerAlt={definition.title} tickerHeight={mode === "crados" ? 68 : 92} tickerBottomGap={mode === "crados" ? 4 : 10} tickerFit={mode === "crados" ? "cover" : "cover"} left={<BackDot onClick={backToGames} color={accent} glow={`${accent}88`} title="Retour" />} right={<InfoDot title={`Règles ${definition.title}`} color={accent} glow={`${accent}77`} content={definition.rulesContent} />} />
    <div className="msc-new-darts-config-content" style={{ padding: "8px 8px 0", maxWidth: 980, margin: "0 auto", minWidth: 0, boxSizing: "border-box" }}>
      {mode === "crados" && !viewModeChosen ? <section style={{ ...selectorCard, border: `1px solid ${accent}66`, boxShadow: `0 0 24px ${accent}18, 0 14px 34px rgba(0,0,0,.48)`, padding: "14px 12px" }}>
        <div style={{ color: accent, fontSize: 12.5, fontWeight: 1000, textTransform: "uppercase", letterSpacing: 1, textAlign: "center" }}>Choisis ton affichage</div>
        <div style={{ marginTop: 5, color: soft, fontSize: 9.8, textAlign: "center" }}>Tu pourras revenir ici en quittant la configuration.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 12 }}>
          <button type="button" onClick={() => selectView("guided")} style={{ minHeight: 86, borderRadius: 17, border: `1px solid ${accent}`, background: `${accent}16`, color: "#fff", padding: 10, fontWeight: 1000 }}><span style={{ display: "block", color: accent, fontSize: 18 }}>GUIDÉE</span><small style={{ display: "block", marginTop: 5, color: soft, fontSize: 9, fontWeight: 800 }}>Étapes courtes · idéal mobile</small></button>
          <button type="button" onClick={() => selectView("complete")} style={{ minHeight: 86, borderRadius: 17, border: "1px solid rgba(255,255,255,.13)", background: "rgba(255,255,255,.04)", color: "#fff", padding: 10, fontWeight: 1000 }}><span style={{ display: "block", fontSize: 18 }}>COMPLÈTE</span><small style={{ display: "block", marginTop: 5, color: soft, fontSize: 9, fontWeight: 800 }}>Tous les réglages sur une page</small></button>
        </div>
      </section> : null}

      {mode !== "crados" ? <section style={{ ...selectorCard, border: `1px solid ${accent}66`, boxShadow: `0 0 24px ${accent}18, 0 14px 34px rgba(0,0,0,.48)` }}>
        <div style={{ color: accent, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configuration {definition.title}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Pill active={viewMode === "guided"} onClick={() => selectView("guided")} accent={accent}>Guidée</Pill><Pill active={viewMode === "complete"} onClick={() => selectView("complete")} accent={accent}>Complète</Pill></div>
        <div style={{ marginTop: 8, color: soft, fontSize: 11 }}>Le moteur de jeu est intégré : participants, règles, format, saisie, sauvegarde et reprise sont prêts.</div>
      </section> : null}

      {(mode !== "crados" || viewModeChosen) && (viewMode === "guided" ? <>
        <section className={mode === "crados" ? "msc-crados-guided-head" : undefined} style={selectorCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9, minWidth: 0 }}><div style={{ minWidth: 0 }}><div style={{ color: accent, fontSize: 12.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>Configuration guidée</div><div style={{ marginTop: 3, color: soft, fontSize: 10.5 }}>Étape {guidedStep + 1}/{steps.length} · {steps[guidedStep]}</div></div><div className={mode === "crados" ? "msc-crados-step-dots" : undefined} style={{ display: "flex", gap: 4, flexShrink: 0 }}>{steps.map((label, idx) => <button key={label} type="button" onClick={() => goGuidedStep(idx)} title={label} style={{ width: 25, height: 25, borderRadius: 999, border: `1px solid ${idx === guidedStep ? accent : "rgba(255,255,255,.10)"}`, background: idx === guidedStep ? `${accent}20` : "rgba(255,255,255,.03)", color: idx === guidedStep ? accent : "#aeb2d3", fontSize: 9.5, fontWeight: 950 }}>{idx + 1}</button>)}</div></div>
          <div style={{ height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}><div style={{ width: `${((guidedStep + 1) / steps.length) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${accent}, ${accent2})` }} /></div>
        </section>
        {mode === "crados" ? <>
          {guidedStep === 0 ? cradosModeChoiceBlock : null}
          {guidedStep === 1 ? <>{participantsBlock}{cradosOrderBlock}</> : null}
          {guidedStep === 2 ? cradosDirtBlock : null}
          {guidedStep === 3 ? cradosZonesBlock : null}
          {guidedStep === 4 ? matchBlock : null}
          {guidedStep === 5 ? inputBlock : null}
          {guidedStep === 6 ? summaryBlock : null}
        </> : <>
          {guidedStep === 0 ? participantsBlock : null}
          {guidedStep === 1 ? modeBlock : null}
          {guidedStep === 2 ? matchBlock : null}
          {guidedStep === 3 ? inputBlock : null}
          {guidedStep === 4 ? summaryBlock : null}
        </>}
        <div className="msc-new-darts-guided-nav" style={{ display: "flex", gap: 9, marginBottom: 12 }}><button type="button" disabled={guidedStep === 0} onClick={() => goGuidedStep(guidedStep - 1)} style={{ flex: 1, minHeight: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: guidedStep === 0 ? "#565b76" : "#fff", fontWeight: 950 }}>← Précédent</button>{guidedStep < maxStep ? <button type="button" onClick={() => goGuidedStep(guidedStep + 1)} style={{ flex: 1, minHeight: 42, borderRadius: 999, border: `1px solid ${accent}`, background: `${accent}18`, color: accent, fontWeight: 950 }}>Suivant →</button> : null}</div>
      </> : <>{mode === "crados" ? cradosCompleteModeChoiceBlock : null}{participantsBlock}{mode === "crados" ? cradosOrderBlock : null}{modeBlock}{matchBlock}{inputBlock}{summaryBlock}</>)}

      {(mode !== "crados" || viewModeChosen) && (viewMode === "complete" || guidedStep === maxStep) ? <div style={{ padding: "4px 4px 16px" }}><button type="button" disabled={!validSelection} onClick={start} style={{ width: "100%", minHeight: 52, borderRadius: 999, border: validSelection ? `1px solid ${accent}cc` : "1px solid rgba(255,255,255,.10)", background: validSelection ? `linear-gradient(90deg, ${accent}, ${accent2})` : "rgba(255,255,255,.06)", color: validSelection ? "#071018" : "rgba(255,255,255,.48)", boxShadow: validSelection ? `0 0 20px ${accent}55, 0 10px 24px rgba(0,0,0,.40)` : "none", fontWeight: 1100, letterSpacing: 1.1, cursor: validSelection ? "pointer" : "not-allowed" }}>DÉMARRER {definition.title}</button><div style={{ marginTop: 8, color: soft, fontSize: 10.5, textAlign: "center" }}>La partie démarre avec le moteur complet, les BOTS, l’UNDO, la sauvegarde en cours et les statistiques de fin.</div></div> : null}
    </div>
  </div>;
}
