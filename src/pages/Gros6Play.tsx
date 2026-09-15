// @ts-nocheck
// =============================================================
// GROS 6 / BIG 6 — PLAY V5
// UI alignée sur les modes finalisés (X01 / KILLER / TERRITORIES / LOTERIE)
// - vrai Keypad natif Darts Counter
// - layout fullscreen 100dvh sans scroll de page
// - ticker compact + BackDot / InfoDot
// - joueur actif / cible / vies / volée dans un bloc unique
// - rail participants compact, détails/stats en popins
// - zones spéciales via action auxiliaire DU keypad natif
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import ProfileAvatar from "../components/ProfileAvatar";
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

function targetUiLabel(target: any, lang: string) {
  if (!target) return "—";
  if (target.kind === "special") {
    const code = String(target.code || "");
    const match = code.match(/^digit_(\d+)$/);
    if (match) return lang === "fr" ? `Rond du ${match[1]}` : `No. ${match[1]} ring`;
    if (code === "outer_numbers_ring") return lang === "fr" ? "Extérieur chiffres" : "Outer number ring";
  }
  return gros6TargetLabel(target);
}

function toKeypadDarts(items: any[]) {
  return (Array.isArray(items) ? items : []).slice(0, 3).map((hit: any) => {
    if (hit?.kind === "segment") return { v: Number(hit.value || 0), mult: hit.ring === "T" ? 3 : hit.ring === "D" ? 2 : 1 };
    if (hit?.kind === "bull") return { v: 25, mult: hit.bull === "DB" ? 2 : 1 };
    return { v: 0, mult: 1 };
  });
}

function HitChip({ hit, theme, lang }: any) {
  const special = hit?.kind === "special";
  const miss = hit?.kind === "miss";
  return (
    <span style={{
      minWidth: 48,
      height: 30,
      padding: "0 9px",
      borderRadius: 10,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: `1px solid ${special ? `${theme.primary}55` : miss ? "rgba(255,90,110,.38)" : "rgba(255,255,255,.10)"}`,
      background: special ? `${theme.primary}16` : miss ? "rgba(120,12,28,.22)" : "rgba(0,0,0,.35)",
      color: special ? theme.primary : miss ? "#ff9aaa" : "#fff",
      fontSize: 11,
      fontWeight: 1000,
      whiteSpace: "nowrap",
    }}>{targetUiLabel(hit, lang)}</span>
  );
}

