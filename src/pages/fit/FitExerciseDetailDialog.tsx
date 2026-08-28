import React from "react";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { speak } from "../../lib/voice";
import LOGO from "../../assets/LOGO.png";
import type { FitEquipment, FitExercise, FitMuscle, FitRecord } from "../../fit/fitStore";
import { formatKg, loadFitSessions } from "../../fit/fitStore";
import { freeExerciseImageUrl } from "../../fit/freeExerciseCatalog";
import { FIT_MUSCLE_COLORS, FIT_MUSCLE_LABELS, inferGoalTags, inferMovementPattern, normalizeLevel } from "../../fit/fitExerciseTaxonomy";
import { getAwenaPremiumMotion } from "../../fit/awenaPremiumMotions";
import FitExerciseMotion from "./FitExerciseMotion";
import { FitGlassCard, FitIcon, FitPill } from "./FitPerfUi";

type Props = {
  exercise: FitExercise;
  onClose: () => void;
  go: (route: any, params?: any) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  detailRecord?: FitRecord | null;
};

type DetailTab = "zone" | "details" | "objective" | "type" | "records";
type LangKey = "fr" | "en" | "es";
type Intensity = 0 | 1 | 2 | 3;
type ZoneLevels = {
  chest: Intensity;
  shoulders: Intensity;
  triceps: Intensity;
  biceps: Intensity;
  forearms: Intensity;
  abs: Intensity;
  back: Intensity;
  lowerBack: Intensity;
  glutes: Intensity;
  quads: Intensity;
  hamstrings: Intensity;
  adductors: Intensity;
  calves: Intensity;
  neck: Intensity;
};

type ExerciseGuide = {
  summaryTitle: string;
  summaryIntro: string;
  steps: { title: string; text: string; image?: string }[];
  sections: { title: string; points: string[] }[];
  voiceSummary: string;
  zoneSummary: string;
  objectiveSummary: string;
  typeSummary: string;
};

const AWENA_AVATAR = "/awena/awena-avatar.webp";
const PUSHUP_AWENA_IMAGES = [
  "/fit/exercise-media/pushup/awena-high.png",
  "/fit/exercise-media/pushup/awena-low.png",
];

const EMPTY_ZONES: ZoneLevels = {
  chest: 0,
  shoulders: 0,
  triceps: 0,
  biceps: 0,
  forearms: 0,
  abs: 0,
  back: 0,
  lowerBack: 0,
  glutes: 0,
  quads: 0,
  hamstrings: 0,
  adductors: 0,
  calves: 0,
  neck: 0,
};

function difficultyValue(level?: string) {
  const normalized = normalizeLevel(level);
  if (normalized === "Débutant") return 1;
  if (normalized === "Intermédiaire") return 2;
  if (normalized === "Avancé") return 3;
  return 1;
}

function DifficultyStars({ level, accent = "#ffd66b", size = 18 }: { level?: string; accent?: string; size?: number }) {
  const active = difficultyValue(level);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }} aria-label={`difficulty-${active}`}>
      {Array.from({ length: 3 }, (_, index) => (
        <span key={index} style={{ color: index < active ? accent : "rgba(255,255,255,.18)", fontSize: size, lineHeight: 1, textShadow: index < active ? `0 0 10px ${accent}55` : "none" }}>★</span>
      ))}
    </div>
  );
}

function equipmentIconName(equipment: FitEquipment): React.ComponentProps<typeof FitIcon>["name"] {
  switch (equipment) {
    case "Poids du corps": return "body";
    case "Haltères": return "dumbbell";
    case "Barre": return "barbell";
    case "Poulie": return "cable";
    case "Machine": return "machine";
    case "Kettlebell": return "kettlebell";
    case "Élastique":
    case "TRX": return "band";
    case "Médecine ball": return "medicine";
    default: return "workout";
  }
}

function localizeMovement(value: string, langKey: LangKey) {
  const key = String(value || "").trim().toLowerCase();
  const map: Record<string, { fr: string; en: string; es: string }> = {
    "poussée": { fr: "Poussée", en: "Push", es: "Empuje" },
    "tirage": { fr: "Tirage", en: "Pull", es: "Tirón" },
    "squat": { fr: "Squat", en: "Squat", es: "Sentadilla" },
    "charnière": { fr: "Charnière", en: "Hinge", es: "Bisagra" },
    "isolation": { fr: "Isolation", en: "Isolation", es: "Aislamiento" },
    "gainage": { fr: "Gainage", en: "Core / Plank", es: "Core / Plancha" },
    "mobilité": { fr: "Mobilité", en: "Mobility", es: "Movilidad" },
    "cardio": { fr: "Cardio", en: "Cardio", es: "Cardio" },
    "autre": { fr: "Autre", en: "Other", es: "Otro" },
  };
  return map[key]?.[langKey] || value;
}

function localizeGoal(goal: string, langKey: LangKey) {
  const key = String(goal || "").trim().toLowerCase();
  const map: Record<string, { fr: string; en: string; es: string }> = {
    force: { fr: "Force", en: "Strength", es: "Fuerza" },
    hypertrophie: { fr: "Hypertrophie", en: "Hypertrophy", es: "Hipertrofia" },
    endurance: { fr: "Endurance", en: "Endurance", es: "Resistencia" },
    mobilité: { fr: "Mobilité", en: "Mobility", es: "Movilidad" },
    explosivité: { fr: "Explosivité", en: "Explosiveness", es: "Explosividad" },
    cardio: { fr: "Cardio", en: "Cardio", es: "Cardio" },
  };
  return map[key]?.[langKey] || goal;
}

function localizeMechanic(value: string | undefined, langKey: LangKey) {
  const key = String(value || "").trim().toLowerCase();
  const map: Record<string, { fr: string; en: string; es: string }> = {
    compound: { fr: "Polyarticulaire", en: "Compound", es: "Compuesto" },
    isolation: { fr: "Isolation", en: "Isolation", es: "Aislamiento" },
  };
  return map[key]?.[langKey] || (value || (langKey === "fr" ? "Non précisé" : langKey === "es" ? "No especificado" : "Not specified"));
}

