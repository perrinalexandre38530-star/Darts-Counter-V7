import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { clearCameraCalibration, loadCameraCalibration } from "../../lib/cameraCalibrationStore";
import {
  CAMERA_SCORING_PRESETS,
  applyCameraScoringPreset,
  loadCameraScoringPreferences,
  resetCameraScoringPreferences,
  saveCameraScoringPreferences,
  type CameraPrecisionProfile,
} from "../../lib/cameraScoringPreferences";

type Props={ go?: (tab:any, params?:any)=>void };

export default function CameraScoringSettingsPanel({go}:Props){
  const {theme}=useTheme();
  const [prefs,setPrefs]=React.useState(()=>loadCameraScoringPreferences());
  const [cal,setCal]=React.useState(()=>loadCameraCalibration());
  const [cameraDiag,setCameraDiag]=React.useState<any>(null);
  const [busy,setBusy]=React.useState(false);

  const card:React.CSSProperties={borderRadius:18,border:`1px solid ${theme.borderSoft}`,background:theme.card,padding:14,boxShadow:`0 14px 30px rgba(0,0,0,.3),0 0 18px ${theme.primary}10`};
  const action:React.CSSProperties={minHeight:42,borderRadius:13,border:`1px solid ${theme.primary}66`,background:`${theme.primary}12`,color:theme.text,fontWeight:950,cursor:"pointer",padding:"9px 12px"};
  const muted={color:theme.textSoft,fontSize:11,lineHeight:1.45} as React.CSSProperties;

  const update=(patch:any)=>{const next=saveCameraScoringPreferences({...prefs,...patch});setPrefs(next);};
  const preset=(profile:CameraPrecisionProfile)=>{const next=applyCameraScoringPreset(profile);setPrefs(next);};

  async function testCamera(){
    setBusy(true); setCameraDiag(null);
    let stream:MediaStream|null=null;
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:2560},height:{ideal:1440},frameRate:{ideal:30}},audio:false});
      const track=stream.getVideoTracks()[0];
      const settings:any=track?.getSettings?.()||{};
      const caps:any=track?.getCapabilities?.()||{};
      setCameraDiag({ok:true,label:track?.label||"Caméra",width:settings.width,height:settings.height,frameRate:settings.frameRate,zoom:settings.zoom,focusMode:settings.focusMode,hasZoom:!!caps.zoom,hasFocus:Array.isArray(caps.focusMode),hasExposure:Array.isArray(caps.exposureMode)});
    }catch(e:any){setCameraDiag({ok:false,error:e?.message||"Caméra indisponible"});}
    finally{try{stream?.getTracks().forEach(x=>x.stop());}catch{}setBusy(false);}
  }

  const projective=!!(cal && (cal as any).v===2 && Array.isArray((cal as any).homography));
  const calConfidence=Number((cal as any)?.projectiveConfidence ?? (cal as any)?.confidence ?? 0);
  const calError=Number((cal as any)?.projectiveErrorMm ?? NaN);

  return <section style={{display:"grid",gap:12,paddingBottom:72}}>
    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
        <div><div style={{color:theme.primary,fontWeight:1000,fontSize:14}}>SCORING CAMÉRA · PRÉCISION IA</div><div style={{...muted,marginTop:5}}>Réglages communs du moteur caméra utilisés par PETANQUE et les fonctions de scoring assisté.</div></div>
        <span style={{padding:"5px 8px",borderRadius:999,border:`1px solid ${projective?"#39d98a":"#ffb15c"}66`,color:projective?"#8fffc2":"#ffc98a",fontSize:9,fontWeight:1000}}>{projective?"CALIBRÉ":"À CALIBRER"}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:12}}>
        <Metric label="Calibration" value={projective?`${Math.round(calConfidence*100)} %`:"—"} theme={theme}/>
        <Metric label="Erreur projetée" value={Number.isFinite(calError)?`${calError.toFixed(2)} mm`:"—"} theme={theme}/>
        <Metric label="Profil actif" value={prefs.profile.toUpperCase()} theme={theme}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        <button style={action} onClick={()=>go?.("camera_scoring_calibration",{returnTab:"settings",returnParams:{settingsTab:"cameraScoring"}})}>🎯 RECALIBRER 5 POINTS</button>
        <button style={action} onClick={()=>go?.("camera_scoring_setup",{returnTab:"settings",returnParams:{settingsTab:"cameraScoring"}})}>📷 SOURCES / APPAREILS</button>
        <button style={action} disabled={busy} onClick={testCamera}>{busy?"TEST…":"🧪 TESTER LA CAMÉRA"}</button>
        <button style={{...action,borderColor:"rgba(255,120,120,.4)",color:"#ffb1b1"}} onClick={()=>{if(window.confirm("Supprimer la calibration caméra enregistrée sur cet appareil ?")){clearCameraCalibration();setCal(null);}}}>EFFACER CALIBRATION</button>
      </div>
      {cameraDiag?<div style={{...muted,marginTop:10,padding:10,borderRadius:12,background:"rgba(0,0,0,.22)",border:`1px solid ${cameraDiag.ok?"#39d98a":"#ff6f7d"}44`}}>{cameraDiag.ok?`${cameraDiag.label} · ${cameraDiag.width||"?"}×${cameraDiag.height||"?"} · ${Math.round(cameraDiag.frameRate||0)} fps · autofocus ${cameraDiag.hasFocus?"oui":"non"} · zoom ${cameraDiag.hasZoom?"oui":"non"} · exposition ${cameraDiag.hasExposure?"oui":"non"}`:`Erreur : ${cameraDiag.error}`}</div>:null}
    </div>

    <div style={card}>
      <div style={{fontWeight:1000,color:theme.text}}>NIVEAU DE PRÉCISION</div>
      <div style={{...muted,marginTop:4}}>Le profil MAXIMALE privilégie la précision avant la vitesse et est recommandé pour PETANQUE.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:7,marginTop:11}}>{(["high","competition","maximum"] as CameraPrecisionProfile[]).map(id=><button key={id} onClick={()=>preset(id)} style={{...action,minHeight:58,borderColor:prefs.profile===id?theme.primary:theme.borderSoft,background:prefs.profile===id?`${theme.primary}1e`:"rgba(255,255,255,.025)"}}><b>{id==="high"?"HAUTE":id==="competition"?"COMPÉTITION":"MAXIMALE"}</b><span style={{display:"block",fontSize:8.5,color:theme.textSoft,marginTop:4}}>{CAMERA_SCORING_PRESETS[id].analysisFrames} frames · ±{CAMERA_SCORING_PRESETS[id].maxUncertaintyMm.toFixed(2)} mm max</span></button>)}</div>
    </div>

    <div style={card}>
      <div style={{fontWeight:1000,color:theme.text}}>ACQUISITION MULTI-FRAME</div>
      <div style={{...muted,marginTop:4}}>Plus de frames augmente la robustesse du consensus, au prix d’une analyse légèrement plus longue.</div>
      <RangeRow label="Frames cible vide (baseline)" value={prefs.baselineFrames} min={3} max={11} step={1} suffix=" frames" onChange={v=>update({baselineFrames:v})} theme={theme}/>
      <RangeRow label="Frames analyse principale" value={prefs.analysisFrames} min={3} max={11} step={1} suffix=" frames" onChange={v=>update({analysisFrames:v})} theme={theme}/>
      <RangeRow label="Frames seconde lecture" value={prefs.rereadFrames} min={5} max={13} step={1} suffix=" frames" onChange={v=>update({rereadFrames:v})} theme={theme}/>
    </div>

    <div style={card}>
      <div style={{fontWeight:1000,color:theme.text}}>CONTRÔLES DE VALIDATION</div>
      <RangeRow label="Incertitude maximale" value={prefs.maxUncertaintyMm} min={.45} max={1.5} step={.05} suffix=" mm" onChange={v=>update({maxUncertaintyMm:v})} theme={theme}/>
      <RangeRow label="Accord entre frames" value={prefs.minFrameAgreement} min={.72} max={.99} step={.01} format={v=>`${Math.round(v*100)} %`} onChange={v=>update({minFrameAgreement:v})} theme={theme}/>
      <RangeRow label="Dispersion consensus" value={prefs.maxConsensusSpreadMm} min={.2} max={1} step={.02} suffix=" mm" onChange={v=>update({maxConsensusSpreadMm:v})} theme={theme}/>
      <RangeRow label="Accord seconde lecture" value={prefs.minRereadAgreement} min={.55} max={.95} step={.01} format={v=>`${Math.round(v*100)} %`} onChange={v=>update({minRereadAgreement:v})} theme={theme}/>
      <ToggleRow label="Double lecture automatique des mesures limites" value={prefs.autoReread} onChange={v=>update({autoReread:v})} theme={theme}/>
      <ToggleRow label="Contrôle strict de dérive projective" value={prefs.strictProjectiveDrift} onChange={v=>update({strictProjectiveDrift:v})} theme={theme}/>
    </div>

    <div style={card}>
      <div style={{fontWeight:1000,color:theme.text}}>IDENTIFICATION DES FLÉCHETTES</div>
      <div style={{...muted,marginTop:4}}>Ces seuils déterminent quand l’IA peut attribuer automatiquement une fléchette à un joueur enrôlé.</div>
      <ToggleRow label="Identification stricte — bloquer toute identité ambiguë" value={prefs.strictDartIdentification} onChange={v=>update({strictDartIdentification:v})} theme={theme}/>
      <RangeRow label="Confiance identité minimale" value={prefs.minIdentityConfidence} min={.55} max={.95} step={.01} format={v=>`${Math.round(v*100)} %`} onChange={v=>update({minIdentityConfidence:v})} theme={theme}/>
      <RangeRow label="Marge face au 2e candidat" value={prefs.minIdentityMargin} min={.03} max={.25} step={.01} format={v=>`${Math.round(v*100)} pts`} onChange={v=>update({minIdentityMargin:v})} theme={theme}/>
    </div>

    <button style={{...action,width:"100%"}} onClick={()=>setPrefs(resetCameraScoringPreferences())}>RÉTABLIR LE PROFIL MAXIMALE RECOMMANDÉ</button>
  </section>;
}

