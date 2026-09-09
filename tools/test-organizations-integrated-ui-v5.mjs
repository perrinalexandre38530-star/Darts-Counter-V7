import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const page=read('src/pages/OrganizationsPage.tsx');
const switcher=read('src/components/OrganizationWorkspaceSwitcher.tsx');
const checks=[
  ['personal badge hidden', switcher.includes('{active ? (') && switcher.includes('{activeBadge}')],
  ['home mirrors personal welcome', page.includes('Bienvenue') && page.includes('Vue globale') && page.includes('maxWidth: 520')],
  ['workspace duplicate top header removed', page.includes('if (workspaceMode)') && !page.includes('workspaceMode ? (active?.name')],
  ['organization identity card', page.includes('Touchez pour copier') && page.includes('Organisation prête')],
  ['section visual shell', page.includes('sectionHeader') && page.includes('borderRadius: 24') && page.includes('activeCover')],
  ['polished members teams agenda stats admin', page.includes('Rôles disponibles') && page.includes('Aucune équipe pour le moment') && page.includes('Nouvel événement') && page.includes('Vue globale organisation') && page.includes('Isolation des données')],
];
let ok=0;
for (const [name, pass] of checks) { console.log(`${pass?'OK ':'ERR'} ${name}`); if(pass) ok++; }
if(ok!==checks.length) process.exit(1);
console.log(`Organizations integrated UI V5: ${ok}/${checks.length} checks passed.`);
