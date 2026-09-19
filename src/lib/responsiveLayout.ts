/**
 * MULTISPORTS SCORING — global responsive viewport bridge.
 *
 * Purpose:
 * - expose one stable responsive contract to every existing screen;
 * - react immediately to phone/tablet rotation;
 * - distinguish compact landscape, tablet landscape and TV/large displays;
 * - provide a VisualViewport-backed app height for mobile browser/WebView UI.
 *
 * This module deliberately does not know any route/page. Pages inherit the
 * global CSS rules through data attributes set on <html>.
 */

type MscOrientation = "portrait" | "landscape";
type MscDevice = "phone" | "tablet" | "desktop" | "tv";
type MscPointer = "coarse" | "fine";

type ResponsiveSnapshot = {
  width: number;
  height: number;
  orientation: MscOrientation;
  device: MscDevice;
  pointer: MscPointer;
  shortLandscape: boolean;
};

const TV_UA_RE = /(?:smart[- ]?tv|tizen|web0s|webos|netcast|hbbtv|viera|bravia|googletv|appletv|aftb|aftm|aftt|aftss|aftka|aquos)/i;

function viewportSize() {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const width = Math.max(1, Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 1));
  const height = Math.max(1, Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 1));
  return { width, height };
}

function isTvRuntime(width: number, height: number, coarsePointer: boolean) {
  const ua = typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "";
  if (TV_UA_RE.test(ua)) return true;

  // Android TV normally omits the "Mobile" token. Keep this conservative so
  // desktop browsers are not silently treated as TVs just because they are wide.
  if (/android/i.test(ua) && !/mobile/i.test(ua) && !coarsePointer && width >= 960 && width > height) {
    return true;
  }

  return false;
}

function getSnapshot(): ResponsiveSnapshot {
  const { width, height } = viewportSize();
  const mediaLandscape = typeof window.matchMedia === "function"
    ? window.matchMedia("(orientation: landscape)").matches
    : width > height;
  const orientation: MscOrientation = mediaLandscape ? "landscape" : "portrait";
  const coarseMedia = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const coarsePointer = coarseMedia || (typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 0);
  const pointer: MscPointer = coarsePointer ? "coarse" : "fine";
  const shortSide = Math.min(width, height);
  const tv = isTvRuntime(width, height, coarsePointer);

  let device: MscDevice;
  if (tv) {
    device = "tv";
  } else if (shortSide <= 600) {
    device = "phone";
  } else if (coarsePointer || (width <= 1366 && shortSide <= 1024)) {
    device = "tablet";
  } else {
    device = "desktop";
  }

  return {
    width,
    height,
    orientation,
    device,
    pointer,
    shortLandscape: orientation === "landscape" && height <= 600,
  };
}

function applySnapshot(snapshot: ResponsiveSnapshot) {
  const root = document.documentElement;
  root.dataset.mscOrientation = snapshot.orientation;
  root.dataset.mscDevice = snapshot.device;
  root.dataset.mscPointer = snapshot.pointer;
  root.dataset.mscShortLandscape = snapshot.shortLandscape ? "1" : "0";

  // CSS fallback for WebViews where 100dvh does not perfectly follow browser UI.
  root.style.setProperty("--msc-viewport-width", `${snapshot.width}px`);
  root.style.setProperty("--msc-viewport-height", `${snapshot.height}px`);
  root.style.setProperty("--msc-app-height", `${snapshot.height}px`);

  try {
    window.dispatchEvent(new CustomEvent("msc:responsive-layout", { detail: snapshot }));
  } catch {}
}

export function installResponsiveLayout() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  let raf = 0;
  let previousKey = "";

  const refresh = () => {
    raf = 0;
    const snapshot = getSnapshot();
    const key = `${snapshot.width}x${snapshot.height}:${snapshot.orientation}:${snapshot.device}:${snapshot.pointer}:${snapshot.shortLandscape ? 1 : 0}`;
    if (key === previousKey) return;
    previousKey = key;
    applySnapshot(snapshot);
  };

  const scheduleRefresh = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(refresh);
  };

  refresh();

  window.addEventListener("resize", scheduleRefresh, { passive: true });
  window.addEventListener("orientationchange", scheduleRefresh, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleRefresh, { passive: true });
  window.visualViewport?.addEventListener("scroll", scheduleRefresh, { passive: true });

  const orientation = window.screen?.orientation;
  orientation?.addEventListener?.("change", scheduleRefresh);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("resize", scheduleRefresh);
    window.removeEventListener("orientationchange", scheduleRefresh);
    window.visualViewport?.removeEventListener("resize", scheduleRefresh);
    window.visualViewport?.removeEventListener("scroll", scheduleRefresh);
    orientation?.removeEventListener?.("change", scheduleRefresh);
  };
}
