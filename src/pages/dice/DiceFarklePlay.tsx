// @ts-nocheck
// =============================================================
// src/pages/dice/DiceFarklePlay.tsx
// Farkle — Play (v1 simple)
// - 2 joueurs pass&play
// - Roll -> scoring auto (1/5 + triples + straights/pairs)
// - Bank pour valider le tour
// - Farkle (0 point) => tour passe
// - First to targetScore wins
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";

type Props = { go: (t:any,p?:any)=>void; params?: any; onFinish?: (m:any)=>void };

const clamp = (v:any,a:number,b:number,def:number)=> {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(a, Math.min(b, n));
};

function roll(n:number){ return Array.from({length:n},()=> 1+Math.floor(Math.random()*6)); }

function countDice(d:number[]){
  const c = [0,0,0,0,0,0,0];
  for (const x of d) c[x] = (c[x]||0)+1;
  return c;
}

function scoreFarkle(d:number[]){
  // returns {score, isFarkle}
  const c = countDice(d);
  const sorted = [...d].sort((a,b)=>a-b).join("");
  // straight 1-6
  if (sorted === "123456") return { score: 1500, isFarkle:false };
  // three pairs
  const pairs = [1,2,3,4,5,6].filter(v => c[v]===2).length;
  if (pairs===3) return { score: 1500, isFarkle:false };

  let score = 0;
  // triples / 4/5/6 of a kind
  for (let v=1; v<=6; v++){
    const n = c[v];
    if (n>=3){
      let base = (v===1) ? 1000 : v*100;
      // each extra die doubles base (common variant)
      score += base * Math.pow(2, n-3);
      c[v]=0;
    }
  }
  // singles 1 and 5
  score += (c[1]||0)*100;
  score += (c[5]||0)*50;

  return { score, isFarkle: score===0 };
}

