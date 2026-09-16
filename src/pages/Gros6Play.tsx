// @ts-nocheck
// =============================================================
// GROS 6 / BIG 6 — PLAY V6
// UI = mêmes codes visuels que LOTERIE / KILLER / X01 / TERRITORIES
// - bloc joueur actif compact type LOTERIE
// - rangée de KPI cliquables -> stats détaillées flottantes
// - bandeau JOUEURS type KILLER -> liste détaillée flottante
// - ScoreInputHub NATIF (mêmes méthodes de saisie que le reste de l'app)
// - 100dvh, aucun scroll de page
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
import ScoreInputHub from "../components/ScoreInputHub";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import tickerGros6 from "../assets/tickers/ticker_gros_6.png";
import tickerBig6 from "../assets/tickers/ticker_gros_6_en.png";
import {
  GROS6_SPECIAL_ZONES,
  applyGros6AttackHit,
  applyGros6SelectionHit,
  buildGros6InitialState,
  finalizeGros6Selection,
  gros6AliveTeams,
  gros6Clone,
  gros6IsPlayerActive,
  gros6TargetLabel,
  isGros6TargetAllowedForSelection,
  makeGros6Bull,
  makeGros6Miss,
  makeGros6Segment,
  makeGros6Special,
  simulateGros6BotAttack,
  simulateGros6BotSelection,
} from "../lib/gros6Engine";

const STROKE = "rgba(255,255,255,.105)";
const SOFT = "rgba(226,232,240,.72)";
const GOOD = "#70efbd";
const BAD = "#ff718a";
const PINK = "#ff63b8";

