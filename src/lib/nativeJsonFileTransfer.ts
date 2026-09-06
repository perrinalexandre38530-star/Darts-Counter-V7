import { Capacitor, registerPlugin } from "@capacitor/core";

type NativeJsonResult = {
  cancelled?: boolean;
  exportId?: string;
  fileName?: string;
  uri?: string;
  chunksWritten?: number;
  bytesWritten?: number;
  method?: string;
};

type NativeJsonPlugin = {
  beginJsonExport(options: { fileName: string; mimeType: string }): Promise<NativeJsonResult>;
  beginJsonDownload?(options: { fileName: string; mimeType: string }): Promise<NativeJsonResult>;
  beginJsonShare?(options: { fileName: string; mimeType: string }): Promise<NativeJsonResult>;
  appendJsonChunk(options: { exportId: string; chunk: string; index: number }): Promise<NativeJsonResult>;
  finishJsonExport(options: { exportId: string }): Promise<NativeJsonResult>;
  finishJsonShare?(options: { exportId: string; title?: string; text?: string; mimeType?: string }): Promise<NativeJsonResult>;
  abortJsonExport(options: { exportId: string }): Promise<void>;
};

const CHUNK_CHARS = 64 * 1024;
let nativePlugin: NativeJsonPlugin | null | undefined;

function plugin(): NativeJsonPlugin | null {
  if (nativePlugin !== undefined) return nativePlugin;
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
      nativePlugin = null;
      return null;
    }
    nativePlugin = registerPlugin<NativeJsonPlugin>("NativeJsonExport");
    return nativePlugin;
  } catch {
    nativePlugin = null;
    return null;
  }
}

function safeFileName(filename: string): string {
  const base = String(filename || "multisports-scoring.json")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 180) || "multisports-scoring.json";
  return base.toLowerCase().endsWith(".json") || base.toLowerCase().endsWith(".dcstats.json") ? base : `${base}.json`;
}

function stringify(value: unknown, pretty = true): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, current) => {
    if (typeof current === "bigint") return String(current);
    if (typeof current === "function") return undefined;
    if (current && typeof current === "object") {
      if (seen.has(current)) return undefined;
      seen.add(current);
    }
    return current;
  }, pretty ? 2 : undefined);
}

