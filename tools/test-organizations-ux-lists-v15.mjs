import fs from 'node:fs';

const files = {
  billing: fs.readFileSync('src/components/OrganizationBillingPanel.tsx', 'utf8'),
  communication: fs.readFileSync('src/components/OrganizationCommunicationPanel.tsx', 'utf8'),
  sponsors: fs.readFileSync('src/components/OrganizationSponsorsPanel.tsx', 'utf8'),
  venue: fs.readFileSync('src/components/OrganizationVenuePanel.tsx', 'utf8'),
  competitions: fs.readFileSync('src/components/OrganizationCompetitionsPanel.tsx', 'utf8'),
};

const checks = [
  ['billing form collapsed', files.billing.includes('const [formOpen, setFormOpen]') && files.billing.includes('NOUVELLE COTISATION') && files.billing.includes('canManage && formOpen')],
  ['communication composer collapsed', files.communication.includes('const [composerOpen, setComposerOpen]') && files.communication.includes('canPublish && !composerOpen')],
  ['sponsor form collapsed', files.sponsors.includes('const [formOpen, setFormOpen]') && files.sponsors.includes('AJOUTER UN PARTENAIRE') && files.sponsors.includes('canManage && formOpen')],
  ['sponsor detail progressive disclosure', files.sponsors.includes('expandedPartnerId') && files.sponsors.includes('expandedPartnerId === partner.id')],
  ['venue form collapsed', files.venue.includes('const [formOpen, setFormOpen]') && files.venue.includes('AJOUTER UNE INSTALLATION') && files.venue.includes('canManage && formOpen')],
  ['venue secondary actions menu', files.venue.includes('actionMenuId') && files.venue.includes('Plus d\'actions')],
  ['venue primary actions preserved', files.venue.includes('AFFICHER QR') && files.venue.includes('JOUER ICI')],
  ['competition fixture form collapsed', files.competitions.includes('fixtureFormOpen') && files.competitions.includes('AJOUTER UNE RENCONTRE')],
  ['competition creation remains screen-based', files.competitions.includes('screen === "list"') && files.competitions.includes('screen === "create"') && files.competitions.includes('screen === "detail"')],
  ['no supabase schema change required', !Object.values(files).some((text) => text.includes('create table'))],
];

let passed = 0;
for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`FAIL ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
    passed += 1;
  }
}
console.log(`${passed}/${checks.length} ORGANISATIONS UX LISTS V15`);
if (passed !== checks.length) process.exit(1);
