import React from "react";
import {
  endGoogleCastSession,
  getGoogleCastState,
  isGoogleCastSupported,
  requestGoogleCastSession,
  subscribeGoogleCastStatus,
} from "../cast/googleCast";

type Props = {
  accent: string;
  textMain: string;
  textSoft: string;
};

function CastGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 18a3 3 0 0 1 3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 13a8 8 0 0 1 8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 8a13 13 0 0 1 13 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 5h14v10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function GlobalCastButton({ accent, textMain, textSoft }: Props) {
  const [isCasting, setIsCasting] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const refresh = () => {
      if (!active) return;
      const state = getGoogleCastState();
      setSupported(!!state?.supported);
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

  const active = isCasting;
  const halo = active ? accent : "transparent";

  async function onTap() {
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
          alert(`Impossible d’ouvrir Cast : ${res.reason}`);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`tab pill ${active ? "is-active" : ""}`}
      onClick={onTap}
      title={isCasting ? "Arrêter la diffusion" : "Caster sur un appareil"}
      style={{
        color: active ? accent : textSoft,
        opacity: busy ? 0.75 : supported ? 1 : 0.95,
        background: "transparent",
        border: 0,
        padding: 0,
      }}
    >
      <span
        className="pill-inner"
        style={{
          borderColor: active ? accent : "transparent",
          boxShadow: active ? `0 0 0 1px ${accent}55, 0 0 12px ${accent}CC` : "none",
          background: active ? "rgba(0,0,0,0.22)" : "transparent",
          transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        }}
      >
        <span
          className="tab-icon"
          style={{
            filter: active ? `drop-shadow(0 0 6px ${halo})` : "none",
          }}
        >
          <CastGlyph />
        </span>
        <span
          className="tab-label"
          style={{
            color: active ? textMain : textSoft,
          }}
        >
          Cast
        </span>
      </span>
    </button>
  );
}
