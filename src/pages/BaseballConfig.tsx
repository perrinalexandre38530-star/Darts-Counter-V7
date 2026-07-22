// @ts-nocheck
// =============================================================
// BASEBALL DARTS — configuration complète
// Sélecteur JOUEURS / ÉQUIPES partagé avec X01
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import OptionToggle from "../components/OptionToggle";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import Section from "../components/Section";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";
import type {
  BaseballBullTargetMode,
  BaseballConfigPayload,
  BaseballParticipantMode,
  BaseballSeventhInningRule,
  BaseballTeamConfig,
} from "../lib/gameEngines/baseballEngine";
import { findRememberedGeneratedTeam } from "../lib/teamAutoShuffle";
import { loadTeamsBySport, type TeamEntity } from "../lib/petanqueTeamsStore";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import {
  BotTeamsSection,
  PillButton,
  SelectedParticipantsCompactBlock,
  TeamsSection,
  X01_PRO_BOTS,
  buildX01DartsBotTeams,
  x01MostUsedDartSetIdForProfile,
} from "./X01ConfigV3";

import tickerBaseball from "../assets/tickers/ticker_baseball.png";

type BotLevel = "easy" | "normal" | "hard";
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
};

export type { BaseballConfigPayload } from "../lib/gameEngines/baseballEngine";

const LS_CFG_KEY = "dc_modecfg_baseball_v3";
const CYAN = "#42d6ff";
const GOLD = "#ffd76a";
const GREEN = "#6ef3b2";
const TEAM_IDS: TeamId[] = ["gold", "pink", "blue", "green"];
const TEAM_LABELS: Record<TeamId, string> = {
  gold: "Team Gold",
  pink: "Team Pink",
  blue: "Team Blue",
  green: "Team Green",
};
const TEAM_COLORS: Record<TeamId, string> = {
  gold: "#f7c85c",
  pink: "#ff4fa2",
  blue: "#4fc3ff",
  green: "#6dff7c",
};
const TEAM_COLOR_CYCLE = ["#ff4fa2", "#ffd76a", "#42d6ff", "#6dff7c"];

function loadUserBots(): BotLite[] {
  try {
    return loadBotPlayers()
      .map((bot: any) => ({
        id: String(bot.id),
        name: bot?.name || "BOT",
        avatarDataUrl: bot?.avatarDataUrl ?? bot?.avatarUrl ?? bot?.avatar ?? null,
        avatarUrl: bot?.avatarUrl ?? bot?.avatar ?? null,
        avatar: bot?.avatar ?? bot?.avatarUrl ?? bot?.avatarDataUrl ?? null,
        botLevel: bot?.botLevel ?? bot?.level ?? "",
        isBot: true,
      }))
      .filter((bot: BotLite) => Boolean(bot.id));
  } catch {
    return [];
  }
}

function isBotLike(profile: any) {
  return Boolean(
    profile?.isBot || profile?.bot || profile?.type === "bot" ||
    profile?.kind === "bot" || profile?.botLevel
  );
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

function interleaveTeams(teams: BaseballTeamConfig[]): string[] {
  const out: string[] = [];
  const max = Math.max(0, ...teams.map((team) => team.playerIds.length));
  for (let memberIndex = 0; memberIndex < max; memberIndex += 1) {
    for (const team of teams) {
      if (team.playerIds[memberIndex]) out.push(team.playerIds[memberIndex]);
    }
  }
  return out;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const picked = Math.floor(Math.random() * (index + 1));
    [out[index], out[picked]] = [out[picked], out[index]];
  }
  return out;
}

