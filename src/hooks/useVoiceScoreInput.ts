// ============================================
// src/hooks/useVoiceScoreInput.ts
// Voice score input via Web Speech API
// - bouton MICRO explicite
// - dictée d'une volée complète ou de 3 fléchettes séparées
// - récapitulatif + confirmation oui/non
// ============================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseVoiceVisit, VoiceDart, formatDartLabel, sumDarts } from "../lib/voice/voiceScore";

type Phase =
  | "OFF"
  | "LISTEN_D1"
  | "LISTEN_D2"
  | "LISTEN_D3"
  | "RECAP_CONFIRM"
  | "MANUAL_FALLBACK"
  | "ERROR";

type ConfirmResult = "YES" | "NO" | null;

type UseVoiceScoreInputArgs = {
  enabled: boolean;
  lang: string; // ex: "fr-FR"

  // TTS : injecte ton speakText si tu veux.
  speak?: (text: string) => Promise<void> | void;

  // Nom joueur pour l'annonce (si announcePlayer = true)
  playerName?: string;

  // Par défaut false côté Darts Counter (car X01Play annonce déjà le tour)
  announcePlayer?: boolean;

  // Déclenché quand tour confirmé
  onCommit: (darts: VoiceDart[]) => void;

  // Si refus / non supporté : bascule en manuel
  onNeedManual?: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

function getSpeechRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function detectSpeechSupport() {
  return !!getSpeechRecognitionCtor();
}

function normalizeConfirmText(raw: string) {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function requestMicrophoneOnce(): Promise<string | null> {
  if (typeof navigator === "undefined") return null;
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getUserMedia) return null;

  try {
    const stream = await mediaDevices.getUserMedia({ audio: true });
    try {
      stream.getTracks?.().forEach((track) => track.stop());
    } catch {}
    return null;
  } catch (err: any) {
    return err?.name || err?.message || "micro_denied";
  }
}

export function useVoiceScoreInput(args: UseVoiceScoreInputArgs) {
  const {
    enabled,
    lang,
    speak,
    playerName,
    announcePlayer = false,
    onCommit,
    onNeedManual,
  } = args;

  const [phase, setPhase] = useState<Phase>("OFF");
  const [supported, setSupported] = useState<boolean>(() => detectSpeechSupport());
  const [permissionHint, setPermissionHint] = useState<string | null>(null);

  const [darts, setDarts] = useState<VoiceDart[]>([]);
  const [lastHeard, setLastHeard] = useState<string>("");
  const [confirm, setConfirm] = useState<ConfirmResult>(null);

  const recRef = useRef<any | null>(null);
  const listeningRef = useRef(false);
  const hardStopTimer = useRef<number | null>(null);
  const startingRef = useRef(false);

  const dartsLabel = useMemo(() => darts.map(formatDartLabel).join(", "), [darts]);
  const dartsTotal = useMemo(() => sumDarts(darts), [darts]);

  useEffect(() => {
    setSupported(detectSpeechSupport());
  }, []);

  const stopTimers = useCallback(() => {
    if (hardStopTimer.current) {
      window.clearTimeout(hardStopTimer.current);
      hardStopTimer.current = null;
    }
  }, []);

  const hardStop = useCallback(() => {
    stopTimers();
    listeningRef.current = false;
    startingRef.current = false;
    try {
      recRef.current?.stop?.();
    } catch {}
    recRef.current = null;
  }, [stopTimers]);

  const startRecognition = useCallback(
    (mode: "DART" | "CONFIRM") => {
      const Ctor = getSpeechRecognitionCtor();
      setSupported(!!Ctor);
      if (!Ctor) return false;

      try {
        try {
          recRef.current?.abort?.();
        } catch {}

        const rec = new Ctor();
        recRef.current = rec;

        rec.lang = lang || "fr-FR";
        rec.interimResults = false;
        rec.maxAlternatives = 3;
        rec.continuous = false;

        listeningRef.current = true;
        setPermissionHint(null);

        rec.onresult = (event: any) => {
          const result = event?.results?.[0];
          const alternatives = Array.from(result || []) as Array<{ transcript?: string }>;
          const text = alternatives.map((a) => a?.transcript || "").filter(Boolean).join(" | ") || result?.[0]?.transcript || "";
          const heard = String(text).trim();
          setLastHeard(heard);

          if (mode === "CONFIRM") {
            const t = normalizeConfirmText(heard);
            const yes =
              /\b(oui|ok|okay|valide|valider|confirme|confirmer|confirm|yes|yeah)\b/.test(t);
            const no =
              /\b(non|annule|annuler|corrige|corriger|modifier|no|stop)\b/.test(t);

            if (yes && !no) setConfirm("YES");
            else if (no && !yes) setConfirm("NO");
            else {
              setConfirm(null);
              setPermissionHint("confirmation_incomprise");
            }

            listeningRef.current = false;
            return;
          }

          // Le joueur peut dicter toute la volée d'un coup :
          // "triple vingt, simple cinq, miss".
          // Si un seul hit est reconnu, le hook écoute automatiquement D2 puis D3.
          const parsed = parseVoiceVisit(heard);
          if (parsed.length) {
            setDarts((prev) => [...prev, ...parsed].slice(0, 3));
            setPermissionHint(null);
          } else {
            setPermissionHint("volée_incomprise");
          }
          listeningRef.current = false;
        };

        rec.onerror = (e: any) => {
          listeningRef.current = false;
          const error = e?.error ? String(e.error) : "speech_error";
          setPermissionHint(error);
          setPhase("ERROR");
        };

        rec.onend = () => {
          listeningRef.current = false;
        };

        rec.start?.();

        // Timeout sécurité (si pas de résultat)
        stopTimers();
        hardStopTimer.current = window.setTimeout(() => {
          hardStop();
          setPermissionHint((prev) => prev || (mode === "CONFIRM" ? "confirmation_timeout" : "écoute_timeout"));
        }, mode === "CONFIRM" ? 6500 : 9000);

        return true;
      } catch (e: any) {
        const message = e?.name || e?.message || "init_failed";
        setPermissionHint(message);
        setPhase("ERROR");
        return false;
      }
    },
    [hardStop, lang, stopTimers]
  );

  const resetTurn = useCallback(() => {
    hardStop();
    setDarts([]);
    setLastHeard("");
    setConfirm(null);
    setPermissionHint(null);
    setPhase("OFF");
  }, [hardStop]);

  const beginTurn = useCallback(async () => {
    if (!enabled || startingRef.current) return;
    startingRef.current = true;

    const isSupportedNow = detectSpeechSupport();
    setSupported(isSupportedNow);
    if (!isSupportedNow) {
      startingRef.current = false;
      setPhase("MANUAL_FALLBACK");
      setPermissionHint("speech_recognition_not_supported");
      onNeedManual?.();
      return;
    }

    resetTurn();

    // Important : cette demande est déclenchée par le clic MICRO.
    // Elle ouvre enfin la permission micro navigateur, au lieu d'un démarrage auto bloqué.
    const micError = await requestMicrophoneOnce();
    if (micError) {
      startingRef.current = false;
      setPermissionHint(micError);
      setPhase("ERROR");
      onNeedManual?.();
      return;
    }

    if (announcePlayer) {
      const name = playerName ? `À toi, ${playerName}.` : "À toi.";
      try {
        await speak?.(name);
      } catch {}
    }

    setLastHeard("");
    setPhase("LISTEN_D1");
    const ok = startRecognition("DART");
    startingRef.current = false;
    if (!ok) {
      setPhase("MANUAL_FALLBACK");
      onNeedManual?.();
    }
  }, [announcePlayer, enabled, onNeedManual, playerName, resetTurn, speak, startRecognition]);

  // Avancer automatiquement après chaque dart reconnu, ou passer au récap si une volée complète a été dictée.
  useEffect(() => {
    if (!enabled) return;

    if (darts.length >= 3 && (phase === "LISTEN_D1" || phase === "LISTEN_D2" || phase === "LISTEN_D3")) {
      hardStop();
      setPhase("RECAP_CONFIRM");
      return;
    }

    if (darts.length === 1 && phase === "LISTEN_D1" && !listeningRef.current) {
      setPhase("LISTEN_D2");
      startRecognition("DART");
      return;
    }

    if (darts.length === 2 && phase === "LISTEN_D2" && !listeningRef.current) {
      setPhase("LISTEN_D3");
      startRecognition("DART");
    }
  }, [darts.length, enabled, phase, startRecognition, hardStop]);

  // Recap + confirmation
  useEffect(() => {
    if (!enabled) return;
    if (phase !== "RECAP_CONFIRM") return;

    let cancelled = false;
    (async () => {
      const recap = `J'ai compris : ${dartsLabel}. Total ${dartsTotal}. Confirmer ?`;
      try {
        await speak?.(recap);
      } catch {}

      if (cancelled) return;
      setConfirm(null);
      const ok = startRecognition("CONFIRM");
      if (!ok) {
        setPhase("MANUAL_FALLBACK");
        onNeedManual?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dartsLabel, dartsTotal, enabled, onNeedManual, phase, speak, startRecognition]);

  // Décision oui/non
  useEffect(() => {
    if (!enabled) return;
    if (phase !== "RECAP_CONFIRM") return;
    if (confirm === "YES") {
      onCommit(darts.slice(0, 3));
      setPhase("OFF");
      setDarts([]);
      setConfirm(null);
    }
    if (confirm === "NO") {
      setPhase("MANUAL_FALLBACK");
      onNeedManual?.();
    }
  }, [confirm, darts, enabled, onCommit, onNeedManual, phase]);

  const stop = useCallback(() => {
    hardStop();
    setPhase("OFF");
  }, [hardStop]);

  return {
    supported,
    phase,
    permissionHint,
    darts,
    lastHeard,
    dartsLabel,
    dartsTotal,
    beginTurn,
    resetTurn,
    stop,
  };
}
