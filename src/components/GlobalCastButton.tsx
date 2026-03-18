
import React from "react";
import { getDirectCastState, subscribeDirectCastStatus } from "../cast/directCast";

type Props = {
  accent: string;
  textMain: string;
  textSoft: string;
};

export default function GlobalCastButton({ accent, textMain, textSoft }: Props) {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    const refresh = () => setEnabled(!!getDirectCastState().enabled);
    refresh();
    return subscribeDirectCastStatus(refresh);
  }, []);

  function openDirectCast() {
    try {
      window.location.hash = "#/cast";
    } catch {}
  }

  return (
    <button
      type="button"
      className="tab pill"
      onClick={openDirectCast}
      title={enabled ? "Diffusion TV active" : "Diffuser sur écran"}
      style={{ color: enabled ? accent : textSoft, background: "transparent", border: 0, padding: 0 }}
    >
      <span
        className="pill-inner"
        style={{
          borderColor: enabled ? `${accent}66` : "transparent",
          boxShadow: enabled ? `0 0 0 1px ${accent}55, 0 0 12px ${accent}CC` : "none",
          background: enabled ? "rgba(0,0,0,0.22)" : "transparent",
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
            filter: enabled ? `drop-shadow(0 0 6px ${accent})` : "none",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="12" rx="2"></rect>
            <path d="M8 20h8"></path>
            <path d="M12 17v3"></path>
          </svg>
          {enabled ? (
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

        <span className="tab-label" style={{ color: enabled ? textMain : textSoft }}>
          TV
        </span>
      </span>
    </button>
  );
}
