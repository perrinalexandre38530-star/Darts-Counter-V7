import {
  getOrganizationCompetitionDetail,
  getOrganizationRankings,
  listMyOrganizations,
  listOrganizationAnnouncements,
  listOrganizationCompetitions,
  listOrganizationEvents,
  listOrganizationFederationLinks,
  listOrganizationFeeCampaigns,
  listOrganizationFeeMembers,
  listOrganizationGroups,
  listOrganizationInstallations,
  listOrganizationInvitations,
  listOrganizationMembers,
  listOrganizationPartners,
  loadOrganizationLocalState,
} from "./organizationService";
import { loadOrganizationWorkspace } from "./organizationWorkspace";

export type OrganizationBackupSnapshot = {
  _v: 1;
  userId: string;
  createdAt: string;
  workspace: ReturnType<typeof loadOrganizationWorkspace>;
  localState: ReturnType<typeof loadOrganizationLocalState>;
  organizations: Array<{
    organization: any;
    groups: any[];
    events: any[];
    members: any[];
    invitations: any[];
    competitions: any[];
    competitionDetails: any[];
    rankings: any[];
    announcements: any[];
    feeCampaigns: any[];
    feeMembers: Record<string, any[]>;
    partners: any[];
    federationLinks: any[];
    installations: any[];
    cloudAvailable: Record<string, boolean>;
    errors: string[];
  }>;
};

function errText(error: unknown) {
  return String((error as any)?.message || error || "Erreur inconnue");
}

/**
 * Archive complète de l'espace Organisations pour les snapshots R2/NAS/fichier.
 * Les données Supabase restent la source live ; ce bloc sert de copie de secours
 * indépendante afin qu'une sauvegarde de compte contienne aussi le collectif.
 */
export async function exportOrganizationsBackupSnapshot(userId?: string | null): Promise<OrganizationBackupSnapshot | null> {
  const uid = String(userId || "").trim();
  if (!uid) return null;

  const localState = loadOrganizationLocalState(uid);
  let organizations = localState.organizations;
  try {
    const listed = await listMyOrganizations(uid);
    if (listed.organizations.length) organizations = listed.organizations;
  } catch {}

  const archived = await Promise.all(organizations.map(async (organization) => {
    const errors: string[] = [];
    const cloudAvailable: Record<string, boolean> = {};
    const safe = async <T,>(label: string, fallback: T, job: () => Promise<T>): Promise<T> => {
      try { return await job(); }
      catch (error) { errors.push(`${label}: ${errText(error)}`); return fallback; }
    };

    const [groupsResult, eventsResult, membersResult, invitationsResult, competitionsResult, announcementsResult, feeResult, partnersResult, federationsResult, installationsResult] = await Promise.all([
      safe("groups", { groups: [], cloudAvailable: false }, () => listOrganizationGroups(uid, organization.id)),
      safe("events", { events: [], cloudAvailable: false }, () => listOrganizationEvents(uid, organization.id)),
      safe("members", { members: [], cloudAvailable: false }, () => listOrganizationMembers(uid, organization.id)),
      safe("invitations", { invitations: [], cloudAvailable: false }, () => listOrganizationInvitations(uid, organization.id)),
      safe("competitions", { competitions: [], cloudAvailable: false }, () => listOrganizationCompetitions(uid, organization.id)),
      safe("announcements", { announcements: [], cloudAvailable: false }, () => listOrganizationAnnouncements(uid, organization.id)),
      safe("fees", { campaigns: [], cloudAvailable: false }, () => listOrganizationFeeCampaigns(uid, organization.id)),
      safe("partners", { partners: [], cloudAvailable: false }, () => listOrganizationPartners(uid, organization.id)),
      safe("federations", { links: [], cloudAvailable: false }, () => listOrganizationFederationLinks(uid, organization.id)),
      safe("installations", { installations: [], cloudAvailable: false }, () => listOrganizationInstallations(uid, organization.id)),
    ]);

    cloudAvailable.groups = groupsResult.cloudAvailable;
    cloudAvailable.events = eventsResult.cloudAvailable;
    cloudAvailable.members = membersResult.cloudAvailable;
    cloudAvailable.invitations = invitationsResult.cloudAvailable;
    cloudAvailable.competitions = competitionsResult.cloudAvailable;
    cloudAvailable.announcements = announcementsResult.cloudAvailable;
    cloudAvailable.fees = feeResult.cloudAvailable;
    cloudAvailable.partners = partnersResult.cloudAvailable;
    cloudAvailable.federations = federationsResult.cloudAvailable;
    cloudAvailable.installations = installationsResult.cloudAvailable;

    const competitionDetails = await Promise.all(competitionsResult.competitions.map((competition: any) =>
      safe(`competition:${competition.id}`, null as any, () => getOrganizationCompetitionDetail(uid, competition.id))
    ));
    const rankings = await safe("rankings", [] as any[], () => getOrganizationRankings(uid, organization.id, {}));
    const feeMembersEntries = await Promise.all(feeResult.campaigns.map(async (campaign: any) => [
      String(campaign.id),
      await safe(`feeMembers:${campaign.id}`, [] as any[], () => listOrganizationFeeMembers(uid, campaign.id)),
    ] as const));

    return {
      organization,
      groups: groupsResult.groups,
      events: eventsResult.events,
      members: membersResult.members,
      invitations: invitationsResult.invitations,
      competitions: competitionsResult.competitions,
      competitionDetails: competitionDetails.filter(Boolean),
      rankings,
      announcements: announcementsResult.announcements,
      feeCampaigns: feeResult.campaigns,
      feeMembers: Object.fromEntries(feeMembersEntries),
      partners: partnersResult.partners,
      federationLinks: federationsResult.links,
      installations: installationsResult.installations,
      cloudAvailable,
      errors,
    };
  }));

  return {
    _v: 1,
    userId: uid,
    createdAt: new Date().toISOString(),
    workspace: loadOrganizationWorkspace(uid),
    localState,
    organizations: archived,
  };
}
