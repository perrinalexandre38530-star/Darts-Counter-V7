// @ts-nocheck
import React from "react";
import MssGros6AwenaTip from "../components/config/MssGros6AwenaTip";
import MssLivesHeartChoice from "../components/config/MssLivesHeartChoice";
import MssGros6InputSelector from "../components/config/MssGros6InputSelector";
import MssSelectorIconButton from "../components/MssSelectorIconButton";
import MssGuidedAudioPanel from "../components/config/MssGuidedAudioPanel";
import { useTheme } from "../contexts/ThemeContext";
import MssKillerBooleanToggle from "../components/config/MssKillerBooleanToggle";
import { MssGolfInputMethodSelector, MssGolfAwenaTip } from "../components/config/MssGolfInputAndTips";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import { makeGros6Segment } from "../lib/gros6Engine";
import {
  MssQuickPlayers,
  MssQuickPanel,
  MssQuickChoices,
  MssQuickRecap,
  MssQuickStart,
  MssQuickStartOrder,
  type QuickParticipantMode,
  type QuickStartOrderMode,
} from "../components/config/MssGolfQuickControls";

type Mode = "gros_6" | "warfare" | "prisoner" | "golf";
const QUICK_TEAM_KEYS = ["gold", "pink", "blue", "green"] as const;

function buildQuickGolfTeamAssignments(roster: any[], teamCount: number) {
  const keys = QUICK_TEAM_KEYS.slice(0, Math.max(2, Math.min(4, teamCount)));
  return Object.fromEntries(roster.map((player, index) => [player.id, keys[index % keys.length]]));
}

function getQuickStartLabel(mode: QuickStartOrderMode) {
  if (mode === "random") return "Aléatoire";
  if (mode === "alternate") return "Alterné";
  if (mode === "bull") return "Bull";
  return "Manuel";
}

