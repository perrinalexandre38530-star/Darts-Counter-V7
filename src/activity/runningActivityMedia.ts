import type { ActivityPhoto } from "./activityTypes";

const MAX_SIDE = 1280;
const MIN_SIDE = 720;
const MAX_PHOTOS = 8;
const TARGET_DATA_URL_LENGTH = 430_000;

function photoId() {
  return `run_photo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Lecture photo impossible"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Photo illisible"));
    image.src = src;
  });
}

function fitSize(width: number, height: number, maxSide: number) {
  const max = Math.max(width, height, 1);
  const ratio = Math.min(1, maxSide / max);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function compressRunningActivityPhoto(file: File): Promise<ActivityPhoto> {
  if (!file.type.startsWith("image/")) throw new Error("Le fichier sélectionné n'est pas une image");
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  let maxSide = MAX_SIDE;
  let quality = 0.82;
  let output = source;
  let finalWidth = image.naturalWidth || image.width;
  let finalHeight = image.naturalHeight || image.height;

  // Photos are stored directly with the activity so they survive IndexedDB export/import.
  // Keep them deliberately compact to avoid blowing up mobile storage/backups.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const size = fitSize(image.naturalWidth || image.width, image.naturalHeight || image.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) break;
    context.drawImage(image, 0, 0, size.width, size.height);
    output = canvas.toDataURL("image/jpeg", quality);
    finalWidth = size.width;
    finalHeight = size.height;
    if (output.length <= TARGET_DATA_URL_LENGTH) break;
    quality = Math.max(0.5, quality - 0.08);
    if (quality <= 0.58 && maxSide > MIN_SIDE) maxSide = Math.max(MIN_SIDE, Math.round(maxSide * 0.84));
  }

  return {
    id: photoId(),
    dataUrl: output,
    createdAt: Date.now(),
    name: file.name || undefined,
    width: finalWidth,
    height: finalHeight,
  };
}

export async function compressRunningActivityPhotos(files: File[], slots = MAX_PHOTOS): Promise<ActivityPhoto[]> {
  const limited = files.filter((file) => file.type.startsWith("image/")).slice(0, Math.max(0, Math.min(MAX_PHOTOS, slots)));
  const output: ActivityPhoto[] = [];
  for (const file of limited) {
    try {
      output.push(await compressRunningActivityPhoto(file));
    } catch {}
  }
  return output;
}

export const RUNNING_ACTIVITY_MAX_PHOTOS = MAX_PHOTOS;
