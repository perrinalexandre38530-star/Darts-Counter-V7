import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  listClubShopNotifications, markClubShopNotificationsRead,
  type ShopNotification, type ShopNotificationInbox,
} from "../organizations/organizationShopNotifications";

const EMPTY: ShopNotificationInbox = { items: [], unreadCount: 0, lastReadId: 0 };

/** Alertes persistantes en base, lecture indépendante par responsable et par club. */
export default function OrganizationShopNotificationsPanel({
  organizationId, userId, onSelectRequest,
}: {
  organizationId: string;
  userId: string | null;
  onSelectRequest: (requestId: string) => void;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const [inbox, setInbox] = React.useState<ShopNotificationInbox>(EMPTY);
  const [open, setOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [alertsEnabled, setAlertsEnabled] = React.useState(false);
  const alertsRef = React.useRef(false);
  const settingKey = `mss-shop-browser-alerts-v26:${userId || "none"}:${organizationId}`;
  const btn: React.CSSProperties = {
    cursor: "pointer", borderRadius: 10, fontWeight: 800, fontSize: 11,
    padding: "8px 10px", border: `1px solid ${theme.borderSoft}`,
    background: `${theme.primary}15`, color: theme.primary,
  };
  React.useEffect(() => {
    let value = false;
    try { value = window.localStorage.getItem(settingKey) === "1" && "Notification" in window && Notification.permission === "granted"; }
    catch { /* navigateur sans stockage local */ }
    alertsRef.current = value;
    setAlertsEnabled(value);
  }, [settingKey]);

  React.useEffect(() => {
    if (!userId || !organizationId) return;
    let active = true;
    let inFlight = false;
    let lastMaxId: number | null = null;
    setInbox(EMPTY); setError("");
    const refresh = async () => {
      if (!active || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const next = await listClubShopNotifications(userId, organizationId);
        if (!active) return;
        const newest = next.items[0];
        // Aucun pop-up lors du premier chargement (anciennes demandes).
        if (newest && lastMaxId !== null && newest.id > lastMaxId &&
            !newest.isRead && alertsRef.current && "Notification" in window && Notification.permission === "granted") {
          try {
            const title = newest.kind === "new_request" ? "Nouvelle demande de boutique" : "Boutique : statut mis à jour";
            const message = newest.kind === "new_request" ? newest.itemTitle : `${newest.itemTitle} · ${newest.status}`;
            const alert = new Notification(title, { body: message, tag: `mss-shop-${organizationId}` });
            alert.onclick = () => { window.focus(); setOpen(true); alert.close(); };
          } catch { /* permission ou API refusée */ }
        }
        lastMaxId = Math.max(lastMaxId || 0, newest?.id || 0);
        setInbox(next); setError("");
      } catch (err: any) {
        if (active) setError(String(err?.message || "Impossible de lire les notifications."));
      } finally { inFlight = false; }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 45000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [organizationId, userId]);

  const markAll = async () => {
    const latestId = inbox.items[0]?.id;
    if (!latestId || busy) return;
    setBusy(true); setError("");
    try {
      await markClubShopNotificationsRead(userId, organizationId, latestId);
      setInbox((previous) => ({ ...previous, unreadCount: 0,
        lastReadId: Math.max(previous.lastReadId, latestId),
        items: previous.items.map((item) => ({ ...item, isRead: true })) }));
    } catch (err: any) { setError(String(err?.message || "Lecture non enregistrée.")); }
    finally { setBusy(false); }
  };
  const enableBrowserAlerts = async () => {
    if (!("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      const enabled = permission === "granted";
      alertsRef.current = enabled;
      setAlertsEnabled(enabled);
      window.localStorage.setItem(settingKey, enabled ? "1" : "0");
      if (!enabled) setError(L("Le navigateur n'a pas autorisé les alertes.", "Browser notifications were not permitted.", "El navegador no ha permitido notificaciones."));
    } catch { setError(L("Alertes du navigateur indisponibles.", "Browser alerts unavailable.", "Alertas no disponibles.")); }
  };
  const disableBrowserAlerts = () => {
    alertsRef.current = false; setAlertsEnabled(false);
    try { window.localStorage.removeItem(settingKey); } catch { /* stockage indisponible */ }
  };
  const statusLabel = (status: ShopNotification["status"]): string => ({
    pending: L("À traiter", "Pending", "Pendiente"), accepted: L("Acceptée", "Accepted", "Aceptada"),
    ready: L("Prête", "Ready", "Lista"), completed: L("Remise", "Handed over", "Entregada"),
    rejected: L("Refusée", "Rejected", "Rechazada"), cancelled: L("Annulée", "Cancelled", "Cancelada"),
  })[status];
  const locale = lang === "en" ? "en-GB" : lang === "es" ? "es-ES" : "fr-FR";
  const visible = showAll ? inbox.items : inbox.items.slice(0, 8);

  return <section style={{ display: "grid", gap: 9, border: `1px solid ${theme.borderSoft}`, background: `${theme.primary}09`, borderRadius: 13, padding: 11 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
        <strong style={{ fontSize: 12, color: theme.primary }}>{L("NOTIFICATIONS BOUTIQUE", "SHOP NOTIFICATIONS", "AVISOS DE LA TIENDA")}</strong>
        {inbox.unreadCount > 0 && <span aria-label={L(`${inbox.unreadCount} notifications non lues`, `${inbox.unreadCount} unread notifications`, `${inbox.unreadCount} avisos sin leer`)} style={{ borderRadius: 100, background: "#b24b45", color: "white", fontWeight: 950, padding: "3px 7px", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{inbox.unreadCount > 99 ? "99+" : inbox.unreadCount}</span>}
      </div>
      <button type="button" style={btn} aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? L("Masquer", "Hide", "Ocultar") : L("Voir les alertes", "View alerts", "Ver avisos")}</button>
    </div>
    {error && <small role="alert" style={{ color: "#ffb1b1" }}>{error}</small>}
    {open && <div style={{ display: "grid", gap: 9 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
        <button type="button" style={btn} disabled={busy || inbox.unreadCount === 0} onClick={() => void markAll()}>{L("Tout marquer comme lu", "Mark all as read", "Marcar todo leído")}</button>
        {typeof window !== "undefined" && "Notification" in window && (alertsEnabled
          ? <button type="button" style={btn} onClick={disableBrowserAlerts}>{L("Désactiver les alertes navigateur", "Disable browser alerts", "Desactivar alertas")}</button>
          : <button type="button" style={btn} onClick={() => void enableBrowserAlerts()}>{L("Activer les alertes navigateur", "Enable browser alerts", "Activar alertas")}</button>)}
      </div>
      <small style={{ color: theme.textSoft, fontSize: 10 }}>{L("Synchronisation automatique toutes les 45 s quand la page est ouverte. Pas de notification push lorsque l'application est fermée.", "Automatically checks every 45s while this page is open. No push when the app is closed.", "Actualización cada 45 s con la página abierta. Sin push con la app cerrada.")}</small>
      {!inbox.items.length && !error && <small style={{ color: theme.textSoft }}>{L("Pas encore de notification.", "No notifications yet.", "Sin notificaciones todavía.")}</small>}
      {visible.map((item) => <button key={item.id} type="button" style={{ ...btn, textAlign: "left", display: "grid", gap: 4, background: item.isRead ? "rgba(0,0,0,.04)" : `${theme.primary}20`, color: theme.text, borderColor: item.isRead ? theme.borderSoft : theme.primary }} onClick={() => onSelectRequest(item.requestId)}>
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <strong>{item.kind === "new_request" ? L("Nouvelle demande", "New request", "Nueva solicitud") : `${L("Changement de statut", "Status update", "Cambio de estado")} · ${statusLabel(item.status)}`}</strong>
          <span style={{ color: theme.textSoft, fontSize: 10, fontWeight: 500 }}>{new Date(item.createdAt).toLocaleString(locale)}</span>
        </span>
        <span style={{ color: theme.textSoft, fontSize: 11, overflowWrap: "anywhere" }}>{item.itemTitle} · {L("Ouvrir la demande", "Open request", "Abrir solicitud")}</span>
      </button>)}
      {inbox.items.length > 8 && <button style={btn} type="button" onClick={() => setShowAll((v) => !v)}>{showAll ? L("Réduire", "Show less", "Ver menos") : L("Afficher les 60 dernières", "Show last 60", "Ver últimas 60")}</button>}
    </div>}
  </section>;
}
