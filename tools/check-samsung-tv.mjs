import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "MULTISPORTSSCORINGTV");
const required = ["config.xml", "icon.png", "index.html"];
let ok = true;

function fail(message) {
  ok = false;
  console.error(`❌ ${message}`);
}
function pass(message) {
  console.log(`✅ ${message}`);
}

for (const file of required) {
  const full = path.join(out, file);
  if (!fs.existsSync(full)) fail(`${file} absent`);
  else pass(`${file} présent`);
}

const config = fs.existsSync(path.join(out, "config.xml")) ? fs.readFileSync(path.join(out, "config.xml"), "utf8") : "";
const configChecks = [
  ["wgIoFKG6GG.MULTISPORTSSCORINGTV", "Application ID Tizen stable"],
  ['package="wgIoFKG6GG"', "Package ID Tizen stable"],
  ["http://tizen.org/privilege/internet", "Privilège Internet"],
  ["http://tizen.org/privilege/tv.inputdevice", "Privilège télécommande"],
  ['<tizen:profile name="tv-samsung"', "Profil Samsung TV"],
];
for (const [needle, label] of configChecks) {
  if (config.includes(needle)) pass(label);
  else fail(`${label} manquant dans config.xml`);
}

const indexPath = path.join(out, "index.html");
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, "utf8");
  if (/src=["']\.\/assets\//.test(html) || /href=["']\.\/assets\//.test(html)) pass("Assets Vite en chemins relatifs pour WGT");
  else fail("index.html ne référence pas les assets avec ./assets/ (base Tizen incorrecte)");
  if (!/https?:\/\/localhost/i.test(html)) pass("Aucune dépendance localhost dans index.html");
  else fail("Référence localhost détectée dans index.html");
}

const assetsDir = path.join(out, "assets");
if (!fs.existsSync(assetsDir)) fail("Dossier assets absent : build TV non généré");
else {
  const files = fs.readdirSync(assetsDir);
  const jsFiles = files.filter((f) => f.endsWith(".js"));
  if (jsFiles.length) pass("Bundle JavaScript TV généré");
  else fail("Bundle JavaScript TV absent");

  const bundleText = jsFiles.map((file) => fs.readFileSync(path.join(assetsDir, file), "utf8")).join("\n");
  if (bundleText.includes("dc-online-v3.perrin-alexandre38530.workers.dev")) pass("Viewer TV routé vers le Worker ONLINE DC_SYNC");
  else fail("Viewer TV non routé vers le Worker ONLINE (risque session absente)");

  if (bundleText.includes("MSS_TV_FULL_APP_BUILD_20260914_04")) pass("Interface Samsung TV FULL PREMIUM V4 intégrée au bundle");
  else fail("ANCIEN BUNDLE TV détecté : l'interface FULL PREMIUM V4 n'est pas dans les assets générés");

  if (bundleText.includes("TV FULL PREMIUM V4") && bundleText.includes("LANCER UNE PARTIE") && bundleText.includes("SPORTS")) pass("Navigation TV FULL PREMIUM V4 présente");
  else fail("Navigation TV FULL PREMIUM V4 absente du bundle");

  if (bundleText.includes("MATCH SIMPLE") && bundleText.includes("DICE DUEL") && bundleText.includes("MATCH 1V1")) pass("Lanceurs de sports TV intégrés");
  else fail("Lanceurs de sports TV incomplets");

  if (bundleText.includes("PROFIL ACTIF") && bundleText.includes("X01 PAR DÉFAUT")) pass("Profils / Stats / Réglages TV intégrés");
  else fail("Écrans TV profils/réglages absents");

  if (bundleText.includes("SAISIE TV") && bundleText.includes("x01_tv_score") && bundleText.includes("VALIDER")) pass("Keypad X01 interactif TV intégré");
  else fail("Keypad X01 TV absent du bundle");

  if (bundleText.includes("mss-tv-sport-logo-only") && bundleText.includes("mss-tv-action-ticker") && bundleText.includes("mss-tv-avatar")) pass("Sélecteur sports épuré + vrais tickers + avatars premium intégrés");
  else fail("Assets premium TV V4 absents");

  if (bundleText.includes("CRÉER UN PROFIL") && bundleText.includes("profile_create") && bundleText.includes("profile_update") && bundleText.includes("profile_delete")) pass("Gestion profils TV complète intégrée");
  else fail("Gestion profils TV V4 incomplète");

  if (bundleText.includes("NOMBRE DE JOUEURS") && bundleText.includes("Mode guidé TV") && bundleText.includes("mss-tv-guided-layout")) pass("Configuration guidée multi-sport intégrée");
  else fail("Configuration guidée TV V4 absente");

  if (bundleText.includes("mss-tv-scroll-region")) pass("Scroll/pagination TV V4 intégrés");
  else fail("Scroll TV V4 absent");

  if (bundleText.includes("/socket")) pass("Canal temps réel Viewer/WebSocket présent");
  else fail("Canal WebSocket Viewer absent du bundle");
}

function dirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return total;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === ".git") continue;
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

const bytes = dirSize(out);
const mb = bytes / 1024 / 1024;
console.log(`ℹ️ Taille projet Tizen avant packaging : ${mb.toFixed(2)} Mo`);
if (mb <= 12) pass("Package TV léger");
else console.warn("⚠️ Package TV > 12 Mo : vérifier les assets ajoutés au projet Tizen.");

if (!ok) process.exit(1);
console.log("\n📺 SAMSUNG TV PRECHECK : OK");
