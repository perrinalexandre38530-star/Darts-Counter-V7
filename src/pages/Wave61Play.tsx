// @ts-nocheck
import React from "react";
import tickerTugRush from "../assets/tickers/ticker_tug_rush.webp";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { DARTS_WAVE_61 } from "../games/dartsWave61";
import { getWave61Preset } from "../games/dartsWave61Families";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import {
  cloneWave61State,
  createWave61State,
  getWave61Target,
  normalizeWave61Config,
  pickWave61BotDarts,
  playWave61Visit,
  wave61DartLabel,
  wave61MineNeighborCount,
  wave61PrimaryMetric,
  wave61LucioleTarget,
  wave61GoldenTarget,
  WAVE61_ENGINE_VERSION,
  type Wave61State,
} from "../lib/gameEngines/wave61Engine";
import {
  Meter,
  ModeEndPanel,
  NewModeInput,
  PlayerCard,
  SOFT,
  VisitTimeline,
  actionStyle,
  isBotProfile,
  panelStyle,
  playerName,
  resolveModeProfiles,
  uiToGameDart,
} from "./newModes/newModePlayShared";
import {
  AthleticsPanel,
  ChatSourisPanel,
  ChienChatPanel,
  FreefallPanel,
  JumpRopePanel,
  MazeChasePanel,
  RollerCoasterPanel,
  SoleilPanel,
  TugRushPanel,
  TyrolienPanel,
} from "./wave61/Wave61RacePanels";
import {
  ApocalypsePanel,
  CosmoKnightsPanel,
  DodgeballPanel,
  EperviersPanel,
  HotPotatoPanel,
  IcebergPanel,
  JurassicPanel,
  KnockbackPanel,
  LoupPanel,
  SpartacusPanel,
  ZombieSiegePanel,
} from "./wave61/Wave61SurvivalCombatPanels";

