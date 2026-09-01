import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  CONTENT_PACK_IDS,
  CONTENT_PACK_META,
  contentPackInfo,
  contentPacksTotalBytes,
  getContentPackStatus,
  installContentPack,
  probeContentPackGateway,
  removeContentPack,
  subscribeContentPacks,
  type ContentPackId,
  type ContentPackProgress,
} from "../../lib/contentPacks";


function bytesLabel(bytes: number): string {
  const mb = Math.max(0, Number(bytes || 0)) / 1024 / 1024;
  return mb >= 100 ? `${mb.toFixed(0)} Mo` : `${mb.toFixed(1)} Mo`;
}

export default function ContentPacksSettingsPanel() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const [, refresh] = React.useReducer((v) => v + 1, 0);
  const [busy, setBusy] = React.useState<ContentPackId | null>(null);
  const [progress, setProgress] = React.useState<ContentPackProgress | null>(null);
  const [message, setMessage] = React.useState("");
  const [allBusy, setAllBusy] = React.useState(false);
  const [gateway, setGateway] = React.useState<"checking" | "online" | "offline">("checking");

  React.useEffect(() => subscribeContentPacks(refresh), []);
  React.useEffect(() => {
    let active = true;
    void probeContentPackGateway().then((ok) => {
      if (active) setGateway(ok ? "online" : "offline");
    });
    return () => { active = false; };
  }, []);

  const tr = (fr: string, en: string, es: string) => lang === "en" ? en : lang === "es" ? es : fr;

  async function install(id: ContentPackId) {
    setBusy(id);
    setMessage("");
    setProgress(null);
    try {
      await installContentPack(id, setProgress);
      setMessage(tr("Pack installé. Disponible hors ligne.", "Pack installed. Available offline.", "Pack instalado. Disponible sin conexión."));
    } catch (error: any) {
      setMessage(`${tr("Échec du téléchargement", "Download failed", "Error de descarga")} : ${error?.message || error}`);
    } finally {
      setBusy(null);
      setProgress(null);
      refresh();
    }
  }

  async function remove(id: ContentPackId) {
    setBusy(id);
    setMessage("");
    try {
      await removeContentPack(id);
      setMessage(tr("Pack supprimé de cet appareil.", "Pack removed from this device.", "Pack eliminado de este dispositivo."));
    } catch (error: any) {
      setMessage(`${tr("Suppression impossible", "Removal failed", "No se pudo eliminar")} : ${error?.message || error}`);
    } finally {
      setBusy(null);
      refresh();
    }
  }

  async function installAll() {
    setAllBusy(true);
    setMessage("");
    try {
      for (const id of CONTENT_PACK_IDS) {
        if (getContentPackStatus(id).installed) continue;
        setBusy(id);
        setProgress(null);
        await installContentPack(id, setProgress);
      }
      setMessage(tr("Tous les packs sont installés pour le mode hors ligne.", "All packs are installed for offline use.", "Todos los packs están instalados para uso sin conexión."));
    } catch (error: any) {
      setMessage(`${tr("Installation interrompue", "Installation interrupted", "Instalación interrumpida")} : ${error?.message || error}`);
    } finally {
      setBusy(null);
      setProgress(null);
      setAllBusy(false);
      refresh();
    }
  }

  async function removeAll() {
    setAllBusy(true);
    setMessage("");
    try {
      for (const id of CONTENT_PACK_IDS) await removeContentPack(id);
      setMessage(tr("Tous les packs hors ligne ont été supprimés.", "All offline packs were removed.", "Se eliminaron todos los packs sin conexión."));
    } catch (error: any) {
      setMessage(`${tr("Suppression impossible", "Removal failed", "No se pudo eliminar")} : ${error?.message || error}`);
    } finally {
      setBusy(null);
      setAllBusy(false);
      refresh();
    }
  }

  const installedCount = CONTENT_PACK_IDS.filter((id) => getContentPackStatus(id).installed).length;
  const totalPackBytes = contentPacksTotalBytes();

  return (
    <section style={{ display: "grid", gap: 10, marginBottom: 18 }}>
      <div style={{ padding: 12, borderRadius: 16, border: `1px solid ${theme.borderSoft}`, background: theme.cardBackground || "rgba(8,15,26,.94)" }}>
        <div style={{ fontSize: 12, fontWeight: 1000, color: theme.text }}>{tr("Contenus lourds hors application", "Heavy content outside the app", "Contenido pesado fuera de la app")}</div>
        <div style={{ marginTop: 5, fontSize: 10.5, lineHeight: 1.45, color: theme.textSoft }}>
          {tr(
            "Le cœur de l’application reste léger. Les gros médias sont diffusés depuis Cloudflare et peuvent être installés ici pour fonctionner hors ligne.",
            "The app core stays light. Large media is streamed from Cloudflare and can be installed here for offline use.",
            "El núcleo de la app sigue siendo ligero. Los medios pesados se transmiten desde Cloudflare y pueden instalarse aquí para usarlos sin conexión."
          )}
        </div>
        <div style={{ marginTop: 9, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 9, color: theme.textSoft, fontWeight: 900 }}>
            {installedCount}/{CONTENT_PACK_IDS.length} {tr("packs installés", "packs installed", "packs instalados")} · {bytesLabel(totalPackBytes)}
          </span>
          <span
            title={tr("Passerelle Cloudflare des packs", "Cloudflare content-pack gateway", "Pasarela Cloudflare de packs")}
            style={{
              fontSize: 8.5,
              fontWeight: 1000,
              borderRadius: 999,
              padding: "4px 7px",
              border: `1px solid ${gateway === "online" ? `${theme.success}66` : gateway === "offline" ? `${theme.danger}66` : theme.borderSoft}`,
              color: gateway === "online" ? theme.success : gateway === "offline" ? theme.danger : theme.textSoft,
            }}
          >
            {gateway === "online"
              ? tr("CLOUD CONNECTÉ", "CLOUD ONLINE", "CLOUD CONECTADO")
              : gateway === "offline"
              ? tr("CLOUD INDISPONIBLE", "CLOUD OFFLINE", "CLOUD NO DISPONIBLE")
              : tr("TEST CLOUD…", "CHECKING CLOUD…", "PROBANDO CLOUD…")}
          </span>
          <div style={{ flex: 1 }} />
          <button type="button" disabled={allBusy || busy !== null || installedCount === CONTENT_PACK_IDS.length} onClick={() => void installAll()} style={{ minHeight: 32, borderRadius: 10, border: `1px solid ${theme.primary}66`, background: `${theme.primary}14`, color: theme.primary, padding: "0 10px", fontSize: 9, fontWeight: 1000, cursor: allBusy ? "wait" : "pointer" }}>
            {tr("TOUT INSTALLER", "INSTALL ALL", "INSTALAR TODO")}
          </button>
          <button type="button" disabled={allBusy || busy !== null || installedCount === 0} onClick={() => void removeAll()} style={{ minHeight: 32, borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", color: theme.textSoft, padding: "0 10px", fontSize: 9, fontWeight: 1000, cursor: allBusy ? "wait" : "pointer" }}>
            {tr("TOUT SUPPRIMER", "REMOVE ALL", "ELIMINAR TODO")}
          </button>
        </div>
      </div>

      {CONTENT_PACK_IDS.map((id) => {
        const meta = CONTENT_PACK_META[id];
        const info = contentPackInfo(id);
        const status = getContentPackStatus(id);
        const activeProgress = busy === id ? progress : null;
        const percent = activeProgress && activeProgress.totalBytes > 0
          ? Math.min(100, Math.round((activeProgress.completedBytes / activeProgress.totalBytes) * 100))
          : 0;
        return (
          <div key={id} style={{ padding: 12, borderRadius: 16, border: `1px solid ${status.installed ? `${theme.primary}88` : theme.borderSoft}`, background: theme.cardBackground || "rgba(8,15,26,.94)", boxShadow: status.installed ? `0 0 18px ${theme.primary}12` : "none" }}>
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: theme.text, fontWeight: 1000, fontSize: 12 }}>{meta.title}</div>
                <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.8, lineHeight: 1.4 }}>{meta.subtitle}</div>
              </div>
              <div style={{ flex: "0 0 auto", borderRadius: 999, border: `1px solid ${status.installed ? `${theme.primary}77` : theme.borderSoft}`, padding: "4px 7px", fontSize: 8.5, fontWeight: 1000, color: status.installed ? theme.primary : theme.textSoft }}>
                {status.installed ? tr("INSTALLÉ", "INSTALLED", "INSTALADO") : bytesLabel(Number(info.totalBytes || 0))}
              </div>
            </div>

            {activeProgress ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}>
                  <div style={{ width: `${percent}%`, height: "100%", background: theme.primary, transition: "width .18s ease" }} />
                </div>
                <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9 }}>{percent}% · {activeProgress.completedFiles}/{activeProgress.totalFiles}</div>
              </div>
            ) : null}

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => status.installed ? void remove(id) : void install(id)}
              style={{ marginTop: 10, width: "100%", minHeight: 39, borderRadius: 12, border: `1px solid ${status.installed ? theme.borderSoft : `${theme.primary}88`}`, background: status.installed ? "rgba(255,255,255,.03)" : `${theme.primary}18`, color: status.installed ? theme.textSoft : theme.primary, fontWeight: 1000, cursor: busy ? "wait" : "pointer" }}
            >
              {busy === id
                ? tr("Téléchargement…", "Downloading…", "Descargando…")
                : status.installed
                ? tr("Supprimer de cet appareil", "Remove from this device", "Eliminar de este dispositivo")
                : tr("Installer pour usage hors ligne", "Install for offline use", "Instalar para usar sin conexión")}
            </button>
          </div>
        );
      })}

      {message ? <div style={{ padding: "9px 11px", borderRadius: 12, border: `1px solid ${theme.borderSoft}`, color: theme.textSoft, fontSize: 10, lineHeight: 1.4 }}>{message}</div> : null}
    </section>
  );
}
