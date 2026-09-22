import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { generateQrCanvas } from "../lib/qr";
import {
  createOrganizationInstallation,
  deleteOrganizationInstallation,
  listOrganizationInstallations,
  rotateOrganizationInstallationQr,
  updateOrganizationInstallation,
  type OrganizationInstallation,
  type OrganizationInstallationInput,
  type OrganizationInstallationKind,
  type OrganizationRecord,
} from "../organizations/organizationService";
import { activateOrganizationPlayContext } from "../organizations/organizationPlayContext";

const KINDS: Array<{ id: OrganizationInstallationKind; label: string }> = [
  { id: "dartboard", label: "Cible de fléchettes" },
  { id: "table", label: "Table" },
  { id: "pitch", label: "Terrain" },
  { id: "court", label: "Court" },
  { id: "lane", label: "Piste" },
  { id: "room", label: "Salle" },
  { id: "station", label: "Poste" },
  { id: "other", label: "Autre installation" },
];

const SPORTS = ["Multisport","Fléchettes","Baby-foot","Ping-pong","Pétanque","Mölkky","Football","Running","FIT PERF","Autre"];

function kindLabel(kind: OrganizationInstallationKind) {
  return KINDS.find((item) => item.id === kind)?.label || "Installation";
}

function QrPreview({ value, size = 132 }: { value: string; size?: number }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    try { setSrc(generateQrCanvas(value, size).toDataURL("image/png")); } catch { setSrc(""); }
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size, display: "grid", placeItems: "center", background: "#fff", color: "#111", fontSize: 10 }}>QR</div>;
  return <img src={src} alt="QR code" width={size} height={size} style={{ display: "block", borderRadius: 10, background: "#fff", padding: 5 }} />;
}

