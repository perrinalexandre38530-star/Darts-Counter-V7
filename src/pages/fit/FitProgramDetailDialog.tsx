import React from "react";
import { FIT_GOALS, FIT_PRACTICES, type FitProgramDefinition } from "../../fit/fitProgramCatalog";
import { FitGlassCard, FitPill, FitPrimaryButton } from "./FitPerfUi";

type T = (fr: string, en: string, es: string) => string;

type Props = {
  program: FitProgramDefinition;
  active: boolean;
  onClose: () => void;
  onActivate: () => void;
  onOpenWeek: () => void;
  t: T;
  textSoft: string;
};

const DAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

export default function FitProgramDetailDialog({ program, active, onClose, onActivate, onOpenWeek, t, textSoft }: Props) {
  const practice = FIT_PRACTICES.find((item) => item.id === program.practice);
  const level = program.level === "beginner" ? t("Débutant", "Beginner", "Principiante") : program.level === "advanced" ? t("Avancé", "Advanced", "Avanzado") : t("Intermédiaire", "Intermediate", "Intermedio");
  return <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 180, background: "rgba(0,0,0,.76)", backdropFilter: "blur(9px)", display: "grid", placeItems: "center", padding: 12 }}>
    <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", borderRadius: 24, border: `1px solid ${program.accent}55`, background: `radial-gradient(circle at 15% 0%,${program.accent}18,transparent 36%),linear-gradient(180deg,#0b1019,#05070c)`, boxShadow: "0 28px 70px rgba(0,0,0,.65)", padding: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr) 40px", gap: 11, alignItems: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 17, display: "grid", placeItems: "center", color: program.accent, background: `${program.accent}13`, border: `1px solid ${program.accent}42`, fontSize: 24 }}>{practice?.icon || program.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: program.accent, fontSize: 7.7, fontWeight: 1000, letterSpacing: 1.1 }}>{t("FICHE PROGRAMME", "PROGRAM DETAILS", "FICHA DEL PROGRAMA")}</div>
          <div style={{ marginTop: 4, fontSize: 19, lineHeight: 1.05, fontWeight: 1000 }}>{program.title}</div>
          <div style={{ marginTop: 4, color: textSoft, fontSize: 8.6, lineHeight: 1.4 }}>{program.subtitle}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={t("Fermer", "Close", "Cerrar")} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", color: "#fff", fontSize: 20 }}>×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 12 }}>
        {[[`${program.durationWeeks}`, t("semaines", "weeks", "semanas")], [`${program.sessionsPerWeek}×`, t("par semaine", "per week", "por semana")], [`${program.typicalDurationMin}`, "min"], [level, t("niveau", "level", "nivel")]].map(([value, label]) => <div key={`${value}-${label}`} style={{ minWidth: 0, padding: "9px 5px", borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", textAlign: "center" }}><strong style={{ display: "block", color: program.accent, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</strong><small style={{ display: "block", marginTop: 3, color: textSoft, fontSize: 6.8 }}>{label}</small></div>)}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ color: textSoft, fontSize: 7.5, fontWeight: 1000, letterSpacing: .8 }}>{t("SEMAINE TYPE", "TYPICAL WEEK", "SEMANA TIPO")}</div>
        <div style={{ display: "grid", gap: 6, marginTop: 7 }}>
          {DAYS.map((day, dayOffset) => {
            const slots = program.schedule.filter((slot) => slot.dayOffset === dayOffset);
            return <div key={day} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 8, alignItems: "center", minHeight: 45, borderRadius: 13, border: `1px solid ${slots.length ? program.accent + "3d" : "rgba(255,255,255,.055)"}`, background: slots.length ? `${program.accent}0b` : "rgba(255,255,255,.018)", padding: "6px 8px" }}>
              <span style={{ color: slots.length ? program.accent : "rgba(255,255,255,.32)", fontSize: 8, fontWeight: 1000 }}>{day}</span>
              <span style={{ minWidth: 0 }}>{slots.length ? slots.map((slot) => <span key={`${day}-${slot.title}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#fff", fontSize: 8.6, fontWeight: 900 }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slot.title}</span><small style={{ flex: "0 0 auto", color: textSoft }}>{slot.durationMin} min</small></span>) : <span style={{ color: textSoft, fontSize: 8 }}>{t("Repos / libre", "Rest / free", "Descanso / libre")}</span>}</span>
            </div>;
          })}
        </div>
      </div>

      <FitGlassCard accent={program.accent} style={{ padding: 10, marginTop: 11 }}>
        <div style={{ color: textSoft, fontSize: 7.3, fontWeight: 1000 }}>{t("OBJECTIFS", "GOALS", "OBJETIVOS")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>{program.goals.map((goal) => <FitPill key={goal} accent={program.accent}>{FIT_GOALS.find((item) => item.id === goal)?.label || goal}</FitPill>)}</div>
        <div style={{ marginTop: 9, color: textSoft, fontSize: 7.3, fontWeight: 1000 }}>{t("MATÉRIEL", "EQUIPMENT", "EQUIPO")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>{program.equipment.map((item) => <FitPill key={item}>{String(item).toUpperCase()}</FitPill>)}</div>
      </FitGlassCard>

      <div style={{ display: "grid", gridTemplateColumns: active ? "1fr 1fr" : "1fr", gap: 7, marginTop: 11 }}>
        {active ? <button type="button" onClick={onOpenWeek} style={{ minHeight: 48, borderRadius: 13, border: `1px solid ${program.accent}55`, background: `${program.accent}10`, color: program.accent, fontWeight: 1000 }}>{t("VOIR DANS L'AGENDA", "VIEW IN AGENDA", "VER EN AGENDA")}</button> : null}
        <FitPrimaryButton onClick={active ? undefined : onActivate} disabled={active} accent={program.accent} style={{ width: "100%", minHeight: 48 }}>{active ? t("PROGRAMME ACTIF", "ACTIVE PROGRAM", "PROGRAMA ACTIVO") : t("COMMENCER CE PROGRAMME", "START THIS PROGRAM", "EMPEZAR ESTE PROGRAMA")}</FitPrimaryButton>
      </div>
    </div>
  </div>;
}
