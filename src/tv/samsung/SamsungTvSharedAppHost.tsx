import * as React from "react";
import type { SamsungTvNativeAppBoot } from "./tvNativeAppBridge";
import type { ViewerLiveSnapshot } from "../../lib/viewer/types";
import { setSamsungTvNativeAppBoot } from "./tvNativeAppBridge";
import { installResponsiveLayout } from "../../lib/responsiveLayout";
import "../../index.css";
import "../../styles/responsive-landscape.css";
import "./samsung-shared-app.css";
import "./samsung-adaptive-tv.css";

const AppRoot = React.lazy(() => import("../../App"));

type Props = {
  boot: SamsungTvNativeAppBoot;
  snapshot?: ViewerLiveSnapshot | null;
  onExit: () => void;
  onNavigate?: (tab: string, params?: any) => void;
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
    let frame = 0;
    let routeName = '';
    const root = document.querySelector<HTMLElement>('.mss-tv-shared-app-host');
    const selectedFocusables = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"], dialog[open]'))
        .filter(visible);
      const scope = dialogs.length ? dialogs[dialogs.length - 1] : document.querySelector<HTMLElement>('.dc-themed-route') || root || document.body;
      return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) =>
        visible(el) && !el.closest('[aria-hidden="true"], [inert], [disabled]'));
    };
    const ensureFocus = () => {
      frame = 0;
      // Some legacy cards are role=button divs without tabindex. Samsung focus
      // needs to reach them even though the DOM is also operated by touch.
      document.querySelectorAll<HTMLElement>('[role="button"]:not([tabindex])').forEach((node) => node.tabIndex = 0);
      const route = document.querySelector<HTMLElement>('.dc-themed-route');
      const currentRoute = route?.getAttribute('data-msc-route') || '';
      const items = selectedFocusables();
      const active = document.activeElement as HTMLElement | null;
      if (currentRoute !== routeName) {
        routeName = currentRoute;
        // On transition, focus starts at the new page, never behind a modal.
        const first = items.find((el) => el.closest('[role="dialog"], [aria-modal="true"]')) || items[0];
        focusElement(first || null);
        lastFocusedRef.current = first || null;
      } else if (active && items.includes(active)) {
        lastFocusedRef.current = active;
      } else {
        const item = lastFocusedRef.current && items.includes(lastFocusedRef.current) ? lastFocusedRef.current : items[0];
        focusElement(item || null);
        lastFocusedRef.current = item || null;
      }
    };
    const scheduleFocus = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(ensureFocus);
    };
    const onFocus = (event: FocusEvent) => {
      const el = event.target as HTMLElement | null;
      if (el && el !== document.body) lastFocusedRef.current = el;
    };
    const onKey = (event: KeyboardEvent) => {
      const code = Number((event as any).keyCode || (event as any).which || 0);
      const key = String(event.key || '') || ({37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',13:'Enter',10009:'BrowserBack'} as any)[code] || '';
      if (code === 10009 || key === 'BrowserBack' || key === 'GoBack' || key === 'Back') {
        event.preventDefault(); event.stopPropagation();
        const backControls = selectedFocusables().filter((el) => {
          const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`.toLowerCase();
          return /retour|back|fermer|close/.test(label);
        });
        const back = backControls[0];
        if (back) { back.click(); scheduleFocus(); } else onExit();
        return;
      }
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(key)) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement || active.isContentEditable)) return;
      const items = selectedFocusables();
      if (!items.length) return;
      const current = active && items.includes(active) ? active
        : lastFocusedRef.current && items.includes(lastFocusedRef.current) ? lastFocusedRef.current : items[0];
      if (key === 'Enter') {
        event.preventDefault(); event.stopPropagation();
        try { current.click(); } catch {}
        scheduleFocus();
        return;
      }
      // GameSelect already implements its native carousel left/right navigation.
      if ((key === 'ArrowLeft' || key === 'ArrowRight') && current.closest('.msc-game-select-page')) return;
      const direction = key.replace('Arrow', '').toLowerCase() as 'left'|'right'|'up'|'down';
      let chosen: HTMLElement | null = null;
      let best = Number.POSITIVE_INFINITY;
      for (const item of items) {
        if (item === current) continue;
        const candidateScore = scoreDirectionalCandidate(current, item, direction);
        if (candidateScore < best) { best = candidateScore; chosen = item; }
      }
      // At edge of a long card list, move the viewport instead of trapping focus.
      if (!chosen) {
        const scrollable = (() => {
          let el: HTMLElement | null = current.parentElement;
          while (el && el !== document.body) {
            const style = window.getComputedStyle(el);
            if (/auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 4) return el;
            el = el.parentElement;
          }
          return null;
        })();
        if (scrollable && (direction === 'up' || direction === 'down')) {
          event.preventDefault(); event.stopPropagation();
          scrollable.scrollTop += (direction === 'down' ? 1 : -1) * Math.max(100, scrollable.clientHeight * .55);
        }
        return;
      }
      event.preventDefault(); event.stopPropagation();
      focusElement(chosen);
      lastFocusedRef.current = chosen;
    };

    const observer = new MutationObserver(scheduleFocus);
    if (root) observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-msc-route', 'aria-hidden'] });
    const timer = window.setTimeout(scheduleFocus, 130);
    window.addEventListener('focusin', onFocus, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      observer.disconnect(); window.clearTimeout(timer);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('focusin', onFocus, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onExit]);
  return null;
}

function applySharedTvDomFlags() {
  try {
    document.documentElement.dataset.mssSamsungTvSharedApp = "1";
    document.documentElement.dataset.mscDevice = "tv";
    document.documentElement.dataset.mscOrientation = "landscape";
    document.documentElement.dataset.mscShortLandscape = "0";
    document.body.dataset.mssSamsungTvSharedApp = "1";
  } catch {}
}

function X01TurnMirrorBridge({ snapshot, enabled }: { snapshot?: ViewerLiveSnapshot | null; enabled: boolean }) {
  const turnRef = React.useRef<{ activeId: string; startScore: number; scores: Record<string, number>; busts: Record<string, number> } | null>(null);

  React.useEffect(() => {
    if (!enabled || !snapshot || String(snapshot.game || "").toLowerCase() !== "x01") {
      turnRef.current = null;
      return;
    }
    const players = Array.isArray(snapshot.players) ? snapshot.players : [];
    if (!players.length) return;
    const scores: Record<string, number> = {};
    const busts: Record<string, number> = {};
    for (const player of players as any[]) {
      const id = String(player?.id || "");
      if (!id) continue;
      scores[id] = Number(player?.score ?? 0);
      busts[id] = Number(player?.stats?.bust ?? 0);
    }
    const activeId = String(snapshot.activePlayerId || players.find((player: any) => player?.isActive)?.id || "");
    const previous = turnRef.current;
    if (!previous) {
      turnRef.current = { activeId, startScore: Number(scores[activeId] ?? 0), scores, busts };
      return;
    }

    const turnEnded = !!previous.activeId && (activeId !== previous.activeId || snapshot.phase === "finished");
    if (turnEnded) {
      const before = Number(previous.startScore ?? previous.scores[previous.activeId] ?? 0);
      const after = Number(scores[previous.activeId] ?? previous.scores[previous.activeId] ?? before);
      const scored = Math.max(0, Math.min(180, before - after));
      const bustIncreased = Number(busts[previous.activeId] ?? 0) > Number(previous.busts[previous.activeId] ?? 0);
      try {
        window.dispatchEvent(new CustomEvent("dc:x01v3:tv-score", {
          detail: { score: bustIncreased ? "BUST" : scored, source: "samsung-tv-mirror", at: Date.now() },
        }));
      } catch {}
      turnRef.current = { activeId, startScore: Number(scores[activeId] ?? 0), scores, busts };
      return;
    }

    turnRef.current = { ...previous, activeId, scores, busts };
  }, [enabled, snapshot?.updatedAt, snapshot?.phase, snapshot?.activePlayerId]);

  return null;
}

export default function SamsungTvSharedAppHost({ boot, snapshot, onExit, onNavigate }: Props) {
  const [activeTab, setActiveTab] = React.useState(String(boot.tab));
  React.useEffect(() => {
    const onPhoneRoute = (event: Event) => {
      const tab = String((event as CustomEvent)?.detail?.tab || "");
      if (tab) setActiveTab(tab);
    };
    window.addEventListener("mss:samsung-tv:apply-phone-route", onPhoneRoute as EventListener);
    return () => window.removeEventListener("mss:samsung-tv:apply-phone-route", onPhoneRoute as EventListener);
  }, []);
  // Le boot doit être publié AVANT le premier render de AppRoot. Un useEffect/useLayoutEffect
  // serait trop tard : le vrai App lirait alors un boot null et retomberait sur GameSelect/Auth.
  setSamsungTvNativeAppBoot(boot);
  applySharedTvDomFlags();

  React.useLayoutEffect(() => {
    setSamsungTvNativeAppBoot(boot);
    applySharedTvDomFlags();
    let uninstallResponsiveLayout: (() => void) | undefined;
    try { uninstallResponsiveLayout = installResponsiveLayout(); } catch {}
    // L’application embarquée doit utiliser les règles TV 16:9 même lorsqu’un
    // simulateur ou un navigateur de développement ne s’identifie pas Tizen.
    applySharedTvDomFlags();

    return () => {
      try { uninstallResponsiveLayout?.(); } catch {}
      setSamsungTvNativeAppBoot(null);
      delete document.documentElement.dataset.mssSamsungTvSharedApp;
      delete document.body.dataset.mssSamsungTvSharedApp;
    };
  }, [boot]);

  React.useEffect(() => {
    if (!onNavigate) return;
    const handleNavigation = (event: Event) => {
      const detail = (event as CustomEvent)?.detail || {};
      const tab = String(detail?.tab || "");
      if (!tab) return;
      setActiveTab(tab);
      onNavigate(tab, detail?.params);
    };
    window.addEventListener("mss:samsung-tv:navigation", handleNavigation as EventListener);
    return () => window.removeEventListener("mss:samsung-tv:navigation", handleNavigation as EventListener);
  }, [onNavigate]);

  return (
    <div className="mss-tv-shared-app-host">
      <RemoteFocusBridge onExit={onExit} />
      <X01TurnMirrorBridge snapshot={snapshot} enabled={activeTab === "x01_play_v3" || activeTab === "x01"} />
      <React.Suspense fallback={<div className="mss-tv-shared-app-loading">Chargement de l’interface MULTISPORTS SCORING…</div>}>
        <AppRoot />
      </React.Suspense>
      <div className="mss-tv-shared-app-hint">← ↑ ↓ → naviguer · OK valider · Retour : menu TV</div>
    </div>
  );
}
