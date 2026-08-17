// @ts-nocheck
import React from "react";
import BackDot from "../../components/BackDot";
import { PageAdBanner } from "../../monetization/AdSlot";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { useAwenaOptional } from "../../awena/AwenaProvider";
import QRCode from "qrcode";
import {
  DEFAULT_GOOGLE_CAST_APP_ID,
  clearGoogleCastDiagLog,
  endGoogleCastSession,
  getGoogleCastAppId,
  getGoogleCastDiagLog,
  getGoogleCastState,
  pingGoogleCastReceiver,
  requestGoogleCastSession,
  resetGoogleCastAppId,
  setGoogleCastAppId,
  subscribeGoogleCastStatus,
} from "../../cast/googleCast";
import { buildViewerWaitingSnapshot } from "../../lib/viewer/buildViewerSnapshot";
import { closeViewerSession, createViewerSession, publishViewerSnapshot, viewerJoinUrl } from "../../lib/viewer/viewerClient";
import { clearActiveViewerSession, getActiveViewerSession, setActiveViewerSession, subscribeViewerSessionChanged } from "../../lib/viewer/viewerSession";
import { clearViewerDiagLog, getViewerDiagLog } from "../../lib/viewer/viewerPublisher";
import { getViewerAutoPublish, getViewerPollMs, setViewerAutoPublish, setViewerPollMs } from "../../lib/viewer/viewerSettings";
import type { ViewerSessionInfo } from "../../lib/viewer/types";

type ScreenTab = "cast" | "viewer" | "settings";

type Props = {
  go: (tab: any, params?: any) => void;
  initialTab?: ScreenTab | null;
};

const TAB_STORAGE_KEY = "dc_screens_initial_tab_v1";
const PAGE_BG = "radial-gradient(circle at top, rgba(22,34,58,.98) 0%, rgba(8,12,20,1) 52%, rgba(5,7,12,1) 100%)";
const CARD_BG = "linear-gradient(180deg, rgba(12,18,30,.96), rgba(8,10,16,.98))";
const CARD_BORDER = "1px solid rgba(255,255,255,.08)";
const GOLD = "#ffd15c";
const TEXT_SOFT = "rgba(255,255,255,.72)";
const TEXT_MUTED = "rgba(255,255,255,.54)";
const GREEN = "#86efac";
const RED = "#fca5a5";

const SCREEN_RETURN_TAB_KEY = "dc_screens_return_tab_v1";
const SCREEN_RETURN_PARAMS_KEY = "dc_screens_return_params_v1";
const AWENA_AVATAR = "/awena/awena-avatar.webp";

function ScreenIcon({ name, size = 24 }: { name: "cast" | "viewer" | "settings" | "play" | "stop" | "ping" | "trash" | "link" | "save" | "reset" | "qr"; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "cast") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M3 18a3 3 0 0 1 3 3M3 13a8 8 0 0 1 8 8M3 8a13 13 0 0 1 13 13M5 5h14v10"/></svg>;
  if (name === "viewer") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="6" y="2.8" width="12" height="18.4" rx="2.5"/><path {...p} d="M10 18h4"/></svg>;
  if (name === "settings") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m12 3 1.6 2.4a2 2 0 0 0 1.1.8l2.8.7-.7 2.8a2 2 0 0 0 .2 1.4l1.4 2.3-2.3 1.4a2 2 0 0 0-1 .9l-.8 2.7-2.8-.6a2 2 0 0 0-1.4.2L9 21l-1.4-2.3a2 2 0 0 0-.9-1l-2.7-.8.6-2.8a2 2 0 0 0-.2-1.4L3 9l2.3-1.4a2 2 0 0 0 1-.9l.8-2.7 2.8.6a2 2 0 0 0 1.4-.2Z"/><circle {...p} cx="12" cy="12" r="2.8"/></svg>;
  if (name === "play") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m8 5 11 7-11 7V5Z"/></svg>;
  if (name === "stop") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="6" y="6" width="12" height="12" rx="2"/></svg>;
  if (name === "ping") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 12h10m-4-4 4 4-4 4M18 5v14"/></svg>;
  if (name === "trash") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>;
  if (name === "link") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M10 13a4 4 0 0 0 5.7 0l2.3-2.3A4 4 0 0 0 12.3 5L11 6.3M14 11a4 4 0 0 0-5.7 0L6 13.3A4 4 0 0 0 11.7 19l1.3-1.3"/></svg>;
  if (name === "save") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 3h12l2 2v16H5V3Z"/><path {...p} d="M8 3v6h8V3M8 21v-7h8v7"/></svg>;
  if (name === "reset") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 6v5h5M5 10a8 8 0 1 1 1.8 7.2"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="4" y="4" width="6" height="6"/><rect {...p} x="14" y="4" width="6" height="6"/><rect {...p} x="4" y="14" width="6" height="6"/><path {...p} d="M14 14h2v2h-2zm4 0h2v6h-6v-2"/></svg>;
}

