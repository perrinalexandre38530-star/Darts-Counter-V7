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
  return <div style={card(accent)}>{title(accent, "LE JARDINIER · CULTURES")}
    {playerGrid(state.players.map((p:any)=>{const harvest=Number(state.special?.gardenHarvestByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>🌱 {p.name}</b><span style={{color:SOFT,fontSize:9}}>Récoltes {harvest}/5 · Eau {state.special?.gardenWaterByPlayer?.[p.id]||0}%</span><Meter value={state.special?.gardenGrowthByPlayer?.[p.id]||0} max={100} accent={accent}/><span style={{color:SOFT,fontSize:8.5}}>Croissance de la plante actuelle</span></div>}))}
  </div>;
}
export function MicroscopiaPanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "MICROSCOPIA · LABORATOIRE")}
    {playerGrid(state.players.map((p:any)=>{const samples=Number(state.special?.microSamplesByPlayer?.[p.id]||0); const contam=Number(state.special?.microContaminationByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>🔬 {p.name}</b>{stepStrip(MICRO_SAMPLES,samples,accent)}<span style={{color:SOFT,fontSize:9}}>Qualité {state.special?.microQualityByPlayer?.[p.id]||0} · Contamination {contam}%</span><Meter value={contam} max={100} accent="#ff6b68"/></div>}))}
  </div>;
}
export function DisjonctePanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "DISJONCTÉ · TABLEAU ÉLECTRIQUE")}
    {playerGrid(state.players.map((p:any)=>{const step=Number(state.special?.circuitStepByPlayer?.[p.id]||0); const overload=Number(state.special?.circuitOverloadByPlayer?.[p.id]||0); return <div key={p.id} style={{display:"grid",gap:4}}><b>⚡ {p.name}</b>{stepStrip(CIRCUIT_NAMES,step,accent)}<span style={{color:SOFT,fontSize:9}}>Surcharge {overload}%</span><Meter value={overload} max={100} accent={overload>=75?"#ff6b68":accent}/></div>}))}
  </div>;
}
export function PetitBacPanel({ state, accent }: any) {
  return <div style={card(accent)}>{title(accent, "LE PETIT BAC · CATÉGORIES")}
    {playerGrid(state.players.map((p:any)=>{const step=Number(state.special?.bacStepByPlayer?.[p.id]||0); const n=Number(state.special?.bacSequence?.[Math.min(step,5)]||1); const letter=BAC_LETTERS[(n-1)%BAC_LETTERS.length]; return <div key={p.id} style={{display:"grid",gap:4}}><b>📝 {p.name}</b>{stepStrip(BAC_CATEGORIES,step,accent)}<span style={{color:accent,fontSize:11,fontWeight:1000}}>{step<BAC_CATEGORIES.length?`${BAC_CATEGORIES[step]} en ${letter}`:"GRILLE TERMINÉE"}</span><span style={{color:SOFT,fontSize:8.5}}>Dans la version finale dédiée, la réponse textuelle pourra être saisie/validée par l'arbitre.</span></div>}))}
  </div>;
}
