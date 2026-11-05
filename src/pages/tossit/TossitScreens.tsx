import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import { History } from "../../lib/history";
import { scopedStorageKey } from "../../lib/storage";
import { PageAdBanner } from "../../monetization/AdSlot";
import {
  TOSSIT_MODES, TOSSIT_PLANNED, TOSSIT_COLORS, applyTossitAction, newTossitGame, summaryForTossit, undoTossitAction,
  type TossitMode, type TossitPlayer, type TossitState, type RiverLanding, type CornholeLanding,
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
import menuDecor from "../../assets/tossit/tossit_menu_decor.webp";

const ART: Record<TossitMode | "games", string> = { games: tickerMenu, classic: tickerClassic, speed: tickerSpeed, target: tickerTarget, duel: tickerMenu, border: tickerTarget, tictac: tickerTarget, battle: tickerBattle, sniper: tickerSniper, conquest: tickerConquest, river: tickerRiver, cornhole: tickerCornhole, goalkeeper: tickerGoalkeeper, football_pitch: tickerFootballPitch };
const TOSSIT_I18N_ART: Partial<Record<TossitMode, { fr: string; en: string }>> = {
  river: { fr: tickerRiverFr, en: tickerRiverEn },
  cornhole: { fr: tickerCornholeFr, en: tickerCornholeEn },
  goalkeeper: { fr: tickerGoalkeeperFr, en: tickerGoalkeeperEn },
  football_pitch: { fr: tickerFootballPitchFr, en: tickerFootballPitchEn },
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
    const draft = JSON.parse(localStorage.getItem(scopedStorageKey(TOSSIT_DRAFT_KEY)) || "null");
    if (!draft || draft.finished || !TOSSIT_MODES.some((mode) => mode.id === draft.mode) ||
      !Array.isArray(draft.players) || !Array.isArray(draft.events) || !draft.scores ||
      !Number.isInteger(draft.dartsPerPlayer) || draft.dartsPerPlayer < 3 || draft.dartsPerPlayer > 9 ||
      !Array.isArray(draft.board) || draft.board.length !== (draft.gridSize || 4) ** 2 ||
      draft.players.some((player: TossitPlayer) => !player?.id || !player?.name)) return null;
    // A persisted in-progress game never carries a recursive Undo graph.
    const players = draft.players as TossitPlayer[];
    return { ...draft, victoryTarget: Number.isInteger(draft.victoryTarget) ? draft.victoryTarget : (draft.mode === "conquest" ? 5 : 3),
      cornholeBusted: draft.cornholeBusted || Object.fromEntries(players.map(p => [p.id, false])),
      pitch: draft.pitch || { attackerId: players[0].id, attackerThrows: 0, defenderThrows: 0, chainLength: 0, blocks: 0, longPassUsed: false, drive: 1 },
      previous: null } as TossitState;
  } catch { return null; }
}
function writeDraft(state: TossitState) {
  try {
    if (typeof localStorage === "undefined") return;
    if (state.finished) localStorage.removeItem(scopedStorageKey(TOSSIT_DRAFT_KEY));
    else localStorage.setItem(scopedStorageKey(TOSSIT_DRAFT_KEY), JSON.stringify({ ...state, previous: null }));
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
};
function useCopy() {
  const { lang } = useLang();
  const english = String(lang || "fr").toLowerCase().split("-")[0] !== "fr";
  return (fr: string, en: string) => english ? en : fr;
}
function Header({ title, mode, onBack }: { title: string; mode: TossitMode | "games"; onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  return <div style={{ position: "relative", marginBottom: 14 }}>
    <img src={tickerForTossit(mode, lang)} alt={`TOSSIT • ${title}`} style={{ width: "100%", height: "clamp(90px,23vw,140px)", objectFit: "cover", borderRadius: 15, display: "block", border: `1px solid ${theme.borderSoft || "#ffffff33"}` }} />
    <div style={{ position: "absolute", top: 7, left: 7 }}><BackDot onClick={onBack} color={ACCENT} /></div>
    <div style={{ position: "absolute", top: 7, right: 7 }}><InfoDot color={ACCENT} title="Règles TOSSIT" content={<div style={{ lineHeight: 1.6 }}><strong>{title}</strong><p>{mode === "games" ? "TOSSIT : des fléchettes à ventouse lancées sur une surface lisse, autour du cochonnet ou d'un objectif." : tinfo[mode]}</p><a href={rulesUrl} target="_blank" rel="noreferrer">Règlement officiel TOSSIT</a></div>} /></div>
  </div>;
}
function Layout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <main style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: "12px 14px 105px", maxWidth: 950, margin: "0 auto" }}>{children}</main>;
}
const panel: React.CSSProperties = { padding: 15, background: "rgba(18,30,39,.88)", border: "1px solid rgba(110,229,215,.22)", borderRadius: 17, marginBottom: 13 };
const button: React.CSSProperties = { color: "#07151B", background: ACCENT, border: "none", borderRadius: 10, fontWeight: 900, padding: "12px 16px", cursor: "pointer", minHeight: 44 };
const secondary: React.CSSProperties = { ...button, color: "#E1FDF5", background: "rgba(83,111,118,.3)", border: "1px solid rgba(145,231,213,.26)" };
const input: React.CSSProperties = { minHeight: 43, borderRadius: 10, border: "1px solid #547C7B", background: "#0F2026", color: "#FFF", padding: "10px 12px", width: "100%", boxSizing: "border-box" };
function MenuDecorCard() {
  return <section aria-hidden="true" style={{ ...panel, padding: 0, overflow: "hidden", background: "linear-gradient(180deg, rgba(255,224,55,.08), rgba(14,24,29,.92))" }}>
    <img src={menuDecor} alt="" style={{ display: "block", width: "100%", height: "auto", objectFit: "cover" }} />
  </section>;
}
function ScoreCards({ state }: { state: TossitState }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(126px,1fr))", gap: 8, margin: "12px 0" }}>
    {state.players.map((p, index) => <div key={p.id} style={{ ...panel, border: state.winnerId === p.id ? `2px solid ${ACCENT}` : ["target", "duel", "tictac"].includes(state.mode) && index === state.nextPlayerIndex && !state.finished ? `2px solid ${ACCENT}` : "1px solid #45606B", textAlign: "center", margin: 0 }}>
      <div style={{ fontSize: 12, opacity: .8 }}>{p.name}</div><div style={{ fontSize: 38, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{state.scores[p.id] ?? 0}</div>{state.winnerId === p.id ? <strong style={{ color: ACCENT }}>GAGNANT</strong> : null}
    </div>)}
  </div>;
}
export function TossitMenu({ go }: { go: (route: any, params?: any) => void }) {
  const tr = useCopy();
  const { lang } = useLang();
  const [draft] = React.useState<TossitState | null>(readDraft);
  return <Layout><Header title="GAMES" mode="games" onBack={() => go("gameSelect")} />
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
    {TOSSIT_MODES.map((mode) => <button key={mode.id} type="button" style={{ ...panel, textAlign: "left", color: "white", cursor: "pointer", padding: 0, overflow: "hidden" }} onClick={() => go("tossit_config", { mode: mode.id })}>
      <img src={tickerForTossit(mode.id, lang)} alt="" style={{ display: "block", width: "100%", height: 90, objectFit: "cover" }} />
      <div style={{ padding: 14 }}><strong>{mode.title}</strong><p style={{ opacity: .78, fontSize: 13 }}>{mode.description}</p><span style={{ color: ACCENT, fontWeight: 800 }}>{tr("JOUER", "PLAY")} · {mode.id === "sniper" ? tr("victoire immédiate", "instant win") : ["battle", "conquest"].includes(mode.id) ? tr("manches gagnées", "round wins") : mode.target ? `${mode.target} pts` : tr("alignement", "line game")}</span></div>
    </button>)}
    </div>
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
  const defaultPlayers = () => Array.from({ length: mode === "target" ? 1 : 2 }, (_, index) => {
    const p = profiles[index];
    return { id: p?.id ? String(p.id) : `tossit-guest-${index + 1}`, name: String(p?.nickname || p?.displayName || p?.name || `${tr("Joueur", "Player")} ${index + 1}`) };
  });
  const [players, setPlayers] = React.useState<TossitPlayer[]>(defaultPlayers);
  const [darts, setDarts] = React.useState(["duel", "river", "football_pitch"].includes(mode) ? 6 : 3);
  const [gridSize, setGridSize] = React.useState<4 | 5>(4);
  const [victoryTarget, setVictoryTarget] = React.useState(mode === "conquest" ? 5 : 3);
  const maxPlayers = (["speed", "duel", "border", "tictac", "battle", "conquest", "river", "cornhole", "goalkeeper", "football_pitch"].includes(mode)) ? 2 : mode === "target" ? 4 : 6;
  const addPlayer = () => setPlayers((current) => {
    if (current.length >= maxPlayers) return current;
    let guestNumber = 1;
    while (current.some((player) => player.id === `tossit-guest-${guestNumber}`)) guestNumber++;
    return [...current, { id: `tossit-guest-${guestNumber}`, name: `${tr("Joueur", "Player")} ${current.length + 1}` }];
  });
  return <Layout><Header title={meta.title} mode={mode} onBack={() => go("games")} />
    <div style={panel}><h2 style={{ margin: "0 0 8px" }}>{meta.title}</h2><p>{meta.description}</p><p style={{ fontSize: 13, opacity: .8 }}>{tinfo[mode]}</p></div>
    <MenuDecorCard />
    {["river", "cornhole"].includes(mode) && <p style={{ opacity: .75, fontSize: 13 }}>{tr("Saisissez les noms des deux camps (joueurs ou équipes de deux). Les scores des équipes sont cumulés.", "Name the two sides (players or two-person teams). Team scores are pooled.")}</p>}
    <section style={panel}><h3>{tr("Participants", "Players")} ({players.length})</h3>
      {players.map((p, index) => <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span style={{ minWidth: 22, color: ACCENT }}>{index + 1}</span>
        <input aria-label={`${tr("Joueur", "Player")} ${index + 1}`} value={p.name} style={input} onChange={(e) => setPlayers((v) => v.map((x, n) => n === index ? { ...x, name: e.target.value } : x))} />
        {players.length > (mode === "target" ? 1 : 2) && <button type="button" aria-label="Retirer le joueur" style={secondary} onClick={() => setPlayers((v) => v.filter((_, n) => n !== index))}>×</button>}
      </div>)}
      {players.length < maxPlayers && <button style={secondary} onClick={addPlayer}>+ {tr("Ajouter un joueur", "Add a player")}</button>}
      {profiles.length > 0 && <p style={{ fontSize: 12, opacity: .7 }}>{tr("Les profils existants sont proposés par défaut. Modifier leur nom conserve leur identifiant de profil.", "Existing profiles are preselected. Editing a name retains its profile ID.")}</p>}
    </section>
    {mode !== "tictac" && <section style={panel}><h3>{tr("Ventouses par joueur", "Darts per player")}</h3><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(mode === "duel" || mode === "football_pitch" ? [6] : mode === "river" ? [6, 7, 8, 9] : ["cornhole", "goalkeeper"].includes(mode) ? [3] : [3, 4, 5, 6]).map((n) => <button key={n} type="button" style={n === darts ? button : secondary} onClick={() => setDarts(n)}>{n}</button>)}</div>{mode === "duel" && <p style={{ fontSize: 12, opacity: .75 }}>{tr("6 colorées + le cochonnet noir en dernier", "6 coloured darts + black jack last")}</p>}</section>}
    {mode === "tictac" && <section style={panel}><h3>{tr("Taille de la grille", "Grid size")}</h3><div style={{ display: "flex", gap: 8 }}>{([4, 5] as const).map((n) => <button key={n} type="button" style={gridSize === n ? button : secondary} onClick={() => setGridSize(n)}>{n} × {n} · {tr("aligner", "connect")} {n - 1}</button>)}</div></section>}
    {(["battle", "conquest"].includes(mode)) && <section style={panel}><h3>{tr("Format de match MSS", "MSS match format")}</h3><p style={{ opacity: .75, fontSize: 13 }}>{tr("Le nombre de manches nécessaires est une option MULTISPORTS SCORING, pas une règle officielle TOSSIT.", "The round-win goal is an MSS option, not an official TOSSIT rule.")}</p><div style={{ display: "flex", gap: 8 }}>{[3, 5, 7].map((n) => <button key={n} type="button" style={victoryTarget === n ? button : secondary} onClick={() => setVictoryTarget(n)}>{n} {tr("manches", "rounds")}</button>)}</div></section>}
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
  type BorderDart = { kind: "miss" | "wrong" | "valid"; cm: string };
  const [borderDarts, setBorderDarts] = React.useState<Record<string, BorderDart[]>>(() => Object.fromEntries(players.map((p) => [p.id, Array.from({ length: state.dartsPerPlayer }, () => ({ kind: "miss", cm: "" }))])));
  const saved = React.useRef(false);
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
    try {
      // Validate before scheduling React state updates: exceptions inside an
      // updater run during rendering and would bypass this error boundary.
      const next = applyTossitAction(state, action);
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
  const resetClassic = () => { setClosestDarts(1); setKiss(0); setFrenchKiss(0); setJackiss(false); setJackissExtra(0); setJumpover(false); setJackover(false); };
  const submitBorder = () => {
    const valid: Record<string, number[]> = {};
    const wrongSide: Record<string, number> = {};
    for (const player of state.players) {
      const throws = borderDarts[player.id] || [];
      valid[player.id] = [];
      wrongSide[player.id] = 0;
      for (const dart of throws) {
        if (dart.kind === "wrong") wrongSide[player.id]++;
        if (dart.kind === "valid") {
          const raw = dart.cm.trim();
          const value = Number(raw.replace(",", "."));
          if (!raw || !Number.isFinite(value) || value < 0 || value > 10000) {
            setError(tr("Saisissez une distance valide en cm pour chaque ventouse valide.", "Enter a valid distance in cm for each stuck dart."));
            return;
          }
          valid[player.id].push(value);
        }
      }
    }
    if (commit({ kind: "border", valid, wrongSide })) {
      setBorderDarts(Object.fromEntries(state.players.map((p) => [p.id, Array.from({ length: state.dartsPerPlayer }, () => ({ kind: "miss", cm: "" }))])));
    }
  };
  return <Layout><Header title={meta.title} mode={mode} onBack={() => go("tossit_config", { mode })} />
    <div style={{ textAlign: "center", fontSize: 12, color: ACCENT, letterSpacing: 1, fontWeight: 700 }}>{state.finished ? tr("PARTIE TERMINÉE", "GAME FINISHED") : `${tr(state.mode === "tictac" ? "TOUR" : "MANCHE", state.mode === "tictac" ? "TURN" : "ROUND")} ${state.events.length + 1}${["battle", "conquest"].includes(mode) ? ` • ${tr("PREMIER À", "FIRST TO")} ${state.victoryTarget} ${tr("MANCHES", "ROUNDS")}` : mode === "sniper" ? ` • ${tr("VICTOIRE IMMÉDIATE", "INSTANT WIN")}` : meta.target ? ` • ${tr("CIBLE", "TARGET")} ${meta.target}` : ` • ${state.gridSize}×${state.gridSize}`}`}</div>
    <ScoreCards state={state} />
    {(["battle", "conquest"].includes(mode)) && <p style={{ textAlign: "center", fontSize: 12, opacity: .75, marginTop: -6 }}>{tr("Scores = manches gagnées, pas des points de fléchettes.", "Scores = rounds won, not dart points.")}</p>}
    {state.finished ? <section style={{ ...panel, textAlign: "center", border: `2px solid ${ACCENT}` }}><h2>{state.winnerId ? `🏆 ${state.players.find((p) => p.id === state.winnerId)?.name}` : tr("MATCH NUL", "DRAW")}</h2><p>{tr("Résultat transmis à l'historique.", "Result sent to history.")}</p><div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}><button style={button} onClick={() => go("tossit_stats")}>{tr("Historique & stats", "History & stats")}</button><button style={secondary} onClick={() => go("games")}>{tr("Autre partie", "New game")}</button></div></section> : <>
      {mode === "classic" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>{tr("Résultat de la manche", "Round result")}</h3>
        <label style={{ display: "block", marginBottom: 8 }}>{tr("Joueur le plus proche", "Closest player")}
          <select style={input} value={roundWinner} onChange={(e) => setRoundWinner(e.target.value)}>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </label>
        <label>{tr("Ventouses collées par le vainqueur de la manche", "Round winner's stuck darts")}
          <select style={input} value={closestDarts} onChange={(e) => setClosestDarts(Number(e.target.value))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 10 }}>
          <label>Kiss (+2 chacun)<select style={input} value={kiss} onChange={(e) => setKiss(Number(e.target.value))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label>{tr("Bonus Jackiss supplémentaires", "Extra Jackiss points")}<select style={input} value={jackissExtra} onChange={(e) => setJackissExtra(Number(e.target.value))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>
        <label>French Kiss (+3 chacun)<select style={input} value={frenchKiss} onChange={(e) => setFrenchKiss(Number(e.target.value))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <div style={{ display: "grid", gap: 8, margin: "12px 0" }}>
          <label><input type="checkbox" checked={jackiss} onChange={(e) => setJackiss(e.target.checked)} /> Jackiss (+3 + extras)</label>
          <label><input type="checkbox" checked={jumpover} onChange={(e) => setJumpover(e.target.checked)} /> Jumpover (+9 et scores adverses remis à zéro)</label>
          <label><input type="checkbox" checked={jackover} onChange={(e) => setJackover(e.target.checked)} /> Jackover (victoire immédiate)</label>
        </div>
        <strong style={{ color: ACCENT, display: "block", marginBottom: 10 }}>+{closestDarts + kiss * 2 + frenchKiss * 3 + (jackiss ? 3 + jackissExtra : 0) + (jumpover ? 9 : 0)} points</strong>
        <button style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "classic", playerId: roundWinner, closestDarts, kiss, frenchKiss, jackiss, jackissExtra, jumpover, jackover })) resetClassic(); }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "speed" && <section style={panel}><h3>{tr("Lancers simultanés", "Simultaneous throws")}</h3>
        {players.map((p) => <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}><strong style={{ gridColumn: "1 / -1" }}>{p.name}</strong><label>{tr("Ventouses collées", "Stuck darts")}<select style={input} value={stuck[p.id] ?? 0} onChange={(e) => setStuck((v) => ({ ...v, [p.id]: Number(e.target.value) }))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></label><label>Kiss (+1)<select style={input} value={speedKiss[p.id] ?? 0} onChange={(e) => setSpeedKiss((v) => ({ ...v, [p.id]: Number(e.target.value) }))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></label></div>)}
        <label>Jumpover<select style={input} value={speedJumpoverWinner} onChange={(e) => setSpeedJumpoverWinner(e.target.value)}><option value="">{tr("Aucun", "None")}</option>{players.map((p) => <option key={p.id} value={p.id}>{p.name} ({tr("victoire immédiate", "instant win")})</option>)}</select></label>
        <button style={{ ...button, width: "100%", marginTop: 13 }} onClick={() => { if (commit({ kind: "speed", stuck, kiss: speedKiss, jumpoverWinnerId: speedJumpoverWinner || undefined })) { setStuck({}); setSpeedKiss({}); setSpeedJumpoverWinner(""); } }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "target" && <section style={panel}><h3>{tr("Au tour de", "Now playing")}: {targetActive?.name}</h3><p style={{ opacity: .75 }}>{tr("Touchez la valeur de chaque fléchette. 0 = manquée.", "Select each dart value. 0 = miss.")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>{[0, 1, 2, 3].map((v) => <button key={v} style={button} disabled={hits.length >= state.dartsPerPlayer} onClick={() => setHits((old) => old.length < state.dartsPerPlayer ? [...old, v] : old)}>{v}</button>)}</div>
        <p style={{ minHeight: 22 }}>{hits.map((v) => String(v)).join(" + ")} {hits.length ? `= ${hits.reduce((s, n) => s + n, 0) + (hits.length === state.dartsPerPlayer && hits.every((v) => v > 0) ? 1 : 0)}` : ""}</p>
        <div style={{ display: "flex", gap: 8 }}><button style={secondary} onClick={() => setHits((old) => old.slice(0, -1))}>{tr("Effacer", "Backspace")}</button><button style={{ ...button, flex: 1 }} disabled={hits.length !== state.dartsPerPlayer} onClick={() => commit({ kind: "target", hits })}>{tr("VALIDER LA VOLÉE", "CONFIRM THROWS")}</button></div>
      </section>}
      {mode === "duel" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>{tr("Au tour de", "Now playing")}: {targetActive?.name}</h3>
        <p style={{ opacity: .75 }}>{tr("Lancez vos 6 ventouses colorées sur le terrain adverse, puis le cochonnet noir en dernier.", "Throw 6 coloured darts on the other side, then the black jack last.")}</p>
        <label>{tr("Ventouses collées", "Stuck darts")}<select style={input} value={duelStuck} onChange={(e) => setDuelStuck(Number(e.target.value))}>{Array.from({ length: 7 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <label style={{ display: "block", margin: "14px 0" }}><input type="checkbox" checked={duelJack} onChange={(e) => setDuelJack(e.target.checked)} /> {tr("Cochonnet noir collé (sinon 0 point)", "Black jack stuck (otherwise zero points)")}</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <label>Kiss (+1)<select style={input} value={duelKiss} onChange={(e) => setDuelKiss(Number(e.target.value))}>{Array.from({ length: 7 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label>Jumpover (+3)<select style={input} value={duelJump} onChange={(e) => setDuelJump(Number(e.target.value))}>{Array.from({ length: 7 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>
        <strong style={{ color: ACCENT, display: "block", margin: "12px 0" }}>+{duelJack ? duelStuck + duelKiss + duelJump * 3 : 0} pts</strong>
        <button style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "duel", stuck: duelStuck, jackStuck: duelJack, kiss: duelKiss, jumpover: duelJump })) { setDuelStuck(0); setDuelJack(false); setDuelKiss(0); setDuelJump(0); } }}>{tr("VALIDER LE TOUR", "CONFIRM TURN")}</button>
      </section>}
      {mode === "border" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>CROSS THE BORDER</h3>
        <p style={{ opacity: .75 }}>{tr("Pour chaque ventouse, indiquez si elle a collé du bon côté et sa distance à la ligne (cm), du mauvais côté, ou si elle a raté.", "For each dart, choose valid with distance from the line (cm), wrong side, or missed.")}</p>
        {state.players.map((player) => <div key={player.id} style={{ padding: "8px 0 14px", borderTop: "1px solid #305858" }}>
          <strong>{player.name}</strong>
          {(borderDarts[player.id] || []).map((dart, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) minmax(0,1fr)", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span>{index + 1}</span>
            <select aria-label={`${player.name} ${index + 1}`} style={input} value={dart.kind} onChange={(e) => setBorderDarts((old) => ({ ...old, [player.id]: old[player.id].map((d, n) => n === index ? { ...d, kind: e.target.value as BorderDart["kind"] } : d) }))}>
              <option value="miss">{tr("Ratée", "Miss")}</option><option value="wrong">{tr("Mauvais côté", "Wrong side")}</option><option value="valid">{tr("Valide", "Valid")}</option>
            </select>
            {dart.kind === "valid" ? <input type="text" inputMode="decimal" aria-label={`${tr("Distance", "Distance")} ${player.name} ${index + 1}`} placeholder="cm" style={input} value={dart.cm} onChange={(e) => setBorderDarts((old) => ({ ...old, [player.id]: old[player.id].map((d, n) => n === index ? { ...d, cm: e.target.value } : d) }))} /> : <span style={{ opacity: .5, textAlign: "center" }}>—</span>}
          </div>)}
        </div>)}
        <button style={{ ...button, width: "100%" }} onClick={submitBorder}>{tr("CALCULER & VALIDER LA MANCHE", "SCORE ROUND")}</button>
      </section>}
      {mode === "tictac" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>{tr("Au tour de", "Now playing")}: {targetActive?.name}</h3>
        <p style={{ opacity: .75 }}>{tr("Touchez la case atteinte par la ventouse, même occupée. Sinon, indiquez un raté.", "Tap the cell actually hit, even if occupied. Otherwise record a miss.")}</p>
        <div role="group" aria-label="Tic Tac TOSSIT" style={{ display: "grid", gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))`, gap: 6, margin: "14px auto", maxWidth: 430 }}>
          {state.board.map((cell, index) => <button type="button" key={index} aria-label={`${tr("Case", "Cell")} ${index + 1}${cell ? ` ${state.players.find((p) => p.id === cell)?.name}` : ""}`} style={{ ...secondary, minWidth: 0, aspectRatio: "1", padding: 0, fontSize: "clamp(16px,5vw,30px)", fontWeight: 900, borderColor: cell ? (cell === state.players[0].id ? "#43E5EE" : "#FF67C9") : "#45606B", background: cell ? (cell === state.players[0].id ? "#0F505B" : "#5A204C") : "#0B252D" }} onClick={() => commit({ kind: "tictac", cell: index })}>{cell ? (cell === state.players[0].id ? "●" : "✦") : "·"}</button>)}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}><span style={{ color: "#43E5EE" }}>● {state.players[0]?.name}</span><span style={{ color: "#FF67C9" }}>✦ {state.players[1]?.name}</span><span style={{ opacity: .65 }}>{tr("Aligner", "Connect")} {state.gridSize - 1}</span></div>
        <button style={{ ...secondary, width: "100%" }} onClick={() => commit({ kind: "tictac", cell: null })}>{tr("VENTOUSE MANQUÉE / TOUR PASSÉ", "MISSED DART / PASS TURN")}</button>
      </section>}
      {mode === "battle" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>⚔️ BATTLE MODE</h3>
        <p style={{ opacity: .8, fontSize: 13 }}>{tr("Comptez les ventouses colorées réellement collées. Le meilleur total désigne qui lance la noire. En cas d'égalité, départagez avec pierre-feuille-ciseaux.", "Count stuck coloured darts. Most stuck throws the black jack. On a tie, use rock-paper-scissors.")}</p>
        {state.players.map((p) => <label key={p.id} style={{ display: "block", marginBottom: 8 }}>{p.name} · {tr("ventouses collées", "stuck darts")}
          <select style={input} value={battleStuck[p.id] ?? 0} onChange={(e) => setBattleStuck(v => ({ ...v, [p.id]: Number(e.target.value) }))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, n) => <option value={n} key={n}>{n}</option>)}</select>
        </label>)}
        {(battleStuck[players[0].id] ?? 0) === (battleStuck[players[1].id] ?? 0) && <label style={{ display: "block", marginBottom: 10 }}>{tr("Gagnant pierre-feuille-ciseaux", "Rock-paper-scissors winner")}
          <select style={input} value={battleTieWinner} onChange={e => setBattleTieWinner(e.target.value)}><option value="">{tr("Sélectionner…", "Select…")}</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </label>}
        <p style={{ color: ACCENT, fontWeight: 800 }}>{tr("Lance la noire", "Throws black jack")}: {(() => { const [a, b] = players; const sa = battleStuck[a.id] ?? 0, sb = battleStuck[b.id] ?? 0; return sa === sb ? (players.find(p => p.id === battleTieWinner)?.name || "—") : (sa > sb ? a : b).name; })()}</p>
        <label style={{ display: "block", marginBottom: 12 }}><input type="checkbox" checked={battleJack} onChange={e => { setBattleJack(e.target.checked); setBattleClosest(""); }} /> {tr("Cochonnet noir bien collé", "Black jack stuck")}</label>
        {battleJack && (battleStuck[players[0].id] ?? 0) + (battleStuck[players[1].id] ?? 0) > 0 && <label style={{ display: "block", marginBottom: 12 }}>{tr("Couleur la plus proche de la noire", "Coloured dart closest to black jack")}
          <select style={input} value={battleClosest} onChange={e => setBattleClosest(e.target.value)}><option value="">{tr("Sélectionner…", "Select…")}</option>{players.filter(p => (battleStuck[p.id] ?? 0) > 0).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </label>}
        <button style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "battle", stuck: battleStuck, tieWinnerId: (battleStuck[players[0].id] ?? 0) === (battleStuck[players[1].id] ?? 0) ? battleTieWinner || undefined : undefined, jackStuck: battleJack, closestPlayerId: battleJack ? battleClosest || undefined : undefined })) { setBattleStuck({}); setBattleTieWinner(""); setBattleJack(false); setBattleClosest(""); } }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "sniper" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>🎯 EL SNIPER</h3>
        <p style={{ opacity: .8, fontSize: 13 }}>{tr("Tous les joueurs lancent librement vers la Mega dart. Enregistrez seulement un essai infructueux ou la première réussite constatée.", "All players throw freely at the Mega dart. Record an unsuccessful attempt or the first verified successful stack.")}</p>
        <label style={{ display: "block", marginBottom: 10 }}>{tr("Résultat observé", "Observed result")}
          <select style={input} value={sniperOutcome} onChange={e => setSniperOutcome(e.target.value as "miss" | "mega" | "ultimate")}>
            <option value="miss">{tr("Aucun empilement – continuer", "No stack – continue")}</option>
            <option value="mega">{tr("Ventouse posée sur la Mega dart – victoire", "Dart stacked on Mega dart – win")}</option>
            <option value="ultimate">{tr("ULTIMATE TRICK – double empilement – victoire", "ULTIMATE TRICK – double stack – win")}</option>
          </select>
        </label>
        {sniperOutcome !== "miss" && <label style={{ display: "block", marginBottom: 10 }}>{tr("Joueur ayant réussi en premier", "First successful player")}
          <select style={input} value={sniperWinner} onChange={e => setSniperWinner(e.target.value)}><option value="">{tr("Sélectionner…", "Select…")}</option>{state.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </label>}
        <button style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "sniper", outcome: sniperOutcome, playerId: sniperOutcome !== "miss" ? sniperWinner || undefined : undefined })) { setSniperOutcome("miss"); setSniperWinner(""); } }}>{tr("VALIDER LE RÉSULTAT", "CONFIRM RESULT")}</button>
      </section>}
      {mode === "conquest" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>🌈 COLOR CONQUEST</h3>
        <p style={{ opacity: .8, fontSize: 13 }}>{tr("Choisissez la couleur annoncée et le nombre à coller dans la zone de chaque équipe. Seules les ventouses de la couleur demandée comptent.", "Choose the called colour and the number to stick in each team's area. Only darts of the called colour count.")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 9 }}>
          <label>{tr("Couleur demandée", "Called colour")}<select style={input} value={conquestColor} onChange={e => setConquestColor(e.target.value)}>{TOSSIT_COLORS.map(color => <option key={color} value={color}>{color}</option>)}</select></label>
          <label>{tr("Nombre à atteindre", "Required darts")}<select style={input} value={Math.min(conquestRequired, state.dartsPerPlayer)} onChange={e => setConquestRequired(Number(e.target.value))}>{Array.from({ length: state.dartsPerPlayer }, (_, n) => <option value={n + 1} key={n + 1}>{n + 1}</option>)}</select></label>
        </div>
        {state.players.map(p => <label key={p.id} style={{ display: "block", marginTop: 12 }}>{p.name} · {tr("ventouses de cette couleur collées", "matching darts stuck")}
          <select style={input} value={conquestStuck[p.id] ?? 0} onChange={e => setConquestStuck(v => ({ ...v, [p.id]: Number(e.target.value) }))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, n) => <option value={n} key={n}>{n}</option>)}</select>
        </label>)}
        {state.players.every(p => (conquestStuck[p.id] ?? 0) >= Math.min(conquestRequired, state.dartsPerPlayer)) && <label style={{ display: "block", marginTop: 12 }}>{tr("Quelle équipe a réussi en premier ?", "Which team completed first?")}
          <select style={input} value={conquestFirst} onChange={e => setConquestFirst(e.target.value)}><option value="">{tr("Sélectionner…", "Select…")}</option>{state.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </label>}
        <button style={{ ...button, width: "100%", marginTop: 14 }} onClick={() => { if (commit({ kind: "conquest", color: conquestColor, required: Math.min(conquestRequired, state.dartsPerPlayer), stuck: conquestStuck, firstId: state.players.every(p => (conquestStuck[p.id] ?? 0) >= Math.min(conquestRequired, state.dartsPerPlayer)) ? conquestFirst || undefined : undefined })) { setConquestStuck({}); setConquestFirst(""); } }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "river" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>🌊 RIVER — {targetActive.name}</h3>
        <p style={{ opacity: .78, fontSize: 13 }}>{tr("Relevez chaque ventouse. La valeur d'une zone dépend de votre tapis. Votre camp attribue les points à l'adversaire ; toucher la rivière arrête immédiatement le tour.", "Record each dart. Zone values come from your mat. Landing in your own camp awards the opponent; touching the river immediately ends your turn.")}</p>
        {riverLandings.map((hit, i) => { const cutAt = riverLandings.findIndex(x => x.kind === "river"); return cutAt >= 0 && i > cutAt ? null : <div key={i} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) 85px", gap: 8, alignItems: "center", marginBottom: 7 }}>
          <span>{i + 1}.</span><select aria-label={`${tr("Ventouse", "Dart")} ${i + 1}`} style={input} value={hit.kind} onChange={e => setRiverLandings(v => v.map((x, idx) => idx === i ? { kind: e.target.value as RiverLanding["kind"], points: 0 } : x))}>
            <option value="miss">{tr("Ratée", "Miss")}</option><option value="opponent">{tr("Camp adverse", "Opponent side")}</option><option value="own">{tr("Mon camp (pénalité)", "Own side (penalty)")}</option><option value="river">{tr("RIVIÈRE — fin du tour", "RIVER — end turn")}</option>
          </select><input aria-label={`${tr("Valeur", "Value")} ${i + 1}`} type="number" min={0} max={100} step={1} disabled={hit.kind === "miss" || hit.kind === "river"} style={input} value={hit.points} onChange={e => setRiverLandings(v => v.map((x, idx) => idx === i ? { ...x, points: Number(e.target.value) } : x))}/>
        </div>; })}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}><label>Kiss (+2) <select style={{ ...input, width: 75 }} value={riverKiss} onChange={e => setRiverKiss(Number(e.target.value))}>{Array.from({ length: state.dartsPerPlayer + 1 }, (_, i) => <option key={i}>{i}</option>)}</select></label><label><input type="checkbox" checked={riverJump} onChange={e => setRiverJump(e.target.checked)} /> Jumpover (+9)</label></div>
        <button style={{ ...button, width: "100%", marginTop: 14 }} onClick={() => { const cutAt = riverLandings.findIndex(x => x.kind === "river"); const landings = cutAt >= 0 ? riverLandings.slice(0, cutAt + 1) : riverLandings; if (commit({ kind: "river", landings, kiss: riverKiss, jumpover: riverJump })) { setRiverLandings(Array.from({ length: state.dartsPerPlayer }, (): RiverLanding => ({ kind: "miss", points: 0 }))); setRiverKiss(0); setRiverJump(false); } }}>{tr("VALIDER LE TOUR", "CONFIRM TURN")}</button>
      </section>}
      {mode === "cornhole" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>🎯 CORNHOLE</h3>
        <p style={{ fontSize: 13, opacity: .78 }}>{tr("Chaque équipe lance trois ventouses : trou +3, planche +1, ratée 0. Si les trois vont dans le trou, ajoutez la série de relance. Kiss +1 et Jumpover multiplient le total de manche.", "Each side throws 3 darts: hole +3, board +1, miss 0. If all three land in the hole, add the immediate extra set. Kiss +1; Jumpovers multiply the round subtotal.")}</p>
        {state.players.map(p => { const darts = cornThrows[p.id] ?? ["miss", "miss", "miss"]; const canRethrow = darts.length < 30 && darts.slice(-3).every(x => x === "hole"); return <div key={p.id} style={{ ...panel, marginBottom: 10 }}>
          <strong>{p.name}</strong><div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, margin: "10px 0" }}>
            {darts.map((hit, i) => <label key={i} style={{ fontSize: 12 }}>{i + 1}<select style={input} value={hit} onChange={e => setCornThrows(v => ({ ...v, [p.id]: darts.map((x, idx) => idx === i ? e.target.value as CornholeLanding : x) }))}><option value="miss">0 · {tr("Ratée", "Miss")}</option><option value="board">1 · {tr("Planche", "Board")}</option><option value="hole">3 · {tr("Trou", "Hole")}</option></select></label>)}
          </div>
          {canRethrow && <button style={secondary} onClick={() => setCornThrows(v => ({ ...v, [p.id]: [...darts, "miss", "miss", "miss"] as CornholeLanding[] }))}>+ {tr("Série de 3 relances", "3 extra throws")}</button>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 8 }}><label>Kiss (+1)<select style={input} value={cornKiss[p.id] ?? 0} onChange={e => setCornKiss(v => ({ ...v, [p.id]: Number(e.target.value) }))}>{Array.from({ length: darts.length + 1 }, (_, i) => <option key={i}>{i}</option>)}</select></label><label>Jumpover (×2, ×3…)<select style={input} value={cornJump[p.id] ?? 0} onChange={e => setCornJump(v => ({ ...v, [p.id]: Number(e.target.value) }))}>{Array.from({ length: darts.length + 1 }, (_, i) => <option key={i}>{i}</option>)}</select></label></div>
        </div>; })}
        <p style={{ opacity: .73, fontSize: 12 }}>{tr("Annulation : seul l'écart des deux manches est marqué. Plus de 21 → 13 ; second bust consécutif → 0.", "Cancellation scoring: only the round difference counts. Over 21 → 13; consecutive bust → 0.")}</p>
        <button style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "cornhole", throws: cornThrows, kiss: Object.fromEntries(players.map(p => [p.id, cornKiss[p.id] ?? 0])), jumpover: Object.fromEntries(players.map(p => [p.id, cornJump[p.id] ?? 0])) })) { setCornThrows(Object.fromEntries(players.map(p => [p.id, ["miss", "miss", "miss"] as CornholeLanding[]]))); setCornKiss({}); setCornJump({}); } }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
      </section>}
      {mode === "goalkeeper" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>⚽ GOALKEEPER — {targetActive.name}</h3>
        <p style={{ opacity: .75, fontSize: 13 }}>{tr("Saisissez les valeurs de trois fléchettes. Coin supérieur ou entre les jambes +3, au-dessus du but +2, côté +1, gardien −1, ratée 0.", "Record 3 darts. Top corner or between the legs +3, over goal +2, side +1, goalkeeper −1, miss 0.")}</p>
        {goalZones.map((hit, i) => <label key={i} style={{ display: "block", marginBottom: 10 }}>{tr("Ventouse", "Dart")} {i + 1}<select style={input} value={hit} onChange={e => setGoalZones(v => v.map((x, idx) => idx === i ? Number(e.target.value) : x))}>
          <option value={0}>0 — {tr("Ratée", "Miss")}</option><option value={1}>+1 — {tr("Côté du but", "Goal side")}</option><option value={2}>+2 — {tr("Au-dessus du but", "Above goal")}</option><option value={3}>+3 — {tr("Coin haut / entre les jambes", "Top corner / between legs")}</option><option value={-1}>−1 — {tr("Gardien", "Goalkeeper")}</option>
        </select></label>)}
        <strong style={{ color: ACCENT, display: "block", marginBottom: 10 }}>{tr("Total", "Total")} {goalZones.reduce((n,v)=>n+v,0)} pts</strong>
        <button style={{ ...button, width: "100%" }} onClick={() => { if (commit({ kind: "goalkeeper", zones: goalZones })) setGoalZones([0,0,0]); }}>{tr("VALIDER LES 3 TIRS", "CONFIRM 3 THROWS")}</button>
      </section>}
      {mode === "football_pitch" && <section style={panel}>
        <h3 style={{ marginTop: 0 }}>⚽ FOOTBALL PITCH</h3>
        <p style={{ color: ACCENT, fontWeight: 800 }}>{tr("Attaquant", "Attacker")}: {players.find(p => p.id === state.pitch.attackerId)?.name} · {tr("Tentative", "Drive")} {state.pitch.drive}</p>
        <p style={{ opacity: .76, fontSize: 13 }}>{tr("Chemin confirmé", "Confirmed path")}: {state.pitch.chainLength} · {tr("Balles défendues", "Blocked darts")}: {state.pitch.blocks} · {tr("Attaquant", "Attacker")}: {state.pitch.attackerThrows}/6 · {tr("Défenseur", "Defender")}: {state.pitch.defenderThrows}/6</p>
        <strong style={{ display: "block", marginBottom: 10 }}>{tr("Au tour de", "Now playing")}: {targetActive.name} — {targetActive.id === state.pitch.attackerId ? tr("ATTAQUE", "ATTACK") : tr("DÉFENSE", "DEFENCE")}</strong>
        <p style={{ opacity: .75, fontSize: 12 }}>{tr("Validez vous-même la continuité des contacts entre ventouses. L'application ne mesure pas automatiquement la trajectoire.", "Manually confirm connected darts. The app does not automatically detect the path.")}</p>
        <select style={input} value={pitchOutcome} onChange={e => setPitchOutcome(e.target.value as typeof pitchOutcome)}>
          <option value="miss">{tr("Ratée / hors-jeu", "Miss / out")}</option>
          {targetActive.id === state.pitch.attackerId ? <>
            {!state.pitch.chainLength && <option value="centre">{tr("Ventouse au centre — départ", "Dart in centre — start")}</option>}
            {state.pitch.chainLength > 0 && <option value="linked">{tr("Ventouse connectée à la chaîne", "Connected dart added")}</option>}
            {state.pitch.chainLength > 0 && !state.pitch.longPassUsed && <option value="longpass">{tr("Passe longue validée", "Verified long pass")}</option>}
            {state.pitch.chainLength > 0 && <option value="goal">{tr("Chaîne jusqu'au but — BUT !", "Path reaches goal — GOAL!")}</option>}
          </> : <option value="block">{tr("Défense : ventouse de blocage", "Defence: blocking dart")}</option>}
        </select>
        <button style={{ ...button, width: "100%", marginTop: 12 }} onClick={() => { if (commit({ kind: "football_pitch", outcome: pitchOutcome })) setPitchOutcome("miss"); }}>{tr("VALIDER LE LANCER", "CONFIRM THROW")}</button>
      </section>}
      <button style={{ ...secondary, width: "100%" }} disabled={state.events.length === 0} onClick={() => { setState((old) => undoTossitAction(old)); setError(""); }}>{tr("ANNULER LA DERNIÈRE MANCHE", "UNDO LAST ROUND")}</button>
    </>}
    {error && <p role="alert" style={{ color: "#FFD3A0" }}>{error}</p>}
    {state.events.length > 0 && <section style={{ ...panel, marginTop: 14 }}><h3>{tr("Déroulement", "Round history")}</h3>{state.events.slice().reverse().map((event) => <p key={event.index} style={{ borderBottom: "1px solid #29494B", paddingBottom: 6, fontSize: 13 }}>#{event.index} — {event.explanation}</p>)}</section>}
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
  return <Layout><Header title={tr("HISTORIQUE & STATS", "HISTORY & STATS")} mode="games" onBack={() => go("games")} />
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
