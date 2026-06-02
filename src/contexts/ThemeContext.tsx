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


function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const n = Number.parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(34,230,255,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

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

    const glow1 = rgba(theme.primary, 0.18);
    const glow2 = rgba(theme.accent2 || theme.primary, 0.11);
    const glassTop = rgba(theme.card, 0.78);
    const glassBottom = rgba(theme.bg, 0.92);

    root.style.setProperty("--dc-accent", theme.primary);
    root.style.setProperty("--dc-accent-soft", theme.accent1);
    root.style.setProperty("--dc-text", theme.text);
    root.style.setProperty("--dc-bg", theme.bg);
    root.style.setProperty("--dc-card", theme.card);

    // Variables historiques utilisées par index.css et les composants plus anciens.
    // Elles permettent au thème Bleu nuit de reprendre le même rendu partout :
    // fond nuit, panneaux bleu sombre, bordures cyan et halos lumineux.
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty(
      "--bg-grad",
      `radial-gradient(900px 520px at 50% -14%, ${glow1}, transparent 62%), radial-gradient(680px 360px at 0% 28%, ${glow2}, transparent 62%), ${theme.bg}`
    );
    root.style.setProperty("--panel", theme.card);
    root.style.setProperty("--panel-2", theme.bg);
    root.style.setProperty("--glass", `linear-gradient(180deg, ${glassTop}, ${glassBottom})`);
    root.style.setProperty("--stroke", theme.borderSoft);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--muted", theme.textSoft);
    root.style.setProperty("--gold", theme.primary);
    root.style.setProperty("--gold-2", theme.accent2 || theme.primary);
    root.style.setProperty("--blue", theme.accent1 || theme.primary);
    root.style.setProperty("--ring", `0 0 0 2px ${rgba(theme.primary, 0.34)}`);
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
