import React from "react";
import { awenaVoice } from "../../awena/AwenaVoice";
import { loadAwenaSettings } from "../../awena/AwenaSettings";
import TrainingDartPad from "../ui/TrainingDartPad";
import type { TrainingDart } from "../lib/trainingDarts";
import type { AcademyLesson } from "./academyLessons";
import { MSS_ACADEMY_CATALOGUE } from "./academyCatalogue";
import { getAcademyQuestions } from "./academyQuizBank";
import { makeAcademyQuizRound, quizCorrectCount, type AcademyQuizItem } from "./academyQuizMode";
import { academyResultScore, applyAcademyVisit, newAcademyRun, type AcademyRun } from "./academyCore";
import {
  loadAcademyProgress, saveAcademyAttempt, type AcademyProgress,
  loadAcademyQuizStats, saveAcademyQuizRound, type AcademyQuizStats,
} from "./academyStore";
import "./trainingAwenaAcademy.css";

type AcademyScreen = "learn" | "practice" | "quiz" | "progress";
type LessonPhase = "intro" | "quiz" | "practice" | "result";
const LETTERS = ["A", "B", "C"];
const LEVELS = ["", "DÉCOUVERTE", "FONDATIONS", "MAÎTRISE", "EXPERT"];
const FAMILIES: Record<AcademyLesson["family"], string> = {
  scoring: "Calcul mental", doubles: "Doubles", checkout: "Finishs", precision: "Précision",
};
const VOICE_PLACEHOLDER = "Awena utilise la voix MSS configurée. Le texte reste accessible si la synthèse vocale n'est pas disponible.";
const CATALOGUE = [...MSS_ACADEMY_CATALOGUE].sort((a, b) => a.level - b.level);

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
  const [run, setRun] = React.useState<AcademyRun>(() => newAcademyRun(CATALOGUE[0]!.practice));
  const [savedScore, setSavedScore] = React.useState<number | null>(null);
  const [levelFilter, setLevelFilter] = React.useState("all");
  const [familyFilter, setFamilyFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
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
    setQuizStats(loadAcademyQuizStats(participantId));
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

  const recommended = React.useMemo(() =>
    CATALOGUE.find(item => !progress[item.id] || progress[item.id].best < 80) || CATALOGUE[0]!, [progress]);
  const mastered = CATALOGUE.filter(item => (progress[item.id]?.best || 0) >= 80).length;
  const attempted = CATALOGUE.filter(item => (progress[item.id]?.attempts || 0) > 0).length;
  const attempts = CATALOGUE.reduce((total, item) => total + (progress[item.id]?.attempts || 0), 0);
  const questions = React.useMemo(() => lesson ? getAcademyQuestions(lesson) : [], [lesson]);
  const activeQuestion = questions[quizIndex];
  const quizEarned = quizCorrectCount(questions, quizAnswers);
  const filteredLessons = CATALOGUE.filter(item =>
    (levelFilter === "all" || item.level === Number(levelFilter)) &&
    (familyFilter === "all" || item.family === familyFilter) &&
    (!search.trim() || `${item.title} ${item.intro} ${item.mission}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr").trim())));

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
  };
  const newQuizRound = () => {
    const items = makeAcademyQuizRound(CATALOGUE, 10, quizStats.rounds + 1);
    setRound(items); setRoundIndex(0); setRoundAnswers([]);
    setRoundChoice(null); setRoundChecked(false); setRoundFinished(false);
    setScreen("quiz"); setLesson(null);
    if (items[0]) speak(`Quiz express MSS ! Dix questions pour entraîner tes réflexes. Première question. ${items[0].question}`);
  };
  const verifyRoundAnswer = () => {
    const item = round[roundIndex];
    if (!item || roundChoice === null || roundChecked) return;
    setRoundAnswers(prev => [...prev.slice(0, roundIndex), roundChoice]);
    setRoundChecked(true);
    speak(`${roundChoice === item.correct ? "Bravo !" : "Voici l'explication."} ${item.explanation}`);
  };
  const nextRoundQuestion = () => {
    if (!roundChecked) return;
    if (roundIndex === round.length - 1) {
      const count = quizCorrectCount(round, roundAnswers);
      setQuizStats(saveAcademyQuizRound(participantId, count, round.length));
      setRoundFinished(true);
      speak(`Quiz terminé ! Tu as ${count} bonnes réponses sur ${round.length}.`);
      return;
    }
    const next = roundIndex + 1;
    setRoundIndex(next); setRoundChoice(null); setRoundChecked(false);
    speak(round[next]!.question);
  };

  const renderList = (freePractice: boolean) => <>
    <div className="mssAcademyFilters">
      <label>RECHERCHE <input type="search" placeholder="Rechercher une leçon" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <label>NIVEAU <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
        <option value="all">Tous les niveaux</option>{[1,2,3,4].map(level => <option key={level} value={level}>{LEVELS[level]}</option>)}
      </select></label>
      <label>THÈME <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)}>
        <option value="all">Tous les thèmes</option>{Object.entries(FAMILIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <span className="mssAcademyCount">{filteredLessons.length} / {CATALOGUE.length} leçons</span>
    </div>
    <div className="mssAcademyLessonGrid">
      {filteredLessons.map(item => {
        const row = progress[item.id];
        const isSuggested = recommended.id === item.id;
        const index = CATALOGUE.indexOf(item);
        return <button type="button" key={item.id} className="mssAcademyLessonTile" onClick={() => beginLesson(item, freePractice)}>
          <span className="mssAcademyLessonNumber">{String(index + 1).padStart(2, "0")}</span>
          <span className="mssAcademyLessonInfo">
            <small>{LEVELS[item.level]} · {FAMILIES[item.family]} · {item.minutes} MIN · 3 QUIZ {isSuggested ? "· CONSEILLÉE" : ""}</small>
            <strong>{item.title}</strong>
            <span>{freePractice ? item.mission : item.intro}</span>
          </span>
          <span className="mssAcademyLessonStatus">{row ? `${row.best}/100` : "DÉCOUVRIR"}<b>›</b></span>
        </button>;
      })}
    </div>
    {!filteredLessons.length && <p className="mssAcademyEmpty">Aucune leçon ne correspond aux filtres. Modifie la recherche ou le niveau.</p>}
  </>;

  const currentRoundQuestion = round[roundIndex];
  return <section className="mssAwenaAcademy" aria-label="Académie Awena, leçons et quiz de fléchettes MSS">
    <div className="mssAcademyHero">
      <img src="/awena/awena-bot-medallion.webp" alt="Awena, coach MSS" loading="lazy" />
      <div className="mssAcademyHeroText">
        <small>MULTISPORTS SCORING · CENTRE D’ENTRAÎNEMENT</small>
        <h2>ACADÉMIE AWENA</h2>
        <p>{CATALOGUE.length} mini-leçons originales · {CATALOGUE.reduce((n,item) => n + getAcademyQuestions(item).length,0)} quiz · exercices réels commentés par Awena.</p>
      </div>
      <button type="button" className="mssAcademyVoice" aria-pressed={voiceEnabled} title={voiceEnabled ? "Couper la narration" : "Activer la narration"}
        onClick={() => { if (voiceEnabled) { void awenaVoice.stop(); voiceSeq.current++; } setVoiceEnabled(v => !v); }}>
        {voiceEnabled ? "🔊 VOIX ON" : "🔇 VOIX OFF"}
      </button>
    </div>
    {voiceNotice && <div className="mssAcademyVoiceNotice" role="status">{voiceNotice}</div>}
    <div className="mssAcademyTabs" role="group" aria-label="Parcours Académie Awena">
      {([ ["learn", "APPRENDRE"], ["practice", "S’EXERCER"], ["quiz", "QUIZZ EXPRESS"], ["progress", "MES PROGRÈS"] ] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={screen === id} className={screen === id ? "active" : ""} onClick={() => switchScreen(id)}>{label}</button>)}
    </div>

    {!lesson && (screen === "learn" || screen === "practice") && <>
      <div className="mssAcademyBanner">
        <div><small>PARCOURS PERSONNALISÉ</small><strong>{attempted} / {CATALOGUE.length} leçons explorées</strong>
          <span>Prochaine étape : {recommended.title}</span></div>
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

    {screen === "quiz" && !lesson && <div className="mssAcademyQuizPanel">
      <div className="mssAcademyQuizHeader">
        <div><small>AWENA TE MET AU DÉFI</small><h3>QUIZZ EXPRESS · 10 QUESTIONS</h3>
          <p>Questions sur les valeurs, doubles, finishs et décisions tactiques. Aucun lancer nécessaire.</p></div>
        <button type="button" onClick={newQuizRound}>{round.length ? "NOUVEAU QUIZ" : "COMMENCER ›"}</button>
      </div>
      {!round.length && <div className="mssAcademyEmpty">40 leçons, 120 questions : Awena compose un nouveau quiz à partir de plusieurs niveaux. Les résultats sont enregistrés pour ton profil.</div>}
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
        <small>QUIZ TERMINÉ</small><h3>{quizCorrectCount(round, roundAnswers)} / {round.length}</h3>
        <p>{quizCorrectCount(round, roundAnswers) >= 8 ? "Excellent ! Awena te propose de garder ces bons réflexes." : "Bien joué pour cet entraînement. Recommence pour consolider les réponses difficiles."}</p>
        <div className="mssAcademyActions"><button type="button" onClick={() => speak(`Tu as ${quizCorrectCount(round, roundAnswers)} bonnes réponses sur ${round.length}.`)}>🔊 AWENA</button>
          <button type="button" className="primary" onClick={newQuizRound}>NOUVEAU QUIZ ›</button></div>
      </div>}
      <div className="mssAcademyMiniScore">Quiz joués : {quizStats.rounds} · Meilleur score : {quizStats.best} % · Dernier : {quizStats.latest} %</div>
    </div>}

    {screen === "progress" && !lesson && <div className="mssAcademyProgress">
      <div className="mssAcademyStats"><div><small>LEÇONS EXPLORÉES</small><strong>{attempted}/{CATALOGUE.length}</strong></div><div><small>MAÎTRISÉES (80+)</small><strong>{mastered}</strong></div><div><small>EXERCICES</small><strong>{attempts}</strong></div></div>
      <div className="mssAcademyStats mssAcademyQuizStats"><div><small>QUIZ EXPRESS</small><strong>{quizStats.rounds}</strong></div><div><small>MEILLEUR QUIZ</small><strong>{quizStats.best}%</strong></div><div><small>RÉPONSES JUSTES</small><strong>{quizStats.correct}/{quizStats.questions}</strong></div></div>
      <p>Les résultats restent associés à ce profil sur cet appareil. L'Historique V4 des parties n'est pas modifié. La synchronisation cloud n'est pas encore activée pour l'Académie.</p>
      {CATALOGUE.map(item => {
        const row = progress[item.id];
        return <button type="button" className="mssAcademyProgressRow" key={item.id} onClick={() => beginLesson(item)}>
          <strong>{item.title}</strong><span>{row ? `${row.best}/100 · ${row.attempts} essai${row.attempts > 1 ? "s" : ""}` : "À découvrir"}</span>
          <div className="mssAcademyProgressTrack"><span style={{ width: `${row?.best || 0}%` }}/></div>
        </button>;
      })}
    </div>}
    <p className="mssAcademyFoot">{VOICE_PLACEHOLDER} Les contenus et quiz sont des créations MSS, sans reproduction du livret de référence.</p>
  </section>;
}
