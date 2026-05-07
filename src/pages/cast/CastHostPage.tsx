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
const PAGE_BG = "radial-gradient(circle at top, rgba(28,40,62,.95) 0%, rgba(8,12,20,1) 54%, rgba(5,7,12,1) 100%)";
const CARD_BG = "linear-gradient(180deg, rgba(13,19,31,.96), rgba(8,10,16,.98))";
const CARD_BORDER = "1px solid rgba(255,255,255,.08)";
const GOLD = "#ffd15c";
const TEXT_SOFT = "rgba(255,255,255,.72)";
const TEXT_MUTED = "rgba(255,255,255,.56)";

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
    borderRadius: 28,
    padding: 20,
    boxShadow: "0 22px 60px rgba(0,0,0,.28)",
    ...extra,
  };
}

function sectionTitle(icon: string, title: string, subtitle?: string) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr)", gap: 14, alignItems: "start", marginBottom: 18 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          border: "1px solid rgba(255,209,92,.28)",
          background: "linear-gradient(180deg, rgba(255,209,92,.12), rgba(255,209,92,.04))",
          color: GOLD,
          fontSize: 27,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, color: "#fff", fontSize: 26, lineHeight: 1.05, fontWeight: 1150 }}>{title}</h2>
        {subtitle ? <div style={{ marginTop: 8, color: TEXT_SOFT, fontSize: 15, lineHeight: 1.42 }}>{subtitle}</div> : null}
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
    gap: 8,
    minHeight: 40,
    borderRadius: 999,
    padding: "0 14px",
    border: `1px solid ${active ? (isOk ? "rgba(74,222,128,.34)" : isWarn ? "rgba(248,113,113,.28)" : "rgba(255,209,92,.28)") : "rgba(255,255,255,.10)"}`,
    background: active ? (isOk ? "rgba(34,197,94,.12)" : isWarn ? "rgba(239,68,68,.10)" : "rgba(255,209,92,.10)") : "rgba(255,255,255,.05)",
    color: active ? (isOk ? "#86efac" : isWarn ? "#fca5a5" : "#fff1b8") : "rgba(255,255,255,.72)",
    fontWeight: 950,
    fontSize: 14,
  };
}

function buttonStyle(tone: "primary" | "secondary" | "danger" = "secondary", wide = false): React.CSSProperties {
  const primary = tone === "primary";
  const danger = tone === "danger";
  return {
    minHeight: 56,
    width: wide ? "100%" : undefined,
    borderRadius: 18,
    padding: "0 18px",
    border: primary
      ? "1px solid rgba(255,209,92,.45)"
      : danger
      ? "1px solid rgba(248,113,113,.28)"
      : "1px solid rgba(255,255,255,.10)",
    background: primary
      ? "linear-gradient(180deg, rgba(255,209,92,.98), rgba(242,185,46,.96))"
      : danger
      ? "rgba(255,255,255,.06)"
      : "rgba(255,255,255,.04)",
    color: primary ? "#17120b" : danger ? "#fff" : "#eef2ff",
    fontWeight: 1100,
    fontSize: 15,
    boxShadow: primary ? "0 8px 26px rgba(255,209,92,.18)" : "none",
    cursor: "pointer",
  };
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 56,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    color: "#fff",
    outline: "none",
    padding: "0 16px",
    fontWeight: 950,
    fontSize: 16,
    ...extra,
  };
}

function stateRow(label: string, value: React.ReactNode, tone: "normal" | "ok" | "warn" = "normal") {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", minHeight: 46, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ color: "rgba(255,255,255,.82)", fontSize: 15 }}>{label}</div>
      <div style={{ color: tone === "ok" ? "#86efac" : tone === "warn" ? "#fca5a5" : "#fff", fontWeight: 1000, fontSize: 15 }}>{value}</div>
    </div>
  );
}

