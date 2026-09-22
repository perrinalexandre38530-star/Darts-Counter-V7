import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import OrganizationTypeIcon from "./OrganizationTypeIcon";
import {
  normalizeOrganizationProfile,
  organizationKindLabel,
  organizationPlanLabel,
  updateOrganizationIdentity,
  updateOrganizationProfile,
  type OrganizationKind,
  type OrganizationRecord,
} from "../organizations/organizationService";
import {
  captureUserMediaFallback,
  organizationCoverMediaKey,
  organizationLogoMediaKey,
  readImageFileAsDataUrl,
} from "../lib/userMediaFallback";
import { getStorageDestination, loadStoragePrefs } from "../lib/storagePlans";

type Props = {
  organization: OrganizationRecord;
  userId: string | null;
  logoUrl?: string;
  coverUrl?: string;
  onChanged?: () => void | Promise<void>;
};

type EditSection = "identity" | "contact" | "visuals";

const KINDS: OrganizationKind[] = ["club", "association", "company", "venue", "school", "local_authority", "organizer", "other"];

function normalizeWebsite(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export default function OrganizationProfilePanel({ organization, userId, logoUrl = "", coverUrl = "", onChanged }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const canManage = organization.role === "owner" || organization.role === "admin";
  const [editing, setEditing] = React.useState(false);
  const [editSection, setEditSection] = React.useState<EditSection>("identity");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [logoPreview, setLogoPreview] = React.useState("");
  const [coverPreview, setCoverPreview] = React.useState("");
  const [savedLogoUrl, setSavedLogoUrl] = React.useState(logoUrl);
  const [savedCoverUrl, setSavedCoverUrl] = React.useState(coverUrl);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const coverInputRef = React.useRef<HTMLInputElement | null>(null);
  const [form, setForm] = React.useState(() => ({
    name: organization.name,
    kind: organization.kind,
    city: organization.city,
    countryCode: organization.countryCode,
    description: organization.description,
    legalName: organization.profile.legalName,
    acronym: organization.profile.acronym,
    foundedYear: organization.profile.foundedYear,
    addressLine: organization.profile.addressLine,
    postalCode: organization.profile.postalCode,
    facilities: organization.profile.facilities,
    sports: organization.profile.sports.join(", "),
    memberEstimate: String(organization.profile.memberEstimate || ""),
    contactName: organization.profile.contactName,
    contactEmail: organization.profile.contactEmail,
    contactPhone: organization.profile.contactPhone,
    website: organization.profile.website,
  }));

  const resetForm = React.useCallback(() => {
    setForm({
      name: organization.name,
      kind: organization.kind,
      city: organization.city,
      countryCode: organization.countryCode,
      description: organization.description,
      legalName: organization.profile.legalName,
      acronym: organization.profile.acronym,
      foundedYear: organization.profile.foundedYear,
      addressLine: organization.profile.addressLine,
      postalCode: organization.profile.postalCode,
      facilities: organization.profile.facilities,
      sports: organization.profile.sports.join(", "),
      memberEstimate: String(organization.profile.memberEstimate || ""),
      contactName: organization.profile.contactName,
      contactEmail: organization.profile.contactEmail,
      contactPhone: organization.profile.contactPhone,
      website: organization.profile.website,
    });
  }, [organization]);

  React.useEffect(() => {
    if (!editing) resetForm();
  }, [editing, resetForm]);

  React.useEffect(() => { setSavedLogoUrl(logoUrl); }, [logoUrl]);
  React.useEffect(() => { setSavedCoverUrl(coverUrl); }, [coverUrl]);

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.cardBackground || theme.card,
    boxShadow: "0 14px 30px rgba(0,0,0,.34)",
  };
  const input: React.CSSProperties = {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,.24)",
    color: theme.text,
    padding: "10px 11px",
    boxSizing: "border-box",
    outline: "none",
    fontSize: 10.5,
  };
  const button: React.CSSProperties = {
    minHeight: 38,
    borderRadius: 12,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(255,255,255,.035)",
    color: theme.text,
    fontWeight: 900,
    padding: "8px 11px",
    cursor: "pointer",
  };
  const primary: React.CSSProperties = {
    ...button,
    borderColor: `${theme.primary}88`,
    background: `${theme.primary}12`,
    color: theme.primary,
  };
  const label: React.CSSProperties = { color: theme.textSoft, fontSize: 8.2, fontWeight: 900, margin: "1px 2px 5px", textTransform: "uppercase", letterSpacing: .55 };
  const mediaButton: React.CSSProperties = {
    minHeight: 32,
    borderRadius: 999,
    border: `1px solid ${theme.primary}66`,
    background: "rgba(3,8,16,.82)",
    color: theme.primary,
    fontSize: 8.4,
    fontWeight: 1000,
    padding: "6px 9px",
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  };

  function startEdit(section: EditSection = "identity") {
    if (!canManage) return;
    setError("");
    setNotice("");
    setEditSection(section);
    setEditing(true);
  }

  function cancelEdit() {
    if (busy) return;
    setLogoPreview("");
    setCoverPreview("");
    setError("");
    setEditing(false);
    resetForm();
  }

  async function pick(file: File | undefined, kind: "logo" | "cover") {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError(L("Sélectionne une image.", "Select an image.", "Selecciona una imagen."));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError(L("Image trop lourde : 15 Mo maximum.", "Image too large: 15 MB maximum.", "Imagen demasiado grande: 15 MB máximo."));
      return;
    }
    const dataUrl = await readImageFileAsDataUrl(file);
    if (!dataUrl) {
      setError(L("Impossible de lire cette image. Essaie un fichier PNG, JPG ou WebP.", "Unable to read this image. Try a PNG, JPG or WebP file.", "No se puede leer esta imagen. Prueba con PNG, JPG o WebP."));
      return;
    }
    if (kind === "logo") setLogoPreview(dataUrl);
    else setCoverPreview(dataUrl);
    setEditSection("visuals");
    setEditing(true);
  }

  async function save() {
    if (!canManage || busy) return;
    const cleanName = form.name.trim();
    if (cleanName.length < 2) {
      setError(L("Indique un nom d’organisation valide.", "Enter a valid organization name.", "Indica un nombre de organización válido."));
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const identity = await updateOrganizationIdentity(userId, organization.id, {
        name: cleanName,
        kind: form.kind,
        city: form.city,
        countryCode: form.countryCode,
        description: form.description,
      });
      const prefs = loadStoragePrefs();
      const mirrorR2 = prefs.selectedDestination === "cloud_r2";
      let logoKey = organization.profile.logoMediaKey;
      let coverKey = organization.profile.coverMediaKey;
      if (logoPreview) {
        const nextLogoKey = organizationLogoMediaKey(organization.id);
        try {
          const savedLogo = await captureUserMediaFallback(nextLogoKey, logoPreview, { kind: "club_logo", mirrorR2, updatedAt: Date.now() });
          if (!savedLogo) throw new Error("logo_capture_failed");
          logoKey = nextLogoKey;
          setSavedLogoUrl(savedLogo);
        } catch {
          throw new Error(L("Le logo n’a pas pu être enregistré. Réessaie avec une image PNG, JPG ou WebP.", "The logo could not be saved. Try again with a PNG, JPG or WebP image.", "No se pudo guardar el logotipo. Inténtalo de nuevo con PNG, JPG o WebP."));
        }
      }
      if (coverPreview) {
        const nextCoverKey = organizationCoverMediaKey(organization.id);
        try {
          const savedCover = await captureUserMediaFallback(nextCoverKey, coverPreview, { kind: "club_cover", mirrorR2, updatedAt: Date.now() });
          if (!savedCover) throw new Error("cover_capture_failed");
          coverKey = nextCoverKey;
          setSavedCoverUrl(savedCover);
        } catch {
          throw new Error(L("La photo de couverture n’a pas pu être enregistrée. Réessaie avec une image PNG, JPG ou WebP.", "The cover photo could not be saved. Try again with a PNG, JPG or WebP image.", "No se pudo guardar la foto de portada. Inténtalo de nuevo con PNG, JPG o WebP."));
        }
      }
      const profile = normalizeOrganizationProfile({
        ...organization.profile,
        legalName: form.legalName,
        acronym: form.acronym.toUpperCase(),
        foundedYear: form.foundedYear,
        addressLine: form.addressLine,
        postalCode: form.postalCode,
        facilities: form.facilities,
        sports: form.sports.split(",").map((value) => value.trim()).filter(Boolean),
        memberEstimate: Number(form.memberEstimate || 0),
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        website: normalizeWebsite(form.website),
        logoMediaKey: logoKey,
        coverMediaKey: coverKey,
        profileCompleted: true,
      });
      const profileResult = await updateOrganizationProfile(userId, organization.id, profile);
      setNotice([identity.warning, profileResult.warning, L("Fiche organisme mise à jour.", "Organization profile updated.", "Ficha de organización actualizada.")].filter(Boolean).join(" "));
      setEditing(false);
      setLogoPreview("");
      setCoverPreview("");
      await onChanged?.();
    } catch (errorValue: any) {
      setError(String(errorValue?.message || L("Mise à jour impossible.", "Unable to update.", "No se puede actualizar.")));
    } finally {
      setBusy(false);
    }
  }

  const p = organization.profile;
  const currentLogo = logoPreview || savedLogoUrl || logoUrl;
  const currentCover = coverPreview || savedCoverUrl || coverUrl;
  const rows: Array<[string, string]> = [
    [L("Type", "Type", "Tipo"), organizationKindLabel(organization.kind)],
    [L("Nom officiel", "Legal name", "Nombre oficial"), p.legalName || organization.name],
    [L("Sigle", "Acronym", "Sigla"), p.acronym || "—"],
    [L("Création", "Founded", "Creación"), p.foundedYear || "—"],
    [L("Adresse", "Address", "Dirección"), [p.addressLine, p.postalCode, organization.city, organization.countryCode].filter(Boolean).join(" · ") || "—"],
    [L("Lieu principal", "Main venue", "Lugar principal"), p.facilities || "—"],
    [L("Activités", "Activities", "Actividades"), p.sports.length ? p.sports.join(", ") : "—"],
    [L("Taille estimée", "Estimated size", "Tamaño estimado"), p.memberEstimate ? `~ ${p.memberEstimate}` : "—"],
    [L("Contact", "Contact", "Contacto"), [p.contactName, p.contactEmail, p.contactPhone].filter(Boolean).join(" · ") || "—"],
    [L("Site", "Website", "Sitio"), p.website || "—"],
    [L("Stockage médias", "Media storage", "Almacenamiento multimedia"), getStorageDestination(loadStoragePrefs().selectedDestination).shortLabel],
  ];

  const VisualHero = ({ editable }: { editable: boolean }) => (
    <div style={{ minHeight: 184, background: currentCover ? `url(${currentCover}) center/cover no-repeat` : `linear-gradient(135deg,${theme.primary}18,rgba(0,0,0,.45))`, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.8))" }} />
      {editable ? <button type="button" style={{ ...mediaButton, position: "absolute", top: 10, right: 10, zIndex: 2 }} onClick={() => coverInputRef.current?.click()}>{currentCover ? L("CHANGER LA COUVERTURE", "CHANGE COVER", "CAMBIAR PORTADA") : L("+ AJOUTER UNE COUVERTURE", "+ ADD COVER", "+ AÑADIR PORTADA")}</button> : null}
      <div style={{ position: "absolute", left: 14, right: 14, bottom: 13, display: "grid", gridTemplateColumns: "74px minmax(0,1fr) auto", gap: 11, alignItems: "end" }}>
        <div style={{ width: 72, height: 72, position: "relative" }}>
          <button type="button" disabled={!editable} onClick={() => editable && logoInputRef.current?.click()} aria-label={L("Changer le logo", "Change logo", "Cambiar logotipo")} style={{ width: 72, height: 72, padding: 0, borderRadius: 18, border: `1px solid ${theme.primary}88`, background: "rgba(5,8,18,.9)", display: "grid", placeItems: "center", overflow: "hidden", cursor: editable ? "pointer" : "default", boxShadow: "0 10px 24px rgba(0,0,0,.35)" }}>
            {currentLogo ? <img src={currentLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <OrganizationTypeIcon kind={organization.kind} size={28} color={theme.primary} strokeWidth={1.9} />}
          </button>
          {editable ? <span aria-hidden="true" style={{ position: "absolute", right: -5, bottom: -5, width: 24, height: 24, borderRadius: 999, border: "2px solid rgba(5,8,18,.96)", background: theme.primary, color: "#061014", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 1000, pointerEvents: "none" }}>+</span> : null}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: theme.primary, fontSize: 8, fontWeight: 1000 }}>{organizationPlanLabel(organization.plan)}</div>
          <div style={{ color: theme.text, fontSize: 19, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{editing ? (form.name || organization.name) : organization.name}</div>
          <div style={{ color: theme.textSoft, fontSize: 9, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{editing ? (form.description || organization.description) : organization.description}</div>
        </div>
        {!editing && canManage ? <button type="button" style={primary} onClick={() => startEdit("identity")}>{L("MODIFIER", "EDIT", "EDITAR")}</button> : <span />}
      </div>
      <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={(event) => { void pick(event.target.files?.[0], "logo"); event.currentTarget.value = ""; }} />
      <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(event) => { void pick(event.target.files?.[0], "cover"); event.currentTarget.value = ""; }} />
    </div>
  );

  if (!editing) return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, overflow: "hidden" }}>
      <VisualHero editable={canManage} />
      {canManage && (!logoUrl || !coverUrl) ? <div style={{ padding: "10px 12px 0", display: "flex", flexWrap: "wrap", gap: 7 }}>
        {!logoUrl ? <button type="button" style={primary} onClick={() => logoInputRef.current?.click()}>{L("+ AJOUTER UN LOGO", "+ ADD LOGO", "+ AÑADIR LOGO")}</button> : null}
        {!coverUrl ? <button type="button" style={button} onClick={() => coverInputRef.current?.click()}>{L("+ AJOUTER UNE PHOTO DE COUVERTURE", "+ ADD COVER PHOTO", "+ AÑADIR FOTO DE PORTADA")}</button> : null}
      </div> : null}
      <div style={{ padding: 14, display: "grid", gap: 5 }}>
        {rows.map(([rowLabel, value]) => <div key={rowLabel} style={{ display: "grid", gridTemplateColumns: "105px minmax(0,1fr)", gap: 9, padding: "7px 0", borderBottom: `1px solid ${theme.borderSoft}` }}><div style={{ color: theme.textSoft, fontSize: 8.5, fontWeight: 900 }}>{rowLabel}</div><div style={{ color: theme.text, fontSize: 9.8, fontWeight: 850, lineHeight: 1.35, wordBreak: "break-word" }}>{value}</div></div>)}
      </div>
      {canManage ? <div style={{ padding: "0 14px 14px" }}><button type="button" onClick={() => startEdit("identity")} style={{ ...primary, width: "100%" }}>{L("MODIFIER LA PAGE DU CLUB / ORGANISME", "EDIT CLUB / ORGANIZATION PAGE", "EDITAR PÁGINA DEL CLUB / ORGANIZACIÓN")}</button></div> : null}
    </div>
    {notice ? <div style={{ ...card, padding: 9, color: theme.primary, fontSize: 9 }}>{notice}</div> : null}
    {error ? <div style={{ ...card, padding: 9, color: "#ffaaaa", borderColor: "rgba(255,90,90,.45)", fontSize: 9 }}>{error}</div> : null}
  </div>;

  const sections: Array<{ id: EditSection; title: string; subtitle: string }> = [
    { id: "identity", title: L("IDENTITÉ", "IDENTITY", "IDENTIDAD"), subtitle: L("Nom, adresse, activités", "Name, address, activities", "Nombre, dirección, actividades") },
    { id: "contact", title: L("CONTACT", "CONTACT", "CONTACTO"), subtitle: L("Coordonnées publiques", "Public contact details", "Datos públicos") },
    { id: "visuals", title: L("VISUELS", "VISUALS", "VISUALES"), subtitle: L("Logo et couverture", "Logo and cover", "Logo y portada") },
  ];

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, overflow: "hidden" }}><VisualHero editable={true} /></div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
      {sections.map((section) => <button key={section.id} type="button" onClick={() => setEditSection(section.id)} style={{ ...button, minHeight: 50, borderColor: editSection === section.id ? `${theme.primary}88` : theme.borderSoft, background: editSection === section.id ? `${theme.primary}12` : "rgba(255,255,255,.025)", color: editSection === section.id ? theme.primary : theme.text }}><span style={{ display: "block", fontSize: 9.2 }}>{section.title}</span><span style={{ display: "block", marginTop: 2, color: theme.textSoft, fontSize: 7.4, fontWeight: 700 }}>{section.subtitle}</span></button>)}
    </div>

    <div style={{ ...card, padding: 14 }}>
      {editSection === "identity" ? <div style={{ display: "grid", gap: 10 }}>
        <div><div style={label}>{L("Nom public", "Public name", "Nombre público")}</div><input style={input} value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 150px", gap: 8 }}><div><div style={label}>{L("Nom officiel / raison sociale", "Legal / official name", "Nombre oficial")}</div><input style={input} value={form.legalName} onChange={(event) => setForm((value) => ({ ...value, legalName: event.target.value }))} /></div><div><div style={label}>{L("Type", "Type", "Tipo")}</div><select style={input} value={form.kind} onChange={(event) => setForm((value) => ({ ...value, kind: event.target.value as OrganizationKind }))}>{KINDS.map((kind) => <option key={kind} value={kind}>{organizationKindLabel(kind)}</option>)}</select></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}><div><div style={label}>{L("Sigle", "Acronym", "Sigla")}</div><input style={input} value={form.acronym} onChange={(event) => setForm((value) => ({ ...value, acronym: event.target.value.toUpperCase().slice(0, 12) }))} placeholder="MSS" /></div><div><div style={label}>{L("Création", "Founded", "Creación")}</div><input style={input} value={form.foundedYear} onChange={(event) => setForm((value) => ({ ...value, foundedYear: event.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="2026" /></div></div>
        <div><div style={label}>{L("Présentation courte", "Short presentation", "Presentación breve")}</div><textarea style={{ ...input, minHeight: 74, resize: "vertical" }} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} /></div>
        <div><div style={label}>{L("Adresse", "Address", "Dirección")}</div><input style={input} value={form.addressLine} onChange={(event) => setForm((value) => ({ ...value, addressLine: event.target.value }))} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "100px minmax(0,1fr) 72px", gap: 8 }}><input style={input} value={form.postalCode} onChange={(event) => setForm((value) => ({ ...value, postalCode: event.target.value }))} placeholder={L("CP", "ZIP", "CP")} /><input style={input} value={form.city} onChange={(event) => setForm((value) => ({ ...value, city: event.target.value }))} placeholder={L("Ville", "City", "Ciudad")} /><input style={input} maxLength={2} value={form.countryCode} onChange={(event) => setForm((value) => ({ ...value, countryCode: event.target.value.toUpperCase() }))} placeholder="FR" /></div>
        <div><div style={label}>{L("Lieu principal / installations", "Main venue / facilities", "Lugar principal / instalaciones")}</div><input style={input} value={form.facilities} onChange={(event) => setForm((value) => ({ ...value, facilities: event.target.value }))} /></div>
        <div><div style={label}>{L("Activités", "Activities", "Actividades")}</div><input style={input} value={form.sports} onChange={(event) => setForm((value) => ({ ...value, sports: event.target.value }))} placeholder={L("Fléchettes, football, pétanque…", "Darts, football, pétanque…", "Dardos, fútbol, petanca…")} /></div>
        <div><div style={label}>{L("Effectif estimé", "Estimated members", "Miembros estimados")}</div><input style={input} value={form.memberEstimate} onChange={(event) => setForm((value) => ({ ...value, memberEstimate: event.target.value.replace(/\D/g, "") }))} inputMode="numeric" /></div>
      </div> : null}

      {editSection === "contact" ? <div style={{ display: "grid", gap: 10 }}>
        <div style={{ color: theme.textSoft, fontSize: 9, lineHeight: 1.45 }}>{L("Ces informations sont celles de la structure, pas les données privées de ton compte personnel.", "These are organization details, not private data from your personal account.", "Estos son datos de la organización, no datos privados de tu cuenta personal.")}</div>
        <div><div style={label}>{L("Contact principal", "Main contact", "Contacto principal")}</div><input style={input} value={form.contactName} onChange={(event) => setForm((value) => ({ ...value, contactName: event.target.value }))} /></div>
        <div><div style={label}>E-mail</div><input style={input} type="email" value={form.contactEmail} onChange={(event) => setForm((value) => ({ ...value, contactEmail: event.target.value }))} placeholder="contact@club.fr" /></div>
        <div><div style={label}>{L("Téléphone", "Phone", "Teléfono")}</div><input style={input} type="tel" value={form.contactPhone} onChange={(event) => setForm((value) => ({ ...value, contactPhone: event.target.value }))} /></div>
        <div><div style={label}>{L("Site internet", "Website", "Sitio web")}</div><input style={input} value={form.website} onChange={(event) => setForm((value) => ({ ...value, website: event.target.value }))} placeholder="https://..." /></div>
      </div> : null}

      {editSection === "visuals" ? <div style={{ display: "grid", gap: 12 }}>
        <div style={{ color: theme.textSoft, fontSize: 9, lineHeight: 1.45 }}>{L("Ajoute l’identité visuelle du club : logo carré et photo de couverture (stade, gymnase, devanture, équipe…). Les images sont compressées automatiquement et restent dans le stockage média choisi.", "Add your club identity: square logo and cover photo (stadium, gym, storefront, team…). Images are automatically compressed and stay in the selected media storage.", "Añade la identidad visual del club: logo cuadrado y portada (estadio, gimnasio, fachada, equipo…). Las imágenes se comprimen automáticamente y permanecen en el almacenamiento elegido.")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "112px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
          <div style={{ width: 110, height: 110, borderRadius: 22, border: `1px dashed ${theme.primary}66`, background: "rgba(0,0,0,.24)", display: "grid", placeItems: "center", overflow: "hidden" }}>{currentLogo ? <img src={currentLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <OrganizationTypeIcon kind={form.kind} size={40} color={theme.primary} />}</div>
          <div><div style={{ color: theme.text, fontSize: 11.5, fontWeight: 1000 }}>{L("Logo du club / organisme", "Club / organization logo", "Logo del club / organización")}</div><div style={{ marginTop: 4, color: theme.textSoft, fontSize: 8.5, lineHeight: 1.4 }}>{L("Conseillé : image carrée PNG ou WebP.", "Recommended: square PNG or WebP.", "Recomendado: PNG o WebP cuadrado.")}</div><button type="button" style={{ ...primary, marginTop: 8 }} onClick={() => logoInputRef.current?.click()}>{currentLogo ? L("REMPLACER LE LOGO", "REPLACE LOGO", "REEMPLAZAR LOGO") : L("+ AJOUTER LE LOGO", "+ ADD LOGO", "+ AÑADIR LOGO")}</button></div>
        </div>
        <div style={{ minHeight: 150, borderRadius: 16, border: `1px dashed ${theme.primary}55`, overflow: "hidden", position: "relative", background: currentCover ? `url(${currentCover}) center/cover no-repeat` : "rgba(0,0,0,.24)" }}><div style={{ position: "absolute", inset: 0, background: currentCover ? "linear-gradient(180deg,transparent,rgba(0,0,0,.66))" : "transparent" }} /><div style={{ position: "absolute", left: 12, right: 12, bottom: 10, display: "flex", alignItems: "end", justifyContent: "space-between", gap: 10 }}><div><div style={{ color: theme.text, fontSize: 11, fontWeight: 1000 }}>{L("Photo de couverture", "Cover photo", "Foto de portada")}</div><div style={{ color: theme.textSoft, fontSize: 8.3 }}>{L("Stade · gymnase · devanture · locaux · équipe", "Stadium · gym · storefront · premises · team", "Estadio · gimnasio · fachada · local · equipo")}</div></div><button type="button" style={mediaButton} onClick={() => coverInputRef.current?.click()}>{currentCover ? L("REMPLACER", "REPLACE", "REEMPLAZAR") : L("+ AJOUTER", "+ ADD", "+ AÑADIR")}</button></div></div>
        <div style={{ borderRadius: 12, background: `${theme.primary}09`, border: `1px solid ${theme.primary}22`, padding: 9, color: theme.textSoft, fontSize: 8.5, lineHeight: 1.45 }}>{L("Stockage actuel", "Current storage", "Almacenamiento actual")} : <strong style={{ color: theme.primary }}>{getStorageDestination(loadStoragePrefs().selectedDestination).label}</strong>. {L("Supabase ne reçoit que les références des médias.", "Supabase only receives media references.", "Supabase solo recibe las referencias de los medios.")}</div>
      </div> : null}
    </div>

    {error ? <div style={{ ...card, padding: 10, color: "#ffaaaa", borderColor: "rgba(255,90,90,.45)", fontSize: 9 }}>{error}</div> : null}
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)", gap: 8 }}><button type="button" disabled={busy} style={{ ...button, opacity: busy ? .55 : 1 }} onClick={cancelEdit}>{L("ANNULER", "CANCEL", "CANCELAR")}</button><button type="button" disabled={busy} style={{ ...primary, opacity: busy ? .55 : 1 }} onClick={() => void save()}>{busy ? L("ENREGISTREMENT…", "SAVING…", "GUARDANDO…") : L("ENREGISTRER", "SAVE", "GUARDAR")}</button></div>
  </div>;
}
