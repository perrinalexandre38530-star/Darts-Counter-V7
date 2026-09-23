// @ts-nocheck
import React from "react";
import BackDot from "../../components/BackDot";
import BotPagedSelector from "../../components/BotPagedSelector";
import InfoDot from "../../components/InfoDot";
import OptionRow from "../../components/OptionRow";
import OptionSelect from "../../components/OptionSelect";
import OptionToggle from "../../components/OptionToggle";
import PageHeader from "../../components/PageHeader";
import ProfileAvatar from "../../components/ProfileAvatar";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import Section from "../../components/Section";
import { useTheme } from "../../contexts/ThemeContext";
import { loadBotPlayers } from "../../lib/bots";
import { recordProfileUsageForMode } from "../../lib/profileUsage";
import { loadTeamsBySport } from "../../lib/petanqueTeamsStore";
import { X01_PRO_BOTS } from "../X01ConfigV3";
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
  { id: "crados_team_gold", name: "Team Gold", color: "#f7c85c" },
  { id: "crados_team_pink", name: "Team Pink", color: "#ff4fa2" },
  { id: "crados_team_blue", name: "Team Blue", color: "#4fc3ff" },
  { id: "crados_team_green", name: "Team Green", color: "#6dff7c" },
];

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

function cradosProfilePower(profile: any): number {
  const direct = Number(profile?.cradosAiLevel ?? profile?.profileStarring ?? profile?.stars ?? profile?.level);
  if (Number.isFinite(direct) && direct > 0) return Math.max(1, Math.min(5, direct > 5 ? direct / 20 : direct));
  const raw = String(profile?.botLevel || "").replace(",", ".");
  const parsed = Number((raw.match(/\d+(?:\.5)?/) || [""])[0]);
  if (Number.isFinite(parsed) && parsed > 0) return Math.max(1, Math.min(5, parsed));
  return 3;
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
  const [cradosParticipantMode, setCradosParticipantMode] = React.useState<"players" | "teams">(saved.cradosParticipantMode === "teams" ? "teams" : "players");
  const [cradosTeamsSourceMode, setCradosTeamsSourceMode] = React.useState<"manual" | "saved" | "auto">(saved.cradosTeamsSourceMode === "saved" || saved.cradosTeamsSourceMode === "auto" ? saved.cradosTeamsSourceMode : "manual");
  const [cradosTeamAssignments, setCradosTeamAssignments] = React.useState<Record<string, string>>(saved.cradosTeamAssignments && typeof saved.cradosTeamAssignments === "object" ? saved.cradosTeamAssignments : {});
  const [cradosSelectedTeamIds, setCradosSelectedTeamIds] = React.useState<string[]>(Array.isArray(saved.cradosSelectedTeamIds) ? saved.cradosSelectedTeamIds.map(String) : []);
  const [cradosAutoTeamCount, setCradosAutoTeamCount] = React.useState<2 | 3 | 4>(saved.cradosAutoTeamCount === 3 || saved.cradosAutoTeamCount === 4 ? saved.cradosAutoTeamCount : 2);
  const [cradosAutoMode, setCradosAutoMode] = React.useState<"random" | "balanced">(saved.cradosAutoMode === "random" ? "random" : "balanced");
  const [cradosAutoTeams, setCradosAutoTeams] = React.useState<any[]>(Array.isArray(saved.cradosAutoTeams) ? saved.cradosAutoTeams : []);
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

  const cradosSavedTeamOptions = React.useMemo(() => {
    if (mode !== "crados") return [];
    const savedTeams = storedDartsTeams.map((team: any, index: number) => ({
      id: String(team.id),
      name: String(team.name || `Équipe ${index + 1}`),
      color: team?.color || CRADOS_TEAM_SLOTS[index % CRADOS_TEAM_SLOTS.length].color,
      logoDataUrl: team?.logoDataUrl ?? team?.logoUrl ?? team?.avatarUrl ?? null,
      playerIds: uniqueStrings(team?.playerIds || []).filter((id) => profileById.has(id)),
      isBotTeam: false,
      isCradosFamily: false,
    })).filter((team: any) => team.playerIds.length > 0);
    const botFamilies = CRADOS_BOT_TEAMS.map((team: any, index: number) => ({
      id: String(team.id),
      name: `Famille ${team.familyLabel}`,
      color: team.accent || CRADOS_TEAM_SLOTS[index % CRADOS_TEAM_SLOTS.length].color,
      logoDataUrl: team.avatarDataUrl || null,
      playerIds: uniqueStrings(team.memberIds || []).filter((id) => profileById.has(id)),
      isBotTeam: true,
      isCradosFamily: true,
      botTeamLevel: team.botTeamLevel,
    })).filter((team: any) => team.playerIds.length > 0);
    return [...savedTeams, ...botFamilies];
  }, [mode, storedDartsTeams, profileById]);

  const cradosSelectedSavedTeams = React.useMemo(() => {
    const selected = new Set(cradosSelectedTeamIds.map(String));
    return cradosSavedTeamOptions.filter((team: any) => selected.has(String(team.id)));
  }, [cradosSelectedTeamIds, cradosSavedTeamOptions]);

  const cradosManualTeams = React.useMemo(() => {
    if (mode !== "crados") return [];
    return CRADOS_TEAM_SLOTS.map((slot) => ({
      ...slot,
      logoDataUrl: null,
      playerIds: selectedIds.filter((id) => cradosTeamAssignments[String(id)] === slot.id),
      isBotTeam: false,
    })).filter((team) => team.playerIds.length > 0);
  }, [mode, selectedIds, cradosTeamAssignments]);

  const activeCradosTeams = cradosTeamsSourceMode === "saved" ? cradosSelectedSavedTeams : cradosTeamsSourceMode === "auto" ? cradosAutoTeams : cradosManualTeams;
  const cradosTeamMemberIds = uniqueStrings((activeCradosTeams || []).flatMap((team: any) => team?.playerIds || []));
  const cradosTeamMemberTotal = (activeCradosTeams || []).reduce((sum: number, team: any) => sum + uniqueStrings(team?.playerIds || []).length, 0);
  const cradosTeamSizes = (activeCradosTeams || []).map((team: any) => uniqueStrings(team?.playerIds || []).length).filter(Boolean);
  const cradosSavedTeamsMode = cradosTeamsSourceMode === "saved";
  const cradosTeamsHaveNoOverlap = cradosTeamMemberTotal === cradosTeamMemberIds.length;
  // Comme X01 : les équipes enregistrées peuvent avoir des effectifs différents
  // et peuvent même être des équipes à un seul joueur. En MANUEL/AUTO, on garde
  // la règle d'équipes équilibrées (même taille, 2 joueurs minimum par équipe).
  const cradosTeamsValid = mode === "crados" && cradosParticipantMode === "teams"
    ? activeCradosTeams.length >= 2
      && cradosTeamMemberIds.length >= (cradosSavedTeamsMode ? 2 : 4)
      && cradosTeamMemberIds.length <= definition.maxPlayers
      && cradosTeamsHaveNoOverlap
      && cradosTeamSizes.every((size) => size >= (cradosSavedTeamsMode ? 1 : 2))
      && (cradosSavedTeamsMode || new Set(cradosTeamSizes).size === 1)
    : false;
  const cradosTeamsValidationMessage = cradosSavedTeamsMode
    ? (!activeCradosTeams.length ? "Choisis au moins 2 équipes."
      : activeCradosTeams.length < 2 ? "Choisis au moins 2 équipes."
      : !cradosTeamsHaveNoOverlap ? "Un même joueur ne peut pas appartenir à deux équipes dans le même match."
      : cradosTeamMemberIds.length > definition.maxPlayers ? `Maximum ${definition.maxPlayers} participants.`
      : "Chaque équipe sélectionnée doit contenir au moins 1 joueur.")
    : (!activeCradosTeams.length ? "Crée au moins 2 équipes."
      : activeCradosTeams.length < 2 ? "Crée au moins 2 équipes."
      : cradosTeamSizes.some((size) => size < 2) ? "Chaque équipe doit contenir au moins 2 joueurs."
      : new Set(cradosTeamSizes).size !== 1 ? "Les équipes manuelles/automatiques doivent avoir la même taille."
      : !cradosTeamsHaveNoOverlap ? "Un même joueur ne peut pas appartenir à deux équipes."
      : `Maximum ${definition.maxPlayers} participants.`);
  const baseValidSelection = selectedProfiles.length >= definition.minPlayers && selectedProfiles.length <= definition.maxPlayers;
  const validSelection = mode === "crados" && cradosParticipantMode === "teams" ? cradosTeamsValid : baseValidSelection;

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
        setCradosAutoTeams([]);
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= definition.maxPlayers) return prev;
      setCradosAutoTeams([]);
      return [...prev, id];
    });
  }

  function setCradosPlayerTeam(playerId: string, teamId: string) {
    setCradosTeamAssignments((prev) => ({ ...prev, [String(playerId)]: String(teamId) }));
  }

  function toggleCradosSavedTeam(team: any) {
    const id = String(team?.id || "");
    if (!id) return;
    setCradosTeamError("");
    setCradosSelectedTeamIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      const nextIds = [...prev, id];
      const nextTeams = cradosSavedTeamOptions.filter((option: any) => nextIds.includes(String(option.id)));
      const total = uniqueStrings(nextTeams.flatMap((option: any) => option.playerIds || [])).length;
      if (total > definition.maxPlayers) {
        setCradosTeamError(`Maximum ${definition.maxPlayers} joueurs pour CRADOS.`);
        return prev;
      }
      return nextIds;
    });
  }

  function generateCradosAutoTeams() {
    setCradosTeamError("");
    const teamCount = Number(cradosAutoTeamCount || 2);
    const rows = selectedProfiles.filter(Boolean);
    if (rows.length < 4) { setCradosTeamError("Sélectionne au moins 4 joueurs/BOTS pour créer des équipes."); return; }
    if (rows.length % teamCount !== 0) { setCradosTeamError(`Pour ${teamCount} équipes, le nombre de participants doit être divisible par ${teamCount}.`); return; }
    const teamSize = rows.length / teamCount;
    if (teamSize < 2) { setCradosTeamError("Chaque équipe doit contenir au moins 2 joueurs."); return; }
    let ordered = cradosAutoMode === "random" ? shuffleCopy(rows) : [...rows].sort((a, b) => cradosProfilePower(b) - cradosProfilePower(a));
    const buckets = Array.from({ length: teamCount }, (_, index) => ({
      id: `crados_auto_${index + 1}`,
      name: `Équipe ${index + 1}`,
      color: CRADOS_TEAM_SLOTS[index % CRADOS_TEAM_SLOTS.length].color,
      logoDataUrl: null,
      playerIds: [] as string[],
      isBotTeam: false,
    }));
    if (cradosAutoMode === "balanced") {
      ordered.forEach((profile: any, index: number) => {
        const round = Math.floor(index / teamCount);
        const slot = index % teamCount;
        const teamIndex = round % 2 === 0 ? slot : teamCount - 1 - slot;
        buckets[teamIndex].playerIds.push(String(profile.id));
      });
    } else {
      ordered.forEach((profile: any, index: number) => buckets[index % teamCount].playerIds.push(String(profile.id)));
    }
    setCradosAutoTeams(buckets);
  }

  React.useEffect(() => {
    const snapshot = {
      selectedIds, botsOpen, botLevel, randomOrder, scoreInputMethod, seriesWins,
      castleBricks, castleAssignment, castleAttacks, castleReassignEachLeg,
      gotchaTarget, gotchaOut, gotchaMaxRounds, gotchaBust,
      houndStart, hareTargetZone, hareRoleMode, hareDirection,
      penduPartsToLose, penduChallengeMode, penduTargetFamily, penduExecution,
      menteurLives, menteurContractDeck, menteurRaiseStep, menteurBullAllowed,
      cradosDirtLimit, cradosLayersToOwn, cradosBullWash, cradosStealMode,
      cradosParticipantMode, cradosTeamsSourceMode, cradosTeamAssignments, cradosSelectedTeamIds, cradosAutoTeamCount, cradosAutoMode, cradosAutoTeams,
      fiftyOneTarget, fiftyOneRequireThreeScoringDarts, fiftyOneBust,
      looperLives, looperStartTarget, looperNumberLoops, looperSetterShield,
      callThreeRounds, callThreeCaller, callThreeOrderStrict, callThreeBull,
      steepleDirection, steepleFences, steepleFinishBull, steepleZone,
    };
    writeSaved(mode, snapshot);
  }, [mode, selectedIds, botsOpen, botLevel, randomOrder, scoreInputMethod, seriesWins, castleBricks, castleAssignment, castleAttacks, castleReassignEachLeg, gotchaTarget, gotchaOut, gotchaMaxRounds, gotchaBust, houndStart, hareTargetZone, hareRoleMode, hareDirection, penduPartsToLose, penduChallengeMode, penduTargetFamily, penduExecution, menteurLives, menteurContractDeck, menteurRaiseStep, menteurBullAllowed, cradosDirtLimit, cradosLayersToOwn, cradosBullWash, cradosStealMode, cradosParticipantMode, cradosTeamsSourceMode, cradosTeamAssignments, cradosSelectedTeamIds, cradosAutoTeamCount, cradosAutoMode, cradosAutoTeams, fiftyOneTarget, fiftyOneRequireThreeScoringDarts, fiftyOneBust, looperLives, looperStartTarget, looperNumberLoops, looperSetterShield, callThreeRounds, callThreeCaller, callThreeOrderStrict, callThreeBull, steepleDirection, steepleFences, steepleFinishBull, steepleZone]);

  function selectView(value: ConfigViewMode) {
    setViewMode(value);
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
    if (mode === "crados") return { dirtLimit: cradosDirtLimit, layersToOwn: cradosLayersToOwn, bullWash: cradosBullWash, stealMode: cradosStealMode };
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
  const selectedTeamProfiles = selectedProfiles;
  const participantsBlock = <>
    <section style={selectorCard}>
      <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Participants</div>
      {mode === "crados" ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => { setCradosParticipantMode("players"); setCradosTeamError(""); }} style={{ minHeight: 44, borderRadius: 14, border: `1px solid ${!cradosTeamMode ? accent : "rgba(255,255,255,.11)"}`, background: !cradosTeamMode ? `${accent}20` : "rgba(255,255,255,.035)", color: !cradosTeamMode ? accent : "#c4c9d9", fontWeight: 1000 }}>👤 JOUEURS</button>
        <button type="button" onClick={() => { setCradosParticipantMode("teams"); setCradosTeamError(""); }} style={{ minHeight: 44, borderRadius: 14, border: `1px solid ${cradosTeamMode ? accent : "rgba(255,255,255,.11)"}`, background: cradosTeamMode ? `${accent}20` : "rgba(255,255,255,.035)", color: cradosTeamMode ? accent : "#c4c9d9", fontWeight: 1000 }}>👥 ÉQUIPES</button>
      </div> : null}

      {!cradosTeamMode ? <>
        <PlayerPagedSelector usageMode={mode} profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary />
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ color: validSelection ? accent : "#ff9baa", fontSize: 11.5, fontWeight: 900 }}>{validSelection ? `${selectedProfiles.length} participant${selectedProfiles.length > 1 ? "s" : ""} sélectionné${selectedProfiles.length > 1 ? "s" : ""}` : `Sélectionne ${definition.minPlayers} à ${definition.maxPlayers} participants.`}</div>
          <button type="button" onClick={() => setBotsOpen((v) => !v)} style={{ minHeight: 34, borderRadius: 999, border: `1px solid ${accent}77`, background: botsOpen ? `${accent}1d` : "rgba(255,255,255,.04)", color: accent, fontWeight: 900, padding: "6px 11px" }}>{botsOpen ? "☑ BOTS IA" : "☐ BOTS IA"}</button>
        </div>
        {maxReached ? <div style={{ marginTop: 8, color: soft, fontSize: 10.5 }}>Maximum atteint : {definition.maxPlayers} participants.</div> : null}
      </> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 12 }}>
          {([['manual','MANUEL'],['saved','ÉQUIPES CRÉÉES'],['auto','AUTOMATIQUE']] as any[]).map(([value,label]) => <button key={value} type="button" onClick={() => { setCradosTeamsSourceMode(value); setCradosTeamError(""); }} style={{ minHeight: 42, borderRadius: 13, padding: "6px 5px", border: `1px solid ${cradosTeamsSourceMode === value ? accent : "rgba(255,255,255,.10)"}`, background: cradosTeamsSourceMode === value ? `${accent}18` : "rgba(255,255,255,.03)", color: cradosTeamsSourceMode === value ? accent : "#aeb5c8", fontWeight: 950, fontSize: 9.8 }}>{label}</button>)}
        </div>

        {cradosTeamsSourceMode === "saved" ? <div style={{ display: "grid", gap: 9 }}>
          <div style={{ color: soft, fontSize: 10.8, lineHeight: 1.4 }}>Choisis au moins 2 équipes déjà créées. Les 6 familles BOTS IA CRADOS sont intégrées ici comme de vraies équipes.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
            {cradosSavedTeamOptions.map((team: any) => {
              const active = cradosSelectedTeamIds.includes(String(team.id));
              const members = (team.playerIds || []).map((id: string) => profileById.get(String(id))).filter(Boolean);
              return <button key={team.id} type="button" onClick={() => toggleCradosSavedTeam(team)} style={{ minHeight: 94, borderRadius: 16, border: `1px solid ${active ? team.color || accent : "rgba(255,255,255,.09)"}`, background: active ? `${team.color || accent}16` : "rgba(255,255,255,.035)", padding: 10, textAlign: "left", color: "#fff", boxShadow: active ? `0 0 18px ${team.color || accent}25` : "none" }}>
                <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 9, alignItems: "center" }}><ProfileAvatar name={team.name} dataUrl={team.logoDataUrl || undefined} size={42} /><div style={{ minWidth: 0 }}><div style={{ color: active ? team.color || accent : "#fff", fontWeight: 1000, fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{active ? "☑ " : "☐ "}{team.name}</div><div style={{ marginTop: 3, color: "#939bb0", fontSize: 9 }}>{members.length} membres{team.isCradosFamily ? ` · BOTS IA · ${Number(team.botTeamLevel || 0).toFixed(1)}/5` : ""}</div></div></div>
                <div style={{ display: "flex", gap: 4, marginTop: 8, overflow: "hidden" }}>{members.slice(0, 5).map((member: any) => <ProfileAvatar key={member.id} profile={member} size={26} showStars={false} />)}</div>
              </button>;
            })}
          </div>
          {!cradosSavedTeamOptions.length ? <div style={{ color: "#ff9baa", fontSize: 11 }}>Aucune équipe fléchettes enregistrée.</div> : null}
        </div> : <>
          <PlayerPagedSelector usageMode={mode} profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} pageSize={9} modalTitle={cradosTeamsSourceMode === "auto" ? "Choisir les joueurs à brasser" : "Choisir les joueurs des équipes"} showSelectedSummary />
          <div style={{ marginTop: 9, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><span style={{ color: soft, fontSize: 10.5 }}>{selectedProfiles.length} joueur{selectedProfiles.length > 1 ? "s" : ""}/BOT{selectedProfiles.length > 1 ? "S" : ""}</span><button type="button" onClick={() => setBotsOpen((v) => !v)} style={{ minHeight: 32, borderRadius: 999, border: `1px solid ${accent}66`, background: botsOpen ? `${accent}18` : "rgba(255,255,255,.035)", color: accent, fontWeight: 900, padding: "5px 10px" }}>{botsOpen ? "☑ BOTS" : "☐ BOTS"}</button></div>
          {botsOpen ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} label="BOTS CRADOS + CPU" modalTitle="Choisir les BOTS" showCheckbox={false} showSelectedSummary={false} /></div> : null}

          {cradosTeamsSourceMode === "manual" ? <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div style={{ color: soft, fontSize: 10.7, lineHeight: 1.4 }}>Comme dans X01 : sélectionne au moins 4 participants puis assigne chacun à une équipe. Les équipes doivent avoir la même taille.</div>
            {selectedTeamProfiles.map((profile: any) => <div key={profile.id} style={{ display: "grid", gridTemplateColumns: "minmax(110px,1fr) auto", gap: 8, alignItems: "center", padding: "7px 8px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}><ProfileAvatar profile={profile} size={30} showStars={false} /><span style={{ color: "#fff", fontSize: 10.5, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name}</span></div><div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>{CRADOS_TEAM_SLOTS.map((slot) => <button key={slot.id} type="button" onClick={() => setCradosPlayerTeam(String(profile.id), slot.id)} style={{ minWidth: 29, height: 29, borderRadius: 999, border: `1px solid ${cradosTeamAssignments[String(profile.id)] === slot.id ? slot.color : slot.color + "55"}`, background: cradosTeamAssignments[String(profile.id)] === slot.id ? `${slot.color}28` : "rgba(255,255,255,.025)", color: slot.color, fontWeight: 1000, fontSize: 9 }}>{slot.name.replace("Team ","")}</button>)}</div></div>)}
          </div> : <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ ...panel, display: "grid", gap: 8 }}><OptionRow label="Nombre d'équipes"><OptionSelect value={cradosAutoTeamCount} options={[{value:2,label:"2 équipes"},{value:3,label:"3 équipes"},{value:4,label:"4 équipes"}]} onChange={(v:any) => { setCradosAutoTeamCount(Number(v) as any); setCradosAutoTeams([]); }} /></OptionRow><OptionRow label="Brassage"><OptionSelect value={cradosAutoMode} options={[{value:"balanced",label:"Équilibré par niveau"},{value:"random",label:"Aléatoire"}]} onChange={(v:any) => { setCradosAutoMode(v); setCradosAutoTeams([]); }} /></OptionRow></div>
            <button type="button" onClick={generateCradosAutoTeams} style={{ minHeight: 42, borderRadius: 14, border: `1px solid ${accent}`, background: `${accent}18`, color: accent, fontWeight: 1000 }}>⚙ GÉNÉRER LES ÉQUIPES</button>
            {cradosAutoTeams.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>{cradosAutoTeams.map((team: any) => <div key={team.id} style={{ borderRadius: 14, padding: 9, border: `1px solid ${team.color}66`, background: `${team.color}0d` }}><div style={{ color: team.color, fontWeight: 1000, fontSize: 11 }}>{team.name}</div><div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>{(team.playerIds || []).map((id: string) => { const prof = profileById.get(String(id)); return prof ? <ProfileAvatar key={id} profile={prof} size={28} showStars={false} /> : null; })}</div></div>)}</div> : null}
          </div>}
        </>}

        {cradosTeamError ? <div style={{ marginTop: 10, color: "#ff9baa", fontSize: 10.8, fontWeight: 900 }}>{cradosTeamError}</div> : null}
        <div style={{ marginTop: 10, color: cradosTeamsValid ? accent : "#ff9baa", fontSize: 10.8, fontWeight: 900 }}>{cradosTeamsValid ? `${activeCradosTeams.length} équipes · ${cradosTeamMemberIds.length} participants · prêt à jouer` : cradosTeamsValidationMessage}</div>
      </>}
    </section>

    {!cradosTeamMode && botsOpen ? <section style={selectorCard}>
      <BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} label={mode === "crados" ? "BOTS CRADOS + CPU" : "BOTS IA"} modalTitle={mode === "crados" ? "Choisir les BOTS CRADOS" : "Choisir des BOTS IA"} showCheckbox={false} showSelectedSummary={false} />
      {(mode === "crados" ? cradosCpuBotCount > 0 : botCount > 0) ? <div style={{ marginTop: 10 }}><OptionRow label={mode === "crados" ? "Secours difficulté BOTS CPU" : "Difficulté IA"}><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow>{mode === "crados" ? <div style={{ marginTop: 5, color: soft, fontSize: 9.5 }}>Les 24 personnages CRADOS conservent leur niveau propre. Ce réglage ne sert que de secours aux BOTS CPU personnels sans niveau exploitable.</div> : null}</div> : null}
    </section> : null}
  </>;

  const matchBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Format de match</div>
    <div style={panel}>
      <OptionRow label="Série"><OptionSelect value={seriesWins} options={[{ value: 1, label: "BO1 — 1 victoire" }, { value: 2, label: "BO3 — 2 victoires" }, { value: 3, label: "BO5 — 3 victoires" }]} onChange={(v: any) => setSeriesWins(Number(v) as any)} /></OptionRow>
      <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
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

  const cradosBlock = <section style={selectorCard}>
    <div style={{ color: accent, textTransform: "uppercase", letterSpacing: 1, fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Règles CRADOS</div>
    <div style={panel}>
      <OptionRow label="Jauge de crasse"><OptionSelect value={cradosDirtLimit} options={[10,15,20]} onChange={(v: any) => setCradosDirtLimit(Number(v) === 15 ? 15 : Number(v) === 20 ? 20 : 10)} /></OptionRow>
      <OptionRow label="Couches pour salir un secteur"><OptionSelect value={cradosLayersToOwn} options={[{ value: 2, label: "2 couches — rapide" }, { value: 3, label: "3 couches — classique" }, { value: 4, label: "4 couches — endurance" }]} onChange={(v: any) => setCradosLayersToOwn(Number(v) === 2 ? 2 : Number(v) === 4 ? 4 : 3)} /></OptionRow>
      <OptionRow label="Bull douche / nettoyage"><OptionToggle value={cradosBullWash} onChange={setCradosBullWash} /></OptionRow>
      <OptionRow label="Action sur secteur adverse"><OptionSelect value={cradosStealMode} options={[{ value: "block", label: "Blocage — secteur sale piégé" }, { value: "flip", label: "Vol — la propriété peut changer" }]} onChange={setCradosStealMode} /></OptionRow>
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
      {mode === "crados" ? <><SummaryLine label="Type de partie" value={cradosTeamMode ? "Équipes" : "Joueurs"} />{cradosTeamMode ? <SummaryLine label="Composition" value={cradosTeamsSourceMode === "saved" ? "Équipes créées / familles IA" : cradosTeamsSourceMode === "auto" ? "Brassage automatique" : "Manuelle"} /> : null}<SummaryLine label="Crasse max" value={`${cradosDirtLimit}`} /><SummaryLine label="Contamination" value={`${cradosLayersToOwn} couche${cradosLayersToOwn > 1 ? "s" : ""} / secteur`} /></> : null}
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
  const steps = definition.guidedSteps;
  const maxStep = steps.length - 1;

  return <div className="msc-new-darts-config" style={{ height: "100dvh", minHeight: "100dvh", width: "100%", maxWidth: "100%", overflowX: "hidden", overflowY: "auto", WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehaviorY: "contain", paddingBottom: 92, boxSizing: "border-box" }}>
    <style>{`
      .msc-new-darts-config { scrollbar-gutter: stable; }
      @media (orientation: landscape) and (max-height: 620px) {
        .msc-new-darts-config { height: 100dvh !important; min-height: 0 !important; overflow-y: auto !important; padding-bottom: max(84px, env(safe-area-inset-bottom)) !important; }
        .msc-new-darts-config-content { padding-top: 4px !important; }
        .msc-new-darts-guided-nav { position: sticky !important; bottom: max(6px, env(safe-area-inset-bottom)) !important; z-index: 50 !important; background: rgba(3,5,10,.92) !important; backdrop-filter: blur(14px); padding: 6px !important; border-radius: 14px; box-shadow: 0 -8px 24px rgba(0,0,0,.45); }
      }
    `}</style>
    <PageHeader tickerSrc={definition.ticker} tickerAlt={definition.title} left={<BackDot onClick={backToGames} color={accent} glow={`${accent}88`} title="Retour" />} right={<InfoDot title={`Règles ${definition.title}`} color={accent} glow={`${accent}77`} content={definition.rulesContent} />} />
    <div className="msc-new-darts-config-content" style={{ padding: "8px 8px 0", maxWidth: 980, margin: "0 auto", minWidth: 0, boxSizing: "border-box" }}>
      <section style={{ ...selectorCard, border: `1px solid ${accent}66`, boxShadow: `0 0 24px ${accent}18, 0 14px 34px rgba(0,0,0,.48)` }}>
        <div style={{ color: accent, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configuration {definition.title}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Pill active={viewMode === "guided"} onClick={() => selectView("guided")} accent={accent}>Guidée</Pill><Pill active={viewMode === "complete"} onClick={() => selectView("complete")} accent={accent}>Complète</Pill></div>
        <div style={{ marginTop: 8, color: soft, fontSize: 11 }}>Le moteur de jeu est intégré : participants, règles, format, saisie, sauvegarde et reprise sont prêts.</div>
      </section>

      {viewMode === "guided" ? <>
        <section style={selectorCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}><div><div style={{ color: accent, fontSize: 12.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>Configuration guidée</div><div style={{ marginTop: 3, color: soft, fontSize: 10.5 }}>Étape {guidedStep + 1}/{steps.length} · {steps[guidedStep]}</div></div><div style={{ display: "flex", gap: 4 }}>{steps.map((label, idx) => <button key={label} type="button" onClick={() => setGuidedStep(idx)} title={label} style={{ width: 25, height: 25, borderRadius: 999, border: `1px solid ${idx === guidedStep ? accent : "rgba(255,255,255,.10)"}`, background: idx === guidedStep ? `${accent}20` : "rgba(255,255,255,.03)", color: idx === guidedStep ? accent : "#aeb2d3", fontSize: 9.5, fontWeight: 950 }}>{idx + 1}</button>)}</div></div>
          <div style={{ height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}><div style={{ width: `${((guidedStep + 1) / steps.length) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${accent}, ${accent2})` }} /></div>
        </section>
        {guidedStep === 0 ? participantsBlock : null}
        {guidedStep === 1 ? modeBlock : null}
        {guidedStep === 2 ? matchBlock : null}
        {guidedStep === 3 ? inputBlock : null}
        {guidedStep === 4 ? summaryBlock : null}
        <div className="msc-new-darts-guided-nav" style={{ display: "flex", gap: 9, marginBottom: 12 }}><button type="button" disabled={guidedStep === 0} onClick={() => setGuidedStep((s) => Math.max(0, s - 1))} style={{ flex: 1, minHeight: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: guidedStep === 0 ? "#565b76" : "#fff", fontWeight: 950 }}>← Précédent</button><button type="button" disabled={guidedStep === maxStep} onClick={() => setGuidedStep((s) => Math.min(maxStep, s + 1))} style={{ flex: 1, minHeight: 42, borderRadius: 999, border: `1px solid ${accent}`, background: `${accent}18`, color: guidedStep === maxStep ? "#565b76" : accent, fontWeight: 950 }}>Suivant →</button></div>
      </> : <>{participantsBlock}{modeBlock}{matchBlock}{inputBlock}{summaryBlock}</>}

      {(viewMode === "complete" || guidedStep === maxStep) ? <div style={{ padding: "4px 4px 16px" }}><button type="button" disabled={!validSelection} onClick={start} style={{ width: "100%", minHeight: 52, borderRadius: 999, border: validSelection ? `1px solid ${accent}cc` : "1px solid rgba(255,255,255,.10)", background: validSelection ? `linear-gradient(90deg, ${accent}, ${accent2})` : "rgba(255,255,255,.06)", color: validSelection ? "#071018" : "rgba(255,255,255,.48)", boxShadow: validSelection ? `0 0 20px ${accent}55, 0 10px 24px rgba(0,0,0,.40)` : "none", fontWeight: 1100, letterSpacing: 1.1, cursor: validSelection ? "pointer" : "not-allowed" }}>DÉMARRER {definition.title}</button><div style={{ marginTop: 8, color: soft, fontSize: 10.5, textAlign: "center" }}>La partie démarre avec le moteur complet, les BOTS, l’UNDO, la sauvegarde en cours et les statistiques de fin.</div></div> : null}
    </div>
  </div>;
}
