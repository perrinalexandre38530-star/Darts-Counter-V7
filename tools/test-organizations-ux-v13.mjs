import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const page=read('src/pages/OrganizationsPage.tsx');
const nav=read('src/components/BottomNav.tsx');
const app=read('src/App.tsx');
const orgTabsBlock=(nav.match(/const tabs:[\s\S]*?organizationMode[\s\S]*?\? \[([\s\S]*?)\]\s*:\s*sportLc/)||[])[1]||'';
const checks=[
 ['five-tab organization nav', (orgTabsBlock.match(/\{ k:/g)||[]).length===5 && orgTabsBlock.includes('organization_home') && orgTabsBlock.includes('organization_calendar') && orgTabsBlock.includes('k: "games"') && orgTabsBlock.includes('organization_teams') && orgTabsBlock.includes('organization_more')],
 ['more route wired', app.includes('organization_more') && page.includes('more: "organization_more"')],
 ['home next-event focus', page.includes('PROCHAIN RENDEZ-VOUS') && page.includes('nextEvent')],
 ['home essentials limited', page.includes('quickModules') && page.includes('Essentiel')],
 ['home invitation moved out', page.indexOf('CODE D’INVITATION') < page.indexOf('const renderHome') || page.indexOf('CODE D’INVITATION') > page.indexOf('const renderMore')],
 ['more hub grouped', page.includes('Sport & vie du collectif') && page.includes('Gestion & services') && page.includes('Organisation')],
 ['compact section header', page.includes('Back to organization home') && page.includes('gridTemplateColumns: "36px minmax(0,1fr)"')],
 ['workspace header simplified', page.includes('Espace organisation') && page.includes('navigateView("more")')],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`);if(pass)ok++;}
console.log(`${ok}/${checks.length} ORGANISATIONS UX V13`);
if(ok!==checks.length) process.exit(1);
