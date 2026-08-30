import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";

export const AWENA_STATUS = Object.freeze({
  APPROVED: "APPROVED",
  REVIEW: "REVIEW",
  MISSING: "MISSING",
  REJECTED: "REJECTED",
});

export const AWENA_ROOT = path.resolve("public/fit/awena-library");
export const AWENA_APPROVED_ROOT = path.join(AWENA_ROOT, "approved");
export const AWENA_REVIEW_ROOT = path.join(AWENA_ROOT, "review");
export const AWENA_REJECTED_ROOT = path.join(AWENA_ROOT, "rejected");
export const AWENA_PREMIUM_ROOT = path.resolve("public/fit/motions/awena/premium");
export const AWENA_EXERCISE_MEDIA_ROOT = path.resolve("public/fit/exercise-media");

function normalizeName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function exactNameIn(name, candidates) {
  const n = normalizeName(name);
  return candidates.some((candidate) => normalizeName(candidate) === n);
}

export function manualAwenaKeyForExercise(exercise = {}) {
  const id = String(exercise.id || "").toLowerCase().trim();
  const explicit = String(exercise.motionKey || "").toLowerCase().trim();
  if (["bench", "pushup", "burpee", "squat", "curl"].includes(explicit)) return explicit;
  if (["bench", "squat", "curl"].includes(id)) return id;
  const name = exercise.name || "";
  if (exactNameIn(name, ["Développé couché", "Developpe couche", "Bench Press", "Barbell Bench Press", "Flat Barbell Bench Press"])) return "bench";
  if (exactNameIn(name, ["Pompes", "Push Up", "Push Ups", "Pushup", "Pushups", "Standard Push Up", "Standard Pushup"])) return "pushup";
  if (exactNameIn(name, ["Burpee", "Burpees"])) return "burpee";
  if (exactNameIn(name, ["Squat", "Back Squat", "Barbell Back Squat"])) return "squat";
  if (exactNameIn(name, ["Curl biceps", "Biceps Curl", "Barbell Curl"])) return "curl";
  return "";
}

const MANUAL_PACKS = Object.freeze({
  bench: {
    video: "/fit/motions/awena/premium/bench/motion.mp4",
    poster: "/fit/motions/awena/premium/bench/poster.webp",
    frames: [
      "/fit/motions/awena/premium/bench/frames/frame-01.webp",
      "/fit/motions/awena/premium/bench/frames/frame-02.webp",
      "/fit/motions/awena/premium/bench/frames/frame-03.webp",
      "/fit/motions/awena/premium/bench/frames/frame-04.webp",
      "/fit/motions/awena/premium/bench/frames/frame-05.webp",
    ],
    steps: [
      "/fit/exercise-media/bench/awena-step-00-setup.webp",
      "/fit/exercise-media/bench/awena-step-01-start.webp",
      "/fit/exercise-media/bench/awena-step-02-descent.webp",
      "/fit/exercise-media/bench/awena-step-03-bottom.webp",
      "/fit/exercise-media/bench/awena-step-04-press.webp",
    ],
  },
  pushup: {
    video: "/fit/motions/awena/premium/pushup/motion.webm",
    poster: "/fit/motions/awena/premium/pushup/poster.webp",
    steps: [
      "/fit/exercise-media/pushup/awena-step-01-start.webp",
      "/fit/exercise-media/pushup/awena-step-02-descent.webp",
      "/fit/exercise-media/pushup/awena-step-03-bottom.webp",
      "/fit/exercise-media/pushup/awena-step-04-press.webp",
    ],
  },
  burpee: {
    video: "/fit/motions/awena/premium/burpee/motion.webm",
    poster: "/fit/motions/awena/premium/burpee/poster.webp",
    steps: [
      "/fit/exercise-media/burpee/awena-01.webp",
      "/fit/exercise-media/burpee/awena-02.webp",
      "/fit/exercise-media/burpee/awena-03.webp",
      "/fit/exercise-media/burpee/awena-04.webp",
      "/fit/exercise-media/burpee/awena-05.webp",
    ],
  },
  squat: {
    video: "/fit/motions/awena/premium/squat/motion.mp4",
    poster: "/fit/motions/awena/premium/squat/poster.webp",
    steps: [],
  },
  curl: {
    video: null,
    poster: "/fit/motions/awena/premium/curl/poster.webp",
    frames: [
      "/fit/motions/awena/premium/curl/frames/frame-01.webp",
      "/fit/motions/awena/premium/curl/frames/frame-02.webp",
      "/fit/motions/awena/premium/curl/frames/frame-03.webp",
      "/fit/motions/awena/premium/curl/frames/frame-04.webp",
      "/fit/motions/awena/premium/curl/frames/frame-05.webp",
    ],
    steps: [],
  },
});

