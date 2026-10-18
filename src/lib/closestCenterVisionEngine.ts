// @ts-nocheck
import { mapCameraPointToBoard, type CameraCalibration } from "./cameraCalibrationStore";

export type DartVisualSignature = {
  hue: number[];
  saturation: number[];
  lightness: number[];
  edgeDensity: number;
  samples: number;
};

export type ClosestCenterImpact = {
  id: string;
  playerId: string;
  teamId?: string | null;
  xNorm: number;
  yNorm: number;
  distanceNorm: number;
  distanceMm: number;
  confidence: number;
  identityConfidence: number;
  identityMargin?: number;
  uncertaintyMm?: number;
  needsReview?: boolean;
  round: number;
};

export type VisionDetection = {
  xNorm: number;
  yNorm: number;
  distanceNorm: number;
  distanceMm: number;
  confidence: number;
  area: number;
  geometryConfidence?: number;
};

export type DartIdentityResult = {
  playerId: string | null;
  confidence: number;
  margin: number;
  scores: Array<{ playerId: string; score: number }>;
};

export type FrameStability = {
  stable: boolean;
  changedFraction: number;
  meanDelta: number;
  confidence: number;
};

export type PrecisionReadiness = {
  ok: boolean;
  boardRadiusPx: number;
  mmPerPixel: number;
  sharpness: number;
  exposure: number;
  calibrationConfidence: number;
  confidence: number;
  reasons: string[];
};

export type DetectionConsensus = VisionDetection & {
  frameAgreement: number;
  sampleCount: number;
  spreadMm: number;
  positionSpreadPx?: number;
  rereadAgreement?: number;
};

export type FrameRegistration = {
  dxPx: number;
  dyPx: number;
  error: number;
  confidence: number;
};

export type PrecisionTier = "insufficient" | "standard" | "high" | "competition";

export function clamp01(v: number) { return Math.max(0, Math.min(1, Number(v) || 0)); }

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function normalizeHist(hist: number[]) {
  const sum = hist.reduce((a, b) => a + b, 0) || 1;
  return hist.map(v => v / sum);
}

export function buildDartVisualSignature(data: ImageData): DartVisualSignature {
  const hue = Array(12).fill(0), saturation = Array(8).fill(0), lightness = Array(8).fill(0);
  let edge = 0, used = 0;
  const { width, height, data: p } = data;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = (y * width + x) * 4;
      const a = p[i + 3]; if (a < 16) continue;
      const { h, s, l } = rgbToHsl(p[i], p[i + 1], p[i + 2]);
      if (l < .08) continue;
      hue[Math.min(11, Math.floor(h * 12))]++;
      saturation[Math.min(7, Math.floor(s * 8))]++;
      lightness[Math.min(7, Math.floor(l * 8))]++;
      const ir = (y * width + (x + 1)) * 4;
      const id = ((y + 1) * width + x) * 4;
      const dx = Math.abs(p[i] - p[ir]) + Math.abs(p[i + 1] - p[ir + 1]) + Math.abs(p[i + 2] - p[ir + 2]);
      const dy = Math.abs(p[i] - p[id]) + Math.abs(p[i + 1] - p[id + 1]) + Math.abs(p[i + 2] - p[id + 2]);
      if (dx + dy > 115) edge++;
      used++;
    }
  }
  return { hue: normalizeHist(hue), saturation: normalizeHist(saturation), lightness: normalizeHist(lightness), edgeDensity: used ? edge / used : 0, samples: used };
}

function histogramDistance(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) sum += Math.abs((a[i] || 0) - (b[i] || 0));
  return sum / 2;
}

export function compareDartSignatures(a?: DartVisualSignature | null, b?: DartVisualSignature | null) {
  if (!a || !b || !a.samples || !b.samples) return 0;
  const d = histogramDistance(a.hue, b.hue) * .52
    + histogramDistance(a.saturation, b.saturation) * .22
    + histogramDistance(a.lightness, b.lightness) * .16
    + Math.min(1, Math.abs(a.edgeDensity - b.edgeDensity) * 4) * .10;
  return clamp01(1 - d);
}

export function mergeDartSignatures(items: DartVisualSignature[]) {
  const valid = (items || []).filter(x => x?.samples > 0);
  if (!valid.length) return null;
  const avg = (key: "hue" | "saturation" | "lightness") => {
    const n = Math.max(...valid.map(x => x[key].length));
    return Array.from({ length: n }, (_, i) => valid.reduce((s, x) => s + (x[key][i] || 0), 0) / valid.length);
  };
  return {
    hue: avg("hue"), saturation: avg("saturation"), lightness: avg("lightness"),
    edgeDensity: valid.reduce((s, x) => s + x.edgeDensity, 0) / valid.length,
    samples: valid.reduce((s, x) => s + x.samples, 0),
  } as DartVisualSignature;
}

export function classifyDartIdentity(
  signatures: Record<string, DartVisualSignature | null | undefined>,
  observed?: DartVisualSignature | null,
  expectedPlayerId?: string | null,
): DartIdentityResult {
  const raw = Object.entries(signatures).map(([playerId, signature]) => ({
    playerId, score: compareDartSignatures(signature, observed),
  })).sort((a,b)=>b.score-a.score);
  if (!raw.length) return {playerId:expectedPlayerId||null,confidence:0,margin:0,scores:[]};

  const expected = expectedPlayerId ? raw.find(x=>String(x.playerId)===String(expectedPlayerId)) : null;
  const visualBest = raw[0];
  let chosen = visualBest;
  // Temporal ownership is a strong second factor: the active player is known.
  // Visual recognition only overrides that fact when the visual evidence is clearly stronger.
  if (expected && String(visualBest.playerId)!==String(expected.playerId)) {
    const visualLead = visualBest.score - expected.score;
    if (!(visualBest.score >= .82 && visualLead >= .20)) chosen = expected;
  }
  const competitor = raw.find(x=>String(x.playerId)!==String(chosen.playerId));
  const margin = Math.max(0, chosen.score-(competitor?.score||0));
  const temporalMatch = expectedPlayerId && String(chosen.playerId)===String(expectedPlayerId);
  const confidence = clamp01(chosen.score*.72 + Math.min(.18,Math.max(0,margin)*1.5) + (temporalMatch?.10:0));
  const scores = raw.map(x=>({ ...x, score: clamp01(x.score + (expectedPlayerId && String(x.playerId)===String(expectedPlayerId) ? .035 : 0)) })).sort((a,b)=>b.score-a.score);
  return {playerId:chosen.playerId||null,confidence,margin,scores};
}

