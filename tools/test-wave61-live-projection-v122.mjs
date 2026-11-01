import fs from "node:fs";

const play = fs.readFileSync(new URL("../src/pages/Wave61SharedPlay.tsx", import.meta.url), "utf8");

const checks = [
  ["BIM BAM BOUM live preview", 'data-bim-bam-boum-live-preview="1"'],
  ["BIM BAM BOUM dart labels", 'liveDartLabel(dart)'],
  ["SAUTE-MOUTONS live preview", 'data-saute-moutons-live-preview="1"'],
  ["SAUTE-MOUTONS projection", 'projected=Math.min(track,intended+(crossed?leapBonus:0))'],
  ["TROUPEAU EN DANGER live preview", 'data-troupeau-danger-live-preview="1"'],
  ["TROUPEAU defense projection", 'DÉFENSE {defense}/{pressure}'],
  ["SAUTE gets current throw", '<SauteMoutonsPanel state={state} currentThrow={currentThrow} accent={accent} />'],
  ["TROUPEAU gets current throw", '<TroupeauDangerPanel state={state} currentThrow={currentThrow} accent={accent} />'],
];
let failed = 0;
for (const [label, needle] of checks) {
  const ok = play.includes(needle);
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log("V122 live projection contract OK");
