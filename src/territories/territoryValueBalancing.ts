import type { TerritoriesCountry, TerritoriesMap, Territory } from "./types";
import { getBaseSvgForCountry, getTerritoryIdFromSvgElement } from "./map";

export type TerritoryValueCalibration = {
  referenceAvg3: number;
  minTarget: number;
  maxTarget: number;
  label: "Débutant" | "Loisir" | "Intermédiaire" | "Confirmé" | "Expert" | "Élite";
  playerCount: number;
};

const FALLBACK_AVG3_BY_BOT_LEVEL: Record<string, number> = {
  easy: 28,
  facile: 28,
  beginner: 28,
  normal: 48,
  medium: 48,
  moyen: 48,
  hard: 72,
  difficile: 72,
  expert: 82,
};

const AVG_KEYS = new Set([
  "avg3",
  "avg3d",
  "avg3darts",
  "average3darts",
  "average3d",
  "moy3",
  "moyenne3",
]);

const STAR_KEYS = new Set([
  "profilestarring",
  "profilestars",
  "profilestarrating",
  "stars",
  "levelstars",
  "rating",
]);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function finitePositive(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseStars(value: unknown): number | null {
  if (typeof value === "number") return value > 0 ? clamp(value, 0.5, 5) : null;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const fraction = /([0-9]+(?:[.,][0-9]+)?)\s*\/\s*5/.exec(raw);
  if (fraction) return clamp(Number(fraction[1].replace(",", ".")), 0.5, 5);
  const plain = Number(raw.replace(",", "."));
  return Number.isFinite(plain) && plain > 0 ? clamp(plain, 0.5, 5) : null;
}

function findNestedNumber(root: unknown, wantedKeys: Set<string>, maxDepth = 4): number | null {
  const seen = new Set<unknown>();
  const visit = (value: unknown, depth: number): number | null => {
    if (!value || typeof value !== "object" || depth > maxDepth || seen.has(value)) return null;
    seen.add(value);

    for (const [rawKey, child] of Object.entries(value as Record<string, unknown>)) {
      const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!wantedKeys.has(key)) continue;
      const parsed = finitePositive(child);
      if (parsed != null) return parsed;
    }

    for (const child of Object.values(value as Record<string, unknown>)) {
      const nested = visit(child, depth + 1);
      if (nested != null) return nested;
    }
    return null;
  };

  return visit(root, 0);
}

export function estimateTerritoriesProfileAvg3(profile: any, fallbackBotLevel: string = "normal"): number {
  if (!profile) return FALLBACK_AVG3_BY_BOT_LEVEL[String(fallbackBotLevel).toLowerCase()] ?? 42;

  const avg3 = findNestedNumber(profile, AVG_KEYS);
  if (avg3 != null && avg3 <= 180) return clamp(avg3, 12, 120);

  const rawBotLevel = String(profile?.botLevel ?? profile?.level ?? "").toLowerCase().trim();
  const knownBotLevel = FALLBACK_AVG3_BY_BOT_LEVEL[rawBotLevel];
  if (knownBotLevel) return knownBotLevel;

  const botStars = parseStars(profile?.botLevel);
  if (botStars != null) return clamp(18 + botStars * 16, 26, 102);

  const profileStars = findNestedNumber(profile, STAR_KEYS);
  if (profileStars != null) return clamp(18 + clamp(profileStars, 0.5, 5) * 16, 26, 102);

  if (profile?.isBot || profile?.bot || profile?.kind === "bot" || profile?.type === "bot") {
    return FALLBACK_AVG3_BY_BOT_LEVEL[String(fallbackBotLevel).toLowerCase()] ?? 48;
  }

  return 42;
}

export function buildTerritoryValueCalibration(
  profiles: any[],
  fallbackBotLevel: string = "normal",
): TerritoryValueCalibration {
  const ratings = (profiles || [])
    .map((profile) => estimateTerritoriesProfileAvg3(profile, fallbackBotLevel))
    .filter((value) => Number.isFinite(value) && value > 0);

  const safeRatings = ratings.length ? ratings : [42];
  const arithmeticMean = safeRatings.reduce((sum, value) => sum + value, 0) / safeRatings.length;
  const weakest = Math.min(...safeRatings);

  // Le niveau de référence privilégie légèrement le joueur le moins fort :
  // les plus gros territoires restent difficiles, sans devenir impossibles pour lui.
  const referenceAvg3 = Number((arithmeticMean * 0.65 + weakest * 0.35).toFixed(1));
  const maxTarget = clamp(Math.round(referenceAvg3 * 1.35 + 18), 45, 160);
  const minTarget = clamp(Math.round(maxTarget * 0.12), 5, 24);

  const label: TerritoryValueCalibration["label"] =
    referenceAvg3 <= 32
      ? "Débutant"
      : referenceAvg3 <= 47
        ? "Loisir"
        : referenceAvg3 <= 62
          ? "Intermédiaire"
          : referenceAvg3 <= 78
            ? "Confirmé"
            : referenceAvg3 <= 95
              ? "Expert"
              : "Élite";

  return {
    referenceAvg3,
    minTarget,
    maxTarget,
    label,
    playerCount: safeRatings.length,
  };
}

export function buildTerritoryValueCalibrationFromAverage(referenceAvg3Raw: number): TerritoryValueCalibration {
  const referenceAvg3 = clamp(Number(referenceAvg3Raw) || 42, 12, 120);
  const maxTarget = clamp(Math.round(referenceAvg3 * 1.35 + 18), 45, 160);
  const minTarget = clamp(Math.round(maxTarget * 0.12), 5, 24);
  const label: TerritoryValueCalibration["label"] =
    referenceAvg3 <= 32
      ? "Débutant"
      : referenceAvg3 <= 47
        ? "Loisir"
        : referenceAvg3 <= 62
          ? "Intermédiaire"
          : referenceAvg3 <= 78
            ? "Confirmé"
            : referenceAvg3 <= 95
              ? "Expert"
              : "Élite";
  return { referenceAvg3, minTarget, maxTarget, label, playerCount: 1 };
}

