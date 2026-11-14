import React from "react";
import shoveTicker from "../assets/tickers/ticker_shove_a_penny.webp";

type Props = {
  title: string;
  accent: string;
  onClose: () => void;
};

/**
 * En-tête commun des fenêtres flottantes SHOVE A PENNY.
 * Les titres de section restent sous le ticker, comme dans le panneau STATS validé.
 */
export default function ShoveFloatingHeader({ title, accent, onClose }: Props) {
  return (
    <header data-shove-floating-header="1" style={{ display: "grid", gap: 8 }}>
      <img
        src={shoveTicker}
        alt="SHOVE A PENNY"
        style={{ display: "block", width: "100%", height: "auto", maxHeight: 125, objectFit: "contain", objectPosition: "center", borderRadius: 12 }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <strong style={{ minWidth: 0, color: accent, fontSize: 11, fontWeight: 1100, letterSpacing: 1.05, lineHeight: 1.3 }}>
          {title}
        </strong>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Fermer ${title.toLowerCase()}`}
          style={{ width: 38, height: 38, flex: "0 0 38px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 18, cursor: "pointer" }}
        >
          ×
        </button>
      </div>
    </header>
  );
}
