import React from "react";
import { awenaVoice } from "../../awena/AwenaVoice";
import { BottomNavIcon } from "../../components/BottomNav";
import { loadAwenaSettings } from "../../awena/AwenaSettings";
import TrainingDartPad from "../ui/TrainingDartPad";
import type { TrainingDart } from "../lib/trainingDarts";
import type { AcademyLesson } from "./academyLessons";
import { MSS_ACADEMY_CATALOGUE } from "./academyCatalogue";
import { getAcademyQuestions } from "./academyQuizBank";
import { makeAcademyQuizRound, quizCorrectCount, type AcademyQuizItem } from "./academyQuizMode";
import { getAcademyReviewInsights, loadAcademyReviews, makeAcademyReviewRound, saveAcademyAnswer, type AcademyAnswerOrigin, type AcademyReviewJournal } from "./academyRevision";
import { academyResultScore, applyAcademyVisit, newAcademyRun, type AcademyRun } from "./academyCore";
import {
  loadAcademyProgress, saveAcademyAttempt, type AcademyProgress,
  loadAcademyQuizStats, saveAcademyQuizRound, type AcademyQuizStats,
} from "./academyStore";
import "./trainingAwenaAcademy.css";
import { loadFinishDoProgress, getFinishDoPriority, finishDoLessonForAim } from "../modes/finish/finishDoProgress";
import FinishDoWeeklyPanel from "../modes/finish/FinishDoWeeklyPanel";

type AcademyScreen = "learn" | "practice" | "quiz" | "review" | "progress";
type LessonPhase = "intro" | "quiz" | "practice" | "result";
const LETTERS = ["A", "B", "C"];
const LESSONS_PER_PAGE = 6;
const PROGRESS_PER_PAGE = 8;
const LEVELS = ["", "DÉCOUVERTE", "FONDATIONS", "MAÎTRISE", "EXPERT"];
const FAMILIES: Record<AcademyLesson["family"], string> = {
  scoring: "Calcul mental", doubles: "Doubles", checkout: "Finishs", precision: "Précision",
};
const VOICE_PLACEHOLDER = "Awena utilise la voix MSS configurée. Le texte reste accessible si la synthèse vocale n'est pas disponible.";
const CATALOGUE = [...MSS_ACADEMY_CATALOGUE].sort((a, b) => a.level - b.level);
const SCREEN_TABS: { id: AcademyScreen; label: string; icon: React.ComponentProps<typeof BottomNavIcon>["name"] }[] = [
  { id: "learn", label: "APPRENDRE", icon: "home" },
  { id: "practice", label: "S’EXERCER", icon: "games" },
  { id: "quiz", label: "QUIZZ EXPRESS", icon: "messages" },
  { id: "review", label: "MES RÉVISIONS", icon: "agenda" },
  { id: "progress", label: "MES PROGRÈS", icon: "stats" },
];
const FAMILY_ICONS: Record<AcademyLesson["family"], React.ComponentProps<typeof BottomNavIcon>["name"]> = {
  scoring: "stats", doubles: "tournaments", checkout: "games", precision: "profiles",
};

