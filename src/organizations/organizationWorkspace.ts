export type OrganizationWorkspace =
  | { kind: "personal" }
  | { kind: "organization"; organizationId: string };

export const ORGANIZATION_WORKSPACE_EVENT = "msc:organization-workspace-change";
const PREFIX = "msc_organization_workspace_v1";

function normalizeUserKey(userId?: string | null): string {
  const raw = String(userId || "guest").trim().toLowerCase();
  return raw.replace(/[^a-z0-9_-]/g, "_").slice(0, 96) || "guest";
}

function key(userId?: string | null) {
  return `${PREFIX}:${normalizeUserKey(userId)}`;
}

export function loadOrganizationWorkspace(userId?: string | null): OrganizationWorkspace {
  if (typeof window === "undefined") return { kind: "personal" };
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return { kind: "personal" };
    const parsed = JSON.parse(raw);
    const organizationId = String(parsed?.organizationId || "").trim();
    if (parsed?.kind === "organization" && organizationId) return { kind: "organization", organizationId };
  } catch {}
  return { kind: "personal" };
}

export function saveOrganizationWorkspace(userId: string | null | undefined, workspace: OrganizationWorkspace) {
  if (typeof window === "undefined") return;
  const clean: OrganizationWorkspace = workspace.kind === "organization" && String(workspace.organizationId || "").trim()
    ? { kind: "organization", organizationId: String(workspace.organizationId).trim() }
    : { kind: "personal" };
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(clean));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(ORGANIZATION_WORKSPACE_EVENT, { detail: clean }));
  } catch {
    try { window.dispatchEvent(new Event(ORGANIZATION_WORKSPACE_EVENT)); } catch {}
  }
}

export function enterPersonalWorkspace(userId?: string | null) {
  saveOrganizationWorkspace(userId, { kind: "personal" });
}

export function enterOrganizationWorkspace(userId: string | null | undefined, organizationId: string) {
  const id = String(organizationId || "").trim();
  if (!id) return enterPersonalWorkspace(userId);
  saveOrganizationWorkspace(userId, { kind: "organization", organizationId: id });
}
