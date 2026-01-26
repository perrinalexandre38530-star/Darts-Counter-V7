// =============================================================
// src/training/hooks/useTheme.ts
// Shim de compatibilité : certains composants Training importent
// "../hooks/useTheme" depuis src/training/ui/*
//
// Le projet n'expose pas toujours un hook useTheme global. Pour ne pas
// bloquer le build, on fournit une implémentation minimale.
// Si tu as déjà un ThemeContext / hook ailleurs, remplace simplement
// l'implémentation ci-dessous par un re-export vers ta source canonique.
// =============================================================

import { useMemo } from "react";

export type ThemeName = "dark" | "light";

export function useTheme(): {
  theme: ThemeName;
  isDark: boolean;
  setTheme: (t: ThemeName) => void;
  toggleTheme: () => void;
} {
  // Implémentation volontairement "safe" : pas de dépendances externes.
  // L'app Darts Counter est majoritairement en dark, on conserve ce défaut.
  return useMemo(
    () => ({
      theme: "dark" as ThemeName,
      isDark: true,
      setTheme: () => {},
      toggleTheme: () => {},
    }),
    []
  );
}
