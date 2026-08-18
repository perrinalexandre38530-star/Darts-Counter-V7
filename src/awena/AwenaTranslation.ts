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
    const translated = String(result?.text || clean);
    cache.set(key, translated);
    if (cache.size > 240) {
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
