import fs from "node:fs";
const read = (p) => fs.readFileSync(p, "utf8");
const auto = read("src/lib/cloudAutoRestore.ts");
const coordinator = read("src/lib/backup/accountBackupCoordinator.ts");
const server = read("server.js");
const vault = read("src/lib/storageVault.ts");
const storage = read("src/lib/storage.ts");
const plans = read("src/lib/storagePlans.ts");
function ok(v,m){ if(!v) throw new Error(`❌ ${m}`); console.log(`✅ ${m}`); }
ok(!auto.includes('auto-restore multi-source désactivé au login'), "Android recharge automatiquement la sauvegarde du compte");
ok(coordinator.includes('local-newer-richer') && coordinator.includes('candidateMatchCount'), "anti-régression : un snapshot plus pauvre n'écrase pas davantage de parties");
ok(coordinator.includes('payloadOwnerCompatible(payload, userId, candidate.accountScoped)'), "un snapshot d'un autre compte est refusé avant import");
ok(vault.includes('.filter((slot: any) => ownerMatchesCurrent(slot?.ownerId))'), "les slots locaux sont filtrés par propriétaire");
ok(storage.includes('return uid ? `${key}:${uid}` : key;'), "le store IndexedDB principal est namespacé par compte");
ok(plans.includes('`${STORAGE_PREFS_KEY}:${uid}`') && plans.includes("ownerUserId"), "la destination de sauvegarde par défaut est elle aussi isolée par compte");
for (const route of ['/backup/full','/backup/full/latest','/backup/list','/backup/deleteAll']) {
  const escaped = route.replaceAll('/', '\\/');
  const re = new RegExp(`app\\.(?:get|post)\\(\\"${escaped}\\", authRequired`);
  ok(re.test(server), `${route} exige une session authentifiée`);
}
ok(server.includes('const ownerId = String(req.user.id);'), "les backups legacy prennent le propriétaire depuis le token serveur");
ok(server.includes('WHERE user_id = $1 AND store = \'main\''), "les sauvegardes NAS sont indexées par user_id");
console.log("\n✅ ACCOUNT SAVE V62 CONTRACT OK");
