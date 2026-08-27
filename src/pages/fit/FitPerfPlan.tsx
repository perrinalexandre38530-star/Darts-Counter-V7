import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { FIT_EXERCISES, FIT_TEMPLATES, buildFitRecords, formatKg, loadFitSessions, type FitEquipment, type FitExercise, type FitMuscle } from "../../fit/fitStore";
import { freeExerciseImageUrl, getCachedFreeExerciseCatalog, loadFreeExerciseCatalog } from "../../fit/freeExerciseCatalog";
import { getAwenaPremiumMotion } from "../../fit/awenaPremiumMotions";
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
  type FitLevelFilter,
} from "../../fit/fitExerciseTaxonomy";
import FitBodyMap from "./FitBodyMap";
import FitExerciseMotion from "./FitExerciseMotion";
import { FitGlassCard, FitIcon, FitIconTabs, FitMetric, FitPageHeader, FitPill, FitPrimaryButton, FitSectionTitle, FitShell, fitUiCss } from "./FitPerfUi";

type Props = { go: (route: any, params?: any) => void };
type Tab = "body" | "library" | "favorites" | "programs";
type FilterTab = "zone" | "equipment" | "level";
const EXERCISES_PER_PAGE = 9;
const FAVORITES_KEY = "mss-fit-perf-favorite-exercises-v1";

function readFavorites(): string[] {
  try { const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); return Array.isArray(raw) ? raw.map(String) : []; } catch { return []; }
}
function saveFavorites(ids: string[]) { try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); } catch {} }

function levelLabel(level: string | undefined, t: (fr: string, en: string, es: string) => string) {
  const normalized = normalizeLevel(level);
  if (normalized === "Débutant") return t("Débutant", "Beginner", "Principiante");
  if (normalized === "Intermédiaire") return t("Intermédiaire", "Intermediate", "Intermedio");
  if (normalized === "Avancé") return t("Avancé", "Advanced", "Avanzado");
  return level || t("Niveau libre", "Open level", "Nivel libre");
}

function difficultyValue(level?: string) {
  const normalized = normalizeLevel(level);
  if (normalized === "Débutant") return 1;
  if (normalized === "Intermédiaire") return 2;
  if (normalized === "Avancé") return 3;
  return 1;
}

function DifficultyStars({ level, accent = "#ffd66b", size = 12 }: { level?: string; accent?: string; size?: number }) {
  const active = difficultyValue(level);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 3 }} aria-label={`difficulty-${active}`}>
      {Array.from({ length: 3 }, (_, index) => (
        <span key={index} style={{ color: index < active ? accent : "rgba(255,255,255,.18)", fontSize: size, lineHeight: 1, textShadow: index < active ? `0 0 10px ${accent}55` : "none" }}>★</span>
      ))}
    </div>
  );
}


function MuscleFilterIcon({ muscle, active }: { muscle: FitMuscle | "Tous"; active: boolean }) {
  const hot = active ? "#5ce9ff" : "#ff4f6f";
  const neutral = "rgba(220,225,232,.72)";
  const dim = "rgba(133,141,153,.50)";
  const selected = (name: string) => muscle === "Tous" || muscle === name;
  const fill = (name: string) => selected(name) ? hot : neutral;
  const backOnly = ["Dos","Lombaires","Triceps","Fessiers","Ischios"].includes(String(muscle));
  return (
    <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true" style={{ overflow: "visible", filter: active ? `drop-shadow(0 0 5px ${hot}66)` : "none" }}>
      <g transform={backOnly ? "translate(8 1)" : "translate(8 1)"} stroke={dim} strokeWidth="1" strokeLinejoin="round">
        <circle cx="16" cy="5" r="3.2" fill={neutral}/><path d="M13.8 8.3h4.4l2.8 6.4-2 10.2H13l-2-10.2z" fill={muscle === "Full body" || muscle === "Tous" ? hot : neutral}/>
        <path d="M11.2 10.2 7.6 12.6 5.4 22l3 1.1 4-8.2" fill={fill(muscle === "Biceps" || muscle === "Triceps" ? String(muscle) : "Épaules")}/>
        <path d="M20.8 10.2 24.4 12.6 26.6 22l-3 1.1-4-8.2" fill={fill(muscle === "Biceps" || muscle === "Triceps" ? String(muscle) : "Épaules")}/>
        <path d="M8.3 23 6.2 32l3 1 3.2-9" fill={fill("Avant-bras")}/><path d="M23.7 23 25.8 32l-3 1-3.2-9" fill={fill("Avant-bras")}/>
        <path d="M13 24.8 11.2 35l3.6 8h3.1l-1.7-9.2 1.6-9z" fill={fill(backOnly ? "Ischios" : "Quadriceps")}/>
        <path d="M19 24.8 20.8 35l-3.6 8h-3.1l1.7-9.2-1.6-9z" fill={fill(backOnly ? "Ischios" : "Quadriceps")}/>
        <path d="M12.2 34.8 11 44h3.5l1.2-8.5" fill={fill("Mollets")}/><path d="M19.8 34.8 21 44h-3.5l-1.2-8.5" fill={fill("Mollets")}/>
        {!backOnly ? <><path d="M12.4 10.4h7.2v5.8h-7.2z" fill={fill("Pectoraux")}/><path d="M13.4 16.8h5.2v7h-5.2z" fill={fill("Abdos")}/><path d="M13.2 8.3h5.6v2.4h-5.6z" fill={fill("Cou")}/><path d="M11.6 24.2h3.1v5h-3.1zM17.3 24.2h3.1v5h-3.1z" fill={fill("Adducteurs")}/><path d="M10.2 23.2h2.4v6h-2.4zM19.4 23.2h2.4v6h-2.4z" fill={fill("Abducteurs")}/></> : <><path d="M12.2 10.3h7.6v9.3h-7.6z" fill={fill("Dos")}/><path d="M13.6 19.4h4.8v5.5h-4.8z" fill={fill("Lombaires")}/><path d="M12 23.5h8v5.7h-8z" fill={fill("Fessiers")}/><path d="M13.2 8.3h5.6v2.4h-5.6z" fill={fill("Cou")}/></>}
      </g>
    </svg>
  );
}

