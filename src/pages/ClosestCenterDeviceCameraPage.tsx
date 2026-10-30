// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import { fitCameraBoardHomography } from "../lib/cameraCalibrationStore";
import {
  fetchClosestCenterCompanionEvents,
  postClosestCenterCompanionEvent,
  updateClosestCenterCompanionStatus,
  closestCenterCompanionSourceId,
} from "../lib/closestCenterCompanionClient";

const ACCENT = "#44e7ff";
const GREEN = "#79ffb2";

type Point = {x:number;y:number};

function cameraFingerprint(stream:MediaStream|null, video:HTMLVideoElement|null){
  try{
    const track=stream?.getVideoTracks?.()[0];
    if(!track) return null;
    const st:any=track.getSettings?.()||{};
    const vw=Number(video?.videoWidth||st.width||0), vh=Number(video?.videoHeight||st.height||0);
    return {
      deviceId:String(st.deviceId||""), groupId:String(st.groupId||""), width:Number(st.width||vw||0), height:Number(st.height||vh||0),
      videoWidth:vw, videoHeight:vh, aspect:vh>0?vw/vh:0, zoom:Number(st.zoom||1), facingMode:String(st.facingMode||""), frameRate:Number(st.frameRate||0),
    };
  }catch{return null;}
}

async function waitFrame(video:HTMLVideoElement, delayMs:number){
  const rvfc=(video as any).requestVideoFrameCallback;
  if(typeof rvfc==="function"){
    await new Promise<void>(resolve=>{
      let done=false;
      const t=window.setTimeout(()=>{if(!done){done=true;resolve();}},Math.max(90,delayMs*2));
      rvfc.call(video,()=>{if(done)return;done=true;window.clearTimeout(t);resolve();});
    });
  } else await new Promise(resolve=>setTimeout(resolve,delayMs));
}

