export type CameraPrecisionProfile = "high" | "competition" | "maximum";

export type CameraScoringPreferences = {
  profile: CameraPrecisionProfile;
  baselineFrames: number;
  analysisFrames: number;
  rereadFrames: number;
  frameDelayMs: number;
  maxCaptureSide: number;
  requiredTier: "high" | "competition";
  maxUncertaintyMm: number;
  minFrameAgreement: number;
  maxConsensusSpreadMm: number;
  minRereadAgreement: number;
  autoReread: boolean;
  strictProjectiveDrift: boolean;
  strictDartIdentification: boolean;
  minIdentityConfidence: number;
  minIdentityMargin: number;
};

export const CAMERA_SCORING_PREFS_KEY = "dc_camera_scoring_preferences_v1";

export const CAMERA_SCORING_PRESETS: Record<CameraPrecisionProfile, CameraScoringPreferences> = {
  high: {
    profile: "high",
    baselineFrames: 5,
    analysisFrames: 5,
    rereadFrames: 7,
    frameDelayMs: 55,
    maxCaptureSide: 1920,
    requiredTier: "high",
    maxUncertaintyMm: 1.25,
    minFrameAgreement: .88,
    maxConsensusSpreadMm: .65,
    minRereadAgreement: .68,
    autoReread: true,
    strictProjectiveDrift: true,
    strictDartIdentification: true,
    minIdentityConfidence: .70,
    minIdentityMargin: .075,
  },
  competition: {
    profile: "competition",
    baselineFrames: 7,
    analysisFrames: 7,
    rereadFrames: 9,
    frameDelayMs: 48,
    maxCaptureSide: 2304,
    requiredTier: "competition",
    maxUncertaintyMm: 1.00,
    minFrameAgreement: .92,
    maxConsensusSpreadMm: .48,
    minRereadAgreement: .74,
    autoReread: true,
    strictProjectiveDrift: true,
    strictDartIdentification: true,
    minIdentityConfidence: .74,
    minIdentityMargin: .09,
  },
  maximum: {
    profile: "maximum",
    baselineFrames: 9,
    analysisFrames: 9,
    rereadFrames: 11,
    frameDelayMs: 42,
    maxCaptureSide: 2560,
    requiredTier: "competition",
    maxUncertaintyMm: .75,
    minFrameAgreement: .95,
    maxConsensusSpreadMm: .36,
    minRereadAgreement: .80,
    autoReread: true,
    strictProjectiveDrift: true,
    strictDartIdentification: true,
    minIdentityConfidence: .78,
    minIdentityMargin: .11,
  },
};

function clamp(value:number, min:number, max:number) {
  const n=Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
}

export function normalizeCameraScoringPreferences(input:any): CameraScoringPreferences {
  const profile:CameraPrecisionProfile = input?.profile === "high" || input?.profile === "competition" || input?.profile === "maximum" ? input.profile : "maximum";
  const base = CAMERA_SCORING_PRESETS[profile];
  return {
    ...base,
    ...input,
    profile,
    baselineFrames: Math.round(clamp(input?.baselineFrames ?? base.baselineFrames, 3, 11)),
    analysisFrames: Math.round(clamp(input?.analysisFrames ?? base.analysisFrames, 3, 11)),
    rereadFrames: Math.round(clamp(input?.rereadFrames ?? base.rereadFrames, 5, 13)),
    frameDelayMs: Math.round(clamp(input?.frameDelayMs ?? base.frameDelayMs, 30, 90)),
    maxCaptureSide: Math.round(clamp(input?.maxCaptureSide ?? base.maxCaptureSide, 1280, 3072)),
    requiredTier: input?.requiredTier === "high" ? "high" : "competition",
    maxUncertaintyMm: clamp(input?.maxUncertaintyMm ?? base.maxUncertaintyMm, .45, 1.5),
    minFrameAgreement: clamp(input?.minFrameAgreement ?? base.minFrameAgreement, .72, .99),
    maxConsensusSpreadMm: clamp(input?.maxConsensusSpreadMm ?? base.maxConsensusSpreadMm, .20, 1.0),
    minRereadAgreement: clamp(input?.minRereadAgreement ?? base.minRereadAgreement, .55, .95),
    autoReread: input?.autoReread !== false,
    strictProjectiveDrift: input?.strictProjectiveDrift !== false,
    strictDartIdentification: input?.strictDartIdentification !== false,
    minIdentityConfidence: clamp(input?.minIdentityConfidence ?? base.minIdentityConfidence, .55, .95),
    minIdentityMargin: clamp(input?.minIdentityMargin ?? base.minIdentityMargin, .03, .25),
  };
}

export function loadCameraScoringPreferences(): CameraScoringPreferences {
  try {
    const raw=window.localStorage.getItem(CAMERA_SCORING_PREFS_KEY);
    return normalizeCameraScoringPreferences(raw ? JSON.parse(raw) : CAMERA_SCORING_PRESETS.maximum);
  } catch {
    return { ...CAMERA_SCORING_PRESETS.maximum };
  }
}

export function saveCameraScoringPreferences(next:CameraScoringPreferences): CameraScoringPreferences {
  const normalized=normalizeCameraScoringPreferences(next);
  try {
    window.localStorage.setItem(CAMERA_SCORING_PREFS_KEY, JSON.stringify({...normalized,updatedAt:Date.now()}));
    window.dispatchEvent(new CustomEvent("dc:camera-scoring-preferences", {detail:normalized}));
  } catch {}
  return normalized;
}

export function applyCameraScoringPreset(profile:CameraPrecisionProfile): CameraScoringPreferences {
  return saveCameraScoringPreferences({...CAMERA_SCORING_PRESETS[profile]});
}

export function resetCameraScoringPreferences(): CameraScoringPreferences {
  return applyCameraScoringPreset("maximum");
}
