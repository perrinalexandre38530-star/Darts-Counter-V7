// ============================================
// src/x01/helpers.ts
// Helpers UI + calculs légers (purs, sans état React)
// ============================================
import type React from "react";
import type { Dart as UIDart } from "../lib/types";

/* ---------- Valeurs fléchettes & règles ---------- */
export function dartValue(d: UIDart): number {
  if (!d) return 0;
  if (d.v === 25 && d.mult === 2) return 50;
  return d.v * d.mult;
}
export function isDoubleFinish(darts: UIDart[]): boolean {
  const last = darts[darts.length - 1];
  if (!last) return false;
  if (last.v === 25 && last.mult === 2) return true; // DBULL
  return last.mult === 2;
}

/* ---------- LocalStorage safe ---------- */
export function safeGetLocalStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/* ---------- Audio safe ---------- */
export function createAudio(urls: string[]) {
  try {
    const a = new Audio();
    const pick = urls.find((u) => {
      const ext = u.split(".").pop() || "";
      const mime = ext === "mp3" ? "audio/mpeg" : ext === "ogg" ? "audio/ogg" : "";
      return !!a.canPlayType(mime);
    });
    if (pick) a.src = pick;
    return a;
  } catch {
    return {
      play: () => Promise.reject(),
      pause: () => {},
      currentTime: 0,
      loop: false,
      volume: 1,
    } as any;
  }
}

/* ---------- Format pastilles ---------- */
export function fmt(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const prefix = d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S";
  return `${prefix}${d.v}`;
}
export function chipStyle(
  d?: UIDart,
  red = false
): React.CSSProperties {
  if (!d)
    return {
      background: "rgba(255,255,255,.06)",
      color: "#bbb",
      border: "1px solid rgba(255,255,255,.08)",
    };
  if (red)
    return {
      background: "rgba(200,30,30,.18)",
      color: "#ff8a8a",
      border: "1px solid rgba(255,80,80,.35)",
    };
  if (d.v === 25 && d.mult === 2)
    return {
      background: "rgba(13,160,98,.18)",
      color: "#8ee6bf",
      border: "1px solid rgba(13,160,98,.35)",
    };
  if (d.v === 25)
    return {
      background: "rgba(13,160,98,.12)",
      color: "#7bd6b0",
      border: "1px solid rgba(13,160,98,.3)",
    };
  if (d.mult === 3)
    return {
      background: "rgba(179,68,151,.18)",
      color: "#ffd0ff",
      border: "1px solid rgba(179,68,151,.35)",
    };
  if (d.mult === 2)
    return {
      background: "rgba(46,150,193,.18)",
      color: "#cfeaff",
      border: "1px solid rgba(46,150,193,.35)",
    };
  return {
    background: "rgba(255,187,51,.12)",
    color: "#ffc63a",
    border: "1px solid rgba(255,187,51,.4)",
  };
}

/* ---------- Checkout simple (même logique) ---------- */
const SINGLE_SET = new Set<number>([...Array(20).keys()].map((n) => n + 1).concat([25, 50]));
export function suggestCheckout(
  rest: number,
  doubleOut: boolean,
  dartsLeft: 1 | 2 | 3
): string[] {
  if (rest < 2 || rest > 170) return [];
  if (dartsLeft === 1) {
    if (doubleOut) {
      if (rest === 50) return ["DBULL"];
      if (rest % 2 === 0 && rest / 2 >= 1 && rest / 2 <= 20) return [`D${rest / 2}`];
      return [];
    } else {
      if (SINGLE_SET.has(rest)) return [rest === 50 ? "BULL" : rest === 25 ? "25" : `S${rest}`];
      return [];
    }
  }
  const res: string[] = [];
  const push = (s: string) => res.push(s);
  if (!doubleOut) {
    if (rest <= 50 && SINGLE_SET.has(rest)) push(rest === 50 ? "BULL" : rest === 25 ? "25" : `S${rest}`);
    const tryTwo = (label: string, pts: number) => {
      const r = rest - pts;
      if (SINGLE_SET.has(r)) push(`${label} S${r}`);
    };
    tryTwo("T20", 60);
    tryTwo("T19", 57);
    tryTwo("T18", 54);
    tryTwo("50", 50);
    tryTwo("25", 25);
  } else {
    const map: Record<number, string> = {
      170: "T20 T20 D25", 167: "T20 T19 D25", 164: "T20 T18 D25", 161: "T20 T17 D25",
      160: "T20 T20 D20", 158: "T20 T20 D19", 157: "T20 T19 D20", 156: "T20 T20 D18",
      155: "T20 T19 D19", 154: "T20 T18 D20", 153: "T20 T19 D18", 152: "T20 T20 D16",
      151: "T20 T17 D20", 150: "T20 T18 D18", 140: "T20 T20 D10", 139: "T20 T13 D20",
      138: "T20 T18 D12", 137: "T20 T15 D16", 136: "T20 T20 D8", 135: "T20 T17 D12",
      130: "T20 T18 D8", 129: "T19 T16 D12", 128: "T18 T14 D16", 127: "T20 T17 D8",
      126: "T19 T19 D6", 125: "25 T20 D20", 124: "T20 T16 D8", 123: "T19 T16 D9",
      122: "T18 T18 D7", 121: "T20 11 D25", 120: "T20 D20", 119: "T19 10 D25",
      118: "T20 18 D20", 117: "T20 17 D20", 116: "T20 16 D20", 115: "T20 15 D20",
      110: "T20 10 D20", 109: "T20 9 D20", 108: "T20 16 D16", 107: "T19 18 D16",
      101: "T20 9 D16", 100: "T20 D20", 99: "T19 10 D16", 98: "T20 D19", 97: "T19 D20",
      96: "T20 D18", 95: "T19 D19", 94: "T18 D20", 93: "T19 D18", 92: "T20 D16",
      91: "T17 D20", 90: "T18 D18", 89: "T19 D16", 88: "T16 D20", 87: "T17 D18",
      86: "T18 D16", 85: "T15 D20", 84: "T16 D18", 83: "T17 D16", 82: "BULL D16",
      81: "T15 D18", 80: "T20 D10", 79: "T19 D11", 78: "T18 D12", 77: "T19 D10",
      76: "T20 D8", 75: "T17 D12", 74: "T14 D16", 73: "T19 D8", 72: "T16 D12",
      71: "T13 D16", 70: "T20 D5",
    };
    const best = map[rest];
    if (best && best.split(" ").length <= dartsLeft) res.push(best);
  }
  return res.slice(0, 1);
}

/* ---------- Mini pourcentages ---------- */
export const pct = (num: number, den: number) =>
  den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
