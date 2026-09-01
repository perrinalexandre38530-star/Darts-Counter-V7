import React from "react";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import {
  MULTISPORT_ACTIVITY_PRESETS,
  SMART_MULTISPORT_TEMPLATES,
  activateMultisportPlan,
  analyzeMultisportPlanSlots,
  buildSmartMultisportSlots,
  clearActiveMultisportPlan,
  createMultisportPlan,
  deleteMultisportPlan,
  getActiveMultisportPlanDefinition,
  loadMultisportPlans,
  presetById,
  slotFromPreset,
  updateMultisportPlan,
  type MultisportPlanSlot,
  type MultisportWeeklyPlan,
  type SmartMultisportTemplateId,
} from "../../planning/multisportPlan";
import { multisportSportMeta } from "../../planning/multisportAgenda";
import { FitGlassCard, FitPill, FitPrimaryButton, FitSectionTitle } from "./FitPerfUi";

const DAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

function planSportIcon(slot: MultisportPlanSlot | undefined) {
  if (!slot) return "·";
  return presetById(slot.presetId || "").icon || multisportSportMeta(slot.sport as any).icon;
}

export default function FitMultisportPlanBuilder({ go, lang, accent, textSoft }: { go: (route: any, params?: any) => void; lang: string; accent: string; textSoft: string }) {
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const [plans, setPlans] = React.useState<MultisportWeeklyPlan[]>(() => loadMultisportPlans());
  const [activeState, setActiveState] = React.useState(() => getActiveMultisportPlanDefinition());
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState(t("Ma semaine multisports", "My multisport week", "Mi semana multideporte"));
  const [weeks, setWeeks] = React.useState(8);
  const [slots, setSlots] = React.useState<MultisportPlanSlot[]>(() => buildSmartMultisportSlots("balanced"));

  const refresh = React.useCallback(() => { setPlans(loadMultisportPlans()); setActiveState(getActiveMultisportPlanDefinition()); }, []);
  React.useEffect(() => { window.addEventListener("dc:multisport-plan-changed", refresh as EventListener); return () => window.removeEventListener("dc:multisport-plan-changed", refresh as EventListener); }, [refresh]);

  const analysis = React.useMemo(() => analyzeMultisportPlanSlots(slots), [slots]);
  const slotForDay = (dayOffset: number) => slots.find((slot) => slot.dayOffset === dayOffset);
  const applyTemplate = (id: SmartMultisportTemplateId) => { setSlots(buildSmartMultisportSlots(id)); setEditingId(null); const model = SMART_MULTISPORT_TEMPLATES.find((item) => item.id === id); if (model) setTitle(model.label); };
  const setDayPreset = (dayOffset: number, presetId: string) => {
    if (!presetId) { setSlots((current) => current.filter((slot) => slot.dayOffset !== dayOffset)); return; }
    const old = slotForDay(dayOffset);
    const next = slotFromPreset(dayOffset, presetId, old?.startHour ?? (dayOffset >= 5 ? 10 : 18), old?.startMinute ?? 0);
    setSlots((current) => [...current.filter((slot) => slot.dayOffset !== dayOffset), next].sort((a, b) => a.dayOffset - b.dayOffset));
  };
  const patchDay = (dayOffset: number, patch: Partial<MultisportPlanSlot>) => setSlots((current) => current.map((slot) => slot.dayOffset === dayOffset ? { ...slot, ...patch } : slot));
  const editPlan = (plan: MultisportWeeklyPlan) => { setEditingId(plan.id); setTitle(plan.title); setWeeks(plan.durationWeeks); setSlots(plan.slots.map((slot) => ({ ...slot, routeParams: slot.routeParams ? { ...slot.routeParams } : undefined }))); };
  const savePlan = () => {
    const cleanTitle = title.trim(); if (!cleanTitle || !slots.length) return;
    const plan = editingId ? updateMultisportPlan(editingId, { title: cleanTitle, durationWeeks: weeks, slots }) : createMultisportPlan({ title: cleanTitle, durationWeeks: weeks, slots });
    if (!plan) return;
    activateMultisportPlan(plan.id); setEditingId(plan.id); refresh();
  };

  return <div>
    {activeState ? <FitGlassCard accent="#b59cff" style={{ padding: 12, background: "linear-gradient(145deg,rgba(181,156,255,.15),rgba(5,8,14,.99) 48%)", borderColor: "rgba(181,156,255,.5)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 15, display: "grid", placeItems: "center", fontSize: 22, background: "rgba(181,156,255,.12)", border: "1px solid rgba(181,156,255,.35)" }}>🗓️</div>
        <div style={{ minWidth: 0 }}><div style={{ color: "#b59cff", fontSize: 7.3, fontWeight: 1000, letterSpacing: .9 }}>{t("PLAN MULTISPORTS ACTIF", "ACTIVE MULTISPORT PLAN", "PLAN MULTIDEPORTE ACTIVO")}</div><div style={{ marginTop: 3, fontSize: 14, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeState.plan.title}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 7.8 }}>{activeState.plan.slots.length} {t("activités / semaine", "activities / week", "actividades / semana")} · {activeState.plan.durationWeeks} {t("semaines", "weeks", "semanas")}</div></div>
        <button type="button" onClick={() => { clearActiveMultisportPlan(); refresh(); }} aria-label={t("Arrêter", "Stop", "Detener")} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", color: textSoft }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, marginTop: 9 }}>{DAYS.map((day, index) => { const slot = activeState.plan.slots.find((item) => item.dayOffset === index); const hot = slot ? multisportSportMeta(slot.sport as any).accent : "rgba(255,255,255,.18)"; return <button key={day} type="button" onClick={() => go("agenda", { agendaView: "week" })} style={{ minWidth: 0, height: 46, borderRadius: 10, border: `1px solid ${slot ? hot + "50" : "rgba(255,255,255,.055)"}`, background: slot ? `${hot}0d` : "rgba(255,255,255,.015)", color: slot ? hot : "rgba(255,255,255,.28)", display: "grid", placeItems: "center", alignContent: "center", gap: 2 }}><span style={{ fontSize: 7, fontWeight: 1000 }}>{day[0]}</span><span style={{ fontSize: 15 }}>{planSportIcon(slot)}</span></button>; })}</div>
      <button type="button" onClick={() => go("agenda", { agendaView: "week" })} style={{ width: "100%", minHeight: 39, marginTop: 8, borderRadius: 11, border: "1px solid rgba(181,156,255,.38)", background: "rgba(181,156,255,.08)", color: "#b59cff", fontWeight: 1000 }}>{t("OUVRIR MA SEMAINE DANS L'AGENDA", "OPEN MY WEEK IN AGENDA", "ABRIR MI SEMANA EN AGENDA")}</button>
    </FitGlassCard> : null}

    <FitSectionTitle eyebrow={t("PLAN MULTISPORTS", "MULTISPORT PLAN", "PLAN MULTIDEPORTE")} title={t("Construis toute ta semaine sportive", "Build your whole sports week", "Crea toda tu semana deportiva")} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
      {SMART_MULTISPORT_TEMPLATES.map((model) => <button key={model.id} type="button" onClick={() => applyTemplate(model.id)} style={{ minHeight: 68, borderRadius: 15, border: "1px solid rgba(255,255,255,.075)", background: "linear-gradient(145deg,rgba(181,156,255,.07),rgba(7,10,16,.98))", color: "#fff", display: "grid", gridTemplateColumns: "38px minmax(0,1fr)", gap: 8, alignItems: "center", padding: 9, textAlign: "left" }}><span style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(181,156,255,.10)", border: "1px solid rgba(181,156,255,.28)", fontSize: 18 }}>{model.icon}</span><span style={{ minWidth: 0 }}><strong style={{ display: "block", color: "#c9b8ff", fontSize: 8.8 }}>{model.label}</strong><small style={{ display: "block", marginTop: 3, color: textSoft, fontSize: 6.8, lineHeight: 1.25 }}>{model.subtitle}</small></span></button>)}
    </div>

    <FitGlassCard accent="#b59cff" style={{ padding: 12, marginTop: 9 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 92px", gap: 8 }}>
        <label style={{ minWidth: 0 }}><span style={{ color: textSoft, fontSize: 7.2, fontWeight: 1000 }}>{t("NOM DU PLAN", "PLAN NAME", "NOMBRE DEL PLAN")}</span><input value={title} onChange={(event) => setTitle(event.target.value)} style={{ width: "100%", minHeight: 42, marginTop: 4, boxSizing: "border-box", borderRadius: 11, border: "1px solid rgba(255,255,255,.09)", background: "#10151e", color: "#fff", padding: "0 9px", fontSize: 16, fontWeight: 800 }} /></label>
        <label><span style={{ color: textSoft, fontSize: 7.2, fontWeight: 1000 }}>{t("DURÉE", "LENGTH", "DURACIÓN")}</span><select value={weeks} onChange={(event) => setWeeks(Number(event.target.value))} style={{ width: "100%", minHeight: 42, marginTop: 4, borderRadius: 11, border: "1px solid rgba(255,255,255,.09)", background: "#10151e", color: "#fff", padding: "0 7px", fontSize: 15 }}><option value={4}>4 sem.</option><option value={6}>6 sem.</option><option value={8}>8 sem.</option><option value={12}>12 sem.</option><option value={16}>16 sem.</option></select></label>
      </div>

      <div style={{ marginTop: 11, display: "grid", gap: 6 }}>
        {DAYS.map((day, dayOffset) => { const slot = slotForDay(dayOffset); const meta = slot ? multisportSportMeta(slot.sport as any) : null; return <div key={day} style={{ borderRadius: 14, border: `1px solid ${slot ? meta?.accent + "38" : "rgba(255,255,255,.055)"}`, background: slot ? `${meta?.accent}08` : "rgba(255,255,255,.015)", padding: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 7, alignItems: "center" }}><span style={{ color: slot ? meta?.accent : "rgba(255,255,255,.38)", fontSize: 8.5, fontWeight: 1000 }}>{day}</span><select value={slot?.presetId || ""} onChange={(event) => setDayPreset(dayOffset, event.target.value)} style={{ width: "100%", minWidth: 0, minHeight: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "#0e131b", color: "#fff", padding: "0 8px", fontSize: 14 }}><option value="">— {t("REPOS / LIBRE", "REST / FREE", "DESCANSO / LIBRE")} —</option>{MULTISPORT_ACTIVITY_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.icon} {preset.label}</option>)}</select></div>
          {slot ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 6, marginLeft: 49 }}><label><span style={{ display: "block", color: textSoft, fontSize: 6.5, fontWeight: 1000 }}>{t("HEURE", "TIME", "HORA")}</span><input type="time" value={`${String(slot.startHour).padStart(2,"0")}:${String(slot.startMinute).padStart(2,"0")}`} onChange={(event) => { const [hour, minute] = event.target.value.split(":").map(Number); patchDay(dayOffset, { startHour: hour || 0, startMinute: minute || 0 }); }} style={{ width: "100%", minHeight: 38, marginTop: 3, boxSizing: "border-box", borderRadius: 9, border: "1px solid rgba(255,255,255,.08)", background: "#0e131b", color: "#fff", padding: "0 7px", fontSize: 16 }} /></label><label><span style={{ display: "block", color: textSoft, fontSize: 6.5, fontWeight: 1000 }}>{t("DURÉE", "DURATION", "DURACIÓN")}</span><select value={slot.durationMin} onChange={(event) => patchDay(dayOffset, { durationMin: Number(event.target.value) })} style={{ width: "100%", minHeight: 38, marginTop: 3, borderRadius: 9, border: "1px solid rgba(255,255,255,.08)", background: "#0e131b", color: "#fff", padding: "0 7px", fontSize: 15 }}>{[15,20,30,40,45,50,60,75,90,120].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}</select></label></div> : null}
        </div>; })}
      </div>

      <div style={{ marginTop: 9, padding: 9, borderRadius: 12, border: `1px solid ${analysis.warnings.length ? "rgba(255,173,102,.3)" : "rgba(116,239,155,.25)"}`, background: analysis.warnings.length ? "rgba(255,173,102,.06)" : "rgba(116,239,155,.05)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}><FitPill accent="#72def4">{analysis.weeklyMinutes} min</FitPill><FitPill accent="#b59cff">{analysis.sports} {t("pratiques", "sports", "prácticas")}</FitPill><FitPill accent="#74ef9b">{analysis.restDays} {t("jours libres", "rest days", "días libres")}</FitPill><FitPill accent="#ffad66">{analysis.hardSessions} {t("intenses", "hard", "intensas")}</FitPill></div>
        <div style={{ marginTop: 7, color: analysis.warnings.length ? "#ffbd7c" : "#8ef0aa", fontSize: 7.8, lineHeight: 1.4, fontWeight: 850 }}>{analysis.warnings.length ? analysis.warnings.join(" · ") : t("Répartition cohérente : la semaine garde de la récupération entre les charges principales.", "Balanced distribution: the week keeps recovery between the main loads.", "Distribución coherente: la semana conserva recuperación entre cargas principales.")}</div>
      </div>

      <FitPrimaryButton onClick={savePlan} disabled={!title.trim() || !slots.length} accent="#b59cff" style={{ width: "100%", minHeight: 50, marginTop: 10 }}>{editingId ? t("ENREGISTRER ET ACTIVER", "SAVE & ACTIVATE", "GUARDAR Y ACTIVAR") : t("CRÉER MON PLAN MULTISPORTS", "CREATE MY MULTISPORT PLAN", "CREAR MI PLAN MULTIDEPORTE")}</FitPrimaryButton>
    </FitGlassCard>

    {plans.length ? <><FitSectionTitle eyebrow={t("MES PLANS", "MY PLANS", "MIS PLANES")} title={t("Plans multisports enregistrés", "Saved multisport plans", "Planes multideporte guardados")} right={<FitPill accent="#b59cff">{plans.length}</FitPill>} /><div style={{ display: "grid", gap: 6 }}>{plans.map((plan) => { const active = activeState?.plan.id === plan.id; const info = analyzeMultisportPlanSlots(plan.slots); return <FitGlassCard key={plan.id} accent={active ? "#b59cff" : accent} style={{ padding: 9, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", borderColor: active ? "rgba(181,156,255,.55)" : "rgba(255,255,255,.08)" }}><button type="button" onClick={() => editPlan(plan)} style={{ minWidth: 0, border: 0, background: "transparent", color: "#fff", textAlign: "left", padding: 0 }}><strong style={{ display: "block", color: active ? "#c9b8ff" : "#fff", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{plan.title}</strong><small style={{ display: "block", marginTop: 3, color: textSoft, fontSize: 7.4 }}>{plan.slots.length}× / sem. · {info.weeklyMinutes} min · {plan.durationWeeks} sem.</small></button><div style={{ display: "flex", gap: 5 }}><button type="button" onClick={() => { activateMultisportPlan(plan.id); refresh(); }} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(181,156,255,.35)", background: "rgba(181,156,255,.08)", color: "#c9b8ff" }}>{active ? "✓" : "›"}</button><button type="button" onClick={() => { deleteMultisportPlan(plan.id); if (editingId === plan.id) setEditingId(null); refresh(); }} style={{ width: 30, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", color: "rgba(255,255,255,.38)" }}>×</button></div></FitGlassCard>; })}</div></> : null}
  </div>;
}
