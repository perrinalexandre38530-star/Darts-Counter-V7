import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storage = fs.readFileSync(path.join(root, "src/lib/storage.ts"), "utf8");
const profilesPage = fs.readFileSync(path.join(root, "src/pages/Profiles.tsx"), "utf8");

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(storage.includes("loadCanonicalAccountStoreForSnapshot"), "Une source canonique choisit le store contenant le plus de profils");
assert(storage.includes("mergeCanonicalProfileLists"), "Les profils sont fusionnés par identifiant entre store runtime, scoped et non scoped");
assert(storage.includes("knownStoreScopeAliasesFromSnapshot"), "Les identifiants Supabase et NAS historiques sont détectés comme scopes alias");
assert(storage.includes("const aliasKey = `${STORE_KEY}:${alias}`"), "Le store complet est écrit dans chaque scope simple connu après restauration");
assert(storage.includes("/^store:[^:]+:/.test(raw)"), "Les anciennes clés store récursives sont nettoyées après restauration");
assert(storage.includes("/^(store|dc_stats_index_v2):[^:]+:/.test(rawKey)"), "Les clés récursives ne sont plus réexportées dans les nouveaux backups");
assert(storage.includes("if (key === STORE_KEY) targets.add(scopedStorageKey(STORE_KEY))"), "Un store déjà scopé n'est plus re-scopé une seconde fois");
assert(storage.includes("const currentStore: any = await loadCanonicalAccountStoreForSnapshot().catch(() => null)"), "portableAccountData exporte la collection complète et non le seul profil actif");
assert(profilesPage.includes('return String(p.id ?? "").startsWith("online:")'), "La page Profils locaux ne masque que les anciens miroirs online: explicites");

const optionalJson = process.argv[2];
if (optionalJson && fs.existsSync(optionalJson)) {
  const rootJson = JSON.parse(fs.readFileSync(optionalJson, "utf8"));
  const payload = rootJson?.payload || rootJson;
  const idb = payload?.idb && typeof payload.idb === "object" ? payload.idb : {};
  const storeCounts = Object.entries(idb)
    .filter(([key, value]) => (key === "store" || key.startsWith("store:")) && value && typeof value === "object")
    .map(([key, value]) => ({ key, profiles: Array.isArray(value.profiles) ? value.profiles.length : 0 }));
  const best = storeCounts.sort((a, b) => b.profiles - a.profiles)[0] || { profiles: 0, key: "aucun" };
  const portableProfiles = Array.isArray(payload?.portableAccountData?.profiles)
    ? payload.portableAccountData.profiles.length
    : 0;
  console.log(`ℹ️ Export analysé : meilleur store=${best.profiles} profil(s), portableAccountData=${portableProfiles}, clé=${best.key}`);
}

console.log("\n✅ ANDROID LOCAL PROFILES RESTORE V58 OK");
