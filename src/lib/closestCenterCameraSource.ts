import { assessPrecisionReadiness } from "./closestCenterVisionEngine";
import type { CameraCalibration } from "./cameraCalibrationStore";
import { fetchClosestCenterCompanionStatus, requestClosestCenterCompanionBurst } from "./closestCenterCompanionClient";

export type ClosestCenterCameraSourceKind = "local_device" | "phone_companion";

export type ClosestCenterCameraSourceDescriptor = {
  id: string;
  kind: ClosestCenterCameraSourceKind;
  label: string;
  supportsPreview: boolean;
  supportsScoring: boolean;
};

export const CLOSEST_CENTER_LOCAL_SOURCE_ID = "closest-center:local-device";

export function normalizeClosestCenterCameraSourceId(value:any): string {
  const raw=String(value||"").trim();
  return raw || CLOSEST_CENTER_LOCAL_SOURCE_ID;
}

export function describeClosestCenterCameraSource(sourceId:any): ClosestCenterCameraSourceDescriptor {
  const id=normalizeClosestCenterCameraSourceId(sourceId);
  if(id.startsWith("closest-center:phone-companion:")){
    return {id,kind:"phone_companion",label:"Téléphone compagnon",supportsPreview:true,supportsScoring:true};
  }
  return {id:CLOSEST_CENTER_LOCAL_SOURCE_ID,kind:"local_device",label:"Caméra de cet appareil",supportsPreview:true,supportsScoring:true};
}