function panelStyle(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${STROKE}`,
    background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(5,8,16,.72))",
    boxShadow: "0 10px 22px rgba(0,0,0,.24)",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  };
}

function MiniKpi({ label, value, color, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 4px",
        borderRadius: 12,
        textAlign: "center",
        background: "rgba(255,255,255,.045)",
        border: `1px solid ${STROKE}`,
        minWidth: 0,
        cursor: "pointer",
        color: "#fff",
      }}
    >
      <div style={{ color: SOFT, fontSize: 8.2, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ color, fontSize: 14.5, fontWeight: 1000, marginTop: 2, lineHeight: 1 }}>{value}</div>
    </button>
  );
}

function ModeInlineInfo({ label, value, accent }: any) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0, whiteSpace: "nowrap" }}>
      <span style={{ color: accent, fontSize: 9.2, fontWeight: 1000 }}>{label}</span>
      <span style={{ color: "#fff", fontSize: 9.2, fontWeight: 950 }}>{value}</span>
    </div>
  );
}

function targetUiLabel(target: any, lang: string) {
  if (!target) return "—";
  if (target.kind === "special") {
    const code = String(target.code || "");
    const digit = code.match(/^digit_(\d+)$/);
    if (digit) return lang === "fr" ? `Rond du ${digit[1]}` : `No. ${digit[1]} ring`;
    if (code === "outer_numbers_ring") return lang === "fr" ? "Extérieur chiffres" : "Outer number ring";
  }
  return gros6TargetLabel(target);
}

function toUiDarts(items: any[]) {
  return (Array.isArray(items) ? items : []).slice(0, 3).map((hit: any) => {
    if (hit?.kind === "segment") return { v: Number(hit.value || 0), mult: hit.ring === "T" ? 3 : hit.ring === "D" ? 2 : 1 };
    if (hit?.kind === "bull") return { v: 25, mult: hit.bull === "DB" ? 2 : 1 };
    return { v: 0, mult: 1 };
  });
}

function fromUiDart(d: any) {
  const v = Number(d?.v || 0);
  const mult = Number(d?.mult || 1);
  if (v <= 0) return makeGros6Miss();
  if (v === 25) return makeGros6Bull(mult === 2);
  return makeGros6Segment(mult === 3 ? "T" : mult === 2 ? "D" : "S", v);
}

function dartLabel(hit: any, lang: string) {
  return targetUiLabel(hit, lang);
}

function ModalShell({ onClose, title, subtitle, accent, children }: any) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10020, background: "rgba(0,0,0,.74)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "86dvh", overflowY: "auto", borderRadius: 18, border: `1px solid ${accent}55`, background: "linear-gradient(180deg,#10141f,#090c13 48%,#07080c)", boxShadow: "0 26px 65px rgba(0,0,0,.55)", padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ color: accent, fontWeight: 1000, fontSize: 15 }}>{title}</div>
            {subtitle ? <div style={{ color: SOFT, fontSize: 10, marginTop: 2 }}>{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 1000, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

function PlayerStatsModal({ player, onClose, accent, lang, teamName }: any) {
  if (!player) return null;
  const L = (fr: string, en: string) => lang === "fr" ? fr : en;
  const stats = [
    [L("Cibles validées", "Targets cleared"), player.stats?.targetsCleared || 0, accent],
    [L("Cibles imposées", "Targets set"), player.stats?.targetsImposed || 0, GOOD],
    [L("Vies perdues", "Lives lost"), player.stats?.livesLost || 0, BAD],
    [L("Fléchettes lancées", "Darts thrown"), player.stats?.dartsThrown || 0, SOFT],
    [L("Sauvetages D3", "3rd-dart saves"), player.stats?.lastDartSaves || 0, PINK],
    [L("Zones spéciales", "Special zones"), player.stats?.specialTargetsCleared || 0, accent],
    ["Bull / DBull", player.stats?.bullsCleared || 0, GOOD],
    [L("Doubles validés", "Doubles cleared"), player.stats?.doublesCleared || 0, GOOD],
    [L("Triples validés", "Trebles cleared"), player.stats?.triplesCleared || 0, PINK],
    [L("Vies restantes", "Lives left"), player.lives || 0, BAD],
  ];
  return (
    <ModalShell onClose={onClose} title={L("STATISTIQUES GROS 6", "BIG 6 STATISTICS")} subtitle={`${player.name}${teamName ? ` · ${teamName}` : ""}`} accent={accent}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {stats.map(([label, value, color]: any) => (
          <div key={label} style={{ borderRadius: 13, padding: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ color: SOFT, fontSize: 8.5, fontWeight: 1000, textTransform: "uppercase" }}>{label}</div>
            <div style={{ marginTop: 4, color, fontSize: 19, fontWeight: 1000 }}>{value}</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function PlayersModal({ game, onClose, accent, lang, activeIndex }: any) {
  const L = (fr: string, en: string) => lang === "fr" ? fr : en;
  return (
    <ModalShell onClose={onClose} title={L("JOUEURS", "PLAYERS")} subtitle={L("Ordre de jeu et récapitulatif", "Turn order and overview")} accent={accent}>
      <div style={{ display: "grid", gap: 8 }}>
        {game.players.map((p: any, idx: number) => {
          const active = idx === activeIndex && game.phase !== "finished";
          const alive = gros6IsPlayerActive(game, p);
          const team = game.participantMode === "teams" ? game.teams.find((t: any) => String(t.id) === String(p.teamId)) : null;
          const last = [...(game.history || [])].reverse().find((ev: any) => String(ev?.playerId) === String(p.id) && Array.isArray(ev?.darts));
          const lastDarts = Array.isArray(last?.darts) ? last.darts.slice(0, 3) : [];
          const lives = game.participantMode === "teams" && game.teamLifeMode === "shared" ? Number(team?.lives || 0) : Number(p.lives || 0);
          return (
            <div key={p.id} style={{ ...panelStyle(), padding: "8px 10px", opacity: alive ? 1 : .55, border: `1px solid ${active ? `${accent}66` : "rgba(255,255,255,.08)"}`, boxShadow: active ? `0 0 16px ${accent}22` : "none", display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10 }}>
              <ProfileAvatar name={p.name} avatarDataUrl={p.avatarDataUrl} size={40} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 7, alignItems: "center", minWidth: 0 }}>
                  <span style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  {p.isBot ? <span style={{ fontSize: 10, color: SOFT }}>🤖 {p.botLevel || ""}</span> : null}
                </div>
                {team ? <div style={{ marginTop: 2, color: accent, fontSize: 9, fontWeight: 900 }}>{team.name}</div> : null}
                <div style={{ marginTop: 5, display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((i) => <span key={i} style={{ minWidth: 36, height: 23, borderRadius: 8, display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.32)", color: "#fff", fontSize: 9.5, fontWeight: 1000 }}>{lastDarts[i] || "—"}</span>)}
                </div>
              </div>
              <div style={{ minWidth: 58, borderRadius: 14, padding: "8px 10px", background: alive ? "rgba(0,0,0,.42)" : "rgba(120,12,28,.22)", border: `1px solid ${alive ? "rgba(255,255,255,.08)" : "rgba(255,80,100,.35)"}`, color: alive ? "#fff" : BAD, textAlign: "center", fontWeight: 1000 }}>
                {alive ? `❤️ ${lives}` : L("OUT", "OUT")}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

function SpecialZonesModal({ onClose, onPick, accent, lang }: any) {
  const L = (fr: string, en: string) => lang === "fr" ? fr : en;
  return (
    <ModalShell onClose={onClose} title={L("ZONES SPÉCIALES", "SPECIAL ZONES")} subtitle={L("Sélectionne exactement la zone touchée", "Select the exact zone hit")} accent={accent}>
      <button type="button" onClick={() => onPick({ code: "outer_numbers_ring", label: "Extérieur cercle chiffres" })} style={{ width: "100%", minHeight: 42, borderRadius: 13, border: `1px solid ${accent}55`, background: `${accent}12`, color: "#fff", fontWeight: 1000, cursor: "pointer", marginBottom: 9 }}>{L("EXTÉRIEUR DU CERCLE DES CHIFFRES", "OUTSIDE THE NUMBER RING")}</button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 7 }}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onPick({ code: `digit_${n}`, label: `Rond du ${n}` })} style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.045)", color: "#fff", fontWeight: 1000, cursor: "pointer" }}>{n}</button>
        ))}
      </div>
    </ModalShell>
  );
}

export default function Gros6Play({ store, go, config, onFinish }: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string) => lang === "fr" ? fr : en, [lang]);
  const accent = theme?.primary || "#42d6ff";
  const pageBg = theme?.pageBg || theme?.bg || "#05070e";

  const [game, setGame] = React.useState(() => buildGros6InitialState(config));
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [playersOpen, setPlayersOpen] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [specialOpen, setSpecialOpen] = React.useState(false);
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [viewport, setViewport] = React.useState(() => ({ w: typeof window !== "undefined" ? window.innerWidth : 1200, h: typeof window !== "undefined" ? window.innerHeight : 900 }));
  const undoStackRef = React.useRef<any[]>([]);
  const reportedRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update as any);
  }, []);

  const compact = viewport.w < 720;
  const short = viewport.h < 760;
  const tickerHeight = compact ? (short ? 58 : 66) : 78;
  const activeHeight = compact ? (short ? 116 : 126) : 136;

  const activePlayer = game.players[game.turnIndex];
  const activeTeam = game.participantMode === "teams" ? game.teams.find((team: any) => String(team.id) === String(activePlayer?.teamId || "")) : null;
  const alivePlayers = game.players.filter((p: any) => gros6IsPlayerActive(game, p));
  const aliveTeams = gros6AliveTeams(game);
  const phaseSelect = game.phase === "select";
  const finished = game.phase === "finished";
  const activeHuman = !!activePlayer && !activePlayer.isBot && !finished;
  const currentHits = phaseSelect ? game.selectionDarts : game.attackDarts;
  const currentThrow = toUiDarts(currentHits);
  const dartsLeft = phaseSelect ? Math.max(0, Number(game.selectionAllowed || 0) - game.selectionDarts.length) : Math.max(0, 3 - game.attackDarts.length);
  const lifeValue = game.participantMode === "teams" && game.teamLifeMode === "shared" ? Number(activeTeam?.lives || 0) : Number(activePlayer?.lives || 0);
  const headerTicker = lang === "fr" ? tickerGros6 : tickerBig6;
  const statsPlayerTeam = activeTeam?.name || null;

  React.useEffect(() => { setMultiplier(1); }, [game.turnIndex, game.phase]);

  const commit = React.useCallback((reducer: any) => {
    setGame((prev: any) => {
      undoStackRef.current.push(gros6Clone(prev));
      if (undoStackRef.current.length > 120) undoStackRef.current.shift();
      return reducer(prev);
    });
  }, []);

  const undo = React.useCallback(() => {
    const previous = undoStackRef.current.pop();
    if (previous) {
      setGame(previous);
      setMultiplier(1);
    }
  }, []);

  const submitHit = React.useCallback((hit: any) => {
    commit((prev: any) => prev.phase === "select" ? applyGros6SelectionHit(prev, hit, config) : applyGros6AttackHit(prev, hit, config));
  }, [commit, config]);

  const submitUiDart = React.useCallback((d: any) => {
    submitHit(fromUiDart(d));
    setMultiplier(1);
  }, [submitHit]);

  const submitNumber = React.useCallback((n: number) => {
    if (n === 0) return submitUiDart({ v: 0, mult: 1 });
    submitUiDart({ v: n, mult: multiplier });
  }, [submitUiDart, multiplier]);

  const submitBull = React.useCallback(() => {
    submitUiDart({ v: 25, mult: multiplier === 2 ? 2 : 1 });
  }, [submitUiDart, multiplier]);

  const finishSelectionNow = React.useCallback(() => {
    if (!phaseSelect) return;
    commit((prev: any) => prev.phase === "select" ? finalizeGros6Selection(prev) : prev);
  }, [commit, phaseSelect]);

  const applyPresetDarts = React.useCallback((darts: any[]) => {
    const normalized = (Array.isArray(darts) ? darts : []).slice(0, 3);
    if (!normalized.length) return;
    commit((prev: any) => {
      const startTurn = prev.turnNo;
      let next = gros6Clone(prev);
      for (const d of normalized) {
        if (next.turnNo !== startTurn || next.phase === "finished") break;
        const hit = fromUiDart(d);
        next = next.phase === "select" ? applyGros6SelectionHit(next, hit, config) : applyGros6AttackHit(next, hit, config);
      }
      return next;
    });
    setMultiplier(1);
  }, [commit, config]);

  const pickSpecial = React.useCallback((zone: any) => {
    submitHit(makeGros6Special(zone.code, zone.label));
    setSpecialOpen(false);
  }, [submitHit]);

  React.useEffect(() => {
    if (!game.winnerId || reportedRef.current) return;
    reportedRef.current = true;
    try {
      onFinish?.({
        id: `gros6-match-${Date.now()}`,
        kind: "gros_6",
        mode: "gros_6",
        createdAt: config?.createdAt || Date.now(),
        finishedAt: Date.now(),
        winnerId: game.winnerId,
        winnerName: game.winnerName,
        winnerType: game.winnerType,
        participantMode: game.participantMode,
        teams: game.teams,
        players: game.players,
        config,
        history: game.history,
      });
    } catch {}
  }, [game.winnerId, game.winnerName, game.winnerType, game.participantMode, game.teams, game.players, game.history, config, onFinish]);

  React.useEffect(() => {
    if (game.phase !== "attack" || game.winnerId) return;
    const player = game.players[game.turnIndex];
    if (!player?.isBot) return;
    const timer = window.setTimeout(() => {
      setGame((prev: any) => {
        undoStackRef.current.push(gros6Clone(prev));
        if (undoStackRef.current.length > 120) undoStackRef.current.shift();
        const attack = simulateGros6BotAttack(prev, config);
        let next = gros6Clone(prev);
        for (const dart of attack.darts) {
          if (next.phase === "attack") next = applyGros6AttackHit(next, dart, config);
        }
        if (next.phase === "select") {
          const bot = next.players[next.turnIndex];
          const selection = simulateGros6BotSelection(next.selectionAllowed, bot, config);
          for (const dart of selection.darts) {
            if (next.phase === "select") next = applyGros6SelectionHit(next, dart, config);
          }
        }
        return next;
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [game.phase, game.turnIndex, game.winnerId, game.players, config]);

  const activeTarget = phaseSelect && game.pendingNextTarget ? game.pendingNextTarget : game.currentTarget;
  const phaseText = phaseSelect ? L("CHOISIS LA PROCHAINE CIBLE", "CHOOSE NEXT TARGET") : L("CIBLE À TOUCHER", "TARGET TO HIT");

  return (
    <div style={{ position: "fixed", inset: 0, height: "100dvh", overflow: "hidden", background: pageBg, color: "#fff", display: "flex", flexDirection: "column", padding: compact ? 6 : 10, gap: compact ? 5 : 8, overscrollBehavior: "none" }}>
      <style>{`
        .gros6-scorehub { flex: 1 1 auto; min-height: 0; overflow: hidden; }
        .gros6-scorehub > div { height: 100%; min-height: 0; display: flex; flex-direction: column; }
        .gros6-scorehub > div > div:last-child { min-height: 0; }
      `}</style>

      {/* HEADER — même logique que KillerPlay */}
      <div style={{ flex: `0 0 ${tickerHeight}px`, position: "relative", overflow: "hidden" }}>
        <img src={headerTicker as any} alt={lang === "fr" ? "Gros 6" : "Big 6"} draggable={false} style={{ width: "100%", height: tickerHeight, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg,rgba(5,5,7,.94),rgba(5,5,7,0) 15%,rgba(5,5,7,0) 85%,rgba(5,5,7,.94))" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}><BackDot onClick={() => go?.("gros_6_config")} title={L("Retour", "Back")} size={compact ? 34 : 38} color={accent} glow={`${accent}AA`} /></div>
          <div style={{ pointerEvents: "auto" }}><InfoDot onClick={() => setRulesOpen(true)} size={compact ? 34 : 38} color={accent} glow={`${accent}AA`} /></div>
        </div>
      </div>

      {/* BLOC JOUEUR ACTIF — structure LOTERIE adaptée au Gros 6 */}
      <section style={{ ...panelStyle(), flex: `0 0 ${activeHeight}px`, padding: 0, overflow: "hidden", borderColor: `${accent}88`, boxShadow: `0 0 24px ${accent}20` }}>
        <div style={{ position: "relative", height: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(122px,138px)", gap: 4, alignItems: "stretch", padding: compact ? "7px 8px" : "8px 10px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.36), rgba(0,0,0,.18) 36%, rgba(0,0,0,.10) 62%, rgba(0,0,0,.30))" }} />
          <div style={{ position: "absolute", left: -20, top: -4, bottom: -4, width: "26%", minWidth: 82, overflow: "hidden", opacity: .14, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -14, top: 14, transform: "scale(1.25)", transformOrigin: "left top", filter: "saturate(.86)" }}><ProfileAvatar name={activePlayer?.name || "?"} avatarDataUrl={activePlayer?.avatarDataUrl} size={82} /></div>
          </div>

          <div style={{ gridColumn: "1 / 2", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minWidth: 0, textAlign: "center", padding: "6px 8px 4px 5px" }}>
            <div style={{ color: accent, fontSize: compact ? 12 : 14, fontWeight: 1000, letterSpacing: .8, lineHeight: 1.02, maxWidth: "100%", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activePlayer?.name || "—"}</div>
            {activeTeam ? <div style={{ marginTop: 2, color: SOFT, fontSize: 8.2, fontWeight: 900 }}>{activeTeam.name}</div> : null}
            <div style={{ marginTop: 3, color: SOFT, fontSize: 8.5, fontWeight: 1000, letterSpacing: .7 }}>{phaseText}</div>
            <div style={{ marginTop: 1, color: accent, fontSize: compact ? 50 : 58, fontWeight: 1000, lineHeight: 1, textShadow: `0 4px 18px ${accent}35`, whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{targetUiLabel(activeTarget, lang)}</div>
            <div style={{ marginTop: "auto", display: "flex", gap: "clamp(5px, 1.7vw, 14px)", alignItems: "center", justifyContent: "center", flexWrap: "nowrap", width: "100%", minWidth: 0, overflow: "hidden" }}>
              <ModeInlineInfo label={L("DARTS", "DARTS")} value={String(dartsLeft)} accent={accent} />
              <ModeInlineInfo label={L("RÈGLE", "RULE")} value={config?.targetRule === "value" ? L("VALEUR", "VALUE") : "S/D/T"} accent={accent} />
              <ModeInlineInfo label={L("PHASE", "PHASE")} value={phaseSelect ? L("CHOIX", "SELECT") : L("ATTAQUE", "ATTACK")} accent={accent} />
            </div>
          </div>

          <div style={{ gridColumn: "2 / 3", position: "relative", zIndex: 2, minWidth: 0, overflow: "hidden", borderRadius: 18, border: `1px solid ${accent}55`, background: "#080b12", padding: 0, color: "#fff" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(180deg, rgba(4,8,16,.32), rgba(4,8,16,.72)), url(${headerTicker})`, backgroundPosition: "center", backgroundSize: "cover", opacity: .72 }} />
            <div style={{ position: "relative", display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5px 4px" }}>
              <ProfileAvatar name={activePlayer?.name || "?"} avatarDataUrl={activePlayer?.avatarDataUrl} size={compact ? 48 : 56} />
              <div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, width: "100%" }}>
                <div style={{ textAlign: "center" }}><div style={{ color: SOFT, fontSize: 7.5, fontWeight: 1000 }}>{L("VIES", "LIVES")}</div><div style={{ color: BAD, fontSize: 14, fontWeight: 1000 }}>❤️ {lifeValue}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ color: SOFT, fontSize: 7.5, fontWeight: 1000 }}>DARTS</div><div style={{ color: accent, fontSize: 14, fontWeight: 1000 }}>{dartsLeft}</div></div>
                <div style={{ textAlign: "center" }}><div style={{ color: SOFT, fontSize: 7.5, fontWeight: 1000 }}>{L("TOUR", "TURN")}</div><div style={{ color: "#fff", fontSize: 14, fontWeight: 1000 }}>#{game.turnNo}</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPI LIVE — exactement le principe Loterie, clic -> popin détaillée */}
      <section style={{ ...panelStyle(), flex: "0 0 52px", padding: 7 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
          <MiniKpi label={L("CIBLES", "TARGETS")} value={activePlayer?.stats?.targetsCleared || 0} color={accent} onClick={() => setStatsOpen(true)} />
          <MiniKpi label={L("IMPOSÉES", "SET")} value={activePlayer?.stats?.targetsImposed || 0} color={GOOD} onClick={() => setStatsOpen(true)} />
          <MiniKpi label={L("SAUV. D3", "D3 SAVES")} value={activePlayer?.stats?.lastDartSaves || 0} color={PINK} onClick={() => setStatsOpen(true)} />
          <MiniKpi label={L("VIES PERDUES", "LIVES LOST")} value={activePlayer?.stats?.livesLost || 0} color={BAD} onClick={() => setStatsOpen(true)} />
        </div>
      </section>

      {/* BANDEAU JOUEURS — même structure que Killer */}
      <button type="button" onClick={() => setPlayersOpen(true)} style={{ ...panelStyle(), flex: compact ? "0 0 76px" : "0 0 84px", padding: 0, overflow: "hidden", cursor: "pointer", textAlign: "left", backgroundImage: `url(${headerTicker})`, backgroundBlendMode: "screen", backgroundColor: "rgba(0,0,0,.18)", backgroundSize: "cover", backgroundPosition: "center" }} title={L("Liste des joueurs", "Players list")}>
        <div style={{ padding: "7px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "linear-gradient(90deg, rgba(0,0,0,.58), rgba(0,0,0,.18) 55%, rgba(0,0,0,.48))", borderBottom: "1px solid rgba(255,255,255,.10)" }}>
          <span style={{ fontWeight: 1000, letterSpacing: 1.2, color: accent, textTransform: "uppercase", whiteSpace: "nowrap", fontSize: 11 }}>{L("Joueurs", "Players")}</span>
          <span style={{ width: 25, height: 25, borderRadius: 999, border: `1px solid ${accent}AA`, color: accent, background: "rgba(0,0,0,.28)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 1000 }}>{game.players.length}</span>
        </div>
        <div style={{ padding: "5px 8px 6px", background: "rgba(0,0,0,.38)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", overflowY: "hidden", padding: "2px 1px", scrollbarWidth: "none" }}>
            {game.players.map((p: any, idx: number) => {
              const active = idx === game.turnIndex && !finished;
              const alive = gros6IsPlayerActive(game, p);
              return (
                <div key={p.id} style={{ flex: "0 0 auto", opacity: alive ? 1 : .42, display: "grid", justifyItems: "center", gap: 2 }}>
                  <div style={{ borderRadius: 999, padding: 1, boxShadow: active ? `0 0 0 2px ${accent}, 0 0 12px ${accent}66` : "none" }}><ProfileAvatar name={p.name} avatarDataUrl={p.avatarDataUrl} size={compact ? 34 : 38} /></div>
                  <div style={{ maxWidth: 58, color: active ? accent : "#fff", fontSize: 7.4, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </button>

      {/* SCORE INPUT HUB NATIF — mêmes méthodes / même composant que X01, Territories, Killer */}
      {activeHuman ? (
        <div className="gros6-scorehub" style={{ position: "relative" }}>
          {config?.allowSpecialZones && String(config?.selectionPolicy || "open") !== "pro" ? (
            <button type="button" onClick={() => setSpecialOpen(true)} style={{ position: "absolute", top: 2, right: 4, zIndex: 8, height: 28, borderRadius: 999, border: `1px solid ${accent}55`, background: "rgba(7,10,18,.94)", color: accent, padding: "0 9px", fontSize: 8.5, fontWeight: 1000, cursor: "pointer", boxShadow: `0 0 12px ${accent}20` }}>{L("ZONES", "ZONES")}</button>
          ) : null}
          <ScoreInputHub
            currentThrow={currentThrow as any}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onBackspace={undo}
            onCancel={undo}
            onNumber={submitNumber}
            onBull={submitBull}
            onValidate={phaseSelect ? finishSelectionNow : (() => {})}
            onDirectDart={submitUiDart}
            onSetVisitDarts={applyPresetDarts}
            preferredMethod={(config as any)?.scoreInputDefaultMethod || (config as any)?.scoreInputMethod || null}
            hidePreview
            hideTotal
            showPlaceholders={false}
            hideSwitcher={false}
            hideTabs={false}
            switcherMode="inline"
            fitToParent
            validateLabel={phaseSelect ? L("VALIDER CIBLE", "CONFIRM TARGET") : L("TOUR EN COURS", "TURN ACTIVE")}
            validateDisabled={!phaseSelect}
            centerSlot={<span style={{ display: "inline-block", minWidth: 58, textAlign: "center", padding: "8px 12px", borderRadius: 14, background: `${accent}12`, border: `1px solid ${accent}66`, color: accent, fontWeight: 1000, fontSize: 19, lineHeight: 1, boxShadow: `0 0 16px ${accent}22` }}>{targetUiLabel(activeTarget, lang)}</span>}
          />
        </div>
      ) : !finished && activePlayer?.isBot ? (
        <div style={{ flex: "1 1 auto", minHeight: 0, display: "grid", placeItems: "center", ...panelStyle(), color: SOFT, fontSize: 12, fontWeight: 900 }}>🤖 {activePlayer.name} {L("joue automatiquement…", "is playing automatically…")}</div>
      ) : (
        <div style={{ flex: "1 1 auto", minHeight: 0, display: "grid", placeItems: "center", ...panelStyle() }}>
          <div style={{ textAlign: "center" }}><div style={{ color: accent, fontSize: 24, fontWeight: 1000 }}>{game.winnerName}</div><div style={{ marginTop: 5, color: SOFT, fontSize: 11 }}>{game.winnerType === "team" ? L("Dernière équipe en jeu", "Last surviving team") : L("Dernier joueur en vie", "Last surviving player")}</div></div>
        </div>
      )}

      {statsOpen ? <PlayerStatsModal player={activePlayer} teamName={statsPlayerTeam} onClose={() => setStatsOpen(false)} accent={accent} lang={lang} /> : null}
      {playersOpen ? <PlayersModal game={game} activeIndex={game.turnIndex} onClose={() => setPlayersOpen(false)} accent={accent} lang={lang} /> : null}
      {specialOpen ? <SpecialZonesModal onClose={() => setSpecialOpen(false)} onPick={pickSpecial} accent={accent} lang={lang} /> : null}
      {rulesOpen ? (
        <ModalShell onClose={() => setRulesOpen(false)} title={L("GROS 6 — RÈGLES", "BIG 6 — RULES")} accent={accent}>
          <div style={{ color: "#e2e4ef", fontSize: 12.5, lineHeight: 1.65 }}>{L("Touchez la cible courante avec vos 3 fléchettes. Un échec fait perdre une vie. Une réussite permet d'utiliser les fléchettes restantes pour imposer la prochaine cible. Les zones fermées/extérieures activées dans la configuration sont de vraies cibles distinctes. Si la cible est validée sur la 3e fléchette, le bonus configuré ouvre une nouvelle volée de sélection.", "Hit the current target within 3 darts. Missing it costs one life. If you succeed, use the remaining darts to set the next target. Enabled closed/outer zones are distinct targets. If the target is cleared with the 3rd dart, the configured bonus opens a new selection visit.")}</div>
        </ModalShell>
      ) : null}
    </div>
  );
}
