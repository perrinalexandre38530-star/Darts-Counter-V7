export type OrganizationPlayContext = {
  organizationId: string;
  organizationName: string;
  installationId: string;
  installationName: string;
  installationKind: string;
  sportId: string;
  qrToken: string;
  activatedAt: number;
  expiresAt: number;
};

const KEY = "mss-organization-play-context-v1";
const TTL_MS = 12 * 60 * 60 * 1000;

function clean(value: unknown, max = 120): string {
  return String(value || "").trim().slice(0, max);
}

export function loadOrganizationPlayContext(): OrganizationPlayContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OrganizationPlayContext>;
    const expiresAt = Number(parsed.expiresAt || 0);
    if (!parsed.organizationId || !parsed.installationId || !expiresAt || expiresAt < Date.now()) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return {
      organizationId: clean(parsed.organizationId, 80),
      organizationName: clean(parsed.organizationName, 120),
      installationId: clean(parsed.installationId, 80),
      installationName: clean(parsed.installationName, 100),
      installationKind: clean(parsed.installationKind, 32),
      sportId: clean(parsed.sportId || "Multisport", 48),
      qrToken: clean(parsed.qrToken, 80),
      activatedAt: Number(parsed.activatedAt || Date.now()),
      expiresAt,
    };
  } catch {
    return null;
  }
}

export function activateOrganizationPlayContext(input: Omit<OrganizationPlayContext, "activatedAt" | "expiresAt">): OrganizationPlayContext {
  const now = Date.now();
  const context: OrganizationPlayContext = {
    organizationId: clean(input.organizationId, 80),
    organizationName: clean(input.organizationName, 120),
    installationId: clean(input.installationId, 80),
    installationName: clean(input.installationName, 100),
    installationKind: clean(input.installationKind, 32),
    sportId: clean(input.sportId || "Multisport", 48),
    qrToken: clean(input.qrToken, 80),
    activatedAt: now,
    expiresAt: now + TTL_MS,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(context));
      window.dispatchEvent(new CustomEvent("mss-organization-play-context", { detail: context }));
    } catch {}
  }
  return context;
}

export function clearOrganizationPlayContext(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("mss-organization-play-context", { detail: null }));
  } catch {}
}

export function applyOrganizationPlayContext<T extends Record<string, any>>(record: T): T {
  const context = loadOrganizationPlayContext();
  if (!context || !record || typeof record !== "object") return record;
  const payload = record.payload && typeof record.payload === "object" ? record.payload : {};
  const organizationContext = {
    organizationId: context.organizationId,
    organizationName: context.organizationName,
    installationId: context.installationId,
    installationName: context.installationName,
    installationKind: context.installationKind,
    sportId: context.sportId,
    source: "organization_venue",
    activatedAt: context.activatedAt,
  };
  record.organizationId = record.organizationId || context.organizationId;
  record.installationId = record.installationId || context.installationId;
  record.payload = { ...payload, organizationContext };
  return record;
}