function ScreensAwenaDot({ activeTab, theme }: { activeTab: ScreenTab; theme: any }) {
  const awena = useAwenaOptional();
  const label = activeTab === "cast" ? "Cast TV" : activeTab === "viewer" ? "Viewer tablette" : "Réglages Écrans";
  const open = async () => {
    if (!awena) return;
    awena.setRuntime({ route: "cast_host", mode: "settings-screens", phase: "menu", inGame: false, screenLabel: label, extra: { settingsSection: activeTab } });
    awena.openPanel();
    await awena.ask(`Explique-moi en détail la page Écrans, section ${label}. Décris chaque fonction, comment l'utiliser, les prérequis, les erreurs fréquentes et les conseils pratiques. Reste disponible pour mes questions suivantes.`);
  };
  return (
    <button type="button" onClick={() => void open()} aria-label={`Awena · ${label}`} title={`Awena · ${label}`} style={{ width: 40, height: 40, borderRadius: 999, border: "none", padding: 3, background: "linear-gradient(135deg,#ffe600 0%,#27ff88 24%,#16e8ff 48%,#ff38c7 73%,#8d52ff 100%)", boxShadow: "0 0 14px rgba(22,232,255,.42),0 0 22px rgba(255,56,199,.22),0 0 0 2px rgba(0,0,0,.45)", cursor: awena ? "pointer" : "default", opacity: awena ? 1 : .5 }}><span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "block", background: "#050713" }}><img src={AWENA_AVATAR} alt="Awena" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></span></button>
  );
}

function normalizeInitialTab(raw: any): ScreenTab {
  const value = String(raw || "").toLowerCase();
  return value === "viewer" || value === "settings" || value === "cast" ? (value as ScreenTab) : "cast";
}

function consumeStoredInitialTab(): ScreenTab | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TAB_STORAGE_KEY);
    window.sessionStorage.removeItem(TAB_STORAGE_KEY);
    if (!raw) return null;
    return normalizeInitialTab(raw);
  } catch {
    return null;
  }
}

function cardStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: CARD_BG,
    border: CARD_BORDER,
    borderRadius: 22,
    padding: 14,
    boxShadow: "0 18px 48px rgba(0,0,0,.24)",
    ...extra,
  };
}

function sectionTitle(icon: string, title: string, subtitle?: string) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr)", gap: 10, alignItems: "start", marginBottom: 12 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          border: "1px solid rgba(255,209,92,.26)",
          background: "linear-gradient(180deg, rgba(255,209,92,.12), rgba(255,209,92,.03))",
          color: GOLD,
          fontSize: 20,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, color: "#fff", fontSize: 15, lineHeight: 1.15, fontWeight: 1050 }}>{title}</h2>
        {subtitle ? <div style={{ marginTop: 4, color: TEXT_SOFT, fontSize: 12, lineHeight: 1.35 }}>{subtitle}</div> : null}
      </div>
    </div>
  );
}

function pill(active: boolean, label: string, tone: "ok" | "warn" | "idle" = "idle"): React.CSSProperties {
  const isOk = tone === "ok";
  const isWarn = tone === "warn";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "0 10px",
    border: `1px solid ${active ? (isOk ? "rgba(74,222,128,.30)" : isWarn ? "rgba(248,113,113,.26)" : "rgba(255,209,92,.24)") : "rgba(255,255,255,.10)"}`,
    background: active ? (isOk ? "rgba(34,197,94,.10)" : isWarn ? "rgba(239,68,68,.10)" : "rgba(255,209,92,.08)") : "rgba(255,255,255,.04)",
    color: active ? (isOk ? GREEN : isWarn ? RED : "#fff1b8") : "rgba(255,255,255,.72)",
    fontWeight: 900,
    fontSize: 11,
  };
}

function buttonStyle(tone: "primary" | "secondary" | "danger" = "secondary", wide = false): React.CSSProperties {
  const primary = tone === "primary";
  const danger = tone === "danger";
  return {
    minHeight: 42,
    width: wide ? "100%" : undefined,
    borderRadius: 14,
    padding: "0 14px",
    border: primary
      ? "1px solid rgba(255,209,92,.42)"
      : danger
      ? "1px solid rgba(248,113,113,.24)"
      : "1px solid rgba(255,255,255,.10)",
    background: primary
      ? "linear-gradient(180deg, rgba(255,209,92,.98), rgba(242,185,46,.96))"
      : danger
      ? "rgba(255,255,255,.06)"
      : "rgba(255,255,255,.04)",
    color: primary ? "#17120b" : danger ? "#fff" : "#eef2ff",
    fontWeight: 1000,
    fontSize: 12.5,
    boxShadow: primary ? "0 6px 18px rgba(255,209,92,.14)" : "none",
    cursor: "pointer",
  };
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    color: "#fff",
    outline: "none",
    padding: "0 14px",
    fontWeight: 850,
    fontSize: 13,
    ...extra,
  };
}

