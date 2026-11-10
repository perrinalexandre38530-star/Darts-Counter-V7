import React from "react";
import OrganizationShopNotificationsPanel from "./OrganizationShopNotificationsPanel";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import type { OrganizationRecord } from "../organizations/organizationService";
import { publicShopUrl } from "../organizations/organizationPublicShop";
import {
  anonymizeShopRequest, listOrganizationShopRequests, listShopRequestEvents,
  setOrganizationShopRequestStatus, setShopRequestInternalNote,
  type ShopRequest, type ShopRequestEvent, type ShopRequestStatus,
} from "../organizations/organizationShopRequests";

type Filter = "active" | ShopRequestStatus | "all";
const ACTIVE: ShopRequestStatus[] = ["pending", "accepted", "ready"];
const TERMINAL: ShopRequestStatus[] = ["completed", "rejected", "cancelled"];

function csvCell(value: unknown): string {
  let str = String(value ?? "").replace(/\r\n?/g, "\n");
  // Neutralise les formules dans les tableurs (CSV injection) et échappe les guillemets.
  if (/^[\s\uFEFF]*[=+@\-\t]/.test(str)) str = "'" + str;
  return `"${str.replace(/"/g, '""')}"`;
}
function downloadCsv(requests: ShopRequest[]): void {
  const headers = ["Référence", "Date", "Statut", "Article", "Qté", "Nom", "Email", "Téléphone", "Taille", "Nom personnalisé", "Numéro personnalisé", "Montant unitaire", "Devise", "Notes client", "Note interne"];
  const body = requests.map((r) => [r.id, r.createdAt, r.status, r.itemTitle, r.quantity, r.name, r.email,
    r.phone, r.size, r.personalizedName, r.personalizedNumber, r.unitPrice, r.currency, r.notes, r.internalNote]);
  const content = "\uFEFF" + [headers, ...body].map((row) => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `club-boutique-demandes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function OrganizationShopRequestsPanel({ organization, userId }: { organization: OrganizationRecord; userId: string | null }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const [requests, setRequests] = React.useState<ShopRequest[]>([]);
  const [filter, setFilter] = React.useState<Filter>("active");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<"recent" | "oldest">("recent");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [expandedId, setExpandedId] = React.useState("");
  const [noteDraft, setNoteDraft] = React.useState("");
  const [events, setEvents] = React.useState<ShopRequestEvent[]>([]);
  const [historyError, setHistoryError] = React.useState("");
  const activeHistoryRequestId = React.useRef("");
  const card: React.CSSProperties = { padding: 13, border: `1px solid ${theme.borderSoft}`, background: theme.cardBackground || theme.card, borderRadius: 15 };
  const btn: React.CSSProperties = { background: `${theme.primary}15`, color: theme.primary, border: `1px solid ${theme.primary}66`, borderRadius: 10, padding: "9px 11px", fontSize: 12, fontWeight: 800, cursor: "pointer" };
  const field: React.CSSProperties = { borderRadius: 9, border: `1px solid ${theme.borderSoft}`, color: theme.text, background: theme.cardBackground || theme.card, padding: "10px 11px", fontSize: 12, minHeight: 39, minWidth: 0, maxWidth: "100%" };
  const reload = React.useCallback(async () => {
    setLoading(true); setError("");
    try { setRequests(await listOrganizationShopRequests(userId, organization.id)); }
    catch (e: any) { setError(String(e?.message || "Chargement impossible.")); }
    finally { setLoading(false); }
  }, [userId, organization.id]);
  React.useEffect(() => { if (open) void reload(); }, [open, reload]);
  React.useEffect(() => {
    setExpandedId(""); setNoteDraft(""); setEvents([]);
  }, [organization.id]);

  const statusLabel = (status: ShopRequestStatus) => ({
    pending: L("À traiter", "Pending", "Pendiente"), accepted: L("Acceptée", "Accepted", "Aceptada"),
    ready: L("Prête", "Ready", "Lista"), completed: L("Remise", "Handed over", "Entregada"),
    rejected: L("Refusée", "Rejected", "Rechazada"), cancelled: L("Annulée", "Cancelled", "Cancelada"),
  })[status];
  const choices = (r: ShopRequest): Array<{ status: ShopRequestStatus; label: string }> => r.status === "pending" ? [
    { status: "accepted", label: L("Accepter", "Accept", "Aceptar") },
    { status: "rejected", label: L("Refuser", "Reject", "Rechazar") },
  ] : r.status === "accepted" ? [
    { status: "ready", label: L("Prête au retrait", "Ready for collection", "Lista para recoger") },
    { status: "completed", label: L("Remise au client", "Handed over", "Entregada") },
    { status: "cancelled", label: L("Annuler", "Cancel", "Cancelar") },
  ] : r.status === "ready" ? [
    { status: "completed", label: L("Remise au client", "Handed over", "Entregada") },
    { status: "cancelled", label: L("Annuler", "Cancel", "Cancelar") },
  ] : [];

  const act = async (req: ShopRequest, status: ShopRequestStatus) => {
    if (busy) return;
    if ((status === "cancelled" || status === "rejected") && !window.confirm(L(
      "Confirmer cette opération ? Une annulation d'article accepté restituera son stock.",
      "Confirm this action? Cancelling an accepted item will restore allocated stock.",
      "¿Confirmar esta acción? La cancelación devolverá el stock asignado.",
    ))) return;
    setBusy(req.id); setError(""); setNotice("");
    try {
      await setOrganizationShopRequestStatus(userId, req.id, status);
      await reload();
      if (expandedId === req.id) setEvents(await listShopRequestEvents(userId, req.id));
      setNotice(L("Demande mise à jour.", "Request updated.", "Solicitud actualizada."));
    } catch (e: any) { setError(String(e?.message || "Modification impossible.")); }
    finally { setBusy(""); }
  };
  const openDetails = async (r: ShopRequest) => {
    if (expandedId === r.id) { activeHistoryRequestId.current = ""; setExpandedId(""); return; }
    activeHistoryRequestId.current = r.id;
    setExpandedId(r.id); setNoteDraft(r.internalNote); setEvents([]); setHistoryError("");
    try {
      const history = await listShopRequestEvents(userId, r.id);
      if (activeHistoryRequestId.current === r.id) setEvents(history);
    } catch (e: any) {
      if (activeHistoryRequestId.current === r.id) setHistoryError(String(e?.message || "Historique indisponible."));
    }
  };
  const saveNote = async (r: ShopRequest) => {
    if (busy) return;
    setBusy(r.id); setError(""); setNotice("");
    try {
      await setShopRequestInternalNote(userId, r.id, noteDraft);
      await reload();
      setNotice(L("Note interne enregistrée.", "Internal note saved.", "Nota interna guardada."));
    } catch (e: any) { setError(String(e?.message || "Sauvegarde impossible.")); }
    finally { setBusy(""); }
  };
  const anonymize = async (r: ShopRequest) => {
    if (busy || !window.confirm(L(
      "Anonymiser définitivement les coordonnées de cette demande clôturée ? Cette action est irréversible.",
      "Permanently anonymize contact information for this closed request? This cannot be undone.",
      "¿Anonimizar definitivamente los datos de esta solicitud cerrada? No se puede deshacer.",
    ))) return;
    setBusy(r.id); setError(""); setNotice("");
    try {
      await anonymizeShopRequest(userId, r.id);
      await reload(); activeHistoryRequestId.current = ""; setExpandedId("");
      setNotice(L("Coordonnées anonymisées.", "Contact data anonymized.", "Datos anonimizados."));
    } catch (e: any) { setError(String(e?.message || "Anonymisation impossible.")); }
    finally { setBusy(""); }
  };

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    ready: requests.filter((r) => r.status === "ready").length,
    total: requests.length,
  };
  const normalized = search.trim().toLocaleLowerCase();
  const shown = requests.filter((r) => {
    if (filter !== "all" && (filter === "active" ? !ACTIVE.includes(r.status) : r.status !== filter)) return false;
    if (!normalized) return true;
    return [r.itemTitle, r.name, r.email, r.id, r.personalizedName, r.phone]
      .some((v) => v.toLocaleLowerCase().includes(normalized));
  }).sort((a, b) => sort === "recent"
    ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt));
  const canAnonymize = ["owner", "admin"].includes(organization.role);
  const olderThan90Days = (r: ShopRequest) => new Date(r.updatedAt).getTime() < Date.now() - 90 * 86400000;
  const locale = lang === "en" ? "en-GB" : lang === "es" ? "es-ES" : "fr-FR";
  const money = (r: ShopRequest) => r.unitPrice == null ? "" : `${(r.unitPrice * r.quantity).toFixed(2)} ${r.currency}`;

  return <section style={{ ...card, display: "grid", gap: 11 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div>
        <strong style={{ color: theme.primary, fontSize: 14 }}>{L("COMMANDES & RÉSERVATIONS", "ORDERS & RESERVATIONS", "PEDIDOS Y RESERVAS")}</strong>
        <div style={{ color: theme.textSoft, fontSize: 11, marginTop: 3 }}>{L("Demandes à traiter, préparation, retrait et historique. Aucun paiement dans l'application.", "Review requests, prepare, hand over and view history. No in-app payment.", "Gestionar solicitudes, preparación, entrega e historial. Sin pagos en la app.")}</div>
      </div>
      <button type="button" style={btn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? L("Masquer", "Hide", "Ocultar") : L("Gérer", "Manage", "Gestionar")}</button>
    </div>
    <OrganizationShopNotificationsPanel organizationId={organization.id} userId={userId} onSelectRequest={(requestId) => {
      setFilter("all"); setSearch(requestId); setOpen(true);
    }} />
    {open ? <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 7 }}>
        {([{ key: "pending", count: stats.pending }, { key: "accepted", count: stats.accepted }, { key: "ready", count: stats.ready }, { key: "all", count: stats.total }] as const).map(({ key, count }) => <button type="button" key={key}
          onClick={() => setFilter(key)} style={{ ...btn, borderColor: filter === key ? theme.primary : theme.borderSoft, textAlign: "left", display: "grid", gap: 3 }}>
          <strong style={{ fontSize: 21, fontVariantNumeric: "tabular-nums" }}>{count}</strong>
          <span>{key === "all" ? L("Total", "Total", "Total") : statusLabel(key)}</span>
        </button>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <input aria-label={L("Rechercher une demande", "Search requests", "Buscar solicitudes")} style={{ ...field, flex: "1 1 170px" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L("Nom, article, e-mail, référence…", "Name, item, email, reference…", "Nombre, artículo, correo, referencia…")} />
        <select style={field} aria-label={L("Filtrer par statut", "Filter by status", "Filtrar estado")} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="active">{L("En cours", "Current", "En curso")}</option>
          <option value="all">{L("Toutes", "All", "Todas")}</option>
          {(["pending", "accepted", "ready", "completed", "rejected", "cancelled"] as ShopRequestStatus[]).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select style={field} aria-label={L("Ordre", "Sort", "Orden")} value={sort} onChange={(e) => setSort(e.target.value as "recent" | "oldest")}>
          <option value="recent">{L("Plus récentes", "Newest", "Más recientes")}</option>
          <option value="oldest">{L("Plus anciennes", "Oldest", "Más antiguas")}</option>
        </select>
        <button type="button" style={btn} onClick={() => void reload()} disabled={loading || !!busy}>{L("Actualiser", "Refresh", "Actualizar")}</button>
        <button type="button" style={btn} onClick={() => downloadCsv(shown)} disabled={!shown.length || loading} title={L("Contient les coordonnées clients : conserver le fichier de manière sécurisée.", "Contains customer contact details: store securely.", "Contiene datos personales: guardar de forma segura.")}>{L("Exporter CSV", "Export CSV", "Exportar CSV")}</button>
      </div>
      <small style={{ color: theme.textSoft }}>{L("Affichage des 300 dernières demandes maximum. Le CSV contient les coordonnées des clients : usage interne uniquement.", "Showing up to 300 latest requests. CSV contains customer contact data: internal use only.", "Máximo 300 solicitudes recientes. CSV con datos personales: uso interno.")}</small>
      {loading ? <span style={{ fontSize: 12, color: theme.textSoft }}>{L("Chargement…", "Loading…", "Cargando…")}</span> : null}
      {error ? <div role="alert" style={{ color: "#ffaaaa", fontSize: 12 }}>{error}</div> : null}
      {notice ? <div role="status" style={{ color: theme.primary, fontSize: 12 }}>{notice}</div> : null}
      {!loading && !shown.length ? <div style={{ color: theme.textSoft, fontSize: 12 }}>{L("Aucune demande pour ce filtre.", "No requests match these filters.", "No hay solicitudes con este filtro.")}</div> : null}
      {shown.map((r) => <article key={r.id} style={{ ...card, background: "rgba(0,0,0,.12)", display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <strong style={{ color: theme.text, fontSize: 13 }}>{r.itemTitle} × {r.quantity}</strong>
          <span style={{ color: r.status === "pending" ? "#f8d895" : theme.primary, fontSize: 11, fontWeight: 900 }}>{statusLabel(r.status)}</span>
        </div>
        <div style={{ fontSize: 12, color: theme.text, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <strong>{r.name}</strong>
          {!r.email.endsWith("@example.invalid") ? <a style={{ color: theme.primary }} href={`mailto:${r.email}?subject=${encodeURIComponent(`${L("Votre demande au club", "Your club request", "Solicitud al club")} - ${r.itemTitle}`)}`}>{r.email}</a> : null}
          {r.phone ? <a href={`tel:${r.phone.replace(/[^0-9+]/g, "")}`} style={{ color: theme.primary }}>{r.phone}</a> : null}
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", color: theme.textSoft, fontSize: 11 }}>
          <span>{new Date(r.createdAt).toLocaleString(locale)}</span>
          {money(r) ? <span>{money(r)} · {L("indicatif", "indicative", "orientativo")}</span> : null}
          {r.status === "pending" && Date.now() - new Date(r.createdAt).getTime() > 48 * 3600000 ? <strong style={{ color: "#f8d895" }}>{L("En attente +48 h", "Pending >48h", "Pendiente >48h")}</strong> : null}
        </div>
        {r.size || r.personalizedName || r.personalizedNumber ? <div style={{ fontSize: 11, color: theme.textSoft }}>
          {r.size ? `${L("Taille", "Size", "Talla")} : ${r.size}  ` : ""}
          {r.personalizedName ? `${L("Nom", "Name", "Nombre")} : ${r.personalizedName}  ` : ""}
          {r.personalizedNumber ? `#${r.personalizedNumber}` : ""}
        </div> : null}
        {choices(r).length ? <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {choices(r).map((choice) => <button type="button" key={choice.status} disabled={!!busy || loading} style={{ ...btn, opacity: busy ? .6 : 1 }} onClick={() => void act(r, choice.status)}>{choice.label}</button>)}
        </div> : null}
        <div><button type="button" style={{ ...btn, fontSize: 11 }} disabled={!!busy} aria-expanded={expandedId === r.id} onClick={() => void openDetails(r)}>{expandedId === r.id ? L("Fermer les détails", "Close details", "Cerrar detalles") : L("Notes & historique", "Notes & history", "Notas e historial")}</button></div>
        {expandedId === r.id ? <div style={{ display: "grid", gap: 9, borderTop: `1px solid ${theme.borderSoft}`, paddingTop: 11 }}>
          <small style={{ color: theme.textSoft, overflowWrap: "anywhere" }}>{L("Référence", "Reference", "Referencia")} : {r.id}</small>
          <div><button type="button" style={btn} onClick={() => {
            const base = publicShopUrl(organization.id);
            if (!base || !navigator.clipboard) { setError(L("Copie non disponible sur cet appareil.", "Clipboard unavailable on this device.", "No se puede copiar en este dispositivo.")); return; }
            void navigator.clipboard.writeText(`${base}?demande=${encodeURIComponent(r.id)}`)
              .then(() => setNotice(L("Lien de suivi copié. Le client devra saisir son e-mail.", "Tracking link copied. The customer must provide their email.", "Enlace copiado. El cliente debe indicar su correo.")))
              .catch(() => setError(L("Copie impossible.", "Could not copy link.", "No se pudo copiar.")));
          }}>{L("Copier le lien de suivi client", "Copy customer tracking link", "Copiar enlace de seguimiento")}</button></div>
          {r.notes ? <p style={{ margin: 0, color: theme.textSoft, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12 }}>{L("Message du client", "Customer note", "Nota del cliente")} : {r.notes}</p> : null}
          <label style={{ display: "grid", gap: 5, color: theme.textSoft, fontSize: 12 }}>
            {L("Note interne (visible uniquement des responsables)", "Internal note (staff only)", "Nota interna (solo responsables)")}
            <textarea style={{ ...field, minHeight: 78, resize: "vertical", width: "100%", boxSizing: "border-box" }} maxLength={1000} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
          </label>
          <div><button type="button" style={btn} disabled={!!busy || noteDraft === r.internalNote} onClick={() => void saveNote(r)}>{L("Enregistrer la note", "Save note", "Guardar nota")}</button></div>
          <strong style={{ fontSize: 12, color: theme.text }}>{L("Historique des statuts", "Status history", "Historial de estados")}</strong>
          {historyError ? <small role="alert" style={{ color: "#ffaaaa" }}>{historyError}</small> : null}
          {!events.length && !historyError ? <small style={{ color: theme.textSoft }}>{L("Aucune transition enregistrée depuis V24.", "No status changes recorded since V24.", "Sin cambios registrados desde V24.")}</small> : null}
          {events.map((event) => <div key={event.id} style={{ fontSize: 11, color: theme.textSoft }}>
            {new Date(event.createdAt).toLocaleString(locale)} · {statusLabel(event.oldStatus)} → {statusLabel(event.newStatus)}
          </div>)}
          {canAnonymize && TERMINAL.includes(r.status) && olderThan90Days(r) && !r.email.endsWith("@example.invalid") ? <div>
            <button type="button" style={{ ...btn, color: "#ffb4b4", borderColor: "#a64f4f" }} disabled={!!busy} onClick={() => void anonymize(r)}>{L("Anonymiser les coordonnées", "Anonymize contact data", "Anonimizar datos")}</button>
            <small style={{ display: "block", color: theme.textSoft, marginTop: 5 }}>{L("Uniquement pour les demandes clôturées de plus de 90 jours ; opération irréversible.", "Only closed requests older than 90 days; irreversible.", "Solo solicitudes cerradas con más de 90 días; irreversible.")}</small>
          </div> : null}
        </div> : null}
      </article>)}
    </> : null}
  </section>;
}