function familyRules(spec: any, preset: any) {
  const signature: Record<string, string> = {
    align_4: "Chaque impact choisit une colonne 1–7. Les jetons tombent dans la grille 7×6 et le premier alignement de quatre gagne.",
    demineur: "Les secteurs 1–20 forment une grille 5×4. Les cases sûres donnent des indices voisins ; BULL scanne une case sûre et DBULL en scanne deux.",
    codebreaker: "Trois secteurs composent une tentative. L'application indique les valeurs exactes et les valeurs présentes mais déplacées. Trois exactes déverrouillent le code.",
    face_mystere: "Chaque secteur représente un suspect. Une mauvaise accusation révèle un nouvel indice et élimine automatiquement les suspects incompatibles.",
    colin_maillard: "Mémorise une séquence cachée de six secteurs. Utilise l'aperçu de 2 secondes avant de lancer puis reproduis la suite dans l'ordre.",
    replicat: "Le premier joueur crée la référence. Ensuite chaque volée doit copier la précédente : numéros en Facile, segments exacts en Normal, séquence parfaite en Difficile.",
    double_down: "Parcours 15 · 16 · DOUBLE · 17 · 18 · TRIPLE · 19 · 20 · BULL. Si aucun dart ne valide le contrat du round, le score est divisé par deux.",
    nine_dart_century: "Neuf fléchettes maximum pour atteindre 100 sans dépasser. Un dépassement provoque un BUST de la volée ; 100 exact gagne immédiatement.",
    shove_a_penny: "Complète trois marques sur 15, 16, 17, 18, 19, 20 et BULL. Les surplus au-delà de trois sont poussés vers l'adversaire suivant.",
    green_vs_red: "Chaque joueur suit une piste ROUGE ou VERTE sur les anneaux D/T. Un triple avance plus vite ; toucher la couleur adverse peut l'aider.",
    hi_score: "Nombre de rounds configurable : additionne simplement le score de toutes les volées. Le meilleur total à la fin gagne.",
    sniper: "Une série de contrats de précision s'enchaîne. Plus la difficulté monte, plus le lit exact S/D/T/BULL devient obligatoire.",
    luciole: "La cible s'illumine brièvement au début du tour puis disparaît. Mémorise le secteur et touche-le avant que la luciole suivante apparaisse.",
    golden_dart: "Une cible dorée secrète se cache parmi les 20 secteurs. Chaque erreur révèle un indice ; trouve-la pour gagner une marque d'or et passer à la suivante.",
    hot_potato: "La mèche descend à chaque tour. Touche le secteur demandé pour transmettre proprement la patate ; une mèche à zéro provoque une explosion et coûte une vie.",
    zombie_siege: "Un camp commence infecté. Les zombies propagent la contamination, les survivants renforcent leurs barricades et les BULL permettent de réduire l'infection.",
    le_loup: "Le loup doit toucher sa cible pour attraper un joueur et transmettre le rôle. Les fuyards progressent et peuvent obtenir une protection au BULL.",
    eperviers: "Les coureurs doivent traverser le terrain jusqu'à 100. Les Éperviers capturent les coureurs ; après plusieurs touches, un coureur rejoint le camp des Éperviers.",
    ballon_prisonnier: "Les impacts exacts attaquent un adversaire. À 0 PV il devient prisonnier ; BULL/DBULL permet de libérer un allié ou de renforcer l'esquive.",
    iceberg: "Sécurise cinq compartiments avant que l'eau et les impacts ne détruisent la coque. Les BULL activent les pompes et les bonnes zones réparent le navire.",
    jurassic_dart: "Progresse dans l'expédition tout en contrôlant la menace des dinosaures. Les BULL servent de tranquillisants ; une menace trop élevée déclenche une attaque.",
    apocalypse: "Collecte des ressources, consolide ton refuge et traverse les catastrophes. Les zones sûres font progresser le refuge et les BULL servent de medkits.",
    knockback: "Pars de 0 et atteins exactement l'objectif. Si ton nouveau score égale celui d'un adversaire, il est renvoyé à 0. Un dépassement provoque un BUST.",
    spartacus: "Combats d'arène avec PV, armure, garde et gloire. Les bonnes fenêtres déclenchent les attaques, tandis que les BULL renforcent la garde.",
    cosmo_knights: "Les impacts sur la constellation chargent le Cosmos. À 100 %, un COSMO BURST frappe l'adversaire ; BULL charge aussi le bouclier.",
    tug_rush: "Deux camps tirent une corde virtuelle. Le secteur demandé donne de la traction, doubles/triples renforcent le tir et les BULL déclenchent les plus gros coups.",
    un_deux_trois_soleil: "Phase verte : touche le secteur demandé pour avancer. Phase SOLEIL : reste immobile avec MISS ou sécurise au BULL ; tout autre impact fait reculer.",
    chat_souris: "Le chat part en chasse tandis que les souris disposent d'avance. Le chat capture en rattrapant leur position ; une souris gagne si elle atteint le refuge.",
    maze_chase: "Suis le chemin du labyrinthe, collecte les couloirs dans l'ordre et utilise BULL comme power mode pour repousser le poursuivant.",
    chien_chat: "Deux pistes parallèles : chiens et chats progressent chacun vers l'arrivée avec leurs propres bonus. Secteur 5 = os, secteur 17 = poisson, BULL = raccourci.",
    roller_coaster: "Gère vitesse et progression sur cinq sections. Les bons secteurs accélèrent ; trop de vitesse dans un looping ou virage provoque une pénalité.",
    athletisme: "Meeting en six épreuves : Sprint, Haies, Longueur, Hauteur, Javelot et Relais. Chaque discipline transforme les darts en points spécifiques.",
    chute_libre: "Descends depuis 4000 m et ouvre le parachute au bon moment avec BULL/DBULL. Trop tôt ne sert à rien ; trop tard entraîne le crash.",
    tyrolien: "Franchis cinq sections de câble en maintenant ta vitesse. Les secteurs de checkpoint font progresser, BULL booste la glisse et le vent peut faire reculer.",
    saut_a_la_corde: "Enchaîne les secteurs dans le rythme. S/D/T valent 1/2/3 sauts, BULL donne un gros bonus et une erreur casse le combo.",
  };
  return <div style={{ display: "grid", gap: 9, fontSize: 12.5, lineHeight: 1.5 }}>
    <div><b style={{ color: preset.accent }}>CONCEPT</b><br />{spec.infoBody}</div>
    <div><b style={{ color: preset.accent }}>MOTEUR V{WAVE61_ENGINE_VERSION}</b><br />{signature[spec.id] || `Famille ${preset.label}. Scoring par dart, progression, historique, bots et Undo sont mutualisés.`}</div>
    <div><b style={{ color: "#ffcc80" }}>PHASE DE DÉVELOPPEMENT</b><br />La passe V5 conserve les moteurs précédents et spécialise Survie / Combat / Élimination : vies, contamination, captures, prisonniers, dégâts, menaces et duels.</div>
  </div>;
}

function Align4Board({ state, accent }: any) {
  const board = state?.special?.board;
  if (!Array.isArray(board)) return null;
  const tokenColors: Record<string, string> = {};
  let idx = 0;
  for (const row of board) for (const token of row) if (token && !tokenColors[token]) tokenColors[token] = idx++ % 2 ? "#ff5e78" : accent;
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100, marginBottom: 7 }}>ALIGN 4 · GRILLE 7 × 6</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, maxWidth: 430, margin: "0 auto" }}>
      {board.flatMap((row: any[], r: number) => row.map((token: string | null, c: number) => <div key={`${r}-${c}`} style={{ aspectRatio: "1", borderRadius: 999, border: "1px solid rgba(255,255,255,.13)", background: token ? tokenColors[token] || accent : "rgba(255,255,255,.045)", boxShadow: token ? `0 0 12px ${tokenColors[token] || accent}66` : "inset 0 2px 8px rgba(0,0,0,.4)" }} />))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginTop: 5, color: SOFT, fontSize: 8.5, textAlign: "center" }}>{[1,2,3,4,5,6,7].map((n)=><span key={n}>COL {n}</span>)}</div>
  </div>;
}

