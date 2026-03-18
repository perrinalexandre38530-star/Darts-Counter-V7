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
    "Appuie sur “Lancer le Cast” pour ouvrir la liste des appareils."
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
    setMessage(`Receiver App ID enregistré : ${getGoogleCastAppId()}`);
    setState(getGoogleCastState());
  }

  async function restoreDefault() {
    resetGoogleCastAppId();
    const next = getGoogleCastAppId();
    setAppIdState(next);
    setMessage(`App ID par défaut restauré : ${next}`);
    setState(getGoogleCastState());
  }

  async function start() {
    setLoading(true);
    const res = await requestGoogleCastSession();
    const next = getGoogleCastState();
    setState(next);

    if (res.ok) {
      setMessage(
        next.deviceName
          ? `Connecté à ${next.deviceName}. Lance une partie X01 pour envoyer le score.`
          : "Session Google Cast ouverte."
      );
    } else {
      let reason = "Impossible d’ouvrir le dialogue Cast.";
      if (res.reason === "sdk_unavailable") reason = "Google Cast indisponible sur cet appareil / navigateur.";
      else if (String(res.reason || "").includes("cancel")) reason = "Connexion Cast annulée.";
      else if (String(res.reason || "").includes("timeout")) reason = "Aucun appareil Cast détecté.";
      else if (String(res.reason || "").includes("request")) reason = "Impossible d’ouvrir le dialogue Cast.";
      setMessage(reason);
    }
    setLoading(false);
  }

  async function stop() {
    setLoading(true);
    await endGoogleCastSession();
    setState(getGoogleCastState());
    setMessage("Session Google Cast arrêtée.");
    setLoading(false);
  }

  const container: React.CSSProperties = {
    minHeight: "100%",
    padding: 18,
    background:
      "radial-gradient(1200px 420px at 50% -10%, rgba(255,209,102,.12), transparent 55%), linear-gradient(180deg, #0f1218, #0a0d12)",
    color: "#f3f4f6",
  };

  const page: React.CSSProperties = {
    maxWidth: 940,
    margin: "0 auto",
    display: "grid",
    gap: 16,
  };

  const button: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.12)",
    background: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04))",
    color: "#f9fafb",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 900,
    cursor: "pointer",
  };

  const primary: React.CSSProperties = {
    ...button,
    background: "linear-gradient(180deg, #f6c453, #e9aa12)",
    color: "#19150c",
    border: "1px solid rgba(233,170,18,.42)",
  };

  const input: React.CSSProperties = {
    width: "100%",
    borderRadius: 14,
    padding: "14px 16px",
    background: "rgba(255,255,255,.06)",
    color: "#f9fafb",
    border: "1px solid rgba(255,255,255,.10)",
    outline: "none",
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: ".06em",
  };

  return (
    <div style={container}>
      <div style={page}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => go("settings")} style={button}>
            ← Retour
          </button>
          <div style={{ fontSize: 34, fontWeight: 1000, letterSpacing: "-.03em", marginLeft: "auto" }}>
            Google Cast
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={badge(state.supported && state.sdkLoaded, "ok")}>
              {state.supported ? "Navigateur compatible" : "Navigateur non compatible"}
            </span>
            <span style={badge(!!state.appId, state.appId === DEFAULT_GOOGLE_CAST_APP_ID ? "warn" : "ok")}>
              {state.appId === DEFAULT_GOOGLE_CAST_APP_ID ? "App ID par défaut" : "Receiver App ID configuré"}
            </span>
            <span style={badge(state.isCasting, state.isCasting ? "ok" : "warn")}>
              {state.isCasting ? "Session Cast active" : "Aucune session Cast active"}
            </span>
          </div>

          <p style={{ margin: 0, opacity: 0.88, lineHeight: 1.55 }}>
            Branche ici ton receiver Google Cast personnalisé. Tant que tu utilises l’App ID de test, tu verras la
            liste des appareils, mais pas ton receiver custom.
          </p>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8, opacity: 0.9 }}>
                Receiver Application ID
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={appId}
                  onChange={(e) => setAppIdState(String(e.target.value || "").toUpperCase())}
                  placeholder="Ex : 12AB34CD"
                  style={input}
                />
                <button onClick={saveAppId} style={primary}>
                  Enregistrer
                </button>
                <button onClick={restoreDefault} style={button}>
                  App ID par défaut
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={start} style={primary} disabled={loading}>
                {loading ? "Connexion..." : "Lancer le Cast"}
              </button>
              <button onClick={stop} style={button} disabled={loading}>
                Arrêter
              </button>
            </div>

            <div style={{ fontSize: 14, opacity: 0.86 }}>
              {message}
            </div>
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 28, fontWeight: 1000, marginBottom: 8 }}>État actuel</div>
          <div style={{ display: "grid", gap: 10, fontSize: 15 }}>
            <div>
              <b>App ID :</b> {state.appId || "—"}
            </div>
            <div>
              <b>Cast state :</b> {state.castState || "—"}
            </div>
            <div>
              <b>Appareil :</b> {state.deviceName || "—"}
            </div>
            <div>
              <b>Session active :</b> {state.isCasting ? "oui" : "non"}
            </div>
          </div>
        </div>

        <div style={cardStyle()}>
          <div style={{ fontSize: 26, fontWeight: 1000, marginBottom: 8 }}>Étapes</div>
          <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, opacity: 0.92 }}>
            <li>Vérifie que ton receiver public répond sur <b>/cast/</b>.</li>
            <li>Crée / colle ton App ID Google Cast ici.</li>
            <li>Appuie sur <b>Lancer le Cast</b>.</li>
            <li>Choisis ta TV / box.</li>
            <li>Lance une partie X01 pour envoyer les snapshots.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
