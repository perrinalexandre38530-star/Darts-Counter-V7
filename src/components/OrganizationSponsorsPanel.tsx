import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  createOrganizationPartner,
  deleteOrganizationPartner,
  listOrganizationGroups,
  listOrganizationPartners,
  setOrganizationPartnerStatus,
  updateOrganizationPartner,
  type OrganizationLocalGroup,
  type OrganizationPartner,
  type OrganizationPartnerInput,
  type OrganizationPartnerKind,
  type OrganizationPartnerPlacement,
  type OrganizationPartnerStatus,
  type OrganizationRecord,
} from "../organizations/organizationService";
import { captureUserMediaFallback, resolveUserMediaFallback, teamLogoMediaKey } from "../lib/userMediaFallback";
import { fileToCompressedImageDataUrl } from "../lib/teamImageStorage";
import { getStorageDestination, loadStoragePrefs } from "../lib/storagePlans";

const KINDS: OrganizationPartnerKind[] = ["sponsor", "partner", "supplier", "institutional"];
const PLACEMENTS: OrganizationPartnerPlacement[] = ["organization", "team", "competition", "venue", "all"];

type Draft = {
  partnerKind: OrganizationPartnerKind;
  name: string;
  category: string;
  websiteUrl: string;
  offerTitle: string;
  offerText: string;
  promoCode: string;
  placement: OrganizationPartnerPlacement;
  groupId: string;
  startsAt: string;
  endsAt: string;
};

const blankDraft = (): Draft => ({
  partnerKind: "sponsor",
  name: "",
  category: "",
  websiteUrl: "",
  offerTitle: "",
  offerText: "",
  promoCode: "",
  placement: "organization",
  groupId: "",
  startsAt: "",
  endsAt: "",
});

function toStartIso(value: string) { return value ? new Date(`${value}T00:00:00`).toISOString() : null; }
function toEndIso(value: string) { return value ? new Date(`${value}T23:59:59`).toISOString() : null; }
function dateOnly(value: string) { return value ? String(value).slice(0, 10) : ""; }
function fmtDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
function normalizeHttps(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https:\/\//i.test(raw) ? raw : `https://${raw.replace(/^https?:\/\//i, "")}`;
}
function initials(name: string) {
  return String(name || "P").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
}

