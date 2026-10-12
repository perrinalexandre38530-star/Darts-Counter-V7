import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const profiles = read("src/pages/Profiles.tsx");
const stable = read("src/hooks/useStableProfiles.ts");

const checks = [
  ["MON PROFIL prefers store active profile", profiles.includes("if (rawActive) return rawActive;")],
  ["stale account binding is repaired to store active", profiles.includes("bindCanonicalAccountProfileId(authUid, rawActive.id)")],
  ["profile name wins over stale private nickname", profiles.indexOf("const n = String((active as any)?.name || \"\").trim();") < profiles.indexOf("const nick = String(pi?.nickname || \"\").trim();")],
  ["private nickname form is seeded from active profile name", profiles.includes("nickname: String((active as any)?.name || pi.nickname || \"\")")],
  ["private info memo reacts to active profile name", profiles.includes("(active as any)?.name,\n    (active as any)?.privateInfo?.nickname")],
  ["profile stats aggregation starts immediately in MON PROFIL", profiles.includes("view === \"me\" && !!active?.id")],
  ["stable profile signature tracks private nickname", stable.includes("p?.privateInfo?.nickname || \"\"")],
  ["stable profile signature tracks stats", stable.includes("p?.stats?.bestVisit") && stable.includes("p?.stats?.games")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`✅ MON PROFIL source alignment invariants: ${checks.length}/${checks.length}`);
