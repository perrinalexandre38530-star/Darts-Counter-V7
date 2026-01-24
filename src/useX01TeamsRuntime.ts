import { useState } from "react";

export type X01Team = {
  id: string;
  name: string;
  score: number;
  players: string[];
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
    setActivePlayerInTeamIndex((i) => (i + 1) % team.players.length);
    setActiveTeamIndex((i) => (i + 1) % teams.length);
  }

  return {
    teams,
    activeTeamIndex,
    activePlayerInTeamIndex,
    applyVisitScore,
  };
}
