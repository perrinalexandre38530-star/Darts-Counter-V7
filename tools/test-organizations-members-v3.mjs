import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const service = read('src/organizations/organizationService.ts');
const page = read('src/pages/OrganizationsPage.tsx');
const panel = read('src/components/OrganizationMembersPanel.tsx');
const inbox = read('src/components/OrganizationInvitationsInbox.tsx');
const migration = read('supabase/migrations/20260912233500_partnership_organizations_members_v3.sql');
const checks = [
  ['member RPC client', service.includes('ms_org_list_members') && service.includes('ms_org_set_member_role') && service.includes('ms_org_set_member_status')],
  ['group assignment client', service.includes('ms_org_set_group_member')],
  ['targeted invitations client', service.includes('ms_org_invite_user') && service.includes('ms_org_list_my_invitations') && service.includes('ms_org_respond_invitation')],
  ['secure code rotation client', service.includes('ms_org_rotate_join_code')],
  ['functional members UI', panel.includes('Inviter un utilisateur MSS') && panel.includes('AFFECTATION AUX ÉQUIPES / GROUPES') && panel.includes('SUSPENDRE')],
  ['received invitations UI', inbox.includes('INVITATIONS REÇUES') && inbox.includes('ACCEPTER') && inbox.includes('REFUSER')],
  ['organization page integration', page.includes('<OrganizationMembersPanel') && page.includes('<OrganizationInvitationsInbox')],
  ['relational member tables', migration.includes('ms_organization_group_members') && migration.includes('ms_organization_invitations')],
  ['role protections', migration.includes('OWNER_PROTECTED') && migration.includes('CANNOT_MANAGE_ROLE')],
  ['sensitive writes RPC-only', migration.includes('revoke insert,update,delete on public.ms_organization_members from authenticated')],
  ['no heavy media/stat storage', !/bytea|base64|image_data|photo_data|stats_blob/i.test(migration)],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'OK' : 'FAIL'}  ${name}`); if (!ok) failed++; }
if (failed) process.exit(1);
console.log(`Organizations members V3: ${checks.length}/${checks.length} checks passed.`);