export default function TrainingAwenaAcademy({ participantId }: { participantId?: string | null }) {
  const [screen, setScreen] = React.useState<AcademyScreen>("learn");
  const [lesson, setLesson] = React.useState<AcademyLesson | null>(null);
  const [phase, setPhase] = React.useState<LessonPhase>("intro");
  const [quizIndex, setQuizIndex] = React.useState(0);
  const [quizAnswers, setQuizAnswers] = React.useState<number[]>([]);
  const [choice, setChoice] = React.useState<number | null>(null);
  const [checked, setChecked] = React.useState(false);
  const [voiceEnabled, setVoiceEnabled] = React.useState(true);
  const [voiceNotice, setVoiceNotice] = React.useState("");
  const [progress, setProgress] = React.useState<AcademyProgress>(() => loadAcademyProgress(participantId));
  const [quizStats, setQuizStats] = React.useState<AcademyQuizStats>(() => loadAcademyQuizStats(participantId));
  const [reviewJournal, setReviewJournal] = React.useState<AcademyReviewJournal>(() => loadAcademyReviews(participantId));
  const [roundMode, setRoundMode] = React.useState<"express" | "review">("express");
  const [run, setRun] = React.useState<AcademyRun>(() => newAcademyRun(CATALOGUE[0]!.practice));
  const [savedScore, setSavedScore] = React.useState<number | null>(null);
  const [levelFilter, setLevelFilter] = React.useState("all");
  const [familyFilter, setFamilyFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [lessonPage, setLessonPage] = React.useState(0);
  const [progressPage, setProgressPage] = React.useState(0);
  const [finishOnly, setFinishOnly] = React.useState(false);
  const [finishProgress, setFinishProgress] = React.useState(() => loadFinishDoProgress(participantId));
  const [round, setRound] = React.useState<AcademyQuizItem[]>([]);
  const [roundIndex, setRoundIndex] = React.useState(0);
  const [roundAnswers, setRoundAnswers] = React.useState<number[]>([]);
  const [roundChoice, setRoundChoice] = React.useState<number | null>(null);
  const [roundChecked, setRoundChecked] = React.useState(false);
  const [roundFinished, setRoundFinished] = React.useState(false);
  const runRef = React.useRef(run);
  const voiceSeq = React.useRef(0);

  React.useEffect(() => {
    setProgress(loadAcademyProgress(participantId));
    setFinishProgress(loadFinishDoProgress(participantId));
    setQuizStats(loadAcademyQuizStats(participantId));
    setReviewJournal(loadAcademyReviews(participantId));
    setLesson(null);
    setPhase("intro");
    setRound([]);
    setRoundFinished(false);
  }, [participantId]);
  React.useEffect(() => () => { voiceSeq.current += 1; void awenaVoice.stop(); }, []);

  const speak = React.useCallback((text: string) => {
    if (!voiceEnabled || !text) return;
    const settings = loadAwenaSettings();
    if (!settings.enabled || !settings.voiceEnabled) {
      setVoiceNotice("La voix d'Awena est désactivée dans les réglages MSS.");
      return;
    }
    setVoiceNotice("");
    const seq = ++voiceSeq.current;
    // The lessons are authored in French until localization is delivered.
    void awenaVoice.speakNarration(text, settings, "fr").then(ok => {
      if (!ok && seq === voiceSeq.current) setVoiceNotice("Voix indisponible sur cet appareil. Le texte reste accessible.");
    });
  }, [voiceEnabled]);

  const reviewInsights = React.useMemo(() => getAcademyReviewInsights(CATALOGUE, reviewJournal), [reviewJournal, screen]);
  const recommended = React.useMemo(() =>
    CATALOGUE.find(item => item.id === reviewInsights.focusLessonId) ||
    CATALOGUE.find(item => !progress[item.id] || progress[item.id].best < 80) || CATALOGUE[0]!,
    [progress, reviewInsights.focusLessonId]);
  React.useEffect(() => {
    const refresh = () => setFinishProgress(loadFinishDoProgress(participantId));
    window.addEventListener("mss-finish-do-progress", refresh);
    return () => window.removeEventListener("mss-finish-do-progress", refresh);
  }, [participantId]);
  const finishPriority = getFinishDoPriority(finishProgress);
  const finishSuggestedLesson = finishPriority ? CATALOGUE.find(item => item.id === finishDoLessonForAim(finishPriority.label)) : null;
  const mastered = CATALOGUE.filter(item => (progress[item.id]?.best || 0) >= 80).length;
  const attempted = CATALOGUE.filter(item => (progress[item.id]?.attempts || 0) > 0).length;
  const attempts = CATALOGUE.reduce((total, item) => total + (progress[item.id]?.attempts || 0), 0);
  const questions = React.useMemo(() => lesson ? getAcademyQuestions(lesson) : [], [lesson]);
  const activeQuestion = questions[quizIndex];
  const quizEarned = quizCorrectCount(questions, quizAnswers);
  const filteredLessons = CATALOGUE.filter(item =>
    (levelFilter === "all" || item.level === Number(levelFilter)) &&
    (familyFilter === "all" || item.family === familyFilter) &&
    (!finishOnly || (item.family === "checkout" && item.id.startsWith("finish-do-"))) &&
    (!search.trim() || `${item.title} ${item.intro} ${item.mission}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr").trim())));
  const lessonPageCount = Math.max(1, Math.ceil(filteredLessons.length / LESSONS_PER_PAGE));
  const visibleLessons = filteredLessons.slice(lessonPage * LESSONS_PER_PAGE, (lessonPage + 1) * LESSONS_PER_PAGE);
  const progressPageCount = Math.max(1, Math.ceil(CATALOGUE.length / PROGRESS_PER_PAGE));
  const visibleProgress = CATALOGUE.slice(progressPage * PROGRESS_PER_PAGE, (progressPage + 1) * PROGRESS_PER_PAGE);
  const questionTotal = React.useMemo(() => CATALOGUE.reduce((total, item) => total + getAcademyQuestions(item).length, 0), []);


  const openFinishCourse = (practice = false) => {
    void awenaVoice.stop(); voiceSeq.current += 1;
    setLesson(null);
    setFamilyFilter("checkout");
    setLevelFilter("all");
    setSearch("");
    setFinishOnly(true);
    setLessonPage(0);
    setScreen(practice ? "practice" : "learn");
  };

  const noteAnswer = (questionId: string, isCorrect: boolean, origin: AcademyAnswerOrigin) => {
    setReviewJournal(saveAcademyAnswer(participantId, questionId, isCorrect, origin));
  };
  const beginLesson = (next: AcademyLesson, skipTheory = false) => {
    void awenaVoice.stop(); voiceSeq.current += 1;
    const fresh = newAcademyRun(next.practice);
    runRef.current = fresh;
    setRun(fresh); setLesson(next); setQuizIndex(0); setQuizAnswers([]);
    setChoice(null); setChecked(false); setSavedScore(null);
    setPhase(skipTheory ? "practice" : "intro");
    setScreen(skipTheory ? "practice" : "learn");
    speak(skipTheory ? `${next.title}. ${next.mission}` : `Bienvenue dans ${next.title}. ${next.intro}. ${next.insight}`);
  };
  const closeLesson = () => {
    void awenaVoice.stop(); voiceSeq.current += 1;
    setLesson(null); setSavedScore(null); setPhase("intro");
  };
  const submitLessonAnswer = () => {
    if (!activeQuestion || choice === null || checked) return;
    setQuizAnswers(prev => [...prev.slice(0, quizIndex), choice]);
    noteAnswer(`${lesson!.id}:${quizIndex}`, choice === activeQuestion.correct, "lesson");
    setChecked(true);
    speak(`${choice === activeQuestion.correct ? "Bonne réponse !" : "On corrige ensemble."} ${activeQuestion.explanation}`);
  };
  const nextLessonQuestion = () => {
    if (quizIndex >= questions.length - 1) { startPractice(); return; }
    const next = quizIndex + 1;
    setQuizIndex(next); setChoice(null); setChecked(false);
    speak(questions[next]!.question);
  };
  const startPractice = () => {
    if (!lesson) return;
    const fresh = newAcademyRun(lesson.practice);
    runRef.current = fresh;
    setRun(fresh); setSavedScore(null);
    setPhase("practice"); setScreen("practice");
    speak(`Passons à la cible. ${lesson.mission}`);
  };
  const onVisit = (visit: TrainingDart[]) => {
    if (!lesson || runRef.current.ended) return;
    const next = applyAcademyVisit(lesson.practice, runRef.current, visit);
    runRef.current = next; setRun(next);
    speak(next.lastMessage);
    if (next.ended) {
      const theoryRatio = questions.length ? quizEarned / questions.length : 0;
      const score = academyResultScore(theoryRatio, next, lesson.practice);
      setProgress(saveAcademyAttempt(participantId, lesson.id, {
        score, quizCorrect: questions.length > 0 && quizEarned === questions.length,
        quizCorrectCount: quizEarned, quizQuestionCount: quizAnswers.length,
        practiceWon: next.won, darts: next.darts, busts: next.busts,
      }));
      setSavedScore(score); setPhase("result");
    }
  };
  const switchScreen = (next: AcademyScreen) => {
    void awenaVoice.stop(); voiceSeq.current += 1;
    setScreen(next); setLesson(null); setPhase("intro");
    setRound([]); setRoundIndex(0); setRoundAnswers([]); setRoundChoice(null);
    setRoundChecked(false); setRoundFinished(false);
    setRoundMode(next === "review" ? "review" : "express");
  };
  const newQuizRound = () => {
    const items = makeAcademyQuizRound(CATALOGUE, 10, quizStats.rounds + 1);
    setRoundMode("express");
    setRound(items); setRoundIndex(0); setRoundAnswers([]);
    setRoundChoice(null); setRoundChecked(false); setRoundFinished(false);
    setScreen("quiz"); setLesson(null);
    if (items[0]) speak(`Quiz express MSS ! Dix questions pour entraîner tes réflexes. Première question. ${items[0].question}`);
  };
  const newReviewRound = () => {
    const items = makeAcademyReviewRound(CATALOGUE, reviewJournal, 10);
    setRoundMode("review"); setRound(items); setRoundIndex(0); setRoundAnswers([]);
    setRoundChoice(null); setRoundChecked(false); setRoundFinished(false);
    setScreen("review"); setLesson(null);
    if (items[0]) speak(`Révisions personnalisées. ${items.length} questions choisies à partir de tes erreurs. Première question : ${items[0].question}`);
  };
  const verifyRoundAnswer = () => {
    const item = round[roundIndex];
    if (!item || roundChoice === null || roundChecked) return;
    setRoundAnswers(prev => [...prev.slice(0, roundIndex), roundChoice]);
    noteAnswer(item.id, roundChoice === item.correct, roundMode === "review" ? "review" : "express");
    setRoundChecked(true);
    speak(`${roundChoice === item.correct ? "Bravo !" : "Voici l'explication."} ${item.explanation}`);
  };
  const nextRoundQuestion = () => {
    if (!roundChecked) return;
    if (roundIndex === round.length - 1) {
      const count = quizCorrectCount(round, roundAnswers);
      if (roundMode === "express") setQuizStats(saveAcademyQuizRound(participantId, count, round.length));
      setRoundFinished(true);
      speak(`${roundMode === "review" ? "Révision terminée" : "Quiz terminé"} ! Tu as ${count} bonnes réponses sur ${round.length}. ${roundMode === "review" ? "Les points à revoir ont été actualisés." : ""}`);
      return;
    }
    const next = roundIndex + 1;
    setRoundIndex(next); setRoundChoice(null); setRoundChecked(false);
    speak(round[next]!.question);
  };

  const renderList = (freePractice: boolean) => <>
    <div className="mssAcademyCourseSwitch" role="group" aria-label="Parcours pédagogique">
      <button type="button" className={!finishOnly ? "active" : ""} aria-pressed={!finishOnly} onClick={() => { setFinishOnly(false); setFamilyFilter("all"); setLessonPage(0); }}>TOUTES LES LEÇONS</button>
      <button type="button" className={finishOnly ? "active" : ""} aria-pressed={finishOnly} onClick={() => openFinishCourse(freePractice)}><BottomNavIcon name="games" size={17} /> FINISHS DO <span>{CATALOGUE.filter(item => item.family === "checkout" && item.id.startsWith("finish-do-")).length}</span></button>
    </div>
    <div className="mssAcademyFilters">
      <label>RECHERCHE <input type="search" placeholder="Rechercher une leçon" value={search} onChange={e => { setSearch(e.target.value); setLessonPage(0); }} /></label>
      <label>NIVEAU <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setLessonPage(0); }}>
        <option value="all">Tous les niveaux</option>{[1,2,3,4].map(level => <option key={level} value={level}>{LEVELS[level]}</option>)}
      </select></label>
      <label>THÈME <select value={familyFilter} onChange={e => { setFamilyFilter(e.target.value); setLessonPage(0); }}>
        <option value="all">Tous les thèmes</option>{Object.entries(FAMILIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <span className="mssAcademyCount" aria-live="polite">{filteredLessons.length} résultats</span>
    </div>
    <div className="mssAcademyLessonGrid">
      {visibleLessons.map(item => {
        const row = progress[item.id];
        const isSuggested = recommended.id === item.id;
        const index = CATALOGUE.indexOf(item);
        return <button type="button" key={item.id} className="mssAcademyLessonTile" onClick={() => beginLesson(item, freePractice)}>
          <span className="mssAcademyLessonRail">
            <span className="mssAcademyLessonNumber">{String(index + 1).padStart(2, "0")}</span>
            <span className="mssAcademyLessonIcon" aria-hidden="true"><BottomNavIcon name={FAMILY_ICONS[item.family]} size={16} /></span>
          </span>
          <span className="mssAcademyLessonInfo">
            <small>{LEVELS[item.level]} · {FAMILIES[item.family]} · {item.minutes} MIN · {getAcademyQuestions(item).length} QUESTIONS</small>
            <strong>{item.title}</strong>
            <span>{freePractice ? item.mission : item.intro}</span>
            <span className="mssAcademyLessonMeta">
              {isSuggested && <em>CONSEILLÉE</em>}
              <i>{row ? `${row.best}/100 · ${row.attempts} essai${row.attempts > 1 ? "s" : ""}` : "À découvrir"}</i>
            </span>
          </span>
          <span className="mssAcademyLessonArrow" aria-hidden="true">›</span>
        </button>;
      })}
    </div>
    {!filteredLessons.length && <p className="mssAcademyEmpty">Aucune leçon ne correspond aux filtres. Modifie la recherche ou le niveau.</p>}
    {filteredLessons.length > LESSONS_PER_PAGE && <nav className="mssAcademyPager" aria-label="Pages du catalogue">
      <button type="button" onClick={() => setLessonPage(page => Math.max(0, page - 1))} disabled={lessonPage === 0} aria-label="Page précédente du catalogue">‹</button>
      <span>Page {lessonPage + 1} / {lessonPageCount}</span>
      <button type="button" onClick={() => setLessonPage(page => Math.min(lessonPageCount - 1, page + 1))} disabled={lessonPage >= lessonPageCount - 1} aria-label="Page suivante du catalogue">›</button>
    </nav>}
  </>;

  const currentRoundQuestion = round[roundIndex];
  return <section className="mssAwenaAcademy" aria-label="Académie Awena, leçons et quiz de fléchettes MSS">
    <div className="mssAcademyHero">
      <img src="/awena/awena-bot-medallion.webp" alt="Awena, coach MSS" loading="lazy" />
      <div className="mssAcademyHeroText">
        <small>MULTISPORTS SCORING · CENTRE D’ENTRAÎNEMENT</small>
        <h2>ACADÉMIE AWENA</h2>
        <p>Mini-leçons, quiz et entraînements réels accompagnés par Awena.</p>
      </div>
      <button type="button" className="mssAcademyVoice" aria-pressed={voiceEnabled} title={voiceEnabled ? "Couper la narration" : "Activer la narration"} aria-label={voiceEnabled ? "Couper la narration" : "Activer la narration"}
        onClick={() => { if (voiceEnabled) { void awenaVoice.stop(); voiceSeq.current++; } setVoiceEnabled(v => !v); }}>
        <span aria-hidden="true"><BottomNavIcon name="live" size={18} /></span><span>{voiceEnabled ? "VOIX ON" : "VOIX OFF"}</span>
      </button>
    </div>
    <div className="mssAcademyHeroStats" aria-label="Résumé de l’Académie Awena">
      <div className="mssAcademyHeroStat"><span><BottomNavIcon name="home" size={16} /></span><div><small>LEÇONS</small><strong>{CATALOGUE.length}</strong></div></div>
      <div className="mssAcademyHeroStat"><span><BottomNavIcon name="messages" size={16} /></span><div><small>QUESTIONS</small><strong>{questionTotal}</strong></div></div>
      <div className="mssAcademyHeroStat"><span><BottomNavIcon name="agenda" size={16} /></span><div><small>À REVOIR</small><strong>{reviewInsights.due}</strong></div></div>
      <div className="mssAcademyHeroStat"><span><BottomNavIcon name="stats" size={16} /></span><div><small>MAÎTRISÉES</small><strong>{mastered}</strong></div></div>
    </div>
    {voiceNotice && <div className="mssAcademyVoiceNotice" role="status">{voiceNotice}</div>}
    <div className="mssAcademyTabs" role="group" aria-label="Parcours Académie Awena">
      {SCREEN_TABS.map(({ id, label, icon }) =>
        <button key={id} type="button" aria-label={label} title={label} aria-pressed={screen === id} className={screen === id ? "active" : ""} onClick={() => switchScreen(id)}>
          <span className="mssAcademyTabIcon" aria-hidden="true"><BottomNavIcon name={icon} size={20} /></span>
          <span className="mssAcademyTabLabel" aria-hidden={screen !== id}>{label}</span>
        </button>)}
    </div>

    {!lesson && (screen === "learn" || screen === "practice") && <>
      <div className="mssAcademyFinishSpotlight">
        <div className="mssAcademyFinishIcon"><BottomNavIcon name="games" size={22} /></div>
        <div><small>PARCOURS DOUBLE OUT</small><strong>FINISHS DO · COMBINAISONS & PLANS B</strong><span>Des sorties à mémoriser, des solutions après un raté et des quiz avec Awena.</span></div>
        <button type="button" onClick={() => openFinishCourse(screen === "practice")}>DÉCOUVRIR ›</button>
      </div>
      {finishPriority && finishSuggestedLesson && <div className="mssAcademyFinishSpotlight mssAcademyFinishPersonal">
        <div className="mssAcademyFinishIcon"><BottomNavIcon name="stats" size={22} /></div>
        <div><small>AWENA · RÉVISION D'APRÈS TRAINING</small><strong>{finishPriority.label} · {finishPriority.hits}/{finishPriority.attempts} TOUCHES</strong>
          <span>Prochaine leçon conseillée : {finishSuggestedLesson.title}. Statistiques locales basées sur les doubles annoncés.</span></div>
        <button type="button" onClick={() => beginLesson(finishSuggestedLesson, screen === "practice")}>RÉVISER ›</button>
      </div>}
      <div className="mssAcademyBanner">
        <div className="mssAcademyBannerIcon" aria-hidden="true"><BottomNavIcon name={screen === "practice" ? "games" : "home"} size={22} /></div>
        <div><small>PARCOURS PERSONNALISÉ</small><strong>{attempted} / {CATALOGUE.length} leçons explorées</strong>
          <span>Prochaine étape : {recommended.title}</span>
          {reviewInsights.due > 0 && <span className="mssAcademyReminder">{reviewInsights.due} question{reviewInsights.due > 1 ? "s" : ""} à revoir avec Awena</span>}</div>
        <button type="button" onClick={() => beginLesson(recommended, screen === "practice")}>COMMENCER ›</button>
      </div>
      {renderList(screen === "practice")}
    </>}

    {lesson && <div className="mssAcademyPlayer">
      <div className="mssAcademyPlayerHead">
        <button type="button" onClick={closeLesson} aria-label="Retour au catalogue">‹ RETOUR</button>
        <div><small>{LEVELS[lesson.level]} · {FAMILIES[lesson.family]} · {lesson.minutes} MIN</small><h3>{lesson.title}</h3></div>
        <span>{phase === "intro" ? "1 / 3" : phase === "quiz" ? "2 / 3" : "3 / 3"}</span>
      </div>
      {phase === "intro" && <div className="mssAcademyStory">
        <small>AWENA T’EXPLIQUE</small><p>{lesson.intro}</p>
        <div className="mssAcademyInsight">{lesson.insight}</div>
        <div className="mssAcademyActions">
          <button type="button" onClick={() => speak(`${lesson.intro}. ${lesson.insight}`)}>🔊 RÉÉCOUTER AWENA</button>
          <button type="button" className="primary" onClick={() => { setPhase("quiz"); speak(questions[0]!.question); }}>J’AI COMPRIS ›</button>
        </div>
      </div>}
      {phase === "quiz" && activeQuestion && <div className="mssAcademyStory">
        <small>LES QUESTIONS D’AWENA · {quizIndex + 1} / {questions.length}</small>
        <div className="mssAcademyQuizTrack"><span style={{ width: `${(quizIndex + (checked ? 1 : 0)) / questions.length * 100}%` }}/></div>
        <p>{activeQuestion.question}</p>
        <div className="mssAcademyAnswers">{activeQuestion.answers.map((answer, index) =>
          <button key={`${index}:${answer}`} type="button" disabled={checked} onClick={() => setChoice(index)}
            aria-pressed={choice === index} className={`${choice === index ? "chosen" : ""} ${checked && index === activeQuestion.correct ? "correct" : ""} ${checked && choice === index && choice !== activeQuestion.correct ? "incorrect" : ""}`}>
            <span>{LETTERS[index]}</span>{answer}</button>)}</div>
        {checked && <div role="status" className="mssAcademyInsight">
          {choice === activeQuestion.correct ? "✓ Bien joué ! " : "↻ Awena t’explique : "}{activeQuestion.explanation}
        </div>}
        <div className="mssAcademyActions">
          <button type="button" onClick={() => speak(checked ? activeQuestion.explanation : activeQuestion.question)}>🔊 {checked ? "RÉÉCOUTER" : "RÉPÉTER"}</button>
          {checked ? <button type="button" className="primary" onClick={nextLessonQuestion}>{quizIndex === questions.length - 1 ? "PASSER AUX FLÉCHETTES ›" : "QUESTION SUIVANTE ›"}</button>
            : <button type="button" className="primary" disabled={choice === null} onClick={submitLessonAnswer}>VÉRIFIER</button>}
        </div>
        <div className="mssAcademyMiniScore">{quizEarned} bonne{quizEarned > 1 ? "s" : ""} réponse{quizEarned > 1 ? "s" : ""} pour le moment</div>
      </div>}
      {(phase === "practice" || phase === "result") && <div className="mssAcademyPractice">
        <div className="mssAcademyMission"><small>EXERCICE RÉEL · SAISIE MSS</small><strong>{lesson.mission}</strong></div>
        <div className="mssAcademyScoreboard">
          {lesson.practice.kind === "checkout" ? <div><small>RESTANT</small><strong>{run.remaining}</strong></div> :
            <div><small>{lesson.practice.kind === "target" ? "CIBLE À TOUCHER" : "POINTS"}</small><strong>{lesson.practice.kind === "target" ? lesson.practice.target === "BULL" ? "BULL25" : lesson.practice.target : run.points}</strong></div>}
          <div><small>FLÉCHETTES JOUÉES</small><strong>{run.darts} / {lesson.practice.maxDarts}</strong></div>
          {lesson.practice.kind === "checkout" ? <div><small>BUST</small><strong>{run.busts}</strong></div> : <div><small>QUIZ</small><strong>{quizAnswers.length ? `${quizEarned}/${questions.length}` : "—"}</strong></div>}
        </div>
        {run.lastMessage && <div className="mssAcademyFeedback" role="status">{run.lastMessage} {run.lastVisit.length ? `(${run.lastVisit.join(" · ")})` : ""}</div>}
        {phase === "practice" && <>
          <p className="mssAcademyHint">Lance réellement, puis valide les touches avec le clavier MSS. MISS, BUST et finish sont comptés selon les fléchettes saisies.</p>
          <div className="mssAcademyPad"><TrainingDartPad key={lesson.id} onVisit={onVisit} enableMethods={false} allowQuickScore={false}
            storageKey="awena_academy" maxQuickDarts={Math.min(3, lesson.practice.maxDarts - run.darts)} /></div>
        </>}
        {phase === "result" && <div className="mssAcademyResult">
          <small>{run.won ? "MISSION RÉUSSIE" : "ENTRAÎNEMENT TERMINÉ"}</small>
          <h3>{savedScore ?? 0} / 100</h3>
          <p>Quiz : {quizEarned} / {quizAnswers.length} · {run.darts} fléchette{run.darts > 1 ? "s" : ""} · {run.busts} BUST. {run.won ? "La réussite est enregistrée !" : "Continue : chaque tentative compte."}</p>
          <div className="mssAcademyActions">
            <button type="button" onClick={() => speak(run.won ? `Bravo pour cette mission ! Résultat ${savedScore} sur 100.` : `Tu progresses avec chaque essai. Résultat ${savedScore} sur 100.`)}>🔊 AWENA</button>
            <button type="button" onClick={startPractice}>RECOMMENCER L’EXERCICE</button>
            <button type="button" className="primary" onClick={closeLesson}>AUTRES LEÇONS ›</button>
          </div>
        </div>}
      </div>}
    </div>}

    {screen === "review" && !lesson && <div className="mssAcademyReviewDashboard">
      <div className="mssAcademyQuizHeader">
        <div><small>AWENA SE SOUVIENT DE TES DIFFICULTÉS</small><h3>MES RÉVISIONS PERSONNALISÉES</h3>
          <p>Les erreurs aux leçons et aux Quiz express deviennent de petites séances de rattrapage. Chaque réussite espace la prochaine révision : 1, 3 puis 7 jours.</p></div>
        {!round.length && <button type="button" disabled={reviewInsights.due === 0} onClick={newReviewRound}>{reviewInsights.due ? `RÉVISER ${Math.min(10, reviewInsights.due)} QUESTION${Math.min(10, reviewInsights.due) > 1 ? "S" : ""} ›` : "AUCUNE RÉVISION DUE"}</button>}
      </div>
      <div className="mssAcademyStats mssAcademyReviewStats">
        <div><small>À REVOIR MAINTENANT</small><strong>{reviewInsights.due}</strong></div>
        <div><small>EN CONSOLIDATION</small><strong>{reviewInsights.toConsolidate}</strong></div>
        <div><small>MAÎTRISÉES APRÈS ERREUR</small><strong>{reviewInsights.mastered}</strong></div>
      </div>
      {!round.length && <div className="mssAcademyReviewAdvice">
        {reviewInsights.due ? <>Awena a repéré les notions à renforcer. Lance une session courte, puis essaie les exercices réels pour consolider ta précision.</> :
          reviewInsights.toConsolidate ? <>Toutes tes révisions sont à jour. Prochain rappel à partir du {new Date(reviewInsights.nextDueAt!).toLocaleDateString("fr-FR", { day:"numeric", month:"long" })}. Tu peux continuer les leçons et Quiz express.</> :
          <>Aucune erreur enregistrée pour ce profil. Fais quelques leçons ou un Quiz express : Awena repérera automatiquement les réponses à travailler.</>}
      </div>}
      {!!reviewInsights.focusLessonId && !round.length && <button type="button" className="mssAcademyReviewFocus" onClick={() => beginLesson(CATALOGUE.find(item => item.id === reviewInsights.focusLessonId)!)}>
        <span className="mssAcademyReviewFocusIcon" aria-hidden="true"><BottomNavIcon name="games" size={18} /></span>
        <span><small>LEÇON RECOMMANDÉE PAR AWENA</small><strong>{CATALOGUE.find(item => item.id === reviewInsights.focusLessonId)?.title}</strong><span>Revoir l'explication et s'entraîner sur la cible MSS</span></span><b>›</b>
      </button>}
    </div>}
    {(screen === "quiz" || screen === "review") && !lesson && (screen === "quiz" || !!round.length) && <div className="mssAcademyQuizPanel">
      <div className="mssAcademyQuizHeader">
        <div><small>{roundMode === "review" ? "AWENA ADAPTE TON PARCOURS" : "AWENA TE MET AU DÉFI"}</small><h3>{roundMode === "review" ? `RÉVISION CIBLÉE · ${round.length} QUESTIONS` : "QUIZZ EXPRESS · 10 QUESTIONS"}</h3>
          <p>{roundMode === "review" ? "Questions sélectionnées parmi tes erreurs précédentes. Trois bonnes réponses consécutives permettent de consolider chaque notion." : "Questions sur les valeurs, doubles, finishs et décisions tactiques. Aucun lancer nécessaire."}</p></div>
        <button type="button" onClick={roundMode === "review" ? newReviewRound : newQuizRound}>{round.length ? (roundMode === "review" ? "ACTUALISER LA RÉVISION" : "NOUVEAU QUIZ") : "COMMENCER ›"}</button>
      </div>
      {!round.length && <div className="mssAcademyEmpty">{CATALOGUE.length} leçons, {questionTotal} questions : Awena compose un quiz de plusieurs niveaux. Les résultats sont enregistrés pour ton profil.</div>}
      {!!round.length && !roundFinished && currentRoundQuestion && <div className="mssAcademyStory">
        <small>{LEVELS[currentRoundQuestion.level]} · {currentRoundQuestion.lessonTitle} · QUESTION {roundIndex + 1} / {round.length}</small>
        <div className="mssAcademyQuizTrack"><span style={{width:`${(roundIndex + (roundChecked ? 1 : 0))/round.length*100}%`}} /></div>
        <p>{currentRoundQuestion.question}</p>
        <div className="mssAcademyAnswers">{currentRoundQuestion.answers.map((answer,index) =>
          <button type="button" key={`${index}:${answer}`} aria-pressed={roundChoice === index} disabled={roundChecked}
            className={`${roundChoice === index ? "chosen" : ""} ${roundChecked && currentRoundQuestion.correct === index ? "correct" : ""} ${roundChecked && roundChoice === index && roundChoice !== currentRoundQuestion.correct ? "incorrect" : ""}`}
            onClick={() => setRoundChoice(index)}><span>{LETTERS[index]}</span>{answer}</button>)}</div>
        {roundChecked && <div className="mssAcademyInsight" role="status">
          {roundChoice === currentRoundQuestion.correct ? "✓ Bonne réponse ! " : "↻ Correction d'Awena : "}{currentRoundQuestion.explanation}
        </div>}
        <div className="mssAcademyActions">
          <button type="button" onClick={() => speak(roundChecked ? currentRoundQuestion.explanation : currentRoundQuestion.question)}>🔊 RÉÉCOUTER</button>
          {roundChecked ? <button type="button" className="primary" onClick={nextRoundQuestion}>{roundIndex === round.length - 1 ? "VOIR MON SCORE ›" : "QUESTION SUIVANTE ›"}</button>
            : <button type="button" className="primary" disabled={roundChoice === null} onClick={verifyRoundAnswer}>VALIDER</button>}
        </div>
        <div className="mssAcademyMiniScore">{quizCorrectCount(round, roundAnswers)} / {roundAnswers.length} réponses correctes</div>
      </div>}
      {roundFinished && <div className="mssAcademyResult">
        <small>{roundMode === "review" ? "RÉVISION TERMINÉE" : "QUIZ TERMINÉ"}</small><h3>{quizCorrectCount(round, roundAnswers)} / {round.length}</h3>
        <p>{roundMode === "review" ? `Awena a mis à jour tes rappels. ${reviewInsights.due ? `${reviewInsights.due} question${reviewInsights.due > 1 ? "s" : ""} encore à revoir.` : "Toutes les questions dues sont révisées !"}` : quizCorrectCount(round, roundAnswers) >= 8 ? "Excellent ! Awena te propose de garder ces bons réflexes." : "Bien joué pour cet entraînement. Recommence pour consolider les réponses difficiles."}</p>
        <div className="mssAcademyActions"><button type="button" onClick={() => speak(`Tu as ${quizCorrectCount(round, roundAnswers)} bonnes réponses sur ${round.length}.`)}>🔊 AWENA</button>
          {roundMode === "review" && reviewInsights.focusLessonId && <button type="button" onClick={() => {
            const target = CATALOGUE.find(item => item.id === reviewInsights.focusLessonId);
            if (target) beginLesson(target, true);
          }}>🎯 EXERCICE SUR LA CIBLE</button>}
          {roundMode === "express" && reviewInsights.due > 0 && <button type="button" onClick={() => switchScreen("review")}>RÉVISER MES ERREURS ({reviewInsights.due})</button>}
          <button type="button" className="primary" disabled={roundMode === "review" && reviewInsights.due === 0} onClick={roundMode === "review" ? newReviewRound : newQuizRound}>{roundMode === "review" ? "RÉVISION SUIVANTE ›" : "NOUVEAU QUIZ ›"}</button></div>
      </div>}
      <div className="mssAcademyMiniScore">{roundMode === "review" ? `Réponses travaillées : ${reviewInsights.reviewed} · Questions encore dues : ${reviewInsights.due}` : `Quiz joués : ${quizStats.rounds} · Meilleur score : ${quizStats.best} % · Dernier : ${quizStats.latest} %`}</div>
    </div>}

    {screen === "progress" && !lesson && <div className="mssAcademyProgress">
      <FinishDoWeeklyPanel progress={finishProgress} onReview={(aim) => {
        const selected = CATALOGUE.find(item => item.id === finishDoLessonForAim(aim));
        if (selected) beginLesson(selected);
      }} />
      <div className="mssAcademyStats"><div><small>LEÇONS EXPLORÉES</small><strong>{attempted}/{CATALOGUE.length}</strong></div><div><small>MAÎTRISÉES (80+)</small><strong>{mastered}</strong></div><div><small>EXERCICES</small><strong>{attempts}</strong></div></div>
      <div className="mssAcademyStats mssAcademyQuizStats"><div><small>QUIZ EXPRESS</small><strong>{quizStats.rounds}</strong></div><div><small>MEILLEUR QUIZ</small><strong>{quizStats.best}%</strong></div><div><small>RÉPONSES JUSTES</small><strong>{quizStats.correct}/{quizStats.questions}</strong></div></div>
      <button type="button" className="mssAcademyReviewFocus" onClick={() => switchScreen("review")}>
        <span className="mssAcademyReviewFocusIcon" aria-hidden="true"><BottomNavIcon name="agenda" size={18} /></span>
        <span><small>RÉVISIONS ADAPTATIVES</small><strong>{reviewInsights.due} question{reviewInsights.due > 1 ? "s" : ""} à revoir maintenant</strong><span>{reviewInsights.mastered} question{reviewInsights.mastered > 1 ? "s" : ""} consolidée{reviewInsights.mastered > 1 ? "s" : ""} après trois réussites</span></span><b>›</b>
      </button>
      <p>Les résultats restent associés à ce profil sur cet appareil. L'Historique V4 des parties n'est pas modifié. La synchronisation cloud n'est pas encore activée pour l'Académie.</p>
      <div className="mssAcademyProgressTitle"><strong>Parcours par leçon</strong><span>{CATALOGUE.length} leçons · page {progressPage + 1}/{progressPageCount}</span></div>
      {visibleProgress.map(item => {
        const row = progress[item.id];
        return <button type="button" className="mssAcademyProgressRow" key={item.id} onClick={() => beginLesson(item)}>
          <span className="mssAcademyProgressIcon" aria-hidden="true"><BottomNavIcon name={FAMILY_ICONS[item.family]} size={18} /></span>
          <strong>{item.title}</strong><span>{row ? `${row.best}/100 · ${row.attempts} essai${row.attempts > 1 ? "s" : ""}` : "À découvrir"}</span>
          <div className="mssAcademyProgressTrack"><span style={{ width: `${row?.best || 0}%` }}/></div>
        </button>;
      })}
      {CATALOGUE.length > PROGRESS_PER_PAGE && <nav className="mssAcademyPager" aria-label="Pages de progression">
        <button type="button" onClick={() => setProgressPage(page => Math.max(0, page - 1))} disabled={progressPage === 0} aria-label="Page précédente de progression">‹</button>
        <span>Page {progressPage + 1} / {progressPageCount}</span>
        <button type="button" onClick={() => setProgressPage(page => Math.min(progressPageCount - 1, page + 1))} disabled={progressPage >= progressPageCount - 1} aria-label="Page suivante de progression">›</button>
      </nav>}
    </div>}
    <p className="mssAcademyFoot">{VOICE_PLACEHOLDER} Les contenus et quiz sont des créations MSS, sans reproduction du livret de référence.</p>
  </section>;
}
