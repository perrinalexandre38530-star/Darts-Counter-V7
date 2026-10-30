import fs from "node:fs";

const games = fs.readFileSync(new URL("../src/pages/Games.tsx", import.meta.url), "utf8");
const play = fs.readFileSync(new URL("../src/pages/Wave61SharedPlay.tsx", import.meta.url), "utf8");

function ok(condition, message) {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
}

ok(games.includes('if (tab === "wave61_config")'), "configPathForGame must special-case wave61_config");
ok(games.includes('tab:wave61_config?gameId=${encodeURIComponent(String(g?.id || ""))}'), "wave61 config path must include gameId");
ok(games.includes('String(g.tab || "") === "wave61_config"'), "main game cards must pass gameId to wave61_config");
ok(games.includes('? { gameId: g.id }'), "main Wave61 cards must build a gameId param");

for (const id of ["double_down", "nine_dart_century", "shove_a_penny", "green_vs_red", "hi_score"]) {
  ok(play.includes(`"${id}"`), `${id} must be part of the classic-five dedicated layout`);
}

ok(play.includes('data-wave61-classic-five={spec.id}'), "classic-five must use dedicated viewport shell");
ok(play.includes('data-wave61-classic-input="fixed"'), "classic-five keypad must live in a fixed reserved zone");
ok(play.includes('overflowY:"auto"'), "information zone must own the vertical scroll");
ok(play.includes('setQuickPanel(b.id as any)'), "quick icon buttons must open floating panels");
ok(play.includes('function HiScorePanel'), "HI SCORE must have its own live panel");
ok(play.includes('lockBodyScroll: classicFiveMode'), "body scroll must be locked for the five dedicated modes only");

console.log("✅ V43 classic five: Wave61 routing + fixed keypad + compact info/modal layout guarded.");
