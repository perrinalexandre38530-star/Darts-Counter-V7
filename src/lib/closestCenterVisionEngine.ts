// @ts-nocheck
import type { CameraCalibration } from "./cameraCalibrationStore";

export type DartVisualSignature = {
  hue: number[];
  saturation: number[];
  lightness: number[];
  edgeDensity: number;
  samples: number;
};

export type ClosestCenterImpact = {
  id: string;
  playerId: string;
  teamId?: string | null;
  xNorm: number;
  yNorm: number;
  distanceNorm: number;
  distanceMm: number;
  confidence: number;
  identityConfidence: number;
  round: number;
};

export type VisionDetection = {
  xNorm: number;
  yNorm: number;
  distanceNorm: number;
  distanceMm: number;
  confidence: number;
  area: number;
};

export function clamp01(v: number) { return Math.max(0, Math.min(1, Number(v) || 0)); }

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function normalizeHist(hist: number[]) {
  const sum = hist.reduce((a, b) => a + b, 0) || 1;
  return hist.map(v => v / sum);
}

export function buildDartVisualSignature(data: ImageData): DartVisualSignature {
  const hue = Array(12).fill(0), saturation = Array(8).fill(0), lightness = Array(8).fill(0);
  let edge = 0, used = 0;
  const { width, height, data: p } = data;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = (y * width + x) * 4;
      const a = p[i + 3]; if (a < 16) continue;
      const { h, s, l } = rgbToHsl(p[i], p[i + 1], p[i + 2]);
      // Ignore nearly neutral/dark background pixels; keep dart colors/materials.
      if (l < .08) continue;
      hue[Math.min(11, Math.floor(h * 12))]++;
      saturation[Math.min(7, Math.floor(s * 8))]++;
      lightness[Math.min(7, Math.floor(l * 8))]++;
      const ir = (y * width + (x + 1)) * 4;
      const id = ((y + 1) * width + x) * 4;
      const dx = Math.abs(p[i] - p[ir]) + Math.abs(p[i + 1] - p[ir + 1]) + Math.abs(p[i + 2] - p[ir + 2]);
      const dy = Math.abs(p[i] - p[id]) + Math.abs(p[i + 1] - p[id + 1]) + Math.abs(p[i + 2] - p[id + 2]);
      if (dx + dy > 115) edge++;
      used++;
    }
  }
  return { hue: normalizeHist(hue), saturation: normalizeHist(saturation), lightness: normalizeHist(lightness), edgeDensity: used ? edge / used : 0, samples: used };
}

function histogramDistance(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) sum += Math.abs((a[i] || 0) - (b[i] || 0));
  return sum / 2;
}

export function compareDartSignatures(a?: DartVisualSignature | null, b?: DartVisualSignature | null) {
  if (!a || !b || !a.samples || !b.samples) return 0;
  const d = histogramDistance(a.hue, b.hue) * .52 + histogramDistance(a.saturation, b.saturation) * .22 + histogramDistance(a.lightness, b.lightness) * .16 + Math.min(1, Math.abs(a.edgeDensity - b.edgeDensity) * 4) * .10;
  return clamp01(1 - d);
}

export function mergeDartSignatures(items: DartVisualSignature[]) {
  const valid = (items || []).filter(x => x?.samples > 0);
  if (!valid.length) return null;
  const avg = (key: "hue" | "saturation" | "lightness") => {
    const n = Math.max(...valid.map(x => x[key].length));
    return Array.from({ length: n }, (_, i) => valid.reduce((s, x) => s + (x[key][i] || 0), 0) / valid.length);
  };
  return { hue: avg("hue"), saturation: avg("saturation"), lightness: avg("lightness"), edgeDensity: valid.reduce((s, x) => s + x.edgeDensity, 0) / valid.length, samples: valid.reduce((s, x) => s + x.samples, 0) } as DartVisualSignature;
}

export function normalizedBoardPoint(cal: CameraCalibration, xNorm: number, yNorm: number) {
  const dx = xNorm - cal.cx, dy = yNorm - cal.cy;
  if (cal.v === 2) {
    const rx = Math.max(.0001, Number(cal.rx || cal.r));
    const ry = Math.max(.0001, Number(cal.ry || cal.r));
    const phi = Number(cal.phi || 0), c = Math.cos(phi), s = Math.sin(phi);
    const ux = dx * c + dy * s, uy = -dx * s + dy * c;
    const nx = ux / rx, ny = uy / ry;
    return { nx, ny, distanceNorm: Math.sqrt(nx * nx + ny * ny) };
  }
  const r = Math.max(.0001, Number(cal.r || .0001));
  const nx = dx / r, ny = dy / r;
  return { nx, ny, distanceNorm: Math.sqrt(nx * nx + ny * ny) };
}

