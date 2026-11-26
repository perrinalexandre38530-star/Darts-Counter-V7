// @ts-nocheck
import React from "react";
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
  const title = {gros_6:"GROS 6",warfare:"WARFARE",prisoner:"PRISONER",golf:"GOLF"}[modeId];
  const max = modeId === "gros_6" ? 10 : modeId === "golf" ? 8 : 12;

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
      const config={...quickMeta,id:`gros6-quick-${Date.now()}`,mode:"gros_6",createdAt:Date.now(),participantMode:"players",startingLives:lives,targetRule:"strict",allowBull:true,allowSpecialZones:false,allowOuterRing:false,selectionPolicy:"open",startingTargetMode:"s6",startingTarget:makeGros6Segment("S",6),randomStartOrder:order==="random",startOrderMode:order,thirdDartBonusSelection:true,thirdDartBonusCount:3,scoreInputDefaultMethod:"keypad",presetId:"custom",players:roster};
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
    : [["Participants", count], ["Réglage", detail], ["Départ", modeId === "warfare" ? "Armées TOP / BOTTOM" : getQuickStartLabel(order)]];

  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ color: "white", minHeight: "100dvh", padding: "0 12px 100px", background: "#050710" }}>
    <DartsQuickHeader modeId={modeId} title={title} onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title={title} />
      {modeId === "golf" && <MssGolfAwenaTip step="intro" />}
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
      {modeId === "golf" && <MssGolfAwenaTip step="participants" />}
      <MssQuickPanel title={`Règles · ${title}`}>
        {modeId === "gros_6" && <MssQuickChoices label="Vies" options={[3, 6, 9].map(n => ({ value: n, label: String(n) }))} value={lives} onChange={setLives} compact />}
        {modeId === "golf" && <>
          <MssQuickChoices label="Trous" options={[9, 18].map(n => ({ value: n, label: String(n) }))} value={holes} onChange={setHoles} compact />
          <MssQuickChoices label="Ordre des objectifs de cible" options={[{ value: "chronological", label: "CHRONOLOGIQUE" }, { value: "random", label: "ALÉATOIRE" }]} value={golfHoleOrder} onChange={setGolfHoleOrder} />
          <MssQuickChoices label="Mode de scoring" options={[{ value: "strokes", label: "STROKES" }, { value: "points", label: "POINTS" }]} value={golfScoring} onChange={setGolfScoring} />
          <MssQuickChoices label="Pénalité MISS" options={[4,5,6,7,8].map(n => ({ value: n, label: String(n) }))} value={golfMissPenalty} onChange={setGolfMissPenalty} compact />
          <MssKillerBooleanToggle label="Grille des trous" checked={golfShowGrid} onChange={setGolfShowGrid} accent={golfAccent} />
          <MssGolfInputMethodSelector value={golfInput} onChange={setGolfInput} accent={golfAccent} />
          <MssKillerBooleanToggle label="Options audio" checked={golfAudio} onChange={setGolfAudio} accent={golfAccent} />
        </>}
        {modeId === "prisoner" && <MssQuickChoices label="Fléchettes" options={[3, 5, 7].map(n => ({ value: n, label: String(n) }))} value={darts} onChange={setDarts} compact />}
        {modeId === "warfare" && <MssQuickChoices label="Zones valides" options={[{ value: "ANY", label: "TOUTES" }, { value: "SINGLE_DOUBLE", label: "SIMPLE / DOUBLE" }, { value: "DOUBLE_ONLY", label: "DOUBLES" }]} value={zoneRule} onChange={setZoneRule} />}
        {modeId === "golf"
          ? <MssQuickStartOrder value={order} onChange={setOrder} />
          : modeId !== "warfare"
            ? <MssQuickChoices label="Ordre de départ" options={[{ value: "manual", label: "MANUEL" }, { value: "random", label: "ALÉATOIRE" }]} value={order} onChange={setOrder} />
            : null}
      </MssQuickPanel>
      {modeId === "golf" && <MssGolfAwenaTip step="rules" />}
      <MssQuickRecap
        entries={recapEntries}
        footer={golfIsTeams ? "✓ Partie rapide · avatars MSS · équipes auto sans modification des profils" : undefined}
      />
      {modeId === "golf" && <MssGolfAwenaTip step="recap" />}
      <MssQuickStart onClick={launch} />
    </main>
  </div>;
}
