import React from "react";
import { useAudio } from "../contexts/AudioContext";
import { useAwenaOptional } from "../awena/AwenaProvider";
import multisportsScoringNav from "../assets/audio/navigation/multisports_scoring_nav.m4a";
import msamstpNav from "../assets/audio/navigation/msamstp_nav.m4a";
import msElectrodynNav from "../assets/audio/navigation/ms_electrodyn_nav.m4a";
import msElectrodyn2Nav from "../assets/audio/navigation/ms_electrodyn_2_nav.m4a";

type NavigationMusicZone = "navigation" | null;

const TRACKS = [
  multisportsScoringNav,
  msamstpNav,
  msElectrodynNav,
  msElectrodyn2Nav,
] as const;

// Les masters sont normalisés autour de -17/-18 LUFS. On garde ensuite un
// volume de navigation volontairement bas pour que la musique habille l'app
// sans fatiguer l'oreille ni concurrencer les voix / SFX.
const NAV_VOLUME = 0.22;
const AWENA_DUCK_VOLUME = 0.055;

// La musique couvre désormais toute la navigation de l'application. Seuls les
// écrans où une partie / un entraînement est réellement en cours sont exclus.
const GAMEPLAY_ROUTE_ALIASES = new Set([
  "x01",
  "cricket",
  "x01_device_camera",
  "training_clock",
  "training_mode",
  "pingpong_training",
  "petanque_tournament_match_score",
]);

export function isNavigationGameplayRoute(routeLike: unknown): boolean {
  const route = String(routeLike || "").trim().toLowerCase();
  if (!route) return false;
  return (
    route.endsWith("_play") ||
    route.endsWith(".play") ||
    GAMEPLAY_ROUTE_ALIASES.has(route)
  );
}

export function navigationMusicZoneForRoute(routeLike: unknown): NavigationMusicZone {
  const route = String(routeLike || "").trim().toLowerCase();
  if (!route || isNavigationGameplayRoute(route)) return null;
  return "navigation";
}

export function createRandomTrackOrder(trackCount: number, avoidFirstIndex = -1): number[] {
  const safeCount = Math.max(0, Math.floor(trackCount));
  const order = Array.from({ length: safeCount }, (_, index) => index);

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  // À chaque nouveau cycle, on évite que le dernier morceau du cycle précédent
  // soit immédiatement rejoué. Les quatre pistes passent une fois avant mélange.
  if (order.length > 1 && order[0] === avoidFirstIndex) {
    const swapIndex = 1 + Math.floor(Math.random() * (order.length - 1));
    [order[0], order[swapIndex]] = [order[swapIndex], order[0]];
  }

  return order;
}

function isAudibleVideo(target: EventTarget | null): target is HTMLVideoElement {
  if (!(target instanceof HTMLVideoElement)) return false;
  return !target.muted && Number(target.volume ?? 1) > 0;
}

/**
 * Ambiance musicale persistante sur toutes les pages hors gameplay.
 *
 * Règles :
 * - toute la navigation partage la même session et conserve le timestamp ;
 * - lancement gameplay : arrêt + remise à zéro ;
 * - retour depuis une partie : nouvelle playlist aléatoire depuis le début ;
 * - Awena parle : la piste continue mais est fortement duckée ;
 * - vidéo audible : pause exacte, puis reprise au même timestamp après fermeture/fin.
 */
