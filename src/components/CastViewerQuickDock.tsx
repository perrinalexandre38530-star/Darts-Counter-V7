// @ts-nocheck
import * as React from "react";
import QRCode from "qrcode";
import {
  endGoogleCastSession,
  getGoogleCastState,
  isGoogleCastSupported,
  requestGoogleCastSession,
  subscribeGoogleCastStatus,
} from "../cast/googleCast";
import { buildViewerWaitingSnapshot } from "../lib/viewer/buildViewerSnapshot";
import { createViewerSession, publishViewerSnapshot, viewerJoinUrl } from "../lib/viewer/viewerClient";
import {
  clearActiveViewerSession,
  getActiveViewerSession,
  setActiveViewerSession,
  subscribeViewerSessionChanged,
} from "../lib/viewer/viewerSession";
import type { ViewerSessionInfo } from "../lib/viewer/types";

type Props = {
  go?: (tab: any, params?: any) => void;
  compact?: boolean;
};

function tinyButton(active = false): React.CSSProperties {
  return {
    width: 42,
    height: 42,
    borderRadius: 999,
    border: active ? "1px solid rgba(190,242,100,.92)" : "1px solid rgba(255,255,255,.18)",
    background: active ? "rgba(132,204,22,.22)" : "rgba(8,10,16,.82)",
    color: active ? "#d9ff63" : "#f8fafc",
    boxShadow: active ? "0 0 18px rgba(190,242,100,.58)" : "0 10px 28px rgba(0,0,0,.38)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    fontWeight: 1000,
    fontSize: 18,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  };
}

function pill(primary = false): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "11px 13px",
    border: primary ? "none" : "1px solid rgba(255,255,255,.14)",
    background: primary ? "linear-gradient(180deg,#d9ff63,#9ee600)" : "rgba(255,255,255,.07)",
    color: primary ? "#111827" : "#f8fafc",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    padding: 16,
    background: "linear-gradient(180deg, rgba(18,24,35,.98), rgba(5,7,11,.98))",
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 22px 70px rgba(0,0,0,.62)",
  };
}

