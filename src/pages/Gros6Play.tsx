// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import { parseBotLevelValue } from "../lib/bots";
import tickerGros6 from "../assets/tickers/ticker_gros_6.png";

const NUMBER_ORDER = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const SPECIAL_ZONES = [
  { code: "outer_numbers_ring", label: "Extérieur cercle chiffres" },
  ...Array.from({ length: 20 }, (_, i) => ({ code: `digit_${i + 1}`, label: `Rond du ${i + 1}` })),
];

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function makeSegment(ring, value) {
  return { kind: "segment", ring, value, label: `${ring}${value}` };
}
function makeBull(doubleBull = false) {
  return { kind: "bull", bull: doubleBull ? "DB" : "SB", label: doubleBull ? "DBULL" : "BULL" };
}
function makeSpecial(code, label) {
  return { kind: "special", code, label };
}
function makeMiss() {
  return { kind: "miss", label: "MISS" };
}
function targetLabel(target) {
  if (!target) return "—";
  return target.label || "—";
}
function normalizeTarget(target) {
  if (!target) return makeSegment("S", 6);
  if (target.kind === "segment") return makeSegment(target.ring || "S", Number(target.value || 6));
  if (target.kind === "bull") return makeBull(target.bull === "DB");
  if (target.kind === "special") return makeSpecial(String(target.code), String(target.label || target.code));
  return makeSegment("S", 6);
}
function hitToTarget(hit) {
  if (!hit || hit.kind === "miss") return null;
  if (hit.kind === "segment") return makeSegment(hit.ring, Number(hit.value));
  if (hit.kind === "bull") return makeBull(hit.bull === "DB");
  if (hit.kind === "special") return makeSpecial(hit.code, hit.label);
  return null;
}
function matchesTarget(hit, target, config) {
  if (!hit || hit.kind === "miss" || !target) return false;
  if (target.kind === "special") return hit.kind === "special" && String(hit.code) === String(target.code);
  if (target.kind === "bull") return hit.kind === "bull" && String(hit.bull) === String(target.bull);
  if (target.kind === "segment") {
    if (hit.kind !== "segment") return false;
    if (String(config?.targetRule || "strict") === "value") return Number(hit.value) === Number(target.value);
    return String(hit.ring) === String(target.ring) && Number(hit.value) === Number(target.value);
  }
  return false;
}
function playerSkill(player) {
  return Math.max(1, Math.min(5, parseBotLevelValue(player?.botLevel, 3)));
}
function randomSegment() {
  const value = NUMBER_ORDER[Math.floor(Math.random() * NUMBER_ORDER.length)] || 20;
  const ring = ["S", "D", "T"][Math.floor(Math.random() * 3)] || "S";
  return makeSegment(ring, value);
}
function randomMissHit(config) {
  const r = Math.random();
  if (config?.allowBull && r < 0.05) return Math.random() < 0.2 ? makeBull(true) : makeBull(false);
  if (config?.allowSpecialZones && r < 0.14) {
    const z = SPECIAL_ZONES[Math.floor(Math.random() * SPECIAL_ZONES.length)];
    return makeSpecial(z.code, z.label);
  }
  return randomSegment();
}
function targetDifficulty(target) {
  if (!target) return 0.5;
  if (target.kind === "special") return 0.8;
  if (target.kind === "bull") return target.bull === "DB" ? 0.88 : 0.72;
  if (target.kind === "segment") {
    const n = Number(target.value || 0);
    const base = target.ring === "T" ? 0.82 : target.ring === "D" ? 0.7 : 0.38;
    const hi = [20, 19, 18, 17, 16, 15].includes(n) ? 0.06 : 0;
    return Math.min(0.92, base + hi);
  }
  return 0.5;
}
function exactTargetHit(target) {
  if (!target) return makeMiss();
  return clone(target);
}
function chooseBotTarget(skill, config) {
  const options = [];
  options.push(makeSegment("T", 20), makeSegment("T", 19), makeSegment("D", 20), makeSegment("D", 18), makeSegment("D", 16), makeSegment("T", 18));
  if (config?.allowBull) options.push(makeBull(true), makeBull(false));
  if (config?.allowSpecialZones) {
    [20, 19, 18, 10, 9, 8, 6].forEach((n) => options.push(makeSpecial(`digit_${n}`, `Rond du ${n}`)));
    options.push(makeSpecial("outer_numbers_ring", "Extérieur cercle chiffres"));
  }
  if (skill <= 2) {
    options.push(makeSegment("S", 20), makeSegment("S", 19), makeSegment("S", 18), makeSegment("S", 6));
  }
  const pool = skill >= 5 ? options : skill >= 4 ? options.slice(0, Math.min(options.length, 11)) : options.slice(Math.max(0, options.length - 8));
  return clone(pool[Math.floor(Math.random() * pool.length)] || makeSegment("S", 20));
}

