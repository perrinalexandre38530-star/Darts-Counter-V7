import React from "react";
import {
  endGoogleCastSession,
  ensureGoogleCastReady,
  getGoogleCastAppId,
  getGoogleCastState,
  GOOGLE_CAST_NAMESPACE,
  isGoogleCastSupported,
  requestGoogleCastSession,
  setGoogleCastAppId,
  subscribeGoogleCastStatus,
} from "../../cast/googleCast";

type Props = {
  go: (tab: any, params?: any) => void;
};

function cardStyle(): React.CSSProperties {
  return {
    background: "linear-gradient(180deg, rgba(20,24,31,.96), rgba(10,12,17,.96))",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 18px 50px rgba(0,0,0,.32)",
  };
}

function pill(ok: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 800,
    border: `1px solid ${ok ? "rgba(16,185,129,.35)" : "rgba(245,158,11,.35)"}`,
    background: ok ? "rgba(16,185,129,.14)" : "rgba(245,158,11,.14)",
    color: ok ? "#a7f3d0" : "#fde68a",
  };
}

export default function CastHostPage({ go }: Props) {
  const [appId, setAppId] = React.useState(getGoogleCastAppId());
  const [message, setMessage] = React.useState("");
  const [, force] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    ensureGoogleCastReady().catch(() => undefined);
    return subscribeGoogleCastStatus(() => force());
  }, []);

  const state = getGoogleCastState();
  const configured = !!appId;
  const canStart = configured && state.sdkLoaded;

  async function saveAppId() {
    setGoogleCastAppId(appId);
    const ok = await ensureGoogleCastReady();
    setMessage(ok ? "App ID Cast enregistré." : "App ID enregistré. Le SDK Cast sera prêt dans Chrome/Android.");
    force();
  }

  async function connectCast() {
    const res = await requestGoogleCastSession();
    if (res.ok) setMessage("Cast connecté. Ouvre maintenant une partie et le score partira automatiquement vers la TV.");
    else if (res.reason === "missing_app_id") setMessage("Renseigne d’abord l’App ID de ton receiver Google Cast.");
    else setMessage(`Impossible d’ouvrir le dialogue Cast (${res.reason}).`);
    force();
  }

  async function stopCast() {
    await endGoogleCastSession();
    setMessage("Session Cast arrêtée.");
    force();
  }

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(circle at top, #18202d 0%, #090b10 58%, #050608 100%)", color: "#f8fafc" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 120px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <button onClick={() => go("settings")} style={{ borderRadius: 999, padding: "10px 14px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer" }}>← Retour</button>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: .4 }}>Google Cast</div>
          <div style={{ width: 88 }} />
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <section style={cardStyle()}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <span style={pill(isGoogleCastSupported())}>{isGoogleCastSupported() ? "Navigateur compatible" : "Chrome / Android recommandé"}</span>
              <span style={pill(configured)}>{configured ? "Receiver App ID configuré" : "App ID manquant"}</span>
              <span style={pill(state.isCasting)}>{state.isCasting ? `TV connectée : ${state.deviceName || "appareil Cast"}` : "Aucune session Cast active"}</span>
            </div>

            <div style={{ fontSize: 15, lineHeight: 1.5, color: "#cbd5e1", marginBottom: 14 }}>
              Ici, on ne passe plus par les rooms ni les QR codes. Cette page sert uniquement à brancher le <strong>vrai Google Cast</strong> avec ton receiver personnalisé.
            </div>

            <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#e5e7eb", marginBottom: 8 }}>Receiver Application ID</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                value={appId}
                onChange={(e) => setAppId(String(e.target.value || "").trim().toUpperCase())}
                placeholder="Ex: 12AB34CD"
                spellCheck={false}
                style={{ flex: "1 1 260px", minWidth: 240, borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: 1.2 }}
              />
              <button onClick={saveAppId} style={{ borderRadius: 14, padding: "14px 18px", border: 0, background: "#2563eb", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Enregistrer</button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              <button onClick={connectCast} disabled={!canStart} style={{ borderRadius: 14, padding: "14px 18px", border: 0, background: canStart ? "#10b981" : "#334155", color: "#fff", fontWeight: 900, cursor: canStart ? "pointer" : "not-allowed" }}>Lancer le Cast</button>
              <button onClick={stopCast} disabled={!state.isCasting} style={{ borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 900, cursor: state.isCasting ? "pointer" : "not-allowed" }}>Arrêter</button>
            </div>

            {message ? <div style={{ marginTop: 14, fontSize: 14, color: "#93c5fd", fontWeight: 700 }}>{message}</div> : null}
          </section>

          <section style={cardStyle()}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Branchement dans ton projet</div>
            <div style={{ display: "grid", gap: 10, color: "#cbd5e1", fontSize: 14, lineHeight: 1.5 }}>
              <div>1. Héberge le dossier <strong>receiver/</strong> inclus dans ce patch.</div>
              <div>2. Enregistre ce receiver dans Google Cast pour obtenir ton <strong>App ID</strong>.</div>
              <div>3. Colle cet App ID ici.</div>
              <div>4. Lance le Cast puis ouvre une partie. Les pages de jeu X01 / Ping-Pong / Pétanque / Baby-Foot poussent déjà les snapshots en live.</div>
            </div>
          </section>

          <section style={cardStyle()}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Namespace data</div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 14, color: "#e2e8f0", padding: 12, borderRadius: 14, background: "rgba(2,6,23,.55)", border: "1px solid rgba(255,255,255,.08)" }}>
              {GOOGLE_CAST_NAMESPACE}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
