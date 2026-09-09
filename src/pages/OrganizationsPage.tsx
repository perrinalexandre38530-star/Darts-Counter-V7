import React from "react";
import BackDot from "../components/BackDot";
import OrganizationTypeIcon from "../components/OrganizationTypeIcon";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { useAuthOnline } from "../hooks/useAuthOnline";
import {
  createOrganization,
  createOrganizationEvent,
  createOrganizationGroup,
  joinOrganization,
  listLocalOrganizationEvents,
  listLocalOrganizationGroups,
  listMyOrganizations,
  listOrganizationEvents,
  listOrganizationGroups,
  loadOrganizationLocalState,
  normalizeOrganizationProfile,
  organizationKindLabel,
  organizationPlanLabel,
  organizationRoleLabel,
  setActiveOrganization,
  updateOrganizationProfile,
  type OrganizationCreateInput,
  type OrganizationKind,
  type OrganizationPlan,
  type OrganizationProfile,
  type OrganizationRecord,
} from "../organizations/organizationService";
import { enterOrganizationWorkspace, enterPersonalWorkspace } from "../organizations/organizationWorkspace";
import {
  captureUserMediaFallback,
  organizationCoverMediaKey,
  organizationLogoMediaKey,
  resolveUserMediaFallback,
} from "../lib/userMediaFallback";
import { getStorageDestination, loadStoragePrefs } from "../lib/storagePlans";

type Props = { go?: (tab: any, params?: any) => void; params?: any };
type View = "home" | "profile" | "members" | "groups" | "calendar" | "competitions" | "stats" | "communication" | "billing" | "sponsors" | "admin" | "offers";
type EntryMode = "none" | "create" | "join";

type WizardDraft = {
  name: string;
  kind: OrganizationKind;
  plan: OrganizationPlan;
  city: string;
  countryCode: string;
  description: string;
  legalName: string;
  acronym: string;
  addressLine: string;
  postalCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  memberEstimate: string;
  sports: string[];
  facilities: string;
  foundedYear: string;
};

const KIND_OPTIONS: Array<{ id: OrganizationKind; label: string; short: string; detail: string }> = [
  { id: "club", label: "Club sportif", short: "CLUB", detail: "Équipes, licenciés, coachs et compétitions" },
  { id: "association", label: "Association", short: "ASSO", detail: "Adhérents, sections et événements" },
  { id: "company", label: "Entreprise", short: "PRO", detail: "Collaborateurs, challenges et événements internes" },
  { id: "venue", label: "Bar / Pub / Salle", short: "VENUE", detail: "Clients, installations, ligues et leaderboards" },
  { id: "school", label: "École / Université", short: "EDU", detail: "Classes, équipes et compétitions scolaires" },
  { id: "local_authority", label: "Collectivité", short: "CITY", detail: "Associations, équipements et événements locaux" },
  { id: "organizer", label: "Organisateur", short: "EVENT", detail: "Tournois, événements et participants" },
  { id: "other", label: "Autre", short: "MSS", detail: "Structure personnalisée" },
];

const PLAN_OPTIONS: Array<{ id: OrganizationPlan; title: string; subtitle: string; audience: string }> = [
  { id: "group", title: "MSS GROUP", subtitle: "Pour démarrer avec un petit groupe ou une équipe.", audience: "PETITS GROUPES" },
  { id: "club", title: "MSS CLUB", subtitle: "Gestion structurée d’un club ou d’une association.", audience: "CLUBS & ASSOS" },
  { id: "pro", title: "MSS PRO", subtitle: "Multi-équipes, compétitions et pilotage avancé.", audience: "STRUCTURES" },
  { id: "business", title: "MSS BUSINESS", subtitle: "Challenges internes, événements et lieux partenaires.", audience: "ENTREPRISES / BARS" },
  { id: "custom", title: "SUR MESURE", subtitle: "Fédération, réseau, collectivité ou déploiement spécifique.", audience: "GRANDS COMPTES" },
];

const SPORTS = ["Multisport", "Fléchettes", "Baby-foot", "Ping-pong", "Pétanque", "Mölkky", "Running", "FIT PERF", "Football", "Autre"];
const WIZARD_STEPS = 8;

function emptyDraft(): WizardDraft {
  return {
    name: "",
    kind: "club",
    plan: "club",
    city: "",
    countryCode: "FR",
    description: "",
    legalName: "",
    acronym: "",
    addressLine: "",
    postalCode: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    memberEstimate: "20",
    sports: ["Multisport"],
    facilities: "",
    foundedYear: "",
  };
}

function recommendedPlan(kind: OrganizationKind, members: number): OrganizationPlan {
  if (members >= 500) return "custom";
  if (members >= 120) return "pro";
  if (kind === "company" || kind === "venue") return "business";
  if (kind === "club" || kind === "association" || kind === "school") return "club";
  if (kind === "local_authority" || kind === "organizer") return "pro";
  return "group";
}

