// ============================================
// src/hooks/useViewport.ts
// Viewport helper (responsive)
// - Provides isLandscapeTablet to adapt Play layouts on tablets.
// ============================================

import { useEffect, useMemo, useState } from "react";

type Viewport = { w: number; h: number };

function getViewport(): Viewport {
  if (typeof window === "undefined") return { w: 0, h: 0 };
  return { w: window.innerWidth || 0, h: window.innerHeight || 0 };
}

export function useViewport() {
  const [vp, setVp] = useState<Viewport>(() => getViewport());

  useEffect(() => {
    if (typeof window === "undefined") return;

    let raf = 0;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVp(getViewport()));
    };

    window.addEventListener("resize", onResize, { passive: true } as any);
    window.addEventListener("orientationchange", onResize, { passive: true } as any);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize as any);
      window.removeEventListener("orientationchange", onResize as any);
    };
  }, []);

  const isLandscape = vp.w > vp.h;

  // Tablet heuristic in CSS pixels:
  // - Many Android tablets report 800..1200px in landscape (CSS pixels).
  // - We keep the threshold intentionally moderate to catch "small tablets"
  //   without impacting phones.
  const isTablet = vp.w >= 740;

  const isLandscapeTablet = isLandscape && isTablet;

  return useMemo(
    () => ({
      w: vp.w,
      h: vp.h,
      isLandscape,
      isTablet,
      isLandscapeTablet,
    }),
    [vp.w, vp.h, isLandscape, isTablet, isLandscapeTablet]
  );
}
