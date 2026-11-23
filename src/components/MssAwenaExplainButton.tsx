import React from "react";
import { useTheme } from "../contexts/ThemeContext";

/** Bouton MSS compact, réutilisé après l'étape d'introduction des guides. */
export default function MssAwenaExplainButton({ onClick, label = "AWENA VOUS EXPLIQUE" }: {
  onClick: () => void;
  label?: string;
}) {
  const { theme } = useTheme();
  const color = theme?.primary || "#f7c85c";
  return <button type="button" onClick={onClick} title="Ouvrir la présentation d’Awena"
    style={{ width: "100%", maxWidth: 330, height: 38, border: `1px solid ${color}66`, borderRadius: 12,
      background: `linear-gradient(110deg, ${color}, #ffe09a 55%, #ff9adf)`,
      color: "#101016", fontWeight: 1000, fontSize: 12, letterSpacing: .6,
      cursor: "pointer", boxShadow: `0 0 14px ${color}25`, display: "grid", placeItems: "center" }}>
    {label}
  </button>;
}
