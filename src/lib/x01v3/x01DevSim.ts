// =============================================================
// src/lib/x01v3/x01DevSim.ts
// X01 Dev Simulators — uniquement en DEV + DevMode ON
//
// But : reproduire rapidement des bugs moteur (ex: BUST TEAMS)
// sans devoir simuler manuellement des parties.
//
// Usage (console) :
//   window.__x01Sim.help();
//   window.__x01Sim.bustTeams33();
//   window.__x01Sim.bustSolo33();
// =============================================================

import type {
  X01ConfigV3,
  X01DartInputV3,
  X01MatchStateV3,
  X01PlayerId,
  X01StatsLiveV3,
} from "../../types/x01v3";

export type X01DevSimDeps = {
  createInitialMatchState: (config: X01ConfigV3) => X01MatchStateV3;
  applyDartWithFlow: (
    config: X01ConfigV3,
    prevState: X01MatchStateV3,
    prevLiveStats: Record<X01PlayerId, X01StatsLiveV3>,
    input: X01DartInputV3
  ) => { state: X01MatchStateV3; liveStats: Record<X01PlayerId, X01StatsLiveV3> };
  createEmptyLiveStatsV3: () => X01StatsLiveV3;
};

export type X01DevSimApi = {
  help: () => void;
  bustTeams33: () => void;
  bustSolo33: () => void;
};

declare global {
  interface Window {
    __x01Sim?: X01DevSimApi;
  }
}

function logState(label: string, st: X01MatchStateV3) {
  const pid = st.activePlayer as X01PlayerId;
  // eslint-disable-next-line no-console
  console.log(
    `[X01Sim] ${label}`,
    "| active=",
    pid,
    "| score=",
    st.scores?.[pid],
    "| visit=",
    st.visit?.currentScore,
    "| dartsLeft=",
    st.visit?.dartsLeft,
    "| status=",
    st.status
  );
}

function dart(v: number, m = 1): X01DartInputV3 {
  return { segment: v, multiplier: m } as any;
}

export function setX01DevSimEnabled(enabled: boolean, deps?: X01DevSimDeps) {
  // Hard gate : jamais en prod
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;

  const w = window as Window;

  if (!enabled) {
    if (w.__x01Sim) delete w.__x01Sim;
    return;
  }

  if (w.__x01Sim) return; // déjà installé
  if (!deps) return; // pas de deps, on ne fait rien

  const buildLive = (cfg: X01ConfigV3) => {
    const live: Record<X01PlayerId, X01StatsLiveV3> = {} as any;
    for (const p of cfg.players) {
      live[p.id as X01PlayerId] = deps.createEmptyLiveStatsV3();
    }
    return live;
  };

  const run = (cfg: X01ConfigV3, dartsSeq: Array<{ v: number; m?: number }>) => {
    let st = deps.createInitialMatchState(cfg);
    let live = buildLive(cfg);
    logState("START", st);

    for (const d of dartsSeq) {
      const out = deps.applyDartWithFlow(cfg, st, live, dart(d.v, d.m ?? 1));
      st = out.state;
      live = out.liveStats;
      logState(`DART ${d.m ?? 1}x${d.v}`, st);
    }

    return { st, live };
  };

  const api: X01DevSimApi = {
    help() {
      // eslint-disable-next-line no-console
      console.log(
        [
          "X01 Dev Simulators:",
          "- window.__x01Sim.bustTeams33()  // 33: S18 puis S19 => BUST (Teams) → rollback + rotation",
          "- window.__x01Sim.bustSolo33()   // 33: S18 puis S19 => BUST (Solo)  → rollback (même joueur)",
        ].join("\n")
      );
    },

    bustTeams33() {
      // eslint-disable-next-line no-console
      console.log("[X01Sim] ▶ bustTeams33 — startScore=33, darts: S18, S19 (BUST)");

      const cfg: X01ConfigV3 = {
        startScore: 33,
        outMode: "single",
        legsPerSet: 1,
        setsToWin: 1,
        gameMode: "teams",
        players: [
          { id: "p1", name: "A1" } as any,
          { id: "p2", name: "B1" } as any,
        ],
        teams: [
          { id: "t1", name: "TEAM A", playerIds: ["p1"] } as any,
          { id: "t2", name: "TEAM B", playerIds: ["p2"] } as any,
        ],
      } as any;

      const start = deps.createInitialMatchState(cfg);
      const startPid = start.activePlayer as X01PlayerId;

      const { st } = run(cfg, [
        { v: 18, m: 1 },
        { v: 19, m: 1 },
      ]);

      const restored = st.scores?.[startPid] === 33;
      const rotated = st.activePlayer !== startPid;

      if (restored && rotated) {
        // eslint-disable-next-line no-console
        console.log("[X01Sim] ✅ BUST TEAMS OK (score restauré + rotation)");
      } else {
        // eslint-disable-next-line no-console
        console.error("[X01Sim] ❌ BUST TEAMS KO", {
          restored,
          rotated,
          startPid,
          active: st.activePlayer,
          scoreStart: st.scores?.[startPid],
        });
      }
    },

    bustSolo33() {
      // eslint-disable-next-line no-console
      console.log("[X01Sim] ▶ bustSolo33 — startScore=33, darts: S18, S19 (BUST)");

      const cfg: X01ConfigV3 = {
        startScore: 33,
        outMode: "single",
        legsPerSet: 1,
        setsToWin: 1,
        gameMode: "solo",
        players: [{ id: "p1", name: "Solo" } as any],
      } as any;

      const { st } = run(cfg, [
        { v: 18, m: 1 },
        { v: 19, m: 1 },
      ]);

      const restored = st.scores?.["p1" as any] === 33;
      const samePlayer = st.activePlayer === ("p1" as any);

      if (restored && samePlayer) {
        // eslint-disable-next-line no-console
        console.log("[X01Sim] ✅ BUST SOLO OK (score restauré)");
      } else {
        // eslint-disable-next-line no-console
        console.error("[X01Sim] ❌ BUST SOLO KO", {
          restored,
          samePlayer,
          active: st.activePlayer,
          score: st.scores?.["p1" as any],
        });
      }
    },
  };

  w.__x01Sim = api;
  api.help();
}