function chunkEnd(content: string, start: number): number {
  let end = Math.min(content.length, start + CHUNK_CHARS);
  if (end < content.length) {
    const previous = content.charCodeAt(end - 1);
    const next = content.charCodeAt(end);
    if (previous >= 0xd800 && previous <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end -= 1;
  }
  return Math.max(start + 1, end);
}

async function appendAll(p: NativeJsonPlugin, exportId: string, content: string): Promise<void> {
  let index = 0;
  let offset = 0;
  while (offset < content.length) {
    const end = chunkEnd(content, offset);
    await p.appendJsonChunk({ exportId, chunk: content.slice(offset, end), index });
    offset = end;
    index += 1;
    if (index % 8 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
}

function browserDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

async function browserSavePicker(content: string, filename: string): Promise<NativeJsonResult | null> {
  const picker = (window as any)?.showSaveFilePicker;
  if (typeof picker !== "function") return null;
  try {
    const handle = await picker({
      suggestedName: filename,
      types: [{ description: "Fichier MULTISPORTS SCORING", accept: { "application/json": [".json", ".dcstats.json"] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(new Blob([content], { type: "application/json;charset=utf-8" }));
    await writable.close();
    return { cancelled: false, fileName: filename, method: "save-picker" };
  } catch (error: any) {
    if (String(error?.name || "").toLowerCase() === "aborterror") return { cancelled: true, fileName: filename, method: "save-picker" };
    return null;
  }
}

/**
 * Enregistre un vrai fichier JSON.
 * - Android natif : directement dans Downloads/MULTISPORTS SCORING (Android 10+),
 *   avec fallback sélecteur système sur anciennes versions.
 * - Web/PWA : Save File Picker si disponible, sinon téléchargement navigateur.
 */
export async function saveJsonValueToDevice(value: unknown, filename: string): Promise<NativeJsonResult & { ok: boolean }> {
  return saveJsonStringToDevice(stringify(value, true), filename);
}

export async function saveJsonStringToDevice(content: string, filename: string): Promise<NativeJsonResult & { ok: boolean }> {
  const fileName = safeFileName(filename);
  const p = plugin();

  if (p) {
    let opened: NativeJsonResult | null = null;
    try {
      if (typeof p.beginJsonDownload === "function") {
        opened = await p.beginJsonDownload({ fileName, mimeType: "application/json" });
      }
    } catch {
      opened = null;
    }
    if (!opened) opened = await p.beginJsonExport({ fileName, mimeType: "application/json" });
    if (opened.cancelled || !opened.exportId) return { ...opened, ok: true };

    try {
      await appendAll(p, opened.exportId, content);
      const done = await p.finishJsonExport({ exportId: opened.exportId });
      return { ...done, ok: true, method: done.method || opened.method || "android-file" };
    } catch (error) {
      try { await p.abortJsonExport({ exportId: opened.exportId }); } catch {}
      throw error;
    }
  }

  const pickerResult = await browserSavePicker(content, fileName);
  if (pickerResult) return { ...pickerResult, ok: true };
  browserDownload(content, fileName);
  return { ok: true, cancelled: false, fileName, method: "download" };
}


/**
 * Essaie uniquement le partage natif Android. Retourne null lorsque la méthode
 * native n'est pas disponible afin que l'appelant conserve exactement son fallback historique.
 */
export async function tryShareJsonValueNative(
  value: unknown,
  filename: string,
  title = "MULTISPORTS SCORING",
  text = "",
): Promise<(NativeJsonResult & { ok: boolean }) | null> {
  const fileName = safeFileName(filename);
  const p = plugin();
  if (!p || typeof p.beginJsonShare !== "function" || typeof p.finishJsonShare !== "function") return null;

  const content = stringify(value, true);
  const opened = await p.beginJsonShare({ fileName, mimeType: "application/json" });
  if (opened.cancelled || !opened.exportId) return { ...opened, ok: true };
  try {
    await appendAll(p, opened.exportId, content);
    const done = await p.finishJsonShare({ exportId: opened.exportId, title, text, mimeType: "application/json" });
    return { ...done, ok: true, method: done.method || "android-share" };
  } catch (error) {
    try { await p.abortJsonExport({ exportId: opened.exportId }); } catch {}
    throw error;
  }
}

/**
 * Essaie uniquement l'écriture Android directe dans Téléchargements.
 * Retourne null sur web/PWA ou avec une ancienne APK, sans supprimer les fallbacks existants.
 */
export async function trySaveJsonValueNativeToDownloads(
  value: unknown,
  filename: string,
): Promise<(NativeJsonResult & { ok: boolean }) | null> {
  const p = plugin();
  if (!p || typeof p.beginJsonDownload !== "function") return null;

  const fileName = safeFileName(filename);
  const content = stringify(value, true);
  const opened = await p.beginJsonDownload({ fileName, mimeType: "application/json" });
  if (opened.cancelled || !opened.exportId) return { ...opened, ok: true };
  try {
    await appendAll(p, opened.exportId, content);
    const done = await p.finishJsonExport({ exportId: opened.exportId });
    return { ...done, ok: true, method: done.method || opened.method || "android-downloads" };
  } catch (error) {
    try { await p.abortJsonExport({ exportId: opened.exportId }); } catch {}
    throw error;
  }
}

/** Partage un vrai fichier JSON par la feuille de partage système. */
export async function shareJsonValue(
  value: unknown,
  filename: string,
  title = "MULTISPORTS SCORING",
  text = "",
): Promise<NativeJsonResult & { ok: boolean; fallback?: string }> {
  const fileName = safeFileName(filename);
  const content = stringify(value, true);
  try {
    const nativeResult = await tryShareJsonValueNative(value, fileName, title, text);
    if (nativeResult) return { ...nativeResult, fallback: undefined };
  } catch {
    // Le partage natif a échoué : on conserve les fallbacks Web ci-dessous.
  }

  const nav: any = typeof navigator !== "undefined" ? navigator : null;
  try {
    const file = typeof File !== "undefined" ? new File([content], fileName, { type: "application/json" }) : null;
    const canShareFile = !!file && !!nav?.share && (typeof nav?.canShare !== "function" || !!nav.canShare({ files: [file] }));
    if (canShareFile && file) {
      await nav.share({ title, text, files: [file] });
      return { ok: true, cancelled: false, fileName, method: "web-share-file" };
    }
  } catch (error: any) {
    if (error?.name === "AbortError") return { ok: true, cancelled: true, fileName, method: "web-share-file" };
  }

  const saved = await saveJsonStringToDevice(content, fileName);
  return { ...saved, fallback: "saved-file" };
}
