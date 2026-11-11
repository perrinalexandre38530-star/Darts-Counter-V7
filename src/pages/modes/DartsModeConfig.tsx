// @ts-nocheck
import NativeStartOrderConfig from '../../components/NativeStartOrderConfig';
// =============================================================
// src/pages/modes/DartsModeConfig.tsx
// Config generique pour les nouveaux modes (design proche configs existantes)
// =============================================================
import React from "react";
import DartsQuickHeader, { DartsQuickIntro } from "../../components/DartsQuickHeader";
import InfoDot from "../../components/InfoDot";
import { getModeById } from "../../lib/dartsModesCatalog";
import { recordProfileUsageForMode, sortProfilesByModeUsage } from "../../lib/profileUsage";

const TERRITORIES_MAPS: { id: string; label: string }[] = [
  { id: "FR", label: "France" },
  { id: "EN", label: "England" },
  { id: "IT", label: "Italy" },
  { id: "DE", label: "Germany" },
  { id: "ES", label: "Spain" },
  { id: "US", label: "USA" },
  { id: "CN", label: "China" },
  { id: "AU", label: "Australia" },
  { id: "JP", label: "Japan" },
  { id: "RU", label: "Russia" },
  { id: "WORLD", label: "World" },
];

export default function DartsModeConfig({ store, go, gameId, params }) {
  const isQuick = params?.launchMode === "quick";
  const mode = getModeById(gameId);

  // ⚙️ restore previous config (if exists)
  const savedCfg = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(`dc_modecfg_${gameId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [gameId]);

  const profiles = React.useMemo(
    () => sortProfilesByModeUsage(store?.profiles ?? [], gameId || "darts_mode", store?.activeProfileId),
    [store?.profiles, store?.activeProfileId, gameId]
  );
  const [selectedIds, setSelectedIds] = React.useState(() => {
    const saved = Array.isArray(savedCfg?.players) ? savedCfg.players.map((p: any) => p?.id).filter(Boolean) : null;
    return (saved && saved.length ? saved : profiles.slice(0, 2).map((p: any) => p.id)) as any;
  });
  const [bots, setBots] = React.useState([]);
  const [quickCount, setQuickCount] = React.useState(2);
  const [quickNames, setQuickNames] = React.useState(() => Array.from({ length: 10 }, (_,i) => `J${i+1}`));

  // Recreate bots from saved config (so selection is consistent)
  React.useEffect(() => {
    const saved = Array.isArray(savedCfg?.players) ? savedCfg.players : [];
    const botPlayers = saved
      .filter((p: any) => String(p?.id || "").startsWith("bot_"))
      .map((p: any) => ({ id: p.id, name: p.name || "BOT" }));
    if (botPlayers.length) setBots(botPlayers);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [rounds, setRounds] = React.useState(savedCfg?.rounds ?? mode?.defaultRounds ?? 10);
  const [dartsPerRound, setDartsPerRound] = React.useState(savedCfg?.dartsPerRound ?? mode?.defaultDarts ?? 3);
  const [targetScore, setTargetScore] = React.useState(savedCfg?.targetScore ?? mode?.targetScore ?? "");

  // TERRITORIES (departements) — map selection
  const isTerritories = gameId === "departements";
  const [mapId, setMapId] = React.useState(() => {
    const v = savedCfg?.mapId;
    return typeof v === "string" && v ? v : "FR";
  });

  const allPlayers = React.useMemo(() => {
    const botsAsProfiles = bots.map(b => ({ id: b.id, name: b.name, avatarDataUrl: null }));
    return [...profiles, ...botsAsProfiles];
  }, [profiles, bots]);

  const selectedPlayers = React.useMemo(() => {
    const map = new Map(allPlayers.map(p => [p.id, p]));
    return selectedIds.map(id => map.get(id)).filter(Boolean);
  }, [selectedIds, allPlayers]);

  function toggle(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function addBot() {
    const n = bots.length + 1;
    const id = `bot_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    setBots(prev => [...prev, { id, name: `BOT ${n}` }]);
    setSelectedIds(prev => [...prev, id]);
  }

  function start() {
    const quickSession = `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    const quickPlayers = quickNames.slice(0,quickCount).map((value,index) => {
      const id = `${quickSession}-p${index+1}`;
      return {id, profileId:null, temporaryPlayerId:id, isTemporary:true, name:String(value||"").trim()||`J${index+1}`, avatarDataUrl:null};
    });
    const cfg = {
      modeId: gameId,
      rounds: Math.max(1, Number(rounds) || 1),
      dartsPerRound: Math.max(1, Math.min(3, Number(dartsPerRound) || 3)),
      targetScore: targetScore === "" ? null : Number(targetScore) || null,
      ...(isTerritories ? { mapId } : {}),
      players: isQuick ? quickPlayers : selectedPlayers.map(p => ({ id: p.id, name: p.name, avatarDataUrl: p.avatarDataUrl ?? null })),
      temporaryParticipants: isQuick,
      profileStatsDeferred: isQuick,
      audio: isQuick ? { arcadeEnabled:false, hitEnabled:false, voiceEnabled:false, sfxVolume:0 } : undefined,
      quickParty: isQuick,
      partyMode: isQuick ? "quick" : "arcade",
    };
    if (!isQuick) { try { localStorage.setItem(`dc_modecfg_${gameId}`, JSON.stringify(cfg)); } catch {} }
    if (!isQuick) { try { recordProfileUsageForMode(gameId || "darts_mode", selectedPlayers.map((p: any) => p.id)); } catch {} }
    go("darts_mode_play", { gameId, config: cfg });
  }

  const T = {
    text:"#fff",
    sub:"rgba(255,255,255,0.72)",
    card:"rgba(255,255,255,0.06)",
    card2:"rgba(255,255,255,0.08)",
    border:"rgba(255,255,255,0.12)",
    accent:"#f3c76a",
  };

  if (isQuick) {
    const smallCard = {borderRadius:16,background:"rgba(15,18,30,.96)",border:"1px solid rgba(243,199,106,.28)",padding:14};
    const quickInput = {width:"100%",boxSizing:"border-box",borderRadius:11,padding:"10px 12px",background:"#181b29",color:"white",border:"1px solid rgba(255,255,255,.16)",fontSize:16};
    const fields = [
      {label:"TOURS",value:rounds,change:setRounds,min:1,max:60},
      ...(mode?.targetScore != null ? [{label:"OBJECTIF",value:targetScore,change:setTargetScore,min:1,max:9999}] : []),
    ];
    return <div className="msc-mode-config msc-mode-quick" style={{minHeight:"100dvh",background:"#060811",color:"white",padding:"12px 12px 96px"}}>
      <DartsQuickHeader modeId={gameId} title={mode?.label||gameId} onBack={()=>go("games", { gamesView: "all" })} />
      <div style={{maxWidth:760,margin:"auto",display:"grid",gap:12}}>
        <DartsQuickIntro title={mode?.label||gameId} />
        <section style={smallCard}><b style={{color:"#f3c76a"}}>JOUEURS</b><div style={{display:"flex",gap:8,margin:"10px 0"}}>{[1,2,3,4].map(n=><button key={n} onClick={()=>setQuickCount(n)} style={{padding:"9px 13px",borderRadius:12,border:`1px solid ${quickCount===n?"#f3c76a":"#444"}`,background:quickCount===n?"#514022":"#151722",color:"white"}}>{n===1?"SOLO":n===2?"DUEL":`${n} JOUEURS`}</button>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:9}}>{quickNames.slice(0,quickCount).map((name,i)=><label key={i} style={{fontSize:11}}>JOUEUR {i+1}<input aria-label={`Nom du joueur ${i+1}`} maxLength={32} value={name} onChange={e=>setQuickNames(p=>p.map((v,j)=>i===j?e.target.value:v))} style={quickInput}/></label>)}</div></section>
        <section style={smallCard}><b style={{color:"#f3c76a"}}>RÈGLES DU JEU</b><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginTop:10}}>{fields.map((f,i)=><label key={i} style={{fontSize:11,fontWeight:900}}>{f.label}<input type="number" min={f.min} max={f.max} value={f.value} onChange={e=>f.change(Number(e.target.value))} style={quickInput}/></label>)}{isTerritories&&<label style={{fontSize:11}}>CARTE<select value={mapId} onChange={e=>setMapId(e.target.value)} style={quickInput}>{TERRITORIES_MAPS.map(m=><option value={m.id} key={m.id}>{m.label}</option>)}</select></label>}</div></section>
        <button onClick={start} style={{padding:16,borderRadius:14,background:"#4a3818",color:"white",fontSize:18,fontWeight:1000,border:"1px solid #f3c76a"}}>JOUER</button>
      </div>
    </div>;
  }

  return (
    <div className="msc-mode-config msc-mode-config--split darts-mode-config-screen" style={{
      minHeight:"100vh",
      background:"radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)",
      color:T.text,
      padding:"16px 12px 92px",
      boxSizing:"border-box",
    }}>
      <div className="msc-mode-config-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:900, letterSpacing:0.3, color:T.accent }}>
            {mode?.label ?? "Mode"}
          </div>
          <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>
            Configurer la partie
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <InfoDot title={mode?.infoTitle ?? "Regles"} body={mode?.infoBody ?? ""} />
          <button onClick={() => go("home")} style={{
            border:"1px solid "+T.border,
            background:"rgba(0,0,0,0.25)",
            color:"#fff",
            borderRadius:12,
            padding:"10px 12px",
            fontWeight:800,
          }}>Quitter</button>
        </div>
      </div>

      {isQuick ? <div style={{ color: "#54efb2", fontWeight: 900, marginBottom: 10 }}>⚡ PARTIE RAPIDE · {mode?.label || gameId}</div> : null}
      <div className="msc-mode-config-primary" style={{ background:T.card, border:"1px solid "+T.border, borderRadius:16, padding:12, marginBottom:12 }}>
        <div style={{ fontWeight:900, marginBottom:10 }}>Joueurs</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {allPlayers.map(p => {
            const sel = selectedIds.includes(p.id);
            const isBot = String(p.id).startsWith("bot_");
            return (
              <div key={p.id} onClick={() => toggle(p.id)} style={{
                cursor:"pointer",
                borderRadius:14,
                border:"1px solid "+(sel ? "rgba(243,199,106,0.55)" : T.border),
                background: sel ? "rgba(243,199,106,0.10)" : T.card2,
                padding:10,
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                gap:10,
              }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:900, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {p.name ?? "Joueur"}
                  </div>
                  <div style={{ fontSize:12, color:T.sub }}>
                    {sel ? "Sélectionné" : "—"}{isBot ? " • BOT" : ""}
                  </div>
                </div>
                <div style={{
                  width:28, height:28, borderRadius:999,
                  border:"1px solid "+(sel ? "rgba(243,199,106,0.65)" : T.border),
                  background: sel ? "rgba(243,199,106,0.12)" : "rgba(0,0,0,0.25)",
                }} />
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          <button onClick={addBot} style={{
            border:"1px solid "+T.border,
            background:"rgba(255,255,255,0.06)",
            color:"#fff",
            borderRadius:12,
            padding:"10px 12px",
            fontWeight:900,
          }}>+ BOT</button>

          <div style={{ flex:1 }} />
          <div style={{ fontSize:12, color:T.sub, alignSelf:"center" }}>
            {selectedPlayers.length} sélectionné(s)
          </div>
        </div>
      </div>

      {/* TERRITORIES — Map */}
      {isTerritories && (
        <div className="msc-mode-config-secondary-extra" style={{ background:T.card, border:"1px solid "+T.border, borderRadius:16, padding:12, marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontWeight:900 }}>Carte (pays)</div>
            <InfoDot
              title="Carte"
              body="Choisis la carte qui définit les territoires à jouer (France, Spain, USA...)."
            />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:10 }}>
            <div style={{ background:"rgba(0,0,0,0.22)", border:"1px solid "+T.border, borderRadius:14, padding:10 }}>
              <div style={{ fontSize:12, color:T.sub }}>Sélection</div>
              <select value={mapId} onChange={(e)=>setMapId(e.target.value)} style={{
                width:"100%", marginTop:6, padding:"10px 10px",
                borderRadius:12, border:"1px solid "+T.border,
                background:"rgba(255,255,255,0.06)", color:"#fff",
                fontWeight:900,
              }}>
                {TERRITORIES_MAPS.map((m) => (
                  <option key={m.id} value={m.id} style={{ color:"#000" }}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize:12, color:T.sub, marginTop:8 }}>
                Code: <span style={{ color:"#fff", fontWeight:900 }}>{mapId}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="msc-mode-config-secondary" style={{ background:T.card, border:"1px solid "+T.border, borderRadius:16, padding:12 }}>
        <div style={{ fontWeight:900, marginBottom:10 }}>Options</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div style={{ background:"rgba(0,0,0,0.22)", border:"1px solid "+T.border, borderRadius:14, padding:10 }}>
            <div style={{ fontSize:12, color:T.sub }}>Rounds / Vollees</div>
            <input value={rounds} onChange={(e)=>setRounds(e.target.value)} inputMode="numeric" style={{
              width:"100%", marginTop:6, padding:"10px 10px",
              borderRadius:12, border:"1px solid "+T.border,
              background:"rgba(255,255,255,0.06)", color:"#fff",
              fontWeight:900,
            }} />
          </div>
          <div style={{ background:"rgba(0,0,0,0.22)", border:"1px solid "+T.border, borderRadius:14, padding:10 }}>
            <div style={{ fontSize:12, color:T.sub }}>Fleches / round</div>
            <input value={dartsPerRound} onChange={(e)=>setDartsPerRound(e.target.value)} inputMode="numeric" style={{
              width:"100%", marginTop:6, padding:"10px 10px",
              borderRadius:12, border:"1px solid "+T.border,
              background:"rgba(255,255,255,0.06)", color:"#fff",
              fontWeight:900,
            }} />
          </div>

          <div style={{ gridColumn:"1 / -1", background:"rgba(0,0,0,0.22)", border:"1px solid "+T.border, borderRadius:14, padding:10 }}>
            <div style={{ fontSize:12, color:T.sub }}>Objectif (optionnel)</div>
            <input placeholder="ex: 1000" value={targetScore} onChange={(e)=>setTargetScore(e.target.value)} inputMode="numeric" style={{
              width:"100%", marginTop:6, padding:"10px 10px",
              borderRadius:12, border:"1px solid "+T.border,
              background:"rgba(255,255,255,0.06)", color:"#fff",
              fontWeight:900,
            }} />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="msc-mode-config-actions" style={{
        position:"fixed",
        left:0, right:0, bottom:0,
        padding:"10px 12px 14px",
        background:"linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.85))",
      }}>
        
      <NativeStartOrderConfig />
      <button onClick={start} style={{
          width:"100%",
          border:"1px solid rgba(243,199,106,0.45)",
          background:"rgba(243,199,106,0.16)",
          color:"#fff",
          borderRadius:16,
          padding:"14px 12px",
          fontWeight:950,
          letterSpacing:0.2,
          boxShadow:"0 16px 40px rgba(0,0,0,0.35)",
        }}>
          {isQuick ? "⚡ JOUER" : "Lancer la partie"}
        </button>
      </div>
    
      
      </div>
  );
}
