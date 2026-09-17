import { supabase } from "../lib/supabaseClient";
import { loadTeams, saveTeams, type TeamEntity } from "../lib/petanqueTeamsStore";

export type OrganizationKind =
  | "club"
  | "association"
  | "company"
  | "venue"
  | "school"
  | "local_authority"
  | "organizer"
  | "other";

export type OrganizationRole = "owner" | "admin" | "manager" | "captain" | "member" | "guest";
export type OrganizationPlan = "group" | "club" | "pro" | "business" | "custom";
export type OrganizationSource = "cloud" | "local";

export type OrganizationMember = {
  membershipId: string;
  organizationId: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  countryCode: string;
  role: OrganizationRole;
  status: "active" | "suspended" | "invited";
  joinedAt: string;
  updatedAt: string;
  groupIds: string[];
};

export type OrganizationInvitation = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationKind: OrganizationKind;
  invitedUserId: string;
  invitedByUserId: string;
  displayName: string;
  avatarUrl: string;
  countryCode: string;
  invitedByDisplayName: string;
  role: OrganizationRole;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdAt: string;
  respondedAt: string;
};

export type OrganizationAdminSettings = {
  defaultLanguage: "auto" | "fr" | "en" | "es";
  timezone: string;
  compactDashboard: boolean;
  enabledModules: string[];
  requestedPlan: OrganizationPlan | "";
};

export type OrganizationProfile = {
  legalName: string;
  acronym: string;
  addressLine: string;
  postalCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  memberEstimate: number;
  sports: string[];
  facilities: string;
  foundedYear: string;
  logoMediaKey: string;
  coverMediaKey: string;
  profileCompleted: boolean;
  adminSettings: OrganizationAdminSettings;
};

export type OrganizationRecord = {
  id: string;
  name: string;
  kind: OrganizationKind;
  plan: OrganizationPlan;
  role: OrganizationRole;
  joinCode: string;
  city: string;
  countryCode: string;
  description: string;
  profile: OrganizationProfile;
  memberCount: number;
  groupCount: number;
  eventCount: number;
  createdAt: string;
  updatedAt: string;
  source: OrganizationSource;
};

export type OrganizationCreateInput = {
  name: string;
  kind: OrganizationKind;
  plan: OrganizationPlan;
  city?: string;
  countryCode?: string;
  description?: string;
  profile?: Partial<OrganizationProfile>;
};



export type OrganizationInstallationKind = "dartboard" | "table" | "pitch" | "court" | "lane" | "room" | "station" | "other";
export type OrganizationInstallationStatus = "active" | "maintenance" | "archived";

export type OrganizationInstallation = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationKind: OrganizationKind;
  name: string;
  kind: OrganizationInstallationKind;
  sportId: string;
  zoneLabel: string;
  qrToken: string;
  status: OrganizationInstallationStatus;
  playCount: number;
  lastPlayedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationInstallationInput = {
  name: string;
  kind: OrganizationInstallationKind;
  sportId: string;
  zoneLabel?: string;
  status?: OrganizationInstallationStatus;
};

export type OrganizationGroupKind = "team" | "section" | "department" | "class" | "group";

