import React from "react";

const INPUT_SELECTOR = '[data-mss-score-input-hub="1"], [data-mss-keypad="1"], [data-mss-play-input="1"]';
const HEADER_SELECTOR = '[data-mss-page-header="1"], .msc-mode-play-header, header';
const EXPLICIT_LAYOUT_SELECTOR = [
  '.x01play-container',
  '.msc-gameplay-layout',
  '.killer-play-screen',
  '.crados-play',
  '.five-lives-play-screen',
  '.darts-play-auto-columns',
  '.darts-mode-play-screen',
  '[data-mss-native-play-layout="1"]',
].join(', ');

function meaningfulChildren(el: Element) {
  return Array.from(el.children).filter((child) => {
    const tag = child.tagName;
    return tag !== 'STYLE' && tag !== 'SCRIPT' && tag !== 'NOSCRIPT';
  }) as HTMLElement[];
}

function containsInput(el: Element) {
  return el.matches(INPUT_SELECTOR) || !!el.querySelector(INPUT_SELECTOR);
}

function clearMarks(route: HTMLElement) {
  route.removeAttribute('data-mss-auto-play-ready');
  route.querySelectorAll<HTMLElement>(
    '[data-mss-auto-play-root], [data-mss-auto-play-header], [data-mss-auto-play-body], [data-mss-auto-play-path], [data-mss-auto-play-zone-host], [data-mss-auto-play-zone]'
  ).forEach((el) => {
    el.removeAttribute('data-mss-auto-play-root');
    el.removeAttribute('data-mss-auto-play-header');
    el.removeAttribute('data-mss-auto-play-body');
    el.removeAttribute('data-mss-auto-play-path');
    el.removeAttribute('data-mss-auto-play-zone-host');
    el.removeAttribute('data-mss-auto-play-zone');
  });
}

function findBestHost(root: HTMLElement, header: HTMLElement | null, markers: HTMLElement[]) {
  let best: HTMLElement | null = null;
  let bestDepth = Number.POSITIVE_INFINITY;

  const rootDepth = (node: Element) => {
    let depth = 0;
    let cur: Element | null = node;
    while (cur && cur !== root) {
      depth += 1;
      cur = cur.parentElement;
    }
    return cur === root ? depth : Number.POSITIVE_INFINITY;
  };

  for (const marker of markers) {
    let candidate: HTMLElement | null = marker.parentElement;
    while (candidate && candidate !== root.parentElement) {
      if (candidate === header || (header && candidate.contains(header))) {
        candidate = candidate.parentElement;
        continue;
      }

      const children = meaningfulChildren(candidate).filter((child) => child !== header);
      if (children.length >= 2) {
        const inputChildren = children.filter(containsInput);
        const leftChildren = children.filter((child) => !containsInput(child));
        if (inputChildren.length > 0 && leftChildren.length > 0) {
          const depth = rootDepth(candidate);
          if (depth < bestDepth) {
            best = candidate;
            bestDepth = depth;
          }
        }
      }

      if (candidate === root) break;
      candidate = candidate.parentElement;
    }
  }

  return best;
}

function annotate(route: HTMLElement) {
  clearMarks(route);

  const root = route.firstElementChild as HTMLElement | null;
  if (!root) return;

  // X01, Killer, Crados, Five Lives and the semantic shared layouts already
  // have dedicated landscape contracts. Keep those untouched.
  if (root.matches(EXPLICIT_LAYOUT_SELECTOR) || root.querySelector(`:scope > ${EXPLICIT_LAYOUT_SELECTOR}`)) {
    route.setAttribute('data-mss-auto-play-ready', 'native');
    return;
  }

  const markers = Array.from(root.querySelectorAll<HTMLElement>(INPUT_SELECTOR));
  if (!markers.length) {
    route.setAttribute('data-mss-auto-play-ready', 'no-input');
    return;
  }

  const directChildren = meaningfulChildren(root);
  let header = directChildren.find((child) => child.matches(HEADER_SELECTOR)) || null;
  if (!header) {
    header = directChildren.find((child) => {
      const hasBackOrInfo = !!child.querySelector('[data-mss-backdot], [data-mss-infodot], button');
      const hasHero = !!child.querySelector('img') || /ticker|header/i.test(child.className || '');
      return hasBackOrInfo && hasHero;
    }) || null;
  }
  if (!header && directChildren.length > 1 && !containsInput(directChildren[0])) {
    header = directChildren[0];
  }

  const host = findBestHost(root, header, markers);
  if (!host) {
    route.setAttribute('data-mss-auto-play-ready', 'unresolved');
    return;
  }

  root.setAttribute('data-mss-auto-play-root', '1');
  if (header) header.setAttribute('data-mss-auto-play-header', '1');
  host.setAttribute('data-mss-auto-play-zone-host', '1');

  const hostChildren = meaningfulChildren(host).filter((child) => child !== header);
  hostChildren.forEach((child) => {
    child.setAttribute('data-mss-auto-play-zone', containsInput(child) ? 'input' : 'left');
  });

  if (host !== root) {
    let body: HTMLElement | null = host;
    while (body.parentElement && body.parentElement !== root) body = body.parentElement;
    if (body.parentElement === root && body !== header) {
      body.setAttribute('data-mss-auto-play-body', '1');
    }

    let path: HTMLElement | null = host.parentElement;
    while (path && path !== root) {
      if (path !== header) path.setAttribute('data-mss-auto-play-path', '1');
      path = path.parentElement;
    }
  }

  route.setAttribute('data-mss-auto-play-ready', '1');
}

export default function PlayLandscapeAutoLayout({ active }: { active: boolean }) {
  React.useLayoutEffect(() => {
    if (!active || typeof document === 'undefined') return;

    let route: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let raf = 0;

    const refresh = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        route = document.querySelector<HTMLElement>('.dc-themed-route[data-msc-game-screen="play"]');
        if (!route) return;
        annotate(route);
      });
    };

    refresh();

    const attachObserver = () => {
      route = document.querySelector<HTMLElement>('.dc-themed-route[data-msc-game-screen="play"]');
      if (!route) return;
      observer?.disconnect();
      observer = new MutationObserver(() => refresh());
      observer.observe(route, { childList: true, subtree: true });
    };

    const observerTimer = window.setTimeout(attachObserver, 0);
    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('orientationchange', refresh, { passive: true });
    window.addEventListener('msc:responsive-layout', refresh as EventListener);

    return () => {
      window.clearTimeout(observerTimer);
      if (raf) cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      window.removeEventListener('msc:responsive-layout', refresh as EventListener);
      if (route) clearMarks(route);
    };
  }, [active]);

  return null;
}
