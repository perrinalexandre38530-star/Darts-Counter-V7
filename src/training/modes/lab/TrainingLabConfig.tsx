import React from "react";
import type { Profile } from "../../../lib/types";
import TrainingShell from "../../shell/TrainingShell";
import TrainingHeader from "../../ui/TrainingHeader";
import TrainingStartButton from "../../ui/TrainingStartButton";
import { getTrainingDetailedSessions } from "../../stats/trainingStatsHub";
import { buildGoalAwareCoachPrescription, buildTrainingDiagnosis, buildTrainingGoalStatuses, buildTrainingProgression, chooseGoalPriorityFamily } from "../../coach/trainingDiagnosis";
import {
  TRAINING_EXERCISE_CATALOG,
  TRAINING_FAMILY_META,
  type TrainingExerciseFamily,
} from "../../catalog/trainingExerciseCatalog";
import { MABULL_REFERENCE_CATALOG, MABULL_REFERENCE_STATS, type MabullReferenceKind } from "../../catalog/mabullReferenceCatalog";
import { buildMabullCatalogCoverage, buildMabullConversionQueue, buildMabullTechniqueTracks, getMabullItemSection, MABULL_SECTION_META, MABULL_SECTION_ORDER, MABULL_TECHNIQUE_TRACK_META, type MabullCatalogSection, type MabullTechniqueTrack } from "../../catalog/mabullCatalogPlan";
import { buildCoachProgram, buildCustomProgram, TRAINING_ASSESSMENT_PROGRAM, TRAINING_PROGRAMS, type TrainingProgramDefinition, type TrainingProgramBuildOptions } from "../../catalog/trainingProgramCatalog";
import { loadTrainingLabPreferences, setTrainingFamilyGoal, setTrainingFamilyGoalDeadline, setTrainingWeeklySessionTarget, toggleFavoriteExercise, toggleFavoriteProgram, type TrainingLabPreferences } from "../../preferences/trainingLabPreferences";
import { buildTrainingCycleComparison, buildTrainingWeeklyPlanStats, clearTrainingProgramDraft, loadTrainingProgramDraft, loadTrainingProgramSessions } from "../../profile/trainingPlanTracker";
import { buildTrainingLoadSummary } from "../../profile/trainingLoadCoach";
import { buildTrainingWeekCoachPlan, loadTrainingNextRecommendation } from "../../profile/trainingWeeklyCoach";
import { buildTrainingCareer } from "../../profile/trainingCareer";
import { buildTrainingMissionBoard } from "../../profile/trainingMissions";
import { buildTrainingCoachHistory } from "../../profile/trainingCoachHistory";
import { buildTrainingCycleCoach } from "../../profile/trainingCycleCoach";
import { buildTrainingBlockCoach, buildTrainingCycleHistory } from "../../profile/trainingBlockCoach";
import { buildTrainingAdaptationCoach } from "../../profile/trainingAdaptationCoach";
import { buildTrainingBlockHandoff, buildTrainingBlockReviews } from "../../profile/trainingBlockReview";
import { buildTrainingActionCoach } from "../../profile/trainingActionCoach";
import { buildTrainingDailyPlan } from "../../profile/trainingDailyPlan";
import { buildTrainingSessionHistoryCoach } from "../../profile/trainingSessionHistoryCoach";
import { buildTrainingCoachingEffectiveness, chooseCoachingEffectiveNextFamily } from "../../profile/trainingCoachingEffectiveness";
import { buildTrainingAssessment } from "../../profile/trainingAssessment";
import { buildTrainingSkillPath } from "../../profile/trainingSkillPath";
import { buildTrainingSkillCertification } from "../../profile/trainingSkillCertification";
import { buildTrainingDiagnosticBoard } from "../../profile/trainingDiagnosticBoard";
import { buildTrainingCoachDashboard } from "../../profile/trainingCoachDashboard";
import { buildTrainingPlayerJourney } from "../../profile/trainingPlayerJourney";
import { buildTrainingQuickStart } from "../../profile/trainingQuickStart";
import { buildTrainingDailyChallenge } from "../../profile/trainingDailyChallenge";

const familyOrder: TrainingExerciseFamily[] = ["scoring", "doubles", "checkout", "precision", "bull", "regularity"];
type HubTab = "program" | "exercises" | "diagnosis" | "progress";
type ProgramPanel = "today" | "week" | "cycle" | "library";
type ProgressPanel = "overview" | "skills" | "coach" | "cycles" | "history";
type ExercisePanel = "path" | "catalog" | "technique" | "favorites";
type CatalogSource = "playable" | "mabull";
type DiagnosisPanel = "overview" | "skill" | "goal";
type SkillProgressPanel = "mastery" | "badges" | "records";
type CoachPanel = "brief" | "live" | "effectiveness" | "weeks";
type HistoryPanel = "plans" | "exercises";
type TrainingViewMode = "essential" | "complete";
type TodayPanel = "plan" | "challenge" | "assessment";

function HubGlyph({ name, size = 17 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "today") return <svg {...common}><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/></svg>;
  if (name === "week") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2"/></svg>;
  if (name === "cycle") return <svg {...common}><path d="M20 7h-5V2"/><path d="M20 7a8 8 0 1 0 1 7"/><path d="M4 17h5v5"/></svg>;
  if (name === "library") return <svg {...common}><path d="M4 4h6v16H4zM14 4h6v16h-6z"/><path d="M7 8h0M17 8h0"/></svg>;
  if (name === "skills") return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-8M22 19V3"/></svg>;
  if (name === "coach") return <svg {...common}><path d="M12 3a6 6 0 0 0-6 6c0 4 3 5 3 8h6c0-3 3-4 3-8a6 6 0 0 0-6-6Z"/><path d="M9 21h6M9 17h6"/></svg>;
  if (name === "history") return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 7v5l3 2"/></svg>;
  if (name === "progress") return <svg {...common}><path d="M4 18l5-5 4 3 7-9"/><path d="M15 7h5v5"/></svg>;
  if (name === "diagnosis") return <svg {...common}><circle cx="11" cy="11" r="6"/><path d="m16 16 5 5M8 11h6M11 8v6"/></svg>;
  if (name === "exercises") return <svg {...common}><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if (name === "scoring") return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M20 12h-3"/></svg>;
  if (name === "doubles") return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/><path d="M6.4 6.4l2.1 2.1M17.6 17.6l-2.1-2.1"/></svg>;
  if (name === "checkout") return <svg {...common}><path d="M5 21V4"/><path d="M5 5h11l-2 4 2 4H5"/></svg>;
  if (name === "precision") return <svg {...common}><circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5"/></svg>;
  if (name === "bull") return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>;
  if (name === "regularity") return <svg {...common}><path d="M3 12c2.2-5 4.4 5 6.6 0s4.4-5 6.6 0 4.4 5 4.8 0"/></svg>;
  if (name === "mastery") return <svg {...common}><path d="M12 3 5 6v5c0 4.8 3 8 7 10 4-2 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  if (name === "badges") return <svg {...common}><circle cx="12" cy="9" r="5"/><path d="m9 14-2 7 5-3 5 3-2-7"/></svg>;
  if (name === "records") return <svg {...common}><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M6 6H4v2a4 4 0 0 0 4 4M18 6h2v2a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></svg>;
  if (name === "live") return <svg {...common}><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>;
  if (name === "effectiveness") return <svg {...common}><path d="m4 17 5-5 4 3 7-8"/><path d="M16 7h4v4"/></svg>;
  if (name === "plans") return <svg {...common}><rect x="4" y="4" width="12" height="14" rx="2"/><path d="M8 8h5M8 12h5M8 16h3M16 7h4v13H8"/></svg>;
  return <svg {...common}><path d="M4 12h16M12 4v16"/></svg>;
}

type CompactNavItem = { id: string; label: string; icon: string; status?: string };

