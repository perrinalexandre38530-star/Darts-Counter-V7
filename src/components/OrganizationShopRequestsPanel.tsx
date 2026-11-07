import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import type { OrganizationRecord } from "../organizations/organizationService";
import { listOrganizationShopRequests, setOrganizationShopRequestStatus, type ShopRequest, type ShopRequestStatus } from "../organizations/organizationShopRequests";

type View = "active" | "all";
export default function OrganizationShopRequestsPanel({ organization, userId }: { organization: OrganizationRecord; userId: string | null }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const [requests, setRequests] = React.useState<ShopRequest[]>([]);
  const [view, setView] = React.useState<View>("active");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const card: React.CSSProperties = { padding: 13, border: `1px solid ${theme.borderSoft}`, background: theme.cardBackground || theme.card, borderRadius: 15 };
  const btn: React.CSSProperties = { background: `${theme.primary}15`, color: theme.primary, border: `1px solid ${theme.primary}66`, borderRadius: 10, padding: "9px 11px", fontSize: 11, fontWeight: 850, cursor: "pointer" };
  const reload = React.useCallback(async () => {
    setLoading(true); setError("");
    try { setRequests(await listOrganizationShopRequests(userId, organization.id)); }
    catch (e: any) { setError(String(e?.message || "Chargement impossible.")); }
    finally { setLoading(false); }
  }, [userId, organization.id]);
  React.useEffect(() => { if (open) void reload(); }, [open, reload]);
  const act = async (req: ShopRequest, status: ShopRequestStatus) => {
    if (busy) return;
    if (status === "cancelled" && !window.confirm(L("Annuler la demande et restituer le stock réservé ?", "Cancel this request and restore its allocated stock?", "¿Cancelar y devolver existencias?"))) return;
    setBusy(req.id); setError(""); setNotice("");
    try {
      await setOrganizationShopRequestStatus(userId, req.id, status);
      await reload();
      setNotice(L("Demande mise à jour.", "Request updated.", "Solicitud actualizada."));
    } catch (e: any) { setError(String(e?.message || "Modification impossible.")); }
    finally { setBusy(""); }
  };
  const activeStatuses = ["pending", "accepted", "ready"];
  const shown = view === "active" ? requests.filter((r) => activeStatuses.includes(r.status)) : requests;
  const statusLabel = (status: ShopRequestStatus) => ({
    pending: L("À traiter", "Pending", "Pendiente"), accepted: L("Acceptée", "Accepted", "Aceptada"),
    ready: L("Prête", "Ready", "Lista"), completed: L("Terminée", "Completed", "Finalizada"),
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
  return <section style={{ ...card, display: "grid", gap: 11 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div>
        <strong style={{ color: theme.primary, fontSize: 14 }}>{L("DEMANDES & RÉSERVATIONS", "REQUESTS & RESERVATIONS", "SOLICITUDES Y RESERVAS")}</strong>
        <div style={{ color: theme.textSoft, fontSize: 11, marginTop: 3 }}>{L("À traiter, préparation, retrait — sans paiement dans l'application.", "Process requests, prepare and hand over — no payments in the app.", "Gestionar solicitudes y entregas — sin pagos en la app.")}</div>
      </div>
      <button type="button" style={btn} onClick={() => setOpen((x) => !x)}>{open ? L("Masquer", "Hide", "Ocultar") : L("Ouvrir la gestion", "Manage requests", "Gestionar")}</button>
    </div>
    {open ? <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={btn} onClick={() => void reload()} disabled={loading || !!busy}>{L("Actualiser", "Refresh", "Actualizar")}</button>
        <button type="button" style={btn} onClick={() => setView(view === "active" ? "all" : "active")}>{view === "active" ? L("Voir l'historique", "View history", "Ver historial") : L("Demandes en cours", "Current requests", "Solicitudes activas")}</button>
      </div>
      {loading ? <span style={{ fontSize: 11, color: theme.textSoft }}>{L("Chargement…", "Loading…", "Cargando…")}</span> : null}
      {error ? <span role="alert" style={{ color: "#ffaaaa", fontSize: 12 }}>{error}</span> : null}
      {notice ? <span role="status" style={{ color: theme.primary, fontSize: 12 }}>{notice}</span> : null}
      {!loading && !shown.length ? <div style={{ color: theme.textSoft, fontSize: 12 }}>{L("Aucune demande dans cette catégorie.", "No requests in this section.", "No hay solicitudes.")}</div> : null}
      {shown.map((r) => <article key={r.id} style={{ ...card, background: "rgba(0,0,0,.12)", display: "grid", gap: 7 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <strong style={{ color: theme.text, fontSize: 12 }}>{r.itemTitle} × {r.quantity}</strong>
          <span style={{ color: r.status === "pending" ? "#f8d895" : theme.primary, fontSize: 11, fontWeight: 900 }}>{statusLabel(r.status)}</span>
        </div>
        <div style={{ fontSize: 12, color: theme.text }}>{r.name} · <a style={{ color: theme.primary }} href={`mailto:${r.email}`}>{r.email}</a>{r.phone ? ` · ${r.phone}` : ""}</div>
        {r.size || r.personalizedName || r.personalizedNumber ? <div style={{ fontSize: 11, color: theme.textSoft }}>
          {r.size ? `${L("Taille", "Size", "Talla")} : ${r.size}  ` : ""}
          {r.personalizedName ? `${L("Nom", "Name", "Nombre")} : ${r.personalizedName}  ` : ""}
          {r.personalizedNumber ? `#${r.personalizedNumber}` : ""}
        </div> : null}
        {r.notes ? <div style={{ fontSize: 11, color: theme.textSoft, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.notes}</div> : null}
        <small style={{ color: theme.textSoft }}>{new Date(r.createdAt).toLocaleString(lang === "en" ? "en-GB" : "fr-FR")}</small>
        {choices(r).length ? <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {choices(r).map((choice) => <button type="button" key={choice.status} disabled={!!busy || loading} style={{ ...btn, opacity: busy ? .6 : 1 }} onClick={() => void act(r, choice.status)}>{choice.label}</button>)}
        </div> : null}
      </article>)}
    </> : null}
  </section>;
}
