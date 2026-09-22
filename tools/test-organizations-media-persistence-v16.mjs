import fs from "node:fs";

const profile = fs.readFileSync("src/components/OrganizationProfilePanel.tsx", "utf8");
const page = fs.readFileSync("src/pages/OrganizationsPage.tsx", "utf8");
const media = fs.readFileSync("src/lib/userMediaFallback.ts", "utf8");

const checks = [
  ["file helper exported", media.includes("export async function readImageFileAsDataUrl")],
  ["profile uses durable file data url", profile.includes("await readImageFileAsDataUrl(file)")],
  ["profile no object URL creation", !profile.includes("URL.createObjectURL(file)")],
  ["profile stores only successful logo key", profile.includes("if (!savedLogo) throw") && profile.includes("logoKey = nextLogoKey")],
  ["profile stores only successful cover key", profile.includes("if (!savedCover) throw") && profile.includes("coverKey = nextCoverKey")],
  ["profile keeps saved logo immediately visible", profile.includes("savedLogoUrl") && profile.includes("setSavedLogoUrl(savedLogo)")],
  ["profile keeps saved cover immediately visible", profile.includes("savedCoverUrl") && profile.includes("setSavedCoverUrl(savedCover)")],
  ["wizard uses durable file data url", page.includes("await readImageFileAsDataUrl(file)")],
  ["wizard no object URL creation", !page.includes("URL.createObjectURL(file)")],
  ["wizard rejects failed logo capture", page.includes("if (!savedLogo) throw")],
  ["wizard rejects failed cover capture", page.includes("if (!savedCover) throw")],
];
let pass = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (ok) pass++;
}
console.log(`\n${pass}/${checks.length} media persistence checks passed`);
if (pass !== checks.length) process.exit(1);
