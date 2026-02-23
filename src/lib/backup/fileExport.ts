/**
 * src/lib/backup/fileExport.ts
 *
 * Robust export helper for Pages/ServiceWorker/WebView constraints.
 *
 * Key goals:
 * - Avoid losing "user gesture" too easily: the download fallback triggers synchronously.
 * - Be defensive: File() and navigator.canShare may throw in some contexts.
 * - Avoid double JSON.stringify (can freeze on large exports).
 * - Handle circular refs gracefully.
 */

function safeJsonStringify(data: unknown, pretty = false): string {
  try {
    // Compact JSON is faster + smaller; pretty only when explicitly needed.
    return JSON.stringify(data, pretty ? null : undefined, pretty ? 2 : undefined);
  } catch {
    // Last-resort: drop circular refs and non-serializables.
    const seen = new WeakSet<object>();
    return JSON.stringify(
      data as any,
      (_k, v) => {
        if (typeof v === "function") return undefined;
        if (typeof v === "bigint") return v.toString();
        if (v && typeof v === "object") {
          if (seen.has(v)) return undefined;
          seen.add(v);
        }
        return v;
      },
      pretty ? 2 : undefined
    );
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Cleanup after the browser has started the navigation.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadJsonFile(data: unknown, filename: string) {
  const json = safeJsonStringify(data, false);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, filename);
}

export async function shareOrDownload(
  data: unknown,
  filename: string,
  title = "Darts Counter Export"
) {
  // Stringify once (avoid doing it twice for fallback).
  const json = safeJsonStringify(data, false);
  const blob = new Blob([json], { type: "application/json" });

  // Prefer sharing when available, but be defensive.
  try {
    const canShareApi = typeof (navigator as any)?.share === "function";
    if (canShareApi) {
      // File() can throw (some browsers / sandboxed contexts)
      let file: File | null = null;
      try {
        file = new File([blob], filename, { type: "application/json" });
      } catch {
        file = null;
      }

      if (file) {
        let canShareFiles = true;
        try {
          canShareFiles = !!(navigator as any)?.canShare?.({ files: [file] });
        } catch {
          canShareFiles = false;
        }

        if (canShareFiles) {
          await (navigator as any).share({ title, files: [file] });
          return;
        }
      }
    }
  } catch {
    // ignore and fallback to download
  }

  // Fallback: download (no await before click).
  downloadBlob(blob, filename);
}
