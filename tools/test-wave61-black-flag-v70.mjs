import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["black_flag: { icon:", "state.modeId === \"black_flag\"", "Butin +", "processConquestMode"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V70 black-flag: contrat absent: ${needle}`);
if (!catalogue.includes('id: "black_flag"') && !catalogue.includes("id: 'black_flag'")) throw new Error("V70: mode absent du catalogue");
console.log("✅ Wave61 V70 — BLACK-FLAG finalisé");
