// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { useTheme } from "../contexts/ThemeContext";
import scratchTicketPreview from "../assets-webp/games/loterie-ticket-scratch-v2.png";
import {
  bestCardProgress,
  buildPlayerStates,
  cardProgress,
  dartLabel,
  dartScore,
  hasWon,
  revealResult,
  volleyScore,
  type LoterieConfig,
  type LoterieDart,
  type LoteriePlayerState,
} from "../lib/loterie";

const GOLD = "#f6c256";
const PINK = "#ff67bc";
const CYAN = "#45d8ff";
const GOOD = "#70efbd";
const BAD = "#ff718a";
const PANEL = "linear-gradient(180deg,rgba(23,24,29,.96),rgba(8,9,12,.98))";

const DEFAULT_CONFIG: LoterieConfig = {
  variant: "classic",
  level: "auto",
  autoMode: "balanced",
  volleyMode: "strict3",
  expressTarget: "simple",
  cardsPerPlayer: 2,
  cellsPerCard: 10,
  startOrderMode: "random",
};

function nameOf(p: any) { return String(p?.displayName ?? p?.name ?? p?.nickname ?? "Joueur"); }
function avatarOf(p: any) { return p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? null; }

function Avatar({ p, size = 54 }: any) {
  const src = avatarOf(p);
  const name = nameOf(p);
  return <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: `1px solid ${GOLD}85`, background: "rgba(255,255,255,.06)", display: "grid", placeItems: "center", color: GOLD, fontWeight: 1000, flex: "0 0 auto" }}>{src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.slice(0,2).toUpperCase()}</div>;
}

function makeFallbackPlayers(store: any): any[] {
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const activeId = store?.activeProfileId != null ? String(store.activeProfileId) : null;
  const active = activeId ? profiles.find((p: any) => String(p?.id) === activeId) : profiles[0];
  return active ? [{ ...active, id: String(active.id), name: nameOf(active), avatarDataUrl: avatarOf(active) }] : [{ id: "player_1", name: "Joueur 1" }];
}

function compactConfigLabel(config: LoterieConfig, player?: LoteriePlayerState | null) {
  if (config.variant === "express") return `EXPRESS · ${config.expressTarget.toUpperCase()} · ${config.cardsPerPlayer} carton${config.cardsPerPlayer > 1 ? "s" : ""}`;
  return `${config.volleyMode === "strict3" ? "3 DARTS" : "VOLÉE LIBRE"} · ${player ? `${player.targetMin}–${player.targetMax}` : config.level.toUpperCase()} · ${config.cardsPerPlayer} carton${config.cardsPerPlayer > 1 ? "s" : ""}`;
}

function playerSummary(p: LoteriePlayerState, winnerId: string | null) {
  const visits = p.stats.visits || 0;
  const best = bestCardProgress(p);
  return {
    id: p.id,
    playerId: p.id,
    profileId: p.id,
    name: p.name,
    avatarDataUrl: avatarOf(p),
    win: p.id === winnerId,
    winner: p.id === winnerId,
    rank: p.id === winnerId ? 1 : 2,
    score: p.stats.cellsRevealed,
    points: p.stats.cellsRevealed,
    cardsCount: p.cards.length,
    cardsCompleted: p.stats.cardsCompleted,
    bestCardProgress: best,
    cellsPerCard: p.cards[0]?.cells?.length || 0,
    cellsRevealed: p.stats.cellsRevealed,
    visits,
    dartsThrown: p.stats.dartsThrown,
    successfulVisits: p.stats.successfulVisits,
    emptyVisits: p.stats.emptyVisits,
    hitCount: p.stats.successfulVisits,
    hits: p.stats.successfulVisits,
    misses: p.stats.emptyVisits,
    hitRate: visits ? p.stats.successfulVisits / visits : 0,
    multiHits: p.stats.multiHits,
    maxCellsInVisit: p.stats.maxCellsInVisit,
    bestStreak: p.stats.bestStreak,
    totalVolleyScore: p.stats.totalVolleyScore,
    averageVolley: visits ? p.stats.totalVolleyScore / visits : 0,
    maxVolley: p.stats.maxVolley,
    completedOnVisit: p.stats.completedOnVisit,
    targetMin: p.targetMin,
    targetMax: p.targetMax,
    cards: p.cards.map((c) => ({ id: c.id, progress: cardProgress(c), total: c.cells.length, cells: c.cells.map((x) => ({ key: x.key, value: x.value, label: x.label, revealed: x.revealed })) })),
  };
}

