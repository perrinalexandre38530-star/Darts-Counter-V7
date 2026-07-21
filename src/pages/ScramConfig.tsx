// @ts-nocheck
// =============================================================
// src/pages/ScramConfig.tsx
// SCRAM — configuration avec le sélecteur participants EXACT de X01
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
import type { ScramConfigPayload, ScramTeam } from "../lib/gameEngines/scramEngine";
import { findRememberedGeneratedTeam } from "../lib/teamAutoShuffle";
import { loadTeamsBySport, type TeamEntity } from "../lib/petanqueTeamsStore";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { SCORE_INPUT_LS_KEY } from "../lib/scoreInput/types";
import {
  BotTeamsSection,
  PillButton,
  SelectedParticipantsCompactBlock,
  TeamsSection,
  X01_PRO_BOTS,
  buildX01DartsBotTeams,
} from "./X01ConfigV3";

import tickerScram from "../assets/tickers/ticker_scram.png";

type BotLevel = "easy" | "normal" | "hard";
type FirstStopperChoice = ScramTeam | "random";
type ParticipantMode = "players" | "teams";
type TeamsSourceMode = "manual" | "saved" | "auto";
type InputMethod = "keypad" | "dartboard";
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

export type { ScramConfigPayload } from "../lib/gameEngines/scramEngine";

const LS_CFG_KEY = "dc_modecfg_scram_v2";
const CYAN = "#42d6ff";
const GOLD = "#ffd76a";
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
    profile?.isBot ||
      profile?.bot ||
      profile?.type === "bot" ||
      profile?.kind === "bot" ||
      profile?.botLevel
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

function interleaveTeams(left: string[], right: string[]) {
  const ordered: string[] = [];
  const count = Math.max(left.length, right.length);
  for (let index = 0; index < count; index += 1) {
    if (left[index]) ordered.push(left[index]);
    if (right[index]) ordered.push(right[index]);
  }
  return ordered;
}

function RulesContent() {
  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.45 }}>
      <div>
        <strong style={{ color: CYAN }}>SOLO OU ÉQUIPES</strong><br />
        Le Scram n’est pas réservé aux équipes. En mode <strong>Joueurs</strong>, il se joue en duel
        1 contre 1, ou avec 4, 6 ou 8 joueurs répartis dans deux camps. En mode <strong>Équipes</strong>,
        tu choisis directement deux équipes complètes.
      </div>
      <div>
        <strong style={{ color: CYAN }}>BUT DU JEU</strong><br />
        La partie utilise les cibles Cricket 15 à 20 et, si activé, le Bull. À chaque phase, un camp
        <strong> bloque</strong> les cibles pendant que l’autre <strong>marque des points</strong>.
      </div>
      <div>
        <strong style={{ color: GOLD }}>PHASE 1</strong><br />
        Le Bloqueur joue en premier. Il ferme une cible avec 3 marques : simple = 1, double = 2,
        triple = 3. Le Scoreur additionne la valeur de ses fléchettes uniquement sur les cibles encore ouvertes.
      </div>
      <div>
        <strong style={{ color: GOLD }}>PHASE 2</strong><br />
        Les rôles s’inversent. Le nouveau Bloqueur repart avec un tableau vierge ; le score cumulé des
        deux phases détermine le vainqueur.
      </div>
      <div>
        <strong style={{ color: "#7dffca" }}>VICTOIRE</strong><br />
        Lorsque la seconde série de cibles est fermée, le joueur ou l’équipe qui possède le plus grand
        total gagne. Une égalité reste possible.
      </div>
      <div>
        <strong style={{ color: CYAN }}>SAISIE</strong><br />
        Choisis le <strong>keypad</strong> ou la <strong>cible interactive</strong> avant de démarrer : ce choix
        reste fixe pendant la partie afin de garder l’écran Play compact.
      </div>
    </div>
  );
}

