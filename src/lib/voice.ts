// ============================================
// src/lib/voice.ts — Voix IA locale (Web Speech API)
// - Toggle global via setVoiceEnabled()
// - speak() safe (ignore si non supporté / désactivé)
// ============================================

import { isMasterAudioEnabled } from "./audioPreferences";
import { awenaTranslation } from "../awena/AwenaTranslation";
import { getUiLiteralSourceLanguage, translateUiLiteralWithBrowser } from "../i18n/uiLiteralSafety";

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

function baseSpeechLang(value?: string): string {
  const base = String(value || "fr").toLowerCase().split("-")[0];
  // App language code is `no`; Web Speech commonly exposes `nb-NO`.
  return base === "nb" ? "no" : base;
}

function speakNow(msg: string, opts?: SpeakOpts) {
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

export function speak(text: string, opts?: SpeakOpts) {
  if (!VOICE_ENABLED || !isMasterAudioEnabled()) return;
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const msg = String(text ?? "").trim();
  if (!msg) return;

  const sourceLanguage = getUiLiteralSourceLanguage(msg);
  const targetLanguage = baseSpeechLang(opts?.lang);

  // Some historical game announcements only authored FR/EN/ES copy. When one
  // of those fallbacks is registered by the i18n bridge, translate it before
  // speaking instead of reading French/English with a German/Japanese/etc.
  // voice. Existing already-localized announcements remain fully synchronous.
  if (sourceLanguage && targetLanguage && sourceLanguage !== targetLanguage) {
    void (async () => {
      let translated: string | null = null;
      try {
        if (awenaTranslation.isNativeAvailable()) {
          translated = await awenaTranslation.textBetween(msg, sourceLanguage, targetLanguage);
        } else {
          translated = await translateUiLiteralWithBrowser(msg, targetLanguage, sourceLanguage);
        }
      } catch {
        translated = null;
      }

      if (!VOICE_ENABLED || !isMasterAudioEnabled()) return;
      speakNow(String(translated || msg).trim(), opts);
    })();
    return;
  }

  speakNow(msg, opts);
}

// Helpers pratiques (Shanghai)
export function announceTurn(playerName: string) {
  speak(`${playerName}, à toi de jouer`);
}

export function announceVolleyScore(playerName: string, score: number) {
  speak(`${playerName}, ${score} points`);
}