export default function CastViewerQuickDock({ go }: Props) {
  const [open, setOpen] = React.useState<"cast" | "viewer" | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [castState, setCastState] = React.useState(() => getGoogleCastState());
  const [viewer, setViewer] = React.useState<ViewerSessionInfo | null>(() => getActiveViewerSession());
  const [message, setMessage] = React.useState("");
  const [qr, setQr] = React.useState("");

  React.useEffect(() => {
    const refresh = () => setCastState(getGoogleCastState());
    return subscribeGoogleCastStatus(refresh);
  }, []);

  React.useEffect(() => subscribeViewerSessionChanged(() => setViewer(getActiveViewerSession())), []);

  React.useEffect(() => {
    let alive = true;
    const url = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
    if (!url) {
      setQr("");
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 220, errorCorrectionLevel: "M" })
      .then((dataUrl: string) => {
        if (alive) setQr(dataUrl);
      })
      .catch(() => {
        if (alive) setQr("");
      });
    return () => {
      alive = false;
    };
  }, [viewer?.sessionId, viewer?.joinUrl]);

  async function toggleCast() {
    if (busy) return;
    if (!isGoogleCastSupported()) {
      setMessage("Google Cast indisponible sur cet appareil / navigateur.");
      setOpen("cast");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (castState?.isCasting) {
        await endGoogleCastSession();
        setMessage("Session Cast arrêtée.");
      } else {
        const res = await requestGoogleCastSession();
        if (res.ok) setMessage("Session Cast démarrée.");
        else if (res.reason !== "cancel") setMessage(`Impossible d’ouvrir Cast : ${res.reason}`);
      }
    } finally {
      setCastState(getGoogleCastState());
      setBusy(false);
      setOpen("cast");
    }
  }

  async function ensureViewer() {
    if (busy) return;
    setOpen("viewer");
    if (viewer?.sessionId) return;
    setBusy(true);
    setMessage("Création de la session viewer…");
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
      setMessage("Viewer actif. La tablette recevra les snapshots live de la partie.");
    } catch (e: any) {
      setMessage(`Erreur viewer : ${String(e?.message || e || "création impossible")}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyViewerLink() {
    const url = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Lien viewer copié.");
    } catch {
      setMessage(url);
    }
  }

  function stopViewer() {
    clearActiveViewerSession();
    setViewer(null);
    setMessage("Session viewer arrêtée.");
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          right: 10,
          top: "calc(env(safe-area-inset-top, 0px) + 82px)",
          zIndex: 9998,
          display: "flex",
          flexDirection: "column",
          gap: 9,
          pointerEvents: "auto",
        }}
      >
        <button type="button" onClick={toggleCast} style={tinyButton(!!castState?.isCasting)} title="Cast TV / Chromecast">
          📺
        </button>
        <button type="button" onClick={ensureViewer} style={tinyButton(!!viewer?.sessionId)} title="Viewer tablette">
          📱
        </button>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,.62)",
            display: "grid",
            placeItems: "center",
            padding: 14,
          }}
          onClick={() => setOpen(null)}
        >
          <div style={{ ...card(), width: "min(94vw, 430px)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ color: "#d9ff63", fontWeight: 1100, fontSize: 20, textTransform: "uppercase" }}>
                  {open === "viewer" ? "Viewer tablette" : "Google Cast"}
                </div>
                <div style={{ color: "rgba(255,255,255,.68)", fontSize: 12, marginTop: 3 }}>
                  Deux sorties indépendantes : Cast TV et Viewer tablette.
                </div>
              </div>
              <button type="button" onClick={() => setOpen(null)} style={{ ...pill(false), padding: "8px 11px" }}>
                ✕
              </button>
            </div>

            {open === "cast" ? (
              <div style={{ display: "grid", gap: 12, color: "#f8fafc" }}>
                <div style={{ borderRadius: 16, padding: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}>
                  <div style={{ fontWeight: 1000 }}>{castState?.isCasting ? "Cast actif" : "Aucun Cast actif"}</div>
                  <div style={{ opacity: 0.72, fontSize: 13, marginTop: 4 }}>{castState?.deviceName || "TV / Chromecast non connecté"}</div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" disabled={busy} onClick={toggleCast} style={pill(true)}>
                    {castState?.isCasting ? "Arrêter le Cast" : "Lancer le Cast"}
                  </button>
                  <button type="button" onClick={() => go?.("cast_host")} style={pill(false)}>
                    Réglages écrans
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12, color: "#f8fafc" }}>
                {viewer?.sessionId ? (
                  <>
                    <div style={{ display: "grid", placeItems: "center", borderRadius: 20, background: "#fff", padding: 10 }}>
                      {qr ? <img src={qr} alt="QR code viewer" style={{ width: 220, height: 220 }} /> : <div style={{ color: "#111", fontWeight: 1000 }}>QR en attente…</div>}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.68)", fontWeight: 900 }}>CODE TABLETTE</div>
                      <div style={{ fontSize: 34, letterSpacing: 3, color: "#d9ff63", fontWeight: 1200 }}>{viewer.code || viewer.sessionId}</div>
                    </div>
                    <div style={{ overflowWrap: "anywhere", opacity: 0.72, fontSize: 12 }}>{viewer.joinUrl}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" onClick={copyViewerLink} style={pill(true)}>Copier lien</button>
                      <button type="button" onClick={stopViewer} style={pill(false)}>Arrêter viewer</button>
                      <button type="button" onClick={() => go?.("viewer_host")} style={pill(false)}>Page complète</button>
                    </div>
                  </>
                ) : (
                  <button type="button" disabled={busy} onClick={ensureViewer} style={pill(true)}>
                    {busy ? "Création…" : "Créer une session viewer"}
                  </button>
                )}
              </div>
            )}

            {message && <div style={{ marginTop: 12, color: message.startsWith("Erreur") || message.startsWith("Impossible") ? "#ffb4b4" : "#dbeafe", fontSize: 13, fontWeight: 800 }}>{message}</div>}
          </div>
        </div>
      )}
    </>
  );
}
