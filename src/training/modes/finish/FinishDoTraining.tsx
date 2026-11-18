import React from "react";
import "./finishDoTraining.css";
import { useLang } from "../../../contexts/LangContext";
import { recordTrainingSession } from "../../stats/trainingStatsHub";
import { loadFinishDoProgress, saveFinishDoAttempt, getFinishDoPriority } from "./finishDoProgress";

/** A deterministic DO checkout tutor. All scores are derived from actual darts, never intended targets. */
type Dart = { label: string; value: number; finish: boolean; kind: "S" | "D" | "T" | "MISS" };
const DARTS: Dart[] = [
  ...Array.from({ length: 20 }, (_, i) => ({ label: `S${i + 1}`, value: i + 1, finish: false, kind: "S" as const })),
  ...Array.from({ length: 20 }, (_, i) => ({ label: `D${i + 1}`, value: (i + 1) * 2, finish: true, kind: "D" as const })),
  ...Array.from({ length: 20 }, (_, i) => ({ label: `T${i + 1}`, value: (i + 1) * 3, finish: false, kind: "T" as const })),
  { label: "BULL25", value: 25, finish: false, kind: "S" },
  { label: "BULL50", value: 50, finish: true, kind: "D" },
  { label: "MISS", value: 0, finish: false, kind: "MISS" },
];

const priority = (d: Dart) =>
  d.label === "D20"
    ? 0
    : d.label === "D16"
      ? 1
      : d.label === "D18"
        ? 2
        : d.label === "D12"
          ? 3
          : d.label === "D10"
            ? 4
            : d.label === "D8"
              ? 5
              : d.label === "BULL50"
                ? 12
                : d.kind === "T"
                  ? 20 - d.value / 10
                  : d.kind === "D"
                    ? 25
                    : d.kind === "S"
                      ? 35
                      : 100;

const throwOptions = DARTS.filter((d) => d.value > 0);

