import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import type { FitExercise, FitMuscle, FitRecord } from "../../fit/fitStore";
import { formatKg } from "../../fit/fitStore";
import { freeExerciseImageUrl } from "../../fit/freeExerciseCatalog";
import { FIT_MUSCLE_COLORS, FIT_MUSCLE_LABELS, inferGoalTags, inferMovementPattern, normalizeLevel } from "../../fit/fitExerciseTaxonomy";
import FitBodyMap from "./FitBodyMap";
import FitExerciseMotion from "./FitExerciseMotion";
import { FitGlassCard, FitIcon, FitIconTabs, FitPill } from "./FitPerfUi";
import LOGO from "../../assets/LOGO.png";

type DetailTab = "zone" | "details" | "goal" | "type" | "records";

type Props = {
  exercise: FitExercise;
  onClose: () => void;
  go: (route: any, params?: any) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  detailRecord: FitRecord | null;
};

const PUSHUP_AWENA_HIGH = "/fit/exercise-media/pushup/awena-high.png";
const PUSHUP_AWENA_LOW = "/fit/exercise-media/pushup/awena-low.png";

type GuideStep = { title: string; body: string; image: string | null };
type ExerciseGuide = {
  summary: string;
  steps: GuideStep[];
  placement: string[];
  breathing: string[];
  intensityMap: Partial<Record<FitMuscle, 0 | 1 | 2 | 3>>;
  zoneSpeech: string;
  detailSpeech: string;
  goalSpeech: string;
  typeSpeech: string;
  goalParagraphs: string[];
  goalTags: string[];
  typeCards: { label: string; value: string }[];
};

