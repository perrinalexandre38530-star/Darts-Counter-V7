import sharp from "sharp";

function distance3(r,g,b,br,bg,bb){
  const dr=r-br,dg=g-bg,db=b-bb;
  return Math.sqrt(dr*dr+dg*dg+db*db);
}
function clamp01(v){return Math.max(0,Math.min(1,v));}

async function rawRgb(file,width=192,height=192){
  const {data,info}=await sharp(file,{failOn:"none"})
    .flatten({background:{r:239,g:239,b:239}})
    .resize(width,height,{fit:"fill"})
    .removeAlpha()
    .raw()
    .toBuffer({resolveWithObject:true});
  return {data,info};
}

function cornerBackground(data,width,height,channels){
  const sample=Math.max(4,Math.round(Math.min(width,height)*0.08));
  const boxes=[[0,0],[width-sample,0],[0,height-sample],[width-sample,height-sample]];
  let r=0,g=0,b=0,n=0;
  for(const [sx,sy] of boxes){
    for(let y=sy;y<sy+sample;y++)for(let x=sx;x<sx+sample;x++){
      const i=(y*width+x)*channels;r+=data[i];g+=data[i+1];b+=data[i+2];n++;
    }
  }
  return {r:r/Math.max(1,n),g:g/Math.max(1,n),b:b/Math.max(1,n)};
}

export async function analyzePilotStep(file,{foregroundDistance=34}={}){
  const {data,info}=await rawRgb(file);
  const {width,height,channels}=info;
  const bg=cornerBackground(data,width,height,channels);
  let fg=0,minX=width,minY=height,maxX=-1,maxY=-1;
  let border=0,borderRed=0;
  const borderPx=Math.max(3,Math.round(Math.min(width,height)*0.08));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*channels;const r=data[i],g=data[i+1],b=data[i+2];
    const d=distance3(r,g,b,bg.r,bg.g,bg.b);
    if(d>foregroundDistance){fg++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
    if(x<borderPx||x>=width-borderPx||y<borderPx||y>=height-borderPx){
      border++;
      if(r>145 && r>g*1.35 && r>b*1.35)borderRed++;
    }
  }
  const total=width*height;
  const coverage=fg/Math.max(1,total);
  const bbox=maxX>=0?{minX:minX/width,maxX:maxX/width,minY:minY/height,maxY:maxY/height}:null;
  const margins=bbox?{left:bbox.minX,right:1-bbox.maxX,top:bbox.minY,bottom:1-bbox.maxY}:null;
  const reasons=[];
  if(!bbox||coverage<0.025)reasons.push("NO_OR_TINY_SUBJECT");
  if(coverage>0.72)reasons.push("SUBJECT_TOO_LARGE");
  if(margins&&Math.min(margins.left,margins.right,margins.top,margins.bottom)<0.018)reasons.push("SUBJECT_OR_EQUIPMENT_TOUCHES_FRAME");
  const redBorderRatio=borderRed/Math.max(1,border);
  if(redBorderRatio>0.035)reasons.push("RED_BORDER_ARTIFACT");
  const bgSpread=Math.max(bg.r,bg.g,bg.b)-Math.min(bg.r,bg.g,bg.b);
  if(bgSpread>65)reasons.push("BACKGROUND_NOT_NEUTRAL");
  return {
    file,width,height,
    background:{r:Math.round(bg.r),g:Math.round(bg.g),b:Math.round(bg.b)},
    coverage:Number(clamp01(coverage).toFixed(4)),
    bbox:bbox?Object.fromEntries(Object.entries(bbox).map(([k,v])=>[k,Number(clamp01(v).toFixed(4))])):null,
    margins:margins?Object.fromEntries(Object.entries(margins).map(([k,v])=>[k,Number(clamp01(v).toFixed(4))])):null,
    redBorderRatio:Number(redBorderRatio.toFixed(4)),
    pass:reasons.length===0,
    reasons,
  };
}

export async function validatePilotStepPack(files){
  const analyses=[];
  for(const file of files)analyses.push(await analyzePilotStep(file));
  const reasons=[];
  for(const [i,a] of analyses.entries())for(const reason of a.reasons||[])reasons.push(`STEP_${i+1}_${reason}`);
  return {pass:reasons.length===0,reasons,analyses};
}
