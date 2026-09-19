import * as React from "react";
import type { SamsungTvNativeAppBoot } from "./tvNativeAppBridge";
import type { ViewerLiveSnapshot } from "../../lib/viewer/types";
import { setSamsungTvNativeAppBoot } from "./tvNativeAppBridge";
import { installResponsiveLayout } from "../../lib/responsiveLayout";
import "../../index.css";
import "../../styles/responsive-landscape.css";
import "./samsung-shared-app.css";

const AppRoot = React.lazy(() => import("../../App"));

type Props = {
  boot: SamsungTvNativeAppBoot;
  snapshot?: ViewerLiveSnapshot | null;
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

export default function SamsungTvSharedAppHost({ boot, snapshot, onExit }: Props) {
  // Le boot doit être publié AVANT le premier render de AppRoot. Un useEffect/useLayoutEffect
  // serait trop tard : le vrai App lirait alors un boot null et retomberait sur GameSelect/Auth.
  setSamsungTvNativeAppBoot(boot);
  applySharedTvDomFlags();

  React.useLayoutEffect(() => {
    setSamsungTvNativeAppBoot(boot);
    applySharedTvDomFlags();
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
      <X01TurnMirrorBridge snapshot={snapshot} enabled={boot.tab === "x01_play_v3" || boot.tab === "x01"} />
      <React.Suspense fallback={<div className="mss-tv-shared-app-loading">Chargement de l’interface MULTISPORTS SCORING…</div>}>
        <AppRoot />
      </React.Suspense>
      <div className="mss-tv-shared-app-hint">← ↑ ↓ → naviguer · OK valider · Retour : menu TV</div>
    </div>
  );
}