function tr(lang: string, fr: string, en: string, es: string) {
  return lang.startsWith("en") ? en : lang.startsWith("es") ? es : fr;
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function localizeInstructionText(text: string, lang: string) {
  const value = String(text || "").trim();
  if (!value || !lang.startsWith("fr")) return value;
  const exact: Record<string, string> = {
    "Lie on the floor face down and place your hands about 36 inches apart while holding your torso up at arms length.": "Allonge-toi face au sol et place les mains à environ 90 cm l'une de l'autre tout en maintenant le buste bras tendus.",
    "Next, lower yourself downward until your chest almost touches the floor as you inhale.": "Ensuite, descends de manière contrôlée jusqu'à ce que la poitrine frôle presque le sol en inspirant.",
    "Now breathe out and press your upper body back up to the starting position while squeezing your chest.": "Souffle puis repousse le haut du corps vers la position de départ en contractant les pectoraux.",
    "After a brief pause at the top contracted position, you can begin to lower yourself downward again for as many repetitions as needed.": "Après une courte pause en haut, recommence la descente et enchaîne le nombre de répétitions prévu.",
    "This exercise requires a sturdy box or a chair.": "Cet exercice demande un box stable ou une chaise solide.",
    "Simple stand ~6 inches in front of it and balance yourself on one leg.": "Place-toi à environ 15 cm devant le support et tiens l'équilibre sur une seule jambe.",
    "From here, begin squatting down in a smooth controlled motion while keeping your other leg straight out in front of you for balance.": "Depuis cette position, fléchis la jambe d'appui en descendant de manière lente et contrôlée tout en gardant l'autre jambe tendue devant toi pour l'équilibre.",
    "Slowly sit down on the box, pause for a 1 count and push back up with the working leg, while never letting your other leg touch the ground.": "Assieds-toi lentement sur le box, marque une courte pause puis repousse avec la jambe d'appui sans laisser l'autre jambe toucher le sol.",
  };
  if (exact[value]) return exact[value];
  return value
    .replace(/body weight/gi, "poids du corps")
    .replace(/bodyweight/gi, "poids du corps")
    .replace(/chest/gi, "poitrine")
    .replace(/shoulders/gi, "épaules")
    .replace(/triceps/gi, "triceps")
    .replace(/inhale/gi, "inspirant")
    .replace(/exhale|breathe out/gi, "souffle")
    .replace(/starting position/gi, "position de départ")
    .replace(/one leg/gi, "une jambe")
    .replace(/box or a chair/gi, "box ou une chaise")
    .replace(/working leg/gi, "jambe d'appui");
}

function translateEquipment(value: string, lang: string) {
  const compact = String(value || "").trim().toLowerCase();
  const map: Record<string, { fr: string; en: string; es: string }> = {
    "body weight": { fr: "Poids du corps", en: "Bodyweight", es: "Peso corporal" },
    "bodyweight": { fr: "Poids du corps", en: "Bodyweight", es: "Peso corporal" },
    "barbell": { fr: "Barre", en: "Barbell", es: "Barra" },
    "dumbbell": { fr: "Haltères", en: "Dumbbell", es: "Mancuernas" },
    "machine": { fr: "Machine", en: "Machine", es: "Máquina" },
    "cable": { fr: "Poulie", en: "Cable", es: "Polea" },
    "kettlebell": { fr: "Kettlebell", en: "Kettlebell", es: "Kettlebell" },
    "band": { fr: "Bande élastique", en: "Band", es: "Banda" },
    "medicine ball": { fr: "Medecine ball", en: "Medicine ball", es: "Balón medicinal" },
  };
  const item = map[compact];
  return item ? tr(lang, item.fr, item.en, item.es) : value;
}

function translateMovement(value: string, lang: string) {
  const compact = String(value || "").trim().toLowerCase();
  if (compact.includes("push") || compact.includes("pouss")) return tr(lang, "Poussée", "Push", "Empuje");
  if (compact.includes("pull") || compact.includes("tir")) return tr(lang, "Tirage", "Pull", "Tirón");
  if (compact.includes("squat")) return tr(lang, "Flexion", "Squat", "Sentadilla");
  return titleCase(tr(lang, value, value, value));
}

function translateCategory(value: string, lang: string) {
  const compact = String(value || "").trim().toLowerCase();
  if (compact === "strength") return tr(lang, "Renforcement", "Strength", "Fuerza");
  if (compact === "cardio") return tr(lang, "Cardio", "Cardio", "Cardio");
  if (compact === "stretching") return tr(lang, "Mobilité", "Mobility", "Movilidad");
  return titleCase(tr(lang, value, value, value));
}

function translateMechanic(value: string, lang: string) {
  const compact = String(value || "").trim().toLowerCase();
  if (compact === "compound") return tr(lang, "Polyarticulaire", "Compound", "Compuesto");
  if (compact === "isolation") return tr(lang, "Isolation", "Isolation", "Aislamiento");
  return titleCase(tr(lang, value, value, value));
}

function levelText(level: string | undefined, lang: string) {
  const normalized = normalizeLevel(level);
  if (normalized === "Débutant") return tr(lang, "Débutant", "Beginner", "Principiante");
  if (normalized === "Intermédiaire") return tr(lang, "Intermédiaire", "Intermediate", "Intermedio");
  if (normalized === "Avancé") return tr(lang, "Avancé", "Advanced", "Avanzado");
  return level || tr(lang, "Libre", "Open", "Libre");
}

function equipmentIconName(value: string): "body" | "barbell" | "dumbbell" | "cable" | "machine" | "kettlebell" | "band" | "medicine" {
  const compact = String(value || "").toLowerCase();
  if (compact.includes("barbell") || compact.includes("barre")) return "barbell";
  if (compact.includes("dumbbell") || compact.includes("halt")) return "dumbbell";
  if (compact.includes("cable") || compact.includes("poulie")) return "cable";
  if (compact.includes("machine")) return "machine";
  if (compact.includes("kettlebell")) return "kettlebell";
  if (compact.includes("band") || compact.includes("elastic")) return "band";
  if (compact.includes("medicine")) return "medicine";
  return "body";
}

function collectExercisePhotos(exercise: FitExercise) {
  if (exercise.id === "pushup") {
    return Array.from(new Set([
      PUSHUP_AWENA_HIGH,
      PUSHUP_AWENA_LOW,
      freeExerciseImageUrl(exercise, 0),
      freeExerciseImageUrl(exercise, 1),
    ].filter((item): item is string => Boolean(item))));
  }
  const urls = (exercise.imagePaths || []).map((_, index) => freeExerciseImageUrl(exercise, index)).filter((item): item is string => Boolean(item));
  const fallback = freeExerciseImageUrl(exercise);
  return Array.from(new Set([fallback, ...urls].filter((item): item is string => Boolean(item)))).slice(0, 6);
}

function buildGuide(exercise: FitExercise, lang: string): ExerciseGuide {
  if (exercise.id === "pushup") {
    const summary = tr(
      lang,
      "Exercice de poussée au poids du corps qui développe surtout les pectoraux, les triceps et les épaules, tout en demandant un gainage propre du tronc.",
      "A bodyweight pushing exercise that mainly develops the chest, triceps and shoulders while requiring solid trunk bracing.",
      "Ejercicio de empuje con peso corporal que desarrolla sobre todo el pecho, los tríceps y los hombros, mientras exige un buen bloqueo del tronco.",
    );
    const steps: GuideStep[] = [
      {
        title: tr(lang, "Position de départ", "Start position", "Posición inicial"),
        body: tr(lang, "Mains légèrement plus larges que les épaules, bras tendus, jambes serrées, corps aligné de la tête aux talons.", "Hands slightly wider than shoulder width, arms straight, legs together, body aligned from head to heels.", "Manos un poco más abiertas que los hombros, brazos extendidos, piernas juntas y cuerpo alineado de la cabeza a los talones."),
        image: PUSHUP_AWENA_HIGH,
      },
      {
        title: tr(lang, "Descente contrôlée", "Controlled descent", "Descenso controlado"),
        body: tr(lang, "Fléchis les coudes à environ 30 à 45° du buste et descends la poitrine vers le sol sans casser ta ligne corporelle.", "Bend the elbows at roughly 30 to 45° from the torso and lower the chest toward the floor without breaking body alignment.", "Flexiona los codos unos 30 a 45° del torso y baja el pecho hacia el suelo sin perder la alineación corporal."),
        image: freeExerciseImageUrl(exercise, 0) || PUSHUP_AWENA_LOW,
      },
      {
        title: tr(lang, "Position basse", "Bottom position", "Posición baja"),
        body: tr(lang, "La poitrine approche du sol, la nuque reste neutre et les hanches ne s'affaissent pas.", "The chest approaches the floor, the neck stays neutral and the hips do not sag.", "El pecho se acerca al suelo, el cuello permanece neutro y las caderas no se hunden."),
        image: PUSHUP_AWENA_LOW,
      },
      {
        title: tr(lang, "Poussée vers le haut", "Press back up", "Empuje hacia arriba"),
        body: tr(lang, "Repousse le sol avec les paumes pour revenir en haut en gardant le gainage et l'alignement du corps.", "Push the floor away with your palms to return to the top while keeping your brace and full-body alignment.", "Empuja el suelo con las palmas para volver arriba manteniendo la tensión del cuerpo y la alineación."),
        image: freeExerciseImageUrl(exercise, 1) || PUSHUP_AWENA_HIGH,
      },
    ];
    return {
      summary,
      steps,
      placement: [
        tr(lang, "Ancre tes mains dans le sol et répartis la pression sur toute la paume.", "Screw your hands into the floor and spread pressure through the full palm.", "Ancla tus manos al suelo y reparte la presión por toda la palma."),
        tr(lang, "Gaine les abdos et les fessiers pour garder un bloc solide.", "Brace the abs and glutes to keep the body rigid.", "Activa abdomen y glúteos para mantener el cuerpo firme."),
        tr(lang, "Garde les épaules basses et la poitrine ouverte sans hausser les trapèzes.", "Keep the shoulders down and the chest open without shrugging the traps.", "Mantén los hombros bajos y el pecho abierto sin encoger los trapecios."),
      ],
      breathing: [
        tr(lang, "Inspire pendant la descente.", "Inhale on the way down.", "Inspira durante la bajada."),
        tr(lang, "Souffle fort pendant la poussée pour aider le gainage.", "Exhale strongly during the press to reinforce bracing.", "Exhala con fuerza durante el empuje para reforzar el bloqueo."),
      ],
      intensityMap: { Pectoraux: 3, Épaules: 2, Triceps: 2, Abdos: 1 },
      zoneSpeech: tr(lang, "Les pompes ciblent fortement les pectoraux. Les épaules et les triceps assistent la poussée, tandis que les abdos stabilisent le corps pendant tout le mouvement.", "Pushups strongly target the chest. The shoulders and triceps assist the press, while the abs stabilize the whole body throughout the movement.", "Las flexiones trabajan con intensidad el pecho. Los hombros y tríceps asisten el empuje y los abdominales estabilizan el cuerpo durante todo el movimiento."),
      detailSpeech: tr(lang, "Place tes mains un peu plus larges que les épaules, gaine le tronc, descends de façon contrôlée puis repousse jusqu'à l'extension sans casser l'alignement du corps.", "Place your hands slightly wider than shoulder width, brace the trunk, lower under control and push back to full extension without losing alignment.", "Coloca las manos un poco más abiertas que los hombros, activa el tronco, baja de forma controlada y empuja hasta extender sin perder la alineación."),
      goalSpeech: tr(lang, "Les pompes servent surtout à développer la force relative, l'hypertrophie du haut du corps et l'endurance musculaire selon le rythme et le volume choisis.", "Pushups are mainly used to develop relative strength, upper-body hypertrophy and muscular endurance depending on tempo and volume.", "Las flexiones sirven sobre todo para desarrollar fuerza relativa, hipertrofia del tren superior y resistencia muscular según el ritmo y el volumen elegidos."),
      typeSpeech: tr(lang, "Les pompes sont un mouvement de poussée, au poids du corps, de catégorie renforcement, avec une mécanique polyarticulaire.", "Pushups are a pushing bodyweight movement in the strength category with a compound mechanic.", "Las flexiones son un movimiento de empuje con peso corporal, de categoría fuerza y con mecánica compuesta."),
      goalParagraphs: [
        tr(lang, "Travaille la poussée horizontale et renforce la capacité à déplacer ton propre poids avec contrôle.", "It trains horizontal pressing and your capacity to move your own bodyweight with control.", "Trabaja el empuje horizontal y tu capacidad de mover tu propio peso con control."),
        tr(lang, "Selon le nombre de répétitions, le tempo et les variantes, il peut servir autant pour la force, l'hypertrophie que l'endurance musculaire.", "Depending on reps, tempo and variations, it can be used for strength, hypertrophy or muscular endurance.", "Según las repeticiones, el tempo y las variantes, puede servir para fuerza, hipertrofia o resistencia muscular."),
        tr(lang, "C'est aussi un excellent exercice de base pour apprendre le gainage dynamique du haut du corps.", "It is also an excellent foundational exercise to learn dynamic upper-body bracing.", "También es un excelente ejercicio base para aprender el bloqueo dinámico del tren superior."),
      ],
      goalTags: [tr(lang, "Force", "Strength", "Fuerza"), tr(lang, "Hypertrophie", "Hypertrophy", "Hipertrofia"), tr(lang, "Endurance", "Endurance", "Resistencia")],
      typeCards: [
        { label: tr(lang, "Mouvement", "Movement", "Movimiento"), value: tr(lang, "Poussée", "Push", "Empuje") },
        { label: tr(lang, "Matériel", "Equipment", "Material"), value: tr(lang, "Poids du corps", "Bodyweight", "Peso corporal") },
        { label: tr(lang, "Catégorie", "Category", "Categoría"), value: tr(lang, "Renforcement", "Strength", "Fuerza") },
        { label: tr(lang, "Mécanique", "Mechanic", "Mecánica"), value: tr(lang, "Polyarticulaire", "Compound", "Compuesto") },
      ],
    };
  }

  const instructions = (exercise.instructions || []).slice(0, 4);
  const fallbackSteps: GuideStep[] = instructions.map((item, index) => ({
    title: tr(lang, `Étape ${index + 1}`, `Step ${index + 1}`, `Paso ${index + 1}`),
    body: localizeInstructionText(item, lang),
    image: freeExerciseImageUrl(exercise, Math.min(index, Math.max(0, (exercise.imagePaths?.length || 1) - 1))),
  }));
  const goalTags = inferGoalTags(exercise);
  return {
    summary: tr(lang, `Mouvement ${inferMovementPattern(exercise).toLowerCase()} pour ${FIT_MUSCLE_LABELS[exercise.muscle][lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "fr"]} avec ${translateEquipment(exercise.equipment, lang).toLowerCase()}.`, `A ${inferMovementPattern(exercise).toLowerCase()} movement for ${FIT_MUSCLE_LABELS[exercise.muscle].en} using ${translateEquipment(exercise.equipment, lang).toLowerCase()}.`, `Un movimiento de ${inferMovementPattern(exercise).toLowerCase()} para ${FIT_MUSCLE_LABELS[exercise.muscle].es} con ${translateEquipment(exercise.equipment, lang).toLowerCase()}.`),
    steps: fallbackSteps,
    placement: (exercise.tips?.slice(0, 3) || []).map((item) => localizeInstructionText(item, lang)),
    breathing: [],
    intensityMap: { [exercise.muscle]: 3, ...Object.fromEntries((exercise.secondary || []).slice(0, 4).map((item) => [item, 1])) } as Partial<Record<FitMuscle, 0 | 1 | 2 | 3>>,
    zoneSpeech: tr(lang, `La zone principale travaillée est ${FIT_MUSCLE_LABELS[exercise.muscle][lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "fr"]}.`, `The primary area worked is ${FIT_MUSCLE_LABELS[exercise.muscle].en}.`, `La zona principal trabajada es ${FIT_MUSCLE_LABELS[exercise.muscle].es}.`),
    detailSpeech: instructions.map((item) => localizeInstructionText(item, lang)).join(" ") || tr(lang, "Awena détaillera bientôt ce mouvement.", "Awena will detail this movement soon.", "Awena detallará pronto este movimiento."),
    goalSpeech: goalTags.join(", "),
    typeSpeech: `${translateMovement(inferMovementPattern(exercise), lang)}. ${translateEquipment(exercise.equipment, lang)}.`,
    goalParagraphs: goalTags.length ? goalTags.map((item) => tr(lang, `Objectif possible : ${item}.`, `Possible goal: ${item}.`, `Objetivo posible: ${item}.`)) : [tr(lang, "Objectif détaillé à venir.", "Detailed goal coming soon.", "Objetivo detallado próximamente.")],
    goalTags: goalTags.length ? goalTags : [tr(lang, "Travail libre", "Open work", "Trabajo libre")],
    typeCards: [
      { label: tr(lang, "Mouvement", "Movement", "Movimiento"), value: translateMovement(inferMovementPattern(exercise), lang) },
      { label: tr(lang, "Matériel", "Equipment", "Material"), value: translateEquipment(exercise.equipment, lang) },
      { label: tr(lang, "Catégorie", "Category", "Categoría"), value: translateCategory((exercise as any).category || "strength", lang) },
      { label: tr(lang, "Mécanique", "Mechanic", "Mecánica"), value: translateMechanic((exercise as any).mechanic || "compound", lang) },
    ],
  };
}

function FilterGlyphRow({ exercise, lang, accent }: { exercise: FitExercise; lang: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, color: accent }}>
      <div title={FIT_MUSCLE_LABELS[exercise.muscle][lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "fr"]} style={{ display: "grid", placeItems: "center", color: exercise.accent || accent }}><FitIcon name="muscles" size={20} /></div>
      <div title={levelText(exercise.level, lang)} style={{ display: "inline-flex", alignItems: "center", gap: 2, color: "#ffd869" }}>
        {Array.from({ length: 3 }, (_, index) => <span key={index} style={{ color: index < (normalizeLevel(exercise.level) === "Débutant" ? 1 : normalizeLevel(exercise.level) === "Intermédiaire" ? 2 : 3) ? "#ffd869" : "rgba(255,255,255,.18)", fontSize: 17, lineHeight: 1 }}>★</span>)}
      </div>
      <div title={translateEquipment(exercise.equipment, lang)} style={{ display: "grid", placeItems: "center", color: accent }}><FitIcon name={equipmentIconName(exercise.equipment)} size={20} /></div>
    </div>
  );
}

