import React from "react";
import "./tossitResponsive.css";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import { History } from "../../lib/history";
import { scopedStorageKey } from "../../lib/storage";
import { encodeTossitDraft, decodeTossitDraft } from "./tossitDraft";
import { PageAdBanner } from "../../monetization/AdSlot";
import { previewBorderRound, previewThiefRound, previewChoreRound } from "./tossitScoringPreview";
import {
  TOSSIT_MODES, TOSSIT_PLANNED, TOSSIT_COLORS, applyTossitAction, newTossitGame, summaryForTossit, undoTossitAction,
  type TossitMode, type TossitPlayer, type TossitState, type RiverLanding, type CornholeLanding, type ThiefCopCapture, TOSSIT_CHORES, type ChoreThrow,
} from "./tossitEngine";
import tickerMenu from "../../assets/tickers/ticker_tossit_games.webp";
import tickerClassic from "../../assets/tickers/ticker_tossit_classic.webp";
import tickerSpeed from "../../assets/tickers/ticker_tossit_speed.webp";
import tickerTarget from "../../assets/tickers/ticker_tossit_target.webp";
import tickerBattle from "../../assets/tickers/ticker_tossit_battle.webp";
import tickerSniper from "../../assets/tickers/ticker_tossit_sniper.webp";
import tickerConquest from "../../assets/tickers/ticker_tossit_conquest.webp";
import tickerRiver from "../../assets/tickers/ticker_tossit_river.webp";
import tickerRiverFr from "../../assets/tickers/ticker_tossit_river_fr.webp";
import tickerRiverEn from "../../assets/tickers/ticker_tossit_river_en.webp";
import tickerCornhole from "../../assets/tickers/ticker_tossit_cornhole.webp";
import tickerCornholeFr from "../../assets/tickers/ticker_tossit_cornhole_fr.webp";
import tickerCornholeEn from "../../assets/tickers/ticker_tossit_cornhole_en.webp";
import tickerGoalkeeper from "../../assets/tickers/ticker_tossit_goalkeeper.webp";
import tickerGoalkeeperFr from "../../assets/tickers/ticker_tossit_goalkeeper_fr.webp";
import tickerGoalkeeperEn from "../../assets/tickers/ticker_tossit_goalkeeper_en.webp";
import tickerFootballPitch from "../../assets/tickers/ticker_tossit_football_pitch.webp";
import tickerFootballPitchFr from "../../assets/tickers/ticker_tossit_football_pitch_fr.webp";
import tickerFootballPitchEn from "../../assets/tickers/ticker_tossit_football_pitch_en.webp";
import tickerThiefCop from "../../assets/tickers/ticker_tossit_thief_cop.webp";
import tickerThiefCopFr from "../../assets/tickers/ticker_tossit_thief_cop_fr.webp";
import tickerThiefCopEn from "../../assets/tickers/ticker_tossit_thief_cop_en.webp";
import tickerReach from "../../assets/tickers/ticker_tossit_reach.webp";
import tickerReachFr from "../../assets/tickers/ticker_tossit_reach_fr.webp";
import tickerReachEn from "../../assets/tickers/ticker_tossit_reach_en.webp";
import tickerRainbow from "../../assets/tickers/ticker_tossit_rainbow.webp";
import tickerRainbowFr from "../../assets/tickers/ticker_tossit_rainbow_fr.webp";
import tickerRainbowEn from "../../assets/tickers/ticker_tossit_rainbow_en.webp";
import menuDecor from "../../assets/tossit/tossit_menu_decor.webp";
import tickerChores from "../../assets/tickers/ticker_tossit_chores.webp";
import tickerChoresFr from "../../assets/tickers/ticker_tossit_chores_fr.webp";
import tickerChoresEn from "../../assets/tickers/ticker_tossit_chores_en.webp";
import tickerBottle from "../../assets/tickers/ticker_tossit_bottle.webp";
import tickerBottleFr from "../../assets/tickers/ticker_tossit_bottle_fr.webp";
import tickerBottleEn from "../../assets/tickers/ticker_tossit_bottle_en.webp";

const ART: Record<TossitMode | "games", string> = { games: tickerMenu, classic: tickerClassic, speed: tickerSpeed, target: tickerTarget, duel: tickerMenu, border: tickerTarget, tictac: tickerTarget, battle: tickerBattle, sniper: tickerSniper, conquest: tickerConquest, river: tickerRiver, cornhole: tickerCornhole, goalkeeper: tickerGoalkeeper, football_pitch: tickerFootballPitch, thief_cop: tickerThiefCop, reach: tickerReach, rainbow: tickerRainbow, chores: tickerChores, bottle: tickerBottle };
const TOSSIT_I18N_ART: Partial<Record<TossitMode, { fr: string; en: string }>> = {
  river: { fr: tickerRiverFr, en: tickerRiverEn },
  cornhole: { fr: tickerCornholeFr, en: tickerCornholeEn },
  goalkeeper: { fr: tickerGoalkeeperFr, en: tickerGoalkeeperEn },
  football_pitch: { fr: tickerFootballPitchFr, en: tickerFootballPitchEn },
  thief_cop: { fr: tickerThiefCopFr, en: tickerThiefCopEn },
  reach: { fr: tickerReachFr, en: tickerReachEn },
  rainbow: { fr: tickerRainbowFr, en: tickerRainbowEn },
  chores: { fr: tickerChoresFr, en: tickerChoresEn },
  bottle: { fr: tickerBottleFr, en: tickerBottleEn },
};
function tickerForTossit(mode: TossitMode | "games", lang: string) {
  return mode === "games" ? ART.games : (TOSSIT_I18N_ART[mode]?.[String(lang || "fr").startsWith("fr") ? "fr" : "en"] ?? ART[mode]);
}
const ACCENT = "#48E7CF";
const rulesUrl = "https://tossit.game/pages/how-to-play";
// Local interrupted-game draft only. Finished matches remain in History V4.
const TOSSIT_DRAFT_KEY = "mss:tossit:draft:v132";
function readDraft(): TossitState | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return decodeTossitDraft(
      localStorage.getItem(scopedStorageKey(TOSSIT_DRAFT_KEY)),
      (mode) => TOSSIT_MODES.some(entry => entry.id === mode),
    );
  } catch { return null; }
}
function writeDraft(state: TossitState) {
  try {
    if (typeof localStorage === "undefined") return;
    const key = scopedStorageKey(TOSSIT_DRAFT_KEY);
    const serialized = encodeTossitDraft(state);
    if (serialized === null) localStorage.removeItem(key);
    else localStorage.setItem(key, serialized);
  } catch { /* browsing without storage access must not block gameplay */ }
}

