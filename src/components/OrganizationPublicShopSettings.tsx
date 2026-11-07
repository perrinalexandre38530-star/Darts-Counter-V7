import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { fileToCompressedImageDataUrl } from "../lib/teamImageStorage";
import { uploadOrganizationShopImage } from "../lib/organizationSupabaseMedia";
import type { OrganizationRecord } from "../organizations/organizationService";
import {
  EMPTY_PUBLIC_SHOP_SETTINGS, publicShopUrl, readPublicShopSettings,
  savePublicShopSettings, type PublicShopSettings,
} from "../organizations/organizationPublicShop";

export default function OrganizationPublicShopSettings({ organization, userId, logoUrl }: {
  organization: OrganizationRecord; userId: string | null; logoUrl?: string;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const isAdmin = organization.role === "owner" || organization.role === "admin";
  const [settings, setSettings] = React.useState<PublicShopSettings>({ ...EMPTY_PUBLIC_SHOP_SETTINGS });
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [localImage, setLocalImage] = React.useState("");
  const [savedPublished, setSavedPublished] = React.useState(false);
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 10,
    color: theme.text, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.23)", minHeight: 41, fontSize: 12 };
  const label: React.CSSProperties = { display: "grid", gap: 6, fontSize: 11, color: theme.textSoft, fontWeight: 750 };
  const action: React.CSSProperties = { borderRadius: 10, border: `1px solid ${theme.primary}77`, background: `${theme.primary}18`,
    color: theme.primary, padding: "10px 13px", fontSize: 11, fontWeight: 900, cursor: "pointer" };
  const link = publicShopUrl(organization.id);
  React.useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    void readPublicShopSettings(userId, organization.id).then((value) => {
      if (cancelled) return;
      setSettings(value); setSavedPublished(value.isPublished);
    }).catch((e: any) => { if (!cancelled) setError(String(e?.message || "Chargement impossible.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [organization.id, userId, isAdmin]);
  if (!isAdmin) return null;
  const chooseCover = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setError(L("Image invalide (15 Mo maximum).", "Invalid image (15 MB max).", "Imagen no válida (máx. 15 MB).")); return;
    }
    try {
      setLocalImage(await fileToCompressedImageDataUrl(file, { maxSize: 1440, quality: 0.81 }));
      setError("");
    } catch { setError(L("Image illisible.", "Could not read image.", "No se puede leer la imagen.")); }
  };
  const save = async () => {
    if (busy || loading) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const coverImageUrl = localImage ? await uploadOrganizationShopImage({ organizationId: organization.id, userId, dataUrl: localImage }) : settings.coverImageUrl;
      await savePublicShopSettings(userId, organization.id, { ...settings, coverImageUrl });
      setSettings({ ...settings, coverImageUrl }); setLocalImage(""); setSavedPublished(settings.isPublished);
      setNotice(L("Boutique publique enregistrée.", "Public shop saved.", "Tienda pública guardada."));
    } catch (e: any) { setError(String(e?.message || L("Enregistrement impossible.", "Save failed.", "Error al guardar."))); }
    finally { setBusy(false); }
  };
  const preview = localImage || settings.coverImageUrl || String(organization.profile?.coverUrl || "") || logoUrl;
  return <section style={{ background: theme.cardBackground || theme.card, border: `1px solid ${theme.borderSoft}`, borderRadius: 16, padding: 13, display: "grid", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
      <div><div style={{ color: theme.primary, fontWeight: 1000, fontSize: 13 }}>{L("BOUTIQUE PUBLIQUE DU CLUB", "PUBLIC CLUB SHOP", "TIENDA PÚBLICA DEL CLUB")}</div>
        <div style={{ fontSize: 10.5, color: theme.textSoft, marginTop: 4 }}>{L("Crée une vitrine partageable, sans compte ni paiement en ligne.", "Create a shareable storefront, with no login or online checkout.", "Crea un escaparate público sin inicio de sesión ni pago.")}</div></div>
      <button type="button" style={action} onClick={() => setOpen(!open)}>{open ? L("Fermer", "Close", "Cerrar") : L("Personnaliser", "Customize", "Personalizar")}</button>
    </div>
    {loading ? <small style={{ color: theme.textSoft }}>{L("Chargement…", "Loading…", "Cargando…")}</small> : null}
    {!loading && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 11, color: theme.textSoft }}>
      <span style={{ color: savedPublished ? "#8debba" : theme.textSoft, fontWeight: 950 }}>{savedPublished ? L("● EN LIGNE", "● LIVE", "● PUBLICADA") : L("○ NON PUBLIÉE", "○ NOT PUBLISHED", "○ NO PUBLICADA")}</span>
      {savedPublished && link ? <><button type="button" style={action} onClick={() => { if (!navigator.clipboard?.writeText) { setNotice(link); return; } void navigator.clipboard.writeText(link).then(() => setNotice(L("Lien copié.", "Link copied.", "Enlace copiado."))).catch(() => setNotice(link)); }}>{L("Copier le lien", "Copy link", "Copiar enlace")}</button>
        <a href={`#/club-shop/${organization.id}`} target="_blank" rel="noopener noreferrer" style={{ ...action, textDecoration: "none" }}>{L("Voir la boutique", "Open shop", "Ver tienda")}</a></> : null}
    </div>}
    {open && !loading ? <div style={{ display: "grid", gap: 10, borderTop: `1px solid ${theme.borderSoft}`, paddingTop: 12 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: theme.text, fontWeight: 850 }}>
        <input type="checkbox" checked={settings.isPublished} onChange={(e) => setSettings({ ...settings, isPublished: e.target.checked })} />
        {L("Publier la boutique pour tous (visiteurs compris)", "Publish this shop publicly (including visitors)", "Publicar para todos (incluidos visitantes)")}
      </label>
      <label style={label}>{L("Titre de couverture", "Shop headline", "Título de portada")}
        <input style={input} maxLength={100} placeholder={organization.name} value={settings.headline} onChange={(e) => setSettings({ ...settings, headline: e.target.value })}/></label>
      <label style={label}>{L("Présentation de la boutique", "Shop introduction", "Presentación de la tienda")}
        <textarea style={{ ...input, minHeight: 70, resize: "vertical" }} maxLength={380} value={settings.subtitle} onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}/></label>
      <label style={label}>{L("Photo de couverture (facultative)", "Cover photo (optional)", "Foto de portada (opcional)")}
        <input type="file" accept="image/*" style={input} onChange={(e) => { void chooseCover(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }} /></label>
      {preview ? <img src={preview} alt="" style={{ width: "100%", height: 134, objectFit: "cover", borderRadius: 11 }}/> : null}
      <label style={label}>{L("Ou URL HTTPS de couverture (vide = couverture du club)", "Or HTTPS cover URL (blank = club cover)", "O URL HTTPS de portada")}
        <input style={input} maxLength={1000} type="url" value={settings.coverImageUrl} onChange={(e) => { setSettings({ ...settings, coverImageUrl: e.target.value }); setLocalImage(""); }} placeholder="https://..." /></label>
      <div style={{ color: theme.textSoft, fontSize: 10.5, lineHeight: 1.5 }}>
        {L("Ces coordonnées seront PUBLIQUES si renseignées. Elles ne sont pas reprises automatiquement de la fiche privée du club.",
          "These contact details will be PUBLIC if entered. They are not copied from the private club profile.",
          "Los datos de contacto serán PÚBLICOS. No se copian del perfil privado.")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 9 }}>
        <label style={label}>{L("E-mail public (facultatif)", "Public email (optional)", "Correo público (opcional)")}
          <input style={input} type="email" maxLength={180} value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}/></label>
        <label style={label}>{L("Téléphone public (facultatif)", "Public phone (optional)", "Teléfono público (opcional)")}
          <input style={input} type="tel" maxLength={45} value={settings.contactPhone} onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}/></label>
      </div>
      <div style={{ fontSize: 10, color: theme.textSoft }}>{L("Seuls les articles PUBLIÉS apparaissent. L'administrateur peut désactiver la vitrine à tout moment.", "Only PUBLISHED items appear. Admins can disable the storefront at any time.", "Solo aparecen artículos PUBLICADOS.")}</div>
      <button type="button" style={{ ...action, justifySelf: "start", opacity: busy ? .65 : 1 }} disabled={busy} onClick={() => void save()}>{busy ? L("Enregistrement…", "Saving…", "Guardando…") : L("ENREGISTRER LA BOUTIQUE", "SAVE SHOP SETTINGS", "GUARDAR TIENDA")}</button>
    </div> : null}
    {error ? <div role="alert" style={{ color: "#ffaaaa", fontSize: 11, overflowWrap: "anywhere" }}>{error}</div> : null}
    {notice ? <div role="status" style={{ color: theme.primary, fontSize: 11, overflowWrap: "anywhere" }}>{notice}</div> : null}
  </section>;
}
