export const AWENA_VOICE_PROFILE = Object.freeze({
  id: "awena-siwis-stable-v1",
  displayName: "Awena · voix française stable",
  provider: "sherpa-onnx / VITS-Piper",
  language: "french",
  locale: "fr-FR",
  voice: "siwis-medium",
  mode: "local-neural" as const,
  role: "official-build-voice" as const,
});

export type AwenaVoiceProfile = typeof AWENA_VOICE_PROFILE;