function captureDataUrl(video:HTMLVideoElement,maxSide:number,crop?:{x:number;y:number;w:number;h:number}|null){
  const sw=video.videoWidth, sh=video.videoHeight;
  if(!sw||!sh) throw new Error("Caméra pas prête.");
  const sx=crop?Math.max(0,Math.min(sw-1,crop.x*sw)):0, sy=crop?Math.max(0,Math.min(sh-1,crop.y*sh)):0;
  const srcW=crop?Math.max(1,Math.min(sw-sx,crop.w*sw)):sw, srcH=crop?Math.max(1,Math.min(sh-sy,crop.h*sh)):sh;
  const scale=Math.min(1,Math.max(960,maxSide)/Math.max(srcW,srcH));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(480,Math.round(srcW*scale));
  canvas.height=Math.max(480,Math.round(srcH*scale));
  const ctx=canvas.getContext("2d");
  if(!ctx) throw new Error("Canvas indisponible.");
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality="high";
  ctx.drawImage(video,sx,sy,srcW,srcH,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",.92);
}

export default function ClosestCenterDeviceCameraPage({go,params}:any){
  const sessionId=String(params?.sessionId||"").trim().toUpperCase();
  const sourceId=closestCenterCompanionSourceId(sessionId);
  const videoRef=React.useRef<HTMLVideoElement|null>(null);
  const streamRef=React.useRef<MediaStream|null>(null);
  const lastSeqRef=React.useRef(0);
  const busyRef=React.useRef(false);
  const processedRequestsRef=React.useRef(new Set<string>());
  const wakeLockRef=React.useRef<any>(null);
  const [ready,setReady]=React.useState(false);
  const [message,setMessage]=React.useState("Connexion à la caméra…");
  const [step,setStep]=React.useState(0);
  const [center,setCenter]=React.useState<Point|null>(null);
  const [anchors,setAnchors]=React.useState<Record<string,Point>>({});
  const [fitInfo,setFitInfo]=React.useState<any>(null);
  const [calibrated,setCalibrated]=React.useState(false);
  const [serving,setServing]=React.useState(false);

  React.useEffect(()=>{
    let dead=false;
    const openCamera=async()=>{
      try{
        const current=streamRef.current;
        const live=current?.getVideoTracks?.().some(t=>t.readyState==="live");
        if(live){
          if(videoRef.current && videoRef.current.srcObject!==current){videoRef.current.srcObject=current;await videoRef.current.play().catch(()=>{});}
          setReady(true); return;
        }
        try{current?.getTracks().forEach(t=>t.stop());}catch{}
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30,min:24}},audio:false});
        if(dead){stream.getTracks().forEach(t=>t.stop());return;}
        streamRef.current=stream;
        const track=stream.getVideoTracks()[0];
        try{
          const caps:any=track.getCapabilities?.()||{}, advanced:any={};
          if(Array.isArray(caps.focusMode)&&caps.focusMode.includes("continuous")) advanced.focusMode="continuous";
          if(Array.isArray(caps.exposureMode)&&caps.exposureMode.includes("continuous")) advanced.exposureMode="continuous";
          if(Array.isArray(caps.whiteBalanceMode)&&caps.whiteBalanceMode.includes("continuous")) advanced.whiteBalanceMode="continuous";
          if(Object.keys(advanced).length) await track.applyConstraints({advanced:[advanced]} as any).catch(()=>{});
        }catch{}
        track.addEventListener?.("ended",()=>{if(!dead){setReady(false);setMessage("Caméra suspendue · réouverture automatique…");}});
        if(videoRef.current){videoRef.current.srcObject=stream; await videoRef.current.play().catch(()=>{});}
        setReady(true); setMessage(calibrated?"Caméra reprise · source prête.":"Caméra prête · calibre les 5 points.");
        await updateClosestCenterCompanionStatus(sessionId,{linked:true,connected:true,cameraReady:true,deviceLabel:/android/i.test(navigator.userAgent)?"Téléphone Android":"Téléphone compagnon",deviceKind:"closest_center_phone_camera",purpose:"closest_center",hardwareFingerprint:cameraFingerprint(stream,videoRef.current),message:"Caméra Pétanque prête",lastSeenAt:Date.now()});
      }catch(e:any){setReady(false);setMessage(e?.message||"Caméra indisponible");}
    };
    const requestWakeLock=async()=>{try{const wl=(navigator as any).wakeLock;if(wl?.request){wakeLockRef.current=await wl.request("screen");}}catch{}};
    const onVisibility=()=>{if(document.visibilityState==="visible"){void requestWakeLock();void openCamera();}else{updateClosestCenterCompanionStatus(sessionId,{connected:false,cameraReady:false,message:"Téléphone en arrière-plan",lastSeenAt:Date.now()}).catch(()=>{});}};
    void openCamera(); void requestWakeLock();
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{dead=true;document.removeEventListener("visibilitychange",onVisibility);try{wakeLockRef.current?.release?.();}catch{};try{streamRef.current?.getTracks().forEach(t=>t.stop());}catch{};updateClosestCenterCompanionStatus(sessionId,{connected:false,cameraReady:false,message:"Téléphone déconnecté",lastSeenAt:Date.now()}).catch(()=>{});};
  },[sessionId,calibrated]);

  React.useEffect(()=>{
    if(!sessionId||!ready) return;
    let dead=false;
    const tick=async()=>{
      if(dead||busyRef.current) return;
      try{
        const batch=await fetchClosestCenterCompanionEvents(sessionId,lastSeqRef.current);
        for(const ev of batch.events){
          lastSeqRef.current=Math.max(lastSeqRef.current,Number(ev.id||ev.seq||0)||0);
          const p=ev.payload||{};
          if(p.kind!=="closest_center_capture_request") continue;
          const requestId=String(p.requestId||"");
          if(!requestId || processedRequestsRef.current.has(requestId)) continue;
          processedRequestsRef.current.add(requestId);
          if(processedRequestsRef.current.size>80){processedRequestsRef.current=new Set([requestId]);}
          busyRef.current=true; setServing(true); setMessage("Capture demandée par le match…");
          try{
            const video=videoRef.current;
            if(!video) throw new Error("Caméra non prête.");
            const count=Math.max(1,Math.min(12,Number(p.count||1)));
            const delayMs=Math.max(25,Math.min(250,Number(p.delayMs||55)));
            const maxSide=Math.max(960,Math.min(2400,Number(p.maxCaptureSide||1920)));
            for(let i=0;i<count;i++){
              if(i>0) await waitFrame(video,delayMs);
              const dataUrl=captureDataUrl(video,maxSide,p.crop||null);
              await postClosestCenterCompanionEvent(sessionId,{kind:"closest_center_capture_frame",type:"closest_center_capture_frame",requestId:p.requestId,index:i,total:count,dataUrl,fingerprint:cameraFingerprint(streamRef.current,video),deviceTs:Date.now()});
            }
            setMessage(`Burst envoyé · ${count} frame${count>1?"s":""}`);
          }catch(e:any){
            const errorMessage=e?.message||"Capture impossible";
            setMessage(errorMessage);
            await postClosestCenterCompanionEvent(sessionId,{kind:"closest_center_capture_error",type:"closest_center_capture_error",requestId:p.requestId,message:errorMessage,deviceTs:Date.now()}).catch(()=>{});
          }
          finally{busyRef.current=false;setServing(false);}
        }
      }catch{}
    };
    const id=window.setInterval(tick,180); tick();
    return()=>{dead=true;window.clearInterval(id);};
  },[sessionId,ready]);

  React.useEffect(()=>{
    if(!sessionId||!ready) return;
    const id=window.setInterval(()=>{
      const track=streamRef.current?.getVideoTracks?.()[0];
      const live=track?.readyState==="live" && document.visibilityState==="visible";
      updateClosestCenterCompanionStatus(sessionId,{linked:true,connected:live,cameraReady:live,calibrated,deviceKind:"closest_center_phone_camera",purpose:"closest_center",hardwareFingerprint:cameraFingerprint(streamRef.current,videoRef.current),message:live?(calibrated?"Téléphone calibré et prêt":"Calibration requise"):"Téléphone en veille / arrière-plan",lastSeenAt:Date.now()}).catch(()=>{});
    },1200);
    return()=>window.clearInterval(id);
  },[sessionId,ready,calibrated]);

  function viewPoint(e:React.MouseEvent){
    const el=e.currentTarget as HTMLDivElement, rect=el.getBoundingClientRect(), video=videoRef.current;
    if(!video?.videoWidth||!video.videoHeight) return null;
    const boxW=rect.width,boxH=rect.height,aspect=video.videoWidth/video.videoHeight,boxAspect=boxW/boxH;
    let drawW=boxW,drawH=boxH,offX=0,offY=0;
    if(aspect>boxAspect){drawH=boxW/aspect;offY=(boxH-drawH)/2;}else{drawW=boxH*aspect;offX=(boxW-drawW)/2;}
    const x=e.clientX-rect.left-offX,y=e.clientY-rect.top-offY;
    if(x<0||y<0||x>drawW||y>drawH) return null;
    return {x:x/drawW,y:y/drawH};
  }

  function tap(e:React.MouseEvent){
    if(calibrated||serving) return;
    const pt=viewPoint(e); if(!pt) return;
    if(step===0){setCenter(pt);setStep(1);return;}
    const keys=["d20","d6","d3","d11"];
    const key=keys[step-1], next={...anchors,[key]:pt}; setAnchors(next);
    if(step<4){setStep(step+1);return;}
    if(center){
      const fit=fitCameraBoardHomography([
        {x:center.x,y:center.y,bx:0,by:0},
        {x:next.d20.x,y:next.d20.y,bx:0,by:-1},
        {x:next.d6.x,y:next.d6.y,bx:1,by:0},
        {x:next.d3.x,y:next.d3.y,bx:0,by:1},
        {x:next.d11.x,y:next.d11.y,bx:-1,by:0},
      ]);
      setFitInfo(fit);
    }
  }

  async function validateCalibration(){
    if(!center||!anchors.d20||!anchors.d6||!anchors.d3||!anchors.d11||!fitInfo||fitInfo.confidence<.55) return;
    const left=anchors.d11,right=anchors.d6,top=anchors.d20,bottom=anchors.d3;
    const rx=(Math.hypot(right.x-center.x,right.y-center.y)+Math.hypot(left.x-center.x,left.y-center.y))/2;
    const ry=(Math.hypot(top.x-center.x,top.y-center.y)+Math.hypot(bottom.x-center.x,bottom.y-center.y))/2;
    const fingerprint=cameraFingerprint(streamRef.current,videoRef.current);
    const calibration={v:2,cx:center.x,cy:center.y,rx,ry,r:(rx+ry)/2,a20:-Math.PI/2,phi:0,method:"manual-projective-5pt",confidence:fitInfo.confidence,zoneConfidence:fitInfo.confidence,homography:fitInfo.homography,projectiveConfidence:fitInfo.confidence,projectiveErrorMm:fitInfo.errorMm,sourceId,sourceFingerprint:fingerprint,updatedAt:Date.now()};
    await postClosestCenterCompanionEvent(sessionId,{kind:"closest_center_calibration",type:"closest_center_calibration",sourceId,calibration,deviceTs:Date.now()});
    await updateClosestCenterCompanionStatus(sessionId,{calibrated:true,linked:true,connected:true,cameraReady:true,deviceKind:"closest_center_phone_camera",purpose:"closest_center",hardwareFingerprint:fingerprint,message:"Calibration 5 points envoyée",lastSeenAt:Date.now()});
    setCalibrated(true); setMessage("Calibration envoyée · laisse ce téléphone fixe face à la cible.");
  }

  function resetCalibration(){setCalibrated(false);setStep(0);setCenter(null);setAnchors({});setFitInfo(null);setMessage("Recalibration · tape les 5 points.");}

  const stepText=["CENTRE DBULL","BORD EXTÉRIEUR D20","BORD EXTÉRIEUR D6","BORD EXTÉRIEUR D3","BORD EXTÉRIEUR D11"][step]||"VALIDER";

  return <div style={{minHeight:"100vh",background:"#02070d",color:"#fff",display:"grid",gridTemplateRows:"auto minmax(0,1fr) auto"}}>
    <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,.08)"}}>
      <BackDot onClick={()=>go?.("gameSelect")} size={34} color={ACCENT}/>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:10,color:ACCENT,fontWeight:1000,letterSpacing:1}}>DARTS PÉTANQUE · SOURCE CAMÉRA</div><b style={{fontSize:14}}>TÉLÉPHONE COMPAGNON · {sessionId}</b></div>
      <span style={{padding:"5px 8px",borderRadius:999,border:`1px solid ${ready?GREEN:"#ff8a8a"}55`,color:ready?GREEN:"#ff8a8a",fontSize:9,fontWeight:1000}}>{ready?"CAMÉRA OK":"HORS LIGNE"}</span>
    </div>
    <div onClick={tap} style={{position:"relative",minHeight:0,background:"#000",cursor:calibrated?"default":"crosshair"}}>
      <video ref={videoRef} playsInline muted style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>
      <div style={{position:"absolute",left:10,right:10,top:10,padding:"10px 12px",borderRadius:14,background:"rgba(0,0,0,.68)",border:`1px solid ${ACCENT}44`}}>
        {!calibrated?<><div style={{fontSize:10,color:ACCENT,fontWeight:1000}}>CALIBRATION 5 POINTS · {step+1}/5</div><div style={{fontSize:15,fontWeight:1000,marginTop:3}}>{stepText}</div><div style={{fontSize:11,color:"#aebdca",marginTop:4}}>Téléphone totalement fixe · touche exactement le repère demandé.</div></>:<><div style={{fontSize:10,color:GREEN,fontWeight:1000}}>SOURCE PRÊTE</div><div style={{fontSize:13,fontWeight:900,marginTop:3}}>Ne bouge plus ce téléphone. Il répond automatiquement aux demandes de capture du match.</div></>}
      </div>
      {serving?<div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",background:"rgba(0,0,0,.24)",pointerEvents:"none"}}><div style={{padding:"10px 14px",borderRadius:999,background:"rgba(0,0,0,.78)",border:`1px solid ${ACCENT}66`,fontWeight:1000}}>CAPTURE EN COURS…</div></div>:null}
    </div>
    <div style={{padding:"10px 12px calc(10px + env(safe-area-inset-bottom))",display:"grid",gap:8,borderTop:"1px solid rgba(255,255,255,.08)",background:"#071019"}}>
      <div style={{fontSize:11,color:"#b8c5cf",fontWeight:800}}>{message}</div>
      {!calibrated?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><button onClick={resetCalibration} style={btn(false)}>RECOMMENCER</button><button disabled={!fitInfo||fitInfo.confidence<.55} onClick={validateCalibration} style={btn(true,!fitInfo||fitInfo.confidence<.55)}>VALIDER LA CALIBRATION</button></div>:<button onClick={resetCalibration} style={btn(false)}>RECALIBRER</button>}
    </div>
  </div>;
}

function btn(primary=false,disabled=false):React.CSSProperties{return{minHeight:44,borderRadius:13,border:`1px solid ${primary?ACCENT:"rgba(255,255,255,.18)"}`,background:primary?"rgba(68,231,255,.14)":"rgba(255,255,255,.04)",color:primary?ACCENT:"#fff",fontWeight:1000,opacity:disabled?.4:1};}
