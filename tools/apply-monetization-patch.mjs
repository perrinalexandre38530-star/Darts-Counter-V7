#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

/**
 * MULTISPORTS SCORING — Monetization V1
 *
 * Depuis la V37, la monétisation fait partie de la base officielle et ne doit
 * plus être réinjectée par un patch textuel. L'ancien installateur ajoutait le
 * compteur publicitaire avant History.upsert(), ce qui pouvait comptabiliser
 * une partie dont la persistance échouait.
 *
 * Ce garde-fou reste volontairement dans le dépôt afin qu'un ancien raccourci
 * ou une commande oubliée ne puisse pas détériorer la nouvelle architecture.
 */

const projectRoot = path.resolve(process.argv[2] || process.cwd());
const appFile = path.join(projectRoot, "src", "App.tsx");
const managerFile = path.join(projectRoot, "src", "monetization", "MonetizationManager.ts");
const prefsFile = path.join(projectRoot, "src", "monetization", "prefs.ts");

function fail(message) {
  console.error(`\n[MONETIZATION] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(path.join(projectRoot, "package.json")) || !fs.existsSync(appFile)) {
  fail(`Dossier projet invalide : ${projectRoot}`);
}

const app = fs.readFileSync(appFile, "utf8");
const integrated =
  app.includes('from "./monetization/MonetizationManager"') &&
  app.includes("persistFinishedMatchForAds") &&
  app.includes("markCompletedMatchForAds") &&
  fs.existsSync(managerFile) &&
  fs.existsSync(prefsFile);

if (!integrated) {
  fail(
    "Installateur legacy désactivé. La monétisation RC doit être reprise depuis une base V37+ " +
    "afin de conserver la règle History.upsert réussi → comptage pub."
  );
}

console.log("✅ Monetization V1/RC déjà intégrée à cette base.");
console.log("   Aucun fichier modifié.");
console.log("   Vérification conseillée : npm run test:monetization");
