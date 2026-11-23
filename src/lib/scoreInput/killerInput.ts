/** Modes de saisie Killer : mêmes valeurs qu'en configuration, reprise, et moteur. */
export type KillerInputMethod = "keypad" | "dartboard" | "voice" | "camera" | "autodarts";
export const KILLER_INPUT_METHODS = [
  { id: "keypad", label: "KEYPAD", description: "Saisie précise avec le clavier X01 (S / D / T)." },
  { id: "dartboard", label: "CIBLE", description: "Touche directement le segment sur la cible interactive." },
  { id: "voice", label: "VOCAL", description: "Annonce les fléchettes au micro, puis valide la volée." },
  { id: "camera", label: "CAMÉRA", description: "Caméra assistée calibrée : touche l'image pour enregistrer un impact." },
  { id: "autodarts", label: "AUTODARTS", description: "Réception via la connexion WebSocket AutoDarts déjà configurée dans l'application." },
] as const;
export function normalizeKillerInputMethod(raw: unknown): KillerInputMethod {
  return KILLER_INPUT_METHODS.some((v) => v.id === raw) ? raw as KillerInputMethod : "keypad";
}
export function readKillerExternalBridge(): { mode: string; bridgeUrl: string } {
  try {
    const raw = JSON.parse(localStorage.getItem("dc:x01v3:external-device:v1") || "{}");
    return { mode: String(raw.mode || raw.externalDeviceMode || ""), bridgeUrl: String(raw.bridgeUrl || raw.externalBridgeUrl || "") };
  } catch { return { mode: "", bridgeUrl: "" }; }
}
export function hasKillerAutoDartsBridge(): boolean {
  const { mode, bridgeUrl } = readKillerExternalBridge();
  return ["autodarts", "websocket_bridge", "bridge"].includes(mode) && /^wss?:\/\//i.test(bridgeUrl);
}
export function isKillerVoiceAvailable(): boolean {
  return typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}
export type KillerInputHit = { target: number; mult: 1 | 2 | 3 };
export function asKillerExternalHit(raw: any): KillerInputHit | null {
  const value = Number(raw?.segment ?? raw?.v);
  const mult = Number(raw?.multiplier ?? raw?.mult ?? 1);
  if (!Number.isInteger(value) || ![0, 25].includes(value) && (value < 1 || value > 20) || ![0,1,2,3].includes(mult) || value === 25 && mult === 3) return null;
  // Les systèmes électroniques marquent parfois MISS avec multiplier=0 ; ne jamais compter S20 par erreur.
  if (mult === 0) return { target: 0, mult: 1 };
  return { target: value, mult: (value === 0 ? 1 : mult) as 1 | 2 | 3 };
}
export function parseKillerExternalHits(raw: unknown): KillerInputHit[] {
  let data: any = raw;
  try { if (typeof raw === "string") data = JSON.parse(raw); } catch { return []; }
  const payload = data?.payload || data?.data || data;
  const darts = payload?.darts || payload?.visit?.darts || payload?.visit;
  if (Array.isArray(darts)) return darts.slice(0, 3).map(asKillerExternalHit).filter(Boolean) as KillerInputHit[];
  const one = asKillerExternalHit(payload?.dart || payload?.hit || payload);
  return one ? [one] : [];
}
