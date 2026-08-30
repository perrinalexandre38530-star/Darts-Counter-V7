import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { installFfmpegWithWinget, mediaToolsStatus, ffmpegInstallHint } from "./fit-awena-media-tools.mjs";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || fallback) : fallback;
}
function flag(name) { return process.argv.includes(name); }

const server = arg("--server", process.env.COMFYUI_URL || "http://127.0.0.1:8188").replace(/\/$/, "");
const queueFile = path.resolve(arg("--queue", "var/fit-awena/comfyui-queue.json"));
const workflowFile = path.resolve(arg("--workflow", process.env.COMFYUI_AWENA_WORKFLOW || "tools/comfyui/awena-exercise-api.json"));
const referenceFile = path.resolve(arg("--reference", process.env.AWENA_REFERENCE_IMAGE || "public/fit/exercise-media/pushup/awena-step-01-start.webp"));

if (flag("--install-ffmpeg")) {
  const before = mediaToolsStatus();
  if (before.ffmpegOk && before.ffprobeOk) {
    console.log(`FFmpeg déjà disponible: ${before.ffmpeg}`);
    console.log(`FFprobe déjà disponible: ${before.ffprobe}`);
  } else {
    console.log("Installation de FFmpeg via WinGet…");
    const result = installFfmpegWithWinget();
    if (!result.ok) {
      console.error(`Installation automatique impossible (${result.reason || `code ${result.status}`}).`);
      console.error(ffmpegInstallHint());
      process.exitCode = 2;
    }
  }
}

const media = mediaToolsStatus();
let comfy = { ok: false, status: null, error: null };
try {
  const response = await fetch(`${server}/system_stats`, { signal: AbortSignal.timeout(3500) });
  comfy = { ok: response.ok, status: response.status, error: response.ok ? null : await response.text() };
} catch (error) {
  comfy = { ok: false, status: null, error: String(error?.message || error) };
}

let queue = null;
if (fssync.existsSync(queueFile)) {
  try {
    const parsed = JSON.parse(await fs.readFile(queueFile, "utf8"));
    const jobs = parsed.jobs || [];
    queue = {
      jobs: jobs.length,
      existingVideoDrivers: jobs.filter((job) => (job.existingReferenceVideos || []).length > 0).length,
      photoPairDrivers: jobs.filter((job) => !(job.existingReferenceVideos || []).length && (job.resolvedReferenceImages || []).length >= 2).length,
      needsGeneratedDriver: jobs.filter((job) => !(job.existingReferenceVideos || []).length && (job.resolvedReferenceImages || []).length < 2).length,
    };
  } catch (error) {
    queue = { error: String(error?.message || error) };
  }
}

const report = {
  ok: Boolean(media.ffmpegOk && media.ffprobeOk && comfy.ok && fssync.existsSync(workflowFile) && fssync.existsSync(referenceFile)),
  media,
  comfyui: { server, ...comfy },
  workflow: { path: workflowFile, exists: fssync.existsSync(workflowFile) },
  awenaReference: { path: referenceFile, exists: fssync.existsSync(referenceFile) },
  queueFile: { path: queueFile, exists: fssync.existsSync(queueFile), summary: queue },
};
console.log(JSON.stringify(report, null, 2));

if (!media.ffmpegOk || !media.ffprobeOk) {
  console.error("\n" + ffmpegInstallHint());
}
if (!comfy.ok) {
  console.error(`\nComfyUI n'est pas joignable sur ${server}. Lance ComfyUI avant fit:awena:run.`);
}
if (!fssync.existsSync(workflowFile)) console.error(`\nWorkflow API absent: ${workflowFile}`);
if (!fssync.existsSync(referenceFile)) console.error(`\nImage de référence AWENA absente: ${referenceFile}`);
if (!report.ok) process.exitCode = 2;
