import React from "react";
import {
  getGoogleCastState,
  requestGoogleCastSession,
  endGoogleCastSession,
  subscribeGoogleCastStatus,
  isGoogleCastSupported,
} from "../cast/googleCast";

type Props = {
  accent: string;
  textMain: string;
  textSoft: string;
};

export default function GlobalCastButton({ accent, textMain, textSoft }: Props) {
  const [state, setState] = React.useState(getGoogleCastState());
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const refresh = () => setState(getGoogleCastState());
    refresh();
    return subscribeGoogleCastStatus(refresh);
  }, []);

  const ready = !!state.supported;
  const isCasting = !!state.isCasting;

  const handleClick = async () => {
    if (busy) return;
    if (!isGoogleCastSupported()) {
      alert("Google Cast indisponible sur cet appareil / navigateur.");
      return;
    }

    setBusy(true);
    try {
      if (isCasting) {
        await endGoogleCastSession();
      } else {
        const res = await requestGoogleCastSession();
        if (!res.ok && res.reason !== "cancel") {
          alert(`Cast indisponible: ${res.reason}`);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isCasting ? "Arrêter le cast" : "Caster sur un appareil"}
      className="tab pill"
      style={{
        background: "transparent",
        border: 0,
        padding: 0,
        color: ready ? accent : textSoft,
        opacity: busy ? 0.7 : 1,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span
        className="pill-inner"
        style={{
          borderColor: ready ? `${accent}66` : "transparent",
          boxShadow: isCasting
            ? `0 0 0 1px ${accent}55, 0 0 12px ${accent}CC`
            : ready
            ? `0 0 0 1px ${accent}33, 0 0 8px ${accent}66`
            : "none",
          background: ready ? "rgba(0,0,0,0.22)" : "transparent",
          transition: "box-shadow 0.2s ease, border-color 0.2s ease",
          minWidth: 58,
          position: "relative",
        }}
      >
        <span
          className="tab-icon"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            position: "relative",
            filter: ready ? `drop-shadow(0 0 6px ${accent})` : "none",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          📺
          {isCasting ? (
            <span
              style={{
                position: "absolute",
                right: -1,
                bottom: -1,
                width: 6,
                height: 6,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 8px ${accent}`,
              }}
            />
          ) : null}
        </span>

        <span className="tab-label" style={{ color: ready ? textMain : textSoft }}>
          Cast
        </span>
      </span>
    </button>
  );
}
