// Fail-closed configuration parser, deliberately independent of Cloudflare and JWT packages.
export function accessConfig(env = {}) {
  const issuer = String(env.CF_ACCESS_TEAM_DOMAIN || '').trim().replace(/\/$/, '');
  const audience = String(env.CF_ACCESS_AUD || '').trim();
  const email = String(env.OWNER_EMAIL || '').trim().toLowerCase();
  if (!/^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.cloudflareaccess\.com$/.test(issuer)
      || !audience || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return {issuer, audience, email};
}
