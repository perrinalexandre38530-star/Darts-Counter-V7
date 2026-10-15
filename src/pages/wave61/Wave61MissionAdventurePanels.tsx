// @ts-nocheck
import React from "react";
import { Meter, SOFT, panelStyle } from "../newModes/newModePlayShared";

const HEIST_STAGES = ["REPÉRAGE", "EFFRACTION", "COFFRE", "FUITE"];
const ESCAPE_STAGES = ["CODE", "CLÉ", "LASER", "PORTAIL", "SORTIE"];
const LUNAR_PHASES = ["CARBURANT", "LANCEMENT", "ORBITE", "ALUNISSAGE"];
const HOLLYWOOD_SCENES = ["CASTING", "ACTION", "CASCADE", "DRAME", "PREMIÈRE", "OSCARS"];
const MAYA_CYCLES = ["JAGUAR", "SOLEIL", "PLUIE", "SERPENT", "TEMPLE"];
const PYRAMID_CHAMBERS = ["ENTRÉE", "GALERIE", "PIÈGES", "CHAMBRE ROYALE", "SARCOPHAGE"];
const MYTH_GODS = ["ATHÉNA", "HERMÈS", "ARÈS", "POSÉIDON", "HADÈS", "ZEUS"];
const MICRO_SAMPLES = ["CELLULE", "BACTÉRIE", "POLLEN", "SPORE", "CRISTAL", "ADN"];
const CIRCUIT_NAMES = ["ALIM", "MOTEUR", "ÉCLAIRAGE", "CAPTEUR", "RELAIS", "SORTIE"];
const BAC_CATEGORIES = ["PRÉNOM", "VILLE", "ANIMAL", "OBJET", "SPORT", "MÉTIER"];
const BAC_LETTERS = ["A","B","C","D","E","F","G","H","I","J","L","M","N","O","P","R","S","T","V","Z"];

