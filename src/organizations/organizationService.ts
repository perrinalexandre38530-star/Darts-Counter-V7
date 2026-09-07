import { supabase } from "../lib/supabaseClient";

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
};

export type OrganizationLocalGroup = {
  id: string;
  organizationId: string;
  name: string;
  sportId: string;
  createdAt: string;
};

export type OrganizationLocalEvent = {
  id: string;
  organizationId: string;
  title: string;
  startsAt: string;
  location: string;
  createdAt: string;
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
      organizations: Array.isArray(parsed.organizations) ? parsed.organizations : [],
      activeOrganizationId: typeof parsed.activeOrganizationId === "string" ? parsed.activeOrganizationId : null,
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
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

export function addLocalOrganizationGroup(userId: string | null | undefined, organizationId: string, name: string, sportId: string): OrganizationLocalGroup {
  const cleanName = String(name || "").trim().slice(0, 72);
  if (cleanName.length < 2) throw new Error("Nom de groupe trop court.");
  const state = loadOrganizationLocalState(userId);
  const group: OrganizationLocalGroup = {
    id: localId("grp"),
    organizationId,
    name: cleanName,
    sportId: String(sportId || "multisport").trim().slice(0, 48) || "multisport",
    createdAt: nowIso(),
  };
  const groups = [group, ...state.groups];
  const organizations = state.organizations.map((org) => org.id === organizationId ? { ...org, groupCount: groups.filter((item) => item.organizationId === organizationId).length, updatedAt: nowIso() } : org);
  saveOrganizationLocalState(userId, { ...state, groups, organizations });
  return group;
}

export function listLocalOrganizationGroups(userId: string | null | undefined, organizationId: string): OrganizationLocalGroup[] {
  return loadOrganizationLocalState(userId).groups.filter((item) => item.organizationId === organizationId);
}

export function addLocalOrganizationEvent(userId: string | null | undefined, organizationId: string, title: string, startsAt: string, location: string): OrganizationLocalEvent {
  const cleanTitle = String(title || "").trim().slice(0, 96);
  if (cleanTitle.length < 2) throw new Error("Titre d’événement trop court.");
  const parsed = new Date(startsAt);
  if (!Number.isFinite(parsed.getTime())) throw new Error("Date d’événement invalide.");
  const state = loadOrganizationLocalState(userId);
  const event: OrganizationLocalEvent = {
    id: localId("evt"),
    organizationId,
    title: cleanTitle,
    startsAt: parsed.toISOString(),
    location: String(location || "").trim().slice(0, 120),
    createdAt: nowIso(),
  };
  const events = [event, ...state.events];
  const organizations = state.organizations.map((org) => org.id === organizationId ? { ...org, eventCount: events.filter((item) => item.organizationId === organizationId).length, updatedAt: nowIso() } : org);
  saveOrganizationLocalState(userId, { ...state, events, organizations });
  return event;
}

export function listLocalOrganizationEvents(userId: string | null | undefined, organizationId: string): OrganizationLocalEvent[] {
  return loadOrganizationLocalState(userId).events
    .filter((item) => item.organizationId === organizationId)
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
