// @ts-nocheck
import React from "react";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import type { X01ConfigV3 } from "../types/x01v3";
import { useTheme } from "../contexts/ThemeContext";
import BackDot from "../components/BackDot";
import GameDifficultyStars from "../components/GameDifficultyStars";
import tickerX01 from "../assets/tickers/ticker_x01.png";
import X01AwenaRulesVideo from "../components/X01AwenaRulesVideo";
import { MSS_HIT } from "../lib/mssVisualCharter";
import MssSelectorIconButton from "../components/MssSelectorIconButton";
import { MssConfigCaption, MssConfigFact } from "../components/config/MssPremiumConfig";
import MssMatchFormatPanel, { MssStartOrderSection } from "../components/config/MssMatchFormatPanel";
import MssParticipantModeIcon from "../components/config/MssParticipantModeIcon";
import MssArcadeAwenaTip from "../components/config/MssArcadeAwenaTip";

type QuickMode = "duel" | "teams" | "multi";
type VictoryMode = "best_of" | "first_to";

const LS_KEY = "mss:x01:quick-config:v1";
const X01_QUICK_STEPS = ["Participants", "Score et sortie", "Format de match", "Ordre de départ", "Récapitulatif"] as const;
const X01_QUICK_TIPS = [
  "En 501 double out, prépare un double confortable avant la dernière volée.",
  "Un double IN oblige à ouvrir le score avec une double : anticipe ta première fléchette.",
  "En Best Of, la régularité fait souvent la différence sur plusieurs legs.",
  "Aléatoire, alterné, manuel ou bull : choisissez le départ avant de jouer.",
  "Un dernier contrôle des scores et des équipes évite les erreurs au lancement.",
] as const;
// Référence des formats X01 Arcade, sans restriction arbitraire sur la partie rapide.
const LEG_BEST_OF = [1, 3, 5, 7, 9, 11, 13, 15];
const LEG_FIRST_TO = [1, 3, 5, 7, 9, 10, 11, 13, 15, 16, 17, 18];
const SET_VALUES = [1, 3, 5, 7, 9, 11, 13];
const legOptionsFor = (mode: VictoryMode) => mode === "best_of" ? LEG_BEST_OF : LEG_FIRST_TO;
const countFromSelection = (mode: VictoryMode, target: number) => mode === "first_to" ? target * 2 - 1 : target;
const formatPart = (mode: VictoryMode, target: number, kind: string) =>
  `${mode === "best_of" ? "BO" : "First to "}${target} ${kind}`;

