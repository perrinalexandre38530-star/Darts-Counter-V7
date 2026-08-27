import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { FIT_EXERCISES, FIT_TEMPLATES, type FitEquipment, type FitExercise, type FitMuscle } from "../../fit/fitStore";
import { getCachedFreeExerciseCatalog, loadFreeExerciseCatalog } from "../../fit/freeExerciseCatalog";
import {
  FIT_EQUIPMENT_ORDER,
  FIT_MUSCLE_COLORS,
  FIT_MUSCLE_LABELS,
  FIT_MUSCLE_ORDER,
  exerciseMatchesMuscle,
  inferGoalTags,
  inferMovementPattern,
  muscleExerciseCount,
  normalizeLevel,
  type FitGoalFilter,
  type FitLevelFilter,
  type FitMovementFilter,
} from "../../fit/fitExerciseTaxonomy";
import FitBodyMap from "./FitBodyMap";
import FitExerciseMotion from "./FitExerciseMotion";
import { FitGlassCard, FitIcon, FitIconTabs, FitPageHeader, FitPill, FitPrimaryButton, FitSectionTitle, FitShell, fitUiCss } from "./FitPerfUi";

type Props = { go: (route: any, params?: any) => void };
type Tab = "body" | "library" | "favorites" | "programs";
const FAVORITES_KEY = "mss-fit-perf-favorite-exercises-v1";

function readFavorites(): string[] {
  try { const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); return Array.isArray(raw) ? raw.map(String) : []; } catch { return []; }
}
function saveFavorites(ids: string[]) { try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); } catch {} }

function levelLabel(level: string, t: (fr: string, en: string, es: string) => string) {
  const normalized = normalizeLevel(level);
  if (normalized === "Débutant") return t("Débutant", "Beginner", "Principiante");
  if (normalized === "Intermédiaire") return t("Intermédiaire", "Intermediate", "Intermedio");
  if (normalized === "Avancé") return t("Avancé", "Advanced", "Avanzado");
  return level;
}