function reachableVisitTotals(): number[] {
  const dartScores = new Set<number>([0, 25, 50]);
  for (let value = 1; value <= 20; value += 1) {
    dartScores.add(value);
    dartScores.add(value * 2);
    dartScores.add(value * 3);
  }
  const darts = [...dartScores];
  const totals = new Set<number>();
  for (const a of darts) {
    totals.add(a);
    for (const b of darts) {
      totals.add(a + b);
      for (const c of darts) totals.add(a + b + c);
    }
  }
  return [...totals].filter((total) => total >= 1 && total <= 180).sort((a, b) => a - b);
}

const REACHABLE_TOTALS = reachableVisitTotals();

function scorePool(calibration: TerritoryValueCalibration): number[] {
  const filtered = REACHABLE_TOTALS.filter(
    (score) => score >= calibration.minTarget && score <= calibration.maxTarget,
  );
  return filtered.length >= 2 ? filtered : [calibration.minTarget, calibration.maxTarget];
}

function territoryIdForPath(country: TerritoriesCountry, path: SVGPathElement): string | null {
  const raw = getTerritoryIdFromSvgElement(country, path);
  if (!raw) return null;
  return raw;
}

function estimateFilledArea(path: SVGPathElement): number {
  let box: DOMRect;
  try {
    box = path.getBBox();
  } catch {
    return 0;
  }
  if (!Number.isFinite(box.width) || !Number.isFinite(box.height) || box.width <= 0 || box.height <= 0) return 0;

  const boxArea = box.width * box.height;
  const geometry = path as SVGGeometryElement & { isPointInFill?: (point: DOMPoint) => boolean };
  if (typeof geometry.isPointInFill !== "function" || typeof DOMPoint === "undefined") return boxArea;

  // Échantillonnage de la surface peinte : contrairement au simple bounding-box,
  // il ne surévalue pas les pays très allongés ou composés de plusieurs îles éloignées.
  const samples = 18;
  let inside = 0;
  for (let row = 0; row < samples; row += 1) {
    for (let column = 0; column < samples; column += 1) {
      const x = box.x + ((column + 0.5) / samples) * box.width;
      const y = box.y + ((row + 0.5) / samples) * box.height;
      try {
        if (geometry.isPointInFill(new DOMPoint(x, y))) inside += 1;
      } catch {
        return boxArea;
      }
    }
  }

  if (inside <= 0) return boxArea * 0.08;
  return boxArea * (inside / (samples * samples));
}

function fallbackAreaByOrder(territories: Territory[]): Record<string, number> {
  const result: Record<string, number> = {};
  [...territories]
    .sort((left, right) => String(left.id).localeCompare(String(right.id), undefined, { numeric: true }))
    .forEach((territory, index) => {
      result[territory.id] = index + 1;
    });
  return result;
}

export function measureTerritoryAreas(
  country: TerritoriesCountry,
  map: TerritoriesMap,
): Record<string, number> {
  if (typeof document === "undefined") return fallbackAreaByOrder(map.territories);

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "-20000px",
    top: "-20000px",
    width: "1200px",
    height: "1200px",
    opacity: "0",
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: "-1",
  });
  host.innerHTML = getBaseSvgForCountry(country);
  document.body.appendChild(host);

  try {
    const svg = host.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return fallbackAreaByOrder(map.territories);
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "1200px";
    svg.style.height = "1200px";
    svg.style.display = "block";

    const validIds = new Set(map.territories.map((territory) => territory.id));
    const areas: Record<string, number> = {};
    for (const path of Array.from(svg.querySelectorAll("path")) as SVGPathElement[]) {
      const territoryId = territoryIdForPath(country, path);
      if (!territoryId || !validIds.has(territoryId)) continue;
      const area = estimateFilledArea(path);
      if (area > 0) areas[territoryId] = (areas[territoryId] || 0) + area;
    }

    return Object.keys(areas).length ? areas : fallbackAreaByOrder(map.territories);
  } finally {
    host.remove();
  }
}

export function applyBalancedTerritoryValues(
  map: TerritoriesMap,
  country: TerritoriesCountry,
  calibration: TerritoryValueCalibration,
): TerritoriesMap {
  const areas = measureTerritoryAreas(country, map);
  const pool = scorePool(calibration);
  const ordered = [...map.territories].sort((left, right) => {
    const areaDiff = (areas[left.id] || 0) - (areas[right.id] || 0);
    if (Math.abs(areaDiff) > 0.000001) return areaDiff;
    return String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
  });

  const scoreById = new Map<string, number>();
  const count = ordered.length;
  ordered.forEach((territory, index) => {
    const progress = count <= 1 ? 0.5 : index / (count - 1);
    // Légère courbe : davantage de cibles restent dans la zone accessible,
    // tandis que les plus grands territoires occupent le haut de la plage.
    const curvedProgress = Math.pow(progress, 1.12);
    const poolIndex = Math.round(curvedProgress * (pool.length - 1));
    scoreById.set(territory.id, pool[poolIndex] ?? calibration.minTarget);
  });

  return {
    ...map,
    territories: map.territories.map((territory) => ({
      ...territory,
      value: scoreById.get(territory.id) ?? territory.value,
    })),
  };
}
