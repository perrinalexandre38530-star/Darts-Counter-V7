import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
};

const expert = read("src/awena/AwenaExpertReference.ts");
const core = read("src/awena/AwenaCore.ts");
const overlay = read("src/awena/components/AwenaOverlay.tsx");
const entries = [...expert.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]);
const unique = [...new Set(entries)];

assert(unique.length >= 90, `encyclopédie experte enrichie (${unique.length} fiches)`);
for (const domain of ["darts", "petanque", "pingpong", "molkky", "football", "babyfoot", "dice", "stats", "competition", "app"]) {
  assert(expert.includes(`domain: "${domain}"`), `domaine ${domain} couvert`);
}

for (const marker of [
  "1,73 m", "2,37 m", "170", "T20 → T20 → DBULL",
  "6 m et 10 m", "13 points", "CARREAU",
  "11 points", "16 cm", "TROISIÈME BALLE",
  "exactement 50", "trois tours de suite",
  "deux périodes de 45 minutes", "HORS-JEU",
  "ITSF", "PISSETTE", "GAMELLE",
  "1/6 ≈ 16,67 %", "SOMME DE DEUX D6",
  "MOYENNE PONDÉRÉE", "HEAD-TO-HEAD", "ROUND-ROBIN",
  "PRIORITÉ DES RÈGLES", "HISTORIQUE = SOURCE DE VÉRITÉ STATISTIQUE",
]) {
  assert(expert.includes(marker), `référence présente : ${marker}`);
}

assert(core.includes("answerAwenaExpertReference"), "AwenaCore branche la couche ExpertReference");
assert(core.indexOf("answerAwenaExpertReference") < core.indexOf("answerAwenaMasterEncyclopedia(question"), "couche experte prioritaire sur les réponses sportives génériques");
assert(core.includes("awenaExpertReferenceCount()"), "Awena annonce le volume de références expertes");
assert(overlay.includes("LOCAL V8.5") || overlay.includes("LOCAL V8.4"), "badge Awena LOCAL V8.4+");

console.log("\nAWENA V8.4 — EXPERT REFERENCE: OK");
