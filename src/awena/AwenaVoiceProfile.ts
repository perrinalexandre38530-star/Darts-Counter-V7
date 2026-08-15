export const AWENA_VOICE_PROFILE = Object.freeze({
  id: "awena-estelle-v1",
  displayName: "Awena · Estelle",
  provider: "PocketTTS",
  language: "french",
  locale: "fr-FR",
  voice: "estelle",
  mode: "local-neural" as const,
  role: "official-build-voice" as const,
});

export type AwenaVoiceProfile = typeof AWENA_VOICE_PROFILE;
