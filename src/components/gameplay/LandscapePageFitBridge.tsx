import * as React from "react";

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

function annotate(route: HTMLElement) {
  if (!isLandscapeRuntime()) return;
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
    if (typeof document === "undefined" || !isLandscapeRuntime()) return;
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
      route.querySelectorAll<HTMLElement>("[data-mss-landscape-unclamp]").forEach((node) =>
        node.removeAttribute("data-mss-landscape-unclamp")
      );
    };
  }, [routeKey]);
  return null;
}