export default function QuickIndependentDartsConfig({ modeId, onBack, go }: {modeId:Mode;onBack:()=>void;go:(route:string,params?:any)=>void}) {
  const { theme } = useTheme();
  const golfAccent = theme?.primary || "#f5c257";
  const [session] = React.useState(() => `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`);
  const [count,setCount] = React.useState(2);
  const [names,setNames] = React.useState(Array.from({length:12},(_,i)=>`J${i+1}`));
  const [lives,setLives] = React.useState(6);
  const [grosQuickStep,setGrosQuickStep] = React.useState(0);
  const grosSteps = ["Participants", "Vies et règles", "Zones et bonus", "Départ et saisie", "Mode audio", "Récapitulatif"];
  const [grosArcadeAudio,setGrosArcadeAudio] = React.useState(true);
  const [grosHitsAudio,setGrosHitsAudio] = React.useState(true);
  const [grosVoiceAudio,setGrosVoiceAudio] = React.useState(true);
  const [grosVoiceId,setGrosVoiceId] = React.useState("awena");
  const [grosInput,setGrosInput] = React.useState<"keypad"|"voice">("keypad");
  const [grosTeamMode,setGrosTeamMode] = React.useState<QuickParticipantMode>("duel");
  const [grosStrict,setGrosStrict] = React.useState(true);
  const [grosBull,setGrosBull] = React.useState(true);
  const [grosZones,setGrosZones] = React.useState(false);
  const [grosBonus,setGrosBonus] = React.useState(true);
  const [grosBonusCount,setGrosBonusCount] = React.useState(3);

  const [darts,setDarts] = React.useState(3);
  const [holes,setHoles] = React.useState(9);
  const [golfHoleOrder, setGolfHoleOrder] = React.useState<"chronological" | "random">("chronological");
  const [golfScoring, setGolfScoring] = React.useState<"strokes" | "points">("strokes");
  const [golfMissPenalty, setGolfMissPenalty] = React.useState(5);
  const [golfShowGrid, setGolfShowGrid] = React.useState(true);
  const [golfInput, setGolfInput] = React.useState<"keypad" | "dartboard">("keypad");
  const [golfAudio, setGolfAudio] = React.useState(true);
  const [zoneRule,setZoneRule] = React.useState("ANY");
  const [order,setOrder] = React.useState<QuickStartOrderMode>("manual");
  const [golfParticipantsMode, setGolfParticipantsMode] = React.useState<QuickParticipantMode>("duel");
  const [golfTeamCount, setGolfTeamCount] = React.useState(2);
  // La partie rapide GOLF est un parcours de 4 étapes, sans écran complet parallèle.
  const [golfQuickStep, setGolfQuickStep] = React.useState(0);
  const golfQuickSteps = ["Participants", "Parcours", "Options", "Récapitulatif"];
  const goGolfStep = (next: number) => {
    setGolfQuickStep(Math.max(0, Math.min(golfQuickSteps.length - 1, next)));
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  };
  const title = {gros_6:"GROS 6",warfare:"WARFARE",prisoner:"PRISONER",golf:"GOLF"}[modeId];
  const max = modeId === "gros_6" ? 10 : modeId === "golf" ? 8 : 12;

  React.useEffect(() => {
    if (modeId !== "gros_6") return;
    if (grosTeamMode === "duel" && count !== 2) setCount(2);
    if (grosTeamMode === "teams" && count !== 4) setCount(4);
    if (grosTeamMode === "multi" && count < 3) setCount(3);
  }, [modeId, grosTeamMode, count]);

  React.useEffect(() => {
    if (modeId !== "golf") return;
    if (golfParticipantsMode === "duel" && count !== 2) setCount(2);
    if (golfParticipantsMode === "multi" && count < 3) setCount(3);
    if (golfParticipantsMode === "teams" && count < 2) setCount(2);
  }, [modeId, golfParticipantsMode, count]);

  React.useEffect(() => {
    if (modeId !== "golf") return;
    const maxTeamsAllowed = Math.max(2, Math.min(4, count));
    if (golfTeamCount > maxTeamsAllowed) setGolfTeamCount(maxTeamsAllowed);
    if (golfTeamCount < 2) setGolfTeamCount(2);
  }, [modeId, count, golfTeamCount]);

  const players = () => names.slice(0, count).map((value, i) => ({
    id: `${session}-p${i + 1}`, profileId: null, temporaryPlayerId: `${session}-p${i + 1}`,
    isTemporary: true, isBot: false, name: value.trim() || `J${i + 1}`,
    avatarDataUrl: quickPartyAvatar(i, session), avatarUrl: quickPartyAvatar(i, session), dartSetId: null,
  }));
  const quickMeta={quickParty:true,partyMode:"quick",temporaryParticipants:true,profileStatsDeferred:true};

  function launch() {
    const roster=players();
    if (modeId === "gros_6") {
      const teamsEnabled=grosTeamMode==="teams";
      const teamGroups=teamsEnabled?[
        {id:`${session}-gold`,name:"TEAM GOLD",color:"#ffd75a",players:roster.filter((_,i)=>i%2===0)},
        {id:`${session}-pink`,name:"TEAM PINK",color:"#ff59d6",players:roster.filter((_,i)=>i%2===1)},
      ]:undefined;
      const config={...quickMeta,id:`gros6-quick-${Date.now()}`,mode:"gros_6",createdAt:Date.now(),participantMode:teamsEnabled?"teams":"players",teamsSourceMode:teamsEnabled?"manual":undefined,teamLifeMode:teamsEnabled?"individual":undefined,teams:teamGroups,startingLives:lives,targetRule:grosStrict?"strict":"value",allowBull:grosBull,allowSpecialZones:grosZones,allowOuterRing:false,selectionPolicy:"open",startingTargetMode:"s6",startingTarget:makeGros6Segment("S",6),randomStartOrder:order==="random",startOrderMode:order,thirdDartBonusSelection:grosBonus,thirdDartBonusCount:grosBonusCount,scoreInputDefaultMethod:grosInput,presetId:"custom",audio:{arcadeEnabled:grosArcadeAudio,hitEnabled:grosHitsAudio,voiceEnabled:grosVoiceAudio,voiceId:grosVoiceId},arcadeEnabled:grosArcadeAudio,hitEnabled:grosHitsAudio,voiceEnabled:grosVoiceAudio,voiceId:grosVoiceId,players:roster};
      go("gros_6_play",{config,...quickMeta});return;
    }
    if (modeId === "warfare") {
      const teams={TOP:roster.filter((_,i)=>i%2===0),BOTTOM:roster.filter((_,i)=>i%2===1)};
      go("warfare_play",{config:{teams,zoneRule,friendlyFire:false,handicapTopHarder:false,layout:"TOP_BOTTOM",bullRule:"NONE",...quickMeta},...quickMeta});return;
    }
    const selectedIds=roster.map(p=>p.id);
    if (modeId === "golf") {
      const teamsEnabled = golfParticipantsMode === "teams";
      const config={players:count,selectedIds,quickPlayers:roster,holes,teamsEnabled,botsEnabled:false,missStrokes:golfMissPenalty,holeOrderMode:golfHoleOrder,scoringMode:golfScoring,startOrderMode:order,showHoleGrid:golfShowGrid,scoreInputMethod:golfInput,audioEnabled:golfAudio,
        teamCount: teamsEnabled ? golfTeamCount : undefined,
        teamAssignments: teamsEnabled ? buildQuickGolfTeamAssignments(roster, golfTeamCount) : undefined,
        ...quickMeta};
      go("golf_play",{config,...quickMeta});return;
    }
    const config={mode:"prisoner",participantMode:"players",players:count,selectedIds,playersList:roster,teamConfigs:[],playerDartSets:{},botIds:[],botsEnabled:false,botLevel:"normal",startingDarts:darts,sequenceMode:"clockwise",bullCaptureRule:"bull",missPenaltyEnabled:true,eliminationEnabled:true,randomOrder:order==="random",startOrderMode:order,scoreInputMethod:"keypad",...quickMeta};
    go("prisoner_play",{...config,...quickMeta});
  }

  const detail = modeId === "gros_6" ? `Vies : ${lives}` : modeId === "golf" ? `${holes} trous` : modeId === "prisoner" ? `Fléchettes : ${darts}` : `Zones : ${zoneRule}`;
  const golfIsTeams = modeId === "golf" && golfParticipantsMode === "teams";
  const recapEntries = modeId === "golf"
    ? [
        ["Format", golfIsTeams ? `${count} participants en équipes` : count === 2 ? "Duel" : `${count} participants`],
        ["Participants", count],
        ["Parcours", `${holes} trous`],
        ["Équipes", golfIsTeams ? `${golfTeamCount} équipes · répartition auto` : "Individuel"],
        ["Départ", getQuickStartLabel(order)],
        ["Ordre des trous", golfHoleOrder === "random" ? "Aléatoire" : "Chronologique"],
        ["Scoring", golfScoring === "strokes" ? "Strokes" : "Points"],
        ["Pénalité MISS", `${golfMissPenalty} coups`],
        ["Grille", golfShowGrid ? "Visible" : "Masquée"],
        ["Saisie", golfInput === "keypad" ? "Keypad" : "Cible"],
        ["Audio", golfAudio ? "Activé" : "Désactivé"],
      ]
    : modeId === "gros_6" ? [["Format",grosTeamMode==="teams"?"2 équipes × 2":grosTeamMode==="duel"?"Duel":"Multi"],["Participants",count],["Vies",lives],["Validation",grosStrict?"S/D/T stricts":"Valeur libre"],["Bull",grosBull?"ON":"OFF"],["Zones spéciales",grosZones?"ON":"OFF"],["Bonus 3e fléchette",grosBonus?`${grosBonusCount} fléchettes`:"OFF"],["Départ",getQuickStartLabel(order)],["Saisie",grosInput.toUpperCase()],["Audio",[grosArcadeAudio?"Arcade":null,grosHitsAudio?"Bruitages":null,grosVoiceAudio?"Annonces":null].filter(Boolean).join(" · ")||"OFF"]]
    : [["Participants", count], ["Réglage", detail], ["Départ", modeId === "warfare" ? "Armées TOP / BOTTOM" : getQuickStartLabel(order)]];

  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ color: "white", minHeight: "100dvh", padding: "0 12px 100px", background: "#050710" }}>
    <DartsQuickHeader modeId={modeId} title={title} onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title={title} />
      {modeId === "gros_6" ? <>
        <nav aria-label="Étapes partie rapide GROS 6" style={{border:`1px solid ${golfAccent}55`,background:"rgba(9,12,24,.94)",borderRadius:18,padding:"12px 14px",display:"grid",gap:11}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><strong style={{color:golfAccent,fontSize:13}}>PARTIE RAPIDE · GROS 6</strong><span style={{fontSize:11,color:"#bcc6d4"}}>Étape {grosQuickStep+1}/6</span></div>
          <div style={{textAlign:"center",fontWeight:900,fontSize:12}}>{grosSteps[grosQuickStep]}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:5}}>{grosSteps.map((label,i)=><button type="button" key={label} onClick={()=>setGrosQuickStep(i)} title={label} aria-current={grosQuickStep===i?"step":undefined} style={{minWidth:0,height:34,borderRadius:10,border:`1px solid ${grosQuickStep===i?golfAccent:"#ffffff24"}`,background:grosQuickStep===i?`${golfAccent}22`:"#ffffff07",color:grosQuickStep===i?golfAccent:"#b7c0d4",fontWeight:950}}>{i+1}</button>)}</div>
          <div style={{height:4,background:"#ffffff1c",borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${(grosQuickStep+1)*100/6}%`,background:golfAccent}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}><button type="button" disabled={grosQuickStep===0} onClick={()=>setGrosQuickStep(n=>Math.max(0,n-1))} style={{borderRadius:999,padding:11,border:"1px solid #ffffff2a",background:"#ffffff08",color:"white",opacity:grosQuickStep===0?.4:1,fontWeight:850}}>← Précédent</button><button type="button" disabled={grosQuickStep===5} onClick={()=>setGrosQuickStep(n=>Math.min(5,n+1))} style={{borderRadius:999,padding:11,border:`1px solid ${golfAccent}`,background:`${golfAccent}20`,color:golfAccent,opacity:grosQuickStep===5?.4:1,fontWeight:950}}>Suivant →</button></div>
        </nav>
        {grosQuickStep===0 && <MssQuickPlayers count={count} choices={Array.from({length:9},(_,i)=>i+2)} onCount={setCount} names={names} onNames={setNames} sessionId={session} mode={grosTeamMode} onModeChange={setGrosTeamMode} allowTeams teamCount={2} hideCountForTeams teamsInfo="Équipes rapides : TEAM GOLD et TEAM PINK · 2 joueurs chacune" />}
        {grosQuickStep===1 && <MssQuickPanel title="Vies et règles">
          <div style={{display:"grid",gap:8}}><span style={{textAlign:"center",color:"#b8bfd1",fontWeight:900,fontSize:12}}>VIES DE DÉPART</span><div style={{display:"flex",justifyContent:"center",gap:12}}>{[3,6,9].map(value=><MssLivesHeartChoice key={value} value={value} active={lives===value} onClick={()=>setLives(value)} accent={golfAccent}/>)}</div></div>
          <MssQuickChoices label="Validation des impacts" options={[{value:true,label:"STRICT S/D/T"},{value:false,label:"VALEUR LIBRE"}]} value={grosStrict} onChange={setGrosStrict}/>
        </MssQuickPanel>}
        {grosQuickStep===2 && <MssQuickPanel title="Zones et bonus">
          <MssKillerBooleanToggle label="BULL / DBULL" checked={grosBull} onChange={setGrosBull} accent={golfAccent}/>
          <MssKillerBooleanToggle label="Zones spéciales" checked={grosZones} onChange={setGrosZones} accent={golfAccent}/>
          <MssKillerBooleanToggle label="Bonus de 3e fléchette" checked={grosBonus} onChange={setGrosBonus} accent={golfAccent}/>
          {grosBonus && <MssQuickChoices label="Nombre de fléchettes bonus" options={[1,2,3].map(value=>({value,label:String(value)}))} value={grosBonusCount} onChange={setGrosBonusCount} compact/>}
        </MssQuickPanel>}
        {grosQuickStep===3 && <MssQuickPanel title="Départ et saisie">
          <div style={{fontSize:12,color:"#bcc6d4",fontWeight:900}}>ORDRE DE DÉPART</div>
          <div style={{display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap"}}>{([ ["random","random-order","Aléatoire"],["alternate","alternate-order","Alterné"],["manual","manual-pick","Manuel"],["bull","bull-order","BULL"] ] as const).map(([id,icon,label])=><MssSelectorIconButton key={id} icon={icon} label={label} accent={golfAccent} active={order===id} onClick={()=>setOrder(id)}/>)}</div>
          <strong style={{color:golfAccent,textAlign:"center"}}>{getQuickStartLabel(order).toUpperCase()}</strong>
          <MssGros6InputSelector value={grosInput} onChange={setGrosInput} accent={golfAccent}/>
        </MssQuickPanel>}
        {grosQuickStep===4 && <MssQuickPanel title="MODE AUDIO"><MssGuidedAudioPanel accent={golfAccent} arcade={grosArcadeAudio} hits={grosHitsAudio} voice={grosVoiceAudio} onArcadeChange={setGrosArcadeAudio} onHitsChange={setGrosHitsAudio} onVoiceChange={setGrosVoiceAudio} voiceId={grosVoiceId} voices={[{id:"awena",label:"Awena · voix officielle"},{id:"default",label:"Défaut"},{id:"female",label:"Voix féminine"},{id:"male",label:"Voix masculine"}]} onVoiceIdChange={setGrosVoiceId}/></MssQuickPanel>}
        {grosQuickStep===5 && <><MssQuickRecap entries={recapEntries}/><MssQuickStart onClick={launch}/><MssGros6AwenaTip mode="quick" /></>}
      </> : modeId === "golf" ? <>
        <nav aria-label="Étapes de la partie rapide GOLF" style={{ border: `1px solid ${golfAccent}55`, background: "rgba(9,12,24,.94)", borderRadius: 18, padding: "12px 14px", display: "grid", gap: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <strong style={{ color: golfAccent, fontSize: 13, letterSpacing: .7 }}>PARTIE RAPIDE · GOLF</strong>
              <div style={{ fontSize: 11, color: "#b2bed1", marginTop: 3 }}>Étape {golfQuickStep + 1}/4 · {golfQuickSteps[golfQuickStep]}</div>
            </div>
            <span style={{ fontSize: 10, color: "#b2bed1", fontWeight: 800, whiteSpace: "nowrap" }}>{Math.round((golfQuickStep + 1) / 4 * 100)} %</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
            {golfQuickSteps.map((label, i) => <button type="button" key={label} onClick={() => goGolfStep(i)} aria-label={`Étape ${i + 1} : ${label}`} aria-current={golfQuickStep === i ? "step" : undefined}
              style={{ minWidth: 0, height: 34, borderRadius: 10, border: `1px solid ${golfQuickStep === i ? golfAccent : "rgba(255,255,255,.14)"}`, background: golfQuickStep === i ? `${golfAccent}25` : "rgba(255,255,255,.03)", color: golfQuickStep === i ? golfAccent : "#b7c0d4", cursor: "pointer", fontWeight: 950, fontSize: 12 }}>{i + 1}</button>)}
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,.08)", borderRadius: 999, overflow: "hidden" }}><div style={{ height: "100%", width: `${(golfQuickStep + 1) * 25}%`, background: `linear-gradient(90deg, ${golfAccent}, #ff9cd8)`, borderRadius: 999 }} /></div>
        </nav>
        {golfQuickStep === 0 &&       <MssQuickPlayers
        count={count}
        choices={Array.from({ length: max - 1 }, (_, i) => i + 2)}
        onCount={setCount}
        names={names}
        onNames={setNames}
        sessionId={session}
        mode={modeId === "golf" ? golfParticipantsMode : undefined}
        onModeChange={modeId === "golf" ? setGolfParticipantsMode : undefined}
        allowTeams={modeId === "golf"}
        teamCount={golfTeamCount}
        onTeamCount={modeId === "golf" ? setGolfTeamCount : undefined}
        info={modeId === "warfare" ? "Répartition alternée des joueurs entre les armées TOP et BOTTOM." : undefined}
      />}
        {golfQuickStep === 1 && <MssQuickPanel title="PARCOURS · GOLF">
          <MssQuickChoices label="Trous" options={[9, 18].map(n => ({ value: n, label: String(n) }))} value={holes} onChange={setHoles} compact />
          <MssQuickChoices label="Ordre des objectifs de cible" options={[{ value: "chronological", label: "CHRONOLOGIQUE" }, { value: "random", label: "ALÉATOIRE" }]} value={golfHoleOrder} onChange={setGolfHoleOrder} />
          <MssQuickChoices label="Mode de scoring" options={[{ value: "strokes", label: "STROKES" }, { value: "points", label: "POINTS" }]} value={golfScoring} onChange={setGolfScoring} />
          <MssQuickChoices label="Pénalité MISS" options={[4,5,6,7,8].map(n => ({ value: n, label: String(n) }))} value={golfMissPenalty} onChange={setGolfMissPenalty} compact />
        </MssQuickPanel>}
        {golfQuickStep === 2 && <MssQuickPanel title="OPTIONS · GOLF">
          <MssKillerBooleanToggle label="Grille des trous" checked={golfShowGrid} onChange={setGolfShowGrid} accent={golfAccent} />
          <MssGolfInputMethodSelector value={golfInput} onChange={setGolfInput} accent={golfAccent} />
          <MssKillerBooleanToggle label="Options audio" checked={golfAudio} onChange={setGolfAudio} accent={golfAccent} />
          <MssQuickStartOrder value={order} onChange={setOrder} />
        </MssQuickPanel>}
        {golfQuickStep === 3 && <>
          <MssQuickRecap entries={recapEntries} footer={golfIsTeams ? "✓ Partie rapide · avatars MSS · équipes auto sans modification des profils" : undefined} />

        </>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <button type="button" onClick={() => goGolfStep(golfQuickStep - 1)} disabled={golfQuickStep === 0}
            style={{ minHeight: 44, borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.035)", color: golfQuickStep === 0 ? "#657084" : "#fff", fontWeight: 900, cursor: golfQuickStep === 0 ? "default" : "pointer" }}>← Précédent</button>
          {golfQuickStep < 3 ? <button type="button" onClick={() => goGolfStep(golfQuickStep + 1)}
            style={{ minHeight: 44, borderRadius: 999, border: `1px solid ${golfAccent}`, background: `${golfAccent}20`, color: golfAccent, fontWeight: 950, cursor: "pointer" }}>Suivant →</button>
          : <button type="button" onClick={() => goGolfStep(0)}
            style={{ minHeight: 44, borderRadius: 999, border: `1px solid ${golfAccent}`, background: `${golfAccent}18`, color: golfAccent, fontWeight: 900, cursor: "pointer" }}>Modifier ↺</button>}
        </div>
        {golfQuickStep === 3 && <>
          <MssQuickStart onClick={launch} />
          <MssGolfAwenaTip mode="quick" />
        </>}
      </> : <>
      <MssQuickPlayers
        count={count}
        choices={Array.from({ length: max - 1 }, (_, i) => i + 2)}
        onCount={setCount}
        names={names}
        onNames={setNames}
        sessionId={session}
        mode={modeId === "golf" ? golfParticipantsMode : undefined}
        onModeChange={modeId === "golf" ? setGolfParticipantsMode : undefined}
        allowTeams={modeId === "golf"}
        teamCount={golfTeamCount}
        onTeamCount={modeId === "golf" ? setGolfTeamCount : undefined}
        info={modeId === "warfare" ? "Répartition alternée des joueurs entre les armées TOP et BOTTOM." : undefined}
      />
      <MssQuickPanel title={`Règles · ${title}`}>
        {modeId === "gros_6" && <MssQuickChoices label="Vies" options={[3, 6, 9].map(n => ({ value: n, label: String(n) }))} value={lives} onChange={setLives} compact />}
        {modeId === "prisoner" && <MssQuickChoices label="Fléchettes" options={[3, 5, 7].map(n => ({ value: n, label: String(n) }))} value={darts} onChange={setDarts} compact />}
        {modeId === "warfare" && <MssQuickChoices label="Zones valides" options={[{ value: "ANY", label: "TOUTES" }, { value: "SINGLE_DOUBLE", label: "SIMPLE / DOUBLE" }, { value: "DOUBLE_ONLY", label: "DOUBLES" }]} value={zoneRule} onChange={setZoneRule} />}
        {modeId !== "warfare" && <MssQuickChoices label="Ordre de départ" options={[{ value: "manual", label: "MANUEL" }, { value: "random", label: "ALÉATOIRE" }]} value={order} onChange={setOrder} />}
      </MssQuickPanel>
      <MssQuickRecap entries={recapEntries} />
      <MssQuickStart onClick={launch} />
      </>}
    </main>
  </div>;
}
