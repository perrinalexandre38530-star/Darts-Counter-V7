import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

// =============================================================
// src/pages/ModeNotReady.tsx
// Écran standard pour les modes listés mais pas encore implémentés.
// N'impacte pas les stats ni les routes existantes.
// =============================================================

export default function ModeNotReady() {
  const { theme } = useTheme();
  const { t } = useLang();

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 18,
        paddingBottom: 90,
        background: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: theme.primary,
          textShadow: `0 0 16px ${theme.primary}66`,
        }}
      >
        {t("modeNotReady.title", "MODE EN COURS D’IMPLÉMENTATION")}
      </div>
      <div style={{ maxWidth: 520, fontSize: 13, color: theme.textSoft, lineHeight: 1.45 }}>
        {t(
          "modeNotReady.body",
          "Ce mode est bien ajouté au menu et classé, mais sa logique de jeu n’est pas encore câblée. Tu peux continuer à jouer aux modes existants sans aucun impact sur les stats ou l’historique."
        )}
      </div>
    </div>
  );
}
