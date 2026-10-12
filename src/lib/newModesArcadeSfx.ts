// @ts-nocheck
import type { Dart as UIDart } from "./types";

const cache = new Map<string, HTMLAudioElement>();
const sources: Record<string, string> = {
  simple: "/sounds/simple.mp3",
  double: "/sounds/double.mp3",
  triple: "/sounds/triple.mp3",
  miss: "/sounds/challenge/miss.mp3",
  intro: "/sounds/challenge/intro.mp3",
  victory: "/sounds/challenge/end-game.mp3",
};

function audioFor(key: string) {
  if (typeof Audio === "undefined") return null;
  const src = sources[key];
  if (!src) return null;
  let a = cache.get(key);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    cache.set(key, a);
  }
  return a;
}

export async function unlockNewModeAudio() {
  try {
    const a = audioFor("simple");
    if (!a) return;
    a.volume = 0;
    await a.play();
    a.pause();
    a.currentTime = 0;
    a.volume = .72;
  } catch {}
}

export function playNewModeSfx(key: "simple"|"double"|"triple"|"miss"|"intro"|"victory", enabled = true, restart = true) {
  if (!enabled) return;
  try {
    const base = audioFor(key);
    if (!base) return;
    const a = base.cloneNode(true) as HTMLAudioElement;
    a.volume = key === "intro" || key === "victory" ? .62 : .72;
    if (restart) a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {}
}

export function playNewModeDartSfx(d: UIDart | any, enabled = true) {
  if (!enabled) return;
  const v = Number(d?.v ?? d?.number ?? 0);
  const mult = Number(d?.mult || (d?.bed === "T" ? 3 : d?.bed === "D" ? 2 : 1));
  const bed = String(d?.bed || "");
  if (!d || v === 0 || bed === "MISS") return playNewModeSfx("miss", enabled);
  if (mult === 3 || bed === "T") return playNewModeSfx("triple", enabled);
  if (mult === 2 || bed === "D" || bed === "IB") return playNewModeSfx("double", enabled);
  return playNewModeSfx("simple", enabled);
}

export function playNewModeDartSequence(darts: any[], enabled = true, spacing = 145) {
  if (!enabled) return 0;
  (darts || []).forEach((d, i) => window.setTimeout(() => playNewModeDartSfx(d, true), i * spacing));
  return Math.max(0, ((darts || []).length - 1) * spacing);
}
