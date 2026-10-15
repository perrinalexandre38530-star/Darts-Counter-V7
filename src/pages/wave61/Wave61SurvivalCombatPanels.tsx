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
    <Grid>{state.players.map((p:any)=>{const hawk=state.special?.epervierRoleByPlayer?.[p.id]==="HAWK"; const crossing=Number(state.special?.epervierCrossingByPlayer?.[p.id]||0); const goal=Number(state.config?.modeOptions?.crossingGoal||100); return <div key={p.id} style={miniCard(hawk?"#ffc35e":accent)}><b>{hawk?"🦅":"🏃"} {p.name}</b>{!hawk?<Meter value={crossing} max={goal} accent={accent}/>:null}<span style={{color:SOFT,fontSize:9}}>{hawk?"ÉPERVIER":`Traversée ${crossing}/${goal}`} · {state.special?.epervierCaughtByPlayer?.[p.id]||0} touche(s)</span></div>})}</Grid>
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
    <Grid>{state.players.map((p:any)=>{const hull=Number(state.special?.icebergHullByPlayer?.[p.id]||0); const water=Number(state.special?.icebergFloodByPlayer?.[p.id]||0); return <div key={p.id} style={miniCard(accent)}><b>🚢 {p.name}</b><Meter value={hull} max={100} accent={accent}/><span style={{color:SOFT,fontSize:9}}>Coque {hull}% · Eau {water}% · {state.special?.icebergCompartmentsByPlayer?.[p.id]||0}/{state.config?.modeOptions?.compartmentGoal||5} compartiments</span></div>})}</Grid>
  </div>;
}

const JURASSIC_STAGES = [
  { min: 0, icon: "⛺", label: "CAMP" },
  { min: 20, icon: "🦴", label: "FOSSILES" },
  { min: 40, icon: "🧬", label: "ADN" },
  { min: 60, icon: "🚧", label: "ENCLOS" },
  { min: 80, icon: "🚁", label: "ÉVASION" },
];

function jurassicThreatState(threat: number, threshold: number) {
  if (threat >= threshold) return { label: "ATTAQUE !", icon: "🦖", color: "#ff5858" };
  if (threat >= threshold * .8) return { label: "ATTAQUE IMMINENTE", icon: "🦖", color: "#ff7a61" };
  if (threat >= threshold * .55) return { label: "PRÉDATEURS EN APPROCHE", icon: "🦎", color: "#ffbf62" };
  if (threat >= threshold * .3) return { label: "VIGILANCE", icon: "👀", color: "#ffe47a" };
  return { label: "ZONE CALME", icon: "🦕", color: "#78ef9c" };
}

