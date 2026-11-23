/** KILLER en équipes : une entité de jeu par équipe, un tireur tournant. */
export type KillerTeamMember = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
  botLevel?: string;
};

export function groupKillerTeamMembers(selectedIds: string[], assignments: Record<string, number>, teamCount: number): string[][] {
  const count = Math.max(2, Math.min(4, Math.trunc(Number(teamCount) || 2)));
  return Array.from({ length: count }, (_, index) => selectedIds.filter((id, ordinal) => {
    const assigned = Number(assignments?.[id]);
    const slot = Number.isInteger(assigned) && assigned >= 0 ? assigned % count : ordinal % count;
    return slot === index;
  }));
}

export function setKillerTeamShooter<T extends {
  teamMembers?: KillerTeamMember[];
  teamCurrentMemberIndex?: number;
  isBot?: boolean;
  botLevel?: string;
  avatarDataUrl?: string | null;
}>(team: T, turnsCompleted: number): T {
  if (!Array.isArray(team?.teamMembers) || team.teamMembers.length === 0) return team;
  const index = Math.max(0, Math.trunc(Number(turnsCompleted) || 0)) % team.teamMembers.length;
  const member = team.teamMembers[index];
  return { ...team, teamCurrentMemberIndex: index, isBot: !!member.isBot,
    botLevel: member.botLevel || "", avatarDataUrl: member.avatarDataUrl ?? null };
}

export function teamMemberForTurn(team: { teamMembers?: KillerTeamMember[]; teamCurrentMemberIndex?: number }): KillerTeamMember | null {
  const members = Array.isArray(team?.teamMembers) ? team.teamMembers : [];
  if (!members.length) return null;
  return members[Math.max(0, Math.trunc(Number(team.teamCurrentMemberIndex || 0))) % members.length] || null;
}
