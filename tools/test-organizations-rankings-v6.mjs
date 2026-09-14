import fs from 'node:fs';
const read = (p) => fs.readFileSync(p,'utf8');
const service = read('src/organizations/organizationService.ts');
const page = read('src/pages/OrganizationsPage.tsx');
const panel = read('src/components/OrganizationStatsPanel.tsx');
const sql = read('supabase/migrations/20260914155500_partnership_organizations_rankings_v6.sql');
const checks = [
  ['ranking type', service.includes('export type OrganizationRankingRow')],
  ['ranking rpc client', service.includes('ms_org_get_rankings')],
  ['stats panel imported', page.includes('OrganizationStatsPanel')],
  ['stats route rendered', page.includes('view === "stats"') && page.includes('<OrganizationStatsPanel')],
  ['global competition filter', panel.includes('Toutes les compétitions')],
  ['sport filter', panel.includes('Toutes les disciplines')],
  ['podium metrics', panel.includes('Meilleure série') && panel.includes('Meilleur ratio')],
  ['standings table', panel.includes('CLASSEMENT') && panel.includes('recentForm')],
  ['no stats table creation', !/create\s+table\s+.*ms_organization_(rankings|stats|standings)/i.test(sql)],
  ['rpc migration', sql.includes('create or replace function public.ms_org_get_rankings')],
  ['security membership check', sql.includes('public.ms_org_is_member(p_org_id)')],
  ['authenticated grant', sql.includes('grant execute on function public.ms_org_get_rankings')],
];
const failed = checks.filter(([,ok]) => !ok);
for (const [name,ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
console.log(`${checks.length}/${checks.length} ORGANISATIONS RANKINGS V6`);
