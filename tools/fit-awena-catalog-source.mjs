import fs from "node:fs/promises";
import path from "node:path";

export const FREE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
export const WGER_URL = "https://wger.de/api/v2/exerciseinfo/?limit=250";
export const CACHE_FILE = path.resolve("var/fit-awena/catalog-source.json");

const NATIVE = [
  ["bench","Développé couché","Pectoraux","Barre"],
  ["incline-db","Développé incliné","Pectoraux","Haltères"],
  ["cable-fly","Écarté poulie","Pectoraux","Poulie"],
  ["pullup","Tractions","Dos","Poids du corps"],
  ["row","Rowing barre","Dos","Barre"],
  ["lat-pulldown","Tirage vertical","Dos","Poulie"],
  ["ohp","Développé militaire","Épaules","Barre"],
  ["lateral-raise","Élévations latérales","Épaules","Haltères"],
  ["curl","Curl biceps","Biceps","Haltères"],
  ["triceps-push","Extension triceps","Triceps","Poulie"],
  ["squat","Squat","Quadriceps","Barre"],
  ["leg-press","Presse à cuisses","Quadriceps","Machine"],
  ["rdl","Soulevé de terre roumain","Ischios","Barre"],
  ["hip-thrust","Hip thrust","Fessiers","Barre"],
  ["calf","Mollets debout","Mollets","Machine"],
  ["plank","Gainage","Abdos","Poids du corps"],
  ["deadlift","Soulevé de terre","Full body","Barre"],
  ["goblet","Goblet squat","Quadriceps","Kettlebell"],
].map(([id,name,muscle,equipment]) => ({ id, name, muscle, equipment, source:"mss", instructions:[], imagePaths:[], videoUrls:[] }));

const muscleMap = {
  abdominals:"Abdos", abductors:"Abducteurs", adductors:"Adducteurs", biceps:"Biceps", calves:"Mollets", chest:"Pectoraux",
  forearms:"Avant-bras", glutes:"Fessiers", hamstrings:"Ischios", lats:"Dos", "lower back":"Lombaires", "middle back":"Dos", neck:"Cou",
  quadriceps:"Quadriceps", shoulders:"Épaules", traps:"Dos", triceps:"Triceps",
};
const aliases = {
  "developpe couche":"bench press", "developpe incline":"incline press", "ecarte poulie":"cable fly", tractions:"pull up", "rowing barre":"barbell row",
  "tirage vertical":"lat pulldown", "developpe militaire":"military press", "elevations laterales":"lateral raise", "curl biceps":"biceps curl",
  "extension triceps":"triceps pushdown", "presse a cuisses":"leg press", "souleve de terre roumain":"romanian deadlift", "mollets debout":"standing calf raise",
  gainage:"plank", "souleve de terre":"deadlift",
};


const REDUNDANT_VARIANT_WORDS = new Set([
  "exercise", "movement", "version", "variation", "variant", "powerlifting", "bodybuilding", "strength", "fitness",
  "beginner", "intermediate", "advanced", "male", "female", "medium", "standard", "classic", "regular",
]);
function cleanEnglishTitle(value){return String(value||"").replace(/[_]+/g," ").replace(/\s*[-–—]\s*/g," - ").replace(/\s+/g," ").trim();}

const text = (v) => typeof v === "string" ? v.trim() : "";
const arr = (v) => Array.isArray(v) ? v : [];
const unique = (v) => [...new Set((v||[]).map((x)=>String(x||"").trim()).filter(Boolean))];

export function assetKey(exercise) {
  return String(exercise?.id || exercise?.name || "exercise").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,110) || "exercise";
}

function normalizeName(value) {
  const v=String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/\b(push[ -]?ups?)\b/g,"push up").replace(/\b(pull[ -]?ups?)\b/g,"pull up").replace(/\b(lat pulldowns?)\b/g,"lat pulldown").replace(/\b(bicep curls?)\b/g,"biceps curl").replace(/\b(tricep pushdowns?)\b/g,"triceps pushdown").replace(/\b(the|a|an)\b/g," ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
  return aliases[v] || v;
}
function equipmentNoiseWords(exercise){const out=new Set();if(exercise.equipment==="Barre")["barbell","bar","barre"].forEach(w=>out.add(w));if(exercise.equipment==="Haltères")["dumbbell","dumbbells"].forEach(w=>out.add(w));if(exercise.equipment==="Kettlebell")["kettlebell","kettlebells"].forEach(w=>out.add(w));if(exercise.equipment==="Poulie")["cable","cables","pulley"].forEach(w=>out.add(w));if(exercise.equipment==="Machine")out.add("machine");if(exercise.equipment==="Élastique")["band","bands","resistance"].forEach(w=>out.add(w));return out;}
function canonicalVariantName(exercise){const normalized=normalizeName(exercise.name);if(!normalized)return "";const noise=equipmentNoiseWords(exercise),tokens=normalized.split(" ").filter(Boolean);return tokens.filter((token,index)=>{if(REDUNDANT_VARIANT_WORDS.has(token)||noise.has(token))return false;if(token==="grip"){const prev=tokens[index-1];return ["close","wide","reverse","neutral","narrow"].includes(prev);}return true;}).join(" ").replace(/\s+/g," ").trim();}