export default function DiceFarklePlay({ go, params, onFinish }: Props){
  const { theme } = useTheme() as any;
  const config = params?.config || { mode:"farkle", targetScore: 10000, diceCount: 6, sets: 1 };
  const players = Array.isArray(params?.players) ? params.players : [];
  const A = players?.[0] || { id:"A", name:"A" };
  const B = players?.[1] || { id:"B", name:"B" };

  const target = clamp(config?.targetScore, 1000, 50000, 10000);
  const diceCount = clamp(config?.diceCount, 6, 6, 6);

  const [turnId, setTurnId] = React.useState(A.id);
  const [scores, setScores] = React.useState({ [A.id]:0, [B.id]:0 });
  const [turnPts, setTurnPts] = React.useState(0);
  const [lastRoll, setLastRoll] = React.useState<number[]|null>(null);
  const [log, setLog] = React.useState<any[]>([]);
  const [startedAt] = React.useState(Date.now());
  const [finished, setFinished] = React.useState(false);

  const cur = turnId===A.id ? A : B;
  const oth = turnId===A.id ? B : A;

  function pushLog(msg:string){
    setLog(l => [{ t:Date.now(), msg }, ...l].slice(0,40));
  }

  function nextTurn(){
    setTurnPts(0);
    setLastRoll(null);
    setTurnId(oth.id);
  }

  function doRoll(){
    if (finished) return;
    const d = roll(diceCount);
    const res = scoreFarkle(d);
    setLastRoll(d);
    if (res.isFarkle){
      pushLog(`${cur.name} : FARKLE ❌ (0)`);
      nextTurn();
      return;
    }
    setTurnPts(p => p + res.score);
    pushLog(`${cur.name} : +${res.score} (tour=${turnPts + res.score})`);
  }

  function doBank(){
    if (finished) return;
    if (turnPts<=0) return;
    const next = { ...scores, [cur.id]: (scores[cur.id]||0) + turnPts };
    setScores(next);
    pushLog(`${cur.name} BANK ✅ (+${turnPts}) total=${next[cur.id]}`);
    if (next[cur.id] >= target){
      finishMatch(cur.id, next);
      return;
    }
    nextTurn();
  }

  function finishMatch(winnerId:string, finalScores:any){
    setFinished(true);
    const dur = Date.now() - startedAt;
    const m = {
      kind: "dicegame",
      sport: "dicegame",
      mode: "farkle",
      createdAt: startedAt,
      finishedAt: Date.now(),
      durationMs: dur,
      winnerId,
      players: [
        { id: A.id, name: A.name, avatarDataUrl: A.avatarDataUrl, score: finalScores[A.id]||0, setsWon: winnerId===A.id?1:0 },
        { id: B.id, name: B.name, avatarDataUrl: B.avatarDataUrl, score: finalScores[B.id]||0, setsWon: winnerId===B.id?1:0 },
      ],
      payload: {
        config: { ...config, mode:"farkle", targetScore: target, diceCount },
        log,
        players: [
          { id: A.id, name: A.name, avatarDataUrl: A.avatarDataUrl, score: finalScores[A.id]||0, setsWon: winnerId===A.id?1:0 },
          { id: B.id, name: B.name, avatarDataUrl: B.avatarDataUrl, score: finalScores[B.id]||0, setsWon: winnerId===B.id?1:0 },
        ],
      },
      summary: { targetScore: target, winnerId, scores: finalScores },
    };
    try { onFinish?.(m); } catch {}
    try { go("dice_stats_history"); } catch { go("dice_menu"); }
  }

  return (
    <div style={{ minHeight:"100vh", padding:16, paddingBottom:110, background: theme.bg, color: theme.text }}>
      <BackDot onClick={() => go("dice_menu")} />
      <InfoDot title="Farkle" desc={`6 dés • cible ${target}\nRoll = score auto (v1)\nBank = valider le tour`} />

      <div style={{ maxWidth: 980, margin:"44px auto 0", display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {/* header */}
        <div style={{ gridColumn:"1 / -1", border:`1px solid ${theme.borderSoft}`, borderRadius:18, background: theme.card, padding:14, position:"relative", overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
              <ProfileAvatar size={44} profile={cur} />
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:1000, letterSpacing:0.5 }}>{cur.name} <span style={{ opacity:0.6, fontWeight:800 }}>— tour</span></div>
                <div style={{ opacity:0.75, fontSize:12 }}>Tour: <b>{turnPts}</b></div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, opacity:0.7 }}>{A.name}</div>
                <div style={{ fontSize:22, fontWeight:1000 }}>{scores[A.id]||0}</div>
              </div>
              <div style={{ width:1, height:38, background:"rgba(255,255,255,0.12)" }} />
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, opacity:0.7 }}>{B.name}</div>
                <div style={{ fontSize:22, fontWeight:1000 }}>{scores[B.id]||0}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop:12, display:"flex", gap:10, flexWrap:"wrap" }}>
            <button onClick={doRoll} disabled={finished} style={{
              height:48, padding:"0 16px", borderRadius:14, border:"none",
              background: finished ? "rgba(255,255,255,0.12)" : (theme.accent ?? "#b6ff00"),
              color:"#000", fontWeight:1000, cursor: finished ? "not-allowed":"pointer"
            }}>Lancer</button>

            <button onClick={doBank} disabled={finished || turnPts<=0} style={{
              height:48, padding:"0 16px", borderRadius:14, border:"none",
              background: (!finished && turnPts>0) ? (theme.accent2 ?? theme.accent ?? "#b6ff00") : "rgba(255,255,255,0.12)",
              color:"#000", fontWeight:1000, cursor: (!finished && turnPts>0) ? "pointer":"not-allowed"
            }}>Bank</button>

            <button onClick={() => finishMatch((scores[A.id]||0)>=(scores[B.id]||0)?A.id:B.id, scores)} disabled={finished} style={{
              height:48, padding:"0 16px", borderRadius:14, border:`1px solid ${theme.borderSoft}`, background:"rgba(0,0,0,0.15)",
              color:"#fff", fontWeight:900, cursor: finished?"not-allowed":"pointer"
            }}>Terminer</button>
          </div>
        </div>

        {/* roll */}
        <div style={{ border:`1px solid ${theme.borderSoft}`, borderRadius:18, background: theme.card, padding:14 }}>
          <div style={{ fontWeight:1000, marginBottom:10 }}>Dernier lancer</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:10 }}>
            {(lastRoll || Array.from({length:6},()=>null)).map((v:any,i:number)=>(
              <div key={i} style={{
                height:54, borderRadius:14, border:`1px solid ${theme.borderSoft}`, background:"rgba(0,0,0,0.2)",
                display:"flex", alignItems:"center", justifyContent:"center", fontWeight:1000, fontSize:18, opacity: v?1:0.25
              }}>{v ?? "—"}</div>
            ))}
          </div>
          <div style={{ marginTop:10, fontSize:12, opacity:0.75 }}>
            Score du lancer: {lastRoll ? scoreFarkle(lastRoll).score : "—"}
          </div>
        </div>

        {/* log */}
        <div style={{ border:`1px solid ${theme.borderSoft}`, borderRadius:18, background: theme.card, padding:14 }}>
          <div style={{ fontWeight:1000, marginBottom:10 }}>Journal</div>
          <div style={{ maxHeight: 260, overflow:"auto", paddingRight:6 }}>
            {log.length===0 && <div style={{ opacity:0.6, fontSize:13 }}>Aucune action.</div>}
            {log.map((r:any, idx:number)=>(
              <div key={idx} style={{ fontSize:13, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{r.msg}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
