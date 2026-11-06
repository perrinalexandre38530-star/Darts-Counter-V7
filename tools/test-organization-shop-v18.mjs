// Lightweight structural regression test for the V18 club catalogue.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const page = read('src/pages/OrganizationsPage.tsx');
const panel = read('src/components/OrganizationShopPanel.tsx');
const service = read('src/organizations/organizationShop.ts');
const migration = read('supabase/migrations/20261106073000_organization_club_shop_v18.sql');
const backup = read('src/organizations/organizationBackup.ts');
for (const category of ['official_kit', 'clothing', 'goodies', 'drinks', 'equipment_ad']) {
  assert(service.includes(`"${category}"`), `${category}: catégorie manquante`);
  assert(migration.includes(`'${category}'`), `${category}: SQL manquant`);
}
assert(page.includes('if (view === "shop") return <OrganizationShopPanel'));
assert(page.includes('"shop"') && page.includes('Boutique du club'));
assert(panel.includes('canManage') && panel.includes('canDelete'));
assert(migration.includes('ENABLE ROW LEVEL SECURITY'));
assert(migration.includes("status = 'published'"));
assert(migration.includes('ms_org_has_role'));
assert(migration.includes('GRANT UPDATE (category,title'));
assert(backup.includes('shopItems'));
assert(!panel.includes('stripe') && !panel.includes('checkout'));
console.log('OK V18: navigation, 5 catégories, permissions RLS, pas de paiement, sauvegarde.');
