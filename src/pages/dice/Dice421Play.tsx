// @ts-nocheck
// =============================================================
// src/pages/dice/Dice421Play.tsx
// 421 — Play (v1 simple)
// - 2 joueurs pass&play
// - 3 dés, jusqu'à 2 relances
// - Score par combo (421 > triples > suite > somme)
// - On cumule des points, premier à targetPoints gagne
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";

type Props = { go:(t:any,p?:any)=>void; params?:any; onFinish?:(m:any)=>void };

const clamp=(v:any,a:number,b:number,def:number)=>{ const n=Number(v); return Number.isFinite(n)?Math.max(a,Math.min(b,n)):def; };
const roll=(n:number)=>Array.from({length:n},()=>1+Math.floor(Math.random()*6));

function score421(d:number[]){
  const s=[...d].sort((a,b)=>b-a); // desc
  const key=s.join("");
  // Exact 4-2-1 (in any order)
  if (s.includes(4) && s.includes(2) && s.includes(1)) return { label:"421", pts:10 };
  // Triples
  if (s[0]===s[1] && s[1]===s[2]) return { label:`Triple ${s[0]}`, pts: 7 + s[0] }; // 8..13
  // Suite 6-5-4 / 5-4-3 / 4-3-2 / 3-2-1
  const asc=[...d].sort((a,b)=>a-b).join("");
  if (["123","234","345","456"].includes(asc)) return { label:`Suite ${asc}`, pts:6 };
  // Paire
  if (s[0]===s[1] || s[1]===s[2] || s[0]===s[2]) return { label:"Paire", pts:4 };
  // Somme
  const sum=d.reduce((a,b)=>a+b,0);
  return { label:`Somme ${sum}`, pts: Math.max(1, Math.floor(sum/2)) };
}

