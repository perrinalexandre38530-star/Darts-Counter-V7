// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import { loadCameraCalibration, type CameraCalibration } from "../lib/cameraCalibrationStore";
import {
  analyzeFrameDifference,
  analyzeFrameStability,
  buildDartVisualSignature,
  classifyDartIdentity,
  compareDartSignatures,
  estimateDistanceUncertaintyMm,
  mergeDartSignatures,
  rankImpacts,
} from "../lib/closestCenterVisionEngine";
import { getTicker } from "../lib/tickers";

const ACCENT = "#44e7ff";
const W = 640;
const H = 480;
const PLAYER_COLORS = ["#ff4d5f", "#3da5ff", "#ffd43b", "#b96cff", "#39d98a", "#ff914d", "#55e6c1", "#f472b6"];

function playerColor(players:any[], playerId:any) {
  const ix = Math.max(0, players.findIndex((p:any) => String(p.id) === String(playerId)));
  return PLAYER_COLORS[ix % PLAYER_COLORS.length];
}

function phaseLabel(phase:string) {
  if (phase === "enroll") return "ENRÔLEMENT";
  if (phase === "baseline") return "CIBLE VIDE";
  if (phase === "play") return "VOLÉE";
  if (phase === "review") return "CONTRÔLE IA";
  if (phase === "roundEnd") return "CLASSEMENT";
  if (phase === "finished") return "TERMINÉ";
  return String(phase || "").toUpperCase();
}

function capture(video: HTMLVideoElement | null, crop?: { x:number; y:number; w:number; h:number }) {
  if (!video?.videoWidth) return null;
  const c = document.createElement("canvas");
  c.width = crop ? 320 : W;
  c.height = crop ? 320 : H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  if (crop) {
    ctx.drawImage(video, crop.x * video.videoWidth, crop.y * video.videoHeight, crop.w * video.videoWidth, crop.h * video.videoHeight, 0, 0, c.width, c.height);
  } else {
    ctx.drawImage(video, 0, 0, c.width, c.height);
  }
  return ctx.getImageData(0, 0, c.width, c.height);
}

function extractImpactPatch(after: ImageData, d: any) {
  const c = document.createElement("canvas");
  c.width = 160; c.height = 160;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const src = document.createElement("canvas");
  src.width = after.width; src.height = after.height;
  const sctx = src.getContext("2d");
  if (!sctx) return null;
  sctx.putImageData(after, 0, 0);
  const sx = Math.max(0, Math.min(after.width - 160, d.xNorm * after.width - 80));
  const sy = Math.max(0, Math.min(after.height - 160, d.yNorm * after.height - 80));
  ctx.drawImage(src, sx, sy, Math.min(160, after.width - sx), Math.min(160, after.height - sy), 0, 0, 160, 160);
  return buildDartVisualSignature(ctx.getImageData(0, 0, 160, 160));
}

