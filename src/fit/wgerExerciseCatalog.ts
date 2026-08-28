import {
  WGER_EXERCISE_CACHE_KEY,
  registerExternalFitExercises,
  type FitEquipment,
  type FitExercise,
  type FitMuscle,
} from "./fitStore";
import { FIT_MUSCLE_COLORS, inferGoalTags, inferMovementPattern } from "./fitExerciseTaxonomy";

export const WGER_API_ROOT = "https://wger.de/api/v2";
export const WGER_EXERCISE_INFO_URL = `${WGER_API_ROOT}/exerciseinfo/?limit=250`;
export const WGER_REPOSITORY = "https://github.com/wger-project/wger";
export const WGER_DATA_LICENSE = "wger exercise data — Creative Commons / per-item license metadata";

const CACHE_VERSION = 2;
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_PAGES = 12;

type WgerNamed = { id?: unknown; name?: unknown; name_en?: unknown };
type WgerTranslation = {
  language?: unknown;
  name?: unknown;
  description?: unknown;
  description_source?: unknown;
  license_title?: unknown;
  license_object_url?: unknown;
  license_author?: unknown;
};
type WgerMedia = {
  image?: unknown;
  video?: unknown;
  is_main?: unknown;
  license_title?: unknown;
  license_object_url?: unknown;
  license_author?: unknown;
};
type WgerRow = {
  id?: unknown;
  uuid?: unknown;
  category?: WgerNamed | null;
  muscles?: unknown;
  muscles_secondary?: unknown;
  equipment?: unknown;
  translations?: unknown;
  images?: unknown;
  videos?: unknown;
  license?: { id?: unknown; full_name?: unknown; short_name?: unknown; url?: unknown; name?: unknown } | null;
  license_author?: unknown;
};
type WgerPage = { count?: unknown; next?: unknown; results?: unknown };
type WgerCache = { version: number; savedAt: number; exercises: FitExercise[] };

const muscleIcon: Record<FitMuscle, string> = {
  Pectoraux: "▰", Dos: "≋", Lombaires: "⌁", Épaules: "↔", Biceps: "◜", Triceps: "⇢",
  "Avant-bras": "⌇", Quadriceps: "⌄", Ischios: "⌁", Fessiers: "◓", Adducteurs: "◢",
  Abducteurs: "◣", Mollets: "⌃", Abdos: "▬", Cou: "◇", "Full body": "◆",
};

function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function array<T = unknown>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function plainText(value: unknown): string {
  return text(value)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function instructionsFrom(value: unknown): string[] {
  const body = plainText(value);
  if (!body) return [];
  const chunks = body.split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/).map((part) => part.replace(/^[-•*\d.)\s]+/, "").trim()).filter((part) => part.length >= 8);
  return Array.from(new Set(chunks)).slice(0, 10);
}

function mapMuscleName(value: string): FitMuscle | null {
  const key = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/pector|chest/.test(key)) return "Pectoraux";
  if (/latissimus|trapez|rhomboid|teres major/.test(key)) return "Dos";
  if (/erector|quadratus lumb|lower back/.test(key)) return "Lombaires";
  if (/deltoid|shoulder/.test(key)) return "Épaules";
  if (/biceps brachii|brachialis/.test(key)) return "Biceps";
  if (/triceps/.test(key)) return "Triceps";
  if (/forearm|brachioradialis|flexor carpi|extensor carpi/.test(key)) return "Avant-bras";
  if (/rectus abdom|obliqu|transversus abdom|serratus/.test(key)) return "Abdos";
  if (/gluteus maxim/.test(key)) return "Fessiers";
  if (/gluteus med|gluteus minim|tensor fascia/.test(key)) return "Abducteurs";
  if (/adductor|gracilis/.test(key)) return "Adducteurs";
  if (/quadriceps|rectus femoris|vastus/.test(key)) return "Quadriceps";
  if (/biceps femoris|hamstring|semitend|semimembr/.test(key)) return "Ischios";
  if (/gastrocnem|soleus|calf/.test(key)) return "Mollets";
  if (/sternocleid|neck/.test(key)) return "Cou";
  return null;
}

function namedMuscles(value: unknown): string[] {
  return array<WgerNamed>(value).map((item) => text(item?.name_en) || text(item?.name)).filter(Boolean);
}