export function normalizedBoardPoint(cal: CameraCalibration, xNorm: number, yNorm: number) {
  return mapCameraPointToBoard(cal, xNorm, yNorm);
}

export function distanceMmFromNorm(distanceNorm: number) {
  // Standard bristle board: centre -> outer double wire = 170 mm.
  return Math.max(0, distanceNorm * 170);
}

function grayAt(frame: ImageData, x:number, y:number) {
  const xx=Math.max(0,Math.min(frame.width-1,Math.round(x))), yy=Math.max(0,Math.min(frame.height-1,Math.round(y)));
  const i=(yy*frame.width+xx)*4;
  return frame.data[i]*.2126+frame.data[i+1]*.7152+frame.data[i+2]*.0722;
}

function grayAtBilinear(frame: ImageData, x:number, y:number) {
  const w=frame.width,h=frame.height;
  const xx=Math.max(0,Math.min(w-1.001,x)), yy=Math.max(0,Math.min(h-1.001,y));
  const x0=Math.floor(xx),y0=Math.floor(yy),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1);
  const fx=xx-x0,fy=yy-y0;
  const lum=(px:number,py:number)=>{
    const i=(py*w+px)*4;
    return frame.data[i]*.2126+frame.data[i+1]*.7152+frame.data[i+2]*.0722;
  };
  const a=lum(x0,y0)*(1-fx)+lum(x1,y0)*fx;
  const b=lum(x0,y1)*(1-fx)+lum(x1,y1)*fx;
  return a*(1-fy)+b*fy;
}

function rgbDeltaBilinear(before:ImageData, after:ImageData, x:number, y:number) {
  const sample=(frame:ImageData,c:number)=>{
    const w=frame.width,h=frame.height;
    const xx=Math.max(0,Math.min(w-1.001,x)),yy=Math.max(0,Math.min(h-1.001,y));
    const x0=Math.floor(xx),y0=Math.floor(yy),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1);
    const fx=xx-x0,fy=yy-y0;
    const at=(px:number,py:number)=>frame.data[(py*w+px)*4+c];
    const a=at(x0,y0)*(1-fx)+at(x1,y0)*fx;
    const b=at(x0,y1)*(1-fx)+at(x1,y1)*fx;
    return a*(1-fy)+b*fy;
  };
  return (Math.abs(sample(before,0)-sample(after,0))+Math.abs(sample(before,1)-sample(after,1))+Math.abs(sample(before,2)-sample(after,2)))/3;
}

/**
 * Estimates tiny camera translations against the empty-board reference.
 * The error is capped so newly appeared darts cannot dominate registration.
 */
export function estimateFrameTranslation(reference:ImageData, frame:ImageData, cal:CameraCalibration, maxShiftPx=10):FrameRegistration {
  const width=Math.min(reference.width,frame.width), height=Math.min(reference.height,frame.height);
  const scores=new Map<string,number>();
  const step=Math.max(10,Math.round(Math.min(width,height)/70));
  const scoreAt=(dx:number,dy:number,subpixel=false)=>{
    const key=subpixel?`${dx.toFixed(3)},${dy.toFixed(3)}`:`${dx},${dy}`;
    const cached=scores.get(key); if(cached!=null) return cached;
    let err=0,n=0;
    for(let y=maxShiftPx+2;y<height-maxShiftPx-2;y+=step) for(let x=maxShiftPx+2;x<width-maxShiftPx-2;x+=step){
      if(normalizedBoardPoint(cal,x/width,y/height).distanceNorm>1.01) continue;
      const a=grayAt(reference,x,y);
      const b=subpixel?grayAtBilinear(frame,x+dx,y+dy):grayAt(frame,x+dx,y+dy);
      const d=Math.min(42,Math.abs(a-b));
      err+=d*d; n++;
    }
    const v=n?err/n:Infinity; scores.set(key,v); return v;
  };
  let bestDx=0,bestDy=0,best=Infinity,second=Infinity;
  for(let dy=-maxShiftPx;dy<=maxShiftPx;dy++) for(let dx=-maxShiftPx;dx<=maxShiftPx;dx++){
    const score=scoreAt(dx,dy,false);
    if(score<best){second=best;best=score;bestDx=dx;bestDy=dy;} else if(score<second) second=score;
  }
  const parabolaOffset=(fm:number,f0:number,fp:number)=>{
    const den=fm-2*f0+fp;
    if(!Number.isFinite(fm)||!Number.isFinite(fp)||Math.abs(den)<1e-6) return 0;
    return Math.max(-.5,Math.min(.5,.5*(fm-fp)/den));
  };
  let subX=0,subY=0;
  if(bestDx>-maxShiftPx&&bestDx<maxShiftPx) subX=parabolaOffset(scoreAt(bestDx-1,bestDy),best,scoreAt(bestDx+1,bestDy));
  if(bestDy>-maxShiftPx&&bestDy<maxShiftPx) subY=parabolaOffset(scoreAt(bestDx,bestDy-1),best,scoreAt(bestDx,bestDy+1));

  // Micro-search with bilinear sampling around the parabolic estimate. This
  // removes the remaining whole-pixel sampling bias when the phone moves by
  // only a fraction of a source pixel.
  let refinedDx=bestDx+subX,refinedDy=bestDy+subY;
  let refinedScore=scoreAt(refinedDx,refinedDy,true);
  for(const delta of [.25,.125]){
    let localDx=refinedDx,localDy=refinedDy,localScore=refinedScore;
    for(let oy=-2;oy<=2;oy++) for(let ox=-2;ox<=2;ox++){
      const dx=Math.max(-maxShiftPx,Math.min(maxShiftPx,refinedDx+ox*delta));
      const dy=Math.max(-maxShiftPx,Math.min(maxShiftPx,refinedDy+oy*delta));
      const score=scoreAt(dx,dy,true);
      if(score<localScore){localScore=score;localDx=dx;localDy=dy;}
    }
    refinedDx=localDx;refinedDy=localDy;refinedScore=localScore;
  }

  const separation=second<Infinity?Math.max(0,(second-best)/Math.max(1,second)):0;
  const refinementGain=Math.max(0,(best-refinedScore)/Math.max(1,best));
  const confidence=clamp01((1-Math.sqrt(refinedScore)/36)*.72+Math.min(.20,separation*3)+Math.min(.08,refinementGain*4));
  return {dxPx:refinedDx,dyPx:refinedDy,error:refinedScore,confidence};
}

