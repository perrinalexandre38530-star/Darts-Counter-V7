import NativeStartOrderConfig from '../components/NativeStartOrderConfig';
import React from "react";
import PageHeader from "../components/PageHeader";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { useLang } from "../contexts/LangContext";
import tickerTop10Fr from "../assets/tickers/ticker_top_10.webp";
import tickerTop10En from "../assets/tickers/ticker_top_10_en.webp";
import { top10MorpionLabel } from "../lib/top10MorpionLabels";

const RULES = "TOP 10 : dix volées de trois fléchettes par joueur. Toutes les zones de la cible comptent (simple, double, triple, Bull 25 et Bull 50). Additionnez les dix scores. Le plus gros total remporte la partie. En solo, essayez de battre votre record. Ce format est également utilisable comme exercice d'entraînement ou défi.";
export default function Top10Config(props: any) {
  const { lang } = useLang();
  const tr = (value: string) => top10MorpionLabel(lang, value);
  const training = !!props?.params?.training;
  const isQuick = props?.params?.launchMode === "quick";
  const [quickNames, setQuickNames] = React.useState(() => Array.from({length: 4}, (_,i)=>`J${i+1}`));
  const [players, setPlayers] = React.useState(training ? 1 : 2);
  const profiles = (props?.store?.profiles || []).filter((p: any) => !p?.isBot && p?.id);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => props?.store?.activeProfileId ? [String(props.store.activeProfileId)] : []);
  const toggle = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, players));
  const [bots, setBots] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState("normal");
  const [turnOrder, setTurnOrder] = React.useState("fixed");
  const back = () => props?.setTab?.(training ? "training" : "games");
  const launch = () => {
    const selected = selectedIds.map((id) => profiles.find((p: any) => String(p.id) === id)).filter(Boolean);
    const other = profiles.filter((p: any) => !selected.some((x: any) => x.id === p.id));
    const humans = [...selected, ...(!bots ? other : [])].slice(0, players).map((p: any) => ({ id: p.id, name: p.name || p.nickname || tr("Joueur"), avatarDataUrl: p.avatarDataUrl || p.avatarUrl || null, isBot: false }));
    const remainder = Array.from({ length: Math.max(0, players - humans.length) }, (_, i) => ({ id: bots ? `top10-bot-${i}` : `top10-local-${i}`, name: bots ? `Bot ${i+1}` : `${tr("Joueur")} ${humans.length+i+1}`, isBot: bots, botLevel }));
    const session = `quick-${Date.now().toString(36)}`;
    const quickPlayers = quickNames.slice(0,players).map((name,i) => {const id=`${session}-p${i+1}`;return {id,profileId:null,temporaryPlayerId:id,isTemporary:true,name:String(name||"").trim()||`J${i+1}`,isBot:false};});
    const config = { players: isQuick ? quickPlayers : [...humans, ...remainder], botsEnabled: !isQuick && players > 1 && bots, botLevel, rounds: 10, training, turnOrder, quickParty:isQuick, partyMode:isQuick?"quick":"arcade", temporaryParticipants:isQuick, profileStatsDeferred:isQuick };
    props?.setTab?.("top_10_play", { config });
  };
  const pill = (value: any, active: boolean, onClick: () => void) => <button type="button" onClick={onClick} style={{ padding: "10px 13px", borderRadius: 20, color: "#fff", fontWeight: 800, background: active ? "#195b8d" : "#20253c", border: active ? "1px solid #63dafa" : "1px solid #ffffff28" }}>{value}</button>;
  if (isQuick) return <div className="page"><PageHeader tickerSrc={lang === "fr" ? tickerTop10Fr : tickerTop10En} left={<BackDot onClick={back} />} />
    <main style={{maxWidth:650,margin:"0 auto",padding:"18px 14px 110px",color:"white",display:"grid",gap:15}}>
      <h2 style={{fontSize:19,color:"#f3c76a"}}>PARTIE RAPIDE · TOP 10</h2>
      <section style={{background:"#10172bd9",border:"1px solid #ffffff25",borderRadius:18,padding:15,display:"grid",gap:12}}>
        <strong>JOUEURS</strong><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[1,2,3,4].map(n=>pill(n===1?"SOLO":n===2?"DUEL":`${n} JOUEURS`,players===n,()=>setPlayers(n)))}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10}}>{quickNames.slice(0,players).map((name,i)=><label key={i} style={{fontSize:12,display:"grid",gap:6}}>JOUEUR {i+1}<input aria-label={`Nom du joueur ${i+1}`} maxLength={32} value={name} onChange={e=>setQuickNames(prev=>prev.map((v,j)=>i===j?e.target.value:v))} style={{padding:12,borderRadius:12,background:"#161c2b",color:"white",border:"1px solid #555"}}/></label>)}</div>
      </section>
      <button type="button" onClick={launch} className="btn-primary" style={{minHeight:55,fontSize:18,fontWeight:1000}}>JOUER</button>
    </main>
  </div>;
  return <div className="page"><PageHeader title="TOP 10" tickerSrc={lang === "fr" ? tickerTop10Fr : tickerTop10En} left={<BackDot onClick={back} />} right={<InfoDot title={tr("Règles TOP 10")} content={tr(RULES)} />} />
    <div style={{ maxWidth: 650, margin: "0 auto", padding: "16px 14px 110px" }}>
      <section style={{ background: "#10172bd9", border: "1px solid #ffffff25", borderRadius: 18, padding: 17 }}>
        <h2 style={{ fontSize: 18, fontWeight: 1000, marginTop: 0 }}>{tr("10 VOLÉES · 30 FLÉCHETTES")}</h2>
        <p style={{ opacity: .82 }}>{tr("Objectif : faire le plus gros score cumulé possible. Mesure la régularité, la meilleure volée et la moyenne à trois fléchettes.")}</p>
        <div style={{ marginTop: 18, fontWeight: 900 }}>{tr("Participants")}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}>{[1,2,3,4].map((n) => <React.Fragment key={n}>{pill(`${n} ${tr(n>1 ? "joueurs" : "joueur")}`, players===n, () => {setPlayers(n); if(n===1) setBots(false);})}</React.Fragment>)}</div>
        {profiles.length > 0 && <div style={{ marginTop: 12 }}><div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>{tr("Profils locaux")}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{profiles.map((p: any) => <button key={p.id} type="button" onClick={() => toggle(String(p.id))} aria-pressed={selectedIds.includes(String(p.id))} style={{ borderRadius: 18, padding: "8px 10px", border: selectedIds.includes(String(p.id)) ? "1px solid #63dafa" : "1px solid #ffffff25", color: "white", background: selectedIds.includes(String(p.id)) ? "#195b8d" : "#20253c" }}>{selectedIds.includes(String(p.id)) ? "✓ " : ""}{p.name || p.nickname || tr("Profil")}</button>)}</div></div>}
        {players > 1 && <><div style={{ marginTop: 18, fontWeight: 900 }}>{tr("Bots IA")}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}>{pill(tr("Non"), !bots, () => setBots(false))}{pill(tr("Oui"), bots, () => setBots(true))}{bots && ["easy", "normal", "hard"].map((v) => <React.Fragment key={v}>{pill(tr(({easy:"Facile", normal:"Normal", hard:"Difficile"} as any)[v]), botLevel===v, () => setBotLevel(v))}</React.Fragment>)}</div></>}
        <div style={{ marginTop: 18, fontWeight: 900 }}>{tr("Ordre de jeu")}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7 }}>{pill(tr("Défini"), turnOrder==="fixed", () => setTurnOrder("fixed"))}{pill(tr("Aléatoire"), turnOrder==="random", () => setTurnOrder("random"))}</div>
        <button type="button" className="btn-primary" style={{ width: "100%", marginTop: 23, padding: 14, fontWeight: 1000 }} onClick={launch}>{tr("DÉMARRER TOP 10")}</button>
      </section>
    </div>
  
      <NativeStartOrderConfig />
      </div>;
}
