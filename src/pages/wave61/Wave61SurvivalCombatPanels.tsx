// @ts-nocheck
import React from "react";
import { Meter, SOFT, panelStyle } from "../newModes/newModePlayShared";

function miniCard(accent: string, active = false): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: 9,
    border: `1px solid ${active ? accent + "88" : "rgba(255,255,255,.09)"}`,
    background: active ? `${accent}12` : "rgba(255,255,255,.025)",
    display: "grid",
    gap: 5,
  };
}

function Grid({ children }: any) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 7 }}>{children}</div>;
}

function Title({ children, accent, right }: any) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}><div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .8 }}>{children}</div>{right ? <div style={{ color: SOFT, fontSize: 9, fontWeight: 900 }}>{right}</div> : null}</div>;
}

export function HotPotatoPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent} right={`MÈCHE ${state.special?.hotPotatoFuse || 0}`}>🥔 HOT POTATO</Title>
    <div style={{ fontSize: 24, textAlign: "center", marginBottom: 8 }}>{"🔥".repeat(Math.max(1, Math.min(6, Number(state.special?.hotPotatoFuse || 0))))}</div>
    <Grid>{state.players.map((p: any) => <div key={p.id} style={miniCard(accent, state.players[state.activePlayerIndex]?.id === p.id)}><b>{p.name}</b><span style={{ color: SOFT, fontSize: 9 }}>{state.lives[p.id] || 0} vie(s) · {state.special?.hotPotatoPassesByPlayer?.[p.id] || 0} passe(s) · {state.special?.hotPotatoExplosionsByPlayer?.[p.id] || 0} explosion(s)</span></div>)}</Grid>
  </div>;
}

export function ZombieSiegePanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent} right={`${state.players.filter((p:any)=>state.special?.zombieRoleByPlayer?.[p.id]==="ZOMBIE").length} zombie(s)`}>🧟 ZOMBIE SIEGE</Title>
    <Grid>{state.players.map((p: any) => { const zombie=state.special?.zombieRoleByPlayer?.[p.id]==="ZOMBIE"; const infection=Number(state.special?.zombieInfectionByPlayer?.[p.id]||0); return <div key={p.id} style={miniCard(zombie?"#8dff79":accent)}><b>{zombie?"🧟":"🧍"} {p.name}</b><Meter value={infection} max={100} accent={zombie?"#8dff79":"#ff7b7b"}/><span style={{color:SOFT,fontSize:9}}>Infection {infection}% · Barricade {state.special?.zombieBarricadeByPlayer?.[p.id]||0}%</span></div>; })}</Grid>
  </div>;
}

export function LoupPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent}>🐺 LE LOUP</Title>
    <Grid>{state.players.map((p:any)=>{const wolf=state.special?.loupId===p.id; return <div key={p.id} style={miniCard(wolf?"#ff9d5c":accent,wolf)}><b>{wolf?"🐺":"🏃"} {p.name}</b><span style={{color:SOFT,fontSize:9}}>{wolf?"LE LOUP":`${state.lives[p.id]||0} vie(s)`} · {state.special?.loupCaughtByPlayer?.[p.id]||0} capture(s){state.special?.loupProtectedByPlayer?.[p.id]?" · ✨ protégé":""}</span></div>})}</Grid>
  </div>;
}

export function EperviersPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent}>🦅 LES ÉPERVIERS</Title>
    <Grid>{state.players.map((p:any)=>{const hawk=state.special?.epervierRoleByPlayer?.[p.id]==="HAWK"; const crossing=Number(state.special?.epervierCrossingByPlayer?.[p.id]||0); return <div key={p.id} style={miniCard(hawk?"#ffc35e":accent)}><b>{hawk?"🦅":"🏃"} {p.name}</b>{!hawk?<Meter value={crossing} max={100} accent={accent}/>:null}<span style={{color:SOFT,fontSize:9}}>{hawk?"ÉPERVIER":`Traversée ${crossing}/100`} · {state.special?.epervierCaughtByPlayer?.[p.id]||0} touche(s)</span></div>})}</Grid>
  </div>;
}

export function DodgeballPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent}>🏐 BALLON PRISONNIER</Title>
    <Grid>{state.players.map((p:any)=>{const prisoner=!!state.special?.dodgePrisonerByPlayer?.[p.id]; return <div key={p.id} style={miniCard(prisoner?"#ff7070":accent)}><b>{prisoner?"🔒":"🏐"} {p.name}</b><Meter value={state.health[p.id]||0} max={100} accent={prisoner?"#ff7070":accent}/><span style={{color:SOFT,fontSize:9}}>{prisoner?"PRISONNIER":"LIBRE"} · bouclier {state.special?.dodgeShieldByPlayer?.[p.id]||0} · {state.special?.dodgeHitsByPlayer?.[p.id]||0} touche(s)</span></div>})}</Grid>
  </div>;
}

