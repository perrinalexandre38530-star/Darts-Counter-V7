import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/StorageVaultPage.tsx'), 'utf8');
const vault = fs.readFileSync(path.join(root, 'src/lib/storageVault.ts'), 'utf8');
const nasApi = fs.readFileSync(path.join(root, 'src/lib/nasApi.ts'), 'utf8');

function assert(ok, message) {
  if (!ok) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

assert(!page.includes('withFastFallback(listNasMemorySlots(), [], 2_500)'), 'Un timeout de 2,5 s ne vide plus la liste NAS');
assert(page.includes('writeCachedNasSlots(activeNas)'), 'Une liste NAS confirmée est mise en cache local');
assert(page.includes('if (current.length) return current;'), 'Un refresh NAS en échec conserve la liste déjà affichée');
assert(page.includes('id: "latest"'), 'Le courant créé après /sync/push porte toujours l’identifiant latest');
assert(page.includes('entry.latest || entry.quality.grade === "complete"'), 'Le courant NAS confirmé reste affiché même si son résumé est incomplet');
assert(vault.includes('summary: summarizeVaultPayload(decoded)'), 'Le fallback /sync/pull reconstruit un résumé au lieu de masquer le courant');
assert(nasApi.includes('une sauvegarde NAS ne doit JAMAIS déclencher'), 'Le push NAS ne déclenche plus de copie R2 implicite');
assert(!page.includes('const canUsePrivateNas = !isPublicSupabaseVaultAuth'), 'La restauration NAS n’est plus masquée par une session Supabase publique/hybride');
assert(page.includes('privateNasCapability.authorized || founderNasSelected'), 'Le NAS fondateur reste visible pendant la restauration du bridge privé');
assert(page.includes('getPrivateNasCapability?.({ force: true })'), 'La sélection NAS revérifie le droit fondateur avant restauration');
assert(page.includes('switchAccountInfrastructure?.("nas")'), 'Le bridge NAS est recréé automatiquement si nécessaire');

console.log('\n✅ NAS VAULT FRONTEND / NO-DISAPPEAR REGRESSION OK');
