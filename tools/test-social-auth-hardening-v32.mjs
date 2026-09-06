import fs from "node:fs";
const read = (p) => fs.readFileSync(p, "utf8");
const social = read("src/lib/socialAuth.ts");
const sw = read("public/sw.js");
const worker = read("cloudflare/multisports-social-oauth-worker-v7.js");
const checks = [
  ["Instagram modern scope", social.includes('scopes: "instagram_business_basic"')],
  ["Snapchat external id scope", social.includes("user.external_id")],
  ["Snapchat display name scope", social.includes("user.display_name")],
  ["SW no synthetic generic Network unavailable 503", !sw.includes('statusText: "Network unavailable"')],
  ["TikTok success code ok accepted", worker.includes('code !== "ok" && code !== "0"')],
  ["Snapchat GraphQL userinfo adapter", worker.includes('query: "{me{displayName externalId bitmoji{avatar}}}"')],
  ["Instagram userinfo adapter", worker.includes('INSTAGRAM_USERINFO_URL') && worker.includes('profile_picture_url')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`\n${checks.length} contrôles Social Auth V32 OK.`);
