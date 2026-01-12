// src/lib/killerVoice.ts
// Global Killer Voice Engine (customizable via Settings > Audio, stored in localStorage)
//
// Categories:
// - hit: "{killer} a touché {victim}."
// - self: "{killer} s'est auto touché."
// - autokill: "{killer} vient de s'auto éliminer."
//
// Variables: {killer}, {victim}

export type KillerVoiceKind = "hit" | "self" | "autokill";

const LS_ENABLED = "killer_voice_enabled";
const LS_DELAY = "killer_voice_delay_ms";
const LS_PHRASES = "killer_voice_phrases_v1";

const DEFAULT_DELAY = 2300;
const COOLDOWN_MS = 1400;

const DEFAULTS: Record<KillerVoiceKind, string[]> = {
  hit: [
    "{killer} a touché {victim}.",
    "{victim} encaisse un tir de {killer}.",
    "{killer} vient de shooter {victim}.",
    "Touché. {victim} prend un tir de {killer}.",
  ],
  self: [
    "Oups… {killer} s’est auto touché.",
    "{killer} se sanctionne tout seul.",
    "Erreur. {killer} se touche.",
  ],
  autokill: [
    "{killer} vient de s’auto éliminer.",
    "Auto-kill pour {killer}.",
    "Fin de parcours pour {killer}.",
  ],
};

let lastLine = "";
let lastAt = 0;

function safeParse<T>(raw: string | null): T | null {
  try {
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getEnabled(): boolean {
  const v = localStorage.getItem(LS_ENABLED);
  if (v === null) return true; // default ON
  return v !== "false";
}

function getDelay(): number {
  const n = Number(localStorage.getItem(LS_DELAY));
  if (!Number.isFinite(n) || n < 0) return DEFAULT_DELAY;
  return Math.max(0, Math.min(5000, n));
}

function getPhrases(): Record<KillerVoiceKind, string[]> {
  const obj = safeParse<any>(localStorage.getItem(LS_PHRASES));
  const out: any = { ...DEFAULTS };
  if (obj && typeof obj === "object") {
    (["hit", "self", "autokill"] as KillerVoiceKind[]).forEach((k) => {
      const arr = obj[k];
      if (Array.isArray(arr)) {
        out[k] = arr
          .map((s: any) => String(s ?? "").trim())
          .filter((s: string) => s.length > 0);
      }
    });
  }
  return out;
}

function render(tpl: string, vars: { killer: string; victim?: string }) {
  return tpl
    .replaceAll("{killer}", vars.killer || "Joueur")
    .replaceAll("{victim}", vars.victim || "");
}

function pickNonRepeating(list: string[]) {
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  let next = list[Math.floor(Math.random() * list.length)];
  let tries = 6;
  while (tries-- > 0 && next === lastLine) {
    next = list[Math.floor(Math.random() * list.length)];
  }
  lastLine = next;
  return next;
}

export function speakKiller(kind: KillerVoiceKind, vars: { killer: string; victim?: string }) {
  try {
    if (typeof window === "undefined") return;
    if (!getEnabled()) return;
    const synth = (window as any).speechSynthesis;
    if (!synth) return;

    const now = Date.now();
    if (now - lastAt < COOLDOWN_MS) return;
    lastAt = now;

    const phrases = getPhrases();
    const pool = phrases[kind] || [];
    const tpl = pickNonRepeating(pool);
    const text = render(tpl, vars).trim();
    if (!text) return;

    const delay = getDelay();
    setTimeout(() => {
      try {
        // If another utterance is active, we replace it (keeps it snappy during play)
        synth.cancel?.();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "fr-FR";
        u.rate = 1.0;
        u.pitch = 1.0;
        synth.speak(u);
      } catch {}
    }, delay);
  } catch {}
}

// Settings helpers (optional)
export function getKillerVoiceSettings() {
  return {
    enabled: getEnabled(),
    delayMs: getDelay(),
    phrases: getPhrases(),
  };
}

export function setKillerVoiceSettings(next: { enabled?: boolean; delayMs?: number; phrases?: any }) {
  if (typeof next.enabled === "boolean") localStorage.setItem(LS_ENABLED, String(next.enabled));
  if (typeof next.delayMs === "number") localStorage.setItem(LS_DELAY, String(next.delayMs));
  if (next.phrases) localStorage.setItem(LS_PHRASES, JSON.stringify(next.phrases));
}
