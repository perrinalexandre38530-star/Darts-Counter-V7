// ============================================
// src/hooks/useViewport.ts
// Viewport helper
// - Centralise la détection orientation / tablette
// - Utilise les dimensions réelles (visualViewport si dispo)
// ============================================

import * as React from "react";

type ViewportState = {
  w: number;
  h: number;
  isLandscape: boolean;
  isTablet: boolean;
  isLandscapeTablet: boolean;
};

function readViewport(): { w: number; h: number } {
  if (typeof window === "undefined") return { w: 0, h: 0 };
  // visualViewport est plus fiable sur mobile/tablette (barres système)
  const vv = (window as any).visualViewport as VisualViewport | undefined;
  const w = Math.round(vv?.width ?? window.innerWidth ?? 0);
  const h = Math.round(vv?.height ?? window.innerHeight ?? 0);
  return { w, h };
}

export function useViewport(): ViewportState {
  const [{ w, h }, setWH] = React.useState(() => readViewport());

  React.useEffect(() => {
    const onResize = () => setWH(readViewport());
    window.addEventListener("resize", onResize, { passive: true } as any);
    window.addEventListener("orientationchange", onResize, { passive: true } as any);
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    vv?.addEventListener?.("resize", onResize, { passive: true } as any);
    vv?.addEventListener?.("scroll", onResize, { passive: true } as any);
    return () => {
      window.removeEventListener("resize", onResize as any);
      window.removeEventListener("orientationchange", onResize as any);
      vv?.removeEventListener?.("resize", onResize as any);
      vv?.removeEventListener?.("scroll", onResize as any);
    };
  }, []);

  const isLandscape = w > 0 && h > 0 ? w > h : false;
  // Seuil "tablette" en paysage :
  // - 900px était trop conservateur avec visualViewport (barres système / zoom)
  // - On descend pour couvrir la plupart des tablettes (et gros téléphones) en paysage.
  //   Le layout paysage-tablette n'est activé QUE si orientation=landscape.
  const isTablet = w >= 700;
  const isLandscapeTablet = isLandscape && isTablet;

  return { w, h, isLandscape, isTablet, isLandscapeTablet };
}
