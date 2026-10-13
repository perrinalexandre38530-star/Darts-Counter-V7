import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const config = read("src/pages/FootballConfig.tsx");
const configCss = read("src/styles/football-config.css");
const playCss = read("src/styles/football-play.css");

const checks = [
  ["7 guided steps", ["format", "style", "participants", "rules", "gameplay", "input", "ready"].every((id) => config.includes(`id: \"${id}\"`))],
  ["guided hero", config.includes("football-guided-hero") && configCss.includes(".football-guided-hero")],
  ["guided ready review", config.includes("PENDANT LE MATCH") && config.includes("football-ready-banner")],
  ["one-step-at-a-time guided blocks", config.includes("{guidedBlocks[step]}")],
  ["complete config retained", config.includes("CONFIGURATION COMPLÈTE") && config.includes("customPresetsBlock")],
  ["readable config typography", configCss.includes("font-size: clamp(18px") && configCss.includes("min-height: 116px")],
  ["gameplay instruction banner", playCss.includes("QUE DOIS-JE FAIRE ?")],
  ["mission-first hierarchy", playCss.includes('"command"') && playCss.includes('"field"') && playCss.includes('"input"')],
  ["large tactical targets", playCss.includes(".football-target-chip") && playCss.includes("font-size:16px")],
  ["target keypad highlight", playCss.includes(".football-pad-cell.is-target") && playCss.includes("var(--football-target-color")],
  ["larger football field", playCss.includes("min-height:172px")],
  ["landscape two-column layout", playCss.includes("minmax(460px,1.06fr)")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("DARTS FOOTBALL V10 UX regression failed:");
  for (const [name] of failed) console.error(` - ${name}`);
  process.exit(1);
}

console.log(`DARTS FOOTBALL V10 UX: OK (${checks.length} checks)`);