function stateRow(label: string, value: React.ReactNode, tone: "normal" | "ok" | "warn" = "normal") {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", minHeight: 36, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ color: "rgba(255,255,255,.80)", fontSize: 12 }}>{label}</div>
      <div style={{ color: tone === "ok" ? GREEN : tone === "warn" ? RED : "#fff", fontWeight: 900, fontSize: 12, textAlign: "right", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function DiagnosticPreview({ rows, empty, color = GOLD }: { rows: any[]; empty: string; color?: string }) {
  const items = rows.slice().reverse().slice(0, 2);
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.15)", overflow: "hidden" }}>
      {items.length ? (
        items.map((row, idx) => (
          <div key={idx} style={{ padding: "10px 12px", borderBottom: idx === items.length - 1 ? "none" : "1px solid rgba(255,255,255,.06)", display: "grid", gridTemplateColumns: "68px minmax(0,1fr)", gap: 10, fontSize: 10.5, lineHeight: 1.35 }}>
            <div style={{ color, fontWeight: 1000 }}>{row.now || (row.at ? new Date(row.at).toLocaleTimeString() : "—")}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "rgba(255,255,255,.88)" }}>{row.entry}</div>
              {row.extra != null ? <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: TEXT_MUTED, marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{JSON.stringify(row.extra)}</div> : null}
            </div>
          </div>
        ))
      ) : (
        <div style={{ padding: 12, color: TEXT_SOFT, fontSize: 12 }}>{empty}</div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 58,
        height: 32,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.10)",
        background: checked ? "linear-gradient(180deg, rgba(255,209,92,.95), rgba(242,185,46,.95))" : "rgba(255,255,255,.08)",
        padding: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        cursor: "pointer",
      }}
    >
      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 2px 7px rgba(0,0,0,.26)" }} />
    </button>
  );
}

