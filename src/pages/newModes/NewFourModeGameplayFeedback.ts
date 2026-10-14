// @ts-nocheck
import type { PremiumMoment } from "./PremiumPartyModeUi";

export type ModeGameplayMoment = PremiumMoment & { playerId?: string };

const lastNewVisit=(previous:any,next:any)=>{
  const before=Array.isArray(previous?.visits)?previous.visits.length:0;
  const after=Array.isArray(next?.visits)?next.visits.length:0;
  return after>before?next.visits[after-1]:null;
};
const playerName=(state:any,id:any)=>state?.players?.find((p:any)=>String(p.id)===String(id))?.name||"Joueur";
const looperLabel=(t:any)=>{
  if(!t)return "—";
  if(t.bed==="IB")return "DBULL";
  if(t.bed==="OB")return "BULL";
  const n=Number(t.number||0), ring=String(t.ring||"");
  if(t.bed==="D")return `D${n}`;
  if(t.bed==="T")return `T${n}`;
  if(ring==="inner_single")return `PETIT S${n}`;
  if(ring==="outer_single")return `GRAND S${n}`;
  return `S${n}`;
};
const key=()=>`${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const nextActiveName=(state:any)=>playerName(state,state?.players?.[state?.activePlayerIndex]?.id);
const withNext=(detail:string,next:any,mode:"51"|"looper"|"call3"|"steeple")=>{
  if(!next||next?.phase==="finished")return detail;
  if(mode==="looper")return `${detail} · → ${nextActiveName(next)} vise ${looperLabel(next?.currentTarget)}`;
  if(mode==="call3"){
    if(next?.phase==="calling")return `${detail} · → ${playerName(next,next?.currentCallerId)} prépare les 3 appels`;
    return `${detail} · → ${nextActiveName(next)} répond aux appels`;
  }
  if(mode==="steeple")return `${detail} · → ${nextActiveName(next)} entre en piste`;
  return `${detail} · → ${nextActiveName(next)} joue`;
};

export function fiftyOneGameplayMoment(previous:any,next:any):ModeGameplayMoment|null{
  const visit=lastNewVisit(previous,next); if(!visit)return null;
  const pid=String(visit.playerId||previous?.players?.[previous?.activePlayerIndex]?.id||"");
  const name=playerName(previous,pid);
  if(next?.lastLegWinnerId&&String(next.lastLegWinnerId)===pid&&(next?.legIndex>previous?.legIndex||next?.phase==="finished"))return{key:key(),playerId:pid,icon:"🏁",kicker:name,title:"FINISH EXACT !",detail:`${visit.rawTotal} ÷ 5 = +${visit.dividedScore} · objectif ${previous?.config?.rules?.target||51} atteint`,tone:"gold",durationMs:2200};
  if(visit.bust)return{key:key(),playerId:pid,icon:"💥",kicker:name,title:"BUST",detail:withNext(`Projection trop haute · score ${visit.before} → ${visit.after}`,next,"51"),tone:"danger",durationMs:1900};
  if(visit.valid)return{key:key(),playerId:pid,icon:"➗",kicker:name,title:`VOLÉE VALIDE · +${visit.dividedScore}`,detail:withNext(`${visit.rawTotal} ÷ 5 · ${visit.before} → ${visit.after}`,next,"51"),tone:"success",durationMs:1600};
  return{key:key(),playerId:pid,icon:"✕",kicker:name,title:"VOLÉE NON VALIDE",detail:withNext((visit.events||[])[0]||"Le total ne rapporte aucun point",next,"51"),tone:"danger",durationMs:1500};
}

export function looperGameplayMoment(previous:any,next:any):ModeGameplayMoment|null{
  const actor=previous?.players?.[previous?.activePlayerIndex];
  if(previous?.phase==="assignment"&&next?.phase==="playing"&&!lastNewVisit(previous,next))return{key:key(),playerId:String(actor?.id||""),icon:"∞",kicker:actor?.name||"LOOPER",title:`CIBLE FIXÉE · ${looperLabel(next?.currentTarget)}`,detail:withNext("La boucle est lancée.",next,"looper"),tone:"info",durationMs:1900};
  const visit=lastNewVisit(previous,next); if(!visit)return null;
  const pid=String(visit.playerId||actor?.id||""),name=playerName(previous,pid);
  if(next?.lastLegWinnerId&&(next?.legIndex>previous?.legIndex||next?.phase==="finished"))return{key:key(),playerId:String(next.lastLegWinnerId),icon:"👑",kicker:playerName(previous,next.lastLegWinnerId),title:"DERNIER EN VIE",detail:"La manche LOOPER est remportée.",tone:"gold",durationMs:2200};
  if(visit.hit)return{key:key(),playerId:pid,icon:"✓",kicker:name,title:"BOUCLE SAUVÉE",detail:withNext(`${looperLabel(visit.targetBefore)} touchée · prochaine cible ${looperLabel(visit.targetAfter)}`,next,"looper"),tone:"success",durationMs:1800};
  const beforeLives=Number(visit?.beforeLives?.[pid]||0),afterLives=Number(visit?.afterLives?.[pid]||0);
  const prevShield=Number(previous?.shields?.[pid]||0),nextShield=Number(next?.shields?.[pid]||0);
  if(prevShield>nextShield)return{key:key(),playerId:pid,icon:"🛡",kicker:name,title:"BOUCLIER CONSOMMÉ",detail:withNext(`${looperLabel(visit.targetBefore)} ratée · la vie est protégée`,next,"looper"),tone:"info",durationMs:1800};
  return{key:key(),playerId:pid,icon:"♥",kicker:name,title:"1 VIE PERDUE",detail:withNext(`${looperLabel(visit.targetBefore)} ratée · ${beforeLives} → ${afterLives} vie${afterLives>1?"s":""}`,next,"looper"),tone:"danger",durationMs:1900};
}

export function callThreeGameplayMoment(previous:any,next:any):ModeGameplayMoment|null{
  const visit=lastNewVisit(previous,next); if(!visit)return null;
  if(next?.lastLegWinnerId&&(next?.legIndex>previous?.legIndex||next?.phase==="finished"))return{key:key(),playerId:String(next.lastLegWinnerId),icon:"🏆",kicker:playerName(previous,next.lastLegWinnerId),title:"MANCHE GAGNÉE",detail:"Meilleur total après les rounds CALL THREE.",tone:"gold",durationMs:2200};
  const pid=String(visit.playerId||""),name=playerName(previous,pid),hits=Number(visit.hits||0),gained=Number(visit.gained||0);
  if(hits===3)return{key:key(),playerId:pid,icon:"🔥",kicker:name,title:`FULL CALL · +${gained} PTS`,detail:withNext("Les 3 appels sont réussis.",next,"call3"),tone:"gold",durationMs:2000};
  if(hits===0)return{key:key(),playerId:pid,icon:"✕",kicker:name,title:"APPEL MANQUÉ",detail:withNext("0/3 · aucun point sur cette volée.",next,"call3"),tone:"danger",durationMs:1600};
  return{key:key(),playerId:pid,icon:"📣",kicker:name,title:`${hits}/3 RÉUSSIES · +${gained} PTS`,detail:withNext((visit.events||[]).slice(0,2).join(" · ")||"Volée enregistrée",next,"call3"),tone:"success",durationMs:1700};
}

export function steeplechaseGameplayMoment(previous:any,next:any):ModeGameplayMoment|null{
  const visit=lastNewVisit(previous,next); if(!visit)return null;
  const pid=String(visit.playerId||previous?.players?.[previous?.activePlayerIndex]?.id||""),name=playerName(previous,pid),steps=Number(visit.steps||0),events=visit.events||[];
  if(next?.lastLegWinnerId&&String(next.lastLegWinnerId)===pid&&(next?.legIndex>previous?.legIndex||next?.phase==="finished"))return{key:key(),playerId:pid,icon:"🏁",kicker:name,title:"LIGNE D’ARRIVÉE !",detail:"Bull final réussi · course remportée.",tone:"gold",durationMs:2300};
  const fence=events.find((e:string)=>/franchit\s+T\d+/i.test(e));
  if(fence)return{key:key(),playerId:pid,icon:"🚧",kicker:name,title:"HAIE FRANCHIE",detail:withNext(`${steps} étape${steps>1?"s":""} gagnée${steps>1?"s":""} sur la volée`,next,"steeple"),tone:"gold",durationMs:1850};
  if(steps>=2)return{key:key(),playerId:pid,icon:"⚡",kicker:name,title:`ACCÉLÉRATION · +${steps} ÉTAPES`,detail:withNext("Plusieurs obstacles franchis dans la même volée.",next,"steeple"),tone:"success",durationMs:1800};
  if(steps===1)return{key:key(),playerId:pid,icon:"🏃",kicker:name,title:"ÉTAPE FRANCHIE",detail:withNext(events[0]||"La course avance d’une case.",next,"steeple"),tone:"success",durationMs:1500};
  return{key:key(),playerId:pid,icon:"⛔",kicker:name,title:"AUCUNE ÉTAPE",detail:withNext("Aucune progression sur cette volée.",next,"steeple"),tone:"danger",durationMs:1500};
}
