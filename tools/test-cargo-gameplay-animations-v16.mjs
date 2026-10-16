import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const must = (condition, message) => {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exitCode = 1;
  }
};

const play = read("src/pages/CargoPlay.tsx");
const burst = read("src/components/cargo/CargoGameplayBurst.tsx");
const css = read("src/styles/cargo-ui.css");

must(play.includes("CargoGameplayBurst"), "CargoPlay doit monter CargoGameplayBurst");
must(play.includes("buildCargoGameplayBurst"), "CargoPlay doit construire le feedback métier depuis les événements");
must(play.includes("gameplayBurst"), "CargoPlay doit conserver un état de feedback gameplay");
must(play.includes("cargo-play-burst-active"), "La surface Play doit recevoir le feedback ambiant");
must(play.includes("setGameplayBurst(null)"), "Undo/reset doivent pouvoir nettoyer les animations");

[
  "perfect_load",
  "overload",
  "series_lost",
  "contract_expired",
  "contract_complete",
  "free_load_complete",
  "parcel_delivery",
  "route_stage",
  "convoy_handoff",
  "dbull_protect",
  "dbull_validate",
  "bull_secure",
  "series_secure",
].forEach((eventType) => must(burst.includes(eventType), `Mapping animation manquant : ${eventType}`));

[
  "FRAGILE CASSÉ",
  "FRAGILE SÉCURISÉ",
  "EXPRESS LIVRÉ",
  "EXPRESS EXPIRÉ",
  "PALETTE CHARGÉE",
  "COLIS LIVRÉS",
  "RELAIS CONVOI",
  "ÉTAPE ATTEINTE",
  "SURCHARGE",
  "CHARGEMENT PARFAIT",
].forEach((label) => must(burst.includes(label), `Feedback métier manquant : ${label}`));

[
  ".cargo-gameplay-burst",
  ".cargo-burst-danger",
  ".cargo-burst-convoy",
  ".cargo-burst-route",
  ".cargo-burst-rush",
  ".cargo-burst-parcel",
  ".cargo-burst-secure",
  "@media (prefers-reduced-motion:reduce)",
].forEach((selector) => must(css.includes(selector), `Style animation V16 manquant : ${selector}`));

if (!process.exitCode) {
  console.log("✅ CARGO GAMEPLAY ANIMATIONS V16 OK");
}
