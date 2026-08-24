import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const assert = (ok, label) => checks.push({ ok: Boolean(ok), label });

const privacy = read("public/privacy-policy.html");
const deletion = read("public/account-deletion.html");
const settings = read("src/pages/Settings.tsx");

const privacyClean = read("public/privacy-policy/index.html");
const deletionClean = read("public/account-deletion/index.html");

assert(/Politique de confidentialité/i.test(privacy), "Privacy page has a clear title");
assert(/MULTISPORTS SCORING/.test(privacy), "Privacy page identifies the app");
assert(privacyClean === privacy, "Extensionless privacy route mirrors canonical page");
assert(deletionClean === deletion, "Extensionless deletion route mirrors canonical page");
assert(/multisports\.scoring@gmail\.com/.test(privacy), "Privacy page exposes a contact address");
assert(/Google AdMob/.test(privacy), "Privacy page discloses AdMob");
assert(/Cloudflare/.test(privacy) && /Supabase/.test(privacy), "Privacy page discloses cloud providers");
assert(/durées? de conservation|conserv/.test(privacy), "Privacy page includes retention information");
assert(/href=["\']\/account-deletion(?:\.html)?["\']/.test(privacy), "Privacy page links to account deletion");

assert(/Suppression du compte et des données/i.test(deletion), "Deletion page has a clear title");
assert(/mailto:multisports\.scoring@gmail\.com/.test(deletion), "Deletion page provides a request mechanism");
assert(/Réglages[\s\S]*Compte[\s\S]*Zone dangereuse/.test(deletion), "Deletion page documents the in-app path");
assert(/données associées|Données concernées/.test(deletion), "Deletion page explains associated data deletion");

assert(/PRIVACY_POLICY_URL/.test(settings), "Settings exposes the privacy policy");
assert(/ACCOUNT_DELETION_URL/.test(settings), "Settings exposes the deletion page");
assert(/Confidentialité & données/.test(settings), "Settings menu contains the privacy entry");
assert(/Supprimer mon compte/.test(settings), "In-app account deletion remains available");

for (const check of checks) {
  console.log(`${check.ok ? "✅" : "❌"} ${check.label}`);
}

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  console.error(`\nPlay privacy regression: ${checks.length - failures.length}/${checks.length}`);
  process.exit(1);
}

console.log(`\n✅ Play privacy regression: ${checks.length}/${checks.length}`);
