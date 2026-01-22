// ============================================
// src/hooks/useViewport.ts
// Viewport helper (tablet landscape layout)
// - Centralise w/h + orientation flags
// - Avoids fixed overlays on low-height landscape screens
// ============================================

import * as React from "react";

export type ViewportInfo = {
  w: number;
  h: number;
  isLandscape: boolean;
  isTablet: boolean;
  /** True when we want the dedicated 2-column layout */
  isLandscapeTablet: boolean;
};

function getViewport(): { w: number; h: number } {
  if (typeof window === "undefined") return { w: 1024, h: 768 };
  return {
    w: Math.max(0, window.innerWidth || 0),
    h: Math.max(0, window.innerHeight || 0),
  };
}

/**
 * Viewport hook designed for play-screens.
 *
 * Notes:
 * - We use a simple, predictable breakpoint (>= 900px) for tablets.
 * - We rely on w>h for landscape.
 */
export function useViewport(minTabletWidth = 900): ViewportInfo {
  const [{ w, h }, setVp] = React.useState(getViewport);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setVp(getViewport());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const isLandscape = w > h;
  const isTablet = w >= minTabletWidth;
  const isLandscapeTablet = isLandscape && isTablet;

  return { w, h, isLandscape, isTablet, isLandscapeTablet };
}
