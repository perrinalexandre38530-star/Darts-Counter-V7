import fs from "node:fs";

const src = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const required = [
  'function processHollywood',
  'hollywoodSceneByPlayer',
  'hollywoodStarsByPlayer',
  'hollywoodBoxOfficeByPlayer',
  'finishWith(state, playerId'
];
for (const token of required) {
  if (!src.includes(token)) throw new Error(`Wave61 V58 hollywood: contrat manquant: ${token}`);
}
console.log("✅ Wave61 V58 — HOLLYWOOD finalisé individuellement");