export default function ClosestCenterPlay(props:any) {
  const go = props.go ?? props.setTab;
  const cfg = props.params?.config || {};
  const players = cfg.players || [];
  const ticker = getTicker("closest_center") || getTicker("darts_games") || "";

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [camError, setCamError] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const [cal] = React.useState<CameraCalibration | null>(() => loadCameraCalibration());
  const [phase, setPhase] = React.useState<"enroll"|"baseline"|"play"|"review"|"roundEnd"|"finished">("enroll");
  const [enrollIndex, setEnrollIndex] = React.useState(0);
  const [samples, setSamples] = React.useState<Record<string,any[]>>({});
  const [signatures, setSignatures] = React.useState<Record<string,any>>({});
  const [round, setRound] = React.useState(1);
  const [playerIndex, setPlayerIndex] = React.useState(0);
  const [before, setBefore] = React.useState<ImageData | null>(null);
  const [pendingAfter, setPendingAfter] = React.useState<ImageData | null>(null);
  const [pendingImpacts, setPendingImpacts] = React.useState<any[]>([]);
  const [stability, setStability] = React.useState<any>(null);
  const [impacts, setImpacts] = React.useState<any[]>([]);
  const [allScores, setAllScores] = React.useState<Record<string,number>>({});
  const [tieAcknowledged, setTieAcknowledged] = React.useState(false);
  const [status, setStatus] = React.useState("Présente les 3 fléchettes du joueur dans le cadre de scan.");

  React.useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        if (dead) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e:any) {
        setCamError(e?.message || "Caméra indisponible");
      }
    })();
    return () => { dead = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const current = players[phase === "enroll" ? enrollIndex : playerIndex];

  const scanSample = () => {
    const img = capture(videoRef.current, { x:.25, y:.2, w:.5, h:.6 });
    if (!img || !current) return;
    const sig = buildDartVisualSignature(img);
    const arr = [...(samples[current.id] || []), sig].slice(0, 3);
    setSamples(v => ({ ...v, [current.id]: arr }));
    setStatus(`Scan ${arr.length}/3 enregistré pour ${current.name}.`);
  };

  const validatePlayerEnrollment = () => {
    if (!current) return;
    const arr = samples[current.id] || [];
    if (arr.length < 2) { setStatus("Il faut au moins 2 scans, idéalement 3."); return; }
    const merged = mergeDartSignatures(arr);
    const conflicts = Object.entries(signatures)
      .map(([id,s]) => ({ id, score: compareDartSignatures(merged, s) }))
      .sort((a,b) => b.score - a.score);
    if (conflicts[0]?.score > .91) {
      const other = players.find((p:any) => String(p.id) === String(conflicts[0].id));
      setStatus(`⚠️ Fléchettes trop similaires à ${other?.name || "un autre joueur"} (${Math.round(conflicts[0].score * 100)} %). Différencie les ailettes/shafts puis rescane.`);
      return;
    }
    const next = { ...signatures, [current.id]: merged };
    setSignatures(next);
    if (enrollIndex < players.length - 1) {
      setEnrollIndex(i => i + 1);
      setStatus("Présente maintenant les 3 fléchettes du joueur suivant.");
    } else {
      setPhase("baseline");
      setStatus(cal ? "Retire toutes les fléchettes. Cadre la cible entière et capture la cible vide." : "Calibration caméra absente : effectue d’abord la calibration caméra depuis le module caméra, puis reviens ici.");
    }
  };

  const captureBaseline = () => {
    if (!cal) { setStatus("❌ Calibration caméra nécessaire pour mesurer les distances avec précision."); return; }
    const img = capture(videoRef.current);
    if (!img) return;
    setBefore(img);
    setPendingAfter(null);
    setPendingImpacts([]);
    setTieAcknowledged(false);
    setPhase("play");
    setPlayerIndex(0);
    setStatus(`${players[0]?.name}: lance 3 fléchettes, sans les retirer, puis lance l’analyse.`);
  };

  const analyze = () => {
    if (!cal || !before || !current) return;
    const after = capture(videoRef.current);
    if (!after) return;

    const stable = analyzeFrameStability(before, after, cal);
    setStability(stable);
    if (!stable.stable) {
      setStatus(`⚠️ Caméra déplacée ou cadrage instable (${Math.round(stable.changedFraction * 100)} % de l’image modifiée). Replace le téléphone exactement puis relance l’analyse.`);
      return;
    }

    const found = analyzeFrameDifference(before, after, cal, 3);
    if (!found.length) {
      setStatus("Aucun nouvel impact fiable détecté. Garde le téléphone immobile et recommence l’analyse.");
      return;
    }
    if (found.length < 3) {
      setStatus(`Seulement ${found.length}/3 impact(s) détecté(s). Stabilise le téléphone et relance l’analyse : aucune mesure n’a été validée.`);
      return;
    }

    const proposed = found.map((d:any, i:number) => {
      const observed = extractImpactPatch(after, d);
      const identity = classifyDartIdentity(signatures, observed, current.id);
      const detectedOwner = players.find((p:any) => String(p.id) === String(identity.playerId));
      const owner = detectedOwner || current;
      const measurementConfidence = Math.max(.2, Math.min(1, d.confidence * (.75 + stable.confidence * .25)));
      const uncertaintyMm = estimateDistanceUncertaintyMm(measurementConfidence, cal);
      const needsReview = identity.confidence < .62 || identity.margin < .055 || measurementConfidence < .64;
      return {
        id: `r${round}-${current.id}-${Date.now()}-${i}`,
        playerId: owner.id,
        teamId: owner.teamId || null,
        expectedPlayerId: current.id,
        xNorm: d.xNorm,
        yNorm: d.yNorm,
        distanceNorm: d.distanceNorm,
        distanceMm: d.distanceMm,
        confidence: measurementConfidence,
        identityConfidence: identity.confidence,
        identityMargin: identity.margin,
        uncertaintyMm,
        needsReview,
        round,
      };
    });

    setPendingAfter(after);
    setPendingImpacts(proposed);
    setPhase("review");
    const alerts = proposed.filter((x:any) => x.needsReview).length;
    setStatus(alerts ? `${alerts} fléchette(s) demandent un contrôle avant validation.` : "Analyse cohérente. Vérifie les 3 impacts puis valide la volée.");
  };

  const cyclePendingOwner = (impactId:string) => {
    setPendingImpacts(prev => prev.map((impact:any) => {
      if (impact.id !== impactId) return impact;
      const ix = Math.max(0, players.findIndex((p:any) => String(p.id) === String(impact.playerId)));
      const owner = players[(ix + 1) % players.length];
      return { ...impact, playerId: owner.id, teamId: owner.teamId || null, identityConfidence: 1, identityMargin: 1, needsReview: false, manuallyConfirmedOwner: true };
    }));
  };

  const reanalyze = () => {
    setPendingAfter(null);
    setPendingImpacts([]);
    setPhase("play");
    setStatus(`${current?.name}: garde les 3 fléchettes en place, stabilise le téléphone puis relance l’analyse.`);
  };

  const confirmAnalysis = () => {
    if (!pendingAfter || pendingImpacts.length !== 3) return;
    setImpacts(v => [...v, ...pendingImpacts]);
    setBefore(pendingAfter);
    setPendingAfter(null);
    setPendingImpacts([]);
    if (playerIndex < players.length - 1) {
      const nextPlayer = players[playerIndex + 1];
      setPlayerIndex(i => i + 1);
      setPhase("play");
      setStatus(`${nextPlayer?.name}: lance maintenant 3 fléchettes sans retirer les précédentes.`);
    } else {
      setPhase("roundEnd");
      setStatus("Manche analysée. Vérifie le classement avant de retirer les fléchettes.");
    }
  };

  const ranked = React.useMemo(() => rankImpacts(impacts.filter((x:any) => x.round === round), cfg.pointsMode || "descending"), [impacts, round, cfg.pointsMode]);
  const hasPrecisionTieRisk = ranked.some((r:any) => r.ambiguousWithPrevious);
  const roundValidatedImpacts = React.useMemo(() => impacts.filter((x:any) => x.round === round), [impacts, round]);
  const projectedScores = React.useMemo(() => {
    const out = { ...allScores };
    if (phase === "roundEnd") ranked.forEach((r:any) => out[r.playerId] = (out[r.playerId] || 0) + Number(r.points || 0));
    return out;
  }, [allScores, ranked, phase]);
  const projectedTeamTotals = React.useMemo(() => {
    const out:any = {};
    players.forEach((p:any) => { if (p.teamId) out[p.teamId] = (out[p.teamId] || 0) + (projectedScores[p.id] || 0); });
    return out;
  }, [players, projectedScores]);

  const commitRound = () => {
    if (hasPrecisionTieRisk && !tieAcknowledged) {
      setTieAcknowledged(true);
      setStatus("⚠️ Départage inférieur à la marge de précision. Contrôle visuellement les impacts puis confirme une seconde fois pour enregistrer la manche.");
      return;
    }
    const next = { ...allScores };
    ranked.forEach((r:any) => next[r.playerId] = (next[r.playerId] || 0) + r.points);
    setAllScores(next);
    if (round >= Number(cfg.rounds || 3)) {
      setPhase("finished");
      setStatus("Partie terminée.");
      return;
    }
    setRound(r => r + 1);
    setPhase("baseline");
    setPlayerIndex(0);
    setBefore(null);
    setPendingAfter(null);
    setPendingImpacts([]);
    setTieAcknowledged(false);
    setStatus("Retire toutes les fléchettes puis capture la cible vide pour la manche suivante.");
  };

  const teamTotals = React.useMemo(() => {
    const out:any = {};
    players.forEach((p:any) => { if (p.teamId) out[p.teamId] = (out[p.teamId] || 0) + (allScores[p.id] || 0); });
    return out;
  }, [players, allScores]);

  const narrow = typeof window !== "undefined" && window.innerWidth < 850;
  const finishSaved = React.useRef(false);
  React.useEffect(() => {
    if (phase !== "finished" || finishSaved.current) return;
    finishSaved.current = true;
    try {
      props.onFinish?.({ id:`closest-center-${Date.now()}`, mode:"closest_center", status:"finished", createdAt:Date.now(), players, rounds:cfg.rounds || round, scores:allScores, teamTotals, impacts });
    } catch {}
  }, [phase, allScores, teamTotals, impacts]);

  if (!players.length) return <div style={{padding:20,color:"white"}}>Configuration introuvable. <button onClick={() => go?.("closest_center_config")}>Retour</button></div>;

  return <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#03070d",color:"#fff"}}>
    <PageHeader tickerSrc={ticker} tickerAlt="PETANQUE" tickerHeight={68} left={<BackDot onClick={() => go?.("closest_center_config")} color={ACCENT}/>} />
    <div style={{flex:1,minHeight:0,overflow:narrow?"auto":"hidden",display:"grid",gridTemplateColumns:narrow?"1fr":"minmax(0,1.45fr) minmax(320px,.75fr)",gridTemplateRows:narrow?"minmax(390px,56vh) auto":"1fr",gap:10,padding:10}}>
      <div style={{position:"relative",minHeight:narrow?390:0,borderRadius:18,overflow:"hidden",border:"1px solid rgba(68,231,255,.3)",background:"#000"}}>
        <video ref={videoRef} muted playsInline style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
          {phase === "enroll" ? <div style={{position:"absolute",left:"25%",top:"20%",width:"50%",height:"60%",border:`2px dashed ${ACCENT}`,borderRadius:18,boxShadow:`0 0 30px ${ACCENT}33`}}/> : null}
          <div style={{position:"absolute",left:"50%",top:"50%",width:14,height:14,margin:-7,borderRadius:"50%",border:"2px solid #fff",boxShadow:"0 0 15px #fff"}}/>
          {roundValidatedImpacts.map((impact:any) => {
            const p = players.find((x:any) => String(x.id) === String(impact.playerId));
            const color = playerColor(players, impact.playerId);
            const liveRank = ranked.find((r:any) => r.id === impact.id)?.rank;
            return <div key={`accepted-${impact.id}`} style={{position:"absolute",left:`${impact.xNorm*100}%`,top:`${impact.yNorm*100}%`,transform:"translate(-50%,-50%)",width:20,height:20,borderRadius:"50%",border:`2px solid ${color}`,background:`${color}24`,boxShadow:`0 0 14px ${color}`}}><span style={{position:"absolute",left:14,top:13,whiteSpace:"nowrap",padding:"4px 6px",borderRadius:7,background:"rgba(2,8,14,.9)",border:`1px solid ${color}99`,fontSize:9,fontWeight:1000,color:"#fff"}}>{liveRank ? `#${liveRank} · ` : ""}{p?.name} · {impact.distanceMm.toFixed(1)} mm</span></div>;
          })}
          {(phase === "review" ? pendingImpacts : []).map((impact:any, i:number) => {
            const p = players.find((x:any) => String(x.id) === String(impact.playerId));
            return <div key={impact.id} style={{position:"absolute",left:`${impact.xNorm*100}%`,top:`${impact.yNorm*100}%`,transform:"translate(-50%,-50%)",width:24,height:24,borderRadius:"50%",border:`2px solid ${impact.needsReview?"#ffbd45":ACCENT}`,boxShadow:`0 0 16px ${impact.needsReview?"#ffbd45":ACCENT}`}}><span style={{position:"absolute",left:18,top:-8,whiteSpace:"nowrap",padding:"5px 7px",borderRadius:8,background:"rgba(2,8,14,.92)",border:`1px solid ${impact.needsReview?"#ffbd45":ACCENT}`,fontSize:10,fontWeight:1000}}>{i+1} · {p?.name} · {impact.distanceMm.toFixed(1)} mm</span></div>;
          })}
        </div>
        {!ready ? <div style={overlay}>{camError || "Initialisation caméra…"}</div> : null}
      </div>

      <div style={{minHeight:0,overflow:"auto",display:"grid",gap:10,alignContent:"start"}}>
        <section style={{...card,padding:10}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {[
              ["enroll","1","ENRÔLER"],
              ["baseline","2","RÉFÉRENCE"],
              ["play","3","JOUER"],
              ["roundEnd","4","CLASSER"],
            ].map(([key,num,label]) => {
              const order:any = {enroll:0,baseline:1,play:2,review:2,roundEnd:3,finished:4};
              const mine:any = {enroll:0,baseline:1,play:2,roundEnd:3};
              const active = order[phase] >= mine[key];
              return <div key={key} style={{minWidth:0,padding:"7px 5px",borderRadius:10,border:`1px solid ${active?ACCENT:"rgba(255,255,255,.08)"}`,background:active?`${ACCENT}10`:"rgba(255,255,255,.02)",textAlign:"center"}}><b style={{display:"block",fontSize:11,color:active?ACCENT:"#607080"}}>{num}</b><span style={{fontSize:8,fontWeight:1000,color:active?"#eafcff":"#71808d",letterSpacing:.5}}>{label}</span></div>;
            })}
          </div>
        </section>

        {current && phase !== "roundEnd" && phase !== "finished" ? <section style={{...card,borderColor:`${playerColor(players,current.id)}66`,background:`linear-gradient(135deg,${playerColor(players,current.id)}12,rgba(255,255,255,.025))`}}>
          <div style={{display:"grid",gridTemplateColumns:"48px 1fr auto",gap:10,alignItems:"center"}}>
            <div style={{width:48,height:48,borderRadius:"50%",overflow:"hidden",border:`2px solid ${playerColor(players,current.id)}`,display:"grid",placeItems:"center",background:"#0b151d",fontWeight:1000,fontSize:18}}>{current.avatar?<img src={current.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:String(current.name||"?").slice(0,1).toUpperCase()}</div>
            <div><div style={{fontSize:9,color:"#8496a5",fontWeight:1000,letterSpacing:1}}>JOUEUR ACTIF</div><b style={{fontSize:17}}>{current.name}</b>{current.teamId?<div style={{fontSize:10,color:playerColor(players,current.id)}}>Équipe {current.teamId}</div>:null}</div>
            <div style={{display:"flex",gap:5}}>{[0,1,2].map((n) => { const done = phase!=="enroll" && roundValidatedImpacts.filter((x:any)=>String(x.expectedPlayerId)===String(current.id)).length>n; return <span key={n} style={{width:15,height:15,borderRadius:"50%",border:`1px solid ${done?playerColor(players,current.id):"#53616c"}`,background:done?playerColor(players,current.id):"transparent",boxShadow:done?`0 0 10px ${playerColor(players,current.id)}`:"none"}}/>; })}</div>
          </div>
        </section> : null}

        <section style={card}>
          <div style={{fontSize:11,color:ACCENT,fontWeight:1000,letterSpacing:1.1}}>IA VISION · {phaseLabel(phase)}</div>
          <div style={{fontSize:14,fontWeight:900,marginTop:6}}>{status}</div>
          {stability ? <div style={{marginTop:8,fontSize:11,color:stability.stable?"#8fffc2":"#ffbd93"}}>Stabilité caméra : {Math.round(stability.confidence*100)} % · variation globale {Math.round(stability.changedFraction*100)} %</div> : null}
          {!cal ? <div style={{marginTop:8,color:"#ffb4a9",fontSize:12}}>Calibration de cible non trouvée : le jeu refuse une mesure approximative.</div> : null}
        </section>

        {phase === "enroll" ? <section style={card}>
          <h3 style={h3}>ENRÔLEMENT · {current?.name}</h3>
          <div style={{fontSize:12,color:"#b9c7d4",lineHeight:1.5}}>Présente les 3 fléchettes ensemble dans le cadre. Fais 3 scans légèrement différents. Les sets trop similaires sont signalés.</div>
          <div style={{display:"flex",gap:8,marginTop:10}}><button style={btn} onClick={scanSample}>📷 SCANNER ({samples[current?.id]?.length || 0}/3)</button><button style={btn} onClick={validatePlayerEnrollment}>VALIDER →</button></div>
        </section> : null}

        {phase === "baseline" ? <section style={card}>
          <h3 style={h3}>CIBLE VIDE</h3>
          <div style={{fontSize:12,color:"#b9c7d4"}}>Téléphone fixe, cible entière visible, aucune fléchette plantée.</div>
          <button style={{...btn,width:"100%",marginTop:10}} onClick={captureBaseline}>📷 CAPTURER LA RÉFÉRENCE</button>
        </section> : null}

        {phase === "play" ? <section style={card}>
          <h3 style={h3}>MANCHE {round}/{cfg.rounds} · {current?.name}</h3>
          <div style={{fontSize:12,color:"#b9c7d4"}}>Lance 3 fléchettes puis ne touche ni à la cible ni au téléphone. L’IA comparera chacune aux signatures de tous les joueurs.</div>
          <button style={{...btn,width:"100%",marginTop:10}} onClick={analyze}>🧠 ANALYSER LES 3 FLÉCHETTES</button>
        </section> : null}

        {phase === "review" ? <section style={card}>
          <h3 style={h3}>CONTRÔLE IA · {current?.name}</h3>
          <div style={{fontSize:11,color:"#aab9c6",lineHeight:1.5,marginBottom:8}}>Aucun point n’est encore enregistré. Vérifie les propriétaires et la précision avant de valider.</div>
          {pendingImpacts.map((impact:any, i:number) => {
            const p = players.find((x:any) => String(x.id) === String(impact.playerId));
            return <div key={impact.id} style={{padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{display:"grid",gridTemplateColumns:"28px 1fr auto",gap:8,alignItems:"center"}}><b>#{i+1}</b><div><b>{p?.name || "Joueur ?"}</b><div style={{fontSize:10,color:impact.needsReview?"#ffbd65":"#9fb0bf"}}>identité {Math.round(impact.identityConfidence*100)} % · mesure {Math.round(impact.confidence*100)} %</div></div><b style={{color:ACCENT}}>{impact.distanceMm.toFixed(1)} ± {impact.uncertaintyMm.toFixed(1)} mm</b></div>
              {impact.needsReview ? <button onClick={() => cyclePendingOwner(impact.id)} style={{...miniBtn,marginTop:6}}>⚠️ CORRIGER LE JOUEUR →</button> : null}
            </div>;
          })}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}><button style={btn} onClick={reanalyze}>↻ RÉANALYSER</button><button style={{...btn,background:`${ACCENT}2b`}} onClick={confirmAnalysis}>✓ VALIDER L’ANALYSE</button></div>
        </section> : null}

        {(phase === "roundEnd" || phase === "finished") ? <section style={card}>
          <h3 style={h3}>{phase === "finished" ? "CLASSEMENT FINAL" : "CLASSEMENT DE LA MANCHE"}</h3>
          {phase === "roundEnd" && hasPrecisionTieRisk ? <div style={{padding:9,borderRadius:10,border:"1px solid #ffbd4555",background:"#ffbd4510",color:"#ffd796",fontSize:11,marginBottom:6}}>⚠️ Au moins deux impacts sont plus proches que la marge d’incertitude estimée. Un contrôle caméra rapproché est conseillé avant validation.</div> : null}
          {(phase === "finished" ? players.map((p:any) => ({playerId:p.id,points:allScores[p.id]||0,distanceMm:null})).sort((a:any,b:any)=>b.points-a.points) : ranked).map((r:any,i:number) => {
            const p = players.find((x:any) => String(x.id) === String(r.playerId));
            return <div key={`${r.playerId}-${i}-${r.id||"final"}`} style={{display:"grid",gridTemplateColumns:"32px 1fr auto",gap:8,alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}><b>#{i+1}</b><div><b>{p?.name}</b>{p?.teamId ? <span style={{color:ACCENT,fontSize:11}}> · Team {p.teamId}</span> : null}{r.distanceMm != null ? <div style={{fontSize:11,color:r.ambiguousWithPrevious?"#ffbd65":"#9fb0bf"}}>{r.distanceMm.toFixed(1)} ± {Number(r.uncertaintyMm||0).toFixed(1)} mm · vision {Math.round(r.confidence*100)} % · identité {Math.round(r.identityConfidence*100)} %{r.ambiguousWithPrevious?" · départage serré":""}</div> : null}</div><b style={{color:ACCENT}}>+{r.points||0}</b></div>;
          })}
          {phase === "roundEnd" ? <button style={{...btn,width:"100%",marginTop:10,borderColor:hasPrecisionTieRisk&&!tieAcknowledged?"#ffbd45":ACCENT,background:hasPrecisionTieRisk&&tieAcknowledged?"#ffbd4522":`${ACCENT}18`}} onClick={commitRound}>{hasPrecisionTieRisk&&!tieAcknowledged?"⚠️ CONTRÔLER LE DÉPARTAGE":hasPrecisionTieRisk&&tieAcknowledged?"✓ CONFIRMER ET ENREGISTRER":"VALIDER LA MANCHE →"}</button> : <button style={{...btn,width:"100%",marginTop:10}} onClick={() => go?.("closest_center_config")}>NOUVELLE PARTIE</button>}
        </section> : null}

        <section style={card}>
          <h3 style={h3}>{phase === "roundEnd" ? "SCORES PROJETÉS" : "SCORES"}</h3>
          {[...players].sort((a:any,b:any)=>(projectedScores[b.id]||0)-(projectedScores[a.id]||0)).map((p:any,ix:number) => <div key={p.id} style={{display:"grid",gridTemplateColumns:"24px 1fr auto",gap:7,alignItems:"center",padding:"6px 0",fontSize:12,borderBottom:"1px solid rgba(255,255,255,.05)"}}><b style={{color:ix<3?"#ffd85a":"#71808d"}}>#{ix+1}</b><span><i style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:playerColor(players,p.id),marginRight:7}}/>{p.name}{p.teamId?` · ${p.teamId}`:""}</span><b>{projectedScores[p.id]||0} pts</b></div>)}
          {cfg.teamMode ? <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.1)",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div style={{padding:8,borderRadius:10,background:"rgba(255,77,95,.08)",border:"1px solid rgba(255,77,95,.25)"}}><small style={{display:"block",color:"#9aa9b5"}}>ÉQUIPE A</small><b>{projectedTeamTotals.A||0} pts</b></div><div style={{padding:8,borderRadius:10,background:"rgba(61,165,255,.08)",border:"1px solid rgba(61,165,255,.25)"}}><small style={{display:"block",color:"#9aa9b5"}}>ÉQUIPE B</small><b>{projectedTeamTotals.B||0} pts</b></div></div> : null}
        </section>
      </div>
    </div>
  </div>;
}

const card:React.CSSProperties = { border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.035)", borderRadius:16, padding:12 };
const h3:React.CSSProperties = { margin:"0 0 8px", fontSize:13, color:ACCENT, letterSpacing:.8 };
const btn:React.CSSProperties = { minHeight:42, padding:"8px 12px", borderRadius:13, border:`1px solid ${ACCENT}`, background:`${ACCENT}18`, color:"#fff", fontWeight:1000 };
const miniBtn:React.CSSProperties = { minHeight:30, padding:"5px 8px", borderRadius:9, border:"1px solid #ffbd4566", background:"#ffbd4510", color:"#ffd58c", fontWeight:900, fontSize:10 };
const overlay:React.CSSProperties = { position:"absolute", inset:0, display:"grid", placeItems:"center", background:"rgba(0,0,0,.75)", fontWeight:900, padding:20, textAlign:"center" };
