// ============================================
// TRAINING — Modal de résultat (simple, robuste)
// ============================================

import React from "react";
import type { TrainingStats } from "../engine/trainingTypes";

type Props = {
  open: boolean;
  stats: TrainingStats;
  success: boolean;
  onClose: () => void;
  title?: string;
};

export default function TrainingResultModal({
  open,
  stats,
  success,
  onClose,
  title,
}: Props) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          borderRadius: 18,
          padding: 16,
          background: "rgba(10,10,12,0.96)",
          border: `1px solid ${
            success ? "rgba(140,255,203,0.55)" : "rgba(255,80,80,0.45)"
          }`,
          boxShadow: "0 18px 40px rgba(0,0,0,0.75)",
          color: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
            color: success ? "#8CFFCB" : "#FF6A6A",
            textShadow: success
              ? "0 0 10px rgba(140,255,203,0.35)"
              : "0 0 10px rgba(255,80,80,0.35)",
          }}
        >
          {title ?? (success ? "Succès" : "Échec")}
        </div>

        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.45 }}>
          <div>
            Darts : <b>{stats.dartsThrown}</b>
          </div>
          <div>
            Hits : <b>{stats.hits}</b>
          </div>
          <div>
            Précision : <b>{(stats.accuracy * 100).toFixed(1)}%</b>
          </div>
          <div>
            Score : <b>{stats.score}</b>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 999,
            border: "none",
            fontWeight: 900,
            cursor: "pointer",
            background: success ? "#8CFFCB" : "#FF6A6A",
            color: "#000",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
