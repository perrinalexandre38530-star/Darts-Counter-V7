// MSS V20 static integration checks + balanced stamp rows.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { stampRowLengths } from "../src/organizations/buvetteLayout.ts";
const get = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sql=get("supabase/migrations/20261106221500_organization_buvette_design_v20.sql");
const service=get("src/organizations/organizationDrinkCards.ts");
const visual=get("src/components/ClubBuvetteCardVisual.tsx");
const panel=get("src/components/OrganizationDrinkCardsPanel.tsx");
const page=get("src/pages/OrganizationsPage.tsx");
const shop=get("src/components/OrganizationShopPanel.tsx");
for(const s of ["background_key", "background_url", "used_slots", "slot_index", "ms_org_drink_card_stamp", "FOR UPDATE", "DRINK_CARD_SLOT_USED", "DRINK_CARD_ALREADY_UNDONE", "array_remove", "ms_org_drink_card_consume", "ms_org_drink_card_undo", "GRANT EXECUTE", "auth.uid()"])
  assert(sql.includes(s), `SQL missing ${s}`);
assert(!sql.includes("GRANT UPDATE ON public.ms_org_drink_cards"));
assert(!sql.includes("GRANT INSERT ON public.ms_org_drink_card_events"));
for(const s of ["stampDrinkCard", "usedSlots", "backgroundKey", "backgroundUrl", "slotIndex"]) assert(service.includes(s), `service missing ${s}`);
for(const s of ["BuvetteGlyph", "print-color-adjust", "stampDrinkCard", "roster.map", "avatars.get", "BUVETTE_BACKGROUNDS", "preparePrintableBackground", "uploadOrganizationShopImage", "Corriger +1"]) assert(panel.includes(s), `panel missing ${s}`);
for(const s of ["grayscale(1)", "#de343f", "data.color", "CARTE BUVETTE", "stampRowLengths", "clubBuvetteBackground"]) assert(visual.includes(s), `visual missing ${s}`);
assert(page.includes('view === "buvette"'));
assert(page.includes('{ id: "buvette"'));
assert(!shop.includes("showDrinkCards"));
assert(existsSync(new URL("../public/assets/buvette/bar-ambiance.jpg", import.meta.url)));
for(const total of [1,7,11,20,50,75,100,200,250]){
  const rows=stampRowLengths(total);
  assert.equal(rows.reduce((a,b)=>a+b,0),total,`${total} stamps`);
  assert(Math.max(...rows)-Math.min(...rows)<=1, `${total} balanced`);
  assert(rows.every(n=>n>0 && n<=13),`${total} line width`);
}
console.log("OK V20 — navigation Buvette, background, account permissions, per-slot atomics, avatars, 9 balanced layouts, printable cards.");
