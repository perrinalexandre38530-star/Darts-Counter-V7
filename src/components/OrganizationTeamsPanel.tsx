import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  createOrganizationGroup,
  deleteOrganizationGroup,
  listOrganizationGroups,
  listOrganizationMembers,
  setOrganizationGroupMember,
  updateOrganizationGroup,
  type OrganizationGroupKind,
  type OrganizationLocalGroup,
  type OrganizationMember,
  type OrganizationRecord,
} from "../organizations/organizationService";
import {
  captureUserMediaFallback,
  resolveUserMediaFallback,
  teamLogoMediaKey,
} from "../lib/userMediaFallback";
import { fileToCompressedImageDataUrl } from "../lib/teamImageStorage";
import { getStorageDestination, loadStoragePrefs } from "../lib/storagePlans";
import { loadTeams, type TeamEntity } from "../lib/petanqueTeamsStore";

const SPORTS = ["Multisport", "Fléchettes", "Baby-foot", "Ping-pong", "Pétanque", "Mölkky", "Running", "FIT PERF", "Football", "Autre"];
const GROUP_KINDS: OrganizationGroupKind[] = ["team", "section", "department", "class", "group"];

type Props = {
  organization: OrganizationRecord;
  userId: string | null;
  initialGroups?: OrganizationLocalGroup[];
  onChanged?: () => void | Promise<void>;
};

type Draft = {
  name: string;
  sportId: string;
  kind: OrganizationGroupKind;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  captainUserId: string;
  status: "active" | "archived";
};

function blankDraft(): Draft {
  return {
    name: "",
    sportId: "Multisport",
    kind: "team",
    description: "",
    primaryColor: "#22D3EE",
    secondaryColor: "#0F172A",
    captainUserId: "",
    status: "active",
  };
}

function initials(value: string) {
  return String(value || "MSS").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "M";
}


