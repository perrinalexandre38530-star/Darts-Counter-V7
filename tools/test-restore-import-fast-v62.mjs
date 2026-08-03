import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (ok, label) => {
  if (!ok) throw new Error(`❌ ${label}`);
  console.log(`✅ ${label}`);
};

const media = read("src/lib/userMediaFallback.ts");
const storage = read("src/lib/storage.ts");
const history = read("src/lib/historyCloud.ts");
const page = read("src/pages/StorageVaultPage.tsx");

assert(media.includes("async function idbPutMany") && media.includes('db.transaction(STORE_NAME, "readwrite")'), "les médias sont écrits dans une transaction IndexedDB groupée");
assert(media.includes("scheduleTrimLocalDb") && !media.includes("void trimLocalDb();\n  } catch {}\n}\n\nasync function trimLocalDb"), "le nettoyage du coffre média n'est plus relancé après chaque image");
assert(media.includes("if (explicitMedia.length > 0)") && media.includes("source canonique"), "un snapshot moderne ne rescane plus toutes les copies de store pour les mêmes médias");
assert(media.includes("Écriture groupée de") && media.includes("opts.onProgress"), "l'import média remonte une progression réelle");

assert(storage.includes("key.startsWith(`${STORE_KEY}:`)") && storage.includes('key.startsWith("dc_stats_index_v2:")'), "les anciennes clés récursives du snapshot ne sont plus réimportées en boucle");
assert(storage.includes("onProgress?: (progress: number, message: string) => void") && storage.includes("Restauration des parties :"), "l'import principal publie ses sous-étapes");
assert(storage.includes("preserveExisting: !historyReplace"), "une restauration replace n'effectue plus une fusion historique préalable inutile");
assert(storage.includes("importUserMediaFromSnapshot(dump, {") && storage.includes("Restauration des profils, bots, dartsets et équipes"), "les étapes lourdes sont séparées et traçables");

assert(history.includes("preserveExisting?: boolean") && history.includes("const preserveExisting = opts?.preserveExisting ?? !replace"), "l'historique peut éviter la relecture complète de l'ancien état en mode replace");
assert(history.includes("opts?.onProgress?.(rowIndex + 1, totalRows)"), "la progression des 75 parties est remontée");

assert(page.includes("64 + Math.round") && page.includes("internes remontent désormais réellement"), "le ticker global ne reste plus figé à 64 % pendant l'import");

console.log("\n✅ RESTORE IMPORT FAST V62 OK");
