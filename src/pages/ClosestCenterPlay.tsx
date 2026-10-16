// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import { loadCameraCalibration, type CameraCalibration } from "../lib/cameraCalibrationStore";
import {
  analyzeFrameDifference,
  analyzeFrameStability,
  assessPrecisionReadiness,
  assessProjectiveDrift,
  fuseDetectionFrames,
  fuseIndependentConsensusPasses,
  localMetricMmPerPixel,
  buildDartVisualSignature,
  classifyDartIdentity,
  compareDartSignatures,
  estimateDistanceUncertaintyMm,
  mergeDartSignatures,
  rankImpacts,
  precisionTier,
  registerFrameToReference,
  temporalMedianFrame,
} from "../lib/closestCenterVisionEngine";
import { getTicker } from "../lib/tickers";
import { loadCameraScoringPreferences } from "../lib/cameraScoringPreferences";
import { appendClosestCenterDiagnostic, loadClosestCenterDiagnostics, summarizeClosestCenterDiagnostics } from "../lib/closestCenterDiagnostics";

const ACCENT = "#44e7ff";
const PLAYER_COLORS = ["#ff4d5f", "#3da5ff", "#ffd43b", "#b96cff", "#39d98a", "#ff914d", "#55e6c1", "#f472b6"];

function playerColor(players:any[], playerId:any) {
  const ix = Math.max(0, players.findIndex((p:any) => String(p.id) === String(playerId)));
  return PLAYER_COLORS[ix % PLAYER_COLORS.length];
}

