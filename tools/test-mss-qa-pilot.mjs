import test from 'node:test';
import assert from 'node:assert/strict';
import {isEligibleQA, summarize, report, MARKER} from './mss-qa-pilot.mjs';

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
