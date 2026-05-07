// @ts-nocheck
import * as React from "react";
import QRCode from "qrcode";
import { createViewerSession, viewerJoinUrl } from "../../lib/viewer/viewerClient";
import { buildViewerWaitingSnapshot } from "../../lib/viewer/buildViewerSnapshot";
import { publishViewerSnapshot } from "../../lib/viewer/viewerClient";
import { clearActiveViewerSession, getActiveViewerSession, setActiveViewerSession, subscribeViewerSessionChanged } from "../../lib/viewer/viewerSession";
import { clearViewerDiagLog, getViewerDiagLog } from "../../lib/viewer/viewerPublisher";
import type { ViewerSessionInfo } from "../../lib/viewer/types";

type Props = { go: (tab: any, params?: any) => void };

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    padding: 18,
    border: "1px solid rgba(255,255,255,.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(0,0,0,.22))",
    boxShadow: "0 18px 54px rgba(0,0,0,.35)",
  };
}

function button(primary = false): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: "12px 14px",
    border: primary ? "none" : "1px solid rgba(255,255,255,.14)",
    background: primary ? "linear-gradient(180deg,#ffd56a,#ffb72a)" : "rgba(255,255,255,.07)",
    color: primary ? "#17120b" : "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

export default function ViewerHost({ go }: Props) {
  const [session, setSession] = React.useState<ViewerSessionInfo | null>(() => getActiveViewerSession());
  const [qr, setQr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Crée une session viewer, puis ouvre le lien sur la tablette.");
  const [diag, setDiag] = React.useState<any[]>(() => getViewerDiagLog());

  React.useEffect(() => subscribeViewerSessionChanged(() => setSession(getActiveViewerSession())), []);
  React.useEffect(() => {
    const refresh = () => setDiag(getViewerDiagLog());
    window.addEventListener("dc-viewer-diag", refresh as any);
    return () => window.removeEventListener("dc-viewer-diag", refresh as any);
  }, []);

  React.useEffect(() => {
    let alive = true;
    const url = session?.joinUrl || (session?.sessionId ? viewerJoinUrl(session.sessionId) : "");
    if (!url) {
      setQr("");
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 260, errorCorrectionLevel: "M" })
      .then((dataUrl: string) => { if (alive) setQr(dataUrl); })
      .catch(() => { if (alive) setQr(""); });
    return () => { alive = false; };
  }, [session?.joinUrl, session?.sessionId]);

  async function startSession() {
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
      setSession(info);
      try {
        await publishViewerSnapshot(info.sessionId, buildViewerWaitingSnapshot(info.sessionId));
      } catch {}
      setMessage("Session viewer active. Lance une partie : les snapshots Cast seront envoyés à la tablette.");
    } catch (e: any) {
      setMessage(`Erreur viewer : ${String(e?.message || e || "création impossible")}`);
    } finally {
      setBusy(false);
    }
  }

  async function stopSession() {
    clearActiveViewerSession();
    setSession(null);
    setMessage("Session viewer arrêtée.");
  }

  async function copyLink() {
    const url = session?.joinUrl || "";
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Lien viewer copié.");
    } catch {
      setMessage(url);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", color: "#f8fafc", background: "radial-gradient(circle at top, #1b2436 0%, #080a10 58%, #030406 100%)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 110px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <button onClick={() => go("cast_host")} style={button(false)}>← Cast</button>
          <div style={{ fontSize: 28, fontWeight: 1100, color: "#ffd56a" }}>Viewer tablette</div>
          <button onClick={() => go("viewer_join")} style={button(false)}>Rejoindre</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16 }} className="viewer-host-grid">
          <section style={card()}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ borderRadius: 999, padding: "8px 12px", background: session ? "rgba(16,185,129,.16)" : "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.13)", fontWeight: 1000 }}>
                {session ? "Session active" : "Aucune session"}
              </div>
              {session?.expiresAt ? <div style={{ borderRadius: 999, padding: "8px 12px", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.13)", fontWeight: 900 }}>Expire automatiquement</div> : null}
            </div>

            <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>Écran secondaire sans Chromecast</h2>
            <p style={{ opacity: 0.84, lineHeight: 1.48, marginTop: 0 }}>
              La tablette ouvre un lien viewer et reçoit uniquement un mini snapshot live : joueurs, scores, joueur actif, leg/set et résumé. Ce flux est séparé de la sauvegarde NAS complète.
            </p>

            {session ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 13, opacity: 0.76, fontWeight: 900 }}>Code tablette</div>
                <div style={{ fontSize: 42, letterSpacing: 3, fontWeight: 1200, color: "#ffd56a" }}>{session.code}</div>
                <div style={{ overflowWrap: "anywhere", opacity: 0.78, fontSize: 13 }}>{session.joinUrl}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                  <button onClick={copyLink} style={button(true)}>Copier le lien</button>
                  <button onClick={() => go("viewer_display", { sessionId: session.sessionId })} style={button(false)}>Aperçu local</button>
                  <button onClick={stopSession} style={button(false)}>Arrêter</button>
                </div>
              </div>
            ) : (
              <button disabled={busy} onClick={startSession} style={{ ...button(true), opacity: busy ? 0.72 : 1 }}>
                {busy ? "Création…" : "Créer une session viewer"}
              </button>
            )}

            <div style={{ marginTop: 14, color: message.startsWith("Erreur") ? "#ff9b9b" : "#dbeafe", fontWeight: 800 }}>{message}</div>
          </section>

          <aside style={card()}>
            <div style={{ fontSize: 14, opacity: 0.78, fontWeight: 900, marginBottom: 10 }}>QR code tablette</div>
            <div style={{ borderRadius: 22, padding: 12, background: "#fff", minHeight: 278, display: "grid", placeItems: "center" }}>
              {qr ? <img src={qr} alt="QR code viewer" style={{ width: 260, height: 260 }} /> : <div style={{ color: "#111", fontWeight: 900, textAlign: "center" }}>Crée une session pour générer le QR code</div>}
            </div>
          </aside>
        </div>

        <section style={{ ...card(), marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 1100 }}>Diagnostic viewer</div>
            <button onClick={() => { clearViewerDiagLog(); setDiag([]); }} style={button(false)}>Vider</button>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 6, maxHeight: 170, overflow: "auto" }}>
            {diag.length ? diag.slice(-8).reverse().map((d, i) => (
              <div key={i} style={{ fontSize: 12, opacity: 0.82, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 6 }}>
                {new Date(d.at || Date.now()).toLocaleTimeString()} · {d.entry} · {d.extra ? JSON.stringify(d.extra).slice(0, 160) : ""}
              </div>
            )) : <div style={{ opacity: 0.7, fontSize: 13 }}>Aucun envoi pour le moment.</div>}
          </div>
        </section>
      </div>
      <style>{`@media (max-width: 820px){.viewer-host-grid{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}