function captureFromVideo(video: HTMLVideoElement | null, crop?: { x:number; y:number; w:number; h:number }, maxCaptureSide = 1920) {
  if (!video?.videoWidth || !video.videoHeight) return null;
  const c = document.createElement("canvas");
  const srcW = video.videoWidth, srcH = video.videoHeight;
  if (crop) {
    c.width = 480; c.height = 480;
  } else {
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

async function waitFreshVideoFrame(video:HTMLVideoElement|null, delayMs:number) {
  if (!video) return;
  const rvfc = (video as any).requestVideoFrameCallback;
  if (typeof rvfc === "function") {
    await new Promise<void>(resolve => {
      let done=false;
      const t=window.setTimeout(()=>{if(!done){done=true;resolve();}},Math.max(90,delayMs*2));
      rvfc.call(video,()=>{if(done)return;done=true;window.clearTimeout(t);resolve();});
    });
  } else await new Promise(resolve => window.setTimeout(resolve, delayMs));
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

export function cameraSourceHardwareFingerprint(stream:MediaStream|null, video:HTMLVideoElement|null){
  try{
    const track=stream?.getVideoTracks?.()[0];
    if(!track) return null;
    const st:any=track.getSettings?.()||{};
    const vw=Number(video?.videoWidth||st.width||0), vh=Number(video?.videoHeight||st.height||0);
    return {
      deviceId:String(st.deviceId||''),
      groupId:String(st.groupId||''),
      width:Number(st.width||vw||0),
      height:Number(st.height||vh||0),
      videoWidth:vw,
      videoHeight:vh,
      aspect:vh>0?vw/vh:0,
      zoom:Number(st.zoom||1),
      facingMode:String(st.facingMode||''),
      frameRate:Number(st.frameRate||0),
    };
  }catch{return null;}
}

export type LocalClosestCenterCameraSource = {
  descriptor: ClosestCenterCameraSourceDescriptor;
  open: () => Promise<MediaStream>;
  close: () => void;
  getStream: () => MediaStream | null;
  captureFrame: (crop?:{x:number;y:number;w:number;h:number}, maxCaptureSide?:number) => ImageData | null;
  captureBurst: (count?:number,delayMs?:number,maxCaptureSide?:number) => Promise<ImageData[]>;
  captureSettledBurst: (cal:CameraCalibration,count?:number,delayMs?:number,maxCaptureSide?:number) => Promise<{ok:boolean;frames:ImageData[];reason:string;metrics:any}>;
  hardwareFingerprint: () => any;
};

export function createLocalClosestCenterCameraSource(
  video: HTMLVideoElement | null,
  opts?: { sourceId?:string; maxCaptureSide?:number }
): LocalClosestCenterCameraSource {
  let stream:MediaStream|null=null;
  const descriptor=describeClosestCenterCameraSource(opts?.sourceId || CLOSEST_CENTER_LOCAL_SOURCE_ID);
  const maxSideDefault=Math.max(1280,Number(opts?.maxCaptureSide||1920));

  return {
    descriptor,
    async open(){
      if(stream) return stream;
      stream=await navigator.mediaDevices.getUserMedia({
        video:{
          facingMode:{ideal:"environment"},
          width:{ideal:Math.max(1920,maxSideDefault)},
          height:{ideal:Math.round(Math.max(1920,maxSideDefault)*9/16)},
          frameRate:{ideal:30,min:24}
        },
        audio:false
      });
      await tunePrecisionTrack(stream);
      if(video){
        video.srcObject=stream;
        await video.play().catch(()=>{});
      }
      return stream;
    },
    close(){
      try{stream?.getTracks().forEach(t=>t.stop());}catch{}
      if(video && video.srcObject===stream) video.srcObject=null;
      stream=null;
    },
    getStream(){ return stream; },
    captureFrame(crop,maxCaptureSide=maxSideDefault){
      return captureFromVideo(video,crop,maxCaptureSide);
    },
    async captureBurst(count=5,delayMs=55,maxCaptureSide=maxSideDefault){
      const frames:ImageData[]=[];
      for(let i=0;i<count;i++){
        if(i>0) await waitFreshVideoFrame(video,delayMs);
        const frame=captureFromVideo(video,undefined,maxCaptureSide);
        if(frame) frames.push(frame);
      }
      return frames;
    },
    async captureSettledBurst(cal,count=5,delayMs=55,maxCaptureSide=maxSideDefault){
      const wanted=Math.max(3,Number(count||5));
      const raw=await this.captureBurst(wanted+2,delayMs,maxCaptureSide);
      if(raw.length<wanted) return {ok:false,frames:raw,reason:"capture",metrics:null};
      const metrics=raw.map(frame=>assessPrecisionReadiness(frame,cal));
      const windowFrames=raw.slice(-wanted);
      const windowMetrics=metrics.slice(-wanted);
      const spread=(values:number[])=>values.length?Math.max(...values)-Math.min(...values):99;
      const sharpnessSpread=spread(windowMetrics.map(x=>Number(x.sharpness||0)));
      const exposureSpread=spread(windowMetrics.map(x=>Number(x.exposure||0)));
      const confidenceSpread=spread(windowMetrics.map(x=>Number(x.confidence||0)));
      const minSharpness=Math.min(...windowMetrics.map(x=>Number(x.sharpness||0)));
      const minExposure=Math.min(...windowMetrics.map(x=>Number(x.exposure||0)));
      const settled=sharpnessSpread<=.14&&exposureSpread<=.14&&confidenceSpread<=.13&&minSharpness>=.38&&minExposure>=.34;
      return {ok:settled,frames:windowFrames,reason:settled?"ok":"settling",metrics:{sharpnessSpread,exposureSpread,confidenceSpread,minSharpness,minExposure}};
    },
    hardwareFingerprint(){ return cameraSourceHardwareFingerprint(stream,video); }
  };
}


export type ClosestCenterCameraSource = {
  descriptor: ClosestCenterCameraSourceDescriptor;
  open: () => Promise<MediaStream | null>;
  close: () => void;
  getStream: () => MediaStream | null;
  captureFrame?: (crop?:{x:number;y:number;w:number;h:number}, maxCaptureSide?:number) => ImageData | null;
  captureEnrollmentFrame?: (crop?:{x:number;y:number;w:number;h:number}, maxCaptureSide?:number) => Promise<ImageData | null>;
  captureBurst: (count?:number,delayMs?:number,maxCaptureSide?:number) => Promise<ImageData[]>;
  captureSettledBurst: (cal:CameraCalibration,count?:number,delayMs?:number,maxCaptureSide?:number) => Promise<{ok:boolean;frames:ImageData[];reason:string;metrics:any}>;
  hardwareFingerprint: () => any;
};

export function createPhoneCompanionClosestCenterCameraSource(
  sourceId:string,
  opts?:{maxCaptureSide?:number}
): ClosestCenterCameraSource {
  const descriptor=describeClosestCenterCameraSource(sourceId);
  const sessionId=String(sourceId||"").split(":").pop()||"";
  const maxSideDefault=Math.max(1280,Number(opts?.maxCaptureSide||1920));
  let fingerprint:any=null;
  let opened=false;

  async function remoteBurst(count=5,delayMs=55,maxCaptureSide=maxSideDefault){
    if(!opened) await source.open();
    const result=await requestClosestCenterCompanionBurst(sessionId,{count,delayMs,maxCaptureSide,timeoutMs:16000});
    fingerprint=result.fingerprint||fingerprint;
    return result.frames;
  }

  const source:ClosestCenterCameraSource={
    descriptor,
    async open(){
      const status:any=await fetchClosestCenterCompanionStatus(sessionId);
      if(!status?.connected || !status?.cameraReady) throw new Error("Téléphone compagnon non connecté ou caméra non prête.");
      fingerprint=status?.hardwareFingerprint||fingerprint;
      opened=true;
      return null;
    },
    close(){opened=false;},
    getStream(){return null;},
    async captureEnrollmentFrame(crop={x:.25,y:.2,w:.5,h:.6},maxCaptureSide=maxSideDefault){
      if(!opened) await source.open();
      const result=await requestClosestCenterCompanionBurst(sessionId,{count:1,delayMs:55,maxCaptureSide,timeoutMs:12000,crop});
      fingerprint=result.fingerprint||fingerprint;
      return result.frames[0]||null;
    },
    async captureBurst(count=5,delayMs=55,maxCaptureSide=maxSideDefault){
      return remoteBurst(count,delayMs,maxCaptureSide);
    },
    async captureSettledBurst(cal,count=5,delayMs=55,maxCaptureSide=maxSideDefault){
      const wanted=Math.max(3,Number(count||5));
      const raw=await remoteBurst(wanted+2,delayMs,maxCaptureSide);
      if(raw.length<wanted) return {ok:false,frames:raw,reason:"capture",metrics:null};
      const metrics=raw.map(frame=>assessPrecisionReadiness(frame,cal));
      const windowFrames=raw.slice(-wanted), windowMetrics=metrics.slice(-wanted);
      const spread=(values:number[])=>values.length?Math.max(...values)-Math.min(...values):99;
      const sharpnessSpread=spread(windowMetrics.map(x=>Number(x.sharpness||0)));
      const exposureSpread=spread(windowMetrics.map(x=>Number(x.exposure||0)));
      const confidenceSpread=spread(windowMetrics.map(x=>Number(x.confidence||0)));
      const minSharpness=Math.min(...windowMetrics.map(x=>Number(x.sharpness||0)));
      const minExposure=Math.min(...windowMetrics.map(x=>Number(x.exposure||0)));
      const settled=sharpnessSpread<=.14&&exposureSpread<=.14&&confidenceSpread<=.13&&minSharpness>=.38&&minExposure>=.34;
      return {ok:settled,frames:windowFrames,reason:settled?"ok":"settling",metrics:{sharpnessSpread,exposureSpread,confidenceSpread,minSharpness,minExposure}};
    },
    hardwareFingerprint(){return fingerprint;},
  };
  return source;
}

export function createClosestCenterCameraSource(
  video:HTMLVideoElement|null,
  sourceId:string,
  opts?:{maxCaptureSide?:number}
): ClosestCenterCameraSource {
  const descriptor=describeClosestCenterCameraSource(sourceId);
  return descriptor.kind==="phone_companion"
    ? createPhoneCompanionClosestCenterCameraSource(sourceId,opts)
    : createLocalClosestCenterCameraSource(video,{sourceId,maxCaptureSide:opts?.maxCaptureSide});
}
