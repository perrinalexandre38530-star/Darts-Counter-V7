import React from "react";

// =============================================================
// src/components/InfoMini.tsx
// Petit bouton "i" (style Territories) qui ouvre un bloc flottant.
// Usage:
//   const openInfo = (title, content) => setInfoModal({ open:true, title, content })
//   <InfoMini title="Preset" content="..." onOpen={openInfo} />
// =============================================================

export default function InfoMini({
  title,
  content,
  onOpen,
  size = 18,
}: {
  title: string;
  content: string;
  onOpen: (t: string, c: string) => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(title, content)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "#fff",
        fontSize: Math.max(10, Math.floor(size * 0.65)),
        fontWeight: 1000,
        lineHeight: `${size}px`,
        textAlign: "center",
        cursor: "pointer",
        flexShrink: 0,
        boxShadow: "0 0 10px rgba(0,0,0,0.35)",
      }}
      aria-label="info"
      title={title}
    >
      i
    </button>
  );
}