function tierMeets(actual:string, required:"high"|"competition") {
  const rank:any={insufficient:0,standard:1,high:2,competition:3};
  return (rank[actual]||0) >= (rank[required]||2);
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

function capture(video: HTMLVideoElement | null, crop?: { x:number; y:number; w:number; h:number }, maxCaptureSide = 1920) {
  if (!video?.videoWidth || !video.videoHeight) return null;
  const c = document.createElement("canvas");
  const srcW = video.videoWidth, srcH = video.videoHeight;
  if (crop) {
    c.width = 480; c.height = 480;
  } else {
    // Preserve the native camera aspect ratio. Never stretch 16:9 into 4:3: that
    // would move calibrated points and directly corrupt millimetre measurements.
    const maxSide = Math.max(1280, Number(maxCaptureSide || 1920));
    const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
    c.width = Math.max(640, Math.round(srcW * scale));
    c.height = Math.max(360, Math.round(srcH * scale));
  }
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (crop) {
    ctx.drawImage(video, crop.x * srcW, crop.y * srcH, crop.w * srcW, crop.h * srcH, 0, 0, c.width, c.height);
  } else {
    ctx.drawImage(video, 0, 0, srcW, srcH, 0, 0, c.width, c.height);
  }
  return ctx.getImageData(0, 0, c.width, c.height);
}

async function captureBurst(video: HTMLVideoElement | null, count = 5, delayMs = 55, maxCaptureSide = 1920) {
  const frames: ImageData[] = [];
  for (let i = 0; i < count; i++) {
    const frame = capture(video, undefined, maxCaptureSide);
    if (frame) frames.push(frame);
    if (i < count - 1) await new Promise(resolve => window.setTimeout(resolve, delayMs));
  }
  return frames;
}

async function tunePrecisionTrack(stream:MediaStream|null){
  try{
    const track=stream?.getVideoTracks?.()[0]; if(!track) return;
    const caps:any=track.getCapabilities?.()||{};
    const advanced:any={};
    if(Array.isArray(caps.focusMode)&&caps.focusMode.includes("continuous")) advanced.focusMode="continuous";
    if(Array.isArray(caps.exposureMode)&&caps.exposureMode.includes("continuous")) advanced.exposureMode="continuous";
    if(Array.isArray(caps.whiteBalanceMode)&&caps.whiteBalanceMode.includes("continuous")) advanced.whiteBalanceMode="continuous";
    if(caps.zoom && Number.isFinite(caps.zoom.min) && Number.isFinite(caps.zoom.max)){
      const target=Math.min(caps.zoom.max,Math.max(caps.zoom.min,1.15));
      if(target>1) advanced.zoom=target;
    }
    if(Object.keys(advanced).length) await track.applyConstraints({advanced:[advanced]} as any).catch(()=>{});
  }catch{}
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
  const [cameraPrefs] = React.useState(() => loadCameraScoringPreferences());
  const sessionIdRef = React.useRef(`petanque-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
  const [diagnostics, setDiagnostics] = React.useState<any[]>(() => loadClosestCenterDiagnostics().slice(-24));

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const autoRereadRunningRef = React.useRef(false);
  const preflightRunningRef = React.useRef(false);
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
  const [pendingConsensus, setPendingConsensus] = React.useState<any[]>([]);
  const [precisionRereads, setPrecisionRereads] = React.useState(0);
  const [stability, setStability] = React.useState<any>(null);
  const [precisionReadiness, setPrecisionReadiness] = React.useState<any>(null);
  const [registrationInfo, setRegistrationInfo] = React.useState<any>(null);
  const [impacts, setImpacts] = React.useState<any[]>([]);
  const [allScores, setAllScores] = React.useState<Record<string,number>>({});
  const [tieAcknowledged, setTieAcknowledged] = React.useState(false);
  const [turnArmed, setTurnArmed] = React.useState(false);
  const [preflightInfo, setPreflightInfo] = React.useState<any>(null);
  const [status, setStatus] = React.useState("Présente les 3 fléchettes du joueur dans le cadre de scan.");

  React.useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: Math.max(1920, cameraPrefs.maxCaptureSide) }, height: { ideal: Math.round(Math.max(1920, cameraPrefs.maxCaptureSide) * 9 / 16) }, frameRate: { ideal: 30, min: 24 } }, audio: false });
        if (dead) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        await tunePrecisionTrack(s);
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
  }, [cameraPrefs.maxCaptureSide]);

  const current = players[phase === "enroll" ? enrollIndex : playerIndex];
  const diagnosticSummary = React.useMemo(() => summarizeClosestCenterDiagnostics(diagnostics.filter((x:any) => x.sessionId === sessionIdRef.current)), [diagnostics]);

  const traceCamera = React.useCallback((stage:any, level:any, code:string, message:string, metrics:any = {}) => {
    const entry = appendClosestCenterDiagnostic({
      sessionId: sessionIdRef.current,
      round,
      playerId: current?.id ?? null,
      playerName: current?.name ?? null,
      stage, level, code, message, metrics,
    });
    setDiagnostics(prev => [...prev, entry].slice(-24));
    return entry;
  }, [round, current?.id, current?.name]);

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

  const captureBaseline = async () => {
    if (!cal) { setStatus("❌ Calibration caméra nécessaire pour mesurer les distances avec précision."); return; }
    if (cal.v !== 2 || !Array.isArray((cal as any).homography)) {
      setStatus("❌ PETANQUE précision + exige la calibration projective 5 points. Ouvre la calibration caméra et calibre Centre + D20 + D6 + D3 + D11.");
      return;
    }
    setStatus("Calibration précision : acquisition multi-frame de la cible vide…");
    const baselineBurst = await captureBurst(videoRef.current, cameraPrefs.baselineFrames, cameraPrefs.frameDelayMs, cameraPrefs.maxCaptureSide);
    const img = temporalMedianFrame(baselineBurst);
    if (!img) return;
    const readiness = assessPrecisionReadiness(img, cal);
    setPrecisionReadiness(readiness);
    const tier = precisionTier(readiness);
    if (!readiness.ok) {
      traceCamera("baseline", "reject", "readiness", "Précision de référence insuffisante", {confidence:readiness.confidence,mmPerPixel:readiness.mmPerPixel,sharpness:readiness.sharpness});
      setStatus(`❌ Précision insuffisante : ${readiness.reasons[0] || "repositionne la caméra"}`);
      return;
    }
    if (!tierMeets(tier, cameraPrefs.requiredTier)) {
      traceCamera("baseline", "reject", "tier", "Niveau de précision inférieur au profil", {tier,profile:cameraPrefs.profile,mmPerPixel:readiness.mmPerPixel});
      setStatus(`⚠️ Niveau ${tier.toUpperCase()} insuffisant pour le profil ${cameraPrefs.profile.toUpperCase()} (${readiness.mmPerPixel.toFixed(2)} mm/pixel). Rapproche la caméra ou améliore la netteté.`);
      return;
    }
    setBefore(img);
    setPendingAfter(null);
    setPendingImpacts([]);
    setPendingConsensus([]);
    setPrecisionRereads(0);
    setTieAcknowledged(false);
    setTurnArmed(false);
    setPreflightInfo(null);
    setPhase("play");
    setPlayerIndex(0);
    traceCamera("baseline", "ok", "baseline-ready", "Référence de manche validée", {tier,confidence:readiness.confidence,mmPerPixel:readiness.mmPerPixel,sharpness:readiness.sharpness});
    setStatus(`Précision ${tier.toUpperCase()} validée · ${readiness.mmPerPixel.toFixed(2)} mm/pixel. Avant de lancer, effectue le CONTRÔLE AVANT VOLÉE.`);
  };

  const runPreflightCheck = async () => {
    if (!cal || !before || !current || preflightRunningRef.current) return;
    preflightRunningRef.current = true;
    setTurnArmed(false);
    setStatus("🛡️ Contrôle avant volée : stabilité, perspective et netteté…");
    try {
      const count = Math.max(3, Math.min(5, cameraPrefs.baselineFrames));
      const rawBurst = await captureBurst(videoRef.current, count, cameraPrefs.frameDelayMs, cameraPrefs.maxCaptureSide);
      if (rawBurst.length < 3) { setStatus("❌ Contrôle avant volée incomplet : caméra non exploitable."); return; }
      const geometryChecks = rawBurst.map(frame => assessProjectiveDrift(before, frame, cal));
      const worstGeometry = geometryChecks.reduce((w:any,x:any)=>x.regionalSpreadPx>w.regionalSpreadPx?x:w, geometryChecks[0]);
      if (cameraPrefs.strictProjectiveDrift && !geometryChecks.every((x:any)=>x.ok)) {
        setPreflightInfo({ok:false,reason:"drift",geometrySpreadPx:worstGeometry.regionalSpreadPx,confidence:worstGeometry.confidence});
        traceCamera("preflight", "reject", "projective-drift", "Dérive projective avant volée", {spreadPx:worstGeometry.regionalSpreadPx,confidence:worstGeometry.confidence});
        setStatus(`❌ Contrôle avant volée refusé : dérive projective ${worstGeometry.regionalSpreadPx.toFixed(2)} px. Replace le support avant de lancer.`);
        return;
      }
      const registered = rawBurst.map(frame => registerFrameToReference(before, frame, cal));
      const good = registered.filter(x => x.registration.confidence >= .55 && Math.hypot(x.registration.dxPx,x.registration.dyPx) <= 8);
      if (good.length < 3) {
        setPreflightInfo({ok:false,reason:"registration",confidence:good.length/Math.max(1,registered.length)});
        traceCamera("preflight", "reject", "registration", "Recalage pré-volée insuffisant", {goodFrames:good.length,totalFrames:registered.length});
        setStatus("❌ Contrôle avant volée refusé : support/cadrage trop instable. Immobilise la caméra puis recommence.");
        return;
      }
      const frames = good.map(x=>x.frame);
      const refreshed = temporalMedianFrame(frames);
      if (!refreshed) { setStatus("❌ Impossible de rafraîchir la référence caméra."); return; }
      const readiness = assessPrecisionReadiness(refreshed, cal);
      const tier = precisionTier(readiness);
      const stabilitySamples = frames.map(frame => analyzeFrameStability(before, frame, cal));
      const worstStability = stabilitySamples.reduce((best:any,item:any)=>item.confidence<best.confidence?item:best, stabilitySamples[0]);
      setPrecisionReadiness(readiness);
      setStability(worstStability);
      const maxShift = Math.max(...good.map(x=>Math.hypot(x.registration.dxPx,x.registration.dyPx)));
      const avgRegistration = good.reduce((sum,x)=>sum+x.registration.confidence,0)/good.length;
      setRegistrationInfo({confidence:avgRegistration,maxShiftPx:maxShift,geometrySpreadPx:Math.max(...geometryChecks.map((x:any)=>x.regionalSpreadPx))});
      if (!readiness.ok || !tierMeets(tier, cameraPrefs.requiredTier) || !stabilitySamples.every((x:any)=>x.stable)) {
        setPreflightInfo({ok:false,reason:"quality",tier,confidence:readiness.confidence});
        traceCamera("preflight", "reject", "quality", "Qualité/stabilité pré-volée insuffisante", {tier,profile:cameraPrefs.profile,readiness:readiness.confidence,stability:worstStability.confidence,maxShiftPx:maxShift});
        setStatus(`❌ Contrôle avant volée refusé : qualité ${tier.toUpperCase()} / stabilité insuffisante pour ${cameraPrefs.profile.toUpperCase()}.`);
        return;
      }
      setBefore(refreshed);
      setPreflightInfo({ok:true,tier,confidence:Math.min(readiness.confidence,avgRegistration,worstStability.confidence),checkedAt:Date.now()});
      setTurnArmed(true);
      traceCamera("preflight", "ok", "armed", "Volée armée avec référence fraîche", {tier,readiness:readiness.confidence,stability:worstStability.confidence,registration:avgRegistration,maxShiftPx:maxShift});
      setStatus(`✅ Volée armée · ${tier.toUpperCase()} · référence fraîche capturée. ${current.name}: lance maintenant tes 3 fléchettes, puis ANALYSER.`);
    } finally {
      preflightRunningRef.current = false;
    }
  };

  const analyze = async () => {
    if (!cal || !before || !current) return;
    if (!turnArmed) { setStatus("🛡️ Lance d’abord CONTRÔLE AVANT VOLÉE, puis seulement les 3 fléchettes."); return; }
    setStatus("IA précision : lecture multi-frame en cours…");
    const rawBurst = await captureBurst(videoRef.current, cameraPrefs.analysisFrames, cameraPrefs.frameDelayMs, cameraPrefs.maxCaptureSide);
    if (rawBurst.length < Math.max(4, cameraPrefs.analysisFrames - 1)) { setStatus("Impossible d’obtenir assez d’images stables. Relance l’analyse."); return; }
    const geometryChecks = rawBurst.map(frame => assessProjectiveDrift(before, frame, cal));
    const worstGeometry = geometryChecks.reduce((w:any,x:any)=>x.regionalSpreadPx>w.regionalSpreadPx?x:w, geometryChecks[0]);
    if (cameraPrefs.strictProjectiveDrift && !geometryChecks.every((x:any)=>x.ok)) {
      setRegistrationInfo({ confidence: worstGeometry.confidence, geometrySpreadPx: worstGeometry.regionalSpreadPx, rejected: geometryChecks.filter((x:any)=>!x.ok).length });
      traceCamera("analysis", "reject", "projective-drift", "Dérive projective pendant analyse", {spreadPx:worstGeometry.regionalSpreadPx,rejectedFrames:geometryChecks.filter((x:any)=>!x.ok).length});
      setStatus(`❌ Dérive géométrique détectée (${worstGeometry.regionalSpreadPx.toFixed(2)} px). Le téléphone a tourné/changé de perspective : replace le support avant de mesurer.`);
      return;
    }
    const registered = rawBurst.map(frame => registerFrameToReference(before, frame, cal));
    const goodRegistered = registered.filter(x => x.registration.confidence >= .50 && Math.hypot(x.registration.dxPx,x.registration.dyPx) <= 10);
    if (goodRegistered.length < 4) {
      setRegistrationInfo({confidence:Math.min(...registered.map(x=>x.registration.confidence)), rejected:registered.length-goodRegistered.length});
      traceCamera("analysis", "reject", "registration", "Recalage analyse insuffisant", {goodFrames:goodRegistered.length,totalFrames:registered.length});
      setStatus("⚠️ Micro-déplacement caméra trop important pour une mesure de compétition. Immobilise le support puis relance.");
      return;
    }
    const burst = goodRegistered.map(x=>x.frame);
    const after = temporalMedianFrame(burst) || burst[burst.length - 1];
    const avgRegistration = goodRegistered.reduce((s,x)=>s+x.registration.confidence,0)/goodRegistered.length;
    const maxShift = Math.max(...goodRegistered.map(x=>Math.hypot(x.registration.dxPx,x.registration.dyPx)));
    setRegistrationInfo({confidence:avgRegistration,maxShiftPx:maxShift,geometrySpreadPx:Math.max(...geometryChecks.map((x:any)=>x.regionalSpreadPx))});

    const readiness = assessPrecisionReadiness(after, cal);
    setPrecisionReadiness(readiness);
    if (!readiness.ok) {
      traceCamera("analysis", "reject", "readiness", "Qualité image insuffisante pendant analyse", {confidence:readiness.confidence,mmPerPixel:readiness.mmPerPixel,sharpness:readiness.sharpness});
      setStatus(`❌ Lecture refusée : ${readiness.reasons[0] || "qualité caméra insuffisante"}`);
      return;
    }
    const tier = precisionTier(readiness);
    if (!tierMeets(tier, cameraPrefs.requiredTier)) {
      setStatus(`❌ Lecture non validée : niveau ${tier.toUpperCase()} inférieur au profil ${cameraPrefs.profile.toUpperCase()}.`);
      return;
    }

    const stabilitySamples = burst.map(frame => analyzeFrameStability(before, frame, cal));
    const stable = stabilitySamples.reduce((best, item) => item.confidence < best.confidence ? item : best, stabilitySamples[0]);
    setStability(stable);
    if (!stabilitySamples.every(x => x.stable)) {
      traceCamera("analysis", "reject", "stability", "Instabilité détectée pendant analyse", {confidence:stable.confidence,changedFraction:stable.changedFraction});
      setStatus(`⚠️ Caméra déplacée ou cadrage instable. La volée n’est pas validée.`);
      return;
    }

    const detectionsByFrame = burst.map(frame => analyzeFrameDifference(before, frame, cal, 7));
    const found = fuseDetectionFrames(detectionsByFrame, 3);
    if (!found.length) {
      setStatus("Aucun nouvel impact fiable détecté. Garde le téléphone immobile et recommence l’analyse.");
      return;
    }
    if (found.length < 3) {
      traceCamera("analysis", "reject", "impact-count", "Nombre d’impacts détectés insuffisant", {found:found.length,expected:3});
      setStatus(`Seulement ${found.length}/3 impact(s) détecté(s). Stabilise le téléphone et relance l’analyse : aucune mesure n’a été validée.`);
      return;
    }

    const proposed = found.map((d:any, i:number) => {
      const observed = extractImpactPatch(after, d);
      const identity = classifyDartIdentity(signatures, observed, current.id);
      const detectedOwner = players.find((p:any) => String(p.id) === String(identity.playerId));
      const owner = detectedOwner || current;
      const frameAgreement = Number(d.frameAgreement ?? 1);
      const measurementConfidence = Math.max(.2, Math.min(1, d.confidence * (.58 + stable.confidence * .16 + readiness.confidence * .18 + frameAgreement * .08)));
      const resolutionFloor = Math.max(.35, Number(readiness.mmPerPixel || .8) * .85);
      const consensusPenalty = Math.max(0, Number(d.spreadMm || 0) * .7);
      const geometrySpreadPx = Math.max(...geometryChecks.map((x:any)=>x.regionalSpreadPx));
      const registrationPenalty = Math.max(0,(1-avgRegistration)*1.2) + Math.max(0, geometrySpreadPx*.12);
      const uncertaintyMm = Math.max(resolutionFloor, estimateDistanceUncertaintyMm(measurementConfidence, cal) + consensusPenalty + registrationPenalty);
      const needsReview = identity.confidence < cameraPrefs.minIdentityConfidence || identity.margin < cameraPrefs.minIdentityMargin || measurementConfidence < .74 || frameAgreement < cameraPrefs.minFrameAgreement || Number(d.spreadMm||0) > cameraPrefs.maxConsensusSpreadMm || uncertaintyMm > cameraPrefs.maxUncertaintyMm;
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
        frameAgreement,
        consensusSpreadMm: Number(d.spreadMm || 0),
        needsReview,
        round,
      };
    });

    const acceptedThisRound = impacts.filter((x:any) => x.round === round);
    const combinedForTie = [...acceptedThisRound, ...proposed];
    const tieRiskIds = new Set<string>();
    for (let a = 0; a < combinedForTie.length; a++) for (let b = a + 1; b < combinedForTie.length; b++) {
      const left:any = combinedForTie[a], right:any = combinedForTie[b];
      const gap = Math.abs(Number(left.distanceMm||0)-Number(right.distanceMm||0));
      const ua = Number(left.uncertaintyMm ?? cameraPrefs.maxUncertaintyMm);
      const ub = Number(right.uncertaintyMm ?? cameraPrefs.maxUncertaintyMm);
      const margin = Math.max(.45, (ua + ub) * .60);
      if (gap <= margin) { tieRiskIds.add(String(left.id)); tieRiskIds.add(String(right.id)); }
    }
    const proposedWithTieRisk = proposed.map((x:any)=>({...x,precisionTieRisk:tieRiskIds.has(String(x.id))}));
    setPendingAfter(after);
    setPendingConsensus(found);
    setPrecisionRereads(0);
    setPendingImpacts(proposedWithTieRisk);
    setPhase("review");
    traceCamera("analysis", proposedWithTieRisk.some((x:any)=>x.needsReview||x.precisionTieRisk) ? "warn" : "ok", "analysis-complete", "Analyse multi-frame terminée", {impacts:proposedWithTieRisk.length,review:proposedWithTieRisk.filter((x:any)=>x.needsReview).length,tieRisk:proposedWithTieRisk.filter((x:any)=>x.precisionTieRisk).length,avgUncertaintyMm:proposedWithTieRisk.reduce((s:any,x:any)=>s+Number(x.uncertaintyMm||0),0)/Math.max(1,proposedWithTieRisk.length),avgFrameAgreement:proposedWithTieRisk.reduce((s:any,x:any)=>s+Number(x.frameAgreement||0),0)/Math.max(1,proposedWithTieRisk.length)});
    const alerts = proposedWithTieRisk.filter((x:any) => x.needsReview).length;
    const tieAlerts = proposedWithTieRisk.filter((x:any) => x.precisionTieRisk).length;
    setStatus(tieAlerts ? `⚠️ ${tieAlerts} impact(s) sont dans une zone de départage serré : relecture précision renforcée requise.` : alerts ? `${alerts} fléchette(s) demandent un contrôle avant validation.` : "Analyse multi-frame cohérente. Vérifie les 3 impacts puis valide la volée.");
  };

  const precisionReread = async () => {
    if (!cal || !before || !current || pendingConsensus.length !== 3) return;
    setStatus("🔬 Relecture précision indépendante : seconde acquisition multi-frame…");
    const rawBurst = await captureBurst(videoRef.current, cameraPrefs.rereadFrames, Math.max(30, cameraPrefs.frameDelayMs - 4), cameraPrefs.maxCaptureSide);
    if (rawBurst.length < Math.max(5, cameraPrefs.rereadFrames - 2)) { setStatus("Relecture impossible : pas assez de frames exploitables."); return; }
    const geometryChecks = rawBurst.map(frame => assessProjectiveDrift(before, frame, cal));
    if (cameraPrefs.strictProjectiveDrift && !geometryChecks.every((x:any)=>x.ok)) {
      setStatus("❌ Relecture refusée : géométrie de cible différente de la première lecture."); return;
    }
    const registered = rawBurst.map(frame => registerFrameToReference(before, frame, cal)).filter(x=>x.registration.confidence>=.55);
    if (registered.length < 5) { setStatus("❌ Relecture refusée : recalage caméra insuffisant."); return; }
    const frames=registered.map(x=>x.frame);
    const detections=frames.map(frame=>analyzeFrameDifference(before,frame,cal,7));
    const second=fuseDetectionFrames(detections,3);
    if(second.length!==3){ traceCamera("reread", "reject", "impact-count", "Relecture incomplète", {found:second.length,expected:3}); setStatus(`❌ Relecture incomplète (${second.length}/3). Aucune précision supplémentaire n’est appliquée.`); return; }
    const merged=fuseIndependentConsensusPasses(pendingConsensus,second,cal,before.width,before.height,3);
    if(merged.length!==3){ setStatus("❌ Les deux lectures ne convergent pas sur les 3 mêmes pointes. Contrôle manuel requis."); return; }
    const avgAgree=merged.reduce((sum:any,x:any)=>sum+Number(x.rereadAgreement||0),0)/merged.length;
    const upgraded=pendingImpacts.map((impact:any)=>{
      const match=merged.reduce((best:any,x:any)=>{
        const mm=Math.hypot(x.xNorm-impact.xNorm,x.yNorm-impact.yNorm);
        return !best||mm<best.d?{x,d:mm}:best;
      },null)?.x;
      if(!match) return impact;
      const metric=localMetricMmPerPixel(cal,before.width,before.height,match.xNorm,match.yNorm);
      const rereadPenalty=(1-Number(match.rereadAgreement||0))*1.1;
      const anisotropyPenalty=Math.max(0,Number(metric.anisotropy||1)-1)*.25;
      const uncertaintyMm=Math.max(Number(metric.meanMmPerPixel||.3)*.72, Number(impact.uncertaintyMm||1)*.64 + Number(match.spreadMm||0)*.28 + rereadPenalty + anisotropyPenalty);
      const confidence=Math.min(1,Number(impact.confidence||0)*.62+Number(match.confidence||0)*.38);
      return {...impact,xNorm:match.xNorm,yNorm:match.yNorm,distanceNorm:match.distanceNorm,distanceMm:match.distanceMm,uncertaintyMm,confidence,rereadAgreement:match.rereadAgreement,localMmPerPixel:metric.meanMmPerPixel,metricAnisotropy:metric.anisotropy,needsReview:impact.needsReview || match.rereadAgreement<cameraPrefs.minRereadAgreement};
    });
    const acceptedThisRound = impacts.filter((x:any)=>x.round===round);
    const tiePool = [...acceptedThisRound, ...upgraded];
    const tieRiskIds = new Set<string>();
    for (let a=0;a<tiePool.length;a++) for (let b=a+1;b<tiePool.length;b++) {
      const left:any=tiePool[a], right:any=tiePool[b];
      const gap=Math.abs(Number(left.distanceMm||0)-Number(right.distanceMm||0));
      const ua=Number(left.uncertaintyMm ?? cameraPrefs.maxUncertaintyMm), ub=Number(right.uncertaintyMm ?? cameraPrefs.maxUncertaintyMm);
      if (gap <= Math.max(.35,(ua+ub)*.55)) { tieRiskIds.add(String(left.id)); tieRiskIds.add(String(right.id)); }
    }
    const upgradedWithTie = upgraded.map((x:any)=>({...x,precisionTieRisk:tieRiskIds.has(String(x.id))}));
    setPendingConsensus(merged);
    setPendingImpacts(upgradedWithTie);
    setPrecisionRereads(v=>v+1);
    const tieStillTight = upgradedWithTie.some((x:any)=>x.precisionTieRisk);
    traceCamera("reread", tieStillTight || avgAgree < .84 ? "warn" : "ok", "reread-complete", "Seconde lecture indépendante terminée", {agreement:avgAgree,tieStillTight,avgUncertaintyMm:upgradedWithTie.reduce((s:any,x:any)=>s+Number(x.uncertaintyMm||0),0)/Math.max(1,upgradedWithTie.length)});
    setStatus(tieStillTight ? `⚠️ Relecture convergente à ${Math.round(avgAgree*100)} %, mais le départage reste dans la marge instrumentale. La manche demandera une confirmation visuelle finale.` : avgAgree>=.84 ? `✅ Relecture précision convergente (${Math.round(avgAgree*100)} %). Incertitudes recalculées.` : `⚠️ Relecture partiellement convergente (${Math.round(avgAgree*100)} %). Vérification visuelle recommandée.`);
  };

  React.useEffect(() => {
    if (phase !== "review" || !cameraPrefs.autoReread || precisionRereads > 0 || pendingImpacts.length !== 3 || autoRereadRunningRef.current) return;
    const critical = pendingImpacts.some((x:any) => x.precisionTieRisk || Number(x.uncertaintyMm||99) > cameraPrefs.maxUncertaintyMm || Number(x.frameAgreement||0) < cameraPrefs.minFrameAgreement || Number(x.consensusSpreadMm||99) > cameraPrefs.maxConsensusSpreadMm);
    if (!critical) return;
    const id = window.setTimeout(() => {
      if (autoRereadRunningRef.current) return;
      autoRereadRunningRef.current = true;
      void precisionReread().finally(() => { autoRereadRunningRef.current = false; });
    }, 180);
    return () => window.clearTimeout(id);
  }, [phase, precisionRereads, pendingImpacts, cameraPrefs.autoReread, cameraPrefs.maxUncertaintyMm, cameraPrefs.minFrameAgreement, cameraPrefs.maxConsensusSpreadMm]);

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
    setPendingConsensus([]);
    setPrecisionRereads(0);
    setPhase("play");
    setStatus(`${current?.name}: garde les 3 fléchettes en place, stabilise le téléphone puis relance l’analyse. La référence pré-volée reste verrouillée.`);
  };

  const confirmAnalysis = () => {
    if (!pendingAfter || pendingImpacts.length !== 3) return;
    const identityCritical = pendingImpacts.some((x:any) => !x.manuallyConfirmedOwner && (Number(x.identityConfidence||0) < cameraPrefs.minIdentityConfidence || Number(x.identityMargin||0) < cameraPrefs.minIdentityMargin));
    if (cameraPrefs.strictDartIdentification && identityCritical) {
      traceCamera("validation", "reject", "identity", "Validation bloquée par identification stricte", {minConfidence:cameraPrefs.minIdentityConfidence,minMargin:cameraPrefs.minIdentityMargin});
      setStatus("❌ Identification stricte : au moins une fléchette n’est pas attribuée avec assez de certitude. Corrige/valide son joueur avant d’enregistrer la volée.");
      return;
    }
    const measurementCritical = pendingImpacts.some((x:any) => Number(x.uncertaintyMm||99) > cameraPrefs.maxUncertaintyMm || Number(x.frameAgreement||0) < cameraPrefs.minFrameAgreement || Number(x.consensusSpreadMm||99) > cameraPrefs.maxConsensusSpreadMm);
    const tieCritical = pendingImpacts.some((x:any) => !!x.precisionTieRisk);
    if ((measurementCritical || tieCritical) && precisionRereads < 1) {
      traceCamera("validation", "warn", tieCritical ? "tie-reread-required" : "reread-required", "Seconde lecture requise avant validation", {tieCritical,measurementCritical});
      setStatus(tieCritical ? "🔬 Départage serré : une seconde lecture indépendante est obligatoire avant validation." : "🔬 Validation bloquée : au moins une pointe exige une seconde lecture indépendante. Lance RELECTURE PRÉCISION.");
      return;
    }
    if (measurementCritical && precisionRereads >= 1) {
      setStatus(`❌ Précision encore insuffisante après relecture pour le profil ${cameraPrefs.profile.toUpperCase()}. Stabilise/repositionne puis réanalyse : la mesure n’est pas enregistrée.`);
      return;
    }
    const rereadWeak = precisionRereads > 0 && pendingImpacts.some((x:any) => x.rereadAgreement != null && Number(x.rereadAgreement) < cameraPrefs.minRereadAgreement);
    if (rereadWeak) {
      setStatus("❌ Les deux lectures ne convergent pas assez pour valider une mesure de précision. Repositionne/stabilise puis réanalyse la volée.");
      return;
    }
    traceCamera("validation", "ok", "turn-accepted", "Volée validée", {rereads:precisionRereads,avgUncertaintyMm:pendingImpacts.reduce((s:any,x:any)=>s+Number(x.uncertaintyMm||0),0)/Math.max(1,pendingImpacts.length),manualOwners:pendingImpacts.filter((x:any)=>x.manuallyConfirmedOwner).length});
    setImpacts(v => [...v, ...pendingImpacts]);
    setBefore(pendingAfter);
    setPendingAfter(null);
    setPendingImpacts([]);
    setPendingConsensus([]);
    setPrecisionRereads(0);
    if (playerIndex < players.length - 1) {
      const nextPlayer = players[playerIndex + 1];
      setPlayerIndex(i => i + 1);
      setTurnArmed(false);
      setPreflightInfo(null);
      setPhase("play");
      setStatus(`${nextPlayer?.name}: ne lance pas encore. Effectue le CONTRÔLE AVANT VOLÉE avec les fléchettes précédentes en place.`);
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
    traceCamera("round", hasPrecisionTieRisk ? "warn" : "ok", "round-accepted", "Manche enregistrée", {round,precisionTieRisk:hasPrecisionTieRisk,impacts:ranked.length});
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
    setPendingConsensus([]);
    setPrecisionRereads(0);
    setTieAcknowledged(false);
    setTurnArmed(false);
    setPreflightInfo(null);
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
          {precisionReadiness ? <div style={{marginTop:6,fontSize:11,color:precisionReadiness.ok?"#8fffc2":"#ffbd93"}}>Précision image : {Math.round(precisionReadiness.confidence*100)} % · {precisionReadiness.mmPerPixel.toFixed(2)} mm/pixel · netteté {Math.round(precisionReadiness.sharpness*100)} % · niveau {precisionTier(precisionReadiness).toUpperCase()} · profil {cameraPrefs.profile.toUpperCase()}</div> : null}
          {registrationInfo ? <div style={{marginTop:6,fontSize:11,color:(registrationInfo.confidence||0)>=.65?"#8fffc2":"#ffbd93"}}>Recalage multi-frame : {Math.round((registrationInfo.confidence||0)*100)} %{registrationInfo.maxShiftPx!=null?` · translation ${registrationInfo.maxShiftPx.toFixed(1)} px`:""}{registrationInfo.geometrySpreadPx!=null?` · dérive géométrique ${registrationInfo.geometrySpreadPx.toFixed(2)} px`:""}</div> : null}
          {phase === "play" ? <div style={{marginTop:6,fontSize:11,color:turnArmed?"#8fffc2":"#ffbd93"}}>Pré-contrôle volée : {turnArmed?`ARMÉ · ${String(preflightInfo?.tier||"").toUpperCase()} · référence verrouillée`:"REQUIS avant de lancer"}</div> : null}
          {!cal ? <div style={{marginTop:8,color:"#ffb4a9",fontSize:12}}>Calibration de cible non trouvée : le jeu refuse une mesure approximative.</div> : null}
        </section>

        <section style={{...card,padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
            <h3 style={{...h3,margin:0}}>DIAGNOSTIC CAMÉRA · SESSION</h3>
            <span style={{fontSize:10,color:diagnosticSummary.rejected?"#ff9f8f":"#8fffc2",fontWeight:900}}>{diagnosticSummary.accepted} volée(s) validée(s) · {diagnosticSummary.rejected} refus · {diagnosticSummary.rereads} relecture(s)</span>
          </div>
          {diagnostics.filter((x:any)=>x.sessionId===sessionIdRef.current).slice(-4).reverse().map((d:any)=><div key={d.id} style={{display:"grid",gridTemplateColumns:"72px 1fr",gap:8,paddingTop:6,marginTop:6,borderTop:"1px solid rgba(255,255,255,.06)",fontSize:10}}><b style={{color:d.level==="reject"?"#ff9f8f":d.level==="warn"?"#ffd58c":"#8fffc2"}}>{String(d.stage).toUpperCase()}</b><span style={{color:"#b9c7d4"}}>{d.message}</span></div>)}
          {!diagnostics.some((x:any)=>x.sessionId===sessionIdRef.current) ? <div style={{fontSize:10,color:"#788896",marginTop:6}}>Les contrôles de cette partie apparaîtront ici.</div> : null}
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
          <div style={{fontSize:12,color:"#b9c7d4",lineHeight:1.5}}>{turnArmed?"Référence pré-volée verrouillée. Lance maintenant exactement 3 fléchettes, ne touche ni à la cible ni au téléphone, puis analyse.":"Avant de lancer, l’IA vérifie la perspective, la stabilité et la netteté puis capture une référence fraîche. Cette étape évite qu’un micro-déplacement entre deux joueurs fausse les millimètres."}</div>
          {!turnArmed ? <button style={{...btn,width:"100%",marginTop:10,borderColor:"#8fffc2",background:"rgba(57,217,138,.12)"}} onClick={runPreflightCheck}>🛡️ CONTRÔLE AVANT VOLÉE</button> : <button style={{...btn,width:"100%",marginTop:10}} onClick={analyze}>🧠 ANALYSER LES 3 FLÉCHETTES</button>}
        </section> : null}

        {phase === "review" ? <section style={card}>
          <h3 style={h3}>CONTRÔLE IA · {current?.name}</h3>
          <div style={{fontSize:11,color:"#aab9c6",lineHeight:1.5,marginBottom:8}}>Aucun point n’est encore enregistré. Vérifie les propriétaires et la précision. Une seconde lecture indépendante devient obligatoire dès qu’une pointe dépasse le seuil d’incertitude. {cameraPrefs.strictDartIdentification?"L’identification stricte bloque aussi toute attribution ambiguë tant qu’elle n’est pas confirmée.":""}</div>
          {pendingImpacts.map((impact:any, i:number) => {
            const p = players.find((x:any) => String(x.id) === String(impact.playerId));
            return <div key={impact.id} style={{padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{display:"grid",gridTemplateColumns:"28px 1fr auto",gap:8,alignItems:"center"}}><b>#{i+1}</b><div><b>{p?.name || "Joueur ?"}</b><div style={{fontSize:10,color:impact.needsReview||impact.precisionTieRisk?"#ffbd65":"#9fb0bf"}}>identité {Math.round(impact.identityConfidence*100)} % · mesure {Math.round(impact.confidence*100)} % · frames {Math.round((impact.frameAgreement||1)*100)} %{impact.rereadAgreement!=null?` · relecture ${Math.round(impact.rereadAgreement*100)} %`:""}{impact.precisionTieRisk?" · ⚠ départage serré":""}</div></div><b style={{color:ACCENT}}>{impact.distanceMm.toFixed(1)} ± {impact.uncertaintyMm.toFixed(1)} mm</b></div>
              {impact.needsReview ? <button onClick={() => cyclePendingOwner(impact.id)} style={{...miniBtn,marginTop:6}}>⚠️ CORRIGER LE JOUEUR →</button> : null}
            </div>;
          })}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}><button style={btn} onClick={precisionReread}>🔬 RELECTURE PRÉCISION{precisionRereads ? ` (${precisionRereads})` : ""}</button><button style={btn} onClick={reanalyze}>↻ RÉANALYSER</button><button style={{...btn,background:`${ACCENT}2b`}} onClick={confirmAnalysis}>✓ VALIDER L’ANALYSE</button></div>
        </section> : null}

        {(phase === "roundEnd" || phase === "finished") ? <section style={card}>
          <h3 style={h3}>{phase === "finished" ? "CLASSEMENT FINAL" : "CLASSEMENT DE LA MANCHE"}</h3>
          {phase === "roundEnd" && hasPrecisionTieRisk ? <div style={{padding:9,borderRadius:10,border:"1px solid #ffbd4555",background:"#ffbd4510",color:"#ffd796",fontSize:11,marginBottom:6}}>⚠️ Au moins deux impacts sont plus proches que la marge d’incertitude estimée. Un contrôle caméra rapproché est conseillé avant validation.</div> : null}
          {(phase === "finished" ? players.map((p:any) => ({playerId:p.id,points:allScores[p.id]||0,distanceMm:null})).sort((a:any,b:any)=>b.points-a.points) : ranked).map((r:any,i:number) => {
            const p = players.find((x:any) => String(x.id) === String(r.playerId));
            return <div key={`${r.playerId}-${i}-${r.id||"final"}`} style={{display:"grid",gridTemplateColumns:"32px 1fr auto",gap:8,alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}><b>#{i+1}</b><div><b>{p?.name}</b>{p?.teamId ? <span style={{color:ACCENT,fontSize:11}}> · Team {p.teamId}</span> : null}{r.distanceMm != null ? <div style={{fontSize:11,color:r.ambiguousWithPrevious?"#ffbd65":"#9fb0bf"}}>{r.distanceMm.toFixed(1)} ± {Number(r.uncertaintyMm||0).toFixed(1)} mm · vision {Math.round(r.confidence*100)} % · identité {Math.round(r.identityConfidence*100)} %{r.ambiguousWithPrevious?` · départage ${Number(r.gapToPreviousMm||0).toFixed(2)} mm ≤ marge ${Number(r.ambiguityMarginMm||0).toFixed(2)} mm`:""}</div> : null}</div><b style={{color:ACCENT}}>+{r.points||0}</b></div>;
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
