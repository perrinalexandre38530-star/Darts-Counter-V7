// @ts-nocheck
import React from "react";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import { makeGros6Segment } from "../lib/gros6Engine";
import { MssQuickPlayers, MssQuickPanel, MssQuickChoices, MssQuickRecap, MssQuickStart } from "../components/config/MssQuickClassicControls";

type Mode = "gros_6" | "warfare" | "prisoner" | "golf";
export default function QuickIndependentDartsConfig({ modeId, onBack, go }: {modeId:Mode;onBack:()=>void;go:(route:string,params?:any)=>void}) {
  const [session] = React.useState(() => `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`);
  const [count,setCount] = React.useState(2);
  const [names,setNames] = React.useState(Array.from({length:12},(_,i)=>`J${i+1}`));
  const [lives,setLives] = React.useState(6);
  const [darts,setDarts] = React.useState(3);
  const [holes,setHoles] = React.useState(9);
  const [zoneRule,setZoneRule] = React.useState("ANY");
  const [order,setOrder] = React.useState("fixed");
  const title = {gros_6:"GROS 6",warfare:"WARFARE",prisoner:"PRISONER",golf:"GOLF"}[modeId];
  const max = modeId === "gros_6" ? 10 : modeId === "golf" ? 8 : 12;
  const players = () => names.slice(0, count).map((value, i) => ({
    id: `${session}-p${i + 1}`, profileId: null, temporaryPlayerId: `${session}-p${i + 1}`,
    isTemporary: true, isBot: false, name: value.trim() || `J${i + 1}`,
    avatarDataUrl: quickPartyAvatar(i, session), avatarUrl: quickPartyAvatar(i, session), dartSetId: null,
  }));
  const quickMeta={quickParty:true,partyMode:"quick",temporaryParticipants:true,profileStatsDeferred:true};
  function launch() {
    const roster=players();
    if (modeId === "gros_6") {
      const config={...quickMeta,id:`gros6-quick-${Date.now()}`,mode:"gros_6",createdAt:Date.now(),participantMode:"players",startingLives:lives,targetRule:"strict",allowBull:true,allowSpecialZones:false,allowOuterRing:false,selectionPolicy:"open",startingTargetMode:"s6",startingTarget:makeGros6Segment("S",6),randomStartOrder:order==="random",startOrderMode:order==="random"?"random":"manual",thirdDartBonusSelection:true,thirdDartBonusCount:3,scoreInputDefaultMethod:"keypad",presetId:"custom",players:roster};
      go("gros_6_play",{config,...quickMeta});return;
    }
    if (modeId === "warfare") {
      const teams={TOP:roster.filter((_,i)=>i%2===0),BOTTOM:roster.filter((_,i)=>i%2===1)};
      go("warfare_play",{config:{teams,zoneRule,friendlyFire:false,handicapTopHarder:false,layout:"TOP_BOTTOM",bullRule:"NONE",...quickMeta},...quickMeta});return;
    }
    const selectedIds=roster.map(p=>p.id);
    if (modeId === "golf") {
      const config={players:count,selectedIds,quickPlayers:roster,holes,teamsEnabled:false,botsEnabled:false,missStrokes:5,holeOrderMode:"chronological",scoringMode:"strokes",startOrderMode:order==="random"?"random":"chronological",showHoleGrid:true,...quickMeta};
      go("golf_play",{config,...quickMeta});return;
    }
    const config={mode:"prisoner",participantMode:"players",players:count,selectedIds,playersList:roster,teamConfigs:[],playerDartSets:{},botIds:[],botsEnabled:false,botLevel:"normal",startingDarts:darts,sequenceMode:"clockwise",bullCaptureRule:"bull",missPenaltyEnabled:true,eliminationEnabled:true,randomOrder:order==="random",scoreInputMethod:"keypad",...quickMeta};
    go("prisoner_play",{...config,...quickMeta});
  }
  const detail = modeId === "gros_6" ? `Vies : ${lives}` : modeId === "golf" ? `Trous : ${holes}` : modeId === "prisoner" ? `Fléchettes : ${darts}` : `Zones : ${zoneRule}`;
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ color: "white", minHeight: "100dvh", padding: "0 12px 100px", background: "#050710" }}>
    <DartsQuickHeader modeId={modeId} title={title} onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title={title} />
      <MssQuickPlayers count={count} choices={Array.from({ length: max - 1 }, (_, i) => i + 2)} onCount={setCount} names={names} onNames={setNames} sessionId={session}
        info={modeId === "warfare" ? "Répartition alternée des joueurs entre les armées TOP et BOTTOM." : undefined} />
      <MssQuickPanel title={`Règles · ${title}`}>
        {modeId === "gros_6" && <MssQuickChoices label="Vies" options={[3, 6, 9].map(n => ({ value: n, label: String(n) }))} value={lives} onChange={setLives} compact />}
        {modeId === "golf" && <MssQuickChoices label="Trous" options={[9, 18].map(n => ({ value: n, label: String(n) }))} value={holes} onChange={setHoles} compact />}
        {modeId === "prisoner" && <MssQuickChoices label="Fléchettes" options={[3, 5, 7].map(n => ({ value: n, label: String(n) }))} value={darts} onChange={setDarts} compact />}
        {modeId === "warfare" && <MssQuickChoices label="Zones valides" options={[{ value: "ANY", label: "TOUTES" }, { value: "SINGLE_DOUBLE", label: "SIMPLE / DOUBLE" }, { value: "DOUBLE_ONLY", label: "DOUBLES" }]} value={zoneRule} onChange={setZoneRule} />}
        {modeId !== "warfare" && <MssQuickChoices label="Ordre de départ" options={[{ value: "fixed", label: "MANUEL" }, { value: "random", label: "ALÉATOIRE" }]} value={order} onChange={setOrder} />}
      </MssQuickPanel>
      <MssQuickRecap entries={[["Participants", count], ["Réglage", detail], ["Départ", modeId === "warfare" ? "Armées TOP / BOTTOM" : order === "random" ? "Aléatoire" : "Dans l’ordre"]]} />
      <MssQuickStart onClick={launch} />
    </main>
  </div>;
}
