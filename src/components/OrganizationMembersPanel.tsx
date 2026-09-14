import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { cloudSearchUsers, type CloudPublicUser } from "../lib/publicSocialApi";
import {
  cancelOrganizationInvitation,
  inviteOrganizationUser,
  listOrganizationInvitations,
  listOrganizationMembers,
  organizationRoleLabel,
  removeOrganizationMember,
  rotateOrganizationJoinCode,
  setOrganizationGroupMember,
  setOrganizationMemberRole,
  setOrganizationMemberStatus,
  type OrganizationInvitation,
  type OrganizationLocalGroup,
  type OrganizationMember,
  type OrganizationRecord,
  type OrganizationRole,
} from "../organizations/organizationService";

type Props = {
  organization: OrganizationRecord;
  groups: OrganizationLocalGroup[];
  userId: string | null;
  onChanged?: () => void | Promise<void>;
};

const ALL_ROLES: OrganizationRole[] = ["admin", "manager", "captain", "member", "guest"];

function initials(value: string) {
  const out = String(value || "Joueur").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return out || "M";
}

function allowedRoles(actor: OrganizationRole): OrganizationRole[] {
  if (actor === "owner") return ALL_ROLES;
  if (actor === "admin") return ["manager", "captain", "member", "guest"];
  if (actor === "manager") return ["captain", "member", "guest"];
  return [];
}

function canEditTarget(actor: OrganizationRole, target: OrganizationMember) {
  if (target.role === "owner") return false;
  if (actor === "owner") return true;
  if (actor === "admin") return target.role !== "admin";
  if (actor === "manager") return !["admin", "manager"].includes(target.role);
  return false;
}

function canModerateTarget(actor: OrganizationRole, target: OrganizationMember) {
  if (target.role === "owner") return false;
  if (actor === "owner") return true;
  if (actor === "admin") return target.role !== "admin";
  return false;
}

