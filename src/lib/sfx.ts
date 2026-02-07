// ============================================
// src/lib/sfx.ts — Gestion centralisée des sons (SAFE MOBILE)
// SONS DE BASE servis depuis /public/sounds (Vite)
// + Shanghai servis depuis src/assets/sounds (Vite import)
// + Cache/pool Audio + unlock autoplay
// + ✅ UI clicks (click / soft / confirm) servis depuis /public/sounds
// ✅ SAFE: aucun Audio créé au boot (lazy), play() ne doit JAMAIS crash l’UI
//
// 🏌️ Golf:
// - Intro: src/assets/sounds/golf_intro.mp3
// - Variantes perfs: golf_{perf}_{n}.mp3 (tolère quelques noms "bizarres" ex: golf_eagle_3..mp3)
// - Bruitages tickers: golf_ticker_*.wav
// ============================================

let SFX_ENABLED = true;

export function setSfxEnabled(v: boolean) {
  SFX_ENABLED = !!v;
}
export function isSfxEnabled() {
  return SFX_ENABLED;
}

// ✅ Shanghai: fichiers DANS src/assets/sounds/
import shanghaiIntroUrl from "../assets/sounds/shanghai.mp3";
import shanghaiMissUrl from "../assets/sounds/shanghai-miss.mp3";

// 🏌️ Golf — intro (fichier présent dans ton repo)
import golfIntroUrl from "../assets/sounds/golf_intro.mp3";

// 🏌️ Golf — bruitages "arcade" tickers
import golfTickerEagleUrl from "../assets/sounds/golf_ticker_eagle.wav";
import golfTickerBirdieUrl from "../assets/sounds/golf_ticker_birdie.wav";
import golfTickerParUrl from "../assets/sounds/golf_ticker_par.wav";
import golfTickerBogeyUrl from "../assets/sounds/golf_ticker_bogey.wav";
import golfTickerSimpleUrl from "../assets/sounds/golf_ticker_simple.wav";
import golfTickerMissUrl from "../assets/sounds/golf_ticker_miss.wav";

// 🔊 URLs publiques (public/sounds) + URLs assets (import)
const SFX = {
  // Base (public/sounds)
  hit: "/sounds/dart-hit.mp3",
  bust: "/sounds/bust.mp3",
  "180": "/sounds/180.mp3",
  dble: "/sounds/double.mp3",
  trpl: "/sounds/triple.mp3",
  bull: "/sounds/bull.mp3",
  dbull: "/sounds/double-bull.mp3",

  // ✅ UI clicks (public/sounds)
  uiClick: "/sounds/ui-click.mp3",
  uiClickSoft: "/sounds/ui-click-soft.mp3",
  uiConfirm: "/sounds/ui-confirm.mp3",

  // Shanghai (assets import)
  shanghai: shanghaiIntroUrl,
  shanghaiMiss: shanghaiMissUrl,

  // 🏌️ Golf (assets import)
  golfIntro: golfIntroUrl,
} as const;

type SfxKey = keyof typeof SFX;

/**
 * ✅ Petit pool Audio pour éviter le lag et permettre chevauchements légers.
 * ✅ SAFE MOBILE: lazy + try/catch partout
 */
const POOL_MAX_PER_URL = 4;
const pool = new Map<string, HTMLAudioElement[]>();

function makeAudio(url: string) {
  const a = new Audio(url);
  a.preload = "none";
  (a as any).playsInline = true;
  a.volume = 0.9;
  return a;
}

function getFromPool(url: string) {
  let list = pool.get(url);
  if (!list) {
    list = [];
    pool.set(url, list);
  }

  for (const a of list) {
    try {
      if (a.paused || a.ended) return a;
    } catch {}
  }

  if (list.length < POOL_MAX_PER_URL) {
    try {
      const a = makeAudio(url);
      list.push(a);
      return a;
    } catch {}
  }

  return list[0];
}

/**
 * ✅ IMPORTANT (autoplay mobile):
 * appelle ça sur un vrai geste utilisateur (clic "LANCER LA PARTIE").
 */
export async function unlockAudio() {
  if (!SFX_ENABLED) return;

  try {
    const url = SFX.hit;
    const a = getFromPool(url);
    if (!a) return;

    try {
      a.muted = true;
      a.currentTime = 0;
    } catch {}

    const p = a.play();
    if (p && typeof (p as any).then === "function") await p;

    try {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
      a.preload = "auto";
    } catch {}
  } catch {}
}

function playSafeUrl(url?: string, vol = 0.9) {
  if (!url || !SFX_ENABLED) return;

  try {
    const a = getFromPool(url);
    if (!a) return;

    try {
      a.volume = vol;
      a.currentTime = 0;
      a.preload = "auto";
    } catch {}

    const p = a.play();
    if (p && typeof (p as any).catch === "function") p.catch(() => {});
  } catch {}
}

/** Joue un son par clé */
export function playSfx(key: SfxKey) {
  playSafeUrl(SFX[key]);
}

// 🏌️ Golf — musique d'intro (arrivée dans GolfPlay)
let _golfIntroAudio: HTMLAudioElement | null = null;
export function playGolfIntro(volume: number = 0.5) {
  try {
    if (_golfIntroAudio) {
      try { _golfIntroAudio.pause(); } catch {}
      _golfIntroAudio = null;
    }
    if (!SFX_ENABLED) return;

    const a = getFromPool(SFX.golfIntro);
    if (!a) return;

    try {
      a.preload = "auto";
      (a as any).playsInline = true;
      a.volume = Math.max(0, Math.min(1, volume));
      a.currentTime = 0;
    } catch {}

    _golfIntroAudio = a;

    const p = a.play();
    if (p && typeof (p as any).catch === "function") p.catch(() => {});
  } catch {}
}

