import fs from "node:fs/promises";
import fssync from "node:fs";
import os from "node:os";
import path from "node:path";
import { runFfmpeg } from "./fit-awena-media-tools.mjs";

export const FREE_EXERCISE_IMAGE_ROOT = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export function safeFilePart(value) {
  return String(value || "file")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 130) || "file";
}

export function resolveCatalogImageUrl(exercise, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || /^file:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  if (exercise?.source === "free-exercise-db") {
    return `${FREE_EXERCISE_IMAGE_ROOT}${raw.split("/").map(encodeURIComponent).join("/")}`;
  }
  return raw;
}

export function resolveCatalogImageUrls(exercise) {
  return Array.from(new Set((exercise?.imagePaths || []).map((value) => resolveCatalogImageUrl(exercise, value)).filter(Boolean)));
}

export function localCandidate(value, root = process.cwd()) {
  if (!value) return null;
  const raw = String(value);
  if (/^file:\/\//i.test(raw)) {
    try { return new URL(raw).pathname; } catch { return null; }
  }
  if (/^https?:\/\//i.test(raw)) return null;
  if (raw.startsWith("/")) {
    const publicPath = path.resolve(root, "public", raw.slice(1));
    if (fssync.existsSync(publicPath)) return publicPath;
  }
  const direct = path.resolve(root, raw);
  if (fssync.existsSync(direct)) return direct;
  return null;
}

function extFromUrl(value, fallback = ".jpg") {
  try {
    const url = new URL(value);
    const ext = path.extname(url.pathname);
    return ext && ext.length <= 8 ? ext : fallback;
  } catch {
    const ext = path.extname(String(value || ""));
    return ext && ext.length <= 8 ? ext : fallback;
  }
}

async function download(url, dst) {
  const response = await fetch(url, { headers: { Accept: "image/*,*/*" } });
  if (!response.ok) throw new Error(`Téléchargement image ${response.status} ${url}`);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.writeFile(dst, Buffer.from(await response.arrayBuffer()));
  return dst;
}

export async function materializeImageCandidate(value, dstBase, root = process.cwd()) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Image candidate vide");
  const local = localCandidate(raw, root);
  const ext = extFromUrl(raw, ".jpg");
  const dst = `${dstBase}${ext}`;
  await fs.mkdir(path.dirname(dst), { recursive: true });
  if (local && fssync.existsSync(local)) {
    await fs.copyFile(local, dst);
    return dst;
  }
  if (/^https?:\/\//i.test(raw)) return download(raw, dst);
  throw new Error(`Image candidate inaccessible: ${raw}`);
}

function normalizeImage(src, dst, width, height) {
  runFfmpeg([
    "-i", src,
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    "-frames:v", "1",
    dst,
  ], "Normalisation image driver");
}

/**
 * Builds a neutral one-repetition movement driver from two exercise reference
 * photos. The clip goes pose A -> pose B -> pose A. DWPose in the user's WAN
 * workflow extracts only the body motion, so source identity/background do not
 * become the final AWENA identity.
 */
export async function buildMotionDriverFromImages({
  assetKey,
  imageCandidates,
  outputDir = path.resolve("var/fit-awena/drivers"),
  width = 640,
  height = 368,
  fps = 16,
  overwrite = false,
  root = process.cwd(),
} = {}) {
  const candidates = Array.from(new Set((imageCandidates || []).map(String).map((x) => x.trim()).filter(Boolean)));
  if (candidates.length < 2) return { ok: false, reason: "NEED_AT_LEAST_TWO_IMAGES" };
  const out = path.join(outputDir, `${safeFilePart(assetKey)}.mp4`);
  if (!overwrite && fssync.existsSync(out)) return { ok: true, path: out, mode: "photo-driver-existing", reused: true };

  await fs.mkdir(outputDir, { recursive: true });
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), `fit-driver-${safeFilePart(assetKey).slice(0, 40)}-`));
  try {
    const sourceA = await materializeImageCandidate(candidates[0], path.join(temp, "source-a"), root);
    const sourceB = await materializeImageCandidate(candidates[1], path.join(temp, "source-b"), root);
    const a = path.join(temp, "pose-a.png");
    const b = path.join(temp, "pose-b.png");
    normalizeImage(sourceA, a, width, height);
    normalizeImage(sourceB, b, width, height);
    await fs.copyFile(a, path.join(temp, "frame_01.png"));
    await fs.copyFile(b, path.join(temp, "frame_02.png"));
    await fs.copyFile(a, path.join(temp, "frame_03.png"));

    // Motion-compensated interpolation is preferable to a simple crossfade:
    // DWPose receives a progressive skeleton instead of two ghosted people.
    runFfmpeg([
      "-framerate", "1",
      "-start_number", "1",
      "-i", path.join(temp, "frame_%02d.png"),
      "-vf", `minterpolate=fps=${Math.max(8, Number(fps) || 16)}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,format=yuv420p`,
      "-t", "2",
      "-an",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-movflags", "+faststart",
      out,
    ], "Création driver mouvement depuis photos");

    return {
      ok: true,
      path: out,
      mode: "generated-photo-driver",
      sources: candidates.slice(0, 2),
      fps: Math.max(8, Number(fps) || 16),
      width,
      height,
    };
  } finally {
    await fs.rm(temp, { recursive: true, force: true }).catch(() => {});
  }
}
