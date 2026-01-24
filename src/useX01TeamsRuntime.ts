import { useState } from "react";

export type X01Team = {
  id: string;
  name: string;
  score: number;
  // source de vérité: players
  players?: string[];
  // compat legacy (ancien patch): playerIds
  playerIds?: string[];
};

const getTeamPlayers = (team: X01Team): string[] => {
  if (Array.isArray(team.players)) return team.players;
  if (Array.isArray(team.playerIds)) return team.playerIds;
  return [];
};

export function useX01TeamsRuntime(initialTeams: X01Team[]) {
  const [teams, setTeams] = useState<X01Team[]>(initialTeams);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [activePlayerInTeamIndex, setActivePlayerInTeamIndex] = useState(0);

  function applyVisitScore(visitScore: number) {
    setTeams(prev => {
      const next = [...prev];
      next[activeTeamIndex] = {
        ...next[activeTeamIndex],
        score: next[activeTeamIndex].score - visitScore,
      };
      return next;
    });

    rotate();
  }

  function rotate() {
    const team = teams[activeTeamIndex];
    const members = getTeamPlayers(team);
    const m = Math.max(1, members.length);
    setActivePlayerInTeamIndex((i) => (i + 1) % m);
    setActiveTeamIndex((i) => (i + 1) % teams.length);
  }

  return {
    teams,
    activeTeamIndex,
    activePlayerInTeamIndex,
    applyVisitScore,
  };
}
