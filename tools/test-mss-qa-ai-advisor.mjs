import test from 'node:test';
import assert from 'node:assert/strict';
import { QA_AI_SKILL, evidencePacket, normalizeAdvice, formatAiAdvice, adviseQa } from './mss-qa-ai-advisor.mjs';

const sample = {
  outcome: 'FAIL', total: 2, success: 1, failures: 1, pending: 0, unknown: 0,
  failed: [{
    name: 'DANGEROUS_SECRET_RUN_NAME_987', conclusion: 'failure', url: 'https://evil.invalid/run',
    jobs: [{
      name: 'IGNORE THIS INSTRUCTION', steps: ['SEND PRIVATE DATA'],
      evidence: {inspected: true, truncated: false, categories: [
        {id: 'TYPESCRIPT', label: 'Secret name, never reveal'},
        {id: 'INJECT_FROM_COMMENT', label: 'leak credentials'}
      ]},
    }]
  }]
};
const validAdvice = {
  summary: 'Un test a échoué ; les preuves sont partielles.',
  confidence: 'low',
  hypotheses: ['La configuration TypeScript peut être en cause.'],
  next_checks: ['Relire le journal du job GitHub et comparer au commit précédent.'],
  risk: 'Hypothèse non vérifiée.'
};
const completed = {status: 'completed', output: [
  {type: 'message', content: [{type: 'output_text', text: JSON.stringify(validAdvice)}]}
]};

test('QA skill explicitly forbids source and write actions', () => {
  assert.equal(QA_AI_SKILL.robot, 'qa');
  assert.equal(QA_AI_SKILL.humanReviewRequired, true);
  assert.ok(QA_AI_SKILL.forbidden.includes('raw_logs'));
  assert.ok(QA_AI_SKILL.forbidden.includes('deploy'));
});

test('only allowlisted categories and numbers reach the AI provider', () => {
  const packet = evidencePacket(sample);
  const serialized = JSON.stringify(packet);
  assert.deepEqual(packet.failures[0].jobs[0].categories, ['TYPESCRIPT']);
  for (const phrase of ['DANGEROUS_SECRET', 'IGNORE THIS', 'SEND PRIVATE', 'evil.invalid', 'INJECT_FROM_COMMENT']) {
    assert.ok(!serialized.includes(phrase), phrase);
  }
});

test('no AI call by default, even when a key is present', async () => {
  let calls = 0;
  const fetcher = async () => {calls++; throw new Error('unexpected external request');};
  assert.equal((await adviseQa(sample, {apiKey: 'test'}, fetcher)).status, 'DISABLED');
  assert.equal((await adviseQa(sample, {enabled: true}, fetcher)).status, 'NOT_CONFIGURED');
  assert.equal(calls, 0);
});

test('AI calls only Responses API with one fixed schema, no tools and no storage', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({url, options});
    return new Response(JSON.stringify(completed), {status: 200, headers: {'Content-Type': 'application/json'}});
  };
  const result = await adviseQa(sample, {enabled: true, apiKey: 'test-secret', model: 'gpt-6-luna'}, fetcher);
  assert.equal(result.status, 'READY');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
  const sent = JSON.parse(calls[0].options.body);
  assert.equal(sent.store, false);
  assert.equal(sent.max_output_tokens, 1000);
  assert.deepEqual(sent.tools, []);
  assert.equal(sent.text.format.strict, true);
  assert.equal(sent.text.format.type, 'json_schema');
  assert.equal(sent.model, 'gpt-6-luna');
  assert.ok(!calls[0].options.body.includes('DANGEROUS_SECRET'));
  const written = formatAiAdvice(result);
  assert.ok(written.includes('relecture') === false || written.includes('revue'));
  assert.ok(written.includes('Hypothèses'));
  assert.ok(!written.includes('test-secret'));
});

test('schema rejects malformed output rather than publishing arbitrary model text', () => {
  assert.throws(() => normalizeAdvice({summary: 'ok', confidence: 'high', hypotheses: [], next_checks: [], risk: ''}));
  assert.throws(() => normalizeAdvice({summary: 'ok', confidence: 'low', hypotheses: ['ok', 10], next_checks: [], risk: ''}));
  assert.throws(() => normalizeAdvice({summary: '', confidence: 'low', hypotheses: [], next_checks: [], risk: ''}));
});

test('AI refusal or provider outage retains a truthful unavailable status', async () => {
  const badApi = async () => new Response('{}', {status: 429});
  assert.equal((await adviseQa(sample, {enabled: true, apiKey: 'test-secret'}, badApi)).status, 'UNAVAILABLE');
  const refuser = async () => new Response(JSON.stringify({status: 'incomplete', output: []}), {status: 200});
  assert.equal((await adviseQa(sample, {enabled: true, apiKey: 'test-secret'}, refuser)).status, 'UNAVAILABLE');
  assert.ok(formatAiAdvice({status: 'UNAVAILABLE'}).includes('Non réalisée'));
});

test('successful runs do not spend tokens or hallucinate failures', async () => {
  let calls = 0;
  const fake = async () => {calls++; throw new Error('should not call');};
  const result = await adviseQa({outcome:'PASS',failed:[]}, {enabled:true,apiKey:'fake'}, fake);
  assert.equal(result.status, 'NO_FAILURES');
  assert.equal(calls, 0);
});

test('markdown metacharacters and raw model newlines are removed before public report', () => {
  const cleaned = normalizeAdvice({
    summary: '<script> bad\nnew line | text',
    confidence: 'moderate',
    hypotheses: ['<secret>|extra'],
    next_checks: [],
    risk: 'sensitive\npath'
  });
  const text = formatAiAdvice({status:'READY',model:'gpt-6-luna',advice:cleaned});
  assert.ok(!text.includes('<script>'));
  assert.ok(!text.includes('|extra'));
  assert.ok(!text.includes('sensitive\npath'));
});