function estimateRegionalTranslation(reference:ImageData,frame:ImageData,cal:CameraCalibration,quadrant:number,maxShiftPx=6){
  const width=Math.min(reference.width,frame.width),height=Math.min(reference.height,frame.height);
  const step=Math.max(12,Math.round(Math.min(width,height)/60));
  const scoreAt=(dx:number,dy:number,subpixel=false)=>{
    let err=0,n=0;
    for(let y=maxShiftPx+2;y<height-maxShiftPx-2;y+=step) for(let x=maxShiftPx+2;x<width-maxShiftPx-2;x+=step){
      const bp=normalizedBoardPoint(cal,x/width,y/height); if(bp.distanceNorm>.92||bp.distanceNorm<.18) continue;
      const q=(bp.nx>=0?1:0)+(bp.ny>=0?2:0); if(q!==quadrant) continue;
      const b=subpixel?grayAtBilinear(frame,x+dx,y+dy):grayAt(frame,x+dx,y+dy);
      const d=Math.min(40,Math.abs(grayAt(reference,x,y)-b)); err+=d*d;n++;
    }
    return n?err/n:Infinity;
  };
  let best={dxPx:0,dyPx:0,error:Infinity,confidence:0};
  for(let dy=-maxShiftPx;dy<=maxShiftPx;dy++) for(let dx=-maxShiftPx;dx<=maxShiftPx;dx++){
    const score=scoreAt(dx,dy,false);
    if(score<best.error) best={dxPx:dx,dyPx:dy,error:score,confidence:0};
  }
  let dx=best.dxPx,dy=best.dyPx,error=best.error;
  for(const delta of [.25,.125]){
    let bx=dx,by=dy,be=error;
    for(let oy=-2;oy<=2;oy++) for(let ox=-2;ox<=2;ox++){
      const tx=Math.max(-maxShiftPx,Math.min(maxShiftPx,dx+ox*delta));
      const ty=Math.max(-maxShiftPx,Math.min(maxShiftPx,dy+oy*delta));
      const e=scoreAt(tx,ty,true);
      if(e<be){be=e;bx=tx;by=ty;}
    }
    dx=bx;dy=by;error=be;
  }
  return {dxPx:dx,dyPx:dy,error,confidence:clamp01(1-Math.sqrt(error)/34)};
}

export function assessProjectiveDrift(reference:ImageData,frame:ImageData,cal:CameraCalibration){
  const regs=[0,1,2,3].map(q=>estimateRegionalTranslation(reference,frame,cal,q,6));
  const valid=regs.filter(r=>Number.isFinite(r.error));
  if(valid.length<3) return {ok:false,regionalSpreadPx:99,confidence:0,regions:regs};
  const mx=valid.reduce((s,r)=>s+r.dxPx,0)/valid.length,my=valid.reduce((s,r)=>s+r.dyPx,0)/valid.length;
  const spread=Math.sqrt(valid.reduce((s,r)=>s+(r.dxPx-mx)**2+(r.dyPx-my)**2,0)/valid.length);
  const conf=clamp01((1-spread/3)*.7+(valid.reduce((s,r)=>s+r.confidence,0)/valid.length)*.3);
  return {ok:spread<=1.7,regionalSpreadPx:spread,confidence:conf,regions:regs};
}

export function translateFrame(frame:ImageData, dxPx:number, dyPx:number):ImageData {
  if(!dxPx&&!dyPx) return frame;
  const out=new ImageData(frame.width,frame.height), w=frame.width,h=frame.height,d=frame.data;
  const sample=(x:number,y:number,c:number)=>{
    const x0=Math.floor(x),y0=Math.floor(y),x1=x0+1,y1=y0+1;
    if(x0<0||y0<0||x1>=w||y1>=h) return 0;
    const fx=x-x0,fy=y-y0;
    const i00=(y0*w+x0)*4+c,i10=(y0*w+x1)*4+c,i01=(y1*w+x0)*4+c,i11=(y1*w+x1)*4+c;
    const a=d[i00]*(1-fx)+d[i10]*fx,b=d[i01]*(1-fx)+d[i11]*fx;
    return Math.round(a*(1-fy)+b*fy);
  };
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const sx=x+dxPx, sy=y+dyPx, oi=(y*w+x)*4;
    if(sx<0||sx>=w-1||sy<0||sy>=h-1){out.data[oi+3]=255;continue;}
    out.data[oi]=sample(sx,sy,0);out.data[oi+1]=sample(sx,sy,1);out.data[oi+2]=sample(sx,sy,2);out.data[oi+3]=255;
  }
  return out;
}

export function registerFrameToReference(reference:ImageData, frame:ImageData, cal:CameraCalibration){
  const registration=estimateFrameTranslation(reference,frame,cal,10);
  return {frame:translateFrame(frame,registration.dxPx,registration.dyPx),registration};
}