function Metric({ label, value, accent, strong = false }: any) {
  return (
    <div style={{ minWidth: 0, textAlign: "center" }}>
      <div style={{ fontSize: 8.5, color: "rgba(210,216,236,.62)", fontWeight: 900, textTransform: "uppercase", letterSpacing: .65, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ marginTop: 2, color: strong ? accent : "#fff", fontSize: strong ? 18 : 13, lineHeight: 1.05, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

function SmallAction({ children, onClick, accent, count }: any) {
  return (
    <button type="button" onClick={onClick} style={{
      height: 36,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,.09)",
      background: "rgba(255,255,255,.045)",
      color: "#fff",
      padding: "0 11px",
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      fontSize: 10.5,
      fontWeight: 1000,
      cursor: "pointer",
      minWidth: 0,
    }}>
      <span style={{ color: accent }}>{children}</span>
      {count != null ? <span style={{ width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center", background: `${accent}18`, border: `1px solid ${accent}44`, color: accent, fontSize: 10, flex: "0 0 auto" }}>{count}</span> : null}
    </button>
  );
}

function ModalShell({ onClose, title, accent, children }: any) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, display: "grid", placeItems: "center", padding: 12, background: "rgba(0,0,0,.76)", backdropFilter: "blur(6px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "84dvh", overflow: "hidden", borderRadius: 20, border: `1px solid ${accent}55`, background: "linear-gradient(180deg,rgba(16,19,31,.99),rgba(7,9,16,.995))", boxShadow: "0 24px 80px rgba(0,0,0,.76)" }}>
        <div style={{ height: 50, padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ color: accent, fontSize: 13, fontWeight: 1000, letterSpacing: .8, textTransform: "uppercase" }}>{title}</div>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ maxHeight: "calc(84dvh - 50px)", overflowY: "auto", padding: 12 }}>{children}</div>
      </div>
    </div>
  );
}

function SpecialTargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function Gros6Play({ store, go, config, onFinish }: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string) => (lang === "fr" ? fr : en), [lang]);

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
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update as any);
  }, []);

  const compact = viewport.w < 720;
  const veryShort = viewport.h < 740;
  const keypadZoom = viewport.h < 700 ? .78 : viewport.h < 780 ? .84 : viewport.h < 900 ? .90 : .96;
  const tickerHeight = compact ? (veryShort ? 58 : 66) : 76;
  const accent = theme.primary || "#42d6ff";

  const activePlayer = game.players[game.turnIndex];
  const activeTeam = game.participantMode === "teams" ? game.teams.find((team: any) => String(team.id) === String(activePlayer?.teamId || "")) : null;
  const alivePlayers = game.players.filter((player: any) => gros6IsPlayerActive(game, player));
  const aliveTeams = gros6AliveTeams(game);
  const phaseSelect = game.phase === "select";
  const phaseFinished = game.phase === "finished";
  const activeHuman = !phaseFinished && !!activePlayer && !activePlayer.isBot;
  const currentHits = phaseSelect ? game.selectionDarts : game.attackDarts;
  const keypadDarts = toKeypadDarts(currentHits);
  const dartsLeft = phaseSelect ? Math.max(0, Number(game.selectionAllowed || 0) - game.selectionDarts.length) : Math.max(0, 3 - game.attackDarts.length);
  const proSelection = phaseSelect && String(config?.selectionPolicy || "open") === "pro";
  const allowSpecialButton = !!config?.allowSpecialZones && !proSelection;
  const lifeValue = game.participantMode === "teams" && game.teamLifeMode === "shared" ? Number(activeTeam?.lives || 0) : Number(activePlayer?.lives || 0);
  const headerTicker = lang === "fr" ? tickerGros6 : tickerBig6;

  React.useEffect(() => {
    if (proSelection && multiplier === 1) setMultiplier(2);
  }, [proSelection, multiplier]);
  React.useEffect(() => { setMultiplier(1); }, [game.turnIndex]);

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

  const pushNumber = React.useCallback((n: number) => {
    if (n === 0) {
      submitHit(makeGros6Miss());
      setMultiplier(1);
      return;
    }
    const ring = multiplier === 3 ? "T" : multiplier === 2 ? "D" : "S";
    const hit = makeGros6Segment(ring, n);
    if (phaseSelect && !isGros6TargetAllowedForSelection(hit, config)) return;
    submitHit(hit);
    setMultiplier(1);
  }, [multiplier, phaseSelect, config, submitHit]);

  const pushBull = React.useCallback(() => {
    const hit = makeGros6Bull(multiplier === 2);
    if (phaseSelect && !isGros6TargetAllowedForSelection(hit, config)) return;
    submitHit(hit);
    setMultiplier(1);
  }, [multiplier, phaseSelect, config, submitHit]);

  const pushSpecial = React.useCallback((zone: any) => {
    const hit = makeGros6Special(zone.code, zone.label);
    if (phaseSelect && !isGros6TargetAllowedForSelection(hit, config)) return;
    setSpecialOpen(false);
    submitHit(hit);
    setMultiplier(1);
  }, [phaseSelect, config, submitHit]);

  const finishSelectionNow = React.useCallback(() => {
    commit((prev: any) => prev.phase === "select" ? finalizeGros6Selection(prev) : prev);
  }, [commit]);

  React.useEffect(() => {
    if (!game.winnerId || reportedRef.current) return;
    reportedRef.current = true;
    const payload = {
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
    };
    try { onFinish?.(payload); } catch {}
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

  const playerRailHeight = compact ? 58 : 66;
  const phaseText = phaseSelect ? L("CHOISIS LA PROCHAINE CIBLE", "CHOOSE THE NEXT TARGET") : phaseFinished ? L("PARTIE TERMINÉE", "MATCH FINISHED") : L("CIBLE À TOUCHER", "TARGET TO HIT");

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", overflow: "hidden", overscrollBehavior: "none", background: theme.pageBg || theme.bg || "#060812", color: theme.text || "#fff", display: "flex", flexDirection: "column", padding: compact ? 6 : 8, gap: compact ? 5 : 7 }}>
      {/* HEADER ticker — compact, même logique que les modes finalisés */}
      <div style={{ flex: `0 0 ${tickerHeight}px`, position: "relative", height: tickerHeight, borderRadius: compact ? 14 : 18, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 10px 28px rgba(0,0,0,.42)" }}>
        <img src={headerTicker as any} alt={lang === "fr" ? "Gros 6" : "Big 6"} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg,rgba(0,0,0,.48),rgba(0,0,0,0) 22%,rgba(0,0,0,0) 78%,rgba(0,0,0,.48))" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}><BackDot onClick={() => go?.("gros_6_config")} title={L("Retour", "Back")} size={compact ? 34 : 38} color={accent} glow={`${accent}AA`} /></div>
          <div style={{ pointerEvents: "auto" }}><InfoDot onClick={() => setRulesOpen(true)} title={L("Règles du Gros 6", "Big 6 rules")} size={compact ? 34 : 38} color={accent} glow={`${accent}AA`} /></div>
        </div>
      </div>

      {/* ZONE JEU — aucune page scrollable */}
      <main style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", width: "100%", maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: compact ? 5 : 7 }}>
        {/* ACTIVE PLAYER / TARGET — carte centrale à la X01/Killer/Loterie */}
        <section style={{ flex: compact ? "0 0 146px" : "0 0 158px", minHeight: 0, borderRadius: compact ? 16 : 18, border: `1px solid ${accent}55`, background: `radial-gradient(circle at 52% 5%, ${accent}18, transparent 42%), linear-gradient(180deg,rgba(15,19,34,.96),rgba(7,10,18,.98))`, boxShadow: `0 0 22px ${accent}14, 0 14px 34px rgba(0,0,0,.38)`, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, opacity: .045, backgroundImage: `url(${headerTicker})`, backgroundSize: "cover", backgroundPosition: "center", pointerEvents: "none" }} />
          <div style={{ position: "relative", height: "100%", display: "grid", gridTemplateColumns: compact ? "78px minmax(0,1fr) 74px" : "98px minmax(0,1fr) 102px", gap: compact ? 6 : 10, alignItems: "center", padding: compact ? "8px 8px" : "10px 12px" }}>
            {/* joueur */}
            <div style={{ minWidth: 0, display: "grid", justifyItems: "center", gap: 4 }}>
              <ProfileAvatar name={activePlayer?.name || "?"} avatarDataUrl={activePlayer?.avatarDataUrl} size={compact ? 54 : 68} />
              <div style={{ width: "100%", color: accent, fontSize: compact ? 10 : 12, fontWeight: 1000, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activePlayer?.name || "—"}</div>
              {activeTeam ? <div style={{ width: "100%", fontSize: 8, color: "rgba(220,224,239,.62)", fontWeight: 900, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeTeam.name}</div> : null}
            </div>

            {/* cible */}
            <div style={{ minWidth: 0, alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ color: "rgba(210,216,236,.66)", fontSize: compact ? 8 : 9, fontWeight: 1000, textTransform: "uppercase", letterSpacing: 1 }}>{phaseText}</div>
              <div style={{ color: accent, fontSize: compact ? "clamp(42px,12vw,58px)" : 66, fontWeight: 1000, lineHeight: .96, letterSpacing: .5, textShadow: `0 0 28px ${accent}44`, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{phaseSelect && game.pendingNextTarget ? targetUiLabel(game.pendingNextTarget, lang) : targetUiLabel(game.currentTarget, lang)}</div>
              <div style={{ marginTop: 5, width: "100%", display: "flex", justifyContent: "center", gap: 5, minHeight: 30, overflow: "hidden" }}>
                {[0, 1, 2].map((i) => currentHits[i] ? <HitChip key={i} hit={currentHits[i]} theme={theme} lang={lang} /> : <span key={i} style={{ width: 42, height: 28, borderRadius: 9, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.24)", display: "grid", placeItems: "center", color: "rgba(255,255,255,.22)", fontSize: 11, fontWeight: 900 }}>—</span>)}
              </div>
              <div style={{ marginTop: 4, maxWidth: "100%", color: "rgba(226,230,242,.78)", fontSize: compact ? 8.6 : 10.5, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{game.message}</div>
            </div>

            {/* KPI */}
            <div style={{ minWidth: 0, alignSelf: "stretch", display: "grid", alignContent: "center", gap: compact ? 8 : 10 }}>
              <Metric label={L("Vies", "Lives")} value={`❤️ ${lifeValue}`} accent={accent} strong />
              <Metric label={phaseSelect ? L("Sélection", "Selection") : L("Darts", "Darts")} value={dartsLeft} accent={accent} strong />
              <Metric label={L("Tour", "Turn")} value={`#${game.turnNo}`} accent={accent} />
            </div>
          </div>
        </section>

        {/* RAIL JOUEURS — compact comme Killer/X01, pas de grosses cartes */}
        <section style={{ flex: `0 0 ${playerRailHeight}px`, minHeight: 0, borderRadius: 15, border: "1px solid rgba(255,255,255,.075)", background: "rgba(10,13,23,.92)", display: "flex", alignItems: "center", gap: 7, padding: "5px 7px", overflow: "hidden" }}>
          <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", alignItems: "center", gap: compact ? 8 : 10, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" }}>
            {game.players.map((p: any, index: number) => {
              const active = index === game.turnIndex && !phaseFinished;
              const alive = gros6IsPlayerActive(game, p);
              return (
                <button key={p.id} type="button" onClick={() => setPlayersOpen(true)} style={{ flex: "0 0 auto", width: compact ? 48 : 58, border: 0, background: "transparent", padding: 0, color: "#fff", opacity: alive ? 1 : .35, cursor: "pointer", display: "grid", justifyItems: "center", gap: 2 }}>
                  <div style={{ borderRadius: 999, padding: 2, boxShadow: active ? `0 0 0 2px ${accent}, 0 0 15px ${accent}66` : "none" }}><ProfileAvatar name={p.name} avatarDataUrl={p.avatarDataUrl} size={compact ? 36 : 43} /></div>
                  <div style={{ width: "100%", fontSize: 7.8, fontWeight: 950, color: active ? accent : "rgba(235,238,247,.78)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{p.name}</div>
                </button>
              );
            })}
          </div>
          <div style={{ flex: "0 0 auto", display: "flex", gap: 5 }}>
            <SmallAction onClick={() => setPlayersOpen(true)} accent={accent} count={game.players.length}>{L("Joueurs", "Players")}</SmallAction>
            {!compact ? <SmallAction onClick={() => setStatsOpen(true)} accent={accent}>{L("Stats", "Stats")}</SmallAction> : null}
          </div>
        </section>

        {/* BARRE D'ÉTAT — remplace les 6 grosses cartes inutiles */}
        <section style={{ flex: compact ? "0 0 43px" : "0 0 48px", minHeight: 0, borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)", padding: "5px 8px", display: "grid", gridTemplateColumns: compact ? "repeat(4,minmax(0,1fr))" : "repeat(6,minmax(0,1fr))", gap: 4, alignItems: "center" }}>
          <Metric label={L("Phase", "Phase")} value={phaseSelect ? L("Choix", "Select") : L("Attaque", "Attack")} accent={accent} />
          <Metric label={L("En vie", "Alive")} value={game.participantMode === "teams" ? aliveTeams.length : alivePlayers.length} accent={accent} />
          <Metric label={L("Règle", "Rule")} value={config?.targetRule === "value" ? L("Valeur", "Value") : "S/D/T"} accent={accent} />
          <Metric label={L("Bonus D3", "D3 bonus")} value={config?.thirdDartBonusSelection ? String(config?.thirdDartBonusCount || 3) : "OFF"} accent={accent} />
          {!compact ? <Metric label="Bull" value={config?.allowBull ? "ON" : "OFF"} accent={accent} /> : null}
          {!compact ? <Metric label={L("Zones", "Zones")} value={config?.allowSpecialZones ? "ON" : "OFF"} accent={accent} /> : null}
        </section>

        {compact ? (
          <div style={{ flex: "0 0 34px", minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <SmallAction onClick={() => setStatsOpen(true)} accent={accent}>{L("STATISTIQUES LIVE", "LIVE STATS")}</SmallAction>
            {game.participantMode === "teams" ? <SmallAction onClick={() => setPlayersOpen(true)} accent={accent} count={aliveTeams.length}>{L("ÉQUIPES EN VIE", "TEAMS ALIVE")}</SmallAction> : <SmallAction onClick={() => setPlayersOpen(true)} accent={accent} count={alivePlayers.length}>{L("JOUEURS EN VIE", "PLAYERS ALIVE")}</SmallAction>}
          </div>
        ) : null}

        {phaseFinished ? (
          <section style={{ flex: "1 1 auto", minHeight: 0, borderRadius: 18, border: `1px solid ${accent}55`, background: `${accent}10`, display: "grid", placeItems: "center", textAlign: "center", padding: 14 }}>
            <div>
              <div style={{ color: accent, fontSize: 28, fontWeight: 1000 }}>{game.winnerName}</div>
              <div style={{ marginTop: 4, color: "rgba(230,234,245,.70)", fontSize: 11 }}>{game.winnerType === "team" ? L("Dernière équipe en jeu", "Last surviving team") : L("Dernier joueur en vie", "Last surviving player")}</div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8 }}>
                <SmallAction onClick={() => go?.("gros_6_config")} accent={accent}>{L("REJOUER", "PLAY AGAIN")}</SmallAction>
                <SmallAction onClick={() => go?.("games")} accent={accent}>{L("JEUX", "GAMES")}</SmallAction>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      {/* VRAI KEYPAD NATIF — exactement le composant utilisé par les modes finalisés */}
      {activeHuman ? (
        <div style={{ flex: "0 0 auto", width: "100%", maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 40, zoom: keypadZoom }}>
          <Keypad
            currentThrow={keypadDarts as any}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onBackspace={undo}
            onCancel={undo}
            onNumber={pushNumber}
            onBull={pushBull}
            onValidate={phaseSelect ? finishSelectionNow : (() => {})}
            hidePreview={true}
            hideTotal={true}
            safeBottomPad={true}
            validateLabel={phaseSelect ? L("VALIDER CIBLE", "CONFIRM TARGET") : L("TOUR EN COURS", "TURN ACTIVE")}
            validateDisabled={!phaseSelect}
            centerSlot={
              <div style={{ minWidth: 58, height: 38, padding: "0 8px", borderRadius: 12, display: "grid", placeItems: "center", border: `1px solid ${accent}44`, background: `${accent}10`, color: accent, fontSize: 17, fontWeight: 1000, whiteSpace: "nowrap" }}>
                {phaseSelect && game.pendingNextTarget ? targetUiLabel(game.pendingNextTarget, lang) : targetUiLabel(game.currentTarget, lang)}
              </div>
            }
            auxAction={allowSpecialButton ? {
              label: L("Zones spéciales", "Special zones"),
              icon: <SpecialTargetIcon />,
              onClick: () => setSpecialOpen(true),
              active: !!specialOpen,
              title: L("Zones fermées / extérieures", "Closed / outer zones"),
              ariaLabel: L("Ouvrir les zones spéciales", "Open special zones"),
            } : null}
          />
        </div>
      ) : (!phaseFinished && activePlayer?.isBot ? (
        <div style={{ flex: "0 0 56px", maxWidth: 720, width: "100%", margin: "0 auto", borderRadius: 16, border: `1px solid ${accent}33`, background: `${accent}0c`, display: "grid", placeItems: "center", textAlign: "center", color: "rgba(235,238,247,.78)", fontSize: 12, fontWeight: 900 }}>
          🤖 {activePlayer.name} {L("joue automatiquement…", "is playing automatically…")}
        </div>
      ) : null)}

      {specialOpen ? (
        <ModalShell onClose={() => setSpecialOpen(false)} title={L("Zones spéciales", "Special zones")} accent={accent}>
          <div style={{ marginBottom: 10, color: "rgba(220,225,240,.68)", fontSize: 11, lineHeight: 1.45 }}>{L("Choisis exactement la zone physique touchée. Ces zones sont traitées comme des cibles distinctes.", "Choose the exact physical zone hit. These zones are treated as distinct targets.")}</div>
          <button type="button" onClick={() => pushSpecial({ code: "outer_numbers_ring", label: "Extérieur cercle chiffres" })} style={{ width: "100%", minHeight: 42, borderRadius: 13, border: `1px solid ${accent}55`, background: `${accent}12`, color: "#fff", fontWeight: 1000, cursor: "pointer", marginBottom: 9 }}>{L("EXTÉRIEUR DU CERCLE DES CHIFFRES", "OUTSIDE THE NUMBER RING")}</button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 7 }}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => pushSpecial({ code: `digit_${n}`, label: `Rond du ${n}` })} style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.045)", color: "#fff", fontWeight: 1000, cursor: "pointer" }}>{n}</button>
            ))}
          </div>
        </ModalShell>
      ) : null}

      {playersOpen ? (
        <ModalShell onClose={() => setPlayersOpen(false)} title={game.participantMode === "teams" ? L("Joueurs & équipes", "Players & teams") : L("Joueurs", "Players")} accent={accent}>
          {game.participantMode === "teams" ? <div style={{ display: "grid", gap: 7, marginBottom: 10 }}>{game.teams.map((team: any) => <div key={team.id} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.035)", padding: 9, display: "flex", justifyContent: "space-between", gap: 10 }}><b>{team.name}</b><span style={{ color: "rgba(220,225,240,.68)", fontSize: 11 }}>{game.teamLifeMode === "shared" ? `❤️ ${team.lives}` : `${game.players.filter((p: any) => String(p.teamId) === String(team.id) && gros6IsPlayerActive(game,p)).length} actifs`}</span></div>)}</div> : null}
          <div style={{ display: "grid", gap: 7 }}>
            {game.players.map((p: any, index: number) => {
              const alive = gros6IsPlayerActive(game, p);
              const active = index === game.turnIndex && !phaseFinished;
              return <div key={p.id} style={{ borderRadius: 14, border: `1px solid ${active ? `${accent}55` : "rgba(255,255,255,.07)"}`, background: active ? `${accent}0e` : "rgba(255,255,255,.03)", padding: 9, display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 9, alignItems: "center", opacity: alive ? 1 : .5 }}><ProfileAvatar name={p.name} avatarDataUrl={p.avatarDataUrl} size={40} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div><div style={{ marginTop: 2, color: active ? accent : "rgba(215,220,238,.60)", fontSize: 10 }}>{!alive ? L("Éliminé", "Eliminated") : active ? L("À jouer", "Playing") : L("En attente", "Waiting")}</div></div><div style={{ fontWeight: 1000 }}>❤️ {p.lives}</div></div>;
            })}
          </div>
        </ModalShell>
      ) : null}

      {statsOpen ? (
        <ModalShell onClose={() => setStatsOpen(false)} title={L("Statistiques live", "Live stats")} accent={accent}>
          <div style={{ display: "grid", gap: 8 }}>
            {game.players.map((p: any) => <div key={p.id} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>{p.name}</b><span>❤️ {p.lives}</span></div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}><Metric label={L("Cibles", "Targets")} value={p.stats.targetsCleared} accent={accent}/><Metric label={L("Imposées", "Set")} value={p.stats.targetsImposed} accent={accent}/><Metric label={L("Vies perdues", "Lives lost")} value={p.stats.livesLost} accent={accent}/><Metric label={L("Sauvetages D3", "D3 saves")} value={p.stats.lastDartSaves} accent={accent}/><Metric label={L("Zones spéciales", "Special zones")} value={p.stats.specialTargetsCleared} accent={accent}/><Metric label="D / T" value={`${p.stats.doublesCleared}/${p.stats.triplesCleared}`} accent={accent}/></div></div>)}
          </div>
        </ModalShell>
      ) : null}

      {rulesOpen ? (
        <ModalShell onClose={() => setRulesOpen(false)} title={L("Gros 6 — règles", "Big 6 — rules")} accent={accent}>
          <div style={{ color: "rgba(230,234,245,.82)", fontSize: 12.5, lineHeight: 1.65 }}>{L("Touchez la cible courante avec vos 3 fléchettes. Un échec fait perdre une vie. Une réussite permet d'utiliser les fléchettes restantes pour imposer la prochaine cible. Les zones fermées/extérieures activées dans la configuration sont de vraies cibles distinctes. Si la cible est validée sur la 3e fléchette, le bonus configuré ouvre une nouvelle volée de sélection.", "Hit the current target within 3 darts. Missing it costs one life. If you succeed, use the remaining darts to set the next target. Enabled closed/outer zones are true distinct targets. If the target is cleared on the 3rd dart, the configured bonus starts a new selection visit.")}</div>
        </ModalShell>
      ) : null}
    </div>
  );
}