export default function OrganizationMembersPanel({ organization, groups, userId, onChanged }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [members, setMembers] = React.useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = React.useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<CloudPublicUser[]>([]);
  const [searchBusy, setSearchBusy] = React.useState(false);
  const [inviteRole, setInviteRole] = React.useState<OrganizationRole>("member");
  const [actionKey, setActionKey] = React.useState("");
  const [expandedMember, setExpandedMember] = React.useState("");
  const canManage = ["owner", "admin", "manager"].includes(organization.role);
  const canAdmin = ["owner", "admin"].includes(organization.role);
  const roleOptions = allowedRoles(organization.role);

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.cardBackground || theme.card,
    boxShadow: `0 16px 34px rgba(0,0,0,.38), 0 0 18px ${theme.primary}10`,
  };
  const input: React.CSSProperties = {
    width: "100%",
    minHeight: 40,
    borderRadius: 12,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,.28)",
    color: theme.text,
    padding: "9px 10px",
    outline: "none",
    fontSize: 11,
    boxSizing: "border-box",
  };
  const button: React.CSSProperties = {
    minHeight: 36,
    borderRadius: 11,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(255,255,255,.035)",
    color: theme.text,
    fontWeight: 900,
    fontSize: 9,
    padding: "7px 10px",
    cursor: "pointer",
  };

  const refresh = React.useCallback(async () => {
    if (!organization.id) return;
    setLoading(true);
    setError("");
    try {
      const [memberResult, inviteResult] = await Promise.all([
        listOrganizationMembers(userId, organization.id),
        canManage ? listOrganizationInvitations(userId, organization.id) : Promise.resolve({ invitations: [] as OrganizationInvitation[], cloudAvailable: false }),
      ]);
      setMembers(memberResult.members);
      setInvitations(inviteResult.invitations);
    } catch (e: any) {
      setError(String(e?.message || L("Impossible de charger les membres.", "Unable to load members.", "No se pueden cargar los miembros.")));
    } finally {
      setLoading(false);
    }
  }, [organization.id, userId, canManage, L]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  React.useEffect(() => {
    const q = search.trim();
    if (q.length < 2 || !canManage) {
      setSearchResults([]);
      setSearchBusy(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchBusy(true);
      void cloudSearchUsers(q).then((rows) => {
        if (cancelled) return;
        const memberIds = new Set(members.map((m) => m.userId));
        const pendingIds = new Set(invitations.filter((inv) => inv.status === "pending").map((inv) => inv.invitedUserId));
        setSearchResults(rows.filter((row) => {
          const id = String(row.userId || row.id || "");
          return id && id !== userId && !memberIds.has(id) && !pendingIds.has(id);
        }).slice(0, 8));
      }).catch((e) => {
        if (!cancelled) setError(String(e?.message || L("Recherche indisponible.", "Search unavailable.", "Búsqueda no disponible.")));
      }).finally(() => { if (!cancelled) setSearchBusy(false); });
    }, 320);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, canManage, members, invitations, userId, L]);

  const run = async (key: string, fn: () => Promise<void>, success?: string) => {
    setActionKey(key);
    setError("");
    setNotice("");
    try {
      await fn();
      if (success) setNotice(success);
      await refresh();
      await onChanged?.();
    } catch (e: any) {
      setError(String(e?.message || L("Action impossible.", "Action failed.", "Acción imposible.")));
    } finally {
      setActionKey("");
    }
  };

  const copyCode = async () => {
    if (!organization.joinCode) return;
    try {
      await navigator.clipboard?.writeText(organization.joinCode);
      setNotice(L("Code d’invitation copié.", "Invitation code copied.", "Código de invitación copiado."));
    } catch {
      setNotice(organization.joinCode);
    }
  };

  const shareCode = async () => {
    const text = `${organization.name} · MULTISPORTS SCORING\n${L("Code d’invitation", "Invitation code", "Código de invitación")}: ${organization.joinCode}`;
    try {
      if (navigator.share) await navigator.share({ title: organization.name, text });
      else await navigator.clipboard?.writeText(text);
      setNotice(L("Invitation prête à être partagée.", "Invitation ready to share.", "Invitación lista para compartir."));
    } catch {}
  };

  const inviteUser = (candidate: CloudPublicUser) => {
    const candidateId = String(candidate.userId || candidate.id || "");
    if (!candidateId) return;
    void run(`invite:${candidateId}`, async () => {
      await inviteOrganizationUser(userId, organization.id, candidateId, inviteRole);
      setSearch("");
      setSearchResults([]);
    }, L("Invitation envoyée dans MULTISPORTS SCORING.", "Invitation sent in MULTISPORTS SCORING.", "Invitación enviada en MULTISPORTS SCORING."));
  };

  const activeCount = members.filter((m) => m.status === "active").length;
  const suspendedCount = members.filter((m) => m.status === "suspended").length;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ ...card, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
          <div>
            <div style={{ color: theme.primary, fontSize: 13, fontWeight: 1000 }}>{L("MEMBRES & RÔLES", "MEMBERS & ROLES", "MIEMBROS Y ROLES")}</div>
            <div style={{ marginTop: 3, color: theme.textSoft, fontSize: 9.5 }}>{organization.name}</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ borderRadius: 999, padding: "4px 7px", background: `${theme.primary}12`, color: theme.primary, fontSize: 8, fontWeight: 1000 }}>{activeCount} {L("ACTIFS", "ACTIVE", "ACTIVOS")}</span>
            {suspendedCount ? <span style={{ borderRadius: 999, padding: "4px 7px", background: "rgba(255,120,80,.1)", color: "#ff9b78", fontSize: 8, fontWeight: 1000 }}>{suspendedCount} {L("SUSP.", "SUSP.", "SUSP.")}</span> : null}
          </div>
        </div>

        <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 7, alignItems: "stretch" }}>
          <button type="button" onClick={() => void copyCode()} style={{ ...button, minWidth: 0, textAlign: "left", overflow: "hidden" }}>
            <span style={{ color: theme.textSoft, fontSize: 7.5, display: "block" }}>{L("CODE D’INVITATION", "INVITATION CODE", "CÓDIGO DE INVITACIÓN")}</span>
            <strong style={{ display: "block", marginTop: 2, color: theme.primary, letterSpacing: .8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{organization.joinCode || "—"}</strong>
          </button>
          <button type="button" onClick={() => void shareCode()} style={button}>{L("PARTAGER", "SHARE", "COMPARTIR")}</button>
          {canAdmin ? <button type="button" disabled={!!actionKey} onClick={() => void run("rotate", async () => { await rotateOrganizationJoinCode(userId, organization.id); }, L("Nouveau code généré.", "New code generated.", "Nuevo código generado."))} style={{ ...button, opacity: actionKey === "rotate" ? .55 : 1 }}>{L("NOUVEAU CODE", "NEW CODE", "NUEVO CÓDIGO")}</button> : null}
        </div>
      </div>

      {canManage ? <div style={{ ...card, padding: 14 }}>
        <div style={{ color: theme.text, fontSize: 11, fontWeight: 1000 }}>{L("Inviter un utilisateur MSS", "Invite an MSS user", "Invitar a un usuario MSS")}</div>
        <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9, lineHeight: 1.35 }}>{L("Recherche par pseudo public. Pour quelqu’un qui n’a pas encore de compte, partage simplement le code ci-dessus.", "Search by public nickname. For someone without an account yet, simply share the code above.", "Busca por apodo público. Para alguien que aún no tenga cuenta, comparte el código de arriba.")}</div>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "minmax(0,1fr) 120px", gap: 7 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} style={input} placeholder={L("Rechercher un joueur…", "Search a player…", "Buscar un jugador…")} />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as OrganizationRole)} style={input}>
            {roleOptions.map((role) => <option key={role} value={role}>{organizationRoleLabel(role)}</option>)}
          </select>
        </div>
        {searchBusy ? <div style={{ marginTop: 8, color: theme.textSoft, fontSize: 9 }}>{L("Recherche…", "Searching…", "Buscando…")}</div> : null}
        {searchResults.length ? <div style={{ display: "grid", gap: 6, marginTop: 8 }}>{searchResults.map((candidate) => {
          const id = String(candidate.userId || candidate.id || "");
          const name = String(candidate.displayName || candidate.nickname || "Joueur MSS");
          return <div key={id} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.18)", padding: 8, display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
            <span style={{ width: 36, height: 36, borderRadius: 999, overflow: "hidden", border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.04)", display: "grid", placeItems: "center", color: theme.primary, fontSize: 10, fontWeight: 1000 }}>{candidate.avatarUrl ? <img src={candidate.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(name)}</span>
            <span style={{ minWidth: 0 }}><strong style={{ display: "block", color: theme.text, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</strong><small style={{ color: theme.textSoft, fontSize: 8 }}>{candidate.countryCode || "MSS"}</small></span>
            <button type="button" disabled={!!actionKey} onClick={() => inviteUser(candidate)} style={{ ...button, color: theme.primary, borderColor: `${theme.primary}66`, opacity: actionKey === `invite:${id}` ? .55 : 1 }}>{actionKey === `invite:${id}` ? "…" : L("INVITER", "INVITE", "INVITAR")}</button>
          </div>;
        })}</div> : null}
      </div> : null}

      {error ? <div style={{ borderRadius: 12, border: "1px solid rgba(255,90,90,.5)", background: "rgba(255,60,60,.08)", color: "#ffb0b0", padding: 10, fontSize: 9.5 }}>{error}</div> : null}
      {notice ? <div style={{ borderRadius: 12, border: `1px solid ${theme.primary}44`, background: `${theme.primary}0d`, color: theme.textSoft, padding: 10, fontSize: 9.5 }}>{notice}</div> : null}

      {loading ? <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10 }}>{L("Chargement de l’effectif…", "Loading roster…", "Cargando plantilla…")}</div> : null}
      {!loading && !members.length ? <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10 }}>{L("Aucun membre disponible. La migration ORGANISATIONS V3 doit être déployée pour activer l’effectif cloud.", "No members available. ORGANIZATIONS V3 migration must be deployed to enable the cloud roster.", "No hay miembros disponibles. Debe desplegarse la migración ORGANIZATIONS V3 para activar la plantilla en la nube.")}</div> : null}

      {members.map((member) => {
        const editable = canEditTarget(organization.role, member);
        const moderatable = canModerateTarget(organization.role, member);
        const isMe = member.userId === userId;
        const expanded = expandedMember === member.userId;
        return <div key={member.userId} style={{ ...card, padding: 11, opacity: member.status === "suspended" ? .68 : 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
            <span style={{ width: 44, height: 44, borderRadius: 999, overflow: "hidden", border: `1px solid ${member.role === "owner" ? theme.primary : theme.borderSoft}`, background: "rgba(255,255,255,.04)", display: "grid", placeItems: "center", color: theme.primary, fontSize: 11, fontWeight: 1000 }}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(member.displayName)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><strong style={{ color: theme.text, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.displayName}</strong>{isMe ? <span style={{ color: theme.primary, fontSize: 7.5, fontWeight: 1000 }}>MOI</span> : null}</div>
              <div style={{ marginTop: 3, color: theme.textSoft, fontSize: 8.4 }}>{member.countryCode || "MSS"} · {member.status === "active" ? L("Actif", "Active", "Activo") : L("Suspendu", "Suspended", "Suspendido")}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {editable ? <select disabled={!!actionKey} value={member.role} onChange={(e) => { const role = e.target.value as OrganizationRole; void run(`role:${member.userId}`, async () => { await setOrganizationMemberRole(userId, organization.id, member.userId, role); }); }} style={{ ...input, width: 124, minHeight: 34, padding: "6px 7px", fontSize: 9 }}>{[member.role, ...roleOptions.filter((role) => role !== member.role)].map((role) => <option key={role} value={role}>{organizationRoleLabel(role)}</option>)}</select> : <span style={{ borderRadius: 999, padding: "4px 7px", border: `1px solid ${theme.borderSoft}`, color: member.role === "owner" ? theme.primary : theme.textSoft, fontSize: 8, fontWeight: 900 }}>{organizationRoleLabel(member.role)}</span>}
              {groups.length && editable ? <button type="button" onClick={() => setExpandedMember(expanded ? "" : member.userId)} style={{ ...button, width: 32, minHeight: 32, padding: 0 }} title={L("Équipes", "Teams", "Equipos")}>{expanded ? "−" : "+"}</button> : null}
            </div>
          </div>

          {member.groupIds.length ? <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>{member.groupIds.map((groupId) => { const group = groups.find((g) => g.id === groupId); return group ? <span key={groupId} style={{ borderRadius: 999, padding: "4px 7px", background: `${theme.primary}10`, color: theme.primary, fontSize: 7.8, fontWeight: 900 }}>{group.name}</span> : null; })}</div> : null}

          {expanded && editable ? <div style={{ marginTop: 9, borderTop: `1px solid ${theme.borderSoft}`, paddingTop: 9 }}>
            <div style={{ color: theme.textSoft, fontSize: 8.5, fontWeight: 900 }}>{L("AFFECTATION AUX ÉQUIPES / GROUPES", "TEAM / GROUP ASSIGNMENT", "ASIGNACIÓN A EQUIPOS / GRUPOS")}</div>
            <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>{groups.map((group) => { const checked = member.groupIds.includes(group.id); return <label key={group.id} style={{ minHeight: 36, borderRadius: 10, border: `1px solid ${checked ? theme.primary : theme.borderSoft}`, background: checked ? `${theme.primary}10` : "rgba(255,255,255,.02)", color: checked ? theme.primary : theme.text, padding: "7px 8px", display: "flex", alignItems: "center", gap: 7, fontSize: 8.7, fontWeight: 850, cursor: "pointer" }}><input type="checkbox" checked={checked} disabled={!!actionKey} onChange={(e) => void run(`group:${member.userId}:${group.id}`, async () => { await setOrganizationGroupMember(userId, group.id, member.userId, e.target.checked); })} /> <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</span></label>; })}</div>
          </div> : null}

          {moderatable ? <div style={{ marginTop: 9, display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
            <button type="button" disabled={!!actionKey} onClick={() => void run(`status:${member.userId}`, async () => { await setOrganizationMemberStatus(userId, organization.id, member.userId, member.status === "active" ? "suspended" : "active"); })} style={{ ...button, color: member.status === "active" ? "#ffbd72" : theme.primary }}>{member.status === "active" ? L("SUSPENDRE", "SUSPEND", "SUSPENDER") : L("RÉACTIVER", "REACTIVATE", "REACTIVAR")}</button>
            <button type="button" disabled={!!actionKey} onClick={() => { if (window.confirm(L(`Retirer ${member.displayName} de l’organisation ?`, `Remove ${member.displayName} from the organization?`, `¿Quitar a ${member.displayName} de la organización?`))) void run(`remove:${member.userId}`, async () => { await removeOrganizationMember(userId, organization.id, member.userId); }); }} style={{ ...button, color: "#ff8c8c", borderColor: "rgba(255,100,100,.35)" }}>{L("RETIRER", "REMOVE", "QUITAR")}</button>
          </div> : null}
        </div>;
      })}

      {canManage && invitations.length ? <div style={{ ...card, padding: 13 }}>
        <div style={{ color: theme.text, fontSize: 10.5, fontWeight: 1000 }}>{L("Invitations en attente", "Pending invitations", "Invitaciones pendientes")}</div>
        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>{invitations.filter((inv) => inv.status === "pending").map((inv) => <div key={inv.id} style={{ borderRadius: 11, border: `1px solid ${theme.borderSoft}`, padding: 8, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}><div style={{ minWidth: 0 }}><strong style={{ display: "block", color: theme.text, fontSize: 9.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.displayName}</strong><small style={{ color: theme.textSoft, fontSize: 8 }}>{organizationRoleLabel(inv.role)} · {new Date(inv.createdAt).toLocaleDateString()}</small></div><button type="button" disabled={!!actionKey} onClick={() => void run(`cancel:${inv.id}`, async () => { await cancelOrganizationInvitation(userId, inv.id); })} style={{ ...button, minHeight: 30, color: "#ff9a9a" }}>{L("ANNULER", "CANCEL", "CANCELAR")}</button></div>)}</div>
      </div> : null}
    </div>
  );
}
