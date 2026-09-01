import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  CONTENT_PACK_META,
  contentPackInfo,
  getContentPackStatus,
  installContentPack,
  removeContentPack,
  subscribeContentPacks,
  type ContentPackId,
  type ContentPackProgress,
} from "../../lib/contentPacks";

const PACK_IDS: ContentPackId[] = ["fit-awena", "navigation-music", "collectible-cards"];

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

  React.useEffect(() => subscribeContentPacks(refresh), []);

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
      </div>

      {PACK_IDS.map((id) => {
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
