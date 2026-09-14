import fs from "node:fs";

const service = fs.readFileSync(new URL("../src/organizations/organizationService.ts", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../src/pages/OrganizationsPage.tsx", import.meta.url), "utf8");
const billing = fs.readFileSync(new URL("../src/components/OrganizationBillingPanel.tsx", import.meta.url), "utf8");
const federations = fs.readFileSync(new URL("../src/components/OrganizationFederationsPanel.tsx", import.meta.url), "utf8");
const sql = fs.readFileSync(new URL("../supabase/migrations/20260914183000_partnership_organizations_fees_v8.sql", import.meta.url), "utf8");

const checks = [
  ["billing panel routed", page.includes("OrganizationBillingPanel") && page.includes('view === "billing"')],
  ["fee service functions", service.includes("listOrganizationFeeCampaigns") && service.includes("setOrganizationFeeMemberStatus")],
  ["no sensitive payment UI", billing.includes("Aucune carte bancaire") && billing.includes("https://")],
  ["official results FFTT", federations.includes("https://monclub.fftt.com/")],
  ["official results FFF", federations.includes("https://epreuves.fff.fr/")],
  ["official results FFPJP", federations.includes("https://compet.ffpjp.org/compet")],
  ["official results FFD", federations.includes("https://www.ffdarts.fr/classement/")],
  ["only 2 fee tables", (sql.match(/create table if not exists public\.ms_organization_/g) || []).length === 2],
  ["pending rows inferred", sql.includes("Une ligne de règlement n'est créée que pour \"paid\" ou \"waived\"")],
  ["https payment links", sql.includes("ms_org_fee_payment_url_https")],
  ["financial secrets absent", !/\n\s*(card_number|iban|stripe_secret|client_secret)\s+/i.test(sql)],
  ["rpc secured", sql.includes("security definer") && sql.includes("revoke all on function public.ms_org_list_fee_campaigns")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}`);
  if (!ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
if (failed) process.exit(1);
