// ============================================
// src/lib/x01SfxV3.ts
// X01 V3 - Sons (public/sounds) + Voix (TTS)
// Règles:
// - dart-hit: chaque dart validé
// - double / triple: dès qu'un dart D/T est validé
// - bull / dbull: dès qu'un dart touche 25 / 50
// - 180: fin de volée si score=180 avec 3 darts
// - bust: à chaque bust
// - victoire: fin de match + voix classement
//
// FIXES intégrés :
// - Unlock audio (autoplay mobile/Chrome) : x01EnsureAudioUnlocked()
// - Voix sélectionnable via voiceId :
//    - exact : voiceURI ou name
//    - profils : "male" | "female" | "robot" (+ variantes langue)
// - ✅ Langue dynamique : suit la langue app via x01SfxV3Configure({ ttsLang })
// - ✅ Fallback robuste : si "male/female" indispo dans la langue -> fallback en "en-US"
//   (c’est la seule façon d’éviter “toujours féminin” quand la langue n’a pas de voix masculine)
// ============================================

import { isAudioCategoryEnabled, isMasterAudioEnabled, resolveAudioVolume, type AudioSfxCategory } from "./audioPreferences";

export type DartLike = any;

export type SfxKey =
  | "dart_hit"
  | "double"
  | "triple"
  | "bull"
  | "dbull"
  | "score_180"
  | "bust"
  | "victory";

const SFX_URL: Record<SfxKey, string> = {
  dart_hit: "/sounds/dart-hit.mp3",
  double: "/sounds/double.mp3",
  triple: "/sounds/triple.mp3",
  bull: "/sounds/bull.mp3",
  dbull: "/sounds/doublebull.mp3",
  score_180: "/sounds/180.mp3",
  bust: "/sounds/bust.mp3",
  victory: "/sounds/victory.mp3",
};

let ENABLED = true;
let VOICE_ENABLED = true;
let VOLUME = 0.9;

// ✅ langue TTS courante (doit suivre la langue app)
let TTS_LANG = "fr-FR";

// anti-spam par clé
const last: Record<string, number> = {};
const cache: Partial<Record<SfxKey, HTMLAudioElement>> = {};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// =====================================================
// 🔓 UNLOCK AUDIO (autoplay policies) — FIX RÉEL
// - Ne marque "unlocked" QUE si succès réel
// - Garde les listeners tant que pas unlock
// - Tente un unlock immédiat si appelée pendant un geste user
// =====================================================

let __dcAudioUnlocked = false;
let __dcUnlockInstalled = false;
let __dcUnlockAttempt: Promise<void> | null = null;
let __dcLastUnlockAttemptAt = 0;
let __dcSilentProbe: HTMLAudioElement | null = null;

function removeUnlockListeners(tryUnlock: () => void) {
  try {
    window.removeEventListener("pointerdown", tryUnlock);
    window.removeEventListener("touchstart", tryUnlock);
    window.removeEventListener("mousedown", tryUnlock);
    window.removeEventListener("keydown", tryUnlock);
  } catch {}
}

