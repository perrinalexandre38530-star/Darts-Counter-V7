// ============================================
// src/lib/petanqueStore.ts
// Store local Pétanque (ACTIVE + HISTORY)
// ✅ Exports stables : loadPetanqueState / savePetanqueState / resetPetanque
// ✅ addEnd / undoLastEnd
// ✅ addMeasurement / undoLastMeasurement
// ✅ finishMatch helper
//
// ✅ BACK-COMPAT (pour éviter les CRASH imports existants)
// - startNewPetanqueGame
// - finishPetanqueMatch
// - loadPetanqueGameFromHistory
// - archivePetanqueGame
//
// ✅ PATCH ROBUSTE (CRASH FIX)
// - loadPetanqueState() ne renvoie JAMAIS null
// - garantit st.ends / st.measurements = tableaux
//
// ✅ NEW (CRASH FIX réel demandé)
// - loadPetanqueHistory() exporté (utilisé par pages Stats)
// ============================================

export type PetanqueTeamId = "A" | "B";

export type PetanqueEnd = {
  id: string;
  at: number;
  pointsA: number;
  pointsB: number;
};

// Mesures (version actuelle)
export type PetanqueMeasurement = {
  id: string;
  at: number;

  // origine / méthode
  from: "live" | "photo" | "manual";

  /**
   * Valeur "canonique" pour tri/lecture rapide.
   * Convention: millimètres si unit="cm" (cm * 10), sinon valeur brute si unit="px".
   */
  valueMm: number;

  // ✅ NEW: payload riche (utilisé par PetanquePlay)
  dA?: number; // distance équipe A (cm ou px selon unit)
  dB?: number; // distance équipe B (cm ou px selon unit)
  tol?: number; // tolérance (cm ou px selon unit)
  unit?: "cm" | "px";

  note?: string;
};

export type PetanqueState = {
  matchId: string;
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;

  status: "active" | "finished";

  mode: string; // "simple" | "doublette" | "ffa3" | etc.
  targetScore: number;

  scoreA: number;
  scoreB: number;

  ends: PetanqueEnd[];
  measurements: PetanqueMeasurement[];

  // payload UI (facultatif)
  meta?: any;
  teams?: any;
  players?: any[];
};

// --------------------------------------------
// Keys (ACTIVE + HISTORY)
// --------------------------------------------
const KEY_ACTIVE = "dc-petanque-active-v1";
const KEY_HISTORY = "dc-petanque-history-v1";

// (optionnel) compat ancienne clé si tu l’avais
const KEY_LEGACY_ACTIVE = "dc-petanque-game-v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampInt(n: any, min: number, max: number) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

// ✅ état neuf garanti (utilisé par load/reset/save)
function createPetanqueInitialState(overrides: Partial<PetanqueState> = {}): PetanqueState {
  const now = Date.now();
  return {
    matchId: uid("petanque"),
    createdAt: now,
    updatedAt: now,
    status: "active",
    mode: "simple",
    targetScore: 13,
    scoreA: 0,
    scoreB: 0,
    ends: [],
    measurements: [],
    ...overrides,
  };
}