function normalizeWebsite(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function ModuleIcon({ name, color }: { name: string; color: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    profile: <><rect {...common} x="3" y="4" width="18" height="16" rx="3"/><circle {...common} cx="8" cy="10" r="2"/><path {...common} d="M5 17c.5-2.3 1.6-3.5 3-3.5s2.5 1.2 3 3.5M13 9h5M13 13h5"/></>,
    members: <><circle {...common} cx="9" cy="8" r="3"/><circle {...common} cx="17" cy="10" r="2.3"/><path {...common} d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 15c3.2-.5 5.4 1 6 4.5"/></>,
    groups: <><rect {...common} x="3" y="4" width="8" height="7" rx="2"/><rect {...common} x="13" y="4" width="8" height="7" rx="2"/><rect {...common} x="8" y="14" width="8" height="6" rx="2"/><path {...common} d="M7 11v2h10v-2M12 13v1"/></>,
    calendar: <><rect {...common} x="3" y="5" width="18" height="16" rx="2"/><path {...common} d="M7 3v4M17 3v4M3 10h18"/><path {...common} d="m8 15 2 2 5-5"/></>,
    competitions: <><path {...common} d="M8 4h8v4c0 4-1.7 6-4 6s-4-2-4-6V4Z"/><path {...common} d="M8 6H4c0 3 1.3 5 4.5 5M16 6h4c0 3-1.3 5-4.5 5M12 14v4M8 21h8M9 18h6"/></>,
    stats: <><path {...common} d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    communication: <><path {...common} d="M4 5h16v11H9l-5 4V5Z"/><path {...common} d="M8 9h8M8 12h5"/></>,
    billing: <><rect {...common} x="3" y="5" width="18" height="14" rx="2"/><path {...common} d="M3 9h18M7 15h3"/></>,
    sponsors: <><path {...common} d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z"/></>,
    admin: <><path {...common} d="M12 3 5 6v5c0 4.5 2.7 8 7 10 4.3-2 7-5.5 7-10V6l-7-3Z"/><path {...common} d="M9 12h6M12 9v6"/></>,
    offers: <><path {...common} d="M4 4h16v16H4z"/><path {...common} d="M8 9h8M8 13h5"/></>,
  };
  return <span style={{ width: 36, height: 36, display: "grid", placeItems: "center", color, flexShrink: 0 }}><svg width="25" height="25" viewBox="0 0 24 24">{paths[name] || paths.admin}</svg></span>;
}

export default function OrganizationsPage({ go, params }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const auth = useAuthOnline() as any;
  const userId = String(auth?.userId || auth?.user?.id || "") || null;
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const workspaceMode = params?.workspaceMode === true;
  const requestedOrganizationId = String(params?.organizationId || "").trim();
  const requestedView = String(params?.view || "home") as View;
  const validViews: View[] = ["home", "profile", "members", "groups", "calendar", "competitions", "stats", "communication", "billing", "sponsors", "admin", "offers"];

  const [organizations, setOrganizations] = React.useState<OrganizationRecord[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(() => loadOrganizationLocalState(userId).activeOrganizationId);
  const [view, setView] = React.useState<View>(() => validViews.includes(requestedView) ? requestedView : "home");
  const [entryMode, setEntryMode] = React.useState<EntryMode>("none");
  const [wizardStep, setWizardStep] = React.useState(0);
  const [draft, setDraft] = React.useState<WizardDraft>(() => emptyDraft());
  const [logoPreview, setLogoPreview] = React.useState("");
  const [coverPreview, setCoverPreview] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [cloudAvailable, setCloudAvailable] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [joinCode, setJoinCode] = React.useState("");
  const [groupName, setGroupName] = React.useState("");
  const [groupSport, setGroupSport] = React.useState("Multisport");
  const [eventTitle, setEventTitle] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [eventLocation, setEventLocation] = React.useState("");
  const [refreshTick, setRefreshTick] = React.useState(0);
  const [activeLogo, setActiveLogo] = React.useState("");
  const [activeCover, setActiveCover] = React.useState("");

  const active = React.useMemo(() => organizations.find((org) => org.id === activeId) || organizations[0] || null, [organizations, activeId]);
  const localGroups = React.useMemo(() => active ? listLocalOrganizationGroups(userId, active.id) : [], [active, userId, refreshTick]);
  const localEvents = React.useMemo(() => active ? listLocalOrganizationEvents(userId, active.id) : [], [active, userId, refreshTick]);
  const storagePrefs = React.useMemo(() => loadStoragePrefs(), [entryMode, wizardStep]);
  const storageDestination = React.useMemo(() => getStorageDestination(storagePrefs.selectedDestination), [storagePrefs.selectedDestination]);

  const load = React.useCallback(async () => {
    const result = await listMyOrganizations(userId);
    setOrganizations(result.organizations);
    setCloudAvailable(result.cloudAvailable);
    if (result.warning && !/migration Supabase PARTENARIATS/i.test(result.warning)) setNotice(result.warning);
    const localActive = loadOrganizationLocalState(userId).activeOrganizationId;
    const nextId = requestedOrganizationId && result.organizations.some((org) => org.id === requestedOrganizationId)
      ? requestedOrganizationId
      : localActive && result.organizations.some((org) => org.id === localActive)
        ? localActive
        : result.organizations[0]?.id || null;
    setActiveId(nextId);
    if (nextId) setActiveOrganization(userId, nextId);
  }, [userId, requestedOrganizationId]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    if (workspaceMode && validViews.includes(requestedView)) setView(requestedView);
  }, [workspaceMode, requestedView]);

  React.useEffect(() => {
    if (!active?.id) return;
    let cancelled = false;
    void Promise.all([
      listOrganizationGroups(userId, active.id),
      listOrganizationEvents(userId, active.id),
    ]).then(([groupsResult, eventsResult]) => {
      if (cancelled) return;
      if (groupsResult.cloudAvailable || eventsResult.cloudAvailable) setCloudAvailable(true);
      setRefreshTick((v) => v + 1);
    });
    return () => { cancelled = true; };
  }, [active?.id, userId]);

  React.useEffect(() => {
    let cancelled = false;
    setActiveLogo("");
    setActiveCover("");
    if (!active) return () => { cancelled = true; };
    const prefs = loadStoragePrefs();
    const allowR2 = prefs.selectedDestination === "cloud_r2";
    if (active.profile.logoMediaKey) {
      void resolveUserMediaFallback(active.profile.logoMediaKey, "", { kind: "club_logo", allowR2 }).then((url) => { if (!cancelled) setActiveLogo(url); });
    }
    if (active.profile.coverMediaKey) {
      void resolveUserMediaFallback(active.profile.coverMediaKey, "", { kind: "club_cover", allowR2 }).then((url) => { if (!cancelled) setActiveCover(url); });
    }
    return () => { cancelled = true; };
  }, [active?.id, active?.profile.logoMediaKey, active?.profile.coverMediaKey]);

  const pageBg = theme.pageBackground || "radial-gradient(circle at 50% -10%, rgba(34,230,255,.12), transparent 45%), #050812";
  const cardBg = theme.cardBackground || theme.card;
  const card: React.CSSProperties = { borderRadius: 18, border: `1px solid ${theme.borderSoft}`, background: cardBg, boxShadow: `0 16px 34px rgba(0,0,0,.42), 0 0 18px ${theme.primary}14` };
  const input: React.CSSProperties = { width: "100%", minHeight: 43, borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.28)", color: theme.text, padding: "10px 12px", outline: "none", fontSize: 12, boxSizing: "border-box" };
  const primaryButton: React.CSSProperties = { minHeight: 44, borderRadius: 13, border: `1px solid ${theme.primary}88`, background: `linear-gradient(135deg, ${theme.primary}22, ${theme.primary}10)`, color: theme.primary, fontWeight: 1000, letterSpacing: .35, cursor: "pointer", padding: "10px 14px" };
  const secondaryButton: React.CSSProperties = { ...primaryButton, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.035)", color: theme.text };

  function resetWizard() {
    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setLogoPreview("");
    setCoverPreview("");
    setWizardStep(0);
    setDraft(emptyDraft());
  }

  function startCreate() {
    resetWizard();
    setView("home");
    setEntryMode("create");
    setError("");
    setNotice("");
  }

  function selectOrganization(id: string) {
    setActiveId(id);
    setActiveOrganization(userId, id);
    setView("home");
    setEntryMode("none");
    setError("");
  }

  function navigateView(nextView: View) {
    if (!workspaceMode) {
      setView(nextView);
      return;
    }
    const routes: Partial<Record<View, string>> = {
      home: "organization_home",
      calendar: "organization_calendar",
      members: "organization_members",
      groups: "organization_teams",
      competitions: "organization_competitions",
      stats: "organization_stats",
      admin: "organization_admin",
    };
    const route = routes[nextView];
    if (route) {
      go?.(route, { organizationId: active?.id || requestedOrganizationId, workspaceMode: true, view: nextView });
      return;
    }
    setView(nextView);
  }

  function setKind(kind: OrganizationKind) {
    setDraft((d) => ({ ...d, kind, plan: recommendedPlan(kind, Number(d.memberEstimate || 0)) }));
  }

  function toggleSport(sport: string) {
    setDraft((d) => {
      const exists = d.sports.includes(sport);
      const next = exists ? d.sports.filter((item) => item !== sport) : [...d.sports.filter((item) => item !== "Multisport" || sport === "Multisport"), sport];
      return { ...d, sports: next.length ? next : ["Multisport"] };
    });
  }

  function chooseImage(file: File | undefined, kind: "logo" | "cover") {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) { setError(L("Le fichier choisi n’est pas une image.", "The selected file is not an image.", "El archivo seleccionado no es una imagen.")); return; }
    if (file.size > 15 * 1024 * 1024) { setError(L("Image trop lourde : 15 Mo maximum avant compression.", "Image too large: 15 MB maximum before compression.", "Imagen demasiado grande: 15 MB máximo antes de la compresión.")); return; }
    const url = URL.createObjectURL(file);
    if (kind === "logo") {
      if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
      setLogoPreview(url);
    } else {
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      setCoverPreview(url);
    }
  }

  function validateStep(step: number): string {
    if (step === 1 && draft.name.trim().length < 2) return L("Indique le nom public de l’organisme.", "Enter the public organization name.", "Indica el nombre público de la organización.");
    if (step === 2 && !draft.city.trim()) return L("Indique au minimum la ville de l’organisme.", "Enter at least the organization city.", "Indica al menos la ciudad de la organización.");
    if (step === 3 && draft.sports.length === 0) return L("Sélectionne au moins une activité.", "Select at least one activity.", "Selecciona al menos una actividad.");
    if (step === 3 && Number(draft.memberEstimate || 0) <= 0) return L("Indique un nombre approximatif de membres / participants.", "Enter an approximate number of members / participants.", "Indica un número aproximado de miembros / participantes.");
    return "";
  }

  function nextWizardStep() {
    const message = validateStep(wizardStep);
    if (message) { setError(message); return; }
    setError("");
    setWizardStep((step) => Math.min(WIZARD_STEPS - 1, step + 1));
  }

  async function handleCreate() {
    const message = validateStep(3) || validateStep(2) || validateStep(1);
    if (message) { setError(message); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const profile: OrganizationProfile = normalizeOrganizationProfile({
        legalName: draft.legalName,
        acronym: draft.acronym,
        addressLine: draft.addressLine,
        postalCode: draft.postalCode,
        contactName: draft.contactName,
        contactEmail: draft.contactEmail,
        contactPhone: draft.contactPhone,
        website: normalizeWebsite(draft.website),
        memberEstimate: Number(draft.memberEstimate || 0),
        sports: draft.sports,
        facilities: draft.facilities,
        foundedYear: draft.foundedYear,
        profileCompleted: true,
      });
      const inputPayload: OrganizationCreateInput = {
        name: draft.name,
        kind: draft.kind,
        plan: draft.plan,
        city: draft.city,
        countryCode: draft.countryCode,
        description: draft.description,
        profile,
      };
      const created = await createOrganization(userId, inputPayload);
      let organization = { ...created.organization, profile: normalizeOrganizationProfile({ ...created.organization.profile, ...profile }) };
      const prefs = loadStoragePrefs();
      const mirrorR2 = prefs.selectedDestination === "cloud_r2";
      let mediaWarning = "";
      let logoKey = "";
      let coverKey = "";

      if (logoPreview) {
        logoKey = organizationLogoMediaKey(organization.id);
        try {
          await captureUserMediaFallback(logoKey, logoPreview, { kind: "club_logo", mirrorR2, updatedAt: Date.now() });
        } catch {
          mediaWarning = L("Le logo est conservé localement mais sa copie R2 n’a pas pu être envoyée.", "The logo is kept locally but its R2 copy could not be uploaded.", "El logo se conserva localmente, pero no se pudo subir su copia a R2.");
        }
      }
      if (coverPreview) {
        coverKey = organizationCoverMediaKey(organization.id);
        try {
          await captureUserMediaFallback(coverKey, coverPreview, { kind: "club_cover", mirrorR2, updatedAt: Date.now() });
        } catch {
          mediaWarning = mediaWarning || L("La photo est conservée localement mais sa copie R2 n’a pas pu être envoyée.", "The photo is kept locally but its R2 copy could not be uploaded.", "La foto se conserva localmente, pero no se pudo subir su copia a R2.");
        }
      }

      const profileResult = await updateOrganizationProfile(userId, organization.id, {
        ...profile,
        logoMediaKey: logoKey,
        coverMediaKey: coverKey,
        profileCompleted: true,
      });
      organization = profileResult.organization;
      setOrganizations((prev) => [organization, ...prev.filter((item) => item.id !== organization.id)]);
      setCloudAvailable(created.cloudAvailable || profileResult.cloudAvailable);
      setActiveId(organization.id);
      setActiveOrganization(userId, organization.id);
      enterOrganizationWorkspace(userId, organization.id);
      setEntryMode("none");
      setView("home");
      const baseNotice = L("Organisation créée : la fiche organisme est prête.", "Organization created: the organization profile is ready.", "Organización creada: la ficha de la organización está lista.");
      setNotice([baseNotice, profileResult.warning, mediaWarning].filter(Boolean).join(" "));
      resetWizard();
      go?.("organization_home", { organizationId: organization.id, workspaceMode: true, view: "home" });
    } catch (e: any) {
      setError(String(e?.message || "Création impossible."));
    } finally { setBusy(false); }
  }

  async function handleJoin() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await joinOrganization(userId, joinCode);
      setOrganizations((prev) => [result.organization, ...prev.filter((item) => item.id !== result.organization.id)]);
      selectOrganization(result.organization.id);
      enterOrganizationWorkspace(userId, result.organization.id);
      setCloudAvailable(result.cloudAvailable);
      setNotice(result.warning || L("Organisation rejointe.", "Organization joined.", "Organización unida."));
      setJoinCode("");
      go?.("organization_home", { organizationId: result.organization.id, workspaceMode: true, view: "home" });
    } catch (e: any) {
      setError(String(e?.message || "Impossible de rejoindre cette organisation."));
    } finally { setBusy(false); }
  }

  function copyJoinCode() {
    if (!active?.joinCode) return;
    void navigator.clipboard?.writeText(active.joinCode).then(() => setNotice(L("Code d’invitation copié.", "Invitation code copied.", "Código de invitación copiado."))).catch(() => setNotice(active.joinCode));
  }

  async function addGroup() {
    if (!active) return;
    setError("");
    try {
      const result = await createOrganizationGroup(userId, active.id, groupName, groupSport);
      setGroupName(""); setGroupSport("Multisport"); setRefreshTick((v) => v + 1);
      if (result.cloudAvailable) setCloudAvailable(true);
      setOrganizations((prev) => prev.map((org) => org.id === active.id ? { ...org, groupCount: Math.max(org.groupCount, localGroups.length + 1) } : org));
    } catch (e: any) { setError(String(e?.message || "Création du groupe impossible.")); }
  }

  async function addEvent() {
    if (!active) return;
    setError("");
    try {
      const result = await createOrganizationEvent(userId, active.id, eventTitle, eventDate, eventLocation);
      setEventTitle(""); setEventDate(""); setEventLocation(""); setRefreshTick((v) => v + 1);
      if (result.cloudAvailable) setCloudAvailable(true);
      setOrganizations((prev) => prev.map((org) => org.id === active.id ? { ...org, eventCount: Math.max(org.eventCount, localEvents.length + 1) } : org));
    } catch (e: any) { setError(String(e?.message || "Création de l’événement impossible.")); }
  }

  const modules: Array<{ id: View; name: string; subtitle: string; hint?: string }> = [
    { id: "profile", name: L("Fiche organisme", "Organization profile", "Ficha de la organización"), subtitle: L("Identité, coordonnées, activités et visuels", "Identity, contacts, activities and visuals", "Identidad, contactos, actividades y visuales") },
    { id: "members", name: L("Membres", "Members", "Miembros"), subtitle: L("Invitations, rôles et effectifs", "Invites, roles and roster", "Invitaciones, roles y plantilla"), hint: String(Math.max(active?.memberCount || 0, 1)) },
    { id: "groups", name: L("Équipes & groupes", "Teams & groups", "Equipos y grupos"), subtitle: L("Sports, sections et groupes internes", "Sports, sections and internal groups", "Deportes, secciones y grupos internos"), hint: String(Math.max(active?.groupCount || 0, localGroups.length)) },
    { id: "calendar", name: L("Agenda", "Calendar", "Agenda"), subtitle: L("Entraînements, matchs et événements", "Training, matches and events", "Entrenamientos, partidos y eventos"), hint: String(Math.max(active?.eventCount || 0, localEvents.length)) },
    { id: "competitions", name: L("Compétitions", "Competitions", "Competiciones"), subtitle: L("Tournois, championnats, challenges", "Tournaments, leagues, challenges", "Torneos, ligas y retos") },
    { id: "stats", name: L("Classements & stats", "Rankings & stats", "Clasificaciones y estadísticas"), subtitle: L("Résultats MSS, records et performances", "MSS results, records and performance", "Resultados MSS, récords y rendimiento") },
    { id: "communication", name: L("Communication", "Communication", "Comunicación"), subtitle: L("Annonces et informations du groupe", "Group announcements and information", "Anuncios e información del grupo") },
    { id: "billing", name: L("Cotisations & paiements", "Fees & payments", "Cuotas y pagos"), subtitle: L("Suivi financier de l’organisation", "Organization payment tracking", "Seguimiento financiero de la organización") },
    { id: "sponsors", name: L("Sponsors & partenaires", "Sponsors & partners", "Patrocinadores y socios"), subtitle: L("Visibilité et offres partenaires", "Partner visibility and offers", "Visibilidad y ofertas de socios") },
    { id: "admin", name: L("Administration", "Administration", "Administración"), subtitle: L("Droits, identité et paramètres", "Permissions, identity and settings", "Permisos, identidad y ajustes") },
    { id: "offers", name: L("Offres MSS", "MSS plans", "Planes MSS"), subtitle: L("GROUP, CLUB, PRO et BUSINESS", "GROUP, CLUB, PRO and BUSINESS", "GROUP, CLUB, PRO y BUSINESS") },
  ];

  const fieldLabel = (title: string, optional = false) => <div style={{ color: theme.text, fontSize: 10.5, fontWeight: 950, marginBottom: 6 }}>{title}{optional ? <span style={{ color: theme.textSoft, fontWeight: 700 }}> · {L("optionnel", "optional", "opcional")}</span> : null}</div>;

  const wizardTitle = [
    L("Quel type d’organisme représentez-vous ?", "What type of organization do you represent?", "¿Qué tipo de organización representas?"),
    L("Commençons par son identité.", "Let’s start with its identity.", "Empecemos por su identidad."),
    L("Où se trouve l’organisme ?", "Where is the organization located?", "¿Dónde se encuentra la organización?"),
    L("Quelles activités allez-vous gérer ?", "Which activities will you manage?", "¿Qué actividades vas a gestionar?"),
    L("Qui sera le contact principal ?", "Who will be the main contact?", "¿Quién será el contacto principal?"),
    L("Donnez-lui une vraie identité visuelle.", "Give it a real visual identity.", "Dale una identidad visual real."),
    L("Quelle formule correspond à votre structure ?", "Which plan fits your organization?", "¿Qué plan se adapta a tu organización?"),
    L("Vérifiez la fiche avant création.", "Review the profile before creation.", "Revisa la ficha antes de crearla."),
  ][wizardStep];

  const renderWizardStep = () => {
    if (wizardStep === 0) return <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>{KIND_OPTIONS.map((kind) => <button key={kind.id} type="button" onClick={() => setKind(kind.id)} style={{ minHeight: 83, borderRadius: 14, border: `1px solid ${draft.kind === kind.id ? theme.primary : theme.borderSoft}`, background: draft.kind === kind.id ? `${theme.primary}15` : "rgba(255,255,255,.025)", color: draft.kind === kind.id ? theme.primary : theme.text, cursor: "pointer", textAlign: "left", padding: "11px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 26, height: 26, borderRadius: 999, border: `1px solid ${draft.kind === kind.id ? theme.primary : theme.borderSoft}`, background: "rgba(6,10,18,.9)", display: "grid", placeItems: "center", flexShrink: 0 }}><OrganizationTypeIcon kind={kind.id} size={12.5} color={draft.kind === kind.id ? theme.primary : theme.textSoft} strokeWidth={2.05} /></span><div style={{ fontSize: 8.5, fontWeight: 1000, opacity: .72, letterSpacing: .8 }}>{kind.short}</div></div><div style={{ marginTop: 7, fontSize: 11.5, fontWeight: 1000 }}>{kind.label}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 8.6, lineHeight: 1.35 }}>{kind.detail}</div></button>)}</div>;

    if (wizardStep === 1) return <div style={{ display: "grid", gap: 11 }}>
      <div>{fieldLabel(L("Nom public de l’organisme", "Public organization name", "Nombre público de la organización"))}<input autoFocus style={input} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder={L("Ex. Darts Club Grenoble", "e.g. Darts Club Grenoble", "Ej. Darts Club Grenoble")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px", gap: 8 }}><div>{fieldLabel(L("Raison sociale / nom officiel", "Legal / official name", "Razón social / nombre oficial"), true)}<input style={input} value={draft.legalName} onChange={(e) => setDraft((d) => ({ ...d, legalName: e.target.value }))} /></div><div>{fieldLabel(L("Sigle", "Acronym", "Sigla"), true)}<input style={input} value={draft.acronym} onChange={(e) => setDraft((d) => ({ ...d, acronym: e.target.value.toUpperCase() }))} placeholder="DCG" /></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "130px minmax(0,1fr)", gap: 8 }}><div>{fieldLabel(L("Année de création", "Founded", "Año de creación"), true)}<input inputMode="numeric" maxLength={4} style={input} value={draft.foundedYear} onChange={(e) => setDraft((d) => ({ ...d, foundedYear: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="2026" /></div><div>{fieldLabel(L("Présentation courte", "Short presentation", "Presentación breve"), true)}<input style={input} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder={L("Une phrase pour présenter la structure", "One sentence to present the organization", "Una frase para presentar la organización")} /></div></div>
    </div>;

    if (wizardStep === 2) return <div style={{ display: "grid", gap: 11 }}>
      <div>{fieldLabel(L("Adresse", "Address", "Dirección"), true)}<input style={input} value={draft.addressLine} onChange={(e) => setDraft((d) => ({ ...d, addressLine: e.target.value }))} placeholder={L("Rue, stade, gymnase, siège…", "Street, stadium, gym, headquarters…", "Calle, estadio, gimnasio, sede…")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "118px minmax(0,1fr) 82px", gap: 8 }}><div>{fieldLabel(L("Code postal", "Postal code", "Código postal"), true)}<input style={input} value={draft.postalCode} onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))} /></div><div>{fieldLabel(L("Ville", "City", "Ciudad"))}<input style={input} value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} /></div><div>{fieldLabel(L("Pays", "Country", "País"))}<input style={input} maxLength={2} value={draft.countryCode} onChange={(e) => setDraft((d) => ({ ...d, countryCode: e.target.value.toUpperCase() }))} placeholder="FR" /></div></div>
      <div>{fieldLabel(L("Installation / lieu principal", "Main facility / venue", "Instalación / lugar principal"), true)}<input style={input} value={draft.facilities} onChange={(e) => setDraft((d) => ({ ...d, facilities: e.target.value }))} placeholder={L("Ex. Gymnase Jean Moulin · 6 cibles de fléchettes", "e.g. Jean Moulin Gym · 6 dartboards", "Ej. Gimnasio Jean Moulin · 6 dianas")} /></div>
    </div>;

    if (wizardStep === 3) return <div style={{ display: "grid", gap: 12 }}>
      <div>{fieldLabel(L("Disciplines / activités", "Sports / activities", "Disciplinas / actividades"))}<div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{SPORTS.map((sport) => { const activeSport = draft.sports.includes(sport); return <button key={sport} type="button" onClick={() => toggleSport(sport)} style={{ minHeight: 44, borderRadius: 12, border: `1px solid ${activeSport ? theme.primary : theme.borderSoft}`, background: activeSport ? `${theme.primary}14` : "rgba(255,255,255,.025)", color: activeSport ? theme.primary : theme.text, fontWeight: 900, cursor: "pointer", padding: "8px" }}>{activeSport ? "✓ " : ""}{sport}</button>; })}</div></div>
      <div>{fieldLabel(L("Combien de membres / salariés / participants environ ?", "Approximately how many members / employees / participants?", "¿Aproximadamente cuántos miembros / empleados / participantes?"))}<input type="number" min="1" max="1000000" style={input} value={draft.memberEstimate} onChange={(e) => { const memberEstimate = e.target.value; setDraft((d) => ({ ...d, memberEstimate, plan: recommendedPlan(d.kind, Number(memberEstimate || 0)) })); }} /></div>
      <div style={{ borderRadius: 12, border: `1px solid ${theme.primary}33`, background: `${theme.primary}0b`, padding: 10, color: theme.textSoft, fontSize: 9.5 }}>{L("Cette estimation sert à préconfigurer l’espace. Elle ne crée aucun membre automatiquement.", "This estimate is used to preconfigure the space. It does not automatically create members.", "Esta estimación sirve para preconfigurar el espacio. No crea miembros automáticamente.")}</div>
    </div>;

    if (wizardStep === 4) return <div style={{ display: "grid", gap: 11 }}>
      <div>{fieldLabel(L("Nom du contact principal", "Main contact name", "Nombre del contacto principal"), true)}<input style={input} value={draft.contactName} onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))} placeholder={L("Président, responsable, gérant…", "President, manager, owner…", "Presidente, responsable, gerente…")} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><div>{fieldLabel(L("E-mail", "Email", "Correo"), true)}<input type="email" style={input} value={draft.contactEmail} onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))} /></div><div>{fieldLabel(L("Téléphone", "Phone", "Teléfono"), true)}<input type="tel" style={input} value={draft.contactPhone} onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))} /></div></div>
      <div>{fieldLabel(L("Site internet", "Website", "Sitio web"), true)}<input style={input} value={draft.website} onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))} placeholder="www.monsite.fr" /></div>
      <div style={{ color: theme.textSoft, fontSize: 9.3, lineHeight: 1.45 }}>{L("Ces coordonnées font partie de la fiche légère de l’organisation. Elles peuvent ensuite être masquées aux membres selon les droits.", "These contacts are lightweight organization profile data. They can later be hidden from members according to permissions.", "Estos datos forman parte de la ficha ligera de la organización y podrán ocultarse según los permisos.")}</div>
    </div>;

    if (wizardStep === 5) return <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1fr)", gap: 12, alignItems: "stretch" }}>
        <div style={{ ...card, padding: 10, minHeight: 132, display: "grid", placeItems: "center", overflow: "hidden" }}>{logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: 96, height: 96, objectFit: "contain", borderRadius: 18 }} /> : <div style={{ textAlign: "center", color: theme.textSoft, fontSize: 9 }}>{L("LOGO\nÉQUIPE / STRUCTURE", "TEAM / ORGANIZATION\nLOGO", "LOGO\nEQUIPO / ESTRUCTURA")}</div>}</div>
        <div>{fieldLabel(L("Logo de l’organisme", "Organization logo", "Logo de la organización"), true)}<input type="file" accept="image/*" onChange={(e) => chooseImage(e.target.files?.[0], "logo")} style={{ ...input, padding: 8 }} /><div style={{ marginTop: 7, color: theme.textSoft, fontSize: 9, lineHeight: 1.4 }}>{L("Idéal : image carrée, PNG ou WebP. Elle sera automatiquement redimensionnée.", "Ideal: square PNG or WebP. It will be resized automatically.", "Ideal: imagen cuadrada PNG o WebP. Se redimensionará automáticamente.")}</div></div>
      </div>
      <div style={{ ...card, minHeight: 158, overflow: "hidden", position: "relative", background: coverPreview ? `url(${coverPreview}) center/cover no-repeat` : "rgba(255,255,255,.025)" }}><div style={{ position: "absolute", inset: 0, background: coverPreview ? "linear-gradient(180deg, transparent 20%, rgba(0,0,0,.72))" : "transparent" }} /><div style={{ position: "relative", minHeight: 158, padding: 13, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}><div style={{ color: theme.text, fontWeight: 1000 }}>{draft.name || L("PHOTO DE L’ORGANISME", "ORGANIZATION PHOTO", "FOTO DE LA ORGANIZACIÓN")}</div><div style={{ color: theme.textSoft, fontSize: 9 }}>{L("Stade · gymnase · devanture · locaux · équipe", "Stadium · gym · storefront · premises · team", "Estadio · gimnasio · fachada · local · equipo")}</div></div></div>
      <div>{fieldLabel(L("Photo de couverture", "Cover photo", "Foto de portada"), true)}<input type="file" accept="image/*" onChange={(e) => chooseImage(e.target.files?.[0], "cover")} style={{ ...input, padding: 8 }} /></div>
      <div style={{ borderRadius: 12, border: `1px solid ${theme.primary}44`, background: `${theme.primary}0d`, padding: 11 }}><div style={{ color: theme.primary, fontSize: 9, fontWeight: 1000 }}>{L("STOCKAGE DES VISUELS", "VISUAL STORAGE", "ALMACENAMIENTO DE IMÁGENES")}</div><div style={{ marginTop: 4, color: theme.text, fontSize: 10.5, fontWeight: 900 }}>{storageDestination.label}</div><div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9, lineHeight: 1.4 }}>{storagePrefs.selectedDestination === "cloud_r2" ? L("Les images seront compressées puis envoyées vers Cloudflare R2. Supabase ne conservera que leur clé de référence.", "Images will be compressed and sent to Cloudflare R2. Supabase will store only their reference key.", "Las imágenes se comprimirán y se enviarán a Cloudflare R2. Supabase solo guardará su clave de referencia.") : L("Les images sont conservées dans le coffre média local et suivront la destination définie dans le Centre de stockage. Aucun fichier image n’est placé dans Supabase.", "Images are kept in the local media vault and follow the destination configured in Storage Center. No image file is stored in Supabase.", "Las imágenes se guardan en el almacén multimedia local y siguen el destino configurado. Ningún archivo se almacena en Supabase.")}</div></div>
    </div>;

    if (wizardStep === 6) return <div style={{ display: "grid", gap: 9 }}>{PLAN_OPTIONS.map((plan) => { const selected = draft.plan === plan.id; const recommended = recommendedPlan(draft.kind, Number(draft.memberEstimate || 0)) === plan.id; return <button key={plan.id} type="button" onClick={() => setDraft((d) => ({ ...d, plan: plan.id }))} style={{ ...card, padding: 13, cursor: "pointer", textAlign: "left", border: `1px solid ${selected ? theme.primary : theme.borderSoft}`, background: selected ? `${theme.primary}11` : cardBg, color: theme.text }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ color: selected ? theme.primary : theme.text, fontSize: 12, fontWeight: 1000 }}>{plan.title}</div><div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.6, lineHeight: 1.4 }}>{plan.subtitle}</div></div><div style={{ textAlign: "right" }}><div style={{ color: theme.primary, fontSize: 7.5, fontWeight: 1000 }}>{recommended ? L("CONSEILLÉ", "RECOMMENDED", "RECOMENDADO") : plan.audience}</div>{selected ? <div style={{ marginTop: 5, color: theme.primary, fontSize: 16 }}>✓</div> : null}</div></div></button>; })}<div style={{ color: theme.textSoft, fontSize: 9, lineHeight: 1.4 }}>{L("Le choix prépare l’offre commerciale. Aucun paiement n’est déclenché à cette étape.", "This selection prepares the commercial plan. No payment is triggered at this step.", "La selección prepara el plan comercial. No se realiza ningún pago en esta etapa.")}</div></div>;

    const contact = [draft.contactName, draft.contactEmail, draft.contactPhone].filter(Boolean).join(" · ") || "—";
    return <div style={{ display: "grid", gap: 11 }}>
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ minHeight: 150, position: "relative", background: coverPreview ? `url(${coverPreview}) center/cover no-repeat` : `linear-gradient(135deg, ${theme.primary}18, rgba(0,0,0,.42))` }}><div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.78))" }} /><div style={{ position: "absolute", left: 15, right: 15, bottom: 13, display: "grid", gridTemplateColumns: "70px minmax(0,1fr)", gap: 12, alignItems: "end" }}><div style={{ width: 68, height: 68, borderRadius: 18, border: `1px solid ${theme.primary}77`, background: "rgba(5,8,18,.85)", display: "grid", placeItems: "center", overflow: "hidden" }}>{logoPreview ? <img src={logoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: theme.primary, fontWeight: 1000, fontSize: 20 }}>{draft.acronym || draft.name.slice(0, 2).toUpperCase()}</span>}</div><div><div style={{ color: theme.primary, fontSize: 8.5, fontWeight: 1000, letterSpacing: 1 }}>{organizationKindLabel(draft.kind).toUpperCase()}</div><div style={{ marginTop: 3, color: theme.text, fontSize: 20, lineHeight: 1.05, fontWeight: 1000 }}>{draft.name}</div><div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.5 }}>{draft.city} · {draft.countryCode} · {organizationPlanLabel(draft.plan)}</div></div></div></div>
        <div style={{ padding: 14, display: "grid", gap: 10 }}>
          {draft.description ? <div style={{ color: theme.textSoft, fontSize: 10.2, lineHeight: 1.45 }}>{draft.description}</div> : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
            {[[L("ACTIVITÉS", "ACTIVITIES", "ACTIVIDADES"), draft.sports.join(", ")], [L("TAILLE", "SIZE", "TAMAÑO"), `~ ${draft.memberEstimate}`], [L("CONTACT", "CONTACT", "CONTACTO"), contact], [L("LIEU", "VENUE", "LUGAR"), [draft.facilities, draft.addressLine, draft.postalCode].filter(Boolean).join(" · ") || "—"]].map(([label, value]) => <div key={label} style={{ borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.18)", padding: 9 }}><div style={{ color: theme.primary, fontSize: 7.5, fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 3, color: theme.text, fontSize: 9.5, fontWeight: 850, lineHeight: 1.3, wordBreak: "break-word" }}>{value}</div></div>)}
          </div>
        </div>
      </div>
      <div style={{ borderRadius: 12, border: `1px solid ${theme.primary}33`, background: `${theme.primary}0a`, padding: 10, color: theme.textSoft, fontSize: 9.2, lineHeight: 1.45 }}>{L("En validant, MULTISPORTS SCORING crée l’organisation, génère son code d’invitation et prépare son Dashboard dédié. Les données lourdes restent hors Supabase.", "When confirmed, MULTISPORTS SCORING creates the organization, generates its invitation code and prepares its dedicated Dashboard. Heavy data stays outside Supabase.", "Al confirmar, MULTISPORTS SCORING crea la organización, genera su código de invitación y prepara su Dashboard. Los datos pesados quedan fuera de Supabase.")}</div>
    </div>;
  };

  const renderCreateWizard = () => (
    <div style={{ ...card, padding: 16, background: `linear-gradient(145deg, ${theme.primary}0e, rgba(0,0,0,.14)), ${cardBg}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><div style={{ color: theme.primary, fontSize: 8.5, fontWeight: 1000, letterSpacing: 1.2 }}>{L("CRÉATION GUIDÉE", "GUIDED SETUP", "CREACIÓN GUIADA")} · {wizardStep + 1}/{WIZARD_STEPS}</div><div style={{ marginTop: 5, color: theme.text, fontSize: 19, lineHeight: 1.1, fontWeight: 1000 }}>{wizardTitle}</div></div><button type="button" onClick={() => { setEntryMode("none"); resetWizard(); }} style={{ ...secondaryButton, width: 38, minHeight: 38, padding: 0 }}>×</button></div>
      <div style={{ marginTop: 12, height: 5, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}><div style={{ width: `${((wizardStep + 1) / WIZARD_STEPS) * 100}%`, height: "100%", borderRadius: 999, background: theme.primary, boxShadow: `0 0 12px ${theme.primary}` }} /></div>
      <div style={{ marginTop: 16 }}>{renderWizardStep()}</div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: wizardStep === 0 ? "1fr" : "1fr 1.45fr", gap: 8 }}>
        {wizardStep > 0 ? <button type="button" style={secondaryButton} onClick={() => { setError(""); setWizardStep((step) => Math.max(0, step - 1)); }}>‹ {L("PRÉCÉDENT", "BACK", "ANTERIOR")}</button> : null}
        {wizardStep < WIZARD_STEPS - 1 ? <button type="button" style={primaryButton} onClick={nextWizardStep}>{L("CONTINUER", "CONTINUE", "CONTINUAR")} ›</button> : <button type="button" disabled={busy} style={{ ...primaryButton, opacity: busy ? .55 : 1 }} onClick={() => void handleCreate()}>{busy ? "…" : L("CRÉER MON ORGANISATION", "CREATE MY ORGANIZATION", "CREAR MI ORGANIZACIÓN")}</button>}
      </div>
    </div>
  );

  const renderEntry = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {entryMode === "create" ? renderCreateWizard() : <>
        <div style={{ ...card, padding: 17, background: `linear-gradient(145deg, ${theme.primary}13, rgba(0,0,0,.18)), ${cardBg}` }}>
          <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1.35, color: theme.primary }}>MULTISPORTS SCORING · ORGANISATIONS</div>
          <div style={{ marginTop: 8, fontSize: 24, lineHeight: 1.05, fontWeight: 1000, color: theme.text }}>{L("Passez du joueur au collectif.", "Move from player to organization.", "Pasa del jugador a la organización.")}</div>
          <div style={{ marginTop: 9, fontSize: 11.5, lineHeight: 1.55, color: theme.textSoft }}>{L("Créez une vraie identité pour votre club, association, entreprise, bar, école ou événement. L’assistant vous guide jusqu’à une fiche prête à utiliser.", "Create a real identity for your club, association, company, venue, school or event. The assistant guides you to a ready-to-use profile.", "Crea una identidad real para tu club, asociación, empresa, local, escuela o evento. El asistente te guía hasta una ficha lista para usar.")}</div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}><button type="button" style={primaryButton} onClick={startCreate}>{L("CRÉER", "CREATE", "CREAR")}</button><button type="button" style={secondaryButton} onClick={() => { setEntryMode("join"); setError(""); }}>{L("REJOINDRE", "JOIN", "UNIRSE")}</button></div>
        </div>
        {entryMode === "join" ? <div style={{ ...card, padding: 15 }}><div style={{ color: theme.primary, fontSize: 14, fontWeight: 1000 }}>{L("REJOINDRE UNE ORGANISATION", "JOIN AN ORGANIZATION", "UNIRSE A UNA ORGANIZACIÓN")}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 10.5 }}>{L("Saisis le code d’invitation communiqué par un administrateur.", "Enter the invitation code provided by an administrator.", "Introduce el código de invitación proporcionado por un administrador.")}</div><input style={{ ...input, marginTop: 12, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 950 }} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="MSS-XXXXXXXX" /><div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}><button type="button" style={secondaryButton} onClick={() => setEntryMode("none")}>{L("ANNULER", "CANCEL", "CANCELAR")}</button><button type="button" disabled={busy} style={{ ...primaryButton, opacity: busy ? .55 : 1 }} onClick={() => void handleJoin()}>{busy ? "…" : L("REJOINDRE", "JOIN", "UNIRSE")}</button></div></div> : null}
        <div style={{ ...card, padding: 15 }}><div style={{ color: theme.text, fontSize: 12.5, fontWeight: 1000 }}>{L("POUR QUI ?", "WHO IS IT FOR?", "¿PARA QUIÉN?")}</div><div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{KIND_OPTIONS.map((kind) => <div key={kind.id} style={{ minHeight: 54, borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: "9px 10px" }}><div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 22, height: 22, borderRadius: 999, border: `1px solid ${theme.primary}55`, background: "rgba(6,10,18,.9)", display: "grid", placeItems: "center", flexShrink: 0 }}><OrganizationTypeIcon kind={kind.id} size={10.5} color={theme.primary} strokeWidth={2.05} /></span><div style={{ color: theme.primary, fontSize: 8, fontWeight: 1000, letterSpacing: .8 }}>{kind.short}</div></div><div style={{ marginTop: 5, color: theme.text, fontSize: 10.5, fontWeight: 900 }}>{kind.label}</div></div>)}</div></div>
      </>}
    </div>
  );

  const renderHome = () => {
    if (!active) return renderEntry();
    const metrics = [[L("MEMBRES", "MEMBERS", "MIEMBROS"), Math.max(active.memberCount, 1)], [L("GROUPES", "GROUPS", "GRUPOS"), Math.max(active.groupCount, localGroups.length)], [L("ÉVÉNEMENTS", "EVENTS", "EVENTOS"), Math.max(active.eventCount, localEvents.length)], [L("SOURCE", "SOURCE", "ORIGEN"), active.source === "cloud" ? "CLOUD" : "LOCAL"]] as const;
    return <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...card, overflow: "hidden", background: cardBg }}>
        <div style={{ minHeight: activeCover ? 164 : 112, position: "relative", background: activeCover ? `url(${activeCover}) center/cover no-repeat` : `linear-gradient(145deg, ${theme.primary}16, rgba(0,0,0,.2))` }}><div style={{ position: "absolute", inset: 0, background: activeCover ? "linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.78))" : "transparent" }} /><div style={{ position: "absolute", left: 14, right: 14, bottom: 13, display: "grid", gridTemplateColumns: "68px minmax(0,1fr) auto", gap: 11, alignItems: "end" }}><div style={{ width: 66, height: 66, borderRadius: 18, border: `1px solid ${theme.primary}88`, background: "rgba(4,8,16,.88)", display: "grid", placeItems: "center", overflow: "hidden" }}>{activeLogo ? <img src={activeLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: theme.primary, fontSize: 19, fontWeight: 1000 }}>{active.profile.acronym || active.name.slice(0, 2).toUpperCase()}</span>}</div><div style={{ minWidth: 0 }}><div style={{ color: theme.primary, fontSize: 8.2, fontWeight: 1000, letterSpacing: 1.1 }}>MODE ORGANISATION</div><div style={{ marginTop: 3, color: theme.text, fontSize: 21, fontWeight: 1000, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis" }}>{active.name}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9.5 }}>{organizationKindLabel(active.kind)} · {organizationPlanLabel(active.plan)} · {organizationRoleLabel(active.role)}</div></div><div style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${cloudAvailable ? theme.primary : theme.borderSoft}`, color: cloudAvailable ? theme.primary : theme.textSoft, fontSize: 8, fontWeight: 1000 }}>{cloudAvailable ? "SYNC" : "LOCAL"}</div></div></div>
        <div style={{ padding: 14 }}>
          {active.description ? <div style={{ color: theme.textSoft, fontSize: 10.5, lineHeight: 1.45 }}>{active.description}</div> : null}
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>{metrics.map(([label, value]) => <div key={label} style={{ minWidth: 0, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.22)", padding: "8px 6px", textAlign: "center" }}><div style={{ color: theme.primary, fontSize: 14, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 7.2, fontWeight: 900 }}>{label}</div></div>)}</div>
          <button type="button" onClick={copyJoinCode} style={{ ...secondaryButton, width: "100%", marginTop: 10, minHeight: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{L("CODE D’INVITATION", "INVITATION CODE", "CÓDIGO DE INVITACIÓN")}</span><strong style={{ color: theme.primary, letterSpacing: 1 }}>{active.joinCode || "—"}</strong></button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>{modules.map((module) => <button key={module.id} type="button" onClick={() => navigateView(module.id)} style={{ ...card, minHeight: 104, padding: 11, border: `1px solid ${theme.borderSoft}`, color: theme.text, cursor: "pointer", textAlign: "left", display: "grid", gridTemplateColumns: "38px minmax(0,1fr)", alignItems: "start", gap: 7 }}><ModuleIcon name={module.id} color={theme.primary}/><div style={{ minWidth: 0 }}><div style={{ display: "flex", gap: 5, alignItems: "center", justifyContent: "space-between" }}><div style={{ color: theme.primary, fontSize: 10.5, fontWeight: 1000, lineHeight: 1.15 }}>{module.name}</div>{module.hint ? <span style={{ minWidth: 22, textAlign: "center", borderRadius: 999, background: `${theme.primary}12`, color: theme.primary, fontSize: 8, fontWeight: 1000, padding: "3px 5px" }}>{module.hint}</span> : null}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9, lineHeight: 1.35 }}>{module.subtitle}</div></div></button>)}</div>
    </div>;
  };

  const sectionHeader = (title: string, subtitle: string) => <div style={{ ...card, padding: 14 }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><button type="button" onClick={() => navigateView("home")} style={{ ...secondaryButton, minHeight: 36, padding: "7px 10px" }}>‹</button><div><div style={{ color: theme.primary, fontWeight: 1000, fontSize: 13 }}>{title}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.5 }}>{subtitle}</div></div></div></div>;

  const renderProfile = () => {
    if (!active) return null;
    const p = active.profile;
    const rows = [
      [L("Type", "Type", "Tipo"), organizationKindLabel(active.kind)],
      [L("Nom officiel", "Legal name", "Nombre oficial"), p.legalName || active.name],
      [L("Sigle", "Acronym", "Sigla"), p.acronym || "—"],
      [L("Création", "Founded", "Creación"), p.foundedYear || "—"],
      [L("Adresse", "Address", "Dirección"), [p.addressLine, p.postalCode, active.city, active.countryCode].filter(Boolean).join(" · ")],
      [L("Lieu principal", "Main venue", "Lugar principal"), p.facilities || "—"],
      [L("Activités", "Activities", "Actividades"), p.sports.length ? p.sports.join(", ") : "—"],
      [L("Taille estimée", "Estimated size", "Tamaño estimado"), p.memberEstimate ? `~ ${p.memberEstimate}` : "—"],
      [L("Contact", "Contact", "Contacto"), [p.contactName, p.contactEmail, p.contactPhone].filter(Boolean).join(" · ") || "—"],
      [L("Site", "Website", "Sitio"), p.website || "—"],
      [L("Stockage médias", "Media storage", "Almacenamiento multimedia"), getStorageDestination(loadStoragePrefs().selectedDestination).shortLabel],
    ];
    return <div style={{ display: "grid", gap: 10 }}>{sectionHeader(L("FICHE ORGANISME", "ORGANIZATION PROFILE", "FICHA DE LA ORGANIZACIÓN"), active.name)}<div style={{ ...card, overflow: "hidden" }}><div style={{ minHeight: 160, background: activeCover ? `url(${activeCover}) center/cover no-repeat` : `linear-gradient(135deg, ${theme.primary}16, rgba(0,0,0,.35))`, position: "relative" }}><div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.74))" }} /><div style={{ position: "absolute", left: 14, bottom: 12, display: "flex", gap: 11, alignItems: "center" }}><div style={{ width: 72, height: 72, borderRadius: 18, border: `1px solid ${theme.primary}88`, background: "rgba(5,8,18,.88)", display: "grid", placeItems: "center", overflow: "hidden" }}>{activeLogo ? <img src={activeLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <strong style={{ color: theme.primary, fontSize: 20 }}>{p.acronym || active.name.slice(0, 2).toUpperCase()}</strong>}</div><div><div style={{ color: theme.primary, fontSize: 8, fontWeight: 1000 }}>{organizationPlanLabel(active.plan)}</div><div style={{ color: theme.text, fontSize: 18, fontWeight: 1000 }}>{active.name}</div></div></div></div><div style={{ padding: 14, display: "grid", gap: 7 }}>{rows.map(([label, value]) => <div key={label} style={{ display: "grid", gridTemplateColumns: "105px minmax(0,1fr)", gap: 9, padding: "7px 0", borderBottom: `1px solid ${theme.borderSoft}` }}><div style={{ color: theme.textSoft, fontSize: 8.5, fontWeight: 900 }}>{label}</div><div style={{ color: theme.text, fontSize: 9.8, fontWeight: 850, lineHeight: 1.35, wordBreak: "break-word" }}>{value}</div></div>)}</div></div></div>;
  };

  const renderSection = () => {
    if (!active) return renderEntry();
    if (view === "home") return renderHome();
    if (view === "profile") return renderProfile();
    if (view === "groups") return <div style={{ display: "grid", gap: 10 }}>{sectionHeader(L("ÉQUIPES & GROUPES", "TEAMS & GROUPS", "EQUIPOS Y GRUPOS"), active.name)}<div style={{ ...card, padding: 14 }}><div style={{ color: theme.text, fontSize: 11, fontWeight: 1000 }}>{L("Créer un groupe", "Create a group", "Crear un grupo")}</div><div style={{ marginTop: 9, display: "grid", gap: 8 }}><input style={input} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={L("Ex. Équipe A / Section Darts", "e.g. Team A / Darts section", "Ej. Equipo A / Sección Darts")} /><select style={input} value={groupSport} onChange={(e) => setGroupSport(e.target.value)}>{SPORTS.map((sport) => <option key={sport}>{sport}</option>)}</select><button type="button" style={primaryButton} onClick={() => void addGroup()}>{L("AJOUTER LE GROUPE", "ADD GROUP", "AÑADIR GRUPO")}</button></div></div>{localGroups.length ? localGroups.map((group) => <div key={group.id} style={{ ...card, padding: 12, display: "flex", justifyContent: "space-between", gap: 8 }}><div><div style={{ color: theme.text, fontSize: 11, fontWeight: 950 }}>{group.name}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 9 }}>{group.sportId}</div></div><span style={{ color: theme.primary, fontSize: 8, fontWeight: 1000 }}>ACTIF</span></div>) : <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10.5 }}>{L("Aucun groupe créé pour le moment.", "No group created yet.", "Aún no se ha creado ningún grupo.")}</div>}</div>;
    if (view === "calendar") return <div style={{ display: "grid", gap: 10 }}>{sectionHeader(L("AGENDA ORGANISATION", "ORGANIZATION CALENDAR", "AGENDA DE LA ORGANIZACIÓN"), active.name)}<div style={{ ...card, padding: 14 }}><div style={{ color: theme.text, fontSize: 11, fontWeight: 1000 }}>{L("Planifier un événement", "Schedule an event", "Programar un evento")}</div><div style={{ marginTop: 9, display: "grid", gap: 8 }}><input style={input} value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder={L("Entraînement, match, tournoi…", "Training, match, tournament…", "Entrenamiento, partido, torneo…")} /><input type="datetime-local" style={input} value={eventDate} onChange={(e) => setEventDate(e.target.value)} /><input style={input} value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder={L("Lieu (optionnel)", "Location (optional)", "Lugar (opcional)")} /><button type="button" style={primaryButton} onClick={() => void addEvent()}>{L("AJOUTER À L’AGENDA", "ADD TO CALENDAR", "AÑADIR A LA AGENDA")}</button></div></div>{localEvents.length ? localEvents.map((evt) => <div key={evt.id} style={{ ...card, padding: 12 }}><div style={{ color: theme.text, fontSize: 11, fontWeight: 950 }}>{evt.title}</div><div style={{ marginTop: 4, color: theme.primary, fontSize: 9.5, fontWeight: 850 }}>{new Date(evt.startsAt).toLocaleString()}</div>{evt.location ? <div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9 }}>{evt.location}</div> : null}</div>) : <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10.5 }}>{L("Aucun événement planifié.", "No scheduled events.", "No hay eventos programados.")}</div>}</div>;
    if (view === "offers") return <div style={{ display: "grid", gap: 10 }}>{sectionHeader(L("OFFRES MULTISPORTS SCORING", "MULTISPORTS SCORING PLANS", "PLANES MULTISPORTS SCORING"), L("Architecture prête pour la souscription B2B", "Architecture ready for B2B subscription", "Arquitectura lista para suscripción B2B"))}{PLAN_OPTIONS.map((plan) => <div key={plan.id} style={{ ...card, padding: 14, border: `1px solid ${active.plan === plan.id ? theme.primary : theme.borderSoft}` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ color: theme.primary, fontSize: 12, fontWeight: 1000 }}>{plan.title}</div><div style={{ marginTop: 4, color: theme.textSoft, fontSize: 10, lineHeight: 1.4 }}>{plan.subtitle}</div></div><div style={{ color: active.plan === plan.id ? theme.primary : theme.textSoft, fontSize: 8, fontWeight: 1000 }}>{active.plan === plan.id ? L("SÉLECTIONNÉ", "SELECTED", "SELECCIONADO") : plan.audience}</div></div></div>)}</div>;

    const generic: Record<Exclude<View, "home" | "profile" | "groups" | "calendar" | "offers">, { title: string; subtitle: string; bullets: string[] }> = {
      members: { title: L("MEMBRES & RÔLES", "MEMBERS & ROLES", "MIEMBROS Y ROLES"), subtitle: active.name, bullets: [L("Propriétaire, administrateur, responsable/coach, capitaine, membre et invité.", "Owner, admin, manager/coach, captain, member and guest.", "Propietario, administrador, responsable/entrenador, capitán, miembro e invitado."), L("Invitation par code déjà câblée dans cette V1.", "Join-by-code is already wired in this V1.", "La invitación por código ya está conectada en esta V1."), `${L("Effectif actuel", "Current roster", "Plantilla actual")}: ${Math.max(active.memberCount, 1)}`] },
      competitions: { title: L("COMPÉTITIONS", "COMPETITIONS", "COMPETICIONES"), subtitle: active.name, bullets: [L("Tournois, championnats, poules, élimination directe et challenges internes.", "Tournaments, leagues, groups, knockouts and internal challenges.", "Torneos, ligas, grupos, eliminatorias y retos internos."), L("Les futurs résultats pourront être reliés directement aux parties MSS via organization_id, sans placer les historiques lourds dans Supabase.", "Future results can link directly to MSS matches via organization_id without storing heavy history in Supabase.", "Los resultados futuros podrán vincularse a partidas MSS mediante organization_id sin guardar historiales pesados en Supabase.")] },
      stats: { title: L("CLASSEMENTS & STATISTIQUES", "RANKINGS & STATISTICS", "CLASIFICACIONES Y ESTADÍSTICAS"), subtitle: active.name, bullets: [L("Classements organisation, records, séries, confrontations et performances par discipline.", "Organization rankings, records, streaks, head-to-head and per-sport performance.", "Clasificaciones, récords, rachas, enfrentamientos y rendimiento por disciplina."), L("Les agrégats légers pourront être indexés ; les historiques détaillés restent dans R2 ou le stockage choisi.", "Light aggregates can be indexed; detailed history remains in R2 or the selected storage.", "Los agregados ligeros podrán indexarse; el historial detallado queda en R2 o en el almacenamiento elegido.")] },
      communication: { title: L("COMMUNICATION", "COMMUNICATION", "COMUNICACIÓN"), subtitle: active.name, bullets: [L("Annonces générales, informations par équipe et notifications.", "General announcements, team information and notifications.", "Anuncios generales, información por equipo y notificaciones."), L("Les rôles permettront de contrôler qui peut publier.", "Roles will control who can publish.", "Los roles controlarán quién puede publicar.")] },
      billing: { title: L("COTISATIONS & PAIEMENTS", "FEES & PAYMENTS", "CUOTAS Y PAGOS"), subtitle: active.name, bullets: [L("Structure prête pour cotisations, inscriptions, licences et suivi des règlements.", "Structure ready for fees, registrations, licenses and payment tracking.", "Estructura lista para cuotas, inscripciones, licencias y seguimiento de pagos."), L("Le paiement réel sera branché sur la couche billing existante quand les offres/prix seront figés.", "Real payment will connect to the existing billing layer once plans/prices are finalized.", "El pago real se conectará a la capa de facturación existente cuando se definan los planes/precios.")] },
      sponsors: { title: L("SPONSORS & PARTENAIRES", "SPONSORS & PARTNERS", "PATROCINADORES Y SOCIOS"), subtitle: active.name, bullets: [L("Logos, offres partenaires et visibilité configurable dans l’espace organisation.", "Logos, partner offers and configurable visibility in the organization space.", "Logos, ofertas de socios y visibilidad configurable en el espacio de la organización."), L("Compatible avec le futur mode VENUE pour bars, pubs et salles.", "Compatible with the future VENUE mode for bars, pubs and halls.", "Compatible con el futuro modo VENUE para bares, pubs y salas.")] },
      admin: { title: L("ADMINISTRATION", "ADMINISTRATION", "ADMINISTRACIÓN"), subtitle: active.name, bullets: [L("Identité, type d’organisation, rôles, droits et paramètres.", "Identity, organization type, roles, permissions and settings.", "Identidad, tipo de organización, roles, permisos y ajustes."), `${L("Ton rôle", "Your role", "Tu rol")}: ${organizationRoleLabel(active.role)}`, `${L("Isolation des données", "Data isolation", "Aislamiento de datos")}: organization_id`, `${L("Médias", "Media", "Multimedia")}: ${getStorageDestination(loadStoragePrefs().selectedDestination).shortLabel}`] },
    };
    const data = generic[view as keyof typeof generic];
    return <div style={{ display: "grid", gap: 10 }}>{sectionHeader(data.title, data.subtitle)}<div style={{ ...card, padding: 15 }}><div style={{ display: "grid", gap: 9 }}>{data.bullets.map((line, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "8px minmax(0,1fr)", gap: 8, color: theme.textSoft, fontSize: 10.5, lineHeight: 1.45 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: theme.primary, boxShadow: `0 0 8px ${theme.primary}`, marginTop: 5 }}/><span>{line}</span></div>)}</div></div></div>;
  };

  return (
    <div style={{ minHeight: "100vh", background: pageBg, color: theme.text, padding: "14px 12px 104px" }}>
      <div style={{ width: "100%", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <BackDot size={40} onClick={() => {
            if (entryMode !== "none") { setEntryMode("none"); resetWizard(); return; }
            if (view !== "home") { navigateView("home"); return; }
            if (workspaceMode) {
              enterPersonalWorkspace(userId);
              setActiveOrganization(userId, null);
              go?.("home", { workspaceKind: "personal" });
              return;
            }
            go?.("settings");
          }} />
          <div style={{ minWidth: 0 }}><div style={{ color: theme.primary, fontSize: 15, fontWeight: 1000, letterSpacing: .75 }}>{workspaceMode ? (active?.name || L("ESPACE ORGANISATION", "ORGANIZATION SPACE", "ESPACIO ORGANIZACIÓN")) : L("PARTENARIATS & ORGANISATIONS", "PARTNERSHIPS & ORGANIZATIONS", "ALIANZAS Y ORGANIZACIONES")}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.5 }}>{workspaceMode ? L("Espace collectif connecté à MULTISPORTS SCORING", "Collective space connected to MULTISPORTS SCORING", "Espacio colectivo conectado a MULTISPORTS SCORING") : L("Club · Association · Entreprise · Bar · École · Événement", "Club · Association · Company · Venue · School · Event", "Club · Asociación · Empresa · Local · Escuela · Evento")}</div></div>
          {!workspaceMode && organizations.length && entryMode !== "create" ? <button type="button" onClick={startCreate} style={{ ...primaryButton, minHeight: 36, padding: "7px 10px", fontSize: 9 }}>+ {L("CRÉER", "CREATE", "CREAR")}</button> : <span/>}
        </div>

        {!workspaceMode && organizations.length > 0 && entryMode !== "create" ? <div style={{ ...card, padding: 9, marginBottom: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}><select aria-label={L("Organisation active", "Active organization", "Organización activa")} style={{ ...input, minHeight: 38, padding: "7px 9px", fontWeight: 900 }} value={active?.id || ""} onChange={(e) => selectOrganization(e.target.value)}>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name} · {organizationKindLabel(org.kind)}</option>)}</select><button type="button" style={{ ...secondaryButton, minHeight: 38, padding: "7px 10px", fontSize: 9 }} onClick={() => { setEntryMode("join"); setView("home"); }}>{L("REJOINDRE", "JOIN", "UNIRSE")}</button></div> : null}

        {notice ? <div style={{ marginBottom: 10, borderRadius: 12, border: `1px solid ${theme.primary}44`, background: `${theme.primary}0d`, color: theme.textSoft, padding: "9px 10px", fontSize: 9.5, lineHeight: 1.4 }}>{notice}</div> : null}
        {error ? <div style={{ marginBottom: 10, borderRadius: 12, border: "1px solid rgba(255,90,90,.55)", background: "rgba(255,60,60,.08)", color: "#ffb3b3", padding: "9px 10px", fontSize: 9.5, lineHeight: 1.4 }}>{error}</div> : null}

        {entryMode !== "none" || organizations.length === 0 ? renderEntry() : renderSection()}
      </div>
    </div>
  );
}
