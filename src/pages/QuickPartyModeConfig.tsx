// @ts-nocheck
import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type ModeId = "cricket" | "killer" | "five_lives" | "shanghai" | "halve_it" | "shooter" | "bowling" | "baseball" | "president";
type LayoutMode = "solo" | "duel" | "teams" | "multi";

type Props = {
  modeId: ModeId;
  title?: string;
  params?: any;
  onBack: () => void;
  onStart: (result: { route: string; params: any }) => void;
};

type ModeSpec = {
  title: string;
  minPlayers: number;
  maxPlayers: number;
  defaultPlayers: number;
  allowSolo?: boolean;
  allowTeams?: boolean;
  maxQuickPlayers?: number;
};

const SPECS: Record<ModeId, ModeSpec> = {
  cricket: { title: "CRICKET", minPlayers: 2, maxPlayers: 4, defaultPlayers: 2, allowTeams: true, maxQuickPlayers: 4 },
  killer: { title: "KILLER", minPlayers: 2, maxPlayers: 20, defaultPlayers: 2, maxQuickPlayers: 10 },
  five_lives: { title: "5 VIES", minPlayers: 2, maxPlayers: 10, defaultPlayers: 2, maxQuickPlayers: 10 },
  shanghai: { title: "SHANGHAI", minPlayers: 2, maxPlayers: 10, defaultPlayers: 2, maxQuickPlayers: 10 },
  halve_it: { title: "HALVE-IT", minPlayers: 1, maxPlayers: 12, defaultPlayers: 2, allowSolo: true, allowTeams: true, maxQuickPlayers: 12 },
  shooter: { title: "SHOOTER", minPlayers: 1, maxPlayers: 12, defaultPlayers: 2, allowSolo: true, allowTeams: true, maxQuickPlayers: 12 },
  bowling: { title: "BOWLING", minPlayers: 1, maxPlayers: 8, defaultPlayers: 2, allowSolo: true, allowTeams: true, maxQuickPlayers: 8 },
  baseball: { title: "BASEBALL", minPlayers: 1, maxPlayers: 12, defaultPlayers: 2, allowSolo: true, allowTeams: true, maxQuickPlayers: 12 },
  president: { title: "PRÉSIDENT", minPlayers: 3, maxPlayers: 8, defaultPlayers: 4, allowSolo: false, allowTeams: false, maxQuickPlayers: 8 },
};

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, Math.round(n))); }
function shuffle<T>(rows: T[]) { const out = [...rows]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

function buildTempPlayers(names: string[], count: number) {
  const sessionId = `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return Array.from({ length: count }, (_, index) => {
    const id = `${sessionId}-p${index + 1}`;
    return {
      id,
      profileId: null,
      temporaryPlayerId: id,
      isTemporary: true,
      name: String(names[index] || "").trim() || `J${index + 1}`,
      avatarDataUrl: null,
      avatarUrl: null,
      dartSetId: null,
      isBot: false,
    };
  });
}

function quickMeta() {
  return {
    quickParty: true,
    partyMode: "quick",
    profileStatsDeferred: true,
    temporaryParticipants: true,
    sfxEnabled: false,
    voiceEnabled: false,
    sfx: false,
    voice: false,
    audio: { arcadeEnabled: false, hitEnabled: false, voiceEnabled: false, sfxVolume: 0 },
  };
}

export default function QuickPartyModeConfig({ modeId, title, params, onBack, onStart }: Props) {
  const { theme } = useTheme();
  const spec = SPECS[modeId];
  const accent = theme?.primary || "#55e6ff";
  const [layout, setLayout] = React.useState<LayoutMode>(spec.minPlayers > 2 ? "multi" : "duel");
  const [multiCount, setMultiCount] = React.useState(spec.defaultPlayers || 2);
  const [names, setNames] = React.useState<string[]>(() => Array.from({ length: 20 }, (_, i) => `J${i + 1}`));
  const [killerLives, setKillerLives] = React.useState(3);
  const [killerAssign, setKillerAssign] = React.useState<"random" | "throw">("random");
  const [fiveLives, setFiveLives] = React.useState(5);
  const [shanghaiRounds, setShanghaiRounds] = React.useState(20);
  const [cricketPoints, setCricketPoints] = React.useState(true);
  const [cricketRounds, setCricketRounds] = React.useState(20);
  const [halvePreset, setHalvePreset] = React.useState<"classic7" | "numbers7" | "extended9" | "expert12">("classic7");
  const [shooterMarks, setShooterMarks] = React.useState(3);
  const [bowlingSets, setBowlingSets] = React.useState(1);
  const [baseballInnings, setBaseballInnings] = React.useState(9);
  const [presidentRounds, setPresidentRounds] = React.useState(5);

  const availableLayouts = React.useMemo(() => {
    const rows: Array<[LayoutMode, string]> = [];
    if (spec.allowSolo) rows.push(["solo", "SOLO"]);
    if (spec.minPlayers <= 2) rows.push(["duel", "1 VS 1"]);
    if (spec.allowTeams) rows.push(["teams", "2 VS 2"]);
    rows.push(["multi", "MULTI"]);
    return rows;
  }, [spec.allowSolo, spec.allowTeams]);

  const playerCount = layout === "solo" ? 1 : layout === "duel" ? 2 : layout === "teams" ? 4 : clamp(multiCount, Math.max(3, spec.minPlayers), spec.maxQuickPlayers || spec.maxPlayers);
  React.useEffect(() => {
    if (layout === "teams" && spec.maxPlayers < 4) setLayout("duel");
    if (layout === "solo" && !spec.allowSolo) setLayout("duel");
  }, [layout, spec]);

  const block: React.CSSProperties = { border: "1px solid rgba(255,255,255,.10)", borderRadius: 18, background: "rgba(255,255,255,.035)", padding: 12, display: "grid", gap: 9 };
  const label: React.CSSProperties = { fontSize: 10, opacity: .55, fontWeight: 950, letterSpacing: .7 };
  const chip = (active: boolean, color = accent): React.CSSProperties => ({ borderRadius: 12, border: `1px solid ${active ? color : "rgba(255,255,255,.13)"}`, background: active ? `${color}22` : "rgba(255,255,255,.035)", color: active ? color : "rgba(255,255,255,.78)", fontWeight: 950, minHeight: 40, padding: "8px 12px", cursor: "pointer" });

  function updateName(index: number, value: string) { setNames((prev) => { const next = [...prev]; next[index] = value; return next; }); }

  function start() {
    const players = buildTempPlayers(names, playerCount);
    const meta = quickMeta();
    const teamConfigs = layout === "teams" ? [
      { id: `${players[0].id}-team1`, name: "ÉQUIPE 1", playerIds: [players[0].id, players[1].id], players: [players[0].id, players[1].id], color: "#f7c85c" },
      { id: `${players[2].id}-team2`, name: "ÉQUIPE 2", playerIds: [players[2].id, players[3].id], players: [players[2].id, players[3].id], color: "#4fc3ff" },
    ] : undefined;

    if (modeId === "cricket") {
      onStart({ route: "cricket", params: { ...params, ...meta, launchMode: "quick_play", quickPlayers: players, quickPartyPlayers: players, autoQuickStart: true, quickTeamMode: layout === "teams", quickScoreMode: cricketPoints ? "points" : "no-points", quickMaxRounds: cricketRounds } });
      return;
    }

    if (modeId === "killer") {
      const progressive = String(params?.variantId || params?.gameId || "").toLowerCase().includes("progressive");
      const numbers = shuffle(Array.from({ length: 20 }, (_, i) => i + 1));
      const config: any = {
        id: `killer-quick-${Date.now()}`, mode: "killer", createdAt: Date.now(), variantId: progressive ? "progressive" : "classic", gameId: progressive ? "killer_progressive" : "killer",
        progressiveTarget: progressive ? 5 : undefined,
        lives: progressive ? 5 : killerLives,
        becomeRule: "single", damageRule: progressive ? "multiplier" : "one",
        numberAssignMode: progressive ? "throw" : killerAssign, randomStartOrder: false,
        selfHitWhileKiller: false, selfHitUsesMultiplier: false, lifeSteal: false, blindKiller: false,
        bullSplash: false, bullHeal: false, bullHealLives: 1, bullRotate: false,
        shieldOnDBull: false, disarmOnDBull: false, dbullRotate: false, shieldTurns: 1, selectBonusShield: false, missAutoHit: false,
        resurrectionMode: "off", resurrectionEnabled: false, resurrection: false, resurrectionLives: 1,
        players: players.map((p, i) => ({ ...p, number: killerAssign === "throw" || progressive ? 0 : numbers[i] })),
        ...meta,
      };
      onStart({ route: "killer_play", params: { ...params, ...meta, launchMode: "quick_play", config } });
      return;
    }

    if (modeId === "five_lives") {
      const config: any = { id: `fiveLives-quick-${Date.now()}`, mode: "five_lives", createdAt: Date.now(), startingLives: fiveLives, randomStartOrder: true, scoreInputMethod: "visit_score", players, ...meta };
      onStart({ route: "five_lives_play", params: { ...params, ...meta, launchMode: "quick_play", config } });
      return;
    }

    if (modeId === "shanghai") {
      const targetOrder = Array.from({ length: shanghaiRounds }, (_, i) => i + 1);
      const config: any = { players, maxRounds: shanghaiRounds, winRule: "shanghai_or_points", targetOrderMode: "chronological", targetOrder, ...meta };
      onStart({ route: "shanghai_play", params: { ...params, ...meta, launchMode: "quick_play", config } });
      return;
    }

    if (modeId === "shooter") {
      const selectedIds = players.map((p) => p.id);
      const config: any = { mode: "shooter", participantMode: layout === "teams" ? "teams" : "players", players: selectedIds.length, selectedIds, playersList: players, teamConfigs, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", sequencePreset: "classic", randomTargetCount: 10, includeBull: true, hitZone: "any", marksToClear: shooterMarks, maxRounds: 15, penaltyRule: "none", randomOrder: false, scoreInputMethod: "keypad", ...meta };
      onStart({ route: "shooter_play", params: { ...params, ...config, config } });
      return;
    }

    if (modeId === "bowling") {
      const selectedIds = players.map((p) => p.id);
      const config: any = { mode: "bowling", participantMode: layout === "teams" ? "teams" : "players", players: selectedIds.length, selectedIds, playersList: players, teamConfigs, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", setsToWin: bowlingSets, difficulty: "normal", bullStrike: true, doubleSpare: true, randomOrder: false, scoreInputMethod: "keypad", ...meta };
      onStart({ route: "bowling_play", params: { ...params, ...config, config } });
      return;
    }

    if (modeId === "baseball") {
      const selectedIds = players.map((p) => p.id);
      const config: any = { mode: "baseball", participantMode: layout === "teams" ? "teams" : "players", players: selectedIds.length, selectedIds, playersList: players, teamConfigs, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", innings: baseballInnings, extraInnings: true, maxExtraInnings: 3, seventhInningRule: "none", gameVariant: "target", bullTargetMode: "off", bullBonusPoints: 4, missEndsTurn: true, randomOrder: false, scoreInputMethod: "keypad", ...meta };
      onStart({ route: "baseball_play", params: { ...params, ...config, config } });
      return;
    }

    if (modeId === "president") {
      const selectedIds = players.map((p) => p.id);
      const config: any = { mode: "president", players: selectedIds.length, selectedIds, playersList: players, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", rounds: presidentRounds, handSize: 10, deckCopies: 4, variant: "classic", randomOrder: true, bullJoker: false, coupEtat: false, revolution: false, scoreInputMethod: "keypad", ...meta };
      onStart({ route: "president_play", params: { ...params, ...config, config } });
      return;
    }

    if (modeId === "halve_it") {
      const selectedIds = players.map((p) => p.id);
      const config: any = {
        mode: "halve_it", participantMode: layout === "teams" ? "teams" : "players", players: selectedIds.length, selectedIds, playersList: players,
        teamConfigs, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", sequencePreset: halvePreset, startMode: "zero", fixedStartingScore: 40, rounding: "floor", randomOrder: false, scoreInputMethod: "keypad", ...meta,
      };
      onStart({ route: "halve_it_play", params: { ...params, ...config, config } });
    }
  }

  const modeOptions = modeId === "killer" ? (
    <><div style={block}><div style={label}>VIES</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>{[3,5,7].map(v=><button key={v} style={chip(killerLives===v,"#ffc857")} onClick={()=>setKillerLives(v)}>{v}</button>)}</div></div><div style={block}><div style={label}>ATTRIBUTION DES NUMÉROS</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}><button style={chip(killerAssign==="random")} onClick={()=>setKillerAssign("random")}>ALÉATOIRE</button><button style={chip(killerAssign==="throw")} onClick={()=>setKillerAssign("throw")}>AU LANCER</button></div></div></>
  ) : modeId === "five_lives" ? (
    <div style={block}><div style={label}>VIES DE DÉPART</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>{[3,5,7,10].map(v=><button key={v} style={chip(fiveLives===v,"#ffc857")} onClick={()=>setFiveLives(v)}>{v}</button>)}</div></div>
  ) : modeId === "shanghai" ? (
    <div style={block}><div style={label}>NOMBRE DE TOURS</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>{[7,10,15,20].map(v=><button key={v} style={chip(shanghaiRounds===v,"#ffc857")} onClick={()=>setShanghaiRounds(v)}>{v}</button>)}</div></div>
  ) : modeId === "cricket" ? (
    <><div style={block}><div style={label}>SCORING</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}><button style={chip(cricketPoints)} onClick={()=>setCricketPoints(true)}>AVEC POINTS</button><button style={chip(!cricketPoints)} onClick={()=>setCricketPoints(false)}>SANS POINTS</button></div></div><div style={block}><div style={label}>LIMITE</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>{[10,20].map(v=><button key={v} style={chip(cricketRounds===v,"#ffc857")} onClick={()=>setCricketRounds(v)}>{v} TOURS</button>)}</div></div></>
  ) : modeId === "shooter" ? (
    <div style={block}><div style={label}>MARQUES POUR VALIDER</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>{[1,3,5].map(v=><button key={v} style={chip(shooterMarks===v,"#ffc857")} onClick={()=>setShooterMarks(v)}>{v}</button>)}</div></div>
  ) : modeId === "bowling" ? (
    <div style={block}><div style={label}>FORMAT</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>{[[1,"BO1"],[2,"BO3"],[3,"BO5"]].map(([v,t])=><button key={v} style={chip(bowlingSets===v,"#ffc857")} onClick={()=>setBowlingSets(Number(v))}>{t}</button>)}</div></div>
  ) : modeId === "baseball" ? (
    <div style={block}><div style={label}>MANCHE(S)</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>{[5,7,9].map(v=><button key={v} style={chip(baseballInnings===v,"#ffc857")} onClick={()=>setBaseballInnings(v)}>{v}</button>)}</div></div>
  ) : modeId === "president" ? (
    <div style={block}><div style={label}>NOMBRE DE MANCHES</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>{[1,3,5,7].map(v=><button key={v} style={chip(presidentRounds===v,"#ffc857")} onClick={()=>setPresidentRounds(v)}>{v}</button>)}</div></div>
  ) : (
    <div style={block}><div style={label}>PARCOURS</div><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:7}}>{[["classic7","CLASSIQUE 7"],["numbers7","DÉBUTANT"],["extended9","ÉTENDU 9"],["expert12","EXPERT 12"]].map(([v,t])=><button key={v} style={chip(halvePreset===v,"#ffc857")} onClick={()=>setHalvePreset(v as any)}>{t}</button>)}</div></div>
  );

  return (
    <div style={{ color: "#fff", minHeight: "100%", padding: "10px 12px 28px", display: "grid", gap: 12, alignContent: "start" }}>
      <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={{ width: 40, height: 40, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 22 }}>‹</button>
        <div style={{ textAlign: "center" }}><div style={{ fontWeight: 1000, fontSize: 22 }}>⚡ PARTIE RAPIDE {title || spec.title}</div><div style={{ fontSize: 10, opacity: .58, fontWeight: 850 }}>SANS PROFIL · SON COUPÉ · RÉGLAGES ESSENTIELS</div></div><div />
      </div>
      <div style={{ maxWidth: 900, width: "100%", margin: "0 auto", display: "grid", gap: 10 }}>
        <div style={block}>
          <div style={label}>FORMAT JOUEURS</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, availableLayouts.length)},1fr)`, gap: 7 }}>{availableLayouts.map(([key,text])=><button key={key} type="button" onClick={()=>setLayout(key)} style={chip(layout===key,"#52f5b2")}>{text}</button>)}</div>
          {layout === "multi" ? <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}><button style={chip(false)} onClick={()=>setMultiCount(n=>clamp(n-1,Math.max(3,spec.minPlayers),spec.maxQuickPlayers||spec.maxPlayers))}>−</button><strong>{playerCount} JOUEURS</strong><button style={chip(false)} onClick={()=>setMultiCount(n=>clamp(n+1,Math.max(3,spec.minPlayers),spec.maxQuickPlayers||spec.maxPlayers))}>+</button></div> : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 7 }}>{Array.from({length:playerCount},(_,i)=><label key={i} style={{display:"grid",gap:4}}><span style={{fontSize:9,opacity:.48,fontWeight:900}}>{layout==="teams"?`ÉQUIPE ${i<2?1:2} · J${i+1}`:`J${i+1}`}</span><input value={names[i]} onFocus={e=>e.currentTarget.select()} onChange={e=>updateName(i,e.target.value)} placeholder={`J${i+1}`} maxLength={22} style={{borderRadius:11,border:"1px solid rgba(255,255,255,.12)",background:"rgba(0,0,0,.24)",color:"#fff",padding:"10px 11px",fontWeight:850,outline:"none"}} /></label>)}</div>
        </div>
        {modeOptions}
        <div style={{borderRadius:16,border:"1px solid #52f5b244",background:"#52f5b20d",padding:10,textAlign:"center",fontSize:12,fontWeight:900}}>⚡ {playerCount} joueur{playerCount>1?"s":""} · profils temporaires · sauvegarde dans PARTIES RAPIDES</div>
        <button type="button" onClick={start} style={{minHeight:56,border:"1px solid #52f5b2aa",borderRadius:17,background:"linear-gradient(180deg,#52f5b23a,#52f5b214)",color:"#baffdf",fontWeight:1000,fontSize:18,letterSpacing:.6,cursor:"pointer"}}>JOUER</button>
      </div>
    </div>
  );
}