function DiagnosticPreview({ rows, empty, color = GOLD }: { rows: any[]; empty: string; color?: string }) {
  const items = rows.slice().reverse().slice(0, 3);
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.18)", overflow: "hidden" }}>
      {items.length ? (
        items.map((row, idx) => (
          <div key={idx} style={{ padding: "12px 14px", borderBottom: idx === items.length - 1 ? "none" : "1px solid rgba(255,255,255,.06)", display: "grid", gridTemplateColumns: "84px minmax(0,1fr)", gap: 12, fontSize: 12, lineHeight: 1.45 }}>
            <div style={{ color, fontWeight: 1100 }}>{row.now || (row.at ? new Date(row.at).toLocaleTimeString() : "—")}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "rgba(255,255,255,.90)" }}>{row.entry}</div>
              {row.extra != null ? <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: TEXT_MUTED, marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{JSON.stringify(row.extra)}</div> : null}
            </div>
          </div>
        ))
      ) : (
        <div style={{ padding: 14, color: TEXT_SOFT, fontSize: 14 }}>{empty}</div>
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
        width: 76,
        height: 42,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.10)",
        background: checked ? "linear-gradient(180deg, rgba(255,209,92,.95), rgba(242,185,46,.95))" : "rgba(255,255,255,.08)",
        padding: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        cursor: "pointer",
      }}
    >
      <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 2px 8px rgba(0,0,0,.28)" }} />
    </button>
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
    QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "M" })
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
    setCastMessage(`Receiver App ID enregistré : ${getGoogleCastAppId()}`);
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
    setCastMessage("Ouverture du dialogue Google Cast…");
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
    { key: "cast", title: "CAST", subtitle: "TV / Chromecast", icon: "📺" },
    { key: "viewer", title: "VIEWER", subtitle: "Tablette / second écran", icon: "📱" },
    { key: "settings", title: "RÉGLAGES", subtitle: "Paramètres écran", icon: "⚙️" },
  ];

  const viewerLink = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
  const castNoDevice = !castState.isCasting && !castState.deviceName;

  return (
    <div style={{ minHeight: "100dvh", background: PAGE_BG, color: "#f8fafc" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "18px 14px 110px" }}>
        <header style={{ display: "grid", gridTemplateColumns: "68px minmax(0,1fr) 68px", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button onClick={() => go("home")} style={{ ...buttonStyle("secondary"), minHeight: 62, borderRadius: 20, padding: 0, width: 62, justifySelf: "start" }}>←</button>
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div style={{ fontSize: "clamp(30px,9vw,58px)", lineHeight: .95, fontWeight: 1200, color: GOLD }}>Écrans</div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.35, color: TEXT_SOFT, fontWeight: 850 }}>Cast TV et Viewer tablette,<br />séparés et utilisables ensemble</div>
          </div>
          <div />
        </header>

        <nav style={{ ...cardStyle({ padding: 0, overflow: "hidden", marginBottom: 18 }) }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            {tabMeta.map((tab, idx) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => openTab(tab.key)}
                  style={{
                    minHeight: 112,
                    border: "none",
                    borderRight: idx < tabMeta.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
                    background: active ? "linear-gradient(180deg, rgba(255,209,92,.16), rgba(255,209,92,.05))" : "transparent",
                    color: active ? "#fff2bc" : "rgba(255,255,255,.86)",
                    boxShadow: active ? "inset 0 0 0 1px rgba(255,209,92,.5)" : "none",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    gap: 4,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 26, lineHeight: 1 }}>{tab.icon}</div>
                  <div style={{ fontSize: 17, fontWeight: 1100, letterSpacing: .2 }}>{tab.title}</div>
                  <div style={{ fontSize: 12, color: active ? "#ffd15c" : TEXT_SOFT }}>{tab.subtitle}</div>
                </button>
              );
            })}
          </div>
        </nav>

        {activeTab === "cast" && (
          <div style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle()}>
              {sectionTitle("📺", "Cast TV / Chromecast", "À lancer avant la partie. La partie enverra ensuite les snapshots au receiver Cast actif.")}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                <div style={pill(castState.supported, castState.supported ? "Compatible" : "Non compatible", castState.supported ? "ok" : "warn")} />
                <div style={pill(castNoDevice, castNoDevice ? "Aucun appareil" : (castState.deviceName || "Appareil détecté"), castNoDevice ? "idle" : "ok")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }} className="screens-main-actions">
                <button onClick={startCast} disabled={castBusy} style={buttonStyle("primary", true)}>{castBusy ? "Ouverture…" : "▶ Lancer le Cast"}</button>
                <button onClick={stopCast} disabled={castBusy} style={buttonStyle("secondary", true)}>■ Arrêter</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginTop: 12 }} className="screens-sub-actions">
                <button onClick={pingCast} disabled={castBusy} style={buttonStyle("secondary", true)}>✈ Envoyer un ping</button>
                <button onClick={clearCastDiag} style={buttonStyle("secondary", true)}>∿ Diagnostic</button>
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,209,92,.28)", color: GOLD, display: "grid", placeItems: "center", fontSize: 22 }}>∿</div>
                <div style={{ fontSize: 22, fontWeight: 1100, color: "#fff" }}>État Cast</div>
              </div>
              <div style={{ display: "grid" }}>
                {stateRow("Support navigateur", castState.supported ? "Oui" : "Non", castState.supported ? "ok" : "warn")}
                {stateRow("SDK", castState.sdkLoaded ? "Chargé" : "Non chargé", castState.sdkLoaded ? "ok" : "warn")}
                {stateRow("Appareil", castState.deviceName || "—")}
                {stateRow("Session", (castState as any).sessionId || "—")}
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,209,92,.28)", color: GOLD, display: "grid", placeItems: "center", fontSize: 22 }}>🧾</div>
                  <div style={{ fontSize: 22, fontWeight: 1100, color: "#fff" }}>Journal diagnostic</div>
                </div>
                <button onClick={clearCastDiag} style={{ ...buttonStyle("secondary"), minHeight: 46 }}>🗑 Vider</button>
              </div>
              <DiagnosticPreview rows={castDiag} empty="Aucune entrée Cast pour le moment." />
              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ color: castMessage.startsWith("Impossible") ? "#fca5a5" : TEXT_SOFT, fontSize: 14, fontWeight: 900 }}>{castMessage}</div>
                <div style={{ color: GOLD, fontWeight: 1000, whiteSpace: "nowrap" }}>Voir tout le journal ›</div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "viewer" && (
          <div style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle()}>
              {sectionTitle("📱", "Viewer tablette", "Créez une session avant la partie. Ouvrez le lien ou scannez le QR code sur la tablette pour suivre le live.")}

              <div style={{ borderRadius: 22, border: viewer?.sessionId ? "1px solid rgba(74,222,128,.25)" : "1px solid rgba(255,255,255,.08)", background: viewer?.sessionId ? "rgba(34,197,94,.08)" : "rgba(255,255,255,.035)", padding: 18, marginBottom: 16 }}>
                <div style={{ color: viewer?.sessionId ? "#86efac" : "#d1fae5", fontWeight: 1100, fontSize: 18 }}>{viewer?.sessionId ? "Session active" : "Aucune session active"}</div>
                <div style={{ color: TEXT_SOFT, marginTop: 6, fontSize: 14 }}>{viewer?.sessionId ? `Code session : ${viewer.code || viewer.sessionId}` : "Créez une session pour générer le lien et le QR code."}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }} className="screens-main-actions">
                <button disabled={viewerBusy} onClick={viewer?.sessionId ? stopViewer : startViewer} style={buttonStyle("primary", true)}>{viewer?.sessionId ? "＋ Nouvelle session" : viewerBusy ? "Création…" : "＋ Créer une session"}</button>
                <button disabled={!viewer?.sessionId} onClick={() => viewer?.sessionId && go("viewer_display", { sessionId: viewer.sessionId })} style={buttonStyle("secondary", true)}>↗ Ouvrir le viewer</button>
              </div>

              <div style={{ ...cardStyle({ padding: 16, marginTop: 16, boxShadow: "none", borderRadius: 24, background: "rgba(255,255,255,.02)" }) }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 200px", gap: 16, alignItems: "center" }} className="screens-viewer-grid">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ color: GOLD, fontSize: 22 }}>⌘</div>
                      <div style={{ fontSize: 20, fontWeight: 1100 }}>QR code de la session</div>
                    </div>
                    <div style={{ color: TEXT_SOFT, fontSize: 14, lineHeight: 1.45 }}>Scannez ce code avec la tablette pour ouvrir le viewer.</div>
                    <div style={{ marginTop: 16 }}>
                      <button disabled={!viewerLink} onClick={copyViewerLink} style={{ ...buttonStyle("secondary"), minHeight: 50 }}>🔗 Copier le lien</button>
                    </div>
                    {viewerLink ? <div style={{ marginTop: 12, color: TEXT_MUTED, fontSize: 12, overflowWrap: "anywhere" }}>{viewerLink}</div> : null}
                  </div>
                  <div style={{ borderRadius: 22, background: "#fff", minHeight: 200, display: "grid", placeItems: "center", padding: 12 }}>
                    {qr ? <img src={qr} alt="QR code viewer" style={{ width: 180, height: 180, display: "block" }} /> : <div style={{ color: "#111", textAlign: "center", fontWeight: 1000, fontSize: 15 }}>Crée une session pour générer le QR code</div>}
                  </div>
                </div>
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,209,92,.28)", color: GOLD, display: "grid", placeItems: "center", fontSize: 22 }}>∿</div>
                  <div style={{ fontSize: 22, fontWeight: 1100, color: "#fff" }}>État Viewer</div>
                </div>
                <div style={pill(!!viewer?.sessionId, viewer?.sessionId ? "Actif" : "Inactif", viewer?.sessionId ? "ok" : "idle")} />
              </div>
              <div style={{ display: "grid" }}>
                {stateRow("Session", viewer?.sessionId ? (viewer.code || viewer.sessionId) : "Aucune session active")}
                {stateRow("Lien", viewerLink || "Aucun lien généré")}
                {stateRow("Synchro", viewer?.sessionId ? "Prête" : "Non connecté", viewer?.sessionId ? "ok" : "warn")}
                {stateRow("Dernière mise à jour", viewer?.createdAt ? new Date(viewer.createdAt).toLocaleTimeString() : "—")}
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,209,92,.28)", color: GOLD, display: "grid", placeItems: "center", fontSize: 22 }}>🧾</div>
                  <div style={{ fontSize: 22, fontWeight: 1100, color: "#fff" }}>Journal diagnostic</div>
                </div>
                <button onClick={clearViewerDiag} style={{ ...buttonStyle("secondary"), minHeight: 46 }}>🗑 Vider</button>
              </div>
              <DiagnosticPreview rows={viewerDiag} empty="Aucun envoi Viewer pour le moment." color="#a7f3d0" />
              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ color: viewerMessage.startsWith("Erreur") ? "#fca5a5" : TEXT_SOFT, fontSize: 14, fontWeight: 900 }}>{viewerMessage}</div>
                <div style={{ color: GOLD, fontWeight: 1000, whiteSpace: "nowrap" }}>Voir tout le journal ›</div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ display: "grid", gap: 16 }}>
            <section style={cardStyle()}>
              {sectionTitle("⚙️", "Réglages Cast", "Paramètres techniques du receiver Google Cast. Ces réglages ne créent pas de session Viewer.")}
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ fontSize: 14, fontWeight: 1000, color: TEXT_SOFT }}>Receiver Application ID</label>
                <input value={appId} onChange={(e) => setAppIdState(e.target.value.toUpperCase())} placeholder="3534BC6A" style={inputStyle()} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginTop: 4 }} className="screens-main-actions">
                  <button onClick={saveAppId} style={buttonStyle("primary", true)}>💾 Enregistrer</button>
                  <button onClick={restoreDefault} style={buttonStyle("secondary", true)}>↻ Valeur par défaut</button>
                </div>
              </div>
            </section>

            <section style={cardStyle()}>
              {sectionTitle("🖥️", "Réglages Viewer", "Paramètres de l’écran tablette. Le flux reste séparé de la sauvegarde NAS globale.")}
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: 16, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 1100, fontSize: 18 }}>Publication automatique des snapshots</div>
                    <div style={{ color: TEXT_SOFT, fontSize: 14, lineHeight: 1.42, marginTop: 4 }}>Quand une session Viewer existe, les snapshots de partie sont envoyés à la tablette.</div>
                  </div>
                  <Toggle checked={autoPublish} onChange={setAutoPublishState} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 1000, color: TEXT_SOFT, marginBottom: 8 }}>Intervalle de rafraîchissement</label>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
                    <input type="number" min={300} max={3000} step={100} value={pollMs} onChange={(e) => setPollMsState(Number(e.target.value || 700))} style={inputStyle()} />
                    <div style={{ color: TEXT_SOFT, fontWeight: 1000, minWidth: 36 }}>ms</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }} className="screens-main-actions">
                  <button onClick={saveViewerSettings} style={buttonStyle("primary", true)}>💾 Enregistrer</button>
                  <button onClick={() => { setPollMsState(700); setAutoPublishState(true); setViewerPollMs(700); setViewerAutoPublish(true); }} style={buttonStyle("secondary", true)}>↻ Réglages par défaut</button>
                </div>
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,209,92,.28)", color: GOLD, display: "grid", placeItems: "center", fontSize: 22 }}>ⓘ</div>
                <div style={{ fontSize: 22, fontWeight: 1100, color: "#fff" }}>Rappel de fonctionnement</div>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {["Lance le Cast et/ou le Viewer depuis cette page Écrans.", "Reviens dans la configuration du jeu.", "Lance la partie : aucun bouton parasite n’apparaît dans l’écran de jeu."].map((line, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 12, alignItems: "start" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 999, border: "1px solid rgba(255,209,92,.32)", color: GOLD, display: "grid", placeItems: "center", fontWeight: 1100 }}>{idx + 1}</div>
                    <div style={{ color: TEXT_SOFT, fontSize: 16, lineHeight: 1.45 }}>{line}</div>
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
