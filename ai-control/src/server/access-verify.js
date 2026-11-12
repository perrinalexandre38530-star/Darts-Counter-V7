// Shared owner-access verifier for the Cloudflare Pages middleware.
// The public JWK source is injected by the caller; production binds it to
// the validated Cloudflare Access team domain.
import { jwtVerify } from 'jose';

export async function verifyOwnerAssertion(token, jwks, config) {
  if (!config?.issuer || !config?.audience || !config?.email || !token || !jwks) {
    throw new Error('Access verification requires signed assertion and complete configuration.');
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.issuer,
    audience: config.audience,
    algorithms: ['RS256'],
  });
  return String(payload.email || '').trim().toLowerCase() === config.email;
}
