// ============================================
// src/games/newModesTicker.ts
// Source unique pour le ticker "NEW MODES" (bar 3 parties)
// - Charge automatiquement les images ticker_*.png via Vite import.meta.glob
// - Construit la liste newTickerItems (id/label/tickerSrc/configTarget)
// - Convention images : src/assets/tickers/ticker_<gameId>.png
// - Ratio tickers : 800x230 (géré dans NewGameTickerBar)
// ============================================

import { DARTS_GAMES, type DartsGameDef } from "./dartsGameRegistry";
import type { NewTickerItem } from "../components/NewGameTickerBar";

// ✅ Mets ici la liste des IDs "nouveautés" (c’est LA “liste” demandée)
export const NEW_MODE_IDS: string[] = [
  "bobs_27",
  "halve_it",
  "happy_mille",
  "t70",
  "count_up",
  "prisoner",
  "encullette_vache",
];

// ✅ Auto-load des tickers via convention de nommage
// Place tes fichiers ici : src/assets/tickers/ticker_<gameId>.png
const tickerImages = import.meta.glob("../assets/tickers/ticker_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function tickerSrcForId(id: string): string | null {
  // On cherche une clé finissant par `ticker_<id>.png`
  const suffix = `/ticker_${id}.png`;
  for (const k of Object.keys(tickerImages)) {
    if (k.endsWith(suffix)) return tickerImages[k];
  }
  return null;
}

// ✅ Derive config target (best-effort) depuis la def du jeu
function deriveConfigTarget(g: DartsGameDef): string {
  // Si tu ajoutes plus tard `configTab` dans le registry, on le privilégie.
  const anyG = g as any;
  if (anyG.configTab && typeof anyG.configTab === "string") return `tab:${anyG.configTab}`;

  const tab = String(g.tab || "");

  // Si déjà une config
  if (/config/i.test(tab)) return `tab:${tab}`;

  // Patterns courants
  if (tab.endsWith("_play")) return `tab:${tab.replace(/_play$/i, "_config")}`;
  if (tab.endsWith("Play")) return `tab:${tab.replace(/Play$/i, "Config")}`;
  if (tab.includes("Play")) return `tab:${tab.replace(/Play/gi, "Config")}`;

  // Fallback : on suppose un tab config standard basé sur id
  return `tab:${g.id}_config`;
}

export function getNewTickerItems(): NewTickerItem[] {
  const byId = new Map<string, DartsGameDef>();
  for (const g of DARTS_GAMES) byId.set(g.id, g);

  const items: NewTickerItem[] = [];

  for (const id of NEW_MODE_IDS) {
    const g = byId.get(id);
    if (!g) continue;
    if (!g.ready) continue;

    const src = tickerSrcForId(id);
    // Si l'image n'existe pas, on skip (évite un ticker cassé)
    if (!src) continue;

    items.push({
      id,
      label: g.label,
      tickerSrc: src,
      configTarget: deriveConfigTarget(g),
    });
  }

  return items;
}
