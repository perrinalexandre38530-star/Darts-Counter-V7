import React from "react";
import {
  DEFAULT_GOOGLE_CAST_APP_ID,
  endGoogleCastSession,
  ensureGoogleCastReady,
  getGoogleCastAppId,
  getGoogleCastState,
  requestGoogleCastSession,
  resetGoogleCastAppId,
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

function badge(active: boolean, tone: "ok" | "warn" = "ok"): React.CSSProperties {
  const isOk = active && tone === "ok";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 900,
    border: `1px solid ${
      isOk ? "rgba(16,185,129,.35)" : active ? "rgba(245,158,11,.35)" : "rgba(255,255,255,.12)"
    }`,
    background: isOk ? "rgba(16,185,129,.14)" : active ? "rgba(245,158,11,.14)" : "rgba(255,255,255,.06)",
    color: isOk ? "#a7f3d0" : active ? "#fde68a" : "#e5e7eb",
  };
}

export default function CastHostPage({ go }: Props) {
  const [state, setState] = React.useState(getGoogleCastState());
  const [appId, setAppIdState] = React.useState(getGoogleCastAppId());
  const [message, setMessage] = React.useState(
    "Appuie sur le bouton Cast ou sur “Lancer le Cast” pour ouvrir la liste des appareils."
  );
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const refresh = () => {
      setState(getGoogleCastState());
      setAppIdState(getGoogleCastAppId());
    };
    refresh();
    return subscribeGoogleCastStatus(refresh);
  }, []);

  async function saveAppId() {
    setGoogleCastAppId(appId || DEFAULT_GOOGLE_CAST_APP_ID);
    const ok = await ensureGoogleCastReady();
    setState(getGoogleCastState());
    setMessage(
      ok
        ? `Receiver App ID enregistré : ${getGoogleCastAppId()}`
        : "Impossible d’initialiser Google Cast avec cet App ID."
    );
  }

  async function restoreDefault() {
    resetGoogleCastAppId();
    setAppIdState(getGoogleCastAppId());
    const ok = await ensureGoogleCastReady();
    setState(getGoogleCastState());
    setMessage(
      ok
        ? `App ID par défaut restauré : ${getGoogleCastAppId()}`
        : "Impossible de restaurer l’App ID par défaut."
    );
  }

  async function start() {
    setLoading(true);
    const res = await requestGoogleCastSession();
    if (res.ok) {
      const next = getGoogleCastState();
      setState(next);
      setMessage(
        next.deviceName
          ? `Chromecast connecté : ${next.deviceName}`
          : "Session Cast démarrée."
      );
    } else {
      setMessage(`Impossible d’ouvrir le dialogue Cast (${res.reason}).`);
    }
    setLoading(false);
  }

  async function stop() {
    setLoading(true);
    await endGoogleCastSession();
    setState(getGoogleCastState());
    setMessage("Session Cast arrêtée.");
    setLoading(false);
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
          <div style={cardStyle()}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <div style={badge(state.supported, "ok")}>
                {state.supported ? "Navigateur compatible" : "Navigateur non compatible"}
              </div>
              <div style={badge(!!appId, !!appId ? "ok" : "warn")}>
                {appId ? `Receiver App ID : ${appId}` : "App ID manquant"}
              </div>
              <div style={badge(state.isCasting, state.isCasting ? "ok" : "warn")}>
                {state.isCasting ? `Session active${state.deviceName ? ` • ${state.deviceName}` : ""}` : "Aucune session Cast active"}
              </div>
            </div>

            <div style={{ marginBottom: 12, color: "#d1d5db", lineHeight: 1.5 }}>
              Cette page pilote le vrai Google Cast avec ton receiver personnalisé. Le bouton Cast global de l’application utilise aussi cet App ID.
            </div>

            <label style={{ display: "block", fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
              Receiver Application ID
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <input
                value={appId}
                onChange={(e) => setAppIdState(String(e.target.value || "").trim().toUpperCase())}
                placeholder={DEFAULT_GOOGLE_CAST_APP_ID}
                style={{
                  flex: "1 1 320px",
                  minWidth: 240,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  padding: "14px 14px",
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: 1,
                }}
              />
              <button onClick={saveAppId} style={{ borderRadius: 14, padding: "0 16px", border: 0, background: "#2563eb", color: "#fff", fontWeight: 900, cursor: "pointer" }}>
                Enregistrer
              </button>
              <button onClick={restoreDefault} style={{ borderRadius: 14, padding: "0 16px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>
                App ID par défaut
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={start}
                disabled={loading}
                style={{
                  borderRadius: 14,
                  padding: "14px 18px",
                  border: 0,
                  background: "linear-gradient(180deg,#10b981,#059669)",
                  color: "#04130d",
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                Lancer le Cast
              </button>
              <button
                onClick={stop}
                disabled={loading}
                style={{
                  borderRadius: 14,
                  padding: "14px 18px",
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Arrêter
              </button>
            </div>

            <div style={{ marginTop: 14, fontSize: 14, color: "#cbd5e1" }}>{message}</div>
          </div>

          <div style={cardStyle()}>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Ordre de test</div>
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.65, color: "#d1d5db" }}>
              <li>Ouvre le receiver sur <strong>/cast/</strong> pour vérifier qu’il répond.</li>
              <li>Depuis l’app, clique sur le bouton Cast ou sur “Lancer le Cast”.</li>
              <li>Sélectionne ta Freebox Player POP ou ta Mi Box.</li>
              <li>Lance ensuite une partie X01 : les snapshots partent automatiquement vers la TV.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