function categoryFallback(value: string): FitMuscle {
  const key = value.toLowerCase();
  if (key.includes("chest")) return "Pectoraux";
  if (key.includes("back")) return "Dos";
  if (key.includes("shoulder")) return "Épaules";
  if (key.includes("arm")) return "Biceps";
  if (key.includes("abs")) return "Abdos";
  if (key.includes("calv")) return "Mollets";
  if (key.includes("leg")) return "Quadriceps";
  return "Full body";
}

function mapEquipment(value: unknown): FitEquipment {
  const names = array<WgerNamed>(value).map((item) => text(item?.name).toLowerCase()).filter(Boolean);
  const joined = names.join(" ");
  if (!joined || /none|bodyweight|body weight/.test(joined)) return "Poids du corps";
  if (/dumbbell/.test(joined)) return "Haltères";
  if (/barbell|sz-bar|ez-bar|ez bar/.test(joined)) return "Barre";
  if (/kettlebell/.test(joined)) return "Kettlebell";
  if (/cable|pulley/.test(joined)) return "Poulie";
  if (/resistance band|band/.test(joined)) return "Élastique";
  if (/suspension|trx/.test(joined)) return "TRX";
  if (/bench/.test(joined)) return "Banc";
  if (/medicine ball|medicineball/.test(joined)) return "Médecine ball";
  if (/machine|station|sled/.test(joined)) return "Machine";
  return "Autre";
}

