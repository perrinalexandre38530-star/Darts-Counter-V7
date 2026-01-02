// @ts-nocheck
// =============================================================
// src/hooks/useKillerEngine.ts
// KILLER ENGINE — DC-V5
// - State pur, sérialisable (online-friendly plus tard)
// - Phase BUILD : on gagne des vies sur SON numéro jusqu'à maxLives
// - Phase KILL : un "Killer" peut enlever des vies aux autres
// - Elimination : lives = 0 => dead
// - Winner : dernier vivant
// - NEW : support BOTS (auto-play 3 fléchettes quand c'est leur tour)
// =============================================================

import * as React from "react";

// -----------------------------
// Types
// -----------------------------
export type Mult = 1 | 2 | 3;

export type KillerHit = {
  value: number; // 1..20 (on ignore bull ici; tu pourras l'ajouter ensuite)
  mult: Mult; // S/D/T => 1/2/3
};

export type KillerPlayerState = {
  pid: string; // player id (match)
  name: string;
  killerNumber: number; // 1..20
  lives: number; // 0..maxLives
  isDead: boolean;

  // ✅ NEW
  isBot?: boolean;
  botLevel?: string; // "Easy" / "Pro" / "Légende" / "3" etc.
};

export type KillerEngineParams = {
  maxLives: number; // ex: 3
  allowFriendlyFire: boolean; // si true : toucher son numéro quand killer peut aussi te faire perdre/gagner? (ici: ignoré, par défaut false)
  loseLivesOnOwnNumberWhenKiller: boolean; // si true : quand tu es killer et que tu touches ton propre numéro => tu PERDS des vies (variante)
  mustReachExactLives: boolean; // si true : doit atteindre exactement maxLives (sinon cap)

  // ✅ NEW (bots)
  botAutoPlay?: boolean; // default true
};

export type KillerPhase = "build" | "kill" | "ended";

export type KillerGameState = {
  players: KillerPlayerState[];
  currentIndex: number; // index joueur courant
  phase: KillerPhase;
  turn: number; // compteur de tours (1-based), utile stats plus tard
  winnerPid?: string;
  lastEvent?: KillerEvent; // pour UI (flash)

  // ✅ NEW
  lastDarts?: KillerHit[]; // dernière volée (pour UI)
  dartsLeft?: number; // 3..0 (pour UI)
};

export type KillerEvent =
  | { kind: "hit_own"; pid: string; gained: number; lives: number }
  | { kind: "became_killer"; pid: string }
  | {
      kind: "hit_other";
      attackerPid: string;
      targetPid: string;
      lost: number;
      targetLives: number;
    }
  | { kind: "killed"; attackerPid: string; targetPid: string }
  | { kind: "no_effect"; pid: string; reason: string }
  | { kind: "winner"; pid: string }
  | { kind: "bot_played"; pid: string }; // ✅ NEW (utile debug/anim)

type Action =
  | {
      type: "RESET";
      payload: {
        players: Array<{
          pid: string;
          name: string;
          killerNumber: number;
          isBot?: boolean;
          botLevel?: string;
        }>;
        params?: Partial<KillerEngineParams>;
      };
    }
  | { type: "SET_NUMBER"; payload: { pid: string; killerNumber: number } }
  | { type: "THROW"; payload: { hit: KillerHit } }
  | { type: "NEXT_PLAYER" }
  | { type: "SET_CURRENT"; payload: { pid: string } }
  | { type: "NUDGE_PHASE" } // recalc phase / winner (sécurité)
  | { type: "RESET_VOLLEY" }; // ✅ NEW (3 darts / UI)
  
// -----------------------------
// Defaults
// -----------------------------
export const defaultKillerParams: KillerEngineParams = {
  maxLives: 3,
  allowFriendlyFire: false,
  loseLivesOnOwnNumberWhenKiller: false,
  mustReachExactLives: false,
  botAutoPlay: true,
};

// -----------------------------
// Helpers
// -----------------------------
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function alivePlayers(players: KillerPlayerState[]) {
  return players.filter((p) => !p.isDead);
}

function isKiller(p: KillerPlayerState, params: KillerEngineParams) {
  return p.lives >= params.maxLives && !p.isDead;
}