function normalizeState(anySt: any): PetanqueState | null {
  if (!anySt || typeof anySt !== "object") return null;

  const now = Date.now();

  const matchId =
    typeof anySt.matchId === "string" && anySt.matchId
      ? anySt.matchId
      : typeof anySt.gameId === "string" && anySt.gameId
      ? anySt.gameId
      : uid("petanque");

  const createdAt = Number.isFinite(Number(anySt.createdAt)) ? Number(anySt.createdAt) : now;
  const updatedAt = Number.isFinite(Number(anySt.updatedAt)) ? Number(anySt.updatedAt) : createdAt;

  const status: "active" | "finished" =
    anySt.status === "finished" || anySt.finished === true ? "finished" : "active";

  const finishedAt =
    Number.isFinite(Number(anySt.finishedAt))
      ? Number(anySt.finishedAt)
      : status === "finished"
      ? updatedAt
      : undefined;

  const mode = typeof anySt.mode === "string" && anySt.mode ? anySt.mode : "simple";
  const targetScore = clampInt(anySt.targetScore ?? anySt.target ?? 13, 1, 999);

  const scoreA = clampInt(anySt.scoreA ?? 0, 0, 999);
  const scoreB = clampInt(anySt.scoreB ?? 0, 0, 999);

  const endsRaw = Array.isArray(anySt.ends) ? anySt.ends : [];
  const ends: PetanqueEnd[] = endsRaw
    .map((e: any) => {
      // compat: store moderne {pointsA/pointsB}
      if (e && typeof e === "object" && ("pointsA" in e || "pointsB" in e)) {
        return {
          id: String(e.id || uid("end")),
          at: Number(e.at || now),
          pointsA: clampInt(e.pointsA || 0, 0, 999),
          pointsB: clampInt(e.pointsB || 0, 0, 999),
        };
      }
      // compat: ancien store {winner/points}
      if (e && typeof e === "object" && ("winner" in e || "points" in e)) {
        const w: PetanqueTeamId = e.winner === "B" ? "B" : "A";
        const p = clampInt(e.points || 0, 0, 999);
        return {
          id: String(e.id || uid("end")),
          at: Number(e.at || now),
          pointsA: w === "A" ? p : 0,
          pointsB: w === "B" ? p : 0,
        };
      }
      return null;
    })
    .filter(Boolean) as PetanqueEnd[];

  const measRaw = Array.isArray(anySt.measurements) ? anySt.measurements : [];
  const measurements: PetanqueMeasurement[] = measRaw
    .map((m: any) => {
      if (!m || typeof m !== "object") return null;

      if ("valueMm" in m) {
        const v = Number(m.valueMm);
        if (!Number.isFinite(v)) return null;
        return {
          id: String(m.id || uid("m")),
          at: Number(m.at || now),
          from: m.from === "live" || m.from === "photo" || m.from === "manual" ? m.from : "manual",
          valueMm: v,
          dA: Number.isFinite(Number((m as any).dA)) ? Number((m as any).dA) : undefined,
          dB: Number.isFinite(Number((m as any).dB)) ? Number((m as any).dB) : undefined,
          tol: Number.isFinite(Number((m as any).tol)) ? Math.max(0, Number((m as any).tol)) : undefined,
          unit: (m as any).unit === "px" ? "px" : "cm",
          note: typeof m.note === "string" && m.note.trim() ? m.note.trim() : undefined,
        };
      }

      // compat: anciennes mesures non convertibles => ignorées
      return null;
    })
    .filter(Boolean) as PetanqueMeasurement[];

  const next: PetanqueState = {
    matchId,
    createdAt,
    updatedAt,
    finishedAt,
    status,
    mode,
    targetScore,
    scoreA,
    scoreB,
    ends,
    measurements,
    meta: anySt.meta,
    teams: anySt.teams,
    players: anySt.players,
  };

  return next;
}

// ✅ Garantit un state valide même si storage vide/corrompu
function ensureState(st: PetanqueState | null | undefined): PetanqueState {
  if (!st) return createPetanqueInitialState();
  return {
    ...createPetanqueInitialState(),
    ...st,
    ends: Array.isArray((st as any).ends) ? (st as any).ends : [],
    measurements: Array.isArray((st as any).measurements) ? (st as any).measurements : [],
  };
}

// --------------------------------------------
// Core API (actuel)
// --------------------------------------------

// ✅ IMPORTANT: ne retourne JAMAIS null (crash fix)
export function loadPetanqueState(): PetanqueState {
  try {
    // priorité: ACTIVE
    const active = normalizeState(safeParse<any>(localStorage.getItem(KEY_ACTIVE)));
    if (active) return ensureState(active);

    // fallback legacy si existe encore
    const legacy = normalizeState(safeParse<any>(localStorage.getItem(KEY_LEGACY_ACTIVE)));
    if (legacy) return ensureState(legacy);

    // aucun match => état initial
    return createPetanqueInitialState();
  } catch {
    return createPetanqueInitialState();
  }
}

export function savePetanqueState(st: PetanqueState) {
  try {
    const safe = ensureState(st);
    localStorage.setItem(KEY_ACTIVE, JSON.stringify(safe));
  } catch {}
}

export function clearPetanqueActive() {
  try {
    localStorage.removeItem(KEY_ACTIVE);
  } catch {}
}

export function resetPetanque(): PetanqueState {
  const st = createPetanqueInitialState();
  savePetanqueState(st);
  return st;
}

// ✅ helper demandé dans tes messages précédents
export function finishMatch(st: PetanqueState) {
  const done: PetanqueState = {
    ...ensureState(st),
    status: "finished",
    finishedAt: Date.now(),
    updatedAt: Date.now(),
  };
  savePetanqueState(done);

  // Optionnel UX : certains écrans veulent clear l’active après finish.
  // Ici on NE clear PAS par défaut pour ne pas casser les écrans existants.
  // clearPetanqueActive();
}

