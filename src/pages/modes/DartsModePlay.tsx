// @ts-nocheck
// =============================================================
// src/pages/modes/DartsModePlay.tsx
// Play generique pour les nouveaux modes (base scoring)
// =============================================================
import React from "react";
import InfoDot from "../../components/InfoDot";
import { getModeById } from "../../lib/dartsModesCatalog";

export default function DartsModePlay({ go, gameId, config }) {
  const mode = getModeById(gameId);
  const cfg = config ?? (() => {
    try { return JSON.parse(localStorage.getItem(`dc_modecfg_${gameId}`) || "null"); } catch { return null; }
  })();

  const players = cfg?.players ?? [];
  const rounds = cfg?.rounds ?? (mode?.defaultRounds ?? 10);
  const targetScore = cfg?.targetScore ?? null;

  const [active, setActive] = React.useState(0);
  const [roundIdx, setRoundIdx] = React.useState(1);
  const [scores, setScores] = React.useState(() => players.map(() => 0));
  const [visit, setVisit] = React.useState("");

  const T = {
    text:"#fff",
    sub:"rgba(255,255,255,0.72)",
    card:"rgba(255,255,255,0.06)",
    border:"rgba(255,255,255,0.12)",
    accent:"#f3c76a",
  };

  function commit(v) {
    const val = Math.max(0, Math.min(180, Number(v) || 0));
    setScores(prev => {
      const next = [...prev];
      next[active] = (next[active] || 0) + val;
      return next;
    });

    // next player / round
    const isLastPlayer = active >= players.length - 1;
    if (isLastPlayer) setRoundIdx(r => r + 1);
    setActive(a => (a + 1) % Math.max(1, players.length));
    setVisit("");

    // win by target
    if (targetScore && (scores[active] + val) >= targetScore) {
      alert(`${players[active]?.name ?? "Joueur"} a atteint ${targetScore} !`);
      go("home");
      return;
    }
    // end after rounds
    if (isLastPlayer && roundIdx >= rounds) {
      const best = Math.max(...scores.map((s,i)=> i===active ? s+val : s));
      const winIdx = scores.map((s,i)=> i===active ? s+val : s).indexOf(best);
      alert(`Fin ! Vainqueur: ${players[winIdx]?.name ?? "Joueur"} (${best})`);
      go("home");
    }
  }

  return (
    <div style={{
      height:"100dvh",
      overflow:"hidden",
      background:"radial-gradient(1100px 700px at 50% -10%, rgba(243,199,106,0.18), rgba(0,0,0,0) 60%), linear-gradient(180deg,#05060a,#070811 55%,#05060a)",
      color:T.text,
      display:"flex",
      flexDirection:"column",
      padding:10,
      gap:10,
    }}>
      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"6px 4px 0",
      }}>
        <div>
          <div style={{ fontWeight:950, color:T.accent, fontSize:18 }}>
            {mode?.label ?? "Mode"}
          </div>
          <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>
            Round {Math.min(roundIdx, rounds)}/{rounds}{targetScore ? ` • Objectif ${targetScore}` : ""}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <InfoDot title={mode?.infoTitle ?? "Regles"} body={mode?.infoBody ?? ""} />
          <button onClick={() => go("home")} style={{
            border:"1px solid "+T.border, background:"rgba(0,0,0,0.25)", color:"#fff",
            borderRadius:12, padding:"10px 12px", fontWeight:900,
          }}>Quitter</button>
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {players.map((p, idx) => {
          const isA = idx === active;
          return (
            <div key={p.id ?? idx} style={{
              background:T.card,
              border:"1px solid "+(isA ? "rgba(243,199,106,0.55)" : T.border),
              borderRadius:16,
              padding:12,
              boxShadow:isA ? "0 18px 40px rgba(0,0,0,0.45)" : "none",
            }}>
              <div style={{ fontWeight:950, letterSpacing:0.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {p.name ?? "Joueur"}
              </div>
              <div style={{ marginTop:6, fontSize:22, fontWeight:950 }}>
                {scores[idx] ?? 0}
              </div>
              {isA && <div style={{ marginTop:6, fontSize:12, color:T.sub }}>Joueur actif</div>}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{
        marginTop:"auto",
        background:T.card,
        border:"1px solid "+T.border,
        borderRadius:16,
        padding:12,
      }}>
        <div style={{ fontSize:12, color:T.sub }}>Visite (0-180)</div>
        <div style={{ display:"flex", gap:10, marginTop:8, alignItems:"center" }}>
          <input value={visit} onChange={(e)=>setVisit(e.target.value)} inputMode="numeric" style={{
            flex:1,
            borderRadius:14,
            border:"1px solid "+T.border,
            background:"rgba(0,0,0,0.30)",
            color:"#fff",
            padding:"12px 12px",
            fontSize:18,
            fontWeight:950,
          }} />
          <button onClick={() => commit(visit)} style={{
            border:"1px solid rgba(243,199,106,0.45)",
            background:"rgba(243,199,106,0.16)",
            color:"#fff",
            borderRadius:14,
            padding:"12px 14px",
            fontWeight:950,
          }}>OK</button>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          <button onClick={()=>setVisit("0")} style={{
            border:"1px solid "+T.border, background:"rgba(255,255,255,0.06)", color:"#fff",
            borderRadius:12, padding:"10px 12px", fontWeight:900,
          }}>0</button>
          <button onClick={()=>setVisit("")} style={{
            border:"1px solid "+T.border, background:"rgba(255,255,255,0.06)", color:"#fff",
            borderRadius:12, padding:"10px 12px", fontWeight:900,
          }}>Effacer</button>
          <div style={{ flex:1 }} />
          <button onClick={() => go("darts_mode_config", { gameId })} style={{
            border:"1px solid "+T.border, background:"rgba(255,255,255,0.06)", color:"#fff",
            borderRadius:12, padding:"10px 12px", fontWeight:900,
          }}>Configurer</button>
        </div>
      </div>
    </div>
  );
}
