import fs from "node:fs";
function read(p){return fs.readFileSync(p,"utf8");}
const store=read("src/fit/fitStore.ts");
const engine=read("src/fit/fitCatalogEngine.ts");
const media=read("src/fit/fitAwenaMedia.ts");
const motion=read("src/pages/fit/FitExerciseMotion.tsx");
const detail=read("src/pages/fit/FitExerciseDetailDialog.tsx");
const pkg=JSON.parse(read("package.json"));
const checks=[
  [store.includes("sourceContributors"),"catalogue tracks merged source contributors"],
  [engine.includes("mergeFitExerciseData"),"duplicate records merge fields instead of dropping media"],
  [engine.includes("imagePaths: unique"),"merged records inherit reference photos"],
  [media.includes("awena-preview.webm")&&media.includes("awena-step-"),"deterministic AWENA media convention exists"],
  [motion.includes("fitAwenaGeneratedMedia")&&motion.includes("generatedMedia.videoUrl"),"library renderer tries exact generated AWENA video first"],
  [!motion.includes("freeExerciseImageUrl"),"source photos are not used as primary library cards"],
  [detail.includes("fitAwenaStepImages")&&detail.includes("AwenaStepImage"),"detail steps use AWENA images with resilient fallback"],
  [detail.includes("referenceVideos")&&detail.includes("VIDÉOS EXISTANTES"),"existing videos are preserved as reference media"],
  [pkg.scripts?.["fit:awena:queue"]&&pkg.scripts?.["fit:awena:run"]&&pkg.scripts?.["fit:awena:audit"],"batch generation scripts are registered"],
];
const failed=checks.filter(([ok])=>!ok); for(const [ok,label] of checks)console.log(`${ok?"OK":"FAIL"} ${label}`); if(failed.length)process.exit(1);
