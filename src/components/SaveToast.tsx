// ============================================
// src/components/SaveToast.tsx
// Toast flottant simple (aucune dépendance)
// - Affiché en haut-centre
// - Auto-close
// - Styles inline (stable, pas de CSS global)
// ============================================

import React, { useEffect } from "react";

export type SaveToastKind = "success" | "error" | "info";

export type SaveToastProps = {
  open: boolean;
  message?: string;
  kind?: SaveToastKind;
  onClose: () => void;
  durationMs?: number;
};

export default function SaveToast({
  open,
  message = "",
  kind = "success",
  onClose,
  durationMs = 1600,
}: SaveToastProps) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onClose(), durationMs);
    return () => window.clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  const { bg, border } =
    kind === "success"
      ? { bg: "rgba(40, 160, 90, 0.92)", border: "rgba(40, 160, 90, 0.6)" }
      : kind === "error"
        ? { bg: "rgba(200, 60, 60, 0.92)", border: "rgba(200, 60, 60, 0.6)" }
        : { bg: "rgba(60, 120, 200, 0.92)", border: "rgba(60, 120, 200, 0.6)" };

  const fallback =
    kind === "success" ? "OK" : kind === "error" ? "Erreur" : "Info";

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        top: 18,
        transform: "translateX(-50%)",
        zIndex: 99999,
        pointerEvents: "none",
      }}
      aria-live="polite"
      role="status"
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 999,
          background: bg,
          border: `1px solid ${border}`,
          color: "white",
          fontWeight: 800,
          letterSpacing: 0.2,
          boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
          maxWidth: "92vw",
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        {message?.trim() ? message : fallback}
      </div>
    </div>
  );
}
