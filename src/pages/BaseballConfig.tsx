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
  BaseballGameVariant,
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
      <div><strong style={{ color: primary }}>MODE CIBLES</strong><br />Chaque manche tire une cible aléatoire parmi 1 à 20, sans répétition tant que possible. Simple = 1 run, Double = 2 runs, Triple = 3 runs.</div>
      <div><strong style={{ color: accent }}>VARIANTE ATTAQUE / DÉFENSE</strong><br />En individuel, ce mode est strictement limité à 2 joueurs : J1 attaque, J2 défend, puis J2 attaque et J1 défend sur la même cible. Pour jouer à plus de 2, il faut utiliser exactement 2 équipes de même taille. Chaque membre attaque et défend une fois sur la cible ; tous les points individuels sont additionnés au score de son équipe pour la manche.</div>
      <div><strong style={{ color: GREEN }}>MISS</strong><br />L’option « MISS = fin du tour » valide immédiatement la volée au premier MISS et passe au rôle/joueur suivant.</div>
      <div><strong style={{ color: primary }}>BULL / DBULL — JAMAIS</strong><br />Aucun effet spécial. En mode cibles, le BULL n’entre jamais dans la rotation par défaut.</div>
      <div><strong style={{ color: "#ff9bbf" }}>BULL — DÉFENSE</strong><br />BULL retire le nombre de points configuré à l’adversaire. DBULL divise son score par 2 ; si le résultat finit par ,5, il est arrondi à l’entier supérieur.</div>
      <div><strong style={{ color: accent }}>BULL — ATTAQUE</strong><br />BULL ajoute le bonus configuré à son propre score. DBULL double son score courant.</div>
      <div><strong style={{ color: primary }}>BULL DANS LE TIRAGE</strong><br />Le BULL devient une cible possible dans la rotation. Sur cette manche, BULL = 3 points et DBULL = 5 points par fléchette, y compris dans la variante Attaque / Défense.</div>
      <div><strong style={{ color: primary }}>ÉQUIPES</strong><br />En Attaque / Défense : 2 équipes maximum et obligatoirement de même taille. Sur chaque cible, tous les joueurs de l’équipe A attaquent d’abord face à leur vis-à-vis de B qui défendent ; ensuite les rôles s’inversent et tous les joueurs de B attaquent. Chaque joueur attaque et défend une fois. Le total de tous les duels gagnés sur la cible forme le score de l’équipe pour cette manche. Les effets BULL/DBULL agissent sur le score global de l’équipe concernée.</div>
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
  const themeTextSoft = theme?.textSoft || "#aeb2d3";
  const [configViewMode, setConfigViewMode] = React.useState<"guided" | "complete">(() => {
    try { return localStorage.getItem("dc_baseball_config_view_mode") === "complete" ? "complete" : "guided"; }
    catch { return "guided"; }
  });
  const [guidedStep, setGuidedStep] = React.useState(0);
  const guidedSteps = ["Participants", "Format", "Variante", "Règles", "Résumé"];
  const guidedMaxStep = guidedSteps.length - 1;
  const selectConfigViewMode = React.useCallback((mode: "guided" | "complete") => {
    setConfigViewMode(mode);
    try { localStorage.setItem("dc_baseball_config_view_mode", mode); } catch {}
  }, []);
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
  const [gameVariant, setGameVariant] = React.useState<BaseballGameVariant>(saved.gameVariant === "attack_defense" ? "attack_defense" : "target");
  const [bullTargetMode, setBullTargetMode] = React.useState<BaseballBullTargetMode>(["defense", "attack", "random"].includes(saved.bullTargetMode) ? saved.bullTargetMode : "off");
  const [bullBonusPoints, setBullBonusPoints] = React.useState<number>(Math.min(20, Math.max(1, Number(saved.bullBonusPoints || 4) || 4)));
  const [missEndsTurn, setMissEndsTurn] = React.useState(saved.missEndsTurn !== false);
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
    if (gameVariant !== "attack_defense" || participantMode !== "players") return;
    setSelectedIds((previous) => previous.length > 2 ? previous.slice(0, 2) : previous);
  }, [gameVariant, participantMode]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_CFG_KEY, JSON.stringify({
        participantMode, teamsSourceMode, selectedIds, teamAssignments, selectedStoredTeamIds,
        selectedBotTeamIds, savedTeamMemberSelections, botsPanelEnabled, botTeamsPanelEnabled,
        botLevel, innings, extraInnings, maxExtraInnings, seventhInningRule, gameVariant, bullTargetMode, bullBonusPoints, missEndsTurn, randomOrder,
        scoreInputMethod, playerDartSets,
      }));
    } catch {}
  }, [participantMode, teamsSourceMode, selectedIds, teamAssignments, selectedStoredTeamIds, selectedBotTeamIds, savedTeamMemberSelections, botsPanelEnabled, botTeamsPanelEnabled, botLevel, innings, extraInnings, maxExtraInnings, seventhInningRule, gameVariant, bullTargetMode, bullBonusPoints, missEndsTurn, randomOrder, scoreInputMethod, playerDartSets]);

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
      if (participantMode === "players" && gameVariant === "attack_defense" && previous.length >= 2) return previous;
      if (previous.length >= 12) return previous;
      if (!isBotLike(byId.get(id)) && !playerDartSets[id]) {
        const preferred = x01MostUsedDartSetIdForProfile(id, humanProfiles);
        if (preferred) setPlayerDartSets((sets) => ({ ...sets, [id]: preferred }));
      }
      return [...previous, id];
    });
  }

  function setPlayerTeam(playerId: string, teamId: TeamId) {
    setTeamAssignments((previous) => {
      if (previous[playerId] === teamId) return { ...previous, [playerId]: null };
      if (gameVariant === "attack_defense" && participantMode === "teams") {
        const usedTeams = new Set(
          selectedIds
            .filter((id) => id !== playerId)
            .map((id) => previous[id])
            .filter(Boolean) as TeamId[]
        );
        const externalSlots = teamsSourceMode === "manual" ? selectedBotTeamIds.length : 0;
        if (!usedTeams.has(teamId) && usedTeams.size + externalSlots >= 2) return previous;
      }
      return { ...previous, [playerId]: teamId };
    });
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

  function duelTeamSlotsUsed(): number {
    if (gameVariant !== "attack_defense" || participantMode !== "teams") return 0;
    if (teamsSourceMode === "manual") {
      const manualIds = new Set(selectedIds.map((id) => teamAssignments[id]).filter(Boolean));
      return manualIds.size + selectedBotTeamIds.length;
    }
    if (teamsSourceMode === "auto") return selectedStoredTeamIds.length;
    return selectedStoredTeamIds.length + selectedBotTeamIds.length;
  }

  function canAddDuelTeamSlot(): boolean {
    return gameVariant !== "attack_defense" || participantMode !== "teams" || duelTeamSlotsUsed() < 2;
  }

  function addStoredTeamSelection(teamIdRaw: string, playerIds: string[]) {
    const baseId = String(teamIdRaw || "");
    const picked = uniqueIds(playerIds);
    if (!baseId || !picked.length || !canAddDuelTeamSlot()) return;
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
    if (!canAddDuelTeamSlot()) return;
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
    if (!baseId || !picked.length || !canAddDuelTeamSlot()) return;
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
  const isDuel = gameVariant === "attack_defense";
  const validPlayers = isDuel
    ? selectedIds.length === 2
    : selectedIds.length >= 1 && selectedIds.length <= 12;
  const validTeams = isDuel
    ? activeTeamConfigs.length === 2
      && teamSizes.length === 1
      && teamSizes[0] >= 1
      && teamSizes[0] <= 4
      && activeUniquePlayerIds.length === activeTeamPlayerIds.length
      && activeUniquePlayerIds.length <= 8
    : activeTeamConfigs.length >= 2
      && activeTeamConfigs.length <= 4
      && teamSizes.length === 1
      && teamSizes[0] >= 1
      && teamSizes[0] <= 4
      && activeUniquePlayerIds.length === activeTeamPlayerIds.length
      && activeUniquePlayerIds.length <= 12;
  const validSelection = participantMode === "players" ? validPlayers : validTeams;
  const selectedBotCount = selectedProfiles.filter(isBotLike).length;

  const selectionError = React.useMemo(() => {
    if (participantMode === "players") return gameVariant === "attack_defense"
      ? "Le duel Attaque / Défense se joue obligatoirement à 2 joueurs exactement. Pour jouer à plusieurs, passe en mode ÉQUIPES."
      : "Sélectionne entre 1 et 12 joueurs ou BOTS IA.";
    if (activeTeamConfigs.length < 2) return gameVariant === "attack_defense" ? "Le duel par équipes nécessite exactement 2 équipes." : "Sélectionne au moins 2 équipes.";
    if (gameVariant === "attack_defense" && activeTeamConfigs.length > 2) return "Le duel Attaque / Défense est limité à 2 équipes maximum.";
    if (gameVariant !== "attack_defense" && activeTeamConfigs.length > 4) return "Le Baseball accepte jusqu’à 4 équipes.";
    if (teamSizes.length !== 1) return "Les 2 équipes doivent contenir le même nombre de joueurs pour que chacun attaque et défende une fois.";
    if (activeUniquePlayerIds.length !== activeTeamPlayerIds.length) return "Un même profil ne peut pas jouer dans plusieurs équipes.";
    return gameVariant === "attack_defense"
      ? "Compose exactement 2 équipes équilibrées de 1 à 4 joueurs chacune."
      : "Compose 2 à 4 équipes de 1 à 4 joueurs, avec 12 participants maximum.";
  }, [participantMode, gameVariant, activeTeamConfigs, teamSizes.length, activeUniquePlayerIds.length, activeTeamPlayerIds.length]);

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
      gameVariant,
      bullTargetMode,
      bullBonusPoints,
      missEndsTurn,
      randomOrder,
      scoreInputMethod,
    };
    try { recordProfileUsageForMode("baseball", orderedIds); } catch {}
    if (typeof go === "function") go("baseball_play", payload);
  }

  const panel: React.CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", borderRadius: 18, padding: 12, background: "linear-gradient(180deg, rgba(255,255,255,.065), rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.10)", overflow: "hidden" };
  const selectorCard: React.CSSProperties = { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", overflow: "hidden", background: "rgba(10,12,24,.96)", borderRadius: 18, padding: "16px 12px", marginBottom: 12, boxShadow: "0 16px 40px rgba(0,0,0,.55)", border: `1px solid ${primary}33` };
  const guidedCard: React.CSSProperties = { ...selectorCard, padding: 14, border: `1px solid ${primary}33` };
  const accent2 = theme?.accent2 || theme?.accent1 || primary;
  const participantSummary = participantMode === "teams"
    ? `${activeTeamConfigs.length} équipe${activeTeamConfigs.length > 1 ? "s" : ""} · ${activeUniquePlayerIds.length} joueur${activeUniquePlayerIds.length > 1 ? "s" : ""}`
    : `${selectedIds.length} joueur${selectedIds.length > 1 ? "s" : ""}`;
  const variantSummary = gameVariant === "attack_defense" ? "Attaque / Défense" : "Baseball — cibles aléatoires";
  const bullSummary = bullTargetMode === "off" ? "Jamais" : bullTargetMode === "defense" ? `Défense · ${bullBonusPoints} pts` : bullTargetMode === "attack" ? `Attaque · ${bullBonusPoints} pts` : "Dans le tirage";
  const inputSummary = scoreInputMethod === "dartboard" ? "Cible interactive" : "Keypad";

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
            <SelectedParticipantsCompactBlock items={selectedParticipantItems} accent={primary} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleChangePlayerDartSet} allProfiles={humanProfiles} />
            <PlayerPagedSelector usageMode="baseball" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary={false} />
            <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>{gameVariant === "attack_defense" ? "Duel : 2 profils exactement. Pour jouer à plus de 2, utilise le mode ÉQUIPES." : "1 à 12 profils. Le tri privilégie les profils les plus utilisés en Baseball, puis l’ordre alphabétique."}</p>
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
        <div style={{ marginTop: 12, borderRadius: 14, padding: "9px 11px", border: `1px solid ${validSelection ? primary + "55" : "rgba(255,120,150,.28)"}`, background: validSelection ? `${primary}0d` : "rgba(255,80,120,.07)" }}>
          <div style={{ color: validSelection ? primary : "#ffb2c8", fontSize: 11.5, fontWeight: 950 }}>
            {validSelection ? `Sélection prête · ${participantSummary}` : selectionError}
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
          <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>Ajoute les mêmes BOTS IA prédéfinis ou personnels que dans X01.</p>
          {botsPanelEnabled ? <BotPagedSelector bots={botProfiles as any} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} label="BOTS IA" showCheckbox={false} showSelectedSummary={false} /> : null}
          {selectedBotCount > 0 ? <div style={{ marginTop: 10 }}><OptionRow label="Difficulté IA Baseball"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow></div> : null}
        </section>
      ) : teamsSourceMode !== "auto" ? (
        <BotTeamsSection botTeams={botDartsTeams} selectedBotTeamIds={selectedBotTeamIds} toggleBotTeam={toggleBotTeam} addBotTeamSelection={addBotTeamSelection} removeBotTeamSelection={removeBotTeamSelection} botTeamsPanelEnabled={botTeamsPanelEnabled} setBotTeamsPanelEnabled={setBotTeamsPanelEnabled} profiles={teamProfiles} savedTeamMemberSelections={savedTeamMemberSelections} toggleSavedTeamMember={toggleSavedTeamMember} primary={primary} primarySoft={primarySoft} />
      ) : null}
    </>
  );

  const formatBlock = (
    <section style={guidedCard}>
      <h3 style={{ margin: "0 0 7px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Format du match</h3>
      <div style={{ color: themeTextSoft, fontSize: 11.5, lineHeight: 1.4, marginBottom: 10 }}>Définis la durée de la partie et le comportement des manches supplémentaires.</div>
      <div style={panel}>
        <OptionRow label="Nombre de manches"><OptionSelect value={innings} options={[5, 7, 9, 12, 15, 20]} onChange={(value: any) => setInnings(Number(value) || 9)} /></OptionRow>
        <OptionRow label="Manches supplémentaires"><OptionToggle value={extraInnings} onChange={setExtraInnings} /></OptionRow>
        {extraInnings ? <OptionRow label="Maximum supplémentaire"><OptionSelect value={Math.min(10, Math.max(1, maxExtraInnings))} options={[1, 2, 3, 5, 10]} onChange={(value: any) => setMaxExtraInnings(Number(value) || 1)} /></OptionRow> : null}
        {innings >= 7 ? <OptionRow label="Règle de la 7e manche"><OptionSelect value={seventhInningRule} options={[{ value: "none", label: "Aucune pénalité" }, { value: "halve_on_zero", label: "0 point = score ÷ 2" }]} onChange={setSeventhInningRule} /></OptionRow> : null}
      </div>
    </section>
  );

  const variantBlock = (
    <section style={guidedCard}>
      <h3 style={{ margin: "0 0 7px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Variante de jeu</h3>
      <div style={{ color: themeTextSoft, fontSize: 11.5, lineHeight: 1.4, marginBottom: 12 }}>Choisis le fonctionnement du Baseball Darts.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        <button type="button" onClick={() => setGameVariant("target")} style={{ minHeight: 92, borderRadius: 16, padding: 12, textAlign: "left", cursor: "pointer", border: `1px solid ${gameVariant === "target" ? primary : "rgba(255,255,255,.10)"}`, background: gameVariant === "target" ? primarySoft : "rgba(255,255,255,.035)", color: "#fff" }}>
          <div style={{ color: primary, fontSize: 14, fontWeight: 950 }}>Baseball classique</div>
          <div style={{ marginTop: 5, fontSize: 10.5, color: themeTextSoft, lineHeight: 1.35 }}>Une cible aléatoire par manche. S=1, D=2, T=3.</div>
        </button>
        <button type="button" onClick={() => setGameVariant("attack_defense")} style={{ minHeight: 92, borderRadius: 16, padding: 12, textAlign: "left", cursor: "pointer", border: `1px solid ${gameVariant === "attack_defense" ? primary : "rgba(255,255,255,.10)"}`, background: gameVariant === "attack_defense" ? primarySoft : "rgba(255,255,255,.035)", color: "#fff" }}>
          <div style={{ color: primary, fontSize: 14, fontWeight: 950 }}>Attaque / Défense</div>
          <div style={{ marginTop: 5, fontSize: 10.5, color: themeTextSoft, lineHeight: 1.35 }}>1v1 ou 2 équipes. Chaque camp attaque puis défend la même cible.</div>
        </button>
      </div>
      <div style={{ marginTop: 11 }}><OptionRow label="Ordre de passage aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow></div>
      <div style={{ marginTop: 9, padding: "9px 10px", borderRadius: 12, background: `${primary}0d`, border: `1px solid ${primary}30`, color: "#cfd4ea", fontSize: 10.8, lineHeight: 1.4 }}>
        {gameVariant === "attack_defense"
          ? participantMode === "teams"
            ? "Duel limité à 2 équipes équilibrées. Chaque joueur attaque et défend une fois sur chaque cible."
            : "Duel limité à 2 joueurs exactement. J1 attaque/J2 défend, puis les rôles s’inversent sur la même cible."
          : "Les cibles numériques 1 à 20 sont tirées aléatoirement sans répétition tant que possible."}
      </div>
    </section>
  );

  const rulesBlock = (
    <section style={guidedCard}>
      <h3 style={{ margin: "0 0 7px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Règles & saisie</h3>
      <OptionRow label="MISS = fin du tour"><OptionToggle value={missEndsTurn} onChange={setMissEndsTurn} /></OptionRow>
      <div style={{ margin: "-5px 0 8px", fontSize: 10.5, opacity: .64, lineHeight: 1.35 }}>{missEndsTurn ? "MISS = perte immédiate de la volée en cours et changement de tour/rôle." : "MISS = 0 point, mais la volée continue jusqu’à validation."}</div>
      <OptionRow label="Règle BULL / DBULL"><OptionSelect value={bullTargetMode} options={[{ value: "off", label: "Jamais" }, { value: "defense", label: "Défense" }, { value: "attack", label: "Attaque" }, { value: "random", label: "Dans le tirage aléatoire" }]} onChange={setBullTargetMode} /></OptionRow>
      {(bullTargetMode === "attack" || bullTargetMode === "defense") ? <OptionRow label="Valeur du BULL"><OptionSelect value={bullBonusPoints} options={[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]} onChange={(value: any) => setBullBonusPoints(Math.min(20, Math.max(1, Number(value) || 4)))} /></OptionRow> : null}
      <OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Keypad" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
      <div style={{ marginTop: 9, padding: "9px 10px", borderRadius: 12, background: `${primary}0d`, border: `1px solid ${primary}30`, color: "#cfd4ea", fontSize: 10.8, lineHeight: 1.4 }}>
        {bullTargetMode === "random"
          ? "Le BULL rejoint exceptionnellement le tirage : BULL = 3 points et DBULL = 5 points quand BULL est la cible."
          : bullTargetMode === "attack"
            ? `BULL = +${bullBonusPoints} points pour soi ; DBULL = score ×2.`
            : bullTargetMode === "defense"
              ? `BULL retire ${bullBonusPoints} points à l’adversaire ; DBULL divise son score par 2 avec arrondi supérieur.`
              : "BULL / DBULL n’ont aucun effet spécial et le BULL reste hors rotation."}
      </div>
    </section>
  );

  const summaryBlock = (
    <section style={{ ...guidedCard, border: `1px solid ${validSelection ? primary + "66" : "rgba(255,255,255,.08)"}` }}>
      <h3 style={{ margin: "0 0 8px", color: primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Résumé de la partie</h3>
      <div style={{ display: "grid", gap: 7, padding: 11, borderRadius: 14, background: `${primary}0c`, border: `1px solid ${primary}33`, fontSize: 11.5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Participants</span><b style={{ textAlign: "right" }}>{participantSummary}</b></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Format</span><b>{innings} manches{extraInnings ? ` + ${maxExtraInnings} max` : ""}</b></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Variante</span><b style={{ textAlign: "right" }}>{variantSummary}</b></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>MISS</span><b>{missEndsTurn ? "Fin du tour" : "0 point"}</b></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>BULL / DBULL</span><b style={{ textAlign: "right" }}>{bullSummary}</b></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ color: "#8f94b5" }}>Saisie</span><b>{inputSummary}</b></div>
      </div>
      {!validSelection ? <div style={{ marginTop: 10, fontSize: 11.5, color: "#ff9aa7", fontWeight: 850, textAlign: "center" }}>{selectionError}</div> : null}
    </section>
  );

  return (
    <div style={{ minHeight: "100dvh", width: "100%", maxWidth: "100%", overflowX: "hidden", paddingBottom: 92 }}>
      <PageHeader tickerSrc={tickerBaseball} tickerAlt="BASEBALL DARTS" left={<BackDot onClick={backToGames} color={primary} glow={`${primary}88`} title="Retour" />} right={<InfoDot title="Règles du Baseball Darts" color={theme?.accent1 || primary} glow={`${theme?.accent1 || primary}77`} content={<RulesContent primary={primary} accent={theme?.accent1 || primary} />} />} />
      <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", padding: "8px 8px 0", overflowX: "hidden" }}>
        <section style={{ ...selectorCard, border: `1px solid ${primary}66`, boxShadow: `0 0 24px ${primary}18, 0 14px 34px rgba(0,0,0,.48)` }}>
          <div style={{ color: primary, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Configuration Baseball</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <PillButton label="Guidée" active={configViewMode === "guided"} onClick={() => selectConfigViewMode("guided")} primary={primary} primarySoft={primarySoft} />
            <PillButton label="Complète" active={configViewMode === "complete"} onClick={() => selectConfigViewMode("complete")} primary={primary} primarySoft={primarySoft} />
          </div>
          <div style={{ marginTop: 8, color: themeTextSoft, fontSize: 11, lineHeight: 1.35 }}>Guidée : les choix essentiels étape par étape. Complète : tous les paramètres avancés sur une seule page.</div>
        </section>

        {configViewMode === "guided" ? (
          <section style={{ ...selectorCard, border: `1px solid ${primary}55`, boxShadow: `0 0 22px ${primary}16, 0 14px 34px rgba(0,0,0,.48)` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
              <div>
                <div style={{ color: primary, fontSize: 12.5, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>Configuration guidée</div>
                <div style={{ marginTop: 3, color: themeTextSoft, fontSize: 10.5 }}>Étape {guidedStep + 1}/{guidedSteps.length} · {guidedSteps[guidedStep]}</div>
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
            {guidedStep === 1 ? formatBlock : null}
            {guidedStep === 2 ? variantBlock : null}
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
            <Section title="FORMAT DU MATCH">
              <div style={panel}>
                <OptionRow label="Nombre de manches"><OptionSelect value={innings} options={[5, 7, 9, 12, 15, 20]} onChange={(value: any) => setInnings(Number(value) || 9)} /></OptionRow>
                <OptionRow label="Manches supplémentaires"><OptionToggle value={extraInnings} onChange={setExtraInnings} /></OptionRow>
                {extraInnings ? <OptionRow label="Maximum supplémentaire"><OptionSelect value={Math.min(10, Math.max(1, maxExtraInnings))} options={[1, 2, 3, 5, 10]} onChange={(value: any) => setMaxExtraInnings(Number(value) || 1)} /></OptionRow> : null}
                {innings >= 7 ? <OptionRow label="Règle de la 7e manche"><OptionSelect value={seventhInningRule} options={[{ value: "none", label: "Aucune pénalité" }, { value: "halve_on_zero", label: "0 point = score ÷ 2" }]} onChange={setSeventhInningRule} /></OptionRow> : null}
                <OptionRow label="Variante de jeu"><OptionSelect value={gameVariant} options={[{ value: "target", label: "Cibles aléatoires — Baseball" }, { value: "attack_defense", label: "Attaque / Défense — Cible par manche" }]} onChange={setGameVariant} /></OptionRow>
                <OptionRow label="MISS"><OptionToggle value={missEndsTurn} onChange={setMissEndsTurn} /></OptionRow>
                <div style={{ margin: "-5px 0 5px", fontSize: 10.5, opacity: .62, lineHeight: 1.3 }}>{missEndsTurn ? "MISS = perte immédiate de la volée en cours et changement de tour/rôle." : "MISS = 0 point, mais la volée peut continuer jusqu’à 3 fléchettes."}</div>
                <OptionRow label="Règle BULL / DBULL"><OptionSelect value={bullTargetMode} options={[{ value: "off", label: "Jamais" }, { value: "defense", label: "Défense" }, { value: "attack", label: "Attaque" }, { value: "random", label: "Dans le tirage aléatoire" }]} onChange={setBullTargetMode} /></OptionRow>
                {(bullTargetMode === "attack" || bullTargetMode === "defense") ? <OptionRow label="Valeur du BULL"><OptionSelect value={bullBonusPoints} options={[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]} onChange={(value: any) => setBullBonusPoints(Math.min(20, Math.max(1, Number(value) || 4)))} /></OptionRow> : null}
                <OptionRow label="Ordre de passage aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
                <OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Keypad" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
                <div style={{ marginTop: 9, fontSize: 11.5, opacity: .68, lineHeight: 1.4 }}>
                  {gameVariant === "attack_defense"
                    ? participantMode === "teams"
                      ? "Duel limité à 2 équipes équilibrées. Sur chaque cible, tous les membres de l'équipe A attaquent d'abord face à leur vis-à-vis de B qui défendent ; ensuite les rôles s'inversent. Chaque joueur attaque et défend une fois."
                      : "Duel limité à 2 joueurs exactement. Sur chaque cible : J1 attaque/J2 défend, puis J2 attaque/J1 défend. Seules les touches sur la cible comptent."
                    : bullTargetMode === "random"
                      ? "Les cibles sont tirées parmi 1 à 20 + BULL. Quand BULL sort : BULL=3 runs et DBULL=5 runs."
                      : "Les cibles sont tirées uniquement parmi 1 à 20. Le BULL reste une option spéciale séparée et n’entre pas dans la rotation."}
                </div>
              </div>
            </Section>
          </>
        )}

        {(configViewMode === "complete" || guidedStep === guidedMaxStep) ? (
          <div style={{ padding: "4px 4px 14px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            <button type="button" disabled={!validSelection} onClick={onStart} style={{ width: "100%", minHeight: 52, borderRadius: 999, border: validSelection ? `1px solid ${primary}cc` : "1px solid rgba(255,255,255,.10)", background: validSelection ? `linear-gradient(90deg, ${primary}, ${accent2})` : "rgba(255,255,255,.06)", color: validSelection ? "#071018" : "rgba(255,255,255,.48)", boxShadow: validSelection ? `0 0 20px ${primary}55, 0 10px 24px rgba(0,0,0,.40)` : "0 10px 24px rgba(0,0,0,.40)", fontWeight: 1100, letterSpacing: 1.1, cursor: validSelection ? "pointer" : "not-allowed" }}>DÉMARRER LE BASEBALL</button>
            {!validSelection ? <div style={{ marginTop: 9, fontSize: 12, color: "#ff9aa7", fontWeight: 850, textAlign: "center" }}>{selectionError}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