function ScratchCell({ cell, idx, recent }: any) {
  const covered = !cell?.revealed;
  return (
    <div style={{ position: "relative", minHeight: covered ? 82 : 88, transform: recent ? "translateZ(0)" : undefined, animation: recent ? "lotScratchReveal .55s ease both" : undefined }}>
      <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", width: 28, height: 28, borderRadius: "50%", background: "#141414", color: "#f8edd0", border: "2px solid #d1a84d", display: "grid", placeItems: "center", fontWeight: 1000, fontSize: 10, zIndex: 2, boxShadow: recent ? "0 0 0 5px rgba(242,191,84,.18)" : "none" }}>{idx + 1}</div>
      <div style={{ height: "100%", borderRadius: 16, border: `1px solid ${covered ? "#9f8860" : "#d1a84d"}`, background: covered ? "linear-gradient(145deg,#c7c9ce,#a7adb3 45%,#8d9399)" : "linear-gradient(180deg,#fcf1d7,#f3e0b8)", boxShadow: covered ? "inset 0 2px 0 rgba(255,255,255,.28)" : `inset 0 0 0 1px rgba(255,255,255,.25), ${recent ? '0 0 0 2px rgba(242,191,84,.18), 0 10px 18px rgba(0,0,0,.14)' : '0 2px 8px rgba(0,0,0,.08)'}`, overflow: "hidden", display: "grid", placeItems: "center", position: "relative", padding: 8 }}>
        {covered ? (
          <>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(140deg,rgba(255,255,255,.22),transparent 35%,rgba(0,0,0,.12) 100%), repeating-linear-gradient(-25deg, rgba(255,255,255,.10) 0 3px, rgba(0,0,0,.04) 3px 8px)" }} />
            <div style={{ fontSize: 30, opacity: .2 }}>🎯</div>
          </>
        ) : (
          <>
            {recent ? <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)", animation: "lotCardShine .7s ease .08s both" }} /> : null}
            <div style={{ color: "#1f150b", fontWeight: 1000, fontSize: cell.label.length > 3 ? 24 : 34, letterSpacing: .5, lineHeight: 1 }}>{cell.label}</div>
            <div style={{ position: "absolute", right: 6, bottom: 6, transform: "rotate(-10deg)", padding: "3px 7px", borderRadius: 999, border: `1px solid ${idx % 3 === 0 ? "#bc332b" : "#c39a33"}`, color: idx % 3 === 0 ? "#bc332b" : "#b98a1f", background: "rgba(255,255,255,.32)", fontSize: 8.5, fontWeight: 1000, letterSpacing: .6, animation: recent ? "lotStampPop .48s ease .12s both" : undefined }}>{idx % 3 === 0 ? "VALIDÉ" : "✓ VALIDÉ"}</div>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ card, index, highlight, player, lastVolleyText, recentRevealKeys }: any) {
  const progress = cardProgress(card);
  const complete = progress === card.cells.length;
  return (
    <div style={{ position: "relative", borderRadius: 24, padding: 12, border: `1px solid ${complete ? "#cfad59" : highlight ? "#c89b41" : "rgba(135,115,77,.48)"}`, background: "linear-gradient(180deg,#f2e0bb,#e6cf9d 58%,#dcc18f)", color: "#1f160c", boxShadow: highlight ? "0 14px 34px rgba(0,0,0,.28)" : "0 10px 26px rgba(0,0,0,.18)", overflow: "hidden" }}>
      <img src={scratchTicketPreview} alt="" style={{ position: "absolute", right: -24, top: -10, width: 180, opacity: .06, pointerEvents: "none" }} />
      <div style={{ position: "absolute", insetInline: 0, top: 0, height: 10, background: "repeating-linear-gradient(90deg, transparent 0 8px, rgba(255,255,255,.55) 8px 15px)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 24px", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 20, textAlign: "center" }}>🎯</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, lineHeight: 1, fontWeight: 1000, letterSpacing: 1.2, color: "#1a1208", textShadow: "0 1px 0 rgba(255,255,255,.28)" }}>LOTERIE</div>
            <div style={{ margin: "5px auto 0", display: "inline-block", background: "linear-gradient(180deg,#cb4a33,#a8281e)", color: "#fff6e2", fontWeight: 1000, fontSize: 11, padding: "5px 12px", borderRadius: 999, boxShadow: "0 3px 10px rgba(0,0,0,.18)" }}>Mode {lastVolleyText?.includes('=') ? '3 fléchettes' : 'Express'}</div>
          </div>
          <div style={{ fontSize: 20, textAlign: "center" }}>🎯</div>
        </div>
        <div style={{ marginTop: 8, textAlign: "center", fontSize: 10, fontWeight: 900, letterSpacing: .4, color: "#2f2110" }}>GRATTEZ, DÉCOUVREZ LES CIBLES ET COMPLÉTEZ VOTRE CARTON !</div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8 }}>
          {card.cells.map((cell: any, idx: number) => <ScratchCell key={cell.key} cell={cell} idx={idx} recent={recentRevealKeys?.includes(`${card.id}:${cell.key}`)} />)}
        </div>

        <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
          <div style={{ padding: "5px 14px", borderRadius: 999, background: "#221b11", color: "#f1c96c", fontWeight: 1000, fontSize: 10.5, letterSpacing: .5, boxShadow: "inset 0 0 0 1px rgba(255,214,123,.18)" }}>{card.cells.length} CIBLES À DÉCOUVRIR</div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
          {[
            ["JOUEUR", player?.name || "Joueur"],
            ["CARTON", `${index + 1} / ${player?.cards?.length || 1}`],
            ["PROGRESSION", `${progress} / ${card.cells.length}`],
            ["DERNIÈRE VOLÉE", lastVolleyText || "—"],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ borderRadius: 16, background: "rgba(255,248,232,.72)", border: "1px dashed rgba(80,51,18,.24)", padding: 9, minHeight: 72 }}>
              <div style={{ color: "#594226", fontSize: 8.5, fontWeight: 1000, letterSpacing: .6 }}>{label}</div>
              {label === "PROGRESSION" ? (
                <>
                  <div style={{ marginTop: 5, color: "#1f150b", fontWeight: 1000, fontSize: 20 }}>{value}</div>
                  <div style={{ marginTop: 7, height: 12, borderRadius: 999, background: "#111", overflow: "hidden", border: "1px solid rgba(0,0,0,.12)" }}><div style={{ height: "100%", width: `${(progress / Math.max(1, card.cells.length)) * 100}%`, background: "linear-gradient(90deg,#c28b1f,#f4cb69)" }} /></div>
                </>
              ) : (
                <div style={{ marginTop: 6, color: label === "DERNIÈRE VOLÉE" ? "#2c2011" : "#15100a", fontWeight: 1000, fontSize: label === "JOUEUR" ? 18 : label === "DERNIÈRE VOLÉE" ? 12 : 20, lineHeight: 1.2, wordBreak: "break-word" }}>{value}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, textAlign: "center", fontSize: 11, fontWeight: 1000, color: complete ? "#198754" : "#9a2e24" }}>
          {complete ? "Visez juste. Complétez. Gagnez." : "Visez juste. Complétez. Gagnez."}
        </div>
      </div>
    </div>
  );
}

