/** MSS — configurations de Cricket réellement prises en charge par le moteur commun.
 * Les jeux à moteurs distincts (English Cricket, SCRAM, Shove a Penny) ne sont pas
 * déclarés ici pour éviter de leur attribuer accidentellement les règles du Cricket.
 */
export type CricketRuleVariant =
  | 'classic' | 'cut_throat' | 'tactics' | 'low_ball' | 'spanish'
  | 'random' | 'pick_it' | 'hidden' | 'double_only' | 'quickie' | 'mickey_mouse' | 'wild_mouse' | 'wild_card' | 'sudden_death';

export const STANDARD_CRICKET_NUMBERS = [20,19,18,17,16,15] as const;
export const CRICKET_VARIANT_RULES: Record<CricketRuleVariant, {
  label:string; description:string; numbers:readonly number[]; extended?:boolean; sameBed?:boolean; exclusiveSpecial?:boolean; wildCard?:boolean; suddenDeath?:number;
  random?:boolean; hidden?:boolean; pick?:boolean; doubleOnly?:boolean; maxRounds?:number;
}> = {
  classic: {label:'CRICKET', description:'Ferme 20 à 15 et BULL.',numbers:STANDARD_CRICKET_NUMBERS},
  cut_throat: {label:'CUT-THROAT',description:'Les points sont attribués aux adversaires encore ouverts.',numbers:STANDARD_CRICKET_NUMBERS},
  tactics: {label:'TACTICS',description:'Ferme 15 à 20, DOUBLE, TRIPLE et BULL. Trois marques par objectif.',numbers:STANDARD_CRICKET_NUMBERS,extended:true},
  low_ball: {label:'LOW-BALL CRICKET',description:'Ferme les secteurs 1 à 6 et BULL.',numbers:[6,5,4,3,2,1]},
  spanish: {label:'SPANISH CRICKET',description:'Ferme les secteurs 11 à 20 et BULL.',numbers:[20,19,18,17,16,15,14,13,12,11]},
  random: {label:'RANDOM CRICKET',description:'Six numéros tirés au sort au début de chaque partie, plus BULL.',numbers:STANDARD_CRICKET_NUMBERS,random:true},
  pick_it: {label:'PICK-IT CRICKET',description:'Choisis six numéros de 1 à 20 avant de jouer, plus BULL.',numbers:STANDARD_CRICKET_NUMBERS,pick:true},
  hidden: {label:'HIDDEN CRICKET',description:'Six objectifs secrets sont révélés au fil des impacts, plus BULL.',numbers:STANDARD_CRICKET_NUMBERS,random:true,hidden:true},
  double_only: {label:'MASTER CRICKET',description:'Seuls les impacts dans l’anneau DOUBLE valident les secteurs. Option DOUBLE + TRIPLE.',numbers:STANDARD_CRICKET_NUMBERS,doubleOnly:true},
  quickie: {label:'QUICKIE CRICKET',description:'Dix manches maximum, puis classement selon les points et les fermetures.',numbers:STANDARD_CRICKET_NUMBERS,maxRounds:10},
  mickey_mouse: {label:'MICKEY MOUSE',description:'Ferme 15 à 20, DOUBLE, TRIPLE, BULL et TROIS-DANS-UN-LIT : trois impacts par objectif.',numbers:STANDARD_CRICKET_NUMBERS,extended:true,sameBed:true},
  wild_mouse: {label:'WILD MOUSE',description:'Version Minnesota : chaque fléchette compte pour une seule condition (numéro, double/triple ou BED).',numbers:STANDARD_CRICKET_NUMBERS,extended:true,sameBed:true,exclusiveSpecial:true},
  wild_card: {label:'WILD CARD CRICKET',description:'Un joker change à chaque manche. Une touche sur sa cible ajoute une marque bonus.',numbers:STANDARD_CRICKET_NUMBERS,wildCard:true},
  sudden_death: {label:'SUDDEN DEATH CRICKET',description:'Un joueur est éliminé dès qu’il prend au moins 100 points de retard sur le leader.',numbers:STANDARD_CRICKET_NUMBERS,suddenDeath:100},
};
export const CRICKET_RULE_VARIANT_BY_GAME: Record<string,CricketRuleVariant> = {
  cricket:'classic',cricket_cut_throat:'cut_throat',cricket_tactics:'tactics',
  cricket_low_ball:'low_ball',cricket_spanish:'spanish',cricket_random:'random',
  cricket_pick_it:'pick_it',cricket_hidden:'hidden',cricket_master:'double_only',
  cricket_quickie:'quickie',cricket_mickey_mouse:'mickey_mouse',cricket_wild_mouse:'wild_mouse',
  cricket_wild_card:'wild_card',cricket_sudden_death:'sudden_death',
};
export function selectRandomCricketTargets(random:()=>number=Math.random):number[] {
  const numbers = Array.from({length:20},(_,i)=>i+1);
  for(let i=numbers.length-1;i>0;i--){const j=Math.floor(random()*(i+1)); [numbers[i],numbers[j]]=[numbers[j],numbers[i]];}
  return numbers.slice(0,6).sort((a,b)=>b-a).concat(25);
}
export function configuredCricketTargets(variant:CricketRuleVariant, chosen?:readonly number[], random:()=>number=Math.random):number[]{
  const rule=CRICKET_VARIANT_RULES[variant];
  if(rule.random) return selectRandomCricketTargets(random);
  const nums = rule.pick && chosen?.length===6 ? [...chosen] : [...rule.numbers];
  return [...nums.filter(n=>n>=1&&n<=20).sort((a,b)=>b-a),25,...(rule.extended?[26,27,...(rule.sameBed?[28]:[])]:[])];
}