export type OrganizationLocalGroup = {
  id: string;
  organizationId: string;
  name: string;
  sportId: string;
  kind: OrganizationGroupKind;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  captainUserId: string;
  captainDisplayName: string;
  captainAvatarUrl: string;
  logoMediaKey: string;
  status: "active" | "archived";
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationGroupInput = {
  name: string;
  sportId: string;
  kind?: OrganizationGroupKind;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  captainUserId?: string | null;
  logoMediaKey?: string;
  status?: "active" | "archived";
};


export type OrganizationCompetitionFormat = "league" | "knockout" | "groups_knockout" | "ladder" | "challenge";
export type OrganizationCompetitionParticipantMode = "teams" | "individuals";
export type OrganizationCompetitionStatus = "draft" | "open" | "active" | "completed" | "archived";
export type OrganizationCompetitionFixtureStatus = "scheduled" | "completed" | "cancelled";

export type OrganizationCompetition = {
  id: string;
  organizationId: string;
  name: string;
  sportId: string;
  format: OrganizationCompetitionFormat;
  participantMode: OrganizationCompetitionParticipantMode;
  status: OrganizationCompetitionStatus;
  startsAt: string;
  endsAt: string;
  description: string;
  participantCount: number;
  fixtureCount: number;
  completedFixtureCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationCompetitionParticipant = {
  id: string;
  competitionId: string;
  organizationId: string;
  entityType: "group" | "member";
  entityId: string;
  displayName: string;
  avatarUrl: string;
  seed: number;
};

export type OrganizationCompetitionFixture = {
  id: string;
  competitionId: string;
  organizationId: string;
  round: number;
  sequence: number;
  groupLabel: string;
  homeParticipantId: string;
  awayParticipantId: string;
  homeName: string;
  awayName: string;
  scheduledAt: string;
  status: OrganizationCompetitionFixtureStatus;
  winnerParticipantId: string;
  scoreLabel: string;
  resultRef: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationCompetitionDetail = {
  competition: OrganizationCompetition;
  participants: OrganizationCompetitionParticipant[];
  fixtures: OrganizationCompetitionFixture[];
};

export type OrganizationRankingRow = {
  rank: number;
  entityType: "group" | "member";
  entityId: string;
  displayName: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  winRate: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDiff: number;
  currentStreak: number;
  currentStreakType: "W" | "L";
  bestWinStreak: number;
  recentForm: string;
};

export type OrganizationRankingFilters = {
  competitionId?: string | null;
  sportId?: string | null;
};

export type OrganizationCompetitionInput = {
  name: string;
  sportId: string;
  format: OrganizationCompetitionFormat;
  participantMode: OrganizationCompetitionParticipantMode;
  startsAt?: string;
  description?: string;
  entityIds: string[];
};

export type OrganizationAnnouncement = {
  id: string;
  organizationId: string;
  groupId: string;
  groupName: string;
  title: string;
  body: string;
  pinned: boolean;
  expiresAt: string;
  createdByUserId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationAnnouncementInput = {
  groupId?: string | null;
  title: string;
  body: string;
  pinned?: boolean;
  expiresAt?: string | null;
};

export type OrganizationFederationIntegrationMode = "manual" | "portal" | "api";
export type OrganizationFederationStatus = "pending" | "active" | "disabled";

export type OrganizationFederationLink = {
  id: string;
  organizationId: string;
  federationName: string;
  federationCode: string;
  countryCode: string;
  season: string;
  affiliationNumber: string;
  externalClubId: string;
  portalUrl: string;
  integrationMode: OrganizationFederationIntegrationMode;
  connectorKey: string;
  status: OrganizationFederationStatus;
  writeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationFederationLinkInput = {
  id?: string | null;
  federationName: string;
  federationCode?: string;
  countryCode?: string;
  season?: string;
  affiliationNumber?: string;
  externalClubId?: string;
  portalUrl?: string;
  integrationMode?: OrganizationFederationIntegrationMode;
  connectorKey?: string;
  status?: OrganizationFederationStatus;
};


export type OrganizationFeeKind = "membership" | "license" | "event" | "other";
export type OrganizationFeeCampaignStatus = "draft" | "open" | "closed" | "archived";
export type OrganizationFeeMemberStatus = "pending" | "overdue" | "paid" | "waived";

export type OrganizationFeeCampaign = {
  id: string;
  organizationId: string;
  groupId: string;
  groupName: string;
  title: string;
  feeKind: OrganizationFeeKind;
  amountCents: number;
  currency: string;
  dueAt: string;
  description: string;
  paymentUrl: string;
  status: OrganizationFeeCampaignStatus;
  targetCount: number;
  paidCount: number;
  waivedCount: number;
  myStatus: OrganizationFeeMemberStatus;
  isTargeted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationFeeCampaignInput = {
  groupId?: string | null;
  title: string;
  feeKind: OrganizationFeeKind;
  amountCents: number;
  currency?: string;
  dueAt?: string | null;
  description?: string;
  paymentUrl?: string;
};

export type OrganizationFeeMember = {
  userId: string;
  displayName: string;
  avatarUrl: string;
  countryCode: string;
  status: OrganizationFeeMemberStatus;
  paidAt: string;
  note: string;
  externalRef: string;
  updatedAt: string;
};

export type OrganizationPartnerKind = "sponsor" | "partner" | "supplier" | "institutional";
export type OrganizationPartnerStatus = "draft" | "active" | "paused" | "archived";
export type OrganizationPartnerPlacement = "organization" | "team" | "competition" | "venue" | "all";

export type OrganizationPartner = {
  id: string;
  organizationId: string;
  groupId: string;
  groupName: string;
  partnerKind: OrganizationPartnerKind;
  name: string;
  category: string;
  websiteUrl: string;
  offerTitle: string;
  offerText: string;
  promoCode: string;
  placement: OrganizationPartnerPlacement;
  startsAt: string;
  endsAt: string;
  logoMediaKey: string;
  status: OrganizationPartnerStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationPartnerInput = {
  groupId?: string | null;
  partnerKind: OrganizationPartnerKind;
  name: string;
  category?: string;
  websiteUrl?: string;
  offerTitle?: string;
  offerText?: string;
  promoCode?: string;
  placement?: OrganizationPartnerPlacement;
  startsAt?: string | null;
  endsAt?: string | null;
  logoMediaKey?: string;
};

export type OrganizationEventType = "event" | "training" | "match" | "tournament" | "meeting" | "other";

export type OrganizationLocalEvent = {
  id: string;
  organizationId: string;
  groupId: string;
  title: string;
  eventType: OrganizationEventType;
  startsAt: string;
  endsAt: string;
  location: string;
  createdBy: string;
  createdAt: string;
};

export type OrganizationEventInput = {
  groupId?: string | null;
  title: string;
  eventType?: OrganizationEventType;
  startsAt: string;
  endsAt?: string | null;
  location?: string;
};

type LocalState = {
  organizations: OrganizationRecord[];
  activeOrganizationId: string | null;
  groups: OrganizationLocalGroup[];
  events: OrganizationLocalEvent[];
};

const STORAGE_PREFIX = "msc_organizations_v1";

function nowIso() {
  return new Date().toISOString();
}

function normalizeUserKey(userId?: string | null): string {
  const raw = String(userId || "guest").trim().toLowerCase();
  return raw.replace(/[^a-z0-9_-]/g, "_").slice(0, 96) || "guest";
}

function storageKey(userId?: string | null) {
  return `${STORAGE_PREFIX}:${normalizeUserKey(userId)}`;
}

function emptyState(): LocalState {
  return { organizations: [], activeOrganizationId: null, groups: [], events: [] };
}

function safeParseState(value: string | null): LocalState {
  if (!value) return emptyState();
  try {
    const parsed = JSON.parse(value) as Partial<LocalState>;
    return {
      organizations: Array.isArray(parsed.organizations) ? parsed.organizations.map((item: any) => parseOrganizationRow(item, item?.source === "cloud" ? "cloud" : "local")) : [],
      activeOrganizationId: typeof parsed.activeOrganizationId === "string" ? parsed.activeOrganizationId : null,
      groups: Array.isArray(parsed.groups) ? parsed.groups.map(parseGroupRow) : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return emptyState();
  }
}

export function loadOrganizationLocalState(userId?: string | null): LocalState {
  if (typeof window === "undefined") return emptyState();
  try {
    return safeParseState(window.localStorage.getItem(storageKey(userId)));
  } catch {
    return emptyState();
  }
}

function saveOrganizationLocalState(userId: string | null | undefined, state: LocalState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch (error) {
    console.warn("[organizations] local save failed", error);
  }
}

function randomToken(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  try {
    const buf = new Uint32Array(length);
    globalThis.crypto?.getRandomValues?.(buf);
    for (let i = 0; i < length; i += 1) out += alphabet[(buf[i] ?? i) % alphabet.length];
    if (out.length === length) return out;
  } catch {}
  while (out.length < length) out += alphabet[Math.floor(Math.random() * alphabet.length)] || "X";
  return out;
}

function localId(prefix: string) {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `${prefix}_${uuid}`;
  } catch {}
  return `${prefix}_${Date.now().toString(36)}_${randomToken(6).toLowerCase()}`;
}

function coerceKind(value: unknown): OrganizationKind {
  const kind = String(value || "").toLowerCase();
  const allowed: OrganizationKind[] = ["club", "association", "company", "venue", "school", "local_authority", "organizer", "other"];
  return allowed.includes(kind as OrganizationKind) ? (kind as OrganizationKind) : "other";
}

function coerceRole(value: unknown): OrganizationRole {
  const role = String(value || "").toLowerCase();
  const allowed: OrganizationRole[] = ["owner", "admin", "manager", "captain", "member", "guest"];
  return allowed.includes(role as OrganizationRole) ? (role as OrganizationRole) : "member";
}

function coercePlan(value: unknown): OrganizationPlan {
  const plan = String(value || "").toLowerCase();
  const allowed: OrganizationPlan[] = ["group", "club", "pro", "business", "custom"];
  return allowed.includes(plan as OrganizationPlan) ? (plan as OrganizationPlan) : "group";
}

export function normalizeOrganizationProfile(input: any = {}): OrganizationProfile {
  const sports = Array.isArray(input?.sports)
    ? input.sports.map((value: unknown) => String(value || "").trim()).filter(Boolean).slice(0, 24)
    : [];
  const yearRaw = String(input?.foundedYear || input?.founded_year || "").replace(/[^0-9]/g, "").slice(0, 4);
  const estimate = Math.max(0, Math.min(1_000_000, Math.round(Number(input?.memberEstimate ?? input?.member_estimate ?? 0) || 0)));
  const rawAdmin = input?.adminSettings && typeof input.adminSettings === "object"
    ? input.adminSettings
    : input?.admin_settings && typeof input.admin_settings === "object"
      ? input.admin_settings
      : {};
  const allowedModules = ["communication", "federations", "billing", "sponsors"];
  const enabledModules = Array.isArray(rawAdmin?.enabledModules ?? rawAdmin?.enabled_modules)
    ? Array.from(new Set((rawAdmin.enabledModules ?? rawAdmin.enabled_modules).map((value: unknown) => String(value || "").trim()).filter((value: string) => allowedModules.includes(value))))
    : [...allowedModules];
  const requestedPlanRaw = String(rawAdmin?.requestedPlan ?? rawAdmin?.requested_plan ?? "").toLowerCase();
  const requestedPlan = (["group", "club", "pro", "business", "custom"] as string[]).includes(requestedPlanRaw) ? requestedPlanRaw as OrganizationPlan : "";
  const defaultLanguageRaw = String(rawAdmin?.defaultLanguage ?? rawAdmin?.default_language ?? "auto").toLowerCase();
  const defaultLanguage = (["auto", "fr", "en", "es"] as string[]).includes(defaultLanguageRaw)
    ? defaultLanguageRaw as OrganizationAdminSettings["defaultLanguage"]
    : "auto";
  return {
    legalName: String(input?.legalName || input?.legal_name || "").trim().slice(0, 140),
    acronym: String(input?.acronym || "").trim().slice(0, 24),
    addressLine: String(input?.addressLine || input?.address_line || "").trim().slice(0, 180),
    postalCode: String(input?.postalCode || input?.postal_code || "").trim().slice(0, 24),
    contactName: String(input?.contactName || input?.contact_name || "").trim().slice(0, 120),
    contactEmail: String(input?.contactEmail || input?.contact_email || "").trim().slice(0, 180),
    contactPhone: String(input?.contactPhone || input?.contact_phone || "").trim().slice(0, 64),
    website: String(input?.website || "").trim().slice(0, 220),
    memberEstimate: estimate,
    sports: Array.from(new Set(sports)),
    facilities: String(input?.facilities || "").trim().slice(0, 220),
    foundedYear: yearRaw,
    logoMediaKey: String(input?.logoMediaKey || input?.logo_media_key || "").trim().slice(0, 220),
    coverMediaKey: String(input?.coverMediaKey || input?.cover_media_key || "").trim().slice(0, 220),
    profileCompleted: input?.profileCompleted === true || input?.profile_completed === true,
    adminSettings: {
      defaultLanguage,
      timezone: String(rawAdmin?.timezone || "").trim().slice(0, 80),
      compactDashboard: rawAdmin?.compactDashboard === true || rawAdmin?.compact_dashboard === true,
      enabledModules,
      requestedPlan,
    },
  };
}

function parseOrganizationRow(row: any, source: OrganizationSource): OrganizationRecord {
  const createdAt = String(row?.createdAt || row?.created_at || nowIso());
  return {
    id: String(row?.id || row?.organizationId || row?.organization_id || localId("org")),
    name: String(row?.name || "Organisation").trim() || "Organisation",
    kind: coerceKind(row?.kind),
    plan: coercePlan(row?.plan),
    role: coerceRole(row?.role),
    joinCode: String(row?.joinCode || row?.join_code || "").trim().toUpperCase(),
    city: String(row?.city || "").trim(),
    countryCode: String(row?.countryCode || row?.country_code || "FR").trim().toUpperCase().slice(0, 2),
    description: String(row?.description || "").trim(),
    profile: normalizeOrganizationProfile({
      ...(row?.profile && typeof row.profile === "object" ? row.profile : {}),
      logoMediaKey: row?.logoMediaKey || row?.logo_media_key || row?.profile?.logoMediaKey || row?.profile?.logo_media_key,
      coverMediaKey: row?.coverMediaKey || row?.cover_media_key || row?.profile?.coverMediaKey || row?.profile?.cover_media_key,
    }),
    memberCount: Math.max(1, Number(row?.memberCount ?? row?.member_count ?? 1) || 1),
    groupCount: Math.max(0, Number(row?.groupCount ?? row?.group_count ?? 0) || 0),
    eventCount: Math.max(0, Number(row?.eventCount ?? row?.event_count ?? 0) || 0),
    createdAt,
    updatedAt: String(row?.updatedAt || row?.updated_at || createdAt),
    source,
  };
}

function mergeCloudIntoLocal(userId: string | null | undefined, cloudRows: OrganizationRecord[]): OrganizationRecord[] {
  const state = loadOrganizationLocalState(userId);
  const localOnly = state.organizations.filter((org) => org.source === "local" && !cloudRows.some((cloud) => cloud.id === org.id));
  const merged = [...cloudRows, ...localOnly];
  const active = state.activeOrganizationId && merged.some((org) => org.id === state.activeOrganizationId)
    ? state.activeOrganizationId
    : merged[0]?.id ?? null;
  saveOrganizationLocalState(userId, { ...state, organizations: merged, activeOrganizationId: active });
  return merged;
}

export function setActiveOrganization(userId: string | null | undefined, organizationId: string | null) {
  const state = loadOrganizationLocalState(userId);
  saveOrganizationLocalState(userId, { ...state, activeOrganizationId: organizationId });
}

export async function listMyOrganizations(userId: string | null | undefined): Promise<{ organizations: OrganizationRecord[]; cloudAvailable: boolean; warning?: string }> {
  const local = loadOrganizationLocalState(userId).organizations;
  if (!userId) return { organizations: local, cloudAvailable: false, warning: "Compte en ligne requis pour synchroniser une organisation entre plusieurs appareils." };

  try {
    const { data, error } = await supabase.rpc("ms_org_list_mine");
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map((row) => parseOrganizationRow(row, "cloud")) : [];
    return { organizations: mergeCloudIntoLocal(userId, rows), cloudAvailable: true };
  } catch (error: any) {
    const message = String(error?.message || "");
    return {
      organizations: local,
      cloudAvailable: false,
      warning: message
        ? "Le socle Organisation fonctionne localement. La migration Supabase PARTENARIATS doit être déployée pour le partage multi-utilisateur."
        : "Mode local actif pour les organisations.",
    };
  }
}

function cacheOrganization(userId: string | null | undefined, organization: OrganizationRecord) {
  const state = loadOrganizationLocalState(userId);
  const next = [organization, ...state.organizations.filter((item) => item.id !== organization.id)];
  saveOrganizationLocalState(userId, { ...state, organizations: next, activeOrganizationId: organization.id });
}

export async function createOrganization(userId: string | null | undefined, input: OrganizationCreateInput): Promise<{ organization: OrganizationRecord; cloudAvailable: boolean; warning?: string }> {
  const clean: OrganizationCreateInput = {
    name: String(input.name || "").trim().slice(0, 96),
    kind: coerceKind(input.kind),
    plan: coercePlan(input.plan),
    city: String(input.city || "").trim().slice(0, 96),
    countryCode: String(input.countryCode || "FR").trim().toUpperCase().slice(0, 2) || "FR",
    description: String(input.description || "").trim().slice(0, 500),
    profile: normalizeOrganizationProfile(input.profile || {}),
  };
  if (clean.name.length < 2) throw new Error("Le nom de l’organisation doit contenir au moins 2 caractères.");

  if (userId) {
    try {
      const { data, error } = await supabase.rpc("ms_org_create", {
        p_name: clean.name,
        p_kind: clean.kind,
        p_plan: clean.plan,
        p_city: clean.city || null,
        p_country_code: clean.countryCode || "FR",
        p_description: clean.description || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row === "object") {
        const organization = parseOrganizationRow(row, "cloud");
        cacheOrganization(userId, organization);
        return { organization, cloudAvailable: true };
      }
    } catch (error) {
      console.warn("[organizations] cloud create unavailable, using local fallback", error);
    }
  }

  const createdAt = nowIso();
  const organization: OrganizationRecord = {
    id: localId("org"),
    name: clean.name,
    kind: clean.kind,
    plan: clean.plan,
    role: "owner",
    joinCode: `MSS-${randomToken(8)}`,
    city: clean.city || "",
    countryCode: clean.countryCode || "FR",
    description: clean.description || "",
    profile: normalizeOrganizationProfile(clean.profile || {}),
    memberCount: 1,
    groupCount: 0,
    eventCount: 0,
    createdAt,
    updatedAt: createdAt,
    source: "local",
  };
  cacheOrganization(userId, organization);
  return {
    organization,
    cloudAvailable: false,
    warning: "Organisation créée sur cet appareil. Déploie la migration Supabase fournie dans le patch pour activer les invitations multi-utilisateur.",
  };
}

export async function updateOrganizationProfile(
  userId: string | null | undefined,
  organizationId: string,
  profileInput: Partial<OrganizationProfile>,
): Promise<{ organization: OrganizationRecord; cloudAvailable: boolean; warning?: string }> {
  const state = loadOrganizationLocalState(userId);
  const current = state.organizations.find((item) => item.id === organizationId);
  if (!current) throw new Error("Organisation introuvable.");

  const profile = normalizeOrganizationProfile({ ...current.profile, ...profileInput });
  const localOrganization: OrganizationRecord = { ...current, profile, updatedAt: nowIso() };
  cacheOrganization(userId, localOrganization);

  if (userId && current.source === "cloud") {
    try {
      const cloudProfile = { ...profile };
      delete (cloudProfile as any).logoMediaKey;
      delete (cloudProfile as any).coverMediaKey;
      const { data, error } = await supabase.rpc("ms_org_update_profile", {
        p_org_id: organizationId,
        p_profile: cloudProfile,
        p_logo_media_key: profile.logoMediaKey || null,
        p_cover_media_key: profile.coverMediaKey || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row === "object") {
        const organization = parseOrganizationRow(row, "cloud");
        cacheOrganization(userId, organization);
        return { organization, cloudAvailable: true };
      }
    } catch (error) {
      console.warn("[organizations] cloud profile update unavailable, keeping local metadata", error);
      return {
        organization: localOrganization,
        cloudAvailable: false,
        warning: "La fiche est enregistrée sur l’appareil. Applique la migration ORGANISATIONS V2 pour partager aussi cette fiche entre les membres.",
      };
    }
  }

  return { organization: localOrganization, cloudAvailable: false };
}

export async function updateOrganizationIdentity(
  userId: string | null | undefined,
  organizationId: string,
  patch: { name?: string; kind?: OrganizationKind; city?: string; countryCode?: string; description?: string },
): Promise<{ organization: OrganizationRecord; cloudAvailable: boolean; warning?: string }> {
  const state = loadOrganizationLocalState(userId);
  const current = state.organizations.find((item) => item.id === organizationId);
  if (!current) throw new Error("Organisation introuvable.");
  const name = String(patch.name ?? current.name).trim().slice(0,96);
  if (name.length < 2) throw new Error("Nom d’organisation trop court.");
  const kind = coerceKind(patch.kind ?? current.kind);
  const city = String(patch.city ?? current.city).trim().slice(0,120);
  const countryCode = String((patch.countryCode ?? current.countryCode) || "FR").trim().toUpperCase().slice(0,2) || "FR";
  const description = String(patch.description ?? current.description).trim().slice(0,500);
  const localOrganization: OrganizationRecord = { ...current, name, kind, city, countryCode, description, updatedAt: nowIso() };
  cacheOrganization(userId, localOrganization);
  if (userId && current.source === "cloud") {
    try {
      const { data, error } = await supabase.rpc("ms_org_update_identity", {
        p_org_id: organizationId, p_name: name, p_kind: kind, p_city: city || null, p_country_code: countryCode, p_description: description || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row === "object") {
        const organization = parseOrganizationRow(row, "cloud");
        cacheOrganization(userId, organization);
        return { organization, cloudAvailable: true };
      }
    } catch (error) {
      console.warn("[organizations] cloud identity update unavailable, keeping local metadata", error);
      return { organization: localOrganization, cloudAvailable: false, warning: "Identité conservée localement ; la synchronisation cloud est indisponible." };
    }
  }
  return { organization: localOrganization, cloudAvailable: false };
}

export async function updateOrganizationAdminSettings(
  userId: string | null | undefined,
  organizationId: string,
  patch: Partial<OrganizationAdminSettings>,
): Promise<{ organization: OrganizationRecord; cloudAvailable: boolean; warning?: string }> {
  const current = loadOrganizationLocalState(userId).organizations.find((item) => item.id === organizationId);
  if (!current) throw new Error("Organisation introuvable.");
  const next = normalizeOrganizationProfile({
    ...current.profile,
    adminSettings: { ...current.profile.adminSettings, ...patch },
  }).adminSettings;
  return updateOrganizationProfile(userId, organizationId, { adminSettings: next });
}

export async function joinOrganization(userId: string | null | undefined, rawCode: string): Promise<{ organization: OrganizationRecord; cloudAvailable: boolean; warning?: string }> {
  const code = String(rawCode || "").trim().toUpperCase().replace(/\s+/g, "");
  if (code.length < 6) throw new Error("Code d’invitation invalide.");

  if (userId) {
    try {
      const { data, error } = await supabase.rpc("ms_org_join_by_code", { p_join_code: code });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row && typeof row === "object") {
        const organization = parseOrganizationRow(row, "cloud");
        cacheOrganization(userId, organization);
        return { organization, cloudAvailable: true };
      }
    } catch (error) {
      console.warn("[organizations] cloud join unavailable", error);
    }
  }

  const state = loadOrganizationLocalState(userId);
  const localMatch = state.organizations.find((item) => item.joinCode.replace(/\s+/g, "").toUpperCase() === code);
  if (localMatch) {
    setActiveOrganization(userId, localMatch.id);
    return { organization: localMatch, cloudAvailable: false };
  }
  throw new Error("Impossible de rejoindre cette organisation tant que le backend PARTENARIATS n’est pas déployé, ou le code n’existe pas.");
}

function coerceGroupKind(value: unknown): OrganizationGroupKind {
  const kind = String(value || "team").trim().toLowerCase();
  return (["team", "section", "department", "class", "group"] as OrganizationGroupKind[]).includes(kind as OrganizationGroupKind)
    ? kind as OrganizationGroupKind
    : "team";
}

function cleanHexColor(value: unknown, fallback: string): string {
  const raw = String(value || "").trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(raw) ? raw : fallback;
}

function parseGroupRow(row: any): OrganizationLocalGroup {
  const statusRaw = String(row?.status || "active").trim().toLowerCase();
  return {
    id: String(row?.id || localId("grp")),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    name: String(row?.name || "Groupe").trim().slice(0,72) || "Groupe",
    sportId: String(row?.sportId || row?.sport_id || "Multisport").trim().slice(0,48) || "Multisport",
    kind: coerceGroupKind(row?.kind),
    description: String(row?.description || "").trim().slice(0,280),
    primaryColor: cleanHexColor(row?.primaryColor || row?.primary_color, "#22D3EE"),
    secondaryColor: cleanHexColor(row?.secondaryColor || row?.secondary_color, "#0F172A"),
    captainUserId: String(row?.captainUserId || row?.captain_user_id || "").trim(),
    captainDisplayName: String(row?.captainDisplayName || row?.captain_display_name || "").trim(),
    captainAvatarUrl: String(row?.captainAvatarUrl || row?.captain_avatar_url || "").trim(),
    logoMediaKey: String(row?.logoMediaKey || row?.logo_media_key || "").trim().slice(0,180),
    status: statusRaw === "archived" ? "archived" : "active",
    memberCount: Math.max(0, Number(row?.memberCount ?? row?.member_count ?? 0) || 0),
    createdAt: String(row?.createdAt || row?.created_at || nowIso()),
    updatedAt: String(row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at || nowIso()),
  };
}

function cacheOrganizationGroups(userId: string | null | undefined, organizationId: string, groupsInput: OrganizationLocalGroup[]) {
  const state = loadOrganizationLocalState(userId);
  const others = state.groups.filter((item) => item.organizationId !== organizationId);
  const groups = [...groupsInput, ...others];
  const organizations = state.organizations.map((org) => org.id === organizationId ? { ...org, groupCount: groupsInput.filter((group) => group.status !== "archived").length, updatedAt: nowIso() } : org);
  saveOrganizationLocalState(userId, { ...state, groups, organizations });
  const organization = organizations.find((org) => org.id === organizationId) || state.organizations.find((org) => org.id === organizationId);
  if (organization) syncOrganizationGroupsToSharedTeams(organization, groupsInput.filter((group) => group.status !== "archived"));
}

export async function listOrganizationGroups(userId: string | null | undefined, organizationId: string): Promise<{ groups: OrganizationLocalGroup[]; cloudAvailable: boolean }> {
  const local = listLocalOrganizationGroups(userId, organizationId);
  if (!userId || !organizationId) return { groups: local, cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_groups", { p_org_id: organizationId });
    if (error) throw error;
    const groups = rpcRows(data).filter(Boolean).map(parseGroupRow);
    cacheOrganizationGroups(userId, organizationId, groups);
    return { groups, cloudAvailable: true };
  } catch (rpcError) {
    try {
      const { data, error } = await supabase
        .from("ms_organization_groups")
        .select("id,organization_id,name,sport_id,kind,created_at,updated_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const groups = Array.isArray(data) ? data.map(parseGroupRow) : [];
      cacheOrganizationGroups(userId, organizationId, groups);
      return { groups, cloudAvailable: true };
    } catch {
      console.warn("[organizations] group list unavailable", rpcError);
      return { groups: local, cloudAvailable: false };
    }
  }
}

export async function createOrganizationGroup(
  userId: string | null | undefined,
  organizationId: string,
  name: string,
  sportId: string,
  options: Partial<OrganizationGroupInput> = {},
): Promise<{ group: OrganizationLocalGroup; cloudAvailable: boolean }> {
  const cleanName = String(name || "").trim().slice(0,72);
  const cleanSport = String(sportId || "Multisport").trim().slice(0,48) || "Multisport";
  if (cleanName.length < 2) throw new Error("Nom de groupe trop court.");
  const payload = {
    name: cleanName,
    sportId: cleanSport,
    kind: coerceGroupKind(options.kind),
    description: String(options.description || "").trim().slice(0,280),
    primaryColor: cleanHexColor(options.primaryColor, "#22D3EE"),
    secondaryColor: cleanHexColor(options.secondaryColor, "#0F172A"),
  };
  if (userId) {
    try {
      const { data, error } = await supabase.rpc("ms_org_create_group", {
        p_org_id: organizationId,
        p_name: payload.name,
        p_sport_id: payload.sportId,
        p_kind: payload.kind,
        p_description: payload.description,
        p_primary_color: payload.primaryColor,
        p_secondary_color: payload.secondaryColor,
      });
      if (error) throw error;
      const group = parseGroupRow(rpcRows(data)[0]);
      const current = listLocalOrganizationGroups(userId, organizationId).filter((item) => item.id !== group.id);
      cacheOrganizationGroups(userId, organizationId, [group, ...current]);
      return { group, cloudAvailable: true };
    } catch (rpcError) {
      try {
        const { data, error } = await supabase
          .from("ms_organization_groups")
          .insert({ organization_id: organizationId, name: payload.name, sport_id: payload.sportId, kind: payload.kind, created_by: userId })
          .select("id,organization_id,name,sport_id,kind,created_at,updated_at")
          .single();
        if (error) throw error;
        const group = parseGroupRow(data);
        const current = listLocalOrganizationGroups(userId, organizationId).filter((item) => item.id !== group.id);
        cacheOrganizationGroups(userId, organizationId, [group, ...current]);
        return { group, cloudAvailable: true };
      } catch {
        console.warn("[organizations] cloud group create unavailable, using local fallback", rpcError);
      }
    }
  }
  return { group: addLocalOrganizationGroup(userId, organizationId, cleanName, cleanSport, payload), cloudAvailable: false };
}

export async function updateOrganizationGroup(
  userId: string | null | undefined,
  groupId: string,
  patch: Partial<OrganizationGroupInput>,
): Promise<OrganizationLocalGroup> {
  if (!userId) throw new Error("Connexion requise.");
  const current = loadOrganizationLocalState(userId).groups.find((item) => item.id === groupId);
  if (!current) throw new Error("Équipe ou groupe introuvable.");
  const payload = {
    name: String(patch.name ?? current.name).trim().slice(0,72),
    sportId: String(patch.sportId ?? current.sportId).trim().slice(0,48) || "Multisport",
    kind: coerceGroupKind(patch.kind ?? current.kind),
    description: String(patch.description ?? current.description).trim().slice(0,280),
    primaryColor: cleanHexColor(patch.primaryColor ?? current.primaryColor, "#22D3EE"),
    secondaryColor: cleanHexColor(patch.secondaryColor ?? current.secondaryColor, "#0F172A"),
    captainUserId: String(patch.captainUserId ?? current.captainUserId ?? "").trim() || null,
    logoMediaKey: String(patch.logoMediaKey ?? current.logoMediaKey ?? "").trim().slice(0,180),
    status: patch.status === "archived" ? "archived" : "active",
  };
  if (payload.name.length < 2) throw new Error("Nom de groupe trop court.");
  const { data, error } = await supabase.rpc("ms_org_update_group", {
    p_group_id: groupId,
    p_name: payload.name,
    p_sport_id: payload.sportId,
    p_kind: payload.kind,
    p_description: payload.description,
    p_primary_color: payload.primaryColor,
    p_secondary_color: payload.secondaryColor,
    p_captain_user_id: payload.captainUserId,
    p_logo_media_key: payload.logoMediaKey,
    p_status: payload.status,
  });
  if (error) throw new Error(rpcMessage(error, "Modification de l’équipe impossible."));
  const group = parseGroupRow(rpcRows(data)[0]);
  if (!group.id) throw new Error("Équipe ou groupe introuvable.");
  const state = loadOrganizationLocalState(userId);
  const orgGroups = state.groups.filter((item) => item.organizationId === group.organizationId && item.id !== group.id);
  cacheOrganizationGroups(userId, group.organizationId, [group, ...orgGroups]);
  return group;
}

export async function deleteOrganizationGroup(userId: string | null | undefined, groupId: string): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const state = loadOrganizationLocalState(userId);
  const current = state.groups.find((item) => item.id === groupId);
  if (!current) throw new Error("Équipe ou groupe introuvable.");
  const { error } = await supabase.rpc("ms_org_delete_group", { p_group_id: groupId });
  if (error) throw new Error(rpcMessage(error, "Suppression de l’équipe impossible."));
  cacheOrganizationGroups(userId, current.organizationId, state.groups.filter((item) => item.organizationId === current.organizationId && item.id !== groupId));
}

export function addLocalOrganizationGroup(
  userId: string | null | undefined,
  organizationId: string,
  name: string,
  sportId: string,
  options: Partial<OrganizationGroupInput> = {},
): OrganizationLocalGroup {
  const cleanName = String(name || "").trim().slice(0, 72);
  if (cleanName.length < 2) throw new Error("Nom de groupe trop court.");
  const state = loadOrganizationLocalState(userId);
  const group: OrganizationLocalGroup = {
    id: localId("grp"),
    organizationId,
    name: cleanName,
    sportId: String(sportId || "Multisport").trim().slice(0, 48) || "Multisport",
    kind: coerceGroupKind(options.kind),
    description: String(options.description || "").trim().slice(0,280),
    primaryColor: cleanHexColor(options.primaryColor, "#22D3EE"),
    secondaryColor: cleanHexColor(options.secondaryColor, "#0F172A"),
    captainUserId: "",
    captainDisplayName: "",
    captainAvatarUrl: "",
    logoMediaKey: "",
    status: "active",
    memberCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const groups = [group, ...state.groups];
  const organizations = state.organizations.map((org) => org.id === organizationId ? { ...org, groupCount: groups.filter((item) => item.organizationId === organizationId && item.status !== "archived").length, updatedAt: nowIso() } : org);
  saveOrganizationLocalState(userId, { ...state, groups, organizations });
  const organization = organizations.find((org) => org.id === organizationId) || state.organizations.find((org) => org.id === organizationId);
  if (organization) syncOrganizationGroupsToSharedTeams(organization, groups.filter((item) => item.organizationId === organizationId && item.status !== "archived"));
  return group;
}

export function listLocalOrganizationGroups(userId: string | null | undefined, organizationId: string): OrganizationLocalGroup[] {
  return loadOrganizationLocalState(userId).groups.filter((item) => item.organizationId === organizationId);
}

function parseEventRow(row: any): OrganizationLocalEvent {
  const rawType = String(row?.eventType || row?.event_type || "event").trim().toLowerCase();
  const eventType = (["event","training","match","tournament","meeting","other"] as OrganizationEventType[]).includes(rawType as OrganizationEventType)
    ? rawType as OrganizationEventType
    : "event";
  return {
    id: String(row?.id || localId("evt")),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    groupId: String(row?.groupId || row?.group_id || ""),
    title: String(row?.title || "Événement").trim().slice(0,96) || "Événement",
    eventType,
    startsAt: String(row?.startsAt || row?.starts_at || nowIso()),
    endsAt: String(row?.endsAt || row?.ends_at || ""),
    location: String(row?.location || "").trim().slice(0,160),
    createdBy: String(row?.createdBy || row?.created_by || ""),
    createdAt: String(row?.createdAt || row?.created_at || nowIso()),
  };
}

function cacheOrganizationEvents(userId: string | null | undefined, organizationId: string, eventsInput: OrganizationLocalEvent[]) {
  const state = loadOrganizationLocalState(userId);
  const others = state.events.filter((item) => item.organizationId !== organizationId);
  const events = [...eventsInput, ...others];
  const organizations = state.organizations.map((org) => org.id === organizationId ? { ...org, eventCount: eventsInput.length, updatedAt: nowIso() } : org);
  saveOrganizationLocalState(userId, { ...state, events, organizations });
}

export async function listOrganizationEvents(userId: string | null | undefined, organizationId: string): Promise<{ events: OrganizationLocalEvent[]; cloudAvailable: boolean }> {
  const local = listLocalOrganizationEvents(userId, organizationId);
  if (!userId || !organizationId) return { events: local, cloudAvailable: false };
  try {
    const { data, error } = await supabase
      .from("ms_organization_events")
      .select("id,organization_id,group_id,title,event_type,starts_at,ends_at,location,created_by,created_at")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true });
    if (error) throw error;
    const events = Array.isArray(data) ? data.map(parseEventRow) : [];
    cacheOrganizationEvents(userId, organizationId, events);
    return { events, cloudAvailable: true };
  } catch {
    return { events: local, cloudAvailable: false };
  }
}

function normalizeOrganizationEventInput(input: OrganizationEventInput): OrganizationEventInput {
  const title = String(input?.title || "").trim().slice(0,96);
  const start = new Date(input?.startsAt || "");
  const end = input?.endsAt ? new Date(input.endsAt) : null;
  const rawType = String(input?.eventType || "event").trim().toLowerCase();
  const eventType = (["event","training","match","tournament","meeting","other"] as OrganizationEventType[]).includes(rawType as OrganizationEventType) ? rawType as OrganizationEventType : "event";
  if (title.length < 2) throw new Error("Titre d’événement trop court.");
  if (!Number.isFinite(start.getTime())) throw new Error("Date d’événement invalide.");
  if (end && (!Number.isFinite(end.getTime()) || end.getTime() < start.getTime())) throw new Error("La fin doit être postérieure au début.");
  return {
    groupId: String(input?.groupId || "").trim() || null,
    title,
    eventType,
    startsAt: start.toISOString(),
    endsAt: end ? end.toISOString() : null,
    location: String(input?.location || "").trim().slice(0,160),
  };
}

export async function createOrganizationEvent(userId: string | null | undefined, organizationId: string, input: OrganizationEventInput): Promise<{ event: OrganizationLocalEvent; cloudAvailable: boolean }> {
  const clean = normalizeOrganizationEventInput(input);
  if (userId) {
    try {
      const { data, error } = await supabase.rpc("ms_org_create_event", {
        p_org_id: organizationId,
        p_group_id: clean.groupId || null,
        p_title: clean.title,
        p_event_type: clean.eventType || "event",
        p_starts_at: clean.startsAt,
        p_ends_at: clean.endsAt || null,
        p_location: clean.location || null,
      });
      if (error) throw error;
      const event = parseEventRow(Array.isArray(data) ? data[0] : data);
      const current = listLocalOrganizationEvents(userId, organizationId).filter((item) => item.id !== event.id);
      cacheOrganizationEvents(userId, organizationId, [...current, event].sort((a,b) => a.startsAt.localeCompare(b.startsAt)));
      return { event, cloudAvailable: true };
    } catch (error) {
      console.warn("[organizations] cloud event create unavailable, using local fallback", error);
    }
  }
  return { event: addLocalOrganizationEvent(userId, organizationId, clean), cloudAvailable: false };
}

export async function updateOrganizationEvent(userId: string | null | undefined, eventId: string, organizationId: string, input: OrganizationEventInput): Promise<{ event: OrganizationLocalEvent; cloudAvailable: boolean }> {
  const clean = normalizeOrganizationEventInput(input);
  if (userId) {
    try {
      const { data, error } = await supabase.rpc("ms_org_update_event", {
        p_event_id: eventId,
        p_group_id: clean.groupId || null,
        p_title: clean.title,
        p_event_type: clean.eventType || "event",
        p_starts_at: clean.startsAt,
        p_ends_at: clean.endsAt || null,
        p_location: clean.location || null,
      });
      if (error) throw error;
      const event = parseEventRow(Array.isArray(data) ? data[0] : data);
      const current = listLocalOrganizationEvents(userId, organizationId).filter((item) => item.id !== event.id);
      cacheOrganizationEvents(userId, organizationId, [...current, event].sort((a,b) => a.startsAt.localeCompare(b.startsAt)));
      return { event, cloudAvailable: true };
    } catch (error) {
      console.warn("[organizations] cloud event update unavailable, using local fallback", error);
    }
  }
  const event = updateLocalOrganizationEvent(userId, organizationId, eventId, clean);
  return { event, cloudAvailable: false };
}

export async function deleteOrganizationEvent(userId: string | null | undefined, organizationId: string, eventId: string): Promise<{ cloudAvailable: boolean }> {
  if (userId) {
    try {
      const { error } = await supabase.rpc("ms_org_delete_event", { p_event_id: eventId });
      if (error) throw error;
      deleteLocalOrganizationEvent(userId, organizationId, eventId);
      return { cloudAvailable: true };
    } catch (error) {
      console.warn("[organizations] cloud event delete unavailable, using local fallback", error);
    }
  }
  deleteLocalOrganizationEvent(userId, organizationId, eventId);
  return { cloudAvailable: false };
}

export function addLocalOrganizationEvent(userId: string | null | undefined, organizationId: string, input: OrganizationEventInput): OrganizationLocalEvent {
  const clean = normalizeOrganizationEventInput(input);
  const event: OrganizationLocalEvent = {
    id: localId("evt"),
    organizationId,
    groupId: String(clean.groupId || ""),
    title: String(clean.title),
    eventType: clean.eventType || "event",
    startsAt: String(clean.startsAt),
    endsAt: String(clean.endsAt || ""),
    location: String(clean.location || ""),
    createdBy: String(userId || ""),
    createdAt: nowIso(),
  };
  const state = loadOrganizationLocalState(userId);
  const events = [event, ...state.events];
  const organizations = state.organizations.map((org) => org.id === organizationId ? { ...org, eventCount: events.filter((item) => item.organizationId === organizationId).length, updatedAt: nowIso() } : org);
  saveOrganizationLocalState(userId, { ...state, events, organizations });
  return event;
}

function updateLocalOrganizationEvent(userId: string | null | undefined, organizationId: string, eventId: string, input: OrganizationEventInput): OrganizationLocalEvent {
  const clean = normalizeOrganizationEventInput(input);
  const state = loadOrganizationLocalState(userId);
  const current = state.events.find((item) => item.organizationId === organizationId && item.id === eventId);
  if (!current) throw new Error("Événement introuvable.");
  const event: OrganizationLocalEvent = { ...current, groupId: String(clean.groupId || ""), title: String(clean.title), eventType: clean.eventType || "event", startsAt: String(clean.startsAt), endsAt: String(clean.endsAt || ""), location: String(clean.location || "") };
  const events = state.events.map((item) => item.id === eventId ? event : item);
  saveOrganizationLocalState(userId, { ...state, events });
  return event;
}

function deleteLocalOrganizationEvent(userId: string | null | undefined, organizationId: string, eventId: string) {
  const state = loadOrganizationLocalState(userId);
  const events = state.events.filter((item) => item.id !== eventId);
  const organizations = state.organizations.map((org) => org.id === organizationId ? { ...org, eventCount: events.filter((item) => item.organizationId === organizationId).length, updatedAt: nowIso() } : org);
  saveOrganizationLocalState(userId, { ...state, events, organizations });
}

export function listLocalOrganizationEvents(userId: string | null | undefined, organizationId: string): OrganizationLocalEvent[] {
  return loadOrganizationLocalState(userId).events
    .filter((item) => item.organizationId === organizationId)
    .map((item) => parseEventRow(item))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function organizationKindLabel(kind: OrganizationKind): string {
  const labels: Record<OrganizationKind, string> = {
    club: "Club sportif",
    association: "Association",
    company: "Entreprise",
    venue: "Bar / Pub / Salle",
    school: "École / Université",
    local_authority: "Collectivité",
    organizer: "Organisateur",
    other: "Autre organisation",
  };
  return labels[kind];
}

export function organizationRoleLabel(role: OrganizationRole): string {
  const labels: Record<OrganizationRole, string> = {
    owner: "Propriétaire",
    admin: "Administrateur",
    manager: "Responsable / Coach",
    captain: "Capitaine",
    member: "Membre",
    guest: "Invité",
  };
  return labels[role];
}

export function organizationPlanLabel(plan: OrganizationPlan): string {
  const labels: Record<OrganizationPlan, string> = {
    group: "MSS GROUP",
    club: "MSS CLUB",
    pro: "MSS PRO",
    business: "MSS BUSINESS",
    custom: "SUR MESURE",
  };
  return labels[plan];
}

function normalizeGroupSportForTeams(value: string): { sport: string; allSports: boolean; sportIds: string[] } {
  const raw = String(value || "Multisport").trim().toLowerCase();
  if (!raw || raw === "multisport") return { sport: "generic", allSports: true, sportIds: [] };
  const aliases: Record<string, string> = {
    "fléchettes": "darts",
    "flechettes": "darts",
    "darts": "darts",
    "baby-foot": "babyfoot",
    "babyfoot": "babyfoot",
    "ping-pong": "pingpong",
    "pingpong": "pingpong",
    "pétanque": "petanque",
    "petanque": "petanque",
    "mölkky": "molkky",
    "molkky": "molkky",
    "running": "running",
    "fit perf": "fit",
    "fit": "fit",
    "football": "football",
  };
  const sport = aliases[raw] || raw.replace(/\s+/g, "_");
  return { sport, allSports: false, sportIds: [sport] };
}

/**
 * FUSION ORGANISATIONS -> TEAMS
 * Les groupes/équipes d'une organisation sont exposés dans le store Teams personnel
 * comme des vues liées et identifiables. Ils ne dupliquent pas la source cloud :
 * syncedClubTeamId + clubId restent la référence d'autorité.
 */
export function syncOrganizationGroupsToSharedTeams(organization: OrganizationRecord, groups: OrganizationLocalGroup[]): void {
  if (typeof window === "undefined" || !organization?.id) return;
  try {
    const existing = loadTeams();
    const linkedIds = new Set(groups.map((group) => String(group.id)));
    const retained = existing.filter((team) => {
      if (String(team.clubId || "") !== organization.id || !team.syncedClubTeamId) return true;
      return !linkedIds.has(String(team.syncedClubTeamId));
    });
    // Supprime les anciennes vues liées de cette organisation avant de les reconstruire.
    const withoutCurrentOrg = retained.filter((team) => !(String(team.clubId || "") === organization.id && !!team.syncedClubTeamId));
    const now = Date.now();
    const linked: TeamEntity[] = groups.map((group) => {
      const sport = normalizeGroupSportForTeams(group.sportId);
      return {
        id: `org-${organization.id}-${group.id}`,
        name: group.name,
        sport: sport.sport,
        allSports: sport.allSports,
        sportIds: sport.sportIds,
        teamKind: "club",
        clubId: organization.id,
        clubName: organization.name,
        clubRole: organization.role,
        clubVisibility: "members",
        syncedClubTeamId: group.id,
        description: group.description || `Équipe liée à ${organization.name}. Modifications depuis l'espace Organisation.`,
        slogan: group.captainDisplayName ? `Capitaine · ${group.captainDisplayName}` : undefined,
        createdAt: Number(new Date(group.createdAt).getTime()) || now,
        updatedAt: now,
      };
    });
    saveTeams([...withoutCurrentOrg, ...linked]);
  } catch (error) {
    console.warn("[organizations] Teams fusion failed", error);
  }
}

export async function syncAllOrganizationGroupsToSharedTeams(userId: string | null | undefined): Promise<void> {
  const result = await listMyOrganizations(userId);
  await Promise.allSettled(result.organizations.map(async (organization) => {
    const groupsResult = await listOrganizationGroups(userId, organization.id);
    syncOrganizationGroupsToSharedTeams(organization, groupsResult.groups);
  }));
}



function parseOrganizationMember(row: any, organizationId = ""): OrganizationMember {
  const rawGroups = Array.isArray(row?.groupIds) ? row.groupIds : Array.isArray(row?.group_ids) ? row.group_ids : [];
  const statusRaw = String(row?.status || "active").toLowerCase();
  return {
    membershipId: String(row?.membershipId || row?.membership_id || row?.id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || organizationId || ""),
    userId: String(row?.userId || row?.user_id || ""),
    displayName: String(row?.displayName || row?.display_name || row?.nickname || "Joueur MSS").trim() || "Joueur MSS",
    avatarUrl: String(row?.avatarUrl || row?.avatar_url || "").trim(),
    countryCode: String(row?.countryCode || row?.country_code || "").trim().toUpperCase().slice(0, 2),
    role: coerceRole(row?.role),
    status: statusRaw === "suspended" ? "suspended" : statusRaw === "invited" ? "invited" : "active",
    joinedAt: String(row?.joinedAt || row?.joined_at || nowIso()),
    updatedAt: String(row?.updatedAt || row?.updated_at || nowIso()),
    groupIds: Array.from(new Set(rawGroups.map((value: unknown) => String(value || "").trim()).filter(Boolean))),
  };
}

function parseOrganizationInvitation(row: any): OrganizationInvitation {
  const statusRaw = String(row?.status || "pending").toLowerCase();
  return {
    id: String(row?.id || row?.invitationId || row?.invitation_id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    organizationName: String(row?.organizationName || row?.organization_name || "").trim(),
    organizationKind: coerceKind(row?.organizationKind || row?.organization_kind || "other"),
    invitedUserId: String(row?.invitedUserId || row?.invited_user_id || ""),
    invitedByUserId: String(row?.invitedByUserId || row?.invited_by_user_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Joueur MSS").trim() || "Joueur MSS",
    avatarUrl: String(row?.avatarUrl || row?.avatar_url || "").trim(),
    countryCode: String(row?.countryCode || row?.country_code || "").trim().toUpperCase().slice(0, 2),
    invitedByDisplayName: String(row?.invitedByDisplayName || row?.invited_by_display_name || "").trim(),
    role: coerceRole(row?.role),
    status: statusRaw === "accepted" ? "accepted" : statusRaw === "declined" ? "declined" : statusRaw === "revoked" ? "revoked" : "pending",
    createdAt: String(row?.createdAt || row?.created_at || nowIso()),
    respondedAt: String(row?.respondedAt || row?.responded_at || ""),
  };
}

function rpcRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data == null) return [];
  return [data];
}

function rpcMessage(error: any, fallback: string): string {
  const raw = String(error?.message || error?.details || error?.hint || fallback);
  const labels: Record<string, string> = {
    AUTH_REQUIRED: "Connexion requise.",
    FORBIDDEN: "Tu n’as pas les droits nécessaires pour cette action.",
    ORGANIZATION_NOT_FOUND: "Organisation introuvable.",
    MEMBER_NOT_FOUND: "Membre introuvable.",
    MEMBER_SUSPENDED: "Ce membre est suspendu.",
    MEMBERSHIP_SUSPENDED: "Cette adhésion est suspendue.",
    OWNER_PROTECTED: "Le propriétaire de l’organisation ne peut pas être modifié ou retiré ici.",
    CANNOT_MANAGE_ROLE: "Ton rôle ne permet pas de modifier ce membre.",
    INVALID_ROLE: "Rôle invalide.",
    ALREADY_MEMBER: "Cet utilisateur est déjà membre de l’organisation.",
    INVITATION_ALREADY_PENDING: "Une invitation est déjà en attente pour cet utilisateur.",
    INVITATION_NOT_FOUND: "Invitation introuvable.",
    USER_NOT_FOUND: "Utilisateur introuvable.",
    GROUP_NOT_FOUND: "Équipe ou groupe introuvable.",
    COMPETITION_NOT_FOUND: "Compétition introuvable.",
    COMPETITION_PARTICIPANT_INVALID: "Participant invalide pour cette compétition.",
    COMPETITION_NEEDS_PARTICIPANTS: "Il faut au moins deux participants.",
    COMPETITION_FIXTURE_NOT_FOUND: "Rencontre introuvable.",
    COMPETITION_FORMAT_NO_AUTOMATIC_FIXTURES: "Ce format utilise des rencontres ajoutées manuellement.",
    FEE_NOT_FOUND: "Cotisation introuvable.",
    FEE_TITLE_REQUIRED: "Le titre de la cotisation est requis.",
    INVALID_FEE_KIND: "Type de cotisation invalide.",
    INVALID_FEE_STATUS: "Statut de cotisation invalide.",
    INVALID_AMOUNT: "Montant de cotisation invalide.",
    PAYMENT_URL_MUST_BE_HTTPS: "Le lien de paiement doit utiliser HTTPS.",
    MEMBER_NOT_TARGETED: "Ce membre n’est pas concerné par cette cotisation.",
    INSTALLATION_NOT_FOUND: "Installation introuvable.",
    INSTALLATION_NAME_REQUIRED: "Le nom de l’installation est requis.",
    INVALID_INSTALLATION_KIND: "Type d’installation invalide.",
    INVALID_INSTALLATION_STATUS: "Statut d’installation invalide.",
    INVALID_QR_TOKEN: "QR code d’installation invalide ou expiré.",
  };
  for (const [key, label] of Object.entries(labels)) if (raw.includes(key)) return label;
  return raw || fallback;
}

export async function listOrganizationMembers(
  userId: string | null | undefined,
  organizationId: string,
): Promise<{ members: OrganizationMember[]; cloudAvailable: boolean }> {
  if (!userId || !organizationId) return { members: [], cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_members", { p_org_id: organizationId });
    if (error) throw error;
    return { members: rpcRows(data).filter(Boolean).map((row) => parseOrganizationMember(row, organizationId)), cloudAvailable: true };
  } catch (error) {
    console.warn("[organizations] member list unavailable", error);
    return { members: [], cloudAvailable: false };
  }
}

export async function setOrganizationMemberRole(
  userId: string | null | undefined,
  organizationId: string,
  memberUserId: string,
  role: OrganizationRole,
): Promise<OrganizationMember> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_set_member_role", { p_org_id: organizationId, p_user_id: memberUserId, p_role: role });
  if (error) throw new Error(rpcMessage(error, "Modification du rôle impossible."));
  const row = rpcRows(data)[0];
  if (!row) throw new Error("Membre introuvable.");
  return parseOrganizationMember(row, organizationId);
}

export async function setOrganizationMemberStatus(
  userId: string | null | undefined,
  organizationId: string,
  memberUserId: string,
  status: "active" | "suspended",
): Promise<OrganizationMember> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_set_member_status", { p_org_id: organizationId, p_user_id: memberUserId, p_status: status });
  if (error) throw new Error(rpcMessage(error, "Modification du statut impossible."));
  const row = rpcRows(data)[0];
  if (!row) throw new Error("Membre introuvable.");
  return parseOrganizationMember(row, organizationId);
}

export async function removeOrganizationMember(
  userId: string | null | undefined,
  organizationId: string,
  memberUserId: string,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_remove_member", { p_org_id: organizationId, p_user_id: memberUserId });
  if (error) throw new Error(rpcMessage(error, "Suppression du membre impossible."));
}

export async function setOrganizationGroupMember(
  userId: string | null | undefined,
  groupId: string,
  memberUserId: string,
  assigned: boolean,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_set_group_member", { p_group_id: groupId, p_user_id: memberUserId, p_assigned: assigned });
  if (error) throw new Error(rpcMessage(error, "Affectation à l’équipe impossible."));
}

export async function inviteOrganizationUser(
  userId: string | null | undefined,
  organizationId: string,
  invitedUserId: string,
  role: OrganizationRole = "member",
): Promise<OrganizationInvitation> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_invite_user", { p_org_id: organizationId, p_user_id: invitedUserId, p_role: role });
  if (error) throw new Error(rpcMessage(error, "Invitation impossible."));
  const row = rpcRows(data)[0];
  if (!row) throw new Error("Invitation impossible.");
  return parseOrganizationInvitation(row);
}

export async function listOrganizationInvitations(
  userId: string | null | undefined,
  organizationId: string,
): Promise<{ invitations: OrganizationInvitation[]; cloudAvailable: boolean }> {
  if (!userId || !organizationId) return { invitations: [], cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_invitations", { p_org_id: organizationId });
    if (error) throw error;
    return { invitations: rpcRows(data).filter(Boolean).map(parseOrganizationInvitation), cloudAvailable: true };
  } catch (error) {
    console.warn("[organizations] invitation list unavailable", error);
    return { invitations: [], cloudAvailable: false };
  }
}

export async function listMyOrganizationInvitations(
  userId: string | null | undefined,
): Promise<{ invitations: OrganizationInvitation[]; cloudAvailable: boolean }> {
  if (!userId) return { invitations: [], cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_my_invitations");
    if (error) throw error;
    return { invitations: rpcRows(data).filter(Boolean).map(parseOrganizationInvitation), cloudAvailable: true };
  } catch (error) {
    console.warn("[organizations] incoming invitations unavailable", error);
    return { invitations: [], cloudAvailable: false };
  }
}

export async function respondOrganizationInvitation(
  userId: string | null | undefined,
  invitationId: string,
  accept: boolean,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_respond_invitation", { p_invitation_id: invitationId, p_accept: accept });
  if (error) throw new Error(rpcMessage(error, "Réponse à l’invitation impossible."));
}

export async function cancelOrganizationInvitation(
  userId: string | null | undefined,
  invitationId: string,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_cancel_invitation", { p_invitation_id: invitationId });
  if (error) throw new Error(rpcMessage(error, "Annulation de l’invitation impossible."));
}

export async function rotateOrganizationJoinCode(
  userId: string | null | undefined,
  organizationId: string,
): Promise<string> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_rotate_join_code", { p_org_id: organizationId });
  if (error) throw new Error(rpcMessage(error, "Impossible de générer un nouveau code."));
  const row = rpcRows(data)[0];
  const code = String(row?.joinCode || row?.join_code || row || "").trim().toUpperCase();
  if (!code) throw new Error("Nouveau code indisponible.");
  const state = loadOrganizationLocalState(userId);
  const organizations = state.organizations.map((org) => org.id === organizationId ? { ...org, joinCode: code, updatedAt: nowIso() } : org);
  saveOrganizationLocalState(userId, { ...state, organizations });
  return code;
}

function coerceCompetitionFormat(value: unknown): OrganizationCompetitionFormat {
  const raw = String(value || "league").toLowerCase();
  const allowed: OrganizationCompetitionFormat[] = ["league","knockout","groups_knockout","ladder","challenge"];
  return allowed.includes(raw as OrganizationCompetitionFormat) ? raw as OrganizationCompetitionFormat : "league";
}

function coerceCompetitionMode(value: unknown): OrganizationCompetitionParticipantMode {
  return String(value || "teams").toLowerCase() === "individuals" ? "individuals" : "teams";
}

function coerceCompetitionStatus(value: unknown): OrganizationCompetitionStatus {
  const raw = String(value || "draft").toLowerCase();
  const allowed: OrganizationCompetitionStatus[] = ["draft","open","active","completed","archived"];
  return allowed.includes(raw as OrganizationCompetitionStatus) ? raw as OrganizationCompetitionStatus : "draft";
}

function parseOrganizationCompetition(row: any): OrganizationCompetition {
  return {
    id: String(row?.id || row?.competitionId || row?.competition_id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    name: String(row?.name || "Compétition").trim().slice(0, 100) || "Compétition",
    sportId: String(row?.sportId || row?.sport_id || "Multisport").trim().slice(0, 48) || "Multisport",
    format: coerceCompetitionFormat(row?.format),
    participantMode: coerceCompetitionMode(row?.participantMode || row?.participant_mode),
    status: coerceCompetitionStatus(row?.status),
    startsAt: String(row?.startsAt || row?.starts_at || ""),
    endsAt: String(row?.endsAt || row?.ends_at || ""),
    description: String(row?.description || "").trim().slice(0, 360),
    participantCount: Math.max(0, Number(row?.participantCount ?? row?.participant_count ?? 0) || 0),
    fixtureCount: Math.max(0, Number(row?.fixtureCount ?? row?.fixture_count ?? 0) || 0),
    completedFixtureCount: Math.max(0, Number(row?.completedFixtureCount ?? row?.completed_fixture_count ?? 0) || 0),
    createdAt: String(row?.createdAt || row?.created_at || nowIso()),
    updatedAt: String(row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at || nowIso()),
  };
}

function parseOrganizationCompetitionParticipant(row: any): OrganizationCompetitionParticipant {
  return {
    id: String(row?.id || row?.participantId || row?.participant_id || ""),
    competitionId: String(row?.competitionId || row?.competition_id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    entityType: String(row?.entityType || row?.entity_type || "group") === "member" ? "member" : "group",
    entityId: String(row?.entityId || row?.entity_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Participant").trim() || "Participant",
    avatarUrl: String(row?.avatarUrl || row?.avatar_url || "").trim(),
    seed: Math.max(1, Number(row?.seed || 1) || 1),
  };
}

function parseOrganizationCompetitionFixture(row: any): OrganizationCompetitionFixture {
  const rawStatus = String(row?.status || "scheduled").toLowerCase();
  return {
    id: String(row?.id || row?.fixtureId || row?.fixture_id || ""),
    competitionId: String(row?.competitionId || row?.competition_id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    round: Math.max(1, Number(row?.round || 1) || 1),
    sequence: Math.max(1, Number(row?.sequence || 1) || 1),
    groupLabel: String(row?.groupLabel || row?.group_label || "").trim().slice(0, 24),
    homeParticipantId: String(row?.homeParticipantId || row?.home_participant_id || ""),
    awayParticipantId: String(row?.awayParticipantId || row?.away_participant_id || ""),
    homeName: String(row?.homeName || row?.home_name || "À définir").trim() || "À définir",
    awayName: String(row?.awayName || row?.away_name || "À définir").trim() || "À définir",
    scheduledAt: String(row?.scheduledAt || row?.scheduled_at || ""),
    status: rawStatus === "completed" ? "completed" : rawStatus === "cancelled" ? "cancelled" : "scheduled",
    winnerParticipantId: String(row?.winnerParticipantId || row?.winner_participant_id || ""),
    scoreLabel: String(row?.scoreLabel || row?.score_label || "").trim().slice(0, 60),
    resultRef: String(row?.resultRef || row?.result_ref || "").trim().slice(0, 180),
    createdAt: String(row?.createdAt || row?.created_at || nowIso()),
    updatedAt: String(row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at || nowIso()),
  };
}

export async function listOrganizationCompetitions(
  userId: string | null | undefined,
  organizationId: string,
): Promise<{ competitions: OrganizationCompetition[]; cloudAvailable: boolean }> {
  if (!userId || !organizationId) return { competitions: [], cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_competitions", { p_org_id: organizationId });
    if (error) throw error;
    return { competitions: rpcRows(data).filter(Boolean).map(parseOrganizationCompetition), cloudAvailable: true };
  } catch (error) {
    console.warn("[organizations] competition list unavailable", error);
    return { competitions: [], cloudAvailable: false };
  }
}

export async function createOrganizationCompetition(
  userId: string | null | undefined,
  organizationId: string,
  input: OrganizationCompetitionInput,
): Promise<OrganizationCompetition> {
  if (!userId) throw new Error("Connexion requise.");
  const entityIds = Array.from(new Set((input.entityIds || []).map((id) => String(id || "").trim()).filter(Boolean)));
  if (String(input.name || "").trim().length < 2) throw new Error("Nom de compétition trop court.");
  if (entityIds.length < 2) throw new Error("Sélectionne au moins deux participants.");
  const { data, error } = await supabase.rpc("ms_org_create_competition", {
    p_org_id: organizationId,
    p_name: String(input.name || "").trim(),
    p_sport_id: String(input.sportId || "Multisport").trim(),
    p_format: input.format,
    p_participant_mode: input.participantMode,
    p_starts_at: input.startsAt || null,
    p_description: String(input.description || "").trim(),
    p_entity_ids: entityIds,
  });
  if (error) throw new Error(rpcMessage(error, "Création de la compétition impossible."));
  const row = rpcRows(data)[0];
  if (!row) throw new Error("Création de la compétition impossible.");
  return parseOrganizationCompetition(row);
}

export async function getOrganizationCompetitionDetail(
  userId: string | null | undefined,
  competitionId: string,
): Promise<OrganizationCompetitionDetail> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_get_competition", { p_competition_id: competitionId });
  if (error) throw new Error(rpcMessage(error, "Chargement de la compétition impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row?.competition) throw new Error("Compétition introuvable.");
  return {
    competition: parseOrganizationCompetition(row.competition),
    participants: Array.isArray(row.participants) ? row.participants.map(parseOrganizationCompetitionParticipant) : [],
    fixtures: Array.isArray(row.fixtures) ? row.fixtures.map(parseOrganizationCompetitionFixture) : [],
  };
}

export async function updateOrganizationCompetitionStatus(
  userId: string | null | undefined,
  competitionId: string,
  status: OrganizationCompetitionStatus,
): Promise<OrganizationCompetition> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_set_competition_status", { p_competition_id: competitionId, p_status: status });
  if (error) throw new Error(rpcMessage(error, "Modification de la compétition impossible."));
  const row = rpcRows(data)[0];
  if (!row) throw new Error("Compétition introuvable.");
  return parseOrganizationCompetition(row);
}

export async function deleteOrganizationCompetition(
  userId: string | null | undefined,
  competitionId: string,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_delete_competition", { p_competition_id: competitionId });
  if (error) throw new Error(rpcMessage(error, "Suppression de la compétition impossible."));
}

export async function generateOrganizationCompetitionFixtures(
  userId: string | null | undefined,
  competitionId: string,
): Promise<number> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_generate_competition_fixtures", { p_competition_id: competitionId });
  if (error) throw new Error(rpcMessage(error, "Génération du calendrier impossible."));
  return Math.max(0, Number(data || 0) || 0);
}

export async function createOrganizationCompetitionFixture(
  userId: string | null | undefined,
  competitionId: string,
  homeParticipantId: string,
  awayParticipantId: string,
  scheduledAt?: string,
): Promise<OrganizationCompetitionFixture> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_create_competition_fixture", {
    p_competition_id: competitionId,
    p_home_participant_id: homeParticipantId,
    p_away_participant_id: awayParticipantId,
    p_scheduled_at: scheduledAt || null,
  });
  if (error) throw new Error(rpcMessage(error, "Création de la rencontre impossible."));
  const row = rpcRows(data)[0];
  if (!row) throw new Error("Création de la rencontre impossible.");
  return parseOrganizationCompetitionFixture(row);
}

export async function setOrganizationCompetitionFixtureResult(
  userId: string | null | undefined,
  fixtureId: string,
  winnerParticipantId: string,
  scoreLabel: string,
  resultRef = "",
): Promise<OrganizationCompetitionFixture> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_set_competition_fixture_result", {
    p_fixture_id: fixtureId,
    p_winner_participant_id: winnerParticipantId,
    p_score_label: String(scoreLabel || "").trim(),
    p_result_ref: String(resultRef || "").trim(),
  });
  if (error) throw new Error(rpcMessage(error, "Enregistrement du résultat impossible."));
  const row = rpcRows(data)[0];
  if (!row) throw new Error("Rencontre introuvable.");
  return parseOrganizationCompetitionFixture(row);
}

function parseOrganizationRankingRow(row: any): OrganizationRankingRow {
  const streakType = String(row?.currentStreakType || row?.current_streak_type || "L").toUpperCase() === "W" ? "W" : "L";
  return {
    rank: Math.max(1, Number(row?.rank || 1) || 1),
    entityType: String(row?.entityType || row?.entity_type || "group") === "member" ? "member" : "group",
    entityId: String(row?.entityId || row?.entity_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Participant").trim() || "Participant",
    played: Math.max(0, Number(row?.played || 0) || 0),
    wins: Math.max(0, Number(row?.wins || 0) || 0),
    losses: Math.max(0, Number(row?.losses || 0) || 0),
    points: Number(row?.points || 0) || 0,
    winRate: Math.max(0, Math.min(100, Number(row?.winRate ?? row?.win_rate ?? 0) || 0)),
    scoreFor: Number(row?.scoreFor ?? row?.score_for ?? 0) || 0,
    scoreAgainst: Number(row?.scoreAgainst ?? row?.score_against ?? 0) || 0,
    scoreDiff: Number(row?.scoreDiff ?? row?.score_diff ?? 0) || 0,
    currentStreak: Math.max(0, Number(row?.currentStreak ?? row?.current_streak ?? 0) || 0),
    currentStreakType: streakType,
    bestWinStreak: Math.max(0, Number(row?.bestWinStreak ?? row?.best_win_streak ?? 0) || 0),
    recentForm: String(row?.recentForm || row?.recent_form || "").replace(/[^WL]/g, "").slice(0, 5),
  };
}

export async function getOrganizationRankings(
  userId: string | null | undefined,
  organizationId: string,
  filters: OrganizationRankingFilters = {},
): Promise<OrganizationRankingRow[]> {
  if (!userId || !organizationId) return [];
  const competitionId = String(filters.competitionId || "").trim();
  const sportId = String(filters.sportId || "").trim();
  const { data, error } = await supabase.rpc("ms_org_get_rankings", {
    p_org_id: organizationId,
    p_competition_id: competitionId || null,
    p_sport_id: sportId || null,
  });
  if (error) throw new Error(rpcMessage(error, "Classement indisponible."));
  return rpcRows(data).filter(Boolean).map(parseOrganizationRankingRow);
}



function parseOrganizationAnnouncement(row: any): OrganizationAnnouncement {
  return {
    id: String(row?.id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    groupId: String(row?.groupId || row?.group_id || ""),
    groupName: String(row?.groupName || row?.group_name || "").trim(),
    title: String(row?.title || "Annonce").trim().slice(0, 100) || "Annonce",
    body: String(row?.body || "").trim().slice(0, 1200),
    pinned: Boolean(row?.pinned),
    expiresAt: String(row?.expiresAt || row?.expires_at || ""),
    createdByUserId: String(row?.createdByUserId || row?.created_by_user_id || row?.created_by || ""),
    authorName: String(row?.authorName || row?.author_name || "Membre MSS").trim() || "Membre MSS",
    createdAt: String(row?.createdAt || row?.created_at || nowIso()),
    updatedAt: String(row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at || nowIso()),
  };
}

export async function listOrganizationAnnouncements(
  userId: string | null | undefined,
  organizationId: string,
  groupId?: string | null,
): Promise<{ announcements: OrganizationAnnouncement[]; cloudAvailable: boolean }> {
  if (!userId || !organizationId) return { announcements: [], cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_announcements", {
      p_org_id: organizationId,
      p_group_id: groupId || null,
    });
    if (error) throw error;
    return { announcements: rpcRows(data).filter(Boolean).map(parseOrganizationAnnouncement), cloudAvailable: true };
  } catch (error) {
    console.warn("[organizations] announcements unavailable", error);
    return { announcements: [], cloudAvailable: false };
  }
}

export async function createOrganizationAnnouncement(
  userId: string | null | undefined,
  organizationId: string,
  input: OrganizationAnnouncementInput,
): Promise<OrganizationAnnouncement> {
  if (!userId) throw new Error("Connexion requise.");
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  if (title.length < 2) throw new Error("Titre requis.");
  if (!body) throw new Error("Message requis.");
  const { data, error } = await supabase.rpc("ms_org_create_announcement", {
    p_org_id: organizationId,
    p_group_id: input.groupId || null,
    p_title: title.slice(0, 100),
    p_body: body.slice(0, 1200),
    p_pinned: Boolean(input.pinned),
    p_expires_at: input.expiresAt || null,
  });
  if (error) throw new Error(rpcMessage(error, "Publication impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Publication impossible.");
  return parseOrganizationAnnouncement(row);
}

export async function updateOrganizationAnnouncement(
  userId: string | null | undefined,
  announcementId: string,
  input: Omit<OrganizationAnnouncementInput, "groupId">,
): Promise<OrganizationAnnouncement> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_update_announcement", {
    p_announcement_id: announcementId,
    p_title: String(input.title || "").trim().slice(0, 100),
    p_body: String(input.body || "").trim().slice(0, 1200),
    p_pinned: Boolean(input.pinned),
    p_expires_at: input.expiresAt || null,
  });
  if (error) throw new Error(rpcMessage(error, "Modification impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Annonce introuvable.");
  return parseOrganizationAnnouncement(row);
}

export async function deleteOrganizationAnnouncement(
  userId: string | null | undefined,
  announcementId: string,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_delete_announcement", { p_announcement_id: announcementId });
  if (error) throw new Error(rpcMessage(error, "Suppression impossible."));
}


function coerceFeeKind(value: unknown): OrganizationFeeKind {
  const raw = String(value || "membership").toLowerCase();
  return raw === "license" ? "license" : raw === "event" ? "event" : raw === "other" ? "other" : "membership";
}

function coerceFeeCampaignStatus(value: unknown): OrganizationFeeCampaignStatus {
  const raw = String(value || "draft").toLowerCase();
  return raw === "open" ? "open" : raw === "closed" ? "closed" : raw === "archived" ? "archived" : "draft";
}

function coerceFeeMemberStatus(value: unknown): OrganizationFeeMemberStatus {
  const raw = String(value || "pending").toLowerCase();
  return raw === "paid" ? "paid" : raw === "waived" ? "waived" : raw === "overdue" ? "overdue" : "pending";
}

function parseOrganizationFeeCampaign(row: any): OrganizationFeeCampaign {
  return {
    id: String(row?.id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    groupId: String(row?.groupId || row?.group_id || ""),
    groupName: String(row?.groupName || row?.group_name || "").trim(),
    title: String(row?.title || "Cotisation").trim().slice(0, 100) || "Cotisation",
    feeKind: coerceFeeKind(row?.feeKind || row?.fee_kind),
    amountCents: Math.max(0, Math.round(Number(row?.amountCents ?? row?.amount_cents ?? 0) || 0)),
    currency: String(row?.currency || "EUR").trim().toUpperCase().slice(0, 3) || "EUR",
    dueAt: String(row?.dueAt || row?.due_at || ""),
    description: String(row?.description || "").trim().slice(0, 600),
    paymentUrl: String(row?.paymentUrl || row?.payment_url || "").trim().slice(0, 400),
    status: coerceFeeCampaignStatus(row?.status),
    targetCount: Math.max(0, Number(row?.targetCount ?? row?.target_count ?? 0) || 0),
    paidCount: Math.max(0, Number(row?.paidCount ?? row?.paid_count ?? 0) || 0),
    waivedCount: Math.max(0, Number(row?.waivedCount ?? row?.waived_count ?? 0) || 0),
    myStatus: coerceFeeMemberStatus(row?.myStatus || row?.my_status),
    isTargeted: Boolean(row?.isTargeted ?? row?.is_targeted ?? true),
    createdAt: String(row?.createdAt || row?.created_at || nowIso()),
    updatedAt: String(row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at || nowIso()),
  };
}

function parseOrganizationFeeMember(row: any): OrganizationFeeMember {
  return {
    userId: String(row?.userId || row?.user_id || ""),
    displayName: String(row?.displayName || row?.display_name || "Membre MSS").trim() || "Membre MSS",
    avatarUrl: String(row?.avatarUrl || row?.avatar_url || "").trim(),
    countryCode: String(row?.countryCode || row?.country_code || "").trim().toUpperCase().slice(0, 2),
    status: coerceFeeMemberStatus(row?.status),
    paidAt: String(row?.paidAt || row?.paid_at || ""),
    note: String(row?.note || "").trim().slice(0, 240),
    externalRef: String(row?.externalRef || row?.external_ref || "").trim().slice(0, 120),
    updatedAt: String(row?.updatedAt || row?.updated_at || ""),
  };
}

export async function listOrganizationFeeCampaigns(
  userId: string | null | undefined,
  organizationId: string,
): Promise<{ campaigns: OrganizationFeeCampaign[]; cloudAvailable: boolean }> {
  if (!userId || !organizationId) return { campaigns: [], cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_fee_campaigns", { p_org_id: organizationId });
    if (error) throw error;
    return { campaigns: rpcRows(data).filter(Boolean).map(parseOrganizationFeeCampaign), cloudAvailable: true };
  } catch (error) {
    console.warn("[organizations] fee campaigns unavailable", error);
    return { campaigns: [], cloudAvailable: false };
  }
}

export async function createOrganizationFeeCampaign(
  userId: string | null | undefined,
  organizationId: string,
  input: OrganizationFeeCampaignInput,
): Promise<OrganizationFeeCampaign> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_create_fee_campaign", {
    p_org_id: organizationId,
    p_group_id: input.groupId || null,
    p_title: String(input.title || "").trim(),
    p_fee_kind: input.feeKind,
    p_amount_cents: Math.max(0, Math.round(Number(input.amountCents || 0))),
    p_currency: String(input.currency || "EUR").trim().toUpperCase(),
    p_due_at: input.dueAt || null,
    p_description: String(input.description || "").trim(),
    p_payment_url: String(input.paymentUrl || "").trim(),
  });
  if (error) throw new Error(rpcMessage(error, "Création de la cotisation impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Cotisation introuvable.");
  return parseOrganizationFeeCampaign(row);
}

