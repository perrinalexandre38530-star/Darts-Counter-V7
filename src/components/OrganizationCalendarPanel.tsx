import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  createOrganizationEvent,
  deleteOrganizationEvent,
  listOrganizationEvents,
  updateOrganizationEvent,
  type OrganizationEventInput,
  type OrganizationEventType,
  type OrganizationLocalEvent,
  type OrganizationLocalGroup,
  type OrganizationRecord,
} from "../organizations/organizationService";

type Props = {
  organization: OrganizationRecord;
  userId: string | null;
  groups: OrganizationLocalGroup[];
  initialEvents?: OrganizationLocalEvent[];
  onChanged?: () => void | Promise<void>;
};

const EVENT_TYPES: Array<[OrganizationEventType, string, string, string]> = [
  ["training", "Entraînement", "Training", "Entrenamiento"],
  ["match", "Match", "Match", "Partido"],
  ["tournament", "Tournoi", "Tournament", "Torneo"],
  ["meeting", "Réunion", "Meeting", "Reunión"],
  ["event", "Événement", "Event", "Evento"],
  ["other", "Autre", "Other", "Otro"],
];

function toLocalInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OrganizationCalendarPanel({ organization, userId, groups, initialEvents = [], onChanged }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [events, setEvents] = React.useState<OrganizationLocalEvent[]>(initialEvents);
  const [editing, setEditing] = React.useState<OrganizationLocalEvent | null>(null);
  const [title, setTitle] = React.useState("");
  const [eventType, setEventType] = React.useState<OrganizationEventType>("training");
  const [groupId, setGroupId] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const activeGroups = React.useMemo(() => groups.filter((g) => g.status !== "archived"), [groups]);
  const captainGroups = React.useMemo(() => activeGroups.filter((g) => g.captainUserId === userId), [activeGroups, userId]);
  const canManageGlobal = ["owner","admin","manager"].includes(organization.role);
  const canCreate = canManageGlobal || (organization.role === "captain" && captainGroups.length > 0);
  const allowedGroups = canManageGlobal ? activeGroups : captainGroups;

  const card: React.CSSProperties = { borderRadius: 16, border: `1px solid ${theme.borderSoft}`, background: theme.cardBackground || theme.card, boxShadow: "0 12px 28px rgba(0,0,0,.32)" };
  const input: React.CSSProperties = { width: "100%", minHeight: 40, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.28)", color: theme.text, padding: "9px 10px", boxSizing: "border-box", outline: "none", fontSize: 10.5 };
  const button: React.CSSProperties = { minHeight: 36, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.035)", color: theme.text, fontWeight: 900, padding: "7px 10px", cursor: "pointer" };
  const primaryButton: React.CSSProperties = { ...button, borderColor: `${theme.primary}88`, color: theme.primary, background: `${theme.primary}12` };

  const refresh = React.useCallback(async () => {
    const result = await listOrganizationEvents(userId, organization.id);
    setEvents(result.events);
  }, [userId, organization.id]);

  React.useEffect(() => { setEvents(initialEvents); }, [initialEvents]);
  React.useEffect(() => { void refresh(); }, [refresh]);
  React.useEffect(() => {
    if (!canManageGlobal && groupId && !captainGroups.some((g) => g.id === groupId)) setGroupId(captainGroups[0]?.id || "");
  }, [canManageGlobal, captainGroups, groupId]);

  function reset() {
    setEditing(null); setTitle(""); setEventType("training"); setGroupId(canManageGlobal ? "" : captainGroups[0]?.id || ""); setStartsAt(""); setEndsAt(""); setLocation(""); setError("");
  }

  function startEdit(event: OrganizationLocalEvent) {
    setEditing(event);
    setTitle(event.title);
    setEventType(event.eventType || "event");
    setGroupId(event.groupId || "");
    setStartsAt(toLocalInput(event.startsAt));
    setEndsAt(toLocalInput(event.endsAt));
    setLocation(event.location || "");
    setError("");
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function canEditEvent(event: OrganizationLocalEvent) {
    if (canManageGlobal) return true;
    return organization.role === "captain" && !!event.groupId && captainGroups.some((g) => g.id === event.groupId);
  }

  async function save() {
    if (!canCreate || busy) return;
    if (!title.trim() || !startsAt) { setError(L("Nom et date de début obligatoires.", "Name and start date are required.", "Nombre y fecha de inicio obligatorios.")); return; }
    if (!canManageGlobal && !groupId) { setError(L("Un capitaine doit rattacher l’événement à son équipe.", "A captain must attach the event to their team.", "Un capitán debe vincular el evento a su equipo.")); return; }
    const inputPayload: OrganizationEventInput = { groupId: groupId || null, title, eventType, startsAt, endsAt: endsAt || null, location };
    setBusy("save"); setError(""); setNotice("");
    try {
      if (editing) await updateOrganizationEvent(userId, editing.id, organization.id, inputPayload);
      else await createOrganizationEvent(userId, organization.id, inputPayload);
      setNotice(editing ? L("Événement mis à jour.", "Event updated.", "Evento actualizado.") : L("Événement ajouté à l’agenda.", "Event added to calendar.", "Evento añadido a la agenda."));
      reset();
      await refresh();
      await onChanged?.();
    } catch (e: any) { setError(String(e?.message || L("Enregistrement impossible.", "Unable to save.", "No se puede guardar."))); }
    finally { setBusy(""); }
  }

  async function remove(event: OrganizationLocalEvent) {
    if (!canEditEvent(event) || busy) return;
    if (!window.confirm(L(`Supprimer « ${event.title} » ?`, `Delete “${event.title}”?`, `¿Eliminar «${event.title}»?`))) return;
    setBusy(`delete:${event.id}`); setError("");
    try {
      await deleteOrganizationEvent(userId, organization.id, event.id);
      if (editing?.id === event.id) reset();
      await refresh();
      await onChanged?.();
    } catch (e: any) { setError(String(e?.message || L("Suppression impossible.", "Unable to delete.", "No se puede eliminar."))); }
    finally { setBusy(""); }
  }

  function typeLabel(type: OrganizationEventType) {
    const row = EVENT_TYPES.find(([id]) => id === type) || EVENT_TYPES[4];
    return L(row[1], row[2], row[3]);
  }

  return <div style={{ display: "grid", gap: 10 }}>
    {canCreate ? <div style={{ ...card, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div><div style={{ color: theme.primary, fontSize: 11.5, fontWeight: 1000 }}>{editing ? L("MODIFIER L’ÉVÉNEMENT", "EDIT EVENT", "EDITAR EVENTO") : L("PLANIFIER", "SCHEDULE", "PLANIFICAR")}</div><div style={{ color: theme.textSoft, fontSize: 8.5, marginTop: 2 }}>{L("Entraînement, match, tournoi, réunion ou événement.", "Training, match, tournament, meeting or event.", "Entrenamiento, partido, torneo, reunión o evento.")}</div></div>{editing ? <button type="button" style={button} onClick={reset}>{L("ANNULER", "CANCEL", "CANCELAR")}</button> : null}</div>
      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(120px,.65fr)", gap: 8 }}><input style={input} value={title} onChange={(e)=>setTitle(e.target.value)} placeholder={L("Nom de l’événement", "Event name", "Nombre del evento")} /><select style={input} value={eventType} onChange={(e)=>setEventType(e.target.value as OrganizationEventType)}>{EVENT_TYPES.map(([id,fr,en,es])=><option key={id} value={id}>{L(fr,en,es)}</option>)}</select></div>
        <select style={input} value={groupId} onChange={(e)=>setGroupId(e.target.value)}><option value="">{L("Toute l’organisation", "Whole organization", "Toda la organización")}</option>{allowedGroups.map((g)=><option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input type="datetime-local" style={input} value={startsAt} onChange={(e)=>setStartsAt(e.target.value)} /><input type="datetime-local" style={input} value={endsAt} onChange={(e)=>setEndsAt(e.target.value)} /></div>
        <input style={input} value={location} onChange={(e)=>setLocation(e.target.value)} placeholder={L("Lieu / salle / terrain (optionnel)", "Location / room / pitch (optional)", "Lugar / sala / campo (opcional)")} />
        <button type="button" disabled={busy === "save"} style={{ ...primaryButton, opacity: busy === "save" ? .55 : 1 }} onClick={()=>void save()}>{busy === "save" ? "…" : editing ? L("ENREGISTRER", "SAVE", "GUARDAR") : L("AJOUTER À L’AGENDA", "ADD TO CALENDAR", "AÑADIR A LA AGENDA")}</button>
      </div>
    </div> : null}

    {notice ? <div style={{ ...card, padding: 9, color: theme.primary, fontSize: 9 }}>{notice}</div> : null}
    {error ? <div style={{ ...card, padding: 9, color: "#ffaaaa", borderColor: "rgba(255,90,90,.45)", fontSize: 9 }}>{error}</div> : null}

    <div style={{ display: "grid", gap: 8 }}>
      {events.length ? events.map((event) => {
        const group = groups.find((g)=>g.id === event.groupId);
        const editable = canEditEvent(event);
        return <div key={event.id} style={{ ...card, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}><div style={{ minWidth: 0 }}><div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><span style={{ color: theme.primary, fontSize: 8, fontWeight: 1000 }}>{typeLabel(event.eventType)}</span>{group ? <span style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, padding: "2px 6px", color: theme.textSoft, fontSize: 7.5 }}>{group.name}</span> : null}</div><div style={{ marginTop: 4, color: theme.text, fontSize: 11, fontWeight: 1000 }}>{event.title}</div></div>{editable ? <div style={{ display: "flex", gap: 5 }}><button type="button" style={{ ...button, minHeight: 30, padding: "5px 7px" }} onClick={()=>startEdit(event)}>{L("MODIFIER", "EDIT", "EDITAR")}</button><button type="button" disabled={busy === `delete:${event.id}`} style={{ ...button, minHeight: 30, padding: "5px 7px", color: "#ff9f9f" }} onClick={()=>void remove(event)}>×</button></div> : null}</div>
          <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 9, lineHeight: 1.45 }}>{new Date(event.startsAt).toLocaleString()}{event.endsAt ? ` → ${new Date(event.endsAt).toLocaleString()}` : ""}{event.location ? ` · ${event.location}` : ""}</div>
        </div>;
      }) : <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 9.5 }}>{L("Aucun événement planifié.", "No scheduled events.", "No hay eventos programados.")}</div>}
    </div>
  </div>;
}
