import React from "react";
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

function smallButton(tone: "gold" | "ghost" = "ghost"): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "10px 12px",
    border: tone === "gold" ? "1px solid rgba(245,158,11,.35)" : "1px solid rgba(255,255,255,.12)",
    background: tone === "gold" ? "rgba(245,158,11,.14)" : "rgba(255,255,255,.06)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}

export default function CastHostPage({ go }: Props) {
  const [state, setState] = React.useState(getGoogleCastState());
  const [appId, setAppIdState] = React.useState(getGoogleCastAppId());
  const [diag, setDiag] = React.useState<any[]>(getGoogleCastDiagLog());
  const [message, setMessage] = React.useState(
    "Ouvre la liste des appareils, connecte la TV, puis envoie un PING ou lance X01."
  );
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const refresh = () => {
      setState(getGoogleCastState());
      setAppIdState(getGoogleCastAppId());
      setDiag(getGoogleCastDiagLog());
    };
    refresh();
    return subscribeGoogleCastStatus(refresh);
  }, []);

  function saveAppId() {
    setGoogleCastAppId(appId || DEFAULT_GOOGLE_CAST_APP_ID);
    setState(getGoogleCastState());
    setDiag(getGoogleCastDiagLog());
    setMessage(`Receiver App ID enregistré : ${getGoogleCastAppId()}`);
  }

  function restoreDefault() {
    resetGoogleCastAppId();
    setAppIdState(getGoogleCastAppId());
    setState(getGoogleCastState());
    setDiag(getGoogleCastDiagLog());
    setMessage(`App ID par défaut restauré : ${getGoogleCastAppId()}`);
  }

  async function start() {
    setLoading(true);
    const res = await requestGoogleCastSession();
    setState(getGoogleCastState());
    setDiag(getGoogleCastDiagLog());
    if (res.ok) {
      const next = getGoogleCastState();
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
    setDiag(getGoogleCastDiagLog());
    setMessage("Session Cast arrêtée.");
    setLoading(false);
  }

  async function ping() {
    setLoading(true);
    const ok = await pingGoogleCastReceiver();
    setDiag(getGoogleCastDiagLog());
    setMessage(ok ? "PING envoyé au receiver." : "PING impossible (pas de session active ou erreur).");
    setLoading(false);
  }

  function clearDiag() {
    clearGoogleCastDiagLog();
    setDiag(getGoogleCastDiagLog());
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "radial-gradient(circle at top, #18202d 0%, #090b10 58%, #050608 100%)",
        color: "#f8fafc",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 120px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <button
            onClick={() => go("settings")}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ← Retour
          </button>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.4 }}>Google Cast</div>
          <div style={{ width: 88 }} />
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={cardStyle()}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <div style={badge(state.supported, "ok")}>
                {state.supported ? "Navigateur compatible" : "Navigateur non compatible"}
              </div>
              <div style={badge(!!appId, "ok")}>
                {appId ? `Receiver App ID : ${appId}` : "App ID manquant"}
              </div>
              <div style={badge(state.isCasting, state.isCasting ? "ok" : "warn")}>
                {state.isCasting
                  ? `Session active${state.deviceName ? ` : ${state.deviceName}` : ""}`
                  : "Aucune session Cast active"}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>Receiver Application ID</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    value={appId}
                    onChange={(e) => setAppIdState(e.target.value.toUpperCase())}
                    placeholder="Ex: 3534BC6A"
                    style={{
                      flex: 1,
                      minWidth: 220,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(255,255,255,.06)",
                      color: "#fff",
                      padding: "12px 14px",
                      fontWeight: 700,
                    }}
                  />
                  <button onClick={saveAppId} style={smallButton("gold")}>Enregistrer</button>
                  <button onClick={restoreDefault} style={smallButton()}>App ID par défaut</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={start} disabled={loading} style={smallButton("gold")}>
                  {loading ? "Ouverture..." : "Lancer le Cast"}
                </button>
                <button onClick={ping} disabled={loading} style={smallButton()}>
                  Envoyer un PING
                </button>
                <button onClick={stop} disabled={loading} style={smallButton()}>
                  Arrêter
                </button>
                <button onClick={clearDiag} style={smallButton()}>
                  Effacer le diagnostic
                </button>
              </div>

              <div style={{ fontSize: 14, opacity: 0.9 }}>{message}</div>
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>État runtime</div>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <div>supported : {String(state.supported)}</div>
              <div>sdkLoaded : {String(state.sdkLoaded)}</div>
              <div>castState : {String(state.castState)}</div>
              <div>deviceName : {state.deviceName || "—"}</div>
              <div>sessionId : {(state as any).sessionId || "—"}</div>
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Journal de diagnostic</div>
            <div
              style={{
                maxHeight: 420,
                overflow: "auto",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(0,0,0,.22)",
              }}
            >
              {diag.length ? (
                diag
                  .slice()
                  .reverse()
                  .map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        borderBottom: "1px solid rgba(255,255,255,.06)",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 12,
                        lineHeight: 1.45,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      <div style={{ color: "#fde68a", fontWeight: 900 }}>{row.now}</div>
                      <div>{row.entry}</div>
                      <div style={{ opacity: 0.8 }}>{row.extra == null ? "" : JSON.stringify(row.extra, null, 2)}</div>
                    </div>
                  ))
              ) : (
                <div style={{ padding: 14, opacity: 0.75 }}>Aucune entrée de diagnostic pour le moment.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
