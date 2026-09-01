import React from "react";
import {
  FIT_GOALS,
  FIT_PRACTICES,
  type FitPracticeId,
  type FitProgramDefinition,
  type FitProgramGoal,
  type FitProgramLevel,
} from "../../fit/fitProgramCatalog";
import {
  DEFAULT_FIT_USER_PREFERENCES,
  loadFitUserPreferences,
  recommendFitPrograms,
  saveFitUserPreferences,
  type FitEquipmentPreset,
  type FitUserPreferences,
} from "../../fit/fitUserPreferences";
import { FitIcon, FitPill, FitPrimaryButton, FitSectionTitle } from "./FitPerfUi";

type T = (fr: string, en: string, es: string) => string;
type DurationFilter = "all" | "short" | "medium" | "long";

type Props = {
  programs: FitProgramDefinition[];
  activeProgramId?: string;
  accent: string;
  textSoft: string;
  t: T;
  onOpen: (program: FitProgramDefinition) => void;
  onActivate: (programId: string) => void;
};

const PRACTICE_COPY: Partial<Record<FitPracticeId, [string, string, string]>> = {
  musculation: ["Muscle · force · salle", "Muscle · strength · gym", "Músculo · fuerza · gimnasio"],
  calisthenics: ["Poids du corps · skills", "Bodyweight · skills", "Peso corporal · skills"],
  hiit: ["Intense · court · cardio", "Intense · short · cardio", "Intenso · corto · cardio"],
  military: ["Bootcamp · condition", "Bootcamp · conditioning", "Bootcamp · condición"],
  yoga: ["Mobilité · équilibre", "Mobility · balance", "Movilidad · equilibrio"],
  mobility: ["Bouger mieux · récupérer", "Move better · recover", "Moverte mejor · recuperar"],
  stretching: ["Souplesse · récupération", "Flexibility · recovery", "Flexibilidad · recuperación"],
  functional: ["Force · cardio · puissance", "Strength · cardio · power", "Fuerza · cardio · potencia"],
  cardio: ["Endurance · condition", "Endurance · conditioning", "Resistencia · condición"],
  powerlifting: ["Squat · bench · deadlift", "Squat · bench · deadlift", "Sentadilla · banca · peso muerto"],
  core: ["Gainage · posture · Pilates", "Core · posture · Pilates", "Core · postura · Pilates"],
};

function levelLabel(level: FitProgramLevel, t: T) {
  if (level === "beginner") return t("Débutant", "Beginner", "Principiante");
  if (level === "advanced") return t("Avancé", "Advanced", "Avanzado");
  return t("Intermédiaire", "Intermediate", "Intermedio");
}

function presetLabel(preset: FitEquipmentPreset, t: T) {
  if (preset === "gym") return t("Salle complète", "Full gym", "Gimnasio completo");
  if (preset === "home") return t("Maison équipée", "Equipped home", "Casa equipada");
  return t("Poids du corps", "Bodyweight", "Peso corporal");
}

function reasonLabel(reason: string, t: T) {
  if (reason === "objectif") return t("Ton objectif", "Your goal", "Tu objetivo");
  if (reason === "niveau") return t("Ton niveau", "Your level", "Tu nivel");
  if (reason === "durée") return t("Ton temps", "Your time", "Tu tiempo");
  if (reason === "rythme") return t("Ton rythme", "Your rhythm", "Tu ritmo");
  return t("Ton matériel", "Your equipment", "Tu material");
}

