import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  createOrganizationAnnouncement,
  deleteOrganizationAnnouncement,
  listOrganizationAnnouncements,
  listOrganizationGroups,
  updateOrganizationAnnouncement,
  type OrganizationAnnouncement,
  type OrganizationLocalGroup,
  type OrganizationRecord,
} from "../organizations/organizationService";

function toIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function fmt(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function OrganizationCommunicationPanel({ organization, userId }: { organization: OrganizationRecord; userId: string | null }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);

  const [announcements, setAnnouncements] = React.useState<OrganizationAnnouncement[]>([]);
  const [groups, setGroups] = React.useState<OrganizationLocalGroup[]>([]);
  const [filterGroupId, setFilterGroupId] = React.useState("");
  const [targetGroupId, setTargetGroupId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pinned, setPinned] = React.useState(false);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [action, setAction] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [cloudAvailable, setCloudAvailable] = React.useState(true);
  const [composerOpen, setComposerOpen] = React.useState(false);

  const canManageGlobal = ["owner", "admin", "manager"].includes(organization.role);
  const captainGroups = groups.filter((group) => group.status === "active" && group.captainUserId === userId);
  const canPublish = canManageGlobal || captainGroups.length > 0;
  const publishGroups = canManageGlobal ? groups.filter((group) => group.status === "active") : captainGroups;

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
  const primaryButton: React.CSSProperties = { ...button, border: `1px solid ${theme.primary}`, color: theme.primary, background: `${theme.primary}13` };

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [feed, groupResult] = await Promise.all([
        listOrganizationAnnouncements(userId, organization.id, filterGroupId || null),
        listOrganizationGroups(userId, organization.id),
      ]);
      setAnnouncements(feed.announcements);
      setGroups(groupResult.groups);
      setCloudAvailable(feed.cloudAvailable && groupResult.cloudAvailable);
    } catch (e: any) {
      setError(String(e?.message || L("Impossible de charger les annonces.", "Unable to load announcements.", "No se pueden cargar los anuncios.")));
    } finally {
      setLoading(false);
    }
  }, [filterGroupId, organization.id, userId, L]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  React.useEffect(() => {
    if (!canManageGlobal && targetGroupId && !captainGroups.some((group) => group.id === targetGroupId)) setTargetGroupId("");
  }, [canManageGlobal, captainGroups, targetGroupId]);

  const publish = async () => {
    if (!canPublish) return;
    if (title.trim().length < 2 || !body.trim()) {
      setError(L("Ajoute un titre et un message.", "Add a title and message.", "Añade un título y un mensaje."));
      return;
    }
    if (!canManageGlobal && !targetGroupId) {
      setError(L("Un capitaine publie uniquement vers son équipe.", "A captain can only publish to their team.", "Un capitán solo puede publicar para su equipo."));
      return;
    }
    setAction("publish"); setError(""); setNotice("");
    try {
      await createOrganizationAnnouncement(userId, organization.id, {
        groupId: targetGroupId || null,
        title,
        body,
        pinned,
        expiresAt: toIso(expiresAt),
      });
      setTitle(""); setBody(""); setPinned(false); setExpiresAt(""); setComposerOpen(false);
      if (!canManageGlobal && captainGroups.length === 1) setTargetGroupId(captainGroups[0].id);
      setNotice(L("Annonce publiée.", "Announcement published.", "Anuncio publicado."));
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || L("Publication impossible.", "Publication failed.", "No se pudo publicar.")));
    } finally { setAction(""); }
  };

  const togglePin = async (announcement: OrganizationAnnouncement) => {
    setAction(`pin:${announcement.id}`); setError("");
    try {
      await updateOrganizationAnnouncement(userId, announcement.id, {
        title: announcement.title,
        body: announcement.body,
        pinned: !announcement.pinned,
        expiresAt: announcement.expiresAt || null,
      });
      await refresh();
    } catch (e: any) { setError(String(e?.message || L("Modification impossible.", "Update failed.", "No se pudo actualizar."))); }
    finally { setAction(""); }
  };

  const remove = async (announcement: OrganizationAnnouncement) => {
    if (!window.confirm(L("Supprimer cette annonce ?", "Delete this announcement?", "¿Eliminar este anuncio?"))) return;
    setAction(`delete:${announcement.id}`); setError("");
    try {
      await deleteOrganizationAnnouncement(userId, announcement.id);
      await refresh();
    } catch (e: any) { setError(String(e?.message || L("Suppression impossible.", "Deletion failed.", "No se pudo eliminar."))); }
    finally { setAction(""); }
  };

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
        <div>
          <div style={{ color: theme.primary, fontSize: 8.2, fontWeight: 1000, letterSpacing: 1.05 }}>{L("COMMUNICATION", "COMMUNICATION", "COMUNICACIÓN")}</div>
          <div style={{ marginTop: 4, color: theme.text, fontSize: 16, fontWeight: 1000 }}>{organization.name}</div>
          <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.2, lineHeight: 1.45 }}>{L("Annonces courtes uniquement : aucun fichier ni média n'est stocké dans Supabase. Les futures pièces jointes passeront par R2 / stockage choisi.", "Short announcements only: no files or media are stored in Supabase. Future attachments will use R2 / selected storage.", "Solo anuncios breves: ningún archivo ni medio se guarda en Supabase. Los futuros adjuntos usarán R2 / el almacenamiento elegido.")}</div>
        </div>
        <span style={{ borderRadius: 999, border: `1px solid ${cloudAvailable ? theme.primary : theme.borderSoft}`, color: cloudAvailable ? theme.primary : theme.textSoft, padding: "5px 8px", fontSize: 7.7, fontWeight: 1000 }}>{cloudAvailable ? "SYNC" : "LOCAL"}</span>
      </div>
    </div>

    {canPublish && !composerOpen ? <button type="button" onClick={() => setComposerOpen(true)} style={{ ...primaryButton, width: "100%", minHeight: 44, fontSize: 10.2 }}>+ {L("PUBLIER UNE ANNONCE", "POST AN ANNOUNCEMENT", "PUBLICAR UN ANUNCIO")}</button> : null}

    {canPublish && composerOpen ? <div style={{ ...card, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: theme.text, fontSize: 10.5, fontWeight: 1000 }}>{L("PUBLIER UNE ANNONCE", "POST AN ANNOUNCEMENT", "PUBLICAR UN ANUNCIO")}</div><button type="button" onClick={() => setComposerOpen(false)} style={button}>✕</button></div>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr .7fr", gap: 8 }}>
        <input style={input} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder={L("Titre", "Title", "Título")} />
        <select style={input} value={targetGroupId} onChange={(e) => setTargetGroupId(e.target.value)}>
          {canManageGlobal ? <option value="">{L("Toute l'organisation", "Whole organization", "Toda la organización")}</option> : <option value="">{L("Choisir mon équipe", "Choose my team", "Elegir mi equipo")}</option>}
          {publishGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </div>
      <textarea style={{ ...input, minHeight: 92, resize: "vertical", fontFamily: "inherit" }} value={body} maxLength={1200} onChange={(e) => setBody(e.target.value)} placeholder={L("Information, convocation, changement d'horaire…", "Information, call-up, schedule change…", "Información, convocatoria, cambio de horario…")} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
        <div><div style={{ color: theme.textSoft, fontSize: 7.4, fontWeight: 950, marginBottom: 4 }}>{L("EXPIRATION (OPTIONNELLE)", "EXPIRY (OPTIONAL)", "CADUCIDAD (OPCIONAL)")}</div><input type="datetime-local" style={input} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
        <label style={{ ...button, display: "flex", alignItems: "center", gap: 6, minHeight: 41, boxSizing: "border-box" }}><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />{L("ÉPINGLER", "PIN", "FIJAR")}</label>
      </div>
      <button type="button" disabled={action === "publish"} onClick={() => void publish()} style={{ ...primaryButton, opacity: action === "publish" ? .55 : 1 }}>{action === "publish" ? L("PUBLICATION…", "POSTING…", "PUBLICANDO…") : L("PUBLIER", "POST", "PUBLICAR")}</button>
      <div style={{ color: theme.textSoft, fontSize: 7.8, lineHeight: 1.4 }}>{body.length}/1200 · {L("Les annonces expirées ne sont plus renvoyées dans le fil.", "Expired announcements are no longer returned in the feed.", "Los anuncios caducados dejan de aparecer en el feed.")}</div>
    </div> : null}

    <div style={{ ...card, padding: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
      <select style={input} value={filterGroupId} onChange={(e) => setFilterGroupId(e.target.value)}><option value="">{L("Tout le fil", "Full feed", "Todo el feed")}</option>{groups.filter((group) => group.status === "active").map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
      <button type="button" onClick={() => void refresh()} style={button}>{L("ACTUALISER", "REFRESH", "ACTUALIZAR")}</button>
    </div>

    {notice ? <div style={{ ...card, padding: 10, color: theme.primary, fontSize: 9.3 }}>{notice}</div> : null}
    {error ? <div style={{ ...card, padding: 10, borderColor: "rgba(255,90,90,.45)", color: "#ffaaaa", fontSize: 9.3 }}>{error}</div> : null}

    {loading ? <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10 }}>{L("Chargement…", "Loading…", "Cargando…")}</div> : announcements.length ? announcements.map((announcement) => {
      const canManageThis = canManageGlobal || (announcement.groupId && captainGroups.some((group) => group.id === announcement.groupId));
      return <article key={announcement.id} style={{ ...card, padding: 12, borderColor: announcement.pinned ? `${theme.primary}88` : theme.borderSoft }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {announcement.pinned ? <span style={{ color: theme.primary, fontSize: 8, fontWeight: 1000 }}>📌 {L("ÉPINGLÉ", "PINNED", "FIJADO")}</span> : null}
              {announcement.groupId ? <span style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, padding: "2px 6px", color: theme.textSoft, fontSize: 7.3, fontWeight: 900 }}>{announcement.groupName || L("Équipe", "Team", "Equipo")}</span> : <span style={{ borderRadius: 999, border: `1px solid ${theme.primary}55`, padding: "2px 6px", color: theme.primary, fontSize: 7.3, fontWeight: 900 }}>{L("TOUTE L'ORGANISATION", "WHOLE ORGANIZATION", "TODA LA ORGANIZACIÓN")}</span>}
            </div>
            <div style={{ marginTop: 6, color: theme.text, fontSize: 12, fontWeight: 1000 }}>{announcement.title}</div>
          </div>
          {canManageThis ? <div style={{ display: "flex", gap: 5 }}><button type="button" title={announcement.pinned ? L("Désépingler", "Unpin", "Desfijar") : L("Épingler", "Pin", "Fijar")} disabled={Boolean(action)} onClick={() => void togglePin(announcement)} style={{ ...button, minWidth: 34, padding: 6 }}>{announcement.pinned ? "↘" : "📌"}</button><button type="button" title={L("Supprimer", "Delete", "Eliminar")} disabled={Boolean(action)} onClick={() => void remove(announcement)} style={{ ...button, minWidth: 34, padding: 6, color: "#ff9a9a" }}>×</button></div> : null}
        </div>
        <div style={{ marginTop: 8, color: theme.textSoft, fontSize: 10.2, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{announcement.body}</div>
        <div style={{ marginTop: 9, display: "flex", gap: 8, justifyContent: "space-between", color: theme.textSoft, fontSize: 7.5 }}><span>{announcement.authorName} · {fmt(announcement.createdAt)}</span>{announcement.expiresAt ? <span>{L("Expire", "Expires", "Caduca")} {fmt(announcement.expiresAt)}</span> : null}</div>
      </article>;
    }) : <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10 }}>{L("Aucune annonce pour le moment.", "No announcements yet.", "Aún no hay anuncios.")}</div>}
  </div>;
}
