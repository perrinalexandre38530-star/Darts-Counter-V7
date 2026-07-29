import React from "react";
import type { Profile } from "../../lib/types";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import TeamSelectorV2 from "../../components/TeamSelectorV2";
import { loadTeamsBySport, type TeamEntity } from "../../lib/petanqueTeamsStore";
import {
  nextTeamInstanceId,
  resolveTeamInstances,
} from "../../lib/teamSelectionInstances";

export type TrainingParticipantMode = "players" | "teams";

export type TrainingParticipantSelection = {
  participantMode: TrainingParticipantMode;
  selectedPlayerIds: string[];
  selectedTeamIds: string[];
  selectedTeamPlayerIds: Record<string, string[]>;
  teamSize: number;
};

export type TrainingResolvedParticipant = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  teamLogo?: string | null;
};

const ACCENT = "#27dcff";
const ACCENT_SOFT = "rgba(39,220,255,.13)";

function cleanIds(values: any[]): string[] {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((id) => String(id || "").trim()).filter(Boolean)));
}

export function createDefaultTrainingParticipantSelection(profiles?: Profile[]): TrainingParticipantSelection {
  const firstId = String(profiles?.[0]?.id || "").trim();
  return {
    participantMode: "players",
    selectedPlayerIds: firstId ? [firstId] : [],
    selectedTeamIds: [],
    selectedTeamPlayerIds: {},
    teamSize: 2,
  };
}


export function useTrainingParticipantSelection(profiles?: Profile[]) {
  const [selection, setSelection] = React.useState<TrainingParticipantSelection>(() =>
    createDefaultTrainingParticipantSelection(profiles)
  );

  React.useEffect(() => {
    if (selection.participantMode !== "players") return;
    if (selection.selectedPlayerIds.length > 0) return;
    const firstId = String(profiles?.[0]?.id || "").trim();
    if (!firstId) return;
    setSelection((current) =>
      current.selectedPlayerIds.length > 0
        ? current
        : { ...current, selectedPlayerIds: [firstId] }
    );
  }, [profiles, selection.participantMode, selection.selectedPlayerIds.length]);

  return [selection, setSelection] as const;
}
export function resolveTrainingParticipants(
  selection: TrainingParticipantSelection,
  profiles?: Profile[],
  teamsOverride?: TeamEntity[]
): TrainingResolvedParticipant[] {
  const list = Array.isArray(profiles) ? profiles : [];
  const byId = new Map<string, any>();
  for (const profile of list) byId.set(String((profile as any)?.id || ""), profile);

  if (selection.participantMode === "players") {
    return cleanIds(selection.selectedPlayerIds)
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((profile: any) => ({
        id: String(profile.id),
        name: String(profile.name || profile.displayName || "Joueur"),
        avatarDataUrl: profile.avatarDataUrl || null,
        avatarUrl: profile.avatarUrl || profile.avatar || null,
        teamId: null,
        teamName: null,
        teamLogo: null,
      }));
  }

  const teams = Array.isArray(teamsOverride) ? teamsOverride : loadTeamsBySport("darts");
  const resolved = resolveTeamInstances(
    teams,
    selection.selectedTeamIds,
    selection.selectedTeamPlayerIds,
    Math.max(1, Number(selection.teamSize || 2))
  ) as any[];

  const out: TrainingResolvedParticipant[] = [];
  for (const team of resolved) {
    const teamId = String(team?.id || "");
    const teamName = String(team?.name || "Équipe");
    const teamLogo = team?.logoDataUrl || team?.logoUrl || team?.avatarDataUrl || team?.avatarUrl || null;
    for (const playerId of cleanIds(team?.playerIds || [])) {
      const profile: any = byId.get(playerId);
      if (!profile) continue;
      out.push({
        id: playerId,
        name: String(profile.name || profile.displayName || "Joueur"),
        avatarDataUrl: profile.avatarDataUrl || null,
        avatarUrl: profile.avatarUrl || profile.avatar || null,
        teamId,
        teamName,
        teamLogo,
      });
    }
  }
  return out;
}

export function buildTrainingParticipantConfig(
  selection: TrainingParticipantSelection,
  profiles?: Profile[]
) {
  const participants = resolveTrainingParticipants(selection, profiles);
  return {
    participantMode: selection.participantMode,
    selectedPlayerIds: participants.map((participant) => participant.id),
    selectedBotIds: [],
    selectedTeamIds: cleanIds(selection.selectedTeamIds),
    selectedTeamPlayerIds: selection.selectedTeamPlayerIds || {},
    teamSize: Math.max(1, Number(selection.teamSize || 2)),
    trainingParticipants: participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      teamId: participant.teamId || null,
      teamName: participant.teamName || null,
    })),
  };
}

function ToggleButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        minWidth: 0,
        borderRadius: 18,
        border: `1px solid ${active ? ACCENT : "rgba(255,255,255,.10)"}`,
        background: active ? ACCENT_SOFT : "rgba(255,255,255,.035)",
        color: "#fff",
        padding: 13,
        textAlign: "left",
        cursor: "pointer",
        boxShadow: active ? "0 0 20px rgba(39,220,255,.14)" : "none",
      }}
    >
      <div style={{ color: active ? ACCENT : "#f3f6ff", fontWeight: 950, fontSize: 15 }}>{title}</div>
      <div style={{ color: "#aeb2d3", fontSize: 11, lineHeight: 1.35, marginTop: 4 }}>{subtitle}</div>
    </button>
  );
}

function TeamSizeButton({ value, active, onClick }: { value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 36,
        borderRadius: 999,
        border: `1px solid ${active ? ACCENT : "rgba(255,255,255,.12)"}`,
        background: active ? ACCENT_SOFT : "rgba(255,255,255,.04)",
        color: active ? ACCENT : "#d5d9eb",
        fontWeight: 950,
        cursor: "pointer",
      }}
    >
      {value} joueurs / équipe
    </button>
  );
}

export default function TrainingParticipantsSelector({
  profiles,
  value,
  onChange,
  maxPlayers = 12,
}: {
  profiles?: Profile[];
  value: TrainingParticipantSelection;
  onChange: (next: TrainingParticipantSelection) => void;
  maxPlayers?: number;
}) {
  const safeProfiles = Array.isArray(profiles) ? profiles : [];
  const [teams, setTeams] = React.useState<TeamEntity[]>(() => loadTeamsBySport("darts"));

  React.useEffect(() => {
    const refresh = () => setTeams(loadTeamsBySport("darts"));
    window.addEventListener("storage", refresh);
    window.addEventListener("dc:teams-changed", refresh as EventListener);
    window.addEventListener("dc-teams-updated", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("dc:teams-changed", refresh as EventListener);
      window.removeEventListener("dc-teams-updated", refresh as EventListener);
    };
  }, []);

  const profileById = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const profile of safeProfiles) map.set(String((profile as any)?.id || ""), profile);
    return map;
  }, [safeProfiles]);

  const resolvedParticipants = React.useMemo(
    () => resolveTrainingParticipants(value, safeProfiles, teams),
    [value, safeProfiles, teams]
  );

  const update = React.useCallback(
    (patch: Partial<TrainingParticipantSelection>) => onChange({ ...value, ...patch }),
    [onChange, value]
  );

  const togglePlayer = React.useCallback(
    (rawId: string) => {
      const id = String(rawId || "");
      if (!id) return;
      const current = cleanIds(value.selectedPlayerIds);
      if (current.includes(id)) {
        update({ selectedPlayerIds: current.filter((item) => item !== id) });
      } else if (current.length < maxPlayers) {
        update({ selectedPlayerIds: [...current, id] });
      }
    },
    [maxPlayers, update, value.selectedPlayerIds]
  );

  const addTeam = React.useCallback(
    (baseTeamId: string, playerIds: string[]) => {
      const instanceId = nextTeamInstanceId(baseTeamId, value.selectedTeamIds || []);
      update({
        selectedTeamIds: [...cleanIds(value.selectedTeamIds), instanceId],
        selectedTeamPlayerIds: {
          ...(value.selectedTeamPlayerIds || {}),
          [instanceId]: cleanIds(playerIds),
        },
      });
    },
    [update, value.selectedTeamIds, value.selectedTeamPlayerIds]
  );

  const removeTeam = React.useCallback(
    (instanceId: string) => {
      const id = String(instanceId || "");
      const nextMap = { ...(value.selectedTeamPlayerIds || {}) };
      delete nextMap[id];
      update({
        selectedTeamIds: cleanIds(value.selectedTeamIds).filter((item) => item !== id),
        selectedTeamPlayerIds: nextMap,
      });
    },
    [update, value.selectedTeamIds, value.selectedTeamPlayerIds]
  );

  const replaceTeams = React.useCallback(
    (teamIds: string[], selectedTeamPlayerIds: Record<string, string[]>, generatedTeams: any[]) => {
      if (Array.isArray(generatedTeams) && generatedTeams.length) {
        setTeams((current) => {
          const map = new Map<string, any>();
          for (const team of [...generatedTeams, ...current]) {
            const id = String(team?.id || "");
            if (id && !map.has(id)) map.set(id, team);
          }
          return Array.from(map.values()) as TeamEntity[];
        });
      }
      update({
        selectedTeamIds: cleanIds(teamIds),
        selectedTeamPlayerIds: selectedTeamPlayerIds || {},
      });
    },
    [update]
  );

  const canStart = resolvedParticipants.length > 0;

  return (
    <section
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.05)",
        background: "rgba(10,12,24,.96)",
        boxShadow: "0 16px 40px rgba(0,0,0,.40)",
        padding: 12,
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 950, color: ACCENT, marginBottom: 7 }}>
        Participants Training
      </div>
      <div style={{ fontSize: 11, color: "#9298bb", lineHeight: 1.4, marginBottom: 11 }}>
        1 joueur = entraînement solo. Plusieurs joueurs ou plusieurs équipes = même exercice à tour de rôle, puis tableau comparatif commun.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9, marginBottom: 12 }}>
        <ToggleButton
          active={value.participantMode === "players"}
          title="Joueurs"
          subtitle="Solo ou groupe de profils locaux."
          onClick={() => update({ participantMode: "players" })}
        />
        <ToggleButton
          active={value.participantMode === "teams"}
          title="Équipes"
          subtitle="Training collectif avec comparaison individuelle + équipe."
          onClick={() => update({ participantMode: "teams" })}
        />
      </div>

      {value.participantMode === "players" ? (
        <PlayerPagedSelector
          usageMode="training"
          profiles={safeProfiles}
          selectedIds={value.selectedPlayerIds}
          onToggle={togglePlayer}
          accent={ACCENT}
          pageSize={9}
          modalTitle="Choisir les joueurs Training"
          showSelectedSummary={true}
          showProfileStarring={true}
        />
      ) : (
        <>
          <div style={{ fontSize: 10.5, color: "#aeb2d3", fontWeight: 900, marginBottom: 7 }}>FORMAT D'ÉQUIPE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 11 }}>
            {[2, 3, 4].map((size) => (
              <TeamSizeButton
                key={size}
                value={size}
                active={Number(value.teamSize) === size}
                onClick={() => update({ teamSize: size, selectedTeamIds: [], selectedTeamPlayerIds: {} })}
              />
            ))}
          </div>

          <TeamSelectorV2
            title="Équipes Training"
            teams={teams}
            selectedTeamIds={value.selectedTeamIds}
            selectedTeamPlayerIds={value.selectedTeamPlayerIds}
            profilesById={profileById}
            onAdd={addTeam}
            onRemove={removeTeam}
            maxPlayers={Math.max(1, Number(value.teamSize || 2))}
            primary={ACCENT}
            primarySoft={ACCENT_SOFT}
            emptyLabel="Aucune équipe Darts enregistrée."
            validatedTitle="Équipes Training validées"
            selectorTitle="Équipes Darts enregistrées"
            allowAutoShuffle={true}
            autoShufflePlayers={safeProfiles}
            sport="darts"
            onReplaceSelectedTeams={replaceTeams}
            onGeneratedTeamsChange={(generated) => {
              if (!Array.isArray(generated) || !generated.length) return;
              setTeams((current) => {
                const map = new Map<string, any>();
                for (const team of [...generated, ...current]) {
                  const id = String(team?.id || "");
                  if (id && !map.has(id)) map.set(id, team);
                }
                return Array.from(map.values()) as TeamEntity[];
              });
            }}
          />
        </>
      )}

      <div
        style={{
          marginTop: 10,
          borderRadius: 13,
          border: `1px solid ${canStart ? "rgba(39,220,255,.25)" : "rgba(255,110,130,.22)"}`,
          background: canStart ? "rgba(39,220,255,.06)" : "rgba(255,80,110,.06)",
          padding: "8px 10px",
          color: canStart ? "#dffaff" : "#ffc8d3",
          fontSize: 10.5,
          fontWeight: 850,
        }}
      >
        {canStart
          ? `${resolvedParticipants.length} participant${resolvedParticipants.length > 1 ? "s" : ""} prêt${resolvedParticipants.length > 1 ? "s" : ""}${value.participantMode === "teams" ? " pour le comparatif par équipes" : ""}.`
          : value.participantMode === "teams"
          ? "Sélectionne au moins une équipe avec ses joueurs."
          : "Sélectionne au moins un joueur."}
      </div>
    </section>
  );
}