export function temporalMedianFrame(frames:ImageData[]):ImageData|null {
  const valid=(frames||[]).filter(Boolean);
  if(!valid.length) return null;
  const w=valid[0].width,h=valid[0].height;
  if(!valid.every(f=>f.width===w&&f.height===h)) return valid[Math.floor(valid.length/2)];
  if(valid.length===1) return valid[0];
  const out=new ImageData(w,h), n=valid.length;
  // Allocation-free robust temporal estimator. With >=4 frames we remove the
  // brightest and darkest sample, then average the centre values. This rejects
  // single-frame sensor noise/specular flashes without millions of tiny sorts.
  for(let i=0;i<w*h*4;i+=4){
    for(let c=0;c<3;c++){
      let sum=0,min=255,max=0;
      for(const f of valid){const v=f.data[i+c];sum+=v;if(v<min)min=v;if(v>max)max=v;}
      out.data[i+c]=n>=4?Math.round((sum-min-max)/(n-2)):Math.round(sum/n);
    }
    out.data[i+3]=255;
  }
  return out;
}

export function precisionTier(readiness:PrecisionReadiness):PrecisionTier {
  if(!readiness.ok) return "insufficient";
  if(readiness.mmPerPixel<=.38&&readiness.sharpness>=.68&&readiness.calibrationConfidence>=.78&&readiness.confidence>=.78) return "competition";
  if(readiness.mmPerPixel<=.52&&readiness.sharpness>=.56&&readiness.confidence>=.66) return "high";
  return "standard";
}

export function assessPrecisionReadiness(frame: ImageData, cal: CameraCalibration): PrecisionReadiness {
  const width = frame.width, height = frame.height;
  const rx = cal.v === 2 ? Math.max(.0001, Number(cal.rx || cal.r)) : Math.max(.0001, Number(cal.r));
  const ry = cal.v === 2 ? Math.max(.0001, Number(cal.ry || cal.r)) : Math.max(.0001, Number(cal.r));
  const boardRadiusPx = Math.max(1, ((rx * width) + (ry * height)) / 2);
  let mmPerPixel = 170 / boardRadiusPx;
  if (cal.v===2 && Array.isArray((cal as any).homography)) {
    const c = normalizedBoardPoint(cal, cal.cx, cal.cy);
    const px = normalizedBoardPoint(cal, cal.cx + 1/width, cal.cy);
    const py = normalizedBoardPoint(cal, cal.cx, cal.cy + 1/height);
    const sx = Math.hypot(px.nx-c.nx, px.ny-c.ny)*170;
    const sy = Math.hypot(py.nx-c.nx, py.ny-c.ny)*170;
    if (Number.isFinite(sx) && Number.isFinite(sy) && sx>0 && sy>0) mmPerPixel=(sx+sy)/2;
  }
  let lap = 0, lapN = 0, mean = 0, meanN = 0, clipped = 0;
  const d = frame.data;
  const lum = (x:number,y:number) => { const i=(y*width+x)*4; return d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722; };
  for (let y=3;y<height-3;y+=4) for (let x=3;x<width-3;x+=4) {
    if (normalizedBoardPoint(cal,x/width,y/height).distanceNorm>1.02) continue;
    const c=lum(x,y), l=lum(x-2,y), r=lum(x+2,y), u=lum(x,y-2), dn=lum(x,y+2);
    lap += Math.abs(4*c-l-r-u-dn); lapN++; mean += c; meanN++;
    if(c<12||c>245) clipped++;
  }
  const sharpness = clamp01((lapN ? lap/lapN : 0) / 34);
  const avg = meanN ? mean/meanN : 0;
  const clippedFraction = meanN ? clipped/meanN : 1;
  const exposure = clamp01(1 - Math.abs(avg-122)/122 - clippedFraction*.8);
  const projectiveBoost = cal.v===2 && Array.isArray((cal as any).homography) ? clamp01(Number((cal as any).projectiveConfidence ?? .7)) : 0;
  const calibrationConfidence = cal.v===2 ? clamp01(Number(cal.confidence ?? .72)*.50 + Number(cal.zoneConfidence ?? .72)*.20 + projectiveBoost*.30) : .48;
  const scaleConfidence = clamp01((.90-mmPerPixel)/.55);
  const confidence = clamp01(scaleConfidence*.34 + sharpness*.28 + exposure*.16 + calibrationConfidence*.22);
  const reasons:string[]=[];
  if(mmPerPixel>.58) reasons.push(`Cible trop petite dans l’image (${mmPerPixel.toFixed(2)} mm/pixel). Rapproche ou zoome la caméra.`);
  if(sharpness<.50) reasons.push("Image trop floue pour départager précisément les pointes.");
  if(exposure<.46) reasons.push("Exposition insuffisante ou zones brûlées sur la cible.");
  if(calibrationConfidence<.60) reasons.push("Calibration insuffisamment fiable pour une mesure de précision.");
  return {ok:reasons.length===0,boardRadiusPx,mmPerPixel,sharpness,exposure,calibrationConfidence,confidence,reasons};
}


export function localMetricMmPerPixel(cal: CameraCalibration, width:number, height:number, xNorm:number, yNorm:number) {
  const w=Math.max(1,width),h=Math.max(1,height);
  const c=normalizedBoardPoint(cal,xNorm,yNorm);
  const px=normalizedBoardPoint(cal,xNorm+1/w,yNorm);
  const py=normalizedBoardPoint(cal,xNorm,yNorm+1/h);
  const sx=Math.hypot(px.nx-c.nx,px.ny-c.ny)*170;
  const sy=Math.hypot(py.nx-c.nx,py.ny-c.ny)*170;
  const major=Math.max(sx,sy), minor=Math.max(.0001,Math.min(sx,sy));
  return {xMmPerPixel:sx,yMmPerPixel:sy,meanMmPerPixel:(sx+sy)/2,anisotropy:major/minor};
}