export default function NavigationBackgroundMusic({ route }: { route: string }) {
  const { muted } = useAudio();
  const awena = useAwenaOptional();
  const zone = navigationMusicZoneForRoute(route);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const zoneRef = React.useRef<NavigationMusicZone>(null);
  const trackOrderRef = React.useRef<number[]>([]);
  const trackOrderCursorRef = React.useRef(0);
  const currentTrackIndexRef = React.useRef<number | null>(null);
  const pausedByVideoRef = React.useRef(false);
  const activeVideoRefs = React.useRef<Set<HTMLVideoElement>>(new Set());
  const pendingAutoplayRef = React.useRef(false);
  const volumeRafRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(false);

  const awenaSpeaking = awena?.speechCue?.phase === "pending" || awena?.speechCue?.phase === "speaking";

  const cancelVolumeRamp = React.useCallback(() => {
    if (volumeRafRef.current != null && typeof window !== "undefined") {
      window.cancelAnimationFrame(volumeRafRef.current);
      volumeRafRef.current = null;
    }
  }, []);

  const rampVolume = React.useCallback((target: number, durationMs = 320) => {
    const audio = audioRef.current;
    if (!audio || typeof window === "undefined") return;
    cancelVolumeRamp();
    const from = Number.isFinite(audio.volume) ? audio.volume : target;
    const to = Math.max(0, Math.min(1, target));
    if (Math.abs(from - to) < 0.004) {
      audio.volume = to;
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const ratio = Math.min(1, Math.max(0, (now - started) / Math.max(1, durationMs)));
      // Smoothstep évite un changement brutal au début/à la fin du ducking.
      const eased = ratio * ratio * (3 - 2 * ratio);
      audio.volume = from + (to - from) * eased;
      if (ratio < 1) volumeRafRef.current = window.requestAnimationFrame(tick);
      else volumeRafRef.current = null;
    };
    volumeRafRef.current = window.requestAnimationFrame(tick);
  }, [cancelVolumeRamp]);

  const targetVolume = React.useCallback(() => {
    return awenaSpeaking ? AWENA_DUCK_VOLUME : NAV_VOLUME;
  }, [awenaSpeaking]);

  const takeNextTrackIndex = React.useCallback(() => {
    if (trackOrderCursorRef.current >= trackOrderRef.current.length) {
      trackOrderRef.current = createRandomTrackOrder(
        TRACKS.length,
        currentTrackIndexRef.current ?? -1,
      );
      trackOrderCursorRef.current = 0;
    }

    const nextIndex = trackOrderRef.current[trackOrderCursorRef.current] ?? 0;
    trackOrderCursorRef.current += 1;
    currentTrackIndexRef.current = nextIndex;
    return nextIndex;
  }, []);

  const loadNextTrack = React.useCallback((audio: HTMLAudioElement) => {
    const nextIndex = takeNextTrackIndex();
    audio.src = TRACKS[nextIndex];
    audio.preload = "auto";
    try { audio.currentTime = 0; } catch {}
    try { audio.load(); } catch {}
  }, [takeNextTrackIndex]);

  const requestPlay = React.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !zoneRef.current || pausedByVideoRef.current) return;
    audio.muted = muted;
    rampVolume(targetVolume(), 220);
    try {
      await audio.play();
      pendingAutoplayRef.current = false;
    } catch {
      // Chrome/Android peut refuser un play() si la navigation n'a pas encore
      // fourni d'activation utilisateur. Le prochain pointer/keyboard reprend.
      pendingAutoplayRef.current = true;
    }
  }, [muted, rampVolume, targetVolume]);

  const resetPlaylist = React.useCallback((keepZone: NavigationMusicZone = zoneRef.current) => {
    const audio = audioRef.current;
    if (!audio) return;
    try { audio.pause(); } catch {}
    trackOrderRef.current = [];
    trackOrderCursorRef.current = 0;
    currentTrackIndexRef.current = null;
    zoneRef.current = keepZone;
    pendingAutoplayRef.current = false;

    if (keepZone) {
      loadNextTrack(audio);
    } else {
      try { audio.currentTime = 0; } catch {}
    }
  }, [loadNextTrack]);

  const resumeAfterVideoIfPossible = React.useCallback(() => {
    const connected = new Set<HTMLVideoElement>();
    activeVideoRefs.current.forEach((video) => {
      if (video.isConnected && !video.ended) connected.add(video);
    });
    activeVideoRefs.current = connected;
    const stillBlocked = connected.size > 0;
    pausedByVideoRef.current = stillBlocked;
    if (!stillBlocked && zoneRef.current) void requestPlay();
  }, [requestPlay]);

  // Crée un seul player pour toute la vie de l'App : il ne se démonte donc pas
  // à chaque changement de page et conserve naturellement son currentTime.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    mountedRef.current = true;
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = NAV_VOLUME;
    audio.muted = muted;
    audioRef.current = audio;

    const onEnded = () => {
      if (!mountedRef.current || !zoneRef.current) return;
      loadNextTrack(audio);
      void requestPlay();
    };
    audio.addEventListener("ended", onEnded);

    return () => {
      mountedRef.current = false;
      cancelVolumeRamp();
      audio.removeEventListener("ended", onEnded);
      try { audio.pause(); } catch {}
      audioRef.current = null;
    };
  // Le player doit être créé une seule fois. muted/volume sont synchronisés
  // par les effets dédiés ci-dessous.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toute la navigation appartient à une seule zone musicale. Les changements
  // de page ne touchent donc pas au player ; seuls les gameplays l'arrêtent.
  React.useEffect(() => {
    const previousZone = zoneRef.current;
    if (zone === previousZone) {
      if (zone && !pausedByVideoRef.current) void requestPlay();
      return;
    }

    if (!zone) {
      zoneRef.current = null;
      resetPlaylist(null);
      return;
    }

    // Retour depuis un gameplay vers la navigation : nouvelle session aléatoire.
    zoneRef.current = zone;
    resetPlaylist(zone);
    void requestPlay();
  }, [zone, requestPlay, resetPlaylist]);

  // Mute global de l'app.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
  }, [muted]);

  // Ducking Awena : la piste ne s'arrête jamais, seul le niveau baisse.
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    rampVolume(awenaSpeaking ? AWENA_DUCK_VOLUME : NAV_VOLUME, awenaSpeaking ? 180 : 520);
  }, [awenaSpeaking, rampVolume]);

  // Toute vidéo audible ouverte dans la zone met la musique en pause sans
  // modifier currentTime. Elle reprend après fin ou fermeture du lecteur.
  React.useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const onPlay = (event: Event) => {
      if (!isAudibleVideo(event.target) || !zoneRef.current) return;
      const video = event.target;
      activeVideoRefs.current.add(video);
      pausedByVideoRef.current = true;
      pendingAutoplayRef.current = false;
      try { audioRef.current?.pause(); } catch {}
    };

    const onEnded = (event: Event) => {
      if (!(event.target instanceof HTMLVideoElement)) return;
      activeVideoRefs.current.delete(event.target);
      resumeAfterVideoIfPossible();
    };

    const onPause = (event: Event) => {
      if (!(event.target instanceof HTMLVideoElement)) return;
      const video = event.target;
      // Si l'utilisateur met simplement la vidéo en pause, on garde la musique
      // coupée. Si la modale est fermée juste après, le MutationObserver la retire.
      window.setTimeout(() => {
        if (!video.isConnected || video.ended) {
          activeVideoRefs.current.delete(video);
          resumeAfterVideoIfPossible();
        }
      }, 80);
    };

    document.addEventListener("play", onPlay, true);
    document.addEventListener("ended", onEnded, true);
    document.addEventListener("pause", onPause, true);

    const observer = new MutationObserver(() => resumeAfterVideoIfPossible());
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("play", onPlay, true);
      document.removeEventListener("ended", onEnded, true);
      document.removeEventListener("pause", onPause, true);
      observer.disconnect();
    };
  }, [resumeAfterVideoIfPossible]);

  // Fallback autoplay : si le premier play() a été bloqué, le prochain geste
  // utilisateur démarre la musique sans imposer de clic supplémentaire dédié.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const retry = () => {
      if (!pendingAutoplayRef.current || !zoneRef.current || pausedByVideoRef.current) return;
      void requestPlay();
    };
    window.addEventListener("pointerdown", retry, { passive: true });
    window.addEventListener("keydown", retry);
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [requestPlay]);

  return null;
}
