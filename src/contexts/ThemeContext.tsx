// ============================================
// src/contexts/ThemeContext.tsx
// Contexte global pour le thème (couleurs néon)
// + export des couleurs en variables CSS (--dc-accent, etc.)
// ============================================

import React from "react";
import {
  THEMES,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  type ThemeId,
  type AppTheme,
} from "../theme/themePresets";

type ThemeContextValue = {
  theme: AppTheme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  themes: AppTheme[];
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

function loadInitialThemeId(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_ID;
    const id = raw as ThemeId;
    const exists = THEMES.some((t) => t.id === id);
    return exists ? id : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = React.useState<ThemeId>(() =>
    loadInitialThemeId()
  );

  const theme = React.useMemo<AppTheme>(() => {
    return THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  }, [themeId]);

  const setThemeId = React.useCallback((id: ThemeId) => {
    setThemeIdState(id);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, id);
      }
    } catch {
      // ignore
    }
  }, []);

  // 🔥 Export des couleurs du thème en variables CSS globales
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.style.setProperty("--dc-accent", theme.primary);
    root.style.setProperty("--dc-accent-soft", theme.accent1);
    root.style.setProperty("--dc-text", theme.text);
    root.style.setProperty("--dc-bg", theme.bg);
    root.style.setProperty("--dc-card", theme.card);
  }, [theme]);

  const value: ThemeContextValue = React.useMemo(
    () => ({ theme, themeId, setThemeId, themes: THEMES }),
    [theme, themeId, setThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