function MineBoard({ state, accent }: any) {
  const revealed = new Set((state?.special?.revealed || []).map(Number));
  const exploded = new Set((state?.special?.exploded || []).map(Number));
  const mines = new Set((state?.special?.mines || []).map(Number));
  const finished = state?.phase === "finished";
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>DÉMINEUR · GRILLE 5 × 4</div>
      <div style={{ color: SOFT, fontSize: 9, fontWeight: 900 }}>{Math.max(0, 20 - revealed.size)} case(s) cachée(s)</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
        const shown = revealed.has(n) || finished;
        const mine = mines.has(n);
        const explodedMine = exploded.has(n);
        const around = shown && !mine ? wave61MineNeighborCount(state, n) : 0;
        return <div key={n} style={{ minHeight: 44, borderRadius: 10, display: "grid", placeItems: "center", border: `1px solid ${shown ? (mine ? "rgba(255,84,84,.55)" : accent + "55") : "rgba(255,255,255,.10)"}`, background: shown ? (mine ? "rgba(255,70,70,.12)" : `${accent}0d`) : "rgba(255,255,255,.035)", color: shown ? (mine ? "#ff8e8e" : "#fff") : "#7d8495", fontWeight: 1100, boxShadow: explodedMine ? "0 0 16px rgba(255,74,74,.26)" : "none" }}>
          {shown ? (mine ? (explodedMine ? "💥" : "💣") : <span>{around ? <b style={{ color: around >= 3 ? "#ff9d8a" : around === 2 ? "#ffd36a" : accent }}>{around}</b> : "·"}</span>) : "?"}
        </div>;
      })}
    </div>
    <div style={{ marginTop: 7, color: SOFT, fontSize: 9.2, lineHeight: 1.45 }}>Les chiffres indiquent le nombre de mines autour de la case. BULL = scanner 1 case sûre · DBULL = scanner 2.</div>
  </div>;
}

function CodebreakerPanel({ state, accent }: any) {
  const history = (state?.special?.codeHistory || []).slice(-6).reverse();
  const secret = state?.special?.secretCode || [];
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>CODEBREAKER · CODE À 3 SECTEURS</div>
      <div style={{ color: SOFT, fontSize: 9 }}>{state?.phase === "finished" ? `CODE ${secret.join(" · ")}` : "CODE MASQUÉ"}</div>
    </div>
    <div style={{ display: "grid", gap: 5, marginTop: 8 }}>
      {history.length ? history.map((h: any, i: number) => <div key={`${h.playerId}-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: "6px 8px", borderRadius: 10, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", fontSize: 9.5 }}>
        <b style={{ color: "#fff" }}>{(h.guess || []).map((n: number) => n || "—").join(" · ")}</b>
        <span style={{ color: accent, fontWeight: 1000 }}>● {h.exact} exact</span>
        <span style={{ color: "#ffd36a", fontWeight: 1000 }}>◐ {h.present} déplacé</span>
      </div>) : <div style={{ color: SOFT, fontSize: 9.5 }}>Aucune tentative. Lance trois fléchettes pour proposer le code.</div>}
    </div>
  </div>;
}

function FaceMysterePanel({ state, accent }: any) {
  const candidates = new Set((state?.special?.faceCandidates || []).map(Number));
  const clues = state?.special?.faceClues || [];
  const secret = Number(state?.special?.faceSecret || 0);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>FACE MYSTÈRE · SUSPECTS</div>
      <div style={{ color: SOFT, fontSize: 9, fontWeight: 900 }}>{candidates.size} encore possible(s)</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4 }}>
      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
        const alive = candidates.has(n);
        const reveal = state?.phase === "finished" && n === secret;
        return <div key={n} style={{ minHeight: 34, borderRadius: 9, display: "grid", placeItems: "center", border: `1px solid ${reveal ? accent : alive ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.045)"}`, background: reveal ? `${accent}24` : alive ? "rgba(255,255,255,.045)" : "rgba(255,255,255,.015)", color: reveal ? "#fff" : alive ? "#dce1ec" : "#4d5360", fontSize: 9.5, fontWeight: 1000, textDecoration: alive ? "none" : "line-through" }}>{n}</div>;
      })}
    </div>
    <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
      {clues.slice(-4).map((c: any, i: number) => <div key={`${c.key}-${i}`} style={{ color: "#dce1ec", fontSize: 9.5 }}>🔎 {c.label}</div>)}
      {!clues.length ? <div style={{ color: SOFT, fontSize: 9.5 }}>Vise un suspect. Une erreur révélera un indice et réduira la liste.</div> : null}
    </div>
  </div>;
}