export default function X01QuickConfig({ onBack, onStart }: { onBack: () => void; onStart: (cfg: X01ConfigV3) => void }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#55e6ff";
  const [rulesVideoOpen, setRulesVideoOpen] = React.useState(false);
  const [quickStep, setQuickStep] = React.useState(0);
  const [mode, setMode] = React.useState<QuickMode>("duel");
  const [serveMode, setServeMode] = React.useState<"random" | "alternate" | "manual" | "bull">("alternate");
  const [multiCount, setMultiCount] = React.useState(4);
  const [startScore, setStartScore] = React.useState<301 | 501 | 701 | 901 | 1001>(501);
  const [inMode, setInMode] = React.useState<"single" | "double">("single");
  const [outMode, setOutMode] = React.useState<"single" | "double">("double");
  // Deux réglages indépendants, identiques à l'Arcade : BO/FT LEGS et BO/FT SETS.
  const [legVictoryMode, setLegVictoryMode] = React.useState<VictoryMode>("best_of");
  const [legVictoryTarget, setLegVictoryTarget] = React.useState(3);
  const [setVictoryMode, setSetVictoryMode] = React.useState<VictoryMode>("best_of");
  const [setVictoryTarget, setSetVictoryTarget] = React.useState(1);
  const [names, setNames] = React.useState<string[]>(["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8", "J9", "J10"]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const v = JSON.parse(raw);
      if (["duel", "teams", "multi"].includes(v?.mode)) setMode(v.mode);
      if (["random", "alternate", "manual", "bull"].includes(v?.serveMode)) setServeMode(v.serveMode);
      if ([301, 501, 701, 901, 1001].includes(Number(v?.startScore))) setStartScore(Number(v.startScore) as any);
      if (["single", "double"].includes(v?.inMode)) setInMode(v.inMode);
      if (["single", "double"].includes(v?.outMode)) setOutMode(v.outMode);
      // Migration douce de l'ancien format unique BO/FT + LEGS/SETS.
      const oldMode: VictoryMode = v?.victoryMode === "first_to" ? "first_to" : "best_of";
      const legMode: VictoryMode = v?.legVictoryMode === "first_to" ? "first_to" :
        v?.legVictoryMode === "best_of" ? "best_of" : v?.unit === "legs" ? oldMode : "best_of";
      const restoredSetMode: VictoryMode = v?.setVictoryMode === "first_to" ? "first_to" :
        v?.setVictoryMode === "best_of" ? "best_of" : v?.unit === "sets" ? oldMode : "best_of";
      const requestedLegs = Number(v?.legVictoryTarget ?? (v?.unit === "legs" ? v?.target : 3));
      const requestedSets = Number(v?.setVictoryTarget ?? (v?.unit === "sets" ? v?.target : 1));
      setLegVictoryMode(legMode);
      setSetVictoryMode(restoredSetMode);
      setLegVictoryTarget(legOptionsFor(legMode).includes(requestedLegs) ? requestedLegs : 3);
      setSetVictoryTarget(SET_VALUES.includes(requestedSets) ? requestedSets : 1);
      if (Number.isFinite(Number(v?.multiCount))) setMultiCount(Math.max(3, Math.min(10, Number(v.multiCount))));
    } catch {}
  }, []);

  const legVictoryOptions = legOptionsFor(legVictoryMode);
  const formatSummary = setVictoryTarget <= 1
    ? formatPart(legVictoryMode, legVictoryTarget, "legs")
    : `${formatPart(setVictoryMode, setVictoryTarget, "sets")} • ${formatPart(legVictoryMode, legVictoryTarget, "legs")}`;

  function selectLegVictoryMode(next: VictoryMode) {
    setLegVictoryMode(next);
    setLegVictoryTarget(current => legOptionsFor(next).includes(current) ? current : legOptionsFor(next)[0]);
  }
  function selectSetVictoryMode(next: VictoryMode) {
    setSetVictoryMode(next);
    setSetVictoryTarget(current => SET_VALUES.includes(current) ? current : SET_VALUES[0]);
  }

  const playerCount = mode === "duel" ? 2 : mode === "teams" ? 4 : multiCount;
  const shownNames = names.slice(0, playerCount);

  function updateName(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function start() {
    const sessionId = `quick-${Date.now().toString(36)}`;
    const players = shownNames.map((rawName, idx) => {
      const id = `${sessionId}-p${idx + 1}`;
      const name = String(rawName || "").trim() || `J${idx + 1}`;
      return {
        id,
        profileId: null,
        temporaryPlayerId: id,
        isTemporary: true,
        name,
        avatarDataUrl: quickPartyAvatar(idx, sessionId),
        avatarUrl: quickPartyAvatar(idx, sessionId),
        dartSetId: null,
      };
    });

    const isTeams = mode === "teams";
    const isMulti = mode === "multi";
    // Le moteur attend les cibles BO/FT ainsi que le nombre équivalent
    // de manches/sets possibles (voir X01ConfigV3 et x01FlowV3).
    const setsToWin = countFromSelection(setVictoryMode, setVictoryTarget);
    const legsPerSet = countFromSelection(legVictoryMode, legVictoryTarget);
    const matchFormat = {
      type: setVictoryMode, target: setVictoryTarget,
      unit: setVictoryTarget <= 1 ? "legs" : "sets",
    };

    const cfg: any = {
      id: `x01v3-${sessionId}`,
      createdAt: Date.now(),
      startScore,
      x01StartScore: startScore,
      inMode,
      outMode,
      gameMode: isTeams ? "teams" : isMulti ? "multi" : "solo",
      matchMode: isTeams ? "teams" : isMulti ? "multi" : "solo",
      x01Variant: isTeams ? "team" : isMulti ? "multi" : playerCount === 2 ? "duo" : "solo",
      players,
      teams: isTeams
        ? [
            { id: `${sessionId}-team-1`, name: "ÉQUIPE 1", players: [players[0].id, players[1].id] },
            { id: `${sessionId}-team-2`, name: "ÉQUIPE 2", players: [players[2].id, players[3].id] },
          ]
        : undefined,
      multiFinishMode: isMulti ? "stop_on_first" : "stop_on_first",
      serveMode,
      matchVictoryMode: setVictoryMode,
      victoryMode: setVictoryMode,
      matchFormat,
      setVictoryMode,
      setVictoryTarget,
      setFormat: { type: setVictoryMode, target: setVictoryTarget, unit: "sets" },
      legVictoryMode,
      legVictoryTarget,
      legFormat: { type: legVictoryMode, target: legVictoryTarget, unit: "legs" },
      setsToWin,
      legsPerSet,
      scoringSource: "manual",
      externalScoring: false,
      scoreInputDefaultMethod: "visit_score",
      voiceScoreInputEnabled: false,
      audio: { arcadeEnabled: false, hitEnabled: false, voiceEnabled: false, sfxVolume: 0 },
      quickParty: true,
      partyMode: "quick",
      profileStatsDeferred: true,
      temporaryParticipants: true,
      quickInputCanSwitchToDetailed: true,
    };

    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        mode, multiCount, startScore, inMode, outMode, serveMode,
        legVictoryMode, legVictoryTarget, setVictoryMode, setVictoryTarget,
        // Pour une éventuelle ancienne version encore déployée.
        victoryMode: setVictoryTarget > 1 ? setVictoryMode : legVictoryMode,
        target: setVictoryTarget > 1 ? setVictoryTarget : legVictoryTarget,
        unit: setVictoryTarget > 1 ? "sets" : "legs",
      }));
    } catch {}
    onStart(cfg as X01ConfigV3);
  }


  const card: React.CSSProperties = { background: "rgba(10,12,24,.96)", borderRadius: 19,
    border: `1px solid ${accent}43`, padding: 15, minWidth: 0,
    boxShadow: "0 12px 25px rgba(0,0,0,.32)" };
  const heading: React.CSSProperties = { margin: 0, fontSize: 13.5, fontWeight: 1000, color: accent, letterSpacing: .7 };
  const subtle: React.CSSProperties = { marginTop: 4, fontSize: 10.5, color: "#abb4c8" };
  const miniHeading: React.CSSProperties = { fontSize: 11, fontWeight: 950, color: "#c5cde0", letterSpacing: .2 };
  const roundChoice = (active: boolean): React.CSSProperties => ({ width: 36, height: 36, borderRadius: '50%',
    border:`1px solid ${active?accent:'rgba(255,255,255,.14)'}`,
    background:active?`${accent}22`:'rgba(255,255,255,.025)',
    color:active?accent:'#e3e7f3', fontSize:12, fontWeight:950, cursor:'pointer' });
  const compactChoice = (active: boolean): React.CSSProperties => ({ borderRadius:999,
    border:`1px solid ${active?accent:'rgba(255,255,255,.14)'}`,
    background:active?`${accent}18`:'rgba(255,255,255,.02)',
    color:active?accent:'#d5d9e8', padding:'8px 13px', fontWeight:900, fontSize:11, cursor:'pointer' });
  const keypadChoice = (active: boolean, color: string): React.CSSProperties => ({
    borderRadius: 12, minHeight: 42, cursor: 'pointer', padding: '8px 6px', fontSize: 11.5, fontWeight: 950,
    border: `1px solid ${active?accent:color+'66'}`,
    boxShadow: active?`0 0 0 2px ${accent}65, 0 0 12px ${accent}24`:'none',
    background: `${color}${active?'28':'10'}`, color: '#f7f7fb',
  });
  return (
    <div className="screen x01-config-v3-screen msc-mode-config" style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", color: "#f7f7fb",
      padding: "12px 12px max(88px, env(safe-area-inset-bottom))",
      background: "radial-gradient(circle at top, #15192c 0, #070913 48%, #03040b 100%)",
    }}>
      <header className="msc-mode-config-header" style={{ position: "relative", margin: "0 -12px 9px" }}>
        <div className="msc-config-ticker-frame" style={{ position: "relative", paddingTop: "env(safe-area-inset-top)" }}>
          <img className="msc-config-ticker-image" src={tickerX01} alt="X01" draggable={false}
            style={{ display: "block", width: "100%", height: "auto", maxHeight: 116, objectFit: "cover" }} />
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <BackDot onClick={onBack} title="Retour" size={40} color={accent} glow={`${accent}88`} />
          </div>
        </div>
      </header>
      <div data-mss-config-difficulty="1" style={{ display: "flex", justifyContent: "center", marginBottom: 11 }}>
        <GameDifficultyStars game="x01" compact showValue={false} />
      </div>

      <main style={{ display: "grid", gap: 12, width: "100%", maxWidth: 760, margin: "0 auto", minWidth: 0 }}>
        <section style={card} aria-label="Partie rapide X01">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 9 }}>
            <div style={{ minWidth: 0 }}>
              <div style={heading}>PARTIE RAPIDE X01</div>
              <div style={subtle}>Sans création de profil · Prête à jouer</div>
            </div>
            <button type="button" title="Awena vous explique" aria-label="Awena vous explique le X01" onClick={() => setRulesVideoOpen(true)}
              style={{ width: 43, height: 43, flexShrink: 0, borderRadius: 13, border: `1px solid ${accent}80`,
                background: "rgba(255,255,255,.035)", color: accent, cursor: "pointer", display: "grid", placeItems: "center" }}>
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/>
              </svg>
            </button>
          </div>
        </section>

        <section style={{ ...card, display: "grid", gap: 10 }} aria-label="Étapes partie rapide X01">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={heading}>CONFIGURATION RAPIDE</strong><span style={{ color: "#aeb8d0", fontSize: 11 }}>Étape {quickStep + 1}/5 · {X01_QUICK_STEPS[quickStep]}</span></div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>{X01_QUICK_STEPS.map((name,i) => <button type="button" key={name} aria-label={`Étape ${i+1} : ${name}`} aria-current={i===quickStep ? "step" : undefined} onClick={() => setQuickStep(i)} style={{ width: 34, height: 34, borderRadius: 11, border: `1px solid ${i===quickStep ? accent : "rgba(255,255,255,.15)"}`, background: i===quickStep ? `${accent}20` : "rgba(255,255,255,.025)", color: i===quickStep ? accent : "#b5bfd2", fontWeight: 950, cursor: "pointer" }}>{i+1}</button>)}</div>
          <div style={{ height: 4, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,.09)" }}><div style={{ height: "100%", width: `${(quickStep+1)*20}%`, background: accent }}/></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}><button type="button" disabled={quickStep===0} onClick={()=>setQuickStep(n=>Math.max(0,n-1))} style={{ ...compactChoice(false), minHeight: 44 }}>← Précédent</button><button type="button" disabled={quickStep===4} onClick={()=>setQuickStep(n=>Math.min(4,n+1))} style={{ ...compactChoice(true), minHeight: 44 }}>Suivant →</button></div>
        </section>
        {quickStep === 0 && <section style={card}>
          <h3 style={heading}>PARTICIPANTS</h3>
          <div role="group" aria-label="Format des participants" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 11 }}>
            {([['duel','DUEL'],['teams','ÉQUIPES'],['multi','MULTI']] as const).map(([key,text]) => (
              <button type="button" key={key} onClick={() => setMode(key)} aria-pressed={mode === key}
                style={{ minWidth: 0, minHeight: 88, borderRadius: 15, cursor: 'pointer', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 8,
                  background: mode === key ? `${accent}20` : 'rgba(255,255,255,.025)', border: `1px solid ${mode === key ? accent : accent+'60'}`,
                  color: accent, boxShadow: mode === key ? `0 0 15px ${accent}2c` : 'none' }}>
                <MssParticipantModeIcon kind={key} size={36} /><span style={{ fontSize: 11.5, fontWeight: 950, letterSpacing: .4 }}>{text}</span>
              </button>
            ))}
          </div>
          {mode === "multi" && <div style={{ display: "flex", justifyContent: "center", gap: 10, alignItems: "center", marginTop: 12 }}>
            <button type="button" style={roundChoice(false)} onClick={() => setMultiCount(n => Math.max(3, n-1))} aria-label="Un joueur de moins">−</button>
            <strong style={{ fontSize: 12, minWidth: 75, textAlign: "center" }}>{multiCount} JOUEURS</strong>
            <button type="button" style={roundChoice(false)} onClick={() => setMultiCount(n => Math.min(10, n+1))} aria-label="Un joueur de plus">+</button>
          </div>}
          {mode === 'teams' && <div style={{ textAlign: 'center', color: '#aeb6cb', fontSize: 11, marginTop: 10 }}>2 équipes · 2 joueurs par équipe</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 12 }}>
            {shownNames.map((name,i) => <label key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", borderRadius: 12, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.025)", minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 950, color: accent, flexShrink: 0 }}>{mode === "teams" ? `${i<2 ? 'A' : 'B'}${i%2+1}` : `J${i+1}`}</span>
              <input value={name} maxLength={22} aria-label={`Nom du joueur ${i+1}`} onChange={e => updateName(i,e.target.value)} onFocus={e => e.currentTarget.select()}
                style={{ border: 0, background: "transparent", outline: 0, fontSize: 12, fontWeight: 850, color: "#fff", width: "100%", minWidth: 0 }} />
            </label>)}
          </div>
        </section>}

        {quickStep === 1 && <section style={card}>
          <h3 style={heading}>SCORE ET SORTIE</h3>
          <div style={{ ...miniHeading, marginTop: 13 }}>SCORE DE DÉPART</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6, marginTop: 7 }}>
            {[301,501,701,901,1001].map(v => <button type="button" key={v} aria-pressed={startScore===v}
              style={{ ...keypadChoice(startScore===v,MSS_HIT.simple), fontSize: 12, padding: 3 }} onClick={() => setStartScore(v as any)}>{v}</button>)}
          </div>
          <div style={{ ...miniHeading, marginTop: 13 }}>ENTRÉE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 7 }}>
            <button type="button" aria-pressed={inMode==='single'} style={keypadChoice(inMode==='single',MSS_HIT.simple)} onClick={() => setInMode('single')}>SIMPLE IN</button>
            <button type="button" aria-pressed={inMode==='double'} style={keypadChoice(inMode==='double',MSS_HIT.double)} onClick={() => setInMode('double')}>DOUBLE IN</button>
          </div>
          <div style={{ ...miniHeading, marginTop: 13 }}>SORTIE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 7 }}>
            <button type="button" aria-pressed={outMode==='single'} style={keypadChoice(outMode==='single',MSS_HIT.simple)} onClick={() => setOutMode('single')}>SIMPLE OUT</button>
            <button type="button" aria-pressed={outMode==='double'} style={keypadChoice(outMode==='double',MSS_HIT.double)} onClick={() => setOutMode('double')}>DOUBLE OUT</button>
          </div>
        </section>}

        {quickStep === 2 && <section style={card}>
          <MssMatchFormatPanel
            accent={accent}
            legMode={legVictoryMode}
            legValue={legVictoryTarget}
            legOptions={legVictoryOptions}
            setMode={setVictoryMode}
            setValue={setVictoryTarget}
            setOptions={SET_VALUES}
            startOrder={serveMode}
            selectedSummary={formatSummary}
            onLegMode={selectLegVictoryMode}
            onLegValue={setLegVictoryTarget}
            onSetMode={selectSetVictoryMode}
            onSetValue={setSetVictoryTarget}
            onStartOrder={setServeMode}
            proExpanded={false}
            onTogglePro={() => {}}
            showAdvancedFormats={false}
            showStartOrder={false}
          />
        </section>}

        {quickStep === 3 && <section style={card}>
          <MssStartOrderSection accent={accent} value={serveMode} onChange={setServeMode}/>
        </section>}

        {quickStep === 4 && <section style={{ ...card, borderColor: `${accent}66`, background:'linear-gradient(155deg,rgba(22,23,35,.97),rgba(8,10,21,.97))' }} aria-label="Fiche de partie rapide">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
            <div>
              <h3 style={{ ...heading, fontSize:15 }}>FICHE DE PARTIE</h3>
              <div style={{ ...subtle, fontSize:11 }}>{mode==='teams'?'2 équipes · 2 membres / équipe':mode==='duel'?'Duel · 2 joueurs':`Multi · ${playerCount} joueurs`}</div>
            </div>
            <span style={{ border:`1px solid ${accent}80`, borderRadius:99, padding:'5px 9px', color:accent, fontSize:10, fontWeight:950, whiteSpace:'nowrap' }}>✓ PRÊT</span>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,.09)', marginTop:12, paddingTop:10 }}>
            <MssConfigCaption accent={accent}>{mode==='teams'?'ÉQUIPES EN JEU':'JOUEURS EN JEU'}</MssConfigCaption>
            {mode==='teams' ? <div style={{ display:'grid', gap:7 }}>
              {[0,1].map(teamIndex => <div key={teamIndex} style={{ display:'flex', alignItems:'center', gap:9, borderLeft:`2px solid ${accent}`, borderRadius:10, background:'rgba(255,255,255,.03)', padding:'8px 10px' }}>
                <strong style={{ fontSize:11, color:accent, minWidth:63 }}>ÉQUIPE {teamIndex===0?'A':'B'}</strong>
                <span style={{ fontSize:11, color:'#d5d9e5', overflowWrap:'anywhere' }}>{shownNames.slice(teamIndex*2,teamIndex*2+2).map((n,i)=>String(n||'').trim()||`J${teamIndex*2+i+1}`).join(' · ')}</span>
              </div>)}
            </div> : <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:6 }}>
              {shownNames.map((name,i)=><div key={i} style={{ display:'flex', alignItems:'center', gap:7, minWidth:0, padding:'5px 2px' }}>
                <span style={{ background:`${accent}18`, border:`1px solid ${accent}70`, borderRadius:'50%', width:27, height:27, flex:'0 0 27px', display:'grid', placeItems:'center', color:accent, fontWeight:950, fontSize:9 }}>J{i+1}</span>
                <span style={{ fontWeight:800, fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{String(name||'').trim()||`J${i+1}`}</span>
              </div>)}
            </div>}
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,.09)', marginTop:10, paddingTop:9 }}>
            <MssConfigCaption accent={accent}>RÈGLES DE LA PARTIE</MssConfigCaption>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', columnGap:14 }}>
              <MssConfigFact label="Score" value={startScore}/>
              <MssConfigFact label="Entrée" value={`${inMode==='double'?'Double':'Simple'} IN`}/>
              <MssConfigFact label="Sortie" value={`${outMode==='double'?'Double':'Simple'} OUT`}/>
              <MssConfigFact label="Format" value={formatSummary}/>
              <MssConfigFact label="Départ" value={({random:'Aléatoire',alternate:'Alterné',manual:'Manuel',bull:'Bull'} as const)[serveMode]}/>
              <MssConfigFact label="Saisie" value="Score volée"/>
            </div>
          </div>
          <button type="button" onClick={start}
            style={{ display:'block', width:'100%', marginTop:16, minHeight:49, borderRadius:999, border:'none', cursor:'pointer', fontSize:15, fontWeight:1000,
              background:`linear-gradient(90deg, ${accent}, #ffe4a4)`, color:'#161823', boxShadow:`0 0 19px ${accent}30` }}>
            LANCER LA PARTIE
          </button>
        </section>}
        {quickStep === 4 && <MssArcadeAwenaTip quick tips={X01_QUICK_TIPS} />}
      </main>
      <X01AwenaRulesVideo open={rulesVideoOpen} onDone={() => setRulesVideoOpen(false)} />
    </div>
  );
}