export function distanceMmFromNorm(distanceNorm: number) {
  // Standard bristle board: centre -> outer double wire = 170 mm.
  return Math.max(0, distanceNorm * 170);
}

export function analyzeFrameDifference(before: ImageData, after: ImageData, cal: CameraCalibration, wanted = 3): VisionDetection[] {
  const width = Math.min(before.width, after.width), height = Math.min(before.height, after.height);
  const a = before.data, b = after.data;
  const cell = 7;
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  const heat = new Float32Array(cols * rows);
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    const xn = x / width, yn = y / height;
    const pt = normalizedBoardPoint(cal, xn, yn);
    if (pt.distanceNorm > 1.08) continue;
    const i = (y * before.width + x) * 4;
    const j = (y * after.width + x) * 4;
    const dr = Math.abs(a[i] - b[j]), dg = Math.abs(a[i + 1] - b[j + 1]), db = Math.abs(a[i + 2] - b[j + 2]);
    const delta = (dr + dg + db) / 3;
    if (delta < 34) continue;
    heat[Math.floor(y / cell) * cols + Math.floor(x / cell)] += delta;
  }

  const hot = new Set<number>();
  for (let i = 0; i < heat.length; i++) if (heat[i] > 240) hot.add(i);
  const comps: number[][] = [];
  while (hot.size) {
    const seed = hot.values().next().value; hot.delete(seed);
    const q = [seed], comp = [];
    while (q.length) {
      const cur = q.pop()!; comp.push(cur);
      const cx = cur % cols, cy = Math.floor(cur / cols);
      for (let yy = Math.max(0, cy - 1); yy <= Math.min(rows - 1, cy + 1); yy++) for (let xx = Math.max(0, cx - 1); xx <= Math.min(cols - 1, cx + 1); xx++) {
        const ni = yy * cols + xx;
        if (hot.has(ni)) { hot.delete(ni); q.push(ni); }
      }
    }
    if (comp.length >= 2) comps.push(comp);
  }

  const candidates = comps.map(comp => {
    let sumW = 0, sx = 0, sy = 0, peak = 0;
    const pts = comp.map(idx => {
      const cx = idx % cols, cy = Math.floor(idx / cols), w = heat[idx];
      const xn = Math.min(1, ((cx + .5) * cell) / width), yn = Math.min(1, ((cy + .5) * cell) / height);
      const bp = normalizedBoardPoint(cal, xn, yn);
      return { xn, yn, w, d: bp.distanceNorm };
    });
    // Impact heuristic: changed point nearest board centre within this newly appeared dart silhouette.
    // This is deliberately paired with confidence and review UI; it avoids pretending uncertain geometry is exact.
    pts.sort((p, q) => p.d - q.d);
    const near = pts.slice(0, Math.max(1, Math.ceil(pts.length * .22)));
    near.forEach(p => { sumW += p.w; sx += p.xn * p.w; sy += p.yn * p.w; peak = Math.max(peak, p.w); });
    const xNorm = sx / (sumW || 1), yNorm = sy / (sumW || 1);
    const bp = normalizedBoardPoint(cal, xNorm, yNorm);
    const area = comp.length * cell * cell;
    const shapeConfidence = clamp01((comp.length - 1) / 9);
    const contrastConfidence = clamp01(peak / 900);
    return { xNorm, yNorm, distanceNorm: bp.distanceNorm, distanceMm: distanceMmFromNorm(bp.distanceNorm), confidence: .45 + .35 * shapeConfidence + .20 * contrastConfidence, area };
  }).filter(x => x.distanceNorm <= 1.06 && x.area >= 80)
    .sort((p, q) => q.area - p.area)
    .slice(0, Math.max(wanted, 5));

  // Suppress near-duplicates from the same silhouette.
  const out: VisionDetection[] = [];
  for (const c of candidates) {
    if (out.some(o => Math.hypot(o.xNorm - c.xNorm, o.yNorm - c.yNorm) < .018)) continue;
    out.push(c);
    if (out.length >= wanted) break;
  }
  return out;
}

export function rankImpacts(impacts: ClosestCenterImpact[], pointsMode: "descending" | "winner" = "descending") {
  const sorted = [...impacts].sort((a, b) => a.distanceMm - b.distanceMm);
  const total = sorted.length;
  return sorted.map((impact, index) => ({ ...impact, rank: index + 1, points: pointsMode === "winner" ? (index === 0 ? 1 : 0) : Math.max(1, total - index) }));
}