function compactInfoBox(title: string, text: string, tone: "ok" | "idle" = "idle") {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${tone === "ok" ? "rgba(74,222,128,.18)" : "rgba(255,255,255,.08)"}`, background: tone === "ok" ? "rgba(34,197,94,.06)" : "rgba(255,255,255,.03)", padding: 12 }}>
      <div style={{ color: tone === "ok" ? GREEN : "#fff", fontWeight: 950, fontSize: 13 }}>{title}</div>
      <div style={{ color: TEXT_SOFT, marginTop: 4, fontSize: 11.5, lineHeight: 1.35 }}>{text}</div>
    </div>
  );
}

export default function CastHostPage({ go, initialTab }: Props) {
  const { theme } = useTheme() as any;
  const { lang } = useLang() as any;
  const L = (fr: string, en: string, es: string) => lang === "en" ? en : lang === "es" ? es : fr;
  const [activeTab, setActiveTab] = React.useState<ScreenTab>(() => initialTab || consumeStoredInitialTab() || "cast");

  const [castState, setCastState] = React.useState(getGoogleCastState());
  const [appId, setAppIdState] = React.useState(getGoogleCastAppId());
  const [castDiag, setCastDiag] = React.useState<any[]>(getGoogleCastDiagLog());
  const [castMessage, setCastMessage] = React.useState("Cast prêt : lance la session TV avant de démarrer une partie.");
  const [castBusy, setCastBusy] = React.useState(false);

  const [viewer, setViewer] = React.useState<ViewerSessionInfo | null>(() => getActiveViewerSession());
  const [viewerDiag, setViewerDiag] = React.useState<any[]>(() => getViewerDiagLog());
  const [viewerMessage, setViewerMessage] = React.useState("Crée une session viewer avant la partie, puis ouvre le lien ou le QR code sur la tablette.");
  const [viewerBusy, setViewerBusy] = React.useState(false);
  const [qr, setQr] = React.useState("");

  const [pollMs, setPollMsState] = React.useState(() => getViewerPollMs());
  const [autoPublish, setAutoPublishState] = React.useState(() => getViewerAutoPublish());

  React.useEffect(() => {
    if (!initialTab) return;
    setActiveTab(normalizeInitialTab(initialTab));
  }, [initialTab]);

  React.useEffect(() => {
    const refresh = () => {
      setCastState(getGoogleCastState());
      setAppIdState(getGoogleCastAppId());
      setCastDiag(getGoogleCastDiagLog());
    };
    refresh();
    return subscribeGoogleCastStatus(refresh);
  }, []);

  React.useEffect(() => subscribeViewerSessionChanged(() => setViewer(getActiveViewerSession())), []);

  React.useEffect(() => {
    const refresh = () => setViewerDiag(getViewerDiagLog());
    window.addEventListener("dc-viewer-diag", refresh as any);
    return () => window.removeEventListener("dc-viewer-diag", refresh as any);
  }, []);

  React.useEffect(() => {
    let alive = true;
    const url = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
    if (!url) {
      setQr("");
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 190, errorCorrectionLevel: "M" })
      .then((dataUrl: string) => {
        if (alive) setQr(dataUrl);
      })
      .catch(() => {
        if (alive) setQr("");
      });
    return () => {
      alive = false;
    };
  }, [viewer?.joinUrl, viewer?.sessionId]);

  function openTab(tab: ScreenTab) {
    setActiveTab(tab);
    try {
      window.history.replaceState(null, "", `#/cast${tab === "cast" ? "" : `/${tab}`}`);
    } catch {}
  }

  function saveAppId() {
    const next = String(appId || DEFAULT_GOOGLE_CAST_APP_ID).trim().toUpperCase();
    setGoogleCastAppId(next);
    setAppIdState(getGoogleCastAppId());
    setCastState(getGoogleCastState());
    setCastDiag(getGoogleCastDiagLog());
    setCastMessage(`App ID enregistré : ${getGoogleCastAppId()}`);
  }

  function restoreDefault() {
    resetGoogleCastAppId();
    setAppIdState(getGoogleCastAppId());
    setCastState(getGoogleCastState());
    setCastDiag(getGoogleCastDiagLog());
    setCastMessage(`App ID par défaut restauré : ${getGoogleCastAppId()}`);
  }

  async function startCast() {
    setCastBusy(true);
    setCastMessage("Ouverture du dialogue Cast…");
    try {
      const res = await requestGoogleCastSession();
      setCastState(getGoogleCastState());
      setCastDiag(getGoogleCastDiagLog());
      if (res.ok) {
        const next = getGoogleCastState();
        setCastMessage(next.deviceName ? `Chromecast connecté : ${next.deviceName}` : "Session Cast démarrée.");
      } else {
        setCastMessage(res.reason === "cancel" ? "Ouverture Cast annulée." : `Impossible d’ouvrir Cast : ${res.reason}`);
      }
    } finally {
      setCastBusy(false);
    }
  }

  async function stopCast() {
    setCastBusy(true);
    try {
      await endGoogleCastSession();
      setCastMessage("Session Cast arrêtée.");
      setCastState(getGoogleCastState());
      setCastDiag(getGoogleCastDiagLog());
    } finally {
      setCastBusy(false);
    }
  }

  async function pingCast() {
    setCastBusy(true);
    try {
      const ok = await pingGoogleCastReceiver();
      setCastMessage(ok ? "PING envoyé au receiver Cast." : "PING impossible : aucune session Cast active ou erreur receiver.");
      setCastDiag(getGoogleCastDiagLog());
    } finally {
      setCastBusy(false);
    }
  }

  function clearCastDiag() {
    clearGoogleCastDiagLog();
    setCastDiag(getGoogleCastDiagLog());
  }

  async function startViewer() {
    setViewerBusy(true);
    setViewerMessage("Création de la session viewer…");
    try {
      const res = await createViewerSession();
      const now = Date.now();
      const info: ViewerSessionInfo = {
        sessionId: res.sessionId,
        code: res.code || res.sessionId,
        joinUrl: res.joinUrl || viewerJoinUrl(res.sessionId),
        createdAt: now,
        expiresAt: res.expiresInSeconds ? now + res.expiresInSeconds * 1000 : null,
        enabled: true,
      };
      setActiveViewerSession(info);
      setViewer(info);
      try {
        await publishViewerSnapshot(info.sessionId, buildViewerWaitingSnapshot(info.sessionId));
      } catch {}
      setViewerMessage("Session viewer active. Ouvre le lien ou le QR code sur la tablette, puis lance ta partie.");
    } catch (e: any) {
      const message = String(e?.message || e || "création impossible");
      setViewerMessage(
        message.toLowerCase().includes("not found") || message.toLowerCase().includes("404")
          ? "Erreur viewer : endpoint introuvable. Vérifie le déploiement /api/viewer sur Cloudflare Pages ou le Worker online."
          : `Erreur viewer : ${message}`
      );
    } finally {
      setViewerBusy(false);
    }
  }

  async function stopViewer() {
    const sid = viewer?.sessionId;
    setViewerBusy(true);
    try {
      if (sid) await closeViewerSession(sid);
    } catch {}
    clearActiveViewerSession();
    setViewer(null);
    setViewerMessage("Session viewer arrêtée.");
    setViewerBusy(false);
  }

  async function copyViewerLink() {
    const url = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setViewerMessage("Lien viewer copié.");
    } catch {
      setViewerMessage(url);
    }
  }

  function clearViewerDiag() {
    clearViewerDiagLog();
    setViewerDiag([]);
  }

  function saveViewerSettings() {
    const nextPoll = setViewerPollMs(pollMs);
    const nextAuto = setViewerAutoPublish(autoPublish);
    setPollMsState(nextPoll);
    setAutoPublishState(nextAuto);
    setViewerMessage(`Réglages viewer enregistrés : ${nextPoll} ms, publication ${nextAuto ? "active" : "désactivée"}.`);
  }

  const tabMeta: Array<{ key: ScreenTab; title: string; subtitle: string; icon: "cast" | "viewer" | "settings" }> = [
    { key: "cast", title: "CAST", subtitle: "TV", icon: "cast" },
    { key: "viewer", title: "VIEWER", subtitle: L("Tablette", "Tablet", "Tableta"), icon: "viewer" },
    { key: "settings", title: L("RÉGLAGES", "SETTINGS", "AJUSTES"), subtitle: L("Options", "Options", "Opciones"), icon: "settings" },
  ];

  const viewerLink = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
  const castNoDevice = !castState.isCasting && !castState.deviceName;

  const handleBack = () => {
    let target = "settings";
    let targetParams: any = null;
    try {
      const stored = String(window.sessionStorage.getItem(SCREEN_RETURN_TAB_KEY) || "").trim();
      if (stored && stored !== "cast_host") target = stored;
      const rawParams = window.sessionStorage.getItem(SCREEN_RETURN_PARAMS_KEY);
      if (rawParams) targetParams = JSON.parse(rawParams);
      window.sessionStorage.removeItem(SCREEN_RETURN_TAB_KEY);
      window.sessionStorage.removeItem(SCREEN_RETURN_PARAMS_KEY);
    } catch {}
    go(target as any, targetParams || undefined);
  };

  const pageBg = `radial-gradient(760px 420px at 50% -10%, ${theme.primary}18, transparent 62%), ${theme.bg || "#050712"}`;
  const themedCard: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    boxShadow: `0 14px 30px rgba(0,0,0,.34), 0 0 18px ${theme.primary}14`,
    padding: 14,
  };
  const iconBox: React.CSSProperties = { width: 42, height: 42, borderRadius: 14, border: `1px solid ${theme.primary}55`, background: `${theme.primary}10`, color: theme.primary, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 0 14px ${theme.primary}22` };
  const actionBtn = (primary = false, danger = false): React.CSSProperties => ({
    minHeight: 44,
    borderRadius: 14,
    border: `1px solid ${danger ? "rgba(255,90,105,.55)" : primary ? `${theme.primary}88` : theme.borderSoft}`,
    background: danger ? "rgba(255,70,90,.08)" : primary ? `${theme.primary}18` : "rgba(255,255,255,.03)",
    color: danger ? "#ff8b96" : primary ? theme.primary : theme.text,
    fontWeight: 950,
    fontSize: 11,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "0 12px",
    boxShadow: primary ? `0 0 14px ${theme.primary}22` : "none",
  });
  const Head = ({ icon, title, subtitle }: { icon: "cast" | "viewer" | "settings" | "qr"; title: string; subtitle: string }) => (
    <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 10, alignItems: "center", marginBottom: 12 }}>
      <div style={iconBox}><ScreenIcon name={icon} /></div>
      <div><div style={{ color: theme.primary, fontWeight: 1000, fontSize: 14.5 }}>{title}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 10.5, lineHeight: 1.35 }}>{subtitle}</div></div>
    </div>
  );
  const MiniState = ({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) => (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "8px 0", borderTop: `1px solid ${theme.borderSoft}` }}><div style={{ color: theme.textSoft, fontSize: 10.5 }}>{label}</div><div style={{ color: ok ? theme.success : theme.text, fontWeight: 900, fontSize: 10.5, textAlign: "right", overflowWrap: "anywhere" }}>{value}</div></div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: pageBg, color: theme.text }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "12px 10px 92px" }}>
        <header style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) 44px", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <BackDot onClick={handleBack} size={40} color={theme.primary} glow={`${theme.primary}55`} title={L("Retour", "Back", "Volver")} />
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div style={{ color: theme.primary, fontSize: "clamp(22px,6.5vw,34px)", fontWeight: 1000, textTransform: "uppercase", letterSpacing: 1, lineHeight: 1.05, textShadow: `0 0 12px ${theme.primary}44` }}>{L("ÉCRANS", "SCREENS", "PANTALLAS")}</div>
            <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 11 }}>{L("Cast TV & Viewer tablette", "Cast TV & tablet Viewer", "Cast TV y Viewer para tableta")}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><ScreensAwenaDot activeTab={activeTab} theme={theme} /></div>
        </header>

        <PageAdBanner placement="screens" slotKey="page-screens-under-header" />

        <nav style={{ ...themedCard, padding: 5, marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>
          {tabMeta.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => openTab(tab.key)} style={{ minHeight: 68, borderRadius: 14, border: `1px solid ${active ? `${theme.primary}77` : "transparent"}`, background: active ? `${theme.primary}12` : "transparent", color: active ? theme.primary : theme.textSoft, cursor: "pointer", display: "grid", placeItems: "center", alignContent: "center", gap: 3, padding: 7, boxShadow: active ? `0 0 14px ${theme.primary}22` : "none" }}>
                <ScreenIcon name={tab.icon} size={22} />
                <span style={{ fontSize: 10.5, fontWeight: 1000 }}>{tab.title}</span>
                <span style={{ fontSize: 8.5 }}>{tab.subtitle}</span>
              </button>
            );
          })}
        </nav>

        {activeTab === "cast" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={themedCard}>
              <Head icon="cast" title={L("CAST TV", "CAST TV", "CAST TV")} subtitle={L("Diffusion sur Chromecast / Google Cast.", "Broadcast to Chromecast / Google Cast.", "Difusión a Chromecast / Google Cast.")} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 11 }}>
                <span style={{ borderRadius: 999, border: `1px solid ${castState.supported ? `${theme.success}55` : theme.borderSoft}`, background: castState.supported ? `${theme.success}12` : "rgba(255,255,255,.03)", color: castState.supported ? theme.success : theme.textSoft, padding: "5px 9px", fontSize: 9.5, fontWeight: 950 }}>{castState.supported ? L("Compatible", "Compatible", "Compatible") : L("Non compatible", "Not compatible", "No compatible")}</span>
                <span style={{ borderRadius: 999, border: `1px solid ${castNoDevice ? theme.borderSoft : `${theme.success}55`}`, background: "rgba(255,255,255,.03)", color: castNoDevice ? theme.textSoft : theme.success, padding: "5px 9px", fontSize: 9.5, fontWeight: 950 }}>{castNoDevice ? L("Aucun appareil", "No device", "Sin dispositivo") : castState.deviceName || L("Connecté", "Connected", "Conectado")}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                <button onClick={startCast} disabled={castBusy} style={actionBtn(true)}><ScreenIcon name="play" size={18}/>{castBusy ? L("Ouverture…", "Opening…", "Abriendo…") : L("Lancer", "Start", "Iniciar")}</button>
                <button onClick={stopCast} disabled={castBusy} style={actionBtn(false, true)}><ScreenIcon name="stop" size={18}/>{L("Arrêter", "Stop", "Detener")}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 8 }}>
                <button onClick={pingCast} disabled={castBusy} style={actionBtn(false)}><ScreenIcon name="ping" size={18}/>Ping</button>
                <button onClick={clearCastDiag} style={actionBtn(false)}><ScreenIcon name="trash" size={18}/>{L("Vider logs", "Clear logs", "Vaciar logs")}</button>
              </div>
              <div style={{ marginTop: 10, color: castMessage.startsWith("Impossible") ? theme.danger : theme.textSoft, fontSize: 10.5, lineHeight: 1.4 }}>{castMessage}</div>
            </section>

            <section style={themedCard}>
              <details>
                <summary style={{ color: theme.primary, fontWeight: 950, fontSize: 11, cursor: "pointer" }}>{L("État & diagnostics", "Status & diagnostics", "Estado y diagnósticos")}</summary>
                <div style={{ marginTop: 8 }}>
                  <MiniState label="SDK" value={castState.sdkLoaded ? L("Chargé", "Loaded", "Cargado") : L("Non chargé", "Not loaded", "No cargado")} ok={castState.sdkLoaded}/>
                  <MiniState label={L("Appareil", "Device", "Dispositivo")} value={castState.deviceName || "—"}/>
                  <MiniState label={L("Session", "Session", "Sesión")} value={(castState as any).sessionId || "—"}/>
                  <div style={{ marginTop: 9 }}><DiagnosticPreview rows={castDiag} empty={L("Aucune entrée Cast.", "No Cast entries.", "Sin entradas Cast.")} color={theme.primary}/></div>
                </div>
              </details>
            </section>
          </div>
        ) : null}

        {activeTab === "viewer" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={themedCard}>
              <Head icon="viewer" title={L("VIEWER TABLETTE", "TABLET VIEWER", "VIEWER TABLETA")} subtitle={L("Un second écran synchronisé via lien ou QR code.", "A synchronized second screen via link or QR code.", "Una segunda pantalla sincronizada por enlace o QR.")} />
              <div style={{ borderRadius: 14, border: `1px solid ${viewer?.sessionId ? `${theme.success}55` : theme.borderSoft}`, background: viewer?.sessionId ? `${theme.success}0d` : "rgba(255,255,255,.025)", padding: 10 }}><div style={{ color: viewer?.sessionId ? theme.success : theme.textSoft, fontWeight: 950, fontSize: 11 }}>{viewer?.sessionId ? L("SESSION ACTIVE", "ACTIVE SESSION", "SESIÓN ACTIVA") : L("AUCUNE SESSION", "NO SESSION", "SIN SESIÓN")}</div>{viewer?.sessionId ? <div style={{ marginTop: 3, color: theme.textSoft, fontSize: 9.5 }}>{viewer.code || viewer.sessionId}</div> : null}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 9 }}>
                <button disabled={viewerBusy} onClick={viewer?.sessionId ? stopViewer : startViewer} style={actionBtn(true)}>{viewer?.sessionId ? <ScreenIcon name="stop" size={18}/> : <ScreenIcon name="play" size={18}/>} {viewer?.sessionId ? L("Arrêter", "Stop", "Detener") : viewerBusy ? L("Création…", "Creating…", "Creando…") : L("Créer session", "Create session", "Crear sesión")}</button>
                <button disabled={!viewer?.sessionId} onClick={() => viewer?.sessionId && go("viewer_display", { sessionId: viewer.sessionId })} style={{ ...actionBtn(false), opacity: viewer?.sessionId ? 1 : .45 }}><ScreenIcon name="viewer" size={18}/>{L("Ouvrir", "Open", "Abrir")}</button>
              </div>
              <div style={{ marginTop: 10, color: viewerMessage.startsWith("Erreur") ? theme.danger : theme.textSoft, fontSize: 10.5, lineHeight: 1.4 }}>{viewerMessage}</div>
            </section>

            <section style={themedCard}>
              <Head icon="qr" title="QR CODE" subtitle={L("Scanne depuis la tablette pour ouvrir directement le Viewer.", "Scan from the tablet to open the Viewer directly.", "Escanea desde la tableta para abrir el Viewer directamente.")} />
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 132px", gap: 10, alignItems: "center" }} className="screens-viewer-grid">
                <div>
                  <button disabled={!viewerLink} onClick={copyViewerLink} style={{ ...actionBtn(false), width: "100%", opacity: viewerLink ? 1 : .45 }}><ScreenIcon name="link" size={18}/>{L("Copier le lien", "Copy link", "Copiar enlace")}</button>
                  {viewerLink ? <div style={{ marginTop: 8, color: theme.textSoft, fontSize: 8.5, lineHeight: 1.35, overflowWrap: "anywhere" }}>{viewerLink}</div> : null}
                </div>
                <div style={{ width: 132, height: 132, borderRadius: 15, background: "#fff", display: "grid", placeItems: "center", padding: 6, justifySelf: "end" }}>{qr ? <img src={qr} alt="QR code viewer" style={{ width: 120, height: 120, display: "block" }}/> : <div style={{ color: "#111", fontSize: 9.5, textAlign: "center", fontWeight: 950 }}>{L("Crée une session", "Create a session", "Crea una sesión")}</div>}</div>
              </div>
            </section>

            <section style={themedCard}><details><summary style={{ color: theme.primary, fontWeight: 950, fontSize: 11, cursor: "pointer" }}>{L("État & diagnostics", "Status & diagnostics", "Estado y diagnósticos")}</summary><div style={{ marginTop: 8 }}><MiniState label={L("Session", "Session", "Sesión")} value={viewer?.sessionId ? (viewer.code || viewer.sessionId) : "—"}/><MiniState label={L("Synchronisation", "Sync", "Sincronización")} value={viewer?.sessionId ? L("Prête", "Ready", "Lista") : L("Inactive", "Inactive", "Inactiva")} ok={!!viewer?.sessionId}/><div style={{ marginTop: 9 }}><DiagnosticPreview rows={viewerDiag} empty={L("Aucune entrée Viewer.", "No Viewer entries.", "Sin entradas Viewer.")} color={theme.primary}/></div></div></details></section>
          </div>
        ) : null}

        {activeTab === "settings" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={themedCard}>
              <Head icon="cast" title={L("RÉGLAGES CAST", "CAST SETTINGS", "AJUSTES CAST")} subtitle={L("Receiver Google Cast utilisé par l’application.", "Google Cast receiver used by the app.", "Receiver Google Cast utilizado por la app.")} />
              <label style={{ display: "block", color: theme.textSoft, fontSize: 10, fontWeight: 900, marginBottom: 5 }}>Receiver Application ID</label>
              <input value={appId} onChange={(e) => setAppIdState(e.target.value.toUpperCase())} placeholder="3534BC6A" style={{ width: "100%", minHeight: 43, borderRadius: 13, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.03)", color: theme.text, padding: "0 12px", fontWeight: 900, outline: "none", boxSizing: "border-box" }}/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}><button onClick={saveAppId} style={actionBtn(true)}><ScreenIcon name="save" size={18}/>{L("Enregistrer", "Save", "Guardar")}</button><button onClick={restoreDefault} style={actionBtn(false)}><ScreenIcon name="reset" size={18}/>{L("Défaut", "Default", "Predeterminado")}</button></div>
            </section>

            <section style={themedCard}>
              <Head icon="viewer" title={L("RÉGLAGES VIEWER", "VIEWER SETTINGS", "AJUSTES VIEWER")} subtitle={L("Publication et fréquence de rafraîchissement de l’écran tablette.", "Publishing and refresh frequency for the tablet screen.", "Publicación y frecuencia de actualización de la pantalla de tableta.")} />
              <button type="button" onClick={() => setAutoPublishState(!autoPublish)} style={{ width: "100%", border: `1px solid ${theme.borderSoft}`, borderRadius: 14, background: "rgba(255,255,255,.025)", color: theme.text, padding: 11, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", textAlign: "left", cursor: "pointer" }}><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{L("Publication automatique", "Automatic publishing", "Publicación automática")}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.5 }}>{L("Envoie les snapshots à la tablette si une session est active.", "Sends snapshots to the tablet when a session is active.", "Envía snapshots a la tableta si hay una sesión activa.")}</div></div><span style={{ width: 48, height: 27, borderRadius: 999, padding: 3, display: "flex", alignItems: "center", justifyContent: autoPublish ? "flex-end" : "flex-start", background: autoPublish ? theme.primary : "rgba(255,255,255,.12)", boxShadow: autoPublish ? `0 0 12px ${theme.primary}44` : "none" }}><span style={{ width: 21, height: 21, borderRadius: "50%", background: autoPublish ? "#061018" : "#fff" }}/></span></button>
              <div style={{ marginTop: 10 }}><label style={{ display: "block", color: theme.textSoft, fontSize: 10, fontWeight: 900, marginBottom: 5 }}>{L("Intervalle de rafraîchissement", "Refresh interval", "Intervalo de actualización")}</label><div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}><input type="number" min={300} max={3000} step={100} value={pollMs} onChange={(e) => setPollMsState(Number(e.target.value || 700))} style={{ width: "100%", minHeight: 43, borderRadius: 13, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.03)", color: theme.text, padding: "0 12px", fontWeight: 900, outline: "none", boxSizing: "border-box" }}/><span style={{ color: theme.textSoft, fontSize: 10, fontWeight: 900 }}>ms</span></div></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 9 }}><button onClick={saveViewerSettings} style={actionBtn(true)}><ScreenIcon name="save" size={18}/>{L("Enregistrer", "Save", "Guardar")}</button><button onClick={() => { setPollMsState(700); setAutoPublishState(true); setViewerPollMs(700); setViewerAutoPublish(true); }} style={actionBtn(false)}><ScreenIcon name="reset" size={18}/>{L("Défaut", "Default", "Predeterminado")}</button></div>
            </section>

            <section style={themedCard}><details><summary style={{ color: theme.primary, fontWeight: 950, fontSize: 11, cursor: "pointer" }}>{L("Comment l’utiliser ?", "How to use it?", "¿Cómo usarlo?")}</summary><div style={{ marginTop: 8, color: theme.textSoft, fontSize: 10.5, lineHeight: 1.5 }}>1. {L("Lance Cast ou Viewer avant la partie.", "Start Cast or Viewer before the game.", "Inicia Cast o Viewer antes de la partida.")}<br/>2. {L("Reviens à la configuration du jeu.", "Return to game setup.", "Vuelve a la configuración del juego.")}<br/>3. {L("L’affichage externe se synchronise pendant la partie.", "The external display syncs during the game.", "La pantalla externa se sincroniza durante la partida.")}</div></details></section>
          </div>
        ) : null}
      </div>

      <style>{`@media(max-width:620px){.screens-viewer-grid{grid-template-columns:1fr!important}.screens-viewer-grid>div:last-child{justify-self:center!important}}`}</style>
    </div>
  );
}
