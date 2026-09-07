import React from "react";
import BackDot from "../components/BackDot";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { useAuthOnline } from "../hooks/useAuthOnline";
import {
  addLocalOrganizationEvent,
  addLocalOrganizationGroup,
  createOrganization,
  joinOrganization,
  listLocalOrganizationEvents,
  listLocalOrganizationGroups,
  listMyOrganizations,
  loadOrganizationLocalState,
  organizationKindLabel,
  organizationPlanLabel,
  organizationRoleLabel,
  setActiveOrganization,
  type OrganizationCreateInput,
  type OrganizationKind,
  type OrganizationPlan,
  type OrganizationRecord,
} from "../organizations/organizationService";

type Props = { go?: (tab: any, params?: any) => void; params?: any };
type View = "home" | "members" | "groups" | "calendar" | "competitions" | "stats" | "communication" | "billing" | "sponsors" | "admin" | "offers";
type EntryMode = "none" | "create" | "join";

const KIND_OPTIONS: Array<{ id: OrganizationKind; label: string; short: string }> = [
  { id: "club", label: "Club sportif", short: "CLUB" },
  { id: "association", label: "Association", short: "ASSO" },
  { id: "company", label: "Entreprise", short: "PRO" },
  { id: "venue", label: "Bar / Pub / Salle", short: "VENUE" },
  { id: "school", label: "École / Université", short: "EDU" },
  { id: "local_authority", label: "Collectivité", short: "CITY" },
  { id: "organizer", label: "Organisateur", short: "EVENT" },
  { id: "other", label: "Autre", short: "MSS" },
];

const PLAN_OPTIONS: Array<{ id: OrganizationPlan; title: string; subtitle: string; audience: string }> = [
  { id: "group", title: "MSS GROUP", subtitle: "Pour démarrer avec un petit groupe ou une équipe.", audience: "PETITS GROUPES" },
  { id: "club", title: "MSS CLUB", subtitle: "Gestion structurée d’un club ou d’une association.", audience: "CLUBS & ASSOS" },
  { id: "pro", title: "MSS PRO", subtitle: "Multi-équipes, compétitions et pilotage avancé.", audience: "STRUCTURES" },
  { id: "business", title: "MSS BUSINESS", subtitle: "Challenges internes, événements et lieux partenaires.", audience: "ENTREPRISES / BARS" },
  { id: "custom", title: "SUR MESURE", subtitle: "Fédération, réseau, collectivité ou déploiement spécifique.", audience: "GRANDS COMPTES" },
];

const SPORTS = ["Multisport", "Fléchettes", "Baby-foot", "Ping-pong", "Pétanque", "Mölkky", "Running", "FIT PERF", "Football", "Autre"];