export function IcebergPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent}>🧊 ICEBERG</Title>
    <Grid>{state.players.map((p:any)=>{const hull=Number(state.special?.icebergHullByPlayer?.[p.id]||0); const water=Number(state.special?.icebergFloodByPlayer?.[p.id]||0); return <div key={p.id} style={miniCard(accent)}><b>🚢 {p.name}</b><Meter value={hull} max={100} accent={accent}/><span style={{color:SOFT,fontSize:9}}>Coque {hull}% · Eau {water}% · {state.special?.icebergCompartmentsByPlayer?.[p.id]||0}/5 compartiments</span></div>})}</Grid>
  </div>;
}

export function JurassicPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent}>🦖 JURASSIC DART</Title>
    <Grid>{state.players.map((p:any)=>{const progress=Number(state.special?.jurassicProgressByPlayer?.[p.id]||0); const threat=Number(state.special?.jurassicThreatByPlayer?.[p.id]||0); return <div key={p.id} style={miniCard(threat>=80?"#ff6d6d":accent)}><b>🦕 {p.name}</b><Meter value={progress} max={100} accent={accent}/><span style={{color:SOFT,fontSize:9}}>Expédition {progress}% · Menace {threat}% · Sécurité {state.special?.jurassicSecurityByPlayer?.[p.id]||0}%</span></div>})}</Grid>
  </div>;
}

export function ApocalypsePanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent}>☢️ APOCALYPSE</Title>
    <Grid>{state.players.map((p:any)=>{const refuge=Number(state.special?.apocalypseRefugeByPlayer?.[p.id]||0); const threat=Number(state.special?.apocalypseThreatByPlayer?.[p.id]||0); return <div key={p.id} style={miniCard(threat>=80?"#ff775f":accent)}><b>🏚️ {p.name}</b><Meter value={refuge} max={100} accent={accent}/><span style={{color:SOFT,fontSize:9}}>Refuge {refuge}% · Ressources {state.special?.apocalypseResourcesByPlayer?.[p.id]||0} · Menace {threat}% · PV {state.health[p.id]||0}</span></div>})}</Grid>
  </div>;
}

export function KnockbackPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent} right={`OBJECTIF EXACT ${state.config.goal}`}>💥 KNOCKBACK</Title>
    <Grid>{state.players.map((p:any)=><div key={p.id} style={miniCard(accent)}><b>{p.name}</b><Meter value={state.scores[p.id]||0} max={state.config.goal||301} accent={accent}/><span style={{color:SOFT,fontSize:9}}>{Math.round(Number(state.scores[p.id]||0))}/{state.config.goal} · collision = retour à 0</span></div>)}</Grid>
  </div>;
}

export function SpartacusPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent}>🏛️ SPARTACUS</Title>
    <Grid>{state.players.map((p:any)=><div key={p.id} style={miniCard(accent)}><b>⚔️ {p.name}</b><Meter value={state.health[p.id]||0} max={100} accent={accent}/><span style={{color:SOFT,fontSize:9}}>PV {state.health[p.id]||0} · Armure {state.special?.spartacusArmorByPlayer?.[p.id]||0} · Garde {state.special?.spartacusGuardByPlayer?.[p.id]||0} · Gloire {state.special?.spartacusGloryByPlayer?.[p.id]||0}</span></div>)}</Grid>
  </div>;
}

export function CosmoKnightsPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent}>🌌 COSMO KNIGHTS</Title>
    <Grid>{state.players.map((p:any)=>{const charge=Number(state.special?.cosmoChargeByPlayer?.[p.id]||0); return <div key={p.id} style={miniCard(charge>=100?"#ffe76b":accent)}><b>✨ {p.name}</b><Meter value={state.health[p.id]||0} max={100} accent={accent}/><span style={{color:SOFT,fontSize:9}}>PV {state.health[p.id]||0} · Cosmos {charge}% · Bouclier {state.special?.cosmoShieldByPlayer?.[p.id]||0} · Burst {state.special?.cosmoBurstsByPlayer?.[p.id]||0}</span></div>})}</Grid>
  </div>;
}