export default function ScramConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store ?? null;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSavedConfig, []);
  const primary = theme?.primary || CYAN;
  const primarySoft = theme?.primarySoft || "rgba(66,214,255,.14)";
  const storeProfiles: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = React.useMemo(() => storeProfiles.filter((profile) => !isBotLike(profile)), [storeProfiles]);

  const [participantMode, setParticipantMode] = React.useState<ParticipantMode>(saved.participantMode === "teams" ? "teams" : "players");
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<TeamsSourceMode>(
    saved.teamsSourceMode === "saved" || saved.teamsSourceMode === "auto" ? saved.teamsSourceMode : "manual"
  );
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    Array.isArray(saved.selectedIds) ? saved.selectedIds.slice(0, 8).map(String) : []
  );
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamId | null>>(
    saved.teamAssignments && typeof saved.teamAssignments === "object" ? saved.teamAssignments : {}
  );
  const [selectedStoredTeamIds, setSelectedStoredTeamIds] = React.useState<string[]>(
    Array.isArray(saved.selectedStoredTeamIds) ? saved.selectedStoredTeamIds.map(String) : []
  );
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>(
    Array.isArray(saved.selectedBotTeamIds) ? saved.selectedBotTeamIds.map(String) : []
  );
  const [savedTeamMemberSelections, setSavedTeamMemberSelections] = React.useState<Record<string, string[]>>(
    saved.savedTeamMemberSelections && typeof saved.savedTeamMemberSelections === "object"
      ? saved.savedTeamMemberSelections
      : {}
  );
  const [botsPanelEnabled, setBotsPanelEnabled] = React.useState(saved.botsPanelEnabled === true);
  const [botTeamsPanelEnabled, setBotTeamsPanelEnabled] = React.useState(saved.botTeamsPanelEnabled === true);
  const [botLevel, setBotLevel] = React.useState<BotLevel>(
    saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal"
  );
  const [useBull, setUseBull] = React.useState(saved.useBull !== false);
  const [maxRoundsPerPhase, setMaxRoundsPerPhase] = React.useState<number>(
    Number(saved.maxRoundsPerPhase || 0) || 0
  );
  const [firstStopper, setFirstStopper] = React.useState<FirstStopperChoice>(
    saved.firstStopper === "B" || saved.firstStopper === "random" ? saved.firstStopper : "A"
  );
  const [inputMethod, setInputMethod] = React.useState<InputMethod>(() => {
    if (saved.inputMethod === "dartboard" || saved.inputMethod === "keypad") return saved.inputMethod;
    try { return localStorage.getItem(SCORE_INPUT_LS_KEY) === "dartboard" ? "dartboard" : "keypad"; }
    catch { return "keypad"; }
  });
  const [botProfiles, setBotProfiles] = React.useState<BotLite[]>([]);

  React.useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {}
  }, []);

  React.useEffect(() => {
    const map = new Map<string, BotLite>();
    (X01_PRO_BOTS || []).forEach((bot: any) => map.set(String(bot.id), { ...bot, id: String(bot.id), isBot: true }));
    loadUserBots().forEach((bot) => map.set(bot.id, { ...bot, isBot: true }));
    setBotProfiles([...map.values()]);
  }, []);

  React.useEffect(() => {
    if (selectedIds.length || humanProfiles.length < 2) return;
    setSelectedIds(humanProfiles.slice(0, 2).map((profile) => String(profile.id)));
  }, [humanProfiles, selectedIds.length]);

  React.useEffect(() => {
    try {
      localStorage.setItem(
        LS_CFG_KEY,
        JSON.stringify({
          participantMode,
          teamsSourceMode,
          selectedIds,
          teamAssignments,
          selectedStoredTeamIds,
          selectedBotTeamIds,
          savedTeamMemberSelections,
          botsPanelEnabled,
          botTeamsPanelEnabled,
          botLevel,
          useBull,
          maxRoundsPerPhase,
          firstStopper,
          inputMethod,
        })
      );
    } catch {}
  }, [
    participantMode,
    teamsSourceMode,
    selectedIds,
    teamAssignments,
    selectedStoredTeamIds,
    selectedBotTeamIds,
    savedTeamMemberSelections,
    botsPanelEnabled,
    botTeamsPanelEnabled,
    botLevel,
    useBull,
    maxRoundsPerPhase,
    firstStopper,
    inputMethod,
  ]);

  const allProfiles = React.useMemo(
    () => [...humanProfiles, ...botProfiles.map((bot) => ({ ...bot, isBot: true }))],
    [humanProfiles, botProfiles]
  );
  const byId = React.useMemo(
    () => new Map(allProfiles.map((profile: any) => [String(profile.id), profile])),
    [allProfiles]
  );
  const selectedProfiles = selectedIds.map((id) => byId.get(String(id))).filter(Boolean) as any[];
  const selectedParticipantItems = selectedProfiles.map((profile: any) => ({
    id: String(profile.id),
    kind: isBotLike(profile) ? "bot" : "player",
    name: profile?.name || profile?.displayName || "Joueur",
    profile,
  }));

  const teamProfiles = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const profile of allProfiles) map.set(String(profile.id), profile);
    return [...map.values()];
  }, [allProfiles]);

  const storedDartsTeams: TeamEntity[] = React.useMemo(() => {
    try {
      return loadTeamsBySport("darts").filter(
        (team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0
      );
    } catch {
      return [];
    }
  }, [storeProfiles.length]);

  const botDartsTeams = React.useMemo(() => buildX01DartsBotTeams(botProfiles), [botProfiles]);
  const selectableDartsTeams = React.useMemo(
    () => [...storedDartsTeams, ...botDartsTeams],
    [storedDartsTeams, botDartsTeams]
  );

  const selectedStoredTeams = React.useMemo(
    () =>
      (selectedStoredTeamIds || [])
        .map((rawId: any, index: number) => {
          const baseId = teamBaseId(rawId);
          const occurrence = (selectedStoredTeamIds || [])
            .slice(0, index)
            .filter((id: any) => teamBaseId(id) === baseId).length;
          const team =
            storedDartsTeams.find((candidate: any) => String(candidate.id) === baseId) ||
            findRememberedGeneratedTeam(baseId);
          if (!team) return null;
          const suffix = teamSuffix(occurrence);
          return {
            ...team,
            id: occurrence > 0 ? `${baseId}__slot_${suffix}` : baseId,
            baseTeamId: baseId,
            sourceTeamId: baseId,
            teamSlotLabel: suffix,
            name: team.name,
          };
        })
        .filter(Boolean),
    [storedDartsTeams, selectedStoredTeamIds]
  );

  const selectedBotTeams = React.useMemo(() => {
    if (!botTeamsPanelEnabled) return [];
    return (selectedBotTeamIds || [])
      .map((rawId: any, index: number) => {
        const baseId = teamBaseId(rawId);
        const occurrence = (selectedBotTeamIds || [])
          .slice(0, index)
          .filter((id: any) => teamBaseId(id) === baseId).length;
        const team = botDartsTeams.find((candidate: any) => String(candidate.id) === baseId);
        if (!team) return null;
        const suffix = teamSuffix(occurrence);
        return {
          ...team,
          id: occurrence > 0 ? `${baseId}__slot_${suffix}` : baseId,
          baseTeamId: baseId,
          sourceTeamId: baseId,
          teamSlotLabel: suffix,
          name: team.name,
        };
      })
      .filter(Boolean);
  }, [botDartsTeams, selectedBotTeamIds, botTeamsPanelEnabled]);

  const selectedSavedTeams = React.useMemo(
    () => [...selectedStoredTeams, ...selectedBotTeams],
    [selectedStoredTeams, selectedBotTeams]
  );

  function togglePlayer(idRaw: string) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        setTeamAssignments((assignments) => {
          const next = { ...assignments };
          delete next[id];
          return next;
        });
        return previous.filter((value) => value !== id);
      }
      if (previous.length >= 8) return previous;
      return [...previous, id];
    });
  }

  function setPlayerTeam(playerId: string, teamId: TeamId) {
    setTeamAssignments((previous) => ({
      ...previous,
      [playerId]: previous[playerId] === teamId ? null : teamId,
    }));
  }

  function toggleSavedTeamMember(teamIdRaw: string, playerIdRaw: string) {
    const instanceId = String(teamIdRaw || "");
    const baseId = teamBaseId(instanceId);
    const playerId = String(playerIdRaw || "");
    const team =
      selectableDartsTeams.find((candidate: any) => String(candidate.id) === baseId) ||
      findRememberedGeneratedTeam(baseId);
    const allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    setSavedTeamMemberSelections((previous) => {
      const current = Array.isArray(previous[instanceId]) ? previous[instanceId].map(String) : allIds;
      const next = current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId];
      return { ...previous, [instanceId]: next };
    });
  }

  function ensureTeamMembers(instanceId: string, teams: any[]) {
    setSavedTeamMemberSelections((previous) => {
      if (Array.isArray(previous[instanceId])) return previous;
      const baseId = teamBaseId(instanceId);
      const team =
        teams.find((candidate: any) => String(candidate.id || candidate.baseTeamId) === baseId) ||
        findRememberedGeneratedTeam(baseId);
      return {
        ...previous,
        [instanceId]: uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []),
      };
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
    setSavedTeamMemberSelections((previous) => {
      const next = { ...previous };
      delete next[instanceId];
      return next;
    });
  }

  function toggleStoredTeam(teamIdRaw: string) {
    const baseId = String(teamIdRaw || "");
    const team = storedDartsTeams.find((candidate: any) => String(candidate.id) === baseId);
    const allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    setSelectedStoredTeamIds((previous) => {
      const same = previous.filter((id) => teamBaseId(id) === baseId);
      const used = new Set<string>();
      same.forEach((instanceId) =>
        (savedTeamMemberSelections[String(instanceId)] || []).forEach((id) => used.add(String(id)))
      );
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
    setSavedTeamMemberSelections((previous) => {
      const next = { ...previous };
      delete next[instanceId];
      return next;
    });
  }

  function toggleBotTeam(teamIdRaw: string) {
    const baseId = String(teamIdRaw || "");
    const team = botDartsTeams.find((candidate: any) => String(candidate.id) === baseId);
    const ids = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    addBotTeamSelection(baseId, ids.slice(0, 1));
  }

  function externalTeamConfig(team: any, index: number) {
    const instanceId = String(team?.id || `team-${index}`);
    const allIds = uniqueIds(Array.isArray(team?.playerIds) ? team.playerIds : []);
    const playerIds = uniqueIds(
      Array.isArray(savedTeamMemberSelections[instanceId])
        ? savedTeamMemberSelections[instanceId]
        : allIds
    ).filter((id) => byId.has(id));
    return {
      id: instanceId,
      name: String(team?.name || `Équipe ${index + 1}`),
      color: index === 0 ? "#ff4ad1" : GOLD,
      logoDataUrl: team?.logoDataUrl ?? team?.logoUrl ?? team?.avatarDataUrl ?? null,
      playerIds,
      isBotTeam: Boolean(team?.isBotTeam),
    };
  }

  const playerModeTeams = React.useMemo(() => {
    const left = selectedIds.filter((_, index) => index % 2 === 0);
    const right = selectedIds.filter((_, index) => index % 2 === 1);
    const sideName = (ids: string[], fallback: string) => {
      if (ids.length === 1) {
        const profile: any = byId.get(String(ids[0]));
        return profile?.name || profile?.displayName || fallback;
      }
      return fallback;
    };
    return [
      {
        id: "scram-team-a",
        name: sideName(left, "CAMP A"),
        color: "#ff4ad1",
        playerIds: left,
      },
      {
        id: "scram-team-b",
        name: sideName(right, "CAMP B"),
        color: GOLD,
        playerIds: right,
      },
    ];
  }, [selectedIds, byId]);

  const manualTeamConfigs = React.useMemo(() => {
    const humanTeams = TEAM_IDS.map((teamId) => ({
      id: teamId,
      name: TEAM_LABELS[teamId],
      color: TEAM_COLORS[teamId],
      playerIds: selectedIds.filter((playerId) => teamAssignments[playerId] === teamId),
    })).filter((team) => team.playerIds.length > 0);
    const botTeams = selectedBotTeams.map(externalTeamConfig).filter((team) => team.playerIds.length > 0);
    return [...humanTeams, ...botTeams];
  }, [selectedIds, teamAssignments, selectedBotTeams, savedTeamMemberSelections, byId]);

  const savedTeamConfigs = React.useMemo(
    () =>
      (teamsSourceMode === "auto" ? selectedStoredTeams : selectedSavedTeams)
        .map(externalTeamConfig)
        .filter((team) => team.playerIds.length > 0),
    [teamsSourceMode, selectedStoredTeams, selectedSavedTeams, savedTeamMemberSelections, byId]
  );

  const activeTeamConfigs = participantMode === "players"
    ? playerModeTeams
    : teamsSourceMode === "manual"
    ? manualTeamConfigs
    : savedTeamConfigs;

  const activeTeamPlayerIds = activeTeamConfigs.flatMap((team) => team.playerIds);
  const activeUniquePlayerIds = uniqueIds(activeTeamPlayerIds);
  const sameTeamSize =
    activeTeamConfigs.length === 2 &&
    activeTeamConfigs[0].playerIds.length > 0 &&
    activeTeamConfigs[0].playerIds.length === activeTeamConfigs[1].playerIds.length;
  const validSelection =
    activeTeamConfigs.length === 2 &&
    sameTeamSize &&
    activeUniquePlayerIds.length === activeTeamPlayerIds.length &&
    activeUniquePlayerIds.length >= 2 &&
    activeUniquePlayerIds.length <= 8;

  const selectionError = React.useMemo(() => {
    if (participantMode === "players") {
      return "Sélectionne 2 joueurs pour un duel solo, ou 4, 6 ou 8 profils pour deux camps équilibrés.";
    }
    if (activeTeamConfigs.length !== 2) return "Le Scram se joue avec exactement 2 équipes.";
    if (!sameTeamSize) return "Les deux équipes doivent contenir le même nombre de joueurs.";
    if (activeUniquePlayerIds.length !== activeTeamPlayerIds.length) {
      return "Un même profil ne peut pas jouer dans les deux équipes.";
    }
    return "Sélection incomplète : choisis entre 1 et 4 joueurs dans chacune des deux équipes.";
  }, [participantMode, activeTeamConfigs, sameTeamSize, activeUniquePlayerIds.length, activeTeamPlayerIds.length]);

  const selectedBotCount = selectedProfiles.filter(isBotLike).length;

  function backToGames() {
    if (typeof props?.onBack === "function") return props.onBack();
    if (typeof go === "function") go("games");
  }

  function onStart() {
    if (!validSelection) return;
    const left = activeTeamConfigs[0].playerIds;
    const right = activeTeamConfigs[1].playerIds;
    const orderedIds = interleaveTeams(left, right);
    const orderedProfiles = orderedIds.map((id) => byId.get(String(id))).filter(Boolean);
    const botIds = orderedProfiles.filter(isBotLike).map((profile: any) => String(profile.id));
    const chosenFirstStopper: ScramTeam =
      firstStopper === "random" ? (Math.random() < 0.5 ? "A" : "B") : firstStopper;
    const payload: ScramConfigPayload = {
      players: orderedIds.length,
      selectedIds: orderedIds,
      playersList: orderedProfiles.map((profile: any) => ({
        ...profile,
        id: String(profile.id),
        name: profile?.name || profile?.displayName || "Joueur",
      })),
      teamConfigs: activeTeamConfigs.map((team, index) => ({
        ...team,
        side: index === 0 ? "A" : "B",
        playerIds: [...team.playerIds],
      })),
      botIds,
      botsEnabled: botIds.length > 0,
      botLevel,
      useBull,
      maxRoundsPerPhase,
      firstStopper: chosenFirstStopper,
      participantMode,
      inputMethod,
    };
    try {
      localStorage.setItem(SCORE_INPUT_LS_KEY, inputMethod);
      recordProfileUsageForMode("scram", orderedIds);
    } catch {}
    if (typeof go === "function") go("scram_play", payload);
  }

  const panel = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    borderRadius: 18,
    padding: 12,
    background: "linear-gradient(180deg, rgba(255,255,255,.065), rgba(0,0,0,.28))",
    border: "1px solid rgba(255,255,255,.10)",
    overflow: "hidden",
  } as React.CSSProperties;

  const selectorCard = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    overflow: "hidden",
    background: "rgba(10, 12, 24, 0.96)",
    borderRadius: 18,
    padding: "20px 12px 16px",
    marginBottom: 16,
    boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
    border: "1px solid rgba(255,255,255,0.05)",
  } as React.CSSProperties;

  return (
    <div style={{ minHeight: "100dvh", width: "100%", maxWidth: "100%", overflowX: "hidden", paddingBottom: 112 }}>
      <PageHeader
        tickerSrc={tickerScram}
        tickerAlt="SCRAM"
        tickerEdgeFade="strong"
        tickerHeight={68}
        left={<BackDot onClick={backToGames} color={CYAN} glow="rgba(66,214,255,.58)" title="Retour" />}
        right={
          <InfoDot
            title="Règles et configuration du Scram"
            color={GOLD}
            glow="rgba(255,215,106,.55)"
            content={<RulesContent />}
          />
        }
      />

      <div style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", padding: "12px 12px 0", overflowX: "hidden" }}>
        <section style={selectorCard}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
              color: primary,
              marginBottom: 10,
            }}
          >
            Participants
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <PillButton
              label="Joueurs"
              active={participantMode === "players"}
              onClick={() => setParticipantMode("players")}
              primary={primary}
              primarySoft={primarySoft}
            />
            <PillButton
              label="Équipes"
              active={participantMode === "teams"}
              onClick={() => setParticipantMode("teams")}
              primary={primary}
              primarySoft={primarySoft}
            />
          </div>

          {participantMode === "players" ? (
            <>
              <SelectedParticipantsCompactBlock
                items={selectedParticipantItems}
                accent={primary}
                onRemove={togglePlayer}
                allProfiles={humanProfiles}
              />
              <PlayerPagedSelector
                usageMode="scram"
                profiles={humanProfiles}
                selectedIds={selectedIds}
                onToggle={togglePlayer}
                accent={primary}
                pageSize={9}
                modalTitle="Choisir des joueurs"
                showSelectedSummary={false}
              />
              <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>
                2 joueurs = duel solo. 4, 6 ou 8 joueurs = deux camps équilibrés.
              </p>
            </>
          ) : (
            <TeamsSection
              profiles={teamProfiles}
              selectableProfiles={humanProfiles}
              selectedIds={selectedIds}
              teamAssignments={teamAssignments}
              setPlayerTeam={setPlayerTeam}
              togglePlayer={togglePlayer}
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
        </section>

        {participantMode === "players" ? (
          <section
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              overflow: "hidden",
              background: "rgba(10, 12, 24, 0.96)",
              borderRadius: 18,
              padding: 12,
              marginBottom: 16,
              boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, margin: 0 }}>
                Bots IA
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  aria-pressed={botsPanelEnabled}
                  onClick={() => setBotsPanelEnabled((value) => !value)}
                  style={{
                    padding: "7px 11px",
                    borderRadius: 999,
                    border: `1px solid ${primary}88`,
                    background: botsPanelEnabled ? `${primary}18` : "rgba(255,255,255,0.04)",
                    color: primary,
                    fontWeight: 900,
                    fontSize: 11,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {botsPanelEnabled ? "☑ ON" : "☐ OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => typeof go === "function" && go("profiles_bots")}
                  style={{
                    padding: "7px 11px",
                    borderRadius: 999,
                    border: `1px solid ${primary}`,
                    background: "rgba(255,255,255,0.04)",
                    color: primary,
                    fontWeight: 900,
                    fontSize: 11,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Gérer les BOTS
                </button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>
              Ajoute les mêmes BOTS IA prédéfinis ou personnels que dans X01.
            </p>
            {botsPanelEnabled ? (
              <BotPagedSelector
                bots={botProfiles as any}
                selectedIds={selectedIds}
                onToggle={togglePlayer}
                accent={primary}
                label="BOTS IA"
                showCheckbox={false}
                showSelectedSummary={false}
              />
            ) : null}
            {selectedBotCount > 0 ? (
              <div style={{ marginTop: 10 }}>
                <OptionRow label="Difficulté IA Scram">
                  <OptionSelect
                    value={botLevel}
                    options={[
                      { value: "easy", label: "Facile" },
                      { value: "normal", label: "Normal" },
                      { value: "hard", label: "Difficile" },
                    ]}
                    onChange={setBotLevel}
                  />
                </OptionRow>
              </div>
            ) : null}
          </section>
        ) : teamsSourceMode !== "auto" ? (
          <BotTeamsSection
            botTeams={botDartsTeams}
            selectedBotTeamIds={selectedBotTeamIds}
            toggleBotTeam={toggleBotTeam}
            addBotTeamSelection={addBotTeamSelection}
            removeBotTeamSelection={removeBotTeamSelection}
            botTeamsPanelEnabled={botTeamsPanelEnabled}
            setBotTeamsPanelEnabled={setBotTeamsPanelEnabled}
            profiles={teamProfiles}
            savedTeamMemberSelections={savedTeamMemberSelections}
            toggleSavedTeamMember={toggleSavedTeamMember}
            primary={primary}
            primarySoft={primarySoft}
          />
        ) : null}

        <Section title="RÈGLES">
          <div style={panel}>
            <OptionRow label="Bull inclus">
              <OptionToggle value={useBull} onChange={setUseBull} />
            </OptionRow>
            <OptionRow label="Premier bloqueur">
              <OptionSelect
                value={firstStopper}
                options={[
                  { value: "A", label: activeTeamConfigs[0]?.name || "Camp A" },
                  { value: "B", label: activeTeamConfigs[1]?.name || "Camp B" },
                  { value: "random", label: "Aléatoire" },
                ]}
                onChange={setFirstStopper}
              />
            </OptionRow>
            <OptionRow label="Cap de rounds / phase">
              <OptionSelect
                value={maxRoundsPerPhase}
                options={[0, 10, 15, 20, 25, 30].map((value) => ({
                  value,
                  label: value ? String(value) : "Illimité",
                }))}
                onChange={(value: any) => setMaxRoundsPerPhase(Number(value) || 0)}
              />
            </OptionRow>
            <OptionRow label="Saisie pendant la partie">
              <OptionSelect
                value={inputMethod}
                options={[
                  { value: "keypad", label: "Keypad compact" },
                  { value: "dartboard", label: "Cible interactive" },
                ]}
                onChange={(value: any) => setInputMethod(value === "dartboard" ? "dartboard" : "keypad")}
              />
            </OptionRow>
            <div style={{ marginTop: 9, fontSize: 11.5, opacity: 0.68, lineHeight: 1.35 }}>
              En duel solo, les noms des deux joueurs remplacent automatiquement les libellés d’équipe. La méthode de saisie choisie ici ne change plus dans l’écran Play.
            </div>
          </div>
        </Section>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "grid",
            placeItems: "center",
            padding: "20px 14px 24px",
            marginTop: 8,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: "min(560px, 92%)" }}>
            <button
              type="button"
              disabled={!validSelection}
              onClick={onStart}
              style={{
                width: "100%",
                minHeight: 58,
                padding: "10px 18px",
                borderRadius: 999,
                border: validSelection ? "1px solid rgba(255,255,255,.22)" : "1px solid rgba(255,255,255,.08)",
                background: validSelection
                  ? "linear-gradient(90deg, #37d8f6 0%, #8fe8d5 45%, #f3e28d 100%)"
                  : "linear-gradient(90deg, rgba(120,125,140,.92), rgba(90,95,112,.92))",
                boxShadow: validSelection
                  ? "0 0 0 1px rgba(255,255,255,.06) inset, 0 10px 26px rgba(62,214,245,.22), 0 0 20px rgba(243,226,141,.18)"
                  : "none",
                color: "#09111c",
                fontWeight: 1000,
                fontSize: 16.5,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                cursor: validSelection ? "pointer" : "not-allowed",
              }}
            >
              DÉMARRER LE SCRAM
            </button>
            {!validSelection ? (
              <div style={{ marginTop: 9, fontSize: 12, color: "#ff9aa7", fontWeight: 850, textAlign: "center" }}>
                {selectionError}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
