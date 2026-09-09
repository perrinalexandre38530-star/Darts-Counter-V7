import * as React from "react";

type Side = "left" | "right";

type Options = {
  side: Side;
  size?: number;
  baseInset?: number;
  baseTop?: number;
  gap?: number;
  collisionKey?: string | number | null;
  enabled?: boolean;
};

/**
 * Keeps a floating corner medallion away from small interactive controls.
 *
 * IMPORTANT PERF RULE:
 * - no global MutationObserver (too expensive on Android WebView)
 * - recompute only on route/key changes, resize/orientation and a couple of
 *   delayed passes after React has mounted the route controls.
 */
export function useFloatingCornerAvoidance({
  side,
  size = 54,
  baseInset = 8,
  baseTop = 8,
  gap = 8,
  collisionKey,
  enabled = true,
}: Options) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [position, setPosition] = React.useState({ top: baseTop, inset: baseInset });

  const recompute = React.useCallback(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") {
      setPosition({ top: baseTop, inset: baseInset });
      return;
    }

    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    if (!viewportWidth || !viewportHeight) return;

    const own = ref.current;
    const selectors = [
      "[data-mss-protected-control='true']",
      "button",
      "[role='button']",
      "a[href]",
      "input",
      "select",
      "textarea",
    ].join(",");

    const obstacles: DOMRect[] = [];
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selectors));
    for (const node of nodes) {
      if (node === own || own?.contains(node) || node.closest("[data-mss-floating-control]") === own) continue;
      if (node.closest("[data-mss-floating-control]")) continue;
      if (node.closest("nav") && node.getBoundingClientRect().top > viewportHeight * 0.65) continue;

      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || "1") <= 0.02 || style.pointerEvents === "none") continue;

      const rect = node.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1 || rect.bottom <= 0 || rect.top >= viewportHeight) continue;

      const explicitlyProtected = node.dataset.mssProtectedControl === "true";
      const positionMode = style.position;
      const floatingLike = positionMode === "fixed" || positionMode === "sticky" || positionMode === "absolute";
      const compactControl = rect.width <= 104 && rect.height <= 104;
      if (!explicitlyProtected && !floatingLike && !compactControl) continue;

      obstacles.push(rect);
    }

    const maxTop = Math.max(baseTop, viewportHeight - size - 104);
    const insets = [baseInset, baseInset + 62, baseInset + 124];
    const overlaps = (top: number, inset: number) => {
      const left = side === "left" ? inset : viewportWidth - inset - size;
      const right = left + size;
      const bottom = top + size;
      return obstacles.some((r) => !(
        right + gap <= r.left ||
        left - gap >= r.right ||
        bottom + gap <= r.top ||
        top - gap >= r.bottom
      ));
    };

    let found = { top: baseTop, inset: baseInset };
    let didFind = false;
    for (const inset of insets) {
      for (let top = baseTop; top <= maxTop; top += 4) {
        if (!overlaps(top, inset)) {
          found = { top, inset };
          didFind = true;
          break;
        }
      }
      if (didFind) break;
    }

    setPosition((old) => old.top === found.top && old.inset === found.inset ? old : found);
  }, [baseInset, baseTop, enabled, gap, side, size]);

  React.useLayoutEffect(() => {
    if (!enabled) return;
    let raf = window.requestAnimationFrame(recompute);
    const timers = [
      window.setTimeout(recompute, 80),
      window.setTimeout(recompute, 280),
    ];
    const onResize = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(recompute);
    };
    const onUiChange = () => onResize();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true } as any);
    window.addEventListener("dc:awena-panel-visibility", onUiChange as EventListener);
    window.addEventListener("dc:floating-controls-refresh", onUiChange as EventListener);
    return () => {
      window.cancelAnimationFrame(raf);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize as any);
      window.removeEventListener("dc:awena-panel-visibility", onUiChange as EventListener);
      window.removeEventListener("dc:floating-controls-refresh", onUiChange as EventListener);
    };
  }, [collisionKey, enabled, recompute]);

  return { ref, top: position.top, inset: position.inset, recompute };
}
