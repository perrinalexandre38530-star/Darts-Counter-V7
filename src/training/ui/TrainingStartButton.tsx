// Bouton Lancer — plein écran (config)
import React from "react";

export default function TrainingStartButton({
  label,
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        height: 52,
        marginTop: 16,
        borderRadius: 999,
        border: "none",
        background: "linear-gradient(90deg,#00ffd0,#00aaff)",
        color: "#000",
        fontWeight: 900,
        fontSize: 16,
        cursor: "pointer",
        boxShadow: "0 10px 30px rgba(0,255,200,.35)",
      }}
    >
      {label ?? "LANCER LA SESSION"}
    </button>
  );
}
