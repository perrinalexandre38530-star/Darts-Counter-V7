import type { OpportunityRow } from './domain';
import type { SalesCampaign } from './sales-agent';

/** Conservative, zero-AI prefilter: never use a campaign for a clearly different sport. */
export type CampaignMatch = { compatible: boolean; score: number; reason: string };
type Topic = 'darts'|'petanque'|'pingpong'|'babyfoot'|'molkky'|'tossit'|'running'|'fitness'|'archery'|'billiards';
const TOPICS: Record<Topic, RegExp> = {
  darts: /\b(?:dart(?:s|board|counter)?|fl[eé]chettes?|dardos|freccette|dartscheibe)\b/i,
  petanque: /\b(?:p[eé]tanque|bocce|boules?|boccia)\b/i,
  pingpong: /\b(?:ping[ -]?pong|table[ -]?tennis|tennis de table|tischtennis)\b/i,
  babyfoot: /\b(?:baby[ -]?foot|foosball|table[ -]?soccer|futbol[ií]n|kicker|calcio balilla)\b/i,
  molkky: /\b(?:m[oö]lkky|molkky|quilles finlandaises)\b/i,
  tossit: /\btossit\b/i,
  running: /\b(?:running|course [aà] pied|jogging|trail running)\b/i,
  fitness: /\b(?:fitness|musculation|workout|gym|weightlift(?:ing)?)\b/i,
  archery: /\b(?:archery|tir [aà] l.arc|bogenschie[sß]en)\b/i,
  billiards: /\b(?:billiards?|billard|pool table|snooker)\b/i
};
function sportsIn(text: string): Set<Topic> {
  const found = new Set<Topic>();
  for (const [sport, pattern] of Object.entries(TOPICS) as Array<[Topic, RegExp]>) {
    if (pattern.test(text)) found.add(sport);
  }
  return found;
}
export function assessCampaignMatch(campaign: Pick<SalesCampaign,'name'|'pitch'|'verified_facts'|'audience'>, opportunity: Pick<OpportunityRow,'title'|'snippet'|'category'|'intent'|'score'>): CampaignMatch {
  const campaignSports = sportsIn(`${campaign.name} ${campaign.pitch} ${campaign.verified_facts} ${campaign.audience}`);
  const discussionSports = sportsIn(`${opportunity.title} ${opportunity.snippet} ${opportunity.category} ${opportunity.intent}`);
  // Multisport campaigns without a single focus can address different sports, but the
  // independent commercial-fit check still requires a real, actionable user question.
  if (campaignSports.size === 0) return {compatible:true,score:Math.min(100,Number(opportunity.score)||0),reason:'Campagne multisports sans sport exclusif'};
  if (discussionSports.size === 0) return {compatible:false,score:0,reason:'Sport de la discussion non identifiable pour cette campagne'};
  const overlap = [...discussionSports].filter(s=>campaignSports.has(s));
  if (!overlap.length) return {compatible:false,score:0,reason:'Cette campagne ne correspond pas au sport de la discussion'};
  const relevance = Math.max(0,Math.min(100,Number(opportunity.score)||0));
  return {compatible:true,score:Math.min(100,relevance + 5 + (overlap.length>1?2:0)),reason:`Sport correspondant : ${overlap.join(', ')}`};
}