export default function Dice421Play({ go, params, onFinish }: Props){
  const { theme } = useTheme() as any;
  const config = params?.config || { mode:"421", targetPoints: 50, diceCount: 3, rerolls: 2 };
  const players = Array.isArray(params?.players) ? params.players : [];
  const A = players?.[0] || { id:"A", name:"A" };
  const B = players?.[1] || { id:"B", name:"B" };

  const target = clamp(config?.targetPoints, 10, 200, 50);
  const maxRerolls = clamp(config?.rerolls, 0, 5, 2);

  const [turnId, setTurnId] = React.useState(A.id);
  const [scores, setScores] = React.useState({ [A.id]:0, [B.id]:0 });
  const [dice, setDice] = React.useState<number[]>([1,1,1]);
  const [kept, setKept] = React.useState<boolean[]>([false,false,false]);
  const [rollsLeft, setRollsLeft] = React.useState(maxRerolls+1);
  const [rolledOnce, setRolledOnce] = React.useState(false);
  const [log, setLog] = React.useState<any[]>([]);
  const [startedAt] = React.useState(Date.now());
  const [finished, setFinished] = React.useState(false);

  const cur = turnId===A.id?A:B;
  const oth = turnId===A.id?B:A;

  function pushLog(msg:string){ setLog(l=>[{t:Date.now(),msg},...l].slice(0,40)); }

  function doRoll(){
    if (finished) return;
    if (rollsLeft<=0) return;
    const next = dice.map((v,i)=> kept[i]?v:(1+Math.floor(Math.random()*6)));
    setDice(next);
    setRolledOnce(true);
    setRollsLeft(x=>Math.max(0,x-1));
  }

  function toggleKeep(i:number){
    if (!rolledOnce || finished) return;
    setKept(k=>{ const n=[...k]; n[i]=!n[i]; return n; });
  }

  function endTurn(){
    if (finished) return;
    if (!rolledOnce) return;
    const s = score421(dice);
    const nextScores = { ...scores, [cur.id]:(scores[cur.id]||0)+s.pts };
    setScores(nextScores);
    pushLog(`${cur.name} : ${s.label} → +${s.pts} (total=${nextScores[cur.id]})`);
    if (nextScores[cur.id] >= target){
      finishMatch(cur.id, nextScores);
      return;
    }
    // next player
    setTurnId(oth.id);
    setDice([1,1,1]);
    setKept([false,false,false]);
    setRollsLeft(maxRerolls+1);
    setRolledOnce(false);
  }

  function finishMatch(winnerId:string, finalScores:any){
    setFinished(true);
    const dur = Date.now()-startedAt;
    const m = {
      kind:"dicegame",
      sport:"dicegame",
      mode:"421",
      createdAt: startedAt,
      finishedAt: Date.now(),
      durationMs: dur,
      winnerId,
      players: [
        { id:A.id, name:A.name, avatarDataUrl:A.avatarDataUrl, score: finalScores[A.id]||0, setsWon: winnerId===A.id?1:0 },
        { id:B.id, name:B.name, avatarDataUrl:B.avatarDataUrl, score: finalScores[B.id]||0, setsWon: winnerId===B.id?1:0 },
      ],
      payload: {
        config: { ...config, mode:"421", targetPoints: target, rerolls:maxRerolls },
        log,
        players: [
          { id:A.id, name:A.name, avatarDataUrl:A.avatarDataUrl, score: finalScores[A.id]||0, setsWon: winnerId===A.id?1:0 },
          { id:B.id, name:B.name, avatarDataUrl:B.avatarDataUrl, score: finalScores[B.id]||0, setsWon: winnerId===B.id?1:0 },
        ],
      },
      summary: { targetPoints: target, winnerId, scores: finalScores },
    };
    try{ onFinish?.(m); }catch{}
    try{ go("dice_stats_history"); }catch{ go("dice_menu"); }
  }

  const preview = rolledOnce ? score421(dice) : null;

  return (
    <div style={{ minHeight:"100vh", padding:16, paddingBottom:110, background: theme.bg, color: theme.text }}>
      <BackDot onClick={() => go("dice_menu")} />
      <InfoDot title="421" desc={`3 dés • ${maxRerolls} relances • cible ${target} pts`} />

      <div style={{ maxWidth: 980, margin:"44px auto 0", display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div style={{ gridColumn:"1 / -1", border:`1px solid ${theme.borderSoft}`, borderRadius:18, background: theme.card, padding:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <ProfileAvatar size={44} profile={cur} />
              <div>
                <div style={{ fontWeight:1000 }}>{cur.name} <span style={{ opacity:0.6 }}>— tour</span></div>
                <div style={{ fontSize:12, opacity:0.75 }}>Relances restantes: <b>{Math.max(0,rollsLeft-1)}</b></div>
              </div>
            </div>
            <div style={{ display:"flex", gap:18, fontWeight:1000 }}>
              <div>{A.name}: {scores[A.id]||0}</div>
              <div>{B.name}: {scores[B.id]||0}</div>
            </div>
          </div>

          <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {dice.map((v,i)=>(
              <button key={i} onClick={()=>toggleKeep(i)} style={{
                height:58, borderRadius:14, border:`1px solid ${kept[i]?(theme.accent??"#b6ff00"):(theme.borderSoft)}`,
                background: kept[i]?"rgba(182,255,0,0.14)":"rgba(0,0,0,0.2)",
                color:"#fff", fontWeight:1000, fontSize:20,
                cursor: (rolledOnce && !finished)?"pointer":"not-allowed"
              }} title={kept[i]?"Gardé":"Cliquer pour garder"}>{v}</button>
            ))}
          </div>

          <div style={{ marginTop:12, display:"flex", gap:10, flexWrap:"wrap" }}>
            <button onClick={doRoll} disabled={finished||rollsLeft<=0} style={{
              height:48, padding:"0 16px", borderRadius:14, border:"none",
              background: (!finished && rollsLeft>0) ? (theme.accent??"#b6ff00") : "rgba(255,255,255,0.12)",
              color:"#000", fontWeight:1000, cursor: (!finished && rollsLeft>0)?"pointer":"not-allowed"
            }}>Lancer</button>

            <button onClick={endTurn} disabled={finished||!rolledOnce} style={{
              height:48, padding:"0 16px", borderRadius:14, border:"none",
              background: (!finished && rolledOnce) ? (theme.accent2 ?? theme.accent ?? "#b6ff00") : "rgba(255,255,255,0.12)",
              color:"#000", fontWeight:1000, cursor: (!finished && rolledOnce)?"pointer":"not-allowed"
            }}>Valider le tour</button>

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
          <div style={{ maxHeight: 260, overflow:"auto", paddingRight:6 }}>
            {log.length===0 && <div style={{ opacity:0.6, fontSize:13 }}>Aucune action.</div>}
            {log.map((r:any, idx:number)=>(
              <div key={idx} style={{ fontSize:13, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>{r.msg}</div>
            ))}
          </div>
        </div>

        <div style={{ border:`1px solid ${theme.borderSoft}`, borderRadius:18, background: theme.card, padding:14 }}>
          <div style={{ fontWeight:1000, marginBottom:10 }}>Règles (v1)</div>
          <div style={{ fontSize:13, opacity:0.8, lineHeight:1.35 }}>
            421 = <b>10 pts</b> • Triples = 8..13 pts • Suites = 6 pts • Paire = 4 pts • Sinon somme/2.<br/>
            (On ajustera ensuite aux règles 421 officielles si tu veux.)
          </div>
        </div>
      </div>
    </div>
  );
}
