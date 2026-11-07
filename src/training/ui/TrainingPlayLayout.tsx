import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import TrainingHeader from "./TrainingHeader";
import cricketDartSvg from "../../ui_assets/cricket-dart.svg";
import "./trainingResponsive.css";

export type TrainingKpi = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
};

const FULLSCREEN_STYLE_ID = "dc-training-fullscreen-style";
const FULLSCREEN_CLASS = "dc-training-fullscreen-play";

export default function TrainingPlayLayout({
  title, tickerId, rules, onExit, eyebrow, target, targetHint, progress, kpis,
  participant, participantIndex, participantTotal, playerScore,
  playerScoreLabel = "POINTS", sessionObjective, roundLabel,
  dartsPlayed = 0, stats, children,
}: {
  title: string;
  tickerId?: string;
  rules?: React.ReactNode;
  onExit: () => void;
  eyebrow?: string;
  target: React.ReactNode;
  targetHint?: React.ReactNode;
  progress?: { value: number; max: number; label?: string } | null;
  kpis?: TrainingKpi[];
  participant?: any;
  participantIndex?: number;
  participantTotal?: number;
  playerScore?: React.ReactNode;
  playerScoreLabel?: string;
  sessionObjective?: React.ReactNode;
  roundLabel?: React.ReactNode;
  dartsPlayed?: number;
  stats?: TrainingKpi[];
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const [statsOpen, setStatsOpen] = React.useState(false);
  React.useEffect(() => {
    if (!statsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setStatsOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [statsOpen]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior }); } catch {}
    document.body.classList.add(FULLSCREEN_CLASS);
    let style = document.getElementById(FULLSCREEN_STYLE_ID) as HTMLStyleElement | null;
    let created = false;
    if (!style) {
      style = document.createElement("style");
      style.id = FULLSCREEN_STYLE_ID;
      style.textContent = `
        body.${FULLSCREEN_CLASS} [data-mss-floating-control="awena-launcher"],
        body.${FULLSCREEN_CLASS} .bottom-nav,
        body.${FULLSCREEN_CLASS} .dc-tabbar,
        body.${FULLSCREEN_CLASS} .tabbar,
        body.${FULLSCREEN_CLASS} .bottom-tabbar {
          display:none!important;visibility:hidden!important;height:0!important;
        }
      `;
      document.head.appendChild(style);
      created = true;
    }
    return () => {
      document.body.classList.remove(FULLSCREEN_CLASS);
      if (created) style?.remove();
    };
  }, []);

  const safeMax = Math.max(1, Number(progress?.max || 1));
  const safeValue = Math.max(0, Number(progress?.value || 0));
  const pct = Math.max(0, Math.min(100, safeValue / safeMax * 100));
  const shownKpis = Array.isArray(kpis) ? kpis.slice(0, 4) : [];
  // Three cricket darts, filled progressively during each visit; the full visit
  // remains visible until the first dart of the next visit.
  const dartCount = Math.max(0, Math.floor(Number(dartsPlayed) || 0));
  const filledDarts = dartCount === 0 ? 0 : ((dartCount - 1) % 3) + 1;
  const portraitName = String(participant?.name || "Joueur");
  const avatar = participant?.avatarDataUrl || participant?.avatarUrl || undefined;
  const detailStats = stats?.length ? stats : shownKpis;

  return <div className="mssTrainingPlay" style={{ background: theme.bg, color: theme.text }}>
    <TrainingHeader title={title} tickerId={tickerId} onBack={onExit} rules={rules || <p>Suivez votre objectif et validez chaque volée.</p>} />
    <main className="mssTrainingPlayMain">
      <div className="mssTrainingPlayOverview">
        <section className="mssTrainingPlayer" aria-label="Joueur actif">
          {avatar && <img className="mssTrainingPlayerGhost" src={avatar} alt="" aria-hidden="true" />}
          <div className="mssTrainingPlayerIdentity">
            <span className="mssTrainingEyebrow">{Number(participantTotal || 1) > 1 ? `JOUEUR ${Number(participantIndex || 1)}/${Number(participantTotal || 1)}` : "JOUEUR ACTIF"}</span>
            <strong className="mssTrainingPlayerName" title={portraitName}>{portraitName}</strong>
            <div className="mssTrainingPlayerScore">{playerScore ?? 0}</div>
            <span className="mssTrainingScoreLabel">{playerScoreLabel}</span>
          </div>
          <div className="mssTrainingTargetPanel">
            <span className="mssTrainingEyebrow">CIBLE À JOUER</span>
            <strong className="mssTrainingTarget">{target}</strong>
            {targetHint && <small className="mssTrainingTargetHint">{targetHint}</small>}
          </div>
        </section>

        {sessionObjective && <section className="mssTrainingObjective" aria-label="Objectif de l'exercice">
          <span className="mssTrainingSectionTitle">◎ OBJECTIF</span>
          <div>{sessionObjective}</div>
        </section>}

        <section className="mssTrainingLiveInfo" aria-label="Informations de l'exercice">
          <div className="mssTrainingInfoExercise"><span>EXERCICE</span><strong title={eyebrow}>{eyebrow || title}</strong></div>
          <div className="mssTrainingInfoRound"><span>TOUR</span><strong>{roundLabel ?? Math.floor(dartCount / 3) + 1}</strong></div>
          <div className="mssTrainingInfoDarts"><span>FLÉCHETTES</span><div className="mssTrainingDarts" aria-label={`${filledDarts} fléchette(s) sur 3 jouées dans la volée`}>
            {[0,1,2].map((index) => <img key={index} src={cricketDartSvg} alt="" className={index < filledDarts ? "isThrown" : ""} />)}
          </div></div>
        </section>

        {progress && <section className="mssTrainingProgress" aria-label="Progression de l'exercice">
          <div className="mssTrainingProgressCopy"><span>{progress.label || "PROGRESSION"}</span><strong>{Math.min(safeValue, safeMax)} / {safeMax}</strong></div>
          <div className="mssTrainingProgressTrack"><div style={{ width: `${pct}%` }}/></div>
        </section>}

        {shownKpis.length > 0 && <section className="mssTrainingKpis" aria-label="Indicateurs de séance">
          {shownKpis.map((kpi, index) => <div key={`${kpi.label}-${index}`} className="mssTrainingKpi"><span>{kpi.label}</span><strong>{kpi.value}</strong></div>)}
        </section>}

        <button className="mssTrainingStatsButton" type="button" onClick={() => setStatsOpen(true)} aria-haspopup="dialog" aria-label="Ouvrir les statistiques et performances détaillées">
          <span>▥ &nbsp; STATISTIQUES / PERFORMANCES</span>
          <span className="mssTrainingStatsPreview">{shownKpis.slice(0, 2).map((item) => `${item.label}: ${String(item.value ?? "—")}`).join(" · ")}</span>
          <span className="mssTrainingStatsDetail">DÉTAIL ›</span>
        </button>
      </div>
      <section className="mssTrainingInput" aria-label="Saisie des fléchettes">
        {children}
      </section>
    </main>
    {statsOpen && <div className="mssTrainingStatsBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setStatsOpen(false); }}>
      <section className="mssTrainingStatsSheet" role="dialog" aria-modal="true" aria-label="Statistiques et performances">
        <div className="mssTrainingStatsTop"><div><small>SUIVI DE PERFORMANCE</small><h2>{eyebrow || title}</h2></div><button type="button" onClick={() => setStatsOpen(false)} aria-label="Fermer le bilan">×</button></div>
        <div className="mssTrainingStatsGrid">{detailStats.map((item, i) => <div key={`${item.label}-${i}`}><small>{item.label}</small><strong>{item.value}</strong>{item.sub && <span>{item.sub}</span>}</div>)}</div>
        {progress && <div className="mssTrainingStatsSummary">Progression : {Math.round(pct)} % • {Math.min(safeValue, safeMax)} / {safeMax} · {progress.label || "EXERCICE"}</div>}
        <p>Les indicateurs sont calculés à partir des fléchettes effectivement enregistrées. Une volée saisie uniquement par son total ne fournit pas de précision par segment.</p>
      </section>
    </div>}
  </div>;
}