function ProgramCard({ program, active, recommended, rank, t, textSoft, onOpen, onActivate }: {
  program: FitProgramDefinition;
  active: boolean;
  recommended?: number;
  rank?: number;
  t: T;
  textSoft: string;
  onOpen: () => void;
  onActivate: () => void;
}) {
  const practice = FIT_PRACTICES.find((item) => item.id === program.practice);
  return <article style={{ position: "relative", overflow: "hidden", minWidth: 0, borderRadius: 20, border: `1px solid ${active ? program.accent + "88" : program.accent + "38"}`, background: `radial-gradient(circle at 88% 0%,${program.accent}28,transparent 36%),linear-gradient(145deg,${program.accent}10,rgba(6,9,15,.995) 50%)`, boxShadow: "0 14px 34px rgba(0,0,0,.34)", padding: 12 }}>
    <div aria-hidden="true" style={{ position: "absolute", right: -18, top: -20, width: 104, height: 104, borderRadius: 999, border: `1px solid ${program.accent}18`, background: `${program.accent}08` }} />
    <div style={{ position: "relative", display: "grid", gridTemplateColumns: "58px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, display: "grid", placeItems: "center", background: `linear-gradient(145deg,${program.accent}22,${program.accent}08)`, border: `1px solid ${program.accent}55`, color: program.accent, boxShadow: `0 0 22px ${program.accent}18`, fontSize: 25 }}>{practice?.icon || program.icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          {recommended != null ? <span style={{ color: program.accent, fontSize: 6.7, fontWeight: 1000, letterSpacing: .8 }}>{rank === 1 ? t("MEILLEUR CHOIX", "BEST MATCH", "MEJOR OPCIÓN") : t("RECOMMANDÉ", "RECOMMENDED", "RECOMENDADO")} · {recommended}%</span> : <span style={{ color: program.accent, fontSize: 6.7, fontWeight: 1000, letterSpacing: .8 }}>{practice?.label.toUpperCase()}</span>}
          {active ? <FitPill accent={program.accent}>{t("ACTIF", "ACTIVE", "ACTIVO")}</FitPill> : null}
        </div>
        <div style={{ marginTop: 4, fontSize: 14.2, lineHeight: 1.08, fontWeight: 1000, letterSpacing: -.15 }}>{program.title}</div>
        <div style={{ marginTop: 4, color: textSoft, fontSize: 8, lineHeight: 1.3 }}>{program.subtitle}</div>
      </div>
      <span style={{ color: program.accent, opacity: .8 }}><FitIcon name="chevron" size={18}/></span>
    </div>

    <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, marginTop: 10 }}>
      {[[`${program.durationWeeks}`, t("sem.", "weeks", "sem.")], [`${program.sessionsPerWeek}×`, t("/ sem.", "/ week", "/ sem.")], [`${program.typicalDurationMin}`, "min"], [levelLabel(program.level, t), t("niveau", "level", "nivel")]].map(([value, label]) => <div key={`${value}-${label}`} style={{ minWidth: 0, borderRadius: 11, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.025)", padding: "6px 4px", textAlign: "center" }}><strong style={{ display: "block", color: program.accent, fontSize: 8.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</strong><small style={{ display: "block", marginTop: 2, color: textSoft, fontSize: 5.8 }}>{label}</small></div>)}
    </div>

    <div style={{ position: "relative", display: "flex", gap: 5, overflowX: "auto", marginTop: 8, paddingBottom: 1 }}>
      {program.goals.slice(0, 3).map((goal) => <FitPill key={goal} accent={program.accent}>{FIT_GOALS.find((item) => item.id === goal)?.label || goal}</FitPill>)}
    </div>

    <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 7, marginTop: 10 }}>
      <button type="button" onClick={onOpen} style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", color: "rgba(255,255,255,.78)", fontSize: 7.4, fontWeight: 1000 }}>{t("DÉTAILS", "DETAILS", "DETALLES")}</button>
      <button type="button" onClick={onActivate} disabled={active} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${program.accent}66`, background: active ? `${program.accent}12` : program.accent, color: active ? program.accent : "#071014", fontSize: 7.4, fontWeight: 1000, opacity: active ? .75 : 1 }}>{active ? t("PROGRAMME ACTIF", "ACTIVE PROGRAM", "PROGRAMA ACTIVO") : t("COMMENCER", "START", "EMPEZAR")}</button>
    </div>
  </article>;
}

export default function FitProgramDiscovery({ programs, activeProgramId, accent, textSoft, t, onOpen, onActivate }: Props) {
  const [practice, setPractice] = React.useState<FitPracticeId | "all">("all");
  const [goal, setGoal] = React.useState<FitProgramGoal | "all">("all");
  const [duration, setDuration] = React.useState<DurationFilter>("all");
  const [preferences, setPreferences] = React.useState<FitUserPreferences | null>(() => loadFitUserPreferences());
  const [editingPreferences, setEditingPreferences] = React.useState(() => !loadFitUserPreferences());
  const [draft, setDraft] = React.useState<FitUserPreferences>(() => loadFitUserPreferences() || { ...DEFAULT_FIT_USER_PREFERENCES });

  React.useEffect(() => {
    const refresh = () => { const next = loadFitUserPreferences(); setPreferences(next); if (next) setDraft(next); };
    window.addEventListener("dc:fit-preferences-changed", refresh as EventListener);
    return () => window.removeEventListener("dc:fit-preferences-changed", refresh as EventListener);
  }, []);

  const visiblePrograms = React.useMemo(() => programs.filter((program) => {
    if (practice !== "all" && program.practice !== practice) return false;
    if (goal !== "all" && !program.goals.includes(goal)) return false;
    if (duration === "short" && program.typicalDurationMin > 25) return false;
    if (duration === "medium" && (program.typicalDurationMin < 30 || program.typicalDurationMin > 50)) return false;
    if (duration === "long" && program.typicalDurationMin < 55) return false;
    return true;
  }), [programs, practice, goal, duration]);

  const recommendations = React.useMemo(() => preferences ? recommendFitPrograms(programs, preferences, 3) : [], [programs, preferences]);
  const savePreferences = () => {
    const next = saveFitUserPreferences(draft);
    setPreferences(next);
    setEditingPreferences(false);
    setGoal(next.goal);
    setDuration(next.durationMin <= 25 ? "short" : next.durationMin >= 55 ? "long" : "medium");
  };

  const selectorStyle = (selected: boolean, hot: string): React.CSSProperties => ({ minHeight: 38, borderRadius: 11, border: `1px solid ${selected ? hot + "66" : "rgba(255,255,255,.075)"}`, background: selected ? `${hot}16` : "rgba(255,255,255,.025)", color: selected ? hot : "rgba(255,255,255,.66)", padding: "0 9px", fontSize: 7.2, fontWeight: 1000, whiteSpace: "nowrap" });

  return <>
    <FitSectionTitle eyebrow={t("POUR TOI", "FOR YOU", "PARA TI")} title={preferences ? t("Tes recommandations", "Your recommendations", "Tus recomendaciones") : t("Construisons ton point de départ", "Build your starting point", "Construyamos tu punto de partida")} right={preferences ? <button type="button" onClick={() => setEditingPreferences((value) => !value)} style={{ minHeight: 30, borderRadius: 10, border: `1px solid ${accent}44`, background: `${accent}0d`, color: accent, padding: "0 9px", fontSize: 6.7, fontWeight: 1000 }}>{t("AJUSTER", "ADJUST", "AJUSTAR")}</button> : null} />

    {editingPreferences ? <section style={{ borderRadius: 20, border: `1px solid ${accent}40`, background: `radial-gradient(circle at 0 0,${accent}14,transparent 42%),linear-gradient(180deg,rgba(10,14,22,.99),rgba(6,9,15,.99))`, padding: 12, boxShadow: "0 14px 34px rgba(0,0,0,.35)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 9, alignItems: "center" }}><div style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", color: accent, background: `${accent}14`, border: `1px solid ${accent}38` }}><FitIcon name="goals" size={21}/></div><div><strong style={{ display: "block", fontSize: 12 }}>{t("Personnalise FIT PERF", "Personalize FIT PERF", "Personaliza FIT PERF")}</strong><small style={{ display: "block", marginTop: 3, color: textSoft, fontSize: 7.4, lineHeight: 1.35 }}>{t("4 choix rapides pour faire remonter les programmes vraiment adaptés.", "Four quick choices to surface the programs that truly fit you.", "Cuatro elecciones rápidas para mostrar programas realmente adaptados.")}</small></div></div>

      <div style={{ marginTop: 12, color: textSoft, fontSize: 6.7, fontWeight: 1000, letterSpacing: .75 }}>{t("1 · TON OBJECTIF", "1 · YOUR GOAL", "1 · TU OBJETIVO")}</div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 6, paddingBottom: 1 }}>{FIT_GOALS.map((item) => <button key={item.id} type="button" onClick={() => setDraft((current) => ({ ...current, goal: item.id }))} style={selectorStyle(draft.goal === item.id, accent)}>{item.label}</button>)}</div>

      <div style={{ marginTop: 11, color: textSoft, fontSize: 6.7, fontWeight: 1000, letterSpacing: .75 }}>{t("2 · TON NIVEAU", "2 · YOUR LEVEL", "2 · TU NIVEL")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 6 }}>{(["beginner", "intermediate", "advanced"] as FitProgramLevel[]).map((item) => <button key={item} type="button" onClick={() => setDraft((current) => ({ ...current, level: item }))} style={{ ...selectorStyle(draft.level === item, accent), minWidth: 0, padding: "0 4px" }}>{levelLabel(item, t)}</button>)}</div>

      <div style={{ marginTop: 11, color: textSoft, fontSize: 6.7, fontWeight: 1000, letterSpacing: .75 }}>{t("3 · TON MATÉRIEL", "3 · YOUR EQUIPMENT", "3 · TU MATERIAL")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 6 }}>{(["bodyweight", "home", "gym"] as FitEquipmentPreset[]).map((item) => <button key={item} type="button" onClick={() => setDraft((current) => ({ ...current, equipmentPreset: item }))} style={{ minWidth: 0, minHeight: 54, borderRadius: 12, border: `1px solid ${draft.equipmentPreset === item ? accent + "66" : "rgba(255,255,255,.075)"}`, background: draft.equipmentPreset === item ? `${accent}15` : "rgba(255,255,255,.025)", color: draft.equipmentPreset === item ? accent : "rgba(255,255,255,.65)", display: "grid", placeItems: "center", alignContent: "center", gap: 3, padding: 4 }}><FitIcon name={item === "gym" ? "strength" : item === "home" ? "workout" : "body"} size={17}/><span style={{ fontSize: 6.6, fontWeight: 1000, lineHeight: 1.1 }}>{presetLabel(item, t)}</span></button>)}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 11 }}>
        <div><div style={{ color: textSoft, fontSize: 6.7, fontWeight: 1000, letterSpacing: .75 }}>{t("4 · JOURS / SEMAINE", "4 · DAYS / WEEK", "4 · DÍAS / SEMANA")}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 4, marginTop: 6 }}>{[2,3,4,5,6].map((value) => <button key={value} type="button" onClick={() => setDraft((current) => ({ ...current, daysPerWeek: value }))} style={{ ...selectorStyle(draft.daysPerWeek === value, accent), minWidth: 0, padding: 0 }}>{value}</button>)}</div></div>
        <div><div style={{ color: textSoft, fontSize: 6.7, fontWeight: 1000, letterSpacing: .75 }}>{t("TEMPS / SÉANCE", "TIME / WORKOUT", "TIEMPO / SESIÓN")}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4, marginTop: 6 }}>{[20,30,45,60].map((value) => <button key={value} type="button" onClick={() => setDraft((current) => ({ ...current, durationMin: value }))} style={{ ...selectorStyle(draft.durationMin === value, accent), minWidth: 0, padding: 0 }}>{value}</button>)}</div></div>
      </div>
      <FitPrimaryButton onClick={savePreferences} accent={accent} style={{ width: "100%", minHeight: 48, marginTop: 12 }}>{t("VOIR MES RECOMMANDATIONS", "SHOW MY RECOMMENDATIONS", "VER MIS RECOMENDACIONES")}</FitPrimaryButton>
    </section> : preferences ? <div style={{ display: "grid", gap: 8 }}>
      {recommendations.map((item, index) => <ProgramCard key={item.program.id} program={item.program} active={activeProgramId === item.program.id} recommended={item.score} rank={index + 1} t={t} textSoft={textSoft} onOpen={() => onOpen(item.program)} onActivate={() => onActivate(item.program.id)} />)}
    </div> : null}

    <FitSectionTitle eyebrow={t("EXPLORER", "EXPLORE", "EXPLORAR")} title={t("Que veux-tu pratiquer ?", "What do you want to train?", "¿Qué quieres practicar?")} right={practice !== "all" ? <button type="button" onClick={() => setPractice("all")} style={{ minHeight: 28, borderRadius: 9, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: textSoft, padding: "0 8px", fontSize: 6.5, fontWeight: 1000 }}>{t("TOUT", "ALL", "TODO")}</button> : null} />
    <div style={{ display: "grid", gridTemplateRows: "repeat(2,82px)", gridAutoFlow: "column", gridAutoColumns: "142px", gap: 7, overflowX: "auto", padding: "1px 1px 5px", scrollbarWidth: "none" }}>
      {FIT_PRACTICES.map((item) => { const selected = practice === item.id; const copy: [string, string, string] = PRACTICE_COPY[item.id] || ["", "", ""]; return <button key={item.id} type="button" onClick={() => setPractice(selected ? "all" : item.id)} style={{ minWidth: 0, borderRadius: 17, border: `1px solid ${selected ? item.accent + "77" : "rgba(255,255,255,.075)"}`, background: selected ? `linear-gradient(145deg,${item.accent}1d,rgba(8,11,18,.99))` : `linear-gradient(145deg,${item.accent}08,rgba(8,11,18,.99))`, color: selected ? item.accent : "#fff", padding: 9, textAlign: "left", display: "grid", gridTemplateColumns: "38px minmax(0,1fr)", gap: 8, alignItems: "center" }}><span style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", background: `${item.accent}12`, border: `1px solid ${item.accent}35`, fontSize: 18 }}>{item.icon}</span><span style={{ minWidth: 0 }}><strong style={{ display: "block", color: selected ? item.accent : "#fff", fontSize: 8, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label.toUpperCase()}</strong><small style={{ display: "block", marginTop: 4, color: textSoft, fontSize: 6.2, lineHeight: 1.2 }}>{t(copy[0], copy[1], copy[2])}</small></span></button>; })}
    </div>

    <div style={{ marginTop: 8, borderRadius: 17, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.018)", padding: 9 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><span style={{ color: textSoft, fontSize: 6.6, fontWeight: 1000, letterSpacing: .75 }}>{t("AFFINER", "REFINE", "AFINAR")}</span><span style={{ color: accent, fontSize: 7, fontWeight: 1000 }}>{visiblePrograms.length} {t("PROGRAMMES", "PROGRAMS", "PROGRAMAS")}</span></div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 6, paddingBottom: 1 }}><button type="button" onClick={() => setGoal("all")} style={selectorStyle(goal === "all", accent)}>{t("Tous objectifs", "All goals", "Todos objetivos")}</button>{FIT_GOALS.map((item) => <button key={item.id} type="button" onClick={() => setGoal(goal === item.id ? "all" : item.id)} style={selectorStyle(goal === item.id, accent)}>{item.label}</button>)}</div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 6, paddingBottom: 1 }}><button type="button" onClick={() => setDuration("all")} style={selectorStyle(duration === "all", accent)}>{t("Toute durée", "Any duration", "Cualquier duración")}</button><button type="button" onClick={() => setDuration("short")} style={selectorStyle(duration === "short", accent)}>≤ 25 min</button><button type="button" onClick={() => setDuration("medium")} style={selectorStyle(duration === "medium", accent)}>30–50 min</button><button type="button" onClick={() => setDuration("long")} style={selectorStyle(duration === "long", accent)}>55+ min</button></div>
    </div>

    <div style={{ display: "grid", gap: 9, marginTop: 9 }}>
      {visiblePrograms.map((program) => <ProgramCard key={program.id} program={program} active={activeProgramId === program.id} t={t} textSoft={textSoft} onOpen={() => onOpen(program)} onActivate={() => onActivate(program.id)} />)}
      {!visiblePrograms.length ? <div style={{ padding: "28px 12px", borderRadius: 18, border: "1px dashed rgba(255,255,255,.12)", color: textSoft, textAlign: "center", fontSize: 8 }}>{t("Aucun programme avec ces critères. Essaie d'élargir les filtres.", "No program matches these criteria. Try broader filters.", "Ningún programa coincide. Prueba filtros más amplios.")}</div> : null}
    </div>
  </>;
}
