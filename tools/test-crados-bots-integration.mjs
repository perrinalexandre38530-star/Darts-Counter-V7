import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const botsPath = path.join(root, "src/lib/dartsCradosBots.ts");
const cfgPath = path.join(root, "src/pages/newModes/NewDartsModeConfig.tsx");
const playPath = path.join(root, "src/pages/CradosPlay.tsx");
const enginePath = path.join(root, "src/lib/gameEngines/cradosEngine.ts");
const botSelectorPath = path.join(root, "src/components/BotPagedSelector.tsx");
const bots = fs.readFileSync(botsPath, "utf8");
const cfg = fs.readFileSync(cfgPath, "utf8");
const play = fs.readFileSync(playPath, "utf8");
const engine = fs.readFileSync(enginePath, "utf8");
const botSelector = fs.readFileSync(botSelectorPath, "utf8");

function ok(cond, msg) { if (!cond) throw new Error(msg); }
const official = [...bots.matchAll(/bot\("(bot_crados_[^"]+)"/g)].map((m) => m[1]);
ok(official.length === 24, `Expected 24 official CRADOS bots, got ${official.length}`);
ok(new Set(official).size === 24, "CRADOS bot IDs must be unique");
const families = ["morvellos", "crado", "deglingos", "gastros", "decompositos", "gerbos"];
for (const family of families) ok(official.filter((id) => id.includes(`_${family}_`)).length === 4, `${family} must contain 4 bots`);
ok((bots.match(/memberIds: members\.map/g) || []).length === 1, "Family teams must be built from members");
ok(cfg.includes('mode === "crados" ? CRADOS_BOTS'), "CRADOS must replace generic pro bots with CRADOS_BOTS");
ok(cfg.includes("loadBotPlayers()"), "User-created CPU bots must remain available");
ok(cfg.includes("CRADOS_BOT_TEAMS.map"), "CRADOS family teams must be selectable");
ok(play.includes("cradosBotLevelForProfile"), "CRADOS play must use per-character levels");
ok(engine.includes("CradosBotStrength"), "CRADOS engine must support per-character numeric strength");
for (const family of ["MORVELLOS", "CRADO", "DÉGLINGOS", "GASTROS", "DÉCOMPOSITOS", "GERBOS"]) ok(botSelector.includes(`"${family}"`), `Bot selector group order missing ${family}`);
const assetDir = path.join(root, "src/assets/avatars/crados-bots");
const assets = fs.readdirSync(assetDir).filter((name) => name.endsWith(".webp"));
ok(assets.length === 24, `Expected 24 compressed CRADOS avatar assets, got ${assets.length}`);
console.log(`CRADOS bots integration OK: ${official.length} bots, 6 families, ${assets.length} WebP assets.`);
