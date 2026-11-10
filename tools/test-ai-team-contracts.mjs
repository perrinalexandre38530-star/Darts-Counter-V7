import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const contentAt = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const expected = {
  "01-directeur": ["mission-routing"],
  "02-developpeur": ["darts-game-engine"],
  "03-debogueur": ["bug-root-cause"],
  "04-data-cloud": ["x01-history-stats", "cloud-backup-recovery"],
  "05-designer": ["ui-responsive-performance"],
  "06-mobile-tv": ["android-tizen-release"],
  "07-testeur-qa": ["independent-qa"],
  "08-auditeur": ["security-risk-audit"],
  "09-live-online": ["live-source-contracts"],
  "10-marketing": ["marketing-verified-content"],
  "11-monetisation": ["monetization-safety"],
  "12-integrateur": ["pr-safe-integration"],
};

assert.match(contentAt("AGENTS.md"), /History V4/);
assert.match(contentAt("docs/AI_COMPETENCIES.md"), /Certification des compétences/);

for (const [agent, skills] of Object.entries(expected)) {
  const agentPath = `.github/agents/${agent}.agent.md`;
  const agentText = contentAt(agentPath);
  assert.match(agentText, /^---\nname: MSS-/);
  assert.match(agentText, /## Expertise vérifiable/);
  assert.match(agentText, /docs\/AI_COMPETENCIES\.md/);
  for (const skill of skills) {
    const skillPath = `.github/skills/${skill}/SKILL.md`;
    const skillText = contentAt(skillPath);
    assert.ok(agentText.includes(skillPath), `${agent} missing skill reference ${skill}`);
    assert.match(skillText, /^---\nname: [a-z][a-z-]+\ndescription: "/);
    assert.match(skillText, /## Procédure obligatoire/);
    assert.match(skillText, /## Preuves exigées/);
    assert.match(skillText, /## Règles transversales/);
  }
  if (agent === "08-auditeur") {
    assert.match(agentText, /tools: \["read", "search"\]/);
    assert.doesNotMatch(agentText.split("---")[1] ?? "", /edit|execute/);
  }
}
console.log("✅ MSS AI TEAM: 12 profils, 13 skills et périmètres vérifiés.");
