import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { FIT_TEMPLATES } from "../../fit/fitStore";
import { FitGlassCard, FitPill, FitPrimaryButton, FitProgress, FitSectionTitle, FitShell } from "./FitPerfUi";

type Props = { go: (route: any, params?: any) => void };

export default function FitPerfPlan({ go }: Props) {
  const { theme } = useTheme();
  const langApi = useLang() as any;
  const lang = String(langApi?.lang || "fr").toLowerCase();
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const [selected, setSelected] = React.useState("ppl");

  const programs = [
    { id: "ppl", name: "PUSH / PULL / LEGS", level: t("INTERMÉDIAIRE", "INTERMEDIATE", "INTERMEDIO"), days: 3, accent, description: t("Structure simple et efficace sur 3 séances. Idéale pour progresser en volume et en régularité.", "Simple, effective 3-session structure. Ideal for volume and consistency.", "Estructura simple y eficaz de 3 sesiones. Ideal para volumen y regularidad."), schedule: ["PUSH", "PULL", "LEGS"] },
    { id: "upperlower", name: "UPPER / LOWER", level: t("DÉBUTANT +", "BEGINNER +", "PRINCIPIANTE +"), days: 4, accent: "#76e4f7", description: t("Deux séances haut du corps et deux séances bas du corps pour une fréquence équilibrée.", "Two upper and two lower sessions for balanced frequency.", "Dos sesiones de tren superior y dos de tren inferior para frecuencia equilibrada."), schedule: ["UPPER", "LOWER", "UPPER", "LOWER"] },
    { id: "strength", name: "FORCE 5×5", level: t("FORCE", "STRENGTH", "FUERZA"), days: 3, accent: "#b59cff", description: t("Priorité aux mouvements polyarticulaires, charges progressives et récupération plus longue.", "Focus on compound lifts, progressive loads and longer recovery.", "Prioridad a movimientos compuestos, cargas progresivas y recuperación larga."), schedule: ["A", "B", "A/B"] },
  ];
  const current = programs.find((program) => program.id === selected) || programs[0]!;

  return <div style={{ minHeight: "100%", color: "#fff", background: (theme as any)?.pageBackground || (theme as any)?.bg || "#05060b" }}>
    <FitShell>
      <FitGlassCard accent={accent} style={{ marginTop: 8, padding: 18, borderRadius: 26, background: "linear-gradient(145deg,rgba(8,11,17,.98),rgba(16,19,29,.97))" }}>
        <FitPill accent={accent}>FIT PERF · PROGRAMMES</FitPill>
        <div style={{ marginTop: 10, fontSize: 28, fontWeight: 1000, letterSpacing: -1 }}>{t("Structure ta progression", "Structure your progress", "Estructura tu progreso")}</div>
        <div style={{ marginTop: 6, color: textSoft, fontSize: 10.5, lineHeight: 1.45 }}>{t("Cette première version prépare déjà le centre de programmes. Les modèles ci-dessous lancent directement les séances FIT PERF correspondantes.", "This first version already lays out the program center. Templates below launch the matching FIT PERF workouts directly.", "Esta primera versión ya prepara el centro de programas. Los modelos inician directamente las sesiones FIT PERF correspondientes.")}</div>
      </FitGlassCard>

      <FitSectionTitle eyebrow={t("PROGRAMMES", "PROGRAMS", "PROGRAMAS")} title={t("Choisir une structure", "Choose a structure", "Elegir una estructura")} />
      <div style={{ display: "grid", gap: 9 }}>
        {programs.map((program) => <button key={program.id} type="button" onClick={() => setSelected(program.id)} style={{ textAlign: "left", color: "#fff", borderRadius: 18, padding: 13, border: `1px solid ${selected === program.id ? program.accent + "77" : "rgba(255,255,255,.08)"}`, background: selected === program.id ? `linear-gradient(145deg,${program.accent}18,rgba(255,255,255,.025))` : "linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018))", cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><div style={{ color: program.accent, fontSize: 9, fontWeight: 1000, letterSpacing: 1 }}>{program.level}</div><div style={{ marginTop: 4, fontSize: 14, fontWeight: 1000 }}>{program.name}</div></div><FitPill accent={program.accent}>{program.days} J / SEM.</FitPill></div><div style={{ marginTop: 7, color: textSoft, fontSize: 9.5, lineHeight: 1.45 }}>{program.description}</div></button>)}
      </div>

      <FitSectionTitle eyebrow={t("APERÇU", "PREVIEW", "VISTA PREVIA")} title={current.name} right={<FitPill accent={current.accent}>{current.level}</FitPill>} />
      <FitGlassCard accent={current.accent} style={{ padding: 14 }}>
        <div style={{ display: "grid", gap: 8 }}>{current.schedule.map((day, index) => <div key={`${day}-${index}`} style={{ display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 10, alignItems: "center", minHeight: 58, padding: "8px 10px", borderRadius: 14, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.025)" }}><div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: `${current.accent}12`, border: `1px solid ${current.accent}38`, color: current.accent, fontWeight: 1000 }}>J{index + 1}</div><div><div style={{ fontSize: 11.5, fontWeight: 950 }}>{day}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{t("Séance planifiée", "Planned workout", "Sesión planificada")}</div></div><span style={{ color: current.accent, fontWeight: 1000 }}>›</span></div>)}</div>
        <div style={{ marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", color: textSoft, fontSize: 9.5, marginBottom: 6 }}><span>{t("Progression hebdomadaire", "Weekly progression", "Progresión semanal")}</span><b style={{ color: current.accent }}>0%</b></div><FitProgress value={0} accent={current.accent} /></div>
      </FitGlassCard>

      <FitSectionTitle eyebrow={t("SÉANCES", "WORKOUTS", "SESIONES")} title={t("Lancer un jour du programme", "Launch a program day", "Iniciar un día del programa")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {FIT_TEMPLATES.map((template) => <FitGlassCard key={template.id} accent={template.accent} style={{ padding: 12 }}><div style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", color: template.accent, background: `${template.accent}12`, border: `1px solid ${template.accent}38`, fontWeight: 1000 }}>{template.icon}</div><div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 1000 }}>{template.name}</div><div style={{ minHeight: 28, marginTop: 4, color: textSoft, fontSize: 8.8, lineHeight: 1.35 }}>{template.subtitle}</div><FitPrimaryButton onClick={() => go("games", { fitTemplateId: template.id })} accent={template.accent} style={{ width: "100%", minHeight: 38, marginTop: 9, fontSize: 9 }}>▶ {t("LANCER", "START", "INICIAR")}</FitPrimaryButton></FitGlassCard>)}
      </div>
    </FitShell>
  </div>;
}