export function x01EnsureAudioUnlocked() {
  if (typeof window === "undefined" || __dcAudioUnlocked) return;

  const tryUnlock = () => {
    if (__dcAudioUnlocked || __dcUnlockAttempt) return;

    // PERF Android : plusieurs chemins de saisie appellent ensure() pour le même
    // geste. Avant ce patch chaque appel construisait un nouvel Audio() + play(),
    // ce qui pouvait bloquer le thread UI. Une tentative max toutes les 500 ms.
    const now = Date.now();
    if (now - __dcLastUnlockAttemptAt < 500) return;
    __dcLastUnlockAttemptAt = now;

    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = (window as any).__dcAudioCtx || new AC();
        (window as any).__dcAudioCtx = ctx;
        if (ctx.state === "suspended") void ctx.resume?.().catch?.(() => {});
        if (ctx.state === "running") {
          __dcAudioUnlocked = true;
          removeUnlockListeners(tryUnlock);
          return;
        }
      }
    } catch {}

    try {
      const a = __dcSilentProbe || new Audio();
      __dcSilentProbe = a;
      a.muted = true;
      a.preload = "none";

      const p = a.play();
      if (!p || typeof (p as any).then !== "function") return;

      __dcUnlockAttempt = Promise.resolve(p)
        .then(() => {
          try {
            a.pause();
            a.currentTime = 0;
          } catch {}
          __dcAudioUnlocked = true;
          removeUnlockListeners(tryUnlock);
        })
        .catch(() => {
          // Autoplay encore bloqué : le prochain vrai geste retentera.
        })
        .finally(() => {
          __dcUnlockAttempt = null;
        });
    } catch {
      __dcUnlockAttempt = null;
    }
  };

  if (!__dcUnlockInstalled) {
    __dcUnlockInstalled = true;
    window.addEventListener("pointerdown", tryUnlock, { passive: true });
    window.addEventListener("touchstart", tryUnlock, { passive: true });
    window.addEventListener("mousedown", tryUnlock, { passive: true });
    window.addEventListener("keydown", tryUnlock, { passive: true });
  }

  tryUnlock();
}

// =====================================================
// SFX
// =====================================================

function getAudio(key: SfxKey) {
  if (cache[key]) return cache[key]!;
  const a = new Audio(SFX_URL[key]);
  a.preload = "auto";
  cache[key] = a;
  return a;
}

function normalizeLang(input?: string | null): string {
  const raw = (input || "").trim();
  if (!raw) return "fr-FR";

  const lower = raw.toLowerCase();

  // mapping "court" -> locale par défaut
  const mapShort: Record<string, string> = {
    fr: "fr-FR",
    en: "en-US",
    it: "it-IT",
    es: "es-ES",
    de: "de-DE",
    nl: "nl-NL",
    pt: "pt-PT",
    sv: "sv-SE",
    no: "nb-NO",
    da: "da-DK",
    fi: "fi-FI",
    pl: "pl-PL",
    cs: "cs-CZ",
    sk: "sk-SK",
    hu: "hu-HU",
    ro: "ro-RO",
    bg: "bg-BG",
    el: "el-GR",
    tr: "tr-TR",
    ru: "ru-RU",
    uk: "uk-UA",
    he: "he-IL",
    ar: "ar-SA",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
    hi: "hi-IN",
    id: "id-ID",
    ms: "ms-MY",
    th: "th-TH",
    vi: "vi-VN",
  };

  if (mapShort[lower]) return mapShort[lower];

  // si déjà au format "xx-YY"
  if (/^[a-z]{2,3}-[a-z]{2}$/i.test(raw)) return raw;

  // fallback : garde raw
  return raw;
}

export function x01SfxV3Configure(opts: {
  enabled?: boolean;
  voiceEnabled?: boolean;
  volume?: number;
  ttsLang?: string; // ✅ NOUVEAU
}) {
  if (typeof opts.enabled === "boolean") ENABLED = opts.enabled;
  if (typeof opts.voiceEnabled === "boolean") VOICE_ENABLED = opts.voiceEnabled;
  if (typeof opts.volume === "number") VOLUME = clamp01(opts.volume);
  if (typeof opts.ttsLang === "string") TTS_LANG = normalizeLang(opts.ttsLang);
}

export function x01SfxV3Preload() {
  x01EnsureAudioUnlocked();

  // ✅ warm-up voices (Chrome/Android parfois vide au premier call)
  try {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.getVoices?.();
    }
  } catch {}

  (Object.keys(SFX_URL) as SfxKey[]).forEach((k) => {
    try {
      getAudio(k);
    } catch {}
  });
}

