import fs from "node:fs";
function read(p){return fs.readFileSync(p,"utf8");}
const wf=JSON.parse(read("tools/comfyui/awena-exercise-api.json"));
const runner=read("tools/run-comfyui-awena-batch.mjs");
const jobs=read("tools/build-fit-awena-jobs.mjs");
const checks=[
  [wf?.["10"]?.inputs?.image==="__AWENA_REFERENCE__","workflow injects AWENA identity image"],
  [wf?.["145"]?.inputs?.file==="__MOTION_REFERENCE_VIDEO__","workflow injects one motion driver per exercise"],
  [wf?.["21"]?.inputs?.text==="__POSITIVE_PROMPT__"&&wf?.["1"]?.inputs?.text==="__NEGATIVE_PROMPT__","workflow injects exercise prompts"],
  [wf?.["242:90"]?.inputs?.height?.[0]==="160","second WAN pass keeps 640x368 dimensions"],
  [wf?.["300"]?.class_type==="Sam2Segmentation"&&wf?.["303"]?.class_type==="SaveImage"&&wf?.["304"]?.class_type==="SaveImage","final AWENA frames are re-segmented and RGB/matte batches are exported"],
  [String(wf?.["303"]?.inputs?.filename_prefix).includes("__RGB_FRAME_PREFIX__")&&String(wf?.["304"]?.inputs?.filename_prefix).includes("__MASK_FRAME_PREFIX__"),"frame outputs have deterministic batch prefixes"],
  [runner.includes("__MOTION_REFERENCE_VIDEO__")&&runner.includes("resolveDriver(job)"),"runner resolves and uploads motion driver automatically"],
  [runner.includes("alphamerge")&&runner.includes("yuva420p"),"runner produces genuine VP9 alpha WebM"],
  [runner.includes("awena-step-")&&runner.includes("posterIndex"),"poster and four AWENA step images are extracted automatically from the generated motion"],
  [runner.includes("blocked-no-motion-driver.json"),"missing motion drivers are explicitly audited instead of silently generating wrong movements"],
  [jobs.includes("needsGeneratedMotionDriver")&&jobs.includes("withExistingMotionVideo"),"queue report separates ready jobs from exercises needing a generated driver"],
];
const failed=checks.filter(([ok])=>!ok);for(const [ok,label] of checks)console.log(`${ok?"OK":"FAIL"} ${label}`);if(failed.length)process.exit(1);