export function stopGolfIntro() {
  try {
    if (_golfIntroAudio) {
      try { _golfIntroAudio.pause(); } catch {}
      _golfIntroAudio = null;
    }
  } catch {}
}

// 🏌️ Golf — bruitages "arcade" propres aux tickers (en plus des SFX)
const GOLF_TICKER_SOUNDS = {
  EAGLE: golfTickerEagleUrl,
  BIRDIE: golfTickerBirdieUrl,
  PAR: golfTickerParUrl,
  BOGEY: golfTickerBogeyUrl,
  SIMPLE: golfTickerSimpleUrl,
  MISS: golfTickerMissUrl,
} as const;

export function playGolfTickerSound(
  perf: keyof typeof GOLF_TICKER_SOUNDS,
  volume: number = 0.95
) {
  try {
    if (!SFX_ENABLED) return;
    const url = GOLF_TICKER_SOUNDS[perf];
    if (!url) return;
    playSafeUrl(url, Math.max(0, Math.min(1, volume)));
  } catch {}
}

// 🏌️ Golf — SFX perfs (4 variantes) via glob (robuste)
export type GolfPerf = "EAGLE" | "BIRDIE" | "PAR" | "BOGEY" | "SIMPLE" | "MISS";

/**
 * ✅ Pattern ABSOLU Vite (/src/...)
 * Exemples:
 * - golf_eagle_1.mp3 ... golf_eagle_4.mp3
 * - golf_eagle_3..mp3 (toléré)
 */
const GOLF_VARIANTS_GLOB = import.meta.glob("/src/assets/sounds/golf_*_*.mp3", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const GOLF_PERF_VARIANTS: Record<GolfPerf, Array<{ n: number; url: string }>> = {
  EAGLE: [],
  BIRDIE: [],
  PAR: [],
  BOGEY: [],
  SIMPLE: [],
  MISS: [],
};

function perfAndNFromPath(p: string): { perf: GolfPerf; n: number } | null {
  // accepte: golf_eagle_3..mp3 -> n=3
  const m = p.match(/golf_(eagle|birdie|par|bogey|simple|miss)_(\d+)(?:\.+)?\.mp3$/i);
  if (!m) return null;
  const key = m[1].toLowerCase();
  const n = Number(m[2]);
  if (!Number.isFinite(n)) return null;

  let perf: GolfPerf | null = null;
  if (key === "eagle") perf = "EAGLE";
  else if (key === "birdie") perf = "BIRDIE";
  else if (key === "par") perf = "PAR";
  else if (key === "bogey") perf = "BOGEY";
  else if (key === "simple") perf = "SIMPLE";
  else if (key === "miss") perf = "MISS";

  if (!perf) return null;
  return { perf, n };
}

for (const [path, url] of Object.entries(GOLF_VARIANTS_GLOB)) {
  const parsed = perfAndNFromPath(path);
  if (!parsed) continue;
  GOLF_PERF_VARIANTS[parsed.perf].push({ n: parsed.n, url });
}

// tri stable par n
for (const perf of Object.keys(GOLF_PERF_VARIANTS) as GolfPerf[]) {
  GOLF_PERF_VARIANTS[perf].sort((a, b) => a.n - b.n);
}

const _golfLastIdx: Partial<Record<GolfPerf, number>> = {};

function pickVariant(perf: GolfPerf) {
  const list = GOLF_PERF_VARIANTS[perf];
  if (!list || list.length === 0) return null;

  const last = _golfLastIdx[perf];
  let i = 0;

  if (list.length === 1) {
    i = 0;
  } else {
    do {
      i = Math.floor(Math.random() * list.length);
    } while (i === last);
  }

  _golfLastIdx[perf] = i;
  return list[i]?.url ?? list[0]?.url ?? null;
}

/** Joue le SFX de perf Golf (variantes + anti-répétition) */
export function playGolfPerfSfx(perf: GolfPerf, volume: number = 0.85) {
  const url = pickVariant(perf);
  if (!url) return;
  playSafeUrl(url, Math.max(0, Math.min(1, volume)));
}

/** Son d'impact standard (TOUS MODES) */
export function playThrowSound(dart: { mult: number; value: number }) {
  const { mult, value } = dart;
  if (value === 25 && mult === 2) return playSfx("dbull");
  if (value === 25 && mult === 1) return playSfx("bull");
  if (mult === 3) return playSfx("trpl");
  if (mult === 2) return playSfx("dble");
  return playSfx("hit");
}

/** Utilitaire safe depuis UIDart */
export function playImpactFromDart(
  dart?: { mult?: number; value?: number } | null
) {
  if (!dart) return;
  playThrowSound({
    mult: Number(dart.mult ?? 1),
    value: Number(dart.value ?? 0),
  });
}

export function playShanghaiMiss() {
  playSfx("shanghaiMiss");
}

export function playShanghaiIntro() {
  playSfx("shanghai");
}

export function playOneEighty(total: number) {
  if (total === 180) playSfx("180");
}

export function playBust(isBust: boolean) {
  if (isBust) playSfx("bust");
}

/* ============================================================
   ✅ UI CLICKS — centralisés dans le même moteur/pool
============================================================ */

export function playUiClick() {
  playSafeUrl(SFX.uiClick, 0.55);
}

export function playUiClickSoft() {
  playSafeUrl(SFX.uiClickSoft, 0.45);
}

export function playUiConfirm() {
  playSafeUrl(SFX.uiConfirm, 0.65);
}

export const UISfx = {
  click: playUiClick,
  soft: playUiClickSoft,
  confirm: playUiConfirm,
};
