// Carte d'option Training (style X01/Killer)
import React from "react";

export default function TrainingOptionCard({
  title,
  subtitle,
  active,
  onClick,
}: {
  title: string;
  subtitle?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: 14,
        marginBottom: 10,
        borderRadius: 16,
        border: active
          ? "1px solid rgba(0,255,180,.55)"
          : "1px solid rgba(255,255,255,.15)",
        background: "rgba(0,0,0,.55)",
        color: "#fff",
        fontWeight: 900,
        boxShadow: active ? "0 0 18px rgba(0,255,180,.35)" : "none",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 14, letterSpacing: 0.4 }}>{title}</div>
      {subtitle ? (
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.82, fontWeight: 700 }}>
          {subtitle}
        </div>
      ) : null}
    </button>
  );
}
