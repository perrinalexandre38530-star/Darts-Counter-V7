// Global player-name typography.
// The goal is to apply the same display font everywhere without having to
// duplicate font-family declarations across every game/config/stats screen.

const PLAYER_NAME_CLASS = "dc-player-name-jumbo";
const PLAYER_NAME_FONT = '"Jumbo Sale Trial", "JumboSaleTrial", fantasy';

const knownNames = new Set<string>();
let observer: MutationObserver | null = null;
let refreshTimer = 0;
let started = false;

function cleanName(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function addName(value: unknown) {
  const name = cleanName(value);
  if (!name || name.length < 2 || name.length > 80) return;
  knownNames.add(name);
}

function collectNamesFromObject(value: any, depth = 0) {
  if (depth > 7 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectNamesFromObject(item, depth + 1);
    return;
  }
  if (typeof value !== "object") return;

  for (const key of ["name", "displayName", "nickname", "playerName", "profileName", "public_name"]) {
    if (key in value) addName(value[key]);
  }

  for (const [key, child] of Object.entries(value)) {
    // Only recurse into structures likely to contain people. This avoids
    // accidentally treating game titles, rules, labels, etc. as player names.
    const k = key.toLowerCase();
    if (
      depth === 0 ||
      k.includes("player") ||
      k.includes("profile") ||
      k.includes("friend") ||
      k.includes("member") ||
      k.includes("bot") ||
      k.includes("participant") ||
      k.includes("room") ||
      k.includes("lobby") ||
      k.includes("user") ||
      Array.isArray(child)
    ) {
      collectNamesFromObject(child, depth + 1);
    }
  }
}

function collectNamesFromLocalStorage() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || "";
      const lower = key.toLowerCase();
      if (!/(profile|player|friend|bot|participant|lobby|room|user)/.test(lower)) continue;
      const raw = localStorage.getItem(key);
      if (!raw || raw.length > 3_000_000) continue;
      try { collectNamesFromObject(JSON.parse(raw)); } catch {}
    }
  } catch {}
}

async function refreshKnownNames() {
  try {
    const [{ loadStore }, { loadBots }] = await Promise.all([
      import("./storage"),
      import("./bots"),
    ]);
    const store = await loadStore<any>();
    collectNamesFromObject({
      profiles: store?.profiles,
      friends: store?.friends,
      players: store?.players,
      localPlayers: store?.localPlayers,
      participants: store?.participants,
      account: store?.account,
      user: store?.user,
    });
    for (const bot of loadBots?.() || []) collectNamesFromObject(bot);
  } catch {}
  collectNamesFromLocalStorage();
  scanDocument();
}

function isEligibleElement(el: HTMLElement) {
  const tag = el.tagName;
  if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "TEXTAREA", "SELECT", "OPTION"].includes(tag)) return false;
  if (el.isContentEditable) return false;
  if (tag === "INPUT") {
    const input = el as HTMLInputElement;
    const key = `${input.name || ""} ${input.id || ""} ${input.className || ""}`.toLowerCase();
    return /(nickname|player.?name|profile.?name|display.?name|pseudo)/.test(key);
  }
  return true;
}

function exactVisibleText(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) return cleanName(el.value);
  return cleanName(el.textContent);
}

function shouldUsePlayerFont(el: HTMLElement): boolean {
  if (!isEligibleElement(el)) return false;

  const cls = typeof el.className === "string" ? el.className.toLowerCase() : "";
  const dataName = cleanName(el.getAttribute("data-player-name") || el.getAttribute("data-profile-name"));
  if (dataName) return true;

  // Explicit semantic class names used across old/new screens.
  if (/(player[-_ ]?name|profile[-_ ]?name|nickname|pseudo)/.test(cls)) return true;

  const text = exactVisibleText(el);
  if (!text || !knownNames.has(text)) return false;

  // Prefer leaf / near-leaf nodes so only the player's name changes font,
  // not an entire score card containing unrelated labels and values.
  return el.childElementCount <= 2;
}

function tagElement(el: HTMLElement) {
  if (shouldUsePlayerFont(el)) {
    el.classList.add(PLAYER_NAME_CLASS);
    el.style.setProperty("--dc-player-name-font", PLAYER_NAME_FONT);
  } else if (el.classList.contains(PLAYER_NAME_CLASS)) {
    el.classList.remove(PLAYER_NAME_CLASS);
  }
}

function scanTree(root: ParentNode | Node) {
  if (root instanceof HTMLElement) tagElement(root);
  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return;
  const nodes = root.querySelectorAll<HTMLElement>("div,span,b,strong,p,h1,h2,h3,h4,h5,h6,button,a,td,th,label,input");
  for (const el of Array.from(nodes)) tagElement(el);
}

function scanDocument() {
  if (typeof document === "undefined" || !document.body) return;
  scanTree(document.body);
}

function installObserver() {
  if (observer || typeof MutationObserver === "undefined" || !document.body) return;
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        const parent = mutation.target.parentElement;
        if (parent) tagElement(parent);
        continue;
      }
      for (const node of Array.from(mutation.addedNodes)) scanTree(node);
      if (mutation.target instanceof HTMLElement) tagElement(mutation.target);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
}

export function installPlayerNameTypography() {
  if (started || typeof window === "undefined" || typeof document === "undefined") return;
  started = true;

  const start = () => {
    installObserver();
    void refreshKnownNames();
    scanDocument();
    try {
      document.fonts?.load('32px "Jumbo Sale Trial"').then(() => scanDocument()).catch(() => {});
      document.fonts?.ready?.then(() => scanDocument()).catch(() => {});
    } catch {}

    window.addEventListener("storage", () => void refreshKnownNames());
    window.addEventListener("dc:profiles-changed", () => void refreshKnownNames() as any);
    window.addEventListener("dc:player-name-refresh", () => void refreshKnownNames() as any);

    refreshTimer = window.setInterval(() => void refreshKnownNames(), 10000);
    window.addEventListener("beforeunload", () => {
      if (refreshTimer) window.clearInterval(refreshTimer);
      observer?.disconnect();
      observer = null;
    }, { once: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