export async function x01PlaySfxV3(
  key: SfxKey,
  opts?: { volume?: number; rateLimitMs?: number }
) {
  x01EnsureAudioUnlocked();

  if (!ENABLED) return;
  const category: AudioSfxCategory = ["dart_hit", "double", "triple", "bull", "dbull"].includes(key) ? "impact" : "arcade";
  if (!isAudioCategoryEnabled(category)) return;
  const now = Date.now();
  const rl = opts?.rateLimitMs ?? 80;
  if (last[key] && now - last[key] < rl) return;
  last[key] = now;

  try {
    // PERF : réutilise l'élément préchargé au lieu de cloneNode() à chaque dart.
    // Les touches rapprochées redémarrent simplement ce SFX ; les clés différentes
    // disposent chacune de leur propre élément et peuvent toujours se superposer.
    const node = getAudio(key);
    node.volume = resolveAudioVolume(clamp01(opts?.volume ?? VOLUME), category);
    try {
      node.pause();
      node.currentTime = 0;
    } catch {}
    await node.play();
  } catch {
    // autoplay bloqué -> ignore
  }
}

// --------- Détection flexible (compatible avec plusieurs shapes) ---------

function normStr(x: any) {
  return (x ?? "").toString().trim().toUpperCase();
}

/**
 * Déduit (mult, value) depuis plusieurs formats possibles :
 * - { mult:"S"|"D"|"T", num:20 } ou { number:20, multiplier:3 }
 * - { segment:"T20" } / "D25" etc
 * - { ring:"T", value:20 } ...
 */
export function parseDart(
  d: DartLike
): { mult: "S" | "D" | "T"; value: number } {
  const mult1 = normStr(d?.mult || d?.ring || d?.m);
  const num1 = Number(d?.num ?? d?.number ?? d?.value);

  if (
    (mult1 === "S" || mult1 === "D" || mult1 === "T") &&
    Number.isFinite(num1)
  ) {
    return { mult: mult1 as any, value: num1 };
  }

  const mul = Number(d?.multiplier);
  if ((mul === 1 || mul === 2 || mul === 3) && Number.isFinite(num1)) {
    return { mult: mul === 3 ? "T" : mul === 2 ? "D" : "S", value: num1 };
  }

  const seg = normStr(d?.segment || d?.seg || d?.code);
  if (seg) {
    if (seg === "DBULL" || seg === "DOUBLEBULL") return { mult: "D", value: 25 };
    if (seg === "BULL" || seg === "SBULL") return { mult: "S", value: 25 };
    const m = seg[0];
    const rest = Number(seg.slice(1));
    if ((m === "S" || m === "D" || m === "T") && Number.isFinite(rest)) {
      return { mult: m as any, value: rest };
    }
  }

  return { mult: "S", value: Number.isFinite(num1) ? num1 : 0 };
}

export function isBull(d: DartLike) {
  const p = parseDart(d);
  return p.value === 25 && p.mult === "S";
}
export function isDBull(d: DartLike) {
  const p = parseDart(d);
  return p.value === 25 && p.mult === "D";
}
export function isDouble(d: DartLike) {
  return parseDart(d).mult === "D";
}
export function isTriple(d: DartLike) {
  return parseDart(d).mult === "T";
}

// =====================================================
// Voix (TTS) — voiceId + langue dynamique + fallback robuste
// =====================================================

function baseLang(lang?: string) {
  const l = normalizeLang(lang || TTS_LANG);
  return l.split("-")[0].toLowerCase();
}

function isMaleRequest(voiceId?: string) {
  const id = (voiceId || "").toString().toLowerCase();
  return /(^|\W)(male|man|homme|masc|masculin|uomo|hombre|varon|varón|mann|männlich|maschio|erkek|muz|muž|férfi|barbat|bărbat|муж|男)(\W|$)/i.test(
    id
  );
}
function isFemaleRequest(voiceId?: string) {
  const id = (voiceId || "").toString().toLowerCase();
  return /(^|\W)(female|woman|femme|fem|féminin|donna|mujer|frau|weiblich|femmina|kadin|kadın|zena|žena|nő|femeie|жен|女)(\W|$)/i.test(
    id
  );
}
function isRobotRequest(voiceId?: string) {
  const id = (voiceId || "").toString().toLowerCase();
  return /robot|android|cyborg|synthetic|synth/i.test(id);
}

