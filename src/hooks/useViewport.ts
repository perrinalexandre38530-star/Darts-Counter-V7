// ============================================
// src/hooks/useViewport.ts
// Viewport helper — utilisé pour layouts responsive (tablette paysage, etc.)
// - stable, lightweight, sans dépendances
// ============================================

import * as React from "react";

type Options = {
  tabletMinWidth?: number; // px
};

export function useViewport(options: Options = {}) {
  const tabletMinWidth = options.tabletMinWidth ?? 900;

  const get = React.useCallback(() => {
    if (typeof window === "undefined") {
      return { w: 0, h: 0 };
    }
    return { w: window.innerWidth || 0, h: window.innerHeight || 0 };
  }, []);

  const [{ w, h }, setWH] = React.useState(() => get());

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWH(get()));
    };

    window.addEventListener("resize", onResize, { passive: true } as any);
    window.addEventListener("orientationchange", onResize, { passive: true } as any);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize as any);
      window.removeEventListener("orientationchange", onResize as any);
    };
  }, [get]);

  const isLandscape = w > 0 && h > 0 ? w > h : false;
  const isTablet = w >= tabletMinWidth;
  const isLandscapeTablet = isLandscape && isTablet;

  return { w, h, isLandscape, isTablet, isLandscapeTablet, tabletMinWidth };
}
