import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { verifyOwnerAssertion } from '../src/server/access-verify.js';

const conf = {
  issuer: 'https://mss-qa-test.cloudflareaccess.com',
  audience: 'test-mss-access-audience',
  email: 'owner@example.com',
};
let privateKey;
let jwks;
async function setup() {
  if (privateKey) return;
  const pair = await generateKeyPair('RS256', { extractable: true });
  privateKey = pair.privateKey;
  const publicJwk = await exportJWK(pair.publicKey);
  jwks = createLocalJWKSet({ keys: [{...publicJwk, alg: 'RS256', use: 'sig', kid: 'mss-test-key'}] });
}
async function sign({issuer = conf.issuer, audience = conf.audience, email = conf.email} = {}) {
  await setup();
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256', kid: 'mss-test-key' })
    .setIssuer(issuer).setAudience(audience)
    .setIssuedAt().setExpirationTime('5m').sign(privateKey);
}
test('valid signed Access assertion authorizes only configured owner', async () => {
  const token = await sign();
  assert.equal(await verifyOwnerAssertion(token, jwks, conf), true);
  assert.equal(await verifyOwnerAssertion(token, jwks, {...conf, email: 'different@example.com'}), false);
});
test('Access refuses wrong audience, issuer, missing assertion and altered signature', async () => {
  const audienceWrong = await sign({audience: 'some-other-app'});
  await assert.rejects(verifyOwnerAssertion(audienceWrong, jwks, conf));
  const issuerWrong = await sign({issuer: 'https://another.cloudflareaccess.com'});
  await assert.rejects(verifyOwnerAssertion(issuerWrong, jwks, conf));
  await assert.rejects(verifyOwnerAssertion('', jwks, conf));
  const valid = await sign();
  const parts = valid.split('.');
  parts[2] = parts[2][0] === 'A' ? 'B'+parts[2].slice(1) : 'A'+parts[2].slice(1);
  await assert.rejects(verifyOwnerAssertion(parts.join('.'), jwks, conf));
});
test('Access refuses expired JWT and unsigned algorithm', async () => {
  await setup();
  const expired = await new SignJWT({ email: conf.email })
    .setProtectedHeader({ alg: 'RS256', kid: 'mss-test-key' })
    .setIssuer(conf.issuer).setAudience(conf.audience)
    .setIssuedAt(-3600).setExpirationTime(-1800).sign(privateKey);
  await assert.rejects(verifyOwnerAssertion(expired, jwks, conf));
  const noSignature = Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')+'.'
    +Buffer.from(JSON.stringify({iss:conf.issuer,aud:conf.audience,email:conf.email})).toString('base64url')+'.';
  await assert.rejects(verifyOwnerAssertion(noSignature, jwks, conf));
});
