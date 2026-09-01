import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import {
  AWENA_COMPLETENESS,
  AWENA_STATUS,
  ensureAwenaRegistryDirectories,
  canonicalAwenaAssetKey,
  generatedDirectory,
  moveGeneratedPack,
  resolveAwenaRegistryState,
} from "./fit-awena-registry.mjs";
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

await ensureAwenaRegistryDirectories();
const catalog = await loadCatalog({ allowCache: true });
const exercise = catalog.exercises.find((ex) => assetKey(ex) === asset || String(ex.id) === asset);
const rawKey = exercise ? assetKey(exercise) : asset;
const key = exercise ? canonicalAwenaAssetKey(exercise, rawKey) : asset;
const reviewDir = generatedDirectory(AWENA_STATUS.REVIEW, key);
if (!fssync.existsSync(reviewDir)) throw new Error(`Pack REVIEW absent: ${reviewDir}`);

let meta = {};
try { meta = JSON.parse(await fs.readFile(path.join(reviewDir, "metadata.json"), "utf8")); } catch {}

if (reject) {
  const to = await moveGeneratedPack(key, AWENA_STATUS.REVIEW, AWENA_STATUS.REJECTED, {
    reviewedAt: new Date().toISOString(),
    reviewDecision: AWENA_STATUS.REJECTED,
    humanReviewed: true,
  });
  console.log(`${key}: ${AWENA_STATUS.REVIEW} -> ${AWENA_STATUS.REJECTED}`);
  console.log(`Dossier: ${to}`);
  process.exit(0);
}

if (meta?.technicalQuality?.pass === false && !force) {
  throw new Error(`Contrôle technique en échec pour ${key}. Le pack reste REVIEW. Utilise --force uniquement après contrôle visuel volontaire.`);
}

const current = exercise
  ? await resolveAwenaRegistryState(exercise, rawKey)
  : { status: AWENA_STATUS.MISSING, completeness: AWENA_COMPLETENESS.NONE, missingComponents: ["video", "poster", "steps"], coverage: {} };

if (current.status === AWENA_STATUS.APPROVED && current.completeness === AWENA_COMPLETENESS.COMPLETE && !force) {
  throw new Error(`${exercise?.name || key} est déjà APPROVED COMPLETE. Aucun composant validé ne sera remplacé.`);
}

const files = {
  video: path.join(reviewDir, "awena-preview.webm"),
  poster: path.join(reviewDir, "awena-poster.webp"),
  steps: Array.from({ length: 4 }, (_, index) => path.join(reviewDir, `awena-step-${String(index + 1).padStart(2, "0")}.webp`)),
};
const available = {
  video: fssync.existsSync(files.video),
  poster: fssync.existsSync(files.poster),
  steps: files.steps.every((file) => fssync.existsSync(file)) && meta?.stepGuide?.status === "READY",
};

let componentsToApprove = [];
if (current.status === AWENA_STATUS.APPROVED) {
  // Component-level supplement: ONLY missing pieces may enter APPROVED.
  const wanted = new Set(current.missingComponents || []);
  const requested = new Set(Array.isArray(meta.requestedComponents) && meta.requestedComponents.length ? meta.requestedComponents : [...wanted]);
  componentsToApprove = ["video", "poster", "steps"].filter((component) => wanted.has(component) && requested.has(component) && available[component]);
  if (!componentsToApprove.length) {
    throw new Error(`Aucun composant manquant validable dans REVIEW pour ${key}. Manquants: ${(current.missingComponents || []).join(", ") || "aucun"}.`);
  }
} else {
  // A brand-new generated exercise is never published partially. It must have
  // video + poster + four dedicated pedagogical steps before first approval.
  const missing = [];
  if (!available.video) missing.push("awena-preview.webm");
  if (!available.poster) missing.push("awena-poster.webp");
  if (!available.steps) missing.push("4 étapes dédiées + stepGuide.status=READY");
  if (missing.length && !force) {
    throw new Error(`Premier pack AWENA incomplet: ${missing.join(", ")}. Un exercice sans média APPROVED préalable ne peut pas être publié partiellement.`);
  }
  componentsToApprove = ["video", "poster", "steps"].filter((component) => available[component]);
}

const approvedDir = generatedDirectory(AWENA_STATUS.APPROVED, key);
await fs.mkdir(approvedDir, { recursive: true });
const copied = [];
async function copyProtected(source, target, label) {
  if (!fssync.existsSync(source)) return;
  if (fssync.existsSync(target) && !force) throw new Error(`Refus d'écraser un composant APPROVED existant: ${target}`);
  await fs.copyFile(source, target);
  copied.push(label);
}

if (componentsToApprove.includes("video")) await copyProtected(files.video, path.join(approvedDir, "awena-preview.webm"), "video");
if (componentsToApprove.includes("poster")) await copyProtected(files.poster, path.join(approvedDir, "awena-poster.webp"), "poster");
if (componentsToApprove.includes("steps")) {
  for (let i = 0; i < files.steps.length; i++) {
    await copyProtected(files.steps[i], path.join(approvedDir, `awena-step-${String(i + 1).padStart(2, "0")}.webp`), `step-${i + 1}`);
  }
}

const approvedMetaFile = path.join(approvedDir, "metadata.json");
let approvedMeta = {};
try { approvedMeta = JSON.parse(await fs.readFile(approvedMetaFile, "utf8")); } catch {}
approvedMeta = {
  ...approvedMeta,
  exerciseId: exercise?.id || meta.exerciseId || approvedMeta.exerciseId || null,
  name: exercise?.name || meta.name || approvedMeta.name || null,
  assetKey: key,
  status: AWENA_STATUS.APPROVED,
  humanReviewed: true,
  approvedAt: new Date().toISOString(),
  approvedComponents: Array.from(new Set([...(approvedMeta.approvedComponents || []), ...componentsToApprove])),
  supplementForExistingApprovedPack: current.status === AWENA_STATUS.APPROVED,
  manualComponentsRemainAuthoritative: true,
  sourceReviewMetadata: {
    generationMode: meta.generationMode || null,
    requestedComponents: meta.requestedComponents || null,
    generatedAt: meta.generatedAt || null,
    technicalQuality: meta.technicalQuality || null,
    stepGuide: meta.stepGuide || null,
  },
};
await fs.writeFile(approvedMetaFile, JSON.stringify(approvedMeta, null, 2));
await fs.rm(reviewDir, { recursive: true, force: true });

const after = exercise ? await resolveAwenaRegistryState(exercise, rawKey) : null;
console.log(`${key}: REVIEW components -> APPROVED`);
console.log(`Composants approuvés: ${componentsToApprove.join(", ")}`);
console.log(`Fichiers copiés: ${copied.join(", ")}`);
if (after) console.log(`État effectif: APPROVED ${after.completeness} · manquants=${(after.missingComponents || []).join(",") || "aucun"}`);
console.log(`Dossier supplément généré: ${approvedDir}`);