function localizeCategory(value: string | undefined, langKey: LangKey) {
  const key = String(value || "").trim().toLowerCase();
  const map: Record<string, { fr: string; en: string; es: string }> = {
    strength: { fr: "Force", en: "Strength", es: "Fuerza" },
    powerlifting: { fr: "Force athlétique", en: "Powerlifting", es: "Powerlifting" },
    stretching: { fr: "Étirements", en: "Stretching", es: "Estiramientos" },
    cardio: { fr: "Cardio", en: "Cardio", es: "Cardio" },
    olympic_weightlifting: { fr: "Haltérophilie", en: "Olympic lifting", es: "Halterofilia" },
    strongman: { fr: "Strongman", en: "Strongman", es: "Strongman" },
    plyometrics: { fr: "Pliométrie", en: "Plyometrics", es: "Pliometría" },
  };
  return map[key]?.[langKey] || (value || (langKey === "fr" ? "Libre" : langKey === "es" ? "Libre" : "Open"));
}

function localizeEquipment(value: string, langKey: LangKey) {
  const map: Record<string, { fr: string; en: string; es: string }> = {
    "Poids du corps": { fr: "Poids du corps", en: "Bodyweight", es: "Peso corporal" },
    "Haltères": { fr: "Haltères", en: "Dumbbells", es: "Mancuernas" },
    "Barre": { fr: "Barre", en: "Barbell", es: "Barra" },
    "Poulie": { fr: "Poulie", en: "Cable", es: "Polea" },
    "Machine": { fr: "Machine", en: "Machine", es: "Máquina" },
    "Kettlebell": { fr: "Kettlebell", en: "Kettlebell", es: "Kettlebell" },
    "Élastique": { fr: "Élastique", en: "Band", es: "Banda" },
    "TRX": { fr: "TRX", en: "TRX", es: "TRX" },
    "Banc": { fr: "Banc", en: "Bench", es: "Banco" },
    "Médecine ball": { fr: "Médecine ball", en: "Medicine ball", es: "Balón medicinal" },
    "Autre": { fr: "Autre", en: "Other", es: "Otro" },
  };
  return map[value]?.[langKey] || value;
}

