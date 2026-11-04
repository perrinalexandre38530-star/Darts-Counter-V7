import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import { History } from "../../lib/history";
import { scopedStorageKey } from "../../lib/storage";
import { PageAdBanner } from "../../monetization/AdSlot";
import {
  TOSSIT_MODES, TOSSIT_PLANNED, applyTossitAction, newTossitGame, summaryForTossit, undoTossitAction,
  type TossitMode, type TossitPlayer, type TossitState,
} from "./tossitEngine";
import tickerMenu from "../../assets/tickers/ticker_tossit_games.webp";
import tickerClassic from "../../assets/tickers/ticker_tossit_classic.webp";
import tickerSpeed from "../../assets/tickers/ticker_tossit_speed.webp";
import tickerTarget from "../../assets/tickers/ticker_tossit_target.webp";

const ART: Record<TossitMode | "games", string> = { games: tickerMenu, classic: tickerClassic, speed: tickerSpeed, target: tickerTarget, duel: tickerMenu, border: tickerTarget, tictac: tickerTarget };
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
      !Number.isInteger(draft.dartsPerPlayer) || draft.dartsPerPlayer < 3 || draft.dartsPerPlayer > 6 ||
      !Array.isArray(draft.board) || draft.board.length !== (draft.gridSize || 4) ** 2 ||
      draft.players.some((player: TossitPlayer) => !player?.id || !player?.name)) return null;
    // A persisted in-progress game never carries a recursive Undo graph.
    return { ...draft, previous: null } as TossitState;
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
};
function useCopy() {
  const { lang } = useLang();
  const english = String(lang || "fr").toLowerCase().split("-")[0] !== "fr";
  return (fr: string, en: string) => english ? en : fr;
}
function Header({ title, mode, onBack }: { title: string; mode: TossitMode | "games"; onBack: () => void }) {
  const { theme } = useTheme();
  return <div style={{ position: "relative", marginBottom: 14 }}>
    <img src={ART[mode]} alt={`TOSSIT • ${title}`} style={{ width: "100%", height: "clamp(90px,23vw,140px)", objectFit: "cover", borderRadius: 15, display: "block", border: `1px solid ${theme.borderSoft || "#ffffff33"}` }} />
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
function ScoreCards({ state }: { state: TossitState }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(126px,1fr))", gap: 8, margin: "12px 0" }}>
    {state.players.map((p, index) => <div key={p.id} style={{ ...panel, border: state.winnerId === p.id ? `2px solid ${ACCENT}` : ["target", "duel", "tictac"].includes(state.mode) && index === state.nextPlayerIndex && !state.finished ? `2px solid ${ACCENT}` : "1px solid #45606B", textAlign: "center", margin: 0 }}>
      <div style={{ fontSize: 12, opacity: .8 }}>{p.name}</div><div style={{ fontSize: 38, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{state.scores[p.id] ?? 0}</div>{state.winnerId === p.id ? <strong style={{ color: ACCENT }}>GAGNANT</strong> : null}
    </div>)}
  </div>;
}
export function TossitMenu({ go }: { go: (route: any, params?: any) => void }) {
  const tr = useCopy();
  const [draft] = React.useState<TossitState | null>(readDraft);
  return <Layout><Header title="GAMES" mode="games" onBack={() => go("gameSelect")} />
    {draft && <section style={{ ...panel, border: "1px solid #48E7CF" }}>
      <strong>{tr("Partie TOSSIT interrompue", "Interrupted TOSSIT match")}</strong>
      <p style={{ opacity: .8, fontSize: 13 }}>{TOSSIT_MODES.find((m) => m.id === draft.mode)?.title} · {draft.players.map((p) => p.name).join(" / ")} · {draft.events.length} {tr("tours validés", "confirmed turns")}</p>
      <button style={button} onClick={() => go("tossit_play", { mode: draft.mode, resume: true })}>{tr("REPRENDRE LA PARTIE", "RESUME MATCH")}</button>
      <p style={{ opacity: .65, fontSize: 11 }}>{tr("Brouillon conservé uniquement sur cet appareil.", "Draft stored on this device only.")}</p>
    </section>}
    <h2 style={{ margin: "16px 0 5px" }}>{tr("TOSSIT • MODES DE JEU", "TOSSIT • GAME MODES")}</h2>
    <p style={{ opacity: .76 }}>{tr("Les premières variantes sont jouables avec saisie manuelle du résultat des lancers.", "The first modes are playable with manual throw scoring.")}</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
    {TOSSIT_MODES.map((mode) => <button key={mode.id} type="button" style={{ ...panel, textAlign: "left", color: "white", cursor: "pointer", padding: 0, overflow: "hidden" }} onClick={() => go("tossit_config", { mode: mode.id })}>
      <img src={ART[mode.id]} alt="" style={{ display: "block", width: "100%", height: 90, objectFit: "cover" }} />
      <div style={{ padding: 14 }}><strong>{mode.title}</strong><p style={{ opacity: .78, fontSize: 13 }}>{mode.description}</p><span style={{ color: ACCENT, fontWeight: 800 }}>{tr("JOUER", "PLAY")} · {mode.target ? `${mode.target} pts` : tr("alignement", "line game")}</span></div>
    </button>)}
    </div>
    <h3 style={{ marginTop: 20 }}>{tr("AU CATALOGUE • EN PRÉPARATION", "CATALOGUE • IN DEVELOPMENT")}</h3>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
      {TOSSIT_PLANNED.map((mode) => <div key={mode.title} style={{ ...panel, opacity: .76 }}><strong>{mode.title}</strong><small style={{ float: "right", color: ACCENT }}>SOON</small><p style={{ fontSize: 13 }}>{mode.description}</p></div>)}
    </div>
    <button style={secondary} onClick={() => go("tossit_stats")}>{tr("Historique & statistiques TOSSIT", "TOSSIT history & statistics")}</button>
    <PageAdBanner />
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
  const [darts, setDarts] = React.useState(mode === "duel" ? 6 : 3);
  const [gridSize, setGridSize] = React.useState<4 | 5>(4);
  const maxPlayers = (["speed", "duel", "border", "tictac"].includes(mode)) ? 2 : mode === "target" ? 4 : 6;
  const addPlayer = () => setPlayers((current) => {
    if (current.length >= maxPlayers) return current;
    let guestNumber = 1;
    while (current.some((player) => player.id === `tossit-guest-${guestNumber}`)) guestNumber++;
    return [...current, { id: `tossit-guest-${guestNumber}`, name: `${tr("Joueur", "Player")} ${current.length + 1}` }];
  });
  return <Layout><Header title={meta.title} mode={mode} onBack={() => go("games")} />
    <div style={panel}><h2 style={{ margin: "0 0 8px" }}>{meta.title}</h2><p>{meta.description}</p><p style={{ fontSize: 13, opacity: .8 }}>{tinfo[mode]}</p></div>
    <section style={panel}><h3>{tr("Participants", "Players")} ({players.length})</h3>
      {players.map((p, index) => <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <span style={{ minWidth: 22, color: ACCENT }}>{index + 1}</span>
        <input aria-label={`${tr("Joueur", "Player")} ${index + 1}`} value={p.name} style={input} onChange={(e) => setPlayers((v) => v.map((x, n) => n === index ? { ...x, name: e.target.value } : x))} />
        {players.length > (mode === "target" ? 1 : 2) && <button type="button" aria-label="Retirer le joueur" style={secondary} onClick={() => setPlayers((v) => v.filter((_, n) => n !== index))}>×</button>}
      </div>)}
      {players.length < maxPlayers && <button style={secondary} onClick={addPlayer}>+ {tr("Ajouter un joueur", "Add a player")}</button>}
      {profiles.length > 0 && <p style={{ fontSize: 12, opacity: .7 }}>{tr("Les profils existants sont proposés par défaut. Modifier leur nom conserve leur identifiant de profil.", "Existing profiles are preselected. Editing a name retains its profile ID.")}</p>}
    </section>
    {mode !== "tictac" && <section style={panel}><h3>{tr("Ventouses par joueur", "Darts per player")}</h3><div style={{ display: "flex", gap: 8 }}>{(mode === "duel" ? [6] : [3, 4, 5, 6]).map((n) => <button key={n} type="button" style={n === darts ? button : secondary} onClick={() => setDarts(n)}>{n}</button>)}</div>{mode === "duel" && <p style={{ fontSize: 12, opacity: .75 }}>{tr("6 colorées + le cochonnet noir en dernier", "6 coloured darts + black jack last")}</p>}</section>}
    {mode === "tictac" && <section style={panel}><h3>{tr("Taille de la grille", "Grid size")}</h3><div style={{ display: "flex", gap: 8 }}>{([4, 5] as const).map((n) => <button key={n} type="button" style={gridSize === n ? button : secondary} onClick={() => setGridSize(n)}>{n} × {n} · {tr("aligner", "connect")} {n - 1}</button>)}</div></section>}
    <button style={{ ...button, width: "100%" }} disabled={players.some((p) => !p.name.trim())} onClick={() => go("tossit_play", { mode, players: players.map((p) => ({ ...p, name: p.name.trim() })), darts, gridSize })}>{tr("LANCER LA PARTIE", "START GAME")}</button>
  </Layout>;
}

export function TossitPlay({ go, params, onFinish }: { go: (route: any, params?: any) => void; params?: any; onFinish?: (match: any) => void }) {
  const tr = useCopy();
  const resumeState = React.useMemo(() => params?.resume ? readDraft() : null, [params?.resume]);
  const mode: TossitMode = resumeState?.mode ?? (TOSSIT_MODES.some((x) => x.id === params?.mode) ? params.mode : "classic");
  const players: TossitPlayer[] = resumeState?.players ?? (Array.isArray(params?.players) && params.players.length ? params.players : [{ id: "tossit-guest-1", name: "Joueur 1" }, { id: "tossit-guest-2", name: "Joueur 2" }]);
  const [state, setState] = React.useState<TossitState>(() => resumeState ?? newTossitGame(mode, players, Number(params?.darts) || 3, Date.now(), params?.gridSize === 5 ? 5 : 4));
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
    <div style={{ textAlign: "center", fontSize: 12, color: ACCENT, letterSpacing: 1, fontWeight: 700 }}>{state.finished ? tr("PARTIE TERMINÉE", "GAME FINISHED") : `${tr(state.mode === "tictac" ? "TOUR" : "MANCHE", state.mode === "tictac" ? "TURN" : "ROUND")} ${state.events.length + 1}${meta.target ? ` • ${tr("CIBLE", "TARGET")} ${meta.target}` : ` • ${state.gridSize}×${state.gridSize}`}`}</div>
    <ScoreCards state={state} />
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
        <button style={{ ...button, width: "100%", marginTop: 13 }} onClick={() => { commit({ kind: "speed", stuck, kiss: speedKiss, jumpoverWinnerId: speedJumpoverWinner || undefined }); setStuck({}); setSpeedKiss({}); setSpeedJumpoverWinner(""); }}>{tr("VALIDER LA MANCHE", "CONFIRM ROUND")}</button>
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
  const wins: Record<string, { name: string; games: number; wins: number; points: number }> = {};
  matches.forEach((r) => { const people = Array.isArray(r.players) ? r.players : [];
    people.forEach((p: any) => { const id = String(p.id); if (!id) return; const entry = wins[id] || { name: String(p.name || id), games: 0, wins: 0, points: 0 }; entry.games += 1; entry.wins += String(r.winnerId || r.summary?.winnerId) === id ? 1 : 0; entry.points += Number(r.summary?.scores?.[id] || 0); wins[id] = entry; });
  });
  return <Layout><Header title={tr("HISTORIQUE & STATS", "HISTORY & STATS")} mode="games" onBack={() => go("games")} />
    <h2>{tr("Statistiques TOSSIT", "TOSSIT statistics")}</h2><section style={panel}><strong>{tr("Parties enregistrées", "Recorded games")}</strong><div style={{ fontSize: 34, fontWeight: 900, color: ACCENT }}>{matches.length}</div></section>
    {loading && <p>{tr("Chargement de l'historique…", "Loading history…")}</p>}
    <h3>{tr("Classement joueurs", "Player ranking")}</h3>{Object.values(wins).sort((a, b) => b.wins - a.wins).map((p) => <div key={p.name} style={{ ...panel, display: "flex", justifyContent: "space-between" }}><strong>{p.name}</strong><span>{p.wins}/{p.games} {tr("victoires", "wins")} · {p.points} pts</span></div>)}
    <h3>{tr("Dernières parties", "Recent matches")}</h3>{matches.slice(0, 40).map((r) => <div key={r.id} style={panel}><strong>{String(r.summary?.mode || r.payload?.mode || "tossit").toUpperCase()}</strong><span style={{ float: "right", fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</span><p style={{ marginBottom: 0 }}>{tr("Vainqueur", "Winner")}: {(r.players || []).find((p: any) => String(p.id) === String(r.winnerId || r.summary?.winnerId))?.name || "—"}</p></div>)}
    {!loading && !matches.length && <p>{tr("Aucune partie TOSSIT terminée pour le moment.", "No finished TOSSIT games yet.")}</p>}
    <button style={button} onClick={() => go("games")}>{tr("JOUER", "PLAY")}</button>
  </Layout>;
}
