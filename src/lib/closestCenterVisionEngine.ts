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
  identityMargin?: number;
  uncertaintyMm?: number;
  needsReview?: boolean;
  round: number;
};

export type VisionDetection = {
  xNorm: number;
  yNorm: number;
  distanceNorm: number;
  distanceMm: number;
  confidence: number;
  area: number;
  geometryConfidence?: number;
};

export type DartIdentityResult = {
  playerId: string | null;
  confidence: number;
  margin: number;
  scores: Array<{ playerId: string; score: number }>;
};

export type FrameStability = {
  stable: boolean;
  changedFraction: number;
  meanDelta: number;
  confidence: number;
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
  const d = histogramDistance(a.hue, b.hue) * .52
    + histogramDistance(a.saturation, b.saturation) * .22
    + histogramDistance(a.lightness, b.lightness) * .16
    + Math.min(1, Math.abs(a.edgeDensity - b.edgeDensity) * 4) * .10;
  return clamp01(1 - d);
}

export function mergeDartSignatures(items: DartVisualSignature[]) {
  const valid = (items || []).filter(x => x?.samples > 0);
  if (!valid.length) return null;
  const avg = (key: "hue" | "saturation" | "lightness") => {
    const n = Math.max(...valid.map(x => x[key].length));
    return Array.from({ length: n }, (_, i) => valid.reduce((s, x) => s + (x[key][i] || 0), 0) / valid.length);
  };
  return {
    hue: avg("hue"), saturation: avg("saturation"), lightness: avg("lightness"),
    edgeDensity: valid.reduce((s, x) => s + x.edgeDensity, 0) / valid.length,
    samples: valid.reduce((s, x) => s + x.samples, 0),
  } as DartVisualSignature;
}

