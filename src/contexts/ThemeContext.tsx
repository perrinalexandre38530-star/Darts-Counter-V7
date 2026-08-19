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
import { canUseTheme } from "../theme/themeAccess";
import { subscribeVerifiedEntitlements } from "../monetization/prefs";

type ThemeContextValue = {
  theme: AppTheme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  themes: AppTheme[];
};

// Keep the context identity stable across Vite/WebContainer hot reloads.
// When ThemeContext.tsx is invalidated during a live patch, recreating the
// context object can momentarily leave BottomNav/Settings subscribed to a
// different context instance than the mounted ThemeProvider, causing:
// "useTheme must be used within a ThemeProvider".
const THEME_CONTEXT_HMR_KEY = "__dc_theme_context_v1__";
const themeContextHost = globalThis as typeof globalThis & {
  [THEME_CONTEXT_HMR_KEY]?: React.Context<ThemeContextValue | undefined>;
};

const ThemeContext =
  themeContextHost[THEME_CONTEXT_HMR_KEY] ??
  React.createContext<ThemeContextValue | undefined>(undefined);

if (!themeContextHost[THEME_CONTEXT_HMR_KEY]) {
  themeContextHost[THEME_CONTEXT_HMR_KEY] = ThemeContext;
}


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
    return exists && canUseTheme(id) ? id : DEFAULT_THEME_ID;
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
    if (!canUseTheme(id)) return;
    setThemeIdState(id);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(THEME_STORAGE_KEY, id);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => subscribeVerifiedEntitlements(() => {
    setThemeIdState((current) => {
      try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
        if (stored && THEMES.some((item) => item.id === stored) && canUseTheme(stored)) return stored;
      } catch {}
      return canUseTheme(current) ? current : DEFAULT_THEME_ID;
    });
  }), []);

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
    const pageBackground = theme.pageBackground || `radial-gradient(900px 520px at 50% -14%, ${glow1}, transparent 62%), radial-gradient(680px 360px at 0% 28%, ${glow2}, transparent 62%), ${theme.bg}`;
    const cardBackground = theme.cardBackground || `linear-gradient(180deg, ${glassTop}, ${glassBottom})`;

    root.style.setProperty("--bg-grad", pageBackground);
    root.style.setProperty("--panel", theme.card);
    root.style.setProperty("--panel-2", theme.bg);
    root.style.setProperty("--glass", cardBackground);
    root.style.setProperty("--dc-theme-ambient", theme.ambientOverlay || "none");
    root.style.setProperty("--dc-theme-ambient-opacity", String(theme.ambientOpacity ?? 0));
    root.style.setProperty("--dc-theme-ambient-animation", theme.ambientAnimation || "none");
    root.style.setProperty("--dc-theme-texture", theme.textureOverlay || "none");
    root.style.setProperty("--dc-theme-texture-opacity", String(theme.textureOpacity ?? 0));
    root.style.setProperty("--dc-theme-texture-blend", theme.textureBlendMode || "normal");
    root.style.setProperty("--dc-theme-sheen", theme.surfaceSheen || "none");
    root.style.setProperty("--dc-theme-surface-shadow", theme.surfaceShadow || "0 20px 45px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04)");
    root.style.setProperty("--dc-theme-nav", theme.navBackground || "linear-gradient(180deg, rgba(8,8,10,.55), rgba(8,8,10,.9))");
    root.style.setProperty("--dc-theme-button", theme.buttonBackground || theme.primary);
    root.dataset.dcTheme = theme.id;
    root.dataset.dcThemeAmbient = theme.ambientAnimation || "none";
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