function PartnerLogo({ partner, size = 58, color }: { partner: OrganizationPartner; size?: number; color: string }) {
  const [url, setUrl] = React.useState("");
  React.useEffect(() => {
    let cancelled = false;
    if (!partner.logoMediaKey) { setUrl(""); return; }
    void resolveUserMediaFallback(partner.logoMediaKey, "", { kind: "team_logo", allowR2: true }).then((next) => {
      if (!cancelled) setUrl(next || "");
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [partner.id, partner.logoMediaKey]);
  return <span style={{ width: size, height: size, borderRadius: 16, overflow: "hidden", border: `1px solid ${color}66`, background: "rgba(4,8,16,.84)", display: "grid", placeItems: "center", flexShrink: 0 }}>
    {url ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <strong style={{ color, fontSize: Math.max(11, size * .27) }}>{initials(partner.name)}</strong>}
  </span>;
}

export default function OrganizationSponsorsPanel({ organization, userId }: { organization: OrganizationRecord; userId: string | null }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const canManage = ["owner", "admin", "manager"].includes(organization.role);
  const canDelete = ["owner", "admin"].includes(organization.role);
  const prefs = React.useMemo(() => loadStoragePrefs(), []);
  const destination = React.useMemo(() => getStorageDestination(prefs.selectedDestination), [prefs.selectedDestination]);
  const mirrorR2 = prefs.selectedDestination === "cloud_r2";

  const [partners, setPartners] = React.useState<OrganizationPartner[]>([]);
  const [groups, setGroups] = React.useState<OrganizationLocalGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cloudAvailable, setCloudAvailable] = React.useState(false);
  const [action, setAction] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [editingId, setEditingId] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [expandedPartnerId, setExpandedPartnerId] = React.useState("");
  const [draft, setDraft] = React.useState<Draft>(() => blankDraft());
  const [logoPreview, setLogoPreview] = React.useState("");
  const [logoChanged, setLogoChanged] = React.useState(false);

  const card: React.CSSProperties = { borderRadius: 18, border: `1px solid ${theme.borderSoft}`, background: theme.cardBackground || theme.card, boxShadow: `0 16px 34px rgba(0,0,0,.34), 0 0 16px ${theme.primary}0d` };
  const input: React.CSSProperties = { width: "100%", minHeight: 41, borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.28)", color: theme.text, padding: "9px 10px", outline: "none", boxSizing: "border-box", fontSize: 10.2 };
  const button: React.CSSProperties = { minHeight: 35, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.035)", color: theme.text, fontWeight: 900, fontSize: 8.8, padding: "7px 10px", cursor: "pointer" };
  const primaryButton: React.CSSProperties = { ...button, border: `1px solid ${theme.primary}`, color: theme.primary, background: `${theme.primary}13` };

  const kindLabel = (kind: OrganizationPartnerKind) => ({
    sponsor: L("Sponsor", "Sponsor", "Patrocinador"),
    partner: L("Partenaire", "Partner", "Socio"),
    supplier: L("Fournisseur", "Supplier", "Proveedor"),
    institutional: L("Institutionnel", "Institutional", "Institucional"),
  }[kind]);
  const placementLabel = (placement: OrganizationPartnerPlacement) => ({
    organization: L("Accueil organisation", "Organization home", "Inicio organización"),
    team: L("Équipe / groupe", "Team / group", "Equipo / grupo"),
    competition: L("Compétitions", "Competitions", "Competiciones"),
    venue: L("Lieu / établissement", "Venue", "Local / establecimiento"),
    all: L("Partout", "Everywhere", "En todas partes"),
  }[placement]);
  const statusLabel = (status: OrganizationPartnerStatus) => ({
    draft: L("BROUILLON", "DRAFT", "BORRADOR"),
    active: L("ACTIF", "ACTIVE", "ACTIVO"),
    paused: L("PAUSE", "PAUSED", "PAUSADO"),
    archived: L("ARCHIVÉ", "ARCHIVED", "ARCHIVADO"),
  }[status]);

  const refresh = React.useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [partnerResult, groupResult] = await Promise.all([
        listOrganizationPartners(userId, organization.id),
        listOrganizationGroups(userId, organization.id),
      ]);
      setPartners(partnerResult.partners);
      setCloudAvailable(partnerResult.cloudAvailable);
      setGroups(groupResult.groups.filter((group) => group.status !== "archived"));
    } catch (e: any) {
      setError(String(e?.message || L("Impossible de charger les partenaires.", "Unable to load partners.", "No se pueden cargar los socios.")));
    } finally { setLoading(false); }
  }, [L, organization.id, userId]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const reset = () => { setEditingId(""); setDraft(blankDraft()); setLogoPreview(""); setLogoChanged(false); setFormOpen(false); };

  const edit = async (partner: OrganizationPartner) => {
    setFormOpen(true);
    setEditingId(partner.id);
    setDraft({
      partnerKind: partner.partnerKind,
      name: partner.name,
      category: partner.category,
      websiteUrl: partner.websiteUrl,
      offerTitle: partner.offerTitle,
      offerText: partner.offerText,
      promoCode: partner.promoCode,
      placement: partner.placement,
      groupId: partner.groupId,
      startsAt: dateOnly(partner.startsAt),
      endsAt: dateOnly(partner.endsAt),
    });
    setLogoChanged(false); setLogoPreview("");
    if (partner.logoMediaKey) {
      const resolved = await resolveUserMediaFallback(partner.logoMediaKey, "", { kind: "team_logo", allowR2: true }).catch(() => "");
      setLogoPreview(resolved || "");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pickLogo = async (file?: File) => {
    if (!file) return;
    try {
      const compact = await fileToCompressedImageDataUrl(file, { maxEdge: 320, quality: 0.82 });
      setLogoPreview(compact); setLogoChanged(true); setError("");
    } catch { setError(L("Impossible de préparer ce logo.", "Unable to prepare this logo.", "No se puede preparar este logo.")); }
  };

  const save = async () => {
    if (!canManage) return;
    const name = draft.name.trim();
    if (name.length < 2) { setError(L("Indique le nom du partenaire.", "Enter the partner name.", "Indica el nombre del socio.")); return; }
    const websiteUrl = normalizeHttps(draft.websiteUrl);
    if (draft.startsAt && draft.endsAt && new Date(draft.endsAt) < new Date(draft.startsAt)) { setError(L("La date de fin doit être postérieure à la date de début.", "End date must be after start date.", "La fecha de fin debe ser posterior a la fecha de inicio.")); return; }
    setAction("save"); setError(""); setNotice("");
    try {
      const current = editingId ? partners.find((partner) => partner.id === editingId) : null;
      const payload: OrganizationPartnerInput = {
        groupId: draft.groupId || null,
        partnerKind: draft.partnerKind,
        name,
        category: draft.category,
        websiteUrl,
        offerTitle: draft.offerTitle,
        offerText: draft.offerText,
        promoCode: draft.promoCode,
        placement: draft.placement,
        startsAt: toStartIso(draft.startsAt),
        endsAt: toEndIso(draft.endsAt),
        logoMediaKey: current?.logoMediaKey || "",
      };
      let partner = editingId
        ? await updateOrganizationPartner(userId, editingId, payload)
        : await createOrganizationPartner(userId, organization.id, payload);
      if (logoChanged && logoPreview) {
        const logoMediaKey = teamLogoMediaKey(`sponsor-${partner.id}`);
        await captureUserMediaFallback(logoMediaKey, logoPreview, { kind: "team_logo", mirrorR2, updatedAt: Date.now() });
        partner = await updateOrganizationPartner(userId, partner.id, { ...payload, logoMediaKey });
      }
      setNotice(editingId ? L("Partenaire mis à jour.", "Partner updated.", "Socio actualizado.") : L("Partenaire créé. Active-le quand sa fiche est prête.", "Partner created. Activate it when its profile is ready.", "Socio creado. Actívalo cuando su ficha esté lista."));
      reset(); await refresh();
    } catch (e: any) { setError(String(e?.message || L("Enregistrement impossible.", "Save failed.", "No se pudo guardar."))); }
    finally { setAction(""); }
  };

  const changeStatus = async (partner: OrganizationPartner, status: OrganizationPartnerStatus) => {
    if (!canManage) return;
    setAction(`status:${partner.id}`); setError("");
    try { await setOrganizationPartnerStatus(userId, partner.id, status); await refresh(); }
    catch (e: any) { setError(String(e?.message || L("Modification impossible.", "Update failed.", "No se pudo actualizar."))); }
    finally { setAction(""); }
  };

  const remove = async (partner: OrganizationPartner) => {
    if (!canDelete || !window.confirm(L("Supprimer cette fiche partenaire ? Le média externe n'est pas supprimé automatiquement.", "Delete this partner profile? External media is not automatically deleted.", "¿Eliminar esta ficha de socio? El medio externo no se elimina automáticamente."))) return;
    setAction(`delete:${partner.id}`); setError("");
    try { await deleteOrganizationPartner(userId, partner.id); if (editingId === partner.id) reset(); await refresh(); }
    catch (e: any) { setError(String(e?.message || L("Suppression impossible.", "Deletion failed.", "No se pudo eliminar."))); }
    finally { setAction(""); }
  };

  const activeCount = partners.filter((partner) => partner.status === "active").length;
  const offerCount = partners.filter((partner) => partner.status === "active" && (partner.offerTitle || partner.offerText || partner.promoCode)).length;
  const teamCount = partners.filter((partner) => partner.groupId).length;

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
        <div><div style={{ color: theme.primary, fontSize: 8.2, fontWeight: 1000, letterSpacing: 1.05 }}>{L("SPONSORS & PARTENAIRES", "SPONSORS & PARTNERS", "PATROCINADORES Y SOCIOS")}</div><div style={{ marginTop: 4, color: theme.text, fontSize: 16, fontWeight: 1000 }}>{organization.name}</div><div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.2, lineHeight: 1.45 }}>{L("Les logos restent dans R2 / NAS / stockage choisi. Supabase ne conserve que la fiche légère et la clé du média.", "Logos stay in R2 / NAS / selected storage. Supabase only keeps the lightweight profile and media key.", "Los logotipos quedan en R2 / NAS / almacenamiento elegido. Supabase solo conserva la ficha ligera y la clave del medio.")}</div></div>
        <span style={{ borderRadius: 999, border: `1px solid ${cloudAvailable ? theme.primary : theme.borderSoft}`, color: cloudAvailable ? theme.primary : theme.textSoft, padding: "5px 8px", fontSize: 7.7, fontWeight: 1000 }}>{cloudAvailable ? "SYNC" : "LOCAL"}</span>
      </div>
      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>{[[L("ACTIFS", "ACTIVE", "ACTIVOS"), activeCount], [L("OFFRES", "OFFERS", "OFERTAS"), offerCount], [L("LIÉS ÉQUIPE", "TEAM LINKED", "VINC. EQUIPO"), teamCount]].map(([label, value]) => <div key={String(label)} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.2)", padding: "9px 6px", textAlign: "center" }}><div style={{ color: theme.primary, fontSize: 15, fontWeight: 1000 }}>{value}</div><div style={{ color: theme.textSoft, fontSize: 7.3, fontWeight: 900 }}>{label}</div></div>)}</div>
    </div>

    {canManage && !formOpen ? <button type="button" onClick={() => { reset(); setFormOpen(true); }} style={{ ...primaryButton, width: "100%", minHeight: 44, fontSize: 10.2 }}>+ {L("AJOUTER UN PARTENAIRE", "ADD PARTNER", "AÑADIR SOCIO")}</button> : null}

    {canManage && formOpen ? <div style={{ ...card, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: theme.text, fontSize: 10.7, fontWeight: 1000 }}>{editingId ? L("MODIFIER LE PARTENAIRE", "EDIT PARTNER", "EDITAR SOCIO") : L("AJOUTER UN PARTENAIRE", "ADD PARTNER", "AÑADIR SOCIO")}</div><button type="button" onClick={reset} style={button}>✕</button></div>
      <div style={{ display: "grid", gridTemplateColumns: "72px minmax(0,1fr)", gap: 10, alignItems: "start" }}>
        <label style={{ width: 70, height: 70, borderRadius: 18, border: `1px solid ${theme.primary}66`, background: "rgba(4,8,16,.82)", display: "grid", placeItems: "center", overflow: "hidden", cursor: "pointer" }}>{logoPreview ? <img src={logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <strong style={{ color: theme.primary, fontSize: 17 }}>{initials(draft.name || "SP")}</strong>}<input type="file" accept="image/*" hidden onChange={(e) => void pickLogo(e.target.files?.[0])} /></label>
        <div style={{ display: "grid", gap: 8 }}><input style={input} value={draft.name} maxLength={100} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder={L("Nom du sponsor / partenaire", "Sponsor / partner name", "Nombre del patrocinador / socio")} /><input style={input} value={draft.category} maxLength={80} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} placeholder={L("Secteur : restaurant, banque, équipementier…", "Category: restaurant, bank, equipment…", "Sector: restaurante, banco, equipamiento…")} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><select style={input} value={draft.partnerKind} onChange={(e) => setDraft((d) => ({ ...d, partnerKind: e.target.value as OrganizationPartnerKind }))}>{KINDS.map((kind) => <option key={kind} value={kind}>{kindLabel(kind)}</option>)}</select><select style={input} value={draft.placement} onChange={(e) => setDraft((d) => ({ ...d, placement: e.target.value as OrganizationPartnerPlacement }))}>{PLACEMENTS.map((placement) => <option key={placement} value={placement}>{placementLabel(placement)}</option>)}</select></div>
      <select style={input} value={draft.groupId} onChange={(e) => setDraft((d) => ({ ...d, groupId: e.target.value }))}><option value="">{L("Toute l'organisation", "Whole organization", "Toda la organización")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
      <input style={input} value={draft.websiteUrl} maxLength={400} onChange={(e) => setDraft((d) => ({ ...d, websiteUrl: e.target.value }))} placeholder="https://partenaire.fr" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input type="date" style={input} value={draft.startsAt} onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))} /><input type="date" style={input} value={draft.endsAt} onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))} /></div>
      <input style={input} value={draft.offerTitle} maxLength={120} onChange={(e) => setDraft((d) => ({ ...d, offerTitle: e.target.value }))} placeholder={L("Titre de l'avantage membre (optionnel)", "Member benefit title (optional)", "Título de la ventaja para miembros (opcional)")} />
      <textarea style={{ ...input, minHeight: 75, resize: "vertical", fontFamily: "inherit" }} value={draft.offerText} maxLength={600} onChange={(e) => setDraft((d) => ({ ...d, offerText: e.target.value }))} placeholder={L("Ex. -10 % sur présentation de la carte du club…", "E.g. 10% off with club membership…", "Ej. 10 % de descuento con la membresía del club…")} />
      <input style={input} value={draft.promoCode} maxLength={80} onChange={(e) => setDraft((d) => ({ ...d, promoCode: e.target.value.toUpperCase() }))} placeholder={L("Code promo (optionnel)", "Promo code (optional)", "Código promocional (opcional)")} />
      <button type="button" disabled={action === "save"} onClick={() => void save()} style={{ ...primaryButton, opacity: action === "save" ? .55 : 1 }}>{action === "save" ? L("ENREGISTREMENT…", "SAVING…", "GUARDANDO…") : editingId ? L("ENREGISTRER", "SAVE", "GUARDAR") : L("CRÉER LA FICHE", "CREATE PROFILE", "CREAR FICHA")}</button>
      <div style={{ color: theme.textSoft, fontSize: 7.8, lineHeight: 1.4 }}>{L("Média", "Media", "Multimedia")}: {destination.shortLabel} · {L("aucune image dans Supabase", "no image stored in Supabase", "ninguna imagen en Supabase")}</div>
    </div> : null}

    {notice ? <div style={{ ...card, padding: 10, color: theme.primary, fontSize: 9.3 }}>{notice}</div> : null}
    {error ? <div style={{ ...card, padding: 10, borderColor: "rgba(255,90,90,.45)", color: "#ffaaaa", fontSize: 9.3 }}>{error}</div> : null}

    {loading ? <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10 }}>{L("Chargement…", "Loading…", "Cargando…")}</div> : partners.length ? partners.map((partner) => {
      const period = partner.startsAt || partner.endsAt ? `${partner.startsAt ? fmtDate(partner.startsAt) : "…"} → ${partner.endsAt ? fmtDate(partner.endsAt) : "…"}` : L("Sans période définie", "No set period", "Sin período definido");
      return <article key={partner.id} style={{ ...card, padding: 12, borderColor: partner.status === "active" ? `${theme.primary}66` : theme.borderSoft }}>
        <div style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
          <PartnerLogo partner={partner} color={theme.primary} />
          <div style={{ minWidth: 0 }}><div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><strong style={{ color: theme.text, fontSize: 12.4 }}>{partner.name}</strong><span style={{ borderRadius: 999, border: `1px solid ${partner.status === "active" ? theme.primary : theme.borderSoft}`, color: partner.status === "active" ? theme.primary : theme.textSoft, padding: "2px 6px", fontSize: 7.1, fontWeight: 1000 }}>{statusLabel(partner.status)}</span></div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 8.4 }}>{kindLabel(partner.partnerKind)}{partner.category ? ` · ${partner.category}` : ""} · {placementLabel(partner.placement)}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 7.8 }}>{partner.groupName || L("Toute l'organisation", "Whole organization", "Toda la organización")} · {period}</div></div>
          <div style={{ display: "flex", gap: 5 }}><button type="button" onClick={() => setExpandedPartnerId((id) => id === partner.id ? "" : partner.id)} style={{ ...button, minWidth: 34, padding: 6 }}>{expandedPartnerId === partner.id ? "−" : "···"}</button>{canManage ? <button type="button" onClick={() => void edit(partner)} style={{ ...button, minWidth: 34, padding: 6 }}>✎</button> : null}</div>
        </div>
        {expandedPartnerId === partner.id ? <><div style={{ marginTop: 9, color: theme.textSoft, fontSize: 8.3 }}>{placementLabel(partner.placement)} · {partner.groupName || L("Toute l'organisation", "Whole organization", "Toda la organización")} · {period}</div>{partner.offerTitle || partner.offerText || partner.promoCode ? <div style={{ marginTop: 10, borderRadius: 12, border: `1px solid ${theme.primary}44`, background: `${theme.primary}0c`, padding: 10 }}><div style={{ color: theme.primary, fontSize: 9.5, fontWeight: 1000 }}>{partner.offerTitle || L("AVANTAGE MEMBRE", "MEMBER BENEFIT", "VENTAJA PARA MIEMBROS")}</div>{partner.offerText ? <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.3, lineHeight: 1.45 }}>{partner.offerText}</div> : null}{partner.promoCode ? <button type="button" onClick={() => void navigator.clipboard?.writeText(partner.promoCode)} style={{ ...button, marginTop: 7, color: theme.primary }}>CODE · {partner.promoCode}</button> : null}</div> : null}
        <div style={{ marginTop: 9, display: "flex", gap: 6, flexWrap: "wrap" }}>{partner.websiteUrl ? <button type="button" onClick={() => window.open(partner.websiteUrl, "_blank", "noopener,noreferrer")} style={button}>{L("SITE", "WEBSITE", "SITIO")}</button> : null}{canManage ? <><select aria-label={L("Statut partenaire", "Partner status", "Estado del socio")} value={partner.status} disabled={Boolean(action)} onChange={(e) => void changeStatus(partner, e.target.value as OrganizationPartnerStatus)} style={{ ...input, width: "auto", minHeight: 35, padding: "6px 8px", fontSize: 8.5 }}><option value="draft">{statusLabel("draft")}</option><option value="active">{statusLabel("active")}</option><option value="paused">{statusLabel("paused")}</option><option value="archived">{statusLabel("archived")}</option></select>{canDelete ? <button type="button" disabled={Boolean(action)} onClick={() => void remove(partner)} style={{ ...button, color: "#ff9a9a" }}>{L("SUPPRIMER", "DELETE", "ELIMINAR")}</button> : null}</> : null}</div></> : null}
      </article>;
    }) : <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10 }}>{L("Aucun sponsor ou partenaire enregistré.", "No sponsor or partner registered.", "No hay patrocinadores o socios registrados.")}</div>}
  </div>;
}
