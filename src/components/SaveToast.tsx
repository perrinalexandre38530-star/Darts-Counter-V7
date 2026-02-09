import React, { useEffect } from "react";

export type SaveToastKind = "success" | "error" | "info";

export function SaveToast({
  open,
  message,
  kind = "success",
  onClose,
  durationMs = 1800,
}: {
  open: boolean;
  message: string;
  kind?: SaveToastKind;
  onClose: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onClose(), durationMs);
    return () => window.clearTimeout(t);
  }, [open, durationMs, onClose]);

  if (!open) return null;

  // simple floating pill — no dependencies
  const border =
    kind === "success" ? "rgba(46, 213, 115, 0.65)" : kind === "error" ? "rgba(255, 71, 87, 0.7)" : "rgba(255, 193, 7, 0.6)";
  const bg =
    kind === "success" ? "rgba(15, 40, 24, 0.92)" : kind === "error" ? "rgba(50, 14, 18, 0.92)" : "rgba(45, 35, 10, 0.92)";

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 88,
        transform: "translateX(-50%)",
        zIndex: 9999,
        maxWidth: "92vw",
        pointerEvents: "none",
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 999,
          border: `1px solid ${border}`,
          background: bg,
          color: "white",
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          fontSize: 13,
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
        }}
      >
        {message}
      </div>
    </div>
  );
}