export function JurassicPanel({ state, accent }: any) {
  const active = state.players?.[state.activePlayerIndex] || state.players?.[0];
  const activeId = active?.id;
  const progress = Math.max(0, Math.min(100, Number(state.special?.jurassicProgressByPlayer?.[activeId] || 0)));
  const threat = Math.max(0, Number(state.special?.jurassicThreatByPlayer?.[activeId] || 0));
  const security = Math.max(0, Math.min(100, Number(state.special?.jurassicSecurityByPlayer?.[activeId] ?? 100)));
  const threshold = Math.max(1, Number(state.config?.modeOptions?.attackThreshold || 100));
  const tranq = Math.max(1, Number(state.config?.modeOptions?.tranquilizerPower || 22));
  const threatState = jurassicThreatState(threat, threshold);
  const sequence = Array.isArray(state.special?.jurassicSequence) ? state.special.jurassicSequence : [];
  const targetIndex = Math.floor(progress / 5);
  const sector = Number(sequence[targetIndex % Math.max(1, sequence.length)] || 0);
  const currentStage = Math.min(JURASSIC_STAGES.length - 1, Math.floor(progress / 20));
  const attackPct = Math.min(100, Math.round((threat / threshold) * 100));
  const dbullTranq = Math.round(tranq * 1.6);

  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display: "grid", gap: 9 }}>
    <Title accent={accent} right={`${Math.round(progress)}% · ${threatState.icon} ${threatState.label}`}>🦖 JURASSIC DART · EXPÉDITION EN DIRECT</Title>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(150px,.7fr)", gap: 8 }}>
      <div style={{ ...miniCard(accent, true), padding: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div>
            <div style={{ color: SOFT, fontSize: 8.5, fontWeight: 900, letterSpacing: .7 }}>MISSION DE {String(active?.name || "EXPLORATEUR").toUpperCase()}</div>
            <div style={{ color: "#fff", fontSize: 17, fontWeight: 1100, marginTop: 2 }}>{sector ? `🎯 SECTEUR ${sector}` : "🎯 SECTEUR À IDENTIFIER"}</div>
          </div>
          <div style={{ minWidth: 58, minHeight: 58, borderRadius: 16, display: "grid", placeItems: "center", background: `${accent}18`, border: `1px solid ${accent}55`, fontSize: 29 }}>🧭</div>
        </div>
        <Meter value={progress} max={100} accent={accent}/>
        <div style={{ color: SOFT, fontSize: 9, lineHeight: 1.45 }}>Touche le secteur actif pour faire avancer l’expédition. Plus la touche est forte, plus tu progresses vite.</div>
      </div>

      <div style={{ ...miniCard(threatState.color, threat >= threshold * .8), padding: 10 }}>
        <div style={{ color: threatState.color, fontSize: 9, fontWeight: 1100, letterSpacing: .7 }}>MENACE DINOSAURES</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 }}><b style={{ fontSize: 20 }}>{Math.round(threat)}</b><span style={{ color: SOFT, fontSize: 9 }}>/ {threshold}</span></div>
        <Meter value={threat} max={threshold} accent={threatState.color}/>
        <div style={{ color: threatState.color, fontSize: 9, fontWeight: 1000 }}>{threatState.icon} {threatState.label} · {attackPct}% du seuil</div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: `repeat(${JURASSIC_STAGES.length},minmax(0,1fr))`, gap: 5 }}>
      {JURASSIC_STAGES.map((stage, i) => {
        const done = progress >= stage.min + 20 || progress >= 100;
        const activeStage = i === currentStage && progress < 100;
        return <div key={stage.label} style={{ borderRadius: 11, minHeight: 55, padding: "7px 5px", display: "grid", placeItems: "center", textAlign: "center", gap: 2, border: `1px solid ${done ? accent + "77" : activeStage ? accent : "rgba(255,255,255,.08)"}`, background: done ? `${accent}18` : activeStage ? `${accent}0f` : "rgba(255,255,255,.025)", boxShadow: activeStage ? `0 0 18px ${accent}22` : "none" }}>
          <span style={{ fontSize: 18 }}>{done ? "✅" : stage.icon}</span>
          <b style={{ color: done || activeStage ? "#fff" : SOFT, fontSize: 8.2 }}>{stage.label}</b>
        </div>;
      })}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
      <div style={miniCard(security <= 35 ? "#ff6262" : security <= 65 ? "#ffc35e" : "#79e798", security <= 35)}>
        <span style={{ color: SOFT, fontSize: 8.5, fontWeight: 900 }}>🛡️ SÉCURITÉ DU CAMP</span>
        <b style={{ fontSize: 18 }}>{Math.round(security)}%</b>
        <Meter value={security} max={100} accent={security <= 35 ? "#ff6262" : security <= 65 ? "#ffc35e" : "#79e798"}/>
      </div>
      <div style={miniCard("#70d9ff")}>
        <span style={{ color: SOFT, fontSize: 8.5, fontWeight: 900 }}>💉 TRANQUILLISANT</span>
        <b style={{ fontSize: 16 }}>BULL −{tranq}</b>
        <span style={{ color: SOFT, fontSize: 8.8 }}>DBULL −{dbullTranq} menace</span>
      </div>
      <div style={miniCard("#ff856f")}>
        <span style={{ color: SOFT, fontSize: 8.5, fontWeight: 900 }}>⚠️ EN CAS D’ATTAQUE</span>
        <b style={{ fontSize: 16 }}>−{Number(state.config?.modeOptions?.securityDamage || 52)} sécurité</b>
        <span style={{ color: SOFT, fontSize: 8.8 }}>La menace retombe ensuite à 35%</span>
      </div>
    </div>

    <Grid>{state.players.map((p:any)=>{
      const pp=Math.max(0,Math.min(100,Number(state.special?.jurassicProgressByPlayer?.[p.id]||0)));
      const pt=Math.max(0,Number(state.special?.jurassicThreatByPlayer?.[p.id]||0));
      const ps=Math.max(0,Math.min(100,Number(state.special?.jurassicSecurityByPlayer?.[p.id]??100)));
      const pts=jurassicThreatState(pt,threshold);
      return <div key={p.id} style={miniCard(pts.color,p.id===activeId)}><div style={{display:"flex",justifyContent:"space-between",gap:6}}><b>{p.id===activeId?"🧭":"🦕"} {p.name}</b><span style={{color:pts.color,fontSize:8.5,fontWeight:1000}}>{pts.icon}</span></div><Meter value={pp} max={100} accent={accent}/><span style={{color:SOFT,fontSize:9}}>Expédition {Math.round(pp)}% · Menace {Math.round(pt)} · Sécurité {Math.round(ps)}%</span></div>;
    })}</Grid>

    <div style={{ borderRadius: 10, padding: "7px 9px", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", color: SOFT, fontSize: 8.8, lineHeight: 1.45 }}><b style={{color:"#fff"}}>RÉFLEXE SURVIE :</b> secteur actif = progression · erreur = menace · <b style={{color:"#70d9ff"}}>BULL/DBULL = tranquillisant</b>. Ne laisse pas la menace atteindre le seuil d’attaque.</div>
  </div>;
}

export function ApocalypsePanel({ state, accent }: any) {
  const goal=Math.max(1,Number(state.config?.modeOptions?.refugeGoal||100)); const disaster=Math.max(1,Number(state.config?.modeOptions?.disasterThreshold||85)); const active=state.players?.[state.activePlayerIndex];
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display:"grid",gap:8 }}><Title accent={accent} right={`REFUGE OBJECTIF ${goal}`}>☢️ APOCALYPSE · SURVIE DU REFUGE</Title><Grid>{state.players.map((p:any)=>{const refuge=Math.max(0,Number(state.special?.apocalypseRefugeByPlayer?.[p.id]||0));const threat=Math.max(0,Number(state.special?.apocalypseThreatByPlayer?.[p.id]||0));const resources=Number(state.special?.apocalypseResourcesByPlayer?.[p.id]||0);const pv=Number(state.health[p.id]||0);const status=threat>=disaster?"💥 CATASTROPHE":threat>=disaster*.75?"🚨 DANGER":threat>=disaster*.45?"⚠️ INSTABLE":"🟢 STABLE";const dangerColor=threat>=disaster*.75?"#ff675f":threat>=disaster*.45?"#ffc35e":accent;return <div key={p.id} style={miniCard(dangerColor,p.id===active?.id)}><div style={{display:"flex",justifyContent:"space-between",gap:6}}><b>🏚️ {p.name}</b><span style={{color:dangerColor,fontSize:8,fontWeight:1100}}>{status}</span></div><span style={{color:SOFT,fontSize:8}}>REFUGE</span><Meter value={refuge} max={goal} accent={accent}/><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,textAlign:"center"}}><span style={{borderRadius:7,padding:4,background:"rgba(255,255,255,.03)",fontSize:8}}>🧱 {Math.round(refuge)}/{goal}</span><span style={{borderRadius:7,padding:4,background:"rgba(255,255,255,.03)",fontSize:8}}>📦 {resources}</span><span style={{borderRadius:7,padding:4,background:"rgba(255,255,255,.03)",fontSize:8}}>❤️ {pv}</span></div><span style={{color:SOFT,fontSize:8}}>MENACE {Math.round(threat)}/{disaster}</span><Meter value={threat} max={disaster} accent={dangerColor}/></div>})}</Grid><div style={{color:SOFT,fontSize:8.5}}>Zones sûres = refuge/ressources · erreurs = menace · BULL = medkit. Si la menace atteint le seuil, catastrophe, dégâts et recul du refuge.</div></div>;
}