function ColinBoard({ state, accent, reveal, onReveal }: any) {
  const sequence = state?.special?.colinSequence || [];
  const player = state?.players?.[state?.activePlayerIndex];
  const step = Number(state?.special?.colinStepByPlayer?.[player?.id] || 0);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div><div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>COLIN-MAILLARD · MÉMOIRE</div><div style={{ color: SOFT, fontSize: 9, marginTop: 2 }}>Progression actuelle : {Math.min(step, sequence.length)}/{sequence.length}</div></div>
      <button type="button" onClick={onReveal} style={actionStyle(accent, false)}>👁 APERÇU 2s</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, sequence.length)},1fr)`, gap: 5, marginTop: 8 }}>
      {sequence.map((n: number, i: number) => <div key={`${n}-${i}`} style={{ minHeight: 42, borderRadius: 10, display: "grid", placeItems: "center", border: `1px solid ${i < step ? accent + "77" : "rgba(255,255,255,.10)"}`, background: i < step ? `${accent}18` : "rgba(255,255,255,.03)", color: i < step ? accent : "#fff", fontWeight: 1100 }}>{reveal ? n : i < step ? "✓" : "?"}</div>)}
    </div>
  </div>;
}


function ReplicatPanel({ state, accent }: any) {
  const ref = state?.special?.lastVisitDarts || [];
  const level = state?.config?.difficulty || "normal";
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>REPLICAT · RÉFÉRENCE À COPIER</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 8 }}>
      {[0,1,2].map((i) => <div key={i} style={{ minHeight: 46, borderRadius: 11, display: "grid", placeItems: "center", border: `1px solid ${accent}44`, background: `${accent}0b`, color: "#fff", fontWeight: 1100 }}>{ref[i] ? wave61DartLabel(ref[i]) : "—"}</div>)}
    </div>
    <div style={{ marginTop: 7, color: SOFT, fontSize: 9.5 }}>{!ref.length ? "La première volée crée la référence sans marquer de copie." : level === "easy" ? "FACILE · même numéro, multiplicateur libre" : level === "hard" ? "DIFFICILE · les 3 darts doivent reproduire la séquence parfaite" : "NORMAL · segment et multiplicateur exacts"}</div>
  </div>;
}

function DoubleDownPanel({ state, accent, target }: any) {
  const seq = ["15", "16", "DOUBLE", "17", "18", "TRIPLE", "19", "20", "BULL"];
  const round = Math.min(seq.length - 1, Number(state?.roundIndex || 0));
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ color: accent, fontSize: 10 }}>DOUBLE DOWN · CONTRATS</b><span style={{ color: SOFT, fontSize: 9 }}>{target?.label || seq[round]}</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 4, marginTop: 8 }}>{seq.map((x,i)=><div key={x+i} style={{ minHeight: 34, borderRadius: 8, display:"grid", placeItems:"center", border:`1px solid ${i===round?accent+"88":"rgba(255,255,255,.08)"}`, background:i<round?`${accent}14`:i===round?`${accent}20`:"rgba(255,255,255,.025)", color:i<=round?"#fff":"#697181", fontSize:8.5, fontWeight:1000 }}>{i<round?"✓":x}</div>)}</div>
    <div style={{ marginTop: 7, color: SOFT, fontSize: 9.3 }}>Aucun hit sur le contrat = score ÷ 2.</div>
  </div>;
}

function CenturyPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>9 DART CENTURY · OBJECTIF {state?.config?.goal || 100}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6, marginTop: 8 }}>{state.players.map((p:any)=>{ const st=state.statsByPlayer?.[p.id]||{}; const score=Number(state.scores?.[p.id]||0); return <div key={p.id} style={{borderRadius:10,padding:"7px 8px",background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.08)"}}><div style={{fontSize:9,color:SOFT,fontWeight:900}}>{p.name}</div><div style={{fontSize:18,color:"#fff",fontWeight:1100}}>{score}<span style={{fontSize:9,color:SOFT}}> / {state.config.goal}</span></div><div style={{fontSize:8.5,color:score>state.config.goal?"#ff8d8d":accent}}>{Math.min(9,Number(st.darts||0))}/9 darts · {state.special?.centuryBustsByPlayer?.[p.id]||0} bust</div></div>})}</div>
  </div>;
}

function ShovePennyPanel({ state, accent }: any) {
  const targets = [15,16,17,18,19,20,25];
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100, marginBottom: 7 }}>SHOVE A PENNY · 3 MARQUES PAR CASE</div>
    <div style={{ overflowX:"auto" }}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:4,fontSize:9}}><thead><tr><th style={{color:SOFT,textAlign:"left"}}>JOUEUR</th>{targets.map(n=><th key={n} style={{color:SOFT}}>{n===25?"BULL":n}</th>)}</tr></thead><tbody>{state.players.map((p:any)=>{ const marks=state.special?.shoveMarksByPlayer?.[p.id]||{}; return <tr key={p.id}><td style={{color:"#fff",fontWeight:1000,whiteSpace:"nowrap"}}>{p.name}</td>{targets.map(n=>{const m=Number(marks[String(n)]||0);return <td key={n} style={{textAlign:"center",minWidth:34,borderRadius:8,padding:"6px 4px",background:m>=3?`${accent}1c`:"rgba(255,255,255,.035)",border:`1px solid ${m>=3?accent+"66":"rgba(255,255,255,.08)"}`,color:m>=3?accent:"#fff",fontWeight:1100}}>{m}/3</td>})}</tr>})}</tbody></table></div>
  </div>;
}

function GreenRedPanel({ state, accent }: any) {
  const red=[20,18,13,10,2,3,7,8,14,12], green=[1,4,6,15,17,19,16,11,9,5];
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>GREEN VS RED · PARCOURS D/T</div>
    <div style={{ display:"grid",gap:7,marginTop:8 }}>{state.players.map((p:any)=>{const color=String(state.special?.greenRedColorByPlayer?.[p.id]||"RED"); const path=color==="GREEN"?green:red; const step=Number(state.special?.greenRedStepByPlayer?.[p.id]||0); return <div key={p.id}><div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:4}}><b style={{color:color==="RED"?"#ff6b72":"#67e59b"}}>{p.name} · {color}</b><span style={{color:SOFT}}>{Math.min(step,10)}/10</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:3}}>{path.map((n,i)=><div key={n} style={{minHeight:30,borderRadius:7,display:"grid",placeItems:"center",background:i<step?(color==="RED"?"rgba(255,70,82,.18)":"rgba(70,230,140,.16)"):i===step?"rgba(255,255,255,.08)":"rgba(255,255,255,.025)",border:`1px solid ${i===step?(color==="RED"?"#ff6b72aa":"#67e59baa"):"rgba(255,255,255,.06)"}`,color:i<=step?"#fff":"#5f6674",fontSize:8.5,fontWeight:1000}}>{n}</div>)}</div></div>})}</div>
  </div>;
}

function SniperPanel({ state, accent }: any) {
  const p=state.players[state.activePlayerIndex]; const contracts=state.special?.sniperContracts||[]; const step=Number(state.special?.sniperStepByPlayer?.[p?.id]||0);
  const label=(c:any)=>!c?"—":c.bed==="IB"?"DBULL":c.bed==="OB"?"BULL":`${c.bed}${c.number||""}`;
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>SNIPER · CONTRATS</b><span style={{color:SOFT,fontSize:9}}>MISSION {Math.min(step+1,contracts.length)}/{Math.min(contracts.length,state.config.goal||contracts.length)}</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4,marginTop:8}}>{contracts.slice(0,Math.min(12,state.config.goal||12)).map((c:any,i:number)=><div key={i} style={{minHeight:38,borderRadius:8,display:"grid",placeItems:"center",background:i<step?`${accent}14`:i===step?`${accent}25`:"rgba(255,255,255,.025)",border:`1px solid ${i===step?accent+"88":"rgba(255,255,255,.07)"}`,color:i<=step?"#fff":"#667080",fontSize:9,fontWeight:1100}}>{i<step?"✓":label(c)}</div>)}</div></div>;
}

function LuciolePanel({ state, accent, reveal }: any) {
  const p=state.players[state.activePlayerIndex]; const step=Number(state.special?.lucioleStepByPlayer?.[p?.id]||0); const target=wave61LucioleTarget(state,p?.id);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, textAlign:"center" }}><div style={{color:accent,fontSize:10,fontWeight:1100}}>LUCIOLE · FLASH MÉMOIRE</div><div style={{marginTop:8,minHeight:72,borderRadius:16,display:"grid",placeItems:"center",border:`1px solid ${reveal?accent+"aa":"rgba(255,255,255,.08)"}`,background:reveal?`radial-gradient(circle,${accent}33,${accent}09 52%,transparent 70%)`:"rgba(255,255,255,.025)",boxShadow:reveal?`0 0 28px ${accent}44`:"none",fontSize:reveal?34:28,fontWeight:1200,color:reveal?"#fff":"#4c5360"}}>{reveal?target:"✦"}</div><div style={{marginTop:6,color:SOFT,fontSize:9.3}}>La luciole s'affiche 1,6 s au changement de tour · progression {step}/{state.config.goal}</div></div>;
}

function GoldenDartPanel({ state, accent }: any) {
  const clues=state.special?.goldenClues||[]; const target=wave61GoldenTarget(state);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>GOLDEN DART · CIBLE SECRÈTE</b><span style={{color:SOFT,fontSize:9}}>{state.special?.goldenIndex||0}+ trouvée(s)</span></div><div style={{minHeight:54,marginTop:8,borderRadius:13,border:`1px solid ${accent}55`,background:`linear-gradient(135deg,${accent}15,rgba(255,255,255,.02))`,display:"grid",placeItems:"center",color:accent,fontSize:20,fontWeight:1200}}>🌟 {state.phase==="finished"?`SECTEUR ${target}`:"???"}</div><div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:7}}>{clues.length?clues.slice(-4).map((c:any,i:number)=><span key={i} style={{borderRadius:999,padding:"5px 8px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"#e7ebf4",fontSize:8.8,fontWeight:900}}>🔎 {c.label}</span>):<span style={{color:SOFT,fontSize:9.2}}>Aucun indice : tente un secteur de 1 à 20.</span>}</div></div>;
}


export default function Wave61Play(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: false });
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const modeId = String(props?.params?.gameId || props?.gameId || resumeRecord?.modeId || resumeRecord?.game?.modeId || "");
  const spec = DARTS_WAVE_61.find((m) => m.id === modeId) || DARTS_WAVE_61[0];
  const preset = getWave61Preset(spec.id);
  const rawConfig = props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {};
  const config = React.useMemo(() => normalizeWave61Config(spec.id, rawConfig), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i+1}`), name: playerName(p, i) })), [profiles]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || null;
  const [state, setState] = React.useState<Wave61State>(() => restored?.mode === "wave61" && restored?.modeId === spec.id ? cloneWave61State(restored) : createWave61State(players, spec.id, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undo, setUndo] = React.useState<Wave61State[]>([]);
  const [notice, setNotice] = React.useState("");
  const [memoryReveal, setMemoryReveal] = React.useState(false);
  const memoryTimerRef = React.useRef<number | null>(null);
  const [lucioleReveal, setLucioleReveal] = React.useState(spec.id === "luciole");
  const lucioleTimerRef = React.useRef<number | null>(null);
  const botBusy = React.useRef(false);
  const finishedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `wave61-${spec.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const target = getWave61Target(state);
  const accent = preset.accent;

  const buildRecord = React.useCallback((s: Wave61State, status: "in_progress" | "finished") => ({
    id: matchIdRef.current,
    matchId: matchIdRef.current,
    resumeId: matchIdRef.current,
    kind: spec.id,
    mode: spec.id,
    modeId: spec.id,
    sport: "darts",
    status,
    createdAt: s.startedAt,
    updatedAt: Date.now(),
    finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined,
    winnerId: s.winnerId,
    players: profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null })),
    game: { mode: spec.id, modeId: spec.id, engineFamily: s.family, engineVersion: WAVE61_ENGINE_VERSION },
    summary: { mode: spec.id, modeId: spec.id, family: s.family, winnerId: s.winnerId, winnerTeamId: s.winnerTeamId, finalScores: s.scores, finalProgress: s.progress, health: s.health, statsByPlayer: s.statsByPlayer, config: s.config },
    resume: { mode: "wave61", modeId: spec.id, config: s.config, state: cloneWave61State(s), updatedAt: Date.now() },
    payload: { kind: spec.id, mode: spec.id, modeId: spec.id, sport: "darts", config: s.config, stateSnapshot: cloneWave61State(s), visits: s.visits, stats: { players: s.statsByPlayer } },
  }), [profiles, spec.id]);

  const persist = React.useCallback((s: Wave61State) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      void History.upsert(buildRecord(s, "finished")).catch(() => {});
    } else void History.upsert(buildRecord(s, "in_progress")).catch(() => {});
  }, [buildRecord]);

  const commit = React.useCallback((next: Wave61State, previous = state) => {
    setUndo((u) => [...u.slice(-39), cloneWave61State(previous)]);
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    const last = next.visits[next.visits.length - 1];
    setNotice(next.phase === "finished" ? `🏆 ${next.players.find((p) => p.id === next.winnerId)?.name || "Victoire"} remporte ${spec.label}` : (last?.events || []).join(" · "));
    persist(next);
  }, [state, spec.label, persist]);

  const validate = () => {
    if (!currentThrow.length || state.phase === "finished" || activeIsBot) return;
    commit(playWave61Visit(state, currentThrow.map(uiToGameDart)));
  };

  const doUndo = () => setUndo((u) => {
    if (!u.length) return u;
    const prev = u[u.length - 1];
    finishedRef.current = false;
    setState(cloneWave61State(prev));
    setCurrentThrow([]);
    setMultiplier(1);
    setNotice("Dernière volée annulée");
    persist(prev);
    return u.slice(0, -1);
  });

  React.useEffect(() => {
    if (!activeIsBot || state.phase === "finished" || botBusy.current) return;
    botBusy.current = true;
    const timer = window.setTimeout(() => {
      try { commit(playWave61Visit(state, pickWave61BotDarts(state, config.botLevel))); }
      finally { botBusy.current = false; }
    }, 620);
    return () => window.clearTimeout(timer);
  }, [state, activeIsBot, activePlayer?.id]);

  React.useEffect(() => { if (state.phase === "playing") persist(state); }, []);

  React.useEffect(() => {
    setMemoryReveal(false);
    if (memoryTimerRef.current) window.clearTimeout(memoryTimerRef.current);
    return () => { if (memoryTimerRef.current) window.clearTimeout(memoryTimerRef.current); };
  }, [activePlayer?.id, state.roundIndex]);

  React.useEffect(() => {
    if (spec.id !== "luciole" || state.phase !== "playing") return;
    setLucioleReveal(true);
    if (lucioleTimerRef.current) window.clearTimeout(lucioleTimerRef.current);
    lucioleTimerRef.current = window.setTimeout(() => setLucioleReveal(false), 1600);
    return () => { if (lucioleTimerRef.current) window.clearTimeout(lucioleTimerRef.current); };
  }, [spec.id, activePlayer?.id, state.turnIndex, state.phase]);

  function revealMemory() {
    setMemoryReveal(true);
    if (memoryTimerRef.current) window.clearTimeout(memoryTimerRef.current);
    memoryTimerRef.current = window.setTimeout(() => setMemoryReveal(false), 2000);
  }

  function replay() {
    matchIdRef.current = `wave61-${spec.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    finishedRef.current = false;
    setUndo([]);
    setNotice("");
    setCurrentThrow([]);
    setMultiplier(1);
    setState(createWave61State(players, spec.id, config));
  }

  const roundLabel = Math.min(config.rounds, state.roundIndex + 1);
  const teamMode = config.participantMode === "teams";

  return <div style={{ minHeight: "calc(var(--vh,1vh) * 100)", paddingBottom: 18, background: `radial-gradient(circle at 50% 0%,${accent}13,transparent 35%)` }}>
    <PageHeader title={spec.label} subtitle={`${preset.label} · moteur V${WAVE61_ENGINE_VERSION}`} left={<BackDot onClick={() => go?.("wave61_config", { gameId: spec.id })} color={accent} glow={`${accent}88`} />} right={<InfoDot title={`${spec.label} — règles`} color={accent} glow={`${accent}77`} content={familyRules(spec, preset)} />} />
    {spec.id === "tug_rush" ? <div style={{ padding: "5px 8px 1px", maxWidth: 1040, margin: "0 auto" }}><img src={tickerTugRush} alt="TUG RUSH" style={{ width: "100%", maxHeight: 210, aspectRatio: "800 / 230", objectFit: "cover", borderRadius: 14, display: "block", border: `1px solid ${accent}44`, boxShadow: `0 10px 30px rgba(0,0,0,.36)` }} /></div> : null}
    <div style={{ padding: "7px 8px 18px", maxWidth: 1040, margin: "0 auto", display: "grid", gap: 8 }}>
      <div style={{ ...panelStyle(accent + "45"), padding: 9, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
        <div><div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: 1 }}>ROUND {roundLabel}/{config.rounds} · {preset.label.toUpperCase()}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{state.phase === "finished" ? "Partie terminée" : `${activePlayer?.name || "—"} joue`}</div></div>
        <button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(accent, !undo.length)}>↶ UNDO</button>
      </div>

      {notice ? <div style={{ borderRadius: 12, padding: "7px 10px", background: `${accent}0d`, border: `1px solid ${accent}2f`, color: "#e9ecf5", fontSize: 10.5, fontWeight: 850 }}>{notice}</div> : null}

      {teamMode ? <div style={{ ...panelStyle("rgba(255,255,255,.08)"), padding: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(state.teamScores || {}).map(([team, score]: any) => <span key={team} style={{ borderRadius: 999, padding: "5px 9px", border: `1px solid ${team === "A" ? accent + "55" : "#ff657d55"}`, color: team === "A" ? accent : "#ff8fa0", fontSize: 10, fontWeight: 1000 }}>TEAM {team} · {Math.round(Number(score || 0))}</span>)}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
        {state.players.map((p: any, i: number) => {
          const prof = profileById.get(String(p.id)) || p;
          const metric = wave61PrimaryMetric(state, p.id);
          const eliminated = !!state.eliminated[p.id];
          const pct = preset.defaultGoal > 0 ? Math.min(100, (Number(state.progress[p.id] || state.scores[p.id] || 0) / Math.max(1, config.goal)) * 100) : 0;
          return <div key={p.id} style={{ display: "grid", gap: 4 }}><PlayerCard profile={prof} active={state.phase !== "finished" && state.activePlayerIndex === i} accent={accent} value={metric.value} subValue={`${metric.label} · ${metric.sub}${teamMode ? ` · Team ${config.teamByPlayer?.[p.id] || "?"}` : ""}`} badge={eliminated ? "OUT" : null} muted={eliminated} />{preset.defaultGoal > 0 && state.family !== "survival" && state.family !== "combat" ? <Meter value={state.progress[p.id] || state.scores[p.id] || 0} max={config.goal} accent={accent} /> : null}</div>;
        })}
      </div>

      {spec.id === "align_4" ? <Align4Board state={state} accent={accent} /> : null}
      {spec.id === "demineur" ? <MineBoard state={state} accent={accent} /> : null}
      {spec.id === "codebreaker" ? <CodebreakerPanel state={state} accent={accent} /> : null}
      {spec.id === "face_mystere" ? <FaceMysterePanel state={state} accent={accent} /> : null}
      {spec.id === "colin_maillard" ? <ColinBoard state={state} accent={accent} reveal={memoryReveal} onReveal={revealMemory} /> : null}
      {spec.id === "replicat" ? <ReplicatPanel state={state} accent={accent} /> : null}
      {spec.id === "double_down" ? <DoubleDownPanel state={state} accent={accent} target={target} /> : null}
      {spec.id === "nine_dart_century" ? <CenturyPanel state={state} accent={accent} /> : null}
      {spec.id === "shove_a_penny" ? <ShovePennyPanel state={state} accent={accent} /> : null}
      {spec.id === "green_vs_red" ? <GreenRedPanel state={state} accent={accent} /> : null}
      {spec.id === "sniper" ? <SniperPanel state={state} accent={accent} /> : null}
      {spec.id === "luciole" ? <LuciolePanel state={state} accent={accent} reveal={lucioleReveal} /> : null}
      {spec.id === "golden_dart" ? <GoldenDartPanel state={state} accent={accent} /> : null}
      {spec.id === "tug_rush" ? <TugRushPanel state={state} accent={accent} /> : null}
      {spec.id === "un_deux_trois_soleil" ? <SoleilPanel state={state} accent={accent} /> : null}
      {spec.id === "chat_souris" ? <ChatSourisPanel state={state} accent={accent} /> : null}
      {spec.id === "maze_chase" ? <MazeChasePanel state={state} accent={accent} /> : null}
      {spec.id === "chien_chat" ? <ChienChatPanel state={state} accent={accent} /> : null}
      {spec.id === "roller_coaster" ? <RollerCoasterPanel state={state} accent={accent} /> : null}
      {spec.id === "athletisme" ? <AthleticsPanel state={state} accent={accent} /> : null}
      {spec.id === "chute_libre" ? <FreefallPanel state={state} accent={accent} /> : null}
      {spec.id === "tyrolien" ? <TyrolienPanel state={state} accent={accent} /> : null}
      {spec.id === "saut_a_la_corde" ? <JumpRopePanel state={state} accent={accent} /> : null}
      {spec.id === "hot_potato" ? <HotPotatoPanel state={state} accent={accent} /> : null}
      {spec.id === "zombie_siege" ? <ZombieSiegePanel state={state} accent={accent} /> : null}
      {spec.id === "le_loup" ? <LoupPanel state={state} accent={accent} /> : null}
      {spec.id === "eperviers" ? <EperviersPanel state={state} accent={accent} /> : null}
      {spec.id === "ballon_prisonnier" ? <DodgeballPanel state={state} accent={accent} /> : null}
      {spec.id === "iceberg" ? <IcebergPanel state={state} accent={accent} /> : null}
      {spec.id === "jurassic_dart" ? <JurassicPanel state={state} accent={accent} /> : null}
      {spec.id === "apocalypse" ? <ApocalypsePanel state={state} accent={accent} /> : null}
      {spec.id === "knockback" ? <KnockbackPanel state={state} accent={accent} /> : null}
      {spec.id === "spartacus" ? <SpartacusPanel state={state} accent={accent} /> : null}
      {spec.id === "cosmo_knights" ? <CosmoKnightsPanel state={state} accent={accent} /> : null}

      {state.phase !== "finished" ? <>
        <div style={{ ...panelStyle(accent + "3d"), padding: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
          <div><div style={{ color: accent, fontSize: 9.5, fontWeight: 1100, letterSpacing: .8 }}>{target ? "OBJECTIF ACTIF" : "OBJECTIF LIBRE"}</div><div style={{ marginTop: 4, color: "#fff", fontSize: 18, fontWeight: 1100 }}>{spec.id === "golden_dart" ? "Trouve le secteur doré grâce aux indices" : spec.id === "luciole" ? "Mémorise la luciole avant qu'elle s'éteigne" : target?.label || (state.family === "score" ? "Marque le maximum" : spec.id === "align_4" ? "Choisis ta colonne avec le secteur" : "Fais progresser ta mission")}</div><div style={{ marginTop: 4, color: SOFT, fontSize: 9.8, lineHeight: 1.4 }}>{spec.infoBody}</div></div>
          <div style={{ minWidth: 76, minHeight: 76, borderRadius: 18, border: `1px solid ${accent}66`, background: `${accent}0d`, display: "grid", placeItems: "center", textAlign: "center", color: accent, fontWeight: 1100, fontSize: 11 }}>{state.family === "survival" || state.family === "combat" ? "⚔️\nSURVIE" : state.family === "ascent" ? "⛰️\nASCENSION" : state.family === "conquest" ? "🗺️\nCONQUÊTE" : state.family === "deduction" ? "🧩\nINDICES" : state.family === "rhythm" ? "⚡\nCOMBO" : state.family === "race" ? "🏁\nCOURSE" : "🎯\nACTION"}</div>
        </div>

        {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER LA VOLÉE" accent={accent} /> : <div style={{ ...panelStyle(accent + "35"), textAlign: "center", color: SOFT, fontSize: 11, padding: 14 }}><b style={{ color: accent }}>{activePlayer?.name}</b> calcule son prochain lancer…</div>}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={accent} title="ACTIONS DU MOTEUR" limit={5} />
      </> : <ModeEndPanel title={spec.label} winner={state.winnerId} profiles={profiles} legWins={{ [state.winnerId || ""]: 1 }} accent={accent} onReplay={replay} onConfig={() => go?.("wave61_config", { gameId: spec.id })} onGames={() => go?.("games", { gamesView: "all" })} extra={<div style={{ color: SOFT, fontSize: 10.5, lineHeight: 1.5 }}>{state.winnerTeamId ? `Team ${state.winnerTeamId} victorieuse · ` : ""}{preset.label} · {state.visits.length} volées enregistrées</div>} />}
    </div>
  </div>;
}
