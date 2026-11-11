import React from 'react';
import { BottomNavIcon } from '../BottomNav';
import { getChallengeObjectiveImage } from '../../lib/challengeObjectiveVisuals';
import './ChallengeGuideInfo.css';

type GuideIcon = 'games' | 'agenda' | 'stats' | 'tournaments' | 'settings' | 'profiles';

/** A card uses the same dartboard assets as ChallengePlay, never a generated substitute. */
function visualForBadge(badge:string):{title:string;value:string;image?:string;icon?:GuideIcon}{
 const text=badge.trim();
 // Rule steps share the visual system with the top summary, including penalties and scoring.
 if(/^(?:[DGPT])(?:[1-9]|1[0-9]|20)$/i.test(text))return {title:'SECTEUR',value:text,image:getChallengeObjectiveImage(text.slice(1))};
 if(/(?:ne rapporte|ne comptent|pénalité|échec|erreur|interdit|sans points?)/i.test(text))return {title:'CONTRAINTE',value:text,icon:'settings'};
 if(/(?:\b(?:simple|double|triple|bull)\b\s*=|\bbarème\b|\bpoints réels\b|\bS=\d|\bD=\d|\bT=\d)/i.test(text))return {title:'BARÈME',value:text,icon:'stats'};
 if(/^D(?:[1-9]|1[0-9]|20)(?:\s*·\s*D(?:[1-9]|1[0-9]|20))+/.test(text))return {title:'DOUBLES DU PARCOURS',value:text,image:getChallengeObjectiveImage('any-double')};
 const parts=text.split(' · ');
 const field=parts.length>1?parts[0]!.trim().toUpperCase():'';
 const value=parts.length>1?parts.slice(1).join(' · '):text;
 const picture=(key:string)=>({title:field||'CIBLE',value,image:getChallengeObjectiveImage(key)});
 if(['CIBLE','DÉPART','NUMÉRO INITIAL','SECTEUR','LIGNE'].includes(field)){
  const key=value.replace(/^(N°|NO\.|D|T|G|P)\s*(?=\d)/i,'').trim();
  return /^(?:[1-9]|1[0-9]|20|bull|bull25|bull50|any-double|any-triple)$/i.test(key)?picture(key):{title:field,value,icon:'stats'};
 }
 if(field==='SECTEURS' && /^\d+/.test(value)){
  const first=value.match(/\d+/)?.[0]||'20';
  return {title:field,value,image:getChallengeObjectiveImage(first)};
 }
 if (/^\d+\s*(TOURS?|VOLÉES?|OBJECTIFS?|PAIRES?|ÉTAPES?|PHASES?|FLÉCHETTES?)\b/i.test(text)){
  const match=text.match(/^(\d+)\s*(.*)$/)!;
  return {title:match[2]!.toUpperCase(),value:match[1]!,icon:'agenda'};
 }
 if(field==='SEUIL'||/VIES?/.test(text)||/RISQUE/.test(text))return {title:field||'VIES',value,icon:'settings'};
 if(field==='OBJECTIF'||/SIMPLE|DOUBLE|TRIPLE|BULL|1\s*→/.test(text))return {title:field||'PARCOURS',value,icon:'games'};
 if(field==='MODE'||/CLASSIQUE|PARCOURS|PERSONNALISÉ/.test(text))return {title:field||'MODE',value,icon:'profiles'};
 if(field==='ZONE'||field==='BARÈME'||/POINTS? RÉELS|POINTS?/.test(text))return {title:field||'SCORING',value,icon:'stats'};
 if(field==='BONUS'||/RECORD|SHANGHAI/.test(text))return {title:field||'BONUS',value,icon:'tournaments'};
 return {title:field||'PARAMÈTRE',value,icon:'games'};
}

/** Reuse precisely the same visual information cards in rule steps and in the header. */
export function ChallengeGuideTiles({badges,compact=false}:{badges:readonly string[];compact?:boolean}){
 if(!badges.length)return null;
 return <div className={'mss-cgi-infos'+(compact?' mss-cgi-infos--steps':'')} role="list" aria-label="Informations sur le défi">
  {badges.map((badge,index)=>{
   const item=visualForBadge(badge);
   return <div className="mss-cgi-info" role="listitem" key={`${index}-${badge}`}>
    <span className="mss-cgi-visual" aria-hidden="true">{item.image?<img src={item.image} alt="" loading="lazy"/>:<BottomNavIcon name={item.icon||'games'} size={25}/>}</span>
    <span className="mss-cgi-copy"><small>{item.title}</small><strong>{item.value}</strong></span>
   </div>;
  })}
 </div>;
}

export function ChallengeGuideInfo({badges,title,intro,onAskAwena}:{badges:readonly string[];title:string;intro:string;onAskAwena:()=>void}){
 return <section className="mss-cgi-root" aria-label={`Comment jouer à ${title}`}>
  <div className="mss-cgi-top">
   <div><small>COMMENT JOUER</small><strong>{intro}</strong></div>
   <button className="mss-cgi-awena" type="button" onClick={onAskAwena} title="Demander à Awena d'expliquer ce challenge" aria-label={`Awena, explique ${title}`}>
    <span><img src="/awena/awena-avatar.webp" alt="" loading="lazy"/></span><b>AWENA</b><em>EXPLIQUER</em>
   </button>
  </div>
  <ChallengeGuideTiles badges={badges}/>
 </section>;
}