export function KnockbackPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent} right={`OBJECTIF EXACT ${state.config.goal}`}>💥 KNOCKBACK</Title>
    <Grid>{state.players.map((p:any)=><div key={p.id} style={miniCard(accent)}><b>{p.name}</b><Meter value={state.scores[p.id]||0} max={state.config.goal||301} accent={accent}/><span style={{color:SOFT,fontSize:9}}>{Math.round(Number(state.scores[p.id]||0))}/{state.config.goal} · collision = retour à 0</span></div>)}</Grid>
  </div>;
}

export function SpartacusPanel({ state, accent }: any) {
  const active=state.players?.[state.activePlayerIndex]; const guardCap=Math.max(1,Number(state.config?.modeOptions?.guardCap||60));
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display:"grid",gap:8 }}><Title accent={accent} right="BULL = GARDE">🏛️ SPARTACUS · ARÈNE DES GLADIATEURS</Title><Grid>{state.players.map((p:any)=>{const hp=Math.max(0,Number(state.health[p.id]||0));const armor=Number(state.special?.spartacusArmorByPlayer?.[p.id]||0);const guard=Number(state.special?.spartacusGuardByPlayer?.[p.id]||0);const glory=Number(state.special?.spartacusGloryByPlayer?.[p.id]||0);const out=!!state.eliminated?.[p.id]||hp<=0;return <div key={p.id} style={{...miniCard(out?"#777":accent,p.id===active?.id),opacity:out ? .55 : 1}}><div style={{display:"flex",justifyContent:"space-between",gap:5}}><b>{out?"☠️":"⚔️"} {p.name}</b><span style={{color:p.id===active?.id?accent:SOFT,fontSize:8,fontWeight:1100}}>{out?"ÉLIMINÉ":p.id===active?.id?"COMBAT":"EN GARDE"}</span></div><span style={{color:SOFT,fontSize:8}}>PV {Math.round(hp)}/100</span><Meter value={hp} max={100} accent={hp<=30?"#ff6767":accent}/><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,textAlign:"center"}}><span style={{fontSize:8}}>🛡️ {armor}</span><span style={{fontSize:8}}>🤺 {guard}/{guardCap}</span><span style={{fontSize:8}}>🏆 {glory}</span></div><Meter value={guard} max={guardCap} accent="#70d6ff"/><span style={{color:SOFT,fontSize:7.8}}>Touches de cible = gloire + attaque · la garde absorbe les dégâts entrants.</span></div>})}</Grid></div>;
}

export function CosmoKnightsPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <Title accent={accent}>🌌 COSMO KNIGHTS</Title>
    <Grid>{state.players.map((p:any)=>{const charge=Number(state.special?.cosmoChargeByPlayer?.[p.id]||0); return <div key={p.id} style={miniCard(charge>=100?"#ffe76b":accent)}><b>✨ {p.name}</b><Meter value={state.health[p.id]||0} max={100} accent={accent}/><span style={{color:SOFT,fontSize:9}}>PV {state.health[p.id]||0} · Cosmos {charge}% · Bouclier {state.special?.cosmoShieldByPlayer?.[p.id]||0} · Burst {state.special?.cosmoBurstsByPlayer?.[p.id]||0}</span></div>})}</Grid>
  </div>;
}
