import type { RadarEnv } from './domain';
import { listPublicationJobs } from './publication-queue';

/** Facebook Page posts only. No profile, group, comment or private-message posting. */
const GRAPH = 'https://graph.facebook.com/v26.0';
const PAGE_ID_RE = /^\d{5,30}$/;

function credentials(env: RadarEnv): { pageId: string; token: string } | null {
  const pageId = String(env.META_FACEBOOK_PAGE_ID || '').trim();
  const token = String(env.META_FACEBOOK_PAGE_TOKEN || '').trim();
  return PAGE_ID_RE.test(pageId) && token.length > 30 ? { pageId, token } : null;
}

async function graphRequest(url: string, token: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || payload.error) {
      // Never echo access tokens or raw provider error bodies into the admin UI.
      const code = (payload.error && typeof payload.error === 'object') ? (payload.error as {code?:unknown}).code : response.status;
      throw new Error(`Meta a refusé la requête (code ${String(code ?? response.status)}). Vérifie les permissions et le jeton de Page.`);
    }
    return payload;
  } finally { clearTimeout(timeout); }
}

export function facebookConnectionState(env: RadarEnv): {configured: boolean; channel: string; note: string} {
  return { configured: Boolean(credentials(env)), channel: 'facebook_page', note: credentials(env)
    ? 'Configuration présente. Tester les droits avant toute publication.'
    : 'Non connecté : configurer META_FACEBOOK_PAGE_ID et META_FACEBOOK_PAGE_TOKEN dans Cloudflare.' };
}

export async function testFacebookConnection(env: RadarEnv): Promise<{ok:boolean;pageName:string;pageId:string}> {
  const cred = credentials(env);
  if (!cred) throw new Error('Page Facebook non connectée.');
  const data = await graphRequest(`${GRAPH}/${cred.pageId}?fields=id,name`, cred.token);
  if (String(data.id) !== cred.pageId) throw new Error('Le jeton ne correspond pas à la Page configurée.');
  return { ok: true, pageName: String(data.name || 'Page Facebook'), pageId: cred.pageId };
}

/** Explicitly user-triggered. Claims job once to avoid accidental duplicate social posts. */
export async function publishFacebookPageJob(env: RadarEnv, jobId: string): Promise<{postId:string;url:string}> {
  const cred = credentials(env);
  if (!cred) throw new Error('Connecte d’abord la Page Facebook Meta.');
  const jobs = await listPublicationJobs(env);
  const job = jobs.find(j => j.id === jobId);
  if (!job || job.channel !== 'facebook' || job.status !== 'ready') throw new Error('Seul un brouillon Facebook prêt et approuvé peut être envoyé.');
  if (!job.approved_at || job.text.length < 25 || job.text.length > 5000) throw new Error('Texte non approuvé ou longueur invalide.');
  // A prepared reply from a forum is NOT automatically a suitable Facebook Page post.
  // User must explicitly review and confirm the exact text in the admin UI.
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS radar_meta_dispatch (
    job_id TEXT PRIMARY KEY, state TEXT NOT NULL, provider_post_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  const now = new Date().toISOString();
  const claim = await env.DB.prepare(`INSERT OR IGNORE INTO radar_meta_dispatch (job_id,state,created_at,updated_at) VALUES (?,'sending',?,?)`)
    .bind(jobId, now, now).run();
  if (!claim.meta.changes) throw new Error('Envoi déjà lancé ou à vérifier : doublon bloqué.');
  try {
    const form = new URLSearchParams({ message: job.text, published: 'true' });
    const result = await graphRequest(`${GRAPH}/${cred.pageId}/feed`, cred.token, {
      method:'POST', headers: { 'Content-Type':'application/x-www-form-urlencoded' }, body: form.toString()
    });
    const postId = typeof result.id === 'string' ? result.id : '';
    if (!postId || !/^[\d_]+$/.test(postId)) throw new Error('Meta n’a pas confirmé l’identifiant de publication. Vérification manuelle requise.');
    const url = `https://www.facebook.com/${encodeURIComponent(postId)}`;
    await env.DB.prepare("UPDATE radar_meta_dispatch SET state='sent',provider_post_id=?,updated_at=? WHERE job_id=?")
      .bind(postId,new Date().toISOString(),jobId).run();
    await env.DB.prepare("UPDATE radar_publication_jobs SET status='published',published_at=?,publication_url=? WHERE id=? AND status='ready'")
      .bind(new Date().toISOString(),url,jobId).run();
    return {postId,url};
  } catch (error) {
    // No blind retry: network errors may occur after Meta accepted a post.
    await env.DB.prepare("UPDATE radar_meta_dispatch SET state='needs_review',updated_at=? WHERE job_id=?")
      .bind(new Date().toISOString(),jobId).run().catch(() => undefined);
    throw error;
  }
}