export function fuseIndependentConsensusPasses(first:DetectionConsensus[], second:DetectionConsensus[], cal:CameraCalibration, width:number, height:number, wanted=3):DetectionConsensus[] {
  const used=new Set<number>();
  const out:DetectionConsensus[]=[];
  for(const a of first){
    let best=-1,bestMm=Infinity;
    for(let i=0;i<second.length;i++){
      if(used.has(i)) continue;
      const b=second[i];
      const qa=normalizedBoardPoint(cal,a.xNorm,a.yNorm), qb=normalizedBoardPoint(cal,b.xNorm,b.yNorm);
      const mm=Math.hypot(qa.nx-qb.nx,qa.ny-qb.ny)*170;
      if(mm<bestMm){bestMm=mm;best=i;}
    }
    if(best<0 || bestMm>3.2) continue;
    used.add(best); const b=second[best];
    const wa=Math.max(.05,a.confidence),wb=Math.max(.05,b.confidence),sum=wa+wb;
    const xNorm=(a.xNorm*wa+b.xNorm*wb)/sum,yNorm=(a.yNorm*wa+b.yNorm*wb)/sum;
    const bp=normalizedBoardPoint(cal,xNorm,yNorm);
    const metric=localMetricMmPerPixel(cal,width,height,xNorm,yNorm);
    const passAgreement=clamp01(1-bestMm/3.2);
    out.push({
      ...a,xNorm,yNorm,distanceNorm:bp.distanceNorm,distanceMm:distanceMmFromNorm(bp.distanceNorm),
      confidence:clamp01((a.confidence+b.confidence)*.42+passAgreement*.16),
      frameAgreement:Math.min(1,(a.frameAgreement+b.frameAgreement)/2),
      sampleCount:(a.sampleCount||0)+(b.sampleCount||0),
      spreadMm:Math.sqrt((a.spreadMm*a.spreadMm+b.spreadMm*b.spreadMm+bestMm*bestMm*.25)/2),
      positionSpreadPx:bestMm/Math.max(.0001,metric.meanMmPerPixel),
      rereadAgreement:passAgreement,
      geometryConfidence:clamp01(((a.geometryConfidence||0)+(b.geometryConfidence||0))/2),
    });
  }
  return out.sort((a,b)=>b.confidence-a.confidence).slice(0,wanted);
}

export function estimateDistanceUncertaintyMm(confidence: number, calibration?: CameraCalibration | null) {
  const projectivePenalty = calibration?.v === 2 && Array.isArray((calibration as any).homography) ? Math.min(.55, Number((calibration as any).projectiveErrorMm || 0) * .075) : 0;
  const calibrationPenalty = calibration?.v === 2 ? projectivePenalty : .8;
  // The vision pipeline now performs sub-pixel registration and tip refinement.
  // Keep a conservative physical floor, but do not force every excellent frame
  // to the old 0.35 mm minimum when the calibrated source scale supports better.
  return Math.max(.22, .22 + (1 - clamp01(confidence)) * 2.9 + calibrationPenalty);
}

export function analyzeFrameStability(before: ImageData, after: ImageData, cal: CameraCalibration): FrameStability {
  const width = Math.min(before.width, after.width), height = Math.min(before.height, after.height);
  let changed = 0, total = 0, deltaSum = 0;
  for (let y = 2; y < height - 2; y += 6) for (let x = 2; x < width - 2; x += 6) {
    const xn = x / width, yn = y / height;
    if (normalizedBoardPoint(cal, xn, yn).distanceNorm > 1.03) continue;
    const i = (y * before.width + x) * 4;
    const j = (y * after.width + x) * 4;
    const delta = (Math.abs(before.data[i] - after.data[j]) + Math.abs(before.data[i + 1] - after.data[j + 1]) + Math.abs(before.data[i + 2] - after.data[j + 2])) / 3;
    deltaSum += delta; total++;
    if (delta > 28) changed++;
  }
  const changedFraction = total ? changed / total : 1;
  const meanDelta = total ? deltaSum / total : 255;
  // Three darts legitimately change a small part of the board. A moved camera changes a large fraction of edges/textures.
  const stable = changedFraction < .23 && meanDelta < 34;
  const confidence = clamp01(1 - (changedFraction / .28) * .62 - (meanDelta / 45) * .38);
  return { stable, changedFraction, meanDelta, confidence };
}

function estimateTipFromComponent(comp: number[], heat: Float32Array, cols: number, cell: number, width: number, height: number, cal: CameraCalibration) {
  const pts = comp.map(idx => {
    const cx = idx % cols, cy = Math.floor(idx / cols), w = heat[idx];
    return {
      xn: Math.min(1, ((cx + .5) * cell) / width),
      yn: Math.min(1, ((cy + .5) * cell) / height),
      w,
      d: 0,
    };
  });
  pts.forEach(p => { p.d = normalizedBoardPoint(cal, p.xn, p.yn).distanceNorm; });
  let sw = 0, mx = 0, my = 0;
  pts.forEach(p => { sw += p.w; mx += p.xn * p.w; my += p.yn * p.w; });
  mx /= sw || 1; my /= sw || 1;
  let cxx = 0, cyy = 0, cxy = 0;
  pts.forEach(p => { const dx = p.xn - mx, dy = p.yn - my; cxx += p.w * dx * dx; cyy += p.w * dy * dy; cxy += p.w * dx * dy; });
  const theta = .5 * Math.atan2(2 * cxy, cxx - cyy);
  const ax = Math.cos(theta), ay = Math.sin(theta), px = -ay, py = ax;
  const projected = pts.map(p => ({ ...p, t: (p.xn - mx) * ax + (p.yn - my) * ay, q: (p.xn - mx) * px + (p.yn - my) * py }));
  projected.sort((a, b) => a.t - b.t);
  const nEnd = Math.max(1, Math.ceil(projected.length * .22));
  const ends = [projected.slice(0, nEnd), projected.slice(-nEnd)];
  const endInfo = ends.map(group => {
    let wsum = 0, x = 0, y = 0, qMean = 0;
    group.forEach(p => { wsum += p.w; x += p.xn * p.w; y += p.yn * p.w; qMean += p.q * p.w; });
    x /= wsum || 1; y /= wsum || 1; qMean /= wsum || 1;
    let spread = 0; group.forEach(p => spread += p.w * Math.abs(p.q - qMean)); spread /= wsum || 1;
    return { x, y, spread, distance: normalizedBoardPoint(cal, x, y).distanceNorm };
  });
  const spreadRatio = Math.abs(endInfo[0].spread - endInfo[1].spread) / Math.max(.00001, endInfo[0].spread + endInfo[1].spread);
  let chosen = endInfo[0].spread <= endInfo[1].spread ? endInfo[0] : endInfo[1];
  // If the silhouette does not reveal a clearly narrower tip, use the centre-nearest endpoint as a conservative fallback.
  if (spreadRatio < .14) chosen = endInfo[0].distance <= endInfo[1].distance ? endInfo[0] : endInfo[1];
  return { xNorm: chosen.x, yNorm: chosen.y, geometryConfidence: clamp01(.48 + spreadRatio * .9) };
}

