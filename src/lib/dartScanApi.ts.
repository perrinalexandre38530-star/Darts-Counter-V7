// =============================================================
// src/lib/dartScannerApi.ts
// Bridge front → Worker Cloudflare "dc-online-v3" pour le scan
// - POST /dart-scan (multipart/form-data)
// - Renvoie mainImageUrl / thumbImageUrl / bgColor
// =============================================================

export type DartScanOptions = {
  bgColor?: string;
  targetAngleDeg?: number;
  cartoonLevel?: number;
};

export type DartScanResult = {
  mainImageUrl: string;
  thumbImageUrl: string;
  bgColor?: string;
};

// URL de ton Worker ONLINE + SCAN
// Si tu changes le nom du worker ou le sous-domaine, tu n'as qu'à modifier cette constante.
const DART_SCAN_BASE_URL =
  "https://dc-online-v3.perrin-alexandre38530.workers.dev";

/**
 * Envoie une image de fléchette au Worker Cloudflare
 * et renvoie les URLs (main + thumb) générées côté backend.
 */
export async function scanDartImage(
  file: File,
  options?: DartScanOptions
): Promise<DartScanResult> {
  const form = new FormData();
  form.append("image", file);

  if (options) {
    form.append("options", JSON.stringify(options));
  }

  const res = await fetch(`${DART_SCAN_BASE_URL}/dart-scan`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    // Log côté console pour debug rapide
    console.error(
      "[scanDartImage] HTTP error",
      res.status,
      res.statusText
    );
    throw new Error(`scanDartImage failed (HTTP ${res.status})`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (e) {
    console.error("[scanDartImage] invalid JSON response", e);
    throw new Error("scanDartImage failed: invalid JSON response");
  }

  // Validation minimale
  if (
    !data ||
    typeof data.mainImageUrl !== "string" ||
    typeof data.thumbImageUrl !== "string"
  ) {
    console.error("[scanDartImage] invalid payload", data);
    throw new Error("scanDartImage failed: invalid payload");
  }

  const result: DartScanResult = {
    mainImageUrl: data.mainImageUrl,
    thumbImageUrl: data.thumbImageUrl,
    bgColor:
      typeof data.bgColor === "string" ? data.bgColor : undefined,
  };

  return result;
}