function makePlayerState(player, startingLives) {
  return {
    ...player,
    lives: Number(startingLives || 5),
    eliminated: false,
    stats: {
      dartsThrown: 0,
      targetsCleared: 0,
      targetsImposed: 0,
      livesLost: 0,
      lastDartSaves: 0,
      specialTargetsCleared: 0,
    },
  };
}
function nextAliveIndex(players, fromIndex) {
  if (!Array.isArray(players) || !players.length) return 0;
  for (let step = 1; step <= players.length; step += 1) {
    const i = (fromIndex + step) % players.length;
    if (!players[i]?.eliminated && Number(players[i]?.lives || 0) > 0) return i;
  }
  return fromIndex;
}
function findWinner(players) {
  const alive = (Array.isArray(players) ? players : []).filter((p) => !p.eliminated && Number(p.lives || 0) > 0);
  return alive.length === 1 ? alive[0] : null;
}
function buildInitialState(config) {
  return {
    players: (config?.players || []).map((p) => makePlayerState(p, config?.startingLives || 5)),
    turnIndex: 0,
    turnNo: 1,
    phase: "attack",
    currentTarget: normalizeTarget(config?.startingTarget),
    attackDarts: [],
    selectionDarts: [],
    selectionAllowed: 0,
    pendingNextTarget: null,
    message: "Touchez la cible courante.",
    winnerId: null,
    winnerName: null,
    history: [],
  };
}
function baseHistoryEntry(player, target, phase, darts) {
  return {
    at: Date.now(),
    playerId: player?.id,
    playerName: player?.name,
    phase,
    target: targetLabel(target),
    darts: (darts || []).map((d) => targetLabel(d)),
  };
}
function finalizeAdvance(next) {
  next.turnIndex = nextAliveIndex(next.players, next.turnIndex);
  next.turnNo += 1;
  next.phase = "attack";
  next.attackDarts = [];
  next.selectionDarts = [];
  next.selectionAllowed = 0;
  next.pendingNextTarget = null;
  next.message = "Touchez la cible courante.";
  return next;
}
function finalizeSelection(state) {
  const next = clone(state);
  const player = next.players[next.turnIndex];
  const chosen = next.pendingNextTarget ? normalizeTarget(next.pendingNextTarget) : next.currentTarget;
  next.currentTarget = chosen;
  if (next.pendingNextTarget) player.stats.targetsImposed += 1;
  next.history.push({
    ...baseHistoryEntry(player, chosen, "select", next.selectionDarts),
    nextTarget: targetLabel(chosen),
  });
  return finalizeAdvance(next);
}
function finishState(next) {
  const winner = findWinner(next.players);
  if (!winner) return next;
  next.phase = "finished";
  next.winnerId = winner.id;
  next.winnerName = winner.name;
  next.message = `${winner.name} remporte la partie !`;
  return next;
}
function applyAttackHit(state, hit, config) {
  const next = clone(state);
  if (next.phase !== "attack" || next.winnerId) return next;
  const player = next.players[next.turnIndex];
  if (!player || player.eliminated) return next;

  const normalized = hit?.kind ? clone(hit) : makeMiss();
  next.attackDarts.push(normalized);
  player.stats.dartsThrown += 1;
  const idx = next.attackDarts.length - 1;
  const success = matchesTarget(normalized, next.currentTarget, config);

  if (success) {
    player.stats.targetsCleared += 1;
    if (next.currentTarget?.kind === "special") player.stats.specialTargetsCleared += 1;
    const remaining = Math.max(0, 2 - idx);
    const selectionAllowed = remaining > 0 ? remaining : (config?.thirdDartBonusSelection ? Number(config?.thirdDartBonusCount || 3) : 0);
    if (idx === 2) player.stats.lastDartSaves += 1;
    next.history.push({
      ...baseHistoryEntry(player, next.currentTarget, "attack", next.attackDarts),
      success: true,
      selectionAllowed,
    });
    if (selectionAllowed > 0) {
      next.phase = "select";
      next.selectionAllowed = selectionAllowed;
      next.selectionDarts = [];
      next.pendingNextTarget = null;
      next.message = idx === 2 && config?.thirdDartBonusSelection
        ? `Cible validée sur la 3e fléchette : ${selectionAllowed} fléchettes bonus pour définir la prochaine zone.`
        : `Cible validée : ${selectionAllowed} fléchette${selectionAllowed > 1 ? "s" : ""} pour définir la prochaine zone.`;
      return next;
    }
    next.message = "Cible validée. La cible reste inchangée.";
    return finalizeAdvance(next);
  }

  if (next.attackDarts.length >= 3) {
    player.lives = Math.max(0, Number(player.lives || 0) - 1);
    player.stats.livesLost += 1;
    if (player.lives <= 0) player.eliminated = true;
    next.history.push({
      ...baseHistoryEntry(player, next.currentTarget, "attack", next.attackDarts),
      success: false,
      lifeLost: true,
      livesAfter: player.lives,
    });
    const winner = findWinner(next.players);
    if (winner) return finishState(next);
    next.message = player.eliminated
      ? `${player.name} est éliminé.`
      : `${player.name} perd une vie. La cible reste ${targetLabel(next.currentTarget)}.`;
    return finalizeAdvance(next);
  }

  next.message = `Encore ${3 - next.attackDarts.length} fléchette${3 - next.attackDarts.length > 1 ? "s" : ""}.`;
  return next;
}
function applySelectionHit(state, hit) {
  const next = clone(state);
  if (next.phase !== "select" || next.winnerId) return next;
  const normalized = hit?.kind ? clone(hit) : makeMiss();
  next.selectionDarts.push(normalized);
  const target = hitToTarget(normalized);
  if (target) next.pendingNextTarget = target;
  if (next.selectionDarts.length >= Number(next.selectionAllowed || 0)) {
    return finalizeSelection(next);
  }
  next.message = next.pendingNextTarget
    ? `Cible provisoire : ${targetLabel(next.pendingNextTarget)}.`
    : `Choisissez la prochaine zone (${Math.max(0, Number(next.selectionAllowed || 0) - next.selectionDarts.length)} fléchette(s) restante(s)).`;
  return next;
}
function undoState(state) {
  const next = clone(state);
  if (next.phase === "attack" && next.attackDarts.length) {
    next.attackDarts.pop();
    const player = next.players[next.turnIndex];
    if (player) player.stats.dartsThrown = Math.max(0, Number(player.stats?.dartsThrown || 0) - 1);
    next.message = "Dernière fléchette retirée.";
    return next;
  }
  if (next.phase === "select" && next.selectionDarts.length) {
    next.selectionDarts.pop();
    const lastValid = [...next.selectionDarts].reverse().map((d) => hitToTarget(d)).find(Boolean) || null;
    next.pendingNextTarget = lastValid;
    next.message = "Dernière fléchette de sélection retirée.";
    return next;
  }
  return next;
}
function simulateBotAttack(state, config) {
  const player = state.players[state.turnIndex];
  const skill = playerSkill(player);
  const difficulty = targetDifficulty(state.currentTarget);
  const successBase = Math.max(0.12, Math.min(0.95, 0.25 + skill * 0.13 - difficulty * 0.24));
  const darts = [];
  let successIndex = -1;
  for (let i = 0; i < 3; i += 1) {
    const chance = Math.max(0.07, Math.min(0.97, successBase + i * 0.07));
    if (Math.random() < chance) {
      darts.push(exactTargetHit(state.currentTarget));
      successIndex = i;
      break;
    }
    darts.push(randomMissHit(config));
  }
  while (successIndex < 0 && darts.length < 3) darts.push(randomMissHit(config));
  return { darts, successIndex };
}
function simulateBotSelection(allowed, player, config) {
  const skill = playerSkill(player);
  const chosen = chooseBotTarget(skill, config);
  const darts = [];
  if (allowed <= 1) return { darts: [chosen], chosen };
  const missFirst = skill <= 2 && Math.random() < 0.35;
  if (missFirst) darts.push(makeMiss());
  darts.push(chosen);
  while (darts.length < allowed) darts.push(makeMiss());
  return { darts, chosen };
}

