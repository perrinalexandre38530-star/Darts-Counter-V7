import type { TeamEntity } from "../lib/petanqueTeamsStore";

/**
 * WAVE 8 — frontière d'autorité compte / organisation.
 *
 * Une Team peut rester visible dans le store Teams commun pour l'UI tout en
 * appartenant fonctionnellement à une organisation. Dans ce cas elle est une
 * projection locale de la source collective (Supabase / API Club) et ne doit
 * jamais être répliquée par le canal privé account_sync_documents.
 */
export const ORGANIZATION_DATA_BOUNDARY_VERSION = 1 as const;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export function organizationIdForTeam(team: any): string | null {
  const explicit = clean(team?.authorityOrganizationId || team?.organizationId || team?.organization_id);
  if (explicit) return explicit;
  const clubId = clean(team?.clubId || team?.syncedClubId);
  return clubId || null;
}

export function isOrganizationManagedTeam(team: any): boolean {
  if (!team || typeof team !== "object") return false;
  const explicit = clean(team?.dataAuthority || team?.authorityScope).toLowerCase();
  if (explicit === "organization") return true;
  if (explicit === "account") return false;

  // Les deux intégrations collectives historiques utilisent ces marqueurs.
  if (clean(team?.syncedClubTeamId || team?.clubTeamId || team?.onlineTeamId)) return true;
  if (clean(team?.clubId || team?.syncedClubId) && String(team?.teamKind || "").toLowerCase() === "club") return true;
  return false;
}

export function isAccountOwnedTeam(team: any): boolean {
  return !!team && typeof team === "object" && !isOrganizationManagedTeam(team);
}

export function accountOwnedTeams<T = TeamEntity>(teamsInput: readonly T[] | null | undefined): T[] {
  return (Array.isArray(teamsInput) ? teamsInput : []).filter((team: any) => isAccountOwnedTeam(team));
}

export function organizationManagedTeams<T = TeamEntity>(teamsInput: readonly T[] | null | undefined): T[] {
  return (Array.isArray(teamsInput) ? teamsInput : []).filter((team: any) => isOrganizationManagedTeam(team));
}

/**
 * Remplace uniquement la partition personnelle du store Teams. Les projections
 * Organisation déjà présentes restent intactes et ne peuvent donc pas être
 * effacées par un restore/sync du compte privé.
 */
export function mergeAccountTeamsPreservingOrganizations<T = TeamEntity>(
  currentInput: readonly T[] | null | undefined,
  accountInput: readonly T[] | null | undefined,
): T[] {
  const orgRows = organizationManagedTeams(currentInput);
  const accountRows = accountOwnedTeams(accountInput);
  const byId = new Map<string, T>();

  // Les projections collectives gagnent en cas de collision d'ID : leur source
  // d'autorité n'est pas le canal compte et elles seront rafraîchies par l'orga.
  for (const row of accountRows) {
    const id = clean((row as any)?.id);
    if (id) byId.set(id, row);
  }
  for (const row of orgRows) {
    const id = clean((row as any)?.id);
    if (id) byId.set(id, row);
  }
  return Array.from(byId.values());
}

export function summarizeTeamAuthority(teamsInput: readonly any[] | null | undefined) {
  const rows = Array.isArray(teamsInput) ? teamsInput : [];
  const account = accountOwnedTeams(rows);
  const organization = organizationManagedTeams(rows);
  const organizationIds = Array.from(new Set(organization.map(organizationIdForTeam).filter(Boolean) as string[])).sort();
  return { total: rows.length, account: account.length, organization: organization.length, organizationIds };
}

export function isOrganizationMediaKey(keyInput: unknown): boolean {
  const key = clean(keyInput).toLowerCase();
  return /^(club_logo|club_cover|group_avatar|group_cover|organization_logo|organization_cover):/.test(key);
}