function RulesContent({ primary = CYAN, accent = GOLD }: { primary?: string; accent?: string }) {
  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.45 }}>
      <div><strong style={{ color: primary }}>PRINCIPE</strong><br />Chaque manche tire une cible aléatoire parmi 1 à 20, sans répétition tant que possible. Seule la cible affichée marque des runs.</div>
      <div><strong style={{ color: accent }}>COMPTAGE</strong><br />Simple = 1 run, Double = 2 runs, Triple = 3 runs. Chaque joueur lance 3 fléchettes par manche ; toute autre cible vaut 0.</div>
      <div><strong style={{ color: GREEN }}>VICTOIRE</strong><br />Le meilleur total à la fin des manches gagne. En cas d’égalité, les manches supplémentaires utilisent les prochaines cibles du tirage jusqu’au départage ou au cap choisi.</div>
      <div><strong style={{ color: "#ff9bbf" }}>7e MANCHE</strong><br />La variante optionnelle « score divisé par 2 » sanctionne un joueur qui ne marque aucun run pendant la 7e manche.</div>
      <div><strong style={{ color: primary }}>BULL / DBULL</strong><br />Le BULL peut être absent, mélangé au tirage ou imposé à la dernière manche. Sur une manche BULL, BULL = 1 run et DBULL = 2 runs, ou 3 runs en variante « Home Run ».</div>
      <div><strong style={{ color: primary }}>ÉQUIPES</strong><br />Les runs des joueurs d’une même équipe sont additionnés. Les équipes doivent avoir le même nombre de joueurs pour conserver le même nombre de passages.</div>
      <div style={{ color: "#aab1ca" }}>Le sélecteur reprend celui de X01 : profils, équipes enregistrées, brassage temporaire, BOTS IA et jeux de fléchettes.</div>
    </div>
  );
}