function equipmentFree(v) {
  const k=text(v).toLowerCase();
  if (!k || k==="body only" || k==="bodyweight" || k==="none") return "Poids du corps";
  if (k.includes("barbell") || k.includes("e-z")) return "Barre";
  if (k.includes("dumbbell")) return "Haltères";
  if (k.includes("kettlebell")) return "Kettlebell";
  if (k.includes("cable")) return "Poulie";
  if (k.includes("machine") || k.includes("sled")) return "Machine";
  if (k.includes("band")) return "Élastique";
  if (k.includes("trx") || k.includes("suspension")) return "TRX";
  if (k.includes("bench")) return "Banc";
  if (k.includes("medicine ball")) return "Médecine ball";
  return "Autre";
}
function mapWgerMuscle(v) {
  const k=text(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if (/pector|chest/.test(k)) return "Pectoraux";
  if (/latissimus|trapez|rhomboid|teres major/.test(k)) return "Dos";
  if (/erector|quadratus lumb|lower back/.test(k)) return "Lombaires";
  if (/deltoid|shoulder/.test(k)) return "Épaules";
  if (/biceps brachii|brachialis/.test(k)) return "Biceps";
  if (/triceps/.test(k)) return "Triceps";
  if (/forearm|brachioradialis|flexor carpi|extensor carpi/.test(k)) return "Avant-bras";
  if (/rectus abdom|obliqu|transversus abdom|serratus/.test(k)) return "Abdos";
  if (/gluteus maxim/.test(k)) return "Fessiers";
  if (/gluteus med|gluteus minim|tensor fascia/.test(k)) return "Abducteurs";
  if (/adductor|gracilis/.test(k)) return "Adducteurs";
  if (/quadriceps|rectus femoris|vastus/.test(k)) return "Quadriceps";
  if (/biceps femoris|hamstring|semitend|semimembr/.test(k)) return "Ischios";
  if (/gastrocnem|soleus|calf/.test(k)) return "Mollets";
  if (/sternocleid|neck/.test(k)) return "Cou";
  return null;
}
function equipmentWger(value) {
  const names=arr(value).map((x)=>text(x?.name).toLowerCase()).filter(Boolean); const k=names.join(" ");
  if (!k || /none|bodyweight|body weight/.test(k)) return "Poids du corps";
  if (/dumbbell/.test(k)) return "Haltères"; if (/barbell|sz-bar|ez-bar|ez bar/.test(k)) return "Barre"; if (/kettlebell/.test(k)) return "Kettlebell";
  if (/cable|pulley/.test(k)) return "Poulie"; if (/resistance band|band/.test(k)) return "Élastique"; if (/suspension|trx/.test(k)) return "TRX";
  if (/bench/.test(k)) return "Banc"; if (/medicine ball|medicineball/.test(k)) return "Médecine ball"; if (/machine|station|sled/.test(k)) return "Machine"; return "Autre";
}
function plain(v) { return text(v).replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/li>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s*\n\s*/g,"\n").replace(/[ \t]+/g," ").trim(); }
function instructions(v) { const b=plain(v); return b ? unique(b.split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/).map((x)=>x.replace(/^[-•*\d.)\s]+/,"").trim()).filter((x)=>x.length>=8)).slice(0,10) : []; }

async function fetchJson(url, timeoutMs=30000) {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try { const r=await fetch(url,{headers:{Accept:"application/json"},signal:controller.signal}); if(!r.ok) throw new Error(`${r.status} ${r.statusText}`); return await r.json(); }
  finally { clearTimeout(timer); }
}

async function loadFree() {
  const payload=await fetchJson(FREE_URL,45000); if(!Array.isArray(payload)) throw new Error("Free Exercise DB format inattendu");
  return payload.map((row)=>{
    const primary=arr(row?.primaryMuscles).map(text).filter(Boolean); const secondary=arr(row?.secondaryMuscles).map(text).filter(Boolean);
    const sourceName=cleanEnglishTitle(text(row?.name)); const name=sourceName.toLowerCase()==="barbell bench press - medium grip"?"Bench Press":sourceName;
    return { id:`fedb:${text(row?.id)}`, name, muscle:muscleMap[String(primary[0]||"").toLowerCase()]||"Full body", equipment:equipmentFree(row?.equipment), source:"free-exercise-db", level:text(row?.level), category:text(row?.category), instructions:arr(row?.instructions).map(text).filter(Boolean), imagePaths:arr(row?.images).map(text).filter(Boolean), videoUrls:[], rawPrimaryMuscles:primary, rawSecondaryMuscles:secondary };
  }).filter((x)=>x.id!=="fedb:"&&x.name);
}

