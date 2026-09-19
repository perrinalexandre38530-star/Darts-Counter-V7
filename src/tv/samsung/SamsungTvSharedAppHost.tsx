import * as React from "react";
import type { SamsungTvNativeAppBoot } from "./tvNativeAppBridge";
import { setSamsungTvNativeAppBoot } from "./tvNativeAppBridge";
import { installResponsiveLayout } from "../../lib/responsiveLayout";
import "../../index.css";
import "../../styles/responsive-landscape.css";
import "./samsung-shared-app.css";

const AppRoot = React.lazy(() => import("../../App"));

type Props = {
  boot: SamsungTvNativeAppBoot;
  onExit: () => void;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[role='button']:not([aria-disabled='true'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function visible(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 1 || rect.height <= 1) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.02;
}

function focusables() {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(visible);
}

function center(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function scoreDirectionalCandidate(current: HTMLElement, candidate: HTMLElement, direction: "left" | "right" | "up" | "down") {
  const a = center(current);
  const b = center(candidate);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const primary = direction === "left" || direction === "right" ? Math.abs(dx) : Math.abs(dy);
  const secondary = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
  const valid = direction === "left" ? dx < -2 : direction === "right" ? dx > 2 : direction === "up" ? dy < -2 : dy > 2;
  if (!valid) return Number.POSITIVE_INFINITY;
  return primary + secondary * 2.2;
}

function focusElement(el: HTMLElement | null) {
  if (!el) return;
  try { el.focus({ preventScroll: true }); } catch { try { el.focus(); } catch {} }
  try { el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" }); } catch {}
}

function RemoteFocusBridge({ onExit }: { onExit: () => void }) {
  const lastFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const ensureFocus = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && visible(active)) {
        lastFocusedRef.current = active;
        return;
      }
      const first = focusables()[0] || null;
      focusElement(first);
      lastFocusedRef.current = first;
    };

    const timer = window.setTimeout(ensureFocus, 250);
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target !== document.body) lastFocusedRef.current = target;
    };

    const onKey = (event: KeyboardEvent) => {
      const key = String(event.key || "");
      const keyCode = Number((event as any).keyCode || (event as any).which || 0);
      const back = keyCode === 10009 || key === "BrowserBack" || key === "GoBack";
      if (back) {
        event.preventDefault();
        event.stopPropagation();
        onExit();
        return;
      }

      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(key)) return;
      const items = focusables();
      if (!items.length) return;
      let active = document.activeElement as HTMLElement | null;
      if (!active || !items.includes(active)) active = lastFocusedRef.current && items.includes(lastFocusedRef.current) ? lastFocusedRef.current : items[0];

      if (key === "Enter") {
        if (!active) return;
        // Les champs texte / nombre / select conservent leur comportement natif.
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        event.preventDefault();
        event.stopPropagation();
        try { active.click(); } catch {}
        return;
      }

      const dir = key.replace("Arrow", "").toLowerCase() as "left" | "right" | "up" | "down";
      let best: HTMLElement | null = null;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const candidate of items) {
        if (candidate === active) continue;
        const score = scoreDirectionalCandidate(active, candidate, dir);
        if (score < bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
      if (!best) return;
      event.preventDefault();
      event.stopPropagation();
      focusElement(best);
      lastFocusedRef.current = best;
    };

    window.addEventListener("focusin", onFocus, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focusin", onFocus, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onExit]);

  return null;
}

export default function SamsungTvSharedAppHost({ boot, onExit }: Props) {
  // Le boot doit être publié AVANT le premier render de AppRoot. Un useEffect/useLayoutEffect
  // serait trop tard : le vrai App lirait alors un boot null et retomberait sur GameSelect/Auth.
  setSamsungTvNativeAppBoot(boot);

  React.useLayoutEffect(() => {
    setSamsungTvNativeAppBoot(boot);
    document.documentElement.dataset.mssSamsungTvSharedApp = "1";
    document.documentElement.dataset.mscDevice = "tv";
    document.documentElement.dataset.mscOrientation = "landscape";
    document.body.dataset.mssSamsungTvSharedApp = "1";
    try { installResponsiveLayout(); } catch {}

    return () => {
      setSamsungTvNativeAppBoot(null);
      delete document.documentElement.dataset.mssSamsungTvSharedApp;
      delete document.body.dataset.mssSamsungTvSharedApp;
    };
  }, [boot]);

  return (
    <div className="mss-tv-shared-app-host">
      <RemoteFocusBridge onExit={onExit} />
      <React.Suspense fallback={<div className="mss-tv-shared-app-loading">Chargement de l’interface MULTISPORTS SCORING…</div>}>
        <AppRoot />
      </React.Suspense>
      <div className="mss-tv-shared-app-hint">← ↑ ↓ → naviguer · OK valider · Retour : menu TV</div>
    </div>
  );
}
