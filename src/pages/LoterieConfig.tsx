// @ts-nocheck
// =============================================================
// LOTERIE — configuration V5
// Structure guidée / complète + sélecteurs JOUEURS / ÉQUIPES / BOTS
// calqués sur X01ConfigV3 / BaseballConfig.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import RulesModal from "../components/RulesModal";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import Section from "../components/Section";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";
import { DARTS_LOTERIE_BOTS, isDartsLoterieBot } from "../lib/dartsLoterieBots";
import { findRememberedGeneratedTeam } from "../lib/teamAutoShuffle";
import { loadTeamsBySport, type TeamEntity } from "../lib/petanqueTeamsStore";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { unlockAudio } from "../lib/sfx";
import { resolveProfileStarScore } from "../lib/profileStarScore";
import {
  LOTERIE_LEVELS,
  normalizeAvg3,
  type LoterieAutoMode,
  type LoterieConfig as LoterieConfigType,
  type LoterieExpressTarget,
  type LoterieExpressAttempts,
  type LoterieLevel,
  type LoterieVariant,
  type LoterieVolleyMode,
  type LoterieRevealMode,
} from "../lib/loterie";
import {
  PillButton,
  SelectedParticipantsCompactBlock,
  TeamsSection,
  buildX01DartsBotTeams,
} from "./X01ConfigV3";
import tickerLoterie from "../assets/tickers/ticker_loterie.png";
import scratchTicketPreview from "../assets-webp/games/loterie-ticket-scratch-v2.png";

type ParticipantMode = "players" | "teams";
type ConfigViewMode = "guided" | "complete";
type TeamsSourceMode = "manual" | "saved" | "auto";
type TeamId = "gold" | "pink" | "blue" | "green";
type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  botLevel?: string;
  isBot?: boolean;
  [key: string]: any;
};
type LoterieTeamConfig = {
  id: string;
  name: string;
  color: string;
  logoDataUrl?: string | null;
  playerIds: string[];
  isBotTeam?: boolean;
};

const LS_CFG_KEY = "dc_modecfg_loterie_v5";
const GOLD = "#f6c256";
const PINK = "#ff63b8";
const TEAM_IDS: TeamId[] = ["gold", "pink", "blue", "green"];
const TEAM_LABELS: Record<TeamId, string> = {
  gold: "Team Gold",
  pink: "Team Pink",
  blue: "Team Blue",
  green: "Team Green",
};
const TEAM_COLORS: Record<TeamId, string> = {
  gold: "#f6c256",
  pink: "#ff63b8",
  blue: "#42d6ff",
  green: "#6ef3b2",
};
const TEAM_COLOR_CYCLE = ["#f6c256", "#ff63b8", "#42d6ff", "#6ef3b2"];