function refineTipAtPixelLevel(before: ImageData, after: ImageData, cal: CameraCalibration, tip:{xNorm:number;yNorm:number}) {
  const width=Math.min(before.width,after.width), height=Math.min(before.height,after.height);
  const cx=tip.xNorm*width, cy=tip.yNorm*height;
  const radius=18;
  const pts:{x:number;y:number;w:number}[]=[];
  let peak=0;
  for(let y=Math.max(1,Math.floor(cy-radius));y<=Math.min(height-2,Math.ceil(cy+radius));y++) for(let x=Math.max(1,Math.floor(cx-radius));x<=Math.min(width-2,Math.ceil(cx+radius));x++){
    const i=(y*before.width+x)*4,j=(y*after.width+x)*4;
    const delta=(Math.abs(before.data[i]-after.data[j])+Math.abs(before.data[i+1]-after.data[j+1])+Math.abs(before.data[i+2]-after.data[j+2]))/3;
    if(delta<20) continue;
    const spatial=Math.max(.04,1-Math.hypot(x-cx,y-cy)/(radius+1));
    const w=Math.pow(Math.max(0,delta-18),1.18)*spatial;
    pts.push({x,y,w}); peak=Math.max(peak,delta);
  }
  if(pts.length<5) return {...tip,refineConfidence:.22};

  let sw=0,mx=0,my=0;
  for(const p of pts){sw+=p.w;mx+=p.x*p.w;my+=p.y*p.w;} mx/=sw||1;my/=sw||1;
  let cxx=0,cyy=0,cxy=0;
  for(const p of pts){const dx=p.x-mx,dy=p.y-my;cxx+=p.w*dx*dx;cyy+=p.w*dy*dy;cxy+=p.w*dx*dy;}
  const theta=.5*Math.atan2(2*cxy,cxx-cyy),ax=Math.cos(theta),ay=Math.sin(theta),px=-ay,py=ax;
  const projected=pts.map(p=>({...p,t:(p.x-mx)*ax+(p.y-my)*ay,q:(p.x-mx)*px+(p.y-my)*py})).sort((a,b)=>a.t-b.t);
  const nEnd=Math.max(4,Math.ceil(projected.length*.16));
  const groups=[projected.slice(0,nEnd),projected.slice(-nEnd)];
  const endpoints=groups.map(group=>{
    let ws=0,x=0,y=0,qm=0;
    for(const p of group){ws+=p.w;x+=p.x*p.w;y+=p.y*p.w;qm+=p.q*p.w;} x/=ws||1;y/=ws||1;qm/=ws||1;
    let spread=0;for(const p of group) spread+=p.w*Math.abs(p.q-qm);spread/=ws||1;
    return {x,y,spread,coarseDistance:Math.hypot(x-cx,y-cy),t:(x-mx)*ax+(y-my)*ay};
  });
  const chosen=endpoints[0].coarseDistance<=endpoints[1].coarseDistance?endpoints[0]:endpoints[1];

  // Sub-pixel centroid near the selected endpoint.
  let fs=0,fx=0,fy=0,localPeak=0,localN=0;
  for(let y=Math.max(1,Math.floor(chosen.y-3));y<=Math.min(height-2,Math.ceil(chosen.y+3));y++) for(let x=Math.max(1,Math.floor(chosen.x-3));x<=Math.min(width-2,Math.ceil(chosen.x+3));x++){
    const i=(y*before.width+x)*4,j=(y*after.width+x)*4;
    const delta=(Math.abs(before.data[i]-after.data[j])+Math.abs(before.data[i+1]-after.data[j+1])+Math.abs(before.data[i+2]-after.data[j+2]))/3;
    if(delta<18) continue;
    const ww=Math.pow(delta-17,1.25);fs+=ww;fx+=x*ww;fy+=y*ww;localPeak=Math.max(localPeak,delta);localN++;
  }
  let x=fs?fx/fs:chosen.x,y=fs?fy/fs:chosen.y;

  // Boundary extrapolation along the dart's principal axis. A centroid is
  // inherently biased slightly toward the shaft; the board contact is the
  // terminal edge of the silhouette. We detect that contrast edge at 1/4 px.
  const sign=chosen.t>=0?1:-1,dirX=ax*sign,dirY=ay*sign;
  const profile:{s:number;d:number}[]=[];
  for(let step=-16;step<=28;step++){
    const ss=step*.25;
    profile.push({s:ss,d:rgbDeltaBilinear(before,after,chosen.x+dirX*ss,chosen.y+dirY*ss)});
  }
  const inner=profile.filter(v=>v.s>=-2.5&&v.s<=.5).map(v=>v.d).sort((a,b)=>a-b);
  const innerMedian=inner.length?inner[Math.floor(inner.length/2)]:0;
  const edgeThreshold=Math.max(10,Math.min(34,innerMedian*.38));
  let crossing:number|null=null;
  for(let i=1;i<profile.length;i++){
    const a=profile[i-1],b=profile[i];
    if(a.s<-.5) continue;
    if(a.d>=edgeThreshold&&b.d<edgeThreshold){
      const frac=(a.d-edgeThreshold)/Math.max(.001,a.d-b.d);
      crossing=a.s+(b.s-a.s)*Math.max(0,Math.min(1,frac));
    }
  }
  let boundaryConfidence=0;
  if(crossing!=null && crossing>=-.5 && crossing<=6.5 && innerMedian>=18){
    const bx=chosen.x+dirX*crossing,by=chosen.y+dirY*crossing;
    const move=Math.hypot(bx-x,by-y);
    if(move<=5.5){
      boundaryConfidence=clamp01((innerMedian-16)/55)*clamp01(1-Math.max(0,move-3.5)/2);
      const blend=.58+.30*boundaryConfidence;
      x=x*(1-blend)+bx*blend;
      y=y*(1-blend)+by*blend;
    }
  }

  const axisMajor=Math.max(cxx,cyy), axisMinor=Math.max(1,Math.min(cxx,cyy));
  const elongation=Math.min(5,Math.sqrt(axisMajor/axisMinor));
  const confidence=clamp01(.37+Math.min(.17,pts.length/180)+Math.min(.12,peak/900)+Math.min(.10,localN/45)+Math.min(.12,(elongation-1)/5)+boundaryConfidence*.18);
  return {xNorm:x/width,yNorm:y/height,refineConfidence:confidence,subpixelX:x-Math.round(x),subpixelY:y-Math.round(y),boundaryConfidence};
}

