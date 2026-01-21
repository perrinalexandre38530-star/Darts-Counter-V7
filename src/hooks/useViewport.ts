// ============================================
// src/hooks/useViewport.ts
// Viewport helpers (orientation / tablet)
// - Utilisé pour adapter les pages Play en paysage tablette
// - Client-side only
// ============================================

import * as React from "react";

type Options = {
  /** Largeur mini (px) pour considérer un affichage "tablette" */
  tabletMinWidth?: number;
};

export type ViewportInfo = {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  isLandscapeTablet: boolean;
};

function readViewport(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth || 0, height: window.innerHeight || 0 };
}

export function useViewport(options: Options = {}): ViewportInfo {
  const tabletMinWidth = options.tabletMinWidth ?? 900;

  const [{ width, height }, setVp] = React.useState(() => readViewport());

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let raf = 0;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setVp(readViewport());
      });
    };

    window.addEventListener("resize", onResize, { passive: true } as any);
    window.addEventListener("orientationchange", onResize, { passive: true } as any);
    onResize();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize as any);
      window.removeEventListener("orientationchange", onResize as any);
    };
  }, []);

  const isLandscape = width > 0 && height > 0 ? width > height : false;
  const isTablet = width >= tabletMinWidth;
  const isLandscapeTablet = isLandscape && isTablet;

  return { width, height, isLandscape, isTablet, isLandscapeTablet };
}
