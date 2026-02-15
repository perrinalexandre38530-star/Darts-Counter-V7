// @ts-nocheck
// =============================================================
// src/components/InfoMini.tsx
// Petit bouton "i" (style Territories) qui ouvre un bloc flottant.
// Standardisé pour éviter de ré-implémenter l'UX partout.
// =============================================================

import React from "react";
import RulesModal from "./RulesModal";

type Props = {
  title: string;
  content: React.ReactNode;
  /** alignement du modal : 'center' par défaut (RulesModal) */
  align?: "center" | "top";
  /** Variante compacte (par défaut) */
  variant?: "pill" | "dot";
};

export default function InfoMini({ title, content, align = "center", variant = "pill" }: Props) {
  const [open, setOpen] = React.useState(false);

  const btnStyle: React.CSSProperties =
    variant === "dot"
      ? {
          width: 22,
          height: 22,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.22)",
          color: "rgba(255,255,255,0.86)",
          fontWeight: 900,
          fontSize: 12,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }
      : {
          height: 22,
          padding: "0 8px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.22)",
          color: "rgba(255,255,255,0.86)",
          fontWeight: 900,
          fontSize: 12,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          letterSpacing: 0.2,
        };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={title}
        style={btnStyle}
        aria-label={title}
      >
        i
      </button>

      {open && (
        <RulesModal title={title} content={content} onClose={() => setOpen(false)} align={align} />
      )}
    </>
  );
}
