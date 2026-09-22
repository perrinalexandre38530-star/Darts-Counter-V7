import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  createOrganizationCompetition,
  createOrganizationCompetitionFixture,
  deleteOrganizationCompetition,
  generateOrganizationCompetitionFixtures,
  getOrganizationCompetitionDetail,
  listOrganizationCompetitions,
  listOrganizationGroups,
  listOrganizationMembers,
  setOrganizationCompetitionFixtureResult,
  updateOrganizationCompetitionStatus,
  type OrganizationCompetition,
  type OrganizationCompetitionDetail,
  type OrganizationCompetitionFormat,
  type OrganizationCompetitionParticipantMode,
  type OrganizationCompetitionStatus,
  type OrganizationLocalGroup,
  type OrganizationMember,
  type OrganizationRecord,
} from "../organizations/organizationService";

const SPORTS = ["Multisport", "Fléchettes", "Baby-foot", "Ping-pong", "Pétanque", "Mölkky", "Running", "FIT PERF", "Football", "Autre"];
const FORMATS: OrganizationCompetitionFormat[] = ["league", "knockout", "groups_knockout", "ladder", "challenge"];

function toLocalInput(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function fmtDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function initials(value: string) {
  return String(value || "MSS").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "M";
}

export default function OrganizationCompetitionsPanel({
  organization,
  userId,
  initialGroups = [],
}: {
  organization: OrganizationRecord;
  userId: string | null;
  initialGroups?: OrganizationLocalGroup[];
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);

  const [competitions, setCompetitions] = React.useState<OrganizationCompetition[]>([]);
  const [groups, setGroups] = React.useState<OrganizationLocalGroup[]>(initialGroups);
  const [members, setMembers] = React.useState<OrganizationMember[]>([]);
  const [detail, setDetail] = React.useState<OrganizationCompetitionDetail | null>(null);
  const [screen, setScreen] = React.useState<"list" | "create" | "detail">("list");
  const [loading, setLoading] = React.useState(true);
  const [action, setAction] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [cloudAvailable, setCloudAvailable] = React.useState(true);

  const [name, setName] = React.useState("");
  const [sportId, setSportId] = React.useState("Multisport");
  const [format, setFormat] = React.useState<OrganizationCompetitionFormat>("league");
  const [participantMode, setParticipantMode] = React.useState<OrganizationCompetitionParticipantMode>("teams");
  const [startsAt, setStartsAt] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedEntityIds, setSelectedEntityIds] = React.useState<string[]>([]);
  const [manualHome, setManualHome] = React.useState("");
  const [manualAway, setManualAway] = React.useState("");
  const [manualAt, setManualAt] = React.useState("");
  const [resultFixtureId, setResultFixtureId] = React.useState("");
  const [winnerId, setWinnerId] = React.useState("");
  const [scoreLabel, setScoreLabel] = React.useState("");
  const [resultRef, setResultRef] = React.useState("");
  const [fixtureFormOpen, setFixtureFormOpen] = React.useState(false);

  const canManage = ["owner", "admin", "manager"].includes(organization.role);
  const activeGroups = groups.filter((group) => group.status === "active");
  const activeMembers = members.filter((member) => member.status === "active");
  const candidates = participantMode === "teams"
    ? activeGroups.map((group) => ({ id: group.id, name: group.name, meta: group.sportId, avatar: "", accent: group.primaryColor }))
    : activeMembers.map((member) => ({ id: member.userId, name: member.displayName, meta: member.role, avatar: member.avatarUrl, accent: theme.primary }));

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
    fontSize: 10.5,
  };
  const button: React.CSSProperties = {
    minHeight: 36,
    borderRadius: 11,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(255,255,255,.035)",
    color: theme.text,
    fontWeight: 900,
    fontSize: 9,
    padding: "7px 10px",
    cursor: "pointer",
  };
  const primaryButton: React.CSSProperties = { ...button, border: `1px solid ${theme.primary}`, color: theme.primary, background: `${theme.primary}13` };

  const formatLabel = (value: OrganizationCompetitionFormat) => ({
    league: L("Championnat", "League", "Liga"),
    knockout: L("Élimination directe", "Knockout", "Eliminación directa"),
    groups_knockout: L("Poules + phase finale", "Groups + knockout", "Grupos + eliminatorias"),
    ladder: L("Ladder", "Ladder", "Ladder"),
    challenge: L("Challenge", "Challenge", "Reto"),
  }[value]);
  const statusLabel = (value: OrganizationCompetitionStatus) => ({
    draft: L("Brouillon", "Draft", "Borrador"),
    open: L("Inscriptions", "Open", "Inscripciones"),
    active: L("En cours", "Active", "En curso"),
    completed: L("Terminée", "Completed", "Finalizada"),
    archived: L("Archivée", "Archived", "Archivada"),
  }[value]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [competitionResult, groupResult, memberResult] = await Promise.all([
        listOrganizationCompetitions(userId, organization.id),
        listOrganizationGroups(userId, organization.id),
        listOrganizationMembers(userId, organization.id),
      ]);
      setCompetitions(competitionResult.competitions);
      setGroups(groupResult.groups);
      setMembers(memberResult.members);
      setCloudAvailable(competitionResult.cloudAvailable && groupResult.cloudAvailable && memberResult.cloudAvailable);
    } catch (e: any) {
      setError(String(e?.message || L("Impossible de charger les compétitions.", "Unable to load competitions.", "No se pueden cargar las competiciones.")));
    } finally {
      setLoading(false);
    }
  }, [organization.id, userId, L]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const openDetail = async (competition: OrganizationCompetition) => {
    setAction(`open:${competition.id}`);
    setError("");
    try {
      const next = await getOrganizationCompetitionDetail(userId, competition.id);
      setDetail(next);
      setScreen("detail");
      setManualHome(""); setManualAway(""); setManualAt(""); setFixtureFormOpen(false);
      setResultFixtureId(""); setWinnerId(""); setScoreLabel(""); setResultRef("");
    } catch (e: any) {
      setError(String(e?.message || L("Impossible d’ouvrir cette compétition.", "Unable to open this competition.", "No se puede abrir esta competición.")));
    } finally {
      setAction("");
    }
  };

  const resetCreate = () => {
    setName(""); setSportId("Multisport"); setFormat("league"); setParticipantMode("teams");
    setStartsAt(""); setDescription(""); setSelectedEntityIds([]); setError(""); setNotice("");
  };

  const create = async () => {
    if (!canManage) return;
    if (name.trim().length < 2) { setError(L("Donne un nom à la compétition.", "Enter a competition name.", "Indica un nombre para la competición.")); return; }
    if (selectedEntityIds.length < 2) { setError(L("Sélectionne au moins deux participants.", "Select at least two participants.", "Selecciona al menos dos participantes.")); return; }
    setAction("create"); setError(""); setNotice("");
    try {
      const created = await createOrganizationCompetition(userId, organization.id, {
        name, sportId, format, participantMode, startsAt: toIso(startsAt), description, entityIds: selectedEntityIds,
      });
      setNotice(L("Compétition créée.", "Competition created.", "Competición creada."));
      await refresh();
      resetCreate();
      await openDetail(created);
    } catch (e: any) {
      setError(String(e?.message || L("Création impossible.", "Creation failed.", "No se pudo crear.")));
    } finally { setAction(""); }
  };

  const changeStatus = async (status: OrganizationCompetitionStatus) => {
    if (!detail || !canManage) return;
    setAction("status"); setError("");
    try {
      await updateOrganizationCompetitionStatus(userId, detail.competition.id, status);
      setDetail(await getOrganizationCompetitionDetail(userId, detail.competition.id));
      await refresh();
    } catch (e: any) { setError(String(e?.message || L("Modification impossible.", "Update failed.", "No se pudo actualizar."))); }
    finally { setAction(""); }
  };

  const generate = async () => {
    if (!detail || !canManage) return;
    setAction("generate"); setError(""); setNotice("");
    try {
      const count = await generateOrganizationCompetitionFixtures(userId, detail.competition.id);
      setNotice(count ? `${count} ${L("rencontres générées", "fixtures generated", "encuentros generados")}.` : L("Aucune rencontre automatique pour ce format : ajoute-les manuellement.", "No automatic fixtures for this format: add them manually.", "No hay encuentros automáticos para este formato: añádelos manualmente."));
      setDetail(await getOrganizationCompetitionDetail(userId, detail.competition.id));
      await refresh();
    } catch (e: any) { setError(String(e?.message || L("Génération impossible.", "Generation failed.", "No se pudo generar."))); }
    finally { setAction(""); }
  };

  const addFixture = async () => {
    if (!detail || !canManage || !manualHome || !manualAway || manualHome === manualAway) {
      setError(L("Choisis deux participants différents.", "Choose two different participants.", "Elige dos participantes diferentes.")); return;
    }
    setAction("fixture"); setError("");
    try {
      await createOrganizationCompetitionFixture(userId, detail.competition.id, manualHome, manualAway, toIso(manualAt));
      setManualHome(""); setManualAway(""); setManualAt(""); setFixtureFormOpen(false);
      setDetail(await getOrganizationCompetitionDetail(userId, detail.competition.id));
      await refresh();
    } catch (e: any) { setError(String(e?.message || L("Ajout de la rencontre impossible.", "Unable to add fixture.", "No se pudo añadir el encuentro."))); }
    finally { setAction(""); }
  };

  const saveResult = async () => {
    if (!detail || !canManage || !resultFixtureId || !winnerId) return;
    setAction("result"); setError("");
    try {
      await setOrganizationCompetitionFixtureResult(userId, resultFixtureId, winnerId, scoreLabel, resultRef);
      setResultFixtureId(""); setWinnerId(""); setScoreLabel(""); setResultRef("");
      setDetail(await getOrganizationCompetitionDetail(userId, detail.competition.id));
      await refresh();
    } catch (e: any) { setError(String(e?.message || L("Enregistrement du résultat impossible.", "Unable to save result.", "No se pudo guardar el resultado."))); }
    finally { setAction(""); }
  };

  const removeCompetition = async () => {
    if (!detail || !canManage) return;
    if (!window.confirm(L("Supprimer définitivement cette compétition ?", "Permanently delete this competition?", "¿Eliminar definitivamente esta competición?"))) return;
    setAction("delete"); setError("");
    try {
      await deleteOrganizationCompetition(userId, detail.competition.id);
      setDetail(null); setScreen("list"); await refresh();
    } catch (e: any) { setError(String(e?.message || L("Suppression impossible.", "Delete failed.", "No se pudo eliminar."))); }
    finally { setAction(""); }
  };

  const kpis = React.useMemo(() => ({
    total: competitions.length,
    active: competitions.filter((c) => c.status === "active" || c.status === "open").length,
    fixtures: competitions.reduce((sum, c) => sum + c.fixtureCount, 0),
    completed: competitions.reduce((sum, c) => sum + c.completedFixtureCount, 0),
  }), [competitions]);

  const shellHeader = (
    <div style={{ ...card, padding: 14, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div><div style={{ color: theme.primary, fontSize: 13, fontWeight: 1000 }}>{L("COMPÉTITIONS", "COMPETITIONS", "COMPETICIONES")}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.5 }}>{organization.name}</div></div>
        <div style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${cloudAvailable ? theme.primary : theme.borderSoft}`, color: cloudAvailable ? theme.primary : theme.textSoft, fontSize: 8, fontWeight: 1000 }}>{cloudAvailable ? "SYNC" : "LOCAL / HORS LIGNE"}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        {[[L("Compétitions","Competitions","Competiciones"),kpis.total],[L("Actives","Active","Activas"),kpis.active],[L("Rencontres","Fixtures","Encuentros"),kpis.fixtures],[L("Terminées","Completed","Finalizadas"),kpis.completed]].map(([label,value]) => <div key={String(label)} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: "9px 7px", textAlign: "center" }}><div style={{ color: theme.primary, fontSize: 15, fontWeight: 1000 }}>{value}</div><div style={{ color: theme.textSoft, fontSize: 7.8, fontWeight: 850 }}>{label}</div></div>)}
      </div>
    </div>
  );

  if (loading) return <div style={{ display: "grid", gap: 10 }}>{shellHeader}<div style={{ ...card, padding: 18, color: theme.textSoft }}>{L("Chargement des compétitions…", "Loading competitions…", "Cargando competiciones…")}</div></div>;

  return <div style={{ display: "grid", gap: 10 }}>
    {shellHeader}
    {error ? <div style={{ borderRadius: 12, border: "1px solid rgba(255,90,90,.5)", background: "rgba(255,60,60,.08)", color: "#ffb4b4", padding: 10, fontSize: 9.5 }}>{error}</div> : null}
    {notice ? <div style={{ borderRadius: 12, border: `1px solid ${theme.primary}55`, background: `${theme.primary}0d`, color: theme.textSoft, padding: 10, fontSize: 9.5 }}>{notice}</div> : null}

    {screen === "list" ? <>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <div style={{ color: theme.textSoft, fontSize: 9.5, alignSelf: "center" }}>{L("Championnat, tournoi, challenge ou ladder : les données restent légères dans Supabase.", "League, tournament, challenge or ladder: only lightweight data stays in Supabase.", "Liga, torneo, reto o ladder: solo los datos ligeros permanecen en Supabase.")}</div>
        {canManage ? <button type="button" style={primaryButton} onClick={() => { resetCreate(); setScreen("create"); }}>+ {L("CRÉER", "CREATE", "CREAR")}</button> : null}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {competitions.length ? competitions.map((competition) => <button key={competition.id} type="button" onClick={() => void openDetail(competition)} style={{ ...card, width: "100%", padding: 13, color: theme.text, textAlign: "left", cursor: "pointer" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10 }}><div><div style={{ color: theme.primary, fontSize: 8.2, fontWeight: 1000, letterSpacing: .8 }}>{formatLabel(competition.format).toUpperCase()} · {competition.sportId}</div><div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 1000 }}>{competition.name}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9 }}>{competition.participantCount} {L("participants","participants","participantes")} · {competition.fixtureCount} {L("rencontres","fixtures","encuentros")} · {fmtDate(competition.startsAt)}</div></div><span style={{ alignSelf: "start", borderRadius: 999, padding: "5px 8px", border: `1px solid ${competition.status === "active" ? theme.primary : theme.borderSoft}`, color: competition.status === "active" ? theme.primary : theme.textSoft, fontSize: 7.7, fontWeight: 1000 }}>{statusLabel(competition.status)}</span></div>
        </button>) : <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10.5 }}>{L("Aucune compétition pour le moment.", "No competition yet.", "Todavía no hay competiciones.")}</div>}
      </div>
    </> : null}

    {screen === "create" ? <div style={{ ...card, padding: 14, display: "grid", gap: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={{ color: theme.primary, fontSize: 12, fontWeight: 1000 }}>{L("NOUVELLE COMPÉTITION", "NEW COMPETITION", "NUEVA COMPETICIÓN")}</div><div style={{ color: theme.textSoft, fontSize: 8.8 }}>{L("Configure le format puis choisis les participants.", "Configure the format then choose participants.", "Configura el formato y luego elige los participantes.")}</div></div><button type="button" style={button} onClick={() => setScreen("list")}>✕</button></div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,.8fr)", gap: 8 }}><input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={L("Nom de la compétition", "Competition name", "Nombre de la competición")} /><select style={input} value={sportId} onChange={(e) => setSportId(e.target.value)}>{SPORTS.map((sport) => <option key={sport} value={sport}>{sport}</option>)}</select></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><select style={input} value={format} onChange={(e) => setFormat(e.target.value as OrganizationCompetitionFormat)}>{FORMATS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select><select style={input} value={participantMode} onChange={(e) => { setParticipantMode(e.target.value as OrganizationCompetitionParticipantMode); setSelectedEntityIds([]); }}><option value="teams">{L("Par équipes / groupes","Teams / groups","Por equipos / grupos")}</option><option value="individuals">{L("Individuelle","Individual","Individual")}</option></select></div>
      <input type="datetime-local" style={input} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
      <textarea style={{ ...input, minHeight: 78, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={L("Description / règlement court (optionnel)", "Description / short rules (optional)", "Descripción / reglas breves (opcional)")} />
      <div><div style={{ color: theme.text, fontSize: 10, fontWeight: 950, marginBottom: 7 }}>{L("PARTICIPANTS", "PARTICIPANTS", "PARTICIPANTES")} · {selectedEntityIds.length}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>{candidates.map((candidate) => { const checked = selectedEntityIds.includes(candidate.id); return <button type="button" key={candidate.id} onClick={() => setSelectedEntityIds((current) => checked ? current.filter((id) => id !== candidate.id) : [...current, candidate.id])} style={{ minHeight: 52, borderRadius: 12, border: `1px solid ${checked ? theme.primary : theme.borderSoft}`, background: checked ? `${theme.primary}13` : "rgba(255,255,255,.025)", color: theme.text, padding: 8, display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 8, alignItems: "center", textAlign: "left", cursor: "pointer" }}><span style={{ width: 34, height: 34, borderRadius: 999, overflow: "hidden", border: `1px solid ${candidate.accent}88`, background: `${candidate.accent}18`, display: "grid", placeItems: "center" }}>{candidate.avatar ? <img src={candidate.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <strong style={{ color: candidate.accent, fontSize: 9 }}>{initials(candidate.name)}</strong>}</span><span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: 9.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{candidate.name}</strong><small style={{ color: theme.textSoft, fontSize: 7.8 }}>{candidate.meta}</small></span><span style={{ color: checked ? theme.primary : theme.textSoft }}>{checked ? "✓" : "+"}</span></button>; })}</div>{!candidates.length ? <div style={{ color: theme.textSoft, fontSize: 9.2 }}>{participantMode === "teams" ? L("Crée d’abord des équipes ou groupes.", "Create teams or groups first.", "Crea primero equipos o grupos.") : L("Aucun membre actif disponible.", "No active members available.", "No hay miembros activos disponibles.")}</div> : null}</div>
      <button type="button" style={primaryButton} disabled={action === "create"} onClick={() => void create()}>{action === "create" ? L("CRÉATION…","CREATING…","CREANDO…") : L("CRÉER LA COMPÉTITION","CREATE COMPETITION","CREAR LA COMPETICIÓN")}</button>
    </div> : null}

    {screen === "detail" && detail ? <div style={{ display: "grid", gap: 10 }}>
      <div style={{ ...card, padding: 14 }}><div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10 }}><div><div style={{ color: theme.primary, fontSize: 8.2, fontWeight: 1000, letterSpacing: 1 }}>{formatLabel(detail.competition.format).toUpperCase()} · {detail.competition.sportId}</div><div style={{ marginTop: 4, color: theme.text, fontSize: 16, fontWeight: 1000 }}>{detail.competition.name}</div><div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9.3 }}>{detail.competition.description || L("Aucune description.", "No description.", "Sin descripción.")}</div></div><button type="button" style={button} onClick={() => { setDetail(null); setScreen("list"); }}>← {L("LISTE","LIST","LISTA")}</button></div>
        <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>{[[L("Participants","Participants","Participantes"),detail.participants.length],[L("Rencontres","Fixtures","Encuentros"),detail.fixtures.length],[L("Début","Start","Inicio"),fmtDate(detail.competition.startsAt)]].map(([label,value]) => <div key={String(label)} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: 9, textAlign: "center" }}><div style={{ color: theme.primary, fontSize: typeof value === "number" ? 14 : 8.5, fontWeight: 1000 }}>{value}</div><div style={{ color: theme.textSoft, fontSize: 7.5 }}>{label}</div></div>)}</div>
        {canManage ? <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}><select style={{ ...input, width: "auto", minWidth: 130 }} value={detail.competition.status} disabled={action === "status"} onChange={(e) => void changeStatus(e.target.value as OrganizationCompetitionStatus)}>{(["draft","open","active","completed","archived"] as OrganizationCompetitionStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><button type="button" style={primaryButton} disabled={action === "generate" || detail.fixtures.length > 0} onClick={() => void generate()}>{L("GÉNÉRER LE CALENDRIER","GENERATE SCHEDULE","GENERAR CALENDARIO")}</button><button type="button" style={{ ...button, color: "#ff9a9a", borderColor: "rgba(255,90,90,.45)" }} disabled={action === "delete"} onClick={() => void removeCompetition()}>{L("SUPPRIMER","DELETE","ELIMINAR")}</button></div> : null}
      </div>

      <div style={{ ...card, padding: 14 }}><div style={{ color: theme.text, fontSize: 10.5, fontWeight: 1000, marginBottom: 8 }}>{L("PARTICIPANTS", "PARTICIPANTS", "PARTICIPANTES")}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{detail.participants.map((participant) => <span key={participant.id} style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", color: theme.text, padding: "6px 9px", fontSize: 8.8 }}>{participant.seed}. {participant.displayName}</span>)}</div></div>

      {canManage && !fixtureFormOpen ? <button type="button" style={{ ...button, width: "100%", minHeight: 42 }} onClick={() => setFixtureFormOpen(true)}>+ {L("AJOUTER UNE RENCONTRE", "ADD A FIXTURE", "AÑADIR UN ENCUENTRO")}</button> : null}
      {canManage && fixtureFormOpen ? <div style={{ ...card, padding: 14, display: "grid", gap: 8 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><div style={{ color: theme.text, fontSize: 10.5, fontWeight: 1000 }}>{L("AJOUTER UNE RENCONTRE", "ADD A FIXTURE", "AÑADIR UN ENCUENTRO")}</div><button type="button" style={button} onClick={() => setFixtureFormOpen(false)}>✕</button></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}><select style={input} value={manualHome} onChange={(e) => setManualHome(e.target.value)}><option value="">{L("Participant A","Participant A","Participante A")}</option>{detail.participants.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}</select><select style={input} value={manualAway} onChange={(e) => setManualAway(e.target.value)}><option value="">{L("Participant B","Participant B","Participante B")}</option>{detail.participants.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}</select></div><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7 }}><input type="datetime-local" style={input} value={manualAt} onChange={(e) => setManualAt(e.target.value)} /><button type="button" style={primaryButton} disabled={action === "fixture"} onClick={() => void addFixture()}>+ {L("AJOUTER","ADD","AÑADIR")}</button></div></div> : null}

      <div style={{ ...card, padding: 14 }}><div style={{ color: theme.text, fontSize: 10.5, fontWeight: 1000, marginBottom: 8 }}>{L("CALENDRIER DES RENCONTRES", "FIXTURE SCHEDULE", "CALENDARIO DE ENCUENTROS")}</div><div style={{ display: "grid", gap: 7 }}>{detail.fixtures.length ? detail.fixtures.map((fixture) => <div key={fixture.id} style={{ borderRadius: 13, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: 10 }}><div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}><div><div style={{ color: theme.primary, fontSize: 7.8, fontWeight: 1000 }}>{fixture.groupLabel ? `${fixture.groupLabel} · ` : ""}{L("Tour","Round","Ronda")} {fixture.round} · #{fixture.sequence}</div><div style={{ marginTop: 3, color: theme.text, fontSize: 10.2, fontWeight: 950 }}>{fixture.homeName} <span style={{ color: theme.textSoft }}>vs</span> {fixture.awayName}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 8.5 }}>{fmtDate(fixture.scheduledAt)}{fixture.scoreLabel ? ` · ${fixture.scoreLabel}` : ""}</div></div><span style={{ color: fixture.status === "completed" ? theme.primary : theme.textSoft, fontSize: 7.7, fontWeight: 1000 }}>{fixture.status === "completed" ? L("TERMINÉE","COMPLETED","FINALIZADA") : L("À JOUER","TO PLAY","POR JUGAR")}</span></div>{canManage && fixture.status !== "completed" ? <button type="button" style={{ ...button, marginTop: 7 }} onClick={() => { setResultFixtureId(fixture.id); setWinnerId(""); setScoreLabel(""); setResultRef(""); }}>{L("SAISIR LE RÉSULTAT","ENTER RESULT","INTRODUCIR RESULTADO")}</button> : null}{resultFixtureId === fixture.id ? <div style={{ marginTop: 8, display: "grid", gap: 7 }}><select style={input} value={winnerId} onChange={(e) => setWinnerId(e.target.value)}><option value="">{L("Vainqueur","Winner","Ganador")}</option><option value={fixture.homeParticipantId}>{fixture.homeName}</option><option value={fixture.awayParticipantId}>{fixture.awayName}</option></select><input style={input} value={scoreLabel} onChange={(e) => setScoreLabel(e.target.value)} placeholder={L("Score résumé, ex. 3–1", "Score summary, e.g. 3–1", "Resumen del marcador, ej. 3–1")} /><input style={input} value={resultRef} onChange={(e) => setResultRef(e.target.value)} placeholder={L("Référence résultat MSS / R2 (optionnel)", "MSS / R2 result reference (optional)", "Referencia de resultado MSS / R2 (opcional)")} /><button type="button" style={primaryButton} disabled={action === "result"} onClick={() => void saveResult()}>{L("VALIDER LE RÉSULTAT","SAVE RESULT","GUARDAR RESULTADO")}</button></div> : null}</div>) : <div style={{ color: theme.textSoft, fontSize: 9.5 }}>{L("Aucune rencontre planifiée.", "No fixtures scheduled.", "No hay encuentros programados.")}</div>}</div></div>

      <div style={{ borderRadius: 13, border: `1px solid ${theme.primary}33`, background: `${theme.primary}0a`, padding: 10, color: theme.textSoft, fontSize: 8.8, lineHeight: 1.45 }}>{L("Supabase ne conserve ici que l’organisation de la compétition, les participants, le calendrier et un résumé de résultat. Les statistiques détaillées et historiques de match restent dans R2 / NAS / stockage choisi.", "Supabase only stores competition structure, participants, schedule and a result summary here. Detailed match statistics and history remain in R2 / NAS / selected storage.", "Supabase solo conserva aquí la estructura de la competición, participantes, calendario y un resumen del resultado. Las estadísticas detalladas y el historial quedan en R2 / NAS / almacenamiento elegido.")}</div>
    </div> : null}
  </div>;
}