export async function updateOrganizationFeeCampaign(
  userId: string | null | undefined,
  feeId: string,
  input: OrganizationFeeCampaignInput,
): Promise<OrganizationFeeCampaign> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_update_fee_campaign", {
    p_fee_id: feeId,
    p_group_id: input.groupId || null,
    p_title: String(input.title || "").trim(),
    p_fee_kind: input.feeKind,
    p_amount_cents: Math.max(0, Math.round(Number(input.amountCents || 0))),
    p_currency: String(input.currency || "EUR").trim().toUpperCase(),
    p_due_at: input.dueAt || null,
    p_description: String(input.description || "").trim(),
    p_payment_url: String(input.paymentUrl || "").trim(),
  });
  if (error) throw new Error(rpcMessage(error, "Modification de la cotisation impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Cotisation introuvable.");
  return parseOrganizationFeeCampaign(row);
}

export async function setOrganizationFeeCampaignStatus(
  userId: string | null | undefined,
  feeId: string,
  status: OrganizationFeeCampaignStatus,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_set_fee_campaign_status", { p_fee_id: feeId, p_status: status });
  if (error) throw new Error(rpcMessage(error, "Modification du statut impossible."));
}

export async function listOrganizationFeeMembers(
  userId: string | null | undefined,
  feeId: string,
): Promise<OrganizationFeeMember[]> {
  if (!userId || !feeId) return [];
  const { data, error } = await supabase.rpc("ms_org_list_fee_members", { p_fee_id: feeId });
  if (error) throw new Error(rpcMessage(error, "Liste des règlements indisponible."));
  return rpcRows(data).filter(Boolean).map(parseOrganizationFeeMember);
}

