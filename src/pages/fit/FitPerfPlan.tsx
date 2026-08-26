import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { FIT_EXERCISES, FIT_TEMPLATES, type FitExercise } from "../../fit/fitStore";
import { getCachedFreeExerciseCatalog, loadFreeExerciseCatalog } from "../../fit/freeExerciseCatalog";
import FitExerciseMotion from "./FitExerciseMotion";
import { FitGlassCard, FitIcon, FitIconTabs, FitPageHeader, FitPill, FitPrimaryButton, FitSectionTitle, FitShell, fitUiCss } from "./FitPerfUi";

type Props = { go: (route: any, params?: any) => void };
type Tab = "library" | "muscles" | "favorites" | "programs" | "guides";
const FAVORITES_KEY = "mss-fit-perf-favorite-exercises-v1";

function readFavorites(): string[] {
  try { const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); return Array.isArray(raw) ? raw.map(String) : []; } catch { return []; }
}
function saveFavorites(ids: string[]) { try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); } catch {} }

export default function FitPerfPlan({ go }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";
  const [tab, setTab] = React.useState<Tab>("library");
  const [search, setSearch] = React.useState("");
  const [muscle, setMuscle] = React.useState("Tous");
  const [selected, setSelected] = React.useState<FitExercise | null>(FIT_EXERCISES[0] || null);
  const [favorites, setFavorites] = React.useState<string[]>(readFavorites);
  const [freeExercises, setFreeExercises] = React.useState<FitExercise[]>(() => getCachedFreeExerciseCatalog());
  const [catalogStatus, setCatalogStatus] = React.useState<"idle" | "loading" | "ready" | "error">(() => getCachedFreeExerciseCatalog().length ? "ready" : "idle");
  const [catalogError, setCatalogError] = React.useState("");

  const allExercises = React.useMemo(() => [...FIT_EXERCISES, ...freeExercises], [freeExercises]);

  const activateFreeCatalog = async (force = false) => {
    if (catalogStatus === "loading") return;
    setCatalogStatus("loading");
    setCatalogError("");
    try {
      const loaded = await loadFreeExerciseCatalog(force);
      setFreeExercises(loaded);
      setCatalogStatus("ready");
    } catch (error) {
      setCatalogStatus("error");
      setCatalogError(error instanceof Error ? error.message : String(error));
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      saveFavorites(next);
      return next;
    });
  };

  const filtered = allExercises.filter((exercise) => {
    const q = search.trim().toLowerCase();
    const matchesQ = !q || `${exercise.name} ${exercise.muscle} ${exercise.equipment}`.toLowerCase().includes(q);
    const matchesMuscle = muscle === "Tous" || exercise.muscle === muscle;
    const matchesFav = tab !== "favorites" || favorites.includes(exercise.id);
    return matchesQ && matchesMuscle && matchesFav;
  });
  const visibleFiltered = filtered.slice(0, search.trim() ? 90 : 60);
  const hiddenCount = Math.max(0, filtered.length - visibleFiltered.length);
  const muscles = ["Tous", ...Array.from(new Set(allExercises.map((e) => e.muscle)))];
  const selectGuide = (exercise: FitExercise) => { setSelected(exercise); setTab("guides"); };

  return <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
    <FitShell>
      <style>{fitUiCss}</style>
      <FitPageHeader eyebrow="FIT PERF" title={t("EXERCICES", "EXERCISES", "EJERCICIOS")} accent={accent}>
        <div style={{ color: textSoft, fontSize: 8.4 }}>{t("Bibliothèque, programmes et mouvements AWENA.", "Library, programs and AWENA movements.", "Biblioteca, programas y movimientos AWENA.")}</div>
      </FitPageHeader>

      <FitIconTabs<Tab> value={tab} onChange={setTab} accent={accent} items={[
        { id: "library", label: t("Bibliothèque", "Library", "Biblioteca"), icon: "library" },
        { id: "muscles", label: t("Muscles", "Muscles", "Músculos"), icon: "muscles" },
        { id: "favorites", label: t("Favoris", "Favorites", "Favoritos"), icon: "favorite", badge: favorites.length || undefined },
        { id: "programs", label: t("Programmes", "Programs", "Programas"), icon: "program" },
        { id: "guides", label: t("Guides", "Guides", "Guías"), icon: "guide" },
      ]}/>

      {(tab === "library" || tab === "muscles" || tab === "favorites") ? <>
        <FitGlassCard accent={accent} style={{ padding: 8 }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: 10, color: textSoft }}><FitIcon name="search" size={17}/></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Rechercher…", "Search…", "Buscar…")} style={{ width: "100%", minHeight: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.028)", color: "#fff", padding: "0 10px 0 35px", boxSizing: "border-box", outline: "none" }}/>
          </div>
          {(tab === "muscles" || muscle !== "Tous") ? <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 7, paddingBottom: 1 }}>{muscles.map((item) => <button key={item} type="button" onClick={() => setMuscle(item)} style={{ flex: "0 0 auto", minHeight: 28, borderRadius: 999, border: `1px solid ${muscle === item ? accent + "62" : "rgba(255,255,255,.055)"}`, background: muscle === item ? `${accent}10` : "transparent", color: muscle === item ? accent : "rgba(255,255,255,.62)", padding: "0 9px", fontSize: 7.8, fontWeight: 950 }}>{item}</button>)}</div> : <button type="button" onClick={() => setTab("muscles")} style={{ marginTop: 6, border: 0, background: "transparent", color: textSoft, fontSize: 8, fontWeight: 900, padding: "2px 3px" }}>{t("Filtrer par muscle", "Filter by muscle", "Filtrar por músculo")} ›</button>}
        </FitGlassCard>

        <FitGlassCard accent="#72def4" style={{ marginTop: 7, padding: 9 }}>
          <div style={{ display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 8, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", color: "#72def4", background: "rgba(114,222,244,.08)", border: "1px solid rgba(114,222,244,.24)", fontSize: 15, fontWeight: 1000 }}>∞</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5 }}><span style={{ color: "#72def4", fontSize: 8, fontWeight: 1000, letterSpacing: .7 }}>OPEN EXERCISE DB</span><FitPill accent="#72def4">0 €</FitPill></div>
              <div style={{ marginTop: 2, color: textSoft, fontSize: 7.5 }}>{freeExercises.length ? `${freeExercises.length} ${t("exercices libres chargés", "open exercises loaded", "ejercicios libres cargados")}` : t("800+ exercices publics · images · muscles · consignes", "800+ public exercises · images · muscles · instructions", "800+ ejercicios públicos · imágenes · músculos · instrucciones")}</div>
            </div>
            <button type="button" disabled={catalogStatus === "loading"} onClick={() => void activateFreeCatalog(catalogStatus === "ready")} style={{ minHeight: 32, borderRadius: 10, border: "1px solid rgba(114,222,244,.34)", background: "rgba(114,222,244,.08)", color: "#72def4", padding: "0 9px", fontSize: 7, fontWeight: 1000, whiteSpace: "nowrap", opacity: catalogStatus === "loading" ? .55 : 1 }}>{catalogStatus === "loading" ? t("CHARGEMENT…", "LOADING…", "CARGANDO…") : freeExercises.length ? t("ACTUALISER", "REFRESH", "ACTUALIZAR") : t("ACTIVER", "ENABLE", "ACTIVAR")}</button>
          </div>
          {catalogStatus === "error" ? <div style={{ marginTop: 6, color: "#ff8b8b", fontSize: 7.2 }}>{t("Impossible de charger la bibliothèque. Les exercices FIT PERF actuels restent disponibles.", "Unable to load the library. Existing FIT PERF exercises remain available.", "No se puede cargar la biblioteca. Los ejercicios FIT PERF actuales siguen disponibles.")} {catalogError}</div> : null}
        </FitGlassCard>

        <FitSectionTitle eyebrow={tab === "favorites" ? t("FAVORIS", "FAVORITES", "FAVORITOS") : t("LISTE", "LIST", "LISTA")} title={`${filtered.length} ${t("exercices", "exercises", "ejercicios")}`}/>
        <div style={{ display: "grid", gap: 6 }}>
          {visibleFiltered.map((exercise) => {
            const active = selected?.id === exercise.id;
            const fav = favorites.includes(exercise.id);
            return <FitGlassCard key={exercise.id} accent={exercise.accent} style={{ overflow: "hidden", borderColor: active ? `${exercise.accent}55` : undefined }}>
              <div role="button" tabIndex={0} onClick={() => setSelected(active ? null : exercise)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(active ? null : exercise); }} style={{ width: "100%", display: "grid", gridTemplateColumns: "38px 1fr auto auto", gap: 8, alignItems: "center", padding: 9, color: "#fff", cursor: "pointer", boxSizing: "border-box" }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, display: "grid", placeItems: "center", color: exercise.accent, background: `${exercise.accent}10`, border: `1px solid ${exercise.accent}2e`, fontSize: 16, fontWeight: 1000 }}>{exercise.icon}</div>
                <div style={{ minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}><div style={{ fontSize: 10.8, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.name}</div>{exercise.source === "free-exercise-db" ? <span style={{ flex: "0 0 auto", color: "#72def4", fontSize: 5.8, fontWeight: 1000, letterSpacing: .5, border: "1px solid rgba(114,222,244,.28)", borderRadius: 999, padding: "2px 4px" }}>OPEN</span> : null}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exercise.muscle} · {exercise.equipment}{exercise.level ? ` · ${exercise.level}` : ""}</div></div>
                <button type="button" aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={(event) => { event.stopPropagation(); toggleFavorite(exercise.id); }} style={{ width: 31, height: 31, borderRadius: 10, display: "grid", placeItems: "center", border: `1px solid ${fav ? exercise.accent + "55" : "rgba(255,255,255,.055)"}`, background: fav ? `${exercise.accent}10` : "transparent", color: fav ? exercise.accent : textSoft }}><FitIcon name="favorite" size={15}/></button>
                <span style={{ color: active ? exercise.accent : textSoft, transform: active ? "rotate(90deg)" : "none", transition: "transform .18s ease", display: "grid" }}><FitIcon name="chevron" size={16}/></span>
              </div>
              {active ? <div style={{ padding: "0 9px 9px", animation: "fitTabLabelIn .18s ease both" }}>
                <FitExerciseMotion exercise={exercise} compact/>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 42px", gap: 7, marginTop: 7 }}>
                  <FitPrimaryButton accent={exercise.accent} onClick={() => go("games", { fitTemplateId: "free", fitExerciseId: exercise.id })} style={{ minHeight: 38, fontSize: 8.8 }}>{t("AJOUTER À LA SÉANCE", "ADD TO WORKOUT", "AÑADIR A SESIÓN")}</FitPrimaryButton>
                  <button type="button" aria-label={t("Guide", "Guide", "Guía")} onClick={() => selectGuide(exercise)} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.075)", background: "rgba(255,255,255,.03)", color: exercise.accent, display: "grid", placeItems: "center" }}><FitIcon name="guide" size={18}/></button>
                </div>
              </div> : null}
            </FitGlassCard>;
          })}
          {hiddenCount > 0 ? <FitGlassCard accent={accent} style={{ padding: 10, textAlign: "center", color: textSoft, fontSize: 7.8 }}>{hiddenCount} {t("autres résultats · utilise la recherche pour affiner", "more results · use search to narrow down", "resultados más · usa la búsqueda para afinar")}</FitGlassCard> : null}
          {!filtered.length ? <FitGlassCard accent={accent} style={{ padding: 20, textAlign: "center", color: textSoft }}>{tab === "favorites" ? t("Aucun favori.", "No favorites yet.", "Sin favoritos.") : t("Aucun résultat.", "No result.", "Sin resultados.")}</FitGlassCard> : null}
        </div>
      </> : null}

      {tab === "programs" ? <>
        <FitSectionTitle eyebrow={t("PROGRAMMES", "PROGRAMS", "PROGRAMAS")} title={t("Démarrage rapide", "Quick start", "Inicio rápido")}/>
        <div style={{ display: "grid", gap: 6 }}>{FIT_TEMPLATES.map((program) => <FitGlassCard key={program.id} accent={program.accent} style={{ padding: 9, display: "grid", gridTemplateColumns: "38px 1fr 38px", gap: 8, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, display: "grid", placeItems: "center", color: program.accent, background: `${program.accent}10`, border: `1px solid ${program.accent}30`, fontWeight: 1000 }}>{program.icon}</div>
          <div style={{ minWidth: 0 }}><div style={{ color: program.accent, fontSize: 11, fontWeight: 1000 }}>{program.name}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.8 }}>{program.exerciseIds.length} {t("exercices", "exercises", "ejercicios")} · {program.subtitle}</div></div>
          <button type="button" aria-label={t("Démarrer", "Start", "Empezar")} onClick={() => go("games", { fitTemplateId: program.id })} style={{ width: 36, height: 36, borderRadius: 11, border: `1px solid ${program.accent}50`, background: `${program.accent}10`, color: program.accent, display: "grid", placeItems: "center" }}><FitIcon name="chevron" size={18}/></button>
        </FitGlassCard>)}</div>
      </> : null}

      {tab === "guides" ? <>
        <FitGlassCard accent="#72def4" style={{ padding: 9, display: "grid", gridTemplateColumns: "36px 1fr", gap: 8, alignItems: "center" }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", color: "#72def4", background: "rgba(114,222,244,.08)", border: "1px solid rgba(114,222,244,.24)" }}><FitIcon name="coach" size={18}/></div>
          <div><div style={{ fontSize: 10.5, fontWeight: 1000 }}>AWENA COACH</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.8 }}>{t("Un mouvement à la fois, en boucle visuelle.", "One movement at a time, in a visual loop.", "Un movimiento a la vez, en bucle visual.")}</div></div>
        </FitGlassCard>
        <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 8, paddingBottom: 2 }}>{FIT_EXERCISES.map((exercise) => <button key={exercise.id} type="button" onClick={() => setSelected(exercise)} title={exercise.name} style={{ flex: "0 0 38px", width: 38, height: 38, borderRadius: 11, border: `1px solid ${selected?.id === exercise.id ? exercise.accent + "60" : "rgba(255,255,255,.055)"}`, background: selected?.id === exercise.id ? `${exercise.accent}10` : "rgba(255,255,255,.02)", color: selected?.id === exercise.id ? exercise.accent : textSoft, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 1000 }}>{exercise.icon}</button>)}</div>
        {selected ? <div style={{ marginTop: 8 }}><FitExerciseMotion exercise={selected}/><FitGlassCard accent={selected.accent} style={{ marginTop: 7, padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={{ color: selected.accent, fontSize: 8, fontWeight: 1000 }}>{selected.muscle.toUpperCase()}</div><div style={{ marginTop: 2, fontSize: 11.5, fontWeight: 1000 }}>{selected.name}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8 }}>{selected.equipment}{selected.level ? ` · ${selected.level}` : ""}</div>{selected.instructions?.length ? <div style={{ marginTop: 6, color: "rgba(255,255,255,.62)", fontSize: 7.4, lineHeight: 1.35 }}>{selected.instructions[0]}</div> : null}</div><FitPill accent={selected.source === "free-exercise-db" ? "#72def4" : selected.accent}>{selected.source === "free-exercise-db" ? "OPEN" : "AWENA"}</FitPill></div></FitGlassCard></div> : null}
      </> : null}
    </FitShell>
  </div>;
}
