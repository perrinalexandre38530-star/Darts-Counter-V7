import React from "react";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { syncTrainingEvents } from "../training/sync/trainingSyncEngine";
import type { Profile } from "../lib/types";
import { getLastConfig, setLastConfig } from "../training/lib/trainingPersist";
import {
  getTrainingDetailedSessions,
  recordTrainingGroupSession,
  type TrainingDetailedSession,
  type TrainingGroupSession,
} from "../training/stats/trainingStatsHub";
import TrainingComparisonSummary from "../training/ui/TrainingComparisonSummary";

import TimeAttackConfig from "../training/modes/timeattack/TimeAttackConfig";
import DoubleIOConfig from "../training/modes/double/DoubleIOConfig";
import PrecisionConfig from "../training/modes/precision/PrecisionConfig";
import SuperBullConfig from "../training/modes/superbull/SuperBullConfig";
import GhostConfig from "../training/modes/ghost/GhostConfig";
import RepeatMasterConfig from "../training/modes/repeat/RepeatMasterConfig";
import ChallengesConfig from "../training/modes/challenges/ChallengesConfig";
import EvolutionConfig from "../training/modes/evolution/EvolutionConfig";

import TimeAttackPlay from "../training/modes/timeattack/TimeAttackPlay";
import DoubleInOutPlay from "../training/modes/double/DoubleInOutPlay";
import PrecisionGauntletPlay from "../training/modes/precision/PrecisionGauntletPlay";
import SuperBullPlay from "../training/modes/superbull/SuperBullPlay";
import GhostModePlay from "../training/modes/ghost/GhostModePlay";
import RepeatMasterPlay from "../training/modes/repeat/RepeatMasterPlay";
import ChallengesPlay from "../training/modes/challenges/ChallengesPlay";
import EvolutionPlay from "../training/modes/evolution/EvolutionPlay";

type Props = {
  modeId: string;
  onExit: () => void;
  profiles?: Profile[];
};

type TrainingQueuedParticipant = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  teamLogo?: string | null;
};

function canonicalTrainingId(rawId: string) {
  const id = String(rawId || "").trim().toLowerCase();
  if (id === "super_bull_training") return "training_super_bull";
  return id;
}