// --------------------------------------------
// Ends
// --------------------------------------------
export function addEnd(st: PetanqueState, team: PetanqueTeamId, points: number): PetanqueState {
  st = ensureState(st);

  // blocage si déjà fini
  if (st.status === "finished") return st;

  const p = clampInt(points, 0, 999);
  const id = uid("end");
  const at = Date.now();

  const pointsA = team === "A" ? p : 0;
  const pointsB = team === "B" ? p : 0;

  const scoreA = clampInt(st.scoreA + pointsA, 0, 999);
  const scoreB = clampInt(st.scoreB + pointsB, 0, 999);

  const next: PetanqueState = {
    ...st,
    updatedAt: at,
    scoreA,
    scoreB,
    ends: [{ id, at, pointsA, pointsB }, ...(st.ends || [])],
  };

  // auto-finish si cible atteinte
  if (scoreA >= (st.targetScore || 13) || scoreB >= (st.targetScore || 13)) {
    const done: PetanqueState = {
      ...next,
      status: "finished",
      finishedAt: Date.now(),
      updatedAt: Date.now(),
    };
    savePetanqueState(done);
    return done;
  }

  savePetanqueState(next);
  return next;
}

export function undoLastEnd(st: PetanqueState): PetanqueState {
  st = ensureState(st);

  const list = Array.isArray(st.ends) ? st.ends.slice() : [];
  if (!list.length) return st;

  const last = list.shift()!;
  const scoreA = clampInt(st.scoreA - (last.pointsA || 0), 0, 999);
  const scoreB = clampInt(st.scoreB - (last.pointsB || 0), 0, 999);

  const next: PetanqueState = {
    ...st,
    updatedAt: Date.now(),
    status: "active",
    finishedAt: undefined,
    scoreA,
    scoreB,
    ends: list,
  };

  savePetanqueState(next);
  return next;
}

// --------------------------------------------
// Measurements
// --------------------------------------------
export function addMeasurement(st: PetanqueState, m: Omit<PetanqueMeasurement, "id" | "at">): PetanqueState {
  st = ensureState(st);

  const id = uid("m");
  const at = Date.now();

  // ✅ Compat: soit valueMm direct, soit dA/dB(+tol) depuis PetanquePlay
  const unit: "cm" | "px" = (m as any)?.unit === "px" ? "px" : "cm";

  let valueMm = Number((m as any)?.valueMm);

  const dA = Number((m as any)?.dA);
  const dB = Number((m as any)?.dB);
  const tol = Number((m as any)?.tol);

  // Si pas de valueMm, on dérive depuis dA/dB (distances A/B)
  if (!Number.isFinite(valueMm)) {
    if (!Number.isFinite(dA) || !Number.isFinite(dB) || dA < 0 || dB < 0) return st;
    const delta = Math.abs(dA - dB); // unit: cm ou px
    valueMm = unit === "cm" ? delta * 10 : delta; // cm -> mm, px -> "brut"
  }

  if (!Number.isFinite(valueMm) || valueMm < 0) return st;

  const from: "live" | "photo" | "manual" =
    (m as any)?.from === "live" || (m as any)?.from === "photo" || (m as any)?.from === "manual"
      ? (m as any).from
      : "manual";

  const note =
    typeof (m as any)?.note === "string" && (m as any).note.trim() ? (m as any).note.trim() : undefined;

  const next: PetanqueState = {
    ...st,
    updatedAt: at,
    measurements: [
      {
        id,
        at,
        from,
        valueMm,
        note,
        // ✅ NEW: conserver les champs riches si fournis
        dA: Number.isFinite(dA) ? dA : undefined,
        dB: Number.isFinite(dB) ? dB : undefined,
        tol: Number.isFinite(tol) ? Math.max(0, tol) : undefined,
        unit,
      },
      ...(st.measurements || []),
    ],
  };

  savePetanqueState(next);
  return next;
}

export function undoLastMeasurement(st: PetanqueState): PetanqueState {
  st = ensureState(st);

  const list = Array.isArray(st.measurements) ? st.measurements.slice() : [];
  if (!list.length) return st;

  list.shift();

  const next: PetanqueState = { ...st, updatedAt: Date.now(), measurements: list };
  savePetanqueState(next);
  return next;
}