export async function setOrganizationFeeMemberStatus(
  userId: string | null | undefined,
  feeId: string,
  memberUserId: string,
  status: OrganizationFeeMemberStatus,
  note = "",
  externalRef = "",
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const normalized = status === "paid" || status === "waived" ? status : "pending";
  const { error } = await supabase.rpc("ms_org_set_fee_member_status", {
    p_fee_id: feeId,
    p_user_id: memberUserId,
    p_status: normalized,
    p_note: String(note || "").trim(),
    p_external_ref: String(externalRef || "").trim(),
  });
  if (error) throw new Error(rpcMessage(error, "Mise à jour du règlement impossible."));
}

export async function deleteOrganizationFeeCampaign(
  userId: string | null | undefined,
  feeId: string,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_delete_fee_campaign", { p_fee_id: feeId });
  if (error) throw new Error(rpcMessage(error, "Suppression de la cotisation impossible."));
}

function coercePartnerKind(value: unknown): OrganizationPartnerKind {
  const raw = String(value || "sponsor").toLowerCase();
  return raw === "partner" ? "partner" : raw === "supplier" ? "supplier" : raw === "institutional" ? "institutional" : "sponsor";
}

function coercePartnerStatus(value: unknown): OrganizationPartnerStatus {
  const raw = String(value || "draft").toLowerCase();
  return raw === "active" ? "active" : raw === "paused" ? "paused" : raw === "archived" ? "archived" : "draft";
}

