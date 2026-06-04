// ============================================
// src/hooks/useVoiceScoreInput.ts
// Saisie vocale X01 hit-par-hit.
// - 1 clic MICRO = écoute d'un hit attendu
// - le hit reconnu est injecté comme le keypad
// - après 3 hits : l’utilisateur valide avec le bouton VALIDER du keypad
// ============================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseVoiceVisit, VoiceDart, formatDartLabel, sumDarts } from "../lib/voice/voiceScore";

type Phase =
  | "OFF"
  | "REQUESTING_MIC"
  | "WAIT_D1"
  | "LISTEN_D1"
  | "WAIT_D2"
  | "LISTEN_D2"
  | "WAIT_D3"
  | "LISTEN_D3"
  | "WAIT_CONFIRM"
  | "LISTEN_CONFIRM"
  | "MANUAL_FALLBACK"
  | "ERROR";

type ConfirmResult = "YES" | "NO" | null;
type VoiceActivity =
  | "idle"
  | "waiting"
  | "requesting"
  | "recording"
  | "speech"
  | "heard"
  | "parsed"
  | "confirming"
  | "error";

type UseVoiceScoreInputArgs = {
  enabled: boolean;
  lang: string;
  speak?: (text: string) => Promise<void> | void;
  playerName?: string;
  announcePlayer?: boolean;

  /** Appelé quand une ou plusieurs fléchettes sont comprises : la page remplace la volée UI complète. */
  onVisitDarts?: (darts: VoiceDart[]) => void;

  /** Compat : appelé hit par hit seulement si onVisitDarts n'est pas fourni. */
  onDart?: (dart: VoiceDart, index: number) => void;

  /** Ancien callback conservé pour compat, non utilisé dans le flux bouton VALIDER. */
  onConfirmVisit?: (darts: VoiceDart[]) => void;

  /** Fallback historique : commit direct de la volée après confirmation. */
  onCommit?: (darts: VoiceDart[]) => void;
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

function waitPhaseForIndex(index: number): Phase {
  if (index <= 0) return "WAIT_D1";
  if (index === 1) return "WAIT_D2";
  if (index === 2) return "WAIT_D3";
  return "WAIT_CONFIRM";
}

function listenPhaseForIndex(index: number): Phase {
  if (index <= 0) return "LISTEN_D1";
  if (index === 1) return "LISTEN_D2";
  return "LISTEN_D3";
}

export function useVoiceScoreInput(args: UseVoiceScoreInputArgs) {
  const {
    enabled,
    lang,
    speak,
    playerName,
    announcePlayer = false,
    onVisitDarts,
    onDart,
    onConfirmVisit,
    onCommit,
    onNeedManual,
  } = args;

  const [phase, setPhase] = useState<Phase>("OFF");
  const [supported, setSupported] = useState<boolean>(() => detectSpeechSupport());
  const [permissionHint, setPermissionHint] = useState<string | null>(null);
  const [activity, setActivity] = useState<VoiceActivity>("idle");

  const [darts, setDarts] = useState<VoiceDart[]>([]);
  const [lastHeard, setLastHeard] = useState<string>("");
  const [confirm, setConfirm] = useState<ConfirmResult>(null);
  const [expectedIndex, setExpectedIndex] = useState(0);

  const phaseRef = useRef<Phase>("OFF");
  const expectedIndexRef = useRef(0);
  const dartsRef = useRef<VoiceDart[]>([]);
  const recRef = useRef<any | null>(null);
  const listeningRef = useRef(false);
  const hardStopTimer = useRef<number | null>(null);
  const startingRef = useRef(false);
  const micReadyRef = useRef(false);
  const ignoreAbortRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    expectedIndexRef.current = expectedIndex;
  }, [expectedIndex]);

  useEffect(() => {
    dartsRef.current = darts;
  }, [darts]);

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

  const stopRecognitionOnly = useCallback(() => {
    stopTimers();
    listeningRef.current = false;
    ignoreAbortRef.current = true;
    try {
      recRef.current?.stop?.();
    } catch {}
    recRef.current = null;
    window.setTimeout(() => {
      ignoreAbortRef.current = false;
    }, 80);
  }, [stopTimers]);

  const hardStop = useCallback(() => {
    stopRecognitionOnly();
    startingRef.current = false;
  }, [stopRecognitionOnly]);

  const startRecognition = useCallback(
    (mode: "DART" | "CONFIRM") => {
      const Ctor = getSpeechRecognitionCtor();
      setSupported(!!Ctor);
      if (!Ctor) return false;

      try {
        stopRecognitionOnly();

        const rec = new Ctor();
        recRef.current = rec;

        rec.lang = lang || "fr-FR";
        rec.interimResults = false;
        rec.maxAlternatives = 5;
        rec.continuous = false;

        listeningRef.current = true;
        setPermissionHint(null);
        setActivity(mode === "CONFIRM" ? "confirming" : "recording");

        rec.onstart = () => {
          listeningRef.current = true;
          setActivity(mode === "CONFIRM" ? "confirming" : "recording");
          setPermissionHint(null);
        };

        rec.onaudiostart = () => {
          setActivity(mode === "CONFIRM" ? "confirming" : "recording");
        };

        rec.onsoundstart = () => setActivity("speech");
        rec.onspeechstart = () => setActivity("speech");

        rec.onresult = (event: any) => {
          const result = event?.results?.[0];
          const alternatives = Array.from(result || []) as Array<{ transcript?: string }>;
          const heard =
            alternatives.map((a) => a?.transcript || "").filter(Boolean).join(" | ") ||
            result?.[0]?.transcript ||
            "";
          const text = String(heard).trim();
          setLastHeard(text);
          setActivity("heard");

          if (mode === "CONFIRM") {
            const t = normalizeConfirmText(text);
            const yes = /\b(oui|ok|okay|valide|valider|valides|confirme|confirmer|confirm|yes|yeah|go)\b/.test(t);
            const no = /\b(non|annule|annuler|corrige|corriger|modifier|no|stop|cancel)\b/.test(t);

            if (yes && !no) {
              setActivity("parsed");
              setConfirm("YES");
            } else if (no && !yes) {
              setActivity("parsed");
              setConfirm("NO");
            } else {
              setConfirm(null);
              setPermissionHint("confirmation_incomprise");
              setActivity("error");
              setPhase("WAIT_CONFIRM");
            }

            listeningRef.current = false;
            return;
          }

          const parsed = parseVoiceVisit(text);
          if (parsed.length) {
            const index = Math.max(0, Math.min(expectedIndexRef.current, 2));
            const slotsLeft = Math.max(0, 3 - index);
            const accepted = parsed.slice(0, slotsLeft);
            const next = [...dartsRef.current.slice(0, index), ...accepted].slice(0, 3);

            dartsRef.current = next;
            setDarts(next);
            setExpectedIndex(next.length >= 3 ? 3 : next.length);
            setPermissionHint(null);
            setActivity("parsed");
            listeningRef.current = false;

            try {
              if (onVisitDarts) {
                onVisitDarts(next);
              } else {
                accepted.forEach((dart, offset) => onDart?.(dart, index + offset));
              }
            } catch (err) {
              console.warn("[voice] visit injection failed", err);
            }

            if (next.length >= 3) {
              setPhase("WAIT_CONFIRM");
              setPermissionHint("volée_prête_valider");
              try {
                speak?.(`Volée complète : ${next.map(formatDartLabel).join(", ")}. Clique sur valider.`);
              } catch {}
            } else {
              setPhase(waitPhaseForIndex(next.length));
              setPermissionHint(`hit_${next.length + 1}_attendu`);
            }
          } else {
            setPermissionHint("hit_incompris");
            setActivity("error");
            setPhase(waitPhaseForIndex(expectedIndexRef.current));
          }
        };

        rec.onerror = (e: any) => {
          listeningRef.current = false;
          const error = e?.error ? String(e.error) : "speech_error";

          // Chrome renvoie souvent "aborted" quand on stoppe/remplace une écoute.
          // Ce n'est pas une erreur utilisateur et ne doit pas casser le flux.
          if (error === "aborted" || ignoreAbortRef.current) {
            setActivity(expectedIndexRef.current >= 3 ? "confirming" : "waiting");
            setPhase(mode === "CONFIRM" ? "WAIT_CONFIRM" : waitPhaseForIndex(expectedIndexRef.current));
            return;
          }

          setPermissionHint(error);
          setActivity("error");
          setPhase(mode === "CONFIRM" ? "WAIT_CONFIRM" : waitPhaseForIndex(expectedIndexRef.current));
        };

        rec.onend = () => {
          listeningRef.current = false;
        };

        rec.start?.();

        stopTimers();
        hardStopTimer.current = window.setTimeout(() => {
          stopRecognitionOnly();
          setPermissionHint((prev) => prev || (mode === "CONFIRM" ? "confirmation_timeout" : "écoute_timeout"));
          setActivity("error");
          setPhase(mode === "CONFIRM" ? "WAIT_CONFIRM" : waitPhaseForIndex(expectedIndexRef.current));
        }, mode === "CONFIRM" ? 7000 : 8500);

        return true;
      } catch (e: any) {
        const message = e?.name || e?.message || "init_failed";
        setPermissionHint(message);
        setActivity("error");
        setPhase(mode === "CONFIRM" ? "WAIT_CONFIRM" : waitPhaseForIndex(expectedIndexRef.current));
        return false;
      }
    },
    [lang, onDart, onVisitDarts, speak, stopRecognitionOnly, stopTimers]
  );

  const resetTurn = useCallback(() => {
    hardStop();
    dartsRef.current = [];
    expectedIndexRef.current = 0;
    setDarts([]);
    setExpectedIndex(0);
    setLastHeard("");
    setConfirm(null);
    setPermissionHint(null);
    setActivity("idle");
    setPhase("OFF");
  }, [hardStop]);

  const beginTurn = useCallback(async () => {
    if (startingRef.current) return;

    if (!enabled) {
      setPhase("ERROR");
      setActivity("error");
      setPermissionHint("commande_vocale_inactive");
      onNeedManual?.();
      return;
    }

    const currentPhase = phaseRef.current;
    const wantsConfirm = currentPhase === "WAIT_CONFIRM" || expectedIndexRef.current >= 3;

    startingRef.current = true;
    setPermissionHint(null);

    const isSupportedNow = detectSpeechSupport();
    setSupported(isSupportedNow);
    if (!isSupportedNow) {
      startingRef.current = false;
      setPhase("MANUAL_FALLBACK");
      setActivity("error");
      setPermissionHint("speech_recognition_not_supported");
      onNeedManual?.();
      return;
    }

    if (!micReadyRef.current) {
      setPhase("REQUESTING_MIC");
      setActivity("requesting");
      setPermissionHint("autorisation_micro");
      const micError = await requestMicrophoneOnce();
      if (micError) {
        startingRef.current = false;
        setPermissionHint(micError);
        setActivity("error");
        setPhase("ERROR");
        onNeedManual?.();
        return;
      }
      micReadyRef.current = true;
    }

    if (currentPhase === "OFF" || currentPhase === "ERROR" || currentPhase === "MANUAL_FALLBACK") {
      dartsRef.current = [];
      expectedIndexRef.current = 0;
      setDarts([]);
      setExpectedIndex(0);
      setConfirm(null);
      setLastHeard("");
      if (announcePlayer) {
        const name = playerName ? `À toi, ${playerName}.` : "À toi.";
        try {
          await speak?.(name);
        } catch {}
      }
    }

    setLastHeard("");

    if (wantsConfirm) {
      // La validation finale ne se fait plus au micro : les 3 hits sont déjà
      // dans le keypad, donc on laisse l'utilisateur appuyer sur VALIDER.
      setPhase("WAIT_CONFIRM");
      setActivity("parsed");
      setPermissionHint("volée_prête_valider");
      startingRef.current = false;
      return;
    }

    const index = Math.max(0, Math.min(expectedIndexRef.current, 2));
    setPhase(listenPhaseForIndex(index));
    setActivity("recording");
    const ok = startRecognition("DART");
    startingRef.current = false;
    if (!ok) {
      setPhase(waitPhaseForIndex(index));
      setActivity("error");
      onNeedManual?.();
    }
  }, [announcePlayer, enabled, onNeedManual, playerName, speak, startRecognition]);

  useEffect(() => {
    if (phase !== "WAIT_CONFIRM") return;
    if (confirm === "YES") {
      const finalDarts = dartsRef.current.slice(0, 3);
      try {
        if (onConfirmVisit) onConfirmVisit(finalDarts);
        else onCommit?.(finalDarts);
      } catch (err) {
        console.warn("[voice] confirm failed", err);
      }
      setConfirm(null);
      setPhase("OFF");
      setActivity("idle");
      setDarts([]);
      setExpectedIndex(0);
      dartsRef.current = [];
      expectedIndexRef.current = 0;
      return;
    }
    if (confirm === "NO") {
      setConfirm(null);
      setPhase("MANUAL_FALLBACK");
      setActivity("idle");
      onNeedManual?.();
    }
  }, [confirm, onCommit, onConfirmVisit, onNeedManual, phase]);

  const stop = useCallback(() => {
    hardStop();
    setActivity("idle");
    setPhase(waitPhaseForIndex(expectedIndexRef.current));
  }, [hardStop]);

  return {
    supported,
    phase,
    activity,
    permissionHint,
    darts,
    lastHeard,
    dartsLabel,
    dartsTotal,
    expectedIndex,
    awaitingConfirm: phase === "WAIT_CONFIRM" || phase === "LISTEN_CONFIRM",
    beginTurn,
    resetTurn,
    stop,
  };
}