function cleanEnglishTitle(value: string): string {
  return value
    .replace(/[_]+/g, " ")
    .replace(/\s*[-–—]\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function chooseTranslation(value: unknown): WgerTranslation | null {
  const translations = array<WgerTranslation>(value);
  if (!translations.length) return null;
  // wger language id 2 = English. Never fall back to Spanish/German/etc.
  return translations.find((item) => Number(item?.language) === 2 && Boolean(text(item?.name))) || null;
}

function inferMotionKey(name: string): string | undefined {
  const compact = cleanEnglishTitle(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (["push up", "push ups", "pushup", "pushups", "standard push up", "standard pushup"].includes(compact)) return "pushup";
  if (["burpee", "burpees", "standard burpee"].includes(compact)) return "burpee";
  if (["bench press", "barbell bench press", "flat barbell bench press"].includes(compact)) return "bench";
  if (["squat", "barbell squat", "back squat", "barbell back squat"].includes(compact)) return "squat";
  if (["goblet squat", "kettlebell goblet squat"].includes(compact)) return "goblet";
  if (["romanian deadlift", "barbell romanian deadlift"].includes(compact)) return "rdl";
  if (["deadlift", "barbell deadlift", "conventional deadlift"].includes(compact)) return "deadlift";
  if (["hip thrust", "barbell hip thrust"].includes(compact)) return "hip-thrust";
  if (["leg press", "machine leg press"].includes(compact)) return "leg-press";
  if (["standing calf raise", "calf raise", "machine calf raise"].includes(compact)) return "calf";
  if (["plank", "front plank"].includes(compact)) return "plank";
  if (["pull up", "pullup", "pull ups", "pullups"].includes(compact)) return "pullup";
  if (["lat pulldown", "wide grip lat pulldown"].includes(compact)) return "lat-pulldown";
  if (["barbell row", "bent over barbell row", "bent over row"].includes(compact)) return "row";
  if (["lateral raise", "dumbbell lateral raise", "side lateral raise"].includes(compact)) return "lateral-raise";
  if (["overhead press", "military press", "barbell overhead press", "shoulder press"].includes(compact)) return "ohp";
  if (["triceps pushdown", "tricep pushdown", "cable triceps pushdown"].includes(compact)) return "triceps-push";
  if (["biceps curl", "dumbbell biceps curl", "dumbbell curl"].includes(compact)) return "curl";
  if (["incline dumbbell press", "incline dumbbell bench press"].includes(compact)) return "incline-db";
  if (["cable fly", "cable chest fly", "cable crossover"].includes(compact)) return "cable-fly";
  return undefined;
}

function mediaUrls(value: unknown, key: "image" | "video"): string[] {
  const rows = array<WgerMedia>(value).filter((item) => Boolean(text(item?.[key])));
  rows.sort((a, b) => Number(Boolean(b?.is_main)) - Number(Boolean(a?.is_main)));
  return Array.from(new Set(rows.map((item) => text(item?.[key])).filter(Boolean))).slice(0, 4);
}

function licenseLabel(row: WgerRow, translation: WgerTranslation | null): string {
  return text(translation?.license_title)
    || text(row.license?.full_name)
    || text(row.license?.short_name)
    || text(row.license?.name)
    || WGER_DATA_LICENSE;
}

export function normalizeWgerExerciseRow(input: unknown): FitExercise | null {
  const row = (input || {}) as WgerRow;
  const translation = chooseTranslation(row.translations);
  const name = cleanEnglishTitle(text(translation?.name));
  const sourceId = text(row.uuid) || String(Number(row.id) || "");
  if (!name || !sourceId) return null;
  const rawPrimary = namedMuscles(row.muscles);
  const rawSecondary = namedMuscles(row.muscles_secondary);
  const mappedPrimary = rawPrimary.map(mapMuscleName).filter((item): item is FitMuscle => Boolean(item));
  const mappedSecondary = rawSecondary.map(mapMuscleName).filter((item): item is FitMuscle => Boolean(item));
  const muscle = mappedPrimary[0] || categoryFallback(text(row.category?.name));
  const secondary = Array.from(new Set([...mappedPrimary.slice(1), ...mappedSecondary])).filter((item) => item !== muscle).slice(0, 5);
  const imageRows = array<WgerMedia>(row.images).filter((item) => Boolean(text(item?.image))).sort((a, b) => Number(Boolean(b?.is_main)) - Number(Boolean(a?.is_main)));
  const images = mediaUrls(imageRows, "image");
  const videos = mediaUrls(row.videos, "video");
  const mainImage = imageRows[0] || null;
  const description = translation?.description_source || translation?.description;
  const exercise: FitExercise = {
    id: `wger:${sourceId}`,
    name,
    muscle,
    secondary,
    equipment: mapEquipment(row.equipment),
    icon: muscleIcon[muscle],
    accent: FIT_MUSCLE_COLORS[muscle],
    source: "wger",
    sourceId,
    sourceLicense: licenseLabel(row, translation),
    sourceUrl: `${WGER_API_ROOT}/exerciseinfo/${Number(row.id) || sourceId}/`,
    sourceAuthor: text(translation?.license_author) || text(row.license_author) || undefined,
    mediaLicense: text(mainImage?.license_title) || undefined,
    mediaAuthor: text(mainImage?.license_author) || undefined,
    mediaSourceUrl: text(mainImage?.license_object_url) || undefined,
    category: text(row.category?.name) || undefined,
    rawPrimaryMuscles: rawPrimary,
    rawSecondaryMuscles: rawSecondary,
    instructions: instructionsFrom(description),
    imagePaths: images,
    videoUrls: videos,
    motionKey: inferMotionKey(name),
  };
  exercise.movementPattern = inferMovementPattern(exercise);
  exercise.goalTags = inferGoalTags(exercise);
  return exercise;
}

function readCacheEnvelope(): WgerCache | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WGER_EXERCISE_CACHE_KEY) || "null") as WgerCache | null;
    if (!parsed || parsed.version !== CACHE_VERSION || !Array.isArray(parsed.exercises)) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(exercises: FitExercise[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(WGER_EXERCISE_CACHE_KEY, JSON.stringify({ version: CACHE_VERSION, savedAt: Date.now(), exercises } satisfies WgerCache)); } catch {}
}

export function getCachedWgerExerciseCatalog(): FitExercise[] {
  const cached = readCacheEnvelope();
  if (!cached) return [];
  registerExternalFitExercises(cached.exercises);
  return cached.exercises;
}

async function fetchPages(force: boolean): Promise<WgerRow[]> {
  const rows: WgerRow[] = [];
  let next: string | null = WGER_EXERCISE_INFO_URL;
  let page = 0;
  while (next && page < MAX_PAGES) {
    const response = await fetch(next, { cache: force ? "reload" : "default", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`wger HTTP ${response.status}`);
    const payload = await response.json() as WgerPage;
    const current = array<WgerRow>(payload?.results);
    rows.push(...current);
    next = text(payload?.next) || null;
    page += 1;
    if (!current.length) break;
  }
  return rows;
}

export async function loadWgerExerciseCatalog(force = false): Promise<FitExercise[]> {
  const cached = readCacheEnvelope();
  if (!force && cached?.exercises?.length && Date.now() - cached.savedAt < CACHE_TTL_MS) {
    registerExternalFitExercises(cached.exercises);
    return cached.exercises;
  }
  const rows = await fetchPages(force);
  const exercises = rows.map(normalizeWgerExerciseRow).filter((item): item is FitExercise => Boolean(item));
  if (!exercises.length) throw new Error("wger : aucun exercice exploitable");
  exercises.sort((a, b) => a.name.localeCompare(b.name, "en"));
  writeCache(exercises);
  registerExternalFitExercises(exercises);
  return exercises;
}
