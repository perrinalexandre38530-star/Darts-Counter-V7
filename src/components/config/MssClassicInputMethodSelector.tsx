import React from "react";
import { MssInputMethodIcon } from "./MssPremiumConfig";
import { KILLER_INPUT_METHODS } from "../../lib/scoreInput/killerInput";

/** Même jeu de 5 icônes que KILLER, sans largeur fixe ni débordement mobile.
 * Les méthodes non disponibles restent grisées, jamais artificiellement activables. */
export default function MssClassicInputMethodSelector({ value, onChange, accent }: {
  value: "keypad" | "dartboard";
  onChange: (value: "keypad" | "dartboard") => void;
  accent: string;
}) {
  const current = KILLER_INPUT_METHODS.find(method => method.id === value);
  return <div role="group" aria-label="Mode de saisie" style={{ minWidth:0 }}>
    <div style={{fontSize:12,fontWeight:900,color:accent,marginBottom:12}}>MODE DE SAISIE</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:"clamp(3px,1vw,8px)",maxWidth:360,margin:"auto",minWidth:0}}>
      {KILLER_INPUT_METHODS.map(method => {
        const disabled = !["keypad","dartboard"].includes(method.id);
        const active = value===method.id;
        return <button key={method.id} type="button" title={method.label} aria-label={method.label} aria-pressed={active} disabled={disabled}
          onClick={()=>{if(!disabled)onChange(method.id as "keypad"|"dartboard");}}
          style={{width:"100%",minWidth:0,aspectRatio:"1",maxHeight:54,borderRadius:13,display:"grid",placeItems:"center",padding:2,
            background:active?`${accent}25`:"rgba(255,255,255,.035)",border:`1px solid ${active?accent:`${accent}55`}`,
            color:accent,opacity:disabled?.35:1,cursor:disabled?"not-allowed":"pointer"}}>
          <MssInputMethodIcon kind={method.id as any} size={24}/>
        </button>;
      })}
    </div>
    <div style={{textAlign:"center",marginTop:10,display:"grid",gap:5}}>
      <strong style={{color:accent,fontSize:13}}>{current?.label||"KEYPAD"}</strong>
      <span style={{color:"#adb7ce",fontSize:11}}>{current?.description}</span>
      <span style={{color:"#8993aa",fontSize:10}}>Vocal, caméra et AutoDarts restent désactivés tant que leur connexion n'est pas disponible.</span>
    </div>
  </div>;
}