function coercePartnerPlacement(value: unknown): OrganizationPartnerPlacement {
  const raw = String(value || "organization").toLowerCase();
  return raw === "team" ? "team" : raw === "competition" ? "competition" : raw === "venue" ? "venue" : raw === "all" ? "all" : "organization";
}

function parseOrganizationPartner(row: any): OrganizationPartner {
  return {
    id: String(row?.id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    groupId: String(row?.groupId || row?.group_id || ""),
    groupName: String(row?.groupName || row?.group_name || "").trim(),
    partnerKind: coercePartnerKind(row?.partnerKind || row?.partner_kind),
    name: String(row?.name || "Partenaire").trim().slice(0, 100) || "Partenaire",
    category: String(row?.category || "").trim().slice(0, 80),
    websiteUrl: String(row?.websiteUrl || row?.website_url || "").trim().slice(0, 400),
    offerTitle: String(row?.offerTitle || row?.offer_title || "").trim().slice(0, 120),
    offerText: String(row?.offerText || row?.offer_text || "").trim().slice(0, 600),
    promoCode: String(row?.promoCode || row?.promo_code || "").trim().slice(0, 80),
    placement: coercePartnerPlacement(row?.placement),
    startsAt: String(row?.startsAt || row?.starts_at || ""),
    endsAt: String(row?.endsAt || row?.ends_at || ""),
    logoMediaKey: String(row?.logoMediaKey || row?.logo_media_key || "").trim().slice(0, 180),
    status: coercePartnerStatus(row?.status),
    createdAt: String(row?.createdAt || row?.created_at || nowIso()),
    updatedAt: String(row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at || nowIso()),
  };
}

export async function listOrganizationPartners(
  userId: string | null | undefined,
  organizationId: string,
): Promise<{ partners: OrganizationPartner[]; cloudAvailable: boolean }> {
  if (!userId || !organizationId) return { partners: [], cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_partners", { p_org_id: organizationId });
    if (error) throw error;
    return { partners: rpcRows(data).filter(Boolean).map(parseOrganizationPartner), cloudAvailable: true };
  } catch (error) {
    console.warn("[organizations] partners unavailable", error);
    return { partners: [], cloudAvailable: false };
  }
}

export async function createOrganizationPartner(
  userId: string | null | undefined,
  organizationId: string,
  input: OrganizationPartnerInput,
): Promise<OrganizationPartner> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_create_partner", {
    p_org_id: organizationId,
    p_group_id: input.groupId || null,
    p_partner_kind: input.partnerKind,
    p_name: String(input.name || "").trim(),
    p_category: String(input.category || "").trim(),
    p_website_url: String(input.websiteUrl || "").trim(),
    p_offer_title: String(input.offerTitle || "").trim(),
    p_offer_text: String(input.offerText || "").trim(),
    p_promo_code: String(input.promoCode || "").trim(),
    p_placement: input.placement || "organization",
    p_starts_at: input.startsAt || null,
    p_ends_at: input.endsAt || null,
    p_logo_media_key: String(input.logoMediaKey || "").trim(),
  });
  if (error) throw new Error(rpcMessage(error, "Création du partenaire impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Partenaire introuvable.");
  return parseOrganizationPartner(row);
}