function card(accent: string): React.CSSProperties {
  return { ...panelStyle(`${accent}40`), padding: 9, display: "grid", gap: 6 };
}
function title(accent: string, text: string) {
  return <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .6 }}>{text}</div>;
}
function playerGrid(children: React.ReactNode) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 7 }}>{children}</div>;
}
function stepStrip(labels: string[], current: number, accent: string) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${labels.length},minmax(0,1fr))`, gap: 4 }}>
    {labels.map((label, i) => <div key={label} style={{ borderRadius: 8, padding: "5px 3px", textAlign: "center", border: `1px solid ${i < current ? accent + "88" : "rgba(255,255,255,.09)"}`, background: i < current ? accent + "18" : "rgba(255,255,255,.025)", color: i < current ? accent : SOFT, fontSize: 8, fontWeight: 900 }}>{label}</div>)}
  </div>;
}

export function Heist180Panel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "HEIST 180 · CASSE EN 4 PHASES")}
    {playerGrid(state.players.map((p:any)=>{const stage=Number(state.special?.heistStageByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>💰 {p.name}</b>{stepStrip(HEIST_STAGES,stage,accent)}<span style={{color:SOFT,fontSize:9}}>Butin {state.special?.heistLootByPlayer?.[p.id]||0} · Chaleur {state.special?.heistHeatByPlayer?.[p.id]||0}%</span><Meter value={state.special?.heistHeatByPlayer?.[p.id]||0} max={100} accent="#ff746b"/></div>}))}
  </div>;
}
export function EscapeGamePanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "ESCAPE GAME · VERROUS")}
    {playerGrid(state.players.map((p:any)=>{const step=Number(state.special?.escapeStepByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>🔐 {p.name}</b>{stepStrip(ESCAPE_STAGES,step,accent)}<span style={{color:SOFT,fontSize:9}}>Jokers {state.special?.escapeJokersByPlayer?.[p.id]||0} · Pénalités {state.special?.escapePenaltyByPlayer?.[p.id]||0}</span></div>}))}
  </div>;
}
export function ObjectifLunePanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "OBJECTIF LUNE · PROFIL DE VOL")}
    {playerGrid(state.players.map((p:any)=>{const stage=Number(state.special?.lunarStageByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>🚀 {p.name}</b>{stepStrip(LUNAR_PHASES,stage,accent)}<span style={{color:SOFT,fontSize:9}}>Carburant {state.special?.lunarFuelByPlayer?.[p.id]||0}% · Stabilité {state.special?.lunarStabilityByPlayer?.[p.id]||0}%</span><Meter value={state.special?.lunarStabilityByPlayer?.[p.id]||0} max={100} accent={accent}/></div>}))}
  </div>;
}
export function HollywoodPanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "HOLLYWOOD · TOURNAGE")}
    {playerGrid(state.players.map((p:any)=>{const scene=Number(state.special?.hollywoodSceneByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>🎬 {p.name}</b>{stepStrip(HOLLYWOOD_SCENES,scene,accent)}<span style={{color:SOFT,fontSize:9}}>★ {state.special?.hollywoodStarsByPlayer?.[p.id]||0} · Box-office {state.special?.hollywoodBoxOfficeByPlayer?.[p.id]||0}</span></div>}))}
  </div>;
}
export function MayaPanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "CALENDRIER MAYA · 5 SCEAUX")}
    {playerGrid(state.players.map((p:any)=>{const seal=Number(state.special?.mayaSealByPlayer?.[p.id]||0); const doom=Number(state.special?.mayaDoomByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>🗿 {p.name}</b>{stepStrip(MAYA_CYCLES,seal,accent)}<span style={{color:SOFT,fontSize:9}}>Fin du cycle {doom}%</span><Meter value={doom} max={100} accent="#ff6b68"/></div>}))}
  </div>;
}
export function PyramidesPanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "PYRAMIDES · EXPLORATION")}
    {playerGrid(state.players.map((p:any)=>{const step=Number(state.special?.pyramidChamberByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>🔺 {p.name}</b>{stepStrip(PYRAMID_CHAMBERS,step,accent)}<span style={{color:SOFT,fontSize:9}}>Torche {state.special?.pyramidTorchByPlayer?.[p.id]||0}%</span><Meter value={state.special?.pyramidTorchByPlayer?.[p.id]||0} max={100} accent="#ffd56b"/></div>}))}
  </div>;
}
export function DracoSpheresPanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "DRACO SPHERES · 7 ORBES")}
    {playerGrid(state.players.map((p:any)=>{const spheres=Number(state.special?.dracoSpheresByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>🐉 {p.name}</b><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{Array.from({length:7},(_,i)=><span key={i} style={{width:19,height:19,borderRadius:99,display:"grid",placeItems:"center",border:`1px solid ${i<spheres?accent+"aa":"rgba(255,255,255,.12)"}`,background:i<spheres?accent+"25":"transparent",fontSize:8,color:i<spheres?accent:SOFT}}>{i+1}</span>)}</div><span style={{color:SOFT,fontSize:9}}>Énergie {state.special?.dracoEnergyByPlayer?.[p.id]||0}%</span><Meter value={state.special?.dracoEnergyByPlayer?.[p.id]||0} max={100} accent={accent}/></div>}))}
  </div>;
}
export function MythologiePanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "MYTHOLOGIE · ÉPREUVES DES DIEUX")}
    {playerGrid(state.players.map((p:any)=>{const trial=Number(state.special?.mythTrialByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>⚡ {p.name}</b>{stepStrip(MYTH_GODS,trial,accent)}<span style={{color:SOFT,fontSize:9}}>Faveur divine {state.special?.mythFavorByPlayer?.[p.id]||0}%</span><Meter value={state.special?.mythFavorByPlayer?.[p.id]||0} max={100} accent={accent}/></div>}))}
  </div>;
}
export function JardinierPanel({ state, accent }: any) {
  const harvestGoal=Math.max(1,Number(state?.config?.modeOptions?.harvestGoal||5));
  const plantStages=["GRAINE","POUSSE","FEUILLES","FLEURS","RÉCOLTE"];
  return <div style={card(accent)}>{title(accent, "LE JARDINIER · POTAGER EN DIRECT")}
    {playerGrid(state.players.map((p:any)=>{
      const harvest=Number(state.special?.gardenHarvestByPlayer?.[p.id]||0);
      const growth=Math.max(0,Math.min(100,Number(state.special?.gardenGrowthByPlayer?.[p.id]||0)));
      const water=Math.max(0,Math.min(100,Number(state.special?.gardenWaterByPlayer?.[p.id]||0)));
      const stage=Math.min(plantStages.length-1,Math.floor(growth/25));
      const plantIcon=growth>=75?"🌻":growth>=50?"🌿":growth>=25?"🌱":"🫘";
      return <div key={p.id} style={{display:"grid",gap:6}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><b>{plantIcon} {p.name}</b><span style={{color:water<=25?"#ff806f":accent,fontSize:9,fontWeight:1000}}>💧 {Math.round(water)}%</span></div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${harvestGoal},minmax(0,1fr))`,gap:4}}>{Array.from({length:harvestGoal},(_,i)=><div key={i} style={{height:18,borderRadius:7,display:"grid",placeItems:"center",border:`1px solid ${i<harvest?accent+"99":"rgba(255,255,255,.09)"}`,background:i<harvest?accent+"22":"rgba(255,255,255,.025)",fontSize:10}}>{i<harvest?"🥕":"·"}</div>)}</div>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,color:SOFT,fontSize:8.5}}><span>Culture {Math.min(harvest+1,harvestGoal)}/{harvestGoal}</span><b style={{color:growth>=75?accent:"#dfe6ef"}}>{plantStages[stage]} · {Math.round(growth)}%</b></div>
        <Meter value={growth} max={100} accent={accent}/>
        <Meter value={water} max={100} accent={water<=25?"#ff806f":"#6bc7ff"}/>
        <span style={{color:water<=25?"#ff9a8b":SOFT,fontSize:8.5}}>{water<=25?"⚠ Réserve critique : vise BULL pour arroser":"BULL = arrosage · cible = croissance · erreur = perte d’eau"}</span>
      </div>;
    }))}
  </div>;
}
export function MicroscopiaPanel({ state, accent }: any) {
  const sampleIcons=["🧫","🦠","🌼","🍄","💎","🧬"];
  return <div style={card(accent)}>{title(accent, "MICROSCOPIA · LABORATOIRE EN DIRECT")}
    {playerGrid(state.players.map((p:any)=>{
      const samples=Math.max(0,Math.min(MICRO_SAMPLES.length,Number(state.special?.microSamplesByPlayer?.[p.id]||0)));
      const quality=Math.max(0,Number(state.special?.microQualityByPlayer?.[p.id]||0));
      const contam=Math.max(0,Math.min(100,Number(state.special?.microContaminationByPlayer?.[p.id]||0)));
      const currentSample=samples<MICRO_SAMPLES.length?MICRO_SAMPLES[samples]:"ANALYSE TERMINÉE";
      const status=contam>=80?"DANGER":contam>=55?"INSTABLE":contam>=30?"SURVEILLANCE":"STÉRILE";
      const statusIcon=contam>=80?"☣️":contam>=55?"⚠️":contam>=30?"🟠":"🧼";
      const statusColor=contam>=80?"#ff6b68":contam>=55?"#ffb45f":contam>=30?"#ffd66b":"#79e7b0";
      return <div key={p.id} style={{display:"grid",gap:7}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <b>🔬 {p.name}</b>
          <span style={{color:statusColor,fontSize:8.5,fontWeight:1100,letterSpacing:.5}}>{statusIcon} {status}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${MICRO_SAMPLES.length},minmax(0,1fr))`,gap:4}}>
          {MICRO_SAMPLES.map((sample,i)=>{const done=i<samples; const active=i===samples && samples<MICRO_SAMPLES.length; return <div key={sample} title={sample} style={{minHeight:39,borderRadius:9,padding:"4px 2px",display:"grid",placeItems:"center",gap:1,border:`1px solid ${done?accent+"99":active?accent:"rgba(255,255,255,.09)"}`,background:done?accent+"22":active?accent+"10":"rgba(255,255,255,.025)",boxShadow:active?`0 0 0 1px ${accent}22, 0 0 14px ${accent}18`:"none"}}><span style={{fontSize:15,filter:done?"none":"grayscale(.35)"}}>{done?"✅":sampleIcons[i]}</span><span style={{fontSize:6.8,fontWeight:900,color:done||active?"#f4f7fb":SOFT,textAlign:"center",lineHeight:1.05}}>{sample}</span></div>})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1.15fr .85fr",gap:6}}>
          <div style={{borderRadius:9,padding:"6px 7px",border:`1px solid ${accent}33`,background:accent+"0d"}}>
            <div style={{color:SOFT,fontSize:7.5,fontWeight:900}}>ÉCHANTILLON EN COURS</div>
            <div style={{color:accent,fontSize:10.5,fontWeight:1100,marginTop:2}}>{samples>=MICRO_SAMPLES.length?"🏁 COLLECTION COMPLÈTE":`${sampleIcons[samples]||"🧬"} ${currentSample}`}</div>
          </div>
          <div style={{borderRadius:9,padding:"6px 7px",border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.025)"}}>
            <div style={{color:SOFT,fontSize:7.5,fontWeight:900}}>QUALITÉ CUMULÉE</div>
            <div style={{fontSize:13,fontWeight:1100,marginTop:1}}>⭐ {quality}</div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:8.5,color:SOFT}}><span>Prélèvements {samples}/{MICRO_SAMPLES.length}</span><b style={{color:statusColor}}>Contamination {Math.round(contam)}%</b></div>
        <Meter value={contam} max={100} accent={statusColor}/>
        <span style={{color:contam>=80?"#ff8d86":SOFT,fontSize:8.5}}>{contam>=80?"☣️ Laboratoire critique : vise BULL pour décontaminer immédiatement":"Cible active = isoler l’échantillon · BULL = décontamination · erreur = contamination"}</span>
      </div>;
    }))}
  </div>;
}
export function DisjonctePanel({ state, accent }: any) {
  const circuitIcons=["🔋","⚙️","💡","📡","🔁","🔌"];
  return <div style={card(accent)}>{title(accent, "DISJONCTÉ · TABLEAU ÉLECTRIQUE EN DIRECT")}
    {playerGrid(state.players.map((p:any)=>{
      const step=Math.max(0,Math.min(CIRCUIT_NAMES.length,Number(state.special?.circuitStepByPlayer?.[p.id]||0)));
      const overload=Math.max(0,Math.min(110,Number(state.special?.circuitOverloadByPlayer?.[p.id]||0)));
      const activeName=step<CIRCUIT_NAMES.length?CIRCUIT_NAMES[step]:"INSTALLATION STABLE";
      const thermal=overload>=90?"COUPURE IMMINENTE":overload>=70?"SURCHARGE":overload>=40?"CHARGE ÉLEVÉE":"STABLE";
      const thermalIcon=overload>=90?"🚨":overload>=70?"🔥":overload>=40?"⚠️":"🟢";
      const thermalColor=overload>=90?"#ff5f5a":overload>=70?"#ff8a62":overload>=40?"#ffd166":"#74e7a8";
      return <div key={p.id} style={{display:"grid",gap:7}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <b>⚡ {p.name}</b>
          <span style={{color:thermalColor,fontSize:8.4,fontWeight:1100,letterSpacing:.45}}>{thermalIcon} {thermal}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${CIRCUIT_NAMES.length},minmax(0,1fr))`,gap:4}}>
          {CIRCUIT_NAMES.map((name,i)=>{const on=i<step; const active=i===step&&step<CIRCUIT_NAMES.length; return <div key={name} style={{minHeight:47,borderRadius:9,padding:"5px 2px",display:"grid",placeItems:"center",gap:2,border:`1px solid ${on?accent+"aa":active?accent:"rgba(255,255,255,.09)"}`,background:on?accent+"24":active?accent+"10":"rgba(255,255,255,.025)",boxShadow:active?`0 0 15px ${accent}18`:"none"}}>
            <span style={{fontSize:15}}>{on?"✅":circuitIcons[i]}</span>
            <span style={{fontSize:6.8,fontWeight:1000,color:on||active?"#f4f7fb":SOFT,textAlign:"center",lineHeight:1.05}}>{name}</span>
            <span style={{fontSize:6.6,fontWeight:1000,color:on?"#79e7b0":active?accent:SOFT}}>{on?"ON":active?"ACTIF":"OFF"}</span>
          </div>})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1.15fr .85fr",gap:6}}>
          <div style={{borderRadius:9,padding:"6px 7px",border:`1px solid ${accent}33`,background:accent+"0d"}}>
            <div style={{color:SOFT,fontSize:7.5,fontWeight:900}}>CIRCUIT À ALIMENTER</div>
            <div style={{color:step>=CIRCUIT_NAMES.length?"#79e7b0":accent,fontSize:10.5,fontWeight:1100,marginTop:2}}>{step>=CIRCUIT_NAMES.length?"🏁 TABLEAU COMPLET":`${circuitIcons[step]||"🔌"} ${activeName}`}</div>
          </div>
          <div style={{borderRadius:9,padding:"6px 7px",border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.025)"}}>
            <div style={{color:SOFT,fontSize:7.5,fontWeight:900}}>CIRCUITS EN SERVICE</div>
            <div style={{fontSize:13,fontWeight:1100,marginTop:1}}>{step}/{CIRCUIT_NAMES.length}</div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:8.5,color:SOFT}}><span>Charge thermique</span><b style={{color:thermalColor}}>{Math.round(overload)}%</b></div>
        <Meter value={Math.min(overload,100)} max={100} accent={thermalColor}/>
        <span style={{color:overload>=90?"#ff8b86":SOFT,fontSize:8.5,lineHeight:1.35}}>{overload>=90?"🚨 Coupure imminente : vise BULL pour refroidir avant la prochaine alimentation":"Cible active = alimenter le circuit · D/T = plus de puissance mais plus de chaleur · BULL = refroidissement"}</span>
        {overload>=100?<div style={{borderRadius:9,padding:"6px 8px",border:"1px solid #ff5f5a66",background:"#ff5f5a12",color:"#ff918d",fontSize:8.3,fontWeight:1000}}>💥 SEUIL DE DISJONCTION ATTEINT · le moteur fera retomber un circuit puis ramènera la surcharge à 45%</div>:null}
      </div>;
    }))}
  </div>;
}
export function PetitBacPanel({ state, accent }: any) {
  const active=state.players?.[state.activePlayerIndex];
  return <div style={card(accent)}>{title(accent, "📝 LE PETIT BAC · GRILLE EN DIRECT")}
    {playerGrid(state.players.map((p:any)=>{const step=Number(state.special?.bacStepByPlayer?.[p.id]||0); const n=Number(state.special?.bacSequence?.[Math.min(step,5)]||1); const letter=BAC_LETTERS[(n-1)%BAC_LETTERS.length]; const done=step>=BAC_CATEGORIES.length; return <div key={p.id} style={{display:"grid",gap:6,borderRadius:11,padding:8,border:`1px solid ${p.id===active?.id?accent+"88":"rgba(255,255,255,.08)"}`,background:p.id===active?.id?accent+"0d":"rgba(255,255,255,.02)"}}><div style={{display:"flex",justifyContent:"space-between",gap:6}}><b>📝 {p.name}</b><span style={{color:accent,fontSize:9,fontWeight:1100}}>{step}/{BAC_CATEGORIES.length}</span></div>{stepStrip(BAC_CATEGORIES,step,accent)}<div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:6,alignItems:"center"}}><div><div style={{color:SOFT,fontSize:8,fontWeight:900}}>CATÉGORIE ACTIVE</div><div style={{color:done?"#79e7b0":accent,fontSize:12,fontWeight:1100}}>{done?"✅ GRILLE TERMINÉE":BAC_CATEGORIES[step]}</div></div><div style={{minWidth:43,minHeight:43,borderRadius:12,display:"grid",placeItems:"center",border:`1px solid ${accent}66`,background:accent+"16",fontSize:19,fontWeight:1200}}>{done?"✓":letter}</div></div><span style={{color:SOFT,fontSize:8.3}}>Secteur demandé = lettre · BULL = joker · validation directe selon les réglages.</span></div>}))}
  </div>;
}: any) {
  return <div style={card(accent)}>{title(accent, "LE PETIT BAC · CATÉGORIES")}
    {playerGrid(state.players.map((p:any)=>{const step=Number(state.special?.bacStepByPlayer?.[p.id]||0); const n=Number(state.special?.bacSequence?.[Math.min(step,5)]||1); const letter=BAC_LETTERS[(n-1)%BAC_LETTERS.length]; return <div key={p.id} style={{display:"grid",gap:4}}><b>📝 {p.name}</b>{stepStrip(BAC_CATEGORIES,step,accent)}<span style={{color:accent,fontSize:11,fontWeight:1000}}>{step<BAC_CATEGORIES.length?`${BAC_CATEGORIES[step]} en ${letter}`:"GRILLE TERMINÉE"}</span><span style={{color:SOFT,fontSize:8.5}}>Dans la version finale dédiée, la réponse textuelle pourra être saisie/validée par l'arbitre.</span></div>}))}
  </div>;
}
