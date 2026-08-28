import React from "react";
import multisportsLogo from "../../assets/LOGO.png";
import type { FitExercise, FitMuscle, FitRecord } from "../../fit/fitStore";
import { formatKg, loadFitSessions } from "../../fit/fitStore";
import { FIT_MUSCLE_COLORS, FIT_MUSCLE_LABELS, inferGoalTags, inferMovementPattern, normalizeLevel } from "../../fit/fitExerciseTaxonomy";
import { freeExerciseImageUrl } from "../../fit/freeExerciseCatalog";
import { getAwenaPremiumMotion } from "../../fit/awenaPremiumMotions";
import FitExerciseMotion from "./FitExerciseMotion";
import { FitIcon, FitPill, type FitIconName } from "./FitPerfUi";

type DetailTab = "muscles" | "details" | "objective" | "type" | "records";
type LangKey = "fr" | "en" | "es";

type Props = {
  exercise: FitExercise;
  themeAccent: string;
  favorite: boolean;
  record?: FitRecord | null;
  langKey: LangKey;
  onClose: () => void;
  onToggleFavorite: () => void;
  onAddToWorkout: () => void;
};

const PUSHUP_HIGH = "/fit/exercise-media/pushup/awena-high.webp";
const PUSHUP_LOW = "/fit/exercise-media/pushup/awena-low.webp";

function text(lang: LangKey, fr: string, en: string, es: string) {
  return lang === "en" ? en : lang === "es" ? es : fr;
}

function difficultyValue(level?: string) {
  const normalized = normalizeLevel(level);
  return normalized === "Avancé" ? 3 : normalized === "Intermédiaire" ? 2 : 1;
}

function HeaderMuscleIcon({ muscle, color, size = 30 }: { muscle: FitMuscle; color: string; size?: number }) {
  const common = { fill: `${color}22`, stroke: color, strokeWidth: 1.7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const shape = (() => {
    switch (muscle) {
      case "Pectoraux": return <><path {...common} d="M8 15c4-5 10-6 16-2v13c-6 3-12 1-16-3Z"/><path {...common} d="M40 15c-4-5-10-6-16-2v13c6 3 12 1 16-3Z"/></>;
      case "Dos": return <path {...common} d="M13 10 24 6l11 4 5 8-7 18-9 6-9-6-7-18Z"/>;
      case "Épaules": return <><path {...common} d="M5 23c0-8 5-14 13-14l3 8-7 10Z"/><path {...common} d="M43 23c0-8-5-14-13-14l-3 8 7 10Z"/></>;
      case "Biceps": return <><path {...common} d="M10 8c7 2 9 10 7 18l-5 14-6-4 2-14Z"/><path {...common} d="M38 8c-7 2-9 10-7 18l5 14 6-4-2-14Z"/></>;
      case "Triceps": return <><path {...common} d="M9 9c7 1 10 8 9 17l-5 15-7-5 3-14Z"/><path {...common} d="M39 9c-7 1-10 8-9 17l5 15 7-5-3-14Z"/></>;
      case "Abdos": return <><rect {...common} x="14" y="7" width="8" height="9" rx="3"/><rect {...common} x="26" y="7" width="8" height="9" rx="3"/><rect {...common} x="14" y="19" width="8" height="9" rx="3"/><rect {...common} x="26" y="19" width="8" height="9" rx="3"/><rect {...common} x="14" y="31" width="8" height="9" rx="3"/><rect {...common} x="26" y="31" width="8" height="9" rx="3"/></>;
      case "Fessiers": return <><path {...common} d="M8 12c9-7 16 0 16 10v13c-7 7-17 6-20-3Z"/><path {...common} d="M40 12c-9-7-16 0-16 10v13c7 7 17 6 20-3Z"/></>;
      case "Quadriceps": return <><path {...common} d="M10 5c9 3 11 12 9 23-2 9-5 14-9 15-5-6-6-16-5-25Z"/><path {...common} d="M38 5c-9 3-11 12-9 23 2 9 5 14 9 15 5-6 6-16 5-25Z"/></>;
      case "Ischios": return <><path {...common} d="M12 5c8 5 9 13 7 23-1 8-4 13-8 15-6-8-6-18-4-28Z"/><path {...common} d="M36 5c-8 5-9 13-7 23 1 8 4 13 8 15 6-8 6-18 4-28Z"/></>;
      case "Mollets": return <><path {...common} d="M12 5c7 5 8 15 4 26l-5 12-6-8 2-20Z"/><path {...common} d="M36 5c-7 5-8 15-4 26l5 12 6-8-2-20Z"/></>;
      case "Full body": return <><circle {...common} cx="24" cy="8" r="4"/><path {...common} d="M17 13h14l5 12-5 3-2-8-2 22h-6l-2-22-2 8-5-3Z"/></>;
      default: return <><circle {...common} cx="24" cy="9" r="4"/><path {...common} d="M16 14h16l4 10-6 3-2 15h-8l-2-15-6-3Z"/></>;
    }
  })();
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ filter: `drop-shadow(0 0 7px ${color}55)` }}>{shape}</svg>;
}

