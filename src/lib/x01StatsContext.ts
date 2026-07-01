// ============================================================
// src/lib/x01StatsContext.ts
// Contexte X01 unifié pour éviter de mélanger les stats 301/501/701/901
// et DUO / MULTI / TEAM dans Home, Profils et Centre de stats.
// ============================================================

export type X01StartScoreKey = 301 | 501 | 701 | 901;
export type X01VariantKey = "solo" | "duo" | "multi" | "team" | "training" | "unknown";
export type X01VictoryModeKey = "best_of" | "first_to";

export type X01StatsContext = {
  startScore: X01StartScoreKey | null;
  variant: X01VariantKey;
  victoryMode: X01VictoryModeKey;
  matchFormat?: {
    type: X01VictoryModeKey;
    target: number | null;
    unit: "sets" | "legs";
  } | null;
};

export type X01StatsContextFilter = {
  startScore?: X01StartScoreKey | "all" | null;
  variant?: X01VariantKey | "all" | null;
  victoryMode?: X01VictoryModeKey | "all" | null;
};

const START_SCORES: X01StartScoreKey[] = [301, 501, 701, 901];

function norm(v: any): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function walkObjects(root: any, maxDepth = 7): any[] {
  const out: any[] = [];
  const seen = new WeakSet<object>();
  const walk = (x: any, depth: number) => {
    if (!x || typeof x !== "object" || depth > maxDepth) return;
    if (seen.has(x)) return;
    seen.add(x);
    if (!Array.isArray(x)) out.push(x);
    if (Array.isArray(x)) {
      for (const it of x) walk(it, depth + 1);
      return;
    }
    for (const v of Object.values(x)) {
      if (v && typeof v === "object") walk(v, depth + 1);
    }
  };
  walk(root, 0);
  return out;
}

function firstValue(root: any, keys: string[]): any {
  const wanted = new Set(keys.map((k) => norm(k)));
  for (const obj of walkObjects(root, 7)) {
    for (const [k, v] of Object.entries(obj)) {
      if (!wanted.has(norm(k))) continue;
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }
  return undefined;
}

export function getX01StartScore(root: any): X01StartScoreKey | null {
  const raw = firstValue(root, [
    "x01StartScore",
    "startScore",
    "startscore",
    "startingScore",
    "starting_score",
    "distance",
    "start",
  ]);
  const n = Number(raw);
  return START_SCORES.includes(n as X01StartScoreKey) ? (n as X01StartScoreKey) : null;
}

function collectPlayers(root: any): any[] {
  const pools: any[] = [];
  for (const obj of walkObjects(root, 5)) {
    for (const key of ["players", "rankings", "perPlayer", "participants"]) {
      const arr = obj?.[key];
      if (Array.isArray(arr) && arr.length) pools.push(...arr);
    }
  }
  const seen = new Set<string>();
  return pools.filter((p: any, idx: number) => {
    if (!p || typeof p !== "object") return false;
    const id = String(p?.id ?? p?.profileId ?? p?.playerId ?? p?.pid ?? p?.uid ?? p?.name ?? idx);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function hasTeams(root: any): boolean {
  for (const obj of walkObjects(root, 5)) {
    if (Array.isArray(obj?.teams) && obj.teams.length >= 2) return true;
    const v = norm(obj?.gameMode ?? obj?.matchMode ?? obj?.mode ?? obj?.variant ?? obj?.x01Variant);
    if (v.includes("team")) return true;
  }
  return false;
}

export function getX01Variant(root: any): X01VariantKey {
  const explicit = norm(firstValue(root, ["x01Variant", "x01_variant", "variantKey", "matchVariant"]));
  if (explicit.includes("team")) return "team";
  if (explicit.includes("multi")) return "multi";
  if (explicit.includes("duo") || explicit.includes("double") || explicit.includes("1v1")) return "duo";
  if (explicit === "solo") return "solo";

  if (hasTeams(root)) return "team";

  const modeBlob = walkObjects(root, 5)
    .flatMap((obj) => [obj?.mode, obj?.gameMode, obj?.matchMode, obj?.variant, obj?.kind, obj?.game])
    .map(norm)
    .filter(Boolean)
    .join("|");

  if (modeBlob.includes("team")) return "team";
  if (modeBlob.includes("multi")) return "multi";
  if (modeBlob.includes("duo")) return "duo";

  const players = collectPlayers(root);
  if (players.length > 2) return "multi";
  if (players.length === 2) return "duo";
  if (players.length === 1) return "solo";
  return "unknown";
}

export function getX01VictoryMode(root: any): X01VictoryModeKey {
  for (const obj of walkObjects(root, 6)) {
    const mf: any = obj?.matchFormat || obj?.victoryFormat || obj?.x01MatchFormat;
    if (mf && typeof mf === "object") {
      const t = norm(mf.type ?? mf.mode ?? mf.kind);
      if (t.includes("first") || t === "ft" || t === "first_to") return "first_to";
      if (t.includes("best") || t === "bo" || t === "best_of") return "best_of";
    }
  }

  const raw = norm(firstValue(root, ["matchVictoryMode", "victoryMode", "x01VictoryMode", "formatType", "matchFormatType"]));
  if (raw.includes("first") || raw === "ft" || raw === "first_to") return "first_to";
  return "best_of";
}

export function getX01MatchFormat(root: any): X01StatsContext["matchFormat"] {
  const victoryMode = getX01VictoryMode(root);
  let target: number | null = null;
  let unit: "sets" | "legs" = "sets";

  for (const obj of walkObjects(root, 6)) {
    const mf: any = obj?.matchFormat || obj?.victoryFormat || obj?.x01MatchFormat;
    if (mf && typeof mf === "object") {
      const n = Number(mf.target ?? mf.value ?? mf.sets ?? mf.setsToWin ?? mf.bestOf);
      if (Number.isFinite(n) && n > 0) target = n;
      const u = norm(mf.unit ?? mf.scope);
      if (u.includes("leg") || u.includes("manche")) unit = "legs";
      if (u.includes("set")) unit = "sets";
      break;
    }
  }

  if (!target) {
    const n = Number(firstValue(root, ["setsToWin", "sets", "targetSets", "victoryTarget"]));
    target = Number.isFinite(n) && n > 0 ? n : null;
  }

  return { type: victoryMode, target, unit };
}

export function getX01StatsContext(root: any): X01StatsContext {
  return {
    startScore: getX01StartScore(root),
    variant: getX01Variant(root),
    victoryMode: getX01VictoryMode(root),
    matchFormat: getX01MatchFormat(root),
  };
}

export function x01ContextMatchesFilter(rootOrContext: any, filter?: X01StatsContextFilter | null): boolean {
  if (!filter) return true;
  const ctx: X01StatsContext =
    rootOrContext && ("startScore" in rootOrContext || "variant" in rootOrContext || "victoryMode" in rootOrContext)
      ? rootOrContext
      : getX01StatsContext(rootOrContext);

  if (filter.startScore && filter.startScore !== "all" && ctx.startScore !== filter.startScore) return false;
  if (filter.variant && filter.variant !== "all" && ctx.variant !== filter.variant) return false;
  if (filter.victoryMode && filter.victoryMode !== "all" && ctx.victoryMode !== filter.victoryMode) return false;
  return true;
}

export function x01VariantLabel(v: X01VariantKey | "all" | null | undefined): string {
  if (!v || v === "all") return "Tous formats";
  if (v === "duo") return "X01 Duo";
  if (v === "multi") return "X01 Multi";
  if (v === "team") return "X01 Team";
  if (v === "solo") return "X01 Solo";
  if (v === "training") return "Training";
  return "Inconnu";
}
