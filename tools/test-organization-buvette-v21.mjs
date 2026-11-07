// MSS V21 - vérifie le lot d'images, l'interface, la persistance et la rétrocompatibilité V19-V20.
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const get = p => readFileSync(join(root,p),'utf8');
const registry = get('src/organizations/buvetteBackgrounds.ts');
const service = get('src/organizations/organizationDrinkCards.ts');
const visual = get('src/components/ClubBuvetteCardVisual.tsx');
const panel = get('src/components/OrganizationDrinkCardsPanel.tsx');
const sql = get('supabase/migrations/20261107002000_organization_buvette_scenes_v21.sql');
let bytes=0;
const assets=[...registry.matchAll(/path: "(\/assets\/buvette\/[^\"]+\.webp)"/g)].map(x=>x[1]);
assert.equal(assets.length,20,'Exactly twenty backgrounds');
assert.equal(new Set(assets).size,20,'Unique backgrounds');
for(const [i,asset] of assets.entries()) {
  const name=join(root,'public',asset);
  const raw=readFileSync(name);
  assert.equal(raw.toString('ascii',0,4),'RIFF',asset+' must be WebP RIFF');
  assert.equal(raw.toString('ascii',8,12),'WEBP',asset+' must be WebP');
  const size=statSync(name).size;
  assert(size>10000 && size<350000,`${asset}: size out of budget`);
  bytes+=size;
  assert(registry.includes(`scene-${String(i+1).padStart(2,'0')}`),`Missing scene ${i+1}`);
  assert(sql.includes(`'scene-${String(i+1).padStart(2,'0')}'`),`SQL missing scene ${i+1}`);
}
for(const name of ['ms_org_drink_card_templates','ms_org_drink_cards','ms_org_buvette_settings', 'ms_org_is_member','ms_org_has_role','ms_org_buvette_cover_set','SECURITY DEFINER','GRANT EXECUTE','ENABLE ROW LEVEL SECURITY'])
 assert(sql.includes(name), `Migration lacks ${name}`);
assert(!sql.includes('GRANT INSERT ON public.ms_org_buvette_settings'), 'No direct writes to cover settings');
assert(!sql.includes('UPDATE public.ms_org_drink_cards SET'), 'V21 must not mutate issued cards');
assert(!sql.includes('UPDATE public.ms_org_drink_card_events'), 'V21 must not mutate consumed drinks');
for(const name of ['BUVETTE_SCENES','DEFAULT_BUVETTE_COVER','getOrganizationBuvetteCover','saveOrganizationBuvetteCover'])
 assert(service.includes(name),`Service lacks ${name}`);
for(const name of ['BUVETTE_SCENES','coverKey','coverEditorOpen','getOrganizationBuvetteCover','saveOrganizationBuvetteCover', 'clubBuvetteBackground'])
 assert(panel.includes(name),`Panel lacks ${name}`);
assert(visual.includes('isBuvetteSceneKey(preset)'));
assert(visual.includes('buvetteScenePath(preset)'));
console.log(`OK MSS V21 — ${assets.length} fonds WebP uniques (${(bytes/1024/1024).toFixed(2)} Mio), sélection carte + couverture, RLS et migrations V19-V20 préservées.`);