function nameOf(p: any) {
  return String(p?.displayName ?? p?.name ?? p?.nickname ?? p?.username ?? "Joueur");
}
function avatarOf(p: any) {
  return p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? null;
}
function avg3Of(p: any): number {
  const direct = normalizeAvg3(p);
  if (direct > 0) return direct;
  const shared = Number(resolveProfileStarScore(p) || 0);
  return Number.isFinite(shared) && shared > 0 ? shared : 0;
}
function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}
function isLegacyProBot(profile: any) {
  const id = String(profile?.id || "").trim().toLowerCase();
  return id === "bot_awena_official"
    || /^bot_pro_/.test(id)
    || /^pro_/.test(id)
    || profile?.source === "pro"
    || profile?.isProBot === true;
}
function loadUserBots(): BotLite[] {
  try {
    return loadBotPlayers().map((bot: any) => ({
      ...bot,
      id: String(bot.id),
      name: bot?.name || "BOT",
      avatarDataUrl: bot?.avatarDataUrl ?? bot?.avatarUrl ?? bot?.avatar ?? null,
      avatarUrl: bot?.avatarUrl ?? bot?.avatar ?? null,
      avatar: bot?.avatar ?? bot?.avatarUrl ?? bot?.avatarDataUrl ?? null,
      botLevel: bot?.botLevel ?? bot?.level ?? "",
      isBot: true,
    })).filter((bot: BotLite) => Boolean(bot.id));
  } catch {
    return [];
  }
}
function readSavedConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_CFG_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function teamBaseId(value: any): string {
  return String(value?.baseTeamId || value?.sourceTeamId || value?.id || value || "").split("__slot_")[0];
}
function teamSuffix(index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return index < letters.length ? letters[index] : `#${index + 1}`;
}
function uniqueIds(ids: any[]) {
  return Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean)));
}
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function MiniFieldInfo({ title, children, color }: any) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Info ${title || "option"}`}
        title="Détails"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        style={{
          width: 18,
          height: 18,
          minWidth: 18,
          minHeight: 18,
          padding: 0,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.70)",
          fontSize: 11,
          fontWeight: 900,
          lineHeight: "18px",
          textAlign: "center",
          cursor: "pointer",
          flex: "0 0 18px",
          boxShadow: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        i
      </button>
      <RulesModal open={open} onClose={() => setOpen(false)} title={title || "Informations"}>
        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{children}</div>
      </RulesModal>
    </>
  );
}
function CompactConfigSelect({ label, helpTitle, help, value, options, onChange, color }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(84px,.72fr) minmax(0,1.28fr)", gap: 10, alignItems: "center", padding: "10px 11px", borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", minWidth: 0 }}>
      <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 950, fontSize: 12.5, whiteSpace: "nowrap" }}>{label}</span>
        <MiniFieldInfo title={helpTitle || label} color={color}>{help}</MiniFieldInfo>
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", minWidth: 0, maxWidth: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.25)", color: "#fff", padding: "10px 11px", fontWeight: 900, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}>
        {options.map((opt: any) => <option key={String(opt.value)} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function RulesContent() {
  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.48 }}>
      <div><strong style={{ color: GOLD }}>LOTERIE — 3 FLÉCHETTES</strong><br />Le total de la volée est recherché sur tous les cartons du participant. Toutes les cases correspondantes sont révélées. En volée libre, tu peux valider après 1, 2 ou 3 darts ; en mode strict, les 3 darts sont obligatoires.</div>
      <div><strong style={{ color: PINK }}>LOTERIE EXPRESS</strong><br />Choisis SIMPLE, DOUBLE ou TRIPLE puis joue avec 1 fléchette ou jusqu’à 3 essais. En mode 3 essais, le tour s’arrête dès que la bonne zone est touchée. L’option MISS peut également terminer immédiatement le tour.</div>
      <div><strong style={{ color: GOLD }}>CARTONS</strong><br />Chaque participant possède 1 à 4 cartons. Les numéros sont uniques dans un même carton mais peuvent apparaître sur plusieurs cartons : un lancer peut donc ouvrir plusieurs cases.</div>
      <div><strong style={{ color: "#6ef3b2" }}>VICTOIRE</strong><br />Le premier joueur — ou la première équipe — qui complète entièrement un de ses cartons gagne immédiatement.</div>
      <div><strong style={{ color: "#42d6ff" }}>ÉQUIPES</strong><br />En mode ÉQUIPES, chaque équipe possède ses cartons partagés. Les joueurs de l’équipe jouent à tour de rôle sur ces mêmes cartons : chaque découverte compte pour l’équipe, tout en restant attribuée au joueur qui l’a réalisée dans les statistiques.</div>
      <div><strong style={{ color: GOLD }}>BOTS IA</strong><br />Les 7 BOTS IA officiels de LOTERIE jouent automatiquement selon leur niveau. Les BOTS CPU personnels restent également disponibles.</div>
    </div>
  );
}

export default function LoterieConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store ?? null;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSavedConfig, []);
  const primary = theme?.primary || GOLD;
  const primarySoft = theme?.primarySoft || "rgba(246,194,86,.14)";
  const textSoft = theme?.textSoft || "#aeb2d3";
  const accent2 = theme?.accent2 || theme?.accent1 || PINK;

  const [configViewMode, setConfigViewMode] = React.useState<ConfigViewMode>(() => {
    try { return localStorage.getItem("dc_loterie_config_view_mode") === "complete" ? "complete" : "guided"; }
    catch { return "guided"; }
  });
  const [guidedStep, setGuidedStep] = React.useState(0);
  const guidedSteps = ["Participants", "Mode", "Cartons", "Règles", "Résumé"];
  const guidedMaxStep = guidedSteps.length - 1;

  const storeProfiles: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = React.useMemo(() => storeProfiles.filter((p) => !isBotLike(p)), [storeProfiles]);

  const [participantMode, setParticipantMode] = React.useState<ParticipantMode>(saved.participantMode === "teams" ? "teams" : "players");
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<TeamsSourceMode>(saved.teamsSourceMode === "saved" || saved.teamsSourceMode === "auto" ? saved.teamsSourceMode : "manual");
  const [selectedIds, setSelectedIds] = React.useState<string[]>(Array.isArray(saved.selectedIds) ? saved.selectedIds.slice(0, 12).map(String) : []);
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamId | null>>(saved.teamAssignments && typeof saved.teamAssignments === "object" ? saved.teamAssignments : {});
  const [selectedStoredTeamIds, setSelectedStoredTeamIds] = React.useState<string[]>(Array.isArray(saved.selectedStoredTeamIds) ? saved.selectedStoredTeamIds.map(String) : []);
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>(Array.isArray(saved.selectedBotTeamIds) ? saved.selectedBotTeamIds.map(String) : []);
  const [savedTeamMemberSelections, setSavedTeamMemberSelections] = React.useState<Record<string, string[]>>(saved.savedTeamMemberSelections && typeof saved.savedTeamMemberSelections === "object" ? saved.savedTeamMemberSelections : {});
  const [botsPanelEnabled, setBotsPanelEnabled] = React.useState(saved.botsPanelEnabled === true);
  const [botTeamsPanelEnabled, setBotTeamsPanelEnabled] = React.useState(saved.botTeamsPanelEnabled === true);
  const [botProfiles, setBotProfiles] = React.useState<BotLite[]>([]);

  const [variant, setVariant] = React.useState<LoterieVariant>(saved.variant === "express" ? "express" : "classic");
  const [level, setLevel] = React.useState<LoterieLevel>(saved.level || "auto");
  const [autoMode, setAutoMode] = React.useState<LoterieAutoMode>(saved.autoMode || "balanced");
  const [volleyMode, setVolleyMode] = React.useState<LoterieVolleyMode>(saved.volleyMode || "strict3");
  const [expressTarget, setExpressTarget] = React.useState<LoterieExpressTarget>(saved.expressTarget || "simple");
  const [expressAttempts, setExpressAttempts] = React.useState<LoterieExpressAttempts>(saved.expressAttempts === "up_to_3" ? "up_to_3" : "one");
  const [missEndsTurn, setMissEndsTurn] = React.useState(saved.missEndsTurn === true);
  const [revealMode, setRevealMode] = React.useState<LoterieRevealMode>(saved.revealMode === "all" ? "all" : "self");
  const [showRemainingNumbers, setShowRemainingNumbers] = React.useState(saved.showRemainingNumbers === true);
  const [cardsPerPlayer, setCardsPerPlayer] = React.useState<1 | 2 | 3 | 4>(Number(saved.cardsPerPlayer || 2) as any);
  const [cellsPerCard, setCellsPerCard] = React.useState<5 | 10 | 15>(Number(saved.cellsPerCard || 10) as any);
  const [randomOrder, setRandomOrder] = React.useState(saved.startOrderMode === "random");

  React.useLayoutEffect(() => { try { window.scrollTo(0, 0); } catch {} }, []);
  React.useEffect(() => {
    const map = new Map<string, BotLite>();
    // LOTERIE utilise son propre casting IA officiel à la place des BOTS IA PRO de X01.
    (DARTS_LOTERIE_BOTS || []).forEach((bot: any) => map.set(String(bot.id), { ...bot, id: String(bot.id), isBot: true }));
    // Les BOTS CPU personnels restent disponibles. On exclut uniquement les anciens PRO
    // génériques et d'éventuels doublons du casting officiel LOTERIE.
    loadUserBots()
      .filter((bot: any) => !isDartsLoterieBot(bot) && !isLegacyProBot(bot))
      .forEach((bot: any) => map.set(String(bot.id), {
        ...bot,
        id: String(bot.id),
        isBot: true,
        source: "cpu",
        isUserBot: true,
        groupLabel: "CPU Home",
      }));
    setBotProfiles([...map.values()]);
  }, []);
  React.useEffect(() => {
    if (!botProfiles.length) return;
    const allowed = new Set([...humanProfiles, ...botProfiles].map((p: any) => String(p?.id || "")));
    setSelectedIds((previous) => previous.filter((id) => allowed.has(String(id))));
  }, [botProfiles, humanProfiles]);

  React.useEffect(() => {
    if (selectedIds.length || !humanProfiles.length) return;
    const activeId = String(store?.activeProfileId || "");
    const initial = activeId && humanProfiles.some((p) => String(p.id) === activeId)
      ? [activeId]
      : humanProfiles.slice(0, Math.min(2, humanProfiles.length)).map((p) => String(p.id));
    setSelectedIds(initial);
  }, [humanProfiles, selectedIds.length, store?.activeProfileId]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_CFG_KEY, JSON.stringify({
        participantMode, teamsSourceMode, selectedIds, teamAssignments, selectedStoredTeamIds,
        selectedBotTeamIds, savedTeamMemberSelections, botsPanelEnabled, botTeamsPanelEnabled,
        variant, level, autoMode, volleyMode, expressTarget, expressAttempts, missEndsTurn, revealMode, showRemainingNumbers, cardsPerPlayer, cellsPerCard,
        startOrderMode: randomOrder ? "random" : "fixed",
      }));
    } catch {}
  }, [participantMode, teamsSourceMode, selectedIds, teamAssignments, selectedStoredTeamIds, selectedBotTeamIds, savedTeamMemberSelections, botsPanelEnabled, botTeamsPanelEnabled, variant, level, autoMode, volleyMode, expressTarget, expressAttempts, missEndsTurn, revealMode, showRemainingNumbers, cardsPerPlayer, cellsPerCard, randomOrder]);

  const allProfiles = React.useMemo(() => [...humanProfiles, ...botProfiles.map((bot) => ({ ...bot, isBot: true }))], [humanProfiles, botProfiles]);
  const byId = React.useMemo(() => new Map(allProfiles.map((profile: any) => [String(profile.id), profile])), [allProfiles]);
  const selectedProfiles = selectedIds.map((id) => byId.get(String(id))).filter(Boolean) as any[];
  const selectedParticipantItems = selectedProfiles.map((profile: any) => ({
    id: String(profile.id),
    kind: isBotLike(profile) ? "bot" : "player",
    name: nameOf(profile),
    profile,
  }));
  const teamProfiles = React.useMemo(() => [...new Map(allProfiles.map((profile: any) => [String(profile.id), profile])).values()], [allProfiles]);

  const storedDartsTeams: TeamEntity[] = React.useMemo(() => {
    try { return loadTeamsBySport("darts").filter((team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0); }
    catch { return []; }
  }, [storeProfiles.length]);
  const botDartsTeams = React.useMemo(() => buildX01DartsBotTeams(botProfiles), [botProfiles]);
  const selectableDartsTeams = React.useMemo(() => [...storedDartsTeams, ...botDartsTeams], [storedDartsTeams, botDartsTeams]);

  const selectedStoredTeams = React.useMemo(() => (selectedStoredTeamIds || []).map((rawId: any, index: number) => {
    const baseId = teamBaseId(rawId);
    const occurrence = (selectedStoredTeamIds || []).slice(0, index).filter((id: any) => teamBaseId(id) === baseId).length;
    const team = storedDartsTeams.find((candidate: any) => String(candidate.id) === baseId) || findRememberedGeneratedTeam(baseId);
    if (!team) return null;
    const suffix = teamSuffix(occurrence);
    return { ...team, id: occurrence > 0 ? `${baseId}__slot_${suffix}` : baseId, baseTeamId: baseId, sourceTeamId: baseId, teamSlotLabel: suffix, name: team.name };
  }).filter(Boolean), [storedDartsTeams, selectedStoredTeamIds]);

  const selectedBotTeams = React.useMemo(() => {
    if (!botTeamsPanelEnabled) return [];
    return (selectedBotTeamIds || []).map((rawId: any, index: number) => {
      const baseId = teamBaseId(rawId);
      const occurrence = (selectedBotTeamIds || []).slice(0, index).filter((id: any) => teamBaseId(id) === baseId).length;
      const team = botDartsTeams.find((candidate: any) => String(candidate.id) === baseId);
      if (!team) return null;
      const suffix = teamSuffix(occurrence);
      return { ...team, id: occurrence > 0 ? `${baseId}__slot_${suffix}` : baseId, baseTeamId: baseId, sourceTeamId: baseId, teamSlotLabel: suffix, name: team.name };
    }).filter(Boolean);
  }, [botDartsTeams, selectedBotTeamIds, botTeamsPanelEnabled]);
  const selectedSavedTeams = React.useMemo(() => [...selectedStoredTeams, ...selectedBotTeams], [selectedStoredTeams, selectedBotTeams]);

  function togglePlayer(idRaw: string) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        setTeamAssignments((assignments) => { const next = { ...assignments }; delete next[id]; return next; });
        return previous.filter((value) => value !== id);
      }
      if (previous.length >= 12) return previous;
      return [...previous, id];
    });
  }
  function setPlayerTeam(playerId: string, teamId: TeamId) {
    setTeamAssignments((previous) => ({ ...previous, [playerId]: previous[playerId] === teamId ? null : teamId }));
  }
  function toggleSavedTeamMember(teamIdRaw: string, playerIdRaw: string) {
    const instanceId = String(teamIdRaw || "");
    const baseId = teamBaseId(instanceId);
    const playerId = String(playerIdRaw || "");
    const team = selectableDartsTeams.find((candidate: any) => String(candidate.id) === baseId) || findRememberedGeneratedTeam(baseId);
    const allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    setSavedTeamMemberSelections((previous) => {
      const current = Array.isArray(previous[instanceId]) ? previous[instanceId].map(String) : allIds;
      return { ...previous, [instanceId]: current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId] };
    });
  }
  function ensureTeamMembers(instanceId: string, teams: any[]) {
    setSavedTeamMemberSelections((previous) => {
      if (Array.isArray(previous[instanceId])) return previous;
      const baseId = teamBaseId(instanceId);
      const team = teams.find((candidate: any) => String(candidate.id || candidate.baseTeamId) === baseId) || findRememberedGeneratedTeam(baseId);
      return { ...previous, [instanceId]: uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []) };
    });
  }
  function addStoredTeamSelection(teamIdRaw: string, playerIds: string[]) {
    const baseId = String(teamIdRaw || "");
    const picked = uniqueIds(playerIds);
    if (!baseId || !picked.length) return;
    setSelectedStoredTeamIds((previous) => {
      if (previous.length >= 4) return previous;
      const same = previous.filter((id) => teamBaseId(id) === baseId);
      const instanceId = same.length ? `${baseId}__slot_${teamSuffix(same.length)}` : baseId;
      setSavedTeamMemberSelections((old) => ({ ...old, [instanceId]: picked }));
      return [...previous, instanceId];
    });
  }
  function removeStoredTeamSelection(instanceIdRaw: string) {
    const instanceId = String(instanceIdRaw || "");
    setSelectedStoredTeamIds((previous) => previous.filter((id) => String(id) !== instanceId));
    setSavedTeamMemberSelections((previous) => { const next = { ...previous }; delete next[instanceId]; return next; });
  }
  function toggleStoredTeam(teamIdRaw: string) {
    const baseId = String(teamIdRaw || "");
    const team = storedDartsTeams.find((candidate: any) => String(candidate.id) === baseId);
    const allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    addStoredTeamSelection(baseId, allIds);
    ensureTeamMembers(baseId, storedDartsTeams);
  }
  function addBotTeamSelection(teamIdRaw: string, playerIds: string[]) {
    const baseId = String(teamIdRaw || "");
    const picked = uniqueIds(playerIds);
    if (!baseId || !picked.length) return;
    setSelectedBotTeamIds((previous) => {
      if (previous.length >= 4) return previous;
      const same = previous.filter((id) => teamBaseId(id) === baseId);
      const instanceId = same.length ? `${baseId}__slot_${teamSuffix(same.length)}` : baseId;
      setSavedTeamMemberSelections((old) => ({ ...old, [instanceId]: picked }));
      return [...previous, instanceId];
    });
  }
  function removeBotTeamSelection(instanceIdRaw: string) {
    const instanceId = String(instanceIdRaw || "");
    setSelectedBotTeamIds((previous) => previous.filter((id) => String(id) !== instanceId));
    setSavedTeamMemberSelections((previous) => { const next = { ...previous }; delete next[instanceId]; return next; });
  }
  function toggleBotTeam(teamIdRaw: string) {
    const baseId = String(teamIdRaw || "");
    const team = botDartsTeams.find((candidate: any) => String(candidate.id) === baseId);
    addBotTeamSelection(baseId, uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []).slice(0, 4));
  }

  function externalTeamConfig(team: any, index: number): LoterieTeamConfig {
    const instanceId = String(team?.id || `team-${index}`);
    const allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    const playerIds = uniqueIds(Array.isArray(savedTeamMemberSelections[instanceId]) ? savedTeamMemberSelections[instanceId] : allIds).filter((id) => byId.has(id));
    return {
      id: instanceId,
      name: String(team?.name || `Équipe ${index + 1}`),
      color: team?.color || TEAM_COLOR_CYCLE[index % TEAM_COLOR_CYCLE.length],
      logoDataUrl: team?.logoDataUrl ?? team?.logoUrl ?? team?.avatarDataUrl ?? null,
      playerIds,
      isBotTeam: Boolean(team?.isBotTeam),
    };
  }

  const manualTeamConfigs = React.useMemo(() => {
    const manual = TEAM_IDS.map((teamId) => ({
      id: teamId,
      name: TEAM_LABELS[teamId],
      color: TEAM_COLORS[teamId],
      playerIds: selectedIds.filter((playerId) => teamAssignments[playerId] === teamId),
    })).filter((team) => team.playerIds.length > 0);
    const bots = selectedBotTeams.map(externalTeamConfig).filter((team) => team.playerIds.length > 0);
    return [...manual, ...bots];
  }, [selectedIds, teamAssignments, selectedBotTeams, savedTeamMemberSelections, byId]);
  const savedTeamConfigs = React.useMemo(() => (teamsSourceMode === "auto" ? selectedStoredTeams : selectedSavedTeams).map(externalTeamConfig).filter((team) => team.playerIds.length > 0), [teamsSourceMode, selectedStoredTeams, selectedSavedTeams, savedTeamMemberSelections, byId]);
  const activeTeamConfigs: LoterieTeamConfig[] = teamsSourceMode === "manual" ? manualTeamConfigs : savedTeamConfigs;
  const teamPlayerIds = activeTeamConfigs.flatMap((team) => team.playerIds);
  const uniqueTeamPlayerIds = uniqueIds(teamPlayerIds);
  const validPlayers = selectedIds.length >= 1 && selectedIds.length <= 12;
  const validTeams = activeTeamConfigs.length >= 2 && activeTeamConfigs.length <= 4 && activeTeamConfigs.every((team) => team.playerIds.length >= 1 && team.playerIds.length <= 4) && uniqueTeamPlayerIds.length === teamPlayerIds.length;
  const validSelection = participantMode === "players" ? validPlayers : validTeams;
  const selectedBotCount = selectedProfiles.filter(isBotLike).length;

  const selectionError = participantMode === "players"
    ? "Sélectionne entre 1 et 12 joueurs ou BOTS IA."
    : activeTeamConfigs.length < 2
      ? "Sélectionne ou compose au moins 2 équipes."
      : activeTeamConfigs.length > 4
        ? "LOTERIE accepte jusqu’à 4 équipes."
        : uniqueTeamPlayerIds.length !== teamPlayerIds.length
          ? "Un même profil ne peut pas jouer dans plusieurs équipes."
          : "Chaque équipe doit contenir de 1 à 4 membres.";

  const selectorCard: React.CSSProperties = {
    width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", overflow: "hidden",
    background: "rgba(10,12,24,.96)", borderRadius: 18, padding: "16px 12px", marginBottom: 12,
    boxShadow: "0 16px 40px rgba(0,0,0,.55)", border: `1px solid ${primary}33`,
  };
  const panel: React.CSSProperties = {
    width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", borderRadius: 18,
    padding: 12, background: "linear-gradient(180deg, rgba(255,255,255,.065), rgba(0,0,0,.28))",
    border: "1px solid rgba(255,255,255,.10)", overflow: "hidden",
  };

  const participantsBlock = (
    <>
      <section style={selectorCard}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 950, color: primary, marginBottom: 10 }}>Participants</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <PillButton label="Joueurs" active={participantMode === "players"} onClick={() => setParticipantMode("players")} primary={primary} primarySoft={primarySoft} />
          <PillButton label="Équipes" active={participantMode === "teams"} onClick={() => setParticipantMode("teams")} primary={primary} primarySoft={primarySoft} />
        </div>
        {participantMode === "players" ? (
          <>
            <SelectedParticipantsCompactBlock items={selectedParticipantItems} accent={primary} onRemove={togglePlayer} allProfiles={humanProfiles} />
            <PlayerPagedSelector usageMode="loterie" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary={false} />
            <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>1 à 12 profils. Même sélecteur de profils que X01.</p>
          </>
        ) : (
          <TeamsSection
            profiles={teamProfiles}
            selectableProfiles={humanProfiles}
            selectedIds={selectedIds}
            teamAssignments={teamAssignments}
            setPlayerTeam={setPlayerTeam}
            togglePlayer={togglePlayer}
            playerDartSets={{}}
            handleChangePlayerDartSet={undefined}
            allProfiles={humanProfiles}
            sourceMode={teamsSourceMode}
            setSourceMode={setTeamsSourceMode}
            storedTeams={storedDartsTeams}
            selectedStoredTeamIds={selectedStoredTeamIds}
            toggleStoredTeam={toggleStoredTeam}
            addStoredTeamSelection={addStoredTeamSelection}
            removeStoredTeamSelection={removeStoredTeamSelection}
            botTeams={botDartsTeams}
            botTeamsPanelEnabled={botTeamsPanelEnabled}
            setBotTeamsPanelEnabled={setBotTeamsPanelEnabled}
            selectedBotTeamIds={selectedBotTeamIds}
            toggleBotTeam={toggleBotTeam}
            removeBotTeamSelection={removeBotTeamSelection}
            savedTeamMemberSelections={savedTeamMemberSelections}
            toggleSavedTeamMember={toggleSavedTeamMember}
            primary={primary}
            primarySoft={primarySoft}
          />
        )}
        <div style={{ marginTop: 12, borderRadius: 14, padding: "9px 11px", border: `1px solid ${validSelection ? primary + "55" : "rgba(255,120,150,.28)"}`, background: validSelection ? `${primary}0d` : "rgba(255,80,120,.07)" }}>
          <div style={{ color: validSelection ? primary : "#ffb2c8", fontSize: 11.5, fontWeight: 950 }}>
            {validSelection ? (participantMode === "teams" ? `Sélection prête · ${activeTeamConfigs.length} équipes` : `Sélection prête · ${selectedIds.length} participant${selectedIds.length > 1 ? "s" : ""}`) : selectionError}
          </div>
        </div>
      </section>

      {participantMode === "players" ? (
        <section style={{ ...selectorCard, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 950, color: primary, margin: 0 }}>Bots IA</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" aria-pressed={botsPanelEnabled} onClick={() => setBotsPanelEnabled((value) => !value)} style={{ padding: "7px 11px", borderRadius: 999, border: `1px solid ${primary}88`, background: botsPanelEnabled ? `${primary}18` : "rgba(255,255,255,.04)", color: primary, fontWeight: 900, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}>{botsPanelEnabled ? "☑ ON" : "☐ OFF"}</button>
              <button type="button" onClick={() => typeof go === "function" && go("profiles_bots")} style={{ padding: "7px 11px", borderRadius: 999, border: `1px solid ${primary}`, background: "rgba(255,255,255,.04)", color: primary, fontWeight: 900, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}>Gérer les BOTS</button>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>Choisis parmi les 7 BOTS IA officiels de LOTERIE ou ajoute tes BOTS CPU personnels.</p>
          {botsPanelEnabled ? <BotPagedSelector bots={botProfiles as any} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} label="BOTS IA LOTERIE / CPU" showCheckbox={false} showSelectedSummary={false} /> : null}
          {selectedBotCount > 0 ? <div style={{ marginTop: 10, color: textSoft, fontSize: 10.5 }}>Les BOTS jouent automatiquement pendant la partie LOTERIE.</div> : null}
        </section>
      ) : null}
    </>
  );

  const modeBlock = (
    <Section title="MODE DE JEU">
      <div style={{ ...panel, display: "grid", gap: 7 }}>
        <CompactConfigSelect
          label="Mode"
          helpTitle="Mode LOTERIE"
          help={<> <b>Volée</b> : le total de 1 à 3 fléchettes est recherché sur les cartons. <b>EXPRESS</b> : vise un Simple, Double ou Triple exact avec 1 essai ou jusqu'à 3 essais.</>}
          value={variant}
          options={[{ value: "classic", label: "Volée" }, { value: "express", label: "EXPRESS" }]}
          onChange={(value: any) => setVariant(value as LoterieVariant)}
          color={primary}
        />
        {variant === "classic" ? <>
          <CompactConfigSelect
            label="Niveau"
            helpTitle="Niveau / plage"
            help={<>Détermine le score maximum pouvant apparaître sur les cartons. <b>AUTO</b> utilise l'AVG3D du participant.</>}
            value={level}
            options={[
              { value: "auto", label: "AUTO (AVG3D)" },
              { value: "beginner", label: "★ (45)" },
              { value: "leisure", label: "★★ (60)" },
              { value: "intermediate", label: "★★★ (80)" },
              { value: "confirmed", label: "★★★★ (100)" },
              { value: "expert", label: "★★★★★ (120)" },
            ]}
            onChange={(value: any) => setLevel(value as LoterieLevel)}
            color={primary}
          />
          {level === "auto" ? <CompactConfigSelect
            label="AUTO"
            helpTitle="Réglage AUTO"
            help={<><b>Équilibré</b> : chaque participant obtient une plage adaptée à son AVG3D. <b>Identique</b> : tous utilisent la même plage calculée pour le groupe.</>}
            value={autoMode}
            options={[{ value: "balanced", label: "Équilibré" }, { value: "common", label: "Identique" }]}
            onChange={(value: any) => setAutoMode(value as LoterieAutoMode)}
            color={primary}
          /> : null}
          <CompactConfigSelect
            label="Volée"
            helpTitle="Validation de la volée"
            help={<><b>3 darts</b> : trois fléchettes obligatoires, validation automatique à la 3e. <b>Libre</b> : possibilité de valider après 1, 2 ou 3 fléchettes.</>}
            value={volleyMode}
            options={[{ value: "strict3", label: "3 darts" }, { value: "free", label: "Libre" }]}
            onChange={(value: any) => setVolleyMode(value as LoterieVolleyMode)}
            color={primary}
          />
        </> : <>
          <CompactConfigSelect
            label="Cible"
            helpTitle="Cible EXPRESS"
            help={<>Choisis ce qui valide une case en mode <b>EXPRESS</b> : simple exact, double exact ou triple exact.</>}
            value={expressTarget}
            options={[{ value: "simple", label: "Simple" }, { value: "double", label: "Double" }, { value: "triple", label: "Triple" }]}
            onChange={(value: any) => setExpressTarget(value as LoterieExpressTarget)}
            color={primary}
          />
          <CompactConfigSelect
            label="Essais"
            helpTitle="Nombre d'essais EXPRESS"
            help={<><b>1 fléchette</b> : un seul essai puis joueur suivant. <b>Jusqu'à 3</b> : tu rejoues tant que la cible S / D / T demandée n'est pas touchée ; le tour s'arrête immédiatement dès qu'elle est réussie.</>}
            value={expressAttempts}
            options={[{ value: "one", label: "1 fléchette" }, { value: "up_to_3", label: "Jusqu'à 3 essais" }]}
            onChange={(value: any) => setExpressAttempts(value as LoterieExpressAttempts)}
            color={primary}
          />
          <CompactConfigSelect
            label="MISS"
            helpTitle="MISS = fin de tour"
            help={<>Si activé, un <b>MISS</b> affiche la carte MISS et fait passer immédiatement au joueur suivant, même lorsqu'il restait des essais.</>}
            value={missEndsTurn ? "yes" : "no"}
            options={[{ value: "no", label: "Consomme un essai" }, { value: "yes", label: "Passe le tour immédiatement" }]}
            onChange={(value: any) => setMissEndsTurn(value === "yes")}
            color={primary}
          />
        </>}
      </div>
    </Section>
  );

  const cardsBlock = (
    <Section title="CARTONS">
      <div style={panel}>
        <OptionRow label="Cartons / participant"><OptionSelect value={cardsPerPlayer} options={[1, 2, 3, 4]} onChange={(value: any) => setCardsPerPlayer(Number(value) as any)} /></OptionRow>
        <OptionRow label="Cases / carton"><OptionSelect value={cellsPerCard} options={[5, 10, 15]} onChange={(value: any) => setCellsPerCard(Number(value) as any)} /></OptionRow>
        <div style={{ marginTop: 8, color: textSoft, fontSize: 10.5, lineHeight: 1.4 }}>Le premier carton entièrement découvert gagne. Un même résultat peut ouvrir plusieurs cartons s’il y apparaît plusieurs fois.</div>
      </div>
    </Section>
  );

  const rulesBlock = (
    <Section title="RÈGLES DE PARTIE">
      <div style={{ ...panel, display: "grid", gap: 7 }}>
        <CompactConfigSelect
          label="Ordre"
          helpTitle="Ordre de départ"
          help={<><b>Défini</b> conserve exactement l'ordre de sélection des joueurs. <b>Aléatoire</b> mélange les participants au lancement.</>}
          value={randomOrder ? "random" : "fixed"}
          options={[{ value: "fixed", label: "Défini" }, { value: "random", label: "Aléatoire" }]}
          onChange={(value: any) => setRandomOrder(value === "random")}
          color={primary}
        />
        <CompactConfigSelect
          label="Attribution"
          helpTitle="Attribution des scores"
          help={<><b>Personnelle</b> : le score découvert ne compte que pour le joueur ou l'équipe active. <b>Commune</b> : chaque score réalisé compte pour tous les joueurs / équipes, pour une version encore plus loterie.</>}
          value={revealMode}
          options={[{ value: "self", label: "Personnelle" }, { value: "all", label: "Commune · pour tous" }]}
          onChange={(value: any) => setRevealMode(value as LoterieRevealMode)}
          color={primary}
        />
        <CompactConfigSelect
          label="Aide"
          helpTitle="Numéros restants"
          help={<>Affiche dans le bloc flottant <b>DERNIERS SCORES</b> les cibles encore cachées sur chaque carton. <b>Masqués</b> conserve l'effet loterie ; <b>Affichés</b> transforme le bloc en aide de jeu.</>}
          value={showRemainingNumbers ? "shown" : "hidden"}
          options={[{ value: "hidden", label: "Numéros restants masqués" }, { value: "shown", label: "Afficher les numéros restants" }]}
          onChange={(value: any) => setShowRemainingNumbers(value === "shown")}
          color={primary}
        />
      </div>
    </Section>
  );

  const summaryBlock = (
    <section style={{ ...selectorCard, border: `1px solid ${primary}55` }}>
      <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${primary}55`, background: "rgba(255,255,255,.03)" }}><img src={scratchTicketPreview} alt="Carton LOTERIE" style={{ display: "block", width: "100%" }} /></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: primary, fontSize: 12.5, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .8 }}>Résumé LOTERIE</div>
          <div style={{ display: "grid", gap: 6, marginTop: 9, fontSize: 11.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Participants</span><b style={{ textAlign: "right" }}>{participantMode === "teams" ? `${activeTeamConfigs.length} équipes` : `${selectedIds.length} joueurs/BOTS`}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Mode</span><b style={{ textAlign: "right" }}>{variant === "classic" ? (volleyMode === "strict3" ? "LOTERIE · 3 darts" : "LOTERIE · volée libre") : `EXPRESS · ${expressTarget.toUpperCase()} · ${expressAttempts === "up_to_3" ? "3 ESSAIS" : "1 ESSAI"}`}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Cartons</span><b>{cardsPerPlayer} × {cellsPerCard} cases</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Niveau</span><b style={{ textAlign: "right" }}>{variant === "classic" ? String(level).toUpperCase() : "CIBLE EXACTE"}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Attribution</span><b style={{ textAlign: "right" }}>{revealMode === "all" ? "COMMUNE" : "PERSONNELLE"}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Aide</span><b style={{ textAlign: "right" }}>{showRemainingNumbers ? "NUMÉROS RESTANTS AFFICHÉS" : "MASQUÉE"}</b></div>
            {variant === "express" ? <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>MISS</span><b style={{ textAlign: "right" }}>{missEndsTurn ? "PASSE LE TOUR" : "CONTINUE"}</b></div> : null}
          </div>
        </div>
      </div>
      {!validSelection ? <div style={{ marginTop: 10, fontSize: 11.5, color: "#ff9aa7", fontWeight: 850, textAlign: "center" }}>{selectionError}</div> : null}
    </section>
  );

  function selectConfigViewMode(mode: ConfigViewMode) {
    setConfigViewMode(mode);
    try { localStorage.setItem("dc_loterie_config_view_mode", mode); } catch {}
  }

  function backToGames() {
    if (typeof props?.onBack === "function") return props.onBack();
    if (typeof go === "function") go("games");
  }

  function startGame() {
    if (!validSelection) return;
    const config: LoterieConfigType & any = {
      variant, level, autoMode, volleyMode, expressTarget, expressAttempts, missEndsTurn, revealMode, showRemainingNumbers, cardsPerPlayer, cellsPerCard,
      startOrderMode: randomOrder ? "random" : "fixed",
      participantMode,
    };

    let participants: any[] = [];
    if (participantMode === "players") {
      participants = selectedProfiles.map((profile: any) => ({
        ...profile,
        id: String(profile.id),
        name: nameOf(profile),
        avatarDataUrl: avatarOf(profile),
        avg3: avg3Of(profile),
        isBot: isBotLike(profile),
      }));
    } else {
      participants = activeTeamConfigs.map((team: LoterieTeamConfig, index: number) => {
        const members = team.playerIds.map((id) => byId.get(String(id))).filter(Boolean);
        const avgValues = members.map(avg3Of).filter((v) => v > 0);
        return {
          id: `team:${team.id}`,
          teamId: team.id,
          name: team.name,
          displayName: team.name,
          avatarDataUrl: team.logoDataUrl || null,
          avatarUrl: team.logoDataUrl || null,
          color: team.color || TEAM_COLOR_CYCLE[index % TEAM_COLOR_CYCLE.length],
          memberIds: [...team.playerIds],
          members: members.map((m: any) => ({
            id: String(m.id),
            name: nameOf(m),
            displayName: nameOf(m),
            avatarDataUrl: avatarOf(m),
            avatarUrl: avatarOf(m),
            avg3: avg3Of(m),
            isBot: isBotLike(m),
          })),
          avg3: avgValues.length ? avgValues.reduce((a, b) => a + b, 0) / avgValues.length : 0,
          isTeam: true,
          // Une équipe mixte reste pilotable manuellement : seul le membre actif décide
          // si le tour doit être joué automatiquement par un BOT.
          isBot: Boolean(team.isBotTeam) && members.length > 0 && members.every(isBotLike),
        };
      });
    }

    const ordered = randomOrder ? shuffle(participants) : participants;
    try { recordProfileUsageForMode("loterie", participantMode === "players" ? selectedIds : uniqueIds(activeTeamConfigs.flatMap((team) => team.playerIds))); } catch {}
    try { unlockAudio(); } catch {}
    if (typeof go === "function") go("loterie_play", { config, players: ordered, participantMode, teamConfigs: activeTeamConfigs, createdAt: Date.now() });
  }

  return (
    <div style={{ minHeight: "100dvh", width: "100%", maxWidth: "100%", overflowX: "hidden", paddingBottom: 92 }}>
      <PageHeader
        tickerSrc={tickerLoterie}
        tickerAlt="LOTERIE"
        tickerHeight={92}
        tickerFit="cover"
        tickerBottomGap={10}
        left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToGames} color={primary} glow={`${primary}88`} title="Retour" /></div>}
        right={<div style={{ marginRight: 6 }}><InfoDot title="Règles LOTERIE" color={theme?.accent1 || primary} glow={`${theme?.accent1 || primary}77`} content={<RulesContent />} /></div>}
      />

      <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", padding: "8px 8px 0", overflowX: "hidden" }}>
        <section style={{ ...selectorCard, border: `1px solid ${primary}66`, boxShadow: `0 0 24px ${primary}18, 0 14px 34px rgba(0,0,0,.48)` }}>
          <div style={{ color: primary, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configuration LOTERIE</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="Guidée" active={configViewMode === "guided"} onClick={() => selectConfigViewMode("guided")} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Complète" active={configViewMode === "complete"} onClick={() => selectConfigViewMode("complete")} primary={primary} primarySoft={primarySoft} />
          </div>
          <div style={{ marginTop: 8, color: textSoft, fontSize: 11, lineHeight: 1.35 }}>Guidée : les choix essentiels étape par étape. Complète : tous les paramètres sur une seule page.</div>
        </section>

        {configViewMode === "guided" ? (
          <section style={{ ...selectorCard, border: `1px solid ${primary}55`, boxShadow: `0 0 22px ${primary}16, 0 14px 34px rgba(0,0,0,.48)` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
              <div>
                <div style={{ color: primary, fontSize: 12.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>Configuration guidée</div>
                <div style={{ marginTop: 3, color: textSoft, fontSize: 10.5 }}>Étape {guidedStep + 1}/{guidedSteps.length} · {guidedSteps[guidedStep]}</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {guidedSteps.map((label, idx) => <button key={label} type="button" onClick={() => setGuidedStep(idx)} title={label} style={{ width: 25, height: 25, borderRadius: 999, border: `1px solid ${idx === guidedStep ? primary : "rgba(255,255,255,.10)"}`, background: idx === guidedStep ? primarySoft : idx < guidedStep ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)", color: idx === guidedStep ? primary : "#aeb2d3", fontSize: 9.5, fontWeight: 950, cursor: "pointer" }}>{idx + 1}</button>)}
              </div>
            </div>
            <div style={{ height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}><div style={{ width: `${((guidedStep + 1) / guidedSteps.length) * 100}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${primary}, ${accent2})`, transition: "width .18s ease" }} /></div>
          </section>
        ) : null}

        {configViewMode === "guided" ? (
          <>
            {guidedStep === 0 ? participantsBlock : null}
            {guidedStep === 1 ? modeBlock : null}
            {guidedStep === 2 ? cardsBlock : null}
            {guidedStep === 3 ? rulesBlock : null}
            {guidedStep === 4 ? summaryBlock : null}
            <div style={{ display: "flex", gap: 9, margin: "0 0 12px" }}>
              <button type="button" onClick={() => setGuidedStep((step) => Math.max(0, step - 1))} disabled={guidedStep === 0} style={{ flex: 1, height: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: guidedStep === 0 ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.065)", color: guidedStep === 0 ? "#565b76" : "#fff", fontWeight: 950 }}>← Précédent</button>
              <button type="button" onClick={() => setGuidedStep((step) => Math.min(guidedMaxStep, step + 1))} disabled={guidedStep === guidedMaxStep} style={{ flex: 1, height: 42, borderRadius: 999, border: `1px solid ${primary}`, background: guidedStep === guidedMaxStep ? "rgba(255,255,255,.025)" : primarySoft, color: guidedStep === guidedMaxStep ? "#565b76" : primary, fontWeight: 950 }}>Suivant →</button>
            </div>
          </>
        ) : (
          <>
            {participantsBlock}
            {modeBlock}
            {cardsBlock}
            {rulesBlock}
            {summaryBlock}
          </>
        )}

        {(configViewMode === "complete" || guidedStep === guidedMaxStep) ? (
          <div style={{ padding: "4px 4px 14px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            <button type="button" disabled={!validSelection} onClick={startGame} style={{ width: "100%", minHeight: 52, borderRadius: 999, border: validSelection ? `1px solid ${primary}cc` : "1px solid rgba(255,255,255,.10)", background: validSelection ? `linear-gradient(90deg, ${primary}, ${accent2})` : "rgba(255,255,255,.06)", color: validSelection ? "#071018" : "rgba(255,255,255,.48)", boxShadow: validSelection ? `0 0 20px ${primary}55, 0 10px 24px rgba(0,0,0,.40)` : "0 10px 24px rgba(0,0,0,.40)", fontWeight: 1100, letterSpacing: 1.1, cursor: validSelection ? "pointer" : "not-allowed" }}>DÉMARRER LOTERIE</button>
            {!validSelection ? <div style={{ marginTop: 9, fontSize: 12, color: "#ff9aa7", fontWeight: 850, textAlign: "center" }}>{selectionError}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
