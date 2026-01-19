// @ts-nocheck
// =============================================================
// src/pages/modes/DartsModeConfig.tsx
// Config generique pour les nouveaux modes (design proche configs existantes)
// =============================================================
import React from "react";
import InfoDot from "../../components/InfoDot";
import { getModeById } from "../../lib/dartsModesCatalog";

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

export default function DartsModeConfig({ store, go, gameId }) {
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

  const profiles = store?.profiles ?? [];
  const [selectedIds, setSelectedIds] = React.useState(() => {
    const saved = Array.isArray(savedCfg?.players) ? savedCfg.players.map((p: any) => p?.id).filter(Boolean) : null;
    return (saved && saved.length ? saved : profiles.slice(0, 2).map((p: any) => p.id)) as any;
  });
  const [bots, setBots] = React.useState([]);

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
    const cfg = {
      modeId: gameId,
      rounds: Math.max(1, Number(rounds) || 1),
      dartsPerRound: Math.max(1, Math.min(3, Number(dartsPerRound) || 3)),
      targetScore: targetScore === "" ? null : Number(targetScore) || null,
      ...(isTerritories ? { mapId } : {}),
      players: selectedPlayers.map(p => ({ id: p.id, name: p.name, avatarDataUrl: p.avatarDataUrl ?? null })),
    };
    try { localStorage.setItem(`dc_modecfg_${gameId}`, JSON.stringify(cfg)); } catch {}
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

  return (
    <div style={{
      minHeight:"100vh",
      background:"radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)",
      color:T.text,
      padding:"16px 12px 92px",
      boxSizing:"border-box",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
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

      {/* Joueurs */}
      <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:16, padding:12, marginBottom:12 }}>
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
                    {sel ? "Selectionne" : "—"}{isBot ? " • BOT" : ""}
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
            {selectedPlayers.length} selectionne(s)
          </div>
        </div>
      </div>

      {/* TERRITORIES — Map */}
      {isTerritories && (
        <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:16, padding:12, marginBottom:12 }}>
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
      <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:16, padding:12 }}>
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
      <div style={{
        position:"fixed",
        left:0, right:0, bottom:0,
        padding:"10px 12px 14px",
        background:"linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.85))",
      }}>
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
          Lancer la partie
        </button>
      </div>
    </div>
  );
}
