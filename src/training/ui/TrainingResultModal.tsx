// ============================================
// src/training/ui/TrainingResultModal.tsx
// Modal de fin (victoire / échec) — simple et robuste
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import type { TrainingStats } from "../engine/trainingStats";

export default function TrainingResultModal({
  open,
  success,
  title,
  stats,
  onClose,
}: {
  open: boolean;
  success: boolean;
  title: string;
  stats: TrainingStats;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 120,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, calc(100vw - 24px))",
          borderRadius: 18,
          padding: 16,
          background: "rgba(10,10,10,0.92)",
          border: `1px solid ${success ? "rgba(0,255,190,.55)" : "rgba(255,80,120,.55)"}`,
          boxShadow: "0 18px 50px rgba(0,0,0,0.8)",
          color: theme.text,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            fontSize: 16,
            marginBottom: 6,
            color: success ? "#7CFFD7" : "#FF6A9A",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {title}
        </div>

        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
          Score: <b style={{ color: theme.primary }}>{Math.round(stats.score)}</b> • Hit:{" "}
          <b style={{ color: theme.primary }}>{Math.round(stats.hitRate * 100)}%</b> • PPM:{" "}
          <b style={{ color: theme.primary }}>{Math.round(stats.ppm)}</b>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            height: 44,
            width: "100%",
            borderRadius: 999,
            border: "none",
            background: theme.primary,
            color: "#000",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Retour
        </button>
      </div>
    </div>
  );
}