function computePhase(state: KillerGameState, params: KillerEngineParams): KillerPhase {
  if (state.winnerPid) return "ended";
  const alive = alivePlayers(state.players);
  if (alive.length <= 1) return "ended";

  // Phase "kill" dès qu'il y a au moins 1 killer vivant
  const anyKiller = alive.some((p) => isKiller(p, params));
  return anyKiller ? "kill" : "build";
}

function computeWinnerPid(players: KillerPlayerState[]) {
  const alive = alivePlayers(players);
  if (alive.length === 1) return alive[0].pid;
  return undefined;
}

function findPlayerIndexByPid(players: KillerPlayerState[], pid: string) {
  return players.findIndex((p) => p.pid === pid);
}

function nextAliveIndex(players: KillerPlayerState[], fromIndex: number) {
  const n = players.length;
  if (n === 0) return 0;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!players[idx].isDead) return idx;
  }
  return fromIndex; // fallback
}

function normalizeNumber(num: number) {
  const n = Math.floor(num);
  return clamp(n, 1, 20);
}

function resolveBotLevel(botLevelRaw?: string | null): number {
  const v = (botLevelRaw || "").toLowerCase().trim();
  if (!v) return 1;

  const digits = v.replace(/[^0-9]/g, "");
  if (digits) {
    const n = parseInt(digits, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return n;
  }

  if (v.includes("legend") || v.includes("légende")) return 5;
  if (v.includes("pro")) return 4;
  if (v.includes("fort") || v.includes("hard") || v.includes("difficile")) return 3;
  if (v.includes("standard") || v.includes("normal") || v.includes("moyen")) return 2;
  if (v.includes("easy") || v.includes("facile") || v.includes("débutant")) return 1;
  return 1;
}

function pickBotMult(level: number): Mult {
  const pTriple = [0.02, 0.04, 0.06, 0.10, 0.14][level - 1] ?? 0.04;
  const pDouble = [0.06, 0.08, 0.10, 0.14, 0.18][level - 1] ?? 0.08;
  const x = Math.random();
  if (x < pTriple) return 3;
  if (x < pTriple + pDouble) return 2;
  return 1;
}

function botThrow(level: number, aim: number): KillerHit {
  // précision selon niveau
  const pHit = [0.22, 0.32, 0.42, 0.55, 0.68][level - 1] ?? 0.32;
  if (Math.random() < pHit) {
    return { value: aim, mult: pickBotMult(level) };
  }

  // miss => dérive +/- 1..3
  const drift = (Math.floor(Math.random() * 3) + 1) * (Math.random() < 0.5 ? -1 : 1);
  let seg = aim + drift;
  while (seg < 1) seg += 20;
  while (seg > 20) seg -= 20;
  const mult: Mult = Math.random() < 0.08 ? 2 : 1;
  return { value: seg, mult };
}

function chooseBotAim(state: KillerGameState, params: KillerEngineParams, bot: KillerPlayerState): number {
  // BUILD => vise son numéro
  if (!isKiller(bot, params)) return bot.killerNumber;

  // KILL => vise le joueur le plus faible en vies (pas mort, pas lui)
  const candidates = state.players.filter((p) => !p.isDead && p.pid !== bot.pid);
  candidates.sort((a, b) => a.lives - b.lives);
  return candidates[0]?.killerNumber ?? bot.killerNumber;
}

// -----------------------------
// Reducer core
// -----------------------------
function reduceWithParams(state: KillerGameState, params: KillerEngineParams, action: Action): KillerGameState {
  if (action.type === "RESET") {
    const merged: KillerEngineParams = { ...defaultKillerParams, ...(action.payload.params || {}) };

    const players: KillerPlayerState[] = action.payload.players.map((p) => ({
      pid: p.pid,
      name: p.name,
      killerNumber: normalizeNumber(p.killerNumber),
      lives: 0,
      isDead: false,

      // ✅ NEW
      isBot: !!p.isBot,
      botLevel: p.botLevel ?? "",
    }));

    const winnerPid = computeWinnerPid(players);

    const base: KillerGameState = {
      players,
      currentIndex: players.length ? 0 : 0,
      phase: "build",
      turn: 1,
      winnerPid,
      lastEvent: undefined,

      // ✅ NEW volley
      lastDarts: [],
      dartsLeft: 3,
    };

    const phase = computePhase(base, merged);
    const ended = phase === "ended";
    return {
      ...base,
      phase,
      winnerPid: ended ? winnerPid : undefined,
      lastEvent: winnerPid ? { kind: "winner", pid: winnerPid } : undefined,
    };
  }

  if (state.phase === "ended") {
    return state;
  }

  switch (action.type) {
    case "RESET_VOLLEY": {
      return { ...state, lastDarts: [], dartsLeft: 3, lastEvent: undefined };
    }

    case "SET_NUMBER": {
      const { pid, killerNumber } = action.payload;
      const idx = findPlayerIndexByPid(state.players, pid);
      if (idx < 0) return state;

      const nextPlayers = state.players.map((p) =>
        p.pid === pid ? { ...p, killerNumber: normalizeNumber(killerNumber) } : p
      );

      const winnerPid = computeWinnerPid(nextPlayers);
      const nextState: KillerGameState = {
        ...state,
        players: nextPlayers,
        winnerPid,
      };
      const phase = computePhase(nextState, params);
      if (phase === "ended" && winnerPid) {
        return { ...nextState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
      }
      return { ...nextState, phase, lastEvent: undefined };
    }

    case "SET_CURRENT": {
      const idx = findPlayerIndexByPid(state.players, action.payload.pid);
      if (idx < 0) return state;
      if (state.players[idx].isDead) return state;
      return { ...state, currentIndex: idx, lastEvent: undefined };
    }

    case "NEXT_PLAYER": {
      const nextIdx = nextAliveIndex(state.players, state.currentIndex);
      const turnBump = nextIdx <= state.currentIndex ? 1 : 0;
      const nextState = {
        ...state,
        currentIndex: nextIdx,
        turn: state.turn + turnBump,
        lastEvent: undefined,
        lastDarts: [],
        dartsLeft: 3,
      };
      const phase = computePhase(nextState, params);
      return { ...nextState, phase };
    }

    case "THROW": {
      const hit = action.payload.hit;

      const value = normalizeNumber(hit.value);
      const mult: Mult = hit.mult === 1 || hit.mult === 2 || hit.mult === 3 ? hit.mult : 1;

      const attacker = state.players[state.currentIndex];
      if (!attacker || attacker.isDead) return state;

      const attackerIsKiller = isKiller(attacker, params);

      // ✅ volley tracking
      const dartsLeft = clamp((state.dartsLeft ?? 3) - 1, 0, 3);
      const lastDarts = [...(state.lastDarts ?? []), { value, mult }];

      // 1) BUILD
      if (!attackerIsKiller) {
        if (value !== attacker.killerNumber) {
          const next: KillerGameState = {
            ...state,
            dartsLeft,
            lastDarts,
            lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "not_own_number" },
          };
          // auto-next si fin volée
          return dartsLeft === 0 ? reduceWithParams(next, params, { type: "NEXT_PLAYER" }) : next;
        }

        const gained = mult;
        let nextLives = attacker.lives + gained;

        if (params.mustReachExactLives && nextLives > params.maxLives) {
          const next: KillerGameState = {
            ...state,
            dartsLeft,
            lastDarts,
            lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "exceeds_max_exact" },
          };
          return dartsLeft === 0 ? reduceWithParams(next, params, { type: "NEXT_PLAYER" }) : next;
        }

        nextLives = clamp(nextLives, 0, params.maxLives);

        const nextPlayers = state.players.map((p) =>
          p.pid === attacker.pid ? { ...p, lives: nextLives } : p
        );

        const becameKiller = nextLives >= params.maxLives;
        const winnerPid = computeWinnerPid(nextPlayers);

        let tempState: KillerGameState = {
          ...state,
          players: nextPlayers,
          winnerPid,
          dartsLeft,
          lastDarts,
          lastEvent: { kind: "hit_own", pid: attacker.pid, gained, lives: nextLives },
        };

        let phase = computePhase(tempState, params);

        if (becameKiller) {
          tempState = { ...tempState, lastEvent: { kind: "became_killer", pid: attacker.pid } };
          phase = computePhase(tempState, params);
        }

        if (phase === "ended" && winnerPid) {
          return { ...tempState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
        }

        tempState = { ...tempState, phase };

        return dartsLeft === 0 ? reduceWithParams(tempState, params, { type: "NEXT_PLAYER" }) : tempState;
      }

      // 2) KILL
      if (value === attacker.killerNumber) {
        if (!params.allowFriendlyFire && !params.loseLivesOnOwnNumberWhenKiller) {
          const next: KillerGameState = {
            ...state,
            dartsLeft,
            lastDarts,
            lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "own_number_ignored" },
          };
          return dartsLeft === 0 ? reduceWithParams(next, params, { type: "NEXT_PLAYER" }) : next;
        }

        if (params.loseLivesOnOwnNumberWhenKiller) {
          const lost = mult;
          const nextLives = clamp(attacker.lives - lost, 0, params.maxLives);
          const died = nextLives <= 0;

          const nextPlayers = state.players.map((p) =>
            p.pid === attacker.pid ? { ...p, lives: nextLives, isDead: died } : p
          );

          const winnerPid = computeWinnerPid(nextPlayers);
          let nextState: KillerGameState = {
            ...state,
            players: nextPlayers,
            winnerPid,
            dartsLeft,
            lastDarts,
            lastEvent: died
              ? { kind: "killed", attackerPid: attacker.pid, targetPid: attacker.pid }
              : { kind: "hit_other", attackerPid: attacker.pid, targetPid: attacker.pid, lost, targetLives: nextLives },
          };

          const phase = computePhase(nextState, params);
          if (phase === "ended" && winnerPid) {
            nextState = { ...nextState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
            return nextState;
          }
          nextState = { ...nextState, phase };
          return dartsLeft === 0 ? reduceWithParams(nextState, params, { type: "NEXT_PLAYER" }) : nextState;
        }

        const next: KillerGameState = {
          ...state,
          dartsLeft,
          lastDarts,
          lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "own_number" },
        };
        return dartsLeft === 0 ? reduceWithParams(next, params, { type: "NEXT_PLAYER" }) : next;
      }

      const target = state.players.find((p) => !p.isDead && p.killerNumber === value);
      if (!target) {
        const next: KillerGameState = {
          ...state,
          dartsLeft,
          lastDarts,
          lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "no_target_for_number" },
        };
        return dartsLeft === 0 ? reduceWithParams(next, params, { type: "NEXT_PLAYER" }) : next;
      }

      if (!params.allowFriendlyFire && target.pid === attacker.pid) {
        const next: KillerGameState = {
          ...state,
          dartsLeft,
          lastDarts,
          lastEvent: { kind: "no_effect", pid: attacker.pid, reason: "friendly_fire_blocked" },
        };
        return dartsLeft === 0 ? reduceWithParams(next, params, { type: "NEXT_PLAYER" }) : next;
      }

      const lost = mult;
      const nextTargetLives = clamp(target.lives - lost, 0, params.maxLives);
      const killed = nextTargetLives <= 0;

      const nextPlayers = state.players.map((p) => {
        if (p.pid !== target.pid) return p;
        return { ...p, lives: nextTargetLives, isDead: killed ? true : p.isDead };
      });

      const winnerPid = computeWinnerPid(nextPlayers);

      let nextState: KillerGameState = {
        ...state,
        players: nextPlayers,
        winnerPid,
        dartsLeft,
        lastDarts,
        lastEvent: killed
          ? { kind: "killed", attackerPid: attacker.pid, targetPid: target.pid }
          : { kind: "hit_other", attackerPid: attacker.pid, targetPid: target.pid, lost, targetLives: nextTargetLives },
      };

      const phase = computePhase(nextState, params);

      if (phase === "ended" && winnerPid) {
        return { ...nextState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
      }

      nextState = { ...nextState, phase };
      return dartsLeft === 0 ? reduceWithParams(nextState, params, { type: "NEXT_PLAYER" }) : nextState;
    }

    case "NUDGE_PHASE": {
      const winnerPid = computeWinnerPid(state.players);
      const nextState = { ...state, winnerPid };
      const phase = computePhase(nextState, params);
      if (phase === "ended" && winnerPid) {
        return { ...nextState, phase, lastEvent: { kind: "winner", pid: winnerPid } };
      }
      return { ...nextState, phase };
    }

    default:
      return state;
  }
}