function publicUrlToFile(url) {
  if (!url || !String(url).startsWith("/")) return null;
  return path.resolve("public", String(url).slice(1));
}

async function exists(file) {
  if (!file) return false;
  try { await fs.access(file); return true; } catch { return false; }
}

async function nonEmpty(file, minBytes = 256) {
  try { return (await fs.stat(file)).size >= minBytes; } catch { return false; }
}

async function validateManualPack(key) {
  const def = MANUAL_PACKS[key];
  if (!def) return null;
  const videoFile = publicUrlToFile(def.video);
  const posterFile = publicUrlToFile(def.poster);
  const frameFiles = (def.frames || []).map(publicUrlToFile).filter(Boolean);
  const stepFiles = (def.steps || []).map(publicUrlToFile).filter(Boolean);
  const video = videoFile ? await nonEmpty(videoFile, 20_000) : false;
  const poster = posterFile ? await nonEmpty(posterFile, 2_000) : false;
  const frames = (await Promise.all(frameFiles.map((file) => nonEmpty(file, 2_000)))).filter(Boolean).length;
  const steps = (await Promise.all(stepFiles.map((file) => nonEmpty(file, 2_000)))).filter(Boolean).length;
  const playable = video || frames >= 2;
  if (!playable || !poster) return null;
  return {
    status: AWENA_STATUS.APPROVED,
    origin: "manual",
    manualKey: key,
    videoUrl: video ? def.video : null,
    posterUrl: def.poster,
    frameImages: frameFiles.length ? def.frames.filter((_, index) => index < frames) : [],
    stepImages: def.steps || [],
    coverage: { video, poster, frames, steps },
    reason: "hand-authored AWENA media already present in the project",
  };
}

export async function manualAwenaPackForExercise(exercise) {
  const key = manualAwenaKeyForExercise(exercise);
  if (!key) return null;
  return validateManualPack(key);
}

export function generatedDirectory(status, assetKey) {
  if (status === AWENA_STATUS.APPROVED) return path.join(AWENA_APPROVED_ROOT, assetKey);
  if (status === AWENA_STATUS.REVIEW) return path.join(AWENA_REVIEW_ROOT, assetKey);
  if (status === AWENA_STATUS.REJECTED) return path.join(AWENA_REJECTED_ROOT, assetKey);
  throw new Error(`Unsupported generated AWENA status: ${status}`);
}

async function generatedStateAt(status, assetKey) {
  const dir = generatedDirectory(status, assetKey);
  if (!(await exists(dir))) return null;
  const video = await nonEmpty(path.join(dir, "awena-preview.webm"), 5_000);
  const poster = await nonEmpty(path.join(dir, "awena-poster.webp"), 500);
  let steps = 0;
  for (let i = 1; i <= 8; i++) if (await nonEmpty(path.join(dir, `awena-step-${String(i).padStart(2, "0")}.webp`), 500)) steps++;
  let meta = {};
  try { meta = JSON.parse(await fs.readFile(path.join(dir, "metadata.json"), "utf8")); } catch {}
  return {
    status,
    origin: "generated",
    directory: dir,
    assetKey,
    videoUrl: video ? `/fit/awena-library/${status.toLowerCase()}/${assetKey}/awena-preview.webm` : null,
    posterUrl: poster ? `/fit/awena-library/${status.toLowerCase()}/${assetKey}/awena-poster.webp` : null,
    stepImages: Array.from({ length: steps }, (_, index) => `/fit/awena-library/${status.toLowerCase()}/${assetKey}/awena-step-${String(index + 1).padStart(2, "0")}.webp`),
    coverage: { video, poster, steps },
    metadata: meta,
  };
}

