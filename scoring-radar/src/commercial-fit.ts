import type { OpportunityRow } from './domain';
import { intentShieldDecision } from './intent-shield';

/** Independent gate: AI relevance scores are NOT proof of a user's request. */
export type CommercialFit = { actionable: boolean; reason: string };
const PUBLISHER_OR_PROMO = /(?:\bcrossword\b|\bnewsletter\b|\bpress release\b|\bwatch (?:the |our )?(?:video|highlights)\b|\bfollow (?:us|our page)\b|\bsubscribe (?:to|now)\b|\bdownload (?:our|the) app\b|\bnew (?:app|video|post) (?:out|released)\b|\bstream(?:ing)?\s+(?:on|live)\b|\b(?:job|hiring|recruitment|vacancy)\s+(?:posting|opening|offer)\b|\bcerc(?:o|a) (?:master|giocator[ei])\b|\bd&d\b|\bdungeons?\s*(?:and|&)\s*dragons?\b)/i;
const ASKING = /(?:\b(?:is there|anyone know|any suggestions|any recommendations|can anyone recommend|could (?:someone|anyone) recommend|what (?:app|do you use)|which (?:app|tool)|how do (?:i|you|we)|i(?:'m| am) looking for|i need (?:a|an|some)|looking for (?:an? )?(?:app|tool|way)|recommend (?:an? )?(?:app|tool)|alternative to)\b|\b(?:je cherche|quel(?:le)? appli|quelle application|vous (?:utilisez|conseillez)|comment (?:compter|suivre)|besoin d'une appli|un outil pour)\b|\b(?:busco|necesito|recomiendan|qué app|que app|cómo llevar)\b|\b(?:suche|welche app|empfehlen|kennt jemand)\b|\b(?:cerco un'app|quale app|consigliate|come tenere)\b|\b(?:procuro|qual aplicativo|recomendam)\b|\b(?:ik zoek|welke app|aanbevelen)\b|\b(?:letar efter|vilken app|leter etter|hvilken app|anbefaler)\b)/i;
const NEED = /(?:\b(?:scor(?:e|es|ing|er|ecard)|scoreboard|scorekeeper|scorecounter|points?|stats?|statistics|leaderboard|track(?:ing)?|record(?:ing)?|count(?:er|ing)?|training|practice|tournament|match(?:es)?|league(?:s)?)\b|\b(?:compte(?:r|ur)|points?|scores?|statistiques?|classement|entra[iî]nement|parties?|tournoi|suivi)\b|\b(?:puntuaci[oó]n|marcador|estad[ií]sticas|contar puntos|puntaje)\b|\b(?:punkte|z[aä]hlen|statistik|spielstand)\b|\b(?:punteggio|segnapunti|statistiche)\b|\b(?:pontua[cç][aã]o|placar)\b)/i;
const SPORTS = /(?:\b(?:darts?|dartcounter|p[eé]tanque|bocce|ping[ -]?pong|table tennis|football|foosball|baby[ -]?foot|table soccer|m[oö]lkky|tossit|archery|bowling|sports?|multisport|running|fitness|club)\b|\b(?:fl[eé]chettes?|tir [aà] l'arc|billard|p[eé]tanque|babyfoot)\b|\b(?:dardos|dardos|futbol[ií]n|futebol|freccette|tischtennis)\b)/i;
const CONTENT_HOSTS = /(?:^|\.)(?:tiktok\.com|youtube\.com|youtu\.be|instagram\.com|pinterest\.com)$/i;

export function assessCommercialFit(row: Pick<OpportunityRow, 'source_url' | 'title' | 'snippet'>): CommercialFit {
  const source = String(row.source_url || '');
  const text = `${row.title || ''}\n${row.snippet || ''}`.slice(0, 2500);
  let host = '';
  try { host = new URL(source).hostname.toLowerCase(); } catch { return {actionable:false,reason:'Adresse de la source non vérifiable'}; }
  if (!/^https?:\/\//i.test(source)) return {actionable:false,reason:'Adresse de source invalide'};
  if (CONTENT_HOSTS.test(host)) return {actionable:false,reason:'Publication ou vidéo : pas une demande personnelle vérifiée'};
  if (PUBLISHER_OR_PROMO.test(text)) return {actionable:false,reason:'Article, promotion ou discussion sans demande de scoring exploitable'};
  const shield = intentShieldDecision(row as Pick<OpportunityRow,'title'|'snippet'|'source_url'>);
  if (shield.reject) return {actionable:false,reason:'Source commerciale ou non exploitable'};
  if (!shield.userSignal || !ASKING.test(text)) return {actionable:false,reason:'Aucune question ou demande personnelle clairement exprimée'};
  if (!NEED.test(text)) return {actionable:false,reason:'Aucun besoin précis de scores, statistiques ou entraînement'};
  if (!SPORTS.test(text) && !/\b(?:scoring app|score tracker|score counter|scorekeeping app)\b/i.test(text)) {
    return {actionable:false,reason:'Lien avec les sports compatibles non établi'};
  }
  return {actionable:true,reason:'Demande sportive à vérifier dans la discussion originale'};
}
