import React from "react";

/** Sélections officielles des 5 Vies : utilisées à l’identique dans Arcade et Partie rapide. */
export function HeartLivesChoice({ value, active, onClick, primary }: { value: number; active: boolean; onClick: () => void; primary: string }) {
  const stroke = active ? primary : `${primary}80`;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${value} vies`}
      onClick={onClick}
      style={{
        padding: 0,
        margin: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        filter: active ? `drop-shadow(0 0 8px ${primary}44)` : "none",
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 60 52" width="56" height="48" fill="none">
        <path
          d="M26 45.4 22 41.8C12.4 33.3 5.5 27.1 5.5 18.4c0-6.7 5.2-11.8 11.6-11.8 3.7 0 7.2 1.8 9.4 4.7 2.2-2.9 5.7-4.7 9.4-4.7 6.4 0 11.6 5.1 11.6 11.8 0 8.7-6.9 14.9-16.5 23.4L26 45.4Z"
          fill={active ? primary : "#0b1020"}
          stroke={stroke}
          strokeWidth={active ? 2.2 : 1.8}
          strokeLinejoin="round"
        />
        <text x="26.4" y="28.7" fontSize="18" textAnchor="middle" fontWeight="900" fill={active ? "#201609" : "#f5f0e7"}>{value}</text>
      </svg>
    </button>
  );
}

export function VariantIconChoice({
  accent,
  active,
  title,
  subtitle,
  mode,
  onClick,
}: {
  accent: string;
  active: boolean;
  title: string;
  subtitle: string;
  mode: "classic" | "relay" | "chase";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      style={{
        width: 62,
        height: 62,
        borderRadius: 18,
        border: `1px solid ${active ? accent : `${accent}55`}`,
        background: active ? `${accent}20` : "rgba(255,255,255,.035)",
        color: accent,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        boxShadow: active ? `0 0 14px ${accent}33` : "none",
        padding: 0,
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {mode === "classic" ? <>
          <path d="M4 20l7-7" /><path d="M10 4l10 10" /><path d="M14 4h6v6" /><circle cx="7.5" cy="16.5" r="2.3" />
        </> : mode === "relay" ? <>
          <path d="M6 8h12" /><path d="M14 5l4 3-4 3" /><path d="M18 16H6" /><path d="M10 13l-4 3 4 3" />
        </> : <>
          <circle cx="12" cy="12" r="8" /><path d="M12 6v12" /><path d="M6 12h12" /><path d="M8 8l8 8" />
        </>}
      </svg>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>{subtitle}</span>
    </button>
  );
}