// --------------------------------------------
// HISTORY (local)
// --------------------------------------------
export function appendPetanqueHistory(st: PetanqueState) {
  try {
    const safe = ensureState(st);
    const raw = localStorage.getItem(KEY_HISTORY);
    const list = raw ? (safeParse<PetanqueState[]>(raw) ?? []) : [];
    list.unshift(safe);
    localStorage.setItem(KEY_HISTORY, JSON.stringify(list.slice(0, 200)));
  } catch {}
}

// ✅ alias plus explicite (certains fichiers importent ce nom)
export function archivePetanqueGame(st: PetanqueState) {
  appendPetanqueHistory(st);
}

// ✅ NEW: export attendu par tes pages Stats (CRASH FIX)
export function loadPetanqueHistory(opts?: {
  limit?: number;
  status?: "active" | "finished";
  mode?: string;
}): PetanqueState[] {
  try {
    const limit = clampInt(opts?.limit ?? 200, 1, 2000);
    const status = opts?.status;
    const mode = typeof opts?.mode === "string" && opts.mode.trim() ? opts.mode.trim() : null;

    const raw = localStorage.getItem(KEY_HISTORY);
    const arr = raw ? (safeParse<any[]>(raw) ?? []) : [];

    const normalized = arr
      .map((x) => normalizeState(x))
      .filter(Boolean)
      .map((x) => ensureState(x as any));

    const filtered = normalized.filter((g) => {
      if (status && g.status !== status) return false;
      if (mode && String(g.mode || "").toLowerCase() !== mode.toLowerCase()) return false;
      return true;
    });

    // tri desc par updatedAt
    filtered.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));

    return filtered.slice(0, limit);
  } catch {
    return [];
  }
}

// ✅ requis par tes écrans: lecture d’un match depuis l’historique
export function loadPetanqueGameFromHistory(matchId: string): PetanqueState | null {
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    if (!raw) return null;

    const list = safeParse<any[]>(raw) || [];
    const found = list.find((g: any) => String(g?.matchId || g?.gameId || "") === String(matchId));
    const norm = normalizeState(found);

    return norm ? ensureState(norm) : null;
  } catch {
    return null;
  }
}

// (optionnel mais utile) vider l'historique (debug/admin)
export function clearPetanqueHistory() {
  try {
    localStorage.removeItem(KEY_HISTORY);
  } catch {}
}

// --------------------------------------------
// BACK-COMPAT exports (évite CRASH boot)
// --------------------------------------------

// ✅ attendu par certains écrans/configs : démarre un match neuf, force score à 0
export function startNewPetanqueGame(params?: Partial<PetanqueState>): PetanqueState {
  const now = Date.now();
  const mode = typeof params?.mode === "string" && params.mode ? params.mode : "simple";
  const targetScore = clampInt((params as any)?.targetScore ?? 13, 1, 999);

  const st: PetanqueState = ensureState({
    matchId: uid("petanque"),
    createdAt: now,
    updatedAt: now,
    status: "active",
    finishedAt: undefined,
    mode,
    targetScore,
    scoreA: 0,
    scoreB: 0,
    ends: [],
    measurements: [],
    meta: params?.meta,
    teams: params?.teams,
    players: params?.players,
  } as any);

  savePetanqueState(st);
  return st;
}

// ✅ attendu : termine le match quand cible atteinte + archive + clear active (optionnel)
export function finishPetanqueMatch(st: PetanqueState): PetanqueState {
  st = ensureState(st);

  // si déjà fini -> no-op
  if (st.status === "finished") return st;

  const target = clampInt(st.targetScore || 13, 1, 999);
  const a = clampInt(st.scoreA || 0, 0, 999);
  const b = clampInt(st.scoreB || 0, 0, 999);

  // si personne n’a atteint -> no-op
  if (a < target && b < target) return st;

  const done: PetanqueState = {
    ...st,
    status: "finished",
    finishedAt: Date.now(),
    updatedAt: Date.now(),
  };

  savePetanqueState(done);

  // ✅ on archive (utile pour historiques / stats)
  archivePetanqueGame(done);

  // ✅ IMPORTANT: éviter “reprendre une partie finie”
  clearPetanqueActive();

  return done;
}

// --------------------------------------------
// BACK-COMPAT UI (PetanquePlay)
// --------------------------------------------
export function getActivePetanqueGame(): PetanqueState {
  return loadPetanqueState();
}