function DartKeypad({ darts, mult, setMult, onDart, onUndo, disabled, config }: any) {
  const classic = config.variant === "classic";
  return (
    <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,.09)", background: "rgba(5,6,9,.96)", padding: 10, boxShadow: "0 -8px 30px rgba(0,0,0,.22)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 7 }}>
        {[1,2,3].map((m) => <button key={m} disabled={disabled} onClick={() => setMult(m)} style={{ minHeight: 35, borderRadius: 10, border: `1px solid ${mult === m ? (m === 3 ? PINK : m === 2 ? CYAN : GOLD) : "rgba(255,255,255,.08)"}`, background: mult === m ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.03)", color: mult === m ? (m === 3 ? PINK : m === 2 ? CYAN : GOLD) : "rgba(255,255,255,.60)", fontWeight: 1000 }}>{m === 1 ? "SIMPLE" : m === 2 ? "DOUBLE" : "TRIPLE"}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5 }}>
        {Array.from({length:20},(_,i)=>i+1).map((v) => <button key={v} disabled={disabled} onClick={() => onDart({ v, mult })} style={{ minHeight: 39, borderRadius: 9, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.045)", color: "#fff", fontWeight: 950, fontSize: 13 }}>{v}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginTop: 6 }}>
        <button disabled={disabled} onClick={() => onDart({ v: 25, mult: 1 })} style={specialKey(GOLD)}>BULL 25</button>
        <button disabled={disabled} onClick={() => onDart({ v: 25, mult: 2 })} style={specialKey(PINK)}>DBULL 50</button>
        <button disabled={disabled} onClick={() => onDart({ v: 0, mult: 0 })} style={specialKey(BAD)}>MISS</button>
        <button disabled={disabled || !darts.length} onClick={onUndo} style={specialKey("rgba(255,255,255,.7)")}>↶ ANNULER</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 8 }}>
        {[0,1,2].map((i) => <div key={i} style={{ minHeight: 35, borderRadius: 11, display: "grid", placeItems: "center", background: darts[i] ? "rgba(246,194,86,.09)" : "rgba(255,255,255,.025)", border: `1px solid ${darts[i] ? `${GOLD}60` : "rgba(255,255,255,.05)"}`, color: darts[i] ? GOLD : "rgba(255,255,255,.22)", fontWeight: 1000, fontSize: 11 }}>{darts[i] ? dartLabel(darts[i]) : `DART ${i+1}`}</div>)}
      </div>
      {classic ? <div style={{ marginTop: 7, textAlign: "center", fontSize: 9, color: "rgba(255,255,255,.46)" }}>TOTAL DE VOLÉE</div> : null}
      <div style={{ marginTop: classic ? 2 : 7, minHeight: 44, borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#d79b28,#ffe39a,#bd7c15)", color: "#171008", fontSize: 25, fontWeight: 1000, boxShadow: "0 0 18px rgba(246,194,86,.14)" }}>{classic ? volleyScore(darts) : (darts[0] ? dartLabel(darts[0]) : "—")}</div>
    </div>
  );
}

function specialKey(color: string): React.CSSProperties { return { minHeight: 36, borderRadius: 9, border: `1px solid ${color}55`, background: "rgba(255,255,255,.035)", color, fontWeight: 1000, fontSize: 9.5 }; }

export default function LoteriePlay({ setTab, go, store, params, onFinish }: any) {
  const { theme } = useTheme();
  const config: LoterieConfig = { ...DEFAULT_CONFIG, ...(params?.config || {}) };
  const sourcePlayers = Array.isArray(params?.players) && params.players.length ? params.players : makeFallbackPlayers(store);
  const createdAtRef = React.useRef(Number(params?.createdAt) || Date.now());
  const [seed, setSeed] = React.useState(() => Date.now());
  const [players, setPlayers] = React.useState<LoteriePlayerState[]>(() => buildPlayerStates(sourcePlayers, config, seed));
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [darts, setDarts] = React.useState<LoterieDart[]>([]);
  const [mult, setMult] = React.useState<1|2|3>(1);
  const [toast, setToast] = React.useState<any>(null);
  const [winnerId, setWinnerId] = React.useState<string | null>(null);
  const [showInfo, setShowInfo] = React.useState(false);
  const [events, setEvents] = React.useState<any[]>([]);
  const [recentRevealKeys, setRecentRevealKeys] = React.useState<string[]>([]);
  const [fx, setFx] = React.useState<any>(null);
  const finishSent = React.useRef(false);

  const active = players[activeIndex] || players[0];
  const winner = winnerId ? players.find((p) => p.id === winnerId) || null : null;

  React.useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1700);
    return () => window.clearTimeout(id);
  }, [toast]);

  function finish(nextPlayers: LoteriePlayerState[], winId: string, finalEvents: any[] = events) {
    setWinnerId(winId);
    if (finishSent.current) return;
    finishSent.current = true;
    const finishedAt = Date.now();
    const summariesRaw = nextPlayers.map((p) => playerSummary(p, winId));
    const summaries = [...summariesRaw]
      .sort((a, b) => (a.id === winId ? -1 : b.id === winId ? 1 : b.bestCardProgress - a.bestCardProgress || b.cellsRevealed - a.cellsRevealed))
      .map((row, index) => ({ ...row, rank: index + 1 }));
    const win = summaries.find((p) => p.id === winId);
    const record = {
      id: `loterie_${finishedAt}_${Math.random().toString(36).slice(2,8)}`,
      kind: "loterie",
      mode: "loterie",
      gameId: "loterie",
      status: "finished",
      players: nextPlayers.map((p) => ({ id: p.id, playerId: p.id, profileId: p.id, name: p.name, avatarDataUrl: avatarOf(p), isBot: !!p.isBot })),
      winnerId: winId,
      winnerName: win?.name || "",
      createdAt: createdAtRef.current,
      updatedAt: finishedAt,
      finishedAt,
      summary: {
        kind: "loterie",
        mode: "loterie",
        variant: config.variant,
        winnerId: winId,
        winnerName: win?.name || "",
        config,
        players: summaries,
        perPlayer: summaries,
        rankings: summaries,
      },
      payload: {
        kind: "loterie",
        mode: "loterie",
        gameId: "loterie",
        config,
        stats: { mode: "loterie", variant: config.variant, players: summaries },
        summary: { mode: "loterie", variant: config.variant, winnerId: winId, winnerName: win?.name || "", players: summaries, perPlayer: summaries },
        events: finalEvents,
      },
    };
    try { onFinish?.(record); } catch (e) { console.warn("[Loterie] onFinish failed", e); }
  }

  function commitTurn(turnDarts: LoterieDart[]) {
    if (!active || winnerId || !turnDarts.length) return;
    const current = players[activeIndex];
    const resolved = revealResult(current, config, turnDarts);
    const nextPlayers = players.map((p, i) => i === activeIndex ? resolved.player : p);
    const didWin = hasWon(resolved.player);
    const changedKeys = resolved.player.cards.flatMap((card: any, cardIdx: number) => {
      const prevCard = current.cards[cardIdx];
      return card.cells.filter((cell: any, ci: number) => cell.revealed && !prevCard?.cells?.[ci]?.revealed).map((cell: any) => `${card.id}:${cell.key}`);
    });
    const ev = { ts: Date.now(), playerId: current.id, playerName: current.name, darts: turnDarts.map((d) => ({...d,label:dartLabel(d),score:dartScore(d)})), volleyScore: volleyScore(turnDarts), resultKey: resolved.result.key, resultLabel: resolved.result.label, revealed: resolved.revealed, completedCardIds: resolved.completedCardIds };
    const nextEvents = [...events, ev];
    setEvents(nextEvents);
    setPlayers(nextPlayers);
    setDarts([]);
    setRecentRevealKeys(changedKeys);
    const hitLabel = resolved.revealed >= 3 ? `🎰 JACKPOT · ${resolved.revealed} CASES !` : resolved.revealed === 2 ? "✨ DOUBLE HIT · 2 CASES !" : resolved.revealed === 1 ? "✅ TROUVÉ · 1 CASE !" : `❌ ${resolved.result.label || "0"} · AUCUNE CASE`;
    setToast({ good: resolved.revealed > 0, text: hitLabel });
    setFx({ text: hitLabel, tone: resolved.revealed >= 2 ? "gold" : resolved.revealed === 1 ? "green" : "red" });
    if (didWin) {
      finish(nextPlayers, current.id, nextEvents);
      return;
    }
    setActiveIndex((activeIndex + 1) % nextPlayers.length);
  }

  function addDart(raw: any) {
    if (winnerId) return;
    const d: LoterieDart = { v: Number(raw?.v) || 0, mult: (Number(raw?.mult) || 0) as any };
    if (config.variant === "express") {
      setDarts([d]);
      window.setTimeout(() => commitTurn([d]), 80);
      return;
    }
    if (darts.length >= 3) return;
    const next = [...darts, d];
    if (config.volleyMode === "strict3" && next.length === 3) {
      setDarts(next);
      window.setTimeout(() => commitTurn(next), 80);
    } else setDarts(next);
  }

  function resetGame() {
    const nextSeed = Date.now();
    setSeed(nextSeed);
    setPlayers(buildPlayerStates(sourcePlayers, config, nextSeed));
    setActiveIndex(0);
    setDarts([]);
    setWinnerId(null);
    setEvents([]);
    setRecentRevealKeys([]);
    setFx(null);
    setToast(null);
    finishSent.current = false;
    createdAtRef.current = Date.now();
  }

  const ranking = React.useMemo(() => [...players].sort((a,b) => bestCardProgress(b) - bestCardProgress(a) || b.stats.cellsRevealed - a.stats.cellsRevealed), [players]);
  const bestIdx = active ? active.cards.reduce((bestI, c, i, arr) => cardProgress(c) > cardProgress(arr[bestI]) ? i : bestI, 0) : 0;
  const lastPlayerEvent = React.useMemo(() => [...events].reverse().find((e: any) => e.playerId === active?.id) || null, [events, active?.id]);
  const lastVolleyText = config.variant === "classic"
    ? (darts.length ? `${darts.map((d: any) => dartLabel(d)).join(" + ")} = ${volleyScore(darts)}` : (lastPlayerEvent?.darts?.length ? `${lastPlayerEvent.darts.map((d: any) => d.label).join(" + ")} = ${lastPlayerEvent.volleyScore}` : "—"))
    : (darts[0] ? dartLabel(darts[0]) : (lastPlayerEvent?.darts?.[0]?.label || "—"));

  return (
    <div style={{ minHeight: "100vh", color: theme?.text || "#fff", background: theme?.bg || "radial-gradient(circle at 50% -10%,#231a0b,#08090d 38%,#050609)", paddingBottom: 18 }}>
      <style>{`
        @keyframes lotScratchReveal { 0% { transform: scale(.86) rotate(-4deg); filter: brightness(1.15);} 55% { transform: scale(1.04) rotate(1deg);} 100% { transform: scale(1) rotate(0deg); filter: brightness(1);} }
        @keyframes lotStampPop { 0% { opacity: 0; transform: scale(.35) rotate(-20deg);} 75% { opacity: 1; transform: scale(1.12) rotate(-10deg);} 100% { opacity: 1; transform: scale(1) rotate(-10deg);} }
        @keyframes lotFxBurst { 0% { opacity: 0; transform: translate(-50%,-30%) scale(.72);} 12% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%,-54%) scale(1.08);} }
        @keyframes lotCardShine { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
      `}</style>
      <header style={{ position: "sticky", top: 0, zIndex: 30, height: 82, overflow: "hidden", borderBottom: `1px solid ${GOLD}35`, background: "rgba(7,8,11,.94)", backdropFilter: "blur(16px)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 10%,rgba(246,194,86,.20),transparent 65%)" }} />
        <div style={{ position: "absolute", left: 9, top: 10 }}><BackDot onClick={() => (go || setTab)?.("loterie_config", { ...config, selectedIds: players.map((p) => p.id) })} color={GOLD} glow="rgba(246,194,86,.5)" title="Configuration" /></div>
        <div style={{ position: "absolute", right: 9, top: 10 }}><InfoDot onClick={() => setShowInfo(true)} color={GOLD} glow="rgba(246,194,86,.5)" title="Règles" /></div>
        <div style={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center" }}><div><div style={{ color: GOLD, fontSize: 19, fontWeight: 1000, letterSpacing: 2 }}>🎰 LOTERIE</div><div style={{ marginTop: 2, color: "rgba(255,255,255,.52)", fontSize: 8.5, letterSpacing: .8 }}>{compactConfigLabel(config, active)}</div></div></div>
      </header>

      <main style={{ width: "min(900px,calc(100% - 16px))", margin: "8px auto 0", display: "grid", gap: 8 }}>
        <section style={{ borderRadius: 18, border: `1px solid ${GOLD}35`, background: PANEL, padding: 10, position: "relative", overflow: "hidden" }}>
          {avatarOf(active) ? <img src={avatarOf(active)!} alt="" style={{ position: "absolute", left: -16, top: -20, width: 135, height: 135, objectFit: "cover", borderRadius: "50%", filter: "blur(1px)", opacity: .17 }} /> : null}
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
            <Avatar p={active} size={58} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: GOLD, fontSize: 9, fontWeight: 1000, letterSpacing: .7 }}>JOUEUR ACTIF</div>
              <div style={{ fontSize: 17, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(active)}</div>
              <div style={{ marginTop: 3, display: "flex", gap: 5, flexWrap: "wrap" }}>
                {active?.cards?.map((c,i) => <span key={c.id} style={{ fontSize: 9, padding: "3px 6px", borderRadius: 99, color: i === bestIdx ? GOLD : "rgba(255,255,255,.55)", border: `1px solid ${i === bestIdx ? `${GOLD}55` : "rgba(255,255,255,.07)"}` }}>C{i+1} {cardProgress(c)}/{c.cells.length}</span>)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}><div style={{ color: "rgba(255,255,255,.48)", fontSize: 8 }}>MEILLEUR CARTON</div><div style={{ color: GOLD, fontSize: 26, fontWeight: 1000 }}>{bestCardProgress(active)}/{active?.cards?.[0]?.cells?.length || config.cellsPerCard}</div><div style={{ color: "rgba(255,255,255,.45)", fontSize: 8 }}>{active?.stats?.visits || 0} tours</div></div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: active?.cards?.length > 1 ? "repeat(2,minmax(0,1fr))" : "1fr", gap: 10 }}>
          {active?.cards?.map((c,i) => <Card key={c.id} card={c} index={i} highlight={i === bestIdx} player={active} lastVolleyText={lastVolleyText} recentRevealKeys={recentRevealKeys} />)}
        </section>

        <section style={{ borderRadius: 15, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", padding: 8 }}>
          <div style={{ color: GOLD, fontSize: 9, fontWeight: 1000, marginBottom: 5 }}>CLASSEMENT</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>{ranking.map((p,i) => <div key={p.id} style={{ minWidth: 112, borderRadius: 12, padding: "6px 8px", border: `1px solid ${p.id === active?.id ? `${GOLD}50` : "rgba(255,255,255,.06)"}`, background: p.id === active?.id ? "rgba(246,194,86,.07)" : "rgba(255,255,255,.025)" }}><div style={{ fontSize: 9.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i+1}. {p.name}</div><div style={{ marginTop: 2, color: p.id === active?.id ? GOLD : "rgba(255,255,255,.58)", fontSize: 9 }}>{bestCardProgress(p)}/{p.cards[0]?.cells?.length || config.cellsPerCard} · {p.stats.cellsRevealed} cases</div></div>)}</div>
        </section>

        <DartKeypad darts={darts} mult={mult} setMult={setMult} onDart={addDart} onUndo={() => setDarts((d) => d.slice(0,-1))} disabled={!!winnerId} config={config} />

        {config.variant === "classic" && config.volleyMode === "free" ? <button disabled={!darts.length || !!winnerId} onClick={() => commitTurn(darts)} style={{ minHeight: 48, borderRadius: 14, border: `1px solid ${darts.length ? GOLD : "rgba(255,255,255,.08)"}`, background: darts.length ? "linear-gradient(135deg,rgba(246,194,86,.24),rgba(246,194,86,.09))" : "rgba(255,255,255,.03)", color: darts.length ? GOLD : "rgba(255,255,255,.25)", fontWeight: 1000, fontSize: 12 }}>VALIDER {darts.length ? volleyScore(darts) : "LA VOLÉE"} · {darts.length}/3 DART{darts.length > 1 ? "S" : ""}</button> : null}
      </main>

      {fx ? <div style={{ position: "fixed", left: "50%", top: "47%", transform: "translate(-50%,-50%)", zIndex: 115, pointerEvents: "none", animation: "lotFxBurst 1.15s ease-out both", textAlign: "center", padding: "12px 20px", borderRadius: 18, border: `1px solid ${fx.tone === "red" ? BAD : fx.tone === "green" ? GOOD : GOLD}`, background: "rgba(10,10,12,.88)", color: fx.tone === "red" ? BAD : fx.tone === "green" ? GOOD : GOLD, fontWeight: 1000, fontSize: 22, letterSpacing: .8, boxShadow: "0 16px 45px rgba(0,0,0,.42)" }}>{fx.text}</div> : null}

      {toast ? <div style={{ position: "fixed", left: "50%", top: 96, transform: "translateX(-50%)", zIndex: 80, minWidth: "min(360px,88vw)", textAlign: "center", padding: "12px 16px", borderRadius: 16, border: `1px solid ${toast.good ? GOOD : BAD}90`, background: "rgba(9,10,13,.96)", color: toast.good ? GOOD : BAD, fontWeight: 1000, boxShadow: "0 12px 35px rgba(0,0,0,.4)" }}>{toast.text}</div> : null}

      {winner ? <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.82)", display: "grid", placeItems: "center", padding: 16 }}><div style={{ width: "min(520px,96vw)", maxHeight: "90vh", overflowY: "auto", borderRadius: 23, border: `1px solid ${GOLD}80`, background: "linear-gradient(180deg,#17130b,#0b0c10 38%,#07080b)", padding: 18, textAlign: "center", boxShadow: "0 30px 90px rgba(0,0,0,.65)" }}>
        <div style={{ fontSize: 42 }}>🏆</div><div style={{ color: GOLD, fontSize: 12, fontWeight: 1000, letterSpacing: 1.7 }}>JACKPOT — CARTON COMPLET</div><div style={{ marginTop: 5, fontSize: 25, fontWeight: 1000 }}>{winner.name}</div><div style={{ marginTop: 5, color: "rgba(255,255,255,.64)", fontSize: 11 }}>{winner.stats.completedOnVisit} tours · {winner.stats.dartsThrown} darts · {winner.stats.cellsRevealed} cases révélées</div>
        <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 7 }}>{[["Taux découverte", winner.stats.visits ? `${Math.round((winner.stats.successfulVisits/winner.stats.visits)*100)}%` : "0%"],["Multi-hits",winner.stats.multiHits],["Meilleur hit",`${winner.stats.maxCellsInVisit} case${winner.stats.maxCellsInVisit>1?"s":""}`],["Meilleure série",winner.stats.bestStreak],["Volée moyenne",winner.stats.visits ? (winner.stats.totalVolleyScore/winner.stats.visits).toFixed(1) : "0"],["Meilleure volée",winner.stats.maxVolley]].map(([l,v]:any)=><div key={l} style={{ padding: 10, borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: "rgba(255,255,255,.48)", fontSize: 8.5 }}>{l}</div><div style={{ marginTop: 2, color: GOLD, fontSize: 18, fontWeight: 1000 }}>{v}</div></div>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}><button onClick={resetGame} style={{ minHeight: 45, borderRadius: 13, border: `1px solid ${GOLD}`, background: "rgba(246,194,86,.12)", color: GOLD, fontWeight: 1000 }}>🎰 REJOUER</button><button onClick={() => (go || setTab)?.("statsHub", { initialPlayerId: winner.id, initialStatsSubTab: "loterie" })} style={{ minHeight: 45, borderRadius: 13, border: `1px solid ${CYAN}70`, background: "rgba(69,216,255,.08)", color: CYAN, fontWeight: 1000 }}>STATS</button><button onClick={() => (go || setTab)?.("games")} style={{ minHeight: 45, borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 1000 }}>MENU JEUX</button></div>
      </div></div> : null}

      {showInfo ? <div onClick={() => setShowInfo(false)} style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(0,0,0,.75)", display: "grid", placeItems: "center", padding: 16 }}><div onClick={(e)=>e.stopPropagation()} style={{ width: "min(520px,96vw)", borderRadius: 20, border: `1px solid ${GOLD}70`, background: "#0c0d11", padding: 17 }}><div style={{ color: GOLD, fontWeight: 1000, fontSize: 17 }}>LOTERIE — RAPPEL</div><div style={{ marginTop: 8, color: "rgba(255,255,255,.76)", fontSize: 11.5, lineHeight: 1.55 }}>{config.variant === "classic" ? <>Compose une volée de {config.volleyMode === "strict3" ? "3 fléchettes" : "1 à 3 fléchettes"}. Le <b>total de la volée</b> cherche la même valeur sur tous tes cartons. Toutes les occurrences correspondantes sont ouvertes. Le premier carton complet gagne.</> : <>Une seule fléchette par tour. {config.expressTarget === "simple" ? "Le numéro 1–20 compte quel que soit le multiplicateur." : config.expressTarget === "double" ? "Il faut toucher le DOUBLE exact (DBULL inclus)." : "Il faut toucher le TRIPLE exact."} Le premier carton complet gagne.</>}</div><button onClick={() => setShowInfo(false)} style={{ width: "100%", minHeight: 42, marginTop: 12, borderRadius: 12, border: `1px solid ${GOLD}`, background: "rgba(246,194,86,.10)", color: GOLD, fontWeight: 1000 }}>FERMER</button></div></div> : null}
    </div>
  );
}
