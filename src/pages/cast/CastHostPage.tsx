
import React from "react";
import {
  DEFAULT_GOOGLE_CAST_APP_ID,
  endGoogleCastSession,
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
    border: `1px solid ${isOk ? "rgba(16,185,129,.35)" : active ? "rgba(245,158,11,.35)" : "rgba(255,255,255,.12)"}`,
    background: isOk ? "rgba(16,185,129,.14)" : active ? "rgba(245,158,11,.14)" : "rgba(255,255,255,.06)",
    color: isOk ? "#a7f3d0" : active ? "#fde68a" : "#e5e7eb",
  };
}

export default function CastHostPage({ go }: Props) {
  const [state, setState] = React.useState(getGoogleCastState());
  const [appId, setAppIdState] = React.useState(getGoogleCastAppId());
  const [message, setMessage] = React.useState("Le cast n’est initialisé qu’au clic.");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const refresh = () => {
      setState(getGoogleCastState());
      setAppIdState(getGoogleCastAppId());
    };
    refresh();
    return subscribeGoogleCastStatus(refresh);
  }, []);

  function saveAppId() {
    setGoogleCastAppId(appId || DEFAULT_GOOGLE_CAST_APP_ID);
    setState(getGoogleCastState());
    setMessage(`Receiver App ID enregistré : ${getGoogleCastAppId()}`);
  }

  function restoreDefault() {
    resetGoogleCastAppId();
    setAppIdState(getGoogleCastAppId());
    setState(getGoogleCastState());
    setMessage(`App ID par défaut restauré : ${getGoogleCastAppId()}`);
  }

  async function launch() {
    setLoading(true);
    const res = await requestGoogleCastSession();
    setState(getGoogleCastState());
    setMessage(res.ok ? "Session Cast ouverte." : `Impossible d'ouvrir le dialogue Cast (${res.reason}).`);
    setLoading(false);
  }

  async function stop() {
    await endGoogleCastSession();
    setState(getGoogleCastState());
    setMessage("Session Cast arrêtée.");
  }

  return (
    <div style={{ padding: 16, color: "#f8fafc" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => go("settings")}
          style={{
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            borderRadius: 999,
            padding: "10px 14px",
            fontWeight: 800,
          }}
        >
          ← Retour
        </button>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Google Cast</div>
      </div>

      <div style={{ ...cardStyle(), display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={badge(!!state.supported, "ok")}>Navigateur compatible</span>
          <span style={badge(!!state.configured, "ok")}>Receiver App ID configuré</span>
          <span style={badge(!!state.isCasting, state.isCasting ? "ok" : "warn")}>
            {state.isCasting ? `Connecté : ${state.deviceName || "appareil"}` : "Aucune session Cast active"}
          </span>
        </div>

        <div style={{ opacity: 0.9, lineHeight: 1.45 }}>
          Cette page sert uniquement à brancher le vrai Google Cast avec ton receiver personnalisé.
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ fontWeight: 800 }}>Receiver Application ID</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={appId}
              onChange={(e) => setAppIdState(e.target.value.toUpperCase())}
              placeholder="Ex : 3534BC6A"
              style={{
                flex: 1,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                padding: "12px 14px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            />
            <button
              onClick={saveAppId}
              style={{
                border: 0,
                borderRadius: 12,
                background: "#2563eb",
                color: "#fff",
                padding: "0 16px",
                fontWeight: 900,
              }}
            >
              Enregistrer
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={restoreDefault}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 800,
              }}
            >
              Restaurer l’App ID par défaut
            </button>
            <button
              onClick={launch}
              disabled={loading}
              style={{
                border: 0,
                borderRadius: 12,
                background: "#10b981",
                color: "#04130d",
                padding: "10px 16px",
                fontWeight: 900,
              }}
            >
              {loading ? "Ouverture..." : "Lancer le Cast"}
            </button>
            <button
              onClick={stop}
              style={{
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 800,
              }}
            >
              Arrêter
            </button>
          </div>
        </div>

        <div style={{ opacity: 0.86 }}>{message}</div>
      </div>
    </div>
  );
}
