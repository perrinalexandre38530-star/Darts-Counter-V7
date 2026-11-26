import React from "react";
import { MssInputMethodIcon } from "./MssPremiumConfig";
import { KILLER_INPUT_METHODS } from "../../lib/scoreInput/killerInput";

/** Iconographie KILLER — grille responsive, seules les méthodes prises en charge par Gros 6 restent actives. */
export default function MssGros6InputSelector({value,onChange,accent}:{value:"keypad"|"voice";onChange:(v:"keypad"|"voice")=>void;accent:string}) {
  const availableVoice = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const current = KILLER_INPUT_METHODS.find(x=>x.id===value) || KILLER_INPUT_METHODS[0];
  return <div role="group" aria-label="Mode de saisie" style={{minWidth:0,display:"grid",gap:10}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:"clamp(3px,1.2vw,8px)",maxWidth:355,width:"100%",margin:"0 auto"}}>
      {KILLER_INPUT_METHODS.map(method=>{
        const enabled=method.id==="keypad" || (method.id==="voice" && availableVoice);
        const active=value===method.id;
        return <button type="button" key={method.id} title={method.label} aria-label={method.label} aria-pressed={active} disabled={!enabled}
          onClick={()=>{if(enabled)onChange(method.id as "keypad"|"voice");}}
          style={{minWidth:0,width:"100%",aspectRatio:"1/1",maxHeight:54,padding:3,borderRadius:13,border:`1px solid ${active?accent:`${accent}55`}`,background:active?`${accent}22`:"rgba(255,255,255,.035)",color:accent,display:"grid",placeItems:"center",opacity:enabled?1:.35,boxShadow:active?`0 0 12px ${accent}30`:"none",cursor:enabled?"pointer":"not-allowed"}}>
          <MssInputMethodIcon kind={method.id} size={24}/>
        </button>;
      })}
    </div>
    <div style={{textAlign:"center",display:"grid",gap:6}}>
      <strong style={{fontSize:13,color:accent,letterSpacing:.7}}>{current.label}</strong>
      <span style={{fontSize:11,lineHeight:1.45,color:"#b3bdd0"}}>{current.description}</span>
      <span style={{fontSize:10,lineHeight:1.4,color:"#8994ab"}}>CIBLE, CAMÉRA et AUTODARTS non pris en charge dans GROS 6. Les choix indisponibles restent grisés.</span>
    </div>
  </div>;
}
