// @ts-nocheck
// =============================================================
// src/pages/dice/DicePokerPlay.tsx
// Poker Dice — Play (v1 standard dice)
// - 2 joueurs pass&play
// - 5 dés, jusqu'à 2 relances
// - Score par "main" (pair/two-pair/brelan/full/carré/quinte/yams)
// - On joue N manches (default 10), total cumulé
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import ConfigTickerHeader from "../../components/ConfigTickerHeader";
import { getTicker } from "../../lib/tickers";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";

type Props = { go:(t:any,p?:any)=>void; params?:any; onFinish?:(m:any)=>void };

const clamp=(v:any,a:number,b:number,def:number)=>{ const n=Number(v); return Number.isFinite(n)?Math.max(a,Math.min(b,n)):def; };

function roll5(prev:number[], keep:boolean[]){
  return prev.map((v,i)=> keep[i]?v:(1+Math.floor(Math.random()*6)));
}

function handScore(d:number[]){
  const c = [0,0,0,0,0,0,0];
  for (const x of d) c[x] = (c[x]||0)+1;
  const counts = [1,2,3,4,5,6].map(v=>c[v]).sort((a,b)=>b-a);
  const asc = [...d].sort((a,b)=>a-b).join("");
  const sum = d.reduce((a,b)=>a+b,0);

  const isStraight = ["12345","23456"].includes(asc);
  const max = counts[0];

  if (max===5) return { label:"Yam's", pts: 50 };
  if (isStraight) return { label:"Quinte", pts: 40 };
  if (max===4) return { label:"Carré", pts: 35 };
  if (counts[0]===3 && counts[1]===2) return { label:"Full", pts: 30 };
  if (max===3) return { label:"Brelan", pts: 20 };
  if (counts[0]===2 && counts[1]===2) return { label:"Double paire", pts: 15 };
  if (max===2) return { label:"Paire", pts: 10 };
  return { label:"Rien", pts: Math.max(0, Math.floor(sum/2)) };
}

