import React from "react";
import {
  endGoogleCastSession,
  getGoogleCastState,
  requestGoogleCastSession,
  subscribeGoogleCastStatus,
} from "../cast/googleCast";

type Props = {
  accent: string;
  textMain: string;
  textSoft: string;
};

function CastGlyph({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 18a3 3 0 0 1 3 3H3v-3Zm0-5a8 8 0 0 1 8 8H8a5 5 0 0 0-5-5v-3Zm0-5a13 13 0 0 1 13 13h-3A10 10 0 0 0 3 11V8Zm0-5h18v13h-2V5H3V3Z"
        fill={color}
      />
    </svg>
  );
}

export default function GlobalCastButton({ accent, textMain, textSoft }: Props) {
  const [ready, setReady] = React.useState(false);
  const [isCasting, setIsCasting] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const refresh = () => {
      if (!active) return;
      const state = getGoogleCastState();
      setReady(!!state?.supported);
      setIsCasting(!!state?.isCasting);
    };

    refresh();
    const off = subscribeGoogleCastStatus(refresh);

    return () => {
      active = false;
      try {
        off && off();
      } catch {}
    };
  }, []);

  async function onPress() {
    if (busy) return;
    setBusy(true);

    try {
      if (getGoogleCastState().isCasting) {
        await endGoogleCastSession();
      } else {
        await requestGoogleCastSession();
      }
    } finally {
      setBusy(false);
    }
  }

  const active = isCasting;
  const iconColor = active || ready ? accent : textSoft;

  return (
    <button
      type="button"
      className={`tab pill ${active ? "is-active" : ""}`}
      onClick={onPress}
      title={active ? "Arrêter Google Cast" : "Caster sur un appareil"}
      aria-label={active ? "Arrêter Google Cast" : "Caster sur un appareil"}
      style={{
        color: active || ready ? accent : textSoft,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: busy ? "wait" : "pointer",
      }}
    >
      <span
        className="pill-inner"
        style={{
          borderColor: active ? accent : ready ? `${accent}55` : "transparent",
          boxShadow: active
            ? `0 0 0 1px ${accent}55, 0 0 12px ${accent}CC`
            : ready
            ? `0 0 0 1px ${accent}22, 0 0 8px ${accent}55`
            : "none",
          background: active ? "rgba(0,0,0,0.22)" : ready ? "rgba(0,0,0,0.16)" : "transparent",
          transition: "box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease",
          minWidth: 72,
          position: "relative",
        }}
      >
        <span
          className="tab-icon"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: active || ready ? `drop-shadow(0 0 6px ${accent})` : "none",
          }}
        >
          <CastGlyph color={iconColor} />
        </span>

        <span
          className="tab-label"
          style={{
            color: active ? textMain : ready ? textMain : textSoft,
          }}
        >
          Cast
        </span>

        {active ? (
          <span
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              width: 7,
              height: 7,
              borderRadius: 999,
              background: accent,
              boxShadow: `0 0 8px ${accent}`,
            }}
          />
        ) : null}
      </span>
    </button>
  );
}