function OrganizationGroupLogo({ group, size = 50 }: { group: OrganizationLocalGroup; size?: number }) {
  const [url, setUrl] = React.useState("");
  React.useEffect(() => {
    let cancelled = false;
    if (!group.logoMediaKey) { setUrl(""); return; }
    void resolveUserMediaFallback(group.logoMediaKey, "", { kind: "team_logo", allowR2: true }).then((next) => {
      if (!cancelled) setUrl(next || "");
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [group.id, group.logoMediaKey]);
  return <span style={{ width: size, height: size, borderRadius: 15, overflow: "hidden", border: `1px solid ${group.primaryColor}88`, background: `linear-gradient(145deg, ${group.primaryColor}22, ${group.secondaryColor}cc)`, display: "grid", placeItems: "center", flexShrink: 0 }}>
    {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <strong style={{ color: group.primaryColor, fontSize: Math.max(11, size * .26) }}>{initials(group.name)}</strong>}
  </span>;
}
function kindLabel(kind: OrganizationGroupKind, L: (fr: string, en: string, es: string) => string) {
  const labels: Record<OrganizationGroupKind, string> = {
    team: L("Équipe", "Team", "Equipo"),
    section: L("Section", "Section", "Sección"),
    department: L("Département", "Department", "Departamento"),
    class: L("Classe", "Class", "Clase"),
    group: L("Groupe", "Group", "Grupo"),
  };
  return labels[kind];
}

export default function OrganizationTeamsPanel({ organization, userId, initialGroups = [], onChanged }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [groups, setGroups] = React.useState<OrganizationLocalGroup[]>(initialGroups);
  const [members, setMembers] = React.useState<OrganizationMember[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [mode, setMode] = React.useState<"list" | "create" | "edit">("list");
  const [draft, setDraft] = React.useState<Draft>(blankDraft);
  const [logoPreview, setLogoPreview] = React.useState("");
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionKey, setActionKey] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [availableTeams, setAvailableTeams] = React.useState<TeamEntity[]>([]);
  const [viewportWidth, setViewportWidth] = React.useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));

  const prefs = React.useMemo(() => loadStoragePrefs(), []);
  const destination = React.useMemo(() => getStorageDestination(prefs.selectedDestination), [prefs.selectedDestination]);
  const mirrorR2 = prefs.selectedDestination === "cloud_r2";
  const canManageStructure = ["owner", "admin", "manager"].includes(organization.role);
  const selected = groups.find((group) => group.id === selectedId) || null;
  const canManageRoster = canManageStructure || (organization.role === "captain" && selected?.captainUserId === userId);
  const activeMembers = members.filter((member) => member.status === "active");
  const wide = viewportWidth >= 980;

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.cardBackground || theme.card,
    boxShadow: `0 16px 34px rgba(0,0,0,.34), 0 0 16px ${theme.primary}0d`,
  };
  const input: React.CSSProperties = {
    width: "100%",
    minHeight: 41,
    borderRadius: 12,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,.28)",
    color: theme.text,
    padding: "9px 10px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: 10.5,
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
    setLoading(true);
    setError("");
    try {
      const [groupResult, memberResult] = await Promise.all([
        listOrganizationGroups(userId, organization.id),
        listOrganizationMembers(userId, organization.id),
      ]);
      setGroups(groupResult.groups);
      setMembers(memberResult.members);
      setSelectedId((current) => current && groupResult.groups.some((group) => group.id === current) ? current : "");
    } catch (e: any) {
      setError(String(e?.message || L("Impossible de charger les équipes.", "Unable to load teams.", "No se pueden cargar los equipos.")));
    } finally {
      setLoading(false);
    }
  }, [organization.id, userId, L]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setViewportWidth(window.innerWidth || 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (!selected || mode !== "edit") return;
    setDraft({
      name: selected.name,
      sportId: selected.sportId,
      kind: selected.kind,
      description: selected.description,
      primaryColor: selected.primaryColor,
      secondaryColor: selected.secondaryColor,
      captainUserId: selected.captainUserId,
      status: selected.status,
    });
    setLogoFile(null);
    setLogoPreview("");
    if (selected.logoMediaKey) {
      let cancelled = false;
      void resolveUserMediaFallback(selected.logoMediaKey, "", { kind: "team_logo", allowR2: true }).then((url) => {
        if (!cancelled) setLogoPreview(url || "");
      }).catch(() => undefined);
      return () => { cancelled = true; };
    }
  }, [selectedId, mode, selected]);

  const startCreate = () => {
    setSelectedId("");
    setDraft(blankDraft());
    setLogoPreview("");
    setLogoFile(null);
    setError("");
    setNotice("");
    setMode("create");
  };

  const startEdit = (group: OrganizationLocalGroup) => {
    setSelectedId(group.id);
    setMode("edit");
    setError("");
    setNotice("");
  };

  const pickLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(L("Le fichier choisi n’est pas une image.", "The selected file is not an image.", "El archivo seleccionado no es una imagen."));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError(L("Logo trop lourd : 12 Mo maximum avant compression.", "Logo too large: 12 MB maximum before compression.", "Logo demasiado pesado: 12 MB máximo antes de la compresión."));
      return;
    }
    try {
      const compact = await fileToCompressedImageDataUrl(file, { maxSize: 512, quality: 0.82 });
      setLogoFile(file);
      setLogoPreview(compact);
      setError("");
    } catch {
      setError(L("Impossible de préparer ce logo.", "Unable to prepare this logo.", "No se puede preparar este logo."));
    }
  };

  const save = async () => {
    if (!canManageStructure) return;
    if (draft.name.trim().length < 2) {
      setError(L("Donne un nom à l’équipe ou au groupe.", "Enter a team or group name.", "Indica un nombre para el equipo o grupo."));
      return;
    }
    setActionKey("save");
    setError("");
    setNotice("");
    try {
      let group: OrganizationLocalGroup;
      if (mode === "create") {
        const result = await createOrganizationGroup(userId, organization.id, draft.name, draft.sportId, draft);
        group = result.group;
      } else if (selected) {
        group = await updateOrganizationGroup(userId, selected.id, draft);
      } else {
        throw new Error(L("Équipe introuvable.", "Team not found.", "Equipo no encontrado."));
      }

      let logoMediaKey = group.logoMediaKey;
      if (logoPreview && (logoFile || !logoMediaKey)) {
        logoMediaKey = teamLogoMediaKey(group.id);
        await captureUserMediaFallback(logoMediaKey, logoPreview, { kind: "team_logo", mirrorR2, updatedAt: Date.now() });
        // Le même visuel est rendu disponible pour la vue liée dans Teams individuel.
        const linkedTeamKey = teamLogoMediaKey(`org-${organization.id}-${group.id}`);
        await captureUserMediaFallback(linkedTeamKey, logoPreview, { kind: "team_logo", mirrorR2, updatedAt: Date.now() }).catch(() => undefined);
        group = await updateOrganizationGroup(userId, group.id, { ...draft, logoMediaKey });
      }

      setMode("list");
      setSelectedId(group.id);
      setLogoFile(null);
      setNotice(L("Fiche équipe enregistrée.", "Team profile saved.", "Ficha del equipo guardada."));
      await refresh();
      await onChanged?.();
    } catch (e: any) {
      setError(String(e?.message || L("Enregistrement impossible.", "Unable to save.", "No se puede guardar.")));
    } finally {
      setActionKey("");
    }
  };

  const remove = async (group: OrganizationLocalGroup) => {
    if (!canManageStructure) return;
    if (!window.confirm(L(`Supprimer ${group.name} ?`, `Delete ${group.name}?`, `¿Eliminar ${group.name}?`))) return;
    setActionKey(`delete:${group.id}`);
    setError("");
    try {
      await deleteOrganizationGroup(userId, group.id);
      setNotice(L("Équipe supprimée.", "Team deleted.", "Equipo eliminado."));
      setMode("list");
      setSelectedId("");
      await refresh();
      await onChanged?.();
    } catch (e: any) {
      setError(String(e?.message || L("Suppression impossible.", "Unable to delete.", "No se puede eliminar.")));
    } finally {
      setActionKey("");
    }
  };

  const toggleMember = async (group: OrganizationLocalGroup, member: OrganizationMember, assigned: boolean) => {
    if (!canManageRoster) return;
    const key = `member:${group.id}:${member.userId}`;
    setActionKey(key);
    setError("");
    try {
      await setOrganizationGroupMember(userId, group.id, member.userId, assigned);
      await refresh();
      await onChanged?.();
    } catch (e: any) {
      setError(String(e?.message || L("Affectation impossible.", "Assignment failed.", "No se puede asignar.")));
    } finally {
      setActionKey("");
    }
  };

  const rosterFor = (group: OrganizationLocalGroup) => activeMembers.filter((member) => member.groupIds.includes(group.id));

  const openLinkExisting = () => {
    const existing = loadTeams().filter((team) => !groups.some((group) => group.name.trim().toLowerCase() === String(team.name || "").trim().toLowerCase()));
    setAvailableTeams(existing);
    setLinkOpen(true);
    setError("");
  };

  const linkExistingTeam = async (team: TeamEntity) => {
    if (!canManageStructure) return;
    const key = `link:${team.id}`;
    setActionKey(key);
    setError("");
    setNotice("");
    try {
      const created = await createOrganizationGroup(userId, organization.id, team.name, String(team.sport || team.sportIds?.[0] || "Multisport"), {
        kind: "team",
        description: String(team.description || team.slogan || "").slice(0, 280),
        primaryColor: "#22D3EE",
        secondaryColor: "#0F172A",
      });
      let group = created.group;
      if (team.logoDataUrl) {
        const logoMediaKey = teamLogoMediaKey(group.id);
        await captureUserMediaFallback(logoMediaKey, team.logoDataUrl, { kind: "team_logo", mirrorR2, updatedAt: Date.now() });
        const linkedTeamKey = teamLogoMediaKey(`org-${organization.id}-${group.id}`);
        await captureUserMediaFallback(linkedTeamKey, team.logoDataUrl, { kind: "team_logo", mirrorR2, updatedAt: Date.now() }).catch(() => undefined);
        group = await updateOrganizationGroup(userId, group.id, { logoMediaKey });
      }
      setSelectedId(group.id);
      setMode("list");
      setLinkOpen(false);
      setNotice(L("Équipe existante associée à l’organisation.", "Existing team linked to the organization.", "Equipo existente asociado a la organización."));
      await refresh();
      await onChanged?.();
    } catch (e: any) {
      setError(String(e?.message || L("Association impossible.", "Unable to link this team.", "No se puede asociar este equipo.")));
    } finally {
      setActionKey("");
    }
  };

  const renderEditor = () => {
    const editing = mode === "edit" && selected;
    return <div style={{ ...card, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ color: theme.primary, fontSize: 12.5, fontWeight: 1000 }}>{mode === "create" ? L("NOUVELLE ÉQUIPE / GROUPE", "NEW TEAM / GROUP", "NUEVO EQUIPO / GRUPO") : L("FICHE ÉQUIPE", "TEAM PROFILE", "FICHA DEL EQUIPO")}</div>
          <div style={{ marginTop: 3, color: theme.textSoft, fontSize: 8.8 }}>{L("Identité, sport, capitaine, couleurs et roster", "Identity, sport, captain, colors and roster", "Identidad, deporte, capitán, colores y plantilla")}</div>
        </div>
        <button type="button" style={button} onClick={() => { setMode("list"); setError(""); }}>{L("FERMER", "CLOSE", "CERRAR")}</button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "72px minmax(0,1fr)", gap: 12, alignItems: "start" }}>
        <label style={{ width: 70, height: 70, borderRadius: 18, border: `1px solid ${draft.primaryColor}88`, background: `linear-gradient(145deg, ${draft.primaryColor}20, ${draft.secondaryColor}dd)`, display: "grid", placeItems: "center", overflow: "hidden", cursor: canManageStructure ? "pointer" : "default" }}>
          {logoPreview ? <img src={logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: draft.primaryColor, fontWeight: 1000, fontSize: 17 }}>{initials(draft.name || "TEAM")}</span>}
          {canManageStructure ? <input type="file" accept="image/*" hidden onChange={(e) => void pickLogo(e.target.files?.[0])} /> : null}
        </label>
        <div style={{ display: "grid", gap: 8 }}>
          <input style={input} value={draft.name} onChange={(e) => setDraft((value) => ({ ...value, name: e.target.value }))} placeholder={L("Nom de l’équipe / section", "Team / section name", "Nombre del equipo / sección")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            <select style={input} value={draft.kind} onChange={(e) => setDraft((value) => ({ ...value, kind: e.target.value as OrganizationGroupKind }))}>{GROUP_KINDS.map((kind) => <option key={kind} value={kind}>{kindLabel(kind, L)}</option>)}</select>
            <select style={input} value={draft.sportId} onChange={(e) => setDraft((value) => ({ ...value, sportId: e.target.value }))}>{SPORTS.map((sport) => <option key={sport}>{sport}</option>)}</select>
          </div>
        </div>
      </div>

      <textarea style={{ ...input, minHeight: 76, resize: "vertical", marginTop: 9 }} value={draft.description} onChange={(e) => setDraft((value) => ({ ...value, description: e.target.value }))} placeholder={L("Description, catégorie, niveau, informations utiles…", "Description, category, level, useful information…", "Descripción, categoría, nivel, información útil…")} />

      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ ...card, padding: 9, display: "grid", gridTemplateColumns: "32px 1fr", gap: 8, alignItems: "center" }}><input type="color" value={draft.primaryColor} onChange={(e) => setDraft((value) => ({ ...value, primaryColor: e.target.value.toUpperCase() }))} style={{ width: 30, height: 30, border: 0, padding: 0, background: "transparent" }} /><span style={{ fontSize: 8.5, color: theme.textSoft }}>{L("Couleur principale", "Primary color", "Color principal")}</span></label>
        <label style={{ ...card, padding: 9, display: "grid", gridTemplateColumns: "32px 1fr", gap: 8, alignItems: "center" }}><input type="color" value={draft.secondaryColor} onChange={(e) => setDraft((value) => ({ ...value, secondaryColor: e.target.value.toUpperCase() }))} style={{ width: 30, height: 30, border: 0, padding: 0, background: "transparent" }} /><span style={{ fontSize: 8.5, color: theme.textSoft }}>{L("Couleur secondaire", "Secondary color", "Color secundario")}</span></label>
      </div>

      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "minmax(0,1fr) 130px", gap: 8 }}>
        <div>
          <div style={{ color: theme.textSoft, fontSize: 8, fontWeight: 950, marginBottom: 5 }}>{L("CAPITAINE / RESPONSABLE D’ÉQUIPE", "CAPTAIN / TEAM LEAD", "CAPITÁN / RESPONSABLE DEL EQUIPO")}</div>
          <select style={input} value={draft.captainUserId} onChange={(e) => setDraft((value) => ({ ...value, captainUserId: e.target.value }))}>
            <option value="">{L("Aucun pour le moment", "None for now", "Ninguno por ahora")}</option>
            {activeMembers.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}
          </select>
        </div>
        <div>
          <div style={{ color: theme.textSoft, fontSize: 8, fontWeight: 950, marginBottom: 5 }}>{L("STATUT", "STATUS", "ESTADO")}</div>
          <select style={input} value={draft.status} onChange={(e) => setDraft((value) => ({ ...value, status: e.target.value === "archived" ? "archived" : "active" }))}>
            <option value="active">{L("Actif", "Active", "Activo")}</option>
            <option value="archived">{L("Archivé", "Archived", "Archivado")}</option>
          </select>
        </div>
      </div>

      {editing ? <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div><div style={{ color: theme.text, fontSize: 10.5, fontWeight: 1000 }}>{L("EFFECTIF DE L’ÉQUIPE", "TEAM ROSTER", "PLANTILLA DEL EQUIPO")}</div><div style={{ color: theme.textSoft, fontSize: 8.5, marginTop: 2 }}>{rosterFor(selected).length} {L("membre(s) affecté(s)", "assigned member(s)", "miembro(s) asignado(s)")}</div></div>
          {!canManageRoster ? <span style={{ color: theme.textSoft, fontSize: 8 }}>{L("Lecture seule", "Read only", "Solo lectura")}</span> : null}
        </div>
        <div style={{ marginTop: 8, display: "grid", gap: 6, maxHeight: 270, overflowY: "auto" }}>
          {activeMembers.map((member) => {
            const assigned = member.groupIds.includes(selected.id);
            const busy = actionKey === `member:${selected.id}:${member.userId}`;
            return <label key={member.userId} style={{ ...card, padding: 9, display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 9, alignItems: "center", opacity: busy ? .65 : 1 }}>
              <span style={{ width: 32, height: 32, borderRadius: 999, overflow: "hidden", border: `1px solid ${theme.borderSoft}`, display: "grid", placeItems: "center", background: "rgba(0,0,0,.28)" }}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <strong style={{ color: theme.primary, fontSize: 9 }}>{initials(member.displayName)}</strong>}</span>
              <span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: 9.5, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.displayName}</strong><small style={{ color: theme.textSoft, fontSize: 7.8 }}>{member.userId === draft.captainUserId ? L("Capitaine", "Captain", "Capitán") : member.role}</small></span>
              <input type="checkbox" checked={assigned} disabled={!canManageRoster || busy} onChange={(e) => void toggleMember(selected, member, e.target.checked)} />
            </label>;
          })}
        </div>
      </div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: mode === "edit" ? "1fr auto" : "1fr", gap: 8 }}>
        <button type="button" disabled={!!actionKey || !canManageStructure} onClick={() => void save()} style={{ ...button, minHeight: 43, borderColor: `${theme.primary}88`, background: `${theme.primary}13`, color: theme.primary, opacity: !canManageStructure ? .45 : 1 }}>{actionKey === "save" ? L("ENREGISTREMENT…", "SAVING…", "GUARDANDO…") : L("ENREGISTRER LA FICHE", "SAVE PROFILE", "GUARDAR FICHA")}</button>
        {mode === "edit" && selected && canManageStructure ? <button type="button" disabled={!!actionKey} onClick={() => void remove(selected)} style={{ ...button, color: "#ff9f9f", borderColor: "rgba(255,95,95,.35)" }}>{L("SUPPRIMER", "DELETE", "ELIMINAR")}</button> : null}
      </div>
      <div style={{ marginTop: 8, color: theme.textSoft, fontSize: 7.8 }}>{L("Logo : stocké dans le coffre média / stockage choisi. Supabase ne conserve que la référence légère.", "Logo: stored in the media vault / selected storage. Supabase only keeps the lightweight reference.", "Logo: guardado en el almacén multimedia / almacenamiento elegido. Supabase solo conserva la referencia ligera.")} · {destination.shortLabel}</div>
    </div>;
  };

  if (loading && groups.length === 0) return <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10 }}>{L("Chargement des équipes…", "Loading teams…", "Cargando equipos…")}</div>;

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div><div style={{ color: theme.primary, fontSize: 13, fontWeight: 1000 }}>{L("ÉQUIPES & GROUPES", "TEAMS & GROUPS", "EQUIPOS Y GRUPOS")}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 9.2 }}>{organization.name} · {groups.filter((group) => group.status === "active").length} {L("actif(s)", "active", "activo(s)")}</div></div>
        {canManageStructure ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}><button type="button" style={{ ...button }} onClick={openLinkExisting}>{L("ASSOCIER UNE ÉQUIPE", "LINK A TEAM", "VINCULAR UN EQUIPO")}</button><button type="button" style={{ ...button, color: theme.primary, borderColor: `${theme.primary}66` }} onClick={startCreate}>+ {L("CRÉER", "CREATE", "CREAR")}</button></div> : null}
      </div>
    </div>

    {error ? <div style={{ ...card, padding: 10, borderColor: "rgba(255,90,90,.45)", color: "#ffb3b3", fontSize: 9.2 }}>{error}</div> : null}
    {notice ? <div style={{ ...card, padding: 10, borderColor: `${theme.primary}55`, color: theme.primary, fontSize: 9.2 }}>{notice}</div> : null}

    {linkOpen ? <div style={{ ...card, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div><div style={{ color: theme.primary, fontSize: 12.5, fontWeight: 1000 }}>{L("ASSOCIER UNE ÉQUIPE EXISTANTE", "LINK AN EXISTING TEAM", "ASOCIAR UN EQUIPO EXISTENTE")}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 8.8 }}>{L("Récupère une équipe déjà créée dans Profils / Équipes et ajoute-la à cette organisation.", "Bring in a team already created in Profiles / Teams and add it to this organization.", "Recupera un equipo ya creado en Perfiles / Equipos y añádelo a esta organización.")}</div></div>
        <button type="button" style={button} onClick={() => setLinkOpen(false)}>{L("FERMER", "CLOSE", "CERRAR")}</button>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: wide ? "repeat(2,minmax(0,1fr))" : "1fr", gap: 8 }}>
        {availableTeams.length ? availableTeams.map((team) => <button key={team.id} type="button" disabled={!!actionKey} onClick={() => void linkExistingTeam(team)} style={{ ...card, padding: 10, textAlign: "left", color: theme.text, cursor: "pointer", opacity: actionKey === `link:${team.id}` ? .6 : 1 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 10.5 }}>{team.name}</strong><span style={{ color: theme.primary, fontSize: 7.6, fontWeight: 1000 }}>{String(team.sport || team.sportIds?.[0] || "Multisport")}</span></div><div style={{ marginTop: 4, color: theme.textSoft, fontSize: 8.1, lineHeight: 1.35 }}>{String(team.description || team.slogan || L("Équipe existante du mode individuel.", "Existing team from personal mode.", "Equipo existente del modo individual.")).slice(0, 130)}</div></button>) : <div style={{ ...card, padding: 14, textAlign: "center", color: theme.textSoft, fontSize: 9 }}>{L("Aucune équipe supplémentaire disponible à associer.", "No additional teams available to link.", "No hay equipos adicionales disponibles para asociar.")}</div>}
      </div>
    </div> : null}

    {mode !== "list" ? renderEditor() : null}

    {mode === "list" ? <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(2,minmax(0,1fr))" : "1fr", gap: 9 }}>
      {groups.length ? groups.map((group) => {
        const roster = rosterFor(group);
        const captain = activeMembers.find((member) => member.userId === group.captainUserId);
        return <button key={group.id} type="button" onClick={() => startEdit(group)} style={{ ...card, width: "100%", padding: 11, color: theme.text, textAlign: "left", cursor: "pointer", display: "grid", gridTemplateColumns: "52px minmax(0,1fr) auto", gap: 11, alignItems: "center", opacity: group.status === "archived" ? .58 : 1 }}>
          <OrganizationGroupLogo group={group} size={50} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><strong style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</strong><span style={{ borderRadius: 999, padding: "2px 6px", border: `1px solid ${group.primaryColor}55`, color: group.primaryColor, fontSize: 7, fontWeight: 1000 }}>{kindLabel(group.kind, L).toUpperCase()}</span></span>
            <span style={{ display: "block", marginTop: 4, color: theme.textSoft, fontSize: 8.6 }}>{group.sportId} · {roster.length} {L("membre(s)", "member(s)", "miembro(s)")}</span>
            <span style={{ display: "block", marginTop: 2, color: theme.textSoft, fontSize: 8 }}>{captain ? `${L("Capitaine", "Captain", "Capitán")} · ${captain.displayName}` : L("Aucun capitaine défini", "No captain assigned", "Sin capitán asignado")}</span>
          </span>
          <span style={{ display: "grid", justifyItems: "end", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: group.primaryColor, boxShadow: `0 0 10px ${group.primaryColor}77` }} /><span style={{ color: group.status === "active" ? theme.primary : theme.textSoft, fontSize: 7.3, fontWeight: 1000 }}>{group.status === "active" ? L("ACTIF", "ACTIVE", "ACTIVO") : L("ARCHIVÉ", "ARCHIVED", "ARCHIVADO")}</span></span>
        </button>;
      }) : <div style={{ ...card, padding: 20, textAlign: "center" }}><div style={{ color: theme.text, fontSize: 11, fontWeight: 1000 }}>{L("Aucune équipe pour le moment", "No teams yet", "Aún no hay equipos")}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9 }}>{L("Crée une première équipe, section ou groupe puis affecte les membres.", "Create a first team, section or group, then assign members.", "Crea un primer equipo, sección o grupo y asigna miembros.")}</div>{canManageStructure ? <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}><button type="button" style={{ ...button }} onClick={openLinkExisting}>{L("ASSOCIER UNE ÉQUIPE", "LINK A TEAM", "VINCULAR UN EQUIPO")}</button><button type="button" style={{ ...button, color: theme.primary }} onClick={startCreate}>{L("CRÉER LA PREMIÈRE ÉQUIPE", "CREATE FIRST TEAM", "CREAR PRIMER EQUIPO")}</button></div> : null}</div>}
    </div> : null}
  </div>;
}
