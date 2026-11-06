// Static regression checks for MSS drink-card V19 features and server-side accounting.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = (name) => readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const sql = read('supabase/migrations/20261106165000_organization_drink_cards_v19.sql');
const service = read('src/organizations/organizationDrinkCards.ts');
const panel = read('src/components/OrganizationDrinkCardsPanel.tsx');
const shop = read('src/components/OrganizationShopPanel.tsx');
const page = read('src/pages/OrganizationsPage.tsx');
for(const token of ['ms_org_drink_card_templates','ms_org_drink_cards','ms_org_drink_card_events',
 'ms_org_drink_card_issue','ms_org_drink_card_consume','ms_org_drink_card_undo','ms_org_drink_card_cancel',
 'ENABLE ROW LEVEL SECURITY','FOR UPDATE','reverses_event_id','DRINK_CARD_ALREADY_UNDONE','holder_user_id=auth.uid()',
 'GRANT EXECUTE','SECURITY DEFINER','paid_drinks + bonus_drinks']) {
  assert(sql.includes(token),`SQL: ${token} missing`);
}
assert(!sql.includes('GRANT INSERT ON public.ms_org_drink_cards'), 'No direct card balance edits');
assert(!sql.includes('GRANT UPDATE ON public.ms_org_drink_cards'), 'No direct card balance updates');
assert(!sql.includes('GRANT INSERT ON public.ms_org_drink_card_events'), 'No direct event writes');
for(const action of ['issueDrinkCard','consumeDrinkCard','undoDrinkCardConsumption','cancelDrinkCard',
 'saveDrinkCardTemplate','listDrinkCardEvents']) assert(service.includes(`function ${action}`), action);
for(const token of ['logoUrl','paidDrinks','bonusDrinks','validDays','form.color','form.icon',
 'issueHolder','Corriger +1','historyCard','canCorrect','window.confirm']) assert(panel.includes(token),`UI ${token}`);
assert(page.includes('view === "buvette"') || shop.includes('<OrganizationDrinkCardsPanel')); // V20: dedicated club Buvette
assert(page.includes('logoUrl={activeLogo}'));
console.log('OK V19 — cartes, logo, cases, attribution, permissions, audit et RLS atomique.');