function pillButton(theme, active = false) {
  return {
    border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
    background: active ? `${theme.primary}22` : "rgba(255,255,255,.05)",
    color: "#fff",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: active ? `0 0 18px ${theme.primary}55` : "none",
  };
}

function TargetCard({ title, children }) {
  return (
    <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(9,11,20,.92)", padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.82, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function HitPill({ hit }) {
  return (
    <div style={{ borderRadius: 999, padding: "6px 10px", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.08)", fontWeight: 800, fontSize: 13 }}>
      {targetLabel(hit)}
    </div>
  );
}

function InputPad({ theme, config, onHit }) {
  const [ring, setRing] = React.useState("S");
  const [showSpecial, setShowSpecial] = React.useState(!!config?.allowSpecialZones);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[
          { id: "S", label: "Simple" },
          { id: "D", label: "Double" },
          { id: "T", label: "Triple" },
        ].map((r) => (
          <button key={r.id} type="button" onClick={() => setRing(r.id)} style={pillButton(theme, ring === r.id)}>{r.label}</button>
        ))}
        <button type="button" onClick={() => onHit(makeBull(false))} style={pillButton(theme, false)}>BULL</button>
        <button type="button" onClick={() => onHit(makeBull(true))} style={pillButton(theme, false)}>DBULL</button>
        <button type="button" onClick={() => onHit(makeMiss())} style={pillButton(theme, false)}>MISS</button>
        {!!config?.allowSpecialZones && (
          <button type="button" onClick={() => setShowSpecial((v) => !v)} style={pillButton(theme, showSpecial)}>
            {showSpecial ? "Masquer zones spéciales" : "Afficher zones spéciales"}
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 8 }}>
        {NUMBER_ORDER.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onHit(makeSegment(ring, n))}
            style={{
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              minHeight: 46,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {ring}{n}
          </button>
        ))}
      </div>

      {showSpecial && !!config?.allowSpecialZones && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.82 }}>Zones extérieures / fermées</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 240, overflow: "auto", paddingRight: 4 }}>
            {SPECIAL_ZONES.map((z) => (
              <button key={z.code} type="button" onClick={() => onHit(makeSpecial(z.code, z.label))} style={pillButton(theme, false)}>
                {z.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Gros6Play({ store, go, config, onFinish }) {
  const { theme } = useTheme();
  const [game, setGame] = React.useState(() => buildInitialState(config));
  const reportedRef = React.useRef(false);

  const activePlayer = game.players[game.turnIndex];
  const alivePlayers = game.players.filter((p) => !p.eliminated && Number(p.lives || 0) > 0);

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
      config,
      players: game.players,
      history: game.history,
    };
    try { onFinish?.(payload); } catch {}
  }, [game.winnerId, game.winnerName, game.players, game.history, config, onFinish]);

  React.useEffect(() => {
    if (game.phase !== "attack" || game.winnerId) return;
    const player = game.players[game.turnIndex];
    if (!player?.isBot) return;
    const timer = setTimeout(() => {
      setGame((prev) => {
        const attack = simulateBotAttack(prev, config);
        let next = clone(prev);
        attack.darts.forEach((d) => {
          if (next.phase === "attack") next = applyAttackHit(next, d, config);
        });
        if (next.phase === "select") {
          const playerNow = next.players[next.turnIndex];
          const sel = simulateBotSelection(next.selectionAllowed, playerNow, config);
          sel.darts.forEach((d) => {
            if (next.phase === "select") next = applySelectionHit(next, d);
          });
        }
        return next;
      });
    }, 750);
    return () => clearTimeout(timer);
  }, [game.phase, game.turnIndex, game.winnerId, game.players, config]);

  const submitHit = React.useCallback((hit) => {
    setGame((prev) => prev.phase === "select" ? applySelectionHit(prev, hit) : applyAttackHit(prev, hit, config));
  }, [config]);
  const undo = React.useCallback(() => setGame((prev) => undoState(prev)), []);
  const finalizeChoice = React.useCallback(() => setGame((prev) => prev.phase === "select" ? finalizeSelection(prev) : prev), []);

  const phaseLabel = game.phase === "finished" ? "Partie terminée" : game.phase === "select" ? "Définition de la prochaine zone" : "Attaque";

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg || theme.bg, color: theme.text, padding: 14 }}>
      <header
        style={{
          position: "relative",
          height: "clamp(78px,11vh,104px)",
          overflow: "hidden",
          margin: "-14px -14px 14px",
          borderBottom: `1px solid ${theme.primary}38`,
          boxShadow: "0 12px 30px rgba(0,0,0,.42)",
        }}
      >
        <img
          src={tickerGros6 as any}
          alt="Gros 6"
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <BackDot onClick={() => go?.("gros_6_config")} size={42} color={theme.primary} glow={`${theme.primary}AA`} />
          </div>
          <div style={{ pointerEvents: "none", alignSelf: "flex-end", paddingBottom: 7, fontSize: 11, fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,.95)" }}>{phaseLabel}</div>
        </div>
      </header>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1.2fr .8fr", alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <TargetCard title="Joueurs">
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
              {game.players.map((p, idx) => {
                const active = idx === game.turnIndex && game.phase !== "finished";
                return (
                  <div
                    key={p.id}
                    style={{
                      minWidth: 132,
                      borderRadius: 16,
                      padding: 10,
                      border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                      background: p.eliminated ? "rgba(90,0,20,.34)" : active ? `${theme.primary}18` : "rgba(255,255,255,.04)",
                      boxShadow: active ? `0 0 20px ${theme.primary}44` : "none",
                      opacity: p.eliminated ? 0.65 : 1,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                      <ProfileAvatar name={p.name} avatarDataUrl={p.avatarDataUrl} size={58} />
                    </div>
                    <div style={{ textAlign: "center", fontWeight: 900, fontSize: 14 }}>{p.name}</div>
                    <div style={{ textAlign: "center", fontSize: 12, opacity: 0.82 }}>❤️ {p.lives} vie{p.lives > 1 ? "s" : ""}</div>
                    <div style={{ textAlign: "center", fontSize: 11, opacity: 0.72 }}>{p.eliminated ? "Éliminé" : active ? "À jouer" : "En attente"}</div>
                  </div>
                );
              })}
            </div>
          </TargetCard>

          <TargetCard title="Cible courante">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 14, opacity: 0.84 }}>Tour #{game.turnNo}</div>
              <div style={{ fontSize: 42, fontWeight: 1000, letterSpacing: 1, color: theme.primary }}>{targetLabel(game.currentTarget)}</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>
                {game.phase === "select"
                  ? `Le joueur choisit la prochaine zone avec ${game.selectionAllowed} fléchette${game.selectionAllowed > 1 ? "s" : ""}.`
                  : `Le joueur actif doit toucher exactement cette cible${config?.targetRule === "value" ? " (ou la même valeur en S/D/T)" : ""}.`}
              </div>
            </div>
          </TargetCard>

          <TargetCard title={game.phase === "select" ? "Fléchettes de sélection" : "Fléchettes d'attaque"}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {(game.phase === "select" ? game.selectionDarts : game.attackDarts).map((d, idx) => <HitPill key={`${targetLabel(d)}-${idx}`} hit={d} />)}
              {!((game.phase === "select" ? game.selectionDarts : game.attackDarts).length) && (
                <div style={{ opacity: 0.72, fontSize: 13 }}>Aucune fléchette enregistrée.</div>
              )}
            </div>
            {game.phase === "select" && (
              <div style={{ fontSize: 14, fontWeight: 800, color: theme.primary }}>
                Prochaine cible provisoire : {targetLabel(game.pendingNextTarget) || "—"}
              </div>
            )}
          </TargetCard>

          {game.phase !== "finished" && !activePlayer?.isBot && (
            <TargetCard title={game.phase === "select" ? "Choisissez la prochaine zone" : `Saisie des fléchettes de ${activePlayer?.name || "joueur"}`}>
              <InputPad theme={theme} config={config} onHit={submitHit} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button type="button" onClick={undo} style={pillButton(theme, false)}>Annuler la dernière fléchette</button>
                {game.phase === "select" && (
                  <button type="button" onClick={finalizeChoice} style={pillButton(theme, true)}>
                    Valider la nouvelle cible
                  </button>
                )}
              </div>
            </TargetCard>
          )}

          {game.phase !== "finished" && activePlayer?.isBot && (
            <TargetCard title="Tour du bot">
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>{activePlayer.name} réfléchit…</div>
              <div style={{ fontSize: 13, opacity: 0.82 }}>Le bot joue automatiquement selon son niveau et choisira la prochaine cible si nécessaire.</div>
            </TargetCard>
          )}
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <TargetCard title="État du tour">
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>{activePlayer?.name || game.winnerName || "—"}</div>
            <div style={{ fontSize: 14, lineHeight: 1.55 }}>{game.message}</div>
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.84 }}>
              Joueurs encore en vie : <b>{alivePlayers.length}</b>
            </div>
          </TargetCard>

          <TargetCard title="Récap rapide">
            <div style={{ display: "grid", gap: 10 }}>
              {game.players.map((p) => (
                <div key={p.id} style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.04)" }}>
                  <div style={{ fontWeight: 900 }}>{p.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.84, lineHeight: 1.5 }}>
                    Vies perdues : {p.stats.livesLost} • Cibles validées : {p.stats.targetsCleared} • Cibles imposées : {p.stats.targetsImposed}<br />
                    Sauvetages 3e fléchette : {p.stats.lastDartSaves} • Zones spéciales validées : {p.stats.specialTargetsCleared}
                  </div>
                </div>
              ))}
            </div>
          </TargetCard>

          <TargetCard title="Rappels des variantes actives">
            <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.92 }}>
              • Validation : <b>{config?.targetRule === "value" ? "même valeur" : "segment exact S / D / T"}</b><br />
              • Bull : <b>{config?.allowBull ? "autorisé" : "désactivé"}</b><br />
              • Zones spéciales : <b>{config?.allowSpecialZones ? "activées" : "désactivées"}</b><br />
              • Bonus sur 3e fléchette : <b>{config?.thirdDartBonusSelection ? `${config?.thirdDartBonusCount || 3} fléchettes` : "désactivé"}</b>
            </div>
          </TargetCard>

          {game.phase === "finished" && (
            <TargetCard title="Victoire">
              <div style={{ fontSize: 28, fontWeight: 1000, color: theme.primary, marginBottom: 8 }}>{game.winnerName}</div>
              <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 12 }}>Dernier joueur encore en vie. La partie a été enregistrée dans l'historique du jeu.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => go?.("gros_6_config")} style={pillButton(theme, true)}>Rejouer</button>
                <button type="button" onClick={() => go?.("games")} style={pillButton(theme, false)}>Retour aux jeux</button>
              </div>
            </TargetCard>
          )}
        </div>
      </div>
    </div>
  );
}
