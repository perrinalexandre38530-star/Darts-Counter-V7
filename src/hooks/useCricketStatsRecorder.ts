// ============================================
// src/hooks/useCricketStatsRecorder.ts
// Enregistreur de stats Cricket par fléchette
// - logDart(...) à appeler à chaque fléchette validée
// - computeLegStatsForPlayer(...) en fin de manche
// ============================================

import React from "react";
import {
  type CricketDartEvent,
  type CricketLegStats,
  type CricketPlayerId,
  type CricketSegmentId,
  type CricketRing,
  computeCricketLegStats,
} from "../lib/cricketStats";

type LogDartArgs = {
  matchId?: string;
  setId?: string;
  legId: string;

  playerId: CricketPlayerId;
  visitIndex: number;
  dartIndex: 0 | 1 | 2;

  segment: CricketSegmentId | "MISS";
  ring: CricketRing;

  marks: number;
  rawScore: number;
  scoredPoints: number;

  beforeMarksOnSegment: number;
  afterMarksOnSegment: number;
  closedSegmentNow: boolean;

  leadingBeforeThrow?: boolean;
  winningThrow?: boolean;
};

type ComputeOptions = {
  mode?: "solo" | "teams";
  teamId?: string;
  teamName?: string;
  won?: boolean;
  opponentTotalPoints?: number;
  opponentLabel?: string;
};

export function useCricketStatsRecorder(initialLegId: string) {
  const eventsRef = React.useRef<CricketDartEvent[]>([]);
  const legIdRef = React.useRef<string>(initialLegId);
  const startedAtRef = React.useRef<number>(Date.now());

  // À appeler quand tu démarres une NOUVELLE manche
  const resetLeg = (newLegId: string) => {
    legIdRef.current = newLegId;
    eventsRef.current = [];
    startedAtRef.current = Date.now();
  };

  // À appeler à CHAQUE fléchette validée
  const logDart = (args: LogDartArgs) => {
    const now = Date.now();

    const evt: CricketDartEvent = {
      legId: args.legId,
      setId: args.setId,
      matchId: args.matchId,
      playerId: args.playerId,
      visitIndex: args.visitIndex,
      dartIndex: args.dartIndex,
      segment: args.segment,
      ring: args.ring,
      marks: args.marks,
      rawScore: args.rawScore,
      scoredPoints: args.scoredPoints,
      beforeMarksOnSegment: args.beforeMarksOnSegment,
      afterMarksOnSegment: args.afterMarksOnSegment,
      closedSegmentNow: args.closedSegmentNow,
      leadingBeforeThrow: args.leadingBeforeThrow,
      winningThrow: args.winningThrow,
      timestamp: now,
    };

    eventsRef.current.push(evt);
  };

  // À utiliser en fin de manche pour UN joueur
  const computeLegStatsForPlayer = (
    playerId: CricketPlayerId,
    options?: ComputeOptions
  ): CricketLegStats => {
    const legId = legIdRef.current;
    const events = eventsRef.current;
    const endedAt =
      events.length > 0 ? events[events.length - 1].timestamp : Date.now();

    return computeCricketLegStats(legId, playerId, events, {
      mode: options?.mode,
      teamId: options?.teamId,
      teamName: options?.teamName,
      won: options?.won,
      opponentTotalPoints: options?.opponentTotalPoints,
      opponentLabel: options?.opponentLabel,
      startedAt: startedAtRef.current,
      endedAt,
    });
  };

  return {
    eventsRef,
    logDart,
    computeLegStatsForPlayer,
    resetLeg,
  };
}
