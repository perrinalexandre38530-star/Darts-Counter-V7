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
    "Appuie sur “Lancer le Cast” pour ouvrir la liste des appareils, puis démarre une partie X01."
  );
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    ensureGoogleCastReady().finally(() => setState(getGoogleCastState()));
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
    const next = getGoogleCastAppId();
    setAppIdState(next);
    const ok = await ensureGoogleCastReady();
    setState(getGoogleCastState());
    setMessage(
      ok
        ? `App ID par défaut restauré : ${next}`
        : "Impossible de restaurer l’App ID par défaut."
    );
  }

  async function start() {
    setLoading(true);
    const res = await requestGoogleCastSession();
    const next = getGoogleCastState();
    setState(next);

    if (res.ok) {
      setMessage(
        next.deviceName
          ? `Google Cast connecté : ${next.deviceName}`
          : "Session Cast démarrée."
      );
    } else {
      setMessage(`Impossible d’ouvrir la liste des appareils (${res.reason}).`);
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
              <div style={badge(!!appId, !!appId ? "ok" : "warn")}>
                {appId ? `Receiver App ID : ${appId}` : "App ID manquant"}
              </div>
              <div style={badge(state.isCasting, state.isCasting ? "ok" : "warn")}>
                {state.isCasting
                  ? `Session active${state.deviceName ? ` • ${state.deviceName}` : ""}`
                  : "Aucune session Cast active"}
              </div>
            </div>

            <div style={{ marginBottom: 12, color: "#d1d5db", lineHeight: 1.5 }}>
              Cette page pilote ton vrai receiver Google Cast. Une fois connecté, ouvre une
              partie X01 : les scores sont envoyés automatiquement vers la TV.
            </div>

            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>
              Receiver Application ID
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <input
                value={appId}
                onChange={(e) => setAppIdState(e.target.value.toUpperCase())}
                placeholder="Ex: 3534BC6A"
                style={{
                  flex: "1 1 320px",
                  minWidth: 240,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  padding: "14px 16px",
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: 1,
                }}
              />

              <button
                onClick={saveAppId}
                style={{
                  borderRadius: 14,
                  padding: "14px 18px",
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Enregistrer
              </button>

              <button
                onClick={restoreDefault}
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
                App ID par défaut
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                onClick={start}
                disabled={loading}
                style={{
                  borderRadius: 14,
                  padding: "14px 18px",
                  border: "none",
                  background: "#10b981",
                  color: "#04130d",
                  fontWeight: 900,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "Connexion…" : "Lancer le Cast"}
              </button>

              <button
                onClick={stop}
                disabled={loading || !state.isCasting}
                style={{
                  borderRadius: 14,
                  padding: "14px 18px",
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.06)",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading || !state.isCasting ? 0.5 : 1,
                }}
              >
                Arrêter
              </button>
            </div>

            <div style={{ color: "#d1d5db", fontWeight: 700 }}>{message}</div>
          </div>

          <div style={cardStyle()}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
              Comment tester proprement
            </div>
            <div style={{ color: "#d1d5db", lineHeight: 1.7 }}>
              1. Vérifie que la TV / box et le téléphone sont sur le même Wi‑Fi. <br />
              2. Clique sur “Lancer le Cast”, puis choisis la Freebox Player POP ou la Mi Box. <br />
              3. La TV doit afficher <strong>Multisports Scoring</strong>. <br />
              4. Lance ensuite une partie <strong>X01</strong> dans l’application. <br />
              5. Les scores doivent se mettre à jour automatiquement sur la TV.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