function uniqueUrls(values: (string | null | undefined)[]) {
  const seen = new Set<string>();
  return values.filter((item): item is string => {
    if (!item) return false;
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function exercisePhotos(exercise: FitExercise) {
  const premium = getAwenaPremiumMotion(exercise.motionKey || exercise.id);
  const awena = exercise.id === "pushup" ? PUSHUP_AWENA_IMAGES : [];
  const free = (exercise.imagePaths || []).map((_, index) => freeExerciseImageUrl(exercise, index));
  return uniqueUrls([
    ...awena,
    premium?.video?.poster,
    premium?.frameSequence?.poster,
    ...free,
  ]).slice(0, 8);
}

function localizeLevel(level: string | undefined, langKey: LangKey) {
  const normalized = normalizeLevel(level);
  if (normalized === "Débutant") return langKey === "en" ? "Beginner" : langKey === "es" ? "Principiante" : "Débutant";
  if (normalized === "Intermédiaire") return langKey === "en" ? "Intermediate" : langKey === "es" ? "Intermedio" : "Intermédiaire";
  if (normalized === "Avancé") return langKey === "en" ? "Advanced" : langKey === "es" ? "Avanzado" : "Avancé";
  return langKey === "en" ? "Open level" : langKey === "es" ? "Nivel libre" : "Niveau libre";
}

function buildZoneLevels(exercise: FitExercise): ZoneLevels {
  const levels: ZoneLevels = { ...EMPTY_ZONES };
  const apply = (regions: (keyof ZoneLevels)[], value: Intensity) => {
    regions.forEach((region) => {
      levels[region] = Math.max(levels[region], value) as Intensity;
    });
  };
  const byMuscle = (muscle: FitMuscle, value: Intensity) => {
    switch (muscle) {
      case "Pectoraux": return apply(["chest"], value);
      case "Dos": return apply(["back"], value);
      case "Lombaires": return apply(["lowerBack"], value);
      case "Épaules": return apply(["shoulders"], value);
      case "Biceps": return apply(["biceps"], value);
      case "Triceps": return apply(["triceps"], value);
      case "Avant-bras": return apply(["forearms"], value);
      case "Abdos": return apply(["abs"], value);
      case "Fessiers": return apply(["glutes"], value);
      case "Quadriceps": return apply(["quads"], value);
      case "Ischios": return apply(["hamstrings"], value);
      case "Adducteurs": return apply(["adductors"], value);
      case "Abducteurs": return apply(["glutes"], value);
      case "Mollets": return apply(["calves"], value);
      case "Cou": return apply(["neck"], value);
      case "Full body":
        return apply(["chest", "shoulders", "back", "abs", "glutes", "quads", "hamstrings"], value);
      default:
        return undefined;
    }
  };
  byMuscle(exercise.muscle, 3);
  (exercise.secondary || []).forEach((muscle) => byMuscle(muscle, 2));
  const movement = inferMovementPattern(exercise);
  if (movement === "Poussée") apply(["abs", "forearms"], 1);
  if (movement === "Tirage") apply(["forearms"], 1);
  if (movement === "Squat") apply(["abs", "calves"], 1);
  if (movement === "Charnière") apply(["abs"], 1);
  return levels;
}

function intensityColor(value: Intensity) {
  if (value === 3) return "#ff4d5f";
  if (value === 2) return "#ff8a30";
  if (value === 1) return "#ffd45e";
  return "rgba(220,225,232,.12)";
}

function zoneStroke(value: Intensity) {
  return value > 0 ? "rgba(255,255,255,.62)" : "rgba(255,255,255,.1)";
}

function BodyZoneSilhouette({ side, zones }: { side: "front" | "back"; zones: ZoneLevels }) {
  const region = (d: string, fill: Intensity) => <path d={d} fill={intensityColor(fill)} stroke={zoneStroke(fill)} strokeWidth="1.2" />;
  return (
    <svg viewBox="0 0 140 280" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id={`silhouette-${side}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,.2)" />
          <stop offset="100%" stopColor="rgba(255,255,255,.08)" />
        </linearGradient>
      </defs>
      <circle cx="70" cy="24" r="16" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.12)" strokeWidth="1.4" />
      <path d="M52 42h36l16 26-12 18 8 30-10 52h-8l-5-45h-14l-5 45h-8l-10-52 8-30-12-18Z" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)" strokeWidth="1.4" />
      <path d="M50 78 36 118l10 8 10-34Z" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)" strokeWidth="1.2" />
      <path d="M90 78 104 118l-10 8-10-34Z" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)" strokeWidth="1.2" />
      <path d="M40 125 34 174l11 6 9-48Z" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)" strokeWidth="1.2" />
      <path d="M100 125 106 174l-11 6-9-48Z" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)" strokeWidth="1.2" />
      <path d="M60 168 54 246h16l3-78Z" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)" strokeWidth="1.2" />
      <path d="M80 168 77 246h16l-7-78Z" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)" strokeWidth="1.2" />
      <path d="M55 246h16l-3 10H52Z" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)" strokeWidth="1.1" />
      <path d="M77 246h16l3 10H80Z" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)" strokeWidth="1.1" />

      {side === "front" ? (
        <>
          {region("M62 40h16l-2 16H64Z", zones.neck)}
          {region("M46 52c6-5 14-7 18-4l-7 20-14 8-7-8c2-7 4-12 10-16Z", zones.shoulders)}
          {region("M94 52c-6-5-14-7-18-4l7 20 14 8 7-8c-2-7-4-12-10-16Z", zones.shoulders)}
          {region("M55 60c5-5 10-8 15-8 5 0 10 3 15 8l-5 27H60Z", zones.chest)}
          {region("M46 75 55 68l6 17-8 25-10-8 3-17Z", zones.triceps)}
          {region("M94 75 85 68l-6 17 8 25 10-8-3-17Z", zones.triceps)}
          {region("M38 122 52 112l-4 22-10 30-9-5 6-28Z", zones.forearms)}
          {region("M102 122 88 112l4 22 10 30 9-5-6-28Z", zones.forearms)}
          {region("M60 91h20l7 30-7 24H60l-7-24Z", zones.abs)}
          {region("M56 169h17l-3 72H53Z", zones.quads)}
          {region("M84 169H67l3 72h17Z", zones.quads)}
          {region("M60 169h10l-3 72h-8Z", zones.adductors)}
          {region("M80 169H70l3 72h8Z", zones.adductors)}
          {region("M56 218h13l-2 28H55Z", zones.calves)}
          {region("M83 218H70l2 28h12Z", zones.calves)}
        </>
      ) : (
        <>
          {region("M62 40h16l-2 16H64Z", zones.neck)}
          {region("M46 52c5-4 13-7 18-4l-5 22-16 7-7-9c3-6 5-12 10-16Z", zones.shoulders)}
          {region("M94 52c-5-4-13-7-18-4l5 22 16 7 7-9c-3-6-5-12-10-16Z", zones.shoulders)}
          {region("M57 58h26l8 50H49Z", zones.back)}
          {region("M59 108h22l5 20-5 14H59l-5-14Z", zones.lowerBack)}
          {region("M46 74 55 70l6 18-8 24-10-8 3-15Z", zones.triceps)}
          {region("M94 74 85 70l-6 18 8 24 10-8-3-15Z", zones.triceps)}
          {region("M38 122 52 113l-4 22-10 28-9-6 6-26Z", zones.forearms)}
          {region("M102 122 88 113l4 22 10 28 9-6-6-26Z", zones.forearms)}
          {region("M57 143h26l6 26-6 14H57l-6-14Z", zones.glutes)}
          {region("M56 169h17l-3 72H53Z", zones.hamstrings)}
          {region("M84 169H67l3 72h17Z", zones.hamstrings)}
          {region("M56 218h13l-2 28H55Z", zones.calves)}
          {region("M83 218H70l2 28h12Z", zones.calves)}
        </>
      )}
    </svg>
  );
}

function AwenaSpeakButton({ label, text, lang, accent = "#5ce9ff" }: { label: string; text: string; lang: string; accent?: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(text, { lang, rate: 0.96, pitch: 1, interrupt: true })}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 34, padding: "0 10px 0 4px", borderRadius: 999, border: `1px solid ${accent}44`, background: `linear-gradient(135deg,${accent}18,rgba(7,10,18,.94))`, color: accent, boxShadow: `0 0 14px ${accent}11` }}
    >
      <span style={{ width: 26, height: 26, borderRadius: 999, overflow: "hidden", display: "grid", placeItems: "center", border: `1px solid ${accent}55`, background: "#05080f" }}>
        <img src={AWENA_AVATAR} alt="Awena" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </span>
      <span style={{ fontSize: 7.6, fontWeight: 1000, letterSpacing: .7, textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
      <FitIcon name="coach" size={14} />
    </button>
  );
}

function buildExerciseGuide(exercise: FitExercise, langKey: LangKey, photos: string[]): ExerciseGuide {
  const isPushup = (exercise.motionKey || exercise.id) === "pushup" || /push.?up|pompe/i.test(exercise.name);
  const movement = localizeMovement(inferMovementPattern(exercise), langKey);
  const goals = inferGoalTags(exercise).map((goal) => localizeGoal(goal, langKey)).join(langKey === "es" ? " · " : " · ");
  if (isPushup) {
    if (langKey === "en") {
      return {
        summaryTitle: "Movement summary",
        summaryIntro: "A solid bodyweight push exercise focused on chest, triceps and shoulders while keeping the trunk braced.",
        steps: [
          { title: "Start position", text: "Hands slightly wider than shoulders, body straight, glutes and abs braced.", image: photos[0] },
          { title: "Controlled lowering", text: "Bend the elbows about 30 to 45° from the torso and lower the chest without collapsing.", image: photos[1] || photos[0] },
          { title: "Bottom position", text: "Chest comes close to the floor, neck stays neutral and hips do not sag.", image: photos[1] || photos[0] },
          { title: "Press back up", text: "Push through the palms to return to the top while keeping a straight line from head to heels.", image: photos[0] },
        ],
        sections: [
          { title: "Setup", points: ["Place the hands firmly on the floor.", "Open the chest and keep the shoulders down.", "Brace the core before the first rep."] },
          { title: "Execution", points: ["Lower under control.", "Keep the elbows tracking naturally.", "Press evenly with both arms."] },
          { title: "Breathing", points: ["Inhale on the way down.", "Exhale during the press upward."] },
          { title: "Avoid", points: ["Hips dropping.", "Head reaching forward.", "Half reps with no control."] },
        ],
        voiceSummary: "Pushups train the chest first, then the shoulders and triceps. Keep the whole body tight, lower with control, then press back up without breaking alignment.",
        zoneSummary: "Main work is on the chest. The shoulders and triceps assist strongly. The abs and trunk stabilize the entire movement.",
        objectiveSummary: "This exercise develops pushing strength, muscle endurance and upper body hypertrophy. It is also very easy to integrate in warm-ups, circuits or full workouts.",
        typeSummary: `This exercise is a ${movement} movement performed with ${localizeEquipment(exercise.equipment, langKey)}. Category ${localizeCategory(exercise.category, langKey)}. Mechanics ${localizeMechanic(exercise.mechanic, langKey)}. Goals: ${goals}.`,
      };
    }
    if (langKey === "es") {
      return {
        summaryTitle: "Resumen del movimiento",
        summaryIntro: "Ejercicio de empuje con peso corporal que trabaja sobre todo el pecho, los tríceps y los hombros, con el tronco siempre firme.",
        steps: [
          { title: "Posición inicial", text: "Manos un poco más anchas que los hombros, cuerpo recto, glúteos y abdominales activados.", image: photos[0] },
          { title: "Descenso controlado", text: "Flexiona los codos entre 30 y 45° respecto al torso y baja el pecho sin hundirte.", image: photos[1] || photos[0] },
          { title: "Posición baja", text: "El pecho se acerca al suelo, el cuello permanece neutro y la cadera no cae.", image: photos[1] || photos[0] },
          { title: "Empuje", text: "Empuja el suelo con las manos para volver arriba manteniendo una línea recta de cabeza a talones.", image: photos[0] },
        ],
        sections: [
          { title: "Colocación", points: ["Apoya bien las manos.", "Abre el pecho y baja los hombros.", "Activa el abdomen antes de empezar."] },
          { title: "Ejecución", points: ["Baja de forma controlada.", "Deja que los codos sigan una trayectoria natural.", "Empuja con los dos brazos de manera equilibrada."] },
          { title: "Respiración", points: ["Inhala al bajar.", "Exhala al subir."] },
          { title: "Errores a evitar", points: ["Cadera caída.", "Cabeza adelantada.", "Repeticiones recortadas y sin control."] },
        ],
        voiceSummary: "Las flexiones trabajan primero el pecho, luego los hombros y los tríceps. Mantén todo el cuerpo firme, baja con control y sube sin romper la alineación.",
        zoneSummary: "La zona principal es el pecho. Los hombros y los tríceps ayudan mucho. Los abdominales y el tronco estabilizan el movimiento.",
        objectiveSummary: "Este ejercicio mejora la fuerza de empuje, la resistencia muscular y la hipertrofia del tren superior. También es muy fácil de incluir en calentamientos o circuitos.",
        typeSummary: `Este ejercicio es de ${movement}, se realiza con ${localizeEquipment(exercise.equipment, langKey)}. Categoría ${localizeCategory(exercise.category, langKey)}. Mecánica ${localizeMechanic(exercise.mechanic, langKey)}. Objetivos: ${goals}.`,
      };
    }
    return {
      summaryTitle: "Résumé du mouvement",
      summaryIntro: "Exercice de poussée au poids du corps qui développe surtout les pectoraux, les triceps et les épaules, tout en demandant un gainage propre du tronc.",
      steps: [
        { title: "Position de départ", text: "Mains légèrement plus larges que les épaules, bras tendus, corps aligné de la tête aux talons.", image: photos[0] },
        { title: "Descente contrôlée", text: "Fléchis les coudes à environ 30 à 45° du buste et descends la poitrine sans casser la ligne du corps.", image: photos[1] || photos[0] },
        { title: "Position basse", text: "La poitrine approche du sol, la nuque reste neutre, les hanches ne s'affaissent pas.", image: photos[1] || photos[0] },
        { title: "Poussée vers le haut", text: "Repousse le sol avec les paumes pour revenir en haut en gardant le gainage et l'alignement.", image: photos[0] },
      ],
      sections: [
        { title: "Placement", points: ["Ancre les mains dans le sol.", "Gaine les abdos et les fessiers.", "Garde les épaules basses et la poitrine ouverte."] },
        { title: "Exécution", points: ["Descends lentement et proprement.", "Laisse les coudes suivre une trajectoire naturelle.", "Pousse de façon symétrique avec les deux bras."] },
        { title: "Respiration", points: ["Inspire pendant la descente.", "Expire pendant la poussée vers le haut."] },
        { title: "Erreurs à éviter", points: ["Bassin qui tombe.", "Tête projetée vers l'avant.", "Amplitude réduite sans contrôle."] },
      ],
      voiceSummary: "Les pompes travaillent d'abord les pectoraux, puis les épaules et les triceps. Garde tout le corps gainé, descends avec contrôle et repousse sans casser ton alignement.",
      zoneSummary: "La zone principale est les pectoraux. Les épaules et les triceps assistent fortement. Les abdos et le tronc stabilisent l'ensemble du mouvement.",
      objectiveSummary: "Cet exercice améliore la force de poussée, l'endurance musculaire et l'hypertrophie du haut du corps. Il s'intègre aussi très facilement dans les échauffements, les circuits et les séances complètes.",
      typeSummary: `Cet exercice est un mouvement de ${movement}, réalisé avec ${localizeEquipment(exercise.equipment, langKey)}. Catégorie ${localizeCategory(exercise.category, langKey)}. Mécanique ${localizeMechanic(exercise.mechanic, langKey)}. Objectifs : ${goals}.`,
    };
  }

  const localizedMuscle = FIT_MUSCLE_LABELS[exercise.muscle][langKey];
  const intro = langKey === "en"
    ? `This exercise mainly targets ${localizedMuscle}. Follow a stable, controlled technique and keep the movement quality consistent from rep to rep.`
    : langKey === "es"
      ? `Este ejercicio trabaja principalmente ${localizedMuscle}. Mantén una técnica estable y controlada en cada repetición.`
      : `Cet exercice cible principalement ${localizedMuscle}. Garde une technique stable et contrôlée, avec la même qualité d'exécution d'une répétition à l'autre.`;
  return {
    summaryTitle: langKey === "en" ? "Movement summary" : langKey === "es" ? "Resumen del movimiento" : "Résumé du mouvement",
    summaryIntro: intro,
    steps: [
      { title: langKey === "en" ? "Setup" : langKey === "es" ? "Placement" : "Placement", text: intro, image: photos[0] },
      { title: langKey === "en" ? "Execution" : langKey === "es" ? "Ejecución" : "Exécution", text: exercise.instructions?.[0] || intro, image: photos[1] || photos[0] },
      { title: langKey === "en" ? "Control" : langKey === "es" ? "Control" : "Contrôle", text: exercise.instructions?.[1] || intro, image: photos[2] || photos[0] },
      { title: langKey === "en" ? "Finish" : langKey === "es" ? "Final" : "Final", text: exercise.instructions?.[2] || intro, image: photos[0] },
    ],
    sections: [
      { title: langKey === "en" ? "Technical guide" : langKey === "es" ? "Guía técnica" : "Guide technique", points: (exercise.instructions || []).slice(0, 6) },
      { title: langKey === "en" ? "Key tips" : langKey === "es" ? "Puntos clave" : "Points clés", points: (exercise.tips || []).slice(0, 4) },
      { title: langKey === "en" ? "Mistakes to avoid" : langKey === "es" ? "Errores a evitar" : "Erreurs à éviter", points: (exercise.commonMistakes || []).slice(0, 4) },
    ].filter((section) => section.points.length),
    voiceSummary: intro,
    zoneSummary: langKey === "en" ? `${localizedMuscle} is the main area trained.` : langKey === "es" ? `${localizedMuscle} es la zona principal trabajada.` : `${localizedMuscle} est la zone principale travaillée.`,
    objectiveSummary: langKey === "en" ? `Goals: ${goals}.` : langKey === "es" ? `Objetivos: ${goals}.` : `Objectifs : ${goals}.`,
    typeSummary: langKey === "en" ? `Movement ${movement}. Equipment ${localizeEquipment(exercise.equipment, langKey)}.` : langKey === "es" ? `Movimiento ${movement}. Material ${localizeEquipment(exercise.equipment, langKey)}.` : `Mouvement ${movement}. Matériel ${localizeEquipment(exercise.equipment, langKey)}.`,
  };
}

export default function FitExerciseDetailDialog({ exercise, onClose, go, isFavorite, onToggleFavorite, detailRecord }: Props) {
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const langKey: LangKey = lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "fr";
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const accent = exercise.accent || "#5ce9ff";
  const photos = React.useMemo(() => exercisePhotos(exercise), [exercise]);
  const [tab, setTab] = React.useState<DetailTab>("zone");
  const [activePhoto, setActivePhoto] = React.useState<string | null>(null);
  const zones = React.useMemo(() => buildZoneLevels(exercise), [exercise]);
  const guide = React.useMemo(() => buildExerciseGuide(exercise, langKey, photos), [exercise, langKey, photos]);
  const goals = React.useMemo(() => inferGoalTags(exercise).map((goal) => localizeGoal(goal, langKey)), [exercise, langKey]);
  const movement = React.useMemo(() => localizeMovement(inferMovementPattern(exercise), langKey), [exercise, langKey]);

  React.useEffect(() => {
    setTab("zone");
    setActivePhoto(null);
  }, [exercise.id]);

  const exerciseStats = React.useMemo(() => {
    const sessions = loadFitSessions();
    let sessionsCount = 0;
    let totalSets = 0;
    let completedSets = 0;
    let totalReps = 0;
    let volume = 0;
    sessions.forEach((session) => {
      session.exercises.forEach((item) => {
        if (item.exerciseId !== exercise.id) return;
        sessionsCount += 1;
        item.sets.forEach((set) => {
          totalSets += 1;
          if (set.completed) {
            completedSets += 1;
            totalReps += Math.max(0, Number(set.reps) || 0);
            volume += Math.max(0, Number(set.weightKg) || 0) * Math.max(0, Number(set.reps) || 0);
          }
        });
      });
    });
    return { sessionsCount, totalSets, completedSets, totalReps, volume };
  }, [exercise.id]);

  const recordSpeech = detailRecord
    ? t(
        `Ton record personnel sur ${exercise.name} est ${formatKg(detailRecord.weightKg)} pour ${detailRecord.reps} répétitions. Estimation une répétition maximale ${formatKg(detailRecord.oneRm)}.`,
        `Your personal record on ${exercise.name} is ${formatKg(detailRecord.weightKg)} for ${detailRecord.reps} reps. Estimated one rep max ${formatKg(detailRecord.oneRm)}.`,
        `Tu récord personal en ${exercise.name} es ${formatKg(detailRecord.weightKg)} por ${detailRecord.reps} repeticiones. Estimación de una repetición máxima ${formatKg(detailRecord.oneRm)}.`
      )
    : t(
        `Aucun record personnel n'est encore enregistré sur ${exercise.name}.`,
        `No personal record is logged yet for ${exercise.name}.`,
        `Todavía no hay récord personal registrado para ${exercise.name}.`
      );

  const detailTabs: { id: DetailTab; label: string; icon: React.ComponentProps<typeof FitIcon>["name"] }[] = [
    { id: "zone", label: t("ZONE", "ZONE", "ZONA"), icon: "muscles" },
    { id: "details", label: t("DÉTAILS", "DETAILS", "DETALLES"), icon: "guide" },
    { id: "objective", label: t("OBJECTIF", "GOAL", "OBJETIVO"), icon: "goals" },
    { id: "type", label: t("TYPE", "TYPE", "TIPO"), icon: "workout" },
    { id: "records", label: t("RECORDS", "RECORDS", "RÉCORDS"), icon: "records" },
  ];

  return (
    <>
      <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(2,4,8,.82)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 760,
            maxHeight: "94vh",
            overflowY: "auto",
            borderRadius: 28,
            padding: 14,
            background: "linear-gradient(180deg, rgba(5,9,16,.985), rgba(6,10,18,.99))",
            border: `1px solid ${accent}42`,
            boxShadow: `0 30px 90px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05), 0 0 30px ${accent}12`,
          }}
        >
          <img src={LOGO} alt="" aria-hidden="true" style={{ position: "absolute", right: -105, bottom: -110, width: 430, opacity: .08, filter: "grayscale(1) brightness(1.6)", pointerEvents: "none" }} />
          <img src={LOGO} alt="" aria-hidden="true" style={{ position: "absolute", right: -85, top: 40, width: 300, opacity: .04, filter: "grayscale(1) brightness(1.5)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", color: "#fff" }}>
                  <span style={{ display: "grid", placeItems: "center", color: FIT_MUSCLE_COLORS[exercise.muscle], width: 26, height: 26 }}><FitIcon name="muscles" size={21} /></span>
                  <DifficultyStars level={exercise.level} accent="#ffd869" size={18} />
                  <span style={{ display: "grid", placeItems: "center", color: "#5ce9ff", width: 26, height: 26 }}><FitIcon name={equipmentIconName(exercise.equipment)} size={20} /></span>
                </div>
                <div style={{ marginTop: 10, fontSize: 28, lineHeight: 1.03, fontWeight: 1000, letterSpacing: -.65 }}>{exercise.name}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" aria-label={t("Favori", "Favorite", "Favorito")} onClick={onToggleFavorite} style={{ width: 48, height: 48, borderRadius: 16, border: `1px solid ${isFavorite ? "#f6c25688" : "rgba(255,255,255,.12)"}`, background: "rgba(6,10,18,.96)", color: "#f6c256", display: "grid", placeItems: "center", boxShadow: isFavorite ? "0 0 18px rgba(246,194,86,.18)" : "none" }}><FitIcon name="favorite" size={21} /></button>
                <button type="button" aria-label={t("Ajouter à ma séance", "Add to my workout", "Añadir a mi sesión")} onClick={() => go("games", { fitTemplateId: "free", fitExerciseId: exercise.id })} style={{ width: 48, height: 48, borderRadius: 16, border: `1px solid ${accent}66`, background: "rgba(6,10,18,.96)", color: accent, display: "grid", placeItems: "center", boxShadow: `0 0 18px ${accent}14` }}><FitIcon name="plus" size={22} /></button>
                <button type="button" onClick={onClose} aria-label={t("Fermer", "Close", "Cerrar")} style={{ width: 48, height: 48, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 22 }}>×</button>
              </div>
            </div>

            <div style={{ marginTop: 14, borderRadius: 24, overflow: "hidden", border: `1px solid ${accent}34`, background: "rgba(2,4,8,.65)", boxShadow: `inset 0 0 0 1px ${accent}08, 0 16px 36px rgba(0,0,0,.28)` }}>
              <FitExerciseMotion exercise={exercise} accent={accent} />
            </div>

            <div role="tablist" aria-label={t("Détails de l'exercice", "Exercise details", "Detalles del ejercicio")} style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", padding: "10px 0 2px", scrollbarWidth: "none" }}>
              {detailTabs.map((item) => {
                const active = item.id === tab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(item.id)}
                    style={{
                      flex: active ? "0 0 auto" : "0 0 42px",
                      minWidth: active ? 120 : 42,
                      width: active ? "auto" : 42,
                      height: 42,
                      borderRadius: 14,
                      border: `1px solid ${active ? accent + "70" : "transparent"}`,
                      background: active ? `linear-gradient(135deg,${accent}1b,rgba(255,255,255,.04))` : "transparent",
                      color: active ? accent : "rgba(255,255,255,.62)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: active ? 8 : 0,
                      padding: active ? "0 14px" : 0,
                      boxShadow: active ? `0 0 16px ${accent}12` : "none",
                    }}
                  >
                    <FitIcon name={item.icon} size={20} />
                    {active ? <span style={{ fontSize: 8.6, fontWeight: 1000, letterSpacing: .65, textTransform: "uppercase", whiteSpace: "nowrap" }}>{item.label}</span> : null}
                  </button>
                );
              })}
            </div>

            {photos.length ? (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 0 4px" }}>
                {photos.map((url, index) => (
                  <button key={`${exercise.id}-${index}`} type="button" onClick={() => setActivePhoto(url)} style={{ padding: 0, border: `1px solid ${accent}24`, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,.02)", flex: "0 0 auto", width: 142, height: 80, boxShadow: index === 0 ? `0 0 14px ${accent}10` : "none" }}>
                    <img src={url} alt={`${exercise.name} ${index + 1}`} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            ) : null}

            <div style={{ position: "relative", marginTop: 8, borderRadius: 24, padding: 14, border: `1px solid ${accent}28`, background: "linear-gradient(180deg,rgba(7,11,18,.96),rgba(4,8,14,.985))", overflow: "hidden", minHeight: 280 }}>
              <img src={LOGO} alt="" aria-hidden="true" style={{ position: "absolute", right: -92, bottom: -92, width: 360, opacity: .09, filter: "grayscale(1) brightness(1.55)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                {tab === "zone" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ color: accent, fontSize: 11.5, fontWeight: 1000, letterSpacing: 1.1 }}>{t("ZONES TRAVAILLÉES", "WORKED AREAS", "ZONAS TRABAJADAS")}</div>
                      <AwenaSpeakButton label={t("AWENA LIT LA ZONE", "AWENA READS THE ZONE", "AWENA LEE LA ZONA")} text={guide.zoneSummary} lang={langKey === "fr" ? "fr-FR" : langKey === "es" ? "es-ES" : "en-US"} accent={accent} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginTop: 12 }}>
                      <FitGlassCard accent={accent} style={{ padding: 10, borderRadius: 20, background: "linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.012))" }}>
                        <div style={{ textAlign: "center", color: "rgba(255,255,255,.56)", fontSize: 7.5, fontWeight: 1000, letterSpacing: .95 }}>{t("FACE", "FRONT", "FRENTE")}</div>
                        <div style={{ height: 250 }}><BodyZoneSilhouette side="front" zones={zones} /></div>
                      </FitGlassCard>
                      <FitGlassCard accent={accent} style={{ padding: 10, borderRadius: 20, background: "linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.012))" }}>
                        <div style={{ textAlign: "center", color: "rgba(255,255,255,.56)", fontSize: 7.5, fontWeight: 1000, letterSpacing: .95 }}>{t("DOS", "BACK", "ESPALDA")}</div>
                        <div style={{ height: 250 }}><BodyZoneSilhouette side="back" zones={zones} /></div>
                      </FitGlassCard>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, color: "rgba(255,255,255,.84)", fontSize: 8.3 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 99, background: intensityColor(1) }} />{t("Jaune : légèrement travaillé", "Yellow: lightly worked", "Amarillo: ligeramente trabajado")}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 99, background: intensityColor(2) }} />{t("Orange : modérément travaillé", "Orange: moderately worked", "Naranja: trabajo moderado")}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 99, background: intensityColor(3) }} />{t("Rouge : fortement travaillé", "Red: heavily worked", "Rojo: trabajo intenso")}</span>
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gap: 8, color: "rgba(255,255,255,.86)", fontSize: 8.9, lineHeight: 1.5 }}>
                      <div><strong style={{ color: FIT_MUSCLE_COLORS[exercise.muscle] }}>{t("Zone principale", "Main area", "Zona principal")}</strong> — {FIT_MUSCLE_LABELS[exercise.muscle][langKey]}</div>
                      {(exercise.secondary || []).length ? <div><strong style={{ color: "#ff9f50" }}>{t("Zones d'assistance", "Assisting areas", "Zonas de apoyo")}</strong> — {(exercise.secondary || []).map((item) => FIT_MUSCLE_LABELS[item][langKey]).join(" · ")}</div> : null}
                      <div>{guide.zoneSummary}</div>
                    </div>
                  </>
                ) : null}

                {tab === "details" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ color: accent, fontSize: 11.5, fontWeight: 1000, letterSpacing: 1.1 }}>{t("DÉTAILS DE L'EXERCICE", "EXERCISE DETAILS", "DETALLES DEL EJERCICIO")}</div>
                      <AwenaSpeakButton label={t("AWENA LIT LE GUIDE", "AWENA READS THE GUIDE", "AWENA LEE LA GUÍA")} text={guide.voiceSummary} lang={langKey === "fr" ? "fr-FR" : langKey === "es" ? "es-ES" : "en-US"} accent={accent} />
                    </div>

                    <FitGlassCard accent={accent} style={{ marginTop: 12, padding: 12, borderRadius: 20, background: `linear-gradient(135deg,${accent}10,rgba(255,255,255,.02))` }}>
                      <div style={{ color: accent, fontSize: 8.2, fontWeight: 1000, letterSpacing: .9 }}>{guide.summaryTitle}</div>
                      <div style={{ marginTop: 7, color: "rgba(255,255,255,.86)", fontSize: 8.8, lineHeight: 1.45 }}>{guide.summaryIntro}</div>
                    </FitGlassCard>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 12 }}>
                      {guide.steps.map((step, index) => (
                        <FitGlassCard key={index} accent={accent} style={{ overflow: "hidden", borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.014))" }}>
                          {step.image ? <img src={step.image} alt="" draggable={false} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} /> : null}
                          <div style={{ padding: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${accent}55`, color: accent, fontSize: 8.2, fontWeight: 1000 }}>{index + 1}</span>
                              <div style={{ color: "#fff", fontSize: 8.5, fontWeight: 1000 }}>{step.title}</div>
                            </div>
                            <div style={{ marginTop: 7, color: "rgba(255,255,255,.8)", fontSize: 8.2, lineHeight: 1.45 }}>{step.text}</div>
                          </div>
                        </FitGlassCard>
                      ))}
                    </div>

                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      {guide.sections.map((section, index) => (
                        <FitGlassCard key={index} accent={accent} style={{ padding: 12, borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.014))" }}>
                          <div style={{ color: accent, fontSize: 8, fontWeight: 1000, letterSpacing: .9 }}>{section.title}</div>
                          <ul style={{ margin: "8px 0 0", paddingLeft: 17, display: "grid", gap: 6, color: "rgba(255,255,255,.85)", fontSize: 8.4, lineHeight: 1.45 }}>
                            {section.points.map((point, pointIndex) => <li key={pointIndex}>{point}</li>)}
                          </ul>
                        </FitGlassCard>
                      ))}
                    </div>
                  </>
                ) : null}

                {tab === "objective" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ color: accent, fontSize: 11.5, fontWeight: 1000, letterSpacing: 1.1 }}>{t("OBJECTIF", "GOAL", "OBJETIVO")}</div>
                      <AwenaSpeakButton label={t("AWENA EXPLIQUE L'OBJECTIF", "AWENA EXPLAINS THE GOAL", "AWENA EXPLICA EL OBJETIVO")} text={guide.objectiveSummary} lang={langKey === "fr" ? "fr-FR" : langKey === "es" ? "es-ES" : "en-US"} accent={accent} />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      {goals.map((goal) => <FitPill key={goal} accent={accent}>{goal}</FitPill>)}
                    </div>
                    <FitGlassCard accent={accent} style={{ marginTop: 12, padding: 14, borderRadius: 20, background: `linear-gradient(135deg,${accent}10,rgba(255,255,255,.018))` }}>
                      <div style={{ color: "rgba(255,255,255,.9)", fontSize: 9, lineHeight: 1.55 }}>{guide.objectiveSummary}</div>
                    </FitGlassCard>
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <FitGlassCard accent={accent} style={{ padding: 12, borderRadius: 18 }}>
                        <div style={{ color: accent, fontSize: 8, fontWeight: 1000, letterSpacing: .85 }}>{t("POURQUOI FAIRE CET EXERCICE ?", "WHY DO THIS EXERCISE?", "¿POR QUÉ HACER ESTE EJERCICIO?")}</div>
                        <ul style={{ margin: "8px 0 0", paddingLeft: 17, display: "grid", gap: 6, color: "rgba(255,255,255,.84)", fontSize: 8.4, lineHeight: 1.45 }}>
                          <li>{t("Renforcer la chaîne principale du mouvement et améliorer la qualité technique.", "Strengthen the main movement chain and improve technical quality.", "Fortalecer la cadena principal del movimiento y mejorar la calidad técnica.")}</li>
                          <li>{t("Développer la force, l'endurance locale et la progression sur cet exercice.", "Build strength, local endurance and progression on this exercise.", "Desarrollar fuerza, resistencia local y progresión en este ejercicio.")}</li>
                          <li>{t("Mieux comprendre où cet exercice s'intègre dans une séance et à quel moment le placer.", "Understand where this exercise fits in a workout and when to place it.", "Comprender dónde encaja este ejercicio en una sesión y cuándo colocarlo.")}</li>
                        </ul>
                      </FitGlassCard>
                    </div>
                  </>
                ) : null}

                {tab === "type" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ color: accent, fontSize: 11.5, fontWeight: 1000, letterSpacing: 1.1 }}>{t("TYPE DE MOUVEMENT", "MOVEMENT TYPE", "TIPO DE MOVIMIENTO")}</div>
                      <AwenaSpeakButton label={t("AWENA EXPLIQUE LE TYPE", "AWENA EXPLAINS THE TYPE", "AWENA EXPLICA EL TIPO")} text={guide.typeSummary} lang={langKey === "fr" ? "fr-FR" : langKey === "es" ? "es-ES" : "en-US"} accent={accent} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 12 }}>
                      {[
                        { label: t("MOUVEMENT", "MOVEMENT", "MOVIMIENTO"), value: movement },
                        { label: t("MATÉRIEL", "EQUIPMENT", "MATERIAL"), value: localizeEquipment(exercise.equipment, langKey) },
                        { label: t("CATÉGORIE", "CATEGORY", "CATEGORÍA"), value: localizeCategory(exercise.category, langKey) },
                        { label: t("MÉCANIQUE", "MECHANICS", "MECÁNICA"), value: localizeMechanic(exercise.mechanic, langKey) },
                      ].map((item) => (
                        <FitGlassCard key={item.label} accent={accent} style={{ padding: 12, borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.014))" }}>
                          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 8, fontWeight: 1000, letterSpacing: .85 }}>{item.label}</div>
                          <div style={{ marginTop: 4, color: accent, fontSize: 12.8, lineHeight: 1.15, fontWeight: 1000 }}>{item.value}</div>
                        </FitGlassCard>
                      ))}
                    </div>
                    <FitGlassCard accent={accent} style={{ marginTop: 12, padding: 13, borderRadius: 18 }}>
                      <div style={{ color: "rgba(255,255,255,.86)", fontSize: 8.7, lineHeight: 1.55 }}>{guide.typeSummary}</div>
                    </FitGlassCard>
                  </>
                ) : null}

                {tab === "records" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ color: accent, fontSize: 11.5, fontWeight: 1000, letterSpacing: 1.1 }}>{t("RECORDS", "RECORDS", "RÉCORDS")}</div>
                      <AwenaSpeakButton label={t("AWENA LIT LES RECORDS", "AWENA READS THE RECORDS", "AWENA LEE LOS RÉCORDS")} text={recordSpeech} lang={langKey === "fr" ? "fr-FR" : langKey === "es" ? "es-ES" : "en-US"} accent={accent} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 12 }}>
                      <FitGlassCard accent="#7df29a" style={{ padding: 13, borderRadius: 20, background: "linear-gradient(180deg,rgba(125,242,154,.08),rgba(255,255,255,.014))" }}>
                        <div style={{ color: "#7df29a", fontSize: 8, fontWeight: 1000, letterSpacing: .9 }}>{t("RECORD PERSONNEL", "PERSONAL RECORD", "RÉCORD PERSONAL")}</div>
                        <div style={{ marginTop: 8, color: "#fff", fontSize: 16, fontWeight: 1000 }}>{detailRecord ? `${formatKg(detailRecord.weightKg)} × ${detailRecord.reps}` : "—"}</div>
                        <div style={{ marginTop: 5, color: "rgba(255,255,255,.74)", fontSize: 8.2 }}>{detailRecord ? `${t("1RM estimé", "Estimated 1RM", "1RM estimado")} : ${formatKg(detailRecord.oneRm)}` : t("Aucun record enregistré pour le moment.", "No record logged yet.", "Todavía no hay récord registrado.")}</div>
                      </FitGlassCard>
                      <FitGlassCard accent="#f6c256" style={{ padding: 13, borderRadius: 20, background: "linear-gradient(180deg,rgba(246,194,86,.08),rgba(255,255,255,.014))" }}>
                        <div style={{ color: "#f6c256", fontSize: 8, fontWeight: 1000, letterSpacing: .9 }}>{t("RECORD GLOBAL", "GLOBAL RECORD", "RÉCORD GLOBAL")}</div>
                        <div style={{ marginTop: 8, color: "#fff", fontSize: 16, fontWeight: 1000 }}>{t("Bientôt", "Soon", "Próximamente")}</div>
                        <div style={{ marginTop: 5, color: "rgba(255,255,255,.74)", fontSize: 8.2 }}>{t("Prévu pour les classements et comparatifs cloud par exercice.", "Planned for cloud rankings and exercise leaderboards.", "Previsto para clasificaciones y comparativas cloud por ejercicio.")}</div>
                      </FitGlassCard>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 12 }}>
                      <FitGlassCard accent={accent} style={{ padding: 12, borderRadius: 18 }}>
                        <div style={{ color: "rgba(255,255,255,.52)", fontSize: 8, fontWeight: 1000, letterSpacing: .85 }}>{t("SESSIONS", "SESSIONS", "SESIONES")}</div>
                        <div style={{ marginTop: 4, color: accent, fontSize: 14.5, fontWeight: 1000 }}>{exerciseStats.sessionsCount}</div>
                        <div style={{ marginTop: 4, color: "rgba(255,255,255,.7)", fontSize: 8.1 }}>{t("apparitions dans l'historique", "appearances in history", "apariciones en el historial")}</div>
                      </FitGlassCard>
                      <FitGlassCard accent={accent} style={{ padding: 12, borderRadius: 18 }}>
                        <div style={{ color: "rgba(255,255,255,.52)", fontSize: 8, fontWeight: 1000, letterSpacing: .85 }}>{t("RÉPÉTITIONS EFFECTUÉES", "COMPLETED REPS", "REPETICIONES REALIZADAS")}</div>
                        <div style={{ marginTop: 4, color: accent, fontSize: 14.5, fontWeight: 1000 }}>{exerciseStats.totalReps}</div>
                        <div style={{ marginTop: 4, color: "rgba(255,255,255,.7)", fontSize: 8.1 }}>{exerciseStats.completedSets} / {exerciseStats.totalSets} {t("séries validées", "sets completed", "series validadas")}</div>
                      </FitGlassCard>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activePhoto ? (
        <div onClick={() => setActivePhoto(null)} style={{ position: "fixed", inset: 0, zIndex: 160, background: "rgba(0,0,0,.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <img src={activePhoto} alt="" draggable={false} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 18 }} />
        </div>
      ) : null}
    </>
  );
}
