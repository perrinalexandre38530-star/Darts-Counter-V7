import fs from "node:fs";

const catalog = fs.readFileSync(new URL("../src/esports/catalog.ts", import.meta.url), "utf8");
const covers = fs.readFileSync(new URL("../src/esports/coverArt.ts", import.meta.url), "utf8");
const hub = fs.readFileSync(new URL("../src/pages/esports/EsportsHub.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/pages/esports/esportsHub.css", import.meta.url), "utf8");
const ids = [...catalog.matchAll(/\{ id: "([^"]+)"/g)].map((m) => m[1]);
if (ids.length < 27) throw new Error(`Expected at least 27 E-SPORTS games, got ${ids.length}`);
for (const id of ids) {
  if (!covers.includes(`"${id}"`)) throw new Error(`Missing real-cover mapping for ${id}`);
}
for (const required of [
  "static-cdn.jtvnw.net/ttv-boxart",
  "getEsportsCoverCandidates",
  "GameCover",
  "loading={eager ? \"eager\" : \"lazy\"}",
  "esports-game-grid",
  "esports-game-card",
  "esports-active-game-cover",
  "@media (max-width: 440px)",
  "@media (max-width: 330px)",
]) {
  if (![covers, hub, css, fs.readFileSync(new URL("../src/pages/esports/GameCover.tsx", import.meta.url), "utf8")].some((s) => s.includes(required))) throw new Error(`Missing cover contract: ${required}`);
}
console.log(`E-SPORTS covers V57 OK · ${ids.length} real cover mappings · responsive fallback OK`);
