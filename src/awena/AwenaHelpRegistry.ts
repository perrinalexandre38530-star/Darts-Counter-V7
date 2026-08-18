export type AwenaHelpEntry = {
  route: string;
  title: string;
  text: string;
  updatedAt: number;
};

const registry = new Map<string, AwenaHelpEntry>();

function key(route: string, title: string) {
  return `${String(route || "").toLowerCase()}|${String(title || "").toLowerCase()}`;
}

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function registerAwenaHelp(route: string | undefined, title: string | undefined, text: string | undefined) {
  const r = clean(route || "");
  const t = clean(title || "");
  const body = clean(text || "");
  if (!r || !t || !body || body.length < 8) return;
  registry.set(key(r, t), { route: r, title: t, text: body, updatedAt: Date.now() });
  if (registry.size > 120) {
    const oldest = Array.from(registry.entries()).sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0]?.[0];
    if (oldest) registry.delete(oldest);
  }
}

export function getAwenaHelpEntries(route?: string, titleHint?: string) {
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
