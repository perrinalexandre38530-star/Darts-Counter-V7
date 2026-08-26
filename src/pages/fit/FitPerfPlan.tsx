import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { FIT_EXERCISES, FIT_TEMPLATES, type FitExercise } from "../../fit/fitStore";
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

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      saveFavorites(next);
      return next;
    });
  };

  const filtered = FIT_EXERCISES.filter((exercise) => {
    const q = search.trim().toLowerCase();
    const matchesQ = !q || `${exercise.name} ${exercise.muscle} ${exercise.equipment}`.toLowerCase().includes(q);
    const matchesMuscle = muscle === "Tous" || exercise.muscle === muscle;
    const matchesFav = tab !== "favorites" || favorites.includes(exercise.id);
    return matchesQ && matchesMuscle && matchesFav;
  });
  const muscles = ["Tous", ...Array.from(new Set(FIT_EXERCISES.map((e) => e.muscle)))];

  return <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
    <FitShell>
      <style>{fitUiCss}</style>
      <FitPageHeader eyebrow="FIT PERF" title={t("EXERCICES", "EXERCISES", "EJERCICIOS")} accent={accent}>
        <div style={{ marginTop: 8, color: textSoft, fontSize: 10, textAlign: "center" }}>{t("Bibliothèque · programmes · guides · AWENA COACH", "Library · programs · guides · AWENA COACH", "Biblioteca · programas · guías · AWENA COACH")}</div>
      </FitPageHeader>

      <FitIconTabs<Tab> value={tab} onChange={setTab} accent={accent} items={[
        { id: "library", label: t("Bibliothèque", "Library", "Biblioteca"), icon: "library" },
        { id: "muscles", label: t("Muscles", "Muscles", "Músculos"), icon: "muscles" },
        { id: "favorites", label: t("Favoris", "Favorites", "Favoritos"), icon: "favorite", badge: favorites.length || undefined },
        { id: "programs", label: t("Programmes", "Programs", "Programas"), icon: "program" },
        { id: "guides", label: t("Guides", "Guides", "Guías"), icon: "guide" },
      ]}/>

      {(tab === "library" || tab === "muscles" || tab === "favorites") ? <>
        <FitGlassCard accent={accent} style={{ padding: 10 }}>
          <div style={{ position: "relative" }}><span style={{ position: "absolute", left: 11, top: 11, color: textSoft }}><FitIcon name="search" size={18}/></span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Rechercher un exercice, muscle, matériel…", "Search exercise, muscle, equipment…", "Buscar ejercicio, músculo, material…")} style={{ width: "100%", minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.075)", background: "rgba(255,255,255,.035)", color: "#fff", padding: "0 12px 0 38px", boxSizing: "border-box", outline: "none" }}/></div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 8, paddingBottom: 2 }}>{muscles.map((item) => <button key={item} type="button" onClick={() => setMuscle(item)} style={{ flex: "0 0 auto", minHeight: 31, borderRadius: 999, border: `1px solid ${muscle === item ? accent + "77" : "rgba(255,255,255,.07)"}`, background: muscle === item ? `${accent}14` : "rgba(255,255,255,.02)", color: muscle === item ? accent : "rgba(255,255,255,.7)", padding: "0 10px", fontSize: 8.5, fontWeight: 900 }}>{item}</button>)}</div>
        </FitGlassCard>

        {selected && filtered.some((e) => e.id === selected.id) ? <div style={{ marginTop: 10 }}><FitExerciseMotion exercise={selected}/></div> : null}

        <FitSectionTitle eyebrow={t("BIBLIOTHÈQUE FIT PERF", "FIT PERF LIBRARY", "BIBLIOTECA FIT PERF")} title={`${filtered.length} ${t("exercices", "exercises", "ejercicios")}`} right={<FitPill accent="#72def4">AWENA COACH</FitPill>}/>
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map((exercise) => {
            const active = selected?.id === exercise.id;
            const fav = favorites.includes(exercise.id);
            return <FitGlassCard key={exercise.id} accent={exercise.accent} style={{ overflow: "hidden", borderColor: active ? `${exercise.accent}66` : undefined }}>
              <div role="button" tabIndex={0} onClick={() => setSelected(exercise)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(exercise); }} style={{ width: "100%", display: "grid", gridTemplateColumns: "45px 1fr auto", gap: 10, alignItems: "center", padding: 11, border: 0, background: "transparent", color: "#fff", textAlign: "left", cursor: "pointer", boxSizing: "border-box" }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", color: exercise.accent, background: `${exercise.accent}12`, border: `1px solid ${exercise.accent}36`, fontSize: 19, fontWeight: 1000 }}>{exercise.icon}</div>
                <div style={{ minWidth: 0 }}><div style={{ color: exercise.accent, fontSize: 8, fontWeight: 1000, letterSpacing: .8 }}>{exercise.muscle.toUpperCase()}</div><div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 950 }}>{exercise.name}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 8.5 }}>{exercise.equipment}{exercise.secondary?.length ? ` · ${exercise.secondary.join(" · ")}` : ""}</div></div>
                <button type="button" aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={(event) => { event.stopPropagation(); toggleFavorite(exercise.id); }} style={{ width: 35, height: 35, borderRadius: 11, display: "grid", placeItems: "center", border: `1px solid ${fav ? exercise.accent + "66" : "rgba(255,255,255,.07)"}`, background: fav ? `${exercise.accent}12` : "rgba(255,255,255,.025)", color: fav ? exercise.accent : textSoft }}><FitIcon name="favorite" size={17}/></button>
              </div>
              {active ? <div style={{ padding: "0 11px 11px" }}><FitExerciseMotion exercise={exercise} compact/><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 8 }}><FitPrimaryButton accent={exercise.accent} onClick={() => go("games", { fitTemplateId: "free", fitExerciseId: exercise.id })} style={{ minHeight: 40, fontSize: 9.5 }}>{t("AJOUTER À UNE SÉANCE", "ADD TO WORKOUT", "AÑADIR A SESIÓN")}</FitPrimaryButton><button type="button" onClick={() => setTab("guides")} style={{ minHeight: 40, borderRadius: 13, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", color: "#fff", fontWeight: 900, fontSize: 9.5 }}>{t("VOIR LE GUIDE", "VIEW GUIDE", "VER GUÍA")}</button></div></div> : null}
            </FitGlassCard>;
          })}
          {!filtered.length ? <FitGlassCard accent={accent} style={{ padding: 24, textAlign: "center", color: textSoft }}>{tab === "favorites" ? t("Aucun exercice favori pour le moment.", "No favorite exercise yet.", "Aún no hay ejercicios favoritos.") : t("Aucun exercice ne correspond à ta recherche.", "No exercise matches your search.", "Ningún ejercicio coincide con tu búsqueda.")}</FitGlassCard> : null}
        </div>
      </> : null}

      {tab === "programs" ? <>
        <FitSectionTitle eyebrow={t("PROGRAMMES", "PROGRAMS", "PROGRAMAS")} title={t("Choisis une structure de séance", "Choose a workout structure", "Elige una estructura")}/>
        <div style={{ display: "grid", gap: 9 }}>{FIT_TEMPLATES.map((program) => <FitGlassCard key={program.id} accent={program.accent} style={{ padding: 13 }}><div style={{ display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 10, alignItems: "center" }}><div style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", color: program.accent, background: `${program.accent}12`, border: `1px solid ${program.accent}38`, fontWeight: 1000 }}>{program.icon}</div><div><div style={{ color: program.accent, fontSize: 13, fontWeight: 1000 }}>{program.name}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 9 }}>{program.subtitle}</div><div style={{ marginTop: 5, color: "rgba(255,255,255,.65)", fontSize: 8.5 }}>{program.exerciseIds.length} {t("exercices", "exercises", "ejercicios")}</div></div><button type="button" onClick={() => go("games", { fitTemplateId: program.id })} style={{ width: 42, height: 42, borderRadius: 13, border: `1px solid ${program.accent}66`, background: `${program.accent}12`, color: program.accent, cursor: "pointer" }}>▶</button></div></FitGlassCard>)}</div>
      </> : null}

      {tab === "guides" ? <>
        <FitSectionTitle eyebrow="AWENA COACH" title={t("Guides d’exécution", "Execution guides", "Guías de ejecución")}/>
        <FitGlassCard accent="#72def4" style={{ padding: 14 }}><div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 10, alignItems: "center" }}><div style={{ width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", color: "#72def4", background: "rgba(114,222,244,.10)", border: "1px solid rgba(114,222,244,.30)" }}><FitIcon name="coach" size={24}/></div><div><div style={{ fontSize: 12, fontWeight: 1000 }}>{t("Animations AWENA prêtes à être branchées", "AWENA animations ready to plug in", "Animaciones AWENA listas para integrar")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 9, lineHeight: 1.45 }}>{t("Chaque exercice cherche automatiquement son WebP animé dans /public/fit/motions/awena/. Tant que le fichier n’existe pas, un fallback Awena s’affiche sans casser la page.", "Each exercise automatically loads its animated WebP from /public/fit/motions/awena/. Until the file exists, an Awena fallback is shown without breaking the page.", "Cada ejercicio carga automáticamente su WebP animado desde /public/fit/motions/awena/. Mientras no exista, se muestra un fallback de Awena sin romper la página.")}</div></div></div></FitGlassCard>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{FIT_EXERCISES.slice(0, 10).map((exercise) => <FitGlassCard key={exercise.id} accent={exercise.accent} style={{ padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div><div style={{ color: exercise.accent, fontSize: 8, fontWeight: 1000 }}>{exercise.muscle.toUpperCase()}</div><div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 950 }}>{exercise.name}</div></div><FitPill accent={exercise.accent}>{t("DÉMO", "DEMO", "DEMO")}</FitPill></div><div style={{ marginTop: 8 }}><FitExerciseMotion exercise={exercise} compact/></div></FitGlassCard>)}</div>
      </> : null}
    </FitShell>
  </div>;
}
