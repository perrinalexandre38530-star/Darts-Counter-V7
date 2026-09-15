// @ts-nocheck
// =============================================================
// GROS 6 / BIG 6 — PLAY V3
// - moteur pur gros6Engine
// - individuel + équipes
// - vies individuelles / réserve commune
// - zones fermées/extérieures
// - sélection cible avec bonus 3e fléchette
// - bots + undo snapshots
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import tickerGros6 from "../assets/tickers/ticker_gros_6.png";
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

function PillButton({ theme, active = false, onClick, children, disabled = false }: any) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${active ? theme.primary : "rgba(255,255,255,.10)"}`,
        background: active ? `${theme.primary}22` : "rgba(255,255,255,.045)",
        color: disabled ? "#676b80" : "#fff",
        borderRadius: 999,
        padding: "8px 12px",
        fontWeight: 900,
        cursor: disabled ? "default" : "pointer",
        boxShadow: active ? `0 0 18px ${theme.primary}44` : "none",
        opacity: disabled ? .55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Panel({ title, children, theme, accent = false }: any) {
  return (
    <section style={{ borderRadius: 18, border: `1px solid ${accent ? `${theme.primary}44` : "rgba(255,255,255,.07)"}`, background: "rgba(9,11,20,.94)", padding: 14, boxShadow: "0 16px 36px rgba(0,0,0,.34)" }}>
      <div style={{ fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: .9, color: accent ? theme.primary : "#aeb4ce", marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

function TargetToken({ hit }: any) {
  return <div style={{ borderRadius: 999, padding: "6px 10px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.08)", fontWeight: 900, fontSize: 12 }}>{gros6TargetLabel(hit)}</div>;
}

function InputPad({ theme, config, phase, onHit }: any) {
  const [ring, setRing] = React.useState("S");
  const selectionMode = phase === "select";
  const proSelection = selectionMode && String(config?.selectionPolicy || "open") === "pro";
  const showSpecial = !!config?.allowSpecialZones && !proSelection;

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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { id: "S", label: "Simple" },
          { id: "D", label: "Double" },
          { id: "T", label: "Triple" },
        ].map((item) => (
          <PillButton key={item.id} theme={theme} active={ring === item.id} disabled={proSelection && item.id === "S"} onClick={() => setRing(item.id)}>{item.label}</PillButton>
        ))}
        {!!config?.allowBull && <PillButton theme={theme} onClick={() => onHit(makeGros6Bull(false))}>BULL</PillButton>}
        {!!config?.allowBull && <PillButton theme={theme} onClick={() => onHit(makeGros6Bull(true))}>DBULL</PillButton>}
        <PillButton theme={theme} onClick={() => onHit(makeGros6Miss())}>MISS</PillButton>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 7 }}>
        {GROS6_NUMBER_ORDER.map((n) => (
          <button key={n} type="button" onClick={() => submitSegment(n)} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.055)", color: "#fff", minHeight: 45, fontWeight: 1000, cursor: "pointer" }}>{ring}{n}</button>
        ))}
      </div>

      {showSpecial ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .8, fontWeight: 950, color: theme.primary }}>Zones fermées / extérieures</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, maxHeight: 210, overflowY: "auto" }}>
            {GROS6_SPECIAL_ZONES.map((zone) => <PillButton key={zone.code} theme={theme} onClick={() => onHit(makeGros6Special(zone.code, zone.label))}>{zone.label}</PillButton>)}
          </div>
        </div>
      ) : null}

      {proSelection ? <div style={{ fontSize: 11, color: "#9ca2bd", lineHeight: 1.4 }}>Variante PRO : la prochaine cible ne peut être imposée qu'en double, triple, Bull ou DBull.</div> : null}
    </div>
  );
}

function TeamBadge({ team, game, theme }: any) {
  const shared = game?.teamLifeMode === "shared";
  const aliveMembers = (game?.players || []).filter((p: any) => String(p.teamId) === String(team.id) && gros6IsPlayerActive(game, p)).length;
  return (
    <div style={{ minWidth: 170, borderRadius: 15, border: `1px solid ${team.eliminated ? "rgba(255,80,100,.32)" : `${theme.primary}33`}`, background: team.eliminated ? "rgba(100,10,28,.22)" : "rgba(255,255,255,.035)", padding: 10, opacity: team.eliminated ? .58 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, overflow: "hidden", background: "rgba(0,0,0,.28)", display: "grid", placeItems: "center" }}>{team.logoDataUrl ? <img src={team.logoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🎯"}</div>
        <div><div style={{ fontWeight: 950, fontSize: 12 }}>{team.name}</div><div style={{ color: "#9da3bc", fontSize: 10, marginTop: 2 }}>{shared ? `❤️ ${team.lives} vie${team.lives > 1 ? "s" : ""}` : `${aliveMembers} joueur${aliveMembers > 1 ? "s" : ""} actif${aliveMembers > 1 ? "s" : ""}`}</div></div>
      </div>
    </div>
  );
}

export default function Gros6Play({ store, go, config, onFinish }: any) {
  const { theme } = useTheme();
  const [game, setGame] = React.useState(() => buildGros6InitialState(config));
  const undoStackRef = React.useRef<any[]>([]);
  const reportedRef = React.useRef(false);
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [narrowLayout, setNarrowLayout] = React.useState(() => typeof window !== "undefined" ? window.innerWidth < 900 : false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setNarrowLayout(window.innerWidth < 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const activePlayer = game.players[game.turnIndex];
  const alivePlayers = game.players.filter((player: any) => gros6IsPlayerActive(game, player));
  const aliveTeams = gros6AliveTeams(game);

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
    }, 700);
    return () => window.clearTimeout(timer);
  }, [game.phase, game.turnIndex, game.winnerId, game.players, config]);

  const submitHit = React.useCallback((hit: any) => {
    commit((prev: any) => prev.phase === "select" ? applyGros6SelectionHit(prev, hit, config) : applyGros6AttackHit(prev, hit, config));
  }, [commit, config]);

  const finishSelectionNow = React.useCallback(() => {
    commit((prev: any) => prev.phase === "select" ? finalizeGros6Selection(prev) : prev);
  }, [commit]);

  const activeTeam = game.participantMode === "teams" ? game.teams.find((team: any) => String(team.id) === String(activePlayer?.teamId || "")) : null;
  const currentDarts = game.phase === "select" ? game.selectionDarts : game.attackDarts;

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg || theme.bg || "#070912", color: theme.text || "#fff", padding: 12 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 60, margin: "-12px -12px 12px", background: theme.pageBg || theme.bg || "#070912", paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ position: "relative", height: 92, overflow: "hidden", boxShadow: "0 12px 30px rgba(0,0,0,.42)" }}>
          <img src={tickerGros6 as any} alt="Gros 6" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
            <div style={{ pointerEvents: "auto" }}><BackDot onClick={() => go?.("gros_6_config")} size={42} color={theme.primary} glow={`${theme.primary}AA`} /></div>
            <div style={{ pointerEvents: "auto" }}><InfoDot onClick={() => setRulesOpen(true)} title="Règles du Gros 6" size={42} color={theme.primary} glow={`${theme.primary}AA`} /></div>
          </div>
        </div>
      </header>

      <div style={{ width: "100%", maxWidth: 1260, margin: "0 auto", display: "grid", gridTemplateColumns: narrowLayout ? "minmax(0,1fr)" : "minmax(0,1.2fr) minmax(280px,.8fr)", gap: 14, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          {game.participantMode === "teams" ? (
            <Panel title="Équipes" theme={theme}>
              <div style={{ display: "flex", gap: 9, overflowX: "auto", paddingBottom: 2 }}>{game.teams.map((team: any) => <TeamBadge key={team.id} team={team} game={game} theme={theme} />)}</div>
            </Panel>
          ) : null}

          <Panel title="Joueurs" theme={theme}>
            <div style={{ display: "flex", gap: 9, overflowX: "auto", paddingBottom: 2 }}>
              {game.players.map((player: any, index: number) => {
                const active = index === game.turnIndex && game.phase !== "finished";
                const alive = gros6IsPlayerActive(game, player);
                const team = game.participantMode === "teams" ? game.teams.find((t: any) => String(t.id) === String(player.teamId)) : null;
                const lifeText = game.participantMode === "teams" && game.teamLifeMode === "shared" ? `Équipe ❤️ ${team?.lives ?? 0}` : `❤️ ${player.lives}`;
                return (
                  <div key={player.id} style={{ minWidth: 138, borderRadius: 16, padding: 10, border: `1px solid ${active ? theme.primary : "rgba(255,255,255,.08)"}`, background: !alive ? "rgba(100,10,28,.24)" : active ? `${theme.primary}16` : "rgba(255,255,255,.035)", boxShadow: active ? `0 0 20px ${theme.primary}44` : "none", opacity: alive ? 1 : .58 }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 7 }}><ProfileAvatar name={player.name} avatarDataUrl={player.avatarDataUrl} size={58} /></div>
                    <div style={{ textAlign: "center", fontWeight: 950, fontSize: 12 }}>{player.name}</div>
                    {team ? <div style={{ textAlign: "center", fontSize: 9.5, color: theme.primary, fontWeight: 900, marginTop: 2 }}>{team.name}</div> : null}
                    <div style={{ textAlign: "center", fontSize: 10.5, color: "#aeb4cc", marginTop: 3 }}>{lifeText}</div>
                    <div style={{ textAlign: "center", fontSize: 9.5, color: active ? theme.primary : "#737992", marginTop: 2 }}>{!alive ? "Éliminé" : active ? "À jouer" : "En attente"}</div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title={game.phase === "select" ? "Définition de la prochaine cible" : "Cible courante"} theme={theme} accent>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#9ca2bd" }}>Tour #{game.turnNo} • {activePlayer?.name || "—"}{activeTeam ? ` • ${activeTeam.name}` : ""}</div>
                <div style={{ fontSize: "clamp(42px,8vw,78px)", lineHeight: 1, fontWeight: 1000, letterSpacing: 1, color: theme.primary, textShadow: `0 0 28px ${theme.primary}55`, marginTop: 7 }}>{gros6TargetLabel(game.currentTarget)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: .8, fontWeight: 900, color: "#8d93ad" }}>{game.phase === "select" ? "Nouvelle cible provisoire" : "Fléchettes restantes"}</div>
                <div style={{ fontSize: 24, fontWeight: 1000, marginTop: 3 }}>{game.phase === "select" ? gros6TargetLabel(game.pendingNextTarget) : Math.max(0, 3 - game.attackDarts.length)}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, borderRadius: 13, background: "rgba(255,255,255,.035)", padding: 10, fontSize: 12, lineHeight: 1.45, color: "#e3e5ef" }}>{game.message}</div>
          </Panel>

          <Panel title={game.phase === "select" ? `Fléchettes de sélection (${game.selectionAllowed})` : "Volée en cours"} theme={theme}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", minHeight: 30 }}>
              {currentDarts.map((dart: any, index: number) => <TargetToken key={`${gros6TargetLabel(dart)}-${index}`} hit={dart} />)}
              {!currentDarts.length ? <span style={{ color: "#727991", fontSize: 11 }}>Aucune fléchette enregistrée.</span> : null}
            </div>
          </Panel>

          {game.phase !== "finished" && !activePlayer?.isBot ? (
            <Panel title={game.phase === "select" ? "Choisir la prochaine zone" : `Saisie — ${activePlayer?.name || "Joueur"}`} theme={theme}>
              <InputPad theme={theme} config={config} phase={game.phase} onHit={submitHit} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 13 }}>
                <PillButton theme={theme} onClick={undo} disabled={!undoStackRef.current.length}>↶ ANNULER</PillButton>
                {game.phase === "select" ? <PillButton theme={theme} active onClick={finishSelectionNow}>VALIDER LA CIBLE</PillButton> : null}
              </div>
            </Panel>
          ) : null}

          {game.phase !== "finished" && activePlayer?.isBot ? (
            <Panel title="Tour du BOT" theme={theme}><div style={{ fontSize: 14, fontWeight: 950 }}>{activePlayer.name} joue automatiquement…</div><div style={{ color: "#8f95ad", fontSize: 11, marginTop: 5 }}>Le BOT adapte sa précision à son niveau et choisit une cible conforme à la variante active.</div></Panel>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <Panel title="État de la partie" theme={theme}>
            <div style={{ display: "grid", gap: 8, fontSize: 11, color: "#d7d9e8", lineHeight: 1.45 }}>
              <div><b>Mode :</b> {game.participantMode === "teams" ? "Équipes" : "Individuel"}</div>
              {game.participantMode === "teams" ? <div><b>Équipes en vie :</b> {aliveTeams.length}</div> : <div><b>Joueurs en vie :</b> {alivePlayers.length}</div>}
              <div><b>Validation :</b> {config?.targetRule === "value" ? "même valeur" : "S/D/T stricts"}</div>
              <div><b>Bull :</b> {config?.allowBull ? "ON" : "OFF"}</div>
              <div><b>Zones fermées :</b> {config?.allowSpecialZones ? "ON" : "OFF"}</div>
              <div><b>Bonus D3 :</b> {config?.thirdDartBonusSelection ? `${config?.thirdDartBonusCount || 3} fléchette(s)` : "OFF"}</div>
            </div>
          </Panel>

          <Panel title="Statistiques live" theme={theme}>
            <div style={{ display: "grid", gap: 9 }}>
              {game.players.map((player: any) => (
                <div key={player.id} style={{ borderRadius: 13, background: "rgba(255,255,255,.035)", padding: 9 }}>
                  <div style={{ fontSize: 11, fontWeight: 950 }}>{player.name}</div>
                  <div style={{ fontSize: 10, color: "#959bb4", lineHeight: 1.45, marginTop: 3 }}>Cibles : {player.stats.targetsCleared} • Imposées : {player.stats.targetsImposed}<br />Vies perdues : {player.stats.livesLost} • Sauvetages D3 : {player.stats.lastDartSaves}<br />Zones spéciales : {player.stats.specialTargetsCleared} • D/T : {player.stats.doublesCleared}/{player.stats.triplesCleared}</div>
                </div>
              ))}
            </div>
          </Panel>

          {game.phase === "finished" ? (
            <Panel title="Victoire" theme={theme} accent>
              <div style={{ fontSize: 28, fontWeight: 1000, color: theme.primary }}>{game.winnerName}</div>
              <div style={{ fontSize: 11, color: "#aeb4cc", lineHeight: 1.45, marginTop: 6 }}>{game.winnerType === "team" ? "Dernière équipe encore en jeu." : "Dernier joueur encore en vie."}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><PillButton theme={theme} active onClick={() => go?.("gros_6_config")}>REJOUER</PillButton><PillButton theme={theme} onClick={() => go?.("games")}>JEUX</PillButton></div>
            </Panel>
          ) : null}
        </div>
      </div>

      {rulesOpen ? (
        <div onClick={() => setRulesOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 18 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(720px,96vw)", maxHeight: "86vh", overflowY: "auto", borderRadius: 20, border: `1px solid ${theme.primary}66`, background: "linear-gradient(180deg,rgba(13,16,31,.99),rgba(5,7,16,.99))", padding: 18 }}>
            <div style={{ color: theme.primary, fontWeight: 1000, fontSize: 20, marginBottom: 10 }}>GROS 6 — RAPPEL</div>
            <div style={{ color: "#e2e4ef", fontSize: 13, lineHeight: 1.6 }}>Touchez la cible courante avec vos 3 fléchettes. Un échec fait perdre une vie. Une réussite permet d'utiliser les fléchettes restantes pour imposer la prochaine cible. Les zones fermées/extérieures activées dans la configuration sont de vraies cibles distinctes. Si la cible est validée sur la 3e fléchette, le bonus configuré ouvre une nouvelle volée de sélection.</div>
            <button type="button" onClick={() => setRulesOpen(false)} style={{ marginTop: 16, borderRadius: 999, border: `1px solid ${theme.primary}`, background: `${theme.primary}20`, color: "#fff", padding: "8px 13px", fontWeight: 950, cursor: "pointer" }}>FERMER</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