export async function updateOrganizationPartner(
  userId: string | null | undefined,
  partnerId: string,
  input: OrganizationPartnerInput,
): Promise<OrganizationPartner> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_update_partner", {
    p_partner_id: partnerId,
    p_group_id: input.groupId || null,
    p_partner_kind: input.partnerKind,
    p_name: String(input.name || "").trim(),
    p_category: String(input.category || "").trim(),
    p_website_url: String(input.websiteUrl || "").trim(),
    p_offer_title: String(input.offerTitle || "").trim(),
    p_offer_text: String(input.offerText || "").trim(),
    p_promo_code: String(input.promoCode || "").trim(),
    p_placement: input.placement || "organization",
    p_starts_at: input.startsAt || null,
    p_ends_at: input.endsAt || null,
    p_logo_media_key: String(input.logoMediaKey || "").trim(),
  });
  if (error) throw new Error(rpcMessage(error, "Modification du partenaire impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Partenaire introuvable.");
  return parseOrganizationPartner(row);
}

export async function setOrganizationPartnerStatus(
  userId: string | null | undefined,
  partnerId: string,
  status: OrganizationPartnerStatus,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_set_partner_status", { p_partner_id: partnerId, p_status: status });
  if (error) throw new Error(rpcMessage(error, "Modification du statut impossible."));
}

