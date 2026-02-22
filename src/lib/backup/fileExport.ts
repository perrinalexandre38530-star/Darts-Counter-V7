export function downloadJsonFile(data: unknown, filename: string) {
  const json = typeof data === "string" ? data : JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareOrDownloadBlob(
  blob: Blob,
  filename: string,
  title = "Darts Counter Export"
) {
  const file = new File([blob], filename, {
    type: blob.type || "application/octet-stream",
  });

  // ⚠️ In embedded contexts (StackBlitz/WebContainer iframes), Web Share can exist but never resolve,
  // which looks like a freeze. We disable share when iframed and add a short timeout.
  const isIframed = (() => {
    try {
      return window.top !== window.self;
    } catch {
      return true;
    }
  })();

  const canTryShare =
    !isIframed &&
    typeof (navigator as any).share === "function" &&
    (typeof (navigator as any).canShare !== "function" || (navigator as any).canShare({ files: [file] }));

  if (canTryShare) {
    try {
      await Promise.race([
        (navigator as any).share({ title, files: [file] }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("WEB_SHARE_TIMEOUT")), 1500)),
      ]);
      return;
    } catch {
      // user cancelled / share failed / timeout → fallback download
    }
  }

  downloadBlobFile(blob, filename);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    const raf = (window as any).requestAnimationFrame;
    if (typeof raf === "function") raf(() => resolve());
    else setTimeout(resolve, 0);
  });
}

export async function shareOrDownload(
  data: unknown,
  filename: string,
  title = "Darts Counter Export"
) {
  // If already a Blob, avoid JSON stringify entirely
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    await shareOrDownloadBlob(data, filename, title);
    return;
  }

  // Let React paint the "Export..." message before heavy stringify
  await nextFrame();

  const json = typeof data === "string" ? data : JSON.stringify(data);
  const blob = new Blob([json], { type: "application/json" });
  await shareOrDownloadBlob(blob, filename, title);
}
