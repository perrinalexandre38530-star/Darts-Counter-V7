import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const panel=read('src/components/OrganizationProfilePanel.tsx');
const page=read('src/pages/OrganizationsPage.tsx');
const service=read('src/organizations/organizationService.ts');
const members=read('src/components/OrganizationMembersPanel.tsx');
const calendar=read('src/components/OrganizationCalendarPanel.tsx');
const checks=[
 ['profile has persistent edit action', panel.includes('MODIFIER LA PAGE DU CLUB / ORGANISME') && panel.includes('startEdit("identity")')],
 ['logo direct upload available', panel.includes('organizationLogoMediaKey') && panel.includes('logoInputRef') && panel.includes('+ AJOUTER UN LOGO')],
 ['cover direct upload available', panel.includes('organizationCoverMediaKey') && panel.includes('coverInputRef') && panel.includes('AJOUTER UNE PHOTO DE COUVERTURE')],
 ['visual editor is dedicated section', panel.includes('type EditSection = "identity" | "contact" | "visuals"') && panel.includes('Logo et couverture')],
 ['media stays outside supabase', panel.includes('captureUserMediaFallback') && panel.includes('Supabase ne reçoit que les références des médias')],
 ['identity update uses secured rpc wrapper', panel.includes('updateOrganizationIdentity') && service.includes('ms_org_update_identity')],
 ['profile update persists media keys only', panel.includes('updateOrganizationProfile') && service.includes('p_logo_media_key') && service.includes('p_cover_media_key')],
 ['home exposes direct edit button', page.includes('Modifier la page de l’organisation') && page.includes('navigateView("profile")')],
 ['more labels page settings clearly', page.includes('Ma page & réglages') && page.includes('ids: ["profile", "admin", "offers"]')],
 ['duplicate identity current declaration removed', !service.includes('const current = state.organizations.find((item) => item.id === organizationId);\n  const current = state.organizations.find((item) => item.id === organizationId);')],
 ['member invite form collapsed by default', members.includes('inviteOpen') && members.includes('canManage && inviteOpen')],
 ['calendar editor collapsed by default', calendar.includes('showEditor') && calendar.includes('AJOUTER UN ÉVÉNEMENT') && calendar.includes('canCreate && showEditor')],
];
let ok=0;
for(const [name,pass] of checks){console.log(`${pass?'PASS':'FAIL'} ${name}`); if(pass) ok++;}
console.log(`${ok}/${checks.length} ORGANISATIONS PROFILE UX V14`);
if(ok!==checks.length) process.exit(1);
