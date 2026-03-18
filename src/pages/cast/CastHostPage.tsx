
import React from "react";
import {
  ensureDirectCastRoom,
  getDirectCastState,
  setDirectCastEnabled,
  stopDirectCast,
  subscribeDirectCastStatus,
} from "../../cast/directCast";

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

function badge(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 900,
    border: `1px solid ${active ? "rgba(16,185,129,.35)" : "rgba(255,255,255,.12)"}`,
    background: active ? "rgba(16,185,129,.14)" : "rgba(255,255,255,.06)",
    color: active ? "#a7f3d0" : "#e5e7eb",
  };
}

export default function CastHostPage({ go }: Props) {
  const [state, setState] = React.useState(getDirectCastState());
  const [message, setMessage] = React.useState("La TV doit simplement ouvrir /cast/ une seule fois. Ensuite, active Diffuser depuis le téléphone.");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const refresh = () => setState(getDirectCastState());
    refresh();
    return subscribeDirectCastStatus(refresh);
  }, []);

  async function start() {
    setLoading(true);
    setMessage("");
    setDirectCastEnabled(true);
    const room = await ensureDirectCastRoom();
    if (room.ok) {
      setMessage("Diffusion activée. Ouvre /cast/ sur la TV puis lance une partie X01 sur le téléphone.");
    } else if (room.reason === "auth_required") {
      setDirectCastEnabled(false);
      setMessage("Connecte-toi dans l’app pour activer la diffusion TV distante.");
    } else {
      setDirectCastEnabled(false);
      setMessage(`Impossible d’activer la diffusion (${room.reason}).`);
    }
    setLoading(false);
  }

  async function stop() {
    setLoading(true);
    await stopDirectCast();
    setMessage("Diffusion arrêtée.");
    setLoading(false);
  }

  function openTvPage() {
    window.open(`${window.location.origin}/cast/`, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(circle at top, #18202d 0%, #090b10 58%, #050608 100%)", color: "#f8fafc" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px 120px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <button onClick={() => go("settings")} style={{ borderRadius: 999, padding: "10px 14px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 800, cursor: "pointer" }}>← Retour</button>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: .4 }}>Diffusion TV</div>
          <div style={{ width: 88 }} />
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <section style={cardStyle()}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <span style={badge(!!state.enabled)}>{state.enabled ? "Diffusion active" : "Diffusion inactive"}</span>
              <span style={badge(!!state.roomId)}>{state.roomId ? "Canal TV prêt" : "Canal TV non initialisé"}</span>
            </div>

            <div style={{ fontSize: 15, lineHeight: 1.5, color: "#cbd5e1", marginBottom: 14 }}>
              Ici, on n’utilise plus Google Cast. La TV ouvre simplement <strong>/cast/</strong> et ton téléphone envoie le score X01 en direct.
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <button onClick={start} disabled={loading} style={{ borderRadius: 14, padding: "14px 18px", border: 0, background: "#fbbf24", color: "#111827", fontWeight: 900, cursor: "pointer", opacity: loading ? .7 : 1 }}>
                {state.enabled ? "Diffusion active" : "Activer Diffuser"}
              </button>
              <button onClick={stop} disabled={loading} style={{ borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 900, cursor: "pointer", opacity: loading ? .7 : 1 }}>
                Arrêter
              </button>
              <button onClick={openTvPage} style={{ borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(255,255,255,.12)", background: "#2563eb", color: "#fff", fontWeight: 900, cursor: "pointer" }}>
                Ouvrir l’écran TV
              </button>
            </div>

            <div style={{ borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.05)", color: "#e5e7eb", fontSize: 14 }}>
              {message || "La TV doit simplement ouvrir /cast/ une seule fois. Ensuite, active Diffuser depuis le téléphone."}
            </div>
          </section>

          <section style={cardStyle()}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Utilisation</div>
            <div style={{ display: "grid", gap: 8, color: "#cbd5e1", fontSize: 15, lineHeight: 1.5 }}>
              <div>1. Ouvre une fois <strong>{window.location.origin}/cast/</strong> sur la TV, la box ou le navigateur distant.</div>
              <div>2. Sur le téléphone, active <strong>Diffuser</strong>.</div>
              <div>3. Lance une partie <strong>X01</strong>.</div>
              <div>4. Les scores seront envoyés automatiquement à l’écran TV.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
