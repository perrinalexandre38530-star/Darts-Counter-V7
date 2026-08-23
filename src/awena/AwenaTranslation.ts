import { Capacitor, registerPlugin } from "@capacitor/core";
import type { AwenaAction, AwenaReply } from "./awena.types";

type NativeTranslationPlugin = {
  prepare(options: { sourceLanguage: string; targetLanguage: string }): Promise<{ ok: boolean; ready?: boolean; sourceLanguage?: string; targetLanguage?: string; fallbackLanguage?: string | null }>;
  translate(options: { text: string; sourceLanguage: string; targetLanguage: string }): Promise<{ ok: boolean; text: string; sourceLanguage?: string; targetLanguage?: string; fallbackLanguage?: string | null }>;
  getStatus(options: { sourceLanguage: string; targetLanguage: string }): Promise<{ available: boolean; ready: boolean; sourceLanguage?: string; targetLanguage?: string; fallbackLanguage?: string | null; lastError?: string | null }>;
};

const NativeAwenaTranslation = registerPlugin<NativeTranslationPlugin>("AwenaTranslation");

const cache = new Map<string, string>();
const preparing = new Map<string, Promise<boolean>>();

function baseLang(value?: string) {
  return String(value || "fr").toLowerCase().split("-")[0];
}

function pairKey(source: string, target: string) {
  return `${baseLang(source)}>${baseLang(target)}`;
}

function isAndroidNative() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

// Google ML Kit has no Serbian model. The Android bridge deliberately uses
// Croatian as its closest translation model for target "sr". Convert that
// Croatian Latin output to Serbian Cyrillic so the selected Serbian UI does not
// suddenly display Croatian/Latin fragments on recently added screens.
function croatianLatinToSerbianCyrillic(value: string): string {
  const digraphs: Array<[RegExp, string]> = [
    [/DŽ/g, "Џ"], [/Dž/g, "Џ"], [/dž/g, "џ"],
    [/LJ/g, "Љ"], [/Lj/g, "Љ"], [/lj/g, "љ"],
    [/NJ/g, "Њ"], [/Nj/g, "Њ"], [/nj/g, "њ"],
  ];
  let out = String(value || "");
  for (const [pattern, replacement] of digraphs) out = out.replace(pattern, replacement);

  const map: Record<string, string> = {
    A: "А", B: "Б", C: "Ц", Č: "Ч", Ć: "Ћ", D: "Д", Đ: "Ђ", E: "Е", F: "Ф",
    G: "Г", H: "Х", I: "И", J: "Ј", K: "К", L: "Л", M: "М", N: "Н", O: "О",
    P: "П", R: "Р", S: "С", Š: "Ш", T: "Т", U: "У", V: "В", Z: "З", Ž: "Ж",
    a: "а", b: "б", c: "ц", č: "ч", ć: "ћ", d: "д", đ: "ђ", e: "е", f: "ф",
    g: "г", h: "х", i: "и", j: "ј", k: "к", l: "л", m: "м", n: "н", o: "о",
    p: "п", r: "р", s: "с", š: "ш", t: "т", u: "у", v: "в", z: "з", ž: "ж",
  };
  return Array.from(out, (char) => map[char] || char).join("");
}

function normalizeTargetTranslation(value: string, target: string): string {
  return baseLang(target) === "sr" ? croatianLatinToSerbianCyrillic(value) : value;
}

async function preparePair(source: string, target: string): Promise<boolean> {
  const s = baseLang(source);
  const t = baseLang(target);
  if (s === t) return true;
  if (!isAndroidNative()) return false;

  const key = pairKey(s, t);
  const existing = preparing.get(key);
  if (existing) return existing;

  const task = NativeAwenaTranslation.prepare({ sourceLanguage: s, targetLanguage: t })
    .then((result) => !!result?.ok)
    .catch((error) => {
      console.warn("[AwenaTranslation] préparation impossible", error);
      return false;
    })
    .finally(() => preparing.delete(key));

  preparing.set(key, task);
  return task;
}

async function translateText(text: string, source: string, target: string): Promise<string> {
  const clean = String(text || "");
  const s = baseLang(source);
  const t = baseLang(target);
  if (!clean.trim() || s === t) return clean;
  if (!isAndroidNative()) return clean;

  const key = `${s}>${t}|${clean}`;
  const cached = cache.get(key);
  if (cached != null) return cached;

  try {
    await preparePair(s, t);
    const result = await NativeAwenaTranslation.translate({
      text: clean,
      sourceLanguage: s,
      targetLanguage: t,
    });
    const translated = normalizeTargetTranslation(String(result?.text || clean), t);
    cache.set(key, translated);
    if (cache.size > 2400) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    return translated;
  } catch (error) {
    console.warn("[AwenaTranslation] traduction impossible, fallback FR", error);
    return clean;
  }
}

async function localizeAction(action: AwenaAction, target: string): Promise<AwenaAction> {
  if (baseLang(target) === "fr") return action;
  const [label, prompt] = await Promise.all([
    translateText(action.label, "fr", target),
    action.prompt ? translateText(action.prompt, "fr", target) : Promise.resolve(undefined),
  ]);
  return { ...action, label, prompt };
}

export const awenaTranslation = {
  isNativeAvailable: isAndroidNative,

  async prepare(targetLanguage: string) {
    const target = baseLang(targetLanguage);
    return target === "fr" ? true : preparePair("fr", target);
  },

  async questionToFrench(question: string, sourceLanguage: string) {
    const source = baseLang(sourceLanguage);
    return source === "fr" ? question : translateText(question, source, "fr");
  },

  async replyFromFrench(reply: AwenaReply, targetLanguage: string): Promise<AwenaReply> {
    const target = baseLang(targetLanguage);
    if (target === "fr") return reply;
    const [text, actions] = await Promise.all([
      translateText(reply.text, "fr", target),
      reply.actions?.length
        ? Promise.all(reply.actions.map((action) => localizeAction(action, target)))
        : Promise.resolve(reply.actions),
    ]);
    return { ...reply, text, actions };
  },

  async textFromFrench(text: string, targetLanguage: string) {
    return translateText(text, "fr", targetLanguage);
  },

  async textBetween(text: string, sourceLanguage: string, targetLanguage: string) {
    return translateText(text, sourceLanguage, targetLanguage);
  },

  async getStatus(targetLanguage: string) {
    const target = baseLang(targetLanguage);
    if (target === "fr") {
      return { available: true, ready: true, sourceLanguage: "fr", targetLanguage: "fr", fallbackLanguage: null, lastError: null };
    }
    if (!isAndroidNative()) {
      return { available: false, ready: false, sourceLanguage: "fr", targetLanguage: target, fallbackLanguage: null, lastError: "Traduction locale native Android indisponible." };
    }
    try {
      return await NativeAwenaTranslation.getStatus({ sourceLanguage: "fr", targetLanguage: target });
    } catch (error) {
      return { available: false, ready: false, sourceLanguage: "fr", targetLanguage: target, fallbackLanguage: null, lastError: String((error as any)?.message || error) };
    }
  },
};
