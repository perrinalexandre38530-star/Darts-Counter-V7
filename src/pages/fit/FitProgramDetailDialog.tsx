import React from "react";
import { FIT_GOALS, FIT_PRACTICES, type FitProgramDefinition } from "../../fit/fitProgramCatalog";
import { FitIcon, FitPill, FitPrimaryButton } from "./FitPerfUi";

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
  const scheduledDays = new Set(program.schedule.map((slot) => slot.dayOffset));

  return <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 180, background: "rgba(0,0,0,.78)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 12 }}>
    <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", borderRadius: 25, border: `1px solid ${program.accent}55`, background: `radial-gradient(circle at 80% -5%,${program.accent}2a,transparent 33%),linear-gradient(180deg,#0b1019,#05070c)`, boxShadow: "0 30px 74px rgba(0,0,0,.7)", padding: 13 }}>
      <section style={{ position: "relative", overflow: "hidden", minHeight: 118, borderRadius: 20, border: `1px solid ${program.accent}3d`, background: `linear-gradient(135deg,${program.accent}18,rgba(5,8,14,.96) 58%)`, padding: 13 }}>
        <div aria-hidden="true" style={{ position: "absolute", right: -18, top: -26, width: 142, height: 142, borderRadius: 999, border: `1px solid ${program.accent}22`, background: `${program.accent}09` }} />
        <button type="button" onClick={onClose} aria-label={t("Fermer", "Close", "Cerrar")} style={{ position: "absolute", zIndex: 2, right: 9, top: 9, width: 36, height: 36, borderRadius: 12, border: "1px solid rgba(255,255,255,.09)", background: "rgba(2,4,8,.56)", color: "#fff", fontSize: 19 }}>×</button>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "64px minmax(0,1fr)", gap: 12, alignItems: "center", paddingRight: 34 }}>
          <div style={{ width: 62, height: 62, borderRadius: 20, display: "grid", placeItems: "center", color: program.accent, background: `${program.accent}16`, border: `1px solid ${program.accent}55`, boxShadow: `0 0 24px ${program.accent}18`, fontSize: 29 }}>{practice?.icon || program.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: program.accent, fontSize: 7, fontWeight: 1000, letterSpacing: 1 }}>{practice?.label.toUpperCase()} · {t("PROGRAMME", "PROGRAM", "PROGRAMA")}</div>
            <div style={{ marginTop: 5, fontSize: 20, lineHeight: 1.02, fontWeight: 1000, letterSpacing: -.35 }}>{program.title}</div>
            <div style={{ marginTop: 5, color: textSoft, fontSize: 8.3, lineHeight: 1.35 }}>{program.subtitle}</div>
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 5, flexWrap: "wrap", marginTop: 11 }}>
          {program.goals.slice(0, 3).map((goal) => <FitPill key={goal} accent={program.accent}>{FIT_GOALS.find((item) => item.id === goal)?.label || goal}</FitPill>)}
          {active ? <FitPill accent={program.accent}>{t("ACTIF", "ACTIVE", "ACTIVO")}</FitPill> : null}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 9 }}>
        {[[`${program.durationWeeks}`, t("semaines", "weeks", "semanas")], [`${program.sessionsPerWeek}×`, t("/ semaine", "/ week", "/ semana")], [`${program.typicalDurationMin}`, "min"], [level, t("niveau", "level", "nivel")]].map(([value, label]) => <div key={`${value}-${label}`} style={{ minWidth: 0, padding: "8px 4px", borderRadius: 12, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.024)", textAlign: "center" }}><strong style={{ display: "block", color: program.accent, fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</strong><small style={{ display: "block", marginTop: 2, color: textSoft, fontSize: 6.1 }}>{label}</small></div>)}
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "end", gap: 8 }}><div><div style={{ color: program.accent, fontSize: 6.8, fontWeight: 1000, letterSpacing: .9 }}>{t("TA SEMAINE", "YOUR WEEK", "TU SEMANA")}</div><div style={{ marginTop: 3, fontSize: 13, fontWeight: 1000 }}>{program.sessionsPerWeek} {t("séances planifiées", "planned sessions", "sesiones planificadas")}</div></div><button type="button" onClick={onOpenWeek} style={{ minHeight: 32, borderRadius: 10, border: `1px solid ${program.accent}42`, background: `${program.accent}0d`, color: program.accent, padding: "0 9px", fontSize: 6.6, fontWeight: 1000 }}>{t("AGENDA", "AGENDA", "AGENDA")}</button></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, marginTop: 7 }}>
        {DAYS.map((day, dayOffset) => { const on = scheduledDays.has(dayOffset); return <div key={day} style={{ minWidth: 0, height: 43, borderRadius: 11, border: `1px solid ${on ? program.accent + "55" : "rgba(255,255,255,.055)"}`, background: on ? `${program.accent}14` : "rgba(255,255,255,.018)", color: on ? program.accent : "rgba(255,255,255,.3)", display: "grid", placeItems: "center", alignContent: "center", gap: 3 }}><span style={{ fontSize: 6.2, fontWeight: 1000 }}>{day.slice(0, 1)}</span><span style={{ width: 6, height: 6, borderRadius: 999, background: on ? program.accent : "rgba(255,255,255,.12)", boxShadow: on ? `0 0 8px ${program.accent}` : "none" }} /></div>; })}
      </div>

      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        {program.schedule.slice().sort((a, b) => a.dayOffset - b.dayOffset).map((slot, index) => <div key={`${slot.dayOffset}-${slot.title}-${index}`} style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 8, alignItems: "center", minHeight: 48, borderRadius: 13, border: `1px solid ${program.accent}30`, background: `${program.accent}08`, padding: "6px 8px" }}><div style={{ width: 38, height: 36, borderRadius: 10, display: "grid", placeItems: "center", color: program.accent, background: `${program.accent}12`, border: `1px solid ${program.accent}32`, fontSize: 7, fontWeight: 1000 }}>{DAYS[slot.dayOffset]}</div><div style={{ minWidth: 0 }}><strong style={{ display: "block", color: "#fff", fontSize: 8.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slot.title}</strong>{slot.note ? <small style={{ display: "block", marginTop: 2, color: textSoft, fontSize: 6.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slot.note}</small> : null}</div><span style={{ color: program.accent, fontSize: 7.2, fontWeight: 1000 }}>{slot.durationMin} MIN</span></div>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <div style={{ minWidth: 0, borderRadius: 14, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.02)", padding: 9 }}><div style={{ color: textSoft, fontSize: 6.4, fontWeight: 1000, letterSpacing: .7 }}>{t("MATÉRIEL", "EQUIPMENT", "EQUIPO")}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>{program.equipment.slice(0, 4).map((item) => <FitPill key={item}>{String(item).toUpperCase()}</FitPill>)}</div></div>
        <div style={{ minWidth: 0, borderRadius: 14, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.02)", padding: 9 }}><div style={{ color: textSoft, fontSize: 6.4, fontWeight: 1000, letterSpacing: .7 }}>{t("STRUCTURE", "STRUCTURE", "ESTRUCTURA")}</div><div style={{ marginTop: 6, color: "#fff", fontSize: 8, lineHeight: 1.4 }}>{program.sessionsPerWeek}× {t("par semaine", "per week", "por semana")}<br/><span style={{ color: textSoft }}>{program.durationWeeks} {t("semaines de progression", "weeks of progression", "semanas de progresión")}</span></div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: active ? "1fr 1fr" : "1fr", gap: 7, marginTop: 11 }}>
        {active ? <button type="button" onClick={onOpenWeek} style={{ minHeight: 48, borderRadius: 13, border: `1px solid ${program.accent}55`, background: `${program.accent}10`, color: program.accent, fontWeight: 1000 }}>{t("VOIR MA SEMAINE", "VIEW MY WEEK", "VER MI SEMANA")}</button> : null}
        <FitPrimaryButton onClick={active ? undefined : onActivate} disabled={active} accent={program.accent} style={{ width: "100%", minHeight: 48 }}>{active ? t("PROGRAMME ACTIF", "ACTIVE PROGRAM", "PROGRAMA ACTIVO") : t("COMMENCER CE PROGRAMME", "START THIS PROGRAM", "EMPEZAR ESTE PROGRAMA")}</FitPrimaryButton>
      </div>
    </div>
  </div>;
}