function HeaderEquipmentIcon({ equipment, size = 27 }: { equipment: string; size?: number }) {
  const map: Record<string, FitIconName> = {
    "Poids du corps": "body", "Haltères": "dumbbell", Barre: "barbell", Poulie: "cable", Machine: "machine",
    Kettlebell: "kettlebell", "Élastique": "band", TRX: "band", Banc: "workout", "Médecine ball": "medicine", Autre: "settings",
  };
  return <FitIcon name={map[equipment] || "strength"} size={size}/>;
}

function GoldBrand() {
  return <div className="fit-detail-gold-brand" aria-label="MULTISPORTS SCORING">
    <img src={multisportsLogo} alt="" />
    <span>MULTISPORTS<br/>SCORING</span>
  </div>;
}

function TabButton({ active, label, icon, color, onClick }: { active: boolean; label: string; icon: FitIconName; color: string; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={active} onClick={onClick} className={`fit-detail-tab${active ? " is-active" : ""}`} style={{ color: active ? color : "rgba(255,255,255,.48)", borderColor: active ? `${color}55` : "transparent", background: active ? `${color}10` : "transparent" }}>
    <FitIcon name={icon} size={21}/>
    {active ? <span>{label}</span> : null}
  </button>;
}

function StatBox({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: string; color: string }) {
  return <div className="fit-detail-stat" style={{ borderColor: `${color}28`, background: `linear-gradient(145deg,${color}0d,rgba(255,255,255,.025))` }}>
    <div className="fit-detail-stat-label">{label}</div>
    <div className="fit-detail-stat-value" style={{ color }}>{value}</div>
    {sub ? <div className="fit-detail-stat-sub">{sub}</div> : null}
  </div>;
}

function PushupSummary({ accent }: { accent: string }) {
  const steps = [
    { n: 1, label: "POSITION HAUTE", src: PUSHUP_HIGH },
    { n: 2, label: "DESCENTE", src: PUSHUP_HIGH },
    { n: 3, label: "POSITION BASSE", src: PUSHUP_LOW },
    { n: 4, label: "POUSSÉE / RETOUR", src: PUSHUP_HIGH },
  ];
  return <div className="fit-pushup-summary">
    <div className="fit-pushup-summary-title" style={{ color: accent }}>PUSHUPS</div>
    <div className="fit-pushup-summary-steps">
      {steps.map((step, index) => <React.Fragment key={step.n}>
        <div className="fit-pushup-step">
          <div className="fit-pushup-step-head"><span style={{ borderColor: accent, color: accent }}>{step.n}</span><b>{step.label}</b></div>
          <img src={step.src} alt="" draggable={false}/>
        </div>
        {index < steps.length - 1 ? <div className="fit-pushup-arrow">›</div> : null}
      </React.Fragment>)}
    </div>
  </div>;
}

export default function FitExerciseDetailDialog({ exercise, themeAccent, favorite, record, langKey, onClose, onToggleFavorite, onAddToWorkout }: Props) {
  const [tab, setTab] = React.useState<DetailTab>("details");
  const [lightbox, setLightbox] = React.useState<string | null>(null);
  const motionId = exercise.motionKey || exercise.id;
  const isPushup = motionId === "pushup" || /push\s*up|pompe/i.test(exercise.name);
  const accent = themeAccent || exercise.accent || "#f6c256";
  const muscleColor = FIT_MUSCLE_COLORS[exercise.muscle] || exercise.accent || accent;
  const premium = getAwenaPremiumMotion(motionId);

  React.useEffect(() => { setTab("details"); setLightbox(null); }, [exercise.id]);
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") lightbox ? setLightbox(null) : onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, onClose]);

  const referenceImages = React.useMemo(() => {
    const urls: string[] = [];
    if (isPushup) urls.push(PUSHUP_HIGH, PUSHUP_LOW);
    const premiumPoster = premium?.video?.poster || premium?.frameSequence?.poster;
    if (premiumPoster) urls.push(premiumPoster);
    for (let index = 0; index < Math.min(4, exercise.imagePaths?.length || 0); index += 1) {
      const url = freeExerciseImageUrl(exercise, index);
      if (url) urls.push(url);
    }
    return [...new Set(urls)].slice(0, 6);
  }, [exercise, isPushup, premium]);

  const history = React.useMemo(() => {
    const sessions = loadFitSessions();
    const completed = sessions.flatMap((session) => session.exercises
      .filter((row) => row.exerciseId === exercise.id)
      .flatMap((row) => row.sets.filter((set) => set.completed).map((set) => ({ set, session }))));
    const reps = completed.reduce((sum, row) => sum + Math.max(0, Number(row.set.reps) || 0), 0);
    const volume = completed.reduce((sum, row) => sum + Math.max(0, Number(row.set.weightKg) || 0) * Math.max(0, Number(row.set.reps) || 0), 0);
    const bestReps = completed.reduce((best, row) => Math.max(best, Number(row.set.reps) || 0), 0);
    const sessionIds = new Set(completed.map((row) => row.session.id));
    return { sets: completed.length, reps, volume, bestReps, sessions: sessionIds.size };
  }, [exercise.id]);

  const instructions = exercise.instructions || [];
  const tips = exercise.tips || [];
  const mistakes = exercise.commonMistakes || [];
  const goals = inferGoalTags(exercise);
  const movement = inferMovementPattern(exercise);

  const detailCopy = isPushup ? {
    placement: text(langKey, "Mains légèrement plus larges que les épaules, corps gainé des épaules aux talons.", "Hands slightly wider than shoulders, body braced from shoulders to heels.", "Manos algo más abiertas que los hombros, cuerpo firme de hombros a talones."),
    execution: text(langKey, "Descends la poitrine vers le sol en contrôlant, puis pousse sans casser l’alignement.", "Lower the chest under control, then push without losing alignment.", "Baja el pecho con control y empuja sin perder la alineación."),
    breathing: text(langKey, "Inspire à la descente, expire pendant la poussée.", "Inhale on the way down, exhale while pushing.", "Inspira al bajar y espira al empujar."),
    mistakes: text(langKey, "Hanches qui s’affaissent, coudes trop ouverts, nuque projetée en avant.", "Sagging hips, elbows flared too wide, head pushed forward.", "Caderas caídas, codos demasiado abiertos y cuello adelantado."),
  } : null;

  const panel = (() => {
    if (tab === "muscles") return <div className="fit-detail-panel-content">
      <div className="fit-detail-panel-title" style={{ color: accent }}>{text(langKey, "ZONES SOLLICITÉES", "MUSCLES INVOLVED", "ZONAS IMPLICADAS")}</div>
      <div className="fit-detail-chip-row"><FitPill accent={muscleColor}>{text(langKey, "PRINCIPAL", "PRIMARY", "PRINCIPAL")} · {FIT_MUSCLE_LABELS[exercise.muscle][langKey]}</FitPill>{(exercise.secondary || []).map((item) => <FitPill key={item} accent={FIT_MUSCLE_COLORS[item]}>{FIT_MUSCLE_LABELS[item][langKey]}</FitPill>)}</div>
      <div className="fit-detail-copy">{text(langKey, "La zone principale produit l’effort. Les zones secondaires stabilisent le mouvement et assistent la poussée ou le tirage.", "The primary area produces the effort. Secondary areas stabilize the movement and assist the push or pull.", "La zona principal produce el esfuerzo. Las zonas secundarias estabilizan y ayudan el movimiento.")}</div>
    </div>;

    if (tab === "objective") return <div className="fit-detail-panel-content">
      <div className="fit-detail-panel-title" style={{ color: accent }}>{text(langKey, "OBJECTIF / TYPE DE TRAVAIL", "GOAL / TRAINING FOCUS", "OBJETIVO / TIPO DE TRABAJO")}</div>
      <div className="fit-detail-chip-row">{goals.length ? goals.map((goal) => <FitPill key={goal} accent={accent}>{goal}</FitPill>) : <FitPill accent={accent}>{text(langKey, "Travail général", "General training", "Trabajo general")}</FitPill>}</div>
      <div className="fit-detail-copy">{text(langKey, "Adapte le tempo, la charge et le nombre de répétitions à ton objectif. Contrôle la phase négative et conserve une technique identique d’une répétition à l’autre.", "Match tempo, load and repetitions to your goal. Control the negative phase and keep the same technique rep after rep.", "Adapta tempo, carga y repeticiones al objetivo. Controla la fase negativa y conserva la técnica.")}</div>
    </div>;

    if (tab === "type") return <div className="fit-detail-panel-content">
      <div className="fit-detail-panel-title" style={{ color: accent }}>{text(langKey, "TYPE DE MOUVEMENT", "MOVEMENT TYPE", "TIPO DE MOVIMIENTO")}</div>
      <div className="fit-detail-grid-2">
        <StatBox label={text(langKey, "MOUVEMENT", "MOVEMENT", "MOVIMIENTO")} value={movement} color={accent}/>
        <StatBox label={text(langKey, "MATÉRIEL", "EQUIPMENT", "MATERIAL")} value={exercise.equipment} color={accent}/>
        <StatBox label={text(langKey, "CATÉGORIE", "CATEGORY", "CATEGORÍA")} value={exercise.category || text(langKey, "Musculation", "Strength", "Musculación")} color={accent}/>
        <StatBox label={text(langKey, "MÉCANIQUE", "MECHANICS", "MECÁNICA")} value={exercise.mechanic || exercise.force || "—"} color={accent}/>
      </div>
    </div>;

    if (tab === "records") {
      const bodyWeightRecord = exercise.equipment === "Poids du corps" && history.bestReps > 0 ? `${history.bestReps} reps` : null;
      const personal = bodyWeightRecord || (record ? `${formatKg(record.weightKg)} × ${record.reps}` : "—");
      return <div className="fit-detail-panel-content">
        <div className="fit-detail-panel-title" style={{ color: accent }}>{text(langKey, "RECORDS", "RECORDS", "RÉCORDS")}</div>
        <div className="fit-detail-grid-2">
          <StatBox label={text(langKey, "RECORD PERSONNEL", "PERSONAL RECORD", "RÉCORD PERSONAL")} value={personal} sub={record?.oneRm ? `1RM ${formatKg(record.oneRm)}` : text(langKey, "Meilleure série enregistrée", "Best logged set", "Mejor serie registrada")} color="#7df29a"/>
          <StatBox label={text(langKey, "RECORD GLOBAL", "GLOBAL RECORD", "RÉCORD GLOBAL")} value="—" sub={text(langKey, "Classement cloud à connecter", "Cloud leaderboard to connect", "Clasificación cloud por conectar")} color="#72def4"/>
          <StatBox label={text(langKey, "TOTAL RÉPÉTITIONS", "TOTAL REPS", "REPETICIONES TOTALES")} value={history.reps} sub={`${history.sets} ${text(langKey, "séries", "sets", "series")}`} color={accent}/>
          <StatBox label={text(langKey, "SÉANCES", "WORKOUTS", "SESIONES")} value={history.sessions} sub={history.volume > 0 ? `${formatKg(history.volume)} volume` : undefined} color={accent}/>
        </div>
      </div>;
    }

    return <div className="fit-detail-panel-content fit-detail-panel-details">
      {isPushup ? <PushupSummary accent={accent}/> : <div className="fit-detail-generic-summary" style={{ borderColor: `${accent}2c` }}><span style={{ color: accent }}><FitIcon name="guide" size={22}/></span><b>{exercise.name}</b><span>{text(langKey, "Résumé technique", "Technique summary", "Resumen técnico")}</span></div>}
      <div className="fit-detail-instructions">
        <div><b style={{ color: accent }}>{text(langKey, "PLACEMENT", "SETUP", "COLOCACIÓN")}</b><span>{detailCopy?.placement || instructions[0] || text(langKey, "Position stable, corps gainé et articulations alignées.", "Stable position, braced body and aligned joints.", "Posición estable, cuerpo firme y articulaciones alineadas.")}</span></div>
        <div><b style={{ color: accent }}>{text(langKey, "EXÉCUTION", "EXECUTION", "EJECUCIÓN")}</b><span>{detailCopy?.execution || instructions[1] || instructions[0] || text(langKey, "Mouvement contrôlé sur toute l’amplitude utile.", "Control the movement through the useful range.", "Controla el movimiento en todo el recorrido útil.")}</span></div>
        <div><b style={{ color: "#72def4" }}>{text(langKey, "RESPIRATION", "BREATHING", "RESPIRACIÓN")}</b><span>{detailCopy?.breathing || tips[0] || text(langKey, "Inspire sur la phase de retour, expire pendant l’effort.", "Inhale on the return phase, exhale during effort.", "Inspira en el retorno y espira durante el esfuerzo.")}</span></div>
        <div><b style={{ color: "#ff7d91" }}>{text(langKey, "ERREURS À ÉVITER", "AVOID", "ERRORES A EVITAR")}</b><span>{detailCopy?.mistakes || mistakes[0] || text(langKey, "Évite les compensations et la perte d’alignement.", "Avoid compensation and loss of alignment.", "Evita compensaciones y pérdida de alineación.")}</span></div>
      </div>
    </div>;
  })();

  const level = difficultyValue(exercise.level);
  return <div className="fit-detail-overlay" role="dialog" aria-modal="true" onClick={onClose}>
    <div className="fit-detail-card" onClick={(event) => event.stopPropagation()} style={{ borderColor: `${accent}58`, boxShadow: `0 28px 85px rgba(0,0,0,.72), 0 0 34px ${accent}13, inset 0 1px 0 rgba(255,255,255,.05)` }}>
      <img className="fit-detail-page-watermark" src={multisportsLogo} alt="" aria-hidden="true"/>

      <div className="fit-detail-topline">
        <div className="fit-detail-meta-icons">
          <span title={FIT_MUSCLE_LABELS[exercise.muscle][langKey]} style={{ color: muscleColor }}><HeaderMuscleIcon muscle={exercise.muscle} color={muscleColor}/></span>
          <span title={normalizeLevel(exercise.level)} className="fit-detail-stars">{[0,1,2].map((i) => <span key={i} style={{ color: i < level ? "#ffd869" : "rgba(255,255,255,.18)" }}>★</span>)}</span>
          <span title={exercise.equipment} style={{ color: accent }}><HeaderEquipmentIcon equipment={exercise.equipment}/></span>
        </div>
        <button type="button" className="fit-detail-close" onClick={onClose} aria-label={text(langKey, "Fermer", "Close", "Cerrar")}>×</button>
      </div>

      <div className="fit-detail-title-row">
        <h2>{exercise.name}</h2>
        <div className="fit-detail-actions">
          <button type="button" aria-label={text(langKey, "Favori", "Favorite", "Favorito")} title={text(langKey, "Favori", "Favorite", "Favorito")} onClick={onToggleFavorite} style={{ color: favorite ? "#ffd869" : accent, borderColor: favorite ? "#ffd86988" : `${accent}55` }}><FitIcon name="favorite" size={20}/></button>
          <button type="button" aria-label={text(langKey, "Ajouter à ma séance", "Add to my workout", "Añadir a mi sesión")} title={text(langKey, "Ajouter à ma séance", "Add to my workout", "Añadir a mi sesión")} onClick={onAddToWorkout} style={{ color: accent, borderColor: `${accent}68` }}><FitIcon name="plus" size={21}/></button>
        </div>
      </div>

      <div className="fit-detail-motion" style={{ borderColor: `${accent}48` }}>
        <GoldBrand/>
        <FitExerciseMotion exercise={exercise} accent={accent} compact cleanBranding/>
      </div>

      <div className="fit-detail-tabs" role="tablist">
        <TabButton active={tab === "muscles"} label={text(langKey, "MUSCLES", "MUSCLES", "MÚSCULOS")} icon="muscles" color={accent} onClick={() => setTab("muscles")}/>
        <TabButton active={tab === "details"} label={text(langKey, "DÉTAILS", "DETAILS", "DETALLES")} icon="guide" color={accent} onClick={() => setTab("details")}/>
        <TabButton active={tab === "objective"} label={text(langKey, "OBJECTIF", "GOAL", "OBJETIVO")} icon="goals" color={accent} onClick={() => setTab("objective")}/>
        <TabButton active={tab === "type"} label={text(langKey, "TYPE", "TYPE", "TIPO")} icon="strength" color={accent} onClick={() => setTab("type")}/>
        <TabButton active={tab === "records"} label={text(langKey, "RECORDS", "RECORDS", "RÉCORDS")} icon="records" color={accent} onClick={() => setTab("records")}/>
      </div>

      <div className="fit-detail-photos" aria-label={text(langKey, "Photos repères", "Reference photos", "Fotos de referencia")}>
        {referenceImages.length ? referenceImages.map((url, index) => <button key={url} type="button" onClick={() => setLightbox(url)} title={text(langKey, "Afficher en plein écran", "View fullscreen", "Ver a pantalla completa")} style={{ borderColor: index === 0 ? `${accent}a0` : "rgba(255,255,255,.1)", boxShadow: index === 0 ? `0 0 12px ${accent}20` : "none" }}><img src={url} alt={`${exercise.name} ${index + 1}`} loading="lazy"/></button>) : <div className="fit-detail-photo-empty"><FitIcon name="guide" size={20}/><span>{text(langKey, "Photos à ajouter", "Photos to add", "Fotos por añadir")}</span></div>}
      </div>

      <div className="fit-detail-floating-panel" style={{ borderColor: `${accent}48`, boxShadow: `inset 0 1px 0 rgba(255,255,255,.035), 0 0 20px ${accent}0c` }}>
        <img src={multisportsLogo} alt="" className="fit-detail-panel-watermark" aria-hidden="true"/>
        {panel}
      </div>
    </div>

    {lightbox ? <div className="fit-detail-lightbox" role="dialog" aria-modal="true" onClick={(event) => { event.stopPropagation(); setLightbox(null); }}>
      <button type="button" onClick={() => setLightbox(null)} aria-label={text(langKey, "Fermer", "Close", "Cerrar")}>×</button>
      <img src={lightbox} alt={exercise.name} onClick={(event) => event.stopPropagation()}/>
    </div> : null}

    <style>{`
      .fit-detail-overlay{position:fixed;inset:0;z-index:140;background:rgba(2,4,8,.82);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box}
      .fit-detail-card{position:relative;width:min(100%,760px);height:min(95dvh,840px);max-height:95dvh;overflow:hidden;border-radius:25px;padding:10px 11px 11px;box-sizing:border-box;background:linear-gradient(180deg,rgba(7,10,17,.995),rgba(5,8,14,.995));border:1px solid;display:flex;flex-direction:column;gap:7px;color:#fff}
      .fit-detail-page-watermark{position:absolute;right:-88px;top:42px;width:310px;height:310px;object-fit:contain;opacity:.028;filter:grayscale(1) brightness(1.8);pointer-events:none;user-select:none}
      .fit-detail-topline{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:33px}
      .fit-detail-meta-icons{display:flex;align-items:center;gap:20px;padding-left:4px}
      .fit-detail-meta-icons>span{height:30px;min-width:32px;display:grid;place-items:center}
      .fit-detail-stars{display:flex!important;grid-auto-flow:column;gap:2px;font-size:18px;line-height:1;letter-spacing:0;text-shadow:0 0 10px rgba(255,216,105,.22)}
      .fit-detail-close{width:35px;height:35px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);color:#fff;font-size:22px;line-height:1;cursor:pointer}
      .fit-detail-title-row{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:39px}
      .fit-detail-title-row h2{min-width:0;margin:0;font-size:clamp(21px,5.2vw,31px);line-height:1;font-weight:1000;letter-spacing:-.7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .fit-detail-actions{display:flex;align-items:center;gap:7px;flex:0 0 auto}
      .fit-detail-actions button{width:37px;height:37px;border-radius:999px;border:1px solid;background:rgba(4,7,12,.88);display:grid;place-items:center;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
      .fit-detail-motion{position:relative;z-index:2;flex:0 0 clamp(142px,23dvh,190px);min-height:0;overflow:hidden;border-radius:19px;border:1px solid;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.04),rgba(2,4,8,.98) 72%)}
      .fit-detail-motion>div:last-child{height:100%;min-height:100%!important;border:0!important;border-radius:0!important;background:transparent!important}
      .fit-detail-motion video,.fit-detail-motion img{max-height:100%}
      .fit-detail-gold-brand{position:absolute;left:8px;top:8px;z-index:8;height:27px;display:flex;align-items:center;gap:6px;padding:3px 8px 3px 4px;border-radius:999px;border:1px solid rgba(246,194,86,.44);background:rgba(2,4,8,.82);color:#f6c256;font-size:6.4px;font-weight:1000;line-height:1.05;letter-spacing:.6px;pointer-events:none;box-sizing:border-box}
      .fit-detail-gold-brand img{width:20px!important;height:20px!important;object-fit:contain!important;filter:grayscale(1) sepia(1) saturate(5) hue-rotate(350deg) brightness(1.2)}
      .fit-detail-tabs{position:relative;z-index:2;flex:0 0 43px;display:flex;align-items:stretch;justify-content:space-between;gap:4px;border-bottom:1px solid rgba(255,255,255,.07)}
      .fit-detail-tab{height:40px;min-width:40px;max-width:112px;border:1px solid transparent;border-radius:12px;background:transparent;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 8px;cursor:pointer;transition:.18s ease;flex:0 1 auto}
      .fit-detail-tab span{font-size:7.3px;font-weight:1000;letter-spacing:.55px;white-space:nowrap}
      .fit-detail-tab.is-active{flex:1 1 auto}
      .fit-detail-photos{position:relative;z-index:2;flex:0 0 67px;display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;padding:1px 0}
      .fit-detail-photos::-webkit-scrollbar{display:none}
      .fit-detail-photos button{flex:0 0 92px;height:64px;padding:0;overflow:hidden;border-radius:12px;border:1px solid;background:rgba(255,255,255,.025);cursor:zoom-in}
      .fit-detail-photos img{width:100%;height:100%;display:block;object-fit:cover;background:#020306}
      .fit-detail-photo-empty{width:100%;height:64px;border-radius:12px;border:1px dashed rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;gap:7px;color:rgba(255,255,255,.42);font-size:7.5px;font-weight:900}
      .fit-detail-floating-panel{position:relative;z-index:2;flex:1 1 auto;min-height:154px;overflow:hidden;border-radius:18px;border:1px solid;background:linear-gradient(145deg,rgba(11,15,24,.97),rgba(6,9,15,.985));padding:9px 10px;box-sizing:border-box}
      .fit-detail-panel-watermark{position:absolute;right:-18px;bottom:-28px;width:180px;height:180px;object-fit:contain;opacity:.055;filter:grayscale(1) brightness(1.55);pointer-events:none}
      .fit-detail-panel-content{position:relative;z-index:2;height:100%;min-height:0;overflow:hidden}
      .fit-detail-panel-title{font-size:9px;font-weight:1000;letter-spacing:.85px;margin-bottom:8px}
      .fit-detail-chip-row{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
      .fit-detail-copy{margin-top:9px;max-width:82%;font-size:8px;line-height:1.45;color:rgba(255,255,255,.7)}
      .fit-detail-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .fit-detail-stat{min-width:0;border:1px solid;border-radius:12px;padding:8px;box-sizing:border-box}
      .fit-detail-stat-label{font-size:6.3px;font-weight:1000;letter-spacing:.65px;color:rgba(255,255,255,.48)}
      .fit-detail-stat-value{margin-top:3px;font-size:11px;line-height:1;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .fit-detail-stat-sub{margin-top:4px;color:rgba(255,255,255,.44);font-size:6.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .fit-detail-panel-details{display:grid;grid-template-rows:auto minmax(0,1fr);gap:7px}
      .fit-pushup-summary{min-height:0}
      .fit-pushup-summary-title{font-size:12px;font-weight:1000;letter-spacing:.3px;line-height:1;margin-bottom:5px}
      .fit-pushup-summary-steps{display:grid;grid-template-columns:minmax(0,1fr) 9px minmax(0,1fr) 9px minmax(0,1fr) 9px minmax(0,1fr);gap:2px;align-items:center}
      .fit-pushup-step{min-width:0}
      .fit-pushup-step-head{height:17px;display:flex;align-items:center;gap:4px;min-width:0}
      .fit-pushup-step-head span{width:15px;height:15px;border-radius:999px;border:1px solid;display:grid;place-items:center;flex:0 0 15px;font-size:6.2px;font-weight:1000}
      .fit-pushup-step-head b{min-width:0;font-size:5.4px;line-height:1.02;color:rgba(255,255,255,.78);overflow:hidden}
      .fit-pushup-step img{width:100%;height:37px;display:block;object-fit:contain;background:transparent}
      .fit-pushup-arrow{text-align:center;color:rgba(255,255,255,.34);font-size:15px}
      .fit-detail-instructions{min-height:0;overflow:hidden;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 10px;padding-top:6px;border-top:1px solid rgba(255,255,255,.07)}
      .fit-detail-instructions>div{min-width:0;display:grid;grid-template-columns:auto 1fr;gap:5px;align-items:start}
      .fit-detail-instructions b{font-size:6.5px;letter-spacing:.35px;white-space:nowrap}
      .fit-detail-instructions span{min-width:0;color:rgba(255,255,255,.65);font-size:6.4px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .fit-detail-generic-summary{height:53px;border:1px solid;border-radius:13px;display:grid;grid-template-columns:30px 1fr;grid-template-rows:1fr 1fr;align-items:center;padding:6px 9px;box-sizing:border-box}
      .fit-detail-generic-summary>span:first-child{grid-row:1/3}.fit-detail-generic-summary b{font-size:10px}.fit-detail-generic-summary>span:last-child{font-size:6.7px;color:rgba(255,255,255,.45)}
      .fit-detail-lightbox{position:fixed;inset:0;z-index:170;background:rgba(0,0,0,.94);display:grid;place-items:center;padding:18px;box-sizing:border-box;cursor:zoom-out}
      .fit-detail-lightbox img{max-width:96vw;max-height:90dvh;object-fit:contain;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.75);cursor:default}
      .fit-detail-lightbox button{position:absolute;right:18px;top:18px;width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.16);background:rgba(16,18,24,.9);color:#fff;font-size:24px;z-index:2}
      @media(max-width:420px){
        .fit-detail-card{padding:9px;gap:6px;border-radius:22px}
        .fit-detail-meta-icons{gap:14px}.fit-detail-title-row h2{font-size:24px}
        .fit-detail-motion{flex-basis:clamp(136px,22dvh,176px)}
        .fit-detail-photos{flex-basis:61px}.fit-detail-photos button{height:58px;flex-basis:84px}
        .fit-detail-floating-panel{min-height:146px;padding:8px}
        .fit-detail-tab{padding:0 6px}.fit-detail-tab span{font-size:6.8px}
      }
      @media(max-height:720px){
        .fit-detail-card{height:97dvh;max-height:97dvh;gap:5px;padding:8px}
        .fit-detail-topline{min-height:29px}.fit-detail-close{width:31px;height:31px}.fit-detail-title-row{min-height:34px}.fit-detail-title-row h2{font-size:22px}.fit-detail-actions button{width:33px;height:33px}
        .fit-detail-motion{flex-basis:132px}.fit-detail-tabs{flex-basis:39px}.fit-detail-tab{height:36px}
        .fit-detail-photos{flex-basis:55px}.fit-detail-photos button{height:52px;flex-basis:78px}
        .fit-detail-floating-panel{min-height:136px;padding:7px 8px}.fit-pushup-step img{height:30px}.fit-detail-instructions span{font-size:5.9px}.fit-detail-instructions b{font-size:6px}
      }
    `}</style>
  </div>;
}
