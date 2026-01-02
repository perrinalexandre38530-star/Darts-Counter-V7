// ============================================
// src/lib/trainingTypes.ts
// Types pour le mode Training (solo)
// ============================================

import type { Dart as UIDart, Profile } from "./types";

export type TrainingMode =
  | "x01_solo"
  | "around_the_world"
  | "checkout"
  | "custom";

export type TrainingHit = {
  id: string;                 // uuid
  profileId: string | null;   // profil attaché au training (ou null si invité)
  mode: TrainingMode;
  timestamp: number;          // Date.now()

  // Info sur la fléchette
  dart: UIDart;               // tu peux réutiliser ton type existant
  scoreValue: number;         // points réellement marqués
  isHit: boolean;             // true si objectif atteint (ex: toucher T20)
  target?: string;            // ex: "T20", "D16", "BULL"...
  visitIndex: number;         // numéro de la volée dans la session
  dartIndex: number;          // 0,1,2
  sessionId: string;          // id de la session de training
};

export type TrainingSession = {
  id: string;
  profileId: string | null;
  mode: TrainingMode;
  createdAt: number;
  finishedAt: number | null;
  totalDarts: number;
  totalHits: number;
  target?: string;
};
