// @ts-nocheck
import React from "react";
import BotPagedSelector from "../components/BotPagedSelector";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import Section from "../components/Section";
import { loadTeamsBySport } from "../lib/petanqueTeamsStore";
import { findRememberedGeneratedTeam } from "../lib/teamAutoShuffle";
import {
  BotTeamsSection,
  PillButton,
  PlayerDartBadge,
  SelectedParticipantsCompactBlock,
  TeamsSection,
} from "./X01ConfigV3";

export type CapitalParticipantMode = "players" | "teams";
export type CapitalTeamsSourceMode = "manual" | "saved" | "auto";

export type CapitalSelectedTeam = {
  id: string;
  name: string;
  color: string;
  logoDataUrl?: string | null;
  playerIds: string[];
  players: string[];
  source: CapitalTeamsSourceMode;
};

export type CapitalParticipantSelection = {
  participantMode: CapitalParticipantMode;
  teamsSourceMode?: CapitalTeamsSourceMode;
  selectedIds: string[];
  playersList: any[];
  teams: CapitalSelectedTeam[];
  playerDartSets: Record<string, string | null>;
  botsEnabled: boolean;
  valid: boolean;
  error: string;
};

type TeamId = "gold" | "pink" | "blue" | "green";
const TEAM_COLORS: Record<TeamId, string> = {
  gold: "#f7c85c",
  pink: "#ff4fa2",
  blue: "#4fc3ff",
  green: "#6dff7c",
};
const TEAM_LABELS: Record<TeamId, string> = {
  gold: "Team Gold",
  pink: "Team Pink",
  blue: "Team Blue",
  green: "Team Green",
};

