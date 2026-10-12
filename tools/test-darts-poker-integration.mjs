#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const required = [
  "src/lib/gameEngines/dartsPokerEngine.ts",
  "src/pages/DartsPokerConfig.tsx",
  "src/pages/DartsPokerPlay.tsx",
  "src/pages/DartsPokerEnd.tsx",
  "src/components/stats/DartsPokerStatsTabFull.tsx",
  "src/components/darts-poker/DartsPokerCard.tsx",
  "src/lib/dartsPokerAnalytics.ts",
  "src/assets/tickers/ticker_darts_poker.png",
];
for (const rel of required) assert.ok(exists(rel), `fichier Darts Poker manquant: ${rel}`);

const tickerPng = fs.readFileSync(path.join(root, "src/assets/tickers/ticker_darts_poker.png"));
assert.ok(
  tickerPng.length >= 24 &&
  tickerPng.subarray(1, 4).toString("ascii") === "PNG",
  "le ticker Darts Poker doit être un PNG valide"
);
const tickerWidth = tickerPng.readUInt32BE(16);
const tickerHeight = tickerPng.readUInt32BE(20);
assert.equal(tickerWidth, 800, "le ticker Darts Poker doit faire 800 px de large");
assert.equal(tickerHeight, 230, "le ticker Darts Poker doit faire 230 px de haut");

const app = read("src/App.tsx");
assert.ok(app.includes('case "darts_poker_config"'), "route config absente");
assert.ok(app.includes('case "darts_poker_play"'), "route play absente");
assert.ok(app.includes("<DartsPokerPlay"), "écran Play non monté");
assert.ok(app.includes('"darts_poker_play"'), "plein écran Play absent");

const registry = read("src/games/dartsGameRegistry.ts");
assert.ok(registry.includes('id: "darts_poker"'), "carte Games absente");
assert.ok(registry.includes('tab: "darts_poker_config"'), "carte Games non reliée à la config");

// Anti-régression menu Jeux : Darts Poker doit rester actif et classé dans Fun.
const pokerDefinition = registry.match(/\{\s*id:\s*"darts_poker"[\s\S]*?\n\s*\},/i)?.[0] || "";
assert.ok(pokerDefinition, "définition Darts Poker introuvable dans le registry");
assert.ok(pokerDefinition.includes('category: "fun"'), "Darts Poker doit être classé dans Fun");
assert.ok(pokerDefinition.includes('subCategory: "strategie"'), "sous-catégorie Stratégie absente");
assert.ok(pokerDefinition.includes('ready: true'), "Darts Poker ne doit pas être déclaré indisponible");

const readyIdsSection = registry.match(/const READY_IDS = new Set<string>\(\[[\s\S]*?\]\);/i)?.[0] || "";
assert.ok(readyIdsSection.includes('"darts_poker"'), "Darts Poker absent de READY_IDS : la carte serait grisée");

const play = read("src/pages/DartsPokerPlay.tsx");
assert.ok(play.includes("DartsPokerEnd"), "écran de fin non relié");
assert.ok(play.includes('History as any).upsert(buildHistoryRecord("in_progress")'), "autosauvegarde en cours absente");
assert.ok(play.includes('initialStatsSubTab: "darts_poker"'), "raccourci stats de fin absent");
assert.ok(play.includes("stateSnapshot"), "snapshot de reprise absent");
assert.ok(play.includes("hitsBySegment"), "télémétrie S/D/T absente");
assert.ok(play.includes("roundContract"), "contrat de manche non affiché");
assert.ok(play.includes("dealerIndex"), "rotation du dealer absente");
assert.ok(play.includes("contractHits"), "statistiques de contrats absentes");
assert.ok(play.includes("DartsPokerCard"), "deck visuel MSS non utilisé dans Play");
assert.ok(play.includes('quickPanel === "deck"'), "panneau Deck MSS absent de Play");
assert.ok(play.includes('label="DECK"'), "raccourci Deck MSS absent de Play");
assert.ok(play.includes('label="MARCHÉ" value="20"'), "le raccourci Marché doit afficher les 20 secteurs et non la taille de la pioche");
const configPage = read("src/pages/DartsPokerConfig.tsx");
assert.ok(configPage.includes("DartsPokerDeckPreview"), "aperçu du deck MSS absent de la configuration");
assert.ok(configPage.includes("DartsPokerDeckGallery"), "galerie complète du deck MSS absente de la configuration");

const deck = read("src/components/darts-poker/DartsPokerCard.tsx");
assert.ok(deck.includes("AWENA"), "Awena absente du deck MSS");
assert.ok(deck.includes("killer-noz.webp"), "figures Killer absentes du deck MSS");
assert.ok(deck.includes("loterie-midas.webp"), "figures Loterie absentes du deck MSS");
assert.ok(deck.includes("firefighter-lyna.webp"), "figures Firefighter absentes du deck MSS");
assert.ok(deck.includes("buildDartsPokerDisplayDeck"), "construction du deck visuel complet absente");
assert.ok(deck.includes("DartsPokerDeckGallery"), "galerie des 52 cartes + Joker absente");

const endPage = read("src/pages/DartsPokerEnd.tsx");
assert.ok(endPage.includes("FIL DU MATCH · MANCHE PAR MANCHE"), "timeline visuelle des manches absente de la fin de partie");

const history = read("src/pages/HistoryPage.tsx");
assert.ok(history.includes('go("darts_poker_play"'), "reprise Historique absente");
assert.ok(history.includes('initialStatsSubTab: "darts_poker"'), "raccourci stats Historique absent");
assert.ok(history.includes('label: "DARTS POKER"'), "filtre Historique absent");

const summary = read("src/pages/DartsModeSummaryPage.tsx");
assert.ok(summary.includes("DartsPokerSummaryTables"), "carte Historique enrichie absente");
assert.ok(summary.includes("Showdowns"), "détail des showdowns absent");
assert.ok(summary.includes("Journal des volées"), "journal historique absent");
assert.ok(summary.includes("deck MSS Signature"), "meilleures mains visuelles absentes de l'historique");
assert.ok(summary.includes("Cartographie des secteurs"), "cartographie cible absente de l'historique");

const statsHub = read("src/pages/StatsHub.tsx");
assert.ok(statsHub.includes('key: "darts_poker"'), "onglet StatsHub absent");
assert.ok(statsHub.includes("<DartsPokerStatsTabFull"), "dashboard stats dédié absent");
const pokerStats = read("src/components/stats/DartsPokerStatsTabFull.tsx");
assert.ok(pokerStats.includes("Heatmap cible"), "heatmap Darts Poker absente du centre de stats");
assert.ok(pokerStats.includes("Tendance · 12 dernières parties"), "tendances Darts Poker absentes du centre de stats");
assert.ok(pokerStats.includes("Constance mains"), "indicateurs avancés Darts Poker absents du centre de stats");

const home = read("src/lib/homeModeStats.ts");
assert.ok(home.includes('darts_poker: "DARTS POKER"'), "résumé HOME absent");
assert.ok(home.includes('case "darts_poker"'), "KPI HOME absents");

const compact = read("src/lib/matchCompactCodec.ts");
assert.ok(compact.includes('mode === "darts_poker"'), "codec compact non spécialisé");
assert.ok(compact.includes("stateSnapshot"), "état reprenable non conservé dans le compact");

const android = read("src/config/androidStoreV1.ts");
assert.ok(android.includes('"darts_poker"'), "mode absent de la version Android Store");

console.log("✅ DARTS POKER INTEGRATION CONTRACT OK");