async function legacyGeneratedState(assetKey) {
  const dir = path.join(AWENA_ROOT, assetKey);
  if (!(await exists(dir))) return null;
  if (["approved", "review", "rejected"].includes(assetKey)) return null;
  const video = await nonEmpty(path.join(dir, "awena-preview.webm"), 5_000);
  const poster = await nonEmpty(path.join(dir, "awena-poster.webp"), 500);
  let steps = 0;
  for (let i = 1; i <= 8; i++) if (await nonEmpty(path.join(dir, `awena-step-${String(i).padStart(2, "0")}.webp`), 500)) steps++;
  if (!video && !poster && !steps) return null;
  let meta = {};
  try { meta = JSON.parse(await fs.readFile(path.join(dir, "metadata.json"), "utf8")); } catch {}
  return {
    status: AWENA_STATUS.REVIEW,
    origin: "legacy-generated",
    directory: dir,
    assetKey,
    videoUrl: video ? `/fit/awena-library/${assetKey}/awena-preview.webm` : null,
    posterUrl: poster ? `/fit/awena-library/${assetKey}/awena-poster.webp` : null,
    stepImages: Array.from({ length: steps }, (_, index) => `/fit/awena-library/${assetKey}/awena-step-${String(index + 1).padStart(2, "0")}.webp`),
    coverage: { video, poster, steps },
    metadata: meta,
    reason: "legacy generated media is quarantined as REVIEW and never displayed automatically",
  };
}

export async function resolveAwenaRegistryState(exercise, assetKey) {
  const manual = await manualAwenaPackForExercise(exercise);
  if (manual) return manual;
  const approved = await generatedStateAt(AWENA_STATUS.APPROVED, assetKey);
  if (approved) return approved;
  const review = await generatedStateAt(AWENA_STATUS.REVIEW, assetKey);
  if (review) return review;
  const legacy = await legacyGeneratedState(assetKey);
  if (legacy) return legacy;
  const rejected = await generatedStateAt(AWENA_STATUS.REJECTED, assetKey);
  if (rejected) return rejected;
  return { status: AWENA_STATUS.MISSING, origin: "none", assetKey, coverage: { video: false, poster: false, steps: 0 } };
}

export async function ensureAwenaRegistryDirectories() {
  await Promise.all([AWENA_ROOT, AWENA_APPROVED_ROOT, AWENA_REVIEW_ROOT, AWENA_REJECTED_ROOT].map((dir) => fs.mkdir(dir, { recursive: true })));
}

export async function moveGeneratedPack(assetKey, fromStatus, toStatus, metadataPatch = {}) {
  await ensureAwenaRegistryDirectories();
  const from = generatedDirectory(fromStatus, assetKey);
  const to = generatedDirectory(toStatus, assetKey);
  if (!fssync.existsSync(from)) throw new Error(`AWENA ${fromStatus} pack absent: ${from}`);
  if (fssync.existsSync(to)) await fs.rm(to, { recursive: true, force: true });
  await fs.rename(from, to);
  const metaFile = path.join(to, "metadata.json");
  let meta = {};
  try { meta = JSON.parse(await fs.readFile(metaFile, "utf8")); } catch {}
  meta = { ...meta, ...metadataPatch, status: toStatus, statusChangedAt: new Date().toISOString() };
  await fs.writeFile(metaFile, JSON.stringify(meta, null, 2));
  return to;
}

export async function quarantineLegacyPack(assetKey) {
  const legacy = path.join(AWENA_ROOT, assetKey);
  const review = generatedDirectory(AWENA_STATUS.REVIEW, assetKey);
  if (!fssync.existsSync(legacy) || ["approved", "review", "rejected"].includes(assetKey)) return false;
  await ensureAwenaRegistryDirectories();
  if (fssync.existsSync(review)) return false;
  await fs.rename(legacy, review);
  const metaFile = path.join(review, "metadata.json");
  let meta = {};
  try { meta = JSON.parse(await fs.readFile(metaFile, "utf8")); } catch {}
  await fs.writeFile(metaFile, JSON.stringify({ ...meta, status: AWENA_STATUS.REVIEW, migratedFromLegacyRoot: true, statusChangedAt: new Date().toISOString() }, null, 2));
  return true;
}
