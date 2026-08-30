import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { AWENA_STATUS, generatedDirectory, manualAwenaPackForExercise, moveGeneratedPack } from "./fit-awena-registry.mjs";
import { loadCatalog, assetKey } from "./fit-awena-catalog-source.mjs";

function arg(name, fallback = "") { const i = process.argv.indexOf(name); return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback; }
function flag(name) { return process.argv.includes(name); }

const asset = arg("--asset").trim();
const approve = flag("--approve");
const reject = flag("--reject");
const force = flag("--force");
if (!asset || Number(approve) + Number(reject) !== 1) {
  throw new Error("Usage: node tools/review-fit-awena-media.mjs --asset <assetKey> --approve|--reject [--force]");
}

const catalog = await loadCatalog({ allowCache: true });
const exercise = catalog.exercises.find((ex) => assetKey(ex) === asset || String(ex.id) === asset);
if (approve && exercise) {
  const manual = await manualAwenaPackForExercise(exercise);
  if (manual && !force) throw new Error(`${exercise.name} possède déjà un pack AWENA manuel APPROVED. Refus d'écraser ce média. Utilise --force uniquement si tu assumes explicitement le remplacement.`);
}

const reviewDir = generatedDirectory(AWENA_STATUS.REVIEW, asset);
if (!fssync.existsSync(reviewDir)) throw new Error(`Pack REVIEW absent: ${reviewDir}`);
let meta = {};
try { meta = JSON.parse(await fs.readFile(path.join(reviewDir, "metadata.json"), "utf8")); } catch {}
if (approve && meta?.technicalQuality?.pass === false && !force) {
  throw new Error(`Contrôle technique en échec pour ${asset}. Le pack reste REVIEW. Utilise --force uniquement après contrôle visuel volontaire.`);
}

if (approve && !force) {
  const videoFile = path.join(reviewDir, "awena-preview.webm");
  const posterFile = path.join(reviewDir, "awena-poster.webp");
  const stepFiles = Array.from({ length: 4 }, (_, index) => path.join(reviewDir, `awena-step-${String(index + 1).padStart(2, "0")}.webp`));
  const missing = [];
  if (!fssync.existsSync(videoFile)) missing.push("awena-preview.webm");
  if (!fssync.existsSync(posterFile)) missing.push("awena-poster.webp");
  for (const file of stepFiles) if (!fssync.existsSync(file)) missing.push(path.basename(file));
  if (missing.length) throw new Error(`Pack AWENA incomplet: ${missing.join(", ")}. Les review-keyframes ne sont PAS des étapes pédagogiques. Génère/valide quatre vraies poses étape par étape avant APPROVED.`);
  if (meta?.stepGuide?.status !== "READY") throw new Error(`Guide étapes non validé pour ${asset}. Le statut attendu est stepGuide.status=READY. Les frames extraites automatiquement de la vidéo ne suffisent plus.`);
}

const toStatus = approve ? AWENA_STATUS.APPROVED : AWENA_STATUS.REJECTED;
const to = await moveGeneratedPack(asset, AWENA_STATUS.REVIEW, toStatus, {
  reviewedAt: new Date().toISOString(),
  reviewDecision: toStatus,
  humanReviewed: true,
});
console.log(`${asset}: ${AWENA_STATUS.REVIEW} -> ${toStatus}`);
console.log(`Dossier: ${to}`);
