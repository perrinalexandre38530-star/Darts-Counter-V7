// =============================================================
// src/lib/dartScannerApi.ts
// Pipeline de scan d’une fléchette côté FRONT (+ upload vers Worker)
// - Charge le fichier dans un <canvas>
// - Essaie de deviner la couleur de fond (bords de l’image)
// - Détoure automatiquement : fond → transparent, fléchette conservée
// - Recadre sur le contour de la fléchette
// - Met à l’échelle pour que toutes aient la même taille
// - Oriente la fléchette (pointe vers le bas-gauche ~55°)
// - Applique un effet "cartoon" sur la fléchette seulement
// - Génère :
//     - une image principale (1024x1024 PNG transparent)
//     - une miniature (256x256 PNG transparente)
// - Envoie le tout au Worker /dart-scan qui les sauve dans R2
// =============================================================

export type DartScanOptions = {
  bgColor?: string;        // utilisé seulement comme info de thème retournée
  targetAngleDeg?: number; // angle final de la fléchette dans le cadre
  cartoonLevel?: number;   // intensité cartoon [0..1]
};

export type DartScanResult = {
  mainImageUrl: string;
  thumbImageUrl: string;
  bgColor?: string;
};

// -------------------------------------------------------------
// URL DU WORKER (FIXE) — BON ENDPOINT
// -------------------------------------------------------------

const DART_SCANNER_API_BASE =
  "https://dc-online-v3.perrin-alexandre38530.workers.dev";

function getApiBase(): string {
  return DART_SCANNER_API_BASE;
}

// -------------------------------------------------------------
// Helpers canvas / image
// -------------------------------------------------------------

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("canvas.toBlob returned null"));
      resolve(blob);
    }, "image/png");
  });
}

// -------------------------------------------------------------
// 1) Détection du fond & masque de la fléchette
// -------------------------------------------------------------

type BgColor = { r: number; g: number; b: number };

function estimateBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number
): BgColor {
  // On échantillonne un cadre de 8% autour de l’image
  const margin = Math.max(2, Math.floor(Math.min(width, height) * 0.08));

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  function samplePixel(x: number, y: number) {
    const idx = (y * width + x) * 4;
    rSum += data[idx];
    gSum += data[idx + 1];
    bSum += data[idx + 2];
    count++;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inTop = y < margin;
      const inBottom = y >= height - margin;
      const inLeft = x < margin;
      const inRight = x >= width - margin;

      if (inTop || inBottom || inLeft || inRight) {
        samplePixel(x, y);
      }
    }
  }

  if (count === 0) {
    return { r: 40, g: 40, b: 40 };
  }

  return {
    r: rSum / count,
    g: gSum / count,
    b: bSum / count,
  };
}

function dilateMask(
  base: Uint8Array,
  width: number,
  height: number,
  radius = 1
): Uint8Array {
  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let fg = 0;
      for (let dy = -radius; dy <= radius && !fg; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          if (base[yy * width + xx] === 1) {
            fg = 1;
            break;
          }
        }
      }
      out[y * width + x] = fg;
    }
  }

  return out;
}

// Érosion légère pour "resserrer" le détourage
function erodeMask(
  base: Uint8Array,
  width: number,
  height: number,
  radius = 1
): Uint8Array {
  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let keep = 1;
      for (let dy = -radius; dy <= radius && keep; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          if (base[yy * width + xx] === 0) {
            keep = 0;
            break;
          }
        }
      }
      out[y * width + x] = keep;
    }
  }

  return out;
}

function buildForegroundMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: BgColor
): {
  mask: Uint8Array;
  bbox:
    | { minX: number; minY: number; maxX: number; maxY: number }
    | null;
} {
  const mask = new Uint8Array(width * height);

  // Seuil de différence couleur fond / fléchette
  // (plus petit => détourage plus "strict" => moins de fond)
  const threshold = 30;
  const thresholdSq = threshold * threshold;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 10) continue;

      const dr = r - bg.r;
      const dg = g - bg.g;
      const db = b - bg.b;
      const distSq = dr * dr + dg * dg + db * db;

      if (distSq > thresholdSq) {
        // considéré comme "fléchette"
        const i = y * width + x;
        mask[i] = 1;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    // rien détecté
    return { mask, bbox: null };
  }

  // On "lisse" le masque :
  // 1) légère dilatation pour combler les trous
  const dilated = dilateMask(mask, width, height, 1);
  // 2) puis érosion pour resserrer autour de la fléchette
  const opened = erodeMask(dilated, width, height, 1);

  // Recalcule de la bbox sur le masque final
  minX = width;
  minY = height;
  maxX = -1;
  maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (opened[i] === 1) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    return { mask: opened, bbox: null };
  }

  return {
    mask: opened,
    bbox: { minX, minY, maxX, maxY },
  };
}

// -------------------------------------------------------------
// 2) Cartoonisation (sur fond déjà transparent)
// -------------------------------------------------------------

function cartoonizeImageData(
  imageData: ImageData,
  level: number
): ImageData {
  const data = imageData.data;
  const factor = 0.4 + level * 1.1;
  const step = 42;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    if (a < 5) continue;

    r = 128 + (r - 128) * factor;
    g = 128 + (g - 128) * factor;
    b = 128 + (b - 128) * factor;

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    r = Math.round(r / step) * step;
    g = Math.round(g / step) * step;
    b = Math.round(b / step) * step;

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  return imageData;
}

// -------------------------------------------------------------
// 3) Pipeline principal côté FRONT
// -------------------------------------------------------------

