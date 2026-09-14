import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  deleteOrganizationFederationLink,
  getOrganizationCompetitionDetail,
  listOrganizationCompetitions,
  listOrganizationFederationLinks,
  saveOrganizationFederationLink,
  type OrganizationCompetition,
  type OrganizationCompetitionDetail,
  type OrganizationFederationIntegrationMode,
  type OrganizationFederationLink,
  type OrganizationFederationStatus,
  type OrganizationRecord,
} from "../organizations/organizationService";

type FederationPreset = {
  code: string;
  name: string;
  countryCode: string;
  portalUrl: string;
  connectorKey: string;
  mode: OrganizationFederationIntegrationMode;
};

const PRESETS: FederationPreset[] = [
  { code: "FFTT", name: "Fédération Française de Tennis de Table", countryCode: "FR", portalUrl: "https://monclub.fftt.com/", connectorKey: "fftt", mode: "portal" },
  { code: "FFF", name: "Fédération Française de Football", countryCode: "FR", portalUrl: "https://fmi.fff.fr/", connectorKey: "fff", mode: "portal" },
  { code: "FFPJP", name: "Fédération Française de Pétanque et Jeu Provençal", countryCode: "FR", portalUrl: "https://moncompte.ffpjp.org/", connectorKey: "ffpjp", mode: "portal" },
  { code: "FFD", name: "Fédération Française de Darts", countryCode: "FR", portalUrl: "https://www.ffdarts.fr/", connectorKey: "ffdarts", mode: "portal" },
];


type OfficialResultSource = {
  label: string;
  detail: string;
  url: string;
};

const OFFICIAL_RESULT_SOURCES: Record<string, OfficialResultSource[]> = {
  fftt: [
    { label: "Résultats FFTT", detail: "Épreuves par équipes et individuelles en accès libre dans MonClub / SPID.", url: "https://monclub.fftt.com/" },
  ],
  fff: [
    { label: "Résultats FFF", detail: "Résultats, calendriers, classements et fiches équipes sur le portail officiel des épreuves.", url: "https://epreuves.fff.fr/" },
  ],
  ffpjp: [
    { label: "Compétitions FFPJP", detail: "Recherche des concours fédéraux nationaux, calendriers et compétitions officielles.", url: "https://compet.ffpjp.org/compet" },
  ],
  ffdarts: [
    { label: "Classements FFD", detail: "Classements nationaux officiels par catégorie.", url: "https://www.ffdarts.fr/classement/" },
    { label: "Calendrier FFD", detail: "Calendrier des événements et compétitions organisés sous l’égide de la FFD.", url: "https://www.ffdarts.fr/calendrier/" },
  ],
};

function federationResultSources(link: OrganizationFederationLink | null): OfficialResultSource[] {
  if (!link) return [];
  const connector = String(link.connectorKey || "").trim().toLowerCase();
  const code = String(link.federationCode || "").trim().toLowerCase();
  const keyed = OFFICIAL_RESULT_SOURCES[connector] || OFFICIAL_RESULT_SOURCES[code] || [];
  if (keyed.length) return keyed;
  return link.portalUrl ? [{ label: "Portail officiel", detail: "Consulter les résultats et informations disponibles sur le portail de la fédération.", url: link.portalUrl }] : [];
}

function fmtDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function currentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