function idOf(value: any) {
  return String(value?.id || value?.profileId || value || "").trim();
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

function unique(values: any[]) {
  return Array.from(new Set((values || []).map(idOf).filter(Boolean)));
}

function teamBaseId(value: any): string {
  return String(value?.baseTeamId || value?.sourceTeamId || value?.id || value || "").split("__slot_")[0];
}

function teamSuffix(index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return index < letters.length ? letters[index] : `#${index + 1}`;
}

function interleaveTeams(teams: Array<{ playerIds: string[] }>) {
  const output: string[] = [];
  const maximum = Math.max(0, ...teams.map((team) => team.playerIds.length));
  for (let memberIndex = 0; memberIndex < maximum; memberIndex += 1) {
    teams.forEach((team) => {
      if (team.playerIds[memberIndex]) output.push(team.playerIds[memberIndex]);
    });
  }
  return output;
}

function buildBotTeams(bots: any[]) {
  const sorted = [...bots];
  const names = ["BOT Élite IA", "BOT Pro IA", "BOT Challenger IA", "BOT Mixte IA", "BOT Rising IA"];
  const out: any[] = [];
  for (let index = 0; index < sorted.length; index += 4) {
    const members = sorted.slice(index, index + 4);
    if (!members.length) continue;
    out.push({
      id: `capital_bot_team_${index / 4 + 1}`,
      name: names[index / 4] || `BOT Team ${index / 4 + 1}`,
      isBotTeam: true,
      botLevel: members[0]?.botLevel || "normal",
      botTeamLevel: members[0]?.botLevel || "normal",
      logoDataUrl:
        members[0]?.avatarDataUrl || members[0]?.avatarUrl || members[0]?.avatar || null,
      playerIds: members.map(idOf).filter(Boolean),
    });
  }
  return out;
}

export default function CapitalParticipantsX01(props: {
  humans: any[];
  bots: any[];
  accent: string;
  accentSoft?: string;
  initialSelectedIds?: string[];
  initialConfig?: any;
  onChange: (selection: CapitalParticipantSelection) => void;
}) {
  const humans = Array.isArray(props.humans) ? props.humans : [];
  const bots = Array.isArray(props.bots) ? props.bots : [];
  const accent = props.accent || "#42d6ff";
  const accentSoft = props.accentSoft || `${accent}20`;
  const initial = props.initialConfig && typeof props.initialConfig === "object" ? props.initialConfig : {};
  const initialTeams = Array.isArray(initial.teams) ? initial.teams : [];
  const allProfiles = React.useMemo(() => [...humans, ...bots], [humans, bots]);
  const profilesById = React.useMemo(
    () => new Map(allProfiles.map((profile: any) => [idOf(profile), profile])),
    [allProfiles]
  );
  const botTeams = React.useMemo(() => buildBotTeams(bots), [bots]);

  const [participantMode, setParticipantMode] = React.useState<CapitalParticipantMode>(initial.participantMode === "teams" ? "teams" : "players");
  const [teamsSourceMode, setTeamsSourceMode] = React.useState<CapitalTeamsSourceMode>(initial.teamsSourceMode === "saved" || initial.teamsSourceMode === "auto" ? initial.teamsSourceMode : "manual");
  const [botsPanelEnabled, setBotsPanelEnabled] = React.useState(false);
  const [botTeamsPanelEnabled, setBotTeamsPanelEnabled] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    unique(props.initialSelectedIds?.length ? props.initialSelectedIds : initial.selectedIds || []).slice(0, 12)
  );
  const [teamAssignments, setTeamAssignments] = React.useState<Record<string, TeamId | null>>(() => {
    const out: Record<string, TeamId | null> = {};
    const teamIds = Object.keys(TEAM_LABELS) as TeamId[];
    initialTeams.forEach((team: any, index: number) => unique(team?.players || team?.playerIds || []).forEach((id) => { out[id] = teamIds[index] || "gold"; }));
    return out;
  });
  const initialExternalTeamIds = initial.participantMode === "teams" && initial.teamsSourceMode !== "manual" ? initialTeams.map((team: any) => String(team.id || "")).filter(Boolean) : [];
  const [selectedStoredTeamIds, setSelectedStoredTeamIds] = React.useState<string[]>(() => initialExternalTeamIds.filter((id) => !id.startsWith("capital_bot_team_")));
  const [selectedBotTeamIds, setSelectedBotTeamIds] = React.useState<string[]>(() => initialExternalTeamIds.filter((id) => id.startsWith("capital_bot_team_")));
  const [savedTeamMemberSelections, setSavedTeamMemberSelections] = React.useState<Record<string, string[]>>(() => Object.fromEntries(initialTeams.map((team: any) => [String(team.id || ""), unique(team?.players || team?.playerIds || [])]).filter(([id]) => id)));
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(() => initial.playerDartSets && typeof initial.playerDartSets === "object" ? initial.playerDartSets : {});
  const [autoDartSetPicker, setAutoDartSetPicker] = React.useState<{ profileId: string; seq: number } | null>(null);

  const storedDartsTeams = React.useMemo(() => {
    try {
      return loadTeamsBySport("darts").filter(
        (team: any) => Array.isArray(team?.playerIds) && team.playerIds.length > 0
      );
    } catch {
      return [];
    }
  }, [humans]);

  React.useEffect(() => {
    const available = new Set(allProfiles.map(idOf));
    setSelectedIds((previous) => previous.filter((id) => available.has(id)).slice(0, 12));
  }, [allProfiles]);

  function togglePlayer(idRaw: string) {
    const id = idOf(idRaw);
    if (!id) return;
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        setTeamAssignments((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        return previous.filter((value) => value !== id);
      }
      return previous.length >= 12 ? previous : [...previous, id];
    });
  }

  function setPlayerTeam(playerId: string, teamId: TeamId) {
    setTeamAssignments((previous) => ({
      ...previous,
      [playerId]: previous[playerId] === teamId ? null : teamId,
    }));
  }

  function handleChangePlayerDartSet(profileId: string, dartSetId: string | null) {
    setPlayerDartSets((previous) => ({
      ...previous,
      [String(profileId)]: dartSetId ? String(dartSetId) : null,
    }));
  }

  function openDartSetPickerAfterSelection(idRaw: any, meta?: any) {
    const id = idOf(idRaw);
    if (!id || meta?.selected === false || !humans.some((profile: any) => idOf(profile) === id)) return;
    setAutoDartSetPicker({ profileId: id, seq: Date.now() });
  }

  function addTeamSelection(kind: "stored" | "bot", rawTeamId: string, playerIds: string[]) {
    const baseId = teamBaseId(rawTeamId);
    const picked = unique(playerIds);
    if (!baseId || !picked.length) return;
    const setter = kind === "stored" ? setSelectedStoredTeamIds : setSelectedBotTeamIds;
    setter((previous) => {
      const occurrences = previous.filter((id) => teamBaseId(id) === baseId).length;
      const instanceId = occurrences ? `${baseId}__slot_${teamSuffix(occurrences)}` : baseId;
      setSavedTeamMemberSelections((old) => ({ ...old, [instanceId]: picked }));
      return [...previous, instanceId];
    });
  }

  function removeTeamSelection(kind: "stored" | "bot", instanceIdRaw: string) {
    const instanceId = String(instanceIdRaw || "");
    const setter = kind === "stored" ? setSelectedStoredTeamIds : setSelectedBotTeamIds;
    setter((previous) => previous.filter((id) => String(id) !== instanceId));
    setSavedTeamMemberSelections((previous) => {
      const next = { ...previous };
      delete next[instanceId];
      return next;
    });
  }

  function toggleSavedTeamMember(teamIdRaw: string, playerIdRaw: string) {
    const teamId = String(teamIdRaw || "");
    const playerId = idOf(playerIdRaw);
    const baseId = teamBaseId(teamId);
    const source = [...storedDartsTeams, ...botTeams].find(
      (team: any) => String(team.id) === baseId
    ) || findRememberedGeneratedTeam(baseId);
    const allIds = unique(source?.playerIds || []);
    setSavedTeamMemberSelections((previous) => {
      const current = Array.isArray(previous[teamId]) ? previous[teamId] : allIds;
      const next = current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId];
      return { ...previous, [teamId]: next };
    });
  }

  const externalTeams = React.useMemo(() => {
    const instances = [
      ...selectedStoredTeamIds.map((instanceId) => ({ instanceId, kind: "stored" as const })),
      ...selectedBotTeamIds.map((instanceId) => ({ instanceId, kind: "bot" as const })),
    ];
    return instances
      .map(({ instanceId, kind }, index) => {
        const baseId = teamBaseId(instanceId);
        const pool = kind === "bot" ? botTeams : storedDartsTeams;
        const source: any =
          pool.find((team: any) => String(team.id) === baseId) ||
          findRememberedGeneratedTeam(baseId);
        if (!source) return null;
        const chosen = Array.isArray(savedTeamMemberSelections[instanceId])
          ? unique(savedTeamMemberSelections[instanceId])
          : [];
        return {
          id: instanceId,
          name: String(source?.name || `Équipe ${index + 1}`),
          color: source?.color || Object.values(TEAM_COLORS)[index % 4],
          logoDataUrl:
            source?.logoDataUrl ?? source?.logoUrl ?? source?.avatarDataUrl ?? null,
          playerIds: chosen.filter((id) => profilesById.has(id)),
          source: teamsSourceMode,
        };
      })
      .filter(Boolean);
  }, [selectedStoredTeamIds, selectedBotTeamIds, savedTeamMemberSelections, storedDartsTeams, botTeams, profilesById, teamsSourceMode]);

  const manualTeams = React.useMemo(
    () =>
      (Object.keys(TEAM_LABELS) as TeamId[])
        .map((teamId) => ({
          id: teamId,
          name: TEAM_LABELS[teamId],
          color: TEAM_COLORS[teamId],
          logoDataUrl: null,
          playerIds: selectedIds.filter((id) => teamAssignments[id] === teamId),
          source: "manual" as const,
        }))
        .filter((team) => team.playerIds.length > 0),
    [selectedIds, teamAssignments]
  );

  const configuredTeams = participantMode === "teams"
    ? teamsSourceMode === "manual" ? manualTeams : externalTeams
    : [];
  const teamIds = configuredTeams.flatMap((team) => team.playerIds);
  const duplicate = new Set(teamIds).size !== teamIds.length;
  const teamSizes = new Set(configuredTeams.map((team) => team.playerIds.length));
  const valid = participantMode === "players"
    ? selectedIds.length >= 2 && selectedIds.length <= 12
    : configuredTeams.length >= 2 &&
      configuredTeams.length <= 4 &&
      configuredTeams.every((team) => team.playerIds.length >= 1 && team.playerIds.length <= 4) &&
      teamSizes.size === 1 &&
      !duplicate;
  const error = participantMode === "players"
    ? "Sélectionne de 2 à 12 joueurs ou bots."
    : configuredTeams.length < 2
    ? "Compose ou sélectionne au moins deux équipes."
    : configuredTeams.length > 4
    ? "Le CAPITAL accepte au maximum quatre équipes."
    : teamSizes.size !== 1
    ? "Toutes les équipes doivent avoir le même nombre de joueurs (1 à 4)."
    : duplicate
    ? "Un même joueur ne peut pas appartenir à deux équipes."
    : "Chaque équipe doit contenir de 1 à 4 joueurs.";
  const orderedIds = React.useMemo(
    () => participantMode === "players" ? selectedIds : interleaveTeams(configuredTeams),
    [participantMode, selectedIds, configuredTeams]
  );
  const playersList = React.useMemo(() => orderedIds
    .map((id) => profilesById.get(id))
    .filter(Boolean)
    .map((profile: any) => ({
      ...profile,
      id: idOf(profile),
      name: profile?.name || profile?.displayName || profile?.nickname || "Joueur",
      isBot: isBotLike(profile),
      teamId: configuredTeams.find((team) => team.playerIds.includes(idOf(profile)))?.id || null,
    })), [orderedIds, profilesById, configuredTeams]);

  const selection = React.useMemo<CapitalParticipantSelection>(() => ({
    participantMode,
    teamsSourceMode: participantMode === "teams" ? teamsSourceMode : undefined,
    selectedIds: orderedIds,
    playersList,
    teams: configuredTeams.map((team) => ({ ...team, players: [...team.playerIds] })),
    playerDartSets,
    botsEnabled: playersList.some(isBotLike),
    valid,
    error,
  }), [participantMode, teamsSourceMode, orderedIds, playersList, configuredTeams, playerDartSets, valid, error]);

  React.useEffect(() => props.onChange(selection), [selection, props.onChange]);

  const selectedParticipantProfiles = selectedIds
    .map((id) => profilesById.get(id))
    .filter(Boolean)
    .map((profile: any) => ({
      id: idOf(profile),
      kind: isBotLike(profile) ? "bot" : "player",
      name: profile?.name || profile?.displayName || "Joueur",
      profile,
    }));

  return (
    <Section title="Participants">
      <div style={{ borderRadius: 18, padding: 12, background: "linear-gradient(180deg, rgba(255,255,255,.065), rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.10)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <PillButton label="Joueurs" active={participantMode === "players"} onClick={() => setParticipantMode("players")} primary={accent} primarySoft={accentSoft} />
          <PillButton label="Équipes" active={participantMode === "teams"} onClick={() => setParticipantMode("teams")} primary={accent} primarySoft={accentSoft} />
        </div>

        {participantMode === "players" ? (
          <>
            <SelectedParticipantsCompactBlock items={selectedParticipantProfiles} accent={accent} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleChangePlayerDartSet} allProfiles={humans} />
            <PlayerPagedSelector usageMode="capital" profiles={humans} selectedIds={selectedIds} onToggle={togglePlayer} onAfterToggle={openDartSetPickerAfterSelection} accent={accent} pageSize={9} modalTitle="Choisir des joueurs CAPITAL" onClose={() => setAutoDartSetPicker(null)} showSelectedSummary={false} renderAvatarOverlay={(profile: any) => (
              <PlayerDartBadge profileId={profile.id} dartSetId={playerDartSets[profile.id] ?? null} onChange={(id: string | null) => handleChangePlayerDartSet(profile.id, id)} compact allProfiles={humans} autoOpenToken={autoDartSetPicker?.profileId === String(profile.id) ? autoDartSetPicker.seq : null} />
            )} />
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ color: accent, fontSize: 12, fontWeight: 1000, letterSpacing: 1 }}>BOTS IA</div>
                <PillButton label={botsPanelEnabled ? "ON" : "OFF"} active={botsPanelEnabled} onClick={() => setBotsPanelEnabled((value) => !value)} primary={accent} primarySoft={accentSoft} compact />
              </div>
              {botsPanelEnabled ? <BotPagedSelector bots={bots} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} label="BOTS IA" modalTitle="Choisir des BOTS IA" showCheckbox={false} showSelectedSummary={false} /> : null}
            </div>
          </>
        ) : null}
      </div>

      {participantMode === "teams" ? (
        <div style={{ marginTop: 12 }}>
          <TeamsSection profiles={allProfiles} selectableProfiles={humans} selectedIds={selectedIds} teamAssignments={teamAssignments} setPlayerTeam={setPlayerTeam} togglePlayer={togglePlayer} playerDartSets={playerDartSets} handleChangePlayerDartSet={handleChangePlayerDartSet} autoDartSetPicker={autoDartSetPicker} setAutoDartSetPicker={setAutoDartSetPicker} allProfiles={humans} sourceMode={teamsSourceMode} setSourceMode={setTeamsSourceMode} storedTeams={storedDartsTeams} selectedStoredTeamIds={selectedStoredTeamIds} toggleStoredTeam={(teamId: string) => {
            const team: any = storedDartsTeams.find((item: any) => String(item.id) === teamBaseId(teamId));
            addTeamSelection("stored", teamId, Array.isArray(team?.playerIds) ? team.playerIds.slice(0, 1) : []);
          }} addStoredTeamSelection={(teamId: string, playerIds: string[]) => addTeamSelection("stored", teamId, playerIds)} removeStoredTeamSelection={(instanceId: string) => removeTeamSelection("stored", instanceId)} botTeams={botTeams} botTeamsPanelEnabled={botTeamsPanelEnabled} setBotTeamsPanelEnabled={setBotTeamsPanelEnabled} selectedBotTeamIds={selectedBotTeamIds} toggleBotTeam={(teamId: string) => {
            const team: any = botTeams.find((item: any) => String(item.id) === teamBaseId(teamId));
            addTeamSelection("bot", teamId, Array.isArray(team?.playerIds) ? team.playerIds.slice(0, 1) : []);
          }} removeBotTeamSelection={(instanceId: string) => removeTeamSelection("bot", instanceId)} savedTeamMemberSelections={savedTeamMemberSelections} toggleSavedTeamMember={toggleSavedTeamMember} primary={accent} primarySoft={accentSoft} />
          {teamsSourceMode !== "auto" ? <BotTeamsSection botTeams={botTeams} selectedBotTeamIds={selectedBotTeamIds} toggleBotTeam={(teamId: string) => {
            const team: any = botTeams.find((item: any) => String(item.id) === teamBaseId(teamId));
            addTeamSelection("bot", teamId, Array.isArray(team?.playerIds) ? team.playerIds.slice(0, 1) : []);
          }} addBotTeamSelection={(teamId: string, playerIds: string[]) => addTeamSelection("bot", teamId, playerIds)} removeBotTeamSelection={(instanceId: string) => removeTeamSelection("bot", instanceId)} botTeamsPanelEnabled={botTeamsPanelEnabled} setBotTeamsPanelEnabled={setBotTeamsPanelEnabled} profiles={allProfiles} savedTeamMemberSelections={savedTeamMemberSelections} toggleSavedTeamMember={toggleSavedTeamMember} primary={accent} primarySoft={accentSoft} /> : null}
        </div>
      ) : null}

      <div style={{ marginTop: 11, color: valid ? "#72f0a8" : "#ff8aa6", fontSize: 11.5, fontWeight: 850 }}>
        {valid ? `✓ ${orderedIds.length} participant(s)${participantMode === "teams" ? ` • ${configuredTeams.length} équipe(s)` : ""}` : error}
      </div>
    </Section>
  );
}
