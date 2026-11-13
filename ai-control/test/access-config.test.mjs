import test from 'node:test';
import assert from 'node:assert/strict';
import { accessConfig } from '../src/server/access-config.js';

const configured = {
  CF_ACCESS_TEAM_DOMAIN: 'https://example-team.cloudflareaccess.com/',
  CF_ACCESS_AUD: 'audience-for-test-only',
  OWNER_EMAIL: ' OWNER@example.com '
};

test('a valid Access configuration normalizes a strict issuer and owner', () => {
  assert.deepEqual(accessConfig(configured), {
    issuer: 'https://example-team.cloudflareaccess.com',
    audience: 'audience-for-test-only',
    email: 'owner@example.com'
  });
});
test('Access refuses missing identity, audience or issuer', () => {
  assert.equal(accessConfig({}), null);
  for (const field of Object.keys(configured)) {
    assert.equal(accessConfig({...configured, [field]: ''}), null, field);
  }
});
test('Access rejects untrusted or malformed issuers', () => {
  for (const issuer of [
    'http://example-team.cloudflareaccess.com',
    'https://attacker.example.com',
    'https://example-team.cloudflareaccess.com.evil.example',
    'https://*.cloudflareaccess.com',
    'https://example-team.cloudflareaccess.com/path',
    'https://example-team.cloudflareaccess.com?redirect=other',
    'https://user@example-team.cloudflareaccess.com'
  ]) {
    assert.equal(accessConfig({...configured, CF_ACCESS_TEAM_DOMAIN: issuer}), null, issuer);
  }
});
test('Access rejects malformed owner emails', () => {
  assert.equal(accessConfig({...configured, OWNER_EMAIL: 'not-an-email'}), null);
  assert.equal(accessConfig({...configured, OWNER_EMAIL: 'wrong name@example.com'}), null);
});
