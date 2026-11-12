import test from 'node:test';
import assert from 'node:assert/strict';
import {isEligibleQA, summarize, report, MARKER} from './mss-qa-pilot.mjs';
import {classifyLogEvidence} from './mss-qa-evidence.mjs';

const approvedQA = {
  number: 28, title: '[AGENT] Tester la creation et le suivi', state: 'open',
  body: '**Robot :** qa\n**Priorité :** normal', labels: [{name: 'mss:mission'}, {name: 'mss:approved'}]
};
test('an approved QA mission qualifies', () => assert.equal(isEligibleQA(approvedQA), true));
test('draft, blocked or non-QA issues are rejected', () => {
  assert.equal(isEligibleQA({...approvedQA, labels: [{name: 'mss:mission'}]}), false);
  assert.equal(isEligibleQA({...approvedQA, labels: [...approvedQA.labels, {name: 'mss:blocked'}]}), false);
  assert.equal(isEligibleQA({...approvedQA, body: '**Robot :** backup'}), false);
  assert.equal(isEligibleQA({...approvedQA, state: 'closed'}), false);
  assert.equal(isEligibleQA({...approvedQA, pull_request: {url: 'https://example.com'}}), false);
});
test('legacy QA pilot is eligible when owner approves', () => {
  assert.equal(isEligibleQA({state: 'open', number: 26,
    title: '[AGENT] PILOTE QA — auditer les échecs CI',
    body: '**Agent responsable :** MSS-TesteurQA (avec lecture indépendante par MSS-Auditeur)',
    labels: [{name: 'mss:approved'}]}), true);
});
test('run classification only reports evidence, not guesses', () => {
  const audit = summarize([
    {id: 1, status: 'completed', name: 'Quality Gate', conclusion: 'failure', html_url: 'https://github.com/example/actions/runs/1', head_sha: 'abcdef'},
    {id: 2, status: 'completed', name: 'Android', conclusion: 'success'},
    {id: 3, status: 'in_progress', name: 'Pending', conclusion: null},
    {id: 4, status: 'completed', name: 'MSS QA Agent — evidence', conclusion: 'failure'}
  ], {'1': [{name: 'typecheck', conclusion: 'failure', steps: [{name: 'Run typecheck', conclusion: 'failure'}]}]});
  assert.equal(audit.total, 2);
  assert.equal(audit.failures, 1);
  assert.equal(audit.success, 1);
  assert.equal(audit.failed[0].jobs[0].steps[0], 'Run typecheck');
  const out = report(approvedQA, audit, 'main', 'https://github.com/example/actions/runs/9');
  assert.ok(out.includes(MARKER));
  assert.ok(out.includes('Revue humaine'));
  assert.ok(out.includes('Quality Gate'));
});

test('incomplete or missing CI evidence is blocked, not a false PASS', () => {
  assert.equal(summarize([]).outcome, 'BLOQUÉ');
  assert.equal(summarize([{id: 1, status: 'in_progress', name: 'Quality Gate'}]).outcome, 'BLOQUÉ');
  assert.equal(summarize([{id: 1, status: 'completed', conclusion: 'skipped', name: 'Quality Gate'}]).outcome, 'BLOQUÉ');
  const mixed = summarize([
    {id: 1, status: 'completed', conclusion: 'success', name: 'Quality Gate'},
    {id: 2, status: 'in_progress', name: 'Android'}
  ]);
  assert.equal(mixed.outcome, 'BLOQUÉ');
  assert.equal(mixed.pending, 1);
  assert.ok(report(approvedQA, mixed, 'main', 'https://github.com/example/actions/runs/9').includes('BLOQUÉ'));
});
test('PASS and FAIL depend on completed conclusive CI results', () => {
  const success = summarize([{id: 1, status: 'completed', conclusion: 'success', name: 'Quality Gate'}]);
  const failure = summarize([{id: 2, status: 'completed', conclusion: 'failure', name: 'Android'}]);
  assert.equal(success.outcome, 'PASS');
  assert.equal(failure.outcome, 'FAIL');
});

test('job logs only produce allowlisted categories, never raw secrets', () => {
  const raw = 'Authorization: Bearer SECRET_SAMPLE_983\\nGARDE-FOU MÉDIA ANDROID DÉPASSÉ\\nerror TS2322';
  const diagnostic = classifyLogEvidence(raw);
  assert.equal(diagnostic.inspected, true);
  assert.deepEqual(diagnostic.categories.map(x => x.id), ['ANDROID_MEDIA_BUDGET', 'TYPESCRIPT']);
  assert.ok(!JSON.stringify(diagnostic).includes('SECRET_SAMPLE_983'));
});
test('the QA report carries signatures without leaking log contents', () => {
  const audit = summarize([{id: 3, name:'Android', status:'completed', conclusion:'failure', html_url:'https://github.com/test/actions/runs/3'}], {
    '3': [{id:5, name:'Android job', conclusion:'failure', qaEvidence:classifyLogEvidence('GARDE-FOU MÉDIA ANDROID DÉPASSÉ SECRET-should-not-appear'),steps:[]}]
  });
  const output = report(approvedQA, audit, 'main', 'https://github.com/example/actions/runs/9');
  assert.ok(output.includes('Budget médias Android dépassé'));
  assert.ok(output.includes('Vérification recommandée'));
  assert.ok(output.includes('ne pas relever le plafond'));
  assert.ok(!output.includes('SECRET-should-not-appear'));
});