const tinfo: Record<TossitMode, string> = {
  classic: "Le joueur le plus proche du cochonnet noir gagne la manche et marque 1 point par fléchette collée, puis les bonus : Kiss +2, French Kiss +3, Jackiss +3 et bonus de fléchettes, Jumpover +9 et remise à zéro adverse. Jackover gagne immédiatement. Premier à 13.",
  speed: "Deux joueurs jouent simultanément. Chaque fléchette collée vaut 1 point. Le Kiss peut ajouter des points ; aucun lancer réussi entraîne une pénalité. Jumpover gagne immédiatement. Premier à atteindre 21.",
  target: "Chaque fléchette vaut 0, 1, 2 ou 3 selon sa zone. Bonus de 1 point lorsque toutes les fléchettes collent. Atteignez exactement 21 ; un dépassement annule les points de la volée.",
  duel: "Deux joueurs jouent alternativement. Six fléchettes colorées, puis la noire : si le cochonnet ne colle pas, 0 point. Sinon 1 point par fléchette collée, Kiss +1 et Jumpover +3. Premier à 21.",
  border: "Deux joueurs lancent de part et d’autre d’une ligne. Mesurer la distance en centimètres des ventouses valides à la ligne. Celui qui s’en approche le plus marque pour chaque ventouse mieux placée que la meilleure adverse. Ventouse collée du mauvais côté : +1 à l’adversaire. Premier à 13.",
  tictac: "Deux joueurs alternent les lancers sur une grille : 4×4 pour aligner 3 couleurs, ou 5×5 pour en aligner 4. Une case déjà occupée ne change pas de propriétaire. Touchez la case réellement atteinte ou indiquez un tir raté.",
  battle: "Deux joueurs lancent leurs ventouses colorées simultanément. Celui qui en colle le plus lance le cochonnet noir (égalité : pierre-feuille-ciseaux). Si la noire reste collée, la couleur la plus proche remporte la manche. Format MSS : premier à 3/5/7 manches gagnées.",
  sniper: "Installez la Mega dart sur une surface lisse. Tout le monde lance en même temps : le premier à coller une ventouse au-dessus de la Mega dart gagne. Ultimate Trick : une ventouse sur une ventouse déjà empilée sur la Mega dart. Victoire immédiate.",
  conquest: "Deux équipes reçoivent une consigne de couleur et une quantité, par exemple 3 ventouses rouges. La première équipe qui colle le bon nombre de la bonne couleur dans sa zone gagne la manche. Format MSS : premier à 3/5/7 manches gagnées.",
  river: "Avec un tapis TOSSIT River, lancer dans le camp adverse : la zone touchée indique les points. Tir dans son propre camp : points pour l'autre équipe. Rivière touchée : fin immédiate du tour. Kiss +2 et Jumpover +9 avec remise à zéro adverse. Premier à 50 points.",
  cornhole: "Poster Cornhole : trois fléchettes par équipe, trou +3, planche +1, ratée 0. Série parfaite des trois trous : +9 et relance immédiate. Kiss +1, Jumpover multiplie la manche. Les points des deux camps s'annulent ; exactement 21 pour gagner. Dépassement : 13, deux dépassements consécutifs : 0.",
  goalkeeper: "Poster World Football : trois tirs par tour. Coin haut et entre les jambes du gardien +3, au-dessus du but +2, côté du but +1, gardien −1, tir raté 0. Premier à 11 points.",
  football_pitch: "Poster Football Pitch : attaquant et défenseur alternent chacun une ventouse. Validez manuellement un chemin continu depuis le centre jusqu'au but (ventouses en contact). Une passe longue par attaque. Le défenseur peut bloquer ; les tirs ratés restent hors jeu. Premier à cinq buts. Les rôles tournent entre les attaques (adaptation MSS).",
  thief_cop: "Deux joueurs : voleur et policier alternent chaque manche (4 manches, ou 2 en rapide), 6 à 9 ventouses. Seul le policier gagne des points : proche +1, direct +2, menottes +4, double verrou +6. Un Takedown capture immédiatement la manche. Le plus de points gagne.",
  reach: "Lancez les ventouses sur une surface verticale lisse. Le meilleur lancer atteint la hauteur la plus élevée. Le nombre total de ventouses collées départage les égalités. Classement et passages : adaptation MSS, sans barème officiel TOSSIT.",
  rainbow: "Créez un anneau, un motif coloré ou une tour de ventouses. En défi MSS, chaque couleur distincte ou niveau empilé rapporte 1 point, plus 3 pour un motif réussi. 3 ou 5 passages par joueur : ce barème n'est pas officiel TOSSIT.",
  chores: "Visez les cases de corvées sur le poster. Une cible valide attribue une tâche ; Free Day efface les corvées du bénéficiaire, Kiss et Double Trouble annulent une tâche, Jumpover en attribue deux. La session se termine après 3 ou 5 passages par joueur : format MSS, sans classement ni punition obligatoire.",
  bottle: "Placez une bouteille vide au milieu d'une table. Chaque joueur lance ses ventouses en visant le plus près ou directement sur la bouteille. Variante familiale MSS sans alcool : +1 pour le plus proche et +3 par ventouse sur la bouteille ; le meilleur score après 3 ou 5 manches gagne.",
};
// FR/EN text for new TOSSIT modes; official names remain unchanged.
const newModeEnglish: Partial<Record<TossitMode, { description: string; help: string }>> = {
  thief_cop: { description: "Alternate Thief/Cop roles for four rounds (two quick). Only the Cop earns points for arrests; takedown secures a round.", help: "2 players, 6 to 9 darts. Close arrest +1, direct arrest +2, Handcuff +4, Double Lock +6. Takedown secures that round immediately. Only the Cop scores, then players switch roles. Highest total after 4 rounds wins (2 quick)." },
  reach: { description: "Reach the highest point on a smooth vertical surface. MSS challenge ranking uses height and stuck darts.", help: "Throw at a smooth vertical surface. Record the highest stuck dart in cm; total stuck darts break height ties. Three or five turns per player. Competition format is an MSS adaptation, not an official TOSSIT score." },
  rainbow: { description: "Build colourful rings, creative shapes and dart towers, with an optional MSS challenge format.", help: "Create a colourful ring, shape or stacked tower. MSS scores 1 per distinct colour or stack level, plus 3 for a completed creation. Three or five turns per player. This is an MSS creative scoring format, not official TOSSIT points." },
  chores: { description: "Hit household chore targets and assign tasks. Free Day and special moves cancel tasks. MSS 3/5-turn family session, no competitive winner.", help: "Choose each dart's target and who receives the task. Free Day clears the recipient's chores; Kiss or Double Trouble cancels the most recent chore; Jumpover assigns two. The official poster has additional physical positioning rules. MSS tracks tasks, not points." },
  bottle: { description: "Family-friendly target challenge around a bottle. Closest dart +1, each dart stuck to the bottle +3 (MSS rules, no drinking).", help: "Place an empty bottle on a stable table, toss darts and score the result manually. The published party mode uses drinking penalties; MSS provides an alcohol-free adaptation with +1 for the closest stuck dart and +3 per dart on the bottle. Highest points after 3/5 rounds wins." },
};
function useCopy() {
  const { lang } = useLang();
  const english = String(lang || "fr").toLowerCase().split("-")[0] !== "fr";
  return (fr: string, en: string) => english ? en : fr;
}
function Header({ title, mode, onBack }: { title: string; mode: TossitMode | "games"; onBack: () => void }) {
  const { theme } = useTheme();
  const tr = useCopy();
  const { lang } = useLang();
  return <div style={{ position: "relative", marginBottom: 14 }}>
    <img className="tossit-header-img" src={tickerForTossit(mode, lang)} alt={`TOSSIT • ${title}`} style={{ width: "100%", height: "clamp(90px,23vw,140px)", objectFit: "cover", borderRadius: 15, display: "block", border: `1px solid ${theme.borderSoft || "#ffffff33"}` }} />
    <div style={{ position: "absolute", top: 7, left: 7 }}><BackDot onClick={onBack} color={ACCENT} /></div>
    <div style={{ position: "absolute", top: 7, right: 7 }}><InfoDot color={ACCENT} title="Règles TOSSIT" content={<div style={{ lineHeight: 1.6 }}><strong>{title}</strong><p>{mode === "games" ? "TOSSIT : des fléchettes à ventouse lancées sur une surface lisse, autour du cochonnet ou d'un objectif." : tr(tinfo[mode], newModeEnglish[mode]?.help || tinfo[mode])}</p><a href={rulesUrl} target="_blank" rel="noreferrer">Règlement officiel TOSSIT</a></div>} /></div>
  </div>;
}
function Layout({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { theme } = useTheme();
  const wide = className.includes("tossit-play-page");
  return <main className={`tossit-page ${className}`} style={{ minHeight: "100vh", width: "100%", boxSizing: "border-box", background: theme.bg, color: theme.text, padding: "12px 14px calc(110px + env(safe-area-inset-bottom, 0px))", maxWidth: wide ? 1180 : 950, margin: "0 auto" }}>{children}</main>;
}
const panel: React.CSSProperties = { padding: 15, background: "rgba(18,30,39,.88)", border: "1px solid rgba(110,229,215,.22)", borderRadius: 17, marginBottom: 13 };
const button: React.CSSProperties = { color: "#07151B", background: ACCENT, border: "none", borderRadius: 10, fontWeight: 900, padding: "12px 16px", cursor: "pointer", minHeight: 44 };
const secondary: React.CSSProperties = { ...button, color: "#E1FDF5", background: "rgba(83,111,118,.3)", border: "1px solid rgba(145,231,213,.26)" };
const input: React.CSSProperties = { minHeight: 44, fontSize: 16, minWidth: 0, borderRadius: 10, border: "1px solid #547C7B", background: "#0F2026", color: "#FFF", padding: "10px 12px", width: "100%", boxSizing: "border-box" };
function MenuDecorCard() {
  return <section className="tossit-decor-card" aria-hidden="true" style={{ ...panel, padding: 0, overflow: "hidden", background: "linear-gradient(180deg, rgba(255,224,55,.08), rgba(14,24,29,.92))" }}>
    <img src={menuDecor} alt="" style={{ display: "block", width: "100%", height: "auto", objectFit: "cover" }} />
  </section>;
}
function tossitProgress(state: TossitState, tr: (fr: string, en: string) => string): string {
  if (state.finished) return tr("PARTIE TERMINÉE", "GAME FINISHED");
  const n = state.events.length + 1;
  const first = tr("MANCHE", "ROUND");
  if (state.mode === "tictac") return `${tr("TOUR", "TURN")} ${n} • ${state.gridSize}×${state.gridSize} • ${tr("ALIGNER", "CONNECT")} ${state.gridSize - 1}`;
  if (["reach", "rainbow", "chores"].includes(state.mode)) {
    const pass = Math.floor(state.events.length / Math.max(state.players.length, 1)) + 1;
    return `${tr("PASSAGE", "TURN")} ${pass}/${state.victoryTarget}`;
  }
  if (["thief_cop", "bottle"].includes(state.mode)) return `${first} ${n}/${state.victoryTarget}`;
  if (["battle", "conquest"].includes(state.mode)) return `${first} ${n} • ${tr("PREMIER À", "FIRST TO")} ${state.victoryTarget} ${tr("MANCHES", "ROUNDS")}`;
  if (state.mode === "sniper") return `${tr("ESSAI", "ATTEMPT")} ${n} • ${tr("VICTOIRE IMMÉDIATE", "INSTANT WIN")}`;
  const target = TOSSIT_MODES.find(mode => mode.id === state.mode)?.target || 0;
  return `${["target", "duel", "goalkeeper", "football_pitch"].includes(state.mode) ? tr("TOUR", "TURN") : first} ${n}${target ? ` • ${tr("CIBLE", "TARGET")} ${target}` : ""}`;
}

type TossitQuickOption<T extends string | number> = { value: T; label: string };
function TossitQuickChoices<T extends string | number>({ value, options, onChange, label, columns = 3 }: {
  value: T;
  options: ReadonlyArray<TossitQuickOption<T>>;
  onChange: (value: T) => void;
  label: string;
  columns?: number;
}) {
  return <div className="tossit-quick-choices" role="group" aria-label={label}
    style={{ "--tossit-quick-columns": columns } as React.CSSProperties}>
    {options.map(option => <button key={String(option.value)} type="button" className="tossit-quick-choice"
      aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}


function TossitCountChoices({ value, max, label, onChange, from = 0, columns = 4 }: {
  value: number; max: number; label: string; onChange: (value: number) => void; from?: number; columns?: number;
}) {
  return <TossitQuickChoices<number> value={value} label={label} onChange={onChange} columns={columns}
    options={Array.from({ length: Math.max(0, max - from + 1) }, (_, i) => ({ value: from + i, label: String(from + i) }))}/>;
}
function TossitEntrySummary({ children }: { children: React.ReactNode }) {
  return <div className="tossit-entry-summary" role="status" aria-live="polite">{children}</div>;
}

function ScoreCards({ state }: { state: TossitState }) {
  return <div className="tossit-score-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(126px,1fr))", gap: 8, margin: "12px 0" }}>
    {state.players.map((p, index) => <div key={p.id} className="tossit-score-card" style={{ ...panel, border: state.winnerId === p.id ? `2px solid ${ACCENT}` : ["target", "duel", "tictac", "reach", "rainbow", "chores"].includes(state.mode) && index === state.nextPlayerIndex && !state.finished ? `2px solid ${ACCENT}` : "1px solid #45606B", textAlign: "center", margin: 0 }}>
      <div style={{ fontSize: 12, opacity: .8 }}>{p.name}</div><div style={{ fontSize: 38, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{state.scores[p.id] ?? 0}{state.mode === "reach" ? <span style={{ fontSize: 15, marginLeft: 4 }}>cm</span> : null}{state.mode === "chores" ? <span style={{ fontSize: 11, marginLeft: 4 }}>tâches</span> : null}</div>{state.winnerId === p.id ? <strong style={{ color: ACCENT }}>GAGNANT</strong> : null}
    </div>)}
  </div>;
}
export function TossitMenu({ go }: { go: (route: any, params?: any) => void }) {
  const tr = useCopy();
  const { lang } = useLang();
  const [draft] = React.useState<TossitState | null>(readDraft);
  const [query, setQuery] = React.useState("");
  const filteredModes = React.useMemo(() => {
    const term = query.toLocaleLowerCase().trim();
    return term ? TOSSIT_MODES.filter(m => `${m.title} ${m.category} ${m.description} ${newModeEnglish[m.id]?.description || ""}`.toLocaleLowerCase().includes(term)) : TOSSIT_MODES;
  }, [query]);
  return <Layout className="tossit-menu-page"><Header title="GAMES" mode="games" onBack={() => go("gameSelect")} />
    <PageAdBanner placement="games" slotKey="page-games-tossit-under-header" />
    {draft && <section style={{ ...panel, border: "1px solid #48E7CF" }}>
      <strong>{tr("Partie TOSSIT interrompue", "Interrupted TOSSIT match")}</strong>
      <p style={{ opacity: .8, fontSize: 13 }}>{TOSSIT_MODES.find((m) => m.id === draft.mode)?.title} · {draft.players.map((p) => p.name).join(" / ")} · {draft.events.length} {tr("tours validés", "confirmed turns")}</p>
      <button style={button} onClick={() => go("tossit_play", { mode: draft.mode, resume: true })}>{tr("REPRENDRE LA PARTIE", "RESUME MATCH")}</button>
      <p style={{ opacity: .65, fontSize: 11 }}>{tr("Brouillon conservé uniquement sur cet appareil.", "Draft stored on this device only.")}</p>
    </section>}
    <h2 style={{ margin: "16px 0 5px" }}>{tr("TOSSIT • MODES DE JEU", "TOSSIT • GAME MODES")}</h2>
    <p style={{ opacity: .76 }}>{tr("Les premières variantes sont jouables avec saisie manuelle du résultat des lancers.", "The first modes are playable with manual throw scoring.")}</p>
    <MenuDecorCard />
    <div className="tossit-menu-toolbar" role="search">
      <label htmlFor="tossit-mode-search">{tr("Rechercher un mode", "Find a game mode")}
        <input id="tossit-mode-search" type="search" autoComplete="off" placeholder={tr("Nom, catégorie, règle…", "Name, category, rule…")} value={query} onChange={e => setQuery(e.target.value)} />
      </label>
      <span aria-live="polite">{filteredModes.length} / {TOSSIT_MODES.length} {tr("modes jouables", "playable modes")}</span>
    </div>
    <div className="tossit-mode-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
    {filteredModes.map((mode) => <button key={mode.id} className="tossit-mode-tile" type="button" style={{ ...panel, textAlign: "left", color: "white", cursor: "pointer", padding: 0, overflow: "hidden" }} onClick={() => go("tossit_config", { mode: mode.id })}>
      <img src={tickerForTossit(mode.id, lang)} alt="" style={{ display: "block", width: "100%", height: 90, objectFit: "cover" }} />
      <div style={{ padding: 14 }}><strong>{mode.title}</strong><p style={{ opacity: .78, fontSize: 13 }}>{tr(mode.description, newModeEnglish[mode.id]?.description || mode.description)}</p><span style={{ color: ACCENT, fontWeight: 800 }}>{tr("JOUER", "PLAY")} · {mode.id === "sniper" ? tr("victoire immédiate", "instant win") : ["battle", "conquest"].includes(mode.id) ? tr("manches gagnées", "round wins") : mode.id === "thief_cop" ? tr("arrestations", "arrests") : mode.id === "reach" ? tr("record en cm", "height record") : mode.id === "rainbow" ? tr("défi créatif MSS", "MSS creative challenge") : mode.id === "chores" ? tr("tâches à attribuer", "assign chores") : mode.id === "bottle" ? tr("défi sans alcool", "alcohol-free challenge") : mode.target ? `${mode.target} pts` : tr("alignement", "line game")}</span></div>
    </button>)}
    </div>
    {filteredModes.length === 0 && <p role="status">{tr("Aucun mode ne correspond à la recherche.", "No game modes match your search.")}</p>}
    <h3 style={{ marginTop: 20 }}>{tr("AU CATALOGUE • EN PRÉPARATION", "CATALOGUE • IN DEVELOPMENT")}</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
      {TOSSIT_PLANNED.map((mode) => <div key={mode.title} style={{ ...panel, opacity: .76 }}><strong>{mode.title}</strong><small style={{ float: "right", color: ACCENT }}>SOON</small><p style={{ fontSize: 13 }}>{mode.description}</p></div>)}
    </div>
    <button style={secondary} onClick={() => go("tossit_stats")}>{tr("Historique & statistiques TOSSIT", "TOSSIT history & statistics")}</button>
    
  </Layout>;
}

export function TossitConfig({ go, store, params }: { go: (route: any, params?: any) => void; store?: any; params?: any }) {
  const tr = useCopy();
  const mode: TossitMode = TOSSIT_MODES.some((x) => x.id === params?.mode) ? params.mode : "classic";
  const meta = TOSSIT_MODES.find((x) => x.id === mode)!;
  const profiles: any[] = (Array.isArray(store?.profiles) ? store.profiles : []).filter((x: any) => x && !x.isBot);
  const defaultPlayers = () => Array.from({ length: ["target", "reach", "rainbow", "chores"].includes(mode) ? 1 : 2 }, (_, index) => {
    const p = profiles[index];
    return { id: p?.id ? String(p.id) : `tossit-guest-${index + 1}`, name: String(p?.nickname || p?.displayName || p?.name || `${tr("Joueur", "Player")} ${index + 1}`) };
  });
  const [players, setPlayers] = React.useState<TossitPlayer[]>(defaultPlayers);
  const [darts, setDarts] = React.useState(["duel", "river", "football_pitch", "thief_cop"].includes(mode) ? 6 : 3);
  const [gridSize, setGridSize] = React.useState<4 | 5>(4);
  const [victoryTarget, setVictoryTarget] = React.useState(["conquest", "bottle"].includes(mode) ? 5 : mode === "thief_cop" ? 4 : 3);
  const maxPlayers = (["speed", "duel", "border", "tictac", "battle", "conquest", "river", "cornhole", "goalkeeper", "football_pitch", "thief_cop"].includes(mode)) ? 2 : mode === "target" ? 4 : mode === "chores" ? 4 : 6;
  const addPlayer = () => setPlayers((current) => {
    if (current.length >= maxPlayers) return current;
    let guestNumber = 1;
    while (current.some((player) => player.id === `tossit-guest-${guestNumber}`)) guestNumber++;
    return [...current, { id: `tossit-guest-${guestNumber}`, name: `${tr("Joueur", "Player")} ${current.length + 1}` }];
  });
  return <Layout className="tossit-config-page"><Header title={meta.title} mode={mode} onBack={() => go("games")} />
    <div style={panel}><h2 style={{ margin: "0 0 8px" }}>{meta.title}</h2><p>{tr(meta.description, newModeEnglish[mode]?.description || meta.description)}</p><p style={{ fontSize: 13, opacity: .8 }}>{tr(tinfo[mode], newModeEnglish[mode]?.help || tinfo[mode])}</p></div>
    <MenuDecorCard />
    {["river", "cornhole"].includes(mode) && <p style={{ opacity: .75, fontSize: 13 }}>{tr("Saisissez les noms des deux camps (joueurs ou équipes de deux). Les scores des équipes sont cumulés.", "Name the two sides (players or two-person teams). Team scores are pooled.")}</p>}
    <section style={panel}><h3>{tr("Participants", "Players")} ({players.length})</h3>
      {players.map((p, index) => <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span style={{ minWidth: 22, color: ACCENT }}>{index + 1}</span>
        <input aria-label={`${tr("Joueur", "Player")} ${index + 1}`} value={p.name} style={input} onChange={(e) => setPlayers((v) => v.map((x, n) => n === index ? { ...x, name: e.target.value } : x))} />
        {players.length > (["target", "reach", "rainbow", "chores"].includes(mode) ? 1 : 2) && <button type="button" aria-label="Retirer le joueur" style={secondary} onClick={() => setPlayers((v) => v.filter((_, n) => n !== index))}>×</button>}
      </div>)}
      {players.length < maxPlayers && <button style={secondary} onClick={addPlayer}>+ {tr("Ajouter un joueur", "Add a player")}</button>}
      {profiles.length > 0 && <p style={{ fontSize: 12, opacity: .7 }}>{tr("Les profils existants sont proposés par défaut. Modifier leur nom conserve leur identifiant de profil.", "Existing profiles are preselected. Editing a name retains its profile ID.")}</p>}
    </section>
    {mode !== "tictac" && <section className="tossit-mode-panel" style={panel}><h3>{tr("Ventouses par joueur", "Darts per player")}</h3><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(mode === "duel" || mode === "football_pitch" ? [6] : ["river", "thief_cop"].includes(mode) ? [6, 7, 8, 9] : ["cornhole", "goalkeeper", "chores"].includes(mode) ? [3] : [3, 4, 5, 6]).map((n) => <button key={n} type="button" style={n === darts ? button : secondary} onClick={() => setDarts(n)}>{n}</button>)}</div>{mode === "duel" && <p style={{ fontSize: 12, opacity: .75 }}>{tr("6 colorées + le cochonnet noir en dernier", "6 coloured darts + black jack last")}</p>}</section>}
    {mode === "tictac" && <section className="tossit-mode-panel" style={panel}><h3>{tr("Taille de la grille", "Grid size")}</h3><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{([4, 5] as const).map((n) => <button key={n} type="button" style={gridSize === n ? button : secondary} onClick={() => setGridSize(n)}>{n} × {n} · {tr("aligner", "connect")} {n - 1}</button>)}</div></section>}
    {(["battle", "conquest"].includes(mode)) && <section className="tossit-mode-panel" style={panel}><h3>{tr("Format de match MSS", "MSS match format")}</h3><p style={{ opacity: .75, fontSize: 13 }}>{tr("Le nombre de manches nécessaires est une option MULTISPORTS SCORING, pas une règle officielle TOSSIT.", "The round-win goal is an MSS option, not an official TOSSIT rule.")}</p><div style={{ display: "flex", gap: 8 }}>{[3, 5, 7].map((n) => <button key={n} type="button" style={victoryTarget === n ? button : secondary} onClick={() => setVictoryTarget(n)}>{n} {tr("manches", "rounds")}</button>)}</div></section>}
    {mode === "thief_cop" && <section className="tossit-mode-panel" style={panel}><h3>{tr("Nombre de manches", "Match rounds")}</h3><div style={{ display: "flex", gap: 8 }}>{[2, 4].map(n => <button key={n} style={victoryTarget === n ? button : secondary} type="button" onClick={() => setVictoryTarget(n)}>{n} {tr("manches", "rounds")}</button>)}</div><p style={{ fontSize: 12, opacity: .75 }}>{tr("Les rôles voleur/policier alternent automatiquement à chaque manche.", "Thief/Cop roles automatically alternate each round.")}</p></section>}
    {(["reach", "rainbow", "chores", "bottle"].includes(mode)) && <section className="tossit-mode-panel" style={panel}><h3>{tr("Passages par joueur (format MSS)", "Turns per player (MSS format)")}</h3><div style={{ display: "flex", gap: 8 }}>{[3, 5].map(n => <button key={n} type="button" style={victoryTarget === n ? button : secondary} onClick={() => setVictoryTarget(n)}>{n} {tr("passages", "turns")}</button>)}</div></section>}
    <button style={{ ...button, width: "100%" }} disabled={players.some((p) => !p.name.trim())} onClick={() => go("tossit_play", { mode, players: players.map((p) => ({ ...p, name: p.name.trim() })), darts, gridSize, victoryTarget })}>{tr("LANCER LA PARTIE", "START GAME")}</button>
  </Layout>;
}

export function TossitPlay({ go, params, onFinish }: { go: (route: any, params?: any) => void; params?: any; onFinish?: (match: any) => void }) {
  const tr = useCopy();
  const resumeState = React.useMemo(() => params?.resume ? readDraft() : null, [params?.resume]);
  const mode: TossitMode = resumeState?.mode ?? (TOSSIT_MODES.some((x) => x.id === params?.mode) ? params.mode : "classic");
  const players: TossitPlayer[] = resumeState?.players ?? (Array.isArray(params?.players) && params.players.length ? params.players : [{ id: "tossit-guest-1", name: "Joueur 1" }, { id: "tossit-guest-2", name: "Joueur 2" }]);
  const [state, setState] = React.useState<TossitState>(() => resumeState ?? newTossitGame(mode, players, Number(params?.darts) || 3, Date.now(), params?.gridSize === 5 ? 5 : 4, Number(params?.victoryTarget) || undefined));
  const [error, setError] = React.useState("");
  const [roundWinner, setRoundWinner] = React.useState(players[0]?.id || "");
  const [closestDarts, setClosestDarts] = React.useState(1);
  const [kiss, setKiss] = React.useState(0);
  const [frenchKiss, setFrenchKiss] = React.useState(0);
  const [jackiss, setJackiss] = React.useState(false);
  const [jackissExtra, setJackissExtra] = React.useState(0);
  const [jumpover, setJumpover] = React.useState(false);
  const [jackover, setJackover] = React.useState(false);
  const [stuck, setStuck] = React.useState<Record<string, number>>({});
  const [speedKiss, setSpeedKiss] = React.useState<Record<string, number>>({});
  const [speedJumpoverWinner, setSpeedJumpoverWinner] = React.useState("");
  const [hits, setHits] = React.useState<number[]>([]);
  const [tictacSelection, setTictacSelection] = React.useState<number | "miss" | null>(null);
  const [duelStuck, setDuelStuck] = React.useState(0);
  const [duelJack, setDuelJack] = React.useState(false);
  const [duelKiss, setDuelKiss] = React.useState(0);
  const [duelJump, setDuelJump] = React.useState(0);
  const [battleStuck, setBattleStuck] = React.useState<Record<string, number>>({});
  const [battleTieWinner, setBattleTieWinner] = React.useState("");
  const [battleJack, setBattleJack] = React.useState(false);
  const [battleClosest, setBattleClosest] = React.useState("");
  const [sniperOutcome, setSniperOutcome] = React.useState<"miss" | "mega" | "ultimate">("miss");
  const [sniperWinner, setSniperWinner] = React.useState("");
  const [conquestColor, setConquestColor] = React.useState<string>("Rouge");
  const [conquestRequired, setConquestRequired] = React.useState(3);
  const [conquestStuck, setConquestStuck] = React.useState<Record<string, number>>({});
  const [conquestFirst, setConquestFirst] = React.useState("");
  const [riverLandings, setRiverLandings] = React.useState<RiverLanding[]>(() => Array.from({ length: state.dartsPerPlayer }, (): RiverLanding => ({ kind: "miss", points: 0 })));
  const [riverKiss, setRiverKiss] = React.useState(0);
  const [riverJump, setRiverJump] = React.useState(false);
  const [cornThrows, setCornThrows] = React.useState<Record<string, CornholeLanding[]>>(() => Object.fromEntries(players.map(p => [p.id, ["miss", "miss", "miss"] as CornholeLanding[]])));
  const [cornKiss, setCornKiss] = React.useState<Record<string, number>>({});
  const [cornJump, setCornJump] = React.useState<Record<string, number>>({});
  const [goalZones, setGoalZones] = React.useState<number[]>([0, 0, 0]);
  const [pitchOutcome, setPitchOutcome] = React.useState<"centre" | "linked" | "longpass" | "goal" | "block" | "miss">("miss");
  const [captures, setCaptures] = React.useState<ThiefCopCapture[]>(() => Array(state.dartsPerPlayer).fill("miss"));
  const [reachCm, setReachCm] = React.useState("0");
  const [reachStuck, setReachStuck] = React.useState(0);
  const [rainbowPattern, setRainbowPattern] = React.useState<"ring" | "shape" | "stack">("ring");
  const [rainbowColors, setRainbowColors] = React.useState(0);
  const [rainbowStack, setRainbowStack] = React.useState(0);
  const [rainbowCompleted, setRainbowCompleted] = React.useState(false);
  const [choreThrows, setChoreThrows] = React.useState<ChoreThrow[]>(() => Array.from({ length: state.dartsPerPlayer }, () => ({ effect: "miss", recipientId: players[1]?.id ?? players[0]?.id, chore: TOSSIT_CHORES[0].id })));
  const [bottleStuck, setBottleStuck] = React.useState<Record<string, number>>({});
  const [bottleOn, setBottleOn] = React.useState<Record<string, number>>({});
  const [bottleClosest, setBottleClosest] = React.useState("");
  type BorderDart = { kind: "miss" | "wrong" | "valid"; cm: string };
  const [borderDarts, setBorderDarts] = React.useState<Record<string, BorderDart[]>>(() => Object.fromEntries(players.map((p) => [p.id, Array.from({ length: state.dartsPerPlayer }, () => ({ kind: "miss", cm: "" }))])));
  const saved = React.useRef(false);
  // Ignore double taps after a successful validation (no timer, no hidden navigation).
  const lastCommitAt = React.useRef(0);
  const meta = TOSSIT_MODES.find((x) => x.id === mode)!;

  React.useEffect(() => { writeDraft(state); }, [state]);

  React.useEffect(() => {
    if (!state.finished || saved.current) return;
    saved.current = true;
    const end = Date.now();
    const match = {
      id: `tossit-${state.createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "tossit", sport: "tossit", mode, status: "finished", winnerId: state.winnerId,
      players: state.players, createdAt: state.createdAt, updatedAt: end, finishedAt: end,
      summary: summaryForTossit(state),
      payload: { sport: "tossit", mode, dartsPerPlayer: state.dartsPerPlayer, players: state.players, events: state.events, scores: state.scores, winnerId: state.winnerId },
    };
    onFinish?.(match);
  }, [state, mode, onFinish]);
  const commit = (action: Parameters<typeof applyTossitAction>[1]): boolean => {
    // Prevent a double tap from recording the same physical throw twice.
    if (Date.now() - lastCommitAt.current < 550) return false;
    try {
      // Validate before scheduling React state updates: exceptions inside an
      // updater run during rendering and would bypass this error boundary.
      const next = applyTossitAction(state, action);
      lastCommitAt.current = Date.now();
      setState(next);
      setError("");
      setHits([]);
      return true;
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      return false;
    }
  };
  const targetActive = state.players[state.nextPlayerIndex];
  const pitchOptions: Array<TossitQuickOption<typeof pitchOutcome>> = [{ value: "miss", label: tr("Ratée / hors-jeu", "Miss / out") }];
  if (targetActive.id === state.pitch.attackerId) {
    if (!state.pitch.chainLength) pitchOptions.push({ value: "centre", label: tr("Centre · départ", "Centre · start") });
    else {
      pitchOptions.push({ value: "linked", label: tr("Ventouse reliée", "Linked dart") });
      if (!state.pitch.longPassUsed) pitchOptions.push({ value: "longpass", label: tr("Passe longue", "Long pass") });
      pitchOptions.push({ value: "goal", label: tr("BUT !", "GOAL!") });
    }
  } else pitchOptions.push({ value: "block", label: tr("Blocage", "Block") });
  const resetClassic = () => { setClosestDarts(1); setKiss(0); setFrenchKiss(0); setJackiss(false); setJackissExtra(0); setJumpover(false); setJackover(false); };
  const borderPreview = previewBorderRound(state.players, borderDarts, state.dartsPerPlayer);
  const thiefPreview = previewThiefRound(captures);
  const chorePreview = previewChoreRound(state.players, state.chores, choreThrows, TOSSIT_CHORES.map(chore => chore.id));
  const submitBorder = () => {
    if (!borderPreview.ready) {
      setError(tr("Saisissez une distance valide en cm pour chaque ventouse valide.", "Enter a valid distance in cm for every valid dart."));
      return;
    }
    if (commit({ kind: "border", valid: borderPreview.valid, wrongSide: borderPreview.wrongSide })) {
      setBorderDarts(Object.fromEntries(state.players.map((p) => [p.id, Array.from({ length: state.dartsPerPlayer }, () => ({ kind: "miss", cm: "" }))])));
    }
  };
  return <Layout className="tossit-play-page"><Header title={meta.title} mode={mode} onBack={() => go("tossit_config", { mode })} />
    <div className="tossit-play-grid">
    <aside className="tossit-play-sidebar" aria-label={tr("Score de la partie", "Match scoreboard")}>
    <div className="tossit-round-label" role="status" style={{ textAlign: "center", fontSize: 12, color: ACCENT, letterSpacing: 1, fontWeight: 700 }}>{tossitProgress(state, tr)}</div>
    <ScoreCards state={state} />
    </aside>
    <div className="tossit-play-main">
    {(["battle", "conquest"].includes(mode)) && <p style={{ textAlign: "center", fontSize: 12, opacity: .75, marginTop: -6 }}>{tr("Scores = manches gagnées, pas des points de fléchettes.", "Scores = rounds won, not dart points.")}</p>}
    {state.finished ? <section style={{ ...panel, textAlign: "center", border: `2px solid ${ACCENT}` }}><h2>{state.winnerId ? `🏆 ${state.players.find((p) => p.id === state.winnerId)?.name}` : mode === "chores" ? tr("SESSION TERMINÉE", "SESSION COMPLETE") : tr("MATCH NUL", "DRAW")}</h2><p>{tr("Résultat transmis à l'historique.", "Result sent to history.")}</p><div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}><button style={button} onClick={() => go("tossit_stats")}>{tr("Historique & stats", "History & stats")}</button><button style={secondary} onClick={() => go("games")}>{tr("Autre partie", "New game")}</button></div></section> : <>
      {mode === "classic" && <section className="tossit-mode-panel" style={panel}>
        <h3 style={{ marginTop: 0 }}>{tr("Résultat de la manche", "Round result")}</h3>
        <div className="tossit-entry-field"><strong>{tr("Joueur le plus proche", "Closest player")}</strong>
          <TossitQuickChoices value={roundWinner} label={tr("Joueur le plus proche", "Closest player")}
            options={players.map(p => ({ value: p.id, label: p.name }))} onChange={setRoundWinner} columns={Math.min(players.length, 3)} />
        </div>
        <div className="tossit-entry-field"><strong>{tr("Ventouses collées par le vainqueur", "Stuck darts for round winner")}</strong>
          <TossitQuickChoices value={closestDarts} label={tr("Ventouses collées", "Stuck darts")}
            options={Array.from({ length: state.dartsPerPlayer + 1 }, (_, value) => ({ value, label: String(value) }))} onChange={setClosestDarts} columns={4}/>
        </div>
        <div className="tossit-classic-bonus-grid">
          <div className="tossit-entry-field"><strong>Kiss (+2)</strong><TossitQuickChoices value={kiss} label="Kiss"
            options={Array.from({ length: state.dartsPerPlayer + 1 }, (_, value) => ({ value, label: String(value) }))} onChange={setKiss} columns={4}/></div>
          <div className="tossit-entry-field"><strong>French Kiss (+3)</strong><TossitQuickChoices value={frenchKiss} label="French Kiss"
            options={Array.from({ length: state.dartsPerPlayer + 1 }, (_, value) => ({ value, label: String(value) }))} onChange={setFrenchKiss} columns={4}/></div>
          {jackiss && <div className="tossit-entry-field"><strong>{tr("Jackiss supplémentaires", "Extra Jackiss points")}</strong>
            <TossitQuickChoices value={jackissExtra} label={tr("Points supplémentaires Jackiss", "Extra Jackiss points")}
              options={Array.from({ length: state.dartsPerPlayer + 1 }, (_, value) => ({ value, label: String(value) }))} onChange={setJackissExtra} columns={4}/></div>}
        </div>
        <div className="tossit-bonus-options" style={{ display: "grid", gap: 8, margin: "12px 0" }}>
          <label><input type="checkbox" checked={jackiss} onChange={(e) => setJackiss(e.target.checked)} /> Jackiss (+3 + extras)</label>
          <label><input type="checkbox" checked={jumpover} onChange={(e) => setJumpover(e.target.checked)} /> Jumpover (+9 et scores adverses remis à zéro)</label>
          <label><input type="checkbox" checked={jackover} onChange={(e) => setJackover(e.target.checked)} /> Jackover (victoire immédiate)</label>
        </div>
        <strong style={{ color: ACCENT, display: "block", marginBottom: 10 }}>+{closestDarts + kiss * 2 + frenchKiss * 3 + (jackiss ? 3 + jackissExtra : 0) + (jumpover ? 9 : 0)} points</strong>
        <button className="tossit-confirm-button" style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "classic", playerId: roundWinner, closestDarts, kiss, frenchKiss, jackiss, jackissExtra, jumpover, jackover })) resetClassic(); }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "speed" && <section className="tossit-mode-panel" style={panel}>
        <h3>{tr("Lancers simultanés", "Simultaneous throws")}</h3>
        <p className="tossit-assist-text">{tr("Sélectionnez les ventouses collées et les Kiss pour chacun. Les valeurs ne sont enregistrées qu'après validation.", "Choose stuck darts and Kisses for each player. Nothing is recorded until confirmation.")}</p>
        {players.map((p) => <div className="tossit-score-entry-card" key={p.id}>
          <strong>{p.name}</strong>
          <div className="tossit-entry-field"><strong>{tr("Ventouses collées", "Stuck darts")}</strong>
            <TossitCountChoices label={`${p.name} — ${tr("Ventouses collées", "Stuck darts")}`} value={stuck[p.id] ?? 0} max={state.dartsPerPlayer}
              onChange={value => setStuck(old => ({ ...old, [p.id]: value }))}/></div>
          <div className="tossit-entry-field"><strong>Kiss (+1)</strong>
            <TossitCountChoices label={`${p.name} — Kiss`} value={speedKiss[p.id] ?? 0} max={state.dartsPerPlayer}
              onChange={value => setSpeedKiss(old => ({ ...old, [p.id]: value }))}/></div>
          <TossitEntrySummary>{tr("Points provisoires", "Provisional points")}: +{(stuck[p.id] ?? 0) + (speedKiss[p.id] ?? 0)}</TossitEntrySummary>
        </div>)}
        <div className="tossit-entry-field"><strong>Jumpover — {tr("victoire immédiate", "instant win")}</strong>
          <TossitQuickChoices<string> label="Jumpover" value={speedJumpoverWinner} columns={Math.min(players.length + 1, 3)}
            options={[{ value: "", label: tr("Aucun", "None") }, ...players.map(p => ({ value: p.id, label: p.name }))]}
            onChange={setSpeedJumpoverWinner}/></div>
        <TossitEntrySummary>{speedJumpoverWinner ? `${players.find(p => p.id === speedJumpoverWinner)?.name} — Jumpover` : tr("La validation calculera aussi les pénalités en cas de zéro ventouse collée.", "Confirmation also applies penalties for zero stuck darts.")}</TossitEntrySummary>
        <button type="button" className="tossit-confirm-button" style={{ ...button, width: "100%", marginTop: 13 }} onClick={() => { if (commit({ kind: "speed", stuck, kiss: speedKiss, jumpoverWinnerId: speedJumpoverWinner || undefined })) { setStuck({}); setSpeedKiss({}); setSpeedJumpoverWinner(""); } }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "target" && <section className="tossit-mode-panel" style={panel}><h3>{tr("Au tour de", "Now playing")}: {targetActive?.name}</h3><p style={{ opacity: .75 }}>{tr("Touchez la valeur de chaque fléchette. 0 = manquée.", "Select each dart value. 0 = miss.")}</p>
        <div className="tossit-touch-keypad" role="group" aria-label={tr("Valeurs des ventouses", "Dart values")}>{[0, 1, 2, 3].map((v) => <button type="button" key={v} className="tossit-touch-key" style={v === 0 ? secondary : button} aria-label={v === 0 ? tr("Ventouse manquée", "Missed dart") : `${v} ${tr("points", "points")}`} disabled={hits.length >= state.dartsPerPlayer} onClick={() => setHits((old) => old.length < state.dartsPerPlayer ? [...old, v] : old)}>{v}</button>)}</div>
        <p role="status" aria-live="polite" className="tossit-dart-progress">{tr("Ventouses", "Darts")} {hits.length}/{state.dartsPerPlayer} : {hits.length ? `${hits.map(String).join(" + ")} = ${hits.reduce((s, n) => s + n, 0) + (hits.length === state.dartsPerPlayer && hits.every((v) => v > 0) ? 1 : 0)} ${tr("pts", "pts")}` : "—"}</p>
        <div style={{ display: "flex", gap: 8 }}><button style={secondary} onClick={() => setHits((old) => old.slice(0, -1))}>{tr("Effacer", "Backspace")}</button><button className="tossit-confirm-button" style={{ ...button, flex: 1 }} disabled={hits.length !== state.dartsPerPlayer} onClick={() => commit({ kind: "target", hits })}>{tr("VALIDER LA VOLÉE", "CONFIRM THROWS")}</button></div>
      </section>}
      {mode === "duel" && <section className="tossit-mode-panel" style={panel}>
        <h3>{tr("Au tour de", "Now playing")}: {targetActive?.name}</h3>
        <p className="tossit-assist-text">{tr("Lancez les six ventouses colorées, puis le cochonnet noir. Sans cochonnet collé, le tour vaut zéro.", "Throw six coloured darts, followed by the black jack. If the jack does not stick, the turn scores zero.")}</p>
        <div className="tossit-entry-field"><strong>{tr("Ventouses collées", "Stuck darts")}</strong>
          <TossitCountChoices value={duelStuck} max={state.dartsPerPlayer} label={tr("Ventouses collées", "Stuck darts")} onChange={setDuelStuck}/></div>
        <label className="tossit-check-option"><input type="checkbox" checked={duelJack} onChange={e => setDuelJack(e.target.checked)}/>{tr("Cochonnet noir collé", "Black jack stuck")}</label>
        <div className="tossit-entry-field"><strong>Kiss (+1)</strong>
          <TossitCountChoices value={duelKiss} max={state.dartsPerPlayer} label="Kiss" onChange={setDuelKiss}/></div>
        <div className="tossit-entry-field"><strong>Jumpover (+3)</strong>
          <TossitCountChoices value={duelJump} max={state.dartsPerPlayer} label="Jumpover" onChange={setDuelJump}/></div>
        <TossitEntrySummary>{tr("Points du tour", "Turn points")}: +{duelJack ? duelStuck + duelKiss + duelJump * 3 : 0}{!duelJack && ` · ${tr("cochonnet non collé", "black jack not stuck")}`}</TossitEntrySummary>
        <button type="button" className="tossit-confirm-button" style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "duel", stuck: duelStuck, jackStuck: duelJack, kiss: duelKiss, jumpover: duelJump })) { setDuelStuck(0); setDuelJack(false); setDuelKiss(0); setDuelJump(0); } }}>{tr("VALIDER LE TOUR", "CONFIRM TURN")}</button>
      </section>}
      {mode === "border" && <section className="tossit-mode-panel" style={panel}>
        <h3 style={{ marginTop: 0 }}>CROSS THE BORDER</h3>
        <p className="tossit-assist-text">{tr("Pour chaque ventouse : ratée, mauvais côté ou valide. Mesurez en cm seulement les ventouses valides. Les points sont calculés avant validation.", "For each dart: miss, wrong side or valid. Only valid darts need a distance in cm. Points are previewed before confirmation.")}</p>
        {state.players.map(player => <div key={player.id} className="tossit-score-entry-card">
          <strong>{player.name}</strong>
          {(borderDarts[player.id] || []).map((dart, index) => <div key={index} className="tossit-throw-row">
            <strong>{tr("Ventouse", "Dart")} {index + 1}</strong>
            <TossitQuickChoices<BorderDart["kind"]> value={dart.kind} columns={3} label={`${player.name} — ${tr("Ventouse", "Dart")} ${index + 1}`}
              options={[{ value: "miss", label: tr("Ratée", "Miss") }, { value: "wrong", label: tr("Mauvais côté", "Wrong side") }, { value: "valid", label: tr("Valide", "Valid") }]}
              onChange={kind => setBorderDarts(old => ({ ...old, [player.id]: old[player.id].map((d,n) => n === index ? { ...d, kind } : d) }))}/>
            {dart.kind === "valid" && <label className="tossit-border-distance">{tr("Distance à la ligne (cm)", "Distance to line (cm)")}
              <input type="text" inputMode="decimal" autoComplete="off" aria-label={`${tr("Distance", "Distance")} ${player.name} ${index + 1}`}
                placeholder="ex. 2,5" style={input} value={dart.cm}
                onChange={e => setBorderDarts(old => ({ ...old, [player.id]: old[player.id].map((d,n) => n === index ? { ...d, cm: e.target.value } : d) }))}/>
            </label>}
          </div>)}
        </div>)}
        <TossitEntrySummary>
          <strong>{tr("Aperçu avant validation", "Preview before confirmation")}</strong>
          {state.players.map(player => <span key={player.id} className="tossit-preview-line">
            {player.name} : <b>+{borderPreview.ready ? borderPreview.gain[player.id] : "—"}</b> {tr("point(s)", "point(s)")}
            <small>· {borderPreview.wrongSide[player.id] || 0} {tr("mauvais côté", "wrong side")}</small>
          </span>)}
          {!borderPreview.ready && <span role="status">{tr("Renseignez les distances des ventouses valides.", "Enter distances for all valid darts.")}</span>}
        </TossitEntrySummary>
        <button type="button" className="tossit-confirm-button" style={{ ...button, width: "100%" }} disabled={!borderPreview.ready} onClick={submitBorder}>{tr("CALCULER & VALIDER LA MANCHE", "SCORE ROUND")}</button>
      </section>}
      {mode === "tictac" && <section className="tossit-mode-panel" style={panel}>
        <h3 style={{ marginTop: 0 }}>{tr("Au tour de", "Now playing")}: {targetActive?.name}</h3>
        <p style={{ opacity: .75 }}>{tr("Sélectionnez la case atteinte (même occupée) ou un raté, puis confirmez : un premier toucher ne valide plus le tour.", "Select the hit cell (even if occupied) or a miss, then confirm. The first tap does not submit the turn.")}</p>
        <div role="group" aria-label="Tic Tac TOSSIT" style={{ display: "grid", gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))`, gap: 6, margin: "14px auto", maxWidth: 430 }}>
          {state.board.map((cell, index) => <button type="button" key={index} className="tossit-tictac-cell" aria-pressed={tictacSelection === index} aria-label={`${tr("Case", "Cell")} ${index + 1}${cell ? ` ${state.players.find((p) => p.id === cell)?.name}` : ""}`} style={{ ...secondary, minWidth: 0, aspectRatio: "1", padding: 0, fontSize: "clamp(16px,5vw,30px)", fontWeight: 900, borderColor: cell ? (cell === state.players[0].id ? "#43E5EE" : "#FF67C9") : "#45606B", background: cell ? (cell === state.players[0].id ? "#0F505B" : "#5A204C") : "#0B252D" }} onClick={() => setTictacSelection(tictacSelection === index ? null : index)}>{cell ? (cell === state.players[0].id ? "●" : "✦") : "·"}</button>)}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}><span style={{ color: "#43E5EE" }}>● {state.players[0]?.name}</span><span style={{ color: "#FF67C9" }}>✦ {state.players[1]?.name}</span><span style={{ opacity: .65 }}>{tr("Aligner", "Connect")} {state.gridSize - 1}</span></div>
        <div className="tossit-tictac-actions">
          <button type="button" aria-pressed={tictacSelection === "miss"} className="tossit-tictac-miss" style={secondary} onClick={() => setTictacSelection(tictacSelection === "miss" ? null : "miss")}>{tr("VENTOUSE MANQUÉE", "MISSED DART")}</button>
          <button type="button" className="tossit-confirm-button" style={button} disabled={tictacSelection === null} onClick={() => { if (tictacSelection !== null && commit({ kind: "tictac", cell: tictacSelection === "miss" ? null : tictacSelection })) setTictacSelection(null); }}>{tr("CONFIRMER LE TOUR", "CONFIRM TURN")}</button>
        </div>
        <p className="tossit-selection-feedback" role="status" aria-live="polite">{tictacSelection === null ? tr("Choisissez d’abord une case ou un raté.", "First choose a cell or a miss.") : tictacSelection === "miss" ? tr("Raté sélectionné — à confirmer", "Miss selected — confirm to record") : `${tr("Case", "Cell")} ${tictacSelection + 1} ${tr("sélectionnée — à confirmer", "selected — confirm to record")}`}</p>
      </section>}
      {mode === "battle" && <section className="tossit-mode-panel" style={panel}>
        <h3>⚔️ BATTLE MODE</h3>
        <p className="tossit-assist-text">{tr("Comptez les ventouses collées de chaque joueur. Le meilleur total désigne qui lance la noire ; une égalité se départage avec pierre-feuille-ciseaux.", "Count each player's stuck darts. The highest count throws the black jack; settle ties with rock-paper-scissors.")}</p>
        {players.map(p => <div className="tossit-entry-field" key={p.id}><strong>{p.name} · {tr("ventouses collées", "stuck darts")}</strong>
          <TossitCountChoices value={battleStuck[p.id] ?? 0} max={state.dartsPerPlayer} label={`${p.name} · ${tr("ventouses collées", "stuck darts")}`}
            onChange={value => { setBattleStuck(old => ({ ...old, [p.id]: value })); setBattleClosest(""); setBattleTieWinner(""); }}/></div>)}
        {(battleStuck[players[0].id] ?? 0) === (battleStuck[players[1].id] ?? 0) && <div className="tossit-entry-field">
          <strong>{tr("Gagnant pierre-feuille-ciseaux", "Rock-paper-scissors winner")}</strong>
          <TossitQuickChoices<string> value={battleTieWinner} label={tr("Gagnant du départage", "Tiebreak winner")} columns={2}
            options={players.map(p => ({ value: p.id, label: p.name }))} onChange={setBattleTieWinner}/></div>}
        <TossitEntrySummary>{tr("Lance la noire", "Throws black jack")}: {(() => { const [a, b] = players; const sa = battleStuck[a.id] ?? 0, sb = battleStuck[b.id] ?? 0; return sa === sb ? (players.find(p => p.id === battleTieWinner)?.name || "—") : (sa > sb ? a : b).name; })()}</TossitEntrySummary>
        <label className="tossit-check-option"><input type="checkbox" checked={battleJack} onChange={e => { setBattleJack(e.target.checked); setBattleClosest(""); }}/>{tr("Cochonnet noir collé", "Black jack stuck")}</label>
        {battleJack && (battleStuck[players[0].id] ?? 0) + (battleStuck[players[1].id] ?? 0) > 0 && <div className="tossit-entry-field">
          <strong>{tr("Couleur la plus proche", "Closest coloured dart")}</strong>
          <TossitQuickChoices<string> value={battleClosest} label={tr("Couleur la plus proche", "Closest coloured dart")} columns={2}
            options={players.filter(p => (battleStuck[p.id] ?? 0) > 0).map(p => ({ value: p.id, label: p.name }))} onChange={setBattleClosest}/></div>}
        <TossitEntrySummary>{battleJack && battleClosest ? `${players.find(p => p.id === battleClosest)?.name} · +1 ${tr("manche", "round")}` : tr("Aucune manche attribuée avant confirmation d'une couleur proche et du cochonnet.", "No round is awarded until the jack and closest colour are confirmed.")}</TossitEntrySummary>
        <button type="button" className="tossit-confirm-button" style={{ ...button, width: "100%" }}
          disabled={((battleStuck[players[0].id] ?? 0) === (battleStuck[players[1].id] ?? 0) && !battleTieWinner) || (battleJack && (battleStuck[players[0].id] ?? 0) + (battleStuck[players[1].id] ?? 0) > 0 && !battleClosest)}
          onClick={() => { if (commit({ kind: "battle", stuck: battleStuck, tieWinnerId: (battleStuck[players[0].id] ?? 0) === (battleStuck[players[1].id] ?? 0) ? battleTieWinner || undefined : undefined, jackStuck: battleJack, closestPlayerId: battleJack ? battleClosest || undefined : undefined })) { setBattleStuck({}); setBattleTieWinner(""); setBattleJack(false); setBattleClosest(""); } }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "sniper" && <section className="tossit-mode-panel" style={panel}>
        <h3>🎯 EL SNIPER</h3>
        <p className="tossit-assist-text">{tr("Validez un essai sans réussite ou la première ventouse réellement empilée sur la Mega dart.", "Confirm an unsuccessful attempt or the first dart actually stacked on the Mega dart.")}</p>
        <div className="tossit-entry-field"><strong>{tr("Résultat observé", "Observed result")}</strong>
          <TossitQuickChoices<typeof sniperOutcome> value={sniperOutcome} label={tr("Résultat observé", "Observed result")} columns={3}
            options={[{ value: "miss", label: tr("Raté", "Miss") }, { value: "mega", label: "Mega dart" }, { value: "ultimate", label: "Ultimate trick" }]}
            onChange={value => { setSniperOutcome(value); setSniperWinner(""); }}/></div>
        {sniperOutcome !== "miss" && <div className="tossit-entry-field"><strong>{tr("Joueur ayant réussi en premier", "First successful player")}</strong>
          <TossitQuickChoices<string> value={sniperWinner} label={tr("Joueur gagnant", "Winning player")} columns={Math.min(players.length, 3)}
            options={players.map(p => ({ value: p.id, label: p.name }))} onChange={setSniperWinner}/></div>}
        <TossitEntrySummary>{sniperOutcome === "miss" ? tr("Aucun vainqueur — le défi continue.", "No winner — challenge continues.") : sniperWinner ? `${players.find(p => p.id === sniperWinner)?.name} · ${tr("victoire immédiate", "instant win")}` : tr("Sélectionnez le vainqueur avant de confirmer.", "Select the winner before confirming.")}</TossitEntrySummary>
        <button type="button" className="tossit-confirm-button" style={{ ...button, width: "100%" }} disabled={sniperOutcome !== "miss" && !sniperWinner}
          onClick={() => { if (commit({ kind: "sniper", outcome: sniperOutcome, playerId: sniperOutcome !== "miss" ? sniperWinner || undefined : undefined })) { setSniperOutcome("miss"); setSniperWinner(""); } }}>{tr("VALIDER LE RÉSULTAT", "CONFIRM RESULT")}</button>
      </section>}
      {mode === "conquest" && <section className="tossit-mode-panel" style={panel}>
        <h3>🌈 COLOR CONQUEST</h3>
        <p className="tossit-assist-text">{tr("Sélectionnez la couleur annoncée et le nombre à atteindre ; seules les ventouses de cette couleur comptent.", "Choose the called colour and required number; only matching stuck darts count.")}</p>
        <div className="tossit-entry-field"><strong>{tr("Couleur demandée", "Called colour")}</strong>
          <TossitQuickChoices<string> value={conquestColor} label={tr("Couleur demandée", "Called colour")} columns={3}
            options={TOSSIT_COLORS.map((color, i) => ({ value: color, label: tr(color, ["Red", "Blue", "Green", "Yellow", "Pink", "Purple"][i] ?? color) }))}
            onChange={value => { setConquestColor(value); setConquestFirst(""); }}/></div>
        <div className="tossit-entry-field"><strong>{tr("Nombre à atteindre", "Required darts")}</strong>
          <TossitCountChoices from={1} value={Math.min(conquestRequired, state.dartsPerPlayer)} max={state.dartsPerPlayer} label={tr("Nombre à atteindre", "Required darts")} onChange={value => { setConquestRequired(value); setConquestFirst(""); }}/></div>
        {players.map(p => <div className="tossit-entry-field" key={p.id}><strong>{p.name} · {tr("ventouses de la couleur collées", "matching darts stuck")}</strong>
          <TossitCountChoices value={conquestStuck[p.id] ?? 0} max={state.dartsPerPlayer} label={`${p.name} · ${tr("ventouses de la couleur collées", "matching darts stuck")}`}
            onChange={value => { setConquestStuck(old => ({ ...old, [p.id]: value })); setConquestFirst(""); }}/></div>)}
        {players.every(p => (conquestStuck[p.id] ?? 0) >= Math.min(conquestRequired, state.dartsPerPlayer)) && <div className="tossit-entry-field"><strong>{tr("Quelle équipe a réussi en premier ?", "Which team completed first?")}</strong>
          <TossitQuickChoices<string> value={conquestFirst} label={tr("Équipe la plus rapide", "First completing team")} columns={2}
            options={players.map(p => ({ value: p.id, label: p.name }))} onChange={setConquestFirst}/></div>}
        <TossitEntrySummary>{(() => { const qualified = players.filter(p => (conquestStuck[p.id] ?? 0) >= Math.min(conquestRequired, state.dartsPerPlayer)); const lead = qualified.length === 1 ? qualified[0] : qualified.length === 2 ? players.find(p => p.id === conquestFirst) : null; return lead ? `${lead.name} · +1 ${tr("manche", "round")}` : qualified.length === 2 ? tr("Sélectionnez l'équipe qui a terminé en premier.", "Select the team that completed first.") : tr("Objectif non atteint — aucune manche attribuée.", "Target not reached — no round awarded."); })()}</TossitEntrySummary>
        <button type="button" className="tossit-confirm-button" style={{ ...button, width: "100%", marginTop: 14 }}
          disabled={players.every(p => (conquestStuck[p.id] ?? 0) >= Math.min(conquestRequired, state.dartsPerPlayer)) && !conquestFirst}
          onClick={() => { if (commit({ kind: "conquest", color: conquestColor, required: Math.min(conquestRequired, state.dartsPerPlayer), stuck: conquestStuck, firstId: state.players.every(p => (conquestStuck[p.id] ?? 0) >= Math.min(conquestRequired, state.dartsPerPlayer)) ? conquestFirst || undefined : undefined })) { setConquestStuck({}); setConquestFirst(""); } }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "river" && <section className="tossit-mode-panel" style={panel}>
        <h3 style={{ marginTop: 0 }}>🌊 RIVER — {targetActive.name}</h3>
        <p style={{ opacity: .78, fontSize: 13 }}>{tr("Relevez chaque ventouse. La valeur d'une zone dépend de votre tapis. Votre camp attribue les points à l'adversaire ; toucher la rivière arrête immédiatement le tour.", "Record each dart. Zone values come from your mat. Landing in your own camp awards the opponent; touching the river immediately ends your turn.")}</p>
        {riverLandings.map((hit, i) => { const cutAt = riverLandings.findIndex(x => x.kind === "river"); return cutAt >= 0 && i > cutAt ? null : <div key={i} className="tossit-throw-row">
          <strong>{tr("Ventouse", "Dart")} {i + 1}</strong>
          <TossitQuickChoices<RiverLanding["kind"]> value={hit.kind} label={`${tr("Résultat", "Result")} ${i + 1}`} columns={4}
            options={[{value:"miss",label:tr("Ratée", "Miss")}, {value:"opponent",label:tr("Adverse", "Opp.")}, {value:"own",label:tr("Mon camp", "Own")}, {value:"river",label:tr("Rivière", "River")}]}
            onChange={kind => setRiverLandings(v => v.map((x, idx) => idx === i ? { kind, points: kind === "own" || kind === "opponent" ? x.points : 0 } : x))}/>
          {(hit.kind === "own" || hit.kind === "opponent") && <label className="tossit-river-points">{tr("Points de la zone", "Zone points")}
            <input aria-label={`${tr("Valeur", "Value")} ${i + 1}`} type="number" inputMode="numeric" min={0} max={100} step={1} style={input} value={hit.points}
              onChange={e => setRiverLandings(v => v.map((x, idx) => idx === i ? { ...x, points: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } : x))}/></label>}
        </div>; })}
        <div className="tossit-selection-feedback" role="status">
          {tr("Aperçu", "Preview")}: {targetActive.name} +{riverLandings.slice(0, riverLandings.findIndex(x => x.kind === "river") + 1 || riverLandings.length).filter(x => x.kind === "opponent").reduce((n,x)=>n+x.points,0)+riverKiss*2+(riverJump?9:0)} · {players.find(p => p.id !== targetActive.id)?.name} +{riverLandings.slice(0, riverLandings.findIndex(x => x.kind === "river") + 1 || riverLandings.length).filter(x=>x.kind === "own").reduce((n,x)=>n+x.points,0)}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}><label>Kiss (+2) <select style={{ ...input, width: 75 }} value={riverKiss} onChange={e => setRiverKiss(Number(e.target.value))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, i) => <option key={i}>{i}</option>)}</select></label><label><input type="checkbox" checked={riverJump} onChange={e => setRiverJump(e.target.checked)} /> Jumpover (+9)</label></div>
        <button className="tossit-confirm-button" style={{ ...button, width: "100%", marginTop: 14 }} onClick={() => { const cutAt = riverLandings.findIndex(x => x.kind === "river"); const landings = cutAt >= 0 ? riverLandings.slice(0, cutAt + 1) : riverLandings; if (commit({ kind: "river", landings, kiss: riverKiss, jumpover: riverJump })) { setRiverLandings(Array.from({ length: state.dartsPerPlayer }, (): RiverLanding => ({ kind: "miss", points: 0 }))); setRiverKiss(0); setRiverJump(false); } }}>{tr("VALIDER LE TOUR", "CONFIRM TURN")}</button>
      </section>}
      {mode === "cornhole" && <section className="tossit-mode-panel" style={panel}>
        <h3 style={{ marginTop: 0 }}>🎯 CORNHOLE</h3>
        <p style={{ fontSize: 13, opacity: .78 }}>{tr("Chaque équipe lance trois ventouses : trou +3, planche +1, ratée 0. Si les trois vont dans le trou, ajoutez la série de relance. Kiss +1 et Jumpover multiplient le total de manche.", "Each side throws 3 darts: hole +3, board +1, miss 0. If all three land in the hole, add the immediate extra set. Kiss +1; Jumpovers multiply the round subtotal.")}</p>
        {state.players.map(p => { const darts = cornThrows[p.id] ?? ["miss", "miss", "miss"]; const canRethrow = darts.length < 30 && darts.slice(-3).every(x => x === "hole"); return <div key={p.id} style={{ ...panel, marginBottom: 10 }}>
          <strong>{p.name}</strong><div className="tossit-throw-list">
            {darts.map((hit, i) => <div key={i} className="tossit-throw-row"><strong>{tr("Ventouse", "Dart")} {i + 1}</strong>
              <TossitQuickChoices<CornholeLanding> value={hit} label={`${p.name} — ${tr("ventouse", "dart")} ${i + 1}`} columns={3}
                options={[{value:"miss",label:tr("0 · Ratée", "0 · Miss")}, {value:"board",label:tr("1 · Planche", "1 · Board")}, {value:"hole",label:tr("3 · Trou", "3 · Hole")} ]}
                onChange={landing => setCornThrows(v => ({ ...v, [p.id]: darts.map((x, idx) => idx === i ? landing : x) }))}/>
            </div>)}
          </div>
          <div className="tossit-selection-feedback" role="status">
            {tr("Total brut de la manche", "Raw round total")}: {(darts.reduce((n,hit)=>n+(hit === "hole"?3:hit === "board"?1:0),0)
              + Array.from({length:darts.length/3},(_,i)=>darts.slice(i*3,i*3+3).every(hit=>hit === "hole")?9:0).reduce((a,b)=>a+b,0)
              +(cornKiss[p.id]??0))*(1+(cornJump[p.id]??0))} pts
          </div>
          {canRethrow && <button style={secondary} onClick={() => setCornThrows(v => ({ ...v, [p.id]: [...darts, "miss", "miss", "miss"] as CornholeLanding[] }))}>+ {tr("Série de 3 relances", "3 extra throws")}</button>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 8 }}><label>Kiss (+1)<select style={input} value={cornKiss[p.id] ?? 0} onChange={e => setCornKiss(v => ({ ...v, [p.id]: Number(e.target.value) }))}>{Array.from({ length: darts.length + 1 }, (_, i) => <option key={i}>{i}</option>)}</select></label><label>Jumpover (×2, ×3…)<select style={input} value={cornJump[p.id] ?? 0} onChange={e => setCornJump(v => ({ ...v, [p.id]: Number(e.target.value) }))}>{Array.from({ length: darts.length + 1 }, (_, i) => <option key={i}>{i}</option>)}</select></label></div>
        </div>; })}
        <p style={{ opacity: .73, fontSize: 12 }}>{tr("Annulation : seul l'écart des deux manches est marqué. Plus de 21 → 13 ; second bust consécutif → 0.", "Cancellation scoring: only the round difference counts. Over 21 → 13; consecutive bust → 0.")}</p>
        <button className="tossit-confirm-button" style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "cornhole", throws: cornThrows, kiss: Object.fromEntries(players.map(p => [p.id, cornKiss[p.id] ?? 0])), jumpover: Object.fromEntries(players.map(p => [p.id, cornJump[p.id] ?? 0])) })) { setCornThrows(Object.fromEntries(players.map(p => [p.id, ["miss", "miss", "miss"] as CornholeLanding[]]))); setCornKiss({}); setCornJump({}); } }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "goalkeeper" && <section className="tossit-mode-panel" style={panel}>
        <h3 style={{ marginTop: 0 }}>⚽ GOALKEEPER — {targetActive.name}</h3>
        <p style={{ opacity: .75, fontSize: 13 }}>{tr("Saisissez les valeurs de trois fléchettes. Coin supérieur ou entre les jambes +3, au-dessus du but +2, côté +1, gardien −1, ratée 0.", "Record 3 darts. Top corner or between the legs +3, over goal +2, side +1, goalkeeper −1, miss 0.")}</p>
        {goalZones.map((hit, i) => <div key={i} className="tossit-throw-row"><strong>{tr("Ventouse", "Dart")} {i + 1}</strong>
          <TossitQuickChoices value={hit} label={`${tr("Ventouse", "Dart")} ${i + 1}`} columns={5}
            options={[{value:-1,label:"−1"},{value:0,label:"0"},{value:1,label:"+1"},{value:2,label:"+2"},{value:3,label:"+3"}]}
            onChange={score => setGoalZones(v => v.map((x,idx) => idx===i?score:x))}/>
        </div>)}
        <strong style={{ color: ACCENT, display: "block", marginBottom: 10 }}>{tr("Total", "Total")} {goalZones.reduce((n,v)=>n+v,0)} pts</strong>
        <button className="tossit-confirm-button" style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "goalkeeper", zones: goalZones })) setGoalZones([0,0,0]); }}>{tr("VALIDER LES 3 TIRS", "CONFIRM 3 THROWS")}</button>
      </section>}
      {mode === "football_pitch" && <section className="tossit-mode-panel" style={panel}>
        <h3 style={{ marginTop: 0 }}>⚽ FOOTBALL PITCH</h3>
        <p style={{ color: ACCENT, fontWeight: 800 }}>{tr("Attaquant", "Attacker")}: {players.find(p => p.id === state.pitch.attackerId)?.name} · {tr("Tentative", "Drive")} {state.pitch.drive}</p>
        <p style={{ opacity: .76, fontSize: 13 }}>{tr("Chemin confirmé", "Confirmed path")}: {state.pitch.chainLength} · {tr("Balles défendues", "Blocked darts")}: {state.pitch.blocks} · {tr("Attaquant", "Attacker")}: {state.pitch.attackerThrows}/6 · {tr("Défenseur", "Defender")}: {state.pitch.defenderThrows}/6</p>
        <strong style={{ display: "block", marginBottom: 10 }}>{tr("Au tour de", "Now playing")}: {targetActive.name} — {targetActive.id === state.pitch.attackerId ? tr("ATTAQUE", "ATTACK") : tr("DÉFENSE", "DEFENCE")}</strong>
        <p style={{ opacity: .75, fontSize: 12 }}>{tr("Validez vous-même la continuité des contacts entre ventouses. L'application ne mesure pas automatiquement la trajectoire.", "Manually confirm connected darts. The app does not automatically detect the path.")}</p>
        <TossitQuickChoices<typeof pitchOutcome> value={pitchOptions.some(option => option.value === pitchOutcome) ? pitchOutcome : "miss"}
          label={tr("Action du lancer", "Throw action")} columns={2} options={pitchOptions} onChange={setPitchOutcome}/>
        <button className="tossit-confirm-button" style={{ ...button, width: "100%", marginTop: 12 }}
          onClick={() => { if (commit({ kind: "football_pitch", outcome: pitchOptions.some(option => option.value === pitchOutcome) ? pitchOutcome : "miss" })) setPitchOutcome("miss"); }}>
          {tr("VALIDER LE LANCER", "CONFIRM THROW")}</button>
      </section>}
      {mode === "thief_cop" && <section className="tossit-mode-panel" style={panel}>
        <h3>🚔 THIEF & COP — {tr("Manche", "Round")} {state.events.length + 1}/{state.victoryTarget}</h3>
        <p style={{ color: ACCENT, fontWeight: 800 }}>{tr("Voleur", "Thief")}: {players[state.events.length % 2]?.name} · {tr("Policier", "Cop")}: {players[(state.events.length + 1) % 2]?.name}</p>
        <p className="tossit-assist-text">{tr("Chaque capture est sélectionnée par une touche. Takedown termine immédiatement la manche ; les tentatives suivantes sont ignorées.", "Select each capture with a touch. Takedown ends the round immediately; later attempts do not count.")}</p>
        {captures.map((hit, i) => <div key={i} className="tossit-throw-row">
          <strong>{tr("Tentative", "Attempt")} {i + 1}</strong>
          {thiefPreview.stoppedAfter >= 0 && i > thiefPreview.stoppedAfter ? <span className="tossit-assist-text">{tr("Terminée après Takedown", "Stopped after Takedown")}</span> :
            <TossitQuickChoices<ThiefCopCapture> value={hit} columns={3} label={`${tr("Tentative", "Attempt")} ${i + 1}`}
              options={[{ value: "miss", label: tr("0 · Échappé", "0 · Escaped") }, { value: "close", label: tr("+1 · Proche", "+1 · Close") }, { value: "direct", label: tr("+2 · Directe", "+2 · Direct") }, { value: "handcuff", label: "+4 · Handcuff" }, { value: "double_lock", label: "+6 · Double Lock" }, { value: "takedown", label: "Takedown" }]}
              onChange={result => setCaptures(old => old.map((value, n) => n === i ? result : (result === "takedown" && n > i ? "miss" : value)))}/>
          }
        </div>)}
        <TossitEntrySummary>
          {tr("Policier", "Cop")} {players[(state.events.length + 1) % 2]?.name} : <b>+{thiefPreview.points}</b> {tr("points prévus", "provisional points")}
          {thiefPreview.takedown ? ` · ${tr("Takedown : manche capturée", "Takedown: round captured")}` : ""}
        </TossitEntrySummary>
        <button type="button" className="tossit-confirm-button" style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "thief_cop", captures: thiefPreview.selected })) setCaptures(Array(state.dartsPerPlayer).fill("miss")); }}>{tr("VALIDER LES CAPTURES", "CONFIRM ARRESTS")}</button>
      </section>}
      {mode === "reach" && <section className="tossit-mode-panel" style={panel}>
        <h3>🟡 STICK & REACH — {targetActive.name}</h3>
        <p style={{ opacity: .75, fontSize: 13 }}>{tr("Meilleure hauteur de la ventouse collée, en cm. Le total des ventouses collées départage les records égaux.", "Highest stuck dart, in cm. Total stuck darts break equal-height ties.")}</p>
        <label>{tr("Ventouses collées", "Stuck darts")}<select style={input} value={reachStuck} onChange={e => { setReachStuck(Number(e.target.value)); if (Number(e.target.value) === 0) setReachCm("0"); }}>
          {Array.from({length:state.dartsPerPlayer+1},(_,i)=><option key={i} value={i}>{i}</option>)}
        </select></label>
        <label>{tr("Hauteur maximale (cm)", "Maximum height (cm)")}<input type="number" inputMode="decimal" min="0" max="350" step="0.1" style={input} disabled={reachStuck===0} value={reachCm} onChange={e=>setReachCm(e.target.value)} /></label>
        <p style={{ fontSize: 12, opacity: .72 }}>{tr("Classement MSS : meilleure hauteur puis nombre total de ventouses collées. Aucun barème officiel de points.", "MSS ranking: highest dart then total stuck darts. No official points format.")}</p>
        <button className="tossit-confirm-button" style={{ ...button, width: "100%" }} onClick={()=>{ if(commit({kind:"reach", stuck:reachStuck, bestCm: Number(reachCm)})) {setReachCm("0");setReachStuck(0);} }}>{tr("VALIDER LE PASSAGE", "CONFIRM TURN")}</button>
      </section>}
      {mode === "rainbow" && <section className="tossit-mode-panel" style={panel}>
        <h3>🌈 RAINBOW RING & STACK — {targetActive.name}</h3>
        <p style={{ opacity: .75, fontSize: 12 }}>{tr("Défi créatif MSS : 1 point par couleur distincte ou niveau empilé, +3 si l'anneau, le motif ou la tour est terminé. Barème non officiel.", "MSS creative challenge: 1 point per distinct colour or stack level, +3 for a finished ring, shape or tower. Not official scoring.")}</p>
        <label>{tr("Type de création", "Creative challenge")}<select style={input} value={rainbowPattern} onChange={e=>{setRainbowPattern(e.target.value as typeof rainbowPattern);setRainbowColors(0);setRainbowStack(0);setRainbowCompleted(false);}}>
          <option value="ring">{tr("Anneau coloré", "Rainbow ring")}</option><option value="shape">{tr("Motif / forme", "Pattern / shape")}</option><option value="stack">{tr("Tour empilée", "Stacked tower")}</option>
        </select></label>
        {rainbowPattern === "stack" ? <label>{tr("Niveaux empilés", "Stacked levels")}<select style={input} value={rainbowStack} onChange={e=>setRainbowStack(Number(e.target.value))}>{Array.from({length:state.dartsPerPlayer+1},(_,i)=><option key={i}>{i}</option>)}</select></label> :
          <label>{tr("Couleurs distinctes utilisées", "Distinct colours used")}<select style={input} value={rainbowColors} onChange={e=>setRainbowColors(Number(e.target.value))}>{Array.from({length:7},(_,i)=><option key={i}>{i}</option>)}</select></label>}
        <label style={{ display: "block", margin: "12px 0" }}><input type="checkbox" checked={rainbowCompleted} onChange={e=>setRainbowCompleted(e.target.checked)} /> {tr("Création terminée (+3 MSS)", "Completed creation (+3 MSS)")}</label>
        <button className="tossit-confirm-button" style={{ ...button, width: "100%" }} onClick={()=>{if(commit({kind:"rainbow", pattern:rainbowPattern, colors:rainbowPattern === "stack" ? 0 : rainbowColors, stackHeight:rainbowPattern === "stack" ? rainbowStack : 0, completed:rainbowCompleted})) {setRainbowColors(0);setRainbowStack(0);setRainbowCompleted(false);} }}>{tr("VALIDER LE DÉFI", "CONFIRM CHALLENGE")}</button>
      </section>}
      {mode === "chores" && <section className="tossit-mode-panel" style={panel}>
        <h3>🧹 CHORES — {targetActive?.name}</h3>
        <p className="tossit-assist-text">{tr("Choisissez l'action, le destinataire et la corvée de chaque ventouse. Le récapitulatif est provisoire : aucune tâche ne change avant validation.", "Choose an effect, recipient and chore for each dart. The summary is provisional: no task changes before confirmation.")}</p>
        {choreThrows.map((dart, i) => <div key={i} className="tossit-score-entry-card">
          <strong>{tr("Ventouse", "Dart")} {i + 1}</strong>
          <div className="tossit-entry-field"><strong>{tr("Action", "Effect")}</strong>
            <TossitQuickChoices<ChoreThrow["effect"]> value={dart.effect} columns={3} label={`${tr("Action", "Effect")} ${i + 1}`}
              options={[{ value: "miss", label: tr("Ratée", "Miss") }, { value: "chore", label: tr("+1 · Corvée", "+1 · Chore") }, { value: "free_day", label: "Free Day" }, { value: "kiss", label: "Kiss (−1)" }, { value: "jumpover", label: "Jumpover (+2)" }, { value: "double_trouble", label: "Double Trouble (−1)" }]}
              onChange={effect => setChoreThrows(old => old.map((value,n) => n === i ? { ...value, effect } : value))}/>
          </div>
          {dart.effect !== "miss" && <div className="tossit-entry-field"><strong>{tr("Destinataire", "Recipient")}</strong>
            <TossitQuickChoices value={dart.recipientId || ""} columns={Math.min(players.length, 3)} label={`${tr("Destinataire", "Recipient")} ${i + 1}`}
              options={players.map(player => ({ value: player.id, label: player.name }))}
              onChange={recipientId => setChoreThrows(old => old.map((value,n) => n === i ? { ...value, recipientId } : value))}/>
          </div>}
          {(["chore", "jumpover"].includes(dart.effect)) && <div className="tossit-entry-field"><strong>{tr("Corvée", "Chore")}</strong>
            <TossitQuickChoices value={dart.chore || ""} columns={3} label={`${tr("Corvée", "Chore")} ${i + 1}`}
              options={TOSSIT_CHORES.map(chore => ({ value: chore.id, label: tr(chore.fr, chore.en) }))}
              onChange={chore => setChoreThrows(old => old.map((value,n) => n === i ? { ...value, chore } : value))}/>
          </div>}
        </div>)}
        <TossitEntrySummary>
          <strong>{tr("Tâches après validation", "Tasks after confirmation")}</strong>
          {players.map(p => <span key={p.id} className="tossit-preview-line">
            {p.name} : <b>{chorePreview.counts[p.id] ?? 0}</b> {tr("tâche(s)", "task(s)")}
            <small>· {(chorePreview.pending[p.id] || []).map(id => tr(TOSSIT_CHORES.find(x => x.id === id)?.fr || id, TOSSIT_CHORES.find(x => x.id === id)?.en || id)).join(" · ") || "—"}</small>
          </span>)}
        </TossitEntrySummary>
        <button type="button" className="tossit-confirm-button" style={{ ...button, width: "100%" }} disabled={!chorePreview.ready} onClick={() => { if (commit({ kind: "chores", throws: choreThrows })) setChoreThrows(Array.from({ length: state.dartsPerPlayer }, () => ({ effect: "miss", recipientId: players[1]?.id ?? players[0]?.id, chore: TOSSIT_CHORES[0].id }))); }}>{tr("VALIDER LES TROIS TIRS", "CONFIRM THREE THROWS")}</button>
      </section>}
      {mode === "bottle" && <section className="tossit-mode-panel" style={panel}>
        <h3>🍾 CAPTURE THE BOTTLE — {tr("Manche", "Round")} {state.events.length + 1}/{state.victoryTarget}</h3>
        <p style={{ fontSize: 12, opacity: .8 }}>{tr("Version familiale sans alcool, barème MSS : +1 pour la ventouse la plus proche, +3 par ventouse collée directement sur la bouteille. Tous les résultats sont saisis manuellement.", "Alcohol-free MSS adaptation: +1 for the closest stuck dart, +3 for each dart stuck directly on the bottle. All results entered manually.")}</p>
        {players.map(p => <div key={p.id} style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:8, marginBottom:10 }}>
          <strong style={{ gridColumn:"1 / -1" }}>{p.name}</strong>
          <label>{tr("Ventouses collées", "Stuck darts")}<select style={input} value={bottleStuck[p.id] ?? 0} onChange={e=>{const n=Number(e.target.value);setBottleStuck(old=>({...old,[p.id]:n}));setBottleOn(old=>({...old,[p.id]:Math.min(old[p.id]??0,n)}));if(!n && bottleClosest===p.id)setBottleClosest("");}}>{Array.from({length:state.dartsPerPlayer+1},(_,n)=><option key={n} value={n}>{n}</option>)}</select></label>
          <label>{tr("Sur la bouteille", "On bottle")}<select style={input} value={bottleOn[p.id]??0} onChange={e=>setBottleOn(old=>({...old,[p.id]:Number(e.target.value)}))}>{Array.from({length:(bottleStuck[p.id]??0)+1},(_,n)=><option key={n} value={n}>{n}</option>)}</select></label>
        </div>)}
        <label>{tr("Ventouse la plus proche", "Closest dart")}<select style={input} value={bottleClosest} onChange={e=>setBottleClosest(e.target.value)}><option value="">{tr("Aucune (toutes manquées)", "None (all missed)")}</option>{players.filter(p=>(bottleStuck[p.id]??0)>0).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <button className="tossit-confirm-button" style={{...button,width:"100%",marginTop:14}} onClick={()=>{if(commit({kind:"bottle",stuck:Object.fromEntries(players.map(p=>[p.id,bottleStuck[p.id]??0])),onBottle:Object.fromEntries(players.map(p=>[p.id,bottleOn[p.id]??0])),closestPlayerId:bottleClosest||undefined})){setBottleStuck({});setBottleOn({});setBottleClosest("");}}}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      <button type="button" className="tossit-undo-button" style={{ ...secondary, width: "100%" }} disabled={!state.previous} onClick={() => { lastCommitAt.current = 0; setState((old) => undoTossitAction(old)); setTictacSelection(null); setError(""); }}>{tr("ANNULER LA DERNIÈRE SAISIE", "UNDO LAST ENTRY")}</button>
    </>}
    {error && <p role="alert" style={{ color: "#FFD3A0" }}>{error}</p>}
    {state.events.length > 0 && <section style={{ ...panel, marginTop: 14 }}><h3>{tr("Déroulement", "Round history")}</h3>{state.events.slice().reverse().map((event) => <p key={event.index} style={{ borderBottom: "1px solid #29494B", paddingBottom: 6, fontSize: 13 }}>#{event.index} — {event.explanation}</p>)}</section>}
    </div>
    </div>
  </Layout>;
}

export function TossitStats({ go }: { go: (route: any, params?: any) => void }) {
  const tr = useCopy();
  const [matches, setMatches] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let active = true;
    History.list().then((rows) => { if (active) setMatches(rows.filter((r) => r?.kind === "tossit" || r?.sport === "tossit" || r?.payload?.sport === "tossit").filter((r) => r?.status === "finished")); })
      .catch(() => { if (active) setMatches([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const wins: Record<string, { name: string; games: number; wins: number }> = {};
  const modeCounts: Record<string, number> = {};
  for (const match of matches) {
    const id = String(match.summary?.mode || match.payload?.mode || match.mode || "classic");
    modeCounts[id] = (modeCounts[id] ?? 0) + 1;
  }
  matches.forEach((r) => { const people = Array.isArray(r.players) ? r.players : [];
    people.forEach((p: any) => { const id = String(p.id); if (!id) return; const entry = wins[id] || { name: String(p.name || id), games: 0, wins: 0 }; entry.games += 1; entry.wins += String(r.winnerId || r.summary?.winnerId) === id ? 1 : 0; wins[id] = entry; });
  });
  return <Layout className="tossit-stats-page"><Header title={tr("HISTORIQUE & STATS", "HISTORY & STATS")} mode="games" onBack={() => go("games")} />
    <h2>{tr("Statistiques TOSSIT", "TOSSIT statistics")}</h2><section style={panel}><strong>{tr("Parties enregistrées", "Recorded games")}</strong><div style={{ fontSize: 34, fontWeight: 900, color: ACCENT }}>{matches.length}</div></section>
    <MenuDecorCard />
    {loading && <p>{tr("Chargement de l'historique…", "Loading history…")}</p>}
    <h3>{tr("Modes joués", "Modes played")}</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 9, marginBottom: 15 }}>
      {TOSSIT_MODES.filter(m => modeCounts[m.id]).map(m => <div key={m.id} style={{ ...panel, margin: 0, textAlign: "center" }}><strong style={{ fontSize: 12 }}>{m.title}</strong><div style={{ fontSize: 29, color: ACCENT, fontWeight: 900 }}>{modeCounts[m.id]}</div></div>)}
    </div>
    <h3>{tr("Classement joueurs", "Player ranking")}</h3><p style={{ opacity: .72, fontSize: 12 }}>{tr("Seules les victoires sont cumulées : les modes TOSSIT utilisent des unités de score différentes.", "Only wins are aggregated: TOSSIT modes use different scoring units.")}</p>{Object.values(wins).sort((a, b) => b.wins - a.wins).map((p) => <div key={p.name} style={{ ...panel, display: "flex", justifyContent: "space-between" }}><strong>{p.name}</strong><span>{p.wins}/{p.games} {tr("victoires", "wins")} · {Math.round(100 * p.wins / Math.max(1, p.games))}%</span></div>)}
    <h3>{tr("Dernières parties", "Recent matches")}</h3>{matches.slice(0, 40).map((r) => <div key={r.id} style={panel}><strong>{String(r.summary?.mode || r.payload?.mode || "tossit").toUpperCase()}</strong><span style={{ float: "right", fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</span><p style={{ marginBottom: 0 }}>{tr("Vainqueur", "Winner")}: {(r.players || []).find((p: any) => String(p.id) === String(r.winnerId || r.summary?.winnerId))?.name || "—"}</p></div>)}
    {!loading && !matches.length && <p>{tr("Aucune partie TOSSIT terminée pour le moment.", "No finished TOSSIT games yet.")}</p>}
    <button style={button} onClick={() => go("games")}>{tr("JOUER", "PLAY")}</button>
  </Layout>;
}