// -----------------------------
// Public hook API
// -----------------------------
export function useKillerEngine(options: {
  players: Array<{ pid: string; name: string; killerNumber: number; isBot?: boolean; botLevel?: string }>;
  params?: Partial<KillerEngineParams>;
}) {
  const paramsRef = React.useRef<KillerEngineParams>({
    ...defaultKillerParams,
    ...(options.params || {}),
  });

  React.useEffect(() => {
    paramsRef.current = { ...defaultKillerParams, ...(options.params || {}) };
  }, [options.params]);

  const [state, dispatch] = React.useReducer(
    (s: KillerGameState, a: Action) => reduceWithParams(s, paramsRef.current, a),
    undefined as any,
    () => {
      const merged = { ...defaultKillerParams, ...(options.params || {}) };
      const players = options.players || [];
      const initPlayers: KillerPlayerState[] = players.map((p) => ({
        pid: p.pid,
        name: p.name,
        killerNumber: normalizeNumber(p.killerNumber),
        lives: 0,
        isDead: false,
        isBot: !!p.isBot,
        botLevel: p.botLevel ?? "",
      }));

      const winnerPid = computeWinnerPid(initPlayers);
      const base: KillerGameState = {
        players: initPlayers,
        currentIndex: initPlayers.length ? 0 : 0,
        phase: "build",
        turn: 1,
        winnerPid,
        lastEvent: undefined,
        lastDarts: [],
        dartsLeft: 3,
      };

      const phase = computePhase(base, merged);
      return {
        ...base,
        phase,
        winnerPid: phase === "ended" ? winnerPid : undefined,
        lastEvent: winnerPid ? { kind: "winner", pid: winnerPid } : undefined,
      };
    }
  );

  // Reset si la liste des joueurs change (nouveau match)
  const playersKey = React.useMemo(() => {
    return (options.players || [])
      .map((p) => `${p.pid}:${p.killerNumber}:${p.name}:${p.isBot ? "B" : "H"}:${p.botLevel || ""}`)
      .join("|");
  }, [options.players]);

  React.useEffect(() => {
    dispatch({ type: "RESET", payload: { players: options.players || [], params: options.params } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersKey]);

  // ✅ NEW: helper auto-play bot (joue 3 fléchettes via dispatch THROW)
  const playBotTurn = React.useCallback(() => {
    const params = paramsRef.current;
    if (!params.botAutoPlay) return false;
    if (state.phase === "ended") return false;

    const cur = state.players[state.currentIndex];
    if (!cur || cur.isDead) return false;
    if (!cur.isBot) return false;

    const lvl = resolveBotLevel(cur.botLevel);
    const aim = chooseBotAim(state, params, cur);

    // 3 darts max (le reducer gère NEXT_PLAYER auto quand dartsLeft=0)
    for (let i = 0; i < 3; i++) {
      const hit = botThrow(lvl, aim);
      dispatch({ type: "THROW", payload: { hit } });
    }

    // petit event debug (optionnel)
    dispatch({ type: "NUDGE_PHASE" });

    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentIndex, state.players]);

  const api = React.useMemo(() => {
    return {
      state,
      params: paramsRef.current,

      reset: () => dispatch({ type: "RESET", payload: { players: options.players || [], params: options.params } }),

      setPlayerNumber: (pid: string, killerNumber: number) =>
        dispatch({ type: "SET_NUMBER", payload: { pid, killerNumber } }),

      setCurrentPlayer: (pid: string) => dispatch({ type: "SET_CURRENT", payload: { pid } }),

      throwDart: (hit: KillerHit) => dispatch({ type: "THROW", payload: { hit } }),

      nextPlayer: () => dispatch({ type: "NEXT_PLAYER" }),

      nudgePhase: () => dispatch({ type: "NUDGE_PHASE" }),

      resetVolley: () => dispatch({ type: "RESET_VOLLEY" }),

      // ✅ bots
      playBotTurn,

      // Helpers UI
      getCurrent: () => state.players[state.currentIndex],
      getAlive: () => alivePlayers(state.players),
      isPlayerKiller: (pid: string) => {
        const p = state.players.find((x) => x.pid === pid);
        return p ? isKiller(p, paramsRef.current) : false;
      },
    };
  }, [state, options.players, options.params, playBotTurn]);

  return api;
}
