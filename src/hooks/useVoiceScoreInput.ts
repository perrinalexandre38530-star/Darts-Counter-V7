// ============================================
// src/hooks/useVoiceScoreInput.ts
// MVP Voice score input via Web Speech API
// - 3 fléchettes + recap + confirmation oui/non
// - Fallback manuel si API/permission non dispo
// ============================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseVoiceDart, VoiceDart, formatDartLabel, sumDarts } from "../lib/voice/voiceScore";

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
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
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
  const [supported, setSupported] = useState<boolean>(false);
  const [permissionHint, setPermissionHint] = useState<string | null>(null);

  const [darts, setDarts] = useState<VoiceDart[]>([]);
  const [lastHeard, setLastHeard] = useState<string>("");
  const [confirm, setConfirm] = useState<ConfirmResult>(null);

  const recRef = useRef<any | null>(null);
  const listeningRef = useRef(false);
  const hardStopTimer = useRef<number | null>(null);

  const dartsLabel = useMemo(() => darts.map(formatDartLabel).join(", "), [darts]);
  const dartsTotal = useMemo(() => sumDarts(darts), [darts]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!getSpeechRecognitionCtor());
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
    try {
      recRef.current?.stop?.();
    } catch {}
  }, [stopTimers]);

  const startRecognition = useCallback(
    (mode: "DART" | "CONFIRM") => {
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) return false;

      try {
        const rec = new Ctor();
        recRef.current = rec;

        rec.lang = lang || "fr-FR";
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = false;

        listeningRef.current = true;

        rec.onresult = (event: any) => {
          const text = event?.results?.[0]?.[0]?.transcript || "";
          const norm = String(text).trim();
          setLastHeard(norm);

          if (mode === "CONFIRM") {
            const t = norm.toLowerCase();
            const yes =
              t.includes("oui") ||
              t.includes("confirme") ||
              t.includes("confirmer") ||
              t.includes("confirm") ||
              t.includes("yes");
            const no =
              t.includes("non") ||
              t.includes("annule") ||
              t.includes("corrige") ||
              t.includes("modifier") ||
              t.includes("no");

            if (yes && !no) setConfirm("YES");
            else if (no && !yes) setConfirm("NO");
            else setConfirm(null);

            listeningRef.current = false;
            return;
          }

          const dart = parseVoiceDart(norm);
          if (dart) setDarts((prev) => [...prev, dart].slice(0, 3));
          listeningRef.current = false;
        };

        rec.onerror = (e: any) => {
          listeningRef.current = false;
          setPermissionHint(e?.error ? String(e.error) : "speech_error");
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
        }, mode === "CONFIRM" ? 4500 : 6500);

        return true;
      } catch {
        setPermissionHint("init_failed");
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
  }, [hardStop]);

  const beginTurn = useCallback(async () => {
    if (!enabled) return;
    if (!supported) {
      setPhase("MANUAL_FALLBACK");
      onNeedManual?.();
      return;
    }

    resetTurn();

    if (announcePlayer) {
      const name = playerName ? `À toi, ${playerName}.` : "À toi.";
      try {
        await speak?.(name);
      } catch {}
    }

    setPhase("LISTEN_D1");
    const ok = startRecognition("DART");
    if (!ok) {
      setPhase("MANUAL_FALLBACK");
      onNeedManual?.();
    }
  }, [announcePlayer, enabled, onNeedManual, playerName, resetTurn, speak, startRecognition, supported]);

  // Avancer automatiquement après chaque dart reconnu (ou timeout)
  useEffect(() => {
    if (!enabled) return;

    if (darts.length === 1 && phase === "LISTEN_D1" && !listeningRef.current) {
      setPhase("LISTEN_D2");
      startRecognition("DART");
    }

    if (darts.length === 2 && phase === "LISTEN_D2" && !listeningRef.current) {
      setPhase("LISTEN_D3");
      startRecognition("DART");
    }

    if (darts.length === 3 && phase === "LISTEN_D3") {
      hardStop();
      setPhase("RECAP_CONFIRM");
    }
  }, [darts.length, enabled, phase, startRecognition, hardStop]);

  // Recap + confirmation
  useEffect(() => {
    if (!enabled) return;
    if (phase !== "RECAP_CONFIRM") return;

    (async () => {
      const recap = `J'ai compris : ${dartsLabel}. Total ${dartsTotal}. Confirmer ?`;
      try {
        await speak?.(recap);
      } catch {}

      setConfirm(null);
      const ok = startRecognition("CONFIRM");
      if (!ok) {
        setPhase("MANUAL_FALLBACK");
        onNeedManual?.();
      }
    })();
  }, [dartsLabel, dartsTotal, enabled, onNeedManual, phase, speak, startRecognition]);

  // Décision oui/non
  useEffect(() => {
    if (!enabled) return;
    if (phase !== "RECAP_CONFIRM") return;
    if (confirm === "YES") {
      onCommit(darts);
      setPhase("OFF");
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
