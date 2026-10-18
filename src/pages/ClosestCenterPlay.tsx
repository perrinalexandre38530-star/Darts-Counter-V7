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
import { appendClosestCenterDiagnostic, buildClosestCenterQualityReport, loadClosestCenterDiagnostics, summarizeClosestCenterDiagnostics } from "../lib/closestCenterDiagnostics";
import { History } from "../lib/history";
import { buildClosestCenterStats } from "../lib/closestCenterStats";

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
  const waitFreshFrame = async () => {
    if (!video) return;
    const rvfc = (video as any).requestVideoFrameCallback;
    if (typeof rvfc === "function") {
      await new Promise<void>(resolve => { let done=false; const t=window.setTimeout(()=>{if(!done){done=true;resolve();}},Math.max(90,delayMs*2)); rvfc.call(video,()=>{if(done)return;done=true;window.clearTimeout(t);resolve();}); });
    } else await new Promise(resolve => window.setTimeout(resolve, delayMs));
  };
  for (let i = 0; i < count; i++) {
    if (i > 0) await waitFreshFrame();
    const frame = capture(video, undefined, maxCaptureSide);
    if (frame) frames.push(frame);
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

function roundUsage(impacts:any[], players:any[], round:number, dartsPerPlayer:number) {
  const used:Record<string,number> = {};
  players.forEach((p:any)=>used[String(p.id)] = 0);
  impacts.filter((x:any)=>Number(x.round)===Number(round)).forEach((x:any)=>{
    const id=String(x.playerId || "");
    if (id in used) used[id] = Math.min(dartsPerPlayer, (used[id] || 0) + 1);
  });
  return used;
}

function teamRemaining(players:any[], used:Record<string,number>, dartsPerPlayer:number, teamId:"A"|"B") {
  return players
    .filter((p:any)=>String(p.teamId||"A")===teamId)
    .reduce((sum:number,p:any)=>sum + Math.max(0, dartsPerPlayer - Number(used[String(p.id)] || 0)), 0);
}

function determinePetanqueTeamToPlay(
  impacts:any[],
  players:any[],
  round:number,
  dartsPerPlayer:number,
  starterTeam:"A"|"B",
):"A"|"B"|null {
  const roundImpacts=impacts.filter((x:any)=>Number(x.round)===Number(round));
  const used=roundUsage(impacts,players,round,dartsPerPlayer);
  const remA=teamRemaining(players,used,dartsPerPlayer,"A");
  const remB=teamRemaining(players,used,dartsPerPlayer,"B");
  if (remA<=0 && remB<=0) return null;
  if (remA<=0) return "B";
  if (remB<=0) return "A";
  if (!roundImpacts.length) return starterTeam;
  const sorted=[...roundImpacts].sort((a:any,b:any)=>Number(a.distanceMm||Infinity)-Number(b.distanceMm||Infinity));
  const pointTeam=String(sorted[0]?.teamId || players.find((p:any)=>String(p.id)===String(sorted[0]?.playerId))?.teamId || starterTeam)==="B"?"B":"A";
  const hasA=roundImpacts.some((x:any)=>String(x.teamId || players.find((p:any)=>String(p.id)===String(x.playerId))?.teamId)==="A");
  const hasB=roundImpacts.some((x:any)=>String(x.teamId || players.find((p:any)=>String(p.id)===String(x.playerId))?.teamId)==="B");
  if (!hasA) return "A";
  if (!hasB) return "B";
  const challenger=pointTeam==="A"?"B":"A";
  return challenger==="A" ? (remA>0?"A":"B") : (remB>0?"B":"A");
}

function determineManualPetanqueTeamToPlay(
  throwsLog:any[],
  players:any[],
  round:number,
  dartsPerPlayer:number,
  starterTeam:"A"|"B",
):"A"|"B"|null {
  const roundThrows=throwsLog.filter((x:any)=>Number(x.round)===Number(round));
  const used=roundUsage(roundThrows,players,round,dartsPerPlayer);
  const remA=teamRemaining(players,used,dartsPerPlayer,"A");
  const remB=teamRemaining(players,used,dartsPerPlayer,"B");
  if (remA<=0 && remB<=0) return null;
  if (remA<=0) return "B";
  if (remB<=0) return "A";
  if (!roundThrows.length) return starterTeam;
  const lastPoint=[...roundThrows].reverse().find((x:any)=>x.tookPoint);
  const pointTeam=(String(lastPoint?.teamId || starterTeam)==="B"?"B":"A") as "A"|"B";
  const challenger=pointTeam==="A"?"B":"A";
  return challenger==="A" ? (remA>0?"A":"B") : (remB>0?"B":"A");
}

function firstEligiblePlayerIndex(players:any[], used:Record<string,number>, dartsPerPlayer:number, teamId:"A"|"B"|null, preferredIndex=0) {
  if (!teamId) return -1;
  const eligible=players
    .map((p:any,i:number)=>({p,i}))
    .filter(({p}:any)=>String(p.teamId||"A")===teamId && Number(used[String(p.id)]||0)<dartsPerPlayer);
  if (!eligible.length) return -1;
  const preferred=eligible.find(({i}:any)=>i===preferredIndex);
  return preferred ? preferred.i : eligible[0].i;
}

export default function ClosestCenterPlay(props:any) {
  const go = props.go ?? props.setTab;
  const cfg = props.params?.config || {};
  const players = cfg.players || [];
  const inputMode:"camera"|"manual" = cfg.inputMode === "manual" ? "manual" : "camera";
  const isManual = inputMode === "manual";
  const pointsMode:"petanque"|"descending"|"winner" = cfg.pointsMode === "descending" || cfg.pointsMode === "winner" ? cfg.pointsMode : "petanque";
  const dartsPerPlayer = Math.max(1, Math.min(3, Number(cfg.dartsPerPlayer || 3)));
  const dartsPerTeam = Math.max(dartsPerPlayer, Number(cfg.dartsPerTeam || dartsPerPlayer * Math.max(1, Number(cfg.sideSize || 1))));
  const ticker = getTicker("closest_center") || getTicker("darts_games") || "";
  const [cameraPrefs] = React.useState(() => loadCameraScoringPreferences());
  const sessionIdRef = React.useRef(`petanque-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
  const matchIdRef = React.useRef(String(props.params?.resumeId || `closest-center-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const hydratedRef = React.useRef(false);
  const [diagnostics, setDiagnostics] = React.useState<any[]>(() => loadClosestCenterDiagnostics().slice(-120));

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const autoRereadRunningRef = React.useRef(false);
  const preflightRunningRef = React.useRef(false);
  const [camError, setCamError] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const [cal] = React.useState<CameraCalibration | null>(() => loadCameraCalibration());
  const [phase, setPhase] = React.useState<"enroll"|"baseline"|"play"|"review"|"roundEnd"|"finished">(isManual ? "play" : "enroll");
  const [enrollIndex, setEnrollIndex] = React.useState(0);
  const [samples, setSamples] = React.useState<Record<string,any[]>>({});
  const [signatures, setSignatures] = React.useState<Record<string,any>>({});
  const [round, setRound] = React.useState(1);
  const [playerIndex, setPlayerIndex] = React.useState(0);
  const [roundStarterTeam, setRoundStarterTeam] = React.useState<"A"|"B">("A");
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
  const [manualRanking, setManualRanking] = React.useState<(string | null)[]>(Array.from({length:8},()=>null));
  const [manualWinningTeam, setManualWinningTeam] = React.useState<"A"|"B"|null>(null);
  const [manualEditingRound, setManualEditingRound] = React.useState(false);
  const [manualThrows, setManualThrows] = React.useState<any[]>([]);
  const [manualStage, setManualStage] = React.useState<"throws"|"score">("throws");
  const [manualEntryMode, setManualEntryMode] = React.useState<"quick"|"guided">("quick");
  const [roundResults, setRoundResults] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState(isManual
    ? (pointsMode === "petanque" ? "Saisie rapide : à la fin de la mène, choisis seulement l’équipe qui marque et ses fléchettes marquantes." : "Fin de manche : renseigne uniquement les fléchettes qui scorent.")
    : "Présente les 3 fléchettes du joueur dans le cadre de scan.");

  React.useEffect(() => {
    if (isManual) { setReady(true); setCamError(""); return; }
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
  }, [cameraPrefs.maxCaptureSide, isManual]);

  const cameraRoundUsed = React.useMemo(() => roundUsage(impacts, players, round, dartsPerPlayer), [impacts, players, round, dartsPerPlayer]);
  const manualRoundThrows = React.useMemo(() => manualThrows.filter((x:any)=>Number(x.round)===Number(round)), [manualThrows, round]);
  const manualRoundUsed = React.useMemo(() => roundUsage(manualThrows, players, round, dartsPerPlayer), [manualThrows, players, round, dartsPerPlayer]);
  const activeRoundUsed = isManual && pointsMode==="petanque" ? manualRoundUsed : cameraRoundUsed;
  const petanqueTeamToPlay = React.useMemo(() => {
    if (pointsMode!=="petanque") return null;
    if (isManual) return manualEntryMode==="guided" && manualStage==="throws"
      ? determineManualPetanqueTeamToPlay(manualThrows, players, round, dartsPerPlayer, roundStarterTeam)
      : null;
    return determinePetanqueTeamToPlay(impacts, players, round, dartsPerPlayer, roundStarterTeam);
  }, [pointsMode, isManual, manualEntryMode, manualStage, manualThrows, impacts, players, round, dartsPerPlayer, roundStarterTeam]);
  const current = players[phase === "enroll" ? enrollIndex : playerIndex];
  const expectedTurnDarts = pointsMode==="petanque" && !isManual ? 1 : dartsPerPlayer;
  const currentDartsUsed = current ? Number(activeRoundUsed[String(current.id)] || 0) : 0;
  const currentDartsRemaining = Math.max(0, dartsPerPlayer - currentDartsUsed);
  const teamDartsRemaining = React.useMemo(() => ({
    A: teamRemaining(players, activeRoundUsed, dartsPerPlayer, "A"),
    B: teamRemaining(players, activeRoundUsed, dartsPerPlayer, "B"),
  }), [players, activeRoundUsed, dartsPerPlayer]);
  const livePointTeam = React.useMemo(() => {
    if (isManual && pointsMode==="petanque") {
      const lastPoint=[...manualThrows].filter((x:any)=>Number(x.round)===Number(round)).reverse().find((x:any)=>x.tookPoint);
      return lastPoint ? (String(lastPoint.teamId)==="B" ? "B" : "A") : null;
    }
    const live=impacts.filter((x:any)=>Number(x.round)===Number(round));
    if (!live.length) return null;
    const closest=[...live].sort((a:any,b:any)=>Number(a.distanceMm||Infinity)-Number(b.distanceMm||Infinity))[0];
    return String(closest?.teamId || players.find((p:any)=>String(p.id)===String(closest?.playerId))?.teamId || "")==="B" ? "B" : "A";
  }, [isManual, pointsMode, manualThrows, impacts, players, round]);
  const sessionDiagnostics = React.useMemo(() => diagnostics.filter((x:any) => x.sessionId === sessionIdRef.current), [diagnostics]);
  const diagnosticSummary = React.useMemo(() => summarizeClosestCenterDiagnostics(sessionDiagnostics), [sessionDiagnostics]);
  const cameraQuality = React.useMemo(() => buildClosestCenterQualityReport(sessionDiagnostics), [sessionDiagnostics]);

  React.useEffect(() => {
    if (pointsMode!=="petanque" || phase==="enroll" || phase==="review" || phase==="roundEnd" || phase==="finished") return;
    if (isManual && (manualEntryMode!=="guided" || manualStage!=="throws")) return;
    const nextIndex=firstEligiblePlayerIndex(players,activeRoundUsed,dartsPerPlayer,petanqueTeamToPlay,playerIndex);
    if (nextIndex>=0 && nextIndex!==playerIndex) setPlayerIndex(nextIndex);
  }, [isManual, manualEntryMode, manualStage, pointsMode, phase, players, activeRoundUsed, dartsPerPlayer, petanqueTeamToPlay, playerIndex]);

  const saveCheckpoint = React.useCallback(async (extra:any = {}) => {
    if (!players.length || phase === "finished") return;
    const now = Date.now();
    const safePhase = phase === "enroll" ? "enroll" : "baseline";
    const resumeState = {
      v: 1, mode: "closest_center", cfg, players, round, allScores, impacts, signatures, inputMode, playerIndex, roundStarterTeam,
      manualThrows, manualStage, manualEntryMode, manualRanking, manualWinningTeam, roundResults,
      enrollIndex, phase: isManual ? (phase === "roundEnd" ? "roundEnd" : "play") : safePhase, sessionId: sessionIdRef.current, diagnostics: sessionDiagnostics.slice(-120),
      updatedAt: now, ...extra,
    };
    try {
      await History.upsert({
        id: matchIdRef.current, matchId: matchIdRef.current, kind: "closest_center", status: "in_progress",
        createdAt: now, updatedAt: now, players, game: { mode: "closest_center", rounds: pointsMode==="petanque"?round:cfg.rounds, targetScore:cfg.targetScore||null, formatMode:cfg.formatMode||"duo", dartsPerPlayer, teamMode: cfg.teamMode, pointsMode, inputMode },
        summary: { round, rounds: pointsMode==="petanque"?round:(cfg.rounds || 3), targetScore:cfg.targetScore||null, formatMode:cfg.formatMode||"duo", dartsPerPlayer, scores: allScores, roundResults, finished: false },
        resume: { state: resumeState },
        payload: { stateSnapshot: resumeState, roundResults },
      } as any);
    } catch {}
  }, [players, phase, cfg, round, allScores, impacts, signatures, enrollIndex, playerIndex, roundStarterTeam, inputMode, isManual, sessionDiagnostics, manualRanking, manualWinningTeam, manualThrows, manualStage, manualEntryMode, roundResults, pointsMode, dartsPerPlayer]);

  React.useEffect(() => {
    if (hydratedRef.current) return;
    const resumeId = String(props.params?.resumeId || "").trim();
    if (!resumeId) { hydratedRef.current = true; return; }
    let cancelled = false;
    void History.get(resumeId).then((rec:any) => {
      if (cancelled || !rec) return;
      const st = rec?.resume?.state || rec?.payload?.stateSnapshot;
      if (!st || st.mode !== "closest_center") return;
      matchIdRef.current = String(rec.id || rec.matchId || resumeId);
      if (st.sessionId) sessionIdRef.current = String(st.sessionId);
      setRound(Math.max(1, Number(st.round || 1)));
      setAllScores(st.allScores || {});
      setImpacts(Array.isArray(st.impacts) ? st.impacts : []);
      setSignatures(st.signatures || {});
      setEnrollIndex(Math.max(0, Number(st.enrollIndex || 0)));
      setPlayerIndex(Math.max(0, Math.min(players.length - 1, Number(st.playerIndex || 0))));
      if (st.roundStarterTeam === "A" || st.roundStarterTeam === "B") setRoundStarterTeam(st.roundStarterTeam);
      if (Array.isArray(st.diagnostics)) setDiagnostics(st.diagnostics.slice(-120));
      if (Array.isArray(st.roundResults)) setRoundResults(st.roundResults);
      setBefore(null); setPendingAfter(null); setPendingImpacts([]); setPendingConsensus([]);
      setPrecisionRereads(0); setTieAcknowledged(false); setTurnArmed(false); setPreflightInfo(null);
      if (isManual) {
        if (st.manualEntryMode === "guided" || st.manualEntryMode === "quick") setManualEntryMode(st.manualEntryMode);
        if (Array.isArray(st.manualRanking)) setManualRanking([...st.manualRanking, ...Array.from({length:8},()=>null)].slice(0,8));
        if (st.manualWinningTeam === "A" || st.manualWinningTeam === "B") setManualWinningTeam(st.manualWinningTeam);
        if (Array.isArray(st.manualThrows)) setManualThrows(st.manualThrows);
        if (st.manualStage === "score" || st.manualStage === "throws") setManualStage(st.manualStage);
        setPhase(st.phase === "roundEnd" ? "roundEnd" : "play");
        setStatus(st.manualEntryMode === "quick"
          ? "♻️ Partie manuelle reprise en saisie rapide. Choisis l’équipe qui marque puis ses seules fléchettes marquantes."
          : st.manualStage === "score"
            ? "♻️ Partie manuelle reprise. Termine la saisie des seuls points marqués."
            : "♻️ Partie manuelle reprise. Continue la mène lancer par lancer.");
      } else {
        setPlayerIndex(0);
        setPhase(Object.keys(st.signatures || {}).length >= players.length ? "baseline" : "enroll");
        setStatus(Object.keys(st.signatures || {}).length >= players.length
          ? "♻️ Partie reprise. Pour garantir la précision, recapture obligatoirement une cible vide avant de continuer."
          : "♻️ Partie reprise. Termine l’enrôlement IA des fléchettes avant de continuer.");
      }
      hydratedRef.current = true;
    }).catch(() => { hydratedRef.current = true; });
    return () => { cancelled = true; };
  }, [props.params?.resumeId, players.length]);

  React.useEffect(() => {
    if (!hydratedRef.current || phase === "finished") return;
    const t = window.setTimeout(() => { void saveCheckpoint(); }, 220);
    return () => window.clearTimeout(t);
  }, [round, allScores, impacts, signatures, enrollIndex, playerIndex, roundStarterTeam, phase, manualRanking, manualWinningTeam, manualThrows, manualStage, manualEntryMode, roundResults, saveCheckpoint]);

  React.useEffect(() => {
    const flush = () => { if (phase !== "finished") void saveCheckpoint(); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", onVis); };
  }, [phase, saveCheckpoint]);

  const traceCamera = React.useCallback((stage:any, level:any, code:string, message:string, metrics:any = {}) => {
    const entry = appendClosestCenterDiagnostic({
      sessionId: sessionIdRef.current,
      round,
      playerId: current?.id ?? null,
      playerName: current?.name ?? null,
      stage, level, code, message, metrics,
    });
    setDiagnostics(prev => [...prev, entry].slice(-120));
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
    if (pointsMode==="petanque") {
      const starterIndex=players.findIndex((p:any)=>String(p.teamId||"A")===roundStarterTeam);
      setPlayerIndex(starterIndex>=0?starterIndex:0);
    } else setPlayerIndex(0);
    traceCamera("baseline", "ok", "baseline-ready", "Référence de manche validée", {tier,confidence:readiness.confidence,mmPerPixel:readiness.mmPerPixel,sharpness:readiness.sharpness});
    setStatus(pointsMode==="petanque"
      ? `Précision ${tier.toUpperCase()} validée · ÉQUIPE ${roundStarterTeam} commence la mène. Choisis le joueur puis effectue le CONTRÔLE AVANT LANCER.`
      : `Précision ${tier.toUpperCase()} validée · ${readiness.mmPerPixel.toFixed(2)} mm/pixel. Avant de lancer, effectue le CONTRÔLE AVANT VOLÉE.`);
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
      setStatus(`✅ Volée armée · ${tier.toUpperCase()} · référence fraîche capturée. ${current.name}: lance maintenant tes ${expectedTurnDarts} fléchette${expectedTurnDarts>1?"s":""}, puis ANALYSER.`);
    } finally {
      preflightRunningRef.current = false;
    }
  };

  const analyze = async () => {
    if (!cal || !before || !current) return;
    if (!turnArmed) { setStatus(`🛡️ Lance d’abord CONTRÔLE AVANT VOLÉE, puis seulement ${expectedTurnDarts} fléchette${expectedTurnDarts>1?"s":""}.`); return; }
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

    const detectionsByFrame = burst.map(frame => analyzeFrameDifference(before, frame, cal, Math.max(4, expectedTurnDarts + 3)));
    const found = fuseDetectionFrames(detectionsByFrame, expectedTurnDarts);
    if (!found.length) {
      setStatus("Aucun nouvel impact fiable détecté. Garde le téléphone immobile et recommence l’analyse.");
      return;
    }
    if (found.length < expectedTurnDarts) {
      traceCamera("analysis", "reject", "impact-count", "Nombre d’impacts détectés insuffisant", {found:found.length,expected:expectedTurnDarts});
      setStatus(`Seulement ${found.length}/${expectedTurnDarts} impact(s) détecté(s). Stabilise le téléphone et relance l’analyse : aucune mesure n’a été validée.`);
      return;
    }

    const proposed = found.map((d:any, i:number) => {
      const observed = extractImpactPatch(after, d);
      const identity = classifyDartIdentity(signatures, observed, current.id);
      // The active player is authoritative: the visual signature is a safety check,
      // not a silent ownership switch. A strong mismatch is surfaced for review.
      const expectedId = String(current.id);
      const visualBest = Array.isArray(identity.scores) && identity.scores.length ? identity.scores[0] : null;
      const expectedVisual = Array.isArray(identity.scores) ? identity.scores.find((x:any)=>String(x.playerId)===expectedId) : null;
      const visualBestId = visualBest?.playerId != null ? String(visualBest.playerId) : expectedId;
      const visualLeadOverExpected = Math.max(0, Number(visualBest?.score||0) - Number(expectedVisual?.score||0));
      const identityMismatch = visualBestId !== expectedId && Number(visualBest?.score||0) >= .76 && visualLeadOverExpected >= .10;
      const owner = current;
      const frameAgreement = Number(d.frameAgreement ?? 1);
      const measurementConfidence = Math.max(.2, Math.min(1, d.confidence * (.58 + stable.confidence * .16 + readiness.confidence * .18 + frameAgreement * .08)));
      const localMetric = localMetricMmPerPixel(cal, after.width, after.height, d.xNorm, d.yNorm);
      // Sub-pixel localisation means the instrumental floor is a fraction of a
      // source pixel. Keep anisotropy/projective distortion in that floor so we
      // never advertise artificial precision near oblique board regions.
      const resolutionFloor = Math.max(.18, Number(localMetric.meanMmPerPixel || readiness.mmPerPixel || .8) * .38 * Math.max(1, Math.min(1.8, Number(localMetric.anisotropy||1))));
      const consensusPenalty = Math.max(0, Number(d.spreadMm || 0) * .62);
      const geometrySpreadPx = Math.max(...geometryChecks.map((x:any)=>x.regionalSpreadPx));
      const registrationPenalty = Math.max(0,(1-avgRegistration)*.95) + Math.max(0, geometrySpreadPx*.09);
      const uncertaintyMm = Math.max(resolutionFloor, estimateDistanceUncertaintyMm(measurementConfidence, cal) + consensusPenalty + registrationPenalty);
      const expectedIdentityConfidence = Math.max(0, Math.min(1, Number(expectedVisual?.score ?? identity.confidence ?? 0)));
      const expectedMargin = Math.max(0, Number(expectedVisual?.score||0) - Math.max(0, ...((identity.scores||[]).filter((x:any)=>String(x.playerId)!==expectedId).map((x:any)=>Number(x.score||0)))));
      const needsReview = identityMismatch || expectedIdentityConfidence < cameraPrefs.minIdentityConfidence || expectedMargin < cameraPrefs.minIdentityMargin || measurementConfidence < .74 || frameAgreement < cameraPrefs.minFrameAgreement || Number(d.spreadMm||0) > cameraPrefs.maxConsensusSpreadMm || uncertaintyMm > cameraPrefs.maxUncertaintyMm;
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
        identityConfidence: expectedIdentityConfidence,
        identityMargin: expectedMargin,
        identityMismatch,
        visualBestPlayerId: visualBestId,
        visualBestConfidence: Number(visualBest?.score||0),
        expectedVisualConfidence: Number(expectedVisual?.score||0),
        uncertaintyMm,
        frameAgreement,
        consensusSpreadMm: Number(d.spreadMm || 0),
        localMmPerPixel: localMetric.meanMmPerPixel,
        metricAnisotropy: localMetric.anisotropy,
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
    setStatus(tieAlerts ? `⚠️ ${tieAlerts} impact(s) sont dans une zone de départage serré : relecture précision renforcée requise.` : alerts ? `${alerts} fléchette(s) demandent un contrôle avant validation.` : `Analyse multi-frame cohérente. Vérifie les ${expectedTurnDarts} impact(s) puis valide la volée.`);
  };

  const precisionReread = async () => {
    if (!cal || !before || !current || pendingConsensus.length !== expectedTurnDarts) return;
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
    const second=fuseDetectionFrames(detections,expectedTurnDarts);
    if(second.length!==expectedTurnDarts){ traceCamera("reread", "reject", "impact-count", "Relecture incomplète", {found:second.length,expected:expectedTurnDarts}); setStatus(`❌ Relecture incomplète (${second.length}/${expectedTurnDarts}). Aucune précision supplémentaire n’est appliquée.`); return; }
    const merged=fuseIndependentConsensusPasses(pendingConsensus,second,cal,before.width,before.height,expectedTurnDarts);
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
    if (phase !== "review" || !cameraPrefs.autoReread || precisionRereads > 0 || pendingImpacts.length !== expectedTurnDarts || autoRereadRunningRef.current) return;
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
      return { ...impact, playerId: owner.id, teamId: owner.teamId || null, identityConfidence: 1, identityMargin: 1, identityMismatch: false, needsReview: false, manuallyConfirmedOwner: true };
    }));
  };

  const reanalyze = () => {
    setPendingAfter(null);
    setPendingImpacts([]);
    setPendingConsensus([]);
    setPrecisionRereads(0);
    setPhase("play");
    setStatus(`${current?.name}: garde ${expectedTurnDarts===1?"la fléchette":"les "+expectedTurnDarts+" fléchettes"} en place, stabilise le téléphone puis relance l’analyse. La référence pré-volée reste verrouillée.`);
  };

  const recordManualPetanqueThrow = (takesPoint:boolean) => {
    if (!isManual || pointsMode!=="petanque" || manualStage!=="throws") return;
    const teamToPlay=determineManualPetanqueTeamToPlay(manualThrows,players,round,dartsPerPlayer,roundStarterTeam);
    if (!teamToPlay) return;
    const p=players[playerIndex];
    if (!p || String(p.teamId||"A")!==teamToPlay) {
      setStatus(`❌ Choisis un joueur de l’équipe ${teamToPlay} qui a encore une fléchette en main.`);
      return;
    }
    const used=roundUsage(manualThrows,players,round,dartsPerPlayer);
    if (Number(used[String(p.id)]||0)>=dartsPerPlayer) {
      setStatus(`❌ ${p.name} n’a plus de fléchette en main.`);
      return;
    }
    const roundThrows=manualThrows.filter((x:any)=>Number(x.round)===Number(round));
    const effectiveTakesPoint=roundThrows.length===0 ? true : !!takesPoint;
    const entry={
      id:`mt-${round}-${p.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      round,
      playerId:String(p.id),
      teamId:String(p.teamId||"A")==="B"?"B":"A",
      tookPoint:effectiveTakesPoint,
      sequence:roundThrows.length+1,
      createdAt:Date.now(),
    };
    const next=[...manualThrows,entry];
    setManualThrows(next);
    const nextTeam=determineManualPetanqueTeamToPlay(next,players,round,dartsPerPlayer,roundStarterTeam);
    const lastPoint=[...next].filter((x:any)=>Number(x.round)===Number(round)).reverse().find((x:any)=>x.tookPoint);
    const pointTeam=(String(lastPoint?.teamId||entry.teamId)==="B"?"B":"A") as "A"|"B";
    if (!nextTeam) {
      setManualStage("score");
      setManualWinningTeam(pointTeam);
      setManualRanking(Array.from({length:8},()=>null));
      setStatus(`Mène terminée · le point est à l’équipe ${pointTeam}. Saisis uniquement les fléchettes de cette équipe qui marquent.`);
      return;
    }
    const usedAfter=roundUsage(next,players,round,dartsPerPlayer);
    const nextIndex=firstEligiblePlayerIndex(players,usedAfter,dartsPerPlayer,nextTeam,playerIndex);
    if (nextIndex>=0) setPlayerIndex(nextIndex);
    const nextPlayer=players[nextIndex];
    const remaining=nextPlayer ? Math.max(0,dartsPerPlayer-Number(usedAfter[String(nextPlayer.id)]||0)) : 0;
    setStatus(`${effectiveTakesPoint?`Point pris par l’équipe ${entry.teamId}.`:`Le point reste à l’équipe ${pointTeam}.`} Équipe ${nextTeam} à jouer${nextPlayer?` · ${nextPlayer.name} (${remaining} en main)`:""}.`);
  };

  const undoLastManualPetanqueThrow = () => {
    if (!isManual || pointsMode!=="petanque") return;
    const roundThrows=manualThrows.filter((x:any)=>Number(x.round)===Number(round));
    if (!roundThrows.length) return;
    const last=roundThrows[roundThrows.length-1];
    setManualThrows(prev=>{
      const ix=prev.findIndex((x:any)=>String(x.id)===String(last.id));
      if (ix<0) return prev;
      const next=[...prev];
      next.splice(ix,1);
      return next;
    });
    setManualStage("throws");
    setManualWinningTeam(null);
    setManualRanking(Array.from({length:8},()=>null));
    const ownerIndex=players.findIndex((p:any)=>String(p.id)===String(last.playerId));
    if (ownerIndex>=0) setPlayerIndex(ownerIndex);
    setStatus(`↩️ Dernier lancer de ${players[ownerIndex]?.name || "ce joueur"} annulé. Rejoue-le puis indique s’il prend le point.`);
  };

  const resetManualEntry = () => { setManualRanking(Array.from({length:8},()=>null)); setManualWinningTeam(null); setManualEditingRound(false); };

  const chooseManualRankOwner = (slot:number, playerId:string) => {
    setManualRanking(prev => {
      const next=[...prev];
      const same = String(next[slot] || "") === String(playerId);
      if (same) { next[slot]=null; return next; }
      const already = next.filter((id,ix)=>ix!==slot && String(id||"")===String(playerId)).length;
      if (already >= dartsPerPlayer) {
        setStatus(`❌ ${players.find((p:any)=>String(p.id)===String(playerId))?.name || "Ce joueur"} n’a que ${dartsPerPlayer} fléchette${dartsPerPlayer>1?"s":""} en main.`);
        return prev;
      }
      next[slot]=String(playerId);
      return next;
    });
  };

  const submitManualTurn = () => {
    if (!isManual) return;

    const now=Date.now();
    let selectedOwners = manualRanking.filter(Boolean) as string[];

    if (pointsMode === "petanque") {
      const roundThrows=manualThrows.filter((x:any)=>Number(x.round)===Number(round));
      if (!manualWinningTeam) { setStatus("❌ Choisis l’équipe qui marque cette mène."); return; }
      const winningTeam=manualWinningTeam;
      if (manualEntryMode === "guided" && (manualStage!=="score" || !roundThrows.length)) { setStatus("❌ Termine d’abord le suivi de la mène."); return; }
      if (!selectedOwners.length) { setStatus("❌ Ajoute au moins une fléchette qui marque."); return; }
      if (selectedOwners.length > dartsPerTeam) { setStatus(`❌ Maximum ${dartsPerTeam} point(s) possible(s) pour cette équipe.`); return; }
      const wrongSide=selectedOwners.some((id:string)=>String(players.find((p:any)=>String(p.id)===String(id))?.teamId)!==winningTeam);
      if (wrongSide) { setStatus("❌ En règle Pétanque, toutes les fléchettes qui marquent appartiennent à la même équipe."); return; }
      const scoredByPlayer:Record<string,number>={};
      for (const id of selectedOwners) scoredByPlayer[id]=(scoredByPlayer[id]||0)+1;
      if (manualEntryMode === "guided") {
        const thrownByPlayer:Record<string,number>={};
        roundThrows.forEach((x:any)=>{const id=String(x.playerId||""); thrownByPlayer[id]=(thrownByPlayer[id]||0)+1;});
        const impossible=Object.keys(scoredByPlayer).find(id=>Number(scoredByPlayer[id]||0)>Number(thrownByPlayer[id]||0));
        if (impossible) {
          const who=players.find((p:any)=>String(p.id)===String(impossible));
          setStatus(`❌ ${who?.name||"Ce joueur"} ne peut pas avoir plus de fléchettes marquantes que de fléchettes réellement jouées.`);
          return;
        }
      } else {
        const impossible=Object.keys(scoredByPlayer).find(id=>Number(scoredByPlayer[id]||0)>dartsPerPlayer);
        if (impossible) {
          const who=players.find((p:any)=>String(p.id)===String(impossible));
          setStatus(`❌ ${who?.name||"Ce joueur"} ne possède que ${dartsPerPlayer} fléchette${dartsPerPlayer>1?"s":""}.`);
          return;
        }
      }
    } else if (pointsMode === "winner") {
      if (!manualRanking[0]) { setStatus("❌ Indique le propriétaire de la fléchette la plus proche."); return; }
      selectedOwners=[String(manualRanking[0])];
    } else {
      const targetSlots=Math.min(5, players.length*dartsPerPlayer);
      const firstEmpty=manualRanking.slice(0,targetSlots).findIndex(x=>!x);
      const hasGap=firstEmpty>=0 && manualRanking.slice(firstEmpty+1,targetSlots).some(Boolean);
      if (!manualRanking[0]) { setStatus("❌ Indique au minimum la fléchette #1."); return; }
      if (hasGap) { setStatus("❌ Le Top 5 doit rester continu, sans trou."); return; }
      selectedOwners=manualRanking.slice(0,targetSlots).filter(Boolean) as string[];
    }

    const occurrence:Record<string,number>={};
    const manualImpacts=selectedOwners.flatMap((playerId:any,i:number)=>{
      const owner=players.find((p:any)=>String(p.id)===String(playerId));
      if(!owner) return [];
      const dartIndex=occurrence[playerId]||0;
      if (dartIndex >= dartsPerPlayer) return [];
      occurrence[playerId]=dartIndex+1;
      return [{
        id:`mr-${round}-${playerId}-${i}-${now}`, round, playerId:String(playerId), expectedPlayerId:String(playerId), teamId:owner.teamId||null,
        dartIndex, manualRank:i+1, distanceMm:i+1, distanceNorm:(i+1)/1000, xNorm:.5, yNorm:.5,
        confidence:1, identityConfidence:1, identityMargin:1, frameAgreement:1, consensusSpreadMm:0, uncertaintyMm:0,
        source:"manual_rank", manuallyEntered:true, ordinalOnly:true, manualScoringOnly:true,
      }];
    });

    if (!manualImpacts.length) { setStatus("❌ Aucune fléchette marquante valide."); return; }
    setImpacts(v=>[...v,...manualImpacts]);
    resetManualEntry();
    setPhase("roundEnd");
    setStatus(pointsMode==="petanque"
      ? `${manualImpacts.length} point(s) pour l’équipe ${manualImpacts[0]?.teamId}. Vérifie puis valide la mène.`
      : "Saisie des fléchettes marquantes enregistrée. Vérifie puis valide la manche.");
  };

  const editManualRanking = () => {
    if(!isManual) return;
    const existing=impacts.filter((x:any)=>x.round===round && x.source==="manual_rank").sort((a:any,b:any)=>Number(a.manualRank||a.distanceMm)-Number(b.manualRank||b.distanceMm));
    const next:(string|null)[]=[null,null,null,null,null];
    existing.forEach((x:any)=>{ const ix=Math.max(0,Math.min(7,Number(x.manualRank||x.distanceMm)-1)); next[ix]=String(x.playerId); });
    setManualRanking(next);
    if (pointsMode==="petanque" && existing[0]?.teamId) setManualWinningTeam(String(existing[0].teamId)==="B"?"B":"A");
    setImpacts(v=>v.filter((x:any)=>!(x.round===round && x.source==="manual_rank")));
    setManualEditingRound(true);
    if (pointsMode==="petanque") setManualStage("score");
    setPhase("play");
    setStatus(pointsMode==="petanque" ? "Corrige uniquement les fléchettes qui marquent puis valide à nouveau la mène." : "Corrige l’ordre des fléchettes puis valide à nouveau le classement.");
  };

  const confirmAnalysis = () => {
    if (!pendingAfter || pendingImpacts.length !== expectedTurnDarts) return;
    const identityCritical = pendingImpacts.some((x:any) => !x.manuallyConfirmedOwner && (!!x.identityMismatch || Number(x.identityConfidence||0) < cameraPrefs.minIdentityConfidence || Number(x.identityMargin||0) < cameraPrefs.minIdentityMargin));
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
    traceCamera("validation", "ok", "turn-accepted", pointsMode==="petanque" ? "Fléchette validée" : "Volée validée", {rereads:precisionRereads,avgUncertaintyMm:pendingImpacts.reduce((s:any,x:any)=>s+Number(x.uncertaintyMm||0),0)/Math.max(1,pendingImpacts.length),manualOwners:pendingImpacts.filter((x:any)=>x.manuallyConfirmedOwner).length});
    const combinedImpacts=[...impacts,...pendingImpacts];
    setImpacts(combinedImpacts);
    setBefore(pendingAfter);
    setPendingAfter(null);
    setPendingImpacts([]);
    setPendingConsensus([]);
    setPrecisionRereads(0);
    setTurnArmed(false);
    setPreflightInfo(null);

    if (pointsMode==="petanque") {
      const usedAfter=roundUsage(combinedImpacts,players,round,dartsPerPlayer);
      const nextTeam=determinePetanqueTeamToPlay(combinedImpacts,players,round,dartsPerPlayer,roundStarterTeam);
      if (!nextTeam) {
        setPhase("roundEnd");
        setStatus("Toutes les fléchettes de la mène ont été jouées. Vérifie les points avant de retirer les fléchettes.");
        return;
      }
      const nextIndex=firstEligiblePlayerIndex(players,usedAfter,dartsPerPlayer,nextTeam,playerIndex);
      if (nextIndex<0) {
        setPhase("roundEnd");
        setStatus("Mène terminée. Vérifie les points avant de retirer les fléchettes.");
        return;
      }
      setPlayerIndex(nextIndex);
      setPhase("play");
      const nextPlayer=players[nextIndex];
      const remaining=Math.max(0,dartsPerPlayer-Number(usedAfter[String(nextPlayer?.id)]||0));
      const liveSorted=[...combinedImpacts.filter((x:any)=>Number(x.round)===Number(round))].sort((a:any,b:any)=>Number(a.distanceMm||Infinity)-Number(b.distanceMm||Infinity));
      const pointTeam=liveSorted[0] ? String(liveSorted[0].teamId||"") : "";
      setStatus(`ÉQUIPE ${nextTeam} doit jouer${pointTeam?` · le point est à l’équipe ${pointTeam}`:""}. ${nextPlayer?.name}: ${remaining} fléchette${remaining>1?"s":""} en main. Effectue le CONTRÔLE AVANT LANCER.`);
      return;
    }

    if (playerIndex < players.length - 1) {
      const nextPlayer = players[playerIndex + 1];
      setPlayerIndex(i => i + 1);
      setPhase("play");
      setStatus(`${nextPlayer?.name}: ne lance pas encore. Effectue le CONTRÔLE AVANT VOLÉE avec les fléchettes précédentes en place.`);
    } else {
      setPhase("roundEnd");
      setStatus("Manche analysée. Vérifie le classement avant de retirer les fléchettes.");
    }
  };

  const ranked = React.useMemo(() => rankImpacts(impacts.filter((x:any) => x.round === round), pointsMode), [impacts, round, pointsMode]);
  const hasPrecisionTieRisk = !isManual && ranked.some((r:any) => r.ambiguousWithPrevious);
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
    if (!isManual) traceCamera("round", hasPrecisionTieRisk ? "warn" : "ok", "round-accepted", "Manche enregistrée", {round,precisionTieRisk:hasPrecisionTieRisk,impacts:ranked.length});
    const next = { ...allScores };
    ranked.forEach((r:any) => next[r.playerId] = (next[r.playerId] || 0) + r.points);
    setAllScores(next);
    const nextTeamTotals:any = {};
    players.forEach((p:any) => { if (p.teamId) nextTeamTotals[p.teamId] = (nextTeamTotals[p.teamId] || 0) + (next[p.id] || 0); });
    const roundWinningTeam = pointsMode==="petanque"
      ? (String(ranked.find((r:any)=>Number(r.points||0)>0)?.scoringSide || ranked[0]?.teamId || "")==="B" ? "B" : "A")
      : null;
    const scoringRows = ranked.filter((r:any)=>Number(r.points||0)>0);
    const pointsByPlayer:Record<string,number> = {};
    scoringRows.forEach((r:any)=>{ const id=String(r.playerId||""); if(id) pointsByPlayer[id]=(pointsByPlayer[id]||0)+Number(r.points||0); });
    const roundPoints = scoringRows.reduce((sum:number,r:any)=>sum+Number(r.points||0),0);
    const scoreBefore = {
      A: Number(Object.entries(allScores).reduce((sum:number,[id,v]:any)=>sum + (String(players.find((p:any)=>String(p.id)===String(id))?.teamId)==="A" ? Number(v||0) : 0),0)),
      B: Number(Object.entries(allScores).reduce((sum:number,[id,v]:any)=>sum + (String(players.find((p:any)=>String(p.id)===String(id))?.teamId)==="B" ? Number(v||0) : 0),0)),
    };
    const scoreAfter = { A:Number(nextTeamTotals.A||0), B:Number(nextTeamTotals.B||0) };
    setRoundResults(prev => [
      ...prev.filter((x:any)=>Number(x.round)!==Number(round)),
      {
        round:Number(round),
        winningTeam:roundWinningTeam,
        points:Number(roundPoints),
        pointsByPlayer,
        starterTeam:roundStarterTeam,
        inputMode,
        manualEntryMode:isManual ? manualEntryMode : null,
        scoringMode:pointsMode,
        scoreBefore,
        scoreAfter,
        createdAt:Date.now(),
      },
    ].sort((a:any,b:any)=>Number(a.round)-Number(b.round)));
    if (roundWinningTeam) setRoundStarterTeam(roundWinningTeam);
    const targetReached = pointsMode === "petanque" && Math.max(Number(nextTeamTotals.A||0), Number(nextTeamTotals.B||0)) >= Number(cfg.targetScore || 13);
    if (targetReached || (pointsMode !== "petanque" && round >= Number(cfg.rounds || 3))) {
      setPhase("finished");
      setStatus(targetReached ? `Partie terminée · objectif ${Number(cfg.targetScore||13)} atteint.` : "Partie terminée.");
      return;
    }
    setRound(r => r + 1);
    setPhase(isManual ? "play" : "baseline");
    if (pointsMode==="petanque" && roundWinningTeam) {
      const starterIndex=players.findIndex((p:any)=>String(p.teamId||"A")===roundWinningTeam);
      setPlayerIndex(starterIndex>=0?starterIndex:0);
    } else setPlayerIndex(0);
    setBefore(null);
    setPendingAfter(null);
    setPendingImpacts([]);
    setPendingConsensus([]);
    setPrecisionRereads(0);
    setTieAcknowledged(false);
    setTurnArmed(false);
    setPreflightInfo(null);
    resetManualEntry();
    if (isManual && pointsMode==="petanque") {
      setManualThrows(v=>v.filter((x:any)=>Number(x.round)!==Number(round)));
      setManualStage("throws");
    }
    setStatus(isManual
      ? (pointsMode==="petanque" ? `Nouvelle mène : équipe ${roundWinningTeam || roundStarterTeam} commence. Enregistre chaque lancer avec POINT PRIS / POINT NON PRIS.` : "Nouvelle manche : joue les volées puis saisis uniquement les fléchettes qui scorent.")
      : "Retire toutes les fléchettes puis capture la cible vide pour la manche suivante.");
  };

  const teamTotals = React.useMemo(() => {
    const out:any = {};
    players.forEach((p:any) => { if (p.teamId) out[p.teamId] = (out[p.teamId] || 0) + (allScores[p.id] || 0); });
    return out;
  }, [players, allScores]);
  const petanqueStats = React.useMemo(() => buildClosestCenterStats(players, impacts, allScores, pointsMode==="petanque" ? Number(round||1) : Number(cfg.rounds || round || 1), dartsPerPlayer), [players, impacts, allScores, cfg.rounds, round, pointsMode, dartsPerPlayer]);
  const finalPlayerRanking = React.useMemo(() => [...(petanqueStats.players || [])].sort((a:any,b:any)=>b.points-a.points||((a.bestMm??Infinity)-(b.bestMm??Infinity))), [petanqueStats]);
  const winner = finalPlayerRanking[0] || null;
  const winningTeamId = React.useMemo(() => {
    if (!cfg.teamMode) return null;
    const entries=Object.entries(teamTotals).sort((a:any,b:any)=>Number(b[1])-Number(a[1]));
    return entries[0]?.[0] || null;
  }, [cfg.teamMode, teamTotals]);

  const narrow = typeof window !== "undefined" && window.innerWidth < 850;
  const finishSaved = React.useRef(false);
  React.useEffect(() => {
    if (phase !== "finished" || finishSaved.current) return;
    finishSaved.current = true;
    const now=Date.now();
    const finalRecord:any={
      id:matchIdRef.current,
      matchId:matchIdRef.current,
      mode:"closest_center",
      kind:"closest_center",
      status:"finished",
      createdAt:now,
      updatedAt:now,
      players,
      rounds:pointsMode==="petanque"?round:(cfg.rounds || round),
      scores:allScores,
      teamTotals,
      impacts,
      inputMode,
      cameraQuality:isManual?null:cameraQuality,
      petanqueStats,
      roundResults,
      game:{mode:"closest_center",rounds:pointsMode==="petanque"?round:(cfg.rounds||round),targetScore:cfg.targetScore||null,formatMode:cfg.formatMode||"duo",dartsPerPlayer,teamMode:cfg.teamMode,pointsMode,inputMode},
      summary:{
        rounds:pointsMode==="petanque"?round:(cfg.rounds||round),
        targetScore:cfg.targetScore||null,
        formatMode:cfg.formatMode||"duo",
        dartsPerPlayer,
        scores:allScores,
        teamTotals,
        inputMode,
        winnerId:winner?.playerId||null,
        winningTeamId,
        bestDistanceMm:petanqueStats.bestDistanceMm,
        cameraQuality:isManual?null:cameraQuality,
        petanqueStats,
        roundResults,
        finished:true,
      },
      payload:{
        impacts,
        teamTotals,
        inputMode,
        targetScore:cfg.targetScore||null,
        formatMode:cfg.formatMode||"duo",
        dartsPerPlayer,
        pointsMode,
        petanqueStats,
        roundResults,
        manualEntryMode:isManual?manualEntryMode:null,
        cameraQuality:isManual?null:cameraQuality,
        diagnostics:isManual?[]:sessionDiagnostics,
      },
    };
    try { props.onFinish?.(finalRecord); } catch {}
    // PETANQUE owns its in-progress History checkpoint, so finalize the same
    // record here as well. This guarantees a detailed local history entry even
    // when the surrounding shell does not persist onFinish.
    void History.upsert(finalRecord).catch(()=>{});
  }, [phase, allScores, teamTotals, impacts, inputMode, isManual, cameraQuality, sessionDiagnostics, petanqueStats, winner?.playerId, winningTeamId, cfg.rounds, cfg.targetScore, cfg.formatMode, cfg.teamMode, cfg.pointsMode, round, players, pointsMode, dartsPerPlayer, roundResults, manualEntryMode]);


  if (!players.length) return <div style={{padding:20,color:"white"}}>Configuration introuvable. <button onClick={() => go?.("closest_center_config")}>Retour</button></div>;

  return <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#03070d",color:"#fff"}}>
    <PageHeader tickerSrc={ticker} tickerAlt="DARTS PÉTANQUE" tickerHeight={68} left={<BackDot onClick={() => go?.("closest_center_config")} color={ACCENT}/>} />

    <section style={{margin:"8px 10px 0",border:"1px solid rgba(255,255,255,.10)",background:"linear-gradient(180deg,rgba(16,25,35,.98),rgba(7,12,19,.98))",borderRadius:15,padding:8,display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"stretch"}}>
      {(["A","B"] as const).map((team,idx)=>{
        const teamPlayers=players.filter((p:any)=>String(p.teamId)===team);
        const score=Number(projectedTeamTotals?.[team]||0);
        return <React.Fragment key={team}>
          {idx===1?<div style={{display:"grid",placeItems:"center",padding:"0 4px"}}><div style={{fontSize:9,color:"#71818f",fontWeight:1000}}>MÈNE {round}</div><div style={{fontSize:10,color:ACCENT,fontWeight:1000,whiteSpace:"nowrap"}}>{pointsMode==="petanque"?`OBJECTIF ${Number(cfg.targetScore||13)}`:pointsMode==="descending"?"TOP 5":"PLUS PROCHE"}</div>{pointsMode==="petanque"?<div style={{fontSize:8,marginTop:2,color:livePointTeam?(livePointTeam==="A"?"#ff8f9c":"#83c8ff"):"#7d8d99",fontWeight:1000}}>{livePointTeam?`POINT ÉQUIPE ${livePointTeam}`:`DÉPART ${roundStarterTeam}`}</div>:null}</div>:null}
          <div style={{gridColumn:idx===0?1:3,padding:"7px 9px",borderRadius:12,border:`1px solid ${team==="A"?"rgba(255,77,95,.28)":"rgba(61,165,255,.28)"}`,background:team==="A"?"rgba(255,77,95,.07)":"rgba(61,165,255,.07)",display:"grid",gridTemplateColumns:idx===0?"1fr auto":"auto 1fr",gap:8,alignItems:"center"}}>
            {idx===1?<b style={{fontSize:24,lineHeight:1,color:"#fff"}}>{score}</b>:null}
            <div style={{minWidth:0,textAlign:idx===0?"left":"right"}}>
              <div style={{fontSize:9,fontWeight:1000,color:team==="A"?"#ff8f9c":"#83c8ff",letterSpacing:1}}>ÉQUIPE {team}</div>
              <div style={{fontSize:11,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{teamPlayers.map((p:any)=>`${p.name} ${Number(projectedScores?.[p.id]||0)}`).join(" · ") || "—"}</div>
              <div style={{fontSize:9,color:"#738493",marginTop:2}}>
                {pointsMode==="petanque"
                  ? (isManual && manualEntryMode==="quick"
                    ? `${dartsPerTeam} max/équipe · ${dartsPerPlayer}/joueur`
                    : `${Number(teamDartsRemaining[team]||0)} en main · ${teamPlayers.map((p:any)=>`${p.name} ${Math.max(0,dartsPerPlayer-Number(activeRoundUsed[String(p.id)]||0))}`).join(" · ")}`)
                  : `${dartsPerPlayer} fléchette${dartsPerPlayer>1?"s":""}/joueur`}
              </div>
            </div>
            {idx===0?<b style={{fontSize:24,lineHeight:1,color:"#fff"}}>{score}</b>:null}
          </div>
        </React.Fragment>;
      })}
    </section>

    <div style={{flex:1,minHeight:0,overflow:narrow||isManual?"auto":"hidden",display:"grid",gridTemplateColumns:isManual?"1fr":narrow?"1fr":"minmax(0,1.45fr) minmax(320px,.75fr)",gridTemplateRows:isManual?"auto":narrow?"minmax(260px,42vh) auto":"1fr",gap:10,padding:10,maxWidth:isManual?980:undefined,width:"100%",margin:isManual?"0 auto":undefined}}>
      {!isManual ? <div style={{position:"relative",minHeight:narrow?260:0,borderRadius:18,overflow:"hidden",border:"1px solid rgba(68,231,255,.3)",background:"#000"}}>
        <><video ref={videoRef} muted playsInline style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
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
        {!ready ? <div style={overlay}>{camError || "Initialisation caméra…"}</div> : null}</>
      </div> : null}

      <div style={{minHeight:0,overflow:isManual?"visible":"auto",display:"grid",gap:10,alignContent:"start"}}>
        {!isManual ? <section style={{...card,padding:8}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>{[["enroll","1","ENRÔLER"],["baseline","2","RÉFÉRENCE"],["play","3","JOUER"],["roundEnd","4","CLASSER"]].map(([key,num,label]) => { const order:any={enroll:0,baseline:1,play:2,review:2,roundEnd:3,finished:4}; const mine:any={enroll:0,baseline:1,play:2,roundEnd:3}; const active=order[phase]>=mine[key]; return <div key={key} style={{minWidth:0,padding:"6px 4px",borderRadius:9,border:`1px solid ${active?ACCENT:"rgba(255,255,255,.08)"}`,background:active?`${ACCENT}10`:"rgba(255,255,255,.02)",textAlign:"center"}}><b style={{display:"block",fontSize:10,color:active?ACCENT:"#607080"}}>{num}</b><span style={{fontSize:7,fontWeight:1000,color:active?"#eafcff":"#71808d",letterSpacing:.4}}>{label}</span></div>; })}</div>
        </section> : null}

        {!isManual && current && phase !== "roundEnd" && phase !== "finished" ? <section style={{...card,borderColor:`${playerColor(players,current.id)}66`,background:`linear-gradient(135deg,${playerColor(players,current.id)}12,rgba(255,255,255,.025))`}}>
          <div style={{display:"grid",gridTemplateColumns:"48px 1fr auto",gap:10,alignItems:"center"}}>
            <div style={{width:48,height:48,borderRadius:"50%",overflow:"hidden",border:`2px solid ${playerColor(players,current.id)}`,display:"grid",placeItems:"center",background:"#0b151d",fontWeight:1000,fontSize:18}}>{current.avatar?<img src={current.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:String(current.name||"?").slice(0,1).toUpperCase()}</div>
            <div><div style={{fontSize:9,color:"#8496a5",fontWeight:1000,letterSpacing:1}}>JOUEUR ACTIF</div><b style={{fontSize:17}}>{current.name}</b>{current.teamId?<div style={{fontSize:10,color:playerColor(players,current.id)}}>Équipe {current.teamId}</div>:null}</div>
            <div style={{display:"flex",gap:5}}>{Array.from({length:dartsPerPlayer},(_,n)=>n).map((n) => { const done = phase!=="enroll" && roundValidatedImpacts.filter((x:any)=>String(x.expectedPlayerId)===String(current.id)).length>n; return <span key={n} style={{width:15,height:15,borderRadius:"50%",border:`1px solid ${done?playerColor(players,current.id):"#53616c"}`,background:done?playerColor(players,current.id):"transparent",boxShadow:done?`0 0 10px ${playerColor(players,current.id)}`:"none"}}/>; })}</div>
          </div>
        </section> : null}

        {pointsMode==="petanque" && phase==="play" && petanqueTeamToPlay && (!isManual || (manualEntryMode==="guided" && manualStage==="throws")) ? <section style={{...card,padding:10,borderColor:petanqueTeamToPlay==="A"?"rgba(255,77,95,.32)":"rgba(61,165,255,.32)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:7}}>
            <div><b style={{fontSize:11,color:petanqueTeamToPlay==="A"?"#ff8f9c":"#83c8ff"}}>ÉQUIPE {petanqueTeamToPlay} À JOUER</b><div style={{fontSize:9,color:"#8193a1",marginTop:2}}>{livePointTeam?`Le point est à l’équipe ${livePointTeam}`:"Début de mène"} · {Number(teamDartsRemaining[petanqueTeamToPlay]||0)} fléchette(s) en main</div></div>
            {((isManual ? manualRoundThrows.length===0 : roundValidatedImpacts.length===0) && (isManual || !turnArmed)) ? <div style={{display:"flex",gap:5}}>
              <button onClick={()=>setRoundStarterTeam("A")} style={{...miniBtn,borderColor:roundStarterTeam==="A"?"#ff8f9c":"rgba(255,255,255,.12)",color:roundStarterTeam==="A"?"#ffb6be":"#93a2ae"}}>A COMMENCE</button>
              <button onClick={()=>setRoundStarterTeam("B")} style={{...miniBtn,borderColor:roundStarterTeam==="B"?"#83c8ff":"rgba(255,255,255,.12)",color:roundStarterTeam==="B"?"#b9ddff":"#93a2ae"}}>B COMMENCE</button>
            </div> : null}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>
            {players.map((p:any,i:number)=>{
              if(String(p.teamId||"A")!==petanqueTeamToPlay) return null;
              const used=Number(activeRoundUsed[String(p.id)]||0);
              const remaining=Math.max(0,dartsPerPlayer-used);
              const active=i===playerIndex;
              return <button key={p.id} disabled={remaining<=0 || (!isManual && turnArmed)} onClick={()=>setPlayerIndex(i)} style={{minHeight:42,padding:"7px 8px",borderRadius:11,border:`1px solid ${active?playerColor(players,p.id):"rgba(255,255,255,.10)"}`,background:active?`${playerColor(players,p.id)}18`:"rgba(255,255,255,.025)",color:remaining>0?"#fff":"#65727d",fontWeight:900,textAlign:"left",opacity:remaining>0?1:.48}}>
                <span style={{display:"block",fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</span>
                <span style={{display:"block",fontSize:9,marginTop:2,color:active?playerColor(players,p.id):"#8fa0ad"}}>{remaining} en main</span>
              </button>;
            })}
          </div>
        </section> : null}

        {!isManual ? <section style={card}>
          <div style={{fontSize:11,color:ACCENT,fontWeight:1000,letterSpacing:1.1}}>IA VISION · {phaseLabel(phase)}</div>
          <div style={{fontSize:14,fontWeight:900,marginTop:6}}>{status}</div>
          {!isManual && stability ? <div style={{marginTop:8,fontSize:11,color:stability.stable?"#8fffc2":"#ffbd93"}}>Stabilité caméra : {Math.round(stability.confidence*100)} % · variation globale {Math.round(stability.changedFraction*100)} %</div> : null}
          {!isManual && precisionReadiness ? <div style={{marginTop:6,fontSize:11,color:precisionReadiness.ok?"#8fffc2":"#ffbd93"}}>Précision image : {Math.round(precisionReadiness.confidence*100)} % · {precisionReadiness.mmPerPixel.toFixed(2)} mm/pixel · netteté {Math.round(precisionReadiness.sharpness*100)} % · niveau {precisionTier(precisionReadiness).toUpperCase()} · profil {cameraPrefs.profile.toUpperCase()}</div> : null}
          {!isManual && registrationInfo ? <div style={{marginTop:6,fontSize:11,color:(registrationInfo.confidence||0)>=.65?"#8fffc2":"#ffbd93"}}>Recalage multi-frame : {Math.round((registrationInfo.confidence||0)*100)} %{registrationInfo.maxShiftPx!=null?` · translation ${registrationInfo.maxShiftPx.toFixed(1)} px`:""}{registrationInfo.geometrySpreadPx!=null?` · dérive géométrique ${registrationInfo.geometrySpreadPx.toFixed(2)} px`:""}</div> : null}
          {!isManual && phase === "play" ? <div style={{marginTop:6,fontSize:11,color:turnArmed?"#8fffc2":"#ffbd93"}}>{pointsMode==="petanque"?"Pré-contrôle lancer":"Pré-contrôle volée"} : {turnArmed?`ARMÉ · ${String(preflightInfo?.tier||"").toUpperCase()} · référence verrouillée`:"REQUIS avant de lancer"}</div> : null}
          {!isManual && !cal ? <div style={{marginTop:8,color:"#ffb4a9",fontSize:12}}>Calibration de cible non trouvée : le jeu refuse une mesure approximative.</div> : null}
        </section> : null}

        {!isManual ? <section style={{...card,padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
            <h3 style={{...h3,margin:0}}>DIAGNOSTIC CAMÉRA · SESSION</h3>
            <span style={{fontSize:10,color:diagnosticSummary.rejected?"#ff9f8f":"#8fffc2",fontWeight:900}}>{diagnosticSummary.accepted} volée(s) validée(s) · {diagnosticSummary.rejected} refus · {diagnosticSummary.rereads} relecture(s)</span>
          </div>
          {sessionDiagnostics.length ? <div style={{display:"grid",gridTemplateColumns:"72px 1fr 1fr",gap:8,marginTop:8,padding:"8px 9px",borderRadius:11,background:"rgba(255,255,255,.035)",fontSize:10,alignItems:"center"}}><div style={{display:"grid",placeItems:"center",width:54,height:54,borderRadius:"50%",border:`2px solid ${cameraQuality.grade==="A"?"#8fffc2":cameraQuality.grade==="B"?ACCENT:cameraQuality.grade==="C"?"#ffd58c":"#ff9f8f"}`,fontSize:17,fontWeight:1000}}>{cameraQuality.grade}</div><div><b style={{display:"block",color:"#fff"}}>QUALITÉ {cameraQuality.score}/100</b><span style={{color:"#94a5b3"}}>incertitude moy. {cameraQuality.avgUncertaintyMm!=null?`${cameraQuality.avgUncertaintyMm.toFixed(2)} mm`:"—"}</span></div><div style={{textAlign:"right",color:"#94a5b3"}}>{cameraQuality.manualOwners} attribution(s) manuelle(s)<br/>{cameraQuality.rejectionReasons[0]?`cause refus #1 : ${cameraQuality.rejectionReasons[0].code} ×${cameraQuality.rejectionReasons[0].count}`:"aucun refus dominant"}</div></div> : null}
          {sessionDiagnostics.slice(-4).reverse().map((d:any)=><div key={d.id} style={{display:"grid",gridTemplateColumns:"72px 1fr",gap:8,paddingTop:6,marginTop:6,borderTop:"1px solid rgba(255,255,255,.06)",fontSize:10}}><b style={{color:d.level==="reject"?"#ff9f8f":d.level==="warn"?"#ffd58c":"#8fffc2"}}>{String(d.stage).toUpperCase()}</b><span style={{color:"#b9c7d4"}}>{d.message}</span></div>)}
          {!sessionDiagnostics.length ? <div style={{fontSize:10,color:"#788896",marginTop:6}}>Les contrôles de cette partie apparaîtront ici.</div> : null}
        </section> : null}

        {!isManual && phase === "enroll" ? <section style={card}>
          <h3 style={h3}>ENRÔLEMENT · {current?.name}</h3>
          <div style={{fontSize:12,color:"#b9c7d4",lineHeight:1.5}}>Présente les 3 fléchettes ensemble dans le cadre. Fais 3 scans légèrement différents. Les sets trop similaires sont signalés.</div>
          <div style={{display:"flex",gap:8,marginTop:10}}><button style={btn} onClick={scanSample}>📷 SCANNER ({samples[current?.id]?.length || 0}/3)</button><button style={btn} onClick={validatePlayerEnrollment}>VALIDER →</button></div>
        </section> : null}

        {!isManual && phase === "baseline" ? <section style={card}>
          <h3 style={h3}>CIBLE VIDE</h3>
          <div style={{fontSize:12,color:"#b9c7d4"}}>Téléphone fixe, cible entière visible, aucune fléchette plantée.</div>
          <button style={{...btn,width:"100%",marginTop:10}} onClick={captureBaseline}>📷 CAPTURER LA RÉFÉRENCE</button>
        </section> : null}

        {isManual && phase === "play" ? <section style={{...card,borderColor:"rgba(143,255,194,.35)",padding:10}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:8}}>
            <h3 style={{...h3,color:"#8fffc2",margin:0}}>{pointsMode==="petanque"?(manualEntryMode==="quick"?`MÈNE ${round} · SAISIE RAPIDE`:manualStage==="throws"?`MÈNE ${round} · JOUER`:`MÈNE ${round} · POINTS À SAISIR`):`MANCHE ${round}/${cfg.rounds} · FLÉCHETTES QUI SCORENT`}</h3>
            <span style={{fontSize:9,color:"#78909f",fontWeight:900}}>{String(cfg.formatMode||"duo").toUpperCase()} · {dartsPerPlayer} fl./joueur</span>
          </div>
          <div style={{marginBottom:9,padding:"7px 9px",borderRadius:9,background:"rgba(68,231,255,.055)",border:"1px solid rgba(68,231,255,.12)",fontSize:10,color:"#b9cbd7",fontWeight:800}}>{status}</div>

          {pointsMode==="petanque" ? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:9}}>
            <button onClick={()=>{setManualEntryMode("quick");setManualThrows(v=>v.filter((x:any)=>Number(x.round)!==Number(round)));setManualStage("score");setManualWinningTeam(null);setManualRanking(Array.from({length:8},()=>null));setStatus("Saisie rapide : choisis l’équipe qui marque puis ajoute uniquement les fléchettes marquantes.");}} style={{...miniBtn,minHeight:36,borderColor:manualEntryMode==="quick"?"#8fffc2":"rgba(255,255,255,.14)",color:manualEntryMode==="quick"?"#dfffee":"#aab8c4",background:manualEntryMode==="quick"?"rgba(57,217,138,.10)":"rgba(255,255,255,.025)"}}>⚡ SAISIE RAPIDE</button>
            <button onClick={()=>{setManualEntryMode("guided");setManualStage("throws");setManualWinningTeam(null);setManualRanking(Array.from({length:8},()=>null));setStatus("Suivi de mène : enregistre chaque lancer avec PREND LE POINT / NE PREND PAS LE POINT.");}} style={{...miniBtn,minHeight:36,borderColor:manualEntryMode==="guided"?ACCENT:"rgba(255,255,255,.14)",color:manualEntryMode==="guided"?"#eafcff":"#aab8c4",background:manualEntryMode==="guided"?`${ACCENT}12`:"rgba(255,255,255,.025)"}}>🎯 SUIVI DE MÈNE</button>
          </div> : null}

          {pointsMode==="petanque" && manualEntryMode==="quick" ? <>
            <div style={{fontSize:11,color:"#aebdca",lineHeight:1.45,marginBottom:9}}>À la fin de la mène, saisis uniquement <b>l’équipe qui marque</b> et les <b>fléchettes réellement marquantes</b>. Aucun autre lancer n’est à renseigner.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:9}}>{(["A","B"] as const).map(team=><button key={team} onClick={()=>{setManualWinningTeam(team);setManualRanking(Array.from({length:8},()=>null));setManualStage("score");setStatus(`Équipe ${team} marque. Ajoute uniquement ses fléchettes marquantes.`);}} style={{...btn,minHeight:42,borderColor:manualWinningTeam===team?(team==="A"?"#ff8f9c":"#83c8ff"):"rgba(255,255,255,.14)",background:manualWinningTeam===team?(team==="A"?"rgba(255,77,95,.12)":"rgba(61,165,255,.12)"):"rgba(255,255,255,.025)"}}>ÉQUIPE {team} MARQUE</button>)}</div>
            {manualWinningTeam ? <div>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:7}}><b style={{fontSize:11,color:"#fff"}}>FLÉCHETTES QUI MARQUENT</b><span style={{fontSize:11,color:"#8fffc2",fontWeight:1000}}>{manualRanking.filter(Boolean).length} point{manualRanking.filter(Boolean).length>1?"s":""}</span></div>
              <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.max(1,Math.min(4,players.filter((p:any)=>String(p.teamId)===manualWinningTeam).length))},minmax(0,1fr))`,gap:7}}>
                {players.filter((p:any)=>String(p.teamId)===manualWinningTeam).map((p:any)=>{
                  const used=manualRanking.filter(id=>String(id||"")===String(p.id)).length;
                  const full=used>=dartsPerPlayer || manualRanking.filter(Boolean).length>=dartsPerTeam;
                  return <button key={p.id} disabled={full} onClick={()=>{const slot=manualRanking.findIndex(x=>!x);if(slot>=0) chooseManualRankOwner(slot,String(p.id));}} style={{...miniBtn,minHeight:52,borderColor:used?playerColor(players,p.id):"rgba(255,255,255,.14)",background:used?`${playerColor(players,p.id)}1d`:"rgba(255,255,255,.035)",color:"#fff",opacity:full ? .45 : 1}}>
                    <span style={{display:"block",fontSize:12}}>{p.name}</span><span style={{display:"block",fontSize:9,marginTop:3,color:"#91a3b1"}}>{used}/{dartsPerPlayer} marquante{used>1?"s":""} · +{used} pt{used>1?"s":""}</span>
                  </button>;
                })}
              </div>
              {manualRanking.filter(Boolean).length ? <div style={{marginTop:8,display:"flex",gap:5,flexWrap:"wrap"}}>{manualRanking.filter(Boolean).map((id:any,i:number)=>{const p=players.find((x:any)=>String(x.id)===String(id));return <button key={`${id}-${i}`} onClick={()=>{setManualRanking(prev=>{const next=[...prev];next.splice(i,1);next.push(null);return next;});}} style={{...miniBtn,minHeight:28,borderColor:"rgba(143,255,194,.28)",color:"#dfffee"}}>+1 {p?.name} ×</button>;})}</div>:null}
            </div> : null}
          </> : pointsMode==="petanque" ? (manualStage==="throws" ? <>
            <div style={{fontSize:11,color:"#aebdca",lineHeight:1.45,marginBottom:9}}>
              Joue <b>une fléchette à la fois</b>. Après chaque lancer, indique seulement si elle prend le point. Aucun millimètre ni classement complet à saisir.
            </div>
            <div style={{padding:9,borderRadius:11,border:`1px solid ${petanqueTeamToPlay==="A"?"rgba(255,77,95,.30)":"rgba(61,165,255,.30)"}`,background:"rgba(255,255,255,.025)"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                <div>
                  <b style={{fontSize:12,color:petanqueTeamToPlay==="A"?"#ff9aa6":"#8ecfff"}}>ÉQUIPE {petanqueTeamToPlay || roundStarterTeam} À JOUER</b>
                  <div style={{fontSize:10,color:"#8495a3",marginTop:2}}>{livePointTeam?`Point actuel : équipe ${livePointTeam}`:"Premier lancer : il prendra automatiquement le point."}</div>
                </div>
                <span style={{fontSize:10,color:"#8fffc2",fontWeight:1000}}>{manualRoundThrows.length}/{players.length*dartsPerPlayer} jouée(s)</span>
              </div>
              {current ? <div style={{marginTop:9,padding:"8px 9px",borderRadius:10,background:`${playerColor(players,current.id)}12`,border:`1px solid ${playerColor(players,current.id)}55`,display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
                <div><span style={{display:"block",fontSize:9,color:"#8798a5",fontWeight:1000}}>JOUEUR SÉLECTIONNÉ</span><b>{current.name}</b></div>
                <b style={{fontSize:11,color:playerColor(players,current.id)}}>{currentDartsRemaining} en main</b>
              </div> : null}
              <div style={{display:"grid",gridTemplateColumns:manualRoundThrows.length===0?"1fr":"1fr 1fr",gap:7,marginTop:9}}>
                {manualRoundThrows.length===0 ? <button onClick={()=>recordManualPetanqueThrow(true)} style={{...btn,minHeight:44,borderColor:"#8fffc2",background:"rgba(57,217,138,.14)"}}>🎯 ENREGISTRER LE PREMIER LANCER</button> : <>
                  <button onClick={()=>recordManualPetanqueThrow(true)} style={{...btn,minHeight:44,borderColor:"#8fffc2",background:"rgba(57,217,138,.14)"}}>🎯 PREND LE POINT</button>
                  <button onClick={()=>recordManualPetanqueThrow(false)} style={{...btn,minHeight:44,borderColor:"#ffbd75",background:"rgba(255,189,117,.08)"}}>↔ NE PREND PAS LE POINT</button>
                </>}
              </div>
            </div>
            {manualRoundThrows.length ? <>
              <div style={{marginTop:8,fontSize:9,color:"#748694"}}>Derniers lancers : {manualRoundThrows.slice(-6).map((x:any)=>`${players.find((p:any)=>String(p.id)===String(x.playerId))?.name||"?"}${x.tookPoint?" ✓":" ·"}`).join("  /  ")}</div>
              <button onClick={undoLastManualPetanqueThrow} style={{...miniBtn,width:"100%",marginTop:7,minHeight:32,borderColor:"rgba(255,189,117,.22)",color:"#ffd2a5"}}>↩ ANNULER LE DERNIER LANCER</button>
            </> : null}
          </> : <>
            <div style={{fontSize:11,color:"#aebdca",lineHeight:1.45,marginBottom:9}}>
              Mène terminée. Le point est à <b>l’équipe {manualWinningTeam}</b>. Indique uniquement les fléchettes de cette équipe qui sont plus proches que la meilleure adverse.
            </div>
            {manualRoundThrows.length ? <button onClick={undoLastManualPetanqueThrow} style={{...miniBtn,width:"100%",marginBottom:8,minHeight:32,borderColor:"rgba(255,189,117,.22)",color:"#ffd2a5"}}>↩ CORRIGER LE DERNIER LANCER</button> : null}
            {manualWinningTeam ? <div>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:7}}>
                <b style={{fontSize:11,color:"#fff"}}>FLÉCHETTES QUI MARQUENT</b>
                <span style={{fontSize:11,color:"#8fffc2",fontWeight:1000}}>{manualRanking.filter(Boolean).length} point{manualRanking.filter(Boolean).length>1?"s":""}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.max(1,Math.min(4,players.filter((p:any)=>String(p.teamId)===manualWinningTeam).length))},minmax(0,1fr))`,gap:7}}>
                {players.filter((p:any)=>String(p.teamId)===manualWinningTeam).map((p:any)=>{
                  const used=manualRanking.filter(id=>String(id||"")===String(p.id)).length;
                  const thrown=manualRoundThrows.filter((x:any)=>String(x.playerId)===String(p.id)).length;
                  const full=used>=thrown || manualRanking.filter(Boolean).length>=dartsPerTeam;
                  return <button key={p.id} disabled={full} onClick={()=>{
                    const slot=manualRanking.findIndex(x=>!x);
                    if(slot>=0) chooseManualRankOwner(slot,String(p.id));
                  }} style={{...miniBtn,minHeight:52,borderColor:used?playerColor(players,p.id):"rgba(255,255,255,.14)",background:used?`${playerColor(players,p.id)}1d`:"rgba(255,255,255,.035)",color:"#fff",opacity:full ? .45 : 1}}>
                    <span style={{display:"block",fontSize:12}}>{p.name}</span>
                    <span style={{display:"block",fontSize:9,marginTop:3,color:"#91a3b1"}}>{used}/{thrown} marquante{used>1?"s":""} · +{used} pt{used>1?"s":""}</span>
                  </button>;
                })}
              </div>
              {manualRanking.filter(Boolean).length ? <div style={{marginTop:8,display:"flex",gap:5,flexWrap:"wrap"}}>{manualRanking.filter(Boolean).map((id:any,i:number)=>{
                const p=players.find((x:any)=>String(x.id)===String(id));
                return <button key={`${id}-${i}`} onClick={()=>{
                  setManualRanking(prev=>{const next=[...prev];next.splice(i,1);next.push(null);return next;});
                }} style={{...miniBtn,minHeight:28,borderColor:"rgba(143,255,194,.28)",color:"#dfffee"}}>+1 {p?.name} ×</button>;
              })}</div>:null}
            </div> : null}
          </>) : pointsMode==="winner" ? <>
            <div style={{fontSize:11,color:"#aebdca",lineHeight:1.45}}>Choisis uniquement le propriétaire de la fléchette la plus proche. Elle vaut 1 point.</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:9}}>{players.map((p:any)=>{
              const selected=String(manualRanking[0]||"")===String(p.id);
              return <button key={p.id} onClick={()=>chooseManualRankOwner(0,String(p.id))} style={{...miniBtn,minHeight:38,borderColor:selected?playerColor(players,p.id):"rgba(255,255,255,.14)",background:selected?`${playerColor(players,p.id)}24`:"rgba(255,255,255,.035)",color:"#fff"}}>{selected?"✓ ":""}{p.name}</button>;
            })}</div>
          </> : <>
            <div style={{fontSize:11,color:"#aebdca",lineHeight:1.45}}>Variante Top 5 : saisis uniquement les cinq fléchettes qui marquent, de la plus proche à la cinquième. Pas besoin de saisir les autres.</div>
            <div style={{display:"grid",gap:6,marginTop:9}}>{[0,1,2,3,4].slice(0,Math.min(5,players.length*dartsPerPlayer)).map(i=>{
              const selectedId=manualRanking[i]; const pts=Math.max(0,5-i);
              return <div key={i} style={{display:"grid",gridTemplateColumns:"64px 1fr",gap:6,alignItems:"center"}}>
                <b style={{fontSize:10,color:i===0?"#ffd85a":"#9eb0bd"}}>#{i+1} · +{pts}</b>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{players.map((p:any)=>{
                  const selected=String(selectedId||"")===String(p.id);
                  const used=manualRanking.filter(id=>String(id||"")===String(p.id)).length;
                  const full=!selected&&used>=dartsPerPlayer;
                  return <button key={p.id} disabled={full} onClick={()=>chooseManualRankOwner(i,String(p.id))} style={{...miniBtn,minHeight:31,borderColor:selected?playerColor(players,p.id):"rgba(255,255,255,.12)",background:selected?`${playerColor(players,p.id)}22`:"rgba(255,255,255,.025)",color:"#fff",opacity:full ? .35 : 1}}>{selected?"✓ ":""}{p.name}</button>;
                })}</div>
              </div>;
            })}</div>
          </>}

          {(pointsMode!=="petanque" || manualEntryMode==="quick" || manualStage==="score") ? <button disabled={pointsMode==="petanque"?!manualWinningTeam||!manualRanking.some(Boolean):!manualRanking[0]} style={{...btn,width:"100%",marginTop:11,borderColor:"#8fffc2",background:"rgba(57,217,138,.14)",opacity:(pointsMode==="petanque" ? (!manualWinningTeam || !manualRanking.some(Boolean)) : !manualRanking[0]) ? .45 : 1}} onClick={submitManualTurn}>
            ✓ {pointsMode==="petanque"?"VALIDER LES POINTS DE LA MÈNE":"VALIDER LES FLÉCHETTES QUI SCORENT"}
          </button> : null}
        </section> : null}

        {!isManual && phase === "play" ? <section style={card}>
          <h3 style={h3}>MANCHE {round}/{cfg.rounds} · {current?.name}</h3>
          <div style={{fontSize:12,color:"#b9c7d4",lineHeight:1.5}}>{turnArmed?`Référence pré-volée verrouillée. Lance maintenant exactement ${expectedTurnDarts} fléchette${expectedTurnDarts>1?"s":""}, ne touche ni à la cible ni au téléphone, puis analyse.`:"Avant de lancer, l’IA vérifie la perspective, la stabilité et la netteté puis capture une référence fraîche. Cette étape évite qu’un micro-déplacement entre deux joueurs fausse les millimètres."}</div>
          {!turnArmed ? <button style={{...btn,width:"100%",marginTop:10,borderColor:"#8fffc2",background:"rgba(57,217,138,.12)"}} onClick={runPreflightCheck}>🛡️ {pointsMode==="petanque"?"CONTRÔLE AVANT LANCER":"CONTRÔLE AVANT VOLÉE"}</button> : <button style={{...btn,width:"100%",marginTop:10}} onClick={analyze}>🧠 {expectedTurnDarts===1?"ANALYSER LA FLÉCHETTE":`ANALYSER LES ${expectedTurnDarts} FLÉCHETTES`}</button>}
        </section> : null}

        {!isManual && phase === "review" ? <section style={card}>
          <h3 style={h3}>CONTRÔLE IA · {current?.name}</h3>
          <div style={{fontSize:11,color:"#aab9c6",lineHeight:1.5,marginBottom:8}}>Aucun point n’est encore enregistré. Vérifie les propriétaires et la précision. Une seconde lecture indépendante devient obligatoire dès qu’une pointe dépasse le seuil d’incertitude. {cameraPrefs.strictDartIdentification?"L’identification stricte bloque aussi toute attribution ambiguë tant qu’elle n’est pas confirmée.":""}</div>
          {pendingImpacts.map((impact:any, i:number) => {
            const p = players.find((x:any) => String(x.id) === String(impact.playerId));
            return <div key={impact.id} style={{padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{display:"grid",gridTemplateColumns:"28px 1fr auto",gap:8,alignItems:"center"}}><b>#{i+1}</b><div><b>{p?.name || "Joueur ?"}</b><div style={{fontSize:10,color:impact.needsReview||impact.precisionTieRisk?"#ffbd65":"#9fb0bf"}}>identité attendue {Math.round(impact.identityConfidence*100)} % · mesure {Math.round(impact.confidence*100)} % · frames {Math.round((impact.frameAgreement||1)*100)} %{impact.rereadAgreement!=null?` · relecture ${Math.round(impact.rereadAgreement*100)} %`:""}{impact.precisionTieRisk?" · ⚠ départage serré":""}{impact.identityMismatch?" · ⚠ signature différente du joueur attendu":""}</div>{impact.identityMismatch?<div style={{fontSize:10,color:"#ff8b98",marginTop:3}}>L’IA pense reconnaître une autre fléchette. Vérifie le joueur avant validation.</div>:null}</div><b style={{color:ACCENT}}>{impact.distanceMm.toFixed(1)} ± {impact.uncertaintyMm.toFixed(1)} mm</b></div>
              {impact.needsReview ? <button onClick={() => cyclePendingOwner(impact.id)} style={{...miniBtn,marginTop:6}}>⚠️ CORRIGER LE JOUEUR →</button> : null}
            </div>;
          })}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}><button style={btn} onClick={precisionReread}>🔬 RELECTURE PRÉCISION{precisionRereads ? ` (${precisionRereads})` : ""}</button><button style={btn} onClick={reanalyze}>↻ RÉANALYSER</button><button style={{...btn,background:`${ACCENT}2b`}} onClick={confirmAnalysis}>✓ VALIDER L’ANALYSE</button></div>
        </section> : null}

        {(phase === "roundEnd" || phase === "finished") ? <section style={card}>
          <h3 style={h3}>{phase === "finished" ? (cfg.teamMode && pointsMode==="petanque" ? "RÉSULTAT FINAL" : "CLASSEMENT FINAL") : pointsMode==="petanque" ? "POINTS DE LA MÈNE" : "CLASSEMENT DE LA MANCHE"}</h3>
          {phase==="finished" && cfg.teamMode && pointsMode==="petanque" ? <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center",padding:"12px 10px",marginBottom:9,borderRadius:13,border:`1px solid ${ACCENT}44`,background:"linear-gradient(135deg,rgba(255,77,95,.08),rgba(61,165,255,.08))"}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#ff9aa5",fontWeight:1000}}>ÉQUIPE A</div><div style={{fontSize:30,fontWeight:1000,lineHeight:1}}>{Number(teamTotals.A||0)}</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#7f909d"}}>FINAL</div><div style={{fontSize:12,color:"#ffd85a",fontWeight:1000,marginTop:3}}>{winningTeamId?`🏆 ÉQUIPE ${winningTeamId}`:"—"}</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#8bcfff",fontWeight:1000}}>ÉQUIPE B</div><div style={{fontSize:30,fontWeight:1000,lineHeight:1}}>{Number(teamTotals.B||0)}</div></div>
          </div> : null}
          {phase==="finished" && cfg.teamMode && pointsMode==="petanque" ? <div style={{fontSize:10,color:"#8ea0ad",fontWeight:900,letterSpacing:.7,margin:"2px 0 5px"}}>CONTRIBUTIONS JOUEURS</div> : null}
          {!isManual && phase === "roundEnd" && hasPrecisionTieRisk ? <div style={{padding:9,borderRadius:10,border:"1px solid #ffbd4555",background:"#ffbd4510",color:"#ffd796",fontSize:11,marginBottom:6}}>⚠️ Au moins deux impacts sont plus proches que la marge d’incertitude estimée. Un contrôle caméra rapproché est conseillé avant validation.</div> : null}
          {(phase === "finished" ? finalPlayerRanking.map((s:any)=>({playerId:s.playerId,points:s.points,distanceMm:null,playerStat:s})) : ranked).map((r:any,i:number) => {
            const p = players.find((x:any) => String(x.id) === String(r.playerId));
            const teamFinal = phase==="finished" && cfg.teamMode && pointsMode==="petanque";
            return <div key={`${r.playerId}-${i}-${r.id||"final"}`} style={{display:"grid",gridTemplateColumns:"32px 1fr auto",gap:8,alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}><b>{teamFinal?"•":`#${i+1}`}</b><div><b>{p?.name}</b>{p?.teamId ? <span style={{color:ACCENT,fontSize:11}}> · Team {p.teamId}</span> : null}{phase==="finished"&&r.playerStat?<div style={{fontSize:10,color:"#9fb0bf",marginTop:2}}>{isManual?`${r.playerStat.rankedDarts||0} fléchette(s) marquante(s) · ${r.playerStat.roundWins} mène(s) avec point le plus proche`:`meilleure ${r.playerStat.bestMm!=null?`${r.playerStat.bestMm.toFixed(1)} mm`:"—"} · moyenne ${r.playerStat.averageMm!=null?`${r.playerStat.averageMm.toFixed(1)} mm`:"—"} · ${r.playerStat.roundWins} mène(s) avec point le plus proche · ${r.playerStat.misses} MISS`}</div>:null}{r.distanceMm != null ? <div style={{fontSize:11,color:r.ambiguousWithPrevious?"#ffbd65":"#9fb0bf"}}>{isManual?`rang manuel #${r.rank || r.manualRank || i+1}`:`${r.distanceMm.toFixed(1)} mm ± ${Number(r.uncertaintyMm||0).toFixed(1)} mm · vision ${Math.round(r.confidence*100)} % · identité ${Math.round(r.identityConfidence*100)} %${r.ambiguousWithPrevious?` · départage ${Number(r.gapToPreviousMm||0).toFixed(2)} mm ≤ marge ${Number(r.ambiguityMarginMm||0).toFixed(2)} mm`:""}`}</div> : null}</div><b style={{color:ACCENT}}>{teamFinal?`${r.points||0} pts`:`+${r.points||0}`}</b></div>;
          })}
          {phase === "finished" ? <div style={{marginTop:10,padding:10,borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.035)"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><b style={{fontSize:11,color:"#ffd85a"}}>STATISTIQUES DARTS PÉTANQUE</b><b style={{fontSize:11}}>{cfg.teamMode?(winningTeamId?`ÉQUIPE ${winningTeamId} GAGNANTE`:""):(winner?`${winner.name} GAGNANT`:"")}</b></div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:8,fontSize:10,textAlign:"center"}}>{isManual?<><span>{petanqueStats.totalRankedDarts||petanqueStats.totalImpacts||0}<br/><i style={{color:"#8797a5"}}>{pointsMode==="petanque"?"fléchettes marquantes":"Top 5 classées"}</i></span><span>{winner?.roundWins||0}<br/><i style={{color:"#8797a5"}}>manches gagnées</i></span></>:<><span>{petanqueStats.bestDistanceMm!=null?petanqueStats.bestDistanceMm.toFixed(1):"—"}<br/><i style={{color:"#8797a5"}}>meilleur mm</i></span><span>{petanqueStats.averageDistanceMm!=null?petanqueStats.averageDistanceMm.toFixed(1):"—"}<br/><i style={{color:"#8797a5"}}>moyenne mm</i></span></>}<span>{petanqueStats.totalImpacts}<br/><i style={{color:"#8797a5"}}>{isManual?(pointsMode==="petanque"?"points saisis":"rangs saisis"):"impacts"}</i></span><span>{pointsMode==="petanque"?round:(cfg.rounds||round)}<br/><i style={{color:"#8797a5"}}>{pointsMode==="petanque"?"mènes":"manches"}</i></span></div></div> : null}
          {phase === "finished" && !isManual ? <div style={{marginTop:10,padding:10,borderRadius:12,border:"1px solid rgba(68,231,255,.2)",background:"rgba(68,231,255,.05)"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><b style={{fontSize:11,color:ACCENT}}>BILAN QUALITÉ CAMÉRA</b><b style={{fontSize:12}}>NOTE {cameraQuality.grade} · {cameraQuality.score}/100</b></div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:8,fontSize:10,textAlign:"center"}}><span>{cameraQuality.accepted}<br/><i style={{color:"#8797a5"}}>volées OK</i></span><span>{cameraQuality.rejected}<br/><i style={{color:"#8797a5"}}>refus</i></span><span>{cameraQuality.rereads}<br/><i style={{color:"#8797a5"}}>relectures</i></span><span>{cameraQuality.avgUncertaintyMm!=null?cameraQuality.avgUncertaintyMm.toFixed(2):"—"}<br/><i style={{color:"#8797a5"}}>mm moy.</i></span></div>{cameraQuality.rounds.length ? <div style={{marginTop:8,display:"grid",gap:4}}>{cameraQuality.rounds.map((q:any)=><div key={q.round} style={{display:"grid",gridTemplateColumns:"70px 1fr auto",gap:8,fontSize:10,color:"#aebdca"}}><b>M{q.round}</b><span>{q.accepted} OK · {q.rejected} refus · {q.rereads} relecture(s)</span><b>{q.qualityScore}/100</b></div>)}</div> : null}</div> : null}
          {isManual && phase === "roundEnd" ? <div style={{marginTop:10}}><button onClick={editManualRanking} style={{...miniBtn,width:"100%",minHeight:38,borderColor:"rgba(143,255,194,.35)",color:"#bfffd9"}}>{pointsMode==="petanque"?"✎ MODIFIER LES POINTS":"✎ MODIFIER LE CLASSEMENT"}</button></div> : null}
          {phase === "roundEnd" ? <button style={{...btn,width:"100%",marginTop:10,borderColor:hasPrecisionTieRisk&&!tieAcknowledged?"#ffbd45":ACCENT,background:hasPrecisionTieRisk&&tieAcknowledged?"#ffbd4522":`${ACCENT}18`}} onClick={commitRound}>{hasPrecisionTieRisk&&!tieAcknowledged?"⚠️ CONTRÔLER LE DÉPARTAGE":hasPrecisionTieRisk&&tieAcknowledged?"✓ CONFIRMER ET ENREGISTRER":pointsMode==="petanque"?"VALIDER LA MÈNE →":"VALIDER LA MANCHE →"}</button> : <button style={{...btn,width:"100%",marginTop:10}} onClick={() => go?.("closest_center_config")}>NOUVELLE PARTIE</button>}
        </section> : null}

      </div>
    </div>
  </div>;
}

const card:React.CSSProperties = { border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.035)", borderRadius:16, padding:12 };
const h3:React.CSSProperties = { margin:"0 0 8px", fontSize:13, color:ACCENT, letterSpacing:.8 };
const btn:React.CSSProperties = { minHeight:42, padding:"8px 12px", borderRadius:13, border:`1px solid ${ACCENT}`, background:`${ACCENT}18`, color:"#fff", fontWeight:1000 };
const miniBtn:React.CSSProperties = { minHeight:30, padding:"5px 8px", borderRadius:9, border:"1px solid #ffbd4566", background:"#ffbd4510", color:"#ffd58c", fontWeight:900, fontSize:10 };
const overlay:React.CSSProperties = { position:"absolute", inset:0, display:"grid", placeItems:"center", background:"rgba(0,0,0,.75)", fontWeight:900, padding:20, textAlign:"center" };