export default function BaseballConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store ?? null;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSavedConfig, []);
  const primary = theme?.primary || CYAN;
  const primarySoft = theme?.primarySoft || "rgba(66,214,255,.14)";
  const storeProfiles: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = React.useMemo(() => storeProfiles.filter((profile) => !isBotLike(profile)), [storeProfiles]);

  const [participantMode, setParticipantMode] = React.useState<BaseballParticipantMode>(saved.participantMode === "teams" ? "teams" : "players");
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<TeamsSourceMode>(saved.teamsSourceMode === "saved" || saved.teamsSourceMode === "auto" ? saved.teamsSourceMode : "manual");
  const [selectedIds, setSelectedIds] = React.useState<string[]>(Array.isArray(saved.selectedIds) ? saved.selectedIds.slice(0, 12).map(String) : []);
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamId | null>>(saved.teamAssignments && typeof saved.teamAssignments === "object" ? saved.teamAssignments : {});
  const [selectedStoredTeamIds, setSelectedStoredTeamIds] = React.useState<string[]>(Array.isArray(saved.selectedStoredTeamIds) ? saved.selectedStoredTeamIds.map(String) : []);
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>(Array.isArray(saved.selectedBotTeamIds) ? saved.selectedBotTeamIds.map(String) : []);
  const [savedTeamMemberSelections, setSavedTeamMemberSelections] = React.useState<Record<string, string[]>>(saved.savedTeamMemberSelections && typeof saved.savedTeamMemberSelections === "object" ? saved.savedTeamMemberSelections : {});
  const [botsPanelEnabled, setBotsPanelEnabled] = React.useState(saved.botsPanelEnabled === true);
  const [botTeamsPanelEnabled, setBotTeamsPanelEnabled] = React.useState(saved.botTeamsPanelEnabled === true);
  const [botLevel, setBotLevel] = React.useState<BotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [innings, setInnings] = React.useState<number>([5, 7, 9, 12, 15, 20].includes(Number(saved.innings)) ? Number(saved.innings) : 9);
  const [extraInnings, setExtraInnings] = React.useState(saved.extraInnings !== false);
  const [maxExtraInnings, setMaxExtraInnings] = React.useState<number>(Number(saved.maxExtraInnings || 3) || 3);
  const [seventhInningRule, setSeventhInningRule] = React.useState<BaseballSeventhInningRule>(saved.seventhInningRule === "halve_on_zero" ? "halve_on_zero" : "none");
  const [bullTargetMode, setBullTargetMode] = React.useState<BaseballBullTargetMode>(saved.bullTargetMode === "off" || saved.bullTargetMode === "final" ? saved.bullTargetMode : "random");
  const [dbullRuns, setDbullRuns] = React.useState<2 | 3>(saved.dbullRuns === 3 ? 3 : 2);
  const [randomOrder, setRandomOrder] = React.useState(Boolean(saved.randomOrder));
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(saved.playerDartSets && typeof saved.playerDartSets === "object" ? saved.playerDartSets : {});
  const [botProfiles, setBotProfiles] = React.useState<BotLite[]>([]);

  React.useLayoutEffect(() => { try { window.scrollTo(0, 0); } catch {} }, []);
  React.useEffect(() => {
    const map = new Map<string, BotLite>();
    (X01_PRO_BOTS || []).forEach((bot: any) => map.set(String(bot.id), { ...bot, id: String(bot.id), isBot: true }));
    loadUserBots().forEach((bot) => map.set(bot.id, { ...bot, isBot: true }));
    setBotProfiles([...map.values()]);
  }, []);
  React.useEffect(() => {
    if (selectedIds.length || !humanProfiles.length) return;
    setSelectedIds(humanProfiles.slice(0, Math.min(2, humanProfiles.length)).map((profile) => String(profile.id)));
  }, [humanProfiles, selectedIds.length]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_CFG_KEY, JSON.stringify({
        participantMode, teamsSourceMode, selectedIds, teamAssignments, selectedStoredTeamIds,
        selectedBotTeamIds, savedTeamMemberSelections, botsPanelEnabled, botTeamsPanelEnabled,
        botLevel, innings, extraInnings, maxExtraInnings, seventhInningRule, bullTargetMode, dbullRuns, randomOrder,
        scoreInputMethod, playerDartSets,
      }));
    } catch {}
  }, [participantMode, teamsSourceMode, selectedIds, teamAssignments, selectedStoredTeamIds, selectedBotTeamIds, savedTeamMemberSelections, botsPanelEnabled, botTeamsPanelEnabled, botLevel, innings, extraInnings, maxExtraInnings, seventhInningRule, bullTargetMode, dbullRuns, randomOrder, scoreInputMethod, playerDartSets]);

  const allProfiles = React.useMemo(() => [...humanProfiles, ...botProfiles.map((bot) => ({ ...bot, isBot: true }))], [humanProfiles, botProfiles]);
  const byId = React.useMemo(() => new Map(allProfiles.map((profile: any) => [String(profile.id), profile])), [allProfiles]);
  const selectedProfiles = selectedIds.map((id) => byId.get(String(id))).filter(Boolean) as any[];
  const selectedParticipantItems = selectedProfiles.map((profile: any) => ({
    id: String(profile.id), kind: isBotLike(profile) ? "bot" : "player",
    name: profile?.name || profile?.displayName || "Joueur", profile,
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

  function handleChangePlayerDartSet(profileId: string, dartSetId: string | null) {
    setPlayerDartSets((previous) => ({ ...previous, [String(profileId)]: dartSetId || null }));
  }

  function togglePlayer(idRaw: string) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        setTeamAssignments((assignments) => { const next = { ...assignments }; delete next[id]; return next; });
        return previous.filter((value) => value !== id);
      }
      if (previous.length >= 12) return previous;
      if (!isBotLike(byId.get(id)) && !playerDartSets[id]) {
        const preferred = x01MostUsedDartSetIdForProfile(id, humanProfiles);
        if (preferred) setPlayerDartSets((sets) => ({ ...sets, [id]: preferred }));
      }
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
    setSelectedStoredTeamIds((previous) => {
      const same = previous.filter((id) => teamBaseId(id) === baseId);
      const used = new Set<string>();
      same.forEach((instanceId) => (savedTeamMemberSelections[String(instanceId)] || []).forEach((id) => used.add(String(id))));
      if (same.length && !allIds.some((id) => !used.has(id))) return previous;
      const instanceId = same.length ? `${baseId}__slot_${teamSuffix(same.length)}` : baseId;
      return [...previous, instanceId];
    });
    ensureTeamMembers(baseId, storedDartsTeams);
  }
  function addBotTeamSelection(teamIdRaw: string, playerIds: string[]) {
    const baseId = String(teamIdRaw || "");
    const picked = uniqueIds(playerIds);
    if (!baseId || !picked.length) return;
    setSelectedBotTeamIds((previous) => {
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
    addBotTeamSelection(baseId, uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []).slice(0, 1));
  }

  function externalTeamConfig(team: any, index: number): BaseballTeamConfig {
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
    const humanTeams = TEAM_IDS.map((teamId) => ({
      id: teamId, name: TEAM_LABELS[teamId], color: TEAM_COLORS[teamId],
      playerIds: selectedIds.filter((playerId) => teamAssignments[playerId] === teamId),
    })).filter((team) => team.playerIds.length > 0);
    const botTeams = selectedBotTeams.map(externalTeamConfig).filter((team) => team.playerIds.length > 0);
    return [...humanTeams, ...botTeams];
  }, [selectedIds, teamAssignments, selectedBotTeams, savedTeamMemberSelections, byId]);
  const savedTeamConfigs = React.useMemo(() => (teamsSourceMode === "auto" ? selectedStoredTeams : selectedSavedTeams).map(externalTeamConfig).filter((team) => team.playerIds.length > 0), [teamsSourceMode, selectedStoredTeams, selectedSavedTeams, savedTeamMemberSelections, byId]);
  const activeTeamConfigs: BaseballTeamConfig[] = teamsSourceMode === "manual" ? manualTeamConfigs : savedTeamConfigs;
  const activeTeamPlayerIds = activeTeamConfigs.flatMap((team) => team.playerIds);
  const activeUniquePlayerIds = uniqueIds(activeTeamPlayerIds);
  const teamSizes = Array.from(new Set(activeTeamConfigs.map((team) => team.playerIds.length)));
  const validPlayers = selectedIds.length >= 1 && selectedIds.length <= 12;
  const validTeams = activeTeamConfigs.length >= 2 && activeTeamConfigs.length <= 4 && teamSizes.length === 1 && teamSizes[0] >= 1 && teamSizes[0] <= 4 && activeUniquePlayerIds.length === activeTeamPlayerIds.length && activeUniquePlayerIds.length <= 12;
  const validSelection = participantMode === "players" ? validPlayers : validTeams;
  const selectedBotCount = selectedProfiles.filter(isBotLike).length;

  const selectionError = React.useMemo(() => {
    if (participantMode === "players") return "Sélectionne entre 1 et 12 joueurs ou BOTS IA.";
    if (activeTeamConfigs.length < 2) return "Sélectionne au moins 2 équipes.";
    if (activeTeamConfigs.length > 4) return "Le Baseball accepte jusqu’à 4 équipes.";
    if (teamSizes.length !== 1) return "Toutes les équipes doivent contenir le même nombre de joueurs.";
    if (activeUniquePlayerIds.length !== activeTeamPlayerIds.length) return "Un même profil ne peut pas jouer dans plusieurs équipes.";
    return "Compose 2 à 4 équipes de 1 à 4 joueurs, avec 12 participants maximum.";
  }, [participantMode, activeTeamConfigs, teamSizes.length, activeUniquePlayerIds.length, activeTeamPlayerIds.length]);

  function backToGames() {
    if (typeof props?.onBack === "function") return props.onBack();
    if (typeof go === "function") go("games");
  }

  function onStart() {
    if (!validSelection) return;
    const baseIds = participantMode === "teams" ? interleaveTeams(activeTeamConfigs) : [...selectedIds];
    const orderedIds = randomOrder ? shuffle(baseIds) : baseIds;
    const orderedProfiles = orderedIds.map((id) => byId.get(String(id))).filter(Boolean);
    const botIds = orderedProfiles.filter(isBotLike).map((profile: any) => String(profile.id));
    const payload: BaseballConfigPayload = {
      mode: "baseball",
      participantMode,
      players: orderedIds.length,
      selectedIds: orderedIds,
      playersList: orderedProfiles.map((profile: any) => ({
        ...profile, id: String(profile.id), name: profile?.name || profile?.displayName || "Joueur",
        dartSetId: playerDartSets[String(profile.id)] ?? null,
      })),
      teamConfigs: participantMode === "teams" ? activeTeamConfigs.map((team) => ({ ...team, playerIds: [...team.playerIds] })) : undefined,
      playerDartSets,
      botIds,
      botsEnabled: botIds.length > 0,
      botLevel,
      innings,
      extraInnings,
      maxExtraInnings: Math.min(10, Math.max(1, maxExtraInnings)),
      seventhInningRule,
      bullTargetMode,
      dbullRuns,
      randomOrder,
      scoreInputMethod,
    };
    try { recordProfileUsageForMode("baseball", orderedIds); } catch {}
    if (typeof go === "function") go("baseball_play", payload);
  }

  const panel: React.CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", borderRadius: 18, padding: 12, background: "linear-gradient(180deg, rgba(255,255,255,.065), rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.10)", overflow: "hidden" };
  const selectorCard: React.CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", overflow: "hidden", background: "rgba(10,12,24,.96)", borderRadius: 18, padding: "20px 12px 16px", marginBottom: 16, boxShadow: "0 16px 40px rgba(0,0,0,.55)", border: "1px solid rgba(255,255,255,.05)" };

  return (
    <div style={{ minHeight: "100dvh", width: "100%", maxWidth: "100%", overflowX: "hidden", paddingBottom: 92 }}>
      <PageHeader tickerSrc={tickerBaseball} tickerAlt="BASEBALL DARTS" left={<BackDot onClick={backToGames} color={primary} glow={`${primary}88`} title="Retour" />} right={<InfoDot title="Règles du Baseball Darts" color={theme?.accent1 || primary} glow={`${theme?.accent1 || primary}77`} content={<RulesContent primary={primary} accent={theme?.accent1 || primary} />} />} />
      <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", padding: "12px 12px 0", overflowX: "hidden" }}>
        <section style={selectorCard}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, marginBottom: 10 }}>Participants</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <PillButton label="Joueurs" active={participantMode === "players"} onClick={() => setParticipantMode("players")} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Équipes" active={participantMode === "teams"} onClick={() => setParticipantMode("teams")} primary={primary} primarySoft={primarySoft} />
          </div>
          {participantMode === "players" ? (
            <>
              <SelectedParticipantsCompactBlock items={selectedParticipantItems} accent={primary} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleChangePlayerDartSet} allProfiles={humanProfiles} />
              <PlayerPagedSelector usageMode="baseball" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary={false} />
              <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>1 à 12 profils. Le tri privilégie les profils les plus utilisés en Baseball, puis l’ordre alphabétique.</p>
            </>
          ) : (
            <TeamsSection
              profiles={teamProfiles} selectableProfiles={humanProfiles} selectedIds={selectedIds}
              teamAssignments={teamAssignments} setPlayerTeam={setPlayerTeam} togglePlayer={togglePlayer}
              playerDartSets={playerDartSets} handleChangePlayerDartSet={handleChangePlayerDartSet}
              allProfiles={humanProfiles} sourceMode={teamsSourceMode} setSourceMode={setTeamsSourceMode}
              storedTeams={storedDartsTeams} selectedStoredTeamIds={selectedStoredTeamIds}
              toggleStoredTeam={toggleStoredTeam} addStoredTeamSelection={addStoredTeamSelection}
              removeStoredTeamSelection={removeStoredTeamSelection} botTeams={botDartsTeams}
              botTeamsPanelEnabled={botTeamsPanelEnabled} setBotTeamsPanelEnabled={setBotTeamsPanelEnabled}
              selectedBotTeamIds={selectedBotTeamIds} toggleBotTeam={toggleBotTeam}
              removeBotTeamSelection={removeBotTeamSelection} savedTeamMemberSelections={savedTeamMemberSelections}
              toggleSavedTeamMember={toggleSavedTeamMember} primary={primary} primarySoft={primarySoft}
            />
          )}
        </section>

        {participantMode === "players" ? (
          <section style={{ ...selectorCard, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, margin: 0 }}>Bots IA</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" aria-pressed={botsPanelEnabled} onClick={() => setBotsPanelEnabled((value) => !value)} style={{ padding: "7px 11px", borderRadius: 999, border: `1px solid ${primary}88`, background: botsPanelEnabled ? `${primary}18` : "rgba(255,255,255,.04)", color: primary, fontWeight: 900, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}>{botsPanelEnabled ? "☑ ON" : "☐ OFF"}</button>
                <button type="button" onClick={() => typeof go === "function" && go("profiles_bots")} style={{ padding: "7px 11px", borderRadius: 999, border: `1px solid ${primary}`, background: "rgba(255,255,255,.04)", color: primary, fontWeight: 900, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}>Gérer les BOTS</button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>Ajoute les mêmes BOTS IA prédéfinis ou personnels que dans X01.</p>
            {botsPanelEnabled ? <BotPagedSelector bots={botProfiles as any} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} label="BOTS IA" showCheckbox={false} showSelectedSummary={false} /> : null}
            {selectedBotCount > 0 ? <div style={{ marginTop: 10 }}><OptionRow label="Difficulté IA Baseball"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow></div> : null}
          </section>
        ) : teamsSourceMode !== "auto" ? (
          <BotTeamsSection botTeams={botDartsTeams} selectedBotTeamIds={selectedBotTeamIds} toggleBotTeam={toggleBotTeam} addBotTeamSelection={addBotTeamSelection} removeBotTeamSelection={removeBotTeamSelection} botTeamsPanelEnabled={botTeamsPanelEnabled} setBotTeamsPanelEnabled={setBotTeamsPanelEnabled} profiles={teamProfiles} savedTeamMemberSelections={savedTeamMemberSelections} toggleSavedTeamMember={toggleSavedTeamMember} primary={primary} primarySoft={primarySoft} />
        ) : null}

        <Section title="FORMAT DU MATCH">
          <div style={panel}>
            <OptionRow label="Nombre de manches"><OptionSelect value={innings} options={[5, 7, 9, 12, 15, 20]} onChange={(value: any) => setInnings(Number(value) || 9)} /></OptionRow>
            <OptionRow label="Manches supplémentaires"><OptionToggle value={extraInnings} onChange={setExtraInnings} /></OptionRow>
            {extraInnings ? <OptionRow label="Maximum supplémentaire"><OptionSelect value={Math.min(10, Math.max(1, maxExtraInnings))} options={[1, 2, 3, 5, 10]} onChange={(value: any) => setMaxExtraInnings(Number(value) || 1)} /></OptionRow> : null}
            {innings >= 7 ? <OptionRow label="Règle de la 7e manche"><OptionSelect value={seventhInningRule} options={[{ value: "none", label: "Aucune pénalité" }, { value: "halve_on_zero", label: "0 run = score ÷ 2" }]} onChange={setSeventhInningRule} /></OptionRow> : null}
            <OptionRow label="Cible BULL"><OptionSelect value={bullTargetMode} options={[{ value: "off", label: "Jamais" }, { value: "random", label: "Dans le tirage aléatoire" }, { value: "final", label: "Dernière manche réglementaire" }]} onChange={setBullTargetMode} /></OptionRow>
            {bullTargetMode !== "off" ? <OptionRow label="Valeur DBULL"><OptionSelect value={dbullRuns} options={[{ value: 2, label: "2 runs — Standard" }, { value: 3, label: "3 runs — Home Run" }]} onChange={(value: any) => setDbullRuns(Number(value) === 3 ? 3 : 2)} /></OptionRow> : null}
            <OptionRow label="Ordre de passage aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
            <OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Keypad" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
            <div style={{ marginTop: 9, fontSize: 11.5, opacity: .68, lineHeight: 1.35 }}>À chaque partie, les cibles sont tirées aléatoirement parmi 1 à 20 sans répétition. Selon le réglage BULL, le centre peut rejoindre le tirage ou devenir la cible de la dernière manche.</div>
          </div>
        </Section>

        <div style={{ padding: "4px 12px 14px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          <button type="button" className="btn-primary" disabled={!validSelection} onClick={onStart} style={{ width: "100%", minHeight: 48, fontWeight: 1000, letterSpacing: 1.1 }}>DÉMARRER LE BASEBALL</button>
          {!validSelection ? <div style={{ marginTop: 9, fontSize: 12, color: "#ff9aa7", fontWeight: 850, textAlign: "center" }}>{selectionError}</div> : null}
        </div>
      </div>
    </div>
  );
}
