// =============================================================
// src/lib/teamsStore.ts
// WAVE 3 — façade de compatibilité vers le store Teams canonique.
//
// IMPORTANT : ce module ne possède plus de persistance propre. Toute lecture /
// écriture passe par petanqueTeamsStore.ts afin qu’un ancien écran ne puisse
// plus réécrire dc-teams-v1 avec un schéma appauvri.
// =============================================================

import {
  loadTeams as loadCanonicalTeams,
  saveTeams as saveCanonicalTeams,
  loadTeamsBySport as loadCanonicalTeamsBySport,
  createTeam as createCanonicalTeam,
  updateTeam as updateCanonicalTeam,
  deleteTeam as deleteCanonicalTeam,
  fileToDataUrl as canonicalFileToDataUrl,
  type TeamEntity,
  type TeamSport,
} from "./petanqueTeamsStore";

export type { TeamSport };
export type Team = TeamEntity;

/** @deprecated Utiliser petanqueTeamsStore.loadTeams(). */
export function loadTeams(): Team[] {
  return loadCanonicalTeams();
}

/** @deprecated Utiliser petanqueTeamsStore.saveTeams(). */
export function saveTeams(next: Team[]) {
  return saveCanonicalTeams(Array.isArray(next) ? next : []);
}

/** @deprecated Utiliser petanqueTeamsStore.loadTeamsBySport(). */
export function loadTeamsBySport(sport: TeamSport): Team[] {
  return loadCanonicalTeamsBySport(sport);
}

/** @deprecated Utiliser petanqueTeamsStore.createTeam(). */
export function createTeam(input: {
  sport: TeamSport;
  name: string;
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  allSports?: boolean;
  sportIds?: TeamSport[];
  teamKind?: "leisure" | "club";
  clubName?: string | null;
  clubId?: string | null;
}): Team {
  const created = createCanonicalTeam({
    sport: input.sport,
    name: input.name,
    logoDataUrl: input.logoDataUrl ?? input.logoUrl ?? null,
    allSports: input.allSports,
    sportIds: input.sportIds,
    teamKind: input.teamKind,
    clubName: input.clubName,
    clubId: input.clubId,
  });
  // logoUrl est conservé si l’appel legacy en fournit un qui n’est pas déjà
  // devenu logoDataUrl dans la normalisation canonique.
  if (input.logoUrl && created.logoUrl !== input.logoUrl) {
    return updateCanonicalTeam(created.id, { logoUrl: input.logoUrl }) || created;
  }
  return created;
}

/** @deprecated Utiliser petanqueTeamsStore.updateTeam(). */
export function updateTeam(
  id: string,
  patch: Partial<Omit<Team, "id" | "createdAt">>,
): Team | null {
  return updateCanonicalTeam(id, patch);
}

/** @deprecated Utiliser petanqueTeamsStore.deleteTeam(). */
export function deleteTeam(id: string) {
  return deleteCanonicalTeam(id);
}

export function fileToDataUrl(file: File): Promise<string> {
  return canonicalFileToDataUrl(file);
}
