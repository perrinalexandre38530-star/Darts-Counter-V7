import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { buildMotionDriverFromImages } from "./fit-awena-driver-utils.mjs";
import { requireMediaTools } from "./fit-awena-media-tools.mjs";

function arg(name, fallback = "") { const i = process.argv.indexOf(name); return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback; }
function flag(name) { return process.argv.includes(name); }

const queueFile = path.resolve(arg("--queue", "var/fit-awena/comfyui-queue.json"));
const outDir = path.resolve(arg("--driver-dir", "var/fit-awena/drivers"));
const limit = Math.max(0, Number(arg("--limit", "0")) || 0);
const match = arg("--match", "").toLowerCase().trim();
const overwrite = flag("--overwrite");

if (!fssync.existsSync(queueFile)) throw new Error(`Queue absente: ${queueFile}. Lance d'abord npm run fit:awena:queue -- --refresh`);
const queue = JSON.parse(await fs.readFile(queueFile, "utf8"));
let jobs = (queue.jobs || []).filter((job) => !(job.existingReferenceVideos || []).length);
if (match) jobs = jobs.filter((job) => `${job.name} ${job.exerciseId} ${job.assetKey}`.toLowerCase().includes(match));
if (limit) jobs = jobs.slice(0, limit);

const mediaTools = requireMediaTools();
console.log(`FFmpeg OK: ${mediaTools.ffmpeg}`);

await fs.mkdir(outDir, { recursive: true });
let built = 0, reused = 0, blocked = 0, failed = 0;
const blockedJobs = [];
const failures = [];

for (const [index, job] of jobs.entries()) {
  const images = job.resolvedReferenceImages || job.motionDriver?.photoCandidates || [];
  const target = path.join(outDir, `${job.assetKey}.mp4`);
  if (!overwrite && fssync.existsSync(target)) {
    reused++;
    console.log(`[${index + 1}/${jobs.length}] REUSE ${job.name}`);
    continue;
  }
  if (images.length < 2) {
    blocked++;
    blockedJobs.push({ exerciseId: job.exerciseId, assetKey: job.assetKey, name: job.name, reason: "LESS_THAN_TWO_REFERENCE_IMAGES", imageCount: images.length });
    console.warn(`[${index + 1}/${jobs.length}] BLOCKED ${job.name} · ${images.length} image(s)`);
    continue;
  }
  try {
    console.log(`[${index + 1}/${jobs.length}] DRIVER ${job.name}`);
    const result = await buildMotionDriverFromImages({ assetKey: job.assetKey, imageCandidates: images, outputDir: outDir, overwrite });
    if (result.ok) {
      result.reused ? reused++ : built++;
      console.log(`  OK ${path.relative(process.cwd(), result.path)}`);
    } else {
      blocked++;
      blockedJobs.push({ exerciseId: job.exerciseId, assetKey: job.assetKey, name: job.name, reason: result.reason || "DRIVER_NOT_BUILT", imageCount: images.length });
    }
  } catch (error) {
    failed++;
    failures.push({ exerciseId: job.exerciseId, assetKey: job.assetKey, name: job.name, error: String(error?.message || error) });
    console.error(`  ECHEC ${job.name}: ${error?.message || error}`);
  }
}

const report = { generatedAt: new Date().toISOString(), considered: jobs.length, built, reused, blocked, failed, blockedJobs, failures };
await fs.mkdir("var/fit-awena", { recursive: true });
await fs.writeFile("var/fit-awena/driver-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ considered: jobs.length, built, reused, blocked, failed }, null, 2));
if (failed) process.exitCode = 2;