// ⚠️ WebSpeech n'a pas de "gender". On fait une heuristique SUR LE NOM,
// + fallback si la langue n'a pas de voix qui match le genre.
function matchesGenderHeuristic(
  v: SpeechSynthesisVoice,
  gender: "male" | "female" | "robot"
) {
  const name = (v.name || "").toLowerCase();
  const uri = (v.voiceURI || "").toLowerCase();

  const maleKw = [
    "male",
    "man",
    "homme",
    "uomo",
    "hombre",
    "mann",
    "männlich",
    "maschio",
    "erkek",
    "муж",
    "男",
  ];
  const femaleKw = [
    "female",
    "woman",
    "femme",
    "donna",
    "mujer",
    "frau",
    "weiblich",
    "femmina",
    "kadın",
    "жен",
    "女",
  ];
  const robotKw = ["robot", "android", "cyborg", "synthetic", "synth", "tts"];

  if (gender === "robot") {
    return robotKw.some((k) => name.includes(k) || uri.includes(k));
  }
  if (gender === "male") {
    // si on détecte explicitement du "female", on refuse
    if (femaleKw.some((k) => name.includes(k) || uri.includes(k))) return false;
    return maleKw.some((k) => name.includes(k) || uri.includes(k));
  }
  // female
  if (maleKw.some((k) => name.includes(k) || uri.includes(k))) return false;
  return femaleKw.some((k) => name.includes(k) || uri.includes(k));
}

function resolveVoiceWithFallback(
  voiceId?: string,
  lang?: string
): { voice: SpeechSynthesisVoice | null; effectiveLang: string } {
  if (typeof window === "undefined")
    return { voice: null, effectiveLang: normalizeLang(lang || TTS_LANG) };

  const synth = window.speechSynthesis;
  const voices = synth?.getVoices?.() || [];
  const wantedLang = normalizeLang(lang || TTS_LANG);
  const wantedBase = baseLang(wantedLang);

  if (!voices.length) {
    return { voice: null, effectiveLang: wantedLang };
  }

  const idRaw = (voiceId || "").toString().trim().toLowerCase();

  // 1) ✅ PRIORITÉ ABSOLUE : match exact (voiceURI / name)
  if (idRaw) {
    const exact =
      voices.find((v) => (v.voiceURI || "").toLowerCase() === idRaw) ||
      voices.find((v) => (v.name || "").toLowerCase() === idRaw);
    if (exact) {
      return { voice: exact, effectiveLang: exact.lang || wantedLang };
    }
  }

  const wantMale = isMaleRequest(voiceId);
  const wantFemale = isFemaleRequest(voiceId);
  const wantRobot = isRobotRequest(voiceId);

  const desired: "male" | "female" | "robot" | null =
    wantRobot ? "robot" : wantMale ? "male" : wantFemale ? "female" : null;

  // pool de voix dans la langue voulue (priorité)
  const sameLang = voices.filter((v) =>
    (v.lang || "").toLowerCase().startsWith(wantedBase)
  );

  // helper qualité (meilleures voix)
  const preferQuality = (arr: SpeechSynthesisVoice[]) =>
    arr.find((v) =>
      /google|microsoft|apple|siri|nuance|amazon/i.test(v.name || "")
    ) || arr[0] || null;

  // 2) ✅ si on demande un genre, on ESSAYE dans la langue voulue
  if (desired && sameLang.length) {
    const genderMatch = sameLang.find((v) =>
      matchesGenderHeuristic(v, desired)
    );
    if (genderMatch) {
      return { voice: genderMatch, effectiveLang: genderMatch.lang || wantedLang };
    }
  }

  // 3) ✅ IMPORTANT : si pas trouvé (ou pas de heuristique), on RESTE DANS LA LANGUE APP
  //    (même si la voix "sonne féminine" — au moins ce sera italien)
  if (sameLang.length) {
    const v = preferQuality(sameLang);
    return { voice: v, effectiveLang: v?.lang || wantedLang };
  }

  // 4) fallback global (pas de voix dans la langue) : on prend la meilleure voix dispo
  const vAll = preferQuality(voices);
  return { voice: vAll, effectiveLang: vAll?.lang || wantedLang };
}

