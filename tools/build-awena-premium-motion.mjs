#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i += 1; }
  }
  return out;
}

function help() {
  console.log(`AWENA Premium Motion builder\n\nUsage:\n  npm run awena:motion:build -- --exercise squat --input ./incoming/squat --fps 16 [--size 640] [--webm]\n\nInput:\n  PNG / WebP / JPG frames, already ordered by filename.\n\nOutput:\n  public/fit/motions/awena/premium/<exercise>/frames/frame-XX.webp\n  public/fit/motions/awena/premium/<exercise>/poster.webp\n  public/fit/motions/awena/premium/<exercise>/motion.webm   (with --webm)\n\nThen update only the corresponding slot in src/fit/awenaPremiumMotions.ts.`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  help();
  process.exit(0);
}

const exerciseId = String(args.exercise || "").trim();
const inputDir = path.resolve(String(args.input || ""));
const fps = Math.max(1, Math.min(30, Number(args.fps || 16)));
const size = Math.max(320, Math.min(1280, Number(args.size || 640)));

if (!exerciseId || !args.input) {
  help();
  process.exitCode = 2;
  process.exit();
}
if (!/^[a-z0-9-]+$/.test(exerciseId)) throw new Error(`exercise id invalide: ${exerciseId}`);
if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) throw new Error(`Dossier input introuvable: ${inputDir}`);

const files = fs.readdirSync(inputDir)
  .filter((file) => /\.(png|webp|jpe?g)$/i.test(file))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
if (files.length < 2) throw new Error("Il faut au moins 2 frames pour construire une animation.");

const { default: sharp } = await import("sharp");
const outputRoot = path.resolve("public", "fit", "motions", "awena", "premium", exerciseId);
const frameDir = path.join(outputRoot, "frames");
fs.rmSync(frameDir, { recursive: true, force: true });
fs.mkdirSync(frameDir, { recursive: true });

for (let index = 0; index < files.length; index += 1) {
  const input = path.join(inputDir, files[index]);
  const output = path.join(frameDir, `frame-${String(index + 1).padStart(2, "0")}.webp`);
  await sharp(input)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 88, alphaQuality: 100, effort: 4 })
    .toFile(output);
}

const firstFrame = path.join(frameDir, "frame-01.webp");
await sharp(firstFrame).webp({ quality: 90, alphaQuality: 100, effort: 4 }).toFile(path.join(outputRoot, "poster.webp"));

if (args.webm) {
  const ffmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (ffmpeg.status !== 0) {
    console.warn("⚠️ ffmpeg introuvable : frames créées, WebM ignoré.");
  } else {
    const result = spawnSync("ffmpeg", [
      "-y",
      "-framerate", String(fps),
      "-i", path.join(frameDir, "frame-%02d.webp"),
      "-c:v", "libvpx-vp9",
      "-pix_fmt", "yuva420p",
      "-auto-alt-ref", "0",
      "-crf", "31",
      "-b:v", "0",
      "-an",
      path.join(outputRoot, "motion.webm"),
    ], { stdio: "inherit" });
    if (result.status !== 0) throw new Error("ffmpeg n'a pas pu créer motion.webm");
  }
}

console.log(`✅ ${exerciseId}: ${files.length} frames premium générées à ${fps} fps (canvas ${size}×${size})`);
console.log(`   ${path.relative(process.cwd(), outputRoot)}`);
console.log("   Mets à jour le slot correspondant dans src/fit/awenaPremiumMotions.ts (count/fps et video si motion.webm est produit).");