export default function FitPerfPlan({ go }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const langKey = lang.startsWith("en") ? "en" : lang.startsWith("es") ? "es" : "fr";
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";

  const cachedAtStart = React.useMemo(() => getCachedFreeExerciseCatalog(), []);
  const [tab, setTab] = React.useState<Tab>("body");
  const [search, setSearch] = React.useState("");
  const [muscle, setMuscle] = React.useState<FitMuscle | "Tous">("Tous");
  const [equipment, setEquipment] = React.useState<FitEquipment | "Tous">("Tous");
  const [level, setLevel] = React.useState<FitLevelFilter>("Tous");
  const [movement, setMovement] = React.useState<FitMovementFilter>("Tous");
  const [goal, setGoal] = React.useState<FitGoalFilter>("Tous");
  const [detail, setDetail] = React.useState<FitExercise | null>(null);
  const [favorites, setFavorites] = React.useState<string[]>(readFavorites);
  const [freeExercises, setFreeExercises] = React.useState<FitExercise[]>(cachedAtStart);
  const [catalogStatus, setCatalogStatus] = React.useState<"idle" | "loading" | "ready" | "error">(cachedAtStart.length ? "ready" : "idle");

  React.useEffect(() => {
    if (freeExercises.length || catalogStatus === "loading") return;
    let cancelled = false;
    setCatalogStatus("loading");
    void loadFreeExerciseCatalog(false).then((loaded) => {
      if (cancelled) return;
      setFreeExercises(loaded);
      setCatalogStatus("ready");
    }).catch(() => { if (!cancelled) setCatalogStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  const allExercises = React.useMemo(() => {
    const seen = new Set<string>();
    return [...FIT_EXERCISES, ...freeExercises].filter((exercise) => {
      if (seen.has(exercise.id)) return false;
      seen.add(exercise.id);
      return true;
    });
  }, [freeExercises]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      saveFavorites(next);
      return next;
    });
  };

  const counts = React.useMemo(() => Object.fromEntries(FIT_MUSCLE_ORDER.map((item) => [item, muscleExerciseCount(allExercises, item)])) as Record<FitMuscle, number>, [allExercises]);

  const filtered = React.useMemo(() => allExercises.filter((exercise) => {
    const q = search.trim().toLowerCase();
    const movementValue = inferMovementPattern(exercise);
    const goals = inferGoalTags(exercise);
    const haystack = `${exercise.name} ${exercise.muscle} ${(exercise.secondary || []).join(" ")} ${exercise.equipment} ${exercise.category || ""} ${movementValue} ${goals.join(" ")}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (!exerciseMatchesMuscle(exercise, muscle)) return false;
    if (equipment !== "Tous" && exercise.equipment !== equipment) return false;
    if (level !== "Tous" && normalizeLevel(exercise.level) !== level) return false;
    if (movement !== "Tous" && movementValue !== movement) return false;
    if (goal !== "Tous" && !goals.includes(goal)) return false;
    if (tab === "favorites" && !favorites.includes(exercise.id)) return false;
    return true;
  }), [allExercises, search, muscle, equipment, level, movement, goal, tab, favorites]);

  const clearFilters = () => { setSearch(""); setMuscle("Tous"); setEquipment("Tous"); setLevel("Tous"); setMovement("Tous"); setGoal("Tous"); };
  const activeFilterCount = [muscle, equipment, level, movement, goal].filter((value) => value !== "Tous").length + (search.trim() ? 1 : 0);

  const selectBodyMuscle = (next: FitMuscle) => {
    setMuscle(next);
    setEquipment("Tous");
    setLevel("Tous");
    setMovement("Tous");
    setGoal("Tous");
  };

  const renderExerciseCard = (exercise: FitExercise) => {
    const fav = favorites.includes(exercise.id);
    const movementName = inferMovementPattern(exercise);
    return <FitGlassCard key={exercise.id} accent={exercise.accent} style={{ overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 9, alignItems: "center", padding: 9 }}>
        <button type="button" onClick={() => setDetail(exercise)} aria-label={exercise.name} style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", color: exercise.accent, background: `${exercise.accent}12`, border: `1px solid ${exercise.accent}34`, fontSize: 17, fontWeight: 1000 }}>{exercise.icon}</button>
        <button type="button" onClick={() => setDetail(exercise)} style={{ minWidth: 0, border: 0, background: "transparent", color: "#fff", padding: 0, textAlign: "left" }}>
          <div style={{ fontSize: 11.1, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.name}</div>
          <div style={{ marginTop: 3, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: exercise.accent, fontSize: 7.4, fontWeight: 950 }}>{FIT_MUSCLE_LABELS[exercise.muscle][langKey]}</span>
            <span style={{ color: textSoft, fontSize: 7.2 }}>· {exercise.equipment} · {movementName}</span>
          </div>
        </button>
        <div style={{ display: "flex", gap: 5 }}>
          <button type="button" aria-label={fav ? t("Retirer des favoris", "Remove favorite", "Quitar favorito") : t("Ajouter aux favoris", "Add favorite", "Añadir favorito")} onClick={() => toggleFavorite(exercise.id)} style={{ width: 31, height: 31, borderRadius: 10, border: `1px solid ${fav ? exercise.accent + "55" : "rgba(255,255,255,.06)"}`, background: fav ? `${exercise.accent}12` : "transparent", color: fav ? exercise.accent : textSoft, display: "grid", placeItems: "center" }}><FitIcon name="favorite" size={14}/></button>
          <button type="button" aria-label={t("Ajouter à la séance", "Add to workout", "Añadir a sesión")} onClick={() => go("games", { fitTemplateId: "free", fitExerciseId: exercise.id })} style={{ width: 31, height: 31, borderRadius: 10, border: `1px solid ${exercise.accent}42`, background: `${exercise.accent}0d`, color: exercise.accent, display: "grid", placeItems: "center" }}><FitIcon name="plus" size={15}/></button>
        </div>
      </div>
    </FitGlassCard>;
  };

  const filterChip = (label: string, active: boolean, onClick: () => void) => <button type="button" onClick={onClick} style={{ flex: "0 0 auto", minHeight: 29, borderRadius: 999, border: `1px solid ${active ? accent + "66" : "rgba(255,255,255,.065)"}`, background: active ? `${accent}12` : "rgba(255,255,255,.02)", color: active ? accent : "rgba(255,255,255,.68)", padding: "0 9px", fontSize: 7.5, fontWeight: 950, whiteSpace: "nowrap" }}>{label}</button>;

  return <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
    <FitShell>
      <style>{fitUiCss}</style>
      <FitPageHeader eyebrow="FIT PERF" title={t("BIBLIOTHÈQUE", "LIBRARY", "BIBLIOTECA")} accent={accent}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <div style={{ color: textSoft, fontSize: 8.2 }}>{t("Choisis une zone, trouve le bon mouvement, ajoute-le à ta séance.", "Choose a body area, find the right movement, add it to your workout.", "Elige una zona, encuentra el movimiento y añádelo a tu sesión.")}</div>
          <FitPill accent={catalogStatus === "error" ? "#ff8b8b" : "#72def4"}>{allExercises.length} EXOS</FitPill>
        </div>
      </FitPageHeader>

      <FitIconTabs<Tab> value={tab} onChange={setTab} accent={accent} items={[
        { id: "body", label: t("Corps", "Body", "Cuerpo"), icon: "muscles" },
        { id: "library", label: t("Exercices", "Exercises", "Ejercicios"), icon: "library" },
        { id: "favorites", label: t("Favoris", "Favorites", "Favoritos"), icon: "favorite", badge: favorites.length || undefined },
        { id: "programs", label: t("Programmes", "Programs", "Programas"), icon: "program" },
      ]}/>

      {tab === "body" ? <>
        <FitSectionTitle eyebrow={t("ANATOMIE", "ANATOMY", "ANATOMÍA")} title={t("Quelle zone veux-tu travailler ?", "Which area do you want to train?", "¿Qué zona quieres trabajar?")} right={muscle !== "Tous" ? <button type="button" onClick={() => setMuscle("Tous")} style={{ border: 0, background: "transparent", color: textSoft, fontSize: 7.5, fontWeight: 900 }}>{t("TOUT", "ALL", "TODO")}</button> : null}/>
        <FitBodyMap selected={muscle} onSelect={selectBodyMuscle} counts={counts} lang={lang}/>

        <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 7, paddingBottom: 2 }}>
          {FIT_MUSCLE_ORDER.filter((item) => item !== "Full body" && counts[item] > 0).map((item) => filterChip(`${FIT_MUSCLE_LABELS[item][langKey]} · ${counts[item]}`, muscle === item, () => setMuscle(item)))}
        </div>

        {muscle !== "Tous" ? <>
          <FitSectionTitle eyebrow={t("SÉLECTION", "SELECTION", "SELECCIÓN")} title={`${counts[muscle] || 0} ${t("exercices pour cette zone", "exercises for this area", "ejercicios para esta zona")}`} right={<button type="button" onClick={() => setTab("library")} style={{ border: 0, background: "transparent", color: accent, fontSize: 7.8, fontWeight: 1000 }}>{t("VOIR TOUT", "VIEW ALL", "VER TODO")} ›</button>}/>
          <div style={{ display: "grid", gap: 6 }}>{allExercises.filter((exercise) => exerciseMatchesMuscle(exercise, muscle)).slice(0, 8).map(renderExerciseCard)}</div>
        </> : <FitGlassCard accent={accent} style={{ marginTop: 9, padding: 11, display: "grid", gridTemplateColumns: "36px 1fr", gap: 9, alignItems: "center" }}><div style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", color: accent, background: `${accent}10`, border: `1px solid ${accent}30` }}><FitIcon name="info" size={17}/></div><div><div style={{ fontSize: 9.5, fontWeight: 1000 }}>{t("Touchez directement une zone du corps", "Tap a body area directly", "Toca directamente una zona del cuerpo")}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.5 }}>{t("Face et dos sont interactifs. Les exercices sont filtrés immédiatement.", "Front and back are interactive. Exercises are filtered instantly.", "Frente y espalda son interactivos. Los ejercicios se filtran al instante.")}</div></div></FitGlassCard>}
      </> : null}

      {(tab === "library" || tab === "favorites") ? <>
        <FitGlassCard accent={accent} style={{ padding: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
            <div style={{ position: "relative" }}><span style={{ position: "absolute", left: 10, top: 10, color: textSoft }}><FitIcon name="search" size={17}/></span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Exercice, muscle, matériel…", "Exercise, muscle, equipment…", "Ejercicio, músculo, material…")} style={{ width: "100%", minHeight: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.028)", color: "#fff", padding: "0 10px 0 35px", boxSizing: "border-box", outline: "none" }}/></div>
            {activeFilterCount ? <button type="button" onClick={clearFilters} style={{ minWidth: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", color: accent, fontWeight: 1000 }}>×{activeFilterCount}</button> : null}
          </div>

          <div style={{ marginTop: 7, color: textSoft, fontSize: 6.8, fontWeight: 1000, letterSpacing: .7 }}>{t("ZONE", "AREA", "ZONA")}</div>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 4 }}>{filterChip(t("Toutes", "All", "Todas"), muscle === "Tous", () => setMuscle("Tous"))}{FIT_MUSCLE_ORDER.filter((item) => counts[item] > 0).map((item) => filterChip(FIT_MUSCLE_LABELS[item][langKey], muscle === item, () => setMuscle(item)))}</div>

          <div style={{ marginTop: 7, color: textSoft, fontSize: 6.8, fontWeight: 1000, letterSpacing: .7 }}>{t("MATÉRIEL", "EQUIPMENT", "MATERIAL")}</div>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 4 }}>{filterChip(t("Tous", "All", "Todos"), equipment === "Tous", () => setEquipment("Tous"))}{FIT_EQUIPMENT_ORDER.filter((item) => allExercises.some((exercise) => exercise.equipment === item)).map((item) => filterChip(item, equipment === item, () => setEquipment(item)))}</div>

          <div style={{ marginTop: 7, color: textSoft, fontSize: 6.8, fontWeight: 1000, letterSpacing: .7 }}>{t("NIVEAU · MOUVEMENT · OBJECTIF", "LEVEL · MOVEMENT · GOAL", "NIVEL · MOVIMIENTO · OBJETIVO")}</div>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 4 }}>
            {(["Tous","Débutant","Intermédiaire","Avancé"] as FitLevelFilter[]).map((item) => filterChip(item === "Tous" ? t("Tous niveaux", "All levels", "Todos niveles") : item, level === item, () => setLevel(item)))}
            {(["Poussée","Tirage","Squat","Charnière","Isolation","Gainage","Mobilité","Cardio"] as FitMovementFilter[]).map((item) => filterChip(item, movement === item, () => setMovement(movement === item ? "Tous" : item)))}
            {(["Force","Hypertrophie","Endurance","Mobilité","Explosivité","Cardio"] as FitGoalFilter[]).map((item) => filterChip(item, goal === item, () => setGoal(goal === item ? "Tous" : item)))}
          </div>
        </FitGlassCard>

        <FitSectionTitle eyebrow={tab === "favorites" ? t("FAVORIS", "FAVORITES", "FAVORITOS") : t("RÉSULTATS", "RESULTS", "RESULTADOS")} title={`${filtered.length} ${t("exercices", "exercises", "ejercicios")}`} right={<span style={{ color: catalogStatus === "loading" ? "#72def4" : textSoft, fontSize: 7 }}>{catalogStatus === "loading" ? t("Catalogue en cours…", "Loading catalog…", "Cargando catálogo…") : freeExercises.length ? `OPEN EXERCISE DB ${freeExercises.length}` : "FIT PERF"}</span>}/>
        <div style={{ display: "grid", gap: 6 }}>{filtered.slice(0, 120).map(renderExerciseCard)}{filtered.length > 120 ? <FitGlassCard accent={accent} style={{ padding: 10, textAlign: "center", color: textSoft, fontSize: 7.8 }}>{filtered.length - 120} {t("autres résultats · affine les filtres", "more results · refine filters", "resultados más · ajusta los filtros")}</FitGlassCard> : null}{!filtered.length ? <FitGlassCard accent={accent} style={{ padding: 22, textAlign: "center", color: textSoft }}>{tab === "favorites" ? t("Aucun favori avec ces filtres.", "No favorites with these filters.", "No hay favoritos con estos filtros.") : t("Aucun exercice ne correspond à ces filtres.", "No exercise matches these filters.", "Ningún ejercicio coincide con estos filtros.")}</FitGlassCard> : null}</div>
      </> : null}

      {tab === "programs" ? <>
        <FitSectionTitle eyebrow={t("PROGRAMMES", "PROGRAMS", "PROGRAMAS")} title={t("Démarrage rapide", "Quick start", "Inicio rápido")}/>
        <div style={{ display: "grid", gap: 7 }}>{FIT_TEMPLATES.map((program) => <FitGlassCard key={program.id} accent={program.accent} style={{ padding: 10, display: "grid", gridTemplateColumns: "40px 1fr 38px", gap: 9, alignItems: "center" }}><div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", color: program.accent, background: `${program.accent}10`, border: `1px solid ${program.accent}30`, fontWeight: 1000 }}>{program.icon}</div><div style={{ minWidth: 0 }}><div style={{ color: program.accent, fontSize: 11, fontWeight: 1000 }}>{program.name}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.8 }}>{program.exerciseIds.length} {t("exercices", "exercises", "ejercicios")} · {program.subtitle}</div></div><button type="button" aria-label={t("Démarrer", "Start", "Empezar")} onClick={() => go("games", { fitTemplateId: program.id })} style={{ width: 36, height: 36, borderRadius: 11, border: `1px solid ${program.accent}50`, background: `${program.accent}10`, color: program.accent, display: "grid", placeItems: "center" }}><FitIcon name="chevron" size={18}/></button></FitGlassCard>)}</div>
      </> : null}

      {detail ? <div role="dialog" aria-modal="true" onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(0,0,0,.76)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 9 }}>
        <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", borderRadius: "24px 24px 16px 16px", padding: 12, background: "#0a0d13", border: `1px solid ${detail.accent}40`, boxShadow: "0 -20px 70px rgba(0,0,0,.65)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" }}><div><div style={{ color: detail.accent, fontSize: 7.5, fontWeight: 1000, letterSpacing: .9 }}>{FIT_MUSCLE_LABELS[detail.muscle][langKey].toUpperCase()}</div><div style={{ marginTop: 3, fontSize: 18, lineHeight: 1.05, fontWeight: 1000 }}>{detail.name}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 8 }}>{detail.equipment} · {inferMovementPattern(detail)}{detail.level ? ` · ${levelLabel(detail.level, t)}` : ""}</div></div><button type="button" onClick={() => setDetail(null)} style={{ width: 36, height: 36, borderRadius: 11, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 18 }}>×</button></div>
          <div style={{ marginTop: 9 }}><div style={{ marginBottom: 5, color: detail.accent, fontSize: 7, fontWeight: 1000, letterSpacing: .8 }}>AWENA COACH · GUIDE MOUVEMENT</div><FitExerciseMotion exercise={detail}/></div>
          <FitSectionTitle eyebrow={t("MUSCLES", "MUSCLES", "MÚSCULOS")} title={t("Zones sollicitées", "Muscles involved", "Zonas implicadas")}/>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}><FitPill accent={FIT_MUSCLE_COLORS[detail.muscle]}>{t("PRINCIPAL", "PRIMARY", "PRINCIPAL")} · {FIT_MUSCLE_LABELS[detail.muscle][langKey]}</FitPill>{(detail.secondary || []).map((item) => <FitPill key={item} accent={FIT_MUSCLE_COLORS[item]} muted>{FIT_MUSCLE_LABELS[item][langKey]}</FitPill>)}</div>
          <FitSectionTitle eyebrow={t("OBJECTIF", "GOAL", "OBJETIVO")} title={t("Type de travail", "Training focus", "Tipo de trabajo")}/>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{inferGoalTags(detail).map((item) => <FitPill key={item} accent={detail.accent}>{item}</FitPill>)}<FitPill muted>{inferMovementPattern(detail)}</FitPill></div>
          <FitSectionTitle eyebrow={t("EXÉCUTION", "EXECUTION", "EJECUCIÓN")} title={t("Consignes techniques", "Technique instructions", "Instrucciones técnicas")}/>
          {detail.instructions?.length ? <FitGlassCard accent={detail.accent} style={{ padding: 11 }}><ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 7, color: "rgba(255,255,255,.78)", fontSize: 8.5, lineHeight: 1.45 }}>{detail.instructions.slice(0, 8).map((instruction, index) => <li key={index}>{instruction}</li>)}</ol></FitGlassCard> : <FitGlassCard accent={detail.accent} style={{ padding: 11, color: textSoft, fontSize: 8.5 }}>{t("La fiche technique AWENA détaillée sera ajoutée à ce mouvement.", "The detailed AWENA technique guide will be added to this movement.", "La guía técnica detallada de AWENA se añadirá a este movimiento.")}</FitGlassCard>}
          <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 7, marginTop: 10 }}><button type="button" aria-label={t("Favori", "Favorite", "Favorito")} onClick={() => toggleFavorite(detail.id)} style={{ borderRadius: 12, border: `1px solid ${favorites.includes(detail.id) ? detail.accent + "55" : "rgba(255,255,255,.075)"}`, background: favorites.includes(detail.id) ? `${detail.accent}10` : "rgba(255,255,255,.03)", color: favorites.includes(detail.id) ? detail.accent : textSoft, display: "grid", placeItems: "center" }}><FitIcon name="favorite" size={18}/></button><FitPrimaryButton accent={detail.accent} onClick={() => go("games", { fitTemplateId: "free", fitExerciseId: detail.id })}>{t("＋ AJOUTER À MA SÉANCE", "+ ADD TO MY WORKOUT", "+ AÑADIR A MI SESIÓN")}</FitPrimaryButton></div>
        </div>
      </div> : null}
    </FitShell>
  </div>;
}
