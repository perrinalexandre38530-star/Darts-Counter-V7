#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const must = (ok, message) => {
  if (!ok) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
};

const omni = read("src/awena/AwenaOmniKnowledge.ts");
const tools = read("src/awena/AwenaKnowledgeTools.ts");
const core = read("src/awena/AwenaCore.ts");
const overlay = read("src/awena/components/AwenaOverlay.tsx");
const pkg = JSON.parse(read("package.json"));
const ids = [...omni.matchAll(/\bid:\s*"(omni-[^"]+)"/g)].map((m) => m[1]);
const unique = [...new Set(ids)];

must(unique.length >= 320, `Omni Knowledge contient ${unique.length} nouvelles fiches`);
for (const domain of ["darts", "petanque", "pingpong", "molkky", "football", "babyfoot", "dice", "stats", "competition", "app"]) {
  must(omni.includes(`domain: "${domain}"`), `domaine Omni couvert : ${domain}`);
}
for (const marker of [
  "Nine-darter / leg parfait", "Bogey numbers en X01", "Around the Clock",
  "Pointage à la roulette", "Tir au fer", "Dernière boule",
  "Service sur paume ouverte", "Troisième balle", "Taux de passes 5→3",
  "Dépassement de 50", "Atteindre exactement 50", "Expected Goals (xG)",
  "Double élimination", "Système suisse", "Écart-type", "Points de pourcentage",
  "dc-store-v1", "dc-history-v1", "Synchronisation NAS manuelle", "Build Android et synchronisation",
]) must(omni.includes(marker), `connaissance présente : ${marker}`);

must(tools.includes("answerDartArithmetic"), "outil calcul de volée présent");
must(tools.includes("answerDartsAverage"), "outil AVG3 présent");
must(tools.includes("answerWinRate"), "outil win rate présent");
must(tools.includes("answerBestOf"), "outil Best Of présent");
must(tools.includes("answerDiceProbability"), "outil probabilités 2D6 présent");
must(core.includes("answerAwenaKnowledgeTool"), "outils V8.5 branchés dans AwenaCore");
must(core.includes("answerAwenaOmniKnowledge"), "Omni Knowledge branché dans AwenaCore");
must(core.indexOf("answerAwenaKnowledgeTool(question") < core.indexOf("answerAwenaExpertReference(question"), "calcul déterministe prioritaire sur les fiches statiques");
must(core.indexOf("answerAwenaOmniKnowledge(question") < core.indexOf("answerAwenaMasterEncyclopedia(question"), "Omni complète les encyclopédies avant le fallback maître");
must(core.includes("awenaOmniKnowledgeCount()") && core.includes("AWENA_KNOWLEDGE_TOOL_COUNT"), "Awena annonce les nouveaux volumes de connaissances/outils");
must(overlay.includes("LOCAL V8.5"), "badge Awena LOCAL V8.5");
must(pkg.scripts["test:awena:v85"]?.includes("test-awena-v85-omni-knowledge.mjs"), "script package V8.5 présent");
must(pkg.scripts["test:admob-native"]?.includes("test-admob-diagnostics-v78.mjs"), "évolutions package V80 / AdMob conservées");
must(pkg.dependencies?.["@capacitor/android"] === "^8.4.2", "dépendances V80 conservées");

const outDir = path.join(root, ".tmp-awena-v85-test");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
execFileSync("tsc", [
  "src/awena/AwenaKnowledgeTools.ts",
  "src/awena/AwenaOmniKnowledge.ts",
  "src/awena/awena.types.ts",
  "--target", "ES2022",
  "--module", "ES2022",
  "--moduleResolution", "Bundler",
  "--skipLibCheck",
  "--outDir", outDir,
], { cwd: root, stdio: "inherit" });

const toolMod = await import(pathToFileURL(path.join(outDir, "AwenaKnowledgeTools.js")).href + `?t=${Date.now()}`);
const omniMod = await import(pathToFileURL(path.join(outDir, "AwenaOmniKnowledge.js")).href + `?t=${Date.now()}`);
const ctx = {};

const visit = toolMod.answerAwenaKnowledgeTool("T20 D5 BULL ça fait combien ?", ctx);
must(visit?.text.includes("95 points"), "outil volée calcule T20 + D5 + BULL = 95");
const remain = toolMod.answerAwenaKnowledgeTool("À partir de 501, soustrais T20 D5 BULL", ctx);
must(remain?.text.includes("reste **406**"), "outil volée soustrait correctement depuis 501");
const avg = toolMod.answerAwenaKnowledgeTool("Quelle moyenne pour 300 points en 9 fléchettes ?", ctx);
must(avg?.text.includes("AVG3D : 100"), "outil AVG3 calcule 300 points / 9 darts = 100");
const wr = toolMod.answerAwenaKnowledgeTool("7 victoires sur 10, quel taux ?", ctx);
must(wr?.text.includes("70 %"), "outil win rate calcule 7/10 = 70 %");
const bo = toolMod.answerAwenaKnowledgeTool("BO7 il faut combien de manches ?", ctx);
must(bo?.text.includes("4 victoires"), "outil Best Of calcule BO7 = 4 victoires");
const dice = toolMod.answerAwenaKnowledgeTool("Quelle probabilité de faire 7 avec 2 dés ?", ctx);
must(dice?.text.includes("16.67") || dice?.text.includes("16,67") || dice?.text.includes("16.67 %"), "outil 2D6 calcule la somme 7");

const nine = omniMod.answerAwenaOmniKnowledge("c'est quoi un nine darter ?", {}, "");
must(nine?.text.includes("9 fléchettes"), "recherche Omni retrouve nine-darter");
const nas = omniMod.answerAwenaOmniKnowledge("la synchronisation NAS est automatique ?", {}, "");
must(nas?.text.includes("manuelle") || nas?.text.includes("manuelle"), "recherche Omni retrouve la politique NAS manuelle V80");
const generic = omniMod.answerAwenaOmniKnowledge("ouvre les réglages", {}, "");
must(generic === null, "Omni n'intercepte pas une navigation générique");

fs.rmSync(outDir, { recursive: true, force: true });
console.log("\n✅ AWENA V8.5 — OMNI KNOWLEDGE + LOCAL TOOLS: OK");
