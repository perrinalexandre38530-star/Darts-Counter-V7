// MSS AI CONTROL — état en lecture seule. Aucune action GitHub d'écriture.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function escapeMd(value) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[char])
    .replace(/[|]/g, "\\|")
    .replace(/([\\`*_[\]])/g, "\\$1")
    .slice(0, 140);
}

function labelsOf(issue) {
  return (Array.isArray(issue.labels) ? issue.labels : [])
    .map((label) => typeof label === "string" ? label : label?.name)
    .filter(Boolean)
    .map((name) => name.toLowerCase());
}

export function missionStatus(issue) {
  const labels = labelsOf(issue);
  const has = (tag) => labels.includes(tag);
  if (has("mss:blocked")) return "BLOQUÉE";
  if (has("mss:review")) return "REVUE HUMAINE";
  if (has("mss:running")) return "EN COURS";
  if (has("mss:approved")) return "APPROUVÉE";
  if (has("mss:queued")) return "EN ATTENTE";
  if (has("mss:draft")) return "BROUILLON";
  return "À QUALIFIER";
}

export function isMssMission(issue) {
  if (!issue || issue.pull_request || issue.state !== "open") return false;
  const title = String(issue.title ?? "");
  return /^(\[AI TEAM\]|\[MSS AI CONTROL\]|\[AGENT\])/i.test(title)
    || labelsOf(issue).includes("mss:mission");
}

function friendlyRun(run) {
  if (run.status !== "completed") return "EN COURS";
  if (run.conclusion === "success") return "OK";
  if (run.conclusion === "failure") return "ÉCHEC";
  if (run.conclusion === "cancelled") return "ANNULÉ";
  if (run.conclusion === "skipped") return "IGNORÉ";
  return String(run.conclusion ?? "INCONNU").toUpperCase();
}

export function createReport({ repository, issues, pulls, workflowRuns, agentCount, skillCount, generatedAt }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("GITHUB_REPOSITORY invalide");
  const missions = issues.filter(isMssMission).sort((a, b) => (b.number ?? 0) - (a.number ?? 0));
  const displayedPrs = pulls.filter((pr) => pr.state === "open" && /agent|ai.team|ai.control|mss/i.test(pr.title ?? "")).slice(0, 12);
  const uniqueRuns = [];
  const seen = new Set();
  for (const run of workflowRuns) {
    const name = String(run.name ?? "");
    if (!/mss agent|quality gate|android debug/i.test(name) || seen.has(name)) continue;
    seen.add(name);
    uniqueRuns.push(run);
    if (uniqueRuns.length >= 8) break;
  }
  const countBy = (status) => missions.filter((i) => missionStatus(i) === status).length;
  const totals = { missions: missions.length, blocked: countBy("BLOQUÉE"), running: countBy("EN COURS"), review: countBy("REVUE HUMAINE"), approved: countBy("APPROUVÉE"), agents: agentCount, skills: skillCount };
  const lines = [
    "# MSS AI CONTROL — état du projet",
    "",
    `Généré le ${escapeMd(generatedAt)} (UTC). **Rapport en lecture seule : aucun agent IA lancé, aucune fusion ni publication.**`,
    "",
    `**Agents configurés :** ${agentCount} · **Compétences définies :** ${skillCount} · **Missions ouvertes :** ${missions.length}`,
    `**En cours :** ${totals.running} · **À valider :** ${totals.review} · **Bloquées :** ${totals.blocked} · **Approuvées :** ${totals.approved}`,
    "",
    "## Missions (Issues GitHub)",
    "",
    "| Mission | État |",
    "|---|---|",
    ...missions.slice(0, 30).map((issue) => `| [#${issue.number} — ${escapeMd(issue.title)}](https://github.com/${repository}/issues/${issue.number}) | ${missionStatus(issue)} |`),
    ...(missions.length ? [] : ["| Aucune mission MSS trouvée | — |"]),
    "",
    "## Propositions de changement (Pull Requests)",
    "",
    "| PR | État |",
    "|---|---|",
    ...displayedPrs.map((pr) => `| [#${pr.number} — ${escapeMd(pr.title)}](https://github.com/${repository}/pull/${pr.number}) | ${pr.draft ? "BROUILLON" : "OUVERTE"} |`),
    ...(displayedPrs.length ? [] : ["| Aucune PR de l'équipe IA ouverte | — |"]),
    "",
    "## Derniers contrôles automatiques",
    "",
    "| Workflow | Résultat |",
    "|---|---|",
    ...uniqueRuns.map((run) => `| [${escapeMd(run.name)}](https://github.com/${repository}/actions/runs/${run.id}) | ${friendlyRun(run)} |`),
    ...(uniqueRuns.length ? [] : ["| Aucun résultat disponible | — |"]),
    "",
    "## Consignes",
    "",
    "Une étiquette APPROUVÉE n'est pas une autorisation de fusion. Les missions n'exécutent **aucun code IA** dans ce rapport. Une erreur CI doit être diagnostiquée plutôt que masquée. La synthèse est limitée aux 100 dernières issues ouvertes, 100 PR ouvertes et 50 workflows récents interrogés.",
    "",
  ];
  return { markdown: lines.join("\n"), totals, data: { generatedAt, repository, totals, missions: missions.map((i) => ({ number: i.number, title: String(i.title), status: missionStatus(i) })), prs: displayedPrs.map((p) => ({ number: p.number, title: String(p.title), draft: Boolean(p.draft) })), runs: uniqueRuns.map((r) => ({ id: r.id, name: r.name, status: friendlyRun(r) })) } };
}

function countLocalAgents(root) {
  const agentsDir = path.join(root, ".github", "agents");
  const skillsDir = path.join(root, ".github", "skills");
  const agents = fs.readdirSync(agentsDir).filter((name) => name.endsWith(".agent.md")).length;
  const skills = fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(path.join(skillsDir, entry.name, "SKILL.md"))).length;
  return { agents, skills };
}

async function readGithubApi(endpoint) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN absent (nécessaire pour Actions en lecture seule)");
  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "mss-ai-control-report" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} pour ${endpoint}`);
  return res.json();
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("GITHUB_REPOSITORY manquant ou invalide");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const [issues, pulls, actions] = await Promise.all([
    readGithubApi(`/repos/${repository}/issues?state=open&per_page=100`),
    readGithubApi(`/repos/${repository}/pulls?state=open&per_page=100`),
    readGithubApi(`/repos/${repository}/actions/runs?per_page=50`),
  ]);
  const counts = countLocalAgents(root);
  const output = createReport({ repository, issues, pulls, workflowRuns: actions.workflow_runs ?? [], agentCount: counts.agents, skillCount: counts.skills, generatedAt: new Date().toISOString() });
  const artifactDir = path.join(root, "ai-control-report-output");
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, "report.md"), output.markdown, "utf8");
  fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(output.data, null, 2) + "\n", "utf8");
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, output.markdown + "\n");
  console.log(`MSS AI CONTROL : ${output.totals.missions} mission(s), ${output.totals.agents} agents, ${output.totals.skills} skills, aucune écriture distante.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`MSS AI CONTROL : ${error.message}`); process.exitCode = 1; });
}