export async function deleteOrganizationPartner(
  userId: string | null | undefined,
  partnerId: string,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_delete_partner", { p_partner_id: partnerId });
  if (error) throw new Error(rpcMessage(error, "Suppression du partenaire impossible."));
}

function coerceFederationMode(value: unknown): OrganizationFederationIntegrationMode {
  const raw = String(value || "manual").toLowerCase();
  return raw === "api" ? "api" : raw === "portal" ? "portal" : "manual";
}

function coerceFederationStatus(value: unknown): OrganizationFederationStatus {
  const raw = String(value || "pending").toLowerCase();
  return raw === "active" ? "active" : raw === "disabled" ? "disabled" : "pending";
}

function parseOrganizationFederationLink(row: any): OrganizationFederationLink {
  return {
    id: String(row?.id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    federationName: String(row?.federationName || row?.federation_name || "Fédération").trim().slice(0, 100) || "Fédération",
    federationCode: String(row?.federationCode || row?.federation_code || "").trim().slice(0, 32),
    countryCode: String(row?.countryCode || row?.country_code || "FR").trim().toUpperCase().slice(0, 3) || "FR",
    season: String(row?.season || "").trim().slice(0, 20),
    affiliationNumber: String(row?.affiliationNumber || row?.affiliation_number || "").trim().slice(0, 64),
    externalClubId: String(row?.externalClubId || row?.external_club_id || "").trim().slice(0, 80),
    portalUrl: String(row?.portalUrl || row?.portal_url || "").trim().slice(0, 300),
    integrationMode: coerceFederationMode(row?.integrationMode || row?.integration_mode),
    connectorKey: String(row?.connectorKey || row?.connector_key || "").trim().slice(0, 64),
    status: coerceFederationStatus(row?.status),
    writeEnabled: Boolean(row?.writeEnabled ?? row?.write_enabled),
    createdAt: String(row?.createdAt || row?.created_at || nowIso()),
    updatedAt: String(row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at || nowIso()),
  };
}

export async function listOrganizationFederationLinks(
  userId: string | null | undefined,
  organizationId: string,
): Promise<{ links: OrganizationFederationLink[]; cloudAvailable: boolean }> {
  if (!userId || !organizationId) return { links: [], cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_federation_links", { p_org_id: organizationId });
    if (error) throw error;
    return { links: rpcRows(data).filter(Boolean).map(parseOrganizationFederationLink), cloudAvailable: true };
  } catch (error) {
    console.warn("[organizations] federation links unavailable", error);
    return { links: [], cloudAvailable: false };
  }
}

export async function saveOrganizationFederationLink(
  userId: string | null | undefined,
  organizationId: string,
  input: OrganizationFederationLinkInput,
): Promise<OrganizationFederationLink> {
  if (!userId) throw new Error("Connexion requise.");
  const federationName = String(input.federationName || "").trim();
  if (federationName.length < 2) throw new Error("Nom de fédération requis.");
  const { data, error } = await supabase.rpc("ms_org_upsert_federation_link", {
    p_org_id: organizationId,
    p_link_id: input.id || null,
    p_federation_name: federationName,
    p_federation_code: String(input.federationCode || "").trim(),
    p_country_code: String(input.countryCode || "FR").trim().toUpperCase(),
    p_season: String(input.season || "").trim(),
    p_affiliation_number: String(input.affiliationNumber || "").trim(),
    p_external_club_id: String(input.externalClubId || "").trim(),
    p_portal_url: String(input.portalUrl || "").trim(),
    p_integration_mode: input.integrationMode || "manual",
    p_connector_key: String(input.connectorKey || "").trim(),
    p_status: input.status || "pending",
  });
  if (error) throw new Error(rpcMessage(error, "Enregistrement de l’affiliation impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Affiliation introuvable.");
  return parseOrganizationFederationLink(row);
}

export async function deleteOrganizationFederationLink(
  userId: string | null | undefined,
  linkId: string,
): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_delete_federation_link", { p_link_id: linkId });
  if (error) throw new Error(rpcMessage(error, "Suppression de l’affiliation impossible."));
}


function coerceInstallationKind(value: unknown): OrganizationInstallationKind {
  const raw = String(value || "other").toLowerCase();
  const allowed: OrganizationInstallationKind[] = ["dartboard","table","pitch","court","lane","room","station","other"];
  return allowed.includes(raw as OrganizationInstallationKind) ? raw as OrganizationInstallationKind : "other";
}

function coerceInstallationStatus(value: unknown): OrganizationInstallationStatus {
  const raw = String(value || "active").toLowerCase();
  return raw === "maintenance" ? "maintenance" : raw === "archived" ? "archived" : "active";
}

function parseOrganizationInstallation(row: any): OrganizationInstallation {
  return {
    id: String(row?.id || row?.installationId || row?.installation_id || ""),
    organizationId: String(row?.organizationId || row?.organization_id || ""),
    organizationName: String(row?.organizationName || row?.organization_name || "").trim(),
    organizationKind: coerceKind(row?.organizationKind || row?.organization_kind || "other"),
    name: String(row?.name || row?.installationName || row?.installation_name || "Installation").trim().slice(0, 100) || "Installation",
    kind: coerceInstallationKind(row?.kind || row?.installationKind || row?.installation_kind),
    sportId: String(row?.sportId || row?.sport_id || "Multisport").trim().slice(0, 48) || "Multisport",
    zoneLabel: String(row?.zoneLabel || row?.zone_label || "").trim().slice(0, 120),
    qrToken: String(row?.qrToken || row?.qr_token || "").trim(),
    status: coerceInstallationStatus(row?.status),
    playCount: Math.max(0, Number(row?.playCount ?? row?.play_count ?? 0) || 0),
    lastPlayedAt: String(row?.lastPlayedAt || row?.last_played_at || ""),
    createdAt: String(row?.createdAt || row?.created_at || ""),
    updatedAt: String(row?.updatedAt || row?.updated_at || ""),
  };
}

export async function listOrganizationInstallations(
  userId: string | null | undefined,
  organizationId: string,
): Promise<{ installations: OrganizationInstallation[]; cloudAvailable: boolean }> {
  if (!userId || !organizationId) return { installations: [], cloudAvailable: false };
  try {
    const { data, error } = await supabase.rpc("ms_org_list_installations", { p_org_id: organizationId });
    if (error) throw error;
    return { installations: rpcRows(data).filter(Boolean).map(parseOrganizationInstallation), cloudAvailable: true };
  } catch (error) {
    console.warn("[organizations] installations unavailable", error);
    return { installations: [], cloudAvailable: false };
  }
}

export async function createOrganizationInstallation(
  userId: string | null | undefined,
  organizationId: string,
  input: OrganizationInstallationInput,
): Promise<OrganizationInstallation> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_create_installation", {
    p_org_id: organizationId,
    p_name: String(input.name || "").trim(),
    p_kind: input.kind || "other",
    p_sport_id: String(input.sportId || "Multisport").trim(),
    p_zone_label: String(input.zoneLabel || "").trim(),
  });
  if (error) throw new Error(rpcMessage(error, "Création de l’installation impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Installation introuvable.");
  return parseOrganizationInstallation(row);
}

