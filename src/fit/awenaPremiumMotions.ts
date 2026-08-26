export type AwenaPremiumVideoSource = {
  src: string;
  type: "video/webm" | "video/mp4";
};

export type AwenaPremiumVideo = {
  sources: AwenaPremiumVideoSource[];
  poster?: string;
};

export type AwenaPremiumFrameSequence = {
  frames: string[];
  poster?: string;
  fps: number;
  /** Optional playback order using zero-based indexes into `frames`. */
  order?: number[];
};

export type AwenaPremiumMotionSlot = {
  exerciseId: string;
  label: string;
  video?: AwenaPremiumVideo;
  frameSequence?: AwenaPremiumFrameSequence;
};

const ROOT = "/fit/motions/awena/premium";

function frames(exerciseId: string, count: number, fps: number, order?: number[]): AwenaPremiumFrameSequence {
  const dir = `${ROOT}/${exerciseId}`;
  return {
    frames: Array.from({ length: count }, (_, index) => `${dir}/frames/frame-${String(index + 1).padStart(2, "0")}.webp`),
    poster: `${dir}/poster.webp`,
    fps,
    order,
  };
}

/**
 * AWENA PREMIUM MOTION CATALOG
 *
 * Every FIT PERF exercise owns a stable premium slot. A slot may contain:
 *  1. a premium WebM/MP4 loop (highest priority),
 *  2. a frame sequence (second priority),
 *  3. no premium media yet, in which case the procedural AWENA renderer remains the fallback.
 *
 * To upgrade an exercise later, only add its media files and fill the corresponding
 * `video` and/or `frameSequence` field here. FitExerciseMotion does not need to change.
 */
export const AWENA_PREMIUM_MOTION_SLOTS: Record<string, AwenaPremiumMotionSlot> = {
  bench: {
    exerciseId: "bench",
    label: "Développé couché",
    frameSequence: frames("bench", 5, 3.2, [0, 1, 2, 1]),
  },
  "incline-db": { exerciseId: "incline-db", label: "Développé incliné" },
  "cable-fly": { exerciseId: "cable-fly", label: "Écarté poulie" },
  pullup: {
    exerciseId: "pullup",
    label: "Tractions",
    frameSequence: frames("pullup", 5, 3.2, [0, 1, 2, 1]),
  },
  row: { exerciseId: "row", label: "Rowing barre" },
  "lat-pulldown": { exerciseId: "lat-pulldown", label: "Tirage vertical" },
  ohp: { exerciseId: "ohp", label: "Développé militaire" },
  "lateral-raise": { exerciseId: "lateral-raise", label: "Élévations latérales" },
  curl: {
    exerciseId: "curl",
    label: "Curl biceps",
    frameSequence: frames("curl", 5, 3.6),
  },
  "triceps-push": { exerciseId: "triceps-push", label: "Extension triceps" },
  squat: {
    exerciseId: "squat",
    label: "Squat",
    frameSequence: frames("squat", 5, 3.6),
  },
  "leg-press": { exerciseId: "leg-press", label: "Presse à cuisses" },
  rdl: { exerciseId: "rdl", label: "Soulevé de terre roumain" },
  "hip-thrust": { exerciseId: "hip-thrust", label: "Hip thrust" },
  calf: { exerciseId: "calf", label: "Mollets debout" },
  plank: { exerciseId: "plank", label: "Gainage" },
  deadlift: {
    exerciseId: "deadlift",
    label: "Soulevé de terre",
    frameSequence: frames("deadlift", 5, 3.4),
  },
  goblet: { exerciseId: "goblet", label: "Goblet squat" },
};

export function getAwenaPremiumMotion(exerciseId: string): AwenaPremiumMotionSlot | undefined {
  const slot = AWENA_PREMIUM_MOTION_SLOTS[exerciseId];
  if (!slot) return undefined;
  if (!slot.video?.sources?.length && !slot.frameSequence?.frames?.length) return undefined;
  return slot;
}

export function hasAwenaPremiumMotion(exerciseId: string): boolean {
  return Boolean(getAwenaPremiumMotion(exerciseId));
}