function CompactIconNav({ items, activeId, onChange, tone = "cyan", stickyTop }: { items: CompactNavItem[]; activeId: string; onChange: (id: string) => void; tone?: "cyan" | "green" | "purple" | "gold"; stickyTop?: number }) {
  const palette = tone === "green"
    ? { border: "rgba(80,255,174,.42)", bg: "rgba(80,255,174,.085)", glow: "rgba(80,255,174,.12)" }
    : tone === "purple"
      ? { border: "rgba(185,156,255,.42)", bg: "rgba(140,90,255,.085)", glow: "rgba(140,90,255,.12)" }
      : tone === "gold"
        ? { border: "rgba(255,216,107,.42)", bg: "rgba(255,216,107,.08)", glow: "rgba(255,216,107,.10)" }
        : { border: "rgba(39,220,255,.50)", bg: "rgba(39,220,255,.10)", glow: "rgba(39,220,255,.12)" };
  return <div style={{ display: "flex", alignItems: "stretch", gap: 5, marginTop: 8, padding: "5px 0", ...(stickyTop === undefined ? {} : { position: "sticky" as const, top: stickyTop, zIndex: 3, background: "rgba(8,10,16,.80)", backdropFilter: "blur(12px)" }) }}>
    {items.map((item) => {
      const active = item.id === activeId;
      return <button key={item.id} type="button" aria-label={item.label} title={item.label} onClick={() => onChange(item.id)} style={{ minWidth: active ? 92 : 42, flex: active ? "1 1 auto" : "0 0 42px", height: 42, padding: active ? "5px 9px" : 0, borderRadius: 12, border: active ? `1px solid ${palette.border}` : "1px solid rgba(255,255,255,.075)", background: active ? palette.bg : "rgba(255,255,255,.022)", boxShadow: active ? `0 0 18px ${palette.glow}` : "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: active ? "flex-start" : "center", gap: 7, overflow: "hidden", transition: "flex .18s ease,min-width .18s ease,background .18s ease" }}>
        <span style={{ display: "grid", placeItems: "center", flex: "0 0 auto" }}><HubGlyph name={item.icon} size={active ? 17 : 16} /></span>
        {active && <span style={{ minWidth: 0, textAlign: "left" }}><span style={{ display: "block", fontSize: 7.6, lineHeight: 1.05, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>{item.status && <span style={{ display: "block", marginTop: 2, fontSize: 6.1, lineHeight: 1, opacity: .46, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.status}</span>}</span>}
      </button>;
    })}
  </div>;
}

function MetricChip({ icon, label, value, tone = "cyan" }: { icon: string; label: string; value: string; tone?: "cyan" | "green" | "gold" | "purple" }) {
  const palette = tone === "green"
    ? { bg: "rgba(80,255,174,.08)", border: "rgba(80,255,174,.18)", color: "#8cffcb" }
    : tone === "gold"
      ? { bg: "rgba(255,216,107,.08)", border: "rgba(255,216,107,.18)", color: "#ffd86b" }
      : tone === "purple"
        ? { bg: "rgba(185,156,255,.08)", border: "rgba(185,156,255,.18)", color: "#b99cff" }
        : { bg: "rgba(39,220,255,.08)", border: "rgba(39,220,255,.18)", color: "#27dcff" };
  return <div style={{ minWidth: 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 999, background: palette.bg, border: `1px solid ${palette.border}` }}>
    <span style={{ display: "grid", placeItems: "center", width: 18, height: 18, borderRadius: 999, background: "rgba(0,0,0,.16)", color: palette.color }}><HubGlyph name={icon} size={11} /></span>
    <span style={{ minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 6.1, lineHeight: 1, letterSpacing: .7, fontWeight: 900, opacity: .58 }}>{label}</span>
      <span style={{ display: "block", marginTop: 2, fontSize: 7.2, lineHeight: 1.05, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </span>
  </div>;
}

function ActionTile({ icon, title, body, tone = "cyan", onClick, disabled = false }: { icon: string; title: string; body: string; tone?: "cyan" | "green" | "gold" | "purple"; onClick: () => void; disabled?: boolean }) {
  const palette = tone === "green"
    ? { border: "rgba(80,255,174,.24)", bg: "linear-gradient(160deg,rgba(80,255,174,.08),rgba(39,220,255,.03))", iconBg: "rgba(80,255,174,.10)", iconBorder: "rgba(80,255,174,.18)", color: "#8cffcb" }
    : tone === "gold"
      ? { border: "rgba(255,216,107,.20)", bg: "linear-gradient(160deg,rgba(255,216,107,.07),rgba(255,255,255,.025))", iconBg: "rgba(255,216,107,.10)", iconBorder: "rgba(255,216,107,.18)", color: "#ffd86b" }
      : tone === "purple"
        ? { border: "rgba(185,156,255,.20)", bg: "linear-gradient(160deg,rgba(140,90,255,.08),rgba(255,255,255,.025))", iconBg: "rgba(185,156,255,.10)", iconBorder: "rgba(185,156,255,.18)", color: "#b99cff" }
        : { border: "rgba(39,220,255,.22)", bg: "linear-gradient(160deg,rgba(39,220,255,.08),rgba(255,255,255,.025))", iconBg: "rgba(39,220,255,.10)", iconBorder: "rgba(39,220,255,.18)", color: "#27dcff" };
  return <button type="button" disabled={disabled} onClick={onClick} style={{ minWidth: 0, padding: "12px 10px", borderRadius: 14, border: `1px solid ${palette.border}`, background: palette.bg, color: "inherit", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1, textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
    <span style={{ width: 28, height: 28, borderRadius: 10, display: "grid", placeItems: "center", background: palette.iconBg, border: `1px solid ${palette.iconBorder}`, color: palette.color }}><HubGlyph name={icon} size={15} /></span>
    <span style={{ display: "block", minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 8.1, fontWeight: 950 }}>{title}</span>
      <span style={{ display: "block", marginTop: 3, fontSize: 6.9, lineHeight: 1.35, opacity: .56 }}>{body}</span>
    </span>
  </button>;
}

function FloatingDetailSheet({ title, eyebrow, icon = "coach", onClose, children }: { title: string; eyebrow?: string; icon?: string; onClose: () => void; children: React.ReactNode }) {
  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1100, display: "grid", placeItems: "end center", padding: 12, background: "rgba(3,5,10,.72)", backdropFilter: "blur(10px)" }} onClick={onClose}>
    <div onClick={(event) => event.stopPropagation()} style={{ width: "min(620px,100%)", maxHeight: "76vh", overflow: "auto", padding: 14, borderRadius: 20, border: "1px solid rgba(39,220,255,.18)", background: "linear-gradient(160deg,rgba(14,18,28,.99),rgba(8,10,16,.99))", boxShadow: "0 22px 70px rgba(0,0,0,.55)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", background: "rgba(39,220,255,.08)", border: "1px solid rgba(39,220,255,.15)", color: "#27dcff" }}><HubGlyph name={icon} size={17} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>{eyebrow && <div style={{ fontSize: 6.8, fontWeight: 950, letterSpacing: .9, color: "#27dcff" }}>{eyebrow}</div>}<div style={{ marginTop: eyebrow ? 2 : 0, fontSize: 13.5, fontWeight: 950 }}>{title}</div></div>
        <button type="button" aria-label="Fermer" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "inherit", fontSize: 16, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  </div>;
}

function pct(value: number) {
  return `${Math.round(Number(value) || 0)}%`;
}

export default function TrainingLabConfig({ profiles, accountProfile, onStart, onExit }: { profiles?: Profile[]; accountProfile?: Profile | null; onStart: (cfg: any) => void; onExit: () => void; }) {
  const accountParticipantId = accountProfile?.id ? String(accountProfile.id) : "";
  const accountParticipant = React.useMemo(() => accountParticipantId ? {
    id: accountParticipantId,
    name: String((accountProfile as any)?.name || (accountProfile as any)?.displayName || "Mon compte"),
    avatarDataUrl: (accountProfile as any)?.avatarDataUrl || null,
    avatarUrl: (accountProfile as any)?.avatarUrl || (accountProfile as any)?.avatar || null,
    teamId: null, teamName: null, teamLogo: null,
  } : null, [accountParticipantId, accountProfile]);
  const accountParticipantConfig = React.useMemo(() => ({
    participantMode: "players" as const,
    selectedPlayerIds: accountParticipant ? [accountParticipant.id] : [],
    selectedBotIds: [],
    selectedTeamIds: [],
    selectedTeamPlayerIds: {},
    teamSize: 1,
    trainingParticipants: accountParticipant ? [accountParticipant] : [],
  }), [accountParticipant]);
  const resolved = accountParticipant ? [accountParticipant] : [];
  const [preferences, setPreferences] = React.useState<TrainingLabPreferences>(() => loadTrainingLabPreferences());
  const [revision, setRevision] = React.useState(0);
  React.useEffect(() => {
    const refresh = () => setRevision((x) => x + 1);
    window.addEventListener("dc-training-stats-updated", refresh);
    window.addEventListener("dc-training-history-updated", refresh);
    window.addEventListener("dc-training-plan-updated", refresh);
    window.addEventListener("dc-training-next-recommendation-updated", refresh);
    window.addEventListener("dc-training-program-draft-updated", refresh);
    return () => {
      window.removeEventListener("dc-training-stats-updated", refresh);
      window.removeEventListener("dc-training-history-updated", refresh);
      window.removeEventListener("dc-training-plan-updated", refresh);
      window.removeEventListener("dc-training-next-recommendation-updated", refresh);
      window.removeEventListener("dc-training-program-draft-updated", refresh);
    };
  }, []);
  React.useEffect(() => {
    const refreshPreferences = () => setPreferences(loadTrainingLabPreferences());
    window.addEventListener("dc-training-lab-preferences-updated", refreshPreferences);
    return () => window.removeEventListener("dc-training-lab-preferences-updated", refreshPreferences);
  }, []);

  const sessions = React.useMemo(() => {
    void revision;
    return getTrainingDetailedSessions({ participantId: accountParticipantId || null, limit: 300 });
  }, [revision]);
  const programSessions = React.useMemo(() => {
    void revision;
    return loadTrainingProgramSessions(accountParticipantId || null);
  }, [revision]);
  const weeklyPlan = React.useMemo(() => buildTrainingWeeklyPlanStats(programSessions, preferences.weeklySessionTarget), [programSessions, preferences.weeklySessionTarget]);
  const cycleComparison = React.useMemo(() => buildTrainingCycleComparison(programSessions, 4), [programSessions]);
  const liveCoachHistory = React.useMemo(() => buildTrainingSessionHistoryCoach(programSessions, 6), [programSessions]);
  const assessment = React.useMemo(() => buildTrainingAssessment(programSessions, sessions), [programSessions, sessions]);
  const programDraft = React.useMemo(() => { void revision; return loadTrainingProgramDraft(accountParticipantId || null); }, [revision, accountParticipantId]);
  const loadSummary = React.useMemo(() => buildTrainingLoadSummary(programSessions, preferences.weeklySessionTarget), [programSessions, preferences.weeklySessionTarget]);
  const diagnosis = React.useMemo(() => buildTrainingDiagnosis(sessions), [sessions]);
  const rawRecommendedFamily = React.useMemo(() => chooseGoalPriorityFamily(diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines), [diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines]);
  const cycleCoach = React.useMemo(() => buildTrainingCycleCoach(programSessions, diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines), [programSessions, diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines]);
  const cycleRecommendedFamily = cycleCoach.priority?.family || rawRecommendedFamily;
  const coachingEffectiveness = React.useMemo(() => buildTrainingCoachingEffectiveness(programSessions, 10), [programSessions]);
  const recommendedFamily = React.useMemo(() => chooseCoachingEffectiveNextFamily(cycleRecommendedFamily, coachingEffectiveness), [cycleRecommendedFamily, coachingEffectiveness]);
  const blockCoach = React.useMemo(() => buildTrainingBlockCoach(programSessions, cycleCoach), [programSessions, cycleCoach]);
  const adaptationCoach = React.useMemo(() => buildTrainingAdaptationCoach(programSessions, cycleCoach, blockCoach, loadSummary), [programSessions, cycleCoach, blockCoach, loadSummary]);
  const blockHandoff = React.useMemo(() => buildTrainingBlockHandoff(programSessions, recommendedFamily), [programSessions, recommendedFamily]);
  const blockReviews = React.useMemo(() => buildTrainingBlockReviews(programSessions, recommendedFamily, 4), [programSessions, recommendedFamily]);
  const cycleHistory = React.useMemo(() => buildTrainingCycleHistory(programSessions, 6), [programSessions]);
  const weekCoachPlan = React.useMemo(() => buildTrainingWeekCoachPlan(programSessions, preferences.weeklySessionTarget, recommendedFamily, loadSummary), [programSessions, preferences.weeklySessionTarget, recommendedFamily, loadSummary]);
  const actionCoach = React.useMemo(() => buildTrainingActionCoach(adaptationCoach, loadSummary, weekCoachPlan, cycleCoach, blockCoach), [adaptationCoach, loadSummary, weekCoachPlan, cycleCoach, blockCoach]);
  const dailyPlan = React.useMemo(() => buildTrainingDailyPlan(actionCoach, loadSummary), [actionCoach, loadSummary]);
  const nextRecommendation = React.useMemo(() => { void revision; return loadTrainingNextRecommendation(accountParticipantId || null); }, [revision, accountParticipantId]);
  const progression = React.useMemo(() => buildTrainingProgression(sessions), [sessions]);
  const goalStatuses = React.useMemo(() => buildTrainingGoalStatuses(diagnosis, preferences.familyGoals), [diagnosis, preferences.familyGoals]);
  const diagnosticBoard = React.useMemo(() => buildTrainingDiagnosticBoard(diagnosis, goalStatuses, recommendedFamily), [diagnosis, goalStatuses, recommendedFamily]);
  const career = React.useMemo(() => buildTrainingCareer(programSessions, progression, weeklyPlan), [programSessions, progression, weeklyPlan]);
  const missionBoard = React.useMemo(() => buildTrainingMissionBoard(programSessions, progression, recommendedFamily, preferences.weeklySessionTarget, cycleComparison), [programSessions, progression, recommendedFamily, preferences.weeklySessionTarget, cycleComparison]);
  const coachHistory = React.useMemo(() => buildTrainingCoachHistory(programSessions, preferences.weeklySessionTarget, recommendedFamily), [programSessions, preferences.weeklySessionTarget, recommendedFamily]);
  const coachDashboard = React.useMemo(() => buildTrainingCoachDashboard(coachHistory, liveCoachHistory, coachingEffectiveness), [coachHistory, liveCoachHistory, coachingEffectiveness]);
  const allSkillCertifications = React.useMemo(() => familyOrder.map((familyId) => buildTrainingSkillCertification(buildTrainingSkillPath(familyId, progression), sessions)), [progression, sessions]);
  const playerJourney = React.useMemo(() => buildTrainingPlayerJourney({ completedPrograms: career.completedPrograms, coveredFamilies: progression.filter((row) => row.sessions > 0).length, averagePerformance: career.averagePerformance, certifiedLevels: allSkillCertifications.map((item) => item.certifiedLevel) }), [career.completedPrograms, career.averagePerformance, progression, allSkillCertifications]);
  const dailyChallenge = React.useMemo(() => buildTrainingDailyChallenge(recommendedFamily, progression, sessions), [recommendedFamily, progression, sessions]);
  const prescription = React.useMemo(() => buildGoalAwareCoachPrescription(diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines), [diagnosis, preferences.familyGoals, preferences.familyGoalDeadlines]);
  const coachProgram = React.useMemo(() => buildCoachProgram(recommendedFamily), [recommendedFamily]);
  const programs = React.useMemo(() => {
    const base = [coachProgram, ...TRAINING_PROGRAMS];
    const baseIds = new Set(base.map((program) => program.id));
    return [...base, ...preferences.favoritePrograms.filter((program) => !baseIds.has(program.id))];
  }, [coachProgram, preferences.favoritePrograms]);

  const [tab, setTab] = React.useState<HubTab>("program");
  const [programPanel, setProgramPanel] = React.useState<ProgramPanel>("today");
  const [progressPanel, setProgressPanel] = React.useState<ProgressPanel>("overview");
  const [exercisePanel, setExercisePanel] = React.useState<ExercisePanel>("path");
  const [catalogSource, setCatalogSource] = React.useState<CatalogSource>("playable");
  const [mabullKind, setMabullKind] = React.useState<MabullReferenceKind | "all">("all");
  const [mabullSection, setMabullSection] = React.useState<MabullCatalogSection | "all">("all");
  const [techniqueTrack, setTechniqueTrack] = React.useState<MabullTechniqueTrack>("setup");
  const [diagnosisPanel, setDiagnosisPanel] = React.useState<DiagnosisPanel>("overview");
  const [diagnosisFamily, setDiagnosisFamily] = React.useState<TrainingExerciseFamily>(recommendedFamily);
  const [skillProgressPanel, setSkillProgressPanel] = React.useState<SkillProgressPanel>("mastery");
  const [coachPanel, setCoachPanel] = React.useState<CoachPanel>("brief");
  const [historyPanel, setHistoryPanel] = React.useState<HistoryPanel>("plans");
  const [todayPanel, setTodayPanel] = React.useState<TodayPanel>("plan");
  const [viewMode, setViewMode] = React.useState<TrainingViewMode>(() => {
    try { return window.localStorage.getItem("dc_training_center_view_mode") === "complete" ? "complete" : "essential"; } catch { return "essential"; }
  });
  const [showQuickGuide, setShowQuickGuide] = React.useState(() => {
    try { return window.localStorage.getItem("dc_training_quick_guide_seen") !== "1"; } catch { return true; }
  });
  const [showCoachDetails, setShowCoachDetails] = React.useState(false);
  const [showPlanDetails, setShowPlanDetails] = React.useState(false);
  const [showMissionDetails, setShowMissionDetails] = React.useState(false);
  const [showCycleDetails, setShowCycleDetails] = React.useState(false);
  const [detailSheet, setDetailSheet] = React.useState<null | "coach" | "display" | "resume" | "followup" | `mabull:${string}`>(null);
  const [difficultyFilter, setDifficultyFilter] = React.useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [family, setFamily] = React.useState<TrainingExerciseFamily>(recommendedFamily);
  const firstInFamily = React.useMemo(() => TRAINING_EXERCISE_CATALOG.find((e) => e.family === family) || TRAINING_EXERCISE_CATALOG[0], [family]);
  const [exerciseId, setExerciseId] = React.useState(firstInFamily.id);
  const [programId, setProgramId] = React.useState(coachProgram.id);
  const [customDuration, setCustomDuration] = React.useState<15 | 30 | 45>(30);
  const [customFocus, setCustomFocus] = React.useState<TrainingExerciseFamily | "balanced">("balanced");
  const [customIntensity, setCustomIntensity] = React.useState<TrainingProgramBuildOptions["intensity"]>("standard");
  React.useEffect(() => {
    try { window.localStorage.setItem("dc_training_center_view_mode", viewMode); } catch {}
    if (viewMode === "essential") {
      setProgramPanel("today");
      setTodayPanel("plan");
      setExercisePanel("path");
      setDiagnosisPanel("overview");
      setProgressPanel("overview");
    }
  }, [viewMode]);
  const customProgram = React.useMemo(() => buildCustomProgram({ durationMin: customDuration, focusFamily: customFocus, intensity: customIntensity }), [customDuration, customFocus, customIntensity]);
  const quickStart = React.useMemo(() => buildTrainingQuickStart({
    hasDraft: Boolean(programDraft),
    assessmentAvailable: assessment.available,
    assessmentDue: assessment.due,
    hasFollowup: Boolean(nextRecommendation),
    dailyDurationMin: dailyPlan.durationMin,
    dailyFocusLabel: TRAINING_FAMILY_META[dailyPlan.family].label,
  }), [programDraft, assessment.available, assessment.due, nextRecommendation, dailyPlan.durationMin, dailyPlan.family]);

  React.useEffect(() => {
    if (!TRAINING_EXERCISE_CATALOG.some((e) => e.id === exerciseId && e.family === family)) setExerciseId(firstInFamily.id);
  }, [exerciseId, family, firstInFamily.id]);
  React.useEffect(() => {
    if (programId.startsWith("coach_")) setProgramId(coachProgram.id);
  }, [coachProgram.id]);
  React.useEffect(() => {
    if (!familyOrder.includes(diagnosisFamily)) setDiagnosisFamily(recommendedFamily);
  }, [diagnosisFamily, recommendedFamily]);

  const exercises = TRAINING_EXERCISE_CATALOG.filter((e) => e.family === family);
  const filteredExercises = exercises.filter((exercise) => difficultyFilter === 0 || exercise.difficulty === difficultyFilter);
  const mabullCoverage = React.useMemo(() => buildMabullCatalogCoverage(), []);
  const mabullConversionQueue = React.useMemo(() => buildMabullConversionQueue(3), []);
  const filteredMabullItems = React.useMemo(() => MABULL_REFERENCE_CATALOG.filter((item) => (mabullKind === "all" || item.kind === mabullKind) && (mabullSection === "all" || getMabullItemSection(item) === mabullSection)), [mabullKind, mabullSection]);
  const mabullTechniqueItems = React.useMemo(() => MABULL_REFERENCE_CATALOG.filter((item) => item.kind === "technique"), []);
  const mabullTechniqueTracks = React.useMemo(() => buildMabullTechniqueTracks(), []);
  const selectedTechniqueTrack = mabullTechniqueTracks.find((row) => row.track === techniqueTrack) || mabullTechniqueTracks[0];
  const skillPath = React.useMemo(() => buildTrainingSkillPath(family, progression), [family, progression]);
  const skillCertification = React.useMemo(() => buildTrainingSkillCertification(skillPath, sessions), [skillPath, sessions]);
  const selected = TRAINING_EXERCISE_CATALOG.find((e) => e.id === exerciseId) || firstInFamily;
  const selectedProgram = programs.find((p) => p.id === programId) || (programId.startsWith("custom_") ? customProgram : coachProgram);
  const labSessions = sessions.filter((row) => row.modeId === "training_lab").slice(0, 12);

  const startExercise = () => onStart({
    exerciseId: selected.id,
    family: selected.family,
    sessionKind: "exercise",
    ...accountParticipantConfig,
  });

  const startCertification = () => onStart({
    exerciseId: skillCertification.testExercise.id,
    family: skillCertification.family,
    sessionKind: "certification",
    certificationFamily: skillCertification.family,
    certificationTargetLevel: skillCertification.targetLevel,
    certificationRequiredScore: skillCertification.requiredScore,
    ...accountParticipantConfig,
  });

  const startDailyChallenge = () => onStart({
    exerciseId: dailyChallenge.exerciseId,
    family: dailyChallenge.family,
    sessionKind: "daily_challenge",
    dailyChallengeDateKey: dailyChallenge.dateKey,
    dailyChallengeRequiredScore: dailyChallenge.requiredScore,
    ...accountParticipantConfig,
  });

  const startProgram = (program: TrainingProgramDefinition, extras: Record<string, unknown> = {}) => onStart({
    programId: program.id,
    programTitle: program.title,
    programDurationMin: program.durationMin,
    programExerciseIds: program.exerciseIds,
    exerciseId: program.exerciseIds[0],
    family: program.focusFamily && program.focusFamily !== "balanced" ? program.focusFamily : recommendedFamily,
    programFocusFamily: program.focusFamily || "balanced",
    sessionKind: "program",
    ...extras,
    ...accountParticipantConfig,
  });

  const favoriteExerciseIds = new Set(preferences.favoriteExerciseIds);
  const favoriteProgramIds = new Set(preferences.favoritePrograms.map((program) => program.id));
  const favoriteExercises = preferences.favoriteExerciseIds
    .map((id) => TRAINING_EXERCISE_CATALOG.find((exercise) => exercise.id === id))
    .filter(Boolean);

  const toggleExerciseFavorite = (id: string) => {
    setPreferences(toggleFavoriteExercise(preferences, id));
  };

  const toggleProgramFavorite = (program: TrainingProgramDefinition) => {
    const snapshot = program.id === customProgram.id
      ? { ...program, id: `saved_${Date.now()}`, title: `${program.title} ★` }
      : program;
    const next = toggleFavoriteProgram(preferences, snapshot);
    setPreferences(next);
    if (snapshot.id !== program.id) setProgramId(snapshot.id);
  };

  const updateGoal = (familyId: TrainingExerciseFamily, value: number) => {
    setPreferences(setTrainingFamilyGoal(preferences, familyId, value));
  };

  const updateGoalDeadline = (familyId: TrainingExerciseFamily, value: string) => {
    setPreferences(setTrainingFamilyGoalDeadline(preferences, familyId, value || null));
  };

  const updateWeeklyTarget = (value: number) => {
    setPreferences(setTrainingWeeklySessionTarget(preferences, value));
  };

  const dismissQuickGuide = () => {
    setShowQuickGuide(false);
    try { window.localStorage.setItem("dc_training_quick_guide_seen", "1"); } catch {}
  };

  const runQuickStart = () => {
    if (!resolved.length) return;
    dismissQuickGuide();
    if (quickStart.kind === "resume" && programDraft) { resumeProgramDraft(); return; }
    if (quickStart.kind === "assessment") { startProgram(TRAINING_ASSESSMENT_PROGRAM, { adaptiveDailyPlan: false }); return; }
    if (quickStart.kind === "followup" && nextRecommendation) { prepareRecommendedSession(nextRecommendation.durationMin, nextRecommendation.family); return; }
    startProgram(dailyPlan.program, { adaptiveDailyPlan: true });
  };

  const prepareRecommendedSession = (duration: 15 | 30 | 45, focus: TrainingExerciseFamily | "balanced") => {
    setCustomDuration(duration);
    setCustomFocus(focus);
    setCustomIntensity(loadSummary.status === "high" || loadSummary.status === "recovery" ? "accessible" : "standard");
    setProgramId(`custom_${duration}_${focus}_${loadSummary.status === "high" || loadSummary.status === "recovery" ? "accessible" : "standard"}`);
  };

  const resumeProgramDraft = () => {
    if (!programDraft) return;
    onStart({
      programId: programDraft.programId,
      programTitle: programDraft.programTitle,
      programDurationMin: programDraft.durationMin,
      programExerciseIds: programDraft.exerciseIds,
      exerciseId: programDraft.exerciseIds[programDraft.nextStepIndex] || programDraft.exerciseIds[0],
      family: programDraft.focusFamily !== "balanced" ? programDraft.focusFamily : recommendedFamily,
      programFocusFamily: programDraft.focusFamily,
      sessionKind: "program",
      resumeStepIndex: programDraft.nextStepIndex,
      resumeProgramResults: programDraft.completedSteps,
      ...accountParticipantConfig,
    });
  };

  const tabs: Array<{ id: HubTab; label: string; icon: string }> = [
    { id: "program", label: "AUJOURD’HUI", icon: "today" },
    { id: "exercises", label: "S’ENTRAÎNER", icon: "exercises" },
    { id: "diagnosis", label: "MON NIVEAU", icon: "diagnosis" },
    { id: "progress", label: "MES PROGRÈS", icon: "progress" },
  ];
  const programPanels: Array<{ id: ProgramPanel; label: string; icon: string }> = [
    { id: "today", label: "AUJOURD’HUI", icon: "today" },
    { id: "week", label: "SEMAINE", icon: "week" },
    { id: "cycle", label: "MON CAP", icon: "cycle" },
    { id: "library", label: "CHOISIR", icon: "library" },
  ];
  const progressPanels: Array<{ id: ProgressPanel; label: string; icon: string }> = [
    { id: "overview", label: "SYNTHÈSE", icon: "progress" },
    { id: "skills", label: "COMPÉTENCES", icon: "skills" },
    { id: "coach", label: "COACH", icon: "coach" },
    { id: "cycles", label: "CYCLES", icon: "cycle" },
    { id: "history", label: "HISTORIQUE", icon: "history" },
  ];
  const diagnosisPanels: Array<{ id: DiagnosisPanel; label: string; icon: string }> = [
    { id: "overview", label: "EN BREF", icon: "diagnosis" },
    { id: "skill", label: "COMPÉTENCE", icon: "skills" },
    { id: "goal", label: "MON OBJECTIF", icon: "progress" },
  ];
  const skillProgressPanels: Array<{ id: SkillProgressPanel; label: string; icon: string }> = [
    { id: "mastery", label: "MAÎTRISES", icon: "mastery" },
    { id: "badges", label: "BADGES", icon: "badges" },
    { id: "records", label: "RECORDS", icon: "records" },
  ];
  const coachPanels: Array<{ id: CoachPanel; label: string; icon: string }> = [
    { id: "brief", label: "SYNTHÈSE", icon: "coach" },
    { id: "live", label: "LIVE", icon: "live" },
    { id: "effectiveness", label: "EFFICACITÉ", icon: "effectiveness" },
    { id: "weeks", label: "SEMAINES", icon: "week" },
  ];
  const historyPanels: Array<{ id: HistoryPanel; label: string; icon: string }> = [
    { id: "plans", label: "PLANS", icon: "plans" },
    { id: "exercises", label: "EXERCICES", icon: "exercises" },
  ];
  const todayPanels: Array<{ id: TodayPanel; label: string; icon: string; status: string }> = [
    { id: "plan", label: "PLAN DU JOUR", icon: "today", status: `${dailyPlan.durationMin} MIN` },
    { id: "challenge", label: "DÉFI", icon: "badges", status: dailyChallenge.completed ? "VALIDÉ" : `${dailyChallenge.requiredScore}/100` },
    { id: "assessment", label: "BILAN", icon: "diagnosis", status: assessment.due ? "À FAIRE" : assessment.available ? `${Math.round(assessment.overallScore)}/100` : "NOUVEAU" },
  ];

  return (
    <TrainingShell
      header={<TrainingHeader title="Centre d'entraînement" tickerId="training_center" onBack={onExit} rules={<><p>Le centre regroupe programmes guidés, exercices unitaires, diagnostic et progression.</p><p>Awena utilise tes résultats Training enregistrés pour déterminer le prochain axe à travailler.</p></>} />}
      body={
        <div style={{ width: "min(940px,100%)", margin: "0 auto", paddingBottom: 26 }}>
          {showQuickGuide && <div role="dialog" aria-modal="true" aria-label="Guide express du centre d'entraînement" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 16, background: "rgba(3,5,10,.82)", backdropFilter: "blur(12px)" }}>
            <div style={{ width: "min(620px,100%)", maxHeight: "86vh", overflow: "auto", padding: 18, borderRadius: 20, border: "1px solid rgba(39,220,255,.24)", background: "linear-gradient(160deg,rgba(14,18,28,.98),rgba(8,10,16,.98))", boxShadow: "0 24px 80px rgba(0,0,0,.45)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                <div><div style={{ fontSize: 8, fontWeight: 950, letterSpacing: 1.1, color: "#27dcff" }}>GUIDE EXPRESS</div><div style={{ marginTop: 4, fontSize: 19, fontWeight: 950 }}>Tu n'as besoin de retenir que 3 choses</div><div style={{ marginTop: 5, fontSize: 9.5, opacity: .58, lineHeight: 1.45 }}>Tout le reste est calculé automatiquement par Awena et reste disponible en mode COMPLET si tu veux creuser.</div></div>
                <button type="button" onClick={dismissQuickGuide} style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.03)", color: "inherit", fontSize: 16, cursor: "pointer" }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 15 }}>
                {[
                  ["1", "AUJOURD'HUI", "Awena te dit quoi faire maintenant. Tu peux simplement lancer le plan proposé."],
                  ["2", "S'ENTRAÎNER", "Tu veux choisir toi-même ? Parcours les compétences et lance un exercice ciblé."],
                  ["3", "MON NIVEAU", "Regarde où tu en es. Les progrès détaillés sont rangés dans MES PROGRÈS."],
                ].map(([n, title, body]) => <div key={n} style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)" }}><div style={{ width: 27, height: 27, display: "grid", placeItems: "center", borderRadius: 9, background: "rgba(39,220,255,.10)", border: "1px solid rgba(39,220,255,.18)", fontWeight: 950 }}>{n}</div><div style={{ marginTop: 8, fontSize: 9.5, fontWeight: 950 }}>{title}</div><div style={{ marginTop: 4, fontSize: 8, lineHeight: 1.45, opacity: .54 }}>{body}</div></div>)}
              </div>
              <div style={{ marginTop: 14, padding: 13, borderRadius: 15, border: "1px solid rgba(80,255,174,.20)", background: "rgba(80,255,174,.045)" }}>
                <div style={{ fontSize: 7.5, fontWeight: 950, letterSpacing: .8, color: "#8cffcb" }}>{quickStart.eyebrow}</div>
                <div style={{ marginTop: 3, fontSize: 14, fontWeight: 950 }}>{quickStart.title}</div>
                <div style={{ marginTop: 4, fontSize: 8.8, opacity: .58, lineHeight: 1.4 }}>{quickStart.body}</div>
                <button type="button" disabled={!resolved.length} onClick={runQuickStart} style={{ width: "100%", marginTop: 10, padding: "11px 12px", borderRadius: 12, border: "1px solid rgba(80,255,174,.35)", background: "rgba(80,255,174,.10)", color: "inherit", fontSize: 9, fontWeight: 950, cursor: resolved.length ? "pointer" : "not-allowed", opacity: resolved.length ? 1 : .45 }}>{resolved.length ? quickStart.cta : "COMPTE UTILISATEUR REQUIS"}</button>
              </div>
            </div>
          </div>}
          {detailSheet === "coach" && <FloatingDetailSheet title={prescription.title} eyebrow="CONSEIL AWENA" icon="coach" onClose={() => setDetailSheet(null)}>
            <div style={{ fontSize: 9, lineHeight: 1.55, opacity: .7 }}>{prescription.body}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 12 }}>
              <MetricChip icon="progress" label="ACTUEL" value={`${Math.round(prescription.current)}/100`} tone="cyan" />
              <MetricChip icon="diagnosis" label="OBJECTIF" value={`${prescription.goal}/100`} tone="purple" />
              <MetricChip icon="skills" label="ÉCART" value={prescription.gap <= 0 ? "Atteint" : `${Math.ceil(prescription.gap)} pts`} tone={prescription.gap <= 0 ? "green" : "gold"} />
            </div>
          </FloatingDetailSheet>}
          {detailSheet === "display" && <FloatingDetailSheet title="Affichage du Centre" eyebrow="PRÉFÉRENCES" icon="progress" onClose={() => setDetailSheet(null)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              <ActionTile icon="today" tone="green" title="ESSENTIEL" body="Interface légère : seulement les actions et repères importants." onClick={() => { setViewMode("essential"); setDetailSheet(null); }} />
              <ActionTile icon="progress" tone="purple" title="COMPLET" body="Toutes les analyses, cycles, historiques et réglages avancés." onClick={() => { setViewMode("complete"); setDetailSheet(null); }} />
            </div>
            <button type="button" onClick={() => { setDetailSheet(null); setShowQuickGuide(true); }} style={{ width: "100%", marginTop: 9, padding: 9, borderRadius: 11, border: "1px solid rgba(39,220,255,.15)", background: "rgba(39,220,255,.05)", color: "inherit", fontSize: 7.5, fontWeight: 950, cursor: "pointer" }}>OUVRIR LE GUIDE EXPRESS</button>
          </FloatingDetailSheet>}
          {detailSheet === "resume" && programDraft && <FloatingDetailSheet title={programDraft.programTitle} eyebrow="PROGRAMME INTERROMPU" icon="history" onClose={() => setDetailSheet(null)}>
            <div style={{ fontSize: 9, lineHeight: 1.5, opacity: .68 }}>Étape {programDraft.nextStepIndex + 1}/{programDraft.exerciseIds.length} • {programDraft.completedSteps.length} déjà enregistrée{programDraft.completedSteps.length > 1 ? "s" : ""}.</div>
            <div style={{ marginTop: 4, fontSize: 7.2, opacity: .42 }}>Sauvegardé {new Date(programDraft.savedAt).toLocaleString()}</div>
            <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
              <button type="button" disabled={!resolved.length} onClick={() => { setDetailSheet(null); resumeProgramDraft(); }} style={{ flex: 1, padding: 10, borderRadius: 11, border: "1px solid rgba(255,216,107,.32)", background: "rgba(255,216,107,.08)", color: "inherit", fontSize: 8, fontWeight: 950, cursor: "pointer" }}>REPRENDRE</button>
              <button type="button" onClick={() => { clearTrainingProgramDraft(accountParticipantId || null); setDetailSheet(null); }} style={{ padding: "10px 12px", borderRadius: 11, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", color: "inherit", fontSize: 8, fontWeight: 900, cursor: "pointer" }}>ABANDONNER</button>
            </div>
          </FloatingDetailSheet>}
          {detailSheet === "followup" && nextRecommendation && <FloatingDetailSheet title={nextRecommendation.headline} eyebrow="SUITE CONSEILLÉE" icon="cycle" onClose={() => setDetailSheet(null)}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><MetricChip icon="today" label="DURÉE" value={`${nextRecommendation.durationMin} min`} tone="cyan" /><MetricChip icon={nextRecommendation.family} label="FOCUS" value={nextRecommendation.familyLabel} tone="purple" /></div>
            <div style={{ marginTop: 10, fontSize: 8.8, lineHeight: 1.5, opacity: .66 }}>{nextRecommendation.body}</div>
            <button type="button" onClick={() => { setDetailSheet(null); setTab("program"); prepareRecommendedSession(nextRecommendation.durationMin, nextRecommendation.family); }} style={{ width: "100%", marginTop: 11, padding: 10, borderRadius: 11, border: "1px solid rgba(185,156,255,.28)", background: "rgba(140,90,255,.08)", color: "inherit", fontSize: 8, fontWeight: 950, cursor: "pointer" }}>PRÉPARER CETTE SÉANCE</button>
          </FloatingDetailSheet>}
          {detailSheet?.startsWith("mabull:") && (() => { const item = MABULL_REFERENCE_CATALOG.find((row) => row.id === detailSheet.slice(7)); if (!item) return null; return <FloatingDetailSheet title={item.title} eyebrow={item.status === "mapped" ? "ÉQUIVALENT JOUABLE" : item.kind === "technique" ? "FICHE TECHNIQUE" : "RÈGLES À RELEVER"} icon={item.family || "coach"} onClose={() => setDetailSheet(null)}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{item.tags.map((tag) => <span key={tag} style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.055)", fontSize: 6.5, opacity: .68 }}>{tag}</span>)}</div>
            {item.status === "mapped" && item.mappedExerciseId ? <div style={{ marginTop: 11, fontSize: 8.8, lineHeight: 1.5, opacity: .7 }}>Cette entrée possède déjà un équivalent sûr dans notre moteur Training.</div> : item.kind === "technique" ? <div style={{ marginTop: 11, fontSize: 8.8, lineHeight: 1.5, opacity: .7 }}>Cette fiche attend son contenu détaillé : objectif pédagogique, points clés, erreurs fréquentes et consigne pratique.</div> : <div style={{ marginTop: 11 }}><div style={{ fontSize: 8.4, fontWeight: 950 }}>POUR LA RENDRE JOUABLE</div><div style={{ marginTop: 6, display: "grid", gap: 5, fontSize: 7.6, lineHeight: 1.4, opacity: .64 }}><span>① Objectif exact de l’exercice</span><span>② Nombre de fléchettes / tours / vies</span><span>③ Règle de score ou de progression</span><span>④ Condition de réussite / fin</span></div></div>}
          </FloatingDetailSheet>; })()}
          <div style={{ marginTop: 10, padding: 12, borderRadius: 18, border: "1px solid rgba(39,220,255,.18)", background: "linear-gradient(145deg,rgba(39,220,255,.055),rgba(255,255,255,.02))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", flex: "0 0 auto", border: "1px solid rgba(39,220,255,.28)", background: "rgba(39,220,255,.08)", fontSize: 15, fontWeight: 950 }}>
                {accountParticipant?.avatarUrl || accountParticipant?.avatarDataUrl ? <img src={String(accountParticipant.avatarUrl || accountParticipant.avatarDataUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (accountParticipant?.name || "M").slice(0,1).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 7.1, letterSpacing: 1, fontWeight: 950, color: "#27dcff" }}>ENTRAÎNEMENT PERSONNEL</div>
                <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, fontSize: 12.6, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{accountParticipant?.name || "Compte utilisateur requis"}</div>
                  <span style={{ padding: "4px 7px", borderRadius: 999, fontSize: 6.7, fontWeight: 950, border: "1px solid rgba(80,255,174,.18)", background: "rgba(80,255,174,.07)", color: "#8cffcb" }}>SOLO</span>
                </div>
                <div style={{ marginTop: 3, fontSize: 7.2, lineHeight: 1.35, opacity: .52 }}>{accountParticipant ? "Ton compte pilote le centre, les statistiques et toute la progression." : "Connecte ou active un profil de compte pour utiliser le Centre."}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
              <MetricChip icon="history" label="SÉANCES" value={`${labSessions.length} enregistrées`} tone="cyan" />
              <MetricChip icon="today" label="PLAN" value={`${dailyPlan.durationMin} min aujourd’hui`} tone="green" />
              <MetricChip icon="progress" label="NIVEAU" value={`${Math.round(assessment.overallScore || career.averagePerformance || 0)}/100`} tone="gold" />
            </div>
          </div>

          {viewMode === "essential" && <div style={{ marginTop: 10, padding: 13, borderRadius: 18, border: "1px solid rgba(39,220,255,.18)", background: "linear-gradient(145deg,rgba(39,220,255,.065),rgba(140,90,255,.035))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 7.8, fontWeight: 950, letterSpacing: 1, color: "#8cffcb" }}>DÉMARRE ICI</div>
                <div style={{ marginTop: 3, fontSize: 15, fontWeight: 950 }}>Une action, puis on joue.</div>
                <div style={{ marginTop: 3, fontSize: 7.8, opacity: .54 }}>Choisis simplement l’écran qui correspond à ton besoin.</div>
              </div>
              <div style={{ padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)", fontSize: 6.8, fontWeight: 900, opacity: .72 }}>{quickStart.eyebrow}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 11 }}>
              <ActionTile icon="today" tone="green" disabled={!resolved.length} onClick={runQuickStart} title="JOUER MAINTENANT" body={resolved.length ? quickStart.cta : "Compte utilisateur requis"} />
              <ActionTile icon="exercises" tone="gold" onClick={() => { setTab("exercises"); setExercisePanel("path"); }} title="TRAVAILLER UN POINT" body="Choisis une compétence ou laisse-toi guider par le parcours." />
              <ActionTile icon="diagnosis" tone="purple" onClick={() => { setTab("diagnosis"); setDiagnosisPanel("overview"); }} title="VOIR MON NIVEAU" body={`${Math.round(assessment.overallScore || career.averagePerformance || 0)}/100 • ${playerJourney.headline}`} />
            </div>
          </div>}

          {viewMode === "essential" ? <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 6, alignItems: "center" }}>
            <button type="button" onClick={() => setDetailSheet("coach")} style={{ minWidth: 0, height: 44, padding: "0 10px", borderRadius: 13, border: "1px solid rgba(39,220,255,.20)", background: "linear-gradient(135deg,rgba(39,220,255,.08),rgba(140,90,255,.035))", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
              <span style={{ width: 27, height: 27, borderRadius: 9, display: "grid", placeItems: "center", background: "rgba(39,220,255,.08)", color: "#27dcff" }}><HubGlyph name="coach" size={14}/></span>
              <span style={{ minWidth: 0, flex: 1 }}><span style={{ display: "block", fontSize: 6.4, fontWeight: 950, color: "#27dcff", letterSpacing: .7 }}>AWENA</span><span style={{ display: "block", marginTop: 2, fontSize: 8.1, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prescription.title}</span></span>
              <span style={{ fontSize: 6.5, fontWeight: 950, opacity: .6 }}>{prescription.gap <= 0 ? "✓" : `+${Math.ceil(prescription.gap)}`}</span>
            </button>
            {programDraft && <button type="button" title="Programme interrompu" aria-label="Programme interrompu" onClick={() => setDetailSheet("resume")} style={{ width: 44, height: 44, borderRadius: 13, border: "1px solid rgba(255,216,107,.22)", background: "rgba(255,216,107,.06)", color: "#ffd86b", cursor: "pointer", display: "grid", placeItems: "center", position: "relative" }}><HubGlyph name="history" size={16}/><span style={{ position: "absolute", right: 5, top: 4, width: 7, height: 7, borderRadius: 999, background: "#ffd86b" }}/></button>}
            <button type="button" title="Affichage et guide" aria-label="Affichage et guide" onClick={() => setDetailSheet("display")} style={{ width: 44, height: 44, borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><HubGlyph name="progress" size={16}/></button>
          </div> : <>
            <div style={{ marginTop: 10, padding: 10, borderRadius: 14, border: "1px solid rgba(39,220,255,.28)", background: "linear-gradient(135deg,rgba(39,220,255,.12),rgba(140,90,255,.07))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 8.5, fontWeight: 950, letterSpacing: 1.1, color: "#27dcff" }}>COACH AWENA</div><div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 950 }}>{prescription.title}</div><div style={{ marginTop: 3, fontSize: 9.2, lineHeight: 1.35, opacity: .72 }}>{prescription.body}</div></div>
                <button type="button" onClick={() => setDetailSheet("coach")} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(39,220,255,.18)", background: "rgba(39,220,255,.05)", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><HubGlyph name="diagnosis" size={15}/></button>
              </div>
            </div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}><button type="button" onClick={() => setDetailSheet("display")} style={{ padding: "7px 9px", borderRadius: 10, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)", color: "inherit", fontSize: 7.2, fontWeight: 950, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><HubGlyph name="progress" size={13}/> AFFICHAGE / GUIDE</button></div>
          </>}

          {tab === "program" && viewMode === "complete" && programDraft && <div style={{ marginTop: 10, padding: 10, borderRadius: 14, border: "1px solid rgba(255,216,107,.24)", background: "rgba(255,216,107,.045)", display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(255,216,107,.08)", color: "#ffd86b" }}><HubGlyph name="history" size={15}/></span><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 7, fontWeight: 950, color: "#ffd86b" }}>PROGRAMME INTERROMPU</div><div style={{ marginTop: 2, fontSize: 8.4, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{programDraft.programTitle} · étape {programDraft.nextStepIndex + 1}/{programDraft.exerciseIds.length}</div></div><button type="button" onClick={() => setDetailSheet("resume")} style={{ padding: "7px 9px", borderRadius: 9, border: "1px solid rgba(255,216,107,.20)", background: "rgba(255,216,107,.06)", color: "inherit", fontSize: 7, fontWeight: 950, cursor: "pointer" }}>OUVRIR</button></div>}

          {tab === "program" && nextRecommendation && <button type="button" onClick={() => setDetailSheet("followup")} style={{ width: "100%", marginTop: 8, padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(185,156,255,.14)", background: "rgba(140,90,255,.035)", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}><span style={{ width: 26, height: 26, borderRadius: 9, display: "grid", placeItems: "center", background: "rgba(185,156,255,.07)", color: "#b99cff" }}><HubGlyph name="cycle" size={13}/></span><span style={{ minWidth: 0, flex: 1 }}><span style={{ display: "block", fontSize: 6.4, fontWeight: 950, color: "#b99cff" }}>SUITE CONSEILLÉE</span><span style={{ display: "block", marginTop: 2, fontSize: 7.8, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nextRecommendation.headline}</span></span><span style={{ fontSize: 6.7, opacity: .5 }}>{nextRecommendation.durationMin}′</span></button>}

          <CompactIconNav items={tabs} activeId={tab} onChange={(id) => setTab(id as HubTab)} stickyTop={0} />

          {tab === "program" && <div>
            {viewMode === "complete" && <CompactIconNav items={programPanels.map((item) => ({ ...item, status: item.id === "today" ? `${dailyPlan.durationMin} MIN` : item.id === "week" ? `${weeklyPlan.completed}/${weeklyPlan.target}` : item.id === "cycle" ? `${cycleCoach.completedSessions}/${cycleCoach.cycleSize}` : `${programs.length} PLANS` }))} activeId={programPanel} onChange={(id) => setProgramPanel(id as ProgramPanel)} stickyTop={48} />}

            {programPanel === "today" && <>
            {viewMode === "essential" && <CompactIconNav items={todayPanels} activeId={todayPanel} onChange={(id) => setTodayPanel(id as TodayPanel)} tone="gold" />}
            {(viewMode === "complete" || todayPanel === "challenge") && <div style={{ marginTop: 8, padding: 11, borderRadius: 15, border: dailyChallenge.completed ? "1px solid rgba(80,255,174,.26)" : "1px solid rgba(255,216,107,.24)", background: dailyChallenge.completed ? "linear-gradient(135deg,rgba(80,255,174,.075),rgba(39,220,255,.025))" : "linear-gradient(135deg,rgba(255,216,107,.07),rgba(140,90,255,.025))" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 7.3, fontWeight: 950, letterSpacing: .8, color: dailyChallenge.completed ? "#8cffcb" : "#ffd86b" }}>{dailyChallenge.completed ? "✓ DÉFI VALIDÉ" : "★ DÉFI DU JOUR"}</div>
                  <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dailyChallenge.headline}</div>
                  <div style={{ marginTop: 3, fontSize: 7.8, opacity: .55, lineHeight: 1.35 }}>{dailyChallenge.body}</div>
                  <div style={{ marginTop: 5, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 6px", borderRadius: 999, background: dailyChallenge.rotated ? "rgba(185,156,255,.08)" : "rgba(39,220,255,.07)", border: dailyChallenge.rotated ? "1px solid rgba(185,156,255,.16)" : "1px solid rgba(39,220,255,.14)", fontSize: 6.7, fontWeight: 900, opacity: .78 }}>{dailyChallenge.rotated ? "↻" : "◎"} {dailyChallenge.rotationLabel}</div>
                </div>
                <div style={{ flex: "0 0 auto", textAlign: "right", minWidth: 66 }}>
                  <div style={{ fontSize: 7, opacity: .5 }}>SÉRIE</div>
                  <div style={{ fontSize: 13, fontWeight: 950 }}>{dailyChallenge.streakDays} 🔥</div>
                  <div style={{ marginTop: 5, padding: "4px 6px", borderRadius: 8, background: dailyChallenge.completed ? "rgba(255,216,107,.08)" : "rgba(255,255,255,.025)", border: dailyChallenge.completed ? "1px solid rgba(255,216,107,.16)" : "1px solid rgba(255,255,255,.05)" }}>
                    <div style={{ fontSize: 6.2, opacity: .48 }}>MÉDAILLE</div>
                    <div style={{ marginTop: 1, fontSize: 7.6, fontWeight: 950, color: dailyChallenge.completed ? "#ffd86b" : "inherit" }}>{dailyChallenge.reward.icon} {dailyChallenge.reward.label}</div>
                  </div>
                </div>
              </div>
              {(dailyChallenge.completed || dailyChallenge.bestScore > 0) && <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 10, background: "rgba(255,216,107,.035)", border: "1px solid rgba(255,216,107,.08)" }}>
                <div style={{ fontSize: 7.2, fontWeight: 900, opacity: .62 }}>MEILLEUR DU JOUR <strong style={{ color: "inherit", opacity: 1 }}>{Math.round(dailyChallenge.bestScore)}/100</strong></div>
                <div style={{ fontSize: 7.2, fontWeight: 950, color: dailyChallenge.reward.nextScore ? "#ffd86b" : "#8cffcb" }}>{dailyChallenge.reward.nextScore ? `${dailyChallenge.reward.nextLabel} À ${dailyChallenge.reward.nextScore}` : "DIAMANT DÉCROCHÉ"}</div>
              </div>}
              <div style={{ marginTop: 8, padding: "8px 9px", borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.055)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 7.2, fontWeight: 900, opacity: .62 }}>PROCHAIN TROPHÉE</div>
                  <div style={{ fontSize: 7.2, fontWeight: 950, color: dailyChallenge.nextMilestoneDays ? "#ffd86b" : "#8cffcb" }}>{dailyChallenge.nextMilestoneDays ? `${dailyChallenge.nextMilestoneDays} J · ${dailyChallenge.nextMilestoneLabel}` : dailyChallenge.nextMilestoneLabel}</div>
                </div>
                <div style={{ marginTop: 6, height: 5, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.06)" }}><div style={{ width: `${Math.max(3, dailyChallenge.milestoneProgressPct)}%`, height: "100%", background: "linear-gradient(90deg,#ffd86b,#ffb86b)" }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 5, marginTop: 7 }}>
                  {dailyChallenge.milestones.map((milestone) => <div key={milestone.days} title={`${milestone.days} jours • ${milestone.label}`} style={{ flex: 1, minWidth: 0, textAlign: "center", padding: "5px 3px", borderRadius: 8, border: milestone.unlocked ? "1px solid rgba(255,216,107,.20)" : "1px solid rgba(255,255,255,.04)", background: milestone.unlocked ? "rgba(255,216,107,.07)" : "rgba(255,255,255,.015)", opacity: milestone.unlocked ? 1 : .42 }}>
                    <div style={{ fontSize: 10 }}>{milestone.icon}</div><div style={{ marginTop: 1, fontSize: 6.6, fontWeight: 950 }}>{milestone.days}J</div>
                  </div>)}
                </div>
              </div>
              {!dailyChallenge.completed && <button type="button" disabled={!resolved.length} onClick={startDailyChallenge} style={{ width: "100%", marginTop: 8, padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(255,216,107,.30)", background: "rgba(255,216,107,.08)", color: "inherit", fontSize: 8.3, fontWeight: 950, cursor: resolved.length ? "pointer" : "not-allowed", opacity: resolved.length ? 1 : .45 }}>RELEVER LE DÉFI · {dailyChallenge.exerciseTitle}</button>}
            </div>}
            {(viewMode === "complete" || todayPanel === "plan") && <div style={{ marginTop: 8, padding: 14, borderRadius: 17, border: actionCoach.tone === "amber" ? "1px solid rgba(255,184,76,.34)" : actionCoach.tone === "green" ? "1px solid rgba(80,255,174,.30)" : actionCoach.tone === "violet" ? "1px solid rgba(185,156,255,.32)" : "1px solid rgba(39,220,255,.32)", background: actionCoach.tone === "amber" ? "linear-gradient(135deg,rgba(255,184,76,.10),rgba(140,90,255,.035))" : actionCoach.tone === "green" ? "linear-gradient(135deg,rgba(80,255,174,.08),rgba(39,220,255,.035))" : actionCoach.tone === "violet" ? "linear-gradient(135deg,rgba(140,90,255,.10),rgba(39,220,255,.035))" : "linear-gradient(135deg,rgba(39,220,255,.11),rgba(140,90,255,.045))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 300px" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1.1, color: actionCoach.tone === "amber" ? "#ffd86b" : actionCoach.tone === "green" ? "#8cffcb" : actionCoach.tone === "violet" ? "#b99cff" : "#27dcff" }}>{actionCoach.eyebrow}</div>
                  <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950 }}>{actionCoach.title}</div>
                  <div style={{ marginTop: 5, fontSize: 9.8, lineHeight: 1.45, opacity: .68 }}>{actionCoach.body}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button type="button" disabled={!resolved.length} onClick={() => startProgram(dailyPlan.program, { adaptiveDailyPlan: true, dailyPlanDateKey: dailyPlan.dateKey })} style={{ padding: "9px 11px", borderRadius: 11, border: "1px solid rgba(255,255,255,.22)", background: "rgba(255,255,255,.10)", color: "inherit", fontSize: 8.8, fontWeight: 950, cursor: resolved.length ? "pointer" : "not-allowed", opacity: resolved.length ? 1 : .45, whiteSpace: "nowrap" }}>LANCER LE PLAN DU JOUR</button>
                  <button type="button" onClick={() => prepareRecommendedSession(actionCoach.durationMin, actionCoach.family)} style={{ padding: "9px 11px", borderRadius: 11, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.16)", color: "inherit", fontSize: 8.2, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap", opacity: .78 }}>AJUSTER</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
                {[
                  ["1", "ÉCHAUFFE-TOI", "Mets-toi en rythme"],
                  ["2", "POINT DU JOUR", dailyPlan.familyLabel],
                  ["3", "FINISH", "Termine proprement"],
                ].map(([n, title, body]) => <div key={n} style={{ padding: "9px 7px", borderRadius: 11, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.065)", textAlign: "center" }}><div style={{ width: 20, height: 20, margin: "0 auto 4px", borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(39,220,255,.10)", border: "1px solid rgba(39,220,255,.20)", fontSize: 8, fontWeight: 950 }}>{n}</div><div style={{ fontSize: 7.3, fontWeight: 950 }}>{title}</div><div style={{ marginTop: 2, fontSize: 6.8, opacity: .46 }}>{body}</div></div>)}
              </div>
              <button type="button" onClick={() => setShowPlanDetails((v) => !v)} style={{ width: "100%", marginTop: 8, padding: 7, borderRadius: 9, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.12)", color: "inherit", fontSize: 7.4, fontWeight: 900, cursor: "pointer", opacity: .78 }}>{showPlanDetails ? "MASQUER LE CONTENU DU PLAN" : `VOIR LE CONTENU DU PLAN · ${dailyPlan.program.exerciseIds.length} ÉTAPES`}</button>
              <div style={{ display: showPlanDetails ? "grid" : "none", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
                {[actionCoach.weekText, actionCoach.cycleText, actionCoach.blockText].map((text, index) => <div key={index} style={{ padding: "8px 9px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", fontSize: 7.8, lineHeight: 1.35, opacity: .62 }}>{text}</div>)}
              </div>
              <div style={{ display: showPlanDetails ? "block" : "none", marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.14)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 8.2, fontWeight: 950, letterSpacing: .8, opacity: .58 }}>PLAN DU JOUR • {dailyPlan.durationMin} MIN • {dailyPlan.familyLabel}</div>
                  <div style={{ fontSize: 7.4, opacity: .42 }}>INTENSITÉ {dailyPlan.intensity.toUpperCase()}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, dailyPlan.phases.length)},minmax(0,1fr))`, gap: 6, marginTop: 8 }}>
                  {dailyPlan.phases.map((phase) => <div key={phase.id} style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.055)", minWidth: 0 }}>
                    <div style={{ fontSize: 7.2, fontWeight: 950, opacity: .52 }}>{phase.label}</div>
                    <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                      {phase.exerciseIds.map((id, index) => { const ex = TRAINING_EXERCISE_CATALOG.find((exercise) => exercise.id === id); return <div key={`${phase.id}-${id}-${index}`} style={{ fontSize: 7.7, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex?.title || id}</div>; })}
                    </div>
                  </div>)}
                </div>
              </div>
            </div>}
            {(viewMode === "complete" || todayPanel === "assessment") && <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: assessment.due ? "1px solid rgba(255,216,107,.30)" : "1px solid rgba(185,156,255,.20)", background: assessment.due ? "linear-gradient(135deg,rgba(255,216,107,.085),rgba(140,90,255,.035))" : "linear-gradient(135deg,rgba(140,90,255,.065),rgba(39,220,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: assessment.due ? "#ffd86b" : "#b99cff" }}>BILAN DE NIVEAU • 6 COMPÉTENCES</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{assessment.headline}</div>
                  <div style={{ marginTop: 4, fontSize: 9.2, lineHeight: 1.45, opacity: .62 }}>{assessment.body}</div>
                </div>
                <button type="button" disabled={!resolved.length} onClick={() => startProgram(TRAINING_ASSESSMENT_PROGRAM, { adaptiveDailyPlan: false })} style={{ padding: "9px 11px", borderRadius: 11, border: "1px solid rgba(255,216,107,.25)", background: "rgba(255,216,107,.08)", color: "inherit", fontSize: 8.4, fontWeight: 950, cursor: resolved.length ? "pointer" : "not-allowed", opacity: resolved.length ? 1 : .45, whiteSpace: "nowrap" }}>{assessment.available ? "REJOUER LE BILAN" : "LANCER LE BILAN"}</button>
              </div>
              {assessment.available && <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
                  <div style={{ padding: 8, borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 12 }}>{Math.round(assessment.overallScore)}</b><div style={{ fontSize: 6.8, opacity: .42 }}>NIVEAU</div></div>
                  <div style={{ padding: 8, borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 12 }}>{Math.round(assessment.accuracyPct)}%</b><div style={{ fontSize: 6.8, opacity: .42 }}>PRÉCISION</div></div>
                  <div style={{ padding: 8, borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 12, color: "#8cffcb" }}>{assessment.strongestLabel}</b><div style={{ fontSize: 6.8, opacity: .42 }}>POINT FORT</div></div>
                  <div style={{ padding: 8, borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 12, color: "#ffd86b" }}>{assessment.weakestLabel}</b><div style={{ fontSize: 6.8, opacity: .42 }}>À TRAVAILLER</div></div>
                </div>
                <div style={{ marginTop: 7, fontSize: 7.8, opacity: .5 }}>{new Date(assessment.endedAt).toLocaleDateString()} • {assessment.sessionsSinceAssessment} séance{assessment.sessionsSinceAssessment > 1 ? "s" : ""} depuis le bilan{assessment.delta == null ? "" : ` • évolution ${assessment.delta >= 0 ? "+" : ""}${Math.round(assessment.delta)} pts`}</div>
              </>}
            </div>}
            </>}

            {programPanel === "week" && <>
            <div style={{ marginTop: 8, padding: 13, borderRadius: 16, border: "1px solid rgba(80,255,174,.24)", background: "linear-gradient(135deg,rgba(80,255,174,.09),rgba(39,220,255,.045))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#8cffcb" }}>PLAN HEBDOMADAIRE</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{weeklyPlan.completed}/{weeklyPlan.target} séances complètes cette semaine</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, opacity: .62 }}>{weeklyPlan.remaining ? `Encore ${weeklyPlan.remaining} séance${weeklyPlan.remaining > 1 ? "s" : ""} pour tenir le rythme.` : "Objectif hebdomadaire atteint. Awena peut maintenir ou augmenter progressivement la charge."}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <button type="button" onClick={() => updateWeeklyTarget(preferences.weeklySessionTarget - 1)} style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "inherit", cursor: "pointer" }}>−</button>
                  <b style={{ minWidth: 58, textAlign: "center", fontSize: 10 }}>{preferences.weeklySessionTarget}/SEM.</b>
                  <button type="button" onClick={() => updateWeeklyTarget(preferences.weeklySessionTarget + 1)} style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "inherit", cursor: "pointer" }}>+</button>
                </div>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 10 }}><div style={{ width: `${Math.max(2, weeklyPlan.completionPct)}%`, height: "100%", background: "linear-gradient(90deg,#8cffcb,#27dcff)" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 9, textAlign: "center" }}>
                <div style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 12 }}>{weeklyPlan.streakWeeks}</b><div style={{ fontSize: 7.5, opacity: .48 }}>SEMAINES DE SÉRIE</div></div>
                <div style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 12 }}>{weeklyPlan.bestSession ? Math.round(weeklyPlan.bestSession.performanceScore) : 0}</b><div style={{ fontSize: 7.5, opacity: .48 }}>MEILLEURE SÉANCE</div></div>
                <div style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 12 }}>{programSessions.length}</b><div style={{ fontSize: 7.5, opacity: .48 }}>SÉANCES SUIVIES</div></div>
              </div>
              <button type="button" onClick={() => { setProgramId(coachProgram.id); }} style={{ width: "100%", marginTop: 9, padding: 9, borderRadius: 10, border: "1px solid rgba(80,255,174,.28)", background: "rgba(80,255,174,.08)", color: "inherit", fontSize: 9.5, fontWeight: 950, cursor: "pointer" }}>PROCHAINE SÉANCE AWENA • {coachProgram.title}</button>
            </div>

            <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: "1px solid rgba(255,216,107,.22)", background: "linear-gradient(135deg,rgba(255,216,107,.075),rgba(39,220,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#ffd86b" }}>MISSIONS AWENA</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{missionBoard.headline} • {missionBoard.completed}/{missionBoard.total}</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .62 }}>{missionBoard.summary}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {missionBoard.nextMission && <button type="button" onClick={() => prepareRecommendedSession(missionBoard.nextMission!.recommendedDurationMin, missionBoard.nextMission!.family)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,216,107,.28)", background: "rgba(255,216,107,.08)", color: "inherit", fontSize: 8.5, fontWeight: 950, cursor: "pointer" }}>MISSION SUIVANTE</button>}
                  <button type="button" onClick={() => setShowMissionDetails((v) => !v)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", color: "inherit", fontSize: 7.8, fontWeight: 900, cursor: "pointer" }}>{showMissionDetails ? "MASQUER" : "VOIR TOUTES"}</button>
                </div>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 10 }}><div style={{ width: `${Math.max(2, missionBoard.completionPct)}%`, height: "100%", background: "linear-gradient(90deg,#ffd86b,#27dcff,#8c5aff)" }} /></div>
              <div style={{ display: showMissionDetails ? "grid" : "none", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 7, marginTop: 10 }}>
                {missionBoard.missions.map((mission) => {
                  const ratio = Math.max(0, Math.min(100, (mission.progress / Math.max(1, mission.target)) * 100));
                  return <div key={mission.id} style={{ padding: 10, borderRadius: 12, border: mission.completed ? "1px solid rgba(80,255,174,.22)" : "1px solid rgba(255,255,255,.075)", background: mission.completed ? "rgba(80,255,174,.05)" : "rgba(255,255,255,.025)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 9.5 }}>{mission.completed ? "✓ " : ""}{mission.title}</b><span style={{ fontSize: 8, color: mission.completed ? "#8cffcb" : "#ffd86b" }}>{Math.round(mission.progress)}/{mission.target}{mission.unit === "%" ? "%" : ""}</span></div>
                    <div style={{ marginTop: 4, minHeight: 28, fontSize: 8, lineHeight: 1.35, opacity: .5 }}>{mission.description}</div>
                    <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden", marginTop: 7 }}><div style={{ width: `${Math.max(2, ratio)}%`, height: "100%", background: mission.completed ? "linear-gradient(90deg,#8cffcb,#27dcff)" : "linear-gradient(90deg,#ffd86b,#8c5aff)" }} /></div>
                  </div>;
                })}
              </div>
            </div>
            </>}

            {programPanel === "cycle" && <>
            <div style={{ marginTop: 8, padding: 12, borderRadius: 15, border: cycleComparison.direction === "up" ? "1px solid rgba(80,255,174,.22)" : cycleComparison.direction === "down" ? "1px solid rgba(255,184,76,.24)" : "1px solid rgba(255,255,255,.09)", background: cycleComparison.direction === "up" ? "rgba(80,255,174,.045)" : cycleComparison.direction === "down" ? "rgba(255,184,76,.045)" : "rgba(255,255,255,.025)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 8.5, fontWeight: 950, letterSpacing: 1, opacity: .58 }}>COMPARAISON DE CYCLES</div>
                  <div style={{ marginTop: 3, fontSize: 12, fontWeight: 950 }}>{cycleComparison.headline}</div>
                  <div style={{ marginTop: 3, fontSize: 8.8, opacity: .56 }}>4 dernières séances vs 4 précédentes • régularité {Math.round(cycleComparison.consistency)}/100</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,auto)", gap: 6, textAlign: "center" }}>
                  <div style={{ padding: "6px 8px", borderRadius: 9, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 11 }}>{Math.round(cycleComparison.recentAverage)}</b><div style={{ fontSize: 6.8, opacity: .43 }}>ACTUEL</div></div>
                  <div style={{ padding: "6px 8px", borderRadius: 9, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 11 }}>{cycleComparison.previousSessions ? Math.round(cycleComparison.previousAverage) : "—"}</b><div style={{ fontSize: 6.8, opacity: .43 }}>AVANT</div></div>
                  <div style={{ padding: "6px 8px", borderRadius: 9, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 11, color: cycleComparison.delta > 3 ? "#8cffcb" : cycleComparison.delta < -3 ? "#ffd86b" : "inherit" }}>{cycleComparison.previousSessions ? `${cycleComparison.delta > 0 ? "+" : ""}${Math.round(cycleComparison.delta)}` : "—"}</b><div style={{ fontSize: 6.8, opacity: .43 }}>DELTA</div></div>
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setShowCycleDetails((v) => !v)} style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", color: "inherit", fontSize: 7.8, fontWeight: 900, cursor: "pointer" }}>{showCycleDetails ? "MASQUER LES DÉTAILS COACH" : "VOIR LES DÉTAILS DU CAP"}</button>
            <div style={{ display: showCycleDetails ? "block" : "none" }}>

            <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: adaptationCoach.status === "progressing" ? "1px solid rgba(80,255,174,.24)" : adaptationCoach.status === "plateau" || adaptationCoach.status === "regressing" ? "1px solid rgba(255,184,76,.26)" : "1px solid rgba(39,220,255,.18)", background: adaptationCoach.status === "progressing" ? "linear-gradient(135deg,rgba(80,255,174,.06),rgba(39,220,255,.035))" : adaptationCoach.status === "plateau" || adaptationCoach.status === "regressing" ? "linear-gradient(135deg,rgba(255,184,76,.07),rgba(140,90,255,.035))" : "rgba(255,255,255,.025)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: adaptationCoach.status === "progressing" ? "#8cffcb" : adaptationCoach.status === "plateau" || adaptationCoach.status === "regressing" ? "#ffd86b" : "#27dcff" }}>PILOTAGE AWENA • {adaptationCoach.label}</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{adaptationCoach.headline}</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .64 }}>{adaptationCoach.summary}</div>
                </div>
                <button type="button" onClick={() => prepareRecommendedSession(adaptationCoach.recommendedDurationMin, adaptationCoach.recommendedFamily)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(39,220,255,.22)", background: "rgba(39,220,255,.07)", color: "inherit", fontSize: 8.5, fontWeight: 950, cursor: "pointer" }}>{adaptationCoach.actionLabel} • {adaptationCoach.recommendedDurationMin} MIN</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10, textAlign: "center" }}>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{programSessions.length >= 4 ? Math.round(adaptationCoach.recentAverage) : "—"}</b><div style={{ fontSize: 7, opacity: .45 }}>4 DERNIÈRES</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{programSessions.length >= 8 ? Math.round(adaptationCoach.previousAverage) : "—"}</b><div style={{ fontSize: 7, opacity: .45 }}>4 AVANT</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{programSessions.length >= 8 ? `${adaptationCoach.delta > 0 ? "+" : ""}${Math.round(adaptationCoach.delta)}` : "—"}</b><div style={{ fontSize: 7, opacity: .45 }}>DELTA</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{programSessions.length >= 4 ? Math.round(adaptationCoach.consistency) : "—"}</b><div style={{ fontSize: 7, opacity: .45 }}>RÉGULARITÉ</div></div>
              </div>
              {adaptationCoach.targetRequiredAverage !== null && <div style={{ marginTop: 8, padding: 9, borderRadius: 10, background: adaptationCoach.targetFeasible ? "rgba(80,255,174,.035)" : "rgba(255,184,76,.055)", border: adaptationCoach.targetFeasible ? "1px solid rgba(80,255,174,.12)" : "1px solid rgba(255,184,76,.18)", fontSize: 8.8, lineHeight: 1.4, opacity: .75 }}><b>Cible du bloc :</b> il faut environ {Math.round(adaptationCoach.targetRequiredAverage)}/100 de moyenne sur les {blockCoach.remainingSessions} séance{blockCoach.remainingSessions > 1 ? "s" : ""} restante{blockCoach.remainingSessions > 1 ? "s" : ""}.{!adaptationCoach.targetFeasible ? " Awena considère la cible trop agressive : privilégie d’abord la reconstruction du niveau." : ""}</div>}
            </div>

            <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: "1px solid rgba(39,220,255,.20)", background: "linear-gradient(135deg,rgba(39,220,255,.065),rgba(140,90,255,.045))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>BLOC DE PROGRESSION AWENA • 12 SÉANCES</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{blockCoach.headline}</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .64 }}>{blockCoach.summary}</div>
                </div>
                <button type="button" onClick={() => prepareRecommendedSession(loadSummary.recommendedDurationMin, blockCoach.recommendedFamily)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(39,220,255,.24)", background: "rgba(39,220,255,.08)", color: "inherit", fontSize: 8.5, fontWeight: 950, cursor: "pointer" }}>POURSUIVRE • {blockCoach.recommendedLabel.toUpperCase()}</button>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 10 }}><div style={{ width: `${Math.max(2, blockCoach.completionPct)}%`, height: "100%", background: "linear-gradient(90deg,#27dcff,#8c5aff,#ffd86b)" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 9, textAlign: "center" }}>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{blockCoach.completedSessions}/{blockCoach.blockSize}</b><div style={{ fontSize: 7, opacity: .45 }}>SÉANCES</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{blockCoach.completedCycles}/3</b><div style={{ fontSize: 7, opacity: .45 }}>CYCLES</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{blockCoach.completedSessions ? Math.round(blockCoach.currentAverage) : "—"}</b><div style={{ fontSize: 7, opacity: .45 }}>MOY. / {blockCoach.targetAverage}</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{blockCoach.familyCoverage}/{blockCoach.familyCoverageTarget}</b><div style={{ fontSize: 7, opacity: .45 }}>COUVERTURE</div></div>
              </div>
              <div style={{ marginTop: 8, padding: 9, borderRadius: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", fontSize: 8.8, lineHeight: 1.4, opacity: .7 }}><b>Prochain jalon :</b> {blockCoach.milestone}</div>
              {!!blockCoach.cycles.length && <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 8 }}>
                {blockCoach.cycles.map((cycle) => <div key={cycle.cycleNumber} style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.12)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 7.5, opacity: .5 }}><span>CYCLE {cycle.cycleNumber}</span><span>{cycle.sessions}/4</span></div>
                  <div style={{ marginTop: 3, fontSize: 12, fontWeight: 950 }}>{Math.round(cycle.average)}<span style={{ fontSize: 7.5, opacity: .45 }}>/100</span></div>
                  <div style={{ marginTop: 2, fontSize: 7, opacity: .48 }}>{cycle.dominantLabel} • rég. {Math.round(cycle.consistency)}</div>
                </div>)}
              </div>}
            </div>

            {blockHandoff.justStartedNewBlock && blockHandoff.latest && <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: blockHandoff.latest.outcome === "rebuild" ? "1px solid rgba(255,184,76,.28)" : "1px solid rgba(80,255,174,.26)", background: blockHandoff.latest.outcome === "rebuild" ? "linear-gradient(135deg,rgba(255,184,76,.08),rgba(140,90,255,.035))" : "linear-gradient(135deg,rgba(80,255,174,.07),rgba(39,220,255,.04))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: blockHandoff.latest.outcome === "rebuild" ? "#ffd86b" : "#8cffcb" }}>BILAN DE BLOC • {blockHandoff.latest.outcomeLabel}</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{blockHandoff.latest.headline}</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .64 }}>{blockHandoff.latest.summary}</div>
                </div>
                <button type="button" onClick={() => prepareRecommendedSession(loadSummary.recommendedDurationMin, blockHandoff.recommendedFamily)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(80,255,174,.24)", background: "rgba(80,255,174,.07)", color: "inherit", fontSize: 8.5, fontWeight: 950, cursor: "pointer" }}>OUVRIR LE BLOC {blockHandoff.nextBlockNumber} • {blockHandoff.recommendedLabel.toUpperCase()}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10, textAlign: "center" }}>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{Math.round(blockHandoff.latest.average)}</b><div style={{ fontSize: 7, opacity: .45 }}>MOYENNE</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{Math.round(blockHandoff.latest.consistency)}</b><div style={{ fontSize: 7, opacity: .45 }}>RÉGULARITÉ</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{blockHandoff.latest.familyCoverage}/6</b><div style={{ fontSize: 7, opacity: .45 }}>COUVERTURE</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{blockHandoff.latest.bestScore ? Math.round(blockHandoff.latest.bestScore) : "—"}</b><div style={{ fontSize: 7, opacity: .45 }}>MEILLEURE</div></div>
              </div>
              <div style={{ marginTop: 8, padding: 9, borderRadius: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", fontSize: 8.8, lineHeight: 1.4, opacity: .72 }}><b>Passage au bloc {blockHandoff.nextBlockNumber} :</b> nouvelle cible {blockHandoff.targetAverage}/100 • priorité d’ouverture {blockHandoff.recommendedLabel}. Aucune donnée n’est remise à zéro : le nouveau bloc repart de la référence réellement atteinte.</div>
            </div>}

            <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: cycleCoach.onTrack ? "1px solid rgba(80,255,174,.22)" : "1px solid rgba(255,184,76,.24)", background: cycleCoach.onTrack ? "linear-gradient(135deg,rgba(80,255,174,.055),rgba(39,220,255,.035))" : "linear-gradient(135deg,rgba(255,184,76,.07),rgba(140,90,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 250px" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: cycleCoach.onTrack ? "#8cffcb" : "#ffd86b" }}>CAP DE CYCLE AWENA • 4 SÉANCES</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{cycleCoach.headline}</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .64 }}>{cycleCoach.summary}</div>
                </div>
                <button type="button" onClick={() => prepareRecommendedSession(loadSummary.recommendedDurationMin, cycleCoach.priority.family)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(39,220,255,.22)", background: "rgba(39,220,255,.07)", color: "inherit", fontSize: 8.5, fontWeight: 950, cursor: "pointer" }}>TRAVAILLER {cycleCoach.priority.label.toUpperCase()}</button>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 10 }}><div style={{ width: `${Math.max(2, cycleCoach.completionPct)}%`, height: "100%", background: "linear-gradient(90deg,#8cffcb,#27dcff,#8c5aff)" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10, textAlign: "center" }}>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{cycleCoach.completedSessions}/{cycleCoach.cycleSize}</b><div style={{ fontSize: 7, opacity: .45 }}>SÉANCES</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{cycleCoach.completedSessions ? Math.round(cycleCoach.currentAverage) : "—"}</b><div style={{ fontSize: 7, opacity: .45 }}>MOY. / {cycleCoach.targetAverage}</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{cycleCoach.focusCompleted}/{cycleCoach.focusTarget}</b><div style={{ fontSize: 7, opacity: .45 }}>FOCUS</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{cycleCoach.varietyCompleted}/{cycleCoach.varietyTarget}</b><div style={{ fontSize: 7, opacity: .45 }}>VARIÉTÉ</div></div>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 7, flexWrap: "wrap", fontSize: 8.2, opacity: .56 }}>
                <span>Priorité : <b>{cycleCoach.priority.label}</b> ({cycleCoach.priority.reason})</span>
                <span>• Relais : <b>{cycleCoach.secondary.label}</b></span>
              </div>
            </div>
            </div>
            </>}

            {programPanel === "week" && <>
            <div style={{ marginTop: 8, padding: 13, borderRadius: 16, border: loadSummary.status === "recovery" || loadSummary.status === "high" ? "1px solid rgba(255,184,76,.28)" : "1px solid rgba(39,220,255,.20)", background: loadSummary.status === "recovery" || loadSummary.status === "high" ? "linear-gradient(135deg,rgba(255,184,76,.08),rgba(255,255,255,.02))" : "linear-gradient(135deg,rgba(39,220,255,.07),rgba(140,90,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: loadSummary.status === "recovery" || loadSummary.status === "high" ? "#ffd86b" : "#27dcff" }}>CHARGE & FORME</div>
                  <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{loadSummary.statusLabel}</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .64 }}>{loadSummary.statusMessage} {loadSummary.recommendedAction}</div>
                </div>
                <div style={{ padding: "8px 10px", borderRadius: 11, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)", textAlign: "center" }}>
                  <div style={{ fontSize: 7.5, opacity: .5 }}>PROCHAINE DURÉE</div>
                  <b style={{ display: "block", marginTop: 2, fontSize: 17 }}>{loadSummary.recommendedDurationMin}<span style={{ fontSize: 9, opacity: .55 }}> MIN</span></b>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10, textAlign: "center" }}>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{loadSummary.last7Sessions}</b><div style={{ fontSize: 7, opacity: .45 }}>SÉANCES / 7J</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{loadSummary.last7Minutes}</b><div style={{ fontSize: 7, opacity: .45 }}>MINUTES / 7J</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11 }}>{loadSummary.activeDays7}</b><div style={{ fontSize: 7, opacity: .45 }}>JOURS ACTIFS</div></div>
                <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.03)" }}><b style={{ fontSize: 11, color: loadSummary.formDelta > 5 ? "#8cffcb" : loadSummary.formDelta < -5 ? "#ffd86b" : "inherit" }}>{loadSummary.formDelta > 0 ? "+" : ""}{Math.round(loadSummary.formDelta)}</b><div style={{ fontSize: 7, opacity: .45 }}>FORME</div></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, marginTop: 10 }}>
                {loadSummary.calendar.map((day) => <div key={day.dayStart} title={`${day.sessions} séance(s) • ${day.minutes} min`} style={{ textAlign: "center", padding: "6px 2px", borderRadius: 8, border: day.sessions ? "1px solid rgba(39,220,255,.18)" : "1px solid rgba(255,255,255,.055)", background: day.sessions ? "rgba(39,220,255,.07)" : "rgba(255,255,255,.018)" }}>
                  <div style={{ fontSize: 6.5, opacity: .45 }}>{day.label}</div>
                  <div style={{ marginTop: 3, fontSize: 10, fontWeight: 950 }}>{day.sessions || "·"}</div>
                  <div style={{ marginTop: 1, fontSize: 6.5, opacity: .42 }}>{day.minutes ? `${day.minutes}m` : "—"}</div>
                </div>)}
              </div>
              <button type="button" onClick={() => prepareRecommendedSession(loadSummary.recommendedDurationMin, recommendedFamily)} style={{ width: "100%", marginTop: 9, padding: 9, borderRadius: 10, border: "1px solid rgba(39,220,255,.20)", background: "rgba(39,220,255,.06)", color: "inherit", fontSize: 9, fontWeight: 950, cursor: "pointer" }}>PRÉPARER LA SÉANCE CONSEILLÉE • {loadSummary.recommendedDurationMin} MIN • {TRAINING_FAMILY_META[recommendedFamily].label.toUpperCase()}</button>
            </div>

            <div style={{ marginTop: 10, padding: 13, borderRadius: 16, border: "1px solid rgba(140,90,255,.22)", background: "linear-gradient(135deg,rgba(140,90,255,.08),rgba(39,220,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#b99cff" }}>FIL CONDUCTEUR AWENA</div>
                  <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 950 }}>{weekCoachPlan.cadenceLabel}</div>
                  <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.4, opacity: .62 }}>{weekCoachPlan.summary}</div>
                </div>
                {weekCoachPlan.nextSlot && <button type="button" onClick={() => prepareRecommendedSession(weekCoachPlan.nextSlot!.durationMin as 15 | 30 | 45, weekCoachPlan.nextSlot!.focusFamily)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(140,90,255,.28)", background: "rgba(140,90,255,.09)", color: "inherit", fontSize: 8.5, fontWeight: 950, cursor: "pointer" }}>PRÉPARER {weekCoachPlan.nextSlot.label}</button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 5, marginTop: 10 }}>
                {weekCoachPlan.slots.map((slot) => <div key={slot.dayStart} title={`${slot.focusLabel}${slot.durationMin ? ` • ${slot.durationMin} min` : ""}`} style={{ minWidth: 0, padding: "7px 3px", borderRadius: 9, textAlign: "center", border: slot.state === "done" ? "1px solid rgba(80,255,174,.22)" : slot.state === "planned" ? "1px solid rgba(140,90,255,.24)" : "1px solid rgba(255,255,255,.055)", background: slot.state === "done" ? "rgba(80,255,174,.07)" : slot.state === "planned" ? "rgba(140,90,255,.07)" : "rgba(255,255,255,.018)" }}>
                  <div style={{ fontSize: 7.5, opacity: .48 }}>{slot.label}</div>
                  <div style={{ marginTop: 4, fontSize: 11, fontWeight: 950, color: slot.state === "done" ? "#8cffcb" : slot.state === "planned" ? "#b99cff" : "inherit" }}>{slot.state === "done" ? "✓" : slot.state === "planned" ? `${slot.durationMin}'` : "—"}</div>
                  <div style={{ marginTop: 3, fontSize: 6.5, opacity: .44, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{slot.state === "done" && slot.performanceScore != null ? `${Math.round(slot.performanceScore)}/100` : slot.focusLabel}</div>
                </div>)}
              </div>
            </div>
            </>}

            {programPanel === "library" && <>
            {!!preferences.favoritePrograms.length && <>
              <div style={{ margin: "10px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#ffd86b" }}>★ MES SÉANCES FAVORITES</div>
              <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 3 }}>
                {preferences.favoritePrograms.map((favorite) => <button key={favorite.id} type="button" onClick={() => setProgramId(favorite.id)} style={{ flex: "0 0 auto", minWidth: 170, maxWidth: 230, textAlign: "left", padding: 10, borderRadius: 12, border: selectedProgram.id === favorite.id ? "1px solid #ffd86b" : "1px solid rgba(255,216,107,.18)", background: selectedProgram.id === favorite.id ? "rgba(255,216,107,.10)" : "rgba(255,255,255,.03)", color: "inherit", cursor: "pointer" }}>
                  <b style={{ fontSize: 10 }}>{favorite.title}</b>
                  <div style={{ marginTop: 4, fontSize: 8.5, opacity: .55 }}>{favorite.durationMin} min • {favorite.exerciseIds.length} étapes</div>
                </button>)}
              </div>
            </>}
            <div style={{ margin: "10px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>SÉANCES GUIDÉES</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 9 }}>
              {programs.map((program) => {
                const active = selectedProgram.id === program.id;
                const coach = program.level === "Coach";
                return <button key={program.id} type="button" onClick={() => setProgramId(program.id)} style={{ textAlign: "left", padding: 13, borderRadius: 15, border: active ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.11)", background: active ? "rgba(39,220,255,.12)" : coach ? "rgba(140,90,255,.08)" : "rgba(255,255,255,.035)", color: "inherit", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b style={{ fontSize: 12 }}>{program.title}</b><span style={{ fontSize: 9, padding: "3px 7px", borderRadius: 999, background: "rgba(255,255,255,.08)" }}>{program.durationMin} MIN</span></div>
                  <div style={{ marginTop: 6, fontSize: 10.5, lineHeight: 1.35, opacity: .7 }}>{program.subtitle}</div>
                  <div style={{ marginTop: 9, fontSize: 9.5, opacity: .55 }}>{program.exerciseIds.length} étapes • {program.level}</div>
                </button>;
              })}
            </div>

            <div style={{ marginTop: 12, padding: 13, borderRadius: 15, border: "1px solid rgba(140,90,255,.28)", background: "linear-gradient(135deg,rgba(140,90,255,.10),rgba(39,220,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#b49cff" }}>PROGRAMME SUR MESURE</div>
                  <div style={{ marginTop: 4, fontSize: 10, opacity: .64 }}>Choisis durée, axe de travail et intensité. Le parcours est construit automatiquement.</div>
                </div>
                <button type="button" onClick={() => setProgramId(customProgram.id)} style={{ padding: "7px 10px", borderRadius: 10, border: programId === customProgram.id ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.12)", background: programId === customProgram.id ? "rgba(39,220,255,.14)" : "rgba(255,255,255,.05)", color: "inherit", fontWeight: 900, fontSize: 9, cursor: "pointer" }}>UTILISER CE PROGRAMME</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 11 }}>
                <div>
                  <div style={{ fontSize: 8, opacity: .5, marginBottom: 5 }}>DURÉE</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {([15,30,45] as const).map((duration) => <button key={duration} type="button" onClick={() => { setCustomDuration(duration); setProgramId(`custom_${duration}_${customFocus}_${customIntensity}`); }} style={{ flex: 1, padding: "7px 4px", borderRadius: 9, border: customDuration === duration ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.09)", background: customDuration === duration ? "rgba(39,220,255,.12)" : "rgba(0,0,0,.15)", color: "inherit", fontSize: 9, fontWeight: 900, cursor: "pointer" }}>{duration}m</button>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 8, opacity: .5, marginBottom: 5 }}>FOCUS</div>
                  <select value={customFocus} onChange={(e) => { const value = e.target.value as TrainingExerciseFamily | "balanced"; setCustomFocus(value); setProgramId(`custom_${customDuration}_${value}_${customIntensity}`); }} style={{ width: "100%", padding: "7px 8px", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.22)", color: "inherit", fontSize: 9, fontWeight: 850 }}>
                    <option value="balanced">ÉQUILIBRÉ</option>
                    {familyOrder.map((id) => <option key={id} value={id}>{TRAINING_FAMILY_META[id].label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 8, opacity: .5, marginBottom: 5 }}>INTENSITÉ</div>
                  <select value={customIntensity} onChange={(e) => { const value = e.target.value as TrainingProgramBuildOptions["intensity"]; setCustomIntensity(value); setProgramId(`custom_${customDuration}_${customFocus}_${value}`); }} style={{ width: "100%", padding: "7px 8px", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.22)", color: "inherit", fontSize: 9, fontWeight: 850 }}>
                    <option value="accessible">ACCESSIBLE</option>
                    <option value="standard">STANDARD</option>
                    <option value="intense">INTENSE</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 5 }}>
                {customProgram.exerciseIds.map((id, index) => { const ex = TRAINING_EXERCISE_CATALOG.find((e) => e.id === id); return <span key={`${id}-${index}`} style={{ fontSize: 8.5, padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.07)" }}>{index + 1}. {ex?.title || id}</span>; })}
              </div>
            </div>

            <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid rgba(39,220,255,.17)", background: "rgba(39,220,255,.045)" }}>
              <div style={{ fontSize: 9.5, opacity: .58 }}>PARCOURS SÉLECTIONNÉ</div>
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedProgram.exerciseIds.map((id, index) => {
                  const ex = TRAINING_EXERCISE_CATALOG.find((e) => e.id === id);
                  return <span key={`${id}-${index}`} style={{ fontSize: 9.5, padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.08)" }}>{index + 1}. {ex?.title || id}</span>;
                })}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button type="button" onClick={() => toggleProgramFavorite(selectedProgram)} style={{ padding: "8px 11px", borderRadius: 10, border: favoriteProgramIds.has(selectedProgram.id) ? "1px solid rgba(255,216,107,.55)" : "1px solid rgba(255,255,255,.12)", background: favoriteProgramIds.has(selectedProgram.id) ? "rgba(255,216,107,.10)" : "rgba(255,255,255,.04)", color: "inherit", fontSize: 9, fontWeight: 900, cursor: "pointer" }}>{favoriteProgramIds.has(selectedProgram.id) ? "★ RETIRER DES FAVORIS" : selectedProgram.id.startsWith("custom_") ? "★ ENREGISTRER CETTE SÉANCE" : "☆ AJOUTER AUX FAVORIS"}</button>
            </div>
            <TrainingStartButton disabled={!resolved.length} label={`LANCER ${selectedProgram.title}`} onClick={() => startProgram(selectedProgram)} />
            </>}
          </div>}

          {tab === "exercises" && <div>
            {viewMode === "complete" && <CompactIconNav items={[
              { id: "path", label: "PARCOURS", icon: "progress", status: `NIV. ${skillPath.currentLevel}/5` },
              { id: "catalog", label: "CATALOGUE", icon: "exercises", status: `${filteredExercises.length} EX.` },
              { id: "technique", label: "TECHNIQUE", icon: "skills", status: `${mabullTechniqueItems.length}` },
              { id: "favorites", label: "FAVORIS", icon: "library", status: `${favoriteExercises.length}` },
            ]} activeId={exercisePanel} onChange={(id) => setExercisePanel(id as ExercisePanel)} stickyTop={48} />}

            <div style={{ margin: "10px 0 4px", fontSize: 8.2, fontWeight: 950, letterSpacing: .8, color: "#27dcff", opacity: .72 }}>COMPÉTENCE</div>
            <CompactIconNav items={familyOrder.map((id) => { const row = diagnosis.find((x) => x.family === id); return { id, label: `${TRAINING_FAMILY_META[id].label}${id === recommendedFamily ? " ★" : ""}`, icon: id, status: row?.sessions ? `${Math.round(row.recentScore)}/100` : "NOUVEAU" }; })} activeId={family} onChange={(id) => setFamily(id as TrainingExerciseFamily)} />

            {exercisePanel === "path" && <>
              <div style={{ marginTop: 10, padding: 13, borderRadius: 15, border: "1px solid rgba(39,220,255,.22)", background: "linear-gradient(135deg,rgba(39,220,255,.08),rgba(140,90,255,.04))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: "1 1 280px" }}>
                    <div style={{ fontSize: 8, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>TON PARCOURS · {skillPath.label}</div>
                    <div style={{ marginTop: 4, fontSize: 13, fontWeight: 950 }}>{skillPath.headline}</div>
                    <div style={{ marginTop: 4, fontSize: 9, opacity: .62, lineHeight: 1.4 }}>{skillPath.body}</div>
                  </div>
                  <div style={{ textAlign: "right" }}><b style={{ fontSize: 18 }}>{Math.round(skillPath.score)}</b><div style={{ fontSize: 7, opacity: .45 }}>NIVEAU RÉCENT</div></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5, marginTop: 10 }}>
                  {skillPath.steps.map((step) => <button key={step.level} type="button" disabled={!step.unlocked || !step.exercise} onClick={() => { if (step.exercise) setExerciseId(step.exercise.id); }} style={{ minWidth: 0, padding: "9px 4px", borderRadius: 10, border: step.exercise?.id === exerciseId ? "1px solid #27dcff" : step.mastered ? "1px solid rgba(80,255,174,.22)" : "1px solid rgba(255,255,255,.07)", background: step.exercise?.id === exerciseId ? "rgba(39,220,255,.10)" : step.mastered ? "rgba(80,255,174,.05)" : "rgba(255,255,255,.025)", color: "inherit", opacity: step.unlocked ? 1 : .34, cursor: step.unlocked && step.exercise ? "pointer" : "default" }}>
                    <div style={{ fontSize: 12, fontWeight: 950 }}>{step.mastered ? "✓" : step.unlocked ? step.level : "⌁"}</div>
                    <div style={{ marginTop: 2, fontSize: 6.5, fontWeight: 950 }}>{step.label}</div>
                    <div style={{ marginTop: 2, fontSize: 5.8, opacity: .42 }}>{step.exerciseCount} EX.</div>
                  </button>)}
                </div>
              </div>

              <div style={{ marginTop: 9, padding: 12, borderRadius: 14, border: skillCertification.status === "ready" ? "1px solid rgba(80,255,174,.24)" : "1px solid rgba(255,255,255,.08)", background: skillCertification.status === "ready" ? "rgba(80,255,174,.045)" : "rgba(255,255,255,.025)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 7.2, fontWeight: 950, letterSpacing: .9, color: skillCertification.status === "ready" ? "#8cffcb" : "#aeb7c8" }}>DÉFI DE NIVEAU</div>
                    <div style={{ marginTop: 3, fontSize: 11.2, fontWeight: 950 }}>{skillCertification.headline}</div>
                  </div>
                  <span style={{ padding: "4px 7px", borderRadius: 999, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", fontSize: 6.8, fontWeight: 950 }}>{skillCertification.statusLabel}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 8.2, opacity: .58, lineHeight: 1.38 }}>{skillCertification.body}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5, marginTop: 8 }}>
                  <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.025)", textAlign: "center" }}><b>{skillCertification.score}/100</b><div style={{ fontSize: 6.2, opacity: .42 }}>ACTUEL</div></div>
                  <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.025)", textAlign: "center" }}><b>{skillCertification.requiredScore}/100</b><div style={{ fontSize: 6.2, opacity: .42 }}>SEUIL TEST</div></div>
                  <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.025)", textAlign: "center" }}><b>{skillCertification.certifiedLevel}/5</b><div style={{ fontSize: 6.2, opacity: .42 }}>CERTIFIÉ</div></div>
                  <div style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.025)", textAlign: "center" }}><b>{skillCertification.attempts ? `${skillCertification.bestAttemptScore}/100` : "—"}</b><div style={{ fontSize: 6.2, opacity: .42 }}>MEILLEUR TEST</div></div>
                </div>
                {skillCertification.status === "ready" ? <button type="button" onClick={startCertification} style={{ width: "100%", marginTop: 8, padding: 9, borderRadius: 10, border: "1px solid rgba(80,255,174,.28)", background: "rgba(80,255,174,.08)", color: "inherit", fontSize: 8, fontWeight: 950, cursor: "pointer" }}>LANCER LE TEST · NIV. {skillCertification.targetLevel}</button> : null}
              </div>

              <div style={{ marginTop: 9, padding: 12, borderRadius: 14, border: "1px solid rgba(255,216,107,.18)", background: "rgba(255,216,107,.045)" }}>
                <div style={{ fontSize: 7.5, fontWeight: 950, letterSpacing: .9, color: "#ffd86b" }}>À TOI DE JOUER</div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 5, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 950 }}>{skillPath.recommendedExercise.title}</div>
                    <div style={{ marginTop: 3, fontSize: 8.5, opacity: .58 }}>{skillPath.recommendedExercise.subtitle}</div>
                  </div>
                  <button type="button" onClick={() => setExerciseId(skillPath.recommendedExercise.id)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,216,107,.24)", background: "rgba(255,216,107,.07)", color: "inherit", fontSize: 8, fontWeight: 950, cursor: "pointer" }}>SÉLECTIONNER</button>
                </div>
              </div>
            </>}

            {exercisePanel === "catalog" && <>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {[
                  { id: "playable", label: "JOUABLE", status: `${TRAINING_EXERCISE_CATALOG.length}` },
                  { id: "mabull", label: "MABULL 55", status: `${MABULL_REFERENCE_STATS.total}` },
                ].map((item) => { const active = catalogSource === item.id; return <button key={item.id} type="button" onClick={() => setCatalogSource(item.id as CatalogSource)} style={{ minWidth: 38, height: 34, padding: active ? "0 10px" : "0 9px", borderRadius: 11, border: active ? "1px solid rgba(39,220,255,.32)" : "1px solid rgba(255,255,255,.08)", background: active ? "rgba(39,220,255,.09)" : "rgba(255,255,255,.025)", color: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontSize: 8, fontWeight: 950 }}><span>{item.id === "playable" ? "◎" : "▦"}</span>{active && <><span>{item.label}</span><span style={{ opacity: .45 }}>{item.status}</span></>}</button>; })}
              </div>
              {catalogSource === "mabull" && <div style={{ marginTop: 8, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)" }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                  {[{ id: "all", label: "TOUS", icon: "▦" }, { id: "exercise", label: "EXERCICES", icon: "◎" }, { id: "technique", label: "TECHNIQUE", icon: "♙" }].map((item) => { const active = mabullKind === item.id; return <button key={item.id} type="button" onClick={() => setMabullKind(item.id as MabullReferenceKind | "all")} style={{ minWidth: 34, height: 31, padding: active ? "0 9px" : "0 8px", borderRadius: 10, border: active ? "1px solid rgba(185,156,255,.28)" : "1px solid rgba(255,255,255,.07)", background: active ? "rgba(185,156,255,.08)" : "rgba(255,255,255,.02)", color: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", fontSize: 7.5, fontWeight: 950 }}><span>{item.icon}</span>{active && <span>{item.label}</span>}</button>; })}
                  <span style={{ marginLeft: "auto", fontSize: 7.2, opacity: .42 }}>{MABULL_REFERENCE_STATS.exercises} exercices • {MABULL_REFERENCE_STATS.techniques} technique • {MABULL_REFERENCE_STATS.mapped} déjà reliés</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 8 }}>
                  <MetricChip icon="exercises" label="JOUABLE" value={`${MABULL_REFERENCE_STATS.mapped}/${MABULL_REFERENCE_STATS.exercises}`} tone="green" />
                  <MetricChip icon="history" label="À RELEVER" value={`${MABULL_REFERENCE_STATS.exercises - MABULL_REFERENCE_STATS.mapped} règles`} tone="gold" />
                  <MetricChip icon="coach" label="TECHNIQUE" value={`${MABULL_REFERENCE_STATS.techniques} fiches`} tone="purple" />
                </div>
                <div style={{ marginTop: 8, padding: 9, borderRadius: 11, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.015)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setMabullSection("all")} title="Toutes les familles" aria-label="Toutes les familles" style={{ width: mabullSection === "all" ? 82 : 36, height: 34, borderRadius: 10, border: mabullSection === "all" ? "1px solid rgba(39,220,255,.30)" : "1px solid rgba(255,255,255,.07)", background: mabullSection === "all" ? "rgba(39,220,255,.075)" : "rgba(255,255,255,.018)", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, overflow: "hidden" }}><span>▦</span>{mabullSection === "all" && <span style={{ fontSize: 7, fontWeight: 950 }}>TOUT</span>}</button>
                    {MABULL_SECTION_ORDER.map((section) => { const meta = MABULL_SECTION_META[section]; const coverage = mabullCoverage.find((row) => row.section === section); const active = mabullSection === section; return <button key={section} type="button" onClick={() => setMabullSection(section)} title={meta.label} aria-label={meta.label} style={{ minWidth: active ? 94 : 36, height: 34, padding: active ? "0 8px" : 0, borderRadius: 10, border: active ? "1px solid rgba(185,156,255,.28)" : "1px solid rgba(255,255,255,.07)", background: active ? "rgba(185,156,255,.07)" : "rgba(255,255,255,.018)", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: active ? "flex-start" : "center", gap: 6, overflow: "hidden" }}><HubGlyph name={meta.icon} size={15}/>{active && <span style={{ minWidth: 0, textAlign: "left" }}><b style={{ display: "block", fontSize: 6.7, whiteSpace: "nowrap" }}>{meta.shortLabel.toUpperCase()}</b><span style={{ display: "block", fontSize: 5.8, opacity: .45 }}>{coverage?.mapped || 0}/{coverage?.total || 0} jouable</span></span>}</button>; })}
                  </div>
                </div>
                <div style={{ marginTop: 8, padding: 10, borderRadius: 12, border: "1px solid rgba(255,216,107,.13)", background: "rgba(255,216,107,.025)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div><div style={{ fontSize: 7, fontWeight: 950, color: "#ffd86b", letterSpacing: .8 }}>PROCHAINES RÈGLES À RELEVER</div><div style={{ marginTop: 2, fontSize: 7.1, opacity: .48 }}>Priorité de conversion vers des exercices jouables.</div></div><b style={{ fontSize: 11 }}>{MABULL_REFERENCE_STATS.mapped}/{MABULL_REFERENCE_STATS.exercises}</b></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 5, marginTop: 7 }}>{mabullConversionQueue.map((item, index) => <div key={item.id} style={{ padding: 7, borderRadius: 9, background: "rgba(255,255,255,.022)", border: "1px solid rgba(255,255,255,.055)" }}><div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 20, height: 20, borderRadius: 7, display: "grid", placeItems: "center", background: "rgba(255,216,107,.08)", fontSize: 7, fontWeight: 950 }}>{index + 1}</span><div style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: 7.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</b><span style={{ display: "block", marginTop: 1, fontSize: 5.9, opacity: .42 }}>{MABULL_SECTION_META[getMabullItemSection(item)].label}</span></div></div></div>)}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 6, marginTop: 8 }}>
                  {filteredMabullItems.map((item) => <div key={item.id} style={{ padding: 9, borderRadius: 11, border: item.status === "mapped" ? "1px solid rgba(80,255,174,.13)" : item.kind === "technique" ? "1px solid rgba(80,255,174,.10)" : "1px solid rgba(255,255,255,.065)", background: item.status === "mapped" ? "rgba(80,255,174,.025)" : "rgba(255,255,255,.018)" }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}><span style={{ width: 24, height: 24, borderRadius: 8, display: "grid", placeItems: "center", color: item.kind === "technique" ? "#8cffcb" : item.status === "mapped" ? "#8cffcb" : "#ffd86b", background: "rgba(255,255,255,.025)" }}><HubGlyph name={item.family || "coach"} size={12}/></span><b style={{ minWidth: 0, flex: 1, fontSize: 8.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</b><button type="button" title="Voir les détails" aria-label={`Détails ${item.title}`} onClick={() => setDetailSheet(`mabull:${item.id}`)} style={{ width: 27, height: 27, borderRadius: 9, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", color: item.status === "mapped" ? "#8cffcb" : item.kind === "technique" ? "#8cffcb" : "#ffd86b", cursor: "pointer", display: "grid", placeItems: "center" }}><HubGlyph name="diagnosis" size={12}/></button></div>
                    <div style={{ marginTop: 5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}><span style={{ fontSize: 6.1, fontWeight: 900, color: item.status === "mapped" ? "#8cffcb" : item.kind === "technique" ? "#8cffcb" : "#ffd86b" }}>{item.status === "mapped" ? "JOUABLE" : item.kind === "technique" ? "TECHNIQUE" : "RÈGLES À RELEVER"}</span><span style={{ fontSize: 6, opacity: .38 }}>{item.tags.slice(0,2).join(" · ")}</span></div>
                    {item.status === "mapped" && item.mappedExerciseId && <button type="button" onClick={() => { const mapped = TRAINING_EXERCISE_CATALOG.find((exercise) => exercise.id === item.mappedExerciseId); if (mapped) { setFamily(mapped.family); setExerciseId(mapped.id); setCatalogSource("playable"); } }} style={{ marginTop: 7, width: "100%", padding: 6, borderRadius: 8, border: "1px solid rgba(80,255,174,.16)", background: "rgba(80,255,174,.05)", color: "inherit", fontSize: 6.8, fontWeight: 950, cursor: "pointer" }}>OUVRIR L'ÉQUIVALENT</button>}
                  </div>)}
                </div>
                <div style={{ marginTop: 8, fontSize: 7.2, lineHeight: 1.4, opacity: .44 }}>Référentiel relevé depuis le catalogue MaBULL fourni. Les entrées “RÈGLES” ne sont pas lancées tant que leur mécanique exacte n'a pas été relevée.</div>
              </div>}
              {catalogSource === "playable" && <>
              <div style={{ display: "flex", gap: 5, overflowX: "auto", padding: "9px 0 3px" }}>
                {[0,1,2,3,4,5].map((value) => <button key={value} type="button" onClick={() => setDifficultyFilter(value as 0 | 1 | 2 | 3 | 4 | 5)} style={{ flex: "0 0 auto", padding: "6px 8px", borderRadius: 999, border: difficultyFilter === value ? "1px solid rgba(39,220,255,.50)" : "1px solid rgba(255,255,255,.08)", background: difficultyFilter === value ? "rgba(39,220,255,.10)" : "rgba(255,255,255,.025)", color: "inherit", fontSize: 7.5, fontWeight: 900, cursor: "pointer" }}>{value === 0 ? "TOUS" : `NIV. ${value}`}</button>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(205px,1fr))", gap: 7, marginTop: 7 }}>
                {filteredExercises.map((exercise) => {
                  const active = exercise.id === exerciseId;
                  return <button key={exercise.id} type="button" onClick={() => setExerciseId(exercise.id)} style={{ textAlign: "left", padding: 10, borderRadius: 12, border: active ? "1px solid #27dcff" : "1px solid rgba(255,255,255,.09)", background: active ? "rgba(39,220,255,.09)" : "rgba(255,255,255,.025)", color: "inherit", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><b style={{ fontSize: 10 }}>{exercise.title}</b><span style={{ fontSize: 8, opacity: .55 }}>{"★".repeat(exercise.difficulty)}</span></div>
                    <div style={{ marginTop: 4, fontSize: 8.2, lineHeight: 1.3, opacity: .58 }}>{exercise.subtitle}</div>
                  </button>;
                })}
              </div>
              </>}
            </>}

            {exercisePanel === "technique" && <>
              <div style={{ marginTop: 10, padding: 12, borderRadius: 15, border: "1px solid rgba(80,255,174,.16)", background: "linear-gradient(145deg,rgba(80,255,174,.04),rgba(39,220,255,.02))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 7.2, fontWeight: 950, letterSpacing: .9, color: "#8cffcb" }}>TECHNIQUE MABULL</div>
                    <div style={{ marginTop: 3, fontSize: 11.8, fontWeight: 950 }}>3 parcours, sans surcharge</div>
                    <div style={{ marginTop: 3, fontSize: 7.8, opacity: .52 }}>Posture, geste et routine sont séparés pour rester faciles à parcourir.</div>
                  </div>
                  <MetricChip icon="coach" label="FICHES" value={`${mabullTechniqueItems.length} à documenter`} tone="green" />
                </div>
                <CompactIconNav items={mabullTechniqueTracks.map((row) => ({ id: row.track, label: row.shortLabel.toUpperCase(), icon: MABULL_TECHNIQUE_TRACK_META[row.track].icon, status: `${row.total} fiches` }))} activeId={techniqueTrack} onChange={(id) => setTechniqueTrack(id as MabullTechniqueTrack)} tone="green" />
              </div>
              {selectedTechniqueTrack && <div style={{ marginTop: 8, padding: 11, borderRadius: 14, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.018)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 10, display: "grid", placeItems: "center", color: "#8cffcb", background: "rgba(80,255,174,.08)", border: "1px solid rgba(80,255,174,.14)" }}><HubGlyph name={selectedTechniqueTrack.icon} size={15} /></span>
                  <div style={{ minWidth: 0 }}><div style={{ fontSize: 8.3, fontWeight: 950 }}>{selectedTechniqueTrack.label}</div><div style={{ marginTop: 2, fontSize: 6.9, lineHeight: 1.35, opacity: .5 }}>{selectedTechniqueTrack.description}</div></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 6, marginTop: 9 }}>
                  {selectedTechniqueTrack.items.map((item) => <button type="button" onClick={() => setDetailSheet(`mabull:${item.id}`)} key={item.id} style={{ padding: 9, borderRadius: 11, border: "1px solid rgba(80,255,174,.10)", background: "rgba(255,255,255,.018)", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}><span style={{ width: 24, height: 24, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(80,255,174,.06)", color: "#8cffcb" }}><HubGlyph name="coach" size={12} /></span><b style={{ minWidth: 0, flex: 1, fontSize: 8.1, lineHeight: 1.2 }}>{item.title}</b><HubGlyph name="diagnosis" size={12}/></div>
                  </button>)}
                </div>
              </div>}
            </>}

            {exercisePanel === "favorites" && <>
              {!favoriteExercises.length ? <div style={{ marginTop: 10, padding: 14, borderRadius: 13, border: "1px dashed rgba(255,255,255,.12)", textAlign: "center", fontSize: 9, opacity: .5 }}>Aucun exercice favori. Sélectionne un exercice puis utilise ☆ AJOUTER AUX FAVORIS.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(205px,1fr))", gap: 7, marginTop: 10 }}>
                {favoriteExercises.map((favorite: any) => <button key={favorite.id} type="button" onClick={() => { setFamily(favorite.family); setExerciseId(favorite.id); }} style={{ textAlign: "left", padding: 10, borderRadius: 12, border: exerciseId === favorite.id ? "1px solid #ffd86b" : "1px solid rgba(255,216,107,.16)", background: exerciseId === favorite.id ? "rgba(255,216,107,.08)" : "rgba(255,255,255,.025)", color: "inherit", cursor: "pointer" }}><div style={{ fontSize: 10, fontWeight: 950 }}>★ {favorite.title}</div><div style={{ marginTop: 4, fontSize: 8.2, opacity: .56 }}>{TRAINING_FAMILY_META[favorite.family as TrainingExerciseFamily].label} • niv. {favorite.difficulty}</div></button>)}
              </div>}
            </>}

            <div style={{ marginTop: 10, padding: 11, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: "1 1 230px" }}>
                <div style={{ fontSize: 7.3, fontWeight: 950, opacity: .48 }}>EXERCICE SÉLECTIONNÉ • NIVEAU {selected.difficulty}</div>
                <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 950 }}>{selected.title}</div>
                <div style={{ marginTop: 3, fontSize: 8.5, opacity: .56 }}>{selected.maxDarts} fléchettes max • {selected.subtitle}</div>
              </div>
              <button type="button" onClick={() => toggleExerciseFavorite(selected.id)} style={{ padding: "8px 10px", borderRadius: 10, border: favoriteExerciseIds.has(selected.id) ? "1px solid rgba(255,216,107,.55)" : "1px solid rgba(255,255,255,.12)", background: favoriteExerciseIds.has(selected.id) ? "rgba(255,216,107,.10)" : "rgba(255,255,255,.04)", color: "inherit", fontSize: 8, fontWeight: 900, cursor: "pointer" }}>{favoriteExerciseIds.has(selected.id) ? "★ FAVORI" : "☆ FAVORI"}</button>
            </div>
            <TrainingStartButton disabled={!resolved.length} label="LANCER L'EXERCICE" onClick={startExercise} />
          </div>}

          {tab === "diagnosis" && <div>
            {viewMode === "complete" && <CompactIconNav items={diagnosisPanels.map((item) => ({ ...item, status: item.id === "overview" ? `${Math.round(diagnosticBoard.overallScore)}/100` : item.id === "skill" ? TRAINING_FAMILY_META[diagnosisFamily].label.toUpperCase() : `${diagnosticBoard.reachedGoals}/6 ATTEINTS` }))} activeId={diagnosisPanel} onChange={(id) => setDiagnosisPanel(id as DiagnosisPanel)} stickyTop={48} />}

            {diagnosisPanel === "overview" && <>
              <div style={{ marginTop: 9, padding: 13, borderRadius: 15, border: "1px solid rgba(39,220,255,.20)", background: "linear-gradient(135deg,rgba(39,220,255,.065),rgba(140,90,255,.035))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 200, flex: 1 }}><div style={{ fontSize: 8.5, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>DIAGNOSTIC AWENA</div><div style={{ marginTop: 3, fontSize: 13, fontWeight: 950 }}>Priorité • {diagnosticBoard.priorityLabel}</div><div style={{ marginTop: 4, fontSize: 8.5, lineHeight: 1.4, opacity: .56 }}>{prescription.body}</div></div>
                  <button type="button" onClick={() => { prepareRecommendedSession(actionCoach.durationMin, diagnosticBoard.priorityFamily); setTab("program"); setProgramPanel("library"); }} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(39,220,255,.30)", background: "rgba(39,220,255,.09)", color: "inherit", fontSize: 8, fontWeight: 950, cursor: "pointer" }}>PRÉPARER LA SÉANCE</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
                  {[
                    ["NIVEAU", Math.round(diagnosticBoard.overallScore)],
                    ["COUVERTURE", `${diagnosticBoard.coverage}%`],
                    ["OBJECTIFS", `${diagnosticBoard.reachedGoals}/6`],
                    ["FIABILITÉ", diagnosticBoard.confidence],
                  ].map(([label, value]) => <div key={String(label)} style={{ padding: 8, borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.055)" }}><b style={{ fontSize: 11.5 }}>{value}</b><div style={{ marginTop: 2, fontSize: 6.4, opacity: .42 }}>{label}</div></div>)}
                </div>
                <div style={{ marginTop: 8, fontSize: 7.8, opacity: .5 }}>Point fort : <b style={{ color: "#8cffcb" }}>{diagnosticBoard.strongestLabel}</b>{diagnosticBoard.strongestFamily ? ` • ${Math.round(diagnosticBoard.strongestScore)}/100` : ""} • données : {diagnosticBoard.totalSessions} séances ciblées.</div>
              </div>

              <div style={{ margin: "12px 0 7px", fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#ffd86b" }}>SIGNAUX À TRAITER</div>
              {!diagnosticBoard.alerts.length ? <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(80,255,174,.14)", background: "rgba(80,255,174,.035)", fontSize: 8.8, opacity: .65 }}>Aucun signal prioritaire détecté. Le plan peut rester équilibré.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 6 }}>
                {diagnosticBoard.alerts.map((alert) => <button key={alert.id} type="button" onClick={() => { if (alert.family) setDiagnosisFamily(alert.family); setDiagnosisPanel("skill"); }} style={{ textAlign: "left", padding: 10, borderRadius: 12, border: alert.level === "priority" ? "1px solid rgba(255,184,76,.22)" : "1px solid rgba(255,255,255,.07)", background: alert.level === "priority" ? "rgba(255,184,76,.045)" : "rgba(255,255,255,.022)", color: "inherit", cursor: "pointer" }}><b style={{ fontSize: 8.8 }}>{alert.title}</b><div style={{ marginTop: 3, fontSize: 7.7, lineHeight: 1.35, opacity: .52 }}>{alert.body}</div></button>)}
              </div>}
            </>}

            {diagnosisPanel === "skill" && <>
              <CompactIconNav items={familyOrder.map((familyId) => { const row = diagnosis.find((item) => item.family === familyId); return { id: familyId, label: TRAINING_FAMILY_META[familyId].label.toUpperCase(), icon: familyId, status: row?.sessions ? `${Math.round(row.recentScore)}/100` : "—" }; })} activeId={diagnosisFamily} onChange={(id) => setDiagnosisFamily(id as TrainingExerciseFamily)} />
              {(() => {
                const row = diagnosis.find((item) => item.family === diagnosisFamily)!;
                const prog = progression.find((item) => item.family === diagnosisFamily);
                const mastery = career.mastery.find((item) => item.family === diagnosisFamily);
                const path = buildTrainingSkillPath(diagnosisFamily, progression);
                const trend = row.trend > 3 ? `+${Math.round(row.trend)}` : Math.round(row.trend);
                return <div style={{ marginTop: 9, padding: 13, borderRadius: 15, border: diagnosisFamily === recommendedFamily ? "1px solid rgba(39,220,255,.30)" : "1px solid rgba(255,255,255,.085)", background: "rgba(255,255,255,.025)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}><div><div style={{ fontSize: 8, opacity: .45 }}>COMPÉTENCE</div><div style={{ marginTop: 2, fontSize: 14, fontWeight: 950 }}>{row.label}{diagnosisFamily === recommendedFamily ? " ★" : ""}</div></div><div style={{ textAlign: "right" }}><b style={{ fontSize: 18 }}>{row.sessions ? Math.round(row.recentScore) : "—"}</b><div style={{ fontSize: 6.8, opacity: .42 }}>INDICE RÉCENT</div></div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10, textAlign: "center" }}>
                    <div><b style={{ fontSize: 11 }}>{pct(row.accuracyPct)}</b><div style={{ fontSize: 6.4, opacity: .42 }}>PRÉCISION</div></div><div><b style={{ fontSize: 11 }}>{pct(row.successPct)}</b><div style={{ fontSize: 6.4, opacity: .42 }}>RÉUSSITE</div></div><div><b style={{ fontSize: 11, color: row.trend >= 0 ? "#8cffcb" : "#ffd86b" }}>{trend}</b><div style={{ fontSize: 6.4, opacity: .42 }}>TENDANCE</div></div><div><b style={{ fontSize: 11 }}>{mastery?.tier || "—"}</b><div style={{ fontSize: 6.4, opacity: .42 }}>MAÎTRISE</div></div>
                  </div>
                  <div style={{ marginTop: 9, padding: 9, borderRadius: 10, background: "rgba(140,90,255,.045)", border: "1px solid rgba(140,90,255,.10)", fontSize: 8.2, lineHeight: 1.4 }}>Parcours niveau <b>{path.currentLevel}/5 • {path.steps[path.currentLevel - 1]?.label}</b>. Record {Math.round(prog?.bestScore || 0)}/100 • {row.sessions} séance{row.sessions > 1 ? "s" : ""} analysée{row.sessions > 1 ? "s" : ""}.</div>
                  <button type="button" onClick={() => { setFamily(diagnosisFamily); setExerciseId(path.recommendedExercise.id); setExercisePanel("path"); setTab("exercises"); }} style={{ width: "100%", marginTop: 9, padding: 9, borderRadius: 10, border: "1px solid rgba(39,220,255,.24)", background: "rgba(39,220,255,.07)", color: "inherit", fontSize: 8, fontWeight: 950, cursor: "pointer" }}>OUVRIR LE PARCOURS {row.label.toUpperCase()}</button>
                </div>;
              })()}
            </>}

            {diagnosisPanel === "goal" && <>
              <CompactIconNav items={familyOrder.map((familyId) => { const status = goalStatuses.find((item) => item.family === familyId); return { id: familyId, label: TRAINING_FAMILY_META[familyId].label.toUpperCase(), icon: familyId, status: `${Math.round(status?.current || 0)}/${status?.goal || 0}` }; })} activeId={diagnosisFamily} onChange={(id) => setDiagnosisFamily(id as TrainingExerciseFamily)} tone="gold" />
              {(() => { const status = goalStatuses.find((item) => item.family === diagnosisFamily)!; const deadline = preferences.familyGoalDeadlines[diagnosisFamily] || ""; return <div style={{ marginTop: 9, padding: 13, borderRadius: 15, border: status.reached ? "1px solid rgba(80,255,174,.20)" : "1px solid rgba(255,216,107,.18)", background: status.reached ? "rgba(80,255,174,.035)" : "rgba(255,216,107,.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}><div><div style={{ fontSize: 8, opacity: .45 }}>OBJECTIF • {status.label.toUpperCase()}</div><div style={{ marginTop: 3, fontSize: 13, fontWeight: 950 }}>{status.reached ? "Objectif atteint" : `Encore ${Math.ceil(status.gap)} pts à gagner`}</div></div><b style={{ fontSize: 18, color: status.reached ? "#8cffcb" : "#ffd86b" }}>{Math.round(status.current)}<span style={{ fontSize: 8, opacity: .45 }}>/{status.goal}</span></b></div>
                <div style={{ height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 10 }}><div style={{ height: "100%", width: `${Math.max(2, Math.min(100, (status.current / Math.max(1, status.goal)) * 100))}%`, background: status.reached ? "linear-gradient(90deg,#8cffcb,#27dcff)" : "linear-gradient(90deg,#ffd86b,#27dcff)" }} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 10, alignItems: "end" }}><div><div style={{ fontSize: 7.5, opacity: .45, marginBottom: 4 }}>DATE CIBLE</div><input type="date" value={deadline} onChange={(event) => updateGoalDeadline(diagnosisFamily, event.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "7px 8px", borderRadius: 9, border: "1px solid rgba(255,255,255,.09)", background: "rgba(0,0,0,.18)", color: "inherit", fontSize: 8.5 }} /></div><div style={{ display: "flex", gap: 5 }}><button type="button" onClick={() => updateGoal(diagnosisFamily, status.goal - 5)} style={{ width: 32, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "inherit", cursor: "pointer" }}>−</button><button type="button" onClick={() => updateGoal(diagnosisFamily, status.goal + 5)} style={{ width: 32, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "inherit", cursor: "pointer" }}>+</button></div></div>
              </div>; })()}
            </>}
          </div>}
          {tab === "progress" && <div>
            {viewMode === "complete" && <CompactIconNav items={progressPanels.map((item) => ({ ...item, status: item.id === "overview" ? `NIV. ${career.level.level}` : item.id === "skills" ? `${progression.filter((row) => row.sessions > 0).length}/6` : item.id === "coach" ? `${liveCoachHistory.sampleSize} SÉANCES` : item.id === "cycles" ? `${cycleHistory.length} CYCLES` : `${programSessions.length} PLANS` }))} activeId={progressPanel} onChange={(id) => setProgressPanel(id as ProgressPanel)} stickyTop={48} />}

            {progressPanel === "coach" && <CompactIconNav items={coachPanels} activeId={coachPanel} onChange={(id) => setCoachPanel(id as CoachPanel)} tone="green" />}
            {progressPanel === "history" && <CompactIconNav items={historyPanels} activeId={historyPanel} onChange={(id) => setHistoryPanel(id as HistoryPanel)} tone="purple" />}

            {progressPanel === "skills" && <CompactIconNav items={skillProgressPanels} activeId={skillProgressPanel} onChange={(id) => setSkillProgressPanel(id as SkillProgressPanel)} tone="purple" />}

            {progressPanel === "overview" && <>
            <div style={{ marginTop: 8, padding: 12, borderRadius: 15, border: "1px solid rgba(39,220,255,.18)", background: "linear-gradient(135deg,rgba(39,220,255,.055),rgba(80,255,174,.025))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <div><div style={{ fontSize: 7.6, fontWeight: 950, letterSpacing: .9, color: "#27dcff" }}>TA ROUTE JOUEUR</div><div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 950 }}>{playerJourney.headline}</div></div>
                <b style={{ fontSize: 15 }}>{playerJourney.progressPct}%</b>
              </div>
              <div style={{ marginTop: 4, fontSize: 8.2, opacity: .56, lineHeight: 1.38 }}>{playerJourney.body}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 4, marginTop: 9 }}>
                {playerJourney.stages.map((stage, index) => <div key={stage.id} title={stage.description} style={{ minWidth: 0, padding: "7px 2px", borderRadius: 9, textAlign: "center", border: stage.completed ? "1px solid rgba(80,255,174,.20)" : index === playerJourney.currentIndex ? "1px solid rgba(39,220,255,.28)" : "1px solid rgba(255,255,255,.06)", background: stage.completed ? "rgba(80,255,174,.05)" : index === playerJourney.currentIndex ? "rgba(39,220,255,.055)" : "rgba(255,255,255,.018)" }}><div style={{ fontSize: 10, fontWeight: 950 }}>{stage.completed ? "✓" : index + 1}</div><div style={{ marginTop: 2, fontSize: 5.8, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stage.shortLabel}</div></div>)}
              </div>
            </div>
            <div style={{ marginTop: 8, padding: 14, borderRadius: 16, border: "1px solid rgba(255,216,107,.22)", background: "linear-gradient(135deg,rgba(255,216,107,.08),rgba(140,90,255,.055))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 8.5, fontWeight: 950, letterSpacing: 1.1, color: "#ffd86b" }}>CARRIÈRE TRAINING</div>
                  <div style={{ marginTop: 3, fontSize: 17, fontWeight: 950 }}>Niveau {career.level.level} • {career.level.title}</div>
                  <div style={{ marginTop: 3, fontSize: 9, opacity: .56 }}>{career.xp} XP • {career.completedPrograms} programme{career.completedPrograms > 1 ? "s" : ""} • {career.unlockedBadges}/{career.totalBadges} badges</div>
                </div>
                <div style={{ textAlign: "right" }}><b style={{ fontSize: 19 }}>{Math.round(career.averagePerformance)}</b><div style={{ fontSize: 7, opacity: .45 }}>PERF. CARRIÈRE</div></div>
              </div>
              <div style={{ height: 7, marginTop: 10, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}><div style={{ width: `${Math.max(2, career.level.progressPct)}%`, height: "100%", background: "linear-gradient(90deg,#ffd86b,#27dcff,#8c5aff)" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 7.5, opacity: .45 }}><span>{career.level.minXp} XP</span><span>{career.level.nextXp ? `PROCHAIN NIVEAU ${career.level.nextXp} XP` : "NIVEAU MAX"}</span></div>
            </div>
            </>}

            {progressPanel === "skills" && skillProgressPanel === "mastery" && <>
            <div style={{ margin: "10px 0 7px", fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#b99cff" }}>MAÎTRISES</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
              {career.mastery.map((item) => <div key={`mastery-${item.family}`} style={{ padding: 9, borderRadius: 11, border: "1px solid rgba(185,156,255,.12)", background: "rgba(140,90,255,.03)" }}>
                <div style={{ fontSize: 7.2, opacity: .5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label.toUpperCase()}</div><div style={{ marginTop: 2, fontSize: 11.5, fontWeight: 950 }}>{item.tier}</div><div style={{ marginTop: 2, fontSize: 7.3, opacity: .46 }}>{Math.round(item.score)}/100 • {item.sessions} séances</div>{item.nextTarget && <div style={{ marginTop: 4, fontSize: 6.6, color: "#ffd86b" }}>PALIER {item.nextTarget}</div>}
              </div>)}
            </div>
            </>}

            {progressPanel === "skills" && skillProgressPanel === "badges" && <>
            <div style={{ margin: "10px 0 7px", fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#ffd86b" }}>BADGES TRAINING • {career.unlockedBadges}/{career.totalBadges}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 6 }}>
              {career.badges.map((badge) => <div key={badge.id} style={{ padding: 9, borderRadius: 11, border: badge.unlocked ? "1px solid rgba(255,216,107,.26)" : "1px solid rgba(255,255,255,.07)", background: badge.unlocked ? "rgba(255,216,107,.055)" : "rgba(255,255,255,.02)", opacity: badge.unlocked ? 1 : .58 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><b style={{ fontSize: 8.8 }}>{badge.unlocked ? "◆ " : "◇ "}{badge.title}</b><span style={{ fontSize: 7.2, color: badge.unlocked ? "#ffd86b" : "inherit" }}>{badge.unlocked ? "OK" : `${Math.min(badge.progress,badge.target)}/${badge.target}`}</span></div><div style={{ marginTop: 3, fontSize: 7.4, lineHeight: 1.3, opacity: .48 }}>{badge.description}</div>
              </div>)}
            </div>
            </>}

            {viewMode === "complete" && progressPanel === "overview" && <>
            <div style={{ marginTop: 10, padding: 13, borderRadius: 15, border: "1px solid rgba(39,220,255,.16)", background: "linear-gradient(135deg,rgba(39,220,255,.055),rgba(140,90,255,.035))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 8.5, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>SYNTHÈSE DU CYCLE</div>
                  <div style={{ marginTop: 4, fontSize: 12, fontWeight: 950 }}>{missionBoard.cycleChallenge.completed ? "Défi validé" : missionBoard.cycleChallenge.title}</div>
                  <div style={{ marginTop: 3, fontSize: 8.8, lineHeight: 1.4, opacity: .56 }}>{missionBoard.cycleChallenge.description}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,auto)", gap: 6, textAlign: "center" }}>
                  <div style={{ padding: "7px 8px", borderRadius: 9, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 11 }}>{Math.round(missionBoard.record.recentAverage)}</b><div style={{ fontSize: 6.8, opacity: .42 }}>MOY. 4</div></div>
                  <div style={{ padding: "7px 8px", borderRadius: 9, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 11 }}>{Math.round(missionBoard.record.weekBest)}</b><div style={{ fontSize: 6.8, opacity: .42 }}>BEST SEM.</div></div>
                  <div style={{ padding: "7px 8px", borderRadius: 9, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 11, color: "#ffd86b" }}>{Math.round(missionBoard.record.careerBest)}</b><div style={{ fontSize: 6.8, opacity: .42 }}>RECORD</div></div>
                </div>
              </div>
              <div style={{ marginTop: 9, height: 6, borderRadius: 999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}><div style={{ width: `${Math.max(2, Math.min(100, (missionBoard.cycleChallenge.progress / Math.max(1, missionBoard.cycleChallenge.target)) * 100))}%`, height: "100%", background: missionBoard.cycleChallenge.completed ? "linear-gradient(90deg,#8cffcb,#27dcff)" : "linear-gradient(90deg,#27dcff,#8c5aff)" }} /></div>
              <div style={{ marginTop: 7, fontSize: 8, opacity: .5 }}>PROCHAIN RECORD GLOBAL À BATTRE • {Math.round(missionBoard.record.personalBestTarget)}/100</div>
            </div>
            </>}

            {progressPanel === "coach" && coachPanel === "brief" && <>
            <div style={{ marginTop: 10, padding: 13, borderRadius: 15, border: coachDashboard.status === "recalibrate" ? "1px solid rgba(255,184,76,.24)" : "1px solid rgba(39,220,255,.17)", background: coachDashboard.status === "recalibrate" ? "linear-gradient(135deg,rgba(255,184,76,.06),rgba(140,90,255,.025))" : "linear-gradient(135deg,rgba(39,220,255,.05),rgba(140,90,255,.025))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 180, flex: 1 }}><div style={{ fontSize: 8, fontWeight: 950, color: "#27dcff", letterSpacing: 1 }}>ÉTAT DU COACHING</div><div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 950 }}>{coachDashboard.headline}</div><div style={{ marginTop: 4, fontSize: 8.6, lineHeight: 1.4, opacity: .58 }}>{coachDashboard.body}</div></div>
                <span style={{ padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,.045)", fontSize: 7.5, fontWeight: 950 }}>{coachDashboard.statusLabel}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10 }}>{coachDashboard.signals.map((signal) => <div key={signal.id} style={{ padding: 8, borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.055)" }}><b style={{ fontSize: 10.5, color: signal.tone === "watch" ? "#ffd86b" : signal.tone === "good" ? "#8cffcb" : "inherit" }}>{signal.value}</b><div style={{ marginTop: 2, fontSize: 6.3, opacity: .42 }}>{signal.label}</div></div>)}</div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.055)", fontSize: 8, opacity: .58 }}><b>RÈGLE ACTIVE :</b> {coachDashboard.nextRule}</div>
            </div>
            </>}

            {progressPanel === "coach" && coachPanel === "weeks" && <>
            <div style={{ margin: "12px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#8cffcb" }}>BILAN COACH HEBDOMADAIRE</div>
            <div style={{ padding: 13, borderRadius: 15, border: "1px solid rgba(80,255,174,.16)", background: "linear-gradient(135deg,rgba(80,255,174,.05),rgba(39,220,255,.025))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 260px" }}>
                  <div style={{ fontSize: 8.5, fontWeight: 950, letterSpacing: 1, color: "#8cffcb" }}>AWENA · SYNTHÈSE DE LA SEMAINE</div>
                  <div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 950 }}>{coachHistory.headline}</div>
                  <div style={{ marginTop: 4, fontSize: 8.8, lineHeight: 1.45, opacity: .58 }}>{coachHistory.body}</div>
                  <div style={{ marginTop: 6, fontSize: 8.5, lineHeight: 1.45, color: "#ffd86b" }}>{coachHistory.recommendation}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,auto)", gap: 6, textAlign: "center" }}>
                  <div style={{ padding: "7px 8px", borderRadius: 9, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 11 }}>{coachHistory.current.completedMissions}/{coachHistory.current.totalMissions}</b><div style={{ fontSize: 6.8, opacity: .42 }}>MISSIONS</div></div>
                  <div style={{ padding: "7px 8px", borderRadius: 9, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 11 }}>{Math.round(coachHistory.consistencyPct)}%</b><div style={{ fontSize: 6.8, opacity: .42 }}>RÉGULARITÉ</div></div>
                  <div style={{ padding: "7px 8px", borderRadius: 9, background: "rgba(255,255,255,.035)" }}><b style={{ fontSize: 11, color: coachHistory.performanceDelta >= 0 ? "#8cffcb" : "#ffd86b" }}>{coachHistory.previous ? `${coachHistory.performanceDelta >= 0 ? "+" : ""}${Math.round(coachHistory.performanceDelta)}` : "—"}</b><div style={{ fontSize: 6.8, opacity: .42 }}>VS SEM. -1</div></div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(115px,1fr))", gap: 6, marginTop: 10 }}>
                {coachHistory.current.missions.map((mission) => <div key={mission.id} style={{ padding: 8, borderRadius: 10, border: mission.completed ? "1px solid rgba(80,255,174,.18)" : "1px solid rgba(255,255,255,.07)", background: mission.completed ? "rgba(80,255,174,.04)" : "rgba(255,255,255,.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 5 }}><b style={{ fontSize: 8.5 }}>{mission.completed ? "✓ " : ""}{mission.label}</b><span style={{ fontSize: 7.5, opacity: .55 }}>{Math.round(mission.progress)}/{mission.target}</span></div>
                </div>)}
              </div>
            </div>

            <div style={{ margin: "12px 0 8px", fontSize: 10, fontWeight: 950, letterSpacing: 1, color: "#b99cff" }}>HISTORIQUE DES MISSIONS · 6 SEMAINES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {coachHistory.weeks.map((week, index) => <div key={week.weekStart} style={{ display: "grid", gridTemplateColumns: "minmax(110px,1fr) auto auto auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 11, border: index === 0 ? "1px solid rgba(39,220,255,.16)" : "1px solid rgba(255,255,255,.065)", background: index === 0 ? "rgba(39,220,255,.035)" : "rgba(255,255,255,.018)", opacity: week.sessions ? 1 : .52 }}>
                <div><b style={{ fontSize: 8.8 }}>{index === 0 ? "CETTE SEMAINE" : week.label}</b><div style={{ marginTop: 2, fontSize: 7.3, opacity: .45 }}>{week.headline} • {week.dominantFamilyLabel}</div></div>
                <div style={{ textAlign: "center" }}><b style={{ fontSize: 9.5 }}>{week.sessions}</b><div style={{ fontSize: 6.4, opacity: .4 }}>SÉANCES</div></div>
                <div style={{ textAlign: "center" }}><b style={{ fontSize: 9.5 }}>{week.completedMissions}/{week.totalMissions}</b><div style={{ fontSize: 6.4, opacity: .4 }}>MISSIONS</div></div>
                <div style={{ minWidth: 42, textAlign: "center" }}><b style={{ fontSize: 10.5, color: week.status === "mastered" ? "#8cffcb" : week.status === "solid" ? "#27dcff" : "inherit" }}>{week.sessions ? Math.round(week.averagePerformance) : "—"}</b><div style={{ fontSize: 6.4, opacity: .4 }}>MOY.</div></div>
              </div>)}
            </div>
            </>}

            {progressPanel === "skills" && skillProgressPanel === "mastery" && <>
            <div style={{ margin: "12px 0 7px", fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>ÉVOLUTION DÉTAILLÉE</div>
            <CompactIconNav items={familyOrder.map((familyId) => ({ id: familyId, label: TRAINING_FAMILY_META[familyId].label.toUpperCase(), icon: familyId }))} activeId={diagnosisFamily} onChange={(id) => setDiagnosisFamily(id as TrainingExerciseFamily)} />
            {(() => {
              const row = progression.find((item) => item.family === diagnosisFamily) || progression[0];
              if (!row) return null;
              const deltaLabel = row.delta > 2 ? `+${Math.round(row.delta)}` : row.delta < -2 ? `${Math.round(row.delta)}` : "stable";
              const points = row.points;
              const maxScore = Math.max(100, ...points.map((point) => point.score));
              return <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}><b style={{ fontSize: 10.5 }}>{row.label}</b><span style={{ fontSize: 9, color: row.delta >= 0 ? "#8cffcb" : "#ffd86b", opacity: .78 }}>{deltaLabel}</span></div>
                <div style={{ marginTop: 9, height: 52, display: "flex", gap: 3, alignItems: "end" }}>{points.length ? points.map((point, index) => <div key={`${point.endedAt}-${index}`} title={`${Math.round(point.score)}/100`} style={{ flex: 1, minWidth: 4, height: `${Math.max(5, (point.score / maxScore) * 100)}%`, borderRadius: "4px 4px 2px 2px", background: point.success ? "linear-gradient(180deg,#27dcff,#8c5aff)" : "rgba(255,255,255,.18)" }} />) : <div style={{ fontSize: 9, opacity: .45, alignSelf: "center" }}>Pas encore de données</div>}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginTop: 9, textAlign: "center" }}><div><b style={{ fontSize: 11 }}>{Math.round(row.recentAverage)}</b><div style={{ fontSize: 7, opacity: .45 }}>RÉCENT</div></div><div><b style={{ fontSize: 11 }}>{Math.round(row.previousAverage)}</b><div style={{ fontSize: 7, opacity: .45 }}>AVANT</div></div><div><b style={{ fontSize: 11 }}>{Math.round(row.bestScore)}</b><div style={{ fontSize: 7, opacity: .45 }}>RECORD</div></div><div><b style={{ fontSize: 11 }}>{row.streak}</b><div style={{ fontSize: 7, opacity: .45 }}>SÉRIE</div></div></div>
                <div style={{ marginTop: 8, fontSize: 7.6, opacity: .5 }}>Objectifs et échéances sont désormais regroupés dans <b>DIAGNOSTIC → OBJECTIF</b>.</div>
              </div>;
            })()}
            </>}

            {progressPanel === "cycles" && <>
            <div style={{ margin: "12px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>BILANS DE BLOCS • 12 SÉANCES</div>
            {!blockReviews.length ? <div style={{ padding: 14, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", fontSize: 9.5, opacity: .58 }}>Le premier bilan complet apparaîtra après 12 programmes terminés.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 7 }}>
              {blockReviews.map((review, index) => <div key={`block-review-${review.blockNumber}`} style={{ padding: 11, borderRadius: 13, border: index === 0 ? "1px solid rgba(39,220,255,.22)" : "1px solid rgba(255,255,255,.075)", background: index === 0 ? "rgba(39,220,255,.045)" : "rgba(255,255,255,.022)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b style={{ fontSize: 9.5 }}>Bloc {review.blockNumber}</b><span style={{ fontSize: 7.5, color: review.outcome === "rebuild" ? "#ffd86b" : review.outcome === "breakthrough" || review.outcome === "progress" ? "#8cffcb" : "#27dcff" }}>{review.outcomeLabel}</span></div>
                <div style={{ marginTop: 6, fontSize: 8.2, lineHeight: 1.35, opacity: .52 }}>{new Date(review.startAt).toLocaleDateString()} → {new Date(review.endAt).toLocaleDateString()} • dominante {review.dominantLabel}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginTop: 9, textAlign: "center" }}>
                  <div><b style={{ fontSize: 11 }}>{Math.round(review.average)}</b><div style={{ fontSize: 6.2, opacity: .42 }}>MOY.</div></div>
                  <div><b style={{ fontSize: 11 }}>{Math.round(review.accuracy)}%</b><div style={{ fontSize: 6.2, opacity: .42 }}>PRÉC.</div></div>
                  <div><b style={{ fontSize: 11 }}>{Math.round(review.consistency)}</b><div style={{ fontSize: 6.2, opacity: .42 }}>RÉG.</div></div>
                  <div><b style={{ fontSize: 11 }}>{review.familyCoverage}/6</b><div style={{ fontSize: 6.2, opacity: .42 }}>FAMILLES</div></div>
                </div>
                <div style={{ marginTop: 8, paddingTop: 7, borderTop: "1px solid rgba(255,255,255,.05)", fontSize: 7.6, opacity: .55 }}>Bloc suivant : <b>{review.nextPriorityLabel}</b> • cible {review.nextTargetAverage}/100{review.blockNumber > 1 ? ` • ${review.deltaVsPrevious >= 0 ? "+" : ""}${Math.round(review.deltaVsPrevious)} pts` : ""}</div>
              </div>)}
            </div>}

            <div style={{ margin: "16px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#8cffcb" }}>HISTORIQUE DES CYCLES</div>
            {!cycleHistory.length ? <div style={{ padding: 14, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", fontSize: 9.5, opacity: .58 }}>Il faut 4 programmes complets pour fermer un premier cycle.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
              {cycleHistory.map((cycle, index) => <div key={`cycle-history-${cycle.cycleNumber}`} style={{ padding: 10, borderRadius: 12, border: index === 0 ? "1px solid rgba(80,255,174,.22)" : "1px solid rgba(255,255,255,.075)", background: index === 0 ? "rgba(80,255,174,.04)" : "rgba(255,255,255,.022)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b style={{ fontSize: 9.5 }}>Cycle {cycle.cycleNumber}</b><span style={{ fontSize: 8, opacity: .5 }}>{cycle.families.length}/6 familles</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5, marginTop: 8, textAlign: "center" }}>
                  <div><b style={{ fontSize: 12 }}>{Math.round(cycle.average)}</b><div style={{ fontSize: 6.5, opacity: .42 }}>MOY.</div></div>
                  <div><b style={{ fontSize: 12 }}>{Math.round(cycle.consistency)}</b><div style={{ fontSize: 6.5, opacity: .42 }}>RÉG.</div></div>
                  <div><b style={{ fontSize: 12 }}>{Math.round(cycle.bestScore)}</b><div style={{ fontSize: 6.5, opacity: .42 }}>BEST</div></div>
                </div>
                <div style={{ marginTop: 7, fontSize: 7.5, opacity: .5 }}>Dominante : <b>{cycle.dominantLabel}</b> • précision {Math.round(cycle.accuracy)}%</div>
              </div>)}
            </div>}
            </>}

            {progressPanel === "skills" && skillProgressPanel === "records" && <>
            <div style={{ margin: "10px 0 7px", fontSize: 9.5, fontWeight: 950, letterSpacing: 1, color: "#ffd86b" }}>RECORDS PERSONNELS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 7 }}>
              {progression.map((row) => <div key={`record-${row.family}`} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,216,107,.12)", background: "rgba(255,216,107,.035)" }}>
                <div style={{ fontSize: 8.5, opacity: .55 }}>{row.label.toUpperCase()}</div>
                <div style={{ marginTop: 3, fontSize: 18, fontWeight: 950 }}>{Math.round(row.bestScore)}<span style={{ fontSize: 9, opacity: .5 }}>/100</span></div>
                <div style={{ marginTop: 3, fontSize: 8, opacity: .45 }}>{row.sessions} séance{row.sessions > 1 ? "s" : ""} • série {row.streak}</div>
              </div>)}
            </div>
            </>}

            {progressPanel === "overview" && <>
            <div style={{ margin: "12px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#ffd86b" }}>RÉFÉRENCE DE NIVEAU</div>
            <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,216,107,.16)", background: "linear-gradient(135deg,rgba(255,216,107,.045),rgba(140,90,255,.025))" }}>
              {!assessment.available ? <div style={{ fontSize: 9, opacity: .58 }}>Aucun bilan standardisé enregistré. Lance le Bilan de niveau depuis PROGRAMME pour obtenir une référence comparable sur les 6 compétences.</div> : <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div><b style={{ fontSize: 11 }}>{assessment.headline}</b><div style={{ marginTop: 3, fontSize: 8, opacity: .48 }}>{new Date(assessment.endedAt).toLocaleDateString()} • couverture {assessment.coverage}%</div></div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>{Math.round(assessment.overallScore)}<span style={{ fontSize: 8, opacity: .45 }}>/100</span></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
                  {assessment.familyScores.map((row) => <div key={row.family} style={{ padding: 8, borderRadius: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.055)" }}><div style={{ fontSize: 6.8, opacity: .42 }}>{row.label}</div><b style={{ display: "block", marginTop: 2, fontSize: 12 }}>{Math.round(row.score)}</b><div style={{ marginTop: 2, fontSize: 6.8, opacity: .38 }}>{Math.round(row.accuracyPct)}% précision</div></div>)}
                </div>
                <div style={{ marginTop: 8, fontSize: 7.8, opacity: .5 }}>Point fort : <b style={{ color: "#8cffcb" }}>{assessment.strongestLabel}</b> • axe prioritaire : <b style={{ color: "#ffd86b" }}>{assessment.weakestLabel}</b>{assessment.delta == null ? "" : ` • évolution globale ${assessment.delta >= 0 ? "+" : ""}${Math.round(assessment.delta)} pts`}</div>
              </>}
            </div>
            </>}

            {progressPanel === "coach" && coachPanel === "live" && <>
            <div style={{ margin: "12px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>LIVE COACH • 6 DERNIÈRES SÉANCES</div>
            <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(39,220,255,.16)", background: "linear-gradient(135deg,rgba(39,220,255,.045),rgba(140,90,255,.03))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 180, flex: 1 }}><b style={{ fontSize: 10.5 }}>{liveCoachHistory.headline}</b><div style={{ marginTop: 4, fontSize: 8.5, lineHeight: 1.4, opacity: .58 }}>{liveCoachHistory.body}</div></div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.04)", fontSize: 7.5, fontWeight: 900 }}>STABLE • {Math.round(liveCoachHistory.adherenceAverage)}%</span>
                  <span style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.04)", fontSize: 7.5, fontWeight: 900 }}>CIBLES • {Math.round(liveCoachHistory.targetRate)}%</span>
                  <span style={{ padding: "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.04)", fontSize: 7.5, fontWeight: 900 }}>ADAPTÉES • {liveCoachHistory.adaptedSessions}/{Math.max(1, liveCoachHistory.sampleSize)}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
                {[
                  ["ÉCHAUFF.", liveCoachHistory.warmupAverage],
                  ["BLOC", liveCoachHistory.coreAverage],
                  ["FINISH", liveCoachHistory.finishAverage],
                ].map(([label, value]) => <div key={String(label)} style={{ padding: 8, borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.055)" }}><b style={{ fontSize: 12 }}>{Number(value) > 0 ? Math.round(Number(value)) : "—"}</b><div style={{ marginTop: 2, fontSize: 6.8, opacity: .42 }}>{label}</div></div>)}
              </div>
              {liveCoachHistory.recurringFamily && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.055)", fontSize: 8.2, opacity: .62 }}>Signal récurrent : <b style={{ color: "#ffd86b" }}>{liveCoachHistory.recurringFamilyLabel}</b> • {liveCoachHistory.recurringFamilyCount}/{liveCoachHistory.sampleSize} séances. Ce signal peut désormais peser davantage que l'incident isolé de la dernière séance.</div>}
              <div style={{ marginTop: 7, fontSize: 7.8, opacity: .48 }}>Plans stables : <b>{liveCoachHistory.stableSessions}</b> • plans adaptés : <b>{liveCoachHistory.adaptedSessions}</b>{liveCoachHistory.stableAverage > 0 && liveCoachHistory.adaptedAverage > 0 ? ` • perf. stable ${Math.round(liveCoachHistory.stableAverage)} vs adaptée ${Math.round(liveCoachHistory.adaptedAverage)}` : ""}</div>
            </div>

            </>}

            {progressPanel === "coach" && coachPanel === "effectiveness" && <>
            <div style={{ margin: "12px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#8cffcb" }}>EFFICACITÉ DU COACHING • 10 SÉANCES</div>
            <div style={{ padding: 12, borderRadius: 14, border: coachingEffectiveness.adaptationEffect === "negative" ? "1px solid rgba(255,184,76,.22)" : "1px solid rgba(80,255,174,.16)", background: coachingEffectiveness.adaptationEffect === "negative" ? "linear-gradient(135deg,rgba(255,184,76,.055),rgba(140,90,255,.025))" : "linear-gradient(135deg,rgba(80,255,174,.045),rgba(39,220,255,.025))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ minWidth: 180, flex: 1 }}><b style={{ fontSize: 10.5 }}>{coachingEffectiveness.headline}</b><div style={{ marginTop: 4, fontSize: 8.5, lineHeight: 1.4, opacity: .6 }}>{coachingEffectiveness.body}</div></div>
                <span style={{ padding: "5px 8px", borderRadius: 999, background: coachingEffectiveness.adaptationEffect === "positive" ? "rgba(80,255,174,.10)" : coachingEffectiveness.adaptationEffect === "negative" ? "rgba(255,184,76,.10)" : "rgba(255,255,255,.045)", fontSize: 7.5, fontWeight: 950 }}>{coachingEffectiveness.adaptationEffectLabel}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginTop: 10 }}>
                {[
                  ["GAIN APRÈS ADAPT.", coachingEffectiveness.sampleSize >= 3 ? `${coachingEffectiveness.postAdaptationLift >= 0 ? "+" : ""}${Math.round(coachingEffectiveness.postAdaptationLift)}` : "—"],
                  ["TAUX ADAPT.", `${Math.round(coachingEffectiveness.recentAdaptationRate)}%`],
                  ["PERF. STABLE", coachingEffectiveness.stableAverage > 0 ? Math.round(coachingEffectiveness.stableAverage) : "—"],
                  ["PERF. ADAPTÉE", coachingEffectiveness.adaptedAverage > 0 ? Math.round(coachingEffectiveness.adaptedAverage) : "—"],
                ].map(([label, value]) => <div key={String(label)} style={{ padding: 8, borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.055)" }}><b style={{ fontSize: 11.5 }}>{value}</b><div style={{ marginTop: 2, fontSize: 6.4, opacity: .42 }}>{label}</div></div>)}
              </div>
              {coachingEffectiveness.stagnatingFamily && <div style={{ marginTop: 8, padding: 9, borderRadius: 10, background: "rgba(255,216,107,.055)", border: "1px solid rgba(255,216,107,.14)", fontSize: 8.2, lineHeight: 1.4 }}>
                <b style={{ color: "#ffd86b" }}>FOCUS EN STAGNATION :</b> {coachingEffectiveness.stagnatingFamilyLabel} • {coachingEffectiveness.stagnationSamples} prescriptions suivies • évolution {coachingEffectiveness.stagnationDelta >= 0 ? "+" : ""}{Math.round(coachingEffectiveness.stagnationDelta)} pts.
                {coachingEffectiveness.relayFamily && <> Relais conseillé : <b style={{ color: "#8cffcb" }}>{coachingEffectiveness.relayFamilyLabel}</b>.</>}
              </div>}
              <div style={{ marginTop: 7, fontSize: 7.7, opacity: .48 }}>Évolution du taux d'adaptation : <b>{coachingEffectiveness.adaptationRateDelta >= 0 ? "+" : ""}{Math.round(coachingEffectiveness.adaptationRateDelta)} pts</b> vs période précédente. Awena privilégie désormais la stabilité si les adaptations n'apportent plus de gain mesurable.</div>
            </div>
            </>}

            {progressPanel === "history" && historyPanel === "plans" && <>
            <div style={{ margin: "12px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#b99cff" }}>HISTORIQUE DES PLANS</div>
            {!programSessions.length ? <div style={{ padding: 14, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", fontSize: 9.5, opacity: .58 }}>Aucun programme complet enregistré pour le moment.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {programSessions.slice(0, 8).map((session) => <div key={session.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center", padding: 10, borderRadius: 12, border: "1px solid rgba(185,156,255,.10)", background: "rgba(140,90,255,.025)" }}>
                <div><b style={{ fontSize: 9.5 }}>{session.programTitle}</b><div style={{ marginTop: 2, fontSize: 7.8, opacity: .45 }}>{new Date(session.endedAt).toLocaleDateString()} • {session.durationMin || "—"} min • {session.steps} étapes</div></div>
                <div style={{ textAlign: "center" }}><b style={{ fontSize: 10 }}>{session.successes}/{session.steps}</b><div style={{ fontSize: 6.8, opacity: .4 }}>RÉUSSIES</div></div>
                <div style={{ textAlign: "center" }}><b style={{ fontSize: 10 }}>{Math.round(session.accuracyPct)}%</b><div style={{ fontSize: 6.8, opacity: .4 }}>PRÉC.</div></div>
                <div style={{ minWidth: 38, textAlign: "center" }}><b style={{ fontSize: 12, color: session.performanceScore >= 75 ? "#8cffcb" : session.performanceScore < 50 ? "#ffd86b" : "inherit" }}>{Math.round(session.performanceScore)}</b><div style={{ fontSize: 6.8, opacity: .4 }}>PERF.</div></div>
              </div>)}
            </div>}
            </>}

            {progressPanel === "history" && historyPanel === "exercises" && <>
            <div style={{ margin: "12px 0 8px", fontSize: 11, fontWeight: 950, letterSpacing: 1, color: "#27dcff" }}>DERNIÈRES SÉANCES DU CENTRE</div>
            {!labSessions.length ? <div style={{ padding: 18, borderRadius: 15, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.03)", fontSize: 11, opacity: .7 }}>Aucune séance du Centre enregistrée pour le moment. Lance un exercice ou un programme pour créer ta courbe de progression.</div> : <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {labSessions.map((row) => {
                const exerciseId = String(row.metrics?.exerciseId || row.config?.exerciseId || "");
                const ex = TRAINING_EXERCISE_CATALOG.find((item) => item.id === exerciseId);
                const performance = Number(row.metrics?.performanceScore || row.metrics?.score || 0);
                return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", padding: 11, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}>
                  <div><b style={{ fontSize: 10.5 }}>{ex?.title || String(row.metrics?.exerciseTitle || "Centre d'entraînement")}</b><div style={{ marginTop: 3, fontSize: 8.5, opacity: .48 }}>{new Date(row.endedAt).toLocaleDateString()} • {row.darts} darts</div></div>
                  <div style={{ textAlign: "center" }}><b style={{ fontSize: 11 }}>{pct(row.accuracyPct)}</b><div style={{ fontSize: 7.5, opacity: .45 }}>PRÉC.</div></div>
                  <div style={{ textAlign: "center", minWidth: 42 }}><b style={{ fontSize: 12, color: row.success ? "#8cffcb" : "inherit" }}>{Math.round(performance)}</b><div style={{ fontSize: 7.5, opacity: .45 }}>PERF.</div></div>
                </div>;
              })}
            </div>}
            </>}
          </div>}
        </div>
      }
    />
  );
}
