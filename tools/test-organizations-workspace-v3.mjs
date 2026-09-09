import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const app = read("src/App.tsx");
const nav = read("src/components/BottomNav.tsx");
const switcher = read("src/components/OrganizationWorkspaceSwitcher.tsx");
const workspace = read("src/organizations/organizationWorkspace.ts");
const service = read("src/organizations/organizationService.ts");
const orgPage = read("src/pages/OrganizationsPage.tsx");
const teams = read("src/pages/petanque/PetanqueTeams.tsx");

const checks = [
  ["global workspace selector", switcher.includes("Espace personnel") && switcher.includes("organization_home")],
  ["persistent personal/org context", workspace.includes("msc_organization_workspace_v1") && workspace.includes("ORGANIZATION_WORKSPACE_EVENT")],
  ["organization-native routes", app.includes('"organization_members"') && app.includes('"organization_teams"') && app.includes('"organization_stats"')],
  ["organization bottom navigation", nav.includes("organizationMode") && nav.includes('label: tr("Membres"') && nav.includes('label: tr("Équipes"')],
  ["guided settings page becomes workspace", orgPage.includes("workspaceMode") && orgPage.includes("navigateView") && orgPage.includes("enterOrganizationWorkspace")],
  ["organization groups fused into shared Teams", service.includes("syncOrganizationGroupsToSharedTeams") && service.includes("syncedClubTeamId")],
  ["linked Teams are visibly identified", teams.includes("ORG LIÉE") && teams.includes("isOrganizationLinked")],
  ["linked Teams cannot be locally deleted", teams.includes("Gérer dans l’organisation") && teams.includes('go("organization_teams"')],
  ["organization hashes survive refresh", app.includes("#/organization/") && app.includes("organization_calendar")],
  ["no heavy organization binary storage", !service.includes("base64") && !service.includes("bytea")],
];

let ok = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? "OK " : "ERR"} ${name}`);
  if (pass) ok += 1;
}
if (ok !== checks.length) process.exit(1);
console.log(`Organizations workspace V3: ${ok}/${checks.length} checks passed.`);