async function loadWger() {
  const rows=[]; let next=WGER_URL; let pages=0;
  while(next&&pages<12){ const payload=await fetchJson(next,45000); const current=arr(payload?.results); rows.push(...current); next=text(payload?.next)||null; pages++; if(!current.length)break; }
  return rows.map((row)=>{
    const translations=arr(row?.translations); const tr=translations.find((x)=>Number(x?.language)===2&&Boolean(text(x?.name)))||null;
    const name=cleanEnglishTitle(text(tr?.name)); const sid=text(row?.uuid)||String(Number(row?.id)||""); if(!name||!sid)return null;
    const primary=arr(row?.muscles).map((x)=>text(x?.name_en)||text(x?.name)).filter(Boolean); const secondary=arr(row?.muscles_secondary).map((x)=>text(x?.name_en)||text(x?.name)).filter(Boolean);
    const muscle=primary.map(mapWgerMuscle).find(Boolean)||"Full body";
    const images=arr(row?.images).filter((x)=>text(x?.image)).sort((a,b)=>Number(Boolean(b?.is_main))-Number(Boolean(a?.is_main))).map((x)=>text(x?.image));
    const videos=arr(row?.videos).filter((x)=>text(x?.video)).sort((a,b)=>Number(Boolean(b?.is_main))-Number(Boolean(a?.is_main))).map((x)=>text(x?.video));
    return { id:`wger:${sid}`, name, muscle, equipment:equipmentWger(row?.equipment), source:"wger", category:text(row?.category?.name), instructions:instructions(tr?.description_source||tr?.description), imagePaths:unique(images), videoUrls:unique(videos), rawPrimaryMuscles:primary, rawSecondaryMuscles:secondary };
  }).filter(Boolean);
}

function signature(x){const name=canonicalVariantName(x)||normalizeName(x.name);return `${name}|${x.muscle}|${x.equipment}`;}
function score(x){ return (x.source==="mss"?1000:x.source==="free-exercise-db"?30:20)+Math.min(20,(x.instructions?.length||0)*2)+Math.min(16,(x.imagePaths?.length||0)*4)+Math.min(8,(x.videoUrls?.length||0)*4); }
function merge(a,b){ const p=score(a)>=score(b)?a:b, q=p===a?b:a; return {...p, instructions:unique([...(p.instructions||[]),...(q.instructions||[])]).slice(0,14),imagePaths:unique([...(p.imagePaths||[]),...(q.imagePaths||[])]).slice(0,12),videoUrls:unique([...(p.videoUrls||[]),...(q.videoUrls||[])]).slice(0,8),rawPrimaryMuscles:unique([...(p.rawPrimaryMuscles||[]),...(q.rawPrimaryMuscles||[])]),rawSecondaryMuscles:unique([...(p.rawSecondaryMuscles||[]),...(q.rawSecondaryMuscles||[])])}; }
export function mergeCatalogs(catalogs){ const byId=new Map(); for(const cat of catalogs)for(const x of cat){if(!x?.id||!x?.name)continue;byId.set(x.id,byId.has(x.id)?merge(byId.get(x.id),x):x);} const bySig=new Map(); for(const x of byId.values()){const k=signature(x);bySig.set(k,bySig.has(k)?merge(bySig.get(k),x):x);} return [...bySig.values()].sort((a,b)=>a.name.localeCompare(b.name,"fr",{sensitivity:"base"})); }

export async function loadCatalog({refresh=false, allowCache=true}={}) {
  if(!refresh&&allowCache){ try { const cached=JSON.parse(await fs.readFile(CACHE_FILE,"utf8")); if(Array.isArray(cached?.exercises)&&cached.exercises.length>100)return cached; } catch {} }
  const [free,wger]=await Promise.allSettled([loadFree(),loadWger()]);
  const freeRows=free.status==="fulfilled"?free.value:[]; const wgerRows=wger.status==="fulfilled"?wger.value:[];
  if(!freeRows.length&&!wgerRows.length&&allowCache){ try{return JSON.parse(await fs.readFile(CACHE_FILE,"utf8"));}catch{} }
  const exercises=mergeCatalogs([NATIVE,freeRows,wgerRows]);
  const result={generatedAt:new Date().toISOString(),exercises,sources:{mss:NATIVE.length,freeExerciseDb:freeRows.length,wger:wgerRows.length},errors:[free.status==="rejected"?`free: ${free.reason}`:null,wger.status==="rejected"?`wger: ${wger.reason}`:null].filter(Boolean)};
  await fs.mkdir(path.dirname(CACHE_FILE),{recursive:true}); await fs.writeFile(CACHE_FILE,JSON.stringify(result,null,2)); return result;
}