export default function OrganizationVenuePanel({ organization, userId, go }: { organization: OrganizationRecord; userId: string | null; go?: (tab: any, params?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [items, setItems] = React.useState<OrganizationInstallation[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [editing, setEditing] = React.useState<OrganizationInstallation | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [actionMenuId, setActionMenuId] = React.useState("");
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<OrganizationInstallationKind>("dartboard");
  const [sportId, setSportId] = React.useState("Fléchettes");
  const [zoneLabel, setZoneLabel] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "maintenance" | "archived">("active");
  const [expandedQr, setExpandedQr] = React.useState<string>("");
  const canManage = ["owner","admin","manager"].includes(organization.role);

  const card: React.CSSProperties = { borderRadius: 15, border: `1px solid ${theme.borderSoft}`, background: "rgba(5,10,18,.72)", boxShadow: "0 10px 26px rgba(0,0,0,.24)" };
  const input: React.CSSProperties = { width: "100%", minHeight: 39, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.28)", color: theme.text, padding: "8px 10px", outline: "none", boxSizing: "border-box", fontSize: 10 };
  const button: React.CSSProperties = { minHeight: 38, borderRadius: 11, border: `1px solid ${theme.primary}88`, background: `${theme.primary}14`, color: theme.primary, fontWeight: 1000, fontSize: 9, cursor: "pointer", padding: "7px 10px" };

  const load = React.useCallback(async () => {
    const result = await listOrganizationInstallations(userId, organization.id);
    setItems(result.installations);
  }, [userId, organization.id]);

  React.useEffect(() => { void load(); }, [load]);

  function reset() { setEditing(null); setName(""); setKind("dartboard"); setSportId("Fléchettes"); setZoneLabel(""); setStatus("active"); setFormOpen(false); }

  async function save() {
    if (!canManage || busy) return;
    setError(""); setNotice("");
    if (name.trim().length < 2) { setError(L("Donne un nom à l’installation.", "Give the installation a name.", "Pon un nombre a la instalación.")); return; }
    setBusy(true);
    try {
      const payload: OrganizationInstallationInput = { name: name.trim(), kind, sportId, zoneLabel: zoneLabel.trim(), status };
      if (editing) await updateOrganizationInstallation(userId, editing.id, payload);
      else await createOrganizationInstallation(userId, organization.id, payload);
      reset();
      await load();
      setNotice(editing ? L("Installation modifiée.", "Installation updated.", "Instalación actualizada.") : L("Installation créée. QR prêt à imprimer.", "Installation created. QR ready to print.", "Instalación creada. QR listo para imprimir."));
    } catch (e: any) { setError(String(e?.message || e)); }
    finally { setBusy(false); }
  }

  function scanUrl(item: OrganizationInstallation) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/#/venue/${encodeURIComponent(item.qrToken)}`;
  }

  function activate(item: OrganizationInstallation) {
    activateOrganizationPlayContext({
      organizationId: organization.id,
      organizationName: organization.name,
      installationId: item.id,
      installationName: item.name,
      installationKind: item.kind,
      sportId: item.sportId,
      qrToken: item.qrToken,
    });
    setNotice(`${item.name} · ${L("contexte de jeu activé", "play context activated", "contexto de juego activado")}`);
    go?.("games", { organizationId: organization.id, organizationInstallationId: item.id, organizationVenue: true });
  }

  function downloadQr(item: OrganizationInstallation) {
    try { const canvas = generateQrCanvas(scanUrl(item), 720); const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = `MSS-${item.name.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"") || "installation"}-QR.png`; a.click(); setNotice(L("QR PNG généré.", "QR PNG generated.", "QR PNG generado.")); } catch { setError(L("Impossible de générer le PNG QR.", "Unable to generate QR PNG.", "No se pudo generar el PNG QR.")); }
  }

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setNotice(label); } catch { setNotice(value); }
  }

  async function remove(item: OrganizationInstallation) {
    if (!canManage || !confirm(L(`Supprimer « ${item.name} » ?`, `Delete “${item.name}”?`, `¿Eliminar «${item.name}»?`))) return;
    setBusy(true); setError("");
    try { await deleteOrganizationInstallation(userId, item.id); await load(); setNotice(L("Installation supprimée.", "Installation deleted.", "Instalación eliminada.")); }
    catch (e: any) { setError(String(e?.message || e)); }
    finally { setBusy(false); }
  }

  async function rotateQr(item: OrganizationInstallation) {
    if (!canManage || !confirm(L("L’ancien QR ne fonctionnera plus. Continuer ?", "The old QR will stop working. Continue?", "El QR anterior dejará de funcionar. ¿Continuar?"))) return;
    setBusy(true); setError("");
    try { await rotateOrganizationInstallationQr(userId, item.id); await load(); setNotice(L("Nouveau QR généré.", "New QR generated.", "Nuevo QR generado.")); }
    catch (e: any) { setError(String(e?.message || e)); }
    finally { setBusy(false); }
  }

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, padding: 13, borderColor: `${theme.primary}44` }}>
      <div style={{ color: theme.primary, fontSize: 12.5, fontWeight: 1000 }}>{L("INSTALLATIONS & QR", "INSTALLATIONS & QR", "INSTALACIONES Y QR")}</div>
      <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.45 }}>{L("Une cible, table, terrain ou salle = un QR. Le joueur scanne, active le lieu puis joue normalement dans MSS. La partie complète reste dans le stockage choisi ; l’historique reçoit seulement le contexte organisation/installation.", "One board, table, pitch or room = one QR. The player scans, activates the venue and then plays normally in MSS. Full game data stays in selected storage; history only receives organization/installation context.", "Una diana, mesa, terreno o sala = un QR. El jugador escanea, activa el lugar y juega normalmente en MSS. La partida completa permanece en el almacenamiento elegido; el historial solo recibe el contexto organización/instalación.")}</div>
    </div>

    {notice ? <div style={{ ...card, padding: 10, color: theme.primary, fontSize: 9 }}>{notice}</div> : null}
    {error ? <div style={{ ...card, padding: 10, color: "#ff9f9f", fontSize: 9 }}>{error}</div> : null}

    {canManage && !formOpen ? <button type="button" style={{ ...button, width: "100%", minHeight: 44, fontSize: 10.2 }} onClick={() => { reset(); setFormOpen(true); }}>+ {L("AJOUTER UNE INSTALLATION", "ADD INSTALLATION", "AÑADIR INSTALACIÓN")}</button> : null}

    {canManage && formOpen ? <div style={{ ...card, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ color: theme.text, fontSize: 11, fontWeight: 1000 }}>{editing ? L("MODIFIER L’INSTALLATION", "EDIT INSTALLATION", "EDITAR INSTALACIÓN") : L("AJOUTER UNE INSTALLATION", "ADD INSTALLATION", "AÑADIR INSTALACIÓN")}</div>
      <input style={input} placeholder={L("Ex. Cible 1 · Table 2 · Terrain A", "e.g. Board 1 · Table 2 · Pitch A", "Ej. Diana 1 · Mesa 2 · Campo A")} value={name} onChange={(e) => setName(e.target.value)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        <select style={input} value={kind} onChange={(e) => setKind(e.target.value as OrganizationInstallationKind)}>{KINDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <select style={input} value={sportId} onChange={(e) => setSportId(e.target.value)}>{SPORTS.map((sport) => <option key={sport}>{sport}</option>)}</select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: editing ? "1.3fr .7fr" : "1fr", gap: 7 }}><input style={input} placeholder={L("Zone / étage / salle (optionnel)", "Zone / floor / room (optional)", "Zona / planta / sala (opcional)")} value={zoneLabel} onChange={(e) => setZoneLabel(e.target.value)} />{editing ? <select style={input} value={status} onChange={(e) => setStatus(e.target.value as any)}><option value="active">ACTIF</option><option value="maintenance">MAINTENANCE</option><option value="archived">ARCHIVÉ</option></select> : null}</div>
      <div style={{ display: "grid", gridTemplateColumns: editing ? "1fr 1.4fr" : "1fr", gap: 7 }}>
        <button style={{ ...button, color: theme.textSoft, borderColor: theme.borderSoft }} onClick={reset}>{L("ANNULER", "CANCEL", "CANCELAR")}</button>
        <button disabled={busy} style={{ ...button, opacity: busy ? .55 : 1 }} onClick={() => void save()}>{busy ? "…" : editing ? L("ENREGISTRER", "SAVE", "GUARDAR") : L("CRÉER + GÉNÉRER LE QR", "CREATE + GENERATE QR", "CREAR + GENERAR QR")}</button>
      </div>
    </div> : null}

    <div style={{ display: "grid", gap: 8 }}>
      {items.length ? items.map((item) => {
        const url = scanUrl(item);
        return <div key={item.id} style={{ ...card, padding: 11, display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "start" }}>
            <div><div style={{ color: theme.text, fontSize: 11.5, fontWeight: 1000 }}>{item.name}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 8.7 }}>{kindLabel(item.kind)} · {item.sportId}{item.zoneLabel ? ` · ${item.zoneLabel}` : ""}</div></div>
            <span style={{ borderRadius: 999, border: `1px solid ${item.status === "active" ? theme.primary : theme.borderSoft}`, color: item.status === "active" ? theme.primary : theme.textSoft, padding: "3px 7px", fontSize: 7.5, fontWeight: 1000 }}>{item.status.toUpperCase()}</span>
          </div>
          {expandedQr === item.id ? <div style={{ display: "grid", placeItems: "center", gap: 8, padding: 8, borderRadius: 12, background: "rgba(255,255,255,.025)" }}><QrPreview value={url} size={170}/><div style={{ maxWidth: 320, color: theme.textSoft, fontSize: 8, textAlign: "center", wordBreak: "break-all" }}>{url}</div></div> : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}>
            <button style={button} onClick={() => setExpandedQr((id) => id === item.id ? "" : item.id)}>{expandedQr === item.id ? L("MASQUER QR", "HIDE QR", "OCULTAR QR") : L("AFFICHER QR", "SHOW QR", "MOSTRAR QR")}</button>
            <button style={button} onClick={() => activate(item)}>{L("JOUER ICI", "PLAY HERE", "JUGAR AQUÍ")}</button>
            <button aria-label={L("Plus d'actions", "More actions", "Más acciones")} style={{ ...button, minWidth: 42 }} onClick={() => setActionMenuId((id) => id === item.id ? "" : item.id)}>···</button>
          </div>
          {actionMenuId === item.id ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, paddingTop: 2 }}>
            <button style={{ ...button, color: theme.textSoft, borderColor: theme.borderSoft }} onClick={() => void copy(url, L("Lien QR copié.", "QR link copied.", "Enlace QR copiado."))}>{L("COPIER LE LIEN", "COPY LINK", "COPIAR ENLACE")}</button>
            <button style={{ ...button, color: theme.textSoft, borderColor: theme.borderSoft }} onClick={() => go?.("organization_stats", { organizationId: organization.id, workspaceMode: true })}>{L("CLASSEMENT", "LEADERBOARD", "CLASIFICACIÓN")}</button>
            <button style={{ ...button, color: theme.textSoft, borderColor: theme.borderSoft }} onClick={() => downloadQr(item)}>{L("TÉLÉCHARGER QR", "DOWNLOAD QR", "DESCARGAR QR")}</button>
            <button style={{ ...button, color: theme.textSoft, borderColor: theme.borderSoft }} onClick={() => window.open(`${window.location.origin}/#/venue-board/${encodeURIComponent(item.qrToken)}`, "_blank", "noopener,noreferrer")}>{L("ÉCRAN LEADERBOARD", "LEADERBOARD SCREEN", "PANTALLA CLASIFICACIÓN")}</button>
            {canManage ? <><button style={{ ...button, minHeight: 31, fontSize: 8 }} onClick={() => { setEditing(item); setName(item.name); setKind(item.kind); setSportId(item.sportId); setZoneLabel(item.zoneLabel); setStatus(item.status); setFormOpen(true); setActionMenuId(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{L("MODIFIER", "EDIT", "EDITAR")}</button>
            <button style={{ ...button, minHeight: 31, fontSize: 8 }} onClick={() => void rotateQr(item)}>{L("NOUVEAU QR", "NEW QR", "NUEVO QR")}</button>
            <button style={{ ...button, minHeight: 31, fontSize: 8, color: "#ff9f9f", borderColor: "rgba(255,90,90,.45)" }} onClick={() => void remove(item)}>{L("SUPPRIMER", "DELETE", "ELIMINAR")}</button></> : null}
          </div> : null}
          <div style={{ color: theme.textSoft, fontSize: 7.8 }}>{L("Activations enregistrées", "Recorded activations", "Activaciones registradas")}: {item.playCount}{item.lastPlayedAt ? ` · ${new Date(item.lastPlayedAt).toLocaleDateString()}` : ""}</div>
        </div>;
      }) : <div style={{ ...card, padding: 18, color: theme.textSoft, fontSize: 10 }}>{L("Aucune installation. Crée la première cible, table ou zone de jeu.", "No installations yet. Create the first board, table or play area.", "Aún no hay instalaciones. Crea la primera diana, mesa o zona de juego.")}</div>}
    </div>
  </div>;
}