function EquipmentFilterIcon({ equipment, active }: { equipment: FitEquipment | "Tous"; active: boolean }) {
  const map: Record<string, any> = {
    "Tous": "filter", "Poids du corps": "body", "Haltères": "dumbbell", "Barre": "barbell", "Poulie": "cable", "Machine": "machine",
    "Kettlebell": "kettlebell", "Élastique": "band", "TRX": "band", "Banc": "workout", "Médecine ball": "medicine", "Autre": "settings",
  };
  return <FitIcon name={map[equipment] || "strength"} size={26}/>;
}

function LevelFilterIcon({ level, active }: { level: FitLevelFilter; active: boolean }) {
  const count = level === "Tous" ? 1 : level === "Débutant" ? 1 : level === "Intermédiaire" ? 2 : 3;
  if (level === "Tous") return <span style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${active ? "currentColor" : "rgba(255,255,255,.25)"}` }}><span style={{ fontSize: 22, lineHeight: 1 }}>★</span></span>;
  return <span style={{ minHeight: 34, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>{Array.from({ length: count }, (_, i) => <span key={i} style={{ fontSize: 20, lineHeight: 1 }}>★</span>)}</span>;
}

function FilterChoiceTile({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} style={{ minWidth: 0, minHeight: 70, borderRadius: 14, border: `1px solid ${active ? "#5ce9ff88" : "rgba(255,255,255,.09)"}`, background: active ? "linear-gradient(145deg,rgba(92,233,255,.18),rgba(9,14,22,.98))" : "linear-gradient(180deg,rgba(20,25,34,.99),rgba(12,16,24,.99))", color: active ? "#5ce9ff" : "rgba(255,255,255,.78)", boxShadow: active ? "0 0 15px rgba(92,233,255,.12)" : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 4px", cursor: "pointer" }}><span style={{ display: "grid", placeItems: "center", minHeight: 34 }}>{children}</span><span style={{ maxWidth: "100%", fontSize: 6.7, fontWeight: 1000, letterSpacing: .25, lineHeight: 1.05, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span></button>;
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
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [filterTab, setFilterTab] = React.useState<FilterTab>("zone");
  const [page, setPage] = React.useState(0);
  const [detail, setDetail] = React.useState<FitExercise | null>(null);
  const [favorites, setFavorites] = React.useState<string[]>(readFavorites);
  const [freeExercises, setFreeExercises] = React.useState<FitExercise[]>(cachedAtStart);
  const [catalogStatus, setCatalogStatus] = React.useState<"idle" | "loading" | "ready" | "error">(cachedAtStart.length ? "ready" : "idle");

  // OPEN EXERCISE DB remains the open catalogue source; its vendor label is intentionally hidden from the compact UI.
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
    if (tab === "favorites" && !favorites.includes(exercise.id)) return false;
    return true;
  }), [allExercises, search, muscle, equipment, level, tab, favorites]);

  const clearFilters = () => { setMuscle("Tous"); setEquipment("Tous"); setLevel("Tous"); };
  const activeFilterCount = [muscle, equipment, level].filter((value) => value !== "Tous").length;

  const selectBodyMuscle = (next: FitMuscle) => {
    setMuscle(next);
    setEquipment("Tous");
    setLevel("Tous");
  };

  const recordByExercise = React.useMemo(() => {
    const sessions = loadFitSessions();
    return new Map(buildFitRecords(sessions).map((record) => [record.exerciseId, record]));
  }, []);

  const detailRecord = detail ? recordByExercise.get(detail.id) : null;
  const detailImages = detail ? (detail.imagePaths || []).map((_, index) => freeExerciseImageUrl(detail, index)).filter((url): url is string => Boolean(url)).slice(0, 4) : [];

  const pageCount = Math.max(1, Math.ceil(filtered.length / EXERCISES_PER_PAGE));
  const pagedExercises = React.useMemo(() => filtered.slice(page * EXERCISES_PER_PAGE, page * EXERCISES_PER_PAGE + EXERCISES_PER_PAGE), [filtered, page]);

  React.useEffect(() => { setPage(0); }, [search, muscle, equipment, level, tab]);
  React.useEffect(() => { if (page >= pageCount) setPage(Math.max(0, pageCount - 1)); }, [page, pageCount]);

  const goPrevPage = () => setPage((current) => pageCount <= 1 ? 0 : (current - 1 + pageCount) % pageCount);
  const goNextPage = () => setPage((current) => pageCount <= 1 ? 0 : (current + 1) % pageCount);
  const filterSelections = [
    muscle !== "Tous" ? { key: "zone", label: FIT_MUSCLE_LABELS[muscle][langKey], clear: () => setMuscle("Tous") } : null,
    equipment !== "Tous" ? { key: "equipment", label: equipment, clear: () => setEquipment("Tous") } : null,
    level !== "Tous" ? { key: "level", label: levelLabel(level, t), clear: () => setLevel("Tous") } : null,
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const renderExerciseTile = (exercise: FitExercise) => {
    const fav = favorites.includes(exercise.id);
    const premium = getAwenaPremiumMotion(exercise.id);
    const video = premium?.video?.sources?.[0]?.src || null;
    const poster = premium?.video?.poster || premium?.frameSequence?.poster || freeExerciseImageUrl(exercise) || null;
    return (
      <div
        key={exercise.id}
        role="button"
        tabIndex={0}
        onClick={() => setDetail(exercise)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetail(exercise); } }}
        aria-label={exercise.name}
        style={{
          minWidth: 0,
          overflow: "hidden",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,.09)",
          background: "linear-gradient(180deg,rgba(17,22,31,.99),rgba(10,14,21,.99))",
          boxShadow: "0 9px 22px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.035)",
          color: "#fff",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          position: "relative",
        }}
      >
        <div style={{ position: "relative", height: 102, background: `radial-gradient(circle at 50% 36%,${exercise.accent}18,#070a10 70%)`, overflow: "hidden" }}>
          {video ? (
            <video src={video} poster={poster || undefined} muted loop autoPlay playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : poster ? (
            <img src={poster} alt="" loading="lazy" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ height: "100%", display: "grid", placeItems: "center", color: exercise.accent, fontSize: 28, fontWeight: 1000 }}>{exercise.icon}</div>
          )}
          <button
            type="button"
            aria-label={fav ? t("Retirer des favoris", "Remove favorite", "Quitar favorito") : t("Ajouter aux favoris", "Add favorite", "Añadir favorito")}
            onClick={(event) => { event.stopPropagation(); toggleFavorite(exercise.id); }}
            style={{ position: "absolute", right: 6, top: 6, width: 27, height: 27, borderRadius: 9, border: `1px solid ${fav ? exercise.accent + "88" : "rgba(255,255,255,.13)"}`, background: "rgba(5,8,13,.88)", color: fav ? exercise.accent : "rgba(255,255,255,.78)", display: "grid", placeItems: "center", cursor: "pointer" }}
          ><FitIcon name="favorite" size={13} /></button>
        </div>
        <div style={{ padding: "9px 9px 10px" }}>
          <div style={{ minHeight: 29, fontSize: 9.5, lineHeight: 1.16, fontWeight: 1000, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{exercise.name}</div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 5 }}>
            <DifficultyStars level={exercise.level} accent="#ffd869" size={9} />
            <span style={{ minWidth: 0, color: exercise.accent, fontSize: 6.6, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{FIT_MUSCLE_LABELS[exercise.muscle][langKey]}</span>
          </div>
        </div>
      </div>
    );
  };

  const filterChip = (label: string, active: boolean, onClick: () => void) => <button type="button" onClick={onClick} style={{ flex: "0 0 auto", minHeight: 30, borderRadius: 999, border: `1px solid ${active ? accent + "66" : "rgba(255,255,255,.065)"}`, background: active ? `${accent}24` : "rgba(255,255,255,.075)", color: active ? accent : "rgba(255,255,255,.68)", padding: "0 10px", fontSize: 7.6, fontWeight: 950, whiteSpace: "nowrap" }}>{label}</button>;

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
      ]} />

      {tab === "body" ? <>
        <FitSectionTitle
          eyebrow={t("ANATOMIE", "ANATOMY", "ANATOMÍA")}
          title={t("Quelle zone veux-tu travailler ?", "Which area do you want to train?", "¿Qué zona quieres trabajar?")}
          right={muscle !== "Tous" ? <button type="button" onClick={() => setMuscle("Tous")} aria-label={t("Effacer la sélection", "Clear selection", "Borrar selección")} style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", color: textSoft, display: "grid", placeItems: "center", cursor: "pointer", fontSize: 14 }}>×</button> : null}
        />
        <FitBodyMap selected={muscle} onSelect={selectBodyMuscle} lang={lang} />

        {muscle !== "Tous" ? (
          <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "10px 11px 10px 13px", borderRadius: 17, border: "1px solid rgba(255,255,255,.07)", background: "linear-gradient(135deg,rgba(255,61,98,.085),rgba(255,255,255,.025) 42%,rgba(255,255,255,.012))", boxShadow: "0 10px 24px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.025)" }}>
            <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 8, height: 34, flex: "0 0 8px", borderRadius: 999, background: "#ff3d62", boxShadow: "0 0 13px rgba(255,61,98,.42)" }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.05, fontWeight: 1000, letterSpacing: -.2, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{FIT_MUSCLE_LABELS[muscle][langKey]}</div>
                <div style={{ marginTop: 5, color: textSoft, fontSize: 8.1, fontWeight: 850 }}>{counts[muscle] || 0} {t("exercices", "exercises", "ejercicios")}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTab("library")}
              aria-label={`${t("Voir les exercices", "View exercises", "Ver ejercicios")} ${FIT_MUSCLE_LABELS[muscle][langKey]}`}
              title={t("Voir les exercices", "View exercises", "Ver ejercicios")}
              style={{ width: 54, height: 54, borderRadius: 16, border: `1px solid ${accent}68`, background: `linear-gradient(145deg,${accent}1b,rgba(255,255,255,.055))`, color: accent, boxShadow: `0 0 17px ${accent}1c, inset 0 0 0 1px ${accent}0d`, display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}
            >
              <span style={{ display: "grid", placeItems: "center" }}><FitIcon name="library" size={22} /></span>
              <span style={{ marginTop: -7, fontSize: 6.4, fontWeight: 1000, letterSpacing: .55 }}>{t("VOIR", "VIEW", "VER")}</span>
            </button>
          </div>
        ) : null}
      </> : null}

      {(tab === "library" || tab === "favorites") ? <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: 9, borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "linear-gradient(180deg,rgba(9,13,21,.97),rgba(7,10,17,.98))", boxShadow: "0 12px 30px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.035)" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 11, top: 11, color: "rgba(255,255,255,.74)" }}><FitIcon name="search" size={17} /></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Rechercher un exercice…", "Search an exercise…", "Buscar un ejercicio…")} style={{ width: "100%", minHeight: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(18,23,32,.96)", color: "#fff", padding: "0 11px 0 37px", boxSizing: "border-box", outline: "none", fontWeight: 800 }} />
          </div>
          <button type="button" onClick={() => setFiltersOpen(true)} aria-label={t("Filtres", "Filters", "Filtros")} style={{ minWidth: 94, height: 40, borderRadius: 12, border: `1px solid ${activeFilterCount ? accent + "70" : "rgba(255,255,255,.1)"}`, background: activeFilterCount ? `linear-gradient(135deg,${accent}25,rgba(18,23,32,.98))` : "rgba(18,23,32,.96)", color: activeFilterCount ? accent : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer", position: "relative" }}>
            <FitIcon name="filter" size={18} />
            <span style={{ fontSize: 8.2, fontWeight: 1000, letterSpacing: .6 }}>{t("FILTRES", "FILTERS", "FILTROS")}</span>
            {activeFilterCount ? <span style={{ position: "absolute", right: -5, top: -6, minWidth: 18, height: 18, borderRadius: 99, display: "grid", placeItems: "center", background: accent, color: "#071016", fontSize: 7.5, fontWeight: 1000 }}>{activeFilterCount}</span> : null}
          </button>
        </div>

        {filterSelections.length ? <div style={{ display: "flex", gap: 5, overflowX: "auto", margin: "7px 1px 0", paddingBottom: 1 }}>{filterSelections.map((item) => <button key={item.key} type="button" onClick={item.clear} title={t("Retirer ce filtre", "Remove filter", "Quitar filtro")} style={{ flex: "0 0 auto", minHeight: 25, borderRadius: 999, border: `1px solid ${accent}36`, background: "rgba(9,13,21,.93)", color: "rgba(255,255,255,.88)", padding: "0 8px", fontSize: 6.9, fontWeight: 950 }}>{item.label} <span style={{ color: accent, marginLeft: 3 }}>×</span></button>)}</div> : null}

        <div style={{ marginTop: 9, padding: 10, borderRadius: 20, border: "1px solid rgba(255,255,255,.09)", background: "linear-gradient(180deg,rgba(8,12,20,.98),rgba(6,9,15,.99))", boxShadow: "0 14px 34px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.035)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9 }}>
            <div><div style={{ color: "rgba(255,255,255,.46)", fontSize: 6.7, fontWeight: 1000, letterSpacing: .85 }}>{tab === "favorites" ? t("FAVORIS", "FAVORITES", "FAVORITOS") : t("RÉSULTATS", "RESULTS", "RESULTADOS")}</div><div style={{ marginTop: 2, fontSize: 15, fontWeight: 1000 }}>{filtered.length} {t("exercices", "exercises", "ejercicios")}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ color: accent, fontSize: 10.5, fontWeight: 1000 }}>{page + 1} / {pageCount}</div><div style={{ marginTop: 2, color: "rgba(255,255,255,.4)", fontSize: 6.4, fontWeight: 900 }}>{t("9 PAR PAGE", "9 PER PAGE", "9 POR PÁGINA")}</div></div>
          </div>

          {pagedExercises.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>{pagedExercises.map(renderExerciseTile)}</div> : <div style={{ padding: "32px 12px", textAlign: "center", color: textSoft, fontSize: 9 }}>{tab === "favorites" ? t("Aucun favori avec ces filtres.", "No favorites with these filters.", "No hay favoritos con estos filtros.") : t("Aucun exercice ne correspond à ces filtres.", "No exercise matches these filters.", "Ningún ejercicio coincide con estos filtros.")}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "40px 40px 1fr 40px 40px", gap: 6, alignItems: "center", marginTop: 11 }}>
            <button type="button" disabled={pageCount <= 1} onClick={() => setPage(0)} aria-label={t("Première page", "First page", "Primera página")} style={{ height: 36, borderRadius: 11, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.045)", color: "rgba(255,255,255,.8)", fontWeight: 1000, cursor: pageCount > 1 ? "pointer" : "default", opacity: pageCount > 1 ? 1 : .35 }}>«</button>
            <button type="button" disabled={pageCount <= 1} onClick={goPrevPage} aria-label={t("Page précédente", "Previous page", "Página anterior")} style={{ height: 36, borderRadius: 11, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.045)", color: "#fff", fontWeight: 1000, cursor: pageCount > 1 ? "pointer" : "default", opacity: pageCount > 1 ? 1 : .35 }}>‹</button>
            <div style={{ height: 36, borderRadius: 11, border: `1px solid ${accent}34`, background: `${accent}0d`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><span style={{ color: accent, fontSize: 8.5, fontWeight: 1000 }}>{t("PAGE", "PAGE", "PÁGINA")}</span><span style={{ fontSize: 11, fontWeight: 1000 }}>{page + 1}</span></div>
            <button type="button" disabled={pageCount <= 1} onClick={goNextPage} aria-label={t("Page suivante", "Next page", "Página siguiente")} style={{ height: 36, borderRadius: 11, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.045)", color: "#fff", fontWeight: 1000, cursor: pageCount > 1 ? "pointer" : "default", opacity: pageCount > 1 ? 1 : .35 }}>›</button>
            <button type="button" disabled={pageCount <= 1} onClick={() => setPage(pageCount - 1)} aria-label={t("Dernière page", "Last page", "Última página")} style={{ height: 36, borderRadius: 11, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.045)", color: "rgba(255,255,255,.8)", fontWeight: 1000, cursor: pageCount > 1 ? "pointer" : "default", opacity: pageCount > 1 ? 1 : .35 }}>»</button>
          </div>
        </div>
      </> : null}

      {filtersOpen ? <div role="dialog" aria-modal="true" onClick={() => setFiltersOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 132, background: "rgba(0,0,0,.66)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 14 }}>
        <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 500, borderRadius: 24, padding: 12, background: "linear-gradient(180deg,rgba(10,14,22,.995),rgba(7,10,17,.995))", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 28px 80px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}><div><div style={{ color: accent, fontSize: 7.4, fontWeight: 1000, letterSpacing: 1 }}>{t("BIBLIOTHÈQUE", "LIBRARY", "BIBLIOTECA")}</div><div style={{ marginTop: 3, fontSize: 18, fontWeight: 1000 }}>{t("Filtres", "Filters", "Filtros")}</div></div><button type="button" onClick={() => setFiltersOpen(false)} style={{ width: 36, height: 36, borderRadius: 11, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.045)", color: "#fff", fontSize: 17, cursor: "pointer" }}>×</button></div>

          <div style={{ marginTop: 10, minHeight: 40, padding: 7, borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.035)" }}>
            <div style={{ color: "rgba(255,255,255,.42)", fontSize: 6.5, fontWeight: 1000, letterSpacing: .8 }}>{t("FILTRES ACTIFS", "ACTIVE FILTERS", "FILTROS ACTIVOS")}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>{filterSelections.length ? filterSelections.map((item) => <button key={item.key} type="button" onClick={item.clear} style={{ minHeight: 25, borderRadius: 999, border: `1px solid ${accent}45`, background: `${accent}10`, color: "#fff", padding: "0 8px", fontSize: 7, fontWeight: 950 }}>{item.label} <span style={{ color: accent }}>×</span></button>) : <span style={{ color: textSoft, fontSize: 7.6 }}>{t("Aucun filtre sélectionné", "No filter selected", "Ningún filtro seleccionado")}</span>}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 9 }}>
            {([
              ["zone", t("Zone", "Area", "Zona"), "muscles"],
              ["equipment", t("Matériel", "Equipment", "Material"), "strength"],
              ["level", t("Niveau", "Level", "Nivel"), "star"],
            ] as [FilterTab, string, any][]).map(([id, label, icon]) => { const active = filterTab === id; return <button key={id} type="button" onClick={() => setFilterTab(id)} style={{ height: 58, borderRadius: 14, border: `1px solid ${active ? accent + "66" : "rgba(255,255,255,.09)"}`, background: active ? `linear-gradient(145deg,${accent}20,rgba(10,15,23,.99))` : "linear-gradient(180deg,rgba(18,23,31,.99),rgba(10,14,21,.99))", color: active ? accent : "rgba(255,255,255,.68)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 7, fontWeight: 1000, cursor: "pointer" }}><FitIcon name={icon} size={21} /><span>{label.toUpperCase()}</span></button>; })}
          </div>

          <div style={{ marginTop: 9, padding: 9, borderRadius: 15, border: "1px solid rgba(255,255,255,.09)", background: "linear-gradient(180deg,rgba(15,19,27,.995),rgba(9,12,18,.995))", maxHeight: "42vh", overflowY: "auto" }}>
            {filterTab === "zone" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
              <FilterChoiceTile label={t("Toutes", "All", "Todas")} active={muscle === "Tous"} onClick={() => setMuscle("Tous")}><MuscleFilterIcon muscle="Tous" active={muscle === "Tous"}/></FilterChoiceTile>
              {FIT_MUSCLE_ORDER.filter((item) => counts[item] > 0).map((item) => <FilterChoiceTile key={item} label={FIT_MUSCLE_LABELS[item][langKey]} active={muscle === item} onClick={() => setMuscle(item)}><MuscleFilterIcon muscle={item} active={muscle === item}/></FilterChoiceTile>)}
            </div> : null}
            {filterTab === "equipment" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
              {(["Tous", ...FIT_EQUIPMENT_ORDER.filter((item) => allExercises.some((exercise) => exercise.equipment === item))] as (FitEquipment | "Tous")[]).map((item) => <FilterChoiceTile key={item} label={item === "Tous" ? t("Tous", "All", "Todos") : item} active={equipment === item} onClick={() => setEquipment(item)}><EquipmentFilterIcon equipment={item} active={equipment === item}/></FilterChoiceTile>)}
            </div> : null}
            {filterTab === "level" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
              {(["Tous", "Débutant", "Intermédiaire", "Avancé"] as FitLevelFilter[]).map((item) => <FilterChoiceTile key={item} label={item === "Tous" ? t("Tous niveaux", "All levels", "Todos niveles") : levelLabel(item, t)} active={level === item} onClick={() => setLevel(item)}><LevelFilterIcon level={item} active={level === item}/></FilterChoiceTile>)}
            </div> : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 7, marginTop: 10 }}><button type="button" onClick={clearFilters} style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", color: "rgba(255,255,255,.72)", padding: "0 12px", fontWeight: 950 }}>{t("EFFACER", "CLEAR", "BORRAR")}</button><button type="button" onClick={() => setFiltersOpen(false)} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${accent}62`, background: `linear-gradient(135deg,${accent},#dffaff)`, color: "#071016", fontWeight: 1000 }}>{t("APPLIQUER · VOIR LES RÉSULTATS", "APPLY · VIEW RESULTS", "APLICAR · VER RESULTADOS")}</button></div>
        </div>
      </div> : null}

      {tab === "programs" ? <>
        <FitSectionTitle eyebrow={t("PROGRAMMES", "PROGRAMS", "PROGRAMAS")} title={t("Démarrage rapide", "Quick start", "Inicio rápido")} />
        <div style={{ display: "grid", gap: 8 }}>{FIT_TEMPLATES.map((program) => { const icon = program.id === "push" ? "push" : program.id === "pull" ? "pull" : program.id === "legs" ? "legs" : "fullbody"; return <FitGlassCard key={program.id} accent={program.accent} style={{ padding: 12, display: "grid", gridTemplateColumns: "50px 1fr 42px", gap: 11, alignItems: "center", background: `linear-gradient(135deg,${program.accent}12,rgba(8,11,18,.985) 30%,rgba(5,8,14,.995))`, borderColor: `${program.accent}42`, boxShadow: "0 12px 28px rgba(0,0,0,.46)" }}><div style={{ width: 48, height: 48, borderRadius: 15, display: "grid", placeItems: "center", color: program.accent, background: `${program.accent}10`, border: `1px solid ${program.accent}38` }}><FitIcon name={icon as any} size={27}/></div><div style={{ minWidth: 0 }}><div style={{ color: program.accent, fontSize: 12, fontWeight: 1000 }}>{program.name}</div><div style={{ marginTop: 4, color: "rgba(255,255,255,.72)", fontSize: 8.2, lineHeight: 1.35 }}>{program.exerciseIds.length} {t("exercices", "exercises", "ejercicios")} · {program.subtitle}</div></div><button type="button" aria-label={t("Démarrer", "Start", "Empezar")} onClick={() => go("games", { fitTemplateId: program.id })} style={{ width: 40, height: 40, borderRadius: 13, border: `1px solid ${program.accent}60`, background: `${program.accent}12`, color: program.accent, display: "grid", placeItems: "center" }}><FitIcon name="chevron" size={20} /></button></FitGlassCard>; })}</div>
      </> : null}

      {detail ? <div role="dialog" aria-modal="true" onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(2,4,8,.78)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 760, maxHeight: "90vh", overflowY: "auto", borderRadius: 28, padding: 14, background: `linear-gradient(180deg, rgba(8,11,18,.98), rgba(10,13,20,.98))`, border: `1px solid ${detail.accent}45`, boxShadow: `0 30px 90px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05), 0 0 30px ${detail.accent}12` }}>
          <div style={{ padding: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <FitPill accent={detail.accent}>{FIT_MUSCLE_LABELS[detail.muscle][langKey]}</FitPill>
                  <FitPill accent="#ffd869"><DifficultyStars level={detail.level} accent="#ffd869" size={11} /> {levelLabel(detail.level, t)}</FitPill>
                  <FitPill accent="#72def4">{detail.equipment}</FitPill>
                </div>
                <div style={{ marginTop: 10, fontSize: 24, lineHeight: 1.04, fontWeight: 1000, letterSpacing: -.6 }}>{detail.name}</div>
                <div style={{ marginTop: 6, color: textSoft, fontSize: 8.7 }}>{inferMovementPattern(detail)} · {inferGoalTags(detail).join(" · ") || t("Mouvement libre", "Open movement", "Movimiento libre")}</div>
              </div>
              <button type="button" onClick={() => setDetail(null)} style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
              <FitMetric label={t("Difficulté", "Difficulty", "Dificultad")} value={<DifficultyStars level={detail.level} accent="#ffd869" size={14} />} sub={levelLabel(detail.level, t)} accent="#ffd869" />
              <FitMetric label={t("Record perso", "Personal record", "Récord personal")} value={detailRecord ? `${formatKg(detailRecord.weightKg)} × ${detailRecord.reps}` : "—"} sub={detailRecord ? `1RM ${formatKg(detailRecord.oneRm)}` : t("Aucun record enregistré", "No record logged", "Sin récord registrado")} accent="#7df29a" />
              <FitMetric label={t("Type", "Type", "Tipo")} value={inferMovementPattern(detail)} sub={detail.equipment} accent={detail.accent} />
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 22, background: `linear-gradient(180deg, ${detail.accent}09, rgba(255,255,255,.015))`, border: `1px solid ${detail.accent}26` }}>
              <div style={{ marginBottom: 7, color: detail.accent, fontSize: 7.3, fontWeight: 1000, letterSpacing: .9 }}>AWENA COACH · GUIDE MOUVEMENT</div>
              <FitExerciseMotion exercise={detail} />
              {detailImages.length ? <>
                <div style={{ marginTop: 10, color: "rgba(255,255,255,.7)", fontSize: 7.2, fontWeight: 1000, letterSpacing: .8 }}>{t("PHOTOS REPÈRES", "REFERENCE PHOTOS", "FOTOS DE REFERENCIA")}</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 7, paddingBottom: 2 }}>
                  {detailImages.map((url, index) => <img key={`${detail.id}-${index}`} src={url} alt={`${detail.name} ${index + 1}`} style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 14, border: `1px solid ${detail.accent}26`, background: "rgba(255,255,255,.03)" }} />)}
                </div>
              </> : null}
            </div>

            <FitSectionTitle eyebrow={t("MUSCLES", "MUSCLES", "MÚSCULOS")} title={t("Zones sollicitées", "Muscles involved", "Zonas implicadas")} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><FitPill accent={FIT_MUSCLE_COLORS[detail.muscle]}>{t("PRINCIPAL", "PRIMARY", "PRINCIPAL")} · {FIT_MUSCLE_LABELS[detail.muscle][langKey]}</FitPill>{(detail.secondary || []).map((item) => <FitPill key={item} accent={FIT_MUSCLE_COLORS[item]} muted>{FIT_MUSCLE_LABELS[item][langKey]}</FitPill>)}</div>

            <FitSectionTitle eyebrow={t("OBJECTIF", "GOAL", "OBJETIVO")} title={t("Type de travail", "Training focus", "Tipo de trabajo")} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{inferGoalTags(detail).map((item) => <FitPill key={item} accent={detail.accent}>{item}</FitPill>)}<FitPill muted>{inferMovementPattern(detail)}</FitPill></div>

            <FitSectionTitle eyebrow={t("EXÉCUTION", "EXECUTION", "EJECUCIÓN")} title={t("Consignes techniques", "Technique instructions", "Instrucciones técnicas")} />
            {detail.instructions?.length ? <FitGlassCard accent={detail.accent} style={{ padding: 13, borderRadius: 18, background: `linear-gradient(180deg, ${detail.accent}09, rgba(255,255,255,.015))` }}><ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, color: "rgba(255,255,255,.86)", fontSize: 8.8, lineHeight: 1.5 }}>{detail.instructions.slice(0, 8).map((instruction, index) => <li key={index}>{instruction}</li>)}</ol></FitGlassCard> : <FitGlassCard accent={detail.accent} style={{ padding: 12, color: textSoft, fontSize: 8.5 }}>{t("La fiche technique AWENA détaillée sera ajoutée à ce mouvement.", "The detailed AWENA technique guide will be added to this movement.", "La guía técnica detallada de AWENA se añadirá a este movimiento.")}</FitGlassCard>}

            {(detail.tips?.length || detail.commonMistakes?.length) ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
              <FitGlassCard accent="#7df29a" style={{ padding: 12, borderRadius: 18, background: "linear-gradient(180deg,rgba(125,242,154,.08),rgba(255,255,255,.015))" }}>
                <div style={{ color: "#7df29a", fontSize: 7.1, fontWeight: 1000, letterSpacing: .9 }}>{t("À RETENIR", "KEY TIPS", "CLAVES")}</div>
                <ul style={{ margin: "8px 0 0", paddingLeft: 16, display: "grid", gap: 7, fontSize: 8.4, lineHeight: 1.45, color: "rgba(255,255,255,.84)" }}>{(detail.tips || []).slice(0, 4).map((item, index) => <li key={index}>{item}</li>)}</ul>
              </FitGlassCard>
              <FitGlassCard accent="#ff8c8c" style={{ padding: 12, borderRadius: 18, background: "linear-gradient(180deg,rgba(255,140,140,.08),rgba(255,255,255,.015))" }}>
                <div style={{ color: "#ff8c8c", fontSize: 7.1, fontWeight: 1000, letterSpacing: .9 }}>{t("ERREURS À ÉVITER", "COMMON MISTAKES", "ERRORES A EVITAR")}</div>
                <ul style={{ margin: "8px 0 0", paddingLeft: 16, display: "grid", gap: 7, fontSize: 8.4, lineHeight: 1.45, color: "rgba(255,255,255,.84)" }}>{(detail.commonMistakes || []).slice(0, 4).map((item, index) => <li key={index}>{item}</li>)}</ul>
              </FitGlassCard>
            </div> : null}

            <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 8, marginTop: 14 }}><button type="button" aria-label={t("Favori", "Favorite", "Favorito")} onClick={() => toggleFavorite(detail.id)} style={{ borderRadius: 15, border: `1px solid ${favorites.includes(detail.id) ? detail.accent + "55" : "rgba(255,255,255,.075)"}`, background: favorites.includes(detail.id) ? `${detail.accent}10` : "rgba(255,255,255,.03)", color: favorites.includes(detail.id) ? detail.accent : textSoft, display: "grid", placeItems: "center", minHeight: 50 }}><FitIcon name="favorite" size={19} /></button><FitPrimaryButton accent={detail.accent} onClick={() => go("games", { fitTemplateId: "free", fitExerciseId: detail.id })} style={{ minHeight: 50, fontSize: 16 }}>{t("＋ AJOUTER À MA SÉANCE", "+ ADD TO MY WORKOUT", "+ AÑADIR A MI SESIÓN")}</FitPrimaryButton></div>
          </div>
        </div>
      </div> : null}
    </FitShell>
  </div>;
}