function Metric({label,value,theme}:any){return <div style={{padding:9,borderRadius:12,background:"rgba(0,0,0,.2)",border:`1px solid ${theme.borderSoft}`}}><span style={{display:"block",fontSize:8.5,color:theme.textSoft}}>{label}</span><b style={{display:"block",marginTop:3,fontSize:11,color:theme.text}}>{value}</b></div>}
function ToggleRow({label,value,onChange,theme}:any){return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"11px 0",borderBottom:`1px solid ${theme.borderSoft}`}}><span style={{fontSize:10.5,color:theme.text}}>{label}</span><button onClick={()=>onChange(!value)} style={{minWidth:54,height:30,borderRadius:999,border:`1px solid ${value?theme.primary:theme.borderSoft}`,background:value?`${theme.primary}25`:"rgba(255,255,255,.04)",color:value?theme.primary:theme.textSoft,fontWeight:1000,cursor:"pointer"}}>{value?"ON":"OFF"}</button></div>}
function RangeRow({label,value,min,max,step,suffix="",format,onChange,theme}:any){return <label style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 84px",gap:10,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${theme.borderSoft}`}}><div><div style={{fontSize:10.5,color:theme.text,marginBottom:7}}>{label}</div><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%",accentColor:theme.primary}}/></div><b style={{textAlign:"right",fontSize:10.5,color:theme.primary}}>{format?format(value):`${Number(value).toFixed(step<.1?2:1)}${suffix}`}</b></label>}
