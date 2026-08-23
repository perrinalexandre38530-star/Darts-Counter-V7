/**
 * Intentions vocales Awena et petit bus local utilisé par les dialogues guidés.
 * Cette couche ne dépend d'aucun service cloud : elle ne fait que normaliser
 * le texte déjà reconnu par Android/Web Speech et router l'intention.
 */

export const AWENA_VOICE_TRANSCRIPT_EVENT = "dc:awena-voice-transcript";

export type AwenaVoiceDialogOwner = "x01-config" | null;
export type AwenaVoiceIntent =
  | { kind: "x01-start"; raw: string }
  | { kind: "ask"; raw: string; prompt: string }
  | { kind: "none"; raw: string };

let activeDialogOwner: AwenaVoiceDialogOwner = null;

export function normalizeAwenaVoiceText(input: string) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Les moteurs STT écrivent parfois Awéna comme Avena, A Wena ou Wena. */
export function hasAwenaWakeWord(input: string) {
  const text = ` ${normalizeAwenaVoiceText(input)} `;
  return [
    " awena ", " avena ", " a wena ", " wena ",
    " авена ", " ауэна ", " аwена ",
    " アウェナ ", " 阿韦娜 ", " اوينا ", " أوينا ", " अवेना ",
  ].some((token) => text.includes(token));
}

export function stripAwenaWakeWord(input: string) {
  return normalizeAwenaVoiceText(input)
    .replace(/^(?:(?:hey|ok)\s+)?(?:awena|avena|a\s+wena|wena|авена|ауэна|аwена|アウェナ|阿韦娜|اوينا|أوينا|अवेना)(?:\s+|$)/iu, "")
    .trim();
}

export function parseAwenaVoiceIntent(input: string): AwenaVoiceIntent {
  const raw = String(input || "").trim();
  if (!raw || !hasAwenaWakeWord(raw)) return { kind: "none", raw };
  const prompt = stripAwenaWakeWord(raw);
  const x01 = /\b(?:x\s*0?1|xzero1|x zero un|x zero one)\b/i.test(prompt);
  const launchTokens = [
    "lance", "lancer", "demarre", "demarrer", "commence", "commencer", "ouvre", "ouvrir", "configure", "configuration", "partie", "jouer", "jeu",
    "start", "launch", "open", "play", "game", "configure", "setup",
    "lanza", "inicia", "iniciar", "empieza", "abre", "abrir", "jugar", "partida", "configura", "configuracion",
    "starte", "starten", "offne", "spielen", "spiel", "konfiguration", "konfiguriere",
    "avvia", "inizia", "aprire", "apri", "gioca", "partita", "configura",
    "iniciar", "comecar", "abrir", "jogar", "partida", "configurar",
    "starten", "openen", "speel", "spelen", "wedstrijd", "configuratie",
    "baslat", "ac", "oyna", "oyun", "yapilandir",
    "starta", "oppna", "spela", "apne", "spill", "spil",
    "uruchom", "zacznij", "otworz", "graj", "gra", "konfiguracja",
    "porneste", "incepe", "deschide", "joaca", "joc", "configurare",
    "pokreni", "zapocni", "otvori", "igraj", "igra", "podesavanje",
    "spustit", "zacni", "otevri", "hraj", "hra", "konfigurace",
    "запусти", "начни", "открой", "играть", "игра", "настройка",
  ];
  const paddedPrompt = ` ${prompt} `;
  const launchByToken = launchTokens.some((token) => paddedPrompt.includes(` ${token} `));
  const launchByScript = /开始|打开|游戏|設定|開始|開く|プレイ|ابدأ|افتح|العب|لعبة|शुरू|खोल|खेल/u.test(prompt);
  const launch = launchByToken || launchByScript;
  if (x01 && launch) return { kind: "x01-start", raw };
  if (prompt) return { kind: "ask", raw, prompt };
  return { kind: "none", raw };
}

export function setAwenaVoiceDialogOwner(owner: AwenaVoiceDialogOwner) {
  activeDialogOwner = owner;
}

export function getAwenaVoiceDialogOwner() {
  return activeDialogOwner;
}

export function publishAwenaVoiceTranscript(detail: { text: string; confidence?: number; final?: boolean }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AWENA_VOICE_TRANSCRIPT_EVENT, { detail }));
}