function AwenaVoiceButton({ accent, text, label }: { accent: string; text: string; label: string }) {
  const [speaking, setSpeaking] = React.useState(false);

  React.useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const handleClick = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = label.includes("ES") ? "es-ES" : label.includes("EN") ? "en-US" : "fr-FR";
    utterance.rate = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }, [speaking, text, label]);

  return (
    <button type="button" onClick={handleClick} title={label} aria-label={label} style={{ width: 46, height: 46, borderRadius: 999, border: `1px solid ${accent}56`, background: `radial-gradient(circle at 35% 30%,rgba(255,255,255,.18),${accent}10 55%,rgba(255,255,255,.02))`, color: accent, boxShadow: `0 0 18px ${accent}16, inset 0 0 0 1px rgba(255,255,255,.03)`, cursor: "pointer", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
      <img src="/awena/awena-avatar.webp" alt="" aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", opacity: speaking ? 1 : .96 }} />
      <span style={{ position: "absolute", right: 8, bottom: 8, color: accent, display: "grid", placeItems: "center", opacity: .92 }}><FitIcon name="volume" size={12} /></span>
    </button>
  );
}

function ActionCircle({ accent, onClick, children, active = false, passiveGray = false }: { accent: string; onClick?: () => void; children: React.ReactNode; active?: boolean; passiveGray?: boolean }) {
  const color = passiveGray && !active ? "rgba(255,255,255,.72)" : accent;
  return (
    <button type="button" onClick={onClick} style={{ width: 48, height: 48, borderRadius: 16, border: `1px solid ${active ? accent + "82" : color + "3c"}`, background: active ? `linear-gradient(180deg,${accent}18,rgba(255,255,255,.05))` : `linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.02))`, color, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: active ? `0 0 20px ${accent}18, inset 0 0 0 1px ${accent}10` : `0 0 16px ${color}08`, backdropFilter: "blur(8px)" }}>{children}</button>
  );
}

export default function FitExerciseDetailDialog({ exercise, onClose, go, isFavorite, onToggleFavorite, detailRecord }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const accent = theme?.primary || exercise.accent || "#5ce9ff";
  const accentSoft = theme?.accent1 || accent;
  const textSoft = "rgba(255,255,255,.68)";
  const langKey = lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "fr";
  const guide = React.useMemo(() => buildGuide(exercise, lang), [exercise, lang]);
  const [tab, setTab] = React.useState<DetailTab>("zone");
  const [viewerImage, setViewerImage] = React.useState<string | null>(null);
  const photos = React.useMemo(() => collectExercisePhotos(exercise), [exercise]);
  const totalSessions = detailRecord ? 1 : 0;

  const tabItems = [
    { id: "zone" as const, label: tr(lang, "ZONE", "ZONE", "ZONA"), icon: "muscles" as const },
    { id: "details" as const, label: tr(lang, "DÉTAILS", "DETAILS", "DETALLES"), icon: "guide" as const },
    { id: "goal" as const, label: tr(lang, "OBJECTIF", "GOAL", "OBJETIVO"), icon: "goals" as const },
    { id: "type" as const, label: tr(lang, "TYPE", "TYPE", "TIPO"), icon: "workout" as const },
    { id: "records" as const, label: tr(lang, "RECORDS", "RECORDS", "RÉCORDS"), icon: "records" as const },
  ];

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(2,4,8,.82)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div onClick={(event) => event.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 760, maxHeight: "94vh", overflowY: "auto", borderRadius: 30, padding: 14, background: `linear-gradient(180deg, rgba(7,10,17,.985), rgba(8,11,18,.995))`, border: `1px solid ${accent}40`, boxShadow: `0 30px 90px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.04), 0 0 30px ${accent}10` }}>
        <img src={LOGO} alt="" aria-hidden="true" style={{ position: "absolute", right: -150, bottom: -130, width: 470, opacity: .095, pointerEvents: "none", filter: "grayscale(1)", transform: "rotate(-18deg)" }} />
        <img src={LOGO} alt="" aria-hidden="true" style={{ position: "absolute", right: -180, top: 18, width: 410, opacity: .07, pointerEvents: "none", filter: "grayscale(1)", transform: "rotate(14deg)" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 26, lineHeight: 1.03, fontWeight: 1000, letterSpacing: -.7 }}>{exercise.name}</div>
            <div style={{ marginTop: 10 }}><FilterGlyphRow exercise={exercise} lang={lang} accent={accent} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ActionCircle accent="#ffd869" onClick={onToggleFavorite} active={isFavorite} passiveGray>
              {isFavorite ? <span style={{ fontSize: 22, lineHeight: 1, color: "#ffd869" }}>★</span> : <FitIcon name="favorite" size={22} />}
            </ActionCircle>
            <ActionCircle accent={accent} onClick={() => go("games", { fitTemplateId: "free", fitExerciseId: exercise.id })}><FitIcon name="plus" size={22} /></ActionCircle>
            <ActionCircle accent={accent} onClick={onClose}><FitIcon name="close" size={22} /></ActionCircle>
          </div>
        </div>

        <div style={{ marginTop: 12, borderRadius: 26, overflow: "hidden", border: `1px solid ${accent}35`, background: `radial-gradient(circle at 50% 24%,${accent}10,rgba(3,6,11,.96) 72%)`, boxShadow: `inset 0 0 24px ${accent}08` }}>
          <FitExerciseMotion exercise={exercise} accent={accent} />
        </div>

        <div style={{ marginTop: 10 }}>
          <FitIconTabs items={tabItems} value={tab} onChange={setTab} accent={accent} />
        </div>

        {photos.length ? (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "thin", marginBottom: 8 }}>
            {photos.map((url, index) => (
              <button key={`${url}-${index}`} type="button" onClick={() => setViewerImage(url)} style={{ padding: 0, border: `1px solid ${index === 0 ? accent + "55" : "rgba(255,255,255,.07)"}`, background: "rgba(255,255,255,.02)", borderRadius: 16, overflow: "hidden", minWidth: 118, width: 118, height: 88, flex: "0 0 118px", cursor: "pointer", boxShadow: index === 0 ? `0 0 18px ${accent}14` : "none" }}>
                <img src={url} alt={`${exercise.name} ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        ) : null}

        {tab === "zone" ? (
          <FitGlassCard accent={accent} style={{ position: "relative", padding: 16, borderRadius: 24, overflow: "hidden", background: `linear-gradient(180deg, ${accent}08, rgba(255,255,255,.015))` }}>
            <div style={{ position: "relative", minHeight: 46, marginBottom: 12 }}>
              <div style={{ color: accent, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", paddingRight: 62 }}>{tr(lang, "Zones travaillées", "Worked areas", "Zonas trabajadas")}</div>
              <div style={{ position: "absolute", right: 0, top: 0 }}><AwenaVoiceButton accent={accent} text={guide.zoneSpeech} label={tr(lang, "FR", "EN", "ES")} /></div>
            </div>
            <FitBodyMap lang={lang} intensityMap={guide.intensityMap} interactive={false} />
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, color: textSoft, fontSize: 8.5 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: 999, background: "#f2d36b" }} />{tr(lang, "Jaune : légèrement travaillé", "Yellow: lightly worked", "Amarillo: trabajo ligero")}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: 999, background: "#ff9a38" }} />{tr(lang, "Orange : modérément travaillé", "Orange: moderately worked", "Naranja: trabajo moderado")}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: 999, background: "#ff5d73" }} />{tr(lang, "Rouge : fortement travaillé", "Red: strongly worked", "Rojo: trabajo intenso")}</span>
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 7, fontSize: 8.8, color: "rgba(255,255,255,.82)" }}>
              <div><span style={{ color: FIT_MUSCLE_COLORS[exercise.muscle], fontWeight: 1000 }}>{tr(lang, "Zone principale", "Primary zone", "Zona principal")}</span> — {FIT_MUSCLE_LABELS[exercise.muscle][langKey]}</div>
              {exercise.secondary?.length ? <div><span style={{ color: accent, fontWeight: 1000 }}>{tr(lang, "Zones d'assistance", "Assist zones", "Zonas de asistencia")}</span> — {exercise.secondary.map((item) => FIT_MUSCLE_LABELS[item][langKey]).join(", ")}</div> : null}
            </div>
          </FitGlassCard>
        ) : null}

        {tab === "details" ? (
          <FitGlassCard accent={accent} style={{ position: "relative", padding: 16, borderRadius: 24, overflow: "hidden", background: `linear-gradient(180deg, ${accent}08, rgba(255,255,255,.015))` }}>
            <div style={{ position: "relative", minHeight: 46, marginBottom: 12 }}>
              <div style={{ color: accent, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", paddingRight: 62 }}>{tr(lang, "Détails de l'exercice", "Exercise details", "Detalles del ejercicio")}</div>
              <div style={{ position: "absolute", right: 0, top: 0 }}><AwenaVoiceButton accent={accent} text={guide.detailSpeech} label={tr(lang, "FR", "EN", "ES")} /></div>
            </div>
            <FitGlassCard accent={accent} style={{ padding: 14, borderRadius: 20, background: "rgba(255,255,255,.02)" }}>
              <div style={{ color: accent, fontSize: 8.8, fontWeight: 1000, letterSpacing: .7 }}>{tr(lang, "Résumé du mouvement", "Movement summary", "Resumen del movimiento")}</div>
              <div style={{ marginTop: 8, color: "rgba(255,255,255,.86)", fontSize: 9.7, lineHeight: 1.45 }}>{guide.summary}</div>
            </FitGlassCard>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 12 }}>
              {guide.steps.map((step, index) => (
                <FitGlassCard key={index} accent={accent} style={{ overflow: "hidden", borderRadius: 22, background: "rgba(255,255,255,.018)" }}>
                  {step.image ? <img src={step.image} alt={step.title} onClick={() => setViewerImage(step.image)} style={{ width: "100%", height: 150, objectFit: "cover", display: "block", cursor: "pointer" }} /> : null}
                  <div style={{ padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 999, border: `1px solid ${accent}55`, background: `${accent}12`, color: accent, display: "grid", placeItems: "center", fontWeight: 1000, flex: "0 0 28px" }}>{index + 1}</div>
                      <div style={{ fontSize: 10, lineHeight: 1.15, fontWeight: 1000 }}>{step.title}</div>
                    </div>
                    <div style={{ marginTop: 10, color: "rgba(255,255,255,.82)", fontSize: 9, lineHeight: 1.5 }}>{step.body}</div>
                  </div>
                </FitGlassCard>
              ))}
            </div>
            {guide.placement.length ? (
              <FitGlassCard accent={accent} style={{ marginTop: 12, padding: 14, borderRadius: 20, background: "rgba(255,255,255,.02)" }}>
                <div style={{ color: accent, fontSize: 9.2, fontWeight: 1000, letterSpacing: .7 }}>{tr(lang, "Placement", "Setup", "Colocación")}</div>
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 8, color: "rgba(255,255,255,.84)", fontSize: 8.9, lineHeight: 1.45 }}>
                  {guide.placement.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </FitGlassCard>
            ) : null}
            {guide.breathing.length ? (
              <FitGlassCard accent={accent} style={{ marginTop: 12, padding: 14, borderRadius: 20, background: "rgba(255,255,255,.02)" }}>
                <div style={{ color: accent, fontSize: 9.2, fontWeight: 1000, letterSpacing: .7 }}>{tr(lang, "Respiration", "Breathing", "Respiración")}</div>
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 8, color: "rgba(255,255,255,.84)", fontSize: 8.9, lineHeight: 1.45 }}>
                  {guide.breathing.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </FitGlassCard>
            ) : null}
          </FitGlassCard>
        ) : null}

        {tab === "goal" ? (
          <FitGlassCard accent={accent} style={{ padding: 16, borderRadius: 24, background: `linear-gradient(180deg, ${accent}08, rgba(255,255,255,.015))` }}>
            <div style={{ position: "relative", minHeight: 46, marginBottom: 12 }}>
              <div style={{ color: accent, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", paddingRight: 62 }}>{tr(lang, "Objectif", "Goal", "Objetivo")}</div>
              <div style={{ position: "absolute", right: 0, top: 0 }}><AwenaVoiceButton accent={accent} text={guide.goalSpeech} label={tr(lang, "FR", "EN", "ES")} /></div>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>{guide.goalTags.map((item) => <FitPill key={item} accent={accent}>{item}</FitPill>)}</div>
            <div style={{ display: "grid", gap: 10 }}>
              {guide.goalParagraphs.map((paragraph, index) => (
                <FitGlassCard key={index} accent={accent} style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,.018)", color: "rgba(255,255,255,.86)", fontSize: 9.2, lineHeight: 1.5 }}>{paragraph}</FitGlassCard>
              ))}
            </div>
          </FitGlassCard>
        ) : null}

        {tab === "type" ? (
          <FitGlassCard accent={accent} style={{ padding: 16, borderRadius: 24, background: `linear-gradient(180deg, ${accent}08, rgba(255,255,255,.015))` }}>
            <div style={{ position: "relative", minHeight: 46, marginBottom: 12 }}>
              <div style={{ color: accent, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", paddingRight: 62 }}>{tr(lang, "Type de mouvement", "Movement type", "Tipo de movimiento")}</div>
              <div style={{ position: "absolute", right: 0, top: 0 }}><AwenaVoiceButton accent={accent} text={guide.typeSpeech} label={tr(lang, "FR", "EN", "ES")} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
              {guide.typeCards.map((item) => (
                <FitGlassCard key={item.label} accent={accent} style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,.02)" }}>
                  <div style={{ fontSize: 8.5, fontWeight: 1000, letterSpacing: .8, opacity: .5, textTransform: "uppercase" }}>{item.label}</div>
                  <div style={{ marginTop: 6, color: accent, fontSize: 10.8, lineHeight: 1.12, fontWeight: 1000 }}>{item.value}</div>
                </FitGlassCard>
              ))}
            </div>
          </FitGlassCard>
        ) : null}

        {tab === "records" ? (
          <FitGlassCard accent={accent} style={{ padding: 16, borderRadius: 24, background: `linear-gradient(180deg, ${accent}08, rgba(255,255,255,.015))` }}>
            <div style={{ position: "relative", minHeight: 46, marginBottom: 12 }}>
              <div style={{ color: accent, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", paddingRight: 62 }}>{tr(lang, "Records", "Records", "Récords")}</div>
              <div style={{ position: "absolute", right: 0, top: 0 }}><AwenaVoiceButton accent={accent} text={detailRecord ? `${formatKg(detailRecord.weightKg)} ${tr(lang, "pour", "for", "para")} ${detailRecord.reps} ${tr(lang, "répétitions", "repetitions", "repeticiones")}.` : tr(lang, "Aucun record enregistré pour le moment.", "No record logged yet.", "Todavía no hay récord registrado.")} label={tr(lang, "FR", "EN", "ES")} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
              <FitGlassCard accent="#7df29a" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: 8.5, fontWeight: 1000, letterSpacing: .8, opacity: .5, textTransform: "uppercase" }}>{tr(lang, "Record personnel", "Personal record", "Récord personal")}</div>
                <div style={{ marginTop: 7, color: "#7df29a", fontSize: 14, fontWeight: 1000 }}>{detailRecord ? `${formatKg(detailRecord.weightKg)} × ${detailRecord.reps}` : "—"}</div>
                <div style={{ marginTop: 5, color: textSoft, fontSize: 8.6 }}>{detailRecord ? `1RM ${formatKg(detailRecord.oneRm)}` : tr(lang, "Aucun record enregistré", "No record logged", "Sin récord registrado")}</div>
              </FitGlassCard>
              <FitGlassCard accent="#ffd869" style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: 8.5, fontWeight: 1000, letterSpacing: .8, opacity: .5, textTransform: "uppercase" }}>{tr(lang, "Historique", "History", "Historial")}</div>
                <div style={{ marginTop: 7, color: "#ffd869", fontSize: 14, fontWeight: 1000 }}>{totalSessions}</div>
                <div style={{ marginTop: 5, color: textSoft, fontSize: 8.6 }}>{tr(lang, "séance enregistrée sur cet exercice", "logged workout on this exercise", "sesión registrada en este ejercicio")}</div>
              </FitGlassCard>
              <FitGlassCard accent={accent} style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: 8.5, fontWeight: 1000, letterSpacing: .8, opacity: .5, textTransform: "uppercase" }}>{tr(lang, "Type", "Type", "Tipo")}</div>
                <div style={{ marginTop: 7, color: accent, fontSize: 11.8, fontWeight: 1000 }}>{translateMovement(inferMovementPattern(exercise), lang)}</div>
                <div style={{ marginTop: 5, color: textSoft, fontSize: 8.6 }}>{translateEquipment(exercise.equipment, lang)}</div>
              </FitGlassCard>
              <FitGlassCard accent={accentSoft} style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: 8.5, fontWeight: 1000, letterSpacing: .8, opacity: .5, textTransform: "uppercase" }}>{tr(lang, "Global FIT PERF", "FIT PERF global", "FIT PERF global")}</div>
                <div style={{ marginTop: 7, color: accentSoft, fontSize: 11.8, fontWeight: 1000 }}>{tr(lang, "Bientôt disponible", "Coming soon", "Próximamente")}</div>
                <div style={{ marginTop: 5, color: textSoft, fontSize: 8.6 }}>{tr(lang, "Classements globaux de l'exercice à venir.", "Global exercise leaderboards will arrive soon.", "Los rankings globales del ejercicio llegarán pronto.")}</div>
              </FitGlassCard>
            </div>
          </FitGlassCard>
        ) : null}

        {exercise.source === "free-exercise-db" || exercise.source === "wger" ? (
          <div style={{ marginTop: 14, padding: "9px 11px", borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(5,8,13,.72)", color: textSoft, fontSize: 7.4, lineHeight: 1.45 }}>
            <b style={{ color: "rgba(255,255,255,.72)" }}>{tr(lang, "Source", "Source", "Fuente")} :</b>{" "}
            {exercise.sourceUrl ? <a href={exercise.sourceUrl} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: "none" }}>{exercise.source === "wger" ? "wger" : "Free Exercise DB"}</a> : (exercise.source === "wger" ? "wger" : "Free Exercise DB")}
            {exercise.sourceLicense ? ` · ${exercise.sourceLicense}` : ""}
            {exercise.sourceAuthor ? ` · ${exercise.sourceAuthor}` : ""}
            {exercise.mediaLicense && exercise.mediaLicense !== exercise.sourceLicense ? ` · Média: ${exercise.mediaLicense}${exercise.mediaAuthor ? ` (${exercise.mediaAuthor})` : ""}` : ""}
          </div>
        ) : null}

        {viewerImage ? (
          <div onClick={() => setViewerImage(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.84)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <img src={viewerImage} alt="Aperçu" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 20, border: `1px solid ${accent}55` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