export async function updateOrganizationInstallation(
  userId: string | null | undefined,
  installationId: string,
  input: OrganizationInstallationInput,
): Promise<OrganizationInstallation> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_update_installation", {
    p_installation_id: installationId,
    p_name: String(input.name || "").trim(),
    p_kind: input.kind || "other",
    p_sport_id: String(input.sportId || "Multisport").trim(),
    p_zone_label: String(input.zoneLabel || "").trim(),
    p_status: input.status || "active",
  });
  if (error) throw new Error(rpcMessage(error, "Modification de l’installation impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Installation introuvable.");
  return parseOrganizationInstallation(row);
}

export async function deleteOrganizationInstallation(userId: string | null | undefined, installationId: string): Promise<void> {
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase.rpc("ms_org_delete_installation", { p_installation_id: installationId });
  if (error) throw new Error(rpcMessage(error, "Suppression de l’installation impossible."));
}

export async function rotateOrganizationInstallationQr(userId: string | null | undefined, installationId: string): Promise<OrganizationInstallation> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_rotate_installation_qr", { p_installation_id: installationId });
  if (error) throw new Error(rpcMessage(error, "Régénération du QR impossible."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Installation introuvable.");
  return parseOrganizationInstallation(row);
}

export async function resolveOrganizationInstallationQr(
  userId: string | null | undefined,
  token: string,
): Promise<OrganizationInstallation> {
  if (!userId) throw new Error("Connexion requise.");
  const { data, error } = await supabase.rpc("ms_org_resolve_installation_qr", { p_token: String(token || "").trim() });
  if (error) throw new Error(rpcMessage(error, "QR code invalide."));
  const row = rpcRows(data)[0] || data;
  if (!row) throw new Error("Installation introuvable.");
  return parseOrganizationInstallation(row);
}

export async function touchOrganizationInstallation(
  userId: string | null | undefined,
  token: string,
): Promise<void> {
  if (!userId || !token) return;
  try {
    const { error } = await supabase.rpc("ms_org_touch_installation", { p_token: String(token).trim() });
    if (error) throw error;
  } catch (error) {
    console.warn("[organizations] venue usage counter unavailable", error);
  }
}
