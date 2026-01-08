// ============================================================
// src/pages/petanque/PetanqueMenuGames.tsx
// Hub de sélection des modes Pétanque
// ============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

type Props = {
  go: (route: any, params?: any) => void;
};

const Card = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: 20,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.04)",
      color: "white",
      fontSize: 18,
      textAlign: "center",
    }}
  >
    {label}
  </button>
);

export default function PetanqueMenuGames({ go }: Props) {
  useTheme(); // cohérence visuelle globale

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: 20,
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 16,
      }}
    >
      <h2 style={{ textAlign: "center" }}>Pétanque</h2>

      <Card
        label="🎯 Match simple (1v1)"
        onClick={() => go("petanque.config", { mode: "simple" })}
      />

      <Card
        label="👥 Doublette (2v2)"
        onClick={() => go("petanque.config", { mode: "doublette" })}
      />

      <Card
        label="👥👥 Triplette (3v3)"
        onClick={() => go("petanque.config", { mode: "triplette" })}
      />

      <Card
        label="🏋️ Entraînement"
        onClick={() => go("petanque.config", { mode: "training" })}
      />
    </div>
  );
}
