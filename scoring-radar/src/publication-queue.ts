import type { RadarEnv } from './domain';
import { listSalesCampaigns, listSalesDrafts } from './sales-agent';

export type PublicationChannel = 'facebook' | 'instagram' | 'community';
export type PublicationStatus = 'scheduled' | 'ready' | 'published' | 'cancelled';
export type PublicationJob = {
  id: string; campaign_id: string; opportunity_id: string; channel: PublicationChannel;
  variant: 'helpful' | 'concise' | 'promotional'; text: string; source_url: string;
  scheduled_at: string; status: PublicationStatus; approved_at: string; published_at: string | null;
  publication_url: string | null; created_at: string;
};

async function ensure(env: RadarEnv): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS radar_publication_jobs (
    id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, opportunity_id TEXT NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('facebook','instagram','community')),
    variant TEXT NOT NULL, text TEXT NOT NULL, source_url TEXT NOT NULL,
    scheduled_at TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('scheduled','ready','published','cancelled')),
    approved_at TEXT NOT NULL, published_at TEXT, publication_url TEXT, created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_radar_publication_schedule ON radar_publication_jobs(status, scheduled_at)').run();
}

export async function listPublicationJobs(env: RadarEnv): Promise<PublicationJob[]> {
  await ensure(env);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE radar_publication_jobs SET status='ready' WHERE status='scheduled' AND scheduled_at<=?").bind(now).run();
  const rows = await env.DB.prepare("SELECT * FROM radar_publication_jobs ORDER BY CASE status WHEN 'ready' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'published' THEN 2 ELSE 3 END,scheduled_at DESC LIMIT 150").all<PublicationJob>();
  return rows.results ?? [];
}

export async function schedulePublication(env: RadarEnv, input: Record<string, unknown>): Promise<PublicationJob> {
  const campaign_id = String(input.campaignId ?? '');
  const opportunity_id = String(input.opportunityId ?? '');
  const variant = String(input.variant ?? '');
  const channel = String(input.channel ?? '');
  if (!['helpful','concise','promotional'].includes(variant) || !['facebook','instagram','community'].includes(channel)) throw new Error('Choisir un canal et une variante valides.');
  const timestamp = Date.parse(String(input.scheduledAt ?? ''));
  if (!Number.isFinite(timestamp) || timestamp < Date.now() - 60_000 || timestamp > Date.now() + 90*24*60*60*1000) throw new Error('Choisir une date de publication entre maintenant et 90 jours.');
  const campaigns = await listSalesCampaigns(env);
  const campaign = campaigns.find(c => c.id === campaign_id);
  if (!campaign || campaign.status !== 'active') throw new Error('La campagne doit être active.');
  const drafts = await listSalesDrafts(env, 500);
  const draft = drafts.find(d => d.campaign_id === campaign_id && d.opportunity_id === opportunity_id);
  if (!draft || draft.verified_fit !== true || draft.match === 'low') throw new Error('Brouillon IA qualifié et vérifié requis.');
  const text = draft.variants[variant as keyof typeof draft.variants];
  if (!text || text.length < 25) throw new Error('Réponse trop courte ou absente.');
  // The scheduled queue is not connected to external publishing APIs.
  await ensure(env);
  const now = new Date().toISOString();
  const row: PublicationJob = {
    id: crypto.randomUUID(), campaign_id, opportunity_id,
    channel: channel as PublicationChannel, variant: variant as PublicationJob['variant'],
    text, source_url: draft.source_url, scheduled_at: new Date(timestamp).toISOString(),
    status: timestamp <= Date.now() ? 'ready' : 'scheduled',
    approved_at: now, published_at: null, publication_url: null, created_at: now
  };
  await env.DB.prepare(`INSERT INTO radar_publication_jobs
    (id,campaign_id,opportunity_id,channel,variant,text,source_url,scheduled_at,status,approved_at,published_at,publication_url,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(row.id,row.campaign_id,row.opportunity_id,row.channel,row.variant,row.text,row.source_url,row.scheduled_at,row.status,row.approved_at,null,null,row.created_at).run();
  return row;
}

export async function updatePublicationJob(env: RadarEnv, id: string, action: string, publicationUrl?: unknown): Promise<boolean> {
  await ensure(env);
  if (action === 'cancel') {
    const r = await env.DB.prepare("UPDATE radar_publication_jobs SET status='cancelled' WHERE id=? AND status IN ('scheduled','ready')").bind(id).run();
    return (r.meta.changes ?? 0) > 0;
  }
  if (action !== 'published') throw new Error('Action inconnue.');
  const url = String(publicationUrl ?? '').trim();
  if (url) {
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error('URL de publication invalide.'); }
    if (parsed.protocol !== 'https:') throw new Error('Lien HTTPS requis.');
  }
  const r = await env.DB.prepare("UPDATE radar_publication_jobs SET status='published',published_at=?,publication_url=? WHERE id=? AND status='ready'").bind(new Date().toISOString(),url||null,id).run();
  return (r.meta.changes ?? 0) > 0;
}