function makeGroupSessionId(modeId: string) {
  return `training-group-${modeId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function performanceOf(session: TrainingDetailedSession) {
  const metrics: any = session?.metrics || {};
  const explicit = Number(metrics.score ?? metrics.performanceScore);
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  const avg3 = Number(metrics.avg3);
  if (Number.isFinite(avg3)) return Math.max(0, avg3);
  return Math.max(0, Number(session?.points || 0));
}

function normalizeQueue(config: any, profiles?: Profile[]): TrainingQueuedParticipant[] {
  const source = Array.isArray(config?.trainingParticipants) ? config.trainingParticipants : [];
  const byProfileId = new Map<string, any>();
  for (const profile of profiles || []) byProfileId.set(String((profile as any)?.id || ""), profile);

  const raw = source.length
    ? source
    : (Array.isArray(config?.selectedPlayerIds) ? config.selectedPlayerIds : []).map((id: any) => {
        const profile: any = byProfileId.get(String(id));
        return profile || { id: String(id), name: "Joueur" };
      });

  const seen = new Set<string>();
  const out: TrainingQueuedParticipant[] = [];
  for (const item of raw) {
    const id = String(item?.id || item?.profileId || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const profile: any = byProfileId.get(id) || item;
    out.push({
      id,
      name: String(item?.name || profile?.name || profile?.displayName || "Joueur"),
      avatarDataUrl: item?.avatarDataUrl || profile?.avatarDataUrl || null,
      avatarUrl: item?.avatarUrl || profile?.avatarUrl || profile?.avatar || null,
      teamId: item?.teamId ? String(item.teamId) : null,
      teamName: item?.teamName ? String(item.teamName) : null,
      teamLogo: item?.teamLogo || null,
    });
  }
  return out;
}

export default function TrainingModePage({ modeId, onExit, profiles }: Props) {
  const { user, online } = useAuthOnline();
  const id = canonicalTrainingId(modeId);
  const [phase, setPhase] = React.useState<"config" | "play" | "summary">("config");
  const [config, setConfig] = React.useState<any>(() => getLastConfig(id));
  const [participantIndex, setParticipantIndex] = React.useState(0);
  const [summary, setSummary] = React.useState<TrainingGroupSession | null>(null);
  const groupStartedAtRef = React.useRef(Date.now());

  React.useEffect(() => {
    setPhase("config");
    setConfig(getLastConfig(id));
    setParticipantIndex(0);
    setSummary(null);
  }, [id]);

  const exitAndSync = React.useCallback(() => {
    try {
      if (user?.id) {
        try { localStorage.setItem("dc_user_id", user.id); } catch {}
      }
      if (user?.id && online) syncTrainingEvents(user.id).catch(() => {});
    } catch {
      // Le Training reste entièrement jouable hors-ligne.
    } finally {
      onExit();
    }
  }, [onExit, online, user?.id]);

  const beginRun = React.useCallback((baseConfig: any) => {
    const queue = normalizeQueue(baseConfig, profiles);
    if (!queue.length) return;
    const groupSessionId = makeGroupSessionId(id);
    const next = {
      ...(baseConfig || {}),
      modeId: id,
      training: true,
      startedFrom: "training_hub",
      groupSessionId,
      trainingParticipants: queue,
      selectedPlayerIds: queue.map((participant) => participant.id),
    };
    groupStartedAtRef.current = Date.now();
    setConfig(next);
    setLastConfig(id, next);
    setParticipantIndex(0);
    setSummary(null);
    setPhase("play");
  }, [id, profiles]);

  const start = React.useCallback((nextConfig: any) => beginRun(nextConfig), [beginRun]);

  const queue = React.useMemo(() => normalizeQueue(config, profiles), [config, profiles]);
  const activeParticipant = queue[participantIndex] || null;

  const finishOrAdvance = React.useCallback(() => {
    const groupSessionId = String(config?.groupSessionId || "");
    if (!groupSessionId || !activeParticipant) {
      exitAndSync();
      return;
    }

    const completed = getTrainingDetailedSessions({
      modeId: id,
      groupSessionId,
      participantId: activeParticipant.id,
      limit: 5,
    });

    // BackDot pendant une session non terminée : on quitte réellement le Training.
    if (!completed.length) {
      exitAndSync();
      return;
    }

    if (participantIndex + 1 < queue.length) {
      setParticipantIndex((index) => index + 1);
      return;
    }

    const rows = getTrainingDetailedSessions({ modeId: id, groupSessionId, limit: 100 });
    const latestByParticipant = new Map<string, TrainingDetailedSession>();
    for (const row of rows) {
      const pid = String(row?.participantId || "");
      if (pid && !latestByParticipant.has(pid)) latestByParticipant.set(pid, row);
    }

    const ranked = queue
      .map((participant) => {
        const row = latestByParticipant.get(participant.id);
        if (!row) return null;
        return {
          sessionId: row.id,
          participantId: participant.id,
          participantName: row.participantName || participant.name,
          teamId: row.teamId || participant.teamId || null,
          teamName: row.teamName || participant.teamName || null,
          teamLogo: row.teamLogo || participant.teamLogo || null,
          darts: row.darts,
          hits: row.hits,
          points: row.points,
          accuracyPct: row.accuracyPct,
          success: row.success,
          performance: performanceOf(row),
          metrics: row.metrics || {},
        };
      })
      .filter(Boolean) as any[];

    ranked.sort((a, b) => {
      if (a.success !== b.success) return a.success ? -1 : 1;
      if (b.performance !== a.performance) return b.performance - a.performance;
      if (a.darts !== b.darts) return a.darts - b.darts;
      return b.accuracyPct - a.accuracyPct;
    });
    ranked.forEach((row, index) => { row.rank = index + 1; });

    const group = recordTrainingGroupSession({
      id: groupSessionId,
      modeId: id,
      participantMode: config?.participantMode === "teams" ? "teams" : "players",
      startedAt: groupStartedAtRef.current,
      endedAt: Date.now(),
      config: { ...(config || {}), activeParticipant: undefined },
      participants: ranked,
    });

    setSummary(group);
    setPhase("summary");
  }, [activeParticipant, config, exitAndSync, id, participantIndex, queue]);

  const activePlayConfig = React.useMemo(() => {
    if (!activeParticipant) return config;
    return {
      ...(config || {}),
      selectedPlayerIds: [activeParticipant.id],
      selectedBotIds: [],
      activeParticipant,
      activeParticipantIndex: participantIndex,
      activeParticipantTotal: queue.length,
    };
  }, [activeParticipant, config, participantIndex, queue.length]);

  const configProps = { profiles, onStart: start, onExit: exitAndSync };
  const playProps = { config: activePlayConfig, onExit: finishOrAdvance };

  if (phase === "summary" && summary) {
    return <TrainingComparisonSummary group={summary} tickerId={id} onExit={exitAndSync} onReplay={() => beginRun(config)} />;
  }

  if (phase === "config") {
    switch (id) {
      case "training_precision_gauntlet": return <PrecisionConfig {...configProps} />;
      case "training_time_attack": return <TimeAttackConfig {...configProps} />;
      case "training_repeat_master": return <RepeatMasterConfig {...configProps} />;
      case "training_ghost": return <GhostConfig {...configProps} />;
      case "training_doubleio": return <DoubleIOConfig {...configProps} />;
      case "training_challenges": return <ChallengesConfig {...configProps} />;
      case "training_super_bull": return <SuperBullConfig {...configProps} />;
      case "training_evolution": return <EvolutionConfig {...configProps} />;
      default:
        return <div style={{ padding: 18 }}><button type="button" onClick={exitAndSync}>← Retour</button><p>Mode Training inconnu : {id}</p></div>;
    }
  }

  if (!activeParticipant && id !== "training_evolution") {
    return <div style={{ padding: 18 }}><button type="button" onClick={exitAndSync}>← Retour</button><p>Aucun participant Training valide.</p></div>;
  }

  switch (id) {
    case "training_precision_gauntlet": return <PrecisionGauntletPlay key={`${config?.groupSessionId}-${participantIndex}`} {...playProps} />;
    case "training_time_attack": return <TimeAttackPlay key={`${config?.groupSessionId}-${participantIndex}`} {...playProps} />;
    case "training_repeat_master": return <RepeatMasterPlay key={`${config?.groupSessionId}-${participantIndex}`} {...playProps} />;
    case "training_ghost": return <GhostModePlay key={`${config?.groupSessionId}-${participantIndex}`} {...playProps} />;
    case "training_doubleio": return <DoubleInOutPlay key={`${config?.groupSessionId}-${participantIndex}`} {...playProps} />;
    case "training_challenges": return <ChallengesPlay key={`${config?.groupSessionId}-${participantIndex}`} {...playProps} />;
    case "training_super_bull": return <SuperBullPlay key={`${config?.groupSessionId}-${participantIndex}`} {...playProps} />;
    case "training_evolution": return <EvolutionPlay {...playProps} />;
    default:
      return <div style={{ padding: 18 }}><button type="button" onClick={exitAndSync}>← Retour</button><p>Mode Training inconnu : {id}</p></div>;
  }
}
