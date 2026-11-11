/** Les 51 défis partagent leur source de règles avec les fiches CHALLENGE.
 * Aucune copie de textes divergente n'est maintenue côté Awena.
 */
import { CHALLENGE_MODE_OPTIONS } from '../lib/challengeUnifiedCatalog';
import { buildChallengeGuide } from '../lib/challengeGuideContent';
import { DEFAULT_CUSTOM_SEQUENCE, DOUBLES_8_TARGETS } from '../lib/challengeExercises';
import type { AwenaReply } from './awena.types';

export const AWENA_CHALLENGE_ENTRIES = CHALLENGE_MODE_OPTIONS.map(choice=>({
 id:`challenge-${choice.id}`,label:choice.title,aliases:[choice.title,`challenge ${choice.title}`],
 summary:choice.description,howToPlayInApp:`Jeux > Fléchettes > CHALLENGE > ${choice.family} > ${choice.title}.`,
 configRoute:'challenge_config',
}));
const norm=(value:string)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const badge=(q:string,field:string)=>{
 const match=q.match(new RegExp(`${field}\\s*[·:]\\s*([^.;]+)`,'i'));
 return match?.[1]?.trim()||'';
};
export function answerAwenaChallengeQuestion(question:string):AwenaReply|null{
 const text=String(question||'');
 if(!/challenge|defi|défi/i.test(text))return null;
 // La fiche envoie toujours « CHALLENGE » et un titre explicite.
 const marker=text.match(/challenge\s*[«"']([^»"']+)[»"']/i)?.[1];
 const found=marker?CHALLENGE_MODE_OPTIONS.find(c=>norm(c.title)===norm(marker)):
  [...CHALLENGE_MODE_OPTIONS].sort((a,b)=>b.title.length-a.title.length).find(c=>norm(text).includes(norm(c.title)));
 if(!found)return null;
 const targetRaw=badge(text,'CIBLE')||'20';
 const target=/\bdouble/i.test(targetRaw)?'any-double':/\btriple/i.test(targetRaw)?'any-triple':/bull/i.test(targetRaw)?'bull':targetRaw.match(/\d+/)?.[0]||'20';
 const firstNumber=(pattern:RegExp,fallback:number)=>Number(text.match(pattern)?.[1]||fallback);
 const rounds=firstNumber(/(\d+)\s*(?:TOURS?|OBJECTIFS?|PAIRES?|VOLÉES?)/i,5);
 const targetPoints=firstNumber(/(?:CIBLE|SCORE CIBLE)\s*[·:]\s*(\d+)\s*PTS/i,100);
 const guide=buildChallengeGuide(found,{
  target,rule:/SEULEMENT DOUBLE|DOUBLES UNIQUEMENT/i.test(text)?'double':/SEULEMENT TRIPLE|TRIPLES UNIQUEMENT/i.test(text)?'triple':'all',
  visits:rounds,clockIncludeBull:true,clockScoreMode:'challenge',halfItStartScore:40,
  sequenceObjectives:[...DEFAULT_CUSTOM_SEQUENCE],sequenceScoreMode:'real',
  groupingMin:15,groupingMax:20,groupingHits:2,doublesBonusTarget:20,
  doublesTargets:[...DOUBLES_8_TARGETS],doublesTargetMode:'official',
  arcadeConfig:{catalogChallengeId:found.arcadeId||'perfect-line',catalogLine:firstNumber(/(?:DÉPART|NUMÉRO INITIAL)\s*[·:]\s*(\d+)/i,20),catalogVariant:/DOUBLES/i.test(text)?'doubles':/TRIPLES/i.test(text)?'triples':'classic',catalogRounds:rounds,catalogTarget:targetPoints},
 });
 return {
  text:`## ${found.title}\n${guide.intro}\n\n${guide.badges.map(t=>`**${t}**`).join(' · ')}\n\n${guide.steps.map((step,i)=>`${i+1}. **${step.title}** — ${step.text}${step.bullets?.length?` (${step.bullets.join(' ; ')})`:''}`).join('\n\n')}\n\n**${guide.footer}**\n\nPour jouer : Jeux > Fléchettes > CHALLENGE > ${found.family} > ${found.title}.`,
  knowledgeTopic:`challenge:${found.id}:rules`,
 };
}
