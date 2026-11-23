import * as React from "react";
import { canDistributeLandscapePanels } from "./landscapeRoomPolicy";

/**
 * MSS V248 — one landscape contract for the existing phone and Samsung routes.
 *
 * This bridge only annotates a route's layout wrappers. It never moves React
 * children, changes mode state, or scales gameplay canvases. Pages with an
 * explicit responsive shell retain ownership of their native grid.
 */
const NATIVE_LAYOUT = [
  ".msc-landscape-page-shell",
  ".msc-gameplay-layout",
  ".x01play-container",
  ".x01ql-play",
  ".five-lives-play-screen",
  ".mss-br-play",
  ".ca-page",
  ".cp",
  "[data-mss-native-play-layout='1']",
].join(",");

function elementChildren(node: Element): HTMLElement[] {
  return Array.from(node.children).filter((child): child is HTMLElement =>
    child instanceof HTMLElement && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(child.tagName)
  );
}

function isLandscapeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth > window.innerHeight ||
    document.documentElement.dataset.mscOrientation === "landscape" ||
    document.documentElement.dataset.mssSamsungTvSharedApp === "1";
}

/** Mark only native, full-height multi-panel columns. Do not convert blocks to
 * flex/grid, and do not alter input panels or the heights of their children. */
function annotatePanelDistribution(route: HTMLElement, roomy: boolean) {
  const candidates = route.querySelectorAll<HTMLElement>(
    ".msc-landscape-primary, .msc-gameplay-primary"
  );
  candidates.forEach((panel) => {
    panel.removeAttribute("data-mss-landscape-distribute");
    if (!roomy || !panel.isConnected) return;
    const style = window.getComputedStyle(panel);
    const isGrid = style.display === "grid" || style.display === "inline-grid";
    const isColumn = (style.display === "flex" || style.display === "inline-flex") &&
      style.flexDirection === "column";
    if (!isGrid && !isColumn) return;
    if (panel.closest("[role='dialog'],[aria-modal='true'],dialog")) return;
    if (panel.querySelector("[data-mss-keypad='1'],[data-mss-score-input-hub='1'],[data-mss-play-input='1']")) return;
    const height = panel.clientHeight;
    if (height <= 0 || panel.scrollHeight > height + 8) return;
    const children = elementChildren(panel).filter((child) => {
      const s = window.getComputedStyle(child);
      return s.display !== "none" && s.position !== "absolute" && s.position !== "fixed";
    });
    if (children.length < 3) return;
    if (children.some((child) => window.getComputedStyle(child).position === "sticky")) return;
    const heights = children.map((child) => child.getBoundingClientRect().height);
    const gap = parseFloat(isGrid ? style.rowGap : style.gap) || 0;
    if (canDistributeLandscapePanels(height, heights, gap)) {
      panel.dataset.mssLandscapeDistribute = isGrid ? "grid" : "flex";
    }
  });
}

function annotate(route: HTMLElement) {
  // Clear stale landscape marks on rotation to portrait; the previous bridge
  // only ever annotated, which could preserve landscape sizing after rotation.
  if (!isLandscapeRuntime()) {
    route.removeAttribute("data-mss-landscape-fit");
    route.removeAttribute("data-mss-landscape-spacious");
    annotatePanelDistribution(route, false);
    route.querySelectorAll<HTMLElement>("[data-mss-landscape-unclamp]").forEach((node) =>
      node.removeAttribute("data-mss-landscape-unclamp")
    );
    return;
  }
  const roomWidth = Math.min(window.innerWidth, route.getBoundingClientRect().width);
  const roomHeight = Math.min(window.innerHeight, window.innerHeight - Math.max(0, route.getBoundingClientRect().top));
  // Scale empty space only on genuinely spacious landscape screens. On short
  // phones, preserve independent scroll and minimum 44px touch target sizes.
  if (roomWidth >= 840 && roomHeight >= 650) route.dataset.mssLandscapeSpacious = "1";
  else route.removeAttribute("data-mss-landscape-spacious");
  annotatePanelDistribution(route, roomWidth >= 840 && roomHeight >= 650);
  const screen = route.dataset.mscGameScreen || "page";
  route.dataset.mssLandscapeFit = screen;

  const content = elementChildren(route);
  if (!content.length) return;
  // Do not force a two-column native layout into another two-column grid.
  if (content.length !== 1) return;
  const routeWidth = route.getBoundingClientRect().width;
  if (routeWidth < 380) return;

  let parent: HTMLElement = route;
  let current: HTMLElement | undefined = content[0];
  let depth = 0;

  while (current && depth < 4) {
    if (current.matches(NATIVE_LAYOUT)) break;
    if (current.matches("dialog, [role='dialog'], [aria-modal='true'], [data-mss-page-header], header, canvas")) break;
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.position === "fixed" || style.position === "absolute") break;
    const parentWidth = parent.getBoundingClientRect().width;
    const width = current.getBoundingClientRect().width;
    if (width < 120 || parentWidth < 380) break;

    // Only unclamp *single-child page wrappers* that were designed for portrait.
    // Never stretch cards, images, modal windows, or a multi-child scoreboard.
    if (width <= parentWidth * 0.82 && parentWidth - width >= 110) {
      current.dataset.mssLandscapeUnclamp = "1";
    }
    const next = elementChildren(current);
    if (next.length !== 1) break;
    parent = current;
    current = next[0];
    depth++;
  }
}

export default function LandscapePageFitBridge({ routeKey }: { routeKey: string }) {
  React.useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const route = document.querySelector<HTMLElement>(".dc-themed-route[data-msc-route]");
    if (!route) return;
    let frame = 0;
    const refresh = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        annotate(route);
      });
    };
    // Lazy route components may arrive after the first render. Ignore data-
    // attribute changes to avoid observing our own annotations indefinitely.
    const observer = new MutationObserver(refresh);
    observer.observe(route, { childList: true, subtree: true });
    refresh();
    window.addEventListener("resize", refresh, { passive: true });
    window.addEventListener("orientationchange", refresh, { passive: true });
    window.addEventListener("msc:responsive-layout", refresh as EventListener);
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("orientationchange", refresh);
      window.removeEventListener("msc:responsive-layout", refresh as EventListener);
      route.removeAttribute("data-mss-landscape-fit");
      route.removeAttribute("data-mss-landscape-spacious");
      annotatePanelDistribution(route, false);
      route.querySelectorAll<HTMLElement>("[data-mss-landscape-unclamp]").forEach((node) =>
        node.removeAttribute("data-mss-landscape-unclamp")
      );
    };
  }, [routeKey]);
  return null;
}