export function fuseDetectionFrames(frames: VisionDetection[][], wanted=3): DetectionConsensus[] {
  const all=frames.flatMap((items,frameIndex)=>items.map(item=>({...item,frameIndex})));
  const clusters:any[]=[];
  const threshold=.0048;
  for(const item of all){
    let best:any=null,bestD=Infinity;
    for(const c of clusters){
      const dx=item.xNorm-c.x,dy=item.yNorm-c.y,dd=Math.hypot(dx,dy);
      if(dd<threshold&&dd<bestD){best=c;bestD=dd;}
    }
    if(!best){best={x:item.xNorm,y:item.yNorm,items:[]};clusters.push(best);}
    best.items.push(item);
    // Track the cluster centre with confidence weighting so a weak/noisy candidate
    // cannot pull a strong multi-frame track away from the actual dart tip.
    let sw=0,sx=0,sy=0;
    for(const v of best.items){
      const w=Math.max(.08,Number(v.confidence||0))*Math.max(.35,Number(v.geometryConfidence||.6));
      sw+=w;sx+=v.xNorm*w;sy+=v.yNorm*w;
    }
    best.x=sx/Math.max(.0001,sw); best.y=sy/Math.max(.0001,sw);
  }

  return clusters.map(c=>{
    // Keep at most the strongest observation for each source frame. This prevents
    // duplicate blobs in one frame from artificially increasing sampleCount.
    const byFrame=new Map<number,any>();
    for(const v of c.items){
      const prev=byFrame.get(v.frameIndex);
      if(!prev || Number(v.confidence||0)>Number(prev.confidence||0)) byFrame.set(v.frameIndex,v);
    }
    let items=[...byFrame.values()];
    if(!items.length) return null;

    // Robust distance gate: remove observations that are far away from the
    // median track. A single reflection/motion artefact must not move a close
    // millimetre-level ranking.
    const rawDistances=items.map((v:any)=>Number(v.distanceMm)).filter(Number.isFinite).sort((a:number,b:number)=>a-b);
    const med=rawDistances[Math.floor(rawDistances.length/2)] ?? 0;
    const dev=rawDistances.map((d:number)=>Math.abs(d-med)).sort((a:number,b:number)=>a-b);
    const mad=dev[Math.floor(dev.length/2)] ?? 0;
    const robustGate=Math.max(.55,Math.min(2.2,mad*3.2+.25));
    const filtered=items.filter((v:any)=>Math.abs(Number(v.distanceMm)-med)<=robustGate);
    if(filtered.length>=Math.max(2,Math.ceil(items.length*.67))) items=filtered;

    let sw=0,xw=0,yw=0,dw=0,nw=0;
    for(const v of items){
      const baseW=Math.max(.08,Number(v.confidence||0))*Math.max(.35,Number(v.geometryConfidence||.6));
      const residual=Math.abs(Number(v.distanceMm)-med);
      const robustW=1/(1+Math.pow(residual/Math.max(.35,robustGate*.55),2));
      const w=baseW*robustW;
      sw+=w;xw+=Number(v.xNorm)*w;yw+=Number(v.yNorm)*w;
      dw+=Number(v.distanceMm)*w;nw+=Number(v.distanceNorm)*w;
    }
    const xNorm=xw/Math.max(.0001,sw),yNorm=yw/Math.max(.0001,sw);
    const distanceMm=dw/Math.max(.0001,sw);
    const distanceNorm=nw/Math.max(.0001,sw);
    const uniqueFrames=new Set(items.map((v:any)=>v.frameIndex)).size;
    const frameAgreement=frames.length?uniqueFrames/frames.length:0;
    const spreadMm=Math.sqrt(items.reduce((sum:number,v:any)=>sum+Math.pow(Number(v.distanceMm)-distanceMm,2),0)/Math.max(1,items.length));
    const coordSpreadNorm=Math.sqrt(items.reduce((sum:number,v:any)=>sum+(Number(v.xNorm)-xNorm)**2+(Number(v.yNorm)-yNorm)**2,0)/Math.max(1,items.length));
    const base=items.reduce((sum:number,v:any)=>sum+Number(v.confidence||0),0)/Math.max(1,items.length);
    const outlierPenalty=Math.max(0,(byFrame.size-items.length)/Math.max(1,byFrame.size))*.12;
    return {
      xNorm,yNorm,distanceMm,distanceNorm,
      area:items.reduce((s:number,v:any)=>s+Number(v.area||0),0)/items.length,
      geometryConfidence:items.reduce((s:number,v:any)=>s+Number(v.geometryConfidence||0),0)/items.length,
      confidence:clamp01(base*.70+frameAgreement*.30-Math.min(.22,spreadMm/10)-outlierPenalty),
      frameAgreement,sampleCount:items.length,spreadMm,positionSpreadPx:coordSpreadNorm*1000,
      rejectedFrameSamples:Math.max(0,byFrame.size-items.length),
    };
  }).filter((x:any)=>x && x.frameAgreement>=.75 && x.sampleCount>=3)
    .sort((a:any,b:any)=>b.confidence-a.confidence)
    .slice(0,wanted) as DetectionConsensus[];
}

