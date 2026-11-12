import test from "node:test";
import assert from "node:assert/strict";
import { createReport, isMssMission, missionStatus } from "./ai-control-report.mjs";

test("Les missions MSS sont reconnues sans confondre les PR et les issues closes", () => {
  assert.equal(isMssMission({ number: 24, title: "[AI TEAM] Activation", state: "open", labels: [] }), true);
  assert.equal(isMssMission({ number: 25, title: "[MSS AI CONTROL] Dashboard", state: "open", labels: [] }), true);
  assert.equal(isMssMission({ number: 31, title: "[AGENT] QA", state: "open", labels: [] }), true);
  assert.equal(isMssMission({ number: 31, title: "[AGENT] QA", state: "open", pull_request: {} }), false);
  assert.equal(isMssMission({ number: 34, title: "[AGENT] QA", state: "closed", labels: [] }), false);
  assert.equal(isMssMission({ number: 32, title: "Autre demande", state: "open", labels: [{ name: "mss:mission" }] }), true);
});

test("Les statuts mettent les blocages avant les autres étiquettes", () => {
  assert.equal(missionStatus({ labels: [{ name: "mss:approved" }, { name: "mss:blocked" }] }), "BLOQUÉE");
  assert.equal(missionStatus({ labels: ["mss:review"] }), "REVUE HUMAINE");
  assert.equal(missionStatus({ labels: [{ name: "mss:running" }] }), "EN COURS");
  assert.equal(missionStatus({ labels: [] }), "À QUALIFIER");
});

test("Le rapport n'exécute aucune action et filtre les données des autres projets", () => {
  const report = createReport({
    repository: "owner/repo",
    generatedAt: "2026-11-10T12:00:00Z",
    issues: [
      { number: 24, state: "open", title: "[AI TEAM] Démarrage", labels: [{ name: "mss:approved" }] },
      { number: 28, state: "open", title: "Autre sujet", labels: [] },
      { number: 29, state: "open", title: "[AGENT] QA", labels: [{ name: "mss:blocked" }] },
    ],
    pulls: [{ number: 23, state: "open", draft: true, title: "chore(ai-team): profils" }],
    workflowRuns: [{ id: 901, name: "MSS Agent - verification non destructive", status: "completed", conclusion: "failure" }],
    agentCount: 12,
    skillCount: 13,
  });
  assert.equal(report.totals.missions, 2);
  assert.equal(report.totals.blocked, 1);
  assert.equal(report.totals.approved, 1);
  assert.ok(report.markdown.includes("https://github.com/owner/repo/issues/24"));
  assert.ok(report.markdown.includes("BROUILLON"));
  assert.ok(report.markdown.includes("ÉCHEC"));
  assert.ok(!report.markdown.includes("Autre sujet"));
  assert.equal(report.data.missions.length, 2);
});

test("Les titres non fiables sont assainis et les dépôts invalides refusés", () => {
  const report = createReport({
    repository: "owner/repo",
    generatedAt: "2026-11-10T12:00:00Z",
    issues: [{ number: 5, state: "open", title: "[AGENT] <img src=x onerror=alert(1)> | test", labels: [] }],
    pulls: [], workflowRuns: [], agentCount: 12, skillCount: 13,
  });
  assert.ok(report.markdown.includes("&lt;img"));
  assert.ok(!report.markdown.includes("<img"));
  assert.ok(report.markdown.includes("\\|"));
  assert.throws(() => createReport({ repository: "bad/repo?x", issues: [], pulls: [], workflowRuns: [], agentCount: 0, skillCount: 0, generatedAt: "test" }), /invalide/);
});
