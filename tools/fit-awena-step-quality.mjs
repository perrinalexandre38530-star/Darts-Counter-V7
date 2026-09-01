import sharp from "sharp";

function clamp01(v){return Math.max(0,Math.min(1,v));}

export async function analyzeTransparentStep(file,{alphaThreshold=12}={}){
  const image=sharp(file,{failOn:"none"}).ensureAlpha();
  const {data,info}=await image.raw().toBuffer({resolveWithObject:true});
  const {width,height,channels}=info;
  if(!width||!height||channels<4)throw new Error(`Image step illisible: ${file}`);
  let minX=width,minY=height,maxX=-1,maxY=-1,opaque=0,semi=0;
  const total=width*height;
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){
      const a=data[(y*width+x)*channels+3];
      if(a>alphaThreshold){
        opaque++;
        if(a<245)semi++;
        if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
      }
    }
  }
  if(maxX<0)return {file,width,height,hasVisibleSubject:false,pass:false,reasons:["NO_VISIBLE_SUBJECT"]};
  const margins={
    left:minX/width,
    right:(width-1-maxX)/width,
    top:minY/height,
    bottom:(height-1-maxY)/height,
  };
  const alphaCoverage=opaque/total;
  const bboxCoverage=((maxX-minX+1)*(maxY-minY+1))/total;
  const reasons=[];
  if(alphaCoverage<0.035)reasons.push("SUBJECT_TOO_SMALL");
  if(alphaCoverage>0.88)reasons.push("BACKGROUND_NOT_TRANSPARENT");
  if(Math.min(margins.left,margins.right,margins.top,margins.bottom)<0.012)reasons.push("SUBJECT_OR_EQUIPMENT_TOUCHES_FRAME_EDGE");
  if(bboxCoverage>0.94)reasons.push("INSUFFICIENT_SAFETY_MARGIN");
  return {
    file,width,height,hasVisibleSubject:true,alphaCoverage:Number(alphaCoverage.toFixed(4)),bboxCoverage:Number(bboxCoverage.toFixed(4)),
    margins:Object.fromEntries(Object.entries(margins).map(([k,v])=>[k,Number(v.toFixed(4))])),
    semiTransparentRatio:Number((semi/Math.max(1,opaque)).toFixed(4)),pass:reasons.length===0,reasons,
  };
}

async function compactLuma(file){
  const {data}=await sharp(file,{failOn:"none"}).flatten({background:"black"}).resize(48,48,{fit:"fill"}).greyscale().raw().toBuffer({resolveWithObject:true});
  return data;
}
export async function imageDifference(a,b){
  const [aa,bb]=await Promise.all([compactLuma(a),compactLuma(b)]);
  const n=Math.min(aa.length,bb.length);let sum=0;
  for(let i=0;i<n;i++)sum+=Math.abs(aa[i]-bb[i]);
  return n?sum/(n*255):0;
}

export async function validateStepPack(files,{equipmentIntegrityRequired=false,minPoseDifference=0.025}={}){
  const analyses=[];
  for(const file of files)analyses.push(await analyzeTransparentStep(file));
  const pairDifferences=[];
  for(let i=1;i<files.length;i++)pairDifferences.push(await imageDifference(files[i-1],files[i]));
  const reasons=[];
  for(const [i,a] of analyses.entries())for(const r of a.reasons||[])reasons.push(`STEP_${i+1}_${r}`);
  if(pairDifferences.some(v=>v<minPoseDifference))reasons.push("POSES_TOO_SIMILAR");
  // Pixel analysis cannot prove dumbbell/barbell integrity. Weighted exercises
  // must therefore come from DEDICATED_STILLS, never copied legacy frames.
  return {pass:reasons.length===0,reasons,equipmentIntegrityRequired,analyses,pairDifferences:pairDifferences.map(v=>Number(v.toFixed(4)))};
}
