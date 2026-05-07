// @ts-nocheck
import React from "react";
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

  const tabMeta: Array<{ key: ScreenTab; title: string; subtitle: string; icon: string }> = [
    { key: "cast", title: "CAST", subtitle: "TV", icon: "📺" },
    { key: "viewer", title: "VIEWER", subtitle: "Tablette", icon: "📱" },
    { key: "settings", title: "RÉGLAGES", subtitle: "Options", icon: "⚙️" },
  ];

  const viewerLink = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
  const castNoDevice = !castState.isCasting && !castState.deviceName;

  return (
    <div style={{ minHeight: "100dvh", background: PAGE_BG, color: "#f8fafc" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "12px 10px 90px" }}>
        <header style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) 48px", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <button onClick={() => go("home")} style={{ ...buttonStyle("secondary"), minHeight: 44, borderRadius: 14, padding: 0, width: 44, justifySelf: "start" }}>←</button>
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div style={{ fontSize: "clamp(20px,6vw,34px)", lineHeight: 1, fontWeight: 1100, color: GOLD }}>Écrans</div>
            <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.25, color: TEXT_SOFT }}>Cast TV & Viewer tablette</div>
          </div>
          <div />
        </header>

        <nav style={{ ...cardStyle({ padding: 0, overflow: "hidden", marginBottom: 12 }) }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            {tabMeta.map((tab, idx) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => openTab(tab.key)}
                  style={{
                    minHeight: 74,
                    border: "none",
                    borderRight: idx < tabMeta.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none",
                    background: active ? "linear-gradient(180deg, rgba(255,209,92,.15), rgba(255,209,92,.04))" : "transparent",
                    color: active ? "#fff2bc" : "rgba(255,255,255,.84)",
                    boxShadow: active ? "inset 0 0 0 1px rgba(255,209,92,.42)" : "none",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    gap: 2,
                    padding: 8,
                  }}
                >
                  <div style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 1000, letterSpacing: .15 }}>{tab.title}</div>
                  <div style={{ fontSize: 10, color: active ? "#ffd15c" : TEXT_SOFT }}>{tab.subtitle}</div>
                </button>
              );
            })}
          </div>
        </nav>

        {activeTab === "cast" && (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={cardStyle()}>
              {sectionTitle("📺", "Cast TV / Chromecast", "À lancer avant la partie.")}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <div style={pill(castState.supported, castState.supported ? "Compatible" : "Non compatible", castState.supported ? "ok" : "warn")} />
                <div style={pill(castNoDevice, castNoDevice ? "Aucun appareil" : castState.deviceName || "Appareil détecté", castNoDevice ? "idle" : "ok")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }} className="screens-main-actions">
                <button onClick={startCast} disabled={castBusy} style={buttonStyle("primary", true)}>{castBusy ? "Ouverture…" : "▶ Lancer"}</button>
                <button onClick={stopCast} disabled={castBusy} style={buttonStyle("secondary", true)}>■ Arrêter</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 10 }} className="screens-sub-actions">
                <button onClick={pingCast} disabled={castBusy} style={buttonStyle("secondary", true)}>✈ Ping</button>
                <button onClick={clearCastDiag} style={buttonStyle("secondary", true)}>🗑 Diagnostic</button>
              </div>

              <div style={{ marginTop: 10, color: castMessage.startsWith("Impossible") ? RED : TEXT_SOFT, fontSize: 11.5, lineHeight: 1.35 }}>{castMessage}</div>
            </section>

            <section style={cardStyle()}>
              <div style={{ fontSize: 13.5, fontWeight: 1000, color: "#fff", marginBottom: 8 }}>État Cast</div>
              <div style={{ display: "grid" }}>
                {stateRow("Support navigateur", castState.supported ? "Oui" : "Non", castState.supported ? "ok" : "warn")}
                {stateRow("SDK", castState.sdkLoaded ? "Chargé" : "Non chargé", castState.sdkLoaded ? "ok" : "warn")}
                {stateRow("Appareil", castState.deviceName || "—")}
                {stateRow("Session", (castState as any).sessionId || "—")}
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 13.5, fontWeight: 1000, color: "#fff" }}>Derniers diagnostics</div>
                <button onClick={clearCastDiag} style={{ ...buttonStyle("secondary"), minHeight: 36, fontSize: 11 }}>Vider</button>
              </div>
              <DiagnosticPreview rows={castDiag} empty="Aucune entrée Cast." />
            </section>
          </div>
        )}

        {activeTab === "viewer" && (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={cardStyle()}>
              {sectionTitle("📱", "Viewer tablette", "Crée une session, ouvre le QR code, puis lance la partie.")}

              {viewer?.sessionId
                ? compactInfoBox("Session active", `Code session : ${viewer.code || viewer.sessionId}`, "ok")
                : compactInfoBox("Aucune session active", "Crée une session pour générer le lien et le QR code.")}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 10 }} className="screens-main-actions">
                <button disabled={viewerBusy} onClick={viewer?.sessionId ? stopViewer : startViewer} style={buttonStyle("primary", true)}>
                  {viewer?.sessionId ? "＋ Nouvelle session" : viewerBusy ? "Création…" : "＋ Créer une session"}
                </button>
                <button disabled={!viewer?.sessionId} onClick={() => viewer?.sessionId && go("viewer_display", { sessionId: viewer.sessionId })} style={buttonStyle("secondary", true)}>↗ Ouvrir</button>
              </div>
              <div style={{ marginTop: 10, color: viewerMessage.startsWith("Erreur") ? RED : TEXT_SOFT, fontSize: 11.5, lineHeight: 1.35 }}>{viewerMessage}</div>
            </section>

            <section style={cardStyle({ padding: 12 })}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 156px", gap: 12, alignItems: "center" }} className="screens-viewer-grid">
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 1000, color: "#fff" }}>QR code session</div>
                  <div style={{ color: TEXT_SOFT, fontSize: 11.5, lineHeight: 1.35, marginTop: 4 }}>Scanne avec la tablette pour ouvrir le viewer.</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button disabled={!viewerLink} onClick={copyViewerLink} style={{ ...buttonStyle("secondary"), minHeight: 38 }}>🔗 Copier le lien</button>
                    {viewer?.sessionId ? <button onClick={stopViewer} style={{ ...buttonStyle("secondary"), minHeight: 38 }}>■ Arrêter</button> : null}
                  </div>
                  {viewerLink ? <div style={{ marginTop: 10, color: TEXT_MUTED, fontSize: 10.5, overflowWrap: "anywhere" }}>{viewerLink}</div> : null}
                </div>
                <div style={{ borderRadius: 16, background: "#fff", minHeight: 156, display: "grid", placeItems: "center", padding: 8 }}>
                  {qr ? <img src={qr} alt="QR code viewer" style={{ width: 140, height: 140, display: "block" }} /> : <div style={{ color: "#111", textAlign: "center", fontWeight: 1000, fontSize: 12 }}>Crée une session pour générer le QR code</div>}
                </div>
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ fontSize: 13.5, fontWeight: 1000, color: "#fff", marginBottom: 8 }}>État Viewer</div>
              <div style={{ display: "grid" }}>
                {stateRow("Session", viewer?.sessionId ? (viewer.code || viewer.sessionId) : "Aucune")}
                {stateRow("Lien", viewerLink || "Aucun")}
                {stateRow("Synchro", viewer?.sessionId ? "Prête" : "Non connecté", viewer?.sessionId ? "ok" : "warn")}
                {stateRow("Maj", viewer?.createdAt ? new Date(viewer.createdAt).toLocaleTimeString() : "—")}
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 13.5, fontWeight: 1000, color: "#fff" }}>Derniers diagnostics</div>
                <button onClick={clearViewerDiag} style={{ ...buttonStyle("secondary"), minHeight: 36, fontSize: 11 }}>Vider</button>
              </div>
              <DiagnosticPreview rows={viewerDiag} empty="Aucune entrée Viewer." color="#a7f3d0" />
            </section>
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={cardStyle()}>
              {sectionTitle("⚙️", "Réglages Cast", "Paramètres du receiver Google Cast.")}
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 11.5, fontWeight: 900, color: TEXT_SOFT }}>Receiver Application ID</label>
                <input value={appId} onChange={(e) => setAppIdState(e.target.value.toUpperCase())} placeholder="3534BC6A" style={inputStyle()} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }} className="screens-main-actions">
                  <button onClick={saveAppId} style={buttonStyle("primary", true)}>💾 Enregistrer</button>
                  <button onClick={restoreDefault} style={buttonStyle("secondary", true)}>↻ Défaut</button>
                </div>
              </div>
            </section>

            <section style={cardStyle()}>
              {sectionTitle("🖥️", "Réglages Viewer", "Paramètres de l’écran tablette.")}
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: 12, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 950, fontSize: 12.5 }}>Publication auto des snapshots</div>
                    <div style={{ color: TEXT_SOFT, fontSize: 11.5, lineHeight: 1.35, marginTop: 2 }}>Envoie automatiquement les snapshots à la tablette si une session Viewer est active.</div>
                  </div>
                  <Toggle checked={autoPublish} onChange={setAutoPublishState} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 900, color: TEXT_SOFT, marginBottom: 6 }}>Intervalle de rafraîchissement</label>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                    <input type="number" min={300} max={3000} step={100} value={pollMs} onChange={(e) => setPollMsState(Number(e.target.value || 700))} style={inputStyle()} />
                    <div style={{ color: TEXT_SOFT, fontWeight: 900, minWidth: 26, fontSize: 11.5 }}>ms</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }} className="screens-main-actions">
                  <button onClick={saveViewerSettings} style={buttonStyle("primary", true)}>💾 Enregistrer</button>
                  <button onClick={() => { setPollMsState(700); setAutoPublishState(true); setViewerPollMs(700); setViewerAutoPublish(true); }} style={buttonStyle("secondary", true)}>↻ Défaut</button>
                </div>
              </div>
            </section>

            <section style={cardStyle({ padding: 12 })}>
              <div style={{ fontSize: 13.5, fontWeight: 1000, color: "#fff", marginBottom: 8 }}>Utilisation</div>
              <div style={{ display: "grid", gap: 7 }}>
                {[
                  "Lance le Cast et/ou le Viewer depuis cette page.",
                  "Reviens dans la configuration du jeu.",
                  "Lance la partie : aucun bouton parasite n’apparaît en jeu.",
                ].map((line, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "22px minmax(0,1fr)", gap: 8, alignItems: "start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 999, border: "1px solid rgba(255,209,92,.32)", color: GOLD, display: "grid", placeItems: "center", fontWeight: 1000, fontSize: 10.5 }}>{idx + 1}</div>
                    <div style={{ color: TEXT_SOFT, fontSize: 11.5, lineHeight: 1.35 }}>{line}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 760px){
          .screens-main-actions,
          .screens-sub-actions,
          .screens-viewer-grid{grid-template-columns:1fr!important;}
        }
      `}</style>
    </div>
  );
}
