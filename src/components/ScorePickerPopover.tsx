// ============================================
// src/components/ScorePickerPopover.tsx
// Popover flottant "SCORE" pour ajouter/modifier les points (A/B)
// - UI neon simple + mobile safe
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type TeamId = "A" | "B";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (team: TeamId, pts: number) => void;
  /** max points buttons (default 6) */
  maxPts?: number;
};

export default function ScorePickerPopover({ open, onClose, onAdd, maxPts = 6 }: Props) {
  const { theme } = useTheme();
  const c = theme.primary;
  const halo = `${c}66`;

  // close on escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pts = Array.from({ length: maxPts + 1 }, (_, i) => i);

  const btnStyle: React.CSSProperties = {
    height: 36,
    minWidth: 36,
    borderRadius: 10,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,0.35)",
    color: c,
    fontWeight: 1000 as any,
    boxShadow: `0 0 16px ${halo}`,
  };

  return (
    <>
      <div
        onPointerDown={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.35)",
        }}
      />

      <div
        style={{
          position: "fixed",
          left: "50%",
          top: 120,
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: "min(360px, calc(100vw - 24px))",
          borderRadius: 16,
          border: `1px solid ${theme.borderSoft}`,
          background: "rgba(10,10,14,0.92)",
          boxShadow: `0 0 0 2px rgba(0,0,0,0.3), 0 0 24px ${halo}, 0 0 44px ${halo}`,
          padding: 12,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ color: c, fontWeight: 1000, letterSpacing: 0.6 }}>SCORE +</div>
          <button
            onClick={onClose}
            style={{
              height: 30,
              padding: "0 10px",
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.35)",
              color: "rgba(255,255,255,0.85)",
              fontWeight: 900,
            }}
          >
            Fermer
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 900, marginBottom: 6 }}>Équipe A</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pts.map((p) => (
                <button key={`A-${p}`} style={btnStyle} onClick={() => onAdd("A", p)}>
                  +{p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 900, marginBottom: 6 }}>Équipe B</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pts.map((p) => (
                <button key={`B-${p}`} style={btnStyle} onClick={() => onAdd("B", p)}>
                  +{p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
          Astuce : tu peux cliquer en dehors pour fermer.
        </div>
      </div>
    </>
  );
}
