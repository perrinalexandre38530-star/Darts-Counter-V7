import React from "react";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { trackPublicShopRequest, type PublicShopRequestTracking } from "../organizations/organizationShopRequests";

/** Suivi public minimal : référence + courriel d'origine, aucun accès aux données personnelles. */
export default function OrganizationShopRequestTracking({ organizationId, initialReference = "" }: { organizationId: string; initialReference?: string }) {
  const { lang } = useLang();
  const L = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const [open, setOpen] = React.useState(false);
  const [reference, setReference] = React.useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams((window.location.hash.split("?")[1] || "").split("#")[0]).get("demande") || "";
  });
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<PublicShopRequestTracking | null>(null);
  React.useEffect(() => { setResult(null); setError(""); setEmail(""); }, [organizationId]);
  React.useEffect(() => {
    if (initialReference) { setReference(initialReference); setOpen(true); setResult(null); setError(""); }
  }, [initialReference]);
  React.useEffect(() => { if (reference) setOpen(true); }, []); // URL de suivi préremplie si présente
  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", minWidth: 0, borderRadius: 10, border: "1px solid #556678", background: "#0b1826", color: "#f2fcff", padding: "11px 12px", fontSize: 13 };
  const action: React.CSSProperties = { cursor: "pointer", background: "#183e3b", border: "1px solid #69d6bd", color: "#b3ffeb", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 850 };
  const statusNames: Record<PublicShopRequestTracking["status"], string> = {
    pending: L("En attente de validation", "Awaiting review", "Pendiente de revisión"),
    accepted: L("Acceptée par le club", "Accepted by the club", "Aceptada por el club"),
    ready: L("Prête au retrait", "Ready for collection", "Lista para recoger"),
    completed: L("Remise au client", "Handed over", "Entregada"),
    rejected: L("Refusée", "Declined", "Rechazada"),
    cancelled: L("Annulée", "Cancelled", "Cancelada"),
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const data = await trackPublicShopRequest(organizationId, reference, email);
      if (!data) setError(L("Aucune demande trouvée pour cette référence et cet e-mail.", "No request matches this reference and email.", "No hay una solicitud con esta referencia y correo."));
      else setResult(data);
    } catch (err: any) { setError(String(err?.message || L("Consultation impossible.", "Lookup failed.", "Consulta fallida."))); }
    finally { setBusy(false); }
  }
  return <section style={{ display: "grid", gap: 12, padding: 18, border: "1px solid #364c5b", borderRadius: 17, background: "#101d2c" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div>
        <strong style={{ fontSize: 15, color: "#a1f7db" }}>{L("SUIVRE MA DEMANDE", "TRACK MY REQUEST", "SEGUIR MI SOLICITUD")}</strong>
        <p style={{ fontSize: 12, color: "#b9cbd6", margin: "5px 0 0" }}>{L("Retrouve l'état de ta réservation sans compte.", "Check your reservation status without an account.", "Consulta el estado sin crear una cuenta.")}</p>
      </div>
      <button type="button" onClick={() => setOpen((current) => !current)} style={action} aria-expanded={open}>{open ? L("Fermer", "Close", "Cerrar") : L("Consulter", "Check status", "Consultar")}</button>
    </div>
    {open ? <form onSubmit={(event) => void submit(event)} style={{ display: "grid", gap: 11 }}>
      <label style={{ color: "#d7e4ec", fontSize: 12, display: "grid", gap: 5 }}>
        {L("Référence de la demande", "Request reference", "Referencia de solicitud")}
        <input style={field} required autoComplete="off" maxLength={36} value={reference} onChange={(event) => { setReference(event.target.value); setResult(null); }} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
      </label>
      <label style={{ color: "#d7e4ec", fontSize: 12, display: "grid", gap: 5 }}>
        {L("E-mail utilisé lors de la demande", "Email used for the request", "Correo usado en la solicitud")}
        <input style={field} required type="email" autoComplete="email" maxLength={180} value={email} onChange={(event) => { setEmail(event.target.value); setResult(null); }} />
      </label>
      <button type="submit" disabled={busy || !reference.trim() || !email.trim()} style={{ ...action, opacity: busy ? .6 : 1 }}>{busy ? L("Recherche…", "Checking…", "Consultando…") : L("VOIR LE STATUT", "VIEW STATUS", "VER ESTADO")}</button>
      {error ? <div role="alert" style={{ color: "#ffb9ba", fontSize: 12 }}>{error}</div> : null}
      {result ? <div role="status" style={{ padding: 12, background: "#162f31", border: "1px solid #5cbea8", borderRadius: 11, display: "grid", gap: 6 }}>
        <strong style={{ color: "#a7ffe3", fontSize: 14 }}>{statusNames[result.status]}</strong>
        <span style={{ color: "#e5f1f5", fontSize: 12 }}>{result.itemTitle} × {result.quantity}</span>
        <span style={{ color: "#aebec7", fontSize: 11 }}>{L("Actualisé le", "Last updated", "Actualizada el")} {new Date(result.updatedAt).toLocaleString(lang === "en" ? "en-GB" : lang === "es" ? "es-ES" : "fr-FR")}</span>
        <small style={{ color: "#adbec8" }}>{L("Seul le club peut valider ou modifier cette réservation.", "Only the club can confirm or change this request.", "Solo el club puede confirmar o modificar la solicitud.")}</small>
      </div> : null}
    </form> : null}
  </section>;
}
