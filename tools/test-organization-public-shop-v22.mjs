import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const app = read("src/App.tsx");
const panel = read("src/components/OrganizationShopPanel.tsx");
const admin = read("src/components/OrganizationPublicShopSettings.tsx");
const page = read("src/pages/OrganizationPublicShopPage.tsx");
const service = read("src/organizations/organizationPublicShop.ts");
const sql = read("supabase/migrations/20261107013000_organization_public_shop_v22.sql");
for (const path of ["supabase/migrations/20261106073000_organization_club_shop_v18.sql", "supabase/migrations/20261106165000_organization_drink_cards_v19.sql", "supabase/migrations/20261106221500_organization_buvette_design_v20.sql", "supabase/migrations/20261107002000_organization_buvette_scenes_v21.sql"]) {
  assert(existsSync(resolve(root,path)), `Missing existing ${path}`);
}
assert(app.includes('h.startsWith("#/club-shop/")'));
assert(app.includes('case "organization_public_shop":'));
assert(app.includes('OrganizationPublicShopPage organizationId='));
assert(app.includes('tab === "organization_public_shop"'));
assert(panel.includes('<OrganizationPublicShopSettings organization={organization}'));
assert(admin.includes('readPublicShopSettings(') && admin.includes('savePublicShopSettings('));
assert(admin.includes('settings.isPublished') && admin.includes('setSavedPublished(settings.isPublished)'));
assert(admin.includes('contactEmail') && admin.includes('contactPhone'));
assert(page.includes('fetchPublicShop(') && page.includes('shown.map('));
assert(page.includes('role="dialog"') && page.includes('mailto:'));
assert(service.includes('fetchPublicShop(') && service.includes('ms_org_public_shop_read_v22'));
assert(sql.includes('is_published boolean NOT NULL DEFAULT false'));
assert(sql.includes("WHERE i.organization_id=p_organization_id AND i.status='published'"));
assert(sql.includes('WHERE organization_id=p_organization_id AND is_published=true'));
assert(sql.includes('GRANT EXECUTE ON FUNCTION public.ms_org_public_shop_read_v22(uuid) TO anon, authenticated'));
assert(sql.includes('public.ms_org_has_role(organization_id, ARRAY[\'owner\',\'admin\'])'));
for (const forbidden of ['join_code','owner_id','member_count','auth.users','ms_organization_drink_cards']) {
  assert(!sql.includes(`'${forbidden}'`), `Public RPC might expose ${forbidden}`);
}
console.log('OK V22 — public catalog opt-in, public route, admin editor, RLS, no private card data');