/** Fewer darts first, then prefer practical doubles / high-scoring setup darts. */
export function checkoutRoutes(score: number, dartsLeft = 3, maxResults = 3): Dart[][] {
  if (!Number.isInteger(score) || score < 2 || score > 170 || dartsLeft < 1) return [];
  const result: Dart[][] = [];
  const visit = (remaining: number, depth: number, route: Dart[]) => {
    if (depth === 1) {
      for (const dart of throwOptions) if (dart.finish && dart.value === remaining) result.push([...route, dart]);
      return;
    }
    for (const dart of throwOptions) {
      if (dart.value >= remaining - 1) continue;
      if (dart.kind === "D" && remaining > 50) continue;
      visit(remaining - dart.value, depth - 1, [...route, dart]);
    }
  };
  for (let n = 1; n <= Math.min(3, dartsLeft); n += 1) {
    visit(score, n, []);
    if (result.length) break;
  }
  result.sort((a, b) => {
    const pa = a.reduce((sum, d, i) => sum + priority(d) * (i === a.length - 1 ? 2 : 0.1), 0);
    const pb = b.reduce((sum, d, i) => sum + priority(d) * (i === b.length - 1 ? 2 : 0.1), 0);
    return pa - pb || a.map((d) => d.label).join().localeCompare(b.map((d) => d.label).join());
  });
  const seen = new Set<string>();
  return result
    .filter((route) => {
      const key = route.map((x) => x.label).join("-");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxResults);
}

const RECOVERY_DRILLS = [
  { id: "single20", start: 100, aim: "T20", actual: "S20", remaining: 80, route: "T20 → D10", noteFr: "Le simple 20 laisse 80 : il reste deux fléchettes pour T20 puis D10.", noteEn: "S20 leaves 80: two darts remain for T20 then D10." },
  { id: "neighbor5", start: 100, aim: "T20", actual: "T5", remaining: 85, route: "T15 → D20", noteFr: "Le triple 5 voisin vaut 15 : recalcule sur 85.", noteEn: "Neighboring T5 scores 15: recalculate from 85." },
  { id: "single19", start: 101, aim: "T20", actual: "S20", remaining: 81, route: "T19 → D12", noteFr: "Le simple 20 laisse 81. T19 puis D12 fait 81.", noteEn: "S20 leaves 81. T19 then D12 completes 81." },
  { id: "double16", start: 32, aim: "D16", actual: "S16", remaining: 16, route: "D8", noteFr: "Tu touches le simple 16 : D8 termine. Si tu touches S8, vise ensuite D4.", noteEn: "S16 leaves D8. If you hit S8 next, aim at D4." },
  { id: "bull25", start: 50, aim: "BULL50", actual: "BULL25", remaining: 25, route: "S9 → D8", noteFr: "BULL25 n'est pas un double final : S9 prépare D8.", noteEn: "BULL25 cannot finish DO: S9 prepares D8." },
  { id: "safe41", start: 41, aim: "S1", actual: "S9", remaining: 32, route: "D16", noteFr: "Un S9 prépare D16 : bon repli quand S1 était prévu.", noteEn: "S9 leaves D16: a useful alternative to the planned S1." },
] as const;

const PREFERRED_LEAVES = [40, 32, 36, 24, 16, 20, 28, 8, 4, 2, 50] as const;
export function checkoutSetup(score: number, dartsLeft: number): { route: Dart[]; leave: number } | null {
  if (!Number.isInteger(score) || score < 2 || dartsLeft < 1) return null;
  const candidates: { route: Dart[]; leave: number; weight: number }[] = [];
  const visit = (remaining: number, depth: number, route: Dart[]) => {
    if (route.length && PREFERRED_LEAVES.includes(remaining as (typeof PREFERRED_LEAVES)[number])) {
      const rank = PREFERRED_LEAVES.indexOf(remaining as (typeof PREFERRED_LEAVES)[number]);
      candidates.push({ route, leave: remaining, weight: rank * 9 + route.length * 3 });
    }
    if (depth === 0) return;
    for (const dart of throwOptions) {
      if (dart.value >= remaining - 1) continue;
      if (dart.kind === "D") continue;
      visit(remaining - dart.value, depth - 1, [...route, dart]);
    }
  };
  visit(score, Math.min(3, dartsLeft), []);
  candidates.sort(
    (a, b) =>
      a.weight - b.weight ||
      b.route.reduce((sum, d) => sum + d.value, 0) - a.route.reduce((sum, d) => sum + d.value, 0),
  );
  return candidates[0] ? { route: candidates[0].route, leave: candidates[0].leave } : null;
}

const PRO_TIPS = [
  { score: 32, fr: "La chaîne D16 → D8 → D4 → D2 → D1 te laisse plusieurs replis si tu touches un simple.", en: "The D16 → D8 → D4 → D2 → D1 ladder gives useful recovery doubles after a single." },
  { score: 40, fr: "Sur D20, si tu touches S20, il reste 20 : le plan B est D10.", en: "At D20, hitting S20 leaves 20: switch to D10." },
  { score: 50, fr: "Au BULL50, toucher BULL25 laisse 25 : joue S9 puis D8 si tu as encore deux fléchettes.", en: "At BULL50, hitting BULL25 leaves 25: S9 then D8 with two darts left." },
  { score: 100, fr: "À 100, T20 → D20. Si le T20 devient S20, joue T20 → D10.", en: "At 100, T20 → D20. If T20 lands S20, switch to T20 → D10." },
];

/** Feedback is based only on scored darts, never on an unobserved intended target. */
export function explainCheckoutShot(input: {
  before: number; after: number; label: string; bust: boolean; finish: boolean;
  dartsLeft: number; hasRoute: boolean; hasSetup: boolean; locale: "fr" | "en";
}): string {
  const { before, after, label, bust, finish, dartsLeft, hasRoute, hasSetup, locale } = input;
  const en = locale === "en";
  if (finish) return en ? `${label}: double-out completed. Great finish!` : `${label} : sortie DO validée. Bien joué !`;
  if (bust) return en ? `${label}: BUST. The visit's starting score is restored.` : `${label} : BUST. Le score de début de volée est restauré.`;
  if (dartsLeft === 3) return en ? `${label}: ${before} → ${after}. New visit: 3 darts available.` : `${label} : ${before} → ${after}. Nouvelle volée : 3 fléchettes disponibles.`;
  if (hasRoute) return en ? `${label}: ${before} → ${after}. A checkout is still possible in ${dartsLeft} dart(s).` : `${label} : ${before} → ${after}. Un finish reste possible en ${dartsLeft} fléchette(s).`;
  if (hasSetup) return en ? `${label}: ${before} → ${after}. No checkout now: prepare the next visit.` : `${label} : ${before} → ${after}. Plus de sortie immédiate : prépare la prochaine volée.`;
  return en ? `${label}: ${before} → ${after}. Recalculate from the actual hit.` : `${label} : ${before} → ${after}. Recalcule depuis la touche réelle.`;
}

type DoublePracticeStat = { label: string; attempts: number; checkouts: number };
/** Counts recorded D / BULL50 inputs, not unobservable missed targets. */
export function doublePracticeStats(shots: Shot[]): DoublePracticeStat[] {
  const rows = new Map<string, DoublePracticeStat>();
  for (const shot of shots) {
    if (!shot.dart.finish) continue;
    const key = shot.dart.label;
    const row = rows.get(key) ?? { label: key, attempts: 0, checkouts: 0 };
    row.attempts += 1;
    if (shot.finish) row.checkouts += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.attempts - a.attempts || a.label.localeCompare(b.label));
}

/** Targets explicitly declared before a dart; never inferred from the actual scoring segment. */
type AimedDoubleStat = { label: string; attempts: number; hits: number; misses: number; rate: number; singleHits: number };
export function aimedDoubleStats(shots: Shot[]): AimedDoubleStat[] {
  const rows = new Map<string, AimedDoubleStat>();
  for (const shot of shots) {
    const aim = shot.aimedDouble;
    if (!aim) continue;
    const row = rows.get(aim) ?? { label: aim, attempts: 0, hits: 0, misses: 0, rate: 0, singleHits: 0 };
    row.attempts += 1;
    if (shot.dart.label === aim) row.hits += 1;
    else {
      row.misses += 1;
      if (aim.startsWith("D") && shot.dart.label === `S${aim.slice(1)}`) row.singleHits += 1;
      if (aim === "BULL50" && shot.dart.label === "BULL25") row.singleHits += 1;
    }
    row.rate = Math.round(row.hits * 100 / row.attempts);
    rows.set(aim, row);
  }
  return [...rows.values()].sort((a, b) => a.rate - b.rate || b.attempts - a.attempts || a.label.localeCompare(b.label));
}
/** Short checkout revision based on explicitly observed target errors only. */
export function checkoutRevisionForAim(label: string) {
  const target = label === "BULL50" ? 50 : /^D(?:[1-9]|1[0-9]|20)$/.test(label) ? Number(label.slice(1)) * 2 : 0;
  if (!target || label === "D1") return null;
  const hit = label === "BULL50" ? "BULL25" : `S${label.slice(1)}`;
  const remain = label === "BULL50" ? 25 : target / 2;
  const answer = remain % 2 === 0 ? `D${remain / 2}` : `S1 → D${(remain - 1) / 2}`;
  const alternatives = [label === "BULL50" ? "BULL50" : `D${label.slice(1)}`, `D${Math.min(20, Math.max(1, Math.floor(remain / 2) + 1))}`];
  const options = [answer, ...alternatives.filter(option => option !== answer)].slice(0, 3);
  return { label, hit, remain, answer, options };
}

const AIMABLE_DOUBLES = [...Array.from({ length: 20 }, (_, i) => `D${i + 1}`), "BULL50"];
const doubleValue = (label: string) => label === "BULL50" ? 50 : Number(label.slice(1)) * 2;

const DEFAULT_SCORES = [32, 40, 36, 24, 50, 46, 52, 58, 64, 70, 81, 87, 96, 100, 101, 121, 125, 130, 141, 164, 167, 170];
const BASIC_SCORES = DEFAULT_SCORES.slice(0, 8);
const ADVANCED_SCORES = DEFAULT_SCORES.slice(8);
const RANDOM_VISIBLE_SCORES = DEFAULT_SCORES.slice(0, 12);
type Shot = { dart: Dart; before: number; after: number; bust: boolean; finish: boolean; aimedDouble?: string };

const labelMap = {
  basic: { fr: "2–70", en: "2–70" },
  advanced: { fr: "81–170", en: "81–170" },
  random: { fr: "Mixte", en: "Mixed" },
} as const;

export default function FinishDoTraining({ onExit, challenge = false, participantId }: { onExit: () => void; challenge?: boolean; participantId?: string | null }) {
  const { lang } = useLang();
  const en = String(lang).toLowerCase().startsWith("en");
  const [score, setScore] = React.useState(40);
  const [level, setLevel] = React.useState<"basic" | "advanced" | "random">("basic");
  const [visitStart, setVisitStart] = React.useState(40);
  const [shots, setShots] = React.useState<Shot[]>([]);
  const [dartsUsed, setDartsUsed] = React.useState(0);
  const [won, setWon] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [showRoutes, setShowRoutes] = React.useState(true);
  const [type, setType] = React.useState<"S" | "D" | "T">("S");
  const [attempts, setAttempts] = React.useState(0);
  const [successes, setSuccesses] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  const [activeDrill, setActiveDrill] = React.useState<string | null>(null);
  const [showConfig, setShowConfig] = React.useState(true);
  const [showCoachDetails, setShowCoachDetails] = React.useState(false);
  const [history, setHistory] = React.useState<{ score: number; won: boolean; darts: number }[]>([]);
  const [showSessionDetails, setShowSessionDetails] = React.useState(false);
  const [completedShots, setCompletedShots] = React.useState<Shot[]>([]);
  const [trackAim, setTrackAim] = React.useState(false);
  const [aimedDouble, setAimedDouble] = React.useState("D20");
  const [revisionChoice, setRevisionChoice] = React.useState<string | null>(null);
  const [showRevision, setShowRevision] = React.useState(false);
  const [career, setCareer] = React.useState(() => loadFinishDoProgress(participantId));
  React.useEffect(() => { setCareer(loadFinishDoProgress(participantId)); }, [participantId]);

  const pendingResult = React.useRef<{ score: number; won: boolean; darts: number; shots: Shot[] } | null>(null);
  const savePending = () => {
    const result = pendingResult.current;
    if (!result) return;
    pendingResult.current = null;
    const hits = result.shots.filter((s) => s.dart.kind !== "MISS").length;
    setCompletedShots((prev) => [...prev, ...result.shots]);
    setCareer(saveFinishDoAttempt(participantId, result.shots.map(s => ({ aimedDouble: s.aimedDouble, actual: s.dart.label }))));
    recordTrainingSession(
      challenge ? "training_finish_challenge" : "training_finish_do",
      result.darts,
      result.shots.reduce((sum, s) => sum + s.dart.value, 0),
      {
        participantId: participantId || "guest",
        checkoutScore: result.score,
        success: result.won,
        checkoutSuccess: result.won,
        hits,
        finishDoubleOut: true,
        busts: result.shots.filter((s) => s.bust).length,
        dartsLog: result.shots.map((s) => ({ label: s.dart.label, score: s.dart.value, bust: s.bust, finish: s.finish, ...(s.aimedDouble ? { aimedDouble: s.aimedDouble, targetHit: s.dart.label === s.aimedDouble } : {}) })),
      },
    );
  };

  const drill = RECOVERY_DRILLS.find((d) => d.id === activeDrill);
  const lastShot = shots.length ? shots[shots.length - 1] : null;
  const visitThrows = shots.reduce((count, shot) => {
    const next = count + 1;
    return shot.bust || next === 3 ? 0 : next;
  }, 0);
  const remainingDarts = 3 - visitThrows;
  const setup = React.useMemo(() => checkoutSetup(score, remainingDarts), [score, remainingDarts]);
  const tip = PRO_TIPS.find((t) => t.score === score);
  const activeRoutes = React.useMemo(() => checkoutRoutes(score, remainingDarts), [score, remainingDarts]);
  const isBust = shots.length > 0 && shots[shots.length - 1]?.bust;
  const tacticalFeedback = lastShot && started ? explainCheckoutShot({
    before: lastShot.before,
    after: lastShot.after,
    label: lastShot.dart.label,
    bust: lastShot.bust,
    finish: lastShot.finish,
    dartsLeft: remainingDarts,
    hasRoute: activeRoutes.length > 0,
    hasSetup: !!setup,
    locale: en ? "en" : "fr",
  }) : null;
  const doubleStats = React.useMemo(() => doublePracticeStats([...completedShots, ...shots]), [completedShots, shots]);
  const aimStats = React.useMemo(() => aimedDoubleStats([...completedShots, ...shots]), [completedShots, shots]);
  const aimLastShot = lastShot?.aimedDouble ? lastShot : null;
  const aimHit = !!aimLastShot && aimLastShot.dart.label === aimLastShot.aimedDouble;
  const weakestAim = aimStats.find(item => item.misses > 0 && checkoutRevisionForAim(item.label)) ?? null;
  const careerPriority = getFinishDoPriority(career);
  const revisionAim = weakestAim || (careerPriority ? { label: careerPriority.label, attempts: careerPriority.attempts, hits: careerPriority.hits, misses: careerPriority.attempts - careerPriority.hits, rate: Math.round(careerPriority.hits * 100 / careerPriority.attempts) } : null);
  const revision = revisionAim ? checkoutRevisionForAim(revisionAim.label) : null;
  const nextScore = () => {
    const pool = level === "basic" ? BASIC_SCORES : level === "advanced" ? ADVANCED_SCORES : DEFAULT_SCORES;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const selectFinish = (value: number, recoveryId: string | null = null) => {
    setActiveDrill(recoveryId);
    reset(value);
  };
  const moveFinish = (direction: -1 | 1) => {
    const referenceScore = shots[0]?.before ?? score;
    const nearest = DEFAULT_SCORES.reduce((best, candidate) =>
      Math.abs(candidate - referenceScore) < Math.abs(best - referenceScore) ? candidate : best, DEFAULT_SCORES[0]);
    const current = DEFAULT_SCORES.indexOf(nearest);
    const next = (current + direction + DEFAULT_SCORES.length) % DEFAULT_SCORES.length;
    selectFinish(DEFAULT_SCORES[next]);
  };

  const reset = (value: number) => {
    savePending();
    const v = Math.max(2, Math.min(170, Math.round(value) || 40));
    setScore(v);
    setVisitStart(v);
    setShots([]);
    setDartsUsed(0);
    setWon(false);
    setFinished(false);
    setStarted(true);
    setShowConfig(false);
    setShowCoachDetails(false);
  };

  const record = (dart: Dart) => {
    if (!started || finished) return;
    const after = score - dart.value;
    const finish = after === 0 && dart.finish;
    const bust = after < 2 && !finish;
    const nextDarts = dartsUsed + 1;
    const visitEnd = visitThrows + 1 === 3;
    const shot: Shot = { dart, before: score, after: bust ? visitStart : after, bust, finish, ...(trackAim ? { aimedDouble } : {}) };
    setShots((prev) => [...prev, shot]);
    setDartsUsed(nextDarts);
    setScore(bust ? visitStart : after);
    if (finish) {
      pendingResult.current = { score: shots[0]?.before ?? visitStart, won: true, darts: nextDarts, shots: [...shots, shot] };
      setWon(true);
      setFinished(true);
      setAttempts((n) => n + 1);
      setSuccesses((n) => n + 1);
      setHistory((old) => [{ score: shots[0]?.before ?? visitStart, won: true, darts: nextDarts }, ...old].slice(0, 15));
      return;
    }
    if (challenge && (bust || visitEnd)) {
      pendingResult.current = { score: shots[0]?.before ?? visitStart, won: false, darts: nextDarts, shots: [...shots, shot] };
      setFinished(true);
      setAttempts((n) => n + 1);
      setHistory((old) => [{ score: shots[0]?.before ?? visitStart, won: false, darts: nextDarts }, ...old].slice(0, 15));
      return;
    }
    if (bust || visitEnd) setVisitStart(bust ? visitStart : after);
  };

  const undo = () => {
    if (!shots.length) return;
    const previous = shots.slice(0, -1);
    const start = shots[0].before;
    let rest = start;
    let vs = start;
    let count = 0;
    previous.forEach((shot) => {
      count += 1;
      const diff = rest - shot.dart.value;
      const bust = diff < 2 && !(diff === 0 && shot.dart.finish);
      rest = bust ? vs : diff;
      if (bust || count === 3) {
        vs = rest;
        count = 0;
      }
    });
    setShots(previous);
    setScore(rest);
    setVisitStart(vs);
    setDartsUsed(previous.length);
    if (finished) {
      pendingResult.current = null;
      setFinished(false);
      setWon(false);
      setAttempts((n) => Math.max(0, n - 1));
      if (won) setSuccesses((n) => Math.max(0, n - 1));
      setHistory((old) => old.slice(1));
    }
  };

  const btn: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#1b2534",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  };
  const card: React.CSSProperties = {
    background: "rgba(15,22,34,.96)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 18,
    padding: 14,
  };

  const presetScores = level === "basic" ? BASIC_SCORES : level === "advanced" ? ADVANCED_SCORES : RANDOM_VISIBLE_SCORES;
  const rate = attempts > 0 ? Math.round((100 * successes) / attempts) : 0;
  const bestFinish = history.filter((h) => h.won).reduce((best, h) => Math.max(best, h.score), 0);
  const fastestFinish = history.filter((h) => h.won).reduce((best, h) => Math.min(best, h.darts), Infinity);
  const previousFinishes = history.slice(0, 6);
  const currentInputScore = started ? shots[0]?.before ?? score : score;
  const routeTitle = activeRoutes.length
    ? en
      ? "Checkout routes"
      : "Combinaisons"
    : en
      ? "Placement"
      : "Placement";

  return (
    <div className={`mss-finish-do ${started && !showConfig ? "is-playing" : "is-configuring"} ${showCoachDetails ? "is-coach-open" : ""}`}>
      <header className="mss-finish-header" style={card}>
        <div className="mss-finish-header-main">
          <div>
            <div className="mss-finish-kicker">{challenge ? (en ? "1 visit challenge" : "défi 1 volée") : en ? "double out training" : "entraînement double out"}</div>
            <h2>{challenge ? (en ? "FINISH DO CHALLENGE" : "CHALLENGE FINISH DO") : en ? "FINISH DOUBLE OUT" : "FINISHS DOUBLE OUT"}</h2>
            <p>{en ? "Learn finishes, react to misses and keep a clean route to your double." : "Apprends les checkouts, réagis aux ratés et garde une route claire vers ton double."}</p>
          </div>
          <button style={btn} onClick={() => { savePending(); onExit(); }}>
            ← {en ? "Back" : "Retour"}
          </button>
        </div>
        <div className="mss-finish-topchips">
          <span className="mss-finish-chip">{challenge ? (en ? "3 darts max" : "3 fléchettes max") : en ? "Unlimited visits" : "Volées illimitées"}</span>
          <span className="mss-finish-chip">{en ? "Bull50 finishes" : "BULL50 valide"}</span>
          <span className="mss-finish-chip">{en ? "Bust resets visit" : "BUST restaure la volée"}</span>
        </div>
      </header>

      <div className="mss-finish-grid">
        <section className="mss-finish-panel mss-finish-panel--selection" style={card}>
          <div className="mss-finish-panel-title-row mss-finish-selection-heading">
            <h3>{en ? "Selection" : "Sélection"}</h3>
            <button style={btn} onClick={() => selectFinish(nextScore())}>{en ? "Random" : "Aléatoire"}</button>
          </div>
          <div className="mss-finish-playing-actions">
            <button type="button" style={btn} onClick={() => setShowConfig((v) => !v)} aria-expanded={showConfig}>
              {en ? "Change checkout" : "Changer de finish"}
            </button>
            <button type="button" style={btn} onClick={() => setShowCoachDetails((v) => !v)} aria-expanded={showCoachDetails}>
              {showCoachDetails ? (en ? "Hide coach" : "Masquer Awena") : (en ? "Coach details" : "Conseils Awena")}
            </button>
          </div>
          <div className="mss-finish-config-controls">

          <div className="mss-finish-block">
            <div className="mss-finish-label">{en ? "Range" : "Niveau"}</div>
            <div className="mss-finish-inline-buttons">
              {(["basic", "advanced", "random"] as const).map((l) => (
                <button key={l} style={{ ...btn, background: level === l ? "#0d6076" : "#1b2534" }} onClick={() => setLevel(l)}>
                  {en ? labelMap[l].en : labelMap[l].fr}
                </button>
              ))}
            </div>
          </div>

          <div className="mss-finish-block">
            <div className="mss-finish-label">{en ? "Quick starts" : "Démarrages rapides"}</div>
            <div className="mss-finish-score-preset-grid">
              {presetScores.map((n) => (
                <button key={n} style={{ ...btn, background: score === n ? "#0d6076" : "#1b2534" }} onClick={() => selectFinish(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="mss-finish-custom-row">
            <label className="mss-finish-input-wrap">
              <span>{en ? "Custom score" : "Score libre"}</span>
              <input
                aria-label="Score départ"
                type="number"
                min="2"
                max="170"
                value={currentInputScore}
                onChange={(e) => {
                  if (!started || !shots.length) {
                    const n = Number(e.target.value);
                    setScore(n);
                    setVisitStart(n);
                    setStarted(false);
                  }
                }}
              />
            </label>
            <button style={btn} onClick={() => selectFinish(score)}>{started ? (en ? "Restart" : "Recommencer") : (en ? "Start" : "Démarrer")}</button>
          </div>

          <details className="mss-finish-details">
            <summary>{en ? "Recovery drills" : "Défis plans B"}</summary>
            <div className="mss-finish-drills-grid">
              {RECOVERY_DRILLS.map((d) => (
                <button
                  key={d.id}
                  style={{ ...btn, background: activeDrill === d.id ? "#0d6076" : "#1b2534", textAlign: "left" }}
                  onClick={() => {
                    selectFinish(d.start, d.id);
                  }}
                >
                  <strong>{d.start}</strong>
                  <span>{d.aim} → {d.actual}</span>
                </button>
              ))}
            </div>
          </details>

          </div>
          <div className="mss-finish-exercise-nav" aria-label={en ? "Checkout navigation" : "Navigation des finishes"}>
            <button type="button" style={btn} onClick={() => moveFinish(-1)} aria-label={en ? "Previous checkout" : "Finish précédent"}>‹</button>
            <div className="mss-finish-exercise-nav-status">
              <span>{en ? "CURRENT EXERCISE" : "EXERCICE EN COURS"}</span>
              <strong>{shots[0]?.before ?? score} <small>DO</small></strong>
            </div>
            <button type="button" style={btn} onClick={() => moveFinish(1)} aria-label={en ? "Next checkout" : "Finish suivant"}>›</button>
          </div>
          <div className="mss-finish-scoreboard" aria-live="polite">
            <div className="mss-finish-score-label">{en ? "REMAINING" : "RESTE"}</div>
            <strong className="mss-finish-score-number" style={{ color: won ? "#74f0ad" : "#35d9fb" }}>{score}</strong>
            <div className="mss-finish-darts">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={i < remainingDarts && !finished ? "available" : "spent"}>🎯</span>
              ))}
            </div>
            <div className="mss-finish-score-status">
              {won
                ? en ? "Checkout completed" : "Checkout réussi"
                : isBust
                  ? en ? "BUST • visit restored" : "BUST • volée restaurée"
                  : `${remainingDarts} ${en ? "dart(s) left" : "fléchette(s) restante(s)"}`}
            </div>
            <div className="mss-finish-mini-stats">
              <span>{en ? "Session" : "Session"} <b>{successes}/{attempts}</b></span>
              <span>{en ? "Rate" : "Taux"} <b>{rate}%</b></span>
            </div>
            {finished && (
              <div className="mss-finish-result-banner">
                <span>{won ? (en ? "FINISH VALIDATED" : "FINISH VALIDÉ") : (en ? "Challenge missed" : "Défi non réussi")}</span>
                <button style={btn} onClick={() => selectFinish(nextScore())}>{en ? "Next" : "Suivant"}</button>
              </div>
            )}
          </div>
          <div className="mss-finish-live-route" aria-live="polite">
            <div className="mss-finish-live-route-label">{activeRoutes.length ? (en ? "RECOMMENDED" : "FINISH CONSEILLÉ") : (en ? "NEXT VISIT" : "PROCHAINE VOLÉE")}</div>
            {showRoutes ? (
              activeRoutes.length ? (
                <div className="mss-finish-live-route-hits">{activeRoutes[0].map((d, i) => <React.Fragment key={`${d.label}-${i}`}>{i > 0 && <span className="mss-finish-arrow">→</span>}<strong className={d.finish ? "finish" : ""}>{d.label}</strong></React.Fragment>)}</div>
              ) : setup ? (
                <div className="mss-finish-live-route-hits">{setup.route.map((d, i) => <React.Fragment key={`${d.label}-${i}`}>{i > 0 && <span className="mss-finish-arrow">→</span>}<strong>{d.label}</strong></React.Fragment>)}<span className="mss-finish-arrow">→</span><strong className="finish">{setup.leave}</strong></div>
              ) : <span>{en ? "Play for a safe double" : "Prépare un double"}</span>
            ) : <span>{en ? "Blind training" : "Entraînement à l’aveugle"}</span>}
          </div>
          {tacticalFeedback && <div className="mss-finish-tactical-feedback" role="status" aria-live="polite">
            <strong>{en ? "AWENA • REACTION" : "AWENA • RÉACTION"}</strong>
            <span>{tacticalFeedback}</span>
          </div>}
        </section>

        <section className="mss-finish-panel mss-finish-panel--input" style={card}>
          <div className="mss-finish-panel-title-row">
            <h3>{en ? "Actual hit" : "Touche réelle"}</h3>
            <button style={btn} disabled={!shots.length} onClick={undo}>↶ {en ? "Undo" : "Annuler"}</button>
          </div>

          <div className="mss-finish-aim-panel">
            <label className="mss-finish-aim-toggle">
              <input type="checkbox" checked={trackAim} onChange={(e) => setTrackAim(e.target.checked)} />
              <span>{en ? "Track intended double" : "Suivre le double visé"}</span>
            </label>
            {trackAim && <div className="mss-finish-aim-selection">
              <label htmlFor="mss-finish-aim-target">{en ? "Target before dart" : "Cible avant le lancer"}</label>
              <select id="mss-finish-aim-target" value={aimedDouble} onChange={(e) => setAimedDouble(e.target.value)}>
                {AIMABLE_DOUBLES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <span>{en ? "Enter the actual hit below" : "Saisis la touche réelle ci-dessous"}</span>
            </div>}
            {aimLastShot && <div className={`mss-finish-aim-feedback ${aimHit ? "hit" : "miss"}`} aria-live="polite">
              <strong>{en ? "Aimed" : "Visé"} {aimLastShot.aimedDouble} → {en ? "hit" : "touché"} {aimLastShot.dart.label}</strong>
              <span>{aimHit
                ? en ? "Target hit. Well done!" : "Cible atteinte !"
                : en ? "Target missed: Awena recalculates from the actual hit." : "Cible manquée : Awena recalcule depuis la touche réelle."}</span>
            </div>}
          </div>

          <div className="mss-finish-multipliers">
            {(["S", "D", "T"] as const).map((k) => (
              <button key={k} style={{ ...btn, flex: 1, background: type === k ? ({ S: "#586271", D: "#0b81b0", T: "#a23aba" }[k]) : "#1b2534" }} onClick={() => setType(k)}>
                {k}
              </button>
            ))}
          </div>

          <div className="mss-finish-numbers">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                disabled={!started || finished}
                style={{
                  ...btn,
                  padding: "10px 2px",
                  opacity: finished ? 0.55 : 1,
                  background: type === "S" ? "#5a6471" : type === "D" ? "#0b81b0" : "#a23aba",
                }}
                onClick={() => record(DARTS.find((d) => d.label === `${type}${n}`)!)}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mss-finish-specials">
            {["BULL25", "BULL50", "MISS"].map((name) => (
              <button
                key={name}
                disabled={!started || finished}
                style={{
                  ...btn,
                  flex: 1,
                  background: name === "BULL25" ? "#178a43" : name === "BULL50" ? "#bf3138" : "#c58a39",
                  color: name === "MISS" ? "#362009" : "white",
                }}
                onClick={() => record(DARTS.find((d) => d.label === name)!)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="mss-finish-visit-log">
            {shots.length ? shots.slice(-6).map((s, i) => (
              <span key={`${shots.length - 6 + i}-${s.dart.label}`} className={`mss-finish-log-pill ${s.bust ? "bust" : s.finish ? "finish" : ""}`}>
                {s.dart.label}{s.bust ? " • BUST" : ""}
              </span>
            )) : <span className="mss-finish-placeholder">{en ? "No dart recorded yet." : "Aucune fléchette saisie pour le moment."}</span>}
          </div>
        </section>

        <section className="mss-finish-panel mss-finish-panel--coach" style={card}>
          <div className="mss-finish-awena-head">
            <img src="/awena/awena-bot-medallion.webp" alt="Awena" loading="lazy" />
            <div>
              <h3>AWENA • {en ? "Finish coach" : "Coach finish DO"}</h3>
              <small>{en ? "Your real hit always decides the next route." : "Ta touche réelle décide toujours du prochain chemin."}</small>
            </div>
          </div>

          <div className="mss-finish-coach-topbar">
            <strong>{routeTitle}</strong>
            <label className="mss-finish-toggle">
              <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
              <span>{en ? "Show help" : "Afficher l'aide"}</span>
            </label>
          </div>

          {drill && (
            <div className="mss-finish-drill-card">
              <div className="mss-finish-drill-line"><b>{en ? "Scenario" : "Situation"}</b><span>{drill.start} • {drill.aim} → {drill.actual}</span></div>
              <div className="mss-finish-drill-line"><b>{en ? "Recovery" : "Plan B"}</b><span>{drill.remaining} → {drill.route}</span></div>
              <p>{en ? drill.noteEn : drill.noteFr}</p>
            </div>
          )}

          {showRoutes ? (
            <>
              {activeRoutes.length ? (
                <div className="mss-finish-routes-stack">
                  {activeRoutes.map((r, i) => (
                    <div key={i} className="mss-finish-route">
                      <b className="mss-finish-route-label">{i === 0 ? "PLAN A" : `PLAN ${i + 1}`}</b>
                      <div className="mss-finish-route-darts">
                        {r.map((d, j) => (
                          <React.Fragment key={`${j}-${d.label}`}>
                            <span className={`mss-finish-dart-pill ${d.finish ? "final" : ""}`}>{d.label}</span>
                            {j < r.length - 1 && <span className="mss-finish-arrow">→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mss-finish-empty-state">
                  {score > 170
                    ? en ? "No checkout over 170 in three darts." : "Pas de checkout au-dessus de 170 en trois fléchettes."
                    : score === 1
                      ? en ? "1 remaining is impossible in double out." : "1 restant est impossible en double out."
                      : en ? "No checkout now. Set up your next visit." : "Pas de finish immédiat. Prépare la prochaine volée."}
                </div>
              )}

              {!activeRoutes.length && setup && !finished && (
                <div className="mss-finish-setup">
                  <strong>{en ? "NEXT VISIT SETUP" : "PLACEMENT • PROCHAINE VOLÉE"}</strong>
                  <div className="mss-finish-route-darts">
                    {setup.route.map((d, i) => (
                      <React.Fragment key={`${i}-${d.label}`}>
                        <span className="mss-finish-dart-pill">{d.label}</span>
                        <span className="mss-finish-arrow">→</span>
                      </React.Fragment>
                    ))}
                    <span className="mss-finish-dart-pill final">{setup.leave}</span>
                  </div>
                  <small>{en ? "Aim to leave a comfortable double. Recalculate after every real hit." : "Laisse-toi un double confortable. Recalcule après chaque touche réelle."}</small>
                </div>
              )}

              {tip && <p className="mss-finish-pro-tip">💡 {en ? tip.en : tip.fr}</p>}
              {lastShot && !finished && (
                <p className="mss-finish-live-note">
                  {en ? "Last dart" : "Dernière fléchette"} : <b>{lastShot.dart.label}</b> • {en ? "remaining" : "reste"} <b>{score}</b>
                </p>
              )}
            </>
          ) : (
            <div className="mss-finish-empty-state">{en ? "Blind mode: work out the route yourself first." : "Mode aveugle : trouve d'abord la route toi-même."}</div>
          )}

          <div className="mss-finish-session-tools">
            <button type="button" style={btn} onClick={() => setShowSessionDetails((v) => !v)} aria-expanded={showSessionDetails}>
              {en ? "Session details" : "Bilan de séance"} <span aria-hidden="true">{showSessionDetails ? "▴" : "▾"}</span>
            </button>
            {showSessionDetails && (
              <div className="mss-finish-session-details">
                <div className="mss-finish-session-kpis">
                  <span><small>{en ? "Success rate" : "Réussite"}</small><strong>{rate}%</strong></span>
                  <span><small>{en ? "Best checkout" : "Meilleur finish"}</small><strong>{bestFinish || "—"}</strong></span>
                  <span><small>{en ? "Fewest darts" : "Minimum fléchettes"}</small><strong>{Number.isFinite(fastestFinish) ? fastestFinish : "—"}</strong></span>
                </div>
                <div className="mss-finish-career" aria-label={en ? "Double-out precision over sessions" : "Précision DO entre les séances"}>
                  <div className="mss-finish-career-title"><strong>{en ? "OVER MULTIPLE SESSIONS" : "PROGRESSION ENTRE LES SÉANCES"}</strong><small>{career.sessions} {en ? "saved attempts" : "tentatives enregistrées"} · {career.darts} {en ? "darts" : "fléchettes"}</small></div>
                  {Object.values(career.aims).length ? Object.values(career.aims).sort((a,b) => a.hits/a.attempts - b.hits/b.attempts).slice(0,5).map(item => <div className="mss-finish-career-item" key={item.label}>
                    <b>{item.label}</b><span>{item.hits}/{item.attempts} · {Math.round(item.hits * 100 / item.attempts)}%</span>
                  </div>) : <small>{en ? "Validate an attempt with announced doubles to start tracking." : "Valide une tentative avec des doubles annoncés pour commencer le suivi."}</small>}
                  {careerPriority && <button type="button" style={btn} onClick={() => { setAimedDouble(careerPriority.label); setTrackAim(true); selectFinish(doubleValue(careerPriority.label)); setShowSessionDetails(false); }}>{en ? "Practice priority" : "Travailler en priorité"} {careerPriority.label}</button>}
                </div>
                <div className="mss-finish-aim-progress">
                  <strong>{en ? "Intended double accuracy" : "Précision par double visé"}</strong>
                  <small>{en ? "Only targets explicitly selected before the dart are measured." : "Seules les cibles annoncées avant le lancer sont mesurées."}</small>
                  {aimStats.length ? aimStats.map((item) => (
                    <div className="mss-finish-aim-stat" key={item.label}>
                      <div><b>{item.label}</b><span>{item.hits}/{item.attempts} · {item.rate}%</span></div>
                      <div className="mss-finish-aim-track"><span style={{ width: `${item.rate}%` }} /></div>
                      <div className="mss-finish-aim-stat-footer">
                        <small>{item.singleHits ? (en ? `${item.singleHits} single/bull outer hits` : `${item.singleHits} simple(s)/bull extérieur`) : (en ? `${item.misses} other misses` : `${item.misses} autre(s) échec(s)`)}</small>
                        <button type="button" style={btn} onClick={() => {
                          setAimedDouble(item.label);
                          setTrackAim(true);
                          selectFinish(doubleValue(item.label));
                          setShowSessionDetails(false);
                        }}>{en ? "Practice" : "Travailler"} {item.label}</button>
                      </div>
                    </div>
                  )) : <em>{en ? "Enable target tracking, pick a double and record a dart." : "Active le suivi de visée, choisis un double et saisis une fléchette."}</em>}
                </div>
                {revision && (
                  <section className="mss-finish-revision" aria-label={en ? "Personal checkout revision" : "Révision checkout personnalisée"}>
                    <div className="mss-finish-revision-head">
                      <div><strong>AWENA • {en ? "Targeted revision" : "Révision ciblée"}</strong>
                        <small>{en ? "Based on explicitly recorded misses" : "D'après tes cibles annoncées et manquées"}</small></div>
                      <button type="button" style={btn} onClick={() => { setShowRevision(v => !v); setRevisionChoice(null); }}>
                        {showRevision ? (en ? "Hide" : "Masquer") : (en ? "Review" : "Réviser")}
                      </button>
                    </div>
                    <div className="mss-finish-revision-focus">
                      <b>{revision.label}</b> <span>{revisionAim!.hits}/{revisionAim!.attempts} · {revisionAim!.rate}%</span>
                      <button type="button" style={btn} onClick={() => {
                        setAimedDouble(revision.label);
                        setTrackAim(true);
                        selectFinish(doubleValue(revision.label));
                        setShowSessionDetails(false);
                      }}>{en ? "Practice this double" : "Travailler ce double"}</button>
                    </div>
                    {showRevision && (
                      <div className="mss-finish-revision-quiz">
                        <p>{en
                          ? `You aim at ${revision.label} but hit ${revision.hit}. ${revision.remain} remain: what is a valid DO recovery?`
                          : `Tu vises ${revision.label}, mais touches ${revision.hit}. Il reste ${revision.remain} : quel plan B est valide en DO ?`}</p>
                        <div className="mss-finish-revision-options">
                          {revision.options.map(option => (
                            <button type="button" key={option} style={btn} aria-pressed={revisionChoice === option} onClick={() => setRevisionChoice(option)}>{option}</button>
                          ))}
                        </div>
                        {revisionChoice && <p aria-live="polite" className={revisionChoice === revision.answer ? "correct" : "incorrect"}>
                          {revisionChoice === revision.answer
                            ? (en ? "Correct! Recalculate after the actual hit." : "Bien joué ! Recalcule toujours après la touche réelle.")
                            : (en ? `Not quite: ${revision.answer} is a valid route.` : `Pas tout à fait : ${revision.answer} est une route valide.`)}
                        </p>}
                      </div>
                    )}
                  </section>
                )}
                <div className="mss-finish-double-progress">
                  <strong>{en ? "Doubles recorded" : "Doubles saisis"}</strong>
                  <small>{en ? "Only actual D / Bull50 inputs are counted, not aimed-but-missed doubles." : "Seuls les D / BULL50 réellement saisis sont comptés, pas les doubles visés et manqués."}</small>
                  <div className="mss-finish-double-list">
                    {doubleStats.length ? doubleStats.slice(0, 6).map((item) => (
                      <span key={item.label}><b>{item.label}</b><small>{item.checkouts}/{item.attempts} {en ? "finishes / entries" : "sorties / saisies"}</small></span>
                    )) : <em>{en ? "No double recorded yet" : "Aucun double saisi pour le moment"}</em>}
                  </div>
                </div>
                <div className="mss-finish-session-recent">
                  <small>{en ? "Latest attempts" : "Dernières tentatives"}</small>
                  <div>{previousFinishes.length ? previousFinishes.map((h, i) => (
                    <span key={i} className={h.won ? "success" : "failure"}>{h.score} {h.won ? `✓ ${h.darts}` : "✗"}</span>
                  )) : <em>{en ? "No completed attempt yet" : "Aucune tentative terminée"}</em>}</div>
                </div>
              </div>
            )}
          </div>

          <details className="mss-finish-details mss-finish-details--coach">
            <summary>{en ? "Quick rules & pro reminders" : "Rappels rapides & astuces pro"}</summary>
            <ul className="mss-finish-rule-list">
              <li>{en ? "Bull50 counts as a valid finishing double." : "BULL50 compte comme un double final valide."}</li>
              <li>{en ? "Never leave 1 in double out." : "Ne laisse jamais 1 en double out."}</li>
              <li>{en ? "32 → 16 → 8 → 4 → 2 is the classic recovery ladder." : "32 → 16 → 8 → 4 → 2 est l'échelle de secours classique."}</li>
              <li>{en ? "If a checkout is impossible, leave 40, 32 or 24 when possible." : "Si le finish est impossible, vise plutôt 40, 32 ou 24 quand c'est possible."}</li>
            </ul>
          </details>
        </section>
      </div>

      <footer className="mss-finish-footer-strip" style={card}>
        <div><strong>{en ? "Session" : "Bilan"}</strong> • {successes}/{attempts} {en ? "completed" : "réussis"}{attempts > 0 ? ` (${rate}%)` : ""}</div>
        <div className="mss-finish-footer-history">
          {history.length > 0
            ? history.slice(0, 6).map((h, i) => (
              <span key={i}>{h.score} {h.won ? `✓ ${h.darts}` : "✗"}</span>
            ))
            : <span>{challenge ? (en ? "Three darts maximum per finish." : "Trois fléchettes maximum par finish.") : (en ? "Unlimited visits, recalculated after each dart." : "Volées illimitées, recalcul après chaque fléchette.")}</span>}
        </div>
      </footer>
    </div>
  );
}