async function buildProcessedImages(
  file: File,
  options: DartScanOptions
): Promise<{ mainBlob: Blob; thumbBlob: Blob; bgColor: string }> {
  const img = await loadImageFromFile(file);

  // Canvas brut à la taille de la photo originale
  const rawCanvas = document.createElement("canvas");
  rawCanvas.width = img.naturalWidth || img.width;
  rawCanvas.height = img.naturalHeight || img.height;
  const rawCtx = rawCanvas.getContext("2d");
  if (!rawCtx) {
    throw new Error("Unable to get 2D context (raw)");
  }

  rawCtx.drawImage(img, 0, 0, rawCanvas.width, rawCanvas.height);
  const rawData = rawCtx.getImageData(
    0,
    0,
    rawCanvas.width,
    rawCanvas.height
  );

  // 1) Estimation de la couleur de fond + masque de la fléchette
  const bg = estimateBackgroundColor(
    rawData.data,
    rawCanvas.width,
    rawCanvas.height
  );
  const { mask, bbox } = buildForegroundMask(
    rawData.data,
    rawCanvas.width,
    rawCanvas.height,
    bg
  );

  // Si on ne détecte rien, on fallback sur l’image entière
  const minX = bbox ? bbox.minX : 0;
  const minY = bbox ? bbox.minY : 0;
  const maxX = bbox ? bbox.maxX : rawCanvas.width - 1;
  const maxY = bbox ? bbox.maxY : rawCanvas.height - 1;

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) {
    throw new Error("Unable to get 2D context (crop)");
  }

  const cropImageData = cropCtx.createImageData(cropW, cropH);
  const cData = cropImageData.data;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const srcIdx = (y * rawCanvas.width + x) * 4;
      const dstX = x - minX;
      const dstY = y - minY;
      const dstIdx = (dstY * cropW + dstX) * 4;

      const isFg = bbox ? mask[y * rawCanvas.width + x] === 1 : true;

      if (isFg) {
        cData[dstIdx] = rawData.data[srcIdx];
        cData[dstIdx + 1] = rawData.data[srcIdx + 1];
        cData[dstIdx + 2] = rawData.data[srcIdx + 2];
        cData[dstIdx + 3] = 255; // opaque
      } else {
        cData[dstIdx] = 0;
        cData[dstIdx + 1] = 0;
        cData[dstIdx + 2] = 0;
        cData[dstIdx + 3] = 0; // transparent
      }
    }
  }

  cropCtx.putImageData(cropImageData, 0, 0);

  // 2) Canvas final 1024x1024 (fond transparent)
  const size = 1024;
  const mainCanvas = document.createElement("canvas");
  mainCanvas.width = size;
  mainCanvas.height = size;
  const mainCtx = mainCanvas.getContext("2d");
  if (!mainCtx) {
    throw new Error("Unable to get 2D context (main)");
  }

  mainCtx.clearRect(0, 0, size, size);

  const dartLengthPx = Math.max(cropW, cropH);
  const targetCoverage = 0.8; // ~ même taille pour tous les sets
  const scale = (size * targetCoverage) / dartLengthPx;

  const drawW = cropW * scale;
  const drawH = cropH * scale;

  // 👉 Inclinaison plus forte par défaut, type ta capture 2
  const targetAngleDeg = options.targetAngleDeg ?? 55;
  const angleRad = (targetAngleDeg * Math.PI) / 180;

  mainCtx.save();
  mainCtx.translate(size / 2, size / 2);

  // sens choisi pour "pointe en bas-gauche / ailettes en haut-droite"
  mainCtx.rotate(angleRad);

  mainCtx.drawImage(
    cropCanvas,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  mainCtx.restore();

  // 3) Cartoonisation
  const cartoonLevel = options.cartoonLevel ?? 0.85;
  const mainData = mainCtx.getImageData(0, 0, size, size);
  const cartooned = cartoonizeImageData(mainData, cartoonLevel);
  mainCtx.putImageData(cartooned, 0, 0);

  const mainBlob = await canvasToBlob(mainCanvas);

  // 4) Miniature 256x256
  const thumbSize = 256;
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbSize;
  thumbCanvas.height = thumbSize;
  const thumbCtx = thumbCanvas.getContext("2d");
  if (!thumbCtx) {
    throw new Error("Unable to get 2D context (thumb)");
  }

  thumbCtx.clearRect(0, 0, thumbSize, thumbSize);
  thumbCtx.drawImage(
    mainCanvas,
    0,
    0,
    size,
    size,
    0,
    0,
    thumbSize,
    thumbSize
  );

  const thumbBlob = await canvasToBlob(thumbCanvas);

  const themeBg = options.bgColor || "#101020";

  return { mainBlob, thumbBlob, bgColor: themeBg };
}

// -------------------------------------------------------------
// 4) API publique appelée par DartSetScannerSheet
// -------------------------------------------------------------

export async function scanDartImage(
  file: File,
  options: DartScanOptions
): Promise<DartScanResult> {
  const { mainBlob, thumbBlob, bgColor } = await buildProcessedImages(
    file,
    options
  );

  const apiBase = getApiBase();
  const url = `${apiBase}/dart-scan`;

  const form = new FormData();
  form.append("image", mainBlob, "dart-main.png");
  form.append("thumb", thumbBlob, "dart-thumb.png");
  form.append(
    "options",
    JSON.stringify({
      bgColor,
    })
  );

  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} while scanning dart (${text || "no body"})`
    );
  }

  const json = (await res.json()) as {
    mainImageUrl: string;
    thumbImageUrl: string;
    bgColor?: string;
  };

  if (!json.mainImageUrl || !json.thumbImageUrl) {
    throw new Error("Invalid response from /dart-scan");
  }

  return {
    mainImageUrl: json.mainImageUrl,
    thumbImageUrl: json.thumbImageUrl,
    bgColor: json.bgColor ?? bgColor,
  };
}
