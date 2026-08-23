import type { ActivityRecord } from "./activityTypes";

export type RunningShoe = {
  id: string;
  name: string;
  brand?: string;
  startedAt: number;
  retireAtKm: number;
  retired: boolean;
  createdAt: number;
};

const STORAGE_KEY = "mss-running-shoes-v1";

export function loadRunningShoes(): RunningShoe[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item.id === "string" && typeof item.name === "string").map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand || undefined,
      startedAt: Number(item.startedAt || item.createdAt || Date.now()),
      retireAtKm: Math.max(100, Number(item.retireAtKm || 650)),
      retired: !!item.retired,
      createdAt: Number(item.createdAt || Date.now()),
    }));
  } catch {
    return [];
  }
}

export function saveRunningShoes(shoes: RunningShoe[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(shoes.slice(0, 24))); } catch {}
}

export function createRunningShoe(name: string, brand?: string): RunningShoe {
  const now = Date.now();
  return {
    id: `shoe_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Chaussures Running",
    brand: brand?.trim() || undefined,
    startedAt: now,
    retireAtKm: 650,
    retired: false,
    createdAt: now,
  };
}

export function shoeDistanceM(shoeId: string, activities: ActivityRecord[]): number {
  return activities.reduce((sum, activity) => sum + (activity.shoeId === shoeId ? Number(activity.distanceM || 0) : 0), 0);
}

export function shoeWearPct(shoe: RunningShoe, activities: ActivityRecord[]): number {
  const targetM = Math.max(1, shoe.retireAtKm * 1000);
  return Math.max(0, Math.min(100, (shoeDistanceM(shoe.id, activities) / targetM) * 100));
}
