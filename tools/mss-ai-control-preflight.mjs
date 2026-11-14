#!/usr/bin/env node
/** Single entry point for local MAIN + QA checks, strictly read-only. */
import { execFileSync, spawnSync } from 'node:child_process';
import { evaluatePreflight, qaVerdict } from './mss-ai-control-preflight-core.mjs';

const json = process.argv.includes('--json');
const noTests = process.argv.includes('--sync-only');
function git(args) {
  try { return execFileSync('git', args, { encoding:'utf8', timeout:15000, stdio:['ignore','pipe','pipe'] }).trim(); }
  catch { return null; }
}
const branch = git(['symbolic-ref','--short','HEAD']);
const localSha = git(['rev-parse','HEAD']);
const status = git(['status','--porcelain=v1','--untracked-files=normal']);
const remoteLine = git(['ls-remote','origin','refs/heads/main']);
const remoteSha = remoteLine?.match(/^([0-9a-f]{40})\s/)?.[1] ?? null;
const preflight = evaluatePreflight({ branch, localSha, remoteSha, dirty: status !== null && status.length > 0, statusKnown: status !== null, gitKnown: Boolean(branch || localSha || status !== null) });
const tests = [];
if (preflight.checks && !noTests) {
  const suites = [
    ['Sentinelle MAIN', 'tools/test-mss-main-guard.mjs'],
    ['Précontrôle V2', 'tools/test-mss-ai-control-preflight.mjs'],
    ['Pilote QA', 'tools/test-mss-qa-pilot.mjs'],
    ['Conseiller IA QA (hors réseau)', 'tools/test-mss-qa-ai-advisor.mjs'],
    ['Auditeur QA', 'tools/test-mss-qa-auditor.mjs'],
  ];
  for (const [name, filename] of suites) {
    const r = spawnSync(process.execPath, ['--test',filename], { encoding:'utf8',timeout:60000, maxBuffer:2*1024*1024 });
    tests.push({ name, exitCode: r.status, error: r.error?.message || (r.signal ? `signal ${r.signal}` : null) });
  }
}
const qa = noTests && preflight.ok ? { status: 'NON_EXECUTE', tests: [], errors: [] } : qaVerdict(preflight,tests);
const result = { schema: 'mss-ai-control-preflight-v2', preflight, qa, scope: noTests ? 'sync-only' : 'sync-and-qa', performedMutations: false };
if (json) console.log(JSON.stringify(result,null,2));
else {
  console.log(`MSS AI CONTROL V2 — ${qa.status}`);
  console.log(`MAIN local=${localSha?.slice(0,12)||'?'} GitHub=${remoteSha?.slice(0,12)||'?'} branche=${branch||'?'}`);
  for (const error of preflight.errors) console.log(`BLOCAGE : ${error}`);
  for (const action of preflight.actions) console.log(`À FAIRE : ${action}`);
  for (const t of tests) console.log(`${t.exitCode === 0 && !t.error ? 'PASS' : 'FAIL'} — ${t.name}${t.error ? ' : ' + t.error : ''}`);
  console.log('Aucun push, merge, reset, checkout, commit ou déploiement effectué.');
}
process.exitCode = qa.status === 'PASS' || (noTests && preflight.ok) ? 0 : 1;
