import React from "react";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import type { PublicShopProduct } from "../organizations/organizationPublicShop";
import { submitPublicShopRequest } from "../organizations/organizationShopRequests";

export default function OrganizationPublicShopRequestForm({ organizationId, product }: { organizationId: string; product: PublicShopProduct }) {
  const { lang } = useLang();
  const L = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [size, setSize] = React.useState("");
  const [personalizedName, setPersonalizedName] = React.useState("");
  const [personalizedNumber, setPersonalizedNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const canCustomize = product.category === "official_kit" || product.category === "clothing";
  const maxQty = product.availability === "available" && product.stockQuantity != null ? Math.min(10, product.stockQuantity) : 10;
  const input: React.CSSProperties = { boxSizing: "border-box", minWidth: 0, width: "100%", minHeight: 40, background: "#0b1927", color: "#effbfb", border: "1px solid #546576", borderRadius: 9, padding: "10px 11px", fontSize: 13 };
  const label: React.CSSProperties = { display: "grid", gap: 5, fontSize: 12, color: "#ccdce7" };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !consent) return;
    setBusy(true); setError("");
    try {
      const ref = await submitPublicShopRequest({ organizationId, itemId: product.id, name, email, phone,
        quantity, size: canCustomize ? size : "", personalizedName: canCustomize ? personalizedName : "",
        personalizedNumber: canCustomize ? personalizedNumber : "", notes });
      setReference(ref);
    } catch (e: any) { setError(String(e?.message || L("Échec de l'envoi.", "Request failed.", "Solicitud fallida."))); }
    finally { setBusy(false); }
  };
  if (reference) return <section role="status" style={{ display: "grid", gap: 9, padding: 12, border: "1px solid #5ebfa7", borderRadius: 12, background: "#0b2b29" }}>
    <strong style={{ color: "#9effdd" }}>{L("Demande transmise au club", "Request sent to the club", "Solicitud enviada al club")}</strong>
    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{L("Le responsable doit encore l'accepter. Aucun paiement n'a été effectué et l'article n'est pas encore réservé.", "The club must still approve it. No payment has been taken and the item is not reserved yet.", "El club debe aprobarla. No se ha realizado ningún pago ni reserva confirmada.")}</p>
    <small style={{ color: "#d0e5e1", overflowWrap: "anywhere" }}>{L("Référence", "Reference", "Referencia")} : {reference}</small>
  </section>;
  return <form onSubmit={(e) => void submit(e)} style={{ borderTop: "1px solid #455767", paddingTop: 16, display: "grid", gap: 11 }}>
    <strong style={{ color: "#9affdf", fontSize: 14 }}>{canCustomize ? L("DEMANDER UN ARTICLE / MAILLOT PERSONNALISÉ", "REQUEST AN ITEM / CUSTOM JERSEY", "SOLICITAR UNA PRENDA PERSONALIZADA") : L("DEMANDER UNE RÉSERVATION", "REQUEST A RESERVATION", "SOLICITAR UNA RESERVA")}</strong>
    <p style={{ margin: 0, color: "#b4c8d5", fontSize: 11, lineHeight: 1.5 }}>{L("Demande sans engagement, à valider par le club. Paiement et retrait à convenir directement avec le responsable.", "Non-binding request, subject to club approval. Arrange payment and collection with the club.", "Solicitud sujeta a confirmación. Pago y entrega a acordar con el club.")}</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
      <label style={label}>{L("Nom et prénom", "Full name", "Nombre completo")}
        <input required style={input} maxLength={100} minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label style={label}>{L("E-mail", "Email", "Correo electrónico")}
        <input required style={input} type="email" maxLength={180} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label style={label}>{L("Téléphone (facultatif)", "Phone (optional)", "Teléfono (opcional)")}
        <input style={input} type="tel" maxLength={45} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <label style={label}>{L("Quantité", "Quantity", "Cantidad")}
        <input required style={input} type="number" min={1} max={maxQty} step={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}/></label>
    </div>
    {canCustomize ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 9 }}>
      <label style={label}>{L("Taille souhaitée", "Size", "Talla")}
        <input style={input} maxLength={40} value={size} placeholder="XS / S / M / L / XL" onChange={(e) => setSize(e.target.value)}/></label>
      <label style={label}>{L("Nom à imprimer (optionnel)", "Printed name (optional)", "Nombre impreso (opcional)")}
        <input style={input} maxLength={50} value={personalizedName} onChange={(e) => setPersonalizedName(e.target.value)}/></label>
      <label style={label}>{L("Numéro (optionnel)", "Number (optional)", "Número (opcional)")}
        <input style={input} maxLength={12} value={personalizedNumber} onChange={(e) => setPersonalizedNumber(e.target.value)}/></label>
    </div> : null}
    <label style={label}>{L("Précisions (optionnel)", "Notes (optional)", "Notas (opcional)")}
      <textarea style={{ ...input, minHeight: 70 }} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)}/></label>
    <label style={{ display: "flex", gap: 8, alignItems: "start", color: "#c9dce4", fontSize: 11, lineHeight: 1.45 }}>
      <input type="checkbox" checked={consent} required onChange={(e) => setConsent(e.target.checked)} />
      {L("J'accepte que mes coordonnées soient transmises au club uniquement pour traiter cette demande.", "I agree to share my contact details with the club to process this request.", "Acepto enviar mis datos de contacto al club para esta solicitud.")}
    </label>
    {error ? <div role="alert" style={{ color: "#ffbaba", fontSize: 12 }}>{error}</div> : null}
    <button type="submit" disabled={busy || !consent || maxQty < 1} style={{ border: "1px solid #62d9bd", borderRadius: 10, padding: "12px 16px", color: "#05201b", background: "#9effdd", fontWeight: 900, cursor: "pointer", opacity: busy ? .55 : 1 }}>
      {busy ? L("Envoi en cours…", "Sending…", "Enviando…") : L("ENVOYER MA DEMANDE", "SEND REQUEST", "ENVIAR SOLICITUD")}
    </button>
  </form>;
}
