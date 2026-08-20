import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const detail = read("src/awena/AwenaDetailedKnowledge.ts");
const core = read("src/awena/AwenaCore.ts");
const provider = read("src/awena/AwenaProvider.tsx");
const modeDot = read("src/awena/components/AwenaModeDot.tsx");
const records = read("src/awena/AwenaRecords.ts");
const games = read("src/pages/Games.tsx");
const overlay = read("src/awena/components/AwenaOverlay.tsx");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function topLevelModeBlocks(source) {
  const start = source.indexOf("const DEEP:");
  assert(start >= 0, "DEEP absent");
  const sub = source.slice(start);
  const re = /^  ([a-zA-Z0-9_]+): \{/gm;
  const matches = [...sub.matchAll(re)];
  return matches.map((m, i) => {
    const from = m.index;
    const to = i + 1 < matches.length ? matches[i + 1].index : sub.indexOf("\n};", from);
    return { id: m[1], body: sub.slice(from, to) };
  });
}

const blocks = topLevelModeBlocks(detail);
assert(blocks.length === 63, `63 modes détaillés attendus, reçu ${blocks.length}`);
const missingRules = blocks.filter((b) => !/\n    rules:/.test(b.body)).map((b) => b.id);
const missingConfig = blocks.filter((b) => !/\n    configuration:/.test(b.body)).map((b) => b.id);
assert(!missingRules.length, `Règles manquantes : ${missingRules.join(", ")}`);
assert(!missingConfig.length, `Configurations manquantes : ${missingConfig.join(", ")}`);

for (const token of ["OBJECTIF", "BUST", "LEG, SET ET MATCH"]) assert(detail.includes(token), `X01 règles : ${token} absent`);
for (const token of ["301", "501", "701", "901", "Simple In", "Double In", "Master In", "Simple Out", "Double Out", "Master Out", "KEYPAD", "CIBLE", "PRESETS", "VOICE", "Téléphone compagnon", "Scolia", "Grandarts", "Bluetooth"]) {
  assert(detail.includes(token), `X01 configuration : ${token} absent`);
}
for (const token of ["FUYARD", "CHASSEUR", "CAPTURE", "ÉVASION"]) assert(detail.includes(token), `Attrape-moi : ${token} absent`);
assert(!detail.slice(detail.indexOf("export function detailedConfigurationText")).includes("DANS L’APPLICATION"), "Configuration ne doit plus ajouter DANS L’APPLICATION");
assert(detail.includes('.filter((section) => !/^CONDITION DE VICTOIRE$/i.test(section.title.trim()))'), "Les sections victoire doivent être filtrées de Configuration");

const strictIndex = core.indexOf("V9.3 MODE PRECISION");
const screenIndex = core.indexOf("const screenReply");
assert(strictIndex >= 0 && strictIndex < screenIndex, "Le routage Règles/Configuration doit précéder les aides générales");
assert(core.indexOf('forcedModeTopic === "config"') < core.indexOf("explicitRulesIntent)"), "La configuration forcée doit être prioritaire");
assert(provider.includes('modeTopic?: "rules" | "config" | "records"'), "AwenaProvider ne transporte pas l'intention stricte");
assert(provider.includes('options?.modeTopic !== "rules" && options?.modeTopic !== "config"'), "Règles/Configuration doivent contourner Records");
assert(modeDot.includes('awena.ask(prompt, { modeTopic: topic })'), "AwenaModeDot ne force pas le sujet");

assert(records.includes("randomDashboardSections"), "Records : sélection aléatoire absente");
assert(records.includes("lastRecordDashboardSelection"), "Records : anti-répétition absent");
assert(records.includes("genericModeDashboard"), "Records génériques par mode absents");
assert(records.includes("rawModeIdentityValues"), "Records : isolation stricte par mode absente");
assert(records.includes("hasConflictingVariant"), "Records : isolation des variantes absente");
assert(records.includes("Aucun autre mode n'est mélangé"), "Records : garde-fou de mode absent");

const infoDotCount = (games.match(/disableAwenaTakeover/g) || []).length;
assert(infoDotCount >= 3, `Games doit forcer les InfoDot sur hubs/favoris/cartes, reçu ${infoDotCount}`);
assert(overlay.includes("LOCAL V9.3") && overlay.includes("MODE PRECISION"), "Badge V9.3+ absent");

console.log(`AWENA V9.3 MODE PRECISION OK — ${blocks.length}/63 modes avec Règles + Configuration dédiées, Records isolés/aléatoires, ${infoDotCount} familles d'InfoDot GAMES restaurées.`);
