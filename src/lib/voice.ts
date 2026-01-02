// ============================================
// src/lib/voice.ts — Voix IA locale (Web Speech API)
// - Toggle global via setVoiceEnabled()
// - speak() safe (ignore si non supporté / désactivé)
// ============================================

let VOICE_ENABLED = true;

export function setVoiceEnabled(v: boolean) {
  VOICE_ENABLED = !!v;
  // si on désactive, on stoppe tout de suite les phrases en cours
  try {
    if (!VOICE_ENABLED && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
}

type SpeakOpts = {
  lang?: string; // default fr-FR
  rate?: number; // 0.1..10 (default 0.95)
  pitch?: number; // 0..2 (default 1)
  volume?: number; // 0..1 (default 1)
  interrupt?: boolean; // cancel avant de parler (default true)
};

export function speak(text: string, opts?: SpeakOpts) {
  if (!VOICE_ENABLED) return;
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const msg = String(text ?? "").trim();
  if (!msg) return;

  try {
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = opts?.lang ?? "fr-FR";
    u.rate = opts?.rate ?? 0.95;
    u.pitch = opts?.pitch ?? 1.0;
    u.volume = opts?.volume ?? 1.0;

    if (opts?.interrupt !== false) {
      window.speechSynthesis.cancel();
    }
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

// Helpers pratiques (Shanghai)
export function announceTurn(playerName: string) {
  speak(`${playerName}, à toi de jouer`);
}

export function announceVolleyScore(playerName: string, score: number) {
  speak(`${playerName}, ${score} points`);
}