export default function OrganizationFederationsPanel({ organization, userId }: { organization: OrganizationRecord; userId: string | null }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const canManage = ["owner", "admin"].includes(organization.role);

  const [links, setLinks] = React.useState<OrganizationFederationLink[]>([]);
  const [competitions, setCompetitions] = React.useState<OrganizationCompetition[]>([]);
  const [detail, setDetail] = React.useState<OrganizationCompetitionDetail | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = React.useState("");
  const [selectedFixtureId, setSelectedFixtureId] = React.useState("");
  const [selectedLinkId, setSelectedLinkId] = React.useState("");
  const [editingId, setEditingId] = React.useState("");
  const [federationName, setFederationName] = React.useState("");
  const [federationCode, setFederationCode] = React.useState("");
  const [countryCode, setCountryCode] = React.useState("FR");
  const [season, setSeason] = React.useState(currentSeason());
  const [affiliationNumber, setAffiliationNumber] = React.useState("");
  const [externalClubId, setExternalClubId] = React.useState("");
  const [portalUrl, setPortalUrl] = React.useState("");
  const [integrationMode, setIntegrationMode] = React.useState<OrganizationFederationIntegrationMode>("portal");
  const [connectorKey, setConnectorKey] = React.useState("");
  const [status, setStatus] = React.useState<OrganizationFederationStatus>("pending");
  const [loading, setLoading] = React.useState(true);
  const [action, setAction] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.cardBackground || theme.card,
    boxShadow: `0 16px 34px rgba(0,0,0,.34), 0 0 16px ${theme.primary}0d`,
  };
  const input: React.CSSProperties = {
    width: "100%",
    minHeight: 41,
    borderRadius: 12,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,.28)",
    color: theme.text,
    padding: "9px 10px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: 10.2,
  };
  const button: React.CSSProperties = { minHeight: 36, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.035)", color: theme.text, fontWeight: 900, fontSize: 9, padding: "7px 10px", cursor: "pointer" };
  const primaryButton: React.CSSProperties = { ...button, border: `1px solid ${theme.primary}`, color: theme.primary, background: `${theme.primary}13` };

  const refresh = React.useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [fedResult, compResult] = await Promise.all([
        listOrganizationFederationLinks(userId, organization.id),
        listOrganizationCompetitions(userId, organization.id),
      ]);
      setLinks(fedResult.links);
      setCompetitions(compResult.competitions);
      if (!selectedLinkId && fedResult.links[0]) setSelectedLinkId(fedResult.links[0].id);
    } catch (e: any) {
      setError(String(e?.message || L("Impossible de charger les affiliations.", "Unable to load affiliations.", "No se pueden cargar las afiliaciones.")));
    } finally { setLoading(false); }
  }, [organization.id, selectedLinkId, userId, L]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const reset = () => {
    setEditingId(""); setFederationName(""); setFederationCode(""); setCountryCode("FR"); setSeason(currentSeason());
    setAffiliationNumber(""); setExternalClubId(""); setPortalUrl(""); setIntegrationMode("portal"); setConnectorKey(""); setStatus("pending");
  };

  const applyPreset = (preset: FederationPreset) => {
    setFederationName(preset.name); setFederationCode(preset.code); setCountryCode(preset.countryCode); setPortalUrl(preset.portalUrl); setConnectorKey(preset.connectorKey); setIntegrationMode(preset.mode);
  };

  const edit = (link: OrganizationFederationLink) => {
    setEditingId(link.id); setFederationName(link.federationName); setFederationCode(link.federationCode); setCountryCode(link.countryCode); setSeason(link.season);
    setAffiliationNumber(link.affiliationNumber); setExternalClubId(link.externalClubId); setPortalUrl(link.portalUrl); setIntegrationMode(link.integrationMode); setConnectorKey(link.connectorKey); setStatus(link.status);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!canManage) return;
    if (federationName.trim().length < 2) { setError(L("Indique le nom de la fédération.", "Enter the federation name.", "Indica el nombre de la federación.")); return; }
    setAction("save"); setError(""); setNotice("");
    try {
      const saved = await saveOrganizationFederationLink(userId, organization.id, {
        id: editingId || null,
        federationName, federationCode, countryCode, season, affiliationNumber, externalClubId, portalUrl,
        integrationMode, connectorKey, status,
      });
      setNotice(editingId ? L("Affiliation mise à jour.", "Affiliation updated.", "Afiliación actualizada.") : L("Affiliation ajoutée.", "Affiliation added.", "Afiliación añadida."));
      reset();
      setSelectedLinkId(saved.id);
      await refresh();
    } catch (e: any) { setError(String(e?.message || L("Enregistrement impossible.", "Save failed.", "No se pudo guardar."))); }
    finally { setAction(""); }
  };

  const remove = async (link: OrganizationFederationLink) => {
    if (!canManage || !window.confirm(L("Supprimer cette affiliation de MSS ? Cela ne résilie rien auprès de la fédération.", "Remove this affiliation from MSS? This does not cancel anything with the federation.", "¿Eliminar esta afiliación de MSS? Esto no cancela nada con la federación."))) return;
    setAction(`delete:${link.id}`); setError("");
    try { await deleteOrganizationFederationLink(userId, link.id); if (selectedLinkId === link.id) setSelectedLinkId(""); await refresh(); }
    catch (e: any) { setError(String(e?.message || L("Suppression impossible.", "Deletion failed.", "No se pudo eliminar."))); }
    finally { setAction(""); }
  };

  const loadCompetition = async (id: string) => {
    setSelectedCompetitionId(id); setSelectedFixtureId(""); setDetail(null);
    if (!id) return;
    setAction("competition"); setError("");
    try { setDetail(await getOrganizationCompetitionDetail(userId, id)); }
    catch (e: any) { setError(String(e?.message || L("Compétition indisponible.", "Competition unavailable.", "Competición no disponible."))); }
    finally { setAction(""); }
  };

  const selectedLink = links.find((link) => link.id === selectedLinkId) || null;
  const selectedOfficialSources = federationResultSources(selectedLink);
  const completedFixtures = detail?.fixtures.filter((fixture) => fixture.status === "completed") || [];
  const selectedFixture = completedFixtures.find((fixture) => fixture.id === selectedFixtureId) || null;

  const resultPackage = React.useMemo(() => {
    if (!selectedLink || !detail || !selectedFixture) return null;
    return {
      schema: "mss-federation-result-v1",
      generatedAt: new Date().toISOString(),
      federation: {
        name: selectedLink.federationName,
        code: selectedLink.federationCode,
        countryCode: selectedLink.countryCode,
        season: selectedLink.season,
        affiliationNumber: selectedLink.affiliationNumber,
        externalClubId: selectedLink.externalClubId,
      },
      organization: { id: organization.id, name: organization.name },
      competition: { id: detail.competition.id, name: detail.competition.name, sport: detail.competition.sportId, format: detail.competition.format },
      fixture: {
        id: selectedFixture.id,
        scheduledAt: selectedFixture.scheduledAt,
        home: selectedFixture.homeName,
        away: selectedFixture.awayName,
        winnerParticipantId: selectedFixture.winnerParticipantId,
        score: selectedFixture.scoreLabel,
        resultRef: selectedFixture.resultRef,
      },
    };
  }, [detail, organization.id, organization.name, selectedFixture, selectedLink]);

  const copyPackage = async () => {
    if (!resultPackage) return;
    try { await navigator.clipboard.writeText(JSON.stringify(resultPackage, null, 2)); setNotice(L("Paquet résultat copié.", "Result package copied.", "Paquete de resultado copiado.")); }
    catch { setError(L("Copie impossible sur cet appareil.", "Unable to copy on this device.", "No se puede copiar en este dispositivo.")); }
  };

  const downloadPackage = () => {
    if (!resultPackage) return;
    const blob = new Blob([JSON.stringify(resultPackage, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `mss-federation-result-${selectedFixture?.id || "result"}.json`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, padding: 14 }}>
      <div style={{ color: theme.primary, fontSize: 8.2, fontWeight: 1000, letterSpacing: 1.05 }}>{L("FÉDÉRATIONS & AFFILIATIONS", "FEDERATIONS & AFFILIATIONS", "FEDERACIONES Y AFILIACIONES")}</div>
      <div style={{ marginTop: 4, color: theme.text, fontSize: 16, fontWeight: 1000 }}>{organization.name}</div>
      <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9.2, lineHeight: 1.5 }}>{L("MSS peut mémoriser l'affiliation et préparer les résultats. L'écriture directe dans le système d'une fédération n'est activée que si cette fédération fournit un accès partenaire/API autorisé.", "MSS can store the affiliation and prepare results. Direct writing to a federation system is only enabled when the federation provides an authorized partner/API access.", "MSS puede guardar la afiliación y preparar resultados. La escritura directa en el sistema federativo solo se activa con acceso API/partner autorizado.")}</div>
      <div style={{ marginTop: 8, borderRadius: 12, border: `1px solid ${theme.primary}55`, background: `${theme.primary}0c`, padding: 9, color: theme.textSoft, fontSize: 8.4, lineHeight: 1.45 }}><strong style={{ color: theme.primary }}>{L("SÉCURITÉ", "SECURITY", "SEGURIDAD")} · </strong>{L("Ne saisis jamais ici le mot de passe de ton compte fédéral ni une clé API secrète. Les futurs secrets connecteurs seront conservés uniquement côté serveur Cloudflare.", "Never enter a federation password or secret API key here. Future connector secrets will only be stored server-side in Cloudflare.", "Nunca introduzcas aquí una contraseña federativa ni una clave API secreta. Los futuros secretos se guardarán únicamente en el servidor Cloudflare.")}</div>
    </div>

    {canManage ? <div style={{ ...card, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: theme.text, fontSize: 10.5, fontWeight: 1000 }}>{editingId ? L("MODIFIER L'AFFILIATION", "EDIT AFFILIATION", "EDITAR AFILIACIÓN") : L("AJOUTER UNE AFFILIATION", "ADD AFFILIATION", "AÑADIR AFILIACIÓN")}</div>{editingId ? <button type="button" onClick={reset} style={button}>{L("ANNULER", "CANCEL", "CANCELAR")}</button> : null}</div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>{PRESETS.map((preset) => <button key={preset.code} type="button" onClick={() => applyPreset(preset)} style={{ ...button, whiteSpace: "nowrap", color: theme.primary }}>{preset.code}</button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr .6fr", gap: 8 }}><input style={input} value={federationName} onChange={(e) => setFederationName(e.target.value)} placeholder={L("Nom de la fédération", "Federation name", "Nombre de la federación")} /><input style={input} value={federationCode} onChange={(e) => setFederationCode(e.target.value.toUpperCase())} maxLength={32} placeholder="FFTT" /></div>
      <div style={{ display: "grid", gridTemplateColumns: ".5fr .7fr .8fr", gap: 8 }}><input style={input} value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0,3))} placeholder="FR" /><input style={input} value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026/2027" /><select style={input} value={status} onChange={(e) => setStatus(e.target.value as OrganizationFederationStatus)}><option value="pending">{L("À vérifier", "Pending", "Pendiente")}</option><option value="active">{L("Active", "Active", "Activa")}</option><option value="disabled">{L("Désactivée", "Disabled", "Desactivada")}</option></select></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input style={input} value={affiliationNumber} onChange={(e) => setAffiliationNumber(e.target.value)} placeholder={L("N° d'affiliation", "Affiliation no.", "N.º de afiliación")} /><input style={input} value={externalClubId} onChange={(e) => setExternalClubId(e.target.value)} placeholder={L("ID club fédéral (optionnel)", "Federation club ID (optional)", "ID federativo del club (opcional)")} /></div>
      <input style={input} value={portalUrl} onChange={(e) => setPortalUrl(e.target.value)} placeholder={L("Portail officiel / saisie des résultats", "Official portal / result entry", "Portal oficial / carga de resultados")} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><select style={input} value={integrationMode} onChange={(e) => setIntegrationMode(e.target.value as OrganizationFederationIntegrationMode)}><option value="manual">{L("Manuel / export", "Manual / export", "Manual / exportación")}</option><option value="portal">{L("Portail fédéral", "Federation portal", "Portal federativo")}</option><option value="api">{L("API partenaire (à autoriser)", "Partner API (authorization required)", "API partner (requiere autorización)")}</option></select><input style={input} value={connectorKey} onChange={(e) => setConnectorKey(e.target.value.toLowerCase())} placeholder={L("Identifiant connecteur public", "Public connector id", "ID público del conector")} /></div>
      <button type="button" disabled={action === "save"} onClick={() => void save()} style={{ ...primaryButton, opacity: action === "save" ? .55 : 1 }}>{editingId ? L("ENREGISTRER", "SAVE", "GUARDAR") : L("AJOUTER", "ADD", "AÑADIR")}</button>
    </div> : null}

    {notice ? <div style={{ ...card, padding: 10, color: theme.primary, fontSize: 9.2 }}>{notice}</div> : null}
    {error ? <div style={{ ...card, padding: 10, borderColor: "rgba(255,90,90,.45)", color: "#ffaaaa", fontSize: 9.2 }}>{error}</div> : null}

    <div style={{ display: "grid", gap: 8 }}>
      {loading ? <div style={{ ...card, padding: 16, color: theme.textSoft }}>{L("Chargement…", "Loading…", "Cargando…")}</div> : links.length ? links.map((link) => <div key={link.id} style={{ ...card, padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}><div><div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><strong style={{ color: theme.text, fontSize: 11.5 }}>{link.federationName}</strong>{link.federationCode ? <span style={{ borderRadius: 999, border: `1px solid ${theme.primary}55`, color: theme.primary, padding: "2px 6px", fontSize: 7.5, fontWeight: 1000 }}>{link.federationCode}</span> : null}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 8.5 }}>{link.season || "—"} · {link.affiliationNumber ? `${L("Affiliation", "Affiliation", "Afiliación")} ${link.affiliationNumber}` : L("N° d'affiliation non renseigné", "No affiliation number", "Sin número de afiliación")}</div></div><span style={{ alignSelf: "start", borderRadius: 999, padding: "4px 7px", border: `1px solid ${link.writeEnabled ? theme.primary : theme.borderSoft}`, color: link.writeEnabled ? theme.primary : theme.textSoft, fontSize: 7.3, fontWeight: 1000 }}>{link.writeEnabled ? L("ÉCRITURE API AUTORISÉE", "API WRITE ENABLED", "ESCRITURA API HABILITADA") : link.integrationMode === "api" ? L("API À AUTORISER", "API NEEDS AUTH", "API POR AUTORIZAR") : link.integrationMode === "portal" ? L("PORTAIL", "PORTAL", "PORTAL") : L("EXPORT", "EXPORT", "EXPORTAR")}</span></div>
        <div style={{ marginTop: 9, display: "flex", gap: 6, flexWrap: "wrap" }}>{link.portalUrl ? <button type="button" onClick={() => window.open(link.portalUrl, "_blank", "noopener,noreferrer")} style={primaryButton}>{L("OUVRIR LE PORTAIL", "OPEN PORTAL", "ABRIR PORTAL")}</button> : null}{canManage ? <button type="button" onClick={() => edit(link)} style={button}>{L("MODIFIER", "EDIT", "EDITAR")}</button> : null}{canManage ? <button type="button" onClick={() => void remove(link)} style={{ ...button, color: "#ff9a9a" }}>{L("SUPPRIMER", "DELETE", "ELIMINAR")}</button> : null}</div>
      </div>) : <div style={{ ...card, padding: 17, color: theme.textSoft, fontSize: 9.5 }}>{L("Aucune fédération liée. Ajouter une affiliation dans MSS ne crée pas automatiquement une adhésion auprès de la fédération : elle doit déjà exister ou être demandée via les canaux officiels.", "No federation linked. Adding an affiliation in MSS does not automatically create membership with the federation: it must already exist or be requested through official channels.", "No hay federación vinculada. Añadir una afiliación en MSS no crea automáticamente una afiliación federativa: debe existir o solicitarse por los canales oficiales.")}</div>}
    </div>

    <div style={{ ...card, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ color: theme.primary, fontSize: 8.2, fontWeight: 1000, letterSpacing: 1 }}>{L("LECTURE OFFICIELLE", "OFFICIAL READ-ONLY", "LECTURA OFICIAL")}</div>
      <div style={{ color: theme.text, fontSize: 10.8, fontWeight: 1000 }}>{L("CONSULTER LES RÉSULTATS OFFICIELS", "VIEW OFFICIAL RESULTS", "CONSULTAR RESULTADOS OFICIALES")}</div>
      <div style={{ color: theme.textSoft, fontSize: 8.5, lineHeight: 1.45 }}>{L("MSS n'invente ni ne recopie ces résultats : le bouton ouvre la source officielle de la fédération. Cela fonctionne même sans autorisation d'écriture.", "MSS does not invent or duplicate these results: the button opens the federation's official source. This works even without write authorization.", "MSS no inventa ni duplica estos resultados: el botón abre la fuente oficial de la federación. Funciona incluso sin autorización de escritura.")}</div>
      <select style={input} value={selectedLinkId} onChange={(e) => setSelectedLinkId(e.target.value)}>
        <option value="">{L("Choisir une fédération liée", "Choose a linked federation", "Elegir una federación vinculada")}</option>
        {links.filter((link) => link.status !== "disabled").map((link) => <option key={link.id} value={link.id}>{link.federationCode || link.federationName}</option>)}
      </select>
      {selectedLink ? selectedOfficialSources.length ? <div style={{ display: "grid", gap: 7 }}>
        {selectedOfficialSources.map((source) => <div key={source.url} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.2)", padding: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
          <div><div style={{ color: theme.text, fontSize: 9.8, fontWeight: 950 }}>{source.label}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 8.2, lineHeight: 1.38 }}>{source.detail}</div></div>
          <button type="button" onClick={() => window.open(source.url, "_blank", "noopener,noreferrer")} style={primaryButton}>{L("CONSULTER", "VIEW", "VER")}</button>
        </div>)}
      </div> : <div style={{ color: theme.textSoft, fontSize: 8.5 }}>{L("Aucune source publique prédéfinie pour cette fédération. Le portail officiel configuré reste accessible ci-dessus.", "No predefined public source for this federation. The configured official portal remains available above.", "No hay una fuente pública predefinida para esta federación. El portal oficial configurado sigue disponible arriba.")}</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
        {PRESETS.map((preset) => {
          const sources = OFFICIAL_RESULT_SOURCES[preset.connectorKey] || [];
          const first = sources[0];
          return first ? <button key={preset.code} type="button" onClick={() => window.open(first.url, "_blank", "noopener,noreferrer")} style={{ ...button, textAlign: "left", minHeight: 52 }}>
            <div style={{ color: theme.primary, fontSize: 8, fontWeight: 1000 }}>{preset.code}</div>
            <div style={{ marginTop: 3, color: theme.text, fontSize: 8.8, fontWeight: 900 }}>{first.label}</div>
          </button> : null;
        })}
      </div>}
      <div style={{ borderRadius: 11, border: `1px solid ${theme.primary}33`, background: `${theme.primary}08`, padding: 9, color: theme.textSoft, fontSize: 8.1, lineHeight: 1.45 }}>{L("Étape suivante possible : pour une fédération disposant d'une API de lecture autorisée, MSS pourra afficher directement ces données dans l'application sans les stocker durablement.", "Next possible step: for a federation with an authorized read API, MSS can display these data directly in the app without storing them permanently.", "Siguiente paso posible: para una federación con API de lectura autorizada, MSS podrá mostrar estos datos directamente en la app sin almacenarlos permanentemente.")}</div>
    </div>

    <div style={{ ...card, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ color: theme.text, fontSize: 10.5, fontWeight: 1000 }}>{L("PRÉPARER UN RÉSULTAT FÉDÉRAL", "PREPARE A FEDERATION RESULT", "PREPARAR UN RESULTADO FEDERATIVO")}</div>
      <div style={{ color: theme.textSoft, fontSize: 8.5, lineHeight: 1.45 }}>{L("Le paquet contient uniquement le résumé de la rencontre et la référence MSS/R2. Il peut être copié, exporté ou utilisé plus tard par un connecteur fédéral autorisé.", "The package contains only the fixture summary and MSS/R2 reference. It can be copied, exported, or later used by an authorized federation connector.", "El paquete solo contiene el resumen del encuentro y la referencia MSS/R2. Puede copiarse, exportarse o usarse posteriormente por un conector autorizado.")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><select style={input} value={selectedLinkId} onChange={(e) => setSelectedLinkId(e.target.value)}><option value="">{L("Choisir une fédération", "Choose a federation", "Elegir federación")}</option>{links.filter((link) => link.status !== "disabled").map((link) => <option key={link.id} value={link.id}>{link.federationCode || link.federationName}</option>)}</select><select style={input} value={selectedCompetitionId} onChange={(e) => void loadCompetition(e.target.value)}><option value="">{L("Choisir une compétition", "Choose a competition", "Elegir competición")}</option>{competitions.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}</select></div>
      {action === "competition" ? <div style={{ color: theme.textSoft, fontSize: 8.5 }}>{L("Chargement de la compétition…", "Loading competition…", "Cargando competición…")}</div> : null}
      {detail ? <select style={input} value={selectedFixtureId} onChange={(e) => setSelectedFixtureId(e.target.value)}><option value="">{L("Choisir un résultat terminé", "Choose a completed result", "Elegir un resultado finalizado")}</option>{completedFixtures.map((fixture) => <option key={fixture.id} value={fixture.id}>{fixture.homeName} {fixture.scoreLabel || "vs"} {fixture.awayName} · {fmtDate(fixture.scheduledAt)}</option>)}</select> : null}
      {selectedFixture && selectedLink ? <div style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.22)", padding: 10 }}><div style={{ color: theme.text, fontSize: 10.5, fontWeight: 1000 }}>{selectedFixture.homeName} <span style={{ color: theme.primary }}>{selectedFixture.scoreLabel || "—"}</span> {selectedFixture.awayName}</div><div style={{ marginTop: 4, color: theme.textSoft, fontSize: 8 }}>{selectedLink.federationName} · {detail?.competition.sportId} · {fmtDate(selectedFixture.scheduledAt)}</div></div> : null}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" disabled={!resultPackage} onClick={() => void copyPackage()} style={{ ...primaryButton, opacity: resultPackage ? 1 : .45 }}>{L("COPIER LE PAQUET", "COPY PACKAGE", "COPIAR PAQUETE")}</button><button type="button" disabled={!resultPackage} onClick={downloadPackage} style={{ ...button, opacity: resultPackage ? 1 : .45 }}>{L("EXPORT JSON", "EXPORT JSON", "EXPORTAR JSON")}</button>{selectedLink?.portalUrl ? <button type="button" onClick={() => window.open(selectedLink.portalUrl, "_blank", "noopener,noreferrer")} style={button}>{L("SAISIR SUR LE PORTAIL", "ENTER ON PORTAL", "CARGAR EN PORTAL")}</button> : null}</div>
      {selectedLink?.integrationMode === "api" && !selectedLink.writeEnabled ? <div style={{ borderRadius: 11, border: "1px solid rgba(255,190,70,.45)", background: "rgba(255,180,50,.07)", padding: 9, color: "#ffd58a", fontSize: 8.3, lineHeight: 1.45 }}>{L("Connecteur API demandé mais écriture non autorisée. MSS ne tentera aucune transmission automatique tant qu'un accord fédéral et un connecteur serveur approuvé ne sont pas en place.", "API connector requested but write access is not authorized. MSS will not attempt automatic submission until a federation agreement and approved server connector are in place.", "Se ha solicitado un conector API, pero la escritura no está autorizada. MSS no intentará ningún envío automático hasta disponer de acuerdo federativo y conector servidor aprobado.")}</div> : null}
    </div>
  </div>;
}