export default function DicePokerPlay({ go, params, onFinish }: Props){
  const { theme } = useTheme() as any;

  const headerSrc = getTicker("dice_poker") || getTicker("dice_games") || "";

  const config = params?.config || { mode:"poker", rounds: 10, rerolls: 2 };
  const players = Array.isArray(params?.players) ? params.players : [];
  const A = players?.[0] || { id:"A", name:"A" };
  const B = players?.[1] || { id:"B", name:"B" };

  const rounds = clamp(config?.rounds, 1, 30, 10);
  const maxRerolls = clamp(config?.rerolls, 0, 5, 2);

  const [round, setRound] = React.useState(1);
  const [turnId, setTurnId] = React.useState(A.id);
  const [dice, setDice] = React.useState<number[]>([1,1,1,1,1]);
  const [keep, setKeep] = React.useState<boolean[]>([false,false,false,false,false]);
  const [rollsLeft, setRollsLeft] = React.useState(maxRerolls+1);
  const [rolledOnce, setRolledOnce] = React.useState(false);
  const [scores, setScores] = React.useState({ [A.id]:0, [B.id]:0 });
  const [log, setLog] = React.useState<any[]>([]);
  const [startedAt] = React.useState(Date.now());
  const [finished, setFinished] = React.useState(false);

  const cur = turnId===A.id?A:B;
  const oth = turnId===A.id?B:A;

  function pushLog(msg:string){ setLog(l=>[{t:Date.now(),msg},...l].slice(0,60)); }

  function doRoll(){
    if (finished) return;
    if (rollsLeft<=0) return;
    const next = roll5(dice, keep);
    setDice(next);
    setRolledOnce(true);
    setRollsLeft(x=>Math.max(0,x-1));
  }

  function toggleKeep(i:number){
    if (!rolledOnce || finished) return;
    setKeep(k=>{ const n=[...k]; n[i]=!n[i]; return n; });
  }

  function validate(){
    if (finished) return;
    if (!rolledOnce) return;
    const h = handScore(dice);
    const nextScores = { ...scores, [cur.id]:(scores[cur.id]||0)+h.pts };
    setScores(nextScores);
    pushLog(`R${round} • ${cur.name} : ${h.label} → +${h.pts} (total=${nextScores[cur.id]})`);

    // switch player or next round
    if (turnId===A.id){
      // next player same round
      setTurnId(B.id);
    } else {
      // end of round
      if (round >= rounds){
        const winnerId = (nextScores[A.id]||0) === (nextScores[B.id]||0) ? null : ((nextScores[A.id]||0)>(nextScores[B.id]||0) ? A.id : B.id);
        finishMatch(winnerId, nextScores);
        return;
      }
      setTurnId(A.id);
      setRound(r=>r+1);
    }

    // reset hand state
    setDice([1,1,1,1,1]);
    setKeep([false,false,false,false,false]);
    setRollsLeft(maxRerolls+1);
    setRolledOnce(false);
  }

  function finishMatch(winnerId:any, finalScores:any){
    setFinished(true);
    const dur = Date.now()-startedAt;
    const m = {
      kind:"dicegame",
      sport:"dicegame",
      mode:"poker",
      createdAt: startedAt,
      finishedAt: Date.now(),
      durationMs: dur,
      winnerId,
      players: [
        { id:A.id, name:A.name, avatarDataUrl:A.avatarDataUrl, score: finalScores[A.id]||0, setsWon: winnerId===A.id?1:0 },
        { id:B.id, name:B.name, avatarDataUrl:B.avatarDataUrl, score: finalScores[B.id]||0, setsWon: winnerId===B.id?1:0 },
      ],
      payload: {
        config: { ...config, mode:"poker", rounds, rerolls:maxRerolls },
        log,
        players: [
          { id:A.id, name:A.name, avatarDataUrl:A.avatarDataUrl, score: finalScores[A.id]||0, setsWon: winnerId===A.id?1:0 },
          { id:B.id, name:B.name, avatarDataUrl:B.avatarDataUrl, score: finalScores[B.id]||0, setsWon: winnerId===B.id?1:0 },
        ],
      },
      summary: { rounds, winnerId, scores: finalScores },
    };
    try{ onFinish?.(m); }catch{}
    try{ go("dice_stats_history"); }catch{ go("dice_menu"); }
  }

  const preview = rolledOnce ? handScore(dice) : null;

  return (
    <div style={{ minHeight:"100vh", padding:16, paddingBottom:110, background: theme.bg, color: theme.text }}>
      <BackDot onClick={() => go("dice_menu")} />
      <InfoDot title="Poker Dice" desc={`5 dés • ${maxRerolls} relances • ${rounds} manches`} />

      <div style={{ maxWidth: 980, margin:"44px auto 0", display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div style={{ gridColumn:"1 / -1", border:`1px solid ${theme.borderSoft}`, borderRadius:18, background: theme.card, padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <ProfileAvatar size={44} profile={cur} />
              <div>
                <div style={{ fontWeight:1000 }}>{cur.name} <span style={{ opacity:0.6 }}>— manche {round}/{rounds}</span></div>
                <div style={{ fontSize:12, opacity:0.75 }}>Relances restantes: <b>{Math.max(0,rollsLeft-1)}</b></div>
              </div>
            </div>
            <div style={{ display:"flex", gap:18, fontWeight:1000 }}>
              <div>{A.name}: {scores[A.id]||0}</div>
              <div>{B.name}: {scores[B.id]||0}</div>
            </div>
          </div>

          <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
            {dice.map((v,i)=>(
              <button key={i} onClick={()=>toggleKeep(i)} style={{
                height:58, borderRadius:14, border:`1px solid ${keep[i]?(theme.accent??"#b6ff00"):(theme.borderSoft)}`,
                background: keep[i]?"rgba(182,255,0,0.14)":"rgba(0,0,0,0.2)",
                color:"#fff", fontWeight:1000, fontSize:20,
                cursor: (rolledOnce && !finished)?"pointer":"not-allowed"
              }}>{v}</button>
            ))}
          </div>

          <div style={{ marginTop:12, display:"flex", gap:10, flexWrap:"wrap" }}>
            <button onClick={doRoll} disabled={finished||rollsLeft<=0} style={{
              height:48, padding:"0 16px", borderRadius:14, border:"none",
              background: (!finished && rollsLeft>0) ? (theme.accent??"#b6ff00") : "rgba(255,255,255,0.12)",
              color:"#000", fontWeight:1000, cursor: (!finished && rollsLeft>0)?"pointer":"not-allowed"
            }}>Lancer</button>

            <button onClick={validate} disabled={finished||!rolledOnce} style={{
              height:48, padding:"0 16px", borderRadius:14, border:"none",
              background: (!finished && rolledOnce) ? (theme.accent2 ?? theme.accent ?? "#b6ff00") : "rgba(255,255,255,0.12)",
              color:"#000", fontWeight:1000, cursor: (!finished && rolledOnce)?"pointer":"not-allowed"
            }}>Valider</button>

            <button onClick={()=>finishMatch((scores[A.id]||0)>=(scores[B.id]||0)?A.id:B.id, scores)} disabled={finished} style={{
              height:48, padding:"0 16px", borderRadius:14, border:`1px solid ${theme.borderSoft}`, background:"rgba(0,0,0,0.15)",
              color:"#fff", fontWeight:900
            }}>Terminer</button>

            <div style={{ marginLeft:"auto", fontSize:12, opacity:0.75, alignSelf:"center" }}>
              {preview ? `${preview.label} → +${preview.pts}` : "Lance au moins une fois"}
            </div>
          </div>
        </div>

        <div style={{ border:`1px solid ${theme.borderSoft}`, borderRadius:18, background: theme.card, padding:14 }}>
          <div style={{ fontWeight:1000, marginBottom:10 }}>Journal</div>
          <div style={{ maxHeight: 300, overflow:"auto", paddingRight:6 }}>
            {log.length===0 && <div style={{ opacity:0.6, fontSize:13 }}>Aucune action.</div>}
            {log.map((r:any, idx:number)=>(
              <div key={idx} style={{ fontSize:13, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{r.msg}</div>
            ))}
          </div>
        </div>

        <div style={{ border:`1px solid ${theme.borderSoft}`, borderRadius:18, background: theme.card, padding:14 }}>
          <div style={{ fontWeight:1000, marginBottom:10 }}>Barème (v1)</div>
          <div style={{ fontSize:13, opacity:0.8, lineHeight:1.35 }}>
            Yam's 50 • Quinte 40 • Carré 35 • Full 30 • Brelan 20 • Double paire 15 • Paire 10 • Sinon somme/2.
          </div>
        </div>
      </div>
    </div>
  );
}