function dcSpeak(
  text: string,
  opts?: {
    voiceId?: string;
    robot?: boolean;
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
  }
) {
  if (!VOICE_ENABLED || !isMasterAudioEnabled()) return;
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  if (!synth) return;

  try {
    synth.cancel();
  } catch {}

  try {
    const u = new SpeechSynthesisUtterance(text);

    const { voice, effectiveLang } = resolveVoiceWithFallback(
      opts?.voiceId,
      opts?.lang || TTS_LANG
    );

    if (voice) u.voice = voice;

    // ✅ IMPORTANT : on parle dans la langue effectivement choisie (peut fallback en en-US)
    u.lang = effectiveLang;

    const isRobot =
      !!opts?.robot ||
      (!!opts?.voiceId && String(opts.voiceId).toLowerCase().includes("robot"));

    u.rate = opts?.rate ?? (isRobot ? 0.95 : 1.02);
    u.pitch = opts?.pitch ?? (isRobot ? 0.65 : 1.0);
    u.volume = clamp01(opts?.volume ?? VOLUME);

    synth.speak(u);
  } catch {}
}

// API publique
export function x01SpeakV3(
  text: string,
  opts?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceId?: string; // "male" | "female" | "robot" | voiceURI | name
    robot?: boolean;
    lang?: string; // langue app (ex: "fr", "it-IT", "en-US")
  }
) {
  dcSpeak(text, {
    voiceId: opts?.voiceId,
    robot: opts?.robot,
    rate: opts?.rate,
    pitch: opts?.pitch,
    volume: opts?.volume,
    lang: opts?.lang,
  });
}

export function announceVisit(
  playerName: string,
  visitScore: number,
  options?: { voiceId?: string; lang?: string }
) {
  const n = (playerName || "").trim();
  if (!n) return;

  const vid = options?.voiceId;

  dcSpeak(`${n}, ${visitScore}`, {
    voiceId: vid,
    robot: !!vid && String(vid).toLowerCase().includes("robot"),
    lang: options?.lang,
  });
}

export function announceEndGame(
  data: {
    winnerName: string;
    rankingNames: string[];
    extra?: string;
  },
  options?: { voiceId?: string; lang?: string }
) {
  const w = (data.winnerName || "").trim();
  const rk = (data.rankingNames || []).filter(Boolean);

  const parts: string[] = [];
  if (w) parts.push(`Victoire de ${w}.`);
  if (data.extra) parts.push(data.extra);

  if (rk.length) {
    const places = rk
      .slice(0, 6)
      .map((name, i) => `${i + 1}, ${name}`)
      .join(". ");
    parts.push(`Classement. ${places}.`);
  }

  const text = parts.join(" ").trim();
  if (!text) return;

  const vid = options?.voiceId;

  dcSpeak(text, {
    voiceId: vid,
    robot: !!vid && String(vid).toLowerCase().includes("robot"),
    lang: options?.lang,
  });
}


// ✅ Reuse the X01 victory jingle in other games (e.g. Golf)
export function playX01VictorySfx(volume: number = 0.9) {
  try {
    x01PlaySfxV3("victory", volume);
  } catch {
    // ignore
  }
}
