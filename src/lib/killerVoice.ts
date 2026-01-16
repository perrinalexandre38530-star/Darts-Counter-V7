// src/lib/killerVoice.ts
// Global: customizable Killer TTS (Settings > Audio)

export type KillerVoiceKind = "hit" | "self" | "autokill";

const LS_ENABLED = "killer_voice_enabled";
const LS_DELAY = "killer_voice_delay_ms";
const LS_PHRASES = "killer_voice_phrases_v1";

const DEFAULT_DELAY = 2300;

const DEFAULT_PHRASES: Record<KillerVoiceKind, string[]> = {
  hit: [
    "{killer} a touché {victim}.",
    "{victim} encaisse un tir de {killer}.",
    "{killer} vient de shooter {victim}.",
    "{victim} prend un tir de {killer}.",
  ],
  self: [
    "Oups… {killer} s’est auto touché.",
    "{killer} se sanctionne tout seul.",
    "Auto-hit pour {killer}.",
  ],
  autokill: [
    "{killer} vient de s’auto éliminer.",
    "Auto-kill pour {killer}.",
    "C’est terminé pour {killer}.",
  ],
};

let lastLine = "";
let lastAt = 0;

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function renderTpl(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function pickNonRepeating(arr: string[]) {
  if (!arr.length) return "";
  if (arr.length === 1) return arr[0];
  let next = arr[Math.floor(Math.random() * arr.length)];
  let tries = 8;
  while (tries-- > 0 && next === lastLine) {
    next = arr[Math.floor(Math.random() * arr.length)];
  }
  lastLine = next;
  return next;
}

export function getKillerVoiceEnabled(): boolean {
  return localStorage.getItem(LS_ENABLED) !== "false";
}

export function getKillerVoiceDelay(): number {
  const n = Number(localStorage.getItem(LS_DELAY) || DEFAULT_DELAY);
  return Number.isFinite(n) ? Math.max(0, n) : DEFAULT_DELAY;
}

export function getKillerVoicePhrases(): Record<KillerVoiceKind, string[]> {
  const obj = safeParse<Record<string, any>>(localStorage.getItem(LS_PHRASES), {});
  return {
    hit: Array.isArray(obj.hit) ? obj.hit.filter(Boolean) : DEFAULT_PHRASES.hit,
    self: Array.isArray(obj.self) ? obj.self.filter(Boolean) : DEFAULT_PHRASES.self,
    autokill: Array.isArray(obj.autokill) ? obj.autokill.filter(Boolean) : DEFAULT_PHRASES.autokill,
  };
}

export function setKillerVoicePhrases(p: Record<KillerVoiceKind, string[]>) {
  localStorage.setItem(LS_PHRASES, JSON.stringify(p));
}

export function speakKiller(kind: KillerVoiceKind, vars: { killer: string; victim?: string }) {
  if (typeof window === "undefined") return;
  const synth = (window as any).speechSynthesis as SpeechSynthesis | undefined;
  if (!synth) return;
  if (!getKillerVoiceEnabled()) return;

  const now = Date.now();
  if (now - lastAt < 1200) return;
  lastAt = now;

  const delay = getKillerVoiceDelay();
  const phrases = getKillerVoicePhrases();
  const pool = phrases[kind] || DEFAULT_PHRASES[kind] || [];
  const tpl = pickNonRepeating(pool);
  const text = renderTpl(tpl, {
    killer: vars.killer || "Joueur",
    victim: vars.victim || "",
  }).trim();
  if (!text) return;

  setTimeout(() => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      u.rate = 1.0;
      u.pitch = 1.0;
      synth.cancel();
      synth.speak(u);
    } catch {}
  }, delay);
}
