// @ts-nocheck
// =============================================================
// GROS 6 / BIG 6 — PLAY V4
// Refonte visuelle haut de gamme :
// - header ticker compact
// - hero target card
// - rail joueurs/équipes
// - sidebar état / stats live
// - dock de saisie sticky inspiré des modes majeurs
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import tickerGros6 from "../assets/tickers/ticker_gros_6.png";
import tickerBig6 from "../assets/tickers/ticker_gros_6_en.png";
import {
  GROS6_NUMBER_ORDER,
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

function PillButton({ theme, active = false, onClick, children, disabled = false, compact = false }: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${active ? theme.primary : "rgba(255,255,255,.10)"}`,
        background: active
          ? `linear-gradient(180deg, ${theme.primary}38, ${theme.primary}15)`
          : "linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03))",
        color: disabled ? "#676b80" : "#fff",
        borderRadius: 999,
        padding: compact ? "7px 10px" : "10px 14px",
        minHeight: compact ? 34 : 40,
        fontWeight: 950,
        fontSize: compact ? 12 : 13,
        cursor: disabled ? "default" : "pointer",
        boxShadow: active ? `0 0 18px ${theme.primary}44, inset 0 1px 0 rgba(255,255,255,.08)` : "inset 0 1px 0 rgba(255,255,255,.04)",
        opacity: disabled ? 0.55 : 1,
        transition: "all .18s ease",
      }}
    >
      {children}
    </button>
  );
}

function GlassPanel({ title, subtitle, children, theme, accent = false, dense = false, actions = null }: any) {
  return (
    <section
      style={{
        borderRadius: dense ? 18 : 22,
        border: `1px solid ${accent ? `${theme.primary}55` : "rgba(255,255,255,.08)"}`,
        background: accent
          ? `linear-gradient(180deg, rgba(10,14,28,.97), rgba(6,9,18,.97)), radial-gradient(circle at top left, ${theme.primary}12, transparent 46%)`
          : "linear-gradient(180deg, rgba(10,14,28,.97), rgba(6,9,18,.97))",
        boxShadow: accent
          ? `0 18px 42px rgba(0,0,0,.42), 0 0 0 1px ${theme.primary}16 inset, 0 0 24px ${theme.primary}16`
          : "0 18px 42px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.03)",
        padding: dense ? 14 : 16,
        overflow: "hidden",
      }}
    >
      {(title || subtitle || actions) ? (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            {title ? <div style={{ fontSize: 12, fontWeight: 1000, textTransform: "uppercase", letterSpacing: 1, color: accent ? theme.primary : "#b9bed5" }}>{title}</div> : null}
            {subtitle ? <div style={{ fontSize: 12, color: "#8f97b5", marginTop: 4 }}>{subtitle}</div> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function StatChip({ label, value, theme, glow = false }: any) {
  return (
    <div
      style={{
        minWidth: 92,
        padding: "10px 12px",
        borderRadius: 16,
        border: `1px solid ${glow ? `${theme.primary}44` : "rgba(255,255,255,.08)"}`,
        background: glow ? `${theme.primary}12` : "rgba(255,255,255,.04)",
        boxShadow: glow ? `0 0 20px ${theme.primary}18` : "none",
      }}
    >
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: .8, color: "#9199b6", fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000, color: "#fff" }}>{value}</div>
    </div>
  );
}

function TargetToken({ hit, active = false, theme }: any) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "7px 12px",
        background: active ? `${theme.primary}20` : "rgba(255,255,255,.06)",
        border: `1px solid ${active ? `${theme.primary}55` : "rgba(255,255,255,.08)"}`,
        boxShadow: active ? `0 0 18px ${theme.primary}24` : "none",
        fontWeight: 1000,
        fontSize: 12,
      }}
    >
      {gros6TargetLabel(hit)}
    </div>
  );
}

function TeamBadge({ team, game, theme }: any) {
  const shared = game?.teamLifeMode === "shared";
  const aliveMembers = (game?.players || []).filter((p: any) => String(p.teamId) === String(team.id) && gros6IsPlayerActive(game, p)).length;
  return (
    <div style={{ minWidth: 170, borderRadius: 16, border: `1px solid ${team.eliminated ? "rgba(255,80,100,.32)" : "rgba(255,255,255,.08)"}`, background: team.eliminated ? "rgba(100,10,28,.22)" : "rgba(255,255,255,.035)", padding: 10, opacity: team.eliminated ? .58 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, overflow: "hidden", background: "rgba(0,0,0,.28)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          {team.logoDataUrl ? <img src={team.logoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 20 }}>🎯</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 1000, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}</div>
          <div style={{ color: "#9da3bc", fontSize: 10, marginTop: 2 }}>
            {shared ? `❤️ ${team.lives} vie${team.lives > 1 ? "s" : ""}` : `${aliveMembers} joueur${aliveMembers > 1 ? "s" : ""} actif${aliveMembers > 1 ? "s" : ""}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerTile({ player, game, active, theme }: any) {
  const alive = gros6IsPlayerActive(game, player);
  const team = game.participantMode === "teams" ? game.teams.find((t: any) => String(t.id) === String(player.teamId)) : null;
  const lifeText = game.participantMode === "teams" && game.teamLifeMode === "shared" ? `Équipe ❤️ ${team?.lives ?? 0}` : `❤️ ${player.lives}`;
  return (
    <div
      style={{
        minWidth: 132,
        borderRadius: 18,
        padding: 10,
        border: `1px solid ${active ? theme.primary : "rgba(255,255,255,.08)"}`,
        background: !alive ? "rgba(100,10,28,.20)" : active ? `${theme.primary}16` : "rgba(255,255,255,.035)",
        boxShadow: active ? `0 0 24px ${theme.primary}24` : "none",
        opacity: alive ? 1 : .58,
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><ProfileAvatar name={player.name} avatarDataUrl={player.avatarDataUrl} size={54} /></div>
      <div style={{ textAlign: "center", fontWeight: 1000, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</div>
      {team ? <div style={{ textAlign: "center", fontSize: 9.5, color: theme.primary, fontWeight: 900, marginTop: 2 }}>{team.name}</div> : null}
      <div style={{ textAlign: "center", fontSize: 10.5, color: "#aeb4cc", marginTop: 4 }}>{lifeText}</div>
      <div style={{ textAlign: "center", fontSize: 9.5, color: active ? theme.primary : "#737992", marginTop: 3 }}>{!alive ? "Éliminé" : active ? "À jouer" : "En attente"}</div>
    </div>
  );
}

function LiveStatRow({ player, theme }: any) {
  return (
    <div style={{ borderRadius: 16, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)", padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <ProfileAvatar name={player.name} avatarDataUrl={player.avatarDataUrl} size={34} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</div>
            <div style={{ fontSize: 10, color: "#959bb4" }}>❤️ {player.lives} • 🎯 {player.stats.targetsCleared}</div>
          </div>
        </div>
        <div style={{ fontSize: 10, textAlign: "right", color: "#a5abc3", lineHeight: 1.45 }}>
          Imposées {player.stats.targetsImposed}<br />
          Pertes {player.stats.livesLost}
        </div>
      </div>
      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, fontSize: 10 }}>
        <div style={{ borderRadius: 10, background: "rgba(255,255,255,.04)", padding: 7, textAlign: "center" }}><b>{player.stats.lastDartSaves}</b><div style={{ color: "#8891b1", marginTop: 2 }}>Sauvetages D3</div></div>
        <div style={{ borderRadius: 10, background: "rgba(255,255,255,.04)", padding: 7, textAlign: "center" }}><b>{player.stats.specialTargetsCleared}</b><div style={{ color: "#8891b1", marginTop: 2 }}>Zones spéciales</div></div>
        <div style={{ borderRadius: 10, background: "rgba(255,255,255,.04)", padding: 7, textAlign: "center" }}><b>{player.stats.doublesCleared}/{player.stats.triplesCleared}</b><div style={{ color: "#8891b1", marginTop: 2 }}>D / T</div></div>
      </div>
    </div>
  );
}

function InputPad({ theme, config, phase, onHit, compact, lang }: any) {
  const [ring, setRing] = React.useState("S");
  const [showSpecial, setShowSpecial] = React.useState(false);
  const selectionMode = phase === "select";
  const proSelection = selectionMode && String(config?.selectionPolicy || "open") === "pro";
  const L = (fr: string, en: string) => (lang === "fr" ? fr : en);

  React.useEffect(() => {
    if (proSelection && ring === "S") setRing("D");
  }, [proSelection, ring]);

  const submitSegment = (n: number) => {
    const hit = makeGros6Segment(ring, n);
    if (selectionMode && !isGros6TargetAllowedForSelection(hit, config)) return;
    onHit(hit);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[
          { id: "S", fr: "Simple", en: "Single" },
          { id: "D", fr: "Double", en: "Double" },
          { id: "T", fr: "Triple", en: "Treble" },
        ].map((item) => (
          <PillButton key={item.id} theme={theme} active={ring === item.id} disabled={proSelection && item.id === "S"} onClick={() => setRing(item.id)} compact={compact}>
            {lang === "fr" ? item.fr : item.en}
          </PillButton>
        ))}
        {!!config?.allowBull && <PillButton theme={theme} onClick={() => onHit(makeGros6Bull(false))} compact={compact}>BULL</PillButton>}
        {!!config?.allowBull && <PillButton theme={theme} onClick={() => onHit(makeGros6Bull(true))} compact={compact}>DBULL</PillButton>}
        <PillButton theme={theme} onClick={() => onHit(makeGros6Miss())} compact={compact}>MISS</PillButton>
        {!!config?.allowSpecialZones && !proSelection ? (
          <PillButton theme={theme} active={showSpecial} onClick={() => setShowSpecial((v) => !v)} compact={compact}>
            {showSpecial ? L("Masquer zones", "Hide zones") : L("Zones spéciales", "Special zones")}
          </PillButton>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(4,minmax(0,1fr))" : "repeat(5,minmax(0,1fr))", gap: 8 }}>
        {GROS6_NUMBER_ORDER.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => submitSegment(n)}
            style={{
              minHeight: compact ? 48 : 52,
              borderRadius: 15,
              border: `1px solid ${ring === "S" ? "rgba(255,255,255,.10)" : theme.primary + "30"}`,
              background: `linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04))`,
              color: "#fff",
              fontWeight: 1000,
              fontSize: compact ? 13 : 15,
              cursor: "pointer",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.04)",
            }}
          >
            {ring}{n}
          </button>
        ))}
      </div>

      {showSpecial ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .9, fontWeight: 1000, color: theme.primary }}>
            {L("Zones fermées / extérieures", "Closed / outer zones")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: compact ? 150 : 190, overflowY: "auto", paddingRight: 4 }}>
            {GROS6_SPECIAL_ZONES.map((zone) => (
              <PillButton key={zone.code} theme={theme} onClick={() => onHit(makeGros6Special(zone.code, zone.label))} compact>
                {zone.label}
              </PillButton>
            ))}
          </div>
        </div>
      ) : null}

      {proSelection ? (
        <div style={{ fontSize: 11, color: "#9ca2bd", lineHeight: 1.45 }}>
          {L(
            "Variante PRO : la prochaine cible ne peut être imposée qu'en double, triple, Bull ou DBull.",
            "PRO variant: the next target can only be set with doubles, trebles, Bull or DBull."
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Gros6Play({ store, go, config, onFinish }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string) => (lang === "fr" ? fr : en), [lang]);
  const [game, setGame] = React.useState(() => buildGros6InitialState(config));
  const undoStackRef = React.useRef<any[]>([]);
  const reportedRef = React.useRef(false);
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [viewport, setViewport] = React.useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewport(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isPhone = viewport < 680;
  const isNarrow = viewport < 1080;

  const activePlayer = game.players[game.turnIndex];
  const alivePlayers = game.players.filter((player: any) => gros6IsPlayerActive(game, player));
  const aliveTeams = gros6AliveTeams(game);
  const activeTeam = game.participantMode === "teams" ? game.teams.find((team: any) => String(team.id) === String(activePlayer?.teamId || "")) : null;
  const currentDarts = game.phase === "select" ? game.selectionDarts : game.attackDarts;
  const activeHuman = game.phase !== "finished" && !!activePlayer && !activePlayer?.isBot;

  const commit = React.useCallback((reducer: any) => {
    setGame((prev: any) => {
      undoStackRef.current.push(gros6Clone(prev));
      if (undoStackRef.current.length > 120) undoStackRef.current.shift();
      return reducer(prev);
    });
  }, []);

  const undo = React.useCallback(() => {
    const previous = undoStackRef.current.pop();
    if (previous) setGame(previous);
  }, []);

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
    }, 720);
    return () => window.clearTimeout(timer);
  }, [game.phase, game.turnIndex, game.winnerId, game.players, config]);

  const submitHit = React.useCallback((hit: any) => {
    commit((prev: any) => prev.phase === "select" ? applyGros6SelectionHit(prev, hit, config) : applyGros6AttackHit(prev, hit, config));
  }, [commit, config]);

  const finishSelectionNow = React.useCallback(() => {
    commit((prev: any) => prev.phase === "select" ? finalizeGros6Selection(prev) : prev);
  }, [commit]);

  const headerTicker = lang === "fr" ? tickerGros6 : tickerBig6;
  const phaseLabel = game.phase === "attack"
    ? L("Attaque", "Attack")
    : game.phase === "select"
      ? L("Choix de la prochaine cible", "Choosing next target")
      : L("Partie terminée", "Match finished");
  const remainingDarts = game.phase === "select" ? Math.max(0, Number(game.selectionAllowed || 0) - game.selectionDarts.length) : Math.max(0, 3 - game.attackDarts.length);
  const overviewMode = game.participantMode === "teams" ? L("Équipes", "Teams") : L("Individuel", "Solo");
  const overviewValidation = config?.targetRule === "value" ? L("Même valeur", "Same value") : L("S / D / T stricts", "Strict S / D / T");

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg || theme.bg || "#070912", color: theme.text || "#fff", padding: isPhone ? 10 : 14, paddingBottom: activeHuman ? (isPhone ? 350 : 305) : 24 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 80, margin: `${-isPhone ? 0 : 0}px ${-isPhone ? 0 : 0}px 14px`, background: `linear-gradient(180deg, ${theme.pageBg || theme.bg || "#070912"}, rgba(7,9,18,.92))`, paddingTop: "env(safe-area-inset-top)", backdropFilter: "blur(10px)" }}>
        <div style={{ position: "relative", maxWidth: 1380, margin: "0 auto" }}>
          <div style={{ position: "relative", height: isPhone ? 88 : 96, overflow: "hidden", borderRadius: 22, border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 16px 36px rgba(0,0,0,.40)" }}>
            <img src={headerTicker as any} alt={lang === "fr" ? "Gros 6" : "Big 6"} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.18), transparent 24%, transparent 76%, rgba(0,0,0,.18))" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
              <div style={{ pointerEvents: "auto" }}><BackDot onClick={() => go?.("gros_6_config")} size={42} color={theme.primary} glow={`${theme.primary}AA`} /></div>
              <div style={{ pointerEvents: "auto" }}><InfoDot onClick={() => setRulesOpen(true)} title={L("Règles du Gros 6", "Big 6 rules")} size={42} color={theme.primary} glow={`${theme.primary}AA`} /></div>
            </div>
          </div>
        </div>
      </header>

      <div style={{ width: "100%", maxWidth: 1380, margin: "0 auto", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatChip label={L("Phase", "Phase")} value={phaseLabel} theme={theme} glow />
          <StatChip label={L("Tour", "Turn")} value={`#${game.turnNo}`} theme={theme} />
          <StatChip label={L("Mode", "Mode")} value={overviewMode} theme={theme} />
          <StatChip label={L("Validation", "Validation")} value={overviewValidation} theme={theme} />
          <StatChip label={game.participantMode === "teams" ? L("Équipes en vie", "Teams alive") : L("Joueurs en vie", "Players alive")} value={game.participantMode === "teams" ? aliveTeams.length : alivePlayers.length} theme={theme} />
          <StatChip label={L("Bonus D3", "D3 bonus")} value={config?.thirdDartBonusSelection ? `${config?.thirdDartBonusCount || 3}` : "OFF"} theme={theme} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0,1.25fr) minmax(320px,.75fr)", gap: 14, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 14 }}>
            {game.participantMode === "teams" ? (
              <GlassPanel title={L("Équipes", "Teams")} subtitle={L("Vue rapide des équipes encore en jeu", "Quick look at surviving teams")} theme={theme} dense>
                <div style={{ display: "flex", gap: 9, overflowX: "auto", paddingBottom: 2 }}>{game.teams.map((team: any) => <TeamBadge key={team.id} team={team} game={game} theme={theme} />)}</div>
              </GlassPanel>
            ) : null}

            <GlassPanel title={L("Joueurs", "Players")} subtitle={L("Ordre de jeu et vies restantes", "Turn order and remaining lives")} theme={theme} dense>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>{game.players.map((player: any, index: number) => <PlayerTile key={player.id} player={player} game={game} active={index === game.turnIndex && game.phase !== "finished"} theme={theme} />)}</div>
            </GlassPanel>

            <GlassPanel title={game.phase === "select" ? L("Choix de la prochaine cible", "Choosing next target") : L("Cible courante", "Current target")} subtitle={L("Zone active et état du tour", "Active target and turn state")} theme={theme} accent>
              <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "minmax(0,1.1fr) minmax(240px,.9fr)", gap: 14, alignItems: "stretch" }}>
                <div style={{ borderRadius: 20, background: `linear-gradient(180deg, ${theme.primary}10, rgba(255,255,255,.03))`, border: `1px solid ${theme.primary}22`, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ color: "#94a0c4", fontSize: 12 }}>{L("Tour", "Turn")} #{game.turnNo}</div>
                      <div style={{ fontSize: "clamp(54px,10vw,92px)", lineHeight: .95, fontWeight: 1000, letterSpacing: 1, color: theme.primary, textShadow: `0 0 34px ${theme.primary}44`, marginTop: 6 }}>{gros6TargetLabel(game.currentTarget)}</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 100 }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: .8, fontWeight: 1000, color: "#8d93ad" }}>{game.phase === "select" ? L("Cible provisoire", "Preview") : L("Fléchettes restantes", "Darts left")}</div>
                      <div style={{ fontSize: game.phase === "select" ? 20 : 34, lineHeight: 1, fontWeight: 1000, marginTop: 6 }}>{game.phase === "select" ? gros6TargetLabel(game.pendingNextTarget) : remainingDarts}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, borderRadius: 14, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.06)", padding: "11px 12px", fontSize: 13, lineHeight: 1.5, color: "#eef0f7" }}>{game.message}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {currentDarts.map((dart: any, index: number) => <TargetToken key={`${gros6TargetLabel(dart)}-${index}`} hit={dart} theme={theme} active={index === currentDarts.length - 1} />)}
                    {!currentDarts.length ? <TargetToken hit={{ label: L("Aucune fléchette", "No dart yet") }} theme={theme} /> : null}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ borderRadius: 20, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <ProfileAvatar name={activePlayer?.name || "?"} avatarDataUrl={activePlayer?.avatarDataUrl} size={62} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11, color: "#93a0c4", textTransform: "uppercase", letterSpacing: .8, fontWeight: 1000 }}>{L("Joueur actif", "Active player")}</div>
                        <div style={{ fontSize: 19, fontWeight: 1000, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activePlayer?.name || "—"}</div>
                        {activeTeam ? <div style={{ fontSize: 11, color: theme.primary, marginTop: 3, fontWeight: 900 }}>{activeTeam.name}</div> : null}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
                      <div style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.04)" }}>
                        <div style={{ color: "#8d96b5", fontSize: 10, textTransform: "uppercase", letterSpacing: .8, fontWeight: 900 }}>{L("Vies", "Lives")}</div>
                        <div style={{ fontWeight: 1000, fontSize: 20, marginTop: 4 }}>❤️ {game.participantMode === "teams" && game.teamLifeMode === "shared" ? activeTeam?.lives ?? 0 : activePlayer?.lives ?? 0}</div>
                      </div>
                      <div style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.04)" }}>
                        <div style={{ color: "#8d96b5", fontSize: 10, textTransform: "uppercase", letterSpacing: .8, fontWeight: 900 }}>{L("Statut", "Status")}</div>
                        <div style={{ fontWeight: 1000, fontSize: 14, marginTop: 8 }}>{activePlayer?.isBot ? L("BOT en action", "BOT playing") : L("À ton tour", "Your turn")}</div>
                      </div>
                    </div>
                  </div>

                  {game.phase !== "finished" && activePlayer?.isBot ? (
                    <div style={{ borderRadius: 18, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", padding: 14 }}>
                      <div style={{ fontSize: 11, color: theme.primary, textTransform: "uppercase", letterSpacing: .8, fontWeight: 1000 }}>{L("Tour du BOT", "BOT turn")}</div>
                      <div style={{ fontSize: 16, fontWeight: 1000, marginTop: 6 }}>{activePlayer.name} {L("joue automatiquement…", "is playing automatically…")}</div>
                      <div style={{ color: "#8f95ad", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{L("Le BOT adapte sa précision à son niveau et choisit une cible conforme à la variante active.", "The BOT adapts its accuracy to its level and picks a target that matches the active ruleset.")}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </GlassPanel>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <GlassPanel title={L("État de la partie", "Match status")} subtitle={L("Paramètres actifs et vue globale", "Active settings and global overview")} theme={theme} dense>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, fontSize: 12, lineHeight: 1.45 }}>
                <div style={{ borderRadius: 14, background: "rgba(255,255,255,.04)", padding: 10 }}><b>{L("Mode", "Mode")}</b><div style={{ color: "#97a0be", marginTop: 3 }}>{overviewMode}</div></div>
                <div style={{ borderRadius: 14, background: "rgba(255,255,255,.04)", padding: 10 }}><b>{L("Validation", "Validation")}</b><div style={{ color: "#97a0be", marginTop: 3 }}>{overviewValidation}</div></div>
                <div style={{ borderRadius: 14, background: "rgba(255,255,255,.04)", padding: 10 }}><b>Bull</b><div style={{ color: "#97a0be", marginTop: 3 }}>{config?.allowBull ? "ON" : "OFF"}</div></div>
                <div style={{ borderRadius: 14, background: "rgba(255,255,255,.04)", padding: 10 }}><b>{L("Zones fermées", "Closed zones")}</b><div style={{ color: "#97a0be", marginTop: 3 }}>{config?.allowSpecialZones ? "ON" : "OFF"}</div></div>
                <div style={{ borderRadius: 14, background: "rgba(255,255,255,.04)", padding: 10 }}><b>{L("Bonus D3", "D3 bonus")}</b><div style={{ color: "#97a0be", marginTop: 3 }}>{config?.thirdDartBonusSelection ? `${config?.thirdDartBonusCount || 3} ${L("fléchettes", "darts")}` : "OFF"}</div></div>
                <div style={{ borderRadius: 14, background: "rgba(255,255,255,.04)", padding: 10 }}><b>{L("Politique de sélection", "Selection policy")}</b><div style={{ color: "#97a0be", marginTop: 3 }}>{String(config?.selectionPolicy || "open") === "pro" ? "PRO" : L("Libre", "Open")}</div></div>
              </div>
            </GlassPanel>

            <GlassPanel title={L("Statistiques live", "Live stats")} subtitle={L("Suivi détaillé des performances", "Detailed performance tracking")} theme={theme} dense>
              <div style={{ display: "grid", gap: 9, maxHeight: isNarrow ? "none" : 540, overflowY: "auto", paddingRight: 2 }}>
                {game.players.map((player: any) => <LiveStatRow key={player.id} player={player} theme={theme} />)}
              </div>
            </GlassPanel>

            {game.phase === "finished" ? (
              <GlassPanel title={L("Victoire", "Victory")} subtitle={L("Fin de partie", "End of match")} theme={theme} accent>
                <div style={{ fontSize: 30, fontWeight: 1000, color: theme.primary }}>{game.winnerName}</div>
                <div style={{ fontSize: 12, color: "#aeb4cc", lineHeight: 1.5, marginTop: 6 }}>{game.winnerType === "team" ? L("Dernière équipe encore en jeu.", "Last surviving team.") : L("Dernier joueur encore en vie.", "Last surviving player.")}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                  <PillButton theme={theme} active onClick={() => go?.("gros_6_config")}>{L("REJOUER", "PLAY AGAIN")}</PillButton>
                  <PillButton theme={theme} onClick={() => go?.("games")}>{L("JEUX", "GAMES")}</PillButton>
                </div>
              </GlassPanel>
            ) : null}
          </div>
        </div>
      </div>

      {activeHuman ? (
        <div style={{ position: "fixed", left: "50%", bottom: 10, transform: "translateX(-50%)", width: `min(${isPhone ? "calc(100vw - 12px)" : "1180px"}, calc(100vw - 16px))`, zIndex: 90, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <GlassPanel
              title={game.phase === "select" ? L("Choisir la prochaine cible", "Choose the next target") : `${L("Saisie", "Input")} — ${activePlayer?.name || "Joueur"}`}
              subtitle={game.phase === "select"
                ? L(`Encore ${remainingDarts} fléchette(s) de sélection`, `${remainingDarts} selection dart(s) left`)
                : L(`Tour de ${activePlayer?.name || "joueur"}`, `${activePlayer?.name || "player"}'s turn`)
              }
              theme={theme}
              accent
              actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <PillButton theme={theme} onClick={undo} disabled={!undoStackRef.current.length} compact>↶ {L("Annuler", "Undo")}</PillButton>
                  {game.phase === "select" ? <PillButton theme={theme} active onClick={finishSelectionNow} compact>{L("Valider la cible", "Confirm target")}</PillButton> : null}
                </div>
              }
            >
              <InputPad theme={theme} config={config} phase={game.phase} onHit={submitHit} compact={isPhone} lang={lang} />
            </GlassPanel>
          </div>
        </div>
      ) : null}

      {rulesOpen ? (
        <div onClick={() => setRulesOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 18 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(760px,96vw)", maxHeight: "86vh", overflowY: "auto", borderRadius: 24, border: `1px solid ${theme.primary}66`, background: "linear-gradient(180deg,rgba(13,16,31,.99),rgba(5,7,16,.99))", boxShadow: "0 20px 50px rgba(0,0,0,.5)", padding: 20 }}>
            <div style={{ color: theme.primary, fontWeight: 1000, fontSize: 21, marginBottom: 10 }}>{L("GROS 6 — RAPPEL", "BIG 6 — OVERVIEW")}</div>
            <div style={{ color: "#e2e4ef", fontSize: 13, lineHeight: 1.65 }}>
              {L(
                "Touchez la cible courante avec vos 3 fléchettes. Un échec fait perdre une vie. Une réussite permet d'utiliser les fléchettes restantes pour imposer la prochaine cible. Les zones fermées/extérieures activées dans la configuration sont de vraies cibles distinctes. Si la cible est validée sur la 3e fléchette, le bonus configuré ouvre une nouvelle volée de sélection.",
                "Hit the current target within 3 darts. Missing it costs one life. If you succeed, your remaining darts are used to set the next target. Closed or outer zones enabled in the configuration are treated as true distinct targets. If the target is cleared with the 3rd dart, the configured bonus opens a new selection visit."
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <PillButton theme={theme} active onClick={() => setRulesOpen(false)}>{L("FERMER", "CLOSE")}</PillButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