function ModuleIcon({ name, color }: { name: string; color: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
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

export default function OrganizationsPage({ go }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const auth = useAuthOnline() as any;
  const userId = String(auth?.userId || auth?.user?.id || "") || null;
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);

  const [organizations, setOrganizations] = React.useState<OrganizationRecord[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(() => loadOrganizationLocalState(userId).activeOrganizationId);
  const [view, setView] = React.useState<View>("home");
  const [entryMode, setEntryMode] = React.useState<EntryMode>("none");
  const [busy, setBusy] = React.useState(false);
  const [cloudAvailable, setCloudAvailable] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const [createForm, setCreateForm] = React.useState<OrganizationCreateInput>({ name: "", kind: "club", plan: "club", city: "", countryCode: "FR", description: "" });
  const [joinCode, setJoinCode] = React.useState("");
  const [groupName, setGroupName] = React.useState("");
  const [groupSport, setGroupSport] = React.useState("Multisport");
  const [eventTitle, setEventTitle] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [eventLocation, setEventLocation] = React.useState("");
  const [refreshTick, setRefreshTick] = React.useState(0);

  const active = React.useMemo(() => organizations.find((org) => org.id === activeId) || organizations[0] || null, [organizations, activeId]);
  const localGroups = React.useMemo(() => active ? listLocalOrganizationGroups(userId, active.id) : [], [active, userId, refreshTick]);
  const localEvents = React.useMemo(() => active ? listLocalOrganizationEvents(userId, active.id) : [], [active, userId, refreshTick]);

  const load = React.useCallback(async () => {
    const result = await listMyOrganizations(userId);
    setOrganizations(result.organizations);
    setCloudAvailable(result.cloudAvailable);
    if (result.warning) setNotice(result.warning);
    const localActive = loadOrganizationLocalState(userId).activeOrganizationId;
    const nextId = localActive && result.organizations.some((org) => org.id === localActive) ? localActive : result.organizations[0]?.id || null;
    setActiveId(nextId);
  }, [userId]);

  React.useEffect(() => { void load(); }, [load]);

  const pageBg = theme.pageBackground || "radial-gradient(circle at 50% -10%, rgba(34,230,255,.12), transparent 45%), #050812";
  const cardBg = theme.cardBackground || theme.card;
  const card: React.CSSProperties = { borderRadius: 18, border: `1px solid ${theme.borderSoft}`, background: cardBg, boxShadow: `0 16px 34px rgba(0,0,0,.42), 0 0 18px ${theme.primary}14` };
  const input: React.CSSProperties = { width: "100%", minHeight: 43, borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.28)", color: theme.text, padding: "10px 12px", outline: "none", fontSize: 12, boxSizing: "border-box" };
  const primaryButton: React.CSSProperties = { minHeight: 44, borderRadius: 13, border: `1px solid ${theme.primary}88`, background: `linear-gradient(135deg, ${theme.primary}22, ${theme.primary}10)`, color: theme.primary, fontWeight: 1000, letterSpacing: .35, cursor: "pointer", padding: "10px 14px" };
  const secondaryButton: React.CSSProperties = { ...primaryButton, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.035)", color: theme.text };

  function selectOrganization(id: string) {
    setActiveId(id);
    setActiveOrganization(userId, id);
    setView("home");
    setEntryMode("none");
    setError("");
  }

  async function handleCreate() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await createOrganization(userId, createForm);
      setOrganizations((prev) => [result.organization, ...prev.filter((item) => item.id !== result.organization.id)]);
      selectOrganization(result.organization.id);
      setCloudAvailable(result.cloudAvailable);
      setNotice(result.warning || L("Organisation créée. L’espace Organisation est actif.", "Organization created. Organization mode is active.", "Organización creada. El modo Organización está activo."));
      setCreateForm({ name: "", kind: "club", plan: "club", city: "", countryCode: "FR", description: "" });
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
      setCloudAvailable(result.cloudAvailable);
      setNotice(result.warning || L("Organisation rejointe.", "Organization joined.", "Organización unida."));
      setJoinCode("");
    } catch (e: any) {
      setError(String(e?.message || "Impossible de rejoindre cette organisation."));
    } finally { setBusy(false); }
  }

  function copyJoinCode() {
    if (!active?.joinCode) return;
    void navigator.clipboard?.writeText(active.joinCode).then(() => setNotice(L("Code d’invitation copié.", "Invitation code copied.", "Código de invitación copiado."))).catch(() => setNotice(active.joinCode));
  }

  function addGroup() {
    if (!active) return;
    setError("");
    try {
      addLocalOrganizationGroup(userId, active.id, groupName, groupSport);
      setGroupName("");
      setGroupSport("Multisport");
      setRefreshTick((v) => v + 1);
      setOrganizations((prev) => prev.map((org) => org.id === active.id ? { ...org, groupCount: Math.max(org.groupCount, localGroups.length + 1) } : org));
    } catch (e: any) { setError(String(e?.message || "Création du groupe impossible.")); }
  }

  function addEvent() {
    if (!active) return;
    setError("");
    try {
      addLocalOrganizationEvent(userId, active.id, eventTitle, eventDate, eventLocation);
      setEventTitle(""); setEventDate(""); setEventLocation("");
      setRefreshTick((v) => v + 1);
      setOrganizations((prev) => prev.map((org) => org.id === active.id ? { ...org, eventCount: Math.max(org.eventCount, localEvents.length + 1) } : org));
    } catch (e: any) { setError(String(e?.message || "Création de l’événement impossible.")); }
  }

  const modules: Array<{ id: View; name: string; subtitle: string; hint?: string }> = [
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

  const renderEntry = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...card, padding: 17, background: `linear-gradient(145deg, ${theme.primary}13, rgba(0,0,0,.18)), ${cardBg}` }}>
        <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 1.35, color: theme.primary }}>MULTISPORTS SCORING · ORGANISATIONS</div>
        <div style={{ marginTop: 8, fontSize: 24, lineHeight: 1.05, fontWeight: 1000, color: theme.text }}>{L("Passez du joueur au collectif.", "Move from player to organization.", "Pasa del jugador a la organización.")}</div>
        <div style={{ marginTop: 9, fontSize: 11.5, lineHeight: 1.55, color: theme.textSoft }}>{L("Clubs, associations, entreprises, bars, salles, écoles et organisateurs disposent d’un espace dédié pour gérer leurs membres, équipes, événements, compétitions et statistiques MULTISPORTS SCORING.", "Clubs, associations, companies, venues, schools and organizers get a dedicated space to manage members, teams, events, competitions and MULTISPORTS SCORING statistics.", "Clubes, asociaciones, empresas, locales, escuelas y organizadores disponen de un espacio dedicado para gestionar miembros, equipos, eventos, competiciones y estadísticas MULTISPORTS SCORING.")}</div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
          <button type="button" style={primaryButton} onClick={() => { setEntryMode("create"); setError(""); }}>{L("CRÉER", "CREATE", "CREAR")}</button>
          <button type="button" style={secondaryButton} onClick={() => { setEntryMode("join"); setError(""); }}>{L("REJOINDRE", "JOIN", "UNIRSE")}</button>
        </div>
      </div>

      {entryMode === "create" ? (
        <div style={{ ...card, padding: 15 }}>
          <div style={{ color: theme.primary, fontSize: 14, fontWeight: 1000 }}>{L("CRÉER UNE ORGANISATION", "CREATE AN ORGANIZATION", "CREAR UNA ORGANIZACIÓN")}</div>
          <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 10.5 }}>{L("L’espace sera associé à ton compte et pourra ensuite accueillir des membres.", "The space will be linked to your account and can then welcome members.", "El espacio se vinculará a tu cuenta y podrá recibir miembros.")}</div>
          <div style={{ marginTop: 12, display: "grid", gap: 9 }}>
            <input style={input} value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder={L("Nom du club / entreprise / association", "Club / company / association name", "Nombre del club / empresa / asociación")} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {KIND_OPTIONS.map((kind) => <button key={kind.id} type="button" onClick={() => setCreateForm((f) => ({ ...f, kind: kind.id }))} style={{ minHeight: 48, borderRadius: 12, border: `1px solid ${createForm.kind === kind.id ? theme.primary : theme.borderSoft}`, background: createForm.kind === kind.id ? `${theme.primary}12` : "rgba(255,255,255,.025)", color: createForm.kind === kind.id ? theme.primary : theme.text, cursor: "pointer", textAlign: "left", padding: "8px 10px" }}><div style={{ fontSize: 8, fontWeight: 1000, opacity: .65 }}>{kind.short}</div><div style={{ marginTop: 2, fontSize: 10.5, fontWeight: 950 }}>{kind.label}</div></button>)}
            </div>
            <select style={input} value={createForm.plan} onChange={(e) => setCreateForm((f) => ({ ...f, plan: e.target.value as OrganizationPlan }))}>{PLAN_OPTIONS.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 82px", gap: 8 }}><input style={input} value={createForm.city || ""} onChange={(e) => setCreateForm((f) => ({ ...f, city: e.target.value }))} placeholder={L("Ville", "City", "Ciudad")} /><input style={input} value={createForm.countryCode || "FR"} maxLength={2} onChange={(e) => setCreateForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))} placeholder="FR" /></div>
            <textarea style={{ ...input, minHeight: 76, resize: "vertical" }} value={createForm.description || ""} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} placeholder={L("Description courte de l’organisation (optionnel)", "Short organization description (optional)", "Descripción breve de la organización (opcional)")} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}><button type="button" style={secondaryButton} onClick={() => setEntryMode("none")}>{L("ANNULER", "CANCEL", "CANCELAR")}</button><button type="button" disabled={busy} style={{ ...primaryButton, opacity: busy ? .55 : 1 }} onClick={() => void handleCreate()}>{busy ? "…" : L("CRÉER L’ESPACE", "CREATE SPACE", "CREAR ESPACIO")}</button></div>
          </div>
        </div>
      ) : null}

      {entryMode === "join" ? (
        <div style={{ ...card, padding: 15 }}>
          <div style={{ color: theme.primary, fontSize: 14, fontWeight: 1000 }}>{L("REJOINDRE UNE ORGANISATION", "JOIN AN ORGANIZATION", "UNIRSE A UNA ORGANIZACIÓN")}</div>
          <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 10.5 }}>{L("Saisis le code d’invitation communiqué par un administrateur.", "Enter the invitation code provided by an administrator.", "Introduce el código de invitación proporcionado por un administrador.")}</div>
          <input style={{ ...input, marginTop: 12, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 950 }} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="MSS-XXXXXXXX" />
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}><button type="button" style={secondaryButton} onClick={() => setEntryMode("none")}>{L("ANNULER", "CANCEL", "CANCELAR")}</button><button type="button" disabled={busy} style={{ ...primaryButton, opacity: busy ? .55 : 1 }} onClick={() => void handleJoin()}>{busy ? "…" : L("REJOINDRE", "JOIN", "UNIRSE")}</button></div>
        </div>
      ) : null}

      <div style={{ ...card, padding: 15 }}>
        <div style={{ color: theme.text, fontSize: 12.5, fontWeight: 1000 }}>{L("POUR QUI ?", "WHO IS IT FOR?", "¿PARA QUIÉN?")}</div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{KIND_OPTIONS.map((kind) => <div key={kind.id} style={{ minHeight: 54, borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: "9px 10px" }}><div style={{ color: theme.primary, fontSize: 8, fontWeight: 1000, letterSpacing: .8 }}>{kind.short}</div><div style={{ marginTop: 3, color: theme.text, fontSize: 10.5, fontWeight: 900 }}>{kind.label}</div></div>)}</div>
      </div>
    </div>
  );

  const renderHome = () => {
    if (!active) return renderEntry();
    const metrics = [
      [L("MEMBRES", "MEMBERS", "MIEMBROS"), Math.max(active.memberCount, 1)],
      [L("GROUPES", "GROUPS", "GRUPOS"), Math.max(active.groupCount, localGroups.length)],
      [L("ÉVÉNEMENTS", "EVENTS", "EVENTOS"), Math.max(active.eventCount, localEvents.length)],
      [L("SOURCE", "SOURCE", "ORIGEN"), active.source === "cloud" ? "CLOUD" : "LOCAL"],
    ] as const;
    return <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...card, padding: 15, background: `linear-gradient(145deg, ${theme.primary}14, rgba(0,0,0,.16)), ${cardBg}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}><div style={{ color: theme.primary, fontSize: 9, fontWeight: 1000, letterSpacing: 1.1 }}>MODE ORGANISATION</div><div style={{ marginTop: 4, color: theme.text, fontSize: 22, fontWeight: 1000, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis" }}>{active.name}</div><div style={{ marginTop: 6, color: theme.textSoft, fontSize: 10.5 }}>{organizationKindLabel(active.kind)} · {organizationPlanLabel(active.plan)} · {organizationRoleLabel(active.role)}</div></div>
          <div style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${cloudAvailable ? theme.primary : theme.borderSoft}`, color: cloudAvailable ? theme.primary : theme.textSoft, fontSize: 8, fontWeight: 1000 }}>{cloudAvailable ? "SYNC" : "LOCAL"}</div>
        </div>
        {active.description ? <div style={{ marginTop: 10, color: theme.textSoft, fontSize: 10.5, lineHeight: 1.45 }}>{active.description}</div> : null}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>{metrics.map(([label, value]) => <div key={label} style={{ minWidth: 0, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.22)", padding: "8px 6px", textAlign: "center" }}><div style={{ color: theme.primary, fontSize: 14, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 7.2, fontWeight: 900 }}>{label}</div></div>)}</div>
        <button type="button" onClick={copyJoinCode} style={{ ...secondaryButton, width: "100%", marginTop: 10, minHeight: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{L("CODE D’INVITATION", "INVITATION CODE", "CÓDIGO DE INVITACIÓN")}</span><strong style={{ color: theme.primary, letterSpacing: 1 }}>{active.joinCode || "—"}</strong></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>{modules.map((module) => <button key={module.id} type="button" onClick={() => setView(module.id)} style={{ ...card, minHeight: 104, padding: 11, border: `1px solid ${theme.borderSoft}`, color: theme.text, cursor: "pointer", textAlign: "left", display: "grid", gridTemplateColumns: "38px minmax(0,1fr)", alignItems: "start", gap: 7 }}><ModuleIcon name={module.id} color={theme.primary}/><div style={{ minWidth: 0 }}><div style={{ display: "flex", gap: 5, alignItems: "center", justifyContent: "space-between" }}><div style={{ color: theme.primary, fontSize: 10.5, fontWeight: 1000, lineHeight: 1.15 }}>{module.name}</div>{module.hint ? <span style={{ minWidth: 22, textAlign: "center", borderRadius: 999, background: `${theme.primary}12`, color: theme.primary, fontSize: 8, fontWeight: 1000, padding: "3px 5px" }}>{module.hint}</span> : null}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9, lineHeight: 1.35 }}>{module.subtitle}</div></div></button>)}</div>
    </div>;
  };

  const sectionHeader = (title: string, subtitle: string) => <div style={{ ...card, padding: 14 }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><button type="button" onClick={() => setView("home")} style={{ ...secondaryButton, minHeight: 36, padding: "7px 10px" }}>‹</button><div><div style={{ color: theme.primary, fontWeight: 1000, fontSize: 13 }}>{title}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.5 }}>{subtitle}</div></div></div></div>;

  const renderSection = () => {
    if (!active) return renderEntry();
    if (view === "home") return renderHome();
    if (view === "groups") return <div style={{ display: "grid", gap: 10 }}>{sectionHeader(L("ÉQUIPES & GROUPES", "TEAMS & GROUPS", "EQUIPOS Y GRUPOS"), active.name)}<div style={{ ...card, padding: 14 }}><div style={{ color: theme.text, fontSize: 11, fontWeight: 1000 }}>{L("Créer un groupe", "Create a group", "Crear un grupo")}</div><div style={{ marginTop: 9, display: "grid", gap: 8 }}><input style={input} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={L("Ex. Équipe A / Section Darts", "e.g. Team A / Darts section", "Ej. Equipo A / Sección Darts")} /><select style={input} value={groupSport} onChange={(e) => setGroupSport(e.target.value)}>{SPORTS.map((sport) => <option key={sport}>{sport}</option>)}</select><button type="button" style={primaryButton} onClick={addGroup}>{L("AJOUTER LE GROUPE", "ADD GROUP", "AÑADIR GRUPO")}</button></div></div>{localGroups.length ? localGroups.map((group) => <div key={group.id} style={{ ...card, padding: 12, display: "flex", justifyContent: "space-between", gap: 8 }}><div><div style={{ color: theme.text, fontSize: 11, fontWeight: 950 }}>{group.name}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 9 }}>{group.sportId}</div></div><span style={{ color: theme.primary, fontSize: 8, fontWeight: 1000 }}>ACTIF</span></div>) : <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10.5 }}>{L("Aucun groupe créé pour le moment.", "No group created yet.", "Aún no se ha creado ningún grupo.")}</div>}</div>;
    if (view === "calendar") return <div style={{ display: "grid", gap: 10 }}>{sectionHeader(L("AGENDA ORGANISATION", "ORGANIZATION CALENDAR", "AGENDA DE LA ORGANIZACIÓN"), active.name)}<div style={{ ...card, padding: 14 }}><div style={{ color: theme.text, fontSize: 11, fontWeight: 1000 }}>{L("Planifier un événement", "Schedule an event", "Programar un evento")}</div><div style={{ marginTop: 9, display: "grid", gap: 8 }}><input style={input} value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder={L("Entraînement, match, tournoi…", "Training, match, tournament…", "Entrenamiento, partido, torneo…")} /><input type="datetime-local" style={input} value={eventDate} onChange={(e) => setEventDate(e.target.value)} /><input style={input} value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder={L("Lieu (optionnel)", "Location (optional)", "Lugar (opcional)")} /><button type="button" style={primaryButton} onClick={addEvent}>{L("AJOUTER À L’AGENDA", "ADD TO CALENDAR", "AÑADIR A LA AGENDA")}</button></div></div>{localEvents.length ? localEvents.map((evt) => <div key={evt.id} style={{ ...card, padding: 12 }}><div style={{ color: theme.text, fontSize: 11, fontWeight: 950 }}>{evt.title}</div><div style={{ marginTop: 4, color: theme.primary, fontSize: 9.5, fontWeight: 850 }}>{new Date(evt.startsAt).toLocaleString()}</div>{evt.location ? <div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9 }}>{evt.location}</div> : null}</div>) : <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10.5 }}>{L("Aucun événement planifié.", "No scheduled events.", "No hay eventos programados.")}</div>}</div>;
    if (view === "offers") return <div style={{ display: "grid", gap: 10 }}>{sectionHeader(L("OFFRES MULTISPORTS SCORING", "MULTISPORTS SCORING PLANS", "PLANES MULTISPORTS SCORING"), L("Architecture prête pour la souscription B2B", "Architecture ready for B2B subscription", "Arquitectura lista para suscripción B2B"))}{PLAN_OPTIONS.map((plan) => <div key={plan.id} style={{ ...card, padding: 14, border: `1px solid ${active.plan === plan.id ? theme.primary : theme.borderSoft}` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ color: theme.primary, fontSize: 12, fontWeight: 1000 }}>{plan.title}</div><div style={{ marginTop: 4, color: theme.textSoft, fontSize: 10, lineHeight: 1.4 }}>{plan.subtitle}</div></div><div style={{ color: active.plan === plan.id ? theme.primary : theme.textSoft, fontSize: 8, fontWeight: 1000 }}>{active.plan === plan.id ? L("SÉLECTIONNÉ", "SELECTED", "SELECCIONADO") : plan.audience}</div></div></div>)}</div>;

    const generic: Record<Exclude<View, "home" | "groups" | "calendar" | "offers">, { title: string; subtitle: string; bullets: string[] }> = {
      members: { title: L("MEMBRES & RÔLES", "MEMBERS & ROLES", "MIEMBROS Y ROLES"), subtitle: active.name, bullets: [L("Propriétaire, administrateur, responsable/coach, capitaine, membre et invité.", "Owner, admin, manager/coach, captain, member and guest.", "Propietario, administrador, responsable/entrenador, capitán, miembro e invitado."), L("Invitation par code déjà câblée dans cette V1.", "Join-by-code is already wired in this V1.", "La invitación por código ya está conectada en esta V1."), `${L("Effectif actuel", "Current roster", "Plantilla actual")}: ${Math.max(active.memberCount, 1)}`] },
      competitions: { title: L("COMPÉTITIONS", "COMPETITIONS", "COMPETICIONES"), subtitle: active.name, bullets: [L("Tournois, championnats, poules, élimination directe et challenges internes.", "Tournaments, leagues, groups, knockouts and internal challenges.", "Torneos, ligas, grupos, eliminatorias y retos internos."), L("Les futurs résultats pourront être reliés directement aux parties MSS.", "Future results can be linked directly to MSS matches.", "Los resultados futuros podrán vincularse directamente a partidas MSS.")] },
      stats: { title: L("CLASSEMENTS & STATISTIQUES", "RANKINGS & STATISTICS", "CLASIFICACIONES Y ESTADÍSTICAS"), subtitle: active.name, bullets: [L("Classements organisation, records, séries, confrontations et performances par discipline.", "Organization rankings, records, streaks, head-to-head and per-sport performance.", "Clasificaciones, récords, rachas, enfrentamientos y rendimiento por disciplina."), L("Socle prévu pour rattacher les historiques de parties via organization_id.", "Core prepared to link match history via organization_id.", "Base preparada para vincular historiales mediante organization_id.")] },
      communication: { title: L("COMMUNICATION", "COMMUNICATION", "COMUNICACIÓN"), subtitle: active.name, bullets: [L("Annonces générales, informations par équipe et notifications.", "General announcements, team information and notifications.", "Anuncios generales, información por equipo y notificaciones."), L("Les rôles permettront de contrôler qui peut publier.", "Roles will control who can publish.", "Los roles controlarán quién puede publicar.")] },
      billing: { title: L("COTISATIONS & PAIEMENTS", "FEES & PAYMENTS", "CUOTAS Y PAGOS"), subtitle: active.name, bullets: [L("Structure prête pour cotisations, inscriptions, licences et suivi des règlements.", "Structure ready for fees, registrations, licenses and payment tracking.", "Estructura lista para cuotas, inscripciones, licencias y seguimiento de pagos."), L("Le paiement réel sera branché sur la couche billing existante quand les offres/prix seront figés.", "Real payment will connect to the existing billing layer once plans/prices are finalized.", "El pago real se conectará a la capa de facturación existente cuando se definan los planes/precios.")] },
      sponsors: { title: L("SPONSORS & PARTENAIRES", "SPONSORS & PARTNERS", "PATROCINADORES Y SOCIOS"), subtitle: active.name, bullets: [L("Logos, offres partenaires et visibilité configurable dans l’espace organisation.", "Logos, partner offers and configurable visibility in the organization space.", "Logos, ofertas de socios y visibilidad configurable en el espacio de la organización."), L("Compatible avec le futur mode VENUE pour bars, pubs et salles.", "Compatible with the future VENUE mode for bars, pubs and halls.", "Compatible con el futuro modo VENUE para bares, pubs y salas.")] },
      admin: { title: L("ADMINISTRATION", "ADMINISTRATION", "ADMINISTRACIÓN"), subtitle: active.name, bullets: [L("Identité, type d’organisation, rôles, droits et paramètres.", "Identity, organization type, roles, permissions and settings.", "Identidad, tipo de organización, roles, permisos y ajustes."), `${L("Ton rôle", "Your role", "Tu rol")}: ${organizationRoleLabel(active.role)}`, `${L("Isolation des données", "Data isolation", "Aislamiento de datos")}: organization_id`] },
    };
    const data = generic[view as keyof typeof generic];
    return <div style={{ display: "grid", gap: 10 }}>{sectionHeader(data.title, data.subtitle)}<div style={{ ...card, padding: 15 }}><div style={{ display: "grid", gap: 9 }}>{data.bullets.map((line, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "8px minmax(0,1fr)", gap: 8, color: theme.textSoft, fontSize: 10.5, lineHeight: 1.45 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: theme.primary, boxShadow: `0 0 8px ${theme.primary}`, marginTop: 5 }}/><span>{line}</span></div>)}</div></div></div>;
  };

  return (
    <div style={{ minHeight: "100vh", background: pageBg, color: theme.text, padding: "14px 12px 104px" }}>
      <div style={{ width: "100%", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <BackDot size={40} onClick={() => view !== "home" ? setView("home") : go?.("settings")} />
          <div style={{ minWidth: 0 }}><div style={{ color: theme.primary, fontSize: 15, fontWeight: 1000, letterSpacing: .75 }}>{L("PARTENARIATS & ORGANISATIONS", "PARTNERSHIPS & ORGANIZATIONS", "ALIANZAS Y ORGANIZACIONES")}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.5 }}>{L("Club · Association · Entreprise · Bar · École · Événement", "Club · Association · Company · Venue · School · Event", "Club · Asociación · Empresa · Local · Escuela · Evento")}</div></div>
          {organizations.length ? <button type="button" onClick={() => { setEntryMode("create"); setView("home"); }} style={{ ...primaryButton, minHeight: 36, padding: "7px 10px", fontSize: 9 }}>+ {L("CRÉER", "CREATE", "CREAR")}</button> : <span/>}
        </div>

        {organizations.length > 0 ? <div style={{ ...card, padding: 9, marginBottom: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}><select aria-label={L("Organisation active", "Active organization", "Organización activa")} style={{ ...input, minHeight: 38, padding: "7px 9px", fontWeight: 900 }} value={active?.id || ""} onChange={(e) => selectOrganization(e.target.value)}>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name} · {organizationKindLabel(org.kind)}</option>)}</select><button type="button" style={{ ...secondaryButton, minHeight: 38, padding: "7px 10px", fontSize: 9 }} onClick={() => { setEntryMode("join"); setView("home"); }}>{L("REJOINDRE", "JOIN", "UNIRSE")}</button></div> : null}

        {notice ? <div style={{ marginBottom: 10, borderRadius: 12, border: `1px solid ${theme.primary}44`, background: `${theme.primary}0d`, color: theme.textSoft, padding: "9px 10px", fontSize: 9.5, lineHeight: 1.4 }}>{notice}</div> : null}
        {error ? <div style={{ marginBottom: 10, borderRadius: 12, border: "1px solid rgba(255,90,90,.55)", background: "rgba(255,60,60,.08)", color: "#ffb3b3", padding: "9px 10px", fontSize: 9.5, lineHeight: 1.4 }}>{error}</div> : null}

        {entryMode !== "none" && organizations.length > 0 ? renderEntry() : renderSection()}
      </div>
    </div>
  );
}
