import type { AwenaReply } from "./awena.types";

export type AwenaHelpEntry = {
  route: string;
  title: string;
  text: string;
  updatedAt: number;
};

const registry = new Map<string, AwenaHelpEntry>();
const STORAGE_KEY = "dc-awena-help-registry-v2";
const MAX_ENTRIES = 180;
let hydrated = false;

function key(route: string, title: string) {
  return `${String(route || "").toLowerCase()}|${String(title || "").toLowerCase()}`;
}

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function norm(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[_/\\-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "a","au","aux","avec","ce","ces","cette","de","des","du","dans","et","est","il","elle","en","je","la","le","les","ma","me","mes","mon","nous","on","ou","pour","que","qui","quoi","se","son","sur","ta","te","tes","ton","tu","un","une","vos","votre",
  "comment","pourquoi","faire","sert","signifie","veut","dire","explique","expliquer","regle","regles","configuration","config","option","options","aide"
]);

function tokens(value: string) {
  return norm(value).split(" ").filter((token) => token.length > 1 && !STOP.has(token));
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(rows)) return;
    for (const row of rows.slice(-MAX_ENTRIES)) {
      const route = clean(row?.route || "");
      const title = clean(row?.title || "");
      const text = clean(row?.text || "");
      if (!route || !title || text.length < 8) continue;
      registry.set(key(route, title), {
        route,
        title,
        text,
        updatedAt: Number(row?.updatedAt || 0) || Date.now(),
      });
    }
  } catch {
    // Le registre d'aide est une optimisation : jamais bloquant.
  }
}

function persist() {
  if (typeof localStorage === "undefined") return;
  try {
    const rows = Array.from(registry.values())
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Pas d'échec applicatif si le quota local est indisponible.
  }
}

export function registerAwenaHelp(route: string | undefined, title: string | undefined, text: string | undefined) {
  ensureHydrated();
  const r = clean(route || "");
  const t = clean(title || "");
  const body = clean(text || "");
  if (!r || !t || !body || body.length < 8) return;
  registry.set(key(r, t), { route: r, title: t, text: body, updatedAt: Date.now() });
  if (registry.size > MAX_ENTRIES) {
    const oldest = Array.from(registry.entries()).sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0]?.[0];
    if (oldest) registry.delete(oldest);
  }
  persist();
}

export function getAwenaHelpEntries(route?: string, titleHint?: string) {
  ensureHydrated();
  const r = clean(route || "").toLowerCase();
  const hint = clean(titleHint || "").toLowerCase();
  if (!r) return [];
  return Array.from(registry.values())
    .filter((entry) => entry.route.toLowerCase() === r || entry.route.toLowerCase().includes(r) || r.includes(entry.route.toLowerCase()))
    .sort((a, b) => {
      const ah = hint && a.title.toLowerCase().includes(hint) ? 1 : 0;
      const bh = hint && b.title.toLowerCase().includes(hint) ? 1 : 0;
      return bh - ah || b.updatedAt - a.updatedAt;
    })
    .slice(0, 5);
}

export function getAwenaHelpText(route?: string, titleHint?: string) {
  const entries = getAwenaHelpEntries(route, titleHint);
  if (!entries.length) return "";
  return entries.map((entry) => `### ${entry.title}\n${entry.text}`).join("\n\n");
}

function scoreHelp(question: string, entry: AwenaHelpEntry, route?: string) {
  const q = norm(question);
  const title = norm(entry.title);
  const body = norm(entry.text);
  const currentRoute = norm(route || "");
  const entryRoute = norm(entry.route);
  let score = 0;

  if (title && q.includes(title)) score += 80;
  if (entryRoute && currentRoute && (entryRoute === currentRoute || entryRoute.includes(currentRoute) || currentRoute.includes(entryRoute))) score += 26;

  const qTokens = new Set(tokens(q));
  const titleTokens = new Set(tokens(title));
  const bodyTokens = new Set(tokens(body));
  for (const token of qTokens) {
    if (titleTokens.has(token)) score += 14;
    else if (bodyTokens.has(token)) score += 5;
  }
  return score;
}

function helpIntent(question: string) {
  const q = norm(question);
  return /regle|configuration|option|a quoi sert|que signifie|c est quoi|qu est ce|comment fonctionne|comment jouer|comment regler|comment utiliser|explique|aide|info/.test(q);
}

export function searchAwenaHelp(question: string, route?: string, limit = 3) {
  ensureHydrated();
  const rows = Array.from(registry.values())
    .map((entry) => ({ entry, score: scoreHelp(question, entry, route) }))
    .filter((row) => row.score >= (helpIntent(question) ? 18 : 48))
    .sort((a, b) => b.score - a.score || b.entry.updatedAt - a.entry.updatedAt)
    .slice(0, Math.max(1, Math.min(5, limit)));
  return rows;
}

export function answerAwenaRegisteredHelp(question: string, route?: string): AwenaReply | null {
  const hits = searchAwenaHelp(question, route, 3);
  if (!hits.length) return null;

  const best = hits[0];
  const sections = hits
    .map(({ entry }) => `## ${entry.title.toUpperCase()}\n${entry.text}`)
    .join("\n\n");

  return {
    knowledgeTopic: `help:${best.entry.route}:${best.entry.title}`,
    text: `${sections}\n\n> Cette réponse réutilise l'aide InfoDot réellement fournie par les écrans déjà connus de l'application.`,
  };
}

export function awenaRegisteredHelpCount() {
  ensureHydrated();
  return registry.size;
}