export function classifyDartIdentity(
  signatures: Record<string, DartVisualSignature | null | undefined>,
  observed?: DartVisualSignature | null,
  expectedPlayerId?: string | null,
): DartIdentityResult {
  const ranked = Object.entries(signatures).map(([playerId, signature]) => {
    let score = compareDartSignatures(signature, observed);
    // The temporal turn is only a light prior. Visual identity remains able to override it.
    if (expectedPlayerId && String(playerId) === String(expectedPlayerId)) score = clamp01(score + .055);
    return { playerId, score };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];
  const margin = best ? Math.max(0, best.score - (second?.score || 0)) : 0;
  const confidence = best ? clamp01(best.score * .82 + Math.min(.18, margin * 1.8)) : 0;
  return { playerId: best?.playerId || null, confidence, margin, scores: ranked };
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

export function estimateDistanceUncertaintyMm(confidence: number, calibration?: CameraCalibration | null) {
  const calibrationPenalty = calibration?.v === 2 ? 0 : .8;
  return Math.max(.7, .7 + (1 - clamp01(confidence)) * 4.2 + calibrationPenalty);
}

export function analyzeFrameStability(before: ImageData, after: ImageData, cal: CameraCalibration): FrameStability {
  const width = Math.min(before.width, after.width), height = Math.min(before.height, after.height);
  let changed = 0, total = 0, deltaSum = 0;
  for (let y = 2; y < height - 2; y += 6) for (let x = 2; x < width - 2; x += 6) {
    const xn = x / width, yn = y / height;
    if (normalizedBoardPoint(cal, xn, yn).distanceNorm > 1.03) continue;
    const i = (y * before.width + x) * 4;
    const j = (y * after.width + x) * 4;
    const delta = (Math.abs(before.data[i] - after.data[j]) + Math.abs(before.data[i + 1] - after.data[j + 1]) + Math.abs(before.data[i + 2] - after.data[j + 2])) / 3;
    deltaSum += delta; total++;
    if (delta > 28) changed++;
  }
  const changedFraction = total ? changed / total : 1;
  const meanDelta = total ? deltaSum / total : 255;
  // Three darts legitimately change a small part of the board. A moved camera changes a large fraction of edges/textures.
  const stable = changedFraction < .23 && meanDelta < 34;
  const confidence = clamp01(1 - (changedFraction / .28) * .62 - (meanDelta / 45) * .38);
  return { stable, changedFraction, meanDelta, confidence };
}

function estimateTipFromComponent(comp: number[], heat: Float32Array, cols: number, cell: number, width: number, height: number, cal: CameraCalibration) {
  const pts = comp.map(idx => {
    const cx = idx % cols, cy = Math.floor(idx / cols), w = heat[idx];
    return {
      xn: Math.min(1, ((cx + .5) * cell) / width),
      yn: Math.min(1, ((cy + .5) * cell) / height),
      w,
      d: 0,
    };
  });
  pts.forEach(p => { p.d = normalizedBoardPoint(cal, p.xn, p.yn).distanceNorm; });
  let sw = 0, mx = 0, my = 0;
  pts.forEach(p => { sw += p.w; mx += p.xn * p.w; my += p.yn * p.w; });
  mx /= sw || 1; my /= sw || 1;
  let cxx = 0, cyy = 0, cxy = 0;
  pts.forEach(p => { const dx = p.xn - mx, dy = p.yn - my; cxx += p.w * dx * dx; cyy += p.w * dy * dy; cxy += p.w * dx * dy; });
  const theta = .5 * Math.atan2(2 * cxy, cxx - cyy);
  const ax = Math.cos(theta), ay = Math.sin(theta), px = -ay, py = ax;
  const projected = pts.map(p => ({ ...p, t: (p.xn - mx) * ax + (p.yn - my) * ay, q: (p.xn - mx) * px + (p.yn - my) * py }));
  projected.sort((a, b) => a.t - b.t);
  const nEnd = Math.max(1, Math.ceil(projected.length * .22));
  const ends = [projected.slice(0, nEnd), projected.slice(-nEnd)];
  const endInfo = ends.map(group => {
    let wsum = 0, x = 0, y = 0, qMean = 0;
    group.forEach(p => { wsum += p.w; x += p.xn * p.w; y += p.yn * p.w; qMean += p.q * p.w; });
    x /= wsum || 1; y /= wsum || 1; qMean /= wsum || 1;
    let spread = 0; group.forEach(p => spread += p.w * Math.abs(p.q - qMean)); spread /= wsum || 1;
    return { x, y, spread, distance: normalizedBoardPoint(cal, x, y).distanceNorm };
  });
  const spreadRatio = Math.abs(endInfo[0].spread - endInfo[1].spread) / Math.max(.00001, endInfo[0].spread + endInfo[1].spread);
  let chosen = endInfo[0].spread <= endInfo[1].spread ? endInfo[0] : endInfo[1];
  // If the silhouette does not reveal a clearly narrower tip, use the centre-nearest endpoint as a conservative fallback.
  if (spreadRatio < .14) chosen = endInfo[0].distance <= endInfo[1].distance ? endInfo[0] : endInfo[1];
  return { xNorm: chosen.x, yNorm: chosen.y, geometryConfidence: clamp01(.48 + spreadRatio * .9) };
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
    let peak = 0;
    comp.forEach(idx => { peak = Math.max(peak, heat[idx]); });
    const tip = estimateTipFromComponent(comp, heat, cols, cell, width, height, cal);
    const bp = normalizedBoardPoint(cal, tip.xNorm, tip.yNorm);
    const area = comp.length * cell * cell;
    const shapeConfidence = clamp01((comp.length - 1) / 10);
    const contrastConfidence = clamp01(peak / 900);
    const confidence = clamp01(.34 + .25 * shapeConfidence + .18 * contrastConfidence + .23 * tip.geometryConfidence);
    return {
      xNorm: tip.xNorm, yNorm: tip.yNorm,
      distanceNorm: bp.distanceNorm, distanceMm: distanceMmFromNorm(bp.distanceNorm),
      confidence, area, geometryConfidence: tip.geometryConfidence,
    };
  }).filter(x => x.distanceNorm <= 1.06 && x.area >= 80)
    .sort((p, q) => q.area - p.area)
    .slice(0, Math.max(wanted, 6));

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
  return sorted.map((impact, index) => {
    const previous = sorted[index - 1];
    const uncertaintyMm = impact.uncertaintyMm ?? estimateDistanceUncertaintyMm(impact.confidence);
    const prevUncertainty = previous ? (previous.uncertaintyMm ?? estimateDistanceUncertaintyMm(previous.confidence)) : 0;
    const gapToPreviousMm = previous ? impact.distanceMm - previous.distanceMm : null;
    const ambiguousWithPrevious = !!previous && Number(gapToPreviousMm) <= Math.max(1, (uncertaintyMm + prevUncertainty) * .55);
    return {
      ...impact,
      rank: index + 1,
      points: pointsMode === "winner" ? (index === 0 ? 1 : 0) : Math.max(0, 5 - index),
      uncertaintyMm,
      gapToPreviousMm,
      ambiguousWithPrevious,
    };
  });
}
