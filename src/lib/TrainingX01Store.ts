// ============================================
// src/lib/TrainingX01Store.ts
// Store localStorage pour Training X01
// ============================================

import type { Dart as UIDart } from "./types";

export type TrainingX01Session = {
  id: string;
  date: number;
  profileId: string;

  darts: number;
  avg3D: number;
  avg1D: number;
  bestVisit: number;
  bestCheckout: number | null;

  hitsS: number;
  hitsD: number;
  hitsT: number;

  miss: number;
  bull: number;
  dBull: number;
  bust: number;

  bySegment: Record<string, number>;

  // 💥 détail fléchette par fléchette
  dartsDetail: UIDart[];
};

const KEY = "dc_training_x01_stats_v1";

function load(): TrainingX01Session[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list: TrainingX01Session[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export const TrainingX01Store = {
  addSession(session: TrainingX01Session) {
    const all = load();
    all.push(session);
    save(all);
  },

  getAll(): TrainingX01Session[] {
    return load();
  },

  clear() {
    localStorage.removeItem(KEY);
  },
};