export function analyzeFrameDifference(before: ImageData, after: ImageData, cal: CameraCalibration, wanted = 3): VisionDetection[] {
  const width = Math.min(before.width, after.width), height = Math.min(before.height, after.height);
  const a = before.data, b = after.data;
  // Estimate sensor/exposure noise on sparse board pixels, then adapt the foreground threshold.
  const noiseSamples:number[]=[];
  for(let y=8;y<height-8;y+=24) for(let x=8;x<width-8;x+=24){
    if(normalizedBoardPoint(cal,x/width,y/height).distanceNorm>1.02) continue;
    const i=(y*before.width+x)*4,j=(y*after.width+x)*4;
    noiseSamples.push((Math.abs(a[i]-b[j])+Math.abs(a[i+1]-b[j+1])+Math.abs(a[i+2]-b[j+2]))/3);
  }
  noiseSamples.sort((x,y)=>x-y);
  const noiseP75=noiseSamples.length?noiseSamples[Math.floor(noiseSamples.length*.75)]:10;
  const deltaThreshold=Math.max(24,Math.min(46,noiseP75*2.15+10));
  const cell = 3;
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  const heat = new Float32Array(cols * rows);
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    const xn = x / width, yn = y / height;
    const pt = normalizedBoardPoint(cal, xn, yn);
    if (pt.distanceNorm > 1.08) continue;
    const i = (y * before.width + x) * 4;
    const j = (y * after.width + x) * 4;
    const dr = Math.abs(a[i] - b[j]), dg = Math.abs(a[i + 1] - b[j + 1]), db = Math.abs(a[i + 2] - b[j + 2]);
    const delta = (dr + dg + db) / 3;
    if (delta < deltaThreshold) continue;
    heat[Math.floor(y / cell) * cols + Math.floor(x / cell)] += delta;
  }

  const hot = new Set<number>();
  const heatThreshold=Math.max(150,deltaThreshold*5.1);
  for (let i = 0; i < heat.length; i++) if (heat[i] > heatThreshold) hot.add(i);
  const comps: number[][] = [];
  while (hot.size) {
    const seed = hot.values().next().value; hot.delete(seed);
    const q = [seed], comp = [];
    while (q.length) {
      const cur = q.pop()!; comp.push(cur);
      const cx = cur % cols, cy = Math.floor(cur / cols);
      for (let yy = Math.max(0, cy - 1); yy <= Math.min(rows - 1, cy + 1); yy++) for (let xx = Math.max(0, cx - 1); xx <= Math.min(cols - 1, cx + 1); xx++) {
        const ni = yy * cols + xx;
        if (hot.has(ni)) { hot.delete(ni); q.push(ni); }
      }
    }
    if (comp.length >= 3) comps.push(comp);
  }

  const candidates = comps.map(comp => {
    let peak = 0;
    comp.forEach(idx => { peak = Math.max(peak, heat[idx]); });
    const tip = estimateTipFromComponent(comp, heat, cols, cell, width, height, cal);
    const refined = refineTipAtPixelLevel(before, after, cal, tip);
    const bp = normalizedBoardPoint(cal, refined.xNorm, refined.yNorm);
    const area = comp.length * cell * cell;
    const shapeConfidence = clamp01((comp.length - 2) / 18);
    const contrastConfidence = clamp01(peak / 900);
    const confidence = clamp01(.27 + .22 * shapeConfidence + .17 * contrastConfidence + .20 * tip.geometryConfidence + .14 * refined.refineConfidence);
    return {
      xNorm: refined.xNorm, yNorm: refined.yNorm,
      distanceNorm: bp.distanceNorm, distanceMm: distanceMmFromNorm(bp.distanceNorm),
      confidence, area, geometryConfidence: tip.geometryConfidence,
    };
  }).filter(x => x.distanceNorm <= 1.06 && x.area >= 52)
    .sort((p, q) => q.area - p.area)
    .slice(0, Math.max(wanted, 6));

  const out: VisionDetection[] = [];
  for (const c of candidates) {
    if (out.some(o => Math.hypot(o.xNorm - c.xNorm, o.yNorm - c.yNorm) < .0048)) continue;
    out.push(c);
    if (out.length >= wanted) break;
  }
  return out;
}

export function rankImpacts(impacts: ClosestCenterImpact[], pointsMode: "descending" | "winner" = "descending") {
  const sorted = [...impacts].sort((a, b) => a.distanceMm - b.distanceMm);
  return sorted.map((impact, index) => {
    const previous = sorted[index - 1];
    const uncertaintyMm = impact.uncertaintyMm ?? estimateDistanceUncertaintyMm(impact.confidence);
    const prevUncertainty = previous ? (previous.uncertaintyMm ?? estimateDistanceUncertaintyMm(previous.confidence)) : 0;
    const gapToPreviousMm = previous ? impact.distanceMm - previous.distanceMm : null;
    const ambiguityMarginMm = previous ? Math.max(.35, (uncertaintyMm + prevUncertainty) * .55) : 0;
    const ambiguousWithPrevious = !!previous && Number(gapToPreviousMm) <= ambiguityMarginMm;
    const separationConfidence = previous ? clamp01((Number(gapToPreviousMm) - ambiguityMarginMm * .35) / Math.max(.35, ambiguityMarginMm * 1.65)) : 1;
    return {
      ...impact,
      rank: index + 1,
      points: pointsMode === "winner" ? (index === 0 ? 1 : 0) : Math.max(0, 5 - index),
      uncertaintyMm,
      gapToPreviousMm,
      ambiguityMarginMm,
      separationConfidence,
      ambiguousWithPrevious,
    };
  });
}
