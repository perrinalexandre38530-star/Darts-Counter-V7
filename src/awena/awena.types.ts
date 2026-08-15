export type AwenaInterventionMode = "off" | "discreet" | "active" | "coach";

export type AwenaRuntimeContext = {
  route?: string;
  sport?: string;
  mode?: string;
  playerName?: string;
  score?: number | null;
  remaining?: number | null;
  extra?: Record<string, unknown>;
};

export type AwenaSettings = {
  enabled: boolean;
  voiceEnabled: boolean;
  interventionMode: AwenaInterventionMode;
  autoSpeak: boolean;
  volume: number;
  rate: number;
  pitch: number;
  voiceName: string | null;
};

export type AwenaMessage = {
  id: string;
  role: "awena" | "user";
  text: string;
  createdAt: number;
};

export type AwenaVoiceStatus = {
  available: boolean;
  ready: boolean;
  engine: "android-native" | "web-speech" | "none";
  enginePackage?: string | null;
  voiceName?: string | null;
  language?: string | null;
  offline?: boolean | null;
};

export type AwenaVoiceOption = {
  name: string;
  language: string;
  offline: boolean;
  quality?: number;
  latency?: number;
};
